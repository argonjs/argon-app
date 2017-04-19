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
                var primaryVuforiaLicenseKey = util_1.getInternalVuforiaKey() || argon_vuforia_provider_1.DEBUG_DEVELOPMENT_LICENSE_KEY;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQXlFO0FBQ3pFLDBEQUFxRDtBQUNyRCx1Q0FBd0M7QUFDeEMsc0NBQXdDO0FBQ3hDLG1FQUEyRztBQUMzRyxpRUFBcUc7QUFDckcsaUVBQXVHO0FBQ3ZHLCtCQUE2QztBQVM3QztJQUFrQyxnQ0FBVTtJQUE1QztRQUFBLHFFQUlDO1FBSEcsU0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNULFdBQUssR0FBRyxFQUFFLENBQUM7UUFDWCxTQUFHLEdBQUcsSUFBSSxrQ0FBZSxFQUFXLENBQUM7O0lBQ3pDLENBQUM7SUFBRCxtQkFBQztBQUFELENBQUMsQUFKRCxDQUFrQyx1QkFBVSxHQUkzQztBQUpZLG9DQUFZO0FBT3pCLElBQXNCLGdDQUFnQztJQUNsRCwwQ0FDWSxrQkFBa0IsRUFDbEIsb0JBQW9CO1FBRHBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBQTtRQUNsQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQUE7SUFDaEMsQ0FBQztJQUVELDhEQUFtQixHQUFuQixVQUFvQixHQUFVO1FBQzFCLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDakIsS0FBSyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUk7Z0JBQ3pCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QyxhQUFhLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hELGFBQWEsQ0FBQyxHQUFHLEdBQUcs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QyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELDhCQUFPLEdBQVAsVUFBUSxHQUFVO1FBQ2QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxNQUFNLENBQW1CO1lBQzFCLFNBQVMsRUFBRSxZQUFZLENBQUMsWUFBWTtZQUNwQyxNQUFNLEVBQUUsSUFBSTtZQUNaLEdBQUcsS0FBQTtZQUNILFFBQVEsRUFBRSxJQUFJO1NBQ2pCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUEvTkQsQ0FBa0MsdUJBQVU7QUFtQmpDLHlCQUFZLEdBQWEsU0FBUyxDQUFBO0FBbkJoQyxvQ0FBWTtBQWlPWixRQUFBLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZSwgUHJvcGVydHlDaGFuZ2VEYXRhLCBFdmVudERhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknXG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9ib29rbWFya3MnXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIsIERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tZGV2aWNlLXByb3ZpZGVyJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0TGl2ZVJlYWxpdHlWaWV3ZXIsIE5hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXJ9IGZyb20gJy4vYXJnb24tcmVhbGl0eS12aWV3ZXJzJztcbmltcG9ydCB7Z2V0SW50ZXJuYWxWdWZvcmlhS2V5fSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHtMb2dJdGVtfSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZFVybEV2ZW50RGF0YSBleHRlbmRzIEV2ZW50RGF0YSB7XG4gICAgZXZlbnROYW1lOiAnbG9hZFVybCcsXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgbmV3TGF5ZXI6IGJvb2xlYW4sXG59XG5cbmV4cG9ydCBjbGFzcyBMYXllckRldGFpbHMgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICB1cmkgPSAnJztcbiAgICB0aXRsZSA9ICcnO1xuICAgIGxvZyA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8TG9nSXRlbT4oKTtcbn1cblxuQEFyZ29uLkRJLmluamVjdChBcmdvbi5ESS5GYWN0b3J5Lm9mKE5hdGl2ZXNjcmlwdExpdmVSZWFsaXR5Vmlld2VyKSwgQXJnb24uREkuRmFjdG9yeS5vZihOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOYXRpdmVzY3JpcHRSZWFsaXR5Vmlld2VyRmFjdG9yeSB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgX2NyZWF0ZUxpdmVSZWFsaXR5LCBcbiAgICAgICAgcHJpdmF0ZSBfY3JlYXRlSG9zdGVkUmVhbGl0eSkge1xuICAgIH1cblxuICAgIGNyZWF0ZVJlYWxpdHlWaWV3ZXIodXJpOnN0cmluZykgOiBBcmdvbi5SZWFsaXR5Vmlld2VyIHtcbiAgICAgICAgY29uc3Qgdmlld2VyVHlwZSA9IEFyZ29uLlJlYWxpdHlWaWV3ZXIuZ2V0VHlwZSh1cmkpO1xuICAgICAgICBzd2l0Y2ggKHZpZXdlclR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFOlxuICAgICAgICAgICAgICAgIHZhciByZWFsaXR5Vmlld2VyID0gdGhpcy5fY3JlYXRlTGl2ZVJlYWxpdHkoKTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Vmlld2VyLnVyaSA9IHVyaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVhbGl0eVZpZXdlcjtcbiAgICAgICAgICAgIGNhc2UgJ2hvc3RlZCc6XG4gICAgICAgICAgICAgICAgdmFyIHJlYWxpdHlWaWV3ZXIgPSB0aGlzLl9jcmVhdGVIb3N0ZWRSZWFsaXR5KCk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eVZpZXdlci51cmkgPSB1cmk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYWxpdHlWaWV3ZXI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgUmVhbGl0eSBWaWV3ZXIgVVJJOiAnICsgdXJpKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBJbnRlcmFjdGlvbk1vZGUgPSAnaW1tZXJzaXZlJ3wncGFnZSc7XG5cbmV4cG9ydCBjbGFzcyBBcHBWaWV3TW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBtZW51T3BlbiA9IGZhbHNlO1xuICAgIGNhbmNlbEJ1dHRvblNob3duID0gZmFsc2U7XG4gICAgcmVhbGl0eUNob29zZXJPcGVuID0gZmFsc2U7XG4gICAgb3ZlcnZpZXdPcGVuID0gZmFsc2U7XG4gICAgYm9va21hcmtzT3BlbiA9IGZhbHNlO1xuICAgIGRlYnVnRW5hYmxlZCA9IGZhbHNlO1xuICAgIHZpZXdlckVuYWJsZWQgPSBmYWxzZTtcbiAgICBpbnRlcmFjdGlvbk1vZGU6SW50ZXJhY3Rpb25Nb2RlID0gJ2ltbWVyc2l2ZSc7XG4gICAgaW50ZXJhY3Rpb25Nb2RlQnV0dG9uRW5hYmxlZCA9IGZhbHNlO1xuICAgIGxheWVyRGV0YWlsczpMYXllckRldGFpbHM7XG4gICAgY3VycmVudFVyaSA9ICcnO1xuICAgIGlzRmF2b3JpdGUgPSBmYWxzZTtcblxuICAgIHB1YmxpYyBhcmdvbjpBcmdvbi5BcmdvblN5c3RlbTtcblxuICAgIHByaXZhdGUgX3Jlc29sdmVSZWFkeTpGdW5jdGlvbjtcbiAgICByZWFkeTpQcm9taXNlPHZvaWQ+O1xuICAgIFxuICAgIHN0YXRpYyBsb2FkVXJsRXZlbnQ6J2xvYWRVcmwnID0gJ2xvYWRVcmwnXG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Qub24oJ2NoYW5nZScsKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMucmVhZHkgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5ID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0UmVhZHkoKSB7XG4gICAgICAgIGlmICh0aGlzLmFyZ29uKSByZXR1cm47IC8vIGFscmVhZHkgaW5pdGlhbGl6ZWRcblxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBuZXcgQXJnb24uREkuQ29udGFpbmVyO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uRGV2aWNlU2VydmljZSwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSk7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5WdWZvcmlhU2VydmljZVByb3ZpZGVyLCBOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLkRldmljZVNlcnZpY2VQcm92aWRlciwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLlJlYWxpdHlWaWV3ZXJGYWN0b3J5LCBOYXRpdmVzY3JpcHRSZWFsaXR5Vmlld2VyRmFjdG9yeSk7XG5cbiAgICAgICAgY29uc3QgYXJnb24gPSB0aGlzLmFyZ29uID0gQXJnb24uaW5pdChudWxsLCB7XG4gICAgICAgICAgICByb2xlOiBBcmdvbi5Sb2xlLk1BTkFHRVIsXG4gICAgICAgICAgICB0aXRsZTogJ0FyZ29uQXBwJ1xuICAgICAgICB9LCBjb250YWluZXIpO1xuXG4gICAgICAgIGFyZ29uLnJlYWxpdHkuZGVmYXVsdCA9IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRTtcblxuICAgICAgICBhcmdvbi5wcm92aWRlci5yZWFsaXR5Lmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgaWYgKCFib29rbWFya3MucmVhbGl0eU1hcC5nZXQodmlld2VyLnVyaSkpIHtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucmVhbGl0eUxpc3QucHVzaChuZXcgYm9va21hcmtzLkJvb2ttYXJrSXRlbSh7dXJpOiB2aWV3ZXIudXJpfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBhcmdvbi5wcm92aWRlci5yZWFsaXR5LnVuaW5zdGFsbGVkRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe3ZpZXdlcn0pPT57XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gYm9va21hcmtzLnJlYWxpdHlNYXAuZ2V0KHZpZXdlci51cmkpO1xuICAgICAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gYm9va21hcmtzLnJlYWxpdHlMaXN0LmluZGV4T2YoaXRlbSk7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnJlYWxpdHlMaXN0LnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb25Gb2N1c0V2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXJnb24gZm9jdXMgY2hhbmdlZDogXCIgKyAoY3VycmVudCA/IGN1cnJlbnQudXJpIDogdW5kZWZpbmVkKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFyZ29uLnZ1Zm9yaWEuaXNBdmFpbGFibGUoKS50aGVuKChhdmFpbGFibGUpPT57XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5ID0gZ2V0SW50ZXJuYWxWdWZvcmlhS2V5KCkgfHwgREVCVUdfREVWRUxPUE1FTlRfTElDRU5TRV9LRVk7XG4gICAgICAgICAgICAgICAgaWYgKCFwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJVbmFibGUgdG8gbG9jYXRlIGludGVybmFsIFZ1Zm9yaWEgTGljZW5zZSBLZXlcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXJnb24udnVmb3JpYS5pbml0V2l0aFVuZW5jcnlwdGVkS2V5KHByaW1hcnlWdWZvcmlhTGljZW5zZUtleSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnNldExheWVyRGV0YWlscyhuZXcgTGF5ZXJEZXRhaWxzKG51bGwpKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3Jlc29sdmVSZWFkeSgpO1xuICAgIH1cblxuICAgIGVuc3VyZVJlYWR5KCkge1xuICAgICAgICBpZiAoIXRoaXMuYXJnb24pIHRocm93IG5ldyBFcnJvcignQXBwVmlld01vZGVsIGlzIG5vdCByZWFkeScpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVNZW51KCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdtZW51T3BlbicsICF0aGlzLm1lbnVPcGVuKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZU1lbnUoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ21lbnVPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVJbnRlcmFjdGlvbk1vZGUoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2ludGVyYWN0aW9uTW9kZScsIHRoaXMuaW50ZXJhY3Rpb25Nb2RlID09PSAncGFnZScgPyAnaW1tZXJzaXZlJyA6ICdwYWdlJylcbiAgICB9XG4gICAgXG4gICAgc2V0SW50ZXJhY3Rpb25Nb2RlKG1vZGU6SW50ZXJhY3Rpb25Nb2RlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2ludGVyYWN0aW9uTW9kZScsIG1vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlT3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlT3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsICF0aGlzLm92ZXJ2aWV3T3Blbik7XG4gICAgfVxuICAgIFxuICAgIHNob3dCb29rbWFya3MoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZUJvb2ttYXJrcygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd1JlYWxpdHlDaG9vc2VyKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdyZWFsaXR5Q2hvb3Nlck9wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZVJlYWxpdHlDaG9vc2VyKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdyZWFsaXR5Q2hvb3Nlck9wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHNob3dDYW5jZWxCdXR0b24oKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2NhbmNlbEJ1dHRvblNob3duJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVDYW5jZWxCdXR0b24oKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2NhbmNlbEJ1dHRvblNob3duJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVEZWJ1ZygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnZGVidWdFbmFibGVkJywgIXRoaXMuZGVidWdFbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgc2V0RGVidWdFbmFibGVkKGVuYWJsZWQ6Ym9vbGVhbikge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdkZWJ1Z0VuYWJsZWQnLCBlbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlVmlld2VyKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0Vmlld2VyRW5hYmxlZCghdGhpcy52aWV3ZXJFbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Vmlld2VyRW5hYmxlZChlbmFibGVkOmJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgndmlld2VyRW5hYmxlZCcsIGVuYWJsZWQpO1xuICAgICAgICBpZiAoZW5hYmxlZCkgdGhpcy5hcmdvbi5kZXZpY2UucmVxdWVzdFByZXNlbnRITUQoKTtcbiAgICAgICAgZWxzZSB0aGlzLmFyZ29uLmRldmljZS5leGl0UHJlc2VudEhNRCgpO1xuICAgIH1cblxuICAgIF9vbkxheWVyRGV0YWlsc0NoYW5nZShkYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIGlmIChkYXRhLnByb3BlcnR5TmFtZSA9PT0gJ3VyaScpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdjdXJyZW50VXJpJywgZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgc2V0TGF5ZXJEZXRhaWxzKGRldGFpbHM6TGF5ZXJEZXRhaWxzKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5sYXllckRldGFpbHMgJiYgdGhpcy5sYXllckRldGFpbHMub2ZmKCdwcm9wZXJ0eUNoYW5nZScsIHRoaXMuX29uTGF5ZXJEZXRhaWxzQ2hhbmdlLCB0aGlzKTtcbiAgICAgICAgdGhpcy5zZXQoJ2xheWVyRGV0YWlscycsIGRldGFpbHMpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsICFkZXRhaWxzLnVyaSk7XG4gICAgICAgIHRoaXMuc2V0KCdjdXJyZW50VXJpJywgZGV0YWlscy51cmkpO1xuICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgIGRldGFpbHMub24oJ3Byb3BlcnR5Q2hhbmdlJywgdGhpcy5fb25MYXllckRldGFpbHNDaGFuZ2UsIHRoaXMpO1xuICAgIH1cbiAgICBcbiAgICB1cGRhdGVGYXZvcml0ZVN0YXR1cygpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnaXNGYXZvcml0ZScsICEhYm9va21hcmtzLmZhdm9yaXRlTWFwLmdldCh0aGlzLmN1cnJlbnRVcmkpKTtcbiAgICB9XG4gICAgXG4gICAgbG9hZFVybCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5ub3RpZnkoPExvYWRVcmxFdmVudERhdGE+e1xuICAgICAgICAgICAgZXZlbnROYW1lOiBBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LFxuICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgbmV3TGF5ZXI6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxheWVyRGV0YWlscy5zZXQoJ3VyaScsIHVybCk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgIXVybCk7XG4gICAgfVxuXG4gICAgb3BlblVybCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5ub3RpZnkoPExvYWRVcmxFdmVudERhdGE+e1xuICAgICAgICAgICAgZXZlbnROYW1lOiBBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LFxuICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgbmV3TGF5ZXI6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzLnNldCgndXJpJywgdXJsKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhdXJsKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcHBWaWV3TW9kZWwgPSBuZXcgQXBwVmlld01vZGVsOyJdfQ==