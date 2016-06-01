import application = require('application');
import applicationSettings = require('application-settings');
import {ObservableArray, ChangedData} from 'data/observable-array';
import {Observable, PropertyChangeData} from 'data/observable';

import * as Argon from 'argon'

class BookmarkItem extends Observable {
    url:string
    title:string
    
    constructor(item:{
        url:string
        title:string
    }) {
        super(item)
    }
}

class BookmarkItemMap extends Observable {
    get(name:string) : BookmarkItem {
        return super.get(name);
    }
    set(name:string, value:BookmarkItem) {
        return super.set(name, value);
    }
}

class RealityBookmarkItem extends Observable {
    reality:Argon.RealityView
    title:string
    builtin = false
    
    constructor(item:{
        builtin?:boolean,
        title:string,
        reality:Argon.RealityView
    }) {
        super(item);
    }
    
    get url() {
        return 'reality:' + this.reality.type;
    }
}

class RealityBookmarkItemMap extends Observable {
    get(name:string) : RealityBookmarkItem {
        return super.get(name);
    }
    set(name:string, value:RealityBookmarkItem) {
        return super.set(name, value);
    }
}

const favoriteList: ObservableArray<BookmarkItem> = new ObservableArray<BookmarkItem>();
const historyList: ObservableArray<BookmarkItem> = new ObservableArray<BookmarkItem>();
const realityList: ObservableArray<RealityBookmarkItem> = new ObservableArray<RealityBookmarkItem>();

const favoriteMap = new BookmarkItemMap();
const historyMap = new BookmarkItemMap();
const realityMap = new RealityBookmarkItemMap();

function updateMap(data:ChangedData<BookmarkItem>, map:Observable) {
    const list = <ObservableArray<BookmarkItem>>data.object
    for (let i=0; i < data.addedCount; i++) {
        var item = list.getItem(data.index + i);
        map.set(item.url, item);
    }
    data.removed && data.removed.forEach((item)=>{
        map.set(item.url, undefined);
    })
}

function updateList(data:PropertyChangeData, list:ObservableArray<BookmarkItem>) {
    const map:BookmarkItemMap = data.object;
    if (data.value) {
        if (list.indexOf(data.value) === -1) {
            list.push(data.value);
        };
    } else {
        var url = data.propertyName;
        var matches = list.filter((item) => item.url === url);
        matches.forEach((item)=>{
            var i = list.indexOf(item)
            if (i>-1) list.splice(i,1);
        })
    }
}

favoriteList.on('change', (data) => updateMap(data, favoriteMap));
favoriteMap.on('propertyChange', (data:PropertyChangeData)=> updateList(data, favoriteList));
historyList.on('change', (data) => updateMap(data, historyMap));
historyMap.on('propertyChange', (data:PropertyChangeData)=> updateList(data, historyList));
realityList.on('change', (data) => updateMap(data, realityMap));
realityMap.on('propertyChange', (data:PropertyChangeData)=> updateList(data, realityList));

const builtinFavorites:Array<BookmarkItem> = [
    new BookmarkItem({
        url: 'http://argonjs.io/samples/',
        title: 'Argon Samples'
    })
]
const builtinFavoritesSet = new Set<string>();

builtinFavorites.forEach((item)=>favoriteList.push(item));
builtinFavorites.forEach((item)=>builtinFavoritesSet.add(item.url));

const builtinRealities:Array<RealityBookmarkItem> = [
    new RealityBookmarkItem({
        title: 'Live Video',
        reality: {
            type: 'live-video'
        }
    })
]
const builtinRealitiesSet = new Set<string>();

builtinRealities.forEach((item)=>item.set('builtin', true));
builtinRealities.forEach((item)=>realityList.push(item));
builtinRealities.forEach((item)=>builtinRealitiesSet.add(item.url));

const FAVORITE_LIST_KEY = 'favorite_list';
const HISTORY_LIST_KEY = 'history_list';

if (applicationSettings.hasKey(FAVORITE_LIST_KEY)) {
    favoriteList.push(JSON.parse(applicationSettings.getString(FAVORITE_LIST_KEY)));
}

application.on(application.suspendEvent, ()=>{
    const filteredFavorites = favoriteList.filter((item)=>!builtinFavoritesSet.has(item.url));
    applicationSettings.setString(FAVORITE_LIST_KEY, JSON.stringify(filteredFavorites));
})

if (applicationSettings.hasKey(HISTORY_LIST_KEY)) {
    historyList.push(JSON.parse(applicationSettings.getString(HISTORY_LIST_KEY)));
}

application.on(application.suspendEvent, ()=>{
    applicationSettings.setString(HISTORY_LIST_KEY, JSON.stringify(historyList));
})

export {
    BookmarkItem,
    BookmarkItemMap,
    RealityBookmarkItem,
    favoriteList,
    historyList,
    realityList,
    favoriteMap,
    historyMap,
    realityMap
}