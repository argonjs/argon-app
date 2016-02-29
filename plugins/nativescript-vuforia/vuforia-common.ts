require('globals')
import def = require('nativescript-vuforia')
import observable = require('data/observable');
import platform = require('platform');
import application = require('application');
import utils = require('utils/utils');

export const events = new observable.Observable();

export const initErrorEvent = 'initErrorEvent'
export const loadDataSetErrorEvent = 'loadDataSetErrorEvent'
export const unloadDataSetErrorEvent = 'unloadDataSetErrorEvent'
export const activateDataSetErrorEvent = 'activateDataSetErrorEvent'
export const deactivateDataSetErrorEvent = 'deactivateDataSetErrorEvent'

export const stateUpdateEvent = 'stateUpdateEvent'
export const dataSetLoadEvent = 'dataSetLoadEvent'

declare const Object:any;

function calculateDefaultFixedViewSize() {
    const interfaceRotation = getInterfaceOrientation();
    const flipXY = interfaceRotation == 90 || interfaceRotation == -90;
    const screen = platform.screen.mainScreen;
    const view = {
        width: flipXY ? screen.heightDIPs : screen.widthDIPs,
        height: flipXY ? screen.widthDIPs : screen.heightDIPs
    };
    Object.freeze(view);
    return view;
}

const defaultFixedViewSize = calculateDefaultFixedViewSize()

let customFixedViewSize:def.ViewSize;

export function setViewSize(vs:def.ViewSize) {
    if (!vs) {customFixedViewSize = null; return;}
    const interfaceRotation = getInterfaceOrientation();
    const flipXY = interfaceRotation == 90 || interfaceRotation == -90;
    customFixedViewSize = {
        width: flipXY ? vs.height : vs.width,
        height: flipXY ? vs.width : vs.height
    };
}

export function getViewSize() : def.ViewSize {
    const viewSize = customFixedViewSize || defaultFixedViewSize;
    const interfaceRotation = getInterfaceOrientation();
    const flipXY = interfaceRotation == 90 || interfaceRotation == -90;
    return {
        width: flipXY ? viewSize.height : viewSize.width,
        height: flipXY ? viewSize.width : viewSize.height
    }
}

export function calculateCameraCalibrationForCurrentInterfaceOrientation(cameraCalibration:def.CameraCalibration) : def.CameraCalibration {
    const orientation = getInterfaceOrientation();
    const isRotated = orientation == 90 || orientation == -90;
    const screen = platform.screen.mainScreen;
    const isLandscape = screen.heightDIPs < screen.widthDIPs;
    const isLandscapeNaturalOrientation = isLandscape && !isRotated;
   
    let nCalibration;
    
    if (isLandscapeNaturalOrientation) {
        nCalibration = cameraCalibration;
    } else {
        nCalibration = {
            sizeX: cameraCalibration.sizeY,
            sizeY: cameraCalibration.sizeX,
            focalLengthX: cameraCalibration.focalLengthY,
            focalLengthY: cameraCalibration.focalLengthX,
            principalPointX: cameraCalibration.sizeY-cameraCalibration.principalPointY,
            principalPointY: cameraCalibration.principalPointX,
            fieldOfViewRadX: cameraCalibration.fieldOfViewRadY,
            fieldOfViewRadY: cameraCalibration.fieldOfViewRadX
        }
    }
    
    if (orientation === 0) {
        return nCalibration;
    }
    
    if (orientation === 180) {
        nCalibration.principalPointX = nCalibration.sizeX-nCalibration.principalPointX;
        nCalibration.principalPointY = nCalibration.sizeY-nCalibration.principalPointY;
        return nCalibration;
    }
    
    if (orientation === 90) {
        return {
            sizeX: nCalibration.sizeY,
            sizeY: nCalibration.sizeX,
            focalLengthX: nCalibration.focalLengthY,
            focalLengthY: nCalibration.focalLengthX,
            principalPointX: nCalibration.principalPointY,
            principalPointY: nCalibration.sizeX-nCalibration.principalPointX,
            fieldOfViewRadX: nCalibration.fieldOfViewRadY,
            fieldOfViewRadY: nCalibration.fieldOfViewRadX
        }
    }
    
    if (orientation === -90) {
        return {
            sizeX: nCalibration.sizeY,
            sizeY: nCalibration.sizeX,
            focalLengthX: nCalibration.focalLengthY,
            focalLengthY: nCalibration.focalLengthX,
            principalPointX: nCalibration.sizeY-nCalibration.principalPointY,
            principalPointY: nCalibration.principalPointX,
            fieldOfViewRadX: nCalibration.fieldOfViewRadY,
            fieldOfViewRadY: nCalibration.fieldOfViewRadX
        }
    }
}

export function getInterfaceOrientation() : number {
    if (application.ios) {
        const orientation = UIApplication.sharedApplication().statusBarOrientation;
        switch (orientation) {
            case UIInterfaceOrientation.UIInterfaceOrientationUnknown:
            case UIInterfaceOrientation.UIInterfaceOrientationPortrait: return 0;
            case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown: return 180;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft: return 90;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight: return -90;
        }
    }
    if (application.android) {
        const context:android.content.Context = utils.ad.getApplicationContext();
        const display:android.view.Display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        const rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return 90;
            case android.view.Surface.ROTATION_270: return -90;
        }
    } 
    return 0;
}