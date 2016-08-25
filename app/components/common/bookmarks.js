"use strict";
var application = require('application');
var applicationSettings = require('application-settings');
var observable_array_1 = require('data/observable-array');
var observable_1 = require('data/observable');
var BookmarkItem = (function (_super) {
    __extends(BookmarkItem, _super);
    function BookmarkItem(item) {
        _super.call(this, item);
        this.builtin = false;
    }
    BookmarkItem.prototype.toJSON = function () {
        return {
            title: this.title,
            uri: this.uri
        };
    };
    return BookmarkItem;
}(observable_1.Observable));
exports.BookmarkItem = BookmarkItem;
var RealityBookmarkItem = (function (_super) {
    __extends(RealityBookmarkItem, _super);
    function RealityBookmarkItem(reality) {
        _super.call(this, reality);
        this.reality = reality;
    }
    return RealityBookmarkItem;
}(BookmarkItem));
exports.RealityBookmarkItem = RealityBookmarkItem;
var favoriteList = new observable_array_1.ObservableArray();
exports.favoriteList = favoriteList;
var historyList = new observable_array_1.ObservableArray();
exports.historyList = historyList;
var realityList = new observable_array_1.ObservableArray();
exports.realityList = realityList;
var favoriteMap = new Map();
exports.favoriteMap = favoriteMap;
var historyMap = new Map();
exports.historyMap = historyMap;
var realityMap = new Map();
exports.realityMap = realityMap;
function updateMap(data, map) {
    var list = data.object;
    for (var i = 0; i < data.addedCount; i++) {
        var item = list.getItem(data.index + i);
        map.set(item.uri, item);
    }
    data.removed && data.removed.forEach(function (item) {
        map.delete(item.uri);
    });
}
favoriteList.on('change', function (data) { return updateMap(data, favoriteMap); });
historyList.on('change', function (data) { return updateMap(data, historyMap); });
realityList.on('change', function (data) { return updateMap(data, realityMap); });
var builtinFavorites = [
    new BookmarkItem({
        title: 'Argon Help',
        uri: 'http://argonjs.io/argon-app/'
    }),
    new BookmarkItem({
        title: 'Argon Samples',
        uri: 'http://argonjs.io/samples/'
    }),
    new BookmarkItem({
        title: 'Argon-AFrame Samples',
        uri: 'http://argonjs.io/argon-aframe/'
    })
];
builtinFavorites.forEach(function (item) {
    item.builtin = true;
    favoriteList.push(item);
});
var LIVE_VIDEO_REALITY = {
    title: 'Live Video',
    uri: 'reality:live-video'
};
exports.LIVE_VIDEO_REALITY = LIVE_VIDEO_REALITY;
var builtinRealities = [
    new RealityBookmarkItem(LIVE_VIDEO_REALITY)
];
builtinRealities.forEach(function (item) {
    item.builtin = true;
    realityList.push(item);
});
var FAVORITE_LIST_KEY = 'favorite_list';
var HISTORY_LIST_KEY = 'history_list';
if (applicationSettings.hasKey(FAVORITE_LIST_KEY)) {
    console.log(applicationSettings.getString(FAVORITE_LIST_KEY));
    var savedFavorites = JSON.parse(applicationSettings.getString(FAVORITE_LIST_KEY));
    savedFavorites.forEach(function (item) {
        favoriteList.push(new BookmarkItem(item));
    });
}
if (applicationSettings.hasKey(HISTORY_LIST_KEY)) {
    console.log(applicationSettings.getString(HISTORY_LIST_KEY));
    var savedHistory = JSON.parse(applicationSettings.getString(HISTORY_LIST_KEY));
    savedHistory.forEach(function (item) {
        historyList.push(new BookmarkItem(item));
    });
}
function saveFavorites() {
    var userFavorites = favoriteList.filter(function (item) { return !item.builtin; });
    applicationSettings.setString(FAVORITE_LIST_KEY, JSON.stringify(userFavorites));
}
function saveHistory() {
    var history = historyList.map(function (item) { return item; }); // convert to standard array
    applicationSettings.setString(HISTORY_LIST_KEY, JSON.stringify(history));
}
function saveBookmarks() {
    saveFavorites();
    saveHistory();
}
application.on(application.suspendEvent, saveBookmarks);
favoriteList.on('change', saveFavorites);
historyList.on('change', saveHistory);
//# sourceMappingURL=bookmarks.js.map