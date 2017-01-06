import * as application from "application";
import * as utils from 'utils/utils';
import * as geolocation from 'speigg-nativescript-geolocation';
import * as dialogs from 'ui/dialogs';
import * as enums from 'ui/enums';
import * as frames from 'ui/frame';
import * as platform from 'platform';

import * as Argon from "@argonjs/argon";
import * as vuforia from 'nativescript-vuforia';

const JulianDate = Argon.Cesium.JulianDate;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;
const Matrix4    = Argon.Cesium.Matrix4;

const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
const ONE = new Cartesian3(1,1,1);

const scratchQuaternion = new Quaternion;
const scratchMatrix4 = new Matrix4;

export const vuforiaCameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.OpimizeQuality;
if (vuforia.videoView.ios) {
    (<UIView>vuforia.videoView.ios).contentScaleFactor = 
        vuforiaCameraDeviceMode === <vuforia.CameraDeviceMode> vuforia.CameraDeviceMode.OptimizeSpeed ? 
        1 : platform.screen.mainScreen.scale;
}

@Argon.DI.inject(Argon.SessionService, Argon.ContextService, Argon.ViewService)
export class NativescriptDeviceService extends Argon.DeviceService {
    
    private locationWatchId?:number;
    private locationManager?:CLLocationManager;
    private motionManager?:CMMotionManager;
    private calibStartTime: Argon.Cesium.JulianDate;
    private calibrating: boolean;

    constructor(session: Argon.SessionService, context:Argon.ContextService, view:Argon.ViewService) {
        super(session, context, view);

        this.calibStartTime = JulianDate.now();
        this.calibrating = false;

        // realityService.viewStateEvent.addEventListener((viewState)=>{
        //     if (vuforia.api) {                   
        //         const desiredFov = viewState.subviews[0].frustum.fov;
        //         // convert the desired fov to the appropriate scale factor
        //         const defaultFov = this.state.defaultFov;
        //         const desiredHalfLength = Math.tan(0.5*desiredFov);
        //         const defaultHalfLength = Math.tan(0.5*defaultFov);
        //         const scaleFactor =  defaultHalfLength / desiredHalfLength;
        //         // make sure the video is scaled as appropriately
        //         vuforia.api.setScaleFactor(scaleFactor);
        //         // update the videoView
        //         this.configureVuforiaVideoBackground(viewState.viewport);
        //     }
        // });
    }
    
    onUpdateSubviews(subviews:Argon.SerializedSubviewList) {

        // const cameraDevice = vuforia.api.getCameraDevice();
        // const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode);

        if (vuforia.api && vuforia.api.getDevice().isViewerActive()) {
            const device = vuforia.api.getDevice();
            const renderingPrimitives = device.getRenderingPrimitives();
            const renderingViews = renderingPrimitives.getRenderingViews();
            const numViews = renderingViews.getNumViews()

            const contentScaleFactor = (<UIView>vuforia.videoView.ios).contentScaleFactor;

            for (let i = 0; i < numViews; i++) {
                const view = renderingViews.getView(i);

                // TODO: support PostProcess rendering subview
                if (view === vuforia.View.PostProcess) continue;

                const subview = subviews[i] = subviews[i] || <Argon.SerializedSubview>{};

                // Set subview type
                switch (view) {
                    case vuforia.View.LeftEye:
                        subview.type = Argon.SubviewType.LEFTEYE; break;
                    case vuforia.View.RightEye:
                        subview.type = Argon.SubviewType.RIGHTEYE; break;
                    case vuforia.View.Singular:
                        subview.type = Argon.SubviewType.SINGULAR; break;
                    default:
                        subview.type = Argon.SubviewType.OTHER; break;
                }

                // Update subview viewport
                const vuforiaSubviewViewport = renderingPrimitives.getViewport(view);
                const subviewViewport = subview.viewport = subview.viewport || <Argon.Viewport>{};
                subviewViewport.x = vuforiaSubviewViewport.x / contentScaleFactor;
                subviewViewport.y = vuforiaSubviewViewport.y / contentScaleFactor;
                // const subviewWidth = subviewViewport.width = vuforiaSubviewViewport.z / contentScaleFactor;
                // const subviewHeight = subviewViewport.height = vuforiaSubviewViewport.w / contentScaleFactor;

                // Determine the desired subview projection matrix

                // Start with the projection matrix for this subview
                // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
                // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
                let projectionMatrix = <any>renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);

                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation for vuforia's video (at least on iOS) is the landscape right orientation,
                // which is the orientation where the device is held in landscape with the home button on the right. 
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

                // convert from the vuforia projection matrix (+X -Y +Z) to a more standard convention (+X +Y -Z)
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

                // Scale the projection matrix to fit nicely within a subview of type SINGULAR
                // (This scale will not apply when the user is wearing a monocular HMD, since a
                // monocular HMD would provide a subview of type LEFTEYE or RIGHTEYE)
                // if (subview.type == Argon.SubviewType.SINGULAR) {
                //     const widthRatio = subviewWidth / videoMode.width;
                //     const heightRatio = subviewHeight / videoMode.height;

                //     // aspect fill
                //     const scaleFactor = Math.max(widthRatio, heightRatio);
                //     // or aspect fit
                //     // const scaleFactor = Math.min(widthRatio, heightRatio);

                //     // scale x-axis
                //     projectionMatrix[0] *= scaleFactor; // x
                //     projectionMatrix[1] *= scaleFactor; // y
                //     projectionMatrix[2] *= scaleFactor; // z
                //     projectionMatrix[3] *= scaleFactor; // w
                //     // scale y-axis
                //     projectionMatrix[4] *= scaleFactor; // x
                //     projectionMatrix[5] *= scaleFactor; // y
                //     projectionMatrix[6] *= scaleFactor; // z
                //     projectionMatrix[7] *= scaleFactor; // w
                // }

                subview.projectionMatrix = Matrix4.clone(projectionMatrix, subview.projectionMatrix);

                // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
                
                // default to identity subview pose (in relation to the overall view pose)
                // TODO: use eye adjustment matrix to get subview poses (for eye separation). See commented out code above...
                subview.pose = undefined; 
            }

        } else {
            super.onUpdateSubviews(subviews);
        }
    }

    protected onStartGeolocationUpdates(enableHighAccuracy:boolean) : boolean {
        if (typeof this.locationWatchId !== 'undefined') return true;
        
        // Note: the d.ts for nativescript-geolocation is wrong. This call is correct. 
        // Casting the module as <any> here for now to hide annoying typescript errors...
        this.locationWatchId = (<any>geolocation).watchLocation((location:geolocation.Location)=>{
            // Note: iOS documentation states that the altitude value refers to height (meters) above sea level, but 
            // if ios is reporting the standard gps defined altitude, then this theoretical "sea level" actually refers to 
            // the WGS84 ellipsoid rather than traditional mean sea level (MSL) which is not a simple surface and varies 
            // according to the local gravitational field. 
            // In other words, my best guess is that the altitude value here is *probably* GPS defined altitude, which 
            // is equivalent to the height above the WGS84 ellipsoid, which is exactly what Cesium expects...
            this._setGeolocation(
                location.longitude, 
                location.latitude, 
                location.altitude, 
                location.horizontalAccuracy, 
                location.verticalAccuracy
            );
        }, 
        (e)=>{
            console.log(e);
        }, <geolocation.Options>{
            desiredAccuracy: enableHighAccuracy ? 
                application.ios ? 
                    kCLLocationAccuracyBest : 
                    enums.Accuracy.high : 
                application.ios ? 
                    kCLLocationAccuracyKilometer :
                    enums.Accuracy.any,
            updateDistance: application.ios ? kCLDistanceFilterNone : 0
        });
        
        console.log("Creating location watcher. " + this.locationWatchId);

        this.ensureLocationManager();

        return true;
    }

    private ensureLocationManager() {
        if (application.ios && !this.locationManager) {

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

    protected onStopGeolocationUpdates() {
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
    }

    protected onStartOrientationUpdates() : boolean {
        if (this.motionManager) return true;

        const motionManager = CMMotionManager.alloc().init();
        motionManager.deviceMotionUpdateInterval = 1.0 / 100.0;
        if (!motionManager.deviceMotionAvailable || !motionManager.magnetometerAvailable) {
            console.log("NO Magnetometer and/or Gyro. " );
            alert("Need a device with gyroscope and magnetometer to get 3D device orientation");
            return false;
        } else {
            let effectiveReferenceFrame:CMAttitudeReferenceFrame;
            if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.XTrueNorthZVertical) {
                effectiveReferenceFrame = CMAttitudeReferenceFrame.XTrueNorthZVertical;
                motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
            } else {
                alert("Need a device with magnetometer to get full 3D device orientation");
                console.log("NO  CMAttitudeReferenceFrameXTrueNorthZVertical" );
                return false;
            }
        }
        this.motionManager = motionManager;
        return true;
    }
    
    protected onStopOrientationUpdates() {
        if (this.motionManager) {
            // BUG:  iOS 10 seems to have issues if you turn off and then
            // turn back on CMMotion.  So, we're not turning it off here.
            // But we probably should, when the bug is fixed.
            //
            // this.motionManager.stopDeviceMotionUpdates();
            // this.motionManager = undefined;
        }
    }
    
    protected onUpdate() {
        
        const time = JulianDate.now();
    
        if (application.ios && this.motionManager) {
            
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

                const displayOrientationDegrees = getDisplayOrientation();
                
                this.ensureLocationManager();
                const locationManager = this.locationManager!;

                let headingAccuracy:number|undefined;
                if (utils.ios.getter(locationManager, locationManager.headingAvailable)) {
                    headingAccuracy = locationManager.heading.headingAccuracy;
                }

                this._setOrientation(orientation, displayOrientationDegrees, headingAccuracy);
            }
        }

        super.onUpdate();
    }

    protected onUpdateViewport(viewport:Argon.Viewport) {
        const contentView = frames.topmost().currentPage.content;
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = contentView.getMeasuredWidth();
        viewport.height = contentView.getMeasuredHeight();
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