interface UIGLViewProtocol {
    renderFrameQCAR(): void;
}

declare var UIGLViewProtocol: any; /* Protocol */

declare class VuforiaApplicationSession extends NSObject {
    static alloc(): VuforiaApplicationSession; // inherited from NSObject
    static new(): VuforiaApplicationSession; // inherited from NSObject
    cameraIsStarted: boolean;
    fixedScreenBounds: CGRect;
    isRetinaDisplay: boolean;
    stateUpdateCallback: (p1: VuforiaState) => void;
    videoViewController: VuforiaVideoViewController;
    videoBackgroundConfig: VuforiaVideoBackgroundConfig;
    activateDataSet(dataSet: VuforiaDataSet): boolean;
    createDataSet(): VuforiaDataSet;
    deactivateDataSet(dataSet: VuforiaDataSet): boolean;
    deinitAR(): void;
    destroyDataSet(dataSet: VuforiaDataSet): boolean;
    hintMaxSimultaneousImageTargets(max: number): boolean;
    init(): VuforiaApplicationSession; // inherited from NSObject
    initARDone(licenseKey: string, done: (p1: NSError) => void): void;
    pauseAR(): boolean;
    resumeAR(): boolean;
    self(): VuforiaApplicationSession; // inherited from NSObjectProtocol
    startCamera(camera: VuforiaCameraDeviceCamera): boolean;
    startObjectTracker(): boolean;
    stopCamera(): boolean;
    getCameraCalibration(): VuforiaCameraCalibration
    getVideoMode(): VuforiaVideoMode
    stopObjectTracker(): void;
    downloadDataSetFromURLDone(url:string,done:(location:string, error:NSError)=>void)
    boottime() : {sec:number};
}

declare enum VuforiaCameraDeviceCamera {
    Default,
    Back,
    Front
}

declare enum VuforiaCameraDeviceFocusMode {
    Normal,
    TriggerAuto,
    ContinuousAuto,
    Infinity,
    Macro
}

declare enum VuforiaCameraDeviceMode {
    Default,
    OptimizeSpeed,
    OptimizeQuality
}

interface VuforiaVideoMode {
    width: number,
    height: number,
    framerate: number
}
declare var VuforiaVideoMode: interop.StructType<VuforiaVideoMode>;

declare class VuforiaDataSet extends NSObject {
    static alloc(): VuforiaDataSet; // inherited from NSObject
    static exists(path: string): boolean;
    static new(): VuforiaDataSet; // inherited from NSObject
    destroy(trackable: VuforiaTrackable): boolean;
    getNumTrackables(): number;
    getTrackable(idx: number): VuforiaTrackable;
    hasReachedTrackableLimit(): boolean;
    init(): VuforiaDataSet; // inherited from NSObject
    isActive(): boolean;
    load(path: string): boolean;
    self(): VuforiaDataSet; // inherited from NSObjectProtocol
}

interface VuforiaGLResourceHandler {
    finishOpenGLESCommands(): void;
    freeOpenGLESResources(): void;
}
declare var VuforiaGLResourceHandler: any; /* Protocol */


interface VuforiaCameraCalibration {
    ok:boolean;
    sizeX:number;
    sizeY:number;
    focalLengthX:number;
    focalLengthY:number;
    principalPointX:number;
    principalPointY:number;
    distortionParameterA:number;
    distortionParameterB:number;
    distortionParameterC:number;
    distortionParameterD:number;
    fieldOfViewRadX:number;
    fieldOfViewRadY:number;
}
declare var VuforiaCameraCalibration: interop.StructType<VuforiaCameraCalibration>;

interface VuforiaMatrix34 {
    _0: number;
    _1: number;
    _2: number;
    _3: number;
    _4: number;
    _5: number;
    _6: number;
    _7: number;
    _8: number;
    _9: number;
    _10: number;
    _11: number;
}
declare var VuforiaMatrix34: interop.StructType<VuforiaMatrix34>;

declare class VuforiaFrame extends NSObject {
    getIndex():number;
    getTimeStamp():number;
}

declare class VuforiaState extends NSObject {
    static alloc(): VuforiaState; // inherited from NSObject
    static new(): VuforiaState; // inherited from NSObject
    getFrame() : VuforiaFrame;
    getNumTrackableResults(): number;
    getNumTrackables(): number;
    getTrackable(idx: number): VuforiaTrackable;
    getTrackableResult(idx: number): VuforiaTrackableResult;
    init(): VuforiaState; // inherited from NSObject
    self(): VuforiaState; // inherited from NSObjectProtocol
}

declare class VuforiaTrackable extends NSObject {
    static alloc(): VuforiaTrackable; // inherited from NSObject
    static getClassType(): number;
    static new(): VuforiaTrackable; // inherited from NSObject
    getId(): number;
    getName(): string;
    getType(): number;
    init(): VuforiaTrackable; // inherited from NSObject
    isExtendedTrackingStarted(): boolean;
    self(): VuforiaTrackable; // inherited from NSObjectProtocol
    startExtendedTracking(): boolean;
    stopExtendedTracking(): boolean;
    asObjectTarget(): VuforiaObjectTarget;
}

declare class VuforiaObjectTarget extends NSObject {
    getSize(): {x:number, y:number, z:number};
}

declare class VuforiaTrackableResult extends NSObject {
    static alloc(): VuforiaTrackableResult; // inherited from NSObject
    static getClassType(): number;
    static new(): VuforiaTrackableResult; // inherited from NSObject
    getPose(): VuforiaMatrix34;
    getStatus(): VuforiaTrackableResultStatus;
    getTrackable(): VuforiaTrackable;
    getType(): number;
    init(): VuforiaTrackableResult; // inherited from NSObject
    self(): VuforiaTrackableResult; // inherited from NSObjectProtocol
}

declare enum VuforiaTrackableResultStatus {
    Unknown,
    Undefined,
    Detected,
    Tracked,
    ExtendedTracked
}

declare const VuforiaTrackableResultStatusDetected: number;

declare const VuforiaTrackableResultStatusExtendedTracked: number;

declare const VuforiaTrackableResultStatusTracked: number;

declare const VuforiaTrackableResultStatusUndefined: number;

declare const VuforiaTrackableResultStatusUnknown: number;

interface VuforiaVideoBackgroundConfig {
    enabled: boolean;
    positionX: number;
    positionY: number;
    sizeX: number;
    sizeY: number;
    reflection: VuforiaVideoBackgroundReflection;
}
declare var VuforiaVideoBackgroundConfig: interop.StructType<VuforiaVideoBackgroundConfig>;

declare enum VuforiaVideoBackgroundReflection {
    Default,
    On,
    Off
}

declare const VuforiaVideoBackgroundReflectionDefault: number;

declare const VuforiaVideoBackgroundReflectionOff: number;

declare const VuforiaVideoBackgroundReflectionOn: number;

declare class VuforiaVideoView extends UIView implements VuforiaGLResourceHandler {
    static alloc(): VuforiaVideoView;
    static appearance(): VuforiaVideoView; // inherited from UIAppearance
    static appearanceForTraitCollection(trait: UITraitCollection): VuforiaVideoView; // inherited from UIAppearance
    static appearanceForTraitCollectionWhenContainedIn(trait: UITraitCollection, ContainerClass: typeof NSObject): VuforiaVideoView; // inherited from UIAppearance
    static appearanceForTraitCollectionWhenContainedInInstancesOfClasses(trait: UITraitCollection, containerTypes: NSArray<typeof NSObject>): VuforiaVideoView; // inherited from UIAppearance
    static appearanceWhenContainedIn(ContainerClass: typeof NSObject): VuforiaVideoView; // inherited from UIAppearance
    static appearanceWhenContainedInInstancesOfClasses(containerTypes: NSArray<typeof NSObject>): VuforiaVideoView; // inherited from UIAppearance
    finishOpenGLESCommands(): void; // inherited from VuforiaGLResourceHandler
    freeOpenGLESResources(): void; // inherited from VuforiaGLResourceHandler
    initWithCoder(aDecoder: NSCoder): VuforiaVideoView; // inherited from NSCoding
    initWithFrame(frame: CGRect): VuforiaVideoView; // inherited from UIView
    initWithFrameAppSession(frame: CGRect, app: VuforiaApplicationSession): VuforiaVideoView;
    self(): VuforiaVideoView; // inherited from NSObjectProtocol
}

declare class VuforiaVideoViewController extends UIViewController implements UIAlertViewDelegate {
    eaglView: VuforiaVideoView;
    vapp: VuforiaApplicationSession;
    alertViewCancel(alertView: UIAlertView): void; // inherited from UIAlertViewDelegate
    alertViewClickedButtonAtIndex(alertView: UIAlertView, buttonIndex: number): void; // inherited from UIAlertViewDelegate
    alertViewDidDismissWithButtonIndex(alertView: UIAlertView, buttonIndex: number): void; // inherited from UIAlertViewDelegate
    alertViewShouldEnableFirstOtherButton(alertView: UIAlertView): boolean; // inherited from UIAlertViewDelegate
    alertViewWillDismissWithButtonIndex(alertView: UIAlertView, buttonIndex: number): void; // inherited from UIAlertViewDelegate
    didPresentAlertView(alertView: UIAlertView): void; // inherited from UIAlertViewDelegate
    initWithApplicationSession(applicationSession: VuforiaApplicationSession): VuforiaVideoViewController;
    initWithCoder(aDecoder: NSCoder): VuforiaVideoViewController; // inherited from NSCoding
    initWithNibNameBundle(nibNameOrNil: string, nibBundleOrNil: NSBundle): VuforiaVideoViewController; // inherited from UIViewController
    self(): VuforiaVideoViewController; // inherited from NSObjectProtocol
    willPresentAlertView(alertView: UIAlertView): void; // inherited from UIAlertViewDelegate
}
