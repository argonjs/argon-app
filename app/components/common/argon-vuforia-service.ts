
import * as Argon from '@argonjs/argon';
import * as vuforia from 'nativescript-vuforia';
import * as http from 'http';
import * as file from 'file-system';
import {NativescriptRealityService} from './argon-reality-service';
import {NativescriptDeviceService, vuforiaCameraDeviceMode} from './argon-device-service';
import {Util} from './util'
import * as minimatch from 'minimatch'

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

interface VuforiaLicenseData {
    key?: string
    origins?:string[]
}

@Argon.DI.inject(
    Argon.DeviceService, 
    Argon.RealityService, 
    Argon.ContextService, 
    Argon.ViewService)
export class NativescriptVuforiaServiceDelegate extends Argon.VuforiaServiceDelegateBase {
        
    private scratchDate = new Argon.Cesium.JulianDate(0,0);
    private scratchCartesian = new Argon.Cesium.Cartesian3();
    private scratchCartesian2 = new Argon.Cesium.Cartesian3();
    private scratchQuaternion = new Argon.Cesium.Quaternion();
	private scratchMatrix4 = new Argon.Cesium.Matrix4();
	private scratchMatrix3 = new Argon.Cesium.Matrix3();
    
    private vuforiaTrackerEntity = new Argon.Cesium.Entity({
        position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.deviceService.orientationEntity),
        orientation: new Argon.Cesium.ConstantProperty(Quaternion.multiply(z90,y180,<any>{}))
    });
	
	constructor(
        private deviceService:NativescriptDeviceService, 
        private realityService:NativescriptRealityService,
        private contextService:Argon.ContextService,
        private viewService:Argon.ViewService) {
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
            
            deviceService.update({orientation:true});
            
            const vuforiaFrame = state.getFrame();
            const index = vuforiaFrame.getIndex();
            const frameTimeStamp = vuforiaFrame.getTimeStamp();
                        
            // update trackable results in context entity collection
            const numTrackableResults = state.getNumTrackableResults();
            for (let i=0; i < numTrackableResults; i++) {
                const trackableResult = <vuforia.TrackableResult>state.getTrackableResult(i);
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
                    const entityPosition = entity.position as Argon.Cesium.SampledPositionProperty;
                    const entityOrientation = entity.orientation as Argon.Cesium.SampledProperty;
                    entityPosition.maxNumSamples = 10;
                    entityOrientation.maxNumSamples = 10;
                    entityPosition.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entityOrientation.forwardExtrapolationType = Argon.Cesium.ExtrapolationType.HOLD;
                    entityPosition.forwardExtrapolationDuration = 2/60;
                    entityOrientation.forwardExtrapolationDuration = 2/60;
                    contextService.subscribedEntities.add(entity);
                }
                
                const trackableTime = JulianDate.clone(time); 
                
                // add any time diff from vuforia
                const trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
                if (trackableTimeDiff !== 0) JulianDate.addSeconds(time, trackableTimeDiff, trackableTime);
                
                const pose = <Argon.Cesium.Matrix4><any>trackableResult.getPose();
                const position = Matrix4.getTranslation(pose, this.scratchCartesian);
                const rotationMatrix = Matrix4.getRotation(pose, this.scratchMatrix3);
                const orientation = Quaternion.fromRotationMatrix(rotationMatrix, this.scratchQuaternion);
                
                (entity.position as Argon.Cesium.SampledPositionProperty).addSample(trackableTime, position);
                (entity.orientation as Argon.Cesium.SampledProperty).addSample(trackableTime, orientation);
            }
            
            // if no one is listening, don't bother calculating the view state or raising an event. 
            // (this can happen when the vuforia video reality is not the current reality, though
            // we still want to update the trackables above in case an app is depending on them)
            if (this.stateUpdateEvent.numberOfListeners === 0) return;
            
            const pose = Argon.getSerializedEntityPose(this.deviceService.displayEntity, time)
            
            // raise the event to let the vuforia service know we are ready!
            this.stateUpdateEvent.raiseEvent({
                index,
                time,
                eye: {
                    pose,
                }
            });
        };
        
        vuforia.api.setStateUpdateCallback(stateUpdateCallback);
	}

    public getCameraFieldOfViewRads() {
        const cameraDevice = vuforia.api.getCameraDevice();
        const cameraCalibration = cameraDevice.getCameraCalibration();
        return Argon.Cesium.defined(cameraCalibration) ?
            cameraCalibration.getFieldOfViewRads() : undefined;
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
        this.deviceService.updateDeviceState();
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
        if (!vuforia.api) return;
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

    decryptLicenseKey(encryptedLicenseData:string, session:Argon.SessionPort) : Promise<string> {
        return Util.decrypt(encryptedLicenseData.trim()).then((json)=>{
            const {key,origins} : {key:string,origins:string[]} = JSON.parse(json);
            if (!session.uri) throw new Error('Invalid origin');

            const origin = Argon.URI.parse(session.uri);
            if (!Array.isArray(<any>origins)) {
                throw new Error("Vuforia License Data must specify allowed origins");
            }

            const match = origins.find((o) => {
                const parts = o.split(/\/(.*)/);
                let domainPattern = parts[0];
                let pathPattern = parts[1] || '**';
                return minimatch(origin.hostname, domainPattern) && minimatch(origin.path, pathPattern);
            })

            if (!match) {
                throw new Error('Invalid origin');
            }

            return key;
        });
    }
    
    init(options: Argon.VuforiaServiceDelegateInitOptions): Promise<Argon.VuforiaInitResult> {
        if (!vuforia.api.setLicenseKey(options.key)) {
            return Promise.reject(new Error("Unable to set the license key"));
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
            
        if (!cameraDevice.selectVideoMode(vuforiaCameraDeviceMode))
            return false;
            
        const device = vuforia.api.getDevice();
        device.setMode(vuforia.DeviceMode.AR);
        if (this.viewerEnabled) {
            device.setViewerActive(true);
        }
            
        this.deviceService.configureVuforiaVideoBackground();
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
    private dataSetUrlMap = new WeakMap<vuforia.DataSet|undefined, string|undefined>();
    
    objectTrackerCreateDataSet(url?: string): string|undefined {        
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
        return undefined;
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
        if (dataSet && url) {
            console.log(`Vuforia loading dataset (${id}) at ${url}`);
            return _getDataSetLocation(url).then<Argon.VuforiaTrackables>((location)=>{
                if (dataSet.load(location, vuforia.StorageType.Absolute)) {
                    const numTrackables = dataSet.getNumTrackables();
                    const trackables:Argon.VuforiaTrackables = {};
                    for (let i=0; i < numTrackables; i++) {
                        const trackable = <vuforia.Trackable>dataSet.getTrackable(i);
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
        let lastModified:Date|undefined;
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
            } else if (response.content && response.statusCode >= 200 && response.statusCode < 300) {                
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