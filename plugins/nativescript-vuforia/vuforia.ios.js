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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS5pb3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLmlvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBcUM7QUFFckMseUNBQTRDO0FBRTVDLHlDQUE0QztBQUM1Qyw0Q0FBK0M7QUFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFFcEMsSUFBTSxpQkFBaUIsR0FBRyxPQUFPLGNBQWMsS0FBSyxXQUFXLENBQUM7QUFFaEUsSUFBTSxZQUFZLEdBQXNCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVwRixRQUFBLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN2RCxpQkFBUyxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsVUFBQyxHQUFHO0lBQzdCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFBO0FBQ0YsaUJBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ25CLElBQUksaUJBQWlCO1FBQUUsY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUE7QUFDRixpQkFBUyxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUU7SUFDMUIsSUFBSSxpQkFBaUI7UUFBRSx1QkFBdUIsRUFBRSxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFBO0FBRUYsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFO0lBQ3JDLElBQUksaUJBQWlCLEVBQUU7UUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9CLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN6QixZQUFZLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUN0QyxZQUFZLENBQUMscUJBQXFCLEVBQUUsQ0FBQztLQUN4QztBQUNMLENBQUMsQ0FBQyxDQUFBO0FBRUYsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUU7SUFDaEQsSUFBSSxpQkFBaUIsRUFBRTtRQUNuQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyx5REFBeUQ7UUFDMUcsVUFBVSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQzVDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUU7SUFDcEMsSUFBSSxpQkFBaUIsRUFBRTtRQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDaEMsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFCLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2xDLHVCQUF1QixFQUFFLENBQUM7S0FDN0I7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGO0lBQ0ksSUFBSSxDQUFDLFdBQUc7UUFBRSxNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7SUFDNUIsSUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUM7SUFDM0QsV0FBRyxDQUFDLGdCQUFnQixDQUNoQixZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLEVBQ2xELFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FDdEQsQ0FBQztBQUNOLENBQUM7QUFQRCwwREFPQztBQUVEO0lBQXlCLHVCQUFjO0lBQXZDO1FBQUEscUVBNkhDO1FBM0hXLGtCQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQyxZQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUN0QixjQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQzs7SUF5SHRDLENBQUM7SUF2SEcsMkJBQWEsR0FBYixVQUFjLFVBQWlCO1FBQzNCLE9BQU8sY0FBYyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVELHFCQUFPLEdBQVAsVUFBUSxJQUFhLEVBQUMsS0FBWTtRQUM5QixPQUFPLGNBQWMsQ0FBQyxZQUFZLENBQVMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxrQkFBSSxHQUFKO1FBQUEsaUJBZ0JDO1FBZkcsT0FBTyxJQUFJLE9BQU8sQ0FBaUIsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUMvQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQUMsTUFBTTtnQkFDM0IsSUFBSSxNQUFNLHNCQUE4QixFQUFFO29CQUN0QyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDbEMsdUJBQXVCLEVBQUUsQ0FBQztvQkFDMUIsVUFBVSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUN6QyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsVUFBQyxLQUFLO3dCQUNsQyxJQUFJLEtBQUksQ0FBQyxRQUFROzRCQUNoQixLQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ3JDLENBQUMsQ0FBQyxDQUFDO29CQUNILGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztpQkFDN0I7Z0JBQ0QsT0FBTyxDQUF5QixNQUFNLENBQUMsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELG9CQUFNLEdBQU47UUFDSSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDeEIsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCw2QkFBZSxHQUFmO1FBQ0ksT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFFRCx1QkFBUyxHQUFUO1FBQ0ksT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCx5QkFBVyxHQUFYO1FBQ0ksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3pCLENBQUM7SUFFRCw4QkFBZ0IsR0FBaEI7UUFDSSxJQUFJLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ25DLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUksQ0FBQztTQUNmO1FBQUEsQ0FBQztRQUNGLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxnQ0FBa0IsR0FBbEI7UUFDSSxJQUFJLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBRUQseUNBQTJCLEdBQTNCO1FBQ0ksSUFBSSw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUM5QyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBQzdELE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFBQSxDQUFDO1FBQ0YsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVELDJDQUE2QixHQUE3QjtRQUNJLElBQUksOEJBQThCLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLFNBQVMsQ0FBQztZQUN6QyxPQUFPLElBQUksQ0FBQztTQUNmO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVELCtCQUFpQixHQUFqQjtRQUNJLElBQUksb0JBQW9CLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFBQSxDQUFDO1FBQ0YsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVELGlDQUFtQixHQUFuQjtRQUNJLElBQUksb0JBQW9CLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUM7WUFDL0IsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFRCw0QkFBYyxHQUFkLFVBQWUsQ0FBUTtRQUNuQixjQUFjLENBQUMsY0FBYyxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELDRCQUFjLEdBQWQ7UUFDSSxPQUFPLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsOEJBQWdCLEdBQWhCLFVBQWlCLEtBQVksRUFBRSxNQUFhO1FBQ3hDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUQsSUFBTSxXQUFXLEdBQTBCLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQztRQUNqSSxRQUFRLFdBQVcsRUFBRTtZQUNqQjtnQkFDSSxjQUFjLENBQUMsV0FBVyxrQkFBd0IsQ0FBQztnQkFDbkQsTUFBTTtZQUNWO2dCQUNJLGNBQWMsQ0FBQyxXQUFXLG1CQUF5QixDQUFDO2dCQUNwRCxNQUFNO1lBQ1Y7Z0JBQ0ksY0FBYyxDQUFDLFdBQVcsbUJBQXlCLENBQUM7Z0JBQ3BELE1BQU07WUFDVjtnQkFDSSxjQUFjLENBQUMsV0FBVyxrQkFBdUIsQ0FBQztnQkFDbEQsTUFBTTtZQUNWO2dCQUNJLGNBQWMsQ0FBQyxXQUFXLGtCQUF3QixDQUFDO1NBQzFEO0lBQ0wsQ0FBQztJQUNMLFVBQUM7QUFBRCxDQUFDLEFBN0hELENBQXlCLE1BQU0sQ0FBQyxPQUFPLEdBNkh0QztBQTdIWSxrQkFBRztBQStIaEIsMEJBQTBCLEdBQW1CO0lBQ3pDLE9BQVE7UUFDSSxHQUFHLENBQUMsRUFBRTtRQUNOLEdBQUcsQ0FBQyxFQUFFO1FBQ04sR0FBRyxDQUFDLEVBQUU7UUFDTixDQUFDO1FBQ0QsR0FBRyxDQUFDLEVBQUU7UUFDTixHQUFHLENBQUMsRUFBRTtRQUNOLEdBQUcsQ0FBQyxFQUFFO1FBQ04sQ0FBQztRQUNELEdBQUcsQ0FBQyxFQUFFO1FBQ04sR0FBRyxDQUFDLEVBQUU7UUFDTixHQUFHLENBQUMsR0FBRztRQUNQLENBQUM7UUFDRCxHQUFHLENBQUMsRUFBRTtRQUNOLEdBQUcsQ0FBQyxFQUFFO1FBQ04sR0FBRyxDQUFDLEdBQUc7UUFDUCxDQUFDO0tBQ0osQ0FBQztBQUNkLENBQUM7QUFFRCwrQkFBK0IsR0FBZ0I7SUFDM0MsT0FBUTtRQUNKLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ1YsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDVixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNWLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ1gsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDVixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNWLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ1YsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDWCxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNWLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ1YsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDWixHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztLQUNmLENBQUM7QUFDTixDQUFDO0FBRUQsZ0ZBQWdGO0FBQ2hGLCtDQUErQyxHQUFtQixFQUFFLElBQVcsRUFBRSxHQUFVO0lBQ3ZGLE9BQVE7UUFDSSxHQUFHLENBQUMsRUFBRTtRQUNOLEdBQUcsQ0FBQyxFQUFFO1FBQ04sR0FBRyxDQUFDLEVBQUU7UUFDTixDQUFDO1FBQ0QsR0FBRyxDQUFDLEVBQUU7UUFDTixHQUFHLENBQUMsRUFBRTtRQUNOLEdBQUcsQ0FBQyxFQUFFO1FBQ04sQ0FBQztRQUNELEdBQUcsQ0FBQyxFQUFFO1FBQ04sR0FBRyxDQUFDLEVBQUU7UUFDTixDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7UUFDM0IsQ0FBQztRQUNELEdBQUcsQ0FBQyxFQUFFO1FBQ04sR0FBRyxDQUFDLEVBQUU7UUFDTixDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUN6QyxDQUFDO0tBQ0osQ0FBQztBQUNkLENBQUM7QUFHRDtJQW1CSSxtQkFBbUIsR0FBb0I7UUFBcEIsUUFBRyxHQUFILEdBQUcsQ0FBaUI7SUFBRyxDQUFDO0lBakJwQyx5QkFBZSxHQUF0QixVQUF1QixHQUFvQjtRQUN2QyxJQUFJLEdBQUcsWUFBWSxhQUFhLEVBQUU7WUFDOUIsT0FBTyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUMxQjtRQUFDLElBQUksR0FBRyxZQUFZLHNCQUFzQixFQUFFO1lBQ3pDLE9BQU8sSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDbkM7YUFBTSxJQUFJLEdBQUcsWUFBWSxrQkFBa0IsRUFBRTtZQUMxQyxPQUFPLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQy9CO2FBQU0sSUFBSSxHQUFHLFlBQVkscUJBQXFCLEVBQUU7WUFDN0MsT0FBTyxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNsQzthQUFNLElBQUksR0FBRyxZQUFZLG1CQUFtQixFQUFFO1lBQzNDLE9BQU8sSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDaEM7YUFBTSxJQUFJLEdBQUcsWUFBWSxnQkFBZ0IsRUFBRTtZQUN4QyxPQUFPLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzdCO1FBQ0QsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFJRCx5QkFBSyxHQUFMO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFDRCwyQkFBTyxHQUFQO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFDRCw2Q0FBeUIsR0FBekI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBQ0QseUNBQXFCLEdBQXJCO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUNELHdDQUFvQixHQUFwQjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFDTCxnQkFBQztBQUFELENBQUMsQUFwQ0QsSUFvQ0M7QUFwQ1ksOEJBQVM7QUFzQ3RCO0lBbUJJLHlCQUFtQixHQUEwQjtRQUExQixRQUFHLEdBQUgsR0FBRyxDQUF1QjtJQUFHLENBQUM7SUFqQjFDLHFDQUFxQixHQUE1QixVQUE2QixHQUEwQjtRQUNuRCxJQUFJLEdBQUcsWUFBWSxtQkFBbUIsRUFBRTtZQUNwQyxPQUFPLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2hDO2FBQU0sSUFBSSxHQUFHLFlBQVksNEJBQTRCLEVBQUU7WUFDcEQsT0FBTyxJQUFJLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1NBQ3hDO2FBQU0sSUFBSSxHQUFHLFlBQVksd0JBQXdCLEVBQUU7WUFDaEQsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1NBQ3BDO2FBQU0sSUFBSSxHQUFHLFlBQVksMkJBQTJCLEVBQUU7WUFDbkQsT0FBTyxJQUFJLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1NBQ3ZDO2FBQU0sSUFBSSxHQUFHLFlBQVkseUJBQXlCLEVBQUU7WUFDakQsT0FBTyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3RDO2FBQU0sSUFBSSxHQUFHLFlBQVksc0JBQXNCLEVBQUU7WUFDOUMsT0FBTyxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQztRQUNELE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBSUQsaUNBQU8sR0FBUDtRQUNJLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxzQ0FBWSxHQUFaO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxtQ0FBUyxHQUFUO1FBQ0ksT0FBZSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFFRCxzQ0FBWSxHQUFaO1FBQ0ksT0FBTyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBQ0wsc0JBQUM7QUFBRCxDQUFDLEFBcENELElBb0NDO0FBcENZLDBDQUFlO0FBc0M1QjtJQUFxQyxtQ0FBUztJQUMxQyx5QkFBbUIsR0FBMEI7UUFBN0MsWUFBZ0Qsa0JBQU0sR0FBRyxDQUFDLFNBQUM7UUFBeEMsU0FBRyxHQUFILEdBQUcsQ0FBdUI7O0lBQWEsQ0FBQztJQUMvRCxzQkFBQztBQUFELENBQUMsQUFGRCxDQUFxQyxTQUFTLEdBRTdDO0FBRlksMENBQWU7QUFJNUI7SUFBMkMseUNBQWU7SUFDdEQsK0JBQW1CLEdBQWdDO1FBQW5ELFlBQXNELGtCQUFNLEdBQUcsQ0FBQyxTQUFDO1FBQTlDLFNBQUcsR0FBSCxHQUFHLENBQTZCOztJQUFhLENBQUM7SUFDckUsNEJBQUM7QUFBRCxDQUFDLEFBRkQsQ0FBMkMsZUFBZSxHQUV6RDtBQUZZLHNEQUFxQjtBQUlsQztJQUE0QiwwQkFBUztJQUNqQyxnQkFBbUIsR0FBaUI7UUFBcEMsWUFBdUMsa0JBQU0sR0FBRyxDQUFDLFNBQUM7UUFBL0IsU0FBRyxHQUFILEdBQUcsQ0FBYzs7SUFBYSxDQUFDO0lBQ3RELGFBQUM7QUFBRCxDQUFDLEFBRkQsQ0FBNEIsU0FBUyxHQUVwQztBQUZZLHdCQUFNO0FBSW5CO0lBQWtDLGdDQUFlO0lBQzdDLHNCQUFtQixHQUF1QjtRQUExQyxZQUE2QyxrQkFBTSxHQUFHLENBQUMsU0FBQztRQUFyQyxTQUFHLEdBQUgsR0FBRyxDQUFvQjs7SUFBYSxDQUFDO0lBQzVELG1CQUFDO0FBQUQsQ0FBQyxBQUZELENBQWtDLGVBQWUsR0FFaEQ7QUFGWSxvQ0FBWTtBQUl6QjtJQUFrQyxnQ0FBUztJQUN2QyxzQkFBbUIsR0FBdUI7UUFBMUMsWUFBNkMsa0JBQU0sR0FBRyxDQUFDLFNBQUM7UUFBckMsU0FBRyxHQUFILEdBQUcsQ0FBb0I7O0lBQWEsQ0FBQztJQUV4RCx3Q0FBaUIsR0FBakI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsOEJBQU8sR0FBUDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBQ0wsbUJBQUM7QUFBRCxDQUFDLEFBVkQsQ0FBa0MsU0FBUyxHQVUxQztBQVZZLG9DQUFZO0FBWXpCO0lBQXdDLHNDQUFlO0lBQ25ELDRCQUFtQixHQUE2QjtRQUFoRCxZQUFtRCxrQkFBTSxHQUFHLENBQUMsU0FBQztRQUEzQyxTQUFHLEdBQUgsR0FBRyxDQUEwQjs7SUFBYSxDQUFDO0lBQ2xFLHlCQUFDO0FBQUQsQ0FBQyxBQUZELENBQXdDLGVBQWUsR0FFdEQ7QUFGWSxnREFBa0I7QUFJL0I7SUFBMEIsK0JBQVk7SUFDbEMscUJBQW1CLEdBQXNCO1FBQXpDLFlBQTRDLGtCQUFNLEdBQUcsQ0FBQyxTQUFDO1FBQXBDLFNBQUcsR0FBSCxHQUFHLENBQW1COztJQUFhLENBQUM7SUFDM0Qsa0JBQUM7QUFBRCxDQUFDLEFBRkQsQ0FBMEIsWUFBWSxHQUVyQztBQUVEO0lBQWdDLHFDQUFrQjtJQUM5QywyQkFBbUIsR0FBNEI7UUFBL0MsWUFBa0Qsa0JBQU0sR0FBRyxDQUFDLFNBQUM7UUFBMUMsU0FBRyxHQUFILEdBQUcsQ0FBeUI7O0lBQWEsQ0FBQztJQUNqRSx3QkFBQztBQUFELENBQUMsQUFGRCxDQUFnQyxrQkFBa0IsR0FFakQ7QUFFRDtJQUFpQywrQkFBWTtJQUN6QyxxQkFBbUIsR0FBc0I7UUFBekMsWUFBNEMsa0JBQU0sR0FBRyxDQUFDLFNBQUM7UUFBcEMsU0FBRyxHQUFILEdBQUcsQ0FBbUI7O0lBQWEsQ0FBQztJQUMzRCxrQkFBQztBQUFELENBQUMsQUFGRCxDQUFpQyxZQUFZLEdBRTVDO0FBRlksa0NBQVc7QUFJeEI7SUFBdUMscUNBQWtCO0lBQ3JELDJCQUFtQixHQUE2QjtRQUFoRCxZQUFtRCxrQkFBTSxHQUFHLENBQUMsU0FBQztRQUEzQyxTQUFHLEdBQUgsR0FBRyxDQUEwQjs7SUFBYSxDQUFDO0lBQ2xFLHdCQUFDO0FBQUQsQ0FBQyxBQUZELENBQXVDLGtCQUFrQixHQUV4RDtBQUZZLDhDQUFpQjtBQUk5QjtJQUE2QixrQ0FBWTtJQUNyQyx3QkFBbUIsR0FBeUI7UUFBNUMsWUFBK0Msa0JBQU0sR0FBRyxDQUFDLFNBQUM7UUFBdkMsU0FBRyxHQUFILEdBQUcsQ0FBc0I7O0lBQWEsQ0FBQztJQUM5RCxxQkFBQztBQUFELENBQUMsQUFGRCxDQUE2QixZQUFZLEdBRXhDO0FBRUQ7SUFBbUMsd0NBQWtCO0lBQ2pELDhCQUFtQixHQUErQjtRQUFsRCxZQUFxRCxrQkFBTSxHQUFHLENBQUMsU0FBQztRQUE3QyxTQUFHLEdBQUgsR0FBRyxDQUE0Qjs7SUFBYSxDQUFDO0lBQ3BFLDJCQUFDO0FBQUQsQ0FBQyxBQUZELENBQW1DLGtCQUFrQixHQUVwRDtBQUVEO0lBQ0ksZUFBbUIsR0FBZ0I7UUFBaEIsUUFBRyxHQUFILEdBQUcsQ0FBYTtJQUFHLENBQUM7SUFFdkMsK0JBQWUsR0FBZjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsOEJBQWMsR0FBZDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQseUJBQVMsR0FBVDtRQUNJLE9BQWUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQseUJBQVMsR0FBVDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQseUJBQVMsR0FBVDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQseUJBQVMsR0FBVDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQsd0JBQVEsR0FBUjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBQ0wsWUFBQztBQUFELENBQUMsQUE5QkQsSUE4QkM7QUE5Qlksc0JBQUs7QUFnQ2xCO0lBQ0ksZUFBbUIsR0FBZ0I7UUFBaEIsUUFBRyxHQUFILEdBQUcsQ0FBYTtJQUFHLENBQUM7SUFDdkMsd0JBQVEsR0FBUixVQUFTLEdBQVc7UUFDaEIsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEVBQUU7WUFDTCxPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUNELHdCQUFRLEdBQVI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUNELDRCQUFZLEdBQVo7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUNELDRCQUFZLEdBQVo7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUNMLFlBQUM7QUFBRCxDQUFDLEFBbEJELElBa0JDO0FBbEJZLHNCQUFLO0FBb0JsQjtJQUNJLGVBQW1CLEdBQWdCO1FBQWhCLFFBQUcsR0FBSCxHQUFHLENBQWE7SUFBRyxDQUFDO0lBQ3ZDLHdCQUFRLEdBQVI7UUFDSSxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUNELHNDQUFzQixHQUF0QjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO0lBQzdDLENBQUM7SUFDRCxnQ0FBZ0IsR0FBaEI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBQ0QsNEJBQVksR0FBWixVQUFhLEdBQVc7UUFDcEIsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0MsSUFBSSxTQUFTLEVBQUU7WUFDWCxPQUFPLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDL0M7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBQ0Qsa0NBQWtCLEdBQWxCLFVBQW1CLEdBQVc7UUFDMUIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoRCxJQUFJLE1BQU0sRUFBRTtZQUNSLE9BQU8sZUFBZSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3hEO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUNMLFlBQUM7QUFBRCxDQUFDLEFBMUJELElBMEJDO0FBMUJZLHNCQUFLO0FBNEJsQjtJQUNJLDJCQUFtQixHQUE0QjtRQUE1QixRQUFHLEdBQUgsR0FBRyxDQUF5QjtJQUFHLENBQUM7SUFFbkQsbURBQXVCLEdBQXZCO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVELDhDQUFrQixHQUFsQjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCwwQ0FBYyxHQUFkO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRCw2Q0FBaUIsR0FBakI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsbUNBQU8sR0FBUDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBQ0wsd0JBQUM7QUFBRCxDQUFDLEFBdEJELElBc0JDO0FBdEJZLDhDQUFpQjtBQXdCOUI7SUFBQTtJQTZDQSxDQUFDO0lBNUNHLDJCQUFJLEdBQUosVUFBSyxNQUFpQztRQUNsQyxPQUFPLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBUyxNQUFNLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRUQsNkJBQU0sR0FBTjtRQUNJLE9BQU8sbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDNUQsQ0FBQztJQUVELDJDQUFvQixHQUFwQjtRQUNJLElBQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDN0UsT0FBTyxJQUFJLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCx5Q0FBa0IsR0FBbEI7UUFDSSxPQUFlLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDMUUsQ0FBQztJQUVELHVDQUFnQixHQUFoQjtRQUNJLE9BQU8sbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUNoRSxDQUFDO0lBRUQsbUNBQVksR0FBWixVQUFhLE1BQWM7UUFDdkIsT0FBTyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELHNDQUFlLEdBQWYsVUFBZ0IsS0FBYTtRQUN6QixPQUFPLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsd0NBQWlCLEdBQWpCLFVBQWtCLEVBQVc7UUFDekIsT0FBTyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsbUNBQVksR0FBWixVQUFhLFNBQW9DO1FBQzdDLE9BQU8sbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUMsWUFBWSxDQUFTLFNBQVMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCw0QkFBSyxHQUFMO1FBQ0ksT0FBTyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyRCxDQUFDO0lBRUQsMkJBQUksR0FBSjtRQUNJLE9BQU8sbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDcEQsQ0FBQztJQUNMLG1CQUFDO0FBQUQsQ0FBQyxBQTdDRCxJQTZDQztBQTdDWSxvQ0FBWTtBQStDekI7SUFDSSxrQkFBbUIsR0FBbUI7UUFBbkIsUUFBRyxHQUFILEdBQUcsQ0FBZ0I7SUFBRyxDQUFDO0lBQzFDLDJCQUFRLEdBQVIsVUFBUyxJQUFjO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQVMsSUFBSSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUNELDhCQUFXLEdBQVg7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUNELDBCQUFPLEdBQVAsVUFBUSxHQUFXO1FBQ2YsT0FBZSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBQ0wsZUFBQztBQUFELENBQUMsQUFYRCxJQVdDO0FBWFksNEJBQVE7QUFhckI7SUFDSSwwQkFBbUIsR0FBMkI7UUFBM0IsUUFBRyxHQUFILEdBQUcsQ0FBd0I7SUFBRyxDQUFDO0lBQ2xELHlDQUFjLEdBQWQ7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUNELHdDQUFhLEdBQWI7UUFDSSxPQUFlLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUNELG1EQUF3QixHQUF4QixVQUF5QixHQUFXO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBQ0QseUNBQWMsR0FBZDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBQ0QsK0NBQW9CLEdBQXBCO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUNELHNEQUEyQixHQUEzQjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDO0lBQ2xELENBQUM7SUFDRCwwQ0FBZSxHQUFmO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFDRCxrQ0FBTyxHQUFQO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFDRCx1REFBNEIsR0FBNUI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztJQUNuRCxDQUFDO0lBQ0Qsa0RBQXVCLEdBQXZCO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDOUMsQ0FBQztJQUNELDJDQUFnQixHQUFoQjtRQUNJLE9BQWUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQy9DLENBQUM7SUFDRCxxQ0FBVSxHQUFWO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFDTCx1QkFBQztBQUFELENBQUMsQUF0Q0QsSUFzQ0M7QUF0Q1ksNENBQWdCO0FBd0M3QjtJQUNJLDhCQUFtQixHQUErQjtRQUEvQixRQUFHLEdBQUgsR0FBRyxDQUE0QjtJQUFHLENBQUM7SUFDdEQsa0NBQUcsR0FBSCxVQUFJLEdBQVc7UUFDWCxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixJQUFJLEVBQUU7WUFBRSxPQUFPLElBQUksZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEMsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUNELGtEQUFtQixHQUFuQixVQUFvQixJQUFZLEVBQUUsWUFBb0I7UUFDbEQsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUQsSUFBSSxFQUFFO1lBQUUsT0FBTyxJQUFJLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFDRCwyQ0FBWSxHQUFaLFVBQWEsTUFBYztRQUN2QixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBQ0QsbUNBQUksR0FBSjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBQ0wsMkJBQUM7QUFBRCxDQUFDLEFBbEJELElBa0JDO0FBbEJZLG9EQUFvQjtBQXFCakM7SUFBQTtJQTJCQSxDQUFDO0lBMUJHLHdCQUFPLEdBQVAsVUFBUSxJQUFtQjtRQUN2QixPQUFPLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQVMsSUFBSSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUNELHdCQUFPLEdBQVA7UUFDSSxPQUFlLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0lBQ0QsZ0NBQWUsR0FBZixVQUFnQixNQUFjO1FBQzFCLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUNELCtCQUFjLEdBQWQ7UUFDSSxPQUFPLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsOEJBQWEsR0FBYjtRQUNJLElBQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvRCxPQUFPLElBQUksb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUNELDZCQUFZLEdBQVosVUFBYSxNQUF1QjtRQUNoQyxPQUFPLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFDRCxrQ0FBaUIsR0FBakI7UUFDSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQzdDLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFDRCx1Q0FBc0IsR0FBdEI7UUFDSSxPQUFPLElBQUksbUJBQW1CLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBQ0wsYUFBQztBQUFELENBQUMsQUEzQkQsSUEyQkM7QUEzQlksd0JBQU07QUE2Qm5CO0lBQUE7SUFhQSxDQUFDO0lBWkcsb0NBQWlCLEdBQWpCLFVBQWtCLEtBQWtCO1FBQ2hDLE9BQU8sZUFBZSxDQUFDLGlCQUFpQixDQUFTLEtBQUssQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFDRCwyQ0FBd0IsR0FBeEI7UUFDSSxPQUFPLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0lBQ3RELENBQUM7SUFDRCwrQkFBWSxHQUFaLFVBQWEsR0FBVztRQUNwQixPQUFPLGVBQWUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUNELDJDQUF3QixHQUF4QixVQUF5QixHQUE4QjtRQUNuRCxlQUFlLENBQUMsd0JBQXdCLENBQStCLEdBQUcsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFDTCxlQUFDO0FBQUQsQ0FBQyxBQWJELElBYUM7QUFiWSw0QkFBUTtBQWVyQjtJQUNJLGNBQW1CLEdBQWU7UUFBZixRQUFHLEdBQUgsR0FBRyxDQUFZO0lBQUcsQ0FBQztJQUV0QyxtQ0FBb0IsR0FBcEI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBQ0QseUJBQVUsR0FBVjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBQ0QsOEJBQWUsR0FBZjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsNkJBQWMsR0FBZDtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQscUNBQXNCLEdBQXRCO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUVELDJCQUFZLEdBQVo7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELDJCQUFZLEdBQVo7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELCtCQUFnQixHQUFoQjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxxQkFBTSxHQUFOO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCx5QkFBVSxHQUFWO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCwyQkFBWSxHQUFaO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxxQkFBTSxHQUFOO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFDTCxXQUFDO0FBQUQsQ0FBQyxBQWhERCxJQWdEQztBQWhEWSxvQkFBSTtBQWtEakI7SUFFSSw2QkFBbUIsR0FBOEI7UUFBOUIsUUFBRyxHQUFILEdBQUcsQ0FBMkI7SUFBRSxDQUFDO0lBRXBELHNEQUF3QixHQUF4QixVQUF5QixNQUFnQjtRQUNyQyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFTLE1BQU0sQ0FBQyxDQUFDO1FBQy9ELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELHNEQUF3QixHQUF4QixVQUF5QixNQUFnQjtRQUNyQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQVMsTUFBTSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELDBEQUE0QixHQUE1QixVQUE2QixNQUFnQjtRQUN6QyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQVMsTUFBTSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELDJEQUE2QixHQUE3QixVQUE4QixNQUFnQjtRQUMxQyxPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQVMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRUQsbURBQXFCLEdBQXJCLFVBQXNCLE1BQWdCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBUyxNQUFNLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsaURBQW1CLEdBQW5CLFVBQW9CLE1BQWdCO1FBQ2hDLE9BQU8scUNBQXFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBUyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDN0csQ0FBQztJQUVELCtDQUFpQixHQUFqQjtRQUNJLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELG9EQUFzQixHQUF0QixVQUF1QixNQUFnQjtRQUNuQyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFTLE1BQU0sQ0FBQyxDQUFDO1FBQzdELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELGdFQUFrQyxHQUFsQyxVQUFtQyxNQUFnQjtRQUMvQyxPQUFPLHFDQUFxQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQVMsTUFBTSxDQUFDLEVBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdILENBQUM7SUFFRCx5Q0FBVyxHQUFYLFVBQVksTUFBZ0I7UUFDeEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBUyxNQUFNLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUwsMEJBQUM7QUFBRCxDQUFDLEFBOUNELElBOENDO0FBOUNZLGtEQUFtQjtBQWdEaEM7SUFDSSxpQkFBbUIsR0FBa0I7UUFBbEIsUUFBRyxHQUFILEdBQUcsQ0FBZTtJQUFFLENBQUM7SUFDeEMsbUNBQWlCLEdBQWpCLFVBQWtCLElBQVk7UUFDMUIsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEVBQUU7WUFBRSxPQUFPLElBQUksV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFDRCx5QkFBTyxHQUFQLFVBQVEsU0FBb0I7UUFDeEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUNELHdCQUFNLEdBQU4sVUFBTyxJQUFZLEVBQUUsV0FBNEI7UUFDN0MsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBVSxXQUFXLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBQ0Qsa0NBQWdCLEdBQWhCO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUNELDhCQUFZLEdBQVosVUFBYSxHQUFXO1FBQ3BCLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdDLElBQUksU0FBUztZQUFFLE9BQU8sU0FBUyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxPQUFPLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBQ0QsMENBQXdCLEdBQXhCO1FBQ0ksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDL0MsQ0FBQztJQUNELDBCQUFRLEdBQVI7UUFDSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUNELHNCQUFJLEdBQUosVUFBSyxJQUFZLEVBQUUsV0FBNEI7UUFDM0MsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQVUsV0FBVyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUNMLGNBQUM7QUFBRCxDQUFDLEFBOUJELElBOEJDO0FBRUQ7SUFBQTtJQVFBLENBQUM7SUFORyx1QkFBSyxHQUFMO1FBQ0ksT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2xELENBQUM7SUFDRCxzQkFBSSxHQUFKO1FBQ0ksSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBQ0wsY0FBQztBQUFELENBQUMsQUFSRCxJQVFDO0FBUnFCLDBCQUFPO0FBVTdCO0lBQ0ksdUJBQW1CLEdBQXdCO1FBQXhCLFFBQUcsR0FBSCxHQUFHLENBQXFCO0lBQUcsQ0FBQztJQUFBLENBQUM7SUFDaEQsK0JBQU8sR0FBUDtRQUNJLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFDTCxvQkFBQztBQUFELENBQUMsQUFMRCxJQUtDO0FBTFksc0NBQWE7QUFPMUI7SUFBNkMsMkNBQU87SUFBcEQ7UUFBQSxxRUFxQkM7UUFwQkcsaUJBQVcsR0FBRyw4QkFBOEIsQ0FBQzs7SUFvQmpELENBQUM7SUFuQkcsc0RBQW9CLEdBQXBCLFVBQXFCLElBQVksRUFBRSxJQUFrQjtRQUNqRCxJQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRCxJQUFNLGFBQWEsR0FBRyw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0csT0FBTyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDNUQsQ0FBQztJQUNELCtEQUE2QixHQUE3QixVQUE4QixJQUFZLEVBQUUsYUFBNEI7UUFDcEUsSUFBTSxhQUFhLEdBQUcsOEJBQThCLENBQUMsV0FBVyxFQUFFLENBQUMsaUNBQWlDLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5SCxPQUFPLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUM1RCxDQUFDO0lBQ0QsK0NBQWEsR0FBYixVQUFjLE1BQWM7UUFDeEIsT0FBTyw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFDRCwrQ0FBYSxHQUFiO1FBQ0ksT0FBTyw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNyRSxDQUFDO0lBQ0QsMkNBQVMsR0FBVCxVQUFVLEdBQVc7UUFDakIsSUFBTSxhQUFhLEdBQUcsOEJBQThCLENBQUMsV0FBVyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekYsT0FBTyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDNUQsQ0FBQztJQUNMLDhCQUFDO0FBQUQsQ0FBQyxBQXJCRCxDQUE2QyxPQUFPLEdBcUJuRDtBQXJCWSwwREFBdUI7QUF1QnBDO0lBQWtDLGdDQUFPO0lBQXpDO1FBQUEscUVBb0JDO1FBbkJHLGlCQUFXLEdBQUcsbUJBQW1CLENBQUM7O0lBbUJ0QyxDQUFDO0lBakJHLDhCQUFPLEdBQVAsVUFBUSxLQUFXLEVBQUUsS0FBYyxFQUFFLG1CQUEwQixFQUFDLElBQW9CO1FBQ2hGLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLHFDQUFxQyxDQUNuRSxLQUFLLENBQUMsR0FBRyxFQUNULEtBQUssRUFDTCxtQkFBbUIsRUFDWCxJQUFJLENBQ2YsQ0FBQztJQUNOLENBQUM7SUFFRCw0Q0FBcUIsR0FBckI7UUFDSSxPQUFPLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDbEUsQ0FBQztJQUVELHVDQUFnQixHQUFoQixVQUFpQixHQUFVO1FBQ3ZCLElBQU0sQ0FBQyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUNMLG1CQUFDO0FBQUQsQ0FBQyxBQXBCRCxDQUFrQyxPQUFPLEdBb0J4QztBQXBCWSxvQ0FBWTtBQXNCekI7SUFBbUMsaUNBQU87SUFBMUM7UUFBQSxxRUFnQkM7UUFmRyxpQkFBVyxHQUFHLG9CQUFvQixDQUFDOztJQWV2QyxDQUFDO0lBZEcscUNBQWEsR0FBYjtRQUNJLElBQU0sRUFBRSxHQUFHLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzlELElBQUksRUFBRTtZQUFFLE9BQU8sSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUNKLHNDQUFjLEdBQWQsVUFBZSxPQUFlO1FBQzdCLE9BQU8sb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBQ0UsdUNBQWUsR0FBZixVQUFnQixPQUFlO1FBQzNCLE9BQU8sb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBQ0QseUNBQWlCLEdBQWpCLFVBQWtCLE9BQWU7UUFDN0IsT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUNMLG9CQUFDO0FBQUQsQ0FBQyxBQWhCRCxDQUFtQyxPQUFPLEdBZ0J6QztBQWhCWSxzQ0FBYTtBQWtCYixRQUFBLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQgY29tbW9uID0gcmVxdWlyZSgnLi92dWZvcmlhLWNvbW1vbicpO1xuaW1wb3J0IGRlZiA9IHJlcXVpcmUoJ25hdGl2ZXNjcmlwdC12dWZvcmlhJyk7XG5pbXBvcnQgYXBwbGljYXRpb24gPSByZXF1aXJlKCdhcHBsaWNhdGlvbicpO1xuaW1wb3J0IHBsYWNlaG9sZGVyID0gcmVxdWlyZSgndWkvcGxhY2Vob2xkZXInKTtcblxuZ2xvYmFsLm1vZHVsZU1lcmdlKGNvbW1vbiwgZXhwb3J0cyk7XG5cbmNvbnN0IFZVRk9SSUFfQVZBSUxBQkxFID0gdHlwZW9mIFZ1Zm9yaWFTZXNzaW9uwqAhPT0gJ3VuZGVmaW5lZCc7XG5cbmNvbnN0IGlvc1ZpZGVvVmlldyA9IDxWdWZvcmlhVmlkZW9WaWV3PiAoVlVGT1JJQV9BVkFJTEFCTEUgPyBWdWZvcmlhVmlkZW9WaWV3Lm5ldygpIDogdW5kZWZpbmVkKTtcblxuZXhwb3J0IGNvbnN0IHZpZGVvVmlldyA9IG5ldyBwbGFjZWhvbGRlci5QbGFjZWhvbGRlcigpO1xudmlkZW9WaWV3Lm9uKCdjcmVhdGluZ1ZpZXcnLCAoZXZ0KT0+e1xuICAgIGV2dC52aWV3ID0gaW9zVmlkZW9WaWV3O1xufSlcbnZpZGVvVmlldy5vbignbG9hZGVkJywgKCk9PntcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbn0pXG52aWRlb1ZpZXcub24oJ2xheW91dENoYW5nZWQnLCAoKSA9PiB7XG4gICAgaWYgKFZVRk9SSUFfQVZBSUxBQkxFKSBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xufSlcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24uc3VzcGVuZEV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BhdXNpbmcgVnVmb3JpYScpO1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblBhdXNlKCk7XG4gICAgICAgIGlvc1ZpZGVvVmlldy5maW5pc2hPcGVuR0xFU0NvbW1hbmRzKCk7XG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmVlT3BlbkdMRVNSZXNvdXJjZXMoKTtcbiAgICB9XG59KVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCkgPT4ge1xuICAgIGlmIChWVUZPUklBX0FWQUlMQUJMRSkge1xuICAgICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKGNvbmZpZ3VyZVZ1Zm9yaWFTdXJmYWNlKTsgLy8gZGVsYXkgdW50aWwgdGhlIGludGVyZmFjZSBvcmllbnRhdGlvbiBhY3R1YWxseSBjaGFuZ2VzXG4gICAgICAgIHNldFRpbWVvdXQoY29uZmlndXJlVnVmb3JpYVN1cmZhY2UsIDUwMCk7XG4gICAgfVxufSk7XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnJlc3VtZUV2ZW50LCAoKT0+IHtcbiAgICBpZiAoVlVGT1JJQV9BVkFJTEFCTEUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Jlc3VtaW5nIFZ1Zm9yaWEnKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25SZXN1bWUoKTtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24ub25TdXJmYWNlQ3JlYXRlZCgpO1xuICAgICAgICBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgIH1cbn0pXG5cbmV4cG9ydCBmdW5jdGlvbiBjb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpIHtcbiAgICBpZiAoIWFwaSkgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgY29uc3QgY29udGVudFNjYWxlRmFjdG9yID0gaW9zVmlkZW9WaWV3LmNvbnRlbnRTY2FsZUZhY3RvcjtcbiAgICBhcGkub25TdXJmYWNlQ2hhbmdlZChcbiAgICAgICAgaW9zVmlkZW9WaWV3LmZyYW1lLnNpemUud2lkdGggKiBjb250ZW50U2NhbGVGYWN0b3IsXG4gICAgICAgIGlvc1ZpZGVvVmlldy5mcmFtZS5zaXplLmhlaWdodCAqIGNvbnRlbnRTY2FsZUZhY3RvclxuICAgICk7XG59XG5cbmV4cG9ydCBjbGFzcyBBUEkgZXh0ZW5kcyBjb21tb24uQVBJQmFzZSB7XG4gICAgXG4gICAgcHJpdmF0ZSBjYW1lcmFEZXZpY2UgPSBuZXcgQ2FtZXJhRGV2aWNlKCk7XG4gICAgcHJpdmF0ZSBkZXZpY2UgPSBuZXcgRGV2aWNlKCk7XG4gICAgcHJpdmF0ZSByZW5kZXJlciA9IG5ldyBSZW5kZXJlcigpO1xuICAgIFxuICAgIHNldExpY2Vuc2VLZXkobGljZW5zZUtleTpzdHJpbmcpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU2Vzc2lvbi5zZXRMaWNlbnNlS2V5KGxpY2Vuc2VLZXkpID09PSAwO1xuICAgIH1cbiAgICBcbiAgICBzZXRIaW50KGhpbnQ6ZGVmLkhpbnQsdmFsdWU6bnVtYmVyKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVNlc3Npb24uc2V0SGludFZhbHVlKDxudW1iZXI+aGludCwgdmFsdWUpO1xuICAgIH1cbiAgICBcbiAgICBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxkZWYuSW5pdFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uaW5pdERvbmUoKHJlc3VsdCk9PntcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09PSBWdWZvcmlhSW5pdFJlc3VsdC5TVUNDRVNTKSB7XG4gICAgICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uU3VyZmFjZUNyZWF0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJlVnVmb3JpYVN1cmZhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChjb25maWd1cmVWdWZvcmlhU3VyZmFjZSwgNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24ucmVnaXN0ZXJDYWxsYmFjaygoc3RhdGUpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrKG5ldyBTdGF0ZShzdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24ub25SZXN1bWUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSg8ZGVmLkluaXRSZXN1bHQ+PG51bWJlcj5yZXN1bHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCkgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24uZGVpbml0KCk7XG4gICAgICAgIFZ1Zm9yaWFTZXNzaW9uLm9uUGF1c2UoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Q2FtZXJhRGV2aWNlKCkgOiBDYW1lcmFEZXZpY2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5jYW1lcmFEZXZpY2U7XG4gICAgfVxuICAgIFxuICAgIGdldERldmljZSgpIDogRGV2aWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGV2aWNlO1xuICAgIH1cbiAgICBcbiAgICBnZXRSZW5kZXJlcigpIDogUmVuZGVyZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJlcjtcbiAgICB9XG5cbiAgICBpbml0U21hcnRUZXJyYWluKCkgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKFZ1Zm9yaWFTbWFydFRlcnJhaW4uaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5zbWFydFRlcnJhaW4gPSBuZXcgU21hcnRUZXJyYWluKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGRlaW5pdFNtYXJ0VGVycmFpbigpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChWdWZvcmlhT2JqZWN0VHJhY2tlci5kZWluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0VHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmluaXRUcmFja2VyKCkpIHtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25hbERldmljZVRyYWNrZXIgPSBuZXcgUG9zaXRpb25hbERldmljZVRyYWNrZXIoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZGVpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmRlaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbmFsRGV2aWNlVHJhY2tlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaW5pdE9iamVjdFRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYU9iamVjdFRyYWNrZXIuaW5pdFRyYWNrZXIoKSkge1xuICAgICAgICAgICAgdGhpcy5vYmplY3RUcmFja2VyID0gbmV3IE9iamVjdFRyYWNrZXIoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGRlaW5pdE9iamVjdFRyYWNrZXIoKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoVnVmb3JpYU9iamVjdFRyYWNrZXIuZGVpbml0VHJhY2tlcigpKSB7XG4gICAgICAgICAgICB0aGlzLm9iamVjdFRyYWNrZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgc2V0U2NhbGVGYWN0b3IoZjpudW1iZXIpIHtcbiAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IgJiYgVnVmb3JpYVNlc3Npb24uc2V0U2NhbGVGYWN0b3IoZik7XG4gICAgfVxuXG4gICAgZ2V0U2NhbGVGYWN0b3IoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU2Vzc2lvbi5zY2FsZUZhY3RvcigpO1xuICAgIH1cblxuICAgIG9uU3VyZmFjZUNoYW5nZWQod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyKSA6IHZvaWQge1xuICAgICAgICBWdWZvcmlhU2Vzc2lvbi5vblN1cmZhY2VDaGFuZ2VkV2lkdGhIZWlnaHQod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnN0IG9yaWVudGF0aW9uOlVJSW50ZXJmYWNlT3JpZW50YXRpb24gPSB1dGlscy5pb3MuZ2V0dGVyKFVJQXBwbGljYXRpb24sIFVJQXBwbGljYXRpb24uc2hhcmVkQXBwbGljYXRpb24pLnN0YXR1c0Jhck9yaWVudGF0aW9uO1xuICAgICAgICBzd2l0Y2ggKG9yaWVudGF0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIFVJSW50ZXJmYWNlT3JpZW50YXRpb24uUG9ydHJhaXQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfOTApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLlBvcnRyYWl0VXBzaWRlRG93bjogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18yNzApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBVSUludGVyZmFjZU9yaWVudGF0aW9uLkxhbmRzY2FwZUxlZnQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfMTgwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVUlJbnRlcmZhY2VPcmllbnRhdGlvbi5MYW5kc2NhcGVSaWdodDogXG4gICAgICAgICAgICAgICAgVnVmb3JpYVNlc3Npb24uc2V0Um90YXRpb24oVnVmb3JpYVJvdGF0aW9uLklPU18wKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6IFxuICAgICAgICAgICAgICAgIFZ1Zm9yaWFTZXNzaW9uLnNldFJvdGF0aW9uKFZ1Zm9yaWFSb3RhdGlvbi5JT1NfOTApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0MkdMTWF0cml4KG1hdDpWdWZvcmlhTWF0cml4MzQpIDogZGVmLk1hdHJpeDQ0IHtcbiAgICByZXR1cm4gIFtcbiAgICAgICAgICAgICAgICBtYXQuXzAsXG4gICAgICAgICAgICAgICAgbWF0Ll80LFxuICAgICAgICAgICAgICAgIG1hdC5fOCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIG1hdC5fMSxcbiAgICAgICAgICAgICAgICBtYXQuXzUsXG4gICAgICAgICAgICAgICAgbWF0Ll85LFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgbWF0Ll8yLFxuICAgICAgICAgICAgICAgIG1hdC5fNixcbiAgICAgICAgICAgICAgICBtYXQuXzEwLFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgbWF0Ll8zLFxuICAgICAgICAgICAgICAgIG1hdC5fNyxcbiAgICAgICAgICAgICAgICBtYXQuXzExLFxuICAgICAgICAgICAgICAgIDFcbiAgICAgICAgICAgIF07XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnQyVnVmb3JpYU1hdHJpeChtYXQ6ZGVmLk1hdHJpeDQ0KSA6IFZ1Zm9yaWFNYXRyaXgzNCB7XG4gICAgcmV0dXJuICB7XG4gICAgICAgIF8wOiBtYXRbMF0sXG4gICAgICAgIF8xOiBtYXRbNF0sXG4gICAgICAgIF8yOiBtYXRbOF0sXG4gICAgICAgIF8zOiBtYXRbMTJdLFxuICAgICAgICBfNDogbWF0WzFdLFxuICAgICAgICBfNTogbWF0WzVdLFxuICAgICAgICBfNjogbWF0WzldLFxuICAgICAgICBfNzogbWF0WzEzXSxcbiAgICAgICAgXzg6IG1hdFsyXSxcbiAgICAgICAgXzk6IG1hdFs2XSxcbiAgICAgICAgXzEwOiBtYXRbMTBdLFxuICAgICAgICBfMTE6IG1hdFsxNF1cbiAgICB9O1xufVxuXG4vLyBodHRwczovL2xpYnJhcnkudnVmb3JpYS5jb20vYXJ0aWNsZXMvU29sdXRpb24vSG93LVRvLUFjY2Vzcy1DYW1lcmEtUGFyYW1ldGVyc1xuZnVuY3Rpb24gY29udmVydFBlcnNwZWN0aXZlUHJvamVjdGlvbjJHTE1hdHJpeChtYXQ6VnVmb3JpYU1hdHJpeDM0LCBuZWFyOm51bWJlciwgZmFyOm51bWJlcikgOiBkZWYuTWF0cml4NDQge1xuICAgIHJldHVybiAgW1xuICAgICAgICAgICAgICAgIG1hdC5fMCxcbiAgICAgICAgICAgICAgICBtYXQuXzQsXG4gICAgICAgICAgICAgICAgbWF0Ll84LFxuICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgbWF0Ll8xLFxuICAgICAgICAgICAgICAgIG1hdC5fNSxcbiAgICAgICAgICAgICAgICBtYXQuXzksXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICBtYXQuXzIsXG4gICAgICAgICAgICAgICAgbWF0Ll82LFxuICAgICAgICAgICAgICAgIChmYXIgKyBuZWFyKSAvIChmYXIgLSBuZWFyKSxcbiAgICAgICAgICAgICAgICAxLFxuICAgICAgICAgICAgICAgIG1hdC5fMyxcbiAgICAgICAgICAgICAgICBtYXQuXzcsXG4gICAgICAgICAgICAgICAgLW5lYXIgKiAoMSArIChmYXIgKyBuZWFyKSAvIChmYXIgLSBuZWFyKSksXG4gICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgXTtcbn1cblxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlIHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlKGlvczpWdWZvcmlhVHJhY2thYmxlKSB7XG4gICAgICAgIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhQW5jaG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFuY2hvcihpb3MpO1xuICAgICAgICB9IGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhRGV2aWNlVHJhY2thYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERldmljZVRyYWNrYWJsZShpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFJbWFnZVRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbWFnZVRhcmdldChpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFDeWxpbmRlclRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDeWxpbmRlclRhcmdldChpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFPYmplY3RUYXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JqZWN0VGFyZ2V0KGlvcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYVRyYWNrYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmFja2FibGUoaW9zKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVHJhY2thYmxlKSB7fVxuICAgIFxuICAgIGdldElkKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRJZCgpO1xuICAgIH1cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROYW1lKCk7XG4gICAgfVxuICAgIGlzRXh0ZW5kZWRUcmFja2luZ1N0YXJ0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5pc0V4dGVuZGVkVHJhY2tpbmdTdGFydGVkKCk7XG4gICAgfVxuICAgIHN0YXJ0RXh0ZW5kZWRUcmFja2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLnN0YXJ0RXh0ZW5kZWRUcmFja2luZygpO1xuICAgIH1cbiAgICBzdG9wRXh0ZW5kZWRUcmFja2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLnN0b3BFeHRlbmRlZFRyYWNraW5nKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVHJhY2thYmxlUmVzdWx0IHtcbiAgICBcbiAgICBzdGF0aWMgY3JlYXRlVHJhY2thYmxlUmVzdWx0KGlvczpWdWZvcmlhVHJhY2thYmxlUmVzdWx0KSB7XG4gICAgICAgIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhQW5jaG9yUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFuY2hvclJlc3VsdChpb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFEZXZpY2VUcmFja2FibGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGV2aWNlVHJhY2thYmxlUmVzdWx0KGlvcylcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhSW1hZ2VUYXJnZXRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW1hZ2VUYXJnZXRSZXN1bHQoaW9zKVxuICAgICAgICB9IGVsc2UgaWYgKGlvcyBpbnN0YW5jZW9mIFZ1Zm9yaWFDeWxpbmRlclRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDeWxpbmRlclRhcmdldFJlc3VsdChpb3MpXG4gICAgICAgIH0gZWxzZSBpZiAoaW9zIGluc3RhbmNlb2YgVnVmb3JpYU9iamVjdFRhcmdldFJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYmplY3RUYXJnZXRSZXN1bHQoaW9zKTtcbiAgICAgICAgfSBlbHNlIGlmIChpb3MgaW5zdGFuY2VvZiBWdWZvcmlhVHJhY2thYmxlUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRyYWNrYWJsZVJlc3VsdChpb3MpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFUcmFja2FibGVSZXN1bHQpIHt9XG4gICAgXG4gICAgZ2V0UG9zZSgpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICByZXR1cm4gY29udmVydDJHTE1hdHJpeCh0aGlzLmlvcy5nZXRQb3NlKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUaW1lU3RhbXAoKSA6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRUaW1lU3RhbXAoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U3RhdHVzKCk6IGRlZi5UcmFja2FibGVSZXN1bHRTdGF0dXMge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRTdGF0dXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VHJhY2thYmxlKCk6IFRyYWNrYWJsZSB7XG4gICAgICAgIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRoaXMuaW9zLmdldFRyYWNrYWJsZSgpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEZXZpY2VUcmFja2FibGUgZXh0ZW5kcyBUcmFja2FibGUgaW1wbGVtZW50cyBkZWYuRGV2aWNlVHJhY2thYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFEZXZpY2VUcmFja2FibGUpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgRGV2aWNlVHJhY2thYmxlUmVzdWx0IGV4dGVuZHMgVHJhY2thYmxlUmVzdWx0IGltcGxlbWVudHMgZGVmLkRldmljZVRyYWNrYWJsZVJlc3VsdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhRGV2aWNlVHJhY2thYmxlUmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIEFuY2hvciBleHRlbmRzIFRyYWNrYWJsZSBpbXBsZW1lbnRzIGRlZi5BbmNob3Ige1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUFuY2hvcikge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmNob3JSZXN1bHQgZXh0ZW5kcyBUcmFja2FibGVSZXN1bHQgaW1wbGVtZW50cyBkZWYuQW5jaG9yUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFBbmNob3JSZXN1bHQpIHtzdXBlcihpb3MpfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0VGFyZ2V0IGV4dGVuZHMgVHJhY2thYmxlIHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhT2JqZWN0VGFyZ2V0KSB7c3VwZXIoaW9zKX1cbiAgICBcbiAgICBnZXRVbmlxdWVUYXJnZXRJZCgpIDogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFVuaXF1ZVRhcmdldElkKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFNpemUoKTogZGVmLlZlYzMge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U2l6ZSgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRhcmdldFJlc3VsdCBleHRlbmRzIFRyYWNrYWJsZVJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU9iamVjdFRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEltYWdlVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhSW1hZ2VUYXJnZXQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBJbWFnZVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUltYWdlVGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHRpVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFNdWx0aVRhcmdldCkge3N1cGVyKGlvcyl9XG59XG5cbmV4cG9ydCBjbGFzcyBNdWx0aVRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU9iamVjdFRhcmdldFJlc3VsdCkge3N1cGVyKGlvcyl9XG59XG5cbmNsYXNzIEN5bGluZGVyVGFyZ2V0IGV4dGVuZHMgT2JqZWN0VGFyZ2V0IHsgICAgXG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhQ3lsaW5kZXJUYXJnZXQpIHtzdXBlcihpb3MpfVxufVxuXG5jbGFzcyBDeWxpbmRlclRhcmdldFJlc3VsdCBleHRlbmRzIE9iamVjdFRhcmdldFJlc3VsdCB7ICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYUN5bGluZGVyVGFyZ2V0UmVzdWx0KSB7c3VwZXIoaW9zKX1cbn1cblxuZXhwb3J0IGNsYXNzIEltYWdlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFJbWFnZSkge31cbiAgICBcbiAgICBnZXRCdWZmZXJIZWlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEJ1ZmZlckhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRCdWZmZXJXaWR0aCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEJ1ZmZlcldpZHRoKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZvcm1hdCgpOiBkZWYuUGl4ZWxGb3JtYXQgeyBcbiAgICAgICAgcmV0dXJuIDxudW1iZXI+dGhpcy5pb3MuZ2V0Rm9ybWF0KCk7XG4gICAgfVxuICAgIFxuICAgIGdldEhlaWdodCgpOiBudW1iZXIgeyBcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEhlaWdodCgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQaXhlbHMoKTogaW50ZXJvcC5Qb2ludGVyIHsgXG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRQaXhlbHMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0U3RyaWRlKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U3RyaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFdpZHRoKCk6IG51bWJlciB7IFxuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0V2lkdGgoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGcmFtZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhRnJhbWUpIHt9XG4gICAgZ2V0SW1hZ2UoaWR4OiBudW1iZXIpOiBJbWFnZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBpbWcgPSB0aGlzLmlvcy5nZXRJbWFnZShpZHgpO1xuICAgICAgICBpZiAoaW1nKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEltYWdlKGltZyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0SW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEluZGV4KCk7XG4gICAgfVxuICAgIGdldE51bUltYWdlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtSW1hZ2VzKCk7XG4gICAgfVxuICAgIGdldFRpbWVTdGFtcCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VGltZVN0YW1wKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RhdGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVN0YXRlKSB7fVxuICAgIGdldEZyYW1lKCk6IEZyYW1lIHtcbiAgICAgICAgY29uc3QgZnJhbWUgPSB0aGlzLmlvcy5nZXRGcmFtZSgpO1xuICAgICAgICByZXR1cm4gbmV3IEZyYW1lKGZyYW1lKTtcbiAgICB9XG4gICAgZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJhY2thYmxlUmVzdWx0cygpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmFja2FibGVzKCk7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZShpZHg6IG51bWJlcik6IGRlZi5UcmFja2FibGV8dW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdHJhY2thYmxlID0gdGhpcy5pb3MuZ2V0VHJhY2thYmxlKGlkeCk7XG4gICAgICAgIGlmICh0cmFja2FibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBUcmFja2FibGUuY3JlYXRlVHJhY2thYmxlKHRyYWNrYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0VHJhY2thYmxlUmVzdWx0KGlkeDogbnVtYmVyKTogZGVmLlRyYWNrYWJsZVJlc3VsdHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmlvcy5nZXRUcmFja2FibGVSZXN1bHQoaWR4KTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIFRyYWNrYWJsZVJlc3VsdC5jcmVhdGVUcmFja2FibGVSZXN1bHQocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYUNhbGlicmF0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFDYW1lcmFDYWxpYnJhdGlvbikge31cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uUGFyYW1ldGVycygpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uUGFyYW1ldGVycygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRGaWVsZE9mVmlld1JhZHMoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RmllbGRPZlZpZXdSYWRzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZvY2FsTGVuZ3RoKCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEZvY2FsTGVuZ3RoKCk7XG4gICAgfVxuICAgIFxuICAgIGdldFByaW5jaXBhbFBvaW50KCk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFByaW5jaXBhbFBvaW50KCk7XG4gICAgfVxuICAgIFxuICAgIGdldFNpemUoKTogZGVmLlZlYzIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U2l6ZSgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbWVyYURldmljZSB7XG4gICAgaW5pdChjYW1lcmE6IGRlZi5DYW1lcmFEZXZpY2VEaXJlY3Rpb24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5pbml0Q2FtZXJhKDxudW1iZXI+Y2FtZXJhKTtcbiAgICB9XG4gICAgXG4gICAgZGVpbml0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmRlaW5pdENhbWVyYSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFDYWxpYnJhdGlvbigpOiBDYW1lcmFDYWxpYnJhdGlvbiB7XG4gICAgICAgIGNvbnN0IGNhbGlicmF0aW9uID0gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgICAgIHJldHVybiBuZXcgQ2FtZXJhQ2FsaWJyYXRpb24oY2FsaWJyYXRpb24pO1xuICAgIH1cbiAgICBcbiAgICBnZXRDYW1lcmFEaXJlY3Rpb24oKTogZGVmLkNhbWVyYURldmljZURpcmVjdGlvbiB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPlZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRDYW1lcmFEaXJlY3Rpb24oKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0TnVtVmlkZW9Nb2RlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLmdldE51bVZpZGVvTW9kZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VmlkZW9Nb2RlKG5JbmRleDogbnVtYmVyKTogZGVmLlZpZGVvTW9kZSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0VmlkZW9Nb2RlKG5JbmRleCk7XG4gICAgfVxuICAgIFxuICAgIHNlbGVjdFZpZGVvTW9kZShpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhQ2FtZXJhRGV2aWNlLmdldEluc3RhbmNlKCkuc2VsZWN0VmlkZW9Nb2RlKGluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgc2V0Rmxhc2hUb3JjaE1vZGUob246IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGbGFzaFRvcmNoTW9kZShvbik7XG4gICAgfVxuICAgIFxuICAgIHNldEZvY3VzTW9kZShmb2N1c01vZGU6IGRlZi5DYW1lcmFEZXZpY2VGb2N1c01vZGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRGb2N1c01vZGUoPG51bWJlcj5mb2N1c01vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzdGFydCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFDYW1lcmFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zdGFydCgpO1xuICAgIH1cbiAgICBcbiAgICBzdG9wKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYUNhbWVyYURldmljZS5nZXRJbnN0YW5jZSgpLnN0b3AoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWV3TGlzdCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVmlld0xpc3QpIHt9XG4gICAgY29udGFpbnModmlldzogZGVmLlZpZXcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmNvbnRhaW5zKDxudW1iZXI+dmlldyk7XG4gICAgfVxuICAgIGdldE51bVZpZXdzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1WaWV3cygpO1xuICAgIH1cbiAgICBnZXRWaWV3KGlkeDogbnVtYmVyKTogZGVmLlZpZXcge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRWaWV3KGlkeCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmlld2VyUGFyYW1ldGVycyB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhVmlld2VyUGFyYW1ldGVycykge31cbiAgICBjb250YWluc01hZ25ldCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmNvbnRhaW5zTWFnbmV0KCk7XG4gICAgfVxuICAgIGdldEJ1dHRvblR5cGUoKTogZGVmLlZpZXdlclBhcmFtdGVyc0J1dHRvblR5cGUge1xuICAgICAgICByZXR1cm4gPG51bWJlcj50aGlzLmlvcy5nZXRCdXR0b25UeXBlKCk7XG4gICAgfVxuICAgIGdldERpc3RvcnRpb25Db2VmZmljaWVudChpZHg6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXREaXN0b3J0aW9uQ29lZmZpY2llbnQoaWR4KTtcbiAgICB9XG4gICAgZ2V0RmllbGRPZlZpZXcoKTogZGVmLlZlYzQge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0RmllbGRPZlZpZXcoKTtcbiAgICB9XG4gICAgZ2V0SW50ZXJMZW5zRGlzdGFuY2UoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldEludGVyTGVuc0Rpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldExlbnNDZW50cmVUb1RyYXlEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TGVuc0NlbnRyZVRvVHJheURpc3RhbmNlKCk7XG4gICAgfVxuICAgIGdldE1hbnVmYWN0dXJlcigpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TWFudWZhY3R1cmVyKCk7XG4gICAgfVxuICAgIGdldE5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldE5hbWUoKTtcbiAgICB9XG4gICAgZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtRGlzdG9ydGlvbkNvZWZmaWNpZW50cygpO1xuICAgIH1cbiAgICBnZXRTY3JlZW5Ub0xlbnNEaXN0YW5jZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0U2NyZWVuVG9MZW5zRGlzdGFuY2UoKTtcbiAgICB9XG4gICAgZ2V0VHJheUFsaWdubWVudCgpOiBkZWYuVmlld2VyUGFyYW10ZXJzVHJheUFsaWdubWVudCB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyPnRoaXMuaW9zLmdldFRyYXlBbGlnbm1lbnQoKTtcbiAgICB9XG4gICAgZ2V0VmVyc2lvbigpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0VmVyc2lvbigpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFWaWV3ZXJQYXJhbWV0ZXJzTGlzdCkge31cbiAgICBnZXQoaWR4OiBudW1iZXIpOiBWaWV3ZXJQYXJhbWV0ZXJzfHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZwID0gdGhpcy5pb3MuZ2V0KGlkeCk7XG4gICAgICAgIGlmICh2cCkgcmV0dXJuIG5ldyBWaWV3ZXJQYXJhbWV0ZXJzKHZwKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZ2V0TmFtZU1hbnVmYWN0dXJlcihuYW1lOiBzdHJpbmcsIG1hbnVmYWN0dXJlcjogc3RyaW5nKTogVmlld2VyUGFyYW1ldGVyc3x1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB2cCA9IHRoaXMuaW9zLmdldE5hbWVNYW51ZmFjdHVyZXIobmFtZSwgbWFudWZhY3R1cmVyKTtcbiAgICAgICAgaWYgKHZwKSByZXR1cm4gbmV3IFZpZXdlclBhcmFtZXRlcnModnApO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBzZXRTREtGaWx0ZXIoZmlsdGVyOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5pb3Muc2V0U0RLRmlsdGVyKGZpbHRlcik7XG4gICAgfVxuICAgIHNpemUoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLnNpemUoKTtcbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIERldmljZSB7XG4gICAgc2V0TW9kZShtb2RlOmRlZi5EZXZpY2VNb2RlKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLnNldE1vZGUoPG51bWJlcj5tb2RlKTtcbiAgICB9XG4gICAgZ2V0TW9kZSgpIDogZGVmLkRldmljZU1vZGUge1xuICAgICAgICByZXR1cm4gPG51bWJlcj5WdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0TW9kZSgpO1xuICAgIH1cbiAgICBzZXRWaWV3ZXJBY3RpdmUoYWN0aXZlOmJvb2xlYW4pIDogdm9pZCB7XG4gICAgICAgIFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5zZXRWaWV3ZXJBY3RpdmUoYWN0aXZlKTtcbiAgICB9XG4gICAgaXNWaWV3ZXJBY3RpdmUoKSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLmlzVmlld2VyQWN0aXZlKCk7XG4gICAgfVxuICAgIGdldFZpZXdlckxpc3QoKSA6IFZpZXdlclBhcmFtZXRlcnNMaXN0IHtcbiAgICAgICAgY29uc3Qgdmlld2VyTGlzdCA9IFZ1Zm9yaWFEZXZpY2UuZ2V0SW5zdGFuY2UoKS5nZXRWaWV3ZXJMaXN0KCk7XG4gICAgICAgIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVyc0xpc3Qodmlld2VyTGlzdCk7XG4gICAgfVxuICAgIHNlbGVjdFZpZXdlcih2aWV3ZXI6Vmlld2VyUGFyYW1ldGVycykge1xuICAgICAgICByZXR1cm4gVnVmb3JpYURldmljZS5nZXRJbnN0YW5jZSgpLnNlbGVjdFZpZXdlcih2aWV3ZXIuaW9zKTtcbiAgICB9XG4gICAgZ2V0U2VsZWN0ZWRWaWV3ZXIoKSA6IFZpZXdlclBhcmFtZXRlcnN8dW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzVmlld2VyQWN0aXZlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiBuZXcgVmlld2VyUGFyYW1ldGVycyhWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0U2VsZWN0ZWRWaWV3ZXIoKSk7XG4gICAgfVxuICAgIGdldFJlbmRlcmluZ1ByaW1pdGl2ZXMoKTogUmVuZGVyaW5nUHJpbWl0aXZlcyB7XG4gICAgICAgIHJldHVybiBuZXcgUmVuZGVyaW5nUHJpbWl0aXZlcyhWdWZvcmlhRGV2aWNlLmdldEluc3RhbmNlKCkuZ2V0UmVuZGVyaW5nUHJpbWl0aXZlcygpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZW5kZXJlciB7XG4gICAgZ2V0UmVjb21tZW5kZWRGcHMoZmxhZ3M6IGRlZi5GUFNIaW50KTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFSZW5kZXJlci5nZXRSZWNvbW1lbmRlZEZwcyg8bnVtYmVyPmZsYWdzKTtcbiAgICB9XG4gICAgZ2V0VmlkZW9CYWNrZ3JvdW5kQ29uZmlnKCkgOiBkZWYuVmlkZW9CYWNrZ3JvdW5kQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFSZW5kZXJlci5nZXRWaWRlb0JhY2tncm91bmRDb25maWcoKTtcbiAgICB9XG4gICAgc2V0VGFyZ2V0RnBzKGZwczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhUmVuZGVyZXIuc2V0VGFyZ2V0RnBzKGZwcyk7XG4gICAgfVxuICAgIHNldFZpZGVvQmFja2dyb3VuZENvbmZpZyhjZmc6IGRlZi5WaWRlb0JhY2tncm91bmRDb25maWcpOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVJlbmRlcmVyLnNldFZpZGVvQmFja2dyb3VuZENvbmZpZyg8VnVmb3JpYVZpZGVvQmFja2dyb3VuZENvbmZpZz5jZmcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1lc2gge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYU1lc2gpIHt9XG4gICAgXG4gICAgZ2V0Tm9ybWFsQ29vcmRpbmF0ZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROb3JtYWxDb29yZGluYXRlcygpO1xuICAgIH1cbiAgICBnZXROb3JtYWxzKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROb3JtYWxzKCk7XG4gICAgfVxuICAgIGdldE51bVRyaWFuZ2xlcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0TnVtVHJpYW5nbGVzKCk7XG4gICAgfVxuICAgIFxuICAgIGdldE51bVZlcnRpY2VzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1WZXJ0aWNlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQb3NpdGlvbkNvb3JkaW5hdGVzKCk6IGludGVyb3AuUmVmZXJlbmNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuZ2V0UG9zaXRpb25Db29yZGluYXRlcygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQb3NpdGlvbnMoKTogaW50ZXJvcC5SZWZlcmVuY2U8ZGVmLlZlYzM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFBvc2l0aW9ucygpO1xuICAgIH1cbiAgICBcbiAgICBnZXRUcmlhbmdsZXMoKTogaW50ZXJvcC5SZWZlcmVuY2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRUcmlhbmdsZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VVZDb29yZGluYXRlcygpOiBpbnRlcm9wLlJlZmVyZW5jZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFVWQ29vcmRpbmF0ZXMoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0VVZzKCk6IGludGVyb3AuUmVmZXJlbmNlPGRlZi5WZWMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXRVVnMoKTtcbiAgICB9XG4gICAgXG4gICAgaGFzTm9ybWFscygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc05vcm1hbHMoKTtcbiAgICB9XG4gICAgXG4gICAgaGFzUG9zaXRpb25zKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaGFzUG9zaXRpb25zKCk7XG4gICAgfVxuICAgIFxuICAgIGhhc1VWcygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmhhc1VWcygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlbmRlcmluZ1ByaW1pdGl2ZXMge1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBpb3M6VnVmb3JpYVJlbmRlcmluZ1ByaW1pdGl2ZXMpe31cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZU1lc2godmlld0lEOiBkZWYuVmlldyk6IE1lc2gge1xuICAgICAgICBjb25zdCBtZXNoID0gdGhpcy5pb3MuZ2V0RGlzdG9ydGlvblRleHR1cmVNZXNoKDxudW1iZXI+dmlld0lEKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNZXNoKG1lc2gpO1xuICAgIH1cbiAgICBcbiAgICBnZXREaXN0b3J0aW9uVGV4dHVyZVNpemUodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWMyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25UZXh0dXJlU2l6ZSg8bnVtYmVyPnZpZXdJRCk7XG4gICAgfVxuICAgIFxuICAgIGdldERpc3RvcnRpb25UZXh0dXJlVmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldERpc3RvcnRpb25UZXh0dXJlVmlld3BvcnQoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRFeWVEaXNwbGF5QWRqdXN0bWVudE1hdHJpeCh2aWV3SUQ6IGRlZi5WaWV3KTogZGVmLk1hdHJpeDQ0IHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnQyR0xNYXRyaXgodGhpcy5pb3MuZ2V0RXllRGlzcGxheUFkanVzdG1lbnRNYXRyaXgoPG51bWJlcj52aWV3SUQpKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Tm9ybWFsaXplZFZpZXdwb3J0KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuVmVjNCB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROb3JtYWxpemVkVmlld3BvcnQoPG51bWJlcj52aWV3SUQpO1xuICAgIH1cbiAgICBcbiAgICBnZXRQcm9qZWN0aW9uTWF0cml4KHZpZXdJRDogZGVmLlZpZXcpOiBkZWYuTWF0cml4NDQge1xuICAgICAgICByZXR1cm4gY29udmVydFBlcnNwZWN0aXZlUHJvamVjdGlvbjJHTE1hdHJpeCh0aGlzLmlvcy5nZXRQcm9qZWN0aW9uTWF0cml4KDxudW1iZXI+dmlld0lEKSwgMC4wMSwgMTAwMDAwKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0UmVuZGVyaW5nVmlld3MoKTogVmlld0xpc3Qge1xuICAgICAgICByZXR1cm4gbmV3IFZpZXdMaXN0KHRoaXMuaW9zLmdldFJlbmRlcmluZ1ZpZXdzKCkpO1xuICAgIH1cbiAgICBcbiAgICBnZXRWaWRlb0JhY2tncm91bmRNZXNoKHZpZXdJRDogZGVmLlZpZXcpOiBNZXNoIHtcbiAgICAgICAgY29uc3QgbWVzaCA9IHRoaXMuaW9zLmdldFZpZGVvQmFja2dyb3VuZE1lc2goPG51bWJlcj52aWV3SUQpO1xuICAgICAgICByZXR1cm4gbmV3IE1lc2gobWVzaCk7XG4gICAgfVxuICAgIFxuICAgIGdldFZpZGVvQmFja2dyb3VuZFByb2plY3Rpb25NYXRyaXgodmlld0lEOiBkZWYuVmlldyk6IGRlZi5NYXRyaXg0NCB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0UGVyc3BlY3RpdmVQcm9qZWN0aW9uMkdMTWF0cml4KHRoaXMuaW9zLmdldFZpZGVvQmFja2dyb3VuZFByb2plY3Rpb25NYXRyaXgoPG51bWJlcj52aWV3SUQpLCAgMC4wMSwgMTAwMDAwKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0Vmlld3BvcnQodmlld0lEOiBkZWYuVmlldyk6IGRlZi5WZWM0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmdldFZpZXdwb3J0KDxudW1iZXI+dmlld0lEKTtcbiAgICB9XG4gICAgXG59XG5cbmNsYXNzIERhdGFTZXQgaW1wbGVtZW50cyBkZWYuRGF0YVNldCB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGlvczpWdWZvcmlhRGF0YVNldCl7fVxuICAgIGNyZWF0ZU11bHRpVGFyZ2V0KG5hbWU6IHN0cmluZyk6IE11bHRpVGFyZ2V0fHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IG10ID0gdGhpcy5pb3MuY3JlYXRlTXVsdGlUYXJnZXQobmFtZSk7XG4gICAgICAgIGlmIChtdCkgcmV0dXJuIG5ldyBNdWx0aVRhcmdldChtdCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGRlc3Ryb3kodHJhY2thYmxlOiBUcmFja2FibGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmRlc3Ryb3kodHJhY2thYmxlLmlvcyk7XG4gICAgfVxuICAgIGV4aXN0cyhwYXRoOiBzdHJpbmcsIHN0b3JhZ2VUeXBlOiBkZWYuU3RvcmFnZVR5cGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmV4aXN0c1N0b3JhZ2VUeXBlKHBhdGgsIDxudW1iZXI+c3RvcmFnZVR5cGUpO1xuICAgIH1cbiAgICBnZXROdW1UcmFja2FibGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmlvcy5nZXROdW1UcmFja2FibGVzKCk7XG4gICAgfVxuICAgIGdldFRyYWNrYWJsZShpZHg6IG51bWJlcik6IFRyYWNrYWJsZXx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0cmFja2FibGUgPSB0aGlzLmlvcy5nZXRUcmFja2FibGUoaWR4KTtcbiAgICAgICAgaWYgKHRyYWNrYWJsZSkgcmV0dXJuIFRyYWNrYWJsZS5jcmVhdGVUcmFja2FibGUodHJhY2thYmxlKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaGFzUmVhY2hlZFRyYWNrYWJsZUxpbWl0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaGFzUmVhY2hlZFRyYWNrYWJsZUxpbWl0KCk7XG4gICAgfVxuICAgIGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pb3MuaXNBY3RpdmUoKTtcbiAgICB9XG4gICAgbG9hZChwYXRoOiBzdHJpbmcsIHN0b3JhZ2VUeXBlOiBkZWYuU3RvcmFnZVR5cGUpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW9zLmxvYWRTdG9yYWdlVHlwZShwYXRoLCA8bnVtYmVyPnN0b3JhZ2VUeXBlKTtcbiAgICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBUcmFja2VyIHtcbiAgICBhYnN0cmFjdCBuYXRpdmVDbGFzcyA6IHR5cGVvZiBWdWZvcmlhVHJhY2tlciAmIHtnZXRJbnN0YW5jZSgpOlZ1Zm9yaWFUcmFja2VyfTtcbiAgICBzdGFydCgpIDogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hdGl2ZUNsYXNzLmdldEluc3RhbmNlKCkuc3RhcnQoKTtcbiAgICB9XG4gICAgc3RvcCgpIDogdm9pZCB7XG4gICAgICAgIHRoaXMubmF0aXZlQ2xhc3MuZ2V0SW5zdGFuY2UoKS5zdG9wKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSGl0VGVzdFJlc3VsdCBpbXBsZW1lbnRzIGRlZi5IaXRUZXN0UmVzdWx0IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaW9zOlZ1Zm9yaWFIaXRUZXN0UmVzdWx0KSB7fTtcbiAgICBnZXRQb3NlKCkge1xuICAgICAgICByZXR1cm4gY29udmVydDJHTE1hdHJpeCh0aGlzLmlvcy5nZXRQb3NlKCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBvc2l0aW9uYWxEZXZpY2VUcmFja2VyIGV4dGVuZHMgVHJhY2tlciBpbXBsZW1lbnRzIGRlZi5Qb3NpdGlvbmFsRGV2aWNlVHJhY2tlciB7XG4gICAgbmF0aXZlQ2xhc3MgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXI7XG4gICAgY3JlYXRlQW5jaG9yRnJvbVBvc2UobmFtZTogc3RyaW5nLCBwb3NlOiBkZWYuTWF0cml4NDQpOiBkZWYuQW5jaG9yIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFQb3NlID0gY29udmVydDJWdWZvcmlhTWF0cml4KHBvc2UpO1xuICAgICAgICBjb25zdCB2dWZvcmlhQW5jaG9yID0gVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmdldEluc3RhbmNlKCkuY3JlYXRlQW5jaG9yV2l0aE5hbWVQb3NlKG5hbWUsIHZ1Zm9yaWFQb3NlKTtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWFBbmNob3IgPyBuZXcgQW5jaG9yKHZ1Zm9yaWFBbmNob3IpIDogbnVsbDtcbiAgICB9XG4gICAgY3JlYXRlQW5jaG9yRnJvbUhpdFRlc3RSZXN1bHQobmFtZTogc3RyaW5nLCBoaXRUZXN0UmVzdWx0OiBIaXRUZXN0UmVzdWx0KTogZGVmLkFuY2hvciB8IG51bGwge1xuICAgICAgICBjb25zdCB2dWZvcmlhQW5jaG9yID0gVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmdldEluc3RhbmNlKCkuY3JlYXRlQW5jaG9yV2l0aE5hbWVIaXRUZXN0UmVzdWx0KG5hbWUsIGhpdFRlc3RSZXN1bHQuaW9zKTtcbiAgICAgICAgcmV0dXJuIHZ1Zm9yaWFBbmNob3IgPyBuZXcgQW5jaG9yKHZ1Zm9yaWFBbmNob3IpIDogbnVsbDtcbiAgICB9XG4gICAgZGVzdHJveUFuY2hvcihhbmNob3I6IEFuY2hvcikge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmdldEluc3RhbmNlKCkuZGVzdHJveUFuY2hvcihhbmNob3IuaW9zKTtcbiAgICB9XG4gICAgZ2V0TnVtQW5jaG9ycygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gVnVmb3JpYVBvc2l0aW9uYWxEZXZpY2VUcmFja2VyLmdldEluc3RhbmNlKCkubnVtQW5jaG9ycygpO1xuICAgIH1cbiAgICBnZXRBbmNob3IoaWR4OiBudW1iZXIpOiBkZWYuQW5jaG9yIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHZ1Zm9yaWFBbmNob3IgPSBWdWZvcmlhUG9zaXRpb25hbERldmljZVRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5nZXRBbmNob3JBdEluZGV4KGlkeCk7XG4gICAgICAgIHJldHVybiB2dWZvcmlhQW5jaG9yID8gbmV3IEFuY2hvcih2dWZvcmlhQW5jaG9yKSA6IG51bGw7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU21hcnRUZXJyYWluIGV4dGVuZHMgVHJhY2tlciBpbXBsZW1lbnRzIGRlZi5TbWFydFRlcnJhaW4ge1xuICAgIG5hdGl2ZUNsYXNzID0gVnVmb3JpYVNtYXJ0VGVycmFpbjtcbiAgIFxuICAgIGhpdFRlc3Qoc3RhdGU6U3RhdGUsIHBvaW50OmRlZi5WZWMyLCBkZWZhdWx0RGV2aWNlSGVpZ2h0Om51bWJlcixoaW50OmRlZi5IaXRUZXN0SGludCkgOiB2b2lkIHtcbiAgICAgICAgVnVmb3JpYVNtYXJ0VGVycmFpbi5nZXRJbnN0YW5jZSgpLmhpdFRlc3RXaXRoU3RhdGVQb2ludERldmljZUhlaWdodEhpbnQoXG4gICAgICAgICAgICBzdGF0ZS5pb3MsXG4gICAgICAgICAgICBwb2ludCxcbiAgICAgICAgICAgIGRlZmF1bHREZXZpY2VIZWlnaHQsXG4gICAgICAgICAgICA8bnVtYmVyPmhpbnRcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBnZXRIaXRUZXN0UmVzdWx0Q291bnQoKSB7XG4gICAgICAgIHJldHVybiBWdWZvcmlhU21hcnRUZXJyYWluLmdldEluc3RhbmNlKCkuaGl0VGVzdFJlc3VsdENvdW50KCk7XG4gICAgfVxuXG4gICAgZ2V0SGl0VGVzdFJlc3VsdChpZHg6bnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHIgPSBWdWZvcmlhU21hcnRUZXJyYWluLmdldEluc3RhbmNlKCkuZ2V0SGl0VGVzdFJlc3VsdEF0SW5kZXgoaWR4KTtcbiAgICAgICAgcmV0dXJuIG5ldyBIaXRUZXN0UmVzdWx0KHIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9iamVjdFRyYWNrZXIgZXh0ZW5kcyBUcmFja2VyIGltcGxlbWVudHMgZGVmLk9iamVjdFRyYWNrZXIge1xuICAgIG5hdGl2ZUNsYXNzID0gVnVmb3JpYU9iamVjdFRyYWNrZXI7XG4gICAgY3JlYXRlRGF0YVNldCgpIDogRGF0YVNldHx1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBkcyA9IFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuY3JlYXRlRGF0YVNldCgpO1xuICAgICAgICBpZiAoZHMpIHJldHVybiBuZXcgRGF0YVNldChkcyk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXHRkZXN0cm95RGF0YVNldChkYXRhU2V0OkRhdGFTZXQpIDogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuZGVzdHJveURhdGFTZXQoZGF0YVNldC5pb3MpO1xuXHR9XG4gICAgYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQ6RGF0YVNldCkgOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFZ1Zm9yaWFPYmplY3RUcmFja2VyLmdldEluc3RhbmNlKCkuYWN0aXZhdGVEYXRhU2V0KGRhdGFTZXQuaW9zKTtcbiAgICB9XG4gICAgZGVhY3RpdmF0ZURhdGFTZXQoZGF0YVNldDpEYXRhU2V0KSA6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gVnVmb3JpYU9iamVjdFRyYWNrZXIuZ2V0SW5zdGFuY2UoKS5kZWFjdGl2YXRlRGF0YVNldChkYXRhU2V0Lmlvcyk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgYXBpID0gVlVGT1JJQV9BVkFJTEFCTEUgPyBuZXcgQVBJKCkgOiB1bmRlZmluZWQ7XG4iXX0=