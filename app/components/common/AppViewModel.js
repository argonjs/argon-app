"use strict";
var observable_1 = require("data/observable");
var observable_array_1 = require("data/observable-array");
var bookmarks = require("./bookmarks");
var Argon = require("@argonjs/argon");
var argon_device_service_1 = require("./argon-device-service");
var argon_vuforia_manager_1 = require("./argon-vuforia-manager");
var argon_view_service_1 = require("./argon-view-service");
var argon_reality_viewers_1 = require("./argon-reality-viewers");
var util_1 = require("./util");
var LayerDetails = (function (_super) {
    __extends(LayerDetails, _super);
    function LayerDetails() {
        var _this = _super.apply(this, arguments) || this;
        _this.uri = '';
        _this.title = '';
        _this.log = new observable_array_1.ObservableArray();
        return _this;
    }
    return LayerDetails;
}(observable_1.Observable));
exports.LayerDetails = LayerDetails;
var NativescriptRealityViewerFactory = (function () {
    function NativescriptRealityViewerFactory(_createLiveReality, _createHostedReality) {
        this._createLiveReality = _createLiveReality;
        this._createHostedReality = _createHostedReality;
    }
    NativescriptRealityViewerFactory.prototype.createRealityViewer = function (uri) {
        var viewerType = Argon.RealityViewer.getType(uri);
        switch (viewerType) {
            case Argon.RealityViewer.LIVE:
                var realityViewer = this._createLiveReality();
                realityViewer.uri = uri;
                return realityViewer;
            case 'hosted':
                var realityViewer = this._createHostedReality();
                realityViewer.uri = uri;
                return realityViewer;
            default:
                throw new Error('Unsupported Reality Viewer URI: ' + uri);
        }
    };
    return NativescriptRealityViewerFactory;
}());
NativescriptRealityViewerFactory = __decorate([
    Argon.DI.inject(Argon.DI.Factory.of(argon_reality_viewers_1.NativescriptLiveRealityViewer), Argon.DI.Factory.of(argon_reality_viewers_1.NativescriptHostedRealityViewer))
], NativescriptRealityViewerFactory);
exports.NativescriptRealityViewerFactory = NativescriptRealityViewerFactory;
var AppViewModel = (function (_super) {
    __extends(AppViewModel, _super);
    function AppViewModel() {
        var _this = _super.call(this) || this;
        _this.menuOpen = false;
        _this.cancelButtonShown = false;
        _this.realityChooserOpen = false;
        _this.overviewOpen = false;
        _this.bookmarksOpen = false;
        _this.debugEnabled = false;
        _this.viewerEnabled = false;
        _this.interactionMode = 'immersive';
        _this.interactionModeButtonEnabled = false;
        _this.layerDetails = new LayerDetails(null);
        _this.currentUri = '';
        _this.isFavorite = false;
        bookmarks.favoriteList.on('change', function () {
            setTimeout(function () {
                _this.updateFavoriteStatus();
            });
        });
        _this.ready = new Promise(function (resolve) {
            _this._resolveReady = resolve;
        });
        return _this;
    }
    AppViewModel.prototype.setReady = function () {
        var container = new Argon.DI.Container;
        container.registerSingleton(Argon.DeviceService, argon_device_service_1.NativescriptDeviceService);
        container.registerSingleton(Argon.VuforiaServiceManager, argon_vuforia_manager_1.NativescriptVuforiaServiceManager);
        container.registerSingleton(Argon.ViewService, argon_view_service_1.NativescriptViewService);
        container.registerSingleton(Argon.RealityViewerFactory, NativescriptRealityViewerFactory);
        var manager = this.manager = Argon.init(null, {
            role: Argon.Role.MANAGER,
            title: 'ArgonApp'
        }, container);
        manager.reality.default = Argon.RealityViewer.LIVE;
        manager.reality.installedEvent.addEventListener(function (_a) {
            var viewer = _a.viewer;
            if (!bookmarks.realityMap.get(viewer.uri)) {
                bookmarks.realityList.push(new bookmarks.BookmarkItem({ uri: viewer.uri }));
            }
        });
        manager.reality.uninstalledEvent.addEventListener(function (_a) {
            var viewer = _a.viewer;
            var item = bookmarks.realityMap.get(viewer.uri);
            if (item) {
                var idx = bookmarks.realityList.indexOf(item);
                bookmarks.realityList.splice(idx, 1);
            }
        });
        manager.focus.sessionFocusEvent.addEventListener(function (_a) {
            var current = _a.current;
            console.log("Argon focus changed: " + (current ? current.uri : undefined));
        });
        manager.vuforia.isAvailable().then(function (available) {
            if (available) {
                var primaryVuforiaLicenseKey = util_1.getInternalVuforiaKey();
                if (!primaryVuforiaLicenseKey) {
                    alert("Unable to locate internal Vuforia License Key");
                    return;
                }
                manager.vuforia.initWithUnencryptedKey({ key: primaryVuforiaLicenseKey }).catch(function (err) {
                    alert(err.message);
                });
            }
        });
        this._resolveReady();
    };
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
        this.setViewerEnabled(!this.viewerEnabled);
    };
    AppViewModel.prototype.setViewerEnabled = function (enabled) {
        this.set('viewerEnabled', enabled);
        if (enabled)
            this.manager.view.requestEnterHmd();
        else
            this.manager.view.requestExitHmd();
    };
    AppViewModel.prototype._onLayerDetailsChange = function (data) {
        if (data.propertyName === 'uri') {
            this.set('currentUri', data.value);
            this.updateFavoriteStatus();
        }
    };
    AppViewModel.prototype.setLayerDetails = function (details) {
        this.layerDetails.off('propertyChange', this._onLayerDetailsChange, this);
        this.set('layerDetails', details);
        this.set('bookmarksOpen', !details.uri);
        this.set('currentUri', details.uri);
        this.updateFavoriteStatus();
        details.on('propertyChange', this._onLayerDetailsChange, this);
    };
    AppViewModel.prototype.updateFavoriteStatus = function () {
        this.set('isFavorite', !!bookmarks.favoriteMap.get(this.currentUri));
    };
    AppViewModel.prototype.loadUrl = function (url) {
        this.notify({
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url: url
        });
        this.layerDetails.set('uri', url);
        this.set('bookmarksOpen', !url);
    };
    return AppViewModel;
}(observable_1.Observable));
AppViewModel.loadUrlEvent = 'loadUrl';
exports.AppViewModel = AppViewModel;
exports.appViewModel = new AppViewModel;
//# sourceMappingURL=AppViewModel.js.map