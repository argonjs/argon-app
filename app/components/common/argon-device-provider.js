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
    function NativescriptDeviceService(sessionService, contextService, viewService, visibilityService, vuforiaServiceProvider) {
        var _this = _super.call(this, sessionService, contextService, viewService, visibilityService) || this;
        _this._executeCallback = function (cb, now) {
            cb(now);
        };
        _this._application = application;
        _this._scratchDisplayOrientation = new Quaternion;
        _this._scratchDeviceOrientation = new Quaternion;
        _this._id = 0;
        _this._callbacks = {};
        _this._callbacks2 = {};
        _this.requestAnimationFrame = function (cb) {
            _this._id++;
            _this._callbacks[_this._id] = cb;
            return _this._id;
        };
        _this.cancelAnimationFrame = function (id) {
            delete _this._callbacks[id];
        };
        _this._motionQuaternionAndroid = new Quaternion;
        var vsp = vuforiaServiceProvider;
        vsp.stateUpdateEvent.addEventListener(function () {
            var now = global.performance.now();
            // swap callback maps
            var callbacks = _this._callbacks;
            _this._callbacks = _this._callbacks2;
            _this._callbacks2 = callbacks;
            for (var i in callbacks) {
                _this._executeCallback(callbacks[i], now);
            }
            for (var i in callbacks) {
                delete callbacks[i];
            }
        });
        if (!vuforia.api) {
            setInterval(function () { return vsp.stateUpdateEvent.raiseEvent(Argon.Cesium.JulianDate.now()); }, 34);
        }
        return _this;
    }
    NativescriptDeviceService.prototype.getScreenOrientationDegrees = function () {
        return util_1.screenOrientation;
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
                var screenOrientation_1 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, this._scratchDisplayOrientation);
                var screenBasedDeviceOrientation = Quaternion.multiply(deviceOrientation, screenOrientation_1, this._scratchDeviceOrientation);
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
                var screenOrientation_2 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, this._scratchDisplayOrientation);
                var screenBasedDeviceOrientation = Quaternion.multiply(deviceOrientation, screenOrientation_2, this._scratchDeviceOrientation);
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
    __metadata("design:paramtypes", [Argon.SessionService, Argon.ContextService, Argon.ViewService, Argon.VisibilityService, Argon.VuforiaServiceProvider])
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
                var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, (CesiumMath.PI_OVER_TWO - util_1.screenOrientation * Math.PI / 180), this._scratchVideoQuaternion), ONE, this._scratchMatrix4);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyw4Q0FBZ0Q7QUFDaEQsaUNBQW1DO0FBRW5DLHNDQUF3QztBQUV4QywrQkFBd0M7QUFFeEMsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBR2xDLElBQWEseUJBQXlCO0lBQVMsNkNBQW1CO0lBRTlELG1DQUNJLGNBQW1DLEVBQ25DLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLGlCQUF5QyxFQUN6QyxzQkFBbUQ7UUFMdkQsWUFNSSxrQkFBTSxjQUFjLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxTQXFCeEU7UUFFTyxzQkFBZ0IsR0FBRyxVQUFDLEVBQVcsRUFBRSxHQUFVO1lBQy9DLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNaLENBQUMsQ0FBQztRQUVNLGtCQUFZLEdBQUcsV0FBVyxDQUFDO1FBQzNCLGdDQUEwQixHQUFHLElBQUks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QUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsTUFBTSxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsZ0VBQW9CLEdBQXBCLFVBQXFCLE9BQXlCO1FBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoQyxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsTUFBTSxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRU0sd0RBQVksR0FBbkI7UUFDSSxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUwsd0NBQUM7QUFBRCxDQUFDLEFBaFFELENBQXVELEtBQUssQ0FBQyxxQkFBcUIsR0FnUWpGO0FBaFFZLGlDQUFpQztJQUQ3QyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVU7NkNBSUcsS0FBSyxDQUFDLGNBQWMsRUFDckIsS0FBSyxDQUFDLGFBQWEsRUFDbEIsS0FBSyxDQUFDLGNBQWMsRUFDdkIsS0FBSyxDQUFDLFdBQVcsRUFDTCxLQUFLLENBQUMsc0JBQXNCLEVBQ3ZCLEtBQUssQ0FBQyxvQkFBb0IsRUFDeEMsS0FBSyxDQUFDLGNBQWM7R0FUOUIsaUNBQWlDLENBZ1E3QztBQWhRWSw4RUFBaUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tIFwiYXBwbGljYXRpb25cIjtcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCAqIGFzIGdlb2xvY2F0aW9uIGZyb20gJ3NwZWlnZy1uYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24nO1xuaW1wb3J0ICogYXMgZGlhbG9ncyBmcm9tICd1aS9kaWFsb2dzJztcbmltcG9ydCAqIGFzIGVudW1zIGZyb20gJ3VpL2VudW1zJztcblxuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBmcmFtZXMgZnJvbSAndWkvZnJhbWUnO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tIFwiQGFyZ29uanMvYXJnb25cIjtcblxuaW1wb3J0IHtzY3JlZW5PcmllbnRhdGlvbn0gZnJvbSAnLi91dGlsJ1xuXG5jb25zdCBDYXJ0ZXNpYW4zID0gQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG5jb25zdCBRdWF0ZXJuaW9uID0gQXJnb24uQ2VzaXVtLlF1YXRlcm5pb247XG5jb25zdCBDZXNpdW1NYXRoID0gQXJnb24uQ2VzaXVtLkNlc2l1bU1hdGg7XG5jb25zdCBNYXRyaXg0ICAgID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG5cbmNvbnN0IHo5MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyk7XG5jb25zdCBPTkUgPSBuZXcgQ2FydGVzaWFuMygxLDEsMSk7XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSBleHRlbmRzIEFyZ29uLkRldmljZVNlcnZpY2Uge1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlOkFyZ29uLlNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgY29udGV4dFNlcnZpY2U6QXJnb24uQ29udGV4dFNlcnZpY2UsIFxuICAgICAgICB2aWV3U2VydmljZTpBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgdmlzaWJpbGl0eVNlcnZpY2U6QXJnb24uVmlzaWJpbGl0eVNlcnZpY2UsXG4gICAgICAgIHZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI6QXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlcikge1xuICAgICAgICBzdXBlcihzZXNzaW9uU2VydmljZSwgY29udGV4dFNlcnZpY2UsIHZpZXdTZXJ2aWNlLCB2aXNpYmlsaXR5U2VydmljZSk7XG5cbiAgICAgICAgY29uc3QgdnNwID0gPE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI+dnVmb3JpYVNlcnZpY2VQcm92aWRlcjtcblxuICAgICAgICB2c3Auc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICBjb25zdCBub3cgPSBnbG9iYWwucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICAvLyBzd2FwIGNhbGxiYWNrIG1hcHNcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcztcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrczI7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MyID0gY2FsbGJhY2tzO1xuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9leGVjdXRlQ2FsbGJhY2soY2FsbGJhY2tzW2ldLCBub3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB2c3Auc3RhdGVVcGRhdGVFdmVudC5yYWlzZUV2ZW50KEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlLm5vdygpKSwgMzQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZUNhbGxiYWNrID0gKGNiOkZ1bmN0aW9uLCBub3c6bnVtYmVyKSA9PiB7XG4gICAgICAgIGNiKG5vdyk7XG4gICAgfTtcblxuICAgIHByaXZhdGUgX2FwcGxpY2F0aW9uID0gYXBwbGljYXRpb247XG4gICAgcHJpdmF0ZSBfc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfaWQgPSAwO1xuICAgIHByaXZhdGUgX2NhbGxiYWNrczp7W2lkOm51bWJlcl06RnVuY3Rpb259ID0ge307XG4gICAgcHJpdmF0ZSBfY2FsbGJhY2tzMjp7W2lkOm51bWJlcl06RnVuY3Rpb259ID0ge307XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSAoY2I6KHRpbWVzdGFtcDpudW1iZXIpPT52b2lkKSA9PiB7XG4gICAgICAgIHRoaXMuX2lkKys7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrc1t0aGlzLl9pZF0gPSBjYjtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKGlkOm51bWJlcikgPT4ge1xuICAgICAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2lkXTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2NyZWVuT3JpZW50YXRpb25EZWdyZWVzKCkge1xuICAgICAgICByZXR1cm4gc2NyZWVuT3JpZW50YXRpb247XG4gICAgfVxuICAgIFxuICAgIG9uVXBkYXRlRnJhbWVTdGF0ZSgpIHtcblxuICAgICAgICBjb25zdCB2aWV3cG9ydCA9IHRoaXMuZGV2aWNlU3RhdGUudmlld3BvcnQgPSB0aGlzLmRldmljZVN0YXRlLnZpZXdwb3J0IHx8IDxBcmdvbi5DYW52YXNWaWV3cG9ydD57fTtcbiAgICAgICAgY29uc3QgY29udGVudFZpZXcgPSBmcmFtZXMudG9wbW9zdCgpLmN1cnJlbnRQYWdlLmNvbnRlbnQ7XG4gICAgICAgIHZpZXdwb3J0LnggPSAwO1xuICAgICAgICB2aWV3cG9ydC55ID0gMDtcbiAgICAgICAgdmlld3BvcnQud2lkdGggPSBjb250ZW50Vmlldy5nZXRBY3R1YWxTaXplKCkud2lkdGg7IC8vZ2V0TWVhc3VyZWRXaWR0aCgpO1xuICAgICAgICB2aWV3cG9ydC5oZWlnaHQgPSBjb250ZW50Vmlldy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0OyAvL2dldE1lYXN1cmVkSGVpZ2h0KCk7XG5cbiAgICAgICAgc3VwZXIub25VcGRhdGVGcmFtZVN0YXRlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2FwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IHRoaXMuX2dldE1vdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbiA9IG1vdGlvbk1hbmFnZXIgJiYgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb247XG5cbiAgICAgICAgICAgIGlmIChtb3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb3Rpb25RdWF0ZXJuaW9uID0gPEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uPm1vdGlvbi5hdHRpdHVkZS5xdWF0ZXJuaW9uO1xuXG4gICAgICAgICAgICAgICAgLy8gQXBwbGUncyBvcmllbnRhdGlvbiBpcyByZXBvcnRlZCBpbiBOV1UsIHNvIHdlIGNvbnZlcnQgdG8gRU5VIGJ5IGFwcGx5aW5nIGEgZ2xvYmFsIHJvdGF0aW9uIG9mXG4gICAgICAgICAgICAgICAgLy8gOTAgZGVncmVlcyBhYm91dCAreiB0byB0aGUgTldVIG9yaWVudGF0aW9uIChvciBhcHBseWluZyB0aGUgTldVIHF1YXRlcm5pb24gYXMgYSBsb2NhbCByb3RhdGlvbiBcbiAgICAgICAgICAgICAgICAvLyB0byB0aGUgc3RhcnRpbmcgb3JpZW50YXRpb24gb2YgOTAgZGVncmVzcyBhYm91dCAreikuIFxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IFdpdGggcXVhdGVybmlvbiBtdWx0aXBsaWNhdGlvbiB0aGUgYCpgIHN5bWJvbCBjYW4gYmUgcmVhZCBhcyAncm90YXRlcycuIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvcmllbnRhdGlvbiAoTykgaXMgb24gdGhlIHJpZ2h0IGFuZCB0aGUgcm90YXRpb24gKFIpIGlzIG9uIHRoZSBsZWZ0LCBcbiAgICAgICAgICAgICAgICAvLyBzdWNoIHRoYXQgdGhlIG11bHRpcGxpY2F0aW9uIG9yZGVyIGlzIFIqTywgdGhlbiBSIGlzIGEgZ2xvYmFsIHJvdGF0aW9uIGJlaW5nIGFwcGxpZWQgb24gTy4gXG4gICAgICAgICAgICAgICAgLy8gTGlrZXdpc2UsIHRoZSByZXZlcnNlLCBPKlIsIGlzIGEgbG9jYWwgcm90YXRpb24gUiBhcHBsaWVkIHRvIHRoZSBvcmllbnRhdGlvbiBPLiBcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IFF1YXRlcm5pb24ubXVsdGlwbHkoejkwLCBtb3Rpb25RdWF0ZXJuaW9uLCB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5mcmFtZVN0YXRlLnNjcmVlbk9yaWVudGF0aW9uRGVncmVlcztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVVzZXIgPSB0aGlzLnVzZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlU3RhZ2UgPSB0aGlzLnN0YWdlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLnBvc2l0aW9uKSBkZXZpY2VVc2VyLnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIub3JpZW50YXRpb24pIGRldmljZVVzZXIub3JpZW50YXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkpLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLmZyb21FbGVtZW50cygwLDAsdGhpcy5kZXZpY2VTdGF0ZS5zdWdnZXN0ZWRVc2VySGVpZ2h0LCB0aGlzLl9zY3JhdGNoQ2FydGVzaWFuKSxcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlU3RhZ2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5VTklUX1osIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzICogQ2VzaXVtTWF0aC5SQURJQU5TX1BFUl9ERUdSRUUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLm11bHRpcGx5KFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERldmljZU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUoc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgbG9jYXRpb25NYW5hZ2VyID0gdGhpcy5fZ2V0TG9jYXRpb25NYW5hZ2VySU9TKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGluZyA9IGxvY2F0aW9uTWFuYWdlci5oZWFkaW5nO1xuICAgICAgICAgICAgICAgIGRldmljZVVzZXJbJ21ldGEnXSA9IGRldmljZVVzZXJbJ21ldGEnXSB8fCB7fTtcbiAgICAgICAgICAgICAgICBkZXZpY2VVc2VyWydtZXRhJ10uZ2VvSGVhZGluZ0FjY3VyYWN5ID0gaGVhZGluZyAmJiBoZWFkaW5nLmhlYWRpbmdBY2N1cmFjeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2FwcGxpY2F0aW9uLmFuZHJvaWQpIHtcblxuICAgICAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IHRoaXMuX2dldE1vdGlvbk1hbmFnZXJBbmRyb2lkKCk7XG4gICAgICAgICAgICBpZiAobW90aW9uTWFuYWdlcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZU9yaWVudGF0aW9uID0gdGhpcy5fbW90aW9uUXVhdGVybmlvbkFuZHJvaWQ7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgPSB0aGlzLmZyYW1lU3RhdGUuc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlVXNlciA9IHRoaXMudXNlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VTdGFnZSA9IHRoaXMuc3RhZ2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIucG9zaXRpb24pIGRldmljZVVzZXIucG9zaXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSgpO1xuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5vcmllbnRhdGlvbikgZGV2aWNlVXNlci5vcmllbnRhdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSgpO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSkuc2V0VmFsdWUoXG4gICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDAsMCx0aGlzLmRldmljZVN0YXRlLnN1Z2dlc3RlZFVzZXJIZWlnaHQsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLFxuICAgICAgICAgICAgICAgICAgICBkZXZpY2VTdGFnZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlVOSVRfWiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24ubXVsdGlwbHkoXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VPcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KS5zZXRWYWx1ZShzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX21vdGlvbk1hbmFnZXJJT1M/OkNNTW90aW9uTWFuYWdlcjtcblxuICAgIHByaXZhdGUgX2dldE1vdGlvbk1hbmFnZXJJT1MoKSA6IENNTW90aW9uTWFuYWdlcnx1bmRlZmluZWQge1xuICAgICAgICBpZiAodGhpcy5fbW90aW9uTWFuYWdlcklPUykgcmV0dXJuIHRoaXMuX21vdGlvbk1hbmFnZXJJT1M7XG5cbiAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IENNTW90aW9uTWFuYWdlci5hbGxvYygpLmluaXQoKTtcbiAgICAgICAgbW90aW9uTWFuYWdlci5zaG93c0RldmljZU1vdmVtZW50RGlzcGxheSA9IHRydWVcbiAgICAgICAgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25VcGRhdGVJbnRlcnZhbCA9IDEuMCAvIDEwMC4wO1xuICAgICAgICBpZiAoIW1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uQXZhaWxhYmxlIHx8ICFtb3Rpb25NYW5hZ2VyLm1hZ25ldG9tZXRlckF2YWlsYWJsZSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJOTyBNYWduZXRvbWV0ZXIgYW5kL29yIEd5cm8uIFwiICk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lOkNNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZTtcbiAgICAgICAgICAgIGlmIChDTU1vdGlvbk1hbmFnZXIuYXZhaWxhYmxlQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZXMoKSAmIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsKSB7XG4gICAgICAgICAgICAgICAgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWUgPSBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWUuWFRydWVOb3J0aFpWZXJ0aWNhbDtcbiAgICAgICAgICAgICAgICBtb3Rpb25NYW5hZ2VyLnN0YXJ0RGV2aWNlTW90aW9uVXBkYXRlc1VzaW5nUmVmZXJlbmNlRnJhbWUoZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk5PICBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWVYVHJ1ZU5vcnRoWlZlcnRpY2FsXCIgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21vdGlvbk1hbmFnZXJJT1MgPSBtb3Rpb25NYW5hZ2VyO1xuICAgICAgICByZXR1cm4gbW90aW9uTWFuYWdlcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9sb2NhdGlvbk1hbmFnZXJJT1M/OkNMTG9jYXRpb25NYW5hZ2VyO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TG9jYXRpb25NYW5hZ2VySU9TKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUykge1xuICAgICAgICAgICAgdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TID0gQ0xMb2NhdGlvbk1hbmFnZXIuYWxsb2MoKS5pbml0KCk7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoQ0xMb2NhdGlvbk1hbmFnZXIuYXV0aG9yaXphdGlvblN0YXR1cygpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0F1dGhvcml6ZWRXaGVuSW5Vc2U6XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0F1dGhvcml6ZWRBbHdheXM6IFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzTm90RGV0ZXJtaW5lZDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TLnJlcXVlc3RXaGVuSW5Vc2VBdXRob3JpemF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNEZW5pZWQ6XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c1Jlc3RyaWN0ZWQ6XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiTG9jYXRpb24gU2VydmljZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBJbiBvcmRlciB0byBwcm92aWRlIHRoZSBiZXN0IEF1Z21lbnRlZCBSZWFsaXR5IGV4cGVyaWVuY2UsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsZWFzZSBvcGVuIHRoaXMgYXBwJ3Mgc2V0dGluZ3MgYW5kIGVuYWJsZSBsb2NhdGlvbiBzZXJ2aWNlc2AsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkNhbmNlbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydTZXR0aW5ncyddXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oKGFjdGlvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdTZXR0aW5ncycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBOU1VSTC5VUkxXaXRoU3RyaW5nKFVJQXBwbGljYXRpb25PcGVuU2V0dGluZ3NVUkxTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikub3BlblVSTCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1M7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbW90aW9uTWFuYWdlckFuZHJvaWQ/OmFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yRXZlbnRMaXN0ZW5lcjtcbiAgICBwcml2YXRlIF9tb3Rpb25RdWF0ZXJuaW9uQW5kcm9pZCA9IG5ldyBRdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TW90aW9uTWFuYWdlckFuZHJvaWQoKSA6IGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yRXZlbnRMaXN0ZW5lcnx1bmRlZmluZWQge1xuICAgICAgICBpZiAodGhpcy5fbW90aW9uTWFuYWdlckFuZHJvaWQpIHJldHVybiB0aGlzLl9tb3Rpb25NYW5hZ2VyQW5kcm9pZDtcblxuICAgICAgICB2YXIgc2Vuc29yTWFuYWdlciA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LmdldFN5c3RlbVNlcnZpY2UoYW5kcm9pZC5jb250ZW50LkNvbnRleHQuU0VOU09SX1NFUlZJQ0UpO1xuICAgICAgICB2YXIgcm90YXRpb25TZW5zb3IgPSBzZW5zb3JNYW5hZ2VyLmdldERlZmF1bHRTZW5zb3IoYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3IuVFlQRV9ST1RBVElPTl9WRUNUT1IpO1xuXG4gICAgICAgIHZhciBzZW5zb3JFdmVudExpc3RlbmVyID0gbmV3IGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yRXZlbnRMaXN0ZW5lcih7XG4gICAgICAgICAgICBvbkFjY3VyYWN5Q2hhbmdlZDogKHNlbnNvciwgYWNjdXJhY3kpID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwib25BY2N1cmFjeUNoYW5nZWQ6IFwiICsgYWNjdXJhY3kpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU2Vuc29yQ2hhbmdlZDogKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgUXVhdGVybmlvbi51bnBhY2soPG51bWJlcltdPmV2ZW50LnZhbHVlcywgMCwgdGhpcy5fbW90aW9uUXVhdGVybmlvbkFuZHJvaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBzZW5zb3JNYW5hZ2VyLnJlZ2lzdGVyTGlzdGVuZXIoc2Vuc29yRXZlbnRMaXN0ZW5lciwgcm90YXRpb25TZW5zb3IsIGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yTWFuYWdlci5TRU5TT1JfREVMQVlfR0FNRSk7XG4gICAgICAgIHRoaXMuX21vdGlvbk1hbmFnZXJBbmRyb2lkID0gc2Vuc29yRXZlbnRMaXN0ZW5lcjtcbiAgICAgICAgcmV0dXJuIHNlbnNvckV2ZW50TGlzdGVuZXI7XG4gICAgfVxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2VQcm92aWRlciBleHRlbmRzIEFyZ29uLkRldmljZVNlcnZpY2VQcm92aWRlciB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGNvbnRhaW5lciwgXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlOkFyZ29uLlNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgZGV2aWNlU2VydmljZTpBcmdvbi5EZXZpY2VTZXJ2aWNlLCBcbiAgICAgICAgY29udGV4dFNlcnZpY2U6QXJnb24uQ29udGV4dFNlcnZpY2UsIFxuICAgICAgICB2aWV3U2VydmljZTpBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgY29udGV4dFNlcnZpY2VQcm92aWRlcmU6QXJnb24uQ29udGV4dFNlcnZpY2VQcm92aWRlcixcbiAgICAgICAgcHJpdmF0ZSBmb2N1c1NlcnZpY2VQcm92aWRlcjpBcmdvbi5Gb2N1c1NlcnZpY2VQcm92aWRlcixcbiAgICAgICAgcmVhbGl0eVNlcnZpY2U6QXJnb24uUmVhbGl0eVNlcnZpY2UpIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBzZXNzaW9uU2VydmljZSwgXG4gICAgICAgICAgICBkZXZpY2VTZXJ2aWNlLCBcbiAgICAgICAgICAgIGNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgICAgIHZpZXdTZXJ2aWNlLCAgICAgICAgIFxuICAgICAgICAgICAgY29udGV4dFNlcnZpY2VQcm92aWRlcmVcbiAgICAgICAgKTtcblxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hEZXZpY2VTdGF0ZSgpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaERldmljZVN0YXRlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9jYXRpb25XYXRjaElkPzpudW1iZXI7XG5cbiAgICAvLyBwcml2YXRlIF9zY3JhdGNoQ2FydGVzaWFuID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hQZXJzcGVjdGl2ZUZydXN0dW0gPSBuZXcgQXJnb24uQ2VzaXVtLlBlcnNwZWN0aXZlRnJ1c3R1bTtcblxuICAgIHByb3RlY3RlZCBvblVwZGF0ZURldmljZVN0YXRlKGRldmljZVN0YXRlOkFyZ29uLkRldmljZVN0YXRlKSB7XG5cbiAgICAgICAgaWYgKCFkZXZpY2VTdGF0ZS5pc1ByZXNlbnRpbmdITUQgfHwgIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS52aWV3cG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnN1YnZpZXdzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUuc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdWJ2aWV3cyA9IGRldmljZVN0YXRlLnN1YnZpZXdzID0gZGV2aWNlU3RhdGUuc3Vidmlld3MgfHwgW107XG5cbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbmRlcmluZ1ByaW1pdGl2ZXMgPSBkZXZpY2UuZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpO1xuICAgICAgICBjb25zdCByZW5kZXJpbmdWaWV3cyA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0UmVuZGVyaW5nVmlld3MoKTtcbiAgICAgICAgY29uc3QgbnVtVmlld3MgPSByZW5kZXJpbmdWaWV3cy5nZXROdW1WaWV3cygpO1xuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IHZ1Zm9yaWEudmlkZW9WaWV3LmlvcyA/ICg8VUlWaWV3PnZ1Zm9yaWEudmlkZW9WaWV3LmlvcykuY29udGVudFNjYWxlRmFjdG9yIDogMTtcblxuICAgICAgICBzdWJ2aWV3cy5sZW5ndGggPSBudW1WaWV3cztcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVZpZXdzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHZpZXcgPSByZW5kZXJpbmdWaWV3cy5nZXRWaWV3KGkpO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBzdXBwb3J0IFBvc3RQcm9jZXNzIHJlbmRlcmluZyBzdWJ2aWV3XG4gICAgICAgICAgICBpZiAodmlldyA9PT0gdnVmb3JpYS5WaWV3LlBvc3RQcm9jZXNzKSB7XG4gICAgICAgICAgICAgICAgc3Vidmlld3MubGVuZ3RoLS07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN1YnZpZXcgPSBzdWJ2aWV3c1tpXSA9IHN1YnZpZXdzW2ldIHx8IDxBcmdvbi5TZXJpYWxpemVkU3Vidmlldz57fTtcblxuICAgICAgICAgICAgLy8gU2V0IHN1YnZpZXcgdHlwZVxuICAgICAgICAgICAgc3dpdGNoICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuTGVmdEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuTEVGVEVZRTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuUmlnaHRFeWU6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLlJJR0hURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5TaW5ndWxhcjpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLk9USEVSOyBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIHN1YnZpZXcgdmlld3BvcnRcbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFZpZXdwb3J0KHZpZXcpO1xuICAgICAgICAgICAgY29uc3Qgc3Vidmlld1ZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCA9IHN1YnZpZXcudmlld3BvcnQgfHwgPEFyZ29uLlZpZXdwb3J0Pnt9O1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LnggPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LnggLyBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueSA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueSAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC53aWR0aCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueiAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC5oZWlnaHQgPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LncgLyBjb250ZW50U2NhbGVGYWN0b3I7XG5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHByb2plY3Rpb24gbWF0cml4IGZvciB0aGlzIHN1YnZpZXdcbiAgICAgICAgICAgIC8vIE5vdGU6IFZ1Zm9yaWEgdXNlcyBhIHJpZ2h0LWhhbmRlZCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHggdG8gdGhlIHJpZ2h0LCB5IGRvd24sIGFuZCB6IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi5cbiAgICAgICAgICAgIC8vIFNvIHdlIGFyZSBjb252ZXJ0aW5nIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uIG9mIHggdG8gdGhlIHJpZ2h0LCB5IHVwLCBhbmQgLXogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLiBcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gPGFueT5yZW5kZXJpbmdQcmltaXRpdmVzLmdldFByb2plY3Rpb25NYXRyaXgodmlldywgdnVmb3JpYS5Db29yZGluYXRlU3lzdGVtVHlwZS5DYW1lcmEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzRmluaXRlKHByb2plY3Rpb25NYXRyaXhbMF0pKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBpZiBvdXIgcHJvamVjdGlvbiBtYXRyaXggaXMgZ2l2aW5nIG51bGwgdmFsdWVzIHRoZW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gc3VyZmFjZSBpcyBub3QgcHJvcGVybHkgY29uZmlndXJlZCBmb3Igc29tZSByZWFzb24sIHNvIHJlc2V0IGl0XG4gICAgICAgICAgICAgICAgLy8gKG5vdCBzdXJlIHdoeSB0aGlzIGhhcHBlbnMsIGJ1dCBpdCBvbmx5IHNlZW1zIHRvIGhhcHBlbiBhZnRlciBvciBiZXR3ZWVuIFxuICAgICAgICAgICAgICAgIC8vIHZ1Zm9yaWEgaW5pdGlhbGl6YXRpb25zKVxuICAgICAgICAgICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmZyYW1lLnNpemUud2lkdGggOiB2dWZvcmlhLnZpZGVvVmlldy5hbmRyb2lkLmdldFdpZHRoKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IHZ1Zm9yaWEudmlkZW9WaWV3LmlvcyA/IHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcy5mcmFtZS5zaXplLmhlaWdodCA6IHZ1Zm9yaWEudmlkZW9WaWV3LmFuZHJvaWQuZ2V0SGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAqIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGZydXN0dW0gPSB0aGlzLl9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uZm92ID0gTWF0aC5QSS8yO1xuICAgICAgICAgICAgICAgIGZydXN0dW0ubmVhciA9IDAuMDE7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mYXIgPSAxMDAwMDtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmFzcGVjdFJhdGlvID0gc3Vidmlld1ZpZXdwb3J0LndpZHRoIC8gc3Vidmlld1ZpZXdwb3J0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKGZydXN0dW0uYXNwZWN0UmF0aW8pIHx8IGZydXN0dW0uYXNwZWN0UmF0aW8gPT09IDApIGZydXN0dW0uYXNwZWN0UmF0aW8gPSAxO1xuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgLy8gVW5kbyB0aGUgdmlkZW8gcm90YXRpb24gc2luY2Ugd2UgYWxyZWFkeSBlbmNvZGUgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBpbiBvdXIgdmlldyBwb3NlXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogdGhlIFwiYmFzZVwiIHJvdGF0aW9uIGZvciB2dWZvcmlhJ3MgdmlkZW8gKGF0IGxlYXN0IG9uIGlPUykgaXMgdGhlIGxhbmRzY2FwZSByaWdodCBvcmllbnRhdGlvbixcbiAgICAgICAgICAgICAgICAvLyB3aGljaCBpcyB0aGUgb3JpZW50YXRpb24gd2hlcmUgdGhlIGRldmljZSBpcyBoZWxkIGluIGxhbmRzY2FwZSB3aXRoIHRoZSBob21lIGJ1dHRvbiBvbiB0aGUgcmlnaHQuIFxuICAgICAgICAgICAgICAgIC8vIFRoaXMgXCJiYXNlXCIgdmlkZW8gcm90YXRhdGlvbiBpcyAtOTAgZGVnIGFyb3VuZCAreiBmcm9tIHRoZSBwb3J0cmFpdCBpbnRlcmZhY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTbywgd2Ugd2FudCB0byB1bmRvIHRoaXMgcm90YXRpb24gd2hpY2ggdnVmb3JpYSBhcHBsaWVzIGZvciB1cy4gIFxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGNhbGN1bGF0ZSB0aGlzIG1hdHJpeCBvbmx5IHdoZW4gd2UgaGF2ZSB0byAod2hlbiB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGNoYW5nZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmZyb21UcmFuc2xhdGlvblF1YXRlcm5pb25Sb3RhdGlvblNjYWxlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlpFUk8sXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgKENlc2l1bU1hdGguUElfT1ZFUl9UV08gLSBzY3JlZW5PcmllbnRhdGlvbiAqIE1hdGguUEkgLyAxODApLCB0aGlzLl9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uKSxcbiAgICAgICAgICAgICAgICAgICAgT05FLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoTWF0cml4NFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocHJvamVjdGlvbk1hdHJpeCwgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICAgICAgLy8gY29udmVydCBmcm9tIHRoZSB2dWZvcmlhIHByb2plY3Rpb24gbWF0cml4ICgrWCAtWSArWikgdG8gYSBtb3JlIHN0YW5kYXJkIGNvbnZlbnRpb24gKCtYICtZIC1aKVxuICAgICAgICAgICAgICAgIC8vIGJ5IG5lZ2F0aW5nIHRoZSBhcHByb3ByaWF0ZSBjb2x1bW5zLiBcbiAgICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIudnVmb3JpYS5jb20vbGlicmFyeS9hcnRpY2xlcy9Tb2x1dGlvbi9Ib3ctVG8tVXNlLXRoZS1DYW1lcmEtUHJvamVjdGlvbi1NYXRyaXhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IC0xOyAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxXSAqPSAtMTsgLy8geVxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzhdICo9IC0xOyAgLy8geFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOV0gKj0gLTE7ICAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxMF0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzExXSAqPSAtMTsgLy8gd1xuXG4gICAgICAgICAgICAgICAgLy8gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHlCeVNjYWxlKHByb2plY3Rpb25NYXRyaXgsIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDEsLTEsLTEsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLCBwcm9qZWN0aW9uTWF0cml4KVxuXG4gICAgICAgICAgICAgICAgLy8gU2NhbGUgdGhlIHByb2plY3Rpb24gbWF0cml4IHRvIGZpdCBuaWNlbHkgd2l0aGluIGEgc3VidmlldyBvZiB0eXBlIFNJTkdVTEFSXG4gICAgICAgICAgICAgICAgLy8gKFRoaXMgc2NhbGUgd2lsbCBub3QgYXBwbHkgd2hlbiB0aGUgdXNlciBpcyB3ZWFyaW5nIGEgbW9ub2N1bGFyIEhNRCwgc2luY2UgYVxuICAgICAgICAgICAgICAgIC8vIG1vbm9jdWxhciBITUQgd291bGQgcHJvdmlkZSBhIHN1YnZpZXcgb2YgdHlwZSBMRUZURVlFIG9yIFJJR0hURVlFKVxuICAgICAgICAgICAgICAgIC8vIGlmIChzdWJ2aWV3LnR5cGUgPT0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVIpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3Qgd2lkdGhSYXRpbyA9IHN1YnZpZXdXaWR0aCAvIHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3QgaGVpZ2h0UmF0aW8gPSBzdWJ2aWV3SGVpZ2h0IC8gdmlkZW9Nb2RlLmhlaWdodDtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBhc3BlY3QgZmlsbFxuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWF4KHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gb3IgYXNwZWN0IGZpdFxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWluKHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB4LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFswXSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFszXSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB5LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs0XSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzVdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs3XSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUocHJvamVjdGlvbk1hdHJpeCwgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4KTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAvLyBjb25zdCBleWVBZGp1c3RtZW50TWF0cml4ID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3KTtcbiAgICAgICAgICAgIC8vIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocmF3UHJvamVjdGlvbk1hdHJpeCwgZXllQWRqdXN0bWVudE1hdHJpeCwgW10pO1xuICAgICAgICAgICAgLy8gcHJvamVjdGlvbk1hdHJpeCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0LmZyb21Sb3dNYWpvckFycmF5KHByb2plY3Rpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBkZWZhdWx0IHRvIGlkZW50aXR5IHN1YnZpZXcgcG9zZSAoaW4gcmVsYXRpb24gdG8gdGhlIG92ZXJhbGwgdmlldyBwb3NlKVxuICAgICAgICAgICAgLy8gVE9ETzogdXNlIGV5ZSBhZGp1c3RtZW50IG1hdHJpeCB0byBnZXQgc3VidmlldyBwb3NlcyAoZm9yIGV5ZSBzZXBhcmF0aW9uKS4gU2VlIGNvbW1lbnRlZCBvdXQgY29kZSBhYm92ZS4uLlxuICAgICAgICAgICAgc3Vidmlldy5wb3NlID0gdW5kZWZpbmVkOyBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCBvblN0YXJ0R2VvbG9jYXRpb25VcGRhdGVzKG9wdGlvbnM6QXJnb24uR2VvbG9jYXRpb25PcHRpb25zKSA6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMubG9jYXRpb25XYXRjaElkICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KT0+e1xuXG4gICAgICAgICAgICAvLyBOb3RlOiB0aGUgZC50cyBmb3IgbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uIGlzIHdyb25nLiBUaGlzIGNhbGwgaXMgY29ycmVjdC4gXG4gICAgICAgICAgICAvLyBDYXN0aW5nIHRoZSBtb2R1bGUgYXMgPGFueT4gaGVyZSBmb3Igbm93IHRvIGhpZGUgYW5ub3lpbmcgdHlwZXNjcmlwdCBlcnJvcnMuLi5cbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gKDxhbnk+Z2VvbG9jYXRpb24pLndhdGNoTG9jYXRpb24oKGxvY2F0aW9uOmdlb2xvY2F0aW9uLkxvY2F0aW9uKT0+e1xuICAgICAgICAgICAgICAgIC8vIE5vdGU6IGlPUyBkb2N1bWVudGF0aW9uIHN0YXRlcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSByZWZlcnMgdG8gaGVpZ2h0IChtZXRlcnMpIGFib3ZlIHNlYSBsZXZlbCwgYnV0IFxuICAgICAgICAgICAgICAgIC8vIGlmIGlvcyBpcyByZXBvcnRpbmcgdGhlIHN0YW5kYXJkIGdwcyBkZWZpbmVkIGFsdGl0dWRlLCB0aGVuIHRoaXMgdGhlb3JldGljYWwgXCJzZWEgbGV2ZWxcIiBhY3R1YWxseSByZWZlcnMgdG8gXG4gICAgICAgICAgICAgICAgLy8gdGhlIFdHUzg0IGVsbGlwc29pZCByYXRoZXIgdGhhbiB0cmFkaXRpb25hbCBtZWFuIHNlYSBsZXZlbCAoTVNMKSB3aGljaCBpcyBub3QgYSBzaW1wbGUgc3VyZmFjZSBhbmQgdmFyaWVzIFxuICAgICAgICAgICAgICAgIC8vIGFjY29yZGluZyB0byB0aGUgbG9jYWwgZ3Jhdml0YXRpb25hbCBmaWVsZC4gXG4gICAgICAgICAgICAgICAgLy8gSW4gb3RoZXIgd29yZHMsIG15IGJlc3QgZ3Vlc3MgaXMgdGhhdCB0aGUgYWx0aXR1ZGUgdmFsdWUgaGVyZSBpcyAqcHJvYmFibHkqIEdQUyBkZWZpbmVkIGFsdGl0dWRlLCB3aGljaCBcbiAgICAgICAgICAgICAgICAvLyBpcyBlcXVpdmFsZW50IHRvIHRoZSBoZWlnaHQgYWJvdmUgdGhlIFdHUzg0IGVsbGlwc29pZCwgd2hpY2ggaXMgZXhhY3RseSB3aGF0IENlc2l1bSBleHBlY3RzLi4uXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmVTdGFnZShcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubG9uZ2l0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubGF0aXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5hbHRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhvcml6b250YWxBY2N1cmFjeSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLnZlcnRpY2FsQWNjdXJhY3lcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAoZSk9PntcbiAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9LCA8Z2VvbG9jYXRpb24uT3B0aW9ucz57XG4gICAgICAgICAgICAgICAgZGVzaXJlZEFjY3VyYWN5OiBvcHRpb25zICYmIG9wdGlvbnMuZW5hYmxlSGlnaEFjY3VyYWN5ID8gXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmlvcyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAga0NMTG9jYXRpb25BY2N1cmFjeUJlc3QgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmhpZ2ggOiBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5S2lsb21ldGVyIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmFueSxcbiAgICAgICAgICAgICAgICB1cGRhdGVEaXN0YW5jZTogYXBwbGljYXRpb24uaW9zID8ga0NMRGlzdGFuY2VGaWx0ZXJOb25lIDogMCxcbiAgICAgICAgICAgICAgICBtaW5pbXVtVXBkYXRlVGltZSA6IG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVIaWdoQWNjdXJhY3kgP1xuICAgICAgICAgICAgICAgICAgICAwIDogNTAwMCAvLyByZXF1aXJlZCBvbiBBbmRyb2lkLCBpZ25vcmVkIG9uIGlPU1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbG9jYXRpb24gd2F0Y2hlci4gXCIgKyB0aGlzLmxvY2F0aW9uV2F0Y2hJZCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFxuICAgIHByb3RlY3RlZCBvblN0b3BHZW9sb2NhdGlvblVwZGF0ZXMoKSA6IHZvaWQge1xuICAgICAgICBpZiAoQXJnb24uQ2VzaXVtLmRlZmluZWQodGhpcy5sb2NhdGlvbldhdGNoSWQpKSB7XG4gICAgICAgICAgICBnZW9sb2NhdGlvbi5jbGVhcldhdGNoKHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDQgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFZpZGVvUXVhdGVybmlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBpZiAodGhpcy5mb2N1c1NlcnZpY2VQcm92aWRlci5zZXNzaW9uID09IHNlc3Npb24pIHJldHVybjsgXG4gICAgICAgIGlmIChzZXNzaW9uID09IHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcikgcmV0dXJuO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZG9lcyBub3QgaGF2ZSBmb2N1cy4nKVxuICAgIH1cbiAgICBcbiAgICBoYW5kbGVSZXF1ZXN0UHJlc2VudEhNRChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2UgJiYgZGV2aWNlLnNldFZpZXdlckFjdGl2ZSh0cnVlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGhhbmRsZUV4aXRQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBfaXNIbWRBY3RpdmUoKSB7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICByZXR1cm4gZGV2aWNlLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuXG59Il19