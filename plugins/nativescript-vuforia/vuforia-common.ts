require('globals')
import def = require('nativescript-vuforia');

export enum Hint {
    MaxSimultaneousImageTargets = 0,
    MaxSimultaneousObjectTargets = 1,
    DelayedLoadingObjectDatasets = 2
}

export enum InitResult {
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

export enum StorageType {
    App = 0,
    AppResource = 1,
    Absolute = 2
}

export enum FPSHint {
    None = 0,
    NoVideoBackground = 1,
    PowerEfficiency = 2,
    Fast = 4,
    DefaultFlags = 0
}
    
export enum VideoBackgroundReflection {
    Default = 0,
    On = 1,
    Off = 2
}

export enum DeviceMode {
    AR = 0,
    VR = 1
}

export enum CoordinateSystemType {
    Unknown = 0,
    Camera = 1,
    World = 2
}

export enum View {
    Singular = 0,
    LeftEye = 1,
    RightEye = 2,
    PostProcess = 3,
    Count = 4
}

export enum ViewerParamtersButtonType {
    None = 0,
    Magnet = 1,
    FingerTouch = 2,
    ButtonTouch = 3
}

export enum ViewerParamtersTrayAlignment {
    Bottom = 0,
    Centre = 1,
    Top = 2
}

export enum CameraDeviceMode {
    Default = -1,
    OptimizeSpeed = -2,
    OptimizeQuality = -3
}

export enum CameraDeviceFocusMode {
    Normal = 0,
    TriggerAuto = 1,
    ContinuousAuto = 2,
    Infinite = 3,
    Macro = 4
}

export enum CameraDeviceDirection {
    Default = 0,
    Back = 1,
    Front = 2
}

export enum PixelFormat {
    Unknown = 0,
    RGB565 = 1,
    RGB888 = 2,
    GRAYSCALE = 4,
    YUV = 8,
    RGBA8888 = 16,
    INDEXED = 32
}

export enum TrackableResultStatus {
    NoPose = 0, Unknown = 0,
    Limited = 1, Undefined = 1,
    Detected = 2,
    Tracked = 3,
    ExtendedTracked = 4
}

export enum HitTestHint {
    None = 0,
    HorizontalPlane = 1,
    VerticalPlane = 2
}

export abstract class APIBase implements def.API {
    abstract setLicenseKey(licenseKey:string) : boolean;
    abstract setHint(hint:def.Hint,value:number) : boolean;

    abstract init() : Promise<def.InitResult>;
    abstract deinit() : void;

    abstract getCameraDevice() : def.CameraDevice;
    abstract getDevice() : def.Device;
    abstract getRenderer() : def.Renderer;

    smartTerrain? : def.SmartTerrain;
    abstract initSmartTerrain() : boolean;
    abstract deinitSmartTerrain() : boolean;

    positionalDeviceTracker? : def.PositionalDeviceTracker;
    abstract initPositionalDeviceTracker() : boolean;
    abstract deinitPositionalDeviceTracker() : boolean;
    
    objectTracker? : def.ObjectTracker;
    abstract initObjectTracker() : boolean;
    abstract deinitObjectTracker() : boolean;

    abstract setScaleFactor(f:number);
    abstract getScaleFactor() : number; 
    abstract onSurfaceChanged(width:number, height:number) : void;

    abstract setTargetFPS(f:number);
    abstract getTargetFPS() : number;
    
    public renderCallback?:(state:def.State)=>void;
    public updateCallback?:(state:def.State)=>void;

    getViewerScaleFactor() {
        // static const float VIRTUAL_FOV_Y_DEGS = 85.0f;

        // Get the y-dimension of the physical camera field of view
        const cameraCalibration = this.getCameraDevice().getCameraCalibration();
        if (!cameraCalibration) throw new Error('Unable to get camera calibration');
        const device = this.getDevice();
        if (!device.isViewerActive()) throw new Error('Viewer is not active');

        const fov = cameraCalibration.getFieldOfViewRads();
        const cameraFovYRad = fov.y;
        const viewer = device.getSelectedViewer();
        if (!viewer)  throw new Error('No viewer is selected');

        // Get the y-dimension of the virtual camera field of view
        const viewerFOV = viewer.getFieldOfView();
        const viewerFOVy = viewerFOV.y + viewerFOV.z;
        const virtualFovYRad = viewerFOVy * Math.PI / 180;
        //    float virtualFovYRad = VIRTUAL_FOV_Y_DEGS * M_PI / 180;
        
        // The viewer-scale factor represents the proportion of the viewport that is filled by
        // the video background when projected onto the same plane.
        // In order to calculate this, let 'd' be the distance between the cameras and the plane.
        // The height of the projected image 'h' on this plane can then be calculated:
        //   tan(fov/2) = h/2d
        // which rearranges to:
        //   2d = h/tan(fov/2)
        // Since 'd' is the same for both cameras, we can combine the equations for the two cameras:
        //   hPhysical/tan(fovPhysical/2) = hVirtual/tan(fovVirtual/2)
        // Which rearranges to:
        //   hPhysical/hVirtual = tan(fovPhysical/2)/tan(fovVirtual/2)
        // ... which is the scene-scale factor
        return Math.tan(cameraFovYRad / 2) / Math.tan(virtualFovYRad / 2);
    }
}
