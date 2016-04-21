
import * as application from "application";
import * as frames from "ui/frame"
import * as Argon from "argon";
import * as vuforia from 'nativescript-vuforia';

import {systemBootDate, getInterfaceOrientation} from './argon-device-service'

const Matrix3 = Argon.Cesium.Matrix3;
const Matrix4 = Argon.Cesium.Matrix4;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const JulianDate = Argon.Cesium.JulianDate;
const CesiumMath = Argon.Cesium.CesiumMath;

const zNeg90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -CesiumMath.PI_OVER_TWO)
const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO)
const y180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI)
const x180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI)

const vuforiaEntity = new Argon.Cesium.Entity({
    id:'VUFORIA',
    position: new Argon.Cesium.ConstantPositionProperty(),
    orientation: new Argon.Cesium.ConstantProperty()
});

const cameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.Default;

@Argon.DI.inject(Argon.DeviceService, Argon.ContextService)
export class NativeScriptVuforiaServiceDelegate extends Argon.VuforiaServiceDelegateBase {
    
    public stateUpdateEvent = new Argon.Event<Argon.SerializedFrameState>();
    
	private scratchMatrix4 = new Argon.Cesium.Matrix4();
	private scratchMatrix3 = new Argon.Cesium.Matrix3();
	
	constructor(private deviceService:Argon.DeviceService, private contextService:Argon.ContextService) {
        super();
        
        vuforiaEntity.position.setValue({x:0,y:0,z:0}, deviceService.entity);
        vuforiaEntity.orientation.setValue(Quaternion.multiply(x180, z90, <any>{}));
        this.contextService.entities.add(vuforiaEntity);
        
        const stateUpdateCallback = (state:vuforia.State) => {
            
            const vuforiaFrame = state.getFrame();
            const frameNumber = vuforiaFrame.getIndex();
            const time = JulianDate.addSeconds(systemBootDate, vuforiaFrame.getTimeStamp(), <any>{});
            
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
                        position: new Argon.Cesium.SampledPositionProperty(vuforiaEntity),
                        orientation: new Argon.Cesium.SampledProperty(Argon.Cesium.Quaternion)
                    });
                    contextService.entities.add(entity);
                }
                
                const trackableTime = JulianDate.addSeconds(systemBootDate, trackableResult.getTimeStamp(), <any>{});
                
                // get the position and orientation out of the pose matrix                
                const pose = trackableResult.getPose();
                const position = Matrix4.getTranslation(pose, <Argon.Cesium.Cartesian3>{});
                const rotationMatrix = Matrix4.getRotation(pose, this.scratchMatrix3);
                const orientation = Quaternion.fromRotationMatrix(rotationMatrix, <Argon.Cesium.Quaternion>{});
                
                entity.position.addSample(trackableTime, position);
                entity.orientation.addSample(trackableTime, orientation);
            }
            
            const device = vuforia.api.getDevice();
            const renderingPrimitives = device.getRenderingPrimitives();
            const renderingViews = renderingPrimitives.getRenderingViews();
            const numViews = renderingViews.getNumViews()
            
            const subviews = <Array<Argon.SerializedSubview>>[];
            
            for (let i=0; i < numViews; i++) {
                const view = renderingViews.getView(i);
                if (view === vuforia.View.PostProcess) return;
                
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
                
                const rawProjectionMatrix = renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);
                const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
                const projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
                
                subviews.push({
                    type,
                    projectionMatrix
                });
            }
            
            const frame = frames.topmost();
            
            const view:Argon.SerializedViewParameters = {
                viewport: {
                    x:0,
                    y:0,
                    width: frame.getMeasuredWidth(),
                    height: frame.getMeasuredHeight()
                },
                pose: Argon.calculatePose(deviceService.interfaceEntity, time),
                subviews
            }
            
            this.stateUpdateEvent.raiseEvent({
                frameNumber,
                time,
                view
            });
            
            vuforia.api.onNextStateUpdate(stateUpdateCallback);
        };
        
        // vuforia.api.onNextStateUpdate(stateUpdateCallback);
	}
    
    _getIdForTrackable(trackable:vuforia.Trackable) : string {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        } else {
            return 'vuforia_trackable_' + trackable.getName();
        }
    }
    
    private _viewerEnabled = false;
    setViewerEnabled(enabled) {
        this._viewerEnabled = enabled;
        const device = VuforiaDevice.getInstance();
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
        
        return vuforia.api.init().then((result)=>{
            return <number>result;
        });
    }
    
    deinit(): void {
        vuforia.api.deinit();
    }
    
    cameraDeviceInitAndStart(): boolean {
        const cameraDevice = vuforia.api.getCameraDevice();
        
        if (!cameraDevice.init(vuforia.CameraDeviceDirection.Default))
            return false;
            
        if (!cameraDevice.selectVideoMode(cameraDeviceMode))
            return false;
            
        this.setViewerEnabled(this._viewerEnabled);
            
        configureVideoBackground();
        
        return cameraDevice.start();
    }
    
    cameraDeviceSetFlashTorchMode(on: boolean): boolean {
        return vuforia.api.getCameraDevice().setFlashTorchMode(on);
    }
    
    objectTrackerInit(): boolean {
        return vuforia.api.initObjectTracker();
    }
    
    objectTrackerStart(): boolean {
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) return objectTracker.start();
        return false;
    }
    
    objectTrackerStop(): boolean {
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
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            const dataSet = objectTracker.createDataSet();
            if (dataSet != null) {
                const id = Argon.Cesium.createGuid();
                this.idDataSetMap.set(id, dataSet);
                this.dataSetUrlMap.set(dataSet, url);
                return id;
            }
        }
        return null;
    }
    
    objectTrackerDestroyDataSet(id: string): boolean {
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
            
        }
        return Promise.reject("Dataset is not associated with a url");
    }
    
    dataSetLoad(id: string): Promise<Argon.VuforiaTrackables> {
        const dataSet = this.idDataSetMap.get(id);
        const url = this.dataSetUrlMap.get(dataSet);
        if (url) {
            
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
        sizeX: videoWidth * scale * contentScaleFactor,
        sizeY: videoHeight * scale * contentScaleFactor,
        reflection: vuforia.VideoBackgroundReflection.Default
    }
    
    console.log(`Setting Video Background Configuration
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
