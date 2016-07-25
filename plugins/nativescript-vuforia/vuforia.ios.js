"use strict";
var common = require('./vuforia-common');
var application = require('application');
var placeholder = require('ui/placeholder');
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
var API = (function (_super) {
    __extends(API, _super);
    function API() {
        _super.apply(this, arguments);
        this.cameraDevice = new CameraDevice();
        this.device = new Device();
        this.renderer = new Renderer();
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
        VuforiaSession.onSurfaceChanged({
            x: width,
            y: height
        });
        var orientation = UIApplication.sharedApplication().statusBarOrientation;
        switch (orientation) {
            case UIInterfaceOrientation.UIInterfaceOrientationPortrait:
                VuforiaSession.setRotation(128 /* IOS_90 */);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown:
                VuforiaSession.setRotation(512 /* IOS_270 */);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft:
                VuforiaSession.setRotation(256 /* IOS_180 */);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight:
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
        _super.call(this, ios);
        this.ios = ios;
    }
    return Marker;
}(Trackable));
exports.Marker = Marker;
var MarkerResult = (function (_super) {
    __extends(MarkerResult, _super);
    function MarkerResult(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return MarkerResult;
}(TrackableResult));
exports.MarkerResult = MarkerResult;
var Word = (function (_super) {
    __extends(Word, _super);
    function Word(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return Word;
}(Trackable));
exports.Word = Word;
var WordResult = (function (_super) {
    __extends(WordResult, _super);
    function WordResult(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return WordResult;
}(TrackableResult));
exports.WordResult = WordResult;
var ObjectTarget = (function (_super) {
    __extends(ObjectTarget, _super);
    function ObjectTarget(ios) {
        _super.call(this, ios);
        this.ios = ios;
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
        _super.call(this, ios);
        this.ios = ios;
    }
    return ObjectTargetResult;
}(TrackableResult));
exports.ObjectTargetResult = ObjectTargetResult;
var ImageTarget = (function (_super) {
    __extends(ImageTarget, _super);
    function ImageTarget(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return ImageTarget;
}(ObjectTarget));
var ImageTargetResult = (function (_super) {
    __extends(ImageTargetResult, _super);
    function ImageTargetResult(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return ImageTargetResult;
}(ObjectTargetResult));
var MultiTarget = (function (_super) {
    __extends(MultiTarget, _super);
    function MultiTarget(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return MultiTarget;
}(ObjectTarget));
exports.MultiTarget = MultiTarget;
var MultiTargetResult = (function (_super) {
    __extends(MultiTargetResult, _super);
    function MultiTargetResult(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return MultiTargetResult;
}(ObjectTargetResult));
exports.MultiTargetResult = MultiTargetResult;
var CylinderTarget = (function (_super) {
    __extends(CylinderTarget, _super);
    function CylinderTarget(ios) {
        _super.call(this, ios);
        this.ios = ios;
    }
    return CylinderTarget;
}(ObjectTarget));
var CylinderTargetResult = (function (_super) {
    __extends(CylinderTargetResult, _super);
    function CylinderTargetResult(ios) {
        _super.call(this, ios);
        this.ios = ios;
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
        _super.apply(this, arguments);
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
//# sourceMappingURL=vuforia.ios.js.map