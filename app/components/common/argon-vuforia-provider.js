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
exports.DEBUG_DEVELOPMENT_LICENSE_KEY = undefined; // 'your_license_key';
var DEBUG_DISABLE_ORIGIN_CHECK = true;
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
            var currentScreenOrientationRadians = util_1.getScreenOrientation() * CesiumMath.RADIANS_PER_DEGREE;
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
        if (exports.DEBUG_DEVELOPMENT_LICENSE_KEY)
            options.key = exports.DEBUG_DEVELOPMENT_LICENSE_KEY;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tdnVmb3JpYS1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXZ1Zm9yaWEtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxzQ0FBd0M7QUFDeEMsOENBQWdEO0FBQ2hELDJCQUE2QjtBQUM3QixrQ0FBb0M7QUFDcEMsbUNBQXFDO0FBQ3JDLDhEQUEwRDtBQUMxRCwrQkFBb0Q7QUFDcEQscUNBQXNDO0FBQ3RDLDJCQUE0QjtBQUVmLFFBQUEsNkJBQTZCLEdBQW9CLFNBQVMsQ0FBQyxDQUFDLHNCQUFzQjtBQUMvRixJQUFNLDBCQUEwQixHQUFXLElBQUksQ0FBQztBQUVuQyxRQUFBLHVCQUF1QixHQUE0QixPQUFPLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO0FBQ3hHLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNmLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBSSxDQUFDLGtCQUFrQjtRQUM5QywrQkFBdUIsS0FBZ0MsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWE7WUFDN0YsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztBQUM3QyxDQUFDO0FBRVksUUFBQSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEdBQUMsRUFBRSxDQUFDO0FBRW5DLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3JDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzNDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBRTND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QUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNsRCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxHQUFHLEdBQUcsdUJBQXVCLEdBQUcsUUFBUSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUM1RyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDZixnQkFBZ0IsQ0FBQyxZQUFZLEVBQUMsV0FBVyxDQUFDO1FBQzFDLGdCQUFnQixDQUFDLFlBQVksRUFBQyxXQUFXLENBQUM7S0FDN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFJLE9BQUEsV0FBVyxFQUFYLENBQVcsQ0FBQyxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGZpbGUgZnJvbSAnZmlsZS1zeXN0ZW0nO1xuaW1wb3J0ICogYXMgcGxhdGZvcm0gZnJvbSAncGxhdGZvcm0nO1xuaW1wb3J0IHtBYnNvbHV0ZUxheW91dH0gZnJvbSAndWkvbGF5b3V0cy9hYnNvbHV0ZS1sYXlvdXQnO1xuaW1wb3J0IHtkZWNyeXB0LCBnZXRTY3JlZW5PcmllbnRhdGlvbn0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0ICogYXMgbWluaW1hdGNoIGZyb20gJ21pbmltYXRjaCdcbmltcG9ydCAqIGFzIFVSSSBmcm9tICd1cmlqcydcblxuZXhwb3J0IGNvbnN0IERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZOnN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7IC8vICd5b3VyX2xpY2Vuc2Vfa2V5JztcbmNvbnN0IERFQlVHX0RJU0FCTEVfT1JJR0lOX0NIRUNLOmJvb2xlYW4gPSB0cnVlO1xuXG5leHBvcnQgY29uc3QgdnVmb3JpYUNhbWVyYURldmljZU1vZGU6dnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlID0gdnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlLk9waW1pemVRdWFsaXR5O1xuaWYgKHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcykge1xuICAgICg8VUlWaWV3PnZ1Zm9yaWEudmlkZW9WaWV3LmlvcykuY29udGVudFNjYWxlRmFjdG9yID0gXG4gICAgICAgIHZ1Zm9yaWFDYW1lcmFEZXZpY2VNb2RlID09PSA8dnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlPiB2dWZvcmlhLkNhbWVyYURldmljZU1vZGUuT3B0aW1pemVTcGVlZCA/IFxuICAgICAgICAxIDogcGxhdGZvcm0uc2NyZWVuLm1haW5TY3JlZW4uc2NhbGU7XG59XG5cbmV4cG9ydCBjb25zdCBWSURFT19ERUxBWSA9IC0wLjUvNjA7XG5cbmNvbnN0IE1hdHJpeDQgPSBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbmNvbnN0IENhcnRlc2lhbjMgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbmNvbnN0IFF1YXRlcm5pb24gPSBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcbmNvbnN0IEp1bGlhbkRhdGUgPSBBcmdvbi5DZXNpdW0uSnVsaWFuRGF0ZTtcbmNvbnN0IENlc2l1bU1hdGggPSBBcmdvbi5DZXNpdW0uQ2VzaXVtTWF0aDtcblxuY29uc3QgeDE4MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWCwgQ2VzaXVtTWF0aC5QSSk7XG5cbmNsYXNzIFZ1Zm9yaWFTZXNzaW9uRGF0YSB7XG4gICAgY29tbWFuZFF1ZXVlID0gbmV3IEFyZ29uLkNvbW1hbmRRdWV1ZTtcbiAgICBpbml0UmVzdWx0UmVzb2x2ZXI/OihyZXN1bHQ6dnVmb3JpYS5Jbml0UmVzdWx0KT0+dm9pZDtcbiAgICBsb2FkZWREYXRhU2V0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGFjdGl2YXRlZERhdGFTZXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZGF0YVNldFVyaUJ5SWQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGRhdGFTZXRJZEJ5VXJpID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBkYXRhU2V0SW5zdGFuY2VCeUlkID0gbmV3IE1hcDxzdHJpbmcsIHZ1Zm9yaWEuRGF0YVNldD4oKTtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMga2V5UHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+KSB7fVxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIge1xuXG4gICAgcHVibGljIHN0YXRlVXBkYXRlRXZlbnQgPSBuZXcgQXJnb24uRXZlbnQ8QXJnb24uQ2VzaXVtLkp1bGlhbkRhdGU+KCk7XG4gICAgXG4gICAgcHVibGljIHZ1Zm9yaWFUcmFja2VyRW50aXR5ID0gbmV3IEFyZ29uLkNlc2l1bS5FbnRpdHkoe1xuICAgICAgICBwb3NpdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoQ2FydGVzaWFuMy5aRVJPLCB0aGlzLmNvbnRleHRTZXJ2aWNlLnVzZXIpLFxuICAgICAgICBvcmllbnRhdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KFF1YXRlcm5pb24uSURFTlRJVFkpXG4gICAgfSk7XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoQ2FydGVzaWFuID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zKCk7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFF1YXRlcm5pb24gPSBuZXcgQXJnb24uQ2VzaXVtLlF1YXRlcm5pb24oKTtcblx0cHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDMgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDMoKTtcblxuICAgIHByaXZhdGUgX2NvbnRyb2xsaW5nU2Vzc2lvbj86IEFyZ29uLlNlc3Npb25Qb3J0O1xuICAgIHByaXZhdGUgX3Nlc3Npb25Td2l0Y2hlckNvbW1hbmRRdWV1ZSA9IG5ldyBBcmdvbi5Db21tYW5kUXVldWUoKTtcblxuICAgIHByaXZhdGUgX3Nlc3Npb25EYXRhID0gbmV3IFdlYWtNYXA8QXJnb24uU2Vzc2lvblBvcnQsVnVmb3JpYVNlc3Npb25EYXRhPigpO1xuICAgIFxuXHRjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHByaXZhdGUgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsXG4gICAgICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSxcbiAgICAgICAgICAgIC8vIHByaXZhdGUgZGV2aWNlU2VydmljZTpBcmdvbi5EZXZpY2VTZXJ2aWNlLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZVByb3ZpZGVyOkFyZ29uLkNvbnRleHRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuXG4gICAgICAgIC8vIHRoaXMuc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgLy8gICAgIHRoaXMuc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgIC8vICAgICAgICAgY29uc3QgcmVhbGl0eSA9IHRoaXMuY29udGV4dFNlcnZpY2Uuc2VyaWFsaXplZEZyYW1lU3RhdGUucmVhbGl0eTtcbiAgICAgICAgLy8gICAgICAgICBpZiAocmVhbGl0eSA9PT0gQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFKSB0aGlzLmRldmljZVNlcnZpY2UudXBkYXRlKCk7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy8gICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgLy8gICAgICAgICBjb25zdCByZWFsaXR5ID0gdGhpcy5jb250ZXh0U2VydmljZS5zZXJpYWxpemVkRnJhbWVTdGF0ZS5yZWFsaXR5O1xuICAgICAgICAvLyAgICAgICAgIGlmIChyZWFsaXR5ICE9PSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkUpIHRoaXMuZGV2aWNlU2VydmljZS51cGRhdGUoKTtcbiAgICAgICAgLy8gICAgIH0sIDYwKVxuICAgICAgICAvLyB9KVxuICAgICAgICBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHNlc3Npb24pPT57XG4gICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5pc0F2YWlsYWJsZSddID0gXG4gICAgICAgICAgICAgICAgICAgICgpID0+IFByb21pc2UucmVzb2x2ZSh7YXZhaWxhYmxlOiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEuaW5pdCddID0gXG4gICAgICAgICAgICAgICAgICAgIChpbml0T3B0aW9ucykgPT4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVnVmb3JpYSBpcyBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm1cIikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmlzQXZhaWxhYmxlJ10gPSBcbiAgICAgICAgICAgICAgICAgICAgKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHthdmFpbGFibGU6ICEhdnVmb3JpYS5hcGl9KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmluaXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICBpbml0T3B0aW9ucyA9PiB0aGlzLl9oYW5kbGVJbml0KHNlc3Npb24sIGluaXRPcHRpb25zKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0J10gPSBcbiAgICAgICAgICAgICAgICAgICAgKHt1cmx9Ont1cmw6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckNyZWF0ZURhdGFTZXQoc2Vzc2lvbiwgdXJsKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJMb2FkRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdGFiaWxpdHlcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRGZXRjaCddID0gc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyTG9hZERhdGFTZXQnXTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRMb2FkJ10gPSAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpID0+IHRoaXMuX2hhbmRsZUNsb3NlKHNlc3Npb24pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gLy8gc3dpdGNoIHRvIEFSIG1vZGUgd2hlbiBMSVZFIHJlYWxpdHkgaXMgcHJlc2VudGluZ1xuICAgICAgICAvLyByZWFsaXR5U2VydmljZS5jaGFuZ2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7Y3VycmVudH0pPT57XG4gICAgICAgIC8vICAgICB0aGlzLl9zZXREZXZpY2VNb2RlKFxuICAgICAgICAvLyAgICAgICAgIGN1cnJlbnQgPT09IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRSA/IFxuICAgICAgICAvLyAgICAgICAgICAgICB2dWZvcmlhLkRldmljZU1vZGUuQVIgOiB2dWZvcmlhLkRldmljZU1vZGUuVlJcbiAgICAgICAgLy8gICAgICk7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbGFuZHNjYXBlUmlnaHRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgPSAtQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTztcblxuICAgICAgICBjb25zdCBzdGF0ZVVwZGF0ZUNhbGxiYWNrID0gKHN0YXRlOnZ1Zm9yaWEuU3RhdGUpID0+IHsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRpbWUgPSBKdWxpYW5EYXRlLm5vdygpO1xuICAgICAgICAgICAgLy8gc3VidHJhY3QgYSBmZXcgbXMsIHNpbmNlIHRoZSB2aWRlbyBmcmFtZSByZXByZXNlbnRzIGEgdGltZSBzbGlnaHRseSBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgIC8vIFRPRE86IGlmIHdlIGFyZSB1c2luZyBhbiBvcHRpY2FsIHNlZS10aHJvdWdoIGRpc3BsYXksIGxpa2UgaG9sb2xlbnMsXG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRvIGRvIHRoZSBvcHBvc2l0ZSwgYW5kIGRvIGZvcndhcmQgcHJlZGljdGlvbiAodGhvdWdoIGlkZWFsbHkgbm90IGhlcmUsIFxuICAgICAgICAgICAgLy8gYnV0IGluIGVhY2ggYXBwIGl0c2VsZiB0byB3ZSBhcmUgYXMgY2xvc2UgYXMgcG9zc2libGUgdG8gdGhlIGFjdHVhbCByZW5kZXIgdGltZSB3aGVuXG4gICAgICAgICAgICAvLyB3ZSBzdGFydCB0aGUgcmVuZGVyKVxuICAgICAgICAgICAgSnVsaWFuRGF0ZS5hZGRTZWNvbmRzKHRpbWUsIFZJREVPX0RFTEFZLCB0aW1lKTtcblxuICAgICAgICAgICAgLy8gUm90YXRlIHRoZSB0cmFja2VyIHRvIGEgbGFuZHNjYXBlLXJpZ2h0IGZyYW1lLCBcbiAgICAgICAgICAgIC8vIHdoZXJlICtYIGlzIHJpZ2h0LCArWSBpcyBkb3duLCBhbmQgK1ogaXMgaW4gdGhlIGNhbWVyYSBkaXJlY3Rpb25cbiAgICAgICAgICAgIC8vICh2dWZvcmlhIHJlcG9ydHMgcG9zZXMgaW4gdGhpcyBmcmFtZSBvbiBpT1MgZGV2aWNlcywgbm90IHN1cmUgYWJvdXQgYW5kcm9pZClcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgPSBnZXRTY3JlZW5PcmllbnRhdGlvbigpICogQ2VzaXVtTWF0aC5SQURJQU5TX1BFUl9ERUdSRUU7XG4gICAgICAgICAgICBjb25zdCB0cmFja2VyT3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLm11bHRpcGx5KFxuICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgbGFuZHNjYXBlUmlnaHRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgLSBjdXJyZW50U2NyZWVuT3JpZW50YXRpb25SYWRpYW5zLCB0aGlzLl9zY3JhdGNoUXVhdGVybmlvbiksXG4gICAgICAgICAgICAgICAgeDE4MCxcbiAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoUXVhdGVybmlvbik7XG4gICAgICAgICAgICAodGhpcy52dWZvcmlhVHJhY2tlckVudGl0eS5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUodHJhY2tlck9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdnVmb3JpYUZyYW1lID0gc3RhdGUuZ2V0RnJhbWUoKTtcbiAgICAgICAgICAgIGNvbnN0IGZyYW1lVGltZVN0YW1wID0gdnVmb3JpYUZyYW1lLmdldFRpbWVTdGFtcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB1cGRhdGUgdHJhY2thYmxlIHJlc3VsdHMgaW4gY29udGV4dCBlbnRpdHkgY29sbGVjdGlvblxuICAgICAgICAgICAgY29uc3QgbnVtVHJhY2thYmxlUmVzdWx0cyA9IHN0YXRlLmdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTtcbiAgICAgICAgICAgIGZvciAobGV0IGk9MDsgaSA8IG51bVRyYWNrYWJsZVJlc3VsdHM7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZVJlc3VsdCA9IDx2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdD5zdGF0ZS5nZXRUcmFja2FibGVSZXN1bHQoaSk7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdHJhY2thYmxlUmVzdWx0LmdldFRyYWNrYWJsZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSB0cmFja2FibGUuZ2V0TmFtZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy5fZ2V0SWRGb3JUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gY29udGV4dFNlcnZpY2UuZW50aXRpZXMuZ2V0QnlJZChpZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5ID0gbmV3IEFyZ29uLkNlc2l1bS5FbnRpdHkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHkodGhpcy52dWZvcmlhVHJhY2tlckVudGl0eSksXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmllbnRhdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5TYW1wbGVkUHJvcGVydHkoQXJnb24uQ2VzaXVtLlF1YXRlcm5pb24pXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpdHlQb3NpdGlvbiA9IGVudGl0eS5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGl0eU9yaWVudGF0aW9uID0gZW50aXR5Lm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eVBvc2l0aW9uLm1heE51bVNhbXBsZXMgPSAxMDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5T3JpZW50YXRpb24ubWF4TnVtU2FtcGxlcyA9IDEwO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlQb3NpdGlvbi5mb3J3YXJkRXh0cmFwb2xhdGlvblR5cGUgPSBBcmdvbi5DZXNpdW0uRXh0cmFwb2xhdGlvblR5cGUuSE9MRDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5T3JpZW50YXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25UeXBlID0gQXJnb24uQ2VzaXVtLkV4dHJhcG9sYXRpb25UeXBlLkhPTEQ7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eVBvc2l0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uRHVyYXRpb24gPSAxMC82MDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5T3JpZW50YXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25EdXJhdGlvbiA9IDEwLzYwO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0U2VydmljZS5lbnRpdGllcy5hZGQoZW50aXR5KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0U2VydmljZVByb3ZpZGVyLnB1Ymxpc2hpbmdSZWZlcmVuY2VGcmFtZU1hcC5zZXQoaWQsIHRoaXMuY29udGV4dFNlcnZpY2UudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZVRpbWUgPSBKdWxpYW5EYXRlLmNsb25lKHRpbWUpOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBhZGQgYW55IHRpbWUgZGlmZiBmcm9tIHZ1Zm9yaWFcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVUaW1lRGlmZiA9IHRyYWNrYWJsZVJlc3VsdC5nZXRUaW1lU3RhbXAoKSAtIGZyYW1lVGltZVN0YW1wO1xuICAgICAgICAgICAgICAgIGlmICh0cmFja2FibGVUaW1lRGlmZiAhPT0gMCkgSnVsaWFuRGF0ZS5hZGRTZWNvbmRzKHRpbWUsIHRyYWNrYWJsZVRpbWVEaWZmLCB0cmFja2FibGVUaW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NlID0gPEFyZ29uLkNlc2l1bS5NYXRyaXg0Pjxhbnk+dHJhY2thYmxlUmVzdWx0LmdldFBvc2UoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IE1hdHJpeDQuZ2V0VHJhbnNsYXRpb24ocG9zZSwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbik7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmdldFJvdGF0aW9uKHBvc2UsIHRoaXMuX3NjcmF0Y2hNYXRyaXgzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IFF1YXRlcm5pb24uZnJvbVJvdGF0aW9uTWF0cml4KHJvdGF0aW9uTWF0cml4LCB0aGlzLl9zY3JhdGNoUXVhdGVybmlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgKGVudGl0eS5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHkpLmFkZFNhbXBsZSh0cmFja2FibGVUaW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgKGVudGl0eS5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFByb3BlcnR5KS5hZGRTYW1wbGUodHJhY2thYmxlVGltZSwgb3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVVcGRhdGVFdmVudC5yYWlzZUV2ZW50KHRpbWUpO1xuICAgICAgICAgICAgLy8gfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcy5zZXNzaW9uU2VydmljZS5lcnJvckV2ZW50LnJhaXNlRXZlbnQoZSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB2dWZvcmlhLmFwaS5zZXRTdGF0ZVVwZGF0ZUNhbGxiYWNrKHN0YXRlVXBkYXRlQ2FsbGJhY2spO1xuXHR9XG4gICAgICAgIFxuICAgIC8vIHByaXZhdGUgX2RldmljZU1vZGUgPSB2dWZvcmlhLkRldmljZU1vZGUuVlI7XG4gICAgLy8gcHJpdmF0ZSBfc2V0RGV2aWNlTW9kZShkZXZpY2VNb2RlOiB2dWZvcmlhLkRldmljZU1vZGUpIHtcbiAgICAvLyAgICAgdGhpcy5fZGV2aWNlTW9kZSA9IGRldmljZU1vZGU7XG4gICAgLy8gICAgIC8vIGZvbGxvd2luZyBtYXkgZmFpbCAocmV0dXJuIGZhbHNlKSBpZiB2dWZvcmlhIGlzIG5vdCBjdXJyZW50bHkgaW5pdGlhbGl6ZWQsIFxuICAgIC8vICAgICAvLyBidXQgdGhhdCdzIG9rYXkgKHNpbmNlIG5leHQgdGltZSB3ZSBpbml0aWxhaXplIHdlIHdpbGwgdXNlIHRoZSBzYXZlZCBtb2RlKS4gXG4gICAgLy8gICAgIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpLnNldE1vZGUoZGV2aWNlTW9kZSk7IFxuICAgIC8vIH0gXG5cbiAgICBwcml2YXRlIF9nZXRTZXNzaW9uRGF0YShzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fc2Vzc2lvbkRhdGEuZ2V0KHNlc3Npb24pO1xuICAgICAgICBpZiAoIXNlc3Npb25EYXRhKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWEgbXVzdCBiZSBpbml0aWFsaXplZCBmaXJzdCcpXG4gICAgICAgIHJldHVybiBzZXNzaW9uRGF0YTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9zZXNzaW9uRGF0YS5nZXQoc2Vzc2lvbikhO1xuICAgICAgICBpZiAoIXNlc3Npb25EYXRhLmNvbW1hbmRRdWV1ZSkgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhIG11c3QgYmUgaW5pdGlhbGl6ZWQgZmlyc3QnKVxuICAgICAgICByZXR1cm4gc2Vzc2lvbkRhdGEuY29tbWFuZFF1ZXVlO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zZWxlY3RDb250cm9sbGluZ1Nlc3Npb24oKSB7XG4gICAgICAgIGNvbnN0IGZvY3VzU2Vzc2lvbiA9IHRoaXMuZm9jdXNTZXJ2aWNlUHJvdmlkZXIuc2Vzc2lvbjtcblxuICAgICAgICBpZiAoZm9jdXNTZXNzaW9uICYmIFxuICAgICAgICAgICAgZm9jdXNTZXNzaW9uLmlzQ29ubmVjdGVkICYmIFxuICAgICAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuaGFzKGZvY3VzU2Vzc2lvbikpIHtcbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbihmb2N1c1Nlc3Npb24pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiAmJiBcbiAgICAgICAgICAgIHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbi5pc0Nvbm5lY3RlZCAmJlxuICAgICAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuaGFzKHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbikpIFxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIHBpY2sgYSBkaWZmZXJlbnQgc2Vzc2lvbiBhcyB0aGUgY29udHJvbGxpbmcgc2Vzc2lvblxuICAgICAgICAvLyBUT0RPOiBwcmlvcml0aXplIGFueSBzZXNzaW9ucyBvdGhlciB0aGFuIHRoZSBmb2N1c3NlZCBzZXNzaW9uP1xuICAgICAgICBmb3IgKGNvbnN0IHNlc3Npb24gb2YgdGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VkU2Vzc2lvbnMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zZXNzaW9uRGF0YS5oYXMoc2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRDb250cm9sbGluZ1Nlc3Npb24oc2Vzc2lvbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgbm8gb3RoZXIgc2Vzc2lvbiBpcyBhdmFpbGFibGUsXG4gICAgICAgIC8vIGZhbGxiYWNrIHRvIHRoZSBtYW5hZ2VyIGFzIHRoZSBjb250cm9sbGluZyBzZXNzaW9uXG4gICAgICAgIGlmICh0aGlzLl9zZXNzaW9uRGF0YS5oYXModGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKSlcbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbih0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3NldENvbnRyb2xsaW5nU2Vzc2lvbihzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID09PSBzZXNzaW9uKSByZXR1cm47XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJWdWZvcmlhU2VydmljZTogU2V0dGluZyBjb250cm9sbGluZyBzZXNzaW9uIHRvIFwiICsgc2Vzc2lvbi51cmkpXG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbikge1xuICAgICAgICAgICAgY29uc3QgcHJldmlvdXNTZXNzaW9uID0gdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uO1xuICAgICAgICAgICAgdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fc2Vzc2lvblN3aXRjaGVyQ29tbWFuZFF1ZXVlLnB1c2goKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZVNlc3Npb24ocHJldmlvdXNTZXNzaW9uKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICB0aGlzLl9zZXNzaW9uU3dpdGNoZXJDb21tYW5kUXVldWUucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVzdW1lU2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgfSwgdHJ1ZSkuY2F0Y2goKCk9PntcbiAgICAgICAgICAgIHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbih0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9wYXVzZVNlc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogUGF1c2luZyBzZXNzaW9uICcgKyBzZXNzaW9uLnVyaSArICcuLi4nKTtcblxuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBjb21tYW5kUXVldWUgPSBzZXNzaW9uRGF0YS5jb21tYW5kUXVldWU7XG5cbiAgICAgICAgcmV0dXJuIGNvbW1hbmRRdWV1ZS5wdXNoKCgpID0+IHtcbiAgICAgICAgICAgIGNvbW1hbmRRdWV1ZS5wYXVzZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB0aGUgc2Vzc2lvbiBpcyBjbG9zZWQsIHdlIHNldCB0aGUgcGVybWFuZW50IGZsYWcgdG8gdHJ1ZS5cbiAgICAgICAgICAgIC8vIExpa2V3aXNlLCBpZiB0aGUgc2Vzc2lvbiBpcyBub3QgY2xvc2VkLCB3ZSBzZXQgdGhlIHBlcm1hbmVudCBmbGF0IHRvIGZhbHNlLFxuICAgICAgICAgICAgLy8gbWFpbnRhaW5pbmcgdGhlIGN1cnJlbnQgc2Vzc2lvbiBzdGF0ZS5cbiAgICAgICAgICAgIGNvbnN0IHBlcm1hbmVudCA9IHNlc3Npb24uaXNDbG9zZWQ7XG5cbiAgICAgICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikgb2JqZWN0VHJhY2tlci5zdG9wKCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEuYWN0aXZhdGVkRGF0YVNldHM7XG4gICAgICAgICAgICBpZiAoYWN0aXZhdGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICBhY3RpdmF0ZWREYXRhU2V0cy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQsIHBlcm1hbmVudCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGxvYWRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEubG9hZGVkRGF0YVNldHM7XG4gICAgICAgICAgICBpZiAobG9hZGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWREYXRhU2V0cy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldChzZXNzaW9uLCBpZCwgcGVybWFuZW50KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IGRlaW5pdGlhbGl6aW5nLi4uJyk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdG9wKCk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5kZWluaXQoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmRlaW5pdE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmRlaW5pdCgpO1xuXG4gICAgICAgICAgICBpZiAocGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuZGVsZXRlKHNlc3Npb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfcmVzdW1lU2Vzc2lvbihzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBjb21tYW5kUXVldWUgPSB0aGlzLl9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBSZXN1bWluZyBzZXNzaW9uICcgKyBzZXNzaW9uLnVyaSArICcuLi4nKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5faW5pdChzZXNzaW9uKS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb21tYW5kUXVldWUuZXhlY3V0ZSgpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2luaXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkgOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcbiAgICAgICAgY29uc3Qga2V5UHJvbWlzZSA9IHNlc3Npb25EYXRhLmtleVByb21pc2U7XG4gICAgICAgIGlmICgha2V5UHJvbWlzZSkgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhOiBJbnZhbGlkIFN0YXRlLiBNaXNzaW5nIEtleS4nKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXlQcm9taXNlLnRoZW48dm9pZD4oIGtleSA9PiB7XG5cbiAgICAgICAgICAgIGlmICghdnVmb3JpYS5hcGkuc2V0TGljZW5zZUtleShrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignVnVmb3JpYTogVW5hYmxlIHRvIHNldCB0aGUgbGljZW5zZSBrZXknKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBpbml0aWFsaXppbmcuLi4nKTtcblxuICAgICAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuYXBpLmluaXQoKS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IEluaXQgUmVzdWx0OiAnICsgcmVzdWx0KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVJbml0UmVzdWx0ID0gc2Vzc2lvbkRhdGEuaW5pdFJlc3VsdFJlc29sdmVyO1xuICAgICAgICAgICAgICAgIGlmIChyZXNvbHZlSW5pdFJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlSW5pdFJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5pbml0UmVzdWx0UmVzb2x2ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdnVmb3JpYS5Jbml0UmVzdWx0LlNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHZ1Zm9yaWEuSW5pdFJlc3VsdFtyZXN1bHRdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgLy8gbXVzdCBpbml0aWFsaXplIHRyYWNrZXJzIGJlZm9yZSBpbml0aWFsaXppbmcgdGhlIGNhbWVyYSBkZXZpY2VcbiAgICAgICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLmluaXRPYmplY3RUcmFja2VyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVnVmb3JpYTogVW5hYmxlIHRvIGluaXRpYWxpemUgT2JqZWN0VHJhY2tlclwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjYW1lcmFEZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYTogaW5pdGlhbGl6aW5nIGNhbWVyYSBkZXZpY2UuLi5cIik7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWNhbWVyYURldmljZS5pbml0KHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uLkRlZmF1bHQpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBpbml0aWFsaXplIGNhbWVyYSBkZXZpY2UnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFjYW1lcmFEZXZpY2Uuc2VsZWN0VmlkZW9Nb2RlKHZ1Zm9yaWFDYW1lcmFEZXZpY2VNb2RlKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gc2VsZWN0IHZpZGVvIG1vZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaS5nZXREZXZpY2UoKS5zZXRNb2RlKHZ1Zm9yaWEuRGV2aWNlTW9kZS5BUikpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNldCBkZXZpY2UgbW9kZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIHRoaXMuY29uZmlndXJlVnVmb3JpYVZpZGVvQmFja2dyb3VuZCh7XG4gICAgICAgICAgICAgICAgLy8gICAgIHg6MCxcbiAgICAgICAgICAgICAgICAvLyAgICAgeTowLFxuICAgICAgICAgICAgICAgIC8vICAgICB3aWR0aDp2dWZvcmlhLnZpZGVvVmlldy5nZXRBY3R1YWxTaXplKCkud2lkdGgsIC8vZ2V0TWVhc3VyZWRXaWR0aCgpLCBcbiAgICAgICAgICAgICAgICAvLyAgICAgaGVpZ2h0OnZ1Zm9yaWEudmlkZW9WaWV3LmdldEFjdHVhbFNpemUoKS5oZWlnaHQgLy9nZXRNZWFzdXJlZEhlaWdodCgpXG4gICAgICAgICAgICAgICAgLy8gfSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpLnN0YXJ0KCkpIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzdGFydCBjYW1lcmEnKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEubG9hZGVkRGF0YVNldHM7XG4gICAgICAgICAgICAgICAgY29uc3QgbG9hZFByb21pc2VzOlByb21pc2U8YW55PltdID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGxvYWRlZERhdGFTZXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRlZERhdGFTZXRzLmZvckVhY2goKGlkKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZFByb21pc2VzLnB1c2godGhpcy5fb2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsb2FkUHJvbWlzZXMpO1xuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEuYWN0aXZhdGVkRGF0YVNldHM7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRlUHJvbWlzZXM6UHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZhdGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVkRGF0YVNldHMuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlUHJvbWlzZXMucHVzaCh0aGlzLl9vYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0aXZhdGVQcm9taXNlcztcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICAgICAgICAgIGlmICghb2JqZWN0VHJhY2tlcikgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhOiBVbmFibGUgdG8gZ2V0IG9iamVjdFRyYWNrZXIgaW5zdGFuY2UnKTtcbiAgICAgICAgICAgICAgICBvYmplY3RUcmFja2VyLnN0YXJ0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVJbml0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIG9wdGlvbnM6e2VuY3J5cHRlZExpY2Vuc2VEYXRhPzpzdHJpbmcsIGtleT86c3RyaW5nfSkge1xuICAgICAgICBpZiAoIW9wdGlvbnMua2V5ICYmICFvcHRpb25zLmVuY3J5cHRlZExpY2Vuc2VEYXRhKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBsaWNlbnNlIGtleSB3YXMgcHJvdmlkZWQuIEdldCBvbmUgZnJvbSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS8nKTtcblxuICAgICAgICBpZiAodGhpcy5fc2Vzc2lvbkRhdGEuaGFzKHNlc3Npb24pKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbHJlYWR5IGluaXRpYWxpemVkJyk7XG5cbiAgICAgICAgaWYgKERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZKSBvcHRpb25zLmtleSA9IERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZO1xuXG4gICAgICAgIGNvbnN0IGtleVByb21pc2UgPSBvcHRpb25zLmtleSA/IFxuICAgICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKG9wdGlvbnMua2V5KSA6IFxuICAgICAgICAgICAgdGhpcy5fZGVjcnlwdExpY2Vuc2VLZXkob3B0aW9ucy5lbmNyeXB0ZWRMaWNlbnNlRGF0YSEsIHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gbmV3IFZ1Zm9yaWFTZXNzaW9uRGF0YShrZXlQcm9taXNlKTtcbiAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuc2V0KHNlc3Npb24sIHNlc3Npb25EYXRhKTtcblxuICAgICAgICBjb25zdCBpbml0UmVzdWx0ID0gbmV3IFByb21pc2UoKHJlc29sdmUpPT57XG4gICAgICAgICAgICBzZXNzaW9uRGF0YS5pbml0UmVzdWx0UmVzb2x2ZXIgPSByZXNvbHZlO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZWxlY3RDb250cm9sbGluZ1Nlc3Npb24oKTtcblxuICAgICAgICByZXR1cm4gaW5pdFJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVDbG9zZShzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGlmICh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPT09IHNlc3Npb24pIHtcbiAgICAgICAgICAgIHRoaXMuX3NlbGVjdENvbnRyb2xsaW5nU2Vzc2lvbigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIHVyaTpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIGZldGNoRGF0YVNldCh1cmkpLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgICAgICBsZXQgaWQgPSBzZXNzaW9uRGF0YS5kYXRhU2V0SWRCeVVyaS5nZXQodXJpKTtcbiAgICAgICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgICAgICBpZCA9IEFyZ29uLkNlc2l1bS5jcmVhdGVHdWlkKCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuc2V0KHVyaSwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLnNldChpZCwgdXJpKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICByZXR1cm4ge2lkfTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDogc3RyaW5nKTogUHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4ge1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnN0IHVyaSA9IHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmdldChpZCk7XG4gICAgICAgIGlmICghdXJpKSB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IFVua25vd24gRGF0YVNldCBpZDogJHtpZH1gKTtcbiAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWE6IEludmFsaWQgU3RhdGUuIFVuYWJsZSB0byBnZXQgT2JqZWN0VHJhY2tlciBpbnN0YW5jZS4nKVxuXG4gICAgICAgIGxldCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuXG4gICAgICAgIGxldCB0cmFja2FibGVzUHJvbWlzZTpQcm9taXNlPEFyZ29uLlZ1Zm9yaWFUcmFja2FibGVzPjtcblxuICAgICAgICBpZiAoZGF0YVNldCkge1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUodGhpcy5fZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhOiBMb2FkaW5nIGRhdGFzZXQgKCR7aWR9KSBmcm9tICR7dXJpfS4uLmApO1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UgPSBmZXRjaERhdGFTZXQodXJpKS50aGVuPEFyZ29uLlZ1Zm9yaWFUcmFja2FibGVzPigobG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgZGF0YVNldCA9IG9iamVjdFRyYWNrZXIuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICAgICAgICAgIGlmICghZGF0YVNldCkgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiBVbmFibGUgdG8gY3JlYXRlIGRhdGFzZXQgaW5zdGFuY2VgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGF0YVNldC5sb2FkKGxvY2F0aW9uLCB2dWZvcmlhLlN0b3JhZ2VUeXBlLkFic29sdXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLnNldChpZCwgZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmxvYWRlZERhdGFTZXRzLmFkZChpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZXMgPSB0aGlzLl9nZXRUcmFja2FibGVzRnJvbURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhIGxvYWRlZCBkYXRhc2V0IGZpbGUgd2l0aCB0cmFja2FibGVzOlxcbicgKyBKU09OLnN0cmluZ2lmeSh0cmFja2FibGVzKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmFja2FibGVzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9iamVjdFRyYWNrZXIuZGVzdHJveURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVuYWJsZSB0byBsb2FkIGRvd25sb2FkZWQgZGF0YXNldCBhdCAke2xvY2F0aW9ufSBmcm9tICR7dXJpfWApO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGxvYWQgZGF0YXNldCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMCkge1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UudGhlbigodHJhY2thYmxlcyk9PntcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckxvYWREYXRhU2V0RXZlbnQnLCB7IGlkLCB0cmFja2FibGVzIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJhY2thYmxlc1Byb21pc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQ6dnVmb3JpYS5EYXRhU2V0KSB7XG4gICAgICAgIGNvbnN0IG51bVRyYWNrYWJsZXMgPSBkYXRhU2V0LmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlczpBcmdvbi5WdWZvcmlhVHJhY2thYmxlcyA9IHt9O1xuICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1UcmFja2FibGVzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IDx2dWZvcmlhLlRyYWNrYWJsZT5kYXRhU2V0LmdldFRyYWNrYWJsZShpKTtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNbdHJhY2thYmxlLmdldE5hbWUoKV0gPSB7XG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZSksXG4gICAgICAgICAgICAgICAgc2l6ZTogdHJhY2thYmxlIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQgPyB0cmFja2FibGUuZ2V0U2l6ZSgpIDoge3g6MCx5OjAsejowfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cmFja2FibGVzO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIDogUHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbjogQXJnb24uU2Vzc2lvblBvcnQsIGlkOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgYWN0aXZhdGluZyBkYXRhc2V0ICgke2lkfSlgKTtcblxuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYTogSW52YWxpZCBTdGF0ZS4gVW5hYmxlIHRvIGdldCBPYmplY3RUcmFja2VyIGluc3RhbmNlLicpXG5cbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcblxuICAgICAgICBsZXQgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcbiAgICAgICAgbGV0IGRhdGFTZXRQcm9taXNlOlByb21pc2U8dnVmb3JpYS5EYXRhU2V0PjtcbiAgICAgICAgaWYgKCFkYXRhU2V0KSB7XG4gICAgICAgICAgICBkYXRhU2V0UHJvbWlzZSA9IHRoaXMuX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIHJldHVybiBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLmdldChpZCkhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGFTZXRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGRhdGFTZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRhdGFTZXRQcm9taXNlLnRoZW4oKGRhdGFTZXQpPT57XG4gICAgICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIuYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVnVmb3JpYTogVW5hYmxlIHRvIGFjdGl2YXRlIGRhdGFTZXQgJHtpZH1gKTtcbiAgICAgICAgICAgIHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzLmFkZChpZCk7XG4gICAgICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMClcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlT2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb24pLnB1c2goKCk9PntcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZywgcGVybWFuZW50PXRydWUpOiBib29sZWFuIHsgICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYSBkZWFjdGl2YXRpbmcgZGF0YXNldCAoJHtpZH0pYCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKGRhdGFTZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBvYmplY3RUcmFja2VyLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0RXZlbnQnLCB7IGlkIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2VzcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlT2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOnN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICBpZiAoIXRoaXMuX29iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiB1bmFibGUgdG8gYWN0aXZhdGUgZGF0YXNldCAke2lkfWApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfb2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZywgcGVybWFuZW50PXRydWUpOiBib29sZWFuIHsgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhOiB1bmxvYWRpbmcgZGF0YXNldCAoJHtpZH0pLi4uYCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKGRhdGFTZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZWQgPSBvYmplY3RUcmFja2VyLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmdldChpZCkhO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuZGVsZXRlKHVyaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5sb2FkZWREYXRhU2V0cy5kZWxldGUoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldFVyaUJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlbGV0ZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOnN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICBpZiAoIXRoaXMuX29iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb24sIGlkKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IHVuYWJsZSB0byB1bmxvYWQgZGF0YXNldCAke2lkfWApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfZ2V0SWRGb3JUcmFja2FibGUodHJhY2thYmxlOnZ1Zm9yaWEuVHJhY2thYmxlKSA6IHN0cmluZyB7XG4gICAgICAgIGlmICh0cmFja2FibGUgaW5zdGFuY2VvZiB2dWZvcmlhLk9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX29iamVjdF90YXJnZXRfJyArIHRyYWNrYWJsZS5nZXRVbmlxdWVUYXJnZXRJZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX3RyYWNrYWJsZV8nICsgdHJhY2thYmxlLmdldElkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9kZWNyeXB0TGljZW5zZUtleShlbmNyeXB0ZWRMaWNlbnNlRGF0YTpzdHJpbmcsIHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIDogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIGRlY3J5cHQoZW5jcnlwdGVkTGljZW5zZURhdGEudHJpbSgpKS50aGVuKChqc29uKT0+e1xuICAgICAgICAgICAgY29uc3Qge2tleSxvcmlnaW5zfSA6IHtrZXk6c3RyaW5nLG9yaWdpbnM6c3RyaW5nW119ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgIGlmICghc2Vzc2lvbi51cmkpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBvcmlnaW4nKTtcblxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luID0gVVJJLnBhcnNlKHNlc3Npb24udXJpKTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSg8YW55Pm9yaWdpbnMpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVnVmb3JpYSBMaWNlbnNlIERhdGEgbXVzdCBzcGVjaWZ5IGFsbG93ZWQgb3JpZ2luc1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBvcmlnaW5zLmZpbmQoKG8pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IG8uc3BsaXQoL1xcLyguKikvKTtcbiAgICAgICAgICAgICAgICBsZXQgZG9tYWluUGF0dGVybiA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgICAgIGxldCBwYXRoUGF0dGVybiA9IHBhcnRzWzFdIHx8ICcqKic7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1pbmltYXRjaChvcmlnaW4uaG9zdG5hbWUsIGRvbWFpblBhdHRlcm4pICYmIG1pbmltYXRjaChvcmlnaW4ucGF0aCwgcGF0aFBhdHRlcm4pO1xuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCAmJiAhREVCVUdfRElTQUJMRV9PUklHSU5fQ0hFQ0spIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgb3JpZ2luJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NvbmZpZyA9IDx2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZz57fTtcblxuICAgIHB1YmxpYyBjb25maWd1cmVWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kKHZpZXdwb3J0OkFyZ29uLlZpZXdwb3J0LCBlbmFibGVkOmJvb2xlYW4sIHJlZmxlY3Rpb249dnVmb3JpYS5WaWRlb0JhY2tncm91bmRSZWZsZWN0aW9uLkRlZmF1bHQpIHtcbiAgICAgICAgY29uc3Qgdmlld1dpZHRoID0gdmlld3BvcnQud2lkdGg7XG4gICAgICAgIGNvbnN0IHZpZXdIZWlnaHQgPSB2aWV3cG9ydC5oZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjYW1lcmFEZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKTtcbiAgICAgICAgY29uc3QgdmlkZW9Nb2RlID0gY2FtZXJhRGV2aWNlLmdldFZpZGVvTW9kZSh2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZSk7XG4gICAgICAgIGxldCB2aWRlb1dpZHRoID0gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICBsZXQgdmlkZW9IZWlnaHQgPSB2aWRlb01vZGUuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBnZXRTY3JlZW5PcmllbnRhdGlvbigpO1xuICAgICAgICBpZiAob3JpZW50YXRpb24gPT09IDAgfHwgb3JpZW50YXRpb24gPT09IDE4MCkge1xuICAgICAgICAgICAgdmlkZW9XaWR0aCA9IHZpZGVvTW9kZS5oZWlnaHQ7XG4gICAgICAgICAgICB2aWRlb0hlaWdodCA9IHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2lkdGhSYXRpbyA9IHZpZXdXaWR0aCAvIHZpZGVvV2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodFJhdGlvID0gdmlld0hlaWdodCAvIHZpZGVvSGVpZ2h0O1xuICAgICAgICAvLyBhc3BlY3QgZmlsbFxuICAgICAgICBjb25zdCBzY2FsZSA9IE1hdGgubWF4KHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcbiAgICAgICAgLy8gYXNwZWN0IGZpdFxuICAgICAgICAvLyBjb25zdCBzY2FsZSA9IE1hdGgubWluKHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcblxuICAgICAgICBjb25zdCB2aWRlb1ZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gdmlkZW9WaWV3LmlvcyA/IHZpZGVvVmlldy5pb3MuY29udGVudFNjYWxlRmFjdG9yIDogcGxhdGZvcm0uc2NyZWVuLm1haW5TY3JlZW4uc2NhbGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzaXplWCA9IHZpZGVvV2lkdGggKiBzY2FsZSAqIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgY29uc3Qgc2l6ZVkgPSB2aWRlb0hlaWdodCAqIHNjYWxlICogY29udGVudFNjYWxlRmFjdG9yO1xuXG4gICAgICAgIC8vIHBvc3NpYmxlIG9wdGltaXphdGlvbiwgbmVlZHMgZnVydGhlciB0ZXN0aW5nXG4gICAgICAgIC8vIGlmICh0aGlzLl9jb25maWcuZW5hYmxlZCA9PT0gZW5hYmxlZCAmJlxuICAgICAgICAvLyAgICAgdGhpcy5fY29uZmlnLnNpemVYID09PSBzaXplWCAmJlxuICAgICAgICAvLyAgICAgdGhpcy5fY29uZmlnLnNpemVZID09PSBzaXplWSkge1xuICAgICAgICAvLyAgICAgLy8gTm8gY2hhbmdlcywgc2tpcCBjb25maWd1cmF0aW9uXG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyBhcHBseSB0aGUgdmlkZW8gY29uZmlnXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuX2NvbmZpZzsgXG4gICAgICAgIGNvbmZpZy5lbmFibGVkID0gZW5hYmxlZDtcbiAgICAgICAgY29uZmlnLnNpemVYID0gc2l6ZVg7XG4gICAgICAgIGNvbmZpZy5zaXplWSA9IHNpemVZO1xuICAgICAgICBjb25maWcucG9zaXRpb25YID0gMDtcbiAgICAgICAgY29uZmlnLnBvc2l0aW9uWSA9IDA7XG4gICAgICAgIGNvbmZpZy5yZWZsZWN0aW9uID0gdnVmb3JpYS5WaWRlb0JhY2tncm91bmRSZWZsZWN0aW9uLkRlZmF1bHQ7XG4gICAgICAgIFxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgVnVmb3JpYSBjb25maWd1cmluZyB2aWRlbyBiYWNrZ3JvdW5kLi4uXG4gICAgICAgIC8vICAgICBjb250ZW50U2NhbGVGYWN0b3I6ICR7Y29udGVudFNjYWxlRmFjdG9yfSBvcmllbnRhdGlvbjogJHtvcmllbnRhdGlvbn0gXG4gICAgICAgIC8vICAgICB2aWV3V2lkdGg6ICR7dmlld1dpZHRofSB2aWV3SGVpZ2h0OiAke3ZpZXdIZWlnaHR9IHZpZGVvV2lkdGg6ICR7dmlkZW9XaWR0aH0gdmlkZW9IZWlnaHQ6ICR7dmlkZW9IZWlnaHR9IFxuICAgICAgICAvLyAgICAgY29uZmlnOiAke0pTT04uc3RyaW5naWZ5KGNvbmZpZyl9XG4gICAgICAgIC8vIGApO1xuXG4gICAgICAgIEFic29sdXRlTGF5b3V0LnNldExlZnQodmlkZW9WaWV3LCB2aWV3cG9ydC54KTtcbiAgICAgICAgQWJzb2x1dGVMYXlvdXQuc2V0VG9wKHZpZGVvVmlldywgdmlld3BvcnQueSk7XG4gICAgICAgIHZpZGVvVmlldy53aWR0aCA9IHZpZXdXaWR0aDtcbiAgICAgICAgdmlkZW9WaWV3LmhlaWdodCA9IHZpZXdIZWlnaHQ7XG4gICAgICAgIHZ1Zm9yaWEuYXBpLmdldFJlbmRlcmVyKCkuc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKGNvbmZpZyk7XG4gICAgfVxufVxuXG4vLyBUT0RPOiBtYWtlIHRoaXMgY3Jvc3MgcGxhdGZvcm0gc29tZWhvd1xuZnVuY3Rpb24gZmV0Y2hEYXRhU2V0KHhtbFVybFN0cmluZzpzdHJpbmcpIDogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAvKlxuICAgIGNvbnN0IHhtbFVybCA9IE5TVVJMLlVSTFdpdGhTdHJpbmcoeG1sVXJsU3RyaW5nKTtcbiAgICBjb25zdCBkYXRVcmwgPSB4bWxVcmwuVVJMQnlEZWxldGluZ1BhdGhFeHRlbnNpb24uVVJMQnlBcHBlbmRpbmdQYXRoRXh0ZW5zaW9uKFwiZGF0XCIpO1xuICAgIFxuICAgIGNvbnN0IGRpcmVjdG9yeVBhdGhVcmwgPSB4bWxVcmwuVVJMQnlEZWxldGluZ0xhc3RQYXRoQ29tcG9uZW50O1xuICAgIGNvbnN0IGRpcmVjdG9yeUhhc2ggPSBkaXJlY3RvcnlQYXRoVXJsLmhhc2g7XG4gICAgY29uc3QgdG1wUGF0aCA9IGZpbGUua25vd25Gb2xkZXJzLnRlbXAoKS5wYXRoO1xuICAgIGNvbnN0IGRpcmVjdG9yeUhhc2hQYXRoID0gdG1wUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBkaXJlY3RvcnlIYXNoO1xuICAgIFxuICAgIGZpbGUuRm9sZGVyLmZyb21QYXRoKGRpcmVjdG9yeUhhc2hQYXRoKTtcbiAgICBcbiAgICBjb25zdCB4bWxEZXN0UGF0aCA9IGRpcmVjdG9yeUhhc2hQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIHhtbFVybC5sYXN0UGF0aENvbXBvbmVudDtcbiAgICBjb25zdCBkYXREZXN0UGF0aCA9IGRpcmVjdG9yeUhhc2hQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGRhdFVybC5sYXN0UGF0aENvbXBvbmVudDtcbiAgICAqL1xuXG4gICAgY29uc3QgZGlyZWN0b3J5UGF0aCA9IHhtbFVybFN0cmluZy5zdWJzdHJpbmcoMCwgeG1sVXJsU3RyaW5nLmxhc3RJbmRleE9mKFwiL1wiKSk7XG4gICAgY29uc3QgZmlsZW5hbWUgPSB4bWxVcmxTdHJpbmcuc3Vic3RyaW5nKHhtbFVybFN0cmluZy5sYXN0SW5kZXhPZihcIi9cIikgKyAxKTtcbiAgICBjb25zdCBmaWxlbmFtZVdpdGhvdXRFeHQgPSBmaWxlbmFtZS5zdWJzdHJpbmcoMCwgZmlsZW5hbWUubGFzdEluZGV4T2YoXCIuXCIpKTtcblxuICAgIGNvbnN0IGRhdFVybFN0cmluZyA9IGRpcmVjdG9yeVBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZmlsZW5hbWVXaXRob3V0RXh0ICsgXCIuZGF0XCI7XG5cbiAgICBjb25zdCBkaXJlY3RvcnlIYXNoID0gaGFzaENvZGUoZGlyZWN0b3J5UGF0aCk7XG4gICAgY29uc3QgdG1wUGF0aCA9IGZpbGUua25vd25Gb2xkZXJzLnRlbXAoKS5wYXRoO1xuICAgIGNvbnN0IGRpcmVjdG9yeUhhc2hQYXRoID0gdG1wUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBkaXJlY3RvcnlIYXNoO1xuXG4gICAgZmlsZS5Gb2xkZXIuZnJvbVBhdGgoZGlyZWN0b3J5SGFzaFBhdGgpO1xuICAgIFxuICAgIGNvbnN0IHhtbERlc3RQYXRoID0gZGlyZWN0b3J5SGFzaFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZmlsZW5hbWU7XG4gICAgY29uc3QgZGF0RGVzdFBhdGggPSBkaXJlY3RvcnlIYXNoUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBmaWxlbmFtZVdpdGhvdXRFeHQgKyBcIi5kYXRcIjtcblxuICAgIGZ1bmN0aW9uIGhhc2hDb2RlKHM6c3RyaW5nKSB7XG4gICAgICAgIHZhciBoYXNoID0gMCwgaSwgY2hyLCBsZW47XG4gICAgICAgIGlmIChzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGhhc2g7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGNociAgID0gcy5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgaGFzaCAgPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIGNocjtcbiAgICAgICAgICAgIGhhc2ggfD0gMDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhc2g7XG4gICAgfVxuICAgIFxuICAgIGZ1bmN0aW9uIGRvd25sb2FkSWZOZWVkZWQodXJsOnN0cmluZywgZGVzdFBhdGg6c3RyaW5nKSB7XG4gICAgICAgIGxldCBsYXN0TW9kaWZpZWQ6RGF0ZXx1bmRlZmluZWQ7XG4gICAgICAgIGlmIChmaWxlLkZpbGUuZXhpc3RzKGRlc3RQYXRoKSkge1xuICAgICAgICAgICAgY29uc3QgZiA9IGZpbGUuRmlsZS5mcm9tUGF0aChkZXN0UGF0aCk7XG4gICAgICAgICAgICBsYXN0TW9kaWZpZWQgPSBmLmxhc3RNb2RpZmllZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHR0cC5yZXF1ZXN0KHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIG1ldGhvZDonR0VUJyxcbiAgICAgICAgICAgIGhlYWRlcnM6IGxhc3RNb2RpZmllZCA/IHtcbiAgICAgICAgICAgICAgICAnSWYtTW9kaWZpZWQtU2luY2UnOiBsYXN0TW9kaWZpZWQudG9VVENTdHJpbmcoKVxuICAgICAgICAgICAgfSA6IHVuZGVmaW5lZFxuICAgICAgICB9KS50aGVuKChyZXNwb25zZSk9PntcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAzMDQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVmVyaWZpZWQgdGhhdCBjYWNoZWQgdmVyc2lvbiBvZiBmaWxlICR7dXJsfSBhdCAke2Rlc3RQYXRofSBpcyB1cC10by1kYXRlLmApXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3RQYXRoO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5jb250ZW50ICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAzMDApIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYERvd25sb2FkZWQgZmlsZSAke3VybH0gdG8gJHtkZXN0UGF0aH1gKVxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5jb250ZW50LnRvRmlsZShkZXN0UGF0aCkucGF0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5hYmxlIHRvIGRvd25sb2FkIGZpbGUgXCIgKyB1cmwgKyBcIiAgKEhUVFAgc3RhdHVzIGNvZGU6IFwiICsgcmVzcG9uc2Uuc3RhdHVzQ29kZSArIFwiKVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgZG93bmxvYWRJZk5lZWRlZCh4bWxVcmxTdHJpbmcseG1sRGVzdFBhdGgpLCBcbiAgICAgICAgZG93bmxvYWRJZk5lZWRlZChkYXRVcmxTdHJpbmcsZGF0RGVzdFBhdGgpXG4gICAgXSkudGhlbigoKT0+eG1sRGVzdFBhdGgpO1xufSAiXX0=