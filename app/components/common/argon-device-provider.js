"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var application = require("application");
var utils = require("utils/utils");
var geolocation = require("speigg-nativescript-geolocation");
var dialogs = require("ui/dialogs");
var enums = require("ui/enums");
var platform = require("platform");
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
        var viewport = this._stableState.viewport = this._stableState.viewport || {};
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
                deviceUser.position.setValue(Cartesian3.fromElements(0, 0, this._stableState.suggestedUserHeight, this._scratchCartesian), deviceStage);
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
                deviceUser.position.setValue(Cartesian3.fromElements(0, 0, this._stableState.suggestedUserHeight, this._scratchCartesian), deviceStage);
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
                _this.publishStableState();
            }, 600);
            _this.publishStableState();
        });
        return _this;
    }
    NativescriptDeviceServiceProvider.prototype.onUpdateStableState = function (deviceState) {
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
        var contentScaleFactor = vuforia.videoView.ios ? vuforia.videoView.ios.contentScaleFactor : platform.screen.mainScreen.scale;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUNsQyxtQ0FBcUM7QUFFckMsOENBQWdEO0FBQ2hELGlDQUFtQztBQUVuQyxzQ0FBd0M7QUFFeEMsK0JBQXdDO0FBRXhDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sT0FBTyxHQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBRXhDLElBQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDaEYsSUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUdsQyxJQUFhLHlCQUF5QjtJQUFTLDZDQUFtQjtJQUU5RCxtQ0FDSSxjQUFtQyxFQUNuQyxjQUFtQyxFQUNuQyxXQUE2QixFQUM3QixpQkFBeUMsRUFDekMsc0JBQW1EO1FBTHZELFlBTUksa0JBQU0sY0FBYyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsU0FxQnhFO1FBRU8sc0JBQWdCLEdBQUcsVUFBQyxFQUFXLEVBQUUsR0FBVTtZQUMvQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUM7UUFFTSxrQkFBWSxHQUFHLFdBQVcsQ0FBQztRQUMzQixnQ0FB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R0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE1BQU0sSUFBSSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGdFQUFvQixHQUFwQixVQUFxQixPQUF5QjtRQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEMsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE1BQU0sSUFBSSxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVNLHdEQUFZLEdBQW5CO1FBQ0ksSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVMLHdDQUFDO0FBQUQsQ0FBQyxBQWhRRCxDQUF1RCxLQUFLLENBQUMscUJBQXFCLEdBZ1FqRjtBQWhRWSxpQ0FBaUM7SUFEN0MsS0FBSyxDQUFDLEVBQUUsQ0FBQyxVQUFVOzZDQUlHLEtBQUssQ0FBQyxjQUFjLEVBQ3JCLEtBQUssQ0FBQyxhQUFhLEVBQ2xCLEtBQUssQ0FBQyxjQUFjLEVBQ3ZCLEtBQUssQ0FBQyxXQUFXLEVBQ0wsS0FBSyxDQUFDLHNCQUFzQixFQUN2QixLQUFLLENBQUMsb0JBQW9CLEVBQ3hDLEtBQUssQ0FBQyxjQUFjO0dBVDlCLGlDQUFpQyxDQWdRN0M7QUFoUVksOEVBQWlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSBcImFwcGxpY2F0aW9uXCI7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBnZW9sb2NhdGlvbiBmcm9tICdzcGVpZ2ctbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBlbnVtcyBmcm9tICd1aS9lbnVtcyc7XG5pbXBvcnQgKiBhcyBwbGF0Zm9ybSBmcm9tICdwbGF0Zm9ybSc7XG5cbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgZnJhbWVzIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi12dWZvcmlhLXByb3ZpZGVyJ1xuaW1wb3J0ICogYXMgQXJnb24gZnJvbSBcIkBhcmdvbmpzL2FyZ29uXCI7XG5cbmltcG9ydCB7c2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vdXRpbCdcblxuY29uc3QgQ2FydGVzaWFuMyA9IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuY29uc3QgUXVhdGVybmlvbiA9IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuY29uc3QgQ2VzaXVtTWF0aCA9IEFyZ29uLkNlc2l1bS5DZXNpdW1NYXRoO1xuY29uc3QgTWF0cml4NCAgICA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0O1xuXG5jb25zdCB6OTAgPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIENlc2l1bU1hdGguUElfT1ZFUl9UV08pO1xuY29uc3QgT05FID0gbmV3IENhcnRlc2lhbjMoMSwxLDEpO1xuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UgZXh0ZW5kcyBBcmdvbi5EZXZpY2VTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBzZXNzaW9uU2VydmljZTpBcmdvbi5TZXNzaW9uU2VydmljZSwgXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgdmlld1NlcnZpY2U6QXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIHZpc2liaWxpdHlTZXJ2aWNlOkFyZ29uLlZpc2liaWxpdHlTZXJ2aWNlLFxuICAgICAgICB2dWZvcmlhU2VydmljZVByb3ZpZGVyOkFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpIHtcbiAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIGNvbnRleHRTZXJ2aWNlLCB2aWV3U2VydmljZSwgdmlzaWJpbGl0eVNlcnZpY2UpO1xuXG4gICAgICAgIGNvbnN0IHZzcCA9IDxOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyPnZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI7XG5cbiAgICAgICAgdnNwLnN0YXRlVXBkYXRlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gZ2xvYmFsLnBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgICAgICAgLy8gc3dhcCBjYWxsYmFjayBtYXBzXG4gICAgICAgICAgICBjb25zdCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3M7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MyO1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzMiA9IGNhbGxiYWNrcztcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXhlY3V0ZUNhbGxiYWNrKGNhbGxiYWNrc1tpXSwgbm93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4gdnNwLnN0YXRlVXBkYXRlRXZlbnQucmFpc2VFdmVudChBcmdvbi5DZXNpdW0uSnVsaWFuRGF0ZS5ub3coKSksIDM0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2V4ZWN1dGVDYWxsYmFjayA9IChjYjpGdW5jdGlvbiwgbm93Om51bWJlcikgPT4ge1xuICAgICAgICBjYihub3cpO1xuICAgIH07XG5cbiAgICBwcml2YXRlIF9hcHBsaWNhdGlvbiA9IGFwcGxpY2F0aW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcbiAgICBwcml2YXRlIF9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2lkID0gMDtcbiAgICBwcml2YXRlIF9jYWxsYmFja3M6e1tpZDpudW1iZXJdOkZ1bmN0aW9ufSA9IHt9O1xuICAgIHByaXZhdGUgX2NhbGxiYWNrczI6e1tpZDpudW1iZXJdOkZ1bmN0aW9ufSA9IHt9O1xuXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gKGNiOih0aW1lc3RhbXA6bnVtYmVyKT0+dm9pZCkgPT4ge1xuICAgICAgICB0aGlzLl9pZCsrO1xuICAgICAgICB0aGlzLl9jYWxsYmFja3NbdGhpcy5faWRdID0gY2I7XG4gICAgICAgIHJldHVybiB0aGlzLl9pZDtcbiAgICB9XG5cbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSA9IChpZDpudW1iZXIpID0+IHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1tpZF07XG4gICAgfVxuICAgIFxuICAgIGdldFNjcmVlbk9yaWVudGF0aW9uRGVncmVlcygpIHtcbiAgICAgICAgcmV0dXJuIHNjcmVlbk9yaWVudGF0aW9uO1xuICAgIH1cbiAgICBcbiAgICBvblVwZGF0ZUZyYW1lU3RhdGUoKSB7XG5cbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB0aGlzLl9zdGFibGVTdGF0ZS52aWV3cG9ydCA9IHRoaXMuX3N0YWJsZVN0YXRlLnZpZXdwb3J0IHx8IDxBcmdvbi5DYW52YXNWaWV3cG9ydD57fTtcbiAgICAgICAgY29uc3QgY29udGVudFZpZXcgPSBmcmFtZXMudG9wbW9zdCgpLmN1cnJlbnRQYWdlLmNvbnRlbnQ7XG4gICAgICAgIHZpZXdwb3J0LnggPSAwO1xuICAgICAgICB2aWV3cG9ydC55ID0gMDtcbiAgICAgICAgdmlld3BvcnQud2lkdGggPSBjb250ZW50Vmlldy5nZXRBY3R1YWxTaXplKCkud2lkdGg7IC8vZ2V0TWVhc3VyZWRXaWR0aCgpO1xuICAgICAgICB2aWV3cG9ydC5oZWlnaHQgPSBjb250ZW50Vmlldy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0OyAvL2dldE1lYXN1cmVkSGVpZ2h0KCk7XG5cbiAgICAgICAgc3VwZXIub25VcGRhdGVGcmFtZVN0YXRlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2FwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IHRoaXMuX2dldE1vdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbiA9IG1vdGlvbk1hbmFnZXIgJiYgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb247XG5cbiAgICAgICAgICAgIGlmIChtb3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb3Rpb25RdWF0ZXJuaW9uID0gPEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uPm1vdGlvbi5hdHRpdHVkZS5xdWF0ZXJuaW9uO1xuXG4gICAgICAgICAgICAgICAgLy8gQXBwbGUncyBvcmllbnRhdGlvbiBpcyByZXBvcnRlZCBpbiBOV1UsIHNvIHdlIGNvbnZlcnQgdG8gRU5VIGJ5IGFwcGx5aW5nIGEgZ2xvYmFsIHJvdGF0aW9uIG9mXG4gICAgICAgICAgICAgICAgLy8gOTAgZGVncmVlcyBhYm91dCAreiB0byB0aGUgTldVIG9yaWVudGF0aW9uIChvciBhcHBseWluZyB0aGUgTldVIHF1YXRlcm5pb24gYXMgYSBsb2NhbCByb3RhdGlvbiBcbiAgICAgICAgICAgICAgICAvLyB0byB0aGUgc3RhcnRpbmcgb3JpZW50YXRpb24gb2YgOTAgZGVncmVzcyBhYm91dCAreikuIFxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IFdpdGggcXVhdGVybmlvbiBtdWx0aXBsaWNhdGlvbiB0aGUgYCpgIHN5bWJvbCBjYW4gYmUgcmVhZCBhcyAncm90YXRlcycuIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvcmllbnRhdGlvbiAoTykgaXMgb24gdGhlIHJpZ2h0IGFuZCB0aGUgcm90YXRpb24gKFIpIGlzIG9uIHRoZSBsZWZ0LCBcbiAgICAgICAgICAgICAgICAvLyBzdWNoIHRoYXQgdGhlIG11bHRpcGxpY2F0aW9uIG9yZGVyIGlzIFIqTywgdGhlbiBSIGlzIGEgZ2xvYmFsIHJvdGF0aW9uIGJlaW5nIGFwcGxpZWQgb24gTy4gXG4gICAgICAgICAgICAgICAgLy8gTGlrZXdpc2UsIHRoZSByZXZlcnNlLCBPKlIsIGlzIGEgbG9jYWwgcm90YXRpb24gUiBhcHBsaWVkIHRvIHRoZSBvcmllbnRhdGlvbiBPLiBcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IFF1YXRlcm5pb24ubXVsdGlwbHkoejkwLCBtb3Rpb25RdWF0ZXJuaW9uLCB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5mcmFtZVN0YXRlLnNjcmVlbk9yaWVudGF0aW9uRGVncmVlcztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVVzZXIgPSB0aGlzLnVzZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlU3RhZ2UgPSB0aGlzLnN0YWdlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLnBvc2l0aW9uKSBkZXZpY2VVc2VyLnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIub3JpZW50YXRpb24pIGRldmljZVVzZXIub3JpZW50YXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkpLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLmZyb21FbGVtZW50cygwLDAsdGhpcy5fc3RhYmxlU3RhdGUuc3VnZ2VzdGVkVXNlckhlaWdodCwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksXG4gICAgICAgICAgICAgICAgICAgIGRldmljZVN0YWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuVU5JVF9aLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZU9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uTWFuYWdlciA9IHRoaXMuX2dldExvY2F0aW9uTWFuYWdlcklPUygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRpbmcgPSBsb2NhdGlvbk1hbmFnZXIuaGVhZGluZztcbiAgICAgICAgICAgICAgICBkZXZpY2VVc2VyWydtZXRhJ10gPSBkZXZpY2VVc2VyWydtZXRhJ10gfHwge307XG4gICAgICAgICAgICAgICAgZGV2aWNlVXNlclsnbWV0YSddLmdlb0hlYWRpbmdBY2N1cmFjeSA9IGhlYWRpbmcgJiYgaGVhZGluZy5oZWFkaW5nQWNjdXJhY3k7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9hcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRNb3Rpb25NYW5hZ2VyQW5kcm9pZCgpO1xuICAgICAgICAgICAgaWYgKG1vdGlvbk1hbmFnZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IHRoaXMuX21vdGlvblF1YXRlcm5pb25BbmRyb2lkO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5mcmFtZVN0YXRlLnNjcmVlbk9yaWVudGF0aW9uRGVncmVlcztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVVzZXIgPSB0aGlzLnVzZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlU3RhZ2UgPSB0aGlzLnN0YWdlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLnBvc2l0aW9uKSBkZXZpY2VVc2VyLnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIub3JpZW50YXRpb24pIGRldmljZVVzZXIub3JpZW50YXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkpLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLmZyb21FbGVtZW50cygwLDAsdGhpcy5fc3RhYmxlU3RhdGUuc3VnZ2VzdGVkVXNlckhlaWdodCwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksXG4gICAgICAgICAgICAgICAgICAgIGRldmljZVN0YWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuVU5JVF9aLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZU9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbW90aW9uTWFuYWdlcklPUz86Q01Nb3Rpb25NYW5hZ2VyO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TW90aW9uTWFuYWdlcklPUygpIDogQ01Nb3Rpb25NYW5hZ2VyfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICh0aGlzLl9tb3Rpb25NYW5hZ2VySU9TKSByZXR1cm4gdGhpcy5fbW90aW9uTWFuYWdlcklPUztcblxuICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gQ01Nb3Rpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuICAgICAgICBtb3Rpb25NYW5hZ2VyLnNob3dzRGV2aWNlTW92ZW1lbnREaXNwbGF5ID0gdHJ1ZVxuICAgICAgICBtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvblVwZGF0ZUludGVydmFsID0gMS4wIC8gMTAwLjA7XG4gICAgICAgIGlmICghbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25BdmFpbGFibGUgfHwgIW1vdGlvbk1hbmFnZXIubWFnbmV0b21ldGVyQXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk5PIE1hZ25ldG9tZXRlciBhbmQvb3IgR3lyby4gXCIgKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWU6Q01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lO1xuICAgICAgICAgICAgaWYgKENNTW90aW9uTWFuYWdlci5hdmFpbGFibGVBdHRpdHVkZVJlZmVyZW5jZUZyYW1lcygpICYgQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWwpIHtcbiAgICAgICAgICAgICAgICBlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSA9IENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsO1xuICAgICAgICAgICAgICAgIG1vdGlvbk1hbmFnZXIuc3RhcnREZXZpY2VNb3Rpb25VcGRhdGVzVXNpbmdSZWZlcmVuY2VGcmFtZShlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTk8gIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZVhUcnVlTm9ydGhaVmVydGljYWxcIiApO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbW90aW9uTWFuYWdlcklPUyA9IG1vdGlvbk1hbmFnZXI7XG4gICAgICAgIHJldHVybiBtb3Rpb25NYW5hZ2VyO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2xvY2F0aW9uTWFuYWdlcklPUz86Q0xMb2NhdGlvbk1hbmFnZXI7XG5cbiAgICBwcml2YXRlIF9nZXRMb2NhdGlvbk1hbmFnZXJJT1MoKSB7XG4gICAgICAgIGlmICghdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TKSB7XG4gICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MgPSBDTExvY2F0aW9uTWFuYWdlci5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICAgICAgc3dpdGNoIChDTExvY2F0aW9uTWFuYWdlci5hdXRob3JpemF0aW9uU3RhdHVzKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZFdoZW5JblVzZTpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZEFsd2F5czogXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNOb3REZXRlcm1pbmVkOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MucmVxdWVzdFdoZW5JblVzZUF1dGhvcml6YXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0RlbmllZDpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzUmVzdHJpY3RlZDpcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFjdGlvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJMb2NhdGlvbiBTZXJ2aWNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEluIG9yZGVyIHRvIHByb3ZpZGUgdGhlIGJlc3QgQXVnbWVudGVkIFJlYWxpdHkgZXhwZXJpZW5jZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxlYXNlIG9wZW4gdGhpcyBhcHAncyBzZXR0aW5ncyBhbmQgZW5hYmxlIGxvY2F0aW9uIHNlcnZpY2VzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwiQ2FuY2VsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ1NldHRpbmdzJ11cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbigoYWN0aW9uKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ1NldHRpbmdzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IE5TVVJMLlVSTFdpdGhTdHJpbmcoVUlBcHBsaWNhdGlvbk9wZW5TZXR0aW5nc1VSTFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5vcGVuVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUztcbiAgICB9XG5cbiAgICBwcml2YXRlIF9tb3Rpb25NYW5hZ2VyQW5kcm9pZD86YW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyO1xuICAgIHByaXZhdGUgX21vdGlvblF1YXRlcm5pb25BbmRyb2lkID0gbmV3IFF1YXRlcm5pb247XG5cbiAgICBwcml2YXRlIF9nZXRNb3Rpb25NYW5hZ2VyQW5kcm9pZCgpIDogYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICh0aGlzLl9tb3Rpb25NYW5hZ2VyQW5kcm9pZCkgcmV0dXJuIHRoaXMuX21vdGlvbk1hbmFnZXJBbmRyb2lkO1xuXG4gICAgICAgIHZhciBzZW5zb3JNYW5hZ2VyID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkuZ2V0U3lzdGVtU2VydmljZShhbmRyb2lkLmNvbnRlbnQuQ29udGV4dC5TRU5TT1JfU0VSVklDRSk7XG4gICAgICAgIHZhciByb3RhdGlvblNlbnNvciA9IHNlbnNvck1hbmFnZXIuZ2V0RGVmYXVsdFNlbnNvcihhbmRyb2lkLmhhcmR3YXJlLlNlbnNvci5UWVBFX1JPVEFUSU9OX1ZFQ1RPUik7XG5cbiAgICAgICAgdmFyIHNlbnNvckV2ZW50TGlzdGVuZXIgPSBuZXcgYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uQWNjdXJhY3lDaGFuZ2VkOiAoc2Vuc29yLCBhY2N1cmFjeSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJvbkFjY3VyYWN5Q2hhbmdlZDogXCIgKyBhY2N1cmFjeSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TZW5zb3JDaGFuZ2VkOiAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLnVucGFjayg8bnVtYmVyW10+ZXZlbnQudmFsdWVzLCAwLCB0aGlzLl9tb3Rpb25RdWF0ZXJuaW9uQW5kcm9pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlbnNvck1hbmFnZXIucmVnaXN0ZXJMaXN0ZW5lcihzZW5zb3JFdmVudExpc3RlbmVyLCByb3RhdGlvblNlbnNvciwgYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JNYW5hZ2VyLlNFTlNPUl9ERUxBWV9HQU1FKTtcbiAgICAgICAgdGhpcy5fbW90aW9uTWFuYWdlckFuZHJvaWQgPSBzZW5zb3JFdmVudExpc3RlbmVyO1xuICAgICAgICByZXR1cm4gc2Vuc29yRXZlbnRMaXN0ZW5lcjtcbiAgICB9XG59XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyIGV4dGVuZHMgQXJnb24uRGV2aWNlU2VydmljZVByb3ZpZGVyIHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgY29udGFpbmVyLCBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICBkZXZpY2VTZXJ2aWNlOkFyZ29uLkRldmljZVNlcnZpY2UsIFxuICAgICAgICBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSwgXG4gICAgICAgIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZTpBcmdvbi5Db250ZXh0U2VydmljZVByb3ZpZGVyLFxuICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIHNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgICAgIGRldmljZVNlcnZpY2UsIFxuICAgICAgICAgICAgY29udGV4dFNlcnZpY2UsIFxuICAgICAgICAgICAgdmlld1NlcnZpY2UsICAgICAgICAgXG4gICAgICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZVxuICAgICAgICApO1xuXG4gICAgICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKT0+e1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFN0YWJsZVN0YXRlKCk7XG4gICAgICAgICAgICB9LCA2MDApO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhYmxlU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2NhdGlvbldhdGNoSWQ/Om51bWJlcjtcblxuICAgIC8vIHByaXZhdGUgX3NjcmF0Y2hDYXJ0ZXNpYW4gPSBuZXcgQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFBlcnNwZWN0aXZlRnJ1c3R1bSA9IG5ldyBBcmdvbi5DZXNpdW0uUGVyc3BlY3RpdmVGcnVzdHVtO1xuXG4gICAgcHJvdGVjdGVkIG9uVXBkYXRlU3RhYmxlU3RhdGUoZGV2aWNlU3RhdGU6QXJnb24uRGV2aWNlU3RhYmxlU3RhdGUpIHtcblxuICAgICAgICBpZiAoIWRldmljZVN0YXRlLmlzUHJlc2VudGluZ0hNRCB8fCAhdnVmb3JpYS5hcGkpIHtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnZpZXdwb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUuc3Vidmlld3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS5zdHJpY3QgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1YnZpZXdzID0gZGV2aWNlU3RhdGUuc3Vidmlld3MgPSBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyB8fCBbXTtcblxuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nUHJpbWl0aXZlcyA9IGRldmljZS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk7XG4gICAgICAgIGNvbnN0IHJlbmRlcmluZ1ZpZXdzID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRSZW5kZXJpbmdWaWV3cygpO1xuICAgICAgICBjb25zdCBudW1WaWV3cyA9IHJlbmRlcmluZ1ZpZXdzLmdldE51bVZpZXdzKCk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gKDxVSVZpZXc+dnVmb3JpYS52aWRlb1ZpZXcuaW9zKS5jb250ZW50U2NhbGVGYWN0b3IgOiBwbGF0Zm9ybS5zY3JlZW4ubWFpblNjcmVlbi5zY2FsZTtcblxuICAgICAgICBzdWJ2aWV3cy5sZW5ndGggPSBudW1WaWV3cztcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVZpZXdzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHZpZXcgPSByZW5kZXJpbmdWaWV3cy5nZXRWaWV3KGkpO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBzdXBwb3J0IFBvc3RQcm9jZXNzIHJlbmRlcmluZyBzdWJ2aWV3XG4gICAgICAgICAgICBpZiAodmlldyA9PT0gdnVmb3JpYS5WaWV3LlBvc3RQcm9jZXNzKSB7XG4gICAgICAgICAgICAgICAgc3Vidmlld3MubGVuZ3RoLS07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN1YnZpZXcgPSBzdWJ2aWV3c1tpXSA9IHN1YnZpZXdzW2ldIHx8IDxBcmdvbi5TZXJpYWxpemVkU3Vidmlldz57fTtcblxuICAgICAgICAgICAgLy8gU2V0IHN1YnZpZXcgdHlwZVxuICAgICAgICAgICAgc3dpdGNoICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuTGVmdEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuTEVGVEVZRTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuUmlnaHRFeWU6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLlJJR0hURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5TaW5ndWxhcjpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLk9USEVSOyBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIHN1YnZpZXcgdmlld3BvcnRcbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFZpZXdwb3J0KHZpZXcpO1xuICAgICAgICAgICAgY29uc3Qgc3Vidmlld1ZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCA9IHN1YnZpZXcudmlld3BvcnQgfHwgPEFyZ29uLlZpZXdwb3J0Pnt9O1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LnggPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LnggLyBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueSA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueSAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC53aWR0aCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueiAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC5oZWlnaHQgPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LncgLyBjb250ZW50U2NhbGVGYWN0b3I7XG5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHByb2plY3Rpb24gbWF0cml4IGZvciB0aGlzIHN1YnZpZXdcbiAgICAgICAgICAgIC8vIE5vdGU6IFZ1Zm9yaWEgdXNlcyBhIHJpZ2h0LWhhbmRlZCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHggdG8gdGhlIHJpZ2h0LCB5IGRvd24sIGFuZCB6IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi5cbiAgICAgICAgICAgIC8vIFNvIHdlIGFyZSBjb252ZXJ0aW5nIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uIG9mIHggdG8gdGhlIHJpZ2h0LCB5IHVwLCBhbmQgLXogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLiBcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gPGFueT5yZW5kZXJpbmdQcmltaXRpdmVzLmdldFByb2plY3Rpb25NYXRyaXgodmlldywgdnVmb3JpYS5Db29yZGluYXRlU3lzdGVtVHlwZS5DYW1lcmEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzRmluaXRlKHByb2plY3Rpb25NYXRyaXhbMF0pKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBpZiBvdXIgcHJvamVjdGlvbiBtYXRyaXggaXMgZ2l2aW5nIG51bGwgdmFsdWVzIHRoZW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gc3VyZmFjZSBpcyBub3QgcHJvcGVybHkgY29uZmlndXJlZCBmb3Igc29tZSByZWFzb24sIHNvIHJlc2V0IGl0XG4gICAgICAgICAgICAgICAgLy8gKG5vdCBzdXJlIHdoeSB0aGlzIGhhcHBlbnMsIGJ1dCBpdCBvbmx5IHNlZW1zIHRvIGhhcHBlbiBhZnRlciBvciBiZXR3ZWVuIFxuICAgICAgICAgICAgICAgIC8vIHZ1Zm9yaWEgaW5pdGlhbGl6YXRpb25zKVxuICAgICAgICAgICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmZyYW1lLnNpemUud2lkdGggOiB2dWZvcmlhLnZpZGVvVmlldy5hbmRyb2lkLmdldFdpZHRoKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IHZ1Zm9yaWEudmlkZW9WaWV3LmlvcyA/IHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcy5mcmFtZS5zaXplLmhlaWdodCA6IHZ1Zm9yaWEudmlkZW9WaWV3LmFuZHJvaWQuZ2V0SGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAqIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGZydXN0dW0gPSB0aGlzLl9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uZm92ID0gTWF0aC5QSS8yO1xuICAgICAgICAgICAgICAgIGZydXN0dW0ubmVhciA9IDAuMDE7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mYXIgPSAxMDAwMDtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmFzcGVjdFJhdGlvID0gc3Vidmlld1ZpZXdwb3J0LndpZHRoIC8gc3Vidmlld1ZpZXdwb3J0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKGZydXN0dW0uYXNwZWN0UmF0aW8pIHx8IGZydXN0dW0uYXNwZWN0UmF0aW8gPT09IDApIGZydXN0dW0uYXNwZWN0UmF0aW8gPSAxO1xuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgLy8gVW5kbyB0aGUgdmlkZW8gcm90YXRpb24gc2luY2Ugd2UgYWxyZWFkeSBlbmNvZGUgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBpbiBvdXIgdmlldyBwb3NlXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogdGhlIFwiYmFzZVwiIHJvdGF0aW9uIGZvciB2dWZvcmlhJ3MgdmlkZW8gKGF0IGxlYXN0IG9uIGlPUykgaXMgdGhlIGxhbmRzY2FwZSByaWdodCBvcmllbnRhdGlvbixcbiAgICAgICAgICAgICAgICAvLyB3aGljaCBpcyB0aGUgb3JpZW50YXRpb24gd2hlcmUgdGhlIGRldmljZSBpcyBoZWxkIGluIGxhbmRzY2FwZSB3aXRoIHRoZSBob21lIGJ1dHRvbiBvbiB0aGUgcmlnaHQuIFxuICAgICAgICAgICAgICAgIC8vIFRoaXMgXCJiYXNlXCIgdmlkZW8gcm90YXRhdGlvbiBpcyAtOTAgZGVnIGFyb3VuZCAreiBmcm9tIHRoZSBwb3J0cmFpdCBpbnRlcmZhY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTbywgd2Ugd2FudCB0byB1bmRvIHRoaXMgcm90YXRpb24gd2hpY2ggdnVmb3JpYSBhcHBsaWVzIGZvciB1cy4gIFxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGNhbGN1bGF0ZSB0aGlzIG1hdHJpeCBvbmx5IHdoZW4gd2UgaGF2ZSB0byAod2hlbiB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGNoYW5nZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmZyb21UcmFuc2xhdGlvblF1YXRlcm5pb25Sb3RhdGlvblNjYWxlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlpFUk8sXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgKENlc2l1bU1hdGguUElfT1ZFUl9UV08gLSBzY3JlZW5PcmllbnRhdGlvbiAqIE1hdGguUEkgLyAxODApLCB0aGlzLl9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uKSxcbiAgICAgICAgICAgICAgICAgICAgT05FLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoTWF0cml4NFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocHJvamVjdGlvbk1hdHJpeCwgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICAgICAgLy8gY29udmVydCBmcm9tIHRoZSB2dWZvcmlhIHByb2plY3Rpb24gbWF0cml4ICgrWCAtWSArWikgdG8gYSBtb3JlIHN0YW5kYXJkIGNvbnZlbnRpb24gKCtYICtZIC1aKVxuICAgICAgICAgICAgICAgIC8vIGJ5IG5lZ2F0aW5nIHRoZSBhcHByb3ByaWF0ZSBjb2x1bW5zLiBcbiAgICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIudnVmb3JpYS5jb20vbGlicmFyeS9hcnRpY2xlcy9Tb2x1dGlvbi9Ib3ctVG8tVXNlLXRoZS1DYW1lcmEtUHJvamVjdGlvbi1NYXRyaXhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IC0xOyAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxXSAqPSAtMTsgLy8geVxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzhdICo9IC0xOyAgLy8geFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOV0gKj0gLTE7ICAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxMF0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzExXSAqPSAtMTsgLy8gd1xuXG4gICAgICAgICAgICAgICAgLy8gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHlCeVNjYWxlKHByb2plY3Rpb25NYXRyaXgsIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDEsLTEsLTEsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLCBwcm9qZWN0aW9uTWF0cml4KVxuXG4gICAgICAgICAgICAgICAgLy8gU2NhbGUgdGhlIHByb2plY3Rpb24gbWF0cml4IHRvIGZpdCBuaWNlbHkgd2l0aGluIGEgc3VidmlldyBvZiB0eXBlIFNJTkdVTEFSXG4gICAgICAgICAgICAgICAgLy8gKFRoaXMgc2NhbGUgd2lsbCBub3QgYXBwbHkgd2hlbiB0aGUgdXNlciBpcyB3ZWFyaW5nIGEgbW9ub2N1bGFyIEhNRCwgc2luY2UgYVxuICAgICAgICAgICAgICAgIC8vIG1vbm9jdWxhciBITUQgd291bGQgcHJvdmlkZSBhIHN1YnZpZXcgb2YgdHlwZSBMRUZURVlFIG9yIFJJR0hURVlFKVxuICAgICAgICAgICAgICAgIC8vIGlmIChzdWJ2aWV3LnR5cGUgPT0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVIpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3Qgd2lkdGhSYXRpbyA9IHN1YnZpZXdXaWR0aCAvIHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3QgaGVpZ2h0UmF0aW8gPSBzdWJ2aWV3SGVpZ2h0IC8gdmlkZW9Nb2RlLmhlaWdodDtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBhc3BlY3QgZmlsbFxuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWF4KHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gb3IgYXNwZWN0IGZpdFxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWluKHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB4LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFswXSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFszXSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB5LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs0XSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzVdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs3XSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUocHJvamVjdGlvbk1hdHJpeCwgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4KTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAvLyBjb25zdCBleWVBZGp1c3RtZW50TWF0cml4ID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3KTtcbiAgICAgICAgICAgIC8vIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocmF3UHJvamVjdGlvbk1hdHJpeCwgZXllQWRqdXN0bWVudE1hdHJpeCwgW10pO1xuICAgICAgICAgICAgLy8gcHJvamVjdGlvbk1hdHJpeCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0LmZyb21Sb3dNYWpvckFycmF5KHByb2plY3Rpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBkZWZhdWx0IHRvIGlkZW50aXR5IHN1YnZpZXcgcG9zZSAoaW4gcmVsYXRpb24gdG8gdGhlIG92ZXJhbGwgdmlldyBwb3NlKVxuICAgICAgICAgICAgLy8gVE9ETzogdXNlIGV5ZSBhZGp1c3RtZW50IG1hdHJpeCB0byBnZXQgc3VidmlldyBwb3NlcyAoZm9yIGV5ZSBzZXBhcmF0aW9uKS4gU2VlIGNvbW1lbnRlZCBvdXQgY29kZSBhYm92ZS4uLlxuICAgICAgICAgICAgc3Vidmlldy5wb3NlID0gdW5kZWZpbmVkOyBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCBvblN0YXJ0R2VvbG9jYXRpb25VcGRhdGVzKG9wdGlvbnM6QXJnb24uR2VvbG9jYXRpb25PcHRpb25zKSA6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMubG9jYXRpb25XYXRjaElkICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KT0+e1xuXG4gICAgICAgICAgICAvLyBOb3RlOiB0aGUgZC50cyBmb3IgbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uIGlzIHdyb25nLiBUaGlzIGNhbGwgaXMgY29ycmVjdC4gXG4gICAgICAgICAgICAvLyBDYXN0aW5nIHRoZSBtb2R1bGUgYXMgPGFueT4gaGVyZSBmb3Igbm93IHRvIGhpZGUgYW5ub3lpbmcgdHlwZXNjcmlwdCBlcnJvcnMuLi5cbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gKDxhbnk+Z2VvbG9jYXRpb24pLndhdGNoTG9jYXRpb24oKGxvY2F0aW9uOmdlb2xvY2F0aW9uLkxvY2F0aW9uKT0+e1xuICAgICAgICAgICAgICAgIC8vIE5vdGU6IGlPUyBkb2N1bWVudGF0aW9uIHN0YXRlcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSByZWZlcnMgdG8gaGVpZ2h0IChtZXRlcnMpIGFib3ZlIHNlYSBsZXZlbCwgYnV0IFxuICAgICAgICAgICAgICAgIC8vIGlmIGlvcyBpcyByZXBvcnRpbmcgdGhlIHN0YW5kYXJkIGdwcyBkZWZpbmVkIGFsdGl0dWRlLCB0aGVuIHRoaXMgdGhlb3JldGljYWwgXCJzZWEgbGV2ZWxcIiBhY3R1YWxseSByZWZlcnMgdG8gXG4gICAgICAgICAgICAgICAgLy8gdGhlIFdHUzg0IGVsbGlwc29pZCByYXRoZXIgdGhhbiB0cmFkaXRpb25hbCBtZWFuIHNlYSBsZXZlbCAoTVNMKSB3aGljaCBpcyBub3QgYSBzaW1wbGUgc3VyZmFjZSBhbmQgdmFyaWVzIFxuICAgICAgICAgICAgICAgIC8vIGFjY29yZGluZyB0byB0aGUgbG9jYWwgZ3Jhdml0YXRpb25hbCBmaWVsZC4gXG4gICAgICAgICAgICAgICAgLy8gSW4gb3RoZXIgd29yZHMsIG15IGJlc3QgZ3Vlc3MgaXMgdGhhdCB0aGUgYWx0aXR1ZGUgdmFsdWUgaGVyZSBpcyAqcHJvYmFibHkqIEdQUyBkZWZpbmVkIGFsdGl0dWRlLCB3aGljaCBcbiAgICAgICAgICAgICAgICAvLyBpcyBlcXVpdmFsZW50IHRvIHRoZSBoZWlnaHQgYWJvdmUgdGhlIFdHUzg0IGVsbGlwc29pZCwgd2hpY2ggaXMgZXhhY3RseSB3aGF0IENlc2l1bSBleHBlY3RzLi4uXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmVTdGFnZShcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubG9uZ2l0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubGF0aXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5hbHRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhvcml6b250YWxBY2N1cmFjeSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLnZlcnRpY2FsQWNjdXJhY3lcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAoZSk9PntcbiAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9LCA8Z2VvbG9jYXRpb24uT3B0aW9ucz57XG4gICAgICAgICAgICAgICAgZGVzaXJlZEFjY3VyYWN5OiBvcHRpb25zICYmIG9wdGlvbnMuZW5hYmxlSGlnaEFjY3VyYWN5ID8gXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmlvcyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAga0NMTG9jYXRpb25BY2N1cmFjeUJlc3QgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmhpZ2ggOiBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5S2lsb21ldGVyIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmFueSxcbiAgICAgICAgICAgICAgICB1cGRhdGVEaXN0YW5jZTogYXBwbGljYXRpb24uaW9zID8ga0NMRGlzdGFuY2VGaWx0ZXJOb25lIDogMCxcbiAgICAgICAgICAgICAgICBtaW5pbXVtVXBkYXRlVGltZSA6IG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVIaWdoQWNjdXJhY3kgP1xuICAgICAgICAgICAgICAgICAgICAwIDogNTAwMCAvLyByZXF1aXJlZCBvbiBBbmRyb2lkLCBpZ25vcmVkIG9uIGlPU1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbG9jYXRpb24gd2F0Y2hlci4gXCIgKyB0aGlzLmxvY2F0aW9uV2F0Y2hJZCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFxuICAgIHByb3RlY3RlZCBvblN0b3BHZW9sb2NhdGlvblVwZGF0ZXMoKSA6IHZvaWQge1xuICAgICAgICBpZiAoQXJnb24uQ2VzaXVtLmRlZmluZWQodGhpcy5sb2NhdGlvbldhdGNoSWQpKSB7XG4gICAgICAgICAgICBnZW9sb2NhdGlvbi5jbGVhcldhdGNoKHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDQgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFZpZGVvUXVhdGVybmlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBpZiAodGhpcy5mb2N1c1NlcnZpY2VQcm92aWRlci5zZXNzaW9uID09IHNlc3Npb24pIHJldHVybjsgXG4gICAgICAgIGlmIChzZXNzaW9uID09IHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcikgcmV0dXJuO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZG9lcyBub3QgaGF2ZSBmb2N1cy4nKVxuICAgIH1cbiAgICBcbiAgICBoYW5kbGVSZXF1ZXN0UHJlc2VudEhNRChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2UgJiYgZGV2aWNlLnNldFZpZXdlckFjdGl2ZSh0cnVlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGhhbmRsZUV4aXRQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBfaXNIbWRBY3RpdmUoKSB7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICByZXR1cm4gZGV2aWNlLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuXG59Il19