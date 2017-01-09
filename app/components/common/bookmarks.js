"use strict";
var application = require("application");
var applicationSettings = require("application-settings");
var observable_array_1 = require("data/observable-array");
var observable_1 = require("data/observable");
var Argon = require("@argonjs/argon");
var BookmarkItem = (function (_super) {
    __extends(BookmarkItem, _super);
    function BookmarkItem(item) {
        var _this = _super.call(this, item) || this;
        _this.builtin = false;
        return _this;
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
var builtinRealities = [
    new BookmarkItem({ uri: Argon.RealityViewer.LIVE, title: 'Live' })
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
function pushToHistory(url, title) {
    var historyBookmarkItem = historyMap.get(url);
    if (historyBookmarkItem) {
        var i = historyList.indexOf(historyBookmarkItem);
        historyList.splice(i, 1);
        historyList.unshift(historyBookmarkItem);
    }
    else {
        historyList.unshift(new BookmarkItem({
            uri: url,
            title: title
        }));
    }
}
exports.pushToHistory = pushToHistory;
function updateTitle(url, title) {
    var historyBookmarkItem = historyMap.get(url);
    if (historyBookmarkItem) {
        historyBookmarkItem.set('title', title);
    }
}
exports.updateTitle = updateTitle;
//# sourceMappingURL=bookmarks.js.map