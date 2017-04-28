//import * as utils from 'utils/utils';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./vuforia-common");
var def = require("nativescript-vuforia");
var application = require("application");
var placeholder = require("ui/placeholder");
var vuforia = com.vuforia;
var plugin = io.argonjs.vuforia;
global.moduleMerge(common, exports);
var VUFORIA_AVAILABLE = typeof plugin.VuforiaSession !== 'undefined';
var androidVideoView = undefined;
var vuforiaRenderer;
exports.videoView = new placeholder.Placeholder();
exports.videoView.on(placeholder.Placeholder.creatingViewEvent, function (evt) {
    androidVideoView = (VUFORIA_AVAILABLE ? new plugin.VuforiaGLView(application.android.context) : undefined);
    evt.view = androidVideoView;
    androidVideoView.init(vuforia.Vuforia.requiresAlpha(), 16, 0);
    vuforiaRenderer = new plugin.VuforiaRenderer();
    androidVideoView.setRenderer(vuforiaRenderer);
});
exports.videoView.onLoaded = function () {
    if (VUFORIA_AVAILABLE)
        vuforia.Vuforia.onSurfaceCreated();
};
exports.videoView.onLayout = function (left, top, right, bottom) {
    if (VUFORIA_AVAILABLE)
        configureVuforiaSurface();
};
application.on(application.suspendEvent, function () {
    if (VUFORIA_AVAILABLE) {
        console.log('Pausing Vuforia');
        vuforia.Vuforia.onPause();
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
    }
});
function configureVuforiaSurface() {
    if (!exports.api)
        throw new Error();
    if (androidVideoView === undefined)
        return;
    //const contentScaleFactor = androidVideoView.contentScaleFactor;
    var contentScaleFactor = 1.0; // todo: fix this
    exports.api.onSurfaceChanged(androidVideoView.getWidth() * contentScaleFactor, androidVideoView.getHeight() * contentScaleFactor);
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
                        vuforiaRenderer.mIsActive = true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5hbmRyb2lkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidnVmb3JpYS5hbmRyb2lkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHVDQUF1Qzs7O0FBRXZDLHlDQUE0QztBQUM1QywwQ0FBNkM7QUFDN0MseUNBQTRDO0FBQzVDLDRDQUErQztBQUMvQyxJQUFPLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQzdCLElBQU8sTUFBTSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBRW5DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRXBDLElBQU0saUJBQWlCLEdBQUcsT0FBTyxNQUFNLENBQUMsY0FBYyxLQUFLLFdBQVcsQ0FBQztBQUV2RSxJQUFJLGdCQUFnQixHQUFtQyxTQUFTLENBQUM7QUFDakUsSUFBSSxlQUF1QyxDQUFDO0FBRS9CLFFBQUEsU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZELGlCQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsVUFBQyxHQUFtQztJQUN4RixnQkFBZ0IsR0FBMEIsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQztJQUNsSSxHQUFHLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDO0lBRTVCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUU5RCxlQUFlLEdBQUcsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDL0MsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxD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LE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBQ0osc0NBQWMsR0FBZCxVQUFlLE9BQWU7UUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBQ0UsdUNBQWUsR0FBZixVQUFnQixPQUFlO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUNELHlDQUFpQixHQUFqQixVQUFrQixPQUFlO1FBQzdCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBQ0wsb0JBQUM7QUFBRCxDQUFDLEFBdEJELENBQW1DLE9BQU8sR0FzQnpDO0FBdEJZLHNDQUFhO0FBd0JiLFFBQUEsR0FBRyxHQUFHLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy9pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCBjb21tb24gPSByZXF1aXJlKCcuL3Z1Zm9yaWEtY29tbW9uJyk7XG5pbXBvcnQgZGVmID0gcmVxdWlyZSgnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnKTtcbmltcG9ydCBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJ2FwcGxpY2F0aW9uJyk7XG5pbXBvcnQgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCd1aS9wbGFjZWhvbGRlcicpO1xuaW1wb3J0IHZ1Zm9yaWEgPSBjb20udnVmb3JpYTtcbmltcG9ydCBwbHVnaW4gPSBpby5hcmdvbmpzLnZ1Zm9yaWE7XG5cbmdsb2JhbC5tb2R1bGVNZXJnZShjb21tb24sIGV4cG9ydHMpO1xuXG5jb25zdCBWVUZPUklBX0FWQUlMQUJMRSA9IHR5cGVvZiBwbHVnaW4uVnVmb3JpYVNlc3Npb27CoCE9PSAndW5kZWZpbmVkJztcblxudmFyIGFuZHJvaWRWaWRlb1ZpZXc6IHBsdWdpbi5WdWZvcmlhR0xWaWV3fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbnZhciB2dWZvcmlhUmVuZGVyZXI6IHBsdWdpbi5WdWZvcmlhUmVuZGVyZXI7XG5cbmV4cG9ydCBjb25zdCB2aWRlb1ZpZXcgPSBuZXcgcGxhY2Vob2xkZXIuUGxhY2Vob2xkZXIoKTtcbnZpZGVvVmlldy5vbihwbGFjZWhvbGRlci5QbGFjZWhvbGRlci5jcmVhdGluZ1ZpZXdFdmVudCwgKGV2dDpwbGFjZWhvbGRlci5DcmVhdGVWaWV3RXZlbnREYXRhKT0+e1xuICAgIGFuZHJvaWRWaWRlb1ZpZXcgPSA8cGx1Z2luLlZ1Zm9yaWFHTFZpZXc+IChWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBwbHVnaW4uVnVmb3JpYUdMVmlldyhhcHBsaWNhdGlvbi5hbmRyb2lkLmNvbnRleHQpIDogdW5kZWZpbmVkKTtcbiAgICBldnQudmlldyA9IGFuZHJvaWRWaWRlb1ZpZXc7XG5cbiAgICBhbmRyb2lkVmlkZW9WaWV3LmluaXQodnVmb3JpYS5WdWZvcmlhLnJlcXVpcmVzQWxwaGEoKSwgMTYsIDApO1xuXG4gICAgdnVmb3JpYVJlbmRlcmVyID0gbmV3IHBsdWdpbi5WdWZvcmlhUmVuZGVyZXIoKTtcbiAgICBhbmRyb2lkVmlkZW9WaWV3LnNldFJlbmRlcmVyKHZ1Zm9yaWFSZW5kZXJlcik7XG59KVxuXG52aWRlb1ZpZXcub25Mb2FkZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHZ1Zm9yaWEuVnVmb3JpYS5vblN1cmZhY2VDcmVhdGVkKCk7XG59XG5cbnZpZGVvVmlldy5vbkxheW91dCA9IGZ1bmN0aW9uKGxlZnQsIHRvcCwgcmlnaHQsIGJvdHRvbSkge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbn1cblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24uc3VzcGVuZEV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BhdXNpbmcgVnVmb3JpYScpO1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25QYXVzZSgpO1xuICAgIH1cbn0pXG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKSA9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oY29uZmlndXJlVnVmb3JpYVN1cmZhY2UpOyAvLyBkZWxheSB1bnRpbCB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGFjdHVhbGx5IGNoYW5nZXNcbiAgICAgICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgNTAwKTtcbiAgICB9XG59KTtcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ucmVzdW1lRXZlbnQsICgpPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUmVzdW1pbmcgVnVmb3JpYScpO1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25SZXN1bWUoKTtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICB9XG59KVxuXG5leHBvcnQgZnVuY3Rpb24gY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKSB7XG4gICAgaWYgKCFhcGkpIHRocm93IG5ldyBFcnJvcigpO1xuICAgIGlmIChhbmRyb2lkVmlkZW9WaWV3ID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAvL2NvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IGFuZHJvaWRWaWRlb1ZpZXcuY29udGVudFNjYWxlRmFjdG9yO1xuICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IDEuMDsgLy8gdG9kbzogZml4IHRoaXNcbiAgICBhcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5nZXRXaWR0aCgpICogY29udGVudFNjYWxlRmFjdG9yLFxuICAgICAgICBhbmRyb2lkVmlkZW9WaWV3LmdldEhlaWdodCgpICogY29udGVudFNjYWxlRmFjdG9yXG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhcImNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlOiBcIiArIGFuZHJvaWRWaWRlb1ZpZXcuZ2V0V2lkdGgoKSArIFwiLCBcIiArIGFuZHJvaWRWaWRlb1ZpZXcuZ2V0SGVpZ2h0KCkpO1xufVxuXG5leHBvcnQgY2xhc3MgQVBJIGV4dGVuZHMgY29tbW9uLkFQSUJhc2Uge1xuICAgIFxuICAgIHByaXZhdGUgY2FtZXJhRGV2aWNlID0gbmV3IENhbWVyYURldmljZSgpO1xuICAgIHByaXZhdGUgZGV2aWNlID0gbmV3IERldmljZSgpO1xuICAgIHByaXZhdGUgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIoKTtcbiAgICBcbiAgICBwcml2YXRlIG9iamVjdFRyYWNrZXI6T2JqZWN0VHJhY2tlcnx1bmRlZmluZWQ7XG4gICAgXG4gICAgc2V0TGljZW5zZUtleShsaWNlbnNlS2V5OnN0cmluZykgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5ICE9IG51bGwgJiYgbGljZW5zZUtleSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2V0TGljZW5zZUtleShhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eSwgbGljZW5zZUtleSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIHNldEhpbnQoaGludDpkZWYuSGludCx2YWx1ZTpudW1iZXIpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLlZ1Zm9yaWEuc2V0SGludCg8bnVtYmVyPmhpbnQsIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLmluaXQobmV3IHBsdWdpbi5WdWZvcmlhQ29udHJvbCh7XG4gICAgICAgICAgICAgICAgb25Jbml0QVJEb25lKHJlc3VsdDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gdnVmb3JpYS5Jbml0UmVzdWx0LlNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGkuZ2V0RGV2aWNlKCkuc2V0TW9kZShkZWYuRGV2aWNlTW9kZS5BUilcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWFSZW5kZXJlci5tSXNBY3RpdmUgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgNTAwMCk7IC8vIHRoaXMgc2hvdWxkbid0IGJlIHJlcXVpcmVkLCBidXQgc29tZXRpbWVzIHRoZSB2aWRlbyBmZWVkIGRvZXNuJ3QgYXBwZWFyIGFmdGVyIHJlaW5pdFxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEucmVnaXN0ZXJDYWxsYmFjayhuZXcgdnVmb3JpYS5WdWZvcmlhLlVwZGF0ZUNhbGxiYWNrSW50ZXJmYWNlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBWdWZvcmlhX29uVXBkYXRlKHN0YXRlOiB2dWZvcmlhLlN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcGkgJiYgYXBpLmNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpLmNhbGxiYWNrKG5ldyBTdGF0ZShzdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSg8ZGVmLkluaXRSZXN1bHQ+PG51bWJlcj5yZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpIDogdm9pZCB7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5kZWluaXQoKTtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUGF1c2UoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGV2aWNlKCkgOiBDYW1lcmFEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5jYW1lcmFEZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldERldmljZSgpIDogRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJlcigpIDogUmVuZGVyZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJlcjtcbiAgICB9XG4gICAgXG4gICAgaW5pdE9iamVjdFRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICB2YXIgdHJhY2tlciA9IDx2dWZvcmlhLk9iamVjdFRyYWNrZXI+IHZ1Zm9yaWEuVHJhY2tlck1hbmFnZXIuZ2V0SW5zdGFuY2UoKS5pbml0VHJhY2tlcih2dWZvcmlhLk9iamVjdFRyYWNrZXIuZ2V0Q2xhc3NUeXBlKCkpO1xuICAgICAgICBpZiAodHJhY2tlciAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSBuZXcgT2JqZWN0VHJhY2tlcih0cmFja2VyKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0T2JqZWN0VHJhY2tlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0VHJhY2tlcjtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmICh2dWZvcmlhLlRyYWNrZXJNYW5hZ2VyLmdldEluc3RhbmNlKCkuZGVpbml0VHJhY2tlcih2dWZvcmlhLk9iamVjdFRyYWNrZXIuZ2V0Q2xhc3NUeXBlKCkpKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgc2V0U2NhbGVGYWN0b3IoZjpudW1iZXIpIHtcbiAgICAgICAgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yICYmIHBsdWdpbi5WdWZvcmlhU2Vzc2lvbi5zZXRTY2FsZUZhY3RvcihmKTtcbiAgICB9XG5cbiAgICBnZXRTY2FsZUZhY3RvcigpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHBsdWdpbi5WdWZvcmlhU2Vzc2lvbi5zY2FsZUZhY3RvcigpO1xuICAgIH1cblxuICAgIG9uU3VyZmFjZUNoYW5nZWQod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyKSA6IHZvaWQge1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ2hhbmdlZCh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLypcbiAgICAgICAgY29uc3Qgb3JpZW50YXRpb246VUlJbnRlcmZhY2VPcmllbnRhdGlvbiA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikuc3RhdHVzQmFyT3JpZW50YXRpb247XG4gICAgICAgIHN3aXRjaCAob3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXRVcHNpZGVEb3duOiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzI3MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlTGVmdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18xODApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLkxhbmRzY2FwZVJpZ2h0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgIH1cbiAgICAgICAgKi9cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZlYzIodmVjOnZ1Zm9yaWEuVmVjMkYpIDogZGVmLlZlYzIge1xuICAgIHZhciBkYXRhID0gdmVjLmdldERhdGEoKTtcbiAgICByZXR1cm4geyB4OiBkYXRhWzBdLCB5OiBkYXRhWzFdIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZlYzModmVjOnZ1Zm9yaWEuVmVjM0YpIDogZGVmLlZlYzMge1xuICAgIHZhciBkYXRhID0gdmVjLmdldERhdGEoKTtcbiAgICByZXR1cm4geyB4OiBkYXRhWzBdLCB5OiBkYXRhWzFdLCB6OiBkYXRhWzJdIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZlYzQodmVjOnZ1Zm9yaWEuVmVjNEYpIDogZGVmLlZlYzQge1xuICAgIHZhciBkYXRhID0gdmVjLmdldERhdGEoKTtcbiAgICByZXR1cm4geyB4OiBkYXRhWzBdLCB5OiBkYXRhWzFdLCB6OiBkYXRhWzJdLCB3OiBkYXRhWzNdIH07XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnQyR0xNYXRyaXgobWF0OnZ1Zm9yaWEuTWF0cml4MzRGKSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgdmFyIGRhdGEgPSBtYXQuZ2V0RGF0YSgpO1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIGRhdGFbMF0sXG4gICAgICAgICAgICAgICAgZGF0YVs0XSxcbiAgICAgICAgICAgICAgICBkYXRhWzhdLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVsxXSxcbiAgICAgICAgICAgICAgICBkYXRhWzVdLFxuICAgICAgICAgICAgICAgIGRhdGFbOV0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzJdLFxuICAgICAgICAgICAgICAgIGRhdGFbNl0sXG4gICAgICAgICAgICAgICAgZGF0YVsxMF0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzNdLFxuICAgICAgICAgICAgICAgIGRhdGFbN10sXG4gICAgICAgICAgICAgICAgZGF0YVsxMV0sXG4gICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgXTtcbn1cblxuLy8gaHR0cHM6Ly9saWJyYXJ5LnZ1Zm9yaWEuY29tL2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1BY2Nlc3MtQ2FtZXJhLVBhcmFtZXRlcnNcbmZ1bmN0aW9uIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgobWF0OnZ1Zm9yaWEuTWF0cml4MzRGLCBuZWFyOm51bWJlciwgZmFyOm51bWJlcikgOiBkZWYuTWF0cml4NDQge1xuICAgIHZhciBkYXRhID0gbWF0LmdldERhdGEoKTtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgICAgICAgICBkYXRhWzBdLFxuICAgICAgICAgICAgICAgIGRhdGFbNF0sXG4gICAgICAgICAgICAgICAgZGF0YVs4XSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbMV0sXG4gICAgICAgICAgICAgICAgZGF0YVs1XSxcbiAgICAgICAgICAgICAgICBkYXRhWzldLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVsyXSxcbiAgICAgICAgICAgICAgICBkYXRhWzZdLFxuICAgICAgICAgICAgICAgIChmYXIgKyBuZWFyKSAvIChmYXIgLSBuZWFyKSxcbiAgICAgICAgICAgICAgICAxLFxuICAgICAgICAgICAgICAgIGRhdGFbM10sXG4gICAgICAgICAgICAgICAgZGF0YVs3XSxcbiAgICAgICAgICAgICAgICAtbmVhciAqICgxICsgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpKSxcbiAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICBdO1xufVxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlIHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlKGFuZHJvaWQ6dnVmb3JpYS5UcmFja2FibGUpIHtcbiAgICAgICAgLypcbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLk1hcmtlcikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXJrZXIoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5Xb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFdvcmQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICovXG4gICAgICAgIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5JbWFnZVRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkN5bGluZGVyVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuT2JqZWN0VGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldChhbmRyb2lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5UcmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlKGFuZHJvaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZSkge31cbiAgICBcbiAgICBnZXRJZCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldElkKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROYW1lKCk7XG4gICAgfVxuICAgIGlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpO1xuICAgIH1cbiAgICBzdGFydEV4dGVuZGVkVHJhY2tpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxuICAgIHN0b3BFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLnN0b3BFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlUmVzdWx0IHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlUmVzdWx0KGFuZHJvaWQ6dnVmb3JpYS5UcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgLypcbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLk1hcmtlclJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXJrZXJSZXN1bHQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5Xb3JkUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRSZXN1bHQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICovXG4gICAgICAgIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5JbWFnZVRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldFJlc3VsdChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0UmVzdWx0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuT2JqZWN0VGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldFJlc3VsdChhbmRyb2lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5UcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlUmVzdWx0KGFuZHJvaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdCkge31cbiAgICBcbiAgICBnZXRQb3NlKCk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHZhciBtYXQzNCA9IHRoaXMuYW5kcm9pZC5nZXRQb3NlKCk7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KG1hdDM0KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VGltZVN0YW1wKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdGF0dXMoKTogZGVmLlRyYWNrYWJsZVJlc3VsdFN0YXR1cyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRTdGF0dXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJhY2thYmxlKCk6IFRyYWNrYWJsZSB7XG4gICAgICAgIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGUoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWFya2VyIGV4dGVuZHMgVHJhY2thYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk1hcmtlcikge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgTWFya2VyUmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk1hcmtlclJlc3VsdCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgV29yZCBleHRlbmRzIFRyYWNrYWJsZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5Xb3JkKSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkUmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5Xb3JkUmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUYXJnZXQgZXh0ZW5kcyBUcmFja2FibGUgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk9iamVjdFRhcmdldCkge3N1cGVyKGFuZHJvaWQpfVxuICAgIFxuICAgIGdldFVuaXF1ZVRhcmdldElkKCkgOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFVuaXF1ZVRhcmdldElkKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFNpemUoKTogZGVmLlZlYzMge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMyh0aGlzLmFuZHJvaWQuZ2V0U2l6ZSgpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUYXJnZXRSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk9iamVjdFRhcmdldFJlc3VsdCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5jbGFzcyBJbWFnZVRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuSW1hZ2VUYXJnZXQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuY2xhc3MgSW1hZ2VUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkltYWdlVGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBNdWx0aVRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5NdWx0aVRhcmdldCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk9iamVjdFRhcmdldFJlc3VsdCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5jbGFzcyBDeWxpbmRlclRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuQ3lsaW5kZXJUYXJnZXQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuY2xhc3MgQ3lsaW5kZXJUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFnZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5JbWFnZSkge31cbiAgICBcbiAgICBnZXRCdWZmZXJIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRCdWZmZXJIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0QnVmZmVyV2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0QnVmZmVyV2lkdGgoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9ybWF0KCk6IGRlZi5QaXhlbEZvcm1hdCB7IFxuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0Rm9ybWF0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEhlaWdodCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UGl4ZWxzKCk6IGludGVyb3AuUG9pbnRlcnx1bmRlZmluZWQgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRQaXhlbHMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U3RyaWRlKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFN0cmlkZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRXaWR0aCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZyYW1lIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkZyYW1lKSB7fVxuICAgIGdldEltYWdlKGlkeDogbnVtYmVyKTogSW1hZ2V8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgaW1nID0gdGhpcy5hbmRyb2lkLmdldEltYWdlKGlkeCk7XG4gICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2UoaW1nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEluZGV4KCk7XG4gICAgfVxuICAgIGdldE51bUltYWdlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bUltYWdlcygpO1xuICAgIH1cbiAgICBnZXRUaW1lU3RhbXAoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRUaW1lU3RhbXAoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5TdGF0ZSkge31cbiAgICBnZXRGcmFtZSgpOiBGcmFtZSB7XG4gICAgICAgIGNvbnN0IGZyYW1lID0gdGhpcy5hbmRyb2lkLmdldEZyYW1lKCk7XG4gICAgICAgIHJldHVybiBuZXcgRnJhbWUoZnJhbWUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVSZXN1bHRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGVSZXN1bHQoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlUmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGVSZXN1bHQoaWR4KTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZVJlc3VsdC5jcmVhdGVUcmFja2FibGVSZXN1bHQocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkNhbWVyYUNhbGlicmF0aW9uKSB7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGaWVsZE9mVmlld1JhZHMoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0RmllbGRPZlZpZXdSYWRzKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGb2NhbExlbmd0aCgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRGb2NhbExlbmd0aCgpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJpbmNpcGFsUG9pbnQoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0UHJpbmNpcGFsUG9pbnQoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFNpemUoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjMih0aGlzLmFuZHJvaWQuZ2V0U2l6ZSgpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDYW1lcmFEZXZpY2Uge1xuICAgIGluaXQoY2FtZXJhOiBkZWYuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmluaXQoPG51bWJlcj5jYW1lcmEpO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmRlaW5pdCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFDYWxpYnJhdGlvbigpOiBDYW1lcmFDYWxpYnJhdGlvbiB7XG4gICAgICAgIGNvbnN0IGNhbGlicmF0aW9uID0gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRDYW1lcmFDYWxpYnJhdGlvbigpO1xuICAgICAgICByZXR1cm4gbmV3IENhbWVyYUNhbGlicmF0aW9uKGNhbGlicmF0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGlyZWN0aW9uKCk6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24ge1xuICAgICAgICByZXR1cm4gPG51bWJlcj52dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYURpcmVjdGlvbigpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WaWRlb01vZGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldE51bVZpZGVvTW9kZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9Nb2RlKG5JbmRleDogbnVtYmVyKTogZGVmLlZpZGVvTW9kZSB7XG4gICAgICAgIHZhciB2aWRlb01vZGUgPSB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZGVvTW9kZShuSW5kZXgpO1xuICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgd2lkdGg6IHZpZGVvTW9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb01vZGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgICAgICBmcmFtZXJhdGU6IHZpZGVvTW9kZS5nZXRGcmFtZXJhdGUoKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICBzZWxlY3RWaWRlb01vZGUoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWRlb01vZGUoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBzZXRGbGFzaFRvcmNoTW9kZShvbjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGbGFzaFRvcmNoTW9kZShvbik7XG4gICAgfVxuICAgIFxuICAgIHNldEZvY3VzTW9kZShmb2N1c01vZGU6IGRlZi5DYW1lcmFEZXZpY2VGb2N1c01vZGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Rm9jdXNNb2RlKDxudW1iZXI+Zm9jdXNNb2RlKTtcbiAgICB9XG4gICAgXG4gICAgc3RhcnQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIFxuICAgIHN0b3AoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3TGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5WaWV3TGlzdCkge31cbiAgICBjb250YWlucyh2aWV3OiBkZWYuVmlldyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmNvbnRhaW5zKDxudW1iZXI+dmlldyk7XG4gICAgfVxuICAgIGdldE51bVZpZXdzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVmlld3MoKTtcbiAgICB9XG4gICAgZ2V0VmlldyhpZHg6IG51bWJlcik6IGRlZi5WaWV3IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldFZpZXcoaWR4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlZpZXdlclBhcmFtZXRlcnMpIHt9XG4gICAgY29udGFpbnNNYWduZXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuY29udGFpbnNNYWduZXQoKTtcbiAgICB9XG4gICAgZ2V0QnV0dG9uVHlwZSgpOiBkZWYuVmlld2VyUGFyYW10ZXJzQnV0dG9uVHlwZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRCdXR0b25UeXBlKCk7XG4gICAgfVxuICAgIGdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHg6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeCk7XG4gICAgfVxuICAgIGdldEZpZWxkT2ZWaWV3KCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldEZpZWxkT2ZWaWV3KCkpO1xuICAgIH1cbiAgICBnZXRJbnRlckxlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEludGVyTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRNYW51ZmFjdHVyZXIoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRNYW51ZmFjdHVyZXIoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5hbWUoKTtcbiAgICB9XG4gICAgZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bURpc3RvcnRpb25Db2VmZmljaWVudHMoKTtcbiAgICB9XG4gICAgZ2V0U2NyZWVuVG9MZW5zRGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRUcmF5QWxpZ25tZW50KCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNUcmF5QWxpZ25tZW50IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldFRyYXlBbGlnbm1lbnQoKTtcbiAgICB9XG4gICAgZ2V0VmVyc2lvbigpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFZlcnNpb24oKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5WaWV3ZXJQYXJhbWV0ZXJzTGlzdCkge31cbiAgICBnZXQoaWR4OiBudW1iZXIpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5hbmRyb2lkLmdldChpZHgpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE5hbWVNYW51ZmFjdHVyZXIobmFtZTogc3RyaW5nLCBtYW51ZmFjdHVyZXI6IHN0cmluZyk6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmFuZHJvaWQuZ2V0KG5hbWUsIG1hbnVmYWN0dXJlcik7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgc2V0U0RLRmlsdGVyKGZpbHRlcjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5zZXRTREtGaWx0ZXIoZmlsdGVyKTtcbiAgICB9XG4gICAgc2l6ZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLnNpemUoKTtcbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIERldmljZSB7XG4gICAgc2V0TW9kZShtb2RlOmRlZi5EZXZpY2VNb2RlKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRNb2RlKDxudW1iZXI+bW9kZSk7XG4gICAgfVxuICAgIGdldE1vZGUoKSA6IGRlZi5EZXZpY2VNb2RlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRNb2RlKCk7XG4gICAgfVxuICAgIHNldFZpZXdlckFjdGl2ZShhY3RpdmU6Ym9vbGVhbikgOiB2b2lkIHtcbiAgICAgICAgdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRWaWV3ZXJBY3RpdmUoYWN0aXZlKTtcbiAgICB9XG4gICAgaXNWaWV3ZXJBY3RpdmUoKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5pc1ZpZXdlckFjdGl2ZSgpO1xuICAgIH1cbiAgICBnZXRWaWV3ZXJMaXN0KCkgOiBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgICAgIGNvbnN0IHZpZXdlckxpc3QgPSB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZXdlckxpc3QoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCh2aWV3ZXJMaXN0KTtcbiAgICB9XG4gICAgc2VsZWN0Vmlld2VyKHZpZXdlcjpWaWV3ZXJQYXJhbWV0ZXJzKSB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZXdlcih2aWV3ZXIuYW5kcm9pZCk7XG4gICAgfVxuICAgIGdldFNlbGVjdGVkVmlld2VyKCkgOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghdGhpcy5pc1ZpZXdlckFjdGl2ZSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRTZWxlY3RlZFZpZXdlcigpKTtcbiAgICB9XG4gICAgZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpOiBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZW5kZXJpbmdQcmltaXRpdmVzKHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJlciB7XG4gICAgZ2V0UmVjb21tZW5kZWRGcHMoZmxhZ3M6IGRlZi5GUFNIaW50KTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5nZXRSZWNvbW1lbmRlZEZwcyg8bnVtYmVyPmZsYWdzKTtcbiAgICB9XG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCk6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcge1xuICAgICAgICB2YXIgdmJjOiB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZyA9IHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5nZXRWaWRlb0JhY2tncm91bmRDb25maWcoKTtcbiAgICAgICAgdmFyIHJlc3VsdDogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6dmJjLmdldEVuYWJsZWQoKSxcbiAgICAgICAgICAgIHBvc2l0aW9uWDp2YmMuZ2V0UG9zaXRpb24oKS5nZXREYXRhKClbMF0sXG4gICAgICAgICAgICBwb3NpdGlvblk6dmJjLmdldFBvc2l0aW9uKCkuZ2V0RGF0YSgpWzFdLFxuICAgICAgICAgICAgc2l6ZVg6dmJjLmdldFNpemUoKS5nZXREYXRhKClbMF0sXG4gICAgICAgICAgICBzaXplWTp2YmMuZ2V0U2l6ZSgpLmdldERhdGEoKVsxXSxcbiAgICAgICAgICAgIHJlZmxlY3Rpb246dmJjLmdldFJlZmxlY3Rpb24oKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBzZXRUYXJnZXRGcHMoZnBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5zZXRUYXJnZXRGcHMoZnBzKTtcbiAgICB9XG4gICAgc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKGNmZzogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyk6IHZvaWQge1xuICAgICAgICB2YXIgdmJjOiB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZyA9IG5ldyB2dWZvcmlhLlZpZGVvQmFja2dyb3VuZENvbmZpZygpO1xuICAgICAgICB2YmMuc2V0RW5hYmxlZChjZmcuZW5hYmxlZCk7XG4gICAgICAgIHZiYy5zZXRQb3NpdGlvbihuZXcgdnVmb3JpYS5WZWMySShjZmcucG9zaXRpb25YLCBjZmcucG9zaXRpb25ZKSk7XG4gICAgICAgIHZiYy5zZXRTaXplKG5ldyB2dWZvcmlhLlZlYzJJKGNmZy5zaXplWCwgY2ZnLnNpemVZKSk7XG4gICAgICAgIHZ1Zm9yaWEuUmVuZGVyZXIuZ2V0SW5zdGFuY2UoKS5zZXRWaWRlb0JhY2tncm91bmRDb25maWcodmJjKTtcbiAgICB9XG59XG5cbi8vIGludGVyb3AuUmVmZXJlbmNlIGRvZXMgbm90IGV4aXN0IG9uIEFuZHJvaWRcbi8vIE1lc2ggd2lsbCBoYXZlIHRvIGJlIHJldGhvdWdodCBmb3IgY3Jvc3MtcGxhdGZvcm0gdXNlXG5leHBvcnQgY2xhc3MgTWVzaCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5NZXNoKSB7fVxuICAgIFxuICAgIGdldE5vcm1hbENvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5vcm1hbENvb3JkaW5hdGVzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE5vcm1hbHMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROb3JtYWxzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE51bVRyaWFuZ2xlcygpOiBudW1iZXIge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJpYW5nbGVzKCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WZXJ0aWNlcygpOiBudW1iZXIge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVmVydGljZXMoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0UG9zaXRpb25Db29yZGluYXRlcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRQb3NpdGlvbnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRQb3NpdGlvbnMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJpYW5nbGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFRyaWFuZ2xlcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVkNvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFVWQ29vcmRpbmF0ZXMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgZ2V0VVZzKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0VVZzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGhhc05vcm1hbHMoKTogYm9vbGVhbiB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5oYXNOb3JtYWxzKCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaGFzUG9zaXRpb25zKCk6IGJvb2xlYW4ge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuaGFzUG9zaXRpb25zKCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaGFzVVZzKCk6IGJvb2xlYW4ge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuaGFzVVZzKCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlJlbmRlcmluZ1ByaW1pdGl2ZXMpe31cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZU1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25UZXh0dXJlTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uVGV4dHVyZVNpemUoPG51bWJlcj52aWV3SUQpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgdmFyIG1hdDM0ID0gdGhpcy5hbmRyb2lkLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnQyR0xNYXRyaXgobWF0MzQpO1xuICAgIH1cbiAgICBcbiAgICBnZXROb3JtYWxpemVkVmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldE5vcm1hbGl6ZWRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQcm9qZWN0aW9uTWF0cml4KHZpZXdJRDogZGVmLlZpZXcsIGNzVHlwZTogZGVmLkNvb3JkaW5hdGVTeXN0ZW1UeXBlKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgdmFyIG1hdDM0ID0gdGhpcy5hbmRyb2lkLmdldFByb2plY3Rpb25NYXRyaXgoPG51bWJlcj52aWV3SUQsIDxudW1iZXI+Y3NUeXBlKTtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgobWF0MzQsIDAuMDEsIDEwMDAwMCk7XG4gICAgfVxuICAgIFxuICAgIGdldFJlbmRlcmluZ1ZpZXdzKCk6IFZpZXdMaXN0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3TGlzdCh0aGlzLmFuZHJvaWQuZ2V0UmVuZGVyaW5nVmlld3MoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZE1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5hbmRyb2lkLmdldFZpZGVvQmFja2dyb3VuZE1lc2goPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gbmV3IE1lc2gobWVzaCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZFByb2plY3Rpb25NYXRyaXgodmlld0lEOiBkZWYuVmlldywgY3NUeXBlOiBkZWYuQ29vcmRpbmF0ZVN5c3RlbVR5cGUpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICB2YXIgbWF0MzQgPSB0aGlzLmFuZHJvaWQuZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCg8bnVtYmVyPnZpZXdJRCwgPG51bWJlcj5jc1R5cGUpO1xuICAgICAgICByZXR1cm4gY29udmVydDJHTE1hdHJpeChtYXQzNCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbn1cblxuZXhwb3J0IGNsYXNzIFRyYWNrZXIge31cblxuY2xhc3MgRGF0YVNldCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5EYXRhU2V0KXt9XG4gICAgY3JlYXRlTXVsdGlUYXJnZXQobmFtZTogc3RyaW5nKTogTXVsdGlUYXJnZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgbXQgPSB0aGlzLmFuZHJvaWQuY3JlYXRlTXVsdGlUYXJnZXQobmFtZSk7XG4gICAgICAgIGlmIChtdCkgcmV0dXJuIG5ldyBNdWx0aVRhcmdldChtdCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGRlc3Ryb3kodHJhY2thYmxlOiBUcmFja2FibGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5kZXN0cm95KHRyYWNrYWJsZS5hbmRyb2lkKTtcbiAgICB9XG4gICAgZXhpc3RzKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmV4aXN0cyhwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuYW5kcm9pZC5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaGFzUmVhY2hlZFRyYWNrYWJsZUxpbWl0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmhhc1JlYWNoZWRUcmFja2FibGVMaW1pdCgpO1xuICAgIH1cbiAgICBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5pc0FjdGl2ZSgpO1xuICAgIH1cbiAgICBsb2FkKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmxvYWQocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VHJhY2tlciBleHRlbmRzIFRyYWNrZXIge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VHJhY2tlcil7IHN1cGVyKCk7IH1cbiAgICBzdGFydCgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc3RhcnQoKTtcbiAgICB9XG4gICAgc3RvcCgpIDogdm9pZCB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5zdG9wKCk7XG4gICAgfVxuICAgIGNyZWF0ZURhdGFTZXQoKSA6IERhdGFTZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgZHMgPSB0aGlzLmFuZHJvaWQuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICBpZiAoZHMpIHJldHVybiBuZXcgRGF0YVNldChkcyk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXHRkZXN0cm95RGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHRoaXMuYW5kcm9pZC5kZXN0cm95RGF0YVNldChkYXRhU2V0LmFuZHJvaWQpO1xuXHR9XG4gICAgYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5hY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5hbmRyb2lkKTtcbiAgICB9XG4gICAgZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuYW5kcm9pZCk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgYXBpID0gVlVGT1JJQV9BVkFJTEFCTEUgPyBuZXcgQVBJKCkgOiB1bmRlZmluZWQ7XG4iXX0=