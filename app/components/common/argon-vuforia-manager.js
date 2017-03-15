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
var DEBUG_DEVELOPMENT_LICENSE_KEY = undefined; // 'your_license_key';
var DEBUG_DISABLE_ORIGIN_CHECK = false;
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
var NativescriptVuforiaServiceManager = (function () {
    function NativescriptVuforiaServiceManager(sessionService, contextService, focusService, deviceService) {
        var _this = this;
        this.sessionService = sessionService;
        this.focusService = focusService;
        this.deviceService = deviceService;
        this.stateUpdateEvent = new Argon.Event();
        this.vuforiaTrackerEntity = new Argon.Cesium.Entity({
            position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.deviceService.eye),
            orientation: new Argon.Cesium.ConstantProperty(Quaternion.multiply(z90, y180, {}))
        });
        this._scratchCartesian = new Argon.Cesium.Cartesian3();
        this._scratchQuaternion = new Argon.Cesium.Quaternion();
        this._scratchMatrix3 = new Argon.Cesium.Matrix3();
        this._sessionSwitcherCommandQueue = new Argon.CommandQueue();
        this._sessionCommandQueue = new WeakMap();
        this._sessionKeyPromise = new WeakMap();
        this._sessionLoadedDataSets = new WeakMap();
        this._sessionActivatedDataSets = new WeakMap();
        this._dataSetUriById = new Map();
        this._dataSetIdByUri = new Map();
        this._dataSetInstanceById = new Map();
        this._config = {};
        sessionService.connectEvent.addEventListener(function (session) {
            if (!vuforia.api) {
                session.on['ar.vuforia.isAvailable'] =
                    function () { return Promise.resolve({ available: false }); };
                session.on['ar.vuforia.init'] =
                    function (initOptions) { return Promise.reject(new Error("Vuforia is not supported on this platform")); };
            }
            else {
                session.on['ar.vuforia.isAvailable'] =
                    function () { return Promise.resolve({ available: !!vuforia.api }); };
                session.on['ar.vuforia.init'] =
                    function (initOptions) { return _this._handleInit(session, initOptions); };
                session.on['ar.vuforia.objectTrackerCreateDataSet'] =
                    function (_a) {
                        var url = _a.url;
                        return _this._handleObjectTrackerCreateDataSet(session, url);
                    };
                session.on['ar.vuforia.objectTrackerLoadDataSet'] =
                    function (_a) {
                        var id = _a.id;
                        return _this._handleObjectTrackerLoadDataSet(session, id);
                    };
                session.on['ar.vuforia.objectTrackerActivateDataSet'] =
                    function (_a) {
                        var id = _a.id;
                        return _this._handleObjectTrackerActivateDataSet(session, id);
                    };
                session.on['ar.vuforia.objectTrackerDeactivateDataSet'] =
                    function (_a) {
                        var id = _a.id;
                        return _this._handleObjectTrackerDeactivateDataSet(session, id);
                    };
                session.on['ar.vuforia.objectTrackerUnloadDataSet'] =
                    function (_a) {
                        var id = _a.id;
                        return _this._handleObjectTrackerUnloadDataSet(session, id);
                    };
                // backwards compatability
                session.on['ar.vuforia.dataSetFetch'] = session.on['ar.vuforia.objectTrackerLoadDataSet'];
                session.on['ar.vuforia.dataSetLoad'] = function (_a) {
                    var id = _a.id;
                    _this._handleObjectTrackerLoadDataSet(session, id).then(function (trackables) {
                        return { id: id, trackables: trackables };
                    });
                };
            }
            session.closeEvent.addEventListener(function () { return _this._handleClose(session); });
        });
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
                var position = Matrix4.getTranslation(pose, _this._scratchCartesian);
                var rotationMatrix = Matrix4.getRotation(pose, _this._scratchMatrix3);
                var orientation = Quaternion.fromRotationMatrix(rotationMatrix, _this._scratchQuaternion);
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation);
            }
            _this.stateUpdateEvent.raiseEvent(time);
        };
        vuforia.api.setStateUpdateCallback(stateUpdateCallback);
    }
    NativescriptVuforiaServiceManager.prototype._ensureCommandQueueForSession = function (session) {
        var commandQueue = this._sessionCommandQueue.get(session);
        if (!commandQueue)
            throw new Error('Vuforia must be initialized first');
        return commandQueue;
    };
    NativescriptVuforiaServiceManager.prototype._selectControllingSession = function () {
        var focusSession = this.focusService.session;
        if (focusSession &&
            focusSession.isConnected &&
            this._sessionCommandQueue.get(focusSession)) {
            this._setControllingSession(focusSession);
            return;
        }
        if (this._controllingSession &&
            this._controllingSession.isConnected &&
            this._sessionCommandQueue.get(this._controllingSession))
            return;
        // pick a different session as the controlling session
        // TODO: prioritize any sessions other than the focussed session?
        for (var _i = 0, _a = this.sessionService.managedSessions; _i < _a.length; _i++) {
            var session = _a[_i];
            if (this._sessionCommandQueue.get(session)) {
                this._setControllingSession(session);
                return;
            }
        }
        // if no other session is available,
        // fallback to the manager as the controlling session
        if (this._sessionCommandQueue.get(this.sessionService.manager))
            this._setControllingSession(this.sessionService.manager);
    };
    NativescriptVuforiaServiceManager.prototype._setControllingSession = function (session) {
        var _this = this;
        if (this._controllingSession === session)
            return;
        console.log("VuforiaService: Setting controlling session to " + session.uri);
        if (this._controllingSession) {
            var previousSession_1 = this._controllingSession;
            this._controllingSession = undefined;
            this._sessionSwitcherCommandQueue.push(function () {
                return _this._pauseSession(previousSession_1);
            });
        }
        this._controllingSession = session;
        this._sessionSwitcherCommandQueue.push(function () {
            return _this._resumeSession(session);
        }, true).catch(function () {
            _this._controllingSession = undefined;
        });
    };
    NativescriptVuforiaServiceManager.prototype._pauseSession = function (session) {
        var _this = this;
        console.log('Vuforia: Pausing session ' + session.uri + '...');
        var commandQueue = this._sessionCommandQueue.get(session);
        return commandQueue.push(function () {
            commandQueue.pause();
            var objectTracker = vuforia.api.getObjectTracker();
            if (objectTracker)
                objectTracker.stop();
            var activatedDataSets = _this._sessionActivatedDataSets.get(session);
            if (activatedDataSets) {
                activatedDataSets.forEach(function (id) {
                    _this._objectTrackerDeactivateDataSet(session, id);
                });
            }
            var createdDataSets = _this._sessionLoadedDataSets.get(session);
            if (createdDataSets) {
                createdDataSets.forEach(function (id) {
                    _this._objectTrackerUnloadDataSet(session, id);
                });
            }
            console.log('Vuforia: deinitializing...');
            vuforia.api.getCameraDevice().stop();
            vuforia.api.getCameraDevice().deinit();
            vuforia.api.deinitObjectTracker();
            vuforia.api.deinit();
        }, true);
    };
    NativescriptVuforiaServiceManager.prototype._resumeSession = function (session) {
        var commandQueue = this._sessionCommandQueue.get(session);
        if (!commandQueue)
            throw new Error('Vuforia: Invalid State. Attempted to resume a session which has not been initialized');
        console.log('Vuforia: Resuming session ' + session.uri + '...');
        return this._init(session).then(function () {
            commandQueue.execute();
        });
    };
    NativescriptVuforiaServiceManager.prototype._init = function (session) {
        var _this = this;
        var keyPromise = this._sessionKeyPromise.get(session);
        if (!keyPromise)
            throw new Error('Vuforia: Invalid State. Missing Key.');
        return keyPromise.then(function (key) {
            if (!vuforia.api.setLicenseKey(key)) {
                return Promise.reject(new Error('Vuforia: Unable to set the license key'));
            }
            console.log('Vuforia: initializing...');
            return vuforia.api.init().then(function (result) {
                console.log('Vuforia: Init Result: ' + result);
                if (result === vuforia.InitResult.SUCCESS) {
                    throw new Error(vuforia.InitResult[result]);
                }
                // must initialize trackers before initializing the camera device
                if (!vuforia.api.initObjectTracker()) {
                    throw new Error("Vuforia: Unable to initialize ObjectTracker");
                }
                var cameraDevice = vuforia.api.getCameraDevice();
                console.log("Vuforia: initializing camera device...");
                if (!cameraDevice.init(0 /* Default */))
                    throw new Error('Unable to initialize camera device');
                if (!cameraDevice.selectVideoMode(exports.vuforiaCameraDeviceMode))
                    throw new Error('Unable to select video mode');
                if (!vuforia.api.getDevice().setMode(0 /* AR */))
                    throw new Error('Unable to set device mode');
                _this.configureVuforiaVideoBackground({
                    x: 0,
                    y: 0,
                    width: vuforia.videoView.getMeasuredWidth(),
                    height: vuforia.videoView.getMeasuredHeight()
                }, false);
                if (!vuforia.api.getCameraDevice().start())
                    throw new Error('Unable to start camera');
                var createdDataSets = _this._sessionLoadedDataSets.get(session);
                var loadPromises = [];
                if (createdDataSets) {
                    createdDataSets.forEach(function (id) {
                        loadPromises.push(_this._objectTrackerLoadDataSet(session, id));
                    });
                }
                return Promise.all(loadPromises);
            }).then(function () {
                var activatedDataSets = _this._sessionActivatedDataSets.get(session);
                var activatePromises = [];
                if (activatedDataSets) {
                    activatedDataSets.forEach(function (id) {
                        activatePromises.push(_this._objectTrackerActivateDataSet(session, id));
                    });
                }
                return activatePromises;
            }).then(function () {
                var objectTracker = vuforia.api.getObjectTracker();
                if (!objectTracker)
                    throw new Error('Vuforia: Unable to get objectTracker instance');
                objectTracker.start();
            });
        });
    };
    NativescriptVuforiaServiceManager.prototype._handleInit = function (session, options) {
        var _this = this;
        if (!options.key && !options.encryptedLicenseData)
            throw new Error('No license key was provided. Get one from https://developer.vuforia.com/');
        if (this._sessionCommandQueue.get(session))
            throw new Error('Already initialized');
        if (DEBUG_DEVELOPMENT_LICENSE_KEY)
            options.key = DEBUG_DEVELOPMENT_LICENSE_KEY;
        var keyPromise = options.key ?
            Promise.resolve(options.key) :
            this._decryptLicenseKey(options.encryptedLicenseData, session);
        this._sessionKeyPromise.set(session, keyPromise);
        var commandQueue = new Argon.CommandQueue;
        this._sessionCommandQueue.set(session, commandQueue);
        return commandQueue.push(function () {
            return _this._init(session);
        });
    };
    NativescriptVuforiaServiceManager.prototype._handleClose = function (session) {
        this._sessionKeyPromise.delete(session);
        this._sessionCommandQueue.delete(session);
        if (this._controllingSession === session) {
            this._selectControllingSession();
        }
    };
    NativescriptVuforiaServiceManager.prototype._handleObjectTrackerCreateDataSet = function (session, uri) {
        var _this = this;
        return fetchDataSet(uri).then(function () {
            var id = _this._dataSetIdByUri.get(uri);
            if (!id) {
                id = Argon.Cesium.createGuid();
                _this._dataSetIdByUri.set(uri, id);
                _this._dataSetUriById.set(id, uri);
            }
            return { id: id };
        });
    };
    NativescriptVuforiaServiceManager.prototype._objectTrackerLoadDataSet = function (session, id) {
        var _this = this;
        var uri = this._dataSetUriById.get(id);
        if (!uri)
            throw new Error("Vuforia: Unknown DataSet id: " + id);
        var objectTracker = vuforia.api.getObjectTracker();
        if (!objectTracker)
            throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.');
        var dataSet = this._dataSetInstanceById.get(id);
        var trackablesPromise;
        if (dataSet) {
            trackablesPromise = Promise.resolve(this._getTrackablesFromDataSet(dataSet));
        }
        else {
            console.log("Vuforia: Loading dataset (" + id + ") from " + uri + "...");
            trackablesPromise = fetchDataSet(uri).then(function (location) {
                dataSet = objectTracker.createDataSet();
                if (!dataSet)
                    throw new Error("Vuforia: Unable to create dataset instance");
                _this._dataSetInstanceById.set(id, dataSet);
                if (dataSet.load(location, 2 /* Absolute */)) {
                    var trackables = _this._getTrackablesFromDataSet(dataSet);
                    console.log('Vuforia loaded dataset file with trackables:\n' + JSON.stringify(trackables));
                    return trackables;
                }
                console.log("Unable to load downloaded dataset at " + location + " from " + uri);
                throw new Error('Unable to load dataset');
            });
        }
        trackablesPromise.then(function (trackables) {
            session.send('ar.vuforia.objectTrackerLoadDataSetEvent', { id: id, trackables: trackables });
        });
        return trackablesPromise;
    };
    NativescriptVuforiaServiceManager.prototype._getTrackablesFromDataSet = function (dataSet) {
        var numTrackables = dataSet.getNumTrackables();
        var trackables = {};
        for (var i = 0; i < numTrackables; i++) {
            var trackable = dataSet.getTrackable(i);
            trackables[trackable.getName()] = {
                id: this._getIdForTrackable(trackable),
                size: trackable instanceof vuforia.ObjectTarget ? trackable.getSize() : { x: 0, y: 0, z: 0 }
            };
        }
        return trackables;
    };
    NativescriptVuforiaServiceManager.prototype._handleObjectTrackerLoadDataSet = function (session, id) {
        var _this = this;
        return this._ensureCommandQueueForSession(session).push(function () {
            return _this._objectTrackerLoadDataSet(session, id);
        });
    };
    NativescriptVuforiaServiceManager.prototype._objectTrackerActivateDataSet = function (session, id) {
        var _this = this;
        console.log("Vuforia activating dataset (" + id + ")");
        var objectTracker = vuforia.api.getObjectTracker();
        if (!objectTracker)
            throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.');
        var dataSet = this._dataSetInstanceById.get(id);
        var dataSetPromise;
        if (!dataSet) {
            dataSetPromise = this._objectTrackerLoadDataSet(session, id).then(function () {
                return _this._dataSetInstanceById.get(id);
            });
        }
        else {
            dataSetPromise = Promise.resolve(dataSet);
        }
        return dataSetPromise.then(function (dataSet) {
            if (!objectTracker.activateDataSet(dataSet))
                throw new Error("Vuforia: Unable to activate dataSet " + id);
            session.send('ar.vuforia.objectTrackerActivateDataSetEvent', { id: id });
        });
    };
    NativescriptVuforiaServiceManager.prototype._handleObjectTrackerActivateDataSet = function (session, id) {
        var _this = this;
        return this._ensureCommandQueueForSession(session).push(function () {
            return _this._objectTrackerActivateDataSet(session, id);
        });
    };
    NativescriptVuforiaServiceManager.prototype._objectTrackerDeactivateDataSet = function (session, id) {
        console.log("Vuforia deactivating dataset (" + id + ")");
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = this._dataSetInstanceById.get(id);
            if (dataSet != null) {
                var success = objectTracker.deactivateDataSet(dataSet);
                if (success)
                    session.send('ar.vuforia.objectTrackerDeactivateDataSetEvent', { id: id });
                return success;
            }
        }
        return false;
    };
    NativescriptVuforiaServiceManager.prototype._handleObjectTrackerDeactivateDataSet = function (session, id) {
        var _this = this;
        return this._ensureCommandQueueForSession(session).push(function () {
            if (!_this._objectTrackerDeactivateDataSet(session, id))
                throw new Error("Vuforia: unable to activate dataset " + id);
        });
    };
    NativescriptVuforiaServiceManager.prototype._objectTrackerUnloadDataSet = function (session, id) {
        console.log("Vuforia: unloading dataset (" + id + ")...");
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = this._dataSetInstanceById.get(id);
            if (dataSet != null) {
                var deleted = objectTracker.destroyDataSet(dataSet);
                if (deleted) {
                    this._dataSetInstanceById.delete(id);
                    session.send('ar.vuforia.objectTrackerDeactivateDataSetEvent', { id: id });
                }
                return deleted;
            }
        }
        return false;
    };
    NativescriptVuforiaServiceManager.prototype._handleObjectTrackerUnloadDataSet = function (session, id) {
        var _this = this;
        return this._ensureCommandQueueForSession(session).push(function () {
            if (!_this._objectTrackerUnloadDataSet(session, id))
                throw new Error("Vuforia: unable to unload dataset " + id);
        });
    };
    NativescriptVuforiaServiceManager.prototype._getIdForTrackable = function (trackable) {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        }
        else {
            return 'vuforia_trackable_' + trackable.getId();
        }
    };
    NativescriptVuforiaServiceManager.prototype._decryptLicenseKey = function (encryptedLicenseData, session) {
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
    NativescriptVuforiaServiceManager.prototype.configureVuforiaVideoBackground = function (viewport, enabled, reflection) {
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
        console.log("Vuforia configuring video background...\n            contentScaleFactor: " + contentScaleFactor + " orientation: " + orientation + " \n            viewWidth: " + viewWidth + " viewHeight: " + viewHeight + " videoWidth: " + videoWidth + " videoHeight: " + videoHeight + " \n            config: " + JSON.stringify(config) + "\n        ");
        absolute_layout_1.AbsoluteLayout.setLeft(videoView, viewport.x);
        absolute_layout_1.AbsoluteLayout.setTop(videoView, viewport.y);
        videoView.width = viewWidth;
        videoView.height = viewHeight;
        vuforia.api.getRenderer().setVideoBackgroundConfig(config);
    };
    return NativescriptVuforiaServiceManager;
}());
NativescriptVuforiaServiceManager = __decorate([
    Argon.DI.inject(Argon.SessionService, Argon.ContextService, Argon.FocusService, Argon.DeviceService)
], NativescriptVuforiaServiceManager);
exports.NativescriptVuforiaServiceManager = NativescriptVuforiaServiceManager;
// TODO: make this cross platform somehow
function fetchDataSet(xmlUrlString) {
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
//# sourceMappingURL=argon-vuforia-manager.js.map