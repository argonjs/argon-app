"use strict";
var observable_1 = require('data/observable');
var bookmarks_1 = require('./bookmarks');
var AppViewModel = (function (_super) {
    __extends(AppViewModel, _super);
    function AppViewModel() {
        var _this = this;
        _super.call(this);
        this.menuOpen = false;
        this.cancelButtonShown = false;
        this.overviewOpen = false;
        this.bookmarksOpen = false;
        this.debugEnabled = false;
        this.viewerEnabled = false;
        this.currentUrl = '';
        this.currentUrlIsFavorite = false;
        bookmarks_1.favoriteMap.on('propertyChange', function () {
            _this.updateFavoriteStatus();
        });
    }
    AppViewModel.prototype.toggleMenu = function () {
        this.set('menuOpen', !this.menuOpen);
    };
    AppViewModel.prototype.hideMenu = function () {
        this.set('menuOpen', false);
    };
    AppViewModel.prototype.showOverview = function () {
        this.set('overviewOpen', true);
    };
    AppViewModel.prototype.hideOverview = function () {
        this.set('overviewOpen', false);
    };
    AppViewModel.prototype.toggleOverview = function () {
        this.set('overviewOpen', !this.overviewOpen);
    };
    AppViewModel.prototype.showBookmarks = function () {
        this.set('bookmarksOpen', true);
    };
    AppViewModel.prototype.hideBookmarks = function () {
        this.set('bookmarksOpen', false);
    };
    AppViewModel.prototype.showCancelButton = function () {
        this.set('cancelButtonShown', true);
    };
    AppViewModel.prototype.hideCancelButton = function () {
        this.set('cancelButtonShown', false);
    };
    AppViewModel.prototype.toggleDebug = function () {
        this.set('debugEnabled', !this.debugEnabled);
    };
    AppViewModel.prototype.setDebugEnabled = function (enabled) {
        this.set('debugEnabled', enabled);
    };
    AppViewModel.prototype.toggleViewer = function () {
        this.set('viewerEnabled', !this.viewerEnabled);
    };
    AppViewModel.prototype.setViewerEnabled = function (enabled) {
        this.set('viewerEnabled', enabled);
    };
    AppViewModel.prototype.setCurrentUrl = function (url) {
        this.set('currentUrl', url);
        this.set('bookmarksOpen', !url);
        this.updateFavoriteStatus();
    };
    AppViewModel.prototype.updateFavoriteStatus = function () {
        this.set('currentUrlIsFavorite', !!bookmarks_1.favoriteMap.get(this.currentUrl));
    };
    AppViewModel.prototype.loadUrl = function (url) {
        this.notify({
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url: url
        });
        this.setCurrentUrl(url);
    };
    AppViewModel.loadUrlEvent = 'loadUrl';
    return AppViewModel;
}(observable_1.Observable));
exports.AppViewModel = AppViewModel;
exports.appViewModel = new AppViewModel;
//# sourceMappingURL=AppViewModel.js.map