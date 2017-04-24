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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tdnVmb3JpYS1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXZ1Zm9yaWEtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxzQ0FBd0M7QUFDeEMsOENBQWdEO0FBQ2hELDJCQUE2QjtBQUM3QixrQ0FBb0M7QUFDcEMsbUNBQXFDO0FBQ3JDLDhEQUEwRDtBQUMxRCwrQkFBaUQ7QUFDakQscUNBQXNDO0FBQ3RDLDJCQUE0QjtBQUU1QixJQUFNLDZCQUE2QixHQUFvQixTQUFTLENBQUMsQ0FBQyxzQkFBc0I7QUFDeEYsSUFBTSwwQkFBMEIsR0FBVyxJQUFJLENBQUM7QUFFbkMsUUFBQSx1QkFBdUIsR0FBNEIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQztBQUN4RyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDZixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUksQ0FBQyxrQkFBa0I7UUFDOUMsK0JBQXVCLEtBQWdDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1lBQzdGLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDN0MsQ0FBQztBQUVZLFFBQUEsV0FBVyxHQUFHLENBQUMsR0FBRyxHQUFDLEVBQUUsQ0FBQztBQUVuQyxJQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNyQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUUz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LFFBQVUsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2xELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixHQUFHLEdBQUcsR0FBRyx1QkFBdUIsR0FBRyxRQUFRLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzVHLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUNmLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUMsV0FBVyxDQUFDO1FBQ25ELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUMsV0FBVyxDQUFDO0tBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBSSxPQUFBLFdBQVcsRUFBWCxDQUFXLENBQUMsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBmaWxlIGZyb20gJ2ZpbGUtc3lzdGVtJztcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gJ3BsYXRmb3JtJztcbmltcG9ydCB7QWJzb2x1dGVMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvYWJzb2x1dGUtbGF5b3V0JztcbmltcG9ydCB7ZGVjcnlwdCwgc2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIG1pbmltYXRjaCBmcm9tICdtaW5pbWF0Y2gnXG5pbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnXG5cbmNvbnN0IERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZOnN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7IC8vICd5b3VyX2xpY2Vuc2Vfa2V5JztcbmNvbnN0IERFQlVHX0RJU0FCTEVfT1JJR0lOX0NIRUNLOmJvb2xlYW4gPSB0cnVlO1xuXG5leHBvcnQgY29uc3QgdnVmb3JpYUNhbWVyYURldmljZU1vZGU6dnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlID0gdnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlLk9waW1pemVRdWFsaXR5O1xuaWYgKHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcykge1xuICAgICg8VUlWaWV3PnZ1Zm9yaWEudmlkZW9WaWV3LmlvcykuY29udGVudFNjYWxlRmFjdG9yID0gXG4gICAgICAgIHZ1Zm9yaWFDYW1lcmFEZXZpY2VNb2RlID09PSA8dnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlPiB2dWZvcmlhLkNhbWVyYURldmljZU1vZGUuT3B0aW1pemVTcGVlZCA/IFxuICAgICAgICAxIDogcGxhdGZvcm0uc2NyZWVuLm1haW5TY3JlZW4uc2NhbGU7XG59XG5cbmV4cG9ydCBjb25zdCBWSURFT19ERUxBWSA9IC0wLjUvNjA7XG5cbmNvbnN0IE1hdHJpeDQgPSBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbmNvbnN0IENhcnRlc2lhbjMgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbmNvbnN0IFF1YXRlcm5pb24gPSBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcbmNvbnN0IEp1bGlhbkRhdGUgPSBBcmdvbi5DZXNpdW0uSnVsaWFuRGF0ZTtcbmNvbnN0IENlc2l1bU1hdGggPSBBcmdvbi5DZXNpdW0uQ2VzaXVtTWF0aDtcblxuY29uc3QgeDE4MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWCwgQ2VzaXVtTWF0aC5QSSk7XG5cbmNsYXNzIFZ1Zm9yaWFTZXNzaW9uRGF0YSB7XG4gICAgY29tbWFuZFF1ZXVlID0gbmV3IEFyZ29uLkNvbW1hbmRRdWV1ZTtcbiAgICBpbml0UmVzdWx0UmVzb2x2ZXI/OihyZXN1bHQ6dnVmb3JpYS5Jbml0UmVzdWx0KT0+dm9pZDtcbiAgICBsb2FkZWREYXRhU2V0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGFjdGl2YXRlZERhdGFTZXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZGF0YVNldFVyaUJ5SWQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGRhdGFTZXRJZEJ5VXJpID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBkYXRhU2V0SW5zdGFuY2VCeUlkID0gbmV3IE1hcDxzdHJpbmcsIHZ1Zm9yaWEuRGF0YVNldD4oKTtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMga2V5UHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+KSB7fVxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIge1xuXG4gICAgcHVibGljIHN0YXRlVXBkYXRlRXZlbnQgPSBuZXcgQXJnb24uRXZlbnQ8QXJnb24uQ2VzaXVtLkp1bGlhbkRhdGU+KCk7XG4gICAgXG4gICAgcHVibGljIHZ1Zm9yaWFUcmFja2VyRW50aXR5ID0gbmV3IEFyZ29uLkNlc2l1bS5FbnRpdHkoe1xuICAgICAgICBwb3NpdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoQ2FydGVzaWFuMy5aRVJPLCB0aGlzLmNvbnRleHRTZXJ2aWNlLnVzZXIpLFxuICAgICAgICBvcmllbnRhdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KFF1YXRlcm5pb24uSURFTlRJVFkpXG4gICAgfSk7XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoQ2FydGVzaWFuID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zKCk7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFF1YXRlcm5pb24gPSBuZXcgQXJnb24uQ2VzaXVtLlF1YXRlcm5pb24oKTtcblx0cHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDMgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDMoKTtcblxuICAgIHByaXZhdGUgX2NvbnRyb2xsaW5nU2Vzc2lvbj86IEFyZ29uLlNlc3Npb25Qb3J0O1xuICAgIHByaXZhdGUgX3Nlc3Npb25Td2l0Y2hlckNvbW1hbmRRdWV1ZSA9IG5ldyBBcmdvbi5Db21tYW5kUXVldWUoKTtcblxuICAgIHByaXZhdGUgX3Nlc3Npb25EYXRhID0gbmV3IFdlYWtNYXA8QXJnb24uU2Vzc2lvblBvcnQsVnVmb3JpYVNlc3Npb25EYXRhPigpO1xuICAgIFxuXHRjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHByaXZhdGUgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsXG4gICAgICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSxcbiAgICAgICAgICAgIC8vIHByaXZhdGUgZGV2aWNlU2VydmljZTpBcmdvbi5EZXZpY2VTZXJ2aWNlLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZVByb3ZpZGVyOkFyZ29uLkNvbnRleHRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuXG4gICAgICAgIC8vIHRoaXMuc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgLy8gICAgIHRoaXMuc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgIC8vICAgICAgICAgY29uc3QgcmVhbGl0eSA9IHRoaXMuY29udGV4dFNlcnZpY2Uuc2VyaWFsaXplZEZyYW1lU3RhdGUucmVhbGl0eTtcbiAgICAgICAgLy8gICAgICAgICBpZiAocmVhbGl0eSA9PT0gQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFKSB0aGlzLmRldmljZVNlcnZpY2UudXBkYXRlKCk7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy8gICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgLy8gICAgICAgICBjb25zdCByZWFsaXR5ID0gdGhpcy5jb250ZXh0U2VydmljZS5zZXJpYWxpemVkRnJhbWVTdGF0ZS5yZWFsaXR5O1xuICAgICAgICAvLyAgICAgICAgIGlmIChyZWFsaXR5ICE9PSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkUpIHRoaXMuZGV2aWNlU2VydmljZS51cGRhdGUoKTtcbiAgICAgICAgLy8gICAgIH0sIDYwKVxuICAgICAgICAvLyB9KVxuICAgICAgICBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHNlc3Npb24pPT57XG4gICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5pc0F2YWlsYWJsZSddID0gXG4gICAgICAgICAgICAgICAgICAgICgpID0+IFByb21pc2UucmVzb2x2ZSh7YXZhaWxhYmxlOiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEuaW5pdCddID0gXG4gICAgICAgICAgICAgICAgICAgIChpbml0T3B0aW9ucykgPT4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVnVmb3JpYSBpcyBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm1cIikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmlzQXZhaWxhYmxlJ10gPSBcbiAgICAgICAgICAgICAgICAgICAgKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHthdmFpbGFibGU6ICEhdnVmb3JpYS5hcGl9KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmluaXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICBpbml0T3B0aW9ucyA9PiB0aGlzLl9oYW5kbGVJbml0KHNlc3Npb24sIGluaXRPcHRpb25zKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0J10gPSBcbiAgICAgICAgICAgICAgICAgICAgKHt1cmx9Ont1cmw6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckNyZWF0ZURhdGFTZXQoc2Vzc2lvbiwgdXJsKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJMb2FkRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdGFiaWxpdHlcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRGZXRjaCddID0gc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyTG9hZERhdGFTZXQnXTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRMb2FkJ10gPSAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpID0+IHRoaXMuX2hhbmRsZUNsb3NlKHNlc3Npb24pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gLy8gc3dpdGNoIHRvIEFSIG1vZGUgd2hlbiBMSVZFIHJlYWxpdHkgaXMgcHJlc2VudGluZ1xuICAgICAgICAvLyByZWFsaXR5U2VydmljZS5jaGFuZ2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7Y3VycmVudH0pPT57XG4gICAgICAgIC8vICAgICB0aGlzLl9zZXREZXZpY2VNb2RlKFxuICAgICAgICAvLyAgICAgICAgIGN1cnJlbnQgPT09IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRSA/IFxuICAgICAgICAvLyAgICAgICAgICAgICB2dWZvcmlhLkRldmljZU1vZGUuQVIgOiB2dWZvcmlhLkRldmljZU1vZGUuVlJcbiAgICAgICAgLy8gICAgICk7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbGFuZHNjYXBlUmlnaHRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgPSAtQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTztcblxuICAgICAgICBjb25zdCBzdGF0ZVVwZGF0ZUNhbGxiYWNrID0gKHN0YXRlOnZ1Zm9yaWEuU3RhdGUpID0+IHsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRpbWUgPSBKdWxpYW5EYXRlLm5vdygpO1xuICAgICAgICAgICAgLy8gc3VidHJhY3QgYSBmZXcgbXMsIHNpbmNlIHRoZSB2aWRlbyBmcmFtZSByZXByZXNlbnRzIGEgdGltZSBzbGlnaHRseSBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgIC8vIFRPRE86IGlmIHdlIGFyZSB1c2luZyBhbiBvcHRpY2FsIHNlZS10aHJvdWdoIGRpc3BsYXksIGxpa2UgaG9sb2xlbnMsXG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRvIGRvIHRoZSBvcHBvc2l0ZSwgYW5kIGRvIGZvcndhcmQgcHJlZGljdGlvbiAodGhvdWdoIGlkZWFsbHkgbm90IGhlcmUsIFxuICAgICAgICAgICAgLy8gYnV0IGluIGVhY2ggYXBwIGl0c2VsZiB0byB3ZSBhcmUgYXMgY2xvc2UgYXMgcG9zc2libGUgdG8gdGhlIGFjdHVhbCByZW5kZXIgdGltZSB3aGVuXG4gICAgICAgICAgICAvLyB3ZSBzdGFydCB0aGUgcmVuZGVyKVxuICAgICAgICAgICAgSnVsaWFuRGF0ZS5hZGRTZWNvbmRzKHRpbWUsIFZJREVPX0RFTEFZLCB0aW1lKTtcblxuICAgICAgICAgICAgLy8gUm90YXRlIHRoZSB0cmFja2VyIHRvIGEgbGFuZHNjYXBlLXJpZ2h0IGZyYW1lLCBcbiAgICAgICAgICAgIC8vIHdoZXJlICtYIGlzIHJpZ2h0LCArWSBpcyBkb3duLCBhbmQgK1ogaXMgaW4gdGhlIGNhbWVyYSBkaXJlY3Rpb25cbiAgICAgICAgICAgIC8vICh2dWZvcmlhIHJlcG9ydHMgcG9zZXMgaW4gdGhpcyBmcmFtZSBvbiBpT1MgZGV2aWNlcywgbm90IHN1cmUgYWJvdXQgYW5kcm9pZClcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgPSBzY3JlZW5PcmllbnRhdGlvbiAqIENlc2l1bU1hdGguUkFESUFOU19QRVJfREVHUkVFO1xuICAgICAgICAgICAgY29uc3QgdHJhY2tlck9yaWVudGF0aW9uID0gUXVhdGVybmlvbi5tdWx0aXBseShcbiAgICAgICAgICAgICAgICBRdWF0ZXJuaW9uLmZyb21BeGlzQW5nbGUoQ2FydGVzaWFuMy5VTklUX1osIGxhbmRzY2FwZVJpZ2h0U2NyZWVuT3JpZW50YXRpb25SYWRpYW5zIC0gY3VycmVudFNjcmVlbk9yaWVudGF0aW9uUmFkaWFucywgdGhpcy5fc2NyYXRjaFF1YXRlcm5pb24pLFxuICAgICAgICAgICAgICAgIHgxODAsXG4gICAgICAgICAgICAgICAgdGhpcy5fc2NyYXRjaFF1YXRlcm5pb24pO1xuICAgICAgICAgICAgKHRoaXMudnVmb3JpYVRyYWNrZXJFbnRpdHkub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKHRyYWNrZXJPcmllbnRhdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHZ1Zm9yaWFGcmFtZSA9IHN0YXRlLmdldEZyYW1lKCk7XG4gICAgICAgICAgICBjb25zdCBmcmFtZVRpbWVTdGFtcCA9IHZ1Zm9yaWFGcmFtZS5nZXRUaW1lU3RhbXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdXBkYXRlIHRyYWNrYWJsZSByZXN1bHRzIGluIGNvbnRleHQgZW50aXR5IGNvbGxlY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IG51bVRyYWNrYWJsZVJlc3VsdHMgPSBzdGF0ZS5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1UcmFja2FibGVSZXN1bHRzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVSZXN1bHQgPSA8dnVmb3JpYS5UcmFja2FibGVSZXN1bHQ+c3RhdGUuZ2V0VHJhY2thYmxlUmVzdWx0KGkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRyYWNrYWJsZVJlc3VsdC5nZXRUcmFja2FibGUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gdHJhY2thYmxlLmdldE5hbWUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMuX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IGNvbnRleHRTZXJ2aWNlLmVudGl0aWVzLmdldEJ5SWQoaWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eSA9IG5ldyBBcmdvbi5DZXNpdW0uRW50aXR5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgQXJnb24uQ2VzaXVtLlNhbXBsZWRQb3NpdGlvblByb3BlcnR5KHRoaXMudnVmb3JpYVRyYWNrZXJFbnRpdHkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb246IG5ldyBBcmdvbi5DZXNpdW0uU2FtcGxlZFByb3BlcnR5KEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50aXR5UG9zaXRpb24gPSBlbnRpdHkucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLlNhbXBsZWRQb3NpdGlvblByb3BlcnR5O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpdHlPcmllbnRhdGlvbiA9IGVudGl0eS5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFByb3BlcnR5O1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlQb3NpdGlvbi5tYXhOdW1TYW1wbGVzID0gMTA7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eU9yaWVudGF0aW9uLm1heE51bVNhbXBsZXMgPSAxMDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5UG9zaXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25UeXBlID0gQXJnb24uQ2VzaXVtLkV4dHJhcG9sYXRpb25UeXBlLkhPTEQ7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eU9yaWVudGF0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uVHlwZSA9IEFyZ29uLkNlc2l1bS5FeHRyYXBvbGF0aW9uVHlwZS5IT0xEO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlQb3NpdGlvbi5mb3J3YXJkRXh0cmFwb2xhdGlvbkR1cmF0aW9uID0gMTAvNjA7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eU9yaWVudGF0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uRHVyYXRpb24gPSAxMC82MDtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dFNlcnZpY2UuZW50aXRpZXMuYWRkKGVudGl0eSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29udGV4dFNlcnZpY2VQcm92aWRlci5wdWJsaXNoaW5nUmVmZXJlbmNlRnJhbWVNYXAuc2V0KGlkLCB0aGlzLmNvbnRleHRTZXJ2aWNlLnVzZXIuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVUaW1lID0gSnVsaWFuRGF0ZS5jbG9uZSh0aW1lKTsgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gYWRkIGFueSB0aW1lIGRpZmYgZnJvbSB2dWZvcmlhXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2thYmxlVGltZURpZmYgPSB0cmFja2FibGVSZXN1bHQuZ2V0VGltZVN0YW1wKCkgLSBmcmFtZVRpbWVTdGFtcDtcbiAgICAgICAgICAgICAgICBpZiAodHJhY2thYmxlVGltZURpZmYgIT09IDApIEp1bGlhbkRhdGUuYWRkU2Vjb25kcyh0aW1lLCB0cmFja2FibGVUaW1lRGlmZiwgdHJhY2thYmxlVGltZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zZSA9IDxBcmdvbi5DZXNpdW0uTWF0cml4ND48YW55PnRyYWNrYWJsZVJlc3VsdC5nZXRQb3NlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBNYXRyaXg0LmdldFRyYW5zbGF0aW9uKHBvc2UsIHRoaXMuX3NjcmF0Y2hDYXJ0ZXNpYW4pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdGF0aW9uTWF0cml4ID0gTWF0cml4NC5nZXRSb3RhdGlvbihwb3NlLCB0aGlzLl9zY3JhdGNoTWF0cml4Myk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLmZyb21Sb3RhdGlvbk1hdHJpeChyb3RhdGlvbk1hdHJpeCwgdGhpcy5fc2NyYXRjaFF1YXRlcm5pb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIChlbnRpdHkucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLlNhbXBsZWRQb3NpdGlvblByb3BlcnR5KS5hZGRTYW1wbGUodHJhY2thYmxlVGltZSwgcG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIChlbnRpdHkub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLlNhbXBsZWRQcm9wZXJ0eSkuYWRkU2FtcGxlKHRyYWNrYWJsZVRpbWUsIG9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVXBkYXRlRXZlbnQucmFpc2VFdmVudCh0aW1lKTtcbiAgICAgICAgICAgIC8vIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMuc2Vzc2lvblNlcnZpY2UuZXJyb3JFdmVudC5yYWlzZUV2ZW50KGUpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdnVmb3JpYS5hcGkuc2V0U3RhdGVVcGRhdGVDYWxsYmFjayhzdGF0ZVVwZGF0ZUNhbGxiYWNrKTtcblx0fVxuICAgICAgICBcbiAgICAvLyBwcml2YXRlIF9kZXZpY2VNb2RlID0gdnVmb3JpYS5EZXZpY2VNb2RlLlZSO1xuICAgIC8vIHByaXZhdGUgX3NldERldmljZU1vZGUoZGV2aWNlTW9kZTogdnVmb3JpYS5EZXZpY2VNb2RlKSB7XG4gICAgLy8gICAgIHRoaXMuX2RldmljZU1vZGUgPSBkZXZpY2VNb2RlO1xuICAgIC8vICAgICAvLyBmb2xsb3dpbmcgbWF5IGZhaWwgKHJldHVybiBmYWxzZSkgaWYgdnVmb3JpYSBpcyBub3QgY3VycmVudGx5IGluaXRpYWxpemVkLCBcbiAgICAvLyAgICAgLy8gYnV0IHRoYXQncyBva2F5IChzaW5jZSBuZXh0IHRpbWUgd2UgaW5pdGlsYWl6ZSB3ZSB3aWxsIHVzZSB0aGUgc2F2ZWQgbW9kZSkuIFxuICAgIC8vICAgICB2dWZvcmlhLmFwaS5nZXREZXZpY2UoKS5zZXRNb2RlKGRldmljZU1vZGUpOyBcbiAgICAvLyB9IFxuXG4gICAgcHJpdmF0ZSBfZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX3Nlc3Npb25EYXRhLmdldChzZXNzaW9uKTtcbiAgICAgICAgaWYgKCFzZXNzaW9uRGF0YSkgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhIG11c3QgYmUgaW5pdGlhbGl6ZWQgZmlyc3QnKVxuICAgICAgICByZXR1cm4gc2Vzc2lvbkRhdGE7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fc2Vzc2lvbkRhdGEuZ2V0KHNlc3Npb24pITtcbiAgICAgICAgaWYgKCFzZXNzaW9uRGF0YS5jb21tYW5kUXVldWUpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYSBtdXN0IGJlIGluaXRpYWxpemVkIGZpcnN0JylcbiAgICAgICAgcmV0dXJuIHNlc3Npb25EYXRhLmNvbW1hbmRRdWV1ZTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfc2VsZWN0Q29udHJvbGxpbmdTZXNzaW9uKCkge1xuICAgICAgICBjb25zdCBmb2N1c1Nlc3Npb24gPSB0aGlzLmZvY3VzU2VydmljZVByb3ZpZGVyLnNlc3Npb247XG5cbiAgICAgICAgaWYgKGZvY3VzU2Vzc2lvbiAmJiBcbiAgICAgICAgICAgIGZvY3VzU2Vzc2lvbi5pc0Nvbm5lY3RlZCAmJiBcbiAgICAgICAgICAgIHRoaXMuX3Nlc3Npb25EYXRhLmhhcyhmb2N1c1Nlc3Npb24pKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRDb250cm9sbGluZ1Nlc3Npb24oZm9jdXNTZXNzaW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gJiYgXG4gICAgICAgICAgICB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24uaXNDb25uZWN0ZWQgJiZcbiAgICAgICAgICAgIHRoaXMuX3Nlc3Npb25EYXRhLmhhcyh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24pKSBcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBwaWNrIGEgZGlmZmVyZW50IHNlc3Npb24gYXMgdGhlIGNvbnRyb2xsaW5nIHNlc3Npb25cbiAgICAgICAgLy8gVE9ETzogcHJpb3JpdGl6ZSBhbnkgc2Vzc2lvbnMgb3RoZXIgdGhhbiB0aGUgZm9jdXNzZWQgc2Vzc2lvbj9cbiAgICAgICAgZm9yIChjb25zdCBzZXNzaW9uIG9mIHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlZFNlc3Npb25zKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fc2Vzc2lvbkRhdGEuaGFzKHNlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0Q29udHJvbGxpbmdTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIG5vIG90aGVyIHNlc3Npb24gaXMgYXZhaWxhYmxlLFxuICAgICAgICAvLyBmYWxsYmFjayB0byB0aGUgbWFuYWdlciBhcyB0aGUgY29udHJvbGxpbmcgc2Vzc2lvblxuICAgICAgICBpZiAodGhpcy5fc2Vzc2lvbkRhdGEuaGFzKHRoaXMuc2Vzc2lvblNlcnZpY2UubWFuYWdlcikpXG4gICAgICAgICAgICB0aGlzLl9zZXRDb250cm9sbGluZ1Nlc3Npb24odGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9zZXRDb250cm9sbGluZ1Nlc3Npb24oc2Vzc2lvbjogQXJnb24uU2Vzc2lvblBvcnQpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiA9PT0gc2Vzc2lvbikgcmV0dXJuO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYVNlcnZpY2U6IFNldHRpbmcgY29udHJvbGxpbmcgc2Vzc2lvbiB0byBcIiArIHNlc3Npb24udXJpKVxuXG4gICAgICAgIGlmICh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzU2Vzc2lvbiA9IHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbjtcbiAgICAgICAgICAgIHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuX3Nlc3Npb25Td2l0Y2hlckNvbW1hbmRRdWV1ZS5wdXNoKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VTZXNzaW9uKHByZXZpb3VzU2Vzc2lvbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgdGhpcy5fc2Vzc2lvblN3aXRjaGVyQ29tbWFuZFF1ZXVlLnB1c2goKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Jlc3VtZVNlc3Npb24oc2Vzc2lvbik7XG4gICAgICAgIH0sIHRydWUpLmNhdGNoKCgpPT57XG4gICAgICAgICAgICB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLl9zZXRDb250cm9sbGluZ1Nlc3Npb24odGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfcGF1c2VTZXNzaW9uKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IFBhdXNpbmcgc2Vzc2lvbiAnICsgc2Vzc2lvbi51cmkgKyAnLi4uJyk7XG5cbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcbiAgICAgICAgY29uc3QgY29tbWFuZFF1ZXVlID0gc2Vzc2lvbkRhdGEuY29tbWFuZFF1ZXVlO1xuXG4gICAgICAgIHJldHVybiBjb21tYW5kUXVldWUucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICBjb21tYW5kUXVldWUucGF1c2UoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgdGhlIHNlc3Npb24gaXMgY2xvc2VkLCB3ZSBzZXQgdGhlIHBlcm1hbmVudCBmbGFnIHRvIHRydWUuXG4gICAgICAgICAgICAvLyBMaWtld2lzZSwgaWYgdGhlIHNlc3Npb24gaXMgbm90IGNsb3NlZCwgd2Ugc2V0IHRoZSBwZXJtYW5lbnQgZmxhdCB0byBmYWxzZSxcbiAgICAgICAgICAgIC8vIG1haW50YWluaW5nIHRoZSBjdXJyZW50IHNlc3Npb24gc3RhdGUuXG4gICAgICAgICAgICBjb25zdCBwZXJtYW5lbnQgPSBzZXNzaW9uLmlzQ2xvc2VkO1xuXG4gICAgICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICAgICAgaWYgKG9iamVjdFRyYWNrZXIpIG9iamVjdFRyYWNrZXIuc3RvcCgpO1xuXG4gICAgICAgICAgICBjb25zdCBhY3RpdmF0ZWREYXRhU2V0cyA9IHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzO1xuICAgICAgICAgICAgaWYgKGFjdGl2YXRlZERhdGFTZXRzKSB7XG4gICAgICAgICAgICAgICAgYWN0aXZhdGVkRGF0YVNldHMuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkLCBwZXJtYW5lbnQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBsb2FkZWREYXRhU2V0cyA9IHNlc3Npb25EYXRhLmxvYWRlZERhdGFTZXRzO1xuICAgICAgICAgICAgaWYgKGxvYWRlZERhdGFTZXRzKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkRGF0YVNldHMuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQsIHBlcm1hbmVudCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBkZWluaXRpYWxpemluZy4uLicpO1xuICAgICAgICAgICAgdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCkuc3RvcCgpO1xuICAgICAgICAgICAgdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCkuZGVpbml0KCk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5kZWluaXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5kZWluaXQoKTtcblxuICAgICAgICAgICAgaWYgKHBlcm1hbmVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Nlc3Npb25EYXRhLmRlbGV0ZShzZXNzaW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX3Jlc3VtZVNlc3Npb24oc2Vzc2lvbjogQXJnb24uU2Vzc2lvblBvcnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgY29tbWFuZFF1ZXVlID0gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKTtcblxuICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogUmVzdW1pbmcgc2Vzc2lvbiAnICsgc2Vzc2lvbi51cmkgKyAnLi4uJyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2luaXQoc2Vzc2lvbikudGhlbigoKT0+e1xuICAgICAgICAgICAgY29tbWFuZFF1ZXVlLmV4ZWN1dGUoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwcml2YXRlIF9pbml0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IGtleVByb21pc2UgPSBzZXNzaW9uRGF0YS5rZXlQcm9taXNlO1xuICAgICAgICBpZiAoIWtleVByb21pc2UpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYTogSW52YWxpZCBTdGF0ZS4gTWlzc2luZyBLZXkuJyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ga2V5UHJvbWlzZS50aGVuPHZvaWQ+KCBrZXkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLnNldExpY2Vuc2VLZXkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1Z1Zm9yaWE6IFVuYWJsZSB0byBzZXQgdGhlIGxpY2Vuc2Uga2V5JykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogaW5pdGlhbGl6aW5nLi4uJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB2dWZvcmlhLmFwaS5pbml0KCkudGhlbigocmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBJbml0IFJlc3VsdDogJyArIHJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlSW5pdFJlc3VsdCA9IHNlc3Npb25EYXRhLmluaXRSZXN1bHRSZXNvbHZlcjtcbiAgICAgICAgICAgICAgICBpZiAocmVzb2x2ZUluaXRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZUluaXRSZXN1bHQocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuaW5pdFJlc3VsdFJlc29sdmVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IHZ1Zm9yaWEuSW5pdFJlc3VsdC5TVUNDRVNTKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcih2dWZvcmlhLkluaXRSZXN1bHRbcmVzdWx0XSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgIC8vIG11c3QgaW5pdGlhbGl6ZSB0cmFja2VycyBiZWZvcmUgaW5pdGlhbGl6aW5nIHRoZSBjYW1lcmEgZGV2aWNlXG4gICAgICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaS5pbml0T2JqZWN0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZ1Zm9yaWE6IFVuYWJsZSB0byBpbml0aWFsaXplIE9iamVjdFRyYWNrZXJcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgY2FtZXJhRGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZ1Zm9yaWE6IGluaXRpYWxpemluZyBjYW1lcmEgZGV2aWNlLi4uXCIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjYW1lcmFEZXZpY2UuaW5pdCh2dWZvcmlhLkNhbWVyYURldmljZURpcmVjdGlvbi5EZWZhdWx0KSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gaW5pdGlhbGl6ZSBjYW1lcmEgZGV2aWNlJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghY2FtZXJhRGV2aWNlLnNlbGVjdFZpZGVvTW9kZSh2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZSkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNlbGVjdCB2aWRlbyBtb2RlJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghdnVmb3JpYS5hcGkuZ2V0RGV2aWNlKCkuc2V0TW9kZSh2dWZvcmlhLkRldmljZU1vZGUuQVIpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzZXQgZGV2aWNlIG1vZGUnKTtcblxuICAgICAgICAgICAgICAgIC8vIHRoaXMuY29uZmlndXJlVnVmb3JpYVZpZGVvQmFja2dyb3VuZCh7XG4gICAgICAgICAgICAgICAgLy8gICAgIHg6MCxcbiAgICAgICAgICAgICAgICAvLyAgICAgeTowLFxuICAgICAgICAgICAgICAgIC8vICAgICB3aWR0aDp2dWZvcmlhLnZpZGVvVmlldy5nZXRNZWFzdXJlZFdpZHRoKCksIFxuICAgICAgICAgICAgICAgIC8vICAgICBoZWlnaHQ6dnVmb3JpYS52aWRlb1ZpZXcuZ2V0TWVhc3VyZWRIZWlnaHQoKVxuICAgICAgICAgICAgICAgIC8vIH0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdGFydCgpKSBcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gc3RhcnQgY2FtZXJhJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBsb2FkZWREYXRhU2V0cyA9IHNlc3Npb25EYXRhLmxvYWRlZERhdGFTZXRzO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRQcm9taXNlczpQcm9taXNlPGFueT5bXSA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChsb2FkZWREYXRhU2V0cykge1xuICAgICAgICAgICAgICAgICAgICBsb2FkZWREYXRhU2V0cy5mb3JFYWNoKChpZCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRQcm9taXNlcy5wdXNoKHRoaXMuX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobG9hZFByb21pc2VzKTtcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RpdmF0ZWREYXRhU2V0cyA9IHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RpdmF0ZVByb21pc2VzOlByb21pc2U8YW55PltdID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFjdGl2YXRlZERhdGFTZXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlZERhdGFTZXRzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmF0ZVByb21pc2VzLnB1c2godGhpcy5fb2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGl2YXRlUHJvbWlzZXM7XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYTogVW5hYmxlIHRvIGdldCBvYmplY3RUcmFja2VyIGluc3RhbmNlJyk7XG4gICAgICAgICAgICAgICAgb2JqZWN0VHJhY2tlci5zdGFydCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlSW5pdChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBvcHRpb25zOntlbmNyeXB0ZWRMaWNlbnNlRGF0YT86c3RyaW5nLCBrZXk/OnN0cmluZ30pIHtcbiAgICAgICAgaWYgKCFvcHRpb25zLmtleSAmJiAhb3B0aW9ucy5lbmNyeXB0ZWRMaWNlbnNlRGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbGljZW5zZSBrZXkgd2FzIHByb3ZpZGVkLiBHZXQgb25lIGZyb20gaHR0cHM6Ly9kZXZlbG9wZXIudnVmb3JpYS5jb20vJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3Nlc3Npb25EYXRhLmhhcyhzZXNzaW9uKSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQWxyZWFkeSBpbml0aWFsaXplZCcpO1xuXG4gICAgICAgIGlmIChERUJVR19ERVZFTE9QTUVOVF9MSUNFTlNFX0tFWSkgb3B0aW9ucy5rZXkgPSBERUJVR19ERVZFTE9QTUVOVF9MSUNFTlNFX0tFWTtcblxuICAgICAgICBjb25zdCBrZXlQcm9taXNlID0gb3B0aW9ucy5rZXkgPyBcbiAgICAgICAgICAgIFByb21pc2UucmVzb2x2ZShvcHRpb25zLmtleSkgOiBcbiAgICAgICAgICAgIHRoaXMuX2RlY3J5cHRMaWNlbnNlS2V5KG9wdGlvbnMuZW5jcnlwdGVkTGljZW5zZURhdGEhLCBzZXNzaW9uKTtcblxuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IG5ldyBWdWZvcmlhU2Vzc2lvbkRhdGEoa2V5UHJvbWlzZSk7XG4gICAgICAgIHRoaXMuX3Nlc3Npb25EYXRhLnNldChzZXNzaW9uLCBzZXNzaW9uRGF0YSk7XG5cbiAgICAgICAgY29uc3QgaW5pdFJlc3VsdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlKT0+e1xuICAgICAgICAgICAgc2Vzc2lvbkRhdGEuaW5pdFJlc3VsdFJlc29sdmVyID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VsZWN0Q29udHJvbGxpbmdTZXNzaW9uKCk7XG5cbiAgICAgICAgcmV0dXJuIGluaXRSZXN1bHQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlQ2xvc2Uoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID09PSBzZXNzaW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9zZWxlY3RDb250cm9sbGluZ1Nlc3Npb24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9oYW5kbGVPYmplY3RUcmFja2VyQ3JlYXRlRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCB1cmk6c3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBmZXRjaERhdGFTZXQodXJpKS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICAgICAgbGV0IGlkID0gc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuZ2V0KHVyaSk7XG4gICAgICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICAgICAgaWQgPSBBcmdvbi5DZXNpdW0uY3JlYXRlR3VpZCgpO1xuICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRJZEJ5VXJpLnNldCh1cmksIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5kYXRhU2V0VXJpQnlJZC5zZXQoaWQsIHVyaSk7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgcmV0dXJuIHtpZH07XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9vYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZyk6IFByb21pc2U8QXJnb24uVnVmb3JpYVRyYWNrYWJsZXM+IHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcblxuICAgICAgICBjb25zdCB1cmkgPSBzZXNzaW9uRGF0YS5kYXRhU2V0VXJpQnlJZC5nZXQoaWQpO1xuICAgICAgICBpZiAoIXVyaSkgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiBVbmtub3duIERhdGFTZXQgaWQ6ICR7aWR9YCk7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmICghb2JqZWN0VHJhY2tlcikgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhOiBJbnZhbGlkIFN0YXRlLiBVbmFibGUgdG8gZ2V0IE9iamVjdFRyYWNrZXIgaW5zdGFuY2UuJylcblxuICAgICAgICBsZXQgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcblxuICAgICAgICBsZXQgdHJhY2thYmxlc1Byb21pc2U6UHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz47XG5cbiAgICAgICAgaWYgKGRhdGFTZXQpIHtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2dldFRyYWNrYWJsZXNGcm9tRGF0YVNldChkYXRhU2V0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYTogTG9hZGluZyBkYXRhc2V0ICgke2lkfSkgZnJvbSAke3VyaX0uLi5gKTtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNQcm9taXNlID0gZmV0Y2hEYXRhU2V0KHVyaSkudGhlbjxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4oKGxvY2F0aW9uKT0+e1xuICAgICAgICAgICAgICAgIGRhdGFTZXQgPSBvYmplY3RUcmFja2VyLmNyZWF0ZURhdGFTZXQoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGFTZXQpIHRocm93IG5ldyBFcnJvcihgVnVmb3JpYTogVW5hYmxlIHRvIGNyZWF0ZSBkYXRhc2V0IGluc3RhbmNlYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGRhdGFTZXQubG9hZChsb2NhdGlvbiwgdnVmb3JpYS5TdG9yYWdlVHlwZS5BYnNvbHV0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5zZXQoaWQsIGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5sb2FkZWREYXRhU2V0cy5hZGQoaWQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVzID0gdGhpcy5fZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYSBsb2FkZWQgZGF0YXNldCBmaWxlIHdpdGggdHJhY2thYmxlczpcXG4nICsgSlNPTi5zdHJpbmdpZnkodHJhY2thYmxlcykpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhY2thYmxlcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvYmplY3RUcmFja2VyLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVbmFibGUgdG8gbG9hZCBkb3dubG9hZGVkIGRhdGFzZXQgYXQgJHtsb2NhdGlvbn0gZnJvbSAke3VyaX1gKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBsb2FkIGRhdGFzZXQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApIHtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNQcm9taXNlLnRoZW4oKHRyYWNrYWJsZXMpPT57XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdhci52dWZvcmlhLm9iamVjdFRyYWNrZXJMb2FkRGF0YVNldEV2ZW50JywgeyBpZCwgdHJhY2thYmxlcyB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRyYWNrYWJsZXNQcm9taXNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2dldFRyYWNrYWJsZXNGcm9tRGF0YVNldChkYXRhU2V0OnZ1Zm9yaWEuRGF0YVNldCkge1xuICAgICAgICBjb25zdCBudW1UcmFja2FibGVzID0gZGF0YVNldC5nZXROdW1UcmFja2FibGVzKCk7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZXM6QXJnb24uVnVmb3JpYVRyYWNrYWJsZXMgPSB7fTtcbiAgICAgICAgZm9yIChsZXQgaT0wOyBpIDwgbnVtVHJhY2thYmxlczsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCB0cmFja2FibGUgPSA8dnVmb3JpYS5UcmFja2FibGU+ZGF0YVNldC5nZXRUcmFja2FibGUoaSk7XG4gICAgICAgICAgICB0cmFja2FibGVzW3RyYWNrYWJsZS5nZXROYW1lKCldID0ge1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLl9nZXRJZEZvclRyYWNrYWJsZSh0cmFja2FibGUpLFxuICAgICAgICAgICAgICAgIHNpemU6IHRyYWNrYWJsZSBpbnN0YW5jZW9mIHZ1Zm9yaWEuT2JqZWN0VGFyZ2V0ID8gdHJhY2thYmxlLmdldFNpemUoKSA6IHt4OjAseTowLHo6MH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJhY2thYmxlcztcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVPYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6c3RyaW5nKSA6IFByb21pc2U8QXJnb24uVnVmb3JpYVRyYWNrYWJsZXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbikucHVzaCgoKT0+e1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9vYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb246IEFyZ29uLlNlc3Npb25Qb3J0LCBpZDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhIGFjdGl2YXRpbmcgZGF0YXNldCAoJHtpZH0pYCk7XG5cbiAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWE6IEludmFsaWQgU3RhdGUuIFVuYWJsZSB0byBnZXQgT2JqZWN0VHJhY2tlciBpbnN0YW5jZS4nKVxuXG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG5cbiAgICAgICAgbGV0IGRhdGFTZXQgPSBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLmdldChpZCk7XG4gICAgICAgIGxldCBkYXRhU2V0UHJvbWlzZTpQcm9taXNlPHZ1Zm9yaWEuRGF0YVNldD47XG4gICAgICAgIGlmICghZGF0YVNldCkge1xuICAgICAgICAgICAgZGF0YVNldFByb21pc2UgPSB0aGlzLl9vYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpITtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhU2V0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShkYXRhU2V0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkYXRhU2V0UHJvbWlzZS50aGVuKChkYXRhU2V0KT0+e1xuICAgICAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyLmFjdGl2YXRlRGF0YVNldChkYXRhU2V0KSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IFVuYWJsZSB0byBhY3RpdmF0ZSBkYXRhU2V0ICR7aWR9YCk7XG4gICAgICAgICAgICBzZXNzaW9uRGF0YS5hY3RpdmF0ZWREYXRhU2V0cy5hZGQoaWQpO1xuICAgICAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApXG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdhci52dWZvcmlhLm9iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXRFdmVudCcsIHsgaWQgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6c3RyaW5nKSA6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbjogQXJnb24uU2Vzc2lvblBvcnQsIGlkOiBzdHJpbmcsIHBlcm1hbmVudD10cnVlKTogYm9vbGVhbiB7ICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgZGVhY3RpdmF0aW5nIGRhdGFzZXQgKCR7aWR9KWApO1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikge1xuICAgICAgICAgICAgY29uc3QgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcbiAgICAgICAgICAgIGlmIChkYXRhU2V0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdWNjZXNzID0gb2JqZWN0VHJhY2tlci5kZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0KTtcbiAgICAgICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5hY3RpdmF0ZWREYXRhU2V0cy5kZWxldGUoaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLnZlcnNpb25bMF0gPiAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdhci52dWZvcmlhLm9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Y2Nlc3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbikucHVzaCgoKT0+e1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVnVmb3JpYTogdW5hYmxlIHRvIGFjdGl2YXRlIGRhdGFzZXQgJHtpZH1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOiBzdHJpbmcsIHBlcm1hbmVudD10cnVlKTogYm9vbGVhbiB7ICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYTogdW5sb2FkaW5nIGRhdGFzZXQgKCR7aWR9KS4uLmApO1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikge1xuICAgICAgICAgICAgY29uc3QgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcbiAgICAgICAgICAgIGlmIChkYXRhU2V0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVkID0gb2JqZWN0VHJhY2tlci5kZXN0cm95RGF0YVNldChkYXRhU2V0KTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSBzZXNzaW9uRGF0YS5kYXRhU2V0VXJpQnlJZC5nZXQoaWQpITtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRJZEJ5VXJpLmRlbGV0ZSh1cmkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEubG9hZGVkRGF0YVNldHMuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXRFdmVudCcsIHsgaWQgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkZWxldGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVPYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldENvbW1hbmRRdWV1ZUZvclNlc3Npb24oc2Vzc2lvbikucHVzaCgoKT0+e1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldChzZXNzaW9uLCBpZCkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiB1bmFibGUgdG8gdW5sb2FkIGRhdGFzZXQgJHtpZH1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZTp2dWZvcmlhLlRyYWNrYWJsZSkgOiBzdHJpbmcge1xuICAgICAgICBpZiAodHJhY2thYmxlIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiAndnVmb3JpYV9vYmplY3RfdGFyZ2V0XycgKyB0cmFja2FibGUuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAndnVmb3JpYV90cmFja2FibGVfJyArIHRyYWNrYWJsZS5nZXRJZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZGVjcnlwdExpY2Vuc2VLZXkoZW5jcnlwdGVkTGljZW5zZURhdGE6c3RyaW5nLCBzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSA6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBkZWNyeXB0KGVuY3J5cHRlZExpY2Vuc2VEYXRhLnRyaW0oKSkudGhlbigoanNvbik9PntcbiAgICAgICAgICAgIGNvbnN0IHtrZXksb3JpZ2luc30gOiB7a2V5OnN0cmluZyxvcmlnaW5zOnN0cmluZ1tdfSA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICBpZiAoIXNlc3Npb24udXJpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgb3JpZ2luJyk7XG5cbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbiA9IFVSSS5wYXJzZShzZXNzaW9uLnVyaSk7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoPGFueT5vcmlnaW5zKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZ1Zm9yaWEgTGljZW5zZSBEYXRhIG11c3Qgc3BlY2lmeSBhbGxvd2VkIG9yaWdpbnNcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gb3JpZ2lucy5maW5kKChvKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBvLnNwbGl0KC9cXC8oLiopLyk7XG4gICAgICAgICAgICAgICAgbGV0IGRvbWFpblBhdHRlcm4gPSBwYXJ0c1swXTtcbiAgICAgICAgICAgICAgICBsZXQgcGF0aFBhdHRlcm4gPSBwYXJ0c1sxXSB8fCAnKionO1xuICAgICAgICAgICAgICAgIHJldHVybiBtaW5pbWF0Y2gob3JpZ2luLmhvc3RuYW1lLCBkb21haW5QYXR0ZXJuKSAmJiBtaW5pbWF0Y2gob3JpZ2luLnBhdGgsIHBhdGhQYXR0ZXJuKTtcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGlmICghbWF0Y2ggJiYgIURFQlVHX0RJU0FCTEVfT1JJR0lOX0NIRUNLKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG9yaWdpbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jb25maWcgPSA8dnVmb3JpYS5WaWRlb0JhY2tncm91bmRDb25maWc+e307XG5cbiAgICBwdWJsaWMgY29uZmlndXJlVnVmb3JpYVZpZGVvQmFja2dyb3VuZCh2aWV3cG9ydDpBcmdvbi5WaWV3cG9ydCwgZW5hYmxlZDpib29sZWFuLCByZWZsZWN0aW9uPXZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kUmVmbGVjdGlvbi5EZWZhdWx0KSB7XG4gICAgICAgIGNvbnN0IHZpZXdXaWR0aCA9IHZpZXdwb3J0LndpZHRoO1xuICAgICAgICBjb25zdCB2aWV3SGVpZ2h0ID0gdmlld3BvcnQuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2FtZXJhRGV2aWNlID0gdnVmb3JpYS5hcGkuZ2V0Q2FtZXJhRGV2aWNlKCk7XG4gICAgICAgIGNvbnN0IHZpZGVvTW9kZSA9IGNhbWVyYURldmljZS5nZXRWaWRlb01vZGUodnVmb3JpYUNhbWVyYURldmljZU1vZGUpO1xuICAgICAgICBsZXQgdmlkZW9XaWR0aCA9IHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgbGV0IHZpZGVvSGVpZ2h0ID0gdmlkZW9Nb2RlLmhlaWdodDtcbiAgICAgICAgXG4gICAgICAgIGlmIChzY3JlZW5PcmllbnRhdGlvbiA9PT0gMCB8fCBzY3JlZW5PcmllbnRhdGlvbiA9PT0gMTgwKSB7XG4gICAgICAgICAgICB2aWRlb1dpZHRoID0gdmlkZW9Nb2RlLmhlaWdodDtcbiAgICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3aWR0aFJhdGlvID0gdmlld1dpZHRoIC8gdmlkZW9XaWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0UmF0aW8gPSB2aWV3SGVpZ2h0IC8gdmlkZW9IZWlnaHQ7XG4gICAgICAgIC8vIGFzcGVjdCBmaWxsXG4gICAgICAgIGNvbnN0IHNjYWxlID0gTWF0aC5tYXgod2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuICAgICAgICAvLyBhc3BlY3QgZml0XG4gICAgICAgIC8vIGNvbnN0IHNjYWxlID0gTWF0aC5taW4od2lkdGhSYXRpbywgaGVpZ2h0UmF0aW8pO1xuXG4gICAgICAgIGNvbnN0IHZpZGVvVmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgICAgICBjb25zdCBjb250ZW50U2NhbGVGYWN0b3IgPSB2aWRlb1ZpZXcuaW9zID8gdmlkZW9WaWV3Lmlvcy5jb250ZW50U2NhbGVGYWN0b3IgOiAxO1xuICAgICAgICBcbiAgICAgICAgLy8gYXBwbHkgdGhlIHZpZGVvIGNvbmZpZ1xuICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLl9jb25maWc7IFxuICAgICAgICBjb25maWcuZW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgICAgIGNvbmZpZy5zaXplWCA9IHZpZGVvV2lkdGggKiBzY2FsZSAqIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgY29uZmlnLnNpemVZID0gdmlkZW9IZWlnaHQgKiBzY2FsZSAqIGNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICAgICAgY29uZmlnLnBvc2l0aW9uWCA9IDA7XG4gICAgICAgIGNvbmZpZy5wb3NpdGlvblkgPSAwO1xuICAgICAgICBjb25maWcucmVmbGVjdGlvbiA9IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kUmVmbGVjdGlvbi5EZWZhdWx0O1xuICAgICAgICBcbiAgICAgICAgLy8gY29uc29sZS5sb2coYFZ1Zm9yaWEgY29uZmlndXJpbmcgdmlkZW8gYmFja2dyb3VuZC4uLlxuICAgICAgICAvLyAgICAgY29udGVudFNjYWxlRmFjdG9yOiAke2NvbnRlbnRTY2FsZUZhY3Rvcn0gb3JpZW50YXRpb246ICR7b3JpZW50YXRpb259IFxuICAgICAgICAvLyAgICAgdmlld1dpZHRoOiAke3ZpZXdXaWR0aH0gdmlld0hlaWdodDogJHt2aWV3SGVpZ2h0fSB2aWRlb1dpZHRoOiAke3ZpZGVvV2lkdGh9IHZpZGVvSGVpZ2h0OiAke3ZpZGVvSGVpZ2h0fSBcbiAgICAgICAgLy8gICAgIGNvbmZpZzogJHtKU09OLnN0cmluZ2lmeShjb25maWcpfVxuICAgICAgICAvLyBgKTtcblxuICAgICAgICBBYnNvbHV0ZUxheW91dC5zZXRMZWZ0KHZpZGVvVmlldywgdmlld3BvcnQueCk7XG4gICAgICAgIEFic29sdXRlTGF5b3V0LnNldFRvcCh2aWRlb1ZpZXcsIHZpZXdwb3J0LnkpO1xuICAgICAgICB2aWRlb1ZpZXcud2lkdGggPSB2aWV3V2lkdGg7XG4gICAgICAgIHZpZGVvVmlldy5oZWlnaHQgPSB2aWV3SGVpZ2h0O1xuICAgICAgICB2dWZvcmlhLmFwaS5nZXRSZW5kZXJlcigpLnNldFZpZGVvQmFja2dyb3VuZENvbmZpZyhjb25maWcpO1xuICAgIH1cbn1cblxuLy8gVE9ETzogbWFrZSB0aGlzIGNyb3NzIHBsYXRmb3JtIHNvbWVob3dcbmZ1bmN0aW9uIGZldGNoRGF0YVNldCh4bWxVcmxTdHJpbmc6c3RyaW5nKSA6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgeG1sVXJsID0gTlNVUkwuVVJMV2l0aFN0cmluZyh4bWxVcmxTdHJpbmcpO1xuICAgIGNvbnN0IGRhdFVybCA9IHhtbFVybC5VUkxCeURlbGV0aW5nUGF0aEV4dGVuc2lvbi5VUkxCeUFwcGVuZGluZ1BhdGhFeHRlbnNpb24oXCJkYXRcIik7XG4gICAgXG4gICAgY29uc3QgZGlyZWN0b3J5UGF0aFVybCA9IHhtbFVybC5VUkxCeURlbGV0aW5nTGFzdFBhdGhDb21wb25lbnQ7XG4gICAgY29uc3QgZGlyZWN0b3J5SGFzaCA9IGRpcmVjdG9yeVBhdGhVcmwuaGFzaDtcbiAgICBjb25zdCB0bXBQYXRoID0gZmlsZS5rbm93bkZvbGRlcnMudGVtcCgpLnBhdGg7XG4gICAgY29uc3QgZGlyZWN0b3J5SGFzaFBhdGggPSB0bXBQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGRpcmVjdG9yeUhhc2g7XG4gICAgXG4gICAgZmlsZS5Gb2xkZXIuZnJvbVBhdGgoZGlyZWN0b3J5SGFzaFBhdGgpO1xuICAgIFxuICAgIGNvbnN0IHhtbERlc3RQYXRoID0gZGlyZWN0b3J5SGFzaFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgeG1sVXJsLmxhc3RQYXRoQ29tcG9uZW50O1xuICAgIGNvbnN0IGRhdERlc3RQYXRoID0gZGlyZWN0b3J5SGFzaFBhdGggKyBmaWxlLnBhdGguc2VwYXJhdG9yICsgZGF0VXJsLmxhc3RQYXRoQ29tcG9uZW50O1xuICAgIFxuICAgIGZ1bmN0aW9uIGRvd25sb2FkSWZOZWVkZWQodXJsOnN0cmluZywgZGVzdFBhdGg6c3RyaW5nKSB7XG4gICAgICAgIGxldCBsYXN0TW9kaWZpZWQ6RGF0ZXx1bmRlZmluZWQ7XG4gICAgICAgIGlmIChmaWxlLkZpbGUuZXhpc3RzKGRlc3RQYXRoKSkge1xuICAgICAgICAgICAgY29uc3QgZiA9IGZpbGUuRmlsZS5mcm9tUGF0aChkZXN0UGF0aCk7XG4gICAgICAgICAgICBsYXN0TW9kaWZpZWQgPSBmLmxhc3RNb2RpZmllZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHR0cC5yZXF1ZXN0KHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIG1ldGhvZDonR0VUJyxcbiAgICAgICAgICAgIGhlYWRlcnM6IGxhc3RNb2RpZmllZCA/IHtcbiAgICAgICAgICAgICAgICAnSWYtTW9kaWZpZWQtU2luY2UnOiBsYXN0TW9kaWZpZWQudG9VVENTdHJpbmcoKVxuICAgICAgICAgICAgfSA6IHVuZGVmaW5lZFxuICAgICAgICB9KS50aGVuKChyZXNwb25zZSk9PntcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAzMDQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVmVyaWZpZWQgdGhhdCBjYWNoZWQgdmVyc2lvbiBvZiBmaWxlICR7dXJsfSBhdCAke2Rlc3RQYXRofSBpcyB1cC10by1kYXRlLmApXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3RQYXRoO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5jb250ZW50ICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAzMDApIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYERvd25sb2FkZWQgZmlsZSAke3VybH0gdG8gJHtkZXN0UGF0aH1gKVxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5jb250ZW50LnRvRmlsZShkZXN0UGF0aCkucGF0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5hYmxlIHRvIGRvd25sb2FkIGZpbGUgXCIgKyB1cmwgKyBcIiAgKEhUVFAgc3RhdHVzIGNvZGU6IFwiICsgcmVzcG9uc2Uuc3RhdHVzQ29kZSArIFwiKVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgZG93bmxvYWRJZk5lZWRlZCh4bWxVcmwuYWJzb2x1dGVTdHJpbmcseG1sRGVzdFBhdGgpLCBcbiAgICAgICAgZG93bmxvYWRJZk5lZWRlZChkYXRVcmwuYWJzb2x1dGVTdHJpbmcsZGF0RGVzdFBhdGgpXG4gICAgXSkudGhlbigoKT0+eG1sRGVzdFBhdGgpO1xufSAiXX0=