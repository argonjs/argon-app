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

let iosMotionManager:CMMotionManager;

export function getIosMotionManager() {
    if (iosMotionManager) return iosMotionManager;

    console.log("Creating ios motion manager.")

    iosMotionManager = CMMotionManager.alloc().init();
    iosMotionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
    let effectiveReferenceFrame:CMAttitudeReferenceFrame;
    if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
    } else {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXArbitraryCorrectedZVertical;
    }
    iosMotionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
    return iosMotionManager;
}

var lastGPSPosition;

export class NativescriptDeviceService extends Argon.DeviceService {
    
    private locationWatchId:number;
    private startedLocationServices: boolean;
    
    constructor() {
        super()

        this.entity.position = new Argon.Cesium.SampledPositionProperty(Argon.Cesium.ReferenceFrame.FIXED);
        this.entity.position.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.entity.position.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        
        this.entity.orientation = new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion);
        this.entity.orientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.entity.orientation.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
    }
    
    ensureGeolocation() {
        if (typeof this.locationWatchId !== 'undefined') return;
        if (this.startedLocationServices) return;
        
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
            const sampledPosition = this.entity.position as Argon.Cesium.SampledPositionProperty;
            const position =  Argon.Cesium.Cartesian3.fromDegrees(
                    location.longitude,
                    location.latitude,
                    location.altitude,
                    Argon.Cesium.Ellipsoid.WGS84,
                    scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
            
            // make sure its actually working. TOOD: remove once verified...
            var gpsPos = location.longitude + ' ' + location.latitude + ' ' + location.altitude;
            if (lastGPSPosition !== gpsPos) console.log('gps position changed '+gpsPos);
            lastGPSPosition = gpsPos;
        }, 
        (e)=>{
            console.log(e);
        }, <geolocation.Options>{
            desiredAccuracy: application.ios ? kCLLocationAccuracyBestForNavigation : 0
        });
        
        this.startedLocationServices = true;
        
        console.log("Creating location watcher. " + this.locationWatchId);
        
        if (application.ios) {
            switch (CLLocationManager.authorizationStatus()) {
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse:
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways: 
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined:
                    CLLocationManager.new().requestWhenInUseAuthorization();
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
    
    update() {
        this.ensureGeolocation();
        
        const time = JulianDate.now();
        const position = this.entity.position.getValue(time);
    
        if (application.ios) {
            
            const motion = getIosMotionManager().deviceMotion;

            if (motion && position) {
                const motionQuaternion = <Argon.Cesium.Quaternion>motion.attitude.quaternion;

                // Apple's orientation is reported in NWU, so convert to ENU
                const orientation = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);

                // Finally, convert from local ENU to ECEF (Earth-Centered-Earth-Fixed)
                const enu2ecef = Transforms.eastNorthUpToFixedFrame(position, undefined, scratchMatrix4);
                const enu2ecefRot = Matrix4.getRotation(enu2ecef, scratchMatrix3);
                const enu2ecefQuat = Quaternion.fromRotationMatrix(enu2ecefRot, scratchECEFQuaternion);
                Quaternion.multiply(enu2ecefQuat, orientation, orientation);

                const sampledOrientation = this.entity.orientation as Argon.Cesium.SampledProperty;
                sampledOrientation.addSample(time, orientation);
            }

        }

        const interfaceOrientation = getInterfaceOrientation();
        const interfaceOrientationRad = Argon.Cesium.CesiumMath.toRadians(interfaceOrientation);
        const interfaceOrientationProperty = this.interfaceEntity.orientation as Argon.Cesium.ConstantProperty;
        interfaceOrientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, interfaceOrientationRad));
    }
}


export function getInterfaceOrientation() : number {
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