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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS1jb21tb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLWNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBRWxCLElBQU8sVUFBVSxXQUFXLGlCQUFpQixDQUFDLENBQUM7QUFDL0MsSUFBTyxRQUFRLFdBQVcsVUFBVSxDQUFDLENBQUM7QUFDdEMsSUFBTyxXQUFXLFdBQVcsYUFBYSxDQUFDLENBQUM7QUFDNUMsSUFBTyxLQUFLLFdBQVcsYUFBYSxDQUFDLENBQUM7QUFFekIsY0FBTSxHQUFHLElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBRXJDLHNCQUFjLEdBQUcsZ0JBQWdCLENBQUE7QUFDakMsNkJBQXFCLEdBQUcsdUJBQXVCLENBQUE7QUFDL0MsK0JBQXVCLEdBQUcseUJBQXlCLENBQUE7QUFDbkQsaUNBQXlCLEdBQUcsMkJBQTJCLENBQUE7QUFDdkQsbUNBQTJCLEdBQUcsNkJBQTZCLENBQUE7QUFFM0Qsd0JBQWdCLEdBQUcsa0JBQWtCLENBQUE7QUFDckMsd0JBQWdCLEdBQUcsa0JBQWtCLENBQUE7QUFJbEQ7SUFDSSxJQUFNLGlCQUFpQixHQUFHLHVCQUF1QixFQUFFLENBQUM7SUFDcEQsSUFBTSxNQUFNLEdBQUcsaUJBQWlCLElBQUksRUFBRSxJQUFJLGlCQUFpQixJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ25FLElBQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQzFDLElBQU0sSUFBSSxHQUFHO1FBQ1QsS0FBSyxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTO1FBQ3BELE1BQU0sRUFBRSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsVUFBVTtLQUN4RCxDQUFDO0lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FB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