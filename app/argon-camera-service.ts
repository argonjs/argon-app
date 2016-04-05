import frames = require('ui/frame');
import Argon = require('argon');
import vuforia = require('nativescript-vuforia')

const _getSuggested = Argon.CameraService.prototype.getSuggested;
Argon.CameraService.prototype.getSuggested = function() {
    const frame = frames.topmost();
    const width = frame.getMeasuredWidth();
    const height = frame.getMeasuredHeight();
    
    let cameraState:Argon.Camera;
    
    if (vuforia.isSupported()) {
        const videoBackgroundConfig = vuforia.getVideoBackgroundConfig();
        const cameraCalibration = vuforia.getCameraCalibration(); // calculate the fov for the target region of the screen
        
        const widthRatio = (width / videoBackgroundConfig.sizeX);
        const heightRatio = (height / videoBackgroundConfig.sizeY);
        const renderfovX = 2 * Math.atan( Math.tan(cameraCalibration.fieldOfViewRadX * 0.5) * widthRatio );
        const renderfovY = 2 * Math.atan( Math.tan(cameraCalibration.fieldOfViewRadY * 0.5) * heightRatio );
        
        const dX = cameraCalibration.principalPointX - cameraCalibration.sizeX/2;
        const dY = cameraCalibration.principalPointY - cameraCalibration.sizeY/2;
        
        cameraState = {
            type: 'perspective',
            fovX: renderfovX,
            fovY: renderfovY,
            xOffset: videoBackgroundConfig.positionX + dX,
            yOffset: videoBackgroundConfig.positionY + dY
        }
    }
    
    if (!cameraState) {
        cameraState = _getSuggested.call(this);
    }
    
    return cameraState;
}