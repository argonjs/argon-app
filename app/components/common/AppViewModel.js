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
            this.argon.device.requestPresentHMD();
        else
            this.argon.device.exitPresentHMD();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQXlFO0FBQ3pFLDBEQUFxRDtBQUNyRCx1Q0FBd0M7QUFDeEMsc0NBQXdDO0FBQ3hDLG1FQUEyRztBQUMzRyxpRUFBcUc7QUFDckcsaUVBQXVHO0FBQ3ZHLCtCQUE2QztBQVE3QztJQUFrQyxnQ0FBVTtJQUE1QztRQUFBLHFFQUlDO1FBSEcsU0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNULFdBQUssR0FBRyxFQUFFLENBQUM7UUFDWCxTQUFHLEdBQUcsSUFBSSxrQ0FBZSxFQUFXLENBQUM7O0lBQ3pDLENBQUM7SUFBRCxtQkFBQztBQUFELENBQUMsQUFKRCxDQUFrQyx1QkFBVSxHQUkzQztBQUpZLG9DQUFZO0FBT3pCLElBQXNCLGdDQUFnQztJQUNsRCwwQ0FDWSxrQkFBa0IsRUFDbEIsb0JBQW9CO1FBRHBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBQTtRQUNsQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQUE7SUFDaEMsQ0FBQztJQUVELDhEQUFtQixHQUFuQixVQUFvQixHQUFVO1FBQzFCLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDakIsS0FBSyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUk7Z0JBQ3pCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QyxhQUFhLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hELGFBQWEsQ0FBQyxHQUFHLEdBQUcs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Q0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUFyTEQsQ0FBa0MsdUJBQVU7QUFtQmpDLHlCQUFZLEdBQWEsU0FBUyxDQUFBO0FBbkJoQyxvQ0FBWTtBQXVMWixRQUFBLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZSwgUHJvcGVydHlDaGFuZ2VEYXRhLCBFdmVudERhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknXG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9ib29rbWFya3MnXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIsIERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tZGV2aWNlLXByb3ZpZGVyJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0TGl2ZVJlYWxpdHlWaWV3ZXIsIE5hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXJ9IGZyb20gJy4vYXJnb24tcmVhbGl0eS12aWV3ZXJzJztcbmltcG9ydCB7Z2V0SW50ZXJuYWxWdWZvcmlhS2V5fSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHtMb2dJdGVtfSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZFVybEV2ZW50RGF0YSBleHRlbmRzIEV2ZW50RGF0YSB7XG4gICAgZXZlbnROYW1lOiAnbG9hZFVybCcsXG4gICAgdXJsOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIExheWVyRGV0YWlscyBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIHVyaSA9ICcnO1xuICAgIHRpdGxlID0gJyc7XG4gICAgbG9nID0gbmV3IE9ic2VydmFibGVBcnJheTxMb2dJdGVtPigpO1xufVxuXG5AQXJnb24uREkuaW5qZWN0KEFyZ29uLkRJLkZhY3Rvcnkub2YoTmF0aXZlc2NyaXB0TGl2ZVJlYWxpdHlWaWV3ZXIpLCBBcmdvbi5ESS5GYWN0b3J5Lm9mKE5hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXIpKVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5hdGl2ZXNjcmlwdFJlYWxpdHlWaWV3ZXJGYWN0b3J5IHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSBfY3JlYXRlTGl2ZVJlYWxpdHksIFxuICAgICAgICBwcml2YXRlIF9jcmVhdGVIb3N0ZWRSZWFsaXR5KSB7XG4gICAgfVxuXG4gICAgY3JlYXRlUmVhbGl0eVZpZXdlcih1cmk6c3RyaW5nKSA6IEFyZ29uLlJlYWxpdHlWaWV3ZXIge1xuICAgICAgICBjb25zdCB2aWV3ZXJUeXBlID0gQXJnb24uUmVhbGl0eVZpZXdlci5nZXRUeXBlKHVyaSk7XG4gICAgICAgIHN3aXRjaCAodmlld2VyVHlwZSkge1xuICAgICAgICAgICAgY2FzZSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkU6XG4gICAgICAgICAgICAgICAgdmFyIHJlYWxpdHlWaWV3ZXIgPSB0aGlzLl9jcmVhdGVMaXZlUmVhbGl0eSgpO1xuICAgICAgICAgICAgICAgIHJlYWxpdHlWaWV3ZXIudXJpID0gdXJpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWFsaXR5Vmlld2VyO1xuICAgICAgICAgICAgY2FzZSAnaG9zdGVkJzpcbiAgICAgICAgICAgICAgICB2YXIgcmVhbGl0eVZpZXdlciA9IHRoaXMuX2NyZWF0ZUhvc3RlZFJlYWxpdHkoKTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Vmlld2VyLnVyaSA9IHVyaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVhbGl0eVZpZXdlcjtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBSZWFsaXR5IFZpZXdlciBVUkk6ICcgKyB1cmkpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCB0eXBlIEludGVyYWN0aW9uTW9kZSA9ICdpbW1lcnNpdmUnfCdwYWdlJztcblxuZXhwb3J0IGNsYXNzIEFwcFZpZXdNb2RlbCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIG1lbnVPcGVuID0gZmFsc2U7XG4gICAgY2FuY2VsQnV0dG9uU2hvd24gPSBmYWxzZTtcbiAgICByZWFsaXR5Q2hvb3Nlck9wZW4gPSBmYWxzZTtcbiAgICBvdmVydmlld09wZW4gPSBmYWxzZTtcbiAgICBib29rbWFya3NPcGVuID0gZmFsc2U7XG4gICAgZGVidWdFbmFibGVkID0gZmFsc2U7XG4gICAgdmlld2VyRW5hYmxlZCA9IGZhbHNlO1xuICAgIGludGVyYWN0aW9uTW9kZTpJbnRlcmFjdGlvbk1vZGUgPSAnaW1tZXJzaXZlJztcbiAgICBpbnRlcmFjdGlvbk1vZGVCdXR0b25FbmFibGVkID0gZmFsc2U7XG4gICAgbGF5ZXJEZXRhaWxzOkxheWVyRGV0YWlscyA9IG5ldyBMYXllckRldGFpbHMobnVsbClcbiAgICBjdXJyZW50VXJpID0gJyc7XG4gICAgaXNGYXZvcml0ZSA9IGZhbHNlO1xuXG4gICAgcHVibGljIGFyZ29uOkFyZ29uLkFyZ29uU3lzdGVtO1xuXG4gICAgcHJpdmF0ZSBfcmVzb2x2ZVJlYWR5OkZ1bmN0aW9uO1xuICAgIHJlYWR5OlByb21pc2U8dm9pZD47XG4gICAgXG4gICAgc3RhdGljIGxvYWRVcmxFdmVudDonbG9hZFVybCcgPSAnbG9hZFVybCdcbiAgICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgYm9va21hcmtzLmZhdm9yaXRlTGlzdC5vbignY2hhbmdlJywoKT0+e1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRmF2b3JpdGVTdGF0dXMoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5yZWFkeSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9yZXNvbHZlUmVhZHkgPSByZXNvbHZlO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHNldFJlYWR5KCkge1xuICAgICAgICBjb25zdCBjb250YWluZXIgPSBuZXcgQXJnb24uREkuQ29udGFpbmVyO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uRGV2aWNlU2VydmljZSwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSk7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5WdWZvcmlhU2VydmljZVByb3ZpZGVyLCBOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLkRldmljZVNlcnZpY2VQcm92aWRlciwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZVByb3ZpZGVyKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLlJlYWxpdHlWaWV3ZXJGYWN0b3J5LCBOYXRpdmVzY3JpcHRSZWFsaXR5Vmlld2VyRmFjdG9yeSk7XG5cbiAgICAgICAgY29uc3QgYXJnb24gPSB0aGlzLmFyZ29uID0gQXJnb24uaW5pdChudWxsLCB7XG4gICAgICAgICAgICByb2xlOiBBcmdvbi5Sb2xlLk1BTkFHRVIsXG4gICAgICAgICAgICB0aXRsZTogJ0FyZ29uQXBwJ1xuICAgICAgICB9LCBjb250YWluZXIpO1xuXG4gICAgICAgIGFyZ29uLnJlYWxpdHkuZGVmYXVsdCA9IEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRTtcblxuICAgICAgICBhcmdvbi5wcm92aWRlci5yZWFsaXR5Lmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgaWYgKCFib29rbWFya3MucmVhbGl0eU1hcC5nZXQodmlld2VyLnVyaSkpIHtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucmVhbGl0eUxpc3QucHVzaChuZXcgYm9va21hcmtzLkJvb2ttYXJrSXRlbSh7dXJpOiB2aWV3ZXIudXJpfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBhcmdvbi5wcm92aWRlci5yZWFsaXR5LnVuaW5zdGFsbGVkRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe3ZpZXdlcn0pPT57XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gYm9va21hcmtzLnJlYWxpdHlNYXAuZ2V0KHZpZXdlci51cmkpO1xuICAgICAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gYm9va21hcmtzLnJlYWxpdHlMaXN0LmluZGV4T2YoaXRlbSk7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnJlYWxpdHlMaXN0LnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb25Gb2N1c0V2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXJnb24gZm9jdXMgY2hhbmdlZDogXCIgKyAoY3VycmVudCA/IGN1cnJlbnQudXJpIDogdW5kZWZpbmVkKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFyZ29uLnZ1Zm9yaWEuaXNBdmFpbGFibGUoKS50aGVuKChhdmFpbGFibGUpPT57XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5ID0gZ2V0SW50ZXJuYWxWdWZvcmlhS2V5KCkgfHwgREVCVUdfREVWRUxPUE1FTlRfTElDRU5TRV9LRVk7XG4gICAgICAgICAgICAgICAgaWYgKCFwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJVbmFibGUgdG8gbG9jYXRlIGludGVybmFsIFZ1Zm9yaWEgTGljZW5zZSBLZXlcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXJnb24udnVmb3JpYS5pbml0V2l0aFVuZW5jcnlwdGVkS2V5KHByaW1hcnlWdWZvcmlhTGljZW5zZUtleSkuY2F0Y2goKGVycik9PntcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3Jlc29sdmVSZWFkeSgpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVNZW51KCkge1xuICAgICAgICB0aGlzLnNldCgnbWVudU9wZW4nLCAhdGhpcy5tZW51T3Blbik7XG4gICAgfVxuICAgIFxuICAgIGhpZGVNZW51KCkge1xuICAgICAgICB0aGlzLnNldCgnbWVudU9wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZUludGVyYWN0aW9uTW9kZSgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2ludGVyYWN0aW9uTW9kZScsIHRoaXMuaW50ZXJhY3Rpb25Nb2RlID09PSAncGFnZScgPyAnaW1tZXJzaXZlJyA6ICdwYWdlJylcbiAgICB9XG4gICAgXG4gICAgc2V0SW50ZXJhY3Rpb25Nb2RlKG1vZGU6SW50ZXJhY3Rpb25Nb2RlKSB7XG4gICAgICAgIHRoaXMuc2V0KCdpbnRlcmFjdGlvbk1vZGUnLCBtb2RlKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd092ZXJ2aWV3KCkge1xuICAgICAgICB0aGlzLnNldCgnb3ZlcnZpZXdPcGVuJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVPdmVydmlldygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlT3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdvdmVydmlld09wZW4nLCAhdGhpcy5vdmVydmlld09wZW4pO1xuICAgIH1cbiAgICBcbiAgICBzaG93Qm9va21hcmtzKCkge1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlQm9va21hcmtzKCkge1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd1JlYWxpdHlDaG9vc2VyKCkge1xuICAgICAgICB0aGlzLnNldCgncmVhbGl0eUNob29zZXJPcGVuJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVSZWFsaXR5Q2hvb3NlcigpIHtcbiAgICAgICAgdGhpcy5zZXQoJ3JlYWxpdHlDaG9vc2VyT3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd0NhbmNlbEJ1dHRvbigpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2NhbmNlbEJ1dHRvblNob3duJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVDYW5jZWxCdXR0b24oKSB7XG4gICAgICAgIHRoaXMuc2V0KCdjYW5jZWxCdXR0b25TaG93bicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlRGVidWcoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdkZWJ1Z0VuYWJsZWQnLCAhdGhpcy5kZWJ1Z0VuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICBzZXREZWJ1Z0VuYWJsZWQoZW5hYmxlZDpib29sZWFuKSB7XG4gICAgICAgIHRoaXMuc2V0KCdkZWJ1Z0VuYWJsZWQnLCBlbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlVmlld2VyKCkge1xuICAgICAgICB0aGlzLnNldFZpZXdlckVuYWJsZWQoIXRoaXMudmlld2VyRW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHNldFZpZXdlckVuYWJsZWQoZW5hYmxlZDpib29sZWFuKSB7XG4gICAgICAgIHRoaXMuc2V0KCd2aWV3ZXJFbmFibGVkJywgZW5hYmxlZCk7XG4gICAgICAgIGlmIChlbmFibGVkKSB0aGlzLmFyZ29uLmRldmljZS5yZXF1ZXN0UHJlc2VudEhNRCgpO1xuICAgICAgICBlbHNlIHRoaXMuYXJnb24uZGV2aWNlLmV4aXRQcmVzZW50SE1EKCk7XG4gICAgfVxuXG4gICAgX29uTGF5ZXJEZXRhaWxzQ2hhbmdlKGRhdGE6UHJvcGVydHlDaGFuZ2VEYXRhKSB7XG4gICAgICAgIGlmIChkYXRhLnByb3BlcnR5TmFtZSA9PT0gJ3VyaScpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdjdXJyZW50VXJpJywgZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgc2V0TGF5ZXJEZXRhaWxzKGRldGFpbHM6TGF5ZXJEZXRhaWxzKSB7XG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzLm9mZigncHJvcGVydHlDaGFuZ2UnLCB0aGlzLl9vbkxheWVyRGV0YWlsc0NoYW5nZSwgdGhpcyk7XG4gICAgICAgIHRoaXMuc2V0KCdsYXllckRldGFpbHMnLCBkZXRhaWxzKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhZGV0YWlscy51cmkpO1xuICAgICAgICB0aGlzLnNldCgnY3VycmVudFVyaScsIGRldGFpbHMudXJpKTtcbiAgICAgICAgdGhpcy51cGRhdGVGYXZvcml0ZVN0YXR1cygpO1xuICAgICAgICBkZXRhaWxzLm9uKCdwcm9wZXJ0eUNoYW5nZScsIHRoaXMuX29uTGF5ZXJEZXRhaWxzQ2hhbmdlLCB0aGlzKTtcbiAgICB9XG4gICAgXG4gICAgdXBkYXRlRmF2b3JpdGVTdGF0dXMoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdpc0Zhdm9yaXRlJywgISFib29rbWFya3MuZmF2b3JpdGVNYXAuZ2V0KHRoaXMuY3VycmVudFVyaSkpO1xuICAgIH1cbiAgICBcbiAgICBsb2FkVXJsKHVybDpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5ub3RpZnkoPExvYWRVcmxFdmVudERhdGE+e1xuICAgICAgICAgICAgZXZlbnROYW1lOiBBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LFxuICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgdXJsXG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzLnNldCgndXJpJywgdXJsKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhdXJsKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcHBWaWV3TW9kZWwgPSBuZXcgQXBwVmlld01vZGVsOyJdfQ==