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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyw4Q0FBZ0Q7QUFDaEQsaUNBQW1DO0FBRW5DLHNDQUF3QztBQUV4QywrQkFBMkM7QUFFM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBR2xDLElBQWEseUJBQXlCO0lBQVMsNkNBQW1CO0lBRTlELG1DQUNJLGNBQW1DLEVBQ25DLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLHNCQUFtRDtRQUp2RCxZQUtJLGtCQUFNLGNBQWMsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLFNBc0JyRDtRQUVPLGtCQUFZLEdBQUcsV0FBVyxDQUFDO1FBQzNCLGdDQUEwQixHQUFHLElBQUksVUFBVSxDQUFDO1FBQzVDLCtCQUF5QixHQUFHLElBQUksVUFBVSxDQUFDO1FBRTNDLFNBQUcsR0FBRyxDQUFDLENBQUM7UUFDUixnQkFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FB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QUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsTUFBTSxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsZ0VBQW9CLEdBQXBCLFVBQXFCLE9BQXlCO1FBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoQyxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsTUFBTSxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRU0sd0RBQVksR0FBbkI7UUFDSSxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUwsd0NBQUM7QUFBRCxDQUFDLEFBaFFELENBQXVELEtBQUssQ0FBQyxxQkFBcUIsR0FnUWpGO0FBaFFZLGlDQUFpQztJQUQ3QyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVU7NkNBSUcsS0FBSyxDQUFDLGNBQWMsRUFDckIsS0FBSyxDQUFDLGFBQWEsRUFDbEIsS0FBSyxDQUFDLGNBQWMsRUFDdkIsS0FBSyxDQUFDLFdBQVcsRUFDTCxLQUFLLENBQUMsc0JBQXNCLEVBQ3ZCLEtBQUssQ0FBQyxvQkFBb0IsRUFDeEMsS0FBSyxDQUFDLGNBQWM7R0FUOUIsaUNBQWlDLENBZ1E3QztBQWhRWSw4RUFBaUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tIFwiYXBwbGljYXRpb25cIjtcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCAqIGFzIGdlb2xvY2F0aW9uIGZyb20gJ3NwZWlnZy1uYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24nO1xuaW1wb3J0ICogYXMgZGlhbG9ncyBmcm9tICd1aS9kaWFsb2dzJztcbmltcG9ydCAqIGFzIGVudW1zIGZyb20gJ3VpL2VudW1zJztcblxuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBmcmFtZXMgZnJvbSAndWkvZnJhbWUnO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tIFwiQGFyZ29uanMvYXJnb25cIjtcblxuaW1wb3J0IHtnZXRTY3JlZW5PcmllbnRhdGlvbn0gZnJvbSAnLi91dGlsJ1xuXG5jb25zdCBDYXJ0ZXNpYW4zID0gQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG5jb25zdCBRdWF0ZXJuaW9uID0gQXJnb24uQ2VzaXVtLlF1YXRlcm5pb247XG5jb25zdCBDZXNpdW1NYXRoID0gQXJnb24uQ2VzaXVtLkNlc2l1bU1hdGg7XG5jb25zdCBNYXRyaXg0ICAgID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG5cbmNvbnN0IHo5MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyk7XG5jb25zdCBPTkUgPSBuZXcgQ2FydGVzaWFuMygxLDEsMSk7XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSBleHRlbmRzIEFyZ29uLkRldmljZVNlcnZpY2Uge1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlOkFyZ29uLlNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgY29udGV4dFNlcnZpY2U6QXJnb24uQ29udGV4dFNlcnZpY2UsIFxuICAgICAgICB2aWV3U2VydmljZTpBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgdnVmb3JpYVNlcnZpY2VQcm92aWRlcjpBcmdvbi5WdWZvcmlhU2VydmljZVByb3ZpZGVyKSB7XG4gICAgICAgIHN1cGVyKHNlc3Npb25TZXJ2aWNlLCBjb250ZXh0U2VydmljZSwgdmlld1NlcnZpY2UpO1xuXG4gICAgICAgIGNvbnN0IHZzcCA9IDxOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyPnZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI7XG4gICAgICAgIGxldCBub3c6bnVtYmVyO1xuXG4gICAgICAgIGNvbnN0IGV4ZWN1dGVDYWxsYmFjayA9IChjYiwgaWQpID0+IHtcbiAgICAgICAgICAgIGNiKG5vdyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdnNwLnN0YXRlVXBkYXRlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgbm93ID0gZ2xvYmFsLnBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgICAgICAgLy8gc3dhcCBjYWxsYmFjayBtYXBzXG4gICAgICAgICAgICBjb25zdCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3M7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MyO1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzMiA9IGNhbGxiYWNrcztcbiAgICAgICAgICAgIGNhbGxiYWNrcy5mb3JFYWNoKGV4ZWN1dGVDYWxsYmFjayk7XG4gICAgICAgICAgICBjYWxsYmFja3MuY2xlYXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4gdnNwLnN0YXRlVXBkYXRlRXZlbnQucmFpc2VFdmVudChBcmdvbi5DZXNpdW0uSnVsaWFuRGF0ZS5ub3coKSksIDM0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2FwcGxpY2F0aW9uID0gYXBwbGljYXRpb247XG4gICAgcHJpdmF0ZSBfc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfaWQgPSAwO1xuICAgIHByaXZhdGUgX2NhbGxiYWNrcyA9IG5ldyBNYXA8bnVtYmVyLCBGdW5jdGlvbj4oKTtcbiAgICBwcml2YXRlIF9jYWxsYmFja3MyID0gbmV3IE1hcDxudW1iZXIsIEZ1bmN0aW9uPigpO1xuXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gKGNiOih0aW1lc3RhbXA6bnVtYmVyKT0+dm9pZCkgPT4ge1xuICAgICAgICB0aGlzLl9pZCsrO1xuICAgICAgICB0aGlzLl9jYWxsYmFja3Muc2V0KHRoaXMuX2lkLCBjYik7XG4gICAgICAgIHJldHVybiB0aGlzLl9pZDtcbiAgICB9XG5cbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSA9IChpZDpudW1iZXIpID0+IHtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tzLmRlbGV0ZShpZCk7XG4gICAgfVxuICAgIFxuICAgIGdldFNjcmVlbk9yaWVudGF0aW9uRGVncmVlcygpIHtcbiAgICAgICAgcmV0dXJuIGdldFNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgfVxuICAgIFxuICAgIG9uVXBkYXRlRnJhbWVTdGF0ZSgpIHtcblxuICAgICAgICBjb25zdCB2aWV3cG9ydCA9IHRoaXMuZGV2aWNlU3RhdGUudmlld3BvcnQgPSB0aGlzLmRldmljZVN0YXRlLnZpZXdwb3J0IHx8IDxBcmdvbi5WaWV3cG9ydD57fTtcbiAgICAgICAgY29uc3QgY29udGVudFZpZXcgPSBmcmFtZXMudG9wbW9zdCgpLmN1cnJlbnRQYWdlLmNvbnRlbnQ7XG4gICAgICAgIHZpZXdwb3J0LnggPSAwO1xuICAgICAgICB2aWV3cG9ydC55ID0gMDtcbiAgICAgICAgdmlld3BvcnQud2lkdGggPSBjb250ZW50Vmlldy5nZXRBY3R1YWxTaXplKCkud2lkdGg7IC8vZ2V0TWVhc3VyZWRXaWR0aCgpO1xuICAgICAgICB2aWV3cG9ydC5oZWlnaHQgPSBjb250ZW50Vmlldy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0OyAvL2dldE1lYXN1cmVkSGVpZ2h0KCk7XG5cbiAgICAgICAgc3VwZXIub25VcGRhdGVGcmFtZVN0YXRlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2FwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IHRoaXMuX2dldE1vdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbiA9IG1vdGlvbk1hbmFnZXIgJiYgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb247XG5cbiAgICAgICAgICAgIGlmIChtb3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb3Rpb25RdWF0ZXJuaW9uID0gPEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uPm1vdGlvbi5hdHRpdHVkZS5xdWF0ZXJuaW9uO1xuXG4gICAgICAgICAgICAgICAgLy8gQXBwbGUncyBvcmllbnRhdGlvbiBpcyByZXBvcnRlZCBpbiBOV1UsIHNvIHdlIGNvbnZlcnQgdG8gRU5VIGJ5IGFwcGx5aW5nIGEgZ2xvYmFsIHJvdGF0aW9uIG9mXG4gICAgICAgICAgICAgICAgLy8gOTAgZGVncmVlcyBhYm91dCAreiB0byB0aGUgTldVIG9yaWVudGF0aW9uIChvciBhcHBseWluZyB0aGUgTldVIHF1YXRlcm5pb24gYXMgYSBsb2NhbCByb3RhdGlvbiBcbiAgICAgICAgICAgICAgICAvLyB0byB0aGUgc3RhcnRpbmcgb3JpZW50YXRpb24gb2YgOTAgZGVncmVzcyBhYm91dCAreikuIFxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IFdpdGggcXVhdGVybmlvbiBtdWx0aXBsaWNhdGlvbiB0aGUgYCpgIHN5bWJvbCBjYW4gYmUgcmVhZCBhcyAncm90YXRlcycuIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvcmllbnRhdGlvbiAoTykgaXMgb24gdGhlIHJpZ2h0IGFuZCB0aGUgcm90YXRpb24gKFIpIGlzIG9uIHRoZSBsZWZ0LCBcbiAgICAgICAgICAgICAgICAvLyBzdWNoIHRoYXQgdGhlIG11bHRpcGxpY2F0aW9uIG9yZGVyIGlzIFIqTywgdGhlbiBSIGlzIGEgZ2xvYmFsIHJvdGF0aW9uIGJlaW5nIGFwcGxpZWQgb24gTy4gXG4gICAgICAgICAgICAgICAgLy8gTGlrZXdpc2UsIHRoZSByZXZlcnNlLCBPKlIsIGlzIGEgbG9jYWwgcm90YXRpb24gUiBhcHBsaWVkIHRvIHRoZSBvcmllbnRhdGlvbiBPLiBcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IFF1YXRlcm5pb24ubXVsdGlwbHkoejkwLCBtb3Rpb25RdWF0ZXJuaW9uLCB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5mcmFtZVN0YXRlLnNjcmVlbk9yaWVudGF0aW9uRGVncmVlcztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVVzZXIgPSB0aGlzLnVzZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlU3RhZ2UgPSB0aGlzLnN0YWdlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLnBvc2l0aW9uKSBkZXZpY2VVc2VyLnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIub3JpZW50YXRpb24pIGRldmljZVVzZXIub3JpZW50YXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkpLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLmZyb21FbGVtZW50cygwLDAsdGhpcy5kZXZpY2VTdGF0ZS5zdWdnZXN0ZWRVc2VySGVpZ2h0LCB0aGlzLl9zY3JhdGNoQ2FydGVzaWFuKSxcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlU3RhZ2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5VTklUX1osIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzICogQ2VzaXVtTWF0aC5SQURJQU5TX1BFUl9ERUdSRUUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLm11bHRpcGx5KFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERldmljZU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUoc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgbG9jYXRpb25NYW5hZ2VyID0gdGhpcy5fZ2V0TG9jYXRpb25NYW5hZ2VySU9TKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGluZyA9IGxvY2F0aW9uTWFuYWdlci5oZWFkaW5nO1xuICAgICAgICAgICAgICAgIGRldmljZVVzZXJbJ21ldGEnXSA9IGRldmljZVVzZXJbJ21ldGEnXSB8fCB7fTtcbiAgICAgICAgICAgICAgICBkZXZpY2VVc2VyWydtZXRhJ10uZ2VvSGVhZGluZ0FjY3VyYWN5ID0gaGVhZGluZyAmJiBoZWFkaW5nLmhlYWRpbmdBY2N1cmFjeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2FwcGxpY2F0aW9uLmFuZHJvaWQpIHtcblxuICAgICAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IHRoaXMuX2dldE1vdGlvbk1hbmFnZXJBbmRyb2lkKCk7XG4gICAgICAgICAgICBpZiAobW90aW9uTWFuYWdlcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZU9yaWVudGF0aW9uID0gdGhpcy5fbW90aW9uUXVhdGVybmlvbkFuZHJvaWQ7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgPSB0aGlzLmZyYW1lU3RhdGUuc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlVXNlciA9IHRoaXMudXNlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VTdGFnZSA9IHRoaXMuc3RhZ2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIucG9zaXRpb24pIGRldmljZVVzZXIucG9zaXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSgpO1xuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5vcmllbnRhdGlvbikgZGV2aWNlVXNlci5vcmllbnRhdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSgpO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSkuc2V0VmFsdWUoXG4gICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDAsMCx0aGlzLmRldmljZVN0YXRlLnN1Z2dlc3RlZFVzZXJIZWlnaHQsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLFxuICAgICAgICAgICAgICAgICAgICBkZXZpY2VTdGFnZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlVOSVRfWiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24ubXVsdGlwbHkoXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VPcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KS5zZXRWYWx1ZShzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX21vdGlvbk1hbmFnZXJJT1M/OkNNTW90aW9uTWFuYWdlcjtcblxuICAgIHByaXZhdGUgX2dldE1vdGlvbk1hbmFnZXJJT1MoKSA6IENNTW90aW9uTWFuYWdlcnx1bmRlZmluZWQge1xuICAgICAgICBpZiAodGhpcy5fbW90aW9uTWFuYWdlcklPUykgcmV0dXJuIHRoaXMuX21vdGlvbk1hbmFnZXJJT1M7XG5cbiAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IENNTW90aW9uTWFuYWdlci5hbGxvYygpLmluaXQoKTtcbiAgICAgICAgbW90aW9uTWFuYWdlci5zaG93c0RldmljZU1vdmVtZW50RGlzcGxheSA9IHRydWVcbiAgICAgICAgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25VcGRhdGVJbnRlcnZhbCA9IDEuMCAvIDEwMC4wO1xuICAgICAgICBpZiAoIW1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uQXZhaWxhYmxlIHx8ICFtb3Rpb25NYW5hZ2VyLm1hZ25ldG9tZXRlckF2YWlsYWJsZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJOTyBNYWduZXRvbWV0ZXIgYW5kL29yIEd5cm8uIFwiICk7XG4gICAgICAgICAgICBhbGVydChcIk5lZWQgYSBkZXZpY2Ugd2l0aCBneXJvc2NvcGUgYW5kIG1hZ25ldG9tZXRlciB0byBnZXQgM0QgZGV2aWNlIG9yaWVudGF0aW9uXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZTpDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWU7XG4gICAgICAgICAgICBpZiAoQ01Nb3Rpb25NYW5hZ2VyLmF2YWlsYWJsZUF0dGl0dWRlUmVmZXJlbmNlRnJhbWVzKCkgJiBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWUuWFRydWVOb3J0aFpWZXJ0aWNhbCkge1xuICAgICAgICAgICAgICAgIGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lID0gQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWw7XG4gICAgICAgICAgICAgICAgbW90aW9uTWFuYWdlci5zdGFydERldmljZU1vdGlvblVwZGF0ZXNVc2luZ1JlZmVyZW5jZUZyYW1lKGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoXCJOZWVkIGEgZGV2aWNlIHdpdGggbWFnbmV0b21ldGVyIHRvIGdldCBmdWxsIDNEIGRldmljZSBvcmllbnRhdGlvblwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5PICBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWVYVHJ1ZU5vcnRoWlZlcnRpY2FsXCIgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21vdGlvbk1hbmFnZXJJT1MgPSBtb3Rpb25NYW5hZ2VyO1xuICAgICAgICByZXR1cm4gbW90aW9uTWFuYWdlcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9sb2NhdGlvbk1hbmFnZXJJT1M/OkNMTG9jYXRpb25NYW5hZ2VyO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TG9jYXRpb25NYW5hZ2VySU9TKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUykge1xuICAgICAgICAgICAgdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TID0gQ0xMb2NhdGlvbk1hbmFnZXIuYWxsb2MoKS5pbml0KCk7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoQ0xMb2NhdGlvbk1hbmFnZXIuYXV0aG9yaXphdGlvblN0YXR1cygpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0F1dGhvcml6ZWRXaGVuSW5Vc2U6XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0F1dGhvcml6ZWRBbHdheXM6IFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzTm90RGV0ZXJtaW5lZDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TLnJlcXVlc3RXaGVuSW5Vc2VBdXRob3JpemF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNEZW5pZWQ6XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c1Jlc3RyaWN0ZWQ6XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiTG9jYXRpb24gU2VydmljZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBJbiBvcmRlciB0byBwcm92aWRlIHRoZSBiZXN0IEF1Z21lbnRlZCBSZWFsaXR5IGV4cGVyaWVuY2UsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsZWFzZSBvcGVuIHRoaXMgYXBwJ3Mgc2V0dGluZ3MgYW5kIGVuYWJsZSBsb2NhdGlvbiBzZXJ2aWNlc2AsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkNhbmNlbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydTZXR0aW5ncyddXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oKGFjdGlvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdTZXR0aW5ncycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBOU1VSTC5VUkxXaXRoU3RyaW5nKFVJQXBwbGljYXRpb25PcGVuU2V0dGluZ3NVUkxTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikub3BlblVSTCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1M7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbW90aW9uTWFuYWdlckFuZHJvaWQ/OmFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yRXZlbnRMaXN0ZW5lcjtcbiAgICBwcml2YXRlIF9tb3Rpb25RdWF0ZXJuaW9uQW5kcm9pZCA9IG5ldyBRdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TW90aW9uTWFuYWdlckFuZHJvaWQoKSA6IGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yRXZlbnRMaXN0ZW5lcnx1bmRlZmluZWQge1xuICAgICAgICBpZiAodGhpcy5fbW90aW9uTWFuYWdlckFuZHJvaWQpIHJldHVybiB0aGlzLl9tb3Rpb25NYW5hZ2VyQW5kcm9pZDtcblxuICAgICAgICB2YXIgc2Vuc29yTWFuYWdlciA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LmdldFN5c3RlbVNlcnZpY2UoYW5kcm9pZC5jb250ZW50LkNvbnRleHQuU0VOU09SX1NFUlZJQ0UpO1xuICAgICAgICB2YXIgcm90YXRpb25TZW5zb3IgPSBzZW5zb3JNYW5hZ2VyLmdldERlZmF1bHRTZW5zb3IoYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3IuVFlQRV9ST1RBVElPTl9WRUNUT1IpO1xuXG4gICAgICAgIHZhciBzZW5zb3JFdmVudExpc3RlbmVyID0gbmV3IGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yRXZlbnRMaXN0ZW5lcih7XG4gICAgICAgICAgICBvbkFjY3VyYWN5Q2hhbmdlZDogKHNlbnNvciwgYWNjdXJhY3kpID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwib25BY2N1cmFjeUNoYW5nZWQ6IFwiICsgYWNjdXJhY3kpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU2Vuc29yQ2hhbmdlZDogKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgUXVhdGVybmlvbi51bnBhY2soPG51bWJlcltdPmV2ZW50LnZhbHVlcywgMCwgdGhpcy5fbW90aW9uUXVhdGVybmlvbkFuZHJvaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBzZW5zb3JNYW5hZ2VyLnJlZ2lzdGVyTGlzdGVuZXIoc2Vuc29yRXZlbnRMaXN0ZW5lciwgcm90YXRpb25TZW5zb3IsIGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yTWFuYWdlci5TRU5TT1JfREVMQVlfR0FNRSk7XG4gICAgICAgIHRoaXMuX21vdGlvbk1hbmFnZXJBbmRyb2lkID0gc2Vuc29yRXZlbnRMaXN0ZW5lcjtcbiAgICAgICAgcmV0dXJuIHNlbnNvckV2ZW50TGlzdGVuZXI7XG4gICAgfVxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2VQcm92aWRlciBleHRlbmRzIEFyZ29uLkRldmljZVNlcnZpY2VQcm92aWRlciB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGNvbnRhaW5lciwgXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlOkFyZ29uLlNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgZGV2aWNlU2VydmljZTpBcmdvbi5EZXZpY2VTZXJ2aWNlLCBcbiAgICAgICAgY29udGV4dFNlcnZpY2U6QXJnb24uQ29udGV4dFNlcnZpY2UsIFxuICAgICAgICB2aWV3U2VydmljZTpBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgY29udGV4dFNlcnZpY2VQcm92aWRlcmU6QXJnb24uQ29udGV4dFNlcnZpY2VQcm92aWRlcixcbiAgICAgICAgcHJpdmF0ZSBmb2N1c1NlcnZpY2VQcm92aWRlcjpBcmdvbi5Gb2N1c1NlcnZpY2VQcm92aWRlcixcbiAgICAgICAgcmVhbGl0eVNlcnZpY2U6QXJnb24uUmVhbGl0eVNlcnZpY2UpIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBzZXNzaW9uU2VydmljZSwgXG4gICAgICAgICAgICBkZXZpY2VTZXJ2aWNlLCBcbiAgICAgICAgICAgIGNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgICAgIHZpZXdTZXJ2aWNlLCAgICAgICAgIFxuICAgICAgICAgICAgY29udGV4dFNlcnZpY2VQcm92aWRlcmVcbiAgICAgICAgKTtcblxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hEZXZpY2VTdGF0ZSgpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaERldmljZVN0YXRlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9jYXRpb25XYXRjaElkPzpudW1iZXI7XG5cbiAgICAvLyBwcml2YXRlIF9zY3JhdGNoQ2FydGVzaWFuID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hQZXJzcGVjdGl2ZUZydXN0dW0gPSBuZXcgQXJnb24uQ2VzaXVtLlBlcnNwZWN0aXZlRnJ1c3R1bTtcblxuICAgIHByb3RlY3RlZCBvblVwZGF0ZURldmljZVN0YXRlKGRldmljZVN0YXRlOkFyZ29uLkRldmljZVN0YXRlKSB7XG5cbiAgICAgICAgaWYgKCFkZXZpY2VTdGF0ZS5pc1ByZXNlbnRpbmdITUQgfHwgIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS52aWV3cG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnN1YnZpZXdzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUuc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdWJ2aWV3cyA9IGRldmljZVN0YXRlLnN1YnZpZXdzID0gZGV2aWNlU3RhdGUuc3Vidmlld3MgfHwgW107XG5cbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbmRlcmluZ1ByaW1pdGl2ZXMgPSBkZXZpY2UuZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpO1xuICAgICAgICBjb25zdCByZW5kZXJpbmdWaWV3cyA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0UmVuZGVyaW5nVmlld3MoKTtcbiAgICAgICAgY29uc3QgbnVtVmlld3MgPSByZW5kZXJpbmdWaWV3cy5nZXROdW1WaWV3cygpO1xuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IHZ1Zm9yaWEudmlkZW9WaWV3LmlvcyA/ICg8VUlWaWV3PnZ1Zm9yaWEudmlkZW9WaWV3LmlvcykuY29udGVudFNjYWxlRmFjdG9yIDogMTtcblxuICAgICAgICBzdWJ2aWV3cy5sZW5ndGggPSBudW1WaWV3cztcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVZpZXdzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHZpZXcgPSByZW5kZXJpbmdWaWV3cy5nZXRWaWV3KGkpO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBzdXBwb3J0IFBvc3RQcm9jZXNzIHJlbmRlcmluZyBzdWJ2aWV3XG4gICAgICAgICAgICBpZiAodmlldyA9PT0gdnVmb3JpYS5WaWV3LlBvc3RQcm9jZXNzKSB7XG4gICAgICAgICAgICAgICAgc3Vidmlld3MubGVuZ3RoLS07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN1YnZpZXcgPSBzdWJ2aWV3c1tpXSA9IHN1YnZpZXdzW2ldIHx8IDxBcmdvbi5TZXJpYWxpemVkU3Vidmlldz57fTtcblxuICAgICAgICAgICAgLy8gU2V0IHN1YnZpZXcgdHlwZVxuICAgICAgICAgICAgc3dpdGNoICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuTGVmdEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuTEVGVEVZRTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuUmlnaHRFeWU6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLlJJR0hURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5TaW5ndWxhcjpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLk9USEVSOyBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIHN1YnZpZXcgdmlld3BvcnRcbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFZpZXdwb3J0KHZpZXcpO1xuICAgICAgICAgICAgY29uc3Qgc3Vidmlld1ZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCA9IHN1YnZpZXcudmlld3BvcnQgfHwgPEFyZ29uLlZpZXdwb3J0Pnt9O1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LnggPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LnggLyBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueSA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueSAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC53aWR0aCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueiAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC5oZWlnaHQgPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LncgLyBjb250ZW50U2NhbGVGYWN0b3I7XG5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHByb2plY3Rpb24gbWF0cml4IGZvciB0aGlzIHN1YnZpZXdcbiAgICAgICAgICAgIC8vIE5vdGU6IFZ1Zm9yaWEgdXNlcyBhIHJpZ2h0LWhhbmRlZCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHggdG8gdGhlIHJpZ2h0LCB5IGRvd24sIGFuZCB6IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi5cbiAgICAgICAgICAgIC8vIFNvIHdlIGFyZSBjb252ZXJ0aW5nIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uIG9mIHggdG8gdGhlIHJpZ2h0LCB5IHVwLCBhbmQgLXogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLiBcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gPGFueT5yZW5kZXJpbmdQcmltaXRpdmVzLmdldFByb2plY3Rpb25NYXRyaXgodmlldywgdnVmb3JpYS5Db29yZGluYXRlU3lzdGVtVHlwZS5DYW1lcmEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzRmluaXRlKHByb2plY3Rpb25NYXRyaXhbMF0pKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBpZiBvdXIgcHJvamVjdGlvbiBtYXRyaXggaXMgZ2l2aW5nIG51bGwgdmFsdWVzIHRoZW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gc3VyZmFjZSBpcyBub3QgcHJvcGVybHkgY29uZmlndXJlZCBmb3Igc29tZSByZWFzb24sIHNvIHJlc2V0IGl0XG4gICAgICAgICAgICAgICAgLy8gKG5vdCBzdXJlIHdoeSB0aGlzIGhhcHBlbnMsIGJ1dCBpdCBvbmx5IHNlZW1zIHRvIGhhcHBlbiBhZnRlciBvciBiZXR3ZWVuIFxuICAgICAgICAgICAgICAgIC8vIHZ1Zm9yaWEgaW5pdGlhbGl6YXRpb25zKVxuICAgICAgICAgICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmZyYW1lLnNpemUud2lkdGggOiB2dWZvcmlhLnZpZGVvVmlldy5hbmRyb2lkLmdldFdpZHRoKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IHZ1Zm9yaWEudmlkZW9WaWV3LmlvcyA/IHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcy5mcmFtZS5zaXplLmhlaWdodCA6IHZ1Zm9yaWEudmlkZW9WaWV3LmFuZHJvaWQuZ2V0SGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAqIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGZydXN0dW0gPSB0aGlzLl9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uZm92ID0gTWF0aC5QSS8yO1xuICAgICAgICAgICAgICAgIGZydXN0dW0ubmVhciA9IDAuMDE7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mYXIgPSAxMDAwMDtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmFzcGVjdFJhdGlvID0gc3Vidmlld1ZpZXdwb3J0LndpZHRoIC8gc3Vidmlld1ZpZXdwb3J0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKGZydXN0dW0uYXNwZWN0UmF0aW8pIHx8IGZydXN0dW0uYXNwZWN0UmF0aW8gPT09IDApIGZydXN0dW0uYXNwZWN0UmF0aW8gPSAxO1xuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgLy8gVW5kbyB0aGUgdmlkZW8gcm90YXRpb24gc2luY2Ugd2UgYWxyZWFkeSBlbmNvZGUgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBpbiBvdXIgdmlldyBwb3NlXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogdGhlIFwiYmFzZVwiIHJvdGF0aW9uIGZvciB2dWZvcmlhJ3MgdmlkZW8gKGF0IGxlYXN0IG9uIGlPUykgaXMgdGhlIGxhbmRzY2FwZSByaWdodCBvcmllbnRhdGlvbixcbiAgICAgICAgICAgICAgICAvLyB3aGljaCBpcyB0aGUgb3JpZW50YXRpb24gd2hlcmUgdGhlIGRldmljZSBpcyBoZWxkIGluIGxhbmRzY2FwZSB3aXRoIHRoZSBob21lIGJ1dHRvbiBvbiB0aGUgcmlnaHQuIFxuICAgICAgICAgICAgICAgIC8vIFRoaXMgXCJiYXNlXCIgdmlkZW8gcm90YXRhdGlvbiBpcyAtOTAgZGVnIGFyb3VuZCAreiBmcm9tIHRoZSBwb3J0cmFpdCBpbnRlcmZhY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTbywgd2Ugd2FudCB0byB1bmRvIHRoaXMgcm90YXRpb24gd2hpY2ggdnVmb3JpYSBhcHBsaWVzIGZvciB1cy4gIFxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGNhbGN1bGF0ZSB0aGlzIG1hdHJpeCBvbmx5IHdoZW4gd2UgaGF2ZSB0byAod2hlbiB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGNoYW5nZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmZyb21UcmFuc2xhdGlvblF1YXRlcm5pb25Sb3RhdGlvblNjYWxlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlpFUk8sXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgKENlc2l1bU1hdGguUElfT1ZFUl9UV08gLSBnZXRTY3JlZW5PcmllbnRhdGlvbigpICogTWF0aC5QSSAvIDE4MCksIHRoaXMuX3NjcmF0Y2hWaWRlb1F1YXRlcm5pb24pLFxuICAgICAgICAgICAgICAgICAgICBPTkUsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hNYXRyaXg0XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShwcm9qZWN0aW9uTWF0cml4LCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IGZyb20gdGhlIHZ1Zm9yaWEgcHJvamVjdGlvbiBtYXRyaXggKCtYIC1ZICtaKSB0byBhIG1vcmUgc3RhbmRhcmQgY29udmVudGlvbiAoK1ggK1kgLVopXG4gICAgICAgICAgICAgICAgLy8gYnkgbmVnYXRpbmcgdGhlIGFwcHJvcHJpYXRlIGNvbHVtbnMuIFxuICAgICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS9saWJyYXJ5L2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1Vc2UtdGhlLUNhbWVyYS1Qcm9qZWN0aW9uLU1hdHJpeFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMF0gKj0gLTE7IC8vIHhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IC0xOyAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbM10gKj0gLTE7IC8vIHdcblxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOF0gKj0gLTE7ICAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs5XSAqPSAtMTsgIC8vIHlcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzEwXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMTFdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICAvLyBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseUJ5U2NhbGUocHJvamVjdGlvbk1hdHJpeCwgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMSwtMSwtMSwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksIHByb2plY3Rpb25NYXRyaXgpXG5cbiAgICAgICAgICAgICAgICAvLyBTY2FsZSB0aGUgcHJvamVjdGlvbiBtYXRyaXggdG8gZml0IG5pY2VseSB3aXRoaW4gYSBzdWJ2aWV3IG9mIHR5cGUgU0lOR1VMQVJcbiAgICAgICAgICAgICAgICAvLyAoVGhpcyBzY2FsZSB3aWxsIG5vdCBhcHBseSB3aGVuIHRoZSB1c2VyIGlzIHdlYXJpbmcgYSBtb25vY3VsYXIgSE1ELCBzaW5jZSBhXG4gICAgICAgICAgICAgICAgLy8gbW9ub2N1bGFyIEhNRCB3b3VsZCBwcm92aWRlIGEgc3VidmlldyBvZiB0eXBlIExFRlRFWUUgb3IgUklHSFRFWUUpXG4gICAgICAgICAgICAgICAgLy8gaWYgKHN1YnZpZXcudHlwZSA9PSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUikge1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCB3aWR0aFJhdGlvID0gc3Vidmlld1dpZHRoIC8gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IHN1YnZpZXdIZWlnaHQgLyB2aWRlb01vZGUuaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGFzcGVjdCBmaWxsXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5tYXgod2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBvciBhc3BlY3QgZml0XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5taW4od2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHgtYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHktYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzRdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs2XSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzddICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShwcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIGNvbnN0IGV5ZUFkanVzdG1lbnRNYXRyaXggPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXcpO1xuICAgICAgICAgICAgLy8gbGV0IHByb2plY3Rpb25NYXRyaXggPSBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShyYXdQcm9qZWN0aW9uTWF0cml4LCBleWVBZGp1c3RtZW50TWF0cml4LCBbXSk7XG4gICAgICAgICAgICAvLyBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQuZnJvbVJvd01ham9yQXJyYXkocHJvamVjdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gaWRlbnRpdHkgc3VidmlldyBwb3NlIChpbiByZWxhdGlvbiB0byB0aGUgb3ZlcmFsbCB2aWV3IHBvc2UpXG4gICAgICAgICAgICAvLyBUT0RPOiB1c2UgZXllIGFkanVzdG1lbnQgbWF0cml4IHRvIGdldCBzdWJ2aWV3IHBvc2VzIChmb3IgZXllIHNlcGFyYXRpb24pLiBTZWUgY29tbWVudGVkIG91dCBjb2RlIGFib3ZlLi4uXG4gICAgICAgICAgICBzdWJ2aWV3LnBvc2UgPSB1bmRlZmluZWQ7IFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIG9uU3RhcnRHZW9sb2NhdGlvblVwZGF0ZXMob3B0aW9uczpBcmdvbi5HZW9sb2NhdGlvbk9wdGlvbnMpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5sb2NhdGlvbldhdGNoSWQgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpPT57XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBkLnRzIGZvciBuYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24gaXMgd3JvbmcuIFRoaXMgY2FsbCBpcyBjb3JyZWN0LiBcbiAgICAgICAgICAgIC8vIENhc3RpbmcgdGhlIG1vZHVsZSBhcyA8YW55PiBoZXJlIGZvciBub3cgdG8gaGlkZSBhbm5veWluZyB0eXBlc2NyaXB0IGVycm9ycy4uLlxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSAoPGFueT5nZW9sb2NhdGlvbikud2F0Y2hMb2NhdGlvbigobG9jYXRpb246Z2VvbG9jYXRpb24uTG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgLy8gTm90ZTogaU9TIGRvY3VtZW50YXRpb24gc3RhdGVzIHRoYXQgdGhlIGFsdGl0dWRlIHZhbHVlIHJlZmVycyB0byBoZWlnaHQgKG1ldGVycykgYWJvdmUgc2VhIGxldmVsLCBidXQgXG4gICAgICAgICAgICAgICAgLy8gaWYgaW9zIGlzIHJlcG9ydGluZyB0aGUgc3RhbmRhcmQgZ3BzIGRlZmluZWQgYWx0aXR1ZGUsIHRoZW4gdGhpcyB0aGVvcmV0aWNhbCBcInNlYSBsZXZlbFwiIGFjdHVhbGx5IHJlZmVycyB0byBcbiAgICAgICAgICAgICAgICAvLyB0aGUgV0dTODQgZWxsaXBzb2lkIHJhdGhlciB0aGFuIHRyYWRpdGlvbmFsIG1lYW4gc2VhIGxldmVsIChNU0wpIHdoaWNoIGlzIG5vdCBhIHNpbXBsZSBzdXJmYWNlIGFuZCB2YXJpZXMgXG4gICAgICAgICAgICAgICAgLy8gYWNjb3JkaW5nIHRvIHRoZSBsb2NhbCBncmF2aXRhdGlvbmFsIGZpZWxkLiBcbiAgICAgICAgICAgICAgICAvLyBJbiBvdGhlciB3b3JkcywgbXkgYmVzdCBndWVzcyBpcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSBoZXJlIGlzICpwcm9iYWJseSogR1BTIGRlZmluZWQgYWx0aXR1ZGUsIHdoaWNoIFxuICAgICAgICAgICAgICAgIC8vIGlzIGVxdWl2YWxlbnQgdG8gdGhlIGhlaWdodCBhYm92ZSB0aGUgV0dTODQgZWxsaXBzb2lkLCB3aGljaCBpcyBleGFjdGx5IHdoYXQgQ2VzaXVtIGV4cGVjdHMuLi5cbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyZVN0YWdlKFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sb25naXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sYXRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmFsdGl0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uaG9yaXpvbnRhbEFjY3VyYWN5LCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24udmVydGljYWxBY2N1cmFjeVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIChlKT0+e1xuICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgIH0sIDxnZW9sb2NhdGlvbi5PcHRpb25zPntcbiAgICAgICAgICAgICAgICBkZXNpcmVkQWNjdXJhY3k6IG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVIaWdoQWNjdXJhY3kgPyBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5QmVzdCA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuaGlnaCA6IFxuICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi5pb3MgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGtDTExvY2F0aW9uQWNjdXJhY3lLaWxvbWV0ZXIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuYW55LFxuICAgICAgICAgICAgICAgIHVwZGF0ZURpc3RhbmNlOiBhcHBsaWNhdGlvbi5pb3MgPyBrQ0xEaXN0YW5jZUZpbHRlck5vbmUgOiAwLFxuICAgICAgICAgICAgICAgIG1pbmltdW1VcGRhdGVUaW1lIDogb3B0aW9ucyAmJiBvcHRpb25zLmVuYWJsZUhpZ2hBY2N1cmFjeSA/XG4gICAgICAgICAgICAgICAgICAgIDAgOiA1MDAwIC8vIHJlcXVpcmVkIG9uIEFuZHJvaWQsIGlnbm9yZWQgb24gaU9TXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBsb2NhdGlvbiB3YXRjaGVyLiBcIiArIHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgXG4gICAgcHJvdGVjdGVkIG9uU3RvcEdlb2xvY2F0aW9uVXBkYXRlcygpIDogdm9pZCB7XG4gICAgICAgIGlmIChBcmdvbi5DZXNpdW0uZGVmaW5lZCh0aGlzLmxvY2F0aW9uV2F0Y2hJZCkpIHtcbiAgICAgICAgICAgIGdlb2xvY2F0aW9uLmNsZWFyV2F0Y2godGhpcy5sb2NhdGlvbldhdGNoSWQpO1xuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoTWF0cml4NCA9IG5ldyBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbiAgICBwcml2YXRlIF9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uID0gbmV3IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGlmICh0aGlzLmZvY3VzU2VydmljZVByb3ZpZGVyLnNlc3Npb24gPT0gc2Vzc2lvbikgcmV0dXJuOyBcbiAgICAgICAgaWYgKHNlc3Npb24gPT0gdGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKSByZXR1cm47XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vzc2lvbiBkb2VzIG5vdCBoYXZlIGZvY3VzLicpXG4gICAgfVxuICAgIFxuICAgIGhhbmRsZVJlcXVlc3RQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKHRydWUpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgaGFuZGxlRXhpdFByZXNlbnRITUQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICB0aGlzLl9lbnN1cmVQZXJtaXNzaW9uKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgZGV2aWNlICYmIGRldmljZS5zZXRWaWV3ZXJBY3RpdmUoZmFsc2UpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcHVibGljIF9pc0htZEFjdGl2ZSgpIHtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIHJldHVybiBkZXZpY2UuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG5cbn0iXX0=