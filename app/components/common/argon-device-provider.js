"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var application = require("application");
var utils = require("utils/utils");
var geolocation = require("speigg-nativescript-geolocation");
var dialogs = require("ui/dialogs");
var enums = require("ui/enums");
var vuforia = require("nativescript-vuforia");
var frames = require("ui/frame");
var Argon = require("@argonjs/argon");
var util_1 = require("./util");
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var Matrix4 = Argon.Cesium.Matrix4;
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
var ONE = new Cartesian3(1, 1, 1);
var NativescriptDeviceService = (function (_super) {
    __extends(NativescriptDeviceService, _super);
    function NativescriptDeviceService(sessionService, contextService, viewService, vuforiaServiceProvider) {
        var _this = _super.call(this, sessionService, contextService, viewService) || this;
        _this._application = application;
        _this._scratchDisplayOrientation = new Quaternion;
        _this._scratchDeviceOrientation = new Quaternion;
        _this._id = 0;
        _this._callbacks = new Map();
        _this._callbacks2 = new Map();
        _this.requestAnimationFrame = function (cb) {
            _this._id++;
            _this._callbacks.set(_this._id, cb);
            return _this._id;
        };
        _this.cancelAnimationFrame = function (id) {
            _this._callbacks.delete(id);
        };
        _this._motionQuaternionAndroid = new Quaternion;
        var vsp = vuforiaServiceProvider;
        var now;
        var executeCallback = function (cb, id) {
            cb(now);
        };
        vsp.stateUpdateEvent.addEventListener(function () {
            now = global.performance.now();
            // swap callback maps
            var callbacks = _this._callbacks;
            _this._callbacks = _this._callbacks2;
            _this._callbacks2 = callbacks;
            callbacks.forEach(executeCallback);
            callbacks.clear();
        });
        if (!vuforia.api) {
            setInterval(function () { return vsp.stateUpdateEvent.raiseEvent(Argon.Cesium.JulianDate.now()); }, 34);
        }
        return _this;
    }
    NativescriptDeviceService.prototype.getScreenOrientationDegrees = function () {
        return util_1.getScreenOrientation();
    };
    NativescriptDeviceService.prototype.onUpdateFrameState = function () {
        var viewport = this.deviceState.viewport = this.deviceState.viewport || {};
        var contentView = frames.topmost().currentPage.content;
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = contentView.getActualSize().width; //getMeasuredWidth();
        viewport.height = contentView.getActualSize().height; //getMeasuredHeight();
        _super.prototype.onUpdateFrameState.call(this);
        if (this._application.ios) {
            var motionManager = this._getMotionManagerIOS();
            var motion = motionManager && motionManager.deviceMotion;
            if (motion) {
                var motionQuaternion = motion.attitude.quaternion;
                // Apple's orientation is reported in NWU, so we convert to ENU by applying a global rotation of
                // 90 degrees about +z to the NWU orientation (or applying the NWU quaternion as a local rotation 
                // to the starting orientation of 90 degress about +z). 
                // Note: With quaternion multiplication the `*` symbol can be read as 'rotates'. 
                // If the orientation (O) is on the right and the rotation (R) is on the left, 
                // such that the multiplication order is R*O, then R is a global rotation being applied on O. 
                // Likewise, the reverse, O*R, is a local rotation R applied to the orientation O. 
                var deviceOrientation = Quaternion.multiply(z90, motionQuaternion, this._scratchDeviceOrientation);
                var screenOrientationDegrees = this.frameState.screenOrientationDegrees;
                var deviceUser = this.user;
                var deviceLocalOrigin = this.localOrigin;
                if (!deviceUser.position)
                    deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation)
                    deviceUser.orientation = new Argon.Cesium.ConstantProperty();
                deviceUser.position.setValue(Cartesian3.ZERO, deviceLocalOrigin);
                var screenOrientation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, this._scratchDisplayOrientation);
                var screenBasedDeviceOrientation = Quaternion.multiply(deviceOrientation, screenOrientation, this._scratchDeviceOrientation);
                deviceUser.orientation.setValue(screenBasedDeviceOrientation);
                var locationManager = this._getLocationManagerIOS();
                var heading = locationManager.heading;
                deviceUser['meta'] = deviceUser['meta'] || {};
                deviceUser['meta'].geoHeadingAccuracy = heading && heading.headingAccuracy;
            }
        }
        else if (this._application.android) {
            var motionManager = this._getMotionManagerAndroid();
            if (motionManager) {
                var deviceOrientation = this._motionQuaternionAndroid;
                var screenOrientationDegrees = this.frameState.screenOrientationDegrees;
                var deviceUser = this.user;
                var deviceLocalOrigin = this.localOrigin;
                if (!deviceUser.position)
                    deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation)
                    deviceUser.orientation = new Argon.Cesium.ConstantProperty();
                deviceUser.position.setValue(Cartesian3.ZERO, deviceLocalOrigin);
                var screenOrientation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, this._scratchDisplayOrientation);
                var screenBasedDeviceOrientation = Quaternion.multiply(deviceOrientation, screenOrientation, this._scratchDeviceOrientation);
                deviceUser.orientation.setValue(screenBasedDeviceOrientation);
            }
        }
    };
    NativescriptDeviceService.prototype._getMotionManagerIOS = function () {
        if (this._motionManagerIOS)
            return this._motionManagerIOS;
        var motionManager = CMMotionManager.alloc().init();
        motionManager.showsDeviceMovementDisplay = true;
        motionManager.deviceMotionUpdateInterval = 1.0 / 100.0;
        if (!motionManager.deviceMotionAvailable || !motionManager.magnetometerAvailable) {
            console.log("NO Magnetometer and/or Gyro. ");
            alert("Need a device with gyroscope and magnetometer to get 3D device orientation");
            return undefined;
        }
        else {
            var effectiveReferenceFrame = void 0;
            if (CMMotionManager.availableAttitudeReferenceFrames() & 8 /* XTrueNorthZVertical */) {
                effectiveReferenceFrame = 8 /* XTrueNorthZVertical */;
                motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
            }
            else {
                alert("Need a device with magnetometer to get full 3D device orientation");
                console.log("NO  CMAttitudeReferenceFrameXTrueNorthZVertical");
                return undefined;
            }
        }
        this._motionManagerIOS = motionManager;
        return motionManager;
    };
    NativescriptDeviceService.prototype._getLocationManagerIOS = function () {
        if (!this._locationManagerIOS) {
            this._locationManagerIOS = CLLocationManager.alloc().init();
            switch (CLLocationManager.authorizationStatus()) {
                case 4 /* kCLAuthorizationStatusAuthorizedWhenInUse */:
                case 3 /* kCLAuthorizationStatusAuthorizedAlways */:
                    break;
                case 0 /* kCLAuthorizationStatusNotDetermined */:
                    this._locationManagerIOS.requestWhenInUseAuthorization();
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
        return this._locationManagerIOS;
    };
    NativescriptDeviceService.prototype._getMotionManagerAndroid = function () {
        var _this = this;
        if (this._motionManagerAndroid)
            return this._motionManagerAndroid;
        var sensorManager = application.android.foregroundActivity.getSystemService(android.content.Context.SENSOR_SERVICE);
        var rotationSensor = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ROTATION_VECTOR);
        var sensorEventListener = new android.hardware.SensorEventListener({
            onAccuracyChanged: function (sensor, accuracy) {
                //console.log("onAccuracyChanged: " + accuracy);
            },
            onSensorChanged: function (event) {
                Quaternion.unpack(event.values, 0, _this._motionQuaternionAndroid);
            }
        });
        sensorManager.registerListener(sensorEventListener, rotationSensor, android.hardware.SensorManager.SENSOR_DELAY_GAME);
        this._motionManagerAndroid = sensorEventListener;
        return sensorEventListener;
    };
    return NativescriptDeviceService;
}(Argon.DeviceService));
NativescriptDeviceService = __decorate([
    Argon.DI.autoinject,
    __metadata("design:paramtypes", [Argon.SessionService, Argon.ContextService, Argon.ViewService, Argon.VuforiaServiceProvider])
], NativescriptDeviceService);
exports.NativescriptDeviceService = NativescriptDeviceService;
var NativescriptDeviceServiceProvider = (function (_super) {
    __extends(NativescriptDeviceServiceProvider, _super);
    function NativescriptDeviceServiceProvider(container, sessionService, deviceService, contextService, viewService, contextServiceProvidere, focusServiceProvider, realityService) {
        var _this = _super.call(this, sessionService, deviceService, contextService, viewService, contextServiceProvidere) || this;
        _this.focusServiceProvider = focusServiceProvider;
        // private _scratchCartesian = new Argon.Cesium.Cartesian3;
        _this._scratchPerspectiveFrustum = new Argon.Cesium.PerspectiveFrustum;
        _this._scratchMatrix4 = new Argon.Cesium.Matrix4;
        _this._scratchVideoQuaternion = new Argon.Cesium.Quaternion;
        application.on(application.orientationChangedEvent, function () {
            setTimeout(function () {
                _this.publishDeviceState();
            }, 500);
            _this.publishDeviceState();
        });
        return _this;
    }
    NativescriptDeviceServiceProvider.prototype.onUpdateDeviceState = function (deviceState) {
        if (!deviceState.isPresentingHMD || !vuforia.api) {
            deviceState.viewport = undefined;
            deviceState.subviews = undefined;
            deviceState.strict = false;
            return;
        }
        var subviews = deviceState.subviews = deviceState.subviews || [];
        var device = vuforia.api.getDevice();
        var renderingPrimitives = device.getRenderingPrimitives();
        var renderingViews = renderingPrimitives.getRenderingViews();
        var numViews = renderingViews.getNumViews();
        var contentScaleFactor = vuforia.videoView.ios ? vuforia.videoView.ios.contentScaleFactor : 1;
        subviews.length = numViews;
        for (var i = 0; i < numViews; i++) {
            var view = renderingViews.getView(i);
            // TODO: support PostProcess rendering subview
            if (view === vuforia.View.PostProcess) {
                subviews.length--;
                continue;
            }
            var subview = subviews[i] = subviews[i] || {};
            // Set subview type
            switch (view) {
                case vuforia.View.LeftEye:
                    subview.type = Argon.SubviewType.LEFTEYE;
                    break;
                case vuforia.View.RightEye:
                    subview.type = Argon.SubviewType.RIGHTEYE;
                    break;
                case vuforia.View.Singular:
                    subview.type = Argon.SubviewType.SINGULAR;
                    break;
                default:
                    subview.type = Argon.SubviewType.OTHER;
                    break;
            }
            // Update subview viewport
            var vuforiaSubviewViewport = renderingPrimitives.getViewport(view);
            var subviewViewport = subview.viewport = subview.viewport || {};
            subviewViewport.x = vuforiaSubviewViewport.x;
            subviewViewport.y = vuforiaSubviewViewport.y;
            subviewViewport.width = vuforiaSubviewViewport.z;
            subviewViewport.height = vuforiaSubviewViewport.w;
            // Start with the projection matrix for this subview
            // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
            // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
            var projectionMatrix = renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);
            if (!isFinite(projectionMatrix[0])) {
                // if our projection matrix is giving null values then the
                // surface is not properly configured for some reason, so reset it
                // (not sure why this happens, but it only seems to happen after or between 
                // vuforia initializations)
                if (i === 0) {
                    var width = vuforia.videoView.ios ? vuforia.videoView.ios.frame.size.width : vuforia.videoView.android.getWidth();
                    var height = vuforia.videoView.ios ? vuforia.videoView.ios.frame.size.height : vuforia.videoView.android.getHeight();
                    vuforia.api.onSurfaceChanged(width * contentScaleFactor, height * contentScaleFactor);
                }
                var frustum = this._scratchPerspectiveFrustum;
                frustum.fov = Math.PI / 2;
                frustum.near = 0.01;
                frustum.far = 10000;
                frustum.aspectRatio = subviewViewport.width / subviewViewport.height;
                if (!isFinite(frustum.aspectRatio) || frustum.aspectRatio === 0)
                    frustum.aspectRatio = 1;
                subview.projectionMatrix = Matrix4.clone(frustum.projectionMatrix, subview.projectionMatrix);
            }
            else {
                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation for vuforia's video (at least on iOS) is the landscape right orientation,
                // which is the orientation where the device is held in landscape with the home button on the right. 
                // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
                // So, we want to undo this rotation which vuforia applies for us.  
                // TODO: calculate this matrix only when we have to (when the interface orientation changes)
                var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, (CesiumMath.PI_OVER_TWO - util_1.getScreenOrientation() * Math.PI / 180), this._scratchVideoQuaternion), ONE, this._scratchMatrix4);
                Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);
                // convert from the vuforia projection matrix (+X -Y +Z) to a more standard convention (+X +Y -Z)
                // by negating the appropriate columns. 
                // See https://developer.vuforia.com/library/articles/Solution/How-To-Use-the-Camera-Projection-Matrix
                projectionMatrix[0] *= -1; // x
                projectionMatrix[1] *= -1; // y
                projectionMatrix[2] *= -1; // z
                projectionMatrix[3] *= -1; // w
                projectionMatrix[8] *= -1; // x
                projectionMatrix[9] *= -1; // y
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
            // default to identity subview pose (in relation to the overall view pose)
            // TODO: use eye adjustment matrix to get subview poses (for eye separation). See commented out code above...
            subview.pose = undefined;
        }
    };
    NativescriptDeviceServiceProvider.prototype.onStartGeolocationUpdates = function (options) {
        var _this = this;
        if (typeof this.locationWatchId !== 'undefined')
            return Promise.resolve();
        ;
        return new Promise(function (resolve, reject) {
            // Note: the d.ts for nativescript-geolocation is wrong. This call is correct. 
            // Casting the module as <any> here for now to hide annoying typescript errors...
            _this.locationWatchId = geolocation.watchLocation(function (location) {
                // Note: iOS documentation states that the altitude value refers to height (meters) above sea level, but 
                // if ios is reporting the standard gps defined altitude, then this theoretical "sea level" actually refers to 
                // the WGS84 ellipsoid rather than traditional mean sea level (MSL) which is not a simple surface and varies 
                // according to the local gravitational field. 
                // In other words, my best guess is that the altitude value here is *probably* GPS defined altitude, which 
                // is equivalent to the height above the WGS84 ellipsoid, which is exactly what Cesium expects...
                _this.configureLocalOrigin(location.longitude, location.latitude, location.altitude, location.horizontalAccuracy, location.verticalAccuracy);
            }, function (e) {
                reject(e);
            }, {
                desiredAccuracy: options && options.enableHighAccuracy ?
                    application.ios ?
                        kCLLocationAccuracyBest :
                        enums.Accuracy.high :
                    application.ios ?
                        kCLLocationAccuracyKilometer :
                        enums.Accuracy.any,
                updateDistance: application.ios ? kCLDistanceFilterNone : 0
            });
            console.log("Creating location watcher. " + _this.locationWatchId);
        });
    };
    NativescriptDeviceServiceProvider.prototype.onStopGeolocationUpdates = function () {
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
    };
    NativescriptDeviceServiceProvider.prototype._ensurePermission = function (session) {
        if (this.focusServiceProvider.session == session)
            return;
        if (session == this.sessionService.manager)
            return;
        throw new Error('Session does not have focus.');
    };
    NativescriptDeviceServiceProvider.prototype.handleRequestPresentHMD = function (session) {
        this._ensurePermission(session);
        var device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(true);
        return Promise.resolve();
    };
    NativescriptDeviceServiceProvider.prototype.handleExitPresentHMD = function (session) {
        this._ensurePermission(session);
        var device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(false);
        return Promise.resolve();
    };
    NativescriptDeviceServiceProvider.prototype._isHmdActive = function () {
        var device = vuforia.api && vuforia.api.getDevice();
        return device.isViewerActive();
    };
    return NativescriptDeviceServiceProvider;
}(Argon.DeviceServiceProvider));
NativescriptDeviceServiceProvider = __decorate([
    Argon.DI.autoinject,
    __metadata("design:paramtypes", [Object, Argon.SessionService, Argon.DeviceService, Argon.ContextService, Argon.ViewService, Argon.ContextServiceProvider, Argon.FocusServiceProvider, Argon.RealityService])
], NativescriptDeviceServiceProvider);
exports.NativescriptDeviceServiceProvider = NativescriptDeviceServiceProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyw4Q0FBZ0Q7QUFDaEQsaUNBQW1DO0FBRW5DLHNDQUF3QztBQUV4QywrQkFBMkM7QUFFM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBR2xDLElBQWEseUJBQXlCO0lBQVMsNkNBQW1CO0lBRTlELG1DQUNJLGNBQW1DLEVBQ25DLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLHNCQUFtRDtRQUp2RCxZQUtJLGtCQUFNLGNBQWMsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLFNBc0JyRDtRQUVPLGtCQUFZLEdBQUcsV0FBVyxDQUFDO1FBQzNCLGdDQUEwQixHQUFHLElBQUksVUFBVSxDQUFDO1FBQzVDLCtCQUF5QixHQUFHLElBQUksVUFBVSxDQUFDO1FBRTNDLFNBQUcsR0FBRyxDQUFDLENBQUM7UUFDUixnQkFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FB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O1FBQ3RELE1BQU0sSUFBSSxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVNLHdEQUFZLEdBQW5CO1FBQ0ksSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVMLHdDQUFDO0FBQUQsQ0FBQyxBQS9QRCxDQUF1RCxLQUFLLENBQUMscUJBQXFCLEdBK1BqRjtBQS9QWSxpQ0FBaUM7SUFEN0MsS0FBSyxDQUFDLEVBQUUsQ0FBQyxVQUFVOzZDQUlHLEtBQUssQ0FBQyxjQUFjLEVBQ3JCLEtBQUssQ0FBQyxhQUFhLEVBQ2xCLEtBQUssQ0FBQyxjQUFjLEVBQ3ZCLEtBQUssQ0FBQyxXQUFXLEVBQ0wsS0FBSyxDQUFDLHNCQUFzQixFQUN2QixLQUFLLENBQUMsb0JBQW9CLEVBQ3hDLEtBQUssQ0FBQyxjQUFjO0dBVDlCLGlDQUFpQyxDQStQN0M7QUEvUFksOEVBQWlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSBcImFwcGxpY2F0aW9uXCI7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBnZW9sb2NhdGlvbiBmcm9tICdzcGVpZ2ctbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBlbnVtcyBmcm9tICd1aS9lbnVtcyc7XG5cbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgZnJhbWVzIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi12dWZvcmlhLXByb3ZpZGVyJ1xuaW1wb3J0ICogYXMgQXJnb24gZnJvbSBcIkBhcmdvbmpzL2FyZ29uXCI7XG5cbmltcG9ydCB7Z2V0U2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vdXRpbCdcblxuY29uc3QgQ2FydGVzaWFuMyA9IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuY29uc3QgUXVhdGVybmlvbiA9IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuY29uc3QgQ2VzaXVtTWF0aCA9IEFyZ29uLkNlc2l1bS5DZXNpdW1NYXRoO1xuY29uc3QgTWF0cml4NCAgICA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0O1xuXG5jb25zdCB6OTAgPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIENlc2l1bU1hdGguUElfT1ZFUl9UV08pO1xuY29uc3QgT05FID0gbmV3IENhcnRlc2lhbjMoMSwxLDEpO1xuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UgZXh0ZW5kcyBBcmdvbi5EZXZpY2VTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBzZXNzaW9uU2VydmljZTpBcmdvbi5TZXNzaW9uU2VydmljZSwgXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgdmlld1NlcnZpY2U6QXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIHZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI6QXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlcikge1xuICAgICAgICBzdXBlcihzZXNzaW9uU2VydmljZSwgY29udGV4dFNlcnZpY2UsIHZpZXdTZXJ2aWNlKTtcblxuICAgICAgICBjb25zdCB2c3AgPSA8TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcj52dWZvcmlhU2VydmljZVByb3ZpZGVyO1xuICAgICAgICBsZXQgbm93Om51bWJlcjtcblxuICAgICAgICBjb25zdCBleGVjdXRlQ2FsbGJhY2sgPSAoY2IsIGlkKSA9PiB7XG4gICAgICAgICAgICBjYihub3cpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZzcC5zdGF0ZVVwZGF0ZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgIG5vdyA9IGdsb2JhbC5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgIC8vIHN3YXAgY2FsbGJhY2sgbWFwc1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzO1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzMjtcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrczIgPSBjYWxsYmFja3M7XG4gICAgICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChleGVjdXRlQ2FsbGJhY2spO1xuICAgICAgICAgICAgY2FsbGJhY2tzLmNsZWFyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghdnVmb3JpYS5hcGkpIHtcbiAgICAgICAgICAgIHNldEludGVydmFsKCgpID0+IHZzcC5zdGF0ZVVwZGF0ZUV2ZW50LnJhaXNlRXZlbnQoQXJnb24uQ2VzaXVtLkp1bGlhbkRhdGUubm93KCkpLCAzNCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9hcHBsaWNhdGlvbiA9IGFwcGxpY2F0aW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcbiAgICBwcml2YXRlIF9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2lkID0gMDtcbiAgICBwcml2YXRlIF9jYWxsYmFja3MgPSBuZXcgTWFwPG51bWJlciwgRnVuY3Rpb24+KCk7XG4gICAgcHJpdmF0ZSBfY2FsbGJhY2tzMiA9IG5ldyBNYXA8bnVtYmVyLCBGdW5jdGlvbj4oKTtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IChjYjoodGltZXN0YW1wOm51bWJlcik9PnZvaWQpID0+IHtcbiAgICAgICAgdGhpcy5faWQrKztcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tzLnNldCh0aGlzLl9pZCwgY2IpO1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAoaWQ6bnVtYmVyKSA9PiB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrcy5kZWxldGUoaWQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMoKSB7XG4gICAgICAgIHJldHVybiBnZXRTY3JlZW5PcmllbnRhdGlvbigpO1xuICAgIH1cbiAgICBcbiAgICBvblVwZGF0ZUZyYW1lU3RhdGUoKSB7XG5cbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB0aGlzLmRldmljZVN0YXRlLnZpZXdwb3J0ID0gdGhpcy5kZXZpY2VTdGF0ZS52aWV3cG9ydCB8fCA8QXJnb24uVmlld3BvcnQ+e307XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gZnJhbWVzLnRvcG1vc3QoKS5jdXJyZW50UGFnZS5jb250ZW50O1xuICAgICAgICB2aWV3cG9ydC54ID0gMDtcbiAgICAgICAgdmlld3BvcnQueSA9IDA7XG4gICAgICAgIHZpZXdwb3J0LndpZHRoID0gY29udGVudFZpZXcuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoOyAvL2dldE1lYXN1cmVkV2lkdGgoKTtcbiAgICAgICAgdmlld3BvcnQuaGVpZ2h0ID0gY29udGVudFZpZXcuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodDsgLy9nZXRNZWFzdXJlZEhlaWdodCgpO1xuXG4gICAgICAgIHN1cGVyLm9uVXBkYXRlRnJhbWVTdGF0ZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9hcHBsaWNhdGlvbi5pb3MpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRNb3Rpb25NYW5hZ2VySU9TKCk7XG4gICAgICAgICAgICBjb25zdCBtb3Rpb24gPSBtb3Rpb25NYW5hZ2VyICYmIG1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uO1xuXG4gICAgICAgICAgICBpZiAobW90aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW90aW9uUXVhdGVybmlvbiA9IDxBcmdvbi5DZXNpdW0uUXVhdGVybmlvbj5tb3Rpb24uYXR0aXR1ZGUucXVhdGVybmlvbjtcblxuICAgICAgICAgICAgICAgIC8vIEFwcGxlJ3Mgb3JpZW50YXRpb24gaXMgcmVwb3J0ZWQgaW4gTldVLCBzbyB3ZSBjb252ZXJ0IHRvIEVOVSBieSBhcHBseWluZyBhIGdsb2JhbCByb3RhdGlvbiBvZlxuICAgICAgICAgICAgICAgIC8vIDkwIGRlZ3JlZXMgYWJvdXQgK3ogdG8gdGhlIE5XVSBvcmllbnRhdGlvbiAob3IgYXBwbHlpbmcgdGhlIE5XVSBxdWF0ZXJuaW9uIGFzIGEgbG9jYWwgcm90YXRpb24gXG4gICAgICAgICAgICAgICAgLy8gdG8gdGhlIHN0YXJ0aW5nIG9yaWVudGF0aW9uIG9mIDkwIGRlZ3Jlc3MgYWJvdXQgK3opLiBcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBXaXRoIHF1YXRlcm5pb24gbXVsdGlwbGljYXRpb24gdGhlIGAqYCBzeW1ib2wgY2FuIGJlIHJlYWQgYXMgJ3JvdGF0ZXMnLiBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgb3JpZW50YXRpb24gKE8pIGlzIG9uIHRoZSByaWdodCBhbmQgdGhlIHJvdGF0aW9uIChSKSBpcyBvbiB0aGUgbGVmdCwgXG4gICAgICAgICAgICAgICAgLy8gc3VjaCB0aGF0IHRoZSBtdWx0aXBsaWNhdGlvbiBvcmRlciBpcyBSKk8sIHRoZW4gUiBpcyBhIGdsb2JhbCByb3RhdGlvbiBiZWluZyBhcHBsaWVkIG9uIE8uIFxuICAgICAgICAgICAgICAgIC8vIExpa2V3aXNlLCB0aGUgcmV2ZXJzZSwgTypSLCBpcyBhIGxvY2FsIHJvdGF0aW9uIFIgYXBwbGllZCB0byB0aGUgb3JpZW50YXRpb24gTy4gXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlT3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLm11bHRpcGx5KHo5MCwgbW90aW9uUXVhdGVybmlvbiwgdGhpcy5fc2NyYXRjaERldmljZU9yaWVudGF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyA9IHRoaXMuZnJhbWVTdGF0ZS5zY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXM7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZUxvY2FsT3JpZ2luID0gdGhpcy5sb2NhbE9yaWdpbjtcblxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5wb3NpdGlvbikgZGV2aWNlVXNlci5wb3NpdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLm9yaWVudGF0aW9uKSBkZXZpY2VVc2VyLm9yaWVudGF0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5aRVJPLFxuICAgICAgICAgICAgICAgICAgICBkZXZpY2VMb2NhbE9yaWdpblxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlVOSVRfWiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24ubXVsdGlwbHkoXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VPcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KS5zZXRWYWx1ZShzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRMb2NhdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkaW5nID0gbG9jYXRpb25NYW5hZ2VyLmhlYWRpbmc7XG4gICAgICAgICAgICAgICAgZGV2aWNlVXNlclsnbWV0YSddID0gZGV2aWNlVXNlclsnbWV0YSddIHx8IHt9O1xuICAgICAgICAgICAgICAgIGRldmljZVVzZXJbJ21ldGEnXS5nZW9IZWFkaW5nQWNjdXJhY3kgPSBoZWFkaW5nICYmIGhlYWRpbmcuaGVhZGluZ0FjY3VyYWN5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYXBwbGljYXRpb24uYW5kcm9pZCkge1xuXG4gICAgICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gdGhpcy5fZ2V0TW90aW9uTWFuYWdlckFuZHJvaWQoKTtcbiAgICAgICAgICAgIGlmIChtb3Rpb25NYW5hZ2VyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlT3JpZW50YXRpb24gPSB0aGlzLl9tb3Rpb25RdWF0ZXJuaW9uQW5kcm9pZDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyA9IHRoaXMuZnJhbWVTdGF0ZS5zY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXM7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZUxvY2FsT3JpZ2luID0gdGhpcy5sb2NhbE9yaWdpbjtcblxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5wb3NpdGlvbikgZGV2aWNlVXNlci5wb3NpdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLm9yaWVudGF0aW9uKSBkZXZpY2VVc2VyLm9yaWVudGF0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5aRVJPLFxuICAgICAgICAgICAgICAgICAgICBkZXZpY2VMb2NhbE9yaWdpblxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlVOSVRfWiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24ubXVsdGlwbHkoXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VPcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUoc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9tb3Rpb25NYW5hZ2VySU9TPzpDTU1vdGlvbk1hbmFnZXI7XG5cbiAgICBwcml2YXRlIF9nZXRNb3Rpb25NYW5hZ2VySU9TKCkgOiBDTU1vdGlvbk1hbmFnZXJ8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKHRoaXMuX21vdGlvbk1hbmFnZXJJT1MpIHJldHVybiB0aGlzLl9tb3Rpb25NYW5hZ2VySU9TO1xuXG4gICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSBDTU1vdGlvbk1hbmFnZXIuYWxsb2MoKS5pbml0KCk7XG4gICAgICAgIG1vdGlvbk1hbmFnZXIuc2hvd3NEZXZpY2VNb3ZlbWVudERpc3BsYXkgPSB0cnVlXG4gICAgICAgIG1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uVXBkYXRlSW50ZXJ2YWwgPSAxLjAgLyAxMDAuMDtcbiAgICAgICAgaWYgKCFtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvbkF2YWlsYWJsZSB8fCAhbW90aW9uTWFuYWdlci5tYWduZXRvbWV0ZXJBdmFpbGFibGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTk8gTWFnbmV0b21ldGVyIGFuZC9vciBHeXJvLiBcIiApO1xuICAgICAgICAgICAgYWxlcnQoXCJOZWVkIGEgZGV2aWNlIHdpdGggZ3lyb3Njb3BlIGFuZCBtYWduZXRvbWV0ZXIgdG8gZ2V0IDNEIGRldmljZSBvcmllbnRhdGlvblwiKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWU6Q01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lO1xuICAgICAgICAgICAgaWYgKENNTW90aW9uTWFuYWdlci5hdmFpbGFibGVBdHRpdHVkZVJlZmVyZW5jZUZyYW1lcygpICYgQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWwpIHtcbiAgICAgICAgICAgICAgICBlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSA9IENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsO1xuICAgICAgICAgICAgICAgIG1vdGlvbk1hbmFnZXIuc3RhcnREZXZpY2VNb3Rpb25VcGRhdGVzVXNpbmdSZWZlcmVuY2VGcmFtZShlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsZXJ0KFwiTmVlZCBhIGRldmljZSB3aXRoIG1hZ25ldG9tZXRlciB0byBnZXQgZnVsbCAzRCBkZXZpY2Ugb3JpZW50YXRpb25cIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJOTyAgQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lWFRydWVOb3J0aFpWZXJ0aWNhbFwiICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9tb3Rpb25NYW5hZ2VySU9TID0gbW90aW9uTWFuYWdlcjtcbiAgICAgICAgcmV0dXJuIG1vdGlvbk1hbmFnZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbG9jYXRpb25NYW5hZ2VySU9TPzpDTExvY2F0aW9uTWFuYWdlcjtcblxuICAgIHByaXZhdGUgX2dldExvY2F0aW9uTWFuYWdlcklPUygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUyA9IENMTG9jYXRpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKENMTG9jYXRpb25NYW5hZ2VyLmF1dGhvcml6YXRpb25TdGF0dXMoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkV2hlbkluVXNlOlxuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkQWx3YXlzOiBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c05vdERldGVybWluZWQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUy5yZXF1ZXN0V2hlbkluVXNlQXV0aG9yaXphdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzRGVuaWVkOlxuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNSZXN0cmljdGVkOlxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIkxvY2F0aW9uIFNlcnZpY2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgSW4gb3JkZXIgdG8gcHJvdmlkZSB0aGUgYmVzdCBBdWdtZW50ZWQgUmVhbGl0eSBleHBlcmllbmNlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGVhc2Ugb3BlbiB0aGlzIGFwcCdzIHNldHRpbmdzIGFuZCBlbmFibGUgbG9jYXRpb24gc2VydmljZXNgLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJDYW5jZWxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsnU2V0dGluZ3MnXVxuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKChhY3Rpb24pPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnU2V0dGluZ3MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gTlNVUkwuVVJMV2l0aFN0cmluZyhVSUFwcGxpY2F0aW9uT3BlblNldHRpbmdzVVJMU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5pb3MuZ2V0dGVyKFVJQXBwbGljYXRpb24sIFVJQXBwbGljYXRpb24uc2hhcmVkQXBwbGljYXRpb24pLm9wZW5VUkwodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TO1xuICAgIH1cblxuICAgIHByaXZhdGUgX21vdGlvbk1hbmFnZXJBbmRyb2lkPzphbmRyb2lkLmhhcmR3YXJlLlNlbnNvckV2ZW50TGlzdGVuZXI7XG4gICAgcHJpdmF0ZSBfbW90aW9uUXVhdGVybmlvbkFuZHJvaWQgPSBuZXcgUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2dldE1vdGlvbk1hbmFnZXJBbmRyb2lkKCkgOiBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvckV2ZW50TGlzdGVuZXJ8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKHRoaXMuX21vdGlvbk1hbmFnZXJBbmRyb2lkKSByZXR1cm4gdGhpcy5fbW90aW9uTWFuYWdlckFuZHJvaWQ7XG5cbiAgICAgICAgdmFyIHNlbnNvck1hbmFnZXIgPSBhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eS5nZXRTeXN0ZW1TZXJ2aWNlKGFuZHJvaWQuY29udGVudC5Db250ZXh0LlNFTlNPUl9TRVJWSUNFKTtcbiAgICAgICAgdmFyIHJvdGF0aW9uU2Vuc29yID0gc2Vuc29yTWFuYWdlci5nZXREZWZhdWx0U2Vuc29yKGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yLlRZUEVfUk9UQVRJT05fVkVDVE9SKTtcblxuICAgICAgICB2YXIgc2Vuc29yRXZlbnRMaXN0ZW5lciA9IG5ldyBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvckV2ZW50TGlzdGVuZXIoe1xuICAgICAgICAgICAgb25BY2N1cmFjeUNoYW5nZWQ6IChzZW5zb3IsIGFjY3VyYWN5KSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIm9uQWNjdXJhY3lDaGFuZ2VkOiBcIiArIGFjY3VyYWN5KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblNlbnNvckNoYW5nZWQ6IChldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIFF1YXRlcm5pb24udW5wYWNrKDxudW1iZXJbXT5ldmVudC52YWx1ZXMsIDAsIHRoaXMuX21vdGlvblF1YXRlcm5pb25BbmRyb2lkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2Vuc29yTWFuYWdlci5yZWdpc3Rlckxpc3RlbmVyKHNlbnNvckV2ZW50TGlzdGVuZXIsIHJvdGF0aW9uU2Vuc29yLCBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvck1hbmFnZXIuU0VOU09SX0RFTEFZX0dBTUUpO1xuICAgICAgICB0aGlzLl9tb3Rpb25NYW5hZ2VyQW5kcm9pZCA9IHNlbnNvckV2ZW50TGlzdGVuZXI7XG4gICAgICAgIHJldHVybiBzZW5zb3JFdmVudExpc3RlbmVyO1xuICAgIH1cbn1cblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXIgZXh0ZW5kcyBBcmdvbi5EZXZpY2VTZXJ2aWNlUHJvdmlkZXIge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBjb250YWluZXIsIFxuICAgICAgICBzZXNzaW9uU2VydmljZTpBcmdvbi5TZXNzaW9uU2VydmljZSwgXG4gICAgICAgIGRldmljZVNlcnZpY2U6QXJnb24uRGV2aWNlU2VydmljZSwgXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgdmlld1NlcnZpY2U6QXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlUHJvdmlkZXJlOkFyZ29uLkNvbnRleHRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIHByaXZhdGUgZm9jdXNTZXJ2aWNlUHJvdmlkZXI6QXJnb24uRm9jdXNTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIHJlYWxpdHlTZXJ2aWNlOkFyZ29uLlJlYWxpdHlTZXJ2aWNlKSB7XG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgc2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICAgICAgZGV2aWNlU2VydmljZSwgXG4gICAgICAgICAgICBjb250ZXh0U2VydmljZSwgXG4gICAgICAgICAgICB2aWV3U2VydmljZSwgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRleHRTZXJ2aWNlUHJvdmlkZXJlXG4gICAgICAgICk7XG5cbiAgICAgICAgYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpPT57XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoRGV2aWNlU3RhdGUoKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2hEZXZpY2VTdGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvY2F0aW9uV2F0Y2hJZD86bnVtYmVyO1xuXG4gICAgLy8gcHJpdmF0ZSBfc2NyYXRjaENhcnRlc2lhbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbiAgICBwcml2YXRlIF9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtID0gbmV3IEFyZ29uLkNlc2l1bS5QZXJzcGVjdGl2ZUZydXN0dW07XG5cbiAgICBwcm90ZWN0ZWQgb25VcGRhdGVEZXZpY2VTdGF0ZShkZXZpY2VTdGF0ZTpBcmdvbi5EZXZpY2VTdGF0ZSkge1xuXG4gICAgICAgIGlmICghZGV2aWNlU3RhdGUuaXNQcmVzZW50aW5nSE1EIHx8ICF2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUudmlld3BvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnN0cmljdCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3Vidmlld3MgPSBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyA9IGRldmljZVN0YXRlLnN1YnZpZXdzIHx8IFtdO1xuICAgIFxuXG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBjb25zdCByZW5kZXJpbmdQcmltaXRpdmVzID0gZGV2aWNlLmdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nVmlld3MgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFJlbmRlcmluZ1ZpZXdzKCk7XG4gICAgICAgIGNvbnN0IG51bVZpZXdzID0gcmVuZGVyaW5nVmlld3MuZ2V0TnVtVmlld3MoKTtcblxuICAgICAgICBjb25zdCBjb250ZW50U2NhbGVGYWN0b3IgPSB2dWZvcmlhLnZpZGVvVmlldy5pb3MgPyAoPFVJVmlldz52dWZvcmlhLnZpZGVvVmlldy5pb3MpLmNvbnRlbnRTY2FsZUZhY3RvciA6IDE7XG5cbiAgICAgICAgc3Vidmlld3MubGVuZ3RoID0gbnVtVmlld3M7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1WaWV3czsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCB2aWV3ID0gcmVuZGVyaW5nVmlld3MuZ2V0VmlldyhpKTtcblxuICAgICAgICAgICAgLy8gVE9ETzogc3VwcG9ydCBQb3N0UHJvY2VzcyByZW5kZXJpbmcgc3Vidmlld1xuICAgICAgICAgICAgaWYgKHZpZXcgPT09IHZ1Zm9yaWEuVmlldy5Qb3N0UHJvY2Vzcykge1xuICAgICAgICAgICAgICAgIHN1YnZpZXdzLmxlbmd0aC0tO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdWJ2aWV3ID0gc3Vidmlld3NbaV0gPSBzdWJ2aWV3c1tpXSB8fCA8QXJnb24uU2VyaWFsaXplZFN1YnZpZXc+e307XG5cbiAgICAgICAgICAgIC8vIFNldCBzdWJ2aWV3IHR5cGVcbiAgICAgICAgICAgIHN3aXRjaCAodmlldykge1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LkxlZnRFeWU6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLkxFRlRFWUU7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LlJpZ2h0RXllOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5SSUdIVEVZRTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuU2luZ3VsYXI6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLlNJTkdVTEFSOyBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5PVEhFUjsgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBzdWJ2aWV3IHZpZXdwb3J0XG4gICAgICAgICAgICBjb25zdCB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0ID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRWaWV3cG9ydCh2aWV3KTtcbiAgICAgICAgICAgIGNvbnN0IHN1YnZpZXdWaWV3cG9ydCA9IHN1YnZpZXcudmlld3BvcnQgPSBzdWJ2aWV3LnZpZXdwb3J0IHx8IDxBcmdvbi5WaWV3cG9ydD57fTtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC54ID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC54O1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LnkgPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0Lnk7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQud2lkdGggPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0Lno7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQuaGVpZ2h0ID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC53O1xuXG4gICAgICAgICAgICAvLyBTdGFydCB3aXRoIHRoZSBwcm9qZWN0aW9uIG1hdHJpeCBmb3IgdGhpcyBzdWJ2aWV3XG4gICAgICAgICAgICAvLyBOb3RlOiBWdWZvcmlhIHVzZXMgYSByaWdodC1oYW5kZWQgcHJvamVjdGlvbiBtYXRyaXggd2l0aCB4IHRvIHRoZSByaWdodCwgeSBkb3duLCBhbmQgeiBhcyB0aGUgdmlld2luZyBkaXJlY3Rpb24uXG4gICAgICAgICAgICAvLyBTbyB3ZSBhcmUgY29udmVydGluZyB0byBhIG1vcmUgc3RhbmRhcmQgY29udmVudGlvbiBvZiB4IHRvIHRoZSByaWdodCwgeSB1cCwgYW5kIC16IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi4gXG4gICAgICAgICAgICBsZXQgcHJvamVjdGlvbk1hdHJpeCA9IDxhbnk+cmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRQcm9qZWN0aW9uTWF0cml4KHZpZXcsIHZ1Zm9yaWEuQ29vcmRpbmF0ZVN5c3RlbVR5cGUuQ2FtZXJhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShwcm9qZWN0aW9uTWF0cml4WzBdKSkge1xuXG4gICAgICAgICAgICAgICAgLy8gaWYgb3VyIHByb2plY3Rpb24gbWF0cml4IGlzIGdpdmluZyBudWxsIHZhbHVlcyB0aGVuIHRoZVxuICAgICAgICAgICAgICAgIC8vIHN1cmZhY2UgaXMgbm90IHByb3Blcmx5IGNvbmZpZ3VyZWQgZm9yIHNvbWUgcmVhc29uLCBzbyByZXNldCBpdFxuICAgICAgICAgICAgICAgIC8vIChub3Qgc3VyZSB3aHkgdGhpcyBoYXBwZW5zLCBidXQgaXQgb25seSBzZWVtcyB0byBoYXBwZW4gYWZ0ZXIgb3IgYmV0d2VlbiBcbiAgICAgICAgICAgICAgICAvLyB2dWZvcmlhIGluaXRpYWxpemF0aW9ucylcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IHZ1Zm9yaWEudmlkZW9WaWV3LmlvcyA/IHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcy5mcmFtZS5zaXplLndpZHRoIDogdnVmb3JpYS52aWRlb1ZpZXcuYW5kcm9pZC5nZXRXaWR0aCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSB2dWZvcmlhLnZpZGVvVmlldy5pb3MgPyB2dWZvcmlhLnZpZGVvVmlldy5pb3MuZnJhbWUuc2l6ZS5oZWlnaHQgOiB2dWZvcmlhLnZpZGVvVmlldy5hbmRyb2lkLmdldEhlaWdodCgpO1xuICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLmFwaS5vblN1cmZhY2VDaGFuZ2VkKFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGggKiBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQgKiBjb250ZW50U2NhbGVGYWN0b3JcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBmcnVzdHVtID0gdGhpcy5fc2NyYXRjaFBlcnNwZWN0aXZlRnJ1c3R1bTtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmZvdiA9IE1hdGguUEkvMjtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLm5lYXIgPSAwLjAxO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uZmFyID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9IHN1YnZpZXdWaWV3cG9ydC53aWR0aCAvIHN1YnZpZXdWaWV3cG9ydC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShmcnVzdHVtLmFzcGVjdFJhdGlvKSB8fCBmcnVzdHVtLmFzcGVjdFJhdGlvID09PSAwKSBmcnVzdHVtLmFzcGVjdFJhdGlvID0gMTtcbiAgICAgICAgICAgICAgICBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXggPSBNYXRyaXg0LmNsb25lKGZydXN0dW0ucHJvamVjdGlvbk1hdHJpeCwgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4KTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIC8vIFVuZG8gdGhlIHZpZGVvIHJvdGF0aW9uIHNpbmNlIHdlIGFscmVhZHkgZW5jb2RlIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gaW4gb3VyIHZpZXcgcG9zZVxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBcImJhc2VcIiByb3RhdGlvbiBmb3IgdnVmb3JpYSdzIHZpZGVvIChhdCBsZWFzdCBvbiBpT1MpIGlzIHRoZSBsYW5kc2NhcGUgcmlnaHQgb3JpZW50YXRpb24sXG4gICAgICAgICAgICAgICAgLy8gd2hpY2ggaXMgdGhlIG9yaWVudGF0aW9uIHdoZXJlIHRoZSBkZXZpY2UgaXMgaGVsZCBpbiBsYW5kc2NhcGUgd2l0aCB0aGUgaG9tZSBidXR0b24gb24gdGhlIHJpZ2h0LiBcbiAgICAgICAgICAgICAgICAvLyBUaGlzIFwiYmFzZVwiIHZpZGVvIHJvdGF0YXRpb24gaXMgLTkwIGRlZyBhcm91bmQgK3ogZnJvbSB0aGUgcG9ydHJhaXQgaW50ZXJmYWNlIG9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgLy8gU28sIHdlIHdhbnQgdG8gdW5kbyB0aGlzIHJvdGF0aW9uIHdoaWNoIHZ1Zm9yaWEgYXBwbGllcyBmb3IgdXMuICBcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBjYWxjdWxhdGUgdGhpcyBtYXRyaXggb25seSB3aGVuIHdlIGhhdmUgdG8gKHdoZW4gdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBjaGFuZ2VzKVxuICAgICAgICAgICAgICAgIGNvbnN0IGludmVyc2VWaWRlb1JvdGF0aW9uTWF0cml4ID0gTWF0cml4NC5mcm9tVHJhbnNsYXRpb25RdWF0ZXJuaW9uUm90YXRpb25TY2FsZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5aRVJPLFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIChDZXNpdW1NYXRoLlBJX09WRVJfVFdPIC0gZ2V0U2NyZWVuT3JpZW50YXRpb24oKSAqIE1hdGguUEkgLyAxODApLCB0aGlzLl9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uKSxcbiAgICAgICAgICAgICAgICAgICAgT05FLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoTWF0cml4NFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocHJvamVjdGlvbk1hdHJpeCwgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICAgICAgLy8gY29udmVydCBmcm9tIHRoZSB2dWZvcmlhIHByb2plY3Rpb24gbWF0cml4ICgrWCAtWSArWikgdG8gYSBtb3JlIHN0YW5kYXJkIGNvbnZlbnRpb24gKCtYICtZIC1aKVxuICAgICAgICAgICAgICAgIC8vIGJ5IG5lZ2F0aW5nIHRoZSBhcHByb3ByaWF0ZSBjb2x1bW5zLiBcbiAgICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIudnVmb3JpYS5jb20vbGlicmFyeS9hcnRpY2xlcy9Tb2x1dGlvbi9Ib3ctVG8tVXNlLXRoZS1DYW1lcmEtUHJvamVjdGlvbi1NYXRyaXhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IC0xOyAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxXSAqPSAtMTsgLy8geVxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzhdICo9IC0xOyAgLy8geFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOV0gKj0gLTE7ICAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxMF0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzExXSAqPSAtMTsgLy8gd1xuXG4gICAgICAgICAgICAgICAgLy8gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHlCeVNjYWxlKHByb2plY3Rpb25NYXRyaXgsIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDEsLTEsLTEsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLCBwcm9qZWN0aW9uTWF0cml4KVxuXG4gICAgICAgICAgICAgICAgLy8gU2NhbGUgdGhlIHByb2plY3Rpb24gbWF0cml4IHRvIGZpdCBuaWNlbHkgd2l0aGluIGEgc3VidmlldyBvZiB0eXBlIFNJTkdVTEFSXG4gICAgICAgICAgICAgICAgLy8gKFRoaXMgc2NhbGUgd2lsbCBub3QgYXBwbHkgd2hlbiB0aGUgdXNlciBpcyB3ZWFyaW5nIGEgbW9ub2N1bGFyIEhNRCwgc2luY2UgYVxuICAgICAgICAgICAgICAgIC8vIG1vbm9jdWxhciBITUQgd291bGQgcHJvdmlkZSBhIHN1YnZpZXcgb2YgdHlwZSBMRUZURVlFIG9yIFJJR0hURVlFKVxuICAgICAgICAgICAgICAgIC8vIGlmIChzdWJ2aWV3LnR5cGUgPT0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVIpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3Qgd2lkdGhSYXRpbyA9IHN1YnZpZXdXaWR0aCAvIHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3QgaGVpZ2h0UmF0aW8gPSBzdWJ2aWV3SGVpZ2h0IC8gdmlkZW9Nb2RlLmhlaWdodDtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBhc3BlY3QgZmlsbFxuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWF4KHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gb3IgYXNwZWN0IGZpdFxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWluKHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB4LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFswXSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFszXSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB5LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs0XSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzVdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs3XSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUocHJvamVjdGlvbk1hdHJpeCwgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4KTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAvLyBjb25zdCBleWVBZGp1c3RtZW50TWF0cml4ID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3KTtcbiAgICAgICAgICAgIC8vIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocmF3UHJvamVjdGlvbk1hdHJpeCwgZXllQWRqdXN0bWVudE1hdHJpeCwgW10pO1xuICAgICAgICAgICAgLy8gcHJvamVjdGlvbk1hdHJpeCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0LmZyb21Sb3dNYWpvckFycmF5KHByb2plY3Rpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBkZWZhdWx0IHRvIGlkZW50aXR5IHN1YnZpZXcgcG9zZSAoaW4gcmVsYXRpb24gdG8gdGhlIG92ZXJhbGwgdmlldyBwb3NlKVxuICAgICAgICAgICAgLy8gVE9ETzogdXNlIGV5ZSBhZGp1c3RtZW50IG1hdHJpeCB0byBnZXQgc3VidmlldyBwb3NlcyAoZm9yIGV5ZSBzZXBhcmF0aW9uKS4gU2VlIGNvbW1lbnRlZCBvdXQgY29kZSBhYm92ZS4uLlxuICAgICAgICAgICAgc3Vidmlldy5wb3NlID0gdW5kZWZpbmVkOyBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCBvblN0YXJ0R2VvbG9jYXRpb25VcGRhdGVzKG9wdGlvbnM6QXJnb24uR2VvbG9jYXRpb25PcHRpb25zKSA6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMubG9jYXRpb25XYXRjaElkICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KT0+e1xuXG4gICAgICAgICAgICAvLyBOb3RlOiB0aGUgZC50cyBmb3IgbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uIGlzIHdyb25nLiBUaGlzIGNhbGwgaXMgY29ycmVjdC4gXG4gICAgICAgICAgICAvLyBDYXN0aW5nIHRoZSBtb2R1bGUgYXMgPGFueT4gaGVyZSBmb3Igbm93IHRvIGhpZGUgYW5ub3lpbmcgdHlwZXNjcmlwdCBlcnJvcnMuLi5cbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gKDxhbnk+Z2VvbG9jYXRpb24pLndhdGNoTG9jYXRpb24oKGxvY2F0aW9uOmdlb2xvY2F0aW9uLkxvY2F0aW9uKT0+e1xuICAgICAgICAgICAgICAgIC8vIE5vdGU6IGlPUyBkb2N1bWVudGF0aW9uIHN0YXRlcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSByZWZlcnMgdG8gaGVpZ2h0IChtZXRlcnMpIGFib3ZlIHNlYSBsZXZlbCwgYnV0IFxuICAgICAgICAgICAgICAgIC8vIGlmIGlvcyBpcyByZXBvcnRpbmcgdGhlIHN0YW5kYXJkIGdwcyBkZWZpbmVkIGFsdGl0dWRlLCB0aGVuIHRoaXMgdGhlb3JldGljYWwgXCJzZWEgbGV2ZWxcIiBhY3R1YWxseSByZWZlcnMgdG8gXG4gICAgICAgICAgICAgICAgLy8gdGhlIFdHUzg0IGVsbGlwc29pZCByYXRoZXIgdGhhbiB0cmFkaXRpb25hbCBtZWFuIHNlYSBsZXZlbCAoTVNMKSB3aGljaCBpcyBub3QgYSBzaW1wbGUgc3VyZmFjZSBhbmQgdmFyaWVzIFxuICAgICAgICAgICAgICAgIC8vIGFjY29yZGluZyB0byB0aGUgbG9jYWwgZ3Jhdml0YXRpb25hbCBmaWVsZC4gXG4gICAgICAgICAgICAgICAgLy8gSW4gb3RoZXIgd29yZHMsIG15IGJlc3QgZ3Vlc3MgaXMgdGhhdCB0aGUgYWx0aXR1ZGUgdmFsdWUgaGVyZSBpcyAqcHJvYmFibHkqIEdQUyBkZWZpbmVkIGFsdGl0dWRlLCB3aGljaCBcbiAgICAgICAgICAgICAgICAvLyBpcyBlcXVpdmFsZW50IHRvIHRoZSBoZWlnaHQgYWJvdmUgdGhlIFdHUzg0IGVsbGlwc29pZCwgd2hpY2ggaXMgZXhhY3RseSB3aGF0IENlc2l1bSBleHBlY3RzLi4uXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmVMb2NhbE9yaWdpbihcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubG9uZ2l0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubGF0aXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5hbHRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhvcml6b250YWxBY2N1cmFjeSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLnZlcnRpY2FsQWNjdXJhY3lcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAoZSk9PntcbiAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9LCA8Z2VvbG9jYXRpb24uT3B0aW9ucz57XG4gICAgICAgICAgICAgICAgZGVzaXJlZEFjY3VyYWN5OiBvcHRpb25zICYmIG9wdGlvbnMuZW5hYmxlSGlnaEFjY3VyYWN5ID8gXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmlvcyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAga0NMTG9jYXRpb25BY2N1cmFjeUJlc3QgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmhpZ2ggOiBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5S2lsb21ldGVyIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmFueSxcbiAgICAgICAgICAgICAgICB1cGRhdGVEaXN0YW5jZTogYXBwbGljYXRpb24uaW9zID8ga0NMRGlzdGFuY2VGaWx0ZXJOb25lIDogMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbG9jYXRpb24gd2F0Y2hlci4gXCIgKyB0aGlzLmxvY2F0aW9uV2F0Y2hJZCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFxuICAgIHByb3RlY3RlZCBvblN0b3BHZW9sb2NhdGlvblVwZGF0ZXMoKSA6IHZvaWQge1xuICAgICAgICBpZiAoQXJnb24uQ2VzaXVtLmRlZmluZWQodGhpcy5sb2NhdGlvbldhdGNoSWQpKSB7XG4gICAgICAgICAgICBnZW9sb2NhdGlvbi5jbGVhcldhdGNoKHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDQgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFZpZGVvUXVhdGVybmlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBpZiAodGhpcy5mb2N1c1NlcnZpY2VQcm92aWRlci5zZXNzaW9uID09IHNlc3Npb24pIHJldHVybjsgXG4gICAgICAgIGlmIChzZXNzaW9uID09IHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcikgcmV0dXJuO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZG9lcyBub3QgaGF2ZSBmb2N1cy4nKVxuICAgIH1cbiAgICBcbiAgICBoYW5kbGVSZXF1ZXN0UHJlc2VudEhNRChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2UgJiYgZGV2aWNlLnNldFZpZXdlckFjdGl2ZSh0cnVlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGhhbmRsZUV4aXRQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBfaXNIbWRBY3RpdmUoKSB7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICByZXR1cm4gZGV2aWNlLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuXG59Il19