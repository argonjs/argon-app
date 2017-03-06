declare module "nativescript-vuforia" {
    
    import views = require('ui/core/view')

    export const api:API;
    export const videoView:views.View;
    
    // api
    
    export const enum Hint {
        MaxSimultaneousImageTargets = 0,
        MaxSimultaneousObjectTargets = 1,
        DelayedLoadingObjectDatasets = 2
    }
    
    const enum InitResult {
        SUCCESS = 100,
        ERROR = -1,
        DEVICE_NOT_SUPPORTED = -2,
        NO_CAMERA_ACCESS = -3,
        LICENSE_ERROR_MISSING_KEY = -4,
        LICENSE_ERROR_INVALID_KEY = -5,
        LICENSE_ERROR_NO_NETWORK_PERMANENT = -6,
        LICENSE_ERROR_NO_NETWORK_TRANSIENT = -7,
        LICENSE_ERROR_CANCELED_KEY = -8,
        LICENSE_ERROR_PRODUCT_TYPE_MISMATCH = -9,
        EXTERNAL_DEVICE_NOT_DETECTED = -10
    }
    
    export class API {
        setLicenseKey(licenseKey:string) : boolean;
        setHint(hint:Hint,value:number) : boolean;
        init() : Promise<InitResult>;
        deinit() : void;
        getCameraDevice() : CameraDevice;
        getDevice() : Device;
        getRenderer() : Renderer;
        initObjectTracker() : boolean;
        getObjectTracker() : ObjectTracker|undefined;
        deinitObjectTracker() : boolean;
        setStateUpdateCallback(cb:(state:State)=>void);
        getViewerScaleFactor() : number;
        setScaleFactor(f:number) : void;
        getScaleFactor() : number;
        onSurfaceChanged(width:number, height:number) : void;
    }
    
    interface Vec2 {
        x: number,
        y: number
    }
    
    interface Vec3 {
        x: number,
        y: number,
        z: number
    }
    
    interface Vec4 {
        x: number,
        y: number,
        z: number,
        w: number
    }
    
    interface Matrix44 {
        '0': number;
        '1': number;
        '2': number;
        '3': number;
        '4': number;
        '5': number;
        '6': number;
        '7': number;
        '8': number;
        '9': number;
        '10': number;
        '11': number;
        '12': number;
        '13': number;
        '14': number;
        '15': number;
    }
    
    const enum TrackableResultStatus {
        Unknown = 0,
        Undefined = 1,
        Detected = 2,
        Tracked = 3,
        ExtendedTracked = 4
    }
    
    export class Trackable {
        getId(): number;
        getName(): string;
        isExtendedTrackingStarted(): boolean;
        startExtendedTracking(): boolean;
        stopExtendedTracking(): boolean;
    }
    
    export class TrackableResult {
        getPose(): Matrix44;
        getTimeStamp() : number;
        getStatus(): TrackableResultStatus;
        getTrackable(): Trackable;
    }
    
    export class Marker extends Trackable {}

    export class MarkerResult extends TrackableResult {
        getTrackable(): Marker;
    }

    export class Word extends Trackable {}

    export class WordResult extends TrackableResult {
        getTrackable(): Word;
    }

    export class ObjectTarget extends Trackable {
        getUniqueTargetId(): string;
        getSize(): Vec3;
    }

    export class ObjectTargetResult extends TrackableResult {
        getTrackable(): ObjectTarget;
    }

    export class ImageTarget extends ObjectTarget {}

    export class ImageTargetResult extends ObjectTargetResult {
        getTrackable(): ImageTarget;
    }
    
    export class MultiTarget extends ObjectTarget {}

    export class MultiTargetResult extends ObjectTargetResult {
        getTrackable(): MultiTarget;
    }

    export class CylinderTarget extends ObjectTarget {}

    export class CylinderTargetResult extends ObjectTargetResult {
        getTrackable(): CylinderTarget;
    }
    
    export const enum PixelFormat {
        Unknown = 0,
        RGB565 = 1,
        RGB888 = 2,
        GRAYSCALE = 4,
        YUV = 8,
        RGBA8888 = 16,
        INDEXED = 32
    }
    
    export class Image {
        getBufferHeight(): number;
        getBufferWidth(): number;
        getFormat(): PixelFormat;
        getHeight(): number;
        getPixels(): interop.Pointer|undefined;
        getStride(): number;
        getWidth(): number;
    }
    
    export class Frame {
        getImage(idx: number): Image|undefined;
        getIndex(): number;
        getNumImages(): number;
        getTimeStamp(): number;
    }
    
    export class State {
        getFrame(): Frame;
        getNumTrackableResults(): number;
        getNumTrackables(): number;
        getTrackable(idx: number): Trackable|undefined;
        getTrackableResult(idx: number): TrackableResult|undefined;
    }
    
    export const enum CameraDeviceDirection {
        Default = 0,
        Back = 1,
        Front = 2
    }
    
    export interface VideoMode {
        width: number;
        height: number;
        framerate: number;
    }
    
    const enum CameraDeviceFocusMode {
        Normal = 0,
        TriggerAuto = 1,
        ContinuousAuto = 2,
        Infinite = 3,
        Macro = 4
    }
    
    export class CameraCalibration {
        getDistortionParameters(): Vec4;
        getFieldOfViewRads(): Vec2;
        getFocalLength(): Vec2;
        getPrincipalPoint(): Vec2;
        getSize(): Vec2;
    }

	const enum CameraDeviceMode {
		Default = -1,
		OptimizeSpeed = -2,
		OpimizeQuality = -3
	}
    
    export class CameraDevice {
        init(camera: CameraDeviceDirection): boolean;
        deinit(): boolean;
        getCameraCalibration(): CameraCalibration;
        getCameraDirection(): CameraDeviceDirection;
        getNumVideoModes(): number;
        getVideoMode(index: number|CameraDeviceMode): VideoMode;
        selectVideoMode(index: number|CameraDeviceMode): boolean;
        setFlashTorchMode(on: boolean): boolean;
        setFocusMode(focusMode: CameraDeviceFocusMode): boolean;
        start(): boolean;
        stop(): boolean;
    }
    
    export const enum DeviceMode {
        AR = 0,
        VR = 1
    }
    
    const enum CoordinateSystemType {
        Unknown = 0,
        Camera = 1,
        World = 2
    }

    export const enum View {
        Singular = 0,
        LeftEye = 1,
        RightEye = 2,
        PostProcess = 3,
        Count = 4
    }

    export class ViewList {
        contains(view: View): boolean;
        getNumViews(): number;
        getView(idx: number): View;
    }
    
    export const enum ViewerParamtersButtonType {
        None = 0,
        Magnet = 1,
        FingerTouch = 2,
        ButtonTouch = 3
    }

    export const enum ViewerParamtersTrayAlignment {
        Bottom = 0,
        Centre = 1,
        Top = 2
    }

    export class ViewerParameters {
        containsMagnet(): boolean;
        getButtonType(): ViewerParamtersButtonType;
        getDistortionCoefficient(idx: number): number;
        getFieldOfView(): Vec4;
        getInterLensDistance(): number;
        getLensCentreToTrayDistance(): number;
        getManufacturer(): string;
        getName(): string;
        getNumDistortionCoefficients(): number;
        getScreenToLensDistance(): number;
        getTrayAlignment(): ViewerParamtersTrayAlignment;
        getVersion(): number;
    }

    export class ViewerParametersList {
        get(idx: number): ViewerParameters|undefined;
        getNameManufacturer(name: string, manufacturer: string): ViewerParameters|undefined;
        setSDKFilter(filter: string): void;
        size(): number;
    }
    
    export class Device {
        setMode(mode:DeviceMode) : boolean;
        getMode() : DeviceMode;
        setViewerActive(active:boolean) : void;
        isViewerActive() : boolean;
        getViewerList() : ViewerParametersList;
        selectViewer(viewer:ViewerParameters);
        getSelectedViewer() : ViewerParameters|undefined;
        getRenderingPrimitives(): RenderingPrimitives;
    }
    
    const enum FPSHint {
        None = 0,
        NoVideoBackground = 1,
        PowerEfficiency = 2,
        Fast = 4,
        DefaultFlags = 0
    }
        
    const enum VideoBackgroundReflection {
        Default = 0,
        On = 1,
        Off = 2
    }
    
    export interface VideoBackgroundConfig {
        enabled:boolean;
        positionX:number;
        positionY:number;
        sizeX:number;
        sizeY:number;
        reflection:VideoBackgroundReflection|number;
    }
    
    export class Renderer {
        getRecommendedFps(flags: FPSHint): number;
        getVideoBackgroundConfig(): VideoBackgroundConfig;
        setTargetFps(fps: number): boolean;
        setVideoBackgroundConfig(cfg: VideoBackgroundConfig): void;
    }
    
    export class Mesh {
        getNormalCoordinates(): interop.Reference<number>|undefined;
        getNormals(): interop.Reference<Vec3>|undefined;
        getNumTriangles(): number;
        getNumVertices(): number;
        getPositionCoordinates(): interop.Reference<number>|undefined;
        getPositions(): interop.Reference<Vec3>|undefined;
        getTriangles(): interop.Reference<number>|undefined;
        getUVCoordinates(): interop.Reference<number>|undefined;
        getUVs(): interop.Reference<Vec2>|undefined;
        hasNormals(): boolean;
        hasPositions(): boolean;
        hasUVs(): boolean;
    }
    
    export class RenderingPrimitives {
        getDistortionTextureMesh(viewID: View): Mesh;
        getDistortionTextureSize(viewID: View): Vec2;
        getDistortionTextureViewport(viewID: View): Vec4;
        getEyeDisplayAdjustmentMatrix(viewID: View): Matrix44;
        getNormalizedViewport(viewID: View): Vec4;
        getProjectionMatrix(viewID: View, csType: CoordinateSystemType): Matrix44;
        getRenderingViews(): ViewList;
        getVideoBackgroundMesh(viewID: View): Mesh;
        getVideoBackgroundProjectionMatrix(viewID: View, csType: CoordinateSystemType): Matrix44;
        getViewport(viewID: View): Vec4;
    }
    
    export class Tracker {}
    
    export const enum StorageType {
        App = 0,
        AppResource = 1,
        Absolute = 2
    }
    
    export class DataSet {
        createMultiTarget(name: string): MultiTarget|undefined;
        destroy(trackable: Trackable): boolean;
        exists(path: string, storageType: StorageType): boolean;
        getNumTrackables(): number;
        getTrackable(idx: number): Trackable|undefined;
        hasReachedTrackableLimit(): boolean;
        isActive(): boolean;
        load(path: string, storageType: StorageType): boolean;
    }
    
    export class ObjectTracker extends Tracker {
        start() : boolean;
        stop() : void;
        createDataSet() : DataSet|undefined;
		destroyDataSet(dataSet: DataSet) : boolean;
        activateDataSet(dataSet:DataSet) : boolean;
        deactivateDataSet(dataSet:DataSet) : boolean;
    }
    
    
    // util
    
    export function getInterfaceOrientation() : number;
    
    
}