"use strict";
var application = require("application");
var utils = require("utils/utils");
var geolocation = require("speigg-nativescript-geolocation");
var dialogs = require("ui/dialogs");
var enums = require("ui/enums");
var frames = require("ui/frame");
var platform = require("platform");
var Argon = require("@argonjs/argon");
var vuforia = require("nativescript-vuforia");
var util_1 = require("./util");
var JulianDate = Argon.Cesium.JulianDate;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var Matrix4 = Argon.Cesium.Matrix4;
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
var ONE = new Cartesian3(1, 1, 1);
var scratchQuaternion = new Quaternion;
var scratchMatrix4 = new Matrix4;
exports.vuforiaCameraDeviceMode = -3 /* OpimizeQuality */;
if (vuforia.videoView.ios) {
    vuforia.videoView.ios.contentScaleFactor =
        exports.vuforiaCameraDeviceMode === -2 /* OptimizeSpeed */ ?
            1 : platform.screen.mainScreen.scale;
}
var NativescriptDeviceService = (function (_super) {
    __extends(NativescriptDeviceService, _super);
    function NativescriptDeviceService(session, context, view) {
        var _this = _super.call(this, session, context, view) || this;
        _this.calibStartTime = JulianDate.now();
        _this.calibrating = false;
        return _this;
        // realityService.viewStateEvent.addEventListener((viewState)=>{
        //     if (vuforia.api) {                   
        //         const desiredFov = viewState.subviews[0].frustum.fov;
        //         // convert the desired fov to the appropriate scale factor
        //         const defaultFov = this.state.defaultFov;
        //         const desiredHalfLength = Math.tan(0.5*desiredFov);
        //         const defaultHalfLength = Math.tan(0.5*defaultFov);
        //         const scaleFactor =  defaultHalfLength / desiredHalfLength;
        //         // make sure the video is scaled as appropriately
        //         vuforia.api.setScaleFactor(scaleFactor);
        //         // update the videoView
        //         this.configureVuforiaVideoBackground(viewState.viewport);
        //     }
        // });
    }
    NativescriptDeviceService.prototype.onUpdateSubviews = function (subviews) {
        // const cameraDevice = vuforia.api.getCameraDevice();
        // const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode);
        if (vuforia.api && vuforia.api.getDevice().isViewerActive()) {
            var device = vuforia.api.getDevice();
            var renderingPrimitives = device.getRenderingPrimitives();
            var renderingViews = renderingPrimitives.getRenderingViews();
            var numViews = renderingViews.getNumViews();
            var contentScaleFactor = vuforia.videoView.ios.contentScaleFactor;
            for (var i = 0; i < numViews; i++) {
                var view = renderingViews.getView(i);
                // TODO: support PostProcess rendering subview
                if (view === 3 /* PostProcess */)
                    continue;
                var subview = subviews[i] = subviews[i] || {};
                // Set subview type
                switch (view) {
                    case 1 /* LeftEye */:
                        subview.type = Argon.SubviewType.LEFTEYE;
                        break;
                    case 2 /* RightEye */:
                        subview.type = Argon.SubviewType.RIGHTEYE;
                        break;
                    case 0 /* Singular */:
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
                // const subviewWidth = subviewViewport.width = vuforiaSubviewViewport.z / contentScaleFactor;
                // const subviewHeight = subviewViewport.height = vuforiaSubviewViewport.w / contentScaleFactor;
                // Determine the desired subview projection matrix
                // Start with the projection matrix for this subview
                // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
                // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
                var projectionMatrix = renderingPrimitives.getProjectionMatrix(view, 1 /* Camera */);
                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation for vuforia's video (at least on iOS) is the landscape right orientation,
                // which is the orientation where the device is held in landscape with the home button on the right. 
                // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
                // So, we want to undo this rotation which vuforia applies for us.  
                // TODO: calculate this matrix only when we have to (when the interface orientation changes)
                var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + util_1.getDisplayOrientation() * Math.PI / 180), scratchQuaternion), ONE, scratchMatrix4);
                Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);
                // convert from the vuforia projection matrix (+X -Y +Z) to a more standard convention (+X +Y -Z)
                // by negating the appropriate rows. 
                // See https://developer.vuforia.com/library/articles/Solution/How-To-Use-the-Camera-Projection-Matrix
                // flip y axis so it is positive
                projectionMatrix[4] *= -1; // x
                projectionMatrix[5] *= -1; // y
                projectionMatrix[6] *= -1; // z
                projectionMatrix[7] *= -1; // w
                // flip z axis so it is negative
                projectionMatrix[8] *= -1; // x
                projectionMatrix[9] *= -1; // y
                projectionMatrix[10] *= -1; // z
                projectionMatrix[11] *= -1; // w
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
                // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
                // default to identity subview pose (in relation to the overall view pose)
                // TODO: use eye adjustment matrix to get subview poses (for eye separation). See commented out code above...
                subview.pose = undefined;
            }
        }
        else {
            _super.prototype.onUpdateSubviews.call(this, subviews);
        }
    };
    NativescriptDeviceService.prototype.onStartGeolocationUpdates = function (enableHighAccuracy) {
        var _this = this;
        if (typeof this.locationWatchId !== 'undefined')
            return true;
        // Note: the d.ts for nativescript-geolocation is wrong. This call is correct. 
        // Casting the module as <any> here for now to hide annoying typescript errors...
        this.locationWatchId = geolocation.watchLocation(function (location) {
            // Note: iOS documentation states that the altitude value refers to height (meters) above sea level, but 
            // if ios is reporting the standard gps defined altitude, then this theoretical "sea level" actually refers to 
            // the WGS84 ellipsoid rather than traditional mean sea level (MSL) which is not a simple surface and varies 
            // according to the local gravitational field. 
            // In other words, my best guess is that the altitude value here is *probably* GPS defined altitude, which 
            // is equivalent to the height above the WGS84 ellipsoid, which is exactly what Cesium expects...
            _this._setGeolocation(location.longitude, location.latitude, location.altitude, location.horizontalAccuracy, location.verticalAccuracy);
        }, function (e) {
            console.log(e);
        }, {
            desiredAccuracy: enableHighAccuracy ?
                application.ios ?
                    kCLLocationAccuracyBest :
                    enums.Accuracy.high :
                application.ios ?
                    kCLLocationAccuracyKilometer :
                    enums.Accuracy.any,
            updateDistance: application.ios ? kCLDistanceFilterNone : 0
        });
        console.log("Creating location watcher. " + this.locationWatchId);
        this.ensureLocationManager();
        return true;
    };
    NativescriptDeviceService.prototype.ensureLocationManager = function () {
        if (application.ios && !this.locationManager) {
            switch (CLLocationManager.authorizationStatus()) {
                case 4 /* kCLAuthorizationStatusAuthorizedWhenInUse */:
                case 3 /* kCLAuthorizationStatusAuthorizedAlways */:
                    break;
                case 0 /* kCLAuthorizationStatusNotDetermined */:
                    this.locationManager = CLLocationManager.alloc().init();
                    this.locationManager.requestWhenInUseAuthorization();
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
    };
    NativescriptDeviceService.prototype.onStopGeolocationUpdates = function () {
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
    };
    NativescriptDeviceService.prototype.onStartOrientationUpdates = function () {
        if (this.motionManager)
            return true;
        var motionManager = CMMotionManager.alloc().init();
        motionManager.deviceMotionUpdateInterval = 1.0 / 100.0;
        if (!motionManager.deviceMotionAvailable || !motionManager.magnetometerAvailable) {
            console.log("NO Magnetometer and/or Gyro. ");
            alert("Need a device with gyroscope and magnetometer to get 3D device orientation");
            return false;
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
                return false;
            }
        }
        this.motionManager = motionManager;
        return true;
    };
    NativescriptDeviceService.prototype.onStopOrientationUpdates = function () {
        if (this.motionManager) {
        }
    };
    NativescriptDeviceService.prototype.onUpdate = function () {
        var time = JulianDate.now();
        if (application.ios && this.motionManager) {
            var motion = this.motionManager.deviceMotion;
            if (motion) {
                // We want to have the user calibrate the magnetic field
                // if there are problems.  But iOS10 seems to have a problem 
                // where doing the calibration messes up CMMotion.  So, we've 
                // commented this out for now, but should turn it back on eventually
                switch (motion.magneticField.accuracy) {
                    case -1 /* Uncalibrated */:
                    case 0 /* Low */:
                        if (!this.calibrating) {
                            // let's only start calibration if it's been a while since we stopped
                            if (JulianDate.secondsDifference(time, this.calibStartTime) > 5) {
                            }
                        }
                        break;
                    case 1 /* Medium */:
                    case 2 /* High */:
                        if (this.calibrating) {
                            // let's only stop calibration if it's been a little bit since we stopped
                            if (JulianDate.secondsDifference(time, this.calibStartTime) > 2) {
                            }
                        }
                        break;
                }
                if (this.motionManager.showsDeviceMovementDisplay) {
                    return;
                }
                var motionQuaternion = motion.attitude.quaternion;
                // Apple's orientation is reported in NWU, so we convert to ENU by applying a global rotation of
                // 90 degrees about +z to the NWU orientation (or applying the NWU quaternion as a local rotation 
                // to the starting orientation of 90 degress about +z). 
                // Note: With quaternion multiplication the `*` symbol can be read as 'rotates'. 
                // If the orientation (O) is on the right and the rotation (R) is on the left, 
                // such that the multiplication order is R*O, then R is a global rotation being applied on O. 
                // Likewise, the reverse, O*R, is a local rotation R applied to the orientation O. 
                var orientation = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);
                var displayOrientationDegrees = util_1.getDisplayOrientation();
                this.ensureLocationManager();
                var locationManager = this.locationManager;
                var headingAccuracy = void 0;
                if (utils.ios.getter(locationManager, locationManager.headingAvailable)) {
                    headingAccuracy = locationManager.heading.headingAccuracy;
                }
                this._setOrientation(orientation, displayOrientationDegrees, headingAccuracy);
            }
        }
        _super.prototype.onUpdate.call(this);
    };
    NativescriptDeviceService.prototype.onUpdateViewport = function (viewport) {
        var contentView = frames.topmost().currentPage.content;
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = contentView.getMeasuredWidth();
        viewport.height = contentView.getMeasuredHeight();
    };
    return NativescriptDeviceService;
}(Argon.DeviceService));
NativescriptDeviceService = __decorate([
    Argon.DI.inject(Argon.SessionService, Argon.ContextService, Argon.ViewService)
], NativescriptDeviceService);
exports.NativescriptDeviceService = NativescriptDeviceService;
//# sourceMappingURL=argon-device-service.js.map