import common = require('./vuforia-common');
import def = require('nativescript-vuforia');
import application = require('application');
import http = require('http');
import file = require('file-system');
import frames = require('ui/frame');
import views = require('ui/core/view');
import placeholder = require('ui/placeholder');

global.moduleMerge(common, exports);

const VUFORIA_AVAILABLE = typeof VuforiaSession !== 'undefined';

const iosVideoView = <VuforiaVideoView> (VUFORIA_AVAILABLE ? VuforiaVideoView.new() : undefined);

export const videoView = new placeholder.Placeholder();
videoView.on(placeholder.Placeholder.creatingViewEvent, (evt:placeholder.CreateViewEventData)=>{
    evt.view = iosVideoView;
})

videoView.onLoaded = function() {
    if (VUFORIA_AVAILABLE) VuforiaSession.onSurfaceCreated();
}

videoView.onLayout = function(left, top, right, bottom) {
    if (VUFORIA_AVAILABLE) configureVuforiaSurface();
}

application.on(application.suspendEvent, ()=> {
    if (VUFORIA_AVAILABLE) {
        console.log('Pausing Vuforia');
        VuforiaSession.onPause();
        iosVideoView.finishOpenGLESCommands();
        iosVideoView.freeOpenGLESResources();
    }
})

application.on(application.orientationChangedEvent, () => {
    if (VUFORIA_AVAILABLE) {
        Promise.resolve().then(configureVuforiaSurface); // delay until the interface orientation actually changes
    }
});

application.on(application.resumeEvent, ()=> {
    if (VUFORIA_AVAILABLE) {
        console.log('Resuming Vuforia');
        VuforiaSession.onResume();
        VuforiaSession.onSurfaceCreated();
        configureVuforiaSurface();
    }
})

function configureVuforiaSurface() {
    if (!api) throw new Error();
    const contentScaleFactor = iosVideoView.contentScaleFactor;
    api.onSurfaceChanged(
        iosVideoView.frame.size.width * contentScaleFactor,
        iosVideoView.frame.size.height * contentScaleFactor
    );
}

export class API extends common.APIBase {
    
    private cameraDevice = new CameraDevice();
    private device = new Device();
    private renderer = new Renderer();
    
    private objectTracker:ObjectTracker|undefined;
    
    setLicenseKey(licenseKey:string) : boolean {
        return VuforiaSession.setLicenseKey(licenseKey) === 0;
    }
    
    setHint(hint:def.Hint,value:number) : boolean {
        return VuforiaSession.setHintValue(<number>hint, value);
    }
    
    init() : Promise<def.InitResult> {
        return new Promise<def.InitResult>((resolve, reject) => {
            VuforiaSession.initDone((result)=>{
                if (result === VuforiaInitResult.SUCCESS) {
                    VuforiaSession.onSurfaceCreated();
                    configureVuforiaSurface();
                    VuforiaSession.registerCallback((state)=>{
                        if (this.callback)
                         this.callback(new State(state));
                    });
                    VuforiaSession.onResume();
                }
                resolve(<number>result);
            })
        })
    }
    
    deinit() : void {
        VuforiaSession.deinit();
        VuforiaSession.onPause();
    }
    
    getCameraDevice() : CameraDevice {
        return this.cameraDevice;
    }
    
    getDevice() : Device {
        return this.device;
    }
    
    getRenderer() : Renderer {
        return this.renderer;
    }
    
    initObjectTracker() : boolean {
        if (VuforiaObjectTracker.initTracker()) {
            this.objectTracker = new ObjectTracker();
            return true;
        };
        return false;
    }
    
    getObjectTracker() {
        return this.objectTracker;
    }
    
    deinitObjectTracker() : boolean {
        if (VuforiaObjectTracker.deinitTracker()) {
            this.objectTracker = undefined;
            return true;
        }
        return false;
    }

    setScaleFactor(f:number) {
        VuforiaSession.setScaleFactor && VuforiaSession.setScaleFactor(f);
    }

    getScaleFactor() : number {
        return VuforiaSession.scaleFactor();
    }

    onSurfaceChanged(width:number, height:number) : void {
        VuforiaSession.onSurfaceChanged({
            x: width,
            y: height
        });
        const orientation:UIInterfaceOrientation = UIApplication.sharedApplication().statusBarOrientation;
        switch (orientation) {
            case UIInterfaceOrientation.UIInterfaceOrientationPortrait: 
                VuforiaSession.setRotation(VuforiaRotation.IOS_90);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown: 
                VuforiaSession.setRotation(VuforiaRotation.IOS_270);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft: 
                VuforiaSession.setRotation(VuforiaRotation.IOS_180);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight: 
                VuforiaSession.setRotation(VuforiaRotation.IOS_0);
                break;
            default: 
                VuforiaSession.setRotation(VuforiaRotation.IOS_90);
        }
    }
}

function createMatrix44(mat:VuforiaMatrix44) : def.Matrix44 {
    return  [
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

export class Trackable {
    
    static createTrackable(ios:VuforiaTrackable) {
        if (ios instanceof VuforiaMarker) {
            return new Marker(ios)
        } else if (ios instanceof VuforiaWord) {
            return new Word(ios)
        } else if (ios instanceof VuforiaImageTarget) {
            return new ImageTarget(ios)
        } else if (ios instanceof VuforiaCylinderTarget) {
            return new CylinderTarget(ios)
        } else if (ios instanceof VuforiaObjectTarget) {
            return new ObjectTarget(ios);
        } else if (ios instanceof VuforiaTrackable) {
            return new Trackable(ios);
        }
        throw new Error();
    }
    
    constructor(public ios:VuforiaTrackable) {}
    
    getId(): number {
        return this.ios.getId();
    }
    getName(): string {
        return this.ios.getName();
    }
    isExtendedTrackingStarted(): boolean {
        return this.ios.isExtendedTrackingStarted();
    }
    startExtendedTracking(): boolean {
        return this.ios.startExtendedTracking();
    }
    stopExtendedTracking(): boolean {
        return this.ios.stopExtendedTracking();
    }
}

export class TrackableResult {
    
    static createTrackableResult(ios:VuforiaTrackableResult) {
        if (ios instanceof VuforiaMarkerResult) {
            return new MarkerResult(ios)
        } else if (ios instanceof VuforiaWordResult) {
            return new WordResult(ios)
        } else if (ios instanceof VuforiaImageTargetResult) {
            return new ImageTargetResult(ios)
        } else if (ios instanceof VuforiaCylinderTargetResult) {
            return new CylinderTargetResult(ios)
        } else if (ios instanceof VuforiaObjectTargetResult) {
            return new ObjectTargetResult(ios);
        } else if (ios instanceof VuforiaTrackableResult) {
            return new TrackableResult(ios);
        }
        throw new Error();
    }
    
    constructor(public ios:VuforiaTrackableResult) {}
    
    getPose(): def.Matrix44 {
        return createMatrix44(this.ios.getPose());
    }
    
    getTimeStamp() : number {
        return this.ios.getTimeStamp();
    }
    
    getStatus(): def.TrackableResultStatus {
        return <number>this.ios.getStatus();
    }
    
    getTrackable(): Trackable {
        return Trackable.createTrackable(this.ios.getTrackable());
    }
}

export class Marker extends Trackable {
    constructor(public ios:VuforiaMarker) {super(ios)}
}

export class MarkerResult extends TrackableResult {
    constructor(public ios:VuforiaMarkerResult) {super(ios)}
}

export class Word extends Trackable {
    constructor(public ios:VuforiaWord) {super(ios)}
}

export class WordResult extends TrackableResult {    
    constructor(public ios:VuforiaWordResult) {super(ios)}
}

export class ObjectTarget extends Trackable {    
    constructor(public ios:VuforiaObjectTarget) {super(ios)}
    
    getUniqueTargetId() : string {
        return this.ios.getUniqueTargetId();
    }
    
    getSize(): def.Vec3 {
        return this.ios.getSize();
    }
}

export class ObjectTargetResult extends TrackableResult {    
    constructor(public ios:VuforiaObjectTargetResult) {super(ios)}
}

class ImageTarget extends ObjectTarget {    
    constructor(public ios:VuforiaImageTarget) {super(ios)}
}

class ImageTargetResult extends ObjectTargetResult {    
    constructor(public ios:VuforiaImageTargetResult) {super(ios)}
}

export class MultiTarget extends ObjectTarget {
    constructor(public ios:VuforiaMultiTarget) {super(ios)}
}

export class MultiTargetResult extends ObjectTargetResult {    
    constructor(public ios:VuforiaObjectTargetResult) {super(ios)}
}

class CylinderTarget extends ObjectTarget {    
    constructor(public ios:VuforiaCylinderTarget) {super(ios)}
}

class CylinderTargetResult extends ObjectTargetResult {    
    constructor(public ios:VuforiaCylinderTargetResult) {super(ios)}
}

export class Image {
    constructor(public ios:VuforiaImage) {}
    
    getBufferHeight(): number {
        return this.ios.getBufferHeight();
    }
    
    getBufferWidth(): number { 
        return this.ios.getBufferWidth();
    }
    
    getFormat(): def.PixelFormat { 
        return <number>this.ios.getFormat();
    }
    
    getHeight(): number { 
        return this.ios.getHeight();
    }
    
    getPixels(): interop.Pointer { 
        return this.ios.getPixels();
    }
    
    getStride(): number { 
        return this.ios.getStride();
    }
    
    getWidth(): number { 
        return this.ios.getWidth();
    }
}

export class Frame {
    constructor(public ios:VuforiaFrame) {}
    getImage(idx: number): Image|undefined {
        const img = this.ios.getImage(idx);
        if (img) {
            return new Image(img);
        }
        return undefined;
    }
    getIndex(): number {
        return this.ios.getIndex();
    }
    getNumImages(): number {
        return this.ios.getNumImages();
    }
    getTimeStamp(): number {
        return this.ios.getTimeStamp();
    }
}

export class State {
    constructor(public ios:VuforiaState) {}
    getFrame(): Frame {
        const frame = this.ios.getFrame();
        return new Frame(frame);
    }
    getNumTrackableResults(): number {
        return this.ios.getNumTrackableResults();
    }
    getNumTrackables(): number {
        return this.ios.getNumTrackables();
    }
    getTrackable(idx: number): def.Trackable|undefined {
        const trackable = this.ios.getTrackable(idx);
        if (trackable) {
            return Trackable.createTrackable(trackable);
        }
        return undefined;
    }
    getTrackableResult(idx: number): def.TrackableResult|undefined {
        const result = this.ios.getTrackableResult(idx);
        if (result) {
            return TrackableResult.createTrackableResult(result);
        }
        return undefined;
    }
}

export class CameraCalibration {
    constructor(public ios:VuforiaCameraCalibration) {}
    
    getDistortionParameters(): def.Vec4 {
        return this.ios.getDistortionParameters();
    }
    
    getFieldOfViewRads(): def.Vec2 {
        return this.ios.getFieldOfViewRads();
    }
    
    getFocalLength(): def.Vec2 {
        return this.ios.getFocalLength();
    }
    
    getPrincipalPoint(): def.Vec2 {
        return this.ios.getPrincipalPoint();
    }
    
    getSize(): def.Vec2 {
        return this.ios.getSize();
    }
}

export class CameraDevice {
    init(camera: def.CameraDeviceDirection): boolean {
        return VuforiaCameraDevice.getInstance().initCamera(<number>camera);
    }
    
    deinit(): boolean {
        return VuforiaCameraDevice.getInstance().deinitCamera();
    }
    
    getCameraCalibration(): CameraCalibration {
        const calibration = VuforiaCameraDevice.getInstance().getCameraCalibration();
        return new CameraCalibration(calibration);
    }
    
    getCameraDirection(): def.CameraDeviceDirection {
        return <number>VuforiaCameraDevice.getInstance().getCameraDirection();
    }
    
    getNumVideoModes(): number {
        return VuforiaCameraDevice.getInstance().getNumVideoModes();
    }
    
    getVideoMode(nIndex: number): def.VideoMode {
        return VuforiaCameraDevice.getInstance().getVideoMode(nIndex);
    }
    
    selectVideoMode(index: number): boolean {
        return VuforiaCameraDevice.getInstance().selectVideoMode(index);
    }
    
    setFlashTorchMode(on: boolean): boolean {
        return VuforiaCameraDevice.getInstance().setFlashTorchMode(on);
    }
    
    setFocusMode(focusMode: def.CameraDeviceFocusMode): boolean {
        return VuforiaCameraDevice.getInstance().setFocusMode(<number>focusMode);
    }
    
    start(): boolean {
        return VuforiaCameraDevice.getInstance().start();
    }
    
    stop(): boolean {
        return VuforiaCameraDevice.getInstance().stop();
    }
}

export class ViewList {
    constructor(public ios:VuforiaViewList) {}
    contains(view: def.View): boolean {
        return this.ios.contains(<number>view);
    }
    getNumViews(): number {
        return this.ios.getNumViews();
    }
    getView(idx: number): def.View {
        return <number>this.ios.getView(idx);
    }
}

export class ViewerParameters {
    constructor(public ios:VuforiaViewerParameters) {}
    containsMagnet(): boolean {
        return this.ios.containsMagnet();
    }
    getButtonType(): def.ViewerParamtersButtonType {
        return <number>this.ios.getButtonType();
    }
    getDistortionCoefficient(idx: number): number {
        return this.ios.getDistortionCoefficient(idx);
    }
    getFieldOfView(): def.Vec4 {
        return this.ios.getFieldOfView();
    }
    getInterLensDistance(): number {
        return this.ios.getInterLensDistance();
    }
    getLensCentreToTrayDistance(): number {
        return this.ios.getLensCentreToTrayDistance();
    }
    getManufacturer(): string {
        return this.ios.getManufacturer();
    }
    getName(): string {
        return this.ios.getName();
    }
    getNumDistortionCoefficients(): number {
        return this.ios.getNumDistortionCoefficients();
    }
    getScreenToLensDistance(): number {
        return this.ios.getScreenToLensDistance();
    }
    getTrayAlignment(): def.ViewerParamtersTrayAlignment {
        return <number>this.ios.getTrayAlignment();
    }
    getVersion(): number {
        return this.ios.getVersion();
    }
}

export class ViewerParametersList {
    constructor(public ios:VuforiaViewerParametersList) {}
    get(idx: number): ViewerParameters|undefined {
        const vp = this.ios.get(idx);
        if (vp) return new ViewerParameters(vp);
        return undefined;
    }
    getNameManufacturer(name: string, manufacturer: string): ViewerParameters|undefined {
        const vp = this.ios.getNameManufacturer(name, manufacturer);
        if (vp) return new ViewerParameters(vp);
        return undefined;
    }
    setSDKFilter(filter: string): void {
        this.ios.setSDKFilter(filter);
    }
    size(): number {
        return this.ios.size();
    }
}


export class Device {
    setMode(mode:def.DeviceMode) : boolean {
        return VuforiaDevice.getInstance().setMode(<number>mode);
    }
    getMode() : def.DeviceMode {
        return <number>VuforiaDevice.getInstance().getMode();
    }
    setViewerActive(active:boolean) : void {
        VuforiaDevice.getInstance().setViewerActive(active);
    }
    isViewerActive() : boolean {
        return VuforiaDevice.getInstance().isViewerActive();
    }
    getViewerList() : ViewerParametersList {
        const viewerList = VuforiaDevice.getInstance().getViewerList();
        return new ViewerParametersList(viewerList);
    }
    selectViewer(viewer:ViewerParameters) {
        return VuforiaDevice.getInstance().selectViewer(viewer.ios);
    }
    getSelectedViewer() : ViewerParameters|undefined {
        if (!this.isViewerActive()) return undefined;
        return new ViewerParameters(VuforiaDevice.getInstance().getSelectedViewer());
    }
    getRenderingPrimitives(): RenderingPrimitives {
        return new RenderingPrimitives(VuforiaDevice.getInstance().getRenderingPrimitives());
    }
}

export class Renderer {
    getRecommendedFps(flags: def.FPSHint): number {
        return VuforiaRenderer.getRecommendedFps(<number>flags);
    }
    getVideoBackgroundConfig(): def.VideoBackgroundConfig {
        return VuforiaRenderer.getVideoBackgroundConfig();
    }
    setTargetFps(fps: number): boolean {
        return VuforiaRenderer.setTargetFps(fps);
    }
    setVideoBackgroundConfig(cfg: def.VideoBackgroundConfig): void {
        VuforiaRenderer.setVideoBackgroundConfig(<VuforiaVideoBackgroundConfig>cfg);
    }
}

export class Mesh {
    constructor(public ios:VuforiaMesh) {}
    
    getNormalCoordinates(): interop.Reference<number> {
        return this.ios.getNormalCoordinates();
    }
    getNormals(): interop.Reference<def.Vec3> {
        return this.ios.getNormals();
    }
    getNumTriangles(): number {
        return this.ios.getNumTriangles();
    }
    
    getNumVertices(): number {
        return this.ios.getNumVertices();
    }
    
    getPositionCoordinates(): interop.Reference<number> {
        return this.ios.getPositionCoordinates();
    }
    
    getPositions(): interop.Reference<def.Vec3> {
        return this.ios.getPositions();
    }
    
    getTriangles(): interop.Reference<number> {
        return this.ios.getTriangles();
    }
    
    getUVCoordinates(): interop.Reference<number> {
        return this.ios.getUVCoordinates();
    }
    
    getUVs(): interop.Reference<def.Vec2> {
        return this.ios.getUVs();
    }
    
    hasNormals(): boolean {
        return this.ios.hasNormals();
    }
    
    hasPositions(): boolean {
        return this.ios.hasPositions();
    }
    
    hasUVs(): boolean {
        return this.ios.hasUVs();
    }
}

export class RenderingPrimitives {
    
    constructor(public ios:VuforiaRenderingPrimitives){}
    
    getDistortionTextureMesh(viewID: def.View): Mesh {
        const mesh = this.ios.getDistortionTextureMesh(<number>viewID);
        return new Mesh(mesh);
    }
    
    getDistortionTextureSize(viewID: def.View): def.Vec2 {
        return this.ios.getDistortionTextureSize(<number>viewID);
    }
    
    getDistortionTextureViewport(viewID: def.View): def.Vec4 {
        return this.ios.getDistortionTextureViewport(<number>viewID);
    }
    
    getEyeDisplayAdjustmentMatrix(viewID: def.View): def.Matrix44 {
        return createMatrix44(this.ios.getEyeDisplayAdjustmentMatrix(<number>viewID));
    }
    
    getNormalizedViewport(viewID: def.View): def.Vec4 {
        return this.ios.getNormalizedViewport(<number>viewID);
    }
    
    getProjectionMatrix(viewID: def.View, csType: def.CoordinateSystemType): def.Matrix44 {
        return createMatrix44(this.ios.getProjectionMatrixCoordinateSystem(<number>viewID, <number>csType));
    }
    
    getRenderingViews(): ViewList {
        return new ViewList(this.ios.getRenderingViews());
    }
    
    getVideoBackgroundMesh(viewID: def.View): Mesh {
        const mesh = this.ios.getVideoBackgroundMesh(<number>viewID);
        return new Mesh(mesh);
    }
    
    getVideoBackgroundProjectionMatrix(viewID: def.View, csType: def.CoordinateSystemType): def.Matrix44 {
        return createMatrix44(this.ios.getVideoBackgroundProjectionMatrixCoordinateSystem(<number>viewID, <number>csType));
    }
    
    getViewport(viewID: def.View): def.Vec4 {
        return this.ios.getViewport(<number>viewID);
    }
    
}

export class Tracker {}

class DataSet {
    constructor(public ios:VuforiaDataSet){}
    createMultiTarget(name: string): MultiTarget|undefined {
        const mt = this.ios.createMultiTarget(name);
        if (mt) return new MultiTarget(mt);
        return undefined;
    }
    destroy(trackable: Trackable): boolean {
        return this.ios.destroy(trackable.ios);
    }
    exists(path: string, storageType: def.StorageType): boolean {
        return this.ios.existsStorageType(path, <number>storageType);
    }
    getNumTrackables(): number {
        return this.ios.getNumTrackables();
    }
    getTrackable(idx: number): Trackable|undefined {
        const trackable = this.ios.getTrackable(idx);
        if (trackable) return Trackable.createTrackable(trackable);
        return undefined;
    }
    hasReachedTrackableLimit(): boolean {
        return this.ios.hasReachedTrackableLimit();
    }
    isActive(): boolean {
        return this.ios.isActive();
    }
    load(path: string, storageType: def.StorageType): boolean {
        return this.ios.loadStorageType(path, <number>storageType);
    }
}

export class ObjectTracker extends Tracker {
    start() : boolean {
        return VuforiaObjectTracker.getInstance().start();
    }
    stop() : void {
        VuforiaObjectTracker.getInstance().stop();
    }
    createDataSet() : DataSet|undefined {
        const ds = VuforiaObjectTracker.getInstance().createDataSet();
        if (ds) return new DataSet(ds);
        return undefined;
    }
	destroyDataSet(dataSet:DataSet) : boolean {
		return VuforiaObjectTracker.getInstance().destroyDataSet(dataSet.ios);
	}
    activateDataSet(dataSet:DataSet) : boolean {
        return VuforiaObjectTracker.getInstance().activateDataSet(dataSet.ios);
    }
    deactivateDataSet(dataSet:DataSet) : boolean {
        return VuforiaObjectTracker.getInstance().deactivateDataSet(dataSet.ios);
    }
}

export const api = VUFORIA_AVAILABLE ? new API() : undefined;
