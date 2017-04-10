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
            url: url,
            newLayer: false
        });
        this.layerDetails.set('uri', url);
        this.set('bookmarksOpen', !url);
    };
    AppViewModel.prototype.openUrl = function (url) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQXlFO0FBQ3pFLDBEQUFxRDtBQUNyRCx1Q0FBd0M7QUFDeEMsc0NBQXdDO0FBQ3hDLG1FQUEyRztBQUMzRyxpRUFBcUc7QUFDckcsaUVBQXVHO0FBQ3ZHLCtCQUE2QztBQVM3QztJQUFrQyxnQ0FBVTtJQUE1QztRQUFBLHFFQUlDO1FBSEcsU0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNULFdBQUssR0FBRyxFQUFFLENBQUM7UUFDWCxTQUFHLEdBQUcsSUFBSSxrQ0FBZSxFQUFXLENBQUM7O0lBQ3pDLENBQUM7SUFBRCxtQkFBQztBQUFELENBQUMsQUFKRCxDQUFrQyx1QkFBVSxHQUkzQztBQUpZLG9DQUFZO0FBT3pCLElBQXNCLGdDQUFnQztJQUNsRCwwQ0FDWSxrQkFBa0IsRUFDbEIsb0JBQW9CO1FBRHBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBQTtRQUNsQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQUE7SUFDaEMsQ0FBQztJQUVELDhEQUFtQixHQUFuQixVQUFvQixHQUFVO1FBQzFCLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDakIsS0FBSyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUk7Z0JBQ3pCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QyxhQUFhLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hELGFBQWEsQ0FBQyxHQUFHLEdBQUcs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LENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCw4QkFBTyxHQUFQLFVBQVEsR0FBVTtRQUNkLElBQUksQ0FBQyxNQUFNLENBQW1CO1lBQzFCLFNBQVMsRUFBRSxZQUFZLENBQUMsWUFBWTtZQUNwQyxNQUFNLEVBQUUsSUFBSTtZQUNaLEdBQUcsS0FBQTtZQUNILFFBQVEsRUFBRSxJQUFJO1NBQ2pCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUFqTUQsQ0FBa0MsdUJBQVU7QUFtQmpDLHlCQUFZLEdBQWEsU0FBUyxDQUFBO0FBbkJoQyxvQ0FBWTtBQW1NWixRQUFBLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZSwgUHJvcGVydHlDaGFuZ2VEYXRhLCBFdmVudERhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknXG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9ib29rbWFya3MnXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIsIERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tZGV2aWNlLXByb3ZpZGVyJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0TGl2ZVJlYWxpdHlWaWV3ZXIsIE5hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXJ9IGZyb20gJy4vYXJnb24tcmVhbGl0eS12aWV3ZXJzJztcbmltcG9ydCB7Z2V0SW50ZXJuYWxWdWZvcmlhS2V5fSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHtMb2dJdGVtfSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZFVybEV2ZW50RGF0YSBleHRlbmRzIEV2ZW50RGF0YSB7XG4gICAgZXZlbnROYW1lOiAnbG9hZFVybCcsXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgbmV3TGF5ZXI6IGJvb2xlYW4sXG59XG5cbmV4cG9ydCBjbGFzcyBMYXllckRldGFpbHMgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICB1cmkgPSAnJztcbiAgICB0aXRsZSA9ICcnO1xuICAgIGxvZyA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8TG9nSXRlbT4oKTtcbn1cblxuQEFyZ29uLkRJLmluamVjdChBcmdvbi5ESS5GYWN0b3J5Lm9mKE5hdGl2ZXNjcmlwdExpdmVSZWFsaXR5Vmlld2VyKSwgQXJnb24uREkuRmFjdG9yeS5vZihOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOYXRpdmVzY3JpcHRSZWFsaXR5Vmlld2VyRmFjdG9yeSB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgX2NyZWF0ZUxpdmVSZWFsaXR5LCBcbiAgICAgICAgcHJpdmF0ZSBfY3JlYXRlSG9zdGVkUmVhbGl0eSkge1xuICAgIH1cblxuICAgIGNyZWF0ZVJlYWxpdHlWaWV3ZXIodXJpOnN0cmluZykgOiBBcmdvbi5SZWFsaXR5Vmlld2VyIHtcbiAgICAgICAgY29uc3Qgdmlld2VyVHlwZSA9IEFyZ29uLlJlYWxpdHlWaWV3ZXIuZ2V0VHlwZSh1cmkpO1xuICAgICAgICBzd2l0Y2ggKHZpZXdlclR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFOlxuICAgICAgICAgICAgICAgIHZhciByZWFsaXR5Vmlld2VyID0gdGhpcy5fY3JlYXRlTGl2ZVJlYWxpdHkoKTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Vmlld2VyLnVyaSA9IHVyaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVhbGl0eVZpZXdlcjtcbiAgICAgICAgICAgIGNhc2UgJ2hvc3RlZCc6XG4gICAgICAgICAgICAgICAgdmFyIHJlYWxpdHlWaWV3ZXIgPSB0aGlzLl9jcmVhdGVIb3N0ZWRSZWFsaXR5KCk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eVZpZXdlci51cmkgPSB1cmk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYWxpdHlWaWV3ZXI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgUmVhbGl0eSBWaWV3ZXIgVVJJOiAnICsgdXJpKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBJbnRlcmFjdGlvbk1vZGUgPSAnaW1tZXJzaXZlJ3wncGFnZSc7XG5cbmV4cG9ydCBjbGFzcyBBcHBWaWV3TW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBtZW51T3BlbiA9IGZhbHNlO1xuICAgIGNhbmNlbEJ1dHRvblNob3duID0gZmFsc2U7XG4gICAgcmVhbGl0eUNob29zZXJPcGVuID0gZmFsc2U7XG4gICAgb3ZlcnZpZXdPcGVuID0gZmFsc2U7XG4gICAgYm9va21hcmtzT3BlbiA9IGZhbHNlO1xuICAgIGRlYnVnRW5hYmxlZCA9IGZhbHNlO1xuICAgIHZpZXdlckVuYWJsZWQgPSBmYWxzZTtcbiAgICBpbnRlcmFjdGlvbk1vZGU6SW50ZXJhY3Rpb25Nb2RlID0gJ2ltbWVyc2l2ZSc7XG4gICAgaW50ZXJhY3Rpb25Nb2RlQnV0dG9uRW5hYmxlZCA9IGZhbHNlO1xuICAgIGxheWVyRGV0YWlsczpMYXllckRldGFpbHMgPSBuZXcgTGF5ZXJEZXRhaWxzKG51bGwpXG4gICAgY3VycmVudFVyaSA9ICcnO1xuICAgIGlzRmF2b3JpdGUgPSBmYWxzZTtcblxuICAgIHB1YmxpYyBhcmdvbjpBcmdvbi5BcmdvblN5c3RlbTtcblxuICAgIHByaXZhdGUgX3Jlc29sdmVSZWFkeTpGdW5jdGlvbjtcbiAgICByZWFkeTpQcm9taXNlPHZvaWQ+O1xuICAgIFxuICAgIHN0YXRpYyBsb2FkVXJsRXZlbnQ6J2xvYWRVcmwnID0gJ2xvYWRVcmwnXG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Qub24oJ2NoYW5nZScsKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMucmVhZHkgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5ID0gcmVzb2x2ZTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzZXRSZWFkeSgpIHtcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbmV3IEFyZ29uLkRJLkNvbnRhaW5lcjtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLkRldmljZVNlcnZpY2UsIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UpO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlciwgTmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcik7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5EZXZpY2VTZXJ2aWNlUHJvdmlkZXIsIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2VQcm92aWRlcik7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5SZWFsaXR5Vmlld2VyRmFjdG9yeSwgTmF0aXZlc2NyaXB0UmVhbGl0eVZpZXdlckZhY3RvcnkpO1xuXG4gICAgICAgIGNvbnN0IGFyZ29uID0gdGhpcy5hcmdvbiA9IEFyZ29uLmluaXQobnVsbCwge1xuICAgICAgICAgICAgcm9sZTogQXJnb24uUm9sZS5NQU5BR0VSLFxuICAgICAgICAgICAgdGl0bGU6ICdBcmdvbkFwcCdcbiAgICAgICAgfSwgY29udGFpbmVyKTtcblxuICAgICAgICBhcmdvbi5yZWFsaXR5LmRlZmF1bHQgPSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkU7XG5cbiAgICAgICAgYXJnb24ucHJvdmlkZXIucmVhbGl0eS5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgIGlmICghYm9va21hcmtzLnJlYWxpdHlNYXAuZ2V0KHZpZXdlci51cmkpKSB7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnJlYWxpdHlMaXN0LnB1c2gobmV3IGJvb2ttYXJrcy5Cb29rbWFya0l0ZW0oe3VyaTogdmlld2VyLnVyaX0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXJnb24ucHJvdmlkZXIucmVhbGl0eS51bmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGJvb2ttYXJrcy5yZWFsaXR5TWFwLmdldCh2aWV3ZXIudXJpKTtcbiAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5pbmRleE9mKGl0ZW0pO1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBhcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uRm9jdXNFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7Y3VycmVudH0pPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFyZ29uIGZvY3VzIGNoYW5nZWQ6IFwiICsgKGN1cnJlbnQgPyBjdXJyZW50LnVyaSA6IHVuZGVmaW5lZCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBhcmdvbi52dWZvcmlhLmlzQXZhaWxhYmxlKCkudGhlbigoYXZhaWxhYmxlKT0+e1xuICAgICAgICAgICAgaWYgKGF2YWlsYWJsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByaW1hcnlWdWZvcmlhTGljZW5zZUtleSA9IGdldEludGVybmFsVnVmb3JpYUtleSgpIHx8IERFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZO1xuICAgICAgICAgICAgICAgIGlmICghcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiVW5hYmxlIHRvIGxvY2F0ZSBpbnRlcm5hbCBWdWZvcmlhIExpY2Vuc2UgS2V5XCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFyZ29uLnZ1Zm9yaWEuaW5pdFdpdGhVbmVuY3J5cHRlZEtleShwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkpLmNhdGNoKChlcnIpPT57XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9yZXNvbHZlUmVhZHkoKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlTWVudSgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ21lbnVPcGVuJywgIXRoaXMubWVudU9wZW4pO1xuICAgIH1cbiAgICBcbiAgICBoaWRlTWVudSgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ21lbnVPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVJbnRlcmFjdGlvbk1vZGUoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdpbnRlcmFjdGlvbk1vZGUnLCB0aGlzLmludGVyYWN0aW9uTW9kZSA9PT0gJ3BhZ2UnID8gJ2ltbWVyc2l2ZScgOiAncGFnZScpXG4gICAgfVxuICAgIFxuICAgIHNldEludGVyYWN0aW9uTW9kZShtb2RlOkludGVyYWN0aW9uTW9kZSkge1xuICAgICAgICB0aGlzLnNldCgnaW50ZXJhY3Rpb25Nb2RlJywgbW9kZSk7XG4gICAgfVxuICAgIFxuICAgIHNob3dPdmVydmlldygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlT3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdvdmVydmlld09wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZU92ZXJ2aWV3KCkge1xuICAgICAgICB0aGlzLnNldCgnb3ZlcnZpZXdPcGVuJywgIXRoaXMub3ZlcnZpZXdPcGVuKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd0Jvb2ttYXJrcygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZUJvb2ttYXJrcygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHNob3dSZWFsaXR5Q2hvb3NlcigpIHtcbiAgICAgICAgdGhpcy5zZXQoJ3JlYWxpdHlDaG9vc2VyT3BlbicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlUmVhbGl0eUNob29zZXIoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdyZWFsaXR5Q2hvb3Nlck9wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHNob3dDYW5jZWxCdXR0b24oKSB7XG4gICAgICAgIHRoaXMuc2V0KCdjYW5jZWxCdXR0b25TaG93bicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlQ2FuY2VsQnV0dG9uKCkge1xuICAgICAgICB0aGlzLnNldCgnY2FuY2VsQnV0dG9uU2hvd24nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZURlYnVnKCkge1xuICAgICAgICB0aGlzLnNldCgnZGVidWdFbmFibGVkJywgIXRoaXMuZGVidWdFbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgc2V0RGVidWdFbmFibGVkKGVuYWJsZWQ6Ym9vbGVhbikge1xuICAgICAgICB0aGlzLnNldCgnZGVidWdFbmFibGVkJywgZW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZVZpZXdlcigpIHtcbiAgICAgICAgdGhpcy5zZXRWaWV3ZXJFbmFibGVkKCF0aGlzLnZpZXdlckVuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICBzZXRWaWV3ZXJFbmFibGVkKGVuYWJsZWQ6Ym9vbGVhbikge1xuICAgICAgICB0aGlzLnNldCgndmlld2VyRW5hYmxlZCcsIGVuYWJsZWQpO1xuICAgICAgICBpZiAoZW5hYmxlZCkgdGhpcy5hcmdvbi5kZXZpY2UucmVxdWVzdFByZXNlbnRITUQoKTtcbiAgICAgICAgZWxzZSB0aGlzLmFyZ29uLmRldmljZS5leGl0UHJlc2VudEhNRCgpO1xuICAgIH1cblxuICAgIF9vbkxheWVyRGV0YWlsc0NoYW5nZShkYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkge1xuICAgICAgICBpZiAoZGF0YS5wcm9wZXJ0eU5hbWUgPT09ICd1cmknKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgnY3VycmVudFVyaScsIGRhdGEudmFsdWUpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVGYXZvcml0ZVN0YXR1cygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHNldExheWVyRGV0YWlscyhkZXRhaWxzOkxheWVyRGV0YWlscykge1xuICAgICAgICB0aGlzLmxheWVyRGV0YWlscy5vZmYoJ3Byb3BlcnR5Q2hhbmdlJywgdGhpcy5fb25MYXllckRldGFpbHNDaGFuZ2UsIHRoaXMpO1xuICAgICAgICB0aGlzLnNldCgnbGF5ZXJEZXRhaWxzJywgZGV0YWlscyk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgIWRldGFpbHMudXJpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2N1cnJlbnRVcmknLCBkZXRhaWxzLnVyaSk7XG4gICAgICAgIHRoaXMudXBkYXRlRmF2b3JpdGVTdGF0dXMoKTtcbiAgICAgICAgZGV0YWlscy5vbigncHJvcGVydHlDaGFuZ2UnLCB0aGlzLl9vbkxheWVyRGV0YWlsc0NoYW5nZSwgdGhpcyk7XG4gICAgfVxuICAgIFxuICAgIHVwZGF0ZUZhdm9yaXRlU3RhdHVzKCkge1xuICAgICAgICB0aGlzLnNldCgnaXNGYXZvcml0ZScsICEhYm9va21hcmtzLmZhdm9yaXRlTWFwLmdldCh0aGlzLmN1cnJlbnRVcmkpKTtcbiAgICB9XG4gICAgXG4gICAgbG9hZFVybCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMubm90aWZ5KDxMb2FkVXJsRXZlbnREYXRhPntcbiAgICAgICAgICAgIGV2ZW50TmFtZTogQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCxcbiAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIG5ld0xheWVyOiBmYWxzZVxuICAgICAgICB9KVxuICAgICAgICB0aGlzLmxheWVyRGV0YWlscy5zZXQoJ3VyaScsIHVybCk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgIXVybCk7XG4gICAgfVxuXG4gICAgb3BlblVybCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMubm90aWZ5KDxMb2FkVXJsRXZlbnREYXRhPntcbiAgICAgICAgICAgIGV2ZW50TmFtZTogQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCxcbiAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIG5ld0xheWVyOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxheWVyRGV0YWlscy5zZXQoJ3VyaScsIHVybCk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgIXVybCk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgYXBwVmlld01vZGVsID0gbmV3IEFwcFZpZXdNb2RlbDsiXX0=