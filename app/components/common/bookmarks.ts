import application = require('application');
import applicationSettings = require('application-settings');
import {ObservableArray, ChangedData} from 'data/observable-array';
import {Observable, PropertyChangeData} from 'data/observable';

import * as Argon from 'argon'

class BookmarkItem extends Observable {
    key = 'url';
    name:string;
    url:string;
    builtin = false;
    
    constructor(item:{
        name:string,
        url:string,
        [other:string]:any
    }) {
        super(item)
    }
}

class RealityBookmarkItem extends BookmarkItem {
    key = 'reality';
    reality: Argon.RealityView
    
    constructor(
        reality:Argon.RealityView
    ) {
        super({
            reality,
            name: reality.name,
            url: reality['url'] || 'reality:' + reality.type
        })
    }
}

const favoriteList = new ObservableArray<BookmarkItem>();
const historyList = new ObservableArray<BookmarkItem>();
const realityList = new ObservableArray<RealityBookmarkItem>();

const favoriteMap = new Map<string, BookmarkItem>();
const historyMap = new Map<string, BookmarkItem>();
const realityMap = new WeakMap<Argon.RealityView, RealityBookmarkItem>();

function updateMap(data:ChangedData<BookmarkItem>, map:WeakMap<any, BookmarkItem>) {
    const list = <ObservableArray<BookmarkItem>>data.object
    for (let i=0; i < data.addedCount; i++) {
        var item = list.getItem(data.index + i);
        map.set(item[item.key], item);
    }
    data.removed && data.removed.forEach((item)=>{
        map.delete(item[item.key]);
    })
}

favoriteList.on('change', (data) => updateMap(data, favoriteMap));
historyList.on('change', (data) => updateMap(data, historyMap));
realityList.on('change', (data) => updateMap(data, realityMap));

const builtinFavorites:Array<BookmarkItem> = [
    new BookmarkItem({
        name: 'Argon Samples',
        url: 'http://argonjs.io/samples/'
    })
]

builtinFavorites.forEach((item)=> { 
    item.builtin = true;
    favoriteList.push(item);
});

const LIVE_VIDEO_REALITY = {
    name: 'Live Video',
    type: 'live-video'
}

const builtinRealities:Array<RealityBookmarkItem> = [
    new RealityBookmarkItem(LIVE_VIDEO_REALITY)
]

builtinRealities.forEach((item)=> { 
    item.builtin = true;
    realityList.push(item);
});

const FAVORITE_LIST_KEY = 'favorite_list';
const HISTORY_LIST_KEY = 'history_list';

if (applicationSettings.hasKey(FAVORITE_LIST_KEY)) {
    favoriteList.push(JSON.parse(applicationSettings.getString(FAVORITE_LIST_KEY)));
}

application.on(application.suspendEvent, ()=>{
    const userFavorites = favoriteList.filter((item)=>!item.builtin);
    applicationSettings.setString(FAVORITE_LIST_KEY, JSON.stringify(userFavorites));
})

if (applicationSettings.hasKey(HISTORY_LIST_KEY)) {
    historyList.push(JSON.parse(applicationSettings.getString(HISTORY_LIST_KEY)));
}

application.on(application.suspendEvent, ()=>{
    applicationSettings.setString(HISTORY_LIST_KEY, JSON.stringify(historyList));
})

export {
    BookmarkItem,
    RealityBookmarkItem,
    favoriteList,
    historyList,
    realityList,
    favoriteMap,
    historyMap,
    realityMap,
    LIVE_VIDEO_REALITY
}