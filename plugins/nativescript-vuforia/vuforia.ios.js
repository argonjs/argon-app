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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBb0M7QUFDcEMseUNBQTBDO0FBRTFDLHlDQUEwQztBQUMxQyw0Q0FBNkM7QUFHaEMsUUFBQSxpQkFBaUIsR0FBRyx3QkFBd0IsQ0FBQTtBQUM1QyxRQUFBLFlBQVksR0FBRyxtQkFBbUIsQ0FBQTtBQUcvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVwQyxJQUFNLGlCQUFpQixHQUFHLE9BQU8sY0FBYyxLQUFLLFdBQVcsQ0FBQztBQUVoRSxJQUFNLFlBQVksR0FBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXBGLFFBQUEsU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZELGlCQUFTLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFDLEdBQUc7SUFDN0IsR0FBRyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUE7QUFDRixpQkFBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkIsSUFBSSxpQkFBaUI7UUFBRSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQTtBQUNGLGlCQUFTLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRTtJQUMxQixJQUFJLGlCQUFpQjtRQUFFLHVCQUF1QixFQUFFLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUE7QUFFRixXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUU7SUFDckMsSUFBSSxpQkFBaUIsRUFBRTtRQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFD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Q0FBTztJQUExQztRQUFBLHFFQWdCQztRQWZHLGlCQUFXLEdBQUcsb0JBQW9CLENBQUM7O0lBZXZDLENBQUM7SUFkRyxxQ0FBYSxHQUFiO1FBQ0ksSUFBTSxFQUFFLEdBQUcsb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDOUQsSUFBSSxFQUFFO1lBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixPQUFPLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBQ0osc0NBQWMsR0FBZCxVQUFlLE9BQWU7UUFDN0IsT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFDRSx1Q0FBZSxHQUFmLFVBQWdCLE9BQWU7UUFDM0IsT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFDRCx5Q0FBaUIsR0FBakIsVUFBa0IsT0FBZTtRQUM3QixPQUFPLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBQ0wsb0JBQUM7QUFBRCxDQUFDLEFBaEJELENBQW1DLE9BQU8sR0FnQnpDO0FBaEJZLHNDQUFhO0FBa0JiLFFBQUEsR0FBRyxHQUFHLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscydcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL3Z1Zm9yaWEtY29tbW9uJ1xuaW1wb3J0ICogYXMgZGVmIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJ1xuaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSAnYXBwbGljYXRpb24nXG5pbXBvcnQgKiBhcyBwbGFjZWhvbGRlciBmcm9tICd1aS9wbGFjZWhvbGRlcidcblxuXG5leHBvcnQgY29uc3QgQ2FtZXJhQ2FsaWJyYXRpb24gPSBWdWZvcmlhQ2FtZXJhQ2FsaWJyYXRpb25cbmV4cG9ydCBjb25zdCBJbGx1bWluYXRpb24gPSBWdWZvcmlhSWxsdW1pbmF0aW9uXG5cblxuZ2xvYmFsLm1vZHVsZU1lcmdlKGNvbW1vbiwgZXhwb3J0cyk7XG5cbmNvbnN0IFZVRk9SSUFfQVZBSUxBQkxFID0gdHlwZW9mIFZ1Zm9yaWFTZXNzaW9uwqAhPT0gJ3VuZGVmaW5lZCc7XG5cbmNvbnN0IGlvc1ZpZGVvVmlldyA9IDxWdWZvcmlhVmlkZW9WaWV3PiAoVlVGT1JJQV9BVkFJTEFCTEUgPyBWdWZvcmlhVmlkZW9WaWV3Lm5ldygpIDogdW5kZWZpbmVkKTtcblxuZXhwb3J0IGNvbnN0IHZpZGVvVmlldyA9IG5ldyBwbGFjZWhvbGRlci5QbGFjZWhvbGRlcigpO1xudmlkZW9WaWV3Lm9uKCdjcmVhdGluZ1ZpZXcnLCAoZXZ0KT0+e1xuICAgIGV2dC52aWV3ID0gaW9zVmlkZW9WaWV3O1xufSlcbnZpZGVvVmlldy5vbignbG9hZGVkJywgKCk9PntcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbn0pXG52aWRlb1ZpZXcub24oJ2xheW91dENoYW5nZWQnLCAoKSA9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xufSlcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24uc3VzcGVuZEV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BhdXNpbmcgVnVmb3JpYScpO1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblBhdXNlKCk7XG4gICAgICAgIGlvc1ZpZGVvVmlldy5maW5pc2hPcGVuR0xFU0NvbW1hbmRzKCk7XG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmVlT3BlbkdMRVNSZXNvdXJjZXMoKTtcbiAgICB9XG59KVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCkgPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKTsgLy8gZGVsYXkgdW50aWwgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBhY3R1YWxseSBjaGFuZ2VzXG4gICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDUwMCk7XG4gICAgfVxufSk7XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnJlc3VtZUV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Jlc3VtaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25SZXN1bWUoKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgIH1cbn0pXG5cbmV4cG9ydCBmdW5jdGlvbiBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpIHtcbiAgICBpZiAoIWFwaSkgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gaW9zVmlkZW9WaWV3LmNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICBhcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZyYW1lLnNpemUud2lkdGggKiBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmFtZS5zaXplLmhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICk7XG59XG5cbmV4cG9ydCBjbGFzcyBBUEkgZXh0ZW5kcyBjb21tb24uQVBJQmFzZSB7XG4gICAgXG4gICAgcHJpdmF0ZSBjYW1lcmFEZXZpY2UgPSBuZXcgQ2FtZXJhRGV2aWNlKCk7XG4gICAgcHJpdmF0ZSBkZXZpY2UgPSBuZXcgRGV2aWNlKCk7XG4gICAgcHJpdmF0ZSByZW5kZXJlciA9IG5ldyBSZW5kZXJlcigpO1xuICAgIFxuICAgIHNldExpY2Vuc2VLZXkobGljZW5zZUtleTpzdHJpbmcpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU2Vzc2lvbi5zZXRMaWNlbnNlS2V5KGxpY2Vuc2VLZXkpID09PSAwO1xuICAgIH1cbiAgICBcbiAgICBzZXRIaW50KGhpbnQ6ZGVmLkhpbnQsdmFsdWU6bnVtYmVyKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2V0SGludFZhbHVlKDxudW1iZXI+aGludCwgdmFsdWUpO1xuICAgIH1cbiAgICBcbiAgICBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uaW5pdERvbmUoKHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09PSBWdWZvcmlhSW5pdFJlc3VsdC5TVUNDRVNTKSB7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24ucmVnaXN0ZXJVcGRhdGVDYWxsYmFjaygoc3RhdGUpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cGRhdGVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUNhbGxiYWNrKG5ldyBTdGF0ZShzdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24ucmVnaXN0ZXJSZW5kZXJDYWxsYmFjaygoc3RhdGUpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5yZW5kZXJDYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckNhbGxiYWNrKG5ldyBTdGF0ZShzdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24ub25SZXN1bWUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSg8ZGVmLkluaXRSZXN1bHQ+PG51bWJlcj5yZXN1bHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCkgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24uZGVpbml0KCk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUGF1c2UoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGV2aWNlKCkgOiBDYW1lcmFEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5jYW1lcmFEZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldERldmljZSgpIDogRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJlcigpIDogUmVuZGVyZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJlcjtcbiAgICB9XG5cbiAgICBpbml0U21hcnRUZXJyYWluKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFTbWFydFRlcnJhaW4uaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5zbWFydFRlcnJhaW4gPSBuZXcgU21hcnRUZXJyYWluKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGRlaW5pdFNtYXJ0VGVycmFpbigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhT2JqZWN0VHJhY2tlci5kZWluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25hbERldmljZVRyYWNrZXIgPSBuZXcgUG9zaXRpb25hbERldmljZVRyYWNrZXIoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZGVpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmRlaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbmFsRGV2aWNlVHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaW5pdE9iamVjdFRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYU9iamVjdFRyYWNrZXIuaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gbmV3IE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdE9iamVjdFRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYU9iamVjdFRyYWNrZXIuZGVpbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgc2V0U2NhbGVGYWN0b3IoZjpudW1iZXIpIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IgJiYgVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IoZik7XG4gICAgfVxuXG4gICAgZ2V0U2NhbGVGYWN0b3IoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU2Vzc2lvbi5zY2FsZUZhY3RvcigpO1xuICAgIH1cblxuICAgIHNldFRhcmdldEZQUyhmOm51bWJlcikge1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRUYXJnZXRGUFMoZilcbiAgICB9XG5cbiAgICBnZXRUYXJnZXRGUFMoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU2Vzc2lvbi50YXJnZXRGUFMoKVxuICAgIH1cblxuICAgIG9uU3VyZmFjZUNoYW5nZWQod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyKSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblN1cmZhY2VDaGFuZ2VkV2lkdGhIZWlnaHQod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnN0IG9yaWVudGF0aW9uOlVJSW50ZXJmYWNlT3JpZW50YXRpb24gPSB1dGlscy5pb3MuZ2V0dGVyKFVJQXBwbGljYXRpb24sIFVJQXBwbGljYXRpb24uc2hhcmVkQXBwbGljYXRpb24pLnN0YXR1c0Jhck9yaWVudGF0aW9uO1xuICAgICAgICBzd2l0Y2ggKG9yaWVudGF0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfOTApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0VXBzaWRlRG93bjogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18yNzApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLkxhbmRzY2FwZUxlZnQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMTgwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVSaWdodDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18wKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfOTApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiB3cmFwTWF0cml4NDQobWF0OlZ1Zm9yaWFNYXRyaXg0NCkgOiBkZWYuTWF0cml4NDQge1xuICAgIHJldHVybiAgW1xuICAgICAgICBtYXQuXzAsXG4gICAgICAgIG1hdC5fMSxcbiAgICAgICAgbWF0Ll8yLFxuICAgICAgICBtYXQuXzMsXG4gICAgICAgIG1hdC5fNCxcbiAgICAgICAgbWF0Ll81LFxuICAgICAgICBtYXQuXzYsXG4gICAgICAgIG1hdC5fNyxcbiAgICAgICAgbWF0Ll84LFxuICAgICAgICBtYXQuXzksXG4gICAgICAgIG1hdC5fMTAsXG4gICAgICAgIG1hdC5fMTEsXG4gICAgICAgIG1hdC5fMTIsXG4gICAgICAgIG1hdC5fMTMsXG4gICAgICAgIG1hdC5fMTQsXG4gICAgICAgIG1hdC5fMTUsXG4gICAgXTtcbn1cblxuZnVuY3Rpb24gY29udmVydDJHTE1hdHJpeChtYXQ6VnVmb3JpYU1hdHJpeDM0KSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgcmV0dXJuICBbXG4gICAgICAgICAgICAgICAgbWF0Ll8wLFxuICAgICAgICAgICAgICAgIG1hdC5fNCxcbiAgICAgICAgICAgICAgICBtYXQuXzgsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzEsXG4gICAgICAgICAgICAgICAgbWF0Ll81LFxuICAgICAgICAgICAgICAgIG1hdC5fOSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMixcbiAgICAgICAgICAgICAgICBtYXQuXzYsXG4gICAgICAgICAgICAgICAgbWF0Ll8xMCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMyxcbiAgICAgICAgICAgICAgICBtYXQuXzcsXG4gICAgICAgICAgICAgICAgbWF0Ll8xMSxcbiAgICAgICAgICAgICAgICAxXG4gICAgICAgICAgICBdO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0MlZ1Zm9yaWFNYXRyaXgobWF0OmRlZi5NYXRyaXg0NCkgOiBWdWZvcmlhTWF0cml4MzQge1xuICAgIHJldHVybiAge1xuICAgICAgICBfMDogbWF0WzBdLFxuICAgICAgICBfMTogbWF0WzRdLFxuICAgICAgICBfMjogbWF0WzhdLFxuICAgICAgICBfMzogbWF0WzEyXSxcbiAgICAgICAgXzQ6IG1hdFsxXSxcbiAgICAgICAgXzU6IG1hdFs1XSxcbiAgICAgICAgXzY6IG1hdFs5XSxcbiAgICAgICAgXzc6IG1hdFsxM10sXG4gICAgICAgIF84OiBtYXRbMl0sXG4gICAgICAgIF85OiBtYXRbNl0sXG4gICAgICAgIF8xMDogbWF0WzEwXSxcbiAgICAgICAgXzExOiBtYXRbMTRdXG4gICAgfTtcbn1cblxuLy8gaHR0cHM6Ly9saWJyYXJ5LnZ1Zm9yaWEuY29tL2FydGljbGVzL1NvbHV0aW9uL0hvdy1Uby1BY2Nlc3MtQ2FtZXJhLVBhcmFtZXRlcnNcbmZ1bmN0aW9uIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgobWF0OlZ1Zm9yaWFNYXRyaXgzNCwgbmVhcjpudW1iZXIsIGZhcjpudW1iZXIpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgICAgICAgICBtYXQuXzAsXG4gICAgICAgICAgICAgICAgbWF0Ll80LFxuICAgICAgICAgICAgICAgIG1hdC5fOCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMSxcbiAgICAgICAgICAgICAgICBtYXQuXzUsXG4gICAgICAgICAgICAgICAgbWF0Ll85LFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgbWF0Ll8yLFxuICAgICAgICAgICAgICAgIG1hdC5fNixcbiAgICAgICAgICAgICAgICAoZmFyICsgbmVhcikgLyAoZmFyIC0gbmVhciksXG4gICAgICAgICAgICAgICAgMSxcbiAgICAgICAgICAgICAgICBtYXQuXzMsXG4gICAgICAgICAgICAgICAgbWF0Ll83LFxuICAgICAgICAgICAgICAgIC1uZWFyICogKDEgKyAoZmFyICsgbmVhcikgLyAoZmFyIC0gbmVhcikpLFxuICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgIF07XG59XG5cblxuZXhwb3J0IGNsYXNzIFRyYWNrYWJsZSB7XG4gICAgXG4gICAgc3RhdGljIGNyZWF0ZVRyYWNrYWJsZShpb3M6VnVmb3JpYVRyYWNrYWJsZSkge1xuICAgICAgICBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUFuY2hvcikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBbmNob3IoaW9zKTtcbiAgICAgICAgfSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYURldmljZVRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZXZpY2VUcmFja2FibGUoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhSW1hZ2VUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2VUYXJnZXQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhQ3lsaW5kZXJUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhT2JqZWN0VGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldChpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFUcmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlKGlvcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVRyYWNrYWJsZSkge31cbiAgICBcbiAgICBnZXRJZCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SWQoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TmFtZSgpO1xuICAgIH1cbiAgICBpc0V4dGVuZGVkVHJhY2tpbmdTdGFydGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpO1xuICAgIH1cbiAgICBzdGFydEV4dGVuZGVkVHJhY2tpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5zdGFydEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG4gICAgc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5zdG9wRXh0ZW5kZWRUcmFja2luZygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRyYWNrYWJsZVJlc3VsdCB7XG4gICAgXG4gICAgc3RhdGljIGNyZWF0ZVRyYWNrYWJsZVJlc3VsdChpb3M6VnVmb3JpYVRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUFuY2hvclJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBbmNob3JSZXN1bHQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhRGV2aWNlVHJhY2thYmxlUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERldmljZVRyYWNrYWJsZVJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUltYWdlVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0UmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3lsaW5kZXJUYXJnZXRSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFPYmplY3RUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0UmVzdWx0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYVRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGVSZXN1bHQoaW9zKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVHJhY2thYmxlUmVzdWx0KSB7fVxuICAgIFxuICAgIGdldFBvc2UoKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnQyR0xNYXRyaXgodGhpcy5pb3MuZ2V0UG9zZSgpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VGltZVN0YW1wKCkgOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VGltZVN0YW1wKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFN0YXR1cygpOiBkZWYuVHJhY2thYmxlUmVzdWx0U3RhdHVzIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0U3RhdHVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFRyYWNrYWJsZSgpOiBUcmFja2FibGUge1xuICAgICAgICByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0aGlzLmlvcy5nZXRUcmFja2FibGUoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGV2aWNlVHJhY2thYmxlIGV4dGVuZHMgVHJhY2thYmxlIGltcGxlbWVudHMgZGVmLkRldmljZVRyYWNrYWJsZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhRGV2aWNlVHJhY2thYmxlKSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIERldmljZVRyYWNrYWJsZVJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCBpbXBsZW1lbnRzIGRlZi5EZXZpY2VUcmFja2FibGVSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYURldmljZVRyYWNrYWJsZVJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmNob3IgZXh0ZW5kcyBUcmFja2FibGUgaW1wbGVtZW50cyBkZWYuQW5jaG9yIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFBbmNob3IpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgQW5jaG9yUmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IGltcGxlbWVudHMgZGVmLkFuY2hvclJlc3VsdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQW5jaG9yUmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldCBleHRlbmRzIFRyYWNrYWJsZSB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU9iamVjdFRhcmdldCkge3N1cGVyKGlvcyl9XG4gICAgXG4gICAgZ2V0VW5pcXVlVGFyZ2V0SWQoKSA6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRVbmlxdWVUYXJnZXRJZCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTaXplKCk6IGRlZi5WZWMzIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFNpemUoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUYXJnZXRSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFPYmplY3RUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBJbWFnZVRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUltYWdlVGFyZ2V0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgSW1hZ2VUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFJbWFnZVRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBNdWx0aVRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhTXVsdGlUYXJnZXQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFPYmplY3RUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBDeWxpbmRlclRhcmdldCBleHRlbmRzIE9iamVjdFRhcmdldCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUN5bGluZGVyVGFyZ2V0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgQ3lsaW5kZXJUYXJnZXRSZXN1bHQgZXh0ZW5kcyBPYmplY3RUYXJnZXRSZXN1bHQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFDeWxpbmRlclRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBJbWFnZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSW1hZ2UpIHt9XG4gICAgXG4gICAgZ2V0QnVmZmVySGVpZ2h0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRCdWZmZXJIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0QnVmZmVyV2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRCdWZmZXJXaWR0aCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGb3JtYXQoKTogZGVmLlBpeGVsRm9ybWF0IHsgXG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldEZvcm1hdCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRIZWlnaHQoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRIZWlnaHQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UGl4ZWxzKCk6IGludGVyb3AuUG9pbnRlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UGl4ZWxzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFN0cmlkZSgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFN0cmlkZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFdpZHRoKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRnJhbWUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUZyYW1lKSB7fVxuICAgIGdldEltYWdlKGlkeDogbnVtYmVyKTogSW1hZ2V8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgaW1nID0gdGhpcy5pb3MuZ2V0SW1hZ2UoaWR4KTtcbiAgICAgICAgaWYgKGltZykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZShpbWcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldEluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRJbmRleCgpO1xuICAgIH1cbiAgICBnZXROdW1JbWFnZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bUltYWdlcygpO1xuICAgIH1cbiAgICBnZXRUaW1lU3RhbXAoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFTdGF0ZSkge31cbiAgICBnZXRGcmFtZSgpOiBGcmFtZSB7XG4gICAgICAgIGNvbnN0IGZyYW1lID0gdGhpcy5pb3MuZ2V0RnJhbWUoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFtZShmcmFtZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZVJlc3VsdHMoKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJhY2thYmxlcygpO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGUoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZVJlc3VsdChpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGVSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5pb3MuZ2V0VHJhY2thYmxlUmVzdWx0KGlkeCk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBUcmFja2FibGVSZXN1bHQuY3JlYXRlVHJhY2thYmxlUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRDYW1lcmFDYWxpYnJhdGlvbigpXG4gICAgfVxuICAgIGdldElsbHVtaW5hdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldElsbHVtaW5hdGlvbigpXG4gICAgfVxuICAgIGdldERldmljZVRyYWNrYWJsZVJlc3VsdCgpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5pb3MuZ2V0RGV2aWNlVHJhY2thYmxlUmVzdWx0KClcbiAgICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIG5ldyBEZXZpY2VUcmFja2FibGVSZXN1bHQocmVzdWx0KVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhRGV2aWNlIHtcbiAgICBpbml0KGNhbWVyYTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmluaXRDYW1lcmEoPG51bWJlcj5jYW1lcmEpO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZGVpbml0Q2FtZXJhKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYUNhbGlicmF0aW9uKCk6IGRlZi5DYW1lcmFDYWxpYnJhdGlvbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGlyZWN0aW9uKCk6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24ge1xuICAgICAgICByZXR1cm4gPG51bWJlcj5WdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhRGlyZWN0aW9uKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZpZGVvTW9kZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXROdW1WaWRlb01vZGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvTW9kZShuSW5kZXg6IG51bWJlcik6IGRlZi5WaWRlb01vZGUge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZGVvTW9kZShuSW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBzZWxlY3RWaWRlb01vZGUoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZGVvTW9kZShpbmRleCk7XG4gICAgfVxuICAgIFxuICAgIHNldEZsYXNoVG9yY2hNb2RlKG9uOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Rmxhc2hUb3JjaE1vZGUob24pO1xuICAgIH1cbiAgICBcbiAgICBzZXRGb2N1c01vZGUoZm9jdXNNb2RlOiBkZWYuQ2FtZXJhRGV2aWNlRm9jdXNNb2RlKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Rm9jdXNNb2RlKDxudW1iZXI+Zm9jdXNNb2RlKTtcbiAgICB9XG4gICAgXG4gICAgc3RhcnQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RhcnQoKTtcbiAgICB9XG4gICAgXG4gICAgc3RvcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zdG9wKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld0xpc3Qge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVZpZXdMaXN0KSB7fVxuICAgIGNvbnRhaW5zKHZpZXc6IGRlZi5WaWV3KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5jb250YWlucyg8bnVtYmVyPnZpZXcpO1xuICAgIH1cbiAgICBnZXROdW1WaWV3cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVmlld3MoKTtcbiAgICB9XG4gICAgZ2V0VmlldyhpZHg6IG51bWJlcik6IGRlZi5WaWV3IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0VmlldyhpZHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnMge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVZpZXdlclBhcmFtZXRlcnMpIHt9XG4gICAgY29udGFpbnNNYWduZXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5jb250YWluc01hZ25ldCgpO1xuICAgIH1cbiAgICBnZXRCdXR0b25UeXBlKCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNCdXR0b25UeXBlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0QnV0dG9uVHlwZSgpO1xuICAgIH1cbiAgICBnZXREaXN0b3J0aW9uQ29lZmZpY2llbnQoaWR4OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeCk7XG4gICAgfVxuICAgIGdldEZpZWxkT2ZWaWV3KCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEZpZWxkT2ZWaWV3KCk7XG4gICAgfVxuICAgIGdldEludGVyTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRJbnRlckxlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRMZW5zQ2VudHJlVG9UcmF5RGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRNYW51ZmFjdHVyZXIoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE1hbnVmYWN0dXJlcigpO1xuICAgIH1cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROYW1lKCk7XG4gICAgfVxuICAgIGdldE51bURpc3RvcnRpb25Db2VmZmljaWVudHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bURpc3RvcnRpb25Db2VmZmljaWVudHMoKTtcbiAgICB9XG4gICAgZ2V0U2NyZWVuVG9MZW5zRGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldFRyYXlBbGlnbm1lbnQoKTogZGVmLlZpZXdlclBhcmFtdGVyc1RyYXlBbGlnbm1lbnQge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRUcmF5QWxpZ25tZW50KCk7XG4gICAgfVxuICAgIGdldFZlcnNpb24oKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFZlcnNpb24oKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVmlld2VyUGFyYW1ldGVyc0xpc3QpIHt9XG4gICAgZ2V0KGlkeDogbnVtYmVyKTogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB2cCA9IHRoaXMuaW9zLmdldChpZHgpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGdldE5hbWVNYW51ZmFjdHVyZXIobmFtZTogc3RyaW5nLCBtYW51ZmFjdHVyZXI6IHN0cmluZyk6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmlvcy5nZXROYW1lTWFudWZhY3R1cmVyKG5hbWUsIG1hbnVmYWN0dXJlcik7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgc2V0U0RLRmlsdGVyKGZpbHRlcjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMuaW9zLnNldFNES0ZpbHRlcihmaWx0ZXIpO1xuICAgIH1cbiAgICBzaXplKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5zaXplKCk7XG4gICAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBEZXZpY2Uge1xuICAgIHNldE1vZGUobW9kZTpkZWYuRGV2aWNlTW9kZSkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRNb2RlKDxudW1iZXI+bW9kZSk7XG4gICAgfVxuICAgIGdldE1vZGUoKSA6IGRlZi5EZXZpY2VNb2RlIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+VnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldE1vZGUoKTtcbiAgICB9XG4gICAgc2V0Vmlld2VyQWN0aXZlKGFjdGl2ZTpib29sZWFuKSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0Vmlld2VyQWN0aXZlKGFjdGl2ZSk7XG4gICAgfVxuICAgIGlzVmlld2VyQWN0aXZlKCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5pc1ZpZXdlckFjdGl2ZSgpO1xuICAgIH1cbiAgICBnZXRWaWV3ZXJMaXN0KCkgOiBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCB7XG4gICAgICAgIGNvbnN0IHZpZXdlckxpc3QgPSBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Vmlld2VyTGlzdCgpO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnNMaXN0KHZpZXdlckxpc3QpO1xuICAgIH1cbiAgICBzZWxlY3RWaWV3ZXIodmlld2VyOlZpZXdlclBhcmFtZXRlcnMpIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWV3ZXIodmlld2VyLmlvcyk7XG4gICAgfVxuICAgIGdldFNlbGVjdGVkVmlld2VyKCkgOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghdGhpcy5pc1ZpZXdlckFjdGl2ZSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnMoVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFNlbGVjdGVkVmlld2VyKCkpO1xuICAgIH1cbiAgICBnZXRSZW5kZXJpbmdQcmltaXRpdmVzKCk6IFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgICAgICByZXR1cm4gbmV3IFJlbmRlcmluZ1ByaW1pdGl2ZXMoVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xuICAgIGdldFJlY29tbWVuZGVkRnBzKGZsYWdzOiBkZWYuRlBTSGludCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUmVuZGVyZXIuZ2V0UmVjb21tZW5kZWRGcHMoPG51bWJlcj5mbGFncyk7XG4gICAgfVxuICAgIGdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpIDogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUmVuZGVyZXIuZ2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCk7XG4gICAgfVxuICAgIHNldFRhcmdldEZwcyhmcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLnNldFRhcmdldEZwcyhmcHMpO1xuICAgIH1cbiAgICBzZXRWaWRlb0JhY2tncm91bmRDb25maWcoY2ZnOiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnKTogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFSZW5kZXJlci5zZXRWaWRlb0JhY2tncm91bmRDb25maWcoPFZ1Zm9yaWFWaWRlb0JhY2tncm91bmRDb25maWc+Y2ZnKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNZXNoIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFNZXNoKSB7fVxuICAgIFxuICAgIGdldE5vcm1hbENvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgZ2V0Tm9ybWFscygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFscygpO1xuICAgIH1cbiAgICBnZXROdW1UcmlhbmdsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyaWFuZ2xlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WZXJ0aWNlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVmVydGljZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25Db29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UG9zaXRpb25zKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQb3NpdGlvbnMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJpYW5nbGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VHJpYW5nbGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFVWQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRVVkNvb3JkaW5hdGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFVWcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VVZzKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc05vcm1hbHMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNOb3JtYWxzKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc1Bvc2l0aW9ucygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc1Bvc2l0aW9ucygpO1xuICAgIH1cbiAgICBcbiAgICBoYXNVVnMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNVVnMoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFSZW5kZXJpbmdQcmltaXRpdmVzKXt9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKHZpZXdJRDogZGVmLlZpZXcpOiBNZXNoIHtcbiAgICAgICAgY29uc3QgbWVzaCA9IHRoaXMuaW9zLmdldERpc3RvcnRpb25UZXh0dXJlTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZVNpemUoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZVZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgodmlld0lEOiBkZWYuVmlldyk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KDxudW1iZXI+dmlld0lEKSk7XG4gICAgfVxuICAgIFxuICAgIGdldE5vcm1hbGl6ZWRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3LCBjYW1lcmFDYWxpYnJhdGlvbjpkZWYuQ2FtZXJhQ2FsaWJyYXRpb24sIG5lYXI6bnVtYmVyLCBmYXI6bnVtYmVyKTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgY29uc3QgcHJvamVjdGlvbk1hdHJpeCA9IHRoaXMuaW9zLmdldFByb2plY3Rpb25NYXRyaXhDYW1lcmFDYWxpYnJhdGlvbk5lYXJGYXIoXG4gICAgICAgICAgICA8bnVtYmVyPnZpZXdJRCwgXG4gICAgICAgICAgICBjYW1lcmFDYWxpYnJhdGlvbixcbiAgICAgICAgICAgIG5lYXIsIFxuICAgICAgICAgICAgZmFyXG4gICAgICAgIClcbiAgICAgICAgcmV0dXJuIHdyYXBNYXRyaXg0NChwcm9qZWN0aW9uTWF0cml4KVxuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJpbmdWaWV3cygpOiBWaWV3TGlzdCB7XG4gICAgICAgIHJldHVybiBuZXcgVmlld0xpc3QodGhpcy5pb3MuZ2V0UmVuZGVyaW5nVmlld3MoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZE1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgodGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCg8bnVtYmVyPnZpZXdJRCksICAwLjAxLCAxMDAwMDApO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Vmlld3BvcnQoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbn1cblxuY2xhc3MgRGF0YVNldCBpbXBsZW1lbnRzIGRlZi5EYXRhU2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFEYXRhU2V0KXt9XG4gICAgY3JlYXRlTXVsdGlUYXJnZXQobmFtZTogc3RyaW5nKTogTXVsdGlUYXJnZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgbXQgPSB0aGlzLmlvcy5jcmVhdGVNdWx0aVRhcmdldChuYW1lKTtcbiAgICAgICAgaWYgKG10KSByZXR1cm4gbmV3IE11bHRpVGFyZ2V0KG10KTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVzdHJveSh0cmFja2FibGU6IFRyYWNrYWJsZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZGVzdHJveSh0cmFja2FibGUuaW9zKTtcbiAgICB9XG4gICAgZXhpc3RzKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZXhpc3RzU3RvcmFnZVR5cGUocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBoYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTtcbiAgICB9XG4gICAgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5pc0FjdGl2ZSgpO1xuICAgIH1cbiAgICBsb2FkKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MubG9hZFN0b3JhZ2VUeXBlKHBhdGgsIDxudW1iZXI+c3RvcmFnZVR5cGUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRyYWNrZXIge1xuICAgIGFic3RyYWN0IG5hdGl2ZUNsYXNzIDogdHlwZW9mIFZ1Zm9yaWFUcmFja2VyICYge2dldEluc3RhbmNlKCk6VnVmb3JpYVRyYWNrZXJ9O1xuICAgIHN0YXJ0KCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmF0aXZlQ2xhc3MuZ2V0SW5zdGFuY2UoKS5zdGFydCgpO1xuICAgIH1cbiAgICBzdG9wKCkgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5uYXRpdmVDbGFzcy5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBIaXRUZXN0UmVzdWx0IGltcGxlbWVudHMgZGVmLkhpdFRlc3RSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUhpdFRlc3RSZXN1bHQpIHt9O1xuICAgIGdldFBvc2UoKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldFBvc2UoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9zaXRpb25hbERldmljZVRyYWNrZXIgZXh0ZW5kcyBUcmFja2VyIGltcGxlbWVudHMgZGVmLlBvc2l0aW9uYWxEZXZpY2VUcmFja2VyIHtcbiAgICBuYXRpdmVDbGFzcyA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcjtcbiAgICBjcmVhdGVBbmNob3JGcm9tUG9zZShuYW1lOiBzdHJpbmcsIHBvc2U6IGRlZi5NYXRyaXg0NCk6IGRlZi5BbmNob3IgfCBudWxsIHtcbiAgICAgICAgY29uc3QgdnVmb3JpYVBvc2UgPSBjb252ZXJ0MlZ1Zm9yaWFNYXRyaXgocG9zZSk7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFBbmNob3IgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVBbmNob3JXaXRoTmFtZVBvc2UobmFtZSwgdnVmb3JpYVBvc2UpO1xuICAgICAgICByZXR1cm4gdnVmb3JpYUFuY2hvciA/IG5ldyBBbmNob3IodnVmb3JpYUFuY2hvcikgOiBudWxsO1xuICAgIH1cbiAgICBjcmVhdGVBbmNob3JGcm9tSGl0VGVzdFJlc3VsdChuYW1lOiBzdHJpbmcsIGhpdFRlc3RSZXN1bHQ6IEhpdFRlc3RSZXN1bHQpOiBkZWYuQW5jaG9yIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFBbmNob3IgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVBbmNob3JXaXRoTmFtZUhpdFRlc3RSZXN1bHQobmFtZSwgaGl0VGVzdFJlc3VsdC5pb3MpO1xuICAgICAgICByZXR1cm4gdnVmb3JpYUFuY2hvciA/IG5ldyBBbmNob3IodnVmb3JpYUFuY2hvcikgOiBudWxsO1xuICAgIH1cbiAgICBkZXN0cm95QW5jaG9yKGFuY2hvcjogQW5jaG9yKSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZXN0cm95QW5jaG9yKGFuY2hvci5pb3MpO1xuICAgIH1cbiAgICBnZXROdW1BbmNob3JzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5udW1BbmNob3JzKCk7XG4gICAgfVxuICAgIGdldEFuY2hvcihpZHg6IG51bWJlcik6IGRlZi5BbmNob3IgfCBudWxsIHtcbiAgICAgICAgY29uc3QgdnVmb3JpYUFuY2hvciA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5nZXRJbnN0YW5jZSgpLmdldEFuY2hvckF0SW5kZXgoaWR4KTtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWFBbmNob3IgPyBuZXcgQW5jaG9yKHZ1Zm9yaWFBbmNob3IpIDogbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTbWFydFRlcnJhaW4gZXh0ZW5kcyBUcmFja2VyIGltcGxlbWVudHMgZGVmLlNtYXJ0VGVycmFpbiB7XG4gICAgbmF0aXZlQ2xhc3MgPSBWdWZvcmlhU21hcnRUZXJyYWluO1xuICAgXG4gICAgaGl0VGVzdChzdGF0ZTpTdGF0ZSwgcG9pbnQ6ZGVmLlZlYzIsIGRlZmF1bHREZXZpY2VIZWlnaHQ6bnVtYmVyLGhpbnQ6ZGVmLkhpdFRlc3RIaW50KSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhU21hcnRUZXJyYWluLmdldEluc3RhbmNlKCkuaGl0VGVzdFdpdGhTdGF0ZVBvaW50RGV2aWNlSGVpZ2h0SGludChcbiAgICAgICAgICAgIHN0YXRlLmlvcyxcbiAgICAgICAgICAgIHBvaW50LFxuICAgICAgICAgICAgZGVmYXVsdERldmljZUhlaWdodCxcbiAgICAgICAgICAgIDxudW1iZXI+aGludFxuICAgICAgICApO1xuICAgIH1cblxuICAgIGdldEhpdFRlc3RSZXN1bHRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTbWFydFRlcnJhaW4uZ2V0SW5zdGFuY2UoKS5oaXRUZXN0UmVzdWx0Q291bnQoKTtcbiAgICB9XG5cbiAgICBnZXRIaXRUZXN0UmVzdWx0KGlkeDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgciA9IFZ1Zm9yaWFTbWFydFRlcnJhaW4uZ2V0SW5zdGFuY2UoKS5nZXRIaXRUZXN0UmVzdWx0QXRJbmRleChpZHgpO1xuICAgICAgICByZXR1cm4gbmV3IEhpdFRlc3RSZXN1bHQocik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VHJhY2tlciBleHRlbmRzIFRyYWNrZXIgaW1wbGVtZW50cyBkZWYuT2JqZWN0VHJhY2tlciB7XG4gICAgbmF0aXZlQ2xhc3MgPSBWdWZvcmlhT2JqZWN0VHJhY2tlcjtcbiAgICBjcmVhdGVEYXRhU2V0KCkgOiBEYXRhU2V0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGRzID0gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVEYXRhU2V0KCk7XG4gICAgICAgIGlmIChkcykgcmV0dXJuIG5ldyBEYXRhU2V0KGRzKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cdGRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcblx0XHRyZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZXN0cm95RGF0YVNldChkYXRhU2V0Lmlvcyk7XG5cdH1cbiAgICBhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5hY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5pb3MpO1xuICAgIH1cbiAgICBkZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuaW9zKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcGkgPSBWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBBUEkoKSA6IHVuZGVmaW5lZDtcbiJdfQ==