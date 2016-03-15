"use strict";
require('globals');
var observable = require('data/observable');
var platform = require('platform');
var application = require('application');
var utils = require('utils/utils');
exports.events = new observable.Observable();
exports.initErrorEvent = 'initErrorEvent';
exports.loadDataSetErrorEvent = 'loadDataSetErrorEvent';
exports.unloadDataSetErrorEvent = 'unloadDataSetErrorEvent';
exports.activateDataSetErrorEvent = 'activateDataSetErrorEvent';
exports.deactivateDataSetErrorEvent = 'deactivateDataSetErrorEvent';
exports.stateUpdateEvent = 'stateUpdateEvent';
exports.dataSetLoadEvent = 'dataSetLoadEvent';
function calculateDefaultFixedViewSize() {
    var interfaceRotation = getInterfaceOrientation();
    var flipXY = interfaceRotation == 90 || interfaceRotation == -90;
    var screen = platform.screen.mainScreen;
    var view = {
        width: flipXY ? screen.heightDIPs : screen.widthDIPs,
        height: flipXY ? screen.widthDIPs : screen.heightDIPs
    };
    Object.freeze(view);
    return view;
}
var defaultFixedViewSize = calculateDefaultFixedViewSize();
var customFixedViewSize;
function setViewSize(vs) {
    if (!vs) {
        customFixedViewSize = null;
        return;
    }
    var interfaceRotation = getInterfaceOrientation();
    var flipXY = interfaceRotation == 90 || interfaceRotation == -90;
    customFixedViewSize = {
        width: flipXY ? vs.height : vs.width,
        height: flipXY ? vs.width : vs.height
    };
}
exports.setViewSize = setViewSize;
function getViewSize() {
    var viewSize = customFixedViewSize || defaultFixedViewSize;
    var interfaceRotation = getInterfaceOrientation();
    var flipXY = interfaceRotation == 90 || interfaceRotation == -90;
    return {
        width: flipXY ? viewSize.height : viewSize.width,
        height: flipXY ? viewSize.width : viewSize.height
    };
}
exports.getViewSize = getViewSize;
function calculateCameraCalibrationForCurrentInterfaceOrientation(cameraCalibration) {
    var orientation = getInterfaceOrientation();
    var isRotated = orientation == 90 || orientation == -90;
    var screen = platform.screen.mainScreen;
    var isLandscape = screen.heightDIPs < screen.widthDIPs;
    var isLandscapeNaturalOrientation = isLandscape && !isRotated;
    var nCalibration;
    if (isLandscapeNaturalOrientation) {
        nCalibration = cameraCalibration;
    }
    else {
        nCalibration = {
            sizeX: cameraCalibration.sizeY,
            sizeY: cameraCalibration.sizeX,
            focalLengthX: cameraCalibration.focalLengthY,
            focalLengthY: cameraCalibration.focalLengthX,
            principalPointX: cameraCalibration.sizeY - cameraCalibration.principalPointY,
            principalPointY: cameraCalibration.principalPointX,
            fieldOfViewRadX: cameraCalibration.fieldOfViewRadY,
            fieldOfViewRadY: cameraCalibration.fieldOfViewRadX
        };
    }
    if (orientation === 0) {
        return nCalibration;
    }
    if (orientation === 180) {
        nCalibration.principalPointX = nCalibration.sizeX - nCalibration.principalPointX;
        nCalibration.principalPointY = nCalibration.sizeY - nCalibration.principalPointY;
        return nCalibration;
    }
    if (orientation === 90) {
        return {
            sizeX: nCalibration.sizeY,
            sizeY: nCalibration.sizeX,
            focalLengthX: nCalibration.focalLengthY,
            focalLengthY: nCalibration.focalLengthX,
            principalPointX: nCalibration.principalPointY,
            principalPointY: nCalibration.sizeX - nCalibration.principalPointX,
            fieldOfViewRadX: nCalibration.fieldOfViewRadY,
            fieldOfViewRadY: nCalibration.fieldOfViewRadX
        };
    }
    if (orientation === -90) {
        return {
            sizeX: nCalibration.sizeY,
            sizeY: nCalibration.sizeX,
            focalLengthX: nCalibration.focalLengthY,
            focalLengthY: nCalibration.focalLengthX,
            principalPointX: nCalibration.sizeY - nCalibration.principalPointY,
            principalPointY: nCalibration.principalPointX,
            fieldOfViewRadX: nCalibration.fieldOfViewRadY,
            fieldOfViewRadY: nCalibration.fieldOfViewRadX
        };
    }
}
exports.calculateCameraCalibrationForCurrentInterfaceOrientation = calculateCameraCalibrationForCurrentInterfaceOrientation;
function getInterfaceOrientation() {
    if (application.ios) {
        var orientation_1 = UIApplication.sharedApplication().statusBarOrientation;
        switch (orientation_1) {
            case UIInterfaceOrientation.UIInterfaceOrientationUnknown:
            case UIInterfaceOrientation.UIInterfaceOrientationPortrait: return 0;
            case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown: return 180;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft: return 90;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight: return -90;
        }
    }
    if (application.android) {
        var context = utils.ad.getApplicationContext();
        var display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        var rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return 90;
            case android.view.Surface.ROTATION_270: return -90;
        }
    }
    return 0;
}
exports.getInterfaceOrientation = getInterfaceOrientation;
//# sourceMappingURL=vuforia-common.js.map