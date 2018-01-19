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

import * as util from './util'

const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;
const Matrix4    = Argon.Cesium.Matrix4;
const JulianDate = Argon.Cesium.JulianDate;

const negX90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_TWO);
const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
const ONE = new Cartesian3(1,1,1);

const x180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI);

export const VIDEO_DELAY = -0.5/60;
// const landscapeRightScreenOrientationRadians = -CesiumMath.PI_OVER_TWO;

const scratchCartesian = new Argon.Cesium.Cartesian3();
const scratchQuaternion = new Argon.Cesium.Quaternion();
const scratchMatrix3 = new Argon.Cesium.Matrix3();
const scratchMatrix4 = new Argon.Cesium.Matrix4();

const GROUND_PLANE_ANCHOR_NAME = 'ground';

@Argon.DI.autoinject
export class NativescriptDevice extends Argon.Device {

    constructor(
        sessionService:Argon.SessionService, 
        entityService:Argon.EntityService, 
        viewItems:Argon.ViewItems) {
        super(sessionService, entityService, viewItems);
    }

    public vuforiaCameraEntity = new Argon.Cesium.Entity({
        position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.user),
        orientation: new Argon.Cesium.ConstantProperty(x180)
    });

    state?:vuforia.State;

    public _executeRequestAnimationFrameCallbacks(state?:vuforia.State) {
        this.state = state;
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

    private locationWatchId?:number;
    
    private _scratchStageCartographic = new Argon.Cesium.Cartographic;
    private _scratchScreenOrientation = new Argon.Cesium.Quaternion;
    private _scratchVideoOrientation = new Argon.Cesium.Quaternion;

    private groundAnchor:vuforia.Anchor|null;

    public startGeolocationUpdates(options:Argon.GeolocationOptions) : Promise<void> {
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
                this.onGeolocationUpdate(
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
    
    public stopGeolocationUpdates() : void {
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
    }
    
    get screenOrientationDegrees() {
        return util.screenOrientation;
    }

    requestHeadDisplayMode() {
        const device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(true);
        this.displayModeChangeEvent.raiseEvent(undefined);
        return Promise.resolve();
    }

    exitHeadDisplayMode() {
        const device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(false);
        this.displayModeChangeEvent.raiseEvent(undefined);
        return Promise.resolve();
    }

    public getIdForTrackable(trackable:vuforia.Trackable) : string {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        } else {
            return 'vuforia_trackable_' + trackable.getId();
        }
    }

    private _userPosition = new Cartesian3;

    public get userTracking() : 'none'|'6DOF'|'3DOF' {
        return '6DOF';
    }
    public set userTracking(value) {}

    onUpdateFrameState() {

        const time = JulianDate.now();
        // subtract a few ms, since the video frame represents a time slightly in the past.
        // TODO: if we are using an optical see-through display, like hololens,
        // we want to do the opposite, and do forward prediction (though ideally not here, 
        // but in each app itself to we are as close as possible to the actual render time when
        // we start the render)
        JulianDate.addSeconds(time, VIDEO_DELAY, time);

        const screenOrientation = 
            Quaternion.fromAxisAngle(
                Cartesian3.UNIT_Z, 
                this.screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, 
                this._scratchScreenOrientation
            );

        const inverseVideoOrientation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, (CesiumMath.PI_OVER_TWO + util.screenOrientation * Math.PI / 180), this._scratchVideoOrientation);
        (this.vuforiaCameraEntity.orientation as Argon.Cesium.ConstantProperty).setValue(Quaternion.multiply(
            x180,
            inverseVideoOrientation,
            scratchQuaternion
        ));

        const state = this.state!;
        const vuforiaFrame = state.getFrame();
        const frameTimeStamp = vuforiaFrame.getTimeStamp();

        let hasUserPose = false;
        let hasStagePose = false;
                    
        // update trackable results in context entity collection
        const numTrackableResults = state.getNumTrackableResults();
        for (let i=0; i < numTrackableResults; i++) {
            const trackableResult = <vuforia.TrackableResult>state.getTrackableResult(i);
            const trackable = trackableResult.getTrackable();
            const name = trackable.getName();

            const pose = <Argon.Cesium.Matrix4><any>trackableResult.getPose();
            const position = Matrix4.getTranslation(pose, scratchCartesian);
            const rotationMatrix = Matrix4.getRotation(pose, scratchMatrix3);
            const orientation = Quaternion.fromRotationMatrix(rotationMatrix, scratchQuaternion);

            if (trackable instanceof vuforia.DeviceTrackable) {
                // Vuforia applies video rotation to device pose, so undo this
                const deviceOrientationValue = Quaternion.multiply(orientation, inverseVideoOrientation, this._scratchDeviceOrientation);
                // set user orientation
                (this.user.position as Argon.Cesium.ConstantPositionProperty).setValue(position, this.origin);
                (this.user.orientation as Argon.Cesium.ConstantProperty).setValue(deviceOrientationValue);
                hasUserPose = true;
                this._userPosition = Cartesian3.clone(position, this._userPosition);
                // console.log('Updating user pose ' + JSON.stringify(orientation));
                continue;
            }

            if (name === GROUND_PLANE_ANCHOR_NAME) {
                (this.stage.position as Argon.Cesium.ConstantPositionProperty).setValue(position, this.origin);
                (this.stage.orientation as Argon.Cesium.ConstantProperty).setValue(orientation);
                hasStagePose = true;
                continue;
            }

            if (trackable instanceof vuforia.ObjectTarget === false) {
                continue;
            }
            
            const id = this.getIdForTrackable(trackable);
            let entity = this.entityService.collection.getById(id);
            
            if (!entity) {
                entity = new Argon.Cesium.Entity({
                    id,
                    name,
                    position: new Argon.Cesium.SampledPositionProperty(this.vuforiaCameraEntity),
                    orientation: new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion)
                });
                const entityPosition = entity.position as Argon.Cesium.SampledPositionProperty;
                const entityOrientation = entity.orientation as Argon.Cesium.SampledProperty;
                entityPosition.maxNumSamples = 10;
                entityOrientation.maxNumSamples = 10;
                entityPosition.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                entityOrientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                entityPosition.forwardExtrapolationDuration = 10/60;
                entityOrientation.forwardExtrapolationDuration = 10/60;
                this.entityService.collection.add(entity);
            }
            
            const trackableTime = JulianDate.clone(time); 
            
            // add any time diff from vuforia
            const trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
            if (trackableTimeDiff !== 0) JulianDate.addSeconds(time, trackableTimeDiff, trackableTime);

            (entity.position as Argon.Cesium.SampledPositionProperty).addSample(trackableTime, position);
            (entity.orientation as Argon.Cesium.SampledProperty).addSample(trackableTime, orientation);
        }

        vuforia.api.smartTerrain!.hitTest(state, {x:0.5, y:0.5}, 1.4, vuforia.HitTestHint.HorizontalPlane);
        
        const hitTestResultCount = vuforia.api.smartTerrain!.getHitTestResultCount();
        if (hitTestResultCount > 0) {
            const result = vuforia.api.smartTerrain!.getHitTestResult(0);
            const resultPose = result.getPose();

            const position = Matrix4.getTranslation(<any>resultPose, scratchCartesian);

            if (!this.groundAnchor && hasUserPose && position.y < this._userPosition.y) {
                position.x = this._userPosition.x;
                position.z = this._userPosition.z;
                const groundPose = Matrix4.fromTranslation(position, scratchMatrix4);
                this.groundAnchor = vuforia.api.positionalDeviceTracker!.createAnchorFromPose(GROUND_PLANE_ANCHOR_NAME, groundPose);
            }
        }

        const viewport = this.frameState.viewport;
        const contentView = frames.topmost().currentPage.content;
        const contentSize = contentView.getActualSize();

        viewport.x = 0;
        viewport.y = 0;
        viewport.width = contentSize.width;
        viewport.height = contentSize.height;

        const origin = this.origin;
        (origin.position as Argon.Cesium.DynamicPositionProperty).setValue(Cartesian3.ZERO, this.deviceGeolocation);
        (origin.orientation as Argon.Cesium.DynamicProperty).setValue(Quaternion.IDENTITY);
        
        const deviceOrientation = this.deviceOrientation;
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
                let deviceOrientationValue = Quaternion.multiply(z90, motionQuaternion, this._scratchDeviceOrientation);
                // And then... convert to EUS!
                deviceOrientationValue = Quaternion.multiply(negX90, deviceOrientationValue, deviceOrientationValue);

                (deviceOrientation.orientation as Argon.Cesium.ConstantProperty).setValue(deviceOrientationValue);
                const locationManager = this._getLocationManagerIOS();
                const heading = locationManager.heading;
                deviceOrientation['meta'] = deviceOrientation['meta'] || {};
                deviceOrientation['meta'].geoHeadingAccuracy = heading && heading.headingAccuracy;
            }

        } else if (this._application.android) {

            const motionManager = this._getMotionManagerAndroid();
            if (motionManager) {
                let deviceOrientationValue = this._motionQuaternionAndroid;
                // convert to EUS
                deviceOrientationValue = Quaternion.multiply(negX90, deviceOrientationValue, deviceOrientationValue);

                (deviceOrientation.orientation as Argon.Cesium.ConstantProperty).setValue(deviceOrientationValue);
                
            }
        }
        
        if (!hasStagePose) {
            console.log('using custom stage pose!');

            const stage = this.stage;
            (stage.position as Argon.Cesium.DynamicPositionProperty).setValue(
                Cartesian3.fromElements(0,-this.suggestedUserHeight,0, this._scratchCartesian), 
                this.origin
            );
            (stage.orientation as Argon.Cesium.DynamicProperty).setValue(Quaternion.IDENTITY);
        }

        if (!hasUserPose) {
            console.log('using custom user pose!')

            const user = this.user;
            (user.position as Argon.Cesium.DynamicPositionProperty).setValue(
                Cartesian3.ZERO,
                this.deviceOrientation
            );
            (user.orientation as Argon.Cesium.DynamicProperty).setValue(
                screenOrientation
            );
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
        visibilityServiceProvider:Argon.VisibilityServiceProvider,
        device:Argon.Device,
        vuforiaServiceProvider:Argon.VuforiaServiceProvider) {
            
        super(
            sessionService, 
            deviceService,
            viewService,
            entityService, 
            entityServiceProvider,
            visibilityServiceProvider,
            device
        );

        const d = <NativescriptDevice><any>device;
        if (vuforia.api) {
            const vsp = <NativescriptVuforiaServiceProvider>vuforiaServiceProvider;
            vsp.stateUpdateEvent.addEventListener((state)=>{
                d._executeRequestAnimationFrameCallbacks(state);
            });
        } else {
            setInterval(() => d._executeRequestAnimationFrameCallbacks(), 34);            
        }

        application.on(application.orientationChangedEvent, ()=>{
            setTimeout(()=>{
                this.publishStableState();
            }, 600);
            this.publishStableState();
        });

        if (application.ios) {
            application.ios.addNotificationObserver(UIApplicationDidChangeStatusBarOrientationNotification, () => {
                this.publishStableState();
            });

            application.ios.addNotificationObserver(UIApplicationDidChangeStatusBarFrameNotification, () => {
                this.publishStableState();
            });
        }

        application.on(application.resumeEvent, () => {
            this.publishStableState();
        });
    }

    private _scratchPerspectiveFrustum = new Argon.Cesium.PerspectiveFrustum;
    private _scratchVideoMatrix4 = new Argon.Cesium.Matrix4;
    private _scratchVideoQuaternion = new Argon.Cesium.Quaternion;

    public onUpdateStableState(stableState:Argon.DeviceStableState) {

        if (!vuforia.api) return super.onUpdateStableState(stableState);
        
        const viewport = this.deviceService.frameState.viewport;
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
                    Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, (CesiumMath.PI_OVER_TWO - util.screenOrientation * Math.PI / 180), this._scratchVideoQuaternion),
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