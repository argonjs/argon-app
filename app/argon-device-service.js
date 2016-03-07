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
else if (application.ios) {
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