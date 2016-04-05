
import application = require("application");
import Argon = require("argon");
import vuforia = require('nativescript-vuforia')

import {iosSystemBootDate} from './argon-device-service'

const defaultVuforiaLicenseKey = "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV";

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

export class NativeScriptVuforiaServiceDelegate extends Argon.VuforiaServiceDelegateBase {
	
	private scratchMatrix4 = new Argon.Cesium.Matrix4();
	private scratchMatrix3 = new Argon.Cesium.Matrix3();
    
    private iosTrackableRotation = new Quaternion;
	
	constructor() {
        super();
        
        vuforia.events.on(vuforia.initErrorEvent, (event:vuforia.EventData) => {
            this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.InitError,
                message: event.message,
                data: {code: event.code}
            })  
            console.error(event.message + " code: " + event.code);
        })
        
        vuforia.events.on(vuforia.loadDataSetErrorEvent, (event:vuforia.EventData) => {
            this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.LoadDataSetError,
                message: event.message
            })  
            console.error(event.message);
        })
        
        vuforia.events.on(vuforia.unloadDataSetErrorEvent, (event:vuforia.EventData) => {
            this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.UnloadDataSetError,
                message: event.message
            })
            console.error(event.message);
        })
        
        vuforia.events.on(vuforia.activateDataSetErrorEvent, (event:vuforia.EventData) => {
            this.errorEvent.raiseEvent({
                type: Argon.VuforiaErrorType.ActivateDataSetError,
                message: event.message
            })
            console.error(event.message);
        })
        
        vuforia.events.on(vuforia.dataSetLoadEvent, (event:vuforia.DataSetLoadEventData) => {
            const url = event.url;
            const trackables = event.trackables;
            for (const name in trackables) {
                const trackable = trackables[name];
                trackable.id = "vuforia_trackable_" + trackable.id;
            }
            const msg:Argon.VuforiaDataSetLoadMessage = {url, trackables};
            console.log('DataSet loaded: ' + JSON.stringify(msg));
            this.dataSetLoadEvent.raiseEvent(msg);
        });
        
        if (vuforia.ios) {
            
            // TODO: wrap some of this ios-specific stuff up in nativescript-vuforia plugin
            
            const vuforiaCameraPose = {
                referenceFrame: 'DEVICE',
                position: {x:0,y:0,z:0},
                orientation: Quaternion.multiply(x180, z90, <any>{})
            }
            
            vuforia.events.on(vuforia.stateUpdateEvent, (e:vuforia.StateUpdateEventData) => {
                const state:VuforiaState = e.state;
                
                let frame = state.getFrame();
                const frameNumber = frame.getIndex();
                const timestamp = frame.getTimeStamp();
                
                const time = JulianDate.addSeconds(iosSystemBootDate, timestamp, <any>{});
                
                const entities:Argon.EntityPoseMap = {}
                const trackableResultsCount = state.getNumTrackableResults();
                
                entities['VUFORIA_CAMERA'] = vuforiaCameraPose;
                
                for (let i=0; i<trackableResultsCount; i++) {
                    const trackableResult = state.getTrackableResult(i);
                    const trackable = trackableResult.getTrackable();
                    const id = "vuforia_trackable_" + trackable.getId();
                    const pose = trackableResult.getPose();
                    
                    const postMatrix4 = [
                        pose._0, pose._1, pose._2, pose._3,
                        pose._4, pose._5, pose._6, pose._7,
                        pose._8, pose._9, pose._10, pose._11,
                        0, 0, 0, 1
                    ]
                        
                    // Vuforia trackable modelViewMatrix is reported in a row-major matrix
                    const trackablePose = Matrix4.fromRowMajorArray(postMatrix4, this.scratchMatrix4);
                    
                    // get the position and orientation out of the modelViewMatrix
                    const position = Matrix4.getTranslation(trackablePose, <Argon.Cesium.Cartesian3>{});
                    const rotationMatrix = Matrix4.getRotation(trackablePose, this.scratchMatrix3);
                    const orientation = Quaternion.fromRotationMatrix(rotationMatrix, <Argon.Cesium.Quaternion>{});
                    
                    entities[id] = {
                        referenceFrame: 'VUFORIA_CAMERA',
                        position,
                        orientation
                    }
                }
                
                const frameState:Argon.MinimalFrameState = {
                    time,
                    frameNumber,
                    entities
                }
                
                // console.debug(JSON.stringify(frameState));
                
                this.updateEvent.raiseEvent(frameState);
            });
        }
        
	}
    
    isSupported() {
        return vuforia.isSupported();
    }
	
	init(options:Argon.VuforiaInitOptions) {
        console.log("Initializing Vuforia with options: " + JSON.stringify(options));
		const licenseKey = options.licenseKey || defaultVuforiaLicenseKey;
		return vuforia.init(licenseKey);
	}
	
	deinit() {
        console.log("Deinitializing Vuforia");
		return vuforia.deinit();
	}
	
	startCamera() {
        console.log("Starting Camera");
		return vuforia.startCamera();
	}
	
	stopCamera() {
        console.log("Stopping Camera");
		return vuforia.stopCamera();
	}
    
	startObjectTracker() {
        console.log("Starting ObjectTracker");
		return vuforia.startObjectTracker();
	}
	
	stopObjectTracker() {
        console.log("Stopping ObjectTracker");
		return vuforia.stopObjectTracker();
	}
    
    hintMaxSimultaneousImageTargets(max:number) {
        console.log("Setting hint max simultanous image targets: " + max);
        return vuforia.hintMaxSimultaneousImageTargets(max);
    }
    
    setVideoBackgroundConfig(videoConfig:Argon.VuforiaVideoBackgroundConfig) {
        console.log("Set video background config: " + JSON.stringify(videoConfig));
        return vuforia.setVideoBackgroundConfig(videoConfig)
    }
    
    setViewSize(viewSize:{width:number,height:number}) {
        console.log("Set view size: " + JSON.stringify(viewSize));
        return vuforia.setViewSize(viewSize);
    }
	
	loadDataSet(url) {
        console.log("Loading dataset: " + url);
		return vuforia.loadDataSet(url);
	}
	
	unloadDataSet(url) {
        console.log("Unloading dataset: " + url);
		return vuforia.unloadDataSet(url);
	}
	
	activateDataSet(url) {
        console.log("Activating dataset: " + url);
		return vuforia.activateDataSet(url);
	}
	
	deactivateDataSet(url) {
        console.log("Deactivating dataset: " + url);
		return vuforia.deactivateDataSet(url);
	}
    
    getVideoMode() {
        return vuforia.getVideoMode();
    }
}