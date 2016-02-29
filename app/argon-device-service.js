"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var application = require("application");
var frames = require('ui/frame');
var vuforia = require('nativescript-vuforia');
var Argon = require("argon");
var JulianDate = Argon.Cesium.JulianDate;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var Transforms = Argon.Cesium.Transforms;
var Matrix4 = Argon.Cesium.Matrix4;
var Matrix3 = Argon.Cesium.Matrix3;
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
exports.iosSystemBootDate = Argon.Cesium.JulianDate.now();
if (vuforia.ios) {
    exports.iosSystemBootDate = Argon.Cesium.JulianDate.fromDate(new Date(vuforia.ios.boottime().sec * 1000));
}
else {
    var uptime = NSProcessInfo.processInfo().systemUptime;
    JulianDate.addSeconds(exports.iosSystemBootDate, -uptime, exports.iosSystemBootDate);
}
var NativeScriptDeviceService = (function (_super) {
    __extends(NativeScriptDeviceService, _super);
    function NativeScriptDeviceService() {
        var _this = this;
        _super.call(this);
        this.scratchTime = new JulianDate(0, 0);
        this.scratchCartesian3 = new Cartesian3;
        this.scratchQuaternion = new Quaternion;
        this.scratchECEFQuaternion = new Quaternion;
        this.scratchMatrix4 = new Matrix4;
        this.scratchMatrix3 = new Matrix3;
        this._iosInverseInterfaceRotation = new Quaternion;
        this.defaultReality = { type: 'vuforia' };
        application.on(application.orientationChangedEvent, function () {
            var frame = frames.topmost();
            Promise.resolve().then(function () {
                _this.viewSize = {
                    width: frame.getMeasuredWidth(),
                    height: frame.getMeasuredHeight()
                };
            });
        });
        if (application.ios) {
            var locationAuthStatus = CLLocationManager.authorizationStatus();
            this.iosLocationManager = CLLocationManager.alloc().init();
            switch (locationAuthStatus) {
                case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined:
                    this.iosLocationManager.requestWhenInUseAuthorization();
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways:
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse: break;
                default: // TODO: alert saying Argon needs location services, and instructing user to to enable them
            }
            this.iosLocationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation;
            this.iosLocationManager.distanceFilter = kCLDistanceFilterNone;
            this.iosLocationManager.startUpdatingLocation();
            this.iosMotionManager = CMMotionManager.alloc().init();
            this.iosMotionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
            var effectiveReferenceFrame = void 0;
            if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
                effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
            }
            else {
                effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXArbitraryCorrectedZVertical;
            }
            this.iosMotionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
        }
    }
    Object.defineProperty(NativeScriptDeviceService.prototype, "iosInverseInterfaceRotation", {
        get: function () {
            var controller = application.ios.rootController;
            var interfaceOrientation = controller.interfaceOrientation;
            switch (interfaceOrientation) {
                case UIInterfaceOrientation.UIInterfaceOrientationUnknown:
                case UIInterfaceOrientation.UIInterfaceOrientationPortrait:
                    Quaternion.IDENTITY.clone(this._iosInverseInterfaceRotation);
                    break;
                case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown:
                    Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI, this._iosInverseInterfaceRotation);
                    break;
                case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft:
                    Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO, this._iosInverseInterfaceRotation);
                    break;
                case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight:
                    Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -CesiumMath.PI_OVER_TWO, this._iosInverseInterfaceRotation);
                    break;
            }
            return this._iosInverseInterfaceRotation;
        },
        enumerable: true,
        configurable: true
    });
    NativeScriptDeviceService.prototype.getDevicePose = function (time) {
        if (application.ios) {
            var motion = this.iosMotionManager.deviceMotion;
            var location_1 = this.iosLocationManager.location;
            var position = void 0;
            if (location_1) {
                var lat = location_1.coordinate.latitude;
                var lon = location_1.coordinate.longitude;
                var height = location_1.altitude;
                var locationDate = location_1.timestamp; // {N} is auto-marshalling from NSDate to Date here
                var locationTime = Argon.Cesium.JulianDate.fromDate(locationDate, this.scratchTime);
                var sampledPosition = this.device.position;
                position = Argon.Cesium.Cartesian3.fromDegrees(lon, lat, height, undefined, this.scratchCartesian3);
                sampledPosition.addSample(locationTime, position);
            }
            if (motion && position) {
                var motionQuaternion = this.iosMotionManager.deviceMotion.attitude.quaternion;
                var motionTimestamp = this.iosMotionManager.deviceMotion.timestamp; // this timestamp is in seconds, not an NSDate object
                var motionTime = JulianDate.addSeconds(exports.iosSystemBootDate, motionTimestamp, this.scratchTime);
                // Apple's orientation is reported in NWU, so convert to ENU
                var orientation_1 = Quaternion.multiply(z90, motionQuaternion, this.scratchQuaternion);
                // Finally, convert from local ENU to ECEF (Earth-Centered-Earth-Fixed)
                var enu2ecef = Transforms.eastNorthUpToFixedFrame(position, undefined, this.scratchMatrix4);
                var enu2ecefRot = Matrix4.getRotation(enu2ecef, this.scratchMatrix3);
                var enu2ecefQuat = Quaternion.fromRotationMatrix(enu2ecefRot, this.scratchECEFQuaternion);
                Quaternion.multiply(enu2ecefQuat, orientation_1, orientation_1);
                var sampledOrientation = this.device.orientation;
                sampledOrientation.addSample(motionTime, orientation_1);
            }
        }
        return _super.prototype.getDevicePose.call(this, time);
    };
    NativeScriptDeviceService.prototype.getEyePose = function (time) {
        var orientation = vuforia.getInterfaceOrientation();
        var orientationRad = Argon.Cesium.CesiumMath.toRadians(orientation);
        var orientationProperty = this.eye.orientation;
        orientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, orientationRad));
        return _super.prototype.getEyePose.call(this, time);
    };
    NativeScriptDeviceService.prototype.getCameraState = function () {
        var frame = frames.topmost();
        var width = frame.getMeasuredWidth();
        var height = frame.getMeasuredHeight();
        var videoBackgroundConfig = vuforia.getVideoBackgroundConfig();
        var cameraCalibration = vuforia.getCameraCalibration();
        // calculate the fov for the target region of the screen
        var widthRatio = (width / videoBackgroundConfig.sizeX);
        var heightRatio = (height / videoBackgroundConfig.sizeY);
        var renderfovX = 2 * Math.atan(Math.tan(cameraCalibration.fieldOfViewRadX * 0.5) * widthRatio);
        var renderfovY = 2 * Math.atan(Math.tan(cameraCalibration.fieldOfViewRadY * 0.5) * heightRatio);
        var dX = cameraCalibration.principalPointX - cameraCalibration.sizeX / 2;
        var dY = cameraCalibration.principalPointY - cameraCalibration.sizeY / 2;
        var cameraState = {
            type: 'perspective',
            fovX: renderfovX,
            fovY: renderfovY,
            xOffset: videoBackgroundConfig.positionX + dX,
            yOffset: videoBackgroundConfig.positionY + dY
        };
        return cameraState;
    };
    NativeScriptDeviceService.prototype.getViewSize = function () {
        var frame = frames.topmost();
        return {
            width: frame.getMeasuredWidth(),
            height: frame.getMeasuredHeight()
        };
    };
    return NativeScriptDeviceService;
}(Argon.DeviceService));
exports.NativeScriptDeviceService = NativeScriptDeviceService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcmdvbi1kZXZpY2Utc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFPLFdBQVcsV0FBVyxhQUFhLENBQUMsQ0FBQztBQUM1QyxJQUFPLE1BQU0sV0FBVyxVQUFVLENBQUMsQ0FBQztBQUdwQyxJQUFPLE9BQU8sV0FBVyxzQkFBc0IsQ0FBQyxDQUFBO0FBRWhELElBQU8sS0FBSyxXQUFXLE9BQU8sQ0FBQyxDQUFDO0FBRWhDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sT0FBTyxHQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3hDLElBQU0sT0FBTyxHQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBRXhDLElBQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFckUseUJBQWlCLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFN0QsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDZCx5QkFBaUIsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENB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