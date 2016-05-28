import {Observable, EventData} from 'data/observable'

import {BookmarkItem, favoriteList, favoriteMap} from './bookmarks'
import {viewModel as favoritesViewModel} from '../favorites-view/FavoritesView'

export interface LoadUrlEventData extends EventData {
    eventName: 'loadUrl',
    url: string
}

export class AppViewModel extends Observable {
    menuOpen = false;
    cancelButtonShown = false;
    overviewOpen = false;
    bookmarksOpen = false;
    debugEnabled = false;
    viewerEnabled = false;
    currentUrl = '';
    currentUrlIsFavorite = false;
    
    static loadUrlEvent:'loadUrl' = 'loadUrl'
    
    constructor() {
        super();
        favoriteMap.on('propertyChange',()=>{
            this.updateFavoriteStatus();
        })
    }
    
    toggleMenu() {
        this.set('menuOpen', !this.menuOpen);
    }
    
    hideMenu() {
        this.set('menuOpen', false);
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
    
    setCurrentUrl(url:string) {
        this.set('currentUrl', url);
        this.set('bookmarksOpen', !url);
        this.updateFavoriteStatus();
    }
    
    updateFavoriteStatus() {
        this.set('currentUrlIsFavorite', !!favoriteMap.get(this.currentUrl));
    }
    
    loadUrl(url:string) {
        this.notify(<LoadUrlEventData>{
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url
        })
        this.setCurrentUrl(url);
    }
}

export const appViewModel = new AppViewModel;