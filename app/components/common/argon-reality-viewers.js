"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Argon = require("@argonjs/argon");
var vuforia = require("nativescript-vuforia");
var enums = require("ui/enums");
var argon_web_view_1 = require("argon-web-view");
var gestures_1 = require("ui/gestures");
var NativescriptLiveRealityViewer = (function (_super) {
    __extends(NativescriptLiveRealityViewer, _super);
    function NativescriptLiveRealityViewer(sessionService, viewService, _deviceService, _vuforiaServiceProvider, uri) {
        var _this = _super.call(this, sessionService, viewService, _deviceService, uri) || this;
        _this._deviceService = _deviceService;
        _this._vuforiaServiceProvider = _vuforiaServiceProvider;
        _this.videoView = vuforia.videoView;
        _this._zoomFactor = 1;
        _this._scratchTouchPos1 = new Argon.Cesium.Cartesian2;
        _this._scratchTouchPos2 = new Argon.Cesium.Cartesian2;
        _this._scratchFrustum = new Argon.Cesium.PerspectiveFrustum;
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
        var remove = this._deviceService.frameStateEvent.addEventListener(function (frameState) {
            if (!_this.isPresenting || !session.isConnected)
                return;
            Argon.SerializedSubviewList.clone(frameState.subviews, subviews);
            if (!frameState.strict) {
                _this._effectiveZoomFactor = Math.abs(_this._zoomFactor - 1) < 0.05 ? 1 : _this._zoomFactor;
                for (var _i = 0, subviews_1 = subviews; _i < subviews_1.length; _i++) {
                    var s = subviews_1[_i];
                    var frustum = Argon.decomposePerspectiveProjectionMatrix(s.projectionMatrix, _this._scratchFrustum);
                    frustum.fov = 2 * Math.atan(Math.tan(frustum.fov * 0.5) / _this._effectiveZoomFactor);
                    Argon.Cesium.Matrix4.clone(frustum.projectionMatrix, s.projectionMatrix);
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
            try {
                var contextFrameState = _this._deviceService.createContextFrameState(frameState.time, frameState.viewport, subviews, _this._deviceService.user);
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
    __metadata("design:paramtypes", [Argon.SessionService, Argon.ViewService, Argon.DeviceService, Argon.VuforiaServiceProvider, String])
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tcmVhbGl0eS12aWV3ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tcmVhbGl0eS12aWV3ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLDhDQUFnRDtBQUNoRCxnQ0FBa0M7QUFFbEMsaURBQThEO0FBRzlELHdDQUlxQjtBQW9CckIsSUFBYSw2QkFBNkI7SUFBUyxpREFBdUI7SUFJdEUsdUNBQ0ksY0FBb0MsRUFDcEMsV0FBOEIsRUFDdEIsY0FBbUMsRUFDbkMsdUJBQXFELEVBQzdELEdBQVU7UUFMZCxZQU1RLGtCQUFNLGNBQWMsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxTQUM5RDtRQUpXLG9CQUFjLEdBQWQsY0FBYyxDQUFxQjtRQUNuQyw2QkFBdUIsR0FBdkIsdUJBQXVCLENBQThCO1FBTjFELGVBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBVzdCLGlCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBc0JoQix1QkFBaUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO1FBQ2hELHVCQUFpQixHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFxQ2hELHFCQUFlLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDOztJQTlEOUQsQ0FBQztJQUtPLG9FQUE0QixHQUFwQyxVQUFxQyxJQUEyQjtRQUM1RCxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNqQixLQUFLLDRCQUFpQixDQUFDLEtBQUs7Z0JBQ3hCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUMzRCxLQUFLLENBQUM7WUFDVixLQUFL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QztZQUNyQyxLQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxLQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1FBQ3ZHLENBQUMsQ0FBQyxDQUFDOztJQUNQLENBQUM7SUFFRCw4Q0FBSSxHQUFKO1FBQ0ksSUFBTSxHQUFHLEdBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUM1QixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDO1lBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFDLElBQUk7WUFBQyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUMzQixDQUFDO0lBRUQsaURBQU8sR0FBUDtRQUNJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pELENBQUM7SUFDTCxzQ0FBQztBQUFELENBQUMsQUFsQ0QsQ0FBcUQsS0FBSyxDQUFDLG1CQUFtQixHQWtDN0U7QUFsQ1ksMEVBQStCO0FBa0MzQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nO1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBlbnVtcyBmcm9tICd1aS9lbnVtcyc7XG5cbmltcG9ydCB7QXJnb25XZWJWaWV3LCBTZXNzaW9uRXZlbnREYXRhfSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1wcm92aWRlcic7XG5cbmltcG9ydCB7XG4gIEdlc3R1cmVUeXBlcyxcbiAgR2VzdHVyZVN0YXRlVHlwZXMsXG4gIFBpbmNoR2VzdHVyZUV2ZW50RGF0YVxufSBmcm9tICd1aS9nZXN0dXJlcyc7XG5cblxuaW50ZXJmYWNlIERPTVRvdWNoIHtcbiAgICByZWFkb25seSBjbGllbnRYOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgY2xpZW50WTogbnVtYmVyO1xuICAgIHJlYWRvbmx5IGlkZW50aWZpZXI6IG51bWJlcjtcbiAgICByZWFkb25seSBwYWdlWDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IHBhZ2VZOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgc2NyZWVuWDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IHNjcmVlblk6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIERPTVRvdWNoRXZlbnQge1xuICAgIHR5cGU6c3RyaW5nLFxuICAgIHRvdWNoZXM6QXJyYXk8RE9NVG91Y2g+LCBcbiAgICBjaGFuZ2VkVG91Y2hlczpBcnJheTxET01Ub3VjaD5cbn1cblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHRMaXZlUmVhbGl0eVZpZXdlciBleHRlbmRzIEFyZ29uLkxpdmVSZWFsaXR5Vmlld2VyIHtcblxuICAgIHB1YmxpYyB2aWRlb1ZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBzZXNzaW9uU2VydmljZTogQXJnb24uU2Vzc2lvblNlcnZpY2UsXG4gICAgICAgIHZpZXdTZXJ2aWNlOiBBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSBfZGV2aWNlU2VydmljZTogQXJnb24uRGV2aWNlU2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSBfdnVmb3JpYVNlcnZpY2VQcm92aWRlcjogQXJnb24uVnVmb3JpYVNlcnZpY2VQcm92aWRlcixcbiAgICAgICAgdXJpOnN0cmluZykge1xuICAgICAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIHZpZXdTZXJ2aWNlLCBfZGV2aWNlU2VydmljZSwgdXJpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF96b29tRmFjdG9yID0gMTtcbiAgICBwcml2YXRlIF9waW5jaFN0YXJ0Wm9vbUZhY3RvcjpudW1iZXI7XG4gICAgXG4gICAgcHJpdmF0ZSBfaGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhKGRhdGE6IFBpbmNoR2VzdHVyZUV2ZW50RGF0YSkge1xuICAgICAgICBzd2l0Y2ggKGRhdGEuc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgR2VzdHVyZVN0YXRlVHlwZXMuYmVnYW46IFxuICAgICAgICAgICAgICAgIHRoaXMuX3BpbmNoU3RhcnRab29tRmFjdG9yID0gdGhpcy5fem9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICB0aGlzLl96b29tRmFjdG9yID0gdGhpcy5fcGluY2hTdGFydFpvb21GYWN0b3IgKiBkYXRhLnNjYWxlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5jaGFuZ2VkOiBcbiAgICAgICAgICAgICAgICB0aGlzLl96b29tRmFjdG9yID0gdGhpcy5fcGluY2hTdGFydFpvb21GYWN0b3IgKiBkYXRhLnNjYWxlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5lbmRlZDpcbiAgICAgICAgICAgIGNhc2UgR2VzdHVyZVN0YXRlVHlwZXMuY2FuY2VsbGVkOlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzLl96b29tRmFjdG9yID0gdGhpcy5fcGluY2hTdGFydFpvb21GYWN0b3IgKiBkYXRhLnNjYWxlO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zdGFydFBpbmNoRGlzdGFuY2U/Om51bWJlcjtcbiAgICBwcml2YXRlIF9jdXJyZW50UGluY2hEaXN0YW5jZT86bnVtYmVyO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hUb3VjaFBvczEgPSBuZXcgQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjI7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFRvdWNoUG9zMiA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMjtcblxuICAgIHByaXZhdGUgX2hhbmRsZUZvcndhcmRlZERPTVRvdWNoRXZlbnREYXRhKHVpZXZlbnQ6IERPTVRvdWNoRXZlbnQpIHtcbiAgICAgICAgaWYgKCF1aWV2ZW50LnRvdWNoZXMpIHJldHVybjtcblxuICAgICAgICBpZiAodWlldmVudC50b3VjaGVzLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgICAgICB0aGlzLl9zY3JhdGNoVG91Y2hQb3MxLnggPSB1aWV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WDtcbiAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hUb3VjaFBvczEueSA9IHVpZXZlbnQudG91Y2hlc1swXS5jbGllbnRZO1xuICAgICAgICAgICAgdGhpcy5fc2NyYXRjaFRvdWNoUG9zMi54ID0gdWlldmVudC50b3VjaGVzWzFdLmNsaWVudFg7XG4gICAgICAgICAgICB0aGlzLl9zY3JhdGNoVG91Y2hQb3MyLnkgPSB1aWV2ZW50LnRvdWNoZXNbMV0uY2xpZW50WTtcbiAgICAgICAgICAgIGNvbnN0IGRpc3QgPSBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMi5kaXN0YW5jZVNxdWFyZWQodGhpcy5fc2NyYXRjaFRvdWNoUG9zMSwgdGhpcy5fc2NyYXRjaFRvdWNoUG9zMik7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZSA9IGRpc3Q7XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhKDxQaW5jaEdlc3R1cmVFdmVudERhdGE+e1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogR2VzdHVyZVN0YXRlVHlwZXMuYmVnYW4sXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiAxXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRQaW5jaERpc3RhbmNlID0gZGlzdDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVQaW5jaEdlc3R1cmVFdmVudERhdGEoPFBpbmNoR2VzdHVyZUV2ZW50RGF0YT57XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBHZXN0dXJlU3RhdGVUeXBlcy5jaGFuZ2VkLFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogdGhpcy5fY3VycmVudFBpbmNoRGlzdGFuY2UgLyB0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2UgIT09IHVuZGVmaW5lZCAmJiB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhKDxQaW5jaEdlc3R1cmVFdmVudERhdGE+e1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogR2VzdHVyZVN0YXRlVHlwZXMuZW5kZWQsXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSAvIHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3NjcmF0Y2hGcnVzdHVtID0gbmV3IEFyZ29uLkNlc2l1bS5QZXJzcGVjdGl2ZUZydXN0dW07XG4gICAgcHJpdmF0ZSBfZWZmZWN0aXZlWm9vbUZhY3RvcjpudW1iZXI7XG5cbiAgICBzZXR1cEludGVybmFsU2Vzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHN1cGVyLnNldHVwSW50ZXJuYWxTZXNzaW9uKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU2V0dGluZyB1cCBWdWZvcmlhIHZpZXdlciBzZXNzaW9uXCIpO1xuXG4gICAgICAgIHZ1Zm9yaWEudmlkZW9WaWV3LnBhcmVudC5vbihHZXN0dXJlVHlwZXMucGluY2gsIHRoaXMuX2hhbmRsZVBpbmNoR2VzdHVyZUV2ZW50RGF0YSwgdGhpcyk7XG5cbiAgICAgICAgc2Vzc2lvbi5vblsnYXIudmlldy51aWV2ZW50J10gPSAodWlldmVudDpET01Ub3VjaEV2ZW50KSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5faGFuZGxlRm9yd2FyZGVkRE9NVG91Y2hFdmVudERhdGEodWlldmVudCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc3Vidmlld3M6QXJnb24uU2VyaWFsaXplZFN1YnZpZXdMaXN0ID0gW107XG5cbiAgICAgICAgY29uc3QgcmVtb3ZlID0gdGhpcy5fZGV2aWNlU2VydmljZS5mcmFtZVN0YXRlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoZnJhbWVTdGF0ZSk9PntcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ByZXNlbnRpbmcgfHwgIXNlc3Npb24uaXNDb25uZWN0ZWQpIHJldHVybjtcblxuICAgICAgICAgICAgQXJnb24uU2VyaWFsaXplZFN1YnZpZXdMaXN0LmNsb25lKGZyYW1lU3RhdGUuc3Vidmlld3MsIHN1YnZpZXdzKTtcblxuICAgICAgICAgICAgaWYgKCFmcmFtZVN0YXRlLnN0cmljdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3IgPSBNYXRoLmFicyh0aGlzLl96b29tRmFjdG9yIC0gMSkgPCAwLjA1ID8gMSA6IHRoaXMuX3pvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnZpZXdzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZydXN0dW0gPSBBcmdvbi5kZWNvbXBvc2VQZXJzcGVjdGl2ZVByb2plY3Rpb25NYXRyaXgocy5wcm9qZWN0aW9uTWF0cml4LCB0aGlzLl9zY3JhdGNoRnJ1c3R1bSk7XG4gICAgICAgICAgICAgICAgICAgIGZydXN0dW0uZm92ID0gMiAqIE1hdGguYXRhbihNYXRoLnRhbihmcnVzdHVtLmZvdiAqIDAuNSkgLyB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgQXJnb24uQ2VzaXVtLk1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzLnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvciA9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFwcGx5IHRoZSBwcm9qZWN0aW9uIHNjYWxlXG4gICAgICAgICAgICB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5zZXRTY2FsZUZhY3Rvcih0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yKTtcblxuICAgICAgICAgICAgLy8gY29uZmlndXJlIHZpZGVvXG4gICAgICAgICAgICBjb25zdCB2aWV3cG9ydCA9IGZyYW1lU3RhdGUudmlld3BvcnQ7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaSAmJiAodGhpcy5fdnVmb3JpYVNlcnZpY2VQcm92aWRlciBhcyBOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyKVxuICAgICAgICAgICAgICAgIC5jb25maWd1cmVWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kKHZpZXdwb3J0LCB0aGlzLmlzUHJlc2VudGluZyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dEZyYW1lU3RhdGUgPSB0aGlzLl9kZXZpY2VTZXJ2aWNlLmNyZWF0ZUNvbnRleHRGcmFtZVN0YXRlKFxuICAgICAgICAgICAgICAgICAgICBmcmFtZVN0YXRlLnRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lU3RhdGUudmlld3BvcnQsXG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXdzLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kZXZpY2VTZXJ2aWNlLnVzZXJcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnYXIucmVhbGl0eS5mcmFtZVN0YXRlJywgY29udGV4dEZyYW1lU3RhdGUpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2Vzc2lvbi5jbG9zZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICB9KVxuICAgIH1cbn1cblxuQXJnb24uREkuaW5qZWN0KEFyZ29uLlNlc3Npb25TZXJ2aWNlLCBBcmdvbi5WaWV3U2VydmljZSwgKVxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXIgZXh0ZW5kcyBBcmdvbi5Ib3N0ZWRSZWFsaXR5Vmlld2VyIHtcblxuICAgIHB1YmxpYyB3ZWJWaWV3ID0gbmV3IEFyZ29uV2ViVmlldztcblxuICAgIGNvbnN0cnVjdG9yKHNlc3Npb25TZXJ2aWNlLCB2aWV3U2VydmljZSwgcHVibGljIHVyaTpzdHJpbmcpIHtcbiAgICAgICAgc3VwZXIoc2Vzc2lvblNlcnZpY2UsIHZpZXdTZXJ2aWNlLCB1cmkpO1xuICAgICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSB1c2VyIG5hdmlnYXRpb24gb2YgdGhlIHJlYWxpdHkgdmlld1xuICAgICAgICAgICAgKHRoaXMud2ViVmlldy5pb3MgYXMgV0tXZWJWaWV3KS5hbGxvd3NCYWNrRm9yd2FyZE5hdmlnYXRpb25HZXN0dXJlcyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy53ZWJWaWV3Lm9uKCdzZXNzaW9uJywgKGRhdGE6U2Vzc2lvbkV2ZW50RGF0YSk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBkYXRhLnNlc3Npb247XG4gICAgICAgICAgICBzZXNzaW9uLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3RFdmVudC5yYWlzZUV2ZW50KHNlc3Npb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucHJlc2VudENoYW5nZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgIHRoaXMud2ViVmlldy52aXNpYmlsaXR5ID0gdGhpcy5pc1ByZXNlbnRpbmcgPyBlbnVtcy5WaXNpYmlsaXR5LnZpc2libGUgOiBlbnVtcy5WaXNpYmlsaXR5LmNvbGxhcHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgbG9hZCgpOnZvaWQge1xuICAgICAgICBjb25zdCB1cmw6c3RyaW5nID0gdGhpcy51cmk7XG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSB0aGlzLndlYlZpZXc7XG4gICAgICAgIGlmICh3ZWJWaWV3LnNyYyA9PT0gdXJsKSB3ZWJWaWV3LnJlbG9hZCgpO1xuICAgICAgICBlbHNlIHdlYlZpZXcuc3JjID0gdXJsO1xuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMud2ViVmlldy5zZXNzaW9uICYmIHRoaXMud2ViVmlldy5zZXNzaW9uLmNsb3NlKCk7XG4gICAgfVxufTsiXX0=