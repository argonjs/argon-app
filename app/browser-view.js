"use strict";
var grid_layout_1 = require('ui/layouts/grid-layout');
var argon_web_view_1 = require('argon-web-view');
var vuforia = require('nativescript-vuforia');
var Argon = require('argon');
var BrowserView = (function (_super) {
    __extends(BrowserView, _super);
    function BrowserView() {
        _super.call(this);
        this.realityLayer = this.addLayer();
        this.realityLayer.isRealityLayer = true;
        this.addLayer();
    }
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        var layer = new argon_web_view_1.ArgonWebView;
        layer.on('propertyChange', function (eventData) {
            if (eventData.propertyName === 'url' && layer === _this.focussedLayer) {
                _this._setURL(eventData.value);
            }
        });
        layer.on('sessionConnect', function (eventData) {
            var session = eventData.session;
            if (layer === _this.focussedLayer) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }
        });
        layer.horizontalAlignment = 'stretch';
        layer.verticalAlignment = 'stretch';
        this.addChild(layer);
        this._setFocussedLayer(layer);
        return layer;
    };
    BrowserView.prototype.getLayers = function () {
        var layers = [];
        for (var i = 0; i < this.getChildrenCount(); i += 1) {
            var view = this.getChildAt(i);
            if (view instanceof argon_web_view_1.ArgonWebView && !view.isRealityLayer) {
                layers.push(view);
            }
        }
        return layers;
    };
    BrowserView.prototype.showOverview = function () {
        console.log(this.getLayers().length);
    };
    BrowserView.prototype.onLoaded = function () {
        _super.prototype.onLoaded.call(this);
        if (vuforia.ios) {
            var pageUIViewController = this.page.ios;
            var realityLayerUIView = this.realityLayer.ios;
            this.videoViewController = vuforia.ios.videoViewController;
            pageUIViewController.addChildViewController(this.videoViewController);
            realityLayerUIView.addSubview(this.videoViewController.view);
            realityLayerUIView.sendSubviewToBack(this.videoViewController.view);
        }
    };
    BrowserView.prototype.onLayout = function (left, top, right, bottom) {
        _super.prototype.onLayout.call(this, left, top, right, bottom);
        // this.videoViewController.view.setNeedsLayout();
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
            this._setURL(layer.url);
            Argon.ArgonSystem.instance.focus.setSession(layer.session);
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