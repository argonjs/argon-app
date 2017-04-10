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
                bookmarks.realityList.push(new bookmarks.BookmarkItem({ uri: viewer.uri }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQXlFO0FBQ3pFLDBEQUFxRDtBQUNyRCx1Q0FBd0M7QUFDeEMsc0NBQXdDO0FBQ3hDLG1FQUE0RTtBQUM1RSxpRUFBcUc7QUFDckcsaUVBQXVHO0FBQ3ZHLCtCQUE2QztBQVM3QztJQUFrQyxnQ0FBVTtJQUE1QztRQUFBLHFFQUlDO1FBSEcsU0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNULFdBQUssR0FBRyxFQUFFLENBQUM7UUFDWCxTQUFHLEdBQUcsSUFBSSxrQ0FBZSxFQUFXLENBQUM7O0lBQ3pDLENBQUM7SUFBRCxtQkFBQztBQUFELENBQUMsQUFKRCxDQUFrQyx1QkFBVSxHQUkzQztBQUpZLG9DQUFZO0FBT3pCLElBQXNCLGdDQUFnQztJQUNsRCwwQ0FDWSxrQkFBa0IsRUFDbEIsb0JBQW9CO1FBRHBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBQTtRQUNsQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQUE7SUFDaEMsQ0FBQztJQUVELDhEQUFtQixHQUFuQixVQUFvQixHQUFVO1FBQzFCLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDakIsS0FBSyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUk7Z0JBQ3pCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QyxhQUFhLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hELGFBQWEsQ0FBQyxHQUFHLEdBQUcs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QUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCw4QkFBTyxHQUFQLFVBQVEsR0FBVTtRQUNkLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsTUFBTSxDQUFtQjtZQUMxQixTQUFTLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDcEMsTUFBTSxFQUFFLElBQUk7WUFDWixHQUFHLEtBQUE7WUFDSCxRQUFRLEVBQUUsSUFBSTtTQUNqQixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQ0wsbUJBQUM7QUFBRCxDQUFDLEFBN05ELENBQWtDLHVCQUFVO0FBbUJqQyx5QkFBWSxHQUFhLFNBQVMsQ0FBQTtBQW5CaEMsb0NBQVk7QUErTlosUUFBQSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09ic2VydmFibGUsIFByb3BlcnR5Q2hhbmdlRGF0YSwgRXZlbnREYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnXG5pbXBvcnQge09ic2VydmFibGVBcnJheX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlLWFycmF5J1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vYm9va21hcmtzJ1xuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tZGV2aWNlLXByb3ZpZGVyJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0TGl2ZVJlYWxpdHlWaWV3ZXIsIE5hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXJ9IGZyb20gJy4vYXJnb24tcmVhbGl0eS12aWV3ZXJzJztcbmltcG9ydCB7Z2V0SW50ZXJuYWxWdWZvcmlhS2V5fSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHtMb2dJdGVtfSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZFVybEV2ZW50RGF0YSBleHRlbmRzIEV2ZW50RGF0YSB7XG4gICAgZXZlbnROYW1lOiAnbG9hZFVybCcsXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgbmV3TGF5ZXI6IGJvb2xlYW4sXG59XG5cbmV4cG9ydCBjbGFzcyBMYXllckRldGFpbHMgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICB1cmkgPSAnJztcbiAgICB0aXRsZSA9ICcnO1xuICAgIGxvZyA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8TG9nSXRlbT4oKTtcbn1cblxuQEFyZ29uLkRJLmluamVjdChBcmdvbi5ESS5GYWN0b3J5Lm9mKE5hdGl2ZXNjcmlwdExpdmVSZWFsaXR5Vmlld2VyKSwgQXJnb24uREkuRmFjdG9yeS5vZihOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOYXRpdmVzY3JpcHRSZWFsaXR5Vmlld2VyRmFjdG9yeSB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgX2NyZWF0ZUxpdmVSZWFsaXR5LCBcbiAgICAgICAgcHJpdmF0ZSBfY3JlYXRlSG9zdGVkUmVhbGl0eSkge1xuICAgIH1cblxuICAgIGNyZWF0ZVJlYWxpdHlWaWV3ZXIodXJpOnN0cmluZykgOiBBcmdvbi5SZWFsaXR5Vmlld2VyIHtcbiAgICAgICAgY29uc3Qgdmlld2VyVHlwZSA9IEFyZ29uLlJlYWxpdHlWaWV3ZXIuZ2V0VHlwZSh1cmkpO1xuICAgICAgICBzd2l0Y2ggKHZpZXdlclR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFOlxuICAgICAgICAgICAgICAgIHZhciByZWFsaXR5Vmlld2VyID0gdGhpcy5fY3JlYXRlTGl2ZVJlYWxpdHkoKTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Vmlld2VyLnVyaSA9IHVyaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVhbGl0eVZpZXdlcjtcbiAgICAgICAgICAgIGNhc2UgJ2hvc3RlZCc6XG4gICAgICAgICAgICAgICAgdmFyIHJlYWxpdHlWaWV3ZXIgPSB0aGlzLl9jcmVhdGVIb3N0ZWRSZWFsaXR5KCk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eVZpZXdlci51cmkgPSB1cmk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYWxpdHlWaWV3ZXI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgUmVhbGl0eSBWaWV3ZXIgVVJJOiAnICsgdXJpKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBJbnRlcmFjdGlvbk1vZGUgPSAnaW1tZXJzaXZlJ3wncGFnZSc7XG5cbmV4cG9ydCBjbGFzcyBBcHBWaWV3TW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBtZW51T3BlbiA9IGZhbHNlO1xuICAgIGNhbmNlbEJ1dHRvblNob3duID0gZmFsc2U7XG4gICAgcmVhbGl0eUNob29zZXJPcGVuID0gZmFsc2U7XG4gICAgb3ZlcnZpZXdPcGVuID0gZmFsc2U7XG4gICAgYm9va21hcmtzT3BlbiA9IGZhbHNlO1xuICAgIGRlYnVnRW5hYmxlZCA9IGZhbHNlO1xuICAgIHZpZXdlckVuYWJsZWQgPSBmYWxzZTtcbiAgICBpbnRlcmFjdGlvbk1vZGU6SW50ZXJhY3Rpb25Nb2RlID0gJ2ltbWVyc2l2ZSc7XG4gICAgaW50ZXJhY3Rpb25Nb2RlQnV0dG9uRW5hYmxlZCA9IGZhbHNlO1xuICAgIGxheWVyRGV0YWlsczpMYXllckRldGFpbHM7XG4gICAgY3VycmVudFVyaSA9ICcnO1xuICAgIGlzRmF2b3JpdGUgPSBmYWxzZTtcblxuICAgIHB1YmxpYyBhcmdvbjpBcmdvbi5BcmdvblN5c3RlbTtcblxuICAgIHByaXZhdGUgX3Jlc29sdmVSZWFkeTpGdW5jdGlvbjtcbiAgICByZWFkeTpQcm9taXNlPHZvaWQ+O1xuICAgIFxuICAgIHN0YXRpYyBsb2FkVXJsRXZlbnQ6J2xvYWRVcmwnID0gJ2xvYWRVcmwnXG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Qub24oJ2NoYW5nZScsKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMucmVhZHkgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5ID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0UmVhZHkoKSB7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG5ldyBBcmdvbi5ESS5Db250YWluZXI7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5EZXZpY2VTZXJ2aWNlLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIsIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uRGV2aWNlU2VydmljZVByb3ZpZGVyLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXIpO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uUmVhbGl0eVZpZXdlckZhY3RvcnksIE5hdGl2ZXNjcmlwdFJlYWxpdHlWaWV3ZXJGYWN0b3J5KTtcblxuICAgICAgICBjb25zdCBhcmdvbiA9IHRoaXMuYXJnb24gPSBBcmdvbi5pbml0KG51bGwsIHtcbiAgICAgICAgICAgIHJvbGU6IEFyZ29uLlJvbGUuTUFOQUdFUixcbiAgICAgICAgICAgIHRpdGxlOiAnQXJnb25BcHAnXG4gICAgICAgIH0sIGNvbnRhaW5lcik7XG5cbiAgICAgICAgYXJnb24ucmVhbGl0eS5kZWZhdWx0ID0gQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFO1xuXG4gICAgICAgIGFyZ29uLnByb3ZpZGVyLnJlYWxpdHkuaW5zdGFsbGVkRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe3ZpZXdlcn0pPT57XG4gICAgICAgICAgICBpZiAoIWJvb2ttYXJrcy5yZWFsaXR5TWFwLmdldCh2aWV3ZXIudXJpKSkge1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5wdXNoKG5ldyBib29rbWFya3MuQm9va21hcmtJdGVtKHt1cmk6IHZpZXdlci51cml9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFyZ29uLnByb3ZpZGVyLnJlYWxpdHkudW5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBib29rbWFya3MucmVhbGl0eU1hcC5nZXQodmlld2VyLnVyaSk7XG4gICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBib29rbWFya3MucmVhbGl0eUxpc3QuaW5kZXhPZihpdGVtKTtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucmVhbGl0eUxpc3Quc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgYXJnb24ucHJvdmlkZXIuZm9jdXMuc2Vzc2lvbkZvY3VzRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBcmdvbiBmb2N1cyBjaGFuZ2VkOiBcIiArIChjdXJyZW50ID8gY3VycmVudC51cmkgOiB1bmRlZmluZWQpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXJnb24udnVmb3JpYS5pc0F2YWlsYWJsZSgpLnRoZW4oKGF2YWlsYWJsZSk9PntcbiAgICAgICAgICAgIGlmIChhdmFpbGFibGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkgPSBnZXRJbnRlcm5hbFZ1Zm9yaWFLZXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXByaW1hcnlWdWZvcmlhTGljZW5zZUtleSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChcIlVuYWJsZSB0byBsb2NhdGUgaW50ZXJuYWwgVnVmb3JpYSBMaWNlbnNlIEtleVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcmdvbi52dWZvcmlhLmluaXRXaXRoVW5lbmNyeXB0ZWRLZXkocHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5KS5jYXRjaCgoZXJyKT0+e1xuICAgICAgICAgICAgICAgICAgICBhbGVydChlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2V0TGF5ZXJEZXRhaWxzKG5ldyBMYXllckRldGFpbHMobnVsbCkpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5KCk7XG4gICAgfVxuXG4gICAgZW5zdXJlUmVhZHkoKSB7XG4gICAgICAgIGlmICghdGhpcy5hcmdvbikgdGhyb3cgbmV3IEVycm9yKCdBcHBWaWV3TW9kZWwgaXMgbm90IHJlYWR5Jyk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZU1lbnUoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ21lbnVPcGVuJywgIXRoaXMubWVudU9wZW4pO1xuICAgIH1cbiAgICBcbiAgICBoaWRlTWVudSgpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnbWVudU9wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZUludGVyYWN0aW9uTW9kZSgpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnaW50ZXJhY3Rpb25Nb2RlJywgdGhpcy5pbnRlcmFjdGlvbk1vZGUgPT09ICdwYWdlJyA/ICdpbW1lcnNpdmUnIDogJ3BhZ2UnKVxuICAgIH1cbiAgICBcbiAgICBzZXRJbnRlcmFjdGlvbk1vZGUobW9kZTpJbnRlcmFjdGlvbk1vZGUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnaW50ZXJhY3Rpb25Nb2RlJywgbW9kZSk7XG4gICAgfVxuICAgIFxuICAgIHNob3dPdmVydmlldygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnb3ZlcnZpZXdPcGVuJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVPdmVydmlldygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnb3ZlcnZpZXdPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVPdmVydmlldygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnb3ZlcnZpZXdPcGVuJywgIXRoaXMub3ZlcnZpZXdPcGVuKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd0Jvb2ttYXJrcygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlQm9va21hcmtzKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICBzaG93UmVhbGl0eUNob29zZXIoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3JlYWxpdHlDaG9vc2VyT3BlbicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlUmVhbGl0eUNob29zZXIoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3JlYWxpdHlDaG9vc2VyT3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd0NhbmNlbEJ1dHRvbigpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnY2FuY2VsQnV0dG9uU2hvd24nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZUNhbmNlbEJ1dHRvbigpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnY2FuY2VsQnV0dG9uU2hvd24nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZURlYnVnKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdkZWJ1Z0VuYWJsZWQnLCAhdGhpcy5kZWJ1Z0VuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICBzZXREZWJ1Z0VuYWJsZWQoZW5hYmxlZDpib29sZWFuKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2RlYnVnRW5hYmxlZCcsIGVuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVWaWV3ZXIoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXRWaWV3ZXJFbmFibGVkKCF0aGlzLnZpZXdlckVuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICBzZXRWaWV3ZXJFbmFibGVkKGVuYWJsZWQ6Ym9vbGVhbikge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCd2aWV3ZXJFbmFibGVkJywgZW5hYmxlZCk7XG4gICAgICAgIGlmIChlbmFibGVkKSB0aGlzLmFyZ29uLmRldmljZS5yZXF1ZXN0UHJlc2VudEhNRCgpO1xuICAgICAgICBlbHNlIHRoaXMuYXJnb24uZGV2aWNlLmV4aXRQcmVzZW50SE1EKCk7XG4gICAgfVxuXG4gICAgX29uTGF5ZXJEZXRhaWxzQ2hhbmdlKGRhdGE6UHJvcGVydHlDaGFuZ2VEYXRhKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgaWYgKGRhdGEucHJvcGVydHlOYW1lID09PSAndXJpJykge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ2N1cnJlbnRVcmknLCBkYXRhLnZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRmF2b3JpdGVTdGF0dXMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBzZXRMYXllckRldGFpbHMoZGV0YWlsczpMYXllckRldGFpbHMpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLmxheWVyRGV0YWlscyAmJiB0aGlzLmxheWVyRGV0YWlscy5vZmYoJ3Byb3BlcnR5Q2hhbmdlJywgdGhpcy5fb25MYXllckRldGFpbHNDaGFuZ2UsIHRoaXMpO1xuICAgICAgICB0aGlzLnNldCgnbGF5ZXJEZXRhaWxzJywgZGV0YWlscyk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgIWRldGFpbHMudXJpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2N1cnJlbnRVcmknLCBkZXRhaWxzLnVyaSk7XG4gICAgICAgIHRoaXMudXBkYXRlRmF2b3JpdGVTdGF0dXMoKTtcbiAgICAgICAgZGV0YWlscy5vbigncHJvcGVydHlDaGFuZ2UnLCB0aGlzLl9vbkxheWVyRGV0YWlsc0NoYW5nZSwgdGhpcyk7XG4gICAgfVxuICAgIFxuICAgIHVwZGF0ZUZhdm9yaXRlU3RhdHVzKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdpc0Zhdm9yaXRlJywgISFib29rbWFya3MuZmF2b3JpdGVNYXAuZ2V0KHRoaXMuY3VycmVudFVyaSkpO1xuICAgIH1cbiAgICBcbiAgICBsb2FkVXJsKHVybDpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLm5vdGlmeSg8TG9hZFVybEV2ZW50RGF0YT57XG4gICAgICAgICAgICBldmVudE5hbWU6IEFwcFZpZXdNb2RlbC5sb2FkVXJsRXZlbnQsXG4gICAgICAgICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICBuZXdMYXllcjogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzLnNldCgndXJpJywgdXJsKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhdXJsKTtcbiAgICB9XG5cbiAgICBvcGVuVXJsKHVybDpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLm5vdGlmeSg8TG9hZFVybEV2ZW50RGF0YT57XG4gICAgICAgICAgICBldmVudE5hbWU6IEFwcFZpZXdNb2RlbC5sb2FkVXJsRXZlbnQsXG4gICAgICAgICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICBuZXdMYXllcjogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5sYXllckRldGFpbHMuc2V0KCd1cmknLCB1cmwpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsICF1cmwpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGFwcFZpZXdNb2RlbCA9IG5ldyBBcHBWaWV3TW9kZWw7Il19