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
        _this._scratchPerspectiveFrustum = new Argon.Cesium.PerspectiveFrustum;
        _this._scratchVideoMatrix4 = new Argon.Cesium.Matrix4;
        _this._scratchVideoQuaternion = new Argon.Cesium.Quaternion;
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
    Object.defineProperty(NativescriptDeviceService.prototype, "screenOrientationDegrees", {
        get: function () {
            return util_1.screenOrientation;
        },
        enumerable: true,
        configurable: true
    });
    NativescriptDeviceService.prototype.onRequestPresentHMD = function () {
        var device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(true);
        return Promise.resolve();
    };
    NativescriptDeviceService.prototype.onExitPresentHMD = function () {
        var device = vuforia.api && vuforia.api.getDevice();
        device && device.setViewerActive(false);
        return Promise.resolve();
    };
    NativescriptDeviceService.prototype.onUpdateFrameState = function () {
        var viewport = this.frameState.viewport;
        var contentView = frames.topmost().currentPage.content;
        var contentSize = contentView.getActualSize();
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = contentSize.width;
        viewport.height = contentSize.height;
        var subviews = this.frameState.subviews;
        var device = vuforia.api.getDevice();
        var renderingPrimitives = device.getRenderingPrimitives();
        var renderingViews = renderingPrimitives.getRenderingViews();
        var numViews = renderingViews.getNumViews();
        var contentScaleFactor = vuforia.videoView.ios ? vuforia.videoView.ios.contentScaleFactor : platform.screen.mainScreen.scale;
        subviews.length = numViews;
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
                    vuforia.api.onSurfaceChanged(viewport.width * contentScaleFactor, viewport.height * contentScaleFactor);
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
                var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, (CesiumMath.PI_OVER_TWO - util_1.screenOrientation * Math.PI / 180), this._scratchVideoQuaternion), ONE, this._scratchVideoMatrix4);
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
                var screenOrientationDegrees = this.screenOrientationDegrees;
                var deviceUser = this.user;
                var deviceStage = this.stage;
                if (!deviceUser.position)
                    deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation)
                    deviceUser.orientation = new Argon.Cesium.ConstantProperty();
                deviceUser.position.setValue(Cartesian3.fromElements(0, 0, this.suggestedUserHeight, this._scratchCartesian), deviceStage);
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
                var screenOrientationDegrees = this.screenOrientationDegrees;
                var deviceUser = this.user;
                var deviceStage = this.stage;
                if (!deviceUser.position)
                    deviceUser.position = new Argon.Cesium.ConstantPositionProperty();
                if (!deviceUser.orientation)
                    deviceUser.orientation = new Argon.Cesium.ConstantProperty();
                deviceUser.position.setValue(Cartesian3.fromElements(0, 0, this.suggestedUserHeight, this._scratchCartesian), deviceStage);
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
        _this._scratchStageCartographic = new Argon.Cesium.Cartographic;
        application.on(application.orientationChangedEvent, function () {
            setTimeout(function () {
                _this.publishStableState();
            }, 600);
            _this.publishStableState();
        });
        return _this;
    }
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
                _this.configureStage(Argon.Cesium.Cartographic.fromDegrees(location.longitude, location.latitude, location.altitude, _this._scratchStageCartographic), location.horizontalAccuracy, location.verticalAccuracy);
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
        return Promise.resolve();
    };
    NativescriptDeviceServiceProvider.prototype.handleExitPresentHMD = function (session) {
        this._ensurePermission(session);
        return Promise.resolve();
    };
    return NativescriptDeviceServiceProvider;
}(Argon.DeviceServiceProvider));
NativescriptDeviceServiceProvider = __decorate([
    Argon.DI.autoinject,
    __metadata("design:paramtypes", [Object, Argon.SessionService, Argon.DeviceService, Argon.ContextService, Argon.ViewService, Argon.ContextServiceProvider, Argon.FocusServiceProvider, Argon.RealityService])
], NativescriptDeviceServiceProvider);
exports.NativescriptDeviceServiceProvider = NativescriptDeviceServiceProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUNsQyxtQ0FBcUM7QUFFckMsOENBQWdEO0FBQ2hELGlDQUFtQztBQUVuQyxzQ0FBd0M7QUFFeEMsK0JBQXdDO0FBRXhDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sT0FBTyxHQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBRXhDLElBQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDaEYsSUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUdsQyxJQUFhLHlCQUF5QjtJQUFTLDZDQUFtQjtJQUU5RCxtQ0FDSSxjQUFtQyxFQUNuQyxjQUFtQyxFQUNuQyxXQUE2QixFQUM3QixpQkFBeUMsRUFDekMsc0JBQW1EO1FBTHZELFlBTUksa0JBQU0sY0FBYyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsU0FxQnhFO1FBRU8sc0JBQWdCLEdBQUcsVUFBQyxFQUFXLEVBQUUsR0FBVTtZQUMvQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUM7UUFFTSxrQkFBWSxHQUFHLFdBQVcsQ0FBQztRQUMzQixnQ0FBMEIsR0FBRyxJQUFJLFVBQVUsQ0FBQztRQUM1QywrQkFBeUIsR0FBRyxJQUFJLFVBQVUsQ0FBQztRQUUzQyxTQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1IsZ0JBQVUsR0FBMEIsRUFBRSxDQUFDO1FBQ3ZDLGlCQUFXLEdBQTBCLEVBQUUsQ0FBQztRQUVoRCwyQkFBcUIsR0FBRyxVQUFDLEVBQTJCO1lBQ2hELEtBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNYLEtBQUksQ0FBQyxVQUFVLENBQUMsS0FBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMvQixNQUFNLENBQUMsS0FBSSxDQUFDLEdBQUcsQ0FBQztRQUNwQixDQUFDLENBQUE7UUFFRCwwQkFBb0IsR0FBRyxVQUFDLEVBQVM7WUFDN0IsT0FBTyxLQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQTtRQWtCTyxnQ0FBMEIsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUM7UUFDakUsMEJBQW9CLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUNoRCw2QkFBdUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO1FBdVN0RCw4QkFBd0IsR0FBRyxJQUFJLFVBQVUsQ0FBQztRQXBXOUMsSUFBTSxHQUFHLEdBQXVDLHNCQUFzQixDQUFDO1FBRXZFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNsQyxJQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3JDLHFCQUFxQjtZQUNyQixJQUFNLFNBQVMsR0FBRyxLQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2xDLEtBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSSxDQUFDLFdBQVcsQ0FBQztZQUNuQyxLQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztZQUM3QixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixLQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdDLENBQUM7WUFDRCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2YsV0FBVyxDQUFDLGNBQU0sT0FBQSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQTlELENBQThELEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUYsQ0FBQzs7SUFDTCxDQUFDO0lBd0JELHNCQUFJLCtEQUF3QjthQUE1QjtZQUNJLE1BQU0sQ0FBQyx3QkFBaUIsQ0FBQztRQUM3QixDQUFDOzs7T0FBQTtJQUVELHVEQUFtQixHQUFuQjtRQUNJLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN0RCxNQUFNLElBQUksTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCxvREFBZ0IsR0FBaEI7UUFDSSxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsTUFBTSxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBTUQsc0RBQWtCLEdBQWxCO1FBRUksSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7UUFDMUMsSUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUM7UUFDekQsSUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2hELFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZixRQUFRLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUM7UUFDbkMsUUFBUSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDO1FBRXJDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1FBQzFDLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkMsSUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM1RCxJQUFNLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQy9ELElBQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUU5QyxJQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFZLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBSSxDQUFDLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztRQUV6SSxRQUFRLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQztRQUFBLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO1FBRXRELEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEMsSUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV2Qyw4Q0FBOEM7WUFDOUMsRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDcEMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixRQUFRLENBQUM7WUFDYixDQUFDO1lBRUQsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBNkIsRUFBRSxDQUFDO1lBRXpFLG1CQUFtQjtZQUNuQixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNYLEtBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPO29CQUNyQixPQUFPLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO29CQUFDLEtBQUssQ0FBQztnQkFDcEQsS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVE7b0JBQ3RCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7b0JBQUMsS0FBSyxDQUFDO2dCQUNyRCxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUTtvQkFDdEIsT0FBTyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztvQkFBQyxLQUFLLENBQUM7Z0JBQ3JEO29CQUNJLE9BQU8sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQUMsS0FBSyxDQUFDO1lBQ3RELENBQUM7WUFFRCwwQkFBMEI7WUFDMUIsSUFBTSxzQkFBc0IsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckUsSUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxJQUFvQixFQUFFLENBQUM7WUFDbEYsZUFBZSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFDbEUsZUFBZSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFDbEUsZUFBZSxDQUFDLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFDdEUsZUFBZSxDQUFDLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFFdkUsb0RBQW9EO1lBQ3BELG1IQUFtSDtZQUNuSCxnSEFBZ0g7WUFDaEgsSUFBSSxnQkFBZ0IsR0FBUSxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRS9HLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVqQywwREFBMEQ7Z0JBQzFELGtFQUFrRTtnQkFDbEUsNEVBQTRFO2dCQUM1RSwyQkFBMkI7Z0JBQzNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQ3hCLFFBQVEsQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLEVBQ25DLFFBQVEsQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLENBQ3ZDLENBQUM7Z0JBQ04sQ0FBQztnQkFFRCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUM7Z0JBQ2hELE9BQU8sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixPQUFPLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQztnQkFDcEIsT0FBTyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUM7Z0JBQ3JFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxPQUFPLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQztvQkFBQyxPQUFPLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztnQkFDekYsT0FBTyxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRWpHLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFFSiw2RkFBNkY7Z0JBQzdGLHNHQUFzRztnQkFDdEcscUdBQXFHO2dCQUNyRyw0RkFBNEY7Z0JBQzVGLG9FQUFvRTtnQkFDcEUsNEZBQTRGO2dCQUM1RixJQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FDN0UsVUFBVSxDQUFDLElBQUksRUFDZixVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLHdCQUFpQixHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQ3ZJLEdBQUcsRUFDSCxJQUFJLENBQUMsb0JBQW9CLENBQzVCLENBQUM7Z0JBQ0YsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLDBCQUEwQixFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBRTlGLGlHQUFpRztnQkFDakcsd0NBQXdDO2dCQUN4QyxzR0FBc0c7Z0JBQ3RHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtnQkFDL0IsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUMvQixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7Z0JBQy9CLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtnQkFFL0IsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBRSxJQUFJO2dCQUNoQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFFLElBQUk7Z0JBQ2hDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtnQkFDaEMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUVoQyxxSUFBcUk7Z0JBRXJJLDhFQUE4RTtnQkFDOUUsK0VBQStFO2dCQUMvRSxxRUFBcUU7Z0JBQ3JFLG9EQUFvRDtnQkFDcEQseURBQXlEO2dCQUN6RCw0REFBNEQ7Z0JBRTVELHFCQUFxQjtnQkFDckIsNkRBQTZEO2dCQUM3RCx1QkFBdUI7Z0JBQ3ZCLGdFQUFnRTtnQkFFaEUsc0JBQXNCO2dCQUN0QiwrQ0FBK0M7Z0JBQy9DLCtDQUErQztnQkFDL0MsK0NBQStDO2dCQUMvQywrQ0FBK0M7Z0JBQy9DLHNCQUFzQjtnQkFDdEIsK0NBQStDO2dCQUMvQywrQ0FBK0M7Z0JBQy9DLCtDQUErQztnQkFDL0MsK0NBQStDO2dCQUMvQyxJQUFJO2dCQUVKLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7WUFHRCx1RkFBdUY7WUFDdkYsc0dBQXNHO1lBQ3RHLGlHQUFpRztZQUVqRywwRUFBMEU7WUFDMUUsNkdBQTZHO1lBQzdHLE9BQU8sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBQzdCLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEIsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDbEQsSUFBTSxNQUFNLEdBQUcsYUFBYSxJQUFJLGFBQWEsQ0FBQyxZQUFZLENBQUM7WUFFM0QsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDVCxJQUFNLGdCQUFnQixHQUE0QixNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFFN0UsZ0dBQWdHO2dCQUNoRyxrR0FBa0c7Z0JBQ2xHLHdEQUF3RDtnQkFDeEQsaUZBQWlGO2dCQUNqRiwrRUFBK0U7Z0JBQy9FLDhGQUE4RjtnQkFDOUYsbUZBQW1GO2dCQUNuRixJQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO2dCQUVyRyxJQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQztnQkFFL0QsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDN0IsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFFL0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO29CQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Z0JBQzVGLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztvQkFBQyxVQUFVLENBQUMsV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUV6RixVQUFVLENBQUMsUUFBa0QsQ0FBQyxRQUFRLENBQ25FLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQzdFLFdBQVcsQ0FDZCxDQUFDO2dCQUVGLElBQU0sbUJBQWlCLEdBQ25CLFVBQVUsQ0FBQyxhQUFhLENBQ3BCLFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLHdCQUF3QixHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsRUFDeEQsSUFBSSxDQUFDLDBCQUEwQixDQUNsQyxDQUFDO2dCQUVOLElBQU0sNEJBQTRCLEdBQzlCLFVBQVUsQ0FBQyxRQUFRLENBQ2YsaUJBQWlCLEVBQ2pCLG1CQUFpQixFQUNqQixJQUFJLENBQUMseUJBQXlCLENBQ2pDLENBQUM7Z0JBRUwsVUFBVSxDQUFDLFdBQTZDLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLENBQUM7Z0JBRWpHLElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUN0RCxJQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO2dCQUN4QyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDOUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGtCQUFrQixHQUFHLE9BQU8sSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQy9FLENBQUM7UUFFTCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUVuQyxJQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUN0RCxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixJQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQztnQkFFeEQsSUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUM7Z0JBRS9ELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7Z0JBRS9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztvQkFBQyxVQUFVLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUM1RixFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7b0JBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFFekYsVUFBVSxDQUFDLFFBQWtELENBQUMsUUFBUSxDQUNuRSxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUM3RSxXQUFXLENBQ2QsQ0FBQztnQkFFRixJQUFNLG1CQUFpQixHQUNuQixVQUFVLENBQUMsYUFBYSxDQUNwQixVQUFVLENBQUMsTUFBTSxFQUNqQix3QkFBd0IsR0FBRyxVQUFVLENBQUMsa0JBQWtCLEVBQ3hELElBQUksQ0FBQywwQkFBMEIsQ0FDbEMsQ0FBQztnQkFFTixJQUFNLDRCQUE0QixHQUM5QixVQUFVLENBQUMsUUFBUSxDQUNmLGlCQUFpQixFQUNqQixtQkFBaUIsRUFDakIsSUFBSSxDQUFDLHlCQUF5QixDQUNqQyxDQUFDO2dCQUVMLFVBQVUsQ0FBQyxXQUE2QyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1lBQ3JHLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUlPLHdEQUFvQixHQUE1QjtRQUNJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFFMUQsSUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JELGFBQWEsQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUE7UUFDL0MsYUFBYSxDQUFDLDBCQUEwQixHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUM7UUFDdkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMscUJBQXFCLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQy9FLGlEQUFpRDtZQUNqRCxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ3JCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLElBQUksdUJBQXVCLFNBQXlCLENBQUM7WUFDckQsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsMkJBQTRDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRyx1QkFBdUIsR0FBRywyQkFBNEMsQ0FBQztnQkFDdkUsYUFBYSxDQUFDLDJDQUEyQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDdkYsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLG1FQUFtRTtnQkFDbkUsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUNyQixDQUFDO1FBQ0wsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxhQUFhLENBQUM7UUFDdkMsTUFBTSxDQUFDLGFBQWEsQ0FBQztJQUN6QixDQUFDO0lBSU8sMERBQXNCLEdBQTlCO1FBQ0ksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQzVCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU1RCxNQUFNLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDOUMsS0FBSyxpREFBK0QsQ0FBQztnQkFDckUsS0FBSyw4Q0FBNEQ7b0JBQzdELEtBQUssQ0FBQztnQkFDVixLQUFLLDJDQUF5RDtvQkFDMUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLDZCQUE2QixFQUFFLENBQUM7b0JBQ3pELEtBQUssQ0FBQztnQkFDVixLQUFLLG9DQUFrRCxDQUFDO2dCQUN4RCxLQUFLLHdDQUFzRCxDQUFDO2dCQUM1RDtvQkFDSSxPQUFPLENBQUMsTUFBTSxDQUFDO3dCQUNYLEtBQUssRUFBRSxtQkFBbUI7d0JBQzFCLE9BQU8sRUFBRSx1SkFDd0Q7d0JBQ2pFLGdCQUFnQixFQUFFLFFBQVE7d0JBQzFCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQztxQkFDeEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07d0JBQ1gsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7NEJBQ3hCLElBQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsa0NBQWtDLENBQUMsQ0FBQzs0QkFDcEUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDbEYsQ0FBQztvQkFDTCxDQUFDLENBQUMsQ0FBQTtZQUNWLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNwQyxDQUFDO0lBS08sNERBQXdCLEdBQWhDO1FBQUEsaUJBa0JDO1FBakJHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztZQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUM7UUFFbEUsSUFBSSxhQUFhLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwSCxJQUFJLGNBQWMsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUVsRyxJQUFJLG1CQUFtQixHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQztZQUMvRCxpQkFBaUIsRUFBRSxVQUFDLE1BQU0sRUFBRSxRQUFRO2dCQUNoQyxnREFBZ0Q7WUFDcEQsQ0FBQztZQUNELGVBQWUsRUFBRSxVQUFDLEtBQUs7Z0JBQ25CLFVBQVUsQ0FBQyxNQUFNLENBQVcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDaEYsQ0FBQztTQUNKLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN0SCxJQUFJLENBQUMscUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7UUFDakQsTUFBTSxDQUFDLG1CQUFtQixDQUFDO0lBQy9CLENBQUM7SUFDTCxnQ0FBQztBQUFELENBQUMsQUFuWUQsQ0FBK0MsS0FBSyxDQUFDLGFBQWEsR0FtWWpFO0FBbllZLHlCQUF5QjtJQURyQyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVU7cUNBSUcsS0FBSyxDQUFDLGNBQWMsRUFDcEIsS0FBSyxDQUFDLGNBQWMsRUFDdkIsS0FBSyxDQUFDLFdBQVcsRUFDWCxLQUFLLENBQUMsaUJBQWlCLEVBQ2xCLEtBQUssQ0FBQyxzQkFBc0I7R0FQOUMseUJBQXlCLENBbVlyQztBQW5ZWSw4REFBeUI7QUFzWXRDLElBQWEsaUNBQWlDO0lBQVMscURBQTJCO0lBQzlFLDJDQUNJLFNBQVMsRUFDVCxjQUFtQyxFQUNuQyxhQUFpQyxFQUNqQyxjQUFtQyxFQUNuQyxXQUE2QixFQUM3Qix1QkFBb0QsRUFDNUMsb0JBQStDLEVBQ3ZELGNBQW1DO1FBUnZDLFlBU0ksa0JBQ0ksY0FBYyxFQUNkLGFBQWEsRUFDYixjQUFjLEVBQ2QsV0FBVyxFQUNYLHVCQUF1QixDQUMxQixTQVFKO1FBaEJXLDBCQUFvQixHQUFwQixvQkFBb0IsQ0FBMkI7UUFvQm5ELCtCQUF5QixHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7UUFWOUQsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUU7WUFDaEQsVUFBVSxDQUFDO2dCQUNQLEtBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNSLEtBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDOztJQUNQLENBQUM7SUFNUyxxRUFBeUIsR0FBbkMsVUFBb0MsT0FBZ0M7UUFBcEUsaUJBcUNDO1FBcENHLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsS0FBSyxXQUFXLENBQUM7WUFBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQUEsQ0FBQztRQUUzRSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUVyQywrRUFBK0U7WUFDL0UsaUZBQWlGO1lBQ2pGLEtBQUksQ0FBQyxlQUFlLEdBQVMsV0FBWSxDQUFDLGFBQWEsQ0FBQyxVQUFDLFFBQTZCO2dCQUNsRix5R0FBeUc7Z0JBQ3pHLCtHQUErRztnQkFDL0csNkdBQTZHO2dCQUM3RywrQ0FBK0M7Z0JBQy9DLDJHQUEyRztnQkFDM0csaUdBQWlHO2dCQUNqRyxLQUFJLENBQUMsY0FBYyxDQUNmLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFJLENBQUMseUJBQXlCLENBQUMsRUFDL0gsUUFBUSxDQUFDLGtCQUFrQixFQUMzQixRQUFRLENBQUMsZ0JBQWdCLENBQzVCLENBQUM7WUFDTixDQUFDLEVBQ0QsVUFBQyxDQUFDO2dCQUNFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLENBQUMsRUFBdUI7Z0JBQ3BCLGVBQWUsRUFBRSxPQUFPLElBQUksT0FBTyxDQUFDLGtCQUFrQjtvQkFDbEQsV0FBVyxDQUFDLEdBQUc7d0JBQ1gsdUJBQXVCO3dCQUN2QixLQUFLLENBQUMsUUFBUSxDQUFDLElBQUk7b0JBQ3ZCLFdBQVcsQ0FBQyxHQUFHO3dCQUNYLDRCQUE0Qjt3QkFDNUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHO2dCQUMxQixjQUFjLEVBQUUsV0FBVyxDQUFDLEdBQUcsR0FBRyxxQkFBcUIsR0FBRyxDQUFDO2dCQUMzRCxpQkFBaUIsRUFBRyxPQUFPLElBQUksT0FBTyxDQUFDLGtCQUFrQjtvQkFDckQsQ0FBQyxHQUFHLElBQUksQ0FBQyxzQ0FBc0M7YUFDdEQsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsR0FBRyxLQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdEUsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBR1Msb0VBQXdCLEdBQWxDO1FBQ0ksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQztRQUNyQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLDZEQUFpQixHQUF6QixVQUEwQixPQUF5QjtRQUMvQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQztZQUFDLE1BQU0sQ0FBQztRQUN6RCxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFBQyxNQUFNLENBQUM7UUFDbkQsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxtRUFBdUIsR0FBdkIsVUFBd0IsT0FBeUI7UUFDN0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGdFQUFvQixHQUFwQixVQUFxQixPQUF5QjtRQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUwsd0NBQUM7QUFBRCxDQUFDLEFBN0ZELENBQXVELEtBQUssQ0FBQyxxQkFBcUIsR0E2RmpGO0FBN0ZZLGlDQUFpQztJQUQ3QyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVU7NkNBSUcsS0FBSyxDQUFDLGNBQWMsRUFDckIsS0FBSyxDQUFDLGFBQWEsRUFDbEIsS0FBSyxDQUFDLGNBQWMsRUFDdkIsS0FBSyxDQUFDLFdBQVcsRUFDTCxLQUFLLENBQUMsc0JBQXNCLEVBQ3ZCLEtBQUssQ0FBQyxvQkFBb0IsRUFDeEMsS0FBSyxDQUFDLGNBQWM7R0FUOUIsaUNBQWlDLENBNkY3QztBQTdGWSw4RUFBaUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tIFwiYXBwbGljYXRpb25cIjtcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCAqIGFzIGdlb2xvY2F0aW9uIGZyb20gJ3NwZWlnZy1uYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24nO1xuaW1wb3J0ICogYXMgZGlhbG9ncyBmcm9tICd1aS9kaWFsb2dzJztcbmltcG9ydCAqIGFzIGVudW1zIGZyb20gJ3VpL2VudW1zJztcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gJ3BsYXRmb3JtJztcblxuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBmcmFtZXMgZnJvbSAndWkvZnJhbWUnO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tIFwiQGFyZ29uanMvYXJnb25cIjtcblxuaW1wb3J0IHtzY3JlZW5PcmllbnRhdGlvbn0gZnJvbSAnLi91dGlsJ1xuXG5jb25zdCBDYXJ0ZXNpYW4zID0gQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG5jb25zdCBRdWF0ZXJuaW9uID0gQXJnb24uQ2VzaXVtLlF1YXRlcm5pb247XG5jb25zdCBDZXNpdW1NYXRoID0gQXJnb24uQ2VzaXVtLkNlc2l1bU1hdGg7XG5jb25zdCBNYXRyaXg0ICAgID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG5cbmNvbnN0IHo5MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyk7XG5jb25zdCBPTkUgPSBuZXcgQ2FydGVzaWFuMygxLDEsMSk7XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSBleHRlbmRzIEFyZ29uLkRldmljZVNlcnZpY2Uge1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlOkFyZ29uLlNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgY29udGV4dFNlcnZpY2U6QXJnb24uQ29udGV4dFNlcnZpY2UsIFxuICAgICAgICB2aWV3U2VydmljZTpBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgdmlzaWJpbGl0eVNlcnZpY2U6QXJnb24uVmlzaWJpbGl0eVNlcnZpY2UsXG4gICAgICAgIHZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI6QXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlcikge1xuICAgICAgICBzdXBlcihzZXNzaW9uU2VydmljZSwgY29udGV4dFNlcnZpY2UsIHZpZXdTZXJ2aWNlLCB2aXNpYmlsaXR5U2VydmljZSk7XG5cbiAgICAgICAgY29uc3QgdnNwID0gPE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI+dnVmb3JpYVNlcnZpY2VQcm92aWRlcjtcblxuICAgICAgICB2c3Auc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICBjb25zdCBub3cgPSBnbG9iYWwucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICAvLyBzd2FwIGNhbGxiYWNrIG1hcHNcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcztcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrczI7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MyID0gY2FsbGJhY2tzO1xuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9leGVjdXRlQ2FsbGJhY2soY2FsbGJhY2tzW2ldLCBub3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB2c3Auc3RhdGVVcGRhdGVFdmVudC5yYWlzZUV2ZW50KEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlLm5vdygpKSwgMzQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZUNhbGxiYWNrID0gKGNiOkZ1bmN0aW9uLCBub3c6bnVtYmVyKSA9PiB7XG4gICAgICAgIGNiKG5vdyk7XG4gICAgfTtcblxuICAgIHByaXZhdGUgX2FwcGxpY2F0aW9uID0gYXBwbGljYXRpb247XG4gICAgcHJpdmF0ZSBfc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfaWQgPSAwO1xuICAgIHByaXZhdGUgX2NhbGxiYWNrczp7W2lkOm51bWJlcl06RnVuY3Rpb259ID0ge307XG4gICAgcHJpdmF0ZSBfY2FsbGJhY2tzMjp7W2lkOm51bWJlcl06RnVuY3Rpb259ID0ge307XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSAoY2I6KHRpbWVzdGFtcDpudW1iZXIpPT52b2lkKSA9PiB7XG4gICAgICAgIHRoaXMuX2lkKys7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrc1t0aGlzLl9pZF0gPSBjYjtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKGlkOm51bWJlcikgPT4ge1xuICAgICAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2lkXTtcbiAgICB9XG4gICAgXG4gICAgZ2V0IHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcygpIHtcbiAgICAgICAgcmV0dXJuIHNjcmVlbk9yaWVudGF0aW9uO1xuICAgIH1cblxuICAgIG9uUmVxdWVzdFByZXNlbnRITUQoKSB7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2UgJiYgZGV2aWNlLnNldFZpZXdlckFjdGl2ZSh0cnVlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIG9uRXhpdFByZXNlbnRITUQoKSB7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2UgJiYgZGV2aWNlLnNldFZpZXdlckFjdGl2ZShmYWxzZSk7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtID0gbmV3IEFyZ29uLkNlc2l1bS5QZXJzcGVjdGl2ZUZydXN0dW07XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFZpZGVvTWF0cml4NCA9IG5ldyBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbiAgICBwcml2YXRlIF9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uID0gbmV3IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuXG4gICAgb25VcGRhdGVGcmFtZVN0YXRlKCkge1xuXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0ID0gdGhpcy5mcmFtZVN0YXRlLnZpZXdwb3J0O1xuICAgICAgICBjb25zdCBjb250ZW50VmlldyA9IGZyYW1lcy50b3Btb3N0KCkuY3VycmVudFBhZ2UuY29udGVudDtcbiAgICAgICAgY29uc3QgY29udGVudFNpemUgPSBjb250ZW50Vmlldy5nZXRBY3R1YWxTaXplKCk7XG4gICAgICAgIHZpZXdwb3J0LnggPSAwO1xuICAgICAgICB2aWV3cG9ydC55ID0gMDtcbiAgICAgICAgdmlld3BvcnQud2lkdGggPSBjb250ZW50U2l6ZS53aWR0aDtcbiAgICAgICAgdmlld3BvcnQuaGVpZ2h0ID0gY29udGVudFNpemUuaGVpZ2h0O1xuXG4gICAgICAgIGNvbnN0IHN1YnZpZXdzID0gdGhpcy5mcmFtZVN0YXRlLnN1YnZpZXdzO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nUHJpbWl0aXZlcyA9IGRldmljZS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk7XG4gICAgICAgIGNvbnN0IHJlbmRlcmluZ1ZpZXdzID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRSZW5kZXJpbmdWaWV3cygpO1xuICAgICAgICBjb25zdCBudW1WaWV3cyA9IHJlbmRlcmluZ1ZpZXdzLmdldE51bVZpZXdzKCk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gKDxVSVZpZXc+dnVmb3JpYS52aWRlb1ZpZXcuaW9zKS5jb250ZW50U2NhbGVGYWN0b3IgOiBwbGF0Zm9ybS5zY3JlZW4ubWFpblNjcmVlbi5zY2FsZTtcblxuICAgICAgICBzdWJ2aWV3cy5sZW5ndGggPSBudW1WaWV3cztzdWJ2aWV3cy5sZW5ndGggPSBudW1WaWV3cztcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVZpZXdzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHZpZXcgPSByZW5kZXJpbmdWaWV3cy5nZXRWaWV3KGkpO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBzdXBwb3J0IFBvc3RQcm9jZXNzIHJlbmRlcmluZyBzdWJ2aWV3XG4gICAgICAgICAgICBpZiAodmlldyA9PT0gdnVmb3JpYS5WaWV3LlBvc3RQcm9jZXNzKSB7XG4gICAgICAgICAgICAgICAgc3Vidmlld3MubGVuZ3RoLS07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN1YnZpZXcgPSBzdWJ2aWV3c1tpXSA9IHN1YnZpZXdzW2ldIHx8IDxBcmdvbi5TZXJpYWxpemVkU3Vidmlldz57fTtcblxuICAgICAgICAgICAgLy8gU2V0IHN1YnZpZXcgdHlwZVxuICAgICAgICAgICAgc3dpdGNoICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuTGVmdEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuTEVGVEVZRTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuUmlnaHRFeWU6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLlJJR0hURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5TaW5ndWxhcjpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLk9USEVSOyBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIHN1YnZpZXcgdmlld3BvcnRcbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFZpZXdwb3J0KHZpZXcpO1xuICAgICAgICAgICAgY29uc3Qgc3Vidmlld1ZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCA9IHN1YnZpZXcudmlld3BvcnQgfHwgPEFyZ29uLlZpZXdwb3J0Pnt9O1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LnggPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LnggLyBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueSA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueSAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC53aWR0aCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueiAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC5oZWlnaHQgPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LncgLyBjb250ZW50U2NhbGVGYWN0b3I7XG5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHByb2plY3Rpb24gbWF0cml4IGZvciB0aGlzIHN1YnZpZXdcbiAgICAgICAgICAgIC8vIE5vdGU6IFZ1Zm9yaWEgdXNlcyBhIHJpZ2h0LWhhbmRlZCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHggdG8gdGhlIHJpZ2h0LCB5IGRvd24sIGFuZCB6IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi5cbiAgICAgICAgICAgIC8vIFNvIHdlIGFyZSBjb252ZXJ0aW5nIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uIG9mIHggdG8gdGhlIHJpZ2h0LCB5IHVwLCBhbmQgLXogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLiBcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gPGFueT5yZW5kZXJpbmdQcmltaXRpdmVzLmdldFByb2plY3Rpb25NYXRyaXgodmlldywgdnVmb3JpYS5Db29yZGluYXRlU3lzdGVtVHlwZS5DYW1lcmEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzRmluaXRlKHByb2plY3Rpb25NYXRyaXhbMF0pKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBpZiBvdXIgcHJvamVjdGlvbiBtYXRyaXggaXMgZ2l2aW5nIG51bGwgdmFsdWVzIHRoZW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gc3VyZmFjZSBpcyBub3QgcHJvcGVybHkgY29uZmlndXJlZCBmb3Igc29tZSByZWFzb24sIHNvIHJlc2V0IGl0XG4gICAgICAgICAgICAgICAgLy8gKG5vdCBzdXJlIHdoeSB0aGlzIGhhcHBlbnMsIGJ1dCBpdCBvbmx5IHNlZW1zIHRvIGhhcHBlbiBhZnRlciBvciBiZXR3ZWVuIFxuICAgICAgICAgICAgICAgIC8vIHZ1Zm9yaWEgaW5pdGlhbGl6YXRpb25zKVxuICAgICAgICAgICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3cG9ydC53aWR0aCAqIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXdwb3J0LmhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGZydXN0dW0gPSB0aGlzLl9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uZm92ID0gTWF0aC5QSS8yO1xuICAgICAgICAgICAgICAgIGZydXN0dW0ubmVhciA9IDAuMDE7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mYXIgPSAxMDAwMDtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmFzcGVjdFJhdGlvID0gc3Vidmlld1ZpZXdwb3J0LndpZHRoIC8gc3Vidmlld1ZpZXdwb3J0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKGZydXN0dW0uYXNwZWN0UmF0aW8pIHx8IGZydXN0dW0uYXNwZWN0UmF0aW8gPT09IDApIGZydXN0dW0uYXNwZWN0UmF0aW8gPSAxO1xuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgLy8gVW5kbyB0aGUgdmlkZW8gcm90YXRpb24gc2luY2Ugd2UgYWxyZWFkeSBlbmNvZGUgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBpbiBvdXIgdmlldyBwb3NlXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogdGhlIFwiYmFzZVwiIHJvdGF0aW9uIGZvciB2dWZvcmlhJ3MgdmlkZW8gKGF0IGxlYXN0IG9uIGlPUykgaXMgdGhlIGxhbmRzY2FwZSByaWdodCBvcmllbnRhdGlvbixcbiAgICAgICAgICAgICAgICAvLyB3aGljaCBpcyB0aGUgb3JpZW50YXRpb24gd2hlcmUgdGhlIGRldmljZSBpcyBoZWxkIGluIGxhbmRzY2FwZSB3aXRoIHRoZSBob21lIGJ1dHRvbiBvbiB0aGUgcmlnaHQuIFxuICAgICAgICAgICAgICAgIC8vIFRoaXMgXCJiYXNlXCIgdmlkZW8gcm90YXRhdGlvbiBpcyAtOTAgZGVnIGFyb3VuZCAreiBmcm9tIHRoZSBwb3J0cmFpdCBpbnRlcmZhY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTbywgd2Ugd2FudCB0byB1bmRvIHRoaXMgcm90YXRpb24gd2hpY2ggdnVmb3JpYSBhcHBsaWVzIGZvciB1cy4gIFxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGNhbGN1bGF0ZSB0aGlzIG1hdHJpeCBvbmx5IHdoZW4gd2UgaGF2ZSB0byAod2hlbiB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGNoYW5nZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmZyb21UcmFuc2xhdGlvblF1YXRlcm5pb25Sb3RhdGlvblNjYWxlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlpFUk8sXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgKENlc2l1bU1hdGguUElfT1ZFUl9UV08gLSBzY3JlZW5PcmllbnRhdGlvbiAqIE1hdGguUEkgLyAxODApLCB0aGlzLl9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uKSxcbiAgICAgICAgICAgICAgICAgICAgT05FLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoVmlkZW9NYXRyaXg0XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShwcm9qZWN0aW9uTWF0cml4LCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IGZyb20gdGhlIHZ1Zm9yaWEgcHJvamVjdGlvbiBtYXRyaXggKCtYIC1ZICtaKSB0byBhIG1vcmUgc3RhbmRhcmQgY29udmVudGlvbiAoK1ggK1kgLVopXG4gICAgICAgICAgICAgICAgLy8gYnkgbmVnYXRpbmcgdGhlIGFwcHJvcHJpYXRlIGNvbHVtbnMuIFxuICAgICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS9saWJyYXJ5L2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1Vc2UtdGhlLUNhbWVyYS1Qcm9qZWN0aW9uLU1hdHJpeFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMF0gKj0gLTE7IC8vIHhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IC0xOyAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbM10gKj0gLTE7IC8vIHdcblxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOF0gKj0gLTE7ICAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs5XSAqPSAtMTsgIC8vIHlcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzEwXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMTFdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICAvLyBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseUJ5U2NhbGUocHJvamVjdGlvbk1hdHJpeCwgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMSwtMSwtMSwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksIHByb2plY3Rpb25NYXRyaXgpXG5cbiAgICAgICAgICAgICAgICAvLyBTY2FsZSB0aGUgcHJvamVjdGlvbiBtYXRyaXggdG8gZml0IG5pY2VseSB3aXRoaW4gYSBzdWJ2aWV3IG9mIHR5cGUgU0lOR1VMQVJcbiAgICAgICAgICAgICAgICAvLyAoVGhpcyBzY2FsZSB3aWxsIG5vdCBhcHBseSB3aGVuIHRoZSB1c2VyIGlzIHdlYXJpbmcgYSBtb25vY3VsYXIgSE1ELCBzaW5jZSBhXG4gICAgICAgICAgICAgICAgLy8gbW9ub2N1bGFyIEhNRCB3b3VsZCBwcm92aWRlIGEgc3VidmlldyBvZiB0eXBlIExFRlRFWUUgb3IgUklHSFRFWUUpXG4gICAgICAgICAgICAgICAgLy8gaWYgKHN1YnZpZXcudHlwZSA9PSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUikge1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCB3aWR0aFJhdGlvID0gc3Vidmlld1dpZHRoIC8gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IHN1YnZpZXdIZWlnaHQgLyB2aWRlb01vZGUuaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGFzcGVjdCBmaWxsXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5tYXgod2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBvciBhc3BlY3QgZml0XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5taW4od2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHgtYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHktYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzRdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs2XSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzddICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShwcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIGNvbnN0IGV5ZUFkanVzdG1lbnRNYXRyaXggPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXcpO1xuICAgICAgICAgICAgLy8gbGV0IHByb2plY3Rpb25NYXRyaXggPSBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShyYXdQcm9qZWN0aW9uTWF0cml4LCBleWVBZGp1c3RtZW50TWF0cml4LCBbXSk7XG4gICAgICAgICAgICAvLyBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQuZnJvbVJvd01ham9yQXJyYXkocHJvamVjdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gaWRlbnRpdHkgc3VidmlldyBwb3NlIChpbiByZWxhdGlvbiB0byB0aGUgb3ZlcmFsbCB2aWV3IHBvc2UpXG4gICAgICAgICAgICAvLyBUT0RPOiB1c2UgZXllIGFkanVzdG1lbnQgbWF0cml4IHRvIGdldCBzdWJ2aWV3IHBvc2VzIChmb3IgZXllIHNlcGFyYXRpb24pLiBTZWUgY29tbWVudGVkIG91dCBjb2RlIGFib3ZlLi4uXG4gICAgICAgICAgICBzdWJ2aWV3LnBvc2UgPSB1bmRlZmluZWQ7IFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2FwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IHRoaXMuX2dldE1vdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbiA9IG1vdGlvbk1hbmFnZXIgJiYgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb247XG5cbiAgICAgICAgICAgIGlmIChtb3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb3Rpb25RdWF0ZXJuaW9uID0gPEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uPm1vdGlvbi5hdHRpdHVkZS5xdWF0ZXJuaW9uO1xuXG4gICAgICAgICAgICAgICAgLy8gQXBwbGUncyBvcmllbnRhdGlvbiBpcyByZXBvcnRlZCBpbiBOV1UsIHNvIHdlIGNvbnZlcnQgdG8gRU5VIGJ5IGFwcGx5aW5nIGEgZ2xvYmFsIHJvdGF0aW9uIG9mXG4gICAgICAgICAgICAgICAgLy8gOTAgZGVncmVlcyBhYm91dCAreiB0byB0aGUgTldVIG9yaWVudGF0aW9uIChvciBhcHBseWluZyB0aGUgTldVIHF1YXRlcm5pb24gYXMgYSBsb2NhbCByb3RhdGlvbiBcbiAgICAgICAgICAgICAgICAvLyB0byB0aGUgc3RhcnRpbmcgb3JpZW50YXRpb24gb2YgOTAgZGVncmVzcyBhYm91dCAreikuIFxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IFdpdGggcXVhdGVybmlvbiBtdWx0aXBsaWNhdGlvbiB0aGUgYCpgIHN5bWJvbCBjYW4gYmUgcmVhZCBhcyAncm90YXRlcycuIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvcmllbnRhdGlvbiAoTykgaXMgb24gdGhlIHJpZ2h0IGFuZCB0aGUgcm90YXRpb24gKFIpIGlzIG9uIHRoZSBsZWZ0LCBcbiAgICAgICAgICAgICAgICAvLyBzdWNoIHRoYXQgdGhlIG11bHRpcGxpY2F0aW9uIG9yZGVyIGlzIFIqTywgdGhlbiBSIGlzIGEgZ2xvYmFsIHJvdGF0aW9uIGJlaW5nIGFwcGxpZWQgb24gTy4gXG4gICAgICAgICAgICAgICAgLy8gTGlrZXdpc2UsIHRoZSByZXZlcnNlLCBPKlIsIGlzIGEgbG9jYWwgcm90YXRpb24gUiBhcHBsaWVkIHRvIHRoZSBvcmllbnRhdGlvbiBPLiBcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IFF1YXRlcm5pb24ubXVsdGlwbHkoejkwLCBtb3Rpb25RdWF0ZXJuaW9uLCB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5zY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXM7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVN0YWdlID0gdGhpcy5zdGFnZTtcblxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5wb3NpdGlvbikgZGV2aWNlVXNlci5wb3NpdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLm9yaWVudGF0aW9uKSBkZXZpY2VVc2VyLm9yaWVudGF0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMCwwLHRoaXMuc3VnZ2VzdGVkVXNlckhlaWdodCwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksXG4gICAgICAgICAgICAgICAgICAgIGRldmljZVN0YWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuVU5JVF9aLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZU9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uTWFuYWdlciA9IHRoaXMuX2dldExvY2F0aW9uTWFuYWdlcklPUygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRpbmcgPSBsb2NhdGlvbk1hbmFnZXIuaGVhZGluZztcbiAgICAgICAgICAgICAgICBkZXZpY2VVc2VyWydtZXRhJ10gPSBkZXZpY2VVc2VyWydtZXRhJ10gfHwge307XG4gICAgICAgICAgICAgICAgZGV2aWNlVXNlclsnbWV0YSddLmdlb0hlYWRpbmdBY2N1cmFjeSA9IGhlYWRpbmcgJiYgaGVhZGluZy5oZWFkaW5nQWNjdXJhY3k7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9hcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRNb3Rpb25NYW5hZ2VyQW5kcm9pZCgpO1xuICAgICAgICAgICAgaWYgKG1vdGlvbk1hbmFnZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IHRoaXMuX21vdGlvblF1YXRlcm5pb25BbmRyb2lkO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5zY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXM7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVN0YWdlID0gdGhpcy5zdGFnZTtcblxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5wb3NpdGlvbikgZGV2aWNlVXNlci5wb3NpdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLm9yaWVudGF0aW9uKSBkZXZpY2VVc2VyLm9yaWVudGF0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMCwwLHRoaXMuc3VnZ2VzdGVkVXNlckhlaWdodCwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksXG4gICAgICAgICAgICAgICAgICAgIGRldmljZVN0YWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuVU5JVF9aLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZU9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbW90aW9uTWFuYWdlcklPUz86Q01Nb3Rpb25NYW5hZ2VyO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TW90aW9uTWFuYWdlcklPUygpIDogQ01Nb3Rpb25NYW5hZ2VyfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICh0aGlzLl9tb3Rpb25NYW5hZ2VySU9TKSByZXR1cm4gdGhpcy5fbW90aW9uTWFuYWdlcklPUztcblxuICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gQ01Nb3Rpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuICAgICAgICBtb3Rpb25NYW5hZ2VyLnNob3dzRGV2aWNlTW92ZW1lbnREaXNwbGF5ID0gdHJ1ZVxuICAgICAgICBtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvblVwZGF0ZUludGVydmFsID0gMS4wIC8gMTAwLjA7XG4gICAgICAgIGlmICghbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25BdmFpbGFibGUgfHwgIW1vdGlvbk1hbmFnZXIubWFnbmV0b21ldGVyQXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk5PIE1hZ25ldG9tZXRlciBhbmQvb3IgR3lyby4gXCIgKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWU6Q01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lO1xuICAgICAgICAgICAgaWYgKENNTW90aW9uTWFuYWdlci5hdmFpbGFibGVBdHRpdHVkZVJlZmVyZW5jZUZyYW1lcygpICYgQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWwpIHtcbiAgICAgICAgICAgICAgICBlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSA9IENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsO1xuICAgICAgICAgICAgICAgIG1vdGlvbk1hbmFnZXIuc3RhcnREZXZpY2VNb3Rpb25VcGRhdGVzVXNpbmdSZWZlcmVuY2VGcmFtZShlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTk8gIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZVhUcnVlTm9ydGhaVmVydGljYWxcIiApO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbW90aW9uTWFuYWdlcklPUyA9IG1vdGlvbk1hbmFnZXI7XG4gICAgICAgIHJldHVybiBtb3Rpb25NYW5hZ2VyO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2xvY2F0aW9uTWFuYWdlcklPUz86Q0xMb2NhdGlvbk1hbmFnZXI7XG5cbiAgICBwcml2YXRlIF9nZXRMb2NhdGlvbk1hbmFnZXJJT1MoKSB7XG4gICAgICAgIGlmICghdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TKSB7XG4gICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MgPSBDTExvY2F0aW9uTWFuYWdlci5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICAgICAgc3dpdGNoIChDTExvY2F0aW9uTWFuYWdlci5hdXRob3JpemF0aW9uU3RhdHVzKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZFdoZW5JblVzZTpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZEFsd2F5czogXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNOb3REZXRlcm1pbmVkOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MucmVxdWVzdFdoZW5JblVzZUF1dGhvcml6YXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0RlbmllZDpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzUmVzdHJpY3RlZDpcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFjdGlvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJMb2NhdGlvbiBTZXJ2aWNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEluIG9yZGVyIHRvIHByb3ZpZGUgdGhlIGJlc3QgQXVnbWVudGVkIFJlYWxpdHkgZXhwZXJpZW5jZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxlYXNlIG9wZW4gdGhpcyBhcHAncyBzZXR0aW5ncyBhbmQgZW5hYmxlIGxvY2F0aW9uIHNlcnZpY2VzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwiQ2FuY2VsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ1NldHRpbmdzJ11cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbigoYWN0aW9uKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ1NldHRpbmdzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IE5TVVJMLlVSTFdpdGhTdHJpbmcoVUlBcHBsaWNhdGlvbk9wZW5TZXR0aW5nc1VSTFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5vcGVuVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUztcbiAgICB9XG5cbiAgICBwcml2YXRlIF9tb3Rpb25NYW5hZ2VyQW5kcm9pZD86YW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyO1xuICAgIHByaXZhdGUgX21vdGlvblF1YXRlcm5pb25BbmRyb2lkID0gbmV3IFF1YXRlcm5pb247XG5cbiAgICBwcml2YXRlIF9nZXRNb3Rpb25NYW5hZ2VyQW5kcm9pZCgpIDogYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICh0aGlzLl9tb3Rpb25NYW5hZ2VyQW5kcm9pZCkgcmV0dXJuIHRoaXMuX21vdGlvbk1hbmFnZXJBbmRyb2lkO1xuXG4gICAgICAgIHZhciBzZW5zb3JNYW5hZ2VyID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkuZ2V0U3lzdGVtU2VydmljZShhbmRyb2lkLmNvbnRlbnQuQ29udGV4dC5TRU5TT1JfU0VSVklDRSk7XG4gICAgICAgIHZhciByb3RhdGlvblNlbnNvciA9IHNlbnNvck1hbmFnZXIuZ2V0RGVmYXVsdFNlbnNvcihhbmRyb2lkLmhhcmR3YXJlLlNlbnNvci5UWVBFX1JPVEFUSU9OX1ZFQ1RPUik7XG5cbiAgICAgICAgdmFyIHNlbnNvckV2ZW50TGlzdGVuZXIgPSBuZXcgYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JFdmVudExpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uQWNjdXJhY3lDaGFuZ2VkOiAoc2Vuc29yLCBhY2N1cmFjeSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJvbkFjY3VyYWN5Q2hhbmdlZDogXCIgKyBhY2N1cmFjeSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TZW5zb3JDaGFuZ2VkOiAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLnVucGFjayg8bnVtYmVyW10+ZXZlbnQudmFsdWVzLCAwLCB0aGlzLl9tb3Rpb25RdWF0ZXJuaW9uQW5kcm9pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlbnNvck1hbmFnZXIucmVnaXN0ZXJMaXN0ZW5lcihzZW5zb3JFdmVudExpc3RlbmVyLCByb3RhdGlvblNlbnNvciwgYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JNYW5hZ2VyLlNFTlNPUl9ERUxBWV9HQU1FKTtcbiAgICAgICAgdGhpcy5fbW90aW9uTWFuYWdlckFuZHJvaWQgPSBzZW5zb3JFdmVudExpc3RlbmVyO1xuICAgICAgICByZXR1cm4gc2Vuc29yRXZlbnRMaXN0ZW5lcjtcbiAgICB9XG59XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyIGV4dGVuZHMgQXJnb24uRGV2aWNlU2VydmljZVByb3ZpZGVyIHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgY29udGFpbmVyLCBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICBkZXZpY2VTZXJ2aWNlOkFyZ29uLkRldmljZVNlcnZpY2UsIFxuICAgICAgICBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSwgXG4gICAgICAgIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZTpBcmdvbi5Db250ZXh0U2VydmljZVByb3ZpZGVyLFxuICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIHNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgICAgIGRldmljZVNlcnZpY2UsIFxuICAgICAgICAgICAgY29udGV4dFNlcnZpY2UsIFxuICAgICAgICAgICAgdmlld1NlcnZpY2UsICAgICAgICAgXG4gICAgICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZVxuICAgICAgICApO1xuXG4gICAgICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKT0+e1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFN0YWJsZVN0YXRlKCk7XG4gICAgICAgICAgICB9LCA2MDApO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhYmxlU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2NhdGlvbldhdGNoSWQ/Om51bWJlcjtcblxuICAgIHByaXZhdGUgX3NjcmF0Y2hTdGFnZUNhcnRvZ3JhcGhpYyA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydG9ncmFwaGljO1xuXG4gICAgcHJvdGVjdGVkIG9uU3RhcnRHZW9sb2NhdGlvblVwZGF0ZXMob3B0aW9uczpBcmdvbi5HZW9sb2NhdGlvbk9wdGlvbnMpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5sb2NhdGlvbldhdGNoSWQgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpPT57XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBkLnRzIGZvciBuYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24gaXMgd3JvbmcuIFRoaXMgY2FsbCBpcyBjb3JyZWN0LiBcbiAgICAgICAgICAgIC8vIENhc3RpbmcgdGhlIG1vZHVsZSBhcyA8YW55PiBoZXJlIGZvciBub3cgdG8gaGlkZSBhbm5veWluZyB0eXBlc2NyaXB0IGVycm9ycy4uLlxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSAoPGFueT5nZW9sb2NhdGlvbikud2F0Y2hMb2NhdGlvbigobG9jYXRpb246Z2VvbG9jYXRpb24uTG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgLy8gTm90ZTogaU9TIGRvY3VtZW50YXRpb24gc3RhdGVzIHRoYXQgdGhlIGFsdGl0dWRlIHZhbHVlIHJlZmVycyB0byBoZWlnaHQgKG1ldGVycykgYWJvdmUgc2VhIGxldmVsLCBidXQgXG4gICAgICAgICAgICAgICAgLy8gaWYgaW9zIGlzIHJlcG9ydGluZyB0aGUgc3RhbmRhcmQgZ3BzIGRlZmluZWQgYWx0aXR1ZGUsIHRoZW4gdGhpcyB0aGVvcmV0aWNhbCBcInNlYSBsZXZlbFwiIGFjdHVhbGx5IHJlZmVycyB0byBcbiAgICAgICAgICAgICAgICAvLyB0aGUgV0dTODQgZWxsaXBzb2lkIHJhdGhlciB0aGFuIHRyYWRpdGlvbmFsIG1lYW4gc2VhIGxldmVsIChNU0wpIHdoaWNoIGlzIG5vdCBhIHNpbXBsZSBzdXJmYWNlIGFuZCB2YXJpZXMgXG4gICAgICAgICAgICAgICAgLy8gYWNjb3JkaW5nIHRvIHRoZSBsb2NhbCBncmF2aXRhdGlvbmFsIGZpZWxkLiBcbiAgICAgICAgICAgICAgICAvLyBJbiBvdGhlciB3b3JkcywgbXkgYmVzdCBndWVzcyBpcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSBoZXJlIGlzICpwcm9iYWJseSogR1BTIGRlZmluZWQgYWx0aXR1ZGUsIHdoaWNoIFxuICAgICAgICAgICAgICAgIC8vIGlzIGVxdWl2YWxlbnQgdG8gdGhlIGhlaWdodCBhYm92ZSB0aGUgV0dTODQgZWxsaXBzb2lkLCB3aGljaCBpcyBleGFjdGx5IHdoYXQgQ2VzaXVtIGV4cGVjdHMuLi5cbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyZVN0YWdlKFxuICAgICAgICAgICAgICAgICAgICBBcmdvbi5DZXNpdW0uQ2FydG9ncmFwaGljLmZyb21EZWdyZWVzKGxvY2F0aW9uLmxvbmdpdHVkZSwgbG9jYXRpb24ubGF0aXR1ZGUsIGxvY2F0aW9uLmFsdGl0dWRlLCB0aGlzLl9zY3JhdGNoU3RhZ2VDYXJ0b2dyYXBoaWMpLFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5ob3Jpem9udGFsQWNjdXJhY3ksIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi52ZXJ0aWNhbEFjY3VyYWN5XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgKGUpPT57XG4gICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgfSwgPGdlb2xvY2F0aW9uLk9wdGlvbnM+e1xuICAgICAgICAgICAgICAgIGRlc2lyZWRBY2N1cmFjeTogb3B0aW9ucyAmJiBvcHRpb25zLmVuYWJsZUhpZ2hBY2N1cmFjeSA/IFxuICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi5pb3MgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGtDTExvY2F0aW9uQWNjdXJhY3lCZXN0IDogXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtcy5BY2N1cmFjeS5oaWdoIDogXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmlvcyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAga0NMTG9jYXRpb25BY2N1cmFjeUtpbG9tZXRlciA6XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtcy5BY2N1cmFjeS5hbnksXG4gICAgICAgICAgICAgICAgdXBkYXRlRGlzdGFuY2U6IGFwcGxpY2F0aW9uLmlvcyA/IGtDTERpc3RhbmNlRmlsdGVyTm9uZSA6IDAsXG4gICAgICAgICAgICAgICAgbWluaW11bVVwZGF0ZVRpbWUgOiBvcHRpb25zICYmIG9wdGlvbnMuZW5hYmxlSGlnaEFjY3VyYWN5ID9cbiAgICAgICAgICAgICAgICAgICAgMCA6IDUwMDAgLy8gcmVxdWlyZWQgb24gQW5kcm9pZCwgaWdub3JlZCBvbiBpT1NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIGxvY2F0aW9uIHdhdGNoZXIuIFwiICsgdGhpcy5sb2NhdGlvbldhdGNoSWQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBcbiAgICBwcm90ZWN0ZWQgb25TdG9wR2VvbG9jYXRpb25VcGRhdGVzKCkgOiB2b2lkIHtcbiAgICAgICAgaWYgKEFyZ29uLkNlc2l1bS5kZWZpbmVkKHRoaXMubG9jYXRpb25XYXRjaElkKSkge1xuICAgICAgICAgICAgZ2VvbG9jYXRpb24uY2xlYXJXYXRjaCh0aGlzLmxvY2F0aW9uV2F0Y2hJZCk7XG4gICAgICAgICAgICB0aGlzLmxvY2F0aW9uV2F0Y2hJZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBpZiAodGhpcy5mb2N1c1NlcnZpY2VQcm92aWRlci5zZXNzaW9uID09IHNlc3Npb24pIHJldHVybjsgXG4gICAgICAgIGlmIChzZXNzaW9uID09IHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcikgcmV0dXJuO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZG9lcyBub3QgaGF2ZSBmb2N1cy4nKVxuICAgIH1cbiAgICBcbiAgICBoYW5kbGVSZXF1ZXN0UHJlc2VudEhNRChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICBoYW5kbGVFeGl0UHJlc2VudEhNRChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbn0iXX0=