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
var Trackable = (function () {
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
var TrackableResult = (function () {
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
var Marker = (function (_super) {
    __extends(Marker, _super);
    function Marker(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return Marker;
}(Trackable));
exports.Marker = Marker;
var MarkerResult = (function (_super) {
    __extends(MarkerResult, _super);
    function MarkerResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return MarkerResult;
}(TrackableResult));
exports.MarkerResult = MarkerResult;
var Word = (function (_super) {
    __extends(Word, _super);
    function Word(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return Word;
}(Trackable));
exports.Word = Word;
var WordResult = (function (_super) {
    __extends(WordResult, _super);
    function WordResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return WordResult;
}(TrackableResult));
exports.WordResult = WordResult;
var ObjectTarget = (function (_super) {
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
var ObjectTargetResult = (function (_super) {
    __extends(ObjectTargetResult, _super);
    function ObjectTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return ObjectTargetResult;
}(TrackableResult));
exports.ObjectTargetResult = ObjectTargetResult;
var ImageTarget = (function (_super) {
    __extends(ImageTarget, _super);
    function ImageTarget(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return ImageTarget;
}(ObjectTarget));
var ImageTargetResult = (function (_super) {
    __extends(ImageTargetResult, _super);
    function ImageTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return ImageTargetResult;
}(ObjectTargetResult));
var MultiTarget = (function (_super) {
    __extends(MultiTarget, _super);
    function MultiTarget(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return MultiTarget;
}(ObjectTarget));
exports.MultiTarget = MultiTarget;
var MultiTargetResult = (function (_super) {
    __extends(MultiTargetResult, _super);
    function MultiTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return MultiTargetResult;
}(ObjectTargetResult));
exports.MultiTargetResult = MultiTargetResult;
var CylinderTarget = (function (_super) {
    __extends(CylinderTarget, _super);
    function CylinderTarget(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return CylinderTarget;
}(ObjectTarget));
var CylinderTargetResult = (function (_super) {
    __extends(CylinderTargetResult, _super);
    function CylinderTargetResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return CylinderTargetResult;
}(ObjectTargetResult));
var Image = (function () {
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
var Frame = (function () {
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
var State = (function () {
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
var CameraCalibration = (function () {
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
var CameraDevice = (function () {
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
var ViewList = (function () {
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
var ViewerParameters = (function () {
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
var ViewerParametersList = (function () {
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
var Device = (function () {
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
var Renderer = (function () {
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
var Mesh = (function () {
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
var RenderingPrimitives = (function () {
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
var Tracker = (function () {
    function Tracker() {
    }
    return Tracker;
}());
exports.Tracker = Tracker;
var DataSet = (function () {
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
var ObjectTracker = (function (_super) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFxQztBQUVyQyx5Q0FBNEM7QUFFNUMseUNBQTRDO0FBQzVDLDRDQUErQztBQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVwQyxJQUFNLGlCQUFpQixHQUFHLE9BQU8sY0FBYyxLQUFLLFdBQVcsQ0FBQztBQUVoRSxJQUFNLFlBQVksR0FBc0IsQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztBQUVwRixRQUFBLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN2RCxpQkFBUyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLFVBQUMsR0FBbUM7SUFDeEYsR0FBRyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUE7QUFFRixpQkFBUyxDQUFDLFFBQVEsR0FBRztJQUNqQixFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztRQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0FBQzdELENBQUMsQ0FBQTtBQUVELGlCQUFTLENBQUMsUUFBUSxHQUFHLFVBQVMsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTTtJQUNsRCxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztRQUFDLHVCQUF1QixFQUFFLENBQUM7QUFDckQsQ0FBQyxDQUFBO0FBRUQsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFO0lBQ3JDLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDL0IsY0FB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QUFELENBQUMsQUFyQkQsQ0FBbUMsT0FBTyxHQXFCekM7QUFyQlksc0NBQWE7QUF1QmIsUUFBQSxHQUFHLEdBQUcsaUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCBjb21tb24gPSByZXF1aXJlKCcuL3Z1Zm9yaWEtY29tbW9uJyk7XG5pbXBvcnQgZGVmID0gcmVxdWlyZSgnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnKTtcbmltcG9ydCBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJ2FwcGxpY2F0aW9uJyk7XG5pbXBvcnQgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCd1aS9wbGFjZWhvbGRlcicpO1xuXG5nbG9iYWwubW9kdWxlTWVyZ2UoY29tbW9uLCBleHBvcnRzKTtcblxuY29uc3QgVlVGT1JJQV9BVkFJTEFCTEUgPSB0eXBlb2YgVnVmb3JpYVNlc3Npb27CoCE9PSAndW5kZWZpbmVkJztcblxuY29uc3QgaW9zVmlkZW9WaWV3ID0gPFZ1Zm9yaWFWaWRlb1ZpZXc+IChWVUZPUklBX0FWQUlMQUJMRSA/IFZ1Zm9yaWFWaWRlb1ZpZXcubmV3KCkgOiB1bmRlZmluZWQpO1xuXG5leHBvcnQgY29uc3QgdmlkZW9WaWV3ID0gbmV3IHBsYWNlaG9sZGVyLlBsYWNlaG9sZGVyKCk7XG52aWRlb1ZpZXcub24ocGxhY2Vob2xkZXIuUGxhY2Vob2xkZXIuY3JlYXRpbmdWaWV3RXZlbnQsIChldnQ6cGxhY2Vob2xkZXIuQ3JlYXRlVmlld0V2ZW50RGF0YSk9PntcbiAgICBldnQudmlldyA9IGlvc1ZpZGVvVmlldztcbn0pXG5cbnZpZGVvVmlldy5vbkxvYWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xufVxuXG52aWRlb1ZpZXcub25MYXlvdXQgPSBmdW5jdGlvbihsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20pIHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG59XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnN1c3BlbmRFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQYXVzaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25QYXVzZSgpO1xuICAgICAgICBpb3NWaWRlb1ZpZXcuZmluaXNoT3BlbkdMRVNDb21tYW5kcygpO1xuICAgICAgICBpb3NWaWRlb1ZpZXcuZnJlZU9wZW5HTEVTUmVzb3VyY2VzKCk7XG4gICAgfVxufSlcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpID0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihjb25maWd1cmVWdWZvcmlhU3VyZmFjZSk7IC8vIGRlbGF5IHVudGlsIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuICAgIH1cbiAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDApO1xufSk7XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnJlc3VtZUV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Jlc3VtaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25SZXN1bWUoKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgIH1cbn0pXG5cbmV4cG9ydCBmdW5jdGlvbiBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpIHtcbiAgICBpZiAoIWFwaSkgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gaW9zVmlkZW9WaWV3LmNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICBhcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZyYW1lLnNpemUud2lkdGggKiBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmFtZS5zaXplLmhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICk7XG59XG5cbmV4cG9ydCBjbGFzcyBBUEkgZXh0ZW5kcyBjb21tb24uQVBJQmFzZSB7XG4gICAgXG4gICAgcHJpdmF0ZSBjYW1lcmFEZXZpY2UgPSBuZXcgQ2FtZXJhRGV2aWNlKCk7XG4gICAgcHJpdmF0ZSBkZXZpY2UgPSBuZXcgRGV2aWNlKCk7XG4gICAgcHJpdmF0ZSByZW5kZXJlciA9IG5ldyBSZW5kZXJlcigpO1xuICAgIFxuICAgIHByaXZhdGUgb2JqZWN0VHJhY2tlcjpPYmplY3RUcmFja2VyfHVuZGVmaW5lZDtcbiAgICBcbiAgICBzZXRMaWNlbnNlS2V5KGxpY2Vuc2VLZXk6c3RyaW5nKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2V0TGljZW5zZUtleShsaWNlbnNlS2V5KSA9PT0gMDtcbiAgICB9XG4gICAgXG4gICAgc2V0SGludChoaW50OmRlZi5IaW50LHZhbHVlOm51bWJlcikgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnNldEhpbnRWYWx1ZSg8bnVtYmVyPmhpbnQsIHZhbHVlKTtcbiAgICB9XG4gICAgXG4gICAgaW5pdCgpIDogUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8ZGVmLkluaXRSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLmluaXREb25lKChyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gVnVmb3JpYUluaXRSZXN1bHQuU1VDQ0VTUykge1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnJlZ2lzdGVyQ2FsbGJhY2soKHN0YXRlKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhuZXcgU3RhdGUoc3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoPGRlZi5Jbml0UmVzdWx0PjxudW1iZXI+cmVzdWx0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLmRlaW5pdCgpO1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblBhdXNlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURldmljZSgpIDogQ2FtZXJhRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FtZXJhRGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXREZXZpY2UoKSA6IERldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyZXIoKSA6IFJlbmRlcmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyZXI7XG4gICAgfVxuICAgIFxuICAgIGluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFPYmplY3RUcmFja2VyLmluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IG5ldyBPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBnZXRPYmplY3RUcmFja2VyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vYmplY3RUcmFja2VyO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFPYmplY3RUcmFja2VyLmRlaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHNldFNjYWxlRmFjdG9yKGY6bnVtYmVyKSB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yICYmIFZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yKGYpO1xuICAgIH1cblxuICAgIGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2NhbGVGYWN0b3IoKTtcbiAgICB9XG5cbiAgICBvblN1cmZhY2VDaGFuZ2VkKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ2hhbmdlZFdpZHRoSGVpZ2h0KHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbjpVSUludGVyZmFjZU9yaWVudGF0aW9uID0gdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5zdGF0dXNCYXJPcmllbnRhdGlvbjtcbiAgICAgICAgc3dpdGNoIChvcmllbnRhdGlvbikge1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdFVwc2lkZURvd246IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMjcwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVMZWZ0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzE4MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlUmlnaHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTWF0cml4NDQobWF0OlZ1Zm9yaWFNYXRyaXg0NCkgOiBkZWYuTWF0cml4NDQge1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIG1hdC5fMCwgXG4gICAgICAgICAgICAgICAgbWF0Ll8xLFxuICAgICAgICAgICAgICAgIG1hdC5fMixcbiAgICAgICAgICAgICAgICBtYXQuXzMsXG4gICAgICAgICAgICAgICAgbWF0Ll80LFxuICAgICAgICAgICAgICAgIG1hdC5fNSxcbiAgICAgICAgICAgICAgICBtYXQuXzYsXG4gICAgICAgICAgICAgICAgbWF0Ll83LFxuICAgICAgICAgICAgICAgIG1hdC5fOCxcbiAgICAgICAgICAgICAgICBtYXQuXzksXG4gICAgICAgICAgICAgICAgbWF0Ll8xMCxcbiAgICAgICAgICAgICAgICBtYXQuXzExLFxuICAgICAgICAgICAgICAgIG1hdC5fMTIsXG4gICAgICAgICAgICAgICAgbWF0Ll8xMyxcbiAgICAgICAgICAgICAgICBtYXQuXzE0LFxuICAgICAgICAgICAgICAgIG1hdC5fMTVcbiAgICAgICAgICAgIF07XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGUge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGUoaW9zOlZ1Zm9yaWFUcmFja2FibGUpIHtcbiAgICAgICAgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFNYXJrZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFya2VyKGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkKGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhSW1hZ2VUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2VUYXJnZXQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFDeWxpbmRlclRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDeWxpbmRlclRhcmdldChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYU9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhVHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZShpb3MpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFUcmFja2FibGUpIHt9XG4gICAgXG4gICAgZ2V0SWQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldElkKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5hbWUoKTtcbiAgICB9XG4gICAgaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTtcbiAgICB9XG4gICAgc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxuICAgIHN0b3BFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGVSZXN1bHQge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGVSZXN1bHQoaW9zOlZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFNYXJrZXJSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFya2VyUmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhV29yZFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkUmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhSW1hZ2VUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2VUYXJnZXRSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFDeWxpbmRlclRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDeWxpbmRlclRhcmdldFJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYU9iamVjdFRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXRSZXN1bHQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhVHJhY2thYmxlUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZVJlc3VsdChpb3MpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHt9XG4gICAgXG4gICAgZ2V0UG9zZSgpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICByZXR1cm4gY3JlYXRlTWF0cml4NDQodGhpcy5pb3MuZ2V0UG9zZSgpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VGltZVN0YW1wKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VGltZVN0YW1wKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFN0YXR1cygpOiBkZWYuVHJhY2thYmxlUmVzdWx0U3RhdHVzIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0U3RhdHVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFRyYWNrYWJsZSgpOiBUcmFja2FibGUge1xuICAgICAgICByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0aGlzLmlvcy5nZXRUcmFja2FibGUoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWFya2VyIGV4dGVuZHMgVHJhY2thYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFNYXJrZXIpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgTWFya2VyUmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFNYXJrZXJSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgV29yZCBleHRlbmRzIFRyYWNrYWJsZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhV29yZCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBXb3JkUmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhV29yZFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUYXJnZXQgZXh0ZW5kcyBUcmFja2FibGUgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFPYmplY3RUYXJnZXQpIHtzdXBlcihpb3MpfVxuICAgIFxuICAgIGdldFVuaXF1ZVRhcmdldElkKCkgOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTaXplKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VGFyZ2V0UmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgSW1hZ2VUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFJbWFnZVRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSW1hZ2VUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU11bHRpVGFyZ2V0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgQ3lsaW5kZXJUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFDeWxpbmRlclRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hZ2Uge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUltYWdlKSB7fVxuICAgIFxuICAgIGdldEJ1ZmZlckhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0QnVmZmVySGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEJ1ZmZlcldpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0QnVmZmVyV2lkdGgoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9ybWF0KCk6IGRlZi5QaXhlbEZvcm1hdCB7IFxuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRGb3JtYXQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0SGVpZ2h0KCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBpeGVscygpOiBpbnRlcm9wLlBvaW50ZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBpeGVscygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdHJpZGUoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTdHJpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0V2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRXaWR0aCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZyYW1lIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFGcmFtZSkge31cbiAgICBnZXRJbWFnZShpZHg6IG51bWJlcik6IEltYWdlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGltZyA9IHRoaXMuaW9zLmdldEltYWdlKGlkeCk7XG4gICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2UoaW1nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SW5kZXgoKTtcbiAgICB9XG4gICAgZ2V0TnVtSW1hZ2VzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1JbWFnZXMoKTtcbiAgICB9XG4gICAgZ2V0VGltZVN0YW1wKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRUaW1lU3RhbXAoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhU3RhdGUpIHt9XG4gICAgZ2V0RnJhbWUoKTogRnJhbWUge1xuICAgICAgICBjb25zdCBmcmFtZSA9IHRoaXMuaW9zLmdldEZyYW1lKCk7XG4gICAgICAgIHJldHVybiBuZXcgRnJhbWUoZnJhbWUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVSZXN1bHRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogZGVmLlRyYWNrYWJsZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0cmFja2FibGUgPSB0aGlzLmlvcy5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGVSZXN1bHQoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlUmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZVJlc3VsdChpZHgpO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlUmVzdWx0LmNyZWF0ZVRyYWNrYWJsZVJlc3VsdChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhQ2FsaWJyYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUNhbWVyYUNhbGlicmF0aW9uKSB7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZpZWxkT2ZWaWV3UmFkcygpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRGaWVsZE9mVmlld1JhZHMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9jYWxMZW5ndGgoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Rm9jYWxMZW5ndGgoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJpbmNpcGFsUG9pbnQoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UHJpbmNpcGFsUG9pbnQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTaXplKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhRGV2aWNlIHtcbiAgICBpbml0KGNhbWVyYTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmluaXRDYW1lcmEoPG51bWJlcj5jYW1lcmEpO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZGVpbml0Q2FtZXJhKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYUNhbGlicmF0aW9uKCk6IENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICAgICAgY29uc3QgY2FsaWJyYXRpb24gPSBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKTtcbiAgICAgICAgcmV0dXJuIG5ldyBDYW1lcmFDYWxpYnJhdGlvbihjYWxpYnJhdGlvbik7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURpcmVjdGlvbigpOiBkZWYuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+VnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYURpcmVjdGlvbigpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WaWRlb01vZGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TnVtVmlkZW9Nb2RlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb01vZGUobkluZGV4OiBudW1iZXIpOiBkZWYuVmlkZW9Nb2RlIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRWaWRlb01vZGUobkluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgc2VsZWN0VmlkZW9Nb2RlKGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWRlb01vZGUoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBzZXRGbGFzaFRvcmNoTW9kZShvbjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZsYXNoVG9yY2hNb2RlKG9uKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rm9jdXNNb2RlKGZvY3VzTW9kZTogZGVmLkNhbWVyYURldmljZUZvY3VzTW9kZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZvY3VzTW9kZSg8bnVtYmVyPmZvY3VzTW9kZSk7XG4gICAgfVxuICAgIFxuICAgIHN0YXJ0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIFxuICAgIHN0b3AoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RvcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3TGlzdCkge31cbiAgICBjb250YWlucyh2aWV3OiBkZWYuVmlldyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuY29udGFpbnMoPG51bWJlcj52aWV3KTtcbiAgICB9XG4gICAgZ2V0TnVtVmlld3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVZpZXdzKCk7XG4gICAgfVxuICAgIGdldFZpZXcoaWR4OiBudW1iZXIpOiBkZWYuVmlldyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFZpZXcoaWR4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3ZXJQYXJhbWV0ZXJzKSB7fVxuICAgIGNvbnRhaW5zTWFnbmV0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuY29udGFpbnNNYWduZXQoKTtcbiAgICB9XG4gICAgZ2V0QnV0dG9uVHlwZSgpOiBkZWYuVmlld2VyUGFyYW10ZXJzQnV0dG9uVHlwZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldEJ1dHRvblR5cGUoKTtcbiAgICB9XG4gICAgZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHgpO1xuICAgIH1cbiAgICBnZXRGaWVsZE9mVmlldygpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRGaWVsZE9mVmlldygpO1xuICAgIH1cbiAgICBnZXRJbnRlckxlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRMZW5zQ2VudHJlVG9UcmF5RGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TWFudWZhY3R1cmVyKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRNYW51ZmFjdHVyZXIoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TmFtZSgpO1xuICAgIH1cbiAgICBnZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk7XG4gICAgfVxuICAgIGdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRUcmF5QWxpZ25tZW50KCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNUcmF5QWxpZ25tZW50IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0VHJheUFsaWdubWVudCgpO1xuICAgIH1cbiAgICBnZXRWZXJzaW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRWZXJzaW9uKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVZpZXdlclBhcmFtZXRlcnNMaXN0KSB7fVxuICAgIGdldChpZHg6IG51bWJlcik6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmlvcy5nZXQoaWR4KTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXROYW1lTWFudWZhY3R1cmVyKG5hbWU6IHN0cmluZywgbWFudWZhY3R1cmVyOiBzdHJpbmcpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5pb3MuZ2V0TmFtZU1hbnVmYWN0dXJlcihuYW1lLCBtYW51ZmFjdHVyZXIpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHNldFNES0ZpbHRlcihmaWx0ZXI6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLmlvcy5zZXRTREtGaWx0ZXIoZmlsdGVyKTtcbiAgICB9XG4gICAgc2l6ZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc2l6ZSgpO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgRGV2aWNlIHtcbiAgICBzZXRNb2RlKG1vZGU6ZGVmLkRldmljZU1vZGUpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0TW9kZSg8bnVtYmVyPm1vZGUpO1xuICAgIH1cbiAgICBnZXRNb2RlKCkgOiBkZWYuRGV2aWNlTW9kZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPlZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRNb2RlKCk7XG4gICAgfVxuICAgIHNldFZpZXdlckFjdGl2ZShhY3RpdmU6Ym9vbGVhbikgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLnNldFZpZXdlckFjdGl2ZShhY3RpdmUpO1xuICAgIH1cbiAgICBpc1ZpZXdlckFjdGl2ZSgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG4gICAgZ2V0Vmlld2VyTGlzdCgpIDogVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgICAgICBjb25zdCB2aWV3ZXJMaXN0ID0gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZXdlckxpc3QoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCh2aWV3ZXJMaXN0KTtcbiAgICB9XG4gICAgc2VsZWN0Vmlld2VyKHZpZXdlcjpWaWV3ZXJQYXJhbWV0ZXJzKSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0Vmlld2VyKHZpZXdlci5pb3MpO1xuICAgIH1cbiAgICBnZXRTZWxlY3RlZFZpZXdlcigpIDogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBpZiAoIXRoaXMuaXNWaWV3ZXJBY3RpdmUoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRTZWxlY3RlZFZpZXdlcigpKTtcbiAgICB9XG4gICAgZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpOiBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZW5kZXJpbmdQcmltaXRpdmVzKFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmVyIHtcbiAgICBnZXRSZWNvbW1lbmRlZEZwcyhmbGFnczogZGVmLkZQU0hpbnQpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLmdldFJlY29tbWVuZGVkRnBzKDxudW1iZXI+ZmxhZ3MpO1xuICAgIH1cbiAgICBnZXRWaWRlb0JhY2tncm91bmRDb25maWcoKSA6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLmdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpO1xuICAgIH1cbiAgICBzZXRUYXJnZXRGcHMoZnBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFSZW5kZXJlci5zZXRUYXJnZXRGcHMoZnBzKTtcbiAgICB9XG4gICAgc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKGNmZzogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyk6IHZvaWQge1xuICAgICAgICBWdWZvcmlhUmVuZGVyZXIuc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKDxWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kQ29uZmlnPmNmZyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWVzaCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhTWVzaCkge31cbiAgICBcbiAgICBnZXROb3JtYWxDb29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5vcm1hbENvb3JkaW5hdGVzKCk7XG4gICAgfVxuICAgIGdldE5vcm1hbHMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5vcm1hbHMoKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJpYW5nbGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmlhbmdsZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0TnVtVmVydGljZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVZlcnRpY2VzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQb3NpdGlvbkNvb3JkaW5hdGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9ucygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UG9zaXRpb25zKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFRyaWFuZ2xlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRyaWFuZ2xlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVkNvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VVZDb29yZGluYXRlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFVWcygpO1xuICAgIH1cbiAgICBcbiAgICBoYXNOb3JtYWxzKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaGFzTm9ybWFscygpO1xuICAgIH1cbiAgICBcbiAgICBoYXNQb3NpdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNQb3NpdGlvbnMoKTtcbiAgICB9XG4gICAgXG4gICAgaGFzVVZzKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaGFzVVZzKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVuZGVyaW5nUHJpbWl0aXZlcyB7XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhUmVuZGVyaW5nUHJpbWl0aXZlcyl7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlTWVzaCh2aWV3SUQ6IGRlZi5WaWV3KTogTWVzaCB7XG4gICAgICAgIGNvbnN0IG1lc2ggPSB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZU1lc2goPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gbmV3IE1lc2gobWVzaCk7XG4gICAgfVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlU2l6ZSh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgfVxuICAgIFxuICAgIGdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICByZXR1cm4gY3JlYXRlTWF0cml4NDQodGhpcy5pb3MuZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgoPG51bWJlcj52aWV3SUQpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROb3JtYWxpemVkVmlld3BvcnQoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQcm9qZWN0aW9uTWF0cml4KHZpZXdJRDogZGVmLlZpZXcsIGNzVHlwZTogZGVmLkNvb3JkaW5hdGVTeXN0ZW1UeXBlKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZU1hdHJpeDQ0KHRoaXMuaW9zLmdldFByb2plY3Rpb25NYXRyaXhDb29yZGluYXRlU3lzdGVtKDxudW1iZXI+dmlld0lELCA8bnVtYmVyPmNzVHlwZSkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJpbmdWaWV3cygpOiBWaWV3TGlzdCB7XG4gICAgICAgIHJldHVybiBuZXcgVmlld0xpc3QodGhpcy5pb3MuZ2V0UmVuZGVyaW5nVmlld3MoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZE1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjc1R5cGU6IGRlZi5Db29yZGluYXRlU3lzdGVtVHlwZSk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjcmVhdGVNYXRyaXg0NCh0aGlzLmlvcy5nZXRWaWRlb0JhY2tncm91bmRQcm9qZWN0aW9uTWF0cml4Q29vcmRpbmF0ZVN5c3RlbSg8bnVtYmVyPnZpZXdJRCwgPG51bWJlcj5jc1R5cGUpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Vmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2VyIHt9XG5cbmNsYXNzIERhdGFTZXQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYURhdGFTZXQpe31cbiAgICBjcmVhdGVNdWx0aVRhcmdldChuYW1lOiBzdHJpbmcpOiBNdWx0aVRhcmdldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtdCA9IHRoaXMuaW9zLmNyZWF0ZU11bHRpVGFyZ2V0KG5hbWUpO1xuICAgICAgICBpZiAobXQpIHJldHVybiBuZXcgTXVsdGlUYXJnZXQobXQpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBkZXN0cm95KHRyYWNrYWJsZTogVHJhY2thYmxlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5kZXN0cm95KHRyYWNrYWJsZS5pb3MpO1xuICAgIH1cbiAgICBleGlzdHMocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5leGlzdHNTdG9yYWdlVHlwZShwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBUcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5pb3MuZ2V0VHJhY2thYmxlKGlkeCk7XG4gICAgICAgIGlmICh0cmFja2FibGUpIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGhhc1JlYWNoZWRUcmFja2FibGVMaW1pdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc1JlYWNoZWRUcmFja2FibGVMaW1pdCgpO1xuICAgIH1cbiAgICBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmlzQWN0aXZlKCk7XG4gICAgfVxuICAgIGxvYWQocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5sb2FkU3RvcmFnZVR5cGUocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VHJhY2tlciBleHRlbmRzIFRyYWNrZXIge1xuICAgIHN0YXJ0KCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuc3RhcnQoKTtcbiAgICB9XG4gICAgc3RvcCgpIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuc3RvcCgpO1xuICAgIH1cbiAgICBjcmVhdGVEYXRhU2V0KCkgOiBEYXRhU2V0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGRzID0gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVEYXRhU2V0KCk7XG4gICAgICAgIGlmIChkcykgcmV0dXJuIG5ldyBEYXRhU2V0KGRzKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cdGRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcblx0XHRyZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZXN0cm95RGF0YVNldChkYXRhU2V0Lmlvcyk7XG5cdH1cbiAgICBhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5hY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5pb3MpO1xuICAgIH1cbiAgICBkZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuaW9zKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcGkgPSBWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBBUEkoKSA6IHVuZGVmaW5lZDtcbiJdfQ==