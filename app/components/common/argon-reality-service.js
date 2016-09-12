"use strict";
var vuforia = require('nativescript-vuforia');
var frames = require('ui/frame');
var platform = require('platform');
var absolute_layout_1 = require('ui/layouts/absolute-layout');
var argon_device_service_1 = require('./argon-device-service');
var Argon = require("@argonjs/argon");
var Matrix4 = Argon.Cesium.Matrix4;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var scratchQuaternion = new Argon.Cesium.Quaternion();
var scratchMatrix4 = new Argon.Cesium.Matrix4();
var scratchArray = [];
var scratchFrustum = new Argon.Cesium.PerspectiveFrustum();
var ONE = new Cartesian3(1, 1, 1);
exports.vuforiaCameraDeviceMode = -3 /* OpimizeQuality */;
if (vuforia.videoView.ios) {
    vuforia.videoView.ios.contentScaleFactor =
        exports.vuforiaCameraDeviceMode === -2 /* OptimizeSpeed */ ?
            1 : platform.screen.mainScreen.scale;
}
var NativescriptRealityService = (function (_super) {
    __extends(NativescriptRealityService, _super);
    function NativescriptRealityService(sessionService, focusService) {
        _super.call(this, sessionService, focusService);
    }
    NativescriptRealityService.prototype.getMaximumViewport = function () {
        var contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        };
    };
    NativescriptRealityService.prototype.onGenerateViewFromEyeParameters = function (eye) {
        if (vuforia.api) {
            if (vuforia.api.getDevice().isViewerActive()) {
                eye.viewport = this.getMaximumViewport();
                vuforia.api.setScaleFactor(vuforia.api.getViewerScaleFactor());
            }
            else {
                eye.viewport = eye.viewport || this.getMaximumViewport();
                // convert our desired fov to the scale factor
                var desiredFov = eye.fov || this.getDesiredFov() || this.getDefaultFov();
                var defaultFov = this.getDefaultFov();
                var desiredHalfLength = Math.tan(0.5 * desiredFov);
                var defaultHalfLength = Math.tan(0.5 * defaultFov);
                var scaleFactor = defaultHalfLength / desiredHalfLength;
                // make sure the video is scaled as appropriate
                vuforia.api.setScaleFactor(scaleFactor);
            }
            // update the videoView       
            this.configureVuforiaVideoBackground(eye.viewport);
            // compute the vuforia-based view configuraiton
            return this.getVuforiaViewConfiguration(eye);
        }
        return _super.prototype.onGenerateViewFromEyeParameters.call(this, eye);
    };
    NativescriptRealityService.prototype.getVuforiaViewConfiguration = function (eye) {
        var device = vuforia.api.getDevice();
        var renderingPrimitives = device.getRenderingPrimitives();
        var renderingViews = renderingPrimitives.getRenderingViews();
        var numViews = renderingViews.getNumViews();
        var subviews = [];
        var contentScaleFactor = vuforia.videoView.ios.contentScaleFactor;
        for (var i = 0; i < numViews; i++) {
            var view_1 = renderingViews.getView(i);
            if (view_1 === 3 /* PostProcess */)
                continue;
            var type = void 0;
            switch (view_1) {
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
            var projectionMatrix = renderingPrimitives.getProjectionMatrix(view_1, 1 /* Camera */);
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
            var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + argon_device_service_1.getDisplayOrientation() * Math.PI / 180), scratchQuaternion), ONE, scratchMatrix4);
            Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);
            // convert from the vuforia projection matrix (+X -Y +X) to a more standard convention (+X +Y -Z)
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
            var scaleFactor = vuforia.api.getScaleFactor();
            // scale x-axis
            projectionMatrix[0] *= scaleFactor; // x
            projectionMatrix[1] *= scaleFactor; // y
            projectionMatrix[2] *= scaleFactor; // z
            projectionMatrix[3] *= scaleFactor; // w
            // scale y-axis
            projectionMatrix[4] *= scaleFactor; // x
            projectionMatrix[5] *= scaleFactor; // y
            projectionMatrix[6] *= scaleFactor; // z
            projectionMatrix[7] *= scaleFactor; // w
            var vuforiaViewport = renderingPrimitives.getViewport(view_1);
            var viewport = {
                x: vuforiaViewport.x / contentScaleFactor,
                y: vuforiaViewport.y / contentScaleFactor,
                width: vuforiaViewport.z / contentScaleFactor,
                height: vuforiaViewport.w / contentScaleFactor
            };
            var frustum = Argon.decomposePerspectiveProjectionMatrix(projectionMatrix, scratchFrustum);
            subviews.push({
                type: type,
                frustum: {
                    fov: frustum.fov,
                    aspectRatio: frustum.aspectRatio,
                    xOffset: frustum.xOffset,
                    yOffset: frustum.yOffset
                },
                projectionMatrix: Matrix4.toArray(projectionMatrix, []),
                viewport: viewport
            });
        }
        // construct the final view parameters for this frame
        var view = {
            viewport: eye.viewport,
            pose: eye.pose,
            subviews: subviews
        };
        return view;
    };
    NativescriptRealityService.prototype.configureVuforiaVideoBackground = function (viewport, enabled) {
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
        var orientation = argon_device_service_1.getDisplayOrientation();
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
    NativescriptRealityService = __decorate([
        Argon.DI.inject(Argon.SessionService, Argon.FocusService)
    ], NativescriptRealityService);
    return NativescriptRealityService;
}(Argon.RealityService));
exports.NativescriptRealityService = NativescriptRealityService;
//# sourceMappingURL=argon-reality-service.js.map