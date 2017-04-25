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
var application = require("application");
var config_1 = require("../../config");
exports.vuforiaCameraDeviceMode = application.android ? vuforia.CameraDeviceMode.OptimizeSpeed : vuforia.CameraDeviceMode.OpimizeQuality;
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
var x180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI);
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
            position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.contextService.user),
            orientation: new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY)
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
        var landscapeRightScreenOrientationRadians = -CesiumMath.PI_OVER_TWO;
        var stateUpdateCallback = function (state) {
            var time = JulianDate.now();
            // subtract a few ms, since the video frame represents a time slightly in the past.
            // TODO: if we are using an optical see-through display, like hololens,
            // we want to do the opposite, and do forward prediction (though ideally not here, 
            // but in each app itself to we are as close as possible to the actual render time when
            // we start the render)
            JulianDate.addSeconds(time, exports.VIDEO_DELAY, time);
            // Rotate the tracker to a landscape-right frame, 
            // where +X is right, +Y is down, and +Z is in the camera direction
            // (vuforia reports poses in this frame on iOS devices, not sure about android)
            var currentScreenOrientationRadians = util_1.screenOrientation * CesiumMath.RADIANS_PER_DEGREE;
            var trackerOrientation = Quaternion.multiply(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, landscapeRightScreenOrientationRadians - currentScreenOrientationRadians, _this._scratchQuaternion), x180, _this._scratchQuaternion);
            _this.vuforiaTrackerEntity.orientation.setValue(trackerOrientation);
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
            _this._setControllingSession(_this.sessionService.manager);
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
                //     width:vuforia.videoView.getActualSize().width, //getMeasuredWidth(), 
                //     height:vuforia.videoView.getActualSize().height //getMeasuredHeight()
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
        if (config_1.config.DEBUG_DEVELOPMENT_LICENSE_KEY != "")
            options.key = config_1.config.DEBUG_DEVELOPMENT_LICENSE_KEY;
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
            if (!match && !config_1.config.DEBUG_DISABLE_ORIGIN_CHECK) {
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
        if (util_1.screenOrientation === 0 || util_1.screenOrientation === 180) {
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
        var contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : platform.screen.mainScreen.scale;
        var sizeX = videoWidth * scale * contentScaleFactor;
        var sizeY = videoHeight * scale * contentScaleFactor;
        // possible optimization, needs further testing
        // if (this._config.enabled === enabled &&
        //     this._config.sizeX === sizeX &&
        //     this._config.sizeY === sizeY) {
        //     // No changes, skip configuration
        //     return;
        // }
        // apply the video config
        var config = this._config;
        config.enabled = enabled;
        config.sizeX = sizeX;
        config.sizeY = sizeY;
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
    /*
    const xmlUrl = NSURL.URLWithString(xmlUrlString);
    const datUrl = xmlUrl.URLByDeletingPathExtension.URLByAppendingPathExtension("dat");
    
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tdnVmb3JpYS1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXZ1Zm9yaWEtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxzQ0FBd0M7QUFDeEMsOENBQWdEO0FBQ2hELDJCQUE2QjtBQUM3QixrQ0FBb0M7QUFDcEMsbUNBQXFDO0FBQ3JDLDhEQUEwRDtBQUMxRCwrQkFBaUQ7QUFDakQscUNBQXNDO0FBQ3RDLDJCQUE0QjtBQUM1Qix5Q0FBMkM7QUFDM0MsdUNBQW9DO0FBRXZCLFFBQUEsdUJBQXVCLEdBQTRCLFdBQVcsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO0FBQ3ZLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNmLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBSSxDQUFDLGtCQUFrQjtRQUM5QywrQkFBdUIsS0FBZ0MsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWE7WUFDN0YsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztBQUM3QyxDQUFDO0FBRVksUUFBQSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEdBQUMsRUFBRSxDQUFDO0FBRW5DLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3JDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBRTND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QUFDLENBQUE7Z0JBQ3BELE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbEQsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLEdBQUcsR0FBRyxHQUFHLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDNUcsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ2YsZ0JBQWdCLENBQUMsWUFBWSxFQUFDLFdBQVcsQ0FBQztRQUMxQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUMsV0FBVyxDQUFDO0tBQzdDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBSSxPQUFBLFdBQVcsRUFBWCxDQUFXLENBQUMsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBmaWxlIGZyb20gJ2ZpbGUtc3lzdGVtJztcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gJ3BsYXRmb3JtJztcbmltcG9ydCB7QWJzb2x1dGVMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvYWJzb2x1dGUtbGF5b3V0JztcbmltcG9ydCB7ZGVjcnlwdCwgc2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIG1pbmltYXRjaCBmcm9tICdtaW5pbWF0Y2gnXG5pbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnXG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQge2NvbmZpZ30gZnJvbSAnLi4vLi4vY29uZmlnJztcblxuZXhwb3J0IGNvbnN0IHZ1Zm9yaWFDYW1lcmFEZXZpY2VNb2RlOnZ1Zm9yaWEuQ2FtZXJhRGV2aWNlTW9kZSA9IGFwcGxpY2F0aW9uLmFuZHJvaWQgPyB2dWZvcmlhLkNhbWVyYURldmljZU1vZGUuT3B0aW1pemVTcGVlZCA6IHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlTW9kZS5PcGltaXplUXVhbGl0eTtcbmlmICh2dWZvcmlhLnZpZGVvVmlldy5pb3MpIHtcbiAgICAoPFVJVmlldz52dWZvcmlhLnZpZGVvVmlldy5pb3MpLmNvbnRlbnRTY2FsZUZhY3RvciA9IFxuICAgICAgICB2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZSA9PT0gPHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlTW9kZT4gdnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlLk9wdGltaXplU3BlZWQgPyBcbiAgICAgICAgMSA6IHBsYXRmb3JtLnNjcmVlbi5tYWluU2NyZWVuLnNjYWxlO1xufVxuXG5leHBvcnQgY29uc3QgVklERU9fREVMQVkgPSAtMC41LzYwO1xuXG5jb25zdCBNYXRyaXg0ID0gQXJnb24uQ2VzaXVtLk1hdHJpeDQ7XG5jb25zdCBDYXJ0ZXNpYW4zID0gQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjM7XG5jb25zdCBRdWF0ZXJuaW9uID0gQXJnb24uQ2VzaXVtLlF1YXRlcm5pb247XG5jb25zdCBKdWxpYW5EYXRlID0gQXJnb24uQ2VzaXVtLkp1bGlhbkRhdGU7XG5jb25zdCBDZXNpdW1NYXRoID0gQXJnb24uQ2VzaXVtLkNlc2l1bU1hdGg7XG5cbmNvbnN0IHgxODAgPSBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1gsIENlc2l1bU1hdGguUEkpO1xuXG5jbGFzcyBWdWZvcmlhU2Vzc2lvbkRhdGEge1xuICAgIGNvbW1hbmRRdWV1ZSA9IG5ldyBBcmdvbi5Db21tYW5kUXVldWU7XG4gICAgaW5pdFJlc3VsdFJlc29sdmVyPzoocmVzdWx0OnZ1Zm9yaWEuSW5pdFJlc3VsdCk9PnZvaWQ7XG4gICAgbG9hZGVkRGF0YVNldHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBhY3RpdmF0ZWREYXRhU2V0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGRhdGFTZXRVcmlCeUlkID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBkYXRhU2V0SWRCeVVyaSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZGF0YVNldEluc3RhbmNlQnlJZCA9IG5ldyBNYXA8c3RyaW5nLCB2dWZvcmlhLkRhdGFTZXQ+KCk7XG4gICAgY29uc3RydWN0b3IocHVibGljIGtleVByb21pc2U6IFByb21pc2U8c3RyaW5nPikge31cbn1cblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyIHtcblxuICAgIHB1YmxpYyBzdGF0ZVVwZGF0ZUV2ZW50ID0gbmV3IEFyZ29uLkV2ZW50PEFyZ29uLkNlc2l1bS5KdWxpYW5EYXRlPigpO1xuICAgIFxuICAgIHB1YmxpYyB2dWZvcmlhVHJhY2tlckVudGl0eSA9IG5ldyBBcmdvbi5DZXNpdW0uRW50aXR5KHtcbiAgICAgICAgcG9zaXRpb246IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KENhcnRlc2lhbjMuWkVSTywgdGhpcy5jb250ZXh0U2VydmljZS51c2VyKSxcbiAgICAgICAgb3JpZW50YXRpb246IG5ldyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eShRdWF0ZXJuaW9uLklERU5USVRZKVxuICAgIH0pO1xuXG4gICAgcHJpdmF0ZSBfc2NyYXRjaENhcnRlc2lhbiA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMygpO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hRdWF0ZXJuaW9uID0gbmV3IEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uKCk7XG5cdHByaXZhdGUgX3NjcmF0Y2hNYXRyaXgzID0gbmV3IEFyZ29uLkNlc2l1bS5NYXRyaXgzKCk7XG5cbiAgICBwcml2YXRlIF9jb250cm9sbGluZ1Nlc3Npb24/OiBBcmdvbi5TZXNzaW9uUG9ydDtcbiAgICBwcml2YXRlIF9zZXNzaW9uU3dpdGNoZXJDb21tYW5kUXVldWUgPSBuZXcgQXJnb24uQ29tbWFuZFF1ZXVlKCk7XG5cbiAgICBwcml2YXRlIF9zZXNzaW9uRGF0YSA9IG5ldyBXZWFrTWFwPEFyZ29uLlNlc3Npb25Qb3J0LFZ1Zm9yaWFTZXNzaW9uRGF0YT4oKTtcbiAgICBcblx0Y29uc3RydWN0b3IoXG4gICAgICAgICAgICBwcml2YXRlIHNlc3Npb25TZXJ2aWNlOkFyZ29uLlNlc3Npb25TZXJ2aWNlLFxuICAgICAgICAgICAgcHJpdmF0ZSBmb2N1c1NlcnZpY2VQcm92aWRlcjpBcmdvbi5Gb2N1c1NlcnZpY2VQcm92aWRlcixcbiAgICAgICAgICAgIHByaXZhdGUgY29udGV4dFNlcnZpY2U6QXJnb24uQ29udGV4dFNlcnZpY2UsXG4gICAgICAgICAgICAvLyBwcml2YXRlIGRldmljZVNlcnZpY2U6QXJnb24uRGV2aWNlU2VydmljZSxcbiAgICAgICAgICAgIHByaXZhdGUgY29udGV4dFNlcnZpY2VQcm92aWRlcjpBcmdvbi5Db250ZXh0U2VydmljZVByb3ZpZGVyLFxuICAgICAgICAgICAgcmVhbGl0eVNlcnZpY2U6QXJnb24uUmVhbGl0eVNlcnZpY2UpIHtcblxuICAgICAgICAvLyB0aGlzLnNlc3Npb25TZXJ2aWNlLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgIC8vICAgICB0aGlzLnN0YXRlVXBkYXRlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAvLyAgICAgICAgIGNvbnN0IHJlYWxpdHkgPSB0aGlzLmNvbnRleHRTZXJ2aWNlLnNlcmlhbGl6ZWRGcmFtZVN0YXRlLnJlYWxpdHk7XG4gICAgICAgIC8vICAgICAgICAgaWYgKHJlYWxpdHkgPT09IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRSkgdGhpcy5kZXZpY2VTZXJ2aWNlLnVwZGF0ZSgpO1xuICAgICAgICAvLyAgICAgfSk7XG4gICAgICAgIC8vICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgIC8vICAgICAgICAgY29uc3QgcmVhbGl0eSA9IHRoaXMuY29udGV4dFNlcnZpY2Uuc2VyaWFsaXplZEZyYW1lU3RhdGUucmVhbGl0eTtcbiAgICAgICAgLy8gICAgICAgICBpZiAocmVhbGl0eSAhPT0gQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFKSB0aGlzLmRldmljZVNlcnZpY2UudXBkYXRlKCk7XG4gICAgICAgIC8vICAgICB9LCA2MClcbiAgICAgICAgLy8gfSlcbiAgICAgICAgXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKChzZXNzaW9uKT0+e1xuICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEuaXNBdmFpbGFibGUnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoKSA9PiBQcm9taXNlLnJlc29sdmUoe2F2YWlsYWJsZTogZmFsc2V9KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmluaXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoaW5pdE9wdGlvbnMpID0+IFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihcIlZ1Zm9yaWEgaXMgbm90IHN1cHBvcnRlZCBvbiB0aGlzIHBsYXRmb3JtXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5pc0F2YWlsYWJsZSddID0gXG4gICAgICAgICAgICAgICAgICAgICgpID0+IFByb21pc2UucmVzb2x2ZSh7YXZhaWxhYmxlOiAhIXZ1Zm9yaWEuYXBpfSk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5pbml0J10gPSBcbiAgICAgICAgICAgICAgICAgICAgaW5pdE9wdGlvbnMgPT4gdGhpcy5faGFuZGxlSW5pdChzZXNzaW9uLCBpbml0T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyQ3JlYXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7dXJsfTp7dXJsOnN0cmluZ30pID0+IHRoaXMuX2hhbmRsZU9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0KHNlc3Npb24sIHVybCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyTG9hZERhdGFTZXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0J10gPSBcbiAgICAgICAgICAgICAgICAgICAgKHtpZH06e2lkOnN0cmluZ30pID0+IHRoaXMuX2hhbmRsZU9iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcblxuICAgICAgICAgICAgICAgIC8vIGJhY2t3YXJkcyBjb21wYXRhYmlsaXR5XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5kYXRhU2V0RmV0Y2gnXSA9IHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckxvYWREYXRhU2V0J107XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5kYXRhU2V0TG9hZCddID0gKHtpZH06e2lkOnN0cmluZ30pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZU9iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXNzaW9uLmNsb3NlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKSA9PiB0aGlzLl9oYW5kbGVDbG9zZShzZXNzaW9uKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghdnVmb3JpYS5hcGkpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIC8vIHN3aXRjaCB0byBBUiBtb2RlIHdoZW4gTElWRSByZWFsaXR5IGlzIHByZXNlbnRpbmdcbiAgICAgICAgLy8gcmVhbGl0eVNlcnZpY2UuY2hhbmdlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAvLyAgICAgdGhpcy5fc2V0RGV2aWNlTW9kZShcbiAgICAgICAgLy8gICAgICAgICBjdXJyZW50ID09PSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkUgPyBcbiAgICAgICAgLy8gICAgICAgICAgICAgdnVmb3JpYS5EZXZpY2VNb2RlLkFSIDogdnVmb3JpYS5EZXZpY2VNb2RlLlZSXG4gICAgICAgIC8vICAgICApO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxhbmRzY2FwZVJpZ2h0U2NyZWVuT3JpZW50YXRpb25SYWRpYW5zID0gLUNlc2l1bU1hdGguUElfT1ZFUl9UV087XG5cbiAgICAgICAgY29uc3Qgc3RhdGVVcGRhdGVDYWxsYmFjayA9IChzdGF0ZTp2dWZvcmlhLlN0YXRlKSA9PiB7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB0aW1lID0gSnVsaWFuRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIC8vIHN1YnRyYWN0IGEgZmV3IG1zLCBzaW5jZSB0aGUgdmlkZW8gZnJhbWUgcmVwcmVzZW50cyBhIHRpbWUgc2xpZ2h0bHkgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAvLyBUT0RPOiBpZiB3ZSBhcmUgdXNpbmcgYW4gb3B0aWNhbCBzZWUtdGhyb3VnaCBkaXNwbGF5LCBsaWtlIGhvbG9sZW5zLFxuICAgICAgICAgICAgLy8gd2Ugd2FudCB0byBkbyB0aGUgb3Bwb3NpdGUsIGFuZCBkbyBmb3J3YXJkIHByZWRpY3Rpb24gKHRob3VnaCBpZGVhbGx5IG5vdCBoZXJlLCBcbiAgICAgICAgICAgIC8vIGJ1dCBpbiBlYWNoIGFwcCBpdHNlbGYgdG8gd2UgYXJlIGFzIGNsb3NlIGFzIHBvc3NpYmxlIHRvIHRoZSBhY3R1YWwgcmVuZGVyIHRpbWUgd2hlblxuICAgICAgICAgICAgLy8gd2Ugc3RhcnQgdGhlIHJlbmRlcilcbiAgICAgICAgICAgIEp1bGlhbkRhdGUuYWRkU2Vjb25kcyh0aW1lLCBWSURFT19ERUxBWSwgdGltZSk7XG5cbiAgICAgICAgICAgIC8vIFJvdGF0ZSB0aGUgdHJhY2tlciB0byBhIGxhbmRzY2FwZS1yaWdodCBmcmFtZSwgXG4gICAgICAgICAgICAvLyB3aGVyZSArWCBpcyByaWdodCwgK1kgaXMgZG93biwgYW5kICtaIGlzIGluIHRoZSBjYW1lcmEgZGlyZWN0aW9uXG4gICAgICAgICAgICAvLyAodnVmb3JpYSByZXBvcnRzIHBvc2VzIGluIHRoaXMgZnJhbWUgb24gaU9TIGRldmljZXMsIG5vdCBzdXJlIGFib3V0IGFuZHJvaWQpXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U2NyZWVuT3JpZW50YXRpb25SYWRpYW5zID0gc2NyZWVuT3JpZW50YXRpb24gKiBDZXNpdW1NYXRoLlJBRElBTlNfUEVSX0RFR1JFRTtcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrZXJPcmllbnRhdGlvbiA9IFF1YXRlcm5pb24ubXVsdGlwbHkoXG4gICAgICAgICAgICAgICAgUXVhdGVybmlvbi5mcm9tQXhpc0FuZ2xlKENhcnRlc2lhbjMuVU5JVF9aLCBsYW5kc2NhcGVSaWdodFNjcmVlbk9yaWVudGF0aW9uUmFkaWFucyAtIGN1cnJlbnRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMsIHRoaXMuX3NjcmF0Y2hRdWF0ZXJuaW9uKSxcbiAgICAgICAgICAgICAgICB4MTgwLFxuICAgICAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hRdWF0ZXJuaW9uKTtcbiAgICAgICAgICAgICh0aGlzLnZ1Zm9yaWFUcmFja2VyRW50aXR5Lm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KS5zZXRWYWx1ZSh0cmFja2VyT3JpZW50YXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB2dWZvcmlhRnJhbWUgPSBzdGF0ZS5nZXRGcmFtZSgpO1xuICAgICAgICAgICAgY29uc3QgZnJhbWVUaW1lU3RhbXAgPSB2dWZvcmlhRnJhbWUuZ2V0VGltZVN0YW1wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0cmFja2FibGUgcmVzdWx0cyBpbiBjb250ZXh0IGVudGl0eSBjb2xsZWN0aW9uXG4gICAgICAgICAgICBjb25zdCBudW1UcmFja2FibGVSZXN1bHRzID0gc3RhdGUuZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpO1xuICAgICAgICAgICAgZm9yIChsZXQgaT0wOyBpIDwgbnVtVHJhY2thYmxlUmVzdWx0czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2thYmxlUmVzdWx0ID0gPHZ1Zm9yaWEuVHJhY2thYmxlUmVzdWx0PnN0YXRlLmdldFRyYWNrYWJsZVJlc3VsdChpKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGUgPSB0cmFja2FibGVSZXN1bHQuZ2V0VHJhY2thYmxlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IHRyYWNrYWJsZS5nZXROYW1lKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSB0aGlzLl9nZXRJZEZvclRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBjb250ZXh0U2VydmljZS5lbnRpdGllcy5nZXRCeUlkKGlkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkgPSBuZXcgQXJnb24uQ2VzaXVtLkVudGl0eSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5TYW1wbGVkUG9zaXRpb25Qcm9wZXJ0eSh0aGlzLnZ1Zm9yaWFUcmFja2VyRW50aXR5KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWVudGF0aW9uOiBuZXcgQXJnb24uQ2VzaXVtLlNhbXBsZWRQcm9wZXJ0eShBcmdvbi5DZXNpdW0uUXVhdGVybmlvbilcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGl0eVBvc2l0aW9uID0gZW50aXR5LnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUG9zaXRpb25Qcm9wZXJ0eTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50aXR5T3JpZW50YXRpb24gPSBlbnRpdHkub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLlNhbXBsZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5UG9zaXRpb24ubWF4TnVtU2FtcGxlcyA9IDEwO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlPcmllbnRhdGlvbi5tYXhOdW1TYW1wbGVzID0gMTA7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eVBvc2l0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uVHlwZSA9IEFyZ29uLkNlc2l1bS5FeHRyYXBvbGF0aW9uVHlwZS5IT0xEO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlPcmllbnRhdGlvbi5mb3J3YXJkRXh0cmFwb2xhdGlvblR5cGUgPSBBcmdvbi5DZXNpdW0uRXh0cmFwb2xhdGlvblR5cGUuSE9MRDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5UG9zaXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25EdXJhdGlvbiA9IDEwLzYwO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlPcmllbnRhdGlvbi5mb3J3YXJkRXh0cmFwb2xhdGlvbkR1cmF0aW9uID0gMTAvNjA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHRTZXJ2aWNlLmVudGl0aWVzLmFkZChlbnRpdHkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRleHRTZXJ2aWNlUHJvdmlkZXIucHVibGlzaGluZ1JlZmVyZW5jZUZyYW1lTWFwLnNldChpZCwgdGhpcy5jb250ZXh0U2VydmljZS51c2VyLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2thYmxlVGltZSA9IEp1bGlhbkRhdGUuY2xvbmUodGltZSk7IFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGFkZCBhbnkgdGltZSBkaWZmIGZyb20gdnVmb3JpYVxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZVRpbWVEaWZmID0gdHJhY2thYmxlUmVzdWx0LmdldFRpbWVTdGFtcCgpIC0gZnJhbWVUaW1lU3RhbXA7XG4gICAgICAgICAgICAgICAgaWYgKHRyYWNrYWJsZVRpbWVEaWZmICE9PSAwKSBKdWxpYW5EYXRlLmFkZFNlY29uZHModGltZSwgdHJhY2thYmxlVGltZURpZmYsIHRyYWNrYWJsZVRpbWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2UgPSA8QXJnb24uQ2VzaXVtLk1hdHJpeDQ+PGFueT50cmFja2FibGVSZXN1bHQuZ2V0UG9zZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gTWF0cml4NC5nZXRUcmFuc2xhdGlvbihwb3NlLCB0aGlzLl9zY3JhdGNoQ2FydGVzaWFuKTtcbiAgICAgICAgICAgICAgICBjb25zdCByb3RhdGlvbk1hdHJpeCA9IE1hdHJpeDQuZ2V0Um90YXRpb24ocG9zZSwgdGhpcy5fc2NyYXRjaE1hdHJpeDMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gUXVhdGVybmlvbi5mcm9tUm90YXRpb25NYXRyaXgocm90YXRpb25NYXRyaXgsIHRoaXMuX3NjcmF0Y2hRdWF0ZXJuaW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAoZW50aXR5LnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUG9zaXRpb25Qcm9wZXJ0eSkuYWRkU2FtcGxlKHRyYWNrYWJsZVRpbWUsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAoZW50aXR5Lm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUHJvcGVydHkpLmFkZFNhbXBsZSh0cmFja2FibGVUaW1lLCBvcmllbnRhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVVwZGF0ZUV2ZW50LnJhaXNlRXZlbnQodGltZSk7XG4gICAgICAgICAgICAvLyB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzLnNlc3Npb25TZXJ2aWNlLmVycm9yRXZlbnQucmFpc2VFdmVudChlKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHZ1Zm9yaWEuYXBpLnNldFN0YXRlVXBkYXRlQ2FsbGJhY2soc3RhdGVVcGRhdGVDYWxsYmFjayk7XG5cdH1cbiAgICAgICAgXG4gICAgLy8gcHJpdmF0ZSBfZGV2aWNlTW9kZSA9IHZ1Zm9yaWEuRGV2aWNlTW9kZS5WUjtcbiAgICAvLyBwcml2YXRlIF9zZXREZXZpY2VNb2RlKGRldmljZU1vZGU6IHZ1Zm9yaWEuRGV2aWNlTW9kZSkge1xuICAgIC8vICAgICB0aGlzLl9kZXZpY2VNb2RlID0gZGV2aWNlTW9kZTtcbiAgICAvLyAgICAgLy8gZm9sbG93aW5nIG1heSBmYWlsIChyZXR1cm4gZmFsc2UpIGlmIHZ1Zm9yaWEgaXMgbm90IGN1cnJlbnRseSBpbml0aWFsaXplZCwgXG4gICAgLy8gICAgIC8vIGJ1dCB0aGF0J3Mgb2theSAoc2luY2UgbmV4dCB0aW1lIHdlIGluaXRpbGFpemUgd2Ugd2lsbCB1c2UgdGhlIHNhdmVkIG1vZGUpLiBcbiAgICAvLyAgICAgdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCkuc2V0TW9kZShkZXZpY2VNb2RlKTsgXG4gICAgLy8gfSBcblxuICAgIHByaXZhdGUgX2dldFNlc3Npb25EYXRhKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9zZXNzaW9uRGF0YS5nZXQoc2Vzc2lvbik7XG4gICAgICAgIGlmICghc2Vzc2lvbkRhdGEpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYSBtdXN0IGJlIGluaXRpYWxpemVkIGZpcnN0JylcbiAgICAgICAgcmV0dXJuIHNlc3Npb25EYXRhO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX3Nlc3Npb25EYXRhLmdldChzZXNzaW9uKSE7XG4gICAgICAgIGlmICghc2Vzc2lvbkRhdGEuY29tbWFuZFF1ZXVlKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWEgbXVzdCBiZSBpbml0aWFsaXplZCBmaXJzdCcpXG4gICAgICAgIHJldHVybiBzZXNzaW9uRGF0YS5jb21tYW5kUXVldWU7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX3NlbGVjdENvbnRyb2xsaW5nU2Vzc2lvbigpIHtcbiAgICAgICAgY29uc3QgZm9jdXNTZXNzaW9uID0gdGhpcy5mb2N1c1NlcnZpY2VQcm92aWRlci5zZXNzaW9uO1xuXG4gICAgICAgIGlmIChmb2N1c1Nlc3Npb24gJiYgXG4gICAgICAgICAgICBmb2N1c1Nlc3Npb24uaXNDb25uZWN0ZWQgJiYgXG4gICAgICAgICAgICB0aGlzLl9zZXNzaW9uRGF0YS5oYXMoZm9jdXNTZXNzaW9uKSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0Q29udHJvbGxpbmdTZXNzaW9uKGZvY3VzU2Vzc2lvbik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uICYmIFxuICAgICAgICAgICAgdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uLmlzQ29ubmVjdGVkICYmXG4gICAgICAgICAgICB0aGlzLl9zZXNzaW9uRGF0YS5oYXModGhpcy5fY29udHJvbGxpbmdTZXNzaW9uKSkgXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gcGljayBhIGRpZmZlcmVudCBzZXNzaW9uIGFzIHRoZSBjb250cm9sbGluZyBzZXNzaW9uXG4gICAgICAgIC8vIFRPRE86IHByaW9yaXRpemUgYW55IHNlc3Npb25zIG90aGVyIHRoYW4gdGhlIGZvY3Vzc2VkIHNlc3Npb24/XG4gICAgICAgIGZvciAoY29uc3Qgc2Vzc2lvbiBvZiB0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZWRTZXNzaW9ucykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3Nlc3Npb25EYXRhLmhhcyhzZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBubyBvdGhlciBzZXNzaW9uIGlzIGF2YWlsYWJsZSxcbiAgICAgICAgLy8gZmFsbGJhY2sgdG8gdGhlIG1hbmFnZXIgYXMgdGhlIGNvbnRyb2xsaW5nIHNlc3Npb25cbiAgICAgICAgaWYgKHRoaXMuX3Nlc3Npb25EYXRhLmhhcyh0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZXIpKVxuICAgICAgICAgICAgdGhpcy5fc2V0Q29udHJvbGxpbmdTZXNzaW9uKHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0Q29udHJvbGxpbmdTZXNzaW9uKHNlc3Npb246IEFyZ29uLlNlc3Npb25Qb3J0KTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPT09IHNlc3Npb24pIHJldHVybjtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlZ1Zm9yaWFTZXJ2aWNlOiBTZXR0aW5nIGNvbnRyb2xsaW5nIHNlc3Npb24gdG8gXCIgKyBzZXNzaW9uLnVyaSlcblxuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2aW91c1Nlc3Npb24gPSB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb247XG4gICAgICAgICAgICB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl9zZXNzaW9uU3dpdGNoZXJDb21tYW5kUXVldWUucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlU2Vzc2lvbihwcmV2aW91c1Nlc3Npb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiA9IHNlc3Npb247XG4gICAgICAgIHRoaXMuX3Nlc3Npb25Td2l0Y2hlckNvbW1hbmRRdWV1ZS5wdXNoKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZXN1bWVTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICB9LCB0cnVlKS5jYXRjaCgoKT0+e1xuICAgICAgICAgICAgdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fc2V0Q29udHJvbGxpbmdTZXNzaW9uKHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3BhdXNlU2Vzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBQYXVzaW5nIHNlc3Npb24gJyArIHNlc3Npb24udXJpICsgJy4uLicpO1xuXG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGNvbW1hbmRRdWV1ZSA9IHNlc3Npb25EYXRhLmNvbW1hbmRRdWV1ZTtcblxuICAgICAgICByZXR1cm4gY29tbWFuZFF1ZXVlLnB1c2goKCkgPT4ge1xuICAgICAgICAgICAgY29tbWFuZFF1ZXVlLnBhdXNlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIHRoZSBzZXNzaW9uIGlzIGNsb3NlZCwgd2Ugc2V0IHRoZSBwZXJtYW5lbnQgZmxhZyB0byB0cnVlLlxuICAgICAgICAgICAgLy8gTGlrZXdpc2UsIGlmIHRoZSBzZXNzaW9uIGlzIG5vdCBjbG9zZWQsIHdlIHNldCB0aGUgcGVybWFuZW50IGZsYXQgdG8gZmFsc2UsXG4gICAgICAgICAgICAvLyBtYWludGFpbmluZyB0aGUgY3VycmVudCBzZXNzaW9uIHN0YXRlLlxuICAgICAgICAgICAgY29uc3QgcGVybWFuZW50ID0gc2Vzc2lvbi5pc0Nsb3NlZDtcblxuICAgICAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3RUcmFja2VyKSBvYmplY3RUcmFja2VyLnN0b3AoKTtcblxuICAgICAgICAgICAgY29uc3QgYWN0aXZhdGVkRGF0YVNldHMgPSBzZXNzaW9uRGF0YS5hY3RpdmF0ZWREYXRhU2V0cztcbiAgICAgICAgICAgIGlmIChhY3RpdmF0ZWREYXRhU2V0cykge1xuICAgICAgICAgICAgICAgIGFjdGl2YXRlZERhdGFTZXRzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCwgcGVybWFuZW50KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbG9hZGVkRGF0YVNldHMgPSBzZXNzaW9uRGF0YS5sb2FkZWREYXRhU2V0cztcbiAgICAgICAgICAgIGlmIChsb2FkZWREYXRhU2V0cykge1xuICAgICAgICAgICAgICAgIGxvYWRlZERhdGFTZXRzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb24sIGlkLCBwZXJtYW5lbnQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogZGVpbml0aWFsaXppbmcuLi4nKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpLnN0b3AoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpLmRlaW5pdCgpO1xuICAgICAgICAgICAgdnVmb3JpYS5hcGkuZGVpbml0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICAgICAgdnVmb3JpYS5hcGkuZGVpbml0KCk7XG5cbiAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXNzaW9uRGF0YS5kZWxldGUoc2Vzc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9yZXN1bWVTZXNzaW9uKHNlc3Npb246IEFyZ29uLlNlc3Npb25Qb3J0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGNvbW1hbmRRdWV1ZSA9IHRoaXMuX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbik7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IFJlc3VtaW5nIHNlc3Npb24gJyArIHNlc3Npb24udXJpICsgJy4uLicpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9pbml0KHNlc3Npb24pLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbW1hbmRRdWV1ZS5leGVjdXRlKCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaW5pdChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSA6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBrZXlQcm9taXNlID0gc2Vzc2lvbkRhdGEua2V5UHJvbWlzZTtcbiAgICAgICAgaWYgKCFrZXlQcm9taXNlKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWE6IEludmFsaWQgU3RhdGUuIE1pc3NpbmcgS2V5LicpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGtleVByb21pc2UudGhlbjx2b2lkPigga2V5ID0+IHtcblxuICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaS5zZXRMaWNlbnNlS2V5KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdWdWZvcmlhOiBVbmFibGUgdG8gc2V0IHRoZSBsaWNlbnNlIGtleScpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IGluaXRpYWxpemluZy4uLicpO1xuXG4gICAgICAgICAgICByZXR1cm4gdnVmb3JpYS5hcGkuaW5pdCgpLnRoZW4oKHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogSW5pdCBSZXN1bHQ6ICcgKyByZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZUluaXRSZXN1bHQgPSBzZXNzaW9uRGF0YS5pbml0UmVzdWx0UmVzb2x2ZXI7XG4gICAgICAgICAgICAgICAgaWYgKHJlc29sdmVJbml0UmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmVJbml0UmVzdWx0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmluaXRSZXN1bHRSZXNvbHZlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB2dWZvcmlhLkluaXRSZXN1bHQuU1VDQ0VTUykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodnVmb3JpYS5Jbml0UmVzdWx0W3Jlc3VsdF0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAvLyBtdXN0IGluaXRpYWxpemUgdHJhY2tlcnMgYmVmb3JlIGluaXRpYWxpemluZyB0aGUgY2FtZXJhIGRldmljZVxuICAgICAgICAgICAgICAgIGlmICghdnVmb3JpYS5hcGkuaW5pdE9iamVjdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWdWZvcmlhOiBVbmFibGUgdG8gaW5pdGlhbGl6ZSBPYmplY3RUcmFja2VyXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGNhbWVyYURldmljZSA9IHZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJWdWZvcmlhOiBpbml0aWFsaXppbmcgY2FtZXJhIGRldmljZS4uLlwiKTtcblxuICAgICAgICAgICAgICAgIGlmICghY2FtZXJhRGV2aWNlLmluaXQodnVmb3JpYS5DYW1lcmFEZXZpY2VEaXJlY3Rpb24uRGVmYXVsdCkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGluaXRpYWxpemUgY2FtZXJhIGRldmljZScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWNhbWVyYURldmljZS5zZWxlY3RWaWRlb01vZGUodnVmb3JpYUNhbWVyYURldmljZU1vZGUpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzZWxlY3QgdmlkZW8gbW9kZScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLmdldERldmljZSgpLnNldE1vZGUodnVmb3JpYS5EZXZpY2VNb2RlLkFSKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gc2V0IGRldmljZSBtb2RlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5jb25maWd1cmVWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kKHtcbiAgICAgICAgICAgICAgICAvLyAgICAgeDowLFxuICAgICAgICAgICAgICAgIC8vICAgICB5OjAsXG4gICAgICAgICAgICAgICAgLy8gICAgIHdpZHRoOnZ1Zm9yaWEudmlkZW9WaWV3LmdldEFjdHVhbFNpemUoKS53aWR0aCwgLy9nZXRNZWFzdXJlZFdpZHRoKCksIFxuICAgICAgICAgICAgICAgIC8vICAgICBoZWlnaHQ6dnVmb3JpYS52aWRlb1ZpZXcuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodCAvL2dldE1lYXN1cmVkSGVpZ2h0KClcbiAgICAgICAgICAgICAgICAvLyB9LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCkuc3RhcnQoKSkgXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHN0YXJ0IGNhbWVyYScpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbG9hZGVkRGF0YVNldHMgPSBzZXNzaW9uRGF0YS5sb2FkZWREYXRhU2V0cztcbiAgICAgICAgICAgICAgICBjb25zdCBsb2FkUHJvbWlzZXM6UHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAobG9hZGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9hZGVkRGF0YVNldHMuZm9yRWFjaCgoaWQpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkUHJvbWlzZXMucHVzaCh0aGlzLl9vYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxvYWRQcm9taXNlcyk7XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aXZhdGVkRGF0YVNldHMgPSBzZXNzaW9uRGF0YS5hY3RpdmF0ZWREYXRhU2V0czsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aXZhdGVQcm9taXNlczpQcm9taXNlPGFueT5bXSA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChhY3RpdmF0ZWREYXRhU2V0cykge1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmF0ZWREYXRhU2V0cy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVQcm9taXNlcy5wdXNoKHRoaXMuX29iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhY3RpdmF0ZVByb21pc2VzO1xuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWE6IFVuYWJsZSB0byBnZXQgb2JqZWN0VHJhY2tlciBpbnN0YW5jZScpO1xuICAgICAgICAgICAgICAgIG9iamVjdFRyYWNrZXIuc3RhcnQoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUluaXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgb3B0aW9uczp7ZW5jcnlwdGVkTGljZW5zZURhdGE/OnN0cmluZywga2V5PzpzdHJpbmd9KSB7XG4gICAgICAgIGlmICghb3B0aW9ucy5rZXkgJiYgIW9wdGlvbnMuZW5jcnlwdGVkTGljZW5zZURhdGEpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGxpY2Vuc2Uga2V5IHdhcyBwcm92aWRlZC4gR2V0IG9uZSBmcm9tIGh0dHBzOi8vZGV2ZWxvcGVyLnZ1Zm9yaWEuY29tLycpO1xuXG4gICAgICAgIGlmICh0aGlzLl9zZXNzaW9uRGF0YS5oYXMoc2Vzc2lvbikpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FscmVhZHkgaW5pdGlhbGl6ZWQnKTtcblxuICAgICAgICBpZiAoY29uZmlnLkRFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZICE9IFwiXCIpIG9wdGlvbnMua2V5ID0gY29uZmlnLkRFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZO1xuXG4gICAgICAgIGNvbnN0IGtleVByb21pc2UgPSBvcHRpb25zLmtleSA/IFxuICAgICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKG9wdGlvbnMua2V5KSA6IFxuICAgICAgICAgICAgdGhpcy5fZGVjcnlwdExpY2Vuc2VLZXkob3B0aW9ucy5lbmNyeXB0ZWRMaWNlbnNlRGF0YSEsIHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gbmV3IFZ1Zm9yaWFTZXNzaW9uRGF0YShrZXlQcm9taXNlKTtcbiAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuc2V0KHNlc3Npb24sIHNlc3Npb25EYXRhKTtcblxuICAgICAgICBjb25zdCBpbml0UmVzdWx0ID0gbmV3IFByb21pc2UoKHJlc29sdmUpPT57XG4gICAgICAgICAgICBzZXNzaW9uRGF0YS5pbml0UmVzdWx0UmVzb2x2ZXIgPSByZXNvbHZlO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZWxlY3RDb250cm9sbGluZ1Nlc3Npb24oKTtcblxuICAgICAgICByZXR1cm4gaW5pdFJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVDbG9zZShzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGlmICh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPT09IHNlc3Npb24pIHtcbiAgICAgICAgICAgIHRoaXMuX3NlbGVjdENvbnRyb2xsaW5nU2Vzc2lvbigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIHVyaTpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIGZldGNoRGF0YVNldCh1cmkpLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgICAgICBsZXQgaWQgPSBzZXNzaW9uRGF0YS5kYXRhU2V0SWRCeVVyaS5nZXQodXJpKTtcbiAgICAgICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgICAgICBpZCA9IEFyZ29uLkNlc2l1bS5jcmVhdGVHdWlkKCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuc2V0KHVyaSwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLnNldChpZCwgdXJpKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICByZXR1cm4ge2lkfTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDogc3RyaW5nKTogUHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4ge1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnN0IHVyaSA9IHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmdldChpZCk7XG4gICAgICAgIGlmICghdXJpKSB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IFVua25vd24gRGF0YVNldCBpZDogJHtpZH1gKTtcbiAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWE6IEludmFsaWQgU3RhdGUuIFVuYWJsZSB0byBnZXQgT2JqZWN0VHJhY2tlciBpbnN0YW5jZS4nKVxuXG4gICAgICAgIGxldCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuXG4gICAgICAgIGxldCB0cmFja2FibGVzUHJvbWlzZTpQcm9taXNlPEFyZ29uLlZ1Zm9yaWFUcmFja2FibGVzPjtcblxuICAgICAgICBpZiAoZGF0YVNldCkge1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUodGhpcy5fZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhOiBMb2FkaW5nIGRhdGFzZXQgKCR7aWR9KSBmcm9tICR7dXJpfS4uLmApO1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UgPSBmZXRjaERhdGFTZXQodXJpKS50aGVuPEFyZ29uLlZ1Zm9yaWFUcmFja2FibGVzPigobG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgZGF0YVNldCA9IG9iamVjdFRyYWNrZXIuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICAgICAgICAgIGlmICghZGF0YVNldCkgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiBVbmFibGUgdG8gY3JlYXRlIGRhdGFzZXQgaW5zdGFuY2VgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGF0YVNldC5sb2FkKGxvY2F0aW9uLCB2dWZvcmlhLlN0b3JhZ2VUeXBlLkFic29sdXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLnNldChpZCwgZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmxvYWRlZERhdGFTZXRzLmFkZChpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZXMgPSB0aGlzLl9nZXRUcmFja2FibGVzRnJvbURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhIGxvYWRlZCBkYXRhc2V0IGZpbGUgd2l0aCB0cmFja2FibGVzOlxcbicgKyBKU09OLnN0cmluZ2lmeSh0cmFja2FibGVzKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmFja2FibGVzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9iamVjdFRyYWNrZXIuZGVzdHJveURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVuYWJsZSB0byBsb2FkIGRvd25sb2FkZWQgZGF0YXNldCBhdCAke2xvY2F0aW9ufSBmcm9tICR7dXJpfWApO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGxvYWQgZGF0YXNldCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMCkge1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UudGhlbigodHJhY2thYmxlcyk9PntcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckxvYWREYXRhU2V0RXZlbnQnLCB7IGlkLCB0cmFja2FibGVzIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJhY2thYmxlc1Byb21pc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQ6dnVmb3JpYS5EYXRhU2V0KSB7XG4gICAgICAgIGNvbnN0IG51bVRyYWNrYWJsZXMgPSBkYXRhU2V0LmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlczpBcmdvbi5WdWZvcmlhVHJhY2thYmxlcyA9IHt9O1xuICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1UcmFja2FibGVzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IDx2dWZvcmlhLlRyYWNrYWJsZT5kYXRhU2V0LmdldFRyYWNrYWJsZShpKTtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNbdHJhY2thYmxlLmdldE5hbWUoKV0gPSB7XG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZSksXG4gICAgICAgICAgICAgICAgc2l6ZTogdHJhY2thYmxlIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQgPyB0cmFja2FibGUuZ2V0U2l6ZSgpIDoge3g6MCx5OjAsejowfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cmFja2FibGVzO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIDogUHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbjogQXJnb24uU2Vzc2lvblBvcnQsIGlkOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgYWN0aXZhdGluZyBkYXRhc2V0ICgke2lkfSlgKTtcblxuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYTogSW52YWxpZCBTdGF0ZS4gVW5hYmxlIHRvIGdldCBPYmplY3RUcmFja2VyIGluc3RhbmNlLicpXG5cbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcblxuICAgICAgICBsZXQgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcbiAgICAgICAgbGV0IGRhdGFTZXRQcm9taXNlOlByb21pc2U8dnVmb3JpYS5EYXRhU2V0PjtcbiAgICAgICAgaWYgKCFkYXRhU2V0KSB7XG4gICAgICAgICAgICBkYXRhU2V0UHJvbWlzZSA9IHRoaXMuX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIHJldHVybiBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLmdldChpZCkhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGFTZXRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGRhdGFTZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRhdGFTZXRQcm9taXNlLnRoZW4oKGRhdGFTZXQpPT57XG4gICAgICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIuYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVnVmb3JpYTogVW5hYmxlIHRvIGFjdGl2YXRlIGRhdGFTZXQgJHtpZH1gKTtcbiAgICAgICAgICAgIHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzLmFkZChpZCk7XG4gICAgICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMClcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlT2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb24pLnB1c2goKCk9PntcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZywgcGVybWFuZW50PXRydWUpOiBib29sZWFuIHsgICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYSBkZWFjdGl2YXRpbmcgZGF0YXNldCAoJHtpZH0pYCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKGRhdGFTZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBvYmplY3RUcmFja2VyLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0RXZlbnQnLCB7IGlkIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2VzcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlT2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOnN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICBpZiAoIXRoaXMuX29iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiB1bmFibGUgdG8gYWN0aXZhdGUgZGF0YXNldCAke2lkfWApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfb2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZywgcGVybWFuZW50PXRydWUpOiBib29sZWFuIHsgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhOiB1bmxvYWRpbmcgZGF0YXNldCAoJHtpZH0pLi4uYCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKGRhdGFTZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZWQgPSBvYmplY3RUcmFja2VyLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmdldChpZCkhO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuZGVsZXRlKHVyaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5sb2FkZWREYXRhU2V0cy5kZWxldGUoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldFVyaUJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlbGV0ZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOnN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICBpZiAoIXRoaXMuX29iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb24sIGlkKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IHVuYWJsZSB0byB1bmxvYWQgZGF0YXNldCAke2lkfWApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfZ2V0SWRGb3JUcmFja2FibGUodHJhY2thYmxlOnZ1Zm9yaWEuVHJhY2thYmxlKSA6IHN0cmluZyB7XG4gICAgICAgIGlmICh0cmFja2FibGUgaW5zdGFuY2VvZiB2dWZvcmlhLk9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX29iamVjdF90YXJnZXRfJyArIHRyYWNrYWJsZS5nZXRVbmlxdWVUYXJnZXRJZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX3RyYWNrYWJsZV8nICsgdHJhY2thYmxlLmdldElkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9kZWNyeXB0TGljZW5zZUtleShlbmNyeXB0ZWRMaWNlbnNlRGF0YTpzdHJpbmcsIHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIDogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIGRlY3J5cHQoZW5jcnlwdGVkTGljZW5zZURhdGEudHJpbSgpKS50aGVuKChqc29uKT0+e1xuICAgICAgICAgICAgY29uc3Qge2tleSxvcmlnaW5zfSA6IHtrZXk6c3RyaW5nLG9yaWdpbnM6c3RyaW5nW119ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgIGlmICghc2Vzc2lvbi51cmkpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBvcmlnaW4nKTtcblxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luID0gVVJJLnBhcnNlKHNlc3Npb24udXJpKTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSg8YW55Pm9yaWdpbnMpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVnVmb3JpYSBMaWNlbnNlIERhdGEgbXVzdCBzcGVjaWZ5IGFsbG93ZWQgb3JpZ2luc1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBvcmlnaW5zLmZpbmQoKG8pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IG8uc3BsaXQoL1xcLyguKikvKTtcbiAgICAgICAgICAgICAgICBsZXQgZG9tYWluUGF0dGVybiA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgICAgIGxldCBwYXRoUGF0dGVybiA9IHBhcnRzWzFdIHx8ICcqKic7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1pbmltYXRjaChvcmlnaW4uaG9zdG5hbWUsIGRvbWFpblBhdHRlcm4pICYmIG1pbmltYXRjaChvcmlnaW4ucGF0aCwgcGF0aFBhdHRlcm4pO1xuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCAmJiAhY29uZmlnLkRFQlVHX0RJU0FCTEVfT1JJR0lOX0NIRUNLKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG9yaWdpbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jb25maWcgPSA8dnVmb3JpYS5WaWRlb0JhY2tncm91bmRDb25maWc+e307XG5cbiAgICBwdWJsaWMgY29uZmlndXJlVnVmb3JpYVZpZGVvQmFja2dyb3VuZCh2aWV3cG9ydDpBcmdvbi5WaWV3cG9ydCwgZW5hYmxlZDpib29sZWFuLCByZWZsZWN0aW9uPXZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kUmVmbGVjdGlvbi5EZWZhdWx0KSB7XG4gICAgICAgIGNvbnN0IHZpZXdXaWR0aCA9IHZpZXdwb3J0LndpZHRoO1xuICAgICAgICBjb25zdCB2aWV3SGVpZ2h0ID0gdmlld3BvcnQuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2FtZXJhRGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCk7XG4gICAgICAgIGNvbnN0IHZpZGVvTW9kZSA9IGNhbWVyYURldmljZS5nZXRWaWRlb01vZGUodnVmb3JpYUNhbWVyYURldmljZU1vZGUpO1xuICAgICAgICBsZXQgdmlkZW9XaWR0aCA9IHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgbGV0IHZpZGVvSGVpZ2h0ID0gdmlkZW9Nb2RlLmhlaWdodDtcbiAgICAgICAgXG4gICAgICAgIGlmIChzY3JlZW5PcmllbnRhdGlvbiA9PT0gMCB8fCBzY3JlZW5PcmllbnRhdGlvbiA9PT0gMTgwKSB7XG4gICAgICAgICAgICB2aWRlb1dpZHRoID0gdmlkZW9Nb2RlLmhlaWdodDtcbiAgICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3aWR0aFJhdGlvID0gdmlld1dpZHRoIC8gdmlkZW9XaWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0UmF0aW8gPSB2aWV3SGVpZ2h0IC8gdmlkZW9IZWlnaHQ7XG4gICAgICAgIC8vIGFzcGVjdCBmaWxsXG4gICAgICAgIGNvbnN0IHNjYWxlID0gTWF0aC5tYXgod2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuICAgICAgICAvLyBhc3BlY3QgZml0XG4gICAgICAgIC8vIGNvbnN0IHNjYWxlID0gTWF0aC5taW4od2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuXG4gICAgICAgIGNvbnN0IHZpZGVvVmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgICAgICBjb25zdCBjb250ZW50U2NhbGVGYWN0b3IgPSB2aWRlb1ZpZXcuaW9zID8gdmlkZW9WaWV3Lmlvcy5jb250ZW50U2NhbGVGYWN0b3IgOiBwbGF0Zm9ybS5zY3JlZW4ubWFpblNjcmVlbi5zY2FsZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNpemVYID0gdmlkZW9XaWR0aCAqIHNjYWxlICogY29udGVudFNjYWxlRmFjdG9yO1xuICAgICAgICBjb25zdCBzaXplWSA9IHZpZGVvSGVpZ2h0ICogc2NhbGUgKiBjb250ZW50U2NhbGVGYWN0b3I7XG5cbiAgICAgICAgLy8gcG9zc2libGUgb3B0aW1pemF0aW9uLCBuZWVkcyBmdXJ0aGVyIHRlc3RpbmdcbiAgICAgICAgLy8gaWYgKHRoaXMuX2NvbmZpZy5lbmFibGVkID09PSBlbmFibGVkICYmXG4gICAgICAgIC8vICAgICB0aGlzLl9jb25maWcuc2l6ZVggPT09IHNpemVYICYmXG4gICAgICAgIC8vICAgICB0aGlzLl9jb25maWcuc2l6ZVkgPT09IHNpemVZKSB7XG4gICAgICAgIC8vICAgICAvLyBObyBjaGFuZ2VzLCBza2lwIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIGFwcGx5IHRoZSB2aWRlbyBjb25maWdcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5fY29uZmlnOyBcbiAgICAgICAgY29uZmlnLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgICBjb25maWcuc2l6ZVggPSBzaXplWDtcbiAgICAgICAgY29uZmlnLnNpemVZID0gc2l6ZVk7XG4gICAgICAgIGNvbmZpZy5wb3NpdGlvblggPSAwO1xuICAgICAgICBjb25maWcucG9zaXRpb25ZID0gMDtcbiAgICAgICAgY29uZmlnLnJlZmxlY3Rpb24gPSB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZFJlZmxlY3Rpb24uRGVmYXVsdDtcbiAgICAgICAgXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBWdWZvcmlhIGNvbmZpZ3VyaW5nIHZpZGVvIGJhY2tncm91bmQuLi5cbiAgICAgICAgLy8gICAgIGNvbnRlbnRTY2FsZUZhY3RvcjogJHtjb250ZW50U2NhbGVGYWN0b3J9IG9yaWVudGF0aW9uOiAke29yaWVudGF0aW9ufSBcbiAgICAgICAgLy8gICAgIHZpZXdXaWR0aDogJHt2aWV3V2lkdGh9IHZpZXdIZWlnaHQ6ICR7dmlld0hlaWdodH0gdmlkZW9XaWR0aDogJHt2aWRlb1dpZHRofSB2aWRlb0hlaWdodDogJHt2aWRlb0hlaWdodH0gXG4gICAgICAgIC8vICAgICBjb25maWc6ICR7SlNPTi5zdHJpbmdpZnkoY29uZmlnKX1cbiAgICAgICAgLy8gYCk7XG5cbiAgICAgICAgQWJzb2x1dGVMYXlvdXQuc2V0TGVmdCh2aWRlb1ZpZXcsIHZpZXdwb3J0LngpO1xuICAgICAgICBBYnNvbHV0ZUxheW91dC5zZXRUb3AodmlkZW9WaWV3LCB2aWV3cG9ydC55KTtcbiAgICAgICAgdmlkZW9WaWV3LndpZHRoID0gdmlld1dpZHRoO1xuICAgICAgICB2aWRlb1ZpZXcuaGVpZ2h0ID0gdmlld0hlaWdodDtcbiAgICAgICAgdnVmb3JpYS5hcGkuZ2V0UmVuZGVyZXIoKS5zZXRWaWRlb0JhY2tncm91bmRDb25maWcoY29uZmlnKTtcbiAgICB9XG59XG5cbi8vIFRPRE86IG1ha2UgdGhpcyBjcm9zcyBwbGF0Zm9ybSBzb21laG93XG5mdW5jdGlvbiBmZXRjaERhdGFTZXQoeG1sVXJsU3RyaW5nOnN0cmluZykgOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIC8qXG4gICAgY29uc3QgeG1sVXJsID0gTlNVUkwuVVJMV2l0aFN0cmluZyh4bWxVcmxTdHJpbmcpO1xuICAgIGNvbnN0IGRhdFVybCA9IHhtbFVybC5VUkxCeURlbGV0aW5nUGF0aEV4dGVuc2lvbi5VUkxCeUFwcGVuZGluZ1BhdGhFeHRlbnNpb24oXCJkYXRcIik7XG4gICAgXG4gICAgY29uc3QgZGlyZWN0b3J5UGF0aFVybCA9IHhtbFVybC5VUkxCeURlbGV0aW5nTGFzdFBhdGhDb21wb25lbnQ7XG4gICAgY29uc3QgZGlyZWN0b3J5SGFzaCA9IGRpcmVjdG9yeVBhdGhVcmwuaGFzaDtcbiAgICBjb25zdCB0bXBQYXRoID0gZmlsZS5rbm93bkZvbGRlcnMudGVtcCgpLnBhdGg7XG4gICAgY29uc3QgZGlyZWN0b3J5SGFzaFBhdGggPSB0bXBQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGRpcmVjdG9yeUhhc2g7XG4gICAgXG4gICAgZmlsZS5Gb2xkZXIuZnJvbVBhdGgoZGlyZWN0b3J5SGFzaFBhdGgpO1xuICAgIFxuICAgIGNvbnN0IHhtbERlc3RQYXRoID0gZGlyZWN0b3J5SGFzaFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgeG1sVXJsLmxhc3RQYXRoQ29tcG9uZW50O1xuICAgIGNvbnN0IGRhdERlc3RQYXRoID0gZGlyZWN0b3J5SGFzaFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZGF0VXJsLmxhc3RQYXRoQ29tcG9uZW50O1xuICAgICovXG5cbiAgICBjb25zdCBkaXJlY3RvcnlQYXRoID0geG1sVXJsU3RyaW5nLnN1YnN0cmluZygwLCB4bWxVcmxTdHJpbmcubGFzdEluZGV4T2YoXCIvXCIpKTtcbiAgICBjb25zdCBmaWxlbmFtZSA9IHhtbFVybFN0cmluZy5zdWJzdHJpbmcoeG1sVXJsU3RyaW5nLmxhc3RJbmRleE9mKFwiL1wiKSArIDEpO1xuICAgIGNvbnN0IGZpbGVuYW1lV2l0aG91dEV4dCA9IGZpbGVuYW1lLnN1YnN0cmluZygwLCBmaWxlbmFtZS5sYXN0SW5kZXhPZihcIi5cIikpO1xuXG4gICAgY29uc3QgZGF0VXJsU3RyaW5nID0gZGlyZWN0b3J5UGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBmaWxlbmFtZVdpdGhvdXRFeHQgKyBcIi5kYXRcIjtcblxuICAgIGNvbnN0IGRpcmVjdG9yeUhhc2ggPSBoYXNoQ29kZShkaXJlY3RvcnlQYXRoKTtcbiAgICBjb25zdCB0bXBQYXRoID0gZmlsZS5rbm93bkZvbGRlcnMudGVtcCgpLnBhdGg7XG4gICAgY29uc3QgZGlyZWN0b3J5SGFzaFBhdGggPSB0bXBQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGRpcmVjdG9yeUhhc2g7XG5cbiAgICBmaWxlLkZvbGRlci5mcm9tUGF0aChkaXJlY3RvcnlIYXNoUGF0aCk7XG4gICAgXG4gICAgY29uc3QgeG1sRGVzdFBhdGggPSBkaXJlY3RvcnlIYXNoUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBmaWxlbmFtZTtcbiAgICBjb25zdCBkYXREZXN0UGF0aCA9IGRpcmVjdG9yeUhhc2hQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGZpbGVuYW1lV2l0aG91dEV4dCArIFwiLmRhdFwiO1xuXG4gICAgZnVuY3Rpb24gaGFzaENvZGUoczpzdHJpbmcpIHtcbiAgICAgICAgdmFyIGhhc2ggPSAwLCBpLCBjaHIsIGxlbjtcbiAgICAgICAgaWYgKHMubGVuZ3RoID09PSAwKSByZXR1cm4gaGFzaDtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgY2hyICAgPSBzLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBoYXNoICA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgY2hyO1xuICAgICAgICAgICAgaGFzaCB8PSAwOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaGFzaDtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gZG93bmxvYWRJZk5lZWRlZCh1cmw6c3RyaW5nLCBkZXN0UGF0aDpzdHJpbmcpIHtcbiAgICAgICAgbGV0IGxhc3RNb2RpZmllZDpEYXRlfHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGZpbGUuRmlsZS5leGlzdHMoZGVzdFBhdGgpKSB7XG4gICAgICAgICAgICBjb25zdCBmID0gZmlsZS5GaWxlLmZyb21QYXRoKGRlc3RQYXRoKTtcbiAgICAgICAgICAgIGxhc3RNb2RpZmllZCA9IGYubGFzdE1vZGlmaWVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBodHRwLnJlcXVlc3Qoe1xuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgbWV0aG9kOidHRVQnLFxuICAgICAgICAgICAgaGVhZGVyczogbGFzdE1vZGlmaWVkID8ge1xuICAgICAgICAgICAgICAgICdJZi1Nb2RpZmllZC1TaW5jZSc6IGxhc3RNb2RpZmllZC50b1VUQ1N0cmluZygpXG4gICAgICAgICAgICB9IDogdW5kZWZpbmVkXG4gICAgICAgIH0pLnRoZW4oKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDMwNCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBWZXJpZmllZCB0aGF0IGNhY2hlZCB2ZXJzaW9uIG9mIGZpbGUgJHt1cmx9IGF0ICR7ZGVzdFBhdGh9IGlzIHVwLXRvLWRhdGUuYClcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdFBhdGg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLmNvbnRlbnQgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDMwMCkgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRlZCBmaWxlICR7dXJsfSB0byAke2Rlc3RQYXRofWApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmNvbnRlbnQudG9GaWxlKGRlc3RQYXRoKS5wYXRoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gZG93bmxvYWQgZmlsZSBcIiArIHVybCArIFwiICAoSFRUUCBzdGF0dXMgY29kZTogXCIgKyByZXNwb25zZS5zdGF0dXNDb2RlICsgXCIpXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBkb3dubG9hZElmTmVlZGVkKHhtbFVybFN0cmluZyx4bWxEZXN0UGF0aCksIFxuICAgICAgICBkb3dubG9hZElmTmVlZGVkKGRhdFVybFN0cmluZyxkYXREZXN0UGF0aClcbiAgICBdKS50aGVuKCgpPT54bWxEZXN0UGF0aCk7XG59ICJdfQ==