
import * as Argon from '@argonjs/argon';
import * as vuforia from 'nativescript-vuforia';
import * as http from 'http';
import * as file from 'file-system';
import * as platform from 'platform';
import {AbsoluteLayout} from 'ui/layouts/absolute-layout';
import * as util from './util'
import * as minimatch from 'minimatch'
import * as URI from 'urijs'
import config from '../../config';

export const vuforiaCameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.OptimizeSpeed; //application.android ? vuforia.CameraDeviceMode.OptimizeSpeed : vuforia.CameraDeviceMode.OpimizeQuality;
// if (vuforia.videoView.ios) {
//     (<UIView>vuforia.videoView.ios).contentScaleFactor = platform.screen.mainScreen.scale;
// }

export const VIDEO_DELAY = -0.5/60;

const Matrix4 = Argon.Cesium.Matrix4;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const JulianDate = Argon.Cesium.JulianDate;
const CesiumMath = Argon.Cesium.CesiumMath;

const x180 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI);

class VuforiaSessionData {
    commandQueue = new Argon.CommandQueue;
    initResultResolver?:(result:vuforia.InitResult)=>void;
    loadedDataSets = new Set<string>();
    activatedDataSets = new Set<string>();
    dataSetUriById = new Map<string, string>();
    dataSetIdByUri = new Map<string, string>();
    dataSetInstanceById = new Map<string, vuforia.DataSet>();
    hintValues = new Map<number, number>();
    constructor(public keyPromise: Promise<string>) {}
}

@Argon.DI.autoinject
export class NativescriptVuforiaServiceProvider {

    public stateUpdateEvent = new Argon.Event<Argon.Cesium.JulianDate>();
    
    public vuforiaTrackerEntity = new Argon.Cesium.Entity({
        position: new Argon.Cesium.ConstantPositionProperty(Cartesian3.ZERO, this.contextService.user),
        orientation: new Argon.Cesium.ConstantProperty(Quaternion.IDENTITY)
    });

    private _scratchCartesian = new Argon.Cesium.Cartesian3();
    private _scratchQuaternion = new Argon.Cesium.Quaternion();
	private _scratchMatrix3 = new Argon.Cesium.Matrix3();

    private _controllingSession?: Argon.SessionPort;
    private _sessionSwitcherCommandQueue = new Argon.CommandQueue();

    private _sessionData = new WeakMap<Argon.SessionPort,VuforiaSessionData>();
    
	constructor(
            private sessionService:Argon.SessionService,
            private focusServiceProvider:Argon.FocusServiceProvider,
            private contextService:Argon.ContextService,
            // private deviceService:Argon.DeviceService,
            private entityServiceProvider:Argon.EntityServiceProvider,
            realityService:Argon.RealityService) {

        // this.sessionService.connectEvent.addEventListener(()=>{
        //     this.stateUpdateEvent.addEventListener(()=>{
        //         const reality = this.contextService.serializedFrameState.reality;
        //         if (reality === Argon.RealityViewer.LIVE) this.deviceService.update();
        //     });
        //     setTimeout(()=>{
        //         const reality = this.contextService.serializedFrameState.reality;
        //         if (reality !== Argon.RealityViewer.LIVE) this.deviceService.update();
        //     }, 60)
        // })
        
        sessionService.connectEvent.addEventListener((session)=>{
            if (!vuforia.api) {
                session.on['ar.vuforia.isAvailable'] = 
                    () => Promise.resolve({available: false});
                session.on['ar.vuforia.init'] = 
                    (initOptions) => Promise.reject(new Error("Vuforia is not supported on this platform"));
            } else {
                session.on['ar.vuforia.isAvailable'] = 
                    () => Promise.resolve({available: !!vuforia.api});
                session.on['ar.vuforia.init'] = 
                    initOptions => this._handleInit(session, initOptions);
                session.on['ar.vuforia.objectTrackerCreateDataSet'] = 
                    ({url}:{url:string}) => this._handleObjectTrackerCreateDataSet(session, url);
                session.on['ar.vuforia.objectTrackerLoadDataSet'] = 
                    ({id}:{id:string}) => this._handleObjectTrackerLoadDataSet(session, id);
                session.on['ar.vuforia.objectTrackerActivateDataSet'] = 
                    ({id}:{id:string}) => this._handleObjectTrackerActivateDataSet(session, id);
                session.on['ar.vuforia.objectTrackerDeactivateDataSet'] = 
                    ({id}:{id:string}) => this._handleObjectTrackerDeactivateDataSet(session, id);
                session.on['ar.vuforia.objectTrackerUnloadDataSet'] = 
                    ({id}:{id:string}) => this._handleObjectTrackerUnloadDataSet(session, id);
                session.on['ar.vuforia.setHint'] =
                    options => this._setHint(session, options);

                // backwards compatability
                session.on['ar.vuforia.dataSetFetch'] = session.on['ar.vuforia.objectTrackerLoadDataSet'];
                session.on['ar.vuforia.dataSetLoad'] = ({id}:{id:string}) => {
                    return this._handleObjectTrackerLoadDataSet(session, id);
                }
            }

            session.closeEvent.addEventListener(() => this._handleClose(session));
        });

        if (!vuforia.api) return;
        
        // // switch to AR mode when LIVE reality is presenting
        // realityService.changeEvent.addEventListener(({current})=>{
        //     this._setDeviceMode(
        //         current === Argon.RealityViewer.LIVE ? 
        //             vuforia.DeviceMode.AR : vuforia.DeviceMode.VR
        //     );
        // });
        
        const landscapeRightScreenOrientationRadians = -CesiumMath.PI_OVER_TWO;

        const stateUpdateCallback = (state:vuforia.State) => { 
            
            const time = JulianDate.now();
            // subtract a few ms, since the video frame represents a time slightly in the past.
            // TODO: if we are using an optical see-through display, like hololens,
            // we want to do the opposite, and do forward prediction (though ideally not here, 
            // but in each app itself to we are as close as possible to the actual render time when
            // we start the render)
            JulianDate.addSeconds(time, VIDEO_DELAY, time);

            // Rotate the tracker to a landscape-right frame, 
            // where +X is right, +Y is down, and +Z is in the camera direction
            // (vuforia reports poses in this frame on iOS devices, not sure about android)
            const currentScreenOrientationRadians = util.screenOrientation * CesiumMath.RADIANS_PER_DEGREE;
            const trackerOrientation = Quaternion.multiply(
                Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, landscapeRightScreenOrientationRadians - currentScreenOrientationRadians, this._scratchQuaternion),
                x180,
                this._scratchQuaternion);
            (this.vuforiaTrackerEntity.orientation as Argon.Cesium.ConstantProperty).setValue(trackerOrientation);
            
            const vuforiaFrame = state.getFrame();
            const frameTimeStamp = vuforiaFrame.getTimeStamp();
                        
            // update trackable results in context entity collection
            const numTrackableResults = state.getNumTrackableResults();
            for (let i=0; i < numTrackableResults; i++) {
                const trackableResult = <vuforia.TrackableResult>state.getTrackableResult(i);
                const trackable = trackableResult.getTrackable();
                const name = trackable.getName();
                
                const id = this._getIdForTrackable(trackable);
                let entity = contextService.entities.getById(id);
                
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
                    entityPosition.forwardExtrapolationDuration = 10/60;
                    entityOrientation.forwardExtrapolationDuration = 10/60;
                    contextService.entities.add(entity);
                    this.entityServiceProvider.targetReferenceFrameMap.set(id, this.contextService.user.id);
                }
                
                const trackableTime = JulianDate.clone(time); 
                
                // add any time diff from vuforia
                const trackableTimeDiff = trackableResult.getTimeStamp() - frameTimeStamp;
                if (trackableTimeDiff !== 0) JulianDate.addSeconds(time, trackableTimeDiff, trackableTime);
                
                const pose = <Argon.Cesium.Matrix4><any>trackableResult.getPose();
                const position = Matrix4.getTranslation(pose, this._scratchCartesian);
                const rotationMatrix = Matrix4.getRotation(pose, this._scratchMatrix3);
                const orientation = Quaternion.fromRotationMatrix(rotationMatrix, this._scratchQuaternion);
                
                (entity.position as Argon.Cesium.SampledPositionProperty).addSample(trackableTime, position);
                (entity.orientation as Argon.Cesium.SampledProperty).addSample(trackableTime, orientation);
            }
            
            // try {
                this.stateUpdateEvent.raiseEvent(time);
            // } catch(e) {
                // this.sessionService.errorEvent.raiseEvent(e);
            // }
        };
        
        vuforia.api.setStateUpdateCallback(stateUpdateCallback);

        // make sure the currently focussed session has priority
        this.focusServiceProvider.sessionFocusEvent.addEventListener(()=>{
            this._selectControllingSession();
        })
	}
        
    // private _deviceMode = vuforia.DeviceMode.VR;
    // private _setDeviceMode(deviceMode: vuforia.DeviceMode) {
    //     this._deviceMode = deviceMode;
    //     // following may fail (return false) if vuforia is not currently initialized, 
    //     // but that's okay (since next time we initilaize we will use the saved mode). 
    //     vuforia.api.getDevice().setMode(deviceMode); 
    // } 

    private _getSessionData(session:Argon.SessionPort) {
        const sessionData = this._sessionData.get(session);
        if (!sessionData) throw new Error('Vuforia must be initialized first')
        return sessionData;
    }

    private _getCommandQueueForSession(session:Argon.SessionPort) {
        const sessionData = this._sessionData.get(session)!;
        if (!sessionData.commandQueue) throw new Error('Vuforia must be initialized first')
        return sessionData.commandQueue;
    }
    
    private _selectControllingSession() {
        const focusSession = this.focusServiceProvider.session;

        if (focusSession && 
            focusSession.isConnected && 
            this._sessionData.has(focusSession)) {
            this._setControllingSession(focusSession);
            return;
        }

        if (this._controllingSession && 
            this._controllingSession.isConnected &&
            this._sessionData.has(this._controllingSession)) 
            return;

        // pick a different session as the controlling session
        // TODO: prioritize any sessions other than the focussed session?
        for (const session of this.sessionService.managedSessions) {
            if (this._sessionData.has(session)) {
                this._setControllingSession(session);
                return;
            }
        }

        // if no other session is available,
        // fallback to the manager as the controlling session
        if (this._sessionData.has(this.sessionService.manager))
            this._setControllingSession(this.sessionService.manager);
    }

    private _setControllingSession(session: Argon.SessionPort): void {
        if (this._controllingSession === session) return;

        console.log("VuforiaService: Setting controlling session to " + session.uri)

        if (this._controllingSession) {
            const previousSession = this._controllingSession;
            this._controllingSession = undefined;
            this._sessionSwitcherCommandQueue.push(() => {
                return this._pauseSession(previousSession);
            });
        }
        
        this._controllingSession = session;
        this._sessionSwitcherCommandQueue.push(() => {
            return this._resumeSession(session);
        }, true).catch(()=>{
            this._controllingSession = undefined;
            this._setControllingSession(this.sessionService.manager);
        });
    }

    private _pauseSession(session:Argon.SessionPort): Promise<void> {
        console.log('Vuforia: Pausing session ' + session.uri + '...');

        const sessionData = this._getSessionData(session);
        const commandQueue = sessionData.commandQueue;

        return commandQueue.push(() => {
            commandQueue.pause();
            
            // If the session is closed, we set the permanent flag to true.
            // Likewise, if the session is not closed, we set the permanent flat to false,
            // maintaining the current session state.
            const permanent = session.isClosed;

            const objectTracker = vuforia.api.getObjectTracker();
            if (objectTracker) objectTracker.stop();

            const activatedDataSets = sessionData.activatedDataSets;
            if (activatedDataSets) {
                activatedDataSets.forEach((id) => {
                    this._objectTrackerDeactivateDataSet(session, id, permanent);
                });
            }

            const loadedDataSets = sessionData.loadedDataSets;
            if (loadedDataSets) {
                loadedDataSets.forEach((id) => {
                    this._objectTrackerUnloadDataSet(session, id, permanent);
                });
            }

            console.log('Vuforia: deinitializing...');
            vuforia.api.getCameraDevice().stop();
            vuforia.api.getCameraDevice().deinit();
            vuforia.api.deinitObjectTracker();
            vuforia.api.deinit();

            if (permanent) {
                this._sessionData.delete(session);
            }
        }, true);
    }
    
    private _resumeSession(session: Argon.SessionPort): Promise<void> {
        const commandQueue = this._getCommandQueueForSession(session);

        console.log('Vuforia: Resuming session ' + session.uri + '...');

        return this._init(session).then(()=>{
            commandQueue.execute();
        })
    }

    private _init(session:Argon.SessionPort) : Promise<void> {
        const sessionData = this._getSessionData(session);
        const keyPromise = sessionData.keyPromise;
        if (!keyPromise) throw new Error('Vuforia: Invalid State. Missing Key.');
        
        return keyPromise.then<void>( key => {

            if (!vuforia.api.setLicenseKey(key)) {
                return Promise.reject(new Error('Vuforia: Unable to set the license key'));
            }

            console.log('Vuforia: initializing...');

            return vuforia.api.init().then((result)=>{
                console.log('Vuforia: Init Result: ' + result);

                const resolveInitResult = sessionData.initResultResolver;
                if (resolveInitResult) {
                    resolveInitResult(result);
                    sessionData.initResultResolver = undefined;
                }

                if (result !== vuforia.InitResult.SUCCESS) {
                    throw new Error(vuforia.InitResult[result]);
                }

                 // must initialize trackers before initializing the camera device
                if (!vuforia.api.initObjectTracker()) {
                    throw new Error("Vuforia: Unable to initialize ObjectTracker");
                }

                const cameraDevice = vuforia.api.getCameraDevice();

                console.log("Vuforia: initializing camera device...");

                if (!cameraDevice.init(vuforia.CameraDeviceDirection.Default))
                    throw new Error('Unable to initialize camera device');
                    
                if (!cameraDevice.selectVideoMode(vuforiaCameraDeviceMode))
                    throw new Error('Unable to select video mode');
                    
                if (!vuforia.api.getDevice().setMode(vuforia.DeviceMode.AR))
                    throw new Error('Unable to set device mode');
                
                // this.configureVuforiaVideoBackground({
                //     x:0,
                //     y:0,
                //     width:vuforia.videoView.getActualSize().width, //getMeasuredWidth(), 
                //     height:vuforia.videoView.getActualSize().height //getMeasuredHeight()
                // }, false);
                    
                if (!vuforia.api.getCameraDevice().start()) 
                    throw new Error('Unable to start camera');

                if (sessionData.hintValues) {
                    sessionData.hintValues.forEach((value, hint, map) => {
                        vuforia.api.setHint(hint, value);
                    });
                }

                const loadedDataSets = sessionData.loadedDataSets;
                const loadPromises:Promise<any>[] = [];
                if (loadedDataSets) {
                    loadedDataSets.forEach((id)=>{
                        loadPromises.push(this._objectTrackerLoadDataSet(session, id));
                    });
                }

                return Promise.all(loadPromises);
            }).then(()=>{
                const activatedDataSets = sessionData.activatedDataSets;                
                const activatePromises:Promise<any>[] = [];
                if (activatedDataSets) {
                    activatedDataSets.forEach((id) => {
                        activatePromises.push(this._objectTrackerActivateDataSet(session, id));
                    });
                }
                return activatePromises;
            }).then(()=>{
                const objectTracker = vuforia.api.getObjectTracker();
                if (!objectTracker) throw new Error('Vuforia: Unable to get objectTracker instance');
                objectTracker.start();
            })
        });
    }

    private _handleInit(session:Argon.SessionPort, options:{encryptedLicenseData?:string, key?:string}) {
        if (!options.key && !options.encryptedLicenseData)
            throw new Error('No license key was provided. Get one from https://developer.vuforia.com/');

        if (this._sessionData.has(session))
            throw new Error('Already initialized');
        
        const keyPromise = Promise.resolve<string|undefined>(
            options.key ?
                options.key :
                util.canDecrypt ?
                    this._decryptLicenseKey(options.encryptedLicenseData!, session) :
                    util.getInternalVuforiaKey()
        );

        const sessionData = new VuforiaSessionData(keyPromise);
        this._sessionData.set(session, sessionData);

        const initResultPromise = new Promise((resolve)=>{
            sessionData.initResultResolver = resolve;
        });

        this._selectControllingSession();

        return keyPromise.then<{}>(()=>initResultPromise);
    }

    private _handleClose(session:Argon.SessionPort) {
        if (this._controllingSession === session) {
            this._selectControllingSession();
        }
    }
    
    private _handleObjectTrackerCreateDataSet(session:Argon.SessionPort, uri:string) {
        return fetchDataSet(uri).then(()=>{
            const sessionData = this._getSessionData(session);
            let id = sessionData.dataSetIdByUri.get(uri);
            if (!id) {
                id = Argon.Cesium.createGuid();
                sessionData.dataSetIdByUri.set(uri, id);
                sessionData.dataSetUriById.set(id, uri);
            } 
            return {id};
        });
    }
    
    private _objectTrackerLoadDataSet(session:Argon.SessionPort, id: string): Promise<Argon.VuforiaTrackables> {
        const sessionData = this._getSessionData(session);

        const uri = sessionData.dataSetUriById.get(id);
        if (!uri) throw new Error(`Vuforia: Unknown DataSet id: ${id}`);
        const objectTracker = vuforia.api.getObjectTracker();
        if (!objectTracker) throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.')

        let dataSet = sessionData.dataSetInstanceById.get(id);

        let trackablesPromise:Promise<Argon.VuforiaTrackables>;

        if (dataSet) {
            trackablesPromise = Promise.resolve(this._getTrackablesFromDataSet(dataSet));
        } else {
            console.log(`Vuforia: Loading dataset (${id}) from ${uri}...`);
            trackablesPromise = fetchDataSet(uri).then<Argon.VuforiaTrackables>((location)=>{
                dataSet = objectTracker.createDataSet();
                if (!dataSet) throw new Error(`Vuforia: Unable to create dataset instance`);
                
                if (dataSet.load(location, vuforia.StorageType.Absolute)) {
                    sessionData.dataSetInstanceById.set(id, dataSet);
                    sessionData.loadedDataSets.add(id);
                    const trackables = this._getTrackablesFromDataSet(dataSet);
                    console.log('Vuforia loaded dataset file with trackables:\n' + JSON.stringify(trackables));
                    return trackables;
                }

                objectTracker.destroyDataSet(dataSet);
                console.log(`Unable to load downloaded dataset at ${location} from ${uri}`);
                throw new Error('Unable to load dataset');
            });
        }

        if (session.version[0] > 0) {
            trackablesPromise.then((trackables)=>{
                session.send('ar.vuforia.objectTrackerLoadDataSetEvent', { id, trackables });
            });
        }

        return trackablesPromise;
    }

    private _getTrackablesFromDataSet(dataSet:vuforia.DataSet) {
        const numTrackables = dataSet.getNumTrackables();
        const trackables:Argon.VuforiaTrackables = {};
        for (let i=0; i < numTrackables; i++) {
            const trackable = <vuforia.Trackable>dataSet.getTrackable(i);
            trackables[trackable.getName()] = {
                id: this._getIdForTrackable(trackable),
                size: trackable instanceof vuforia.ObjectTarget ? trackable.getSize() : {x:0,y:0,z:0}
            }
        }
        return trackables;
    }

    private _handleObjectTrackerLoadDataSet(session:Argon.SessionPort, id:string) : Promise<Argon.VuforiaTrackables> {
        return this._getCommandQueueForSession(session).push(()=>{
            return this._objectTrackerLoadDataSet(session, id);
        });
    }
    
    private _objectTrackerActivateDataSet(session: Argon.SessionPort, id: string) {
        console.log(`Vuforia activating dataset (${id})`);

        const objectTracker = vuforia.api.getObjectTracker();
        if (!objectTracker) throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.')

        const sessionData = this._getSessionData(session);

        let dataSet = sessionData.dataSetInstanceById.get(id);
        let dataSetPromise:Promise<vuforia.DataSet>;
        if (!dataSet) {
            dataSetPromise = this._objectTrackerLoadDataSet(session, id).then(()=>{
                return sessionData.dataSetInstanceById.get(id)!;
            })
        } else {
            dataSetPromise = Promise.resolve(dataSet);
        }

        return dataSetPromise.then((dataSet)=>{
            if (!objectTracker.activateDataSet(dataSet))
                throw new Error(`Vuforia: Unable to activate dataSet ${id}`);
            sessionData.activatedDataSets.add(id);
            if (session.version[0] > 0)
                session.send('ar.vuforia.objectTrackerActivateDataSetEvent', { id });
        });
    }

    private _handleObjectTrackerActivateDataSet(session:Argon.SessionPort, id:string) : Promise<void> {
        return this._getCommandQueueForSession(session).push(()=>{
            return this._objectTrackerActivateDataSet(session, id);
        });
    }
    
    private _objectTrackerDeactivateDataSet(session: Argon.SessionPort, id: string, permanent=true): boolean {        
        console.log(`Vuforia deactivating dataset (${id})`);
        const sessionData = this._getSessionData(session);
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            const dataSet = sessionData.dataSetInstanceById.get(id);
            if (dataSet != null) {
                const success = objectTracker.deactivateDataSet(dataSet);
                if (success) {
                    if (permanent) {
                        sessionData.activatedDataSets.delete(id);
                    }
                    if (session.version[0] > 0)
                        session.send('ar.vuforia.objectTrackerDeactivateDataSetEvent', { id });
                }
                return success;
            }
        }
        return false;
    }

    private _handleObjectTrackerDeactivateDataSet(session:Argon.SessionPort, id:string) {
        return this._getCommandQueueForSession(session).push(()=>{
            if (!this._objectTrackerDeactivateDataSet(session, id))
                throw new Error(`Vuforia: unable to activate dataset ${id}`);
        });
    }
    
    private _objectTrackerUnloadDataSet(session:Argon.SessionPort, id: string, permanent=true): boolean {       
        console.log(`Vuforia: unloading dataset (permanent:${permanent} id:${id})...`);
        const sessionData = this._getSessionData(session);
        const objectTracker = vuforia.api.getObjectTracker();
        if (objectTracker) {
            const dataSet = sessionData.dataSetInstanceById.get(id);
            if (dataSet != null) {
                const deleted = objectTracker.destroyDataSet(dataSet);
                if (deleted) {
                    sessionData.dataSetInstanceById.delete(id);
                    if (permanent) {
                        const uri = sessionData.dataSetUriById.get(id)!;
                        sessionData.dataSetIdByUri.delete(uri);
                        sessionData.loadedDataSets.delete(id);
                        sessionData.dataSetUriById.delete(id);
                    }
                    if (session.version[0] > 0)
                        session.send('ar.vuforia.objectTrackerUnloadDataSetEvent', { id });
                }
                return deleted;
            }
        }
        return false;
    }

    private _handleObjectTrackerUnloadDataSet(session:Argon.SessionPort, id:string) {
        return this._getCommandQueueForSession(session).push(()=>{
            if (!this._objectTrackerUnloadDataSet(session, id))
                throw new Error(`Vuforia: unable to unload dataset ${id}`);
        });
    }
    
    private _getIdForTrackable(trackable:vuforia.Trackable) : string {
        if (trackable instanceof vuforia.ObjectTarget) {
            return 'vuforia_object_target_' + trackable.getUniqueTargetId();
        } else {
            return 'vuforia_trackable_' + trackable.getId();
        }
    }

    private _setHint(session:Argon.SessionPort, options:{hint?:number, value?:number}) {
        return this._getCommandQueueForSession(session).push(()=>{
            if (options.hint === undefined || options.value === undefined)
                throw new Error('setHint requires hint and value');
            var success = vuforia.api.setHint(options.hint, options.value);
            if (success) {
                const sessionData = this._getSessionData(session);
                sessionData.hintValues.set(options.hint, options.value);
            }
            return {result: success};
        });
    }

    private _decryptLicenseKey(encryptedLicenseData:string, session:Argon.SessionPort) : Promise<string> {
        return util.decrypt(encryptedLicenseData.trim()).then((json)=>{
            const {key,origins} : {key:string,origins:string[]} = JSON.parse(json);
            if (!session.uri) throw new Error('Invalid origin');

            const origin = URI.parse(session.uri);
            if (!Array.isArray(<any>origins)) {
                throw new Error("Vuforia License Data must specify allowed origins");
            }

            const match = origins.find((o) => {
                const parts = o.split(/\/(.*)/);
                let domainPattern = parts[0];
                let pathPattern = parts[1] !== undefined ? '/' + parts[1] : '/**';
                return minimatch(origin.hostname, domainPattern) && minimatch(origin.path, pathPattern);
            })

            if (!match) {
                if (config.DEBUG && config.DEBUG_DISABLE_ORIGIN_CHECK) {
                    alert(`Note: The current origin does not match any of the allowed origins:\n\n${origins.join('\n')}`);
                } else {
                    throw new Error('Invalid origin');
                }
            }

            return key;
        });
    }

    private _config = <vuforia.VideoBackgroundConfig>{};

    public configureVuforiaVideoBackground(viewport:Argon.Viewport, enabled:boolean, reflection=vuforia.VideoBackgroundReflection.Default) {
        const viewWidth = viewport.width;
        const viewHeight = viewport.height;
        
        const cameraDevice = vuforia.api.getCameraDevice();
        const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode);
        let videoWidth = videoMode.width;
        let videoHeight = videoMode.height;
        
        const screenOrientation = util.screenOrientation;
        if (screenOrientation === 0 || screenOrientation === 180) {
            videoWidth = videoMode.height;
            videoHeight = videoMode.width;
        }
        
        const widthRatio = viewWidth / videoWidth;
        const heightRatio = viewHeight / videoHeight;
        // aspect fill
        const scale = Math.max(widthRatio, heightRatio);
        // aspect fit
        // const scale = Math.min(widthRatio, heightRatio);

        const videoView = vuforia.videoView;
        const contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : platform.screen.mainScreen.scale;
        
        const sizeX = videoWidth * scale * contentScaleFactor;
        const sizeY = videoHeight * scale * contentScaleFactor;

        // possible optimization, needs further testing
        // if (this._config.enabled === enabled &&
        //     this._config.sizeX === sizeX &&
        //     this._config.sizeY === sizeY) {
        //     // No changes, skip configuration
        //     return;
        // }

        // apply the video config
        const config = this._config; 
        config.enabled = enabled;
        config.sizeX = sizeX;
        config.sizeY = sizeY;
        config.positionX = 0;
        config.positionY = 0;
        config.reflection = vuforia.VideoBackgroundReflection.Default;
        
        // console.log(`Vuforia configuring video background...
        //     contentScaleFactor: ${contentScaleFactor} orientation: ${orientation} 
        //     viewWidth: ${viewWidth} viewHeight: ${viewHeight} videoWidth: ${videoWidth} videoHeight: ${videoHeight} 
        //     config: ${JSON.stringify(config)}
        // `);

        AbsoluteLayout.setLeft(videoView, viewport.x);
        AbsoluteLayout.setTop(videoView, viewport.y);
        videoView.width = viewWidth;
        videoView.height = viewHeight;
        vuforia.api.getRenderer().setVideoBackgroundConfig(config);
    }
}

// TODO: make this cross platform somehow
function fetchDataSet(xmlUrlString:string) : Promise<string> {
    /*
    const xmlUrl = NSURL.URLWithString(xmlUrlString);
    const datUrl = xmlUrl.URLByDeletingPathExtension.URLByAppendingPathExtension("dat");
    
    const directoryPathUrl = xmlUrl.URLByDeletingLastPathComponent;
    const directoryHash = directoryPathUrl.hash;
    const tmpPath = file.knownFolders.temp().path;
    const directoryHashPath = tmpPath + file.path.separator + directoryHash;
    
    file.Folder.fromPath(directoryHashPath);
    
    const xmlDestPath = directoryHashPath + file.path.separator + xmlUrl.lastPathComponent;
    const datDestPath = directoryHashPath + file.path.separator + datUrl.lastPathComponent;
    */

    const directoryPath = xmlUrlString.substring(0, xmlUrlString.lastIndexOf("/"));
    const filename = xmlUrlString.substring(xmlUrlString.lastIndexOf("/") + 1);
    const filenameWithoutExt = filename.substring(0, filename.lastIndexOf("."));

    const datUrlString = directoryPath + file.path.separator + filenameWithoutExt + ".dat";

    const directoryHash = hashCode(directoryPath);
    const tmpPath = file.knownFolders.temp().path;
    const directoryHashPath = tmpPath + file.path.separator + directoryHash;

    file.Folder.fromPath(directoryHashPath);
    
    const xmlDestPath = directoryHashPath + file.path.separator + filename;
    const datDestPath = directoryHashPath + file.path.separator + filenameWithoutExt + ".dat";

    function hashCode(s:string) {
        var hash = 0, i, chr, len;
        if (s.length === 0) return hash;
        for (i = 0, len = s.length; i < len; i++) {
            chr   = s.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    
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
        downloadIfNeeded(xmlUrlString,xmlDestPath), 
        downloadIfNeeded(datUrlString,datDestPath)
    ]).then(()=>xmlDestPath);
} 