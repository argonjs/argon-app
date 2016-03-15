"use strict";
var frames = require('ui/frame');
var Argon = require('argon');
var vuforia = require('nativescript-vuforia');
var _getSuggested = Argon.CameraService.prototype.getSuggested;
Argon.CameraService.prototype.getSuggested = function () {
    var frame = frames.topmost();
    var width = frame.getMeasuredWidth();
    var height = frame.getMeasuredHeight();
    var cameraState;
    if (vuforia.isSupported()) {
        var videoBackgroundConfig = vuforia.getVideoBackgroundConfig();
        var cameraCalibration = vuforia.getCameraCalibration(); // calculate the fov for the target region of the screen
        var widthRatio = (width / videoBackgroundConfig.sizeX);
        var heightRatio = (height / videoBackgroundConfig.sizeY);
        var renderfovX = 2 * Math.atan(Math.tan(cameraCalibration.fieldOfViewRadX * 0.5) * widthRatio);
        var renderfovY = 2 * Math.atan(Math.tan(cameraCalibration.fieldOfViewRadY * 0.5) * heightRatio);
        var dX = cameraCalibration.principalPointX - cameraCalibration.sizeX / 2;
        var dY = cameraCalibration.principalPointY - cameraCalibration.sizeY / 2;
        cameraState = {
            type: 'perspective',
            fovX: renderfovX,
            fovY: renderfovY,
            xOffset: videoBackgroundConfig.positionX + dX,
            yOffset: videoBackgroundConfig.positionY + dY
        };
    }
    if (!cameraState) {
        cameraState = _getSuggested.call(this);
    }
    return cameraState;
};
//# sourceMappingURL=argon-camera-service.js.map