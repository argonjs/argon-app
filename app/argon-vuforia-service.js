"use strict";
var application = require("application");
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
var NativeScriptVuforiaServiceDelegate = (function () {
    function NativeScriptVuforiaServiceDelegate() {
        var _this = this;
        this.scratchMatrix4 = new Argon.Cesium.Matrix4();
        this.scratchMatrix3 = new Argon.Cesium.Matrix3();
        this.iosTrackableRotation = new Quaternion;
        this.updateEvent = new Argon.Event();
        this.errorEvent = new Argon.Event();
        this.dataSetLoadEvent = new Argon.Event();
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
            var controller = application.ios.rootController;
            UIApplication.sharedApplication().statusBarOrientation;
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
}());
exports.NativeScriptVuforiaServiceDelegate = NativeScriptVuforiaServiceDelegate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tdnVmb3JpYS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tdnVmb3JpYS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxJQUFPLFdBQVcsV0FBVyxhQUFhLENBQUMsQ0FBQztBQUM1QyxJQUFPLEtBQUssV0FBVyxPQUFPLENBQUMsQ0FBQztBQUNoQyxJQUFPLE9BQU8sV0FBVyxzQkFBc0IsQ0FBQyxDQUFBO0FBRWhELHFDQUFnQyx3QkFFaEMsQ0FBQyxDQUZ1RDtBQUV4RCxJQUFNLHdCQUF3QixHQUFHLDhYQUE4WCxDQUFDO0FBRWhhLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3JDLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3JDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBRTNDLElBQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUNuRixJQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQy9FLElBQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDdkUsSUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFD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