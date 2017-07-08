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
var VUFORIA_AVAILABLE = typeof plugin.VuforiaSession !== 'undefined';
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
var API = (function (_super) {
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
    API.prototype.initObjectTracker = function () {
        var tracker = vuforia.TrackerManager.getInstance().initTracker(vuforia.ObjectTracker.getClassType());
        if (tracker != null) {
            this.objectTracker = new ObjectTracker(tracker);
            return true;
        }
        return false;
    };
    API.prototype.getObjectTracker = function () {
        return this.objectTracker;
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
var Trackable = (function () {
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
var TrackableResult = (function () {
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
var Marker = (function (_super) {
    __extends(Marker, _super);
    function Marker(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return Marker;
}(Trackable));
exports.Marker = Marker;
var MarkerResult = (function (_super) {
    __extends(MarkerResult, _super);
    function MarkerResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return MarkerResult;
}(TrackableResult));
exports.MarkerResult = MarkerResult;
var Word = (function (_super) {
    __extends(Word, _super);
    function Word(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return Word;
}(Trackable));
exports.Word = Word;
var WordResult = (function (_super) {
    __extends(WordResult, _super);
    function WordResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return WordResult;
}(TrackableResult));
exports.WordResult = WordResult;
var ObjectTarget = (function (_super) {
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
var ObjectTargetResult = (function (_super) {
    __extends(ObjectTargetResult, _super);
    function ObjectTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return ObjectTargetResult;
}(TrackableResult));
exports.ObjectTargetResult = ObjectTargetResult;
var ImageTarget = (function (_super) {
    __extends(ImageTarget, _super);
    function ImageTarget(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return ImageTarget;
}(ObjectTarget));
var ImageTargetResult = (function (_super) {
    __extends(ImageTargetResult, _super);
    function ImageTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return ImageTargetResult;
}(ObjectTargetResult));
var MultiTarget = (function (_super) {
    __extends(MultiTarget, _super);
    function MultiTarget(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return MultiTarget;
}(ObjectTarget));
exports.MultiTarget = MultiTarget;
var MultiTargetResult = (function (_super) {
    __extends(MultiTargetResult, _super);
    function MultiTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return MultiTargetResult;
}(ObjectTargetResult));
exports.MultiTargetResult = MultiTargetResult;
var CylinderTarget = (function (_super) {
    __extends(CylinderTarget, _super);
    function CylinderTarget(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return CylinderTarget;
}(ObjectTarget));
var CylinderTargetResult = (function (_super) {
    __extends(CylinderTargetResult, _super);
    function CylinderTargetResult(android) {
        var _this = _super.call(this, android) || this;
        _this.android = android;
        return _this;
    }
    return CylinderTargetResult;
}(ObjectTargetResult));
var Image = (function () {
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
var Frame = (function () {
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
var State = (function () {
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
var CameraCalibration = (function () {
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
var CameraDevice = (function () {
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
var ViewList = (function () {
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
var ViewerParameters = (function () {
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
var ViewerParametersList = (function () {
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
var Device = (function () {
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
var Renderer = (function () {
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
var Mesh = (function () {
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
var RenderingPrimitives = (function () {
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
        return convert2GLMatrix(mat34);
    };
    RenderingPrimitives.prototype.getViewport = function (viewID) {
        return createVec4(this.android.getViewport(viewID));
    };
    return RenderingPrimitives;
}());
exports.RenderingPrimitives = RenderingPrimitives;
var Tracker = (function () {
    function Tracker() {
    }
    return Tracker;
}());
exports.Tracker = Tracker;
var DataSet = (function () {
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
var ObjectTracker = (function (_super) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5hbmRyb2lkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidnVmb3JpYS5hbmRyb2lkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx1Q0FBdUM7O0FBRXZDLHlDQUE0QztBQUM1QywwQ0FBNkM7QUFDN0MseUNBQTRDO0FBQzVDLDRDQUErQztBQUMvQyxzREFBa0Q7QUFDbEQsSUFBTyxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztBQUM3QixJQUFPLE1BQU0sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUVuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVwQyxJQUFNLGlCQUFpQixHQUFHLE9BQU8sTUFBTSxDQUFDLGNBQWMsS0FBSyxXQUFXLENBQUM7QUFFdkUsSUFBSSxnQkFBZ0IsR0FBbUMsU0FBUyxDQUFDO0FBQ2pFLElBQUksZUFBZSxHQUFxQyxTQUFTLENBQUM7QUFDbEUsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBRVgsUUFBQSxTQUFTLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7QUFFMUMsb0dBQW9HO0FBQ3BHO0lBQ0ksSUFBTSxvQkFBb0IsR0FBRyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUUzRCxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxVQUFDLEdBQW1DO1FBQ25HLGdCQUFnQixHQUEwQixDQUFDLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBQ2xJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7UUFFNUIsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMs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Q0FBYyxHQUFkLFVBQWUsT0FBZTtRQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFDRSx1Q0FBZSxHQUFmLFVBQWdCLE9BQWU7UUFDM0IsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBQ0QseUNBQWlCLEdBQWpCLFVBQWtCLE9BQWU7UUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFDTCxvQkFBQztBQUFELENBQUMsQUF0QkQsQ0FBbUMsT0FBTyxHQXNCekM7QUF0Qlksc0NBQWE7QUF3QmIsUUFBQSxHQUFHLEdBQUcsaUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvL2ltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcblxuaW1wb3J0IGNvbW1vbiA9IHJlcXVpcmUoJy4vdnVmb3JpYS1jb21tb24nKTtcbmltcG9ydCBkZWYgPSByZXF1aXJlKCduYXRpdmVzY3JpcHQtdnVmb3JpYScpO1xuaW1wb3J0IGFwcGxpY2F0aW9uID0gcmVxdWlyZSgnYXBwbGljYXRpb24nKTtcbmltcG9ydCBwbGFjZWhvbGRlciA9IHJlcXVpcmUoJ3VpL3BsYWNlaG9sZGVyJyk7XG5pbXBvcnQge0dyaWRMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHZ1Zm9yaWEgPSBjb20udnVmb3JpYTtcbmltcG9ydCBwbHVnaW4gPSBpby5hcmdvbmpzLnZ1Zm9yaWE7XG5cbmdsb2JhbC5tb2R1bGVNZXJnZShjb21tb24sIGV4cG9ydHMpO1xuXG5jb25zdCBWVUZPUklBX0FWQUlMQUJMRSA9IHR5cGVvZiBwbHVnaW4uVnVmb3JpYVNlc3Npb27CoCE9PSAndW5kZWZpbmVkJztcblxudmFyIGFuZHJvaWRWaWRlb1ZpZXc6IHBsdWdpbi5WdWZvcmlhR0xWaWV3fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbnZhciB2dWZvcmlhUmVuZGVyZXI6IHBsdWdpbi5WdWZvcmlhUmVuZGVyZXJ8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xudmFyIGluaXRpYWxpemVkID0gZmFsc2U7XG5cbmV4cG9ydCBjb25zdCB2aWRlb1ZpZXcgPSBuZXcgR3JpZExheW91dCgpO1xuXG4vLyBvbiBBbmRyb2lkLCB3ZSBuZWVkIHRvIHdhaXQgZm9yIFZ1Zm9yaWEgdG8gYmUgaW5pdGlhbGl6ZWQgYmVmb3JlIGNyZWF0aW5nIHRoZSBnbFZpZXcgYW5kIHJlbmRlcmVyXG5mdW5jdGlvbiBpbml0VmlkZW9WaWV3KCkge1xuICAgIGNvbnN0IHZpZGVvVmlld1BsYWNlaG9sZGVyID0gbmV3IHBsYWNlaG9sZGVyLlBsYWNlaG9sZGVyKCk7XG5cbiAgICB2aWRlb1ZpZXdQbGFjZWhvbGRlci5vbihwbGFjZWhvbGRlci5QbGFjZWhvbGRlci5jcmVhdGluZ1ZpZXdFdmVudCwgKGV2dDpwbGFjZWhvbGRlci5DcmVhdGVWaWV3RXZlbnREYXRhKT0+e1xuICAgICAgICBhbmRyb2lkVmlkZW9WaWV3ID0gPHBsdWdpbi5WdWZvcmlhR0xWaWV3PiAoVlVGT1JJQV9BVkFJTEFCTEUgPyBuZXcgcGx1Z2luLlZ1Zm9yaWFHTFZpZXcoYXBwbGljYXRpb24uYW5kcm9pZC5jb250ZXh0KSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGV2dC52aWV3ID0gYW5kcm9pZFZpZGVvVmlldztcblxuICAgICAgICBhbmRyb2lkVmlkZW9WaWV3LmluaXQodnVmb3JpYS5WdWZvcmlhLnJlcXVpcmVzQWxwaGEoKSwgMTYsIDApO1xuXG4gICAgICAgIHZ1Zm9yaWFSZW5kZXJlciA9IG5ldyBwbHVnaW4uVnVmb3JpYVJlbmRlcmVyKCk7XG4gICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcuc2V0UmVuZGVyZXIodnVmb3JpYVJlbmRlcmVyKTtcbiAgICAgICAgdnVmb3JpYVJlbmRlcmVyLm1Jc0FjdGl2ZSA9IHRydWVcbiAgICB9KVxuXG4gICAgdmlkZW9WaWV3UGxhY2Vob2xkZXIub25Mb2FkZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgIH1cblxuICAgIHZpZGVvVmlld1BsYWNlaG9sZGVyLm9uTGF5b3V0ID0gZnVuY3Rpb24obGVmdCwgdG9wLCByaWdodCwgYm90dG9tKSB7XG4gICAgICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICB9XG5cbiAgICB2aWRlb1ZpZXcuYWRkQ2hpbGQodmlkZW9WaWV3UGxhY2Vob2xkZXIpO1xufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5zdXNwZW5kRXZlbnQsICgpPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUGF1c2luZyBWdWZvcmlhJyk7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblBhdXNlKCk7XG4gICAgICAgIGlmIChpbml0aWFsaXplZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1BhdXNpbmcgY2FtZXJhIGFuZCByZW5kZXJlcicpO1xuICAgICAgICAgICAgYXBpICYmIGFwaS5nZXRDYW1lcmFEZXZpY2UoKS5zdG9wKCk7XG4gICAgICAgICAgICBhbmRyb2lkVmlkZW9WaWV3ICYmIGFuZHJvaWRWaWRlb1ZpZXcub25QYXVzZSgpO1xuICAgICAgICAgICAgdnVmb3JpYVJlbmRlcmVyICYmICh2dWZvcmlhUmVuZGVyZXIubUlzQWN0aXZlID0gZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxufSlcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpID0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihjb25maWd1cmVWdWZvcmlhU3VyZmFjZSk7IC8vIGRlbGF5IHVudGlsIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDApO1xuICAgIH1cbn0pO1xuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZXN1bWluZyBWdWZvcmlhJyk7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblJlc3VtZSgpO1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgICAgICBpZiAoaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXN1bWluZyBjYW1lcmEgYW5kIHJlbmRlcmVyJyk7XG4gICAgICAgICAgICBhcGkgJiYgYXBpLmdldENhbWVyYURldmljZSgpLnN0YXJ0KCk7XG4gICAgICAgICAgICBhbmRyb2lkVmlkZW9WaWV3ICYmIGFuZHJvaWRWaWRlb1ZpZXcub25SZXN1bWUoKTtcbiAgICAgICAgICAgIHZ1Zm9yaWFSZW5kZXJlciAmJiAodnVmb3JpYVJlbmRlcmVyLm1Jc0FjdGl2ZSA9IHRydWUpO1xuICAgICAgICB9XG4gICAgfVxufSlcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCkge1xuICAgIGlmICghYXBpKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICBpZiAoYW5kcm9pZFZpZGVvVmlldyA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcuZ2V0V2lkdGgoKSxcbiAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5nZXRIZWlnaHQoKVxuICAgICk7XG4gICAgY29uc29sZS5sb2coXCJjb25maWd1cmVWdWZvcmlhU3VyZmFjZTogXCIgKyBhbmRyb2lkVmlkZW9WaWV3LmdldFdpZHRoKCkgKyBcIiwgXCIgKyBhbmRyb2lkVmlkZW9WaWV3LmdldEhlaWdodCgpKTtcbn1cblxuZXhwb3J0IGNsYXNzIEFQSSBleHRlbmRzIGNvbW1vbi5BUElCYXNlIHtcbiAgICBcbiAgICBwcml2YXRlIGNhbWVyYURldmljZSA9IG5ldyBDYW1lcmFEZXZpY2UoKTtcbiAgICBwcml2YXRlIGRldmljZSA9IG5ldyBEZXZpY2UoKTtcbiAgICBwcml2YXRlIHJlbmRlcmVyID0gbmV3IFJlbmRlcmVyKCk7XG4gICAgXG4gICAgcHJpdmF0ZSBvYmplY3RUcmFja2VyOk9iamVjdFRyYWNrZXJ8dW5kZWZpbmVkO1xuICAgIFxuICAgIHNldExpY2Vuc2VLZXkobGljZW5zZUtleTpzdHJpbmcpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eSAhPSBudWxsICYmIGxpY2Vuc2VLZXkgIT0gbnVsbCkge1xuICAgICAgICAgICAgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNldExpY2Vuc2VLZXkoYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHksIGxpY2Vuc2VLZXkpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBzZXRIaW50KGhpbnQ6ZGVmLkhpbnQsdmFsdWU6bnVtYmVyKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5WdWZvcmlhLnNldEhpbnQoPG51bWJlcj5oaW50LCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgaW5pdCgpIDogUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8ZGVmLkluaXRSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHBsdWdpbi5WdWZvcmlhU2Vzc2lvbi5pbml0KG5ldyBwbHVnaW4uVnVmb3JpYUNvbnRyb2woe1xuICAgICAgICAgICAgICAgIG9uSW5pdEFSRG9uZShyZXN1bHQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09IHZ1Zm9yaWEuSW5pdFJlc3VsdC5TVUNDRVNTKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpLmdldERldmljZSgpLnNldE1vZGUoZGVmLkRldmljZU1vZGUuQVIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5kcm9pZFZpZGVvVmlldyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdFZpZGVvVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdnVmb3JpYVJlbmRlcmVyICYmICh2dWZvcmlhUmVuZGVyZXIubUlzQWN0aXZlID0gdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDAwKTsgLy8gdGhpcyBzaG91bGRuJ3QgYmUgcmVxdWlyZWQsIGJ1dCBzb21ldGltZXMgdGhlIHZpZGVvIGZlZWQgZG9lc24ndCBhcHBlYXIgYWZ0ZXIgcmVpbml0XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5yZWdpc3RlckNhbGxiYWNrKG5ldyB2dWZvcmlhLlZ1Zm9yaWEuVXBkYXRlQ2FsbGJhY2tJbnRlcmZhY2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFfb25VcGRhdGUoc3RhdGU6IHZ1Zm9yaWEuU3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwaSAmJiBhcGkuY2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGkuY2FsbGJhY2sobmV3IFN0YXRlKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25SZXN1bWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKDxkZWYuSW5pdFJlc3VsdD48bnVtYmVyPnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCkgOiB2b2lkIHtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLmRlaW5pdCgpO1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25QYXVzZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEZXZpY2UoKSA6IENhbWVyYURldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbWVyYURldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGV2aWNlKCkgOiBEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldFJlbmRlcmVyKCkgOiBSZW5kZXJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyO1xuICAgIH1cbiAgICBcbiAgICBpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIHZhciB0cmFja2VyID0gPHZ1Zm9yaWEuT2JqZWN0VHJhY2tlcj4gdnVmb3JpYS5UcmFja2VyTWFuYWdlci5nZXRJbnN0YW5jZSgpLmluaXRUcmFja2VyKHZ1Zm9yaWEuT2JqZWN0VHJhY2tlci5nZXRDbGFzc1R5cGUoKSk7XG4gICAgICAgIGlmICh0cmFja2VyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IG5ldyBPYmplY3RUcmFja2VyKHRyYWNrZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBnZXRPYmplY3RUcmFja2VyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vYmplY3RUcmFja2VyO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHZ1Zm9yaWEuVHJhY2tlck1hbmFnZXIuZ2V0SW5zdGFuY2UoKS5kZWluaXRUcmFja2VyKHZ1Zm9yaWEuT2JqZWN0VHJhY2tlci5nZXRDbGFzc1R5cGUoKSkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRTY2FsZUZhY3RvcihmOm51bWJlcikge1xuICAgICAgICBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IgJiYgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yKGYpO1xuICAgIH1cblxuICAgIGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNjYWxlRmFjdG9yKCk7XG4gICAgfVxuXG4gICAgb25TdXJmYWNlQ2hhbmdlZCh3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIpIDogdm9pZCB7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblN1cmZhY2VDaGFuZ2VkKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAvKlxuICAgICAgICBjb25zdCBvcmllbnRhdGlvbjpVSUludGVyZmFjZU9yaWVudGF0aW9uID0gdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5zdGF0dXNCYXJPcmllbnRhdGlvbjtcbiAgICAgICAgc3dpdGNoIChvcmllbnRhdGlvbikge1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdFVwc2lkZURvd246IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMjcwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVMZWZ0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzE4MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlUmlnaHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgfVxuICAgICAgICAqL1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmVjMih2ZWM6dnVmb3JpYS5WZWMyRikgOiBkZWYuVmVjMiB7XG4gICAgdmFyIGRhdGEgPSB2ZWMuZ2V0RGF0YSgpO1xuICAgIHJldHVybiB7IHg6IGRhdGFbMF0sIHk6IGRhdGFbMV0gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVmVjMyh2ZWM6dnVmb3JpYS5WZWMzRikgOiBkZWYuVmVjMyB7XG4gICAgdmFyIGRhdGEgPSB2ZWMuZ2V0RGF0YSgpO1xuICAgIHJldHVybiB7IHg6IGRhdGFbMF0sIHk6IGRhdGFbMV0sIHo6IGRhdGFbMl0gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVmVjNCh2ZWM6dnVmb3JpYS5WZWM0RikgOiBkZWYuVmVjNCB7XG4gICAgdmFyIGRhdGEgPSB2ZWMuZ2V0RGF0YSgpO1xuICAgIHJldHVybiB7IHg6IGRhdGFbMF0sIHk6IGRhdGFbMV0sIHo6IGRhdGFbMl0sIHc6IGRhdGFbM10gfTtcbn1cblxuZnVuY3Rpb24gY29udmVydDJHTE1hdHJpeChtYXQ6dnVmb3JpYS5NYXRyaXgzNEYpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICB2YXIgZGF0YSA9IG1hdC5nZXREYXRhKCk7XG4gICAgcmV0dXJuICBbXG4gICAgICAgICAgICAgICAgZGF0YVswXSxcbiAgICAgICAgICAgICAgICBkYXRhWzRdLFxuICAgICAgICAgICAgICAgIGRhdGFbOF0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzFdLFxuICAgICAgICAgICAgICAgIGRhdGFbNV0sXG4gICAgICAgICAgICAgICAgZGF0YVs5XSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbMl0sXG4gICAgICAgICAgICAgICAgZGF0YVs2XSxcbiAgICAgICAgICAgICAgICBkYXRhWzEwXSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbM10sXG4gICAgICAgICAgICAgICAgZGF0YVs3XSxcbiAgICAgICAgICAgICAgICBkYXRhWzExXSxcbiAgICAgICAgICAgICAgICAxXG4gICAgICAgICAgICBdO1xufVxuXG4vLyBodHRwczovL2xpYnJhcnkudnVmb3JpYS5jb20vYXJ0aWNsZXMvU29sdXRpb24vSG93LVRvLUFjY2Vzcy1DYW1lcmEtUGFyYW1ldGVyc1xuZnVuY3Rpb24gY29udmVydFBlcnNwZWN0aXZlUHJvamVjdGlvbjJHTE1hdHJpeChtYXQ6dnVmb3JpYS5NYXRyaXgzNEYsIG5lYXI6bnVtYmVyLCBmYXI6bnVtYmVyKSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgdmFyIGRhdGEgPSBtYXQuZ2V0RGF0YSgpO1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIGRhdGFbMF0sXG4gICAgICAgICAgICAgICAgZGF0YVs0XSxcbiAgICAgICAgICAgICAgICBkYXRhWzhdLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVsxXSxcbiAgICAgICAgICAgICAgICBkYXRhWzVdLFxuICAgICAgICAgICAgICAgIGRhdGFbOV0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzJdLFxuICAgICAgICAgICAgICAgIGRhdGFbNl0sXG4gICAgICAgICAgICAgICAgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpLFxuICAgICAgICAgICAgICAgIDEsXG4gICAgICAgICAgICAgICAgZGF0YVszXSxcbiAgICAgICAgICAgICAgICBkYXRhWzddLFxuICAgICAgICAgICAgICAgIC1uZWFyICogKDEgKyAoZmFyICsgbmVhcikgLyAoZmFyIC0gbmVhcikpLFxuICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgIF07XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGUge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGUoYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZSkge1xuICAgICAgICAvKlxuICAgICAgICBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuTWFya2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcmtlcihhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLldvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgV29yZChhbmRyb2lkKVxuICAgICAgICB9IGVsc2VcbiAgICAgICAgKi9cbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkltYWdlVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuQ3lsaW5kZXJUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0KGFuZHJvaWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLlRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGUoYW5kcm9pZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVHJhY2thYmxlKSB7fVxuICAgIFxuICAgIGdldElkKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0SWQoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5hbWUoKTtcbiAgICB9XG4gICAgaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5pc0V4dGVuZGVkVHJhY2tpbmdTdGFydGVkKCk7XG4gICAgfVxuICAgIHN0YXJ0RXh0ZW5kZWRUcmFja2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5zdGFydEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG4gICAgc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGVSZXN1bHQge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGVSZXN1bHQoYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAvKlxuICAgICAgICBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuTWFya2VyUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcmtlclJlc3VsdChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLldvcmRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgV29yZFJlc3VsdChhbmRyb2lkKVxuICAgICAgICB9IGVsc2VcbiAgICAgICAgKi9cbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkltYWdlVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0UmVzdWx0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXRSZXN1bHQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0UmVzdWx0KGFuZHJvaWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGVSZXN1bHQoYW5kcm9pZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVHJhY2thYmxlUmVzdWx0KSB7fVxuICAgIFxuICAgIGdldFBvc2UoKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgdmFyIG1hdDM0ID0gdGhpcy5hbmRyb2lkLmdldFBvc2UoKTtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnQyR0xNYXRyaXgobWF0MzQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUaW1lU3RhbXAoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VGltZVN0YW1wKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFN0YXR1cygpOiBkZWYuVHJhY2thYmxlUmVzdWx0U3RhdHVzIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldFN0YXR1cygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmFja2FibGUoKTogVHJhY2thYmxlIHtcbiAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZSgpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXJrZXIgZXh0ZW5kcyBUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTWFya2VyKSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXJrZXJSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTWFya2VyUmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkIGV4dGVuZHMgVHJhY2thYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLldvcmQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIFdvcmRSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLldvcmRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldCBleHRlbmRzIFRyYWNrYWJsZSB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0KSB7c3VwZXIoYW5kcm9pZCl9XG4gICAgXG4gICAgZ2V0VW5pcXVlVGFyZ2V0SWQoKSA6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMyB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMzKHRoaXMuYW5kcm9pZC5nZXRTaXplKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5JbWFnZVRhcmdldCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5jbGFzcyBJbWFnZVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuSW1hZ2VUYXJnZXRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk11bHRpVGFyZ2V0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBNdWx0aVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5DeWxpbmRlclRhcmdldCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5jbGFzcyBDeWxpbmRlclRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIEltYWdlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkltYWdlKSB7fVxuICAgIFxuICAgIGdldEJ1ZmZlckhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEJ1ZmZlckhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRCdWZmZXJXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRCdWZmZXJXaWR0aCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGb3JtYXQoKTogZGVmLlBpeGVsRm9ybWF0IHsgXG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRGb3JtYXQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0SGVpZ2h0KCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQaXhlbHMoKTogaW50ZXJvcC5Qb2ludGVyfHVuZGVmaW5lZCB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFBpeGVscygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdHJpZGUoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0U3RyaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFdpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFdpZHRoKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRnJhbWUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuRnJhbWUpIHt9XG4gICAgZ2V0SW1hZ2UoaWR4OiBudW1iZXIpOiBJbWFnZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBpbWcgPSB0aGlzLmFuZHJvaWQuZ2V0SW1hZ2UoaWR4KTtcbiAgICAgICAgaWYgKGltZykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZShpbWcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldEluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0SW5kZXgoKTtcbiAgICB9XG4gICAgZ2V0TnVtSW1hZ2VzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtSW1hZ2VzKCk7XG4gICAgfVxuICAgIGdldFRpbWVTdGFtcCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlN0YXRlKSB7fVxuICAgIGdldEZyYW1lKCk6IEZyYW1lIHtcbiAgICAgICAgY29uc3QgZnJhbWUgPSB0aGlzLmFuZHJvaWQuZ2V0RnJhbWUoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFtZShmcmFtZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1UcmFja2FibGVzKCk7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZShpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZVJlc3VsdChpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGVSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZVJlc3VsdChpZHgpO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlUmVzdWx0LmNyZWF0ZVRyYWNrYWJsZVJlc3VsdChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhQ2FsaWJyYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuQ2FtZXJhQ2FsaWJyYXRpb24pIHt9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblBhcmFtZXRlcnMoKTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvblBhcmFtZXRlcnMoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldEZpZWxkT2ZWaWV3UmFkcygpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRGaWVsZE9mVmlld1JhZHMoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldEZvY2FsTGVuZ3RoKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzIodGhpcy5hbmRyb2lkLmdldEZvY2FsTGVuZ3RoKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQcmluY2lwYWxQb2ludCgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRQcmluY2lwYWxQb2ludCgpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRTaXplKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYURldmljZSB7XG4gICAgaW5pdChjYW1lcmE6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuaW5pdCg8bnVtYmVyPmNhbWVyYSk7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZGVpbml0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYUNhbGlicmF0aW9uKCk6IENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICAgICAgY29uc3QgY2FsaWJyYXRpb24gPSB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgICAgIHJldHVybiBuZXcgQ2FtZXJhQ2FsaWJyYXRpb24oY2FsaWJyYXRpb24pO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEaXJlY3Rpb24oKTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbiB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhRGlyZWN0aW9uKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZpZGVvTW9kZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TnVtVmlkZW9Nb2RlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb01vZGUobkluZGV4OiBudW1iZXIpOiBkZWYuVmlkZW9Nb2RlIHtcbiAgICAgICAgdmFyIHZpZGVvTW9kZSA9IHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0VmlkZW9Nb2RlKG5JbmRleCk7XG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICB3aWR0aDogdmlkZW9Nb2RlLmdldFdpZHRoKCksXG4gICAgICAgICAgICBoZWlnaHQ6IHZpZGVvTW9kZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgICAgIGZyYW1lcmF0ZTogdmlkZW9Nb2RlLmdldEZyYW1lcmF0ZSgpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIHNlbGVjdFZpZGVvTW9kZShpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZGVvTW9kZShpbmRleCk7XG4gICAgfVxuICAgIFxuICAgIHNldEZsYXNoVG9yY2hNb2RlKG9uOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZsYXNoVG9yY2hNb2RlKG9uKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rm9jdXNNb2RlKGZvY3VzTW9kZTogZGVmLkNhbWVyYURldmljZUZvY3VzTW9kZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGb2N1c01vZGUoPG51bWJlcj5mb2N1c01vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzdGFydCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RhcnQoKTtcbiAgICB9XG4gICAgXG4gICAgc3RvcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RvcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlZpZXdMaXN0KSB7fVxuICAgIGNvbnRhaW5zKHZpZXc6IGRlZi5WaWV3KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuY29udGFpbnMoPG51bWJlcj52aWV3KTtcbiAgICB9XG4gICAgZ2V0TnVtVmlld3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1WaWV3cygpO1xuICAgIH1cbiAgICBnZXRWaWV3KGlkeDogbnVtYmVyKTogZGVmLlZpZXcge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0VmlldyhpZHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnMge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVmlld2VyUGFyYW1ldGVycykge31cbiAgICBjb250YWluc01hZ25ldCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5jb250YWluc01hZ25ldCgpO1xuICAgIH1cbiAgICBnZXRCdXR0b25UeXBlKCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNCdXR0b25UeXBlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldEJ1dHRvblR5cGUoKTtcbiAgICB9XG4gICAgZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uQ29lZmZpY2llbnQoaWR4KTtcbiAgICB9XG4gICAgZ2V0RmllbGRPZlZpZXcoKTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0RmllbGRPZlZpZXcoKSk7XG4gICAgfVxuICAgIGdldEludGVyTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldE1hbnVmYWN0dXJlcigpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE1hbnVmYWN0dXJlcigpO1xuICAgIH1cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TmFtZSgpO1xuICAgIH1cbiAgICBnZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpO1xuICAgIH1cbiAgICBnZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldFRyYXlBbGlnbm1lbnQoKTogZGVmLlZpZXdlclBhcmFtdGVyc1RyYXlBbGlnbm1lbnQge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0VHJheUFsaWdubWVudCgpO1xuICAgIH1cbiAgICBnZXRWZXJzaW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VmVyc2lvbigpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlZpZXdlclBhcmFtZXRlcnNMaXN0KSB7fVxuICAgIGdldChpZHg6IG51bWJlcik6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmFuZHJvaWQuZ2V0KGlkeCk7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0TmFtZU1hbnVmYWN0dXJlcihuYW1lOiBzdHJpbmcsIG1hbnVmYWN0dXJlcjogc3RyaW5nKTogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB2cCA9IHRoaXMuYW5kcm9pZC5nZXQobmFtZSwgbWFudWZhY3R1cmVyKTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBzZXRTREtGaWx0ZXIoZmlsdGVyOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLnNldFNES0ZpbHRlcihmaWx0ZXIpO1xuICAgIH1cbiAgICBzaXplKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc2l6ZSgpO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgRGV2aWNlIHtcbiAgICBzZXRNb2RlKG1vZGU6ZGVmLkRldmljZU1vZGUpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLnNldE1vZGUoPG51bWJlcj5tb2RlKTtcbiAgICB9XG4gICAgZ2V0TW9kZSgpIDogZGVmLkRldmljZU1vZGUge1xuICAgICAgICByZXR1cm4gPG51bWJlcj52dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmdldE1vZGUoKTtcbiAgICB9XG4gICAgc2V0Vmlld2VyQWN0aXZlKGFjdGl2ZTpib29sZWFuKSA6IHZvaWQge1xuICAgICAgICB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLnNldFZpZXdlckFjdGl2ZShhY3RpdmUpO1xuICAgIH1cbiAgICBpc1ZpZXdlckFjdGl2ZSgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuICAgIGdldFZpZXdlckxpc3QoKSA6IFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICAgICAgY29uc3Qgdmlld2VyTGlzdCA9IHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Vmlld2VyTGlzdCgpO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnNMaXN0KHZpZXdlckxpc3QpO1xuICAgIH1cbiAgICBzZWxlY3RWaWV3ZXIodmlld2VyOlZpZXdlclBhcmFtZXRlcnMpIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0Vmlld2VyKHZpZXdlci5hbmRyb2lkKTtcbiAgICB9XG4gICAgZ2V0U2VsZWN0ZWRWaWV3ZXIoKSA6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzVmlld2VyQWN0aXZlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmdldFNlbGVjdGVkVmlld2VyKCkpO1xuICAgIH1cbiAgICBnZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk6IFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgICAgICByZXR1cm4gbmV3IFJlbmRlcmluZ1ByaW1pdGl2ZXModnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmVyIHtcbiAgICBnZXRSZWNvbW1lbmRlZEZwcyhmbGFnczogZGVmLkZQU0hpbnQpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLmdldFJlY29tbWVuZGVkRnBzKDxudW1iZXI+ZmxhZ3MpO1xuICAgIH1cbiAgICBnZXRWaWRlb0JhY2tncm91bmRDb25maWcoKTogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyB7XG4gICAgICAgIHZhciB2YmM6IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnID0gdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLmdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpO1xuICAgICAgICB2YXIgcmVzdWx0OiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnID0ge1xuICAgICAgICAgICAgZW5hYmxlZDp2YmMuZ2V0RW5hYmxlZCgpLFxuICAgICAgICAgICAgcG9zaXRpb25YOnZiYy5nZXRQb3NpdGlvbigpLmdldERhdGEoKVswXSxcbiAgICAgICAgICAgIHBvc2l0aW9uWTp2YmMuZ2V0UG9zaXRpb24oKS5nZXREYXRhKClbMV0sXG4gICAgICAgICAgICBzaXplWDp2YmMuZ2V0U2l6ZSgpLmdldERhdGEoKVswXSxcbiAgICAgICAgICAgIHNpemVZOnZiYy5nZXRTaXplKCkuZ2V0RGF0YSgpWzFdLFxuICAgICAgICAgICAgcmVmbGVjdGlvbjp2YmMuZ2V0UmVmbGVjdGlvbigpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHNldFRhcmdldEZwcyhmcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLnNldFRhcmdldEZwcyhmcHMpO1xuICAgIH1cbiAgICBzZXRWaWRlb0JhY2tncm91bmRDb25maWcoY2ZnOiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnKTogdm9pZCB7XG4gICAgICAgIHZhciB2YmM6IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnID0gbmV3IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCk7XG4gICAgICAgIHZiYy5zZXRFbmFibGVkKGNmZy5lbmFibGVkKTtcbiAgICAgICAgdmJjLnNldFBvc2l0aW9uKG5ldyB2dWZvcmlhLlZlYzJJKGNmZy5wb3NpdGlvblgsIGNmZy5wb3NpdGlvblkpKTtcbiAgICAgICAgdmJjLnNldFNpemUobmV3IHZ1Zm9yaWEuVmVjMkkoY2ZnLnNpemVYLCBjZmcuc2l6ZVkpKTtcbiAgICAgICAgdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLnNldFZpZGVvQmFja2dyb3VuZENvbmZpZyh2YmMpO1xuICAgIH1cbn1cblxuLy8gaW50ZXJvcC5SZWZlcmVuY2UgZG9lcyBub3QgZXhpc3Qgb24gQW5kcm9pZFxuLy8gTWVzaCB3aWxsIGhhdmUgdG8gYmUgcmV0aG91Z2h0IGZvciBjcm9zcy1wbGF0Zm9ybSB1c2VcbmV4cG9ydCBjbGFzcyBNZXNoIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk1lc2gpIHt9XG4gICAgXG4gICAgZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0Tm9ybWFscygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5vcm1hbHMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0TnVtVHJpYW5nbGVzKCk6IG51bWJlciB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1UcmlhbmdsZXMoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZlcnRpY2VzKCk6IG51bWJlciB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1WZXJ0aWNlcygpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25Db29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRQb3NpdGlvbkNvb3JkaW5hdGVzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9ucygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFBvc2l0aW9ucygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmlhbmdsZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0VHJpYW5nbGVzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGdldFVWQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0VVZDb29yZGluYXRlcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzI+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRVVnMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgaGFzTm9ybWFscygpOiBib29sZWFuIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmhhc05vcm1hbHMoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBoYXNQb3NpdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5oYXNQb3NpdGlvbnMoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBoYXNVVnMoKTogYm9vbGVhbiB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5oYXNVVnMoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuUmVuZGVyaW5nUHJpbWl0aXZlcyl7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlTWVzaCh2aWV3SUQ6IGRlZi5WaWV3KTogTWVzaCB7XG4gICAgICAgIGNvbnN0IG1lc2ggPSB0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNZXNoKG1lc2gpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVNpemUodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzIodGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25UZXh0dXJlU2l6ZSg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICB2YXIgbWF0MzQgPSB0aGlzLmFuZHJvaWQuZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgoPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gY29udmVydDJHTE1hdHJpeChtYXQzNCk7XG4gICAgfVxuICAgIFxuICAgIGdldE5vcm1hbGl6ZWRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFByb2plY3Rpb25NYXRyaXgodmlld0lEOiBkZWYuVmlldywgY3NUeXBlOiBkZWYuQ29vcmRpbmF0ZVN5c3RlbVR5cGUpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICB2YXIgbWF0MzQgPSB0aGlzLmFuZHJvaWQuZ2V0UHJvamVjdGlvbk1hdHJpeCg8bnVtYmVyPnZpZXdJRCwgPG51bWJlcj5jc1R5cGUpO1xuICAgICAgICByZXR1cm4gY29udmVydFBlcnNwZWN0aXZlUHJvamVjdGlvbjJHTE1hdHJpeChtYXQzNCwgMC4wMSwgMTAwMDAwKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyaW5nVmlld3MoKTogVmlld0xpc3Qge1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdMaXN0KHRoaXMuYW5kcm9pZC5nZXRSZW5kZXJpbmdWaWV3cygpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCh2aWV3SUQ6IGRlZi5WaWV3KTogTWVzaCB7XG4gICAgICAgIGNvbnN0IG1lc2ggPSB0aGlzLmFuZHJvaWQuZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjc1R5cGU6IGRlZi5Db29yZGluYXRlU3lzdGVtVHlwZSk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHZhciBtYXQzNCA9IHRoaXMuYW5kcm9pZC5nZXRWaWRlb0JhY2tncm91bmRQcm9qZWN0aW9uTWF0cml4KDxudW1iZXI+dmlld0lELCA8bnVtYmVyPmNzVHlwZSk7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KG1hdDM0KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Vmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxufVxuXG5leHBvcnQgY2xhc3MgVHJhY2tlciB7fVxuXG5jbGFzcyBEYXRhU2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkRhdGFTZXQpe31cbiAgICBjcmVhdGVNdWx0aVRhcmdldChuYW1lOiBzdHJpbmcpOiBNdWx0aVRhcmdldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtdCA9IHRoaXMuYW5kcm9pZC5jcmVhdGVNdWx0aVRhcmdldChuYW1lKTtcbiAgICAgICAgaWYgKG10KSByZXR1cm4gbmV3IE11bHRpVGFyZ2V0KG10KTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVzdHJveSh0cmFja2FibGU6IFRyYWNrYWJsZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmRlc3Ryb3kodHJhY2thYmxlLmFuZHJvaWQpO1xuICAgIH1cbiAgICBleGlzdHMocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZXhpc3RzKHBhdGgsIDxudW1iZXI+c3RvcmFnZVR5cGUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBUcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBoYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuaGFzUmVhY2hlZFRyYWNrYWJsZUxpbWl0KCk7XG4gICAgfVxuICAgIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmlzQWN0aXZlKCk7XG4gICAgfVxuICAgIGxvYWQocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQubG9hZChwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUcmFja2VyIGV4dGVuZHMgVHJhY2tlciB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5PYmplY3RUcmFja2VyKXsgc3VwZXIoKTsgfVxuICAgIHN0YXJ0KCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5zdGFydCgpO1xuICAgIH1cbiAgICBzdG9wKCkgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLnN0b3AoKTtcbiAgICB9XG4gICAgY3JlYXRlRGF0YVNldCgpIDogRGF0YVNldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBkcyA9IHRoaXMuYW5kcm9pZC5jcmVhdGVEYXRhU2V0KCk7XG4gICAgICAgIGlmIChkcykgcmV0dXJuIG5ldyBEYXRhU2V0KGRzKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cdGRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy5hbmRyb2lkLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQuYW5kcm9pZCk7XG5cdH1cbiAgICBhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmFjdGl2YXRlRGF0YVNldChkYXRhU2V0LmFuZHJvaWQpO1xuICAgIH1cbiAgICBkZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5hbmRyb2lkKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcGkgPSBWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBBUEkoKSA6IHVuZGVmaW5lZDtcbiJdfQ==