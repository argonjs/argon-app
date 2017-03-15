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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQXlFO0FBQ3pFLDBEQUFxRDtBQUNyRCx1Q0FBd0M7QUFDeEMsc0NBQXdDO0FBQ3hDLG1FQUE0RTtBQUM1RSxpRUFBcUc7QUFDckcsaUVBQXVHO0FBQ3ZHLCtCQUE2QztBQVE3QztJQUFrQyxnQ0FBVTtJQUE1QztRQUFBLHFFQUlDO1FBSEcsU0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNULFdBQUssR0FBRyxFQUFFLENBQUM7UUFDWCxTQUFHLEdBQUcsSUFBSSxrQ0FBZSxFQUFXLENBQUM7O0lBQ3pDLENBQUM7SUFBRCxtQkFBQztBQUFELENBQUMsQUFKRCxDQUFrQyx1QkFBVSxHQUkzQztBQUpZLG9DQUFZO0FBT3pCLElBQXNCLGdDQUFnQztJQUNsRCwwQ0FDWSxrQkFBa0IsRUFDbEIsb0JBQW9CO1FBRHBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBQTtRQUNsQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQUE7SUFDaEMsQ0FBQztJQUVELDhEQUFtQixHQUFuQixVQUFvQixHQUFVO1FBQzFCLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDakIsS0FBSyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUk7Z0JBQ3pCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QyxhQUFhLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2hELGFBQWEsQ0FBQyxHQUFHLEdBQUcs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QUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUFyTEQsQ0FBa0MsdUJBQVU7QUFtQmpDLHlCQUFZLEdBQWEsU0FBUyxDQUFBO0FBbkJoQyxvQ0FBWTtBQXVMWixRQUFBLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZSwgUHJvcGVydHlDaGFuZ2VEYXRhLCBFdmVudERhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknXG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9ib29rbWFya3MnXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1wcm92aWRlcic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UsIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi1kZXZpY2UtcHJvdmlkZXInO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRMaXZlUmVhbGl0eVZpZXdlciwgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcn0gZnJvbSAnLi9hcmdvbi1yZWFsaXR5LXZpZXdlcnMnO1xuaW1wb3J0IHtnZXRJbnRlcm5hbFZ1Zm9yaWFLZXl9IGZyb20gJy4vdXRpbCc7XG5pbXBvcnQge0xvZ0l0ZW19IGZyb20gJ2FyZ29uLXdlYi12aWV3JztcblxuZXhwb3J0IGludGVyZmFjZSBMb2FkVXJsRXZlbnREYXRhIGV4dGVuZHMgRXZlbnREYXRhIHtcbiAgICBldmVudE5hbWU6ICdsb2FkVXJsJyxcbiAgICB1cmw6IHN0cmluZ1xufVxuXG5leHBvcnQgY2xhc3MgTGF5ZXJEZXRhaWxzIGV4dGVuZHMgT2JzZXJ2YWJsZSB7XG4gICAgdXJpID0gJyc7XG4gICAgdGl0bGUgPSAnJztcbiAgICBsb2cgPSBuZXcgT2JzZXJ2YWJsZUFycmF5PExvZ0l0ZW0+KCk7XG59XG5cbkBBcmdvbi5ESS5pbmplY3QoQXJnb24uREkuRmFjdG9yeS5vZihOYXRpdmVzY3JpcHRMaXZlUmVhbGl0eVZpZXdlciksIEFyZ29uLkRJLkZhY3Rvcnkub2YoTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikpXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTmF0aXZlc2NyaXB0UmVhbGl0eVZpZXdlckZhY3Rvcnkge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIF9jcmVhdGVMaXZlUmVhbGl0eSwgXG4gICAgICAgIHByaXZhdGUgX2NyZWF0ZUhvc3RlZFJlYWxpdHkpIHtcbiAgICB9XG5cbiAgICBjcmVhdGVSZWFsaXR5Vmlld2VyKHVyaTpzdHJpbmcpIDogQXJnb24uUmVhbGl0eVZpZXdlciB7XG4gICAgICAgIGNvbnN0IHZpZXdlclR5cGUgPSBBcmdvbi5SZWFsaXR5Vmlld2VyLmdldFR5cGUodXJpKTtcbiAgICAgICAgc3dpdGNoICh2aWV3ZXJUeXBlKSB7XG4gICAgICAgICAgICBjYXNlIEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRTpcbiAgICAgICAgICAgICAgICB2YXIgcmVhbGl0eVZpZXdlciA9IHRoaXMuX2NyZWF0ZUxpdmVSZWFsaXR5KCk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eVZpZXdlci51cmkgPSB1cmk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYWxpdHlWaWV3ZXI7XG4gICAgICAgICAgICBjYXNlICdob3N0ZWQnOlxuICAgICAgICAgICAgICAgIHZhciByZWFsaXR5Vmlld2VyID0gdGhpcy5fY3JlYXRlSG9zdGVkUmVhbGl0eSgpO1xuICAgICAgICAgICAgICAgIHJlYWxpdHlWaWV3ZXIudXJpID0gdXJpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWFsaXR5Vmlld2VyO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIFJlYWxpdHkgVmlld2VyIFVSSTogJyArIHVyaSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgSW50ZXJhY3Rpb25Nb2RlID0gJ2ltbWVyc2l2ZSd8J3BhZ2UnO1xuXG5leHBvcnQgY2xhc3MgQXBwVmlld01vZGVsIGV4dGVuZHMgT2JzZXJ2YWJsZSB7XG4gICAgbWVudU9wZW4gPSBmYWxzZTtcbiAgICBjYW5jZWxCdXR0b25TaG93biA9IGZhbHNlO1xuICAgIHJlYWxpdHlDaG9vc2VyT3BlbiA9IGZhbHNlO1xuICAgIG92ZXJ2aWV3T3BlbiA9IGZhbHNlO1xuICAgIGJvb2ttYXJrc09wZW4gPSBmYWxzZTtcbiAgICBkZWJ1Z0VuYWJsZWQgPSBmYWxzZTtcbiAgICB2aWV3ZXJFbmFibGVkID0gZmFsc2U7XG4gICAgaW50ZXJhY3Rpb25Nb2RlOkludGVyYWN0aW9uTW9kZSA9ICdpbW1lcnNpdmUnO1xuICAgIGludGVyYWN0aW9uTW9kZUJ1dHRvbkVuYWJsZWQgPSBmYWxzZTtcbiAgICBsYXllckRldGFpbHM6TGF5ZXJEZXRhaWxzID0gbmV3IExheWVyRGV0YWlscyhudWxsKVxuICAgIGN1cnJlbnRVcmkgPSAnJztcbiAgICBpc0Zhdm9yaXRlID0gZmFsc2U7XG5cbiAgICBwdWJsaWMgYXJnb246QXJnb24uQXJnb25TeXN0ZW07XG5cbiAgICBwcml2YXRlIF9yZXNvbHZlUmVhZHk6RnVuY3Rpb247XG4gICAgcmVhZHk6UHJvbWlzZTx2b2lkPjtcbiAgICBcbiAgICBzdGF0aWMgbG9hZFVybEV2ZW50Oidsb2FkVXJsJyA9ICdsb2FkVXJsJ1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBib29rbWFya3MuZmF2b3JpdGVMaXN0Lm9uKCdjaGFuZ2UnLCgpPT57XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVGYXZvcml0ZVN0YXR1cygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLnJlYWR5ID0gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVSZWFkeSA9IHJlc29sdmU7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgc2V0UmVhZHkoKSB7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG5ldyBBcmdvbi5ESS5Db250YWluZXI7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5EZXZpY2VTZXJ2aWNlLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlKTtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIsIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uRGV2aWNlU2VydmljZVByb3ZpZGVyLCBOYXRpdmVzY3JpcHREZXZpY2VTZXJ2aWNlUHJvdmlkZXIpO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uUmVhbGl0eVZpZXdlckZhY3RvcnksIE5hdGl2ZXNjcmlwdFJlYWxpdHlWaWV3ZXJGYWN0b3J5KTtcblxuICAgICAgICBjb25zdCBhcmdvbiA9IHRoaXMuYXJnb24gPSBBcmdvbi5pbml0KG51bGwsIHtcbiAgICAgICAgICAgIHJvbGU6IEFyZ29uLlJvbGUuTUFOQUdFUixcbiAgICAgICAgICAgIHRpdGxlOiAnQXJnb25BcHAnXG4gICAgICAgIH0sIGNvbnRhaW5lcik7XG5cbiAgICAgICAgYXJnb24ucmVhbGl0eS5kZWZhdWx0ID0gQXJnb24uUmVhbGl0eVZpZXdlci5MSVZFO1xuXG4gICAgICAgIGFyZ29uLnByb3ZpZGVyLnJlYWxpdHkuaW5zdGFsbGVkRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe3ZpZXdlcn0pPT57XG4gICAgICAgICAgICBpZiAoIWJvb2ttYXJrcy5yZWFsaXR5TWFwLmdldCh2aWV3ZXIudXJpKSkge1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5wdXNoKG5ldyBib29rbWFya3MuQm9va21hcmtJdGVtKHt1cmk6IHZpZXdlci51cml9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFyZ29uLnByb3ZpZGVyLnJlYWxpdHkudW5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBib29rbWFya3MucmVhbGl0eU1hcC5nZXQodmlld2VyLnVyaSk7XG4gICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBib29rbWFya3MucmVhbGl0eUxpc3QuaW5kZXhPZihpdGVtKTtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucmVhbGl0eUxpc3Quc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgYXJnb24ucHJvdmlkZXIuZm9jdXMuc2Vzc2lvbkZvY3VzRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBcmdvbiBmb2N1cyBjaGFuZ2VkOiBcIiArIChjdXJyZW50ID8gY3VycmVudC51cmkgOiB1bmRlZmluZWQpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXJnb24udnVmb3JpYS5pc0F2YWlsYWJsZSgpLnRoZW4oKGF2YWlsYWJsZSk9PntcbiAgICAgICAgICAgIGlmIChhdmFpbGFibGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkgPSBnZXRJbnRlcm5hbFZ1Zm9yaWFLZXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXByaW1hcnlWdWZvcmlhTGljZW5zZUtleSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChcIlVuYWJsZSB0byBsb2NhdGUgaW50ZXJuYWwgVnVmb3JpYSBMaWNlbnNlIEtleVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcmdvbi52dWZvcmlhLmluaXRXaXRoVW5lbmNyeXB0ZWRLZXkocHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5KS5jYXRjaCgoZXJyKT0+e1xuICAgICAgICAgICAgICAgICAgICBhbGVydChlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5KCk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZU1lbnUoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdtZW51T3BlbicsICF0aGlzLm1lbnVPcGVuKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZU1lbnUoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdtZW51T3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlSW50ZXJhY3Rpb25Nb2RlKCkge1xuICAgICAgICB0aGlzLnNldCgnaW50ZXJhY3Rpb25Nb2RlJywgdGhpcy5pbnRlcmFjdGlvbk1vZGUgPT09ICdwYWdlJyA/ICdpbW1lcnNpdmUnIDogJ3BhZ2UnKVxuICAgIH1cbiAgICBcbiAgICBzZXRJbnRlcmFjdGlvbk1vZGUobW9kZTpJbnRlcmFjdGlvbk1vZGUpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2ludGVyYWN0aW9uTW9kZScsIG1vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdvdmVydmlld09wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZU92ZXJ2aWV3KCkge1xuICAgICAgICB0aGlzLnNldCgnb3ZlcnZpZXdPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVPdmVydmlldygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsICF0aGlzLm92ZXJ2aWV3T3Blbik7XG4gICAgfVxuICAgIFxuICAgIHNob3dCb29rbWFya3MoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVCb29rbWFya3MoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICBzaG93UmVhbGl0eUNob29zZXIoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdyZWFsaXR5Q2hvb3Nlck9wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZVJlYWxpdHlDaG9vc2VyKCkge1xuICAgICAgICB0aGlzLnNldCgncmVhbGl0eUNob29zZXJPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICBzaG93Q2FuY2VsQnV0dG9uKCkge1xuICAgICAgICB0aGlzLnNldCgnY2FuY2VsQnV0dG9uU2hvd24nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZUNhbmNlbEJ1dHRvbigpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2NhbmNlbEJ1dHRvblNob3duJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVEZWJ1ZygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2RlYnVnRW5hYmxlZCcsICF0aGlzLmRlYnVnRW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHNldERlYnVnRW5hYmxlZChlbmFibGVkOmJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5zZXQoJ2RlYnVnRW5hYmxlZCcsIGVuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVWaWV3ZXIoKSB7XG4gICAgICAgIHRoaXMuc2V0Vmlld2VyRW5hYmxlZCghdGhpcy52aWV3ZXJFbmFibGVkKTtcbiAgICB9XG4gICAgXG4gICAgc2V0Vmlld2VyRW5hYmxlZChlbmFibGVkOmJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5zZXQoJ3ZpZXdlckVuYWJsZWQnLCBlbmFibGVkKTtcbiAgICAgICAgaWYgKGVuYWJsZWQpIHRoaXMuYXJnb24uZGV2aWNlLnJlcXVlc3RQcmVzZW50SE1EKCk7XG4gICAgICAgIGVsc2UgdGhpcy5hcmdvbi5kZXZpY2UuZXhpdFByZXNlbnRITUQoKTtcbiAgICB9XG5cbiAgICBfb25MYXllckRldGFpbHNDaGFuZ2UoZGF0YTpQcm9wZXJ0eUNoYW5nZURhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEucHJvcGVydHlOYW1lID09PSAndXJpJykge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ2N1cnJlbnRVcmknLCBkYXRhLnZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRmF2b3JpdGVTdGF0dXMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBzZXRMYXllckRldGFpbHMoZGV0YWlsczpMYXllckRldGFpbHMpIHtcbiAgICAgICAgdGhpcy5sYXllckRldGFpbHMub2ZmKCdwcm9wZXJ0eUNoYW5nZScsIHRoaXMuX29uTGF5ZXJEZXRhaWxzQ2hhbmdlLCB0aGlzKTtcbiAgICAgICAgdGhpcy5zZXQoJ2xheWVyRGV0YWlscycsIGRldGFpbHMpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsICFkZXRhaWxzLnVyaSk7XG4gICAgICAgIHRoaXMuc2V0KCdjdXJyZW50VXJpJywgZGV0YWlscy51cmkpO1xuICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgIGRldGFpbHMub24oJ3Byb3BlcnR5Q2hhbmdlJywgdGhpcy5fb25MYXllckRldGFpbHNDaGFuZ2UsIHRoaXMpO1xuICAgIH1cbiAgICBcbiAgICB1cGRhdGVGYXZvcml0ZVN0YXR1cygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2lzRmF2b3JpdGUnLCAhIWJvb2ttYXJrcy5mYXZvcml0ZU1hcC5nZXQodGhpcy5jdXJyZW50VXJpKSk7XG4gICAgfVxuICAgIFxuICAgIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICB0aGlzLm5vdGlmeSg8TG9hZFVybEV2ZW50RGF0YT57XG4gICAgICAgICAgICBldmVudE5hbWU6IEFwcFZpZXdNb2RlbC5sb2FkVXJsRXZlbnQsXG4gICAgICAgICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICAgICAgICB1cmxcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5sYXllckRldGFpbHMuc2V0KCd1cmknLCB1cmwpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsICF1cmwpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IGFwcFZpZXdNb2RlbCA9IG5ldyBBcHBWaWV3TW9kZWw7Il19