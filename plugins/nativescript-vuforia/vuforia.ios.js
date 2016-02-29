"use strict";
var _this = this;
var common = require('./vuforia-common');
var application = require('application');
var vuforia = (typeof VuforiaApplicationSession !== 'undefined') ? VuforiaApplicationSession.new() : undefined;
exports.ios = vuforia;
global.moduleMerge(common, exports);
application.on(application.suspendEvent, function () {
    if (vuforia) {
        vuforia.pauseAR();
        vuforia.videoViewController.eaglView.finishOpenGLESCommands();
        vuforia.videoViewController.eaglView.freeOpenGLESResources();
    }
});
application.on(application.resumeEvent, function () {
    vuforia && vuforia.resumeAR();
});
function _isLandscapeInterface() {
    var statusBarOrientation = UIApplication.sharedApplication().statusBarOrientation;
    var isLandscape = statusBarOrientation == UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft ||
        statusBarOrientation == UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight;
    return isLandscape;
}
var nextStateUpdateCommand;
function executeOnNextStateUpdate(cb) {
    return new Promise(function (resolve, reject) {
        if (nextStateUpdateCommand)
            console.error('A state update command is already pending: ' + nextStateUpdateCommand['cb']);
        nextStateUpdateCommand = function () {
            cb();
            nextStateUpdateCommand = null;
            resolve();
        };
        nextStateUpdateCommand['cb'] = cb;
    });
}
if (vuforia) {
    vuforia.stateUpdateCallback = function (state) {
        if (nextStateUpdateCommand) {
            nextStateUpdateCommand();
        }
        common.events.notify({
            eventName: common.stateUpdateEvent,
            object: _this,
            state: state
        });
    };
}
function isSupported() {
    return typeof vuforia !== 'undefined';
}
exports.isSupported = isSupported;
exports._loadedDataSets = new Map();
exports._dataSetLocation = new Map();
var isInitialized = false;
function init(licenseKey) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        vuforia.initARDone(licenseKey, function (error) {
            common.setViewSize(null);
            if (error) {
                common.events.notify({
                    eventName: common.initErrorEvent,
                    object: _this,
                    message: error.description,
                    code: error.code
                });
            }
            else {
                isInitialized = true;
            }
            resolve();
        });
    });
}
exports.init = init;
function deinit() {
    if (isInitialized) {
        return executeOnNextStateUpdate(function () {
            vuforia.stopObjectTracker();
            exports._loadedDataSets.forEach(function (dataSet, url) {
                if (dataSet.isActive())
                    vuforia.deactivateDataSet(dataSet);
                vuforia.destroyDataSet(dataSet);
            });
            exports._loadedDataSets.clear();
        }).then(function () {
            vuforia.deinitAR();
            isInitialized = false;
        });
    }
}
exports.deinit = deinit;
function startCamera() {
    vuforia.startCamera(VuforiaCameraDeviceCamera.Default);
}
exports.startCamera = startCamera;
function stopCamera() {
    vuforia.stopCamera();
}
exports.stopCamera = stopCamera;
function startObjectTracker() {
    return executeOnNextStateUpdate(function () {
        if (!vuforia.startObjectTracker()) {
        }
    });
}
exports.startObjectTracker = startObjectTracker;
function stopObjectTracker() {
    return executeOnNextStateUpdate(function () {
        vuforia.stopObjectTracker();
    });
}
exports.stopObjectTracker = stopObjectTracker;
function hintMaxSimultaneousImageTargets(max) {
    vuforia.hintMaxSimultaneousImageTargets(max);
}
exports.hintMaxSimultaneousImageTargets = hintMaxSimultaneousImageTargets;
function setVideoBackgroundConfig(videoConfig) {
    var fixedConfig = calculateVideoBackgroundConfigToFixed(videoConfig);
    vuforia.videoBackgroundConfig = {
        enabled: fixedConfig.enabled,
        positionX: fixedConfig.positionX,
        positionY: fixedConfig.positionY,
        sizeX: fixedConfig.sizeX,
        sizeY: fixedConfig.sizeY,
        reflection: VuforiaVideoBackgroundReflection.Default
    };
}
exports.setVideoBackgroundConfig = setVideoBackgroundConfig;
function loadDataSet(url) {
    var _this = this;
    return _getDataSetLocation(url).then(function (location) {
        return executeOnNextStateUpdate(function () {
            var dataSet = vuforia.createDataSet();
            if (!dataSet.load(location)) {
                vuforia.destroyDataSet(dataSet);
                common.events.notify({
                    eventName: common.loadDataSetErrorEvent,
                    object: _this,
                    message: "Unable to load dataSet"
                });
            }
            else {
                exports._loadedDataSets.set(url, dataSet);
                var trackables = {};
                var numTrackables = dataSet.getNumTrackables();
                for (var i = 0; i < numTrackables; i++) {
                    var trackable = dataSet.getTrackable(i);
                    var id = trackable.getId();
                    var name_1 = trackable.getName();
                    var objectTarget = trackable.asObjectTarget();
                    var size = undefined;
                    if (objectTarget) {
                        size = objectTarget.getSize();
                    }
                    trackables[name_1] = { id: id, name: name_1, size: size };
                }
                common.events.notify({
                    eventName: common.dataSetLoadEvent,
                    object: _this,
                    url: url,
                    trackables: trackables
                });
            }
        });
    }).catch(function (failMsg) {
        common.events.notify({
            eventName: common.loadDataSetErrorEvent,
            object: _this,
            message: failMsg
        });
    });
}
exports.loadDataSet = loadDataSet;
function _getDataSetLocation(url) {
    var location = exports._dataSetLocation.get(url);
    if (!location) {
        return new Promise(function (resolve, reject) {
            vuforia.downloadDataSetFromURLDone(url, function (location, error) {
                if (error || !VuforiaDataSet.exists(location)) {
                    reject("Unable to download dataSet");
                }
                else {
                    console.log("Downloaded dataset " + url + " to " + location);
                    exports._dataSetLocation.set(url, location);
                    resolve(location);
                }
            });
        });
    }
    return Promise.resolve(location);
}
exports._getDataSetLocation = _getDataSetLocation;
function unloadDataSet(url) {
    var _this = this;
    return executeOnNextStateUpdate(function () {
        var dataSet = exports._loadedDataSets.get(url);
        if (dataSet && vuforia.destroyDataSet(dataSet)) {
            exports._loadedDataSets.delete(url);
        }
        else {
            common.events.notify({
                eventName: common.unloadDataSetErrorEvent,
                object: _this,
                message: "Unable to unload dataSet at " + url
            });
        }
    });
}
exports.unloadDataSet = unloadDataSet;
function activateDataSet(url) {
    var _this = this;
    return executeOnNextStateUpdate(function () {
        var dataSet = exports._loadedDataSets.get(url);
        if (!dataSet) {
            common.events.notify({
                eventName: common.activateDataSetErrorEvent,
                object: _this,
                message: "Unable to activate dataset at " + url + " because the dataSet is not loaded"
            });
        }
        else if (dataSet.isActive()) {
            common.events.notify({
                eventName: common.activateDataSetErrorEvent,
                object: _this,
                message: "Unable to activate dataset at " + url + " because the dataSet is already activated"
            });
        }
        else if (!vuforia.activateDataSet(dataSet)) {
            common.events.notify({
                eventName: common.activateDataSetErrorEvent,
                object: _this,
                message: "Unable to activate dataset at " + url
            });
        }
    });
}
exports.activateDataSet = activateDataSet;
function deactivateDataSet(url) {
    var _this = this;
    return executeOnNextStateUpdate(function () {
        var dataSet = exports._loadedDataSets.get(url);
        if (!dataSet) {
            common.events.notify({
                eventName: common.deactivateDataSetErrorEvent,
                object: _this,
                message: "Unable to deactivate dataset at " + url + " because the dataSet is not loaded"
            });
        }
        else if (!dataSet.isActive()) {
            common.events.notify({
                eventName: common.deactivateDataSetErrorEvent,
                object: _this,
                message: "Unable to deactivate dataset at " + url + " because the dataSet is already deactivated"
            });
        }
        else if (!vuforia.deactivateDataSet(dataSet)) {
            common.events.notify({
                eventName: common.deactivateDataSetErrorEvent,
                object: _this,
                message: "Unable to deactivate dataset at " + url
            });
        }
    });
}
exports.deactivateDataSet = deactivateDataSet;
// getters
function getVideoMode() {
    return vuforia.getVideoMode();
}
exports.getVideoMode = getVideoMode;
function getCameraCalibration() {
    return common.calculateCameraCalibrationForCurrentInterfaceOrientation(vuforia.getCameraCalibration());
}
exports.getCameraCalibration = getCameraCalibration;
function getVideoBackgroundConfig() {
    return calculateVideoBackgroundConfigFromFixed(vuforia.videoBackgroundConfig);
}
exports.getVideoBackgroundConfig = getVideoBackgroundConfig;
function calculateVideoBackgroundConfigFromFixed(vConfig) {
    var interfaceRotation = common.getInterfaceOrientation();
    var fixedVideoConfig = undefined;
    switch (interfaceRotation) {
        case 0:
            fixedVideoConfig = vConfig;
            break;
        case 90:
            fixedVideoConfig = {
                enabled: vConfig.enabled,
                positionX: -vConfig.positionY,
                positionY: vConfig.positionX,
                sizeX: vConfig.sizeY,
                sizeY: vConfig.sizeX,
            };
            break;
        case -90:
            fixedVideoConfig = {
                enabled: vConfig.enabled,
                positionX: vConfig.positionY,
                positionY: -vConfig.positionX,
                sizeX: vConfig.sizeY,
                sizeY: vConfig.sizeX,
            };
            break;
        case 180:
            fixedVideoConfig = {
                enabled: vConfig.enabled,
                positionX: -vConfig.positionX,
                positionY: -vConfig.positionY,
                sizeX: vConfig.sizeX,
                sizeY: vConfig.sizeY,
            };
            break;
    }
    return fixedVideoConfig;
}
exports.calculateVideoBackgroundConfigFromFixed = calculateVideoBackgroundConfigFromFixed;
function calculateVideoBackgroundConfigToFixed(fixedVideoConfig) {
    var interfaceRotation = common.getInterfaceOrientation();
    var videoConfig = undefined;
    switch (interfaceRotation) {
        case 0:
            videoConfig = fixedVideoConfig;
            break;
        case 90:
            videoConfig = {
                enabled: fixedVideoConfig.enabled,
                positionX: fixedVideoConfig.positionY,
                positionY: -fixedVideoConfig.positionX,
                sizeX: fixedVideoConfig.sizeY,
                sizeY: fixedVideoConfig.sizeX,
            };
            break;
        case -90:
            videoConfig = {
                enabled: fixedVideoConfig.enabled,
                positionX: -fixedVideoConfig.positionY,
                positionY: fixedVideoConfig.positionX,
                sizeX: fixedVideoConfig.sizeY,
                sizeY: fixedVideoConfig.sizeX,
            };
            break;
        case 180:
            videoConfig = {
                enabled: fixedVideoConfig.enabled,
                positionX: -fixedVideoConfig.positionX,
                positionY: -fixedVideoConfig.positionY,
                sizeX: fixedVideoConfig.sizeX,
                sizeY: fixedVideoConfig.sizeY,
            };
            break;
    }
    return videoConfig;
}
exports.calculateVideoBackgroundConfigToFixed = calculateVideoBackgroundConfigToFixed;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBb1ZDO0FBcFZELElBQU8sTUFBTSxXQUFXLGtCQUFrQixDQUFDLENBQUM7QUFFNUMsSUFBTyxXQUFXLFdBQVcsYUFBYSxDQUFDLENBQUM7QUFFNUMsSUFBTSxPQUFPLEdBQUcsQ0FBQyxPQUFPLHlCQUF5QixLQUFLLFdBQVcsQ0FBQyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQztBQUNwRyxXQUFHLEdBQUcsT0FBTyxDQUFDO0FBRTNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRXBDLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRTtJQUNyQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1YsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM5RCxPQUFPLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDakUsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFBO0FBQ0YsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFO0lBQ3BDLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUE7QUFFRjtJQUNJLElBQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixFQUFFLENBQUMsb0JBQW9CLENBQUM7SUFDcEYsSUFBTSxXQUFXLEdBQ2Isb0JBQW9CLElBQUksc0JBQXNCLENBQUMsbUNBQW1DO1FBQ2xGLG9CQUFvQixJQUFJLHNCQUFzQixDQUFDLG9DQUFvQyxDQUFDO0lBQ3hGLE1BQU0s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