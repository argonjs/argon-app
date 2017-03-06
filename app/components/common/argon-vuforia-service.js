"use strict";
var Argon = require("@argonjs/argon");
var vuforia = require("nativescript-vuforia");
var http = require("http");
var file = require("file-system");
var argon_reality_service_1 = require("./argon-reality-service");
var util_1 = require("./util");
var minimatch = require("minimatch");
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
var NativescriptVuforiaServiceDelegate = NativescriptVuforiaServiceDelegate_1 = (function (_super) {
    __extends(NativescriptVuforiaServiceDelegate, _super);
    function NativescriptVuforiaServiceDelegate(deviceService, realityService, contextService, viewService) {
        var _this = _super.call(this) || this;
        _this.deviceService = deviceService;
        _this.realityService = realityService;
        _this.contextService = contextService;
        _this.viewService = viewService;
        _this.scratchDate = new Argon.Cesium.JulianDate(0, 0);
        _this.scratchCartesian = new Argon.Cesium.Cartesian3();
        _this.scratchCartesian2 = new Argon.Cesium.Cartesian3();
        _this.scratchQuaternion = new Argon.Cesium.Quaternion();
        _this.scratchMatrix4 = new Argon.Cesium.Matrix4();
        _this.scratchMatrix3 = new Argon.Cesium.Matrix3();
        _this.vuforiaTrackerEntity = new Argon.Cesium.Entity({
            position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, _this.deviceService.orientationEntity),
            orientation: new Argon.Cesium.ConstantProperty(Quaternion.multiply(z90, y180, {}))
        });
        _this._viewerEnabled = false;
        _this._videoEnabled = true;
        _this._trackingEnabled = true;
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
            deviceService.update();
            var vuforiaFrame = state.getFrame();
            var index = vuforiaFrame.getIndex();
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
            var pose = Argon.getSerializedEntityPose(_this.deviceService.displayEntity, time);
            // raise the event to let the vuforia service know we are ready!
            _this.stateUpdateEvent.raiseEvent({
                index: index,
                time: time,
                eye: {
                    pose: pose,
                }
            });
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
    Object.defineProperty(NativescriptVuforiaServiceDelegate.prototype, "viewerEnabled", {
        get: function () {
            return this._viewerEnabled;
        },
        set: function (enabled) {
            this._viewerEnabled = enabled;
            var device = vuforia.api.getDevice();
            if (device)
                device.setViewerActive(enabled);
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
        if (NativescriptVuforiaServiceDelegate_1.hasOwnProperty('DEVELOPMENT_VUFORIA_KEY')) {
            return new Promise(function (resolve, reject) {
                return resolve(NativescriptVuforiaServiceDelegate_1['DEVELOPMENT_VUFORIA_KEY']);
            });
        }
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
        if (!cameraDevice.selectVideoMode(argon_reality_service_1.vuforiaCameraDeviceMode))
            return false;
        var device = vuforia.api.getDevice();
        device.setMode(0 /* AR */);
        if (this.viewerEnabled) {
            device.setViewerActive(true);
        }
        this.realityService.configureVuforiaVideoBackground();
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
// uncomment the following to use your own vuforia license key (unencrypted)
//static DEVELOPMENT_VUFORIA_KEY = 'your_vuforia_key';
NativescriptVuforiaServiceDelegate.DEVELOPMENT_VUFORIA_KEY = '';
NativescriptVuforiaServiceDelegate = NativescriptVuforiaServiceDelegate_1 = __decorate([
    Argon.DI.inject(Argon.DeviceService, Argon.RealityService, Argon.ContextService, Argon.ViewService)
], NativescriptVuforiaServiceDelegate);
exports.NativescriptVuforiaServiceDelegate = NativescriptVuforiaServiceDelegate;
// TODO: make this cross platform somehow
function _getDataSetLocation(xmlUrlString) {
    /*
    const xmlUrl = NSURL.URLWithString(xmlUrlString);
    const datUrl = xmlUrl.URLByDeletingPathExtension.URLByAppendingPathExtension("dat");
    const datUrlString = datUrl.absoluteString;
    
    const directoryPathUrl = xmlUrl.URLByDeletingLastPathComponent;
    const directoryHash = directoryPathUrl.hash;
    const tmpPath = file.knownFolders.temp().path;
    const directoryHashPath = tmpPath + file.path.separator + directoryHash;
    
    file.Folder.fromPath(directoryHashPath);
    
    const xmlDestPath = directoryHashPath + file.path.separator + xmlUrl.lastPathComponent;
    const datDestPath = directoryHashPath + file.path.separator + datUrl.lastPathComponent;
    */
    var directoryPath = xmlUrlString.substring(0, xmlUrlString.lastIndexOf("/"));
    var filename = xmlUrlString.substring(xmlUrlString.lastIndexOf("/") + 1);
    var filenameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
    var datUrlString = directoryPath + file.path.separator + filenameWithoutExt + ".dat";
    var directoryHash = hashCode(directoryPath);
    var tmpPath = file.knownFolders.temp().path;
    var directoryHashPath = tmpPath + file.path.separator + directoryHash;
    file.Folder.fromPath(directoryHashPath);
    var xmlDestPath = directoryHashPath + file.path.separator + filename;
    var datDestPath = directoryHashPath + file.path.separator + filenameWithoutExt + ".dat";
    function hashCode(s) {
        var hash = 0, i, chr, len;
        if (s.length === 0)
            return hash;
        for (i = 0, len = s.length; i < len; i++) {
            chr = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
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
        downloadIfNeeded(xmlUrlString, xmlDestPath),
        downloadIfNeeded(datUrlString, datDestPath)
    ]).then(function () { return xmlDestPath; });
}
exports._getDataSetLocation = _getDataSetLocation;
var NativescriptVuforiaServiceDelegate_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tdnVmb3JpYS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tdnVmb3JpYS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxzQ0FBd0M7QUFDeEMsOENBQWdEO0FBQ2hELDJCQUE2QjtBQUM3QixrQ0FBb0M7QUFDcEMsaUVBQTRGO0FBQzVGLCtCQUEyQjtBQUMzQixxQ0FBc0M7QUFFekIsUUFBQSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEdBQUMsRUFBRSxDQUFDO0FBRW5DLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3JDLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3JDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBRTNDLElBQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNwRixJQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2hGLElBQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDeEUsSUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FB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cnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBmaWxlIGZyb20gJ2ZpbGUtc3lzdGVtJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0UmVhbGl0eVNlcnZpY2UsIHZ1Zm9yaWFDYW1lcmFEZXZpY2VNb2RlfSBmcm9tICcuL2FyZ29uLXJlYWxpdHktc2VydmljZSc7XG5pbXBvcnQge1V0aWx9IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIG1pbmltYXRjaCBmcm9tICdtaW5pbWF0Y2gnXG5cbmV4cG9ydCBjb25zdCBWSURFT19ERUxBWSA9IC0wLjUvNjA7XG5cbmNvbnN0IE1hdHJpeDMgPSBBcmdvbi5DZXNpdW0uTWF0cml4MztcbmNvbnN0IE1hdHJpeDQgPSBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbmNvbnN0IENhcnRlc2lhbjMgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbmNvbnN0IFF1YXRlcm5pb24gPSBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcbmNvbnN0IEp1bGlhbkRhdGUgPSBBcmdvbi5DZXNpdW0uSnVsaWFuRGF0ZTtcbmNvbnN0IENlc2l1bU1hdGggPSBBcmdvbi5DZXNpdW0uQ2VzaXVtTWF0aDtcblxuY29uc3Qgek5lZzkwID0gUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCAtQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTyk7XG5jb25zdCB6OTAgPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIENlc2l1bU1hdGguUElfT1ZFUl9UV08pO1xuY29uc3QgeTE4MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWSwgQ2VzaXVtTWF0aC5QSSk7XG5jb25zdCB4MTgwID0gUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9YLCBDZXNpdW1NYXRoLlBJKTtcblxuaW50ZXJmYWNlIFZ1Zm9yaWFMaWNlbnNlRGF0YSB7XG4gICAga2V5Pzogc3RyaW5nXG4gICAgb3JpZ2lucz86c3RyaW5nW11cbn1cblxuQEFyZ29uLkRJLmluamVjdChcbiAgICBBcmdvbi5EZXZpY2VTZXJ2aWNlLCBcbiAgICBBcmdvbi5SZWFsaXR5U2VydmljZSwgXG4gICAgQXJnb24uQ29udGV4dFNlcnZpY2UsIFxuICAgIEFyZ29uLlZpZXdTZXJ2aWNlKVxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlRGVsZWdhdGUgZXh0ZW5kcyBBcmdvbi5WdWZvcmlhU2VydmljZURlbGVnYXRlQmFzZSB7XG4gICAgICAgIFxuICAgIC8vIHVuY29tbWVudCB0aGUgZm9sbG93aW5nIHRvIHVzZSB5b3VyIG93biB2dWZvcmlhIGxpY2Vuc2Uga2V5ICh1bmVuY3J5cHRlZClcbiAgICAvL3N0YXRpYyBERVZFTE9QTUVOVF9WVUZPUklBX0tFWSA9ICd5b3VyX3Z1Zm9yaWFfa2V5JztcbiAgICBzdGF0aWMgREVWRUxPUE1FTlRfVlVGT1JJQV9LRVkgPSAnJztcblxuICAgIHByaXZhdGUgc2NyYXRjaERhdGUgPSBuZXcgQXJnb24uQ2VzaXVtLkp1bGlhbkRhdGUoMCwwKTtcbiAgICBwcml2YXRlIHNjcmF0Y2hDYXJ0ZXNpYW4gPSBuZXcgQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjMoKTtcbiAgICBwcml2YXRlIHNjcmF0Y2hDYXJ0ZXNpYW4yID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zKCk7XG4gICAgcHJpdmF0ZSBzY3JhdGNoUXVhdGVybmlvbiA9IG5ldyBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbigpO1xuXHRwcml2YXRlIHNjcmF0Y2hNYXRyaXg0ID0gbmV3IEFyZ29uLkNlc2l1bS5NYXRyaXg0KCk7XG5cdHByaXZhdGUgc2NyYXRjaE1hdHJpeDMgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDMoKTtcbiAgICBcbiAgICBwcml2YXRlIHZ1Zm9yaWFUcmFja2VyRW50aXR5ID0gbmV3IEFyZ29uLkNlc2l1bS5FbnRpdHkoe1xuICAgICAgICBwb3NpdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoQ2FydGVzaWFuMy5aRVJPLCB0aGlzLmRldmljZVNlcnZpY2Uub3JpZW50YXRpb25FbnRpdHkpLFxuICAgICAgICBvcmllbnRhdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KFF1YXRlcm5pb24ubXVsdGlwbHkoejkwLHkxODAsPGFueT57fSkpXG4gICAgfSk7XG5cdFxuXHRjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSBkZXZpY2VTZXJ2aWNlOkFyZ29uLkRldmljZVNlcnZpY2UsIFxuICAgICAgICBwcml2YXRlIHJlYWxpdHlTZXJ2aWNlOk5hdGl2ZXNjcmlwdFJlYWxpdHlTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlIGNvbnRleHRTZXJ2aWNlOkFyZ29uLkNvbnRleHRTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlIHZpZXdTZXJ2aWNlOkFyZ29uLlZpZXdTZXJ2aWNlKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzdGF0ZVVwZGF0ZUNhbGxiYWNrID0gKHN0YXRlOnZ1Zm9yaWEuU3RhdGUpID0+IHsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRpbWUgPSBKdWxpYW5EYXRlLm5vdygpO1xuICAgICAgICAgICAgLy8gc3VidHJhY3QgYSBmZXcgbXMsIHNpbmNlIHRoZSB2aWRlbyBmcmFtZSByZXByZXNlbnRzIGEgdGltZSBzbGlnaHRseSBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgIC8vIFRPRE86IGlmIHdlIGFyZSB1c2luZyBhbiBvcHRpY2FsIHNlZS10aHJvdWdoIGRpc3BsYXksIGxpa2UgaG9sb2xlbnMsXG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRvIGRvIHRoZSBvcHBvc2l0ZSwgYW5kIGRvIGZvcndhcmQgcHJlZGljdGlvbiAodGhvdWdoIGlkZWFsbHkgbm90IGhlcmUsIFxuICAgICAgICAgICAgLy8gYnV0IGluIGVhY2ggYXBwIGl0c2VsZiB0byB3ZSBhcmUgYXMgY2xvc2UgYXMgcG9zc2libGUgdG8gdGhlIGFjdHVhbCByZW5kZXIgdGltZSB3aGVuXG4gICAgICAgICAgICAvLyB3ZSBzdGFydCB0aGUgcmVuZGVyKVxuICAgICAgICAgICAgSnVsaWFuRGF0ZS5hZGRTZWNvbmRzKHRpbWUsIFZJREVPX0RFTEFZLCB0aW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGV2aWNlU2VydmljZS51cGRhdGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdnVmb3JpYUZyYW1lID0gc3RhdGUuZ2V0RnJhbWUoKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gdnVmb3JpYUZyYW1lLmdldEluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCBmcmFtZVRpbWVTdGFtcCA9IHZ1Zm9yaWFGcmFtZS5nZXRUaW1lU3RhbXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdXBkYXRlIHRyYWNrYWJsZSByZXN1bHRzIGluIGNvbnRleHQgZW50aXR5IGNvbGxlY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IG51bVRyYWNrYWJsZVJlc3VsdHMgPSBzdGF0ZS5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1UcmFja2FibGVSZXN1bHRzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVSZXN1bHQgPSA8dnVmb3JpYS5UcmFja2FibGVSZXN1bHQ+c3RhdGUuZ2V0VHJhY2thYmxlUmVzdWx0KGkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRyYWNrYWJsZVJlc3VsdC5nZXRUcmFja2FibGUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gdHJhY2thYmxlLmdldE5hbWUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMuX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IGNvbnRleHRTZXJ2aWNlLnN1YnNjcmliZWRFbnRpdGllcy5nZXRCeUlkKGlkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkgPSBuZXcgQXJnb24uQ2VzaXVtLkVudGl0eSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5TYW1wbGVkUG9zaXRpb25Qcm9wZXJ0eSh0aGlzLnZ1Zm9yaWFUcmFja2VyRW50aXR5KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWVudGF0aW9uOiBuZXcgQXJnb24uQ2VzaXVtLlNhbXBsZWRQcm9wZXJ0eShBcmdvbi5DZXNpdW0uUXVhdGVybmlvbilcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGl0eVBvc2l0aW9uID0gZW50aXR5LnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUG9zaXRpb25Qcm9wZXJ0eTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50aXR5T3JpZW50YXRpb24gPSBlbnRpdHkub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLlNhbXBsZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5UG9zaXRpb24ubWF4TnVtU2FtcGxlcyA9IDEwO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlPcmllbnRhdGlvbi5tYXhOdW1TYW1wbGVzID0gMTA7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eVBvc2l0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uVHlwZSA9IEFyZ29uLkNlc2l1bS5FeHRyYXBvbGF0aW9uVHlwZS5IT0xEO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlPcmllbnRhdGlvbi5mb3J3YXJkRXh0cmFwb2xhdGlvblR5cGUgPSBBcmdvbi5DZXNpdW0uRXh0cmFwb2xhdGlvblR5cGUuSE9MRDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5UG9zaXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25EdXJhdGlvbiA9IDIvNjA7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eU9yaWVudGF0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uRHVyYXRpb24gPSAyLzYwO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0U2VydmljZS5zdWJzY3JpYmVkRW50aXRpZXMuYWRkKGVudGl0eSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZVRpbWUgPSBKdWxpYW5EYXRlLmNsb25lKHRpbWUpOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBhZGQgYW55IHRpbWUgZGlmZiBmcm9tIHZ1Zm9yaWFcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVUaW1lRGlmZiA9IHRyYWNrYWJsZVJlc3VsdC5nZXRUaW1lU3RhbXAoKSAtIGZyYW1lVGltZVN0YW1wO1xuICAgICAgICAgICAgICAgIGlmICh0cmFja2FibGVUaW1lRGlmZiAhPT0gMCkgSnVsaWFuRGF0ZS5hZGRTZWNvbmRzKHRpbWUsIHRyYWNrYWJsZVRpbWVEaWZmLCB0cmFja2FibGVUaW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NlID0gPEFyZ29uLkNlc2l1bS5NYXRyaXg0Pjxhbnk+dHJhY2thYmxlUmVzdWx0LmdldFBvc2UoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IE1hdHJpeDQuZ2V0VHJhbnNsYXRpb24ocG9zZSwgdGhpcy5zY3JhdGNoQ2FydGVzaWFuKTtcbiAgICAgICAgICAgICAgICBjb25zdCByb3RhdGlvbk1hdHJpeCA9IE1hdHJpeDQuZ2V0Um90YXRpb24ocG9zZSwgdGhpcy5zY3JhdGNoTWF0cml4Myk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLmZyb21Sb3RhdGlvbk1hdHJpeChyb3RhdGlvbk1hdHJpeCwgdGhpcy5zY3JhdGNoUXVhdGVybmlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgKGVudGl0eS5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHkpLmFkZFNhbXBsZSh0cmFja2FibGVUaW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgKGVudGl0eS5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFByb3BlcnR5KS5hZGRTYW1wbGUodHJhY2thYmxlVGltZSwgb3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBpZiBubyBvbmUgaXMgbGlzdGVuaW5nLCBkb24ndCBib3RoZXIgY2FsY3VsYXRpbmcgdGhlIHZpZXcgc3RhdGUgb3IgcmFpc2luZyBhbiBldmVudC4gXG4gICAgICAgICAgICAvLyAodGhpcyBjYW4gaGFwcGVuIHdoZW4gdGhlIHZ1Zm9yaWEgdmlkZW8gcmVhbGl0eSBpcyBub3QgdGhlIGN1cnJlbnQgcmVhbGl0eSwgdGhvdWdoXG4gICAgICAgICAgICAvLyB3ZSBzdGlsbCB3YW50IHRvIHVwZGF0ZSB0aGUgdHJhY2thYmxlcyBhYm92ZSBpbiBjYXNlIGFuIGFwcCBpcyBkZXBlbmRpbmcgb24gdGhlbSlcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlVXBkYXRlRXZlbnQubnVtYmVyT2ZMaXN0ZW5lcnMgPT09IDApIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcG9zZSA9IEFyZ29uLmdldFNlcmlhbGl6ZWRFbnRpdHlQb3NlKHRoaXMuZGV2aWNlU2VydmljZS5kaXNwbGF5RW50aXR5LCB0aW1lKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyByYWlzZSB0aGUgZXZlbnQgdG8gbGV0IHRoZSB2dWZvcmlhIHNlcnZpY2Uga25vdyB3ZSBhcmUgcmVhZHkhXG4gICAgICAgICAgICB0aGlzLnN0YXRlVXBkYXRlRXZlbnQucmFpc2VFdmVudCh7XG4gICAgICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICAgICAgdGltZSxcbiAgICAgICAgICAgICAgICBleWU6IHtcbiAgICAgICAgICAgICAgICAgICAgcG9zZSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHZ1Zm9yaWEuYXBpLnNldFN0YXRlVXBkYXRlQ2FsbGJhY2soc3RhdGVVcGRhdGVDYWxsYmFjayk7XG5cdH1cblxuICAgIHB1YmxpYyBnZXRDYW1lcmFGaWVsZE9mVmlld1JhZHMoKSB7XG4gICAgICAgIGNvbnN0IGNhbWVyYURldmljZSA9IHZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpO1xuICAgICAgICBjb25zdCBjYW1lcmFDYWxpYnJhdGlvbiA9IGNhbWVyYURldmljZS5nZXRDYW1lcmFDYWxpYnJhdGlvbigpO1xuICAgICAgICByZXR1cm4gQXJnb24uQ2VzaXVtLmRlZmluZWQoY2FtZXJhQ2FsaWJyYXRpb24pID9cbiAgICAgICAgICAgIGNhbWVyYUNhbGlicmF0aW9uLmdldEZpZWxkT2ZWaWV3UmFkcygpIDogdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBfZ2V0SWRGb3JUcmFja2FibGUodHJhY2thYmxlOnZ1Zm9yaWEuVHJhY2thYmxlKSA6IHN0cmluZyB7XG4gICAgICAgIGlmICh0cmFja2FibGUgaW5zdGFuY2VvZiB2dWZvcmlhLk9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX29iamVjdF90YXJnZXRfJyArIHRyYWNrYWJsZS5nZXRVbmlxdWVUYXJnZXRJZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX3RyYWNrYWJsZV8nICsgdHJhY2thYmxlLmdldElkKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfdmlld2VyRW5hYmxlZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgX3ZpZGVvRW5hYmxlZCA9IHRydWU7XG4gICAgcHJpdmF0ZSBfdHJhY2tpbmdFbmFibGVkID0gdHJ1ZTtcbiAgICBcbiAgICBnZXQgdmlld2VyRW5hYmxlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZpZXdlckVuYWJsZWQ7XG4gICAgfVxuICAgIFxuICAgIHNldCB2aWV3ZXJFbmFibGVkKGVuYWJsZWQpIHtcbiAgICAgICAgdGhpcy5fdmlld2VyRW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBpZiAoZGV2aWNlKSBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKGVuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICBnZXQgdmlkZW9FbmFibGVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmlkZW9FbmFibGVkO1xuICAgIH1cbiAgICBcbiAgICBzZXQgdmlkZW9FbmFibGVkKHZhbHVlOmJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5fdmlkZW9FbmFibGVkID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyZUNhbWVyYUFuZFRyYWNrZXJzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldCB0cmFja2luZ0VuYWJsZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cmFja2luZ0VuYWJsZWQ7XG4gICAgfVxuICAgIFxuICAgIHNldCB0cmFja2luZ0VuYWJsZWQodmFsdWU6Ym9vbGVhbikge1xuICAgICAgICB0aGlzLl90cmFja2luZ0VuYWJsZWQgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fY29uZmlndXJlQ2FtZXJhQW5kVHJhY2tlcnMoKTtcbiAgICB9XG4gICAgXG4gICAgX2NvbmZpZ3VyZUNhbWVyYUFuZFRyYWNrZXJzKCkge1xuICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLnRyYWNraW5nRW5hYmxlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY2FtZXJhRGV2aWNlU3RhcnQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlclN0YXJ0KCkgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXJTdG9wKCk7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhbWVyYURldmljZVN0YXJ0KClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYW1lcmFEZXZpY2VTdG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaXNBdmFpbGFibGUoKSB7XG4gICAgICAgIHJldHVybiAhIXZ1Zm9yaWEuYXBpO1xuICAgIH1cbiAgICBcbiAgICBzZXRIaW50KGhpbnQ6IEFyZ29uLlZ1Zm9yaWFIaW50LCB2YWx1ZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLmFwaS5zZXRIaW50KDxudW1iZXI+aGludCwgdmFsdWUpO1xuICAgIH1cblxuICAgIGRlY3J5cHRMaWNlbnNlS2V5KGVuY3J5cHRlZExpY2Vuc2VEYXRhOnN0cmluZywgc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkgOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBpZiAoTmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VEZWxlZ2F0ZS5oYXNPd25Qcm9wZXJ0eSgnREVWRUxPUE1FTlRfVlVGT1JJQV9LRVknKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlRGVsZWdhdGVbJ0RFVkVMT1BNRU5UX1ZVRk9SSUFfS0VZJ10pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFV0aWwuZGVjcnlwdChlbmNyeXB0ZWRMaWNlbnNlRGF0YS50cmltKCkpLnRoZW4oKGpzb24pPT57XG4gICAgICAgICAgICBjb25zdCB7a2V5LG9yaWdpbnN9IDoge2tleTpzdHJpbmcsb3JpZ2luczpzdHJpbmdbXX0gPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgaWYgKCFzZXNzaW9uLnVyaSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG9yaWdpbicpO1xuXG4gICAgICAgICAgICBjb25zdCBvcmlnaW4gPSBBcmdvbi5VUkkucGFyc2Uoc2Vzc2lvbi51cmkpO1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KDxhbnk+b3JpZ2lucykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWdWZvcmlhIExpY2Vuc2UgRGF0YSBtdXN0IHNwZWNpZnkgYWxsb3dlZCBvcmlnaW5zXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IG9yaWdpbnMuZmluZCgobykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gby5zcGxpdCgvXFwvKC4qKS8pO1xuICAgICAgICAgICAgICAgIGxldCBkb21haW5QYXR0ZXJuID0gcGFydHNbMF07XG4gICAgICAgICAgICAgICAgbGV0IHBhdGhQYXR0ZXJuID0gcGFydHNbMV0gfHwgJyoqJztcbiAgICAgICAgICAgICAgICByZXR1cm4gbWluaW1hdGNoKG9yaWdpbi5ob3N0bmFtZSwgZG9tYWluUGF0dGVybikgJiYgbWluaW1hdGNoKG9yaWdpbi5wYXRoLCBwYXRoUGF0dGVybik7XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG9yaWdpbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgaW5pdChvcHRpb25zOiBBcmdvbi5WdWZvcmlhU2VydmljZURlbGVnYXRlSW5pdE9wdGlvbnMpOiBQcm9taXNlPEFyZ29uLlZ1Zm9yaWFJbml0UmVzdWx0PiB7XG4gICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLnNldExpY2Vuc2VLZXkob3B0aW9ucy5rZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlVuYWJsZSB0byBzZXQgdGhlIGxpY2Vuc2Uga2V5XCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYSBpbml0aWFsaXppbmcuLi5cIilcbiAgICAgICAgICAgIHJldHVybiB2dWZvcmlhLmFwaS5pbml0KCkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYSBJbml0IFJlc3VsdDogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiA8bnVtYmVyPnJlc3VsdDtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKTogdm9pZCB7ICAgICAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYSBkZWluaXRpYWxpemluZ1wiKTtcbiAgICAgICAgdnVmb3JpYS5hcGkuZGVpbml0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdG9wKCk7XG4gICAgICAgIHZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpLmRlaW5pdCgpO1xuICAgICAgICB2dWZvcmlhLmFwaS5kZWluaXQoKTtcbiAgICB9XG4gICAgXG4gICAgY2FtZXJhRGV2aWNlSW5pdEFuZFN0YXJ0KCk6IGJvb2xlYW4geyAgICAgICAgXG4gICAgICAgIGNvbnN0IGNhbWVyYURldmljZSA9IHZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYSBpbml0aWFsaXppbmcgY2FtZXJhIGRldmljZVwiKTtcbiAgICAgICAgaWYgKCFjYW1lcmFEZXZpY2UuaW5pdCh2dWZvcmlhLkNhbWVyYURldmljZURpcmVjdGlvbi5EZWZhdWx0KSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWNhbWVyYURldmljZS5zZWxlY3RWaWRlb01vZGUodnVmb3JpYUNhbWVyYURldmljZU1vZGUpKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgIGNvbnN0IGRldmljZSA9IHZ1Zm9yaWEuYXBpLmdldERldmljZSgpO1xuICAgICAgICBkZXZpY2Uuc2V0TW9kZSh2dWZvcmlhLkRldmljZU1vZGUuQVIpO1xuICAgICAgICBpZiAodGhpcy52aWV3ZXJFbmFibGVkKSB7XG4gICAgICAgICAgICBkZXZpY2Uuc2V0Vmlld2VyQWN0aXZlKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgdGhpcy5yZWFsaXR5U2VydmljZS5jb25maWd1cmVWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kKCk7XG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyZUNhbWVyYUFuZFRyYWNrZXJzKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBcbiAgICBjYW1lcmFEZXZpY2VTdG9wKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCkuc3RvcCgpO1xuICAgIH1cbiAgICBcbiAgICBjYW1lcmFEZXZpY2VTdGFydCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIFxuICAgIGNhbWVyYURldmljZVNldEZsYXNoVG9yY2hNb2RlKG9uOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zZXRGbGFzaFRvcmNoTW9kZShvbik7XG4gICAgfVxuICAgIFxuICAgIG9iamVjdFRyYWNrZXJJbml0KCk6IGJvb2xlYW4geyAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYSBpbml0aWFsaXppbmcgb2JqZWN0IHRyYWNrZXJcIik7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLmFwaS5pbml0T2JqZWN0VHJhY2tlcigpO1xuICAgIH1cbiAgICBcbiAgICBvYmplY3RUcmFja2VyU3RhcnQoKTogYm9vbGVhbiB7ICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coXCJWdWZvcmlhIHN0YXJ0aW5nIG9iamVjdCB0cmFja2VyXCIpO1xuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikgcmV0dXJuIG9iamVjdFRyYWNrZXIuc3RhcnQoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBvYmplY3RUcmFja2VyU3RvcCgpOiBib29sZWFuIHsgICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhcIlZ1Zm9yaWEgc3RvcHBpbmcgb2JqZWN0IHRyYWNrZXJcIik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBvYmplY3RUcmFja2VyLnN0b3AoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBpZERhdGFTZXRNYXAgPSBuZXcgTWFwPHN0cmluZywgdnVmb3JpYS5EYXRhU2V0PigpO1xuICAgIHByaXZhdGUgZGF0YVNldFVybE1hcCA9IG5ldyBXZWFrTWFwPHZ1Zm9yaWEuRGF0YVNldHx1bmRlZmluZWQsIHN0cmluZ3x1bmRlZmluZWQ+KCk7XG4gICAgXG4gICAgb2JqZWN0VHJhY2tlckNyZWF0ZURhdGFTZXQodXJsPzogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7ICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coXCJWdWZvcmlhIGNyZWF0aW5nIGRhdGFzZXQuLi5cIik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhU2V0ID0gb2JqZWN0VHJhY2tlci5jcmVhdGVEYXRhU2V0KCk7XG4gICAgICAgICAgICBpZiAoZGF0YVNldCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBBcmdvbi5DZXNpdW0uY3JlYXRlR3VpZCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuaWREYXRhU2V0TWFwLnNldChpZCwgZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhU2V0VXJsTWFwLnNldChkYXRhU2V0LCB1cmwpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhIGNyZWF0ZWQgZGF0YXNldCAoJHtpZH0pYCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIG9iamVjdFRyYWNrZXJEZXN0cm95RGF0YVNldChpZDogc3RyaW5nKTogYm9vbGVhbiB7ICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYSBkZXN0cm95aW5nIGRhdGFzZXQgKCR7aWR9KWApO1xuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikge1xuICAgICAgICAgICAgY29uc3QgZGF0YVNldCA9IHRoaXMuaWREYXRhU2V0TWFwLmdldChpZCk7XG4gICAgICAgICAgICBpZiAoZGF0YVNldCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVsZXRlZCA9IG9iamVjdFRyYWNrZXIuZGVzdHJveURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpIHRoaXMuaWREYXRhU2V0TWFwLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlbGV0ZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBvYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgYWN0aXZhdGluZyBkYXRhc2V0ICgke2lkfSlgKTtcbiAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgaWYgKG9iamVjdFRyYWNrZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGFTZXQgPSB0aGlzLmlkRGF0YVNldE1hcC5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKGRhdGFTZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3RUcmFja2VyLmFjdGl2YXRlRGF0YVNldChkYXRhU2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIG9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChpZDogc3RyaW5nKTogYm9vbGVhbiB7ICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgZGVhY3RpdmF0aW5nIGRhdGFzZXQgKCR7aWR9KWApO1xuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikge1xuICAgICAgICAgICAgY29uc3QgZGF0YVNldCA9IHRoaXMuaWREYXRhU2V0TWFwLmdldChpZCk7XG4gICAgICAgICAgICBpZiAoZGF0YVNldCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdFRyYWNrZXIuZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBkYXRhU2V0RmV0Y2goaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBkYXRhU2V0ID0gdGhpcy5pZERhdGFTZXRNYXAuZ2V0KGlkKTtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5kYXRhU2V0VXJsTWFwLmdldChkYXRhU2V0KTtcbiAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgZmV0Y2hpbmcgZGF0YXNldCAoJHtpZH0pIGF0ICR7dXJsfWApO1xuICAgICAgICAgICAgcmV0dXJuIF9nZXREYXRhU2V0TG9jYXRpb24odXJsKS50aGVuKCgpPT57fSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwiRGF0YXNldCBpcyBub3QgYXNzb2NpYXRlZCB3aXRoIGEgdXJsXCIpO1xuICAgIH1cbiAgICBcbiAgICBkYXRhU2V0TG9hZChpZDogc3RyaW5nKTogUHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4ge1xuICAgICAgICBjb25zdCBkYXRhU2V0ID0gdGhpcy5pZERhdGFTZXRNYXAuZ2V0KGlkKTtcbiAgICAgICAgY29uc3QgdXJsID0gdGhpcy5kYXRhU2V0VXJsTWFwLmdldChkYXRhU2V0KTtcbiAgICAgICAgaWYgKGRhdGFTZXQgJiYgdXJsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYSBsb2FkaW5nIGRhdGFzZXQgKCR7aWR9KSBhdCAke3VybH1gKTtcbiAgICAgICAgICAgIHJldHVybiBfZ2V0RGF0YVNldExvY2F0aW9uKHVybCkudGhlbjxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4oKGxvY2F0aW9uKT0+e1xuICAgICAgICAgICAgICAgIGlmIChkYXRhU2V0LmxvYWQobG9jYXRpb24sIHZ1Zm9yaWEuU3RvcmFnZVR5cGUuQWJzb2x1dGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG51bVRyYWNrYWJsZXMgPSBkYXRhU2V0LmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhY2thYmxlczpBcmdvbi5WdWZvcmlhVHJhY2thYmxlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1UcmFja2FibGVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IDx2dWZvcmlhLlRyYWNrYWJsZT5kYXRhU2V0LmdldFRyYWNrYWJsZShpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrYWJsZXNbdHJhY2thYmxlLmdldE5hbWUoKV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHRoaXMuX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogdHJhY2thYmxlIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQgPyB0cmFja2FibGUuZ2V0U2l6ZSgpIDoge3g6MCx5OjAsejowfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYSBsb2FkZWQgZGF0YXNldCBmaWxlIHdpdGggdHJhY2thYmxlczpcXG5cIiArIEpTT04uc3RyaW5naWZ5KHRyYWNrYWJsZXMpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrYWJsZXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVuYWJsZSB0byBsb2FkIGRvd25sb2FkZWQgZGF0YXNldCBhdCAke2xvY2F0aW9ufSBmcm9tICR7dXJsfWApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXCJVbmFibGUgdG8gbG9hZCBkYXRhc2V0XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwiRGF0YXNldCBpcyBub3QgYXNzb2NpYXRlZCB3aXRoIGEgdXJsXCIpO1xuICAgIH1cbn1cblxuLy8gVE9ETzogbWFrZSB0aGlzIGNyb3NzIHBsYXRmb3JtIHNvbWVob3dcbmV4cG9ydCBmdW5jdGlvbiBfZ2V0RGF0YVNldExvY2F0aW9uKHhtbFVybFN0cmluZzpzdHJpbmcpIDogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAvKlxuICAgIGNvbnN0IHhtbFVybCA9IE5TVVJMLlVSTFdpdGhTdHJpbmcoeG1sVXJsU3RyaW5nKTtcbiAgICBjb25zdCBkYXRVcmwgPSB4bWxVcmwuVVJMQnlEZWxldGluZ1BhdGhFeHRlbnNpb24uVVJMQnlBcHBlbmRpbmdQYXRoRXh0ZW5zaW9uKFwiZGF0XCIpO1xuICAgIGNvbnN0IGRhdFVybFN0cmluZyA9IGRhdFVybC5hYnNvbHV0ZVN0cmluZztcbiAgICBcbiAgICBjb25zdCBkaXJlY3RvcnlQYXRoVXJsID0geG1sVXJsLlVSTEJ5RGVsZXRpbmdMYXN0UGF0aENvbXBvbmVudDtcbiAgICBjb25zdCBkaXJlY3RvcnlIYXNoID0gZGlyZWN0b3J5UGF0aFVybC5oYXNoO1xuICAgIGNvbnN0IHRtcFBhdGggPSBmaWxlLmtub3duRm9sZGVycy50ZW1wKCkucGF0aDtcbiAgICBjb25zdCBkaXJlY3RvcnlIYXNoUGF0aCA9IHRtcFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZGlyZWN0b3J5SGFzaDtcbiAgICBcbiAgICBmaWxlLkZvbGRlci5mcm9tUGF0aChkaXJlY3RvcnlIYXNoUGF0aCk7XG4gICAgXG4gICAgY29uc3QgeG1sRGVzdFBhdGggPSBkaXJlY3RvcnlIYXNoUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyB4bWxVcmwubGFzdFBhdGhDb21wb25lbnQ7XG4gICAgY29uc3QgZGF0RGVzdFBhdGggPSBkaXJlY3RvcnlIYXNoUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBkYXRVcmwubGFzdFBhdGhDb21wb25lbnQ7XG4gICAgKi9cblxuICAgIGNvbnN0IGRpcmVjdG9yeVBhdGggPSB4bWxVcmxTdHJpbmcuc3Vic3RyaW5nKDAsIHhtbFVybFN0cmluZy5sYXN0SW5kZXhPZihcIi9cIikpO1xuICAgIGNvbnN0IGZpbGVuYW1lID0geG1sVXJsU3RyaW5nLnN1YnN0cmluZyh4bWxVcmxTdHJpbmcubGFzdEluZGV4T2YoXCIvXCIpICsgMSk7XG4gICAgY29uc3QgZmlsZW5hbWVXaXRob3V0RXh0ID0gZmlsZW5hbWUuc3Vic3RyaW5nKDAsIGZpbGVuYW1lLmxhc3RJbmRleE9mKFwiLlwiKSk7XG5cbiAgICBjb25zdCBkYXRVcmxTdHJpbmcgPSBkaXJlY3RvcnlQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGZpbGVuYW1lV2l0aG91dEV4dCArIFwiLmRhdFwiO1xuXG4gICAgY29uc3QgZGlyZWN0b3J5SGFzaCA9IGhhc2hDb2RlKGRpcmVjdG9yeVBhdGgpO1xuICAgIGNvbnN0IHRtcFBhdGggPSBmaWxlLmtub3duRm9sZGVycy50ZW1wKCkucGF0aDtcbiAgICBjb25zdCBkaXJlY3RvcnlIYXNoUGF0aCA9IHRtcFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZGlyZWN0b3J5SGFzaDtcblxuICAgIGZpbGUuRm9sZGVyLmZyb21QYXRoKGRpcmVjdG9yeUhhc2hQYXRoKTtcbiAgICBcbiAgICBjb25zdCB4bWxEZXN0UGF0aCA9IGRpcmVjdG9yeUhhc2hQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGZpbGVuYW1lO1xuICAgIGNvbnN0IGRhdERlc3RQYXRoID0gZGlyZWN0b3J5SGFzaFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZmlsZW5hbWVXaXRob3V0RXh0ICsgXCIuZGF0XCI7XG5cbiAgICBmdW5jdGlvbiBoYXNoQ29kZShzOnN0cmluZykge1xuICAgICAgICB2YXIgaGFzaCA9IDAsIGksIGNociwgbGVuO1xuICAgICAgICBpZiAocy5sZW5ndGggPT09IDApIHJldHVybiBoYXNoO1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBjaHIgICA9IHMuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIGhhc2ggID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaHI7XG4gICAgICAgICAgICBoYXNoIHw9IDA7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBoYXNoO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRvd25sb2FkSWZOZWVkZWQodXJsOnN0cmluZywgZGVzdFBhdGg6c3RyaW5nKSB7XG4gICAgICAgIGxldCBsYXN0TW9kaWZpZWQ6RGF0ZXx1bmRlZmluZWQ7XG4gICAgICAgIGlmIChmaWxlLkZpbGUuZXhpc3RzKGRlc3RQYXRoKSkge1xuICAgICAgICAgICAgY29uc3QgZiA9IGZpbGUuRmlsZS5mcm9tUGF0aChkZXN0UGF0aCk7XG4gICAgICAgICAgICBsYXN0TW9kaWZpZWQgPSBmLmxhc3RNb2RpZmllZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHR0cC5yZXF1ZXN0KHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIG1ldGhvZDonR0VUJyxcbiAgICAgICAgICAgIGhlYWRlcnM6IGxhc3RNb2RpZmllZCA/IHtcbiAgICAgICAgICAgICAgICAnSWYtTW9kaWZpZWQtU2luY2UnOiBsYXN0TW9kaWZpZWQudG9VVENTdHJpbmcoKVxuICAgICAgICAgICAgfSA6IHVuZGVmaW5lZFxuICAgICAgICB9KS50aGVuKChyZXNwb25zZSk9PntcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAzMDQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVmVyaWZpZWQgdGhhdCBjYWNoZWQgdmVyc2lvbiBvZiBmaWxlICR7dXJsfSBhdCAke2Rlc3RQYXRofSBpcyB1cC10by1kYXRlLmApXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3RQYXRoO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5jb250ZW50ICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAzMDApIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYERvd25sb2FkZWQgZmlsZSAke3VybH0gdG8gJHtkZXN0UGF0aH1gKVxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5jb250ZW50LnRvRmlsZShkZXN0UGF0aCkucGF0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5hYmxlIHRvIGRvd25sb2FkIGZpbGUgXCIgKyB1cmwgKyBcIiAgKEhUVFAgc3RhdHVzIGNvZGU6IFwiICsgcmVzcG9uc2Uuc3RhdHVzQ29kZSArIFwiKVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBkb3dubG9hZElmTmVlZGVkKHhtbFVybFN0cmluZyx4bWxEZXN0UGF0aCksIFxuICAgICAgICBkb3dubG9hZElmTmVlZGVkKGRhdFVybFN0cmluZyxkYXREZXN0UGF0aClcbiAgICBdKS50aGVuKCgpPT54bWxEZXN0UGF0aCk7XG59ICJdfQ==