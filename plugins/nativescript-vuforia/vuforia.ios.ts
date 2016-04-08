import common = require('./vuforia-common');
import def = require('nativescript-vuforia');
import application = require('application');

const vuforia = (typeof VuforiaApplicationSession !== 'undefined') ? VuforiaApplicationSession.new() : undefined;
export const ios = vuforia;

global.moduleMerge(common, exports);

application.on(application.suspendEvent, ()=> {
    if (vuforia) {
        vuforia.pauseAR();
        vuforia.videoViewController.eaglView.finishOpenGLESCommands();
        vuforia.videoViewController.eaglView.freeOpenGLESResources();
    }
})
application.on(application.resumeEvent, ()=> {
    vuforia && vuforia.resumeAR();
})

function _isLandscapeInterface() {
    const statusBarOrientation = UIApplication.sharedApplication().statusBarOrientation;
    const isLandscape =
        statusBarOrientation == UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft ||
        statusBarOrientation == UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight;
    return isLandscape;
}

var nextStateUpdateCommand:Function;

function executeOnNextStateUpdate(cb:Function) {
    return new Promise((resolve, reject)=>{
        if (nextStateUpdateCommand)
            console.error('A state update command is already pending: ' + nextStateUpdateCommand['cb']);
        nextStateUpdateCommand = ()=>{
            cb()
            nextStateUpdateCommand = null;
            resolve()
        }
        nextStateUpdateCommand['cb'] = cb;
    });
}

if (vuforia) {
    vuforia.stateUpdateCallback = (state) => {
        if (nextStateUpdateCommand) {
            nextStateUpdateCommand();
        }
        common.events.notify({
            eventName: common.stateUpdateEvent,
            object: this,
            state: state
        })
    }
}

export function isSupported() {
    return typeof vuforia !== 'undefined';
}

export const _loadedDataSets = new Map<string, VuforiaDataSet>();
export const _dataSetLocation = new Map<string, string>();

let isInitialized = false;

export function init(licenseKey:string) {
    return new Promise<void>((resolve, reject) => {
        vuforia.initARDone(licenseKey, (error:NSError) => {
            common.setViewSize(null);
            if (error) {
                common.events.notify({
                    eventName: common.initErrorEvent,
                    object: this,
                    message: error.description,
                    code: error.code
                })
            } else {
                isInitialized = true;
            }
            resolve();
        });
    })
}

export function deinit() {
    if (isInitialized) {
        return executeOnNextStateUpdate(()=>{
            vuforia.stopObjectTracker();
            _loadedDataSets.forEach((dataSet, url)=>{
                if (dataSet.isActive()) vuforia.deactivateDataSet(dataSet);
                vuforia.destroyDataSet(dataSet);
            })
            _loadedDataSets.clear();
        }).then(()=>{
            vuforia.deinitAR();
            isInitialized = false;
        })
    }
}

export function startCamera() {
    vuforia.startCamera(VuforiaCameraDeviceCamera.Default);
}

export function stopCamera() {
    vuforia.stopCamera();
}

export function startObjectTracker() {
    return executeOnNextStateUpdate(() => {
        if (!vuforia.startObjectTracker()) {
            // TODO: post error
        }
    })
}

export function stopObjectTracker() {
    return executeOnNextStateUpdate(() => {
        vuforia.stopObjectTracker();
    })
}

export function hintMaxSimultaneousImageTargets(max:number) {
    vuforia.hintMaxSimultaneousImageTargets(max);
}

export function setVideoBackgroundConfig(videoConfig:def.VideoBackgroundConfig) {
    const fixedConfig =  calculateVideoBackgroundConfigToFixed(videoConfig);
    vuforia.videoBackgroundConfig = {
        enabled: fixedConfig.enabled,
        positionX: fixedConfig.positionX,
        positionY: fixedConfig.positionY,
        sizeX: fixedConfig.sizeX,
        sizeY: fixedConfig.sizeY,
        reflection: VuforiaVideoBackgroundReflection.Default
    };
}

export function loadDataSet(url) {
    return _getDataSetLocation(url).then((location)=>{
        return executeOnNextStateUpdate(() => {
            const dataSet = vuforia.createDataSet();
            if (!dataSet.load(location)) {
                vuforia.destroyDataSet(dataSet);
                common.events.notify({
                    eventName: common.loadDataSetErrorEvent,
                    object: this,
                    message: "Unable to load dataSet"
                })
            } else {
                _loadedDataSets.set(url, dataSet);

                const trackables = {};
                const numTrackables = dataSet.getNumTrackables();
                for (let i=0; i<numTrackables; i++) {
                    const trackable = dataSet.getTrackable(i);
                    const id = trackable.getId();
                    const name = trackable.getName();
                    const objectTarget = trackable.asObjectTarget();
                    let size = undefined;
                    if (objectTarget) {
                        size = objectTarget.getSize();
                    }
                    trackables[name] = {id,name,size}
                }

                common.events.notify({
                    eventName: common.dataSetLoadEvent,
                    object: this,
                    url: url,
                    trackables: trackables
                })
            }
        })
    }).catch((failMsg)=>{
        common.events.notify({
            eventName: common.loadDataSetErrorEvent,
            object: this,
            message: failMsg
        })
    })
}

export function _getDataSetLocation(url) : Promise<string> {
    let location = _dataSetLocation.get(url);
    if (!location) {
        return new Promise<string>((resolve, reject) => {
            vuforia.downloadDataSetFromURLDone(url, (location, error:NSError) => {
                if (error || !VuforiaDataSet.exists(location)) {
                    reject("Unable to download dataSet");
                } else {
                    console.log("Downloaded dataset " + url + " to " + location);
                    _dataSetLocation.set(url, location);
                    resolve(location);
                }
            })
        })
    }
    return Promise.resolve(location);
}

export function unloadDataSet(url) {
    return executeOnNextStateUpdate(() => {
        const dataSet = _loadedDataSets.get(url);
        if (dataSet && vuforia.destroyDataSet(dataSet)) {
            _loadedDataSets.delete(url);
        } else {
            common.events.notify({
                eventName: common.unloadDataSetErrorEvent,
                object: this,
                message: "Unable to unload dataSet at " + url
            })
        }
    })
}

export function activateDataSet(url) {
    return executeOnNextStateUpdate(() => {
        const dataSet = _loadedDataSets.get(url);
        if (!dataSet) {
            common.events.notify({
                eventName: common.activateDataSetErrorEvent,
                object: this,
                message: "Unable to activate dataset at " + url + " because the dataSet is not loaded"
            })
        } else if (dataSet.isActive()) {
            common.events.notify({
                eventName: common.activateDataSetErrorEvent,
                object: this,
                message: "Unable to activate dataset at " + url + " because the dataSet is already activated"
            })
        } else if (!vuforia.activateDataSet(dataSet)) {
            common.events.notify({
                eventName: common.activateDataSetErrorEvent,
                object: this,
                message: "Unable to activate dataset at " + url
            })
        }
    });
}

export function deactivateDataSet(url) {
    return executeOnNextStateUpdate(() => {
        const dataSet = _loadedDataSets.get(url);
        if (!dataSet) {
            common.events.notify({
                eventName: common.deactivateDataSetErrorEvent,
                object: this,
                message: "Unable to deactivate dataset at " + url + " because the dataSet is not loaded"
            })
        } else if (!dataSet.isActive()) {
            common.events.notify({
                eventName: common.deactivateDataSetErrorEvent,
                object: this,
                message: "Unable to deactivate dataset at " + url + " because the dataSet is already deactivated"
            })
        } else if (!vuforia.deactivateDataSet(dataSet)) {
            common.events.notify({
                eventName: common.deactivateDataSetErrorEvent,
                object: this,
                message: "Unable to deactivate dataset at " + url
            })
        }
    });
}

// getters

export function getVideoMode() : def.VideoMode {
    return vuforia.getVideoMode();
}

export function getCameraCalibration() : def.CameraCalibration {
    return common.calculateCameraCalibrationForCurrentInterfaceOrientation(vuforia.getCameraCalibration());
}

export function getVideoBackgroundConfig() : def.VideoBackgroundConfig {
    return calculateVideoBackgroundConfigFromFixed(vuforia.videoBackgroundConfig);
}



export function calculateVideoBackgroundConfigFromFixed(vConfig:def.VideoBackgroundConfig) : def.VideoBackgroundConfig {
    const interfaceRotation = common.getInterfaceOrientation();
    let fixedVideoConfig:def.VideoBackgroundConfig = undefined;
    switch (interfaceRotation) {
        case 0: fixedVideoConfig = vConfig; break;
        case 90: fixedVideoConfig = {
            enabled: vConfig.enabled,
            positionX: -vConfig.positionY,
            positionY: vConfig.positionX,
            sizeX: vConfig.sizeY,
            sizeY: vConfig.sizeX,
        }; break;
        case -90: fixedVideoConfig = {
            enabled: vConfig.enabled,
            positionX: vConfig.positionY,
            positionY: -vConfig.positionX,
            sizeX: vConfig.sizeY,
            sizeY: vConfig.sizeX,
        }; break;
        case 180: fixedVideoConfig = {
            enabled: vConfig.enabled,
            positionX: -vConfig.positionX,
            positionY: -vConfig.positionY,
            sizeX: vConfig.sizeX,
            sizeY: vConfig.sizeY,
        }; break;
    }
    return fixedVideoConfig;
}

export function calculateVideoBackgroundConfigToFixed(fixedVideoConfig:def.VideoBackgroundConfig) : def.VideoBackgroundConfig {
    const interfaceRotation = common.getInterfaceOrientation();
    let videoConfig:def.VideoBackgroundConfig = undefined;
    switch (interfaceRotation) {
        case 0: videoConfig = fixedVideoConfig; break;
        case 90: videoConfig = {
            enabled: fixedVideoConfig.enabled,
            positionX: fixedVideoConfig.positionY,
            positionY: -fixedVideoConfig.positionX,
            sizeX: fixedVideoConfig.sizeY,
            sizeY: fixedVideoConfig.sizeX,
        }; break;
        case -90: videoConfig = {
            enabled: fixedVideoConfig.enabled,
            positionX: -fixedVideoConfig.positionY,
            positionY: fixedVideoConfig.positionX,
            sizeX: fixedVideoConfig.sizeY,
            sizeY: fixedVideoConfig.sizeX,
        }; break;
        case 180: videoConfig = {
            enabled: fixedVideoConfig.enabled,
            positionX: -fixedVideoConfig.positionX,
            positionY: -fixedVideoConfig.positionY,
            sizeX: fixedVideoConfig.sizeX,
            sizeY: fixedVideoConfig.sizeY,
        }; break;
    }
    return videoConfig;
}
