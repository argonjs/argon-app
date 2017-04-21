import application = require('application');
import applicationSettings = require('application-settings');
import {ObservableArray, ChangedData} from 'data/observable-array';
import {Observable} from 'data/observable';

import * as Argon from '@argonjs/argon'

class BookmarkItem extends Observable {
    title?:string;
    uri:string;
    builtin = false;
    
    constructor(item:{
        title?:string,
        uri:string
    }) {
        super(item);
        const uri = item.uri;
        // reuse an existing BookmarkItem if one exists
        if (historyMap.has(uri)) return historyMap.get(uri)!; 
        if (realityMap.has(uri)) return realityMap.get(uri)!; 
        if (favoriteMap.has(uri)) return favoriteMap.get(uri)!; 
        return this;
    }
    
    toJSON() {
        return {
            title: this.title,
            uri: this.uri
        }
    }
}

const favoriteList = new ObservableArray<BookmarkItem>();
const historyList = new ObservableArray<BookmarkItem>();
const realityList = new ObservableArray<BookmarkItem>();

const favoriteMap = new Map<string, BookmarkItem>();
const historyMap = new Map<string, BookmarkItem>();
const realityMap = new Map<string, BookmarkItem>();

function updateMap(data:ChangedData<BookmarkItem>, map:Map<string, BookmarkItem>) {
    const list = <ObservableArray<BookmarkItem>>data.object
    for (let i=0; i < data.addedCount; i++) {
        var item = list.getItem(data.index + i);
        map.set(item.uri, item);
    }
    data.removed && data.removed.forEach((item)=>{
        map.delete(item.uri);
    })
}

favoriteList.on('change', (data) => updateMap(data, favoriteMap));
historyList.on('change', (data) => updateMap(data, historyMap));
realityList.on('change', (data) => updateMap(data, realityMap));

const builtinFavorites:Array<BookmarkItem> = [
    new BookmarkItem({
        title: 'Argon Help',
<<<<<<< HEAD
        uri: 'http://app.argonjs.io/'
=======
        uri: 'https://app.argonjs.io/'
>>>>>>> origin/develop
    }),
    new BookmarkItem({
        title: 'Argon Samples',
        uri: 'https://samples.argonjs.io/'
    }),
    new BookmarkItem({
        title: 'Argon-AFrame Samples',
        uri: 'https://aframe.argonjs.io/'
<<<<<<< HEAD
    }),
    new BookmarkItem({
        title: 'Credits',
        uri: 'http://www.argonjs.io/#support'
=======
>>>>>>> origin/develop
    })
]

builtinFavorites.forEach((item)=> { 
    item.builtin = true;
    favoriteList.push(item);
});

const builtinRealities:Array<BookmarkItem> = [
    new BookmarkItem({uri:Argon.RealityViewer.LIVE, title:'Live'})
]

builtinRealities.forEach((item)=> { 
    item.builtin = true;
    realityList.push(item);
});

const FAVORITE_LIST_KEY = 'favorite_list';
const HISTORY_LIST_KEY = 'history_list';

if (applicationSettings.hasKey(FAVORITE_LIST_KEY)) {
    console.log(applicationSettings.getString(FAVORITE_LIST_KEY))
    const savedFavorites:Array<BookmarkItem> = JSON.parse(applicationSettings.getString(FAVORITE_LIST_KEY));
    savedFavorites.forEach((item)=>{
        if (!favoriteMap.has(item.uri))
            favoriteList.push(new BookmarkItem(item));
    });
}

if (applicationSettings.hasKey(HISTORY_LIST_KEY)) {
    console.log(applicationSettings.getString(HISTORY_LIST_KEY))
    const savedHistory:Array<BookmarkItem> = JSON.parse(applicationSettings.getString(HISTORY_LIST_KEY));
    savedHistory.forEach((item)=>{
        historyList.push(new BookmarkItem(item));
    });
}

function saveFavorites() {
    const userFavorites = favoriteList.filter((item)=>!item.builtin);
    applicationSettings.setString(FAVORITE_LIST_KEY, JSON.stringify(userFavorites));
}

function saveHistory() {
    const history = historyList.map((item)=>item); // convert to standard array
    applicationSettings.setString(HISTORY_LIST_KEY, JSON.stringify(history));
}

function saveBookmarks() {
    saveFavorites();
    saveHistory();
}

application.on(application.suspendEvent,saveBookmarks);
favoriteList.on('change', saveFavorites);
historyList.on('change', saveHistory);

export {
    BookmarkItem,
    favoriteList,
    historyList,
    realityList,
    favoriteMap,
    historyMap,
    realityMap
}

export function pushToHistory(url:string, title?:string) {
    const historyBookmarkItem = historyMap.get(url);
    if (historyBookmarkItem) {
        let i = historyList.indexOf(historyBookmarkItem);
        historyList.splice(i, 1);
        historyList.unshift(historyBookmarkItem);
    } else {
        historyList.unshift(new BookmarkItem({
            uri: url,
            title: title
        }))
    }
}

export function updateTitle(url:string, title:string) {
    var historyBookmarkItem = historyMap.get(url);
    if (historyBookmarkItem && !historyBookmarkItem.builtin) {
        historyBookmarkItem.set('title', title);
    }
}