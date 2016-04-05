"use strict";
var Argon = require("argon");
var vuforia = require('nativescript-vuforia');
var argon_device_service_1 = require('./argon-device-service');
var defaultVuforiaLicenseKey = "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV";
var Matrix3 = Argon.Cesium.Matrix3;
var Matrix4 = Argon.Cesium.Matrix4;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var JulianDate = Argon.Cesium.JulianDate;
var CesiumMath = Argon.Cesium.CesiumMath;
var zNeg90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -CesiumMath.PI_OVER_TWO);
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
var y180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI);
var x180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI);
var NativeScriptVuforiaServiceDelegate = (function (_super) {
    __extends(NativeScriptVuforiaServiceDelegate, _super);
    function NativeScriptVuforiaServiceDelegate() {
        var _this = this;
        _super.call(this);
        this.scratchMatrix4 = new Argon.Cesium.Matrix4();
        this.scratchMatrix3 = new Argon.Cesium.Matrix3();
        this.iosTrackableRotation = new Quaternion;
        vuforia.events.on(vuforia.initErrorEvent, function (event) {
            _this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.InitError,
                message: event.message,
                data: { code: event.code }
            });
            console.error(event.message + " code: " + event.code);
        });
        vuforia.events.on(vuforia.loadDataSetErrorEvent, function (event) {
            _this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.LoadDataSetError,
                message: event.message
            });
            console.error(event.message);
        });
        vuforia.events.on(vuforia.unloadDataSetErrorEvent, function (event) {
            _this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.UnloadDataSetError,
                message: event.message
            });
            console.error(event.message);
        });
        vuforia.events.on(vuforia.activateDataSetErrorEvent, function (event) {
            _this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.ActivateDataSetError,
                message: event.message
            });
            console.error(event.message);
        });
        vuforia.events.on(vuforia.dataSetLoadEvent, function (event) {
            var url = event.url;
            var trackables = event.trackables;
            for (var name_1 in trackables) {
                var trackable = trackables[name_1];
                trackable.id = "vuforia_trackable_" + trackable.id;
            }
            var msg = { url: url, trackables: trackables };
            console.log('DataSet loaded: ' + JSON.stringify(msg));
            _this.dataSetLoadEvent.raiseEvent(msg);
        });
        if (vuforia.ios) {
            // TODO: wrap some of this ios-specific stuff up in nativescript-vuforia plugin
            var vuforiaCameraPose_1 = {
                referenceFrame: 'DEVICE',
                position: { x: 0, y: 0, z: 0 },
                orientation: Quaternion.multiply(x180, z90, {})
            };
            vuforia.events.on(vuforia.stateUpdateEvent, function (e) {
                var state = e.state;
                var frame = state.getFrame();
                var frameNumber = frame.getIndex();
                var timestamp = frame.getTimeStamp();
                var time = JulianDate.addSeconds(argon_device_service_1.iosSystemBootDate, timestamp, {});
                var entities = {};
                var trackableResultsCount = state.getNumTrackableResults();
                entities['VUFORIA_CAMERA'] = vuforiaCameraPose_1;
                for (var i = 0; i < trackableResultsCount; i++) {
                    var trackableResult = state.getTrackableResult(i);
                    var trackable = trackableResult.getTrackable();
                    var id = "vuforia_trackable_" + trackable.getId();
                    var pose = trackableResult.getPose();
                    var postMatrix4 = [
                        pose._0, pose._1, pose._2, pose._3,
                        pose._4, pose._5, pose._6, pose._7,
                        pose._8, pose._9, pose._10, pose._11,
                        0, 0, 0, 1
                    ];
                    // Vuforia trackable modelViewMatrix is reported in a row-major matrix
                    var trackablePose = Matrix4.fromRowMajorArray(postMatrix4, _this.scratchMatrix4);
                    // get the position and orientation out of the modelViewMatrix
                    var position = Matrix4.getTranslation(trackablePose, {});
                    var rotationMatrix = Matrix4.getRotation(trackablePose, _this.scratchMatrix3);
                    var orientation_1 = Quaternion.fromRotationMatrix(rotationMatrix, {});
                    entities[id] = {
                        referenceFrame: 'VUFORIA_CAMERA',
                        position: position,
                        orientation: orientation_1
                    };
                }
                var frameState = {
                    time: time,
                    frameNumber: frameNumber,
                    entities: entities
                };
                // console.debug(JSON.stringify(frameState));
                _this.updateEvent.raiseEvent(frameState);
            });
        }
    }
    NativeScriptVuforiaServiceDelegate.prototype.isSupported = function () {
        return vuforia.isSupported();
    };
    NativeScriptVuforiaServiceDelegate.prototype.init = function (options) {
        console.log("Initializing Vuforia with options: " + JSON.stringify(options));
        var licenseKey = options.licenseKey || defaultVuforiaLicenseKey;
        return vuforia.init(licenseKey);
    };
    NativeScriptVuforiaServiceDelegate.prototype.deinit = function () {
        console.log("Deinitializing Vuforia");
        return vuforia.deinit();
    };
    NativeScriptVuforiaServiceDelegate.prototype.startCamera = function () {
        console.log("Starting Camera");
        return vuforia.startCamera();
    };
    NativeScriptVuforiaServiceDelegate.prototype.stopCamera = function () {
        console.log("Stopping Camera");
        return vuforia.stopCamera();
    };
    NativeScriptVuforiaServiceDelegate.prototype.startObjectTracker = function () {
        console.log("Starting ObjectTracker");
        return vuforia.startObjectTracker();
    };
    NativeScriptVuforiaServiceDelegate.prototype.stopObjectTracker = function () {
        console.log("Stopping ObjectTracker");
        return vuforia.stopObjectTracker();
    };
    NativeScriptVuforiaServiceDelegate.prototype.hintMaxSimultaneousImageTargets = function (max) {
        console.log("Setting hint max simultanous image targets: " + max);
        return vuforia.hintMaxSimultaneousImageTargets(max);
    };
    NativeScriptVuforiaServiceDelegate.prototype.setVideoBackgroundConfig = function (videoConfig) {
        console.log("Set video background config: " + JSON.stringify(videoConfig));
        return vuforia.setVideoBackgroundConfig(videoConfig);
    };
    NativeScriptVuforiaServiceDelegate.prototype.setViewSize = function (viewSize) {
        console.log("Set view size: " + JSON.stringify(viewSize));
        return vuforia.setViewSize(viewSize);
    };
    NativeScriptVuforiaServiceDelegate.prototype.loadDataSet = function (url) {
        console.log("Loading dataset: " + url);
        return vuforia.loadDataSet(url);
    };
    NativeScriptVuforiaServiceDelegate.prototype.unloadDataSet = function (url) {
        console.log("Unloading dataset: " + url);
        return vuforia.unloadDataSet(url);
    };
    NativeScriptVuforiaServiceDelegate.prototype.activateDataSet = function (url) {
        console.log("Activating dataset: " + url);
        return vuforia.activateDataSet(url);
    };
    NativeScriptVuforiaServiceDelegate.prototype.deactivateDataSet = function (url) {
        console.log("Deactivating dataset: " + url);
        return vuforia.deactivateDataSet(url);
    };
    NativeScriptVuforiaServiceDelegate.prototype.getVideoMode = function () {
        return vuforia.getVideoMode();
    };
    return NativeScriptVuforiaServiceDelegate;
}(Argon.VuforiaServiceDelegateBase));
exports.NativeScriptVuforiaServiceDelegate = NativeScriptVuforiaServiceDelegate;
//# sourceMappingURL=argon-vuforia-service.js.map