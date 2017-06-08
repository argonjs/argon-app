import {Observable, PropertyChangeData, EventData} from 'data/observable'
import {ObservableArray} from 'data/observable-array'
import * as bookmarks from './bookmarks'
import * as Argon from '@argonjs/argon';
import {NativescriptVuforiaServiceProvider} from './argon-vuforia-provider';
import {NativescriptDeviceService, NativescriptDeviceServiceProvider} from './argon-device-provider';
import {NativescriptLiveRealityViewer, NativescriptHostedRealityViewer} from './argon-reality-viewers';
import {getInternalVuforiaKey} from './util';
import * as URI from 'urijs';
import {LogItem} from 'argon-web-view';
import {PermissionState, PermissionType, Permission, SessionPort} from '@argonjs/argon'
import {permissionManager, PermissionDescriptions} from './permissions'
import config from '../../config';

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

export class AppViewModel extends Observable {  //observable creates data binding between this code and xml UI
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
    currentUri? = '';
    isFavorite = false;
    launchedFromUrl = false;
    enablePermissions = config.ENABLE_PERMISSION_CHECK;
    permissions = {'geolocation': PermissionState.NOT_REQUIRED, 'camera': PermissionState.NOT_REQUIRED, 'world-structure': PermissionState.NOT_REQUIRED};
    permissionDescriptions = PermissionDescriptions;
    permissionMenuOpen = false;

    // currentPermissionSession: SessionPort;  //the focused session
    selectedPermission: Permission;  //type, name, state
    locIcon;    // Stores location icons

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

        this.locIcon = [String.fromCharCode(0xe0c7), String.fromCharCode(0xe0c8)];
    }

    setReady() {
        if (this.argon) return; // already initialized

        const container = new Argon.DI.Container;
        container.registerSingleton(Argon.DeviceService, NativescriptDeviceService);
        container.registerSingleton(Argon.VuforiaServiceProvider, NativescriptVuforiaServiceProvider);
        container.registerSingleton(Argon.DeviceServiceProvider, NativescriptDeviceServiceProvider);
        container.registerSingleton(Argon.RealityViewerFactory, NativescriptRealityViewerFactory);

        let argon;
        try {
            argon = this.argon = Argon.init(null, {
                role: Argon.Role.MANAGER,
                title: 'ArgonApp'
            }, container);
        } catch (e) {
            alert(e.message);
        }
        if (!argon) return;

        argon.reality.default = Argon.RealityViewer.LIVE;

        argon.provider.reality.installedEvent.addEventListener(({viewer})=>{
            if (!bookmarks.realityMap.get(viewer.uri)) {
                const bookmark = new bookmarks.BookmarkItem({uri: viewer.uri});
                bookmarks.realityList.push(bookmark);
                if (viewer.session) {
                    bookmark.title = viewer.session.info.title;
                } else {
                    let remove = viewer.connectEvent.addEventListener((session)=>{
                        remove();
                        bookmark.title = session.info.title;
                    });
                }
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

        if (config.ENABLE_PERMISSION_CHECK) {
            argon.provider.permission.handlePermissionRequest = (session, id, options) => {
                return permissionManager.handlePermissionRequest(session, id, options);
            }
            argon.session.connectEvent.addEventListener((session: SessionPort) => {
                session.on['ar.permission.query'] = ({type} : {type: PermissionType}) => {
                    const state: PermissionState = permissionManager.getPermissionStateBySession(session, type) || PermissionState.NOT_REQUIRED;                    
                    return Promise.resolve({state});
                }
            })
            argon.provider.permission.getPermissionState = (session, type) => {
                return permissionManager.getPermissionStateBySession(session, type);
            }
        }

        argon.vuforia.isAvailable().then((available)=>{
            if (available) {
                let licenseKey = getInternalVuforiaKey();

                if (!licenseKey) {
                    setTimeout(()=>alert(`
Congrats,
You have successfully built the Argon Browser! 

Unfortunately, it looks like you are missing a Vuforia License Key. Please supply your own key in "app/config.ts", and try building again!

:D`
                    ),1000);
                    return;
                }
                argon.vuforia.initWithUnencryptedKey(licenseKey).catch((err)=>{
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

    showPermissionIcons() {
        this.ensureReady();
        this.set('enablePermissions', config.ENABLE_PERMISSION_CHECK);
    }
    
    hidePermissionIcons() {
        this.ensureReady();
        this.set('enablePermissions', false);
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
        this.set('isFavorite', !!bookmarks.favoriteMap.get(this.currentUri!));
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

    setPermission(permission: Permission) {
        this.ensureReady();
        this.permissions[permission.type] = permission.state;
        this.notifyPropertyChange("permissions", null);
    }

    togglePermissionMenu(type: PermissionType) {
        this.ensureReady();
        if (!this.permissionMenuOpen)   // If the menu is open
            this.changeSelectedPermission(type);
            
        this.set('permissionMenuOpen', !this.permissionMenuOpen);
    }

    hidePermissionMenu() {
        this.ensureReady();
        this.set('permissionMenuOpen', false);
    }

    changeSelectedPermission(type: PermissionType) {
        this.set('selectedPermission', new Permission(type, this.permissions[type]));
    }

    updatePermissionsFromStorage(uri?: string) {
        permissionManager.loadPermissionsToUI(uri);
    }

    changePermissions() {
        this.ensureReady();
        if (this.selectedPermission.state === PermissionState.GRANTED) {    // If it is currently granted, revoke
            this.permissions[this.selectedPermission.type] = PermissionState.DENIED;
            this.notifyPropertyChange("permissions", null);
            this.changeSelectedPermission(this.selectedPermission.type);    // Update the selected permission UI
            if (this.currentUri) {
                const identifier = URI(this.currentUri).hostname() + URI(this.currentUri).port();
                permissionManager.savePermissionOnMap(identifier, this.selectedPermission.type, PermissionState.DENIED);
            }
        } else {
            this.permissions[this.selectedPermission.type] = PermissionState.GRANTED;
            this.notifyPropertyChange("permissions", null);
            this.changeSelectedPermission(this.selectedPermission.type);    // Update the selected permission UI
            if (this.currentUri) {
                const identifier = URI(this.currentUri).hostname() + URI(this.currentUri).port();
                permissionManager.savePermissionOnMap(identifier, this.selectedPermission.type, PermissionState.GRANTED);
                // const session = this.argon.provider.focus.session;
                // const entityServiceProvider = this.argon.provider.entity;
                // const type = this.selectedPermission.type;
                // // This part mimics the 'ar.entity.subscribe' handler
                // if (session) {
                //     const options = permissionManager.getLastUsedOption(session.uri, type);
                //     const subscriptions = entityServiceProvider.subscriptionsBySubscriber.get(session);
                //     const subscribers = entityServiceProvider.subscribersByEntity.get(type) || new Set<SessionPort>();
                //     entityServiceProvider.subscribersByEntity.set(type, subscribers);
                //     subscribers.add(session);
                //     if (subscriptions) subscriptions.set(type, options);    // This should always happen
                //     entityServiceProvider.sessionSubscribedEvent.raiseEvent({session: session, id: type, options: options});
                // }
            }
        }
    }
}

export const appViewModel = new AppViewModel;