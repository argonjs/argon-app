"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        var uri = item.uri;
        // reuse an existing BookmarkItem if one exists
        if (historyMap.has(uri))
            return historyMap.get(uri);
        if (realityMap.has(uri))
            return realityMap.get(uri);
        if (favoriteMap.has(uri))
            return favoriteMap.get(uri);
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
        uri: 'http://app.argonjs.io/'
    }),
    new BookmarkItem({
        title: 'Argon Samples',
        uri: 'https://samples.argonjs.io/'
    }),
    new BookmarkItem({
        title: 'Argon-AFrame Samples',
        uri: 'https://aframe.argonjs.io/'
    }),
    new BookmarkItem({
        title: 'Credits',
        uri: 'http://www.argonjs.io/#support'
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
        if (!favoriteMap.has(item.uri))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9va21hcmtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYm9va21hcmtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTRDO0FBQzVDLDBEQUE2RDtBQUM3RCwwREFBbUU7QUFDbkUsOENBQTJDO0FBRTNDLHNDQUF1QztBQUV2QztJQUEyQixnQ0FBVTtJQUtqQyxzQkFBWSxJQUdYO1FBSEQsWUFJSSxrQkFBTSxJQUFJLENBQUMsU0FPZDtRQWJELGFBQU8sR0FBRyxLQUFLLENBQUM7UUFPWixJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JCLCtDQUErQztRQUMvQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUM7UUFDckQsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDO1FBQ3JELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQztRQUN2RCxNQUFNLENBQUMsS0FBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCw2QkFBTSxHQUFOO1FBQ0ksTUFBTSxDQUFDO1lBQ0gsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztTQUNoQixDQUFBO0lBQ0wsQ0FBQztJQUNMLG1CQUFDO0FBQUQsQ0FBQyxBQXhCRCxDQUEyQix1QkFBVSxHQXdCcEM7QUFrR0csb0NBQVk7QUFoR2hCLElBQU0sWUFBWSxHQUFHLElBQUksa0NBQWUsRUFBZ0IsQ0FBQztBQWlHckQsb0NBQVk7QUFoR2hC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RUFBRSxHQUFHO1lBQ1IsS0FBSyxFQUFFLEtBQUs7U0FDZixDQUFDLENBQUMsQ0FBQTtJQUNQLENBQUM7QUFDTCxDQUFDO0FBWkQsc0NBWUM7QUFFRCxxQkFBNEIsR0FBVSxFQUFFLEtBQVk7SUFDaEQsSUFBSSxtQkFBbUIsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUN0QixtQkFBbUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDTCxDQUFDO0FBTEQsa0NBS0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBwbGljYXRpb24gPSByZXF1aXJlKCdhcHBsaWNhdGlvbicpO1xuaW1wb3J0IGFwcGxpY2F0aW9uU2V0dGluZ3MgPSByZXF1aXJlKCdhcHBsaWNhdGlvbi1zZXR0aW5ncycpO1xuaW1wb3J0IHtPYnNlcnZhYmxlQXJyYXksIENoYW5nZWREYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbidcblxuY2xhc3MgQm9va21hcmtJdGVtIGV4dGVuZHMgT2JzZXJ2YWJsZSB7XG4gICAgdGl0bGU/OnN0cmluZztcbiAgICB1cmk6c3RyaW5nO1xuICAgIGJ1aWx0aW4gPSBmYWxzZTtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihpdGVtOntcbiAgICAgICAgdGl0bGU/OnN0cmluZyxcbiAgICAgICAgdXJpOnN0cmluZ1xuICAgIH0pIHtcbiAgICAgICAgc3VwZXIoaXRlbSk7XG4gICAgICAgIGNvbnN0IHVyaSA9IGl0ZW0udXJpO1xuICAgICAgICAvLyByZXVzZSBhbiBleGlzdGluZyBCb29rbWFya0l0ZW0gaWYgb25lIGV4aXN0c1xuICAgICAgICBpZiAoaGlzdG9yeU1hcC5oYXModXJpKSkgcmV0dXJuIGhpc3RvcnlNYXAuZ2V0KHVyaSkhOyBcbiAgICAgICAgaWYgKHJlYWxpdHlNYXAuaGFzKHVyaSkpIHJldHVybiByZWFsaXR5TWFwLmdldCh1cmkpITsgXG4gICAgICAgIGlmIChmYXZvcml0ZU1hcC5oYXModXJpKSkgcmV0dXJuIGZhdm9yaXRlTWFwLmdldCh1cmkpITsgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgICB0b0pTT04oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogdGhpcy50aXRsZSxcbiAgICAgICAgICAgIHVyaTogdGhpcy51cmlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY29uc3QgZmF2b3JpdGVMaXN0ID0gbmV3IE9ic2VydmFibGVBcnJheTxCb29rbWFya0l0ZW0+KCk7XG5jb25zdCBoaXN0b3J5TGlzdCA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8Qm9va21hcmtJdGVtPigpO1xuY29uc3QgcmVhbGl0eUxpc3QgPSBuZXcgT2JzZXJ2YWJsZUFycmF5PEJvb2ttYXJrSXRlbT4oKTtcblxuY29uc3QgZmF2b3JpdGVNYXAgPSBuZXcgTWFwPHN0cmluZywgQm9va21hcmtJdGVtPigpO1xuY29uc3QgaGlzdG9yeU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBCb29rbWFya0l0ZW0+KCk7XG5jb25zdCByZWFsaXR5TWFwID0gbmV3IE1hcDxzdHJpbmcsIEJvb2ttYXJrSXRlbT4oKTtcblxuZnVuY3Rpb24gdXBkYXRlTWFwKGRhdGE6Q2hhbmdlZERhdGE8Qm9va21hcmtJdGVtPiwgbWFwOk1hcDxzdHJpbmcsIEJvb2ttYXJrSXRlbT4pIHtcbiAgICBjb25zdCBsaXN0ID0gPE9ic2VydmFibGVBcnJheTxCb29rbWFya0l0ZW0+PmRhdGEub2JqZWN0XG4gICAgZm9yIChsZXQgaT0wOyBpIDwgZGF0YS5hZGRlZENvdW50OyBpKyspIHtcbiAgICAgICAgdmFyIGl0ZW0gPSBsaXN0LmdldEl0ZW0oZGF0YS5pbmRleCArIGkpO1xuICAgICAgICBtYXAuc2V0KGl0ZW0udXJpLCBpdGVtKTtcbiAgICB9XG4gICAgZGF0YS5yZW1vdmVkICYmIGRhdGEucmVtb3ZlZC5mb3JFYWNoKChpdGVtKT0+e1xuICAgICAgICBtYXAuZGVsZXRlKGl0ZW0udXJpKTtcbiAgICB9KVxufVxuXG5mYXZvcml0ZUxpc3Qub24oJ2NoYW5nZScsIChkYXRhKSA9PiB1cGRhdGVNYXAoZGF0YSwgZmF2b3JpdGVNYXApKTtcbmhpc3RvcnlMaXN0Lm9uKCdjaGFuZ2UnLCAoZGF0YSkgPT4gdXBkYXRlTWFwKGRhdGEsIGhpc3RvcnlNYXApKTtcbnJlYWxpdHlMaXN0Lm9uKCdjaGFuZ2UnLCAoZGF0YSkgPT4gdXBkYXRlTWFwKGRhdGEsIHJlYWxpdHlNYXApKTtcblxuY29uc3QgYnVpbHRpbkZhdm9yaXRlczpBcnJheTxCb29rbWFya0l0ZW0+ID0gW1xuICAgIG5ldyBCb29rbWFya0l0ZW0oe1xuICAgICAgICB0aXRsZTogJ0FyZ29uIEhlbHAnLFxuICAgICAgICB1cmk6ICdodHRwOi8vYXJnb25qcy5pby9hcmdvbi1hcHAvJ1xuICAgIH0pLFxuICAgIG5ldyBCb29rbWFya0l0ZW0oe1xuICAgICAgICB0aXRsZTogJ0FyZ29uIFNhbXBsZXMnLFxuICAgICAgICB1cmk6ICdodHRwczovL3NhbXBsZXMuYXJnb25qcy5pby8nXG4gICAgfSksXG4gICAgbmV3IEJvb2ttYXJrSXRlbSh7XG4gICAgICAgIHRpdGxlOiAnQXJnb24tQUZyYW1lIFNhbXBsZXMnLFxuICAgICAgICB1cmk6ICdodHRwczovL2FmcmFtZS5hcmdvbmpzLmlvLydcbiAgICB9KSxcbiAgICBuZXcgQm9va21hcmtJdGVtKHtcbiAgICAgICAgdGl0bGU6ICdDcmVkaXRzJyxcbiAgICAgICAgdXJpOiAnaHR0cDovL3d3dy5hcmdvbmpzLmlvLyNzdXBwb3J0J1xuICAgIH0pXG5dXG5cbmJ1aWx0aW5GYXZvcml0ZXMuZm9yRWFjaCgoaXRlbSk9PiB7IFxuICAgIGl0ZW0uYnVpbHRpbiA9IHRydWU7XG4gICAgZmF2b3JpdGVMaXN0LnB1c2goaXRlbSk7XG59KTtcblxuY29uc3QgYnVpbHRpblJlYWxpdGllczpBcnJheTxCb29rbWFya0l0ZW0+ID0gW1xuICAgIG5ldyBCb29rbWFya0l0ZW0oe3VyaTpBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkUsIHRpdGxlOidMaXZlJ30pXG5dXG5cbmJ1aWx0aW5SZWFsaXRpZXMuZm9yRWFjaCgoaXRlbSk9PiB7IFxuICAgIGl0ZW0uYnVpbHRpbiA9IHRydWU7XG4gICAgcmVhbGl0eUxpc3QucHVzaChpdGVtKTtcbn0pO1xuXG5jb25zdCBGQVZPUklURV9MSVNUX0tFWSA9ICdmYXZvcml0ZV9saXN0JztcbmNvbnN0IEhJU1RPUllfTElTVF9LRVkgPSAnaGlzdG9yeV9saXN0JztcblxuaWYgKGFwcGxpY2F0aW9uU2V0dGluZ3MuaGFzS2V5KEZBVk9SSVRFX0xJU1RfS0VZKSkge1xuICAgIGNvbnNvbGUubG9nKGFwcGxpY2F0aW9uU2V0dGluZ3MuZ2V0U3RyaW5nKEZBVk9SSVRFX0xJU1RfS0VZKSlcbiAgICBjb25zdCBzYXZlZEZhdm9yaXRlczpBcnJheTxCb29rbWFya0l0ZW0+ID0gSlNPTi5wYXJzZShhcHBsaWNhdGlvblNldHRpbmdzLmdldFN0cmluZyhGQVZPUklURV9MSVNUX0tFWSkpO1xuICAgIHNhdmVkRmF2b3JpdGVzLmZvckVhY2goKGl0ZW0pPT57XG4gICAgICAgIGlmICghZmF2b3JpdGVNYXAuaGFzKGl0ZW0udXJpKSlcbiAgICAgICAgICAgIGZhdm9yaXRlTGlzdC5wdXNoKG5ldyBCb29rbWFya0l0ZW0oaXRlbSkpO1xuICAgIH0pO1xufVxuXG5pZiAoYXBwbGljYXRpb25TZXR0aW5ncy5oYXNLZXkoSElTVE9SWV9MSVNUX0tFWSkpIHtcbiAgICBjb25zb2xlLmxvZyhhcHBsaWNhdGlvblNldHRpbmdzLmdldFN0cmluZyhISVNUT1JZX0xJU1RfS0VZKSlcbiAgICBjb25zdCBzYXZlZEhpc3Rvcnk6QXJyYXk8Qm9va21hcmtJdGVtPiA9IEpTT04ucGFyc2UoYXBwbGljYXRpb25TZXR0aW5ncy5nZXRTdHJpbmcoSElTVE9SWV9MSVNUX0tFWSkpO1xuICAgIHNhdmVkSGlzdG9yeS5mb3JFYWNoKChpdGVtKT0+e1xuICAgICAgICBoaXN0b3J5TGlzdC5wdXNoKG5ldyBCb29rbWFya0l0ZW0oaXRlbSkpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzYXZlRmF2b3JpdGVzKCkge1xuICAgIGNvbnN0IHVzZXJGYXZvcml0ZXMgPSBmYXZvcml0ZUxpc3QuZmlsdGVyKChpdGVtKT0+IWl0ZW0uYnVpbHRpbik7XG4gICAgYXBwbGljYXRpb25TZXR0aW5ncy5zZXRTdHJpbmcoRkFWT1JJVEVfTElTVF9LRVksIEpTT04uc3RyaW5naWZ5KHVzZXJGYXZvcml0ZXMpKTtcbn1cblxuZnVuY3Rpb24gc2F2ZUhpc3RvcnkoKSB7XG4gICAgY29uc3QgaGlzdG9yeSA9IGhpc3RvcnlMaXN0Lm1hcCgoaXRlbSk9Pml0ZW0pOyAvLyBjb252ZXJ0IHRvIHN0YW5kYXJkIGFycmF5XG4gICAgYXBwbGljYXRpb25TZXR0aW5ncy5zZXRTdHJpbmcoSElTVE9SWV9MSVNUX0tFWSwgSlNPTi5zdHJpbmdpZnkoaGlzdG9yeSkpO1xufVxuXG5mdW5jdGlvbiBzYXZlQm9va21hcmtzKCkge1xuICAgIHNhdmVGYXZvcml0ZXMoKTtcbiAgICBzYXZlSGlzdG9yeSgpO1xufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5zdXNwZW5kRXZlbnQsc2F2ZUJvb2ttYXJrcyk7XG5mYXZvcml0ZUxpc3Qub24oJ2NoYW5nZScsIHNhdmVGYXZvcml0ZXMpO1xuaGlzdG9yeUxpc3Qub24oJ2NoYW5nZScsIHNhdmVIaXN0b3J5KTtcblxuZXhwb3J0IHtcbiAgICBCb29rbWFya0l0ZW0sXG4gICAgZmF2b3JpdGVMaXN0LFxuICAgIGhpc3RvcnlMaXN0LFxuICAgIHJlYWxpdHlMaXN0LFxuICAgIGZhdm9yaXRlTWFwLFxuICAgIGhpc3RvcnlNYXAsXG4gICAgcmVhbGl0eU1hcFxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHVzaFRvSGlzdG9yeSh1cmw6c3RyaW5nLCB0aXRsZT86c3RyaW5nKSB7XG4gICAgY29uc3QgaGlzdG9yeUJvb2ttYXJrSXRlbSA9IGhpc3RvcnlNYXAuZ2V0KHVybCk7XG4gICAgaWYgKGhpc3RvcnlCb29rbWFya0l0ZW0pIHtcbiAgICAgICAgbGV0IGkgPSBoaXN0b3J5TGlzdC5pbmRleE9mKGhpc3RvcnlCb29rbWFya0l0ZW0pO1xuICAgICAgICBoaXN0b3J5TGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGhpc3RvcnlMaXN0LnVuc2hpZnQoaGlzdG9yeUJvb2ttYXJrSXRlbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaGlzdG9yeUxpc3QudW5zaGlmdChuZXcgQm9va21hcmtJdGVtKHtcbiAgICAgICAgICAgIHVyaTogdXJsLFxuICAgICAgICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICAgIH0pKVxuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVRpdGxlKHVybDpzdHJpbmcsIHRpdGxlOnN0cmluZykge1xuICAgIHZhciBoaXN0b3J5Qm9va21hcmtJdGVtID0gaGlzdG9yeU1hcC5nZXQodXJsKTtcbiAgICBpZiAoaGlzdG9yeUJvb2ttYXJrSXRlbSkge1xuICAgICAgICBoaXN0b3J5Qm9va21hcmtJdGVtLnNldCgndGl0bGUnLCB0aXRsZSk7XG4gICAgfVxufSJdfQ==