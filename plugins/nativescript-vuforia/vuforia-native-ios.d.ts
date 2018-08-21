
interface UIGLViewProtocol {

	renderFrameVuforia(): void;
}
declare var UIGLViewProtocol: {

	prototype: UIGLViewProtocol;
};

declare var Vuforia: number;

declare class VuforiaCameraCalibration extends NSObject {

	static alloc(): VuforiaCameraCalibration; // inherited from NSObject

	static new(): VuforiaCameraCalibration; // inherited from NSObject

	constructor(); // inherited from NSObject

	getDistortionParameters(): VuforiaVec4F;

	getFieldOfViewRads(): VuforiaVec2F;

	getFocalLength(): VuforiaVec2F;

	getPrincipalPoint(): VuforiaVec2F;

	getSize(): VuforiaVec2F;

	self(): VuforiaCameraCalibration; // inherited from NSObjectProtocol
}

declare class VuforiaCameraDevice extends NSObject {

	static alloc(): VuforiaCameraDevice; // inherited from NSObject

	static getInstance(): VuforiaCameraDevice;

	static new(): VuforiaCameraDevice; // inherited from NSObject

	constructor(); // inherited from NSObject

	initCamera(camera: VuforiaCameraDeviceDirection): boolean;
	
	deinitCamera(): boolean;

	getCameraCalibration(): VuforiaCameraCalibration;

	getCameraDirection(): VuforiaCameraDeviceDirection;

	getNumVideoModes(): number;

	getVideoMode(nIndex: number): VuforiaVideoMode;

	selectVideoMode(index: number): boolean;

	self(): VuforiaCameraDevice; // inherited from NSObjectProtocol

	setFlashTorchMode(on: boolean): boolean;

	setFocusMode(focusMode: VuforiaCameraDeviceFocusMode): boolean;

	start(): boolean;

	stop(): boolean;
}

declare const enum VuforiaCameraDeviceDirection {

	Default = 0,

	Back = 1,

	Front = 2
}

declare const enum VuforiaCameraDeviceFocusMode {

	Normal = 0,

	TriggerAuto = 1,

	ContinuousAuto = 2,

	Infinite = 3,

	Macro = 4
}

declare const enum VuforiaCameraDeviceMode {

	Default = -1,

	OptimizeSpeed = -2,

	OpimizeQuality = -3
}

declare class VuforiaCylinderTarget extends VuforiaObjectTarget {
}

declare class VuforiaCylinderTargetResult extends VuforiaObjectTargetResult {

	getTrackable(): VuforiaCylinderTarget;
}

declare class VuforiaDataSet extends NSObject {

	static alloc(): VuforiaDataSet; // inherited from NSObject

	static new(): VuforiaDataSet; // inherited from NSObject

	cpp: interop.Pointer;

	constructor(); // inherited from NSObject

	createMultiTarget(name: string): VuforiaMultiTarget;

	destroy(trackable: VuforiaTrackable): boolean;

	existsStorageType(path: string, storageType: VuforiaStorageType): boolean;

	getNumTrackables(): number;

	getTrackable(idx: number): VuforiaTrackable;

	hasReachedTrackableLimit(): boolean;

	isActive(): boolean;

	loadStorageType(path: string, storageType: VuforiaStorageType): boolean;

	self(): VuforiaDataSet; // inherited from NSObjectProtocol
}

declare class VuforiaDevice extends NSObject {

	static alloc(): VuforiaDevice; // inherited from NSObject

	static getClassType(): number;

	static getInstance(): VuforiaDevice;

	static new(): VuforiaDevice; // inherited from NSObject

	constructor(); // inherited from NSObject

	getMode(): VuforiaDeviceMode;

	getRenderingPrimitives(): VuforiaRenderingPrimitives;

	getSelectedViewer(): VuforiaViewerParameters;

	getType(): number;

	getViewerList(): VuforiaViewerParametersList;

	isViewerActive(): boolean;

	selectViewer(vp: VuforiaViewerParameters): boolean;

	self(): VuforiaDevice; // inherited from NSObjectProtocol

	setConfigurationChanged(): void;

	setMode(m: VuforiaDeviceMode): boolean;

	setViewerActive(active: boolean): void;
}

declare const enum VuforiaDeviceMode {

	AR = 0,

	VR = 1
}

declare class VuforiaDeviceTracker extends VuforiaTracker {

	static deinitTracker(): boolean;

	static getInstance(): VuforiaDeviceTracker;

	static initTracker(): boolean;
}

declare const enum VuforiaFPSHint {

	None = 0,

	NoVideoBackground = 1,

	PowerEfficiency = 2,

	Fast = 4,

	DefaultFlags = 0
}

declare class VuforiaFrame extends NSObject {

	static alloc(): VuforiaFrame; // inherited from NSObject

	static new(): VuforiaFrame; // inherited from NSObject

	constructor(); // inherited from NSObject

	getImage(idx: number): VuforiaImage;

	getIndex(): number;

	getNumImages(): number;

	getTimeStamp(): number;

	self(): VuforiaFrame; // inherited from NSObjectProtocol
}

interface VuforiaGLResourceHandler {

	finishOpenGLESCommands(): void;

	freeOpenGLESResources(): void;
}
declare var VuforiaGLResourceHandler: {

	prototype: VuforiaGLResourceHandler;
};

declare class VuforiaHandheldTransformModel extends VuforiaTransformModel {
}

declare class VuforiaHeadTransformModel extends VuforiaTransformModel {
}

declare const enum VuforiaHint {

	MaxSimultaneousImageTargets = 0,

	MaxSimultaneousObjectTargets = 1,

	DelayedLoadingObjectDatasets = 2
}

declare class VuforiaImage extends NSObject {

	static alloc(): VuforiaImage; // inherited from NSObject

	static new(): VuforiaImage; // inherited from NSObject

	constructor(); // inherited from NSObject

	getBufferHeight(): number;

	getBufferWidth(): number;

	getFormat(): VuforiaPixelFormat;

	getHeight(): number;

	getPixels(): interop.Pointer;

	getStride(): number;

	getWidth(): number;

	self(): VuforiaImage; // inherited from NSObjectProtocol
}

declare class VuforiaImageTarget extends VuforiaObjectTarget {
}

declare class VuforiaImageTargetResult extends VuforiaObjectTargetResult {

	getTrackable(): VuforiaImageTarget;
}

declare const enum VuforiaInitResult {

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

// interface VuforiaMatrix44 {
// 	_0: number;
// 	_1: number;
// 	_2: number;
// 	_3: number;
// 	_4: number;
// 	_5: number;
// 	_6: number;
// 	_7: number;
// 	_8: number;
// 	_9: number;
// 	_10: number;
// 	_11: number;
// 	_12: number;
// 	_13: number;
// 	_14: number;
// 	_15: number;
// }
// declare var VuforiaMatrix44: interop.StructType<VuforiaMatrix44>;

declare class VuforiaMesh extends NSObject {

	static alloc(): VuforiaMesh; // inherited from NSObject

	static new(): VuforiaMesh; // inherited from NSObject

	constructor(); // inherited from NSObject

	getNormalCoordinates(): interop.Reference<number>;

	getNormals(): interop.Reference<VuforiaVec3F>;

	getNumTriangles(): number;

	getNumVertices(): number;

	getPositionCoordinates(): interop.Reference<number>;

	getPositions(): interop.Reference<VuforiaVec3F>;

	getTriangles(): interop.Reference<number>;

	getUVCoordinates(): interop.Reference<number>;

	getUVs(): interop.Reference<VuforiaVec2F>;

	hasNormals(): boolean;

	hasPositions(): boolean;

	hasUVs(): boolean;

	self(): VuforiaMesh; // inherited from NSObjectProtocol
}

declare class VuforiaMultiTarget extends VuforiaObjectTarget {
}

declare class VuforiaMultiTargetResult extends VuforiaObjectTargetResult {

	getTrackable(): VuforiaMultiTarget;
}

declare const enum VuforiaHitTestHint {
	None = 0,
	HorizontalPlane = 1,
	VerticalPlane = 2
}

declare class VuforiaHitTestResult {
	getPose(): VuforiaMatrix34
}

declare class VuforiaSmartTerrain extends VuforiaTracker {
	static initTracker(): boolean;
	static getInstance(): VuforiaSmartTerrain;
	static deinitTracker(): boolean;
	hitTestWithStatePointDeviceHeightHint(state:VuforiaState,point:VuforiaVec2F,deviceHeight:number,hint:VuforiaHitTestHint):void;
	hitTestResultCount():number;
	getHitTestResultAtIndex(idx:number):VuforiaHitTestResult
}

declare class VuforiaDeviceTrackable extends VuforiaTrackable {}

declare class VuforiaDeviceTrackableResult extends VuforiaTrackableResult {
	getTrackable(): VuforiaDeviceTrackable;
}

declare class VuforiaAnchor extends VuforiaTrackable {}

declare class VuforiaAnchorResult extends VuforiaTrackableResult {
	getTrackable(): VuforiaAnchor;
}

declare class VuforiaPositionalDeviceTracker extends VuforiaTracker {
	static initTracker(): boolean;
	static getInstance(): VuforiaPositionalDeviceTracker;
	static deinitTracker(): boolean;
	createAnchorWithNamePose(name:string, pose:VuforiaMatrix34):VuforiaAnchor?;
	createAnchorWithNameHitTestResult(name:string, hitTestResult:VuforiaHitTestResult):VuforiaAnchor?;
	destroyAnchor(anchor:VuforiaAnchor): boolean;
	numAnchors():number;
	getAnchorAtIndex(idx:number):VuforiaAnchor?;
}


declare class VuforiaObjectTarget extends VuforiaTrackable {
    getUniqueTargetId(): string;
	getSize(): VuforiaVec3F;
}

declare class VuforiaObjectTargetResult extends VuforiaTrackableResult {
	getTrackable(): VuforiaObjectTarget;
}

declare class VuforiaObjectTracker extends VuforiaTracker {

	static deinitTracker(): boolean;

	static getInstance(): VuforiaObjectTracker;

	static initTracker(): boolean;
	
	createDataSet() : VuforiaDataSet;

	activateDataSet(dataset: VuforiaDataSet): boolean;

	deactivateDataSet(dataset: VuforiaDataSet): boolean;

	destroyDataSet(dataset: VuforiaDataSet): boolean;

	getActiveDataSet(idx: number): VuforiaDataSet;

	getActiveDataSetCount(): number;

	persistExtendedTracking(on: boolean): boolean;

	resetExtendedTracking(): boolean;
}

declare const enum VuforiaPixelFormat {

	Unknown = 0,

	RGB565 = 1,

	RGB888 = 2,

	GRAYSCALE = 4,

	YUV = 8,

	RGBA8888 = 16,

	INDEXED = 32
}

declare class VuforiaRenderer extends NSObject {

	static alloc(): VuforiaRenderer; // inherited from NSObject

	static getRecommendedFps(flags: VuforiaFPSHint): number;

	static getVideoBackgroundConfig(): VuforiaVideoBackgroundConfig;

	static new(): VuforiaRenderer; // inherited from NSObject

	static setTargetFps(fps: number): boolean;

	static setVideoBackgroundConfig(cfg: VuforiaVideoBackgroundConfig): void;

	constructor(); // inherited from NSObject

	self(): VuforiaRenderer; // inherited from NSObjectProtocol
}

declare class VuforiaRenderingPrimitives extends NSObject {

	static alloc(): VuforiaRenderingPrimitives; // inherited from NSObject

	static new(): VuforiaRenderingPrimitives; // inherited from NSObject

	constructor(); // inherited from NSObject

	getDistortionTextureMesh(viewID: VuforiaView): VuforiaMesh;

	getDistortionTextureSize(viewID: VuforiaView): VuforiaVec2I;

	getDistortionTextureViewport(viewID: VuforiaView): VuforiaVec4I;

	getEyeDisplayAdjustmentMatrix(viewID: VuforiaView): VuforiaMatrix34;

	getNormalizedViewport(viewID: VuforiaView): VuforiaVec4F;

	getProjectionMatrix(viewID: VuforiaView): VuforiaMatrix34;

	getRenderingViews(): VuforiaViewList;

	getVideoBackgroundMesh(viewID: VuforiaView): VuforiaMesh;

	getVideoBackgroundProjectionMatrix(viewID: VuforiaView): VuforiaMatrix34;

	getViewport(viewID: VuforiaView): VuforiaVec4I;

	self(): VuforiaRenderingPrimitives; // inherited from NSObjectProtocol
}

declare const enum VuforiaRotation {

	IOS_90 = 128,

	IOS_180 = 256,

	IOS_270 = 512,

	IOS_0 = 1024
}

declare class VuforiaRotationalDeviceTracker extends VuforiaDeviceTracker {

	static getInstance(): VuforiaRotationalDeviceTracker;

	getDefaultHandheldModel(): VuforiaHandheldTransformModel;

	getDefaultHeadModel(): VuforiaHeadTransformModel;

	getModelCorrection(): VuforiaTransformModel;

	getPosePrediction(): boolean;

	recenter(): boolean;

	setModelCorrection(transformationmodel: VuforiaTransformModel): boolean;

	setPosePrediction(enable: boolean): boolean;
}

declare class VuforiaSession extends NSObject {

	static alloc(): VuforiaSession; // inherited from NSObject

	static deinit(): void;

	static getBitsPerPixel(format: VuforiaPixelFormat): number;

	static getBufferSizeFormat(size: VuforiaVec2I, format: VuforiaPixelFormat): number;

	static initDone(done: (p1: VuforiaInitResult) => void): void;

	static new(): VuforiaSession; // inherited from NSObject

	static onPause(): void;

	static onResume(): void;

	static onSurfaceChangedWidthHeight(width:number, height:number): void;

	static onSurfaceCreated(): void;

	static registerUpdateCallback(callback: (p1: VuforiaState) => void): void;
	static registerRenderCallback(callback: (p1: VuforiaState) => void): void;

	static requiresAlpha(): boolean;

	static setFrameFormatEnabled(format: VuforiaPixelFormat, enabled: boolean): boolean;

	static setHintValue(hint: VuforiaHint, value: number): boolean;

	static setLicenseKey(licenseKey: string): number;

	static setRotation(rotation: VuforiaRotation): void;

	static scaleFactor() : number;

	static setScaleFactor(f:number) : void;

	constructor(); // inherited from NSObject

	self(): VuforiaSession; // inherited from NSObjectProtocol
}

declare class VuforiaState extends NSObject {

	static alloc(): VuforiaState; // inherited from NSObject

	static new(): VuforiaState; // inherited from NSObject

	constructor(); // inherited from NSObject

	constructor(o: { cpp: interop.Pointer; });

	getFrame(): VuforiaFrame;

	getNumTrackableResults(): number;

	getNumTrackables(): number;

	getTrackable(idx: number): VuforiaTrackable;

	getTrackableResult(idx: number): VuforiaTrackableResult;

	self(): VuforiaState; // inherited from NSObjectProtocol
}

declare const enum VuforiaStorageType {

	App = 0,

	AppResource = 1,

	Absolute = 2
}

declare class VuforiaTrackable extends NSObject {

	static alloc(): VuforiaTrackable; // inherited from NSObject

	static getClassType(): number;

	static new(): VuforiaTrackable; // inherited from NSObject

	static trackableFromCppAsConst(cpp: interop.Pointer, asConst: boolean): VuforiaTrackable;

	cpp: interop.Pointer;

	constructor(); // inherited from NSObject

	getId(): number;

	getName(): string;

	getType(): number;

	getUserData(): interop.Pointer;

	isConst(): boolean;

	isExtendedTrackingStarted(): boolean;

	self(): VuforiaTrackable; // inherited from NSObjectProtocol

	setUserData(userData: interop.Pointer): boolean;

	startExtendedTracking(): boolean;

	stopExtendedTracking(): boolean;
}

declare class VuforiaTrackableResult extends NSObject {

	static alloc(): VuforiaTrackableResult; // inherited from NSObject

	static getClassType(): number;

	static new(): VuforiaTrackableResult; // inherited from NSObject

	static trackableResultFromCppAsConst(cpp: interop.Pointer, asConst: boolean): VuforiaTrackableResult;

	constructor(); // inherited from NSObject

	getPose(): VuforiaMatrix34;
    
    getTimeStamp(): number;

	getStatus(): VuforiaTrackableResultStatus;

	getTrackable(): VuforiaTrackable;

	getType(): number;

	isConst(): boolean;

	self(): VuforiaTrackableResult; // inherited from NSObjectProtocol
}

declare const enum VuforiaTrackableResultStatus {

	Unknown = 0,

	Undefined = 1,

	Detected = 2,

	Tracked = 3,

	ExtendedTracked = 4
}

declare class VuforiaTracker extends NSObject {

	static alloc(): VuforiaTracker; // inherited from NSObject

	static new(): VuforiaTracker; // inherited from NSObject

	constructor(); // inherited from NSObject

	self(): VuforiaTracker; // inherited from NSObjectProtocol

	start(): boolean;

	stop(): void;
}

declare class VuforiaTransformModel extends NSObject {

	static alloc(): VuforiaTransformModel; // inherited from NSObject

	static new(): VuforiaTransformModel; // inherited from NSObject

	constructor(); // inherited from NSObject

	self(): VuforiaTransformModel; // inherited from NSObjectProtocol
}

interface VuforiaVec2F {
	x: number;
	y: number;
}
declare var VuforiaVec2F: interop.StructType<VuforiaVec2F>;

interface VuforiaVec2I {
	x: number;
	y: number;
}
declare var VuforiaVec2I: interop.StructType<VuforiaVec2I>;

interface VuforiaVec3F {
	x: number;
	y: number;
	z: number;
}
declare var VuforiaVec3F: interop.StructType<VuforiaVec3F>;

interface VuforiaVec4F {
	x: number;
	y: number;
	z: number;
	w: number;
}
declare var VuforiaVec4F: interop.StructType<VuforiaVec4F>;

interface VuforiaVec4I {
	x: number;
	y: number;
	z: number;
	w: number;
}
declare var VuforiaVec4I: interop.StructType<VuforiaVec4I>;

declare var VuforiaVersionNumber: number;

declare var VuforiaVersionString: interop.Reference<number>;

interface VuforiaVideoBackgroundConfig {
	enabled: boolean;
	positionX: number;
	positionY: number;
	sizeX: number;
	sizeY: number;
	reflection: VuforiaVideoBackgroundReflection;
}
declare var VuforiaVideoBackgroundConfig: interop.StructType<VuforiaVideoBackgroundConfig>;

declare const enum VuforiaVideoBackgroundReflection {

	Default = 0,

	On = 1,

	Off = 2
}

interface VuforiaVideoMode {
	width: number;
	height: number;
	framerate: number;
}
declare var VuforiaVideoMode: interop.StructType<VuforiaVideoMode>;

declare class VuforiaVideoView extends UIView implements VuforiaGLResourceHandler {

	constructor(o: { coder: NSCoder; }); // inherited from NSCoding

	constructor(o: { frame: CGRect; }); // inherited from UIView

	finishOpenGLESCommands(): void; // inherited from VuforiaGLResourceHandler

	freeOpenGLESResources(): void; // inherited from VuforiaGLResourceHandler

	self(): VuforiaVideoView; // inherited from NSObjectProtocol
}

declare class VuforiaVideoViewController extends UIViewController implements UIAlertViewDelegate {

	eaglView: VuforiaVideoView;

	constructor(o: { coder: NSCoder; }); // inherited from NSCoding

	constructor(o: { nibName: string; bundle: NSBundle; }); // inherited from UIViewController

	alertViewCancel(alertView: UIAlertView): void; // inherited from UIAlertViewDelegate

	alertViewClickedButtonAtIndex(alertView: UIAlertView, buttonIndex: number): void; // inherited from UIAlertViewDelegate

	alertViewDidDismissWithButtonIndex(alertView: UIAlertView, buttonIndex: number): void; // inherited from UIAlertViewDelegate

	alertViewShouldEnableFirstOtherButton(alertView: UIAlertView): boolean; // inherited from UIAlertViewDelegate

	alertViewWillDismissWithButtonIndex(alertView: UIAlertView, buttonIndex: number): void; // inherited from UIAlertViewDelegate

	didPresentAlertView(alertView: UIAlertView): void; // inherited from UIAlertViewDelegate

	self(): VuforiaVideoViewController; // inherited from NSObjectProtocol

	willPresentAlertView(alertView: UIAlertView): void; // inherited from UIAlertViewDelegate
}

declare const enum VuforiaView {

	Singular = 0,

	LeftEye = 1,

	RightEye = 2,

	PostProcess = 3,

	Count = 4
}

declare class VuforiaViewList extends NSObject {

	static alloc(): VuforiaViewList; // inherited from NSObject

	static new(): VuforiaViewList; // inherited from NSObject

	constructor(); // inherited from NSObject

	contains(view: VuforiaView): boolean;

	getNumViews(): number;

	getView(idx: number): VuforiaView;

	self(): VuforiaViewList; // inherited from NSObjectProtocol
}

declare class VuforiaViewerParameters extends NSObject {

	static alloc(): VuforiaViewerParameters; // inherited from NSObject

	static new(): VuforiaViewerParameters; // inherited from NSObject

	constructor(); // inherited from NSObject

	containsMagnet(): boolean;

	getButtonType(): VuforiaViewerParamtersButtonType;

	getDistortionCoefficient(idx: number): number;

	getFieldOfView(): VuforiaVec4F;

	getInterLensDistance(): number;

	getLensCentreToTrayDistance(): number;

	getManufacturer(): string;

	getName(): string;

	getNumDistortionCoefficients(): number;

	getScreenToLensDistance(): number;

	getTrayAlignment(): VuforiaViewerParamtersTrayAlignment;

	getVersion(): number;

	self(): VuforiaViewerParameters; // inherited from NSObjectProtocol
}

declare class VuforiaViewerParametersList extends NSObject {

	static alloc(): VuforiaViewerParametersList; // inherited from NSObject

	static new(): VuforiaViewerParametersList; // inherited from NSObject

	constructor(); // inherited from NSObject

	get(idx: number): VuforiaViewerParameters;

	getNameManufacturer(name: string, manufacturer: string): VuforiaViewerParameters;

	self(): VuforiaViewerParametersList; // inherited from NSObjectProtocol

	setSDKFilter(filter: string): void;

	size(): number;
}

declare const enum VuforiaViewerParamtersButtonType {

	None = 0,

	Magnet = 1,

	FingerTouch = 2,

	ButtonTouch = 3
}

declare const enum VuforiaViewerParamtersTrayAlignment {

	Bottom = 0,

	Centre = 1,

	Top = 2
}