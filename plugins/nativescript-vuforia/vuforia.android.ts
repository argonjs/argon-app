//import * as utils from 'utils/utils';

import common = require('./vuforia-common');
import def = require('nativescript-vuforia');
import application = require('application');
import placeholder = require('ui/placeholder');
import vuforia = com.vuforia;
import plugin = io.argonjs.vuforia;

global.moduleMerge(common, exports);

const VUFORIA_AVAILABLE = typeof plugin.VuforiaSession !== 'undefined';

const androidVideoView = <plugin.VuforiaGLView> (VUFORIA_AVAILABLE ? new plugin.VuforiaGLView(application.android.context) : undefined);
var vuforiaRenderer: plugin.VuforiaRenderer;

export const videoView = new placeholder.Placeholder();
videoView.on(placeholder.Placeholder.creatingViewEvent, (evt:placeholder.CreateViewEventData)=>{
    evt.view = androidVideoView;

    androidVideoView.init(vuforia.Vuforia.requiresAlpha(), 16, 0);

    vuforiaRenderer = new plugin.VuforiaRenderer();
    androidVideoView.setRenderer(vuforiaRenderer);
})

videoView.onLoaded = function() {
    if (VUFORIA_AVAILABLE) vuforia.Vuforia.onSurfaceCreated();
}

videoView.onLayout = function(left, top, right, bottom) {
    if (VUFORIA_AVAILABLE) configureVuforiaSurface();
}

application.on(application.suspendEvent, ()=> {
    if (VUFORIA_AVAILABLE) {
        console.log('Pausing Vuforia');
        vuforia.Vuforia.onPause();
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
        vuforia.Vuforia.onResume();
        vuforia.Vuforia.onSurfaceCreated();
        configureVuforiaSurface();
    }
})

function configureVuforiaSurface() {
    if (!api) throw new Error();
    //const contentScaleFactor = androidVideoView.contentScaleFactor;
    const contentScaleFactor = 1.0; // todo: fix this
    api.onSurfaceChanged(
        androidVideoView.getWidth() * contentScaleFactor,
        androidVideoView.getHeight() * contentScaleFactor
    );
    console.log("configureVuforiaSurface: " + androidVideoView.getWidth() + ", " + androidVideoView.getHeight());
}

export class API extends common.APIBase {
    
    private cameraDevice = new CameraDevice();
    private device = new Device();
    private renderer = new Renderer();
    
    private objectTracker:ObjectTracker|undefined;
    
    setLicenseKey(licenseKey:string) : boolean {
        if (application.android.foregroundActivity != null && licenseKey != null) {
            plugin.VuforiaSession.setLicenseKey(application.android.foregroundActivity, licenseKey);
            return true;
        }
        return false;
    }
    
    setHint(hint:def.Hint,value:number) : boolean {
        return vuforia.Vuforia.setHint(<number>hint, value);
    }

    init() : Promise<def.InitResult> {
        return new Promise<def.InitResult>((resolve, reject) => {
            plugin.VuforiaSession.init(new plugin.VuforiaControl({
                onInitARDone(result: number): void {
                    if (result == vuforia.InitResult.SUCCESS) {
                        if (api) {
                            api.getDevice().setMode(def.DeviceMode.AR)
                        }
                        vuforiaRenderer.mIsActive = true;

                        vuforia.Vuforia.onSurfaceCreated();
                        configureVuforiaSurface();
                        setTimeout(configureVuforiaSurface, 1000);
                        setTimeout(configureVuforiaSurface, 5000); // this shouldn't be required, but sometimes the video feed doesn't appear after reinit
                        
                        vuforia.Vuforia.registerCallback(new vuforia.Vuforia.UpdateCallbackInterface({
                            Vuforia_onUpdate(state: vuforia.State) {
                                if (api && api.callback)
                                    api.callback(new State(state));
                            }
                        }));

                        vuforia.Vuforia.onResume();
                    }
                    resolve(<def.InitResult><number>result);
                }
            }));
        });
    }
    
    deinit() : void {
        vuforia.Vuforia.deinit();
        vuforia.Vuforia.onPause();
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
        var tracker = <vuforia.ObjectTracker> vuforia.TrackerManager.getInstance().initTracker(vuforia.ObjectTracker.getClassType());
        if (tracker != null) {
            this.objectTracker = new ObjectTracker(tracker);
            return true;
        }
        return false;
    }
    
    getObjectTracker() {
        return this.objectTracker;
    }
    
    deinitObjectTracker() : boolean {
        if (vuforia.TrackerManager.getInstance().deinitTracker(vuforia.ObjectTracker.getClassType())) {
            this.objectTracker = undefined;
            return true;
        }
        return false;
    }

    setScaleFactor(f:number) {
        plugin.VuforiaSession.setScaleFactor && plugin.VuforiaSession.setScaleFactor(f);
    }

    getScaleFactor() : number {
        return plugin.VuforiaSession.scaleFactor();
    }

    onSurfaceChanged(width:number, height:number) : void {
        vuforia.Vuforia.onSurfaceChanged(width, height);
        /*
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
        */
    }
}

function createVec2(vec:vuforia.Vec2F) : def.Vec2 {
    var data = vec.getData();
    return { x: data[0], y: data[1] };
}

function createVec3(vec:vuforia.Vec3F) : def.Vec3 {
    var data = vec.getData();
    return { x: data[0], y: data[1], z: data[2] };
}

function createVec4(vec:vuforia.Vec4F) : def.Vec4 {
    var data = vec.getData();
    return { x: data[0], y: data[1], z: data[2], w: data[3] };
}

function convert2GLMatrix(mat:vuforia.Matrix34F) : def.Matrix44 {
    var data = mat.getData();
    return  [
                data[0],
                data[4],
                data[8],
                0,
                data[1],
                data[5],
                data[9],
                0,
                data[2],
                data[6],
                data[10],
                0,
                data[3],
                data[7],
                data[11],
                1
            ];
}

// https://library.vuforia.com/articles/Solution/How-To-Access-Camera-Parameters
function convertPerspectiveProjection2GLMatrix(mat:vuforia.Matrix34F, near:number, far:number) : def.Matrix44 {
    var data = mat.getData();
    return  [
                data[0],
                data[4],
                data[8],
                0,
                data[1],
                data[5],
                data[9],
                0,
                data[2],
                data[6],
                (far + near) / (far - near),
                1,
                data[3],
                data[7],
                -near * (1 + (far + near) / (far - near)),
                0
            ];
}

export class Trackable {
    
    static createTrackable(android:vuforia.Trackable) {
        /*
        if (android instanceof vuforia.Marker) {
            return new Marker(android)
        } else if (android instanceof vuforia.Word) {
            return new Word(android)
        } else
        */
        if (android instanceof vuforia.ImageTarget) {
            return new ImageTarget(android)
        } else if (android instanceof vuforia.CylinderTarget) {
            return new CylinderTarget(android)
        } else if (android instanceof vuforia.ObjectTarget) {
            return new ObjectTarget(android);
        } else if (android instanceof vuforia.Trackable) {
            return new Trackable(android);
        }
        throw new Error();
    }
    
    constructor(public android:vuforia.Trackable) {}
    
    getId(): number {
        return this.android.getId();
    }
    getName(): string {
        return this.android.getName();
    }
    isExtendedTrackingStarted(): boolean {
        return this.android.isExtendedTrackingStarted();
    }
    startExtendedTracking(): boolean {
        return this.android.startExtendedTracking();
    }
    stopExtendedTracking(): boolean {
        return this.android.stopExtendedTracking();
    }
}

export class TrackableResult {
    
    static createTrackableResult(android:vuforia.TrackableResult) {
        /*
        if (android instanceof vuforia.MarkerResult) {
            return new MarkerResult(android)
        } else if (android instanceof vuforia.WordResult) {
            return new WordResult(android)
        } else
        */
        if (android instanceof vuforia.ImageTargetResult) {
            return new ImageTargetResult(android)
        } else if (android instanceof vuforia.CylinderTargetResult) {
            return new CylinderTargetResult(android)
        } else if (android instanceof vuforia.ObjectTargetResult) {
            return new ObjectTargetResult(android);
        } else if (android instanceof vuforia.TrackableResult) {
            return new TrackableResult(android);
        }
        throw new Error();
    }
    
    constructor(public android:vuforia.TrackableResult) {}
    
    getPose(): def.Matrix44 {
        var mat34 = this.android.getPose();
        return convert2GLMatrix(mat34);
    }
    
    getTimeStamp() : number {
        return this.android.getTimeStamp();
    }
    
    getStatus(): def.TrackableResultStatus {
        return <number>this.android.getStatus();
    }
    
    getTrackable(): Trackable {
        return Trackable.createTrackable(this.android.getTrackable());
    }
}

export class Marker extends Trackable {
    constructor(public android:vuforia.Marker) {super(android)}
}

export class MarkerResult extends TrackableResult {
    constructor(public android:vuforia.MarkerResult) {super(android)}
}

export class Word extends Trackable {
    constructor(public android:vuforia.Word) {super(android)}
}

export class WordResult extends TrackableResult {    
    constructor(public android:vuforia.WordResult) {super(android)}
}

export class ObjectTarget extends Trackable {    
    constructor(public android:vuforia.ObjectTarget) {super(android)}
    
    getUniqueTargetId() : string {
        return this.android.getUniqueTargetId();
    }
    
    getSize(): def.Vec3 {
        return createVec3(this.android.getSize());
    }
}

export class ObjectTargetResult extends TrackableResult {    
    constructor(public android:vuforia.ObjectTargetResult) {super(android)}
}

class ImageTarget extends ObjectTarget {    
    constructor(public android:vuforia.ImageTarget) {super(android)}
}

class ImageTargetResult extends ObjectTargetResult {    
    constructor(public android:vuforia.ImageTargetResult) {super(android)}
}

export class MultiTarget extends ObjectTarget {
    constructor(public android:vuforia.MultiTarget) {super(android)}
}

export class MultiTargetResult extends ObjectTargetResult {    
    constructor(public android:vuforia.ObjectTargetResult) {super(android)}
}

class CylinderTarget extends ObjectTarget {    
    constructor(public android:vuforia.CylinderTarget) {super(android)}
}

class CylinderTargetResult extends ObjectTargetResult {    
    constructor(public android:vuforia.CylinderTargetResult) {super(android)}
}

export class Image {
    constructor(public android:vuforia.Image) {}
    
    getBufferHeight(): number {
        return this.android.getBufferHeight();
    }
    
    getBufferWidth(): number { 
        return this.android.getBufferWidth();
    }
    
    getFormat(): def.PixelFormat { 
        return <number>this.android.getFormat();
    }
    
    getHeight(): number { 
        return this.android.getHeight();
    }
    
    getPixels(): interop.Pointer|undefined { 
        return this.android.getPixels();
    }
    
    getStride(): number { 
        return this.android.getStride();
    }
    
    getWidth(): number { 
        return this.android.getWidth();
    }
}

export class Frame {
    constructor(public android:vuforia.Frame) {}
    getImage(idx: number): Image|undefined {
        const img = this.android.getImage(idx);
        if (img) {
            return new Image(img);
        }
        return undefined;
    }
    getIndex(): number {
        return this.android.getIndex();
    }
    getNumImages(): number {
        return this.android.getNumImages();
    }
    getTimeStamp(): number {
        return this.android.getTimeStamp();
    }
}

export class State {
    constructor(public android:vuforia.State) {}
    getFrame(): Frame {
        const frame = this.android.getFrame();
        return new Frame(frame);
    }
    getNumTrackableResults(): number {
        return this.android.getNumTrackableResults();
    }
    getNumTrackables(): number {
        return this.android.getNumTrackables();
    }
    getTrackable(idx: number): def.Trackable|undefined {
        const trackable = this.android.getTrackable(idx);
        if (trackable) {
            return Trackable.createTrackable(trackable);
        }
        return undefined;
    }
    getTrackableResult(idx: number): def.TrackableResult|undefined {
        const result = this.android.getTrackableResult(idx);
        if (result) {
            return TrackableResult.createTrackableResult(result);
        }
        return undefined;
    }
}

export class CameraCalibration {
    constructor(public android:vuforia.CameraCalibration) {}
    
    getDistortionParameters(): def.Vec4 {
        return createVec4(this.android.getDistortionParameters());
    }
    
    getFieldOfViewRads(): def.Vec2 {
        return createVec2(this.android.getFieldOfViewRads());
    }
    
    getFocalLength(): def.Vec2 {
        return createVec2(this.android.getFocalLength());
    }
    
    getPrincipalPoint(): def.Vec2 {
        return createVec2(this.android.getPrincipalPoint());
    }
    
    getSize(): def.Vec2 {
        return createVec2(this.android.getSize());
    }
}

export class CameraDevice {
    init(camera: def.CameraDeviceDirection): boolean {
        return vuforia.CameraDevice.getInstance().init(<number>camera);
    }
    
    deinit(): boolean {
        return vuforia.CameraDevice.getInstance().deinit();
    }
    
    getCameraCalibration(): CameraCalibration {
        const calibration = vuforia.CameraDevice.getInstance().getCameraCalibration();
        return new CameraCalibration(calibration);
    }
    
    getCameraDirection(): def.CameraDeviceDirection {
        return <number>vuforia.CameraDevice.getInstance().getCameraDirection();
    }
    
    getNumVideoModes(): number {
        return vuforia.CameraDevice.getInstance().getNumVideoModes();
    }
    
    getVideoMode(nIndex: number): def.VideoMode {
        var videoMode = vuforia.CameraDevice.getInstance().getVideoMode(nIndex);
        var result = {
            width: videoMode.getWidth(),
            height: videoMode.getHeight(),
            framerate: videoMode.getFramerate()
        };
        return result;
    }
    
    selectVideoMode(index: number): boolean {
        return vuforia.CameraDevice.getInstance().selectVideoMode(index);
    }
    
    setFlashTorchMode(on: boolean): boolean {
        return vuforia.CameraDevice.getInstance().setFlashTorchMode(on);
    }
    
    setFocusMode(focusMode: def.CameraDeviceFocusMode): boolean {
        return vuforia.CameraDevice.getInstance().setFocusMode(<number>focusMode);
    }
    
    start(): boolean {
        return vuforia.CameraDevice.getInstance().start();
    }
    
    stop(): boolean {
        return vuforia.CameraDevice.getInstance().stop();
    }
}

export class ViewList {
    constructor(public android:vuforia.ViewList) {}
    contains(view: def.View): boolean {
        return this.android.contains(<number>view);
    }
    getNumViews(): number {
        return this.android.getNumViews();
    }
    getView(idx: number): def.View {
        return <number>this.android.getView(idx);
    }
}

export class ViewerParameters {
    constructor(public android:vuforia.ViewerParameters) {}
    containsMagnet(): boolean {
        return this.android.containsMagnet();
    }
    getButtonType(): def.ViewerParamtersButtonType {
        return <number>this.android.getButtonType();
    }
    getDistortionCoefficient(idx: number): number {
        return this.android.getDistortionCoefficient(idx);
    }
    getFieldOfView(): def.Vec4 {
        return createVec4(this.android.getFieldOfView());
    }
    getInterLensDistance(): number {
        return this.android.getInterLensDistance();
    }
    getLensCentreToTrayDistance(): number {
        return this.android.getLensCentreToTrayDistance();
    }
    getManufacturer(): string {
        return this.android.getManufacturer();
    }
    getName(): string {
        return this.android.getName();
    }
    getNumDistortionCoefficients(): number {
        return this.android.getNumDistortionCoefficients();
    }
    getScreenToLensDistance(): number {
        return this.android.getScreenToLensDistance();
    }
    getTrayAlignment(): def.ViewerParamtersTrayAlignment {
        return <number>this.android.getTrayAlignment();
    }
    getVersion(): number {
        return this.android.getVersion();
    }
}

export class ViewerParametersList {
    constructor(public android:vuforia.ViewerParametersList) {}
    get(idx: number): ViewerParameters|undefined {
        const vp = this.android.get(idx);
        if (vp) return new ViewerParameters(vp);
        return undefined;
    }
    getNameManufacturer(name: string, manufacturer: string): ViewerParameters|undefined {
        const vp = this.android.get(name, manufacturer);
        if (vp) return new ViewerParameters(vp);
        return undefined;
    }
    setSDKFilter(filter: string): void {
        this.android.setSDKFilter(filter);
    }
    size(): number {
        return this.android.size();
    }
}


export class Device {
    setMode(mode:def.DeviceMode) : boolean {
        return vuforia.Device.getInstance().setMode(<number>mode);
    }
    getMode() : def.DeviceMode {
        return <number>vuforia.Device.getInstance().getMode();
    }
    setViewerActive(active:boolean) : void {
        vuforia.Device.getInstance().setViewerActive(active);
    }
    isViewerActive() : boolean {
        return vuforia.Device.getInstance().isViewerActive();
    }
    getViewerList() : ViewerParametersList {
        const viewerList = vuforia.Device.getInstance().getViewerList();
        return new ViewerParametersList(viewerList);
    }
    selectViewer(viewer:ViewerParameters) {
        return vuforia.Device.getInstance().selectViewer(viewer.android);
    }
    getSelectedViewer() : ViewerParameters|undefined {
        if (!this.isViewerActive()) return undefined;
        return new ViewerParameters(vuforia.Device.getInstance().getSelectedViewer());
    }
    getRenderingPrimitives(): RenderingPrimitives {
        return new RenderingPrimitives(vuforia.Device.getInstance().getRenderingPrimitives());
    }
}

export class Renderer {
    getRecommendedFps(flags: def.FPSHint): number {
        return vuforia.Renderer.getInstance().getRecommendedFps(<number>flags);
    }
    getVideoBackgroundConfig(): def.VideoBackgroundConfig {
        var vbc: vuforia.VideoBackgroundConfig = vuforia.Renderer.getInstance().getVideoBackgroundConfig();
        var result: def.VideoBackgroundConfig = {
            enabled:vbc.getEnabled(),
            positionX:vbc.getPosition().getData()[0],
            positionY:vbc.getPosition().getData()[1],
            sizeX:vbc.getSize().getData()[0],
            sizeY:vbc.getSize().getData()[1],
            reflection:vbc.getReflection()
        };
        return result;
    }
    setTargetFps(fps: number): boolean {
        return vuforia.Renderer.getInstance().setTargetFps(fps);
    }
    setVideoBackgroundConfig(cfg: def.VideoBackgroundConfig): void {
        var vbc: vuforia.VideoBackgroundConfig = new vuforia.VideoBackgroundConfig();
        vbc.setEnabled(cfg.enabled);
        vbc.setPosition(new vuforia.Vec2I(cfg.positionX, cfg.positionY));
        vbc.setSize(new vuforia.Vec2I(cfg.sizeX, cfg.sizeY));
        vuforia.Renderer.getInstance().setVideoBackgroundConfig(vbc);
    }
}

// interop.Reference does not exist on Android
// Mesh will have to be rethought for cross-platform use
export class Mesh {
    constructor(public android:vuforia.Mesh) {}
    
    getNormalCoordinates(): interop.Reference<number>|undefined {
        //return this.android.getNormalCoordinates();
        return undefined;
    }
    getNormals(): interop.Reference<def.Vec3>|undefined {
        //return this.android.getNormals();
        return undefined;
    }
    getNumTriangles(): number {
        //return this.android.getNumTriangles();
        return 0;
    }
    
    getNumVertices(): number {
        //return this.android.getNumVertices();
        return 0;
    }
    
    getPositionCoordinates(): interop.Reference<number>|undefined {
        //return this.android.getPositionCoordinates();
        return undefined;
    }
    
    getPositions(): interop.Reference<def.Vec3>|undefined {
        //return this.android.getPositions();
        return undefined;
    }
    
    getTriangles(): interop.Reference<number>|undefined {
        //return this.android.getTriangles();
        return undefined;
    }
    
    getUVCoordinates(): interop.Reference<number>|undefined {
        //return this.android.getUVCoordinates();
        return undefined;
    }
    
    getUVs(): interop.Reference<def.Vec2>|undefined {
        //return this.android.getUVs();
        return undefined;
    }
    
    hasNormals(): boolean {
        //return this.android.hasNormals();
        return false;
    }
    
    hasPositions(): boolean {
        //return this.android.hasPositions();
        return false;
    }
    
    hasUVs(): boolean {
        //return this.android.hasUVs();
        return false;
    }
}

export class RenderingPrimitives {
    
    constructor(public android:vuforia.RenderingPrimitives){}
    
    getDistortionTextureMesh(viewID: def.View): Mesh {
        const mesh = this.android.getDistortionTextureMesh(<number>viewID);
        return new Mesh(mesh);
    }
    
    getDistortionTextureSize(viewID: def.View): def.Vec2 {
        return createVec2(this.android.getDistortionTextureSize(<number>viewID));
    }
    
    getDistortionTextureViewport(viewID: def.View): def.Vec4 {
        return createVec4(this.android.getDistortionTextureViewport(<number>viewID));
    }
    
    getEyeDisplayAdjustmentMatrix(viewID: def.View): def.Matrix44 {
        var mat34 = this.android.getEyeDisplayAdjustmentMatrix(<number>viewID);
        return convert2GLMatrix(mat34);
    }
    
    getNormalizedViewport(viewID: def.View): def.Vec4 {
        return createVec4(this.android.getNormalizedViewport(<number>viewID));
    }
    
    getProjectionMatrix(viewID: def.View, csType: def.CoordinateSystemType): def.Matrix44 {
        var mat34 = this.android.getProjectionMatrix(<number>viewID, <number>csType);
        return convertPerspectiveProjection2GLMatrix(mat34, 0.01, 100000);
    }
    
    getRenderingViews(): ViewList {
        return new ViewList(this.android.getRenderingViews());
    }
    
    getVideoBackgroundMesh(viewID: def.View): Mesh {
        const mesh = this.android.getVideoBackgroundMesh(<number>viewID);
        return new Mesh(mesh);
    }
    
    getVideoBackgroundProjectionMatrix(viewID: def.View, csType: def.CoordinateSystemType): def.Matrix44 {
        var mat34 = this.android.getVideoBackgroundProjectionMatrix(<number>viewID, <number>csType);
        return convert2GLMatrix(mat34);
    }
    
    getViewport(viewID: def.View): def.Vec4 {
        return createVec4(this.android.getViewport(<number>viewID));
    }
    
}

export class Tracker {}

class DataSet {
    constructor(public android:vuforia.DataSet){}
    createMultiTarget(name: string): MultiTarget|undefined {
        const mt = this.android.createMultiTarget(name);
        if (mt) return new MultiTarget(mt);
        return undefined;
    }
    destroy(trackable: Trackable): boolean {
        return this.android.destroy(trackable.android);
    }
    exists(path: string, storageType: def.StorageType): boolean {
        return this.android.exists(path, <number>storageType);
    }
    getNumTrackables(): number {
        return this.android.getNumTrackables();
    }
    getTrackable(idx: number): Trackable|undefined {
        const trackable = this.android.getTrackable(idx);
        if (trackable) return Trackable.createTrackable(trackable);
        return undefined;
    }
    hasReachedTrackableLimit(): boolean {
        return this.android.hasReachedTrackableLimit();
    }
    isActive(): boolean {
        return this.android.isActive();
    }
    load(path: string, storageType: def.StorageType): boolean {
        return this.android.load(path, <number>storageType);
    }
}

export class ObjectTracker extends Tracker {
    constructor(public android:vuforia.ObjectTracker){ super(); }
    start() : boolean {
        return this.android.start();
    }
    stop() : void {
        this.android.stop();
    }
    createDataSet() : DataSet|undefined {
        const ds = this.android.createDataSet();
        if (ds) return new DataSet(ds);
        return undefined;
    }
	destroyDataSet(dataSet:DataSet) : boolean {
		return this.android.destroyDataSet(dataSet.android);
	}
    activateDataSet(dataSet:DataSet) : boolean {
        return this.android.activateDataSet(dataSet.android);
    }
    deactivateDataSet(dataSet:DataSet) : boolean {
        return this.android.deactivateDataSet(dataSet.android);
    }
}

export const api = VUFORIA_AVAILABLE ? new API() : undefined;
