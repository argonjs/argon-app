"use strict";
var application = require("application");
var utils = require("utils/utils");
var geolocation = require("speigg-nativescript-geolocation");
var dialogs = require("ui/dialogs");
var enums = require("ui/enums");
var Argon = require("@argonjs/argon");
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
var scratchMotionQuaternion = new Quaternion;
var scratchMatrix4 = new Matrix4;
var scratchMatrix3 = new Matrix3;
var NativescriptDeviceService = (function (_super) {
    __extends(NativescriptDeviceService, _super);
    function NativescriptDeviceService(context) {
        var _this = _super.call(this, context) || this;
        _this.calibStartTime = JulianDate.now();
        _this.calibrating = false;
        _this.androidMotionInitialized = false;
        var geolocationPositionProperty = new Argon.Cesium.SampledPositionProperty(Argon.Cesium.ReferenceFrame.FIXED);
        _this.geolocationEntity.position = geolocationPositionProperty;
        geolocationPositionProperty.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        geolocationPositionProperty.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        geolocationPositionProperty.maxNumSamples = 10;
        _this.geolocationEntity.orientation = new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY);
        _this.orientationEntity.position = undefined;
        var orientationProperty = new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion);
        _this.orientationEntity.orientation = orientationProperty;
        orientationProperty.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        orientationProperty.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        orientationProperty.maxNumSamples = 10;
        return _this;
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
            desiredAccuracy: application.ios ? kCLLocationAccuracyBest : enums.Accuracy.high,
            updateDistance: application.ios ? kCLDistanceFilterNone : 0,
            minimumUpdateTime: 0
        });
        console.log("Creating location watcher. " + this.locationWatchId);
        if (application.ios) {
            switch (CLLocationManager.authorizationStatus()) {
                case 4 /* kCLAuthorizationStatusAuthorizedWhenInUse */:
                case 3 /* kCLAuthorizationStatusAuthorizedAlways */:
                    break;
                case 0 /* kCLAuthorizationStatusNotDetermined */:
                    this.locationManager = CLLocationManager.alloc().init();
                    this.locationManager.requestWhenInUseAuthorization();
                    break;
                case 2 /* kCLAuthorizationStatusDenied */:
                case 1 /* kCLAuthorizationStatusRestricted */:
                default:
                    dialogs.action({
                        title: "Location Services",
                        message: "In order to provide the best Augmented Reality experience, \n                            please open this app's settings and enable location services",
                        cancelButtonText: "Cancel",
                        actions: ['Settings']
                    }).then(function (action) {
                        if (action === 'Settings') {
                            var url = NSURL.URLWithString(UIApplicationOpenSettingsURLString);
                            utils.ios.getter(UIApplication, UIApplication.sharedApplication).openURL(url);
                        }
                    });
            }
        }
    };
    NativescriptDeviceService.prototype.ensureDeviceOrientation = function () {
        var _this = this;
        if (application.ios) {
            if (this.motionManager)
                return;
            var motionManager = CMMotionManager.alloc().init();
            motionManager.deviceMotionUpdateInterval = 1.0 / 100.0;
            if (!motionManager.deviceMotionAvailable || !motionManager.magnetometerAvailable) {
                console.log("NO Magnetometer and/or Gyro. ");
                alert("Need a device with gyroscope and magnetometer to get 3D device orientation");
            }
            else {
                var effectiveReferenceFrame = void 0;
                if (CMMotionManager.availableAttitudeReferenceFrames() & 8 /* XTrueNorthZVertical */) {
                    effectiveReferenceFrame = 8 /* XTrueNorthZVertical */;
                    // During testing of orientation problems, we tried 
                    // turning on each of the individual updateds
                    // to see if that helped.  It didn't, but here's the code:
                    // motionManager.startMagnetometerUpdates();
                    // motionManager.startGyroUpdates();
                    // motionManager.startAccelerometerUpdates();
                    motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
                }
                else {
                    alert("Need a device with magnetometer to get full 3D device orientation");
                    console.log("NO  CMAttitudeReferenceFrameXTrueNorthZVertical");
                }
            }
            this.motionManager = motionManager;
        }
        if (application.android && !this.androidMotionInitialized) {
            var sensorManager = application.android.foregroundActivity.getSystemService(android.content.Context.SENSOR_SERVICE);
            var rotationSensor = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ROTATION_VECTOR);
            sensorManager.registerListener(new android.hardware.SensorEventListener({
                onAccuracyChanged: function (sensor, accuracy) {
                    //console.log("onAccuracyChanged: " + accuracy);
                },
                onSensorChanged: function (event) {
                    var time = JulianDate.now();
                    Quaternion.unpack(event.values, 0, scratchMotionQuaternion);
                    var sampledOrientation = _this.orientationEntity.orientation;
                    sampledOrientation.addSample(time, scratchMotionQuaternion);
                    if (!Argon.Cesium.defined(_this.orientationEntity.position)) {
                        _this.orientationEntity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, _this.geolocationEntity);
                    }
                }
            }), rotationSensor, android.hardware.SensorManager.SENSOR_DELAY_GAME);
            this.androidMotionInitialized = true;
        }
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
        }
    };
    NativescriptDeviceService.prototype.onUpdate = function () {
        this.ensureGeolocation();
        this.ensureDeviceOrientation();
        var time = JulianDate.now();
        if (application.ios && this.motionManager) {
            var motion = this.motionManager.deviceMotion;
            if (motion) {
                // We want to have the user calibrate the magnetic field
                // if there are problems.  But iOS10 seems to have a problem 
                // where doing the calibration messes up CMMotion.  So, we've 
                // commented this out for now, but should turn it back on eventually
                switch (motion.magneticField.accuracy) {
                    case -1 /* Uncalibrated */:
                    case 0 /* Low */:
                        if (!this.calibrating) {
                            // let's only start calibration if it's been a while since we stopped
                            if (JulianDate.secondsDifference(time, this.calibStartTime) > 5) {
                            }
                        }
                        break;
                    case 1 /* Medium */:
                    case 2 /* High */:
                        if (this.calibrating) {
                            // let's only stop calibration if it's been a little bit since we stopped
                            if (JulianDate.secondsDifference(time, this.calibStartTime) > 2) {
                            }
                        }
                        break;
                }
                if (this.motionManager.showsDeviceMovementDisplay) {
                    return;
                }
                var motionQuaternion = motion.attitude.quaternion;
                // Apple's orientation is reported in NWU, so we convert to ENU by applying a global rotation of
                // 90 degrees about +z to the NWU orientation (or applying the NWU quaternion as a local rotation 
                // to the starting orientation of 90 degress about +z). 
                // Note: With quaternion multiplication the `*` symbol can be read as 'rotates'. 
                // If the orientation (O) is on the right and the rotation (R) is on the left, 
                // such that the multiplication order is R*O, then R is a global rotation being applied on O. 
                // Likewise, the reverse, O*R, is a local rotation R applied to the orientation O. 
                var orientation = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);
                var sampledOrientation = this.orientationEntity.orientation;
                sampledOrientation.addSample(time, orientation);
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
    return NativescriptDeviceService;
}(Argon.DeviceService));
NativescriptDeviceService = __decorate([
    Argon.DI.inject(Argon.ContextService)
], NativescriptDeviceService);
exports.NativescriptDeviceService = NativescriptDeviceService;
var cachedOrientation = 0;
function updateDisplayOrientation() {
    cachedOrientation = queryDisplayOrientation();
}
exports.updateDisplayOrientation = updateDisplayOrientation;
function queryDisplayOrientation() {
    if (application.ios) {
        var orientation = utils.ios.getter(UIApplication, UIApplication.sharedApplication).statusBarOrientation;
        switch (orientation) {
            case 0 /* Unknown */:
            case 1 /* Portrait */: return 0;
            case 2 /* PortraitUpsideDown */: return 180;
            case 4 /* LandscapeLeft */: return 90;
            case 3 /* LandscapeRight */: return -90;
        }
    }
    if (application.android) {
        var context = utils.ad.getApplicationContext();
        var display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        var rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return -90;
            case android.view.Surface.ROTATION_270: return 90;
        }
    }
    return 0;
}
exports.queryDisplayOrientation = queryDisplayOrientation;
function getDisplayOrientation() {
    return cachedOrientation;
}
exports.getDisplayOrientation = getDisplayOrientation;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcmdvbi1kZXZpY2Utc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyxzQ0FBd0M7QUFFeEMsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFDeEMsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUVoRixJQUFNLFdBQVcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEMsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLFVBQVUsQ0FBQztBQUN6QyxJQUFNLGlCQUFpQixHQUFHLElBQUksVUFBVSxDQUFDO0FBQ3pDLElBQU0scUJBQXFCLEdBQUcsSUFBSSxVQUFVLENBQUM7QUFDN0MsSUFBTSx1QkFBdUIsR0FBRyxJQUFJLFVBQVUsQ0FBQztBQUMvQyxJQUFNLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQztBQUNuQyxJ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QUFDO1lBQzNELEtBQUsscUJBQW9DLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxLQUFLLHNCQUFxQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMzRCxDQUFDO0lBQ0wsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLElBQU0sT0FBTyxHQUEyQixLQUFLLENBQUMsRUFBRSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDekUsSUFBTSxPQUFPLEdBQXdCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzFILElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN2QyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2YsS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMvQyxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ25ELEtBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ3RELENBQUM7SUFDTCxDQUFDO0lBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUM7QUF2QkQsMERBdUJDO0FBRUQ7SUFDSSxNQUFNLENBQUMsaUJBQWlCLENBQUM7QUFDN0IsQ0FBQztBQUZELHNEQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSBcImFwcGxpY2F0aW9uXCI7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBnZW9sb2NhdGlvbiBmcm9tICdzcGVpZ2ctbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBlbnVtcyBmcm9tICd1aS9lbnVtcyc7XG5cbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gXCJAYXJnb25qcy9hcmdvblwiO1xuXG5jb25zdCBKdWxpYW5EYXRlID0gQXJnb24uQ2VzaXVtLkp1bGlhbkRhdGU7XG5jb25zdCBDYXJ0ZXNpYW4zID0gQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG5jb25zdCBRdWF0ZXJuaW9uID0gQXJnb24uQ2VzaXVtLlF1YXRlcm5pb247XG5jb25zdCBDZXNpdW1NYXRoID0gQXJnb24uQ2VzaXVtLkNlc2l1bU1hdGg7XG5jb25zdCBUcmFuc2Zvcm1zID0gQXJnb24uQ2VzaXVtLlRyYW5zZm9ybXM7XG5jb25zdCBNYXRyaXg0ICAgID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG5jb25zdCBNYXRyaXgzICAgID0gQXJnb24uQ2VzaXVtLk1hdHJpeDM7XG5cbmNvbnN0IHo5MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyk7XG5cbmNvbnN0IHNjcmF0Y2hUaW1lID0gbmV3IEp1bGlhbkRhdGUoMCwwKTtcbmNvbnN0IHNjcmF0Y2hDYXJ0ZXNpYW4zID0gbmV3IENhcnRlc2lhbjM7XG5jb25zdCBzY3JhdGNoUXVhdGVybmlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuY29uc3Qgc2NyYXRjaEVDRUZRdWF0ZXJuaW9uID0gbmV3IFF1YXRlcm5pb247XG5jb25zdCBzY3JhdGNoTW90aW9uUXVhdGVybmlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuY29uc3Qgc2NyYXRjaE1hdHJpeDQgPSBuZXcgTWF0cml4NDtcbmNvbnN0IHNjcmF0Y2hNYXRyaXgzID0gbmV3IE1hdHJpeDM7XG5cbkBBcmdvbi5ESS5pbmplY3QoQXJnb24uQ29udGV4dFNlcnZpY2UpXG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSBleHRlbmRzIEFyZ29uLkRldmljZVNlcnZpY2Uge1xuICAgIFxuICAgIHByaXZhdGUgbG9jYXRpb25XYXRjaElkPzpudW1iZXI7XG4gICAgcHJpdmF0ZSBsb2NhdGlvbk1hbmFnZXI/OkNMTG9jYXRpb25NYW5hZ2VyO1xuICAgIHByaXZhdGUgbW90aW9uTWFuYWdlcj86Q01Nb3Rpb25NYW5hZ2VyO1xuICAgIHByaXZhdGUgY2FsaWJTdGFydFRpbWU6IEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlO1xuICAgIHByaXZhdGUgY2FsaWJyYXRpbmc6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBhbmRyb2lkTW90aW9uSW5pdGlhbGl6ZWQ6IGJvb2xlYW47XG5cbiAgICBjb25zdHJ1Y3Rvcihjb250ZXh0OkFyZ29uLkNvbnRleHRTZXJ2aWNlKSB7XG4gICAgICAgIHN1cGVyKGNvbnRleHQpO1xuXG4gICAgICAgIHRoaXMuY2FsaWJTdGFydFRpbWUgPSBKdWxpYW5EYXRlLm5vdygpO1xuICAgICAgICB0aGlzLmNhbGlicmF0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5hbmRyb2lkTW90aW9uSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAgICAgICBjb25zdCBnZW9sb2NhdGlvblBvc2l0aW9uUHJvcGVydHkgPSBuZXcgQXJnb24uQ2VzaXVtLlNhbXBsZWRQb3NpdGlvblByb3BlcnR5KEFyZ29uLkNlc2l1bS5SZWZlcmVuY2VGcmFtZS5GSVhFRCk7XG4gICAgICAgIHRoaXMuZ2VvbG9jYXRpb25FbnRpdHkucG9zaXRpb24gPSBnZW9sb2NhdGlvblBvc2l0aW9uUHJvcGVydHk7XG4gICAgICAgIGdlb2xvY2F0aW9uUG9zaXRpb25Qcm9wZXJ0eS5mb3J3YXJkRXh0cmFwb2xhdGlvblR5cGUgPSBBcmdvbi5DZXNpdW0uRXh0cmFwb2xhdGlvblR5cGUuSE9MRDtcbiAgICAgICAgZ2VvbG9jYXRpb25Qb3NpdGlvblByb3BlcnR5LmJhY2t3YXJkRXh0cmFwb2xhdGlvblR5cGUgPSBBcmdvbi5DZXNpdW0uRXh0cmFwb2xhdGlvblR5cGUuSE9MRDtcbiAgICAgICAgZ2VvbG9jYXRpb25Qb3NpdGlvblByb3BlcnR5Lm1heE51bVNhbXBsZXMgPSAxMDtcbiAgICAgICAgdGhpcy5nZW9sb2NhdGlvbkVudGl0eS5vcmllbnRhdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eShRdWF0ZXJuaW9uLklERU5USVRZKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMub3JpZW50YXRpb25FbnRpdHkucG9zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG9yaWVudGF0aW9uUHJvcGVydHkgPSBuZXcgQXJnb24uQ2VzaXVtLlNhbXBsZWRQcm9wZXJ0eShBcmdvbi5DZXNpdW0uUXVhdGVybmlvbik7XG4gICAgICAgIHRoaXMub3JpZW50YXRpb25FbnRpdHkub3JpZW50YXRpb24gPSBvcmllbnRhdGlvblByb3BlcnR5O1xuICAgICAgICBvcmllbnRhdGlvblByb3BlcnR5LmZvcndhcmRFeHRyYXBvbGF0aW9uVHlwZSA9IEFyZ29uLkNlc2l1bS5FeHRyYXBvbGF0aW9uVHlwZS5IT0xEO1xuICAgICAgICBvcmllbnRhdGlvblByb3BlcnR5LmJhY2t3YXJkRXh0cmFwb2xhdGlvblR5cGUgPSBBcmdvbi5DZXNpdW0uRXh0cmFwb2xhdGlvblR5cGUuSE9MRDtcbiAgICAgICAgb3JpZW50YXRpb25Qcm9wZXJ0eS5tYXhOdW1TYW1wbGVzID0gMTA7XG4gICAgfVxuICAgIFxuICAgIGVuc3VyZUdlb2xvY2F0aW9uKCkge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMubG9jYXRpb25XYXRjaElkICE9PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogdGhlIGQudHMgZm9yIG5hdGl2ZXNjcmlwdC1nZW9sb2NhdGlvbiBpcyB3cm9uZy4gVGhpcyBjYWxsIGlzIGNvcnJlY3QuIFxuICAgICAgICAvLyBDYXN0aW5nIHRoZSBtb2R1bGUgYXMgPGFueT4gaGVyZSBmb3Igbm93IHRvIGhpZGUgYW5ub3lpbmcgdHlwZXNjcmlwdCBlcnJvcnMuLi5cbiAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSAoPGFueT5nZW9sb2NhdGlvbikud2F0Y2hMb2NhdGlvbigobG9jYXRpb246Z2VvbG9jYXRpb24uTG9jYXRpb24pPT57XG4gICAgICAgICAgICAvLyBOb3RlOiBpT1MgZG9jdW1lbnRhdGlvbiBzdGF0ZXMgdGhhdCB0aGUgYWx0aXR1ZGUgdmFsdWUgcmVmZXJzIHRvIGhlaWdodCAobWV0ZXJzKSBhYm92ZSBzZWEgbGV2ZWwsIGJ1dCBcbiAgICAgICAgICAgIC8vIGlmIGlvcyBpcyByZXBvcnRpbmcgdGhlIHN0YW5kYXJkIGdwcyBkZWZpbmVkIGFsdGl0dWRlLCB0aGVuIHRoaXMgdGhlb3JldGljYWwgXCJzZWEgbGV2ZWxcIiBhY3R1YWxseSByZWZlcnMgdG8gXG4gICAgICAgICAgICAvLyB0aGUgV0dTODQgZWxsaXBzb2lkIHJhdGhlciB0aGFuIHRyYWRpdGlvbmFsIG1lYW4gc2VhIGxldmVsIChNU0wpIHdoaWNoIGlzIG5vdCBhIHNpbXBsZSBzdXJmYWNlIGFuZCB2YXJpZXMgXG4gICAgICAgICAgICAvLyBhY2NvcmRpbmcgdG8gdGhlIGxvY2FsIGdyYXZpdGF0aW9uYWwgZmllbGQuIFxuICAgICAgICAgICAgLy8gSW4gb3RoZXIgd29yZHMsIG15IGJlc3QgZ3Vlc3MgaXMgdGhhdCB0aGUgYWx0aXR1ZGUgdmFsdWUgaGVyZSBpcyAqcHJvYmFibHkqIEdQUyBkZWZpbmVkIGFsdGl0dWRlLCB3aGljaCBcbiAgICAgICAgICAgIC8vIGlzIGVxdWl2YWxlbnQgdG8gdGhlIGhlaWdodCBhYm92ZSB0aGUgV0dTODQgZWxsaXBzb2lkLCB3aGljaCBpcyBleGFjdGx5IHdoYXQgQ2VzaXVtIGV4cGVjdHMuLi5cbiAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uVGltZSA9IEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlLmZyb21EYXRlKGxvY2F0aW9uLnRpbWVzdGFtcCwgc2NyYXRjaFRpbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FtcGxlZFBvc2l0aW9uID0gdGhpcy5nZW9sb2NhdGlvbkVudGl0eS5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHk7XG4gICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9ICBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMy5mcm9tRGVncmVlcyhcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubG9uZ2l0dWRlLFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sYXRpdHVkZSxcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uYWx0aXR1ZGUsXG4gICAgICAgICAgICAgICAgICAgIEFyZ29uLkNlc2l1bS5FbGxpcHNvaWQuV0dTODQsXG4gICAgICAgICAgICAgICAgICAgIHNjcmF0Y2hDYXJ0ZXNpYW4zKTtcbiAgICAgICAgICAgIHNhbXBsZWRQb3NpdGlvbi5hZGRTYW1wbGUobG9jYXRpb25UaW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGVudU9yaWVudGF0aW9uID0gVHJhbnNmb3Jtcy5oZWFkaW5nUGl0Y2hSb2xsUXVhdGVybmlvbihwb3NpdGlvbiwgMCwgMCwgMCwgdW5kZWZpbmVkLCBzY3JhdGNoRUNFRlF1YXRlcm5pb24pO1xuICAgICAgICAgICAgKHRoaXMuZ2VvbG9jYXRpb25FbnRpdHkub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKGVudU9yaWVudGF0aW9uKTtcbiAgICAgICAgfSwgXG4gICAgICAgIChlKT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgIH0sIDxnZW9sb2NhdGlvbi5PcHRpb25zPntcbiAgICAgICAgICAgIGRlc2lyZWRBY2N1cmFjeTogYXBwbGljYXRpb24uaW9zID8ga0NMTG9jYXRpb25BY2N1cmFjeUJlc3QgOiBlbnVtcy5BY2N1cmFjeS5oaWdoLFxuICAgICAgICAgICAgdXBkYXRlRGlzdGFuY2U6IGFwcGxpY2F0aW9uLmlvcyA/IGtDTERpc3RhbmNlRmlsdGVyTm9uZSA6IDAsXG4gICAgICAgICAgICBtaW5pbXVtVXBkYXRlVGltZSA6IDBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIGxvY2F0aW9uIHdhdGNoZXIuIFwiICsgdGhpcy5sb2NhdGlvbldhdGNoSWQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uLmlvcykge1xuXG4gICAgICAgICAgICBzd2l0Y2ggKENMTG9jYXRpb25NYW5hZ2VyLmF1dGhvcml6YXRpb25TdGF0dXMoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkV2hlbkluVXNlOlxuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkQWx3YXlzOiBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c05vdERldGVybWluZWQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9jYXRpb25NYW5hZ2VyID0gQ0xMb2NhdGlvbk1hbmFnZXIuYWxsb2MoKS5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9jYXRpb25NYW5hZ2VyLnJlcXVlc3RXaGVuSW5Vc2VBdXRob3JpemF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNEZW5pZWQ6XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c1Jlc3RyaWN0ZWQ6XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiTG9jYXRpb24gU2VydmljZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBJbiBvcmRlciB0byBwcm92aWRlIHRoZSBiZXN0IEF1Z21lbnRlZCBSZWFsaXR5IGV4cGVyaWVuY2UsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsZWFzZSBvcGVuIHRoaXMgYXBwJ3Mgc2V0dGluZ3MgYW5kIGVuYWJsZSBsb2NhdGlvbiBzZXJ2aWNlc2AsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkNhbmNlbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydTZXR0aW5ncyddXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oKGFjdGlvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdTZXR0aW5ncycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBOU1VSTC5VUkxXaXRoU3RyaW5nKFVJQXBwbGljYXRpb25PcGVuU2V0dGluZ3NVUkxTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikub3BlblVSTCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRHVyaW5nIHRlc3Rpbmcgb2Ygb3JpZW50YXRpb24gcHJvYmxlbXMsIHdlIHRyaWVkIFxuICAgICAgICAgICAgLy8gdHVybmluZyBvbiB0aGUgaGVhZGluZyBmZWF0dXJlIG9mIHRoZSBsb2NhdGlvbiBtYW5hZ2VyXG4gICAgICAgICAgICAvLyB0byBzZWUgaWYgdGhhdCBoZWxwZWQuICBJdCBkaWRuJ3QsIGJ1dCBoZXJlJ3MgdGhlIGNvZGU6XG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gaWYgKENMTG9jYXRpb25NYW5hZ2VyLmhlYWRpbmdBdmFpbGFibGUoKSkge1xuICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiUGhldywgaGVhZGluZyBhdmFpbGFibGUuIFwiICk7XG4gICAgICAgICAgICAvLyAgICAgdGhpcy5sb2NhdGlvbk1hbmFnZXIuaGVhZGluZ0ZpbHRlciA9IDEuMDtcbiAgICAgICAgICAgIC8vICAgICB0aGlzLmxvY2F0aW9uTWFuYWdlci5zdGFydFVwZGF0aW5nSGVhZGluZygpO1xuICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcIkhFQURJTkcgTk9UIEFWQUlMQUJMRS4gXCIgKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBlbnN1cmVEZXZpY2VPcmllbnRhdGlvbigpIHtcbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICAgICAgaWYgKHRoaXMubW90aW9uTWFuYWdlcikgcmV0dXJuO1xuXG4gICAgICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gQ01Nb3Rpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuICAgICAgICAgICAgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25VcGRhdGVJbnRlcnZhbCA9IDEuMCAvIDEwMC4wO1xuICAgICAgICAgICAgaWYgKCFtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvbkF2YWlsYWJsZSB8fCAhbW90aW9uTWFuYWdlci5tYWduZXRvbWV0ZXJBdmFpbGFibGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5PIE1hZ25ldG9tZXRlciBhbmQvb3IgR3lyby4gXCIgKTtcbiAgICAgICAgICAgICAgICBhbGVydChcIk5lZWQgYSBkZXZpY2Ugd2l0aCBneXJvc2NvcGUgYW5kIG1hZ25ldG9tZXRlciB0byBnZXQgM0QgZGV2aWNlIG9yaWVudGF0aW9uXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWU6Q01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lO1xuICAgICAgICAgICAgICAgIGlmIChDTU1vdGlvbk1hbmFnZXIuYXZhaWxhYmxlQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZXMoKSAmIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsKSB7XG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lID0gQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWw7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRHVyaW5nIHRlc3Rpbmcgb2Ygb3JpZW50YXRpb24gcHJvYmxlbXMsIHdlIHRyaWVkIFxuICAgICAgICAgICAgICAgICAgICAvLyB0dXJuaW5nIG9uIGVhY2ggb2YgdGhlIGluZGl2aWR1YWwgdXBkYXRlZHNcbiAgICAgICAgICAgICAgICAgICAgLy8gdG8gc2VlIGlmIHRoYXQgaGVscGVkLiAgSXQgZGlkbid0LCBidXQgaGVyZSdzIHRoZSBjb2RlOlxuICAgICAgICAgICAgICAgICAgICAvLyBtb3Rpb25NYW5hZ2VyLnN0YXJ0TWFnbmV0b21ldGVyVXBkYXRlcygpO1xuICAgICAgICAgICAgICAgICAgICAvLyBtb3Rpb25NYW5hZ2VyLnN0YXJ0R3lyb1VwZGF0ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW90aW9uTWFuYWdlci5zdGFydEFjY2VsZXJvbWV0ZXJVcGRhdGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBtb3Rpb25NYW5hZ2VyLnN0YXJ0RGV2aWNlTW90aW9uVXBkYXRlc1VzaW5nUmVmZXJlbmNlRnJhbWUoZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiTmVlZCBhIGRldmljZSB3aXRoIG1hZ25ldG9tZXRlciB0byBnZXQgZnVsbCAzRCBkZXZpY2Ugb3JpZW50YXRpb25cIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTk8gIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZVhUcnVlTm9ydGhaVmVydGljYWxcIiApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubW90aW9uTWFuYWdlciA9IG1vdGlvbk1hbmFnZXI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXBwbGljYXRpb24uYW5kcm9pZCAmJiAhdGhpcy5hbmRyb2lkTW90aW9uSW5pdGlhbGl6ZWQpIHtcblxuICAgICAgICAgICAgdmFyIHNlbnNvck1hbmFnZXIgPSBhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eS5nZXRTeXN0ZW1TZXJ2aWNlKGFuZHJvaWQuY29udGVudC5Db250ZXh0LlNFTlNPUl9TRVJWSUNFKTtcbiAgICAgICAgICAgIHZhciByb3RhdGlvblNlbnNvciA9IHNlbnNvck1hbmFnZXIuZ2V0RGVmYXVsdFNlbnNvcihhbmRyb2lkLmhhcmR3YXJlLlNlbnNvci5UWVBFX1JPVEFUSU9OX1ZFQ1RPUik7XG5cbiAgICAgICAgICAgIHNlbnNvck1hbmFnZXIucmVnaXN0ZXJMaXN0ZW5lcihuZXcgYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyKHtcbiAgICAgICAgICAgICAgICBvbkFjY3VyYWN5Q2hhbmdlZDogKHNlbnNvciwgYWNjdXJhY3kpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIm9uQWNjdXJhY3lDaGFuZ2VkOiBcIiArIGFjY3VyYWN5KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uU2Vuc29yQ2hhbmdlZDogKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWUgPSBKdWxpYW5EYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLnVucGFjayg8bnVtYmVyW10+ZXZlbnQudmFsdWVzLCAwLCBzY3JhdGNoTW90aW9uUXVhdGVybmlvbik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhbXBsZWRPcmllbnRhdGlvbiA9IHRoaXMub3JpZW50YXRpb25FbnRpdHkub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLlNhbXBsZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlZE9yaWVudGF0aW9uLmFkZFNhbXBsZSh0aW1lLCBzY3JhdGNoTW90aW9uUXVhdGVybmlvbik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghQXJnb24uQ2VzaXVtLmRlZmluZWQodGhpcy5vcmllbnRhdGlvbkVudGl0eS5wb3NpdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZW50YXRpb25FbnRpdHkucG9zaXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eShDYXJ0ZXNpYW4zLlpFUk8sIHRoaXMuZ2VvbG9jYXRpb25FbnRpdHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksIHJvdGF0aW9uU2Vuc29yLCBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvck1hbmFnZXIuU0VOU09SX0RFTEFZX0dBTUUpO1xuXG4gICAgICAgICAgICB0aGlzLmFuZHJvaWRNb3Rpb25Jbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGRldmljZSBlbnRpdHkgaGFzIGEgZGVmaW5lZCBwb3NlIHJlbGF0aXZlIHRvIHRoZSBkZXZpY2Ugb3JpZW50YXRpb24gZW50aXR5XG4gICAgICAgIGlmICh0aGlzLmVudGl0eS5wb3NpdGlvbiBpbnN0YW5jZW9mIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkgPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuZW50aXR5LnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoQ2FydGVzaWFuMy5aRVJPLCB0aGlzLm9yaWVudGF0aW9uRW50aXR5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5lbnRpdHkub3JpZW50YXRpb24gaW5zdGFuY2VvZiBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSA9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5lbnRpdHkub3JpZW50YXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkoUXVhdGVybmlvbi5JREVOVElUWSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgb25JZGxlKCkge1xuICAgICAgICBpZiAoQXJnb24uQ2VzaXVtLmRlZmluZWQodGhpcy5sb2NhdGlvbldhdGNoSWQpKSB7XG4gICAgICAgICAgICBnZW9sb2NhdGlvbi5jbGVhcldhdGNoKHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm1vdGlvbk1hbmFnZXIpIHtcbiAgICAgICAgICAgIC8vIEJVRzogIGlPUyAxMCBzZWVtcyB0byBoYXZlIGlzc3VlcyBpZiB5b3UgdHVybiBvZmYgYW5kIHRoZW5cbiAgICAgICAgICAgIC8vIHR1cm4gYmFjayBvbiBDTU1vdGlvbi4gIFNvLCB3ZSdyZSBub3QgdHVybmluZyBpdCBvZmYgaGVyZS5cbiAgICAgICAgICAgIC8vIEJ1dCB3ZSBwcm9iYWJseSBzaG91bGQsIHdoZW4gdGhlIGJ1ZyBpcyBmaXhlZC5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyB0aGlzLm1vdGlvbk1hbmFnZXIuc3RvcERldmljZU1vdGlvblVwZGF0ZXMoKTtcbiAgICAgICAgICAgIC8vIHRoaXMubW90aW9uTWFuYWdlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBvblVwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVHZW9sb2NhdGlvbigpO1xuICAgICAgICB0aGlzLmVuc3VyZURldmljZU9yaWVudGF0aW9uKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aW1lID0gSnVsaWFuRGF0ZS5ub3coKTtcbiAgICBcbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uLmlvcyAmJiB0aGlzLm1vdGlvbk1hbmFnZXIpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbW90aW9uID0gdGhpcy5tb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvbjtcblxuICAgICAgICAgICAgaWYgKG1vdGlvbikgeyAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgIC8vIFdlIHdhbnQgdG8gaGF2ZSB0aGUgdXNlciBjYWxpYnJhdGUgdGhlIG1hZ25ldGljIGZpZWxkXG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgYXJlIHByb2JsZW1zLiAgQnV0IGlPUzEwIHNlZW1zIHRvIGhhdmUgYSBwcm9ibGVtIFxuICAgICAgICAgICAgICAgIC8vIHdoZXJlIGRvaW5nIHRoZSBjYWxpYnJhdGlvbiBtZXNzZXMgdXAgQ01Nb3Rpb24uICBTbywgd2UndmUgXG4gICAgICAgICAgICAgICAgLy8gY29tbWVudGVkIHRoaXMgb3V0IGZvciBub3csIGJ1dCBzaG91bGQgdHVybiBpdCBiYWNrIG9uIGV2ZW50dWFsbHlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vdGlvbi5tYWduZXRpY0ZpZWxkLmFjY3VyYWN5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ01NYWduZXRpY0ZpZWxkQ2FsaWJyYXRpb25BY2N1cmFjeS5VbmNhbGlicmF0ZWQ6XG5cdCAgICAgICAgICAgICAgICBjYXNlIENNTWFnbmV0aWNGaWVsZENhbGlicmF0aW9uQWNjdXJhY3kuTG93OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNhbGlicmF0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0J3Mgb25seSBzdGFydCBjYWxpYnJhdGlvbiBpZiBpdCdzIGJlZW4gYSB3aGlsZSBzaW5jZSB3ZSBzdG9wcGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEp1bGlhbkRhdGUuc2Vjb25kc0RpZmZlcmVuY2UodGltZSwgdGhpcy5jYWxpYlN0YXJ0VGltZSkgPiA1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic3RhcnRpbmcgY2FsaWIgYWZ0ZXIgXCIgKyAgSnVsaWFuRGF0ZS5zZWNvbmRzRGlmZmVyZW5jZSh0aW1lLCB0aGlzLmNhbGliU3RhcnRUaW1lKSArIFwiIHNlY29uZHNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuY2FsaWJTdGFydFRpbWUgPSB0aW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLmNhbGlicmF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5tb3Rpb25NYW5hZ2VyLnNob3dzRGV2aWNlTW92ZW1lbnREaXNwbGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgXHQgICAgY2FzZSBDTU1hZ25ldGljRmllbGRDYWxpYnJhdGlvbkFjY3VyYWN5Lk1lZGl1bTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDTU1hZ25ldGljRmllbGRDYWxpYnJhdGlvbkFjY3VyYWN5LkhpZ2g6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jYWxpYnJhdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCdzIG9ubHkgc3RvcCBjYWxpYnJhdGlvbiBpZiBpdCdzIGJlZW4gYSBsaXR0bGUgYml0IHNpbmNlIHdlIHN0b3BwZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSnVsaWFuRGF0ZS5zZWNvbmRzRGlmZmVyZW5jZSh0aW1lLCB0aGlzLmNhbGliU3RhcnRUaW1lKSA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzdG9wcGluZyBjYWxpYiBhZnRlciBcIiArICBKdWxpYW5EYXRlLnNlY29uZHNEaWZmZXJlbmNlKHRpbWUsIHRoaXMuY2FsaWJTdGFydFRpbWUpICsgXCIgc2Vjb25kc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5jYWxpYlN0YXJ0VGltZSA9IHRpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuY2FsaWJyYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5tb3Rpb25NYW5hZ2VyLnNob3dzRGV2aWNlTW92ZW1lbnREaXNwbGF5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW90aW9uTWFuYWdlci5zaG93c0RldmljZU1vdmVtZW50RGlzcGxheSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IG1vdGlvblF1YXRlcm5pb24gPSA8QXJnb24uQ2VzaXVtLlF1YXRlcm5pb24+bW90aW9uLmF0dGl0dWRlLnF1YXRlcm5pb247XG5cbiAgICAgICAgICAgICAgICAvLyBBcHBsZSdzIG9yaWVudGF0aW9uIGlzIHJlcG9ydGVkIGluIE5XVSwgc28gd2UgY29udmVydCB0byBFTlUgYnkgYXBwbHlpbmcgYSBnbG9iYWwgcm90YXRpb24gb2ZcbiAgICAgICAgICAgICAgICAvLyA5MCBkZWdyZWVzIGFib3V0ICt6IHRvIHRoZSBOV1Ugb3JpZW50YXRpb24gKG9yIGFwcGx5aW5nIHRoZSBOV1UgcXVhdGVybmlvbiBhcyBhIGxvY2FsIHJvdGF0aW9uIFxuICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBzdGFydGluZyBvcmllbnRhdGlvbiBvZiA5MCBkZWdyZXNzIGFib3V0ICt6KS4gXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogV2l0aCBxdWF0ZXJuaW9uIG11bHRpcGxpY2F0aW9uIHRoZSBgKmAgc3ltYm9sIGNhbiBiZSByZWFkIGFzICdyb3RhdGVzJy4gXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9yaWVudGF0aW9uIChPKSBpcyBvbiB0aGUgcmlnaHQgYW5kIHRoZSByb3RhdGlvbiAoUikgaXMgb24gdGhlIGxlZnQsIFxuICAgICAgICAgICAgICAgIC8vIHN1Y2ggdGhhdCB0aGUgbXVsdGlwbGljYXRpb24gb3JkZXIgaXMgUipPLCB0aGVuIFIgaXMgYSBnbG9iYWwgcm90YXRpb24gYmVpbmcgYXBwbGllZCBvbiBPLiBcbiAgICAgICAgICAgICAgICAvLyBMaWtld2lzZSwgdGhlIHJldmVyc2UsIE8qUiwgaXMgYSBsb2NhbCByb3RhdGlvbiBSIGFwcGxpZWQgdG8gdGhlIG9yaWVudGF0aW9uIE8uIFxuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gUXVhdGVybmlvbi5tdWx0aXBseSh6OTAsIG1vdGlvblF1YXRlcm5pb24sIHNjcmF0Y2hRdWF0ZXJuaW9uKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzYW1wbGVkT3JpZW50YXRpb24gPSB0aGlzLm9yaWVudGF0aW9uRW50aXR5Lm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgc2FtcGxlZE9yaWVudGF0aW9uLmFkZFNhbXBsZSh0aW1lLCBvcmllbnRhdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKCFBcmdvbi5DZXNpdW0uZGVmaW5lZCh0aGlzLm9yaWVudGF0aW9uRW50aXR5LnBvc2l0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uRW50aXR5LnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoQ2FydGVzaWFuMy5aRVJPLCB0aGlzLmdlb2xvY2F0aW9uRW50aXR5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkaXNwbGF5T3JpZW50YXRpb24gPSBnZXREaXNwbGF5T3JpZW50YXRpb24oKTtcbiAgICAgICAgY29uc3QgZGlzcGxheU9yaWVudGF0aW9uUmFkID0gQXJnb24uQ2VzaXVtLkNlc2l1bU1hdGgudG9SYWRpYW5zKGRpc3BsYXlPcmllbnRhdGlvbik7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlPcmllbnRhdGlvblByb3BlcnR5ID0gdGhpcy5kaXNwbGF5RW50aXR5Lm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5O1xuICAgICAgICBkaXNwbGF5T3JpZW50YXRpb25Qcm9wZXJ0eS5zZXRWYWx1ZShRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIGRpc3BsYXlPcmllbnRhdGlvblJhZCwgc2NyYXRjaFF1YXRlcm5pb24pKTtcbiAgICB9XG59XG5cbnZhciBjYWNoZWRPcmllbnRhdGlvbjogbnVtYmVyID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZURpc3BsYXlPcmllbnRhdGlvbigpIHtcbiAgICBjYWNoZWRPcmllbnRhdGlvbiA9IHF1ZXJ5RGlzcGxheU9yaWVudGF0aW9uKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBxdWVyeURpc3BsYXlPcmllbnRhdGlvbigpIDogbnVtYmVyIHtcbiAgICBpZiAoYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5zdGF0dXNCYXJPcmllbnRhdGlvbjtcbiAgICAgICAgc3dpdGNoIChvcmllbnRhdGlvbikge1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlVua25vd246XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXQ6IHJldHVybiAwO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0VXBzaWRlRG93bjogcmV0dXJuIDE4MDtcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVMZWZ0OiByZXR1cm4gOTA7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlUmlnaHQ6IHJldHVybiAtOTA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgY29uc3QgY29udGV4dDphbmRyb2lkLmNvbnRlbnQuQ29udGV4dCA9IHV0aWxzLmFkLmdldEFwcGxpY2F0aW9uQ29udGV4dCgpO1xuICAgICAgICBjb25zdCBkaXNwbGF5OmFuZHJvaWQudmlldy5EaXNwbGF5ID0gY29udGV4dC5nZXRTeXN0ZW1TZXJ2aWNlKGFuZHJvaWQuY29udGVudC5Db250ZXh0LldJTkRPV19TRVJWSUNFKS5nZXREZWZhdWx0RGlzcGxheSgpO1xuICAgICAgICBjb25zdCByb3RhdGlvbiA9IGRpc3BsYXkuZ2V0Um90YXRpb24oKTtcbiAgICAgICAgc3dpdGNoIChyb3RhdGlvbikge1xuICAgICAgICAgICAgY2FzZSBhbmRyb2lkLnZpZXcuU3VyZmFjZS5ST1RBVElPTl8wOiByZXR1cm4gMDtcbiAgICAgICAgICAgIGNhc2UgYW5kcm9pZC52aWV3LlN1cmZhY2UuUk9UQVRJT05fMTgwOiByZXR1cm4gMTgwO1xuICAgICAgICAgICAgY2FzZSBhbmRyb2lkLnZpZXcuU3VyZmFjZS5ST1RBVElPTl85MDogcmV0dXJuIC05MDtcbiAgICAgICAgICAgIGNhc2UgYW5kcm9pZC52aWV3LlN1cmZhY2UuUk9UQVRJT05fMjcwOiByZXR1cm4gOTA7XG4gICAgICAgIH1cbiAgICB9IFxuICAgIHJldHVybiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlzcGxheU9yaWVudGF0aW9uKCkgOiBudW1iZXIge1xuICAgIHJldHVybiBjYWNoZWRPcmllbnRhdGlvbjtcbn1cbiJdfQ==