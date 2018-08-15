declare module io {

	export module argonjs {

		export module vuforia {

			interface IVuforiaControl {

				onInitARDone(result: number): void;
			}

			export class VuforiaControl implements io.argonjs.vuforia.IVuforiaControl {

				constructor(implementation: io.argonjs.vuforia.IVuforiaControl);

				public onInitARDone(result: number): void;
			}

			export class VuforiaGLView extends android.opengl.GLSurfaceView {

				constructor(context: android.content.Context);

				init(translucent: boolean, depth: number, stencil: number);
			}

			export class VuforiaRenderer implements android.opengl.GLSurfaceView.Renderer {

				public mIsActive: boolean;

				onSurfaceCreated(gl: any, config: android.opengl.EGLConfig);

				onSurfaceChanged(gl: any, width: number, height: number);

				onDrawFrame(gl: any);

				updateRenderingPrimitives();
			}

			export class VuforiaSession {

				static init(control: VuforiaControl): void;

				static setLicenseKey(activity: android.app.Activity, licenseKey: string);

				static scaleFactor() : number;

				static setScaleFactor(f:number) : void;
			}
		}
	}
}

declare module com {

	export module vuforia {

		export class CameraCalibration {

			constructor();

			getDistortionParameters(): Vec4F;

			getFieldOfViewRads(): Vec2F;

			getFocalLength(): Vec2F;

			getPrincipalPoint(): Vec2F;

			getSize(): Vec2F;
		}

		export class CameraDevice {

			static getInstance(): CameraDevice;

			constructor();

			init(camera: CameraDeviceDirection): boolean;
			
			deinit(): boolean;

			getCameraCalibration(): CameraCalibration;

			getCameraDirection(): CameraDeviceDirection;

			getNumVideoModes(): number;

			getVideoMode(nIndex: number): VideoMode;

			selectVideoMode(index: number): boolean;

			setFlashTorchMode(on: boolean): boolean;

			setFocusMode(focusMode: CameraDeviceFocusMode): boolean;

			start(): boolean;

			stop(): boolean;
		}

		export const enum CameraDeviceDirection {

			Default = 0,

			Back = 1,

			Front = 2
		}

		export const enum CameraDeviceFocusMode {

			Normal = 0,

			TriggerAuto = 1,

			ContinuousAuto = 2,

			Infinite = 3,

			Macro = 4
		}

		export const enum CameraDeviceMode {

			Default = -1,

			OptimizeSpeed = -2,

			OpimizeQuality = -3
		}

		export class CylinderTarget extends ObjectTarget {
		}

		export class CylinderTargetResult extends ObjectTargetResult {

			getTrackable(): Trackable;
		}

		export class DataSet {

			constructor();

			createMultiTarget(name: string): MultiTarget;

			destroy(trackable: Trackable): boolean;

			exists(path: string, storageType: StorageType): boolean;

			getNumTrackables(): number;

			getTrackable(idx: number): Trackable;

			hasReachedTrackableLimit(): boolean;

			isActive(): boolean;

			load(path: string, storageType: StorageType): boolean;
		}

		export class Device {

			static getInstance(): Device;

			constructor();

			getMode(): DeviceMode;

			getRenderingPrimitives(): RenderingPrimitives;

			getSelectedViewer(): ViewerParameters;

			getType(): number;

			getViewerList(): ViewerParametersList;

			isViewerActive(): boolean;

			selectViewer(vp: ViewerParameters): boolean;

			setConfigurationChanged(): void;

			setMode(m: DeviceMode): boolean;

			setViewerActive(active: boolean): void;
		}

		export const enum DeviceMode {

			AR = 0,

			VR = 1
		}

		export class DeviceTracker extends Tracker {

			//static deinitTracker(): boolean;

			//static getInstance(): DeviceTracker;

			//static initTracker(): boolean;
		}

		export const enum FPSHint {

			None = 0,

			NoVideoBackground = 1,

			PowerEfficiency = 2,

			Fast = 4,

			DefaultFlags = 0
		}

		export class Frame  {

			constructor();

			getImage(idx: number): Image|undefined;

			getIndex(): number;

			getNumImages(): number;

			getTimeStamp(): number;
		}

		export class HandheldTransformModel extends TransformModel {
		}

		export class HeadTransformModel extends TransformModel {
		}

		export const enum Hint {

			MaxSimultaneousImageTargets = 0,

			MaxSimultaneousObjectTargets = 1,

			DelayedLoadingObjectDatasets = 2
		}

		export class Image {

			constructor();

			getBufferHeight(): number;

			getBufferWidth(): number;

			getFormat(): PixelFormat;

			getHeight(): number;

			getPixels(): undefined; // ByteBuffer

			getStride(): number;

			getWidth(): number;
		}

		export class ImageTarget extends ObjectTarget {
		}

		export class ImageTargetResult extends ObjectTargetResult {

			getTrackable(): Trackable;
		}

		export const enum InitResult {

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

		export class Marker extends Trackable {
		}

		export class MarkerResult extends TrackableResult {

			getTrackable(): Marker;
		}

		export class Matrix34F {
			getData(): number[];
		}

		export class Matrix44F {
			getData(): number[];
		}

		export class Mesh {

			constructor();

			//getNormalCoordinates(): interop.Reference<number>;

			getNormals(): undefined; // ByteBuffer

			getNumTriangles(): number;

			getNumVertices(): number;

			//getPositionCoordinates(): interop.Reference<number>;

			getPositions(): undefined; // ByteBuffer

			getTriangles(): undefined; // ByteBuffer

			//getUVCoordinates(): interop.Reference<number>;

			getUVs(): undefined; // ByteBuffer

			hasNormals(): boolean;

			hasPositions(): boolean;

			hasUVs(): boolean;
		}

		export class MultiTarget extends ObjectTarget {
		}

		export class MultiTargetResult extends ObjectTargetResult {

			getTrackable(): Trackable;
		}

		export class ObjectTarget extends Trackable {
			getUniqueTargetId(): string;
			getSize(): Vec3F;
		}

		export class ObjectTargetResult extends TrackableResult {

			getTrackable(): Trackable;
		}

		export class ObjectTracker extends Tracker {
			
			static getClassType() : number;

			createDataSet() : DataSet;

			activateDataSet(dataset: DataSet): boolean;

			deactivateDataSet(dataset: DataSet): boolean;

			destroyDataSet(dataset: DataSet): boolean;

			getActiveDataSet(idx: number): DataSet;

			getActiveDataSetCount(): number;

			persistExtendedTracking(on: boolean): boolean;

			resetExtendedTracking(): boolean;
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

		export class Renderer {

			static getInstance(): Renderer;

			getRecommendedFps(flags: FPSHint): number;

			getVideoBackgroundConfig(): VideoBackgroundConfig;

			setTargetFps(fps: number): boolean;

			setVideoBackgroundConfig(cfg: VideoBackgroundConfig): void;
		}

		export class RenderingPrimitives {

			constructor();

			getDistortionTextureMesh(viewID: View): Mesh;

			getDistortionTextureSize(viewID: View): Vec2I;

			getDistortionTextureViewport(viewID: View): Vec4I;

			getEyeDisplayAdjustmentMatrix(viewID: View): Matrix34F;

			getNormalizedViewport(viewID: View): Vec4F;

			getProjectionMatrix(viewID: View): Matrix34F;

			getRenderingViews(): ViewList;

			getVideoBackgroundMesh(viewID: View): Mesh;

			getVideoBackgroundProjectionMatrix(viewID: View): Matrix34F;

			getViewport(viewID: View): Vec4I;
		}

		/*
		export const enum Rotation {

			IOS_90 = 128,

			IOS_180 = 256,

			IOS_270 = 512,

			IOS_0 = 1024
		}
		*/

		export class RotationalDeviceTracker extends DeviceTracker {

			//static getInstance(): RotationalDeviceTracker;

			getDefaultHandheldModel(): HandheldTransformModel;

			getDefaultHeadModel(): HeadTransformModel;

			getModelCorrection(): TransformModel;

			getPosePrediction(): boolean;

			recenter(): boolean;

			setModelCorrection(transformationmodel: TransformModel): boolean;

			setPosePrediction(enable: boolean): boolean;
		}

		export class State {

			constructor();

			getFrame(): Frame;

			getNumTrackableResults(): number;

			getNumTrackables(): number;

			getTrackable(idx: number): Trackable;

			getTrackableResult(idx: number): TrackableResult;
		}

		export const enum StorageType {

			App = 0,

			AppResource = 1,

			Absolute = 2
		}

		export class Tool {

			static convertPerspectiveProjection2GLMatrix(projection: Matrix34F, nearPlane: number, farPlane: number): Matrix44F;

			static convertPose2GLMatrix(pose: Matrix34F);
		}

		export class Trackable {

			static getClassType(): number;

			constructor();

			getId(): number;

			getName(): string;

			getType(): number;

			getUserData(): Object;

			isConst(): boolean;

			isExtendedTrackingStarted(): boolean;

			setUserData(userData: interop.Pointer): boolean;

			startExtendedTracking(): boolean;

			stopExtendedTracking(): boolean;
		}

		export class TrackableResult {

			static getClassType(): number;

			constructor();

			getPose(): Matrix34F;
			
			getTimeStamp(): number;

			getStatus(): TrackableResultStatus;

			getTrackable(): Trackable;

			getType(): number;
		}

		export const enum TrackableResultStatus {

			Unknown = 0,

			Undefined = 1,

			Detected = 2,

			Tracked = 3,

			ExtendedTracked = 4
		}

		export class Tracker {

			constructor();

			start(): boolean;

			stop(): void;
		}

		export class TrackerManager {

			static getInstance(): TrackerManager;

			initTracker(type: number): Tracker;

			getTracker(type: number): Tracker;

			deinitTracker(type: number): boolean;
		}

		export class TransformModel {

			constructor();
		}

		export class Vec2F {
			constructor(v0: number, v1: number);
			getData(): number[];
		}

		export class Vec2I {
			constructor(v0: number, v1: number);
			getData(): number[];
		}

		export class Vec3F {
			constructor(v0: number, v1: number, v2: number);
			getData(): number[];
		}

		export class Vec4F {
			constructor(v0: number, v1: number, v2: number, v3: number);
			getData(): number[];
		}

		export class Vec4I {
			constructor(v0: number, v1: number, v2: number, v3: number);
			getData(): number[];
		}

		export module Vuforia {

			interface IUpdateCallbackInterface {
				
				Vuforia_onUpdate(state: State);
			}

			class UpdateCallbackInterface implements com.vuforia.Vuforia.IUpdateCallbackInterface {
				
				constructor(implementation: com.vuforia.Vuforia.IUpdateCallbackInterface);

				public Vuforia_onUpdate(state: State);
			}
		}

		export class Vuforia {

			static getLibraryVersion(): string;

			static deinit();

			static onPause();

			static onResume();

			static onSurfaceCreated();

			static onSurfaceChanged(width: number, height: number);
			
			static registerCallback(object: Vuforia.UpdateCallbackInterface);

			static requiresAlpha(): boolean;

			static setHint(hint: number, value: number): boolean;
		}

		export class VideoBackgroundConfig {

			getEnabled(): boolean;

			getPosition(): Vec2I;

			getSize(): Vec2I;
			
			getReflection(): VideoBackgroundReflection;

			setEnabled(value: boolean);

			setPosition(value: Vec2I);

			setSize(value: Vec2I);

			setReflection(value: VideoBackgroundReflection);
		}

		export const enum VideoBackgroundReflection {

			Default = 0,

			On = 1,

			Off = 2
		}

		export class VideoMode {

			getWidth(): number;

			getHeight(): number;

			getFramerate(): number;
		}

		export const enum View {

			Singular = 0,

			LeftEye = 1,

			RightEye = 2,

			PostProcess = 3,

			Count = 4
		}

		export class ViewList {

			constructor();

			contains(view: View): boolean;

			getNumViews(): number;

			getView(idx: number): View;
		}

		export class ViewerParameters {

			constructor();

			containsMagnet(): boolean;

			getButtonType(): ViewerParamtersButtonType;

			getDistortionCoefficient(idx: number): number;

			getFieldOfView(): Vec4F;

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

			constructor();

			get(idx: number): ViewerParameters;

			get(name: string, manufacturer: string): ViewerParameters;

			setSDKFilter(filter: string): void;

			size(): number;
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

		export class Word extends Trackable {
		}

		export class WordResult extends TrackableResult {

			getTrackable(): Trackable;
		}
	}
}