"use strict";
var frames = require('ui/frame');
var vuforia = require('nativescript-vuforia');
var argon_device_service_1 = require('./argon-device-service');
var Argon = require("argon");
var Matrix4 = Argon.Cesium.Matrix4;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var CesiumMath = Argon.Cesium.CesiumMath;
var ONE = new Cartesian3(1, 1, 1);
var NativescriptViewService = (function (_super) {
    __extends(NativescriptViewService, _super);
    function NativescriptViewService(sessionService, focusService, contextService, vuforiaDelegate) {
        _super.call(this, undefined, sessionService, focusService, contextService);
        this.vuforiaDelegate = vuforiaDelegate;
        this.scaleFactor = 1;
        this.scratchQuaternion = new Argon.Cesium.Quaternion();
        this.scratchMatrix4 = new Argon.Cesium.Matrix4();
        this.scratchFrustum = new Argon.Cesium.PerspectiveFrustum();
        this.scratchArray = [];
    }
    NativescriptViewService.prototype.getMaximumViewport = function () {
        var contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        };
    };
    NativescriptViewService.prototype.generateViewFromEyeParameters = function (eye) {
        if (vuforia.api && vuforia.api.getDevice().isViewerActive()) {
            vuforia.api.setScaleFactor(vuforia.api.getViewerScaleFactor());
            return this.getVuforiaViewConfiguration(eye.pose);
        }
        else if (vuforia.api && !eye.fov) {
            // make sure the video is scaled as appropriate
            vuforia.api.setScaleFactor(this.scaleFactor);
            return this.getVuforiaViewConfiguration(eye.pose);
        }
        var fov = eye.fov || Math.PI / 3;
        var viewport = this.getMaximumViewport();
        this.scratchFrustum.fov = fov;
        this.scratchFrustum.aspectRatio = viewport.width / viewport.height;
        this.scratchFrustum.near = 0.001;
        // const projectionMatrix = this.scratchFrustum.infiniteProjectionMatrix;
        var projectionMatrix = this.scratchFrustum.projectionMatrix;
        var scaleFactor = this.scaleFactor;
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
        var view = {
            viewport: viewport,
            pose: eye.pose,
            subviews: [
                {
                    type: Argon.SubviewType.SINGULAR,
                    projectionMatrix: Matrix4.toArray(projectionMatrix, this.scratchArray)
                }
            ]
        };
        return view;
    };
    NativescriptViewService.prototype.getVuforiaViewConfiguration = function (pose) {
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
            // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
            // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
            // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
            // Undo the video rotation since we already encode the interface orientation in our view pose
            // Note: the "base" rotation vuforia's video (at least on iOS) is the landscape right orientation,
            // this is the orientation where the device is held in landscape with the home button on the right. 
            // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
            // So, we want to undo this rotation which vuforia applies for us.  
            // TODO: calculate this matrix only when we have to (when the interface orientation changes)
            var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + argon_device_service_1.getDisplayOrientation() * Math.PI / 180), this.scratchQuaternion), ONE, this.scratchMatrix4);
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
            var viewport = renderingPrimitives.getViewport(view_1);
            subviews.push({
                type: type,
                projectionMatrix: Matrix4.toArray(projectionMatrix, this.scratchArray),
                viewport: {
                    x: viewport.x / contentScaleFactor,
                    y: viewport.y / contentScaleFactor,
                    width: viewport.z / contentScaleFactor,
                    height: viewport.w / contentScaleFactor
                }
            });
        }
        // We expect the video view (managed by the browser view) to be the 
        // same size as the current page's content view.
        var contentView = frames.topmost().currentPage.content;
        // construct the final view parameters for this frame
        var view = {
            viewport: {
                x: 0,
                y: 0,
                width: contentView.getMeasuredWidth(),
                height: contentView.getMeasuredHeight()
            },
            pose: pose,
            subviews: subviews
        };
        return view;
    };
    NativescriptViewService = __decorate([
        Argon.DI.inject(Argon.SessionService, Argon.FocusService, Argon.ContextService, Argon.VuforiaServiceDelegate)
    ], NativescriptViewService);
    return NativescriptViewService;
}(Argon.ViewService));
exports.NativescriptViewService = NativescriptViewService;
//# sourceMappingURL=argon-view-service.js.map