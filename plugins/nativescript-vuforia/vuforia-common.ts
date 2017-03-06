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
    abstract getObjectTracker() : def.ObjectTracker|undefined;
    abstract deinitObjectTracker() : boolean;
    abstract setScaleFactor(f:number);
    abstract getScaleFactor() : number; 
    abstract onSurfaceChanged(width:number, height:number) : void;
    
    protected callback:(state:def.State)=>void;

    setStateUpdateCallback(cb:(state:def.State)=>void) {
        this.callback = cb;
    }

    getViewerScaleFactor() {
        // static const float VIRTUAL_FOV_Y_DEGS = 85.0f;

        // Get the y-dimension of the physical camera field of view
        const cameraCalibration = this.getCameraDevice().getCameraCalibration();
        if (!cameraCalibration) throw new Error('Unable to get camera calibration');
        const device = this.getDevice();
        if (!device.isViewerActive()) throw new Error('Viewer is not active');

        const fov = cameraCalibration.getFieldOfViewRads();
        const cameraFovYRad = fov.y;
        const viewer = device.getSelectedViewer();
        if (!viewer)  throw new Error('No viewer is selected');

        // Get the y-dimension of the virtual camera field of view
        const viewerFOV = viewer.getFieldOfView();
        const viewerFOVy = viewerFOV.y + viewerFOV.z;
        const virtualFovYRad = viewerFOVy * Math.PI / 180;
        //    float virtualFovYRad = VIRTUAL_FOV_Y_DEGS * M_PI / 180;
        
        // The viewer-scale factor represents the proportion of the viewport that is filled by
        // the video background when projected onto the same plane.
        // In order to calculate this, let 'd' be the distance between the cameras and the plane.
        // The height of the projected image 'h' on this plane can then be calculated:
        //   tan(fov/2) = h/2d
        // which rearranges to:
        //   2d = h/tan(fov/2)
        // Since 'd' is the same for both cameras, we can combine the equations for the two cameras:
        //   hPhysical/tan(fovPhysical/2) = hVirtual/tan(fovVirtual/2)
        // Which rearranges to:
        //   hPhysical/hVirtual = tan(fovPhysical/2)/tan(fovVirtual/2)
        // ... which is the scene-scale factor
        return Math.tan(cameraFovYRad / 2) / Math.tan(virtualFovYRad / 2);
    }
}
