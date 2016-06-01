"use strict";
var application = require('application');
var applicationSettings = require('application-settings');
var observable_array_1 = require('data/observable-array');
var observable_1 = require('data/observable');
var BookmarkItem = (function (_super) {
    __extends(BookmarkItem, _super);
    function BookmarkItem(item) {
        _super.call(this, item);
    }
    return BookmarkItem;
}(observable_1.Observable));
exports.BookmarkItem = BookmarkItem;
var BookmarkItemMap = (function (_super) {
    __extends(BookmarkItemMap, _super);
    function BookmarkItemMap() {
        _super.apply(this, arguments);
    }
    BookmarkItemMap.prototype.get = function (name) {
        return _super.prototype.get.call(this, name);
    };
    BookmarkItemMap.prototype.set = function (name, value) {
        return _super.prototype.set.call(this, name, value);
    };
    return BookmarkItemMap;
}(observable_1.Observable));
exports.BookmarkItemMap = BookmarkItemMap;
var RealityBookmarkItem = (function (_super) {
    __extends(RealityBookmarkItem, _super);
    function RealityBookmarkItem(item) {
        _super.call(this, item);
        this.builtin = false;
    }
    Object.defineProperty(RealityBookmarkItem.prototype, "url", {
        get: function () {
            return 'reality:' + this.reality.type;
        },
        enumerable: true,
        configurable: true
    });
    return RealityBookmarkItem;
}(observable_1.Observable));
exports.RealityBookmarkItem = RealityBookmarkItem;
var RealityBookmarkItemMap = (function (_super) {
    __extends(RealityBookmarkItemMap, _super);
    function RealityBookmarkItemMap() {
        _super.apply(this, arguments);
    }
    RealityBookmarkItemMap.prototype.get = function (name) {
        return _super.prototype.get.call(this, name);
    };
    RealityBookmarkItemMap.prototype.set = function (name, value) {
        return _super.prototype.set.call(this, name, value);
    };
    return RealityBookmarkItemMap;
}(observable_1.Observable));
var favoriteList = new observable_array_1.ObservableArray();
exports.favoriteList = favoriteList;
var historyList = new observable_array_1.ObservableArray();
exports.historyList = historyList;
var realityList = new observable_array_1.ObservableArray();
exports.realityList = realityList;
var favoriteMap = new BookmarkItemMap();
exports.favoriteMap = favoriteMap;
var historyMap = new BookmarkItemMap();
exports.historyMap = historyMap;
var realityMap = new RealityBookmarkItemMap();
exports.realityMap = realityMap;
function updateMap(data, map) {
    var list = data.object;
    for (var i = 0; i < data.addedCount; i++) {
        var item = list.getItem(data.index + i);
        map.set(item.url, item);
    }
    data.removed && data.removed.forEach(function (item) {
        map.set(item.url, undefined);
    });
}
function updateList(data, list) {
    var map = data.object;
    if (data.value) {
        if (list.indexOf(data.value) === -1) {
            list.push(data.value);
        }
        ;
    }
    else {
        var url = data.propertyName;
        var matches = list.filter(function (item) { return item.url === url; });
        matches.forEach(function (item) {
            var i = list.indexOf(item);
            if (i > -1)
                list.splice(i, 1);
        });
    }
}
favoriteList.on('change', function (data) { return updateMap(data, favoriteMap); });
favoriteMap.on('propertyChange', function (data) { return updateList(data, favoriteList); });
historyList.on('change', function (data) { return updateMap(data, historyMap); });
historyMap.on('propertyChange', function (data) { return updateList(data, historyList); });
realityList.on('change', function (data) { return updateMap(data, realityMap); });
realityMap.on('propertyChange', function (data) { return updateList(data, realityList); });
var builtinFavorites = [
    new BookmarkItem({
        url: 'http://argonjs.io/samples/',
        title: 'Argon Samples'
    })
];
var builtinFavoritesSet = new Set();
builtinFavorites.forEach(function (item) { return favoriteList.push(item); });
builtinFavorites.forEach(function (item) { return builtinFavoritesSet.add(item.url); });
var builtinRealities = [
    new RealityBookmarkItem({
        title: 'Live Video',
        reality: {
            type: 'live-video'
        }
    })
];
var builtinRealitiesSet = new Set();
builtinRealities.forEach(function (item) { return item.set('builtin', true); });
builtinRealities.forEach(function (item) { return realityList.push(item); });
builtinRealities.forEach(function (item) { return builtinRealitiesSet.add(item.url); });
var FAVORITE_LIST_KEY = 'favorite_list';
var HISTORY_LIST_KEY = 'history_list';
if (applicationSettings.hasKey(FAVORITE_LIST_KEY)) {
    favoriteList.push(JSON.parse(applicationSettings.getString(FAVORITE_LIST_KEY)));
}
application.on(application.suspendEvent, function () {
    var filteredFavorites = favoriteList.filter(function (item) { return !builtinFavoritesSet.has(item.url); });
    applicationSettings.setString(FAVORITE_LIST_KEY, JSON.stringify(filteredFavorites));
});
if (applicationSettings.hasKey(HISTORY_LIST_KEY)) {
    historyList.push(JSON.parse(applicationSettings.getString(HISTORY_LIST_KEY)));
}
application.on(application.suspendEvent, function () {
    applicationSettings.setString(HISTORY_LIST_KEY, JSON.stringify(historyList));
});
//# sourceMappingURL=bookmarks.js.map