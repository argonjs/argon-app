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
var NativescriptDeviceService = (function (_super) {
    __extends(NativescriptDeviceService, _super);
    function NativescriptDeviceService(context) {
        _super.call(this, context);
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
            var sampledPosition = _this.geolocationEntity.position;
            var position = Argon.Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude, location.altitude, Argon.Cesium.Ellipsoid.WGS84, scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
            var enuOrientation = Transforms.headingPitchRollQuaternion(position, 0, 0, 0, undefined, scratchECEFQuaternion);
            _this.geolocationEntity.orientation.setValue(enuOrientation);
        }, function (e) {
            console.log(e);
        }, {
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
                    this.locationManager = CLLocationManager.new();
                    this.locationManager.requestWhenInUseAuthorization();
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
    NativescriptDeviceService.prototype.ensureDeviceOrientation = function () {
        if (this.motionManager)
            return;
        var motionManager = CMMotionManager.alloc().init();
        motionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
        var effectiveReferenceFrame;
        if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
            effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
        }
        else {
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
    };
    NativescriptDeviceService.prototype.onIdle = function () {
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
        if (this.motionManager) {
            this.motionManager.stopDeviceMotionUpdates();
            this.motionManager = undefined;
        }
    };
    NativescriptDeviceService.prototype.onUpdate = function () {
        this.ensureGeolocation();
        this.ensureDeviceOrientation();
        var time = JulianDate.now();
        if (application.ios && this.motionManager) {
            var motion = this.motionManager.deviceMotion;
            if (motion) {
                var motionQuaternion = motion.attitude.quaternion;
                // Apple's orientation is reported in NWU, so we convert to ENU by applying a global rotation of
                // 90 degrees about +z to the NWU orientation (or applying the NWU quaternion as a local rotation 
                // to the starting orientation of 90 degress about +z). 
                // Note: With quaternion multiplication the `*` symbol can be read as 'rotates'. 
                // If the orientation (O) is on the right and the rotation (R) is on the left, 
                // such that the multiplication order is R*O, then R is a global rotation being applied on O. 
                // Likewise, the reverse, O*R, is a local rotation R applied to the orientation O. 
                var orientation_1 = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);
                var sampledOrientation = this.orientationEntity.orientation;
                sampledOrientation.addSample(time, orientation_1);
                if (!Argon.Cesium.defined(this.orientationEntity.position)) {
                    this.orientationEntity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.geolocationEntity);
                }
            }
        }
        var displayOrientation = getDisplayOrientation();
        var displayOrientationRad = Argon.Cesium.CesiumMath.toRadians(displayOrientation);
        var displayOrientationProperty = this.displayEntity.orientation;
        displayOrientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, displayOrientationRad, scratchQuaternion));
    };
    NativescriptDeviceService = __decorate([
        Argon.DI.inject(Argon.ContextService)
    ], NativescriptDeviceService);
    return NativescriptDeviceService;
}(Argon.DeviceService));
exports.NativescriptDeviceService = NativescriptDeviceService;
function getDisplayOrientation() {
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
exports.getDisplayOrientation = getDisplayOrientation;
//# sourceMappingURL=argon-device-service.js.map