"use strict";
var application = require("application");
var utils = require('utils/utils');
var geolocation = require('speigg-nativescript-geolocation');
var dialogs = require('ui/dialogs');
var frames = require('ui/frame');
var platform = require('platform');
var absolute_layout_1 = require('ui/layouts/absolute-layout');
var Argon = require("@argonjs/argon");
var vuforia = require('nativescript-vuforia');
var JulianDate = Argon.Cesium.JulianDate;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var Transforms = Argon.Cesium.Transforms;
var Matrix4 = Argon.Cesium.Matrix4;
var Matrix3 = Argon.Cesium.Matrix3;
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
var ONE = new Cartesian3(1, 1, 1);
var scratchTime = new JulianDate(0, 0);
var scratchCartesian3 = new Cartesian3;
var scratchQuaternion = new Quaternion;
var scratchECEFQuaternion = new Quaternion;
var scratchMatrix4 = new Matrix4;
var scratchMatrix3 = new Matrix3;
var scratchFrustum = new Argon.Cesium.PerspectiveFrustum();
exports.vuforiaCameraDeviceMode = -3 /* OpimizeQuality */;
if (vuforia.videoView.ios) {
    vuforia.videoView.ios.contentScaleFactor =
        exports.vuforiaCameraDeviceMode === -2 /* OptimizeSpeed */ ?
            1 : platform.screen.mainScreen.scale;
}
var NativescriptDeviceService = (function (_super) {
    __extends(NativescriptDeviceService, _super);
    function NativescriptDeviceService(sessionService, realityService) {
        var _this = this;
        _super.call(this, sessionService, realityService);
        this.calibStartTime = JulianDate.now();
        this.calibrating = false;
        var geolocationPositionProperty = new Argon.Cesium.SampledPositionProperty(Argon.Cesium.ReferenceFrame.FIXED);
        this.geolocationEntity.position = geolocationPositionProperty;
        geolocationPositionProperty.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        geolocationPositionProperty.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        geolocationPositionProperty.maxNumSamples = 10;
        this.geolocationEntity.orientation = new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY);
        this.orientationEntity.position = undefined;
        var orientationProperty = new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion);
        this.orientationEntity.orientation = orientationProperty;
        orientationProperty.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        orientationProperty.backwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
        orientationProperty.maxNumSamples = 10;
        application.on(application.orientationChangedEvent, function () {
            _this.updateDeviceState();
        });
        realityService.viewStateEvent.addEventListener(function (viewState) {
            if (vuforia.api) {
                var desiredFov = viewState.subviews[0].frustum.fov;
                // convert the desired fov to the appropriate scale factor
                var defaultFov = _this.state.defaultFov;
                var desiredHalfLength = Math.tan(0.5 * desiredFov);
                var defaultHalfLength = Math.tan(0.5 * defaultFov);
                var scaleFactor = defaultHalfLength / desiredHalfLength;
                // make sure the video is scaled as appropriately
                vuforia.api.setScaleFactor(scaleFactor);
                // update the videoView
                _this.configureVuforiaVideoBackground(viewState.viewport);
            }
        });
    }
    NativescriptDeviceService.prototype.updateDeviceState = function () {
        this.state.viewport = this.getMaximumViewport();
        if (vuforia.api && vuforia.api.getDevice().isViewerActive()) {
            var device = vuforia.api.getDevice();
            var renderingPrimitives = device.getRenderingPrimitives();
            var renderingViews = renderingPrimitives.getRenderingViews();
            var numViews = renderingViews.getNumViews();
            var subviews = this.state.subviews;
            var contentScaleFactor = vuforia.videoView.ios.contentScaleFactor;
            for (var i = 0; i < numViews; i++) {
                var view = renderingViews.getView(i);
                if (view === 3 /* PostProcess */)
                    continue;
                var type = void 0;
                switch (view) {
                    case 1 /* LeftEye */:
                        type = Argon.SubviewType.LEFTEYE;
                        break;
                    case 2 /* RightEye */:
                        type = Argon.SubviewType.RIGHTEYE;
                        break;
                    case 0 /* Singular */:
                        type = Argon.SubviewType.SINGULAR;
                        break;
                    default:
                        type = Argon.SubviewType.OTHER;
                        break;
                }
                // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
                // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
                var projectionMatrix = renderingPrimitives.getProjectionMatrix(view, 1 /* Camera */);
                renderingPrimitives.getEyeDisplayAdjustmentMatrix;
                // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation vuforia's video (at least on iOS) is the landscape right orientation,
                // this is the orientation where the device is held in landscape with the home button on the right. 
                // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
                // So, we want to undo this rotation which vuforia applies for us.  
                // TODO: calculate this matrix only when we have to (when the interface orientation changes)
                var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + getDisplayOrientation() * Math.PI / 180), scratchQuaternion), ONE, scratchMatrix4);
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
                // var scaleFactor = vuforia.api.getScaleFactor();
                // // scale x-axis
                // projectionMatrix[0] *= scaleFactor; // x
                // projectionMatrix[1] *= scaleFactor; // y
                // projectionMatrix[2] *= scaleFactor; // z
                // projectionMatrix[3] *= scaleFactor; // w
                // // scale y-axis
                // projectionMatrix[4] *= scaleFactor; // x
                // projectionMatrix[5] *= scaleFactor; // y
                // projectionMatrix[6] *= scaleFactor; // z
                // projectionMatrix[7] *= scaleFactor; // w
                var vuforiaViewport = renderingPrimitives.getViewport(view);
                var frustum = Argon.decomposePerspectiveProjectionMatrix(projectionMatrix, scratchFrustum);
                var subview = subviews[i] || {};
                subview.type = type;
                subview.viewport = subview.viewport || {};
                subview.viewport.x = vuforiaViewport.x / contentScaleFactor;
                subview.viewport.y = vuforiaViewport.y / contentScaleFactor;
                subview.viewport.width = vuforiaViewport.z / contentScaleFactor;
                subview.viewport.height = vuforiaViewport.w / contentScaleFactor;
                subview.frustum = subview.frustum || {
                    fov: subviews[0].frustum.fov || this.state.defaultFov
                };
                // subview.frustum.fov = frustum.fov;
                subview.frustum.aspectRatio = frustum.aspectRatio;
                subview.frustum.xOffset = frustum.xOffset;
                subview.frustum.yOffset = frustum.yOffset;
                // todo: deprecate projectionMatrix here
                // subview.projectionMatrix = Matrix4.toArray(projectionMatrix, []);
                subviews[i] = subview;
            }
            this.state.strictSubviewViewports = true;
            this.state.strictViewport = true;
        }
        else {
            this.state.subviews.length = 1;
            var subview = this.state.subviews[0];
            subview.type = Argon.SubviewType.SINGULAR;
            subview.viewport = undefined;
            subview.pose = undefined;
            subview.frustum.aspectRatio = this.state.viewport.width / this.state.viewport.height;
            this.state.strictSubviewViewports = false;
            this.state.strictViewport = false;
        }
        if (application.ios && this.motionManager) {
            var time_1 = JulianDate.now();
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
                            if (JulianDate.secondsDifference(time_1, this.calibStartTime) > 5) {
                            }
                        }
                        break;
                    case 1 /* Medium */:
                    case 2 /* High */:
                        if (this.calibrating) {
                            // let's only stop calibration if it's been a little bit since we stopped
                            if (JulianDate.secondsDifference(time_1, this.calibStartTime) > 2) {
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
                var sampledOrientation = this.orientationEntity.orientation;
                sampledOrientation.addSample(time_1, orientation);
                if (!Argon.Cesium.defined(this.orientationEntity.position)) {
                    this.orientationEntity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.geolocationEntity);
                }
            }
        }
        var displayOrientation = getDisplayOrientation();
        var displayOrientationRad = Argon.Cesium.CesiumMath.toRadians(displayOrientation);
        var displayOrientationProperty = this.displayEntity.orientation;
        displayOrientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, displayOrientationRad, scratchQuaternion));
        _super.prototype.updateDeviceState.call(this);
    };
    NativescriptDeviceService.prototype.startLocationUpdates = function () {
        var _this = this;
        _super.prototype.startLocationUpdates.call(this);
        if (typeof this.locationWatchId !== 'undefined')
            return;
        // Note: the d.ts for nativescript-geolocation is wrong. This call is correct. 
        // Casting the module as <any> here for now to hide annoying typescript errors...
        this.locationWatchId = geolocation.watchLocation(function (location) {
            // Note: iOS documentation states that the altitude value refers to height (meters) above sea level, but 
            // if ios is reporting the standard gps defined altitude, then this theoretical "sea level" actually refers to 
            // the WGS84 ellipsoid rather than traditional mean sea level (MSL) which is not a simple surface and varies 
            // according to the local gravitational field. 
            // In other words, my best guess is that the altitude value here is *probably* GPS defined altitude, which 
            // is equivalent to the height above the WGS84 ellipsoid, which is exactly what Cesium expects...
            var locationTime = Argon.Cesium.JulianDate.fromDate(location.timestamp, scratchTime);
            var sampledPosition = _this.geolocationEntity.position;
            var position = Argon.Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude, location.altitude, Argon.Cesium.Ellipsoid.WGS84, scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
            var enuOrientation = Transforms.headingPitchRollQuaternion(position, 0, 0, 0, undefined, scratchECEFQuaternion);
            _this.geolocationEntity.orientation.setValue(enuOrientation);
            _this.updateDeviceState();
        }, function (e) {
            console.log(e);
        }, {
            desiredAccuracy: application.ios ? kCLLocationAccuracyBest : 0,
            updateDistance: application.ios ? kCLDistanceFilterNone : 0
        });
        console.log("Creating location watcher. " + this.locationWatchId);
        if (application.ios) {
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
    NativescriptDeviceService.prototype.startOrientationUpdates = function () {
        _super.prototype.startOrientationUpdates.call(this);
        if (this.motionManager)
            return;
        var motionManager = CMMotionManager.alloc().init();
        motionManager.deviceMotionUpdateInterval = 1.0 / 100.0;
        if (!motionManager.deviceMotionAvailable || !motionManager.magnetometerAvailable) {
            console.log("NO Magnetometer and/or Gyro. ");
            alert("Need a device with gyroscope and magnetometer to get 3D device orientation");
        }
        else {
            var effectiveReferenceFrame = void 0;
            if (CMMotionManager.availableAttitudeReferenceFrames() & 8 /* XTrueNorthZVertical */) {
                effectiveReferenceFrame = 8 /* XTrueNorthZVertical */;
                // During testing of orientation problems, we tried 
                // turning on each of the individual updateds
                // to see if that helped.  It didn't, but here's the code:
                // motionManager.startMagnetometerUpdates();
                // motionManager.startGyroUpdates();
                // motionManager.startAccelerometerUpdates();
                motionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
            }
            else {
                alert("Need a device with magnetometer to get full 3D device orientation");
                console.log("NO  CMAttitudeReferenceFrameXTrueNorthZVertical");
            }
        }
        this.motionManager = motionManager;
        // make sure the device entity has a defined pose relative to the device orientation entity
        if (this.deviceEntity.position instanceof Argon.Cesium.ConstantPositionProperty == false) {
            this.deviceEntity.position = new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.orientationEntity);
        }
        if (this.deviceEntity.orientation instanceof Argon.Cesium.ConstantProperty == false) {
            this.deviceEntity.orientation = new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY);
        }
    };
    NativescriptDeviceService.prototype.stopLocationUpdates = function () {
        _super.prototype.stopLocationUpdates.call(this);
        if (Argon.Cesium.defined(this.locationWatchId)) {
            geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = undefined;
        }
    };
    NativescriptDeviceService.prototype.stopOrientationUpdates = function () {
        // BUG:  iOS 10 seems to have issues if you turn off and then
        // turn back on CMMotion.  So, we're not turning it off here.
        // But we probably should, when the bug is fixed.
        // super.stopOrientationUpdates();
        // if (this.motionManager) {
        //     // this.motionManager.stopDeviceMotionUpdates();
        //     // this.motionManager = undefined;
        // }
    };
    NativescriptDeviceService.prototype.getMaximumViewport = function () {
        var contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        };
    };
    NativescriptDeviceService.prototype.configureVuforiaVideoBackground = function (viewport, enabled) {
        if (enabled === void 0) { enabled = true; }
        if (viewport && this.previousViewport &&
            this.previousViewport.x == viewport.x &&
            this.previousViewport.y == viewport.y &&
            this.previousViewport.width == viewport.width &&
            this.previousViewport.height == viewport.height)
            return;
        if (viewport)
            this.previousViewport = viewport;
        else
            viewport = this.previousViewport;
        if (!viewport)
            return;
        var videoView = vuforia.videoView;
        absolute_layout_1.AbsoluteLayout.setLeft(videoView, viewport.x);
        absolute_layout_1.AbsoluteLayout.setTop(videoView, viewport.y);
        videoView.width = viewport.width;
        videoView.height = viewport.height;
        var viewWidth = viewport.width;
        var viewHeight = viewport.height;
        var contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : 1;
        var cameraDevice = vuforia.api.getCameraDevice();
        var videoMode = cameraDevice.getVideoMode(exports.vuforiaCameraDeviceMode);
        var videoWidth = videoMode.width;
        var videoHeight = videoMode.height;
        var cameraCalibration = cameraDevice.getCameraCalibration();
        var videoFovs = cameraCalibration.getFieldOfViewRads();
        var videoFovX = videoFovs.x;
        var videoFovY = videoFovs.y;
        var orientation = getDisplayOrientation();
        if (orientation === 0 || orientation === 180) {
            videoWidth = videoMode.height;
            videoHeight = videoMode.width;
            videoFovX = videoFovs.y;
            videoFovY = videoFovs.x;
        }
        var widthRatio = viewWidth / videoWidth;
        var heightRatio = viewHeight / videoHeight;
        // aspect fill
        var scale = Math.max(widthRatio, heightRatio);
        // aspect fit
        // const scale = Math.min(widthRatio, heightRatio);
        // Tell the reality service what our default fov should be based on 
        // the video background configuration we have chosen
        var aspectRatio = viewWidth / viewHeight;
        if (widthRatio > heightRatio) {
            var viewFovX = videoFovX;
            if (aspectRatio > 1) {
                this.setDefaultFov(viewFovX);
            }
            else {
                var viewFovY = 2 * Math.atan(Math.tan(0.5 * viewFovX) / aspectRatio);
                this.setDefaultFov(viewFovY);
            }
        }
        else {
            var viewFovY = videoFovY;
            if (aspectRatio > 1) {
                var viewFovX = 2 * Math.atan(Math.tan(0.5 * viewFovY) * aspectRatio);
                this.setDefaultFov(viewFovX);
            }
            else {
                this.setDefaultFov(viewFovY);
            }
        }
        var config = {
            enabled: enabled,
            positionX: 0,
            positionY: 0,
            sizeX: videoWidth * scale * contentScaleFactor,
            sizeY: videoHeight * scale * contentScaleFactor,
            reflection: 0 /* Default */
        };
        console.log("Vuforia configuring video background...\n            contentScaleFactor: " + contentScaleFactor + " orientation: " + orientation + " \n            viewWidth: " + viewWidth + " viewHeight: " + viewHeight + " videoWidth: " + videoWidth + " videoHeight: " + videoHeight + " \n            config: " + JSON.stringify(config) + "\n        ");
        vuforia.api.getRenderer().setVideoBackgroundConfig(config);
        vuforia.api.onSurfaceChanged(viewWidth * contentScaleFactor, viewHeight * contentScaleFactor);
    };
    NativescriptDeviceService = __decorate([
        Argon.DI.inject(Argon.SessionService, Argon.RealityService)
    ], NativescriptDeviceService);
    return NativescriptDeviceService;
}(Argon.DeviceService));
exports.NativescriptDeviceService = NativescriptDeviceService;
function getDisplayOrientation() {
    if (application.ios) {
        var orientation = utils.ios.getter(UIApplication, UIApplication.sharedApplication).statusBarOrientation;
        switch (orientation) {
            case 0 /* Unknown */:
            case 1 /* Portrait */: return 0;
            case 2 /* PortraitUpsideDown */: return 180;
            case 4 /* LandscapeLeft */: return 90;
            case 3 /* LandscapeRight */: return -90;
        }
    }
    if (application.android) {
        var context = utils.ad.getApplicationContext();
        var display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        var rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return 90;
            case android.view.Surface.ROTATION_270: return -90;
        }
    }
    return 0;
}
exports.getDisplayOrientation = getDisplayOrientation;
//# sourceMappingURL=argon-device-service.js.map