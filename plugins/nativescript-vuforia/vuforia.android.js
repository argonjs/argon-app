//import * as utils from 'utils/utils';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./vuforia-common");
var application = require("application");
var placeholder = require("ui/placeholder");
var vuforia = com.vuforia;
var plugin = io.argonjs.vuforia;
global.moduleMerge(common, exports);
var VUFORIA_AVAILABLE = typeof plugin.VuforiaSession !== 'undefined';
var androidVideoView = (VUFORIA_AVAILABLE ? new plugin.VuforiaGLView(application.android.context) : undefined);
var rendererInitialized = false;
exports.videoView = new placeholder.Placeholder();
exports.videoView.on(placeholder.Placeholder.creatingViewEvent, function (evt) {
    evt.view = androidVideoView;
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
    //const contentScaleFactor = androidVideoView.contentScaleFactor;
    var contentScaleFactor = 1.0; // todo: fix this
    exports.api.onSurfaceChanged(androidVideoView.getWidth() * contentScaleFactor, androidVideoView.getHeight() * contentScaleFactor);
}
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
                        if (!rendererInitialized) {
                            androidVideoView.init(vuforia.Vuforia.requiresAlpha(), 16, 0);
                            var renderer = new plugin.VuforiaRenderer();
                            androidVideoView.setRenderer(renderer);
                            // todo: pause renderer as needed
                            renderer.mIsActive = true;
                            rendererInitialized = true;
                        }
                        //vuforia.Vuforia.onSurfaceCreated();
                        configureVuforiaSurface();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5hbmRyb2lkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidnVmb3JpYS5hbmRyb2lkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHVDQUF1Qzs7O0FBRXZDLHlDQUE0QztBQUU1Qyx5Q0FBNEM7QUFDNUMsNENBQStDO0FBQy9DLElBQU8sT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7QUFDN0IsSUFBTyxNQUFNLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFFbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFFcEMsSUFBTSxpQkFBaUIsR0FBRyxPQUFPLE1BQU0sQ0FBQyxjQUFjLEtBQUssV0FBVyxDQUFDO0FBRXZFLElBQU0sZ0JBQWdCLEdBQTBCLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxNQUFNLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFFeEksSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7QUFFbkIsUUFBQSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDdkQsaUJBQVMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxVQUFDLEdBQW1DO0lBQ3hGLEdBQUcsQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUE7QUFFRixpQkFBUyxDQUFDLFFBQVEsR0FBRztJQUNqQixFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUM5RCxDQUFDLENBQUE7QUFFRCxpQkFBUyxDQUFDLFFBQVEsR0FBRyxVQUFTLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU07SUFDbEQsRUFBRSxDQUFDLENBQUMs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QUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUNMLG9CQUFDO0FBQUQsQ0FBQyxBQXRCRCxDQUFtQyxPQUFPLEdBc0J6QztBQXRCWSxzQ0FBYTtBQXdCYixRQUFBLEdBQUcsR0FBRyxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQgY29tbW9uID0gcmVxdWlyZSgnLi92dWZvcmlhLWNvbW1vbicpO1xuaW1wb3J0IGRlZiA9IHJlcXVpcmUoJ25hdGl2ZXNjcmlwdC12dWZvcmlhJyk7XG5pbXBvcnQgYXBwbGljYXRpb24gPSByZXF1aXJlKCdhcHBsaWNhdGlvbicpO1xuaW1wb3J0IHBsYWNlaG9sZGVyID0gcmVxdWlyZSgndWkvcGxhY2Vob2xkZXInKTtcbmltcG9ydCB2dWZvcmlhID0gY29tLnZ1Zm9yaWE7XG5pbXBvcnQgcGx1Z2luID0gaW8uYXJnb25qcy52dWZvcmlhO1xuXG5nbG9iYWwubW9kdWxlTWVyZ2UoY29tbW9uLCBleHBvcnRzKTtcblxuY29uc3QgVlVGT1JJQV9BVkFJTEFCTEUgPSB0eXBlb2YgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uwqAhPT0gJ3VuZGVmaW5lZCc7XG5cbmNvbnN0IGFuZHJvaWRWaWRlb1ZpZXcgPSA8cGx1Z2luLlZ1Zm9yaWFHTFZpZXc+IChWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBwbHVnaW4uVnVmb3JpYUdMVmlldyhhcHBsaWNhdGlvbi5hbmRyb2lkLmNvbnRleHQpIDogdW5kZWZpbmVkKTtcblxudmFyIHJlbmRlcmVySW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuZXhwb3J0IGNvbnN0IHZpZGVvVmlldyA9IG5ldyBwbGFjZWhvbGRlci5QbGFjZWhvbGRlcigpO1xudmlkZW9WaWV3Lm9uKHBsYWNlaG9sZGVyLlBsYWNlaG9sZGVyLmNyZWF0aW5nVmlld0V2ZW50LCAoZXZ0OnBsYWNlaG9sZGVyLkNyZWF0ZVZpZXdFdmVudERhdGEpPT57XG4gICAgZXZ0LnZpZXcgPSBhbmRyb2lkVmlkZW9WaWV3O1xufSlcblxudmlkZW9WaWV3Lm9uTG9hZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB2dWZvcmlhLlZ1Zm9yaWEub25TdXJmYWNlQ3JlYXRlZCgpO1xufVxuXG52aWRlb1ZpZXcub25MYXlvdXQgPSBmdW5jdGlvbihsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20pIHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG59XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnN1c3BlbmRFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQYXVzaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUGF1c2UoKTtcbiAgICB9XG59KVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCkgPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKTsgLy8gZGVsYXkgdW50aWwgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBhY3R1YWxseSBjaGFuZ2VzXG4gICAgfVxufSk7XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnJlc3VtZUV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Jlc3VtaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLm9uUmVzdW1lKCk7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgfVxufSlcblxuZnVuY3Rpb24gY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKSB7XG4gICAgaWYgKCFhcGkpIHRocm93IG5ldyBFcnJvcigpO1xuICAgIC8vY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gYW5kcm9pZFZpZGVvVmlldy5jb250ZW50U2NhbGVGYWN0b3I7XG4gICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gMS4wOyAvLyB0b2RvOiBmaXggdGhpc1xuICAgIGFwaS5vblN1cmZhY2VDaGFuZ2VkKFxuICAgICAgICBhbmRyb2lkVmlkZW9WaWV3LmdldFdpZHRoKCkgKiBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgIGFuZHJvaWRWaWRlb1ZpZXcuZ2V0SGVpZ2h0KCkgKiBjb250ZW50U2NhbGVGYWN0b3JcbiAgICApO1xufVxuXG5leHBvcnQgY2xhc3MgQVBJIGV4dGVuZHMgY29tbW9uLkFQSUJhc2Uge1xuICAgIFxuICAgIHByaXZhdGUgY2FtZXJhRGV2aWNlID0gbmV3IENhbWVyYURldmljZSgpO1xuICAgIHByaXZhdGUgZGV2aWNlID0gbmV3IERldmljZSgpO1xuICAgIHByaXZhdGUgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIoKTtcbiAgICBcbiAgICBwcml2YXRlIG9iamVjdFRyYWNrZXI6T2JqZWN0VHJhY2tlcnx1bmRlZmluZWQ7XG4gICAgXG4gICAgc2V0TGljZW5zZUtleShsaWNlbnNlS2V5OnN0cmluZykgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5ICE9IG51bGwgJiYgbGljZW5zZUtleSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2V0TGljZW5zZUtleShhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eSwgbGljZW5zZUtleSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIHNldEhpbnQoaGludDpkZWYuSGludCx2YWx1ZTpudW1iZXIpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLlZ1Zm9yaWEuc2V0SGludCg8bnVtYmVyPmhpbnQsIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLmluaXQobmV3IHBsdWdpbi5WdWZvcmlhQ29udHJvbCh7XG4gICAgICAgICAgICAgICAgb25Jbml0QVJEb25lKHJlc3VsdDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gdnVmb3JpYS5Jbml0UmVzdWx0LlNVQ0NFU1MpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZW5kZXJlckluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5pbml0KHZ1Zm9yaWEuVnVmb3JpYS5yZXF1aXJlc0FscGhhKCksIDE2LCAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZW5kZXJlciA9IG5ldyBwbHVnaW4uVnVmb3JpYVJlbmRlcmVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kcm9pZFZpZGVvVmlldy5zZXRSZW5kZXJlcihyZW5kZXJlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0b2RvOiBwYXVzZSByZW5kZXJlciBhcyBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlci5tSXNBY3RpdmUgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZXJJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdnVmb3JpYS5WdWZvcmlhLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5yZWdpc3RlckNhbGxiYWNrKG5ldyB2dWZvcmlhLlZ1Zm9yaWEuVXBkYXRlQ2FsbGJhY2tJbnRlcmZhY2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFfb25VcGRhdGUoc3RhdGU6IHZ1Zm9yaWEuU3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwaSAmJiBhcGkuY2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGkuY2FsbGJhY2sobmV3IFN0YXRlKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25SZXN1bWUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKDxkZWYuSW5pdFJlc3VsdD48bnVtYmVyPnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCkgOiB2b2lkIHtcbiAgICAgICAgdnVmb3JpYS5WdWZvcmlhLmRlaW5pdCgpO1xuICAgICAgICB2dWZvcmlhLlZ1Zm9yaWEub25QYXVzZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEZXZpY2UoKSA6IENhbWVyYURldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbWVyYURldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGV2aWNlKCkgOiBEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldFJlbmRlcmVyKCkgOiBSZW5kZXJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyO1xuICAgIH1cbiAgICBcbiAgICBpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIHZhciB0cmFja2VyID0gPHZ1Zm9yaWEuT2JqZWN0VHJhY2tlcj4gdnVmb3JpYS5UcmFja2VyTWFuYWdlci5nZXRJbnN0YW5jZSgpLmluaXRUcmFja2VyKHZ1Zm9yaWEuT2JqZWN0VHJhY2tlci5nZXRDbGFzc1R5cGUoKSk7XG4gICAgICAgIGlmICh0cmFja2VyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IG5ldyBPYmplY3RUcmFja2VyKHRyYWNrZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBnZXRPYmplY3RUcmFja2VyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vYmplY3RUcmFja2VyO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHZ1Zm9yaWEuVHJhY2tlck1hbmFnZXIuZ2V0SW5zdGFuY2UoKS5kZWluaXRUcmFja2VyKHZ1Zm9yaWEuT2JqZWN0VHJhY2tlci5nZXRDbGFzc1R5cGUoKSkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRTY2FsZUZhY3RvcihmOm51bWJlcikge1xuICAgICAgICBwbHVnaW4uVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IgJiYgcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yKGYpO1xuICAgIH1cblxuICAgIGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcGx1Z2luLlZ1Zm9yaWFTZXNzaW9uLnNjYWxlRmFjdG9yKCk7XG4gICAgfVxuXG4gICAgb25TdXJmYWNlQ2hhbmdlZCh3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIpIDogdm9pZCB7XG4gICAgICAgIHZ1Zm9yaWEuVnVmb3JpYS5vblN1cmZhY2VDaGFuZ2VkKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAvKlxuICAgICAgICBjb25zdCBvcmllbnRhdGlvbjpVSUludGVyZmFjZU9yaWVudGF0aW9uID0gdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5zdGF0dXNCYXJPcmllbnRhdGlvbjtcbiAgICAgICAgc3dpdGNoIChvcmllbnRhdGlvbikge1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdFVwc2lkZURvd246IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMjcwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVMZWZ0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzE4MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlUmlnaHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgfVxuICAgICAgICAqL1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmVjMih2ZWM6dnVmb3JpYS5WZWMyRikgOiBkZWYuVmVjMiB7XG4gICAgdmFyIGRhdGEgPSB2ZWMuZ2V0RGF0YSgpO1xuICAgIHJldHVybiB7IHg6IGRhdGFbMF0sIHk6IGRhdGFbMV0gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVmVjMyh2ZWM6dnVmb3JpYS5WZWMzRikgOiBkZWYuVmVjMyB7XG4gICAgdmFyIGRhdGEgPSB2ZWMuZ2V0RGF0YSgpO1xuICAgIHJldHVybiB7IHg6IGRhdGFbMF0sIHk6IGRhdGFbMV0sIHo6IGRhdGFbMl0gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVmVjNCh2ZWM6dnVmb3JpYS5WZWM0RikgOiBkZWYuVmVjNCB7XG4gICAgdmFyIGRhdGEgPSB2ZWMuZ2V0RGF0YSgpO1xuICAgIHJldHVybiB7IHg6IGRhdGFbMF0sIHk6IGRhdGFbMV0sIHo6IGRhdGFbMl0sIHc6IGRhdGFbM10gfTtcbn1cblxuZnVuY3Rpb24gY29udmVydDJHTE1hdHJpeChtYXQ6dnVmb3JpYS5NYXRyaXgzNEYpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICB2YXIgZGF0YSA9IG1hdC5nZXREYXRhKCk7XG4gICAgcmV0dXJuICBbXG4gICAgICAgICAgICAgICAgZGF0YVswXSxcbiAgICAgICAgICAgICAgICBkYXRhWzRdLFxuICAgICAgICAgICAgICAgIGRhdGFbOF0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzFdLFxuICAgICAgICAgICAgICAgIGRhdGFbNV0sXG4gICAgICAgICAgICAgICAgZGF0YVs5XSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbMl0sXG4gICAgICAgICAgICAgICAgZGF0YVs2XSxcbiAgICAgICAgICAgICAgICBkYXRhWzEwXSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGRhdGFbM10sXG4gICAgICAgICAgICAgICAgZGF0YVs3XSxcbiAgICAgICAgICAgICAgICBkYXRhWzExXSxcbiAgICAgICAgICAgICAgICAxXG4gICAgICAgICAgICBdO1xufVxuXG4vLyBodHRwczovL2xpYnJhcnkudnVmb3JpYS5jb20vYXJ0aWNsZXMvU29sdXRpb24vSG93LVRvLUFjY2Vzcy1DYW1lcmEtUGFyYW1ldGVyc1xuZnVuY3Rpb24gY29udmVydFBlcnNwZWN0aXZlUHJvamVjdGlvbjJHTE1hdHJpeChtYXQ6dnVmb3JpYS5NYXRyaXgzNEYsIG5lYXI6bnVtYmVyLCBmYXI6bnVtYmVyKSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgdmFyIGRhdGEgPSBtYXQuZ2V0RGF0YSgpO1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIGRhdGFbMF0sXG4gICAgICAgICAgICAgICAgZGF0YVs0XSxcbiAgICAgICAgICAgICAgICBkYXRhWzhdLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgZGF0YVsxXSxcbiAgICAgICAgICAgICAgICBkYXRhWzVdLFxuICAgICAgICAgICAgICAgIGRhdGFbOV0sXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBkYXRhWzJdLFxuICAgICAgICAgICAgICAgIGRhdGFbNl0sXG4gICAgICAgICAgICAgICAgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpLFxuICAgICAgICAgICAgICAgIDEsXG4gICAgICAgICAgICAgICAgZGF0YVszXSxcbiAgICAgICAgICAgICAgICBkYXRhWzddLFxuICAgICAgICAgICAgICAgIC1uZWFyICogKDEgKyAoZmFyICsgbmVhcikgLyAoZmFyIC0gbmVhcikpLFxuICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgIF07XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGUge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGUoYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZSkge1xuICAgICAgICAvKlxuICAgICAgICBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuTWFya2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcmtlcihhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLldvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgV29yZChhbmRyb2lkKVxuICAgICAgICB9IGVsc2VcbiAgICAgICAgKi9cbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkltYWdlVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuQ3lsaW5kZXJUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0KGFuZHJvaWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLlRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGUoYW5kcm9pZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVHJhY2thYmxlKSB7fVxuICAgIFxuICAgIGdldElkKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0SWQoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5hbWUoKTtcbiAgICB9XG4gICAgaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5pc0V4dGVuZGVkVHJhY2tpbmdTdGFydGVkKCk7XG4gICAgfVxuICAgIHN0YXJ0RXh0ZW5kZWRUcmFja2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5zdGFydEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG4gICAgc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGVSZXN1bHQge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGVSZXN1bHQoYW5kcm9pZDp2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAvKlxuICAgICAgICBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuTWFya2VyUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcmtlclJlc3VsdChhbmRyb2lkKVxuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLldvcmRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgV29yZFJlc3VsdChhbmRyb2lkKVxuICAgICAgICB9IGVsc2VcbiAgICAgICAgKi9cbiAgICAgICAgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLkltYWdlVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0UmVzdWx0KGFuZHJvaWQpXG4gICAgICAgIH0gZWxzZSBpZiAoYW5kcm9pZCBpbnN0YW5jZW9mIHZ1Zm9yaWEuQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXRSZXN1bHQoYW5kcm9pZClcbiAgICAgICAgfSBlbHNlIGlmIChhbmRyb2lkIGluc3RhbmNlb2YgdnVmb3JpYS5PYmplY3RUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0UmVzdWx0KGFuZHJvaWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFuZHJvaWQgaW5zdGFuY2VvZiB2dWZvcmlhLlRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGVSZXN1bHQoYW5kcm9pZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVHJhY2thYmxlUmVzdWx0KSB7fVxuICAgIFxuICAgIGdldFBvc2UoKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgdmFyIG1hdDM0ID0gdGhpcy5hbmRyb2lkLmdldFBvc2UoKTtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnQyR0xNYXRyaXgobWF0MzQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUaW1lU3RhbXAoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VGltZVN0YW1wKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFN0YXR1cygpOiBkZWYuVHJhY2thYmxlUmVzdWx0U3RhdHVzIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldFN0YXR1cygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmFja2FibGUoKTogVHJhY2thYmxlIHtcbiAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZSgpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXJrZXIgZXh0ZW5kcyBUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTWFya2VyKSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXJrZXJSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuTWFya2VyUmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkIGV4dGVuZHMgVHJhY2thYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLldvcmQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIFdvcmRSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLldvcmRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldCBleHRlbmRzIFRyYWNrYWJsZSB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0KSB7c3VwZXIoYW5kcm9pZCl9XG4gICAgXG4gICAgZ2V0VW5pcXVlVGFyZ2V0SWQoKSA6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMyB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMzKHRoaXMuYW5kcm9pZC5nZXRTaXplKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5JbWFnZVRhcmdldCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5jbGFzcyBJbWFnZVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuSW1hZ2VUYXJnZXRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk11bHRpVGFyZ2V0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmV4cG9ydCBjbGFzcyBNdWx0aVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoYW5kcm9pZCl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5DeWxpbmRlclRhcmdldCkge3N1cGVyKGFuZHJvaWQpfVxufVxuXG5jbGFzcyBDeWxpbmRlclRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtzdXBlcihhbmRyb2lkKX1cbn1cblxuZXhwb3J0IGNsYXNzIEltYWdlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkltYWdlKSB7fVxuICAgIFxuICAgIGdldEJ1ZmZlckhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEJ1ZmZlckhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRCdWZmZXJXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRCdWZmZXJXaWR0aCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGb3JtYXQoKTogZGVmLlBpeGVsRm9ybWF0IHsgXG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuYW5kcm9pZC5nZXRGb3JtYXQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0SGVpZ2h0KCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldEhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQaXhlbHMoKTogaW50ZXJvcC5Qb2ludGVyfHVuZGVmaW5lZCB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFBpeGVscygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdHJpZGUoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0U3RyaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFdpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFdpZHRoKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRnJhbWUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuRnJhbWUpIHt9XG4gICAgZ2V0SW1hZ2UoaWR4OiBudW1iZXIpOiBJbWFnZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBpbWcgPSB0aGlzLmFuZHJvaWQuZ2V0SW1hZ2UoaWR4KTtcbiAgICAgICAgaWYgKGltZykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZShpbWcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldEluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0SW5kZXgoKTtcbiAgICB9XG4gICAgZ2V0TnVtSW1hZ2VzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtSW1hZ2VzKCk7XG4gICAgfVxuICAgIGdldFRpbWVTdGFtcCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlN0YXRlKSB7fVxuICAgIGdldEZyYW1lKCk6IEZyYW1lIHtcbiAgICAgICAgY29uc3QgZnJhbWUgPSB0aGlzLmFuZHJvaWQuZ2V0RnJhbWUoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFtZShmcmFtZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1UcmFja2FibGVzKCk7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZShpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZVJlc3VsdChpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGVSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZVJlc3VsdChpZHgpO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlUmVzdWx0LmNyZWF0ZVRyYWNrYWJsZVJlc3VsdChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhQ2FsaWJyYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuQ2FtZXJhQ2FsaWJyYXRpb24pIHt9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblBhcmFtZXRlcnMoKTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvblBhcmFtZXRlcnMoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldEZpZWxkT2ZWaWV3UmFkcygpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRGaWVsZE9mVmlld1JhZHMoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldEZvY2FsTGVuZ3RoKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzIodGhpcy5hbmRyb2lkLmdldEZvY2FsTGVuZ3RoKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQcmluY2lwYWxQb2ludCgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRQcmluY2lwYWxQb2ludCgpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWMyKHRoaXMuYW5kcm9pZC5nZXRTaXplKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYURldmljZSB7XG4gICAgaW5pdChjYW1lcmE6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuaW5pdCg8bnVtYmVyPmNhbWVyYSk7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZGVpbml0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYUNhbGlicmF0aW9uKCk6IENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICAgICAgY29uc3QgY2FsaWJyYXRpb24gPSB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgICAgIHJldHVybiBuZXcgQ2FtZXJhQ2FsaWJyYXRpb24oY2FsaWJyYXRpb24pO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEaXJlY3Rpb24oKTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbiB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhRGlyZWN0aW9uKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZpZGVvTW9kZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TnVtVmlkZW9Nb2RlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb01vZGUobkluZGV4OiBudW1iZXIpOiBkZWYuVmlkZW9Nb2RlIHtcbiAgICAgICAgdmFyIHZpZGVvTW9kZSA9IHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0VmlkZW9Nb2RlKG5JbmRleCk7XG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICB3aWR0aDogdmlkZW9Nb2RlLmdldFdpZHRoKCksXG4gICAgICAgICAgICBoZWlnaHQ6IHZpZGVvTW9kZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgICAgIGZyYW1lcmF0ZTogdmlkZW9Nb2RlLmdldEZyYW1lcmF0ZSgpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIHNlbGVjdFZpZGVvTW9kZShpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZGVvTW9kZShpbmRleCk7XG4gICAgfVxuICAgIFxuICAgIHNldEZsYXNoVG9yY2hNb2RlKG9uOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZsYXNoVG9yY2hNb2RlKG9uKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rm9jdXNNb2RlKGZvY3VzTW9kZTogZGVmLkNhbWVyYURldmljZUZvY3VzTW9kZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5DYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGb2N1c01vZGUoPG51bWJlcj5mb2N1c01vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzdGFydCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RhcnQoKTtcbiAgICB9XG4gICAgXG4gICAgc3RvcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RvcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlZpZXdMaXN0KSB7fVxuICAgIGNvbnRhaW5zKHZpZXc6IGRlZi5WaWV3KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuY29udGFpbnMoPG51bWJlcj52aWV3KTtcbiAgICB9XG4gICAgZ2V0TnVtVmlld3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1WaWV3cygpO1xuICAgIH1cbiAgICBnZXRWaWV3KGlkeDogbnVtYmVyKTogZGVmLlZpZXcge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0VmlldyhpZHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnMge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuVmlld2VyUGFyYW1ldGVycykge31cbiAgICBjb250YWluc01hZ25ldCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5jb250YWluc01hZ25ldCgpO1xuICAgIH1cbiAgICBnZXRCdXR0b25UeXBlKCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNCdXR0b25UeXBlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5hbmRyb2lkLmdldEJ1dHRvblR5cGUoKTtcbiAgICB9XG4gICAgZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uQ29lZmZpY2llbnQoaWR4KTtcbiAgICB9XG4gICAgZ2V0RmllbGRPZlZpZXcoKTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0RmllbGRPZlZpZXcoKSk7XG4gICAgfVxuICAgIGdldEludGVyTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldE1hbnVmYWN0dXJlcigpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldE1hbnVmYWN0dXJlcigpO1xuICAgIH1cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TmFtZSgpO1xuICAgIH1cbiAgICBnZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpO1xuICAgIH1cbiAgICBnZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldFRyYXlBbGlnbm1lbnQoKTogZGVmLlZpZXdlclBhcmFtdGVyc1RyYXlBbGlnbm1lbnQge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmFuZHJvaWQuZ2V0VHJheUFsaWdubWVudCgpO1xuICAgIH1cbiAgICBnZXRWZXJzaW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0VmVyc2lvbigpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLlZpZXdlclBhcmFtZXRlcnNMaXN0KSB7fVxuICAgIGdldChpZHg6IG51bWJlcik6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmFuZHJvaWQuZ2V0KGlkeCk7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0TmFtZU1hbnVmYWN0dXJlcihuYW1lOiBzdHJpbmcsIG1hbnVmYWN0dXJlcjogc3RyaW5nKTogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB2cCA9IHRoaXMuYW5kcm9pZC5nZXQobmFtZSwgbWFudWZhY3R1cmVyKTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBzZXRTREtGaWx0ZXIoZmlsdGVyOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLnNldFNES0ZpbHRlcihmaWx0ZXIpO1xuICAgIH1cbiAgICBzaXplKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuc2l6ZSgpO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgRGV2aWNlIHtcbiAgICBzZXRNb2RlKG1vZGU6ZGVmLkRldmljZU1vZGUpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLnNldE1vZGUoPG51bWJlcj5tb2RlKTtcbiAgICB9XG4gICAgZ2V0TW9kZSgpIDogZGVmLkRldmljZU1vZGUge1xuICAgICAgICByZXR1cm4gPG51bWJlcj52dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmdldE1vZGUoKTtcbiAgICB9XG4gICAgc2V0Vmlld2VyQWN0aXZlKGFjdGl2ZTpib29sZWFuKSA6IHZvaWQge1xuICAgICAgICB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLnNldFZpZXdlckFjdGl2ZShhY3RpdmUpO1xuICAgIH1cbiAgICBpc1ZpZXdlckFjdGl2ZSgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuICAgIGdldFZpZXdlckxpc3QoKSA6IFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICAgICAgY29uc3Qgdmlld2VyTGlzdCA9IHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Vmlld2VyTGlzdCgpO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnNMaXN0KHZpZXdlckxpc3QpO1xuICAgIH1cbiAgICBzZWxlY3RWaWV3ZXIodmlld2VyOlZpZXdlclBhcmFtZXRlcnMpIHtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWEuRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0Vmlld2VyKHZpZXdlci5hbmRyb2lkKTtcbiAgICB9XG4gICAgZ2V0U2VsZWN0ZWRWaWV3ZXIoKSA6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzVmlld2VyQWN0aXZlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2dWZvcmlhLkRldmljZS5nZXRJbnN0YW5jZSgpLmdldFNlbGVjdGVkVmlld2VyKCkpO1xuICAgIH1cbiAgICBnZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk6IFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgICAgICByZXR1cm4gbmV3IFJlbmRlcmluZ1ByaW1pdGl2ZXModnVmb3JpYS5EZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmVyIHtcbiAgICBnZXRSZWNvbW1lbmRlZEZwcyhmbGFnczogZGVmLkZQU0hpbnQpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLmdldFJlY29tbWVuZGVkRnBzKDxudW1iZXI+ZmxhZ3MpO1xuICAgIH1cbiAgICBnZXRWaWRlb0JhY2tncm91bmRDb25maWcoKTogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyB7XG4gICAgICAgIHZhciB2YmM6IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnID0gdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLmdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpO1xuICAgICAgICB2YXIgcmVzdWx0OiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnID0ge1xuICAgICAgICAgICAgZW5hYmxlZDp2YmMuZ2V0RW5hYmxlZCgpLFxuICAgICAgICAgICAgcG9zaXRpb25YOnZiYy5nZXRQb3NpdGlvbigpLmdldERhdGEoKVswXSxcbiAgICAgICAgICAgIHBvc2l0aW9uWTp2YmMuZ2V0UG9zaXRpb24oKS5nZXREYXRhKClbMV0sXG4gICAgICAgICAgICBzaXplWDp2YmMuZ2V0U2l6ZSgpLmdldERhdGEoKVswXSxcbiAgICAgICAgICAgIHNpemVZOnZiYy5nZXRTaXplKCkuZ2V0RGF0YSgpWzFdLFxuICAgICAgICAgICAgcmVmbGVjdGlvbjp2YmMuZ2V0UmVmbGVjdGlvbigpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHNldFRhcmdldEZwcyhmcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLnNldFRhcmdldEZwcyhmcHMpO1xuICAgIH1cbiAgICBzZXRWaWRlb0JhY2tncm91bmRDb25maWcoY2ZnOiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnKTogdm9pZCB7XG4gICAgICAgIHZhciB2YmM6IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnID0gbmV3IHZ1Zm9yaWEuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCk7XG4gICAgICAgIHZiYy5zZXRFbmFibGVkKGNmZy5lbmFibGVkKTtcbiAgICAgICAgdmJjLnNldFBvc2l0aW9uKG5ldyB2dWZvcmlhLlZlYzJJKGNmZy5wb3NpdGlvblgsIGNmZy5wb3NpdGlvblkpKTtcbiAgICAgICAgdmJjLnNldFNpemUobmV3IHZ1Zm9yaWEuVmVjMkkoY2ZnLnNpemVYLCBjZmcuc2l6ZVkpKTtcbiAgICAgICAgdnVmb3JpYS5SZW5kZXJlci5nZXRJbnN0YW5jZSgpLnNldFZpZGVvQmFja2dyb3VuZENvbmZpZyh2YmMpO1xuICAgIH1cbn1cblxuLy8gaW50ZXJvcC5SZWZlcmVuY2UgZG9lcyBub3QgZXhpc3Qgb24gQW5kcm9pZFxuLy8gTWVzaCB3aWxsIGhhdmUgdG8gYmUgcmV0aG91Z2h0IGZvciBjcm9zcy1wbGF0Zm9ybSB1c2VcbmV4cG9ydCBjbGFzcyBNZXNoIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLk1lc2gpIHt9XG4gICAgXG4gICAgZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0Tm9ybWFscygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldE5vcm1hbHMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0TnVtVHJpYW5nbGVzKCk6IG51bWJlciB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1UcmlhbmdsZXMoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZlcnRpY2VzKCk6IG51bWJlciB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXROdW1WZXJ0aWNlcygpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25Db29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRQb3NpdGlvbkNvb3JkaW5hdGVzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9ucygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz58dW5kZWZpbmVkIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmdldFBvc2l0aW9ucygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmlhbmdsZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0VHJpYW5nbGVzKCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIGdldFVWQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPnx1bmRlZmluZWQge1xuICAgICAgICAvL3JldHVybiB0aGlzLmFuZHJvaWQuZ2V0VVZDb29yZGluYXRlcygpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzI+fHVuZGVmaW5lZCB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRVVnMoKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgaGFzTm9ybWFscygpOiBib29sZWFuIHtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5hbmRyb2lkLmhhc05vcm1hbHMoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBoYXNQb3NpdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5oYXNQb3NpdGlvbnMoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBoYXNVVnMoKTogYm9vbGVhbiB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMuYW5kcm9pZC5oYXNVVnMoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhbmRyb2lkOnZ1Zm9yaWEuUmVuZGVyaW5nUHJpbWl0aXZlcyl7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlTWVzaCh2aWV3SUQ6IGRlZi5WaWV3KTogTWVzaCB7XG4gICAgICAgIGNvbnN0IG1lc2ggPSB0aGlzLmFuZHJvaWQuZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNZXNoKG1lc2gpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVNpemUodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzIodGhpcy5hbmRyb2lkLmdldERpc3RvcnRpb25UZXh0dXJlU2l6ZSg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWM0KHRoaXMuYW5kcm9pZC5nZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICB2YXIgbWF0MzQgPSB0aGlzLmFuZHJvaWQuZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgoPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gY29udmVydDJHTE1hdHJpeChtYXQzNCk7XG4gICAgfVxuICAgIFxuICAgIGdldE5vcm1hbGl6ZWRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gY3JlYXRlVmVjNCh0aGlzLmFuZHJvaWQuZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFByb2plY3Rpb25NYXRyaXgodmlld0lEOiBkZWYuVmlldywgY3NUeXBlOiBkZWYuQ29vcmRpbmF0ZVN5c3RlbVR5cGUpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICB2YXIgbWF0MzQgPSB0aGlzLmFuZHJvaWQuZ2V0UHJvamVjdGlvbk1hdHJpeCg8bnVtYmVyPnZpZXdJRCwgPG51bWJlcj5jc1R5cGUpO1xuICAgICAgICByZXR1cm4gY29udmVydFBlcnNwZWN0aXZlUHJvamVjdGlvbjJHTE1hdHJpeChtYXQzNCwgMC4wMSwgMTAwMDAwKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyaW5nVmlld3MoKTogVmlld0xpc3Qge1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdMaXN0KHRoaXMuYW5kcm9pZC5nZXRSZW5kZXJpbmdWaWV3cygpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCh2aWV3SUQ6IGRlZi5WaWV3KTogTWVzaCB7XG4gICAgICAgIGNvbnN0IG1lc2ggPSB0aGlzLmFuZHJvaWQuZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjc1R5cGU6IGRlZi5Db29yZGluYXRlU3lzdGVtVHlwZSk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHZhciBtYXQzNCA9IHRoaXMuYW5kcm9pZC5nZXRWaWRlb0JhY2tncm91bmRQcm9qZWN0aW9uTWF0cml4KDxudW1iZXI+dmlld0lELCA8bnVtYmVyPmNzVHlwZSk7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KG1hdDM0KTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Vmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlYzQodGhpcy5hbmRyb2lkLmdldFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxufVxuXG5leHBvcnQgY2xhc3MgVHJhY2tlciB7fVxuXG5jbGFzcyBEYXRhU2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYW5kcm9pZDp2dWZvcmlhLkRhdGFTZXQpe31cbiAgICBjcmVhdGVNdWx0aVRhcmdldChuYW1lOiBzdHJpbmcpOiBNdWx0aVRhcmdldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtdCA9IHRoaXMuYW5kcm9pZC5jcmVhdGVNdWx0aVRhcmdldChuYW1lKTtcbiAgICAgICAgaWYgKG10KSByZXR1cm4gbmV3IE11bHRpVGFyZ2V0KG10KTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVzdHJveSh0cmFja2FibGU6IFRyYWNrYWJsZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmRlc3Ryb3kodHJhY2thYmxlLmFuZHJvaWQpO1xuICAgIH1cbiAgICBleGlzdHMocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZXhpc3RzKHBhdGgsIDxudW1iZXI+c3RvcmFnZVR5cGUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBUcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5hbmRyb2lkLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBoYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuaGFzUmVhY2hlZFRyYWNrYWJsZUxpbWl0KCk7XG4gICAgfVxuICAgIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmlzQWN0aXZlKCk7XG4gICAgfVxuICAgIGxvYWQocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQubG9hZChwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUcmFja2VyIGV4dGVuZHMgVHJhY2tlciB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGFuZHJvaWQ6dnVmb3JpYS5PYmplY3RUcmFja2VyKXsgc3VwZXIoKTsgfVxuICAgIHN0YXJ0KCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5zdGFydCgpO1xuICAgIH1cbiAgICBzdG9wKCkgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLnN0b3AoKTtcbiAgICB9XG4gICAgY3JlYXRlRGF0YVNldCgpIDogRGF0YVNldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBkcyA9IHRoaXMuYW5kcm9pZC5jcmVhdGVEYXRhU2V0KCk7XG4gICAgICAgIGlmIChkcykgcmV0dXJuIG5ldyBEYXRhU2V0KGRzKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cdGRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy5hbmRyb2lkLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQuYW5kcm9pZCk7XG5cdH1cbiAgICBhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmFjdGl2YXRlRGF0YVNldChkYXRhU2V0LmFuZHJvaWQpO1xuICAgIH1cbiAgICBkZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5hbmRyb2lkKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcGkgPSBWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBBUEkoKSA6IHVuZGVmaW5lZDtcbiJdfQ==