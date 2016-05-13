"use strict";
var application = require("application");
var utils = require('utils/utils');
var geolocation = require('speigg-nativescript-geolocation');
var dialogs = require('ui/dialogs');
var Argon = require("argon");
var JulianDate = Argon.Cesium.JulianDate;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var Transforms = Argon.Cesium.Transforms;
var Matrix4 = Argon.Cesium.Matrix4;
var Matrix3 = Argon.Cesium.Matrix3;
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
var scratchTime = new JulianDate(0, 0);
var scratchCartesian3 = new Cartesian3;
var scratchQuaternion = new Quaternion;
var scratchECEFQuaternion = new Quaternion;
var scratchMatrix4 = new Matrix4;
var scratchMatrix3 = new Matrix3;
var iosMotionManager;
function getIosMotionManager() {
    if (iosMotionManager)
        return iosMotionManager;
    console.log("Creating ios motion manager.");
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
    return iosMotionManager;
}
exports.getIosMotionManager = getIosMotionManager;
var lastGPSPosition;
var NativescriptDeviceService = (function (_super) {
    __extends(NativescriptDeviceService, _super);
    function NativescriptDeviceService() {
        _super.call(this);
        this.entity.position = new Argon.Cesium.SampledPositionProperty(Argon.Cesium.ReferenceFrame.FIXED);
        this.entity.position.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.entity.position.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.entity.position.maxNumSamples = 10;
        this.entity.orientation = new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion);
        this.entity.orientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.entity.orientation.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        this.entity.orientation.maxNumSamples = 10;
    }
    NativescriptDeviceService.prototype.ensureGeolocation = function () {
        var _this = this;
        if (typeof this.locationWatchId !== 'undefined')
            return;
        // Note: the d.ts for nativescript-geolocation is wrong. This call is correct. 
        // Casting the module as <any> here for now to hide annoying typescript errors...
        this.locationWatchId = geolocation.watchLocation(function (location) {
            // Note: iOS documentation states that the altitude value refers to height (meters) above sea level, but 
            // if ios is reporting the standard gps defined altitude, then this theoretical "sea level" actually refers to 
            // the WGS84 ellipsoid rather than traditional mean sea level (MSL) which is not a simple surface and varies 
            // according to the local gravitational field. 
            // In other words, my best guess is that the altitude value here is *probably* GPS defined altitude, which 
            // is equivalent to the height above the WGS84 ellipsoid, which is exactly what Cesium expects...
            var locationTime = Argon.Cesium.JulianDate.fromDate(location.timestamp, scratchTime);
            var sampledPosition = _this.entity.position;
            var position = Argon.Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude, location.altitude, Argon.Cesium.Ellipsoid.WGS84, scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
            // make sure its actually working
            // var gpsPos = location.longitude + ' ' + location.latitude + ' ' + location.altitude;
            // if (lastGPSPosition !== gpsPos) console.log('gps position changed '+gpsPos);
            // lastGPSPosition = gpsPos;
        }, function (e) {
            console.log(e);
        }, {
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
                    CLLocationManager.new().requestWhenInUseAuthorization();
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusDenied:
                case CLAuthorizationStatus.kCLAuthorizationStatusRestricted:
                default:
                    dialogs.action({
                        title: "Location Services",
                        message: "In order to provide the best Augmented Reality experience, \n                            please open this app's settings and enable location services",
                        cancelButtonText: "Cancel",
                        actions: ['Settings']
                    }).then(function (action) {
                        if (action === 'Settings') {
                            var url = NSURL.URLWithString(UIApplicationOpenSettingsURLString);
                            UIApplication.sharedApplication().openURL(url);
                        }
                    });
            }
        }
    };
    NativescriptDeviceService.prototype.update = function () {
        this.ensureGeolocation();
        var time = JulianDate.now();
        var position = this.entity.position.getValue(time);
        if (application.ios) {
            var motion = getIosMotionManager().deviceMotion;
            if (motion && position) {
                var motionQuaternion = motion.attitude.quaternion;
                // Apple's orientation is reported in NWU, so we convert to ENU by applying a global rotation of
                // 90 degrees about +z to the NWU orientation (or applying the NWU quaternion as a local rotation 
                // to the starting orientation of 90 degress about +z). 
                // Note: With quaternion multiplication the `*` symbol can be read as 'rotates'. 
                // If the orientation (O) is on the right and the rotation (R) is on the left, 
                // such that the multiplication order is R*O, then R is a global rotation being applied on O. 
                // Likewise, the reverse, O*R, is a local rotation R applied to the orientation O. 
                var orientation_1 = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);
                // Finally, convert from local ENU to ECEF (Earth-Centered-Earth-Fixed)
                var enu2ecef = Transforms.eastNorthUpToFixedFrame(position, undefined, scratchMatrix4);
                var enu2ecefRot = Matrix4.getRotation(enu2ecef, scratchMatrix3);
                var enu2ecefQuat = Quaternion.fromRotationMatrix(enu2ecefRot, scratchECEFQuaternion);
                Quaternion.multiply(enu2ecefQuat, orientation_1, orientation_1);
                var sampledOrientation = this.entity.orientation;
                sampledOrientation.addSample(time, orientation_1);
            }
        }
        var interfaceOrientation = getInterfaceOrientation();
        var interfaceOrientationRad = Argon.Cesium.CesiumMath.toRadians(interfaceOrientation);
        var interfaceOrientationProperty = this.interfaceEntity.orientation;
        interfaceOrientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, interfaceOrientationRad));
    };
    return NativescriptDeviceService;
}(Argon.DeviceService));
exports.NativescriptDeviceService = NativescriptDeviceService;
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