require('globals')
import def = require('nativescript-vuforia')
import observable = require('data/observable');
import platform = require('platform');
import application = require('application');
import utils = require('utils/utils');

export abstract class APIBase implements def.API {
    abstract setLicenseKey(licenseKey:string) : boolean;
    abstract setHint(hint:def.Hint,value:number) : boolean;
    abstract init() : Promise<def.InitResult>;
    abstract deinit() : void;
    abstract getCameraDevice() : def.CameraDevice;
    abstract getDevice() : def.Device;
    abstract getRenderer() : def.Renderer;
    abstract initObjectTracker() : boolean;
    abstract getObjectTracker() : def.ObjectTracker;
    abstract deinitObjectTracker() : boolean;
	abstract getSystemBootTime() : number;
    
    protected callback:(state:def.State)=>void;

    setStateUpdateCallback(cb:(state:def.State)=>void) {
        this.callback = cb;
    }

    // getViewerScaleFactor() {
    //     //    static const float VIRTUAL_FOV_Y_DEGS = 85.0f;

    //     // Get the y-dimension of the physical camera field of view
    //     const cameraCalibration = this.getCameraDevice().getCameraCalibration();
    //     if (!cameraCalibration) return undefined;

    //     const fov = cameraCalibration.getFieldOfViewRads();
    //     const cameraFovYRad = fov.y;
        
    //     // Get the y-dimension of the virtual camera field of view
    //     Vuforia::ViewerParameters viewer = Vuforia::Device::getInstance().getSelectedViewer();
    //     float viewerFOVy = viewer.getFieldOfView().data[2] + viewer.getFieldOfView().data[3];
    //     float virtualFovYRads = viewerFOVy * M_PI / 180;
    //     //    float virtualFovYRads = VIRTUAL_FOV_Y_DEGS * M_PI / 180;
        
    //     // The scene-scale factor represents the proportion of the viewport that is filled by
    //     // the video background when projected onto the same plane.
    //     // In order to calculate this, let 'd' be the distance between the cameras and the plane.
    //     // The height of the projected image 'h' on this plane can then be calculated:
    //     //   tan(fov/2) = h/2d
    //     // which rearranges to:
    //     //   2d = h/tan(fov/2)
    //     // Since 'd' is the same for both cameras, we can combine the equations for the two cameras:
    //     //   hPhysical/tan(fovPhysical/2) = hVirtual/tan(fovVirtual/2)
    //     // Which rearranges to:
    //     //   hPhysical/hVirtual = tan(fovPhysical/2)/tan(fovVirtual/2)
    //     // ... which is the scene-scale factor
    //     return tan(cameraFovYRads / 2) / tan(virtualFovYRads / 2);
    // }
}
