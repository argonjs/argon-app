"use strict";
var Argon = require('@argonjs/argon');
var vuforia = require('nativescript-vuforia');
var http = require('http');
var file = require('file-system');
var argon_device_service_1 = require('./argon-device-service');
var util_1 = require('./util');
var minimatch = require('minimatch');
exports.VIDEO_DELAY = -0.5 / 60;
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
var NativescriptVuforiaServiceDelegate = (function (_super) {
    __extends(NativescriptVuforiaServiceDelegate, _super);
    function NativescriptVuforiaServiceDelegate(deviceService, realityService, contextService, viewService) {
        var _this = this;
        _super.call(this);
        this.deviceService = deviceService;
        this.realityService = realityService;
        this.contextService = contextService;
        this.viewService = viewService;
        this.scratchDate = new Argon.Cesium.JulianDate(0, 0);
        this.scratchCartesian = new Argon.Cesium.Cartesian3();
        this.scratchCartesian2 = new Argon.Cesium.Cartesian3();
        this.scratchQuaternion = new Argon.Cesium.Quaternion();
        this.scratchMatrix4 = new Argon.Cesium.Matrix4();
        this.scratchMatrix3 = new Argon.Cesium.Matrix3();
        this.vuforiaTrackerEntity = new Argon.Cesium.Entity({
            position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.deviceService.orientationEntity),
            orientation: new Argon.Cesium.ConstantProperty(Quaternion.multiply(z90, y180, {}))
        });
        this._viewerEnabled = false;
        this._videoEnabled = true;
        this._trackingEnabled = true;
        this.idDataSetMap = new Map();
        this.dataSetUrlMap = new WeakMap();
        if (!vuforia.api)
            return;
        var stateUpdateCallback = function (state) {
            var time = JulianDate.now();
            // subtract a few ms, since the video frame represents a time slightly in the past.
            // TODO: if we are using an optical see-through display, like hololens,
            // we want to do the opposite, and do forward prediction (though ideally not here, 
            // but in each app itself to we are as close as possible to the actual render time when
            // we start the render)
            JulianDate.addSeconds(time, exports.VIDEO_DELAY, time);
            deviceService.update({ orientation: true });
            var vuforiaFrame = state.getFrame();
            var frameTimeStamp = vuforiaFrame.getTimeStamp();
            // update trackable results in context entity collection
            var numTrackableResults = state.getNumTrackableResults();
            for (var i = 0; i < numTrackableResults; i++) {
                var trackableResult = state.getTrackableResult(i);
                var trackable = trackableResult.getTrackable();
                var name = trackable.getName();
                var id = _this._getIdForTrackable(trackable);
                var entity = contextService.subscribedEntities.getById(id);
                if (!entity) {
                    entity = new Argon.Cesium.Entity({
                        id: id,
                        name: name,
                        position: new Argon.Cesium.SampledPositionProperty(_this.vuforiaTrackerEntity),
                        orientation: new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion)
                    });
                    var entityPosition = entity.position;
                    var entityOrientation = entity.orientation;
                    entityPosition.maxNumSamples = 10;
                    entityOrientation.maxNumSamples = 10;
                    entityPosition.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entityOrientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entityPosition.forwardExtrapolationDuration = 2 / 60;
                    entityOrientation.forwardExtrapolationDuration = 2 / 60;
                    contextService.subscribedEntities.add(entity);
                }
                var trackableTime = JulianDate.clone(time);
                // add any time diff from vuforia
                var trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
                if (trackableTimeDiff !== 0)
                    JulianDate.addSeconds(time, trackableTimeDiff, trackableTime);
                var pose_1 = trackableResult.getPose();
                var position = Matrix4.getTranslation(pose_1, _this.scratchCartesian);
                var rotationMatrix = Matrix4.getRotation(pose_1, _this.scratchMatrix3);
                var orientation = Quaternion.fromRotationMatrix(rotationMatrix, _this.scratchQuaternion);
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation);
            }
            // if no one is listening, don't bother calculating the view state or raising an event. 
            // (this can happen when the vuforia video reality is not the current reality, though
            // we still want to update the trackables above in case an app is depending on them)
            if (_this.stateUpdateEvent.numberOfListeners === 0)
                return;
            var deviceState = _this.deviceService.state;
            var pose = Argon.getSerializedEntityPose(_this.deviceService.displayEntity, time);
            // raise the event to let the vuforia service know we are ready!
            _this.stateUpdateEvent.raiseEvent({
                time: time,
                pose: pose,
                viewport: deviceState.viewport,
                subviews: deviceState.subviews,
                geolocationAccuracy: deviceState.geolocationAccuracy,
                geolocationAltitudeAccuracy: deviceState.geolocationAltitudeAccuracy
            });
        };
        vuforia.api.setStateUpdateCallback(stateUpdateCallback);
    }
    NativescriptVuforiaServiceDelegate.prototype.getCameraFieldOfViewRads = function () {
        var cameraDevice = vuforia.api.getCameraDevice();
        var cameraCalibration = cameraDevice.getCameraCalibration();
        return Argon.Cesium.defined(cameraCalibration) ?
            cameraCalibration.getFieldOfViewRads() : undefined;
    };
    NativescriptVuforiaServiceDelegate.prototype._getIdForTrackable = function (trackable) {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        }
        else {
            return 'vuforia_trackable_' + trackable.getId();
        }
    };
    Object.defineProperty(NativescriptVuforiaServiceDelegate.prototype, "viewerEnabled", {
        get: function () {
            return this._viewerEnabled;
        },
        set: function (enabled) {
            this._viewerEnabled = enabled;
            var device = vuforia.api.getDevice();
            if (device)
                device.setViewerActive(enabled);
            this.deviceService.updateDeviceState();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NativescriptVuforiaServiceDelegate.prototype, "videoEnabled", {
        get: function () {
            return this._videoEnabled;
        },
        set: function (value) {
            this._videoEnabled = value;
            this._configureCameraAndTrackers();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NativescriptVuforiaServiceDelegate.prototype, "trackingEnabled", {
        get: function () {
            return this._trackingEnabled;
        },
        set: function (value) {
            this._trackingEnabled = value;
            this._configureCameraAndTrackers();
        },
        enumerable: true,
        configurable: true
    });
    NativescriptVuforiaServiceDelegate.prototype._configureCameraAndTrackers = function () {
        if (!vuforia.api)
            return;
        if (this.trackingEnabled) {
            if (this.cameraDeviceStart()) {
                this.objectTrackerStart();
            }
        }
        else {
            this.objectTrackerStop();
            if (this.videoEnabled) {
                this.cameraDeviceStart();
            }
            else {
                this.cameraDeviceStop();
            }
        }
    };
    NativescriptVuforiaServiceDelegate.prototype.isAvailable = function () {
        return !!vuforia.api;
    };
    NativescriptVuforiaServiceDelegate.prototype.setHint = function (hint, value) {
        return vuforia.api.setHint(hint, value);
    };
    NativescriptVuforiaServiceDelegate.prototype.decryptLicenseKey = function (encryptedLicenseData, session) {
        return util_1.Util.decrypt(encryptedLicenseData.trim()).then(function (json) {
            var _a = JSON.parse(json), key = _a.key, origins = _a.origins;
            if (!session.uri)
                throw new Error('Invalid origin');
            var origin = Argon.URI.parse(session.uri);
            if (!Array.isArray(origins)) {
                throw new Error("Vuforia License Data must specify allowed origins");
            }
            var match = origins.find(function (o) {
                var parts = o.split(/\/(.*)/);
                var domainPattern = parts[0];
                var pathPattern = parts[1] || '**';
                return minimatch(origin.hostname, domainPattern) && minimatch(origin.path, pathPattern);
            });
            if (!match) {
                throw new Error('Invalid origin');
            }
            return key;
        });
    };
    NativescriptVuforiaServiceDelegate.prototype.init = function (options) {
        if (!vuforia.api.setLicenseKey(options.key)) {
            return Promise.reject(new Error("Unable to set the license key"));
        }
        console.log("Vuforia initializing...");
        return vuforia.api.init().then(function (result) {
            console.log("Vuforia Init Result: " + result);
            return result;
        });
    };
    NativescriptVuforiaServiceDelegate.prototype.deinit = function () {
        console.log("Vuforia deinitializing");
        vuforia.api.deinitObjectTracker();
        vuforia.api.getCameraDevice().stop();
        vuforia.api.getCameraDevice().deinit();
        vuforia.api.deinit();
    };
    NativescriptVuforiaServiceDelegate.prototype.cameraDeviceInitAndStart = function () {
        var cameraDevice = vuforia.api.getCameraDevice();
        console.log("Vuforia initializing camera device");
        if (!cameraDevice.init(0 /* Default */))
            return false;
        if (!cameraDevice.selectVideoMode(argon_device_service_1.vuforiaCameraDeviceMode))
            return false;
        var device = vuforia.api.getDevice();
        device.setMode(0 /* AR */);
        if (this.viewerEnabled) {
            device.setViewerActive(true);
        }
        this.deviceService.configureVuforiaVideoBackground();
        this._configureCameraAndTrackers();
        return true;
    };
    NativescriptVuforiaServiceDelegate.prototype.cameraDeviceStop = function () {
        return vuforia.api.getCameraDevice().stop();
    };
    NativescriptVuforiaServiceDelegate.prototype.cameraDeviceStart = function () {
        return vuforia.api.getCameraDevice().start();
    };
    NativescriptVuforiaServiceDelegate.prototype.cameraDeviceSetFlashTorchMode = function (on) {
        return vuforia.api.getCameraDevice().setFlashTorchMode(on);
    };
    NativescriptVuforiaServiceDelegate.prototype.objectTrackerInit = function () {
        console.log("Vuforia initializing object tracker");
        return vuforia.api.initObjectTracker();
    };
    NativescriptVuforiaServiceDelegate.prototype.objectTrackerStart = function () {
        console.log("Vuforia starting object tracker");
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker)
            return objectTracker.start();
        return false;
    };
    NativescriptVuforiaServiceDelegate.prototype.objectTrackerStop = function () {
        console.log("Vuforia stopping object tracker");
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            objectTracker.stop();
            return true;
        }
        return false;
    };
    NativescriptVuforiaServiceDelegate.prototype.objectTrackerCreateDataSet = function (url) {
        console.log("Vuforia creating dataset...");
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = objectTracker.createDataSet();
            if (dataSet != null) {
                var id = Argon.Cesium.createGuid();
                this.idDataSetMap.set(id, dataSet);
                this.dataSetUrlMap.set(dataSet, url);
                console.log("Vuforia created dataset (" + id + ")");
                return id;
            }
        }
        return undefined;
    };
    NativescriptVuforiaServiceDelegate.prototype.objectTrackerDestroyDataSet = function (id) {
        console.log("Vuforia destroying dataset (" + id + ")");
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
    NativescriptVuforiaServiceDelegate.prototype.objectTrackerActivateDataSet = function (id) {
        console.log("Vuforia activating dataset (" + id + ")");
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                return objectTracker.activateDataSet(dataSet);
            }
        }
        return false;
    };
    NativescriptVuforiaServiceDelegate.prototype.objectTrackerDeactivateDataSet = function (id) {
        console.log("Vuforia deactivating dataset (" + id + ")");
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                return objectTracker.deactivateDataSet(dataSet);
            }
        }
        return false;
    };
    NativescriptVuforiaServiceDelegate.prototype.dataSetFetch = function (id) {
        var dataSet = this.idDataSetMap.get(id);
        var url = this.dataSetUrlMap.get(dataSet);
        if (url) {
            console.log("Vuforia fetching dataset (" + id + ") at " + url);
            return _getDataSetLocation(url).then(function () { });
        }
        return Promise.reject("Dataset is not associated with a url");
    };
    NativescriptVuforiaServiceDelegate.prototype.dataSetLoad = function (id) {
        var _this = this;
        var dataSet = this.idDataSetMap.get(id);
        var url = this.dataSetUrlMap.get(dataSet);
        if (dataSet && url) {
            console.log("Vuforia loading dataset (" + id + ") at " + url);
            return _getDataSetLocation(url).then(function (location) {
                if (dataSet.load(location, 2 /* Absolute */)) {
                    var numTrackables = dataSet.getNumTrackables();
                    var trackables = {};
                    for (var i = 0; i < numTrackables; i++) {
                        var trackable = dataSet.getTrackable(i);
                        trackables[trackable.getName()] = {
                            id: _this._getIdForTrackable(trackable),
                            size: trackable instanceof vuforia.ObjectTarget ? trackable.getSize() : { x: 0, y: 0, z: 0 }
                        };
                    }
                    console.log("Vuforia loaded dataset file with trackables:\n" + JSON.stringify(trackables));
                    return trackables;
                }
                else {
                    console.log("Unable to load downloaded dataset at " + location + " from " + url);
                    return Promise.reject("Unable to load dataset");
                }
            });
        }
        return Promise.reject("Dataset is not associated with a url");
    };
    NativescriptVuforiaServiceDelegate = __decorate([
        Argon.DI.inject(Argon.DeviceService, Argon.RealityService, Argon.ContextService, Argon.ViewService)
    ], NativescriptVuforiaServiceDelegate);
    return NativescriptVuforiaServiceDelegate;
}(Argon.VuforiaServiceDelegateBase));
exports.NativescriptVuforiaServiceDelegate = NativescriptVuforiaServiceDelegate;
// TODO: make this cross platform somehow
function _getDataSetLocation(xmlUrlString) {
    var xmlUrl = NSURL.URLWithString(xmlUrlString);
    var datUrl = xmlUrl.URLByDeletingPathExtension.URLByAppendingPathExtension("dat");
    var directoryPathUrl = xmlUrl.URLByDeletingLastPathComponent;
    var directoryHash = directoryPathUrl.hash;
    var tmpPath = file.knownFolders.temp().path;
    var directoryHashPath = tmpPath + file.path.separator + directoryHash;
    file.Folder.fromPath(directoryHashPath);
    var xmlDestPath = directoryHashPath + file.path.separator + xmlUrl.lastPathComponent;
    var datDestPath = directoryHashPath + file.path.separator + datUrl.lastPathComponent;
    function downloadIfNeeded(url, destPath) {
        var lastModified;
        if (file.File.exists(destPath)) {
            var f = file.File.fromPath(destPath);
            lastModified = f.lastModified;
        }
        return http.request({
            url: url,
            method: 'GET',
            headers: lastModified ? {
                'If-Modified-Since': lastModified.toUTCString()
            } : undefined
        }).then(function (response) {
            if (response.statusCode === 304) {
                console.log("Verified that cached version of file " + url + " at " + destPath + " is up-to-date.");
                return destPath;
            }
            else if (response.content && response.statusCode >= 200 && response.statusCode < 300) {
                console.log("Downloaded file " + url + " to " + destPath);
                return response.content.toFile(destPath).path;
            }
            else {
                throw new Error("Unable to download file " + url + "  (HTTP status code: " + response.statusCode + ")");
            }
        });
    }
    return Promise.all([
        downloadIfNeeded(xmlUrl.absoluteString, xmlDestPath),
        downloadIfNeeded(datUrl.absoluteString, datDestPath)
    ]).then(function () { return xmlDestPath; });
}
exports._getDataSetLocation = _getDataSetLocation;
//# sourceMappingURL=argon-vuforia-service.js.map