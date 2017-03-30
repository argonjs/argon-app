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
        viewport.width = contentView.getMeasuredWidth();
        viewport.height = contentView.getMeasuredHeight();
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
        var contentScaleFactor = vuforia.videoView.ios.contentScaleFactor;
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
                    vuforia.api.onSurfaceChanged(vuforia.videoView.ios.frame.size.width * contentScaleFactor, vuforia.videoView.ios.frame.size.height * contentScaleFactor);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyw4Q0FBZ0Q7QUFDaEQsaUNBQW1DO0FBRW5DLHNDQUF3QztBQUV4QywrQkFBMkM7QUFFM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBR2xDLElBQWEseUJBQXlCO0lBQVMsNkNBQW1CO0lBRTlELG1DQUNJLGNBQW1DLEVBQ25DLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLHNCQUFtRDtRQUp2RCxZQUtJLGtCQUFNLGNBQWMsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLFNBc0JyRDtRQUVPLGtCQUFZLEdBQUcsV0FBVyxDQUFDO1FBQzNCLGdDQUEwQixHQUFHLElBQUksVUFBVSxDQUFDO1FBQzVDLCtCQUF5QixHQUFHLElBQUksVUFBVSxDQUFDO1FBRTNDLFNBQUcsR0FBRyxDQUFDLENBQUM7UUFDUixnQkFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FB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TSx3REFBWSxHQUFuQjtRQUNJLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN0RCxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTCx3Q0FBQztBQUFELENBQUMsQUE1UEQsQ0FBdUQsS0FBSyxDQUFDLHFCQUFxQixHQTRQakY7QUE1UFksaUNBQWlDO0lBRDdDLEtBQUssQ0FBQyxFQUFFLENBQUMsVUFBVTs2Q0FJRyxLQUFLLENBQUMsY0FBYyxFQUNyQixLQUFLLENBQUMsYUFBYSxFQUNsQixLQUFLLENBQUMsY0FBYyxFQUN2QixLQUFLLENBQUMsV0FBVyxFQUNMLEtBQUssQ0FBQyxzQkFBc0IsRUFDdkIsS0FBSyxDQUFDLG9CQUFvQixFQUN4QyxLQUFLLENBQUMsY0FBYztHQVQ5QixpQ0FBaUMsQ0E0UDdDO0FBNVBZLDhFQUFpQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gXCJhcHBsaWNhdGlvblwiO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0ICogYXMgZ2VvbG9jYXRpb24gZnJvbSAnc3BlaWdnLW5hdGl2ZXNjcmlwdC1nZW9sb2NhdGlvbic7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgZW51bXMgZnJvbSAndWkvZW51bXMnO1xuXG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGZyYW1lcyBmcm9tICd1aS9mcmFtZSc7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1wcm92aWRlcidcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gXCJAYXJnb25qcy9hcmdvblwiO1xuXG5pbXBvcnQge2dldFNjcmVlbk9yaWVudGF0aW9ufSBmcm9tICcuL3V0aWwnXG5cbmNvbnN0IENhcnRlc2lhbjMgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbmNvbnN0IFF1YXRlcm5pb24gPSBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcbmNvbnN0IENlc2l1bU1hdGggPSBBcmdvbi5DZXNpdW0uQ2VzaXVtTWF0aDtcbmNvbnN0IE1hdHJpeDQgICAgPSBBcmdvbi5DZXNpdW0uTWF0cml4NDtcblxuY29uc3QgejkwID0gUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCBDZXNpdW1NYXRoLlBJX09WRVJfVFdPKTtcbmNvbnN0IE9ORSA9IG5ldyBDYXJ0ZXNpYW4zKDEsMSwxKTtcblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlIGV4dGVuZHMgQXJnb24uRGV2aWNlU2VydmljZSB7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSwgXG4gICAgICAgIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICB2dWZvcmlhU2VydmljZVByb3ZpZGVyOkFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpIHtcbiAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIGNvbnRleHRTZXJ2aWNlLCB2aWV3U2VydmljZSk7XG5cbiAgICAgICAgY29uc3QgdnNwID0gPE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI+dnVmb3JpYVNlcnZpY2VQcm92aWRlcjtcbiAgICAgICAgbGV0IG5vdzpudW1iZXI7XG5cbiAgICAgICAgY29uc3QgZXhlY3V0ZUNhbGxiYWNrID0gKGNiLCBpZCkgPT4ge1xuICAgICAgICAgICAgY2Iobm93KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2c3Auc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICBub3cgPSBnbG9iYWwucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICAvLyBzd2FwIGNhbGxiYWNrIG1hcHNcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcztcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrczI7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MyID0gY2FsbGJhY2tzO1xuICAgICAgICAgICAgY2FsbGJhY2tzLmZvckVhY2goZXhlY3V0ZUNhbGxiYWNrKTtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5jbGVhcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB2c3Auc3RhdGVVcGRhdGVFdmVudC5yYWlzZUV2ZW50KEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlLm5vdygpKSwgMzQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfYXBwbGljYXRpb24gPSBhcHBsaWNhdGlvbjtcbiAgICBwcml2YXRlIF9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uID0gbmV3IFF1YXRlcm5pb247XG4gICAgcHJpdmF0ZSBfc2NyYXRjaERldmljZU9yaWVudGF0aW9uID0gbmV3IFF1YXRlcm5pb247XG5cbiAgICBwcml2YXRlIF9pZCA9IDA7XG4gICAgcHJpdmF0ZSBfY2FsbGJhY2tzID0gbmV3IE1hcDxudW1iZXIsIEZ1bmN0aW9uPigpO1xuICAgIHByaXZhdGUgX2NhbGxiYWNrczIgPSBuZXcgTWFwPG51bWJlciwgRnVuY3Rpb24+KCk7XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSAoY2I6KHRpbWVzdGFtcDpudW1iZXIpPT52b2lkKSA9PiB7XG4gICAgICAgIHRoaXMuX2lkKys7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrcy5zZXQodGhpcy5faWQsIGNiKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKGlkOm51bWJlcikgPT4ge1xuICAgICAgICB0aGlzLl9jYWxsYmFja3MuZGVsZXRlKGlkKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2NyZWVuT3JpZW50YXRpb25EZWdyZWVzKCkge1xuICAgICAgICByZXR1cm4gZ2V0U2NyZWVuT3JpZW50YXRpb24oKTtcbiAgICB9XG4gICAgXG4gICAgb25VcGRhdGVGcmFtZVN0YXRlKCkge1xuXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0ID0gdGhpcy5kZXZpY2VTdGF0ZS52aWV3cG9ydCA9IHRoaXMuZGV2aWNlU3RhdGUudmlld3BvcnQgfHwgPEFyZ29uLlZpZXdwb3J0Pnt9O1xuICAgICAgICBjb25zdCBjb250ZW50VmlldyA9IGZyYW1lcy50b3Btb3N0KCkuY3VycmVudFBhZ2UuY29udGVudDtcbiAgICAgICAgdmlld3BvcnQueCA9IDA7XG4gICAgICAgIHZpZXdwb3J0LnkgPSAwO1xuICAgICAgICB2aWV3cG9ydC53aWR0aCA9IGNvbnRlbnRWaWV3LmdldE1lYXN1cmVkV2lkdGgoKTtcbiAgICAgICAgdmlld3BvcnQuaGVpZ2h0ID0gY29udGVudFZpZXcuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcblxuICAgICAgICBzdXBlci5vblVwZGF0ZUZyYW1lU3RhdGUoKTtcblxuICAgICAgICBpZiAodGhpcy5fYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gdGhpcy5fZ2V0TW90aW9uTWFuYWdlcklPUygpO1xuICAgICAgICAgICAgY29uc3QgbW90aW9uID0gbW90aW9uTWFuYWdlciAmJiBtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvbjtcblxuICAgICAgICAgICAgaWYgKG1vdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdGlvblF1YXRlcm5pb24gPSA8QXJnb24uQ2VzaXVtLlF1YXRlcm5pb24+bW90aW9uLmF0dGl0dWRlLnF1YXRlcm5pb247XG5cbiAgICAgICAgICAgICAgICAvLyBBcHBsZSdzIG9yaWVudGF0aW9uIGlzIHJlcG9ydGVkIGluIE5XVSwgc28gd2UgY29udmVydCB0byBFTlUgYnkgYXBwbHlpbmcgYSBnbG9iYWwgcm90YXRpb24gb2ZcbiAgICAgICAgICAgICAgICAvLyA5MCBkZWdyZWVzIGFib3V0ICt6IHRvIHRoZSBOV1Ugb3JpZW50YXRpb24gKG9yIGFwcGx5aW5nIHRoZSBOV1UgcXVhdGVybmlvbiBhcyBhIGxvY2FsIHJvdGF0aW9uIFxuICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBzdGFydGluZyBvcmllbnRhdGlvbiBvZiA5MCBkZWdyZXNzIGFib3V0ICt6KS4gXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogV2l0aCBxdWF0ZXJuaW9uIG11bHRpcGxpY2F0aW9uIHRoZSBgKmAgc3ltYm9sIGNhbiBiZSByZWFkIGFzICdyb3RhdGVzJy4gXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9yaWVudGF0aW9uIChPKSBpcyBvbiB0aGUgcmlnaHQgYW5kIHRoZSByb3RhdGlvbiAoUikgaXMgb24gdGhlIGxlZnQsIFxuICAgICAgICAgICAgICAgIC8vIHN1Y2ggdGhhdCB0aGUgbXVsdGlwbGljYXRpb24gb3JkZXIgaXMgUipPLCB0aGVuIFIgaXMgYSBnbG9iYWwgcm90YXRpb24gYmVpbmcgYXBwbGllZCBvbiBPLiBcbiAgICAgICAgICAgICAgICAvLyBMaWtld2lzZSwgdGhlIHJldmVyc2UsIE8qUiwgaXMgYSBsb2NhbCByb3RhdGlvbiBSIGFwcGxpZWQgdG8gdGhlIG9yaWVudGF0aW9uIE8uIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZU9yaWVudGF0aW9uID0gUXVhdGVybmlvbi5tdWx0aXBseSh6OTAsIG1vdGlvblF1YXRlcm5pb24sIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgPSB0aGlzLmZyYW1lU3RhdGUuc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlVXNlciA9IHRoaXMudXNlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VTdGFnZSA9IHRoaXMuc3RhZ2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIucG9zaXRpb24pIGRldmljZVVzZXIucG9zaXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSgpO1xuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5vcmllbnRhdGlvbikgZGV2aWNlVXNlci5vcmllbnRhdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSgpO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSkuc2V0VmFsdWUoXG4gICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDAsMCx0aGlzLmRldmljZVN0YXRlLnN1Z2dlc3RlZFVzZXJIZWlnaHQsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLFxuICAgICAgICAgICAgICAgICAgICBkZXZpY2VTdGFnZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5PcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlVOSVRfWiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMgKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGlzcGxheU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24ubXVsdGlwbHkoXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VPcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JlZW5PcmllbnRhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KS5zZXRWYWx1ZShzY3JlZW5CYXNlZERldmljZU9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRMb2NhdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkaW5nID0gbG9jYXRpb25NYW5hZ2VyLmhlYWRpbmc7XG4gICAgICAgICAgICAgICAgZGV2aWNlVXNlclsnbWV0YSddID0gZGV2aWNlVXNlclsnbWV0YSddIHx8IHt9O1xuICAgICAgICAgICAgICAgIGRldmljZVVzZXJbJ21ldGEnXS5nZW9IZWFkaW5nQWNjdXJhY3kgPSBoZWFkaW5nICYmIGhlYWRpbmcuaGVhZGluZ0FjY3VyYWN5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbW90aW9uTWFuYWdlcklPUz86Q01Nb3Rpb25NYW5hZ2VyO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TW90aW9uTWFuYWdlcklPUygpIDogQ01Nb3Rpb25NYW5hZ2VyfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICh0aGlzLl9tb3Rpb25NYW5hZ2VySU9TKSByZXR1cm4gdGhpcy5fbW90aW9uTWFuYWdlcklPUztcblxuICAgICAgICBjb25zdCBtb3Rpb25NYW5hZ2VyID0gQ01Nb3Rpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuICAgICAgICBtb3Rpb25NYW5hZ2VyLnNob3dzRGV2aWNlTW92ZW1lbnREaXNwbGF5ID0gdHJ1ZVxuICAgICAgICBtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvblVwZGF0ZUludGVydmFsID0gMS4wIC8gMTAwLjA7XG4gICAgICAgIGlmICghbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25BdmFpbGFibGUgfHwgIW1vdGlvbk1hbmFnZXIubWFnbmV0b21ldGVyQXZhaWxhYmxlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5PIE1hZ25ldG9tZXRlciBhbmQvb3IgR3lyby4gXCIgKTtcbiAgICAgICAgICAgIGFsZXJ0KFwiTmVlZCBhIGRldmljZSB3aXRoIGd5cm9zY29wZSBhbmQgbWFnbmV0b21ldGVyIHRvIGdldCAzRCBkZXZpY2Ugb3JpZW50YXRpb25cIik7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lOkNNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZTtcbiAgICAgICAgICAgIGlmIChDTU1vdGlvbk1hbmFnZXIuYXZhaWxhYmxlQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZXMoKSAmIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsKSB7XG4gICAgICAgICAgICAgICAgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWUgPSBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWUuWFRydWVOb3J0aFpWZXJ0aWNhbDtcbiAgICAgICAgICAgICAgICBtb3Rpb25NYW5hZ2VyLnN0YXJ0RGV2aWNlTW90aW9uVXBkYXRlc1VzaW5nUmVmZXJlbmNlRnJhbWUoZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGVydChcIk5lZWQgYSBkZXZpY2Ugd2l0aCBtYWduZXRvbWV0ZXIgdG8gZ2V0IGZ1bGwgM0QgZGV2aWNlIG9yaWVudGF0aW9uXCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTk8gIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZVhUcnVlTm9ydGhaVmVydGljYWxcIiApO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbW90aW9uTWFuYWdlcklPUyA9IG1vdGlvbk1hbmFnZXI7XG4gICAgICAgIHJldHVybiBtb3Rpb25NYW5hZ2VyO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2xvY2F0aW9uTWFuYWdlcklPUz86Q0xMb2NhdGlvbk1hbmFnZXI7XG5cbiAgICBwcml2YXRlIF9nZXRMb2NhdGlvbk1hbmFnZXJJT1MoKSB7XG4gICAgICAgIGlmICghdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TKSB7XG4gICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MgPSBDTExvY2F0aW9uTWFuYWdlci5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICAgICAgc3dpdGNoIChDTExvY2F0aW9uTWFuYWdlci5hdXRob3JpemF0aW9uU3RhdHVzKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZFdoZW5JblVzZTpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzQXV0aG9yaXplZEFsd2F5czogXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNOb3REZXRlcm1pbmVkOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MucmVxdWVzdFdoZW5JblVzZUF1dGhvcml6YXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0RlbmllZDpcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzUmVzdHJpY3RlZDpcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFjdGlvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJMb2NhdGlvbiBTZXJ2aWNlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEluIG9yZGVyIHRvIHByb3ZpZGUgdGhlIGJlc3QgQXVnbWVudGVkIFJlYWxpdHkgZXhwZXJpZW5jZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxlYXNlIG9wZW4gdGhpcyBhcHAncyBzZXR0aW5ncyBhbmQgZW5hYmxlIGxvY2F0aW9uIHNlcnZpY2VzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwiQ2FuY2VsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ1NldHRpbmdzJ11cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbigoYWN0aW9uKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ1NldHRpbmdzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IE5TVVJMLlVSTFdpdGhTdHJpbmcoVUlBcHBsaWNhdGlvbk9wZW5TZXR0aW5nc1VSTFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5vcGVuVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUztcbiAgICB9XG59XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyIGV4dGVuZHMgQXJnb24uRGV2aWNlU2VydmljZVByb3ZpZGVyIHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgY29udGFpbmVyLCBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICBkZXZpY2VTZXJ2aWNlOkFyZ29uLkRldmljZVNlcnZpY2UsIFxuICAgICAgICBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSwgXG4gICAgICAgIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZTpBcmdvbi5Db250ZXh0U2VydmljZVByb3ZpZGVyLFxuICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIHNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgICAgIGRldmljZVNlcnZpY2UsIFxuICAgICAgICAgICAgY29udGV4dFNlcnZpY2UsIFxuICAgICAgICAgICAgdmlld1NlcnZpY2UsICAgICAgICAgXG4gICAgICAgICAgICBjb250ZXh0U2VydmljZVByb3ZpZGVyZVxuICAgICAgICApO1xuXG4gICAgICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKT0+e1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaERldmljZVN0YXRlKCk7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoRGV2aWNlU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2NhdGlvbldhdGNoSWQ/Om51bWJlcjtcblxuICAgIC8vIHByaXZhdGUgX3NjcmF0Y2hDYXJ0ZXNpYW4gPSBuZXcgQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFBlcnNwZWN0aXZlRnJ1c3R1bSA9IG5ldyBBcmdvbi5DZXNpdW0uUGVyc3BlY3RpdmVGcnVzdHVtO1xuXG4gICAgcHJvdGVjdGVkIG9uVXBkYXRlRGV2aWNlU3RhdGUoZGV2aWNlU3RhdGU6QXJnb24uRGV2aWNlU3RhdGUpIHtcblxuICAgICAgICBpZiAoIWRldmljZVN0YXRlLmlzUHJlc2VudGluZ0hNRCB8fCAhdnVmb3JpYS5hcGkpIHtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnZpZXdwb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUuc3Vidmlld3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS5zdHJpY3QgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1YnZpZXdzID0gZGV2aWNlU3RhdGUuc3Vidmlld3MgPSBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyB8fCBbXTtcblxuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nUHJpbWl0aXZlcyA9IGRldmljZS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk7XG4gICAgICAgIGNvbnN0IHJlbmRlcmluZ1ZpZXdzID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRSZW5kZXJpbmdWaWV3cygpO1xuICAgICAgICBjb25zdCBudW1WaWV3cyA9IHJlbmRlcmluZ1ZpZXdzLmdldE51bVZpZXdzKCk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gKDxVSVZpZXc+dnVmb3JpYS52aWRlb1ZpZXcuaW9zKS5jb250ZW50U2NhbGVGYWN0b3I7XG5cbiAgICAgICAgc3Vidmlld3MubGVuZ3RoID0gbnVtVmlld3M7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1WaWV3czsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCB2aWV3ID0gcmVuZGVyaW5nVmlld3MuZ2V0VmlldyhpKTtcblxuICAgICAgICAgICAgLy8gVE9ETzogc3VwcG9ydCBQb3N0UHJvY2VzcyByZW5kZXJpbmcgc3Vidmlld1xuICAgICAgICAgICAgaWYgKHZpZXcgPT09IHZ1Zm9yaWEuVmlldy5Qb3N0UHJvY2Vzcykge1xuICAgICAgICAgICAgICAgIHN1YnZpZXdzLmxlbmd0aC0tO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdWJ2aWV3ID0gc3Vidmlld3NbaV0gPSBzdWJ2aWV3c1tpXSB8fCA8QXJnb24uU2VyaWFsaXplZFN1YnZpZXc+e307XG5cbiAgICAgICAgICAgIC8vIFNldCBzdWJ2aWV3IHR5cGVcbiAgICAgICAgICAgIHN3aXRjaCAodmlldykge1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LkxlZnRFeWU6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLkxFRlRFWUU7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LlJpZ2h0RXllOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5SSUdIVEVZRTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuU2luZ3VsYXI6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLlNJTkdVTEFSOyBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5PVEhFUjsgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBzdWJ2aWV3IHZpZXdwb3J0XG4gICAgICAgICAgICBjb25zdCB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0ID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRWaWV3cG9ydCh2aWV3KTtcbiAgICAgICAgICAgIGNvbnN0IHN1YnZpZXdWaWV3cG9ydCA9IHN1YnZpZXcudmlld3BvcnQgPSBzdWJ2aWV3LnZpZXdwb3J0IHx8IDxBcmdvbi5WaWV3cG9ydD57fTtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC54ID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC54IC8gY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LnkgPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LnkgLyBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQud2lkdGggPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LnogLyBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQuaGVpZ2h0ID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC53IC8gY29udGVudFNjYWxlRmFjdG9yO1xuXG4gICAgICAgICAgICAvLyBTdGFydCB3aXRoIHRoZSBwcm9qZWN0aW9uIG1hdHJpeCBmb3IgdGhpcyBzdWJ2aWV3XG4gICAgICAgICAgICAvLyBOb3RlOiBWdWZvcmlhIHVzZXMgYSByaWdodC1oYW5kZWQgcHJvamVjdGlvbiBtYXRyaXggd2l0aCB4IHRvIHRoZSByaWdodCwgeSBkb3duLCBhbmQgeiBhcyB0aGUgdmlld2luZyBkaXJlY3Rpb24uXG4gICAgICAgICAgICAvLyBTbyB3ZSBhcmUgY29udmVydGluZyB0byBhIG1vcmUgc3RhbmRhcmQgY29udmVudGlvbiBvZiB4IHRvIHRoZSByaWdodCwgeSB1cCwgYW5kIC16IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi4gXG4gICAgICAgICAgICBsZXQgcHJvamVjdGlvbk1hdHJpeCA9IDxhbnk+cmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRQcm9qZWN0aW9uTWF0cml4KHZpZXcsIHZ1Zm9yaWEuQ29vcmRpbmF0ZVN5c3RlbVR5cGUuQ2FtZXJhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShwcm9qZWN0aW9uTWF0cml4WzBdKSkge1xuXG4gICAgICAgICAgICAgICAgLy8gaWYgb3VyIHByb2plY3Rpb24gbWF0cml4IGlzIGdpdmluZyBudWxsIHZhbHVlcyB0aGVuIHRoZVxuICAgICAgICAgICAgICAgIC8vIHN1cmZhY2UgaXMgbm90IHByb3Blcmx5IGNvbmZpZ3VyZWQgZm9yIHNvbWUgcmVhc29uLCBzbyByZXNldCBpdFxuICAgICAgICAgICAgICAgIC8vIChub3Qgc3VyZSB3aHkgdGhpcyBoYXBwZW5zLCBidXQgaXQgb25seSBzZWVtcyB0byBoYXBwZW4gYWZ0ZXIgb3IgYmV0d2VlbiBcbiAgICAgICAgICAgICAgICAvLyB2dWZvcmlhIGluaXRpYWxpemF0aW9ucylcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLmFwaS5vblN1cmZhY2VDaGFuZ2VkKFxuICAgICAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmZyYW1lLnNpemUud2lkdGggKiBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLnZpZGVvVmlldy5pb3MuZnJhbWUuc2l6ZS5oZWlnaHQgKiBjb250ZW50U2NhbGVGYWN0b3JcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBmcnVzdHVtID0gdGhpcy5fc2NyYXRjaFBlcnNwZWN0aXZlRnJ1c3R1bTtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmZvdiA9IE1hdGguUEkvMjtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLm5lYXIgPSAwLjAxO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uZmFyID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9IHN1YnZpZXdWaWV3cG9ydC53aWR0aCAvIHN1YnZpZXdWaWV3cG9ydC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShmcnVzdHVtLmFzcGVjdFJhdGlvKSB8fCBmcnVzdHVtLmFzcGVjdFJhdGlvID09PSAwKSBmcnVzdHVtLmFzcGVjdFJhdGlvID0gMTtcbiAgICAgICAgICAgICAgICBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXggPSBNYXRyaXg0LmNsb25lKGZydXN0dW0ucHJvamVjdGlvbk1hdHJpeCwgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4KTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIC8vIFVuZG8gdGhlIHZpZGVvIHJvdGF0aW9uIHNpbmNlIHdlIGFscmVhZHkgZW5jb2RlIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gaW4gb3VyIHZpZXcgcG9zZVxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBcImJhc2VcIiByb3RhdGlvbiBmb3IgdnVmb3JpYSdzIHZpZGVvIChhdCBsZWFzdCBvbiBpT1MpIGlzIHRoZSBsYW5kc2NhcGUgcmlnaHQgb3JpZW50YXRpb24sXG4gICAgICAgICAgICAgICAgLy8gd2hpY2ggaXMgdGhlIG9yaWVudGF0aW9uIHdoZXJlIHRoZSBkZXZpY2UgaXMgaGVsZCBpbiBsYW5kc2NhcGUgd2l0aCB0aGUgaG9tZSBidXR0b24gb24gdGhlIHJpZ2h0LiBcbiAgICAgICAgICAgICAgICAvLyBUaGlzIFwiYmFzZVwiIHZpZGVvIHJvdGF0YXRpb24gaXMgLTkwIGRlZyBhcm91bmQgK3ogZnJvbSB0aGUgcG9ydHJhaXQgaW50ZXJmYWNlIG9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgLy8gU28sIHdlIHdhbnQgdG8gdW5kbyB0aGlzIHJvdGF0aW9uIHdoaWNoIHZ1Zm9yaWEgYXBwbGllcyBmb3IgdXMuICBcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBjYWxjdWxhdGUgdGhpcyBtYXRyaXggb25seSB3aGVuIHdlIGhhdmUgdG8gKHdoZW4gdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBjaGFuZ2VzKVxuICAgICAgICAgICAgICAgIGNvbnN0IGludmVyc2VWaWRlb1JvdGF0aW9uTWF0cml4ID0gTWF0cml4NC5mcm9tVHJhbnNsYXRpb25RdWF0ZXJuaW9uUm90YXRpb25TY2FsZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5aRVJPLFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIChDZXNpdW1NYXRoLlBJX09WRVJfVFdPIC0gZ2V0U2NyZWVuT3JpZW50YXRpb24oKSAqIE1hdGguUEkgLyAxODApLCB0aGlzLl9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uKSxcbiAgICAgICAgICAgICAgICAgICAgT05FLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoTWF0cml4NFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocHJvamVjdGlvbk1hdHJpeCwgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICAgICAgLy8gY29udmVydCBmcm9tIHRoZSB2dWZvcmlhIHByb2plY3Rpb24gbWF0cml4ICgrWCAtWSArWikgdG8gYSBtb3JlIHN0YW5kYXJkIGNvbnZlbnRpb24gKCtYICtZIC1aKVxuICAgICAgICAgICAgICAgIC8vIGJ5IG5lZ2F0aW5nIHRoZSBhcHByb3ByaWF0ZSBjb2x1bW5zLiBcbiAgICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIudnVmb3JpYS5jb20vbGlicmFyeS9hcnRpY2xlcy9Tb2x1dGlvbi9Ib3ctVG8tVXNlLXRoZS1DYW1lcmEtUHJvamVjdGlvbi1NYXRyaXhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IC0xOyAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxXSAqPSAtMTsgLy8geVxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzhdICo9IC0xOyAgLy8geFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOV0gKj0gLTE7ICAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxMF0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzExXSAqPSAtMTsgLy8gd1xuXG4gICAgICAgICAgICAgICAgLy8gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHlCeVNjYWxlKHByb2plY3Rpb25NYXRyaXgsIENhcnRlc2lhbjMuZnJvbUVsZW1lbnRzKDEsLTEsLTEsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pLCBwcm9qZWN0aW9uTWF0cml4KVxuXG4gICAgICAgICAgICAgICAgLy8gU2NhbGUgdGhlIHByb2plY3Rpb24gbWF0cml4IHRvIGZpdCBuaWNlbHkgd2l0aGluIGEgc3VidmlldyBvZiB0eXBlIFNJTkdVTEFSXG4gICAgICAgICAgICAgICAgLy8gKFRoaXMgc2NhbGUgd2lsbCBub3QgYXBwbHkgd2hlbiB0aGUgdXNlciBpcyB3ZWFyaW5nIGEgbW9ub2N1bGFyIEhNRCwgc2luY2UgYVxuICAgICAgICAgICAgICAgIC8vIG1vbm9jdWxhciBITUQgd291bGQgcHJvdmlkZSBhIHN1YnZpZXcgb2YgdHlwZSBMRUZURVlFIG9yIFJJR0hURVlFKVxuICAgICAgICAgICAgICAgIC8vIGlmIChzdWJ2aWV3LnR5cGUgPT0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVIpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3Qgd2lkdGhSYXRpbyA9IHN1YnZpZXdXaWR0aCAvIHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc3QgaGVpZ2h0UmF0aW8gPSBzdWJ2aWV3SGVpZ2h0IC8gdmlkZW9Nb2RlLmhlaWdodDtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBhc3BlY3QgZmlsbFxuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWF4KHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gb3IgYXNwZWN0IGZpdFxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBjb25zdCBzY2FsZUZhY3RvciA9IE1hdGgubWluKHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcblxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB4LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFswXSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFszXSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBzY2FsZSB5LWF4aXNcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs0XSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzVdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNl0gKj0gc2NhbGVGYWN0b3I7IC8vIHpcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs3XSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUocHJvamVjdGlvbk1hdHJpeCwgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4KTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAvLyBjb25zdCBleWVBZGp1c3RtZW50TWF0cml4ID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3KTtcbiAgICAgICAgICAgIC8vIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocmF3UHJvamVjdGlvbk1hdHJpeCwgZXllQWRqdXN0bWVudE1hdHJpeCwgW10pO1xuICAgICAgICAgICAgLy8gcHJvamVjdGlvbk1hdHJpeCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0LmZyb21Sb3dNYWpvckFycmF5KHByb2plY3Rpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBkZWZhdWx0IHRvIGlkZW50aXR5IHN1YnZpZXcgcG9zZSAoaW4gcmVsYXRpb24gdG8gdGhlIG92ZXJhbGwgdmlldyBwb3NlKVxuICAgICAgICAgICAgLy8gVE9ETzogdXNlIGV5ZSBhZGp1c3RtZW50IG1hdHJpeCB0byBnZXQgc3VidmlldyBwb3NlcyAoZm9yIGV5ZSBzZXBhcmF0aW9uKS4gU2VlIGNvbW1lbnRlZCBvdXQgY29kZSBhYm92ZS4uLlxuICAgICAgICAgICAgc3Vidmlldy5wb3NlID0gdW5kZWZpbmVkOyBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCBvblN0YXJ0R2VvbG9jYXRpb25VcGRhdGVzKG9wdGlvbnM6QXJnb24uR2VvbG9jYXRpb25PcHRpb25zKSA6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMubG9jYXRpb25XYXRjaElkICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KT0+e1xuXG4gICAgICAgICAgICAvLyBOb3RlOiB0aGUgZC50cyBmb3IgbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uIGlzIHdyb25nLiBUaGlzIGNhbGwgaXMgY29ycmVjdC4gXG4gICAgICAgICAgICAvLyBDYXN0aW5nIHRoZSBtb2R1bGUgYXMgPGFueT4gaGVyZSBmb3Igbm93IHRvIGhpZGUgYW5ub3lpbmcgdHlwZXNjcmlwdCBlcnJvcnMuLi5cbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gKDxhbnk+Z2VvbG9jYXRpb24pLndhdGNoTG9jYXRpb24oKGxvY2F0aW9uOmdlb2xvY2F0aW9uLkxvY2F0aW9uKT0+e1xuICAgICAgICAgICAgICAgIC8vIE5vdGU6IGlPUyBkb2N1bWVudGF0aW9uIHN0YXRlcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSByZWZlcnMgdG8gaGVpZ2h0IChtZXRlcnMpIGFib3ZlIHNlYSBsZXZlbCwgYnV0IFxuICAgICAgICAgICAgICAgIC8vIGlmIGlvcyBpcyByZXBvcnRpbmcgdGhlIHN0YW5kYXJkIGdwcyBkZWZpbmVkIGFsdGl0dWRlLCB0aGVuIHRoaXMgdGhlb3JldGljYWwgXCJzZWEgbGV2ZWxcIiBhY3R1YWxseSByZWZlcnMgdG8gXG4gICAgICAgICAgICAgICAgLy8gdGhlIFdHUzg0IGVsbGlwc29pZCByYXRoZXIgdGhhbiB0cmFkaXRpb25hbCBtZWFuIHNlYSBsZXZlbCAoTVNMKSB3aGljaCBpcyBub3QgYSBzaW1wbGUgc3VyZmFjZSBhbmQgdmFyaWVzIFxuICAgICAgICAgICAgICAgIC8vIGFjY29yZGluZyB0byB0aGUgbG9jYWwgZ3Jhdml0YXRpb25hbCBmaWVsZC4gXG4gICAgICAgICAgICAgICAgLy8gSW4gb3RoZXIgd29yZHMsIG15IGJlc3QgZ3Vlc3MgaXMgdGhhdCB0aGUgYWx0aXR1ZGUgdmFsdWUgaGVyZSBpcyAqcHJvYmFibHkqIEdQUyBkZWZpbmVkIGFsdGl0dWRlLCB3aGljaCBcbiAgICAgICAgICAgICAgICAvLyBpcyBlcXVpdmFsZW50IHRvIHRoZSBoZWlnaHQgYWJvdmUgdGhlIFdHUzg0IGVsbGlwc29pZCwgd2hpY2ggaXMgZXhhY3RseSB3aGF0IENlc2l1bSBleHBlY3RzLi4uXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmVTdGFnZShcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubG9uZ2l0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ubGF0aXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5hbHRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhvcml6b250YWxBY2N1cmFjeSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLnZlcnRpY2FsQWNjdXJhY3lcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAoZSk9PntcbiAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9LCA8Z2VvbG9jYXRpb24uT3B0aW9ucz57XG4gICAgICAgICAgICAgICAgZGVzaXJlZEFjY3VyYWN5OiBvcHRpb25zICYmIG9wdGlvbnMuZW5hYmxlSGlnaEFjY3VyYWN5ID8gXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmlvcyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAga0NMTG9jYXRpb25BY2N1cmFjeUJlc3QgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmhpZ2ggOiBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5S2lsb21ldGVyIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1zLkFjY3VyYWN5LmFueSxcbiAgICAgICAgICAgICAgICB1cGRhdGVEaXN0YW5jZTogYXBwbGljYXRpb24uaW9zID8ga0NMRGlzdGFuY2VGaWx0ZXJOb25lIDogMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbG9jYXRpb24gd2F0Y2hlci4gXCIgKyB0aGlzLmxvY2F0aW9uV2F0Y2hJZCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFxuICAgIHByb3RlY3RlZCBvblN0b3BHZW9sb2NhdGlvblVwZGF0ZXMoKSA6IHZvaWQge1xuICAgICAgICBpZiAoQXJnb24uQ2VzaXVtLmRlZmluZWQodGhpcy5sb2NhdGlvbldhdGNoSWQpKSB7XG4gICAgICAgICAgICBnZW9sb2NhdGlvbi5jbGVhcldhdGNoKHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25XYXRjaElkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDQgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFZpZGVvUXVhdGVybmlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBpZiAodGhpcy5mb2N1c1NlcnZpY2VQcm92aWRlci5zZXNzaW9uID09IHNlc3Npb24pIHJldHVybjsgXG4gICAgICAgIGlmIChzZXNzaW9uID09IHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcikgcmV0dXJuO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZG9lcyBub3QgaGF2ZSBmb2N1cy4nKVxuICAgIH1cbiAgICBcbiAgICBoYW5kbGVSZXF1ZXN0UHJlc2VudEhNRChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBlcm1pc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2UgJiYgZGV2aWNlLnNldFZpZXdlckFjdGl2ZSh0cnVlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGhhbmRsZUV4aXRQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBfaXNIbWRBY3RpdmUoKSB7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICByZXR1cm4gZGV2aWNlLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuXG59Il19