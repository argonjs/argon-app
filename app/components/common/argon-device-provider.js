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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tZGV2aWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tZGV2aWNlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTJDO0FBQzNDLG1DQUFxQztBQUNyQyw2REFBK0Q7QUFDL0Qsb0NBQXNDO0FBQ3RDLGdDQUFrQztBQUVsQyw4Q0FBZ0Q7QUFDaEQsaUNBQW1DO0FBRW5DLHNDQUF3QztBQUV4QywrQkFBMkM7QUFFM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDM0MsSUFBTSxPQUFPLEdBQU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFeEMsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBR2xDLElBQWEseUJBQXlCO0lBQVMsNkNBQW1CO0lBRTlELG1DQUNJLGNBQW1DLEVBQ25DLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLHNCQUFtRDtRQUp2RCxZQUtJLGtCQUFNLGNBQWMsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLFNBc0JyRDtRQUVPLGtCQUFZLEdBQUcsV0FBVyxDQUFDO1FBQzNCLGdDQUEwQixHQUFHLElBQUksVUFBVSxDQUFDO1FBQzVDLCtCQUF5QixHQUFHLElBQUksVUFBVSxDQUFDO1FBRTNDLFNBQUcsR0FBRyxDQUFDLENBQUM7UUFDUixnQkFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQ3pDLGlCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFFbEQsMkJBQXFCLEdBQUcsVUFBQyxFQUEyQjtZQUNoRCxLQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDWCxLQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxLQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3BCLENBQUMsQ0FBQTtRQUVELDBCQUFvQixHQUFHLFVBQUMsRUFBUztZQUM3QixLQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUE7UUF0Q0csSUFBTSxHQUFHLEdBQXVDLHNCQUFzQixDQUFDO1FBQ3ZFLElBQUksR0FBVSxDQUFDO1FBRWYsSUFBTSxlQUFlLEdBQUcsVUFBQyxFQUFFLEVBQUUsRUFBRTtZQUMzQixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUM7UUFFRixHQUFHLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDbEMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDL0IscUJBQXFCO1lBQ3JCLElBQU0sU0FBUyxHQUFHLEtBQUksQ0FBQyxVQUFVLENBQUM7WUFDbEMsS0FBSSxDQUFDLFVBQVUsR0FBRyxLQUFJLENBQUMsV0FBVyxDQUFDO1lBQ25DLEtBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDO1lBQzdCLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbkMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNmLFdBQVcsQ0FBQyxjQUFNLE9BQUEsR0FBRyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUE5RCxDQUE4RCxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLENBQUM7O0lBQ0wsQ0FBQztJQW9CRCwrREFBMkIsR0FBM0I7UUFDSSxNQUFNLENBQUMsMkJBQW9CLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQsc0RBQWtCLEdBQWxCO1FBRUksSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLElBQW9CLEVBQUUsQ0FBQztRQUM3RixJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUN6RCxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNmLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsUUFBUSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoRCxRQUFRLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBRWxELGlCQUFNLGtCQUFrQixXQUFFLENBQUM7UUFFM0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2xELElBQU0sTUFBTSxHQUFHLGFBQWEsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDO1lBRTNELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ1QsSUFBTSxnQkFBZ0IsR0FBNEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7Z0JBRTdFLGdHQUFnRztnQkFDaEcsa0dBQWtHO2dCQUNsRyx3REFBd0Q7Z0JBQ3hELGlGQUFpRjtnQkFDakYsK0VBQStFO2dCQUMvRSw4RkFBOEY7Z0JBQzlGLG1GQUFtRjtnQkFDbkYsSUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztnQkFFckcsSUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDO2dCQUUxRSxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUM3QixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUUvQixFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7b0JBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztnQkFDNUYsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO29CQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBRXpGLFVBQVUsQ0FBQyxRQUFrRCxDQUFDLFFBQVEsQ0FDbkUsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQ3pGLFdBQVcsQ0FDZCxDQUFDO2dCQUVGLElBQU0saUJBQWlCLEdBQ25CLFVBQVUsQ0FBQyxhQUFhLENBQ3BCLFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLHdCQUF3QixHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsRUFDeEQsSUFBSSxDQUFDLDBCQUEwQixDQUNsQyxDQUFDO2dCQUVOLElBQU0sNEJBQTRCLEdBQzlCLFVBQVUsQ0FBQyxRQUFRLENBQ2YsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixJQUFJLENBQUMseUJBQXlCLENBQ2pDLENBQUM7Z0JBRUwsVUFBVSxDQUFDLFdBQTZDLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLENBQUM7Z0JBRWpHLElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUN0RCxJQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO2dCQUN4QyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDOUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGtCQUFrQixHQUFHLE9BQU8sSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQy9FLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUlPLHdEQUFvQixHQUE1QjtRQUNJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFFMUQsSUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JELGFBQWEsQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUE7UUFDL0MsYUFBYSxDQUFDLDBCQUEwQixHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUM7UUFDdkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMscUJBQXFCLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQy9FLGlEQUFpRDtZQUNqRCxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ3JCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLElBQUksdUJBQXVCLFNBQXlCLENBQUM7WUFDckQsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsMkJBQTRDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRyx1QkFBdUIsR0FBRywyQkFBNEMsQ0FBQztnQkFDdkUsYUFBYSxDQUFDLDJDQUEyQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDdkYsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLG1FQUFtRTtnQkFDbkUsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUNyQixDQUFDO1FBQ0wsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxhQUFhLENBQUM7UUFDdkMsTUFBTSxDQUFDLGFBQWEsQ0FBQztJQUN6QixDQUFDO0lBSU8sMERBQXNCLEdBQTlCO1FBQ0ksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQzVCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU1RCxNQUFNLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDOUMsS0FBSyxpREFBK0QsQ0FBQztnQkFDckUsS0FBSyw4Q0FBNEQ7b0JBQzdELEtBQUssQ0FBQztnQkFDVixLQUFLLDJDQUF5RDtvQkFDMUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLDZCQUE2QixFQUFFLENBQUM7b0JBQ3pELEtBQUssQ0FBQztnQkFDVixLQUFLLG9DQUFrRCxDQUFDO2dCQUN4RCxLQUFLLHdDQUFzRCxDQUFDO2dCQUM1RDtvQkFDSSxPQUFPLENBQUMsTUFBTSxDQUFDO3dCQUNYLEtBQUssRUFBRSxtQkFBbUI7d0JBQzFCLE9BQU8sRUFBRSx1SkFDd0Q7d0JBQ2pFLGdCQUFnQixFQUFFLFFBQVE7d0JBQzFCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQztxQkFDeEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07d0JBQ1gsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7NEJBQ3hCLElBQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsa0NBQWtDLENBQUMsQ0FBQzs0QkFDcEUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDbEYsQ0FBQztvQkFDTCxDQUFDLENBQUMsQ0FBQTtZQUNWLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNwQyxDQUFDO0lBQ0wsZ0NBQUM7QUFBRCxDQUFDLEFBOUtELENBQStDLEtBQUssQ0FBQyxhQUFhLEdBOEtqRTtBQTlLWSx5QkFBeUI7SUFEckMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxVQUFVO3FDQUlHLEtBQUssQ0FBQyxjQUFjLEVBQ3BCLEtBQUssQ0FBQyxjQUFjLEVBQ3ZCLEtBQUssQ0FBQyxXQUFXLEVBQ04sS0FBSyxDQUFDLHNCQUFzQjtHQU45Qyx5QkFBeUIsQ0E4S3JDO0FBOUtZLDhEQUF5QjtBQWlMdEMsSUFBYSxpQ0FBaUM7SUFBUyxxREFBMkI7SUFDOUUsMkNBQ0ksU0FBUyxFQUNULGNBQW1DLEVBQ25DLGFBQWlDLEVBQ2pDLGNBQW1DLEVBQ25DLFdBQTZCLEVBQzdCLHVCQUFvRCxFQUM1QyxvQkFBK0MsRUFDdkQsY0FBbUM7UUFSdkMsWUFTSSxrQkFDSSxjQUFjLEVBQ2QsYUFBYSxFQUNiLGNBQWMsRUFDZCxXQUFXLEVBQ1gsdUJBQXVCLENBQzFCLFNBUUo7UUFoQlcsMEJBQW9CLEdBQXBCLG9CQUFvQixDQUEyQjtRQW9CM0QsMkRBQTJEO1FBQ25ELGdDQUEwQixHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQztRQW1NakUscUJBQWUsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQzNDLDZCQUF1QixHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7UUEvTTFELFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFO1lBQ2hELFVBQVUsQ0FBQztnQkFDUCxLQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM5QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDUixLQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQzs7SUFDUCxDQUFDO0lBT1MsK0RBQW1CLEdBQTdCLFVBQThCLFdBQTZCO1FBRXZELEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGVBQWUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9DLFdBQVcsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQ2pDLFdBQVcsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQ2pDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQzNCLE1BQU0sQ0FBQztRQUNYLENBQUM7UUFFRCxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO1FBRW5FLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkMsSUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM1RCxJQUFNLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQy9ELElBQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUU5QyxJQUFNLGtCQUFrQixHQUFZLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBSSxDQUFDLGtCQUFrQixDQUFDO1FBRTlFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO1FBRTNCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEMsSUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV2Qyw4Q0FBOEM7WUFDOUMsRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDcEMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixRQUFRLENBQUM7WUFDYixDQUFDO1lBRUQsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBNkIsRUFBRSxDQUFDO1lBRXpFLG1CQUFtQjtZQUNuQixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNYLEtBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPO29CQUNyQixPQUFPLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO29CQUFDLEtBQUssQ0FBQztnQkFDcEQsS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVE7b0JBQ3RCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7b0JBQUMsS0FBSyxDQUFDO2dCQUNyRCxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUTtvQkFDdEIsT0FBTyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztvQkFBQyxLQUFLLENBQUM7Z0JBQ3JEO29CQUNJLE9BQU8sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQUMsS0FBSyxDQUFDO1lBQ3RELENBQUM7WUFFRCwwQkFBMEI7WUFDMUIsSUFBTSxzQkFBc0IsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckUsSUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxJQUFvQixFQUFFLENBQUM7WUFDbEYsZUFBZSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFDbEUsZUFBZSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFDbEUsZUFBZSxDQUFDLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFDdEUsZUFBZSxDQUFDLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7WUFFdkUsb0RBQW9EO1lBQ3BELG1IQUFtSDtZQUNuSCxnSEFBZ0g7WUFDaEgsSUFBSSxnQkFBZ0IsR0FBUSxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRS9HLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVqQywwREFBMEQ7Z0JBQzFELGtFQUFrRTtnQkFDbEUsNEVBQTRFO2dCQUM1RSwyQkFBMkI7Z0JBQzNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQ3hCLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLGtCQUFrQixFQUMzRCxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FDL0QsQ0FBQztnQkFDTixDQUFDO2dCQUVELElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQztnQkFDaEQsT0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQztnQkFDeEIsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDO2dCQUNwQixPQUFPLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQztnQkFDckUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDO29CQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO2dCQUN6RixPQUFPLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFakcsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUVKLDZGQUE2RjtnQkFDN0Ysc0dBQXNHO2dCQUN0RyxxR0FBcUc7Z0JBQ3JHLDRGQUE0RjtnQkFDNUYsb0VBQW9FO2dCQUNwRSw0RkFBNEY7Z0JBQzVGLElBQU0sMEJBQTBCLEdBQUcsT0FBTyxDQUFDLHNDQUFzQyxDQUM3RSxVQUFVLENBQUMsSUFBSSxFQUNmLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsMkJBQW9CLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUM1SSxHQUFHLEVBQ0gsSUFBSSxDQUFDLGVBQWUsQ0FDdkIsQ0FBQztnQkFDRixLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsMEJBQTBCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztnQkFFOUYsaUdBQWlHO2dCQUNqRyx3Q0FBd0M7Z0JBQ3hDLHNHQUFzRztnQkFDdEcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUMvQixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7Z0JBQy9CLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtnQkFDL0IsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUUvQixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFFLElBQUk7Z0JBQ2hDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUUsSUFBSTtnQkFDaEMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUNoQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7Z0JBRWhDLHFJQUFxSTtnQkFFckksOEVBQThFO2dCQUM5RSwrRUFBK0U7Z0JBQy9FLHFFQUFxRTtnQkFDckUsb0RBQW9EO2dCQUNwRCx5REFBeUQ7Z0JBQ3pELDREQUE0RDtnQkFFNUQscUJBQXFCO2dCQUNyQiw2REFBNkQ7Z0JBQzdELHVCQUF1QjtnQkFDdkIsZ0VBQWdFO2dCQUVoRSxzQkFBc0I7Z0JBQ3RCLCtDQUErQztnQkFDL0MsK0NBQStDO2dCQUMvQywrQ0FBK0M7Z0JBQy9DLCtDQUErQztnQkFDL0Msc0JBQXNCO2dCQUN0QiwrQ0FBK0M7Z0JBQy9DLCtDQUErQztnQkFDL0MsK0NBQStDO2dCQUMvQywrQ0FBK0M7Z0JBQy9DLElBQUk7Z0JBRUosT0FBTyxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDekYsQ0FBQztZQUdELHVGQUF1RjtZQUN2RixzR0FBc0c7WUFDdEcsaUdBQWlHO1lBRWpHLDBFQUEwRTtZQUMxRSw2R0FBNkc7WUFDN0csT0FBTyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7UUFDN0IsQ0FBQztJQUNMLENBQUM7SUFFUyxxRUFBeUIsR0FBbkMsVUFBb0MsT0FBZ0M7UUFBcEUsaUJBcUNDO1FBcENHLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsS0FBSyxXQUFXLENBQUM7WUFBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQUEsQ0FBQztRQUUzRSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUVyQywrRUFBK0U7WUFDL0UsaUZBQWlGO1lBQ2pGLEtBQUksQ0FBQyxlQUFlLEdBQVMsV0FBWSxDQUFDLGFBQWEsQ0FBQyxVQUFDLFFBQTZCO2dCQUNsRix5R0FBeUc7Z0JBQ3pHLCtHQUErRztnQkFDL0csNkdBQTZHO2dCQUM3RywrQ0FBK0M7Z0JBQy9DLDJHQUEyRztnQkFDM0csaUdBQWlHO2dCQUNqRyxLQUFJLENBQUMsY0FBYyxDQUNmLFFBQVEsQ0FBQyxTQUFTLEVBQ2xCLFFBQVEsQ0FBQyxRQUFRLEVBQ2pCLFFBQVEsQ0FBQyxRQUFRLEVBQ2pCLFFBQVEsQ0FBQyxrQkFBa0IsRUFDM0IsUUFBUSxDQUFDLGdCQUFnQixDQUM1QixDQUFDO1lBQ04sQ0FBQyxFQUNELFVBQUMsQ0FBQztnQkFDRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDZCxDQUFDLEVBQXVCO2dCQUNwQixlQUFlLEVBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0I7b0JBQ2xELFdBQVcsQ0FBQyxHQUFHO3dCQUNYLHVCQUF1Qjt3QkFDdkIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJO29CQUN2QixXQUFXLENBQUMsR0FBRzt3QkFDWCw0QkFBNEI7d0JBQzVCLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRztnQkFDMUIsY0FBYyxFQUFFLFdBQVcsQ0FBQyxHQUFHLEdBQUcscUJBQXFCLEdBQUcsQ0FBQzthQUM5RCxDQUFDLENBQUM7WUFFSCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixHQUFHLEtBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN0RSxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFHUyxvRUFBd0IsR0FBbEM7UUFDSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1FBQ3JDLENBQUM7SUFDTCxDQUFDO0lBS08sNkRBQWlCLEdBQXpCLFVBQTBCLE9BQXlCO1FBQy9DLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDO1lBQUMsTUFBTSxDQUFDO1FBQ3pELEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUFDLE1BQU0sQ0FBQztRQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELG1FQUF1QixHQUF2QixVQUF3QixPQUF5QjtRQUM3QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEMsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE1BQU0sSUFBSSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGdFQUFvQixHQUFwQixVQUFxQixPQUF5QjtRQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEMsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE1BQU0sSUFBSSxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVNLHdEQUFZLEdBQW5CO1FBQ0ksSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVMLHdDQUFDO0FBQUQsQ0FBQyxBQTVQRCxDQUF1RCxLQUFLLENBQUMscUJBQXFCLEdBNFBqRjtBQTVQWSxpQ0FBaUM7SUFEN0MsS0FBSyxDQUFDLEVBQUUsQ0FBQyxVQUFVOzZDQUlHLEtBQUssQ0FBQyxjQUFjLEVBQ3JCLEtBQUssQ0FBQyxhQUFhLEVBQ2xCLEtBQUssQ0FBQyxjQUFjLEVBQ3ZCLEtBQUssQ0FBQyxXQUFXLEVBQ0wsS0FBSyxDQUFDLHNCQUFzQixFQUN2QixLQUFLLENBQUMsb0JBQW9CLEVBQ3hDLEtBQUssQ0FBQyxjQUFjO0dBVDlCLGlDQUFpQyxDQTRQN0M7QUE1UFksOEVBQWlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSBcImFwcGxpY2F0aW9uXCI7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBnZW9sb2NhdGlvbiBmcm9tICdzcGVpZ2ctbmF0aXZlc2NyaXB0LWdlb2xvY2F0aW9uJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBlbnVtcyBmcm9tICd1aS9lbnVtcyc7XG5cbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgZnJhbWVzIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi12dWZvcmlhLXByb3ZpZGVyJ1xuaW1wb3J0ICogYXMgQXJnb24gZnJvbSBcIkBhcmdvbmpzL2FyZ29uXCI7XG5cbmltcG9ydCB7Z2V0U2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vdXRpbCdcblxuY29uc3QgQ2FydGVzaWFuMyA9IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuY29uc3QgUXVhdGVybmlvbiA9IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuY29uc3QgQ2VzaXVtTWF0aCA9IEFyZ29uLkNlc2l1bS5DZXNpdW1NYXRoO1xuY29uc3QgTWF0cml4NCAgICA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0O1xuXG5jb25zdCB6OTAgPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIENlc2l1bU1hdGguUElfT1ZFUl9UV08pO1xuY29uc3QgT05FID0gbmV3IENhcnRlc2lhbjMoMSwxLDEpO1xuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UgZXh0ZW5kcyBBcmdvbi5EZXZpY2VTZXJ2aWNlIHtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBzZXNzaW9uU2VydmljZTpBcmdvbi5TZXNzaW9uU2VydmljZSwgXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgdmlld1NlcnZpY2U6QXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIHZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI6QXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlcikge1xuICAgICAgICBzdXBlcihzZXNzaW9uU2VydmljZSwgY29udGV4dFNlcnZpY2UsIHZpZXdTZXJ2aWNlKTtcblxuICAgICAgICBjb25zdCB2c3AgPSA8TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcj52dWZvcmlhU2VydmljZVByb3ZpZGVyO1xuICAgICAgICBsZXQgbm93Om51bWJlcjtcblxuICAgICAgICBjb25zdCBleGVjdXRlQ2FsbGJhY2sgPSAoY2IsIGlkKSA9PiB7XG4gICAgICAgICAgICBjYihub3cpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZzcC5zdGF0ZVVwZGF0ZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgIG5vdyA9IGdsb2JhbC5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgIC8vIHN3YXAgY2FsbGJhY2sgbWFwc1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzO1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzMjtcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrczIgPSBjYWxsYmFja3M7XG4gICAgICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChleGVjdXRlQ2FsbGJhY2spO1xuICAgICAgICAgICAgY2FsbGJhY2tzLmNsZWFyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghdnVmb3JpYS5hcGkpIHtcbiAgICAgICAgICAgIHNldEludGVydmFsKCgpID0+IHZzcC5zdGF0ZVVwZGF0ZUV2ZW50LnJhaXNlRXZlbnQoQXJnb24uQ2VzaXVtLkp1bGlhbkRhdGUubm93KCkpLCAzNCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9hcHBsaWNhdGlvbiA9IGFwcGxpY2F0aW9uO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcbiAgICBwcml2YXRlIF9zY3JhdGNoRGV2aWNlT3JpZW50YXRpb24gPSBuZXcgUXVhdGVybmlvbjtcblxuICAgIHByaXZhdGUgX2lkID0gMDtcbiAgICBwcml2YXRlIF9jYWxsYmFja3MgPSBuZXcgTWFwPG51bWJlciwgRnVuY3Rpb24+KCk7XG4gICAgcHJpdmF0ZSBfY2FsbGJhY2tzMiA9IG5ldyBNYXA8bnVtYmVyLCBGdW5jdGlvbj4oKTtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IChjYjoodGltZXN0YW1wOm51bWJlcik9PnZvaWQpID0+IHtcbiAgICAgICAgdGhpcy5faWQrKztcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tzLnNldCh0aGlzLl9pZCwgY2IpO1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAoaWQ6bnVtYmVyKSA9PiB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrcy5kZWxldGUoaWQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXMoKSB7XG4gICAgICAgIHJldHVybiBnZXRTY3JlZW5PcmllbnRhdGlvbigpO1xuICAgIH1cbiAgICBcbiAgICBvblVwZGF0ZUZyYW1lU3RhdGUoKSB7XG5cbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB0aGlzLmRldmljZVN0YXRlLnZpZXdwb3J0ID0gdGhpcy5kZXZpY2VTdGF0ZS52aWV3cG9ydCB8fCA8QXJnb24uVmlld3BvcnQ+e307XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gZnJhbWVzLnRvcG1vc3QoKS5jdXJyZW50UGFnZS5jb250ZW50O1xuICAgICAgICB2aWV3cG9ydC54ID0gMDtcbiAgICAgICAgdmlld3BvcnQueSA9IDA7XG4gICAgICAgIHZpZXdwb3J0LndpZHRoID0gY29udGVudFZpZXcuZ2V0TWVhc3VyZWRXaWR0aCgpO1xuICAgICAgICB2aWV3cG9ydC5oZWlnaHQgPSBjb250ZW50Vmlldy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuXG4gICAgICAgIHN1cGVyLm9uVXBkYXRlRnJhbWVTdGF0ZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9hcHBsaWNhdGlvbi5pb3MpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSB0aGlzLl9nZXRNb3Rpb25NYW5hZ2VySU9TKCk7XG4gICAgICAgICAgICBjb25zdCBtb3Rpb24gPSBtb3Rpb25NYW5hZ2VyICYmIG1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uO1xuXG4gICAgICAgICAgICBpZiAobW90aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW90aW9uUXVhdGVybmlvbiA9IDxBcmdvbi5DZXNpdW0uUXVhdGVybmlvbj5tb3Rpb24uYXR0aXR1ZGUucXVhdGVybmlvbjtcblxuICAgICAgICAgICAgICAgIC8vIEFwcGxlJ3Mgb3JpZW50YXRpb24gaXMgcmVwb3J0ZWQgaW4gTldVLCBzbyB3ZSBjb252ZXJ0IHRvIEVOVSBieSBhcHBseWluZyBhIGdsb2JhbCByb3RhdGlvbiBvZlxuICAgICAgICAgICAgICAgIC8vIDkwIGRlZ3JlZXMgYWJvdXQgK3ogdG8gdGhlIE5XVSBvcmllbnRhdGlvbiAob3IgYXBwbHlpbmcgdGhlIE5XVSBxdWF0ZXJuaW9uIGFzIGEgbG9jYWwgcm90YXRpb24gXG4gICAgICAgICAgICAgICAgLy8gdG8gdGhlIHN0YXJ0aW5nIG9yaWVudGF0aW9uIG9mIDkwIGRlZ3Jlc3MgYWJvdXQgK3opLiBcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBXaXRoIHF1YXRlcm5pb24gbXVsdGlwbGljYXRpb24gdGhlIGAqYCBzeW1ib2wgY2FuIGJlIHJlYWQgYXMgJ3JvdGF0ZXMnLiBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgb3JpZW50YXRpb24gKE8pIGlzIG9uIHRoZSByaWdodCBhbmQgdGhlIHJvdGF0aW9uIChSKSBpcyBvbiB0aGUgbGVmdCwgXG4gICAgICAgICAgICAgICAgLy8gc3VjaCB0aGF0IHRoZSBtdWx0aXBsaWNhdGlvbiBvcmRlciBpcyBSKk8sIHRoZW4gUiBpcyBhIGdsb2JhbCByb3RhdGlvbiBiZWluZyBhcHBsaWVkIG9uIE8uIFxuICAgICAgICAgICAgICAgIC8vIExpa2V3aXNlLCB0aGUgcmV2ZXJzZSwgTypSLCBpcyBhIGxvY2FsIHJvdGF0aW9uIFIgYXBwbGllZCB0byB0aGUgb3JpZW50YXRpb24gTy4gXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlT3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLm11bHRpcGx5KHo5MCwgbW90aW9uUXVhdGVybmlvbiwgdGhpcy5fc2NyYXRjaERldmljZU9yaWVudGF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyA9IHRoaXMuZnJhbWVTdGF0ZS5zY3JlZW5PcmllbnRhdGlvbkRlZ3JlZXM7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVN0YWdlID0gdGhpcy5zdGFnZTtcblxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlVXNlci5wb3NpdGlvbikgZGV2aWNlVXNlci5wb3NpdGlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2VVc2VyLm9yaWVudGF0aW9uKSBkZXZpY2VVc2VyLm9yaWVudGF0aW9uID0gbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgICAgICAoZGV2aWNlVXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMCwwLHRoaXMuZGV2aWNlU3RhdGUuc3VnZ2VzdGVkVXNlckhlaWdodCwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksXG4gICAgICAgICAgICAgICAgICAgIGRldmljZVN0YWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbk9yaWVudGF0aW9uID0gXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuVU5JVF9aLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uRGVncmVlcyAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEaXNwbGF5T3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24gPSBcbiAgICAgICAgICAgICAgICAgICAgUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZU9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmVlbk9yaWVudGF0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hEZXZpY2VPcmllbnRhdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgKGRldmljZVVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHNjcmVlbkJhc2VkRGV2aWNlT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uTWFuYWdlciA9IHRoaXMuX2dldExvY2F0aW9uTWFuYWdlcklPUygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRpbmcgPSBsb2NhdGlvbk1hbmFnZXIuaGVhZGluZztcbiAgICAgICAgICAgICAgICBkZXZpY2VVc2VyWydtZXRhJ10gPSBkZXZpY2VVc2VyWydtZXRhJ10gfHwge307XG4gICAgICAgICAgICAgICAgZGV2aWNlVXNlclsnbWV0YSddLmdlb0hlYWRpbmdBY2N1cmFjeSA9IGhlYWRpbmcgJiYgaGVhZGluZy5oZWFkaW5nQWNjdXJhY3k7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9tb3Rpb25NYW5hZ2VySU9TPzpDTU1vdGlvbk1hbmFnZXI7XG5cbiAgICBwcml2YXRlIF9nZXRNb3Rpb25NYW5hZ2VySU9TKCkgOiBDTU1vdGlvbk1hbmFnZXJ8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKHRoaXMuX21vdGlvbk1hbmFnZXJJT1MpIHJldHVybiB0aGlzLl9tb3Rpb25NYW5hZ2VySU9TO1xuXG4gICAgICAgIGNvbnN0IG1vdGlvbk1hbmFnZXIgPSBDTU1vdGlvbk1hbmFnZXIuYWxsb2MoKS5pbml0KCk7XG4gICAgICAgIG1vdGlvbk1hbmFnZXIuc2hvd3NEZXZpY2VNb3ZlbWVudERpc3BsYXkgPSB0cnVlXG4gICAgICAgIG1vdGlvbk1hbmFnZXIuZGV2aWNlTW90aW9uVXBkYXRlSW50ZXJ2YWwgPSAxLjAgLyAxMDAuMDtcbiAgICAgICAgaWYgKCFtb3Rpb25NYW5hZ2VyLmRldmljZU1vdGlvbkF2YWlsYWJsZSB8fCAhbW90aW9uTWFuYWdlci5tYWduZXRvbWV0ZXJBdmFpbGFibGUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTk8gTWFnbmV0b21ldGVyIGFuZC9vciBHeXJvLiBcIiApO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlZmZlY3RpdmVSZWZlcmVuY2VGcmFtZTpDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWU7XG4gICAgICAgICAgICBpZiAoQ01Nb3Rpb25NYW5hZ2VyLmF2YWlsYWJsZUF0dGl0dWRlUmVmZXJlbmNlRnJhbWVzKCkgJiBDTUF0dGl0dWRlUmVmZXJlbmNlRnJhbWUuWFRydWVOb3J0aFpWZXJ0aWNhbCkge1xuICAgICAgICAgICAgICAgIGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lID0gQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lLlhUcnVlTm9ydGhaVmVydGljYWw7XG4gICAgICAgICAgICAgICAgbW90aW9uTWFuYWdlci5zdGFydERldmljZU1vdGlvblVwZGF0ZXNVc2luZ1JlZmVyZW5jZUZyYW1lKGVmZmVjdGl2ZVJlZmVyZW5jZUZyYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJOTyAgQ01BdHRpdHVkZVJlZmVyZW5jZUZyYW1lWFRydWVOb3J0aFpWZXJ0aWNhbFwiICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9tb3Rpb25NYW5hZ2VySU9TID0gbW90aW9uTWFuYWdlcjtcbiAgICAgICAgcmV0dXJuIG1vdGlvbk1hbmFnZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbG9jYXRpb25NYW5hZ2VySU9TPzpDTExvY2F0aW9uTWFuYWdlcjtcblxuICAgIHByaXZhdGUgX2dldExvY2F0aW9uTWFuYWdlcklPUygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9sb2NhdGlvbk1hbmFnZXJJT1MpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUyA9IENMTG9jYXRpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKENMTG9jYXRpb25NYW5hZ2VyLmF1dGhvcml6YXRpb25TdGF0dXMoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkV2hlbkluVXNlOlxuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNBdXRob3JpemVkQWx3YXlzOiBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDTEF1dGhvcml6YXRpb25TdGF0dXMua0NMQXV0aG9yaXphdGlvblN0YXR1c05vdERldGVybWluZWQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvY2F0aW9uTWFuYWdlcklPUy5yZXF1ZXN0V2hlbkluVXNlQXV0aG9yaXphdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIENMQXV0aG9yaXphdGlvblN0YXR1cy5rQ0xBdXRob3JpemF0aW9uU3RhdHVzRGVuaWVkOlxuICAgICAgICAgICAgICAgIGNhc2UgQ0xBdXRob3JpemF0aW9uU3RhdHVzLmtDTEF1dGhvcml6YXRpb25TdGF0dXNSZXN0cmljdGVkOlxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIkxvY2F0aW9uIFNlcnZpY2VzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgSW4gb3JkZXIgdG8gcHJvdmlkZSB0aGUgYmVzdCBBdWdtZW50ZWQgUmVhbGl0eSBleHBlcmllbmNlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGVhc2Ugb3BlbiB0aGlzIGFwcCdzIHNldHRpbmdzIGFuZCBlbmFibGUgbG9jYXRpb24gc2VydmljZXNgLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJDYW5jZWxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsnU2V0dGluZ3MnXVxuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKChhY3Rpb24pPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnU2V0dGluZ3MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gTlNVUkwuVVJMV2l0aFN0cmluZyhVSUFwcGxpY2F0aW9uT3BlblNldHRpbmdzVVJMU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5pb3MuZ2V0dGVyKFVJQXBwbGljYXRpb24sIFVJQXBwbGljYXRpb24uc2hhcmVkQXBwbGljYXRpb24pLm9wZW5VUkwodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fbG9jYXRpb25NYW5hZ2VySU9TO1xuICAgIH1cbn1cblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXIgZXh0ZW5kcyBBcmdvbi5EZXZpY2VTZXJ2aWNlUHJvdmlkZXIge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBjb250YWluZXIsIFxuICAgICAgICBzZXNzaW9uU2VydmljZTpBcmdvbi5TZXNzaW9uU2VydmljZSwgXG4gICAgICAgIGRldmljZVNlcnZpY2U6QXJnb24uRGV2aWNlU2VydmljZSwgXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLCBcbiAgICAgICAgdmlld1NlcnZpY2U6QXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIGNvbnRleHRTZXJ2aWNlUHJvdmlkZXJlOkFyZ29uLkNvbnRleHRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIHByaXZhdGUgZm9jdXNTZXJ2aWNlUHJvdmlkZXI6QXJnb24uRm9jdXNTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIHJlYWxpdHlTZXJ2aWNlOkFyZ29uLlJlYWxpdHlTZXJ2aWNlKSB7XG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgc2Vzc2lvblNlcnZpY2UsIFxuICAgICAgICAgICAgZGV2aWNlU2VydmljZSwgXG4gICAgICAgICAgICBjb250ZXh0U2VydmljZSwgXG4gICAgICAgICAgICB2aWV3U2VydmljZSwgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRleHRTZXJ2aWNlUHJvdmlkZXJlXG4gICAgICAgICk7XG5cbiAgICAgICAgYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpPT57XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoRGV2aWNlU3RhdGUoKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2hEZXZpY2VTdGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvY2F0aW9uV2F0Y2hJZD86bnVtYmVyO1xuXG4gICAgLy8gcHJpdmF0ZSBfc2NyYXRjaENhcnRlc2lhbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbiAgICBwcml2YXRlIF9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtID0gbmV3IEFyZ29uLkNlc2l1bS5QZXJzcGVjdGl2ZUZydXN0dW07XG5cbiAgICBwcm90ZWN0ZWQgb25VcGRhdGVEZXZpY2VTdGF0ZShkZXZpY2VTdGF0ZTpBcmdvbi5EZXZpY2VTdGF0ZSkge1xuXG4gICAgICAgIGlmICghZGV2aWNlU3RhdGUuaXNQcmVzZW50aW5nSE1EIHx8ICF2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgZGV2aWNlU3RhdGUudmlld3BvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRldmljZVN0YXRlLnN0cmljdCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3Vidmlld3MgPSBkZXZpY2VTdGF0ZS5zdWJ2aWV3cyA9IGRldmljZVN0YXRlLnN1YnZpZXdzIHx8IFtdO1xuXG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBjb25zdCByZW5kZXJpbmdQcmltaXRpdmVzID0gZGV2aWNlLmdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nVmlld3MgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFJlbmRlcmluZ1ZpZXdzKCk7XG4gICAgICAgIGNvbnN0IG51bVZpZXdzID0gcmVuZGVyaW5nVmlld3MuZ2V0TnVtVmlld3MoKTtcblxuICAgICAgICBjb25zdCBjb250ZW50U2NhbGVGYWN0b3IgPSAoPFVJVmlldz52dWZvcmlhLnZpZGVvVmlldy5pb3MpLmNvbnRlbnRTY2FsZUZhY3RvcjtcblxuICAgICAgICBzdWJ2aWV3cy5sZW5ndGggPSBudW1WaWV3cztcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVZpZXdzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHZpZXcgPSByZW5kZXJpbmdWaWV3cy5nZXRWaWV3KGkpO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBzdXBwb3J0IFBvc3RQcm9jZXNzIHJlbmRlcmluZyBzdWJ2aWV3XG4gICAgICAgICAgICBpZiAodmlldyA9PT0gdnVmb3JpYS5WaWV3LlBvc3RQcm9jZXNzKSB7XG4gICAgICAgICAgICAgICAgc3Vidmlld3MubGVuZ3RoLS07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN1YnZpZXcgPSBzdWJ2aWV3c1tpXSA9IHN1YnZpZXdzW2ldIHx8IDxBcmdvbi5TZXJpYWxpemVkU3Vidmlldz57fTtcblxuICAgICAgICAgICAgLy8gU2V0IHN1YnZpZXcgdHlwZVxuICAgICAgICAgICAgc3dpdGNoICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuTGVmdEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuTEVGVEVZRTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuUmlnaHRFeWU6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLlJJR0hURVlFOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIHZ1Zm9yaWEuVmlldy5TaW5ndWxhcjpcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlldy50eXBlID0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcudHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLk9USEVSOyBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIHN1YnZpZXcgdmlld3BvcnRcbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFZpZXdwb3J0KHZpZXcpO1xuICAgICAgICAgICAgY29uc3Qgc3Vidmlld1ZpZXdwb3J0ID0gc3Vidmlldy52aWV3cG9ydCA9IHN1YnZpZXcudmlld3BvcnQgfHwgPEFyZ29uLlZpZXdwb3J0Pnt9O1xuICAgICAgICAgICAgc3Vidmlld1ZpZXdwb3J0LnggPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LnggLyBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgICAgICBzdWJ2aWV3Vmlld3BvcnQueSA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueSAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC53aWR0aCA9IHZ1Zm9yaWFTdWJ2aWV3Vmlld3BvcnQueiAvIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgICAgIHN1YnZpZXdWaWV3cG9ydC5oZWlnaHQgPSB2dWZvcmlhU3Vidmlld1ZpZXdwb3J0LncgLyBjb250ZW50U2NhbGVGYWN0b3I7XG5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHByb2plY3Rpb24gbWF0cml4IGZvciB0aGlzIHN1YnZpZXdcbiAgICAgICAgICAgIC8vIE5vdGU6IFZ1Zm9yaWEgdXNlcyBhIHJpZ2h0LWhhbmRlZCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHggdG8gdGhlIHJpZ2h0LCB5IGRvd24sIGFuZCB6IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi5cbiAgICAgICAgICAgIC8vIFNvIHdlIGFyZSBjb252ZXJ0aW5nIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uIG9mIHggdG8gdGhlIHJpZ2h0LCB5IHVwLCBhbmQgLXogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLiBcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gPGFueT5yZW5kZXJpbmdQcmltaXRpdmVzLmdldFByb2plY3Rpb25NYXRyaXgodmlldywgdnVmb3JpYS5Db29yZGluYXRlU3lzdGVtVHlwZS5DYW1lcmEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzRmluaXRlKHByb2plY3Rpb25NYXRyaXhbMF0pKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBpZiBvdXIgcHJvamVjdGlvbiBtYXRyaXggaXMgZ2l2aW5nIG51bGwgdmFsdWVzIHRoZW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gc3VyZmFjZSBpcyBub3QgcHJvcGVybHkgY29uZmlndXJlZCBmb3Igc29tZSByZWFzb24sIHNvIHJlc2V0IGl0XG4gICAgICAgICAgICAgICAgLy8gKG5vdCBzdXJlIHdoeSB0aGlzIGhhcHBlbnMsIGJ1dCBpdCBvbmx5IHNlZW1zIHRvIGhhcHBlbiBhZnRlciBvciBiZXR3ZWVuIFxuICAgICAgICAgICAgICAgIC8vIHZ1Zm9yaWEgaW5pdGlhbGl6YXRpb25zKVxuICAgICAgICAgICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLnZpZGVvVmlldy5pb3MuZnJhbWUuc2l6ZS53aWR0aCAqIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcy5mcmFtZS5zaXplLmhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGZydXN0dW0gPSB0aGlzLl9zY3JhdGNoUGVyc3BlY3RpdmVGcnVzdHVtO1xuICAgICAgICAgICAgICAgIGZydXN0dW0uZm92ID0gTWF0aC5QSS8yO1xuICAgICAgICAgICAgICAgIGZydXN0dW0ubmVhciA9IDAuMDE7XG4gICAgICAgICAgICAgICAgZnJ1c3R1bS5mYXIgPSAxMDAwMDtcbiAgICAgICAgICAgICAgICBmcnVzdHVtLmFzcGVjdFJhdGlvID0gc3Vidmlld1ZpZXdwb3J0LndpZHRoIC8gc3Vidmlld1ZpZXdwb3J0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKGZydXN0dW0uYXNwZWN0UmF0aW8pIHx8IGZydXN0dW0uYXNwZWN0UmF0aW8gPT09IDApIGZydXN0dW0uYXNwZWN0UmF0aW8gPSAxO1xuICAgICAgICAgICAgICAgIHN1YnZpZXcucHJvamVjdGlvbk1hdHJpeCA9IE1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgLy8gVW5kbyB0aGUgdmlkZW8gcm90YXRpb24gc2luY2Ugd2UgYWxyZWFkeSBlbmNvZGUgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBpbiBvdXIgdmlldyBwb3NlXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogdGhlIFwiYmFzZVwiIHJvdGF0aW9uIGZvciB2dWZvcmlhJ3MgdmlkZW8gKGF0IGxlYXN0IG9uIGlPUykgaXMgdGhlIGxhbmRzY2FwZSByaWdodCBvcmllbnRhdGlvbixcbiAgICAgICAgICAgICAgICAvLyB3aGljaCBpcyB0aGUgb3JpZW50YXRpb24gd2hlcmUgdGhlIGRldmljZSBpcyBoZWxkIGluIGxhbmRzY2FwZSB3aXRoIHRoZSBob21lIGJ1dHRvbiBvbiB0aGUgcmlnaHQuIFxuICAgICAgICAgICAgICAgIC8vIFRoaXMgXCJiYXNlXCIgdmlkZW8gcm90YXRhdGlvbiBpcyAtOTAgZGVnIGFyb3VuZCAreiBmcm9tIHRoZSBwb3J0cmFpdCBpbnRlcmZhY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTbywgd2Ugd2FudCB0byB1bmRvIHRoaXMgcm90YXRpb24gd2hpY2ggdnVmb3JpYSBhcHBsaWVzIGZvciB1cy4gIFxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGNhbGN1bGF0ZSB0aGlzIG1hdHJpeCBvbmx5IHdoZW4gd2UgaGF2ZSB0byAod2hlbiB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGNoYW5nZXMpXG4gICAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmZyb21UcmFuc2xhdGlvblF1YXRlcm5pb25Sb3RhdGlvblNjYWxlKFxuICAgICAgICAgICAgICAgICAgICBDYXJ0ZXNpYW4zLlpFUk8sXG4gICAgICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgKENlc2l1bU1hdGguUElfT1ZFUl9UV08gLSBnZXRTY3JlZW5PcmllbnRhdGlvbigpICogTWF0aC5QSSAvIDE4MCksIHRoaXMuX3NjcmF0Y2hWaWRlb1F1YXRlcm5pb24pLFxuICAgICAgICAgICAgICAgICAgICBPTkUsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hNYXRyaXg0XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShwcm9qZWN0aW9uTWF0cml4LCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IGZyb20gdGhlIHZ1Zm9yaWEgcHJvamVjdGlvbiBtYXRyaXggKCtYIC1ZICtaKSB0byBhIG1vcmUgc3RhbmRhcmQgY29udmVudGlvbiAoK1ggK1kgLVopXG4gICAgICAgICAgICAgICAgLy8gYnkgbmVnYXRpbmcgdGhlIGFwcHJvcHJpYXRlIGNvbHVtbnMuIFxuICAgICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS9saWJyYXJ5L2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1Vc2UtdGhlLUNhbWVyYS1Qcm9qZWN0aW9uLU1hdHJpeFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMF0gKj0gLTE7IC8vIHhcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzFdICo9IC0xOyAvLyB5XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbM10gKj0gLTE7IC8vIHdcblxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOF0gKj0gLTE7ICAvLyB4XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs5XSAqPSAtMTsgIC8vIHlcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzEwXSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMTFdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgICAgICAvLyBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseUJ5U2NhbGUocHJvamVjdGlvbk1hdHJpeCwgQ2FydGVzaWFuMy5mcm9tRWxlbWVudHMoMSwtMSwtMSwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbiksIHByb2plY3Rpb25NYXRyaXgpXG5cbiAgICAgICAgICAgICAgICAvLyBTY2FsZSB0aGUgcHJvamVjdGlvbiBtYXRyaXggdG8gZml0IG5pY2VseSB3aXRoaW4gYSBzdWJ2aWV3IG9mIHR5cGUgU0lOR1VMQVJcbiAgICAgICAgICAgICAgICAvLyAoVGhpcyBzY2FsZSB3aWxsIG5vdCBhcHBseSB3aGVuIHRoZSB1c2VyIGlzIHdlYXJpbmcgYSBtb25vY3VsYXIgSE1ELCBzaW5jZSBhXG4gICAgICAgICAgICAgICAgLy8gbW9ub2N1bGFyIEhNRCB3b3VsZCBwcm92aWRlIGEgc3VidmlldyBvZiB0eXBlIExFRlRFWUUgb3IgUklHSFRFWUUpXG4gICAgICAgICAgICAgICAgLy8gaWYgKHN1YnZpZXcudHlwZSA9PSBBcmdvbi5TdWJ2aWV3VHlwZS5TSU5HVUxBUikge1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCB3aWR0aFJhdGlvID0gc3Vidmlld1dpZHRoIC8gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICAgICAgICAgIC8vICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IHN1YnZpZXdIZWlnaHQgLyB2aWRlb01vZGUuaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGFzcGVjdCBmaWxsXG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5tYXgod2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyBvciBhc3BlY3QgZml0XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGNvbnN0IHNjYWxlRmFjdG9yID0gTWF0aC5taW4od2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHgtYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzBdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbMV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzNdICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHNjYWxlIHktYXhpc1xuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzRdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICAgICAgLy8gICAgIHByb2plY3Rpb25NYXRyaXhbNV0gKj0gc2NhbGVGYWN0b3I7IC8vIHlcbiAgICAgICAgICAgICAgICAvLyAgICAgcHJvamVjdGlvbk1hdHJpeFs2XSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgICAgIC8vICAgICBwcm9qZWN0aW9uTWF0cml4WzddICo9IHNjYWxlRmFjdG9yOyAvLyB3XG4gICAgICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAgICAgc3Vidmlldy5wcm9qZWN0aW9uTWF0cml4ID0gTWF0cml4NC5jbG9uZShwcm9qZWN0aW9uTWF0cml4LCBzdWJ2aWV3LnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIGNvbnN0IGV5ZUFkanVzdG1lbnRNYXRyaXggPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXcpO1xuICAgICAgICAgICAgLy8gbGV0IHByb2plY3Rpb25NYXRyaXggPSBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShyYXdQcm9qZWN0aW9uTWF0cml4LCBleWVBZGp1c3RtZW50TWF0cml4LCBbXSk7XG4gICAgICAgICAgICAvLyBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQuZnJvbVJvd01ham9yQXJyYXkocHJvamVjdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gaWRlbnRpdHkgc3VidmlldyBwb3NlIChpbiByZWxhdGlvbiB0byB0aGUgb3ZlcmFsbCB2aWV3IHBvc2UpXG4gICAgICAgICAgICAvLyBUT0RPOiB1c2UgZXllIGFkanVzdG1lbnQgbWF0cml4IHRvIGdldCBzdWJ2aWV3IHBvc2VzIChmb3IgZXllIHNlcGFyYXRpb24pLiBTZWUgY29tbWVudGVkIG91dCBjb2RlIGFib3ZlLi4uXG4gICAgICAgICAgICBzdWJ2aWV3LnBvc2UgPSB1bmRlZmluZWQ7IFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIG9uU3RhcnRHZW9sb2NhdGlvblVwZGF0ZXMob3B0aW9uczpBcmdvbi5HZW9sb2NhdGlvbk9wdGlvbnMpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5sb2NhdGlvbldhdGNoSWQgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpPT57XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBkLnRzIGZvciBuYXRpdmVzY3JpcHQtZ2VvbG9jYXRpb24gaXMgd3JvbmcuIFRoaXMgY2FsbCBpcyBjb3JyZWN0LiBcbiAgICAgICAgICAgIC8vIENhc3RpbmcgdGhlIG1vZHVsZSBhcyA8YW55PiBoZXJlIGZvciBub3cgdG8gaGlkZSBhbm5veWluZyB0eXBlc2NyaXB0IGVycm9ycy4uLlxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSAoPGFueT5nZW9sb2NhdGlvbikud2F0Y2hMb2NhdGlvbigobG9jYXRpb246Z2VvbG9jYXRpb24uTG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgLy8gTm90ZTogaU9TIGRvY3VtZW50YXRpb24gc3RhdGVzIHRoYXQgdGhlIGFsdGl0dWRlIHZhbHVlIHJlZmVycyB0byBoZWlnaHQgKG1ldGVycykgYWJvdmUgc2VhIGxldmVsLCBidXQgXG4gICAgICAgICAgICAgICAgLy8gaWYgaW9zIGlzIHJlcG9ydGluZyB0aGUgc3RhbmRhcmQgZ3BzIGRlZmluZWQgYWx0aXR1ZGUsIHRoZW4gdGhpcyB0aGVvcmV0aWNhbCBcInNlYSBsZXZlbFwiIGFjdHVhbGx5IHJlZmVycyB0byBcbiAgICAgICAgICAgICAgICAvLyB0aGUgV0dTODQgZWxsaXBzb2lkIHJhdGhlciB0aGFuIHRyYWRpdGlvbmFsIG1lYW4gc2VhIGxldmVsIChNU0wpIHdoaWNoIGlzIG5vdCBhIHNpbXBsZSBzdXJmYWNlIGFuZCB2YXJpZXMgXG4gICAgICAgICAgICAgICAgLy8gYWNjb3JkaW5nIHRvIHRoZSBsb2NhbCBncmF2aXRhdGlvbmFsIGZpZWxkLiBcbiAgICAgICAgICAgICAgICAvLyBJbiBvdGhlciB3b3JkcywgbXkgYmVzdCBndWVzcyBpcyB0aGF0IHRoZSBhbHRpdHVkZSB2YWx1ZSBoZXJlIGlzICpwcm9iYWJseSogR1BTIGRlZmluZWQgYWx0aXR1ZGUsIHdoaWNoIFxuICAgICAgICAgICAgICAgIC8vIGlzIGVxdWl2YWxlbnQgdG8gdGhlIGhlaWdodCBhYm92ZSB0aGUgV0dTODQgZWxsaXBzb2lkLCB3aGljaCBpcyBleGFjdGx5IHdoYXQgQ2VzaXVtIGV4cGVjdHMuLi5cbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyZVN0YWdlKFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sb25naXR1ZGUsIFxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5sYXRpdHVkZSwgXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmFsdGl0dWRlLCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uaG9yaXpvbnRhbEFjY3VyYWN5LCBcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24udmVydGljYWxBY2N1cmFjeVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIChlKT0+e1xuICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgIH0sIDxnZW9sb2NhdGlvbi5PcHRpb25zPntcbiAgICAgICAgICAgICAgICBkZXNpcmVkQWNjdXJhY3k6IG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVIaWdoQWNjdXJhY3kgPyBcbiAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uaW9zID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBrQ0xMb2NhdGlvbkFjY3VyYWN5QmVzdCA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuaGlnaCA6IFxuICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi5pb3MgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGtDTExvY2F0aW9uQWNjdXJhY3lLaWxvbWV0ZXIgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bXMuQWNjdXJhY3kuYW55LFxuICAgICAgICAgICAgICAgIHVwZGF0ZURpc3RhbmNlOiBhcHBsaWNhdGlvbi5pb3MgPyBrQ0xEaXN0YW5jZUZpbHRlck5vbmUgOiAwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBsb2NhdGlvbiB3YXRjaGVyLiBcIiArIHRoaXMubG9jYXRpb25XYXRjaElkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgXG4gICAgcHJvdGVjdGVkIG9uU3RvcEdlb2xvY2F0aW9uVXBkYXRlcygpIDogdm9pZCB7XG4gICAgICAgIGlmIChBcmdvbi5DZXNpdW0uZGVmaW5lZCh0aGlzLmxvY2F0aW9uV2F0Y2hJZCkpIHtcbiAgICAgICAgICAgIGdlb2xvY2F0aW9uLmNsZWFyV2F0Y2godGhpcy5sb2NhdGlvbldhdGNoSWQpO1xuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbldhdGNoSWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoTWF0cml4NCA9IG5ldyBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbiAgICBwcml2YXRlIF9zY3JhdGNoVmlkZW9RdWF0ZXJuaW9uID0gbmV3IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuXG4gICAgcHJpdmF0ZSBfZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGlmICh0aGlzLmZvY3VzU2VydmljZVByb3ZpZGVyLnNlc3Npb24gPT0gc2Vzc2lvbikgcmV0dXJuOyBcbiAgICAgICAgaWYgKHNlc3Npb24gPT0gdGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKSByZXR1cm47XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vzc2lvbiBkb2VzIG5vdCBoYXZlIGZvY3VzLicpXG4gICAgfVxuICAgIFxuICAgIGhhbmRsZVJlcXVlc3RQcmVzZW50SE1EKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUGVybWlzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIGRldmljZSAmJiBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKHRydWUpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgaGFuZGxlRXhpdFByZXNlbnRITUQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICB0aGlzLl9lbnN1cmVQZXJtaXNzaW9uKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKTtcbiAgICAgICAgZGV2aWNlICYmIGRldmljZS5zZXRWaWV3ZXJBY3RpdmUoZmFsc2UpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcHVibGljIF9pc0htZEFjdGl2ZSgpIHtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdnVmb3JpYS5hcGkgJiYgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCk7XG4gICAgICAgIHJldHVybiBkZXZpY2UuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG5cbn0iXX0=