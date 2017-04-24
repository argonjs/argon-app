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
                var screenOrientation_1 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, screenOrientationDegrees * CesiumMath.RADIANS_PER_DEGREE, this._scratchDisplayOrientation);
                var screenBasedDeviceOrientation = Quaternion.multiply(deviceOrientation, screenOrientation_1, this._scratchDeviceOrientation);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyw4Q0FBZ0Q7QUFDaEQsaUNBQW1DO0FBRW5DLHNDQUF3QztBQUV4QywrQkFBd0M7QUFFeEMsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBR2xDLElBQWEseUJBQXlCO0lBQVMsNkNBQW1CO0lBRTlELG1DQUNJLGNBQW1DLEVBQ25DLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLHNCQUFtRDtRQUp2RCxZQUtJLGtCQUFNLGNBQWMsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLFNBcUJyRDtRQUVPLHNCQUFnQixHQUFHLFVBQUMsRUFBVyxFQUFFLEdBQVU7WUFDL0MsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1osQ0FBQyxDQUFDO1FBRU0sa0JBQVksR0FBRyxXQUFXLENBQUM7UUFDM0IsZ0NBQTBCLEdBQUcsSUFBSSxVQUFVLENBQUM7UUFDNUMsK0JBQXlCLEdB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TUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN0RCxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTCx3Q0FBQztBQUFELENBQUMsQUE1UEQsQ0FBdUQsS0FBSyxDQUFDLHFCQUFxQixHQTRQakY7QUE1UFksaUNBQWlDO0lBRDdDLEtBQUssQ0FBQyxFQUFFLENBQUMsVUFBVTs2Q0FJRyxLQUFLLENBQUMsY0FBYyxFQUNyQixLQUFLLENBQUMsYUFBYSxFQUNsQixLQUFLLENBQUMsY0FBYyxFQUN2QixLQUFLLENBQUMsV0FBVyxFQUNMLEtBQUssQ0FBQyxzQkFBc0IsRUFDdkIsS0FBSyxDQUFDLG9CQUFvQixFQUN4QyxLQUFLLENBQUMsY0FBYztHQVQ5QixpQ0FBaUMsQ0E0UDdDO0FBNVBZLDhFQUFpQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gXCJhcHBsaWNhdGlvblwiO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0ICogYXMgZ2VvbG9jYXRpb24gZnJvbSAnc3BlaWdnLW5hdGl2ZXNjcmlwdC1nZW9sb2NhdGlvbic7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgZW51bXMgZnJvbSAndWkvZW51bXMnO1xuXG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGZyYW1lcyBmcm9tICd1aS9mcmFtZSc7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1wcm92aWRlcidcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gXCJAYXJnb25qcy9hcmdvblwiO1xuXG5pbXBvcnQge3NjcmVlbk9yaWVudGF0aW9ufSBmcm9tICcuL3V0aWwnXG5cbmNvbnN0IENhcnRlc2lhbjMgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbmNvbnN0IFF1YXRlcm5pb24gPSBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcbmNvbnN0IENlc2l1bU1hdGggPSBBcmdvbi5DZXNpdW0uQ2VzaXVtTWF0aDtcbmNvbnN0IE1hdHJpeDQgICAgPSBBcmdvbi5DZXNpdW0uTWF0cml4NDtcblxuY29uc3QgejkwID0gUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCBDZXNpdW1NYXRoLlBJX09WRVJfVFdPKTtcbmNvbnN0IE9ORSA9IG5ldyBDYXJ0ZXNpYW4zKDEsMSwxKTtcblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlIGV4dGVuZHMgQXJnb24uRGV2aWNlU2VydmljZSB7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSwgXG4gICAgICAgIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICB2dWZvcmlhU2VydmljZVByb3ZpZGVyOkFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpIHtcbiAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIGNvbnRleHRTZXJ2aWNlLCB2aWV3U2VydmljZSk7XG5cbiAgICAgICAgY29uc3QgdnNwID0gPE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI+dnVmb3JpYVNlcnZpY2VQcm92aWRlcjtcblxuICAgICAgICB2c3Auc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICBjb25zdCBub3cgPSBnbG9iYWwucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICAvLyBzd2FwIGNhbGxiYWNrIG1hcHNcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcztcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrczI7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MyID0gY2FsbGJhY2tzO1xuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9leGVjdXRlQ2FsbGJhY2soY2FsbGJhY2tzW2ldLCBub3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB2c3Auc3RhdGVVcGRhdGVFdmVudC5yYWlzZUV2ZW50KEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlLm5vdygpKSwgMzQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZUNhbGxiYWNrID0gKGNiOkZ1bmN0aW9uLCBub3c6bnVtYmVyKSA9PiB7XG4gICAgICAgIGNiKG5vdyk7XG4gICAgfTtcblxuICAgIHByaXZhdGUgX2FwcGxpY2F0aW9uID0gYXBwbGljYXRpb247XG4gICAgcHJpdmF0ZSBfc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvbiA9IG5ldyBRdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfaWQgPSAwO1xuICAgIHByaXZhdGUgX2NhbGxiYWNrczp7W2lkOm51bWJlcl06RnVuY3Rpb259ID0ge307XG4gICAgcHJpdmF0ZSBfY2FsbGJhY2tzMjp7W2lkOm51bWJlcl06RnVuY3Rpb259ID0ge307XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSAoY2I6KHRpbWVzdGFtcDpudW1iZXIpPT52b2lkKSA9PiB7XG4gICAgICAgIHRoaXMuX2lkKys7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrc1t0aGlzLl9pZF0gPSBjYjtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKGlkOm51bWJlcikgPT4ge1xuICAgICAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2lkXTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2NyZWVuT3JpZW50YXRpb25EZWdyZWVzKCkge1xuICAgICAgICByZXR1cm4gc2NyZWVuT3JpZW50YXRpb247XG4gICAgfVxuICAgIFxuICAgIG9uVXBkYXRlRnJhbWVTdGF0ZSgpIHtcblxuICAgICAgICBjb25zdCB2aWV3cG9ydCA9IHRoaXMuZGV2aWNlU3RhdGUudmlld3BvcnQgPSB0aGlzLmRldmljZVN0YXRlLnZpZXdwb3J0IHx8IDxBcmdvbi5WaWV3cG9ydD57fTtcbiAgICAgICAgY29uc3QgY29udGVudFZpZXcgPSBmcmFtZXMudG9wbW9zdCgpLmN1cnJlbnRQYWdlLmNvbnRlbnQ7XG4gICAgICAgIHZpZXdwb3J0LnggPSAwO1xuICAgICAgICB2aWV3cG9ydC55ID0gMDtcbiAgICAgICAgdmlld3BvcnQud2lkdGggPSBjb250ZW50Vmlldy5nZXRNZWFzdXJlZFdpZHRoKCk7XG4gICAgICAgIHZpZXdwb3J0LmhlaWdodCA9IGNvbnRlbnRWaWV3LmdldE1lYXN1cmVkSGVpZ2h0KCk7XG5cbiAgICAgICAgc3VwZXIub25VcGRhdGVGcmFtZVN0YXRlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2FwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IHRoaXMuX2dldE1vdGlvbk1hbmFnZXJJT1MoKTtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbiA9IG1vdGlvbk1hbmFnZXIgJiYgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb247XG5cbiAgICAgICAgICAgIGlmIChtb3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb3Rpb25RdWF0ZXJuaW9uID0gPEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uPm1vdGlvbi5hdHRpdHVkZS5xdWF0ZXJuaW9uO1xuXG4gICAgICAgICAgICAgICAgLy8gQXBwbGUncyBvcmllbnRhdGlvbiBpcyByZXBvcnRlZCBpbiBOV1UsIHNvIHdlIGNvbnZlcnQgdG8gRU5VIGJ5IGFwcGx5aW5nIGEgZ2xvYmFsIHJvdGF0aW9uIG9mXG4gICAgICAgICAgICAgICAgLy8gOTAgZGVncmVlcyBhYm91dCAreiB0byB0aGUgTldVIG9yaWVudGF0aW9uIChvciBhcHBseWluZyB0aGUgTldVIHF1YXRlcm5pb24gYXMgYSBsb2NhbCByb3RhdGlvbiBcbiAgICAgICAgICAgICAgICAvLyB0byB0aGUgc3RhcnRpbmcgb3JpZW50YXRpb24gb2YgOTAgZGVncmVzcyBhYm91dCAreikuIFxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IFdpdGggcXVhdGVybmlvbiBtdWx0aXBsaWNhdGlvbiB0aGUgYCpgIHN5bWJvbCBjYW4gYmUgcmVhZCBhcyAncm90YXRlcycuIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvcmllbnRhdGlvbiAoTykgaXMgb24gdGhlIHJpZ2h0IGFuZCB0aGUgcm90YXRpb24gKFIpIGlzIG9uIHRoZSBsZWZ0LCBcbiAgICAgICAgICAgICAgICAvLyBzdWNoIHRoYXQgdGhlIG11bHRpcGxpY2F0aW9uIG9yZGVyIGlzIFIqTywgdGhlbiBSIGlzIGEgZ2xvYmFsIHJvdGF0aW9uIGJlaW5nIGFwcGxpZWQgb24gTy4gXG4gICAgICAgICAgICAgICAgLy8gTGlrZXdpc2UsIHRoZSByZXZlcnNlLCBPKlIsIGlzIGEgbG9jYWwgcm90YXRpb24gUiBhcHBsaWVkIHRvIHRoZSBvcmllbnRhdGlvbiBPLiBcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VPcmllbnRhdGlvbiA9IFF1YXRlcm5pb24ubXVsdGlwbHkoejkwLCBtb3Rpb25RdWF0ZXJuaW9uLCB0aGlzLl9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzID0gdGhpcy5mcmFtZVN0YXRlLnNjcmVlbk9yaWVudGF0aW9uRGVncmVlcztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVVzZXIgPSB0aGlzLnVzZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlU3RhZ2UgPSB0aGlzLnN0YWdlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLnBvc2l0aW9uKSBkZXZpY2VVc2VyLnBvc2l0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRldmljZVVzZXIub3JpZW50YXRpb24pIGRldmljZVVzZXIub3JpZW50YXRpb24gPSBuZXcgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgICAgIChkZXZpY2VVc2VyLnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkpLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLmZyb21FbGVtZW50cygwLDAsdGhpcy5kZXZpY2VTdGF0ZS5zdWdnZXN0ZWRVc2VySGVpZ2h0LCB0aGlzLl9zY3JhdGNoQ2FydGVzaWFuKSxcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlU3RhZ2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5VTklUX1osIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb25EZWdyZWVzICogQ2VzaXVtTWF0aC5SQURJQU5TX1BFUl9ERUdSRUUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERpc3BsYXlPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbiA9IFxuICAgICAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLm11bHRpcGx5KFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyZWVuT3JpZW50YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaERldmljZU9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUoc2NyZWVuQmFzZWREZXZpY2VPcmllbnRhdGlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgbG9jYXRpb25NYW5hZ2VyID0gdGhpcy5fZ2V0TG9jYXRpb25NYW5hZ2VySU9TKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGluZyA9IGxvY2F0aW9uTWFuYWdlci5oZWFkaW5nO1xuICAgICAgICAgICAgICAgIGRldmljZVVzZXJbJ21ldGEnXSA9IGRldmljZVVzZXJbJ21ldGEnXSB8fCB7fTtcbiAgICAgICAgICAgICAgICBkZXZpY2VVc2VyWydtZXRhJ10uZ2VvSGVhZGluZ0FjY3VyYWN5ID0gaGVhZGluZyAmJiBoZWFkaW5nLmhlYWRpbmdBY2N1cmFjeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX21vdGlvbk1hbmFnZXJJT1M/OkNNTW90aW9uTWFuYWdlcjtcblxuICAgIHByaXZhdGUgX2dldE1vdGlvbk1hbmFnZXJJT1MoKSA6IENNTW90aW9uTWFuYWdlcnx1bmRlZmluZWQge1xuICAgICAgICBpZiAodGhpcy5fbW90aW9uTWFuYWdlcklPUykgcmV0dXJuIHRoaXMuX21vdGlvbk1hbmFnZXJJT1M7XG5cbiAgICAgICAgY29uc3QgbW90aW9uTWFuYWdlciA9IENNTW90aW9uTWFuYWdlci5hbGxvYygpLmluaXQoKTtcbiAgICAgICAgbW90aW9uTWFuYWdlci5zaG93c0RldmljZU1vdmVtZW50RGlzcGxheSA9IHRydWVcbiAgICAgICAgbW90aW9uTWFuYWdlci5kZXZpY2VNb3Rpb25VcGRhdGVJbnRlcnZhbCA9IDEuMCAvIDEwMC4wO1xuICAgICAgICBpZiAoIW1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uQXZhaWxhYmxlIHx8ICFtb3Rpb25NYW5hZ2VyLm1hZ25ldG9tZXRlckF2YWlsYWJsZSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJOTyBNYWduZXRvbWV0ZXIgYW5kL29yIEd5cm8uIFwiICk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lOkNNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZTtcbiAgICAgICAgICAgIGlmIChDTU1vdGlvbk1hbmFnZXIuYXZhaWxhYmxlQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZXMoKSAmIENNQXR0aXR1ZGVSZWZlcmVuY2VGcmFtZS5YVHJ1ZU5vcnRoWlZlcnRpY2FsKSB7XG4gICAgICAgICAgICAgICAgZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWUgPSBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWUuWFRydWVOb3J0aFpWZXJ0aWNhbDtcbiAgICAgICAgICAgICAgICBtb3Rpb25NYW5hZ2VyLnN0YXJ0RGV2aWNlTW90aW9uVXBkYXRlc1VzaW5nUmVmZXJlbmNlRnJhbWUoZWZmZWN0aXZlUmVmZXJlbmNlRnJhbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk5PICBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWVYVHJ1ZU5vcnRoWlZlcnRpY2FsXCIgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21vdGlvbk1hbmFnZXJJT1MgPSBtb3Rpb25NYW5hZ2VyO1xuICAgICAgICByZXR1cm4gbW90aW9uTWFuYWdlcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9sb2NhdGlvbk1hbmFnZXJJT1M/OkNMTG9jYXRpb25NYW5hZ2VyO1xuXG4gICAgcHJpdmF0ZSBfZ2V0TG9jYXRpb25NYW5hZ2VySU9TKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUykge1xuICAgICAgICAgICAgdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TID0gQ0xMb2NhdGlvbk1hbmFnZXIuYWxsb2MoKS5pbml0KCk7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoQ0xMb2NhdGlvbk1hbmFnZXIuYXV0aG9yaXphdGlvblN0YXR1cygpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0F1dGhvcml6ZWRXaGVuSW5Vc2U6XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c0F1dGhvcml6ZWRBbHdheXM6IFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzTm90RGV0ZXJtaW5lZDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TLnJlcXVlc3RXaGVuSW5Vc2VBdXRob3JpemF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNEZW5pZWQ6XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c1Jlc3RyaWN0ZWQ6XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiTG9jYXRpb24gU2VydmljZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBJbiBvcmRlciB0byBwcm92aWRlIHRoZSBiZXN0IEF1Z21lbnRlZCBSZWFsaXR5IGV4cGVyaWVuY2UsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsZWFzZSBvcGVuIHRoaXMgYXBwJ3Mgc2V0dGluZ3MgYW5kIGVuYWJsZSBsb2NhdGlvbiBzZXJ2aWNlc2AsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkNhbmNlbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydTZXR0aW5ncyddXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oKGFjdGlvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdTZXR0aW5ncycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBOU1VSTC5VUkxXaXRoU3RyaW5nKFVJQXBwbGljYXRpb25PcGVuU2V0dGluZ3NVUkxTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikub3BlblVSTCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1M7XG4gICAgfVxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2VQcm92aWRlciBleHRlbmRzIEFyZ29uLkRldmljZVNlcnZpY2VQcm92aWRlciB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGNvbnRhaW5lciwgXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlOkFyZ29uLlNlc3Npb25TZXJ2aWNlLCBcbiAgICAgICAgZGV2aWNlU2VydmljZTpBcmdvbi5EZXZpY2VTZXJ2aWNlLCBcbiAgICAgICAgY29udGV4dFNlcnZpY2U6QXJnb24uQ29udGV4dFNlcnZpY2UsIFxuICAgICAgICB2aWV3U2VydmljZTpBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgY29udGV4dFNlcnZpY2VQcm92aWRlcmU6QXJnb24uQ29udGV4dFNlcnZpY2VQcm92aWRlcixcbiAgICAgICAgcHJpdmF0ZSBmb2N1c1NlcnZpY2VQcm92aWRlcjpBcmdvbi5Gb2N1c1NlcnZpY2VQcm92aWRlcixcbiAgICAgICAgcmVhbGl0eVNlcnZpY2U6QXJnb24uUmVhbGl0eVNlcnZpY2UpIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBzZXNzaW9uU2VydmljZSwgXG4gICAgICAgICAgICBkZXZpY2VTZXJ2aWNlLCBcbiAgICAgICAgICAgIGNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgICAgIHZpZXdTZXJ2aWNlLCAgICAgICAgIFxuICAgICAgICAgICAgY29udGV4dFNlcnZpY2VQcm92aWRlcmVcbiAgICAgICAgKTtcblxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hEZXZpY2VTdGF0ZSgpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaERldmljZVN0YXRlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9jYXRpb25XYXRjaElkPzpudW1iZXI7XG5cbiAgICAvLyBwcml2YXRlIF9zY3JhdGNoQ2FydGVzaWFuID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hQZXJzcGVjdGl2ZUZydXN0dW0gPSBuZXcgQXJnb24uQ2VzaXVtLlBlcnNwZWN0aXZlRnJ1c3R1bTtcblxuICAgIHByb3RlY3RlZCBvblVwZGF0ZURldmljZVN0YXRlKGRldmljZVN0YXRlOkFyZ29uLkRldmljZVN0YXRlKSB7XG5cbiAgICAgICAgaWYgKCFkZXZpY2VTdGF0ZS5pc1ByZXNlbnRpbmdITUQgfHwgIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS52aWV3cG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnN1YnZpZXdzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUuc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdWJ2aWV3cyA9IGRldmljZVN0YXRlLnN1YnZpZXdzID0gZGV2aWNlU3RhdGUuc3Vidmlld3MgfHwgW107XG5cbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbmRlcmluZ1ByaW1pdGl2ZXMgPSBkZXZpY2UuZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpO1xuICAgICAgICBjb25zdCByZW5kZXJpbmdWaWV3cyA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0UmVuZGVyaW5nVmlld3MoKTtcbiAgICAgICAgY29uc3QgbnVtVmlld3MgPSByZW5kZXJpbmdWaWV3cy5nZXROdW1WaWV3cygpO1xuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9ICg8VUlWaWV3PnZ1Zm9yaWEudmlkZW9WaWV3LmlvcykuY29udGVudFNjYWxlRmFjdG9yO1xuXG4gICAgICAgIHN1YnZpZXdzLmxlbmd0aCA9IG51bVZpZXdzO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVmlld3M7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IHJlbmRlcmluZ1ZpZXdzLmdldFZpZXcoaSk7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IHN1cHBvcnQgUG9zdFByb2Nlc3MgcmVuZGVyaW5nIHN1YnZpZXdcbiAgICAgICAgICAgIGlmICh2aWV3ID09PSB2dWZvcmlhLlZpZXcuUG9zdFByb2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBzdWJ2aWV3cy5sZW5ndGgtLTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3VidmlldyA9IHN1YnZpZXdzW2ldID0gc3Vidmlld3NbaV0gfHwgPEFyZ29uLlNlcmlhbGl6ZWRTdWJ2aWV3Pnt9O1xuXG4gICAgICAgICAgICAvLyBTZXQgc3VidmlldyB0eXBlXG4gICAgICAgICAgICBzd2l0Y2ggKHZpZXcpIHtcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5MZWZ0RXllOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5MRUZURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5SaWdodEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuUklHSFRFWUU7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LlNpbmd1bGFyOlxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3LnR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuT1RIRVI7IGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgc3VidmlldyB2aWV3cG9ydFxuICAgICAgICAgICAgY29uc3QgdnVmb3JpYVN1YnZpZXdWaWV3cG9ydCA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0Vmlld3BvcnQodmlldyk7XG4gICAgICAgICAgICBjb25zdCBzdWJ2aWV3Vmlld3BvcnQgPSBzdWJ2aWV3LnZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCB8fCA8QXJnb24uVmlld3BvcnQ+e307XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueCAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC55ID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC55IC8gY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LndpZHRoID0gdnVmb3JpYVN1YnZpZXdWaWV3cG9ydC56IC8gY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LmhlaWdodCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQudyAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcblxuICAgICAgICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgcHJvamVjdGlvbiBtYXRyaXggZm9yIHRoaXMgc3Vidmlld1xuICAgICAgICAgICAgLy8gTm90ZTogVnVmb3JpYSB1c2VzIGEgcmlnaHQtaGFuZGVkIHByb2plY3Rpb24gbWF0cml4IHdpdGggeCB0byB0aGUgcmlnaHQsIHkgZG93biwgYW5kIHogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLlxuICAgICAgICAgICAgLy8gU28gd2UgYXJlIGNvbnZlcnRpbmcgdG8gYSBtb3JlIHN0YW5kYXJkIGNvbnZlbnRpb24gb2YgeCB0byB0aGUgcmlnaHQsIHkgdXAsIGFuZCAteiBhcyB0aGUgdmlld2luZyBkaXJlY3Rpb24uIFxuICAgICAgICAgICAgbGV0IHByb2plY3Rpb25NYXRyaXggPSA8YW55PnJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3LCB2dWZvcmlhLkNvb3JkaW5hdGVTeXN0ZW1UeXBlLkNhbWVyYSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaXNGaW5pdGUocHJvamVjdGlvbk1hdHJpeFswXSkpIHtcblxuICAgICAgICAgICAgICAgIC8vIGlmIG91ciBwcm9qZWN0aW9uIG1hdHJpeCBpcyBnaXZpbmcgbnVsbCB2YWx1ZXMgdGhlbiB0aGVcbiAgICAgICAgICAgICAgICAvLyBzdXJmYWNlIGlzIG5vdCBwcm9wZXJseSBjb25maWd1cmVkIGZvciBzb21lIHJlYXNvbiwgc28gcmVzZXQgaXRcbiAgICAgICAgICAgICAgICAvLyAobm90IHN1cmUgd2h5IHRoaXMgaGFwcGVucywgYnV0IGl0IG9ubHkgc2VlbXMgdG8gaGFwcGVuIGFmdGVyIG9yIGJldHdlZW4gXG4gICAgICAgICAgICAgICAgLy8gdnVmb3JpYSBpbml0aWFsaXphdGlvbnMpXG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5hcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcy5mcmFtZS5zaXplLndpZHRoICogY29udGVudFNjYWxlRmFjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmZyYW1lLnNpemUuaGVpZ2h0ICogY29udGVudFNjYWxlRmFjdG9yXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZnJ1c3R1bSA9IHRoaXMuX3NjcmF0Y2hQZXJzcGVjdGl2ZUZydXN0dW07XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mb3YgPSBNYXRoLlBJLzI7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5uZWFyID0gMC4wMTtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmZhciA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uYXNwZWN0UmF0aW8gPSBzdWJ2aWV3Vmlld3BvcnQud2lkdGggLyBzdWJ2aWV3Vmlld3BvcnQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIGlmICghaXNGaW5pdGUoZnJ1c3R1bS5hc3BlY3RSYXRpbykgfHwgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9PT0gMCkgZnJ1c3R1bS5hc3BlY3RSYXRpbyA9IDE7XG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShmcnVzdHVtLnByb2plY3Rpb25NYXRyaXgsIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAvLyBVbmRvIHRoZSB2aWRlbyByb3RhdGlvbiBzaW5jZSB3ZSBhbHJlYWR5IGVuY29kZSB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGluIG91ciB2aWV3IHBvc2VcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiB0aGUgXCJiYXNlXCIgcm90YXRpb24gZm9yIHZ1Zm9yaWEncyB2aWRlbyAoYXQgbGVhc3Qgb24gaU9TKSBpcyB0aGUgbGFuZHNjYXBlIHJpZ2h0IG9yaWVudGF0aW9uLFxuICAgICAgICAgICAgICAgIC8vIHdoaWNoIGlzIHRoZSBvcmllbnRhdGlvbiB3aGVyZSB0aGUgZGV2aWNlIGlzIGhlbGQgaW4gbGFuZHNjYXBlIHdpdGggdGhlIGhvbWUgYnV0dG9uIG9uIHRoZSByaWdodC4gXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBcImJhc2VcIiB2aWRlbyByb3RhdGF0aW9uIGlzIC05MCBkZWcgYXJvdW5kICt6IGZyb20gdGhlIHBvcnRyYWl0IGludGVyZmFjZSBvcmllbnRhdGlvblxuICAgICAgICAgICAgICAgIC8vIFNvLCB3ZSB3YW50IHRvIHVuZG8gdGhpcyByb3RhdGlvbiB3aGljaCB2dWZvcmlhIGFwcGxpZXMgZm9yIHVzLiAgXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogY2FsY3VsYXRlIHRoaXMgbWF0cml4IG9ubHkgd2hlbiB3ZSBoYXZlIHRvICh3aGVuIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gY2hhbmdlcylcbiAgICAgICAgICAgICAgICBjb25zdCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCA9IE1hdHJpeDQuZnJvbVRyYW5zbGF0aW9uUXVhdGVybmlvblJvdGF0aW9uU2NhbGUoXG4gICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuWkVSTyxcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCAoQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyAtIHNjcmVlbk9yaWVudGF0aW9uICogTWF0aC5QSSAvIDE4MCksIHRoaXMuX3NjcmF0Y2hWaWRlb1F1YXRlcm5pb24pLFxuICAgICAgICAgICAgICAgICAgICBPTkUsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hNYXRyaXg0XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShwcm9qZWN0aW9uTWF0cml4LCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IGZyb20gdGhlIHZ1Zm9yaWEgcHJvamVjdGlvbiBtYXRyaXggKCtYIC1ZICtaKSB0byBhIG1vcmUgc3RhbmRhcmQgY29udmVudGlvbiAoK1ggK1kgLVopXG4gICAgICAgICAgICAgICAgLy8gYnkgbmVnYXRpbmcgdGhlIGFwcHJvcHJpYXRlIGNvbHVtbnMuIFxuICAgICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS9saWJyYXJ5L2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1Vc2UtdGhlLUNhbWVyYS1Qcm9qZWN0aW9uLU1hdHJpeFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMF0gKj0gLTE7IC8vIHhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IC0xOyAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbM10gKj0gLTE7IC8vIHdcblxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOF0gKj0gLTE7ICAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs5XSAqPSAtMTsgIC8vIHlcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzEwXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMTFdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICAvLyBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseUJ5U2NhbGUocHJvamVjdGlvbk1hdHJpeCwgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMSwtMSwtMSwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksIHByb2plY3Rpb25NYXRyaXgpXG5cbiAgICAgICAgICAgICAgICAvLyBTY2FsZSB0aGUgcHJvamVjdGlvbiBtYXRyaXggdG8gZml0IG5pY2VseSB3aXRoaW4gYSBzdWJ2aWV3IG9mIHR5cGUgU0lOR1VMQVJcbiAgICAgICAgICAgICAgICAvLyAoVGhpcyBzY2FsZSB3aWxsIG5vdCBhcHBseSB3aGVuIHRoZSB1c2VyIGlzIHdlYXJpbmcgYSBtb25vY3VsYXIgSE1ELCBzaW5jZSBhXG4gICAgICAgICAgICAgICAgLy8gbW9ub2N1bGFyIEhNRCB3b3VsZCBwcm92aWRlIGEgc3VidmlldyBvZiB0eXBlIExFRlRFWUUgb3IgUklHSFRFWUUpXG4gICAgICAgICAgICAgICAgLy8gaWYgKHN1YnZpZXcudHlwZSA9PSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUikge1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCB3aWR0aFJhdGlvID0gc3Vidmlld1dpZHRoIC8gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IHN1YnZpZXdIZWlnaHQgLyB2aWRlb01vZGUuaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGFzcGVjdCBmaWxsXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5tYXgod2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBvciBhc3BlY3QgZml0XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5taW4od2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHgtYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHktYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzRdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs2XSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzddICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShwcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIGNvbnN0IGV5ZUFkanVzdG1lbnRNYXRyaXggPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXcpO1xuICAgICAgICAgICAgLy8gbGV0IHByb2plY3Rpb25NYXRyaXggPSBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShyYXdQcm9qZWN0aW9uTWF0cml4LCBleWVBZGp1c3RtZW50TWF0cml4LCBbXSk7XG4gICAgICAgICAgICAvLyBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQuZnJvbVJvd01ham9yQXJyYXkocHJvamVjdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gaWRlbnRpdHkgc3VidmlldyBwb3NlIChpbiByZWxhdGlvbiB0byB0aGUgb3ZlcmFsbCB2aWV3IHBvc2UpXG4gICAgICAgICAgICAvLyBUT0RPOiB1c2UgZXllIGFkanVzdG1lbnQgbWF0cml4IHRvIGdldCBzdWJ2aWV3IHBvc2VzIChmb3IgZXllIHNlcGFyYXRpb24pLiBTZWUgY29tbWVudGVkIG91dCBjb2RlIGFib3ZlLi4uXG4gICAgICAgICAgICBzdWJ2aWV3LnBvc2UgPSB1bmRlZmluZWQ7IFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIG9uU3RhcnRHZW9sb2NhdGlvblVwZGF0ZXMob3B0aW9uczpBcmdvbi5HZW9sb2NhdGlvbk9wdGlvbnMpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5sb2NhdGlvbldhdGNoSWQgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpPT57XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBkLnRzIGZvciBuYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24gaXMgd3JvbmcuIFRoaXMgY2FsbCBpcyBjb3JyZWN0LiBcbiAgICAgICAgICAgIC8vIENhc3RpbmcgdGhlIG1vZHVsZSBhcyA8YW55PiBoZXJlIGZvciBub3cgdG8gaGlkZSBhbm5veWluZyB0eXBlc2NyaXB0IGVycm9ycy4uLlxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSAoPGFueT5nZW9sb2NhdGlvbikud2F0Y2hMb2NhdGlvbigobG9jYXRpb246Z2VvbG9jYXRpb24uTG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgLy8gTm90ZTogaU9TIGRvY3VtZW50YXRpb24gc3RhdGVzIHRoYXQgdGhlIGFsdGl0dWRlIHZhbHVlIHJlZmVycyB0byBoZWlnaHQgKG1ldGVycykgYWJvdmUgc2VhIGxldmVsLCBidXQgXG4gICAgICAgICAgICAgICAgLy8gaWYgaW9zIGlzIHJlcG9ydGluZyB0aGUgc3RhbmRhcmQgZ3BzIGRlZmluZWQgYWx0aXR1ZGUsIHRoZW4gdGhpcyB0aGVvcmV0aWNhbCBcInNlYSBsZXZlbFwiIGFjdHVhbGx5IHJlZmVycyB0byBcbiAgICAgICAgICAgICAgICAvLyB0aGUgV0dTODQgZWxsaXBzb2lkIHJhdGhlciB0aGFuIHRyYWRpdGlvbmFsIG1lYW4gc2VhIGxldmVsIChNU0wpIHdoaWNoIGlzIG5vdCBhIHNpbXBsZSBzdXJmYWNlIGFuZCB2YXJpZXMgXG4gICAgICAgICAgICAgICAgLy8gYWNjb3JkaW5nIHRvIHRoZSBsb2NhbCBncmF2aXRhdGlvbmFsIGZpZWxkLiBcbiAgICAgICAgICAgICAgICAvLyBJbiBvdGhlciB3b3JkcywgbXkgYmVzdCBndWVzcyBpcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSBoZXJlIGlzICpwcm9iYWJseSogR1BTIGRlZmluZWQgYWx0aXR1ZGUsIHdoaWNoIFxuICAgICAgICAgICAgICAgIC8vIGlzIGVxdWl2YWxlbnQgdG8gdGhlIGhlaWdodCBhYm92ZSB0aGUgV0dTODQgZWxsaXBzb2lkLCB3aGljaCBpcyBleGFjdGx5IHdoYXQgQ2VzaXVtIGV4cGVjdHMuLi5cbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyZVN0YWdlKFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sb25naXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sYXRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmFsdGl0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uaG9yaXpvbnRhbEFjY3VyYWN5LCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24udmVydGljYWxBY2N1cmFjeVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIChlKT0+e1xuICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgIH0sIDxnZW9sb2NhdGlvbi5PcHRpb25zPntcbiAgICAgICAgICAgICAgICBkZXNpcmVkQWNjdXJhY3k6IG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVIaWdoQWNjdXJhY3kgPyBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5QmVzdCA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuaGlnaCA6IFxuICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi5pb3MgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGtDTExvY2F0aW9uQWNjdXJhY3lLaWxvbWV0ZXIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuYW55LFxuICAgICAgICAgICAgICAgIHVwZGF0ZURpc3RhbmNlOiBhcHBsaWNhdGlvbi5pb3MgPyBrQ0xEaXN0YW5jZUZpbHRlck5vbmUgOiAwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBsb2NhdGlvbiB3YXRjaGVyLiBcIiArIHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgXG4gICAgcHJvdGVjdGVkIG9uU3RvcEdlb2xvY2F0aW9uVXBkYXRlcygpIDogdm9pZCB7XG4gICAgICAgIGlmIChBcmdvbi5DZXNpdW0uZGVmaW5lZCh0aGlzLmxvY2F0aW9uV2F0Y2hJZCkpIHtcbiAgICAgICAgICAgIGdlb2xvY2F0aW9uLmNsZWFyV2F0Y2godGhpcy5sb2NhdGlvbldhdGNoSWQpO1xuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoTWF0cml4NCA9IG5ldyBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbiAgICBwcml2YXRlIF9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uID0gbmV3IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGlmICh0aGlzLmZvY3VzU2VydmljZVByb3ZpZGVyLnNlc3Npb24gPT0gc2Vzc2lvbikgcmV0dXJuOyBcbiAgICAgICAgaWYgKHNlc3Npb24gPT0gdGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKSByZXR1cm47XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vzc2lvbiBkb2VzIG5vdCBoYXZlIGZvY3VzLicpXG4gICAgfVxuICAgIFxuICAgIGhhbmRsZVJlcXVlc3RQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKHRydWUpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgaGFuZGxlRXhpdFByZXNlbnRITUQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICB0aGlzLl9lbnN1cmVQZXJtaXNzaW9uKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgZGV2aWNlICYmIGRldmljZS5zZXRWaWV3ZXJBY3RpdmUoZmFsc2UpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcHVibGljIF9pc0htZEFjdGl2ZSgpIHtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIHJldHVybiBkZXZpY2UuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG5cbn0iXX0=