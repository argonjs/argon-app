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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tcmVhbGl0eS12aWV3ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24tcmVhbGl0eS12aWV3ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLDhDQUFnRDtBQUNoRCxnQ0FBa0M7QUFFbEMsaURBQThEO0FBRzlELHdDQUlxQjtBQW9CckIsSUFBYSw2QkFBNkI7SUFBUyxpREFBdUI7SUFJdEUsdUNBQ0ksY0FBb0MsRUFDcEMsV0FBOEIsRUFDdEIsZUFBcUMsRUFDckMsY0FBbUMsRUFDbkMsdUJBQXFELEVBQzdELEdBQVU7UUFOZCxZQU9RLGtCQUFNLGNBQWMsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxTQUM5RDtRQUxXLHFCQUFlLEdBQWYsZUFBZSxDQUFzQjtRQUNyQyxvQkFBYyxHQUFkLGNBQWMsQ0FBcUI7UUFDbkMsNkJBQXVCLEdBQXZCLHVCQUF1QixDQUE4QjtRQVAxRCxlQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQVk3QixpQkFBVyxHQUFHLENBQUMsQ0FBQztRQXNCaEIsdUJBQWlCLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztRQUNoRCx1QkFBaUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDOztJQXpCeEQsQ0FBQztJQUtPLG9FQUE0QixHQUFwQyxVQUFxQyxJQUEyQjtRQUM1RCxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNqQixLQUFLLDRCQUFpQixDQUFDLEtBQUs7Z0JBQ3hCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUMzRCxLQUFLLENBQUM7WUFDVixLQUFLLDRCQUFpQixDQUFDLE9B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SUFBSTtZQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQzNCLENBQUM7SUFFRCxpREFBTyxHQUFQO1FBQ0ksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekQsQ0FBQztJQUNMLHNDQUFDO0FBQUQsQ0FBQyxBQWxDRCxDQUFxRCxLQUFLLENBQUMsbUJBQW1CLEdBa0M3RTtBQWxDWSwwRUFBK0I7QUFrQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGVudW1zIGZyb20gJ3VpL2VudW1zJztcblxuaW1wb3J0IHtBcmdvbldlYlZpZXcsIFNlc3Npb25FdmVudERhdGF9IGZyb20gJ2FyZ29uLXdlYi12aWV3JztcbmltcG9ydCB7TmF0aXZlc2NyaXB0VnVmb3JpYVNlcnZpY2VQcm92aWRlcn0gZnJvbSAnLi9hcmdvbi12dWZvcmlhLXByb3ZpZGVyJztcblxuaW1wb3J0IHtcbiAgR2VzdHVyZVR5cGVzLFxuICBHZXN0dXJlU3RhdGVUeXBlcyxcbiAgUGluY2hHZXN0dXJlRXZlbnREYXRhXG59IGZyb20gJ3VpL2dlc3R1cmVzJztcblxuXG5pbnRlcmZhY2UgRE9NVG91Y2gge1xuICAgIHJlYWRvbmx5IGNsaWVudFg6IG51bWJlcjtcbiAgICByZWFkb25seSBjbGllbnRZOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgaWRlbnRpZmllcjogbnVtYmVyO1xuICAgIHJlYWRvbmx5IHBhZ2VYOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgcGFnZVk6IG51bWJlcjtcbiAgICByZWFkb25seSBzY3JlZW5YOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgc2NyZWVuWTogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgRE9NVG91Y2hFdmVudCB7XG4gICAgdHlwZTpzdHJpbmcsXG4gICAgdG91Y2hlczpBcnJheTxET01Ub3VjaD4sIFxuICAgIGNoYW5nZWRUb3VjaGVzOkFycmF5PERPTVRvdWNoPlxufVxuXG5AQXJnb24uREkuYXV0b2luamVjdFxuZXhwb3J0IGNsYXNzIE5hdGl2ZXNjcmlwdExpdmVSZWFsaXR5Vmlld2VyIGV4dGVuZHMgQXJnb24uTGl2ZVJlYWxpdHlWaWV3ZXIge1xuXG4gICAgcHVibGljIHZpZGVvVmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHNlc3Npb25TZXJ2aWNlOiBBcmdvbi5TZXNzaW9uU2VydmljZSxcbiAgICAgICAgdmlld1NlcnZpY2U6IEFyZ29uLlZpZXdTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlIF9jb250ZXh0U2VydmljZTogQXJnb24uQ29udGV4dFNlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgX2RldmljZVNlcnZpY2U6IEFyZ29uLkRldmljZVNlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgX3Z1Zm9yaWFTZXJ2aWNlUHJvdmlkZXI6IEFyZ29uLlZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIsXG4gICAgICAgIHVyaTpzdHJpbmcpIHtcbiAgICAgICAgICAgIHN1cGVyKHNlc3Npb25TZXJ2aWNlLCB2aWV3U2VydmljZSwgX2RldmljZVNlcnZpY2UsIHVyaSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfem9vbUZhY3RvciA9IDE7XG4gICAgcHJpdmF0ZSBfcGluY2hTdGFydFpvb21GYWN0b3I6bnVtYmVyO1xuICAgIFxuICAgIHByaXZhdGUgX2hhbmRsZVBpbmNoR2VzdHVyZUV2ZW50RGF0YShkYXRhOiBQaW5jaEdlc3R1cmVFdmVudERhdGEpIHtcbiAgICAgICAgc3dpdGNoIChkYXRhLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIEdlc3R1cmVTdGF0ZVR5cGVzLmJlZ2FuOiBcbiAgICAgICAgICAgICAgICB0aGlzLl9waW5jaFN0YXJ0Wm9vbUZhY3RvciA9IHRoaXMuX3pvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgdGhpcy5fem9vbUZhY3RvciA9IHRoaXMuX3BpbmNoU3RhcnRab29tRmFjdG9yICogZGF0YS5zY2FsZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgR2VzdHVyZVN0YXRlVHlwZXMuY2hhbmdlZDogXG4gICAgICAgICAgICAgICAgdGhpcy5fem9vbUZhY3RvciA9IHRoaXMuX3BpbmNoU3RhcnRab29tRmFjdG9yICogZGF0YS5zY2FsZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgR2VzdHVyZVN0YXRlVHlwZXMuZW5kZWQ6XG4gICAgICAgICAgICBjYXNlIEdlc3R1cmVTdGF0ZVR5cGVzLmNhbmNlbGxlZDpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy5fem9vbUZhY3RvciA9IHRoaXMuX3BpbmNoU3RhcnRab29tRmFjdG9yICogZGF0YS5zY2FsZTtcbiAgICAgICAgICAgICAgICBicmVhazsgIFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc3RhcnRQaW5jaERpc3RhbmNlPzpudW1iZXI7XG4gICAgcHJpdmF0ZSBfY3VycmVudFBpbmNoRGlzdGFuY2U/Om51bWJlcjtcbiAgICBwcml2YXRlIF9zY3JhdGNoVG91Y2hQb3MxID0gbmV3IEFyZ29uLkNlc2l1bS5DYXJ0ZXNpYW4yO1xuICAgIHByaXZhdGUgX3NjcmF0Y2hUb3VjaFBvczIgPSBuZXcgQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjI7XG5cbiAgICBwcml2YXRlIF9oYW5kbGVGb3J3YXJkZWRET01Ub3VjaEV2ZW50RGF0YSh1aWV2ZW50OiBET01Ub3VjaEV2ZW50KSB7XG4gICAgICAgIGlmICghdWlldmVudC50b3VjaGVzKSByZXR1cm47XG5cbiAgICAgICAgaWYgKHVpZXZlbnQudG91Y2hlcy5sZW5ndGggPT0gMikge1xuICAgICAgICAgICAgdGhpcy5fc2NyYXRjaFRvdWNoUG9zMS54ID0gdWlldmVudC50b3VjaGVzWzBdLmNsaWVudFg7XG4gICAgICAgICAgICB0aGlzLl9zY3JhdGNoVG91Y2hQb3MxLnkgPSB1aWV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WTtcbiAgICAgICAgICAgIHRoaXMuX3NjcmF0Y2hUb3VjaFBvczIueCA9IHVpZXZlbnQudG91Y2hlc1sxXS5jbGllbnRYO1xuICAgICAgICAgICAgdGhpcy5fc2NyYXRjaFRvdWNoUG9zMi55ID0gdWlldmVudC50b3VjaGVzWzFdLmNsaWVudFk7XG4gICAgICAgICAgICBjb25zdCBkaXN0ID0gQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjIuZGlzdGFuY2VTcXVhcmVkKHRoaXMuX3NjcmF0Y2hUb3VjaFBvczEsIHRoaXMuX3NjcmF0Y2hUb3VjaFBvczIpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5fc3RhcnRQaW5jaERpc3RhbmNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2UgPSBkaXN0O1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVBpbmNoR2VzdHVyZUV2ZW50RGF0YSg8UGluY2hHZXN0dXJlRXZlbnREYXRhPntcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEdlc3R1cmVTdGF0ZVR5cGVzLmJlZ2FuLFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogMVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jdXJyZW50UGluY2hEaXN0YW5jZSA9IGRpc3Q7XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhKDxQaW5jaEdlc3R1cmVFdmVudERhdGE+e1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogR2VzdHVyZVN0YXRlVHlwZXMuY2hhbmdlZCxcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHRoaXMuX2N1cnJlbnRQaW5jaERpc3RhbmNlIC8gdGhpcy5fc3RhcnRQaW5jaERpc3RhbmNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RhcnRQaW5jaERpc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgdGhpcy5fY3VycmVudFBpbmNoRGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVBpbmNoR2VzdHVyZUV2ZW50RGF0YSg8UGluY2hHZXN0dXJlRXZlbnREYXRhPntcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEdlc3R1cmVTdGF0ZVR5cGVzLmVuZGVkLFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogdGhpcy5fY3VycmVudFBpbmNoRGlzdGFuY2UgLyB0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGFydFBpbmNoRGlzdGFuY2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3VycmVudFBpbmNoRGlzdGFuY2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwcml2YXRlIF9zY3JhdGNoRnJ1c3R1bSA9IG5ldyBBcmdvbi5DZXNpdW0uUGVyc3BlY3RpdmVGcnVzdHVtO1xuICAgIHByaXZhdGUgX2VmZmVjdGl2ZVpvb21GYWN0b3I6bnVtYmVyO1xuICAgIHNldHVwSW50ZXJuYWxTZXNzaW9uKHNlc3Npb246QXJnb24uU2Vzc2lvblBvcnQpIHtcbiAgICAgICAgc3VwZXIuc2V0dXBJbnRlcm5hbFNlc3Npb24oc2Vzc2lvbik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJTZXR0aW5nIHVwIFZ1Zm9yaWEgdmlld2VyIHNlc3Npb25cIik7XG5cbiAgICAgICAgdnVmb3JpYS52aWRlb1ZpZXcucGFyZW50Lm9uKEdlc3R1cmVUeXBlcy5waW5jaCwgdGhpcy5faGFuZGxlUGluY2hHZXN0dXJlRXZlbnREYXRhLCB0aGlzKTtcblxuICAgICAgICBzZXNzaW9uLm9uWydhci52aWV3LnVpZXZlbnQnXSA9ICh1aWV2ZW50OkRPTVRvdWNoRXZlbnQpID0+IHsgXG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVGb3J3YXJkZWRET01Ub3VjaEV2ZW50RGF0YSh1aWV2ZW50KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzdWJ2aWV3czpBcmdvbi5TZXJpYWxpemVkU3Vidmlld0xpc3QgPSBbXTtcblxuICAgICAgICBjb25zdCBmcmFtZVN0YXRlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG92ZXJyaWRlVXNlcjogdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVtb3ZlID0gdGhpcy5fZGV2aWNlU2VydmljZS5mcmFtZVN0YXRlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoZnJhbWVTdGF0ZSk9PntcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ByZXNlbnRpbmcgfHwgIXNlc3Npb24uaXNDb25uZWN0ZWQpIHJldHVybjtcblxuICAgICAgICAgICAgQXJnb24uU2VyaWFsaXplZFN1YnZpZXdMaXN0LmNsb25lKGZyYW1lU3RhdGUuc3Vidmlld3MsIHN1YnZpZXdzKTtcblxuICAgICAgICAgICAgaWYgKCFmcmFtZVN0YXRlLnN0cmljdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3IgPSBNYXRoLmFicyh0aGlzLl96b29tRmFjdG9yIC0gMSkgPCAwLjA1ID8gMSA6IHRoaXMuX3pvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnZpZXdzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnN0IGZydXN0dW0gPSBBcmdvbi5kZWNvbXBvc2VQZXJzcGVjdGl2ZVByb2plY3Rpb25NYXRyaXgocy5wcm9qZWN0aW9uTWF0cml4LCB0aGlzLl9zY3JhdGNoRnJ1c3R1bSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZydXN0dW0uZm92ID0gMiAqIE1hdGguYXRhbihNYXRoLnRhbihmcnVzdHVtLmZvdiAqIDAuNSkgLyB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXJnb24uQ2VzaXVtLk1hdHJpeDQuY2xvbmUoZnJ1c3R1bS5wcm9qZWN0aW9uTWF0cml4LCBzLnByb2plY3Rpb25NYXRyaXgpO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbMF0gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzFdICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIHMucHJvamVjdGlvbk1hdHJpeFsyXSAqPSB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbM10gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzRdICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIHMucHJvamVjdGlvbk1hdHJpeFs1XSAqPSB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBzLnByb2plY3Rpb25NYXRyaXhbNl0gKj0gdGhpcy5fZWZmZWN0aXZlWm9vbUZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgcy5wcm9qZWN0aW9uTWF0cml4WzddICo9IHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lZmZlY3RpdmVab29tRmFjdG9yID0gMTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gYXBwbHkgdGhlIHByb2plY3Rpb24gc2NhbGVcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpICYmIHZ1Zm9yaWEuYXBpLnNldFNjYWxlRmFjdG9yKHRoaXMuX2VmZmVjdGl2ZVpvb21GYWN0b3IpO1xuXG4gICAgICAgICAgICAvLyBjb25maWd1cmUgdmlkZW9cbiAgICAgICAgICAgIGNvbnN0IHZpZXdwb3J0ID0gZnJhbWVTdGF0ZS52aWV3cG9ydDtcbiAgICAgICAgICAgIHZ1Zm9yaWEuYXBpICYmICh0aGlzLl92dWZvcmlhU2VydmljZVByb3ZpZGVyIGFzIE5hdGl2ZXNjcmlwdFZ1Zm9yaWFTZXJ2aWNlUHJvdmlkZXIpXG4gICAgICAgICAgICAgICAgLmNvbmZpZ3VyZVZ1Zm9yaWFWaWRlb0JhY2tncm91bmQodmlld3BvcnQsIHRoaXMuaXNQcmVzZW50aW5nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0VXNlciA9IHRoaXMuX2NvbnRleHRTZXJ2aWNlLnVzZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlVXNlciA9IHRoaXMuX2RldmljZVNlcnZpY2UudXNlcjtcbiAgICAgICAgICAgICAgICAoY29udGV4dFVzZXIucG9zaXRpb24gYXMgQXJnb24uQ2VzaXVtLkNvbnN0YW50UG9zaXRpb25Qcm9wZXJ0eSkuc2V0VmFsdWUoQXJnb24uQ2VzaXVtLkNhcnRlc2lhbjMuWkVSTywgZGV2aWNlVXNlcik7XG4gICAgICAgICAgICAgICAgKGNvbnRleHRVc2VyLm9yaWVudGF0aW9uIGFzIEFyZ29uLkNlc2l1bS5Db25zdGFudFByb3BlcnR5KS5zZXRWYWx1ZShBcmdvbi5DZXNpdW0uUXVhdGVybmlvbi5JREVOVElUWSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0RnJhbWVTdGF0ZSA9IHRoaXMuX2RldmljZVNlcnZpY2UuY3JlYXRlQ29udGV4dEZyYW1lU3RhdGUoXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lU3RhdGUudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVTdGF0ZS52aWV3cG9ydCxcbiAgICAgICAgICAgICAgICAgICAgc3Vidmlld3MsXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lU3RhdGVPcHRpb25zXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2FyLnJlYWxpdHkuZnJhbWVTdGF0ZScsIGNvbnRleHRGcmFtZVN0YXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICByZW1vdmUoKTtcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbkFyZ29uLkRJLmluamVjdChBcmdvbi5TZXNzaW9uU2VydmljZSwgQXJnb24uVmlld1NlcnZpY2UsIClcbmV4cG9ydCBjbGFzcyBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyIGV4dGVuZHMgQXJnb24uSG9zdGVkUmVhbGl0eVZpZXdlciB7XG5cbiAgICBwdWJsaWMgd2ViVmlldyA9IG5ldyBBcmdvbldlYlZpZXc7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXNzaW9uU2VydmljZSwgdmlld1NlcnZpY2UsIHB1YmxpYyB1cmk6c3RyaW5nKSB7XG4gICAgICAgIHN1cGVyKHNlc3Npb25TZXJ2aWNlLCB2aWV3U2VydmljZSwgdXJpKTtcbiAgICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMud2ViVmlldy5pb3MpIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgdXNlciBuYXZpZ2F0aW9uIG9mIHRoZSByZWFsaXR5IHZpZXdcbiAgICAgICAgICAgICh0aGlzLndlYlZpZXcuaW9zIGFzIFdLV2ViVmlldykuYWxsb3dzQmFja0ZvcndhcmROYXZpZ2F0aW9uR2VzdHVyZXMgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMud2ViVmlldy5vbignc2Vzc2lvbicsIChkYXRhOlNlc3Npb25FdmVudERhdGEpPT57XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gZGF0YS5zZXNzaW9uO1xuICAgICAgICAgICAgc2Vzc2lvbi5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0RXZlbnQucmFpc2VFdmVudChzZXNzaW9uKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnByZXNlbnRDaGFuZ2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICB0aGlzLndlYlZpZXcudmlzaWJpbGl0eSA9IHRoaXMuaXNQcmVzZW50aW5nID8gZW51bXMuVmlzaWJpbGl0eS52aXNpYmxlIDogZW51bXMuVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGxvYWQoKTp2b2lkIHtcbiAgICAgICAgY29uc3QgdXJsOnN0cmluZyA9IHRoaXMudXJpO1xuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gdGhpcy53ZWJWaWV3O1xuICAgICAgICBpZiAod2ViVmlldy5zcmMgPT09IHVybCkgd2ViVmlldy5yZWxvYWQoKTtcbiAgICAgICAgZWxzZSB3ZWJWaWV3LnNyYyA9IHVybDtcbiAgICB9XG5cbiAgICBkZXN0cm95KCkge1xuICAgICAgICB0aGlzLndlYlZpZXcuc2Vzc2lvbiAmJiB0aGlzLndlYlZpZXcuc2Vzc2lvbi5jbG9zZSgpO1xuICAgIH1cbn07Il19