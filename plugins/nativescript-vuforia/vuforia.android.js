"use strict";
//import * as utils from 'utils/utils';
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
                                if (exports.api && exports.api.callback)
                                    exports.api.callback(new State(state));
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
var ImageTargetResult = /** @class */ (function (_super) {
    __extends(ImageTargetResult, _super);
    function ImageTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return ImageTargetResult;
}(ObjectTargetResult));
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
var CylinderTargetResult = /** @class */ (function (_super) {
    __extends(CylinderTargetResult, _super);
    function CylinderTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return CylinderTargetResult;
}(ObjectTargetResult));
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
    RenderingPrimitives.prototype.getProjectionMatrix = function (viewID, csType) {
        var mat34 = this.android.getProjectionMatrix(viewID, csType);
        return convertPerspectiveProjection2GLMatrix(mat34, 0.01, 100000);
    };
    RenderingPrimitives.prototype.getRenderingViews = function () {
        return new ViewList(this.android.getRenderingViews());
    };
    RenderingPrimitives.prototype.getVideoBackgroundMesh = function (viewID) {
        var mesh = this.android.getVideoBackgroundMesh(viewID);
        return new Mesh(mesh);
    };
    RenderingPrimitives.prototype.getVideoBackgroundProjectionMatrix = function (viewID, csType) {
        var mat34 = this.android.getVideoBackgroundProjectionMatrix(viewID, csType);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5hbmRyb2lkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidnVmb3JpYS5hbmRyb2lkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx1Q0FBdUM7O0FBRXZDLHlDQUE0QztBQUM1QywwQ0FBNkM7QUFDN0MseUNBQTRDO0FBQzVDLDRDQUErQztBQUMvQyxzREFBa0Q7QUFDbEQsSUFBTyxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztBQUM3QixJQUFPLE1BQU0sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUVuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVwQyxJQUFNLElBQUksR0FBWSxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3pELElBQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQTtBQUM1RSwwRUFBMEU7QUFFMUUsSUFBSSxnQkFBZ0IsR0FBbUMsU0FBUyxDQUFDO0FBQ2pFLElBQUksZUFBZSxHQUFxQyxTQUFTLENBQUM7QUFDbEUsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBRVgsUUFBQSxTQUFTLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7QUFFMUMsb0dBQW9HO0FBQ3BHO0lBQ0ksSUFBTSxvQkFBb0IsR0FBRyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUUzRCxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxVQUFDLEdBQW1DO1FBQ25HLGdCQUFnQixHQUEwQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUEsR0FBRyxHQUFHLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvL2ltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcblxuaW1wb3J0IGNvbW1vbiA9IHJlcXVpcmUoJy4vdnVmb3JpYS1jb21tb24nKTtcbmltcG9ydCBkZWYgPSByZXF1aXJlKCduYXRpdmVzY3JpcHQtdnVmb3JpYScpO1xuaW1wb3J0IGFwcGxpY2F0aW9uID0gcmVxdWlyZSgnYXBwbGljYXRpb24nKTtcbmltcG9ydCBwbGFjZWhvbGRlciA9IHJlcXVpcmUoJ3VpL3BsYWNlaG9sZGVyJyk7XG5pbXBvcnQge0dyaWRMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHZ1Zm9yaWEgPSBjb20udnVmb3JpYTtcbmltcG9ydCBwbHVnaW4gPSBpby5hcmdvbmpzLnZ1Zm9yaWE7XG5cbmdsb2JhbC5tb2R1bGVNZXJnZShjb21tb24sIGV4cG9ydHMpO1xuXG5jb25zdCBhYmlzOnN0cmluZ1tdID0gYW5kcm9pZC5vcy5CdWlsZFsnU1VQUE9SVEVEX0FCSVMnXTtcbmNvbnN0IFZVRk9SSUFfQVZBSUxBQkxFID0gQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzLmNhbGwoYWJpcywgJ2FybWVhYmktdjdhJylcbi8vIGNvbnN0IFZVRk9SSUFfQVZBSUxBQkxFID0gdHlwZW9mIHBsdWdpbi5WdWZvcmlhU2Vzc2lvbsKgIT09ICd1bmRlZmluZWQnO1xuXG52YXIgYW5kcm9pZFZpZGVvVmlldzogcGx1Z2luLlZ1Zm9yaWFHTFZpZXd8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xudmFyIHZ1Zm9yaWFSZW5kZXJlcjogcGx1Z2luLlZ1Zm9yaWFSZW5kZXJlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG52YXIgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuZXhwb3J0IGNvbnN0IHZpZGVvVmlldyA9IG5ldyBHcmlkTGF5b3V0KCk7XG5cbi8vIG9uIEFuZHJvaWQsIHdlIG5lZWQgdG8gd2FpdCBmb3IgVnVmb3JpYSB0byBiZSBpbml0aWFsaXplZCBiZWZvcmUgY3JlYXRpbmcgdGhlIGdsVmlldyBhbmQgcmVuZGVyZXJcbmZ1bmN0aW9uIGluaXRWaWRlb1ZpZXcoKSB7XG4gICAgY29uc3QgdmlkZW9WaWV3UGxhY2Vob2xkZXIgPSBuZXcgcGxhY2Vob2xkZXIuUGxhY2Vob2xkZXIoKTtcblxuICAgIHZpZGVvVmlld1BsYWNlaG9sZGVyLm9uKHBsYWNlaG9sZGVyLlBsYWNlaG9sZGVyLmNyZWF0aW5nVmlld0V2ZW50LCAoZXZ0OnBsYWNlaG9sZGVyLkNyZWF0ZVZpZXdFdmVudERhdGEpPT57XG4gICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcgPSA8cGx1Z2luLlZ1Zm9yaWFHTFZpZXc+IChWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBwbHVnaW4uVnVmb3JpYUdMVmlldyhhcHBsaWNhdGlvbi5hbmRyb2lkLmNvbnRleHQpIDogdW5kZWZpbmVkKTtcbiAgICAgICAgZXZ0LnZpZXcgPSBhbmRyb2lkVmlkZW9WaWV3O1xuXG4gICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcuaW5pdCh2dWZvcmlhLlZ1Zm9yaWEucmVxdWlyZXNBbHBoYSgpLCAxNiwgMCk7XG5cbiAgICAgICAgdnVmb3JpYVJlbmRlcmVyID0gbmV3IHBsdWdpbi5WdWZvcmlhUmVuZGVyZXIoKTtcbiAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5zZXRSZW5kZXJlcih2dWZvcmlhUmVuZGVyZXIpO1xuICAgICAgICB2dWZvcmlhUmVuZGVyZXIubUlzQWN0aXZlID0gdHJ1ZVxuICAgIH0pXG5cbiAgICB2aWRlb1ZpZXdQbGFjZWhvbGRlci5vbkxvYWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHZ1Zm9yaWEuVnVmb3JpYS5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgfVxuXG4gICAgdmlkZW9WaWV3UGxhY2Vob2xkZXIub25MYXlvdXQgPSBmdW5jdGlvbihsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20pIHtcbiAgICAgICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgIH1cblxuICAgIHZpZGVvVmlldy5hZGRDaGlsZCh2aWRlb1ZpZXdQbGFjZWhvbGRlcik7XG59XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnN1c3BlbmRFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQYXVzaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUGF1c2UoKTtcbiAgICAgICAgaWYgKGluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUGF1c2luZyBjYW1lcmEgYW5kIHJlbmRlcmVyJyk7XG4gICAgICAgICAgICBhcGkgJiYgYXBpLmdldENhbWVyYURldmljZSgpLnN0b3AoKTtcbiAgICAgICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcgJiYgYW5kcm9pZFZpZGVvVmlldy5vblBhdXNlKCk7XG4gICAgICAgICAgICB2dWZvcmlhUmVuZGVyZXIgJiYgKHZ1Zm9yaWFSZW5kZXJlci5tSXNBY3RpdmUgPSBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCkgPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKTsgLy8gZGVsYXkgdW50aWwgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBhY3R1YWxseSBjaGFuZ2VzXG4gICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDUwMCk7XG4gICAgfVxufSk7XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnJlc3VtZUV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Jlc3VtaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUmVzdW1lKCk7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgICAgIGlmIChpbml0aWFsaXplZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Jlc3VtaW5nIGNhbWVyYSBhbmQgcmVuZGVyZXInKTtcbiAgICAgICAgICAgIGFwaSAmJiBhcGkuZ2V0Q2FtZXJhRGV2aWNlKCkuc3RhcnQoKTtcbiAgICAgICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcgJiYgYW5kcm9pZFZpZGVvVmlldy5vblJlc3VtZSgpO1xuICAgICAgICAgICAgdnVmb3JpYVJlbmRlcmVyICYmICh2dWZvcmlhUmVuZGVyZXIubUlzQWN0aXZlID0gdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuXG5leHBvcnQgZnVuY3Rpb24gY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKSB7XG4gICAgaWYgKCFhcGkpIHRocm93IG5ldyBFcnJvcigpO1xuICAgIGlmIChhbmRyb2lkVmlkZW9WaWV3ID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBhcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5nZXRXaWR0aCgpLFxuICAgICAgICBhbmRyb2lkVmlkZW9WaWV3LmdldEhlaWdodCgpXG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhcImNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlOiBcIiArIGFuZHJvaWRWaWRlb1ZpZXcuZ2V0V2lkdGgoKSArIFwiLCBcIiArIGFuZHJvaWRWaWRlb1ZpZXcuZ2V0SGVpZ2h0KCkpO1xufVxuXG5leHBvcnQgY2xhc3MgQVBJIGV4dGVuZHMgY29tbW9uLkFQSUJhc2Uge1xuICAgIFxuICAgIHByaXZhdGUgY2FtZXJhRGV2aWNlID0gbmV3IENhbWVyYURldmljZSgpO1xuICAgIHByaXZhdGUgZGV2aWNlID0gbmV3IERldmljZSgpO1xuICAgIHByaXZhdGUgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIoKTtcbiAgICBcbiAgICBzZXRMaWNlbnNlS2V5KGxpY2Vuc2VLZXk6c3RyaW5nKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkgIT0gbnVsbCAmJiBsaWNlbnNlS2V5ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHBsdWdpbi5WdWZvcmlhU2Vzc2lvbi5zZXRMaWNlbnNlS2V5KGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LCBsaWNlbnNlS2V5KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgc2V0SGludChoaW50OmRlZi5IaW50LHZhbHVlOm51bWJlcikgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuVnVmb3JpYS5zZXRIaW50KDxudW1iZXI+aGludCwgdmFsdWUpO1xuICAgIH1cblxuICAgIGluaXQoKSA6IFByb21pc2U8ZGVmLkluaXRSZXN1bHQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBwbHVnaW4uVnVmb3JpYVNlc3Npb24uaW5pdChuZXcgcGx1Z2luLlZ1Zm9yaWFDb250cm9sKHtcbiAgICAgICAgICAgICAgICBvbkluaXRBUkRvbmUocmVzdWx0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSB2dWZvcmlhLkluaXRSZXN1bHQuU1VDQ0VTUykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaS5nZXREZXZpY2UoKS5zZXRNb2RlKGRlZi5EZXZpY2VNb2RlLkFSKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFuZHJvaWRWaWRlb1ZpZXcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRWaWRlb1ZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWFSZW5kZXJlciAmJiAodnVmb3JpYVJlbmRlcmVyLm1Jc0FjdGl2ZSA9IHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgNTAwMCk7IC8vIHRoaXMgc2hvdWxkbid0IGJlIHJlcXVpcmVkLCBidXQgc29tZXRpbWVzIHRoZSB2aWRlbyBmZWVkIGRvZXNuJ3QgYXBwZWFyIGFmdGVyIHJlaW5pdFxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEucmVnaXN0ZXJDYWxsYmFjayhuZXcgdnVmb3JpYS5WdWZvcmlhLlVwZGF0ZUNhbGxiYWNrSW50ZXJmYWNlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBWdWZvcmlhX29uVXBkYXRlKHN0YXRlOiB2dWZvcmlhLlN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcGkgJiYgYXBpLmNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpLmNhbGxiYWNrKG5ldyBTdGF0ZShzdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSg8ZGVmLkluaXRSZXN1bHQ+PG51bWJlcj5yZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpIDogdm9pZCB7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5kZWluaXQoKTtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUGF1c2UoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGV2aWNlKCkgOiBDYW1lcmFEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5jYW1lcmFEZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldERldmljZSgpIDogRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJlcigpIDogUmVuZGVyZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJlcjtcbiAgICB9XG5cbiAgICBpbml0U21hcnRUZXJyYWluKCk6IGJvb2xlYW4ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcbiAgICB9XG5cbiAgICBnZXRTbWFydFRlcnJhaW4oKTogZGVmLlNtYXJ0VGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICAgIH1cblxuICAgIGRlaW5pdFNtYXJ0VGVycmFpbigpOiBib29sZWFuIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC5cIik7XG4gICAgfVxuXG4gICAgaW5pdFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyKCk6IGJvb2xlYW4ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcbiAgICB9XG5cbiAgICBnZXRQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcigpOiBkZWYuUG9zaXRpb25hbERldmljZVRyYWNrZXIgfCB1bmRlZmluZWQge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcbiAgICB9XG5cbiAgICBkZWluaXRQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcigpOiBib29sZWFuIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC5cIik7XG4gICAgfVxuICAgIFxuICAgIGluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgdmFyIHRyYWNrZXIgPSA8dnVmb3JpYS5PYmplY3RUcmFja2VyPiB2dWZvcmlhLlRyYWNrZXJNYW5hZ2VyLmdldEluc3RhbmNlKCkuaW5pdFRyYWNrZXIodnVmb3JpYS5PYmplY3RUcmFja2VyLmdldENsYXNzVHlwZSgpKTtcbiAgICAgICAgaWYgKHRyYWNrZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gbmV3IE9iamVjdFRyYWNrZXIodHJhY2tlcik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdE9iamVjdFRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAodnVmb3JpYS5UcmFja2VyTWFuYWdlci5nZXRJbnN0YW5jZSgpLmRlaW5pdFRyYWNrZXIodnVmb3JpYS5PYmplY3RUcmFja2VyLmdldENsYXNzVHlwZSgpKSkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHNldFNjYWxlRmFjdG9yKGY6bnVtYmVyKSB7XG4gICAgICAgIHBsdWdpbi5WdWZvcmlhU2Vzc2lvbi5zZXRTY2FsZUZhY3RvciAmJiBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IoZik7XG4gICAgfVxuXG4gICAgZ2V0U2NhbGVGYWN0b3IoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2NhbGVGYWN0b3IoKTtcbiAgICB9XG5cbiAgICBvblN1cmZhY2VDaGFuZ2VkKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikgOiB2b2lkIHtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uU3VyZmFjZUNoYW5nZWQod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIC8qXG4gICAgICAgIGNvbnN0IG9yaWVudGF0aW9uOlVJSW50ZXJmYWNlT3JpZW50YXRpb24gPSB1dGlscy5pb3MuZ2V0dGVyKFVJQXBwbGljYXRpb24sIFVJQXBwbGljYXRpb24uc2hhcmVkQXBwbGljYXRpb24pLnN0YXR1c0Jhck9yaWVudGF0aW9uO1xuICAgICAgICBzd2l0Y2ggKG9yaWVudGF0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfOTApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0VXBzaWRlRG93bjogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18yNzApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLkxhbmRzY2FwZUxlZnQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMTgwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVSaWdodDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18wKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfOTApO1xuICAgICAgICB9XG4gICAgICAgICovXG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVWZWMyKHZlYzp2dWZvcmlhLlZlYzJGKSA6IGRlZi5WZWMyIHtcbiAgICB2YXIgZGF0YSA9IHZlYy5nZXREYXRhKCk7XG4gICAgcmV0dXJuIHsgeDogZGF0YVswXSwgeTogZGF0YVsxXSB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVWZWMzKHZlYzp2dWZvcmlhLlZlYzNGKSA6IGRlZi5WZWMzIHtcbiAgICB2YXIgZGF0YSA9IHZlYy5nZXREYXRhKCk7XG4gICAgcmV0dXJuIHsgeDogZGF0YVswXSwgeTogZGF0YVsxXSwgejogZGF0YVsyXSB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVWZWM0KHZlYzp2dWZvcmlhLlZlYzRGKSA6IGRlZi5WZWM0IHtcbiAgICB2YXIgZGF0YSA9IHZlYy5nZXREYXRhKCk7XG4gICAgcmV0dXJuIHsgeDogZGF0YVswXSwgeTogZGF0YVsxXSwgejogZGF0YVsyXSwgdzogZGF0YVszXSB9O1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0MkdMTWF0cml4KG1hdDp2dWZvcmlhLk1hdHJpeDM0RikgOiBkZWYuTWF0cml4NDQge1xuICAgIHZhciBkYXRhID0gbWF0LmdldERhdGEoKTtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgICAgICAgICBkYXRhWzBdLFxuICAgICAgICAgICAgICAgIGRhdGFbNF0sXG4gICAgICAgICAgICAgICAgZGF0YVs4XSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbMV0sXG4gICAgICAgICAgICAgICAgZGF0YVs1XSxcbiAgICAgICAgICAgICAgICBkYXRhWzldLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVsyXSxcbiAgICAgICAgICAgICAgICBkYXRhWzZdLFxuICAgICAgICAgICAgICAgIGRhdGFbMTBdLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVszXSxcbiAgICAgICAgICAgICAgICBkYXRhWzddLFxuICAgICAgICAgICAgICAgIGRhdGFbMTFdLFxuICAgICAgICAgICAgICAgIDFcbiAgICAgICAgICAgIF07XG59XG5cbi8vIGh0dHBzOi8vbGlicmFyeS52dWZvcmlhLmNvbS9hcnRpY2xlcy9Tb2x1dGlvbi9Ib3ctVG8tQWNjZXNzLUNhbWVyYS1QYXJhbWV0ZXJzXG5mdW5jdGlvbiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KG1hdDp2dWZvcmlhLk1hdHJpeDM0RiwgbmVhcjpudW1iZXIsIGZhcjpudW1iZXIpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICB2YXIgZGF0YSA9IG1hdC5nZXREYXRhKCk7XG4gICAgcmV0dXJuICBbXG4gICAgICAgICAgICAgICAgZGF0YVswXSxcbiAgICAgICAgICAgICAgICBkYXRhWzRdLFxuICAgICAgICAgICAgICAgIGRhdGFbOF0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzFdLFxuICAgICAgICAgICAgICAgIGRhdGFbNV0sXG4gICAgICAgICAgICAgICAgZGF0YVs5XSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbMl0sXG4gICAgICAgICAgICAgICAgZGF0YVs2XSxcbiAgICAgICAgICAgICAgICAoZmFyICsgbmVhcikgLyAoZmFyIC0gbmVhciksXG4gICAgICAgICAgICAgICAgMSxcbiAgICAgICAgICAgICAgICBkYXRhWzNdLFxuICAgICAgICAgICAgICAgIGRhdGFbN10sXG4gICAgICAgICAgICAgICAgLW5lYXIgKiAoMSArIChmYXIgKyBuZWFyKSAvIChmYXIgLSBuZWFyKSksXG4gICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgXTtcbn1cblxuZXhwb3J0IGNsYXNzIFRyYWNrYWJsZSB7XG4gICAgXG4gICAgc3RhdGljIGNyZWF0ZVRyYWNrYWJsZShhbmRyb2lkOnZ1Zm9yaWEuVHJhY2thYmxlKSB7XG4gICAgICAgIC8qXG4gICAgICAgIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5NYXJrZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFya2VyKGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkKGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZVxuICAgICAgICAqL1xuICAgICAgICBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuSW1hZ2VUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2VUYXJnZXQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5DeWxpbmRlclRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDeWxpbmRlclRhcmdldChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLk9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXQoYW5kcm9pZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuVHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZShhbmRyb2lkKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5UcmFja2FibGUpIHt9XG4gICAgXG4gICAgZ2V0SWQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRJZCgpO1xuICAgIH1cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TmFtZSgpO1xuICAgIH1cbiAgICBpc0V4dGVuZGVkVHJhY2tpbmdTdGFydGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTtcbiAgICB9XG4gICAgc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLnN0YXJ0RXh0ZW5kZWRUcmFja2luZygpO1xuICAgIH1cbiAgICBzdG9wRXh0ZW5kZWRUcmFja2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5zdG9wRXh0ZW5kZWRUcmFja2luZygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRyYWNrYWJsZVJlc3VsdCB7XG4gICAgXG4gICAgc3RhdGljIGNyZWF0ZVRyYWNrYWJsZVJlc3VsdChhbmRyb2lkOnZ1Zm9yaWEuVHJhY2thYmxlUmVzdWx0KSB7XG4gICAgICAgIC8qXG4gICAgICAgIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5NYXJrZXJSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFya2VyUmVzdWx0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuV29yZFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkUmVzdWx0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZVxuICAgICAgICAqL1xuICAgICAgICBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuSW1hZ2VUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2VUYXJnZXRSZXN1bHQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5DeWxpbmRlclRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDeWxpbmRlclRhcmdldFJlc3VsdChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLk9iamVjdFRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXRSZXN1bHQoYW5kcm9pZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuVHJhY2thYmxlUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZVJlc3VsdChhbmRyb2lkKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5UcmFja2FibGVSZXN1bHQpIHt9XG4gICAgXG4gICAgZ2V0UG9zZSgpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICB2YXIgbWF0MzQgPSB0aGlzLmFuZHJvaWQuZ2V0UG9zZSgpO1xuICAgICAgICByZXR1cm4gY29udmVydDJHTE1hdHJpeChtYXQzNCk7XG4gICAgfVxuICAgIFxuICAgIGdldFRpbWVTdGFtcCgpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRUaW1lU3RhbXAoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U3RhdHVzKCk6IGRlZi5UcmFja2FibGVSZXN1bHRTdGF0dXMge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0U3RhdHVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFRyYWNrYWJsZSgpOiBUcmFja2FibGUge1xuICAgICAgICByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0aGlzLmFuZHJvaWQuZ2V0VHJhY2thYmxlKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hcmtlciBleHRlbmRzIFRyYWNrYWJsZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5NYXJrZXIpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE1hcmtlclJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5NYXJrZXJSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIFdvcmQgZXh0ZW5kcyBUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuV29yZCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgV29yZFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuV29yZFJlc3VsdCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VGFyZ2V0IGV4dGVuZHMgVHJhY2thYmxlIHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5PYmplY3RUYXJnZXQpIHtzdXBlcihhbmRyb2lkKX1cbiAgICBcbiAgICBnZXRVbmlxdWVUYXJnZXRJZCgpIDogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRVbmlxdWVUYXJnZXRJZCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTaXplKCk6IGRlZi5WZWMzIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzModGhpcy5hbmRyb2lkLmdldFNpemUoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VGFyZ2V0UmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5PYmplY3RUYXJnZXRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuY2xhc3MgSW1hZ2VUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkltYWdlVGFyZ2V0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5JbWFnZVRhcmdldFJlc3VsdCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTXVsdGlUYXJnZXQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5PYmplY3RUYXJnZXRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuY2xhc3MgQ3lsaW5kZXJUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkN5bGluZGVyVGFyZ2V0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5DeWxpbmRlclRhcmdldFJlc3VsdCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hZ2Uge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuSW1hZ2UpIHt9XG4gICAgXG4gICAgZ2V0QnVmZmVySGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0QnVmZmVySGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEJ1ZmZlcldpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEJ1ZmZlcldpZHRoKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZvcm1hdCgpOiBkZWYuUGl4ZWxGb3JtYXQgeyBcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldEZvcm1hdCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRIZWlnaHQoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0SGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBpeGVscygpOiBpbnRlcm9wLlBvaW50ZXJ8dW5kZWZpbmVkIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0UGl4ZWxzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFN0cmlkZSgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRTdHJpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0V2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0V2lkdGgoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGcmFtZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5GcmFtZSkge31cbiAgICBnZXRJbWFnZShpZHg6IG51bWJlcik6IEltYWdlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGltZyA9IHRoaXMuYW5kcm9pZC5nZXRJbWFnZShpZHgpO1xuICAgICAgICBpZiAoaW1nKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlKGltZyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0SW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRJbmRleCgpO1xuICAgIH1cbiAgICBnZXROdW1JbWFnZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1JbWFnZXMoKTtcbiAgICB9XG4gICAgZ2V0VGltZVN0YW1wKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VGltZVN0YW1wKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RhdGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuU3RhdGUpIHt9XG4gICAgZ2V0RnJhbWUoKTogRnJhbWUge1xuICAgICAgICBjb25zdCBmcmFtZSA9IHRoaXMuYW5kcm9pZC5nZXRGcmFtZSgpO1xuICAgICAgICByZXR1cm4gbmV3IEZyYW1lKGZyYW1lKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogZGVmLlRyYWNrYWJsZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0cmFja2FibGUgPSB0aGlzLmFuZHJvaWQuZ2V0VHJhY2thYmxlKGlkeCk7XG4gICAgICAgIGlmICh0cmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlUmVzdWx0KGlkeDogbnVtYmVyKTogZGVmLlRyYWNrYWJsZVJlc3VsdHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmFuZHJvaWQuZ2V0VHJhY2thYmxlUmVzdWx0KGlkeCk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBUcmFja2FibGVSZXN1bHQuY3JlYXRlVHJhY2thYmxlUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDYW1lcmFDYWxpYnJhdGlvbiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5DYW1lcmFDYWxpYnJhdGlvbikge31cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uUGFyYW1ldGVycygpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uUGFyYW1ldGVycygpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RmllbGRPZlZpZXdSYWRzKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzIodGhpcy5hbmRyb2lkLmdldEZpZWxkT2ZWaWV3UmFkcygpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9jYWxMZW5ndGgoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0Rm9jYWxMZW5ndGgoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFByaW5jaXBhbFBvaW50KCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzIodGhpcy5hbmRyb2lkLmdldFByaW5jaXBhbFBvaW50KCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTaXplKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzIodGhpcy5hbmRyb2lkLmdldFNpemUoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhRGV2aWNlIHtcbiAgICBpbml0KGNhbWVyYTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5pbml0KDxudW1iZXI+Y2FtZXJhKTtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5kZWluaXQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKTogQ2FtZXJhQ2FsaWJyYXRpb24ge1xuICAgICAgICBjb25zdCBjYWxpYnJhdGlvbiA9IHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKTtcbiAgICAgICAgcmV0dXJuIG5ldyBDYW1lcmFDYWxpYnJhdGlvbihjYWxpYnJhdGlvbik7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURpcmVjdGlvbigpOiBkZWYuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRDYW1lcmFEaXJlY3Rpb24oKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0TnVtVmlkZW9Nb2RlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXROdW1WaWRlb01vZGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvTW9kZShuSW5kZXg6IG51bWJlcik6IGRlZi5WaWRlb01vZGUge1xuICAgICAgICB2YXIgdmlkZW9Nb2RlID0gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRWaWRlb01vZGUobkluZGV4KTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIHdpZHRoOiB2aWRlb01vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIGhlaWdodDogdmlkZW9Nb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgZnJhbWVyYXRlOiB2aWRlb01vZGUuZ2V0RnJhbWVyYXRlKClcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgXG4gICAgc2VsZWN0VmlkZW9Nb2RlKGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0VmlkZW9Nb2RlKGluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rmxhc2hUb3JjaE1vZGUob246IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Rmxhc2hUb3JjaE1vZGUob24pO1xuICAgIH1cbiAgICBcbiAgICBzZXRGb2N1c01vZGUoZm9jdXNNb2RlOiBkZWYuQ2FtZXJhRGV2aWNlRm9jdXNNb2RlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZvY3VzTW9kZSg8bnVtYmVyPmZvY3VzTW9kZSk7XG4gICAgfVxuICAgIFxuICAgIHN0YXJ0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zdGFydCgpO1xuICAgIH1cbiAgICBcbiAgICBzdG9wKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zdG9wKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld0xpc3Qge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVmlld0xpc3QpIHt9XG4gICAgY29udGFpbnModmlldzogZGVmLlZpZXcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5jb250YWlucyg8bnVtYmVyPnZpZXcpO1xuICAgIH1cbiAgICBnZXROdW1WaWV3cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVZpZXdzKCk7XG4gICAgfVxuICAgIGdldFZpZXcoaWR4OiBudW1iZXIpOiBkZWYuVmlldyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRWaWV3KGlkeCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld2VyUGFyYW1ldGVycyB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5WaWV3ZXJQYXJhbWV0ZXJzKSB7fVxuICAgIGNvbnRhaW5zTWFnbmV0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmNvbnRhaW5zTWFnbmV0KCk7XG4gICAgfVxuICAgIGdldEJ1dHRvblR5cGUoKTogZGVmLlZpZXdlclBhcmFtdGVyc0J1dHRvblR5cGUge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0QnV0dG9uVHlwZSgpO1xuICAgIH1cbiAgICBnZXREaXN0b3J0aW9uQ29lZmZpY2llbnQoaWR4OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHgpO1xuICAgIH1cbiAgICBnZXRGaWVsZE9mVmlldygpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXRGaWVsZE9mVmlldygpKTtcbiAgICB9XG4gICAgZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRJbnRlckxlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRMZW5zQ2VudHJlVG9UcmF5RGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRMZW5zQ2VudHJlVG9UcmF5RGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TWFudWZhY3R1cmVyKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TWFudWZhY3R1cmVyKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROYW1lKCk7XG4gICAgfVxuICAgIGdldE51bURpc3RvcnRpb25Db2VmZmljaWVudHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk7XG4gICAgfVxuICAgIGdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0U2NyZWVuVG9MZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0VHJheUFsaWdubWVudCgpOiBkZWYuVmlld2VyUGFyYW10ZXJzVHJheUFsaWdubWVudCB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRUcmF5QWxpZ25tZW50KCk7XG4gICAgfVxuICAgIGdldFZlcnNpb24oKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRWZXJzaW9uKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVmlld2VyUGFyYW1ldGVyc0xpc3QpIHt9XG4gICAgZ2V0KGlkeDogbnVtYmVyKTogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB2cCA9IHRoaXMuYW5kcm9pZC5nZXQoaWR4KTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXROYW1lTWFudWZhY3R1cmVyKG5hbWU6IHN0cmluZywgbWFudWZhY3R1cmVyOiBzdHJpbmcpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5hbmRyb2lkLmdldChuYW1lLCBtYW51ZmFjdHVyZXIpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHNldFNES0ZpbHRlcihmaWx0ZXI6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLmFuZHJvaWQuc2V0U0RLRmlsdGVyKGZpbHRlcik7XG4gICAgfVxuICAgIHNpemUoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5zaXplKCk7XG4gICAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBEZXZpY2Uge1xuICAgIHNldE1vZGUobW9kZTpkZWYuRGV2aWNlTW9kZSkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0TW9kZSg8bnVtYmVyPm1vZGUpO1xuICAgIH1cbiAgICBnZXRNb2RlKCkgOiBkZWYuRGV2aWNlTW9kZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TW9kZSgpO1xuICAgIH1cbiAgICBzZXRWaWV3ZXJBY3RpdmUoYWN0aXZlOmJvb2xlYW4pIDogdm9pZCB7XG4gICAgICAgIHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Vmlld2VyQWN0aXZlKGFjdGl2ZSk7XG4gICAgfVxuICAgIGlzVmlld2VyQWN0aXZlKCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG4gICAgZ2V0Vmlld2VyTGlzdCgpIDogVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgICAgICBjb25zdCB2aWV3ZXJMaXN0ID0gdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRWaWV3ZXJMaXN0KCk7XG4gICAgICAgIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVyc0xpc3Qodmlld2VyTGlzdCk7XG4gICAgfVxuICAgIHNlbGVjdFZpZXdlcih2aWV3ZXI6Vmlld2VyUGFyYW1ldGVycykge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWV3ZXIodmlld2VyLmFuZHJvaWQpO1xuICAgIH1cbiAgICBnZXRTZWxlY3RlZFZpZXdlcigpIDogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBpZiAoIXRoaXMuaXNWaWV3ZXJBY3RpdmUoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0U2VsZWN0ZWRWaWV3ZXIoKSk7XG4gICAgfVxuICAgIGdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKTogUmVuZGVyaW5nUHJpbWl0aXZlcyB7XG4gICAgICAgIHJldHVybiBuZXcgUmVuZGVyaW5nUHJpbWl0aXZlcyh2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xuICAgIGdldFJlY29tbWVuZGVkRnBzKGZsYWdzOiBkZWYuRlBTSGludCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLlJlbmRlcmVyLmdldEluc3RhbmNlKCkuZ2V0UmVjb21tZW5kZWRGcHMoPG51bWJlcj5mbGFncyk7XG4gICAgfVxuICAgIGdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpOiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnIHtcbiAgICAgICAgdmFyIHZiYzogdnVmb3JpYS5WaWRlb0JhY2tncm91bmRDb25maWcgPSB2dWZvcmlhLlJlbmRlcmVyLmdldEluc3RhbmNlKCkuZ2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCk7XG4gICAgICAgIHZhciByZXN1bHQ6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcgPSB7XG4gICAgICAgICAgICBlbmFibGVkOnZiYy5nZXRFbmFibGVkKCksXG4gICAgICAgICAgICBwb3NpdGlvblg6dmJjLmdldFBvc2l0aW9uKCkuZ2V0RGF0YSgpWzBdLFxuICAgICAgICAgICAgcG9zaXRpb25ZOnZiYy5nZXRQb3NpdGlvbigpLmdldERhdGEoKVsxXSxcbiAgICAgICAgICAgIHNpemVYOnZiYy5nZXRTaXplKCkuZ2V0RGF0YSgpWzBdLFxuICAgICAgICAgICAgc2l6ZVk6dmJjLmdldFNpemUoKS5nZXREYXRhKClbMV0sXG4gICAgICAgICAgICByZWZsZWN0aW9uOnZiYy5nZXRSZWZsZWN0aW9uKClcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgc2V0VGFyZ2V0RnBzKGZwczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLlJlbmRlcmVyLmdldEluc3RhbmNlKCkuc2V0VGFyZ2V0RnBzKGZwcyk7XG4gICAgfVxuICAgIHNldFZpZGVvQmFja2dyb3VuZENvbmZpZyhjZmc6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcpOiB2b2lkIHtcbiAgICAgICAgdmFyIHZiYzogdnVmb3JpYS5WaWRlb0JhY2tncm91bmRDb25maWcgPSBuZXcgdnVmb3JpYS5WaWRlb0JhY2tncm91bmRDb25maWcoKTtcbiAgICAgICAgdmJjLnNldEVuYWJsZWQoY2ZnLmVuYWJsZWQpO1xuICAgICAgICB2YmMuc2V0UG9zaXRpb24obmV3IHZ1Zm9yaWEuVmVjMkkoY2ZnLnBvc2l0aW9uWCwgY2ZnLnBvc2l0aW9uWSkpO1xuICAgICAgICB2YmMuc2V0U2l6ZShuZXcgdnVmb3JpYS5WZWMySShjZmcuc2l6ZVgsIGNmZy5zaXplWSkpO1xuICAgICAgICB2dWZvcmlhLlJlbmRlcmVyLmdldEluc3RhbmNlKCkuc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKHZiYyk7XG4gICAgfVxufVxuXG4vLyBpbnRlcm9wLlJlZmVyZW5jZSBkb2VzIG5vdCBleGlzdCBvbiBBbmRyb2lkXG4vLyBNZXNoIHdpbGwgaGF2ZSB0byBiZSByZXRob3VnaHQgZm9yIGNyb3NzLXBsYXRmb3JtIHVzZVxuZXhwb3J0IGNsYXNzIE1lc2gge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTWVzaCkge31cbiAgICBcbiAgICBnZXROb3JtYWxDb29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROb3JtYWxDb29yZGluYXRlcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXROb3JtYWxzKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMzPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0Tm9ybWFscygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXROdW1UcmlhbmdsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVRyaWFuZ2xlcygpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgXG4gICAgZ2V0TnVtVmVydGljZXMoKTogbnVtYmVyIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVZlcnRpY2VzKCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBcbiAgICBnZXRQb3NpdGlvbkNvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25zKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMzPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0UG9zaXRpb25zKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGdldFRyaWFuZ2xlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRUcmlhbmdsZXMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgZ2V0VVZDb29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRVVkNvb3JkaW5hdGVzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGdldFVWcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFVWcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBoYXNOb3JtYWxzKCk6IGJvb2xlYW4ge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuaGFzTm9ybWFscygpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGhhc1Bvc2l0aW9ucygpOiBib29sZWFuIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmhhc1Bvc2l0aW9ucygpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGhhc1VWcygpOiBib29sZWFuIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmhhc1VWcygpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVuZGVyaW5nUHJpbWl0aXZlcyB7XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5SZW5kZXJpbmdQcmltaXRpdmVzKXt9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKHZpZXdJRDogZGVmLlZpZXcpOiBNZXNoIHtcbiAgICAgICAgY29uc3QgbWVzaCA9IHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uVGV4dHVyZU1lc2goPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gbmV3IE1lc2gobWVzaCk7XG4gICAgfVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlU2l6ZSh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlVmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25UZXh0dXJlVmlld3BvcnQoPG51bWJlcj52aWV3SUQpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgodmlld0lEOiBkZWYuVmlldyk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHZhciBtYXQzNCA9IHRoaXMuYW5kcm9pZC5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KG1hdDM0KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXROb3JtYWxpemVkVmlld3BvcnQoPG51bWJlcj52aWV3SUQpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjc1R5cGU6IGRlZi5Db29yZGluYXRlU3lzdGVtVHlwZSk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHZhciBtYXQzNCA9IHRoaXMuYW5kcm9pZC5nZXRQcm9qZWN0aW9uTWF0cml4KDxudW1iZXI+dmlld0lELCA8bnVtYmVyPmNzVHlwZSk7XG4gICAgICAgIHJldHVybiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KG1hdDM0LCAwLjAxLCAxMDAwMDApO1xuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJpbmdWaWV3cygpOiBWaWV3TGlzdCB7XG4gICAgICAgIHJldHVybiBuZXcgVmlld0xpc3QodGhpcy5hbmRyb2lkLmdldFJlbmRlcmluZ1ZpZXdzKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb0JhY2tncm91bmRNZXNoKHZpZXdJRDogZGVmLlZpZXcpOiBNZXNoIHtcbiAgICAgICAgY29uc3QgbWVzaCA9IHRoaXMuYW5kcm9pZC5nZXRWaWRlb0JhY2tncm91bmRNZXNoKDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNZXNoKG1lc2gpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb0JhY2tncm91bmRQcm9qZWN0aW9uTWF0cml4KHZpZXdJRDogZGVmLlZpZXcsIGNzVHlwZTogZGVmLkNvb3JkaW5hdGVTeXN0ZW1UeXBlKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgdmFyIG1hdDM0ID0gdGhpcy5hbmRyb2lkLmdldFZpZGVvQmFja2dyb3VuZFByb2plY3Rpb25NYXRyaXgoPG51bWJlcj52aWV3SUQsIDxudW1iZXI+Y3NUeXBlKTtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgobWF0MzQsIDAuMDEsIDEwMDAwMCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbn1cblxuZXhwb3J0IGNsYXNzIFRyYWNrZXIge31cblxuY2xhc3MgRGF0YVNldCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5EYXRhU2V0KXt9XG4gICAgY3JlYXRlTXVsdGlUYXJnZXQobmFtZTogc3RyaW5nKTogTXVsdGlUYXJnZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgbXQgPSB0aGlzLmFuZHJvaWQuY3JlYXRlTXVsdGlUYXJnZXQobmFtZSk7XG4gICAgICAgIGlmIChtdCkgcmV0dXJuIG5ldyBNdWx0aVRhcmdldChtdCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGRlc3Ryb3kodHJhY2thYmxlOiBUcmFja2FibGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5kZXN0cm95KHRyYWNrYWJsZS5hbmRyb2lkKTtcbiAgICB9XG4gICAgZXhpc3RzKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmV4aXN0cyhwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaGFzUmVhY2hlZFRyYWNrYWJsZUxpbWl0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmhhc1JlYWNoZWRUcmFja2FibGVMaW1pdCgpO1xuICAgIH1cbiAgICBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5pc0FjdGl2ZSgpO1xuICAgIH1cbiAgICBsb2FkKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmxvYWQocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VHJhY2tlciBleHRlbmRzIFRyYWNrZXIge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VHJhY2tlcil7IHN1cGVyKCk7IH1cbiAgICBzdGFydCgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc3RhcnQoKTtcbiAgICB9XG4gICAgc3RvcCgpIDogdm9pZCB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5zdG9wKCk7XG4gICAgfVxuICAgIGNyZWF0ZURhdGFTZXQoKSA6IERhdGFTZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgZHMgPSB0aGlzLmFuZHJvaWQuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICBpZiAoZHMpIHJldHVybiBuZXcgRGF0YVNldChkcyk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXHRkZXN0cm95RGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHRoaXMuYW5kcm9pZC5kZXN0cm95RGF0YVNldChkYXRhU2V0LmFuZHJvaWQpO1xuXHR9XG4gICAgYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5hY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5hbmRyb2lkKTtcbiAgICB9XG4gICAgZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuYW5kcm9pZCk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgYXBpID0gVlVGT1JJQV9BVkFJTEFCTEUgPyBuZXcgQVBJKCkgOiB1bmRlZmluZWQ7XG4iXX0=