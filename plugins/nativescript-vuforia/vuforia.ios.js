"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils = require("utils/utils");
var common = require("./vuforia-common");
var application = require("application");
var placeholder = require("ui/placeholder");
global.moduleMerge(common, exports);
var VUFORIA_AVAILABLE = typeof VuforiaSession !== 'undefined';
var iosVideoView = (VUFORIA_AVAILABLE ? VuforiaVideoView.new() : undefined);
exports.videoView = new placeholder.Placeholder();
exports.videoView.on(placeholder.Placeholder.creatingViewEvent, function (evt) {
    evt.view = iosVideoView;
});
exports.videoView.onLoaded = function () {
    if (VUFORIA_AVAILABLE)
        VuforiaSession.onSurfaceCreated();
};
exports.videoView.onLayout = function (left, top, right, bottom) {
    if (VUFORIA_AVAILABLE)
        configureVuforiaSurface();
};
application.on(application.suspendEvent, function () {
    if (VUFORIA_AVAILABLE) {
        console.log('Pausing Vuforia');
        VuforiaSession.onPause();
        iosVideoView.finishOpenGLESCommands();
        iosVideoView.freeOpenGLESResources();
    }
});
application.on(application.orientationChangedEvent, function () {
    if (VUFORIA_AVAILABLE) {
        Promise.resolve().then(configureVuforiaSurface); // delay until the interface orientation actually changes
    }
    setTimeout(configureVuforiaSurface, 500);
});
application.on(application.resumeEvent, function () {
    if (VUFORIA_AVAILABLE) {
        console.log('Resuming Vuforia');
        VuforiaSession.onResume();
        VuforiaSession.onSurfaceCreated();
        configureVuforiaSurface();
    }
});
function configureVuforiaSurface() {
    if (!exports.api)
        throw new Error();
    var contentScaleFactor = iosVideoView.contentScaleFactor;
    exports.api.onSurfaceChanged(iosVideoView.frame.size.width * contentScaleFactor, iosVideoView.frame.size.height * contentScaleFactor);
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
        return VuforiaSession.setLicenseKey(licenseKey) === 0;
    };
    API.prototype.setHint = function (hint, value) {
        return VuforiaSession.setHintValue(hint, value);
    };
    API.prototype.init = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            VuforiaSession.initDone(function (result) {
                if (result === 100 /* SUCCESS */) {
                    VuforiaSession.onSurfaceCreated();
                    configureVuforiaSurface();
                    setTimeout(configureVuforiaSurface, 500);
                    VuforiaSession.registerCallback(function (state) {
                        if (_this.callback)
                            _this.callback(new State(state));
                    });
                    VuforiaSession.onResume();
                }
                resolve(result);
            });
        });
    };
    API.prototype.deinit = function () {
        VuforiaSession.deinit();
        VuforiaSession.onPause();
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
        if (VuforiaObjectTracker.initTracker()) {
            this.objectTracker = new ObjectTracker();
            return true;
        }
        ;
        return false;
    };
    API.prototype.getObjectTracker = function () {
        return this.objectTracker;
    };
    API.prototype.deinitObjectTracker = function () {
        if (VuforiaObjectTracker.deinitTracker()) {
            this.objectTracker = undefined;
            return true;
        }
        return false;
    };
    API.prototype.setScaleFactor = function (f) {
        VuforiaSession.setScaleFactor && VuforiaSession.setScaleFactor(f);
    };
    API.prototype.getScaleFactor = function () {
        return VuforiaSession.scaleFactor();
    };
    API.prototype.onSurfaceChanged = function (width, height) {
        VuforiaSession.onSurfaceChangedWidthHeight(width, height);
        var orientation = utils.ios.getter(UIApplication, UIApplication.sharedApplication).statusBarOrientation;
        switch (orientation) {
            case 1 /* Portrait */:
                VuforiaSession.setRotation(128 /* IOS_90 */);
                break;
            case 2 /* PortraitUpsideDown */:
                VuforiaSession.setRotation(512 /* IOS_270 */);
                break;
            case 4 /* LandscapeLeft */:
                VuforiaSession.setRotation(256 /* IOS_180 */);
                break;
            case 3 /* LandscapeRight */:
                VuforiaSession.setRotation(1024 /* IOS_0 */);
                break;
            default:
                VuforiaSession.setRotation(128 /* IOS_90 */);
        }
    };
    return API;
}(common.APIBase));
exports.API = API;
function createMatrix44(mat) {
    return [
        mat._0,
        mat._1,
        mat._2,
        mat._3,
        mat._4,
        mat._5,
        mat._6,
        mat._7,
        mat._8,
        mat._9,
        mat._10,
        mat._11,
        mat._12,
        mat._13,
        mat._14,
        mat._15
    ];
}
var Trackable = /** @class */ (function () {
    function Trackable(ios) {
        this.ios = ios;
    }
    Trackable.createTrackable = function (ios) {
        if (ios instanceof VuforiaMarker) {
            return new Marker(ios);
        }
        else if (ios instanceof VuforiaWord) {
            return new Word(ios);
        }
        else if (ios instanceof VuforiaImageTarget) {
            return new ImageTarget(ios);
        }
        else if (ios instanceof VuforiaCylinderTarget) {
            return new CylinderTarget(ios);
        }
        else if (ios instanceof VuforiaObjectTarget) {
            return new ObjectTarget(ios);
        }
        else if (ios instanceof VuforiaTrackable) {
            return new Trackable(ios);
        }
        throw new Error();
    };
    Trackable.prototype.getId = function () {
        return this.ios.getId();
    };
    Trackable.prototype.getName = function () {
        return this.ios.getName();
    };
    Trackable.prototype.isExtendedTrackingStarted = function () {
        return this.ios.isExtendedTrackingStarted();
    };
    Trackable.prototype.startExtendedTracking = function () {
        return this.ios.startExtendedTracking();
    };
    Trackable.prototype.stopExtendedTracking = function () {
        return this.ios.stopExtendedTracking();
    };
    return Trackable;
}());
exports.Trackable = Trackable;
var TrackableResult = /** @class */ (function () {
    function TrackableResult(ios) {
        this.ios = ios;
    }
    TrackableResult.createTrackableResult = function (ios) {
        if (ios instanceof VuforiaMarkerResult) {
            return new MarkerResult(ios);
        }
        else if (ios instanceof VuforiaWordResult) {
            return new WordResult(ios);
        }
        else if (ios instanceof VuforiaImageTargetResult) {
            return new ImageTargetResult(ios);
        }
        else if (ios instanceof VuforiaCylinderTargetResult) {
            return new CylinderTargetResult(ios);
        }
        else if (ios instanceof VuforiaObjectTargetResult) {
            return new ObjectTargetResult(ios);
        }
        else if (ios instanceof VuforiaTrackableResult) {
            return new TrackableResult(ios);
        }
        throw new Error();
    };
    TrackableResult.prototype.getPose = function () {
        return createMatrix44(this.ios.getPose());
    };
    TrackableResult.prototype.getTimeStamp = function () {
        return this.ios.getTimeStamp();
    };
    TrackableResult.prototype.getStatus = function () {
        return this.ios.getStatus();
    };
    TrackableResult.prototype.getTrackable = function () {
        return Trackable.createTrackable(this.ios.getTrackable());
    };
    return TrackableResult;
}());
exports.TrackableResult = TrackableResult;
var Marker = /** @class */ (function (_super) {
    __extends(Marker, _super);
    function Marker(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return Marker;
}(Trackable));
exports.Marker = Marker;
var MarkerResult = /** @class */ (function (_super) {
    __extends(MarkerResult, _super);
    function MarkerResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return MarkerResult;
}(TrackableResult));
exports.MarkerResult = MarkerResult;
var Word = /** @class */ (function (_super) {
    __extends(Word, _super);
    function Word(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return Word;
}(Trackable));
exports.Word = Word;
var WordResult = /** @class */ (function (_super) {
    __extends(WordResult, _super);
    function WordResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return WordResult;
}(TrackableResult));
exports.WordResult = WordResult;
var ObjectTarget = /** @class */ (function (_super) {
    __extends(ObjectTarget, _super);
    function ObjectTarget(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    ObjectTarget.prototype.getUniqueTargetId = function () {
        return this.ios.getUniqueTargetId();
    };
    ObjectTarget.prototype.getSize = function () {
        return this.ios.getSize();
    };
    return ObjectTarget;
}(Trackable));
exports.ObjectTarget = ObjectTarget;
var ObjectTargetResult = /** @class */ (function (_super) {
    __extends(ObjectTargetResult, _super);
    function ObjectTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return ObjectTargetResult;
}(TrackableResult));
exports.ObjectTargetResult = ObjectTargetResult;
var ImageTarget = /** @class */ (function (_super) {
    __extends(ImageTarget, _super);
    function ImageTarget(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return ImageTarget;
}(ObjectTarget));
var ImageTargetResult = /** @class */ (function (_super) {
    __extends(ImageTargetResult, _super);
    function ImageTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return ImageTargetResult;
}(ObjectTargetResult));
var MultiTarget = /** @class */ (function (_super) {
    __extends(MultiTarget, _super);
    function MultiTarget(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return MultiTarget;
}(ObjectTarget));
exports.MultiTarget = MultiTarget;
var MultiTargetResult = /** @class */ (function (_super) {
    __extends(MultiTargetResult, _super);
    function MultiTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return MultiTargetResult;
}(ObjectTargetResult));
exports.MultiTargetResult = MultiTargetResult;
var CylinderTarget = /** @class */ (function (_super) {
    __extends(CylinderTarget, _super);
    function CylinderTarget(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return CylinderTarget;
}(ObjectTarget));
var CylinderTargetResult = /** @class */ (function (_super) {
    __extends(CylinderTargetResult, _super);
    function CylinderTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return CylinderTargetResult;
}(ObjectTargetResult));
var Image = /** @class */ (function () {
    function Image(ios) {
        this.ios = ios;
    }
    Image.prototype.getBufferHeight = function () {
        return this.ios.getBufferHeight();
    };
    Image.prototype.getBufferWidth = function () {
        return this.ios.getBufferWidth();
    };
    Image.prototype.getFormat = function () {
        return this.ios.getFormat();
    };
    Image.prototype.getHeight = function () {
        return this.ios.getHeight();
    };
    Image.prototype.getPixels = function () {
        return this.ios.getPixels();
    };
    Image.prototype.getStride = function () {
        return this.ios.getStride();
    };
    Image.prototype.getWidth = function () {
        return this.ios.getWidth();
    };
    return Image;
}());
exports.Image = Image;
var Frame = /** @class */ (function () {
    function Frame(ios) {
        this.ios = ios;
    }
    Frame.prototype.getImage = function (idx) {
        var img = this.ios.getImage(idx);
        if (img) {
            return new Image(img);
        }
        return undefined;
    };
    Frame.prototype.getIndex = function () {
        return this.ios.getIndex();
    };
    Frame.prototype.getNumImages = function () {
        return this.ios.getNumImages();
    };
    Frame.prototype.getTimeStamp = function () {
        return this.ios.getTimeStamp();
    };
    return Frame;
}());
exports.Frame = Frame;
var State = /** @class */ (function () {
    function State(ios) {
        this.ios = ios;
    }
    State.prototype.getFrame = function () {
        var frame = this.ios.getFrame();
        return new Frame(frame);
    };
    State.prototype.getNumTrackableResults = function () {
        return this.ios.getNumTrackableResults();
    };
    State.prototype.getNumTrackables = function () {
        return this.ios.getNumTrackables();
    };
    State.prototype.getTrackable = function (idx) {
        var trackable = this.ios.getTrackable(idx);
        if (trackable) {
            return Trackable.createTrackable(trackable);
        }
        return undefined;
    };
    State.prototype.getTrackableResult = function (idx) {
        var result = this.ios.getTrackableResult(idx);
        if (result) {
            return TrackableResult.createTrackableResult(result);
        }
        return undefined;
    };
    return State;
}());
exports.State = State;
var CameraCalibration = /** @class */ (function () {
    function CameraCalibration(ios) {
        this.ios = ios;
    }
    CameraCalibration.prototype.getDistortionParameters = function () {
        return this.ios.getDistortionParameters();
    };
    CameraCalibration.prototype.getFieldOfViewRads = function () {
        return this.ios.getFieldOfViewRads();
    };
    CameraCalibration.prototype.getFocalLength = function () {
        return this.ios.getFocalLength();
    };
    CameraCalibration.prototype.getPrincipalPoint = function () {
        return this.ios.getPrincipalPoint();
    };
    CameraCalibration.prototype.getSize = function () {
        return this.ios.getSize();
    };
    return CameraCalibration;
}());
exports.CameraCalibration = CameraCalibration;
var CameraDevice = /** @class */ (function () {
    function CameraDevice() {
    }
    CameraDevice.prototype.init = function (camera) {
        return VuforiaCameraDevice.getInstance().initCamera(camera);
    };
    CameraDevice.prototype.deinit = function () {
        return VuforiaCameraDevice.getInstance().deinitCamera();
    };
    CameraDevice.prototype.getCameraCalibration = function () {
        var calibration = VuforiaCameraDevice.getInstance().getCameraCalibration();
        return new CameraCalibration(calibration);
    };
    CameraDevice.prototype.getCameraDirection = function () {
        return VuforiaCameraDevice.getInstance().getCameraDirection();
    };
    CameraDevice.prototype.getNumVideoModes = function () {
        return VuforiaCameraDevice.getInstance().getNumVideoModes();
    };
    CameraDevice.prototype.getVideoMode = function (nIndex) {
        return VuforiaCameraDevice.getInstance().getVideoMode(nIndex);
    };
    CameraDevice.prototype.selectVideoMode = function (index) {
        return VuforiaCameraDevice.getInstance().selectVideoMode(index);
    };
    CameraDevice.prototype.setFlashTorchMode = function (on) {
        return VuforiaCameraDevice.getInstance().setFlashTorchMode(on);
    };
    CameraDevice.prototype.setFocusMode = function (focusMode) {
        return VuforiaCameraDevice.getInstance().setFocusMode(focusMode);
    };
    CameraDevice.prototype.start = function () {
        return VuforiaCameraDevice.getInstance().start();
    };
    CameraDevice.prototype.stop = function () {
        return VuforiaCameraDevice.getInstance().stop();
    };
    return CameraDevice;
}());
exports.CameraDevice = CameraDevice;
var ViewList = /** @class */ (function () {
    function ViewList(ios) {
        this.ios = ios;
    }
    ViewList.prototype.contains = function (view) {
        return this.ios.contains(view);
    };
    ViewList.prototype.getNumViews = function () {
        return this.ios.getNumViews();
    };
    ViewList.prototype.getView = function (idx) {
        return this.ios.getView(idx);
    };
    return ViewList;
}());
exports.ViewList = ViewList;
var ViewerParameters = /** @class */ (function () {
    function ViewerParameters(ios) {
        this.ios = ios;
    }
    ViewerParameters.prototype.containsMagnet = function () {
        return this.ios.containsMagnet();
    };
    ViewerParameters.prototype.getButtonType = function () {
        return this.ios.getButtonType();
    };
    ViewerParameters.prototype.getDistortionCoefficient = function (idx) {
        return this.ios.getDistortionCoefficient(idx);
    };
    ViewerParameters.prototype.getFieldOfView = function () {
        return this.ios.getFieldOfView();
    };
    ViewerParameters.prototype.getInterLensDistance = function () {
        return this.ios.getInterLensDistance();
    };
    ViewerParameters.prototype.getLensCentreToTrayDistance = function () {
        return this.ios.getLensCentreToTrayDistance();
    };
    ViewerParameters.prototype.getManufacturer = function () {
        return this.ios.getManufacturer();
    };
    ViewerParameters.prototype.getName = function () {
        return this.ios.getName();
    };
    ViewerParameters.prototype.getNumDistortionCoefficients = function () {
        return this.ios.getNumDistortionCoefficients();
    };
    ViewerParameters.prototype.getScreenToLensDistance = function () {
        return this.ios.getScreenToLensDistance();
    };
    ViewerParameters.prototype.getTrayAlignment = function () {
        return this.ios.getTrayAlignment();
    };
    ViewerParameters.prototype.getVersion = function () {
        return this.ios.getVersion();
    };
    return ViewerParameters;
}());
exports.ViewerParameters = ViewerParameters;
var ViewerParametersList = /** @class */ (function () {
    function ViewerParametersList(ios) {
        this.ios = ios;
    }
    ViewerParametersList.prototype.get = function (idx) {
        var vp = this.ios.get(idx);
        if (vp)
            return new ViewerParameters(vp);
        return undefined;
    };
    ViewerParametersList.prototype.getNameManufacturer = function (name, manufacturer) {
        var vp = this.ios.getNameManufacturer(name, manufacturer);
        if (vp)
            return new ViewerParameters(vp);
        return undefined;
    };
    ViewerParametersList.prototype.setSDKFilter = function (filter) {
        this.ios.setSDKFilter(filter);
    };
    ViewerParametersList.prototype.size = function () {
        return this.ios.size();
    };
    return ViewerParametersList;
}());
exports.ViewerParametersList = ViewerParametersList;
var Device = /** @class */ (function () {
    function Device() {
    }
    Device.prototype.setMode = function (mode) {
        return VuforiaDevice.getInstance().setMode(mode);
    };
    Device.prototype.getMode = function () {
        return VuforiaDevice.getInstance().getMode();
    };
    Device.prototype.setViewerActive = function (active) {
        VuforiaDevice.getInstance().setViewerActive(active);
    };
    Device.prototype.isViewerActive = function () {
        return VuforiaDevice.getInstance().isViewerActive();
    };
    Device.prototype.getViewerList = function () {
        var viewerList = VuforiaDevice.getInstance().getViewerList();
        return new ViewerParametersList(viewerList);
    };
    Device.prototype.selectViewer = function (viewer) {
        return VuforiaDevice.getInstance().selectViewer(viewer.ios);
    };
    Device.prototype.getSelectedViewer = function () {
        if (!this.isViewerActive())
            return undefined;
        return new ViewerParameters(VuforiaDevice.getInstance().getSelectedViewer());
    };
    Device.prototype.getRenderingPrimitives = function () {
        return new RenderingPrimitives(VuforiaDevice.getInstance().getRenderingPrimitives());
    };
    return Device;
}());
exports.Device = Device;
var Renderer = /** @class */ (function () {
    function Renderer() {
    }
    Renderer.prototype.getRecommendedFps = function (flags) {
        return VuforiaRenderer.getRecommendedFps(flags);
    };
    Renderer.prototype.getVideoBackgroundConfig = function () {
        return VuforiaRenderer.getVideoBackgroundConfig();
    };
    Renderer.prototype.setTargetFps = function (fps) {
        return VuforiaRenderer.setTargetFps(fps);
    };
    Renderer.prototype.setVideoBackgroundConfig = function (cfg) {
        VuforiaRenderer.setVideoBackgroundConfig(cfg);
    };
    return Renderer;
}());
exports.Renderer = Renderer;
var Mesh = /** @class */ (function () {
    function Mesh(ios) {
        this.ios = ios;
    }
    Mesh.prototype.getNormalCoordinates = function () {
        return this.ios.getNormalCoordinates();
    };
    Mesh.prototype.getNormals = function () {
        return this.ios.getNormals();
    };
    Mesh.prototype.getNumTriangles = function () {
        return this.ios.getNumTriangles();
    };
    Mesh.prototype.getNumVertices = function () {
        return this.ios.getNumVertices();
    };
    Mesh.prototype.getPositionCoordinates = function () {
        return this.ios.getPositionCoordinates();
    };
    Mesh.prototype.getPositions = function () {
        return this.ios.getPositions();
    };
    Mesh.prototype.getTriangles = function () {
        return this.ios.getTriangles();
    };
    Mesh.prototype.getUVCoordinates = function () {
        return this.ios.getUVCoordinates();
    };
    Mesh.prototype.getUVs = function () {
        return this.ios.getUVs();
    };
    Mesh.prototype.hasNormals = function () {
        return this.ios.hasNormals();
    };
    Mesh.prototype.hasPositions = function () {
        return this.ios.hasPositions();
    };
    Mesh.prototype.hasUVs = function () {
        return this.ios.hasUVs();
    };
    return Mesh;
}());
exports.Mesh = Mesh;
var RenderingPrimitives = /** @class */ (function () {
    function RenderingPrimitives(ios) {
        this.ios = ios;
    }
    RenderingPrimitives.prototype.getDistortionTextureMesh = function (viewID) {
        var mesh = this.ios.getDistortionTextureMesh(viewID);
        return new Mesh(mesh);
    };
    RenderingPrimitives.prototype.getDistortionTextureSize = function (viewID) {
        return this.ios.getDistortionTextureSize(viewID);
    };
    RenderingPrimitives.prototype.getDistortionTextureViewport = function (viewID) {
        return this.ios.getDistortionTextureViewport(viewID);
    };
    RenderingPrimitives.prototype.getEyeDisplayAdjustmentMatrix = function (viewID) {
        return createMatrix44(this.ios.getEyeDisplayAdjustmentMatrix(viewID));
    };
    RenderingPrimitives.prototype.getNormalizedViewport = function (viewID) {
        return this.ios.getNormalizedViewport(viewID);
    };
    RenderingPrimitives.prototype.getProjectionMatrix = function (viewID, csType) {
        return createMatrix44(this.ios.getProjectionMatrixCoordinateSystem(viewID, csType));
    };
    RenderingPrimitives.prototype.getRenderingViews = function () {
        return new ViewList(this.ios.getRenderingViews());
    };
    RenderingPrimitives.prototype.getVideoBackgroundMesh = function (viewID) {
        var mesh = this.ios.getVideoBackgroundMesh(viewID);
        return new Mesh(mesh);
    };
    RenderingPrimitives.prototype.getVideoBackgroundProjectionMatrix = function (viewID, csType) {
        return createMatrix44(this.ios.getVideoBackgroundProjectionMatrixCoordinateSystem(viewID, csType));
    };
    RenderingPrimitives.prototype.getViewport = function (viewID) {
        return this.ios.getViewport(viewID);
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
    function DataSet(ios) {
        this.ios = ios;
    }
    DataSet.prototype.createMultiTarget = function (name) {
        var mt = this.ios.createMultiTarget(name);
        if (mt)
            return new MultiTarget(mt);
        return undefined;
    };
    DataSet.prototype.destroy = function (trackable) {
        return this.ios.destroy(trackable.ios);
    };
    DataSet.prototype.exists = function (path, storageType) {
        return this.ios.existsStorageType(path, storageType);
    };
    DataSet.prototype.getNumTrackables = function () {
        return this.ios.getNumTrackables();
    };
    DataSet.prototype.getTrackable = function (idx) {
        var trackable = this.ios.getTrackable(idx);
        if (trackable)
            return Trackable.createTrackable(trackable);
        return undefined;
    };
    DataSet.prototype.hasReachedTrackableLimit = function () {
        return this.ios.hasReachedTrackableLimit();
    };
    DataSet.prototype.isActive = function () {
        return this.ios.isActive();
    };
    DataSet.prototype.load = function (path, storageType) {
        return this.ios.loadStorageType(path, storageType);
    };
    return DataSet;
}());
var ObjectTracker = /** @class */ (function (_super) {
    __extends(ObjectTracker, _super);
    function ObjectTracker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ObjectTracker.prototype.start = function () {
        return VuforiaObjectTracker.getInstance().start();
    };
    ObjectTracker.prototype.stop = function () {
        VuforiaObjectTracker.getInstance().stop();
    };
    ObjectTracker.prototype.createDataSet = function () {
        var ds = VuforiaObjectTracker.getInstance().createDataSet();
        if (ds)
            return new DataSet(ds);
        return undefined;
    };
    ObjectTracker.prototype.destroyDataSet = function (dataSet) {
        return VuforiaObjectTracker.getInstance().destroyDataSet(dataSet.ios);
    };
    ObjectTracker.prototype.activateDataSet = function (dataSet) {
        return VuforiaObjectTracker.getInstance().activateDataSet(dataSet.ios);
    };
    ObjectTracker.prototype.deactivateDataSet = function (dataSet) {
        return VuforiaObjectTracker.getInstance().deactivateDataSet(dataSet.ios);
    };
    return ObjectTracker;
}(Tracker));
exports.ObjectTracker = ObjectTracker;
exports.api = VUFORIA_AVAILABLE ? new API() : undefined;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFxQztBQUVyQyx5Q0FBNEM7QUFFNUMseUNBQTRDO0FBQzVDLDRDQUErQztBQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVwQyxJQUFNLGlCQUFpQixHQUFHLE9BQU8sY0FBYyxLQUFLLFdBQVcsQ0FBQztBQUVoRSxJQUFNLFlBQVksR0FBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXBGLFFBQUEsU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZELGlCQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsVUFBQyxHQUFtQztJQUN4RixHQUFHLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQTtBQUVGLGlCQUFTLENBQUMsUUFBUSxHQUFHO0lBQ2pCLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1FBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUM7QUFDN0QsQ0FBQyxDQUFBO0FBRUQsaUJBQVMsQ0FBQyxRQUFRLEdBQUcsVUFBUyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1FBQUMsdUJBQXVCLEVBQUUsQ0FBQztBQUNyRCxDQUFDLENBQUE7QUFFRCxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUU7SUFDckMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlC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N0UsQ0FBQztJQUNMLG9CQUFDO0FBQUQsQ0FBQyxBQXJCRCxDQUFtQyxPQUFPLEdBcUJ6QztBQXJCWSxzQ0FBYTtBQXVCYixRQUFBLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQgY29tbW9uID0gcmVxdWlyZSgnLi92dWZvcmlhLWNvbW1vbicpO1xuaW1wb3J0IGRlZiA9IHJlcXVpcmUoJ25hdGl2ZXNjcmlwdC12dWZvcmlhJyk7XG5pbXBvcnQgYXBwbGljYXRpb24gPSByZXF1aXJlKCdhcHBsaWNhdGlvbicpO1xuaW1wb3J0IHBsYWNlaG9sZGVyID0gcmVxdWlyZSgndWkvcGxhY2Vob2xkZXInKTtcblxuZ2xvYmFsLm1vZHVsZU1lcmdlKGNvbW1vbiwgZXhwb3J0cyk7XG5cbmNvbnN0IFZVRk9SSUFfQVZBSUxBQkxFID0gdHlwZW9mIFZ1Zm9yaWFTZXNzaW9uwqAhPT0gJ3VuZGVmaW5lZCc7XG5cbmNvbnN0IGlvc1ZpZGVvVmlldyA9IDxWdWZvcmlhVmlkZW9WaWV3PiAoVlVGT1JJQV9BVkFJTEFCTEUgPyBWdWZvcmlhVmlkZW9WaWV3Lm5ldygpIDogdW5kZWZpbmVkKTtcblxuZXhwb3J0IGNvbnN0IHZpZGVvVmlldyA9IG5ldyBwbGFjZWhvbGRlci5QbGFjZWhvbGRlcigpO1xudmlkZW9WaWV3Lm9uKHBsYWNlaG9sZGVyLlBsYWNlaG9sZGVyLmNyZWF0aW5nVmlld0V2ZW50LCAoZXZ0OnBsYWNlaG9sZGVyLkNyZWF0ZVZpZXdFdmVudERhdGEpPT57XG4gICAgZXZ0LnZpZXcgPSBpb3NWaWRlb1ZpZXc7XG59KVxuXG52aWRlb1ZpZXcub25Mb2FkZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbn1cblxudmlkZW9WaWV3Lm9uTGF5b3V0ID0gZnVuY3Rpb24obGVmdCwgdG9wLCByaWdodCwgYm90dG9tKSB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5zdXNwZW5kRXZlbnQsICgpPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUGF1c2luZyBWdWZvcmlhJyk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUGF1c2UoKTtcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZpbmlzaE9wZW5HTEVTQ29tbWFuZHMoKTtcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZyZWVPcGVuR0xFU1Jlc291cmNlcygpO1xuICAgIH1cbn0pXG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKSA9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oY29uZmlndXJlVnVmb3JpYVN1cmZhY2UpOyAvLyBkZWxheSB1bnRpbCB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGFjdHVhbGx5IGNoYW5nZXNcbiAgICB9XG4gICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgNTAwKTtcbn0pO1xuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZXN1bWluZyBWdWZvcmlhJyk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUmVzdW1lKCk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICB9XG59KVxuXG5leHBvcnQgZnVuY3Rpb24gY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKSB7XG4gICAgaWYgKCFhcGkpIHRocm93IG5ldyBFcnJvcigpO1xuICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IGlvc1ZpZGVvVmlldy5jb250ZW50U2NhbGVGYWN0b3I7XG4gICAgYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmFtZS5zaXplLndpZHRoICogY29udGVudFNjYWxlRmFjdG9yLFxuICAgICAgICBpb3NWaWRlb1ZpZXcuZnJhbWUuc2l6ZS5oZWlnaHQgKiBjb250ZW50U2NhbGVGYWN0b3JcbiAgICApO1xufVxuXG5leHBvcnQgY2xhc3MgQVBJIGV4dGVuZHMgY29tbW9uLkFQSUJhc2Uge1xuICAgIFxuICAgIHByaXZhdGUgY2FtZXJhRGV2aWNlID0gbmV3IENhbWVyYURldmljZSgpO1xuICAgIHByaXZhdGUgZGV2aWNlID0gbmV3IERldmljZSgpO1xuICAgIHByaXZhdGUgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIoKTtcbiAgICBcbiAgICBwcml2YXRlIG9iamVjdFRyYWNrZXI6T2JqZWN0VHJhY2tlcnx1bmRlZmluZWQ7XG4gICAgXG4gICAgc2V0TGljZW5zZUtleShsaWNlbnNlS2V5OnN0cmluZykgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnNldExpY2Vuc2VLZXkobGljZW5zZUtleSkgPT09IDA7XG4gICAgfVxuICAgIFxuICAgIHNldEhpbnQoaGludDpkZWYuSGludCx2YWx1ZTpudW1iZXIpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU2Vzc2lvbi5zZXRIaW50VmFsdWUoPG51bWJlcj5oaW50LCB2YWx1ZSk7XG4gICAgfVxuICAgIFxuICAgIGluaXQoKSA6IFByb21pc2U8ZGVmLkluaXRSZXN1bHQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5pbml0RG9uZSgocmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IFZ1Zm9yaWFJbml0UmVzdWx0LlNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDApO1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5yZWdpc3RlckNhbGxiYWNrKChzdGF0ZSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sobmV3IFN0YXRlKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblJlc3VtZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKDxkZWYuSW5pdFJlc3VsdD48bnVtYmVyPnJlc3VsdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5kZWluaXQoKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25QYXVzZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEZXZpY2UoKSA6IENhbWVyYURldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbWVyYURldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGV2aWNlKCkgOiBEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldFJlbmRlcmVyKCkgOiBSZW5kZXJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyO1xuICAgIH1cbiAgICBcbiAgICBpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhT2JqZWN0VHJhY2tlci5pbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSBuZXcgT2JqZWN0VHJhY2tlcigpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0T2JqZWN0VHJhY2tlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0VHJhY2tlcjtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhT2JqZWN0VHJhY2tlci5kZWluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRTY2FsZUZhY3RvcihmOm51bWJlcikge1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRTY2FsZUZhY3RvciAmJiBWdWZvcmlhU2Vzc2lvbi5zZXRTY2FsZUZhY3RvcihmKTtcbiAgICB9XG5cbiAgICBnZXRTY2FsZUZhY3RvcigpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnNjYWxlRmFjdG9yKCk7XG4gICAgfVxuXG4gICAgb25TdXJmYWNlQ2hhbmdlZCh3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIpIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNoYW5nZWRXaWR0aEhlaWdodCh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgY29uc3Qgb3JpZW50YXRpb246VUlJbnRlcmZhY2VPcmllbnRhdGlvbiA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikuc3RhdHVzQmFyT3JpZW50YXRpb247XG4gICAgICAgIHN3aXRjaCAob3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXRVcHNpZGVEb3duOiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzI3MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlTGVmdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18xODApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLkxhbmRzY2FwZVJpZ2h0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hdHJpeDQ0KG1hdDpWdWZvcmlhTWF0cml4NDQpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgICAgICAgICBtYXQuXzAsIFxuICAgICAgICAgICAgICAgIG1hdC5fMSxcbiAgICAgICAgICAgICAgICBtYXQuXzIsXG4gICAgICAgICAgICAgICAgbWF0Ll8zLFxuICAgICAgICAgICAgICAgIG1hdC5fNCxcbiAgICAgICAgICAgICAgICBtYXQuXzUsXG4gICAgICAgICAgICAgICAgbWF0Ll82LFxuICAgICAgICAgICAgICAgIG1hdC5fNyxcbiAgICAgICAgICAgICAgICBtYXQuXzgsXG4gICAgICAgICAgICAgICAgbWF0Ll85LFxuICAgICAgICAgICAgICAgIG1hdC5fMTAsXG4gICAgICAgICAgICAgICAgbWF0Ll8xMSxcbiAgICAgICAgICAgICAgICBtYXQuXzEyLFxuICAgICAgICAgICAgICAgIG1hdC5fMTMsXG4gICAgICAgICAgICAgICAgbWF0Ll8xNCxcbiAgICAgICAgICAgICAgICBtYXQuXzE1XG4gICAgICAgICAgICBdO1xufVxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlIHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlKGlvczpWdWZvcmlhVHJhY2thYmxlKSB7XG4gICAgICAgIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhTWFya2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcmtlcihpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYVdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgV29yZChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUltYWdlVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhQ3lsaW5kZXJUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFPYmplY3RUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYVRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGUoaW9zKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVHJhY2thYmxlKSB7fVxuICAgIFxuICAgIGdldElkKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRJZCgpO1xuICAgIH1cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROYW1lKCk7XG4gICAgfVxuICAgIGlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5pc0V4dGVuZGVkVHJhY2tpbmdTdGFydGVkKCk7XG4gICAgfVxuICAgIHN0YXJ0RXh0ZW5kZWRUcmFja2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLnN0YXJ0RXh0ZW5kZWRUcmFja2luZygpO1xuICAgIH1cbiAgICBzdG9wRXh0ZW5kZWRUcmFja2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLnN0b3BFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlUmVzdWx0IHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlUmVzdWx0KGlvczpWdWZvcmlhVHJhY2thYmxlUmVzdWx0KSB7XG4gICAgICAgIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhTWFya2VyUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcmtlclJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYVdvcmRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgV29yZFJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUltYWdlVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0UmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXRSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFPYmplY3RUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0UmVzdWx0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYVRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGVSZXN1bHQoaW9zKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVHJhY2thYmxlUmVzdWx0KSB7fVxuICAgIFxuICAgIGdldFBvc2UoKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZU1hdHJpeDQ0KHRoaXMuaW9zLmdldFBvc2UoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFRpbWVTdGFtcCgpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdGF0dXMoKTogZGVmLlRyYWNrYWJsZVJlc3VsdFN0YXR1cyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFN0YXR1cygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmFja2FibGUoKTogVHJhY2thYmxlIHtcbiAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodGhpcy5pb3MuZ2V0VHJhY2thYmxlKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hcmtlciBleHRlbmRzIFRyYWNrYWJsZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhTWFya2VyKSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE1hcmtlclJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhTWFya2VyUmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIFdvcmQgZXh0ZW5kcyBUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVdvcmQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgV29yZFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVdvcmRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VGFyZ2V0IGV4dGVuZHMgVHJhY2thYmxlIHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0KSB7c3VwZXIoaW9zKX1cbiAgICBcbiAgICBnZXRVbmlxdWVUYXJnZXRJZCgpIDogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFVuaXF1ZVRhcmdldElkKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFNpemUoKTogZGVmLlZlYzMge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U2l6ZSgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU9iamVjdFRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSW1hZ2VUYXJnZXQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBJbWFnZVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUltYWdlVGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFNdWx0aVRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBNdWx0aVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU9iamVjdFRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQ3lsaW5kZXJUYXJnZXQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBDeWxpbmRlclRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIEltYWdlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFJbWFnZSkge31cbiAgICBcbiAgICBnZXRCdWZmZXJIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEJ1ZmZlckhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRCdWZmZXJXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEJ1ZmZlcldpZHRoKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZvcm1hdCgpOiBkZWYuUGl4ZWxGb3JtYXQgeyBcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0Rm9ybWF0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEhlaWdodCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQaXhlbHMoKTogaW50ZXJvcC5Qb2ludGVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQaXhlbHMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U3RyaWRlKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U3RyaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFdpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0V2lkdGgoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGcmFtZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhRnJhbWUpIHt9XG4gICAgZ2V0SW1hZ2UoaWR4OiBudW1iZXIpOiBJbWFnZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBpbWcgPSB0aGlzLmlvcy5nZXRJbWFnZShpZHgpO1xuICAgICAgICBpZiAoaW1nKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlKGltZyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0SW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEluZGV4KCk7XG4gICAgfVxuICAgIGdldE51bUltYWdlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtSW1hZ2VzKCk7XG4gICAgfVxuICAgIGdldFRpbWVTdGFtcCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VGltZVN0YW1wKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RhdGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVN0YXRlKSB7fVxuICAgIGdldEZyYW1lKCk6IEZyYW1lIHtcbiAgICAgICAgY29uc3QgZnJhbWUgPSB0aGlzLmlvcy5nZXRGcmFtZSgpO1xuICAgICAgICByZXR1cm4gbmV3IEZyYW1lKGZyYW1lKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmFja2FibGVzKCk7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZShpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5pb3MuZ2V0VHJhY2thYmxlKGlkeCk7XG4gICAgICAgIGlmICh0cmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlUmVzdWx0KGlkeDogbnVtYmVyKTogZGVmLlRyYWNrYWJsZVJlc3VsdHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmlvcy5nZXRUcmFja2FibGVSZXN1bHQoaWR4KTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZVJlc3VsdC5jcmVhdGVUcmFja2FibGVSZXN1bHQocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFDYW1lcmFDYWxpYnJhdGlvbikge31cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uUGFyYW1ldGVycygpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uUGFyYW1ldGVycygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGaWVsZE9mVmlld1JhZHMoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RmllbGRPZlZpZXdSYWRzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZvY2FsTGVuZ3RoKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEZvY2FsTGVuZ3RoKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFByaW5jaXBhbFBvaW50KCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFByaW5jaXBhbFBvaW50KCk7XG4gICAgfVxuICAgIFxuICAgIGdldFNpemUoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U2l6ZSgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYURldmljZSB7XG4gICAgaW5pdChjYW1lcmE6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5pbml0Q2FtZXJhKDxudW1iZXI+Y2FtZXJhKTtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmRlaW5pdENhbWVyYSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFDYWxpYnJhdGlvbigpOiBDYW1lcmFDYWxpYnJhdGlvbiB7XG4gICAgICAgIGNvbnN0IGNhbGlicmF0aW9uID0gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgICAgIHJldHVybiBuZXcgQ2FtZXJhQ2FsaWJyYXRpb24oY2FsaWJyYXRpb24pO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEaXJlY3Rpb24oKTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbiB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPlZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRDYW1lcmFEaXJlY3Rpb24oKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0TnVtVmlkZW9Nb2RlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldE51bVZpZGVvTW9kZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9Nb2RlKG5JbmRleDogbnVtYmVyKTogZGVmLlZpZGVvTW9kZSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0VmlkZW9Nb2RlKG5JbmRleCk7XG4gICAgfVxuICAgIFxuICAgIHNlbGVjdFZpZGVvTW9kZShpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0VmlkZW9Nb2RlKGluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rmxhc2hUb3JjaE1vZGUob246IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGbGFzaFRvcmNoTW9kZShvbik7XG4gICAgfVxuICAgIFxuICAgIHNldEZvY3VzTW9kZShmb2N1c01vZGU6IGRlZi5DYW1lcmFEZXZpY2VGb2N1c01vZGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGb2N1c01vZGUoPG51bWJlcj5mb2N1c01vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzdGFydCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zdGFydCgpO1xuICAgIH1cbiAgICBcbiAgICBzdG9wKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3TGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVmlld0xpc3QpIHt9XG4gICAgY29udGFpbnModmlldzogZGVmLlZpZXcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmNvbnRhaW5zKDxudW1iZXI+dmlldyk7XG4gICAgfVxuICAgIGdldE51bVZpZXdzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1WaWV3cygpO1xuICAgIH1cbiAgICBnZXRWaWV3KGlkeDogbnVtYmVyKTogZGVmLlZpZXcge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRWaWV3KGlkeCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld2VyUGFyYW1ldGVycyB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVmlld2VyUGFyYW1ldGVycykge31cbiAgICBjb250YWluc01hZ25ldCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmNvbnRhaW5zTWFnbmV0KCk7XG4gICAgfVxuICAgIGdldEJ1dHRvblR5cGUoKTogZGVmLlZpZXdlclBhcmFtdGVyc0J1dHRvblR5cGUge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRCdXR0b25UeXBlKCk7XG4gICAgfVxuICAgIGdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHg6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uQ29lZmZpY2llbnQoaWR4KTtcbiAgICB9XG4gICAgZ2V0RmllbGRPZlZpZXcoKTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RmllbGRPZlZpZXcoKTtcbiAgICB9XG4gICAgZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEludGVyTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldE1hbnVmYWN0dXJlcigpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TWFudWZhY3R1cmVyKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5hbWUoKTtcbiAgICB9XG4gICAgZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpO1xuICAgIH1cbiAgICBnZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U2NyZWVuVG9MZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0VHJheUFsaWdubWVudCgpOiBkZWYuVmlld2VyUGFyYW10ZXJzVHJheUFsaWdubWVudCB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFRyYXlBbGlnbm1lbnQoKTtcbiAgICB9XG4gICAgZ2V0VmVyc2lvbigpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VmVyc2lvbigpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3ZXJQYXJhbWV0ZXJzTGlzdCkge31cbiAgICBnZXQoaWR4OiBudW1iZXIpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5pb3MuZ2V0KGlkeCk7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0TmFtZU1hbnVmYWN0dXJlcihuYW1lOiBzdHJpbmcsIG1hbnVmYWN0dXJlcjogc3RyaW5nKTogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB2cCA9IHRoaXMuaW9zLmdldE5hbWVNYW51ZmFjdHVyZXIobmFtZSwgbWFudWZhY3R1cmVyKTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBzZXRTREtGaWx0ZXIoZmlsdGVyOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5pb3Muc2V0U0RLRmlsdGVyKGZpbHRlcik7XG4gICAgfVxuICAgIHNpemUoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLnNpemUoKTtcbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIERldmljZSB7XG4gICAgc2V0TW9kZShtb2RlOmRlZi5EZXZpY2VNb2RlKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLnNldE1vZGUoPG51bWJlcj5tb2RlKTtcbiAgICB9XG4gICAgZ2V0TW9kZSgpIDogZGVmLkRldmljZU1vZGUge1xuICAgICAgICByZXR1cm4gPG51bWJlcj5WdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TW9kZSgpO1xuICAgIH1cbiAgICBzZXRWaWV3ZXJBY3RpdmUoYWN0aXZlOmJvb2xlYW4pIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRWaWV3ZXJBY3RpdmUoYWN0aXZlKTtcbiAgICB9XG4gICAgaXNWaWV3ZXJBY3RpdmUoKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuICAgIGdldFZpZXdlckxpc3QoKSA6IFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICAgICAgY29uc3Qgdmlld2VyTGlzdCA9IFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRWaWV3ZXJMaXN0KCk7XG4gICAgICAgIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVyc0xpc3Qodmlld2VyTGlzdCk7XG4gICAgfVxuICAgIHNlbGVjdFZpZXdlcih2aWV3ZXI6Vmlld2VyUGFyYW1ldGVycykge1xuICAgICAgICByZXR1cm4gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZXdlcih2aWV3ZXIuaW9zKTtcbiAgICB9XG4gICAgZ2V0U2VsZWN0ZWRWaWV3ZXIoKSA6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzVmlld2VyQWN0aXZlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyhWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0U2VsZWN0ZWRWaWV3ZXIoKSk7XG4gICAgfVxuICAgIGdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKTogUmVuZGVyaW5nUHJpbWl0aXZlcyB7XG4gICAgICAgIHJldHVybiBuZXcgUmVuZGVyaW5nUHJpbWl0aXZlcyhWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJlciB7XG4gICAgZ2V0UmVjb21tZW5kZWRGcHMoZmxhZ3M6IGRlZi5GUFNIaW50KTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFSZW5kZXJlci5nZXRSZWNvbW1lbmRlZEZwcyg8bnVtYmVyPmZsYWdzKTtcbiAgICB9XG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCkgOiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFSZW5kZXJlci5nZXRWaWRlb0JhY2tncm91bmRDb25maWcoKTtcbiAgICB9XG4gICAgc2V0VGFyZ2V0RnBzKGZwczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUmVuZGVyZXIuc2V0VGFyZ2V0RnBzKGZwcyk7XG4gICAgfVxuICAgIHNldFZpZGVvQmFja2dyb3VuZENvbmZpZyhjZmc6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcpOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVJlbmRlcmVyLnNldFZpZGVvQmFja2dyb3VuZENvbmZpZyg8VnVmb3JpYVZpZGVvQmFja2dyb3VuZENvbmZpZz5jZmcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1lc2gge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU1lc2gpIHt9XG4gICAgXG4gICAgZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROb3JtYWxDb29yZGluYXRlcygpO1xuICAgIH1cbiAgICBnZXROb3JtYWxzKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROb3JtYWxzKCk7XG4gICAgfVxuICAgIGdldE51bVRyaWFuZ2xlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJpYW5nbGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZlcnRpY2VzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1WZXJ0aWNlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQb3NpdGlvbkNvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UG9zaXRpb25Db29yZGluYXRlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQb3NpdGlvbnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBvc2l0aW9ucygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmlhbmdsZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRUcmlhbmdsZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VVZDb29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFVWQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VVZzKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRVVnMoKTtcbiAgICB9XG4gICAgXG4gICAgaGFzTm9ybWFscygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc05vcm1hbHMoKTtcbiAgICB9XG4gICAgXG4gICAgaGFzUG9zaXRpb25zKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaGFzUG9zaXRpb25zKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc1VWcygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc1VWcygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVJlbmRlcmluZ1ByaW1pdGl2ZXMpe31cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZU1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNZXNoKG1lc2gpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVNpemUodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25UZXh0dXJlU2l6ZSg8bnVtYmVyPnZpZXdJRCk7XG4gICAgfVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlVmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25UZXh0dXJlVmlld3BvcnQoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZU1hdHJpeDQ0KHRoaXMuaW9zLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldE5vcm1hbGl6ZWRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjc1R5cGU6IGRlZi5Db29yZGluYXRlU3lzdGVtVHlwZSk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVNYXRyaXg0NCh0aGlzLmlvcy5nZXRQcm9qZWN0aW9uTWF0cml4Q29vcmRpbmF0ZVN5c3RlbSg8bnVtYmVyPnZpZXdJRCwgPG51bWJlcj5jc1R5cGUpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyaW5nVmlld3MoKTogVmlld0xpc3Qge1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdMaXN0KHRoaXMuaW9zLmdldFJlbmRlcmluZ1ZpZXdzKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb0JhY2tncm91bmRNZXNoKHZpZXdJRDogZGVmLlZpZXcpOiBNZXNoIHtcbiAgICAgICAgY29uc3QgbWVzaCA9IHRoaXMuaW9zLmdldFZpZGVvQmFja2dyb3VuZE1lc2goPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gbmV3IE1lc2gobWVzaCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZFByb2plY3Rpb25NYXRyaXgodmlld0lEOiBkZWYuVmlldywgY3NUeXBlOiBkZWYuQ29vcmRpbmF0ZVN5c3RlbVR5cGUpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICByZXR1cm4gY3JlYXRlTWF0cml4NDQodGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeENvb3JkaW5hdGVTeXN0ZW0oPG51bWJlcj52aWV3SUQsIDxudW1iZXI+Y3NUeXBlKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgfVxuICAgIFxufVxuXG5leHBvcnQgY2xhc3MgVHJhY2tlciB7fVxuXG5jbGFzcyBEYXRhU2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFEYXRhU2V0KXt9XG4gICAgY3JlYXRlTXVsdGlUYXJnZXQobmFtZTogc3RyaW5nKTogTXVsdGlUYXJnZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgbXQgPSB0aGlzLmlvcy5jcmVhdGVNdWx0aVRhcmdldChuYW1lKTtcbiAgICAgICAgaWYgKG10KSByZXR1cm4gbmV3IE11bHRpVGFyZ2V0KG10KTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVzdHJveSh0cmFja2FibGU6IFRyYWNrYWJsZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZGVzdHJveSh0cmFja2FibGUuaW9zKTtcbiAgICB9XG4gICAgZXhpc3RzKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZXhpc3RzU3RvcmFnZVR5cGUocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBoYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTtcbiAgICB9XG4gICAgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5pc0FjdGl2ZSgpO1xuICAgIH1cbiAgICBsb2FkKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MubG9hZFN0b3JhZ2VUeXBlKHBhdGgsIDxudW1iZXI+c3RvcmFnZVR5cGUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRyYWNrZXIgZXh0ZW5kcyBUcmFja2VyIHtcbiAgICBzdGFydCgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIHN0b3AoKSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG4gICAgY3JlYXRlRGF0YVNldCgpIDogRGF0YVNldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBkcyA9IFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICBpZiAoZHMpIHJldHVybiBuZXcgRGF0YVNldChkcyk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXHRkZXN0cm95RGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuZGVzdHJveURhdGFTZXQoZGF0YVNldC5pb3MpO1xuXHR9XG4gICAgYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuaW9zKTtcbiAgICB9XG4gICAgZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0Lmlvcyk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgYXBpID0gVlVGT1JJQV9BVkFJTEFCTEUgPyBuZXcgQVBJKCkgOiB1bmRlZmluZWQ7XG4iXX0=