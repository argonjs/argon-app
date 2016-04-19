"use strict";
var application = require("application");
var frames = require("ui/frame");
var Argon = require("argon");
var vuforia = require('nativescript-vuforia');
var argon_device_service_1 = require('./argon-device-service');
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
var vuforiaEntity = new Argon.Cesium.Entity({
    id: 'VUFORIA',
    position: new Argon.Cesium.ConstantPositionProperty(),
    orientation: new Argon.Cesium.ConstantProperty()
});
var cameraDeviceMode = -1 /* Default */;
var NativeScriptVuforiaServiceDelegate = (function (_super) {
    __extends(NativeScriptVuforiaServiceDelegate, _super);
    function NativeScriptVuforiaServiceDelegate(deviceService, contextService) {
        var _this = this;
        _super.call(this);
        this.deviceService = deviceService;
        this.contextService = contextService;
        this.stateUpdateEvent = new Argon.Event();
        this.scratchMatrix4 = new Argon.Cesium.Matrix4();
        this.scratchMatrix3 = new Argon.Cesium.Matrix3();
        this._viewerEnabled = false;
        this.idDataSetMap = new Map();
        this.dataSetUrlMap = new WeakMap();
        vuforiaEntity.position.setValue({ x: 0, y: 0, z: 0 }, deviceService.entity);
        vuforiaEntity.orientation.setValue(Quaternion.multiply(x180, z90, {}));
        this.contextService.entities.add(vuforiaEntity);
        var stateUpdateCallback = function (state) {
            var vuforiaFrame = state.getFrame();
            var frameNumber = vuforiaFrame.getIndex();
            var time = JulianDate.addSeconds(argon_device_service_1.systemBootDate, vuforiaFrame.getTimeStamp(), {});
            // update trackable results in context entity collection
            var numTrackableResults = state.getNumTrackableResults();
            for (var i = 0; i < numTrackableResults; i++) {
                var trackableResult = state.getTrackableResult(i);
                var trackable = trackableResult.getTrackable();
                var name_1 = trackable.getName();
                var id = _this._getIdForTrackable(trackable);
                var entity = contextService.entities.getById(id);
                if (!entity) {
                    entity = new Argon.Cesium.Entity({
                        id: id,
                        name: name_1,
                        position: new Argon.Cesium.SampledPositionProperty(vuforiaEntity),
                        orientation: new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion)
                    });
                    contextService.entities.add(entity);
                }
                var trackableTime = JulianDate.addSeconds(argon_device_service_1.systemBootDate, trackableResult.getTimeStamp(), {});
                // get the position and orientation out of the pose matrix                
                var pose = trackableResult.getPose();
                var position = Matrix4.getTranslation(pose, {});
                var rotationMatrix = Matrix4.getRotation(pose, _this.scratchMatrix3);
                var orientation_1 = Quaternion.fromRotationMatrix(rotationMatrix, {});
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation_1);
            }
            var device = vuforia.api.getDevice();
            var renderingPrimitives = device.getRenderingPrimitives();
            var renderingViews = renderingPrimitives.getRenderingViews();
            var numViews = renderingViews.getNumViews();
            var subviews = [];
            for (var i = 0; i < numViews; i++) {
                var view_1 = renderingViews.getView(i);
                if (view_1 === 3 /* PostProcess */)
                    return;
                var type = void 0;
                switch (view_1) {
                    case 1 /* LeftEye */:
                        type = Argon.SubviewType.LEFTEYE;
                        break;
                    case 2 /* RightEye */:
                        type = Argon.SubviewType.RIGHTEYE;
                        break;
                    case 0 /* Singular */:
                        type = Argon.SubviewType.SINGULAR;
                        break;
                    default:
                        type = Argon.SubviewType.OTHER;
                        break;
                }
                var rawProjectionMatrix = renderingPrimitives.getProjectionMatrix(view_1, 1 /* Camera */);
                var eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view_1);
                var projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                subviews.push({
                    type: type,
                    projectionMatrix: projectionMatrix
                });
            }
            var frame = frames.topmost();
            var view = {
                viewport: {
                    x: 0,
                    y: 0,
                    width: frame.getMeasuredWidth(),
                    height: frame.getMeasuredHeight()
                },
                pose: Argon.calculatePose(deviceService.interfaceEntity, time),
                subviews: subviews
            };
            _this.stateUpdateEvent.raiseEvent({
                frameNumber: frameNumber,
                time: time,
                view: view
            });
            vuforia.api.onNextStateUpdate(stateUpdateCallback);
        };
        vuforia.api.onNextStateUpdate(stateUpdateCallback);
    }
    NativeScriptVuforiaServiceDelegate.prototype._getIdForTrackable = function (trackable) {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        }
        else {
            return 'vuforia_trackable_' + trackable.getName();
        }
    };
    NativeScriptVuforiaServiceDelegate.prototype.setViewerEnabled = function (enabled) {
        this._viewerEnabled = enabled;
        var device = VuforiaDevice.getInstance();
        if (device)
            device.setViewerActive(enabled);
    };
    NativeScriptVuforiaServiceDelegate.prototype.isAvailable = function () {
        return !!vuforia.api;
    };
    NativeScriptVuforiaServiceDelegate.prototype.setHint = function (hint, value) {
        return vuforia.api.setHint(hint, value);
    };
    NativeScriptVuforiaServiceDelegate.prototype.init = function (options) {
        var licenseKey;
        if (options.licenseKey) {
            licenseKey = options.licenseKey;
        }
        else if (options.encryptedLicenseData) {
        }
        else {
            return Promise.reject(new Error("License key must be provided"));
        }
        if (!vuforia.api.setLicenseKey(licenseKey)) {
            return Promise.reject(new Error("Unable to set the license key"));
        }
        return vuforia.api.init().then(function (result) {
            return result;
        });
    };
    NativeScriptVuforiaServiceDelegate.prototype.deinit = function () {
        vuforia.api.deinit();
    };
    NativeScriptVuforiaServiceDelegate.prototype.cameraDeviceInitAndStart = function () {
        var cameraDevice = vuforia.api.getCameraDevice();
        if (!cameraDevice.init(0 /* Default */))
            return false;
        if (!cameraDevice.selectVideoMode(cameraDeviceMode))
            return false;
        this.setViewerEnabled(this._viewerEnabled);
        configureVideoBackground();
        return cameraDevice.start();
    };
    NativeScriptVuforiaServiceDelegate.prototype.cameraDeviceSetFlashTorchMode = function (on) {
        return vuforia.api.getCameraDevice().setFlashTorchMode(on);
    };
    NativeScriptVuforiaServiceDelegate.prototype.objectTrackerInit = function () {
        return vuforia.api.initObjectTracker();
    };
    NativeScriptVuforiaServiceDelegate.prototype.objectTrackerStart = function () {
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker)
            return objectTracker.start();
        return false;
    };
    NativeScriptVuforiaServiceDelegate.prototype.objectTrackerStop = function () {
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            objectTracker.stop();
            return true;
        }
        return false;
    };
    NativeScriptVuforiaServiceDelegate.prototype.objectTrackerCreateDataSet = function (url) {
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = objectTracker.createDataSet();
            if (dataSet != null) {
                var id = Argon.Cesium.createGuid();
                this.idDataSetMap.set(id, dataSet);
                this.dataSetUrlMap.set(dataSet, url);
                return id;
            }
        }
        return null;
    };
    NativeScriptVuforiaServiceDelegate.prototype.objectTrackerDestroyDataSet = function (id) {
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                var deleted = objectTracker.destroyDataSet(dataSet);
                if (deleted)
                    this.idDataSetMap.delete(id);
                return deleted;
            }
        }
        return false;
    };
    NativeScriptVuforiaServiceDelegate.prototype.objectTrackerActivateDataSet = function (id) {
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                return objectTracker.activateDataSet(dataSet);
            }
        }
        return false;
    };
    NativeScriptVuforiaServiceDelegate.prototype.objectTrackerDeactivateDataSet = function (id) {
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                return objectTracker.deactivateDataSet(dataSet);
            }
        }
        return false;
    };
    NativeScriptVuforiaServiceDelegate.prototype.dataSetFetch = function (id) {
        var dataSet = this.idDataSetMap.get(id);
        var url = this.dataSetUrlMap.get(dataSet);
        if (url) {
        }
        return Promise.reject("Dataset is not associated with a url");
    };
    NativeScriptVuforiaServiceDelegate.prototype.dataSetLoad = function (id) {
        var dataSet = this.idDataSetMap.get(id);
        var url = this.dataSetUrlMap.get(dataSet);
        if (url) {
        }
        return Promise.reject("Dataset is not associated with a url");
    };
    NativeScriptVuforiaServiceDelegate = __decorate([
        Argon.DI.inject(Argon.DeviceService, Argon.ContextService)
    ], NativeScriptVuforiaServiceDelegate);
    return NativeScriptVuforiaServiceDelegate;
}(Argon.VuforiaServiceDelegateBase));
exports.NativeScriptVuforiaServiceDelegate = NativeScriptVuforiaServiceDelegate;
function configureVideoBackground() {
    var frame = frames.topmost();
    var viewWidth = frame.getMeasuredWidth();
    var viewHeight = frame.getMeasuredHeight();
    var contentScaleFactor = vuforia.ios ? vuforia.ios.contentScaleFactor : 1;
    var videoMode = vuforia.api.getCameraDevice().getVideoMode(cameraDeviceMode);
    var videoWidth = videoMode.width;
    var videoHeight = videoMode.height;
    var orientation = argon_device_service_1.getInterfaceOrientation();
    if (orientation === 0 || orientation === 180) {
        videoWidth = videoMode.height;
        videoHeight = videoMode.width;
    }
    var scale;
    // aspect fill
    scale = Math.max(viewWidth / videoWidth, viewHeight / videoHeight);
    // aspect fit
    // scale = Math.min(viewWidth / videoWidth, viewHeight / videoHeight);
    var config = {
        enabled: true,
        positionX: 0,
        positionY: 0,
        sizeX: videoWidth * scale * contentScaleFactor,
        sizeY: videoHeight * scale * contentScaleFactor,
        reflection: 0 /* Default */
    };
    console.log("Setting Video Background Configuration\n        viewWidth: " + viewWidth + " \n        viewHeight: " + viewHeight + " \n        contentScaleFactor: " + contentScaleFactor + "\n        videoWidth: " + videoWidth + " \n        videoHeight: " + videoHeight + " \n        orientation: " + orientation + " \n        config: " + JSON.stringify(config) + "\n    ");
    vuforia.api.getRenderer().setVideoBackgroundConfig(config);
}
if (vuforia.api)
    application.on(application.orientationChangedEvent, function () {
        Promise.resolve().then(configureVideoBackground); // delay callback until the interface orientation is updated
    });
//# sourceMappingURL=argon-vuforia-service.js.map