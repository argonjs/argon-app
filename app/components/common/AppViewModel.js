"use strict";
var observable_1 = require('data/observable');
var bookmarks_1 = require('./bookmarks');
var LayerDetails = (function (_super) {
    __extends(LayerDetails, _super);
    function LayerDetails() {
        _super.apply(this, arguments);
        this.isArgonChannel = false;
        this.url = '';
        this.title = '';
        this.supportedInteractionModes = [];
    }
    return LayerDetails;
}(observable_1.Observable));
exports.LayerDetails = LayerDetails;
var AppViewModel = (function (_super) {
    __extends(AppViewModel, _super);
    function AppViewModel() {
        var _this = this;
        _super.call(this);
        this.menuOpen = false;
        this.cancelButtonShown = false;
        this.realityChooserOpen = false;
        this.overviewOpen = false;
        this.bookmarksOpen = false;
        this.debugEnabled = false;
        this.viewerEnabled = false;
        this.interactionMode = 'immersive';
        this.interactionModeButtonEnabled = false;
        this.layerDetails = new LayerDetails();
        this.currentUrl = '';
        this.isFavorite = false;
        bookmarks_1.favoriteList.on('change', function () {
            setTimeout(function () {
                _this.updateFavoriteStatus();
            });
        });
    }
    AppViewModel.prototype.toggleMenu = function () {
        this.set('menuOpen', !this.menuOpen);
    };
    AppViewModel.prototype.hideMenu = function () {
        this.set('menuOpen', false);
    };
    AppViewModel.prototype.toggleInteractionMode = function () {
        this.set('interactionMode', this.interactionMode === 'page' ? 'immersive' : 'page');
    };
    AppViewModel.prototype.setInteractionMode = function (mode) {
        this.set('interactionMode', mode);
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
    AppViewModel.prototype.showRealityChooser = function () {
        this.set('realityChooserOpen', true);
    };
    AppViewModel.prototype.hideRealityChooser = function () {
        this.set('realityChooserOpen', false);
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
    AppViewModel.prototype.setLayerDetails = function (details) {
        var _this = this;
        this.layerDetails.off('propertyChange');
        this.set('layerDetails', details);
        this.set('bookmarksOpen', !details.url);
        details.on('propertyChange', function (data) {
            if (data.propertyName === 'url') {
                _this.set('currentUrl', details.url);
                _this.updateFavoriteStatus();
            }
        });
        this.set('currentUrl', details.url);
        this.updateFavoriteStatus();
    };
    AppViewModel.prototype.updateFavoriteStatus = function () {
        this.set('isFavorite', !!bookmarks_1.favoriteMap.get(this.currentUrl));
    };
    AppViewModel.prototype.loadUrl = function (url) {
        this.notify({
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url: url
        });
        this.layerDetails.set('url', url);
        this.set('bookmarksOpen', !url);
    };
    AppViewModel.loadUrlEvent = 'loadUrl';
    return AppViewModel;
}(observable_1.Observable));
exports.AppViewModel = AppViewModel;
exports.appViewModel = new AppViewModel;
//# sourceMappingURL=AppViewModel.js.map