"use strict";
var Argon = require("@argonjs/argon");
var vuforia = require("nativescript-vuforia");
var enums = require("ui/enums");
var argon_web_view_1 = require("argon-web-view");
var gestures_1 = require("ui/gestures");
var NativescriptLiveRealityViewer = (function (_super) {
    __extends(NativescriptLiveRealityViewer, _super);
    function NativescriptLiveRealityViewer(sessionService, viewService, _deviceService, _vuforiaDelegate, uri) {
        var _this = _super.call(this, sessionService, viewService, _deviceService, uri) || this;
        _this._deviceService = _deviceService;
        _this._vuforiaDelegate = _vuforiaDelegate;
        _this.videoView = vuforia.videoView;
        _this._zoomFactor = 1;
        _this._scratchTouchPos1 = new Argon.Cesium.Cartesian2;
        _this._scratchTouchPos2 = new Argon.Cesium.Cartesian2;
        _this._scratchFrustum = new Argon.Cesium.PerspectiveFrustum;
        _this.presentChangeEvent.addEventListener(function () {
            _this.videoView.visibility = _this.isPresenting ? enums.Visibility.visible : enums.Visibility.collapse;
        });
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
            if (this._startPinchDistance !== undefined) {
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
        var remove = this._vuforiaDelegate.stateUpdateEvent.addEventListener(function (time) {
            if (_this.isPresenting) {
                var device = _this._deviceService;
                device.update();
                Argon.SerializedSubviewList.clone(device.subviews, subviews);
                if (!subviews.length)
                    return;
                if (!device.strictSubviews) {
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
                vuforia.api.setScaleFactor(_this._effectiveZoomFactor);
                // configure video
                _this._vuforiaDelegate.configureVuforiaVideoBackground(device.viewport, _this.isPresenting);
                var viewState = {
                    time: time,
                    subviews: subviews,
                    pose: Argon.getSerializedEntityPose(_this._deviceService.eye, time),
                    viewport: device.viewport,
                    compassAccuracy: device.compassAccuracy,
                    verticalAccuracy: device.verticalAccuracy,
                    horizontalAccuracy: device.horizontalAccuracy
                };
                session.send('ar.reality.viewState', viewState);
            }
        });
        session.closeEvent.addEventListener(function () { return remove(); });
    };
    return NativescriptLiveRealityViewer;
}(Argon.LiveRealityViewer));
NativescriptLiveRealityViewer = __decorate([
    Argon.DI.inject(Argon.SessionService, Argon.ViewService, Argon.DeviceService, Argon.VuforiaServiceManager)
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
//# sourceMappingURL=argon-reality-viewers.js.map