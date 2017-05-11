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
        _this.launchedFromUrl = false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQXlFO0FBQ3pFLDBEQUFxRDtBQUNyRCx1Q0FBd0M7QUFDeEMsc0NBQXdDO0FBQ3hDLG1FQUE0RTtBQUM1RSxpRUFBcUc7QUFDckcsaUVBQXVHO0FBQ3ZHLCtCQUE2QztBQUU3Qyx1Q0FBb0M7QUFRcEM7SUFBa0MsZ0NBQVU7SUFBNUM7UUFBQSxxRUFJQztRQUhHLFNBQUcsR0FBRyxFQUFFLENBQUM7UUFDVCxXQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ1gsU0FBRyxHQUFHLElBQUksa0NBQWUsRUFBVyxDQUFDOztJQUN6QyxDQUFDO0lBQUQsbUJBQUM7QUFBRCxDQUFDLEFBSkQsQ0FBa0MsdUJBQVUsR0FJM0M7QUFKWSxvQ0FBWTtBQU96QixJQUFzQixnQ0FBZ0M7SUFDbEQsMENBQ1ksa0JBQWtCLEVBQ2xCLG9CQUFvQjtRQURwQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQUE7UUFDbEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFBO0lBQ2hDLENBQUM7SUFFRCw4REFBbUIsR0FBbkIsVUFBb0IsR0FBVTtRQUMxQixJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLEtBQUssS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJO2dCQUN6QixJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDOUMsYUFBYSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7Z0JBQ3hCLE1BQU0sQ0FBQyxhQUFhLENBQUM7WUFDekIsS0FBSyxRQUFRO2dCQUNULElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUNoRCxhQUFhLENB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TCxtQkFBQztBQUFELENBQUMsQUEzT0QsQ0FBa0MsdUJBQVU7QUFvQmpDLHlCQUFZLEdBQWEsU0FBUyxDQUFBO0FBcEJoQyxvQ0FBWTtBQTZPWixRQUFBLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZSwgUHJvcGVydHlDaGFuZ2VEYXRhLCBFdmVudERhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknXG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9ib29rbWFya3MnXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1wcm92aWRlcic7XG5pbXBvcnQge05hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UsIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi1kZXZpY2UtcHJvdmlkZXInO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRMaXZlUmVhbGl0eVZpZXdlciwgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcn0gZnJvbSAnLi9hcmdvbi1yZWFsaXR5LXZpZXdlcnMnO1xuaW1wb3J0IHtnZXRJbnRlcm5hbFZ1Zm9yaWFLZXl9IGZyb20gJy4vdXRpbCc7XG5pbXBvcnQge0xvZ0l0ZW19IGZyb20gJ2FyZ29uLXdlYi12aWV3JztcbmltcG9ydCB7Y29uZmlnfSBmcm9tICcuLi8uLi9jb25maWcnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvYWRVcmxFdmVudERhdGEgZXh0ZW5kcyBFdmVudERhdGEge1xuICAgIGV2ZW50TmFtZTogJ2xvYWRVcmwnLFxuICAgIHVybDogc3RyaW5nLFxuICAgIG5ld0xheWVyOiBib29sZWFuLFxufVxuXG5leHBvcnQgY2xhc3MgTGF5ZXJEZXRhaWxzIGV4dGVuZHMgT2JzZXJ2YWJsZSB7XG4gICAgdXJpID0gJyc7XG4gICAgdGl0bGUgPSAnJztcbiAgICBsb2cgPSBuZXcgT2JzZXJ2YWJsZUFycmF5PExvZ0l0ZW0+KCk7XG59XG5cbkBBcmdvbi5ESS5pbmplY3QoQXJnb24uREkuRmFjdG9yeS5vZihOYXRpdmVzY3JpcHRMaXZlUmVhbGl0eVZpZXdlciksIEFyZ29uLkRJLkZhY3Rvcnkub2YoTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikpXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTmF0aXZlc2NyaXB0UmVhbGl0eVZpZXdlckZhY3Rvcnkge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIF9jcmVhdGVMaXZlUmVhbGl0eSwgXG4gICAgICAgIHByaXZhdGUgX2NyZWF0ZUhvc3RlZFJlYWxpdHkpIHtcbiAgICB9XG5cbiAgICBjcmVhdGVSZWFsaXR5Vmlld2VyKHVyaTpzdHJpbmcpIDogQXJnb24uUmVhbGl0eVZpZXdlciB7XG4gICAgICAgIGNvbnN0IHZpZXdlclR5cGUgPSBBcmdvbi5SZWFsaXR5Vmlld2VyLmdldFR5cGUodXJpKTtcbiAgICAgICAgc3dpdGNoICh2aWV3ZXJUeXBlKSB7XG4gICAgICAgICAgICBjYXNlIEFyZ29uLlJlYWxpdHlWaWV3ZXIuTElWRTpcbiAgICAgICAgICAgICAgICB2YXIgcmVhbGl0eVZpZXdlciA9IHRoaXMuX2NyZWF0ZUxpdmVSZWFsaXR5KCk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eVZpZXdlci51cmkgPSB1cmk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYWxpdHlWaWV3ZXI7XG4gICAgICAgICAgICBjYXNlICdob3N0ZWQnOlxuICAgICAgICAgICAgICAgIHZhciByZWFsaXR5Vmlld2VyID0gdGhpcy5fY3JlYXRlSG9zdGVkUmVhbGl0eSgpO1xuICAgICAgICAgICAgICAgIHJlYWxpdHlWaWV3ZXIudXJpID0gdXJpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWFsaXR5Vmlld2VyO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIFJlYWxpdHkgVmlld2VyIFVSSTogJyArIHVyaSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgSW50ZXJhY3Rpb25Nb2RlID0gJ2ltbWVyc2l2ZSd8J3BhZ2UnO1xuXG5leHBvcnQgY2xhc3MgQXBwVmlld01vZGVsIGV4dGVuZHMgT2JzZXJ2YWJsZSB7XG4gICAgbWVudU9wZW4gPSBmYWxzZTtcbiAgICBjYW5jZWxCdXR0b25TaG93biA9IGZhbHNlO1xuICAgIHJlYWxpdHlDaG9vc2VyT3BlbiA9IGZhbHNlO1xuICAgIG92ZXJ2aWV3T3BlbiA9IGZhbHNlO1xuICAgIGJvb2ttYXJrc09wZW4gPSBmYWxzZTtcbiAgICBkZWJ1Z0VuYWJsZWQgPSBmYWxzZTtcbiAgICB2aWV3ZXJFbmFibGVkID0gZmFsc2U7XG4gICAgaW50ZXJhY3Rpb25Nb2RlOkludGVyYWN0aW9uTW9kZSA9ICdpbW1lcnNpdmUnO1xuICAgIGludGVyYWN0aW9uTW9kZUJ1dHRvbkVuYWJsZWQgPSBmYWxzZTtcbiAgICBsYXllckRldGFpbHM6TGF5ZXJEZXRhaWxzO1xuICAgIGN1cnJlbnRVcmkgPSAnJztcbiAgICBpc0Zhdm9yaXRlID0gZmFsc2U7XG4gICAgbGF1bmNoZWRGcm9tVXJsID0gZmFsc2U7XG5cbiAgICBwdWJsaWMgYXJnb246QXJnb24uQXJnb25TeXN0ZW07XG5cbiAgICBwcml2YXRlIF9yZXNvbHZlUmVhZHk6RnVuY3Rpb247XG4gICAgcmVhZHk6UHJvbWlzZTx2b2lkPjtcbiAgICBcbiAgICBzdGF0aWMgbG9hZFVybEV2ZW50Oidsb2FkVXJsJyA9ICdsb2FkVXJsJ1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBib29rbWFya3MuZmF2b3JpdGVMaXN0Lm9uKCdjaGFuZ2UnLCgpPT57XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVGYXZvcml0ZVN0YXR1cygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLnJlYWR5ID0gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVSZWFkeSA9IHJlc29sdmU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNldFJlYWR5KCkge1xuICAgICAgICBpZiAodGhpcy5hcmdvbikgcmV0dXJuOyAvLyBhbHJlYWR5IGluaXRpYWxpemVkXG5cbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbmV3IEFyZ29uLkRJLkNvbnRhaW5lcjtcbiAgICAgICAgY29udGFpbmVyLnJlZ2lzdGVyU2luZ2xldG9uKEFyZ29uLkRldmljZVNlcnZpY2UsIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2UpO1xuICAgICAgICBjb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlciwgTmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcik7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5EZXZpY2VTZXJ2aWNlUHJvdmlkZXIsIE5hdGl2ZXNjcmlwdERldmljZVNlcnZpY2VQcm92aWRlcik7XG4gICAgICAgIGNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5SZWFsaXR5Vmlld2VyRmFjdG9yeSwgTmF0aXZlc2NyaXB0UmVhbGl0eVZpZXdlckZhY3RvcnkpO1xuXG4gICAgICAgIGNvbnN0IGFyZ29uID0gdGhpcy5hcmdvbiA9IEFyZ29uLmluaXQobnVsbCwge1xuICAgICAgICAgICAgcm9sZTogQXJnb24uUm9sZS5NQU5BR0VSLFxuICAgICAgICAgICAgdGl0bGU6ICdBcmdvbkFwcCdcbiAgICAgICAgfSwgY29udGFpbmVyKTtcblxuICAgICAgICBhcmdvbi5yZWFsaXR5LmRlZmF1bHQgPSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkU7XG5cbiAgICAgICAgYXJnb24ucHJvdmlkZXIucmVhbGl0eS5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgIGlmICghYm9va21hcmtzLnJlYWxpdHlNYXAuZ2V0KHZpZXdlci51cmkpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYm9va21hcmsgPSBuZXcgYm9va21hcmtzLkJvb2ttYXJrSXRlbSh7dXJpOiB2aWV3ZXIudXJpfSk7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnJlYWxpdHlMaXN0LnB1c2goYm9va21hcmspO1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIuc2Vzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBib29rbWFyay50aXRsZSA9IHZpZXdlci5zZXNzaW9uLmluZm8udGl0bGU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHZpZXdlci5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9va21hcmsudGl0bGUgPSBzZXNzaW9uLmluZm8udGl0bGU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXJnb24ucHJvdmlkZXIucmVhbGl0eS51bmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGJvb2ttYXJrcy5yZWFsaXR5TWFwLmdldCh2aWV3ZXIudXJpKTtcbiAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5pbmRleE9mKGl0ZW0pO1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBhcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uRm9jdXNFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7Y3VycmVudH0pPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFyZ29uIGZvY3VzIGNoYW5nZWQ6IFwiICsgKGN1cnJlbnQgPyBjdXJyZW50LnVyaSA6IHVuZGVmaW5lZCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBhcmdvbi52dWZvcmlhLmlzQXZhaWxhYmxlKCkudGhlbigoYXZhaWxhYmxlKT0+e1xuICAgICAgICAgICAgaWYgKGF2YWlsYWJsZSkge1xuICAgICAgICAgICAgICAgIGxldCBwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkgPSBnZXRJbnRlcm5hbFZ1Zm9yaWFLZXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLkRFQlVHX0RFVkVMT1BNRU5UX0xJQ0VOU0VfS0VZICE9IFwiXCIpIHByaW1hcnlWdWZvcmlhTGljZW5zZUtleSA9IGNvbmZpZy5ERUJVR19ERVZFTE9QTUVOVF9MSUNFTlNFX0tFWTtcblxuICAgICAgICAgICAgICAgIGlmICghcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiVW5hYmxlIHRvIGxvY2F0ZSBpbnRlcm5hbCBWdWZvcmlhIExpY2Vuc2UgS2V5XCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFyZ29uLnZ1Zm9yaWEuaW5pdFdpdGhVbmVuY3J5cHRlZEtleShwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXkpLmNhdGNoKChlcnIpPT57XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5zZXRMYXllckRldGFpbHMobmV3IExheWVyRGV0YWlscyhudWxsKSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9yZXNvbHZlUmVhZHkoKTtcbiAgICB9XG5cbiAgICBlbnN1cmVSZWFkeSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmFyZ29uKSB0aHJvdyBuZXcgRXJyb3IoJ0FwcFZpZXdNb2RlbCBpcyBub3QgcmVhZHknKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlTWVudSgpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnbWVudU9wZW4nLCAhdGhpcy5tZW51T3Blbik7XG4gICAgfVxuICAgIFxuICAgIGhpZGVNZW51KCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdtZW51T3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlSW50ZXJhY3Rpb25Nb2RlKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdpbnRlcmFjdGlvbk1vZGUnLCB0aGlzLmludGVyYWN0aW9uTW9kZSA9PT0gJ3BhZ2UnID8gJ2ltbWVyc2l2ZScgOiAncGFnZScpXG4gICAgfVxuICAgIFxuICAgIHNldEludGVyYWN0aW9uTW9kZShtb2RlOkludGVyYWN0aW9uTW9kZSkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdpbnRlcmFjdGlvbk1vZGUnLCBtb2RlKTtcbiAgICB9XG4gICAgXG4gICAgc2hvd092ZXJ2aWV3KCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdvdmVydmlld09wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZU92ZXJ2aWV3KCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdvdmVydmlld09wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZU92ZXJ2aWV3KCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdvdmVydmlld09wZW4nLCAhdGhpcy5vdmVydmlld09wZW4pO1xuICAgIH1cbiAgICBcbiAgICBzaG93Qm9va21hcmtzKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVCb29rbWFya3MoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCBmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIHNob3dSZWFsaXR5Q2hvb3NlcigpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgncmVhbGl0eUNob29zZXJPcGVuJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVSZWFsaXR5Q2hvb3NlcigpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgncmVhbGl0eUNob29zZXJPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICBzaG93Q2FuY2VsQnV0dG9uKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdjYW5jZWxCdXR0b25TaG93bicsIHRydWUpO1xuICAgIH1cbiAgICBcbiAgICBoaWRlQ2FuY2VsQnV0dG9uKCkge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdjYW5jZWxCdXR0b25TaG93bicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlRGVidWcoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2RlYnVnRW5hYmxlZCcsICF0aGlzLmRlYnVnRW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHNldERlYnVnRW5hYmxlZChlbmFibGVkOmJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldCgnZGVidWdFbmFibGVkJywgZW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZVZpZXdlcigpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICB0aGlzLnNldFZpZXdlckVuYWJsZWQoIXRoaXMudmlld2VyRW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHNldFZpZXdlckVuYWJsZWQoZW5hYmxlZDpib29sZWFuKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3ZpZXdlckVuYWJsZWQnLCBlbmFibGVkKTtcbiAgICAgICAgaWYgKGVuYWJsZWQpIHRoaXMuYXJnb24uZGV2aWNlLnJlcXVlc3RQcmVzZW50SE1EKCk7XG4gICAgICAgIGVsc2UgdGhpcy5hcmdvbi5kZXZpY2UuZXhpdFByZXNlbnRITUQoKTtcbiAgICB9XG5cbiAgICBfb25MYXllckRldGFpbHNDaGFuZ2UoZGF0YTpQcm9wZXJ0eUNoYW5nZURhdGEpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVSZWFkeSgpO1xuICAgICAgICBpZiAoZGF0YS5wcm9wZXJ0eU5hbWUgPT09ICd1cmknKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgnY3VycmVudFVyaScsIGRhdGEudmFsdWUpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVGYXZvcml0ZVN0YXR1cygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHNldExheWVyRGV0YWlscyhkZXRhaWxzOkxheWVyRGV0YWlscykge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzICYmIHRoaXMubGF5ZXJEZXRhaWxzLm9mZigncHJvcGVydHlDaGFuZ2UnLCB0aGlzLl9vbkxheWVyRGV0YWlsc0NoYW5nZSwgdGhpcyk7XG4gICAgICAgIHRoaXMuc2V0KCdsYXllckRldGFpbHMnLCBkZXRhaWxzKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhZGV0YWlscy51cmkpO1xuICAgICAgICB0aGlzLnNldCgnY3VycmVudFVyaScsIGRldGFpbHMudXJpKTtcbiAgICAgICAgdGhpcy51cGRhdGVGYXZvcml0ZVN0YXR1cygpO1xuICAgICAgICBkZXRhaWxzLm9uKCdwcm9wZXJ0eUNoYW5nZScsIHRoaXMuX29uTGF5ZXJEZXRhaWxzQ2hhbmdlLCB0aGlzKTtcbiAgICB9XG4gICAgXG4gICAgdXBkYXRlRmF2b3JpdGVTdGF0dXMoKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlUmVhZHkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2lzRmF2b3JpdGUnLCAhIWJvb2ttYXJrcy5mYXZvcml0ZU1hcC5nZXQodGhpcy5jdXJyZW50VXJpKSk7XG4gICAgfVxuICAgIFxuICAgIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMubm90aWZ5KDxMb2FkVXJsRXZlbnREYXRhPntcbiAgICAgICAgICAgIGV2ZW50TmFtZTogQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCxcbiAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIG5ld0xheWVyOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5sYXllckRldGFpbHMuc2V0KCd1cmknLCB1cmwpO1xuICAgICAgICB0aGlzLnNldCgnYm9va21hcmtzT3BlbicsICF1cmwpO1xuICAgIH1cblxuICAgIG9wZW5VcmwodXJsOnN0cmluZykge1xuICAgICAgICB0aGlzLmVuc3VyZVJlYWR5KCk7XG4gICAgICAgIHRoaXMubm90aWZ5KDxMb2FkVXJsRXZlbnREYXRhPntcbiAgICAgICAgICAgIGV2ZW50TmFtZTogQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCxcbiAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIG5ld0xheWVyOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxheWVyRGV0YWlscy5zZXQoJ3VyaScsIHVybCk7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgIXVybCk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgYXBwVmlld01vZGVsID0gbmV3IEFwcFZpZXdNb2RlbDsiXX0=