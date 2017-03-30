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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tdnVmb3JpYS1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXZ1Zm9yaWEtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxzQ0FBd0M7QUFDeEMsOENBQWdEO0FBQ2hELDJCQUE2QjtBQUM3QixrQ0FBb0M7QUFDcEMsbUNBQXFDO0FBQ3JDLDhEQUEwRDtBQUMxRCwrQkFBb0Q7QUFDcEQscUNBQXNDO0FBQ3RDLDJCQUE0QjtBQUU1QixJQUFNLDZCQUE2QixHQUFvQixTQUFTLENBQUMsQ0FBQyxzQkFBc0I7QUFDeEYsSUFBTSwwQkFBMEIsR0FBVyxJQUFJLENBQUM7QUFFbkMsUUFBQSx1QkFBdUIsR0FBNEIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQztBQUN4RyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDZixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUksQ0FBQyxrQkFBa0I7UUFDOUMsK0JBQXVCLEtBQWdDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1lBQzdGLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDN0MsQ0FBQztBQUVZLFFBQUEsV0FBVyxHQUFHLENBQUMsR0FBRyxHQUFDLEVBQUUsQ0FBQztBQUVuQyxJQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNyQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUMzQyxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUUz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ckYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBbUIsR0FBRyxZQUFPLFFBQVUsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2xELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixHQUFHLEdBQUcsR0FBRyx1QkFBdUIsR0FBRyxRQUFRLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzVHLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUNmLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUMsV0FBVyxDQUFDO1FBQ25ELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUMsV0FBVyxDQUFDO0tBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBSSxPQUFBLFdBQVcsRUFBWCxDQUFXLENBQUMsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBmaWxlIGZyb20gJ2ZpbGUtc3lzdGVtJztcbmltcG9ydCAqIGFzIHBsYXRmb3JtIGZyb20gJ3BsYXRmb3JtJztcbmltcG9ydCB7QWJzb2x1dGVMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvYWJzb2x1dGUtbGF5b3V0JztcbmltcG9ydCB7ZGVjcnlwdCwgZ2V0U2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIG1pbmltYXRjaCBmcm9tICdtaW5pbWF0Y2gnXG5pbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnXG5cbmNvbnN0IERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZOnN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7IC8vICd5b3VyX2xpY2Vuc2Vfa2V5JztcbmNvbnN0IERFQlVHX0RJU0FCTEVfT1JJR0lOX0NIRUNLOmJvb2xlYW4gPSB0cnVlO1xuXG5leHBvcnQgY29uc3QgdnVmb3JpYUNhbWVyYURldmljZU1vZGU6dnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlID0gdnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlLk9waW1pemVRdWFsaXR5O1xuaWYgKHZ1Zm9yaWEudmlkZW9WaWV3Lmlvcykge1xuICAgICg8VUlWaWV3PnZ1Zm9yaWEudmlkZW9WaWV3LmlvcykuY29udGVudFNjYWxlRmFjdG9yID0gXG4gICAgICAgIHZ1Zm9yaWFDYW1lcmFEZXZpY2VNb2RlID09PSA8dnVmb3JpYS5DYW1lcmFEZXZpY2VNb2RlPiB2dWZvcmlhLkNhbWVyYURldmljZU1vZGUuT3B0aW1pemVTcGVlZCA/IFxuICAgICAgICAxIDogcGxhdGZvcm0uc2NyZWVuLm1haW5TY3JlZW4uc2NhbGU7XG59XG5cbmV4cG9ydCBjb25zdCBWSURFT19ERUxBWSA9IC0wLjUvNjA7XG5cbmNvbnN0IE1hdHJpeDQgPSBBcmdvbi5DZXNpdW0uTWF0cml4NDtcbmNvbnN0IENhcnRlc2lhbjMgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMztcbmNvbnN0IFF1YXRlcm5pb24gPSBBcmdvbi5DZXNpdW0uUXVhdGVybmlvbjtcbmNvbnN0IEp1bGlhbkRhdGUgPSBBcmdvbi5DZXNpdW0uSnVsaWFuRGF0ZTtcbmNvbnN0IENlc2l1bU1hdGggPSBBcmdvbi5DZXNpdW0uQ2VzaXVtTWF0aDtcblxuY29uc3QgeDE4MCA9IFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWCwgQ2VzaXVtTWF0aC5QSSk7XG5cbmNsYXNzIFZ1Zm9yaWFTZXNzaW9uRGF0YSB7XG4gICAgY29tbWFuZFF1ZXVlID0gbmV3IEFyZ29uLkNvbW1hbmRRdWV1ZTtcbiAgICBpbml0UmVzdWx0UmVzb2x2ZXI/OihyZXN1bHQ6dnVmb3JpYS5Jbml0UmVzdWx0KT0+dm9pZDtcbiAgICBsb2FkZWREYXRhU2V0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGFjdGl2YXRlZERhdGFTZXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZGF0YVNldFVyaUJ5SWQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGRhdGFTZXRJZEJ5VXJpID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBkYXRhU2V0SW5zdGFuY2VCeUlkID0gbmV3IE1hcDxzdHJpbmcsIHZ1Zm9yaWEuRGF0YVNldD4oKTtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMga2V5UHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+KSB7fVxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIge1xuXG4gICAgcHVibGljIHN0YXRlVXBkYXRlRXZlbnQgPSBuZXcgQXJnb24uRXZlbnQ8QXJnb24uQ2VzaXVtLkp1bGlhbkRhdGU+KCk7XG4gICAgXG4gICAgcHVibGljIHZ1Zm9yaWFUcmFja2VyRW50aXR5ID0gbmV3IEFyZ29uLkNlc2l1bS5FbnRpdHkoe1xuICAgICAgICBwb3NpdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkoQ2FydGVzaWFuMy5aRVJPLCB0aGlzLmNvbnRleHRTZXJ2aWNlLnVzZXIpLFxuICAgICAgICBvcmllbnRhdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KFF1YXRlcm5pb24uSURFTlRJVFkpXG4gICAgfSk7XG5cbiAgICBwcml2YXRlIF9zY3JhdGNoQ2FydGVzaWFuID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zKCk7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFF1YXRlcm5pb24gPSBuZXcgQXJnb24uQ2VzaXVtLlF1YXRlcm5pb24oKTtcblx0cHJpdmF0ZSBfc2NyYXRjaE1hdHJpeDMgPSBuZXcgQXJnb24uQ2VzaXVtLk1hdHJpeDMoKTtcblxuICAgIHByaXZhdGUgX2NvbnRyb2xsaW5nU2Vzc2lvbj86IEFyZ29uLlNlc3Npb25Qb3J0O1xuICAgIHByaXZhdGUgX3Nlc3Npb25Td2l0Y2hlckNvbW1hbmRRdWV1ZSA9IG5ldyBBcmdvbi5Db21tYW5kUXVldWUoKTtcblxuICAgIHByaXZhdGUgX3Nlc3Npb25EYXRhID0gbmV3IFdlYWtNYXA8QXJnb24uU2Vzc2lvblBvcnQsVnVmb3JpYVNlc3Npb25EYXRhPigpO1xuICAgIFxuXHRjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHByaXZhdGUgc2Vzc2lvblNlcnZpY2U6QXJnb24uU2Vzc2lvblNlcnZpY2UsXG4gICAgICAgICAgICBwcml2YXRlIGZvY3VzU2VydmljZVByb3ZpZGVyOkFyZ29uLkZvY3VzU2VydmljZVByb3ZpZGVyLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZTpBcmdvbi5Db250ZXh0U2VydmljZSxcbiAgICAgICAgICAgIC8vIHByaXZhdGUgZGV2aWNlU2VydmljZTpBcmdvbi5EZXZpY2VTZXJ2aWNlLFxuICAgICAgICAgICAgcHJpdmF0ZSBjb250ZXh0U2VydmljZVByb3ZpZGVyOkFyZ29uLkNvbnRleHRTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgICAgICByZWFsaXR5U2VydmljZTpBcmdvbi5SZWFsaXR5U2VydmljZSkge1xuXG4gICAgICAgIC8vIHRoaXMuc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgLy8gICAgIHRoaXMuc3RhdGVVcGRhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgIC8vICAgICAgICAgY29uc3QgcmVhbGl0eSA9IHRoaXMuY29udGV4dFNlcnZpY2Uuc2VyaWFsaXplZEZyYW1lU3RhdGUucmVhbGl0eTtcbiAgICAgICAgLy8gICAgICAgICBpZiAocmVhbGl0eSA9PT0gQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFKSB0aGlzLmRldmljZVNlcnZpY2UudXBkYXRlKCk7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy8gICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgLy8gICAgICAgICBjb25zdCByZWFsaXR5ID0gdGhpcy5jb250ZXh0U2VydmljZS5zZXJpYWxpemVkRnJhbWVTdGF0ZS5yZWFsaXR5O1xuICAgICAgICAvLyAgICAgICAgIGlmIChyZWFsaXR5ICE9PSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkUpIHRoaXMuZGV2aWNlU2VydmljZS51cGRhdGUoKTtcbiAgICAgICAgLy8gICAgIH0sIDYwKVxuICAgICAgICAvLyB9KVxuICAgICAgICBcbiAgICAgICAgc2Vzc2lvblNlcnZpY2UuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHNlc3Npb24pPT57XG4gICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5pc0F2YWlsYWJsZSddID0gXG4gICAgICAgICAgICAgICAgICAgICgpID0+IFByb21pc2UucmVzb2x2ZSh7YXZhaWxhYmxlOiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEuaW5pdCddID0gXG4gICAgICAgICAgICAgICAgICAgIChpbml0T3B0aW9ucykgPT4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiVnVmb3JpYSBpcyBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm1cIikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmlzQXZhaWxhYmxlJ10gPSBcbiAgICAgICAgICAgICAgICAgICAgKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHthdmFpbGFibGU6ICEhdnVmb3JpYS5hcGl9KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmluaXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICBpbml0T3B0aW9ucyA9PiB0aGlzLl9oYW5kbGVJbml0KHNlc3Npb24sIGluaXRPcHRpb25zKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0J10gPSBcbiAgICAgICAgICAgICAgICAgICAgKHt1cmx9Ont1cmw6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckNyZWF0ZURhdGFTZXQoc2Vzc2lvbiwgdXJsKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJMb2FkRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyTG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLm9iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldCddID0gXG4gICAgICAgICAgICAgICAgICAgICh7aWR9OntpZDpzdHJpbmd9KSA9PiB0aGlzLl9oYW5kbGVPYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ub25bJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQnXSA9IFxuICAgICAgICAgICAgICAgICAgICAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbiwgaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdGFiaWxpdHlcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRGZXRjaCddID0gc2Vzc2lvbi5vblsnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyTG9hZERhdGFTZXQnXTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLm9uWydhci52dWZvcmlhLmRhdGFTZXRMb2FkJ10gPSAoe2lkfTp7aWQ6c3RyaW5nfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlT2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpID0+IHRoaXMuX2hhbmRsZUNsb3NlKHNlc3Npb24pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF2dWZvcmlhLmFwaSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gLy8gc3dpdGNoIHRvIEFSIG1vZGUgd2hlbiBMSVZFIHJlYWxpdHkgaXMgcHJlc2VudGluZ1xuICAgICAgICAvLyByZWFsaXR5U2VydmljZS5jaGFuZ2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7Y3VycmVudH0pPT57XG4gICAgICAgIC8vICAgICB0aGlzLl9zZXREZXZpY2VNb2RlKFxuICAgICAgICAvLyAgICAgICAgIGN1cnJlbnQgPT09IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRSA/IFxuICAgICAgICAvLyAgICAgICAgICAgICB2dWZvcmlhLkRldmljZU1vZGUuQVIgOiB2dWZvcmlhLkRldmljZU1vZGUuVlJcbiAgICAgICAgLy8gICAgICk7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbGFuZHNjYXBlUmlnaHRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgPSAtQ2VzaXVtTWF0aC5QSV9PVkVSX1RXTztcblxuICAgICAgICBjb25zdCBzdGF0ZVVwZGF0ZUNhbGxiYWNrID0gKHN0YXRlOnZ1Zm9yaWEuU3RhdGUpID0+IHsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRpbWUgPSBKdWxpYW5EYXRlLm5vdygpO1xuICAgICAgICAgICAgLy8gc3VidHJhY3QgYSBmZXcgbXMsIHNpbmNlIHRoZSB2aWRlbyBmcmFtZSByZXByZXNlbnRzIGEgdGltZSBzbGlnaHRseSBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgIC8vIFRPRE86IGlmIHdlIGFyZSB1c2luZyBhbiBvcHRpY2FsIHNlZS10aHJvdWdoIGRpc3BsYXksIGxpa2UgaG9sb2xlbnMsXG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRvIGRvIHRoZSBvcHBvc2l0ZSwgYW5kIGRvIGZvcndhcmQgcHJlZGljdGlvbiAodGhvdWdoIGlkZWFsbHkgbm90IGhlcmUsIFxuICAgICAgICAgICAgLy8gYnV0IGluIGVhY2ggYXBwIGl0c2VsZiB0byB3ZSBhcmUgYXMgY2xvc2UgYXMgcG9zc2libGUgdG8gdGhlIGFjdHVhbCByZW5kZXIgdGltZSB3aGVuXG4gICAgICAgICAgICAvLyB3ZSBzdGFydCB0aGUgcmVuZGVyKVxuICAgICAgICAgICAgSnVsaWFuRGF0ZS5hZGRTZWNvbmRzKHRpbWUsIFZJREVPX0RFTEFZLCB0aW1lKTtcblxuICAgICAgICAgICAgLy8gUm90YXRlIHRoZSB0cmFja2VyIHRvIGEgbGFuZHNjYXBlLXJpZ2h0IGZyYW1lLCBcbiAgICAgICAgICAgIC8vIHdoZXJlICtYIGlzIHJpZ2h0LCArWSBpcyBkb3duLCBhbmQgK1ogaXMgaW4gdGhlIGNhbWVyYSBkaXJlY3Rpb25cbiAgICAgICAgICAgIC8vICh2dWZvcmlhIHJlcG9ydHMgcG9zZXMgaW4gdGhpcyBmcmFtZSBvbiBpT1MgZGV2aWNlcywgbm90IHN1cmUgYWJvdXQgYW5kcm9pZClcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgPSBnZXRTY3JlZW5PcmllbnRhdGlvbigpICogQ2VzaXVtTWF0aC5SQURJQU5TX1BFUl9ERUdSRUU7XG4gICAgICAgICAgICBjb25zdCB0cmFja2VyT3JpZW50YXRpb24gPSBRdWF0ZXJuaW9uLm11bHRpcGx5KFxuICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uZnJvbUF4aXNBbmdsZShDYXJ0ZXNpYW4zLlVOSVRfWiwgbGFuZHNjYXBlUmlnaHRTY3JlZW5PcmllbnRhdGlvblJhZGlhbnMgLSBjdXJyZW50U2NyZWVuT3JpZW50YXRpb25SYWRpYW5zLCB0aGlzLl9zY3JhdGNoUXVhdGVybmlvbiksXG4gICAgICAgICAgICAgICAgeDE4MCxcbiAgICAgICAgICAgICAgICB0aGlzLl9zY3JhdGNoUXVhdGVybmlvbik7XG4gICAgICAgICAgICAodGhpcy52dWZvcmlhVHJhY2tlckVudGl0eS5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUodHJhY2tlck9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdnVmb3JpYUZyYW1lID0gc3RhdGUuZ2V0RnJhbWUoKTtcbiAgICAgICAgICAgIGNvbnN0IGZyYW1lVGltZVN0YW1wID0gdnVmb3JpYUZyYW1lLmdldFRpbWVTdGFtcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB1cGRhdGUgdHJhY2thYmxlIHJlc3VsdHMgaW4gY29udGV4dCBlbnRpdHkgY29sbGVjdGlvblxuICAgICAgICAgICAgY29uc3QgbnVtVHJhY2thYmxlUmVzdWx0cyA9IHN0YXRlLmdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTtcbiAgICAgICAgICAgIGZvciAobGV0IGk9MDsgaSA8IG51bVRyYWNrYWJsZVJlc3VsdHM7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZVJlc3VsdCA9IDx2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdD5zdGF0ZS5nZXRUcmFja2FibGVSZXN1bHQoaSk7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdHJhY2thYmxlUmVzdWx0LmdldFRyYWNrYWJsZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSB0cmFja2FibGUuZ2V0TmFtZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy5fZ2V0SWRGb3JUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gY29udGV4dFNlcnZpY2UuZW50aXRpZXMuZ2V0QnlJZChpZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5ID0gbmV3IEFyZ29uLkNlc2l1bS5FbnRpdHkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5ldyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHkodGhpcy52dWZvcmlhVHJhY2tlckVudGl0eSksXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmllbnRhdGlvbjogbmV3IEFyZ29uLkNlc2l1bS5TYW1wbGVkUHJvcGVydHkoQXJnb24uQ2VzaXVtLlF1YXRlcm5pb24pXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpdHlQb3NpdGlvbiA9IGVudGl0eS5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudGl0eU9yaWVudGF0aW9uID0gZW50aXR5Lm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5TYW1wbGVkUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eVBvc2l0aW9uLm1heE51bVNhbXBsZXMgPSAxMDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5T3JpZW50YXRpb24ubWF4TnVtU2FtcGxlcyA9IDEwO1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHlQb3NpdGlvbi5mb3J3YXJkRXh0cmFwb2xhdGlvblR5cGUgPSBBcmdvbi5DZXNpdW0uRXh0cmFwb2xhdGlvblR5cGUuSE9MRDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5T3JpZW50YXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25UeXBlID0gQXJnb24uQ2VzaXVtLkV4dHJhcG9sYXRpb25UeXBlLkhPTEQ7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eVBvc2l0aW9uLmZvcndhcmRFeHRyYXBvbGF0aW9uRHVyYXRpb24gPSAxMC82MDtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5T3JpZW50YXRpb24uZm9yd2FyZEV4dHJhcG9sYXRpb25EdXJhdGlvbiA9IDEwLzYwO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0U2VydmljZS5lbnRpdGllcy5hZGQoZW50aXR5KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0U2VydmljZVByb3ZpZGVyLnB1Ymxpc2hpbmdSZWZlcmVuY2VGcmFtZU1hcC5zZXQoaWQsIHRoaXMuY29udGV4dFNlcnZpY2UudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZVRpbWUgPSBKdWxpYW5EYXRlLmNsb25lKHRpbWUpOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBhZGQgYW55IHRpbWUgZGlmZiBmcm9tIHZ1Zm9yaWFcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFja2FibGVUaW1lRGlmZiA9IHRyYWNrYWJsZVJlc3VsdC5nZXRUaW1lU3RhbXAoKSAtIGZyYW1lVGltZVN0YW1wO1xuICAgICAgICAgICAgICAgIGlmICh0cmFja2FibGVUaW1lRGlmZiAhPT0gMCkgSnVsaWFuRGF0ZS5hZGRTZWNvbmRzKHRpbWUsIHRyYWNrYWJsZVRpbWVEaWZmLCB0cmFja2FibGVUaW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NlID0gPEFyZ29uLkNlc2l1bS5NYXRyaXg0Pjxhbnk+dHJhY2thYmxlUmVzdWx0LmdldFBvc2UoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IE1hdHJpeDQuZ2V0VHJhbnNsYXRpb24ocG9zZSwgdGhpcy5fc2NyYXRjaENhcnRlc2lhbik7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm90YXRpb25NYXRyaXggPSBNYXRyaXg0LmdldFJvdGF0aW9uKHBvc2UsIHRoaXMuX3NjcmF0Y2hNYXRyaXgzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IFF1YXRlcm5pb24uZnJvbVJvdGF0aW9uTWF0cml4KHJvdGF0aW9uTWF0cml4LCB0aGlzLl9zY3JhdGNoUXVhdGVybmlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgKGVudGl0eS5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFBvc2l0aW9uUHJvcGVydHkpLmFkZFNhbXBsZSh0cmFja2FibGVUaW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgKGVudGl0eS5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uU2FtcGxlZFByb3BlcnR5KS5hZGRTYW1wbGUodHJhY2thYmxlVGltZSwgb3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVVcGRhdGVFdmVudC5yYWlzZUV2ZW50KHRpbWUpO1xuICAgICAgICAgICAgLy8gfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcy5zZXNzaW9uU2VydmljZS5lcnJvckV2ZW50LnJhaXNlRXZlbnQoZSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB2dWZvcmlhLmFwaS5zZXRTdGF0ZVVwZGF0ZUNhbGxiYWNrKHN0YXRlVXBkYXRlQ2FsbGJhY2spO1xuXHR9XG4gICAgICAgIFxuICAgIC8vIHByaXZhdGUgX2RldmljZU1vZGUgPSB2dWZvcmlhLkRldmljZU1vZGUuVlI7XG4gICAgLy8gcHJpdmF0ZSBfc2V0RGV2aWNlTW9kZShkZXZpY2VNb2RlOiB2dWZvcmlhLkRldmljZU1vZGUpIHtcbiAgICAvLyAgICAgdGhpcy5fZGV2aWNlTW9kZSA9IGRldmljZU1vZGU7XG4gICAgLy8gICAgIC8vIGZvbGxvd2luZyBtYXkgZmFpbCAocmV0dXJuIGZhbHNlKSBpZiB2dWZvcmlhIGlzIG5vdCBjdXJyZW50bHkgaW5pdGlhbGl6ZWQsIFxuICAgIC8vICAgICAvLyBidXQgdGhhdCdzIG9rYXkgKHNpbmNlIG5leHQgdGltZSB3ZSBpbml0aWxhaXplIHdlIHdpbGwgdXNlIHRoZSBzYXZlZCBtb2RlKS4gXG4gICAgLy8gICAgIHZ1Zm9yaWEuYXBpLmdldERldmljZSgpLnNldE1vZGUoZGV2aWNlTW9kZSk7IFxuICAgIC8vIH0gXG5cbiAgICBwcml2YXRlIF9nZXRTZXNzaW9uRGF0YShzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fc2Vzc2lvbkRhdGEuZ2V0KHNlc3Npb24pO1xuICAgICAgICBpZiAoIXNlc3Npb25EYXRhKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWEgbXVzdCBiZSBpbml0aWFsaXplZCBmaXJzdCcpXG4gICAgICAgIHJldHVybiBzZXNzaW9uRGF0YTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9zZXNzaW9uRGF0YS5nZXQoc2Vzc2lvbikhO1xuICAgICAgICBpZiAoIXNlc3Npb25EYXRhLmNvbW1hbmRRdWV1ZSkgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhIG11c3QgYmUgaW5pdGlhbGl6ZWQgZmlyc3QnKVxuICAgICAgICByZXR1cm4gc2Vzc2lvbkRhdGEuY29tbWFuZFF1ZXVlO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zZWxlY3RDb250cm9sbGluZ1Nlc3Npb24oKSB7XG4gICAgICAgIGNvbnN0IGZvY3VzU2Vzc2lvbiA9IHRoaXMuZm9jdXNTZXJ2aWNlUHJvdmlkZXIuc2Vzc2lvbjtcblxuICAgICAgICBpZiAoZm9jdXNTZXNzaW9uICYmIFxuICAgICAgICAgICAgZm9jdXNTZXNzaW9uLmlzQ29ubmVjdGVkICYmIFxuICAgICAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuaGFzKGZvY3VzU2Vzc2lvbikpIHtcbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbihmb2N1c1Nlc3Npb24pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiAmJiBcbiAgICAgICAgICAgIHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbi5pc0Nvbm5lY3RlZCAmJlxuICAgICAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuaGFzKHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbikpIFxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIHBpY2sgYSBkaWZmZXJlbnQgc2Vzc2lvbiBhcyB0aGUgY29udHJvbGxpbmcgc2Vzc2lvblxuICAgICAgICAvLyBUT0RPOiBwcmlvcml0aXplIGFueSBzZXNzaW9ucyBvdGhlciB0aGFuIHRoZSBmb2N1c3NlZCBzZXNzaW9uP1xuICAgICAgICBmb3IgKGNvbnN0IHNlc3Npb24gb2YgdGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VkU2Vzc2lvbnMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zZXNzaW9uRGF0YS5oYXMoc2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRDb250cm9sbGluZ1Nlc3Npb24oc2Vzc2lvbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgbm8gb3RoZXIgc2Vzc2lvbiBpcyBhdmFpbGFibGUsXG4gICAgICAgIC8vIGZhbGxiYWNrIHRvIHRoZSBtYW5hZ2VyIGFzIHRoZSBjb250cm9sbGluZyBzZXNzaW9uXG4gICAgICAgIGlmICh0aGlzLl9zZXNzaW9uRGF0YS5oYXModGhpcy5zZXNzaW9uU2VydmljZS5tYW5hZ2VyKSlcbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbih0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3NldENvbnRyb2xsaW5nU2Vzc2lvbihzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID09PSBzZXNzaW9uKSByZXR1cm47XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJWdWZvcmlhU2VydmljZTogU2V0dGluZyBjb250cm9sbGluZyBzZXNzaW9uIHRvIFwiICsgc2Vzc2lvbi51cmkpXG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbikge1xuICAgICAgICAgICAgY29uc3QgcHJldmlvdXNTZXNzaW9uID0gdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uO1xuICAgICAgICAgICAgdGhpcy5fY29udHJvbGxpbmdTZXNzaW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fc2Vzc2lvblN3aXRjaGVyQ29tbWFuZFF1ZXVlLnB1c2goKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZVNlc3Npb24ocHJldmlvdXNTZXNzaW9uKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICB0aGlzLl9zZXNzaW9uU3dpdGNoZXJDb21tYW5kUXVldWUucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVzdW1lU2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgfSwgdHJ1ZSkuY2F0Y2goKCk9PntcbiAgICAgICAgICAgIHRoaXMuX2NvbnRyb2xsaW5nU2Vzc2lvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRyb2xsaW5nU2Vzc2lvbih0aGlzLnNlc3Npb25TZXJ2aWNlLm1hbmFnZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9wYXVzZVNlc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zb2xlLmxvZygnVnVmb3JpYTogUGF1c2luZyBzZXNzaW9uICcgKyBzZXNzaW9uLnVyaSArICcuLi4nKTtcblxuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuICAgICAgICBjb25zdCBjb21tYW5kUXVldWUgPSBzZXNzaW9uRGF0YS5jb21tYW5kUXVldWU7XG5cbiAgICAgICAgcmV0dXJuIGNvbW1hbmRRdWV1ZS5wdXNoKCgpID0+IHtcbiAgICAgICAgICAgIGNvbW1hbmRRdWV1ZS5wYXVzZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB0aGUgc2Vzc2lvbiBpcyBjbG9zZWQsIHdlIHNldCB0aGUgcGVybWFuZW50IGZsYWcgdG8gdHJ1ZS5cbiAgICAgICAgICAgIC8vIExpa2V3aXNlLCBpZiB0aGUgc2Vzc2lvbiBpcyBub3QgY2xvc2VkLCB3ZSBzZXQgdGhlIHBlcm1hbmVudCBmbGF0IHRvIGZhbHNlLFxuICAgICAgICAgICAgLy8gbWFpbnRhaW5pbmcgdGhlIGN1cnJlbnQgc2Vzc2lvbiBzdGF0ZS5cbiAgICAgICAgICAgIGNvbnN0IHBlcm1hbmVudCA9IHNlc3Npb24uaXNDbG9zZWQ7XG5cbiAgICAgICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0VHJhY2tlcikgb2JqZWN0VHJhY2tlci5zdG9wKCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEuYWN0aXZhdGVkRGF0YVNldHM7XG4gICAgICAgICAgICBpZiAoYWN0aXZhdGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICBhY3RpdmF0ZWREYXRhU2V0cy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vYmplY3RUcmFja2VyRGVhY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbiwgaWQsIHBlcm1hbmVudCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGxvYWRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEubG9hZGVkRGF0YVNldHM7XG4gICAgICAgICAgICBpZiAobG9hZGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWREYXRhU2V0cy5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldChzZXNzaW9uLCBpZCwgcGVybWFuZW50KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IGRlaW5pdGlhbGl6aW5nLi4uJyk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdG9wKCk7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKS5kZWluaXQoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmRlaW5pdE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpLmRlaW5pdCgpO1xuXG4gICAgICAgICAgICBpZiAocGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuZGVsZXRlKHNlc3Npb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfcmVzdW1lU2Vzc2lvbihzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBjb21tYW5kUXVldWUgPSB0aGlzLl9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBSZXN1bWluZyBzZXNzaW9uICcgKyBzZXNzaW9uLnVyaSArICcuLi4nKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5faW5pdChzZXNzaW9uKS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb21tYW5kUXVldWUuZXhlY3V0ZSgpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2luaXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkgOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcbiAgICAgICAgY29uc3Qga2V5UHJvbWlzZSA9IHNlc3Npb25EYXRhLmtleVByb21pc2U7XG4gICAgICAgIGlmICgha2V5UHJvbWlzZSkgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhOiBJbnZhbGlkIFN0YXRlLiBNaXNzaW5nIEtleS4nKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXlQcm9taXNlLnRoZW48dm9pZD4oIGtleSA9PiB7XG5cbiAgICAgICAgICAgIGlmICghdnVmb3JpYS5hcGkuc2V0TGljZW5zZUtleShrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignVnVmb3JpYTogVW5hYmxlIHRvIHNldCB0aGUgbGljZW5zZSBrZXknKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhOiBpbml0aWFsaXppbmcuLi4nKTtcblxuICAgICAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuYXBpLmluaXQoKS50aGVuKChyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1Zm9yaWE6IEluaXQgUmVzdWx0OiAnICsgcmVzdWx0KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVJbml0UmVzdWx0ID0gc2Vzc2lvbkRhdGEuaW5pdFJlc3VsdFJlc29sdmVyO1xuICAgICAgICAgICAgICAgIGlmIChyZXNvbHZlSW5pdFJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlSW5pdFJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5pbml0UmVzdWx0UmVzb2x2ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdnVmb3JpYS5Jbml0UmVzdWx0LlNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHZ1Zm9yaWEuSW5pdFJlc3VsdFtyZXN1bHRdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgLy8gbXVzdCBpbml0aWFsaXplIHRyYWNrZXJzIGJlZm9yZSBpbml0aWFsaXppbmcgdGhlIGNhbWVyYSBkZXZpY2VcbiAgICAgICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLmluaXRPYmplY3RUcmFja2VyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVnVmb3JpYTogVW5hYmxlIHRvIGluaXRpYWxpemUgT2JqZWN0VHJhY2tlclwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjYW1lcmFEZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVnVmb3JpYTogaW5pdGlhbGl6aW5nIGNhbWVyYSBkZXZpY2UuLi5cIik7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWNhbWVyYURldmljZS5pbml0KHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uLkRlZmF1bHQpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBpbml0aWFsaXplIGNhbWVyYSBkZXZpY2UnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFjYW1lcmFEZXZpY2Uuc2VsZWN0VmlkZW9Nb2RlKHZ1Zm9yaWFDYW1lcmFEZXZpY2VNb2RlKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gc2VsZWN0IHZpZGVvIG1vZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCF2dWZvcmlhLmFwaS5nZXREZXZpY2UoKS5zZXRNb2RlKHZ1Zm9yaWEuRGV2aWNlTW9kZS5BUikpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNldCBkZXZpY2UgbW9kZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5jb25maWd1cmVWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kKHtcbiAgICAgICAgICAgICAgICAvLyAgICAgeDowLFxuICAgICAgICAgICAgICAgIC8vICAgICB5OjAsXG4gICAgICAgICAgICAgICAgLy8gICAgIHdpZHRoOnZ1Zm9yaWEudmlkZW9WaWV3LmdldE1lYXN1cmVkV2lkdGgoKSwgXG4gICAgICAgICAgICAgICAgLy8gICAgIGhlaWdodDp2dWZvcmlhLnZpZGVvVmlldy5nZXRNZWFzdXJlZEhlaWdodCgpXG4gICAgICAgICAgICAgICAgLy8gfSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXZ1Zm9yaWEuYXBpLmdldENhbWVyYURldmljZSgpLnN0YXJ0KCkpIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzdGFydCBjYW1lcmEnKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEubG9hZGVkRGF0YVNldHM7XG4gICAgICAgICAgICAgICAgY29uc3QgbG9hZFByb21pc2VzOlByb21pc2U8YW55PltdID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGxvYWRlZERhdGFTZXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRlZERhdGFTZXRzLmZvckVhY2goKGlkKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZFByb21pc2VzLnB1c2godGhpcy5fb2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsb2FkUHJvbWlzZXMpO1xuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRlZERhdGFTZXRzID0gc2Vzc2lvbkRhdGEuYWN0aXZhdGVkRGF0YVNldHM7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRlUHJvbWlzZXM6UHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYWN0aXZhdGVkRGF0YVNldHMpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVkRGF0YVNldHMuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlUHJvbWlzZXMucHVzaCh0aGlzLl9vYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0aXZhdGVQcm9taXNlcztcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICAgICAgICAgIGlmICghb2JqZWN0VHJhY2tlcikgdGhyb3cgbmV3IEVycm9yKCdWdWZvcmlhOiBVbmFibGUgdG8gZ2V0IG9iamVjdFRyYWNrZXIgaW5zdGFuY2UnKTtcbiAgICAgICAgICAgICAgICBvYmplY3RUcmFja2VyLnN0YXJ0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVJbml0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIG9wdGlvbnM6e2VuY3J5cHRlZExpY2Vuc2VEYXRhPzpzdHJpbmcsIGtleT86c3RyaW5nfSkge1xuICAgICAgICBpZiAoIW9wdGlvbnMua2V5ICYmICFvcHRpb25zLmVuY3J5cHRlZExpY2Vuc2VEYXRhKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBsaWNlbnNlIGtleSB3YXMgcHJvdmlkZWQuIEdldCBvbmUgZnJvbSBodHRwczovL2RldmVsb3Blci52dWZvcmlhLmNvbS8nKTtcblxuICAgICAgICBpZiAodGhpcy5fc2Vzc2lvbkRhdGEuaGFzKHNlc3Npb24pKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbHJlYWR5IGluaXRpYWxpemVkJyk7XG5cbiAgICAgICAgaWYgKERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZKSBvcHRpb25zLmtleSA9IERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZO1xuXG4gICAgICAgIGNvbnN0IGtleVByb21pc2UgPSBvcHRpb25zLmtleSA/IFxuICAgICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKG9wdGlvbnMua2V5KSA6IFxuICAgICAgICAgICAgdGhpcy5fZGVjcnlwdExpY2Vuc2VLZXkob3B0aW9ucy5lbmNyeXB0ZWRMaWNlbnNlRGF0YSEsIHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gbmV3IFZ1Zm9yaWFTZXNzaW9uRGF0YShrZXlQcm9taXNlKTtcbiAgICAgICAgdGhpcy5fc2Vzc2lvbkRhdGEuc2V0KHNlc3Npb24sIHNlc3Npb25EYXRhKTtcblxuICAgICAgICBjb25zdCBpbml0UmVzdWx0ID0gbmV3IFByb21pc2UoKHJlc29sdmUpPT57XG4gICAgICAgICAgICBzZXNzaW9uRGF0YS5pbml0UmVzdWx0UmVzb2x2ZXIgPSByZXNvbHZlO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZWxlY3RDb250cm9sbGluZ1Nlc3Npb24oKTtcblxuICAgICAgICByZXR1cm4gaW5pdFJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVDbG9zZShzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIGlmICh0aGlzLl9jb250cm9sbGluZ1Nlc3Npb24gPT09IHNlc3Npb24pIHtcbiAgICAgICAgICAgIHRoaXMuX3NlbGVjdENvbnRyb2xsaW5nU2Vzc2lvbigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJDcmVhdGVEYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIHVyaTpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIGZldGNoRGF0YVNldCh1cmkpLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgICAgICBsZXQgaWQgPSBzZXNzaW9uRGF0YS5kYXRhU2V0SWRCeVVyaS5nZXQodXJpKTtcbiAgICAgICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgICAgICBpZCA9IEFyZ29uLkNlc2l1bS5jcmVhdGVHdWlkKCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuc2V0KHVyaSwgaWQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLnNldChpZCwgdXJpKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICByZXR1cm4ge2lkfTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDogc3RyaW5nKTogUHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4ge1xuICAgICAgICBjb25zdCBzZXNzaW9uRGF0YSA9IHRoaXMuX2dldFNlc3Npb25EYXRhKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnN0IHVyaSA9IHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmdldChpZCk7XG4gICAgICAgIGlmICghdXJpKSB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IFVua25vd24gRGF0YVNldCBpZDogJHtpZH1gKTtcbiAgICAgICAgY29uc3Qgb2JqZWN0VHJhY2tlciA9IHZ1Zm9yaWEuYXBpLmdldE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgaWYgKCFvYmplY3RUcmFja2VyKSB0aHJvdyBuZXcgRXJyb3IoJ1Z1Zm9yaWE6IEludmFsaWQgU3RhdGUuIFVuYWJsZSB0byBnZXQgT2JqZWN0VHJhY2tlciBpbnN0YW5jZS4nKVxuXG4gICAgICAgIGxldCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuXG4gICAgICAgIGxldCB0cmFja2FibGVzUHJvbWlzZTpQcm9taXNlPEFyZ29uLlZ1Zm9yaWFUcmFja2FibGVzPjtcblxuICAgICAgICBpZiAoZGF0YVNldCkge1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUodGhpcy5fZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhOiBMb2FkaW5nIGRhdGFzZXQgKCR7aWR9KSBmcm9tICR7dXJpfS4uLmApO1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UgPSBmZXRjaERhdGFTZXQodXJpKS50aGVuPEFyZ29uLlZ1Zm9yaWFUcmFja2FibGVzPigobG9jYXRpb24pPT57XG4gICAgICAgICAgICAgICAgZGF0YVNldCA9IG9iamVjdFRyYWNrZXIuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICAgICAgICAgIGlmICghZGF0YVNldCkgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiBVbmFibGUgdG8gY3JlYXRlIGRhdGFzZXQgaW5zdGFuY2VgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGF0YVNldC5sb2FkKGxvY2F0aW9uLCB2dWZvcmlhLlN0b3JhZ2VUeXBlLkFic29sdXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLnNldChpZCwgZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmxvYWRlZERhdGFTZXRzLmFkZChpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZXMgPSB0aGlzLl9nZXRUcmFja2FibGVzRnJvbURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWZvcmlhIGxvYWRlZCBkYXRhc2V0IGZpbGUgd2l0aCB0cmFja2FibGVzOlxcbicgKyBKU09OLnN0cmluZ2lmeSh0cmFja2FibGVzKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmFja2FibGVzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9iamVjdFRyYWNrZXIuZGVzdHJveURhdGFTZXQoZGF0YVNldCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVuYWJsZSB0byBsb2FkIGRvd25sb2FkZWQgZGF0YXNldCBhdCAke2xvY2F0aW9ufSBmcm9tICR7dXJpfWApO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGxvYWQgZGF0YXNldCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMCkge1xuICAgICAgICAgICAgdHJhY2thYmxlc1Byb21pc2UudGhlbigodHJhY2thYmxlcyk9PntcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckxvYWREYXRhU2V0RXZlbnQnLCB7IGlkLCB0cmFja2FibGVzIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJhY2thYmxlc1Byb21pc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZ2V0VHJhY2thYmxlc0Zyb21EYXRhU2V0KGRhdGFTZXQ6dnVmb3JpYS5EYXRhU2V0KSB7XG4gICAgICAgIGNvbnN0IG51bVRyYWNrYWJsZXMgPSBkYXRhU2V0LmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlczpBcmdvbi5WdWZvcmlhVHJhY2thYmxlcyA9IHt9O1xuICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1UcmFja2FibGVzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IDx2dWZvcmlhLlRyYWNrYWJsZT5kYXRhU2V0LmdldFRyYWNrYWJsZShpKTtcbiAgICAgICAgICAgIHRyYWNrYWJsZXNbdHJhY2thYmxlLmdldE5hbWUoKV0gPSB7XG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuX2dldElkRm9yVHJhY2thYmxlKHRyYWNrYWJsZSksXG4gICAgICAgICAgICAgICAgc2l6ZTogdHJhY2thYmxlIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQgPyB0cmFja2FibGUuZ2V0U2l6ZSgpIDoge3g6MCx5OjAsejowfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cmFja2FibGVzO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIDogUHJvbWlzZTxBcmdvbi5WdWZvcmlhVHJhY2thYmxlcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb2JqZWN0VHJhY2tlckxvYWREYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJBY3RpdmF0ZURhdGFTZXQoc2Vzc2lvbjogQXJnb24uU2Vzc2lvblBvcnQsIGlkOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFZ1Zm9yaWEgYWN0aXZhdGluZyBkYXRhc2V0ICgke2lkfSlgKTtcblxuICAgICAgICBjb25zdCBvYmplY3RUcmFja2VyID0gdnVmb3JpYS5hcGkuZ2V0T2JqZWN0VHJhY2tlcigpO1xuICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIpIHRocm93IG5ldyBFcnJvcignVnVmb3JpYTogSW52YWxpZCBTdGF0ZS4gVW5hYmxlIHRvIGdldCBPYmplY3RUcmFja2VyIGluc3RhbmNlLicpXG5cbiAgICAgICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSB0aGlzLl9nZXRTZXNzaW9uRGF0YShzZXNzaW9uKTtcblxuICAgICAgICBsZXQgZGF0YVNldCA9IHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZ2V0KGlkKTtcbiAgICAgICAgbGV0IGRhdGFTZXRQcm9taXNlOlByb21pc2U8dnVmb3JpYS5EYXRhU2V0PjtcbiAgICAgICAgaWYgKCFkYXRhU2V0KSB7XG4gICAgICAgICAgICBkYXRhU2V0UHJvbWlzZSA9IHRoaXMuX29iamVjdFRyYWNrZXJMb2FkRGF0YVNldChzZXNzaW9uLCBpZCkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIHJldHVybiBzZXNzaW9uRGF0YS5kYXRhU2V0SW5zdGFuY2VCeUlkLmdldChpZCkhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGFTZXRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGRhdGFTZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRhdGFTZXRQcm9taXNlLnRoZW4oKGRhdGFTZXQpPT57XG4gICAgICAgICAgICBpZiAoIW9iamVjdFRyYWNrZXIuYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVnVmb3JpYTogVW5hYmxlIHRvIGFjdGl2YXRlIGRhdGFTZXQgJHtpZH1gKTtcbiAgICAgICAgICAgIHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzLmFkZChpZCk7XG4gICAgICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMClcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlT2JqZWN0VHJhY2tlckFjdGl2YXRlRGF0YVNldChzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0LCBpZDpzdHJpbmcpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRDb21tYW5kUXVldWVGb3JTZXNzaW9uKHNlc3Npb24pLnB1c2goKCk9PntcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vYmplY3RUcmFja2VyQWN0aXZhdGVEYXRhU2V0KHNlc3Npb24sIGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX29iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uOiBBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZywgcGVybWFuZW50PXRydWUpOiBib29sZWFuIHsgICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgVnVmb3JpYSBkZWFjdGl2YXRpbmcgZGF0YXNldCAoJHtpZH0pYCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKGRhdGFTZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBvYmplY3RUcmFja2VyLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmFjdGl2YXRlZERhdGFTZXRzLmRlbGV0ZShpZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24udmVyc2lvblswXSA+IDApXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnZ1Zm9yaWEub2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0RXZlbnQnLCB7IGlkIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2VzcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlT2JqZWN0VHJhY2tlckRlYWN0aXZhdGVEYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOnN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICBpZiAoIXRoaXMuX29iamVjdFRyYWNrZXJEZWFjdGl2YXRlRGF0YVNldChzZXNzaW9uLCBpZCkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWdWZvcmlhOiB1bmFibGUgdG8gYWN0aXZhdGUgZGF0YXNldCAke2lkfWApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfb2JqZWN0VHJhY2tlclVubG9hZERhdGFTZXQoc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCwgaWQ6IHN0cmluZywgcGVybWFuZW50PXRydWUpOiBib29sZWFuIHsgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBWdWZvcmlhOiB1bmxvYWRpbmcgZGF0YXNldCAoJHtpZH0pLi4uYCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0gdGhpcy5fZ2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbik7XG4gICAgICAgIGNvbnN0IG9iamVjdFRyYWNrZXIgPSB2dWZvcmlhLmFwaS5nZXRPYmplY3RUcmFja2VyKCk7XG4gICAgICAgIGlmIChvYmplY3RUcmFja2VyKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhU2V0ID0gc2Vzc2lvbkRhdGEuZGF0YVNldEluc3RhbmNlQnlJZC5nZXQoaWQpO1xuICAgICAgICAgICAgaWYgKGRhdGFTZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZWQgPSBvYmplY3RUcmFja2VyLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQpO1xuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHNlc3Npb25EYXRhLmRhdGFTZXRVcmlCeUlkLmdldChpZCkhO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldElkQnlVcmkuZGVsZXRlKHVyaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5sb2FkZWREYXRhU2V0cy5kZWxldGUoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuZGF0YVNldFVyaUJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLmRhdGFTZXRJbnN0YW5jZUJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi52ZXJzaW9uWzBdID4gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnYXIudnVmb3JpYS5vYmplY3RUcmFja2VyVW5sb2FkRGF0YVNldEV2ZW50JywgeyBpZCB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlbGV0ZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZU9iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQsIGlkOnN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0Q29tbWFuZFF1ZXVlRm9yU2Vzc2lvbihzZXNzaW9uKS5wdXNoKCgpPT57XG4gICAgICAgICAgICBpZiAoIXRoaXMuX29iamVjdFRyYWNrZXJVbmxvYWREYXRhU2V0KHNlc3Npb24sIGlkKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZ1Zm9yaWE6IHVuYWJsZSB0byB1bmxvYWQgZGF0YXNldCAke2lkfWApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfZ2V0SWRGb3JUcmFja2FibGUodHJhY2thYmxlOnZ1Zm9yaWEuVHJhY2thYmxlKSA6IHN0cmluZyB7XG4gICAgICAgIGlmICh0cmFja2FibGUgaW5zdGFuY2VvZiB2dWZvcmlhLk9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX29iamVjdF90YXJnZXRfJyArIHRyYWNrYWJsZS5nZXRVbmlxdWVUYXJnZXRJZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICd2dWZvcmlhX3RyYWNrYWJsZV8nICsgdHJhY2thYmxlLmdldElkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9kZWNyeXB0TGljZW5zZUtleShlbmNyeXB0ZWRMaWNlbnNlRGF0YTpzdHJpbmcsIHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIDogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIGRlY3J5cHQoZW5jcnlwdGVkTGljZW5zZURhdGEudHJpbSgpKS50aGVuKChqc29uKT0+e1xuICAgICAgICAgICAgY29uc3Qge2tleSxvcmlnaW5zfSA6IHtrZXk6c3RyaW5nLG9yaWdpbnM6c3RyaW5nW119ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgIGlmICghc2Vzc2lvbi51cmkpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBvcmlnaW4nKTtcblxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luID0gVVJJLnBhcnNlKHNlc3Npb24udXJpKTtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSg8YW55Pm9yaWdpbnMpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVnVmb3JpYSBMaWNlbnNlIERhdGEgbXVzdCBzcGVjaWZ5IGFsbG93ZWQgb3JpZ2luc1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBvcmlnaW5zLmZpbmQoKG8pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IG8uc3BsaXQoL1xcLyguKikvKTtcbiAgICAgICAgICAgICAgICBsZXQgZG9tYWluUGF0dGVybiA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgICAgIGxldCBwYXRoUGF0dGVybiA9IHBhcnRzWzFdIHx8ICcqKic7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1pbmltYXRjaChvcmlnaW4uaG9zdG5hbWUsIGRvbWFpblBhdHRlcm4pICYmIG1pbmltYXRjaChvcmlnaW4ucGF0aCwgcGF0aFBhdHRlcm4pO1xuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCAmJiAhREVCVUdfRElTQUJMRV9PUklHSU5fQ0hFQ0spIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgb3JpZ2luJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NvbmZpZyA9IDx2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZz57fTtcblxuICAgIHB1YmxpYyBjb25maWd1cmVWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kKHZpZXdwb3J0OkFyZ29uLlZpZXdwb3J0LCBlbmFibGVkOmJvb2xlYW4sIHJlZmxlY3Rpb249dnVmb3JpYS5WaWRlb0JhY2tncm91bmRSZWZsZWN0aW9uLkRlZmF1bHQpIHtcbiAgICAgICAgY29uc3Qgdmlld1dpZHRoID0gdmlld3BvcnQud2lkdGg7XG4gICAgICAgIGNvbnN0IHZpZXdIZWlnaHQgPSB2aWV3cG9ydC5oZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjYW1lcmFEZXZpY2UgPSB2dWZvcmlhLmFwaS5nZXRDYW1lcmFEZXZpY2UoKTtcbiAgICAgICAgY29uc3QgdmlkZW9Nb2RlID0gY2FtZXJhRGV2aWNlLmdldFZpZGVvTW9kZSh2dWZvcmlhQ2FtZXJhRGV2aWNlTW9kZSk7XG4gICAgICAgIGxldCB2aWRlb1dpZHRoID0gdmlkZW9Nb2RlLndpZHRoO1xuICAgICAgICBsZXQgdmlkZW9IZWlnaHQgPSB2aWRlb01vZGUuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBnZXRTY3JlZW5PcmllbnRhdGlvbigpO1xuICAgICAgICBpZiAob3JpZW50YXRpb24gPT09IDAgfHwgb3JpZW50YXRpb24gPT09IDE4MCkge1xuICAgICAgICAgICAgdmlkZW9XaWR0aCA9IHZpZGVvTW9kZS5oZWlnaHQ7XG4gICAgICAgICAgICB2aWRlb0hlaWdodCA9IHZpZGVvTW9kZS53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2lkdGhSYXRpbyA9IHZpZXdXaWR0aCAvIHZpZGVvV2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodFJhdGlvID0gdmlld0hlaWdodCAvIHZpZGVvSGVpZ2h0O1xuICAgICAgICAvLyBhc3BlY3QgZmlsbFxuICAgICAgICBjb25zdCBzY2FsZSA9IE1hdGgubWF4KHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcbiAgICAgICAgLy8gYXNwZWN0IGZpdFxuICAgICAgICAvLyBjb25zdCBzY2FsZSA9IE1hdGgubWluKHdpZHRoUmF0aW8sIGhlaWdodFJhdGlvKTtcblxuICAgICAgICBjb25zdCB2aWRlb1ZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcbiAgICAgICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gdmlkZW9WaWV3LmlvcyA/IHZpZGVvVmlldy5pb3MuY29udGVudFNjYWxlRmFjdG9yIDogMTtcbiAgICAgICAgXG4gICAgICAgIC8vIGFwcGx5IHRoZSB2aWRlbyBjb25maWdcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5fY29uZmlnOyBcbiAgICAgICAgY29uZmlnLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgICBjb25maWcuc2l6ZVggPSB2aWRlb1dpZHRoICogc2NhbGUgKiBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgIGNvbmZpZy5zaXplWSA9IHZpZGVvSGVpZ2h0ICogc2NhbGUgKiBjb250ZW50U2NhbGVGYWN0b3I7XG4gICAgICAgIGNvbmZpZy5wb3NpdGlvblggPSAwO1xuICAgICAgICBjb25maWcucG9zaXRpb25ZID0gMDtcbiAgICAgICAgY29uZmlnLnJlZmxlY3Rpb24gPSB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZFJlZmxlY3Rpb24uRGVmYXVsdDtcbiAgICAgICAgXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBWdWZvcmlhIGNvbmZpZ3VyaW5nIHZpZGVvIGJhY2tncm91bmQuLi5cbiAgICAgICAgLy8gICAgIGNvbnRlbnRTY2FsZUZhY3RvcjogJHtjb250ZW50U2NhbGVGYWN0b3J9IG9yaWVudGF0aW9uOiAke29yaWVudGF0aW9ufSBcbiAgICAgICAgLy8gICAgIHZpZXdXaWR0aDogJHt2aWV3V2lkdGh9IHZpZXdIZWlnaHQ6ICR7dmlld0hlaWdodH0gdmlkZW9XaWR0aDogJHt2aWRlb1dpZHRofSB2aWRlb0hlaWdodDogJHt2aWRlb0hlaWdodH0gXG4gICAgICAgIC8vICAgICBjb25maWc6ICR7SlNPTi5zdHJpbmdpZnkoY29uZmlnKX1cbiAgICAgICAgLy8gYCk7XG5cbiAgICAgICAgQWJzb2x1dGVMYXlvdXQuc2V0TGVmdCh2aWRlb1ZpZXcsIHZpZXdwb3J0LngpO1xuICAgICAgICBBYnNvbHV0ZUxheW91dC5zZXRUb3AodmlkZW9WaWV3LCB2aWV3cG9ydC55KTtcbiAgICAgICAgdmlkZW9WaWV3LndpZHRoID0gdmlld1dpZHRoO1xuICAgICAgICB2aWRlb1ZpZXcuaGVpZ2h0ID0gdmlld0hlaWdodDtcbiAgICAgICAgdnVmb3JpYS5hcGkuZ2V0UmVuZGVyZXIoKS5zZXRWaWRlb0JhY2tncm91bmRDb25maWcoY29uZmlnKTtcbiAgICB9XG59XG5cbi8vIFRPRE86IG1ha2UgdGhpcyBjcm9zcyBwbGF0Zm9ybSBzb21laG93XG5mdW5jdGlvbiBmZXRjaERhdGFTZXQoeG1sVXJsU3RyaW5nOnN0cmluZykgOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHhtbFVybCA9IE5TVVJMLlVSTFdpdGhTdHJpbmcoeG1sVXJsU3RyaW5nKTtcbiAgICBjb25zdCBkYXRVcmwgPSB4bWxVcmwuVVJMQnlEZWxldGluZ1BhdGhFeHRlbnNpb24uVVJMQnlBcHBlbmRpbmdQYXRoRXh0ZW5zaW9uKFwiZGF0XCIpO1xuICAgIFxuICAgIGNvbnN0IGRpcmVjdG9yeVBhdGhVcmwgPSB4bWxVcmwuVVJMQnlEZWxldGluZ0xhc3RQYXRoQ29tcG9uZW50O1xuICAgIGNvbnN0IGRpcmVjdG9yeUhhc2ggPSBkaXJlY3RvcnlQYXRoVXJsLmhhc2g7XG4gICAgY29uc3QgdG1wUGF0aCA9IGZpbGUua25vd25Gb2xkZXJzLnRlbXAoKS5wYXRoO1xuICAgIGNvbnN0IGRpcmVjdG9yeUhhc2hQYXRoID0gdG1wUGF0aCArIGZpbGUucGF0aC5zZXBhcmF0b3IgKyBkaXJlY3RvcnlIYXNoO1xuICAgIFxuICAgIGZpbGUuRm9sZGVyLmZyb21QYXRoKGRpcmVjdG9yeUhhc2hQYXRoKTtcbiAgICBcbiAgICBjb25zdCB4bWxEZXN0UGF0aCA9IGRpcmVjdG9yeUhhc2hQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIHhtbFVybC5sYXN0UGF0aENvbXBvbmVudDtcbiAgICBjb25zdCBkYXREZXN0UGF0aCA9IGRpcmVjdG9yeUhhc2hQYXRoICsgZmlsZS5wYXRoLnNlcGFyYXRvciArIGRhdFVybC5sYXN0UGF0aENvbXBvbmVudDtcbiAgICBcbiAgICBmdW5jdGlvbiBkb3dubG9hZElmTmVlZGVkKHVybDpzdHJpbmcsIGRlc3RQYXRoOnN0cmluZykge1xuICAgICAgICBsZXQgbGFzdE1vZGlmaWVkOkRhdGV8dW5kZWZpbmVkO1xuICAgICAgICBpZiAoZmlsZS5GaWxlLmV4aXN0cyhkZXN0UGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGYgPSBmaWxlLkZpbGUuZnJvbVBhdGgoZGVzdFBhdGgpO1xuICAgICAgICAgICAgbGFzdE1vZGlmaWVkID0gZi5sYXN0TW9kaWZpZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0dHAucmVxdWVzdCh7XG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6J0dFVCcsXG4gICAgICAgICAgICBoZWFkZXJzOiBsYXN0TW9kaWZpZWQgPyB7XG4gICAgICAgICAgICAgICAgJ0lmLU1vZGlmaWVkLVNpbmNlJzogbGFzdE1vZGlmaWVkLnRvVVRDU3RyaW5nKClcbiAgICAgICAgICAgIH0gOiB1bmRlZmluZWRcbiAgICAgICAgfSkudGhlbigocmVzcG9uc2UpPT57XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFZlcmlmaWVkIHRoYXQgY2FjaGVkIHZlcnNpb24gb2YgZmlsZSAke3VybH0gYXQgJHtkZXN0UGF0aH0gaXMgdXAtdG8tZGF0ZS5gKVxuICAgICAgICAgICAgICAgIHJldHVybiBkZXN0UGF0aDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UuY29udGVudCAmJiByZXNwb25zZS5zdGF0dXNDb2RlID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXNDb2RlIDwgMzAwKSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBEb3dubG9hZGVkIGZpbGUgJHt1cmx9IHRvICR7ZGVzdFBhdGh9YClcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuY29udGVudC50b0ZpbGUoZGVzdFBhdGgpLnBhdGg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byBkb3dubG9hZCBmaWxlIFwiICsgdXJsICsgXCIgIChIVFRQIHN0YXR1cyBjb2RlOiBcIiArIHJlc3BvbnNlLnN0YXR1c0NvZGUgKyBcIilcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgIGRvd25sb2FkSWZOZWVkZWQoeG1sVXJsLmFic29sdXRlU3RyaW5nLHhtbERlc3RQYXRoKSwgXG4gICAgICAgIGRvd25sb2FkSWZOZWVkZWQoZGF0VXJsLmFic29sdXRlU3RyaW5nLGRhdERlc3RQYXRoKVxuICAgIF0pLnRoZW4oKCk9PnhtbERlc3RQYXRoKTtcbn0gIl19