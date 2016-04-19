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
        reflection: 0 /* Default */
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
//# sourceMappingURL=vuforia.ios.js.map