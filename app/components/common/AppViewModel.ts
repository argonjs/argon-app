import {Observable, PropertyChangeData, EventData} from 'data/observable'
import {ObservableArray} from 'data/observable-array'
import * as bookmarks from './bookmarks'
import * as Argon from '@argonjs/argon';
import {NativescriptDeviceService} from './argon-device-service';
import {NativescriptVuforiaServiceManager} from './argon-vuforia-manager';
import {NativescriptViewService} from './argon-view-service';
import {NativescriptLiveRealityViewer, NativescriptHostedRealityViewer} from './argon-reality-viewers';
import {getInternalVuforiaKey} from './util';
import {LogItem} from 'argon-web-view';

export interface LoadUrlEventData extends EventData {
    eventName: 'loadUrl',
    url: string
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
    layerDetails:LayerDetails = new LayerDetails(null)
    currentUri = '';
    isFavorite = false;

    public manager:Argon.ArgonSystem;

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
        })
    }

    setReady() {
        const container = new Argon.DI.Container;
        container.registerSingleton(Argon.DeviceService, NativescriptDeviceService);
        container.registerSingleton(Argon.VuforiaServiceManager, NativescriptVuforiaServiceManager);
        container.registerSingleton(Argon.ViewService, NativescriptViewService);
        container.registerSingleton(Argon.RealityViewerFactory, NativescriptRealityViewerFactory);

        const manager = this.manager = Argon.init(null, {
            role: Argon.Role.MANAGER,
            title: 'ArgonApp'
        }, container);

        manager.reality.default = Argon.RealityViewer.LIVE;

        manager.reality.installedEvent.addEventListener(({viewer})=>{
            if (!bookmarks.realityMap.get(viewer.uri)) {
                bookmarks.realityList.push(new bookmarks.BookmarkItem({uri: viewer.uri}));
            }
        });

        manager.reality.uninstalledEvent.addEventListener(({viewer})=>{
            const item = bookmarks.realityMap.get(viewer.uri);
            if (item) {
                var idx = bookmarks.realityList.indexOf(item);
                bookmarks.realityList.splice(idx, 1);
            }
        });
        
        manager.focus.sessionFocusEvent.addEventListener(({current})=>{
            console.log("Argon focus changed: " + (current ? current.uri : undefined));
        });

        manager.vuforia.isAvailable().then((available)=>{
            if (available) {
                const primaryVuforiaLicenseKey = getInternalVuforiaKey();
                if (!primaryVuforiaLicenseKey) {
                    alert("Unable to locate internal Vuforia License Key");
                    return;
                }
                manager.vuforia.initWithUnencryptedKey({key:primaryVuforiaLicenseKey}).catch((err)=>{
                    alert(err.message);
                });
            }
        });
        
        this._resolveReady();
    }
    
    toggleMenu() {
        this.set('menuOpen', !this.menuOpen);
    }
    
    hideMenu() {
        this.set('menuOpen', false);
    }
    
    toggleInteractionMode() {
        this.set('interactionMode', this.interactionMode === 'page' ? 'immersive' : 'page')
    }
    
    setInteractionMode(mode:InteractionMode) {
        this.set('interactionMode', mode);
    }
    
    showOverview() {
        this.set('overviewOpen', true);
    }
    
    hideOverview() {
        this.set('overviewOpen', false);
    }
    
    toggleOverview() {
        this.set('overviewOpen', !this.overviewOpen);
    }
    
    showBookmarks() {
        this.set('bookmarksOpen', true);
    }
    
    hideBookmarks() {
        this.set('bookmarksOpen', false);
    }
    
    showRealityChooser() {
        this.set('realityChooserOpen', true);
    }
    
    hideRealityChooser() {
        this.set('realityChooserOpen', false);
    }
    
    showCancelButton() {
        this.set('cancelButtonShown', true);
    }
    
    hideCancelButton() {
        this.set('cancelButtonShown', false);
    }
    
    toggleDebug() {
        this.set('debugEnabled', !this.debugEnabled);
    }
    
    setDebugEnabled(enabled:boolean) {
        this.set('debugEnabled', enabled);
    }
    
    toggleViewer() {
        this.setViewerEnabled(!this.viewerEnabled);
    }
    
    setViewerEnabled(enabled:boolean) {
        this.set('viewerEnabled', enabled);
        if (enabled) this.manager.view.requestEnterHmd();
        else this.manager.view.requestExitHmd();
    }

    _onLayerDetailsChange(data:PropertyChangeData) {
        if (data.propertyName === 'uri') {
            this.set('currentUri', data.value);
            this.updateFavoriteStatus();
        }
    }
    
    setLayerDetails(details:LayerDetails) {
        this.layerDetails.off('propertyChange', this._onLayerDetailsChange, this);
        this.set('layerDetails', details);
        this.set('bookmarksOpen', !details.uri);
        this.set('currentUri', details.uri);
        this.updateFavoriteStatus();
        details.on('propertyChange', this._onLayerDetailsChange, this);
    }
    
    updateFavoriteStatus() {
        this.set('isFavorite', !!bookmarks.favoriteMap.get(this.currentUri));
    }
    
    loadUrl(url:string) {
        this.notify(<LoadUrlEventData>{
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url
        })
        this.layerDetails.set('uri', url);
        this.set('bookmarksOpen', !url);
    }
}

export const appViewModel = new AppViewModel;