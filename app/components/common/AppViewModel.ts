import {Observable, PropertyChangeData, EventData} from 'data/observable'
import {ObservableArray} from 'data/observable-array'
import * as bookmarks from './bookmarks'
import * as Argon from '@argonjs/argon';
import {NativescriptDeviceService} from './argon-device-service';
import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service';
import {NativescriptViewService} from './argon-view-service';
import {Util} from './util';
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

        this.ready = new Promise((resolve) => {
            this._resolveReady = resolve;
        })
    }

    setReady() {
        const container = new Argon.DI.Container;
        container.registerSingleton(Argon.DeviceService, NativescriptDeviceService);
        container.registerSingleton(Argon.VuforiaServiceDelegate, NativescriptVuforiaServiceDelegate);
        container.registerSingleton(Argon.ViewService, NativescriptViewService);

        const manager = this.manager = Argon.init({
            container, 
            configuration: {
                role: Argon.Role.MANAGER,
                name: 'ArgonApp'
            }
        });

        manager.reality.default = Argon.RealityViewer.LIVE;

        manager.reality.installedEvent.addEventListener(({viewer})=>{
            let item = bookmarks.realityMap.get(viewer.uri);
            if (!item) {
                item = new bookmarks.BookmarkItem({uri: viewer.uri});
                bookmarks.realityList.push();
            }
        });

        manager.reality.uninstalledEvent.addEventListener(({viewer})=>{
            const item = bookmarks.realityMap.get(viewer.uri);
            if (item && !item.builtin) {
                var i = bookmarks.realityList.indexOf(item);
                bookmarks.realityList.splice(i, 1);
            }
        });
        
        manager.focus.sessionFocusEvent.addEventListener(({current})=>{
            console.log("Argon focus changed: " + (current ? current.uri : undefined));
        });

        manager.vuforia.isAvailable().then((available)=>{
            if (available) {
                const primaryVuforiaLicenseKey = Util.getInternalVuforiaKey();
                if (!primaryVuforiaLicenseKey) {
                    alert("Unable to locate Vuforia License Key");
                    return;
                }
                manager.vuforia.initWithUnencryptedKey({key:primaryVuforiaLicenseKey}).catch((err)=>{
                    alert(err.message);
                });
            }
        })
        
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
        this.set('viewerEnabled', !this.viewerEnabled);
    }
    
    setViewerEnabled(enabled:boolean) {
        this.set('viewerEnabled', enabled);
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