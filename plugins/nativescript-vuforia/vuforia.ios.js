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
    RenderingPrimitives.prototype.getProjectionMatrix = function (viewID) {
        return convertPerspectiveProjection2GLMatrix(this.ios.getProjectionMatrix(viewID), 0.01, 100000);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBcUM7QUFFckMseUNBQTRDO0FBRTVDLHlDQUE0QztBQUM1Qyw0Q0FBK0M7QUFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFFcEMsSUFBTSxpQkFBaUIsR0FBRyxPQUFPLGNBQWMsS0FBSyxXQUFXLENBQUM7QUFFaEUsSUFBTSxZQUFZLEdBQXNCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVwRixRQUFBLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN2RCxpQkFBUyxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsVUFBQyxHQUFHO0lBQzdCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFBO0FBQ0YsaUJBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ25CLElBQUksaUJBQWlCO1FBQUUsY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUE7QUFDRixpQkFBUyxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUU7SUFDMUIsSUFBSSxpQkFBaUI7UUFBRSx1QkFBdUIsRUFBRSxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFBO0FBRUYsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFO0lBQ3JDLElBQUksaUJBQWlCLEVBQUU7UUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9CLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN6QixZQUFZLENBQUMsc0JBQXNCLEVBQUUsQ0FB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QUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFDRSx1Q0FBZSxHQUFmLFVBQWdCLE9BQWU7UUFDM0IsT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFDRCx5Q0FBaUIsR0FBakIsVUFBa0IsT0FBZTtRQUM3QixPQUFPLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBQ0wsb0JBQUM7QUFBRCxDQUFDLEFBaEJELENBQW1DLE9BQU8sR0FnQnpDO0FBaEJZLHNDQUFhO0FBa0JiLFFBQUEsR0FBRyxHQUFHLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCBjb21tb24gPSByZXF1aXJlKCcuL3Z1Zm9yaWEtY29tbW9uJyk7XG5pbXBvcnQgZGVmID0gcmVxdWlyZSgnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnKTtcbmltcG9ydCBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJ2FwcGxpY2F0aW9uJyk7XG5pbXBvcnQgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCd1aS9wbGFjZWhvbGRlcicpO1xuXG5nbG9iYWwubW9kdWxlTWVyZ2UoY29tbW9uLCBleHBvcnRzKTtcblxuY29uc3QgVlVGT1JJQV9BVkFJTEFCTEUgPSB0eXBlb2YgVnVmb3JpYVNlc3Npb27CoCE9PSAndW5kZWZpbmVkJztcblxuY29uc3QgaW9zVmlkZW9WaWV3ID0gPFZ1Zm9yaWFWaWRlb1ZpZXc+IChWVUZPUklBX0FWQUlMQUJMRSA/IFZ1Zm9yaWFWaWRlb1ZpZXcubmV3KCkgOiB1bmRlZmluZWQpO1xuXG5leHBvcnQgY29uc3QgdmlkZW9WaWV3ID0gbmV3IHBsYWNlaG9sZGVyLlBsYWNlaG9sZGVyKCk7XG52aWRlb1ZpZXcub24oJ2NyZWF0aW5nVmlldycsIChldnQpPT57XG4gICAgZXZ0LnZpZXcgPSBpb3NWaWRlb1ZpZXc7XG59KVxudmlkZW9WaWV3Lm9uKCdsb2FkZWQnLCAoKT0+e1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xufSlcbnZpZGVvVmlldy5vbignbGF5b3V0Q2hhbmdlZCcsICgpID0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG59KVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5zdXNwZW5kRXZlbnQsICgpPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUGF1c2luZyBWdWZvcmlhJyk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUGF1c2UoKTtcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZpbmlzaE9wZW5HTEVTQ29tbWFuZHMoKTtcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZyZWVPcGVuR0xFU1Jlc291cmNlcygpO1xuICAgIH1cbn0pXG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKSA9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSB7XG4gICAgICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oY29uZmlndXJlVnVmb3JpYVN1cmZhY2UpOyAvLyBkZWxheSB1bnRpbCB0aGUgaW50ZXJmYWNlIG9yaWVudGF0aW9uIGFjdHVhbGx5IGNoYW5nZXNcbiAgICAgICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgNTAwKTtcbiAgICB9XG59KTtcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ucmVzdW1lRXZlbnQsICgpPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUmVzdW1pbmcgVnVmb3JpYScpO1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblJlc3VtZSgpO1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblN1cmZhY2VDcmVhdGVkKCk7XG4gICAgICAgIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCk7XG4gICAgfVxufSlcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKCkge1xuICAgIGlmICghYXBpKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICBjb25zdCBjb250ZW50U2NhbGVGYWN0b3IgPSBpb3NWaWRlb1ZpZXcuY29udGVudFNjYWxlRmFjdG9yO1xuICAgIGFwaS5vblN1cmZhY2VDaGFuZ2VkKFxuICAgICAgICBpb3NWaWRlb1ZpZXcuZnJhbWUuc2l6ZS53aWR0aCAqIGNvbnRlbnRTY2FsZUZhY3RvcixcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZyYW1lLnNpemUuaGVpZ2h0ICogY29udGVudFNjYWxlRmFjdG9yXG4gICAgKTtcbn1cblxuZXhwb3J0IGNsYXNzIEFQSSBleHRlbmRzIGNvbW1vbi5BUElCYXNlIHtcbiAgICBcbiAgICBwcml2YXRlIGNhbWVyYURldmljZSA9IG5ldyBDYW1lcmFEZXZpY2UoKTtcbiAgICBwcml2YXRlIGRldmljZSA9IG5ldyBEZXZpY2UoKTtcbiAgICBwcml2YXRlIHJlbmRlcmVyID0gbmV3IFJlbmRlcmVyKCk7XG4gICAgXG4gICAgc2V0TGljZW5zZUtleShsaWNlbnNlS2V5OnN0cmluZykgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnNldExpY2Vuc2VLZXkobGljZW5zZUtleSkgPT09IDA7XG4gICAgfVxuICAgIFxuICAgIHNldEhpbnQoaGludDpkZWYuSGludCx2YWx1ZTpudW1iZXIpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU2Vzc2lvbi5zZXRIaW50VmFsdWUoPG51bWJlcj5oaW50LCB2YWx1ZSk7XG4gICAgfVxuICAgIFxuICAgIGluaXQoKSA6IFByb21pc2U8ZGVmLkluaXRSZXN1bHQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5pbml0RG9uZSgocmVzdWx0KT0+e1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IFZ1Zm9yaWFJbml0UmVzdWx0LlNVQ0NFU1MpIHtcbiAgICAgICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlLCA1MDApO1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5yZWdpc3RlclVwZGF0ZUNhbGxiYWNrKChzdGF0ZSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVwZGF0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQ2FsbGJhY2sobmV3IFN0YXRlKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5yZWdpc3RlclJlbmRlckNhbGxiYWNrKChzdGF0ZSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlbmRlckNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2FsbGJhY2sobmV3IFN0YXRlKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblJlc3VtZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKDxkZWYuSW5pdFJlc3VsdD48bnVtYmVyPnJlc3VsdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5kZWluaXQoKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25QYXVzZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEZXZpY2UoKSA6IENhbWVyYURldmljZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbWVyYURldmljZTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGV2aWNlKCkgOiBEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldFJlbmRlcmVyKCkgOiBSZW5kZXJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyO1xuICAgIH1cblxuICAgIGluaXRTbWFydFRlcnJhaW4oKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYVNtYXJ0VGVycmFpbi5pbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLnNtYXJ0VGVycmFpbiA9IG5ldyBTbWFydFRlcnJhaW4oKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZGVpbml0U21hcnRUZXJyYWluKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFPYmplY3RUcmFja2VyLmRlaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGluaXRQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbmFsRGV2aWNlVHJhY2tlciA9IG5ldyBQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcigpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBkZWluaXRQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZGVpbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uYWxEZXZpY2VUcmFja2VyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhT2JqZWN0VHJhY2tlci5pbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSBuZXcgT2JqZWN0VHJhY2tlcigpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhT2JqZWN0VHJhY2tlci5kZWluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRTY2FsZUZhY3RvcihmOm51bWJlcikge1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRTY2FsZUZhY3RvciAmJiBWdWZvcmlhU2Vzc2lvbi5zZXRTY2FsZUZhY3RvcihmKTtcbiAgICB9XG5cbiAgICBnZXRTY2FsZUZhY3RvcigpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnNjYWxlRmFjdG9yKCk7XG4gICAgfVxuXG4gICAgc2V0VGFyZ2V0RlBTKGY6bnVtYmVyKSB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFRhcmdldEZQUyhmKVxuICAgIH1cblxuICAgIGdldFRhcmdldEZQUygpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTZXNzaW9uLnRhcmdldEZQUygpXG4gICAgfVxuXG4gICAgb25TdXJmYWNlQ2hhbmdlZCh3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIpIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNoYW5nZWRXaWR0aEhlaWdodCh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgY29uc3Qgb3JpZW50YXRpb246VUlJbnRlcmZhY2VPcmllbnRhdGlvbiA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlBcHBsaWNhdGlvbiwgVUlBcHBsaWNhdGlvbi5zaGFyZWRBcHBsaWNhdGlvbikuc3RhdHVzQmFyT3JpZW50YXRpb247XG4gICAgICAgIHN3aXRjaCAob3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5Qb3J0cmFpdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXRVcHNpZGVEb3duOiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzI3MCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uTGFuZHNjYXBlTGVmdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18xODApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLkxhbmRzY2FwZVJpZ2h0OiBcbiAgICAgICAgICAgICAgICBWdWZvcmlhU2Vzc2lvbi5zZXRSb3RhdGlvbihWdWZvcmlhUm90YXRpb24uSU9TXzApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU185MCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnQyR0xNYXRyaXgobWF0OlZ1Zm9yaWFNYXRyaXgzNCkgOiBkZWYuTWF0cml4NDQge1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIG1hdC5fMCxcbiAgICAgICAgICAgICAgICBtYXQuXzQsXG4gICAgICAgICAgICAgICAgbWF0Ll84LFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgbWF0Ll8xLFxuICAgICAgICAgICAgICAgIG1hdC5fNSxcbiAgICAgICAgICAgICAgICBtYXQuXzksXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzIsXG4gICAgICAgICAgICAgICAgbWF0Ll82LFxuICAgICAgICAgICAgICAgIG1hdC5fMTAsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzMsXG4gICAgICAgICAgICAgICAgbWF0Ll83LFxuICAgICAgICAgICAgICAgIG1hdC5fMTEsXG4gICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgXTtcbn1cblxuZnVuY3Rpb24gY29udmVydDJWdWZvcmlhTWF0cml4KG1hdDpkZWYuTWF0cml4NDQpIDogVnVmb3JpYU1hdHJpeDM0IHtcbiAgICByZXR1cm4gIHtcbiAgICAgICAgXzA6IG1hdFswXSxcbiAgICAgICAgXzE6IG1hdFs0XSxcbiAgICAgICAgXzI6IG1hdFs4XSxcbiAgICAgICAgXzM6IG1hdFsxMl0sXG4gICAgICAgIF80OiBtYXRbMV0sXG4gICAgICAgIF81OiBtYXRbNV0sXG4gICAgICAgIF82OiBtYXRbOV0sXG4gICAgICAgIF83OiBtYXRbMTNdLFxuICAgICAgICBfODogbWF0WzJdLFxuICAgICAgICBfOTogbWF0WzZdLFxuICAgICAgICBfMTA6IG1hdFsxMF0sXG4gICAgICAgIF8xMTogbWF0WzE0XVxuICAgIH07XG59XG5cbi8vIGh0dHBzOi8vbGlicmFyeS52dWZvcmlhLmNvbS9hcnRpY2xlcy9Tb2x1dGlvbi9Ib3ctVG8tQWNjZXNzLUNhbWVyYS1QYXJhbWV0ZXJzXG5mdW5jdGlvbiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KG1hdDpWdWZvcmlhTWF0cml4MzQsIG5lYXI6bnVtYmVyLCBmYXI6bnVtYmVyKSA6IGRlZi5NYXRyaXg0NCB7XG4gICAgcmV0dXJuICBbXG4gICAgICAgICAgICAgICAgbWF0Ll8wLFxuICAgICAgICAgICAgICAgIG1hdC5fNCxcbiAgICAgICAgICAgICAgICBtYXQuXzgsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzEsXG4gICAgICAgICAgICAgICAgbWF0Ll81LFxuICAgICAgICAgICAgICAgIG1hdC5fOSxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMixcbiAgICAgICAgICAgICAgICBtYXQuXzYsXG4gICAgICAgICAgICAgICAgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpLFxuICAgICAgICAgICAgICAgIDEsXG4gICAgICAgICAgICAgICAgbWF0Ll8zLFxuICAgICAgICAgICAgICAgIG1hdC5fNyxcbiAgICAgICAgICAgICAgICAtbmVhciAqICgxICsgKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpKSxcbiAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICBdO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGUge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGUoaW9zOlZ1Zm9yaWFUcmFja2FibGUpIHtcbiAgICAgICAgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFBbmNob3IpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQW5jaG9yKGlvcyk7XG4gICAgICAgIH0gaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFEZXZpY2VUcmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGV2aWNlVHJhY2thYmxlKGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUltYWdlVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlVGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUN5bGluZGVyVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYU9iamVjdFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhVHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZShpb3MpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFUcmFja2FibGUpIHt9XG4gICAgXG4gICAgZ2V0SWQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldElkKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5hbWUoKTtcbiAgICB9XG4gICAgaXNFeHRlbmRlZFRyYWNraW5nU3RhcnRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTtcbiAgICB9XG4gICAgc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RhcnRFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxuICAgIHN0b3BFeHRlbmRlZFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc3RvcEV4dGVuZGVkVHJhY2tpbmcoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUcmFja2FibGVSZXN1bHQge1xuICAgIFxuICAgIHN0YXRpYyBjcmVhdGVUcmFja2FibGVSZXN1bHQoaW9zOlZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFBbmNob3JSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQW5jaG9yUmVzdWx0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYURldmljZVRyYWNrYWJsZVJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZXZpY2VUcmFja2FibGVSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFJbWFnZVRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldFJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYUN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEN5bGluZGVyVGFyZ2V0UmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9iamVjdFRhcmdldFJlc3VsdChpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHJhY2thYmxlUmVzdWx0KGlvcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVRyYWNrYWJsZVJlc3VsdCkge31cbiAgICBcbiAgICBnZXRQb3NlKCk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldFBvc2UoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFRpbWVTdGFtcCgpIDogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRpbWVTdGFtcCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdGF0dXMoKTogZGVmLlRyYWNrYWJsZVJlc3VsdFN0YXR1cyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFN0YXR1cygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmFja2FibGUoKTogVHJhY2thYmxlIHtcbiAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodGhpcy5pb3MuZ2V0VHJhY2thYmxlKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERldmljZVRyYWNrYWJsZSBleHRlbmRzIFRyYWNrYWJsZSBpbXBsZW1lbnRzIGRlZi5EZXZpY2VUcmFja2FibGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYURldmljZVRyYWNrYWJsZSkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBEZXZpY2VUcmFja2FibGVSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgaW1wbGVtZW50cyBkZWYuRGV2aWNlVHJhY2thYmxlUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFEZXZpY2VUcmFja2FibGVSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgQW5jaG9yIGV4dGVuZHMgVHJhY2thYmxlIGltcGxlbWVudHMgZGVmLkFuY2hvciB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQW5jaG9yKSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIEFuY2hvclJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCBpbXBsZW1lbnRzIGRlZi5BbmNob3JSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUFuY2hvclJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBPYmplY3RUYXJnZXQgZXh0ZW5kcyBUcmFja2FibGUgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFPYmplY3RUYXJnZXQpIHtzdXBlcihpb3MpfVxuICAgIFxuICAgIGdldFVuaXF1ZVRhcmdldElkKCkgOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VW5pcXVlVGFyZ2V0SWQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTaXplKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VGFyZ2V0UmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgSW1hZ2VUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFJbWFnZVRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSW1hZ2VUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU11bHRpVGFyZ2V0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuY2xhc3MgQ3lsaW5kZXJUYXJnZXQgZXh0ZW5kcyBPYmplY3RUYXJnZXQgeyAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFDeWxpbmRlclRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0UmVzdWx0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0UmVzdWx0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQ3lsaW5kZXJUYXJnZXRSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgSW1hZ2Uge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUltYWdlKSB7fVxuICAgIFxuICAgIGdldEJ1ZmZlckhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0QnVmZmVySGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEJ1ZmZlcldpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0QnVmZmVyV2lkdGgoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9ybWF0KCk6IGRlZi5QaXhlbEZvcm1hdCB7IFxuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRGb3JtYXQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0SGVpZ2h0KCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SGVpZ2h0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBpeGVscygpOiBpbnRlcm9wLlBvaW50ZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBpeGVscygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRTdHJpZGUoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTdHJpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0V2lkdGgoKTogbnVtYmVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRXaWR0aCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZyYW1lIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFGcmFtZSkge31cbiAgICBnZXRJbWFnZShpZHg6IG51bWJlcik6IEltYWdlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGltZyA9IHRoaXMuaW9zLmdldEltYWdlKGlkeCk7XG4gICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2UoaW1nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRJbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SW5kZXgoKTtcbiAgICB9XG4gICAgZ2V0TnVtSW1hZ2VzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1JbWFnZXMoKTtcbiAgICB9XG4gICAgZ2V0VGltZVN0YW1wKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRUaW1lU3RhbXAoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhU3RhdGUpIHt9XG4gICAgZ2V0RnJhbWUoKTogRnJhbWUge1xuICAgICAgICBjb25zdCBmcmFtZSA9IHRoaXMuaW9zLmdldEZyYW1lKCk7XG4gICAgICAgIHJldHVybiBuZXcgRnJhbWUoZnJhbWUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVSZXN1bHRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmFja2FibGVSZXN1bHRzKCk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogZGVmLlRyYWNrYWJsZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0cmFja2FibGUgPSB0aGlzLmlvcy5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXRUcmFja2FibGVSZXN1bHQoaWR4OiBudW1iZXIpOiBkZWYuVHJhY2thYmxlUmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZVJlc3VsdChpZHgpO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gVHJhY2thYmxlUmVzdWx0LmNyZWF0ZVRyYWNrYWJsZVJlc3VsdChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhQ2FsaWJyYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUNhbWVyYUNhbGlicmF0aW9uKSB7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25QYXJhbWV0ZXJzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZpZWxkT2ZWaWV3UmFkcygpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRGaWVsZE9mVmlld1JhZHMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Rm9jYWxMZW5ndGgoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Rm9jYWxMZW5ndGgoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UHJpbmNpcGFsUG9pbnQoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UHJpbmNpcGFsUG9pbnQoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U2l6ZSgpOiBkZWYuVmVjMiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTaXplKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FtZXJhRGV2aWNlIHtcbiAgICBpbml0KGNhbWVyYTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmluaXRDYW1lcmEoPG51bWJlcj5jYW1lcmEpO1xuICAgIH1cbiAgICBcbiAgICBkZWluaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZGVpbml0Q2FtZXJhKCk7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYUNhbGlicmF0aW9uKCk6IENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICAgICAgY29uc3QgY2FsaWJyYXRpb24gPSBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKTtcbiAgICAgICAgcmV0dXJuIG5ldyBDYW1lcmFDYWxpYnJhdGlvbihjYWxpYnJhdGlvbik7XG4gICAgfVxuICAgIFxuICAgIGdldENhbWVyYURpcmVjdGlvbigpOiBkZWYuQ2FtZXJhRGV2aWNlRGlyZWN0aW9uIHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+VnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYURpcmVjdGlvbigpO1xuICAgIH1cbiAgICBcbiAgICBnZXROdW1WaWRlb01vZGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TnVtVmlkZW9Nb2RlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb01vZGUobkluZGV4OiBudW1iZXIpOiBkZWYuVmlkZW9Nb2RlIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRWaWRlb01vZGUobkluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgc2VsZWN0VmlkZW9Nb2RlKGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZWxlY3RWaWRlb01vZGUoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBzZXRGbGFzaFRvcmNoTW9kZShvbjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZsYXNoVG9yY2hNb2RlKG9uKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rm9jdXNNb2RlKGZvY3VzTW9kZTogZGVmLkNhbWVyYURldmljZUZvY3VzTW9kZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnNldEZvY3VzTW9kZSg8bnVtYmVyPmZvY3VzTW9kZSk7XG4gICAgfVxuICAgIFxuICAgIHN0YXJ0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0YXJ0KCk7XG4gICAgfVxuICAgIFxuICAgIHN0b3AoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc3RvcCgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3TGlzdCkge31cbiAgICBjb250YWlucyh2aWV3OiBkZWYuVmlldyk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuY29udGFpbnMoPG51bWJlcj52aWV3KTtcbiAgICB9XG4gICAgZ2V0TnVtVmlld3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVZpZXdzKCk7XG4gICAgfVxuICAgIGdldFZpZXcoaWR4OiBudW1iZXIpOiBkZWYuVmlldyB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFZpZXcoaWR4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3ZXJQYXJhbWV0ZXJzIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3ZXJQYXJhbWV0ZXJzKSB7fVxuICAgIGNvbnRhaW5zTWFnbmV0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuY29udGFpbnNNYWduZXQoKTtcbiAgICB9XG4gICAgZ2V0QnV0dG9uVHlwZSgpOiBkZWYuVmlld2VyUGFyYW10ZXJzQnV0dG9uVHlwZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldEJ1dHRvblR5cGUoKTtcbiAgICB9XG4gICAgZ2V0RGlzdG9ydGlvbkNvZWZmaWNpZW50KGlkeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHgpO1xuICAgIH1cbiAgICBnZXRGaWVsZE9mVmlldygpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRGaWVsZE9mVmlldygpO1xuICAgIH1cbiAgICBnZXRJbnRlckxlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRMZW5zQ2VudHJlVG9UcmF5RGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0TWFudWZhY3R1cmVyKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRNYW51ZmFjdHVyZXIoKTtcbiAgICB9XG4gICAgZ2V0TmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TmFtZSgpO1xuICAgIH1cbiAgICBnZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1EaXN0b3J0aW9uQ29lZmZpY2llbnRzKCk7XG4gICAgfVxuICAgIGdldFNjcmVlblRvTGVuc0Rpc3RhbmNlKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpO1xuICAgIH1cbiAgICBnZXRUcmF5QWxpZ25tZW50KCk6IGRlZi5WaWV3ZXJQYXJhbXRlcnNUcmF5QWxpZ25tZW50IHtcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0VHJheUFsaWdubWVudCgpO1xuICAgIH1cbiAgICBnZXRWZXJzaW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRWZXJzaW9uKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVZpZXdlclBhcmFtZXRlcnNMaXN0KSB7fVxuICAgIGdldChpZHg6IG51bWJlcik6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdnAgPSB0aGlzLmlvcy5nZXQoaWR4KTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBnZXROYW1lTWFudWZhY3R1cmVyKG5hbWU6IHN0cmluZywgbWFudWZhY3R1cmVyOiBzdHJpbmcpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5pb3MuZ2V0TmFtZU1hbnVmYWN0dXJlcihuYW1lLCBtYW51ZmFjdHVyZXIpO1xuICAgICAgICBpZiAodnApIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyh2cCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHNldFNES0ZpbHRlcihmaWx0ZXI6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLmlvcy5zZXRTREtGaWx0ZXIoZmlsdGVyKTtcbiAgICB9XG4gICAgc2l6ZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3Muc2l6ZSgpO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgRGV2aWNlIHtcbiAgICBzZXRNb2RlKG1vZGU6ZGVmLkRldmljZU1vZGUpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2V0TW9kZSg8bnVtYmVyPm1vZGUpO1xuICAgIH1cbiAgICBnZXRNb2RlKCkgOiBkZWYuRGV2aWNlTW9kZSB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPlZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRNb2RlKCk7XG4gICAgfVxuICAgIHNldFZpZXdlckFjdGl2ZShhY3RpdmU6Ym9vbGVhbikgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLnNldFZpZXdlckFjdGl2ZShhY3RpdmUpO1xuICAgIH1cbiAgICBpc1ZpZXdlckFjdGl2ZSgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuaXNWaWV3ZXJBY3RpdmUoKTtcbiAgICB9XG4gICAgZ2V0Vmlld2VyTGlzdCgpIDogVmlld2VyUGFyYW1ldGVyc0xpc3Qge1xuICAgICAgICBjb25zdCB2aWV3ZXJMaXN0ID0gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmdldFZpZXdlckxpc3QoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzTGlzdCh2aWV3ZXJMaXN0KTtcbiAgICB9XG4gICAgc2VsZWN0Vmlld2VyKHZpZXdlcjpWaWV3ZXJQYXJhbWV0ZXJzKSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0Vmlld2VyKHZpZXdlci5pb3MpO1xuICAgIH1cbiAgICBnZXRTZWxlY3RlZFZpZXdlcigpIDogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBpZiAoIXRoaXMuaXNWaWV3ZXJBY3RpdmUoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRTZWxlY3RlZFZpZXdlcigpKTtcbiAgICB9XG4gICAgZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpOiBSZW5kZXJpbmdQcmltaXRpdmVzIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZW5kZXJpbmdQcmltaXRpdmVzKFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRSZW5kZXJpbmdQcmltaXRpdmVzKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmVyIHtcbiAgICBnZXRSZWNvbW1lbmRlZEZwcyhmbGFnczogZGVmLkZQU0hpbnQpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLmdldFJlY29tbWVuZGVkRnBzKDxudW1iZXI+ZmxhZ3MpO1xuICAgIH1cbiAgICBnZXRWaWRlb0JhY2tncm91bmRDb25maWcoKSA6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVJlbmRlcmVyLmdldFZpZGVvQmFja2dyb3VuZENvbmZpZygpO1xuICAgIH1cbiAgICBzZXRUYXJnZXRGcHMoZnBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFSZW5kZXJlci5zZXRUYXJnZXRGcHMoZnBzKTtcbiAgICB9XG4gICAgc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKGNmZzogZGVmLlZpZGVvQmFja2dyb3VuZENvbmZpZyk6IHZvaWQge1xuICAgICAgICBWdWZvcmlhUmVuZGVyZXIuc2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKDxWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kQ29uZmlnPmNmZyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWVzaCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhTWVzaCkge31cbiAgICBcbiAgICBnZXROb3JtYWxDb29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5vcm1hbENvb3JkaW5hdGVzKCk7XG4gICAgfVxuICAgIGdldE5vcm1hbHMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5vcm1hbHMoKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJpYW5nbGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmlhbmdsZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0TnVtVmVydGljZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVZlcnRpY2VzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9uQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQb3NpdGlvbkNvb3JkaW5hdGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFBvc2l0aW9ucygpOiBpbnRlcm9wLlJlZmVyZW5jZTxkZWYuVmVjMz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UG9zaXRpb25zKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFRyaWFuZ2xlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFRyaWFuZ2xlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVkNvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VVZDb29yZGluYXRlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRVVnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFVWcygpO1xuICAgIH1cbiAgICBcbiAgICBoYXNOb3JtYWxzKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaGFzTm9ybWFscygpO1xuICAgIH1cbiAgICBcbiAgICBoYXNQb3NpdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNQb3NpdGlvbnMoKTtcbiAgICB9XG4gICAgXG4gICAgaGFzVVZzKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaGFzVVZzKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVuZGVyaW5nUHJpbWl0aXZlcyB7XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhUmVuZGVyaW5nUHJpbWl0aXZlcyl7fVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlTWVzaCh2aWV3SUQ6IGRlZi5WaWV3KTogTWVzaCB7XG4gICAgICAgIGNvbnN0IG1lc2ggPSB0aGlzLmlvcy5nZXREaXN0b3J0aW9uVGV4dHVyZU1lc2goPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gbmV3IE1lc2gobWVzaCk7XG4gICAgfVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlU2l6ZSh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvblRleHR1cmVTaXplKDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvblRleHR1cmVWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgfVxuICAgIFxuICAgIGdldEV5ZURpc3BsYXlBZGp1c3RtZW50TWF0cml4KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICByZXR1cm4gY29udmVydDJHTE1hdHJpeCh0aGlzLmlvcy5nZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCg8bnVtYmVyPnZpZXdJRCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXROb3JtYWxpemVkVmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5vcm1hbGl6ZWRWaWV3cG9ydCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgfVxuICAgIFxuICAgIGdldFByb2plY3Rpb25NYXRyaXgodmlld0lEOiBkZWYuVmlldyk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KHRoaXMuaW9zLmdldFByb2plY3Rpb25NYXRyaXgoPG51bWJlcj52aWV3SUQpLCAwLjAxLCAxMDAwMDApO1xuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJpbmdWaWV3cygpOiBWaWV3TGlzdCB7XG4gICAgICAgIHJldHVybiBuZXcgVmlld0xpc3QodGhpcy5pb3MuZ2V0UmVuZGVyaW5nVmlld3MoKSk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZE1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kTWVzaCg8bnVtYmVyPnZpZXdJRCk7XG4gICAgICAgIHJldHVybiBuZXcgTWVzaChtZXNoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQZXJzcGVjdGl2ZVByb2plY3Rpb24yR0xNYXRyaXgodGhpcy5pb3MuZ2V0VmlkZW9CYWNrZ3JvdW5kUHJvamVjdGlvbk1hdHJpeCg8bnVtYmVyPnZpZXdJRCksICAwLjAxLCAxMDAwMDApO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWV3cG9ydCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0Vmlld3BvcnQoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbn1cblxuY2xhc3MgRGF0YVNldCBpbXBsZW1lbnRzIGRlZi5EYXRhU2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFEYXRhU2V0KXt9XG4gICAgY3JlYXRlTXVsdGlUYXJnZXQobmFtZTogc3RyaW5nKTogTXVsdGlUYXJnZXR8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgbXQgPSB0aGlzLmlvcy5jcmVhdGVNdWx0aVRhcmdldChuYW1lKTtcbiAgICAgICAgaWYgKG10KSByZXR1cm4gbmV3IE11bHRpVGFyZ2V0KG10KTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVzdHJveSh0cmFja2FibGU6IFRyYWNrYWJsZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZGVzdHJveSh0cmFja2FibGUuaW9zKTtcbiAgICB9XG4gICAgZXhpc3RzKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZXhpc3RzU3RvcmFnZVR5cGUocGF0aCwgPG51bWJlcj5zdG9yYWdlVHlwZSk7XG4gICAgfVxuICAgIGdldE51bVRyYWNrYWJsZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE51bVRyYWNrYWJsZXMoKTtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlKGlkeDogbnVtYmVyKTogVHJhY2thYmxlfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRyYWNrYWJsZSA9IHRoaXMuaW9zLmdldFRyYWNrYWJsZShpZHgpO1xuICAgICAgICBpZiAodHJhY2thYmxlKSByZXR1cm4gVHJhY2thYmxlLmNyZWF0ZVRyYWNrYWJsZSh0cmFja2FibGUpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBoYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5oYXNSZWFjaGVkVHJhY2thYmxlTGltaXQoKTtcbiAgICB9XG4gICAgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5pc0FjdGl2ZSgpO1xuICAgIH1cbiAgICBsb2FkKHBhdGg6IHN0cmluZywgc3RvcmFnZVR5cGU6IGRlZi5TdG9yYWdlVHlwZSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MubG9hZFN0b3JhZ2VUeXBlKHBhdGgsIDxudW1iZXI+c3RvcmFnZVR5cGUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRyYWNrZXIge1xuICAgIGFic3RyYWN0IG5hdGl2ZUNsYXNzIDogdHlwZW9mIFZ1Zm9yaWFUcmFja2VyICYge2dldEluc3RhbmNlKCk6VnVmb3JpYVRyYWNrZXJ9O1xuICAgIHN0YXJ0KCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmF0aXZlQ2xhc3MuZ2V0SW5zdGFuY2UoKS5zdGFydCgpO1xuICAgIH1cbiAgICBzdG9wKCkgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5uYXRpdmVDbGFzcy5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBIaXRUZXN0UmVzdWx0IGltcGxlbWVudHMgZGVmLkhpdFRlc3RSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUhpdFRlc3RSZXN1bHQpIHt9O1xuICAgIGdldFBvc2UoKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0MkdMTWF0cml4KHRoaXMuaW9zLmdldFBvc2UoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9zaXRpb25hbERldmljZVRyYWNrZXIgZXh0ZW5kcyBUcmFja2VyIGltcGxlbWVudHMgZGVmLlBvc2l0aW9uYWxEZXZpY2VUcmFja2VyIHtcbiAgICBuYXRpdmVDbGFzcyA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlcjtcbiAgICBjcmVhdGVBbmNob3JGcm9tUG9zZShuYW1lOiBzdHJpbmcsIHBvc2U6IGRlZi5NYXRyaXg0NCk6IGRlZi5BbmNob3IgfCBudWxsIHtcbiAgICAgICAgY29uc3QgdnVmb3JpYVBvc2UgPSBjb252ZXJ0MlZ1Zm9yaWFNYXRyaXgocG9zZSk7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFBbmNob3IgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVBbmNob3JXaXRoTmFtZVBvc2UobmFtZSwgdnVmb3JpYVBvc2UpO1xuICAgICAgICByZXR1cm4gdnVmb3JpYUFuY2hvciA/IG5ldyBBbmNob3IodnVmb3JpYUFuY2hvcikgOiBudWxsO1xuICAgIH1cbiAgICBjcmVhdGVBbmNob3JGcm9tSGl0VGVzdFJlc3VsdChuYW1lOiBzdHJpbmcsIGhpdFRlc3RSZXN1bHQ6IEhpdFRlc3RSZXN1bHQpOiBkZWYuQW5jaG9yIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFBbmNob3IgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVBbmNob3JXaXRoTmFtZUhpdFRlc3RSZXN1bHQobmFtZSwgaGl0VGVzdFJlc3VsdC5pb3MpO1xuICAgICAgICByZXR1cm4gdnVmb3JpYUFuY2hvciA/IG5ldyBBbmNob3IodnVmb3JpYUFuY2hvcikgOiBudWxsO1xuICAgIH1cbiAgICBkZXN0cm95QW5jaG9yKGFuY2hvcjogQW5jaG9yKSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZXN0cm95QW5jaG9yKGFuY2hvci5pb3MpO1xuICAgIH1cbiAgICBnZXROdW1BbmNob3JzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5udW1BbmNob3JzKCk7XG4gICAgfVxuICAgIGdldEFuY2hvcihpZHg6IG51bWJlcik6IGRlZi5BbmNob3IgfCBudWxsIHtcbiAgICAgICAgY29uc3QgdnVmb3JpYUFuY2hvciA9IFZ1Zm9yaWFQb3NpdGlvbmFsRGV2aWNlVHJhY2tlci5nZXRJbnN0YW5jZSgpLmdldEFuY2hvckF0SW5kZXgoaWR4KTtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWFBbmNob3IgPyBuZXcgQW5jaG9yKHZ1Zm9yaWFBbmNob3IpIDogbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTbWFydFRlcnJhaW4gZXh0ZW5kcyBUcmFja2VyIGltcGxlbWVudHMgZGVmLlNtYXJ0VGVycmFpbiB7XG4gICAgbmF0aXZlQ2xhc3MgPSBWdWZvcmlhU21hcnRUZXJyYWluO1xuICAgXG4gICAgaGl0VGVzdChzdGF0ZTpTdGF0ZSwgcG9pbnQ6ZGVmLlZlYzIsIGRlZmF1bHREZXZpY2VIZWlnaHQ6bnVtYmVyLGhpbnQ6ZGVmLkhpdFRlc3RIaW50KSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhU21hcnRUZXJyYWluLmdldEluc3RhbmNlKCkuaGl0VGVzdFdpdGhTdGF0ZVBvaW50RGV2aWNlSGVpZ2h0SGludChcbiAgICAgICAgICAgIHN0YXRlLmlvcyxcbiAgICAgICAgICAgIHBvaW50LFxuICAgICAgICAgICAgZGVmYXVsdERldmljZUhlaWdodCxcbiAgICAgICAgICAgIDxudW1iZXI+aGludFxuICAgICAgICApO1xuICAgIH1cblxuICAgIGdldEhpdFRlc3RSZXN1bHRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFTbWFydFRlcnJhaW4uZ2V0SW5zdGFuY2UoKS5oaXRUZXN0UmVzdWx0Q291bnQoKTtcbiAgICB9XG5cbiAgICBnZXRIaXRUZXN0UmVzdWx0KGlkeDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgciA9IFZ1Zm9yaWFTbWFydFRlcnJhaW4uZ2V0SW5zdGFuY2UoKS5nZXRIaXRUZXN0UmVzdWx0QXRJbmRleChpZHgpO1xuICAgICAgICByZXR1cm4gbmV3IEhpdFRlc3RSZXN1bHQocik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VHJhY2tlciBleHRlbmRzIFRyYWNrZXIgaW1wbGVtZW50cyBkZWYuT2JqZWN0VHJhY2tlciB7XG4gICAgbmF0aXZlQ2xhc3MgPSBWdWZvcmlhT2JqZWN0VHJhY2tlcjtcbiAgICBjcmVhdGVEYXRhU2V0KCkgOiBEYXRhU2V0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGRzID0gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5jcmVhdGVEYXRhU2V0KCk7XG4gICAgICAgIGlmIChkcykgcmV0dXJuIG5ldyBEYXRhU2V0KGRzKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cdGRlc3Ryb3lEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcblx0XHRyZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZXN0cm95RGF0YVNldChkYXRhU2V0Lmlvcyk7XG5cdH1cbiAgICBhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5hY3RpdmF0ZURhdGFTZXQoZGF0YVNldC5pb3MpO1xuICAgIH1cbiAgICBkZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhT2JqZWN0VHJhY2tlci5nZXRJbnN0YW5jZSgpLmRlYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuaW9zKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcGkgPSBWVUZPUklBX0FWQUlMQUJMRSA/IG5ldyBBUEkoKSA6IHVuZGVmaW5lZDtcbiJdfQ==