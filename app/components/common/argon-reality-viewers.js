"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Argon = require("@argonjs/argon");
var vuforia = require("nativescript-vuforia");
var enums = require("ui/enums");
var argon_web_view_1 = require("argon-web-view");
var gestures_1 = require("ui/gestures");
var NativescriptLiveRealityViewer = (function (_super) {
    __extends(NativescriptLiveRealityViewer, _super);
    function NativescriptLiveRealityViewer(sessionService, viewService, _contextService, _deviceService, _vuforiaServiceProvider, uri) {
        var _this = _super.call(this, sessionService, viewService, _deviceService, uri) || this;
        _this._contextService = _contextService;
        _this._deviceService = _deviceService;
        _this._vuforiaServiceProvider = _vuforiaServiceProvider;
        _this.videoView = vuforia.videoView;
        _this._zoomFactor = 1;
        _this._scratchTouchPos1 = new Argon.Cesium.Cartesian2;
        _this._scratchTouchPos2 = new Argon.Cesium.Cartesian2;
        return _this;
    }
    NativescriptLiveRealityViewer.prototype._handlePinchGestureEventData = function (data) {
        switch (data.state) {
            case gestures_1.GestureStateTypes.began:
                this._pinchStartZoomFactor = this._zoomFactor;
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;
            case gestures_1.GestureStateTypes.changed:
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;
            case gestures_1.GestureStateTypes.ended:
            case gestures_1.GestureStateTypes.cancelled:
            default:
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;
        }
    };
    NativescriptLiveRealityViewer.prototype._handleForwardedDOMTouchEventData = function (uievent) {
        if (!uievent.touches)
            return;
        if (uievent.touches.length == 2) {
            this._scratchTouchPos1.x = uievent.touches[0].clientX;
            this._scratchTouchPos1.y = uievent.touches[0].clientY;
            this._scratchTouchPos2.x = uievent.touches[1].clientX;
            this._scratchTouchPos2.y = uievent.touches[1].clientY;
            var dist = Argon.Cesium.Cartesian2.distanceSquared(this._scratchTouchPos1, this._scratchTouchPos2);
            if (this._startPinchDistance === undefined) {
                this._startPinchDistance = dist;
                this._handlePinchGestureEventData({
                    state: gestures_1.GestureStateTypes.began,
                    scale: 1
                });
            }
            else {
                this._currentPinchDistance = dist;
                this._handlePinchGestureEventData({
                    state: gestures_1.GestureStateTypes.changed,
                    scale: this._currentPinchDistance / this._startPinchDistance
                });
            }
        }
        else {
            if (this._startPinchDistance !== undefined && this._currentPinchDistance !== undefined) {
                this._handlePinchGestureEventData({
                    state: gestures_1.GestureStateTypes.ended,
                    scale: this._currentPinchDistance / this._startPinchDistance
                });
                this._startPinchDistance = undefined;
                this._currentPinchDistance = undefined;
            }
        }
    };
    NativescriptLiveRealityViewer.prototype.setupInternalSession = function (session) {
        var _this = this;
        _super.prototype.setupInternalSession.call(this, session);
        console.log("Setting up Vuforia viewer session");
        vuforia.videoView.parent.on(gestures_1.GestureTypes.pinch, this._handlePinchGestureEventData, this);
        session.on['ar.view.uievent'] = function (uievent) {
            _this._handleForwardedDOMTouchEventData(uievent);
        };
        var subviews = [];
        var frameStateOptions = {
            overrideUser: true
        };
        var remove = this._deviceService.frameStateEvent.addEventListener(function (frameState) {
            if (!session.isConnected)
                return;
            var deviceService = _this._deviceService;
            if (deviceService.geolocationDesired) {
                deviceService.subscribeGeolocation(deviceService.geolocationOptions, session);
            }
            else {
                deviceService.unsubscribeGeolocation(session);
            }
            Argon.SerializedSubviewList.clone(frameState.subviews, subviews);
            if (!deviceService.strict) {
                _this._effectiveZoomFactor = Math.abs(_this._zoomFactor - 1) < 0.05 ? 1 : _this._zoomFactor;
                for (var _i = 0, subviews_1 = subviews; _i < subviews_1.length; _i++) {
                    var s = subviews_1[_i];
                    // const frustum = Argon.decomposePerspectiveProjectionMatrix(s.projectionMatrix, this._scratchFrustum);
                    // frustum.fov = 2 * Math.atan(Math.tan(frustum.fov * 0.5) / this._effectiveZoomFactor);
                    // Argon.Cesium.Matrix4.clone(frustum.projectionMatrix, s.projectionMatrix);
                    s.projectionMatrix[0] *= _this._effectiveZoomFactor;
                    s.projectionMatrix[1] *= _this._effectiveZoomFactor;
                    s.projectionMatrix[2] *= _this._effectiveZoomFactor;
                    s.projectionMatrix[3] *= _this._effectiveZoomFactor;
                    s.projectionMatrix[4] *= _this._effectiveZoomFactor;
                    s.projectionMatrix[5] *= _this._effectiveZoomFactor;
                    s.projectionMatrix[6] *= _this._effectiveZoomFactor;
                    s.projectionMatrix[7] *= _this._effectiveZoomFactor;
                }
            }
            else {
                _this._effectiveZoomFactor = 1;
            }
            // apply the projection scale
            vuforia.api && vuforia.api.setScaleFactor(_this._effectiveZoomFactor);
            // configure video
            var viewport = frameState.viewport;
            vuforia.api && _this._vuforiaServiceProvider
                .configureVuforiaVideoBackground(viewport, _this.isPresenting);
            if (!_this.isPresenting)
                return;
            try {
                var contextUser = _this._contextService.user;
                var deviceUser = _this._deviceService.user;
                contextUser.position.setValue(Argon.Cesium.Cartesian3.ZERO, deviceUser);
                contextUser.orientation.setValue(Argon.Cesium.Quaternion.IDENTITY);
                var contextFrameState = _this._deviceService.createContextFrameState(frameState.time, frameState.viewport, subviews, frameStateOptions);
                session.send('ar.reality.frameState', contextFrameState);
            }
            catch (e) {
                console.error(e);
            }
        });
        session.closeEvent.addEventListener(function () {
            remove();
        });
    };
    return NativescriptLiveRealityViewer;
}(Argon.LiveRealityViewer));
NativescriptLiveRealityViewer = __decorate([
    Argon.DI.autoinject,
    __metadata("design:paramtypes", [Argon.SessionService, Argon.ViewService, Argon.ContextService, Argon.DeviceService, Argon.VuforiaServiceProvider, String])
], NativescriptLiveRealityViewer);
exports.NativescriptLiveRealityViewer = NativescriptLiveRealityViewer;
Argon.DI.inject(Argon.SessionService, Argon.ViewService);
var NativescriptHostedRealityViewer = (function (_super) {
    __extends(NativescriptHostedRealityViewer, _super);
    function NativescriptHostedRealityViewer(sessionService, viewService, uri) {
        var _this = _super.call(this, sessionService, viewService, uri) || this;
        _this.uri = uri;
        _this.webView = new argon_web_view_1.ArgonWebView;
        if (_this.webView.ios) {
            // disable user navigation of the reality view
            _this.webView.ios.allowsBackForwardNavigationGestures = false;
        }
        _this.webView.on('session', function (data) {
            var session = data.session;
            session.connectEvent.addEventListener(function () {
                _this.connectEvent.raiseEvent(session);
            });
        });
        _this.presentChangeEvent.addEventListener(function () {
            _this.webView.visibility = _this.isPresenting ? enums.Visibility.visible : enums.Visibility.collapse;
        });
        return _this;
    }
    NativescriptHostedRealityViewer.prototype.load = function () {
        var url = this.uri;
        var webView = this.webView;
        if (webView.src === url)
            webView.reload();
        else
            webView.src = url;
    };
    NativescriptHostedRealityViewer.prototype.destroy = function () {
        this.webView.session && this.webView.session.close();
    };
    return NativescriptHostedRealityViewer;
}(Argon.HostedRealityViewer));
exports.NativescriptHostedRealityViewer = NativescriptHostedRealityViewer;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tcmVhbGl0eS12aWV3ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tcmVhbGl0eS12aWV3ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLDhDQUFnRDtBQUNoRCxnQ0FBa0M7QUFFbEMsaURBQThEO0FBRzlELHdDQUlxQjtBQW9CckIsSUFBYSw2QkFBNkI7SUFBUyxpREFBdUI7SUFJdEUsdUNBQ0ksY0FBb0MsRUFDcEMsV0FBOEIsRUFDdEIsZUFBcUMsRUFDckMsY0FBbUMsRUFDbkMsdUJBQXFELEVBQzdELEdBQVU7UUFOZCxZQU9RLGtCQUFNLGNBQWMsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxTQUM5RDtRQUxXLHFCQUFlLEdBQWYsZUFBZSxDQUFzQjtRQUNyQyxvQkFBYyxHQUFkLGNBQWMsQ0FBcUI7UUFDbkMsNkJBQXVCLEdBQXZCLHVCQUF1QixDQUE4QjtRQVAxRCxlQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQVk3QixpQkFBVyxHQUFHLENBQUMsQ0FBQztRQXNCaEIsdUJBQWlCLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztRQUNoRCx1QkFBaUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDOztJQXpCeEQsQ0FBQztJQUtPLG9FQUE0QixHQUFwQyxVQUFxQyxJQUEyQjtRQUM1RCxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNqQixLQUFLLDRCQUFpQixDQUFDLEtBQUs7Z0JBQ3hCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUMzRCxLQUFLLENBQUM7WUFDVixLQUFLLDRCQUFpQixDQUFDLE9B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R0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztRQUN2RyxDQUFDLENBQUMsQ0FBQzs7SUFDUCxDQUFDO0lBRUQsOENBQUksR0FBSjtRQUNJLElBQU0sR0FBRyxHQUFVLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDNUIsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM3QixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQztZQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMxQyxJQUFJO1lBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDM0IsQ0FBQztJQUVELGlEQUFPLEdBQVA7UUFDSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0lBQ0wsc0NBQUM7QUFBRCxDQUFDLEFBbENELENBQXFELEtBQUssQ0FBQyxtQkFBbUIsR0FrQzdFO0FBbENZLDBFQUErQjtBQWtDM0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgZW51bXMgZnJvbSAndWkvZW51bXMnO1xuXG5pbXBvcnQge0FyZ29uV2ViVmlldywgU2Vzc2lvbkV2ZW50RGF0YX0gZnJvbSAnYXJnb24td2ViLXZpZXcnO1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyfSBmcm9tICcuL2FyZ29uLXZ1Zm9yaWEtcHJvdmlkZXInO1xuXG5pbXBvcnQge1xuICBHZXN0dXJlVHlwZXMsXG4gIEdlc3R1cmVTdGF0ZVR5cGVzLFxuICBQaW5jaEdlc3R1cmVFdmVudERhdGFcbn0gZnJvbSAndWkvZ2VzdHVyZXMnO1xuXG5cbmludGVyZmFjZSBET01Ub3VjaCB7XG4gICAgcmVhZG9ubHkgY2xpZW50WDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IGNsaWVudFk6IG51bWJlcjtcbiAgICByZWFkb25seSBpZGVudGlmaWVyOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgcGFnZVg6IG51bWJlcjtcbiAgICByZWFkb25seSBwYWdlWTogbnVtYmVyO1xuICAgIHJlYWRvbmx5IHNjcmVlblg6IG51bWJlcjtcbiAgICByZWFkb25seSBzY3JlZW5ZOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBET01Ub3VjaEV2ZW50IHtcbiAgICB0eXBlOnN0cmluZyxcbiAgICB0b3VjaGVzOkFycmF5PERPTVRvdWNoPiwgXG4gICAgY2hhbmdlZFRvdWNoZXM6QXJyYXk8RE9NVG91Y2g+XG59XG5cbkBBcmdvbi5ESS5hdXRvaW5qZWN0XG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0TGl2ZVJlYWxpdHlWaWV3ZXIgZXh0ZW5kcyBBcmdvbi5MaXZlUmVhbGl0eVZpZXdlciB7XG5cbiAgICBwdWJsaWMgdmlkZW9WaWV3ID0gdnVmb3JpYS52aWRlb1ZpZXc7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgc2Vzc2lvblNlcnZpY2U6IEFyZ29uLlNlc3Npb25TZXJ2aWNlLFxuICAgICAgICB2aWV3U2VydmljZTogQXJnb24uVmlld1NlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgX2NvbnRleHRTZXJ2aWNlOiBBcmdvbi5Db250ZXh0U2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSBfZGV2aWNlU2VydmljZTogQXJnb24uRGV2aWNlU2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSBfdnVmb3JpYVNlcnZpY2VQcm92aWRlcjogQXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlcixcbiAgICAgICAgdXJpOnN0cmluZykge1xuICAgICAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIHZpZXdTZXJ2aWNlLCBfZGV2aWNlU2VydmljZSwgdXJpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF96b29tRmFjdG9yID0gMTtcbiAgICBwcml2YXRlIF9waW5jaFN0YXJ0Wm9vbUZhY3RvcjpudW1iZXI7XG4gICAgXG4gICAgcHJpdmF0ZSBfaGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhKGRhdGE6IFBpbmNoR2VzdHVyZUV2ZW50RGF0YSkge1xuICAgICAgICBzd2l0Y2ggKGRhdGEuc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgR2VzdHVyZVN0YXRlVHlwZXMuYmVnYW46IFxuICAgICAgICAgICAgICAgIHRoaXMuX3BpbmNoU3RhcnRab29tRmFjdG9yID0gdGhpcy5fem9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICB0aGlzLl96b29tRmFjdG9yID0gdGhpcy5fcGluY2hTdGFydFpvb21GYWN0b3IgKiBkYXRhLnNjYWxlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5jaGFuZ2VkOiBcbiAgICAgICAgICAgICAgICB0aGlzLl96b29tRmFjdG9yID0gdGhpcy5fcGluY2hTdGFydFpvb21GYWN0b3IgKiBkYXRhLnNjYWxlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5lbmRlZDpcbiAgICAgICAgICAgIGNhc2UgR2VzdHVyZVN0YXRlVHlwZXMuY2FuY2VsbGVkOlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzLl96b29tRmFjdG9yID0gdGhpcy5fcGluY2hTdGFydFpvb21GYWN0b3IgKiBkYXRhLnNjYWxlO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zdGFydFBpbmNoRGlzdGFuY2U/Om51bWJlcjtcbiAgICBwcml2YXRlIF9jdXJyZW50UGluY2hEaXN0YW5jZT86bnVtYmVyO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hUb3VjaFBvczEgPSBuZXcgQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjI7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFRvdWNoUG9zMiA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMjtcblxuICAgIHByaXZhdGUgX2hhbmRsZUZvcndhcmRlZERPTVRvdWNoRXZlbnREYXRhKHVpZXZlbnQ6IERPTVRvdWNoRXZlbnQpIHtcbiAgICAgICAgaWYgKCF1aWV2ZW50LnRvdWNoZXMpIHJldHVybjtcblxuICAgICAgICBpZiAodWlldmVudC50b3VjaGVzLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgICAgICB0aGlzLl9zY3JhdGNoVG91Y2hQb3MxLnggPSB1aWV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WDtcbiAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hUb3VjaFBvczEueSA9IHVpZXZlbnQudG91Y2hlc1swXS5jbGllbnRZO1xuICAgICAgICAgICAgdGhpcy5fc2NyYXRjaFRvdWNoUG9zMi54ID0gdWlldmVudC50b3VjaGVzWzFdLmNsaWVudFg7XG4gICAgICAgICAgICB0aGlzLl9zY3JhdGNoVG91Y2hQb3MyLnkgPSB1aWV2ZW50LnRvdWNoZXNbMV0uY2xpZW50WTtcbiAgICAgICAgICAgIGNvbnN0IGRpc3QgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMi5kaXN0YW5jZVNxdWFyZWQodGhpcy5fc2NyYXRjaFRvdWNoUG9zMSwgdGhpcy5fc2NyYXRjaFRvdWNoUG9zMik7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZSA9IGRpc3Q7XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhKDxQaW5jaEdlc3R1cmVFdmVudERhdGE+e1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogR2VzdHVyZVN0YXRlVHlwZXMuYmVnYW4sXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiAxXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRQaW5jaERpc3RhbmNlID0gZGlzdDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVQaW5jaEdlc3R1cmVFdmVudERhdGEoPFBpbmNoR2VzdHVyZUV2ZW50RGF0YT57XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBHZXN0dXJlU3RhdGVUeXBlcy5jaGFuZ2VkLFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogdGhpcy5fY3VycmVudFBpbmNoRGlzdGFuY2UgLyB0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2UgIT09IHVuZGVmaW5lZCAmJiB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhKDxQaW5jaEdlc3R1cmVFdmVudERhdGE+e1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogR2VzdHVyZVN0YXRlVHlwZXMuZW5kZWQsXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSAvIHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHByaXZhdGUgX3NjcmF0Y2hGcnVzdHVtID0gbmV3IEFyZ29uLkNlc2l1bS5QZXJzcGVjdGl2ZUZydXN0dW07XG4gICAgcHJpdmF0ZSBfZWZmZWN0aXZlWm9vbUZhY3RvcjpudW1iZXI7XG4gICAgc2V0dXBJbnRlcm5hbFNlc3Npb24oc2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCkge1xuICAgICAgICBzdXBlci5zZXR1cEludGVybmFsU2Vzc2lvbihzZXNzaW9uKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlNldHRpbmcgdXAgVnVmb3JpYSB2aWV3ZXIgc2Vzc2lvblwiKTtcblxuICAgICAgICB2dWZvcmlhLnZpZGVvVmlldy5wYXJlbnQub24oR2VzdHVyZVR5cGVzLnBpbmNoLCB0aGlzLl9oYW5kbGVQaW5jaEdlc3R1cmVFdmVudERhdGEsIHRoaXMpO1xuXG4gICAgICAgIHNlc3Npb24ub25bJ2FyLnZpZXcudWlldmVudCddID0gKHVpZXZlbnQ6RE9NVG91Y2hFdmVudCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZUZvcndhcmRlZERPTVRvdWNoRXZlbnREYXRhKHVpZXZlbnQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHN1YnZpZXdzOkFyZ29uLlNlcmlhbGl6ZWRTdWJ2aWV3TGlzdCA9IFtdO1xuXG4gICAgICAgIGNvbnN0IGZyYW1lU3RhdGVPcHRpb25zID0ge1xuICAgICAgICAgICAgb3ZlcnJpZGVVc2VyOiB0cnVlXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZW1vdmUgPSB0aGlzLl9kZXZpY2VTZXJ2aWNlLmZyYW1lU3RhdGVFdmVudC5hZGRFdmVudExpc3RlbmVyKChmcmFtZVN0YXRlKT0+e1xuICAgICAgICAgICAgaWYgKCFzZXNzaW9uLmlzQ29ubmVjdGVkKSByZXR1cm47XG5cbiAgICAgICAgICAgIGNvbnN0IGRldmljZVNlcnZpY2UgPSB0aGlzLl9kZXZpY2VTZXJ2aWNlO1xuICAgICAgICAgICAgaWYgKGRldmljZVNlcnZpY2UuZ2VvbG9jYXRpb25EZXNpcmVkKSB7XG4gICAgICAgICAgICAgICAgZGV2aWNlU2VydmljZS5zdWJzY3JpYmVHZW9sb2NhdGlvbihkZXZpY2VTZXJ2aWNlLmdlb2xvY2F0aW9uT3B0aW9ucywgc2Vzc2lvbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRldmljZVNlcnZpY2UudW5zdWJzY3JpYmVHZW9sb2NhdGlvbihzZXNzaW9uKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQXJnb24uU2VyaWFsaXplZFN1YnZpZXdMaXN0LmNsb25lKGZyYW1lU3RhdGUuc3Vidmlld3MsIHN1YnZpZXdzKTtcblxuICAgICAgICAgICAgaWYgKCFkZXZpY2VTZXJ2aWNlLnN0cmljdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3IgPSBNYXRoLmFicyh0aGlzLl96b29tRmFjdG9yIC0gMSkgPCAwLjA1ID8gMSA6IHRoaXMuX3pvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnZpZXdzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnN0IGZydXN0dW0gPSBBcmdvbi5kZWNvbXBvc2VQZXJzcGVjdGl2ZVByb2plY3Rpb25NYXRyaXgocy5wcm9qZWN0aW9uTWF0cml4LCB0aGlzLl9zY3JhdGNoRnJ1c3R1bSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZydXN0dW0uZm92ID0gMiAqIE1hdGguYXRhbihNYXRoLnRhbihmcnVzdHVtLmZvdiAqIDAuNSkgLyB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXJnb24uQ2VzaXVtLk1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzLnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbMF0gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzFdICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIHMucHJvamVjdGlvbk1hdHJpeFsyXSAqPSB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbM10gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzRdICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIHMucHJvamVjdGlvbk1hdHJpeFs1XSAqPSB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbNl0gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzddICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yID0gMTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gYXBwbHkgdGhlIHByb2plY3Rpb24gc2NhbGVcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLnNldFNjYWxlRmFjdG9yKHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3IpO1xuXG4gICAgICAgICAgICAvLyBjb25maWd1cmUgdmlkZW9cbiAgICAgICAgICAgIGNvbnN0IHZpZXdwb3J0ID0gZnJhbWVTdGF0ZS52aWV3cG9ydDtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpICYmICh0aGlzLl92dWZvcmlhU2VydmljZVByb3ZpZGVyIGFzIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpXG4gICAgICAgICAgICAgICAgLmNvbmZpZ3VyZVZ1Zm9yaWFWaWRlb0JhY2tncm91bmQodmlld3BvcnQsIHRoaXMuaXNQcmVzZW50aW5nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzUHJlc2VudGluZykgcmV0dXJuO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRVc2VyID0gdGhpcy5fY29udGV4dFNlcnZpY2UudXNlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2VVc2VyID0gdGhpcy5fZGV2aWNlU2VydmljZS51c2VyO1xuICAgICAgICAgICAgICAgIChjb250ZXh0VXNlci5wb3NpdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQb3NpdGlvblByb3BlcnR5KS5zZXRWYWx1ZShBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMy5aRVJPLCBkZXZpY2VVc2VyKTtcbiAgICAgICAgICAgICAgICAoY29udGV4dFVzZXIub3JpZW50YXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UHJvcGVydHkpLnNldFZhbHVlKEFyZ29uLkNlc2l1bS5RdWF0ZXJuaW9uLklERU5USVRZKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRGcmFtZVN0YXRlID0gdGhpcy5fZGV2aWNlU2VydmljZS5jcmVhdGVDb250ZXh0RnJhbWVTdGF0ZShcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVTdGF0ZS50aW1lLFxuICAgICAgICAgICAgICAgICAgICBmcmFtZVN0YXRlLnZpZXdwb3J0LFxuICAgICAgICAgICAgICAgICAgICBzdWJ2aWV3cyxcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVTdGF0ZU9wdGlvbnNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnYXIucmVhbGl0eS5mcmFtZVN0YXRlJywgY29udGV4dEZyYW1lU3RhdGUpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2Vzc2lvbi5jbG9zZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICB9KVxuICAgIH1cbn1cblxuQXJnb24uREkuaW5qZWN0KEFyZ29uLlNlc3Npb25TZXJ2aWNlLCBBcmdvbi5WaWV3U2VydmljZSwgKVxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXIgZXh0ZW5kcyBBcmdvbi5Ib3N0ZWRSZWFsaXR5Vmlld2VyIHtcblxuICAgIHB1YmxpYyB3ZWJWaWV3ID0gbmV3IEFyZ29uV2ViVmlldztcblxuICAgIGNvbnN0cnVjdG9yKHNlc3Npb25TZXJ2aWNlLCB2aWV3U2VydmljZSwgcHVibGljIHVyaTpzdHJpbmcpIHtcbiAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIHZpZXdTZXJ2aWNlLCB1cmkpO1xuICAgICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSB1c2VyIG5hdmlnYXRpb24gb2YgdGhlIHJlYWxpdHkgdmlld1xuICAgICAgICAgICAgKHRoaXMud2ViVmlldy5pb3MgYXMgV0tXZWJWaWV3KS5hbGxvd3NCYWNrRm9yd2FyZE5hdmlnYXRpb25HZXN0dXJlcyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy53ZWJWaWV3Lm9uKCdzZXNzaW9uJywgKGRhdGE6U2Vzc2lvbkV2ZW50RGF0YSk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBkYXRhLnNlc3Npb247XG4gICAgICAgICAgICBzZXNzaW9uLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3RFdmVudC5yYWlzZUV2ZW50KHNlc3Npb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucHJlc2VudENoYW5nZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgIHRoaXMud2ViVmlldy52aXNpYmlsaXR5ID0gdGhpcy5pc1ByZXNlbnRpbmcgPyBlbnVtcy5WaXNpYmlsaXR5LnZpc2libGUgOiBlbnVtcy5WaXNpYmlsaXR5LmNvbGxhcHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgbG9hZCgpOnZvaWQge1xuICAgICAgICBjb25zdCB1cmw6c3RyaW5nID0gdGhpcy51cmk7XG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSB0aGlzLndlYlZpZXc7XG4gICAgICAgIGlmICh3ZWJWaWV3LnNyYyA9PT0gdXJsKSB3ZWJWaWV3LnJlbG9hZCgpO1xuICAgICAgICBlbHNlIHdlYlZpZXcuc3JjID0gdXJsO1xuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMud2ViVmlldy5zZXNzaW9uICYmIHRoaXMud2ViVmlldy5zZXNzaW9uLmNsb3NlKCk7XG4gICAgfVxufTsiXX0=