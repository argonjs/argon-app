"use strict";
//import * as utils from 'utils/utils';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./vuforia-common");
var def = require("nativescript-vuforia");
var application = require("application");
var placeholder = require("ui/placeholder");
var grid_layout_1 = require("ui/layouts/grid-layout");
var vuforia = com.vuforia;
var plugin = io.argonjs.vuforia;
global.moduleMerge(common, exports);
var abis = android.os.Build['SUPPORTED_ABIS'];
var VUFORIA_AVAILABLE = Array.prototype.includes.call(abis, 'armeabi-v7a');
// const VUFORIA_AVAILABLE = typeof plugin.VuforiaSession !== 'undefined';
var androidVideoView = undefined;
var vuforiaRenderer = undefined;
var initialized = false;
exports.videoView = new grid_layout_1.GridLayout();
// on Android, we need to wait for Vuforia to be initialized before creating the glView and renderer
function initVideoView() {
    var videoViewPlaceholder = new placeholder.Placeholder();
    videoViewPlaceholder.on(placeholder.Placeholder.creatingViewEvent, function (evt) {
        androidVideoView = (VUFORIA_AVAILABLE ? new plugin.VuforiaGLView(application.android.context) : undefined);
        evt.view = androidVideoView;
        androidVideoView.init(vuforia.Vuforia.requiresAlpha(), 16, 0);
        vuforiaRenderer = new plugin.VuforiaRenderer();
        androidVideoView.setRenderer(vuforiaRenderer);
        vuforiaRenderer.mIsActive = true;
    });
    videoViewPlaceholder.onLoaded = function () {
        if (VUFORIA_AVAILABLE)
            vuforia.Vuforia.onSurfaceCreated();
    };
    videoViewPlaceholder.onLayout = function (left, top, right, bottom) {
        if (VUFORIA_AVAILABLE)
            configureVuforiaSurface();
    };
    exports.videoView.addChild(videoViewPlaceholder);
}
application.on(application.suspendEvent, function () {
    if (VUFORIA_AVAILABLE) {
        console.log('Pausing Vuforia');
        vuforia.Vuforia.onPause();
        if (initialized) {
            console.log('Pausing camera and renderer');
            exports.api && exports.api.getCameraDevice().stop();
            androidVideoView && androidVideoView.onPause();
            vuforiaRenderer && (vuforiaRenderer.mIsActive = false);
        }
    }
});
application.on(application.orientationChangedEvent, function () {
    if (VUFORIA_AVAILABLE) {
        Promise.resolve().then(configureVuforiaSurface); // delay until the interface orientation actually changes
        setTimeout(configureVuforiaSurface, 500);
    }
});
application.on(application.resumeEvent, function () {
    if (VUFORIA_AVAILABLE) {
        console.log('Resuming Vuforia');
        vuforia.Vuforia.onResume();
        vuforia.Vuforia.onSurfaceCreated();
        configureVuforiaSurface();
        if (initialized) {
            console.log('Resuming camera and renderer');
            exports.api && exports.api.getCameraDevice().start();
            androidVideoView && androidVideoView.onResume();
            vuforiaRenderer && (vuforiaRenderer.mIsActive = true);
        }
    }
});
function configureVuforiaSurface() {
    if (!exports.api)
        throw new Error();
    if (androidVideoView === undefined)
        return;
    exports.api.onSurfaceChanged(androidVideoView.getWidth(), androidVideoView.getHeight());
    console.log("configureVuforiaSurface: " + androidVideoView.getWidth() + ", " + androidVideoView.getHeight());
}
exports.configureVuforiaSurface = configureVuforiaSurface;
var API = /** @class */ (function (_super) {
    __extends(API, _super);
    function API() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cameraDevice = new CameraDevice();
        _this.device = new Device();
        _this.renderer = new Renderer();
        return _this;
    }
    API.prototype.setLicenseKey = function (licenseKey) {
        if (application.android.foregroundActivity != null && licenseKey != null) {
            plugin.VuforiaSession.setLicenseKey(application.android.foregroundActivity, licenseKey);
            return true;
        }
        return false;
    };
    API.prototype.setHint = function (hint, value) {
        return vuforia.Vuforia.setHint(hint, value);
    };
    API.prototype.init = function () {
        return new Promise(function (resolve, reject) {
            plugin.VuforiaSession.init(new plugin.VuforiaControl({
                onInitARDone: function (result) {
                    if (result == 100 /* SUCCESS */) {
                        if (exports.api) {
                            exports.api.getDevice().setMode(def.DeviceMode.AR);
                        }
                        if (androidVideoView === undefined) {
                            initVideoView();
                        }
                        vuforiaRenderer && (vuforiaRenderer.mIsActive = true);
                        vuforia.Vuforia.onSurfaceCreated();
                        configureVuforiaSurface();
                        setTimeout(configureVuforiaSurface, 1000);
                        setTimeout(configureVuforiaSurface, 5000); // this shouldn't be required, but sometimes the video feed doesn't appear after reinit
                        vuforia.Vuforia.registerCallback(new vuforia.Vuforia.UpdateCallbackInterface({
                            Vuforia_onUpdate: function (state) {
                                if (exports.api && exports.api.updateCallback)
                                    exports.api.updateCallback(new State(state));
                            }
                        }));
                        vuforia.Vuforia.onResume();
                        initialized = true;
                    }
                    resolve(result);
                }
            }));
        });
    };
    API.prototype.deinit = function () {
        vuforia.Vuforia.deinit();
        vuforia.Vuforia.onPause();
    };
    API.prototype.getCameraDevice = function () {
        return this.cameraDevice;
    };
    API.prototype.getDevice = function () {
        return this.device;
    };
    API.prototype.getRenderer = function () {
        return this.renderer;
    };
    API.prototype.initSmartTerrain = function () {
        throw new Error("Method not implemented.");
    };
    API.prototype.getSmartTerrain = function () {
        throw new Error("Method not implemented.");
    };
    API.prototype.deinitSmartTerrain = function () {
        throw new Error("Method not implemented.");
    };
    API.prototype.initPositionalDeviceTracker = function () {
        throw new Error("Method not implemented.");
    };
    API.prototype.getPositionalDeviceTracker = function () {
        throw new Error("Method not implemented.");
    };
    API.prototype.deinitPositionalDeviceTracker = function () {
        throw new Error("Method not implemented.");
    };
    API.prototype.initObjectTracker = function () {
        var tracker = vuforia.TrackerManager.getInstance().initTracker(vuforia.ObjectTracker.getClassType());
        if (tracker != null) {
            this.objectTracker = new ObjectTracker(tracker);
            return true;
        }
        return false;
    };
    API.prototype.deinitObjectTracker = function () {
        if (vuforia.TrackerManager.getInstance().deinitTracker(vuforia.ObjectTracker.getClassType())) {
            this.objectTracker = undefined;
            return true;
        }
        return false;
    };
    API.prototype.setScaleFactor = function (f) {
        plugin.VuforiaSession.setScaleFactor && plugin.VuforiaSession.setScaleFactor(f);
    };
    API.prototype.getScaleFactor = function () {
        return plugin.VuforiaSession.scaleFactor();
    };
    API.prototype.setTargetFPS = function (f) {
    };
    API.prototype.getTargetFPS = function () {
        return 60;
    };
    API.prototype.onSurfaceChanged = function (width, height) {
        vuforia.Vuforia.onSurfaceChanged(width, height);
        /*
        const orientation:UIInterfaceOrientation = utils.ios.getter(UIApplication, UIApplication.sharedApplication).statusBarOrientation;
        switch (orientation) {
            case UIInterfaceOrientation.Portrait:
                VuforiaSession.setRotation(VuforiaRotation.IOS_90);
                break;
            case UIInterfaceOrientation.PortraitUpsideDown:
                VuforiaSession.setRotation(VuforiaRotation.IOS_270);
                break;
            case UIInterfaceOrientation.LandscapeLeft:
                VuforiaSession.setRotation(VuforiaRotation.IOS_180);
                break;
            case UIInterfaceOrientation.LandscapeRight:
                VuforiaSession.setRotation(VuforiaRotation.IOS_0);
                break;
            default:
                VuforiaSession.setRotation(VuforiaRotation.IOS_90);
        }
        */
    };
    return API;
}(common.APIBase));
exports.API = API;
function createVec2(vec) {
    var data = vec.getData();
    return { x: data[0], y: data[1] };
}
function createVec3(vec) {
    var data = vec.getData();
    return { x: data[0], y: data[1], z: data[2] };
}
function createVec4(vec) {
    var data = vec.getData();
    return { x: data[0], y: data[1], z: data[2], w: data[3] };
}
function convert2GLMatrix(mat) {
    var data = mat.getData();
    return [
        data[0],
        data[4],
        data[8],
        0,
        data[1],
        data[5],
        data[9],
        0,
        data[2],
        data[6],
        data[10],
        0,
        data[3],
        data[7],
        data[11],
        1
    ];
}
// https://library.vuforia.com/articles/Solution/How-To-Access-Camera-Parameters
function convertPerspectiveProjection2GLMatrix(mat, near, far) {
    var data = mat.getData();
    return [
        data[0],
        data[4],
        data[8],
        0,
        data[1],
        data[5],
        data[9],
        0,
        data[2],
        data[6],
        (far + near) / (far - near),
        1,
        data[3],
        data[7],
        -near * (1 + (far + near) / (far - near)),
        0
    ];
}
var Trackable = /** @class */ (function () {
    function Trackable(android) {
        this.android = android;
    }
    Trackable.createTrackable = function (android) {
        /*
        if (android instanceof vuforia.Marker) {
            return new Marker(android)
        } else if (android instanceof vuforia.Word) {
            return new Word(android)
        } else
        */
        if (android instanceof vuforia.ImageTarget) {
            return new ImageTarget(android);
        }
        else if (android instanceof vuforia.CylinderTarget) {
            return new CylinderTarget(android);
        }
        else if (android instanceof vuforia.ObjectTarget) {
            return new ObjectTarget(android);
        }
        else if (android instanceof vuforia.Trackable) {
            return new Trackable(android);
        }
        throw new Error();
    };
    Trackable.prototype.getId = function () {
        return this.android.getId();
    };
    Trackable.prototype.getName = function () {
        return this.android.getName();
    };
    Trackable.prototype.isExtendedTrackingStarted = function () {
        return this.android.isExtendedTrackingStarted();
    };
    Trackable.prototype.startExtendedTracking = function () {
        return this.android.startExtendedTracking();
    };
    Trackable.prototype.stopExtendedTracking = function () {
        return this.android.stopExtendedTracking();
    };
    return Trackable;
}());
exports.Trackable = Trackable;
var TrackableResult = /** @class */ (function () {
    function TrackableResult(android) {
        this.android = android;
    }
    TrackableResult.createTrackableResult = function (android) {
        /*
        if (android instanceof vuforia.MarkerResult) {
            return new MarkerResult(android)
        } else if (android instanceof vuforia.WordResult) {
            return new WordResult(android)
        } else
        */
        if (android instanceof vuforia.ImageTargetResult) {
            return new ImageTargetResult(android);
        }
        else if (android instanceof vuforia.CylinderTargetResult) {
            return new CylinderTargetResult(android);
        }
        else if (android instanceof vuforia.ObjectTargetResult) {
            return new ObjectTargetResult(android);
        }
        else if (android instanceof vuforia.TrackableResult) {
            return new TrackableResult(android);
        }
        throw new Error();
    };
    TrackableResult.prototype.getPose = function () {
        var mat34 = this.android.getPose();
        return convert2GLMatrix(mat34);
    };
    TrackableResult.prototype.getTimeStamp = function () {
        return this.android.getTimeStamp();
    };
    TrackableResult.prototype.getStatus = function () {
        return this.android.getStatus();
    };
    TrackableResult.prototype.getTrackable = function () {
        return Trackable.createTrackable(this.android.getTrackable());
    };
    return TrackableResult;
}());
exports.TrackableResult = TrackableResult;
var DeviceTrackable = /** @class */ (function (_super) {
    __extends(DeviceTrackable, _super);
    function DeviceTrackable(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return DeviceTrackable;
}(Trackable));
exports.DeviceTrackable = DeviceTrackable;
var DeviceTrackableResult = /** @class */ (function (_super) {
    __extends(DeviceTrackableResult, _super);
    function DeviceTrackableResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return DeviceTrackableResult;
}(TrackableResult));
exports.DeviceTrackableResult = DeviceTrackableResult;
var Marker = /** @class */ (function (_super) {
    __extends(Marker, _super);
    function Marker(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return Marker;
}(Trackable));
exports.Marker = Marker;
var MarkerResult = /** @class */ (function (_super) {
    __extends(MarkerResult, _super);
    function MarkerResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return MarkerResult;
}(TrackableResult));
exports.MarkerResult = MarkerResult;
var Word = /** @class */ (function (_super) {
    __extends(Word, _super);
    function Word(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return Word;
}(Trackable));
exports.Word = Word;
var WordResult = /** @class */ (function (_super) {
    __extends(WordResult, _super);
    function WordResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return WordResult;
}(TrackableResult));
exports.WordResult = WordResult;
var ObjectTarget = /** @class */ (function (_super) {
    __extends(ObjectTarget, _super);
    function ObjectTarget(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    ObjectTarget.prototype.getUniqueTargetId = function () {
        return this.android.getUniqueTargetId();
    };
    ObjectTarget.prototype.getSize = function () {
        return createVec3(this.android.getSize());
    };
    return ObjectTarget;
}(Trackable));
exports.ObjectTarget = ObjectTarget;
var ObjectTargetResult = /** @class */ (function (_super) {
    __extends(ObjectTargetResult, _super);
    function ObjectTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return ObjectTargetResult;
}(TrackableResult));
exports.ObjectTargetResult = ObjectTargetResult;
var ImageTarget = /** @class */ (function (_super) {
    __extends(ImageTarget, _super);
    function ImageTarget(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return ImageTarget;
}(ObjectTarget));
exports.ImageTarget = ImageTarget;
var ImageTargetResult = /** @class */ (function (_super) {
    __extends(ImageTargetResult, _super);
    function ImageTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return ImageTargetResult;
}(ObjectTargetResult));
exports.ImageTargetResult = ImageTargetResult;
var MultiTarget = /** @class */ (function (_super) {
    __extends(MultiTarget, _super);
    function MultiTarget(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return MultiTarget;
}(ObjectTarget));
exports.MultiTarget = MultiTarget;
var MultiTargetResult = /** @class */ (function (_super) {
    __extends(MultiTargetResult, _super);
    function MultiTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return MultiTargetResult;
}(ObjectTargetResult));
exports.MultiTargetResult = MultiTargetResult;
var CylinderTarget = /** @class */ (function (_super) {
    __extends(CylinderTarget, _super);
    function CylinderTarget(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return CylinderTarget;
}(ObjectTarget));
exports.CylinderTarget = CylinderTarget;
var CylinderTargetResult = /** @class */ (function (_super) {
    __extends(CylinderTargetResult, _super);
    function CylinderTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return CylinderTargetResult;
}(ObjectTargetResult));
exports.CylinderTargetResult = CylinderTargetResult;
var Image = /** @class */ (function () {
    function Image(android) {
        this.android = android;
    }
    Image.prototype.getBufferHeight = function () {
        return this.android.getBufferHeight();
    };
    Image.prototype.getBufferWidth = function () {
        return this.android.getBufferWidth();
    };
    Image.prototype.getFormat = function () {
        return this.android.getFormat();
    };
    Image.prototype.getHeight = function () {
        return this.android.getHeight();
    };
    Image.prototype.getPixels = function () {
        return this.android.getPixels();
    };
    Image.prototype.getStride = function () {
        return this.android.getStride();
    };
    Image.prototype.getWidth = function () {
        return this.android.getWidth();
    };
    return Image;
}());
exports.Image = Image;
var Frame = /** @class */ (function () {
    function Frame(android) {
        this.android = android;
    }
    Frame.prototype.getImage = function (idx) {
        var img = this.android.getImage(idx);
        if (img) {
            return new Image(img);
        }
        return undefined;
    };
    Frame.prototype.getIndex = function () {
        return this.android.getIndex();
    };
    Frame.prototype.getNumImages = function () {
        return this.android.getNumImages();
    };
    Frame.prototype.getTimeStamp = function () {
        return this.android.getTimeStamp();
    };
    return Frame;
}());
exports.Frame = Frame;
var State = /** @class */ (function () {
    function State(android) {
        this.android = android;
    }
    State.prototype.getFrame = function () {
        var frame = this.android.getFrame();
        return new Frame(frame);
    };
    State.prototype.getNumTrackableResults = function () {
        return this.android.getNumTrackableResults();
    };
    State.prototype.getNumTrackables = function () {
        return this.android.getNumTrackables();
    };
    State.prototype.getTrackable = function (idx) {
        var trackable = this.android.getTrackable(idx);
        if (trackable) {
            return Trackable.createTrackable(trackable);
        }
        return undefined;
    };
    State.prototype.getTrackableResult = function (idx) {
        var result = this.android.getTrackableResult(idx);
        if (result) {
            return TrackableResult.createTrackableResult(result);
        }
        return undefined;
    };
    State.prototype.getCameraCalibration = function () {
        return new CameraCalibration(this.android.getCameraCalibration());
    };
    State.prototype.getIllumination = function () {
        return this.android.getIllumination();
    };
    State.prototype.getDeviceTrackableResult = function () {
        return new DeviceTrackableResult(this.android.getDeviceTrackableResult());
    };
    return State;
}());
exports.State = State;
var CameraCalibration = /** @class */ (function () {
    function CameraCalibration(android) {
        this.android = android;
    }
    CameraCalibration.prototype.getDistortionParameters = function () {
        return createVec4(this.android.getDistortionParameters());
    };
    CameraCalibration.prototype.getFieldOfViewRads = function () {
        return createVec2(this.android.getFieldOfViewRads());
    };
    CameraCalibration.prototype.getFocalLength = function () {
        return createVec2(this.android.getFocalLength());
    };
    CameraCalibration.prototype.getPrincipalPoint = function () {
        return createVec2(this.android.getPrincipalPoint());
    };
    CameraCalibration.prototype.getSize = function () {
        return createVec2(this.android.getSize());
    };
    return CameraCalibration;
}());
exports.CameraCalibration = CameraCalibration;
var CameraDevice = /** @class */ (function () {
    function CameraDevice() {
    }
    CameraDevice.prototype.init = function (camera) {
        return vuforia.CameraDevice.getInstance().init(camera);
    };
    CameraDevice.prototype.deinit = function () {
        return vuforia.CameraDevice.getInstance().deinit();
    };
    CameraDevice.prototype.getCameraCalibration = function () {
        var calibration = vuforia.CameraDevice.getInstance().getCameraCalibration();
        return new CameraCalibration(calibration);
    };
    CameraDevice.prototype.getCameraDirection = function () {
        return vuforia.CameraDevice.getInstance().getCameraDirection();
    };
    CameraDevice.prototype.getNumVideoModes = function () {
        return vuforia.CameraDevice.getInstance().getNumVideoModes();
    };
    CameraDevice.prototype.getVideoMode = function (nIndex) {
        var videoMode = vuforia.CameraDevice.getInstance().getVideoMode(nIndex);
        var result = {
            width: videoMode.getWidth(),
            height: videoMode.getHeight(),
            framerate: videoMode.getFramerate()
        };
        return result;
    };
    CameraDevice.prototype.selectVideoMode = function (index) {
        return vuforia.CameraDevice.getInstance().selectVideoMode(index);
    };
    CameraDevice.prototype.setFlashTorchMode = function (on) {
        return vuforia.CameraDevice.getInstance().setFlashTorchMode(on);
    };
    CameraDevice.prototype.setFocusMode = function (focusMode) {
        return vuforia.CameraDevice.getInstance().setFocusMode(focusMode);
    };
    CameraDevice.prototype.start = function () {
        return vuforia.CameraDevice.getInstance().start();
    };
    CameraDevice.prototype.stop = function () {
        return vuforia.CameraDevice.getInstance().stop();
    };
    return CameraDevice;
}());
exports.CameraDevice = CameraDevice;
var ViewList = /** @class */ (function () {
    function ViewList(android) {
        this.android = android;
    }
    ViewList.prototype.contains = function (view) {
        return this.android.contains(view);
    };
    ViewList.prototype.getNumViews = function () {
        return this.android.getNumViews();
    };
    ViewList.prototype.getView = function (idx) {
        return this.android.getView(idx);
    };
    return ViewList;
}());
exports.ViewList = ViewList;
var ViewerParameters = /** @class */ (function () {
    function ViewerParameters(android) {
        this.android = android;
    }
    ViewerParameters.prototype.containsMagnet = function () {
        return this.android.containsMagnet();
    };
    ViewerParameters.prototype.getButtonType = function () {
        return this.android.getButtonType();
    };
    ViewerParameters.prototype.getDistortionCoefficient = function (idx) {
        return this.android.getDistortionCoefficient(idx);
    };
    ViewerParameters.prototype.getFieldOfView = function () {
        return createVec4(this.android.getFieldOfView());
    };
    ViewerParameters.prototype.getInterLensDistance = function () {
        return this.android.getInterLensDistance();
    };
    ViewerParameters.prototype.getLensCentreToTrayDistance = function () {
        return this.android.getLensCentreToTrayDistance();
    };
    ViewerParameters.prototype.getManufacturer = function () {
        return this.android.getManufacturer();
    };
    ViewerParameters.prototype.getName = function () {
        return this.android.getName();
    };
    ViewerParameters.prototype.getNumDistortionCoefficients = function () {
        return this.android.getNumDistortionCoefficients();
    };
    ViewerParameters.prototype.getScreenToLensDistance = function () {
        return this.android.getScreenToLensDistance();
    };
    ViewerParameters.prototype.getTrayAlignment = function () {
        return this.android.getTrayAlignment();
    };
    ViewerParameters.prototype.getVersion = function () {
        return this.android.getVersion();
    };
    return ViewerParameters;
}());
exports.ViewerParameters = ViewerParameters;
var ViewerParametersList = /** @class */ (function () {
    function ViewerParametersList(android) {
        this.android = android;
    }
    ViewerParametersList.prototype.get = function (idx) {
        var vp = this.android.get(idx);
        if (vp)
            return new ViewerParameters(vp);
        return undefined;
    };
    ViewerParametersList.prototype.getNameManufacturer = function (name, manufacturer) {
        var vp = this.android.get(name, manufacturer);
        if (vp)
            return new ViewerParameters(vp);
        return undefined;
    };
    ViewerParametersList.prototype.setSDKFilter = function (filter) {
        this.android.setSDKFilter(filter);
    };
    ViewerParametersList.prototype.size = function () {
        return this.android.size();
    };
    return ViewerParametersList;
}());
exports.ViewerParametersList = ViewerParametersList;
var Device = /** @class */ (function () {
    function Device() {
    }
    Device.prototype.setMode = function (mode) {
        return vuforia.Device.getInstance().setMode(mode);
    };
    Device.prototype.getMode = function () {
        return vuforia.Device.getInstance().getMode();
    };
    Device.prototype.setViewerActive = function (active) {
        vuforia.Device.getInstance().setViewerActive(active);
    };
    Device.prototype.isViewerActive = function () {
        return vuforia.Device.getInstance().isViewerActive();
    };
    Device.prototype.getViewerList = function () {
        var viewerList = vuforia.Device.getInstance().getViewerList();
        return new ViewerParametersList(viewerList);
    };
    Device.prototype.selectViewer = function (viewer) {
        return vuforia.Device.getInstance().selectViewer(viewer.android);
    };
    Device.prototype.getSelectedViewer = function () {
        if (!this.isViewerActive())
            return undefined;
        return new ViewerParameters(vuforia.Device.getInstance().getSelectedViewer());
    };
    Device.prototype.getRenderingPrimitives = function () {
        return new RenderingPrimitives(vuforia.Device.getInstance().getRenderingPrimitives());
    };
    return Device;
}());
exports.Device = Device;
var Renderer = /** @class */ (function () {
    function Renderer() {
    }
    Renderer.prototype.getRecommendedFps = function (flags) {
        return vuforia.Renderer.getInstance().getRecommendedFps(flags);
    };
    Renderer.prototype.getVideoBackgroundConfig = function () {
        var vbc = vuforia.Renderer.getInstance().getVideoBackgroundConfig();
        var result = {
            enabled: vbc.getEnabled(),
            positionX: vbc.getPosition().getData()[0],
            positionY: vbc.getPosition().getData()[1],
            sizeX: vbc.getSize().getData()[0],
            sizeY: vbc.getSize().getData()[1],
            reflection: vbc.getReflection()
        };
        return result;
    };
    Renderer.prototype.setTargetFps = function (fps) {
        return vuforia.Renderer.getInstance().setTargetFps(fps);
    };
    Renderer.prototype.setVideoBackgroundConfig = function (cfg) {
        var vbc = new vuforia.VideoBackgroundConfig();
        vbc.setEnabled(cfg.enabled);
        vbc.setPosition(new vuforia.Vec2I(cfg.positionX, cfg.positionY));
        vbc.setSize(new vuforia.Vec2I(cfg.sizeX, cfg.sizeY));
        vuforia.Renderer.getInstance().setVideoBackgroundConfig(vbc);
    };
    return Renderer;
}());
exports.Renderer = Renderer;
// interop.Reference does not exist on Android
// Mesh will have to be rethought for cross-platform use
var Mesh = /** @class */ (function () {
    function Mesh(android) {
        this.android = android;
    }
    Mesh.prototype.getNormalCoordinates = function () {
        //return this.android.getNormalCoordinates();
        return undefined;
    };
    Mesh.prototype.getNormals = function () {
        //return this.android.getNormals();
        return undefined;
    };
    Mesh.prototype.getNumTriangles = function () {
        //return this.android.getNumTriangles();
        return 0;
    };
    Mesh.prototype.getNumVertices = function () {
        //return this.android.getNumVertices();
        return 0;
    };
    Mesh.prototype.getPositionCoordinates = function () {
        //return this.android.getPositionCoordinates();
        return undefined;
    };
    Mesh.prototype.getPositions = function () {
        //return this.android.getPositions();
        return undefined;
    };
    Mesh.prototype.getTriangles = function () {
        //return this.android.getTriangles();
        return undefined;
    };
    Mesh.prototype.getUVCoordinates = function () {
        //return this.android.getUVCoordinates();
        return undefined;
    };
    Mesh.prototype.getUVs = function () {
        //return this.android.getUVs();
        return undefined;
    };
    Mesh.prototype.hasNormals = function () {
        //return this.android.hasNormals();
        return false;
    };
    Mesh.prototype.hasPositions = function () {
        //return this.android.hasPositions();
        return false;
    };
    Mesh.prototype.hasUVs = function () {
        //return this.android.hasUVs();
        return false;
    };
    return Mesh;
}());
exports.Mesh = Mesh;
var RenderingPrimitives = /** @class */ (function () {
    function RenderingPrimitives(android) {
        this.android = android;
    }
    RenderingPrimitives.prototype.getDistortionTextureMesh = function (viewID) {
        var mesh = this.android.getDistortionTextureMesh(viewID);
        return new Mesh(mesh);
    };
    RenderingPrimitives.prototype.getDistortionTextureSize = function (viewID) {
        return createVec2(this.android.getDistortionTextureSize(viewID));
    };
    RenderingPrimitives.prototype.getDistortionTextureViewport = function (viewID) {
        return createVec4(this.android.getDistortionTextureViewport(viewID));
    };
    RenderingPrimitives.prototype.getEyeDisplayAdjustmentMatrix = function (viewID) {
        var mat34 = this.android.getEyeDisplayAdjustmentMatrix(viewID);
        return convert2GLMatrix(mat34);
    };
    RenderingPrimitives.prototype.getNormalizedViewport = function (viewID) {
        return createVec4(this.android.getNormalizedViewport(viewID));
    };
    RenderingPrimitives.prototype.getProjectionMatrix = function (viewID, cameraCalibration) {
        var androidCameraCalibration = cameraCalibration['android'];
        var mat34 = this.android.getProjectionMatrix(viewID, androidCameraCalibration, true);
        return convertPerspectiveProjection2GLMatrix(mat34, 0.01, 100000);
    };
    RenderingPrimitives.prototype.getRenderingViews = function () {
        return new ViewList(this.android.getRenderingViews());
    };
    RenderingPrimitives.prototype.getVideoBackgroundMesh = function (viewID) {
        var mesh = this.android.getVideoBackgroundMesh(viewID);
        return new Mesh(mesh);
    };
    RenderingPrimitives.prototype.getVideoBackgroundProjectionMatrix = function (viewID) {
        var mat34 = this.android.getVideoBackgroundProjectionMatrix(viewID);
        return convertPerspectiveProjection2GLMatrix(mat34, 0.01, 100000);
    };
    RenderingPrimitives.prototype.getViewport = function (viewID) {
        return createVec4(this.android.getViewport(viewID));
    };
    return RenderingPrimitives;
}());
exports.RenderingPrimitives = RenderingPrimitives;
var Tracker = /** @class */ (function () {
    function Tracker() {
    }
    return Tracker;
}());
exports.Tracker = Tracker;
var DataSet = /** @class */ (function () {
    function DataSet(android) {
        this.android = android;
    }
    DataSet.prototype.createMultiTarget = function (name) {
        var mt = this.android.createMultiTarget(name);
        if (mt)
            return new MultiTarget(mt);
        return undefined;
    };
    DataSet.prototype.destroy = function (trackable) {
        return this.android.destroy(trackable.android);
    };
    DataSet.prototype.exists = function (path, storageType) {
        return this.android.exists(path, storageType);
    };
    DataSet.prototype.getNumTrackables = function () {
        return this.android.getNumTrackables();
    };
    DataSet.prototype.getTrackable = function (idx) {
        var trackable = this.android.getTrackable(idx);
        if (trackable)
            return Trackable.createTrackable(trackable);
        return undefined;
    };
    DataSet.prototype.hasReachedTrackableLimit = function () {
        return this.android.hasReachedTrackableLimit();
    };
    DataSet.prototype.isActive = function () {
        return this.android.isActive();
    };
    DataSet.prototype.load = function (path, storageType) {
        return this.android.load(path, storageType);
    };
    return DataSet;
}());
var ObjectTracker = /** @class */ (function (_super) {
    __extends(ObjectTracker, _super);
    function ObjectTracker(android) {
        var _this = _super.call(this) || this;
        _this.android = android;
        return _this;
    }
    ObjectTracker.prototype.start = function () {
        return this.android.start();
    };
    ObjectTracker.prototype.stop = function () {
        this.android.stop();
    };
    ObjectTracker.prototype.createDataSet = function () {
        var ds = this.android.createDataSet();
        if (ds)
            return new DataSet(ds);
        return undefined;
    };
    ObjectTracker.prototype.destroyDataSet = function (dataSet) {
        return this.android.destroyDataSet(dataSet.android);
    };
    ObjectTracker.prototype.activateDataSet = function (dataSet) {
        return this.android.activateDataSet(dataSet.android);
    };
    ObjectTracker.prototype.deactivateDataSet = function (dataSet) {
        return this.android.deactivateDataSet(dataSet.android);
    };
    return ObjectTracker;
}(Tracker));
exports.ObjectTracker = ObjectTracker;
exports.api = VUFORIA_AVAILABLE ? new API() : undefined;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5hbmRyb2lkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidnVmb3JpYS5hbmRyb2lkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx1Q0FBdUM7Ozs7Ozs7Ozs7OztBQUV2Qyx5Q0FBNEM7QUFDNUMsMENBQTZDO0FBQzdDLHlDQUE0QztBQUM1Qyw0Q0FBK0M7QUFDL0Msc0RBQWtEO0FBQ2xELElBQU8sT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7QUFDN0IsSUFBTyxNQUFNLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFFbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFFcEMsSUFBTSxJQUFJLEdBQVksT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN6RCxJQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUE7QUFDNUUsMEVBQTBFO0FBRTFFLElBQUksZ0JBQWdCLEdBQW1DLFNBQVMsQ0FBQztBQUNqRSxJQUFJLGVBQWUsR0FBcUMsU0FBUyxDQUFDO0FBQ2xFLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztBQUVYLFFBQUEsU0FBUyxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO0FBRTFDLG9HQUFvRztBQUNwRztJQUNJLElBQU0sb0JBQW9CLEdBQUcsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFM0Qsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsVUFBQyxHQUFtQztRQUNuRyxnQkFBZ0IsR0FBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMs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LE9BQU8sQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFDRCx5Q0FBaUIsR0FBakIsVUFBa0IsT0FBZTtRQUM3QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFDTCxvQkFBQztBQUFELENBQUMsQUF0QkQsQ0FBbUMsT0FBTyxHQXNCekM7QUF0Qlksc0NBQWE7QUF3QmIsUUFBQSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQgY29tbW9uID0gcmVxdWlyZSgnLi92dWZvcmlhLWNvbW1vbicpO1xuaW1wb3J0IGRlZiA9IHJlcXVpcmUoJ25hdGl2ZXNjcmlwdC12dWZvcmlhJyk7XG5pbXBvcnQgYXBwbGljYXRpb24gPSByZXF1aXJlKCdhcHBsaWNhdGlvbicpO1xuaW1wb3J0IHBsYWNlaG9sZGVyID0gcmVxdWlyZSgndWkvcGxhY2Vob2xkZXInKTtcbmltcG9ydCB7R3JpZExheW91dH0gZnJvbSAndWkvbGF5b3V0cy9ncmlkLWxheW91dCc7XG5pbXBvcnQgdnVmb3JpYSA9IGNvbS52dWZvcmlhO1xuaW1wb3J0IHBsdWdpbiA9IGlvLmFyZ29uanMudnVmb3JpYTtcblxuZ2xvYmFsLm1vZHVsZU1lcmdlKGNvbW1vbiwgZXhwb3J0cyk7XG5cbmNvbnN0IGFiaXM6c3RyaW5nW10gPSBhbmRyb2lkLm9zLkJ1aWxkWydTVVBQT1JURURfQUJJUyddO1xuY29uc3QgVlVGT1JJQV9BVkFJTEFCTEUgPSBBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMuY2FsbChhYmlzLCAnYXJtZWFiaS12N2EnKVxuLy8gY29uc3QgVlVGT1JJQV9BVkFJTEFCTEUgPSB0eXBlb2YgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uwqAhPT0gJ3VuZGVmaW5lZCc7XG5cbnZhciBhbmRyb2lkVmlkZW9WaWV3OiBwbHVnaW4uVnVmb3JpYUdMVmlld3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG52YXIgdnVmb3JpYVJlbmRlcmVyOiBwbHVnaW4uVnVmb3JpYVJlbmRlcmVyfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbnZhciBpbml0aWFsaXplZCA9IGZhbHNlO1xuXG5leHBvcnQgY29uc3QgdmlkZW9WaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcblxuLy8gb24gQW5kcm9pZCwgd2UgbmVlZCB0byB3YWl0IGZvciBWdWZvcmlhIHRvIGJlIGluaXRpYWxpemVkIGJlZm9yZSBjcmVhdGluZyB0aGUgZ2xWaWV3IGFuZCByZW5kZXJlclxuZnVuY3Rpb24gaW5pdFZpZGVvVmlldygpIHtcbiAgICBjb25zdCB2aWRlb1ZpZXdQbGFjZWhvbGRlciA9IG5ldyBwbGFjZWhvbGRlci5QbGFjZWhvbGRlcigpO1xuXG4gICAgdmlkZW9WaWV3UGxhY2Vob2xkZXIub24ocGxhY2Vob2xkZXIuUGxhY2Vob2xkZXIuY3JlYXRpbmdWaWV3RXZlbnQsIChldnQ6cGxhY2Vob2xkZXIuQ3JlYXRlVmlld0V2ZW50RGF0YSk9PntcbiAgICAgICAgYW5kcm9pZFZpZGVvVmlldyA9IDxwbHVnaW4uVnVmb3JpYUdMVmlldz4gKFZVRk9SSUFfQVZBSUxBQkxFID8gbmV3IHBsdWdpbi5WdWZvcmlhR0xWaWV3KGFwcGxpY2F0aW9uLmFuZHJvaWQuY29udGV4dCkgOiB1bmRlZmluZWQpO1xuICAgICAgICBldnQudmlldyA9IGFuZHJvaWRWaWRlb1ZpZXc7XG5cbiAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5pbml0KHZ1Zm9yaWEuVnVmb3JpYS5yZXF1aXJlc0FscGhhKCksIDE2LCAwKTtcblxuICAgICAgICB2dWZvcmlhUmVuZGVyZXIgPSBuZXcgcGx1Z2luLlZ1Zm9yaWFSZW5kZXJlcigpO1xuICAgICAgICBhbmRyb2lkVmlkZW9WaWV3LnNldFJlbmRlcmVyKDxhbnk+dnVmb3JpYVJlbmRlcmVyKTtcbiAgICAgICAgdnVmb3JpYVJlbmRlcmVyLm1Jc0FjdGl2ZSA9IHRydWVcbiAgICB9KVxuXG4gICAgdmlkZW9WaWV3UGxhY2Vob2xkZXIub25Mb2FkZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgIH1cblxuICAgIHZpZGVvVmlld1BsYWNlaG9sZGVyLm9uTGF5b3V0ID0gZnVuY3Rpb24obGVmdCwgdG9wLCByaWdodCwgYm90dG9tKSB7XG4gICAgICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICB9XG5cbiAgICB2aWRlb1ZpZXcuYWRkQ2hpbGQodmlkZW9WaWV3UGxhY2Vob2xkZXIpO1xufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5zdXNwZW5kRXZlbnQsICgpPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUGF1c2luZyBWdWZvcmlhJyk7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblBhdXNlKCk7XG4gICAgICAgIGlmIChpbml0aWFsaXplZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1BhdXNpbmcgY2FtZXJhIGFuZCByZW5kZXJlcicpO1xuICAgICAgICAgICAgYXBpICYmIGFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdG9wKCk7XG4gICAgICAgICAgICBhbmRyb2lkVmlkZW9WaWV3ICYmIGFuZHJvaWRWaWRlb1ZpZXcub25QYXVzZSgpO1xuICAgICAgICAgICAgdnVmb3JpYVJlbmRlcmVyICYmICh2dWZvcmlhUmVuZGVyZXIubUlzQWN0aXZlID0gZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxufSlcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpID0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihjb25maWd1cmVWdWZvcmlhU3VyZmFjZSk7IC8vIGRlbGF5IHVudGlsIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDApO1xuICAgIH1cbn0pO1xuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZXN1bWluZyBWdWZvcmlhJyk7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblJlc3VtZSgpO1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgICAgICBpZiAoaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXN1bWluZyBjYW1lcmEgYW5kIHJlbmRlcmVyJyk7XG4gICAgICAgICAgICBhcGkgJiYgYXBpLmdldENhbWVyYURldmljZSgpLnN0YXJ0KCk7XG4gICAgICAgICAgICBhbmRyb2lkVmlkZW9WaWV3ICYmIGFuZHJvaWRWaWRlb1ZpZXcub25SZXN1bWUoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWFSZW5kZXJlciAmJiAodnVmb3JpYVJlbmRlcmVyLm1Jc0FjdGl2ZSA9IHRydWUpO1xuICAgICAgICB9XG4gICAgfVxufSlcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCkge1xuICAgIGlmICghYXBpKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICBpZiAoYW5kcm9pZFZpZGVvVmlldyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcuZ2V0V2lkdGgoKSxcbiAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5nZXRIZWlnaHQoKVxuICAgICk7XG4gICAgY29uc29sZS5sb2coXCJjb25maWd1cmVWdWZvcmlhU3VyZmFjZTogXCIgKyBhbmRyb2lkVmlkZW9WaWV3LmdldFdpZHRoKCkgKyBcIiwgXCIgKyBhbmRyb2lkVmlkZW9WaWV3LmdldEhlaWdodCgpKTtcbn1cblxuZXhwb3J0IGNsYXNzIEFQSSBleHRlbmRzIGNvbW1vbi5BUElCYXNlIHtcbiAgICBcbiAgICBwcml2YXRlIGNhbWVyYURldmljZSA9IG5ldyBDYW1lcmFEZXZpY2UoKTtcbiAgICBwcml2YXRlIGRldmljZSA9IG5ldyBEZXZpY2UoKTtcbiAgICBwcml2YXRlIHJlbmRlcmVyID0gbmV3IFJlbmRlcmVyKCk7XG4gICAgXG4gICAgc2V0TGljZW5zZUtleShsaWNlbnNlS2V5OnN0cmluZykgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5ICE9IG51bGwgJiYgbGljZW5zZUtleSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2V0TGljZW5zZUtleShhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eSwgbGljZW5zZUtleSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIHNldEhpbnQoaGludDpkZWYuSGludCx2YWx1ZTpudW1iZXIpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLlZ1Zm9yaWEuc2V0SGludCg8bnVtYmVyPmhpbnQsIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLmluaXQobmV3IHBsdWdpbi5WdWZvcmlhQ29udHJvbCh7XG4gICAgICAgICAgICAgICAgb25Jbml0QVJEb25lKHJlc3VsdDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gdnVmb3JpYS5Jbml0UmVzdWx0LlNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGkuZ2V0RGV2aWNlKCkuc2V0TW9kZShkZWYuRGV2aWNlTW9kZS5BUilcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmRyb2lkVmlkZW9WaWV3ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0VmlkZW9WaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhUmVuZGVyZXIgJiYgKHZ1Zm9yaWFSZW5kZXJlci5tSXNBY3RpdmUgPSB0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDUwMDApOyAvLyB0aGlzIHNob3VsZG4ndCBiZSByZXF1aXJlZCwgYnV0IHNvbWV0aW1lcyB0aGUgdmlkZW8gZmVlZCBkb2Vzbid0IGFwcGVhciBhZnRlciByZWluaXRcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5WdWZvcmlhLnJlZ2lzdGVyQ2FsbGJhY2sobmV3IHZ1Zm9yaWEuVnVmb3JpYS5VcGRhdGVDYWxsYmFja0ludGVyZmFjZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVnVmb3JpYV9vblVwZGF0ZShzdGF0ZTogdnVmb3JpYS5TdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXBpICYmIGFwaS51cGRhdGVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaS51cGRhdGVDYWxsYmFjayhuZXcgU3RhdGUoc3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblJlc3VtZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoPGRlZi5Jbml0UmVzdWx0PjxudW1iZXI+cmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKSA6IHZvaWQge1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEuZGVpbml0KCk7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblBhdXNlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURldmljZSgpIDogQ2FtZXJhRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FtZXJhRGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXREZXZpY2UoKSA6IERldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyZXIoKSA6IFJlbmRlcmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyZXI7XG4gICAgfVxuXG4gICAgaW5pdFNtYXJ0VGVycmFpbigpOiBib29sZWFuIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC5cIik7XG4gICAgfVxuXG4gICAgZ2V0U21hcnRUZXJyYWluKCk6IGRlZi5TbWFydFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcbiAgICB9XG5cbiAgICBkZWluaXRTbWFydFRlcnJhaW4oKTogYm9vbGVhbiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICAgIH1cblxuICAgIGluaXRQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcigpOiBib29sZWFuIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC5cIik7XG4gICAgfVxuXG4gICAgZ2V0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKTogZGVmLlBvc2l0aW9uYWxEZXZpY2VUcmFja2VyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC5cIik7XG4gICAgfVxuXG4gICAgZGVpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKTogYm9vbGVhbiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICAgIH1cbiAgICBcbiAgICBpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIHZhciB0cmFja2VyID0gPHZ1Zm9yaWEuT2JqZWN0VHJhY2tlcj4gdnVmb3JpYS5UcmFja2VyTWFuYWdlci5nZXRJbnN0YW5jZSgpLmluaXRUcmFja2VyKHZ1Zm9yaWEuT2JqZWN0VHJhY2tlci5nZXRDbGFzc1R5cGUoKSk7XG4gICAgICAgIGlmICh0cmFja2VyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IG5ldyBPYmplY3RUcmFja2VyKHRyYWNrZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHZ1Zm9yaWEuVHJhY2tlck1hbmFnZXIuZ2V0SW5zdGFuY2UoKS5kZWluaXRUcmFja2VyKHZ1Zm9yaWEuT2JqZWN0VHJhY2tlci5nZXRDbGFzc1R5cGUoKSkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRTY2FsZUZhY3RvcihmOm51bWJlcikge1xuICAgICAgICBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IgJiYgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yKGYpO1xuICAgIH1cblxuICAgIGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNjYWxlRmFjdG9yKCk7XG4gICAgfVxuXG4gICAgc2V0VGFyZ2V0RlBTKGY6bnVtYmVyKSB7XG5cbiAgICB9XG5cbiAgICBnZXRUYXJnZXRGUFMoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiA2MFxuICAgIH1cblxuICAgIG9uU3VyZmFjZUNoYW5nZWQod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyKSA6IHZvaWQge1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ2hhbmdlZCh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLypcbiAgICAgICAgY29uc3Qgb3JpZW50YXRpb246VUlJbnRlcmZhY2VPcmllbnRhdGlvbiA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikuc3RhdHVzQmFyT3JpZW50YXRpb247XG4gICAgICAgIHN3aXRjaCAob3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXRVcHNpZGVEb3duOiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzI3MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlTGVmdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18xODApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLkxhbmRzY2FwZVJpZ2h0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgIH1cbiAgICAgICAgKi9cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZlYzIodmVjOnZ1Zm9yaWEuVmVjMkYpIDogZGVmLlZlYzIge1xuICAgIHZhciBkYXRhID0gdmVjLmdldERhdGEoKTtcbiAgICByZXR1cm4geyB4OiBkYXRhWzBdLCB5OiBkYXRhWzFdIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZlYzModmVjOnZ1Zm9yaWEuVmVjM0YpIDogZGVmLlZlYzMge1xuICAgIHZhciBkYXRhID0gdmVjLmdldERhdGEoKTtcbiAgICByZXR1cm4geyB4OiBkYXRhWzBdLCB5OiBkYXRhWzFdLCB6OiBkYXRhWzJdIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZlYzQodmVjOnZ1Zm9yaWEuVmVjNEYpIDogZGVmLlZlYzQge1xuICAgIHZhciBkYXRhID0gdmVjLmdldERhdGEoKTtcbiAgICByZXR1cm4geyB4OiBkYXRhWzBdLCB5OiBkYXRhWzFdLCB6OiBkYXRhWzJdLCB3OiBkYXRhWzNdIH07XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnQyR0xNYXRyaXgobWF0OnZ1Zm9yaWEuTWF0cml4MzRGKSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgdmFyIGRhdGEgPSBtYXQuZ2V0RGF0YSgpO1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIGRhdGFbMF0sXG4gICAgICAgICAgICAgICAgZGF0YVs0XSxcbiAgICAgICAgICAgICAgICBkYXRhWzhdLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVsxXSxcbiAgICAgICAgICAgICAgICBkYXRhWzVdLFxuICAgICAgICAgICAgICAgIGRhdGFbOV0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzJdLFxuICAgICAgICAgICAgICAgIGRhdGFbNl0sXG4gICAgICAgICAgICAgICAgZGF0YVsxMF0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzNdLFxuICAgICAgICAgICAgICAgIGRhdGFbN10sXG4gICAgICAgICAgICAgICAgZGF0YVsxMV0sXG4gICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgXTtcbn1cblxuLy8gaHR0cHM6Ly9saWJyYXJ5LnZ1Zm9yaWEuY29tL2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1BY2Nlc3MtQ2FtZXJhLVBhcmFtZXRlcnNcbmZ1bmN0aW9uIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgobWF0OnZ1Zm9yaWEuTWF0cml4MzRGLCBuZWFyOm51bWJlciwgZmFyOm51bWJlcikgOiBkZWYuTWF0cml4NDQge1xuICAgIHZhciBkYXRhID0gbWF0LmdldERhdGEoKTtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgICAgICAgICBkYXRhWzBdLFxuICAgICAgICAgICAgICAgIGRhdGFbNF0sXG4gICAgICAgICAgICAgICAgZGF0YVs4XSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbMV0sXG4gICAgICAgICAgICAgICAgZGF0YVs1XSxcbiAgICAgICAgICAgICAgICBkYXRhWzldLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVsyXSxcbiAgICAgICAgICAgICAgICBkYXRhWzZdLFxuICAgICAgICAgICAgICAgIChmYXIgKyBuZWFyKSAvIChmYXIgLSBuZWFyKSxcbiAgICAgICAgICAgICAgICAxLFxuICAgICAgICAgICAgICAgIGRhdGFbM10sXG4gICAgICAgICAgICAgICAgZGF0YVs3XSxcbiAgICAgICAgICAgICAgICAtbmVhciAqICgxICsgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpKSxcbiAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICBdO1xufVxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlIHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlKGFuZHJvaWQ6dnVmb3JpYS5UcmFja2FibGUpIHtcbiAgICAgICAgLypcbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLk1hcmtlcikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXJrZXIoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5Xb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFdvcmQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICovXG4gICAgICAgIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5JbWFnZVRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkN5bGluZGVyVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuT2JqZWN0VGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldChhbmRyb2lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5UcmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlKGFuZHJvaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZSkge31cbiAgICBcbiAgICBnZXRJZCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldElkKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROYW1lKCk7XG4gICAgfVxuICAgIGlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpO1xuICAgIH1cbiAgICBzdGFydEV4dGVuZGVkVHJhY2tpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxuICAgIHN0b3BFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLnN0b3BFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlUmVzdWx0IHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlUmVzdWx0KGFuZHJvaWQ6dnVmb3JpYS5UcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgLypcbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLk1hcmtlclJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXJrZXJSZXN1bHQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5Xb3JkUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRSZXN1bHQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICovXG4gICAgICAgIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5JbWFnZVRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldFJlc3VsdChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0UmVzdWx0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuT2JqZWN0VGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldFJlc3VsdChhbmRyb2lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5UcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlUmVzdWx0KGFuZHJvaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdCkge31cbiAgICBcbiAgICBnZXRQb3NlKCk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHZhciBtYXQzNCA9IHRoaXMuYW5kcm9pZC5nZXRQb3NlKCk7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KG1hdDM0KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VGltZVN0YW1wKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdGF0dXMoKTogZGVmLlRyYWNrYWJsZVJlc3VsdFN0YXR1cyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRTdGF0dXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJhY2thYmxlKCk6IFRyYWNrYWJsZSB7XG4gICAgICAgIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGUoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGV2aWNlVHJhY2thYmxlIGV4dGVuZHMgVHJhY2thYmxlIHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5EZXZpY2VUcmFja2FibGUpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIERldmljZVRyYWNrYWJsZVJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuRGV2aWNlVHJhY2thYmxlUmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXJrZXIgZXh0ZW5kcyBUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTWFya2VyKSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXJrZXJSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTWFya2VyUmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkIGV4dGVuZHMgVHJhY2thYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLldvcmQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIFdvcmRSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLldvcmRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldCBleHRlbmRzIFRyYWNrYWJsZSB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0KSB7c3VwZXIoYW5kcm9pZCl9XG4gICAgXG4gICAgZ2V0VW5pcXVlVGFyZ2V0SWQoKSA6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMyB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMzKHRoaXMuYW5kcm9pZC5nZXRTaXplKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFnZVRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuSW1hZ2VUYXJnZXQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIEltYWdlVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5JbWFnZVRhcmdldFJlc3VsdCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTXVsdGlUYXJnZXQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5PYmplY3RUYXJnZXRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIEN5bGluZGVyVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5DeWxpbmRlclRhcmdldCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgQ3lsaW5kZXJUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFnZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5JbWFnZSkge31cbiAgICBcbiAgICBnZXRCdWZmZXJIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRCdWZmZXJIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0QnVmZmVyV2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0QnVmZmVyV2lkdGgoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9ybWF0KCk6IGRlZi5QaXhlbEZvcm1hdCB7IFxuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0Rm9ybWF0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEhlaWdodCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UGl4ZWxzKCk6IGludGVyb3AuUG9pbnRlcnx1bmRlZmluZWQgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRQaXhlbHMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U3RyaWRlKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFN0cmlkZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRXaWR0aCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZyYW1lIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkZyYW1lKSB7fVxuICAgIGdldEltYWdlKGlkeDogbnVtYmVyKTogSW1hZ2V8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgaW1nID0gdGhpcy5hbmRyb2lkLmdldEltYWdlKGlkeCk7XG4gICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2UoaW1nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEluZGV4KCk7XG4gICAgfVxuICAgIGdldE51bUltYWdlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bUltYWdlcygpO1xuICAgIH1cbiAgICBnZXRUaW1lU3RhbXAoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRUaW1lU3RhbXAoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5TdGF0ZSkge31cbiAgICBnZXRGcmFtZSgpOiBGcmFtZSB7XG4gICAgICAgIGNvbnN0IGZyYW1lID0gdGhpcy5hbmRyb2lkLmdldEZyYW1lKCk7XG4gICAgICAgIHJldHVybiBuZXcgRnJhbWUoZnJhbWUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVSZXN1bHRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGVSZXN1bHQoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlUmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGVSZXN1bHQoaWR4KTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZVJlc3VsdC5jcmVhdGVUcmFja2FibGVSZXN1bHQocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRDYW1lcmFDYWxpYnJhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBDYW1lcmFDYWxpYnJhdGlvbih0aGlzLmFuZHJvaWQuZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKSk7XG4gICAgfVxuICAgIGdldElsbHVtaW5hdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRJbGx1bWluYXRpb24oKVxuICAgIH1cbiAgICBnZXREZXZpY2VUcmFja2FibGVSZXN1bHQoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGV2aWNlVHJhY2thYmxlUmVzdWx0KHRoaXMuYW5kcm9pZC5nZXREZXZpY2VUcmFja2FibGVSZXN1bHQoKSlcbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkNhbWVyYUNhbGlicmF0aW9uKSB7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGaWVsZE9mVmlld1JhZHMoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0RmllbGRPZlZpZXdSYWRzKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGb2NhbExlbmd0aCgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRGb2NhbExlbmd0aCgpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJpbmNpcGFsUG9pbnQoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0UHJpbmNpcGFsUG9pbnQoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFNpemUoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0U2l6ZSgpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDYW1lcmFEZXZpY2Uge1xuICAgIGluaXQoY2FtZXJhOiBkZWYuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmluaXQoPG51bWJlcj5jYW1lcmEpO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmRlaW5pdCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFDYWxpYnJhdGlvbigpOiBDYW1lcmFDYWxpYnJhdGlvbiB7XG4gICAgICAgIGNvbnN0IGNhbGlicmF0aW9uID0gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRDYW1lcmFDYWxpYnJhdGlvbigpO1xuICAgICAgICByZXR1cm4gbmV3IENhbWVyYUNhbGlicmF0aW9uKGNhbGlicmF0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGlyZWN0aW9uKCk6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24ge1xuICAgICAgICByZXR1cm4gPG51bWJlcj52dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYURpcmVjdGlvbigpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WaWRlb01vZGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldE51bVZpZGVvTW9kZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9Nb2RlKG5JbmRleDogbnVtYmVyKTogZGVmLlZpZGVvTW9kZSB7XG4gICAgICAgIHZhciB2aWRlb01vZGUgPSB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZGVvTW9kZShuSW5kZXgpO1xuICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgd2lkdGg6IHZpZGVvTW9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb01vZGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgICAgICBmcmFtZXJhdGU6IHZpZGVvTW9kZS5nZXRGcmFtZXJhdGUoKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICBzZWxlY3RWaWRlb01vZGUoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWRlb01vZGUoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBzZXRGbGFzaFRvcmNoTW9kZShvbjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGbGFzaFRvcmNoTW9kZShvbik7XG4gICAgfVxuICAgIFxuICAgIHNldEZvY3VzTW9kZShmb2N1c01vZGU6IGRlZi5DYW1lcmFEZXZpY2VGb2N1c01vZGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Rm9jdXNNb2RlKDxudW1iZXI+Zm9jdXNNb2RlKTtcbiAgICB9XG4gICAgXG4gICAgc3RhcnQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIFxuICAgIHN0b3AoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3TGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5WaWV3TGlzdCkge31cbiAgICBjb250YWlucyh2aWV3OiBkZWYuVmlldyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmNvbnRhaW5zKDxudW1iZXI+dmlldyk7XG4gICAgfVxuICAgIGdldE51bVZpZXdzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVmlld3MoKTtcbiAgICB9XG4gICAgZ2V0VmlldyhpZHg6IG51bWJlcik6IGRlZi5WaWV3IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldFZpZXcoaWR4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlZpZXdlclBhcmFtZXRlcnMpIHt9XG4gICAgY29udGFpbnNNYWduZXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuY29udGFpbnNNYWduZXQoKTtcbiAgICB9XG4gICAgZ2V0QnV0dG9uVHlwZSgpOiBkZWYuVmlld2VyUGFyYW10ZXJzQnV0dG9uVHlwZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRCdXR0b25UeXBlKCk7XG4gICAgfVxuICAgIGdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHg6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeCk7XG4gICAgfVxuICAgIGdldEZpZWxkT2ZWaWV3KCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldEZpZWxkT2ZWaWV3KCkpO1xuICAgIH1cbiAgICBnZXRJbnRlckxlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEludGVyTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRNYW51ZmFjdHVyZXIoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRNYW51ZmFjdHVyZXIoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5hbWUoKTtcbiAgICB9XG4gICAgZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bURpc3RvcnRpb25Db2VmZmljaWVudHMoKTtcbiAgICB9XG4gICAgZ2V0U2NyZWVuVG9MZW5zRGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRUcmF5QWxpZ25tZW50KCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNUcmF5QWxpZ25tZW50IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldFRyYXlBbGlnbm1lbnQoKTtcbiAgICB9XG4gICAgZ2V0VmVyc2lvbigpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFZlcnNpb24oKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5WaWV3ZXJQYXJhbWV0ZXJzTGlzdCkge31cbiAgICBnZXQoaWR4OiBudW1iZXIpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5hbmRyb2lkLmdldChpZHgpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE5hbWVNYW51ZmFjdHVyZXIobmFtZTogc3RyaW5nLCBtYW51ZmFjdHVyZXI6IHN0cmluZyk6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmFuZHJvaWQuZ2V0KG5hbWUsIG1hbnVmYWN0dXJlcik7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgc2V0U0RLRmlsdGVyKGZpbHRlcjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5zZXRTREtGaWx0ZXIoZmlsdGVyKTtcbiAgICB9XG4gICAgc2l6ZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLnNpemUoKTtcbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIERldmljZSB7XG4gICAgc2V0TW9kZShtb2RlOmRlZi5EZXZpY2VNb2RlKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRNb2RlKDxudW1iZXI+bW9kZSk7XG4gICAgfVxuICAgIGdldE1vZGUoKSA6IGRlZi5EZXZpY2VNb2RlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRNb2RlKCk7XG4gICAgfVxuICAgIHNldFZpZXdlckFjdGl2ZShhY3RpdmU6Ym9vbGVhbikgOiB2b2lkIHtcbiAgICAgICAgdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRWaWV3ZXJBY3RpdmUoYWN0aXZlKTtcbiAgICB9XG4gICAgaXNWaWV3ZXJBY3RpdmUoKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5pc1ZpZXdlckFjdGl2ZSgpO1xuICAgIH1cbiAgICBnZXRWaWV3ZXJMaXN0KCkgOiBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgICAgIGNvbnN0IHZpZXdlckxpc3QgPSB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZXdlckxpc3QoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCh2aWV3ZXJMaXN0KTtcbiAgICB9XG4gICAgc2VsZWN0Vmlld2VyKHZpZXdlcjpWaWV3ZXJQYXJhbWV0ZXJzKSB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZXdlcih2aWV3ZXIuYW5kcm9pZCk7XG4gICAgfVxuICAgIGdldFNlbGVjdGVkVmlld2VyKCkgOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghdGhpcy5pc1ZpZXdlckFjdGl2ZSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRTZWxlY3RlZFZpZXdlcigpKTtcbiAgICB9XG4gICAgZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpOiBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZW5kZXJpbmdQcmltaXRpdmVzKHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJlciB7XG4gICAgZ2V0UmVjb21tZW5kZWRGcHMoZmxhZ3M6IGRlZi5GUFNIaW50KTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5nZXRSZWNvbW1lbmRlZEZwcyg8bnVtYmVyPmZsYWdzKTtcbiAgICB9XG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCk6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcge1xuICAgICAgICB2YXIgdmJjOiB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZyA9IHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5nZXRWaWRlb0JhY2tncm91bmRDb25maWcoKTtcbiAgICAgICAgdmFyIHJlc3VsdDogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6dmJjLmdldEVuYWJsZWQoKSxcbiAgICAgICAgICAgIHBvc2l0aW9uWDp2YmMuZ2V0UG9zaXRpb24oKS5nZXREYXRhKClbMF0sXG4gICAgICAgICAgICBwb3NpdGlvblk6dmJjLmdldFBvc2l0aW9uKCkuZ2V0RGF0YSgpWzFdLFxuICAgICAgICAgICAgc2l6ZVg6dmJjLmdldFNpemUoKS5nZXREYXRhKClbMF0sXG4gICAgICAgICAgICBzaXplWTp2YmMuZ2V0U2l6ZSgpLmdldERhdGEoKVsxXSxcbiAgICAgICAgICAgIHJlZmxlY3Rpb246dmJjLmdldFJlZmxlY3Rpb24oKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBzZXRUYXJnZXRGcHMoZnBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5zZXRUYXJnZXRGcHMoZnBzKTtcbiAgICB9XG4gICAgc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKGNmZzogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyk6IHZvaWQge1xuICAgICAgICB2YXIgdmJjOiB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZyA9IG5ldyB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZygpO1xuICAgICAgICB2YmMuc2V0RW5hYmxlZChjZmcuZW5hYmxlZCk7XG4gICAgICAgIHZiYy5zZXRQb3NpdGlvbihuZXcgdnVmb3JpYS5WZWMySShjZmcucG9zaXRpb25YLCBjZmcucG9zaXRpb25ZKSk7XG4gICAgICAgIHZiYy5zZXRTaXplKG5ldyB2dWZvcmlhLlZlYzJJKGNmZy5zaXplWCwgY2ZnLnNpemVZKSk7XG4gICAgICAgIHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5zZXRWaWRlb0JhY2tncm91bmRDb25maWcodmJjKTtcbiAgICB9XG59XG5cbi8vIGludGVyb3AuUmVmZXJlbmNlIGRvZXMgbm90IGV4aXN0IG9uIEFuZHJvaWRcbi8vIE1lc2ggd2lsbCBoYXZlIHRvIGJlIHJldGhvdWdodCBmb3IgY3Jvc3MtcGxhdGZvcm0gdXNlXG5leHBvcnQgY2xhc3MgTWVzaCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5NZXNoKSB7fVxuICAgIFxuICAgIGdldE5vcm1hbENvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5vcm1hbENvb3JkaW5hdGVzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE5vcm1hbHMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROb3JtYWxzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE51bVRyaWFuZ2xlcygpOiBudW1iZXIge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJpYW5nbGVzKCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WZXJ0aWNlcygpOiBudW1iZXIge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVmVydGljZXMoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0UG9zaXRpb25Db29yZGluYXRlcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRQb3NpdGlvbnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRQb3NpdGlvbnMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJpYW5nbGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFRyaWFuZ2xlcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVkNvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFVWQ29vcmRpbmF0ZXMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgZ2V0VVZzKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0VVZzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGhhc05vcm1hbHMoKTogYm9vbGVhbiB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5oYXNOb3JtYWxzKCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaGFzUG9zaXRpb25zKCk6IGJvb2xlYW4ge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuaGFzUG9zaXRpb25zKCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaGFzVVZzKCk6IGJvb2xlYW4ge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuaGFzVVZzKCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlJlbmRlcmluZ1ByaW1pdGl2ZXMpe31cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZU1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25UZXh0dXJlTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uVGV4dHVyZVNpemUoPG51bWJlcj52aWV3SUQpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgdmFyIG1hdDM0ID0gdGhpcy5hbmRyb2lkLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnQyR0xNYXRyaXgobWF0MzQpO1xuICAgIH1cbiAgICBcbiAgICBnZXROb3JtYWxpemVkVmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldE5vcm1hbGl6ZWRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQcm9qZWN0aW9uTWF0cml4KHZpZXdJRDogZGVmLlZpZXcsIGNhbWVyYUNhbGlicmF0aW9uOiBkZWYuQ2FtZXJhQ2FsaWJyYXRpb24pOiBkZWYuTWF0cml4NDQge1xuICAgICAgICBjb25zdCBhbmRyb2lkQ2FtZXJhQ2FsaWJyYXRpb24gPSBjYW1lcmFDYWxpYnJhdGlvblsnYW5kcm9pZCddIGFzIHZ1Zm9yaWEuQ2FtZXJhQ2FsaWJyYXRpb25cbiAgICAgICAgdmFyIG1hdDM0ID0gdGhpcy5hbmRyb2lkLmdldFByb2plY3Rpb25NYXRyaXgoPG51bWJlcj52aWV3SUQsIGFuZHJvaWRDYW1lcmFDYWxpYnJhdGlvbiwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KG1hdDM0LCAwLjAxLCAxMDAwMDApXG4gICAgfVxuICAgIFxuICAgIGdldFJlbmRlcmluZ1ZpZXdzKCk6IFZpZXdMaXN0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3TGlzdCh0aGlzLmFuZHJvaWQuZ2V0UmVuZGVyaW5nVmlld3MoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZE1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5hbmRyb2lkLmdldFZpZGVvQmFja2dyb3VuZE1lc2goPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gbmV3IE1lc2gobWVzaCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZFByb2plY3Rpb25NYXRyaXgodmlld0lEOiBkZWYuVmlldyk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHZhciBtYXQzNCA9IHRoaXMuYW5kcm9pZC5nZXRWaWRlb0JhY2tncm91bmRQcm9qZWN0aW9uTWF0cml4KDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgobWF0MzQsIDAuMDEsIDEwMDAwMCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbn1cblxuZXhwb3J0IGNsYXNzIFRyYWNrZXIge31cblxuY2xhc3MgRGF0YVNldCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5EYXRhU2V0KXt9XG4gICAgY3JlYXRlTXVsdGlUYXJnZXQobmFtZTogc3RyaW5nKTogTXVsdGlUYXJnZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgbXQgPSB0aGlzLmFuZHJvaWQuY3JlYXRlTXVsdGlUYXJnZXQobmFtZSk7XG4gICAgICAgIGlmIChtdCkgcmV0dXJuIG5ldyBNdWx0aVRhcmdldChtdCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGRlc3Ryb3kodHJhY2thYmxlOiBUcmFja2FibGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5kZXN0cm95KHRyYWNrYWJsZS5hbmRyb2lkKTtcbiAgICB9XG4gICAgZXhpc3RzKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmV4aXN0cyhwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaGFzUmVhY2hlZFRyYWNrYWJsZUxpbWl0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmhhc1JlYWNoZWRUcmFja2FibGVMaW1pdCgpO1xuICAgIH1cbiAgICBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5pc0FjdGl2ZSgpO1xuICAgIH1cbiAgICBsb2FkKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmxvYWQocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VHJhY2tlciBleHRlbmRzIFRyYWNrZXIge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VHJhY2tlcil7IHN1cGVyKCk7IH1cbiAgICBzdGFydCgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc3RhcnQoKTtcbiAgICB9XG4gICAgc3RvcCgpIDogdm9pZCB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5zdG9wKCk7XG4gICAgfVxuICAgIGNyZWF0ZURhdGFTZXQoKSA6IERhdGFTZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgZHMgPSB0aGlzLmFuZHJvaWQuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICBpZiAoZHMpIHJldHVybiBuZXcgRGF0YVNldChkcyk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXHRkZXN0cm95RGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHRoaXMuYW5kcm9pZC5kZXN0cm95RGF0YVNldChkYXRhU2V0LmFuZHJvaWQpO1xuXHR9XG4gICAgYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5hY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5hbmRyb2lkKTtcbiAgICB9XG4gICAgZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuYW5kcm9pZCk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgYXBpID0gVlVGT1JJQV9BVkFJTEFCTEUgPyBuZXcgQVBJKCkgOiB1bmRlZmluZWQ7XG4iXX0=