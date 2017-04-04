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
            if (!_this.isPresenting || !session.isConnected)
                return;
            if (frameState.geolocationDesired) {
                _this._deviceService.subscribeGeolocation(frameState.geolocationOptions, session);
            }
            else {
                _this._deviceService.unsubscribeGeolocation(session);
            }
            Argon.SerializedSubviewList.clone(frameState.subviews, subviews);
            if (!frameState.strict) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tcmVhbGl0eS12aWV3ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tcmVhbGl0eS12aWV3ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLDhDQUFnRDtBQUNoRCxnQ0FBa0M7QUFFbEMsaURBQThEO0FBRzlELHdDQUlxQjtBQW9CckIsSUFBYSw2QkFBNkI7SUFBUyxpREFBdUI7SUFJdEUsdUNBQ0ksY0FBb0MsRUFDcEMsV0FBOEIsRUFDdEIsZUFBcUMsRUFDckMsY0FBbUMsRUFDbkMsdUJBQXFELEVBQzdELEdBQVU7UUFOZCxZQU9RLGtCQUFNLGNBQWMsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxTQUM5RDtRQUxXLHFCQUFlLEdBQWYsZUFBZSxDQUFzQjtRQUNyQyxvQkFBYyxHQUFkLGNBQWMsQ0FBcUI7UUFDbkMsNkJBQXVCLEdBQXZCLHVCQUF1QixDQUE4QjtRQVAxRCxlQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQVk3QixpQkFBVyxHQUFHLENBQUMsQ0FBQztRQXNCaEIsdUJBQWlCLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztRQUNoRCx1QkFBaUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDOztJQXpCeEQsQ0FBQztJQUtPLG9FQUE0QixHQUFwQyxVQUFxQyxJQUEyQjtRQUM1RCxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNqQixLQUFLLDRCQUFpQixDQUFDLEtBQUs7Z0JBQ3hCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUMzRCxLQUFLLENBQUM7WUFDVixLQUFLLDRCQUFpQixDQUFDLE9B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USxDQUFDO1FBQ3ZHLENBQUMsQ0FBQyxDQUFDOztJQUNQLENBQUM7SUFFRCw4Q0FBSSxHQUFKO1FBQ0ksSUFBTSxHQUFHLEdBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUM1QixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDO1lBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFDLElBQUk7WUFBQyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUMzQixDQUFDO0lBRUQsaURBQU8sR0FBUDtRQUNJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pELENBQUM7SUFDTCxzQ0FBQztBQUFELENBQUMsQUFsQ0QsQ0FBcUQsS0FBSyxDQUFDLG1CQUFtQixHQWtDN0U7QUFsQ1ksMEVBQStCO0FBa0MzQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nO1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBlbnVtcyBmcm9tICd1aS9lbnVtcyc7XG5cbmltcG9ydCB7QXJnb25XZWJWaWV3LCBTZXNzaW9uRXZlbnREYXRhfSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5pbXBvcnQge05hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXJ9IGZyb20gJy4vYXJnb24tdnVmb3JpYS1wcm92aWRlcic7XG5cbmltcG9ydCB7XG4gIEdlc3R1cmVUeXBlcyxcbiAgR2VzdHVyZVN0YXRlVHlwZXMsXG4gIFBpbmNoR2VzdHVyZUV2ZW50RGF0YVxufSBmcm9tICd1aS9nZXN0dXJlcyc7XG5cblxuaW50ZXJmYWNlIERPTVRvdWNoIHtcbiAgICByZWFkb25seSBjbGllbnRYOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgY2xpZW50WTogbnVtYmVyO1xuICAgIHJlYWRvbmx5IGlkZW50aWZpZXI6IG51bWJlcjtcbiAgICByZWFkb25seSBwYWdlWDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IHBhZ2VZOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgc2NyZWVuWDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IHNjcmVlblk6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIERPTVRvdWNoRXZlbnQge1xuICAgIHR5cGU6c3RyaW5nLFxuICAgIHRvdWNoZXM6QXJyYXk8RE9NVG91Y2g+LCBcbiAgICBjaGFuZ2VkVG91Y2hlczpBcnJheTxET01Ub3VjaD5cbn1cblxuQEFyZ29uLkRJLmF1dG9pbmplY3RcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHRMaXZlUmVhbGl0eVZpZXdlciBleHRlbmRzIEFyZ29uLkxpdmVSZWFsaXR5Vmlld2VyIHtcblxuICAgIHB1YmxpYyB2aWRlb1ZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBzZXNzaW9uU2VydmljZTogQXJnb24uU2Vzc2lvblNlcnZpY2UsXG4gICAgICAgIHZpZXdTZXJ2aWNlOiBBcmdvbi5WaWV3U2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSBfY29udGV4dFNlcnZpY2U6IEFyZ29uLkNvbnRleHRTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlIF9kZXZpY2VTZXJ2aWNlOiBBcmdvbi5EZXZpY2VTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlIF92dWZvcmlhU2VydmljZVByb3ZpZGVyOiBBcmdvbi5WdWZvcmlhU2VydmljZVByb3ZpZGVyLFxuICAgICAgICB1cmk6c3RyaW5nKSB7XG4gICAgICAgICAgICBzdXBlcihzZXNzaW9uU2VydmljZSwgdmlld1NlcnZpY2UsIF9kZXZpY2VTZXJ2aWNlLCB1cmkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3pvb21GYWN0b3IgPSAxO1xuICAgIHByaXZhdGUgX3BpbmNoU3RhcnRab29tRmFjdG9yOm51bWJlcjtcbiAgICBcbiAgICBwcml2YXRlIF9oYW5kbGVQaW5jaEdlc3R1cmVFdmVudERhdGEoZGF0YTogUGluY2hHZXN0dXJlRXZlbnREYXRhKSB7XG4gICAgICAgIHN3aXRjaCAoZGF0YS5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5iZWdhbjogXG4gICAgICAgICAgICAgICAgdGhpcy5fcGluY2hTdGFydFpvb21GYWN0b3IgPSB0aGlzLl96b29tRmFjdG9yO1xuICAgICAgICAgICAgICAgIHRoaXMuX3pvb21GYWN0b3IgPSB0aGlzLl9waW5jaFN0YXJ0Wm9vbUZhY3RvciAqIGRhdGEuc2NhbGU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEdlc3R1cmVTdGF0ZVR5cGVzLmNoYW5nZWQ6IFxuICAgICAgICAgICAgICAgIHRoaXMuX3pvb21GYWN0b3IgPSB0aGlzLl9waW5jaFN0YXJ0Wm9vbUZhY3RvciAqIGRhdGEuc2NhbGU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEdlc3R1cmVTdGF0ZVR5cGVzLmVuZGVkOlxuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5jYW5jZWxsZWQ6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRoaXMuX3pvb21GYWN0b3IgPSB0aGlzLl9waW5jaFN0YXJ0Wm9vbUZhY3RvciAqIGRhdGEuc2NhbGU7XG4gICAgICAgICAgICAgICAgYnJlYWs7ICBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3N0YXJ0UGluY2hEaXN0YW5jZT86bnVtYmVyO1xuICAgIHByaXZhdGUgX2N1cnJlbnRQaW5jaERpc3RhbmNlPzpudW1iZXI7XG4gICAgcHJpdmF0ZSBfc2NyYXRjaFRvdWNoUG9zMSA9IG5ldyBBcmdvbi5DZXNpdW0uQ2FydGVzaWFuMjtcbiAgICBwcml2YXRlIF9zY3JhdGNoVG91Y2hQb3MyID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4yO1xuXG4gICAgcHJpdmF0ZSBfaGFuZGxlRm9yd2FyZGVkRE9NVG91Y2hFdmVudERhdGEodWlldmVudDogRE9NVG91Y2hFdmVudCkge1xuICAgICAgICBpZiAoIXVpZXZlbnQudG91Y2hlcykgcmV0dXJuO1xuXG4gICAgICAgIGlmICh1aWV2ZW50LnRvdWNoZXMubGVuZ3RoID09IDIpIHtcbiAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hUb3VjaFBvczEueCA9IHVpZXZlbnQudG91Y2hlc1swXS5jbGllbnRYO1xuICAgICAgICAgICAgdGhpcy5fc2NyYXRjaFRvdWNoUG9zMS55ID0gdWlldmVudC50b3VjaGVzWzBdLmNsaWVudFk7XG4gICAgICAgICAgICB0aGlzLl9zY3JhdGNoVG91Y2hQb3MyLnggPSB1aWV2ZW50LnRvdWNoZXNbMV0uY2xpZW50WDtcbiAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hUb3VjaFBvczIueSA9IHVpZXZlbnQudG91Y2hlc1sxXS5jbGllbnRZO1xuICAgICAgICAgICAgY29uc3QgZGlzdCA9IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4yLmRpc3RhbmNlU3F1YXJlZCh0aGlzLl9zY3JhdGNoVG91Y2hQb3MxLCB0aGlzLl9zY3JhdGNoVG91Y2hQb3MyKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnRQaW5jaERpc3RhbmNlID0gZGlzdDtcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVQaW5jaEdlc3R1cmVFdmVudERhdGEoPFBpbmNoR2VzdHVyZUV2ZW50RGF0YT57XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBHZXN0dXJlU3RhdGVUeXBlcy5iZWdhbixcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IDFcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3VycmVudFBpbmNoRGlzdGFuY2UgPSBkaXN0O1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVBpbmNoR2VzdHVyZUV2ZW50RGF0YSg8UGluY2hHZXN0dXJlRXZlbnREYXRhPntcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEdlc3R1cmVTdGF0ZVR5cGVzLmNoYW5nZWQsXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSAvIHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0YXJ0UGluY2hEaXN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIHRoaXMuX2N1cnJlbnRQaW5jaERpc3RhbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVQaW5jaEdlc3R1cmVFdmVudERhdGEoPFBpbmNoR2VzdHVyZUV2ZW50RGF0YT57XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBHZXN0dXJlU3RhdGVUeXBlcy5lbmRlZCxcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHRoaXMuX2N1cnJlbnRQaW5jaERpc3RhbmNlIC8gdGhpcy5fc3RhcnRQaW5jaERpc3RhbmNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnRQaW5jaERpc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRQaW5jaERpc3RhbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gcHJpdmF0ZSBfc2NyYXRjaEZydXN0dW0gPSBuZXcgQXJnb24uQ2VzaXVtLlBlcnNwZWN0aXZlRnJ1c3R1bTtcbiAgICBwcml2YXRlIF9lZmZlY3RpdmVab29tRmFjdG9yOm51bWJlcjtcbiAgICBzZXR1cEludGVybmFsU2Vzc2lvbihzZXNzaW9uOkFyZ29uLlNlc3Npb25Qb3J0KSB7XG4gICAgICAgIHN1cGVyLnNldHVwSW50ZXJuYWxTZXNzaW9uKHNlc3Npb24pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU2V0dGluZyB1cCBWdWZvcmlhIHZpZXdlciBzZXNzaW9uXCIpO1xuXG4gICAgICAgIHZ1Zm9yaWEudmlkZW9WaWV3LnBhcmVudC5vbihHZXN0dXJlVHlwZXMucGluY2gsIHRoaXMuX2hhbmRsZVBpbmNoR2VzdHVyZUV2ZW50RGF0YSwgdGhpcyk7XG5cbiAgICAgICAgc2Vzc2lvbi5vblsnYXIudmlldy51aWV2ZW50J10gPSAodWlldmVudDpET01Ub3VjaEV2ZW50KSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5faGFuZGxlRm9yd2FyZGVkRE9NVG91Y2hFdmVudERhdGEodWlldmVudCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc3Vidmlld3M6QXJnb24uU2VyaWFsaXplZFN1YnZpZXdMaXN0ID0gW107XG5cbiAgICAgICAgY29uc3QgZnJhbWVTdGF0ZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICBvdmVycmlkZVVzZXI6IHRydWVcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlbW92ZSA9IHRoaXMuX2RldmljZVNlcnZpY2UuZnJhbWVTdGF0ZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKGZyYW1lU3RhdGUpPT57XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNQcmVzZW50aW5nIHx8ICFzZXNzaW9uLmlzQ29ubmVjdGVkKSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChmcmFtZVN0YXRlLmdlb2xvY2F0aW9uRGVzaXJlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RldmljZVNlcnZpY2Uuc3Vic2NyaWJlR2VvbG9jYXRpb24oZnJhbWVTdGF0ZS5nZW9sb2NhdGlvbk9wdGlvbnMsIHNlc3Npb24pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9kZXZpY2VTZXJ2aWNlLnVuc3Vic2NyaWJlR2VvbG9jYXRpb24oc2Vzc2lvbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIEFyZ29uLlNlcmlhbGl6ZWRTdWJ2aWV3TGlzdC5jbG9uZShmcmFtZVN0YXRlLnN1YnZpZXdzLCBzdWJ2aWV3cyk7XG5cbiAgICAgICAgICAgIGlmICghZnJhbWVTdGF0ZS5zdHJpY3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yID0gTWF0aC5hYnModGhpcy5fem9vbUZhY3RvciAtIDEpIDwgMC4wNSA/IDEgOiB0aGlzLl96b29tRmFjdG9yO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJ2aWV3cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zdCBmcnVzdHVtID0gQXJnb24uZGVjb21wb3NlUGVyc3BlY3RpdmVQcm9qZWN0aW9uTWF0cml4KHMucHJvamVjdGlvbk1hdHJpeCwgdGhpcy5fc2NyYXRjaEZydXN0dW0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBmcnVzdHVtLmZvdiA9IDIgKiBNYXRoLmF0YW4oTWF0aC50YW4oZnJ1c3R1bS5mb3YgKiAwLjUpIC8gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFyZ29uLkNlc2l1bS5NYXRyaXg0LmNsb25lKGZydXN0dW0ucHJvamVjdGlvbk1hdHJpeCwgcy5wcm9qZWN0aW9uTWF0cml4KTtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzBdICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIHMucHJvamVjdGlvbk1hdHJpeFsxXSAqPSB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbMl0gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzNdICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIHMucHJvamVjdGlvbk1hdHJpeFs0XSAqPSB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbNV0gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzZdICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIHMucHJvamVjdGlvbk1hdHJpeFs3XSAqPSB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvciA9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFwcGx5IHRoZSBwcm9qZWN0aW9uIHNjYWxlXG4gICAgICAgICAgICB2dWZvcmlhLmFwaSAmJiB2dWZvcmlhLmFwaS5zZXRTY2FsZUZhY3Rvcih0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yKTtcblxuICAgICAgICAgICAgLy8gY29uZmlndXJlIHZpZGVvXG4gICAgICAgICAgICBjb25zdCB2aWV3cG9ydCA9IGZyYW1lU3RhdGUudmlld3BvcnQ7XG4gICAgICAgICAgICB2dWZvcmlhLmFwaSAmJiAodGhpcy5fdnVmb3JpYVNlcnZpY2VQcm92aWRlciBhcyBOYXRpdmVzY3JpcHRWdWZvcmlhU2VydmljZVByb3ZpZGVyKVxuICAgICAgICAgICAgICAgIC5jb25maWd1cmVWdWZvcmlhVmlkZW9CYWNrZ3JvdW5kKHZpZXdwb3J0LCB0aGlzLmlzUHJlc2VudGluZyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dFVzZXIgPSB0aGlzLl9jb250ZXh0U2VydmljZS51c2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZVVzZXIgPSB0aGlzLl9kZXZpY2VTZXJ2aWNlLnVzZXI7XG4gICAgICAgICAgICAgICAgKGNvbnRleHRVc2VyLnBvc2l0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFBvc2l0aW9uUHJvcGVydHkpLnNldFZhbHVlKEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4zLlpFUk8sIGRldmljZVVzZXIpO1xuICAgICAgICAgICAgICAgIChjb250ZXh0VXNlci5vcmllbnRhdGlvbiBhcyBBcmdvbi5DZXNpdW0uQ29uc3RhbnRQcm9wZXJ0eSkuc2V0VmFsdWUoQXJnb24uQ2VzaXVtLlF1YXRlcm5pb24uSURFTlRJVFkpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dEZyYW1lU3RhdGUgPSB0aGlzLl9kZXZpY2VTZXJ2aWNlLmNyZWF0ZUNvbnRleHRGcmFtZVN0YXRlKFxuICAgICAgICAgICAgICAgICAgICBmcmFtZVN0YXRlLnRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lU3RhdGUudmlld3BvcnQsXG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXdzLFxuICAgICAgICAgICAgICAgICAgICBmcmFtZVN0YXRlT3B0aW9uc1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdhci5yZWFsaXR5LmZyYW1lU3RhdGUnLCBjb250ZXh0RnJhbWVTdGF0ZSk7XG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBzZXNzaW9uLmNsb3NlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgcmVtb3ZlKCk7XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5Bcmdvbi5ESS5pbmplY3QoQXJnb24uU2Vzc2lvblNlcnZpY2UsIEFyZ29uLlZpZXdTZXJ2aWNlLCApXG5leHBvcnQgY2xhc3MgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlciBleHRlbmRzIEFyZ29uLkhvc3RlZFJlYWxpdHlWaWV3ZXIge1xuXG4gICAgcHVibGljIHdlYlZpZXcgPSBuZXcgQXJnb25XZWJWaWV3O1xuXG4gICAgY29uc3RydWN0b3Ioc2Vzc2lvblNlcnZpY2UsIHZpZXdTZXJ2aWNlLCBwdWJsaWMgdXJpOnN0cmluZykge1xuICAgICAgICBzdXBlcihzZXNzaW9uU2VydmljZSwgdmlld1NlcnZpY2UsIHVyaSk7XG4gICAgICAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLndlYlZpZXcuaW9zKSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIHVzZXIgbmF2aWdhdGlvbiBvZiB0aGUgcmVhbGl0eSB2aWV3XG4gICAgICAgICAgICAodGhpcy53ZWJWaWV3LmlvcyBhcyBXS1dlYlZpZXcpLmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLndlYlZpZXcub24oJ3Nlc3Npb24nLCAoZGF0YTpTZXNzaW9uRXZlbnREYXRhKT0+e1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGRhdGEuc2Vzc2lvbjtcbiAgICAgICAgICAgIHNlc3Npb24uY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdEV2ZW50LnJhaXNlRXZlbnQoc2Vzc2lvbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5wcmVzZW50Q2hhbmdlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgdGhpcy53ZWJWaWV3LnZpc2liaWxpdHkgPSB0aGlzLmlzUHJlc2VudGluZyA/IGVudW1zLlZpc2liaWxpdHkudmlzaWJsZSA6IGVudW1zLlZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBsb2FkKCk6dm9pZCB7XG4gICAgICAgIGNvbnN0IHVybDpzdHJpbmcgPSB0aGlzLnVyaTtcbiAgICAgICAgY29uc3Qgd2ViVmlldyA9IHRoaXMud2ViVmlldztcbiAgICAgICAgaWYgKHdlYlZpZXcuc3JjID09PSB1cmwpIHdlYlZpZXcucmVsb2FkKCk7XG4gICAgICAgIGVsc2Ugd2ViVmlldy5zcmMgPSB1cmw7XG4gICAgfVxuXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgdGhpcy53ZWJWaWV3LnNlc3Npb24gJiYgdGhpcy53ZWJWaWV3LnNlc3Npb24uY2xvc2UoKTtcbiAgICB9XG59OyJdfQ==