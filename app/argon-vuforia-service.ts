
import * as uri from 'urijs';
import * as application from 'application';
import * as frames from 'ui/frame';
import * as Argon from 'argon';
import * as vuforia from 'nativescript-vuforia';
import * as http from 'http';
import * as file from 'file-system';
import * as platform from 'platform';

import {getInterfaceOrientation} from './argon-device-service'

export const VIDEO_DELAY = -0.5/60;

const Matrix3 = Argon.Cesium.Matrix3;
const Matrix4 = Argon.Cesium.Matrix4;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const JulianDate = Argon.Cesium.JulianDate;
const CesiumMath = Argon.Cesium.CesiumMath;

const zNeg90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -CesiumMath.PI_OVER_TWO);
const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
const y180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI);
const x180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI);

const ONE = new Cartesian3(1,1,1);

const cameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.OpimizeQuality;
if (vuforia.videoView.ios) {
    (<UIView>vuforia.videoView.ios).contentScaleFactor = cameraDeviceMode === vuforia.CameraDeviceMode.OptimizeSpeed ? 
        1 : platform.screen.mainScreen.scale;
}

@Argon.DI.inject(Argon.DeviceService, Argon.ContextService)
export class NativescriptVuforiaServiceDelegate extends Argon.VuforiaServiceDelegateBase {
        
    private scratchDate = new Argon.Cesium.JulianDate();
    private scratchCartesian = new Argon.Cesium.Cartesian3();
    private scratchCartesian2 = new Argon.Cesium.Cartesian3();
    private scratchQuaternion = new Argon.Cesium.Quaternion();
	private scratchMatrix4 = new Argon.Cesium.Matrix4();
	private scratchMatrix3 = new Argon.Cesium.Matrix3();
    
    private vuforiaTrackerEntity = new Argon.Cesium.Entity({
        position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.deviceService.orientationEntity),
        orientation: new Argon.Cesium.ConstantProperty(Quaternion.multiply(z90,y180,<any>{}))
    });
	
	constructor(private deviceService:Argon.DeviceService, private contextService:Argon.ContextService) {
        super();
        
        if (!vuforia.api) return;
        
        const stateUpdateCallback = (state:vuforia.State) => { 
            
            const time = JulianDate.now();
            // subtract a few ms, since the video frame represents a time slightly in the past.
            // TODO: if we are using an optical see-through display, like hololens,
            // we want to do the opposite, and do forward prediction (though ideally not here, 
            // but in each app itself to we are as close as possible to the actual render time when
            // we start the render)
            JulianDate.addSeconds(time, VIDEO_DELAY, time);
            
            deviceService.update();
            
            const vuforiaFrame = state.getFrame();
            const index = vuforiaFrame.getIndex();
            const frameTimeStamp = vuforiaFrame.getTimeStamp();
                        
            // update trackable results in context entity collection
            const numTrackableResults = state.getNumTrackableResults();
            for (let i=0; i < numTrackableResults; i++) {
                const trackableResult = state.getTrackableResult(i);
                const trackable = trackableResult.getTrackable();
                const name = trackable.getName();
                
                const id = this._getIdForTrackable(trackable);
                let entity = contextService.subscribedEntities.getById(id);
                
                if (!entity) {
                    entity = new Argon.Cesium.Entity({
                        id,
                        name,
                        position: new Argon.Cesium.SampledPositionProperty(this.vuforiaTrackerEntity),
                        orientation: new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion)
                    });
                    entity.position.maxNumSamples = 10;
                    entity.orientation.maxNumSamples = 10;
                    entity.position.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entity.orientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entity.position.forwardExtrapolationDuration = 2/60;
                    entity.orientation.forwardExtrapolationDuration = 2/60;
                    contextService.subscribedEntities.add(entity);
                }
                
                const trackableTime = JulianDate.clone(time); 
                
                // add any time diff from vuforia
                const trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
                if (trackableTimeDiff !== 0) JulianDate.addSeconds(time, trackableTimeDiff, trackableTime);
                
                const pose = trackableResult.getPose();
                const position = Matrix4.getTranslation(pose, this.scratchCartesian);
                const rotationMatrix = Matrix4.getRotation(pose, this.scratchMatrix3);
                const orientation = Quaternion.fromRotationMatrix(rotationMatrix, this.scratchQuaternion);
                
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation);
            }
            
            // if no one is listening, don't bother calculating the view state or raising an event. 
            // (this can happen when the vuforia video reality is not the current reality, though
            // we still want to update the trackables above in case an app is depending on them)
            if (this.stateUpdateEvent.numberOfListeners === 0) return;
            
            const device = vuforia.api.getDevice();
            const renderingPrimitives = device.getRenderingPrimitives();
            const renderingViews = renderingPrimitives.getRenderingViews();
            const numViews = renderingViews.getNumViews()
            
            const subviews = <Array<Argon.SerializedSubview>>[];
            const contentScaleFactor = (<UIView>vuforia.videoView.ios).contentScaleFactor;
            
            for (let i=0; i < numViews; i++) {
                const view = renderingViews.getView(i);
                if (view === vuforia.View.PostProcess) continue;
                
                let type:Argon.SubviewType;
                switch (view) {
                    case vuforia.View.LeftEye: 
                        type = Argon.SubviewType.LEFTEYE; break;
                    case vuforia.View.RightEye:
                        type = Argon.SubviewType.RIGHTEYE; break;
                    case vuforia.View.Singular: 
                        type = Argon.SubviewType.SINGULAR; break;
                    default:
                        type = Argon.SubviewType.OTHER; break;
                }
                
                // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
                // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
                let projectionMatrix = <any>renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);
                
                // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
                
                // Undo the video rotation since we already encode the interface orientation in our view pose
                // Note: the "base" rotation vuforia's video (at least on iOS) is the landscape right orientation,
                // this is the orientation where the device is held in landscape with the home button on the right. 
                // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
                // So, we want to undo this rotation which vuforia applies for us.  
                // TODO: calculate this matrix only when we have to (when the interface orientation changes)
                const inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(
                    Cartesian3.ZERO,
                    Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + getInterfaceOrientation()*Math.PI/180), this.scratchQuaternion),
                    ONE,
                    this.scratchMatrix4
                );
                Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);
                
                // convert from the vuforia projection matrix (+X -Y +X) to a more standard convention (+X +Y -Z)
                // by negating the appropriate rows. 
                // See https://developer.vuforia.com/library/articles/Solution/How-To-Use-the-Camera-Projection-Matrix

                // flip y axis so it is positive
                projectionMatrix[4] *= -1; // x
                projectionMatrix[5] *= -1; // y
                projectionMatrix[6] *= -1; // z
                projectionMatrix[7] *= -1; // w
                // flip z axis so it is negative
                projectionMatrix[8] *= -1;  // x
                projectionMatrix[9] *= -1;  // y
                projectionMatrix[10] *= -1; // z
                projectionMatrix[11] *= -1; // w
                
                if (vuforia.videoView.ios && device.isViewerActive()) {
                    // TODO: move getSceneScaleFactor to javascript so we can customize it more easily and 
                    // then provide a means of passing an arbitrary scale factor to the video renderer.
                    // We can then provide controls to zoom in/out the video reality using this scale factor. 
                    var sceneScaleFactor = vuforia.videoView.ios.getSceneScaleFactor();
                    // scale x-axis
                    projectionMatrix[0] *= sceneScaleFactor; // x
                    projectionMatrix[1] *= sceneScaleFactor; // y
                    projectionMatrix[2] *= sceneScaleFactor; // z
                    projectionMatrix[3] *= sceneScaleFactor; // w
                    // scale y-axis
                    projectionMatrix[4] *= sceneScaleFactor; // x
                    projectionMatrix[5] *= sceneScaleFactor; // y
                    projectionMatrix[6] *= sceneScaleFactor; // z
                    projectionMatrix[7] *= sceneScaleFactor; // w
                }
                
                const viewport = renderingPrimitives.getViewport(view);
                
                subviews.push({
                    type,
                    projectionMatrix,
                    viewport: {
                        x: Math.round(viewport.x / contentScaleFactor),
                        y: Math.round(viewport.y / contentScaleFactor),
                        width: Math.round(viewport.z / contentScaleFactor),
                        height: Math.round(viewport.w / contentScaleFactor)
                    }
                });
            }
            
            // We expect the video view (managed by the browser view) to be the 
            // same size as the current page's content view.
            const contentView = frames.topmost().currentPage.content;
            
            // construct the final view parameters for this frame
            const view:Argon.SerializedViewParameters = {
                viewport: {
                    x:0,
                    y:0,
                    width: contentView.getMeasuredWidth(),
                    height: contentView.getMeasuredHeight()
                },
                pose: Argon.getSerializedEntityPose(this.deviceService.interfaceEntity, time),
                subviews
            }
            
            // raise the event to let the vuforia service know we are ready!
            this.stateUpdateEvent.raiseEvent({
                index,
                time,
                view
            });
            
            vuforia.api.onNextStateUpdate(stateUpdateCallback);
        };
        
        vuforia.api.onNextStateUpdate(stateUpdateCallback);
	}
    
    _getIdForTrackable(trackable:vuforia.Trackable) : string {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        } else {
            return 'vuforia_trackable_' + trackable.getId();
        }
    }
    
    private _viewerEnabled = false;
    private _videoEnabled = true;
    private _trackingEnabled = true;
    
    get viewerEnabled() {
        return this._viewerEnabled;
    }
    
    set viewerEnabled(enabled) {
        this._viewerEnabled = enabled;
        const device = vuforia.api.getDevice();
        if (device) device.setViewerActive(enabled);
    }
    
    get videoEnabled() {
        return this._videoEnabled;
    }
    
    set videoEnabled(value:boolean) {
        this._videoEnabled = value;
        this._configureCameraAndTrackers();
    }
    
    get trackingEnabled() {
        return this._trackingEnabled;
    }
    
    set trackingEnabled(value:boolean) {
        this._trackingEnabled = value;
        this._configureCameraAndTrackers();
    }
    
    _configureCameraAndTrackers() {
        if (this.trackingEnabled) {
            if (this.cameraDeviceStart()) {
                this.objectTrackerStart() 
            }
        } else {
            this.objectTrackerStop();
            if (this.videoEnabled) {
                this.cameraDeviceStart()
            } else {
                this.cameraDeviceStop();
            }
        }
    }
    
    isAvailable() {
        return !!vuforia.api;
    }
    
    setHint(hint: Argon.VuforiaHint, value: number): boolean {
        return vuforia.api.setHint(<number>hint, value);
    }
    
    init(options: Argon.VuforiaInitOptions): Promise<Argon.VuforiaInitResult> {
        let licenseKey;
        if (options.licenseKey) {
            licenseKey = options.licenseKey;
        } else if (options.encryptedLicenseData) {
            // decrypt
        } else {
            return Promise.reject(new Error("License key must be provided"));
        }
        
        if (!vuforia.api.setLicenseKey(licenseKey)) {
            return Promise.reject(new Error("Unable to set the license key"))
        }
        
        console.log("Vuforia initializing...")
        return vuforia.api.init().then((result)=>{
            console.log("Vuforia Init Result: " + result);
            return <number>result;
        });
    }
    
    deinit(): void {            
        console.log("Vuforia deinitializing");
        vuforia.api.deinitObjectTracker();
        vuforia.api.getCameraDevice().stop();
        vuforia.api.getCameraDevice().deinit();
        vuforia.api.deinit();
    }
    
    cameraDeviceInitAndStart(): boolean {        
        const cameraDevice = vuforia.api.getCameraDevice();

        console.log("Vuforia initializing camera device");
        if (!cameraDevice.init(vuforia.CameraDeviceDirection.Default))
            return false;
            
        if (!cameraDevice.selectVideoMode(cameraDeviceMode))
            return false;
            
        const device = vuforia.api.getDevice();
        device.setMode(vuforia.DeviceMode.AR);
        if (this.viewerEnabled) {
            device.setViewerActive(true);
        }
            
        configureVideoBackground(this.videoEnabled);
        this._configureCameraAndTrackers();
        return true;
    }
    
    cameraDeviceStop(): boolean {
        return vuforia.api.getCameraDevice().stop();
    }
    
    cameraDeviceStart(): boolean {
        return vuforia.api.getCameraDevice().start();
    }
    
    cameraDeviceSetFlashTorchMode(on: boolean): boolean {
        return vuforia.api.getCameraDevice().setFlashTorchMode(on);
    }
    
    objectTrackerInit(): boolean {        
        console.log("Vuforia initializing object tracker");
        return vuforia.api.initObjectTracker();
    }
    
    objectTrackerStart(): boolean {        
        console.log("Vuforia starting object tracker");
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) return objectTracker.start();
        return false;
    }
    
    objectTrackerStop(): boolean {        
        console.log("Vuforia stopping object tracker");
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            objectTracker.stop();
            return true;
        }
        return false;
    }
    
    private idDataSetMap = new Map<string, vuforia.DataSet>();
    private dataSetUrlMap = new WeakMap<vuforia.DataSet, string>();
    
    objectTrackerCreateDataSet(url?: string): string {        
        console.log("Vuforia creating dataset...");
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            const dataSet = objectTracker.createDataSet();
            if (dataSet != null) {
                const id = Argon.Cesium.createGuid();
                this.idDataSetMap.set(id, dataSet);
                this.dataSetUrlMap.set(dataSet, url);
                console.log(`Vuforia created dataset (${id})`);
                return id;
            }
        }
        return null;
    }
    
    objectTrackerDestroyDataSet(id: string): boolean {       
        console.log(`Vuforia destroying dataset (${id})`);
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            const dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                const deleted = objectTracker.destroyDataSet(dataSet);
                if (deleted) this.idDataSetMap.delete(id);
                return deleted;
            }
        }
        return false;
    }
    
    objectTrackerActivateDataSet(id: string): boolean {
        console.log(`Vuforia activating dataset (${id})`);
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            const dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                return objectTracker.activateDataSet(dataSet);
            }
        }
        return false;
    }
    
    objectTrackerDeactivateDataSet(id: string): boolean {        
        console.log(`Vuforia deactivating dataset (${id})`);
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            const dataSet = this.idDataSetMap.get(id);
            if (dataSet != null) {
                return objectTracker.deactivateDataSet(dataSet);
            }
        }
        return false;
    }
    
    dataSetFetch(id: string): Promise<void> {
        const dataSet = this.idDataSetMap.get(id);
        const url = this.dataSetUrlMap.get(dataSet);
        if (url) {
            console.log(`Vuforia fetching dataset (${id}) at ${url}`);
            return _getDataSetLocation(url).then(()=>{});
        }
        return Promise.reject("Dataset is not associated with a url");
    }
    
    dataSetLoad(id: string): Promise<Argon.VuforiaTrackables> {
        const dataSet = this.idDataSetMap.get(id);
        const url = this.dataSetUrlMap.get(dataSet);
        if (url) {
            console.log(`Vuforia loading dataset (${id}) at ${url}`);
            return _getDataSetLocation(url).then((location)=>{
                if (dataSet.load(location, vuforia.StorageType.Absolute)) {
                    const numTrackables = dataSet.getNumTrackables();
                    const trackables:Argon.VuforiaTrackables = {};
                    for (let i=0; i < numTrackables; i++) {
                        const trackable = dataSet.getTrackable(i);
                        trackables[trackable.getName()] = {
                            id: this._getIdForTrackable(trackable),
                            size: trackable instanceof vuforia.ObjectTarget ? trackable.getSize() : {x:0,y:0,z:0}
                        }
                    }
                    console.log("Vuforia loaded dataset file with trackables:\n" + JSON.stringify(trackables));
                    return trackables;
                } else {
                    console.log(`Unable to load downloaded dataset at ${location} from ${url}`);
                    return Promise.reject("Unable to load dataset");
                }
            })
        }
        return Promise.reject("Dataset is not associated with a url");
    }
}

function configureVideoBackground(enabled=true) {
    const frame = frames.topmost();
    const viewWidth = frame.getMeasuredWidth();
    const viewHeight = frame.getMeasuredHeight();
    const contentScaleFactor = vuforia.videoView.ios ? vuforia.videoView.ios.contentScaleFactor : 1;
    
    const videoMode = vuforia.api.getCameraDevice().getVideoMode(cameraDeviceMode);
    let videoWidth = videoMode.width;
    let videoHeight = videoMode.height;
    
    const orientation = getInterfaceOrientation();
    if (orientation === 0 || orientation === 180) {
        videoWidth = videoMode.height;
        videoHeight = videoMode.width;
    }
    
    let scale:number;
    // aspect fill
    scale = Math.max(viewWidth / videoWidth, viewHeight / videoHeight);
    // aspect fit
    // scale = Math.min(viewWidth / videoWidth, viewHeight / videoHeight);
    
    const config = {
        enabled,
        positionX:0,
        positionY:0,
        sizeX: Math.round(videoWidth * scale * contentScaleFactor),
        sizeY: Math.round(videoHeight * scale * contentScaleFactor),
        reflection: vuforia.VideoBackgroundReflection.Default
    }
    
    console.log(`Vuforia configuring video background...
        contentScaleFactor: ${contentScaleFactor} orientation: ${orientation} 
        viewWidth: ${viewWidth} viewHeight: ${viewHeight} videoWidth: ${videoWidth} videoHeight: ${videoHeight} 
        config: ${JSON.stringify(config)}
    `);
    
    vuforia.api.getRenderer().setVideoBackgroundConfig(config)
}

if (vuforia.api) application.on(application.orientationChangedEvent, ()=>{
    Promise.resolve().then(configureVideoBackground); // delay callback until the interface orientation is updated
})

// TODO: make this cross platform somehow
export function _getDataSetLocation(xmlUrlString:string) : Promise<string> {
    const xmlUrl = NSURL.URLWithString(xmlUrlString);
    const datUrl = xmlUrl.URLByDeletingPathExtension.URLByAppendingPathExtension("dat");
    
    const directoryPathUrl = xmlUrl.URLByDeletingLastPathComponent;
    const directoryHash = directoryPathUrl.hash;
    const tmpPath = file.knownFolders.temp().path;
    const directoryHashPath = tmpPath + file.path.separator + directoryHash;
    
    file.Folder.fromPath(directoryHashPath);
    
    const xmlDestPath = directoryHashPath + file.path.separator + xmlUrl.lastPathComponent;
    const datDestPath = directoryHashPath + file.path.separator + datUrl.lastPathComponent;
    
    function downloadIfNeeded(url:string, destPath:string) {
        let lastModified:Date;
        if (file.File.exists(destPath)) {
            const f = file.File.fromPath(destPath);
            lastModified = f.lastModified;
        }
        return http.request({
            url,
            method:'GET',
            headers: lastModified ? {
                'If-Modified-Since': lastModified.toUTCString()
            } : undefined
        }).then((response)=>{
            if (response.statusCode === 304) {
                console.log(`Verified that cached version of file ${url} at ${destPath} is up-to-date.`)
                return destPath;
            } else if (response.statusCode >= 200 && response.statusCode < 300) {                
                console.log(`Downloaded file ${url} to ${destPath}`)
                return response.content.toFile(destPath).path;
            } else {
                throw new Error("Unable to download file " + url + "  (HTTP status code: " + response.statusCode + ")");
            }
        })
    }
    
    return Promise.all([
        downloadIfNeeded(xmlUrl.absoluteString,xmlDestPath), 
        downloadIfNeeded(datUrl.absoluteString,datDestPath)
    ]).then(()=>xmlDestPath);
} 