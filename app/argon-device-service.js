"use strict";
var application = require("application");
var vuforia = require('nativescript-vuforia');
var utils = require('utils/utils');
var Argon = require("argon");
var JulianDate = Argon.Cesium.JulianDate;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var Transforms = Argon.Cesium.Transforms;
var Matrix4 = Argon.Cesium.Matrix4;
var Matrix3 = Argon.Cesium.Matrix3;
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
exports.systemBootDate = Argon.Cesium.JulianDate.now();
if (vuforia.api) {
    exports.systemBootDate = Argon.Cesium.JulianDate.fromDate(new Date(vuforia.api.getSystemBootTime() * 1000));
}
else if (application.ios) {
    var uptime = NSProcessInfo.processInfo().systemUptime;
    JulianDate.addSeconds(exports.systemBootDate, -uptime, exports.systemBootDate);
}
var scratchTime = new JulianDate(0, 0);
var scratchCartesian3 = new Cartesian3;
var scratchQuaternion = new Quaternion;
var scratchECEFQuaternion = new Quaternion;
var scratchMatrix4 = new Matrix4;
var scratchMatrix3 = new Matrix3;
// if we don't export these (or keep a reference to them somewhere),
// then ios will derefence them and cause a huge memory leak
var iosLocationManager;
var iosMotionManager;
function getIosLocationManager() {
    if (iosLocationManager)
        return iosLocationManager;
    console.log("Create ios location manager.");
    var locationAuthStatus = CLLocationManager.authorizationStatus();
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
    if (iosMotionManager)
        return iosMotionManager;
    console.log("Create ios motion manager.");
    iosMotionManager = CMMotionManager.alloc().init();
    iosMotionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
    var effectiveReferenceFrame;
    if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
    }
    else {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXArbitraryCorrectedZVertical;
    }
    iosMotionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
}
Argon.DeviceService.prototype.update = function () {
    var self = this;
    if (application.ios) {
        var motionManager = getIosMotionManager();
        var locationManager = getIosLocationManager();
        var motion = motionManager.deviceMotion;
        var location_1 = locationManager.location;
        var position = void 0;
        if (location_1) {
            var lat = location_1.coordinate.latitude;
            var lon = location_1.coordinate.longitude;
            var height = location_1.altitude;
            var locationDate = location_1.timestamp; // {N} is auto-marshalling from NSDate to Date here
            var locationTime = Argon.Cesium.JulianDate.fromDate(locationDate, scratchTime);
            var sampledPosition = self.entity.position;
            position = Argon.Cesium.Cartesian3.fromDegrees(lon, lat, height, undefined, scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
        }
        if (motion && position) {
            var motionQuaternion = motionManager.deviceMotion.attitude.quaternion;
            var motionTimestamp = motionManager.deviceMotion.timestamp; // this timestamp is in seconds, not an NSDate object
            var motionTime = JulianDate.addSeconds(exports.systemBootDate, motionTimestamp, scratchTime);
            // Apple's orientation is reported in NWU, so convert to ENU
            var orientation_1 = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);
            // Finally, convert from local ENU to ECEF (Earth-Centered-Earth-Fixed)
            var enu2ecef = Transforms.eastNorthUpToFixedFrame(position, undefined, scratchMatrix4);
            var enu2ecefRot = Matrix4.getRotation(enu2ecef, scratchMatrix3);
            var enu2ecefQuat = Quaternion.fromRotationMatrix(enu2ecefRot, scratchECEFQuaternion);
            Quaternion.multiply(enu2ecefQuat, orientation_1, orientation_1);
            var sampledOrientation = self.entity.orientation;
            sampledOrientation.addSample(motionTime, orientation_1);
        }
    }
    var interfaceOrientation = getInterfaceOrientation();
    var interfaceOrientationRad = Argon.Cesium.CesiumMath.toRadians(interfaceOrientation);
    var interfaceOrientationProperty = self.interfaceEntity.orientation;
    interfaceOrientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, interfaceOrientationRad));
};
function getInterfaceOrientation() {
    if (application.ios) {
        var orientation_2 = UIApplication.sharedApplication().statusBarOrientation;
        switch (orientation_2) {
            case UIInterfaceOrientation.UIInterfaceOrientationUnknown:
            case UIInterfaceOrientation.UIInterfaceOrientationPortrait: return 0;
            case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown: return 180;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft: return 90;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight: return -90;
        }
    }
    if (application.android) {
        var context = utils.ad.getApplicationContext();
        var display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        var rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return 90;
            case android.view.Surface.ROTATION_270: return -90;
        }
    }
    return 0;
}
exports.getInterfaceOrientation = getInterfaceOrientation;
//# sourceMappingURL=argon-device-service.js.map