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
        setTimeout(configureVuforiaSurface, 500);
    }
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
    API.prototype.initSmartTerrain = function () {
        if (VuforiaSmartTerrain.initTracker()) {
            this.smartTerrain = new SmartTerrain();
            return true;
        }
        ;
        return false;
    };
    API.prototype.deinitSmartTerrain = function () {
        if (VuforiaObjectTracker.deinitTracker()) {
            this.objectTracker = undefined;
            return true;
        }
        return false;
    };
    API.prototype.initPositionalDeviceTracker = function () {
        if (VuforiaPositionalDeviceTracker.initTracker()) {
            this.positionalDeviceTracker = new PositionalDeviceTracker();
            return true;
        }
        ;
        return false;
    };
    API.prototype.deinitPositionalDeviceTracker = function () {
        if (VuforiaPositionalDeviceTracker.deinitTracker()) {
            this.positionalDeviceTracker = undefined;
            return true;
        }
        return false;
    };
    API.prototype.initObjectTracker = function () {
        if (VuforiaObjectTracker.initTracker()) {
            this.objectTracker = new ObjectTracker();
            return true;
        }
        ;
        return false;
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
function convert2GLMatrix(mat) {
    return [
        mat._0,
        mat._4,
        mat._8,
        0,
        mat._1,
        mat._5,
        mat._9,
        0,
        mat._2,
        mat._6,
        mat._10,
        0,
        mat._3,
        mat._7,
        mat._11,
        1
    ];
}
function convert2VuforiaMatrix(mat) {
    return {
        _0: mat[0],
        _1: mat[4],
        _2: mat[8],
        _3: mat[12],
        _4: mat[1],
        _5: mat[5],
        _6: mat[9],
        _7: mat[13],
        _8: mat[2],
        _9: mat[6],
        _10: mat[10],
        _11: mat[14]
    };
}
// https://library.vuforia.com/articles/Solution/How-To-Access-Camera-Parameters
function convertPerspectiveProjection2GLMatrix(mat, near, far) {
    return [
        mat._0,
        mat._4,
        mat._8,
        0,
        mat._1,
        mat._5,
        mat._9,
        0,
        mat._2,
        mat._6,
        (far + near) / (far - near),
        1,
        mat._3,
        mat._7,
        -near * (1 + (far + near) / (far - near)),
        0
    ];
}
var Trackable = /** @class */ (function () {
    function Trackable(ios) {
        this.ios = ios;
    }
    Trackable.createTrackable = function (ios) {
        if (ios instanceof VuforiaAnchor) {
            return new Anchor(ios);
        }
        if (ios instanceof VuforiaDeviceTrackable) {
            return new DeviceTrackable(ios);
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
        if (ios instanceof VuforiaAnchorResult) {
            return new AnchorResult(ios);
        }
        else if (ios instanceof VuforiaDeviceTrackableResult) {
            return new DeviceTrackableResult(ios);
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
        return convert2GLMatrix(this.ios.getPose());
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
var DeviceTrackable = /** @class */ (function (_super) {
    __extends(DeviceTrackable, _super);
    function DeviceTrackable(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return DeviceTrackable;
}(Trackable));
exports.DeviceTrackable = DeviceTrackable;
var DeviceTrackableResult = /** @class */ (function (_super) {
    __extends(DeviceTrackableResult, _super);
    function DeviceTrackableResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return DeviceTrackableResult;
}(TrackableResult));
exports.DeviceTrackableResult = DeviceTrackableResult;
var Anchor = /** @class */ (function (_super) {
    __extends(Anchor, _super);
    function Anchor(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return Anchor;
}(Trackable));
exports.Anchor = Anchor;
var AnchorResult = /** @class */ (function (_super) {
    __extends(AnchorResult, _super);
    function AnchorResult(ios) {
        var _this = _super.call(this, ios) || this;
        _this.ios = ios;
        return _this;
    }
    return AnchorResult;
}(TrackableResult));
exports.AnchorResult = AnchorResult;
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
        return convert2GLMatrix(this.ios.getEyeDisplayAdjustmentMatrix(viewID));
    };
    RenderingPrimitives.prototype.getNormalizedViewport = function (viewID) {
        return this.ios.getNormalizedViewport(viewID);
    };
    RenderingPrimitives.prototype.getProjectionMatrix = function (viewID, csType) {
        return convertPerspectiveProjection2GLMatrix(this.ios.getProjectionMatrixCoordinateSystem(viewID, csType), 0.01, 100000);
    };
    RenderingPrimitives.prototype.getRenderingViews = function () {
        return new ViewList(this.ios.getRenderingViews());
    };
    RenderingPrimitives.prototype.getVideoBackgroundMesh = function (viewID) {
        var mesh = this.ios.getVideoBackgroundMesh(viewID);
        return new Mesh(mesh);
    };
    RenderingPrimitives.prototype.getVideoBackgroundProjectionMatrix = function (viewID, csType) {
        return convertPerspectiveProjection2GLMatrix(this.ios.getVideoBackgroundProjectionMatrixCoordinateSystem(viewID, csType), 0.01, 100000);
    };
    RenderingPrimitives.prototype.getViewport = function (viewID) {
        return this.ios.getViewport(viewID);
    };
    return RenderingPrimitives;
}());
exports.RenderingPrimitives = RenderingPrimitives;
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
var Tracker = /** @class */ (function () {
    function Tracker() {
    }
    Tracker.prototype.start = function () {
        return this.nativeClass.getInstance().start();
    };
    Tracker.prototype.stop = function () {
        this.nativeClass.getInstance().stop();
    };
    return Tracker;
}());
exports.Tracker = Tracker;
var HitTestResult = /** @class */ (function () {
    function HitTestResult(ios) {
        this.ios = ios;
    }
    ;
    HitTestResult.prototype.getPose = function () {
        return convert2GLMatrix(this.ios.getPose());
    };
    return HitTestResult;
}());
exports.HitTestResult = HitTestResult;
var PositionalDeviceTracker = /** @class */ (function (_super) {
    __extends(PositionalDeviceTracker, _super);
    function PositionalDeviceTracker() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nativeClass = VuforiaPositionalDeviceTracker;
        return _this;
    }
    PositionalDeviceTracker.prototype.createAnchorFromPose = function (name, pose) {
        var vuforiaPose = convert2VuforiaMatrix(pose);
        var vuforiaAnchor = VuforiaPositionalDeviceTracker.getInstance().createAnchorWithNamePose(name, vuforiaPose);
        return vuforiaAnchor ? new Anchor(vuforiaAnchor) : null;
    };
    PositionalDeviceTracker.prototype.createAnchorFromHitTestResult = function (name, hitTestResult) {
        var vuforiaAnchor = VuforiaPositionalDeviceTracker.getInstance().createAnchorWithNameHitTestResult(name, hitTestResult.ios);
        return vuforiaAnchor ? new Anchor(vuforiaAnchor) : null;
    };
    PositionalDeviceTracker.prototype.destroyAnchor = function (anchor) {
        return VuforiaPositionalDeviceTracker.getInstance().destroyAnchor(anchor.ios);
    };
    PositionalDeviceTracker.prototype.getNumAnchors = function () {
        return VuforiaPositionalDeviceTracker.getInstance().numAnchors();
    };
    PositionalDeviceTracker.prototype.getAnchor = function (idx) {
        var vuforiaAnchor = VuforiaPositionalDeviceTracker.getInstance().getAnchorAtIndex(idx);
        return vuforiaAnchor ? new Anchor(vuforiaAnchor) : null;
    };
    return PositionalDeviceTracker;
}(Tracker));
exports.PositionalDeviceTracker = PositionalDeviceTracker;
var SmartTerrain = /** @class */ (function (_super) {
    __extends(SmartTerrain, _super);
    function SmartTerrain() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nativeClass = VuforiaSmartTerrain;
        return _this;
    }
    SmartTerrain.prototype.hitTest = function (state, point, defaultDeviceHeight, hint) {
        VuforiaSmartTerrain.getInstance().hitTestWithStatePointDeviceHeightHint(state.ios, point, defaultDeviceHeight, hint);
    };
    SmartTerrain.prototype.getHitTestResultCount = function () {
        return VuforiaSmartTerrain.getInstance().hitTestResultCount();
    };
    SmartTerrain.prototype.getHitTestResult = function (idx) {
        var r = VuforiaSmartTerrain.getInstance().getHitTestResultAtIndex(idx);
        return new HitTestResult(r);
    };
    return SmartTerrain;
}(Tracker));
exports.SmartTerrain = SmartTerrain;
var ObjectTracker = /** @class */ (function (_super) {
    __extends(ObjectTracker, _super);
    function ObjectTracker() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nativeClass = VuforiaObjectTracker;
        return _this;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFxQztBQUVyQyx5Q0FBNEM7QUFFNUMseUNBQTRDO0FBQzVDLDRDQUErQztBQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVwQyxJQUFNLGlCQUFpQixHQUFHLE9BQU8sY0FBYyxLQUFLLFdBQVcsQ0FBQztBQUVoRSxJQUFNLFlBQVksR0FBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXBGLFFBQUEsU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZELGlCQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsVUFBQyxHQUFtQztJQUN4RixHQUFHLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQTtBQUVGLGlCQUFTLENBQUMsUUFBUSxHQUFHO0lBQ2pCLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1FBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUM7QUFDN0QsQ0FBQyxDQUFBO0FBRUQsaUJBQVMsQ0FBQyxRQUFRLEdBQUcsVUFBUyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1FBQUMsdUJBQXVCLEVBQUUsQ0FBQztBQUNyRCxDQUFDLENBQUE7QUFFRCxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUU7SUFDckMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlC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QkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM5RCxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBQ0osc0NBQWMsR0FBZCxVQUFlLE9BQWU7UUFDN0IsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUNFLHVDQUFlLEdBQWYsVUFBZ0IsT0FBZTtRQUMzQixNQUFNLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBQ0QseUNBQWlCLEdBQWpCLFVBQWtCLE9BQWU7UUFDN0IsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBQ0wsb0JBQUM7QUFBRCxDQUFDLEFBaEJELENBQW1DLE9BQU8sR0FnQnpDO0FBaEJZLHNDQUFhO0FBa0JiLFFBQUEsR0FBRyxHQUFHLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCBjb21tb24gPSByZXF1aXJlKCcuL3Z1Zm9yaWEtY29tbW9uJyk7XG5pbXBvcnQgZGVmID0gcmVxdWlyZSgnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnKTtcbmltcG9ydCBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJ2FwcGxpY2F0aW9uJyk7XG5pbXBvcnQgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCd1aS9wbGFjZWhvbGRlcicpO1xuXG5nbG9iYWwubW9kdWxlTWVyZ2UoY29tbW9uLCBleHBvcnRzKTtcblxuY29uc3QgVlVGT1JJQV9BVkFJTEFCTEUgPSB0eXBlb2YgVnVmb3JpYVNlc3Npb27CoCE9PSAndW5kZWZpbmVkJztcblxuY29uc3QgaW9zVmlkZW9WaWV3ID0gPFZ1Zm9yaWFWaWRlb1ZpZXc+IChWVUZPUklBX0FWQUlMQUJMRSA/IFZ1Zm9yaWFWaWRlb1ZpZXcubmV3KCkgOiB1bmRlZmluZWQpO1xuXG5leHBvcnQgY29uc3QgdmlkZW9WaWV3ID0gbmV3IHBsYWNlaG9sZGVyLlBsYWNlaG9sZGVyKCk7XG52aWRlb1ZpZXcub24ocGxhY2Vob2xkZXIuUGxhY2Vob2xkZXIuY3JlYXRpbmdWaWV3RXZlbnQsIChldnQ6cGxhY2Vob2xkZXIuQ3JlYXRlVmlld0V2ZW50RGF0YSk9PntcbiAgICBldnQudmlldyA9IGlvc1ZpZGVvVmlldztcbn0pXG5cbnZpZGVvVmlldy5vbkxvYWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xufVxuXG52aWRlb1ZpZXcub25MYXlvdXQgPSBmdW5jdGlvbihsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20pIHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG59XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnN1c3BlbmRFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQYXVzaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25QYXVzZSgpO1xuICAgICAgICBpb3NWaWRlb1ZpZXcuZmluaXNoT3BlbkdMRVNDb21tYW5kcygpO1xuICAgICAgICBpb3NWaWRlb1ZpZXcuZnJlZU9wZW5HTEVTUmVzb3VyY2VzKCk7XG4gICAgfVxufSlcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpID0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihjb25maWd1cmVWdWZvcmlhU3VyZmFjZSk7IC8vIGRlbGF5IHVudGlsIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDApO1xuICAgIH1cbn0pO1xuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZXN1bWluZyBWdWZvcmlhJyk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUmVzdW1lKCk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICB9XG59KVxuXG5leHBvcnQgZnVuY3Rpb24gY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKSB7XG4gICAgaWYgKCFhcGkpIHRocm93IG5ldyBFcnJvcigpO1xuICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IGlvc1ZpZGVvVmlldy5jb250ZW50U2NhbGVGYWN0b3I7XG4gICAgYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmFtZS5zaXplLndpZHRoICogY29udGVudFNjYWxlRmFjdG9yLFxuICAgICAgICBpb3NWaWRlb1ZpZXcuZnJhbWUuc2l6ZS5oZWlnaHQgKiBjb250ZW50U2NhbGVGYWN0b3JcbiAgICApO1xufVxuXG5leHBvcnQgY2xhc3MgQVBJIGV4dGVuZHMgY29tbW9uLkFQSUJhc2Uge1xuICAgIFxuICAgIHByaXZhdGUgY2FtZXJhRGV2aWNlID0gbmV3IENhbWVyYURldmljZSgpO1xuICAgIHByaXZhdGUgZGV2aWNlID0gbmV3IERldmljZSgpO1xuICAgIHByaXZhdGUgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIoKTtcbiAgICBcbiAgICBzZXRMaWNlbnNlS2V5KGxpY2Vuc2VLZXk6c3RyaW5nKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2V0TGljZW5zZUtleShsaWNlbnNlS2V5KSA9PT0gMDtcbiAgICB9XG4gICAgXG4gICAgc2V0SGludChoaW50OmRlZi5IaW50LHZhbHVlOm51bWJlcikgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnNldEhpbnRWYWx1ZSg8bnVtYmVyPmhpbnQsIHZhbHVlKTtcbiAgICB9XG4gICAgXG4gICAgaW5pdCgpIDogUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8ZGVmLkluaXRSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLmluaXREb25lKChyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gVnVmb3JpYUluaXRSZXN1bHQuU1VDQ0VTUykge1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnJlZ2lzdGVyQ2FsbGJhY2soKHN0YXRlKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhuZXcgU3RhdGUoc3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoPGRlZi5Jbml0UmVzdWx0PjxudW1iZXI+cmVzdWx0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLmRlaW5pdCgpO1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblBhdXNlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURldmljZSgpIDogQ2FtZXJhRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FtZXJhRGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXREZXZpY2UoKSA6IERldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyZXIoKSA6IFJlbmRlcmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyZXI7XG4gICAgfVxuXG4gICAgaW5pdFNtYXJ0VGVycmFpbigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhU21hcnRUZXJyYWluLmluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMuc21hcnRUZXJyYWluID0gbmV3IFNtYXJ0VGVycmFpbigpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBkZWluaXRTbWFydFRlcnJhaW4oKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYU9iamVjdFRyYWNrZXIuZGVpbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaW5pdFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5pbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uYWxEZXZpY2VUcmFja2VyID0gbmV3IFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGRlaW5pdFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5kZWluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25hbERldmljZVRyYWNrZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFPYmplY3RUcmFja2VyLmluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IG5ldyBPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFPYmplY3RUcmFja2VyLmRlaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHNldFNjYWxlRmFjdG9yKGY6bnVtYmVyKSB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yICYmIFZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yKGYpO1xuICAgIH1cblxuICAgIGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2NhbGVGYWN0b3IoKTtcbiAgICB9XG5cbiAgICBvblN1cmZhY2VDaGFuZ2VkKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ2hhbmdlZFdpZHRoSGVpZ2h0KHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbjpVSUludGVyZmFjZU9yaWVudGF0aW9uID0gdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5zdGF0dXNCYXJPcmllbnRhdGlvbjtcbiAgICAgICAgc3dpdGNoIChvcmllbnRhdGlvbikge1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdFVwc2lkZURvd246IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMjcwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVMZWZ0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzE4MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlUmlnaHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY29udmVydDJHTE1hdHJpeChtYXQ6VnVmb3JpYU1hdHJpeDM0KSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgcmV0dXJuICBbXG4gICAgICAgICAgICAgICAgbWF0Ll8wLFxuICAgICAgICAgICAgICAgIG1hdC5fNCxcbiAgICAgICAgICAgICAgICBtYXQuXzgsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzEsXG4gICAgICAgICAgICAgICAgbWF0Ll81LFxuICAgICAgICAgICAgICAgIG1hdC5fOSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMixcbiAgICAgICAgICAgICAgICBtYXQuXzYsXG4gICAgICAgICAgICAgICAgbWF0Ll8xMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMyxcbiAgICAgICAgICAgICAgICBtYXQuXzcsXG4gICAgICAgICAgICAgICAgbWF0Ll8xMSxcbiAgICAgICAgICAgICAgICAxXG4gICAgICAgICAgICBdO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0MlZ1Zm9yaWFNYXRyaXgobWF0OmRlZi5NYXRyaXg0NCkgOiBWdWZvcmlhTWF0cml4MzQge1xuICAgIHJldHVybiAge1xuICAgICAgICBfMDogbWF0WzBdLFxuICAgICAgICBfMTogbWF0WzRdLFxuICAgICAgICBfMjogbWF0WzhdLFxuICAgICAgICBfMzogbWF0WzEyXSxcbiAgICAgICAgXzQ6IG1hdFsxXSxcbiAgICAgICAgXzU6IG1hdFs1XSxcbiAgICAgICAgXzY6IG1hdFs5XSxcbiAgICAgICAgXzc6IG1hdFsxM10sXG4gICAgICAgIF84OiBtYXRbMl0sXG4gICAgICAgIF85OiBtYXRbNl0sXG4gICAgICAgIF8xMDogbWF0WzEwXSxcbiAgICAgICAgXzExOiBtYXRbMTRdXG4gICAgfTtcbn1cblxuLy8gaHR0cHM6Ly9saWJyYXJ5LnZ1Zm9yaWEuY29tL2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1BY2Nlc3MtQ2FtZXJhLVBhcmFtZXRlcnNcbmZ1bmN0aW9uIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgobWF0OlZ1Zm9yaWFNYXRyaXgzNCwgbmVhcjpudW1iZXIsIGZhcjpudW1iZXIpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgICAgICAgICBtYXQuXzAsXG4gICAgICAgICAgICAgICAgbWF0Ll80LFxuICAgICAgICAgICAgICAgIG1hdC5fOCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMSxcbiAgICAgICAgICAgICAgICBtYXQuXzUsXG4gICAgICAgICAgICAgICAgbWF0Ll85LFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgbWF0Ll8yLFxuICAgICAgICAgICAgICAgIG1hdC5fNixcbiAgICAgICAgICAgICAgICAoZmFyICsgbmVhcikgLyAoZmFyIC0gbmVhciksXG4gICAgICAgICAgICAgICAgMSxcbiAgICAgICAgICAgICAgICBtYXQuXzMsXG4gICAgICAgICAgICAgICAgbWF0Ll83LFxuICAgICAgICAgICAgICAgIC1uZWFyICogKDEgKyAoZmFyICsgbmVhcikgLyAoZmFyIC0gbmVhcikpLFxuICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgIF07XG59XG5cblxuZXhwb3J0IGNsYXNzIFRyYWNrYWJsZSB7XG4gICAgXG4gICAgc3RhdGljIGNyZWF0ZVRyYWNrYWJsZShpb3M6VnVmb3JpYVRyYWNrYWJsZSkge1xuICAgICAgICBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUFuY2hvcikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBbmNob3IoaW9zKTtcbiAgICAgICAgfSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYURldmljZVRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZXZpY2VUcmFja2FibGUoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkKGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUltYWdlVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUN5bGluZGVyVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYU9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhVHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZShpb3MpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFUcmFja2FibGUpIHt9XG4gICAgXG4gICAgZ2V0SWQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldElkKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5hbWUoKTtcbiAgICB9XG4gICAgaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTtcbiAgICB9XG4gICAgc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxuICAgIHN0b3BFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGVSZXN1bHQge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGVSZXN1bHQoaW9zOlZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFBbmNob3JSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQW5jaG9yUmVzdWx0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYURldmljZVRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZXZpY2VUcmFja2FibGVSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFXb3JkUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFJbWFnZVRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldFJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0UmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldFJlc3VsdChpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlUmVzdWx0KGlvcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVRyYWNrYWJsZVJlc3VsdCkge31cbiAgICBcbiAgICBnZXRQb3NlKCk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldFBvc2UoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFRpbWVTdGFtcCgpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdGF0dXMoKTogZGVmLlRyYWNrYWJsZVJlc3VsdFN0YXR1cyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFN0YXR1cygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmFja2FibGUoKTogVHJhY2thYmxlIHtcbiAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodGhpcy5pb3MuZ2V0VHJhY2thYmxlKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFdvcmQgZXh0ZW5kcyBUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVdvcmQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgV29yZFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVdvcmRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgRGV2aWNlVHJhY2thYmxlIGV4dGVuZHMgVHJhY2thYmxlIGltcGxlbWVudHMgZGVmLkRldmljZVRyYWNrYWJsZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhRGV2aWNlVHJhY2thYmxlKSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIERldmljZVRyYWNrYWJsZVJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCBpbXBsZW1lbnRzIGRlZi5EZXZpY2VUcmFja2FibGVSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYURldmljZVRyYWNrYWJsZVJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmNob3IgZXh0ZW5kcyBUcmFja2FibGUgaW1wbGVtZW50cyBkZWYuQW5jaG9yIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFBbmNob3IpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgQW5jaG9yUmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IGltcGxlbWVudHMgZGVmLkFuY2hvclJlc3VsdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQW5jaG9yUmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldCBleHRlbmRzIFRyYWNrYWJsZSB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU9iamVjdFRhcmdldCkge3N1cGVyKGlvcyl9XG4gICAgXG4gICAgZ2V0VW5pcXVlVGFyZ2V0SWQoKSA6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRVbmlxdWVUYXJnZXRJZCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTaXplKCk6IGRlZi5WZWMzIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFNpemUoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUYXJnZXRSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFPYmplY3RUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBJbWFnZVRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUltYWdlVGFyZ2V0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgSW1hZ2VUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFJbWFnZVRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBNdWx0aVRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhTXVsdGlUYXJnZXQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFPYmplY3RUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBDeWxpbmRlclRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUN5bGluZGVyVGFyZ2V0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgQ3lsaW5kZXJUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFDeWxpbmRlclRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFnZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSW1hZ2UpIHt9XG4gICAgXG4gICAgZ2V0QnVmZmVySGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRCdWZmZXJIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0QnVmZmVyV2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRCdWZmZXJXaWR0aCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGb3JtYXQoKTogZGVmLlBpeGVsRm9ybWF0IHsgXG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldEZvcm1hdCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRIZWlnaHQoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UGl4ZWxzKCk6IGludGVyb3AuUG9pbnRlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UGl4ZWxzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFN0cmlkZSgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFN0cmlkZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFdpZHRoKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRnJhbWUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUZyYW1lKSB7fVxuICAgIGdldEltYWdlKGlkeDogbnVtYmVyKTogSW1hZ2V8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgaW1nID0gdGhpcy5pb3MuZ2V0SW1hZ2UoaWR4KTtcbiAgICAgICAgaWYgKGltZykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZShpbWcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldEluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRJbmRleCgpO1xuICAgIH1cbiAgICBnZXROdW1JbWFnZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bUltYWdlcygpO1xuICAgIH1cbiAgICBnZXRUaW1lU3RhbXAoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFTdGF0ZSkge31cbiAgICBnZXRGcmFtZSgpOiBGcmFtZSB7XG4gICAgICAgIGNvbnN0IGZyYW1lID0gdGhpcy5pb3MuZ2V0RnJhbWUoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFtZShmcmFtZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZVJlc3VsdChpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGVSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5pb3MuZ2V0VHJhY2thYmxlUmVzdWx0KGlkeCk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBUcmFja2FibGVSZXN1bHQuY3JlYXRlVHJhY2thYmxlUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDYW1lcmFDYWxpYnJhdGlvbiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQ2FtZXJhQ2FsaWJyYXRpb24pIHt9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblBhcmFtZXRlcnMoKTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvblBhcmFtZXRlcnMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RmllbGRPZlZpZXdSYWRzKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEZpZWxkT2ZWaWV3UmFkcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGb2NhbExlbmd0aCgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRGb2NhbExlbmd0aCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQcmluY2lwYWxQb2ludCgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQcmluY2lwYWxQb2ludCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTaXplKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFNpemUoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDYW1lcmFEZXZpY2Uge1xuICAgIGluaXQoY2FtZXJhOiBkZWYuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuaW5pdENhbWVyYSg8bnVtYmVyPmNhbWVyYSk7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5kZWluaXRDYW1lcmEoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKTogQ2FtZXJhQ2FsaWJyYXRpb24ge1xuICAgICAgICBjb25zdCBjYWxpYnJhdGlvbiA9IFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRDYW1lcmFDYWxpYnJhdGlvbigpO1xuICAgICAgICByZXR1cm4gbmV3IENhbWVyYUNhbGlicmF0aW9uKGNhbGlicmF0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGlyZWN0aW9uKCk6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24ge1xuICAgICAgICByZXR1cm4gPG51bWJlcj5WdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhRGlyZWN0aW9uKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZpZGVvTW9kZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXROdW1WaWRlb01vZGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvTW9kZShuSW5kZXg6IG51bWJlcik6IGRlZi5WaWRlb01vZGUge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZGVvTW9kZShuSW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBzZWxlY3RWaWRlb01vZGUoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZGVvTW9kZShpbmRleCk7XG4gICAgfVxuICAgIFxuICAgIHNldEZsYXNoVG9yY2hNb2RlKG9uOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Rmxhc2hUb3JjaE1vZGUob24pO1xuICAgIH1cbiAgICBcbiAgICBzZXRGb2N1c01vZGUoZm9jdXNNb2RlOiBkZWYuQ2FtZXJhRGV2aWNlRm9jdXNNb2RlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Rm9jdXNNb2RlKDxudW1iZXI+Zm9jdXNNb2RlKTtcbiAgICB9XG4gICAgXG4gICAgc3RhcnQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RhcnQoKTtcbiAgICB9XG4gICAgXG4gICAgc3RvcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zdG9wKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld0xpc3Qge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVZpZXdMaXN0KSB7fVxuICAgIGNvbnRhaW5zKHZpZXc6IGRlZi5WaWV3KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5jb250YWlucyg8bnVtYmVyPnZpZXcpO1xuICAgIH1cbiAgICBnZXROdW1WaWV3cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVmlld3MoKTtcbiAgICB9XG4gICAgZ2V0VmlldyhpZHg6IG51bWJlcik6IGRlZi5WaWV3IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0VmlldyhpZHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnMge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVZpZXdlclBhcmFtZXRlcnMpIHt9XG4gICAgY29udGFpbnNNYWduZXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5jb250YWluc01hZ25ldCgpO1xuICAgIH1cbiAgICBnZXRCdXR0b25UeXBlKCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNCdXR0b25UeXBlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0QnV0dG9uVHlwZSgpO1xuICAgIH1cbiAgICBnZXREaXN0b3J0aW9uQ29lZmZpY2llbnQoaWR4OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeCk7XG4gICAgfVxuICAgIGdldEZpZWxkT2ZWaWV3KCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEZpZWxkT2ZWaWV3KCk7XG4gICAgfVxuICAgIGdldEludGVyTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRJbnRlckxlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRMZW5zQ2VudHJlVG9UcmF5RGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRNYW51ZmFjdHVyZXIoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE1hbnVmYWN0dXJlcigpO1xuICAgIH1cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROYW1lKCk7XG4gICAgfVxuICAgIGdldE51bURpc3RvcnRpb25Db2VmZmljaWVudHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bURpc3RvcnRpb25Db2VmZmljaWVudHMoKTtcbiAgICB9XG4gICAgZ2V0U2NyZWVuVG9MZW5zRGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldFRyYXlBbGlnbm1lbnQoKTogZGVmLlZpZXdlclBhcmFtdGVyc1RyYXlBbGlnbm1lbnQge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRUcmF5QWxpZ25tZW50KCk7XG4gICAgfVxuICAgIGdldFZlcnNpb24oKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFZlcnNpb24oKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVmlld2VyUGFyYW1ldGVyc0xpc3QpIHt9XG4gICAgZ2V0KGlkeDogbnVtYmVyKTogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB2cCA9IHRoaXMuaW9zLmdldChpZHgpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE5hbWVNYW51ZmFjdHVyZXIobmFtZTogc3RyaW5nLCBtYW51ZmFjdHVyZXI6IHN0cmluZyk6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmlvcy5nZXROYW1lTWFudWZhY3R1cmVyKG5hbWUsIG1hbnVmYWN0dXJlcik7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgc2V0U0RLRmlsdGVyKGZpbHRlcjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMuaW9zLnNldFNES0ZpbHRlcihmaWx0ZXIpO1xuICAgIH1cbiAgICBzaXplKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5zaXplKCk7XG4gICAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBEZXZpY2Uge1xuICAgIHNldE1vZGUobW9kZTpkZWYuRGV2aWNlTW9kZSkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRNb2RlKDxudW1iZXI+bW9kZSk7XG4gICAgfVxuICAgIGdldE1vZGUoKSA6IGRlZi5EZXZpY2VNb2RlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+VnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldE1vZGUoKTtcbiAgICB9XG4gICAgc2V0Vmlld2VyQWN0aXZlKGFjdGl2ZTpib29sZWFuKSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Vmlld2VyQWN0aXZlKGFjdGl2ZSk7XG4gICAgfVxuICAgIGlzVmlld2VyQWN0aXZlKCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5pc1ZpZXdlckFjdGl2ZSgpO1xuICAgIH1cbiAgICBnZXRWaWV3ZXJMaXN0KCkgOiBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgICAgIGNvbnN0IHZpZXdlckxpc3QgPSBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Vmlld2VyTGlzdCgpO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnNMaXN0KHZpZXdlckxpc3QpO1xuICAgIH1cbiAgICBzZWxlY3RWaWV3ZXIodmlld2VyOlZpZXdlclBhcmFtZXRlcnMpIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWV3ZXIodmlld2VyLmlvcyk7XG4gICAgfVxuICAgIGdldFNlbGVjdGVkVmlld2VyKCkgOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghdGhpcy5pc1ZpZXdlckFjdGl2ZSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnMoVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFNlbGVjdGVkVmlld2VyKCkpO1xuICAgIH1cbiAgICBnZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk6IFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgICAgICByZXR1cm4gbmV3IFJlbmRlcmluZ1ByaW1pdGl2ZXMoVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xuICAgIGdldFJlY29tbWVuZGVkRnBzKGZsYWdzOiBkZWYuRlBTSGludCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUmVuZGVyZXIuZ2V0UmVjb21tZW5kZWRGcHMoPG51bWJlcj5mbGFncyk7XG4gICAgfVxuICAgIGdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpIDogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUmVuZGVyZXIuZ2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCk7XG4gICAgfVxuICAgIHNldFRhcmdldEZwcyhmcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLnNldFRhcmdldEZwcyhmcHMpO1xuICAgIH1cbiAgICBzZXRWaWRlb0JhY2tncm91bmRDb25maWcoY2ZnOiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnKTogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFSZW5kZXJlci5zZXRWaWRlb0JhY2tncm91bmRDb25maWcoPFZ1Zm9yaWFWaWRlb0JhY2tncm91bmRDb25maWc+Y2ZnKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNZXNoIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFNZXNoKSB7fVxuICAgIFxuICAgIGdldE5vcm1hbENvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgZ2V0Tm9ybWFscygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFscygpO1xuICAgIH1cbiAgICBnZXROdW1UcmlhbmdsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyaWFuZ2xlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WZXJ0aWNlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVmVydGljZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25Db29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25zKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQb3NpdGlvbnMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJpYW5nbGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VHJpYW5nbGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFVWQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRVVkNvb3JkaW5hdGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFVWcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VVZzKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc05vcm1hbHMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNOb3JtYWxzKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc1Bvc2l0aW9ucygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc1Bvc2l0aW9ucygpO1xuICAgIH1cbiAgICBcbiAgICBoYXNVVnMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNVVnMoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFSZW5kZXJpbmdQcmltaXRpdmVzKXt9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKHZpZXdJRDogZGVmLlZpZXcpOiBNZXNoIHtcbiAgICAgICAgY29uc3QgbWVzaCA9IHRoaXMuaW9zLmdldERpc3RvcnRpb25UZXh0dXJlTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZVNpemUoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgodmlld0lEOiBkZWYuVmlldyk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldE5vcm1hbGl6ZWRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjc1R5cGU6IGRlZi5Db29yZGluYXRlU3lzdGVtVHlwZSk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KHRoaXMuaW9zLmdldFByb2plY3Rpb25NYXRyaXhDb29yZGluYXRlU3lzdGVtKDxudW1iZXI+dmlld0lELCA8bnVtYmVyPmNzVHlwZSksIDAuMDEsIDEwMDAwMCk7XG4gICAgfVxuICAgIFxuICAgIGdldFJlbmRlcmluZ1ZpZXdzKCk6IFZpZXdMaXN0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3TGlzdCh0aGlzLmlvcy5nZXRSZW5kZXJpbmdWaWV3cygpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCh2aWV3SUQ6IGRlZi5WaWV3KTogTWVzaCB7XG4gICAgICAgIGNvbnN0IG1lc2ggPSB0aGlzLmlvcy5nZXRWaWRlb0JhY2tncm91bmRNZXNoKDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNZXNoKG1lc2gpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb0JhY2tncm91bmRQcm9qZWN0aW9uTWF0cml4KHZpZXdJRDogZGVmLlZpZXcsIGNzVHlwZTogZGVmLkNvb3JkaW5hdGVTeXN0ZW1UeXBlKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgodGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeENvb3JkaW5hdGVTeXN0ZW0oPG51bWJlcj52aWV3SUQsIDxudW1iZXI+Y3NUeXBlKSwgIDAuMDEsIDEwMDAwMCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgfVxuICAgIFxufVxuXG5jbGFzcyBEYXRhU2V0IGltcGxlbWVudHMgZGVmLkRhdGFTZXQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYURhdGFTZXQpe31cbiAgICBjcmVhdGVNdWx0aVRhcmdldChuYW1lOiBzdHJpbmcpOiBNdWx0aVRhcmdldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtdCA9IHRoaXMuaW9zLmNyZWF0ZU11bHRpVGFyZ2V0KG5hbWUpO1xuICAgICAgICBpZiAobXQpIHJldHVybiBuZXcgTXVsdGlUYXJnZXQobXQpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBkZXN0cm95KHRyYWNrYWJsZTogVHJhY2thYmxlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5kZXN0cm95KHRyYWNrYWJsZS5pb3MpO1xuICAgIH1cbiAgICBleGlzdHMocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5leGlzdHNTdG9yYWdlVHlwZShwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBUcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5pb3MuZ2V0VHJhY2thYmxlKGlkeCk7XG4gICAgICAgIGlmICh0cmFja2FibGUpIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGhhc1JlYWNoZWRUcmFja2FibGVMaW1pdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc1JlYWNoZWRUcmFja2FibGVMaW1pdCgpO1xuICAgIH1cbiAgICBpc0FjdGl2ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmlzQWN0aXZlKCk7XG4gICAgfVxuICAgIGxvYWQocGF0aDogc3RyaW5nLCBzdG9yYWdlVHlwZTogZGVmLlN0b3JhZ2VUeXBlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5sb2FkU3RvcmFnZVR5cGUocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVHJhY2tlciB7XG4gICAgYWJzdHJhY3QgbmF0aXZlQ2xhc3MgOiB0eXBlb2YgVnVmb3JpYVRyYWNrZXIgJiB7Z2V0SW5zdGFuY2UoKTpWdWZvcmlhVHJhY2tlcn07XG4gICAgc3RhcnQoKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5uYXRpdmVDbGFzcy5nZXRJbnN0YW5jZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIHN0b3AoKSA6IHZvaWQge1xuICAgICAgICB0aGlzLm5hdGl2ZUNsYXNzLmdldEluc3RhbmNlKCkuc3RvcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEhpdFRlc3RSZXN1bHQgaW1wbGVtZW50cyBkZWYuSGl0VGVzdFJlc3VsdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSGl0VGVzdFJlc3VsdCkge307XG4gICAgZ2V0UG9zZSgpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnQyR0xNYXRyaXgodGhpcy5pb3MuZ2V0UG9zZSgpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQb3NpdGlvbmFsRGV2aWNlVHJhY2tlciBleHRlbmRzIFRyYWNrZXIgaW1wbGVtZW50cyBkZWYuUG9zaXRpb25hbERldmljZVRyYWNrZXIge1xuICAgIG5hdGl2ZUNsYXNzID0gVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyO1xuICAgIGNyZWF0ZUFuY2hvckZyb21Qb3NlKG5hbWU6IHN0cmluZywgcG9zZTogZGVmLk1hdHJpeDQ0KTogZGVmLkFuY2hvciB8IG51bGwge1xuICAgICAgICBjb25zdCB2dWZvcmlhUG9zZSA9IGNvbnZlcnQyVnVmb3JpYU1hdHJpeChwb3NlKTtcbiAgICAgICAgY29uc3QgdnVmb3JpYUFuY2hvciA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5nZXRJbnN0YW5jZSgpLmNyZWF0ZUFuY2hvcldpdGhOYW1lUG9zZShuYW1lLCB2dWZvcmlhUG9zZSk7XG4gICAgICAgIHJldHVybiB2dWZvcmlhQW5jaG9yID8gbmV3IEFuY2hvcih2dWZvcmlhQW5jaG9yKSA6IG51bGw7XG4gICAgfVxuICAgIGNyZWF0ZUFuY2hvckZyb21IaXRUZXN0UmVzdWx0KG5hbWU6IHN0cmluZywgaGl0VGVzdFJlc3VsdDogSGl0VGVzdFJlc3VsdCk6IGRlZi5BbmNob3IgfCBudWxsIHtcbiAgICAgICAgY29uc3QgdnVmb3JpYUFuY2hvciA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5nZXRJbnN0YW5jZSgpLmNyZWF0ZUFuY2hvcldpdGhOYW1lSGl0VGVzdFJlc3VsdChuYW1lLCBoaXRUZXN0UmVzdWx0Lmlvcyk7XG4gICAgICAgIHJldHVybiB2dWZvcmlhQW5jaG9yID8gbmV3IEFuY2hvcih2dWZvcmlhQW5jaG9yKSA6IG51bGw7XG4gICAgfVxuICAgIGRlc3Ryb3lBbmNob3IoYW5jaG9yOiBBbmNob3IpIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5nZXRJbnN0YW5jZSgpLmRlc3Ryb3lBbmNob3IoYW5jaG9yLmlvcyk7XG4gICAgfVxuICAgIGdldE51bUFuY2hvcnMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5nZXRJbnN0YW5jZSgpLm51bUFuY2hvcnMoKTtcbiAgICB9XG4gICAgZ2V0QW5jaG9yKGlkeDogbnVtYmVyKTogZGVmLkFuY2hvciB8IG51bGwge1xuICAgICAgICBjb25zdCB2dWZvcmlhQW5jaG9yID0gVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmdldEluc3RhbmNlKCkuZ2V0QW5jaG9yQXRJbmRleChpZHgpO1xuICAgICAgICByZXR1cm4gdnVmb3JpYUFuY2hvciA/IG5ldyBBbmNob3IodnVmb3JpYUFuY2hvcikgOiBudWxsO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFNtYXJ0VGVycmFpbiBleHRlbmRzIFRyYWNrZXIgaW1wbGVtZW50cyBkZWYuU21hcnRUZXJyYWluIHtcbiAgICBuYXRpdmVDbGFzcyA9IFZ1Zm9yaWFTbWFydFRlcnJhaW47XG4gICBcbiAgICBoaXRUZXN0KHN0YXRlOlN0YXRlLCBwb2ludDpkZWYuVmVjMiwgZGVmYXVsdERldmljZUhlaWdodDpudW1iZXIsaGludDpkZWYuSGl0VGVzdEhpbnQpIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFTbWFydFRlcnJhaW4uZ2V0SW5zdGFuY2UoKS5oaXRUZXN0V2l0aFN0YXRlUG9pbnREZXZpY2VIZWlnaHRIaW50KFxuICAgICAgICAgICAgc3RhdGUuaW9zLFxuICAgICAgICAgICAgcG9pbnQsXG4gICAgICAgICAgICBkZWZhdWx0RGV2aWNlSGVpZ2h0LFxuICAgICAgICAgICAgPG51bWJlcj5oaW50XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgZ2V0SGl0VGVzdFJlc3VsdENvdW50KCkge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNtYXJ0VGVycmFpbi5nZXRJbnN0YW5jZSgpLmhpdFRlc3RSZXN1bHRDb3VudCgpO1xuICAgIH1cblxuICAgIGdldEhpdFRlc3RSZXN1bHQoaWR4Om51bWJlcikge1xuICAgICAgICBjb25zdCByID0gVnVmb3JpYVNtYXJ0VGVycmFpbi5nZXRJbnN0YW5jZSgpLmdldEhpdFRlc3RSZXN1bHRBdEluZGV4KGlkeCk7XG4gICAgICAgIHJldHVybiBuZXcgSGl0VGVzdFJlc3VsdChyKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUcmFja2VyIGV4dGVuZHMgVHJhY2tlciBpbXBsZW1lbnRzIGRlZi5PYmplY3RUcmFja2VyIHtcbiAgICBuYXRpdmVDbGFzcyA9IFZ1Zm9yaWFPYmplY3RUcmFja2VyO1xuICAgIGNyZWF0ZURhdGFTZXQoKSA6IERhdGFTZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgZHMgPSBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLmNyZWF0ZURhdGFTZXQoKTtcbiAgICAgICAgaWYgKGRzKSByZXR1cm4gbmV3IERhdGFTZXQoZHMpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblx0ZGVzdHJveURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLmRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQuaW9zKTtcblx0fVxuICAgIGFjdGl2YXRlRGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLmFjdGl2YXRlRGF0YVNldChkYXRhU2V0Lmlvcyk7XG4gICAgfVxuICAgIGRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5pb3MpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGFwaSA9IFZVRk9SSUFfQVZBSUxBQkxFID8gbmV3IEFQSSgpIDogdW5kZWZpbmVkO1xuIl19