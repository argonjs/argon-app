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
import {bind} from './decorators'

export class XRDevice extends Observable {

    constructor(public browserView:BrowserView) {
        super()
        
        browserView.on('layerAdded', this.onLayerAddedBound)
        browserView.on('layerDeleted', this.onLayerDeletedBound)

        browserView.layers.forEach((layer)=>{
            this.onLayerAdded({layer})
        })
    }

    onLayerAdded(evt:{layer:LayerView}) {
        const layer = evt.layer
        layer.on('propertyChanged', this.onLayerPropertyChanged)
    }
    
    onLayerDeleted(evt:{layer:LayerView}) {
        const layer = evt.layer
        layer.off('propertyChanged', this.onLayerPropertyChangedBound)
    }

    onLayerPropertyChanged(evt:PropertyChangeData) {
    }    

    onLayerAddedBound = this.onLayerAdded.bind(this)
    onLayerDeletedBound = this.onLayerAdded.bind(this)
    onLayerPropertyChangedBound = this.onLayerPropertyChanged.bind(this)

    sendNextFrameState() {
        for (const layer of this.browserView.layers) {
            layer.webView.send('xr.frame', {})
        }
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

export interface XRVuforiaTrackables {
    [name: string]: {
        id: string;
        size?: {
            x: number;
            y: number;
            z: number;
        };
    };
}

export const vuforiaCameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.OptimizeSpeed; //platform.isAndroid ? vuforia.CameraDeviceMode.OptimizeSpeed : vuforia.CameraDeviceMode.OpimizeQuality;

export class XRVuforiaDevice extends XRDevice {

    layerState = new WeakMap<LayerView,XRVuforiaState>()
    private _controllingLayer?: LayerView|null
    private _layerSwitcherCommandQueue = new CommandQueue
    
    private _defaultState:XRVuforiaState

    constructor(browserView:BrowserView, defaultKey:string) {
        super(browserView)
        this._defaultState = new XRVuforiaState(Promise.resolve(defaultKey))

        browserView.on('pinch', this._handlePinchGestureEventData)
        // this._handlePinchGestureEventData

        this._updateCameraEnabled()

        appModel.on('propertyChange', (evt:PropertyChangeData)=>{
            switch (evt.propertyName) {
                case 'focussedLayer': 
                    const focussedLayer = browserView.layerMap.get(appModel.focussedLayer!) || null
                    if (focussedLayer == null || this.layerState.has(focussedLayer)) {
                        this._setControllingLayer(focussedLayer)
                    }
                    break
                case 'layerPresentation':
                case 'focussedLayer.type':
                    this._updateCameraEnabled()
                    break
            }
        })

        browserView.on('layoutChanged', () => {
            this.configureVuforiaVideoBackground()
        })

        this._setControllingLayer(null)
    }

    onLayerAdded(evt:{layer:LayerView}) {
        super.onLayerAdded(evt)

        const layer = evt.layer

        const onMessage = layer.webView.messageHandlers
        onMessage['vuforia.init'] = 
            args => this._handleInit(layer, args);
        onMessage['vuforia.objectTrackerCreateDataSet'] = 
            ({url}:{url:string}) => this._handleObjectTrackerCreateDataSet(layer, url);
        onMessage['vuforia.objectTrackerLoadDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerLoadDataSet(layer, id);
        onMessage['vuforia.objectTrackerActivateDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerActivateDataSet(layer, id);
        onMessage['vuforia.objectTrackerDeactivateDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerDeactivateDataSet(layer, id);
        onMessage['vuforia.objectTrackerUnloadDataSet'] = 
            ({id}:{id:string}) => this._handleObjectTrackerUnloadDataSet(layer, id);
    }

    onLayerDeleted(evt:{layer:LayerView}) { 
        super.onLayerDeleted(evt)
        this._destroyLayerState(evt.layer)
        if (this._controllingLayer === evt.layer) {
            this._controllingLayer = undefined
            this._selectControllingLayer()
        }
    }

    onLayerPropertyChanged(evt:PropertyChangeData) {
        switch (evt.propertyName) {
            case 'xrEnabled':
            case 'xrImmersiveMode':
                this._updateCameraEnabled()
        }
    }

    private _zoomFactor = 1;
    private _pinchStartZoomFactor:number;
    private _effectiveZoomFactor = 1;
    
    @bind
    private _handlePinchGestureEventData(data: PinchGestureEventData) {
        if (appModel.layerPresentation !== 'stack' || 
            appModel.focussedLayer && appModel.focussedLayer.type === 'page')
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
        this.configureVuforiaVideoBackground()
    }

    private _vuforiaIsInitialized = false;
    private _cameraEnabled = false;

    private _updateCameraEnabled() {
        const shouldEnableCamera = 
            appModel.layerPresentation !== 'stack' || 
            appModel.focussedLayer === undefined || 
            appModel.focussedLayer.type !== 'page'
            
        if (shouldEnableCamera !== this._cameraEnabled) {
            this._cameraEnabled = shouldEnableCamera;
            if (this._vuforiaIsInitialized) {
                if (shouldEnableCamera) 
                    vuforia.api.getCameraDevice().start();
                else 
                    vuforia.api.getCameraDevice().stop();
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
                
                this.configureVuforiaVideoBackground()
                
                if (this._cameraEnabled) {
                    if (!vuforia.api.getCameraDevice().start()) 
                        throw new Error('Unable to start camera');
                }

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

                const smartTerrain = vuforia.api.smartTerrain;
                if (!smartTerrain || !smartTerrain.start())
                    throw new Error('Vuforia: Unable to start SmartTerrain');

                const positionalDeviceTracker = vuforia.api.positionalDeviceTracker;
                if (!positionalDeviceTracker || !positionalDeviceTracker.start()) 
                    throw new Error('Vuforia: Unable to start PositionalDeviceTracker');

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

        if (this._controllingLayer) {
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
    
    private _objectTrackerLoadDataSet(layer:LayerView|null, id: string): Promise<XRVuforiaTrackables> {
        const layerState = this._getLayerState(layer);

        const uri = layerState.dataSetUriById.get(id);
        if (!uri) throw new Error(`Vuforia: Unknown DataSet id: ${id}`);
        const objectTracker = vuforia.api.objectTracker;
        if (!objectTracker) throw new Error('Vuforia: Invalid State. Unable to get ObjectTracker instance.')

        let dataSet = layerState.dataSetInstanceById.get(id);

        let trackablesPromise:Promise<XRVuforiaTrackables>;

        if (dataSet) {
            trackablesPromise = Promise.resolve(this._getTrackablesFromDataSet(dataSet));
        } else {
            console.log(`Vuforia: Loading dataset (${id}) from ${uri}...`);
            trackablesPromise = fetchDataSet(uri).then<XRVuforiaTrackables>((location)=>{
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

    private _getTrackablesFromDataSet(dataSet:vuforia.DataSet) {
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
                id: "vuforia_trackable_" + trackable.getId(),
                size: trackable instanceof vuforia.ObjectTarget ? trackable.getSize() : {x:0,y:0,z:0}
            }
        }
        return trackables;
    }

    private _handleObjectTrackerLoadDataSet(layer:LayerView|null, id:string) : Promise<Argon.VuforiaTrackables> {
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
            return this._pauseLayerCommands(layer).then(destroyState)
        } else {
            return Promise.resolve().then(destroyState)
        }
    }

    private _config = <vuforia.VideoBackgroundConfig>{};

    public configureVuforiaVideoBackground(reflection=vuforia.VideoBackgroundReflection.Default, viewport?:{top:number,left:number,width:number,height:number}) {
    
        const videoView = vuforia.videoView;
        const viewWidth = viewport ? viewport.width : videoView.getActualSize().width;
        const viewHeight = viewport ? viewport.height : videoView.getActualSize().height;
        
        const cameraDevice = vuforia.api.getCameraDevice();
        const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode);
        let videoWidth = videoMode.width;
        let videoHeight = videoMode.height;
        
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
        

        if (vuforia.videoView.ios) {
            (<UIView>vuforia.videoView.ios).contentScaleFactor = Math.max(1, screen.mainScreen.scale);
        }

        const contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : screen.mainScreen.scale;
        
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
        config.enabled = this._cameraEnabled;
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

        // To position video in viewport:
        // AbsoluteLayout.setLeft(videoView, viewport.x);
        // AbsoluteLayout.setTop(videoView, viewport.y);
        // videoView.width = viewWidth;
        // videoView.height = viewHeight;
        
        vuforia.api && vuforia.api.setScaleFactor(this._effectiveZoomFactor)

        const renderer = vuforia.api.getRenderer();
        renderer.setVideoBackgroundConfig(config);
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