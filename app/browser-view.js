"use strict";
var color_1 = require('color');
var grid_layout_1 = require('ui/layouts/grid-layout');
var argon_web_view_1 = require('argon-web-view');
var enums_1 = require('ui/enums');
var gestures_1 = require('ui/gestures');
var util_1 = require('./util');
var placeholder_1 = require('ui/placeholder');
var vuforia = require('nativescript-vuforia');
var Argon = require('argon');
var OVERVIEW_ANIMATION_DURATION = 250;
var DEFAULT_REALITY_HTML = "~/default-reality.html";
var BrowserView = (function (_super) {
    __extends(BrowserView, _super);
    function BrowserView() {
        _super.call(this);
        this.layerContainer = new grid_layout_1.GridLayout;
        this.layers = [];
        this._overviewEnabled = false;
        this._scrollOffset = 0;
        this._panStartOffset = 0;
        this.realityLayer = this.addLayer();
        this.realityLayer.webView.src = DEFAULT_REALITY_HTML;
        if (vuforia.ios) {
            this.realityLayer.webView.style.visibility = 'collapsed';
        }
        var videoView = new placeholder_1.Placeholder();
        videoView.on(placeholder_1.Placeholder.creatingViewEvent, function (evt) {
            evt.view = vuforia.ios || vuforia.android || null;
        });
        videoView.horizontalAlignment = 'stretch';
        videoView.verticalAlignment = 'stretch';
        this.realityLayer.container.addChild(videoView);
        util_1.Util.bringToFront(this.realityLayer.webView);
        util_1.Util.bringToFront(this.realityLayer.gestureCover);
        this.layerContainer.horizontalAlignment = 'stretch';
        this.layerContainer.verticalAlignment = 'stretch';
        this.addChild(this.layerContainer);
        this.backgroundColor = new color_1.Color("#555");
        this._setFocussedLayer(this.addLayer());
    }
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        var layer;
        var container = new grid_layout_1.GridLayout();
        container.horizontalAlignment = 'stretch';
        container.verticalAlignment = 'stretch';
        container.backgroundColor = new color_1.Color(255, 255, 255, 255);
        var webView = new argon_web_view_1.ArgonWebView;
        webView.on('propertyChange', function (eventData) {
            if (eventData.propertyName === 'url' && webView === _this.focussedLayer.webView) {
                _this._setURL(eventData.value);
            }
        });
        var whiteningTimeout;
        webView.on('sessionConnect', function (eventData) {
            var session = eventData.session;
            if (webView === _this.focussedLayer.webView) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }
            container.backgroundColor = new color_1.Color(0, 255, 255, 255);
            clearTimeout(whiteningTimeout);
        });
        webView.on(argon_web_view_1.ArgonWebView.loadFinishedEvent, function () {
            whiteningTimeout = setTimeout(function () {
                container.backgroundColor = new color_1.Color(255, 255, 255, 255);
            }, 500);
        });
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        var gestureCover = new grid_layout_1.GridLayout();
        gestureCover.style.visibility = 'collapsed';
        gestureCover.horizontalAlignment = 'stretch';
        gestureCover.verticalAlignment = 'stretch';
        gestureCover.on(gestures_1.GestureTypes.tap, function (event) {
            _this._setFocussedLayer(layer);
            if (layer !== _this.realityLayer) {
                _this.layers.splice(_this.layers.indexOf(layer), 1);
                _this.layers.push(layer);
                util_1.Util.bringToFront(container);
            }
            _this.hideOverview();
        });
        container.addChild(webView);
        container.addChild(gestureCover);
        this.layerContainer.addChild(container);
        layer = {
            container: container,
            webView: webView,
            gestureCover: gestureCover
        };
        this.layers.push(layer);
        this._setFocussedLayer(layer);
        return layer;
    };
    BrowserView.prototype.handlePan = function (evt) {
        if (evt.state === gestures_1.GestureStateTypes.began) {
            this._panStartOffset = this._scrollOffset;
        }
        this._scrollOffset = this._panStartOffset + evt.deltaY;
        this.updateLayerTransforms();
    };
    BrowserView.prototype.calculateLayerTransform = function (index) {
        var layerPosition = index * 200 + this._scrollOffset;
        var normalizedPosition = layerPosition / this.getMeasuredHeight();
        var theta = Math.min(Math.max(normalizedPosition + 0.2, 0), 0.85) * Math.PI;
        var scaleFactor = 1 - (Math.cos(theta) / 2 + 0.5) * 0.2;
        return {
            translate: {
                x: 0,
                y: layerPosition
            },
            scale: {
                x: scaleFactor,
                y: scaleFactor
            }
        };
    };
    BrowserView.prototype.updateLayerTransforms = function () {
        var _this = this;
        if (!this._overviewEnabled)
            return;
        this.layers.forEach(function (layer, index) {
            var transform = _this.calculateLayerTransform(index);
            layer.container.scaleX = transform.scale.x;
            layer.container.scaleY = transform.scale.y;
            layer.container.translateX = transform.translate.x;
            layer.container.translateY = transform.translate.y;
        });
    };
    ;
    BrowserView.prototype.toggleOverview = function () {
        if (this._overviewEnabled) {
            this.hideOverview();
        }
        else {
            this.showOverview();
        }
    };
    BrowserView.prototype.showOverview = function () {
        var _this = this;
        this._overviewEnabled = true;
        this.layers.forEach(function (layer, index) {
            if (layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = true;
            layer.gestureCover.style.visibility = 'visible';
            layer.gestureCover.on(gestures_1.GestureTypes.pan, _this.handlePan.bind(_this));
            if (layer.webView.session) {
                layer.container.animate({
                    backgroundColor: new color_1.Color(128, 255, 255, 255),
                    duration: OVERVIEW_ANIMATION_DURATION,
                });
            }
            var _a = _this.calculateLayerTransform(index), translate = _a.translate, scale = _a.scale;
            layer.container.animate({
                translate: translate,
                scale: scale,
                duration: OVERVIEW_ANIMATION_DURATION,
                curve: enums_1.AnimationCurve.easeOut,
            });
        });
        this.layerContainer.on(gestures_1.GestureTypes.pan, this.handlePan.bind(this));
    };
    BrowserView.prototype.hideOverview = function () {
        var _this = this;
        this._overviewEnabled = false;
        var animations = this.layers.map(function (layer, index) {
            if (layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = false;
            layer.gestureCover.style.visibility = 'collapsed';
            layer.gestureCover.off(gestures_1.GestureTypes.pan);
            if (layer.webView.session) {
                layer.container.animate({
                    backgroundColor: new color_1.Color(0, 255, 255, 255),
                    duration: OVERVIEW_ANIMATION_DURATION,
                });
            }
            return layer.container.animate({
                translate: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                duration: OVERVIEW_ANIMATION_DURATION,
                curve: enums_1.AnimationCurve.easeOut,
            });
        });
        Promise.all(animations).then(function () {
            _this._scrollOffset = 0;
        });
        this.layerContainer.off(gestures_1.GestureTypes.pan);
    };
    BrowserView.prototype._setURL = function (url) {
        if (this._url !== url) {
            this._url = url;
            this.notifyPropertyChange('url', url);
        }
    };
    Object.defineProperty(BrowserView.prototype, "url", {
        get: function () {
            return this._url;
        },
        enumerable: true,
        configurable: true
    });
    BrowserView.prototype._setFocussedLayer = function (layer) {
        if (this._focussedLayer !== layer) {
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            this._setURL(layer.webView.url);
            console.log("Set focussed layer: " + layer.webView.url);
            Argon.ArgonSystem.instance.focus.setSession(layer.webView.session);
        }
    };
    Object.defineProperty(BrowserView.prototype, "focussedLayer", {
        get: function () {
            return this._focussedLayer;
        },
        enumerable: true,
        configurable: true
    });
    return BrowserView;
}(grid_layout_1.GridLayout));
exports.BrowserView = BrowserView;
//# sourceMappingURL=browser-view.js.map