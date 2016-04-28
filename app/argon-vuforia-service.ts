
import * as uri from 'urijs';
import * as application from 'application';
import * as frames from 'ui/frame';
import * as Argon from 'argon';
import * as vuforia from 'nativescript-vuforia';
import * as http from 'http';
import * as file from 'file-system';
import * as platform from 'platform';

import {getInterfaceOrientation} from './argon-device-service'

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

if (vuforia.ios) {
    (<UIView>vuforia.ios).contentScaleFactor = platform.screen.mainScreen.scale;
}

export const vuforiaTrackerEntity = new Argon.Cesium.Entity({
    position: new Argon.Cesium.ConstantPositionProperty(),
    orientation: new Argon.Cesium.ConstantProperty()
});

const cameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.Default;

@Argon.DI.inject(Argon.DeviceService, Argon.ContextService)
export class NativescriptVuforiaServiceDelegate extends Argon.VuforiaServiceDelegateBase {
    
    public stateUpdateEvent = new Argon.Event<Argon.SerializedFrameState>();
    
    private scratchDate = new Argon.Cesium.JulianDate();
    private scratchCartesian = new Argon.Cesium.Cartesian3();
    private scratchCartesian2 = new Argon.Cesium.Cartesian3();
    private scratchQuaternion = new Argon.Cesium.Quaternion();
	private scratchMatrix4 = new Argon.Cesium.Matrix4();
	private scratchMatrix3 = new Argon.Cesium.Matrix3();
	
	constructor(private deviceService:Argon.DeviceService, private contextService:Argon.ContextService) {
        super();
        
        vuforiaTrackerEntity.position.setValue({x:0,y:0,z:0}, deviceService.entity);
        // vuforiaTrackerEntity.orientation.setValue(Quaternion.multiply(zNeg90,yNeg180,<any>{}));
        // vuforiaTrackerEntity.orientation.setValue(yNeg180,<any>{});
        // vuforiaTrackerEntity.orientation.setValue(z90,<any>{});
        vuforiaTrackerEntity.orientation.setValue(Quaternion.IDENTITY);
        this.contextService.entities.add(vuforiaTrackerEntity);
        
        const stateUpdateCallback = (state:vuforia.State) => {
            
            deviceService.update();
            
            const vuforiaFrame = state.getFrame();
            const frameNumber = vuforiaFrame.getIndex();
            const frameTimeStamp = vuforiaFrame.getTimeStamp();
            const time = JulianDate.now();
            
            // update trackable results in context entity collection
            const numTrackableResults = state.getNumTrackableResults();
            for (let i=0; i < numTrackableResults; i++) {
                const trackableResult = state.getTrackableResult(i);
                const trackable = trackableResult.getTrackable();
                const name = trackable.getName();
                
                let id = this._getIdForTrackable(trackable);
                
                let entity = contextService.entities.getById(id);
                
                if (!entity) {
                    entity = new Argon.Cesium.Entity({
                        id,
                        name,
                        position: new Argon.Cesium.SampledPositionProperty(vuforiaTrackerEntity),
                        orientation: new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion)
                    });
                    contextService.entities.add(entity);
                }
                
                const trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
                const trackableTime = trackableTimeDiff === 0 ? time : JulianDate.addSeconds(time, trackableTimeDiff, {});
                
                // get the position and orientation from the trackable pose (a row-major matrix)
                const pose = trackableResult.getPose();
                
                const position = Matrix4.getTranslation(pose, this.scratchCartesian);
                const rotationMatrix = Matrix4.getRotation(pose, this.scratchMatrix3);
                const orientation = Quaternion.fromRotationMatrix(rotationMatrix, this.scratchQuaternion);
                
                // NOTE: WE DON"T KNOW WHY THIS WORKS
                var px = position.x;
                position.x = position.y;
                position.y = px;
                
                var ox = orientation.x;
                orientation.x = -orientation.y;
                orientation.y = -ox;    
                orientation.z = -orientation.z;
                
                
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation);
                
                console.log(JSON.stringify(Argon.getEntityPositionInReferenceFrame(entity, time, deviceService.entity, {})));
                console.log(JSON.stringify(Argon.getEntityOrientationInReferenceFrame(entity, time, deviceService.entity, {})));
            }
            
            const device = vuforia.api.getDevice();
            const renderingPrimitives = device.getRenderingPrimitives();
            const renderingViews = renderingPrimitives.getRenderingViews();
            const numViews = renderingViews.getNumViews()
            
            const subviews = <Array<Argon.SerializedSubview>>[];
            const contentScaleFactor = (<UIView>vuforia.ios).contentScaleFactor;
            
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
                
                // Note: Vuforia provides a weird projection matrix with x and y rows reversed. Not sure why. :P
                // if we can find documentation / explanation of this somewhere we should put a link here.
                let projectionMatrix = <any>renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);
                const xColumn = Argon.Cesium.Matrix4.getColumn(projectionMatrix, 0, this.scratchCartesian);
                const yColumn = Argon.Cesium.Matrix4.getColumn(projectionMatrix, 1, this.scratchCartesian2);
                
                if (vuforia.ios && device.isViewerActive()) {
                    // TODO: move getSceneScaleFactor to javascript so we can customize it more easily and 
                    // then provide a means of passing an arbitrary scale factor to the video renderer.
                    // We can then provide controls to zoom in/out the video reality using this scale factor. 
                    var sceneScaleFactor = vuforia.ios.getSceneScaleFactor();
                    Argon.Cesium.Cartesian4.multiplyByScalar(xColumn, sceneScaleFactor, xColumn);
                    Argon.Cesium.Cartesian4.multiplyByScalar(yColumn, sceneScaleFactor, yColumn);
                }
                
                Argon.Cesium.Matrix4.setColumn(projectionMatrix, 0, yColumn, projectionMatrix);
                Argon.Cesium.Matrix4.setColumn(projectionMatrix, 1, xColumn, projectionMatrix);
                
                // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);
                
                const viewport = renderingPrimitives.getViewport(view);
                
                subviews.push({
                    type,
                    projectionMatrix,
                    viewport: {
                        x: viewport.x / contentScaleFactor,
                        y: viewport.y / contentScaleFactor,
                        width: viewport.z / contentScaleFactor,
                        height: viewport.w / contentScaleFactor
                    }
                });
            }
            
            const contentView = frames.topmost().currentPage.content;
            
            const view:Argon.SerializedViewParameters = {
                viewport: {
                    x:0,
                    y:0,
                    width: contentView.getMeasuredWidth(),
                    height: contentView.getMeasuredHeight()
                },
                pose: Argon.getSerializedEntityPose(deviceService.entity, time),
                subviews
            }
            
            this.stateUpdateEvent.raiseEvent({
                frameNumber,
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
    
    isViewerEnabled() {
        return this._viewerEnabled;
    }
    
    setViewerEnabled(enabled) {
        this._viewerEnabled = enabled;
        const device = vuforia.api.getDevice();
        if (device) device.setViewerActive(enabled);
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
            
        vuforia.api.getDevice().setMode(vuforia.DeviceMode.AR);
        this.setViewerEnabled(this._viewerEnabled);
            
        configureVideoBackground();
                
        console.log("Vuforia starting camera device");
        return cameraDevice.start();
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

function configureVideoBackground() {
    const frame = frames.topmost();
    const viewWidth = frame.getMeasuredWidth();
    const viewHeight = frame.getMeasuredHeight();
    const contentScaleFactor = vuforia.ios ? vuforia.ios.contentScaleFactor : 1;
    
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
        enabled:true,
        positionX:0,
        positionY:0,
        sizeX: Math.round(videoWidth * scale * contentScaleFactor),
        sizeY: Math.round(videoHeight * scale * contentScaleFactor),
        reflection: vuforia.VideoBackgroundReflection.Default
    }
    
    console.log(`Vuforia configuring video background...
        viewWidth: ${viewWidth} 
        viewHeight: ${viewHeight} 
        contentScaleFactor: ${contentScaleFactor}
        videoWidth: ${videoWidth} 
        videoHeight: ${videoHeight} 
        orientation: ${orientation} 
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