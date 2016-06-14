"use strict";
var application = require('application');
var frames = require('ui/frame');
var Argon = require('argon');
var vuforia = require('nativescript-vuforia');
var http = require('http');
var file = require('file-system');
var platform = require('platform');
var argon_device_service_1 = require('./argon-device-service');
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
var ONE = new Cartesian3(1, 1, 1);
var cameraDeviceMode = -3 /* OpimizeQuality */;
if (vuforia.videoView.ios) {
    vuforia.videoView.ios.contentScaleFactor = cameraDeviceMode === -2 /* OptimizeSpeed */ ?
        1 : platform.screen.mainScreen.scale;
}
var NativescriptVuforiaServiceDelegate = (function (_super) {
    __extends(NativescriptVuforiaServiceDelegate, _super);
    function NativescriptVuforiaServiceDelegate(deviceService, contextService) {
        var _this = this;
        _super.call(this);
        this.deviceService = deviceService;
        this.contextService = contextService;
        this.stateUpdateEvent = new Argon.Event();
        this.scratchDate = new Argon.Cesium.JulianDate();
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
            deviceService.update();
            var vuforiaFrame = state.getFrame();
            var index = vuforiaFrame.getIndex();
            var frameTimeStamp = vuforiaFrame.getTimeStamp();
            // update trackable results in context entity collection
            var numTrackableResults = state.getNumTrackableResults();
            for (var i = 0; i < numTrackableResults; i++) {
                var trackableResult = state.getTrackableResult(i);
                var trackable = trackableResult.getTrackable();
                var name_1 = trackable.getName();
                var id = _this._getIdForTrackable(trackable);
                var entity = contextService.subscribedEntities.getById(id);
                if (!entity) {
                    entity = new Argon.Cesium.Entity({
                        id: id,
                        name: name_1,
                        position: new Argon.Cesium.SampledPositionProperty(_this.vuforiaTrackerEntity),
                        orientation: new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion)
                    });
                    entity.position.maxNumSamples = 10;
                    entity.orientation.maxNumSamples = 10;
                    entity.position.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entity.orientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entity.position.forwardExtrapolationDuration = 2 / 60;
                    entity.orientation.forwardExtrapolationDuration = 2 / 60;
                    contextService.subscribedEntities.add(entity);
                }
                var trackableTime = JulianDate.clone(time);
                // add any time diff from vuforia
                var trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
                if (trackableTimeDiff !== 0)
                    JulianDate.addSeconds(time, trackableTimeDiff, trackableTime);
                var pose = trackableResult.getPose();
                var position = Matrix4.getTranslation(pose, _this.scratchCartesian);
                var rotationMatrix = Matrix4.getRotation(pose, _this.scratchMatrix3);
                var orientation_1 = Quaternion.fromRotationMatrix(rotationMatrix, _this.scratchQuaternion);
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation_1);
            }
            // if no one is listening, don't bother calculating the view state or raising an event. 
            // (this can happen when the vuforia video reality is not the current reality, though
            // we still want to update the trackables above in case an app is depending on them)
            if (_this.stateUpdateEvent.numberOfListeners === 0)
                return;
            var device = vuforia.api.getDevice();
            var renderingPrimitives = device.getRenderingPrimitives();
            var renderingViews = renderingPrimitives.getRenderingViews();
            var numViews = renderingViews.getNumViews();
            var subviews = [];
            var contentScaleFactor = vuforia.videoView.ios.contentScaleFactor;
            for (var i = 0; i < numViews; i++) {
                var view_1 = renderingViews.getView(i);
                if (view_1 === 3 /* PostProcess */)
                    continue;
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
                // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
                // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
                var projectionMatrix = renderingPrimitives.getProjectionMatrix(view_1, 1 /* Camera */);
                // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation vuforia's video (at least on iOS) is the landscape right orientation,
                // this is the orientation where the device is held in landscape with the home button on the right. 
                // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
                // So, we want to undo this rotation which vuforia applies for us.  
                // TODO: calculate this matrix only when we have to (when the interface orientation changes)
                var inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + argon_device_service_1.getInterfaceOrientation() * Math.PI / 180), _this.scratchQuaternion), ONE, _this.scratchMatrix4);
                Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);
                // convert from the vuforia projection matrix (+X -Y +X) to a more standard convention (+X +Y -Z)
                // by negating the appropriate rows. 
                // See https://developer.vuforia.com/library/articles/Solution/How-To-Use-the-Camera-Projection-Matrix
                // flip y axis so it is positive
                projectionMatrix[4] *= -1; // x
                projectionMatrix[5] *= -1; // y
                projectionMatrix[6] *= -1; // z
                projectionMatrix[7] *= -1; // w
                // flip z axis so it is negative
                projectionMatrix[8] *= -1; // x
                projectionMatrix[9] *= -1; // y
                projectionMatrix[10] *= -1; // z
                projectionMatrix[11] *= -1; // w
                if (vuforia.videoView.ios && device.isViewerActive()) {
                    // TODO: move getSceneScaleFactor to javascript so we can customize it more easily and 
                    // then provide a means of passing an arbitrary scale factor to the video renderer.
                    // We can then provide controls to zoom in/out the video reality using this scale factor. 
                    var sceneScaleFactor = vuforia.videoView.ios.getSceneScaleFactor();
                    // scale x-axis
                    projectionMatrix[0] *= sceneScaleFactor; // x
                    projectionMatrix[1] *= sceneScaleFactor; // y
                    projectionMatrix[2] *= sceneScaleFactor; // z
                    projectionMatrix[3] *= sceneScaleFactor; // w
                    // scale y-axis
                    projectionMatrix[4] *= sceneScaleFactor; // x
                    projectionMatrix[5] *= sceneScaleFactor; // y
                    projectionMatrix[6] *= sceneScaleFactor; // z
                    projectionMatrix[7] *= sceneScaleFactor; // w
                }
                var viewport = renderingPrimitives.getViewport(view_1);
                subviews.push({
                    type: type,
                    projectionMatrix: projectionMatrix,
                    viewport: {
                        x: Math.round(viewport.x / contentScaleFactor),
                        y: Math.round(viewport.y / contentScaleFactor),
                        width: Math.round(viewport.z / contentScaleFactor),
                        height: Math.round(viewport.w / contentScaleFactor)
                    }
                });
            }
            // We expect the video view (managed by the browser view) to be the 
            // same size as the current page's content view.
            var contentView = frames.topmost().currentPage.content;
            // construct the final view parameters for this frame
            var view = {
                viewport: {
                    x: 0,
                    y: 0,
                    width: contentView.getMeasuredWidth(),
                    height: contentView.getMeasuredHeight()
                },
                pose: Argon.getSerializedEntityPose(_this.deviceService.interfaceEntity, time),
                subviews: subviews
            };
            // raise the event to let the vuforia service know we are ready!
            _this.stateUpdateEvent.raiseEvent({
                index: index,
                time: time,
                view: view
            });
            vuforia.api.onNextStateUpdate(stateUpdateCallback);
        };
        vuforia.api.onNextStateUpdate(stateUpdateCallback);
    }
    NativescriptVuforiaServiceDelegate.prototype._getIdForTrackable = function (trackable) {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        }
        else {
            return 'vuforia_trackable_' + trackable.getId();
        }
    };
    NativescriptVuforiaServiceDelegate.prototype.isViewerEnabled = function () {
        return this._viewerEnabled;
    };
    NativescriptVuforiaServiceDelegate.prototype.setViewerEnabled = function (enabled) {
        this._viewerEnabled = enabled;
        var device = vuforia.api.getDevice();
        if (device)
            device.setViewerActive(enabled);
    };
    NativescriptVuforiaServiceDelegate.prototype.isAvailable = function () {
        return !!vuforia.api;
    };
    NativescriptVuforiaServiceDelegate.prototype.setHint = function (hint, value) {
        return vuforia.api.setHint(hint, value);
    };
    NativescriptVuforiaServiceDelegate.prototype.init = function (options) {
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
        if (!cameraDevice.selectVideoMode(cameraDeviceMode))
            return false;
        vuforia.api.getDevice().setMode(0 /* AR */);
        this.setViewerEnabled(this._viewerEnabled);
        configureVideoBackground();
        console.log("Vuforia starting camera device");
        return cameraDevice.start();
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
        return null;
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
        if (url) {
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
        Argon.DI.inject(Argon.DeviceService, Argon.ContextService)
    ], NativescriptVuforiaServiceDelegate);
    return NativescriptVuforiaServiceDelegate;
}(Argon.VuforiaServiceDelegateBase));
exports.NativescriptVuforiaServiceDelegate = NativescriptVuforiaServiceDelegate;
function configureVideoBackground() {
    var frame = frames.topmost();
    var viewWidth = frame.getMeasuredWidth();
    var viewHeight = frame.getMeasuredHeight();
    var contentScaleFactor = vuforia.videoView.ios ? vuforia.videoView.ios.contentScaleFactor : 1;
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
        sizeX: Math.round(videoWidth * scale * contentScaleFactor),
        sizeY: Math.round(videoHeight * scale * contentScaleFactor),
        reflection: 0 /* Default */
    };
    console.log("Vuforia configuring video background...\n        contentScaleFactor: " + contentScaleFactor + " orientation: " + orientation + " \n        viewWidth: " + viewWidth + " viewHeight: " + viewHeight + " videoWidth: " + videoWidth + " videoHeight: " + videoHeight + " \n        config: " + JSON.stringify(config) + "\n    ");
    vuforia.api.getRenderer().setVideoBackgroundConfig(config);
}
if (vuforia.api)
    application.on(application.orientationChangedEvent, function () {
        Promise.resolve().then(configureVideoBackground); // delay callback until the interface orientation is updated
    });
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
            else if (response.statusCode >= 200 && response.statusCode < 300) {
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