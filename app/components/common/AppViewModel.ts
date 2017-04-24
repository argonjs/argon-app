import {Observable, PropertyChangeData, EventData} from 'data/observable'
import {ObservableArray} from 'data/observable-array'
import * as bookmarks from './bookmarks'
import * as Argon from '@argonjs/argon';
import {NativescriptVuforiaServiceProvider} from './argon-vuforia-provider';
import {NativescriptDeviceService, NativescriptDeviceServiceProvider} from './argon-device-provider';
import {NativescriptLiveRealityViewer, NativescriptHostedRealityViewer} from './argon-reality-viewers';
import {getInternalVuforiaKey} from './util';
import {LogItem} from 'argon-web-view';
import {config} from '../../app'

export interface LoadUrlEventData extends EventData {
    eventName: 'loadUrl',
    url: string,
    newLayer: boolean,
}

export class LayerDetails extends Observable {
    uri = '';
    title = '';
    log = new ObservableArray<LogItem>();
}

@Argon.DI.inject(Argon.DI.Factory.of(NativescriptLiveRealityViewer), Argon.DI.Factory.of(NativescriptHostedRealityViewer))
export abstract class NativescriptRealityViewerFactory {
    constructor(
        private _createLiveReality, 
        private _createHostedReality) {
    }

    createRealityViewer(uri:string) : Argon.RealityViewer {
        const viewerType = Argon.RealityViewer.getType(uri);
        switch (viewerType) {
            case Argon.RealityViewer.LIVE:
                var realityViewer = this._createLiveReality();
                realityViewer.uri = uri;
                return realityViewer;
            case 'hosted':
                var realityViewer = this._createHostedReality();
                realityViewer.uri = uri;
                return realityViewer;
            default:
                throw new Error('Unsupported Reality Viewer URI: ' + uri)
        }
    }
}

export type InteractionMode = 'immersive'|'page';

export class AppViewModel extends Observable {
    menuOpen = false;
    cancelButtonShown = false;
    realityChooserOpen = false;
    overviewOpen = false;
    bookmarksOpen = false;
    debugEnabled = false;
    viewerEnabled = false;
    interactionMode:InteractionMode = 'immersive';
    interactionModeButtonEnabled = false;
    layerDetails:LayerDetails;
    currentUri = '';
    isFavorite = false;

    public argon:Argon.ArgonSystem;

    private _resolveReady:Function;
    ready:Promise<void>;
    
    static loadUrlEvent:'loadUrl' = 'loadUrl'
    
    constructor() {
        super();
        bookmarks.favoriteList.on('change',()=>{
            setTimeout(()=>{
                this.updateFavoriteStatus();
            })
        })

        this.ready = new Promise<void>((resolve) => {
            this._resolveReady = resolve;
        });
    }

    setReady() {
        const container = new Argon.DI.Container;
        container.registerSingleton(Argon.DeviceService, NativescriptDeviceService);
        container.registerSingleton(Argon.VuforiaServiceProvider, NativescriptVuforiaServiceProvider);
        container.registerSingleton(Argon.DeviceServiceProvider, NativescriptDeviceServiceProvider);
        container.registerSingleton(Argon.RealityViewerFactory, NativescriptRealityViewerFactory);

        const argon = this.argon = Argon.init(null, {
            role: Argon.Role.MANAGER,
            title: 'ArgonApp'
        }, container);

        argon.reality.default = Argon.RealityViewer.LIVE;

        argon.provider.reality.installedEvent.addEventListener(({viewer})=>{
            if (!bookmarks.realityMap.get(viewer.uri)) {
                bookmarks.realityList.push(new bookmarks.BookmarkItem({uri: viewer.uri}));
            }
        });

        argon.provider.reality.uninstalledEvent.addEventListener(({viewer})=>{
            const item = bookmarks.realityMap.get(viewer.uri);
            if (item) {
                var idx = bookmarks.realityList.indexOf(item);
                bookmarks.realityList.splice(idx, 1);
            }
        });
        
        argon.provider.focus.sessionFocusEvent.addEventListener(({current})=>{
            console.log("Argon focus changed: " + (current ? current.uri : undefined));
        });

        argon.vuforia.isAvailable().then((available)=>{
            if (available) {
                let primaryVuforiaLicenseKey = getInternalVuforiaKey();
                if (config.DEBUG_DEVELOPMENT_LICENSE_KEY != "") primaryVuforiaLicenseKey = config.DEBUG_DEVELOPMENT_LICENSE_KEY;
                
                if (!primaryVuforiaLicenseKey) {
                    alert("Unable to locate internal Vuforia License Key");
                    return;
                }
                argon.vuforia.initWithUnencryptedKey(primaryVuforiaLicenseKey).catch((err)=>{
                    alert(err.message);
                });
            }
        });

        this.setLayerDetails(new LayerDetails(null));
        
        this._resolveReady();
    }

    ensureReady() {
        if (!this.argon) throw new Error('AppViewModel is not ready');
    }
    
    toggleMenu() {
        this.ensureReady();
        this.set('menuOpen', !this.menuOpen);
    }
    
    hideMenu() {
        this.ensureReady();
        this.set('menuOpen', false);
    }
    
    toggleInteractionMode() {
        this.ensureReady();
        this.set('interactionMode', this.interactionMode === 'page' ? 'immersive' : 'page')
    }
    
    setInteractionMode(mode:InteractionMode) {
        this.ensureReady();
        this.set('interactionMode', mode);
    }
    
    showOverview() {
        this.ensureReady();
        this.set('overviewOpen', true);
    }
    
    hideOverview() {
        this.ensureReady();
        this.set('overviewOpen', false);
    }
    
    toggleOverview() {
        this.ensureReady();
        this.set('overviewOpen', !this.overviewOpen);
    }
    
    showBookmarks() {
        this.ensureReady();
        this.set('bookmarksOpen', true);
    }
    
    hideBookmarks() {
        this.ensureReady();
        this.set('bookmarksOpen', false);
    }
    
    showRealityChooser() {
        this.ensureReady();
        this.set('realityChooserOpen', true);
    }
    
    hideRealityChooser() {
        this.ensureReady();
        this.set('realityChooserOpen', false);
    }
    
    showCancelButton() {
        this.ensureReady();
        this.set('cancelButtonShown', true);
    }
    
    hideCancelButton() {
        this.ensureReady();
        this.set('cancelButtonShown', false);
    }
    
    toggleDebug() {
        this.ensureReady();
        this.set('debugEnabled', !this.debugEnabled);
    }
    
    setDebugEnabled(enabled:boolean) {
        this.ensureReady();
        this.set('debugEnabled', enabled);
    }
    
    toggleViewer() {
        this.ensureReady();
        this.setViewerEnabled(!this.viewerEnabled);
    }
    
    setViewerEnabled(enabled:boolean) {
        this.ensureReady();
        this.set('viewerEnabled', enabled);
        if (enabled) this.argon.device.requestPresentHMD();
        else this.argon.device.exitPresentHMD();
    }

    _onLayerDetailsChange(data:PropertyChangeData) {
        this.ensureReady();
        if (data.propertyName === 'uri') {
            this.set('currentUri', data.value);
            this.updateFavoriteStatus();
        }
    }
    
    setLayerDetails(details:LayerDetails) {
        this.ensureReady();
        this.layerDetails && this.layerDetails.off('propertyChange', this._onLayerDetailsChange, this);
        this.set('layerDetails', details);
        this.set('bookmarksOpen', !details.uri);
        this.set('currentUri', details.uri);
        this.updateFavoriteStatus();
        details.on('propertyChange', this._onLayerDetailsChange, this);
    }
    
    updateFavoriteStatus() {
        this.ensureReady();
        this.set('isFavorite', !!bookmarks.favoriteMap.get(this.currentUri));
    }
    
    loadUrl(url:string) {
        this.ensureReady();
        this.notify(<LoadUrlEventData>{
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url,
            newLayer: false
        });
        this.layerDetails.set('uri', url);
        this.set('bookmarksOpen', !url);
    }

    openUrl(url:string) {
        this.ensureReady();
        this.notify(<LoadUrlEventData>{
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url,
            newLayer: true
        });
        this.layerDetails.set('uri', url);
        this.set('bookmarksOpen', !url);
    }
}

export const appViewModel = new AppViewModel;