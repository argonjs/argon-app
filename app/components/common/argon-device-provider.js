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
                var deviceStage = this.stage;
                if (!deviceUser.position)
                    deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation)
                    deviceUser.orientation = new Argon.Cesium.ConstantProperty();
                deviceUser.position.setValue(Cartesian3.fromElements(0, 0, this.deviceState.suggestedUserHeight, this._scratchCartesian), deviceStage);
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
                var deviceStage = this.stage;
                if (!deviceUser.position)
                    deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation)
                    deviceUser.orientation = new Argon.Cesium.ConstantProperty();
                deviceUser.position.setValue(Cartesian3.fromElements(0, 0, this.deviceState.suggestedUserHeight, this._scratchCartesian), deviceStage);
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
            // console.log("NO Magnetometer and/or Gyro. " );
            return undefined;
        }
        else {
            var effectiveReferenceFrame = void 0;
            if (CMMotionManager.availableAttitudeReferenceFrames() & 8 /* XTrueNorthZVertical */) {
                effectiveReferenceFrame = 8 /* XTrueNorthZVertical */;
                motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
            }
            else {
                // console.log("NO  CMAttitudeReferenceFrameXTrueNorthZVertical" );
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
            subviewViewport.x = vuforiaSubviewViewport.x / contentScaleFactor;
            subviewViewport.y = vuforiaSubviewViewport.y / contentScaleFactor;
            subviewViewport.width = vuforiaSubviewViewport.z / contentScaleFactor;
            subviewViewport.height = vuforiaSubviewViewport.w / contentScaleFactor;
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
                _this.configureStage(location.longitude, location.latitude, location.altitude, location.horizontalAccuracy, location.verticalAccuracy);
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
                updateDistance: application.ios ? kCLDistanceFilterNone : 0,
                minimumUpdateTime: options && options.enableHighAccuracy ?
                    0 : 5000 // required on Android, ignored on iOS
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyw4Q0FBZ0Q7QUFDaEQsaUNBQW1DO0FBRW5DLHNDQUF3QztBQUV4QywrQkFBMkM7QUFFM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBR2xDLElBQWEseUJBQXlCO0lBQVMsNkNBQW1CO0lBRTlELG1DQUNJLGNBQW1DLEVBQ25DLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLHNCQUFtRDtRQUp2RCxZQUtJLGtCQUFNLGNBQWMsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLFNBc0JyRDtRQUVPLGtCQUFZLEdBQUcsV0FBVyxDQUFDO1FBQzNCLGdDQUEwQixHQUFHLElBQUksVUFBVSxDQUFDO1FBQzVDLCtCQUF5QixHQUFHLElBQUksVUFBVSxDQUFDO1FBRTNDLFNBQUcsR0FBRyxDQUFDLENBQUM7UUFDUixnQkFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FB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SUFFRCxnRUFBb0IsR0FBcEIsVUFBcUIsT0FBeUI7UUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN0RCxNQUFNLElBQUksTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFTSx3REFBWSxHQUFuQjtRQUNJLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN0RCxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTCx3Q0FBQztBQUFELENBQUMsQUFoUUQsQ0FBdUQsS0FBSyxDQUFDLHFCQUFxQixHQWdRakY7QUFoUVksaUNBQWlDO0lBRDdDLEtBQUssQ0FBQyxFQUFFLENBQUMsVUFBVTs2Q0FJRyxLQUFLLENBQUMsY0FBYyxFQUNyQixLQUFLLENBQUMsYUFBYSxFQUNsQixLQUFLLENBQUMsY0FBYyxFQUN2QixLQUFLLENBQUMsV0FBVyxFQUNMLEtBQUssQ0FBQyxzQkFBc0IsRUFDdkIsS0FBSyxDQUFDLG9CQUFvQixFQUN4QyxLQUFLLENBQUMsY0FBYztHQVQ5QixpQ0FBaUMsQ0FnUTdDO0FBaFFZLDhFQUFpQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gXCJhcHBsaWNhdGlvblwiO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0ICogYXMgZ2VvbG9jYXRpb24gZnJvbSAnc3BlaWdnLW5hdGl2ZXNjcmlwdC1nZW9sb2NhdGlvbic7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgZW51bXMgZnJvbSAndWkvZW51bXMnO1xuXG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGZyYW1lcyBmcm9tICd1aS9mcmFtZSc7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1wcm92aWRlcidcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gXCJAYXJnb25qcy9hcmdvblwiO1xuXG5pbXBvcnQge2dldFNjcmVlbk9yaWVudGF0aW9ufSBmcm9tICcuL3V0aWwnXG5cbmNvbnN0IENhcnRlc2lhbjMgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbmNvbnN0IFF1YXRlcm5pb24gPSBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcbmNvbnN0IENlc2l1bU1hdGggPSBBcmdvbi5DZXNpdW0uQ2VzaXVtTWF0aDtcbmNvbnN0IE1hdHJpeDQgICAgPSBBcmdvbi5DZXNpdW0uTWF0cml4NDtcblxuY29uc3QgejkwID0gUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCBDZXNpdW1NYXRoLlBJX09WRVJfVFdPKTtcbmNvbnN0IE9ORSA9IG5ldyBDYXJ0ZXNpYW4zKDEsMSwxKTtcblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlIGV4dGVuZHMgQXJnb24uRGV2aWNlU2VydmljZSB7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSwgXG4gICAgICAgIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICB2dWZvcmlhU2VydmljZVByb3ZpZGVyOkFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpIHtcbiAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIGNvbnRleHRTZXJ2aWNlLCB2aWV3U2VydmljZSk7XG5cbiAgICAgICAgY29uc3QgdnNwID0gPE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI+dnVmb3JpYVNlcnZpY2VQcm92aWRlcjtcbiAgICAgICAgbGV0IG5vdzpudW1iZXI7XG5cbiAgICAgICAgY29uc3QgZXhlY3V0ZUNhbGxiYWNrID0gKGNiLCBpZCkgPT4ge1xuICAgICAgICAgICAgY2Iobm93KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2c3Auc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICBub3cgPSBnbG9iYWwucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICAvLyBzd2FwIGNhbGxiYWNrIG1hcHNcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcztcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrczI7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MyID0gY2FsbGJhY2tzO1xuICAgICAgICAgICAgY2FsbGJhY2tzLmZvckVhY2goZXhlY3V0ZUNhbGxiYWNrKTtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5jbGVhcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB2c3Auc3RhdGVVcGRhdGVFdmVudC5yYWlzZUV2ZW50KEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlLm5vdygpKSwgMzQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfYXBwbGljYXRpb24gPSBhcHBsaWNhdGlvbjtcbiAgICBwcml2YXRlIF9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uID0gbmV3IFF1YXRlcm5pb247XG4gICAgcHJpdmF0ZSBfc2NyYXRjaERldmljZU9yaWVudGF0aW9uID0gbmV3IFF1YXRlcm5pb247XG5cbiAgICBwcml2YXRlIF9pZCA9IDA7XG4gICAgcHJpdmF0ZSBfY2FsbGJhY2tzID0gbmV3IE1hcDxudW1iZXIsIEZ1bmN0aW9uPigpO1xuICAgIHByaXZhdGUgX2NhbGxiYWNrczIgPSBuZXcgTWFwPG51bWJlciwgRnVuY3Rpb24+KCk7XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSAoY2I6KHRpbWVzdGFtcDpudW1iZXIpPT52b2lkKSA9PiB7XG4gICAgICAgIHRoaXMuX2lkKys7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrcy5zZXQodGhpcy5faWQsIGNiKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKGlkOm51bWJlcikgPT4ge1xuICAgICAgICB0aGlzLl9jYWxsYmFja3MuZGVsZXRlKGlkKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2NyZWVuT3JpZW50YXRpb25EZWdyZWVzKCkge1xuICAgICAgICByZXR1cm4gZ2V0U2NyZWVuT3JpZW50YXRpb24oKTtcbiAgICB9XG4gICAgXG4gICAgb25VcGRhdGVGcmFtZVN0YXRlKCkge1xuXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0ID0gdGhpcy5kZXZpY2VTdGF0ZS52aWV3cG9ydCA9IHRoaXMuZGV2aWNlU3RhdGUudmlld3BvcnQgfHwgPEFyZ29uLlZpZXdwb3J0Pnt9O1xuICAgICAgICBjb25zdCBjb250ZW50VmlldyA9IGZyYW1lcy50b3Btb3N0KCkuY3VycmVudFBhZ2UuY29udGVudDtcbiAgICAgICAgdmlld3BvcnQueCA9IDA7XG4gICAgICAgIHZpZXdwb3J0LnkgPSAwO1xuICAgICAgICB2aWV3cG9ydC53aWR0aCA9IGNvbnRlbnRWaWV3LmdldEFjdHVhbFNpemUoKS53aWR0aDsgLy9nZXRNZWFzdXJlZFdpZHRoKCk7XG4gICAgICAgIHZpZXdwb3J0LmhlaWdodCA9IGNvbnRlbnRWaWV3LmdldEFjdHVhbFNpemUoKS5oZWlnaHQ7IC8vZ2V0TWVhc3VyZWRIZWlnaHQoKTtcblxuICAgICAgICBzdXBlci5vblVwZGF0ZUZyYW1lU3RhdGUoKTtcblxuICAgICAgICBpZiAodGhpcy5fYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gdGhpcy5fZ2V0TW90aW9uTWFuYWdlcklPUygpO1xuICAgICAgICAgICAgY29uc3QgbW90aW9uID0gbW90aW9uTWFuYWdlciAmJiBtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvbjtcblxuICAgICAgICAgICAgaWYgKG1vdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdGlvblF1YXRlcm5pb24gPSA8QXJnb24uQ2VzaXVtLlF1YXRlcm5pb24+bW90aW9uLmF0dGl0dWRlLnF1YXRlcm5pb247XG5cbiAgICAgICAgICAgICAgICAvLyBBcHBsZSdzIG9yaWVudGF0aW9uIGlzIHJlcG9ydGVkIGluIE5XVSwgc28gd2UgY29udmVydCB0byBFTlUgYnkgYXBwbHlpbmcgYSBnbG9iYWwgcm90YXRpb24gb2ZcbiAgICAgICAgICAgICAgICAvLyA5MCBkZWdyZWVzIGFib3V0ICt6IHRvIHRoZSBOV1Ugb3JpZW50YXRpb24gKG9yIGFwcGx5aW5nIHRoZSBOV1UgcXVhdGVybmlvbiBhcyBhIGxvY2FsIHJvdGF0aW9uIFxuICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBzdGFydGluZyBvcmllbnRhdGlvbiBvZiA5MCBkZWdyZXNzIGFib3V0ICt6KS4gXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogV2l0aCBxdWF0ZXJuaW9uIG11bHRpcGxpY2F0aW9uIHRoZSBgKmAgc3ltYm9sIGNhbiBiZSByZWFkIGFzICdyb3RhdGVzJy4gXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9yaWVudGF0aW9uIChPKSBpcyBvbiB0aGUgcmlnaHQgYW5kIHRoZSByb3RhdGlvbiAoUikgaXMgb24gdGhlIGxlZnQsIFxuICAgICAgICAgICAgICAgIC8vIHN1Y2ggdGhhdCB0aGUgbXVsdGlwbGljYXRpb24gb3JkZXIgaXMgUipPLCB0aGVuIFIgaXMgYSBnbG9iYWwgcm90YXRpb24gYmVpbmcgYXBwbGllZCBvbiBPLiBcbiAgICAgICAgICAgICAgICAvLyBMaWtld2lzZSwgdGhlIHJldmVyc2UsIE8qUiwgaXMgYSBsb2NhbCByb3RhdGlvbiBSIGFwcGxpZWQgdG8gdGhlIG9yaWVudGF0aW9uIE8uIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZU9yaWVudGF0aW9uID0gUXVhdGVybmlvbi5tdWx0aXBseSh6OTAsIG1vdGlvblF1YXRlcm5pb24sIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgPSB0aGlzLmZyYW1lU3RhdGUuc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlVXNlciA9IHRoaXMudXNlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VTdGFnZSA9IHRoaXMuc3RhZ2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIucG9zaXRpb24pIGRldmljZVVzZXIucG9zaXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSgpO1xuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5vcmllbnRhdGlvbikgZGV2aWNlVXNlci5vcmllbnRhdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSgpO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSkuc2V0VmFsdWUoXG4gICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDAsMCx0aGlzLmRldmljZVN0YXRlLnN1Z2dlc3RlZFVzZXJIZWlnaHQsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLFxuICAgICAgICAgICAgICAgICAgICBkZXZpY2VTdGFnZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlVOSVRfWiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24ubXVsdGlwbHkoXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VPcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KS5zZXRWYWx1ZShzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRMb2NhdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkaW5nID0gbG9jYXRpb25NYW5hZ2VyLmhlYWRpbmc7XG4gICAgICAgICAgICAgICAgZGV2aWNlVXNlclsnbWV0YSddID0gZGV2aWNlVXNlclsnbWV0YSddIHx8IHt9O1xuICAgICAgICAgICAgICAgIGRldmljZVVzZXJbJ21ldGEnXS5nZW9IZWFkaW5nQWNjdXJhY3kgPSBoZWFkaW5nICYmIGhlYWRpbmcuaGVhZGluZ0FjY3VyYWN5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYXBwbGljYXRpb24uYW5kcm9pZCkge1xuXG4gICAgICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gdGhpcy5fZ2V0TW90aW9uTWFuYWdlckFuZHJvaWQoKTtcbiAgICAgICAgICAgIGlmIChtb3Rpb25NYW5hZ2VyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlT3JpZW50YXRpb24gPSB0aGlzLl9tb3Rpb25RdWF0ZXJuaW9uQW5kcm9pZDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyA9IHRoaXMuZnJhbWVTdGF0ZS5zY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXM7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVN0YWdlID0gdGhpcy5zdGFnZTtcblxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5wb3NpdGlvbikgZGV2aWNlVXNlci5wb3NpdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLm9yaWVudGF0aW9uKSBkZXZpY2VVc2VyLm9yaWVudGF0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMCwwLHRoaXMuZGV2aWNlU3RhdGUuc3VnZ2VzdGVkVXNlckhlaWdodCwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksXG4gICAgICAgICAgICAgICAgICAgIGRldmljZVN0YWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuVU5JVF9aLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZU9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbW90aW9uTWFuYWdlcklPUz86Q01Nb3Rpb25NYW5hZ2VyO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TW90aW9uTWFuYWdlcklPUygpIDogQ01Nb3Rpb25NYW5hZ2VyfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICh0aGlzLl9tb3Rpb25NYW5hZ2VySU9TKSByZXR1cm4gdGhpcy5fbW90aW9uTWFuYWdlcklPUztcblxuICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gQ01Nb3Rpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuICAgICAgICBtb3Rpb25NYW5hZ2VyLnNob3dzRGV2aWNlTW92ZW1lbnREaXNwbGF5ID0gdHJ1ZVxuICAgICAgICBtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvblVwZGF0ZUludGVydmFsID0gMS4wIC8gMTAwLjA7XG4gICAgICAgIGlmICghbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25BdmFpbGFibGUgfHwgIW1vdGlvbk1hbmFnZXIubWFnbmV0b21ldGVyQXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk5PIE1hZ25ldG9tZXRlciBhbmQvb3IgR3lyby4gXCIgKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWU6Q01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lO1xuICAgICAgICAgICAgaWYgKENNTW90aW9uTWFuYWdlci5hdmFpbGFibGVBdHRpdHVkZVJlZmVyZW5jZUZyYW1lcygpICYgQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWwpIHtcbiAgICAgICAgICAgICAgICBlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSA9IENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsO1xuICAgICAgICAgICAgICAgIG1vdGlvbk1hbmFnZXIuc3RhcnREZXZpY2VNb3Rpb25VcGRhdGVzVXNpbmdSZWZlcmVuY2VGcmFtZShlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTk8gIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZVhUcnVlTm9ydGhaVmVydGljYWxcIiApO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbW90aW9uTWFuYWdlcklPUyA9IG1vdGlvbk1hbmFnZXI7XG4gICAgICAgIHJldHVybiBtb3Rpb25NYW5hZ2VyO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2xvY2F0aW9uTWFuYWdlcklPUz86Q0xMb2NhdGlvbk1hbmFnZXI7XG5cbiAgICBwcml2YXRlIF9nZXRMb2NhdGlvbk1hbmFnZXJJT1MoKSB7XG4gICAgICAgIGlmICghdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TKSB7XG4gICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MgPSBDTExvY2F0aW9uTWFuYWdlci5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICAgICAgc3dpdGNoIChDTExvY2F0aW9uTWFuYWdlci5hdXRob3JpemF0aW9uU3RhdHVzKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZFdoZW5JblVzZTpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZEFsd2F5czogXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNOb3REZXRlcm1pbmVkOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MucmVxdWVzdFdoZW5JblVzZUF1dGhvcml6YXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0RlbmllZDpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzUmVzdHJpY3RlZDpcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFjdGlvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJMb2NhdGlvbiBTZXJ2aWNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEluIG9yZGVyIHRvIHByb3ZpZGUgdGhlIGJlc3QgQXVnbWVudGVkIFJlYWxpdHkgZXhwZXJpZW5jZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxlYXNlIG9wZW4gdGhpcyBhcHAncyBzZXR0aW5ncyBhbmQgZW5hYmxlIGxvY2F0aW9uIHNlcnZpY2VzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwiQ2FuY2VsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ1NldHRpbmdzJ11cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbigoYWN0aW9uKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ1NldHRpbmdzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IE5TVVJMLlVSTFdpdGhTdHJpbmcoVUlBcHBsaWNhdGlvbk9wZW5TZXR0aW5nc1VSTFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5vcGVuVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUztcbiAgICB9XG5cbiAgICBwcml2YXRlIF9tb3Rpb25NYW5hZ2VyQW5kcm9pZD86YW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyO1xuICAgIHByaXZhdGUgX21vdGlvblF1YXRlcm5pb25BbmRyb2lkID0gbmV3IFF1YXRlcm5pb247XG5cbiAgICBwcml2YXRlIF9nZXRNb3Rpb25NYW5hZ2VyQW5kcm9pZCgpIDogYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICh0aGlzLl9tb3Rpb25NYW5hZ2VyQW5kcm9pZCkgcmV0dXJuIHRoaXMuX21vdGlvbk1hbmFnZXJBbmRyb2lkO1xuXG4gICAgICAgIHZhciBzZW5zb3JNYW5hZ2VyID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkuZ2V0U3lzdGVtU2VydmljZShhbmRyb2lkLmNvbnRlbnQuQ29udGV4dC5TRU5TT1JfU0VSVklDRSk7XG4gICAgICAgIHZhciByb3RhdGlvblNlbnNvciA9IHNlbnNvck1hbmFnZXIuZ2V0RGVmYXVsdFNlbnNvcihhbmRyb2lkLmhhcmR3YXJlLlNlbnNvci5UWVBFX1JPVEFUSU9OX1ZFQ1RPUik7XG5cbiAgICAgICAgdmFyIHNlbnNvckV2ZW50TGlzdGVuZXIgPSBuZXcgYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uQWNjdXJhY3lDaGFuZ2VkOiAoc2Vuc29yLCBhY2N1cmFjeSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJvbkFjY3VyYWN5Q2hhbmdlZDogXCIgKyBhY2N1cmFjeSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TZW5zb3JDaGFuZ2VkOiAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLnVucGFjayg8bnVtYmVyW10+ZXZlbnQudmFsdWVzLCAwLCB0aGlzLl9tb3Rpb25RdWF0ZXJuaW9uQW5kcm9pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlbnNvck1hbmFnZXIucmVnaXN0ZXJMaXN0ZW5lcihzZW5zb3JFdmVudExpc3RlbmVyLCByb3RhdGlvblNlbnNvciwgYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JNYW5hZ2VyLlNFTlNPUl9ERUxBWV9HQU1FKTtcbiAgICAgICAgdGhpcy5fbW90aW9uTWFuYWdlckFuZHJvaWQgPSBzZW5zb3JFdmVudExpc3RlbmVyO1xuICAgICAgICByZXR1cm4gc2Vuc29yRXZlbnRMaXN0ZW5lcjtcbiAgICB9XG59XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyIGV4dGVuZHMgQXJnb24uRGV2aWNlU2VydmljZVByb3ZpZGVyIHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgY29udGFpbmVyLCBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICBkZXZpY2VTZXJ2aWNlOkFyZ29uLkRldmljZVNlcnZpY2UsIFxuICAgICAgICBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSwgXG4gICAgICAgIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZTpBcmdvbi5Db250ZXh0U2VydmljZVByb3ZpZGVyLFxuICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIHNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgICAgIGRldmljZVNlcnZpY2UsIFxuICAgICAgICAgICAgY29udGV4dFNlcnZpY2UsIFxuICAgICAgICAgICAgdmlld1NlcnZpY2UsICAgICAgICAgXG4gICAgICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZVxuICAgICAgICApO1xuXG4gICAgICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKT0+e1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaERldmljZVN0YXRlKCk7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoRGV2aWNlU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2NhdGlvbldhdGNoSWQ/Om51bWJlcjtcblxuICAgIC8vIHByaXZhdGUgX3NjcmF0Y2hDYXJ0ZXNpYW4gPSBuZXcgQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFBlcnNwZWN0aXZlRnJ1c3R1bSA9IG5ldyBBcmdvbi5DZXNpdW0uUGVyc3BlY3RpdmVGcnVzdHVtO1xuXG4gICAgcHJvdGVjdGVkIG9uVXBkYXRlRGV2aWNlU3RhdGUoZGV2aWNlU3RhdGU6QXJnb24uRGV2aWNlU3RhdGUpIHtcblxuICAgICAgICBpZiAoIWRldmljZVN0YXRlLmlzUHJlc2VudGluZ0hNRCB8fCAhdnVmb3JpYS5hcGkpIHtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnZpZXdwb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUuc3Vidmlld3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS5zdHJpY3QgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1YnZpZXdzID0gZGV2aWNlU3RhdGUuc3Vidmlld3MgPSBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyB8fCBbXTtcblxuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nUHJpbWl0aXZlcyA9IGRldmljZS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk7XG4gICAgICAgIGNvbnN0IHJlbmRlcmluZ1ZpZXdzID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRSZW5kZXJpbmdWaWV3cygpO1xuICAgICAgICBjb25zdCBudW1WaWV3cyA9IHJlbmRlcmluZ1ZpZXdzLmdldE51bVZpZXdzKCk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gKDxVSVZpZXc+dnVmb3JpYS52aWRlb1ZpZXcuaW9zKS5jb250ZW50U2NhbGVGYWN0b3IgOiAxO1xuXG4gICAgICAgIHN1YnZpZXdzLmxlbmd0aCA9IG51bVZpZXdzO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVmlld3M7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IHJlbmRlcmluZ1ZpZXdzLmdldFZpZXcoaSk7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IHN1cHBvcnQgUG9zdFByb2Nlc3MgcmVuZGVyaW5nIHN1YnZpZXdcbiAgICAgICAgICAgIGlmICh2aWV3ID09PSB2dWZvcmlhLlZpZXcuUG9zdFByb2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBzdWJ2aWV3cy5sZW5ndGgtLTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3VidmlldyA9IHN1YnZpZXdzW2ldID0gc3Vidmlld3NbaV0gfHwgPEFyZ29uLlNlcmlhbGl6ZWRTdWJ2aWV3Pnt9O1xuXG4gICAgICAgICAgICAvLyBTZXQgc3VidmlldyB0eXBlXG4gICAgICAgICAgICBzd2l0Y2ggKHZpZXcpIHtcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5MZWZ0RXllOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5MRUZURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5SaWdodEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuUklHSFRFWUU7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LlNpbmd1bGFyOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuT1RIRVI7IGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgc3VidmlldyB2aWV3cG9ydFxuICAgICAgICAgICAgY29uc3QgdnVmb3JpYVN1YnZpZXdWaWV3cG9ydCA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0Vmlld3BvcnQodmlldyk7XG4gICAgICAgICAgICBjb25zdCBzdWJ2aWV3Vmlld3BvcnQgPSBzdWJ2aWV3LnZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCB8fCA8QXJnb24uVmlld3BvcnQ+e307XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueCAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC55ID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC55IC8gY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LndpZHRoID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC56IC8gY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LmhlaWdodCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQudyAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcblxuICAgICAgICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgcHJvamVjdGlvbiBtYXRyaXggZm9yIHRoaXMgc3Vidmlld1xuICAgICAgICAgICAgLy8gTm90ZTogVnVmb3JpYSB1c2VzIGEgcmlnaHQtaGFuZGVkIHByb2plY3Rpb24gbWF0cml4IHdpdGggeCB0byB0aGUgcmlnaHQsIHkgZG93biwgYW5kIHogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLlxuICAgICAgICAgICAgLy8gU28gd2UgYXJlIGNvbnZlcnRpbmcgdG8gYSBtb3JlIHN0YW5kYXJkIGNvbnZlbnRpb24gb2YgeCB0byB0aGUgcmlnaHQsIHkgdXAsIGFuZCAteiBhcyB0aGUgdmlld2luZyBkaXJlY3Rpb24uIFxuICAgICAgICAgICAgbGV0IHByb2plY3Rpb25NYXRyaXggPSA8YW55PnJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3LCB2dWZvcmlhLkNvb3JkaW5hdGVTeXN0ZW1UeXBlLkNhbWVyYSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaXNGaW5pdGUocHJvamVjdGlvbk1hdHJpeFswXSkpIHtcblxuICAgICAgICAgICAgICAgIC8vIGlmIG91ciBwcm9qZWN0aW9uIG1hdHJpeCBpcyBnaXZpbmcgbnVsbCB2YWx1ZXMgdGhlbiB0aGVcbiAgICAgICAgICAgICAgICAvLyBzdXJmYWNlIGlzIG5vdCBwcm9wZXJseSBjb25maWd1cmVkIGZvciBzb21lIHJlYXNvbiwgc28gcmVzZXQgaXRcbiAgICAgICAgICAgICAgICAvLyAobm90IHN1cmUgd2h5IHRoaXMgaGFwcGVucywgYnV0IGl0IG9ubHkgc2VlbXMgdG8gaGFwcGVuIGFmdGVyIG9yIGJldHdlZW4gXG4gICAgICAgICAgICAgICAgLy8gdnVmb3JpYSBpbml0aWFsaXphdGlvbnMpXG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSB2dWZvcmlhLnZpZGVvVmlldy5pb3MgPyB2dWZvcmlhLnZpZGVvVmlldy5pb3MuZnJhbWUuc2l6ZS53aWR0aCA6IHZ1Zm9yaWEudmlkZW9WaWV3LmFuZHJvaWQuZ2V0V2lkdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmZyYW1lLnNpemUuaGVpZ2h0IDogdnVmb3JpYS52aWRlb1ZpZXcuYW5kcm9pZC5nZXRIZWlnaHQoKTtcbiAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5hcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoICogY29udGVudFNjYWxlRmFjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0ICogY29udGVudFNjYWxlRmFjdG9yXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZnJ1c3R1bSA9IHRoaXMuX3NjcmF0Y2hQZXJzcGVjdGl2ZUZydXN0dW07XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mb3YgPSBNYXRoLlBJLzI7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5uZWFyID0gMC4wMTtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmZhciA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uYXNwZWN0UmF0aW8gPSBzdWJ2aWV3Vmlld3BvcnQud2lkdGggLyBzdWJ2aWV3Vmlld3BvcnQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIGlmICghaXNGaW5pdGUoZnJ1c3R1bS5hc3BlY3RSYXRpbykgfHwgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9PT0gMCkgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9IDE7XG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShmcnVzdHVtLnByb2plY3Rpb25NYXRyaXgsIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAvLyBVbmRvIHRoZSB2aWRlbyByb3RhdGlvbiBzaW5jZSB3ZSBhbHJlYWR5IGVuY29kZSB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGluIG91ciB2aWV3IHBvc2VcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiB0aGUgXCJiYXNlXCIgcm90YXRpb24gZm9yIHZ1Zm9yaWEncyB2aWRlbyAoYXQgbGVhc3Qgb24gaU9TKSBpcyB0aGUgbGFuZHNjYXBlIHJpZ2h0IG9yaWVudGF0aW9uLFxuICAgICAgICAgICAgICAgIC8vIHdoaWNoIGlzIHRoZSBvcmllbnRhdGlvbiB3aGVyZSB0aGUgZGV2aWNlIGlzIGhlbGQgaW4gbGFuZHNjYXBlIHdpdGggdGhlIGhvbWUgYnV0dG9uIG9uIHRoZSByaWdodC4gXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBcImJhc2VcIiB2aWRlbyByb3RhdGF0aW9uIGlzIC05MCBkZWcgYXJvdW5kICt6IGZyb20gdGhlIHBvcnRyYWl0IGludGVyZmFjZSBvcmllbnRhdGlvblxuICAgICAgICAgICAgICAgIC8vIFNvLCB3ZSB3YW50IHRvIHVuZG8gdGhpcyByb3RhdGlvbiB3aGljaCB2dWZvcmlhIGFwcGxpZXMgZm9yIHVzLiAgXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogY2FsY3VsYXRlIHRoaXMgbWF0cml4IG9ubHkgd2hlbiB3ZSBoYXZlIHRvICh3aGVuIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gY2hhbmdlcylcbiAgICAgICAgICAgICAgICBjb25zdCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCA9IE1hdHJpeDQuZnJvbVRyYW5zbGF0aW9uUXVhdGVybmlvblJvdGF0aW9uU2NhbGUoXG4gICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuWkVSTyxcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCAoQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyAtIGdldFNjcmVlbk9yaWVudGF0aW9uKCkgKiBNYXRoLlBJIC8gMTgwKSwgdGhpcy5fc2NyYXRjaFZpZGVvUXVhdGVybmlvbiksXG4gICAgICAgICAgICAgICAgICAgIE9ORSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaE1hdHJpeDRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIEFyZ29uLkNlc2l1bS5NYXRyaXg0Lm11bHRpcGx5KHByb2plY3Rpb25NYXRyaXgsIGludmVyc2VWaWRlb1JvdGF0aW9uTWF0cml4LCBwcm9qZWN0aW9uTWF0cml4KTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnZlcnQgZnJvbSB0aGUgdnVmb3JpYSBwcm9qZWN0aW9uIG1hdHJpeCAoK1ggLVkgK1opIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uICgrWCArWSAtWilcbiAgICAgICAgICAgICAgICAvLyBieSBuZWdhdGluZyB0aGUgYXBwcm9wcmlhdGUgY29sdW1ucy4gXG4gICAgICAgICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLnZ1Zm9yaWEuY29tL2xpYnJhcnkvYXJ0aWNsZXMvU29sdXRpb24vSG93LVRvLVVzZS10aGUtQ2FtZXJhLVByb2plY3Rpb24tTWF0cml4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFswXSAqPSAtMTsgLy8geFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMV0gKj0gLTE7IC8vIHlcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzJdICo9IC0xOyAvLyB6XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFszXSAqPSAtMTsgLy8gd1xuXG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs4XSAqPSAtMTsgIC8vIHhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzldICo9IC0xOyAgLy8geVxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMTBdICo9IC0xOyAvLyB6XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxMV0gKj0gLTE7IC8vIHdcblxuICAgICAgICAgICAgICAgIC8vIEFyZ29uLkNlc2l1bS5NYXRyaXg0Lm11bHRpcGx5QnlTY2FsZShwcm9qZWN0aW9uTWF0cml4LCBDYXJ0ZXNpYW4zLmZyb21FbGVtZW50cygxLC0xLC0xLCB0aGlzLl9zY3JhdGNoQ2FydGVzaWFuKSwgcHJvamVjdGlvbk1hdHJpeClcblxuICAgICAgICAgICAgICAgIC8vIFNjYWxlIHRoZSBwcm9qZWN0aW9uIG1hdHJpeCB0byBmaXQgbmljZWx5IHdpdGhpbiBhIHN1YnZpZXcgb2YgdHlwZSBTSU5HVUxBUlxuICAgICAgICAgICAgICAgIC8vIChUaGlzIHNjYWxlIHdpbGwgbm90IGFwcGx5IHdoZW4gdGhlIHVzZXIgaXMgd2VhcmluZyBhIG1vbm9jdWxhciBITUQsIHNpbmNlIGFcbiAgICAgICAgICAgICAgICAvLyBtb25vY3VsYXIgSE1EIHdvdWxkIHByb3ZpZGUgYSBzdWJ2aWV3IG9mIHR5cGUgTEVGVEVZRSBvciBSSUdIVEVZRSlcbiAgICAgICAgICAgICAgICAvLyBpZiAoc3Vidmlldy50eXBlID09IEFyZ29uLlN1YnZpZXdUeXBlLlNJTkdVTEFSKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IHdpZHRoUmF0aW8gPSBzdWJ2aWV3V2lkdGggLyB2aWRlb01vZGUud2lkdGg7XG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IGhlaWdodFJhdGlvID0gc3Vidmlld0hlaWdodCAvIHZpZGVvTW9kZS5oZWlnaHQ7XG5cbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gYXNwZWN0IGZpbGxcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3Qgc2NhbGVGYWN0b3IgPSBNYXRoLm1heCh3aWR0aFJhdGlvLCBoZWlnaHRSYXRpbyk7XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIG9yIGFzcGVjdCBmaXRcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gY29uc3Qgc2NhbGVGYWN0b3IgPSBNYXRoLm1pbih3aWR0aFJhdGlvLCBoZWlnaHRSYXRpbyk7XG5cbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gc2NhbGUgeC1heGlzXG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMF0gKj0gc2NhbGVGYWN0b3I7IC8vIHhcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFsxXSAqPSBzY2FsZUZhY3RvcjsgLy8geVxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzJdICo9IHNjYWxlRmFjdG9yOyAvLyB6XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbM10gKj0gc2NhbGVGYWN0b3I7IC8vIHdcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gc2NhbGUgeS1heGlzXG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNF0gKj0gc2NhbGVGYWN0b3I7IC8vIHhcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs1XSAqPSBzY2FsZUZhY3RvcjsgLy8geVxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzZdICo9IHNjYWxlRmFjdG9yOyAvLyB6XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbN10gKj0gc2NhbGVGYWN0b3I7IC8vIHdcbiAgICAgICAgICAgICAgICAvLyB9XG5cbiAgICAgICAgICAgICAgICBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXggPSBNYXRyaXg0LmNsb25lKHByb2plY3Rpb25NYXRyaXgsIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgLy8gY29uc3QgZXllQWRqdXN0bWVudE1hdHJpeCA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgodmlldyk7XG4gICAgICAgICAgICAvLyBsZXQgcHJvamVjdGlvbk1hdHJpeCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0Lm11bHRpcGx5KHJhd1Byb2plY3Rpb25NYXRyaXgsIGV5ZUFkanVzdG1lbnRNYXRyaXgsIFtdKTtcbiAgICAgICAgICAgIC8vIHByb2plY3Rpb25NYXRyaXggPSBBcmdvbi5DZXNpdW0uTWF0cml4NC5mcm9tUm93TWFqb3JBcnJheShwcm9qZWN0aW9uTWF0cml4LCBwcm9qZWN0aW9uTWF0cml4KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gZGVmYXVsdCB0byBpZGVudGl0eSBzdWJ2aWV3IHBvc2UgKGluIHJlbGF0aW9uIHRvIHRoZSBvdmVyYWxsIHZpZXcgcG9zZSlcbiAgICAgICAgICAgIC8vIFRPRE86IHVzZSBleWUgYWRqdXN0bWVudCBtYXRyaXggdG8gZ2V0IHN1YnZpZXcgcG9zZXMgKGZvciBleWUgc2VwYXJhdGlvbikuIFNlZSBjb21tZW50ZWQgb3V0IGNvZGUgYWJvdmUuLi5cbiAgICAgICAgICAgIHN1YnZpZXcucG9zZSA9IHVuZGVmaW5lZDsgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgb25TdGFydEdlb2xvY2F0aW9uVXBkYXRlcyhvcHRpb25zOkFyZ29uLkdlb2xvY2F0aW9uT3B0aW9ucykgOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmxvY2F0aW9uV2F0Y2hJZCAhPT0gJ3VuZGVmaW5lZCcpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTs7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCk9PntcblxuICAgICAgICAgICAgLy8gTm90ZTogdGhlIGQudHMgZm9yIG5hdGl2ZXNjcmlwdC1nZW9sb2NhdGlvbiBpcyB3cm9uZy4gVGhpcyBjYWxsIGlzIGNvcnJlY3QuIFxuICAgICAgICAgICAgLy8gQ2FzdGluZyB0aGUgbW9kdWxlIGFzIDxhbnk+IGhlcmUgZm9yIG5vdyB0byBoaWRlIGFubm95aW5nIHR5cGVzY3JpcHQgZXJyb3JzLi4uXG4gICAgICAgICAgICB0aGlzLmxvY2F0aW9uV2F0Y2hJZCA9ICg8YW55Pmdlb2xvY2F0aW9uKS53YXRjaExvY2F0aW9uKChsb2NhdGlvbjpnZW9sb2NhdGlvbi5Mb2NhdGlvbik9PntcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBpT1MgZG9jdW1lbnRhdGlvbiBzdGF0ZXMgdGhhdCB0aGUgYWx0aXR1ZGUgdmFsdWUgcmVmZXJzIHRvIGhlaWdodCAobWV0ZXJzKSBhYm92ZSBzZWEgbGV2ZWwsIGJ1dCBcbiAgICAgICAgICAgICAgICAvLyBpZiBpb3MgaXMgcmVwb3J0aW5nIHRoZSBzdGFuZGFyZCBncHMgZGVmaW5lZCBhbHRpdHVkZSwgdGhlbiB0aGlzIHRoZW9yZXRpY2FsIFwic2VhIGxldmVsXCIgYWN0dWFsbHkgcmVmZXJzIHRvIFxuICAgICAgICAgICAgICAgIC8vIHRoZSBXR1M4NCBlbGxpcHNvaWQgcmF0aGVyIHRoYW4gdHJhZGl0aW9uYWwgbWVhbiBzZWEgbGV2ZWwgKE1TTCkgd2hpY2ggaXMgbm90IGEgc2ltcGxlIHN1cmZhY2UgYW5kIHZhcmllcyBcbiAgICAgICAgICAgICAgICAvLyBhY2NvcmRpbmcgdG8gdGhlIGxvY2FsIGdyYXZpdGF0aW9uYWwgZmllbGQuIFxuICAgICAgICAgICAgICAgIC8vIEluIG90aGVyIHdvcmRzLCBteSBiZXN0IGd1ZXNzIGlzIHRoYXQgdGhlIGFsdGl0dWRlIHZhbHVlIGhlcmUgaXMgKnByb2JhYmx5KiBHUFMgZGVmaW5lZCBhbHRpdHVkZSwgd2hpY2ggXG4gICAgICAgICAgICAgICAgLy8gaXMgZXF1aXZhbGVudCB0byB0aGUgaGVpZ2h0IGFib3ZlIHRoZSBXR1M4NCBlbGxpcHNvaWQsIHdoaWNoIGlzIGV4YWN0bHkgd2hhdCBDZXNpdW0gZXhwZWN0cy4uLlxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJlU3RhZ2UoXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmxvbmdpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmxhdGl0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uYWx0aXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5ob3Jpem9udGFsQWNjdXJhY3ksIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi52ZXJ0aWNhbEFjY3VyYWN5XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgKGUpPT57XG4gICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgfSwgPGdlb2xvY2F0aW9uLk9wdGlvbnM+e1xuICAgICAgICAgICAgICAgIGRlc2lyZWRBY2N1cmFjeTogb3B0aW9ucyAmJiBvcHRpb25zLmVuYWJsZUhpZ2hBY2N1cmFjeSA/IFxuICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi5pb3MgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGtDTExvY2F0aW9uQWNjdXJhY3lCZXN0IDogXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtcy5BY2N1cmFjeS5oaWdoIDogXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmlvcyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAga0NMTG9jYXRpb25BY2N1cmFjeUtpbG9tZXRlciA6XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtcy5BY2N1cmFjeS5hbnksXG4gICAgICAgICAgICAgICAgdXBkYXRlRGlzdGFuY2U6IGFwcGxpY2F0aW9uLmlvcyA/IGtDTERpc3RhbmNlRmlsdGVyTm9uZSA6IDAsXG4gICAgICAgICAgICAgICAgbWluaW11bVVwZGF0ZVRpbWUgOiBvcHRpb25zICYmIG9wdGlvbnMuZW5hYmxlSGlnaEFjY3VyYWN5ID9cbiAgICAgICAgICAgICAgICAgICAgMCA6IDUwMDAgLy8gcmVxdWlyZWQgb24gQW5kcm9pZCwgaWdub3JlZCBvbiBpT1NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIGxvY2F0aW9uIHdhdGNoZXIuIFwiICsgdGhpcy5sb2NhdGlvbldhdGNoSWQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBcbiAgICBwcm90ZWN0ZWQgb25TdG9wR2VvbG9jYXRpb25VcGRhdGVzKCkgOiB2b2lkIHtcbiAgICAgICAgaWYgKEFyZ29uLkNlc2l1bS5kZWZpbmVkKHRoaXMubG9jYXRpb25XYXRjaElkKSkge1xuICAgICAgICAgICAgZ2VvbG9jYXRpb24uY2xlYXJXYXRjaCh0aGlzLmxvY2F0aW9uV2F0Y2hJZCk7XG4gICAgICAgICAgICB0aGlzLmxvY2F0aW9uV2F0Y2hJZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3NjcmF0Y2hNYXRyaXg0ID0gbmV3IEFyZ29uLkNlc2l1bS5NYXRyaXg0O1xuICAgIHByaXZhdGUgX3NjcmF0Y2hWaWRlb1F1YXRlcm5pb24gPSBuZXcgQXJnb24uQ2VzaXVtLlF1YXRlcm5pb247XG5cbiAgICBwcml2YXRlIF9lbnN1cmVQZXJtaXNzaW9uKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgaWYgKHRoaXMuZm9jdXNTZXJ2aWNlUHJvdmlkZXIuc2Vzc2lvbiA9PSBzZXNzaW9uKSByZXR1cm47IFxuICAgICAgICBpZiAoc2Vzc2lvbiA9PSB0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZXIpIHJldHVybjtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXNzaW9uIGRvZXMgbm90IGhhdmUgZm9jdXMuJylcbiAgICB9XG4gICAgXG4gICAgaGFuZGxlUmVxdWVzdFByZXNlbnRITUQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICB0aGlzLl9lbnN1cmVQZXJtaXNzaW9uKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgZGV2aWNlICYmIGRldmljZS5zZXRWaWV3ZXJBY3RpdmUodHJ1ZSk7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICBoYW5kbGVFeGl0UHJlc2VudEhNRChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2UgJiYgZGV2aWNlLnNldFZpZXdlckFjdGl2ZShmYWxzZSk7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgX2lzSG1kQWN0aXZlKCkge1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgcmV0dXJuIGRldmljZS5pc1ZpZXdlckFjdGl2ZSgpO1xuICAgIH1cblxufSJdfQ==