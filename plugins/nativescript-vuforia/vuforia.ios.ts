import * as utils from 'utils/utils'
import * as common from './vuforia-common'
import * as def from 'nativescript-vuforia'
import * as application from 'application'
import * as placeholder from 'ui/placeholder'


export const CameraCalibration = VuforiaCameraCalibration
export const Illumination = VuforiaIllumination


global.moduleMerge(common, exports);

const VUFORIA_AVAILABLE = typeof VuforiaSession !== 'undefined';

const iosVideoView = <VuforiaVideoView> (VUFORIA_AVAILABLE ? VuforiaVideoView.new() : undefined);

export const videoView = new placeholder.Placeholder();
videoView.on('creatingView', (evt)=>{
    evt.view = iosVideoView;
})
videoView.on('loaded', ()=>{
    if (VUFORIA_AVAILABLE) VuforiaSession.onSurfaceCreated();
})
videoView.on('layoutChanged', () => {
    if (VUFORIA_AVAILABLE) configureVuforiaSurface();
})

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
        setTimeout(configureVuforiaSurface, 500);
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

export function configureVuforiaSurface() {
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
                    setTimeout(configureVuforiaSurface, 500);
                    VuforiaSession.registerUpdateCallback((state)=>{
                        if (this.updateCallback)
                         this.updateCallback(new State(state));
                    });
                    VuforiaSession.registerRenderCallback((state)=>{
                        if (this.renderCallback)
                         this.renderCallback(new State(state));
                    });
                    VuforiaSession.onResume();
                }
                resolve(<def.InitResult><number>result);
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

    initSmartTerrain() : boolean {
        if (VuforiaSmartTerrain.initTracker()) {
            this.smartTerrain = new SmartTerrain();
            return true;
        };
        return false;
    }

    deinitSmartTerrain() : boolean {
        if (VuforiaObjectTracker.deinitTracker()) {
            this.objectTracker = undefined;
            return true;
        }
        return false;
    }

    initPositionalDeviceTracker() : boolean {
        if (VuforiaPositionalDeviceTracker.initTracker()) {
            this.positionalDeviceTracker = new PositionalDeviceTracker();
            return true;
        };
        return false;
    }

    deinitPositionalDeviceTracker() : boolean {
        if (VuforiaPositionalDeviceTracker.deinitTracker()) {
            this.positionalDeviceTracker = undefined;
            return true;
        }
        return false;
    }
    
    initObjectTracker() : boolean {
        if (VuforiaObjectTracker.initTracker()) {
            this.objectTracker = new ObjectTracker();
            return true;
        };
        return false;
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

    setTargetFPS(f:number) {
        VuforiaSession.setTargetFPS(f)
    }

    getTargetFPS() : number {
        return VuforiaSession.targetFPS()
    }

    onSurfaceChanged(width:number, height:number) : void {
        VuforiaSession.onSurfaceChangedWidthHeight(width, height);
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
    }
}

function wrapMatrix44(mat:VuforiaMatrix44) : def.Matrix44 {
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
        mat._15,
    ];
}

function convert2GLMatrix(mat:VuforiaMatrix34) : def.Matrix44 {
    return  [
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

function convert2VuforiaMatrix(mat:def.Matrix44) : VuforiaMatrix34 {
    return  {
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
function convertPerspectiveProjection2GLMatrix(mat:VuforiaMatrix34, near:number, far:number) : def.Matrix44 {
    return  [
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


export class Trackable {
    
    static createTrackable(ios:VuforiaTrackable) {
        if (ios instanceof VuforiaAnchor) {
            return new Anchor(ios);
        } if (ios instanceof VuforiaDeviceTrackable) {
            return new DeviceTrackable(ios);
        } else if (ios instanceof VuforiaImageTarget) {
            return new ImageTarget(ios);
        } else if (ios instanceof VuforiaCylinderTarget) {
            return new CylinderTarget(ios);
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
        if (ios instanceof VuforiaAnchorResult) {
            return new AnchorResult(ios);
        } else if (ios instanceof VuforiaDeviceTrackableResult) {
            return new DeviceTrackableResult(ios)
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
        return convert2GLMatrix(this.ios.getPose());
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

export class DeviceTrackable extends Trackable implements def.DeviceTrackable {
    constructor(public ios:VuforiaDeviceTrackable) {super(ios)}
}

export class DeviceTrackableResult extends TrackableResult implements def.DeviceTrackableResult {
    constructor(public ios:VuforiaDeviceTrackableResult) {super(ios)}
}

export class Anchor extends Trackable implements def.Anchor {
    constructor(public ios:VuforiaAnchor) {super(ios)}
}

export class AnchorResult extends TrackableResult implements def.AnchorResult {
    constructor(public ios:VuforiaAnchorResult) {super(ios)}
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
    getCameraCalibration() {
        return this.ios.getCameraCalibration()
    }
    getIllumination() {
        return this.ios.getIllumination()
    }
    getDeviceTrackableResult() {
        const result = this.ios.getDeviceTrackableResult()
        if (result) return new DeviceTrackableResult(result)
        return undefined
    }
}

export class CameraDevice {
    init(camera: def.CameraDeviceDirection): boolean {
        return VuforiaCameraDevice.getInstance().initCamera(<number>camera);
    }
    
    deinit(): boolean {
        return VuforiaCameraDevice.getInstance().deinitCamera();
    }
    
    getCameraCalibration(): def.CameraCalibration {
        return VuforiaCameraDevice.getInstance().getCameraCalibration();
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
    getVideoBackgroundConfig() : def.VideoBackgroundConfig {
        return VuforiaRenderer.getVideoBackgroundConfig();
    }
    setTargetFps(fps: number): boolean {
        return VuforiaRenderer.setTargetFps(fps);
    }
    setVideoBackgroundConfig(cfg: def.VideoBackgroundConfig): void {
        VuforiaRenderer.setVideoBackgroundConfig(<VuforiaVideoBackgroundConfig>cfg);
        configureVuforiaSurface()
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
        return convert2GLMatrix(this.ios.getEyeDisplayAdjustmentMatrix(<number>viewID));
    }
    
    getNormalizedViewport(viewID: def.View): def.Vec4 {
        return this.ios.getNormalizedViewport(<number>viewID);
    }
    
    getProjectionMatrix(viewID: def.View, cameraCalibration:def.CameraCalibration, near:number, far:number): def.Matrix44 {
        const projectionMatrix = this.ios.getProjectionMatrixCameraCalibrationNearFar(
            <number>viewID, 
            cameraCalibration,
            near, 
            far
        )
        return wrapMatrix44(projectionMatrix)
    }
    
    getRenderingViews(): ViewList {
        return new ViewList(this.ios.getRenderingViews());
    }
    
    getVideoBackgroundMesh(viewID: def.View): Mesh {
        const mesh = this.ios.getVideoBackgroundMesh(<number>viewID);
        return new Mesh(mesh);
    }
    
    getVideoBackgroundProjectionMatrix(viewID: def.View): def.Matrix44 {
        return convertPerspectiveProjection2GLMatrix(this.ios.getVideoBackgroundProjectionMatrix(<number>viewID),  0.01, 100000);
    }
    
    getViewport(viewID: def.View): def.Vec4 {
        return this.ios.getViewport(<number>viewID);
    }
    
}

class DataSet implements def.DataSet {
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

export abstract class Tracker {
    abstract nativeClass : typeof VuforiaTracker & {getInstance():VuforiaTracker};
    start() : boolean {
        return this.nativeClass.getInstance().start();
    }
    stop() : void {
        this.nativeClass.getInstance().stop();
    }
}

export class HitTestResult implements def.HitTestResult {
    constructor(public ios:VuforiaHitTestResult) {};
    getPose() {
        return convert2GLMatrix(this.ios.getPose());
    }
}

export class PositionalDeviceTracker extends Tracker implements def.PositionalDeviceTracker {
    nativeClass = VuforiaPositionalDeviceTracker;
    createAnchorFromPose(name: string, pose: def.Matrix44): def.Anchor | null {
        const vuforiaPose = convert2VuforiaMatrix(pose);
        const vuforiaAnchor = VuforiaPositionalDeviceTracker.getInstance().createAnchorWithNamePose(name, vuforiaPose);
        return vuforiaAnchor ? new Anchor(vuforiaAnchor) : null;
    }
    createAnchorFromHitTestResult(name: string, hitTestResult: HitTestResult): def.Anchor | null {
        const vuforiaAnchor = VuforiaPositionalDeviceTracker.getInstance().createAnchorWithNameHitTestResult(name, hitTestResult.ios);
        return vuforiaAnchor ? new Anchor(vuforiaAnchor) : null;
    }
    destroyAnchor(anchor: Anchor) {
        return VuforiaPositionalDeviceTracker.getInstance().destroyAnchor(anchor.ios);
    }
    getNumAnchors(): number {
        return VuforiaPositionalDeviceTracker.getInstance().numAnchors();
    }
    getAnchor(idx: number): def.Anchor | null {
        const vuforiaAnchor = VuforiaPositionalDeviceTracker.getInstance().getAnchorAtIndex(idx);
        return vuforiaAnchor ? new Anchor(vuforiaAnchor) : null;
    }
}

export class SmartTerrain extends Tracker implements def.SmartTerrain {
    nativeClass = VuforiaSmartTerrain;

    private _smartTerrain:VuforiaSmartTerrain

    get _terrain() {
        if (!this._smartTerrain) this._smartTerrain = VuforiaSmartTerrain.getInstance()
        return this._smartTerrain
    }
   
    hitTest(state:State, point:def.Vec2, defaultDeviceHeight:number,hint:def.HitTestHint) : void {
        this._terrain.hitTestWithStatePointDeviceHeightHint(
            state.ios,
            point,
            defaultDeviceHeight,
            <number>hint
        );
    }

    getHitTestResultCount() {
        return this._terrain.hitTestResultCount();
    }

    getHitTestResult(idx:number) {
        const r = this._terrain.getHitTestResultAtIndex(idx);
        return new HitTestResult(r);
    }
}

export class ObjectTracker extends Tracker implements def.ObjectTracker {
    nativeClass = VuforiaObjectTracker;
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
