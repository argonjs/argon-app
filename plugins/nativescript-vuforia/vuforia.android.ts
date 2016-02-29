import common = require('./vuforia-common');
import def = require('nativescript-vuforia');
import application = require('application');

global.moduleMerge(common, exports);

export const android = {};

export function init(licenseKey: string) {
    // TODO
}

export function deinit() {
    // TODO
}

export function startCamera() {
    // TODO
}

export function stopCamera() {
    // TODO
}

export function setVideoBackgroundConfig(videoConfig: def.VideoBackgroundConfig) {
    // TODO
}

export function loadDataSet(url: String) {
    // TODO
}

export function unloadDataSet(url: String) {
    // TODO
}

export function activateDataSet(url: String) {
    // TODO
}

export function deactivateDataSet(url: String) {
    // TODO
}

export function getVideoMode(): def.VideoMode {
    // TODO
}

export function getCameraCalibration(): def.CameraCalibration {
    // TODO
}

export function getVideoBackgroundConfig(): def.VideoBackgroundConfig {
    // TODO
}

export function calculateVideoBackgroundConfigFromFixed(vConfig: def.VideoBackgroundConfig): def.VideoBackgroundConfig {
    // TODO
}

export function calculateVideoBackgroundConfigToFixed(fixedVideoConfig: def.VideoBackgroundConfig): def.VideoBackgroundConfig {
    // TODO
}
