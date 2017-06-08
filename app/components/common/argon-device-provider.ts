import * as application from "application";
import * as utils from 'utils/utils';
import * as geolocation from 'speigg-nativescript-geolocation';
import * as dialogs from 'ui/dialogs';
import * as enums from 'ui/enums';
import * as platform from 'platform';

import * as vuforia from 'nativescript-vuforia';
import * as frames from 'ui/frame';
import {NativescriptVuforiaServiceProvider} from './argon-vuforia-provider'
import * as Argon from "@argonjs/argon";

import {screenOrientation} from './util'

const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;
const Matrix4    = Argon.Cesium.Matrix4;

const negX90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_TWO);
const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
const ONE = new Cartesian3(1,1,1);

@Argon.DI.autoinject
export class NativescriptDeviceService extends Argon.DeviceService {

    constructor(
        sessionService:Argon.SessionService, 
        entityService:Argon.EntityService, 
        viewService:Argon.ViewService,
        visibilityService:Argon.VisibilityService) {
        super(sessionService, entityService, viewService, visibilityService);
    }

    public executeReqeustAnimationFrameCallbacks() {
        const now = global.performance.now();
        // swap callback maps
        const callbacks = this._callbacks;
        this._callbacks = this._callbacks2;
        this._callbacks2 = callbacks;
        for (let i in callbacks) {
            this._executeCallback(callbacks[i], now);
        }
        for (let i in callbacks) {
            delete callbacks[i];
        }
    }

    private _executeCallback = (cb:Function, now:number) => {
        cb(now);
    };

    private _application = application;
    private _scratchDisplayOrientation = new Quaternion;
    private _scratchDeviceOrientation = new Quaternion;

    private _id = 0;
    private _callbacks:{[id:number]:Function} = {};
    private _callbacks2:{[id:number]:Function} = {};

    requestAnimationFrame = (cb:(timestamp:number)=>void) => {
        this._id++;
        this._callbacks[this._id] = cb;
        return this._id;
    }

    cancelAnimationFrame = (id:number) => {
        delete this._callbacks[id];
    }
    
    get screenOrientationDegrees() {
        return screenOrientation;
    }

    onRequestPresentHMD() {
        const device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(true);
        return Promise.resolve();
    }

    onExitPresentHMD() {
        const device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(false);
        return Promise.resolve();
    }

    onUpdateFrameState() {


        if (this._application.ios) {
            const motionManager = this._getMotionManagerIOS();
            const motion = motionManager && motionManager.deviceMotion;

            if (motion) {
                const motionQuaternion = <Argon.Cesium.Quaternion>motion.attitude.quaternion;

                // Apple's orientation is reported in NWU, so we convert to ENU by applying a global rotation of
                // 90 degrees about +z to the NWU orientation (or applying the NWU quaternion as a local rotation 
                // to the starting orientation of 90 degress about +z). 
                // Note: With quaternion multiplication the `*` symbol can be read as 'rotates'. 
                // If the orientation (O) is on the right and the rotation (R) is on the left, 
                // such that the multiplication order is R*O, then R is a global rotation being applied on O. 
                // Likewise, the reverse, O*R, is a local rotation R applied to the orientation O. 
                let deviceOrientation = Quaternion.multiply(z90, motionQuaternion, this._scratchDeviceOrientation);
                // And then... convert to EUS!
                deviceOrientation = Quaternion.multiply(negX90, deviceOrientation, deviceOrientation);

                const screenOrientationDegrees = this.screenOrientationDegrees;

                const deviceUser = this.user;
                const deviceStage = this.stage;

                if (!deviceUser.position) deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation) deviceUser.orientation = new Argon.Cesium.ConstantProperty();

                (deviceUser.position as Argon.Cesium.ConstantPositionProperty).setValue(
                    Cartesian3.fromElements(0,this.suggestedUserHeight,0, this._scratchCartesian),
                    deviceStage
                );

                const screenOrientation = 
                    Quaternion.fromAxisAngle(
                        Cartesian3.UNIT_Z, 
                        screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, 
                        this._scratchDisplayOrientation
                    );

                const screenBasedDeviceOrientation = 
                    Quaternion.multiply(
                        deviceOrientation, 
                        screenOrientation, 
                        this._scratchDeviceOrientation
                    );

                (deviceUser.orientation as Argon.Cesium.ConstantProperty).setValue(screenBasedDeviceOrientation);
                
                const locationManager = this._getLocationManagerIOS();
                const heading = locationManager.heading;
                deviceUser['meta'] = deviceUser['meta'] || {};
                deviceUser['meta'].geoHeadingAccuracy = heading && heading.headingAccuracy;
            }

        } else if (this._application.android) {

            const motionManager = this._getMotionManagerAndroid();
            if (motionManager) {
                let deviceOrientation = this._motionQuaternionAndroid;
                // convert to EUS
                deviceOrientation = Quaternion.multiply(negX90, deviceOrientation, deviceOrientation);

                const screenOrientationDegrees = this.screenOrientationDegrees;

                const deviceUser = this.user;
                const deviceStage = this.stage;

                if (!deviceUser.position) deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation) deviceUser.orientation = new Argon.Cesium.ConstantProperty();

                (deviceUser.position as Argon.Cesium.ConstantPositionProperty).setValue(
                    Cartesian3.fromElements(0,this.suggestedUserHeight,0, this._scratchCartesian),
                    deviceStage
                );

                const screenOrientation = 
                    Quaternion.fromAxisAngle(
                        Cartesian3.UNIT_Z, 
                        screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, 
                        this._scratchDisplayOrientation
                    );

                const screenBasedDeviceOrientation = 
                    Quaternion.multiply(
                        deviceOrientation, 
                        screenOrientation, 
                        this._scratchDeviceOrientation
                    );

                (deviceUser.orientation as Argon.Cesium.ConstantProperty).setValue(screenBasedDeviceOrientation);
            }
        }
    }

    private _motionManagerIOS?:CMMotionManager;

    private _getMotionManagerIOS() : CMMotionManager|undefined {
        if (this._motionManagerIOS) return this._motionManagerIOS;

        const motionManager = CMMotionManager.alloc().init();
        motionManager.showsDeviceMovementDisplay = true
        motionManager.deviceMotionUpdateInterval = 1.0 / 100.0;
        if (!motionManager.deviceMotionAvailable || !motionManager.magnetometerAvailable) {
            // console.log("NO Magnetometer and/or Gyro. " );
            return undefined;
        } else {
            let effectiveReferenceFrame:CMAttitudeReferenceFrame;
            if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.XTrueNorthZVertical) {
                effectiveReferenceFrame = CMAttitudeReferenceFrame.XTrueNorthZVertical;
                motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
            } else {
                // console.log("NO  CMAttitudeReferenceFrameXTrueNorthZVertical" );
                return undefined;
            }
        }
        this._motionManagerIOS = motionManager;
        return motionManager;
    }

    private _locationManagerIOS?:CLLocationManager;

    private _getLocationManagerIOS() {
        if (!this._locationManagerIOS) {
            this._locationManagerIOS = CLLocationManager.alloc().init();

            switch (CLLocationManager.authorizationStatus()) {
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse:
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways: 
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined:
                    this._locationManagerIOS.requestWhenInUseAuthorization();
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
        }
        return this._locationManagerIOS;
    }

    private _motionManagerAndroid?:android.hardware.SensorEventListener;
    private _motionQuaternionAndroid = new Quaternion;

    private _getMotionManagerAndroid() : android.hardware.SensorEventListener|undefined {
        if (this._motionManagerAndroid) return this._motionManagerAndroid;

        var sensorManager = application.android.foregroundActivity.getSystemService(android.content.Context.SENSOR_SERVICE);
        var rotationSensor = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ROTATION_VECTOR);

        var sensorEventListener = new android.hardware.SensorEventListener({
            onAccuracyChanged: (sensor, accuracy) => {
                //console.log("onAccuracyChanged: " + accuracy);
            },
            onSensorChanged: (event) => {
                Quaternion.unpack(<number[]>event.values, 0, this._motionQuaternionAndroid);
            }
        });

        sensorManager.registerListener(sensorEventListener, rotationSensor, android.hardware.SensorManager.SENSOR_DELAY_GAME);
        this._motionManagerAndroid = sensorEventListener;
        return sensorEventListener;
    }
}

@Argon.DI.autoinject
export class NativescriptDeviceServiceProvider extends Argon.DeviceServiceProvider {
    constructor(
        container, 
        sessionService:Argon.SessionService, 
        deviceService:Argon.DeviceService,
        viewService:Argon.ViewService,
        entityService:Argon.EntityService,
        entityServiceProvider:Argon.EntityServiceProvider,
        private focusServiceProvider:Argon.FocusServiceProvider,
        vuforiaServiceProvider:Argon.VuforiaServiceProvider) {
            
        super(
            sessionService, 
            deviceService,
            viewService,
            entityService, 
            entityServiceProvider
        );

        application.on(application.orientationChangedEvent, ()=>{
            setTimeout(()=>{
                this.publishStableState();
            }, 600);
            this.publishStableState();
        });

        const vsp = <NativescriptVuforiaServiceProvider>vuforiaServiceProvider;

        vsp.stateUpdateEvent.addEventListener(()=>{
            (this.deviceService as NativescriptDeviceService).executeReqeustAnimationFrameCallbacks();
        });

        if (!vuforia.api) {
            setInterval(() => vsp.stateUpdateEvent.raiseEvent(Argon.Cesium.JulianDate.now()), 34);
        }
    }

    private _scratchPerspectiveFrustum = new Argon.Cesium.PerspectiveFrustum;
    private _scratchVideoMatrix4 = new Argon.Cesium.Matrix4;
    private _scratchVideoQuaternion = new Argon.Cesium.Quaternion;

    public onUpdateStableState(stableState:Argon.DeviceStableState) {
        
        const viewport = this.deviceService.frameState.viewport;
        const contentView = frames.topmost().currentPage.content;
        const contentSize = contentView.getActualSize();

        viewport.x = 0;
        viewport.y = 0;
        viewport.width = contentSize.width;
        viewport.height = contentSize.height;

        const subviews = this.deviceService.frameState.subviews;
        const device = vuforia.api.getDevice();
        const renderingPrimitives = device.getRenderingPrimitives();
        const renderingViews = renderingPrimitives.getRenderingViews();
        const numViews = renderingViews.getNumViews();

        const contentScaleFactor = vuforia.videoView.ios ? (<UIView>vuforia.videoView.ios).contentScaleFactor : platform.screen.mainScreen.scale;

        subviews.length = numViews;subviews.length = numViews;

        for (let i = 0; i < numViews; i++) {
            const view = renderingViews.getView(i);

            // TODO: support PostProcess rendering subview
            if (view === vuforia.View.PostProcess) {
                subviews.length--;
                continue;
            }

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
            subviewViewport.width = vuforiaSubviewViewport.z / contentScaleFactor;
            subviewViewport.height = vuforiaSubviewViewport.w / contentScaleFactor;

            // Start with the projection matrix for this subview
            // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
            // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
            let projectionMatrix = <any>renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);
            
            if (!isFinite(projectionMatrix[0])) {

                // if our projection matrix is giving null values then the
                // surface is not properly configured for some reason, so reset it
                // (not sure why this happens, but it only seems to happen after or between 
                // vuforia initializations)
                if (i === 0) {
                    vuforia.api.onSurfaceChanged(
                        viewport.width * contentScaleFactor,
                        viewport.height * contentScaleFactor
                    );
                }

                const frustum = this._scratchPerspectiveFrustum;
                frustum.fov = Math.PI/2;
                frustum.near = 0.01;
                frustum.far = 10000;
                frustum.aspectRatio = subviewViewport.width / subviewViewport.height;
                if (!isFinite(frustum.aspectRatio) || frustum.aspectRatio === 0) frustum.aspectRatio = 1;
                subview.projectionMatrix = Matrix4.clone(frustum.projectionMatrix, subview.projectionMatrix);

            } else {

                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation for vuforia's video (at least on iOS) is the landscape right orientation,
                // which is the orientation where the device is held in landscape with the home button on the right. 
                // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
                // So, we want to undo this rotation which vuforia applies for us.  
                // TODO: calculate this matrix only when we have to (when the interface orientation changes)
                const inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(
                    Cartesian3.ZERO,
                    Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, (CesiumMath.PI_OVER_TWO - screenOrientation * Math.PI / 180), this._scratchVideoQuaternion),
                    ONE,
                    this._scratchVideoMatrix4
                );
                Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);

                // convert from the vuforia projection matrix (+X -Y +Z) to a more standard convention (+X +Y -Z)
                // by negating the appropriate columns. 
                // See https://developer.vuforia.com/library/articles/Solution/How-To-Use-the-Camera-Projection-Matrix
                projectionMatrix[0] *= -1; // x
                projectionMatrix[1] *= -1; // y
                projectionMatrix[2] *= -1; // z
                projectionMatrix[3] *= -1; // w

                projectionMatrix[8] *= -1;  // x
                projectionMatrix[9] *= -1;  // y
                projectionMatrix[10] *= -1; // z
                projectionMatrix[11] *= -1; // w

                // Argon.Cesium.Matrix4.multiplyByScale(projectionMatrix, Cartesian3.fromElements(1,-1,-1, this._scratchCartesian), projectionMatrix)

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
            }


            // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
            // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
            // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
            
            // TODO: use eye adjustment matrix to set subview poses (for eye separation). See commented out code above...
        }
    }

    private locationWatchId?:number;

    private _scratchStageCartographic = new Argon.Cesium.Cartographic;

    public onStartGeolocationUpdates(options:Argon.GeolocationOptions) : Promise<void> {
        if (typeof this.locationWatchId !== 'undefined') return Promise.resolve();;
        
        return new Promise<void>((resolve, reject)=>{

            // Note: the d.ts for nativescript-geolocation is wrong. This call is correct. 
            // Casting the module as <any> here for now to hide annoying typescript errors...
            this.locationWatchId = (<any>geolocation).watchLocation((location:geolocation.Location)=>{
                // Note: iOS documentation states that the altitude value refers to height (meters) above sea level, but 
                // if ios is reporting the standard gps defined altitude, then this theoretical "sea level" actually refers to 
                // the WGS84 ellipsoid rather than traditional mean sea level (MSL) which is not a simple surface and varies 
                // according to the local gravitational field. 
                // In other words, my best guess is that the altitude value here is *probably* GPS defined altitude, which 
                // is equivalent to the height above the WGS84 ellipsoid, which is exactly what Cesium expects...
                this.configureStage(
                    Argon.Cesium.Cartographic.fromDegrees(location.longitude, location.latitude, location.altitude, this._scratchStageCartographic),
                    location.horizontalAccuracy, 
                    location.verticalAccuracy
                );
            }, 
            (e)=>{
                reject(e);
            }, <geolocation.Options>{
                desiredAccuracy: options && options.enableHighAccuracy ? 
                    application.ios ? 
                        kCLLocationAccuracyBest : 
                        enums.Accuracy.high : 
                    application.ios ? 
                        kCLLocationAccuracyNearestTenMeters :
                        10,
                updateDistance: application.ios ? kCLDistanceFilterNone : 0,
                minimumUpdateTime : options && options.enableHighAccuracy ?
                    0 : 5000 // required on Android, ignored on iOS
            });
            
            console.log("Creating location watcher. " + this.locationWatchId);
        });
    }

    
    public onStopGeolocationUpdates() : void {
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
    }

    private _ensurePermission(session:Argon.SessionPort) {
        if (this.focusServiceProvider.session == session) return; 
        if (session == this.sessionService.manager) return;
        throw new Error('Session does not have focus.')
    }
    
    handleRequestPresentHMD(session:Argon.SessionPort) {
        this._ensurePermission(session);
        return Promise.resolve();
    }

    handleExitPresentHMD(session:Argon.SessionPort) {
        this._ensurePermission(session);
        return Promise.resolve();
    }

}