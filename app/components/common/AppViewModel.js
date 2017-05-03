"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("data/observable");
var observable_array_1 = require("data/observable-array");
var bookmarks = require("./bookmarks");
var Argon = require("@argonjs/argon");
var argon_vuforia_provider_1 = require("./argon-vuforia-provider");
var argon_device_provider_1 = require("./argon-device-provider");
var argon_reality_viewers_1 = require("./argon-reality-viewers");
var util_1 = require("./util");
var config_1 = require("../../config");
var LayerDetails = (function (_super) {
    __extends(LayerDetails, _super);
    function LayerDetails() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
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
    Argon.DI.inject(Argon.DI.Factory.of(argon_reality_viewers_1.NativescriptLiveRealityViewer), Argon.DI.Factory.of(argon_reality_viewers_1.NativescriptHostedRealityViewer)),
    __metadata("design:paramtypes", [Object, Object])
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
        if (this.argon)
            return; // already initialized
        var container = new Argon.DI.Container;
        container.registerSingleton(Argon.DeviceService, argon_device_provider_1.NativescriptDeviceService);
        container.registerSingleton(Argon.VuforiaServiceProvider, argon_vuforia_provider_1.NativescriptVuforiaServiceProvider);
        container.registerSingleton(Argon.DeviceServiceProvider, argon_device_provider_1.NativescriptDeviceServiceProvider);
        container.registerSingleton(Argon.RealityViewerFactory, NativescriptRealityViewerFactory);
        var argon = this.argon = Argon.init(null, {
            role: Argon.Role.MANAGER,
            title: 'ArgonApp'
        }, container);
        argon.reality.default = Argon.RealityViewer.LIVE;
        argon.provider.reality.installedEvent.addEventListener(function (_a) {
            var viewer = _a.viewer;
            if (!bookmarks.realityMap.get(viewer.uri)) {
                var bookmark_1 = new bookmarks.BookmarkItem({ uri: viewer.uri });
                bookmarks.realityList.push(bookmark_1);
                if (viewer.session) {
                    bookmark_1.title = viewer.session.info.title;
                }
                else {
                    var remove_1 = viewer.connectEvent.addEventListener(function (session) {
                        remove_1();
                        bookmark_1.title = session.info.title;
                    });
                }
            }
        });
        argon.provider.reality.uninstalledEvent.addEventListener(function (_a) {
            var viewer = _a.viewer;
            var item = bookmarks.realityMap.get(viewer.uri);
            if (item) {
                var idx = bookmarks.realityList.indexOf(item);
                bookmarks.realityList.splice(idx, 1);
            }
        });
        argon.provider.focus.sessionFocusEvent.addEventListener(function (_a) {
            var current = _a.current;
            console.log("Argon focus changed: " + (current ? current.uri : undefined));
        });
        argon.vuforia.isAvailable().then(function (available) {
            if (available) {
                var primaryVuforiaLicenseKey = util_1.getInternalVuforiaKey();
                if (config_1.config.DEBUG_DEVELOPMENT_LICENSE_KEY != "")
                    primaryVuforiaLicenseKey = config_1.config.DEBUG_DEVELOPMENT_LICENSE_KEY;
                if (!primaryVuforiaLicenseKey) {
                    alert("Unable to locate internal Vuforia License Key");
                    return;
                }
                argon.vuforia.initWithUnencryptedKey(primaryVuforiaLicenseKey).catch(function (err) {
                    alert(err.message);
                });
            }
        });
        this.setLayerDetails(new LayerDetails(null));
        this._resolveReady();
    };
    AppViewModel.prototype.ensureReady = function () {
        if (!this.argon)
            throw new Error('AppViewModel is not ready');
    };
    AppViewModel.prototype.toggleMenu = function () {
        this.ensureReady();
        this.set('menuOpen', !this.menuOpen);
    };
    AppViewModel.prototype.hideMenu = function () {
        this.ensureReady();
        this.set('menuOpen', false);
    };
    AppViewModel.prototype.toggleInteractionMode = function () {
        this.ensureReady();
        this.set('interactionMode', this.interactionMode === 'page' ? 'immersive' : 'page');
    };
    AppViewModel.prototype.setInteractionMode = function (mode) {
        this.ensureReady();
        this.set('interactionMode', mode);
    };
    AppViewModel.prototype.showOverview = function () {
        this.ensureReady();
        this.set('overviewOpen', true);
    };
    AppViewModel.prototype.hideOverview = function () {
        this.ensureReady();
        this.set('overviewOpen', false);
    };
    AppViewModel.prototype.toggleOverview = function () {
        this.ensureReady();
        this.set('overviewOpen', !this.overviewOpen);
    };
    AppViewModel.prototype.showBookmarks = function () {
        this.ensureReady();
        this.set('bookmarksOpen', true);
    };
    AppViewModel.prototype.hideBookmarks = function () {
        this.ensureReady();
        this.set('bookmarksOpen', false);
    };
    AppViewModel.prototype.showRealityChooser = function () {
        this.ensureReady();
        this.set('realityChooserOpen', true);
    };
    AppViewModel.prototype.hideRealityChooser = function () {
        this.ensureReady();
        this.set('realityChooserOpen', false);
    };
    AppViewModel.prototype.showCancelButton = function () {
        this.ensureReady();
        this.set('cancelButtonShown', true);
    };
    AppViewModel.prototype.hideCancelButton = function () {
        this.ensureReady();
        this.set('cancelButtonShown', false);
    };
    AppViewModel.prototype.toggleDebug = function () {
        this.ensureReady();
        this.set('debugEnabled', !this.debugEnabled);
    };
    AppViewModel.prototype.setDebugEnabled = function (enabled) {
        this.ensureReady();
        this.set('debugEnabled', enabled);
    };
    AppViewModel.prototype.toggleViewer = function () {
        this.ensureReady();
        this.setViewerEnabled(!this.viewerEnabled);
    };
    AppViewModel.prototype.setViewerEnabled = function (enabled) {
        this.ensureReady();
        this.set('viewerEnabled', enabled);
        if (enabled)
            this.argon.device.requestPresentHMD();
        else
            this.argon.device.exitPresentHMD();
    };
    AppViewModel.prototype._onLayerDetailsChange = function (data) {
        this.ensureReady();
        if (data.propertyName === 'uri') {
            this.set('currentUri', data.value);
            this.updateFavoriteStatus();
        }
    };
    AppViewModel.prototype.setLayerDetails = function (details) {
        this.ensureReady();
        this.layerDetails && this.layerDetails.off('propertyChange', this._onLayerDetailsChange, this);
        this.set('layerDetails', details);
        this.set('bookmarksOpen', !details.uri);
        this.set('currentUri', details.uri);
        this.updateFavoriteStatus();
        details.on('propertyChange', this._onLayerDetailsChange, this);
    };
    AppViewModel.prototype.updateFavoriteStatus = function () {
        this.ensureReady();
        this.set('isFavorite', !!bookmarks.favoriteMap.get(this.currentUri));
    };
    AppViewModel.prototype.loadUrl = function (url) {
        this.ensureReady();
        this.notify({
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url: url,
            newLayer: false
        });
        this.layerDetails.set('uri', url);
        this.set('bookmarksOpen', !url);
    };
    AppViewModel.prototype.openUrl = function (url) {
        this.ensureReady();
        this.notify({
            eventName: AppViewModel.loadUrlEvent,
            object: this,
            url: url,
            newLayer: true
        });
        this.layerDetails.set('uri', url);
        this.set('bookmarksOpen', !url);
    };
    return AppViewModel;
}(observable_1.Observable));
AppViewModel.loadUrlEvent = 'loadUrl';
exports.AppViewModel = AppViewModel;
exports.appViewModel = new AppViewModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQXlFO0FBQ3pFLDBEQUFxRDtBQUNyRCx1Q0FBd0M7QUFDeEMsc0NBQXdDO0FBQ3hDLG1FQUE0RTtBQUM1RSxpRUFBcUc7QUFDckcsaUVBQXVHO0FBQ3ZHLCtCQUE2QztBQUU3Qyx1Q0FBb0M7QUFRcEM7SUFBa0MsZ0NBQVU7SUFBNUM7UUFBQSxxRUFJQztRQUhHLFNBQUcsR0FBRyxFQUFFLENBQUM7UUFDVCxXQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ1gsU0FBRyxHQUFHLElBQUksa0NBQWUsRUFBVyxDQUFDOztJQUN6QyxDQUFDO0lBQUQsbUJBQUM7QUFBRCxDQUFDLEFBSkQsQ0FBa0MsdUJBQVUsR0FJM0M7QUFKWSxvQ0FBWTtBQU96QixJQUFzQixnQ0FBZ0M7SUFDbEQsMENBQ1ksa0JBQWtCLEVBQ2xCLG9CQUFvQjtRQURwQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQUE7UUFDbEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFBO0lBQ2hDLENBQUM7SUFFRCw4REFBbUIsR0FBbkIsVUFBb0IsR0FBVTtRQUMxQixJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLEtBQUssS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJO2dCQUN6QixJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDOUMsYUFBYSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7Z0JBQ3hCLE1BQU0sQ0FBQyxhQUFhLENBQUM7WUFDekIsS0FBSyxRQUFRO2dCQUNULElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUNoRCxhQUFhLENB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Qyx1QkFBVTtBQW1CakMseUJBQVksR0FBYSxTQUFTLENBQUE7QUFuQmhDLG9DQUFZO0FBNE9aLFFBQUEsWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtPYnNlcnZhYmxlLCBQcm9wZXJ0eUNoYW5nZURhdGEsIEV2ZW50RGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJ1xuaW1wb3J0IHtPYnNlcnZhYmxlQXJyYXl9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZS1hcnJheSdcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2Jvb2ttYXJrcydcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi12dWZvcmlhLXByb3ZpZGVyJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyfSBmcm9tICcuL2FyZ29uLWRldmljZS1wcm92aWRlcic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdExpdmVSZWFsaXR5Vmlld2VyLCBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyfSBmcm9tICcuL2FyZ29uLXJlYWxpdHktdmlld2Vycyc7XG5pbXBvcnQge2dldEludGVybmFsVnVmb3JpYUtleX0gZnJvbSAnLi91dGlsJztcbmltcG9ydCB7TG9nSXRlbX0gZnJvbSAnYXJnb24td2ViLXZpZXcnO1xuaW1wb3J0IHtjb25maWd9IGZyb20gJy4uLy4uL2NvbmZpZyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZFVybEV2ZW50RGF0YSBleHRlbmRzIEV2ZW50RGF0YSB7XG4gICAgZXZlbnROYW1lOiAnbG9hZFVybCcsXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgbmV3TGF5ZXI6IGJvb2xlYW4sXG59XG5cbmV4cG9ydCBjbGFzcyBMYXllckRldGFpbHMgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICB1cmkgPSAnJztcbiAgICB0aXRsZSA9ICcnO1xuICAgIGxvZyA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8TG9nSXRlbT4oKTtcbn1cblxuQEFyZ29uLkRJLmluamVjdChBcmdvbi5ESS5GYWN0b3J5Lm9mKE5hdGl2ZXNjcmlwdExpdmVSZWFsaXR5Vmlld2VyKSwgQXJnb24uREkuRmFjdG9yeS5vZihOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOYXRpdmVzY3JpcHRSZWFsaXR5Vmlld2VyRmFjdG9yeSB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgX2NyZWF0ZUxpdmVSZWFsaXR5LCBcbiAgICAgICAgcHJpdmF0ZSBfY3JlYXRlSG9zdGVkUmVhbGl0eSkge1xuICAgIH1cblxuICAgIGNyZWF0ZVJlYWxpdHlWaWV3ZXIodXJpOnN0cmluZykgOiBBcmdvbi5SZWFsaXR5Vmlld2VyIHtcbiAgICAgICAgY29uc3Qgdmlld2VyVHlwZSA9IEFyZ29uLlJlYWxpdHlWaWV3ZXIuZ2V0VHlwZSh1cmkpO1xuICAgICAgICBzd2l0Y2ggKHZpZXdlclR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFOlxuICAgICAgICAgICAgICAgIHZhciByZWFsaXR5Vmlld2VyID0gdGhpcy5fY3JlYXRlTGl2ZVJlYWxpdHkoKTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Vmlld2VyLnVyaSA9IHVyaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVhbGl0eVZpZXdlcjtcbiAgICAgICAgICAgIGNhc2UgJ2hvc3RlZCc6XG4gICAgICAgICAgICAgICAgdmFyIHJlYWxpdHlWaWV3ZXIgPSB0aGlzLl9jcmVhdGVIb3N0ZWRSZWFsaXR5KCk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eVZpZXdlci51cmkgPSB1cmk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYWxpdHlWaWV3ZXI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgUmVhbGl0eSBWaWV3ZXIgVVJJOiAnICsgdXJpKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBJbnRlcmFjdGlvbk1vZGUgPSAnaW1tZXJzaXZlJ3wncGFnZSc7XG5cbmV4cG9ydCBjbGFzcyBBcHBWaWV3TW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBtZW51T3BlbiA9IGZhbHNlO1xuICAgIGNhbmNlbEJ1dHRvblNob3duID0gZmFsc2U7XG4gICAgcmVhbGl0eUNob29zZXJPcGVuID0gZmFsc2U7XG4gICAgb3ZlcnZpZXdPcGVuID0gZmFsc2U7XG4gICAgYm9va21hcmtzT3BlbiA9IGZhbHNlO1xuICAgIGRlYnVnRW5hYmxlZCA9IGZhbHNlO1xuICAgIHZpZXdlckVuYWJsZWQgPSBmYWxzZTtcbiAgICBpbnRlcmFjdGlvbk1vZGU6SW50ZXJhY3Rpb25Nb2RlID0gJ2ltbWVyc2l2ZSc7XG4gICAgaW50ZXJhY3Rpb25Nb2RlQnV0dG9uRW5hYmxlZCA9IGZhbHNlO1xuICAgIGxheWVyRGV0YWlsczpMYXllckRldGFpbHM7XG4gICAgY3VycmVudFVyaSA9ICcnO1xuICAgIGlzRmF2b3JpdGUgPSBmYWxzZTtcblxuICAgIHB1YmxpYyBhcmdvbjpBcmdvbi5BcmdvblN5c3RlbTtcblxuICAgIHByaXZhdGUgX3Jlc29sdmVSZWFkeTpGdW5jdGlvbjtcbiAgICByZWFkeTpQcm9taXNlPHZvaWQ+O1xuICAgIFxuICAgIHN0YXRpYyBsb2FkVXJsRXZlbnQ6J2xvYWRVcmwnID0gJ2xvYWRVcmwnXG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Qub24oJ2NoYW5nZScsKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMucmVhZHkgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5ID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0UmVhZHkoKSB7XG4gICAgICAgIGlmICh0aGlzLmFyZ29uKSByZXR1cm47IC8vIGFscmVhZHkgaW5pdGlhbGl6ZWRcblxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBuZXcgQXJnb24uREkuQ29udGFpbmVyO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uRGV2aWNlU2VydmljZSwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSk7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5WdWZvcmlhU2VydmljZVByb3ZpZGVyLCBOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLkRldmljZVNlcnZpY2VQcm92aWRlciwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLlJlYWxpdHlWaWV3ZXJGYWN0b3J5LCBOYXRpdmVzY3JpcHRSZWFsaXR5Vmlld2VyRmFjdG9yeSk7XG5cbiAgICAgICAgY29uc3QgYXJnb24gPSB0aGlzLmFyZ29uID0gQXJnb24uaW5pdChudWxsLCB7XG4gICAgICAgICAgICByb2xlOiBBcmdvbi5Sb2xlLk1BTkFHRVIsXG4gICAgICAgICAgICB0aXRsZTogJ0FyZ29uQXBwJ1xuICAgICAgICB9LCBjb250YWluZXIpO1xuXG4gICAgICAgIGFyZ29uLnJlYWxpdHkuZGVmYXVsdCA9IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRTtcblxuICAgICAgICBhcmdvbi5wcm92aWRlci5yZWFsaXR5Lmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgaWYgKCFib29rbWFya3MucmVhbGl0eU1hcC5nZXQodmlld2VyLnVyaSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBib29rbWFyayA9IG5ldyBib29rbWFya3MuQm9va21hcmtJdGVtKHt1cmk6IHZpZXdlci51cml9KTtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucmVhbGl0eUxpc3QucHVzaChib29rbWFyayk7XG4gICAgICAgICAgICAgICAgaWYgKHZpZXdlci5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrLnRpdGxlID0gdmlld2VyLnNlc3Npb24uaW5mby50aXRsZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcmVtb3ZlID0gdmlld2VyLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKChzZXNzaW9uKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBib29rbWFyay50aXRsZSA9IHNlc3Npb24uaW5mby50aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBhcmdvbi5wcm92aWRlci5yZWFsaXR5LnVuaW5zdGFsbGVkRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe3ZpZXdlcn0pPT57XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gYm9va21hcmtzLnJlYWxpdHlNYXAuZ2V0KHZpZXdlci51cmkpO1xuICAgICAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gYm9va21hcmtzLnJlYWxpdHlMaXN0LmluZGV4T2YoaXRlbSk7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnJlYWxpdHlMaXN0LnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb25Gb2N1c0V2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXJnb24gZm9jdXMgY2hhbmdlZDogXCIgKyAoY3VycmVudCA/IGN1cnJlbnQudXJpIDogdW5kZWZpbmVkKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFyZ29uLnZ1Zm9yaWEuaXNBdmFpbGFibGUoKS50aGVuKChhdmFpbGFibGUpPT57XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHByaW1hcnlWdWZvcmlhTGljZW5zZUtleSA9IGdldEludGVybmFsVnVmb3JpYUtleSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcuREVCVUdfREVWRUxPUE1FTlRfTElDRU5TRV9LRVkgIT0gXCJcIikgcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5ID0gY29uZmlnLkRFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJVbmFibGUgdG8gbG9jYXRlIGludGVybmFsIFZ1Zm9yaWEgTGljZW5zZSBLZXlcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXJnb24udnVmb3JpYS5pbml0V2l0aFVuZW5jcnlwdGVkS2V5KHByaW1hcnlWdWZvcmlhTGljZW5zZUtleSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnNldExheWVyRGV0YWlscyhuZXcgTGF5ZXJEZXRhaWxzKG51bGwpKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3Jlc29sdmVSZWFkeSgpO1xuICAgIH1cblxuICAgIGVuc3VyZVJlYWR5KCkge1xuICAgICAgICBpZiAoIXRoaXMuYXJnb24pIHRocm93IG5ldyBFcnJvcignQXBwVmlld01vZGVsIGlzIG5vdCByZWFkeScpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVNZW51KCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdtZW51T3BlbicsICF0aGlzLm1lbnVPcGVuKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZU1lbnUoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ21lbnVPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVJbnRlcmFjdGlvbk1vZGUoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2ludGVyYWN0aW9uTW9kZScsIHRoaXMuaW50ZXJhY3Rpb25Nb2RlID09PSAncGFnZScgPyAnaW1tZXJzaXZlJyA6ICdwYWdlJylcbiAgICB9XG4gICAgXG4gICAgc2V0SW50ZXJhY3Rpb25Nb2RlKG1vZGU6SW50ZXJhY3Rpb25Nb2RlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2ludGVyYWN0aW9uTW9kZScsIG1vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlT3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlT3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsICF0aGlzLm92ZXJ2aWV3T3Blbik7XG4gICAgfVxuICAgIFxuICAgIHNob3dCb29rbWFya3MoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZUJvb2ttYXJrcygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd1JlYWxpdHlDaG9vc2VyKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdyZWFsaXR5Q2hvb3Nlck9wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZVJlYWxpdHlDaG9vc2VyKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdyZWFsaXR5Q2hvb3Nlck9wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHNob3dDYW5jZWxCdXR0b24oKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2NhbmNlbEJ1dHRvblNob3duJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVDYW5jZWxCdXR0b24oKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2NhbmNlbEJ1dHRvblNob3duJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVEZWJ1ZygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnZGVidWdFbmFibGVkJywgIXRoaXMuZGVidWdFbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgc2V0RGVidWdFbmFibGVkKGVuYWJsZWQ6Ym9vbGVhbikge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdkZWJ1Z0VuYWJsZWQnLCBlbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlVmlld2VyKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0Vmlld2VyRW5hYmxlZCghdGhpcy52aWV3ZXJFbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Vmlld2VyRW5hYmxlZChlbmFibGVkOmJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgndmlld2VyRW5hYmxlZCcsIGVuYWJsZWQpO1xuICAgICAgICBpZiAoZW5hYmxlZCkgdGhpcy5hcmdvbi5kZXZpY2UucmVxdWVzdFByZXNlbnRITUQoKTtcbiAgICAgICAgZWxzZSB0aGlzLmFyZ29uLmRldmljZS5leGl0UHJlc2VudEhNRCgpO1xuICAgIH1cblxuICAgIF9vbkxheWVyRGV0YWlsc0NoYW5nZShkYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIGlmIChkYXRhLnByb3BlcnR5TmFtZSA9PT0gJ3VyaScpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdjdXJyZW50VXJpJywgZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgc2V0TGF5ZXJEZXRhaWxzKGRldGFpbHM6TGF5ZXJEZXRhaWxzKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5sYXllckRldGFpbHMgJiYgdGhpcy5sYXllckRldGFpbHMub2ZmKCdwcm9wZXJ0eUNoYW5nZScsIHRoaXMuX29uTGF5ZXJEZXRhaWxzQ2hhbmdlLCB0aGlzKTtcbiAgICAgICAgdGhpcy5zZXQoJ2xheWVyRGV0YWlscycsIGRldGFpbHMpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsICFkZXRhaWxzLnVyaSk7XG4gICAgICAgIHRoaXMuc2V0KCdjdXJyZW50VXJpJywgZGV0YWlscy51cmkpO1xuICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgIGRldGFpbHMub24oJ3Byb3BlcnR5Q2hhbmdlJywgdGhpcy5fb25MYXllckRldGFpbHNDaGFuZ2UsIHRoaXMpO1xuICAgIH1cbiAgICBcbiAgICB1cGRhdGVGYXZvcml0ZVN0YXR1cygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnaXNGYXZvcml0ZScsICEhYm9va21hcmtzLmZhdm9yaXRlTWFwLmdldCh0aGlzLmN1cnJlbnRVcmkpKTtcbiAgICB9XG4gICAgXG4gICAgbG9hZFVybCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5ub3RpZnkoPExvYWRVcmxFdmVudERhdGE+e1xuICAgICAgICAgICAgZXZlbnROYW1lOiBBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LFxuICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgbmV3TGF5ZXI6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxheWVyRGV0YWlscy5zZXQoJ3VyaScsIHVybCk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgIXVybCk7XG4gICAgfVxuXG4gICAgb3BlblVybCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5ub3RpZnkoPExvYWRVcmxFdmVudERhdGE+e1xuICAgICAgICAgICAgZXZlbnROYW1lOiBBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LFxuICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgbmV3TGF5ZXI6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzLnNldCgndXJpJywgdXJsKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhdXJsKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcHBWaWV3TW9kZWwgPSBuZXcgQXBwVmlld01vZGVsOyJdfQ==