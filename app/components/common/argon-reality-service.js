"use strict";
var vuforia = require("nativescript-vuforia");
var frames = require("ui/frame");
var platform = require("platform");
var absolute_layout_1 = require("ui/layouts/absolute-layout");
var argon_device_service_1 = require("./argon-device-service");
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
exports.vuforiaCameraDeviceMode = -2 /* OptimizeSpeed */;
if (vuforia.videoView && vuforia.videoView.ios) {
    vuforia.videoView.ios.contentScaleFactor =
        exports.vuforiaCameraDeviceMode === -2 /* OptimizeSpeed */ ?
            1 : platform.screen.mainScreen.scale;
}
var NativescriptRealityService = (function (_super) {
    __extends(NativescriptRealityService, _super);
    function NativescriptRealityService(sessionService, focusService) {
        return _super.call(this, sessionService, focusService) || this;
    }
    NativescriptRealityService.prototype.getMaximumViewport = function () {
        var contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getActualSize().width,
            height: contentView.getActualSize().height //contentView.getMeasuredHeight()
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
        var contentScaleFactor = vuforia.videoView.ios ? vuforia.videoView.ios.contentScaleFactor : platform.screen.mainScreen.scale;
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
        var contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : platform.screen.mainScreen.scale;
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
    return NativescriptRealityService;
}(Argon.RealityService));
NativescriptRealityService = __decorate([
    Argon.DI.inject(Argon.SessionService, Argon.FocusService)
], NativescriptRealityService);
exports.NativescriptRealityService = NativescriptRealityService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tcmVhbGl0eS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tcmVhbGl0eS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSw4Q0FBZ0Q7QUFHaEQsaUNBQW1DO0FBQ25DLG1DQUFxQztBQUNyQyw4REFBMEQ7QUFDMUQsK0RBQTREO0FBRTVELHNDQUF3QztBQUV4QyxJQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNyQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUUzQyxJQUFNLGlCQUFpQixHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUN4RCxJQUFNLGNBQWMsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDbEQsSUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLElBQU0sY0FBYyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0FBRTdELElBQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFFckIsUUFBQSx1QkFBdUIsR0FBNEIsc0JBQXNDLENBQUM7QUFDdkcsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFJLENBQUMsa0JBQWtCO1FBQzlDLCtCQUF1QixLQUFnQyxzQkFBc0M7WUFDN0YsQ0FBQyxHQUFHLFFB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aWNhdGlvbiBmcm9tIFwiYXBwbGljYXRpb25cIjtcbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0ICogYXMgZW51bXMgZnJvbSAndWkvZW51bXMnO1xuaW1wb3J0ICogYXMgZnJhbWVzIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gJ3BsYXRmb3JtJztcbmltcG9ydCB7QWJzb2x1dGVMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvYWJzb2x1dGUtbGF5b3V0JztcbmltcG9ydCB7Z2V0RGlzcGxheU9yaWVudGF0aW9ufSBmcm9tICcuL2FyZ29uLWRldmljZS1zZXJ2aWNlJ1xuXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tIFwiQGFyZ29uanMvYXJnb25cIjtcblxuY29uc3QgTWF0cml4NCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0O1xuY29uc3QgQ2FydGVzaWFuMyA9IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuY29uc3QgUXVhdGVybmlvbiA9IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuY29uc3QgQ2VzaXVtTWF0aCA9IEFyZ29uLkNlc2l1bS5DZXNpdW1NYXRoO1xuXG5jb25zdCBzY3JhdGNoUXVhdGVybmlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbigpO1xuY29uc3Qgc2NyYXRjaE1hdHJpeDQgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDQoKTtcbmNvbnN0IHNjcmF0Y2hBcnJheSA9IFtdO1xuY29uc3Qgc2NyYXRjaEZydXN0dW0gPSBuZXcgQXJnb24uQ2VzaXVtLlBlcnNwZWN0aXZlRnJ1c3R1bSgpO1xuXG5jb25zdCBPTkUgPSBuZXcgQ2FydGVzaWFuMygxLDEsMSk7XG5cbmV4cG9ydCBjb25zdCB2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZTp2dWZvcmlhLkNhbWVyYURldmljZU1vZGUgPSB2dWZvcmlhLkNhbWVyYURldmljZU1vZGUuT3B0aW1pemVTcGVlZDtcbmlmICh2dWZvcmlhLnZpZGVvVmlldyAmJiB2dWZvcmlhLnZpZGVvVmlldy5pb3MpIHtcbiAgICAoPFVJVmlldz52dWZvcmlhLnZpZGVvVmlldy5pb3MpLmNvbnRlbnRTY2FsZUZhY3RvciA9IFxuICAgICAgICB2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZSA9PT0gPHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlTW9kZT4gdnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlLk9wdGltaXplU3BlZWQgPyBcbiAgICAgICAgMSA6IHBsYXRmb3JtLnNjcmVlbi5tYWluU2NyZWVuLnNjYWxlO1xufVxuXG5AQXJnb24uREkuaW5qZWN0KFxuICAgIEFyZ29uLlNlc3Npb25TZXJ2aWNlLFxuICAgIEFyZ29uLkZvY3VzU2VydmljZSlcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHRSZWFsaXR5U2VydmljZSBleHRlbmRzIEFyZ29uLlJlYWxpdHlTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6IEFyZ29uLlNlc3Npb25TZXJ2aWNlLFxuICAgICAgICBmb2N1c1NlcnZpY2U6IEFyZ29uLkZvY3VzU2VydmljZSkge1xuICAgICAgICBzdXBlcihzZXNzaW9uU2VydmljZSwgZm9jdXNTZXJ2aWNlKTtcbiAgICB9XG5cbiAgICBnZXRNYXhpbXVtVmlld3BvcnQoKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gZnJhbWVzLnRvcG1vc3QoKS5jdXJyZW50UGFnZS5jb250ZW50O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICB3aWR0aDogY29udGVudFZpZXcuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoLCAvL2NvbnRlbnRWaWV3LmdldE1lYXN1cmVkV2lkdGgoKSxcbiAgICAgICAgICAgIGhlaWdodDogY29udGVudFZpZXcuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodCAvL2NvbnRlbnRWaWV3LmdldE1lYXN1cmVkSGVpZ2h0KClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uR2VuZXJhdGVWaWV3RnJvbUV5ZVBhcmFtZXRlcnMoZXllOiBBcmdvbi5TZXJpYWxpemVkRXllUGFyYW1ldGVycykgOiBBcmdvbi5TZXJpYWxpemVkVmlld1BhcmFtZXRlcnMge1xuICAgICAgICBpZiAodnVmb3JpYS5hcGkpIHtcbiAgICAgICAgICAgIGlmICh2dWZvcmlhLmFwaS5nZXREZXZpY2UoKS5pc1ZpZXdlckFjdGl2ZSgpKSB7XG4gICAgICAgICAgICAgICAgZXllLnZpZXdwb3J0ID0gdGhpcy5nZXRNYXhpbXVtVmlld3BvcnQoKTtcbiAgICAgICAgICAgICAgICB2dWZvcmlhLmFwaS5zZXRTY2FsZUZhY3Rvcih2dWZvcmlhLmFwaS5nZXRWaWV3ZXJTY2FsZUZhY3RvcigpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXllLnZpZXdwb3J0ID0gZXllLnZpZXdwb3J0IHx8IHRoaXMuZ2V0TWF4aW11bVZpZXdwb3J0KCk7XG4gICAgICAgICAgICAgICAgLy8gY29udmVydCBvdXIgZGVzaXJlZCBmb3YgdG8gdGhlIHNjYWxlIGZhY3RvclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc2lyZWRGb3YgPSBleWUuZm92IHx8IHRoaXMuZ2V0RGVzaXJlZEZvdigpIHx8IHRoaXMuZ2V0RGVmYXVsdEZvdigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRGb3YgPSB0aGlzLmdldERlZmF1bHRGb3YoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXNpcmVkSGFsZkxlbmd0aCA9IE1hdGgudGFuKDAuNSpkZXNpcmVkRm92KTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWZhdWx0SGFsZkxlbmd0aCA9IE1hdGgudGFuKDAuNSpkZWZhdWx0Rm92KTtcbiAgICAgICAgICAgICAgICBjb25zdCBzY2FsZUZhY3RvciA9ICBkZWZhdWx0SGFsZkxlbmd0aCAvIGRlc2lyZWRIYWxmTGVuZ3RoO1xuICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgdmlkZW8gaXMgc2NhbGVkIGFzIGFwcHJvcHJpYXRlXG4gICAgICAgICAgICAgICAgdnVmb3JpYS5hcGkuc2V0U2NhbGVGYWN0b3Ioc2NhbGVGYWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSB2aWRlb1ZpZXcgICAgICAgXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyZVZ1Zm9yaWFWaWRlb0JhY2tncm91bmQoZXllLnZpZXdwb3J0KTtcbiAgICAgICAgICAgIC8vIGNvbXB1dGUgdGhlIHZ1Zm9yaWEtYmFzZWQgdmlldyBjb25maWd1cmFpdG9uXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRWdWZvcmlhVmlld0NvbmZpZ3VyYXRpb24oZXllKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIub25HZW5lcmF0ZVZpZXdGcm9tRXllUGFyYW1ldGVycyhleWUpO1xuICAgIH1cblxuICAgIGdldFZ1Zm9yaWFWaWV3Q29uZmlndXJhdGlvbihleWU6IEFyZ29uLlNlcmlhbGl6ZWRFeWVQYXJhbWV0ZXJzKSB7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBjb25zdCByZW5kZXJpbmdQcmltaXRpdmVzID0gZGV2aWNlLmdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyaW5nVmlld3MgPSByZW5kZXJpbmdQcmltaXRpdmVzLmdldFJlbmRlcmluZ1ZpZXdzKCk7XG4gICAgICAgIGNvbnN0IG51bVZpZXdzID0gcmVuZGVyaW5nVmlld3MuZ2V0TnVtVmlld3MoKVxuXG4gICAgICAgIGNvbnN0IHN1YnZpZXdzID0gPEFycmF5PEFyZ29uLlNlcmlhbGl6ZWRTdWJ2aWV3Pj5bXTtcbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gdnVmb3JpYS52aWRlb1ZpZXcuaW9zID8gdnVmb3JpYS52aWRlb1ZpZXcuaW9zLmNvbnRlbnRTY2FsZUZhY3RvciA6IHBsYXRmb3JtLnNjcmVlbi5tYWluU2NyZWVuLnNjYWxlO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVmlld3M7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IHJlbmRlcmluZ1ZpZXdzLmdldFZpZXcoaSk7XG4gICAgICAgICAgICBpZiAodmlldyA9PT0gdnVmb3JpYS5WaWV3LlBvc3RQcm9jZXNzKSBjb250aW51ZTtcblxuICAgICAgICAgICAgbGV0IHR5cGU6IEFyZ29uLlN1YnZpZXdUeXBlO1xuICAgICAgICAgICAgc3dpdGNoICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgY2FzZSB2dWZvcmlhLlZpZXcuTGVmdEV5ZTpcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IEFyZ29uLlN1YnZpZXdUeXBlLkxFRlRFWUU7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LlJpZ2h0RXllOlxuICAgICAgICAgICAgICAgICAgICB0eXBlID0gQXJnb24uU3Vidmlld1R5cGUuUklHSFRFWUU7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgdnVmb3JpYS5WaWV3LlNpbmd1bGFyOlxuICAgICAgICAgICAgICAgICAgICB0eXBlID0gQXJnb24uU3Vidmlld1R5cGUuU0lOR1VMQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSBBcmdvbi5TdWJ2aWV3VHlwZS5PVEhFUjsgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IFZ1Zm9yaWEgdXNlcyBhIHJpZ2h0LWhhbmRlZCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHggdG8gdGhlIHJpZ2h0LCB5IGRvd24sIGFuZCB6IGFzIHRoZSB2aWV3aW5nIGRpcmVjdGlvbi5cbiAgICAgICAgICAgIC8vIFNvIHdlIGFyZSBjb252ZXJ0aW5nIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uIG9mIHggdG8gdGhlIHJpZ2h0LCB5IHVwLCBhbmQgLXogYXMgdGhlIHZpZXdpbmcgZGlyZWN0aW9uLiBcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gPGFueT5yZW5kZXJpbmdQcmltaXRpdmVzLmdldFByb2plY3Rpb25NYXRyaXgodmlldywgdnVmb3JpYS5Db29yZGluYXRlU3lzdGVtVHlwZS5DYW1lcmEpO1xuICAgICAgICAgICAgcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeFxuXG4gICAgICAgICAgICAvLyBjb25zdCBleWVBZGp1c3RtZW50TWF0cml4ID0gcmVuZGVyaW5nUHJpbWl0aXZlcy5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3KTtcbiAgICAgICAgICAgIC8vIGxldCBwcm9qZWN0aW9uTWF0cml4ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQubXVsdGlwbHkocmF3UHJvamVjdGlvbk1hdHJpeCwgZXllQWRqdXN0bWVudE1hdHJpeCwgW10pO1xuICAgICAgICAgICAgLy8gcHJvamVjdGlvbk1hdHJpeCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0LmZyb21Sb3dNYWpvckFycmF5KHByb2plY3Rpb25NYXRyaXgsIHByb2plY3Rpb25NYXRyaXgpO1xuXG4gICAgICAgICAgICAvLyBVbmRvIHRoZSB2aWRlbyByb3RhdGlvbiBzaW5jZSB3ZSBhbHJlYWR5IGVuY29kZSB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGluIG91ciB2aWV3IHBvc2VcbiAgICAgICAgICAgIC8vIE5vdGU6IHRoZSBcImJhc2VcIiByb3RhdGlvbiB2dWZvcmlhJ3MgdmlkZW8gKGF0IGxlYXN0IG9uIGlPUykgaXMgdGhlIGxhbmRzY2FwZSByaWdodCBvcmllbnRhdGlvbixcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgdGhlIG9yaWVudGF0aW9uIHdoZXJlIHRoZSBkZXZpY2UgaXMgaGVsZCBpbiBsYW5kc2NhcGUgd2l0aCB0aGUgaG9tZSBidXR0b24gb24gdGhlIHJpZ2h0LiBcbiAgICAgICAgICAgIC8vIFRoaXMgXCJiYXNlXCIgdmlkZW8gcm90YXRhdGlvbiBpcyAtOTAgZGVnIGFyb3VuZCAreiBmcm9tIHRoZSBwb3J0cmFpdCBpbnRlcmZhY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgIC8vIFNvLCB3ZSB3YW50IHRvIHVuZG8gdGhpcyByb3RhdGlvbiB3aGljaCB2dWZvcmlhIGFwcGxpZXMgZm9yIHVzLiAgXG4gICAgICAgICAgICAvLyBUT0RPOiBjYWxjdWxhdGUgdGhpcyBtYXRyaXggb25seSB3aGVuIHdlIGhhdmUgdG8gKHdoZW4gdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBjaGFuZ2VzKVxuICAgICAgICAgICAgY29uc3QgaW52ZXJzZVZpZGVvUm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmZyb21UcmFuc2xhdGlvblF1YXRlcm5pb25Sb3RhdGlvblNjYWxlKFxuICAgICAgICAgICAgICAgIENhcnRlc2lhbjMuWkVSTyxcbiAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIC0oQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyArIGdldERpc3BsYXlPcmllbnRhdGlvbigpICogTWF0aC5QSSAvIDE4MCksIHNjcmF0Y2hRdWF0ZXJuaW9uKSxcbiAgICAgICAgICAgICAgICBPTkUsXG4gICAgICAgICAgICAgICAgc2NyYXRjaE1hdHJpeDRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBBcmdvbi5DZXNpdW0uTWF0cml4NC5tdWx0aXBseShwcm9qZWN0aW9uTWF0cml4LCBpbnZlcnNlVmlkZW9Sb3RhdGlvbk1hdHJpeCwgcHJvamVjdGlvbk1hdHJpeCk7XG5cbiAgICAgICAgICAgIC8vIGNvbnZlcnQgZnJvbSB0aGUgdnVmb3JpYSBwcm9qZWN0aW9uIG1hdHJpeCAoK1ggLVkgK1gpIHRvIGEgbW9yZSBzdGFuZGFyZCBjb252ZW50aW9uICgrWCArWSAtWilcbiAgICAgICAgICAgIC8vIGJ5IG5lZ2F0aW5nIHRoZSBhcHByb3ByaWF0ZSByb3dzLiBcbiAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS9saWJyYXJ5L2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1Vc2UtdGhlLUNhbWVyYS1Qcm9qZWN0aW9uLU1hdHJpeFxuXG4gICAgICAgICAgICAvLyBmbGlwIHkgYXhpcyBzbyBpdCBpcyBwb3NpdGl2ZVxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs0XSAqPSAtMTsgLy8geFxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs1XSAqPSAtMTsgLy8geVxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs2XSAqPSAtMTsgLy8gelxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFs3XSAqPSAtMTsgLy8gd1xuICAgICAgICAgICAgLy8gZmxpcCB6IGF4aXMgc28gaXQgaXMgbmVnYXRpdmVcbiAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbOF0gKj0gLTE7ICAvLyB4XG4gICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzldICo9IC0xOyAgLy8geVxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxMF0gKj0gLTE7IC8vIHpcbiAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXhbMTFdICo9IC0xOyAvLyB3XG5cbiAgICAgICAgICAgIHZhciBzY2FsZUZhY3RvciA9IHZ1Zm9yaWEuYXBpLmdldFNjYWxlRmFjdG9yKCk7XG5cbiAgICAgICAgICAgIC8vIHNjYWxlIHgtYXhpc1xuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFswXSAqPSBzY2FsZUZhY3RvcjsgLy8geFxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsxXSAqPSBzY2FsZUZhY3RvcjsgLy8geVxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFsyXSAqPSBzY2FsZUZhY3RvcjsgLy8gelxuICAgICAgICAgICAgcHJvamVjdGlvbk1hdHJpeFszXSAqPSBzY2FsZUZhY3RvcjsgLy8gd1xuICAgICAgICAgICAgLy8gc2NhbGUgeS1heGlzXG4gICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzRdICo9IHNjYWxlRmFjdG9yOyAvLyB4XG4gICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzVdICo9IHNjYWxlRmFjdG9yOyAvLyB5XG4gICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzZdICo9IHNjYWxlRmFjdG9yOyAvLyB6XG4gICAgICAgICAgICBwcm9qZWN0aW9uTWF0cml4WzddICo9IHNjYWxlRmFjdG9yOyAvLyB3XG5cbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFWaWV3cG9ydCA9IHJlbmRlcmluZ1ByaW1pdGl2ZXMuZ2V0Vmlld3BvcnQodmlldyk7XG4gICAgICAgICAgICBjb25zdCB2aWV3cG9ydCA9IHtcbiAgICAgICAgICAgICAgICB4OiB2dWZvcmlhVmlld3BvcnQueCAvIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICB5OiB2dWZvcmlhVmlld3BvcnQueSAvIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICB3aWR0aDogdnVmb3JpYVZpZXdwb3J0LnogLyBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiB2dWZvcmlhVmlld3BvcnQudyAvIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgZnJ1c3R1bSA9IEFyZ29uLmRlY29tcG9zZVBlcnNwZWN0aXZlUHJvamVjdGlvbk1hdHJpeChwcm9qZWN0aW9uTWF0cml4LCBzY3JhdGNoRnJ1c3R1bSk7XG5cbiAgICAgICAgICAgIHN1YnZpZXdzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgZnJ1c3R1bToge1xuICAgICAgICAgICAgICAgICAgICBmb3Y6IGZydXN0dW0uZm92LFxuICAgICAgICAgICAgICAgICAgICBhc3BlY3RSYXRpbzogZnJ1c3R1bS5hc3BlY3RSYXRpbyxcbiAgICAgICAgICAgICAgICAgICAgeE9mZnNldDogZnJ1c3R1bS54T2Zmc2V0LFxuICAgICAgICAgICAgICAgICAgICB5T2Zmc2V0OiBmcnVzdHVtLnlPZmZzZXRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb25NYXRyaXg6IE1hdHJpeDQudG9BcnJheShwcm9qZWN0aW9uTWF0cml4LCBbXSksXG4gICAgICAgICAgICAgICAgdmlld3BvcnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29uc3RydWN0IHRoZSBmaW5hbCB2aWV3IHBhcmFtZXRlcnMgZm9yIHRoaXMgZnJhbWVcbiAgICAgICAgY29uc3QgdmlldzogQXJnb24uU2VyaWFsaXplZFZpZXdQYXJhbWV0ZXJzID0ge1xuICAgICAgICAgICAgdmlld3BvcnQ6IDxBcmdvbi5WaWV3cG9ydD5leWUudmlld3BvcnQsXG4gICAgICAgICAgICBwb3NlOiBleWUucG9zZSxcbiAgICAgICAgICAgIHN1YnZpZXdzXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmlldztcbiAgICB9XG5cbiAgICBwcmV2aW91c1ZpZXdwb3J0OkFyZ29uLlZpZXdwb3J0O1xuXG4gICAgY29uZmlndXJlVnVmb3JpYVZpZGVvQmFja2dyb3VuZCh2aWV3cG9ydD86QXJnb24uVmlld3BvcnQsIGVuYWJsZWQ9dHJ1ZSkge1xuXG4gICAgICAgIGlmICh2aWV3cG9ydCAmJiB0aGlzLnByZXZpb3VzVmlld3BvcnQgJiYgXG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzVmlld3BvcnQueCA9PSB2aWV3cG9ydC54ICYmXG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzVmlld3BvcnQueSA9PSB2aWV3cG9ydC55ICYmXG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzVmlld3BvcnQud2lkdGggPT0gdmlld3BvcnQud2lkdGggJiZcbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNWaWV3cG9ydC5oZWlnaHQgPT0gdmlld3BvcnQuaGVpZ2h0KSByZXR1cm47XG5cbiAgICAgICAgaWYgKHZpZXdwb3J0KSBcbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNWaWV3cG9ydCA9IHZpZXdwb3J0O1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgdmlld3BvcnQgPSB0aGlzLnByZXZpb3VzVmlld3BvcnQ7XG5cbiAgICAgICAgaWYgKCF2aWV3cG9ydCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHZpZGVvVmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgICAgICBBYnNvbHV0ZUxheW91dC5zZXRMZWZ0KHZpZGVvVmlldywgdmlld3BvcnQueCk7XG4gICAgICAgIEFic29sdXRlTGF5b3V0LnNldFRvcCh2aWRlb1ZpZXcsIHZpZXdwb3J0LnkpO1xuICAgICAgICB2aWRlb1ZpZXcud2lkdGggPSB2aWV3cG9ydC53aWR0aDtcbiAgICAgICAgdmlkZW9WaWV3LmhlaWdodCA9IHZpZXdwb3J0LmhlaWdodDtcblxuICAgICAgICBjb25zdCB2aWV3V2lkdGggPSB2aWV3cG9ydC53aWR0aDtcbiAgICAgICAgY29uc3Qgdmlld0hlaWdodCA9IHZpZXdwb3J0LmhlaWdodDtcbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gdmlkZW9WaWV3LmlvcyA/IHZpZGVvVmlldy5pb3MuY29udGVudFNjYWxlRmFjdG9yIDogcGxhdGZvcm0uc2NyZWVuLm1haW5TY3JlZW4uc2NhbGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjYW1lcmFEZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKTtcbiAgICAgICAgY29uc3QgdmlkZW9Nb2RlID0gY2FtZXJhRGV2aWNlLmdldFZpZGVvTW9kZSh2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZSk7XG4gICAgICAgIGxldCB2aWRlb1dpZHRoID0gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICBsZXQgdmlkZW9IZWlnaHQgPSB2aWRlb01vZGUuaGVpZ2h0O1xuXG4gICAgICAgIGNvbnN0IGNhbWVyYUNhbGlicmF0aW9uID0gY2FtZXJhRGV2aWNlLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgICAgIGNvbnN0IHZpZGVvRm92cyA9IGNhbWVyYUNhbGlicmF0aW9uLmdldEZpZWxkT2ZWaWV3UmFkcygpO1xuICAgICAgICBsZXQgdmlkZW9Gb3ZYID0gdmlkZW9Gb3ZzLng7XG4gICAgICAgIGxldCB2aWRlb0ZvdlkgPSB2aWRlb0ZvdnMueTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gZ2V0RGlzcGxheU9yaWVudGF0aW9uKCk7XG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA9PT0gMCB8fCBvcmllbnRhdGlvbiA9PT0gMTgwKSB7XG4gICAgICAgICAgICB2aWRlb1dpZHRoID0gdmlkZW9Nb2RlLmhlaWdodDtcbiAgICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICAgICAgdmlkZW9Gb3ZYID0gdmlkZW9Gb3ZzLnk7XG4gICAgICAgICAgICB2aWRlb0ZvdlkgPSB2aWRlb0ZvdnMueDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2lkdGhSYXRpbyA9IHZpZXdXaWR0aCAvIHZpZGVvV2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodFJhdGlvID0gdmlld0hlaWdodCAvIHZpZGVvSGVpZ2h0O1xuICAgICAgICAvLyBhc3BlY3QgZmlsbFxuICAgICAgICBjb25zdCBzY2FsZSA9IE1hdGgubWF4KHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcbiAgICAgICAgLy8gYXNwZWN0IGZpdFxuICAgICAgICAvLyBjb25zdCBzY2FsZSA9IE1hdGgubWluKHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcblxuICAgICAgICAvLyBUZWxsIHRoZSByZWFsaXR5IHNlcnZpY2Ugd2hhdCBvdXIgZGVmYXVsdCBmb3Ygc2hvdWxkIGJlIGJhc2VkIG9uIFxuICAgICAgICAvLyB0aGUgdmlkZW8gYmFja2dyb3VuZCBjb25maWd1cmF0aW9uIHdlIGhhdmUgY2hvc2VuXG4gICAgICAgIGNvbnN0IGFzcGVjdFJhdGlvID0gdmlld1dpZHRoIC8gdmlld0hlaWdodDtcbiAgICAgICAgaWYgKHdpZHRoUmF0aW8gPiBoZWlnaHRSYXRpbykge1xuICAgICAgICAgICAgY29uc3Qgdmlld0ZvdlggPSB2aWRlb0Zvdlg7XG4gICAgICAgICAgICBpZiAoYXNwZWN0UmF0aW8gPiAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXREZWZhdWx0Rm92KHZpZXdGb3ZYKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgdmlld0ZvdlkgPSAyICogTWF0aC5hdGFuKE1hdGgudGFuKDAuNSAqIHZpZXdGb3ZYKSAvIGFzcGVjdFJhdGlvKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldERlZmF1bHRGb3Yodmlld0ZvdlkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgdmlld0ZvdlkgPSB2aWRlb0Zvdlk7XG4gICAgICAgICAgICBpZiAoYXNwZWN0UmF0aW8gPiAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgdmlld0ZvdlggPSAyICogTWF0aC5hdGFuKE1hdGgudGFuKDAuNSAqIHZpZXdGb3ZZKSAqIGFzcGVjdFJhdGlvKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldERlZmF1bHRGb3Yodmlld0ZvdlgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldERlZmF1bHRGb3Yodmlld0ZvdlkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICAgICAgICBlbmFibGVkLFxuICAgICAgICAgICAgcG9zaXRpb25YOjAsXG4gICAgICAgICAgICBwb3NpdGlvblk6MCxcbiAgICAgICAgICAgIHNpemVYOiB2aWRlb1dpZHRoICogc2NhbGUgKiBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgICAgICBzaXplWTogdmlkZW9IZWlnaHQgKiBzY2FsZSAqIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgICAgIHJlZmxlY3Rpb246IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kUmVmbGVjdGlvbi5EZWZhdWx0XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhIGNvbmZpZ3VyaW5nIHZpZGVvIGJhY2tncm91bmQuLi5cbiAgICAgICAgICAgIGNvbnRlbnRTY2FsZUZhY3RvcjogJHtjb250ZW50U2NhbGVGYWN0b3J9IG9yaWVudGF0aW9uOiAke29yaWVudGF0aW9ufSBcbiAgICAgICAgICAgIHZpZXdXaWR0aDogJHt2aWV3V2lkdGh9IHZpZXdIZWlnaHQ6ICR7dmlld0hlaWdodH0gdmlkZW9XaWR0aDogJHt2aWRlb1dpZHRofSB2aWRlb0hlaWdodDogJHt2aWRlb0hlaWdodH0gXG4gICAgICAgICAgICBjb25maWc6ICR7SlNPTi5zdHJpbmdpZnkoY29uZmlnKX1cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICB2dWZvcmlhLmFwaS5nZXRSZW5kZXJlcigpLnNldFZpZGVvQmFja2dyb3VuZENvbmZpZyhjb25maWcpO1xuICAgICAgICB2dWZvcmlhLmFwaS5vblN1cmZhY2VDaGFuZ2VkKFxuICAgICAgICAgICAgdmlld1dpZHRoICogY29udGVudFNjYWxlRmFjdG9yLCBcbiAgICAgICAgICAgIHZpZXdIZWlnaHQgKiBjb250ZW50U2NhbGVGYWN0b3JcbiAgICAgICAgKTtcbiAgICB9XG59Il19