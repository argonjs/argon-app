"use strict";
var observable_1 = require("data/observable");
var bookmarks = require("./bookmarks");
var Argon = require("@argonjs/argon");
var argon_device_service_1 = require("./argon-device-service");
var argon_reality_service_1 = require("./argon-reality-service");
var argon_vuforia_service_1 = require("./argon-vuforia-service");
var util_1 = require("./util");
var LayerDetails = (function (_super) {
    __extends(LayerDetails, _super);
    function LayerDetails(webView) {
        var _this = _super.call(this) || this;
        _this.uri = '';
        _this.title = '';
        _this.supportedInteractionModes = [];
        _this.webView = webView;
        return _this;
    }
    return LayerDetails;
}(observable_1.Observable));
exports.LayerDetails = LayerDetails;
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
    return AppViewModel;
}(observable_1.Observable));
AppViewModel.loadUrlEvent = 'loadUrl';
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
            var primaryVuforiaLicenseKey;
            if (argon_vuforia_service_1.NativescriptVuforiaServiceDelegate.hasOwnProperty('DEVELOPMENT_VUFORIA_KEY')) {
                primaryVuforiaLicenseKey = argon_vuforia_service_1.NativescriptVuforiaServiceDelegate['DEVELOPMENT_VUFORIA_KEY'];
            }
            else {
                primaryVuforiaLicenseKey = util_1.Util.getInternalVuforiaKey();
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw4Q0FBeUU7QUFFekUsdUNBQXdDO0FBQ3hDLHNDQUF3QztBQUN4QywrREFBaUU7QUFDakUsaUVBQW1FO0FBQ25FLGlFQUEyRTtBQUMzRSwrQkFBMkI7QUFRM0I7SUFBa0MsZ0NBQVU7SUFLeEMsc0JBQVksT0FBeUI7UUFBckMsWUFDSSxpQkFBTyxTQUVWO1FBUEQsU0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNULFdBQUssR0FBRyxFQUFFLENBQUM7UUFDWCwrQkFBeUIsR0FBMEIsRUFBRSxDQUFDO1FBSWxELEtBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDOztJQUMzQixDQUFDO0lBQ0wsbUJBQUM7QUFBRCxDQUFDLEFBVEQsQ0FBa0MsdUJBQVUsR0FTM0M7QUFUWSxvQ0FBWTtBQWF6QjtJQUFrQyxnQ0FBVTtJQW1CeEM7UUFBQSxZQUNJLGlCQUFPLFNBVVY7UUE3QkQsY0FBUSxHQUFHLEtBQUssQ0FBQztRQUNqQix1QkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDMUIsd0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBQzNCLGtCQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLG1CQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLGtCQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLG1CQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLHFCQUFlLEdBQW1CLFdBQVcsQ0FBQztRQUM5QyxrQ0FBNEIsR0FBRyxLQUFLLENBQUM7UUFDckMsa0JBQVksR0FBZ0IsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsZ0JBQVUsR0FBRyxFQUFFLENBQUM7UUFDaEIsZ0JBQVUsR0FBRyxLQUFLLENBQUM7UUFTZixTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7WUFDL0IsVUFBVSxDQUFDO2dCQUNQLEtB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SyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQy9GLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtPYnNlcnZhYmxlLCBQcm9wZXJ0eUNoYW5nZURhdGEsIEV2ZW50RGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJ1xuaW1wb3J0IHtPYnNlcnZhYmxlQXJyYXl9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZS1hcnJheSdcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2Jvb2ttYXJrcydcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCB7TmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZX0gZnJvbSAnLi9hcmdvbi1kZXZpY2Utc2VydmljZSc7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFJlYWxpdHlTZXJ2aWNlfSBmcm9tICcuL2FyZ29uLXJlYWxpdHktc2VydmljZSc7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlRGVsZWdhdGV9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1zZXJ2aWNlJztcbmltcG9ydCB7VXRpbH0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0IHtBcmdvbldlYlZpZXd9IGZyb20gJ2FyZ29uLXdlYi12aWV3J1xuXG5leHBvcnQgaW50ZXJmYWNlIExvYWRVcmxFdmVudERhdGEgZXh0ZW5kcyBFdmVudERhdGEge1xuICAgIGV2ZW50TmFtZTogJ2xvYWRVcmwnLFxuICAgIHVybDogc3RyaW5nXG59XG5cbmV4cG9ydCBjbGFzcyBMYXllckRldGFpbHMgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICB1cmkgPSAnJztcbiAgICB0aXRsZSA9ICcnO1xuICAgIHN1cHBvcnRlZEludGVyYWN0aW9uTW9kZXM6QXJyYXk8SW50ZXJhY3Rpb25Nb2RlPiA9IFtdO1xuICAgIHdlYlZpZXc6QXJnb25XZWJWaWV3fG51bGxcbiAgICBjb25zdHJ1Y3Rvcih3ZWJWaWV3OkFyZ29uV2ViVmlld3xudWxsKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMud2ViVmlldyA9IHdlYlZpZXc7XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBJbnRlcmFjdGlvbk1vZGUgPSAnaW1tZXJzaXZlJ3wncGFnZSc7XG5cbmV4cG9ydCBjbGFzcyBBcHBWaWV3TW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBtZW51T3BlbiA9IGZhbHNlO1xuICAgIGNhbmNlbEJ1dHRvblNob3duID0gZmFsc2U7XG4gICAgcmVhbGl0eUNob29zZXJPcGVuID0gZmFsc2U7XG4gICAgb3ZlcnZpZXdPcGVuID0gZmFsc2U7XG4gICAgYm9va21hcmtzT3BlbiA9IGZhbHNlO1xuICAgIGRlYnVnRW5hYmxlZCA9IGZhbHNlO1xuICAgIHZpZXdlckVuYWJsZWQgPSBmYWxzZTtcbiAgICBpbnRlcmFjdGlvbk1vZGU6SW50ZXJhY3Rpb25Nb2RlID0gJ2ltbWVyc2l2ZSc7XG4gICAgaW50ZXJhY3Rpb25Nb2RlQnV0dG9uRW5hYmxlZCA9IGZhbHNlO1xuICAgIGxheWVyRGV0YWlsczpMYXllckRldGFpbHMgPSBuZXcgTGF5ZXJEZXRhaWxzKG51bGwpXG4gICAgY3VycmVudFVyaSA9ICcnO1xuICAgIGlzRmF2b3JpdGUgPSBmYWxzZTtcblxuICAgIHByaXZhdGUgX3Jlc29sdmVSZWFkeTpGdW5jdGlvbjtcbiAgICByZWFkeTpQcm9taXNlPHZvaWQ+O1xuICAgIFxuICAgIHN0YXRpYyBsb2FkVXJsRXZlbnQ6J2xvYWRVcmwnID0gJ2xvYWRVcmwnXG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Qub24oJ2NoYW5nZScsKCk9PntcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMucmVhZHkgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5ID0gcmVzb2x2ZTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzZXRSZWFkeSgpIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZVJlYWR5KCk7XG4gICAgfVxuICAgIFxuICAgIHRvZ2dsZU1lbnUoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdtZW51T3BlbicsICF0aGlzLm1lbnVPcGVuKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZU1lbnUoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdtZW51T3BlbicsIGZhbHNlKTtcbiAgICB9XG4gICAgXG4gICAgdG9nZ2xlSW50ZXJhY3Rpb25Nb2RlKCkge1xuICAgICAgICB0aGlzLnNldCgnaW50ZXJhY3Rpb25Nb2RlJywgdGhpcy5pbnRlcmFjdGlvbk1vZGUgPT09ICdwYWdlJyA/ICdpbW1lcnNpdmUnIDogJ3BhZ2UnKVxuICAgIH1cbiAgICBcbiAgICBzZXRJbnRlcmFjdGlvbk1vZGUobW9kZTpJbnRlcmFjdGlvbk1vZGUpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2ludGVyYWN0aW9uTW9kZScsIG1vZGUpO1xuICAgIH1cbiAgICBcbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdvdmVydmlld09wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZU92ZXJ2aWV3KCkge1xuICAgICAgICB0aGlzLnNldCgnb3ZlcnZpZXdPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVPdmVydmlldygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ292ZXJ2aWV3T3BlbicsICF0aGlzLm92ZXJ2aWV3T3Blbik7XG4gICAgfVxuICAgIFxuICAgIHNob3dCb29rbWFya3MoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgdHJ1ZSk7XG4gICAgfVxuICAgIFxuICAgIGhpZGVCb29rbWFya3MoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdib29rbWFya3NPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICBzaG93UmVhbGl0eUNob29zZXIoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdyZWFsaXR5Q2hvb3Nlck9wZW4nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZVJlYWxpdHlDaG9vc2VyKCkge1xuICAgICAgICB0aGlzLnNldCgncmVhbGl0eUNob29zZXJPcGVuJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICBzaG93Q2FuY2VsQnV0dG9uKCkge1xuICAgICAgICB0aGlzLnNldCgnY2FuY2VsQnV0dG9uU2hvd24nLCB0cnVlKTtcbiAgICB9XG4gICAgXG4gICAgaGlkZUNhbmNlbEJ1dHRvbigpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2NhbmNlbEJ1dHRvblNob3duJywgZmFsc2UpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVEZWJ1ZygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2RlYnVnRW5hYmxlZCcsICF0aGlzLmRlYnVnRW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHNldERlYnVnRW5hYmxlZChlbmFibGVkOmJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5zZXQoJ2RlYnVnRW5hYmxlZCcsIGVuYWJsZWQpO1xuICAgIH1cbiAgICBcbiAgICB0b2dnbGVWaWV3ZXIoKSB7XG4gICAgICAgIHRoaXMuc2V0KCd2aWV3ZXJFbmFibGVkJywgIXRoaXMudmlld2VyRW5hYmxlZCk7XG4gICAgfVxuICAgIFxuICAgIHNldFZpZXdlckVuYWJsZWQoZW5hYmxlZDpib29sZWFuKSB7XG4gICAgICAgIHRoaXMuc2V0KCd2aWV3ZXJFbmFibGVkJywgZW5hYmxlZCk7XG4gICAgfVxuXG4gICAgX29uTGF5ZXJEZXRhaWxzQ2hhbmdlKGRhdGE6UHJvcGVydHlDaGFuZ2VEYXRhKSB7XG4gICAgICAgIGlmIChkYXRhLnByb3BlcnR5TmFtZSA9PT0gJ3VyaScpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdjdXJyZW50VXJpJywgZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdm9yaXRlU3RhdHVzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgc2V0TGF5ZXJEZXRhaWxzKGRldGFpbHM6TGF5ZXJEZXRhaWxzKSB7XG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzLm9mZigncHJvcGVydHlDaGFuZ2UnLCB0aGlzLl9vbkxheWVyRGV0YWlsc0NoYW5nZSwgdGhpcyk7XG4gICAgICAgIHRoaXMuc2V0KCdsYXllckRldGFpbHMnLCBkZXRhaWxzKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhZGV0YWlscy51cmkpO1xuICAgICAgICB0aGlzLnNldCgnY3VycmVudFVyaScsIGRldGFpbHMudXJpKTtcbiAgICAgICAgdGhpcy51cGRhdGVGYXZvcml0ZVN0YXR1cygpO1xuICAgICAgICBkZXRhaWxzLm9uKCdwcm9wZXJ0eUNoYW5nZScsIHRoaXMuX29uTGF5ZXJEZXRhaWxzQ2hhbmdlLCB0aGlzKTtcbiAgICB9XG4gICAgXG4gICAgdXBkYXRlRmF2b3JpdGVTdGF0dXMoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdpc0Zhdm9yaXRlJywgISFib29rbWFya3MuZmF2b3JpdGVNYXAuZ2V0KHRoaXMuY3VycmVudFVyaSkpO1xuICAgIH1cbiAgICBcbiAgICBsb2FkVXJsKHVybDpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5ub3RpZnkoPExvYWRVcmxFdmVudERhdGE+e1xuICAgICAgICAgICAgZXZlbnROYW1lOiBBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LFxuICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgdXJsXG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMubGF5ZXJEZXRhaWxzLnNldCgndXJpJywgdXJsKTtcbiAgICAgICAgdGhpcy5zZXQoJ2Jvb2ttYXJrc09wZW4nLCAhdXJsKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcHBWaWV3TW9kZWwgPSBuZXcgQXBwVmlld01vZGVsO1xuXG5cbmNvbnN0IGNvbnRhaW5lciA9IG5ldyBBcmdvbi5ESS5Db250YWluZXI7XG5jb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uRGV2aWNlU2VydmljZSwgTmF0aXZlc2NyaXB0RGV2aWNlU2VydmljZSk7XG5jb250YWluZXIucmVnaXN0ZXJTaW5nbGV0b24oQXJnb24uUmVhbGl0eVNlcnZpY2UsIE5hdGl2ZXNjcmlwdFJlYWxpdHlTZXJ2aWNlKTtcbmNvbnRhaW5lci5yZWdpc3RlclNpbmdsZXRvbihBcmdvbi5WdWZvcmlhU2VydmljZURlbGVnYXRlLCBOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZURlbGVnYXRlKTtcblxuZXhwb3J0IGNvbnN0IG1hbmFnZXIgPSBBcmdvbi5pbml0KHtcbiAgICBjb250YWluZXIsIFxuICAgIGNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgcm9sZTogQXJnb24uUm9sZS5NQU5BR0VSLFxuICAgICAgICBuYW1lOiAnQXJnb25BcHAnXG4gICAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCB2dWZvcmlhRGVsZWdhdGU6TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VEZWxlZ2F0ZSA9IGNvbnRhaW5lci5nZXQoQXJnb24uVnVmb3JpYVNlcnZpY2VEZWxlZ2F0ZSk7XG5cbm1hbmFnZXIucmVhbGl0eS5zZXREZWZhdWx0KGJvb2ttYXJrcy5MSVZFX1ZJREVPX1JFQUxJVFkpO1xuXG5hcHBWaWV3TW9kZWwucmVhZHkudGhlbigoKT0+e1xuICAgIG1hbmFnZXIudnVmb3JpYS5pc0F2YWlsYWJsZSgpLnRoZW4oKGF2YWlsYWJsZSk9PntcbiAgICAgICAgaWYgKGF2YWlsYWJsZSkge1xuICAgICAgICAgICAgdmFyIHByaW1hcnlWdWZvcmlhTGljZW5zZUtleTtcbiAgICAgICAgICAgIGlmIChOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZURlbGVnYXRlLmhhc093blByb3BlcnR5KCdERVZFTE9QTUVOVF9WVUZPUklBX0tFWScpKSB7XG4gICAgICAgICAgICAgICAgcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5ID0gTmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VEZWxlZ2F0ZVsnREVWRUxPUE1FTlRfVlVGT1JJQV9LRVknXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5ID0gVXRpbC5nZXRJbnRlcm5hbFZ1Zm9yaWFLZXkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghcHJpbWFyeVZ1Zm9yaWFMaWNlbnNlS2V5KSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoXCJVbmFibGUgdG8gbG9jYXRlIFZ1Zm9yaWEgTGljZW5zZSBLZXlcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWFuYWdlci52dWZvcmlhLmluaXRXaXRoVW5lbmNyeXB0ZWRLZXkoe2tleTpwcmltYXJ5VnVmb3JpYUxpY2Vuc2VLZXl9KS5jYXRjaCgoZXJyKT0+e1xuICAgICAgICAgICAgICAgIGFsZXJ0KGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSlcbn0pXG5cbm1hbmFnZXIucmVhbGl0eS5zZXNzaW9uRGVzaXJlZFJlYWxpdHlDaGFuZ2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7cHJldmlvdXMsIGN1cnJlbnQsIHNlc3Npb259KT0+e1xuICAgIGlmIChzZXNzaW9uID09PSBtYW5hZ2VyLnNlc3Npb24ubWFuYWdlcikgcmV0dXJuO1xuICAgIFxuICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICBjb25zdCBwcmV2aW91c1JlYWxpdHlJdGVtID0gYm9va21hcmtzLnJlYWxpdHlNYXAuZ2V0KHByZXZpb3VzLnVyaSk7XG4gICAgICAgIGlmIChwcmV2aW91c1JlYWxpdHlJdGVtICYmICFwcmV2aW91c1JlYWxpdHlJdGVtLmJ1aWx0aW4pIHtcbiAgICAgICAgICAgIHZhciBpID0gYm9va21hcmtzLnJlYWxpdHlMaXN0LmluZGV4T2YocHJldmlvdXNSZWFsaXR5SXRlbSk7XG4gICAgICAgICAgICBib29rbWFya3MucmVhbGl0eUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfSBcbiAgICBpZiAoY3VycmVudCkgeyAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRSZWFsaXR5SXRlbSA9IGJvb2ttYXJrcy5yZWFsaXR5TWFwLmdldChjdXJyZW50LnVyaSlcbiAgICAgICAgaWYgKCFjdXJyZW50UmVhbGl0eUl0ZW0pIGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5wdXNoKG5ldyBib29rbWFya3MuUmVhbGl0eUJvb2ttYXJrSXRlbShjdXJyZW50KSk7XG4gICAgfVxuICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgIGNvbnN0IHNlc3Npb25EZXNpcmVkUmVhbGl0eSA9IG1hbmFnZXIucmVhbGl0eS5kZXNpcmVkUmVhbGl0eU1hcC5nZXQoc2Vzc2lvbik7XG4gICAgICAgIGlmIChzZXNzaW9uRGVzaXJlZFJlYWxpdHkpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25EZXNpcmVkUmVhbGl0eUl0ZW0gPSBib29rbWFya3MucmVhbGl0eU1hcC5nZXQoc2Vzc2lvbkRlc2lyZWRSZWFsaXR5LnVyaSk7XG4gICAgICAgICAgICBpZiAoc2Vzc2lvbkRlc2lyZWRSZWFsaXR5SXRlbSAmJiAhc2Vzc2lvbkRlc2lyZWRSZWFsaXR5SXRlbS5idWlsdGluKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gYm9va21hcmtzLnJlYWxpdHlMaXN0LmluZGV4T2Yoc2Vzc2lvbkRlc2lyZWRSZWFsaXR5SXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5yZWFsaXR5TGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pXG5cbm1hbmFnZXIuZm9jdXMuc2Vzc2lvbkZvY3VzRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgIGNvbnN0IGZvY3Vzc2VkU2Vzc2lvbiA9IG1hbmFnZXIuZm9jdXMuZ2V0U2Vzc2lvbigpOyAgICBcbiAgICBjb25zb2xlLmxvZyhcIkFyZ29uIGZvY3VzIGNoYW5nZWQ6IFwiICsgKGZvY3Vzc2VkU2Vzc2lvbiA/IGZvY3Vzc2VkU2Vzc2lvbi51cmkgOiB1bmRlZmluZWQpKTtcbn0pXG4iXX0=