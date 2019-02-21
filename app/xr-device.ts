import { Observable, PropertyChangeData } from 'data/observable'
import * as http from 'http/http';
import * as file from 'file-system';
import {screen} from 'platform'
import { GestureStateTypes, PinchGestureEventData } from 'ui/gestures/gestures';

import { BrowserView, LayerView } from './components/browser-view'
import * as utils from './utils'
import { CommandQueue } from './utils'
import * as URI from 'urijs'
import * as vuforia from 'nativescript-vuforia';
import * as minimatch from 'minimatch'
import config from './config';
import {appModel} from './app-model'
import {observable, bind} from './decorators'

import * as glMatrix from 'gl-matrix'

interface XRView {
    type: 'lefteye'|'righteye'|'singular'|'postprocess',
    viewport: {x:number,y:number,width:number,height:number},
    normalizedViewport: {x:number,y:number,width:number,height:number},
    projectionMatrix?: vuforia.Matrix44,
    eyeDisplayAdjustmentMatrix?: vuforia.Matrix44,
}

interface XRFrameState {
    index:number,
    time:number,
    views:Array<XRView>,
    trackableResults:XRTrackableResults,
    hitTestResults: {
        [id:string]: Array<{id:string, pose:number[]}>
    },
    immersiveSize: {width:number,height:number},
    contentScaleFactor?: number,
}

export class XRDevice extends Observable {

    @observable()
    targetFPS = 60

    @observable()
    browserView:BrowserView

    constructor() {
        super()

        this.on('propertyChange', (evt:PropertyChangeData)=>{
            if (evt.propertyName === 'browserView') {
                const oldBrowserView = evt.oldValue;
                if (oldBrowserView) {
                    oldBrowserView.off('layerAdded', this.onLayerAdded)
                    oldBrowserView.off('layerDeleted', this.onLayerDeleted)
                }
                this.browserView.on('layerAdded', this.onLayerAdded, this)
                this.browserView.on('layerDeleted', this.onLayerDeleted, this)
                this.browserView.layers.forEach((layer)=>{
                    this.onLayerAdded({layer})
                })
            }
        })

        setInterval(()=>{

            if (!this.browserView) return

            const averageSendFrameTime = this._averageSendFrameTime

            if (this._framesOver10msCount === 0) {
                this.targetFPS = 60
            } else if (this._framesOver20msCount === 0) {
                this.targetFPS = 30
            } else if (this._framesOver30msCount === 0) {
                this.targetFPS = 24
            }

            const frameBudget = 1 / this.targetFPS * 1000 
            
            console.log('TARGET FPS: ' + this.targetFPS)
            console.log('AVERAGE CPU TIME FOR SENDING FRAME STATE: ' + this._averageSendFrameTime)
            let layerIndex = 0
            for (const layer of this.browserView.layers) {

                const totalCPUTime = averageSendFrameTime + layer.details.xrAverageCPUTime
                const budgetPercent = totalCPUTime / frameBudget
                const layerScaleFactor = layer.details.renderBufferScaleFactor

                if (budgetPercent < 0.3) {
                    layer.details.renderBufferScaleFactor = Math.min(layerScaleFactor * 2, 1)
                } else if (budgetPercent > 0.7) {
                    layer.details.renderBufferScaleFactor = Math.max(layerScaleFactor * 0.5, 0.25)
                }
                
                console.log(`AVERAGE CPU FRAME TIME FOR LAYER -${layerIndex}-: ${layer.details.xrAverageCPUTime}`)
                console.log(`FRAME BUDGET PERCENT FOR LAYER -${layerIndex}-: ${budgetPercent}`)
                console.log(`RENDER BUFFER SCALE FOR LAYER -${layerIndex}-: ${layer.details.renderBufferScaleFactor}`)
                layerIndex++
            }

            console.log('FRAMES OVER 10ms Count: ' + this._framesOver10msCount)
            console.log('FRAMES OVER 20ms Count: ' + this._framesOver20msCount)
            console.log('FRAMES OVER 30ms Count: ' + this._framesOver30msCount)
            
        }, 10000) // optimize performance every 10 seconds
    }

    onLayerAdded(evt:{layer:LayerView}) {
        const layer = evt.layer
        layer.on('propertyChange', this.onLayerPropertyChange, this)
    }
    
    onLayerDeleted(evt:{layer:LayerView}) {
        const layer = evt.layer
        layer.off('propertyChange', this.onLayerPropertyChange, this)
    }

    onLayerPropertyChange(evt:PropertyChangeData) {}

    _cpuFrameTimes:number[] = []
    _frameStartTime = 0
    _averageSendFrameTime = 0
    _framesOver10msCount = 0
    _framesOver20msCount = 0
    _framesOver30msCount = 0

    startFrameTimer() {
        this._frameStartTime = performance.now()
    }

    _sum = ( p, c ) => p + c

    sendNextFrameState(state:XRFrameState) {
       
        let highestCPUTime = 0 
        const layers = this.browserView.layers
 
       // go in reverse so foreground layer receives updates first
        for (let i = layers.length - 1; i >= 0; i--) {

            const layer = layers[i]

            state.contentScaleFactor = this.browserView.focussedLayer === layer ? 
                screen.mainScreen.scale : Math.min(1, screen.mainScreen.scale/2)
            
            let shouldSend = false
            
            if (layer.details.xrEnabled) {
                if (this.browserView.focussedLayer === layer || 
                    this.browserView.realityLayer === layer ||
                    layer.details.xrImmersiveMode === 'augmentation') {
                    shouldSend = true
                } else if (appModel.layerPresentation === 'overview') {
                    shouldSend = true
                    state.contentScaleFactor /= 2
                }

                state.contentScaleFactor *= appModel.globalRenderBufferScaleFactor * layer.details.renderBufferScaleFactor
                
                const totalCPUTime = this._averageSendFrameTime + layer.details.xrAverageCPUTime
                if (totalCPUTime > highestCPUTime) highestCPUTime = totalCPUTime
            }

            if (shouldSend) 
                layer.webView.send('xr.frame', state)
        }

        const endFrameTime = performance.now()

        this._cpuFrameTimes.push(endFrameTime - this._frameStartTime)
        if (this._cpuFrameTimes.length > 60) this._cpuFrameTimes.shift()

        const cpuTimes = this._cpuFrameTimes
        this._averageSendFrameTime = cpuTimes.reduce(this._sum, 0) / cpuTimes.length

        highestCPUTime > 10 ? this._framesOver10msCount += 1 : this._framesOver10msCount -= 0.5
        highestCPUTime > 20 ? this._framesOver20msCount +=1 : this._framesOver20msCount -= 0.5
        highestCPUTime > 30 ? this._framesOver30msCount +=1 : this._framesOver30msCount -= 0.5
        this._framesOver10msCount = Math.min(Math.max(0, this._framesOver10msCount), 1000)
        this._framesOver20msCount = Math.min(Math.max(0, this._framesOver20msCount), 1000)
        this._framesOver30msCount = Math.min(Math.max(0, this._framesOver30msCount), 1000)
    }
}

export class XRVuforiaState {
    commandQueue = new CommandQueue;
    initResultResolver?:(result:vuforia.InitResult)=>void;
    loadedDataSets = new Set<string>();
    activatedDataSets = new Set<string>();
    dataSetUriById = new Map<string, string>();
    dataSetIdByUri = new Map<string, string>();
    dataSetInstanceById = new Map<string, vuforia.DataSet>();
    hintValues = new Map<number, number>();
    constructor(public keyPromise: Promise<string|undefined>) {}
}

export interface XRTrackableResult {
    id:string,
    name:string,
    pose:vuforia.Matrix44
}

export interface XRTrackableResults {
    [id: string]: {
        id:string,
        name:string,
        pose:vuforia.Matrix44|null,
        status:vuforia.TrackableResultStatus
    }
}

export interface XRDataSetTrackables {
    [name: string]: {
        id: string
        size?: {
            x: number
            y: number
            z: number
        }
    }
}

// function _distance(a,b) {
//     const aX = a[12], aY = a[13], aZ = a[14]
//     const bX = b[12], bY = b[13], bZ = b[14]
//     const xDelta = bX-aX
//     const yDelta = bY-aY
//     const zDelta = bZ-aZ
//     const distSquared = xDelta*xDelta + yDelta*yDelta + zDelta*zDelta
//     return Math.sqrt(distSquared)
// }

// export const vuforiaCameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.Default;
//  platform.isAndroid ? vuforia.CameraDeviceMode.OptimizeSpeed : vuforia.CameraDeviceMode.OptimizeQuality;
export const vuforiaCameraDeviceMode = vuforia.CameraDeviceMode.OptimizeSpeed

export class XRVuforiaDevice extends XRDevice {

    layerState = new WeakMap<LayerView,XRVuforiaState>()
    private _controllingLayer?: LayerView|null
    private _layerSwitcherCommandQueue = new CommandQueue
    
    private _defaultState: XRVuforiaState
    
    private _eyeLevelPose = <vuforia.Matrix44>[1, 0, 0, 0,
                             0, 1, 0, 0,
                             0, 0, 1, 0,
                             0, 0, 0, 1 ]

    private _pendingHitTests:{[id:string]: {repeatCount:number, point:{x:number,y:number}}} = {}
    private _tempHitAnchors:{[id:string]: vuforia.Anchor} = {}
    private _addedAnchors:{[id:string]: vuforia.Anchor} = {}

    constructor(defaultKey:string) {
        super()

        vuforia.api.setTargetFPS(this.targetFPS)
        this.on('propertyChange', (evt:PropertyChangeData) => {
            if (evt.propertyName === 'targetFPS') {
                vuforia.api.setTargetFPS(this.targetFPS)
            }
        })

        this._defaultState = new XRVuforiaState(Promise.resolve(defaultKey))

        this.on('propertyChange', (evt:PropertyChangeData)=>{
            if (evt.propertyName === 'browserView') {
                const oldBrowserView = evt.oldValue;
                if (oldBrowserView) {
                    oldBrowserView.off('pinch', this._handlePinchGestureEventData)
                }
                this.browserView.on('pinch', this._handlePinchGestureEventData)
            }
        })

        this._updateCameraEnabled()

        appModel.on('propertyChange', (evt:PropertyChangeData)=>{
            switch (evt.propertyName) {
                case 'focussedLayer': 
                    const focussedLayer = this.browserView.layerMap.get(appModel.focussedLayer!) || null
                    if (focussedLayer == null || this.layerState.has(focussedLayer)) {
                        this._setControllingLayer(focussedLayer)
                    }
                    break
                case 'layerPresentation':
                case 'focussedLayer.xrImmersiveMode':
                    this._updateCameraEnabled()
                    break
                case 'flashEnabled':
                    vuforia.api.getCameraDevice().setFlashTorchMode(appModel.flashEnabled)
                    break
                case 'immersiveStereoEnabled': 
                    vuforia.api.getDevice().setViewerActive(appModel.immersiveStereoEnabled)
                    this.configureView()
                    break
            }
        })

        let needsViewConfiguration = true
        vuforia.videoView.on('layoutChanged', () => {
            if (vuforia.videoView.ios) {
                (<UIView>vuforia.videoView.ios).contentScaleFactor = Math.max(3, screen.mainScreen.scale);
            }
            needsViewConfiguration = true
        })

        vuforia.api.renderCallback = (state:vuforia.State) => {

            this.startFrameTimer()

            if (needsViewConfiguration) {
                this.configureView()
                needsViewConfiguration = false
            }

            const views:Array<XRView> = this.getViews(state)

            const frame = state.getFrame()
            const index = frame.getIndex()
            const time = frame.getTimeStamp()
            const trackableResults:XRTrackableResults = {}
            const deviceTrackableResult = state.getDeviceTrackableResult()
            const deviceID = 'xr.device'
            const deviceName = 'Device'
            const devicePose = (deviceTrackableResult && deviceTrackableResult.getPose()) || null
            const deviceStatus = (deviceTrackableResult && deviceTrackableResult.getStatus()) || vuforia.TrackableResultStatus.NoPose

            if (devicePose) {
                const screenRotation = this.getScreenRotationMatrix()
                glMatrix.mat4.multiply(<any>devicePose, <any>devicePose, <any>screenRotation)
            }

            trackableResults[deviceID] = {
                id: deviceID,
                name: deviceName,
                pose: devicePose,
                status: deviceStatus
            }
                        
            // update trackable results in context entity collection
            const numTrackableResults = state.getNumTrackableResults()
            for (let i=0; i < numTrackableResults; i++) {
                const trackableResult = <vuforia.TrackableResult>state.getTrackableResult(i)
                const trackable = trackableResult.getTrackable()
                const id = 'vuforia.trackable_' + trackable.getId()
                const name = trackable.getName()
                const pose = trackableResult.getPose()
                const status = trackableResult.getStatus()

                if (trackable instanceof vuforia.DeviceTrackable) {
                    continue;
                } else {
                    // workaround for tracking bug 
                    // not sure why, but trackable poses drift downwards (gravity-wise) as distance increases
                    // this is not a FOV error, as it is only affects position on +Y global axis, and is not affected
                    // by the camera orientation, only the distance between trackable and device
                    // const distance = devicePose ? _distance(devicePose, pose) : 0
                    // pose[13] += 0.01 * distance * 2  // not sure why, but device pose seeems to be vertically offset by this ammount
                }
                
                trackableResults[id] = {
                    id,
                    name,
                    pose,
                    status
                }
            }

            trackableResults['xr.eye-level'] = {
                id: 'xr.eye-level',
                name: 'Eye Level',
                pose: this._eyeLevelPose,
                status: vuforia.TrackableResultStatus.Tracked
            }

            const hitTestResults = {}

            vuforia.api.smartTerrain!.hitTest(state, {x:0.5, y:0.5}, 1.4, vuforia.HitTestHint.None)
            const hitTestResultCount = vuforia.api.smartTerrain!.getHitTestResultCount()
            if (hitTestResultCount > 0) {
                const result = vuforia.api.smartTerrain!.getHitTestResult(0)
                const id = 'xr.center-hit'
                trackableResults[id] = {
                    id,
                    name: 'Center Hit',
                    pose: result.getPose(),
                    status: vuforia.TrackableResultStatus.Detected
                }
            }


            // const positionalDeviceTracker = vuforia.api.positionalDeviceTracker!;

            const smartTerrain = vuforia.api.smartTerrain!
            for (let id in this._pendingHitTests) {

                const pendingHitTest = this._pendingHitTests[id]

                smartTerrain.hitTest(state, pendingHitTest.point, 1.4, vuforia.HitTestHint.None)
                const count = smartTerrain.getHitTestResultCount()
                const hits:{id:string, pose:vuforia.Matrix44}[] = []
                for (let i=0; i<count; i++) {
                    const result = smartTerrain.getHitTestResult(i)
                    const name =  'xr.hit_' + utils.createGuid()
                    // Disabling the followign because it eventually causes performance problems.
                    // const hitAnchor = positionalDeviceTracker.createAnchorFromHitTestResult(name, result)
                    // if (!hitAnchor) continue;
                    // const id = '' + hitAnchor.getId()
                    const id = name
                    hits.push({
                        id,
                        pose: result.getPose()
                    })
                    // this._tempHitAnchors[id] = hitAnchor;
                    // destroy if not used
                    // setTimeout(()=>{
                    //     const positionalDeviceTracker = vuforia.api.positionalDeviceTracker!;
                    //     if (positionalDeviceTracker && this._tempHitAnchors[id]) {
                    //         positionalDeviceTracker.destroyAnchor(this._tempHitAnchors[id])
                    //         delete this._tempHitAnchors[id]
                    //     }
                    // }, 100)
                }
                hitTestResults[id] = hits
                
                pendingHitTest.repeatCount--
                if (pendingHitTest.repeatCount <= 0) {
                    delete this._pendingHitTests[id]
                }
            }


            const immersiveSize = this.browserView.getActualSize()

            // send frame state within promise callback
            // to switch back to the main thread 
            // Promise.resolve().then(()=>{
                this.sendNextFrameState({
                    index,
                    time,
                    views,
                    trackableResults,
                    hitTestResults,
                    immersiveSize
                })
            // })

            // console.log(trackableResults)
        }

        this._setControllingLayer(null)
    }

    onLayerAdded(evt:{layer:LayerView}) {
        super.onLayerAdded(evt)

        const layer = evt.layer

        const onMessage = layer.webView.messageHandlers
        onMessage['vuforia.init'] = 
            args => this._handleInit(layer, args)
        onMessage['vuforia.objectTrackerCreateDataSet'] = 
            ({url}:{url:string}) => this._handleObjectTrackerCreateDataSet(layer, url)
        onMessage['vuforia.objectTrackerLoadDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerLoadDataSet(layer, id)
        onMessage['vuforia.objectTrackerActivateDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerActivateDataSet(layer, id)
        onMessage['vuforia.objectTrackerDeactivateDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerDeactivateDataSet(layer, id)
        onMessage['vuforia.objectTrackerUnloadDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerUnloadDataSet(layer, id)

        onMessage['xr.createMidAirAnchor'] = (data:{pose:vuforia.Matrix44}) => {
            const name = 'xr.midair_' + utils.createGuid() 
            const anchor = vuforia.api.positionalDeviceTracker!.createAnchorFromPose(name, data.pose);
            if (!anchor) throw new Error('Unable to create anchor')
            const id = '' + anchor.getId()
            this._addedAnchors[id] = anchor
            return Promise.resolve({id})
        }

        onMessage['xr.hitTest'] = (data:{id:string,point:{x:number,y:number}}) => {
            // adjust hit point for screen rotation and zoom scale
            const hitPoint = [data.point.x-0.5, data.point.y-0.5]
            const screenRotation = glMatrix.mat2d.fromRotation(<any>[], - utils.screenOrientation * Math.PI / 180 - Math.PI / 2)
            glMatrix.vec2.transformMat2d(<any>hitPoint, hitPoint, screenRotation)
            data.point.x = Math.max(0, Math.min(hitPoint[0] / this._effectiveZoomFactor + 0.5, 1))
            data.point.y = Math.max(0, Math.min(hitPoint[1] / this._effectiveZoomFactor + 0.5, 1))
            this._pendingHitTests[data.id] = {
                point: data.point,
                repeatCount: 10
            }
        }

        onMessage['xr.createAnchorFromHit'] = (data:{id:string}) => {
            const positionalDeviceTracker = vuforia.api.positionalDeviceTracker!
            if (!positionalDeviceTracker) throw new Error('Unable to get positional device tracker')
            const id = data.id
            const hitAnchor = this._addedAnchors[id] = this._tempHitAnchors[id]
            if (!hitAnchor) throw new Error('Hit has expired')
            delete this._tempHitAnchors[id]
            return Promise.resolve({id: ''+hitAnchor.getId()})
        }

        onMessage['xr.destroyAnchor'] = (data:{id:string}) => {
            const id = data.id
            const positionalDeviceTracker = vuforia.api.positionalDeviceTracker!
            if (positionalDeviceTracker && this._addedAnchors[id]) {
                positionalDeviceTracker.destroyAnchor(this._addedAnchors[id])
                delete this._addedAnchors[id]
            }
        }
    }

    onLayerDeleted(evt:{layer:LayerView}) { 
        super.onLayerDeleted(evt)
        this._destroyLayerState(evt.layer)
        this._selectControllingLayer()
    }

    onLayerPropertyChange(evt:PropertyChangeData) {
        
    }

    private _zoomFactor = 1
    private _pinchStartZoomFactor:number
    private _effectiveZoomFactor = 1
    
    @bind
    private _handlePinchGestureEventData(data: PinchGestureEventData) {
        if (appModel.layerPresentation !== 'stack' || 
            appModel.focussedLayer && appModel.focussedLayer.xrImmersiveMode === 'none')
            return

        switch (data.state) {
            case GestureStateTypes.began: 
                this._pinchStartZoomFactor = this._zoomFactor;
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;
            case GestureStateTypes.changed: 
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;
            case GestureStateTypes.ended:
            case GestureStateTypes.cancelled:
            default:
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;  
        }

        this._effectiveZoomFactor = Math.abs(this._zoomFactor - 1) < 0.05 ? 1 : this._zoomFactor
        this.configureView()
    }

    private _vuforiaIsInitialized = false
    private _cameraEnabled = false

    private _updateCameraEnabled() {
        const shouldEnableCamera = 
            appModel.layerPresentation !== 'stack' || 
            appModel.focussedLayer === undefined || 
            appModel.focussedLayer.xrImmersiveMode !== 'none'
            
        if (shouldEnableCamera !== this._cameraEnabled) {
            this._cameraEnabled = shouldEnableCamera
            if (this._vuforiaIsInitialized) {
                if (shouldEnableCamera) {
                    vuforia.api.getCameraDevice().start()
                    this.configureView()
                } else {
                    vuforia.api.getCameraDevice().stop()
                }
            }
        }
    }

    private _getLayerState(layer: LayerView|null) {
        if (!layer) return this._defaultState
        const layerState = this.layerState.get(layer)
        if (!layerState) throw new Error('Vuforia must be initialized first')
        return layerState;
    }

    private _handleInit(layer:LayerView, options:{encryptedLicenseData?:string, key?:string}) {
        if (!options.key && !options.encryptedLicenseData)
            throw new Error('No license key was provided. Get one from https://developer.vuforia.com/');

        const waitForInit = () => {
            const keyPromise = Promise.resolve<string|undefined>(
                options.key ?
                    options.key :
                    utils.canDecrypt ?
                        this._decryptLicenseKey(options.encryptedLicenseData!, layer) :
                        utils.getInternalVuforiaKey()
            )
    
            const layerState = new XRVuforiaState(keyPromise)
            this.layerState.set(layer, layerState)
    
            const initResultPromise = new Promise((resolve)=>{
                layerState.initResultResolver = resolve
            })
    
            this._selectControllingLayer()
    
            return keyPromise.then<{}>(()=>initResultPromise)
        }

        if (this.layerState.has(layer)) {
            return this._destroyLayerState(layer).then(waitForInit)
        } else {
            return waitForInit()
        }
    }

    private _decryptLicenseKey(encryptedLicenseData:string, layer:LayerView) : Promise<string> {
        return utils.decrypt(encryptedLicenseData.trim()).then((json)=>{
            const {key,origins} : {key:string,origins:string[]} = JSON.parse(json);
            const uri = layer.details.content ? layer.details.content.uri : undefined
            if (!uri) throw new Error('Invalid origin');

            if (!key) {
                throw new Error("Vuforia License Data must include a license key!");
            }
            
            const origin = URI.parse(uri);
            if (!Array.isArray(<any>origins)) {
                throw new Error("Vuforia License Data must specify allowed origins!");
            }

            const match = origins.find((o) => {
                const parts = o.split(/\/(.*)/);
                let domainPattern = parts[0];
                let pathPattern = parts[1] !== undefined ? '/' + parts[1] : '/**';
                return minimatch(origin.hostname, domainPattern) && minimatch(origin.path, pathPattern);
            })

            if (!match) {
                if (config.DEBUG && config.DEBUG_DISABLE_ORIGIN_CHECK) {
                    alert(`Note: The current origin does not match any of the allowed origins for the current Vuforia license:\n\n${origins.join('\n')}`);
                } else {
                    throw new Error('Invalid origin');
                }
            }

            return key;
        });
    }

    private _init(layer: LayerView|null) : Promise<void> {
        const layerState = this._getLayerState(layer);
        const keyPromise = layerState.keyPromise;
        if (!keyPromise) throw new Error('Vuforia: Invalid State. Missing Key.');
        
        return keyPromise.then<void>( key => {

            if (!key || !vuforia.api.setLicenseKey(key)) {
                const resolveInitResult = layerState.initResultResolver;
                if (resolveInitResult) {
                    resolveInitResult(vuforia.InitResult.LICENSE_ERROR_INVALID_KEY);
                    layerState.initResultResolver = undefined;
                }
                return Promise.reject(new Error('Vuforia: Unable to set the license key'));
            }


            console.log('Vuforia: initializing...');

            return vuforia.api.init().then((result)=>{
                console.log('Vuforia: Init Result: ' + result);

                const resolveInitResult = layerState.initResultResolver;
                if (resolveInitResult) {
                    resolveInitResult(result);
                    layerState.initResultResolver = undefined;
                }

                if (result !== vuforia.InitResult.SUCCESS) {
                    throw new Error(vuforia.InitResult[result]);
                }

                this._vuforiaIsInitialized = true;

                 // must initialize trackers before initializing the camera device

                if (!vuforia.api.initSmartTerrain()) {
                    throw new Error("Vuforia: Unable to initialize PositionalDeviceTracker");
                }

                if (!vuforia.api.initPositionalDeviceTracker()) {
                    throw new Error("Vuforia: Unable to initialize PositionalDeviceTracker");
                }

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


                const renderer = vuforia.api.getRenderer();
                const fps = renderer.getRecommendedFps(vuforia.FPSHint.Fast);
                renderer.setTargetFps(fps);
                
                this.configureView()
                
                if (this._cameraEnabled) {
                    if (!vuforia.api.getCameraDevice().start()) 
                        throw new Error('Unable to start camera');
                }

                const smartTerrain = vuforia.api.smartTerrain;
                if (!smartTerrain || !smartTerrain.start())
                    throw new Error('Vuforia: Unable to start SmartTerrain');

                const positionalDeviceTracker = vuforia.api.positionalDeviceTracker;
                if (!positionalDeviceTracker || !positionalDeviceTracker.start()) 
                    throw new Error('Vuforia: Unable to start PositionalDeviceTracker');

                if (layerState.hintValues) {
                    layerState.hintValues.forEach((value, hint, map) => {
                        vuforia.api.setHint(hint, value);
                    });
                }

                const loadedDataSets = layerState.loadedDataSets;
                const loadPromises:Promise<any>[] = [];
                if (loadedDataSets) {
                    loadedDataSets.forEach((id)=>{
                        loadPromises.push(this._objectTrackerLoadDataSet(layer, id));
                    });
                }

                return Promise.all(loadPromises)
            }).then(()=>{
                const activatedDataSets = layerState.activatedDataSets;                
                const activatePromises:Promise<any>[] = [];
                if (activatedDataSets) {
                    activatedDataSets.forEach((id) => {
                        activatePromises.push(this._objectTrackerActivateDataSet(layer, id));
                    });
                }
                return Promise.all(activatePromises)
            }).then(()=>{

                const objectTracker = vuforia.api.objectTracker;
                if (!objectTracker || !objectTracker.start()) 
                    throw new Error('Vuforia: Unable to start ObjectTracker');

                vuforia.api.getCameraDevice().setFlashTorchMode(appModel.flashEnabled)
            })
        });
    }
    
    private _selectControllingLayer() {
        const focussedLayer = this.browserView.layerMap.get(appModel.focussedLayer!)

        if (focussedLayer && this.layerState.has(focussedLayer)) {
            this._setControllingLayer(focussedLayer);
            return
        }

        if (this._controllingLayer && this.layerState.has(this._controllingLayer)) 
            return

        // pick a different layer as the controlling layer
        // TODO: prioritize any layers other than the focussed layer?
        for (const layer of this.browserView.layers) {
            if (this.layerState.has(layer)) {
                this._setControllingLayer(layer)
                return
            }
        }

        // if no other layer is available,
        // fallback to no controlling layer
        this._setControllingLayer(null);
    }


    private _setControllingLayer(layer: LayerView|null) {
        if (this._controllingLayer === layer) return Promise.resolve();

        const layerURI = layer && layer.details.content && layer.details.content.uri
        console.log("Vuforia: Set controlling layer to " + layerURI)

        if (this._controllingLayer !== undefined) {
            const previousLayer = this._controllingLayer;
            this._controllingLayer = undefined;
            this._layerSwitcherCommandQueue.push(() => {
                return this._pauseLayerCommands(previousLayer);
            });
        }
        
        this._controllingLayer = layer;
        return this._layerSwitcherCommandQueue.push(() => {
            return this._resumeLayerCommands(layer);
        }, true).catch(()=>{
            return this._setControllingLayer(null);
        });
    }

    private _pauseLayerCommands(layer: LayerView|null) : Promise<void> {        
        const layerURI = layer && layer.details.content && layer.details.content.uri
        console.log('Vuforia: Pausing layer commands ' + layerURI + '...');

        const layerState = this._getLayerState(layer)
        const commandQueue = layerState.commandQueue;

        return commandQueue.push(() => {
            commandQueue.pause();

            // stop trackers
           vuforia.api.smartTerrain!.stop();
           vuforia.api.positionalDeviceTracker!.stop();
           vuforia.api.objectTracker!.stop();

            // unload datasets / trackables

            const activatedDataSets = layerState.activatedDataSets;
            if (activatedDataSets) {
                activatedDataSets.forEach((id) => {
                    this._objectTrackerDeactivateDataSet(layer, id, false);
                });
            }

            const loadedDataSets = layerState.loadedDataSets;
            if (loadedDataSets) {
                loadedDataSets.forEach((id) => {
                    this._objectTrackerUnloadDataSet(layer, id, false);
                });
            }

            console.log('Vuforia: deinitializing...');
            vuforia.api.getCameraDevice().stop();
            vuforia.api.getCameraDevice().deinit();

            vuforia.api.deinitSmartTerrain();
            vuforia.api.deinitPositionalDeviceTracker();
            vuforia.api.deinitObjectTracker();
            vuforia.api.deinit();

            this._vuforiaIsInitialized = false;
        }, true);
    }
    
    private _resumeLayerCommands(layer: LayerView|null) : Promise<void> {
        const commandQueue = this._getLayerState(layer).commandQueue;

        const layerURI = layer && layer.details.content && layer.details.content.uri
        console.log('Vuforia: Resuming session ' + layerURI + '...');

        return this._init(layer).then(()=>{
            commandQueue.execute();
        })
    }

    private _handleObjectTrackerCreateDataSet(layer:LayerView|null, uri:string) {
        return fetchDataSet(uri).then(()=>{
            const layerState = this._getLayerState(layer);
            let id = layerState.dataSetIdByUri.get(uri);
            if (!id) {
                id = utils.createGuid();
                layerState.dataSetIdByUri.set(uri, id);
                layerState.dataSetUriById.set(id, uri);
            } 
            return {id};
        });
    }
    
    private _objectTrackerLoadDataSet(layer:LayerView|null, id: string): Promise<XRDataSetTrackables> {
        const layerState = this._getLayerState(layer);

        const uri = layerState.dataSetUriById.get(id);
        if (!uri) throw new Error(`Vuforia: Unknown DataSet id: ${id}`);
        const objectTracker = vuforia.api.objectTracker;
        if (!objectTracker) throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.')

        let dataSet = layerState.dataSetInstanceById.get(id);

        let trackablesPromise:Promise<XRDataSetTrackables>;

        if (dataSet) {
            trackablesPromise = Promise.resolve(this._getTrackablesFromDataSet(dataSet));
        } else {
            console.log(`Vuforia: Loading dataset (${id}) from ${uri}...`);
            trackablesPromise = fetchDataSet(uri).then<XRDataSetTrackables>((location)=>{
                dataSet = objectTracker.createDataSet();
                if (!dataSet) throw new Error(`Vuforia: Unable to create dataset instance`);
                
                if (dataSet.load(location, vuforia.StorageType.Absolute)) {
                    layerState.dataSetInstanceById.set(id, dataSet);
                    layerState.loadedDataSets.add(id);
                    const trackables = this._getTrackablesFromDataSet(dataSet);
                    console.log('Vuforia loaded dataset file with trackables:\n' + JSON.stringify(trackables));
                    return trackables;
                }

                objectTracker.destroyDataSet(dataSet);
                console.log(`Unable to load downloaded dataset at ${location} from ${uri}`);
                throw new Error('Unable to load dataset');
            });
        }

        trackablesPromise.then((trackables)=>{
            layer && layer.webView.send('vuforia.objectTrackerLoadDataSetEvent', { id, trackables });
        });

        return trackablesPromise;
    }

    private _getTrackablesFromDataSet(dataSet:vuforia.DataSet) : XRDataSetTrackables {
        const numTrackables = dataSet.getNumTrackables();
        const trackables:{
            [name:string]: {
                id:string,
                size: {x:number,y:number,z:number}
            }
        } = {};
        for (let i=0; i < numTrackables; i++) {
            const trackable = <vuforia.Trackable>dataSet.getTrackable(i);
            trackables[trackable.getName()] = {
                id: "vuforia.trackable_" + trackable.getId(),
                size: trackable instanceof vuforia.ObjectTarget ? trackable.getSize() : {x:0,y:0,z:0}
            }
        }
        return trackables;
    }

    private _handleObjectTrackerLoadDataSet(layer:LayerView|null, id:string) : Promise<XRDataSetTrackables> {
        return this._getLayerState(layer).commandQueue.push(()=>{
            return this._objectTrackerLoadDataSet(layer, id);
        });
    }
    
    private _objectTrackerActivateDataSet(layer:LayerView|null, id: string) {
        console.log(`Vuforia activating dataset (${id})`);

        const objectTracker = vuforia.api.objectTracker;
        if (!objectTracker) throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.')

        const layerState = this._getLayerState(layer);

        let dataSet = layerState.dataSetInstanceById.get(id);
        let dataSetPromise:Promise<vuforia.DataSet>;
        if (!dataSet) {
            dataSetPromise = this._objectTrackerLoadDataSet(layer, id).then(()=>{
                return layerState.dataSetInstanceById.get(id)!;
            })
        } else {
            dataSetPromise = Promise.resolve(dataSet);
        }

        return dataSetPromise.then((dataSet)=>{
            if (!objectTracker.activateDataSet(dataSet))
                throw new Error(`Vuforia: Unable to activate dataSet ${id}`);
            layerState.activatedDataSets.add(id);
            layer && layer.webView.send('ar.vuforia.objectTrackerActivateDataSetEvent', { id });
        });
    }

    private _handleObjectTrackerActivateDataSet(layer:LayerView, id:string) : Promise<void> {
        return this._getLayerState(layer).commandQueue.push(()=>{
            return this._objectTrackerActivateDataSet(layer, id);
        });
    }
    
    private _objectTrackerDeactivateDataSet(layer:LayerView|null, id: string, permanent=true): boolean {        
        console.log(`Vuforia deactivating dataset (permanent:${permanent} id:${id})`);
        const layerState = this._getLayerState(layer);
        const objectTracker = vuforia.api.objectTracker;
        if (objectTracker) {
            const dataSet = layerState.dataSetInstanceById.get(id);
            if (dataSet != null) {
                const success = objectTracker.deactivateDataSet(dataSet);
                if (success) {
                    if (permanent) {
                        layerState.activatedDataSets.delete(id);
                    }
                }
                layer && layer.webView.send('ar.vuforia.objectTrackerDeactivateDataSetEvent', { id });
                return success;
            }
        }
        return false;
    }

    private _handleObjectTrackerDeactivateDataSet(layer:LayerView|null, id:string) {
        return this._getLayerState(layer).commandQueue.push(()=>{
            if (!this._objectTrackerDeactivateDataSet(layer, id))
                throw new Error(`Vuforia: unable to activate dataset ${id}`);
        });
    }
    
    private _objectTrackerUnloadDataSet(layer:LayerView|null, id: string, permanent=true): boolean {       
        console.log(`Vuforia: unloading dataset (permanent:${permanent} id:${id})...`);
        const layerState = this._getLayerState(layer);
        const objectTracker = vuforia.api.objectTracker;
        if (objectTracker) {
            const dataSet = layerState.dataSetInstanceById.get(id);
            if (dataSet != null) {
                const deleted = objectTracker.destroyDataSet(dataSet);
                if (deleted) {
                    layerState.dataSetInstanceById.delete(id);
                    if (permanent) {                    
                        const datasetUri = layerState.dataSetUriById.get(id)!;
                        layerState.dataSetIdByUri.delete(datasetUri);
                        layerState.loadedDataSets.delete(id);
                        layerState.dataSetUriById.delete(id);
                    }
                }
                return deleted;
            }
        }
        return false;
    }

    private _handleObjectTrackerUnloadDataSet(layer:LayerView, id:string) {
        return this._getLayerState(layer).commandQueue.push(()=>{
            if (!this._objectTrackerUnloadDataSet(layer, id))
                throw new Error(`Vuforia: unable to unload dataset ${id}`);
        });
    }

    private _destroyLayerState(layer:LayerView) : Promise<void> {
        const destroyState = () => {
            this.layerState.delete(layer);
        }
        if (this._controllingLayer === layer) {
            this._controllingLayer = undefined
            return this._pauseLayerCommands(layer).then(destroyState)
        } else {
            return Promise.resolve().then(destroyState)
        }
    }

    private _config = <vuforia.VideoBackgroundConfig>{};

    public configureView() {
    
        const videoView = vuforia.videoView
        const viewWidth = videoView.getActualSize().width
        const viewHeight = videoView.getActualSize().height
        
        const cameraDevice = vuforia.api.getCameraDevice()
        cameraDevice.setFocusMode(vuforia.CameraDeviceFocusMode.ContinuousAuto)
        const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode)
        let videoWidth = videoMode.width
        let videoHeight = videoMode.height
        
        const screenOrientation = utils.screenOrientation;
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
        
        const contentScaleFactor = screen.mainScreen.scale
        const sizeX = videoWidth * scale * contentScaleFactor
        const sizeY = videoHeight * scale * contentScaleFactor

        // apply the video config
        const config = this._config 
        config.enabled = this._cameraEnabled
        config.sizeX = sizeX
        config.sizeY = sizeY
        config.positionX = 0
        config.positionY = 0
        config.reflection = vuforia.VideoBackgroundReflection.Default
        
        // console.log(`Vuforia configuring video background...
        //     contentScaleFactor: ${contentScaleFactor} orientation: ${orientation} 
        //     viewWidth: ${viewWidth} viewHeight: ${viewHeight} videoWidth: ${videoWidth} videoHeight: ${videoHeight} 
        //     config: ${JSON.stringify(config)}
        // `);

        // To position video in viewport:
        // AbsoluteLayout.setLeft(videoView, viewport.x);
        // AbsoluteLayout.setTop(videoView, viewport.y);
        // videoView.width = viewWidth;
        // videoView.height = viewHeight;

        vuforia.api && vuforia.api.setScaleFactor(this._effectiveZoomFactor)
        const renderer = vuforia.api.getRenderer();
        renderer.setVideoBackgroundConfig(config);
    }

    private _getScreenRotationMatrixZ = [0,0,1]
    private _getScreenRotationMatrixArray:number[] = []
    getScreenRotationMatrix() {
        return glMatrix.mat4.fromRotation(
            <any>this._getScreenRotationMatrixArray, 
            utils.screenOrientation * Math.PI / 180 + Math.PI / 2,
            this._getScreenRotationMatrixZ)
    }

    getViews(state:vuforia.State) : Array<XRView> {

        const views:Array<XRView> = []
        
        const renderingPrimitives = vuforia.api.getDevice().getRenderingPrimitives()
        const renderingViews = renderingPrimitives.getRenderingViews()
        const numViews = renderingViews.getNumViews()

        const contentScaleFactor = screen.mainScreen.scale
        const videoView = vuforia.videoView
        const viewWidth = videoView.getActualSize().width
        const viewHeight = videoView.getActualSize().height
        const zoomFactor = this._effectiveZoomFactor

        const screenRotation = this.getScreenRotationMatrix()
        
        for (let i = 0; i < numViews; i++) {
            const view = renderingViews.getView(i)
            const viewJSON = views[i] = {} as XRView
            
            switch (view) {
                case vuforia.View.LeftEye:
                    viewJSON.type = 'lefteye'; break;
                case vuforia.View.RightEye:
                    viewJSON.type = 'righteye'; break;
                case vuforia.View.Singular:
                    viewJSON.type = 'singular'; break;
                case vuforia.View.PostProcess:
                    viewJSON.type = 'postprocess'; break;
            }

            const projectionMatrix = renderingPrimitives.getProjectionMatrix(view, state.getCameraCalibration(), 0.01, 10000)
            glMatrix.mat4.scale(<any>projectionMatrix, <any>projectionMatrix, [zoomFactor,zoomFactor,1])
            glMatrix.mat4.multiply(<any>projectionMatrix, <any>projectionMatrix, <any>screenRotation)

            const viewport = renderingPrimitives.getViewport(view)

            viewJSON.viewport = {
                x: viewport.x / contentScaleFactor,
                y: viewport.y / contentScaleFactor,
                width: viewport.z / contentScaleFactor,
                height: viewport.w / contentScaleFactor
            }

            viewJSON.normalizedViewport = {
                x: viewJSON.viewport.x / viewWidth,
                y: viewJSON.viewport.y / viewHeight,
                width: viewJSON.viewport.width / viewWidth,
                height: viewJSON.viewport.height / viewHeight
            }

            viewJSON.projectionMatrix = isFinite(projectionMatrix[0]) ? projectionMatrix : undefined

            const eyeDisplayAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view)
            viewJSON.eyeDisplayAdjustmentMatrix = isFinite(eyeDisplayAdjustmentMatrix[0]) ? eyeDisplayAdjustmentMatrix : undefined
        }

        return views
    }

}

function fetchDataSet(xmlUrlString:string) : Promise<string> {

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