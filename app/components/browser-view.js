"use strict";
var scroll_view_1 = require('ui/scroll-view');
var color_1 = require('color');
var grid_layout_1 = require('ui/layouts/grid-layout');
var label_1 = require('ui/label');
var button_1 = require('ui/button');
var argon_web_view_1 = require('argon-web-view');
var enums_1 = require('ui/enums');
var gestures_1 = require('ui/gestures');
var util_1 = require('../util');
var vuforia = require('nativescript-vuforia');
var application = require('application');
var utils = require('utils/utils');
var AppViewModel_1 = require('./common/AppViewModel');
var bookmarks_1 = require('./common/bookmarks');
var Argon = require('argon');
var TITLE_BAR_HEIGHT = 30;
var OVERVIEW_VERTICAL_PADDING = 150;
var OVERVIEW_ANIMATION_DURATION = 250;
var BrowserView = (function (_super) {
    __extends(BrowserView, _super);
    function BrowserView() {
        var _this = this;
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
        if (vuforia.api) {
            this.realityLayer.webView.style.visibility = 'collapsed';
        }
        this.realityLayer.titleBar.backgroundColor = new color_1.Color(0xFF222222);
        this.realityLayer.label.color = new color_1.Color('white');
        this.realityLayer.closeButton.visibility = 'collapsed';
        this.videoView.horizontalAlignment = 'stretch';
        this.videoView.verticalAlignment = 'stretch';
        if (this.videoView.parent)
            this.videoView.parent._removeView(this.videoView);
        this.realityLayer.container.addChild(this.videoView);
        util_1.Util.bringToFront(this.realityLayer.webView);
        util_1.Util.bringToFront(this.realityLayer.touchOverlay);
        util_1.Util.bringToFront(this.realityLayer.titleBar);
        this.layerContainer.horizontalAlignment = 'stretch';
        this.layerContainer.verticalAlignment = 'stretch';
        this.scrollView.horizontalAlignment = 'stretch';
        this.scrollView.verticalAlignment = 'stretch';
        this.scrollView.content = this.layerContainer;
        this.addChild(this.scrollView);
        this.backgroundColor = new color_1.Color("#555");
        this.scrollView.on(scroll_view_1.ScrollView.scrollEvent, this._animate.bind(this));
        // Make a new layer to be used with the url bar.
        this.addLayer();
        application.on(application.orientationChangedEvent, function () {
            _this.requestLayout();
            _this.scrollView.scrollToVerticalOffset(0, false);
        });
        Argon.ArgonSystem.instance.reality.changeEvent.addEventListener(function (_a) {
            var current = _a.current;
            var details = _this.realityLayer.details;
            if (current.type === 'live-video')
                details.set('title', 'Reality: Live Video');
            else if (current.type === 'hosted') {
                details.set('title', 'Reality: Hosted');
            }
            else {
                details.set('title', 'No Reality Loaded');
            }
            details.set('url', 'reality:' + current.type);
            details.set('isArgonChannel', true);
            details.set('supportedInteractionModes', ['page', 'immersive']);
            if (_this.realityLayer === _this.focussedLayer) {
                AppViewModel_1.appViewModel.setLayerDetails(details);
            }
        });
    }
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        var layer;
        var container = new grid_layout_1.GridLayout();
        container.horizontalAlignment = 'left';
        container.verticalAlignment = 'top';
        var webView = new argon_web_view_1.ArgonWebView;
        webView.on('propertyChange', function (eventData) {
            if (!_this.focussedLayer)
                return;
            if (webView !== _this.focussedLayer.webView)
                return;
            if (eventData.propertyName === 'url') {
                layer.details.set('url', eventData.value);
            }
            else if (eventData.propertyName === 'title') {
                var historyBookmarkItem = bookmarks_1.historyMap.get(webView.url);
                if (historyBookmarkItem) {
                    historyBookmarkItem.set('title', eventData.value);
                }
                layer.details.set('title', eventData.value);
            }
        });
        webView.on('sessionConnect', function (eventData) {
            if (!_this.focussedLayer)
                return;
            var session = eventData.session;
            if (webView === _this.focussedLayer.webView) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }
        });
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        webView.on("loadFinished", function (eventData) {
            if (!eventData.error && webView !== _this.realityLayer.webView) {
                var historyBookmarkItem = bookmarks_1.historyMap.get(eventData.url);
                if (historyBookmarkItem) {
                    bookmarks_1.historyMap.set(eventData.url, undefined);
                    bookmarks_1.historyList.unshift(historyBookmarkItem);
                }
                else {
                    bookmarks_1.historyList.unshift(new bookmarks_1.BookmarkItem({
                        url: eventData.url,
                        title: webView.title
                    }));
                }
            }
            layer.details.set('isArgonChannel', !!webView.session);
            layer.details.set('supportedInteractionModes', layer.details.isArgonChannel ?
                ['page', 'immersive'] :
                ['page']);
        });
        webView.on('sessionConnect', function () {
            layer.details.set('isArgonChannel', true);
        });
        // Cover the webview to detect gestures and disable interaction
        var touchOverlay = new grid_layout_1.GridLayout();
        touchOverlay.style.visibility = 'collapsed';
        touchOverlay.horizontalAlignment = 'stretch';
        touchOverlay.verticalAlignment = 'stretch';
        touchOverlay.on(gestures_1.GestureTypes.tap, function (event) {
            _this.setFocussedLayer(layer);
            AppViewModel_1.appViewModel.hideOverview();
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
        titleBar.opacity = 0;
        var closeButton = new button_1.Button();
        closeButton.horizontalAlignment = enums_1.HorizontalAlignment.stretch;
        closeButton.verticalAlignment = enums_1.VerticalAlignment.stretch;
        closeButton.text = 'close';
        closeButton.className = 'material-icon';
        closeButton.style.fontSize = 22;
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
        container.addChild(webView);
        container.addChild(touchOverlay);
        container.addChild(titleBar);
        this.layerContainer.addChild(container);
        layer = {
            container: container,
            webView: webView,
            touchOverlay: touchOverlay,
            titleBar: titleBar,
            closeButton: closeButton,
            label: label,
            visualIndex: this.layers.length,
            details: new AppViewModel_1.LayerDetails()
        };
        this.layers.push(layer);
        if (this.isLoaded)
            this.setFocussedLayer(layer);
        label.bind({
            targetProperty: 'text',
            sourceProperty: 'title'
        }, layer.details);
        if (this._overviewEnabled)
            this._showLayer(layer);
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
    BrowserView.prototype.onLoaded = function () {
        _super.prototype.onLoaded.call(this);
    };
    BrowserView.prototype.onMeasure = function (widthMeasureSpec, heightMeasureSpec) {
        var width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
        var height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
        if (!this._overviewEnabled) {
            this.layerContainer.width = width;
            this.layerContainer.height = height;
        }
        this.layers.forEach(function (layer) {
            layer.container.width = width;
            layer.container.height = height;
        });
        _super.prototype.onMeasure.call(this, widthMeasureSpec, heightMeasureSpec);
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
        var width = this.getMeasuredWidth();
        var height = this.getMeasuredHeight();
        var containerHeight = height + OVERVIEW_VERTICAL_PADDING * (this.layers.length - 1);
        this.layerContainer.width = width;
        this.layerContainer.height = containerHeight;
        this.layers.forEach(function (layer, index) {
            layer.visualIndex = _this._lerp(layer.visualIndex, index, deltaT * 4);
            var transform = _this._calculateTargetTransform(layer.visualIndex);
            layer.container.scaleX = transform.scale.x;
            layer.container.scaleY = transform.scale.y;
            layer.container.translateX = transform.translate.x;
            layer.container.translateY = transform.translate.y;
        });
    };
    BrowserView.prototype._lerp = function (a, b, t) {
        return a + (b - a) * t;
    };
    BrowserView.prototype._showLayer = function (layer) {
        var idx = this.layers.indexOf(layer);
        if (layer.webView.ios)
            layer.webView.ios.layer.masksToBounds = true;
        layer.touchOverlay.style.visibility = 'visible';
        // For transparent webviews, add a little bit of opacity
        layer.container.isUserInteractionEnabled = true;
        layer.container.animate({
            backgroundColor: new color_1.Color(128, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.webView.animate({
            translate: { x: 0, y: TITLE_BAR_HEIGHT },
            duration: OVERVIEW_ANIMATION_DURATION
        });
        // Show titlebars
        layer.titleBar.visibility = enums_1.Visibility.visible;
        layer.titleBar.animate({
            opacity: 1,
            duration: OVERVIEW_ANIMATION_DURATION
        });
        // Update for the first time & animate.
        var _a = this._calculateTargetTransform(idx), translate = _a.translate, scale = _a.scale;
        layer.container.animate({
            translate: translate,
            scale: scale,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: enums_1.AnimationCurve.easeInOut,
        });
    };
    BrowserView.prototype._hideLayer = function (layer) {
        var idx = this.layers.indexOf(layer);
        if (layer.webView.ios)
            layer.webView.ios.layer.masksToBounds = false;
        layer.touchOverlay.style.visibility = 'collapsed';
        // For transparent webviews, add a little bit of opacity
        layer.container.isUserInteractionEnabled = this.focussedLayer === layer;
        layer.container.animate({
            backgroundColor: new color_1.Color(0, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.webView.animate({
            translate: { x: 0, y: 0 },
            duration: OVERVIEW_ANIMATION_DURATION
        });
        // Hide titlebars
        layer.titleBar.animate({
            opacity: 0,
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(function () {
            layer.titleBar.visibility = enums_1.Visibility.collapse;
        });
        // Update for the first time & animate.
        layer.visualIndex = idx;
        return layer.container.animate({
            translate: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: enums_1.AnimationCurve.easeInOut,
        });
    };
    BrowserView.prototype.showOverview = function () {
        var _this = this;
        if (this._overviewEnabled)
            return;
        this._overviewEnabled = true;
        this.layers.forEach(function (layer) {
            _this._showLayer(layer);
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
        var animations = this.layers.map(function (layer) {
            return _this._hideLayer(layer);
        });
        Promise.all(animations).then(function () {
            _this.scrollView.scrollToVerticalOffset(0, true);
            setTimeout(function () {
                _this.scrollView.scrollToVerticalOffset(0, false);
            }, 30);
        });
        this.scrollView.scrollToVerticalOffset(0, true);
        // stop animating the views
        clearInterval(this._intervalId);
        this._intervalId = null;
    };
    BrowserView.prototype.loadUrl = function (url) {
        this.focussedLayer.webView.src = url;
        this.focussedLayer.details.set('url', url);
        this.focussedLayer.details.set('title', '');
        this.focussedLayer.details.set('isFavorite', false);
        this.focussedLayer.details.set('supportedInteractionModes', ['page', 'immersive']);
    };
    BrowserView.prototype.setFocussedLayer = function (layer) {
        if (this._focussedLayer !== layer) {
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            console.log("Set focussed layer: " + layer.details.url);
            Argon.ArgonSystem.instance.focus.setSession(layer.webView.session);
            AppViewModel_1.appViewModel.setLayerDetails(this.focussedLayer.details);
            AppViewModel_1.appViewModel.hideOverview();
            if (layer !== this.realityLayer) {
                this.layers.splice(this.layers.indexOf(layer), 1);
                this.layers.push(layer);
                util_1.Util.bringToFront(layer.container);
            }
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