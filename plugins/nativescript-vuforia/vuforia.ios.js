"use strict";
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
var utils = require("utils/utils");
var common = require("./vuforia-common");
var application = require("application");
var placeholder = require("ui/placeholder");
exports.CameraCalibration = VuforiaCameraCalibration;
exports.Illumination = VuforiaIllumination;
global.moduleMerge(common, exports);
var VUFORIA_AVAILABLE = typeof VuforiaSession !== 'undefined';
var iosVideoView = (VUFORIA_AVAILABLE ? VuforiaVideoView.new() : undefined);
exports.videoView = new placeholder.Placeholder();
exports.videoView.on('creatingView', function (evt) {
    evt.view = iosVideoView;
});
exports.videoView.on('loaded', function () {
    if (VUFORIA_AVAILABLE)
        VuforiaSession.onSurfaceCreated();
});
exports.videoView.on('layoutChanged', function () {
    if (VUFORIA_AVAILABLE)
        configureVuforiaSurface();
});
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
                    VuforiaSession.registerUpdateCallback(function (state) {
                        if (_this.updateCallback)
                            _this.updateCallback(new State(state));
                    });
                    VuforiaSession.registerRenderCallback(function (state) {
                        if (_this.renderCallback)
                            _this.renderCallback(new State(state));
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
    API.prototype.setTargetFPS = function (f) {
        VuforiaSession.setTargetFPS(f);
    };
    API.prototype.getTargetFPS = function () {
        return VuforiaSession.targetFPS();
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
function wrapMatrix44(mat) {
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
        mat._15,
    ];
}
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
    State.prototype.getCameraCalibration = function () {
        return this.ios.getCameraCalibration();
    };
    State.prototype.getIllumination = function () {
        return this.ios.getIllumination();
    };
    State.prototype.getDeviceTrackableResult = function () {
        var result = this.ios.getDeviceTrackableResult();
        if (result)
            return new DeviceTrackableResult(result);
        return undefined;
    };
    return State;
}());
exports.State = State;
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
        return VuforiaCameraDevice.getInstance().getCameraCalibration();
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
        configureVuforiaSurface();
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
    RenderingPrimitives.prototype.getProjectionMatrix = function (viewID, cameraCalibration, near, far) {
        var projectionMatrix = this.ios.getProjectionMatrixCameraCalibrationNearFar(viewID, cameraCalibration, near, far);
        return wrapMatrix44(projectionMatrix);
    };
    RenderingPrimitives.prototype.getRenderingViews = function () {
        return new ViewList(this.ios.getRenderingViews());
    };
    RenderingPrimitives.prototype.getVideoBackgroundMesh = function (viewID) {
        var mesh = this.ios.getVideoBackgroundMesh(viewID);
        return new Mesh(mesh);
    };
    RenderingPrimitives.prototype.getVideoBackgroundProjectionMatrix = function (viewID) {
        return convertPerspectiveProjection2GLMatrix(this.ios.getVideoBackgroundProjectionMatrix(viewID), 0.01, 100000);
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
    Object.defineProperty(SmartTerrain.prototype, "_terrain", {
        get: function () {
            if (!this._smartTerrain)
                this._smartTerrain = VuforiaSmartTerrain.getInstance();
            return this._smartTerrain;
        },
        enumerable: true,
        configurable: true
    });
    SmartTerrain.prototype.hitTest = function (state, point, defaultDeviceHeight, hint) {
        this._terrain.hitTestWithStatePointDeviceHeightHint(state.ios, point, defaultDeviceHeight, hint);
    };
    SmartTerrain.prototype.getHitTestResultCount = function () {
        return this._terrain.hitTestResultCount();
    };
    SmartTerrain.prototype.getHitTestResult = function (idx) {
        var r = this._terrain.getHitTestResultAtIndex(idx);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBb0M7QUFDcEMseUNBQTBDO0FBRTFDLHlDQUEwQztBQUMxQyw0Q0FBNkM7QUFHaEMsUUFBQSxpQkFBaUIsR0FBRyx3QkFBd0IsQ0FBQTtBQUM1QyxRQUFBLFlBQVksR0FBRyxtQkFBbUIsQ0FBQTtBQUcvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVwQyxJQUFNLGlCQUFpQixHQUFHLE9BQU8sY0FBYyxLQUFLLFdBQVcsQ0FBQztBQUVoRSxJQUFNLFlBQVksR0FBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXBGLFFBQUEsU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZELGlCQUFTLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFDLEdBQUc7SUFDN0IsR0FBRyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUE7QUFDRixpQkFBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkIsSUFBSSxpQkFBaUI7UUFBRSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQTtBQUNGLGlCQUFTLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRTtJQUMxQixJQUFJLGlCQUFpQjtRQUFFLHVCQUF1QixFQUFFLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUE7QUFFRixXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUU7SUFDckMsSUFBSSxpQkFBaUIsRUFBRTtRQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFD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ZnJvbSAndXRpbHMvdXRpbHMnXG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi92dWZvcmlhLWNvbW1vbidcbmltcG9ydCAqIGFzIGRlZiBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSdcbmltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gJ2FwcGxpY2F0aW9uJ1xuaW1wb3J0ICogYXMgcGxhY2Vob2xkZXIgZnJvbSAndWkvcGxhY2Vob2xkZXInXG5cblxuZXhwb3J0IGNvbnN0IENhbWVyYUNhbGlicmF0aW9uID0gVnVmb3JpYUNhbWVyYUNhbGlicmF0aW9uXG5leHBvcnQgY29uc3QgSWxsdW1pbmF0aW9uID0gVnVmb3JpYUlsbHVtaW5hdGlvblxuXG5cbmdsb2JhbC5tb2R1bGVNZXJnZShjb21tb24sIGV4cG9ydHMpO1xuXG5jb25zdCBWVUZPUklBX0FWQUlMQUJMRSA9IHR5cGVvZiBWdWZvcmlhU2Vzc2lvbsKgIT09ICd1bmRlZmluZWQnO1xuXG5jb25zdCBpb3NWaWRlb1ZpZXcgPSA8VnVmb3JpYVZpZGVvVmlldz4gKFZVRk9SSUFfQVZBSUxBQkxFID8gVnVmb3JpYVZpZGVvVmlldy5uZXcoKSA6IHVuZGVmaW5lZCk7XG5cbmV4cG9ydCBjb25zdCB2aWRlb1ZpZXcgPSBuZXcgcGxhY2Vob2xkZXIuUGxhY2Vob2xkZXIoKTtcbnZpZGVvVmlldy5vbignY3JlYXRpbmdWaWV3JywgKGV2dCk9PntcbiAgICBldnQudmlldyA9IGlvc1ZpZGVvVmlldztcbn0pXG52aWRlb1ZpZXcub24oJ2xvYWRlZCcsICgpPT57XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSBWdWZvcmlhU2Vzc2lvbi5vblN1cmZhY2VDcmVhdGVkKCk7XG59KVxudmlkZW9WaWV3Lm9uKCdsYXlvdXRDaGFuZ2VkJywgKCkgPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbn0pXG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnN1c3BlbmRFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQYXVzaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25QYXVzZSgpO1xuICAgICAgICBpb3NWaWRlb1ZpZXcuZmluaXNoT3BlbkdMRVNDb21tYW5kcygpO1xuICAgICAgICBpb3NWaWRlb1ZpZXcuZnJlZU9wZW5HTEVTUmVzb3VyY2VzKCk7XG4gICAgfVxufSlcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpID0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihjb25maWd1cmVWdWZvcmlhU3VyZmFjZSk7IC8vIGRlbGF5IHVudGlsIHRoZSBpbnRlcmZhY2Ugb3JpZW50YXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDApO1xuICAgIH1cbn0pO1xuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZXN1bWluZyBWdWZvcmlhJyk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUmVzdW1lKCk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICB9XG59KVxuXG5leHBvcnQgZnVuY3Rpb24gY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKSB7XG4gICAgaWYgKCFhcGkpIHRocm93IG5ldyBFcnJvcigpO1xuICAgIGNvbnN0IGNvbnRlbnRTY2FsZUZhY3RvciA9IGlvc1ZpZGVvVmlldy5jb250ZW50U2NhbGVGYWN0b3I7XG4gICAgYXBpLm9uU3VyZmFjZUNoYW5nZWQoXG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmFtZS5zaXplLndpZHRoICogY29udGVudFNjYWxlRmFjdG9yLFxuICAgICAgICBpb3NWaWRlb1ZpZXcuZnJhbWUuc2l6ZS5oZWlnaHQgKiBjb250ZW50U2NhbGVGYWN0b3JcbiAgICApO1xufVxuXG5leHBvcnQgY2xhc3MgQVBJIGV4dGVuZHMgY29tbW9uLkFQSUJhc2Uge1xuICAgIFxuICAgIHByaXZhdGUgY2FtZXJhRGV2aWNlID0gbmV3IENhbWVyYURldmljZSgpO1xuICAgIHByaXZhdGUgZGV2aWNlID0gbmV3IERldmljZSgpO1xuICAgIHByaXZhdGUgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIoKTtcbiAgICBcbiAgICBzZXRMaWNlbnNlS2V5KGxpY2Vuc2VLZXk6c3RyaW5nKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2V0TGljZW5zZUtleShsaWNlbnNlS2V5KSA9PT0gMDtcbiAgICB9XG4gICAgXG4gICAgc2V0SGludChoaW50OmRlZi5IaW50LHZhbHVlOm51bWJlcikgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnNldEhpbnRWYWx1ZSg8bnVtYmVyPmhpbnQsIHZhbHVlKTtcbiAgICB9XG4gICAgXG4gICAgaW5pdCgpIDogUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8ZGVmLkluaXRSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLmluaXREb25lKChyZXN1bHQpPT57XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gVnVmb3JpYUluaXRSZXN1bHQuU1VDQ0VTUykge1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnJlZ2lzdGVyVXBkYXRlQ2FsbGJhY2soKHN0YXRlKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXBkYXRlQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVDYWxsYmFjayhuZXcgU3RhdGUoc3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnJlZ2lzdGVyUmVuZGVyQ2FsbGJhY2soKHN0YXRlKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmVuZGVyQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDYWxsYmFjayhuZXcgU3RhdGUoc3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoPGRlZi5Jbml0UmVzdWx0PjxudW1iZXI+cmVzdWx0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuICAgIGRlaW5pdCgpIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLmRlaW5pdCgpO1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblBhdXNlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURldmljZSgpIDogQ2FtZXJhRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FtZXJhRGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXREZXZpY2UoKSA6IERldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyZXIoKSA6IFJlbmRlcmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyZXI7XG4gICAgfVxuXG4gICAgaW5pdFNtYXJ0VGVycmFpbigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhU21hcnRUZXJyYWluLmluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMuc21hcnRUZXJyYWluID0gbmV3IFNtYXJ0VGVycmFpbigpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBkZWluaXRTbWFydFRlcnJhaW4oKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYU9iamVjdFRyYWNrZXIuZGVpbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaW5pdFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5pbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uYWxEZXZpY2VUcmFja2VyID0gbmV3IFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGRlaW5pdFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5kZWluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25hbERldmljZVRyYWNrZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFPYmplY3RUcmFja2VyLmluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IG5ldyBPYmplY3RUcmFja2VyKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFPYmplY3RUcmFja2VyLmRlaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHNldFNjYWxlRmFjdG9yKGY6bnVtYmVyKSB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yICYmIFZ1Zm9yaWFTZXNzaW9uLnNldFNjYWxlRmFjdG9yKGYpO1xuICAgIH1cblxuICAgIGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2NhbGVGYWN0b3IoKTtcbiAgICB9XG5cbiAgICBzZXRUYXJnZXRGUFMoZjpudW1iZXIpIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0VGFyZ2V0RlBTKGYpXG4gICAgfVxuXG4gICAgZ2V0VGFyZ2V0RlBTKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24udGFyZ2V0RlBTKClcbiAgICB9XG5cbiAgICBvblN1cmZhY2VDaGFuZ2VkKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ2hhbmdlZFdpZHRoSGVpZ2h0KHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbjpVSUludGVyZmFjZU9yaWVudGF0aW9uID0gdXRpbHMuaW9zLmdldHRlcihVSUFwcGxpY2F0aW9uLCBVSUFwcGxpY2F0aW9uLnNoYXJlZEFwcGxpY2F0aW9uKS5zdGF0dXNCYXJPcmllbnRhdGlvbjtcbiAgICAgICAgc3dpdGNoIChvcmllbnRhdGlvbikge1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdFVwc2lkZURvd246IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMjcwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVMZWZ0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzE4MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlUmlnaHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzkwKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd3JhcE1hdHJpeDQ0KG1hdDpWdWZvcmlhTWF0cml4NDQpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgbWF0Ll8wLFxuICAgICAgICBtYXQuXzEsXG4gICAgICAgIG1hdC5fMixcbiAgICAgICAgbWF0Ll8zLFxuICAgICAgICBtYXQuXzQsXG4gICAgICAgIG1hdC5fNSxcbiAgICAgICAgbWF0Ll82LFxuICAgICAgICBtYXQuXzcsXG4gICAgICAgIG1hdC5fOCxcbiAgICAgICAgbWF0Ll85LFxuICAgICAgICBtYXQuXzEwLFxuICAgICAgICBtYXQuXzExLFxuICAgICAgICBtYXQuXzEyLFxuICAgICAgICBtYXQuXzEzLFxuICAgICAgICBtYXQuXzE0LFxuICAgICAgICBtYXQuXzE1LFxuICAgIF07XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnQyR0xNYXRyaXgobWF0OlZ1Zm9yaWFNYXRyaXgzNCkgOiBkZWYuTWF0cml4NDQge1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIG1hdC5fMCxcbiAgICAgICAgICAgICAgICBtYXQuXzQsXG4gICAgICAgICAgICAgICAgbWF0Ll84LFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgbWF0Ll8xLFxuICAgICAgICAgICAgICAgIG1hdC5fNSxcbiAgICAgICAgICAgICAgICBtYXQuXzksXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzIsXG4gICAgICAgICAgICAgICAgbWF0Ll82LFxuICAgICAgICAgICAgICAgIG1hdC5fMTAsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzMsXG4gICAgICAgICAgICAgICAgbWF0Ll83LFxuICAgICAgICAgICAgICAgIG1hdC5fMTEsXG4gICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgXTtcbn1cblxuZnVuY3Rpb24gY29udmVydDJWdWZvcmlhTWF0cml4KG1hdDpkZWYuTWF0cml4NDQpIDogVnVmb3JpYU1hdHJpeDM0IHtcbiAgICByZXR1cm4gIHtcbiAgICAgICAgXzA6IG1hdFswXSxcbiAgICAgICAgXzE6IG1hdFs0XSxcbiAgICAgICAgXzI6IG1hdFs4XSxcbiAgICAgICAgXzM6IG1hdFsxMl0sXG4gICAgICAgIF80OiBtYXRbMV0sXG4gICAgICAgIF81OiBtYXRbNV0sXG4gICAgICAgIF82OiBtYXRbOV0sXG4gICAgICAgIF83OiBtYXRbMTNdLFxuICAgICAgICBfODogbWF0WzJdLFxuICAgICAgICBfOTogbWF0WzZdLFxuICAgICAgICBfMTA6IG1hdFsxMF0sXG4gICAgICAgIF8xMTogbWF0WzE0XVxuICAgIH07XG59XG5cbi8vIGh0dHBzOi8vbGlicmFyeS52dWZvcmlhLmNvbS9hcnRpY2xlcy9Tb2x1dGlvbi9Ib3ctVG8tQWNjZXNzLUNhbWVyYS1QYXJhbWV0ZXJzXG5mdW5jdGlvbiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KG1hdDpWdWZvcmlhTWF0cml4MzQsIG5lYXI6bnVtYmVyLCBmYXI6bnVtYmVyKSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgcmV0dXJuICBbXG4gICAgICAgICAgICAgICAgbWF0Ll8wLFxuICAgICAgICAgICAgICAgIG1hdC5fNCxcbiAgICAgICAgICAgICAgICBtYXQuXzgsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzEsXG4gICAgICAgICAgICAgICAgbWF0Ll81LFxuICAgICAgICAgICAgICAgIG1hdC5fOSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMixcbiAgICAgICAgICAgICAgICBtYXQuXzYsXG4gICAgICAgICAgICAgICAgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpLFxuICAgICAgICAgICAgICAgIDEsXG4gICAgICAgICAgICAgICAgbWF0Ll8zLFxuICAgICAgICAgICAgICAgIG1hdC5fNyxcbiAgICAgICAgICAgICAgICAtbmVhciAqICgxICsgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpKSxcbiAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICBdO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGUge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGUoaW9zOlZ1Zm9yaWFUcmFja2FibGUpIHtcbiAgICAgICAgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFBbmNob3IpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQW5jaG9yKGlvcyk7XG4gICAgICAgIH0gaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFEZXZpY2VUcmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGV2aWNlVHJhY2thYmxlKGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUltYWdlVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUN5bGluZGVyVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYU9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhVHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZShpb3MpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFUcmFja2FibGUpIHt9XG4gICAgXG4gICAgZ2V0SWQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldElkKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5hbWUoKTtcbiAgICB9XG4gICAgaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTtcbiAgICB9XG4gICAgc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxuICAgIHN0b3BFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGVSZXN1bHQge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGVSZXN1bHQoaW9zOlZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFBbmNob3JSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQW5jaG9yUmVzdWx0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYURldmljZVRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZXZpY2VUcmFja2FibGVSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFJbWFnZVRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldFJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0UmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldFJlc3VsdChpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlUmVzdWx0KGlvcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVRyYWNrYWJsZVJlc3VsdCkge31cbiAgICBcbiAgICBnZXRQb3NlKCk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldFBvc2UoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFRpbWVTdGFtcCgpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdGF0dXMoKTogZGVmLlRyYWNrYWJsZVJlc3VsdFN0YXR1cyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFN0YXR1cygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmFja2FibGUoKTogVHJhY2thYmxlIHtcbiAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodGhpcy5pb3MuZ2V0VHJhY2thYmxlKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERldmljZVRyYWNrYWJsZSBleHRlbmRzIFRyYWNrYWJsZSBpbXBsZW1lbnRzIGRlZi5EZXZpY2VUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYURldmljZVRyYWNrYWJsZSkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBEZXZpY2VUcmFja2FibGVSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgaW1wbGVtZW50cyBkZWYuRGV2aWNlVHJhY2thYmxlUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFEZXZpY2VUcmFja2FibGVSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgQW5jaG9yIGV4dGVuZHMgVHJhY2thYmxlIGltcGxlbWVudHMgZGVmLkFuY2hvciB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQW5jaG9yKSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIEFuY2hvclJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCBpbXBsZW1lbnRzIGRlZi5BbmNob3JSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUFuY2hvclJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUYXJnZXQgZXh0ZW5kcyBUcmFja2FibGUgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFPYmplY3RUYXJnZXQpIHtzdXBlcihpb3MpfVxuICAgIFxuICAgIGdldFVuaXF1ZVRhcmdldElkKCkgOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTaXplKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VGFyZ2V0UmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgSW1hZ2VUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFJbWFnZVRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSW1hZ2VUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU11bHRpVGFyZ2V0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgQ3lsaW5kZXJUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFDeWxpbmRlclRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hZ2Uge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUltYWdlKSB7fVxuICAgIFxuICAgIGdldEJ1ZmZlckhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0QnVmZmVySGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEJ1ZmZlcldpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0QnVmZmVyV2lkdGgoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9ybWF0KCk6IGRlZi5QaXhlbEZvcm1hdCB7IFxuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRGb3JtYXQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0SGVpZ2h0KCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBpeGVscygpOiBpbnRlcm9wLlBvaW50ZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBpeGVscygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdHJpZGUoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTdHJpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0V2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRXaWR0aCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZyYW1lIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFGcmFtZSkge31cbiAgICBnZXRJbWFnZShpZHg6IG51bWJlcik6IEltYWdlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGltZyA9IHRoaXMuaW9zLmdldEltYWdlKGlkeCk7XG4gICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2UoaW1nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SW5kZXgoKTtcbiAgICB9XG4gICAgZ2V0TnVtSW1hZ2VzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1JbWFnZXMoKTtcbiAgICB9XG4gICAgZ2V0VGltZVN0YW1wKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRUaW1lU3RhbXAoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhU3RhdGUpIHt9XG4gICAgZ2V0RnJhbWUoKTogRnJhbWUge1xuICAgICAgICBjb25zdCBmcmFtZSA9IHRoaXMuaW9zLmdldEZyYW1lKCk7XG4gICAgICAgIHJldHVybiBuZXcgRnJhbWUoZnJhbWUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVSZXN1bHRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogZGVmLlRyYWNrYWJsZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0cmFja2FibGUgPSB0aGlzLmlvcy5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGVSZXN1bHQoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlUmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZVJlc3VsdChpZHgpO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlUmVzdWx0LmNyZWF0ZVRyYWNrYWJsZVJlc3VsdChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldENhbWVyYUNhbGlicmF0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKVxuICAgIH1cbiAgICBnZXRJbGx1bWluYXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRJbGx1bWluYXRpb24oKVxuICAgIH1cbiAgICBnZXREZXZpY2VUcmFja2FibGVSZXN1bHQoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuaW9zLmdldERldmljZVRyYWNrYWJsZVJlc3VsdCgpXG4gICAgICAgIGlmIChyZXN1bHQpIHJldHVybiBuZXcgRGV2aWNlVHJhY2thYmxlUmVzdWx0KHJlc3VsdClcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYURldmljZSB7XG4gICAgaW5pdChjYW1lcmE6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5pbml0Q2FtZXJhKDxudW1iZXI+Y2FtZXJhKTtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmRlaW5pdENhbWVyYSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFDYWxpYnJhdGlvbigpOiBkZWYuQ2FtZXJhQ2FsaWJyYXRpb24ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURpcmVjdGlvbigpOiBkZWYuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+VnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYURpcmVjdGlvbigpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WaWRlb01vZGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TnVtVmlkZW9Nb2RlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb01vZGUobkluZGV4OiBudW1iZXIpOiBkZWYuVmlkZW9Nb2RlIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRWaWRlb01vZGUobkluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgc2VsZWN0VmlkZW9Nb2RlKGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWRlb01vZGUoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBzZXRGbGFzaFRvcmNoTW9kZShvbjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZsYXNoVG9yY2hNb2RlKG9uKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rm9jdXNNb2RlKGZvY3VzTW9kZTogZGVmLkNhbWVyYURldmljZUZvY3VzTW9kZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZvY3VzTW9kZSg8bnVtYmVyPmZvY3VzTW9kZSk7XG4gICAgfVxuICAgIFxuICAgIHN0YXJ0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIFxuICAgIHN0b3AoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RvcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3TGlzdCkge31cbiAgICBjb250YWlucyh2aWV3OiBkZWYuVmlldyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuY29udGFpbnMoPG51bWJlcj52aWV3KTtcbiAgICB9XG4gICAgZ2V0TnVtVmlld3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVZpZXdzKCk7XG4gICAgfVxuICAgIGdldFZpZXcoaWR4OiBudW1iZXIpOiBkZWYuVmlldyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFZpZXcoaWR4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3ZXJQYXJhbWV0ZXJzKSB7fVxuICAgIGNvbnRhaW5zTWFnbmV0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuY29udGFpbnNNYWduZXQoKTtcbiAgICB9XG4gICAgZ2V0QnV0dG9uVHlwZSgpOiBkZWYuVmlld2VyUGFyYW10ZXJzQnV0dG9uVHlwZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldEJ1dHRvblR5cGUoKTtcbiAgICB9XG4gICAgZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHgpO1xuICAgIH1cbiAgICBnZXRGaWVsZE9mVmlldygpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRGaWVsZE9mVmlldygpO1xuICAgIH1cbiAgICBnZXRJbnRlckxlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRMZW5zQ2VudHJlVG9UcmF5RGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TWFudWZhY3R1cmVyKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRNYW51ZmFjdHVyZXIoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TmFtZSgpO1xuICAgIH1cbiAgICBnZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk7XG4gICAgfVxuICAgIGdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRUcmF5QWxpZ25tZW50KCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNUcmF5QWxpZ25tZW50IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0VHJheUFsaWdubWVudCgpO1xuICAgIH1cbiAgICBnZXRWZXJzaW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRWZXJzaW9uKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVZpZXdlclBhcmFtZXRlcnNMaXN0KSB7fVxuICAgIGdldChpZHg6IG51bWJlcik6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmlvcy5nZXQoaWR4KTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXROYW1lTWFudWZhY3R1cmVyKG5hbWU6IHN0cmluZywgbWFudWZhY3R1cmVyOiBzdHJpbmcpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5pb3MuZ2V0TmFtZU1hbnVmYWN0dXJlcihuYW1lLCBtYW51ZmFjdHVyZXIpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHNldFNES0ZpbHRlcihmaWx0ZXI6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLmlvcy5zZXRTREtGaWx0ZXIoZmlsdGVyKTtcbiAgICB9XG4gICAgc2l6ZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc2l6ZSgpO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgRGV2aWNlIHtcbiAgICBzZXRNb2RlKG1vZGU6ZGVmLkRldmljZU1vZGUpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0TW9kZSg8bnVtYmVyPm1vZGUpO1xuICAgIH1cbiAgICBnZXRNb2RlKCkgOiBkZWYuRGV2aWNlTW9kZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPlZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRNb2RlKCk7XG4gICAgfVxuICAgIHNldFZpZXdlckFjdGl2ZShhY3RpdmU6Ym9vbGVhbikgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLnNldFZpZXdlckFjdGl2ZShhY3RpdmUpO1xuICAgIH1cbiAgICBpc1ZpZXdlckFjdGl2ZSgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG4gICAgZ2V0Vmlld2VyTGlzdCgpIDogVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgICAgICBjb25zdCB2aWV3ZXJMaXN0ID0gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZXdlckxpc3QoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCh2aWV3ZXJMaXN0KTtcbiAgICB9XG4gICAgc2VsZWN0Vmlld2VyKHZpZXdlcjpWaWV3ZXJQYXJhbWV0ZXJzKSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0Vmlld2VyKHZpZXdlci5pb3MpO1xuICAgIH1cbiAgICBnZXRTZWxlY3RlZFZpZXdlcigpIDogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBpZiAoIXRoaXMuaXNWaWV3ZXJBY3RpdmUoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRTZWxlY3RlZFZpZXdlcigpKTtcbiAgICB9XG4gICAgZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpOiBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZW5kZXJpbmdQcmltaXRpdmVzKFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmVyIHtcbiAgICBnZXRSZWNvbW1lbmRlZEZwcyhmbGFnczogZGVmLkZQU0hpbnQpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLmdldFJlY29tbWVuZGVkRnBzKDxudW1iZXI+ZmxhZ3MpO1xuICAgIH1cbiAgICBnZXRWaWRlb0JhY2tncm91bmRDb25maWcoKSA6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLmdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpO1xuICAgIH1cbiAgICBzZXRUYXJnZXRGcHMoZnBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFSZW5kZXJlci5zZXRUYXJnZXRGcHMoZnBzKTtcbiAgICB9XG4gICAgc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKGNmZzogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyk6IHZvaWQge1xuICAgICAgICBWdWZvcmlhUmVuZGVyZXIuc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKDxWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kQ29uZmlnPmNmZyk7XG4gICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKClcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNZXNoIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFNZXNoKSB7fVxuICAgIFxuICAgIGdldE5vcm1hbENvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgZ2V0Tm9ybWFscygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFscygpO1xuICAgIH1cbiAgICBnZXROdW1UcmlhbmdsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyaWFuZ2xlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WZXJ0aWNlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVmVydGljZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25Db29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25zKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQb3NpdGlvbnMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJpYW5nbGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VHJpYW5nbGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFVWQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRVVkNvb3JkaW5hdGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFVWcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VVZzKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc05vcm1hbHMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNOb3JtYWxzKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc1Bvc2l0aW9ucygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc1Bvc2l0aW9ucygpO1xuICAgIH1cbiAgICBcbiAgICBoYXNVVnMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNVVnMoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFSZW5kZXJpbmdQcmltaXRpdmVzKXt9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKHZpZXdJRDogZGVmLlZpZXcpOiBNZXNoIHtcbiAgICAgICAgY29uc3QgbWVzaCA9IHRoaXMuaW9zLmdldERpc3RvcnRpb25UZXh0dXJlTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZVNpemUoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgodmlld0lEOiBkZWYuVmlldyk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldE5vcm1hbGl6ZWRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjYW1lcmFDYWxpYnJhdGlvbjpkZWYuQ2FtZXJhQ2FsaWJyYXRpb24sIG5lYXI6bnVtYmVyLCBmYXI6bnVtYmVyKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgY29uc3QgcHJvamVjdGlvbk1hdHJpeCA9IHRoaXMuaW9zLmdldFByb2plY3Rpb25NYXRyaXhDYW1lcmFDYWxpYnJhdGlvbk5lYXJGYXIoXG4gICAgICAgICAgICA8bnVtYmVyPnZpZXdJRCwgXG4gICAgICAgICAgICBjYW1lcmFDYWxpYnJhdGlvbixcbiAgICAgICAgICAgIG5lYXIsIFxuICAgICAgICAgICAgZmFyXG4gICAgICAgIClcbiAgICAgICAgcmV0dXJuIHdyYXBNYXRyaXg0NChwcm9qZWN0aW9uTWF0cml4KVxuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJpbmdWaWV3cygpOiBWaWV3TGlzdCB7XG4gICAgICAgIHJldHVybiBuZXcgVmlld0xpc3QodGhpcy5pb3MuZ2V0UmVuZGVyaW5nVmlld3MoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZE1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgodGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCg8bnVtYmVyPnZpZXdJRCksICAwLjAxLCAxMDAwMDApO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Vmlld3BvcnQoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbn1cblxuY2xhc3MgRGF0YVNldCBpbXBsZW1lbnRzIGRlZi5EYXRhU2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFEYXRhU2V0KXt9XG4gICAgY3JlYXRlTXVsdGlUYXJnZXQobmFtZTogc3RyaW5nKTogTXVsdGlUYXJnZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgbXQgPSB0aGlzLmlvcy5jcmVhdGVNdWx0aVRhcmdldChuYW1lKTtcbiAgICAgICAgaWYgKG10KSByZXR1cm4gbmV3IE11bHRpVGFyZ2V0KG10KTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVzdHJveSh0cmFja2FibGU6IFRyYWNrYWJsZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZGVzdHJveSh0cmFja2FibGUuaW9zKTtcbiAgICB9XG4gICAgZXhpc3RzKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZXhpc3RzU3RvcmFnZVR5cGUocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBoYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTtcbiAgICB9XG4gICAgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5pc0FjdGl2ZSgpO1xuICAgIH1cbiAgICBsb2FkKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MubG9hZFN0b3JhZ2VUeXBlKHBhdGgsIDxudW1iZXI+c3RvcmFnZVR5cGUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRyYWNrZXIge1xuICAgIGFic3RyYWN0IG5hdGl2ZUNsYXNzIDogdHlwZW9mIFZ1Zm9yaWFUcmFja2VyICYge2dldEluc3RhbmNlKCk6VnVmb3JpYVRyYWNrZXJ9O1xuICAgIHN0YXJ0KCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmF0aXZlQ2xhc3MuZ2V0SW5zdGFuY2UoKS5zdGFydCgpO1xuICAgIH1cbiAgICBzdG9wKCkgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5uYXRpdmVDbGFzcy5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBIaXRUZXN0UmVzdWx0IGltcGxlbWVudHMgZGVmLkhpdFRlc3RSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUhpdFRlc3RSZXN1bHQpIHt9O1xuICAgIGdldFBvc2UoKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldFBvc2UoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9zaXRpb25hbERldmljZVRyYWNrZXIgZXh0ZW5kcyBUcmFja2VyIGltcGxlbWVudHMgZGVmLlBvc2l0aW9uYWxEZXZpY2VUcmFja2VyIHtcbiAgICBuYXRpdmVDbGFzcyA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcjtcbiAgICBjcmVhdGVBbmNob3JGcm9tUG9zZShuYW1lOiBzdHJpbmcsIHBvc2U6IGRlZi5NYXRyaXg0NCk6IGRlZi5BbmNob3IgfCBudWxsIHtcbiAgICAgICAgY29uc3QgdnVmb3JpYVBvc2UgPSBjb252ZXJ0MlZ1Zm9yaWFNYXRyaXgocG9zZSk7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFBbmNob3IgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVBbmNob3JXaXRoTmFtZVBvc2UobmFtZSwgdnVmb3JpYVBvc2UpO1xuICAgICAgICByZXR1cm4gdnVmb3JpYUFuY2hvciA/IG5ldyBBbmNob3IodnVmb3JpYUFuY2hvcikgOiBudWxsO1xuICAgIH1cbiAgICBjcmVhdGVBbmNob3JGcm9tSGl0VGVzdFJlc3VsdChuYW1lOiBzdHJpbmcsIGhpdFRlc3RSZXN1bHQ6IEhpdFRlc3RSZXN1bHQpOiBkZWYuQW5jaG9yIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFBbmNob3IgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVBbmNob3JXaXRoTmFtZUhpdFRlc3RSZXN1bHQobmFtZSwgaGl0VGVzdFJlc3VsdC5pb3MpO1xuICAgICAgICByZXR1cm4gdnVmb3JpYUFuY2hvciA/IG5ldyBBbmNob3IodnVmb3JpYUFuY2hvcikgOiBudWxsO1xuICAgIH1cbiAgICBkZXN0cm95QW5jaG9yKGFuY2hvcjogQW5jaG9yKSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZXN0cm95QW5jaG9yKGFuY2hvci5pb3MpO1xuICAgIH1cbiAgICBnZXROdW1BbmNob3JzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5udW1BbmNob3JzKCk7XG4gICAgfVxuICAgIGdldEFuY2hvcihpZHg6IG51bWJlcik6IGRlZi5BbmNob3IgfCBudWxsIHtcbiAgICAgICAgY29uc3QgdnVmb3JpYUFuY2hvciA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5nZXRJbnN0YW5jZSgpLmdldEFuY2hvckF0SW5kZXgoaWR4KTtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWFBbmNob3IgPyBuZXcgQW5jaG9yKHZ1Zm9yaWFBbmNob3IpIDogbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTbWFydFRlcnJhaW4gZXh0ZW5kcyBUcmFja2VyIGltcGxlbWVudHMgZGVmLlNtYXJ0VGVycmFpbiB7XG4gICAgbmF0aXZlQ2xhc3MgPSBWdWZvcmlhU21hcnRUZXJyYWluO1xuXG4gICAgcHJpdmF0ZSBfc21hcnRUZXJyYWluOlZ1Zm9yaWFTbWFydFRlcnJhaW5cblxuICAgIGdldCBfdGVycmFpbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9zbWFydFRlcnJhaW4pIHRoaXMuX3NtYXJ0VGVycmFpbiA9IFZ1Zm9yaWFTbWFydFRlcnJhaW4uZ2V0SW5zdGFuY2UoKVxuICAgICAgICByZXR1cm4gdGhpcy5fc21hcnRUZXJyYWluXG4gICAgfVxuICAgXG4gICAgaGl0VGVzdChzdGF0ZTpTdGF0ZSwgcG9pbnQ6ZGVmLlZlYzIsIGRlZmF1bHREZXZpY2VIZWlnaHQ6bnVtYmVyLGhpbnQ6ZGVmLkhpdFRlc3RIaW50KSA6IHZvaWQge1xuICAgICAgICB0aGlzLl90ZXJyYWluLmhpdFRlc3RXaXRoU3RhdGVQb2ludERldmljZUhlaWdodEhpbnQoXG4gICAgICAgICAgICBzdGF0ZS5pb3MsXG4gICAgICAgICAgICBwb2ludCxcbiAgICAgICAgICAgIGRlZmF1bHREZXZpY2VIZWlnaHQsXG4gICAgICAgICAgICA8bnVtYmVyPmhpbnRcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBnZXRIaXRUZXN0UmVzdWx0Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90ZXJyYWluLmhpdFRlc3RSZXN1bHRDb3VudCgpO1xuICAgIH1cblxuICAgIGdldEhpdFRlc3RSZXN1bHQoaWR4Om51bWJlcikge1xuICAgICAgICBjb25zdCByID0gdGhpcy5fdGVycmFpbi5nZXRIaXRUZXN0UmVzdWx0QXRJbmRleChpZHgpO1xuICAgICAgICByZXR1cm4gbmV3IEhpdFRlc3RSZXN1bHQocik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VHJhY2tlciBleHRlbmRzIFRyYWNrZXIgaW1wbGVtZW50cyBkZWYuT2JqZWN0VHJhY2tlciB7XG4gICAgbmF0aXZlQ2xhc3MgPSBWdWZvcmlhT2JqZWN0VHJhY2tlcjtcbiAgICBjcmVhdGVEYXRhU2V0KCkgOiBEYXRhU2V0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGRzID0gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVEYXRhU2V0KCk7XG4gICAgICAgIGlmIChkcykgcmV0dXJuIG5ldyBEYXRhU2V0KGRzKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cdGRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcblx0XHRyZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZXN0cm95RGF0YVNldChkYXRhU2V0Lmlvcyk7XG5cdH1cbiAgICBhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5hY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5pb3MpO1xuICAgIH1cbiAgICBkZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuaW9zKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcGkgPSBWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBBUEkoKSA6IHVuZGVmaW5lZDtcbiJdfQ==