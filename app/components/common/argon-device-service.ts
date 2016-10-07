import * as application from "application";
import * as utils from 'utils/utils';
import * as geolocation from 'speigg-nativescript-geolocation';
import * as dialogs from 'ui/dialogs';
import * as frames from 'ui/frame';
import * as platform from 'platform';

import {AbsoluteLayout} from 'ui/layouts/absolute-layout';

import * as Argon from "@argonjs/argon";

import * as vuforia from 'nativescript-vuforia';

import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service'

const JulianDate = Argon.Cesium.JulianDate;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;
const Transforms = Argon.Cesium.Transforms;
const Matrix4    = Argon.Cesium.Matrix4;
const Matrix3    = Argon.Cesium.Matrix3;

const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);

const ONE = new Cartesian3(1,1,1);

const scratchTime = new JulianDate(0,0);
const scratchCartesian3 = new Cartesian3;
const scratchQuaternion = new Quaternion;
const scratchECEFQuaternion = new Quaternion;
const scratchMatrix4 = new Matrix4;
const scratchMatrix3 = new Matrix3;
const scratchFrustum = new Argon.Cesium.PerspectiveFrustum();

export const vuforiaCameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.OpimizeQuality;
if (vuforia.videoView.ios) {
    (<UIView>vuforia.videoView.ios).contentScaleFactor = 
        vuforiaCameraDeviceMode === <vuforia.CameraDeviceMode> vuforia.CameraDeviceMode.OptimizeSpeed ? 
        1 : platform.screen.mainScreen.scale;
}

@Argon.DI.inject(Argon.SessionService, Argon.RealityService)
export class NativescriptDeviceService extends Argon.DeviceService {
    
    private locationWatchId?:number;
    private locationManager?:CLLocationManager;
    private motionManager?:CMMotionManager;
    private calibStartTime: Argon.Cesium.JulianDate;
    private calibrating: boolean;

    constructor(sessionService:Argon.SessionService, realityService:Argon.RealityService) {
        super(sessionService, realityService);

        this.calibStartTime = JulianDate.now();
        this.calibrating = false;

        const geolocationPositionProperty = new Argon.Cesium.SampledPositionProperty(Argon.Cesium.ReferenceFrame.FIXED);
        this.geolocationEntity.position = geolocationPositionProperty;
        geolocationPositionProperty.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        geolocationPositionProperty.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        geolocationPositionProperty.maxNumSamples = 10;
        this.geolocationEntity.orientation = new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY);
        
        this.orientationEntity.position = undefined;
        const orientationProperty = new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion);
        this.orientationEntity.orientation = orientationProperty;
        orientationProperty.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        orientationProperty.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        orientationProperty.maxNumSamples = 10;

        application.on(application.orientationChangedEvent, ()=>{
            this.updateDeviceState();
        });

        realityService.viewStateEvent.addEventListener((viewState)=>{
            if (vuforia.api) {
                // convert the desired fov to the appropriate scale factor
                const desiredFov = viewState.subviews[0].frustum.fov;
                const defaultFov = Argon.ArgonSystem.instance!.device.state.defaultFov;
                const desiredHalfLength = Math.tan(0.5*desiredFov);
                const defaultHalfLength = Math.tan(0.5*defaultFov);
                const scaleFactor =  defaultHalfLength / desiredHalfLength;
                // make sure the video is scaled as appropriate
                vuforia.api.setScaleFactor(scaleFactor);
                // update the videoView
                this.configureVuforiaVideoBackground(viewState.viewport);
            }
        });
    }

    updateDeviceState() {
        this.state.viewport = this.getMaximumViewport();

        if (vuforia.api && vuforia.api.getDevice().isViewerActive()) {
            const device = vuforia.api.getDevice();
            const renderingPrimitives = device.getRenderingPrimitives();
            const renderingViews = renderingPrimitives.getRenderingViews();
            const numViews = renderingViews.getNumViews()

            const subviews = this.state.subviews;

            const contentScaleFactor = (<UIView>vuforia.videoView.ios).contentScaleFactor;

            for (let i = 0; i < numViews; i++) {
                const view = renderingViews.getView(i);
                if (view === vuforia.View.PostProcess) continue;

                let type: Argon.SubviewType;
                switch (view) {
                    case vuforia.View.LeftEye:
                        type = Argon.SubviewType.LEFTEYE; break;
                    case vuforia.View.RightEye:
                        type = Argon.SubviewType.RIGHTEYE; break;
                    case vuforia.View.Singular:
                        type = Argon.SubviewType.SINGULAR; break;
                    default:
                        type = Argon.SubviewType.OTHER; break;
                }

                // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
                // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
                let projectionMatrix = <any>renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);
                renderingPrimitives.getEyeDisplayAdjustmentMatrix

                // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);

                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation vuforia's video (at least on iOS) is the landscape right orientation,
                // this is the orientation where the device is held in landscape with the home button on the right. 
                // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
                // So, we want to undo this rotation which vuforia applies for us.  
                // TODO: calculate this matrix only when we have to (when the interface orientation changes)
                const inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(
                    Cartesian3.ZERO,
                    Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + getDisplayOrientation() * Math.PI / 180), scratchQuaternion),
                    ONE,
                    scratchMatrix4
                );
                Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);

                // convert from the vuforia projection matrix (+X -Y +X) to a more standard convention (+X +Y -Z)
                // by negating the appropriate rows. 
                // See https://developer.vuforia.com/library/articles/Solution/How-To-Use-the-Camera-Projection-Matrix

                // flip y axis so it is positive
                projectionMatrix[4] *= -1; // x
                projectionMatrix[5] *= -1; // y
                projectionMatrix[6] *= -1; // z
                projectionMatrix[7] *= -1; // w
                // flip z axis so it is negative
                projectionMatrix[8] *= -1;  // x
                projectionMatrix[9] *= -1;  // y
                projectionMatrix[10] *= -1; // z
                projectionMatrix[11] *= -1; // w

                var scaleFactor = vuforia.api.getScaleFactor();

                // scale x-axis
                projectionMatrix[0] *= scaleFactor; // x
                projectionMatrix[1] *= scaleFactor; // y
                projectionMatrix[2] *= scaleFactor; // z
                projectionMatrix[3] *= scaleFactor; // w
                // scale y-axis
                projectionMatrix[4] *= scaleFactor; // x
                projectionMatrix[5] *= scaleFactor; // y
                projectionMatrix[6] *= scaleFactor; // z
                projectionMatrix[7] *= scaleFactor; // w

                const vuforiaViewport = renderingPrimitives.getViewport(view);
                const frustum = Argon.decomposePerspectiveProjectionMatrix(projectionMatrix, scratchFrustum);

                const subview = subviews[i] || <Argon.SerializedSubview>{};
                subview.type = type;

                subview.viewport = subview.viewport || <Argon.Viewport>{};
                subview.viewport.x = vuforiaViewport.x / contentScaleFactor;
                subview.viewport.y = vuforiaViewport.y / contentScaleFactor;
                subview.viewport.width = vuforiaViewport.z / contentScaleFactor;
                subview.viewport.height = vuforiaViewport.w / contentScaleFactor;

                subview.frustum = subview.frustum || {};
                subview.frustum.fov = frustum.fov;
                subview.frustum.aspectRatio = frustum.aspectRatio;
                subview.frustum.xOffset = frustum.xOffset;
                subview.frustum.yOffset = frustum.yOffset;

                // todo: deprecate projectionMatrix here
                subview.projectionMatrix = Matrix4.toArray(projectionMatrix, []);

                subviews[i] = subview;
            }

            this.state.strictSubviewViewports = true;
            this.state.strictViewport = true;

        } else {
            this.state.subviews.length = 1;
            const subview = this.state.subviews[0];
            subview.type = Argon.SubviewType.SINGULAR;
            subview.viewport = undefined;
            subview.pose = undefined;
            this.state.strictSubviewViewports = false;
            this.state.strictViewport = false;
        }

        if (application.ios && this.motionManager) {
            
            const time = JulianDate.now();
            const motion = this.motionManager.deviceMotion;

            if (motion) {                

                // We want to have the user calibrate the magnetic field
                // if there are problems.  But iOS10 seems to have a problem 
                // where doing the calibration messes up CMMotion.  So, we've 
                // commented this out for now, but should turn it back on eventually
                
                switch (motion.magneticField.accuracy) {
                    case CMMagneticFieldCalibrationAccuracy.Uncalibrated:
	                case CMMagneticFieldCalibrationAccuracy.Low:
                        if (!this.calibrating) {
                            // let's only start calibration if it's been a while since we stopped
                            if (JulianDate.secondsDifference(time, this.calibStartTime) > 5) {
                                // console.log("starting calib after " +  JulianDate.secondsDifference(time, this.calibStartTime) + " seconds");
                                // this.calibStartTime = time;
                                // this.calibrating = true;
                                // this.motionManager.showsDeviceMovementDisplay = true;
                            }
                        }
                        break;

            	    case CMMagneticFieldCalibrationAccuracy.Medium:
                    case CMMagneticFieldCalibrationAccuracy.High:
                        if (this.calibrating) {
                            // let's only stop calibration if it's been a little bit since we stopped
                            if (JulianDate.secondsDifference(time, this.calibStartTime) > 2) {
                                // console.log("stopping calib after " +  JulianDate.secondsDifference(time, this.calibStartTime) + " seconds");
                                // this.calibStartTime = time;
                                // this.calibrating = false;
                                // this.motionManager.showsDeviceMovementDisplay = false;
                            }
                        }
                        break;
                }

                if (this.motionManager.showsDeviceMovementDisplay) {
                    return;
                }
                const motionQuaternion = <Argon.Cesium.Quaternion>motion.attitude.quaternion;

                // Apple's orientation is reported in NWU, so we convert to ENU by applying a global rotation of
                // 90 degrees about +z to the NWU orientation (or applying the NWU quaternion as a local rotation 
                // to the starting orientation of 90 degress about +z). 
                // Note: With quaternion multiplication the `*` symbol can be read as 'rotates'. 
                // If the orientation (O) is on the right and the rotation (R) is on the left, 
                // such that the multiplication order is R*O, then R is a global rotation being applied on O. 
                // Likewise, the reverse, O*R, is a local rotation R applied to the orientation O. 
                const orientation = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);
                const sampledOrientation = this.orientationEntity.orientation as Argon.Cesium.SampledProperty;
                sampledOrientation.addSample(time, orientation);
                if (!Argon.Cesium.defined(this.orientationEntity.position)) {
                    this.orientationEntity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.geolocationEntity);
                }
            }
        }

        const displayOrientation = getDisplayOrientation();
        const displayOrientationRad = Argon.Cesium.CesiumMath.toRadians(displayOrientation);
        const displayOrientationProperty = this.displayEntity.orientation as Argon.Cesium.ConstantProperty;
        displayOrientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, displayOrientationRad, scratchQuaternion));

        super.updateDeviceState();
    }
    
    startLocationUpdates() {
        super.startLocationUpdates();
        if (typeof this.locationWatchId !== 'undefined') return;
        
        // Note: the d.ts for nativescript-geolocation is wrong. This call is correct. 
        // Casting the module as <any> here for now to hide annoying typescript errors...
        this.locationWatchId = (<any>geolocation).watchLocation((location:geolocation.Location)=>{
            // Note: iOS documentation states that the altitude value refers to height (meters) above sea level, but 
            // if ios is reporting the standard gps defined altitude, then this theoretical "sea level" actually refers to 
            // the WGS84 ellipsoid rather than traditional mean sea level (MSL) which is not a simple surface and varies 
            // according to the local gravitational field. 
            // In other words, my best guess is that the altitude value here is *probably* GPS defined altitude, which 
            // is equivalent to the height above the WGS84 ellipsoid, which is exactly what Cesium expects...
            const locationTime = Argon.Cesium.JulianDate.fromDate(location.timestamp, scratchTime);
            const sampledPosition = this.geolocationEntity.position as Argon.Cesium.SampledPositionProperty;
            const position =  Argon.Cesium.Cartesian3.fromDegrees(
                    location.longitude,
                    location.latitude,
                    location.altitude,
                    Argon.Cesium.Ellipsoid.WGS84,
                    scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
            
            const enuOrientation = Transforms.headingPitchRollQuaternion(position, 0, 0, 0, undefined, scratchECEFQuaternion);
            (this.geolocationEntity.orientation as Argon.Cesium.ConstantProperty).setValue(enuOrientation);
            this.updateDeviceState();
        }, 
        (e)=>{
            console.log(e);
        }, <geolocation.Options>{
            desiredAccuracy: application.ios ? kCLLocationAccuracyBest : 0,
            updateDistance: application.ios ? kCLDistanceFilterNone : 0
        });
        
        console.log("Creating location watcher. " + this.locationWatchId);
        
        if (application.ios) {

            switch (CLLocationManager.authorizationStatus()) {
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse:
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways: 
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined:
                    this.locationManager = CLLocationManager.alloc().init();
                    this.locationManager.requestWhenInUseAuthorization();
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusDenied:
                case CLAuthorizationStatus.kCLAuthorizationStatusRestricted:
                default:
                    dialogs.action({
                        title: "Location Services",
                        message: `In order to provide the best Augmented Reality experience, 
                            please open this app's settings and enable location services`,
                        cancelButtonText: "Cancel",
                        actions: ['Settings']
                    }).then((action)=>{
                        if (action === 'Settings') {
                            const url = NSURL.URLWithString(UIApplicationOpenSettingsURLString);
                            utils.ios.getter(UIApplication, UIApplication.sharedApplication).openURL(url);
                        }
                    })
            }
            // During testing of orientation problems, we tried 
            // turning on the heading feature of the location manager
            // to see if that helped.  It didn't, but here's the code:
            //
            // if (CLLocationManager.headingAvailable()) {
            //     console.log("Phew, heading available. " );
            //     this.locationManager.headingFilter = 1.0;
            //     this.locationManager.startUpdatingHeading();
            // } else {
            //     console.log("HEADING NOT AVAILABLE. " );
            // }
        }
    }
    
    startOrientationUpdates() {
        super.startOrientationUpdates();
        if (this.motionManager) return;

        const motionManager = CMMotionManager.alloc().init();
        motionManager.deviceMotionUpdateInterval = 1.0 / 100.0;
        if (!motionManager.deviceMotionAvailable || !motionManager.magnetometerAvailable) {
            console.log("NO Magnetometer and/or Gyro. " );
            alert("Need a device with gyroscope and magnetometer to get 3D device orientation");
        } else {
            let effectiveReferenceFrame:CMAttitudeReferenceFrame;
            if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.XTrueNorthZVertical) {
                effectiveReferenceFrame = CMAttitudeReferenceFrame.XTrueNorthZVertical;

                // During testing of orientation problems, we tried 
                // turning on each of the individual updateds
                // to see if that helped.  It didn't, but here's the code:
                // motionManager.startMagnetometerUpdates();
                // motionManager.startGyroUpdates();
                // motionManager.startAccelerometerUpdates();
                
                motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
            } else {
                alert("Need a device with magnetometer to get full 3D device orientation");
                console.log("NO  CMAttitudeReferenceFrameXTrueNorthZVertical" );
            }
        }
        this.motionManager = motionManager;

        // make sure the device entity has a defined pose relative to the device orientation entity
        if (this.deviceEntity.position instanceof Argon.Cesium.ConstantPositionProperty == false) {
            this.deviceEntity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.orientationEntity);
        }
        if (this.deviceEntity.orientation instanceof Argon.Cesium.ConstantProperty == false) {
            this.deviceEntity.orientation = new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY);
        }
    }

    stopLocationUpdates() {
        super.stopLocationUpdates();
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
    }

    stopOrientationUpdates() {
        // BUG:  iOS 10 seems to have issues if you turn off and then
        // turn back on CMMotion.  So, we're not turning it off here.
        // But we probably should, when the bug is fixed.

        // super.stopOrientationUpdates();
        // if (this.motionManager) {
        //     // this.motionManager.stopDeviceMotionUpdates();
        //     // this.motionManager = undefined;
        // }
    }

    getMaximumViewport() {
        const contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        }
    }

    previousViewport:Argon.Viewport;

    configureVuforiaVideoBackground(viewport?:Argon.Viewport, enabled=true) {

        if (viewport && this.previousViewport && 
            this.previousViewport.x == viewport.x &&
            this.previousViewport.y == viewport.y &&
            this.previousViewport.width == viewport.width &&
            this.previousViewport.height == viewport.height) return;

        if (viewport) 
            this.previousViewport = viewport;
        else 
            viewport = this.previousViewport;

        if (!viewport) return;

        const videoView = vuforia.videoView;
        AbsoluteLayout.setLeft(videoView, viewport.x);
        AbsoluteLayout.setTop(videoView, viewport.y);
        videoView.width = viewport.width;
        videoView.height = viewport.height;

        const viewWidth = viewport.width;
        const viewHeight = viewport.height;
        const contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : 1;
        
        const cameraDevice = vuforia.api.getCameraDevice();
        const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode);
        let videoWidth = videoMode.width;
        let videoHeight = videoMode.height;

        const cameraCalibration = cameraDevice.getCameraCalibration();
        const videoFovs = cameraCalibration.getFieldOfViewRads();
        let videoFovX = videoFovs.x;
        let videoFovY = videoFovs.y;
        
        const orientation = getDisplayOrientation();
        if (orientation === 0 || orientation === 180) {
            videoWidth = videoMode.height;
            videoHeight = videoMode.width;
            videoFovX = videoFovs.y;
            videoFovY = videoFovs.x;
        }
        
        const widthRatio = viewWidth / videoWidth;
        const heightRatio = viewHeight / videoHeight;
        // aspect fill
        const scale = Math.max(widthRatio, heightRatio);
        // aspect fit
        // const scale = Math.min(widthRatio, heightRatio);

        // Tell the reality service what our default fov should be based on 
        // the video background configuration we have chosen
        const aspectRatio = viewWidth / viewHeight;
        if (widthRatio > heightRatio) {
            const viewFovX = videoFovX;
            if (aspectRatio > 1) {
                Argon.ArgonSystem.instance!.device.setDefaultFov(viewFovX);
            } else {
                const viewFovY = 2 * Math.atan(Math.tan(0.5 * viewFovX) / aspectRatio);
                Argon.ArgonSystem.instance!.device.setDefaultFov(viewFovY);
            }
        } else {
            const viewFovY = videoFovY;
            if (aspectRatio > 1) {
                const viewFovX = 2 * Math.atan(Math.tan(0.5 * viewFovY) * aspectRatio);
                Argon.ArgonSystem.instance!.device.setDefaultFov(viewFovX);
            } else {
                Argon.ArgonSystem.instance!.device.setDefaultFov(viewFovY);
            }
        }
        
        const config = {
            enabled,
            positionX:0,
            positionY:0,
            sizeX: videoWidth * scale * contentScaleFactor,
            sizeY: videoHeight * scale * contentScaleFactor,
            reflection: vuforia.VideoBackgroundReflection.Default
        }
        
        console.log(`Vuforia configuring video background...
            contentScaleFactor: ${contentScaleFactor} orientation: ${orientation} 
            viewWidth: ${viewWidth} viewHeight: ${viewHeight} videoWidth: ${videoWidth} videoHeight: ${videoHeight} 
            config: ${JSON.stringify(config)}
        `);
        
        vuforia.api.getRenderer().setVideoBackgroundConfig(config);
        vuforia.api.onSurfaceChanged(
            viewWidth * contentScaleFactor, 
            viewHeight * contentScaleFactor
        );
    }
}


export function getDisplayOrientation() : number {
    if (application.ios) {
        const orientation = utils.ios.getter(UIApplication, UIApplication.sharedApplication).statusBarOrientation;
        switch (orientation) {
            case UIInterfaceOrientation.Unknown:
            case UIInterfaceOrientation.Portrait: return 0;
            case UIInterfaceOrientation.PortraitUpsideDown: return 180;
            case UIInterfaceOrientation.LandscapeLeft: return 90;
            case UIInterfaceOrientation.LandscapeRight: return -90;
        }
    }
    if (application.android) {
        const context:android.content.Context = utils.ad.getApplicationContext();
        const display:android.view.Display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        const rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return 90;
            case android.view.Surface.ROTATION_270: return -90;
        }
    } 
    return 0;
}
