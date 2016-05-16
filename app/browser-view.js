"use strict";
var scroll_view_1 = require('ui/scroll-view');
var color_1 = require('color');
var grid_layout_1 = require('ui/layouts/grid-layout');
var label_1 = require('ui/label');
var button_1 = require('ui/button');
var argon_web_view_1 = require('argon-web-view');
var enums_1 = require('ui/enums');
var gestures_1 = require('ui/gestures');
var util_1 = require('./util');
var vuforia = require('nativescript-vuforia');
var Argon = require('argon');
var TITLE_BAR_HEIGHT = 30;
var OVERVIEW_VERTICAL_PADDING = 150;
var OVERVIEW_ANIMATION_DURATION = 250;
var DEFAULT_REALITY_HTML = "~/default-reality.html";
var BrowserView = (function (_super) {
    __extends(BrowserView, _super);
    function BrowserView() {
        _super.call(this);
        this.videoView = vuforia.videoView;
        this.scrollView = new scroll_view_1.ScrollView;
        this.layerContainer = new grid_layout_1.GridLayout;
        this.layers = [];
        this._overviewEnabled = false;
        this._scrollOffset = 0;
        this._panStartOffset = 0;
        this._lastTime = Date.now();
        this.realityLayer = this.addLayer();
        this.realityLayer.webView.src = DEFAULT_REALITY_HTML;
        if (vuforia.api) {
            this.realityLayer.webView.style.visibility = 'collapsed';
        }
        this.videoView.horizontalAlignment = 'stretch';
        this.videoView.verticalAlignment = 'stretch';
        this.realityLayer.container.addChild(this.videoView);
        util_1.Util.bringToFront(this.realityLayer.webView);
        util_1.Util.bringToFront(this.realityLayer.touchOverlay);
        util_1.Util.bringToFront(this.realityLayer.titleBar);
        this.layerContainer.horizontalAlignment = 'stretch';
        this.layerContainer.verticalAlignment = 'top';
        this.scrollView.horizontalAlignment = 'stretch';
        this.scrollView.verticalAlignment = 'stretch';
        this.scrollView.content = this.layerContainer;
        this.addChild(this.scrollView);
        this.backgroundColor = new color_1.Color("#555");
        this.scrollView.on(scroll_view_1.ScrollView.scrollEvent, this._animate.bind(this));
        // Make a new layer to be used with the url bar.
        this._setFocussedLayer(this.addLayer());
    }
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        var layer;
        // Put things in a grid layout to be able to decorate later.
        var container = new grid_layout_1.GridLayout();
        container.horizontalAlignment = 'left';
        container.verticalAlignment = 'top';
        // Make an argon-enabled webview
        var webView = new argon_web_view_1.ArgonWebView;
        webView.on('propertyChange', function (eventData) {
            if (eventData.propertyName === 'url' && webView === _this.focussedLayer.webView) {
                _this._setURL(eventData.value);
            }
        });
        webView.on('sessionConnect', function (eventData) {
            var session = eventData.session;
            if (webView === _this.focussedLayer.webView) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }
        });
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        // Cover the webview to detect gestures and disable interaction
        var touchOverlay = new grid_layout_1.GridLayout();
        touchOverlay.style.visibility = 'collapsed';
        touchOverlay.horizontalAlignment = 'stretch';
        touchOverlay.verticalAlignment = 'stretch';
        touchOverlay.on(gestures_1.GestureTypes.tap, function (event) {
            _this._setFocussedLayer(layer);
            if (layer !== _this.realityLayer) {
                _this.layers.splice(_this.layers.indexOf(layer), 1);
                _this.layers.push(layer);
                util_1.Util.bringToFront(container);
            }
            _this.hideOverview();
        });
        var titleBar = new grid_layout_1.GridLayout();
        titleBar.addRow(new grid_layout_1.ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.addColumn(new grid_layout_1.ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.addColumn(new grid_layout_1.ItemSpec(1, 'star'));
        titleBar.addColumn(new grid_layout_1.ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.verticalAlignment = enums_1.VerticalAlignment.top;
        titleBar.horizontalAlignment = enums_1.HorizontalAlignment.stretch;
        titleBar.backgroundColor = new color_1.Color(240, 255, 255, 255);
        titleBar.visibility = enums_1.Visibility.collapse;
        var closeButton = new button_1.Button();
        closeButton.horizontalAlignment = enums_1.HorizontalAlignment.stretch;
        closeButton.verticalAlignment = enums_1.VerticalAlignment.stretch;
        closeButton.text = 'close';
        closeButton.className = 'material-icon';
        closeButton.style.fontSize = 16;
        closeButton.color = new color_1.Color('black');
        grid_layout_1.GridLayout.setRow(closeButton, 0);
        grid_layout_1.GridLayout.setColumn(closeButton, 0);
        closeButton.on('tap', function () {
            _this.removeLayer(layer);
        });
        var label = new label_1.Label();
        label.horizontalAlignment = enums_1.HorizontalAlignment.stretch;
        label.verticalAlignment = enums_1.VerticalAlignment.stretch;
        label.textAlignment = enums_1.TextAlignment.center;
        label.color = new color_1.Color('black');
        label.fontSize = 14;
        grid_layout_1.GridLayout.setRow(label, 0);
        grid_layout_1.GridLayout.setColumn(label, 1);
        titleBar.addChild(closeButton);
        titleBar.addChild(label);
        label.bind({
            sourceProperty: 'title',
            targetProperty: 'text'
        }, webView);
        container.addChild(webView);
        container.addChild(touchOverlay);
        container.addChild(titleBar);
        this.layerContainer.addChild(container);
        layer = {
            container: container,
            webView: webView,
            touchOverlay: touchOverlay,
            titleBar: titleBar,
            label: label,
            visualIndex: this.layers.length
        };
        this.layers.push(layer);
        this._setFocussedLayer(layer);
        return layer;
    };
    BrowserView.prototype.removeLayerAtIndex = function (index) {
        var layer = this.layers[index];
        if (typeof layer === 'undefined')
            throw new Error('Expected layer at index ' + index);
        this.layers.splice(index, 1);
        this.layerContainer.removeChild(layer.container); // for now
    };
    BrowserView.prototype.removeLayer = function (layer) {
        var index = this.layers.indexOf(layer);
        this.removeLayerAtIndex(index);
    };
    BrowserView.prototype.onLayout = function (left, top, right, bottom) {
        _super.prototype.onLayout.call(this, left, top, right, bottom);
        if (this._overviewEnabled)
            return;
        var width = this.getMeasuredWidth();
        var height = this.getMeasuredHeight();
        this.scrollView.layout(0, 0, width, height);
        this.layerContainer.layout(0, 0, width, height);
        this.layers.forEach(function (layer) {
            layer.container.layout(0, 0, width, height);
            layer.webView.layout(0, 0, width, height);
        });
        this.videoView.layout(0, 0, width, height);
        console.log('DID LAYOUT');
    };
    BrowserView.prototype._calculateTargetTransform = function (index) {
        var layerPosition = index * OVERVIEW_VERTICAL_PADDING - this.scrollView.verticalOffset;
        var normalizedPosition = layerPosition / this.getMeasuredHeight();
        var theta = Math.min(Math.max(normalizedPosition, 0), 0.85) * Math.PI;
        var scaleFactor = 1 - (Math.cos(theta) / 2 + 0.5) * 0.25;
        return {
            translate: {
                x: 0,
                y: index * OVERVIEW_VERTICAL_PADDING
            },
            scale: {
                x: scaleFactor,
                y: scaleFactor
            }
        };
    };
    BrowserView.prototype._animate = function () {
        var _this = this;
        if (!this._overviewEnabled)
            return;
        var now = Date.now();
        var deltaT = Math.min(now - this._lastTime, 30) / 1000;
        this._lastTime = now;
        this.layerContainer.width = this.getMeasuredWidth();
        this.layerContainer.height = this.getMeasuredHeight() + OVERVIEW_VERTICAL_PADDING * (this.layers.length - 1);
        this.layers.forEach(function (layer, index) {
            layer.visualIndex = _this._lerp(layer.visualIndex, index, deltaT * 4);
            var transform = _this._calculateTargetTransform(layer.visualIndex);
            layer.container.width = _this.getMeasuredWidth();
            layer.container.height = _this.getMeasuredHeight();
            layer.container.scaleX = transform.scale.x;
            layer.container.scaleY = transform.scale.y;
            layer.container.translateX = transform.translate.x;
            layer.container.translateY = transform.translate.y;
        });
    };
    BrowserView.prototype._lerp = function (a, b, t) {
        return a + (b - a) * t;
    };
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
        if (this._overviewEnabled)
            return;
        this._overviewEnabled = true;
        this.layers.forEach(function (layer, index) {
            if (layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = true;
            layer.touchOverlay.style.visibility = 'visible';
            // For transparent webviews, add a little bit of opacity
            layer.container.animate({
                backgroundColor: new color_1.Color(128, 255, 255, 255),
                duration: OVERVIEW_ANIMATION_DURATION,
            });
            // Show titlebars
            layer.titleBar.visibility = enums_1.Visibility.visible;
            layer.titleBar.animate({
                opacity: 1,
                duration: OVERVIEW_ANIMATION_DURATION
            });
            // Update for the first time & animate.
            var _a = _this._calculateTargetTransform(index), translate = _a.translate, scale = _a.scale;
            layer.container.animate({
                translate: translate,
                scale: scale,
                duration: OVERVIEW_ANIMATION_DURATION,
                curve: enums_1.AnimationCurve.easeOut,
            });
        });
        this.scrollView.scrollToVerticalOffset(0, true);
        // animate the views
        this._intervalId = setInterval(this._animate.bind(this), 20);
    };
    BrowserView.prototype.hideOverview = function () {
        var _this = this;
        if (!this._overviewEnabled)
            return;
        this._overviewEnabled = false;
        var animations = this.layers.map(function (layer, index) {
            if (layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = false;
            layer.touchOverlay.style.visibility = 'collapsed';
            // For transparent webviews, add a little bit of opacity
            layer.container.animate({
                backgroundColor: new color_1.Color(0, 255, 255, 255),
                duration: OVERVIEW_ANIMATION_DURATION,
            });
            // Hide titlebars
            layer.titleBar.animate({
                opacity: 0,
                duration: OVERVIEW_ANIMATION_DURATION
            }).then(function () {
                layer.titleBar.visibility = enums_1.Visibility.collapse;
            });
            // Update for the first time & animate.
            layer.visualIndex = index;
            return layer.container.animate({
                translate: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                duration: OVERVIEW_ANIMATION_DURATION,
                curve: enums_1.AnimationCurve.easeOut,
            });
        });
        Promise.all(animations).then(function () {
            _this.layerContainer.height = _this.getMeasuredHeight();
            _this.scrollView.scrollToVerticalOffset(0, false);
        });
        this.scrollView.scrollToVerticalOffset(0, true);
        setTimeout(function () {
            _this.scrollView.scrollToVerticalOffset(0, true);
        }, 30);
        // stop animating the views
        clearInterval(this._intervalId);
        this._intervalId = null;
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