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
            }, 600);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUNsQyxtQ0FBcUM7QUFFckMsOENBQWdEO0FBQ2hELGlDQUFtQztBQUVuQyxzQ0FBd0M7QUFFeEMsK0JBQXdDO0FBRXhDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sT0FBTyxHQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBRXhDLElBQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDaEYsSUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUdsQyxJQUFhLHlCQUF5QjtJQUFTLDZDQUFtQjtJQUU5RCxtQ0FDSSxjQUFtQyxFQUNuQyxjQUFtQyxFQUNuQyxXQUE2QixFQUM3QixpQkFBeUMsRUFDekMsc0JBQW1EO1FBTHZELFlBTUksa0JBQU0sY0FBYyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsU0FxQnhFO1FBRU8sc0JBQWdCLEdBQUcsVUFBQyxFQUFXLEVBQUUsR0FBVTtZQUMvQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUM7UUFFTSxrQkFBWSxHQUFHLFdBQVcsQ0FBQztRQUMzQixnQ0FB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ICogYXMgYXBwbGljYXRpb24gZnJvbSBcImFwcGxpY2F0aW9uXCI7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBnZW9sb2NhdGlvbiBmcm9tICdzcGVpZ2ctbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBlbnVtcyBmcm9tICd1aS9lbnVtcyc7XG5pbXBvcnQgKiBhcyBwbGF0Zm9ybSBmcm9tICdwbGF0Zm9ybSc7XG5cbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgZnJhbWVzIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi12dWZvcmlhLXByb3ZpZGVyJ1xuaW1wb3J0ICogYXMgQXJnb24gZnJvbSBcIkBhcmdvbmpzL2FyZ29uXCI7XG5cbmltcG9ydCB7c2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vdXRpbCdcblxuY29uc3QgQ2FydGVzaWFuMyA9IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuY29uc3QgUXVhdGVybmlvbiA9IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuY29uc3QgQ2VzaXVtTWF0aCA9IEFyZ29uLkNlc2l1bS5DZXNpdW1NYXRoO1xuY29uc3QgTWF0cml4NCAgICA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0O1xuXG5jb25zdCB6OTAgPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIENlc2l1bU1hdGguUElfT1ZFUl9UV08pO1xuY29uc3QgT05FID0gbmV3IENhcnRlc2lhbjMoMSwxLDEpO1xuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UgZXh0ZW5kcyBBcmdvbi5EZXZpY2VTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBzZXNzaW9uU2VydmljZTpBcmdvbi5TZXNzaW9uU2VydmljZSwgXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgdmlld1NlcnZpY2U6QXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIHZpc2liaWxpdHlTZXJ2aWNlOkFyZ29uLlZpc2liaWxpdHlTZXJ2aWNlLFxuICAgICAgICB2dWZvcmlhU2VydmljZVByb3ZpZGVyOkFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpIHtcbiAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIGNvbnRleHRTZXJ2aWNlLCB2aWV3U2VydmljZSwgdmlzaWJpbGl0eVNlcnZpY2UpO1xuXG4gICAgICAgIGNvbnN0IHZzcCA9IDxOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyPnZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI7XG5cbiAgICAgICAgdnNwLnN0YXRlVXBkYXRlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gZ2xvYmFsLnBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgICAgICAgLy8gc3dhcCBjYWxsYmFjayBtYXBzXG4gICAgICAgICAgICBjb25zdCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3M7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MyO1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzMiA9IGNhbGxiYWNrcztcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXhlY3V0ZUNhbGxiYWNrKGNhbGxiYWNrc1tpXSwgbm93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4gdnNwLnN0YXRlVXBkYXRlRXZlbnQucmFpc2VFdmVudChBcmdvbi5DZXNpdW0uSnVsaWFuRGF0ZS5ub3coKSksIDM0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2V4ZWN1dGVDYWxsYmFjayA9IChjYjpGdW5jdGlvbiwgbm93Om51bWJlcikgPT4ge1xuICAgICAgICBjYihub3cpO1xuICAgIH07XG5cbiAgICBwcml2YXRlIF9hcHBsaWNhdGlvbiA9IGFwcGxpY2F0aW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcbiAgICBwcml2YXRlIF9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2lkID0gMDtcbiAgICBwcml2YXRlIF9jYWxsYmFja3M6e1tpZDpudW1iZXJdOkZ1bmN0aW9ufSA9IHt9O1xuICAgIHByaXZhdGUgX2NhbGxiYWNrczI6e1tpZDpudW1iZXJdOkZ1bmN0aW9ufSA9IHt9O1xuXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gKGNiOih0aW1lc3RhbXA6bnVtYmVyKT0+dm9pZCkgPT4ge1xuICAgICAgICB0aGlzLl9pZCsrO1xuICAgICAgICB0aGlzLl9jYWxsYmFja3NbdGhpcy5faWRdID0gY2I7XG4gICAgICAgIHJldHVybiB0aGlzLl9pZDtcbiAgICB9XG5cbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSA9IChpZDpudW1iZXIpID0+IHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1tpZF07XG4gICAgfVxuICAgIFxuICAgIGdldFNjcmVlbk9yaWVudGF0aW9uRGVncmVlcygpIHtcbiAgICAgICAgcmV0dXJuIHNjcmVlbk9yaWVudGF0aW9uO1xuICAgIH1cbiAgICBcbiAgICBvblVwZGF0ZUZyYW1lU3RhdGUoKSB7XG5cbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB0aGlzLmRldmljZVN0YXRlLnZpZXdwb3J0ID0gdGhpcy5kZXZpY2VTdGF0ZS52aWV3cG9ydCB8fCA8QXJnb24uQ2FudmFzVmlld3BvcnQ+e307XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gZnJhbWVzLnRvcG1vc3QoKS5jdXJyZW50UGFnZS5jb250ZW50O1xuICAgICAgICB2aWV3cG9ydC54ID0gMDtcbiAgICAgICAgdmlld3BvcnQueSA9IDA7XG4gICAgICAgIHZpZXdwb3J0LndpZHRoID0gY29udGVudFZpZXcuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoOyAvL2dldE1lYXN1cmVkV2lkdGgoKTtcbiAgICAgICAgdmlld3BvcnQuaGVpZ2h0ID0gY29udGVudFZpZXcuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodDsgLy9nZXRNZWFzdXJlZEhlaWdodCgpO1xuXG4gICAgICAgIHN1cGVyLm9uVXBkYXRlRnJhbWVTdGF0ZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9hcHBsaWNhdGlvbi5pb3MpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRNb3Rpb25NYW5hZ2VySU9TKCk7XG4gICAgICAgICAgICBjb25zdCBtb3Rpb24gPSBtb3Rpb25NYW5hZ2VyICYmIG1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uO1xuXG4gICAgICAgICAgICBpZiAobW90aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW90aW9uUXVhdGVybmlvbiA9IDxBcmdvbi5DZXNpdW0uUXVhdGVybmlvbj5tb3Rpb24uYXR0aXR1ZGUucXVhdGVybmlvbjtcblxuICAgICAgICAgICAgICAgIC8vIEFwcGxlJ3Mgb3JpZW50YXRpb24gaXMgcmVwb3J0ZWQgaW4gTldVLCBzbyB3ZSBjb252ZXJ0IHRvIEVOVSBieSBhcHBseWluZyBhIGdsb2JhbCByb3RhdGlvbiBvZlxuICAgICAgICAgICAgICAgIC8vIDkwIGRlZ3JlZXMgYWJvdXQgK3ogdG8gdGhlIE5XVSBvcmllbnRhdGlvbiAob3IgYXBwbHlpbmcgdGhlIE5XVSBxdWF0ZXJuaW9uIGFzIGEgbG9jYWwgcm90YXRpb24gXG4gICAgICAgICAgICAgICAgLy8gdG8gdGhlIHN0YXJ0aW5nIG9yaWVudGF0aW9uIG9mIDkwIGRlZ3Jlc3MgYWJvdXQgK3opLiBcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBXaXRoIHF1YXRlcm5pb24gbXVsdGlwbGljYXRpb24gdGhlIGAqYCBzeW1ib2wgY2FuIGJlIHJlYWQgYXMgJ3JvdGF0ZXMnLiBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgb3JpZW50YXRpb24gKE8pIGlzIG9uIHRoZSByaWdodCBhbmQgdGhlIHJvdGF0aW9uIChSKSBpcyBvbiB0aGUgbGVmdCwgXG4gICAgICAgICAgICAgICAgLy8gc3VjaCB0aGF0IHRoZSBtdWx0aXBsaWNhdGlvbiBvcmRlciBpcyBSKk8sIHRoZW4gUiBpcyBhIGdsb2JhbCByb3RhdGlvbiBiZWluZyBhcHBsaWVkIG9uIE8uIFxuICAgICAgICAgICAgICAgIC8vIExpa2V3aXNlLCB0aGUgcmV2ZXJzZSwgTypSLCBpcyBhIGxvY2FsIHJvdGF0aW9uIFIgYXBwbGllZCB0byB0aGUgb3JpZW50YXRpb24gTy4gXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlT3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLm11bHRpcGx5KHo5MCwgbW90aW9uUXVhdGVybmlvbiwgdGhpcy5fc2NyYXRjaERldmljZU9yaWVudGF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyA9IHRoaXMuZnJhbWVTdGF0ZS5zY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXM7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVN0YWdlID0gdGhpcy5zdGFnZTtcblxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5wb3NpdGlvbikgZGV2aWNlVXNlci5wb3NpdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLm9yaWVudGF0aW9uKSBkZXZpY2VVc2VyLm9yaWVudGF0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMCwwLHRoaXMuZGV2aWNlU3RhdGUuc3VnZ2VzdGVkVXNlckhlaWdodCwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksXG4gICAgICAgICAgICAgICAgICAgIGRldmljZVN0YWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuVU5JVF9aLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZU9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uTWFuYWdlciA9IHRoaXMuX2dldExvY2F0aW9uTWFuYWdlcklPUygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRpbmcgPSBsb2NhdGlvbk1hbmFnZXIuaGVhZGluZztcbiAgICAgICAgICAgICAgICBkZXZpY2VVc2VyWydtZXRhJ10gPSBkZXZpY2VVc2VyWydtZXRhJ10gfHwge307XG4gICAgICAgICAgICAgICAgZGV2aWNlVXNlclsnbWV0YSddLmdlb0hlYWRpbmdBY2N1cmFjeSA9IGhlYWRpbmcgJiYgaGVhZGluZy5oZWFkaW5nQWNjdXJhY3k7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9hcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRNb3Rpb25NYW5hZ2VyQW5kcm9pZCgpO1xuICAgICAgICAgICAgaWYgKG1vdGlvbk1hbmFnZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IHRoaXMuX21vdGlvblF1YXRlcm5pb25BbmRyb2lkO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5mcmFtZVN0YXRlLnNjcmVlbk9yaWVudGF0aW9uRGVncmVlcztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVVzZXIgPSB0aGlzLnVzZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlU3RhZ2UgPSB0aGlzLnN0YWdlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLnBvc2l0aW9uKSBkZXZpY2VVc2VyLnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIub3JpZW50YXRpb24pIGRldmljZVVzZXIub3JpZW50YXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkpLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLmZyb21FbGVtZW50cygwLDAsdGhpcy5kZXZpY2VTdGF0ZS5zdWdnZXN0ZWRVc2VySGVpZ2h0LCB0aGlzLl9zY3JhdGNoQ2FydGVzaWFuKSxcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlU3RhZ2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5VTklUX1osIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzICogQ2VzaXVtTWF0aC5SQURJQU5TX1BFUl9ERUdSRUUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLm11bHRpcGx5KFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERldmljZU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUoc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9tb3Rpb25NYW5hZ2VySU9TPzpDTU1vdGlvbk1hbmFnZXI7XG5cbiAgICBwcml2YXRlIF9nZXRNb3Rpb25NYW5hZ2VySU9TKCkgOiBDTU1vdGlvbk1hbmFnZXJ8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKHRoaXMuX21vdGlvbk1hbmFnZXJJT1MpIHJldHVybiB0aGlzLl9tb3Rpb25NYW5hZ2VySU9TO1xuXG4gICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSBDTU1vdGlvbk1hbmFnZXIuYWxsb2MoKS5pbml0KCk7XG4gICAgICAgIG1vdGlvbk1hbmFnZXIuc2hvd3NEZXZpY2VNb3ZlbWVudERpc3BsYXkgPSB0cnVlXG4gICAgICAgIG1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uVXBkYXRlSW50ZXJ2YWwgPSAxLjAgLyAxMDAuMDtcbiAgICAgICAgaWYgKCFtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvbkF2YWlsYWJsZSB8fCAhbW90aW9uTWFuYWdlci5tYWduZXRvbWV0ZXJBdmFpbGFibGUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTk8gTWFnbmV0b21ldGVyIGFuZC9vciBHeXJvLiBcIiApO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZTpDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWU7XG4gICAgICAgICAgICBpZiAoQ01Nb3Rpb25NYW5hZ2VyLmF2YWlsYWJsZUF0dGl0dWRlUmVmZXJlbmNlRnJhbWVzKCkgJiBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWUuWFRydWVOb3J0aFpWZXJ0aWNhbCkge1xuICAgICAgICAgICAgICAgIGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lID0gQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWw7XG4gICAgICAgICAgICAgICAgbW90aW9uTWFuYWdlci5zdGFydERldmljZU1vdGlvblVwZGF0ZXNVc2luZ1JlZmVyZW5jZUZyYW1lKGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJOTyAgQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lWFRydWVOb3J0aFpWZXJ0aWNhbFwiICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9tb3Rpb25NYW5hZ2VySU9TID0gbW90aW9uTWFuYWdlcjtcbiAgICAgICAgcmV0dXJuIG1vdGlvbk1hbmFnZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbG9jYXRpb25NYW5hZ2VySU9TPzpDTExvY2F0aW9uTWFuYWdlcjtcblxuICAgIHByaXZhdGUgX2dldExvY2F0aW9uTWFuYWdlcklPUygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUyA9IENMTG9jYXRpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKENMTG9jYXRpb25NYW5hZ2VyLmF1dGhvcml6YXRpb25TdGF0dXMoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkV2hlbkluVXNlOlxuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkQWx3YXlzOiBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c05vdERldGVybWluZWQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUy5yZXF1ZXN0V2hlbkluVXNlQXV0aG9yaXphdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzRGVuaWVkOlxuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNSZXN0cmljdGVkOlxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIkxvY2F0aW9uIFNlcnZpY2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgSW4gb3JkZXIgdG8gcHJvdmlkZSB0aGUgYmVzdCBBdWdtZW50ZWQgUmVhbGl0eSBleHBlcmllbmNlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGVhc2Ugb3BlbiB0aGlzIGFwcCdzIHNldHRpbmdzIGFuZCBlbmFibGUgbG9jYXRpb24gc2VydmljZXNgLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJDYW5jZWxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsnU2V0dGluZ3MnXVxuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKChhY3Rpb24pPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnU2V0dGluZ3MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gTlNVUkwuVVJMV2l0aFN0cmluZyhVSUFwcGxpY2F0aW9uT3BlblNldHRpbmdzVVJMU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5pb3MuZ2V0dGVyKFVJQXBwbGljYXRpb24sIFVJQXBwbGljYXRpb24uc2hhcmVkQXBwbGljYXRpb24pLm9wZW5VUkwodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TO1xuICAgIH1cblxuICAgIHByaXZhdGUgX21vdGlvbk1hbmFnZXJBbmRyb2lkPzphbmRyb2lkLmhhcmR3YXJlLlNlbnNvckV2ZW50TGlzdGVuZXI7XG4gICAgcHJpdmF0ZSBfbW90aW9uUXVhdGVybmlvbkFuZHJvaWQgPSBuZXcgUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2dldE1vdGlvbk1hbmFnZXJBbmRyb2lkKCkgOiBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvckV2ZW50TGlzdGVuZXJ8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKHRoaXMuX21vdGlvbk1hbmFnZXJBbmRyb2lkKSByZXR1cm4gdGhpcy5fbW90aW9uTWFuYWdlckFuZHJvaWQ7XG5cbiAgICAgICAgdmFyIHNlbnNvck1hbmFnZXIgPSBhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eS5nZXRTeXN0ZW1TZXJ2aWNlKGFuZHJvaWQuY29udGVudC5Db250ZXh0LlNFTlNPUl9TRVJWSUNFKTtcbiAgICAgICAgdmFyIHJvdGF0aW9uU2Vuc29yID0gc2Vuc29yTWFuYWdlci5nZXREZWZhdWx0U2Vuc29yKGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yLlRZUEVfUk9UQVRJT05fVkVDVE9SKTtcblxuICAgICAgICB2YXIgc2Vuc29yRXZlbnRMaXN0ZW5lciA9IG5ldyBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvckV2ZW50TGlzdGVuZXIoe1xuICAgICAgICAgICAgb25BY2N1cmFjeUNoYW5nZWQ6IChzZW5zb3IsIGFjY3VyYWN5KSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIm9uQWNjdXJhY3lDaGFuZ2VkOiBcIiArIGFjY3VyYWN5KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblNlbnNvckNoYW5nZWQ6IChldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIFF1YXRlcm5pb24udW5wYWNrKDxudW1iZXJbXT5ldmVudC52YWx1ZXMsIDAsIHRoaXMuX21vdGlvblF1YXRlcm5pb25BbmRyb2lkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2Vuc29yTWFuYWdlci5yZWdpc3Rlckxpc3RlbmVyKHNlbnNvckV2ZW50TGlzdGVuZXIsIHJvdGF0aW9uU2Vuc29yLCBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvck1hbmFnZXIuU0VOU09SX0RFTEFZX0dBTUUpO1xuICAgICAgICB0aGlzLl9tb3Rpb25NYW5hZ2VyQW5kcm9pZCA9IHNlbnNvckV2ZW50TGlzdGVuZXI7XG4gICAgICAgIHJldHVybiBzZW5zb3JFdmVudExpc3RlbmVyO1xuICAgIH1cbn1cblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXIgZXh0ZW5kcyBBcmdvbi5EZXZpY2VTZXJ2aWNlUHJvdmlkZXIge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBjb250YWluZXIsIFxuICAgICAgICBzZXNzaW9uU2VydmljZTpBcmdvbi5TZXNzaW9uU2VydmljZSwgXG4gICAgICAgIGRldmljZVNlcnZpY2U6QXJnb24uRGV2aWNlU2VydmljZSwgXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgdmlld1NlcnZpY2U6QXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlUHJvdmlkZXJlOkFyZ29uLkNvbnRleHRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIHByaXZhdGUgZm9jdXNTZXJ2aWNlUHJvdmlkZXI6QXJnb24uRm9jdXNTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIHJlYWxpdHlTZXJ2aWNlOkFyZ29uLlJlYWxpdHlTZXJ2aWNlKSB7XG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgc2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICAgICAgZGV2aWNlU2VydmljZSwgXG4gICAgICAgICAgICBjb250ZXh0U2VydmljZSwgXG4gICAgICAgICAgICB2aWV3U2VydmljZSwgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRleHRTZXJ2aWNlUHJvdmlkZXJlXG4gICAgICAgICk7XG5cbiAgICAgICAgYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpPT57XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoRGV2aWNlU3RhdGUoKTtcbiAgICAgICAgICAgIH0sIDYwMCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2hEZXZpY2VTdGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvY2F0aW9uV2F0Y2hJZD86bnVtYmVyO1xuXG4gICAgLy8gcHJpdmF0ZSBfc2NyYXRjaENhcnRlc2lhbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbiAgICBwcml2YXRlIF9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtID0gbmV3IEFyZ29uLkNlc2l1bS5QZXJzcGVjdGl2ZUZydXN0dW07XG5cbiAgICBwcm90ZWN0ZWQgb25VcGRhdGVEZXZpY2VTdGF0ZShkZXZpY2VTdGF0ZTpBcmdvbi5EZXZpY2VTdGF0ZSkge1xuXG4gICAgICAgIGlmICghZGV2aWNlU3RhdGUuaXNQcmVzZW50aW5nSE1EIHx8ICF2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUudmlld3BvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnN0cmljdCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3Vidmlld3MgPSBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyA9IGRldmljZVN0YXRlLnN1YnZpZXdzIHx8IFtdO1xuXG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBjb25zdCByZW5kZXJpbmdQcmltaXRpdmVzID0gZGV2aWNlLmdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nVmlld3MgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFJlbmRlcmluZ1ZpZXdzKCk7XG4gICAgICAgIGNvbnN0IG51bVZpZXdzID0gcmVuZGVyaW5nVmlld3MuZ2V0TnVtVmlld3MoKTtcblxuICAgICAgICBjb25zdCBjb250ZW50U2NhbGVGYWN0b3IgPSB2dWZvcmlhLnZpZGVvVmlldy5pb3MgPyAoPFVJVmlldz52dWZvcmlhLnZpZGVvVmlldy5pb3MpLmNvbnRlbnRTY2FsZUZhY3RvciA6IHBsYXRmb3JtLnNjcmVlbi5tYWluU2NyZWVuLnNjYWxlO1xuXG4gICAgICAgIHN1YnZpZXdzLmxlbmd0aCA9IG51bVZpZXdzO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVmlld3M7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IHJlbmRlcmluZ1ZpZXdzLmdldFZpZXcoaSk7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IHN1cHBvcnQgUG9zdFByb2Nlc3MgcmVuZGVyaW5nIHN1YnZpZXdcbiAgICAgICAgICAgIGlmICh2aWV3ID09PSB2dWZvcmlhLlZpZXcuUG9zdFByb2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBzdWJ2aWV3cy5sZW5ndGgtLTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3VidmlldyA9IHN1YnZpZXdzW2ldID0gc3Vidmlld3NbaV0gfHwgPEFyZ29uLlNlcmlhbGl6ZWRTdWJ2aWV3Pnt9O1xuXG4gICAgICAgICAgICAvLyBTZXQgc3VidmlldyB0eXBlXG4gICAgICAgICAgICBzd2l0Y2ggKHZpZXcpIHtcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5MZWZ0RXllOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5MRUZURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5SaWdodEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuUklHSFRFWUU7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LlNpbmd1bGFyOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuT1RIRVI7IGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgc3VidmlldyB2aWV3cG9ydFxuICAgICAgICAgICAgY29uc3QgdnVmb3JpYVN1YnZpZXdWaWV3cG9ydCA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0Vmlld3BvcnQodmlldyk7XG4gICAgICAgICAgICBjb25zdCBzdWJ2aWV3Vmlld3BvcnQgPSBzdWJ2aWV3LnZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCB8fCA8QXJnb24uVmlld3BvcnQ+e307XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueCAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC55ID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC55IC8gY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LndpZHRoID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC56IC8gY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LmhlaWdodCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQudyAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcblxuICAgICAgICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgcHJvamVjdGlvbiBtYXRyaXggZm9yIHRoaXMgc3Vidmlld1xuICAgICAgICAgICAgLy8gTm90ZTogVnVmb3JpYSB1c2VzIGEgcmlnaHQtaGFuZGVkIHByb2plY3Rpb24gbWF0cml4IHdpdGggeCB0byB0aGUgcmlnaHQsIHkgZG93biwgYW5kIHogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLlxuICAgICAgICAgICAgLy8gU28gd2UgYXJlIGNvbnZlcnRpbmcgdG8gYSBtb3JlIHN0YW5kYXJkIGNvbnZlbnRpb24gb2YgeCB0byB0aGUgcmlnaHQsIHkgdXAsIGFuZCAteiBhcyB0aGUgdmlld2luZyBkaXJlY3Rpb24uIFxuICAgICAgICAgICAgbGV0IHByb2plY3Rpb25NYXRyaXggPSA8YW55PnJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3LCB2dWZvcmlhLkNvb3JkaW5hdGVTeXN0ZW1UeXBlLkNhbWVyYSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaXNGaW5pdGUocHJvamVjdGlvbk1hdHJpeFswXSkpIHtcblxuICAgICAgICAgICAgICAgIC8vIGlmIG91ciBwcm9qZWN0aW9uIG1hdHJpeCBpcyBnaXZpbmcgbnVsbCB2YWx1ZXMgdGhlbiB0aGVcbiAgICAgICAgICAgICAgICAvLyBzdXJmYWNlIGlzIG5vdCBwcm9wZXJseSBjb25maWd1cmVkIGZvciBzb21lIHJlYXNvbiwgc28gcmVzZXQgaXRcbiAgICAgICAgICAgICAgICAvLyAobm90IHN1cmUgd2h5IHRoaXMgaGFwcGVucywgYnV0IGl0IG9ubHkgc2VlbXMgdG8gaGFwcGVuIGFmdGVyIG9yIGJldHdlZW4gXG4gICAgICAgICAgICAgICAgLy8gdnVmb3JpYSBpbml0aWFsaXphdGlvbnMpXG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSB2dWZvcmlhLnZpZGVvVmlldy5pb3MgPyB2dWZvcmlhLnZpZGVvVmlldy5pb3MuZnJhbWUuc2l6ZS53aWR0aCA6IHZ1Zm9yaWEudmlkZW9WaWV3LmFuZHJvaWQuZ2V0V2lkdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmZyYW1lLnNpemUuaGVpZ2h0IDogdnVmb3JpYS52aWRlb1ZpZXcuYW5kcm9pZC5nZXRIZWlnaHQoKTtcbiAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5hcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoICogY29udGVudFNjYWxlRmFjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0ICogY29udGVudFNjYWxlRmFjdG9yXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZnJ1c3R1bSA9IHRoaXMuX3NjcmF0Y2hQZXJzcGVjdGl2ZUZydXN0dW07XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mb3YgPSBNYXRoLlBJLzI7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5uZWFyID0gMC4wMTtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmZhciA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uYXNwZWN0UmF0aW8gPSBzdWJ2aWV3Vmlld3BvcnQud2lkdGggLyBzdWJ2aWV3Vmlld3BvcnQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIGlmICghaXNGaW5pdGUoZnJ1c3R1bS5hc3BlY3RSYXRpbykgfHwgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9PT0gMCkgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9IDE7XG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShmcnVzdHVtLnByb2plY3Rpb25NYXRyaXgsIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAvLyBVbmRvIHRoZSB2aWRlbyByb3RhdGlvbiBzaW5jZSB3ZSBhbHJlYWR5IGVuY29kZSB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGluIG91ciB2aWV3IHBvc2VcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiB0aGUgXCJiYXNlXCIgcm90YXRpb24gZm9yIHZ1Zm9yaWEncyB2aWRlbyAoYXQgbGVhc3Qgb24gaU9TKSBpcyB0aGUgbGFuZHNjYXBlIHJpZ2h0IG9yaWVudGF0aW9uLFxuICAgICAgICAgICAgICAgIC8vIHdoaWNoIGlzIHRoZSBvcmllbnRhdGlvbiB3aGVyZSB0aGUgZGV2aWNlIGlzIGhlbGQgaW4gbGFuZHNjYXBlIHdpdGggdGhlIGhvbWUgYnV0dG9uIG9uIHRoZSByaWdodC4gXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBcImJhc2VcIiB2aWRlbyByb3RhdGF0aW9uIGlzIC05MCBkZWcgYXJvdW5kICt6IGZyb20gdGhlIHBvcnRyYWl0IGludGVyZmFjZSBvcmllbnRhdGlvblxuICAgICAgICAgICAgICAgIC8vIFNvLCB3ZSB3YW50IHRvIHVuZG8gdGhpcyByb3RhdGlvbiB3aGljaCB2dWZvcmlhIGFwcGxpZXMgZm9yIHVzLiAgXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogY2FsY3VsYXRlIHRoaXMgbWF0cml4IG9ubHkgd2hlbiB3ZSBoYXZlIHRvICh3aGVuIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gY2hhbmdlcylcbiAgICAgICAgICAgICAgICBjb25zdCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCA9IE1hdHJpeDQuZnJvbVRyYW5zbGF0aW9uUXVhdGVybmlvblJvdGF0aW9uU2NhbGUoXG4gICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuWkVSTyxcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCAoQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyAtIHNjcmVlbk9yaWVudGF0aW9uICogTWF0aC5QSSAvIDE4MCksIHRoaXMuX3NjcmF0Y2hWaWRlb1F1YXRlcm5pb24pLFxuICAgICAgICAgICAgICAgICAgICBPTkUsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hNYXRyaXg0XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShwcm9qZWN0aW9uTWF0cml4LCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IGZyb20gdGhlIHZ1Zm9yaWEgcHJvamVjdGlvbiBtYXRyaXggKCtYIC1ZICtaKSB0byBhIG1vcmUgc3RhbmRhcmQgY29udmVudGlvbiAoK1ggK1kgLVopXG4gICAgICAgICAgICAgICAgLy8gYnkgbmVnYXRpbmcgdGhlIGFwcHJvcHJpYXRlIGNvbHVtbnMuIFxuICAgICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS9saWJyYXJ5L2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1Vc2UtdGhlLUNhbWVyYS1Qcm9qZWN0aW9uLU1hdHJpeFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMF0gKj0gLTE7IC8vIHhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IC0xOyAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbM10gKj0gLTE7IC8vIHdcblxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOF0gKj0gLTE7ICAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs5XSAqPSAtMTsgIC8vIHlcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzEwXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMTFdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICAvLyBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseUJ5U2NhbGUocHJvamVjdGlvbk1hdHJpeCwgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMSwtMSwtMSwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksIHByb2plY3Rpb25NYXRyaXgpXG5cbiAgICAgICAgICAgICAgICAvLyBTY2FsZSB0aGUgcHJvamVjdGlvbiBtYXRyaXggdG8gZml0IG5pY2VseSB3aXRoaW4gYSBzdWJ2aWV3IG9mIHR5cGUgU0lOR1VMQVJcbiAgICAgICAgICAgICAgICAvLyAoVGhpcyBzY2FsZSB3aWxsIG5vdCBhcHBseSB3aGVuIHRoZSB1c2VyIGlzIHdlYXJpbmcgYSBtb25vY3VsYXIgSE1ELCBzaW5jZSBhXG4gICAgICAgICAgICAgICAgLy8gbW9ub2N1bGFyIEhNRCB3b3VsZCBwcm92aWRlIGEgc3VidmlldyBvZiB0eXBlIExFRlRFWUUgb3IgUklHSFRFWUUpXG4gICAgICAgICAgICAgICAgLy8gaWYgKHN1YnZpZXcudHlwZSA9PSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUikge1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCB3aWR0aFJhdGlvID0gc3Vidmlld1dpZHRoIC8gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IHN1YnZpZXdIZWlnaHQgLyB2aWRlb01vZGUuaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGFzcGVjdCBmaWxsXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5tYXgod2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBvciBhc3BlY3QgZml0XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5taW4od2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHgtYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHktYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzRdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs2XSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzddICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShwcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIGNvbnN0IGV5ZUFkanVzdG1lbnRNYXRyaXggPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXcpO1xuICAgICAgICAgICAgLy8gbGV0IHByb2plY3Rpb25NYXRyaXggPSBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShyYXdQcm9qZWN0aW9uTWF0cml4LCBleWVBZGp1c3RtZW50TWF0cml4LCBbXSk7XG4gICAgICAgICAgICAvLyBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQuZnJvbVJvd01ham9yQXJyYXkocHJvamVjdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gaWRlbnRpdHkgc3VidmlldyBwb3NlIChpbiByZWxhdGlvbiB0byB0aGUgb3ZlcmFsbCB2aWV3IHBvc2UpXG4gICAgICAgICAgICAvLyBUT0RPOiB1c2UgZXllIGFkanVzdG1lbnQgbWF0cml4IHRvIGdldCBzdWJ2aWV3IHBvc2VzIChmb3IgZXllIHNlcGFyYXRpb24pLiBTZWUgY29tbWVudGVkIG91dCBjb2RlIGFib3ZlLi4uXG4gICAgICAgICAgICBzdWJ2aWV3LnBvc2UgPSB1bmRlZmluZWQ7IFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIG9uU3RhcnRHZW9sb2NhdGlvblVwZGF0ZXMob3B0aW9uczpBcmdvbi5HZW9sb2NhdGlvbk9wdGlvbnMpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5sb2NhdGlvbldhdGNoSWQgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpPT57XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBkLnRzIGZvciBuYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24gaXMgd3JvbmcuIFRoaXMgY2FsbCBpcyBjb3JyZWN0LiBcbiAgICAgICAgICAgIC8vIENhc3RpbmcgdGhlIG1vZHVsZSBhcyA8YW55PiBoZXJlIGZvciBub3cgdG8gaGlkZSBhbm5veWluZyB0eXBlc2NyaXB0IGVycm9ycy4uLlxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSAoPGFueT5nZW9sb2NhdGlvbikud2F0Y2hMb2NhdGlvbigobG9jYXRpb246Z2VvbG9jYXRpb24uTG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgLy8gTm90ZTogaU9TIGRvY3VtZW50YXRpb24gc3RhdGVzIHRoYXQgdGhlIGFsdGl0dWRlIHZhbHVlIHJlZmVycyB0byBoZWlnaHQgKG1ldGVycykgYWJvdmUgc2VhIGxldmVsLCBidXQgXG4gICAgICAgICAgICAgICAgLy8gaWYgaW9zIGlzIHJlcG9ydGluZyB0aGUgc3RhbmRhcmQgZ3BzIGRlZmluZWQgYWx0aXR1ZGUsIHRoZW4gdGhpcyB0aGVvcmV0aWNhbCBcInNlYSBsZXZlbFwiIGFjdHVhbGx5IHJlZmVycyB0byBcbiAgICAgICAgICAgICAgICAvLyB0aGUgV0dTODQgZWxsaXBzb2lkIHJhdGhlciB0aGFuIHRyYWRpdGlvbmFsIG1lYW4gc2VhIGxldmVsIChNU0wpIHdoaWNoIGlzIG5vdCBhIHNpbXBsZSBzdXJmYWNlIGFuZCB2YXJpZXMgXG4gICAgICAgICAgICAgICAgLy8gYWNjb3JkaW5nIHRvIHRoZSBsb2NhbCBncmF2aXRhdGlvbmFsIGZpZWxkLiBcbiAgICAgICAgICAgICAgICAvLyBJbiBvdGhlciB3b3JkcywgbXkgYmVzdCBndWVzcyBpcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSBoZXJlIGlzICpwcm9iYWJseSogR1BTIGRlZmluZWQgYWx0aXR1ZGUsIHdoaWNoIFxuICAgICAgICAgICAgICAgIC8vIGlzIGVxdWl2YWxlbnQgdG8gdGhlIGhlaWdodCBhYm92ZSB0aGUgV0dTODQgZWxsaXBzb2lkLCB3aGljaCBpcyBleGFjdGx5IHdoYXQgQ2VzaXVtIGV4cGVjdHMuLi5cbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyZVN0YWdlKFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sb25naXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sYXRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmFsdGl0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uaG9yaXpvbnRhbEFjY3VyYWN5LCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24udmVydGljYWxBY2N1cmFjeVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIChlKT0+e1xuICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgIH0sIDxnZW9sb2NhdGlvbi5PcHRpb25zPntcbiAgICAgICAgICAgICAgICBkZXNpcmVkQWNjdXJhY3k6IG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVIaWdoQWNjdXJhY3kgPyBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5QmVzdCA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuaGlnaCA6IFxuICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi5pb3MgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGtDTExvY2F0aW9uQWNjdXJhY3lLaWxvbWV0ZXIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuYW55LFxuICAgICAgICAgICAgICAgIHVwZGF0ZURpc3RhbmNlOiBhcHBsaWNhdGlvbi5pb3MgPyBrQ0xEaXN0YW5jZUZpbHRlck5vbmUgOiAwLFxuICAgICAgICAgICAgICAgIG1pbmltdW1VcGRhdGVUaW1lIDogb3B0aW9ucyAmJiBvcHRpb25zLmVuYWJsZUhpZ2hBY2N1cmFjeSA/XG4gICAgICAgICAgICAgICAgICAgIDAgOiA1MDAwIC8vIHJlcXVpcmVkIG9uIEFuZHJvaWQsIGlnbm9yZWQgb24gaU9TXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBsb2NhdGlvbiB3YXRjaGVyLiBcIiArIHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgXG4gICAgcHJvdGVjdGVkIG9uU3RvcEdlb2xvY2F0aW9uVXBkYXRlcygpIDogdm9pZCB7XG4gICAgICAgIGlmIChBcmdvbi5DZXNpdW0uZGVmaW5lZCh0aGlzLmxvY2F0aW9uV2F0Y2hJZCkpIHtcbiAgICAgICAgICAgIGdlb2xvY2F0aW9uLmNsZWFyV2F0Y2godGhpcy5sb2NhdGlvbldhdGNoSWQpO1xuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoTWF0cml4NCA9IG5ldyBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbiAgICBwcml2YXRlIF9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uID0gbmV3IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGlmICh0aGlzLmZvY3VzU2VydmljZVByb3ZpZGVyLnNlc3Npb24gPT0gc2Vzc2lvbikgcmV0dXJuOyBcbiAgICAgICAgaWYgKHNlc3Npb24gPT0gdGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKSByZXR1cm47XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vzc2lvbiBkb2VzIG5vdCBoYXZlIGZvY3VzLicpXG4gICAgfVxuICAgIFxuICAgIGhhbmRsZVJlcXVlc3RQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKHRydWUpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgaGFuZGxlRXhpdFByZXNlbnRITUQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICB0aGlzLl9lbnN1cmVQZXJtaXNzaW9uKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgZGV2aWNlICYmIGRldmljZS5zZXRWaWV3ZXJBY3RpdmUoZmFsc2UpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcHVibGljIF9pc0htZEFjdGl2ZSgpIHtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIHJldHVybiBkZXZpY2UuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG5cbn0iXX0=