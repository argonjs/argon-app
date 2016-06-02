"use strict";
var application = require('application');
var applicationSettings = require('application-settings');
var observable_array_1 = require('data/observable-array');
var observable_1 = require('data/observable');
var BookmarkItem = (function (_super) {
    __extends(BookmarkItem, _super);
    function BookmarkItem(item) {
        _super.call(this, item);
        this.key = 'url';
        this.builtin = false;
    }
    return BookmarkItem;
}(observable_1.Observable));
exports.BookmarkItem = BookmarkItem;
var RealityBookmarkItem = (function (_super) {
    __extends(RealityBookmarkItem, _super);
    function RealityBookmarkItem(reality) {
        _super.call(this, {
            reality: reality,
            name: reality.name,
            url: reality['url'] || 'reality:' + reality.type
        });
        this.key = 'reality';
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
var realityMap = new WeakMap();
exports.realityMap = realityMap;
function updateMap(data, map) {
    var list = data.object;
    for (var i = 0; i < data.addedCount; i++) {
        var item = list.getItem(data.index + i);
        map.set(item[item.key], item);
    }
    data.removed && data.removed.forEach(function (item) {
        map.delete(item[item.key]);
    });
}
favoriteList.on('change', function (data) { return updateMap(data, favoriteMap); });
historyList.on('change', function (data) { return updateMap(data, historyMap); });
realityList.on('change', function (data) { return updateMap(data, realityMap); });
var builtinFavorites = [
    new BookmarkItem({
        name: 'Argon Samples',
        url: 'http://argonjs.io/samples/'
    })
];
builtinFavorites.forEach(function (item) {
    item.builtin = true;
    favoriteList.push(item);
});
var LIVE_VIDEO_REALITY = {
    name: 'Live Video',
    type: 'live-video'
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
    favoriteList.push(JSON.parse(applicationSettings.getString(FAVORITE_LIST_KEY)));
}
application.on(application.suspendEvent, function () {
    var userFavorites = favoriteList.filter(function (item) { return !item.builtin; });
    applicationSettings.setString(FAVORITE_LIST_KEY, JSON.stringify(userFavorites));
});
if (applicationSettings.hasKey(HISTORY_LIST_KEY)) {
    historyList.push(JSON.parse(applicationSettings.getString(HISTORY_LIST_KEY)));
}
application.on(application.suspendEvent, function () {
    applicationSettings.setString(HISTORY_LIST_KEY, JSON.stringify(historyList));
});
//# sourceMappingURL=bookmarks.js.map