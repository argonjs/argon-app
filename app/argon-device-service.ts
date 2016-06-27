import * as application from "application";
import * as frames from 'ui/frame';
import * as vuforia from 'nativescript-vuforia';
import * as utils from 'utils/utils';
import * as geolocation from 'speigg-nativescript-geolocation';
import * as enums from 'ui/enums';
import * as dialogs from 'ui/dialogs';

import Argon = require("argon");

const JulianDate = Argon.Cesium.JulianDate;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;
const Transforms = Argon.Cesium.Transforms;
const Matrix4    = Argon.Cesium.Matrix4;
const Matrix3    = Argon.Cesium.Matrix3;

const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);

const scratchTime = new JulianDate(0,0);
const scratchCartesian3 = new Cartesian3;
const scratchQuaternion = new Quaternion;
const scratchECEFQuaternion = new Quaternion;
const scratchMatrix4 = new Matrix4;
const scratchMatrix3 = new Matrix3;

@Argon.DI.inject(Argon.ContextService)
export class NativescriptDeviceService extends Argon.DeviceService {
    
    private locationWatchId:number;
    private locationManager:CLLocationManager;
    private motionManager:CMMotionManager;
    
    constructor(context:Argon.ContextService) {
        super(context);

        this.geolocationEntity.position = new Argon.Cesium.SampledPositionProperty(Argon.Cesium.ReferenceFrame.FIXED);
        this.geolocationEntity.position.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.geolocationEntity.position.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.geolocationEntity.position.maxNumSamples = 10;
        this.geolocationEntity.orientation = new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY);
        
        this.orientationEntity.position = undefined;
        this.orientationEntity.orientation = new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion);
        this.orientationEntity.orientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.orientationEntity.orientation.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.orientationEntity.orientation.maxNumSamples = 10;
    }
    
    ensureGeolocation() {
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
        }, 
        (e)=>{
            console.log(e);
        }, <geolocation.Options>{
            desiredAccuracy: application.ios ? kCLLocationAccuracyBestForNavigation : 0,
            updateDistance: application.ios ? kCLDistanceFilterNone : 0
        });
        
        console.log("Creating location watcher. " + this.locationWatchId);
        
        if (application.ios) {
            switch (CLLocationManager.authorizationStatus()) {
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse:
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways: 
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined:
                    this.locationManager = CLLocationManager.new();
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
                            UIApplication.sharedApplication().openURL(url);
                        }
                    })
            }
        }
    }
    
    ensureDeviceOrientation() {
        if (this.motionManager) return;

        const motionManager = CMMotionManager.alloc().init();
        motionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
        let effectiveReferenceFrame:CMAttitudeReferenceFrame;
        if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
            effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
        } else {
            effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXArbitraryCorrectedZVertical;
        }
        motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
        this.motionManager = motionManager;

        // make sure the device entity has a defined pose relative to the device orientation entity
        if (this.entity.position instanceof Argon.Cesium.ConstantPositionProperty == false) {
            this.entity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.orientationEntity);
        }
        if (this.entity.orientation instanceof Argon.Cesium.ConstantProperty == false) {
            this.entity.orientation = new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY);
        }
    }
    
    onIdle() {
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
        if (this.motionManager) {
            this.motionManager.stopDeviceMotionUpdates();
            this.motionManager = undefined;
        }
    }
    
    onUpdate() {
        this.ensureGeolocation();
        this.ensureDeviceOrientation();
        
        const time = JulianDate.now();
    
        if (application.ios) {
            
            const motion = this.motionManager.deviceMotion;

            if (motion) {
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
    }
}


export function getDisplayOrientation() : number {
    if (application.ios) {
        const orientation = UIApplication.sharedApplication().statusBarOrientation;
        switch (orientation) {
            case UIInterfaceOrientation.UIInterfaceOrientationUnknown:
            case UIInterfaceOrientation.UIInterfaceOrientationPortrait: return 0;
            case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown: return 180;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft: return 90;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight: return -90;
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