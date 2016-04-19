import application = require("application");
import frames = require('ui/frame');
import vuforia = require('nativescript-vuforia');
import utils = require('utils/utils');

import Argon = require("argon");

const JulianDate = Argon.Cesium.JulianDate;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;
const Transforms = Argon.Cesium.Transforms;
const Matrix4    = Argon.Cesium.Matrix4;
const Matrix3    = Argon.Cesium.Matrix3;

const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);

export let systemBootDate = Argon.Cesium.JulianDate.now();

if (vuforia.api) {
    systemBootDate = Argon.Cesium.JulianDate.fromDate(new Date(vuforia.api.getSystemBootTime()*1000));
} else if (application.ios) { // less accurate way to determine bootdate
    const uptime = NSProcessInfo.processInfo().systemUptime;
    JulianDate.addSeconds(systemBootDate, -uptime, systemBootDate);   
}

const scratchTime = new JulianDate(0,0);
const scratchCartesian3 = new Cartesian3;
const scratchQuaternion = new Quaternion;
const scratchECEFQuaternion = new Quaternion;
const scratchMatrix4 = new Matrix4;
const scratchMatrix3 = new Matrix3;

// if we don't export these (or keep a reference to them somewhere),
// then ios will derefence them and cause a huge memory leak
let iosLocationManager:CLLocationManager;
let iosMotionManager:CMMotionManager;

function getIosLocationManager() {
    if (iosLocationManager) return iosLocationManager;

    console.log("Create ios location manager.")

    const locationAuthStatus = CLLocationManager.authorizationStatus();
    iosLocationManager = CLLocationManager.alloc().init();

    switch (locationAuthStatus) {
        case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined:
            iosLocationManager.requestWhenInUseAuthorization();
            break;
        case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways:
        case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse: break;
        default: // TODO: alert saying Argon needs location services, and instructing user to to enable them
    }

    iosLocationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation;
    iosLocationManager.distanceFilter = kCLDistanceFilterNone;
    iosLocationManager.startUpdatingLocation();
}

function getIosMotionManager() {
    if (iosMotionManager) return iosMotionManager;

    console.log("Create ios motion manager.")

    iosMotionManager = CMMotionManager.alloc().init();
    iosMotionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
    let effectiveReferenceFrame:CMAttitudeReferenceFrame;
    if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
    } else {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXArbitraryCorrectedZVertical;
    }
    iosMotionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
}

Argon.DeviceService.prototype.update = function() {
    const self = <Argon.DeviceService>this;
    
    if (application.ios) {

        const motionManager = getIosMotionManager();
        const locationManager = getIosLocationManager();

        const motion = motionManager.deviceMotion;
        const location = locationManager.location;

        let position:Argon.Cesium.Cartesian3;

        if (location) {
            const lat = location.coordinate.latitude;
            const lon = location.coordinate.longitude;
            const height = location.altitude;

            const locationDate = <Date><any>location.timestamp; // {N} is auto-marshalling from NSDate to Date here
            const locationTime = Argon.Cesium.JulianDate.fromDate(locationDate, scratchTime);

            const sampledPosition = self.entity.position as Argon.Cesium.SampledPositionProperty;
            position =  Argon.Cesium.Cartesian3.fromDegrees(lon, lat, height, undefined, scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
        }

        if (motion && position) {
            const motionQuaternion = <Argon.Cesium.Quaternion>motionManager.deviceMotion.attitude.quaternion;
            const motionTimestamp = motionManager.deviceMotion.timestamp; // this timestamp is in seconds, not an NSDate object

            const motionTime = JulianDate.addSeconds(systemBootDate, motionTimestamp, scratchTime);

            // Apple's orientation is reported in NWU, so convert to ENU
            const orientation = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);

            // Finally, convert from local ENU to ECEF (Earth-Centered-Earth-Fixed)
            const enu2ecef = Transforms.eastNorthUpToFixedFrame(position, undefined, scratchMatrix4);
            const enu2ecefRot = Matrix4.getRotation(enu2ecef, scratchMatrix3);
            const enu2ecefQuat = Quaternion.fromRotationMatrix(enu2ecefRot, scratchECEFQuaternion);
            Quaternion.multiply(enu2ecefQuat, orientation, orientation);

            const sampledOrientation = self.entity.orientation as Argon.Cesium.SampledProperty;
            sampledOrientation.addSample(motionTime, orientation);
        }

    }

    const interfaceOrientation = getInterfaceOrientation();
    const interfaceOrientationRad = Argon.Cesium.CesiumMath.toRadians(interfaceOrientation);
    const interfaceOrientationProperty = self.interfaceEntity.orientation as Argon.Cesium.ConstantProperty;
    interfaceOrientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, interfaceOrientationRad));
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