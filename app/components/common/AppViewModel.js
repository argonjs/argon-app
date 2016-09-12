"use strict";
var observable_1 = require('data/observable');
var bookmarks = require('./bookmarks');
var Argon = require('@argonjs/argon');
var argon_device_service_1 = require('./argon-device-service');
var argon_reality_service_1 = require('./argon-reality-service');
var argon_vuforia_service_1 = require('./argon-vuforia-service');
var util_1 = require('./util');
var LayerDetails = (function (_super) {
    __extends(LayerDetails, _super);
    function LayerDetails(webView) {
        _super.call(this);
        this.uri = '';
        this.title = '';
        this.supportedInteractionModes = [];
        this.webView = webView;
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
        this.layerDetails = new LayerDetails(null);
        this.currentUri = '';
        this.isFavorite = false;
        bookmarks.favoriteList.on('change', function () {
            setTimeout(function () {
                _this.updateFavoriteStatus();
            });
        });
        this.ready = new Promise(function (resolve) {
            _this._resolveReady = resolve;
        });
    }
    AppViewModel.prototype.setReady = function () {
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
        this.set('viewerEnabled', !this.viewerEnabled);
    };
    AppViewModel.prototype.setViewerEnabled = function (enabled) {
        this.set('viewerEnabled', enabled);
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
    AppViewModel.loadUrlEvent = 'loadUrl';
    return AppViewModel;
}(observable_1.Observable));
exports.AppViewModel = AppViewModel;
exports.appViewModel = new AppViewModel;
var container = new Argon.DI.Container;
container.registerSingleton(Argon.DeviceService, argon_device_service_1.NativescriptDeviceService);
container.registerSingleton(Argon.RealityService, argon_reality_service_1.NativescriptRealityService);
container.registerSingleton(Argon.VuforiaServiceDelegate, argon_vuforia_service_1.NativescriptVuforiaServiceDelegate);
exports.manager = Argon.init({
    container: container,
    configuration: {
        role: Argon.Role.MANAGER,
        name: 'ArgonApp'
    }
});
exports.vuforiaDelegate = container.get(Argon.VuforiaServiceDelegate);
exports.manager.reality.setDefault(bookmarks.LIVE_VIDEO_REALITY);
exports.appViewModel.ready.then(function () {
    exports.manager.vuforia.isAvailable().then(function (available) {
        if (available) {
            var primaryVuforiaLicenseKey = util_1.Util.getInternalVuforiaKey();
            if (!primaryVuforiaLicenseKey) {
                alert("Unable to locate Vuforia License Key");
                return;
            }
            exports.manager.vuforia.initWithUnencryptedKey({ key: primaryVuforiaLicenseKey }).catch(function (err) {
                alert(err.message);
            });
        }
    });
});
exports.manager.reality.sessionDesiredRealityChangeEvent.addEventListener(function (_a) {
    var previous = _a.previous, current = _a.current, session = _a.session;
    if (session === exports.manager.session.manager)
        return;
    if (previous) {
        var previousRealityItem = bookmarks.realityMap.get(previous.uri);
        if (previousRealityItem && !previousRealityItem.builtin) {
            var i = bookmarks.realityList.indexOf(previousRealityItem);
            bookmarks.realityList.splice(i, 1);
        }
    }
    if (current) {
        var currentRealityItem = bookmarks.realityMap.get(current.uri);
        if (!currentRealityItem)
            bookmarks.realityList.push(new bookmarks.RealityBookmarkItem(current));
    }
    session.closeEvent.addEventListener(function () {
        var sessionDesiredReality = exports.manager.reality.desiredRealityMap.get(session);
        if (sessionDesiredReality) {
            var sessionDesiredRealityItem = bookmarks.realityMap.get(sessionDesiredReality.uri);
            if (sessionDesiredRealityItem && !sessionDesiredRealityItem.builtin) {
                var i = bookmarks.realityList.indexOf(sessionDesiredRealityItem);
                bookmarks.realityList.splice(i, 1);
            }
        }
    });
});
exports.manager.focus.sessionFocusEvent.addEventListener(function () {
    var focussedSession = exports.manager.focus.getSession();
    console.log("Argon focus changed: " + (focussedSession ? focussedSession.uri : undefined));
});
//# sourceMappingURL=AppViewModel.js.map