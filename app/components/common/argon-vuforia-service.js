"use strict";
var Argon = require("@argonjs/argon");
var vuforia = require("nativescript-vuforia");
var http = require("http");
var file = require("file-system");
var platform = require("platform");
var absolute_layout_1 = require("ui/layouts/absolute-layout");
var util_1 = require("./util");
var minimatch = require("minimatch");
var URI = require("urijs");
var DEBUG_DISABLE_ORIGIN_CHECK = true;
exports.vuforiaCameraDeviceMode = -3 /* OpimizeQuality */;
if (vuforia.videoView.ios) {
    vuforia.videoView.ios.contentScaleFactor =
        exports.vuforiaCameraDeviceMode === -2 /* OptimizeSpeed */ ?
            1 : platform.screen.mainScreen.scale;
}
exports.VIDEO_DELAY = -0.5 / 60;
var Matrix4 = Argon.Cesium.Matrix4;
var Cartesian3 = Argon.Cesium.Cartesian3;
var Quaternion = Argon.Cesium.Quaternion;
var JulianDate = Argon.Cesium.JulianDate;
var CesiumMath = Argon.Cesium.CesiumMath;
var z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
var y180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI);
var NativescriptVuforiaServiceDelegate = (function (_super) {
    __extends(NativescriptVuforiaServiceDelegate, _super);
    function NativescriptVuforiaServiceDelegate(deviceService, contextService) {
        var _this = _super.call(this) || this;
        _this.deviceService = deviceService;
        _this.scratchCartesian = new Argon.Cesium.Cartesian3();
        _this.scratchQuaternion = new Argon.Cesium.Quaternion();
        _this.scratchMatrix3 = new Argon.Cesium.Matrix3();
        _this.vuforiaTrackerEntity = new Argon.Cesium.Entity({
            position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, _this.deviceService.eye),
            orientation: new Argon.Cesium.ConstantProperty(Quaternion.multiply(z90, y180, {}))
        });
        _this.stateUpdateEvent = new Argon.Event();
        _this._trackingEnabled = true;
        _this._config = {};
        _this.idDataSetMap = new Map();
        _this.dataSetUrlMap = new WeakMap();
        if (!vuforia.api)
            return _this;
        var stateUpdateCallback = function (state) {
            var time = JulianDate.now();
            // subtract a few ms, since the video frame represents a time slightly in the past.
            // TODO: if we are using an optical see-through display, like hololens,
            // we want to do the opposite, and do forward prediction (though ideally not here, 
            // but in each app itself to we are as close as possible to the actual render time when
            // we start the render)
            JulianDate.addSeconds(time, exports.VIDEO_DELAY, time);
            var vuforiaFrame = state.getFrame();
            var frameTimeStamp = vuforiaFrame.getTimeStamp();
            // update trackable results in context entity collection
            var numTrackableResults = state.getNumTrackableResults();
            for (var i = 0; i < numTrackableResults; i++) {
                var trackableResult = state.getTrackableResult(i);
                var trackable = trackableResult.getTrackable();
                var name = trackable.getName();
                var id = _this._getIdForTrackable(trackable);
                var entity = contextService.entities.getById(id);
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
                    contextService.entities.add(entity);
                }
                var trackableTime = JulianDate.clone(time);
                // add any time diff from vuforia
                var trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
                if (trackableTimeDiff !== 0)
                    JulianDate.addSeconds(time, trackableTimeDiff, trackableTime);
                var pose = trackableResult.getPose();
                var position = Matrix4.getTranslation(pose, _this.scratchCartesian);
                var rotationMatrix = Matrix4.getRotation(pose, _this.scratchMatrix3);
                var orientation = Quaternion.fromRotationMatrix(rotationMatrix, _this.scratchQuaternion);
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation);
            }
            _this.stateUpdateEvent.raiseEvent(time);
        };
        vuforia.api.setStateUpdateCallback(stateUpdateCallback);
        return _this;
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
            this.cameraDeviceStart();
        }
    };
    NativescriptVuforiaServiceDelegate.prototype.isAvailable = function () {
        return !!vuforia.api;
    };
    NativescriptVuforiaServiceDelegate.prototype.setHint = function (hint, value) {
        return vuforia.api.setHint(hint, value);
    };
    NativescriptVuforiaServiceDelegate.prototype.decryptLicenseKey = function (encryptedLicenseData, session) {
        return util_1.decrypt(encryptedLicenseData.trim()).then(function (json) {
            var _a = JSON.parse(json), key = _a.key, origins = _a.origins;
            if (!session.uri)
                throw new Error('Invalid origin');
            var origin = URI.parse(session.uri);
            if (!Array.isArray(origins)) {
                throw new Error("Vuforia License Data must specify allowed origins");
            }
            var match = origins.find(function (o) {
                var parts = o.split(/\/(.*)/);
                var domainPattern = parts[0];
                var pathPattern = parts[1] || '**';
                return minimatch(origin.hostname, domainPattern) && minimatch(origin.path, pathPattern);
            });
            if (!match && !DEBUG_DISABLE_ORIGIN_CHECK) {
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
    NativescriptVuforiaServiceDelegate.prototype.configureVuforiaVideoBackground = function (viewport, enabled, reflection) {
        if (reflection === void 0) { reflection = 0 /* Default */; }
        var viewWidth = viewport.width;
        var viewHeight = viewport.height;
        var cameraDevice = vuforia.api.getCameraDevice();
        var videoMode = cameraDevice.getVideoMode(exports.vuforiaCameraDeviceMode);
        var videoWidth = videoMode.width;
        var videoHeight = videoMode.height;
        var orientation = util_1.getDisplayOrientation();
        if (orientation === 0 || orientation === 180) {
            videoWidth = videoMode.height;
            videoHeight = videoMode.width;
        }
        var widthRatio = viewWidth / videoWidth;
        var heightRatio = viewHeight / videoHeight;
        // aspect fill
        var scale = Math.max(widthRatio, heightRatio);
        // aspect fit
        // const scale = Math.min(widthRatio, heightRatio);
        var videoView = vuforia.videoView;
        var contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : 1;
        // apply the video config
        var config = this._config;
        config.enabled = enabled;
        config.sizeX = videoWidth * scale * contentScaleFactor;
        config.sizeY = videoHeight * scale * contentScaleFactor;
        config.positionX = 0;
        config.positionY = 0;
        config.reflection = 0 /* Default */;
        // console.log(`Vuforia configuring video background...
        //     contentScaleFactor: ${contentScaleFactor} orientation: ${orientation} 
        //     viewWidth: ${viewWidth} viewHeight: ${viewHeight} videoWidth: ${videoWidth} videoHeight: ${videoHeight} 
        //     config: ${JSON.stringify(config)}
        // `);
        absolute_layout_1.AbsoluteLayout.setLeft(videoView, viewport.x);
        absolute_layout_1.AbsoluteLayout.setTop(videoView, viewport.y);
        videoView.width = viewWidth;
        videoView.height = viewHeight;
        vuforia.api.getRenderer().setVideoBackgroundConfig(config);
    };
    NativescriptVuforiaServiceDelegate.prototype.cameraDeviceInitAndStart = function () {
        var cameraDevice = vuforia.api.getCameraDevice();
        console.log("Vuforia initializing camera device");
        if (!cameraDevice.init(0 /* Default */))
            return false;
        if (!cameraDevice.selectVideoMode(exports.vuforiaCameraDeviceMode))
            return false;
        var device = vuforia.api.getDevice();
        device.setMode(0 /* AR */);
        this.configureVuforiaVideoBackground({
            x: 0,
            y: 0,
            width: vuforia.videoView.getMeasuredWidth(),
            height: vuforia.videoView.getMeasuredHeight()
        }, false);
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
    return NativescriptVuforiaServiceDelegate;
}(Argon.VuforiaServiceDelegateBase));
NativescriptVuforiaServiceDelegate = __decorate([
    Argon.DI.inject(Argon.DeviceService, Argon.ContextService)
], NativescriptVuforiaServiceDelegate);
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