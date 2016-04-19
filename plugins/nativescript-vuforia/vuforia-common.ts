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
    
    private callbacks:Array<(state:def.State)=>void> = [];
    
    protected _stateUpdateCallback(state:def.State) {
        var callbacks = this.callbacks;
        this.callbacks = [];
        callbacks.forEach((cb)=>{
            cb(state);
        });
    }

    onNextStateUpdate(cb:(state:def.State)=>void) {
        this.callbacks.push(cb);
    }
}

// declare const Object:any;

// function calculateDefaultFixedViewSize() {
//     const interfaceRotation = getInterfaceOrientation();
//     const flipXY = interfaceRotation == 90 || interfaceRotation == -90;
//     const screen = platform.screen.mainScreen;
//     const view = {
//         width: flipXY ? screen.heightDIPs : screen.widthDIPs,
//         height: flipXY ? screen.widthDIPs : screen.heightDIPs
//     };
//     Object.freeze(view);
//     return view;
// }
 
// const defaultFixedViewSize = calculateDefaultFixedViewSize()

// let customFixedViewSize:def.ViewSize;

// export function setViewSize(vs:def.ViewSize) {
//     if (!vs) {customFixedViewSize = null; return;}
//     const interfaceRotation = getInterfaceOrientation();
//     const flipXY = interfaceRotation == 90 || interfaceRotation == -90;
//     customFixedViewSize = {
//         width: flipXY ? vs.height : vs.width,
//         height: flipXY ? vs.width : vs.height
//     };
// }

// export function getViewSize() : def.ViewSize {
//     const viewSize = customFixedViewSize || defaultFixedViewSize;
//     const interfaceRotation = getInterfaceOrientation();
//     const flipXY = interfaceRotation == 90 || interfaceRotation == -90;
//     return {
//         width: flipXY ? viewSize.height : viewSize.width,
//         height: flipXY ? viewSize.width : viewSize.height
//     }
// }

// export function calculateCameraCalibrationForCurrentInterfaceOrientation(cameraCalibration:def.CameraCalibration) : def.CameraCalibration {
//     const orientation = getInterfaceOrientation();
//     const isRotated = orientation == 90 || orientation == -90;
//     const screen = platform.screen.mainScreen;
//     const isLandscape = screen.heightDIPs < screen.widthDIPs;
//     const isLandscapeNaturalOrientation = isLandscape && !isRotated;
   
//     let nCalibration;
    
//     if (isLandscapeNaturalOrientation) {
//         nCalibration = cameraCalibration;
//     } else {
//         nCalibration = {
//             sizeX: cameraCalibration.sizeY,
//             sizeY: cameraCalibration.sizeX,
//             focalLengthX: cameraCalibration.focalLengthY,
//             focalLengthY: cameraCalibration.focalLengthX,
//             principalPointX: cameraCalibration.sizeY-cameraCalibration.principalPointY,
//             principalPointY: cameraCalibration.principalPointX,
//             fieldOfViewRadX: cameraCalibration.fieldOfViewRadY,
//             fieldOfViewRadY: cameraCalibration.fieldOfViewRadX
//         }
//     }
    
//     if (orientation === 0) {
//         return nCalibration;
//     }
    
//     if (orientation === 180) {
//         nCalibration.principalPointX = nCalibration.sizeX-nCalibration.principalPointX;
//         nCalibration.principalPointY = nCalibration.sizeY-nCalibration.principalPointY;
//         return nCalibration;
//     }
    
//     if (orientation === 90) {
//         return {
//             sizeX: nCalibration.sizeY,
//             sizeY: nCalibration.sizeX,
//             focalLengthX: nCalibration.focalLengthY,
//             focalLengthY: nCalibration.focalLengthX,
//             principalPointX: nCalibration.principalPointY,
//             principalPointY: nCalibration.sizeX-nCalibration.principalPointX,
//             fieldOfViewRadX: nCalibration.fieldOfViewRadY,
//             fieldOfViewRadY: nCalibration.fieldOfViewRadX
//         }
//     }
    
//     if (orientation === -90) {
//         return {
//             sizeX: nCalibration.sizeY,
//             sizeY: nCalibration.sizeX,
//             focalLengthX: nCalibration.focalLengthY,
//             focalLengthY: nCalibration.focalLengthX,
//             principalPointX: nCalibration.sizeY-nCalibration.principalPointY,
//             principalPointY: nCalibration.principalPointX,
//             fieldOfViewRadX: nCalibration.fieldOfViewRadY,
//             fieldOfViewRadY: nCalibration.fieldOfViewRadX
//         }
//     }
// }