"use strict";
var vuforia = require('nativescript-vuforia');
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
var NativescriptRealityService = (function (_super) {
    __extends(NativescriptRealityService, _super);
    function NativescriptRealityService(sessionService, focusService) {
        _super.call(this, sessionService, focusService);
    }
    NativescriptRealityService.prototype.onGenerateViewFromEyeParameters = function (eye, time) {
        if (vuforia.api) {
            if (vuforia.api.getDevice().isViewerActive()) {
                eye.viewport = Argon.ArgonSystem.instance.device.state.viewport;
                vuforia.api.setScaleFactor(vuforia.api.getViewerScaleFactor());
            }
            else {
                eye.viewport = eye.viewport || Argon.ArgonSystem.instance.device.state.viewport;
                // convert our desired fov to the scale factor
                var desiredFov = eye.fov || Argon.ArgonSystem.instance.device.state.subviews[0].frustum.fov;
                var defaultFov = Argon.ArgonSystem.instance.device.state.defaultFov;
                var desiredHalfLength = Math.tan(0.5 * desiredFov);
                var defaultHalfLength = Math.tan(0.5 * defaultFov);
                var scaleFactor = defaultHalfLength / desiredHalfLength;
                // make sure the video is scaled as appropriate
                vuforia.api.setScaleFactor(scaleFactor);
            }
            // update the videoView       
            Argon.ArgonSystem.instance.device['configureVuforiaVideoBackground'](eye.viewport);
            // compute the vuforia-based view configuraiton
            return this.getVuforiaViewConfiguration(eye, time);
        }
        return _super.prototype.onGenerateViewFromEyeParameters.call(this, eye, time);
    };
    NativescriptRealityService.prototype.getVuforiaViewConfiguration = function (eye, time) {
        var device = vuforia.api.getDevice();
        var renderingPrimitives = device.getRenderingPrimitives();
        var renderingViews = renderingPrimitives.getRenderingViews();
        var numViews = renderingViews.getNumViews();
        var subviews = [];
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
            var vuforiaViewport = renderingPrimitives.getViewport(view);
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
        return eye.pose ? {
            time: time,
            viewport: eye.viewport,
            pose: eye.pose,
            subviews: subviews
        } : undefined;
    };
    NativescriptRealityService = __decorate([
        Argon.DI.inject(Argon.SessionService, Argon.FocusService)
    ], NativescriptRealityService);
    return NativescriptRealityService;
}(Argon.RealityService));
exports.NativescriptRealityService = NativescriptRealityService;
//# sourceMappingURL=argon-reality-service.js.map