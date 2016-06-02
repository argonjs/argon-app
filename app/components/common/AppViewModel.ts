import {PropertyChangeData, Observable, EventData} from 'data/observable'

import {BookmarkItem, favoriteList, favoriteMap} from './bookmarks'
import {viewModel as favoritesViewModel} from '../favorites-view/FavoritesView'

export interface LoadUrlEventData extends EventData {
    eventName: 'loadUrl',
    url: string
}

export class LayerDetails extends Observable {
    isArgonChannel = false;
    url = '';
    title = '';
    supportedInteractionModes:Array<InteractionMode> = [];
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
    layerDetails:LayerDetails = new LayerDetails()
    currentUrl = '';
    isFavorite = false;
    
    static loadUrlEvent:'loadUrl' = 'loadUrl'
    
    constructor() {
        super();
        favoriteList.on('change',()=>{
            setTimeout(()=>{
                this.updateFavoriteStatus();
            })
        })
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
    
    setLayerDetails(details:LayerDetails) {
        this.layerDetails.off('propertyChange');
        this.set('layerDetails', details);
        this.set('bookmarksOpen', !details.url);
        details.on('propertyChange', (data:PropertyChangeData) => {
            if (data.propertyName === 'url') {
                this.set('currentUrl', details.url);
                this.updateFavoriteStatus();
            }
        });
        this.set('currentUrl', details.url);
        this.updateFavoriteStatus();
    }
    
    updateFavoriteStatus() {
        this.set('isFavorite', !!favoriteMap.get(this.currentUrl));
    }
    
    loadUrl(url:string) {
        this.notify(<LoadUrlEventData>{
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url
        })
        this.layerDetails.set('url', url);
        this.set('bookmarksOpen', !url);
    }
}

export const appViewModel = new AppViewModel;