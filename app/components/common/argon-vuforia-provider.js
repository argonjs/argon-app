"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.vuforiaCameraDeviceMode = vuforia.CameraDeviceMode.OpimizeQuality;
if (vuforia.videoView.ios) {
    vuforia.videoView.ios.contentScaleFactor =
        exports.vuforiaCameraDeviceMode === vuforia.CameraDeviceMode.OptimizeSpeed ?
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
var VuforiaSessionData = (function () {
    function VuforiaSessionData(keyPromise) {
        this.keyPromise = keyPromise;
        this.commandQueue = new Argon.CommandQueue;
        this.loadedDataSets = new Set();
        this.activatedDataSets = new Set();
        this.dataSetUriById = new Map();
        this.dataSetIdByUri = new Map();
        this.dataSetInstanceById = new Map();
    }
    return VuforiaSessionData;
}());
var NativescriptVuforiaServiceProvider = (function () {
    function NativescriptVuforiaServiceProvider(sessionService, focusServiceProvider, contextService, 
        // private deviceService:Argon.DeviceService,
        contextServiceProvider, realityService) {
        // this.sessionService.connectEvent.addEventListener(()=>{
        //     this.stateUpdateEvent.addEventListener(()=>{
        //         const reality = this.contextService.serializedFrameState.reality;
        //         if (reality === Argon.RealityViewer.LIVE) this.deviceService.update();
        //     });
        //     setTimeout(()=>{
        //         const reality = this.contextService.serializedFrameState.reality;
        //         if (reality !== Argon.RealityViewer.LIVE) this.deviceService.update();
        //     }, 60)
        // })
        var _this = this;
        this.sessionService = sessionService;
        this.focusServiceProvider = focusServiceProvider;
        this.contextService = contextService;
        this.contextServiceProvider = contextServiceProvider;
        this.stateUpdateEvent = new Argon.Event();
        this.vuforiaTrackerEntity = new Argon.Cesium.Entity({
            position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.contextService.display),
            orientation: new Argon.Cesium.ConstantProperty(Quaternion.multiply(z90, y180, {}))
        });
        this._scratchCartesian = new Argon.Cesium.Cartesian3();
        this._scratchQuaternion = new Argon.Cesium.Quaternion();
        this._scratchMatrix3 = new Argon.Cesium.Matrix3();
        this._sessionSwitcherCommandQueue = new Argon.CommandQueue();
        this._sessionData = new WeakMap();
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
                    return _this._handleObjectTrackerLoadDataSet(session, id);
                };
            }
            session.closeEvent.addEventListener(function () { return _this._handleClose(session); });
        });
        if (!vuforia.api)
            return;
        // // switch to AR mode when LIVE reality is presenting
        // realityService.changeEvent.addEventListener(({current})=>{
        //     this._setDeviceMode(
        //         current === Argon.RealityViewer.LIVE ? 
        //             vuforia.DeviceMode.AR : vuforia.DeviceMode.VR
        //     );
        // });
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
                    entityPosition.forwardExtrapolationDuration = 10 / 60;
                    entityOrientation.forwardExtrapolationDuration = 10 / 60;
                    contextService.entities.add(entity);
                    _this.contextServiceProvider.publishingReferenceFrameMap.set(id, _this.contextService.user.id);
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
                // const inverseVideoOrientation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, getScreenOrientation() * CesiumMath.RADIANS_PER_DEGREE, this._scratchScreenOrientationQuaternion);
                // Quaternion.multiply(orientation, inverseVideoOrientation, orientation);
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation);
            }
            // try {
            _this.stateUpdateEvent.raiseEvent(time);
            // } catch(e) {
            // this.sessionService.errorEvent.raiseEvent(e);
            // }
        };
        vuforia.api.setStateUpdateCallback(stateUpdateCallback);
    }
    // private _deviceMode = vuforia.DeviceMode.VR;
    // private _setDeviceMode(deviceMode: vuforia.DeviceMode) {
    //     this._deviceMode = deviceMode;
    //     // following may fail (return false) if vuforia is not currently initialized, 
    //     // but that's okay (since next time we initilaize we will use the saved mode). 
    //     vuforia.api.getDevice().setMode(deviceMode); 
    // } 
    NativescriptVuforiaServiceProvider.prototype._getSessionData = function (session) {
        var sessionData = this._sessionData.get(session);
        if (!sessionData)
            throw new Error('Vuforia must be initialized first');
        return sessionData;
    };
    NativescriptVuforiaServiceProvider.prototype._getCommandQueueForSession = function (session) {
        var sessionData = this._sessionData.get(session);
        if (!sessionData.commandQueue)
            throw new Error('Vuforia must be initialized first');
        return sessionData.commandQueue;
    };
    NativescriptVuforiaServiceProvider.prototype._selectControllingSession = function () {
        var focusSession = this.focusServiceProvider.session;
        if (focusSession &&
            focusSession.isConnected &&
            this._sessionData.has(focusSession)) {
            this._setControllingSession(focusSession);
            return;
        }
        if (this._controllingSession &&
            this._controllingSession.isConnected &&
            this._sessionData.has(this._controllingSession))
            return;
        // pick a different session as the controlling session
        // TODO: prioritize any sessions other than the focussed session?
        for (var _i = 0, _a = this.sessionService.managedSessions; _i < _a.length; _i++) {
            var session = _a[_i];
            if (this._sessionData.has(session)) {
                this._setControllingSession(session);
                return;
            }
        }
        // if no other session is available,
        // fallback to the manager as the controlling session
        if (this._sessionData.has(this.sessionService.manager))
            this._setControllingSession(this.sessionService.manager);
    };
    NativescriptVuforiaServiceProvider.prototype._setControllingSession = function (session) {
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
    NativescriptVuforiaServiceProvider.prototype._pauseSession = function (session) {
        var _this = this;
        console.log('Vuforia: Pausing session ' + session.uri + '...');
        var sessionData = this._getSessionData(session);
        var commandQueue = sessionData.commandQueue;
        return commandQueue.push(function () {
            commandQueue.pause();
            // If the session is closed, we set the permanent flag to true.
            // Likewise, if the session is not closed, we set the permanent flat to false,
            // maintaining the current session state.
            var permanent = session.isClosed;
            var objectTracker = vuforia.api.getObjectTracker();
            if (objectTracker)
                objectTracker.stop();
            var activatedDataSets = sessionData.activatedDataSets;
            if (activatedDataSets) {
                activatedDataSets.forEach(function (id) {
                    _this._objectTrackerDeactivateDataSet(session, id, permanent);
                });
            }
            var loadedDataSets = sessionData.loadedDataSets;
            if (loadedDataSets) {
                loadedDataSets.forEach(function (id) {
                    _this._objectTrackerUnloadDataSet(session, id, permanent);
                });
            }
            console.log('Vuforia: deinitializing...');
            vuforia.api.getCameraDevice().stop();
            vuforia.api.getCameraDevice().deinit();
            vuforia.api.deinitObjectTracker();
            vuforia.api.deinit();
            if (permanent) {
                _this._sessionData.delete(session);
            }
        }, true);
    };
    NativescriptVuforiaServiceProvider.prototype._resumeSession = function (session) {
        var commandQueue = this._getCommandQueueForSession(session);
        console.log('Vuforia: Resuming session ' + session.uri + '...');
        return this._init(session).then(function () {
            commandQueue.execute();
        });
    };
    NativescriptVuforiaServiceProvider.prototype._init = function (session) {
        var _this = this;
        var sessionData = this._getSessionData(session);
        var keyPromise = sessionData.keyPromise;
        if (!keyPromise)
            throw new Error('Vuforia: Invalid State. Missing Key.');
        return keyPromise.then(function (key) {
            if (!vuforia.api.setLicenseKey(key)) {
                return Promise.reject(new Error('Vuforia: Unable to set the license key'));
            }
            console.log('Vuforia: initializing...');
            return vuforia.api.init().then(function (result) {
                console.log('Vuforia: Init Result: ' + result);
                var resolveInitResult = sessionData.initResultResolver;
                if (resolveInitResult) {
                    resolveInitResult(result);
                    sessionData.initResultResolver = undefined;
                }
                if (result !== vuforia.InitResult.SUCCESS) {
                    throw new Error(vuforia.InitResult[result]);
                }
                // must initialize trackers before initializing the camera device
                if (!vuforia.api.initObjectTracker()) {
                    throw new Error("Vuforia: Unable to initialize ObjectTracker");
                }
                var cameraDevice = vuforia.api.getCameraDevice();
                console.log("Vuforia: initializing camera device...");
                if (!cameraDevice.init(vuforia.CameraDeviceDirection.Default))
                    throw new Error('Unable to initialize camera device');
                if (!cameraDevice.selectVideoMode(exports.vuforiaCameraDeviceMode))
                    throw new Error('Unable to select video mode');
                if (!vuforia.api.getDevice().setMode(vuforia.DeviceMode.AR))
                    throw new Error('Unable to set device mode');
                // this.configureVuforiaVideoBackground({
                //     x:0,
                //     y:0,
                //     width:vuforia.videoView.getMeasuredWidth(), 
                //     height:vuforia.videoView.getMeasuredHeight()
                // }, false);
                if (!vuforia.api.getCameraDevice().start())
                    throw new Error('Unable to start camera');
                var loadedDataSets = sessionData.loadedDataSets;
                var loadPromises = [];
                if (loadedDataSets) {
                    loadedDataSets.forEach(function (id) {
                        loadPromises.push(_this._objectTrackerLoadDataSet(session, id));
                    });
                }
                return Promise.all(loadPromises);
            }).then(function () {
                var activatedDataSets = sessionData.activatedDataSets;
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
    NativescriptVuforiaServiceProvider.prototype._handleInit = function (session, options) {
        if (!options.key && !options.encryptedLicenseData)
            throw new Error('No license key was provided. Get one from https://developer.vuforia.com/');
        if (this._sessionData.has(session))
            throw new Error('Already initialized');
        if (DEBUG_DEVELOPMENT_LICENSE_KEY)
            options.key = DEBUG_DEVELOPMENT_LICENSE_KEY;
        var keyPromise = options.key ?
            Promise.resolve(options.key) :
            this._decryptLicenseKey(options.encryptedLicenseData, session);
        var sessionData = new VuforiaSessionData(keyPromise);
        this._sessionData.set(session, sessionData);
        var initResult = new Promise(function (resolve) {
            sessionData.initResultResolver = resolve;
        });
        this._selectControllingSession();
        return initResult;
    };
    NativescriptVuforiaServiceProvider.prototype._handleClose = function (session) {
        if (this._controllingSession === session) {
            this._selectControllingSession();
        }
    };
    NativescriptVuforiaServiceProvider.prototype._handleObjectTrackerCreateDataSet = function (session, uri) {
        var _this = this;
        return fetchDataSet(uri).then(function () {
            var sessionData = _this._getSessionData(session);
            var id = sessionData.dataSetIdByUri.get(uri);
            if (!id) {
                id = Argon.Cesium.createGuid();
                sessionData.dataSetIdByUri.set(uri, id);
                sessionData.dataSetUriById.set(id, uri);
            }
            return { id: id };
        });
    };
    NativescriptVuforiaServiceProvider.prototype._objectTrackerLoadDataSet = function (session, id) {
        var _this = this;
        var sessionData = this._getSessionData(session);
        var uri = sessionData.dataSetUriById.get(id);
        if (!uri)
            throw new Error("Vuforia: Unknown DataSet id: " + id);
        var objectTracker = vuforia.api.getObjectTracker();
        if (!objectTracker)
            throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.');
        var dataSet = sessionData.dataSetInstanceById.get(id);
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
                if (dataSet.load(location, vuforia.StorageType.Absolute)) {
                    sessionData.dataSetInstanceById.set(id, dataSet);
                    sessionData.loadedDataSets.add(id);
                    var trackables = _this._getTrackablesFromDataSet(dataSet);
                    console.log('Vuforia loaded dataset file with trackables:\n' + JSON.stringify(trackables));
                    return trackables;
                }
                objectTracker.destroyDataSet(dataSet);
                console.log("Unable to load downloaded dataset at " + location + " from " + uri);
                throw new Error('Unable to load dataset');
            });
        }
        if (session.version[0] > 0) {
            trackablesPromise.then(function (trackables) {
                session.send('ar.vuforia.objectTrackerLoadDataSetEvent', { id: id, trackables: trackables });
            });
        }
        return trackablesPromise;
    };
    NativescriptVuforiaServiceProvider.prototype._getTrackablesFromDataSet = function (dataSet) {
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
    NativescriptVuforiaServiceProvider.prototype._handleObjectTrackerLoadDataSet = function (session, id) {
        var _this = this;
        return this._getCommandQueueForSession(session).push(function () {
            return _this._objectTrackerLoadDataSet(session, id);
        });
    };
    NativescriptVuforiaServiceProvider.prototype._objectTrackerActivateDataSet = function (session, id) {
        console.log("Vuforia activating dataset (" + id + ")");
        var objectTracker = vuforia.api.getObjectTracker();
        if (!objectTracker)
            throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.');
        var sessionData = this._getSessionData(session);
        var dataSet = sessionData.dataSetInstanceById.get(id);
        var dataSetPromise;
        if (!dataSet) {
            dataSetPromise = this._objectTrackerLoadDataSet(session, id).then(function () {
                return sessionData.dataSetInstanceById.get(id);
            });
        }
        else {
            dataSetPromise = Promise.resolve(dataSet);
        }
        return dataSetPromise.then(function (dataSet) {
            if (!objectTracker.activateDataSet(dataSet))
                throw new Error("Vuforia: Unable to activate dataSet " + id);
            sessionData.activatedDataSets.add(id);
            if (session.version[0] > 0)
                session.send('ar.vuforia.objectTrackerActivateDataSetEvent', { id: id });
        });
    };
    NativescriptVuforiaServiceProvider.prototype._handleObjectTrackerActivateDataSet = function (session, id) {
        var _this = this;
        return this._getCommandQueueForSession(session).push(function () {
            return _this._objectTrackerActivateDataSet(session, id);
        });
    };
    NativescriptVuforiaServiceProvider.prototype._objectTrackerDeactivateDataSet = function (session, id, permanent) {
        if (permanent === void 0) { permanent = true; }
        console.log("Vuforia deactivating dataset (" + id + ")");
        var sessionData = this._getSessionData(session);
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = sessionData.dataSetInstanceById.get(id);
            if (dataSet != null) {
                var success = objectTracker.deactivateDataSet(dataSet);
                if (success) {
                    if (permanent) {
                        sessionData.activatedDataSets.delete(id);
                    }
                    if (session.version[0] > 0)
                        session.send('ar.vuforia.objectTrackerDeactivateDataSetEvent', { id: id });
                }
                return success;
            }
        }
        return false;
    };
    NativescriptVuforiaServiceProvider.prototype._handleObjectTrackerDeactivateDataSet = function (session, id) {
        var _this = this;
        return this._getCommandQueueForSession(session).push(function () {
            if (!_this._objectTrackerDeactivateDataSet(session, id))
                throw new Error("Vuforia: unable to activate dataset " + id);
        });
    };
    NativescriptVuforiaServiceProvider.prototype._objectTrackerUnloadDataSet = function (session, id, permanent) {
        if (permanent === void 0) { permanent = true; }
        console.log("Vuforia: unloading dataset (" + id + ")...");
        var sessionData = this._getSessionData(session);
        var objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            var dataSet = sessionData.dataSetInstanceById.get(id);
            if (dataSet != null) {
                var deleted = objectTracker.destroyDataSet(dataSet);
                if (deleted) {
                    if (permanent) {
                        var uri = sessionData.dataSetUriById.get(id);
                        sessionData.dataSetIdByUri.delete(uri);
                        sessionData.loadedDataSets.delete(id);
                        sessionData.dataSetUriById.delete(id);
                        sessionData.dataSetInstanceById.delete(id);
                    }
                    if (session.version[0] > 0)
                        session.send('ar.vuforia.objectTrackerUnloadDataSetEvent', { id: id });
                }
                return deleted;
            }
        }
        return false;
    };
    NativescriptVuforiaServiceProvider.prototype._handleObjectTrackerUnloadDataSet = function (session, id) {
        var _this = this;
        return this._getCommandQueueForSession(session).push(function () {
            if (!_this._objectTrackerUnloadDataSet(session, id))
                throw new Error("Vuforia: unable to unload dataset " + id);
        });
    };
    NativescriptVuforiaServiceProvider.prototype._getIdForTrackable = function (trackable) {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        }
        else {
            return 'vuforia_trackable_' + trackable.getId();
        }
    };
    NativescriptVuforiaServiceProvider.prototype._decryptLicenseKey = function (encryptedLicenseData, session) {
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
    NativescriptVuforiaServiceProvider.prototype.configureVuforiaVideoBackground = function (viewport, enabled, reflection) {
        if (reflection === void 0) { reflection = vuforia.VideoBackgroundReflection.Default; }
        var viewWidth = viewport.width;
        var viewHeight = viewport.height;
        var cameraDevice = vuforia.api.getCameraDevice();
        var videoMode = cameraDevice.getVideoMode(exports.vuforiaCameraDeviceMode);
        var videoWidth = videoMode.width;
        var videoHeight = videoMode.height;
        var orientation = util_1.getScreenOrientation();
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
        config.reflection = vuforia.VideoBackgroundReflection.Default;
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
    return NativescriptVuforiaServiceProvider;
}());
NativescriptVuforiaServiceProvider = __decorate([
    Argon.DI.autoinject,
    __metadata("design:paramtypes", [Argon.SessionService, Argon.FocusServiceProvider, Argon.ContextService, Argon.ContextServiceProvider, Argon.RealityService])
], NativescriptVuforiaServiceProvider);
exports.NativescriptVuforiaServiceProvider = NativescriptVuforiaServiceProvider;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tdnVmb3JpYS1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXZ1Zm9yaWEtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxzQ0FBd0M7QUFDeEMsOENBQWdEO0FBQ2hELDJCQUE2QjtBQUM3QixrQ0FBb0M7QUFDcEMsbUNBQXFDO0FBQ3JDLDhEQUEwRDtBQUMxRCwrQkFBb0Q7QUFDcEQscUNBQXNDO0FBQ3RDLDJCQUE0QjtBQUU1QixJQUFNLDZCQUE2QixHQUFvQixTQUFTLENBQUMsQ0FBQyxzQkFBc0I7QUFDeEYsSUFBTSwwQkFBMEIsR0FBVyxLQUFLLENBQUM7QUFFcEMsUUFBQSx1QkFBdUIsR0FBNEIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQztBQUN4RyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDZixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUksQ0FBQyxrQkFBa0I7UUFDOUMsK0JBQXVCLEtBQWdDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1lBQzdGLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDN0MsQ0FBQztBQUVZLFFBQUEsV0FBVyxHQUFHLENBQUMsR0FBRyxHQUFDLEVBQUUsQ0FBQztBQUVuQyxJQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNyQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUUzQyxJQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2hGLElBQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFeEU7SUFRSSw0QkFBbUIsVUFBMkI7UUFBM0IsZUFBVSxHQUFWLFVBQVUsQ0FBaUI7UUFQOUMsaUJBQVksR0FBRyxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUM7UUFFdEMsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ25DLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDdEMsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUMzQyxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzNDLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO0lBQ1IsQ0FBQztJQUN0RCx5QkFBQztBQUFELENBQUMsQUFURCxJQVNDO0FBR0QsSUFBYSxrQ0FBa0M7SUFrQjlDLDRDQUNtQixjQUFtQyxFQUNuQyxvQkFBK0MsRUFDL0MsY0FBbUM7UUFDM0MsNkNBQTZDO1FBQ3JDLHNCQUFtRCxFQUMzRCxjQUFtQztRQUV2QywwREFBMEQ7UUFDMUQsbURBQW1EO1FBQ25ELDRFQUE0RTtRQUM1RSxpRkFBaUY7UUFDakYsVUFBVTtRQUNWLHVCQUF1QjtRQUN2Qiw0RUFBNEU7UUFDNUUsaUZBQWlGO1FBQ2pGLGFBQWE7UUFDYixLQUFLO1FBakJaLGlCQWlJQztRQWhJa0IsbUJBQWMsR0FBZCxjQUFjLENBQXFCO1FBQ25DLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBMkI7UUFDL0MsbUJBQWMsR0FBZCxjQUFjLENBQXFCO1FBRW5DLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBNkI7UUFyQjVELHFCQUFnQixHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssRUFBMkIsQ0FBQztRQUU5RCx5QkFBb0IsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2xELFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUNqRyxXQUFXLEVBQUUsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFDLElBQUksRUFBTSxFQUFFLENBQUMsQ0FBQztTQUN4RixDQUFDLENBQUM7UUFFSyxzQkFBaUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEQsdUJBQWtCLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3RELG9CQUFlLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRzFDLGlDQUE0QixHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXhELGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQXdDLENBQUM7UUF5akJuRSxZQUFPLEdBQWtDLEVBQUUsQ0FBQztRQXBpQmhELGNBQWMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsVUFBQyxPQUFPO1lBQ2pELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQztvQkFDaEMsY0FBTSxPQUFBLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBQyxTQUFTLEVBQUUsS0FBSyxFQUFDLENBQUMsRUFBbkMsQ0FBbUMsQ0FBQztnQkFDOUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDekIsVUFBQyxXQUFXLElBQUssT0FBQSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUMsRUFBdEUsQ0FBc0UsQ0FBQztZQUNoRyxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osT0FBTyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQztvQkFDaEMsY0FBTSxPQUFBLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsQ0FBQyxFQUEzQyxDQUEyQyxDQUFDO2dCQUN0RCxPQUFPLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDO29CQUN6QixVQUFBLFdBQVcsSUFBSSxPQUFBLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUF0QyxDQUFzQyxDQUFDO2dCQUMxRCxPQUFPLENBQUMsRUFBRSxDQUFDLHVDQUF1QyxDQUFDO29CQUMvQyxVQUFDLEVBQWtCOzRCQUFqQixZQUFHO3dCQUFtQixPQUFBLEtBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO29CQUFwRCxDQUFvRCxDQUFDO2dCQUNqRixPQUFPLENBQUMsRUFBRSxDQUFDLHFDQUFxQyxDQUFDO29CQUM3QyxVQUFDLEVBQWdCOzRCQUFmLFVBQUU7d0JBQWtCLE9BQUEsS0FBSSxDQUFDLCtCQUErQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQWpELENBQWlELENBQUM7Z0JBQzVFLE9BQU8sQ0FBQyxFQUFFLENBQUMseUNBQXlDLENBQUM7b0JBQ2pELFVBQUMsRUFBZ0I7NEJBQWYsVUFBRTt3QkFBa0IsT0FBQSxLQUFJLENBQUMsbUNBQW1DLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztvQkFBckQsQ0FBcUQsQ0FBQztnQkFDaEYsT0FBTyxDQUFDLEVBQUUsQ0FBQywyQ0FBMkMsQ0FBQztvQkFDbkQsVUFBQyxFQUFnQjs0QkFBZixVQUFFO3dCQUFrQixPQUFBLEtBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO29CQUF2RCxDQUF1RCxDQUFDO2dCQUNsRixPQUFPLENBQUMsRUFBRSxDQUFDLHVDQUF1QyxDQUFDO29CQUMvQyxVQUFDLEVBQWdCOzRCQUFmLFVBQUU7d0JBQWtCLE9BQUEsS0FBSSxDQUFDLGlDQUFpQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQW5ELENBQW1ELENBQUM7Z0JBRTlFLDBCQUEwQjtnQkFDMUIsT0FBTyxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMscUNBQXFDLENBQUMsQ0FBQztnQkFDMUYsT0FBTyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLFVBQUMsRUFBZ0I7d0JBQWYsVUFBRTtvQkFDdkMsTUFBTSxDQUFDLEtBQUksQ0FBQywrQkFBK0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzdELENBQUMsQ0FBQTtZQUNMLENBQUM7WUFFRCxPQUFPLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGNBQU0sT0FBQSxLQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7UUFDMUUsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFBQyxNQUFNLENBQUM7UUFFekIsdURBQXVEO1FBQ3ZELDZEQUE2RDtRQUM3RCwyQkFBMkI7UUFDM0Isa0RBQWtEO1FBQ2xELDREQUE0RDtRQUM1RCxTQUFTO1FBQ1QsTUFBTTtRQUVOLElBQU0sbUJBQW1CLEdBQUcsVUFBQyxLQUFtQjtZQUU1QyxJQUFNLElBQUksR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDOUIsbUZBQW1GO1lBQ25GLHVFQUF1RTtZQUN2RSxtRkFBbUY7WUFDbkYsdUZBQXVGO1lBQ3ZGLHVCQUF1QjtZQUN2QixVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxtQkFBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRS9DLElBQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QyxJQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7WUFFbkQsd0RBQXdEO1lBQ3hELElBQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDM0QsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN6QyxJQUFNLGVBQWUsR0FBNEIsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxJQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ2pELElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFFakMsSUFBTSxFQUFFLEdBQUcsS0FBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM5QyxJQUFJLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFakQsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUNWLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO3dCQUM3QixFQUFFLElBQUE7d0JBQ0YsSUFBSSxNQUFBO3dCQUNKLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsS0FBSSxDQUFDLG9CQUFvQixDQUFDO3dCQUM3RSxXQUFXLEVBQUUsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztxQkFDekUsQ0FBQyxDQUFDO29CQUNILElBQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxRQUFnRCxDQUFDO29CQUMvRSxJQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxXQUEyQyxDQUFDO29CQUM3RSxjQUFjLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztvQkFDbEMsaUJBQWlCLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztvQkFDckMsY0FBYyxDQUFDLHdCQUF3QixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDO29CQUM5RSxpQkFBaUIsQ0FBQyx3QkFBd0IsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztvQkFDakYsY0FBYyxDQUFDLDRCQUE0QixHQUFHLEVBQUUsR0FBQyxFQUFFLENBQUM7b0JBQ3BELGlCQUFpQixDQUFDLDRCQUE0QixHQUFHLEVBQUUsR0FBQyxFQUFFLENBQUM7b0JBQ3ZELGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNwQyxLQUFJLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakcsQ0FBQztnQkFFRCxJQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUU3QyxpQ0FBaUM7Z0JBQ2pDLElBQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFDLFlBQVksRUFBRSxHQUFHLGNBQWMsQ0FBQztnQkFDMUUsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxDQUFDO29CQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUUzRixJQUFNLElBQUksR0FBOEIsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsRSxJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDdEUsSUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUN2RSxJQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUUzRixpTEFBaUw7Z0JBQ2pMLDBFQUEwRTtnQkFFekUsTUFBTSxDQUFDLFFBQWlELENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDNUYsTUFBTSxDQUFDLFdBQTRDLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUMvRixDQUFDO1lBRUQsUUFBUTtZQUNKLEtBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0MsZUFBZTtZQUNYLGdEQUFnRDtZQUNwRCxJQUFJO1FBQ1IsQ0FBQyxDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRSwrQ0FBK0M7SUFDL0MsMkRBQTJEO0lBQzNELHFDQUFxQztJQUNyQyxxRkFBcUY7SUFDckYsc0ZBQXNGO0lBQ3RGLG9EQUFvRDtJQUNwRCxLQUFLO0lBRUcsNERBQWUsR0FBdkIsVUFBd0IsT0FBeUI7UUFDN0MsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7WUFBQyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQztJQUN2QixDQUFDO0lBRU8sdUVBQTBCLEdBQWxDLFVBQW1DLE9BQXlCO1FBQ3hELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFDO1FBQ3BELEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQztZQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtRQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQztJQUNwQyxDQUFDO0lBRU8sc0VBQXlCLEdBQWpDO1FBQ0ksSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQztRQUV2RCxFQUFFLENBQUMsQ0FBQyxZQUFZO1lBQ1osWUFBWSxDQUFDLFdBQVc7WUFDeEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUM7UUFDWCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQjtZQUN4QixJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVztZQUNwQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUM7UUFFWCxzREFBc0Q7UUFDdEQsaUVBQWlFO1FBQ2pFLEdBQUcsQ0FBQyxDQUFrQixVQUFtQyxFQUFuQyxLQUFBLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFuQyxjQUFtQyxFQUFuQyxJQUFtQztZQUFwRCxJQUFNLE9BQU8sU0FBQTtZQUNkLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNyQyxNQUFNLENBQUM7WUFDWCxDQUFDO1NBQ0o7UUFFRCxvQ0FBb0M7UUFDcEMscURBQXFEO1FBQ3JELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVPLG1FQUFzQixHQUE5QixVQUErQixPQUEwQjtRQUF6RCxpQkFtQkM7UUFsQkcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixLQUFLLE9BQU8sQ0FBQztZQUFDLE1BQU0sQ0FBQztRQUVqRCxPQUFPLENBQUMsR0FBRyxDQUFDLGlEQUFpRCxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUU1RSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQzNCLElBQU0saUJBQWUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUM7WUFDakQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztZQUNyQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDO2dCQUNuQyxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBZSxDQUFDLENBQUM7WUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQztRQUNuQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxLQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDWCxLQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLDBEQUFhLEdBQXJCLFVBQXNCLE9BQXlCO1FBQS9DLGlCQXlDQztRQXhDRyxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFFL0QsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxJQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDO1FBRTlDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQ3JCLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUVyQiwrREFBK0Q7WUFDL0QsOEVBQThFO1lBQzlFLHlDQUF5QztZQUN6QyxJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1lBRW5DLElBQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNyRCxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUM7Z0JBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1lBRXhDLElBQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixDQUFDO1lBQ3hELEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztnQkFDcEIsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBRTtvQkFDekIsS0FBSSxDQUFDLCtCQUErQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2pFLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVELElBQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7WUFDbEQsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDakIsY0FBYyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQUU7b0JBQ3RCLEtBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBRXJCLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1osS0FBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsQ0FBQztRQUNMLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNiLENBQUM7SUFFTywyREFBYyxHQUF0QixVQUF1QixPQUEwQjtRQUM3QyxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRWhFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQztZQUM1QixZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sa0RBQUssR0FBYixVQUFjLE9BQXlCO1FBQXZDLGlCQThFQztRQTdFRyxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUM7UUFDMUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7WUFBQyxNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFFekUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQVEsVUFBQSxHQUFHO1lBRTdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLENBQUM7WUFDL0UsQ0FBQztZQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUV4QyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUFNO2dCQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxDQUFDO2dCQUUvQyxJQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQztnQkFDekQsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO29CQUNwQixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDMUIsV0FBVyxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQztnQkFDL0MsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDaEQsQ0FBQztnQkFFQSxpRUFBaUU7Z0JBQ2xFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO2dCQUNuRSxDQUFDO2dCQUVELElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBRW5ELE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQztnQkFFdEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDMUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO2dCQUUxRCxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsK0JBQXVCLENBQUMsQ0FBQztvQkFDdkQsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2dCQUVuRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3hELE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFakQseUNBQXlDO2dCQUN6QyxXQUFXO2dCQUNYLFdBQVc7Z0JBQ1gsbURBQW1EO2dCQUNuRCxtREFBbUQ7Z0JBQ25ELGFBQWE7Z0JBRWIsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBRTlDLElBQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7Z0JBQ2xELElBQU0sWUFBWSxHQUFrQixFQUFFLENBQUM7Z0JBQ3ZDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLGNBQWMsQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUFFO3dCQUN0QixZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbkUsQ0FBQyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQztnQkFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osSUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQUM7Z0JBQ3hELElBQU0sZ0JBQWdCLEdBQWtCLEVBQUUsQ0FBQztnQkFDM0MsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO29CQUNwQixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUFFO3dCQUN6QixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMzRSxDQUFDLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUNELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osSUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNyRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztvQkFBQyxNQUFNLElBQUksS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7Z0JBQ3JGLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMxQixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLHdEQUFXLEdBQW5CLFVBQW9CLE9BQXlCLEVBQUUsT0FBbUQ7UUFDOUYsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDO1lBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMsMEVBQTBFLENBQUMsQ0FBQztRQUVoRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFM0MsRUFBRSxDQUFDLENBQUMsNkJBQTZCLENBQUM7WUFBQyxPQUFPLENBQUMsR0FBRyxHQUFHLDZCQUE2QixDQUFDO1FBRS9FLElBQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHO1lBQzFCLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUM1QixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLG9CQUFxQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXBFLElBQU0sV0FBVyxHQUFHLElBQUksa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTVDLElBQU0sVUFBVSxHQUFHLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTztZQUNuQyxXQUFXLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFFakMsTUFBTSxDQUFDLFVBQVUsQ0FBQztJQUN0QixDQUFDO0lBRU8seURBQVksR0FBcEIsVUFBcUIsT0FBeUI7UUFDMUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDckMsQ0FBQztJQUNMLENBQUM7SUFFTyw4RUFBaUMsR0FBekMsVUFBMEMsT0FBeUIsRUFBRSxHQUFVO1FBQS9FLGlCQVdDO1FBVkcsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsSUFBTSxXQUFXLEdBQUcsS0FBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRCxJQUFJLEVBQUUsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ04sRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQy9CLFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDeEMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVDLENBQUM7WUFDRCxNQUFNLENBQUMsRUFBQyxFQUFFLElBQUEsRUFBQyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLHNFQUF5QixHQUFqQyxVQUFrQyxPQUF5QixFQUFFLEVBQVU7UUFBdkUsaUJBeUNDO1FBeENHLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEQsSUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFBQyxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFnQyxFQUFJLENBQUMsQ0FBQztRQUNoRSxJQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDckQsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7WUFBQyxNQUFNLElBQUksS0FBSyxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFFcEcsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV0RCxJQUFJLGlCQUFrRCxDQUFDO1FBRXZELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDVixpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQTZCLEVBQUUsZUFBVSxHQUFHLFFBQUssQ0FBQyxDQUFDO1lBQy9ELGlCQUFpQixHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQTBCLFVBQUMsUUFBUTtnQkFDekUsT0FBTyxHQUFHLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7b0JBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO2dCQUU1RSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkQsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ2pELFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNuQyxJQUFNLFVBQVUsR0FBRyxLQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0RBQWdELEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUMzRixNQUFNLENBQUMsVUFBVSxDQUFDO2dCQUN0QixDQUFDO2dCQUVELGFBQWEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQXdDLFFBQVEsY0FBUyxHQUFLLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQzlDLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBQyxVQUFVO2dCQUM5QixPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEVBQUUsRUFBRSxJQUFBLEVBQUUsVUFBVSxZQUFBLEVBQUUsQ0FBQyxDQUFDO1lBQ2pGLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUVELE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztJQUM3QixDQUFDO0lBRU8sc0VBQXlCLEdBQWpDLFVBQWtDLE9BQXVCO1FBQ3JELElBQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2pELElBQU0sVUFBVSxHQUEyQixFQUFFLENBQUM7UUFDOUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuQyxJQUFNLFNBQVMsR0FBc0IsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RCxVQUFVLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUc7Z0JBQzlCLEVBQUUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDO2dCQUN0QyxJQUFJLEVBQUUsU0FBUyxZQUFZLE9BQU8sQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7YUFDeEYsQ0FBQTtRQUNMLENBQUM7UUFDRCxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ3RCLENBQUM7SUFFTyw0RUFBK0IsR0FBdkMsVUFBd0MsT0FBeUIsRUFBRSxFQUFTO1FBQTVFLGlCQUlDO1FBSEcsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDakQsTUFBTSxDQUFDLEtBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sMEVBQTZCLEdBQXJDLFVBQXNDLE9BQTBCLEVBQUUsRUFBVTtRQUN4RSxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUErQixFQUFFLE1BQUcsQ0FBQyxDQUFDO1FBRWxELElBQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztZQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsK0RBQStELENBQUMsQ0FBQTtRQUVwRyxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWxELElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsSUFBSSxjQUF1QyxDQUFDO1FBQzVDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNYLGNBQWMsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBRUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBQyxPQUFPO1lBQy9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBdUMsRUFBSSxDQUFDLENBQUM7WUFDakUsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN0QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxFQUFFLEVBQUUsSUFBQSxFQUFFLENBQUMsQ0FBQztRQUM3RSxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxnRkFBbUMsR0FBM0MsVUFBNEMsT0FBeUIsRUFBRSxFQUFTO1FBQWhGLGlCQUlDO1FBSEcsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDakQsTUFBTSxDQUFDLEtBQUksQ0FBQyw2QkFBNkIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sNEVBQStCLEdBQXZDLFVBQXdDLE9BQTBCLEVBQUUsRUFBVSxFQUFFLFNBQWM7UUFBZCwwQkFBQSxFQUFBLGdCQUFjO1FBQzFGLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQWlDLEVBQUUsTUFBRyxDQUFDLENBQUM7UUFDcEQsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxJQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDckQsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUNoQixJQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixJQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3pELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ1YsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDWixXQUFXLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUM3QyxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEVBQUUsRUFBRSxJQUFBLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRSxDQUFDO2dCQUNELE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDbkIsQ0FBQztRQUNMLENBQUM7UUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFTyxrRkFBcUMsR0FBN0MsVUFBOEMsT0FBeUIsRUFBRSxFQUFTO1FBQWxGLGlCQUtDO1FBSkcsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDakQsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsK0JBQStCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF1QyxFQUFJLENBQUMsQ0FBQztRQUNyRSxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyx3RUFBMkIsR0FBbkMsVUFBb0MsT0FBeUIsRUFBRSxFQUFVLEVBQUUsU0FBYztRQUFkLDBCQUFBLEVBQUEsZ0JBQWM7UUFDckYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBK0IsRUFBRSxTQUFNLENBQUMsQ0FBQztRQUNyRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELElBQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyRCxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLElBQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEQsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLElBQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3RELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ1YsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDWixJQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQzt3QkFDaEQsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3ZDLFdBQVcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUN0QyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDdEMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDL0MsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxFQUFFLEVBQUUsSUFBQSxFQUFFLENBQUMsQ0FBQztnQkFDM0UsQ0FBQztnQkFDRCxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQ25CLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBRU8sOEVBQWlDLEdBQXpDLFVBQTBDLE9BQXlCLEVBQUUsRUFBUztRQUE5RSxpQkFLQztRQUpHLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2pELEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDL0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBcUMsRUFBSSxDQUFDLENBQUM7UUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sK0RBQWtCLEdBQTFCLFVBQTJCLFNBQTJCO1FBQ2xELEVBQUUsQ0FBQyxDQUFDLFNBQVMsWUFBWSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsd0JBQXdCLEdBQUcsU0FBUyxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDcEUsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVPLCtEQUFrQixHQUExQixVQUEyQixvQkFBMkIsRUFBRSxPQUF5QjtRQUM3RSxNQUFNLENBQUMsY0FBTyxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtZQUM1QyxJQUFBLHFCQUFnRSxFQUEvRCxZQUFHLEVBQUMsb0JBQU8sQ0FBcUQ7WUFDdkUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUVwRCxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7WUFDekUsQ0FBQztZQUVELElBQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFDO2dCQUN6QixJQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdCLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM1RixDQUFDLENBQUMsQ0FBQTtZQUVGLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDdEMsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFJTSw0RUFBK0IsR0FBdEMsVUFBdUMsUUFBdUIsRUFBRSxPQUFlLEVBQUUsVUFBb0Q7UUFBcEQsMkJBQUEsRUFBQSxhQUFXLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPO1FBQ2pJLElBQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFDakMsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUVuQyxJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ25ELElBQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsK0JBQXVCLENBQUMsQ0FBQztRQUNyRSxJQUFJLFVBQVUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO1FBQ2pDLElBQUksV0FBVyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFFbkMsSUFBTSxXQUFXLEdBQUcsMkJBQW9CLEVBQUUsQ0FBQztRQUMzQyxFQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxJQUFJLFdBQVcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNDLFVBQVUsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQzlCLFdBQVcsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxJQUFNLFVBQVUsR0FBRyxTQUFTLEdBQUcsVUFBVSxDQUFDO1FBQzFDLElBQU0sV0FBVyxHQUFHLFVBQVUsR0FBRyxXQUFXLENBQUM7UUFDN0MsY0FBYztRQUNkLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2hELGFBQWE7UUFDYixtREFBbUQ7UUFFbkQsSUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUNwQyxJQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUM7UUFFaEYseUJBQXlCO1FBQ3pCLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDNUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDekIsTUFBTSxDQUFDLEtBQUssR0FBRyxVQUFVLEdBQUcsS0FBSyxHQUFHLGtCQUFrQixDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxLQUFLLEdBQUcsV0FBVyxHQUFHLEtBQUssR0FBRyxrQkFBa0IsQ0FBQztRQUN4RCxNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUM7UUFFOUQsdURBQXVEO1FBQ3ZELDZFQUE2RTtRQUM3RSwrR0FBK0c7UUFDL0csd0NBQXdDO1FBQ3hDLE1BQU07UUFFTixnQ0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLGdDQUFjLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsU0FBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7UUFDNUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7UUFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBQ0wseUNBQUM7QUFBRCxDQUFDLEFBem5CRCxJQXluQkM7QUF6bkJZLGtDQUFrQztJQUQ5QyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVU7cUNBb0JlLEtBQUssQ0FBQyxjQUFjLEVBQ2QsS0FBSyxDQUFDLG9CQUFvQixFQUNoQyxLQUFLLENBQUMsY0FBYyxFQUVaLEtBQUssQ0FBQyxzQkFBc0IsRUFDNUMsS0FBSyxDQUFDLGNBQWM7R0F4QmxDLGtDQUFrQyxDQXluQjlDO0FBem5CWSxnRkFBa0M7QUEybkIvQyx5Q0FBeUM7QUFDekMsc0JBQXNCLFlBQW1CO0lBQ3JDLElBQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDakQsSUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLDBCQUEwQixDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXBGLElBQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLDhCQUE4QixDQUFDO0lBQy9ELElBQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQztJQUM1QyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztJQUM5QyxJQUFNLGlCQUFpQixHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUM7SUFFeEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUV4QyxJQUFNLFdBQVcsR0FBRyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUM7SUFDdkYsSUFBTSxXQUFXLEdBQUcsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDO0lBRXZGLDBCQUEwQixHQUFVLEVBQUUsUUFBZTtRQUNqRCxJQUFJLFlBQTJCLENBQUM7UUFDaEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdCLElBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZDLFlBQVksR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDO1FBQ2xDLENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNoQixHQUFHLEtBQUE7WUFDSCxNQUFNLEVBQUMsS0FBSztZQUNaLE9BQU8sRUFBRSxZQUFZLEdBQUc7Z0JBQ3BCLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxXQUFXLEVBQUU7YUFDbEQsR0FBRyxTQUFTO1NBQ2hCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxRQUFRO1lBQ2IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLDBDQUF3QyxHQUFHLFlBQU8sUUFBUSxvQkFBaUIsQ0FBQyxDQUFBO2dCQUN4RixNQUFNLENBQUMsUUFBUSxDQUFDO1lBQ3BCLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JGLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQW1CLEdBQUcsWUFBTyxRQUFVLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNsRCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxHQUFHLEdBQUcsdUJBQXVCLEdBQUcsUUFBUSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUM1RyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDZixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFDLFdBQVcsQ0FBQztRQUNuRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFDLFdBQVcsQ0FBQztLQUN0RCxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQUksT0FBQSxXQUFXLEVBQVgsQ0FBVyxDQUFDLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nO1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgZmlsZSBmcm9tICdmaWxlLXN5c3RlbSc7XG5pbXBvcnQgKiBhcyBwbGF0Zm9ybSBmcm9tICdwbGF0Zm9ybSc7XG5pbXBvcnQge0Fic29sdXRlTGF5b3V0fSBmcm9tICd1aS9sYXlvdXRzL2Fic29sdXRlLWxheW91dCc7XG5pbXBvcnQge2RlY3J5cHQsIGdldFNjcmVlbk9yaWVudGF0aW9ufSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBtaW5pbWF0Y2ggZnJvbSAnbWluaW1hdGNoJ1xuaW1wb3J0ICogYXMgVVJJIGZyb20gJ3VyaWpzJ1xuXG5jb25zdCBERUJVR19ERVZFTE9QTUVOVF9MSUNFTlNFX0tFWTpzdHJpbmd8dW5kZWZpbmVkID0gdW5kZWZpbmVkOyAvLyAneW91cl9saWNlbnNlX2tleSc7XG5jb25zdCBERUJVR19ESVNBQkxFX09SSUdJTl9DSEVDSzpib29sZWFuID0gZmFsc2U7XG5cbmV4cG9ydCBjb25zdCB2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZTp2dWZvcmlhLkNhbWVyYURldmljZU1vZGUgPSB2dWZvcmlhLkNhbWVyYURldmljZU1vZGUuT3BpbWl6ZVF1YWxpdHk7XG5pZiAodnVmb3JpYS52aWRlb1ZpZXcuaW9zKSB7XG4gICAgKDxVSVZpZXc+dnVmb3JpYS52aWRlb1ZpZXcuaW9zKS5jb250ZW50U2NhbGVGYWN0b3IgPSBcbiAgICAgICAgdnVmb3JpYUNhbWVyYURldmljZU1vZGUgPT09IDx2dWZvcmlhLkNhbWVyYURldmljZU1vZGU+IHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlTW9kZS5PcHRpbWl6ZVNwZWVkID8gXG4gICAgICAgIDEgOiBwbGF0Zm9ybS5zY3JlZW4ubWFpblNjcmVlbi5zY2FsZTtcbn1cblxuZXhwb3J0IGNvbnN0IFZJREVPX0RFTEFZID0gLTAuNS82MDtcblxuY29uc3QgTWF0cml4NCA9IEFyZ29uLkNlc2l1bS5NYXRyaXg0O1xuY29uc3QgQ2FydGVzaWFuMyA9IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zO1xuY29uc3QgUXVhdGVybmlvbiA9IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uO1xuY29uc3QgSnVsaWFuRGF0ZSA9IEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlO1xuY29uc3QgQ2VzaXVtTWF0aCA9IEFyZ29uLkNlc2l1bS5DZXNpdW1NYXRoO1xuXG5jb25zdCB6OTAgPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIENlc2l1bU1hdGguUElfT1ZFUl9UV08pO1xuY29uc3QgeTE4MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWSwgQ2VzaXVtTWF0aC5QSSk7XG5cbmNsYXNzIFZ1Zm9yaWFTZXNzaW9uRGF0YSB7XG4gICAgY29tbWFuZFF1ZXVlID0gbmV3IEFyZ29uLkNvbW1hbmRRdWV1ZTtcbiAgICBpbml0UmVzdWx0UmVzb2x2ZXI/OihyZXN1bHQ6dnVmb3JpYS5Jbml0UmVzdWx0KT0+dm9pZDtcbiAgICBsb2FkZWREYXRhU2V0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGFjdGl2YXRlZERhdGFTZXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZGF0YVNldFVyaUJ5SWQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGRhdGFTZXRJZEJ5VXJpID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBkYXRhU2V0SW5zdGFuY2VCeUlkID0gbmV3IE1hcDxzdHJpbmcsIHZ1Zm9yaWEuRGF0YVNldD4oKTtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMga2V5UHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+KSB7fVxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIge1xuXG4gICAgcHVibGljIHN0YXRlVXBkYXRlRXZlbnQgPSBuZXcgQXJnb24uRXZlbnQ8QXJnb24uQ2VzaXVtLkp1bGlhbkRhdGU+KCk7XG4gICAgXG4gICAgcHVibGljIHZ1Zm9yaWFUcmFja2VyRW50aXR5ID0gbmV3IEFyZ29uLkNlc2l1bS5FbnRpdHkoe1xuICAgICAgICBwb3NpdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoQ2FydGVzaWFuMy5aRVJPLCB0aGlzLmNvbnRleHRTZXJ2aWNlLmRpc3BsYXkpLFxuICAgICAgICBvcmllbnRhdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KFF1YXRlcm5pb24ubXVsdGlwbHkoejkwLHkxODAsPGFueT57fSkpXG4gICAgfSk7XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoQ2FydGVzaWFuID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zKCk7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFF1YXRlcm5pb24gPSBuZXcgQXJnb24uQ2VzaXVtLlF1YXRlcm5pb24oKTtcblx0cHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDMgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDMoKTtcblxuICAgIHByaXZhdGUgX2NvbnRyb2xsaW5nU2Vzc2lvbj86IEFyZ29uLlNlc3Npb25Qb3J0O1xuICAgIHByaXZhdGUgX3Nlc3Npb25Td2l0Y2hlckNvbW1hbmRRdWV1ZSA9IG5ldyBBcmdvbi5Db21tYW5kUXVldWUoKTtcblxuICAgIHByaXZhdGUgX3Nlc3Npb25EYXRhID0gbmV3IFdlYWtNYXA8QXJnb24uU2Vzc2lvblBvcnQsVnVmb3JpYVNlc3Npb25EYXRhPigpO1xuICAgIFxuXHRjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHByaXZhdGUgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsXG4gICAgICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSxcbiAgICAgICAgICAgIC8vIHByaXZhdGUgZGV2aWNlU2VydmljZTpBcmdvbi5EZXZpY2VTZXJ2aWNlLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZVByb3ZpZGVyOkFyZ29uLkNvbnRleHRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuXG4gICAgICAgIC8vIHRoaXMuc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgLy8gICAgIHRoaXMuc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgIC8vICAgICAgICAgY29uc3QgcmVhbGl0eSA9IHRoaXMuY29udGV4dFNlcnZpY2Uuc2VyaWFsaXplZEZyYW1lU3RhdGUucmVhbGl0eTtcbiAgICAgICAgLy8gICAgICAgICBpZiAocmVhbGl0eSA9PT0gQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFKSB0aGlzLmRldmljZVNlcnZpY2UudXBkYXRlKCk7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy8gICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgLy8gICAgICAgICBjb25zdCByZWFsaXR5ID0gdGhpcy5jb250ZXh0U2VydmljZS5zZXJpYWxpemVkRnJhbWVTdGF0ZS5yZWFsaXR5O1xuICAgICAgICAvLyAgICAgICAgIGlmIChyZWFsaXR5ICE9PSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkUpIHRoaXMuZGV2aWNlU2VydmljZS51cGRhdGUoKTtcbiAgICAgICAgLy8gICAgIH0sIDYwKVxuICAgICAgICAvLyB9KVxuICAgICAgICBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHNlc3Npb24pPT57XG4gICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5pc0F2YWlsYWJsZSddID0gXG4gICAgICAgICAgICAgICAgICAgICgpID0+IFByb21pc2UucmVzb2x2ZSh7YXZhaWxhYmxlOiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEuaW5pdCddID0gXG4gICAgICAgICAgICAgICAgICAgIChpbml0T3B0aW9ucykgPT4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVnVmb3JpYSBpcyBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm1cIikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmlzQXZhaWxhYmxlJ10gPSBcbiAgICAgICAgICAgICAgICAgICAgKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHthdmFpbGFibGU6ICEhdnVmb3JpYS5hcGl9KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmluaXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICBpbml0T3B0aW9ucyA9PiB0aGlzLl9oYW5kbGVJbml0KHNlc3Npb24sIGluaXRPcHRpb25zKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0J10gPSBcbiAgICAgICAgICAgICAgICAgICAgKHt1cmx9Ont1cmw6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckNyZWF0ZURhdGFTZXQoc2Vzc2lvbiwgdXJsKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJMb2FkRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdGFiaWxpdHlcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRGZXRjaCddID0gc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyTG9hZERhdGFTZXQnXTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRMb2FkJ10gPSAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpID0+IHRoaXMuX2hhbmRsZUNsb3NlKHNlc3Npb24pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gLy8gc3dpdGNoIHRvIEFSIG1vZGUgd2hlbiBMSVZFIHJlYWxpdHkgaXMgcHJlc2VudGluZ1xuICAgICAgICAvLyByZWFsaXR5U2VydmljZS5jaGFuZ2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7Y3VycmVudH0pPT57XG4gICAgICAgIC8vICAgICB0aGlzLl9zZXREZXZpY2VNb2RlKFxuICAgICAgICAvLyAgICAgICAgIGN1cnJlbnQgPT09IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRSA/IFxuICAgICAgICAvLyAgICAgICAgICAgICB2dWZvcmlhLkRldmljZU1vZGUuQVIgOiB2dWZvcmlhLkRldmljZU1vZGUuVlJcbiAgICAgICAgLy8gICAgICk7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc3RhdGVVcGRhdGVDYWxsYmFjayA9IChzdGF0ZTp2dWZvcmlhLlN0YXRlKSA9PiB7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB0aW1lID0gSnVsaWFuRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIC8vIHN1YnRyYWN0IGEgZmV3IG1zLCBzaW5jZSB0aGUgdmlkZW8gZnJhbWUgcmVwcmVzZW50cyBhIHRpbWUgc2xpZ2h0bHkgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAvLyBUT0RPOiBpZiB3ZSBhcmUgdXNpbmcgYW4gb3B0aWNhbCBzZWUtdGhyb3VnaCBkaXNwbGF5LCBsaWtlIGhvbG9sZW5zLFxuICAgICAgICAgICAgLy8gd2Ugd2FudCB0byBkbyB0aGUgb3Bwb3NpdGUsIGFuZCBkbyBmb3J3YXJkIHByZWRpY3Rpb24gKHRob3VnaCBpZGVhbGx5IG5vdCBoZXJlLCBcbiAgICAgICAgICAgIC8vIGJ1dCBpbiBlYWNoIGFwcCBpdHNlbGYgdG8gd2UgYXJlIGFzIGNsb3NlIGFzIHBvc3NpYmxlIHRvIHRoZSBhY3R1YWwgcmVuZGVyIHRpbWUgd2hlblxuICAgICAgICAgICAgLy8gd2Ugc3RhcnQgdGhlIHJlbmRlcilcbiAgICAgICAgICAgIEp1bGlhbkRhdGUuYWRkU2Vjb25kcyh0aW1lLCBWSURFT19ERUxBWSwgdGltZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFGcmFtZSA9IHN0YXRlLmdldEZyYW1lKCk7XG4gICAgICAgICAgICBjb25zdCBmcmFtZVRpbWVTdGFtcCA9IHZ1Zm9yaWFGcmFtZS5nZXRUaW1lU3RhbXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdXBkYXRlIHRyYWNrYWJsZSByZXN1bHRzIGluIGNvbnRleHQgZW50aXR5IGNvbGxlY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IG51bVRyYWNrYWJsZVJlc3VsdHMgPSBzdGF0ZS5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1UcmFja2FibGVSZXN1bHRzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVSZXN1bHQgPSA8dnVmb3JpYS5UcmFja2FibGVSZXN1bHQ+c3RhdGUuZ2V0VHJhY2thYmxlUmVzdWx0KGkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRyYWNrYWJsZVJlc3VsdC5nZXRUcmFja2FibGUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gdHJhY2thYmxlLmdldE5hbWUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMuX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IGNvbnRleHRTZXJ2aWNlLmVudGl0aWVzLmdldEJ5SWQoaWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eSA9IG5ldyBBcmdvbi5DZXNpdW0uRW50aXR5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgQXJnb24uQ2VzaXVtLlNhbXBsZWRQb3NpdGlvblByb3BlcnR5KHRoaXMudnVmb3JpYVRyYWNrZXJFbnRpdHkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb246IG5ldyBBcmdvbi5DZXNpdW0uU2FtcGxlZFByb3BlcnR5KEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50aXR5UG9zaXRpb24gPSBlbnRpdHkucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLlNhbXBsZWRQb3NpdGlvblByb3BlcnR5O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpdHlPcmllbnRhdGlvbiA9IGVudGl0eS5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFByb3BlcnR5O1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlQb3NpdGlvbi5tYXhOdW1TYW1wbGVzID0gMTA7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eU9yaWVudGF0aW9uLm1heE51bVNhbXBsZXMgPSAxMDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5UG9zaXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25UeXBlID0gQXJnb24uQ2VzaXVtLkV4dHJhcG9sYXRpb25UeXBlLkhPTEQ7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eU9yaWVudGF0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uVHlwZSA9IEFyZ29uLkNlc2l1bS5FeHRyYXBvbGF0aW9uVHlwZS5IT0xEO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlQb3NpdGlvbi5mb3J3YXJkRXh0cmFwb2xhdGlvbkR1cmF0aW9uID0gMTAvNjA7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eU9yaWVudGF0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uRHVyYXRpb24gPSAxMC82MDtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dFNlcnZpY2UuZW50aXRpZXMuYWRkKGVudGl0eSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29udGV4dFNlcnZpY2VQcm92aWRlci5wdWJsaXNoaW5nUmVmZXJlbmNlRnJhbWVNYXAuc2V0KGlkLCB0aGlzLmNvbnRleHRTZXJ2aWNlLnVzZXIuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVUaW1lID0gSnVsaWFuRGF0ZS5jbG9uZSh0aW1lKTsgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gYWRkIGFueSB0aW1lIGRpZmYgZnJvbSB2dWZvcmlhXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2thYmxlVGltZURpZmYgPSB0cmFja2FibGVSZXN1bHQuZ2V0VGltZVN0YW1wKCkgLSBmcmFtZVRpbWVTdGFtcDtcbiAgICAgICAgICAgICAgICBpZiAodHJhY2thYmxlVGltZURpZmYgIT09IDApIEp1bGlhbkRhdGUuYWRkU2Vjb25kcyh0aW1lLCB0cmFja2FibGVUaW1lRGlmZiwgdHJhY2thYmxlVGltZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zZSA9IDxBcmdvbi5DZXNpdW0uTWF0cml4ND48YW55PnRyYWNrYWJsZVJlc3VsdC5nZXRQb3NlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBNYXRyaXg0LmdldFRyYW5zbGF0aW9uKHBvc2UsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdGF0aW9uTWF0cml4ID0gTWF0cml4NC5nZXRSb3RhdGlvbihwb3NlLCB0aGlzLl9zY3JhdGNoTWF0cml4Myk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLmZyb21Sb3RhdGlvbk1hdHJpeChyb3RhdGlvbk1hdHJpeCwgdGhpcy5fc2NyYXRjaFF1YXRlcm5pb24pO1xuXG4gICAgICAgICAgICAgICAgLy8gY29uc3QgaW52ZXJzZVZpZGVvT3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIGdldFNjcmVlbk9yaWVudGF0aW9uKCkgKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRSwgdGhpcy5fc2NyYXRjaFNjcmVlbk9yaWVudGF0aW9uUXVhdGVybmlvbik7XG4gICAgICAgICAgICAgICAgLy8gUXVhdGVybmlvbi5tdWx0aXBseShvcmllbnRhdGlvbiwgaW52ZXJzZVZpZGVvT3JpZW50YXRpb24sIG9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAoZW50aXR5LnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUG9zaXRpb25Qcm9wZXJ0eSkuYWRkU2FtcGxlKHRyYWNrYWJsZVRpbWUsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAoZW50aXR5Lm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUHJvcGVydHkpLmFkZFNhbXBsZSh0cmFja2FibGVUaW1lLCBvcmllbnRhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVVwZGF0ZUV2ZW50LnJhaXNlRXZlbnQodGltZSk7XG4gICAgICAgICAgICAvLyB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzLnNlc3Npb25TZXJ2aWNlLmVycm9yRXZlbnQucmFpc2VFdmVudChlKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHZ1Zm9yaWEuYXBpLnNldFN0YXRlVXBkYXRlQ2FsbGJhY2soc3RhdGVVcGRhdGVDYWxsYmFjayk7XG5cdH1cbiAgICAgICAgXG4gICAgLy8gcHJpdmF0ZSBfZGV2aWNlTW9kZSA9IHZ1Zm9yaWEuRGV2aWNlTW9kZS5WUjtcbiAgICAvLyBwcml2YXRlIF9zZXREZXZpY2VNb2RlKGRldmljZU1vZGU6IHZ1Zm9yaWEuRGV2aWNlTW9kZSkge1xuICAgIC8vICAgICB0aGlzLl9kZXZpY2VNb2RlID0gZGV2aWNlTW9kZTtcbiAgICAvLyAgICAgLy8gZm9sbG93aW5nIG1heSBmYWlsIChyZXR1cm4gZmFsc2UpIGlmIHZ1Zm9yaWEgaXMgbm90IGN1cnJlbnRseSBpbml0aWFsaXplZCwgXG4gICAgLy8gICAgIC8vIGJ1dCB0aGF0J3Mgb2theSAoc2luY2UgbmV4dCB0aW1lIHdlIGluaXRpbGFpemUgd2Ugd2lsbCB1c2UgdGhlIHNhdmVkIG1vZGUpLiBcbiAgICAvLyAgICAgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCkuc2V0TW9kZShkZXZpY2VNb2RlKTsgXG4gICAgLy8gfSBcblxuICAgIHByaXZhdGUgX2dldFNlc3Npb25EYXRhKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9zZXNzaW9uRGF0YS5nZXQoc2Vzc2lvbik7XG4gICAgICAgIGlmICghc2Vzc2lvbkRhdGEpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYSBtdXN0IGJlIGluaXRpYWxpemVkIGZpcnN0JylcbiAgICAgICAgcmV0dXJuIHNlc3Npb25EYXRhO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX3Nlc3Npb25EYXRhLmdldChzZXNzaW9uKSE7XG4gICAgICAgIGlmICghc2Vzc2lvbkRhdGEuY29tbWFuZFF1ZXVlKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWEgbXVzdCBiZSBpbml0aWFsaXplZCBmaXJzdCcpXG4gICAgICAgIHJldHVybiBzZXNzaW9uRGF0YS5jb21tYW5kUXVldWU7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX3NlbGVjdENvbnRyb2xsaW5nU2Vzc2lvbigpIHtcbiAgICAgICAgY29uc3QgZm9jdXNTZXNzaW9uID0gdGhpcy5mb2N1c1NlcnZpY2VQcm92aWRlci5zZXNzaW9uO1xuXG4gICAgICAgIGlmIChmb2N1c1Nlc3Npb24gJiYgXG4gICAgICAgICAgICBmb2N1c1Nlc3Npb24uaXNDb25uZWN0ZWQgJiYgXG4gICAgICAgICAgICB0aGlzLl9zZXNzaW9uRGF0YS5oYXMoZm9jdXNTZXNzaW9uKSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0Q29udHJvbGxpbmdTZXNzaW9uKGZvY3VzU2Vzc2lvbik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uICYmIFxuICAgICAgICAgICAgdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uLmlzQ29ubmVjdGVkICYmXG4gICAgICAgICAgICB0aGlzLl9zZXNzaW9uRGF0YS5oYXModGhpcy5fY29udHJvbGxpbmdTZXNzaW9uKSkgXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gcGljayBhIGRpZmZlcmVudCBzZXNzaW9uIGFzIHRoZSBjb250cm9sbGluZyBzZXNzaW9uXG4gICAgICAgIC8vIFRPRE86IHByaW9yaXRpemUgYW55IHNlc3Npb25zIG90aGVyIHRoYW4gdGhlIGZvY3Vzc2VkIHNlc3Npb24/XG4gICAgICAgIGZvciAoY29uc3Qgc2Vzc2lvbiBvZiB0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZWRTZXNzaW9ucykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3Nlc3Npb25EYXRhLmhhcyhzZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBubyBvdGhlciBzZXNzaW9uIGlzIGF2YWlsYWJsZSxcbiAgICAgICAgLy8gZmFsbGJhY2sgdG8gdGhlIG1hbmFnZXIgYXMgdGhlIGNvbnRyb2xsaW5nIHNlc3Npb25cbiAgICAgICAgaWYgKHRoaXMuX3Nlc3Npb25EYXRhLmhhcyh0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZXIpKVxuICAgICAgICAgICAgdGhpcy5fc2V0Q29udHJvbGxpbmdTZXNzaW9uKHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0Q29udHJvbGxpbmdTZXNzaW9uKHNlc3Npb246IEFyZ29uLlNlc3Npb25Qb3J0KTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPT09IHNlc3Npb24pIHJldHVybjtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlZ1Zm9yaWFTZXJ2aWNlOiBTZXR0aW5nIGNvbnRyb2xsaW5nIHNlc3Npb24gdG8gXCIgKyBzZXNzaW9uLnVyaSlcblxuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2aW91c1Nlc3Npb24gPSB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb247XG4gICAgICAgICAgICB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl9zZXNzaW9uU3dpdGNoZXJDb21tYW5kUXVldWUucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlU2Vzc2lvbihwcmV2aW91c1Nlc3Npb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiA9IHNlc3Npb247XG4gICAgICAgIHRoaXMuX3Nlc3Npb25Td2l0Y2hlckNvbW1hbmRRdWV1ZS5wdXNoKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZXN1bWVTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICB9LCB0cnVlKS5jYXRjaCgoKT0+e1xuICAgICAgICAgICAgdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9wYXVzZVNlc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogUGF1c2luZyBzZXNzaW9uICcgKyBzZXNzaW9uLnVyaSArICcuLi4nKTtcblxuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBjb21tYW5kUXVldWUgPSBzZXNzaW9uRGF0YS5jb21tYW5kUXVldWU7XG5cbiAgICAgICAgcmV0dXJuIGNvbW1hbmRRdWV1ZS5wdXNoKCgpID0+IHtcbiAgICAgICAgICAgIGNvbW1hbmRRdWV1ZS5wYXVzZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB0aGUgc2Vzc2lvbiBpcyBjbG9zZWQsIHdlIHNldCB0aGUgcGVybWFuZW50IGZsYWcgdG8gdHJ1ZS5cbiAgICAgICAgICAgIC8vIExpa2V3aXNlLCBpZiB0aGUgc2Vzc2lvbiBpcyBub3QgY2xvc2VkLCB3ZSBzZXQgdGhlIHBlcm1hbmVudCBmbGF0IHRvIGZhbHNlLFxuICAgICAgICAgICAgLy8gbWFpbnRhaW5pbmcgdGhlIGN1cnJlbnQgc2Vzc2lvbiBzdGF0ZS5cbiAgICAgICAgICAgIGNvbnN0IHBlcm1hbmVudCA9IHNlc3Npb24uaXNDbG9zZWQ7XG5cbiAgICAgICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikgb2JqZWN0VHJhY2tlci5zdG9wKCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEuYWN0aXZhdGVkRGF0YVNldHM7XG4gICAgICAgICAgICBpZiAoYWN0aXZhdGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICBhY3RpdmF0ZWREYXRhU2V0cy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQsIHBlcm1hbmVudCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGxvYWRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEubG9hZGVkRGF0YVNldHM7XG4gICAgICAgICAgICBpZiAobG9hZGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWREYXRhU2V0cy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldChzZXNzaW9uLCBpZCwgcGVybWFuZW50KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IGRlaW5pdGlhbGl6aW5nLi4uJyk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdG9wKCk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5kZWluaXQoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmRlaW5pdE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmRlaW5pdCgpO1xuXG4gICAgICAgICAgICBpZiAocGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuZGVsZXRlKHNlc3Npb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfcmVzdW1lU2Vzc2lvbihzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBjb21tYW5kUXVldWUgPSB0aGlzLl9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBSZXN1bWluZyBzZXNzaW9uICcgKyBzZXNzaW9uLnVyaSArICcuLi4nKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5faW5pdChzZXNzaW9uKS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb21tYW5kUXVldWUuZXhlY3V0ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9pbml0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGtleVByb21pc2UgPSBzZXNzaW9uRGF0YS5rZXlQcm9taXNlO1xuICAgICAgICBpZiAoIWtleVByb21pc2UpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYTogSW52YWxpZCBTdGF0ZS4gTWlzc2luZyBLZXkuJyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ga2V5UHJvbWlzZS50aGVuPHZvaWQ+KCBrZXkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLnNldExpY2Vuc2VLZXkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1Z1Zm9yaWE6IFVuYWJsZSB0byBzZXQgdGhlIGxpY2Vuc2Uga2V5JykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogaW5pdGlhbGl6aW5nLi4uJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB2dWZvcmlhLmFwaS5pbml0KCkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBJbml0IFJlc3VsdDogJyArIHJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlSW5pdFJlc3VsdCA9IHNlc3Npb25EYXRhLmluaXRSZXN1bHRSZXNvbHZlcjtcbiAgICAgICAgICAgICAgICBpZiAocmVzb2x2ZUluaXRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZUluaXRSZXN1bHQocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuaW5pdFJlc3VsdFJlc29sdmVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IHZ1Zm9yaWEuSW5pdFJlc3VsdC5TVUNDRVNTKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcih2dWZvcmlhLkluaXRSZXN1bHRbcmVzdWx0XSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgIC8vIG11c3QgaW5pdGlhbGl6ZSB0cmFja2VycyBiZWZvcmUgaW5pdGlhbGl6aW5nIHRoZSBjYW1lcmEgZGV2aWNlXG4gICAgICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaS5pbml0T2JqZWN0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZ1Zm9yaWE6IFVuYWJsZSB0byBpbml0aWFsaXplIE9iamVjdFRyYWNrZXJcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgY2FtZXJhRGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZ1Zm9yaWE6IGluaXRpYWxpemluZyBjYW1lcmEgZGV2aWNlLi4uXCIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjYW1lcmFEZXZpY2UuaW5pdCh2dWZvcmlhLkNhbWVyYURldmljZURpcmVjdGlvbi5EZWZhdWx0KSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gaW5pdGlhbGl6ZSBjYW1lcmEgZGV2aWNlJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghY2FtZXJhRGV2aWNlLnNlbGVjdFZpZGVvTW9kZSh2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZSkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNlbGVjdCB2aWRlbyBtb2RlJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCkuc2V0TW9kZSh2dWZvcmlhLkRldmljZU1vZGUuQVIpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzZXQgZGV2aWNlIG1vZGUnKTtcblxuICAgICAgICAgICAgICAgIC8vIHRoaXMuY29uZmlndXJlVnVmb3JpYVZpZGVvQmFja2dyb3VuZCh7XG4gICAgICAgICAgICAgICAgLy8gICAgIHg6MCxcbiAgICAgICAgICAgICAgICAvLyAgICAgeTowLFxuICAgICAgICAgICAgICAgIC8vICAgICB3aWR0aDp2dWZvcmlhLnZpZGVvVmlldy5nZXRNZWFzdXJlZFdpZHRoKCksIFxuICAgICAgICAgICAgICAgIC8vICAgICBoZWlnaHQ6dnVmb3JpYS52aWRlb1ZpZXcuZ2V0TWVhc3VyZWRIZWlnaHQoKVxuICAgICAgICAgICAgICAgIC8vIH0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdGFydCgpKSBcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gc3RhcnQgY2FtZXJhJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBsb2FkZWREYXRhU2V0cyA9IHNlc3Npb25EYXRhLmxvYWRlZERhdGFTZXRzO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRQcm9taXNlczpQcm9taXNlPGFueT5bXSA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChsb2FkZWREYXRhU2V0cykge1xuICAgICAgICAgICAgICAgICAgICBsb2FkZWREYXRhU2V0cy5mb3JFYWNoKChpZCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRQcm9taXNlcy5wdXNoKHRoaXMuX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobG9hZFByb21pc2VzKTtcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RpdmF0ZWREYXRhU2V0cyA9IHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RpdmF0ZVByb21pc2VzOlByb21pc2U8YW55PltdID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFjdGl2YXRlZERhdGFTZXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlZERhdGFTZXRzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmF0ZVByb21pc2VzLnB1c2godGhpcy5fb2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGl2YXRlUHJvbWlzZXM7XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYTogVW5hYmxlIHRvIGdldCBvYmplY3RUcmFja2VyIGluc3RhbmNlJyk7XG4gICAgICAgICAgICAgICAgb2JqZWN0VHJhY2tlci5zdGFydCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlSW5pdChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBvcHRpb25zOntlbmNyeXB0ZWRMaWNlbnNlRGF0YT86c3RyaW5nLCBrZXk/OnN0cmluZ30pIHtcbiAgICAgICAgaWYgKCFvcHRpb25zLmtleSAmJiAhb3B0aW9ucy5lbmNyeXB0ZWRMaWNlbnNlRGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbGljZW5zZSBrZXkgd2FzIHByb3ZpZGVkLiBHZXQgb25lIGZyb20gaHR0cHM6Ly9kZXZlbG9wZXIudnVmb3JpYS5jb20vJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3Nlc3Npb25EYXRhLmhhcyhzZXNzaW9uKSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQWxyZWFkeSBpbml0aWFsaXplZCcpO1xuXG4gICAgICAgIGlmIChERUJVR19ERVZFTE9QTUVOVF9MSUNFTlNFX0tFWSkgb3B0aW9ucy5rZXkgPSBERUJVR19ERVZFTE9QTUVOVF9MSUNFTlNFX0tFWTtcblxuICAgICAgICBjb25zdCBrZXlQcm9taXNlID0gb3B0aW9ucy5rZXkgPyBcbiAgICAgICAgICAgIFByb21pc2UucmVzb2x2ZShvcHRpb25zLmtleSkgOiBcbiAgICAgICAgICAgIHRoaXMuX2RlY3J5cHRMaWNlbnNlS2V5KG9wdGlvbnMuZW5jcnlwdGVkTGljZW5zZURhdGEhLCBzZXNzaW9uKTtcblxuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IG5ldyBWdWZvcmlhU2Vzc2lvbkRhdGEoa2V5UHJvbWlzZSk7XG4gICAgICAgIHRoaXMuX3Nlc3Npb25EYXRhLnNldChzZXNzaW9uLCBzZXNzaW9uRGF0YSk7XG5cbiAgICAgICAgY29uc3QgaW5pdFJlc3VsdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlKT0+e1xuICAgICAgICAgICAgc2Vzc2lvbkRhdGEuaW5pdFJlc3VsdFJlc29sdmVyID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VsZWN0Q29udHJvbGxpbmdTZXNzaW9uKCk7XG5cbiAgICAgICAgcmV0dXJuIGluaXRSZXN1bHQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlQ2xvc2Uoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID09PSBzZXNzaW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9zZWxlY3RDb250cm9sbGluZ1Nlc3Npb24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9oYW5kbGVPYmplY3RUcmFja2VyQ3JlYXRlRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCB1cmk6c3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBmZXRjaERhdGFTZXQodXJpKS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICAgICAgbGV0IGlkID0gc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuZ2V0KHVyaSk7XG4gICAgICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICAgICAgaWQgPSBBcmdvbi5DZXNpdW0uY3JlYXRlR3VpZCgpO1xuICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRJZEJ5VXJpLnNldCh1cmksIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5kYXRhU2V0VXJpQnlJZC5zZXQoaWQsIHVyaSk7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgcmV0dXJuIHtpZH07XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9vYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZyk6IFByb21pc2U8QXJnb24uVnVmb3JpYVRyYWNrYWJsZXM+IHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcblxuICAgICAgICBjb25zdCB1cmkgPSBzZXNzaW9uRGF0YS5kYXRhU2V0VXJpQnlJZC5nZXQoaWQpO1xuICAgICAgICBpZiAoIXVyaSkgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiBVbmtub3duIERhdGFTZXQgaWQ6ICR7aWR9YCk7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmICghb2JqZWN0VHJhY2tlcikgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhOiBJbnZhbGlkIFN0YXRlLiBVbmFibGUgdG8gZ2V0IE9iamVjdFRyYWNrZXIgaW5zdGFuY2UuJylcblxuICAgICAgICBsZXQgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcblxuICAgICAgICBsZXQgdHJhY2thYmxlc1Byb21pc2U6UHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz47XG5cbiAgICAgICAgaWYgKGRhdGFTZXQpIHtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2dldFRyYWNrYWJsZXNGcm9tRGF0YVNldChkYXRhU2V0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYTogTG9hZGluZyBkYXRhc2V0ICgke2lkfSkgZnJvbSAke3VyaX0uLi5gKTtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNQcm9taXNlID0gZmV0Y2hEYXRhU2V0KHVyaSkudGhlbjxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4oKGxvY2F0aW9uKT0+e1xuICAgICAgICAgICAgICAgIGRhdGFTZXQgPSBvYmplY3RUcmFja2VyLmNyZWF0ZURhdGFTZXQoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGFTZXQpIHRocm93IG5ldyBFcnJvcihgVnVmb3JpYTogVW5hYmxlIHRvIGNyZWF0ZSBkYXRhc2V0IGluc3RhbmNlYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGRhdGFTZXQubG9hZChsb2NhdGlvbiwgdnVmb3JpYS5TdG9yYWdlVHlwZS5BYnNvbHV0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5zZXQoaWQsIGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5sb2FkZWREYXRhU2V0cy5hZGQoaWQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVzID0gdGhpcy5fZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYSBsb2FkZWQgZGF0YXNldCBmaWxlIHdpdGggdHJhY2thYmxlczpcXG4nICsgSlNPTi5zdHJpbmdpZnkodHJhY2thYmxlcykpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhY2thYmxlcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvYmplY3RUcmFja2VyLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVbmFibGUgdG8gbG9hZCBkb3dubG9hZGVkIGRhdGFzZXQgYXQgJHtsb2NhdGlvbn0gZnJvbSAke3VyaX1gKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBsb2FkIGRhdGFzZXQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApIHtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNQcm9taXNlLnRoZW4oKHRyYWNrYWJsZXMpPT57XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdhci52dWZvcmlhLm9iamVjdFRyYWNrZXJMb2FkRGF0YVNldEV2ZW50JywgeyBpZCwgdHJhY2thYmxlcyB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRyYWNrYWJsZXNQcm9taXNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2dldFRyYWNrYWJsZXNGcm9tRGF0YVNldChkYXRhU2V0OnZ1Zm9yaWEuRGF0YVNldCkge1xuICAgICAgICBjb25zdCBudW1UcmFja2FibGVzID0gZGF0YVNldC5nZXROdW1UcmFja2FibGVzKCk7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZXM6QXJnb24uVnVmb3JpYVRyYWNrYWJsZXMgPSB7fTtcbiAgICAgICAgZm9yIChsZXQgaT0wOyBpIDwgbnVtVHJhY2thYmxlczsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCB0cmFja2FibGUgPSA8dnVmb3JpYS5UcmFja2FibGU+ZGF0YVNldC5nZXRUcmFja2FibGUoaSk7XG4gICAgICAgICAgICB0cmFja2FibGVzW3RyYWNrYWJsZS5nZXROYW1lKCldID0ge1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLl9nZXRJZEZvclRyYWNrYWJsZSh0cmFja2FibGUpLFxuICAgICAgICAgICAgICAgIHNpemU6IHRyYWNrYWJsZSBpbnN0YW5jZW9mIHZ1Zm9yaWEuT2JqZWN0VGFyZ2V0ID8gdHJhY2thYmxlLmdldFNpemUoKSA6IHt4OjAseTowLHo6MH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJhY2thYmxlcztcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVPYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6c3RyaW5nKSA6IFByb21pc2U8QXJnb24uVnVmb3JpYVRyYWNrYWJsZXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbikucHVzaCgoKT0+e1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9vYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb246IEFyZ29uLlNlc3Npb25Qb3J0LCBpZDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhIGFjdGl2YXRpbmcgZGF0YXNldCAoJHtpZH0pYCk7XG5cbiAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWE6IEludmFsaWQgU3RhdGUuIFVuYWJsZSB0byBnZXQgT2JqZWN0VHJhY2tlciBpbnN0YW5jZS4nKVxuXG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG5cbiAgICAgICAgbGV0IGRhdGFTZXQgPSBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLmdldChpZCk7XG4gICAgICAgIGxldCBkYXRhU2V0UHJvbWlzZTpQcm9taXNlPHZ1Zm9yaWEuRGF0YVNldD47XG4gICAgICAgIGlmICghZGF0YVNldCkge1xuICAgICAgICAgICAgZGF0YVNldFByb21pc2UgPSB0aGlzLl9vYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpITtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhU2V0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShkYXRhU2V0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkYXRhU2V0UHJvbWlzZS50aGVuKChkYXRhU2V0KT0+e1xuICAgICAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyLmFjdGl2YXRlRGF0YVNldChkYXRhU2V0KSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IFVuYWJsZSB0byBhY3RpdmF0ZSBkYXRhU2V0ICR7aWR9YCk7XG4gICAgICAgICAgICBzZXNzaW9uRGF0YS5hY3RpdmF0ZWREYXRhU2V0cy5hZGQoaWQpO1xuICAgICAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApXG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdhci52dWZvcmlhLm9iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXRFdmVudCcsIHsgaWQgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6c3RyaW5nKSA6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbjogQXJnb24uU2Vzc2lvblBvcnQsIGlkOiBzdHJpbmcsIHBlcm1hbmVudD10cnVlKTogYm9vbGVhbiB7ICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgZGVhY3RpdmF0aW5nIGRhdGFzZXQgKCR7aWR9KWApO1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikge1xuICAgICAgICAgICAgY29uc3QgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcbiAgICAgICAgICAgIGlmIChkYXRhU2V0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdWNjZXNzID0gb2JqZWN0VHJhY2tlci5kZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0KTtcbiAgICAgICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5hY3RpdmF0ZWREYXRhU2V0cy5kZWxldGUoaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLnZlcnNpb25bMF0gPiAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdhci52dWZvcmlhLm9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Y2Nlc3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbikucHVzaCgoKT0+e1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVnVmb3JpYTogdW5hYmxlIHRvIGFjdGl2YXRlIGRhdGFzZXQgJHtpZH1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOiBzdHJpbmcsIHBlcm1hbmVudD10cnVlKTogYm9vbGVhbiB7ICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYTogdW5sb2FkaW5nIGRhdGFzZXQgKCR7aWR9KS4uLmApO1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikge1xuICAgICAgICAgICAgY29uc3QgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcbiAgICAgICAgICAgIGlmIChkYXRhU2V0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVkID0gb2JqZWN0VHJhY2tlci5kZXN0cm95RGF0YVNldChkYXRhU2V0KTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSBzZXNzaW9uRGF0YS5kYXRhU2V0VXJpQnlJZC5nZXQoaWQpITtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRJZEJ5VXJpLmRlbGV0ZSh1cmkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEubG9hZGVkRGF0YVNldHMuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXRFdmVudCcsIHsgaWQgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkZWxldGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVPYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbikucHVzaCgoKT0+e1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldChzZXNzaW9uLCBpZCkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiB1bmFibGUgdG8gdW5sb2FkIGRhdGFzZXQgJHtpZH1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZTp2dWZvcmlhLlRyYWNrYWJsZSkgOiBzdHJpbmcge1xuICAgICAgICBpZiAodHJhY2thYmxlIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiAndnVmb3JpYV9vYmplY3RfdGFyZ2V0XycgKyB0cmFja2FibGUuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAndnVmb3JpYV90cmFja2FibGVfJyArIHRyYWNrYWJsZS5nZXRJZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZGVjcnlwdExpY2Vuc2VLZXkoZW5jcnlwdGVkTGljZW5zZURhdGE6c3RyaW5nLCBzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSA6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBkZWNyeXB0KGVuY3J5cHRlZExpY2Vuc2VEYXRhLnRyaW0oKSkudGhlbigoanNvbik9PntcbiAgICAgICAgICAgIGNvbnN0IHtrZXksb3JpZ2luc30gOiB7a2V5OnN0cmluZyxvcmlnaW5zOnN0cmluZ1tdfSA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICBpZiAoIXNlc3Npb24udXJpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgb3JpZ2luJyk7XG5cbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbiA9IFVSSS5wYXJzZShzZXNzaW9uLnVyaSk7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoPGFueT5vcmlnaW5zKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZ1Zm9yaWEgTGljZW5zZSBEYXRhIG11c3Qgc3BlY2lmeSBhbGxvd2VkIG9yaWdpbnNcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gb3JpZ2lucy5maW5kKChvKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBvLnNwbGl0KC9cXC8oLiopLyk7XG4gICAgICAgICAgICAgICAgbGV0IGRvbWFpblBhdHRlcm4gPSBwYXJ0c1swXTtcbiAgICAgICAgICAgICAgICBsZXQgcGF0aFBhdHRlcm4gPSBwYXJ0c1sxXSB8fCAnKionO1xuICAgICAgICAgICAgICAgIHJldHVybiBtaW5pbWF0Y2gob3JpZ2luLmhvc3RuYW1lLCBkb21haW5QYXR0ZXJuKSAmJiBtaW5pbWF0Y2gob3JpZ2luLnBhdGgsIHBhdGhQYXR0ZXJuKTtcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGlmICghbWF0Y2ggJiYgIURFQlVHX0RJU0FCTEVfT1JJR0lOX0NIRUNLKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG9yaWdpbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jb25maWcgPSA8dnVmb3JpYS5WaWRlb0JhY2tncm91bmRDb25maWc+e307XG5cbiAgICBwdWJsaWMgY29uZmlndXJlVnVmb3JpYVZpZGVvQmFja2dyb3VuZCh2aWV3cG9ydDpBcmdvbi5WaWV3cG9ydCwgZW5hYmxlZDpib29sZWFuLCByZWZsZWN0aW9uPXZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kUmVmbGVjdGlvbi5EZWZhdWx0KSB7XG4gICAgICAgIGNvbnN0IHZpZXdXaWR0aCA9IHZpZXdwb3J0LndpZHRoO1xuICAgICAgICBjb25zdCB2aWV3SGVpZ2h0ID0gdmlld3BvcnQuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2FtZXJhRGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCk7XG4gICAgICAgIGNvbnN0IHZpZGVvTW9kZSA9IGNhbWVyYURldmljZS5nZXRWaWRlb01vZGUodnVmb3JpYUNhbWVyYURldmljZU1vZGUpO1xuICAgICAgICBsZXQgdmlkZW9XaWR0aCA9IHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgbGV0IHZpZGVvSGVpZ2h0ID0gdmlkZW9Nb2RlLmhlaWdodDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gZ2V0U2NyZWVuT3JpZW50YXRpb24oKTtcbiAgICAgICAgaWYgKG9yaWVudGF0aW9uID09PSAwIHx8IG9yaWVudGF0aW9uID09PSAxODApIHtcbiAgICAgICAgICAgIHZpZGVvV2lkdGggPSB2aWRlb01vZGUuaGVpZ2h0O1xuICAgICAgICAgICAgdmlkZW9IZWlnaHQgPSB2aWRlb01vZGUud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdpZHRoUmF0aW8gPSB2aWV3V2lkdGggLyB2aWRlb1dpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IHZpZXdIZWlnaHQgLyB2aWRlb0hlaWdodDtcbiAgICAgICAgLy8gYXNwZWN0IGZpbGxcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBNYXRoLm1heCh3aWR0aFJhdGlvLCBoZWlnaHRSYXRpbyk7XG4gICAgICAgIC8vIGFzcGVjdCBmaXRcbiAgICAgICAgLy8gY29uc3Qgc2NhbGUgPSBNYXRoLm1pbih3aWR0aFJhdGlvLCBoZWlnaHRSYXRpbyk7XG5cbiAgICAgICAgY29uc3QgdmlkZW9WaWV3ID0gdnVmb3JpYS52aWRlb1ZpZXc7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IHZpZGVvVmlldy5pb3MgPyB2aWRlb1ZpZXcuaW9zLmNvbnRlbnRTY2FsZUZhY3RvciA6IDE7XG4gICAgICAgIFxuICAgICAgICAvLyBhcHBseSB0aGUgdmlkZW8gY29uZmlnXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuX2NvbmZpZzsgXG4gICAgICAgIGNvbmZpZy5lbmFibGVkID0gZW5hYmxlZDtcbiAgICAgICAgY29uZmlnLnNpemVYID0gdmlkZW9XaWR0aCAqIHNjYWxlICogY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICBjb25maWcuc2l6ZVkgPSB2aWRlb0hlaWdodCAqIHNjYWxlICogY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICBjb25maWcucG9zaXRpb25YID0gMDtcbiAgICAgICAgY29uZmlnLnBvc2l0aW9uWSA9IDA7XG4gICAgICAgIGNvbmZpZy5yZWZsZWN0aW9uID0gdnVmb3JpYS5WaWRlb0JhY2tncm91bmRSZWZsZWN0aW9uLkRlZmF1bHQ7XG4gICAgICAgIFxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgVnVmb3JpYSBjb25maWd1cmluZyB2aWRlbyBiYWNrZ3JvdW5kLi4uXG4gICAgICAgIC8vICAgICBjb250ZW50U2NhbGVGYWN0b3I6ICR7Y29udGVudFNjYWxlRmFjdG9yfSBvcmllbnRhdGlvbjogJHtvcmllbnRhdGlvbn0gXG4gICAgICAgIC8vICAgICB2aWV3V2lkdGg6ICR7dmlld1dpZHRofSB2aWV3SGVpZ2h0OiAke3ZpZXdIZWlnaHR9IHZpZGVvV2lkdGg6ICR7dmlkZW9XaWR0aH0gdmlkZW9IZWlnaHQ6ICR7dmlkZW9IZWlnaHR9IFxuICAgICAgICAvLyAgICAgY29uZmlnOiAke0pTT04uc3RyaW5naWZ5KGNvbmZpZyl9XG4gICAgICAgIC8vIGApO1xuXG4gICAgICAgIEFic29sdXRlTGF5b3V0LnNldExlZnQodmlkZW9WaWV3LCB2aWV3cG9ydC54KTtcbiAgICAgICAgQWJzb2x1dGVMYXlvdXQuc2V0VG9wKHZpZGVvVmlldywgdmlld3BvcnQueSk7XG4gICAgICAgIHZpZGVvVmlldy53aWR0aCA9IHZpZXdXaWR0aDtcbiAgICAgICAgdmlkZW9WaWV3LmhlaWdodCA9IHZpZXdIZWlnaHQ7XG4gICAgICAgIHZ1Zm9yaWEuYXBpLmdldFJlbmRlcmVyKCkuc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKGNvbmZpZyk7XG4gICAgfVxufVxuXG4vLyBUT0RPOiBtYWtlIHRoaXMgY3Jvc3MgcGxhdGZvcm0gc29tZWhvd1xuZnVuY3Rpb24gZmV0Y2hEYXRhU2V0KHhtbFVybFN0cmluZzpzdHJpbmcpIDogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB4bWxVcmwgPSBOU1VSTC5VUkxXaXRoU3RyaW5nKHhtbFVybFN0cmluZyk7XG4gICAgY29uc3QgZGF0VXJsID0geG1sVXJsLlVSTEJ5RGVsZXRpbmdQYXRoRXh0ZW5zaW9uLlVSTEJ5QXBwZW5kaW5nUGF0aEV4dGVuc2lvbihcImRhdFwiKTtcbiAgICBcbiAgICBjb25zdCBkaXJlY3RvcnlQYXRoVXJsID0geG1sVXJsLlVSTEJ5RGVsZXRpbmdMYXN0UGF0aENvbXBvbmVudDtcbiAgICBjb25zdCBkaXJlY3RvcnlIYXNoID0gZGlyZWN0b3J5UGF0aFVybC5oYXNoO1xuICAgIGNvbnN0IHRtcFBhdGggPSBmaWxlLmtub3duRm9sZGVycy50ZW1wKCkucGF0aDtcbiAgICBjb25zdCBkaXJlY3RvcnlIYXNoUGF0aCA9IHRtcFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZGlyZWN0b3J5SGFzaDtcbiAgICBcbiAgICBmaWxlLkZvbGRlci5mcm9tUGF0aChkaXJlY3RvcnlIYXNoUGF0aCk7XG4gICAgXG4gICAgY29uc3QgeG1sRGVzdFBhdGggPSBkaXJlY3RvcnlIYXNoUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyB4bWxVcmwubGFzdFBhdGhDb21wb25lbnQ7XG4gICAgY29uc3QgZGF0RGVzdFBhdGggPSBkaXJlY3RvcnlIYXNoUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBkYXRVcmwubGFzdFBhdGhDb21wb25lbnQ7XG4gICAgXG4gICAgZnVuY3Rpb24gZG93bmxvYWRJZk5lZWRlZCh1cmw6c3RyaW5nLCBkZXN0UGF0aDpzdHJpbmcpIHtcbiAgICAgICAgbGV0IGxhc3RNb2RpZmllZDpEYXRlfHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGZpbGUuRmlsZS5leGlzdHMoZGVzdFBhdGgpKSB7XG4gICAgICAgICAgICBjb25zdCBmID0gZmlsZS5GaWxlLmZyb21QYXRoKGRlc3RQYXRoKTtcbiAgICAgICAgICAgIGxhc3RNb2RpZmllZCA9IGYubGFzdE1vZGlmaWVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBodHRwLnJlcXVlc3Qoe1xuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgbWV0aG9kOidHRVQnLFxuICAgICAgICAgICAgaGVhZGVyczogbGFzdE1vZGlmaWVkID8ge1xuICAgICAgICAgICAgICAgICdJZi1Nb2RpZmllZC1TaW5jZSc6IGxhc3RNb2RpZmllZC50b1VUQ1N0cmluZygpXG4gICAgICAgICAgICB9IDogdW5kZWZpbmVkXG4gICAgICAgIH0pLnRoZW4oKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDMwNCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBWZXJpZmllZCB0aGF0IGNhY2hlZCB2ZXJzaW9uIG9mIGZpbGUgJHt1cmx9IGF0ICR7ZGVzdFBhdGh9IGlzIHVwLXRvLWRhdGUuYClcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdFBhdGg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLmNvbnRlbnQgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDMwMCkgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRlZCBmaWxlICR7dXJsfSB0byAke2Rlc3RQYXRofWApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmNvbnRlbnQudG9GaWxlKGRlc3RQYXRoKS5wYXRoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gZG93bmxvYWQgZmlsZSBcIiArIHVybCArIFwiICAoSFRUUCBzdGF0dXMgY29kZTogXCIgKyByZXNwb25zZS5zdGF0dXNDb2RlICsgXCIpXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBkb3dubG9hZElmTmVlZGVkKHhtbFVybC5hYnNvbHV0ZVN0cmluZyx4bWxEZXN0UGF0aCksIFxuICAgICAgICBkb3dubG9hZElmTmVlZGVkKGRhdFVybC5hYnNvbHV0ZVN0cmluZyxkYXREZXN0UGF0aClcbiAgICBdKS50aGVuKCgpPT54bWxEZXN0UGF0aCk7XG59ICJdfQ==