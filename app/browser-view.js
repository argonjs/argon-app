"use strict";
var color_1 = require("color");
var grid_layout_1 = require('ui/layouts/grid-layout');
var argon_web_view_1 = require('argon-web-view');
var enums_1 = require("ui/enums");
var gestures_1 = require("ui/gestures");
var vuforia = require('nativescript-vuforia');
var Argon = require('argon');
var OVERVIEW_ANIMATION_DURATION = 250;
var BrowserView = (function (_super) {
    __extends(BrowserView, _super);
    function BrowserView() {
        _super.call(this);
        this.inOverview = false;
        this.realityLayer = this.addLayer();
        this.realityLayer.isRealityLayer = true;
        this.realityLayer.url = "http://elixir-lang.org/";
        this.backgroundColor = new color_1.Color("#000");
        this.overview = {
            active: false,
            cleanup: [],
        };
        var layer1 = this.addLayer();
        layer1.url = "http://google.com";
        var layer2 = this.addLayer();
        layer2.url = "http://m.reddit.com";
        var layer3 = this.addLayer();
        layer3.url = "http://rust-lang.org";
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
    BrowserView.prototype.toggleOverview = function () {
        if (this.overview.active) {
            this.hideOverview();
        }
        else {
            this.showOverview();
        }
    };
    BrowserView.prototype.showOverview = function () {
        var _this = this;
        // Mark as active
        this.overview.active = true;
        this.overview.cleanup.push(function () {
            _this.overview.active = false;
        });
        // Hide reality (its too white!)
        this.realityLayer.visibility = "collapsed";
        this.overview.cleanup.push(function () {
            setTimeout(function () {
                _this.realityLayer.visibility = "visible";
            }, OVERVIEW_ANIMATION_DURATION);
        });
        // Get all layers
        var layers = this.getLayers();
        // Assign individual layers
        for (var i = 0; i < layers.length; i += 1) {
            layers[i].overviewIndex = (i + 1) / layers.length;
        }
        // Update for the first time & animate.
        BrowserView.updateOverview(layers, OVERVIEW_ANIMATION_DURATION);
        this.overview.cleanup.push(function () {
            layers.forEach(function (layer) {
                layer.animate({
                    translate: {
                        x: 0,
                        y: 0,
                    },
                    scale: {
                        x: 1,
                        y: 1,
                    },
                    duration: OVERVIEW_ANIMATION_DURATION,
                    curve: enums_1.AnimationCurve.easeOut,
                });
            });
        });
        // Watch for panning
        var pastY = 0;
        var gestureCover = new grid_layout_1.GridLayout();
        gestureCover.horizontalAlignment = 'stretch';
        gestureCover.verticalAlignment = 'stretch';
        this.addChild(gestureCover);
        gestureCover.on(gestures_1.GestureTypes.pan, function (args) {
            if (args.deltaY === 0) {
                pastY = 0;
            }
            var deltaY = args.deltaY - pastY;
            pastY = args.deltaY;
            layers.forEach(function (layer) {
                layer.overviewIndex += deltaY * 0.005;
            });
            BrowserView.updateOverview(layers, 0);
        });
        // Ability to select view
        gestureCover.on(gestures_1.GestureTypes.touch, function (args) {
            // TODO
            console.log("TOUCH");
        });
        gestureCover.on(gestures_1.GestureTypes.tap, function (args) {
            // TODO
            console.log("TAP");
        });
        this.overview.cleanup.push(function () {
            gestureCover.off(gestures_1.GestureTypes.pan);
            gestureCover.off(gestures_1.GestureTypes.tap);
            gestureCover.off(gestures_1.GestureTypes.touch);
            _this.removeChild(gestureCover);
        });
    };
    BrowserView.prototype.hideOverview = function () {
        this.overview.cleanup.forEach(function (task) {
            task();
        });
        this.overview.cleanup = [];
    };
    BrowserView.updateOverview = function (layers, duration) {
        var y_offset = function (depth) {
            return depth > 0 ? depth * depth * 200 : 0;
        };
        var scale = function (depth) {
            return Math.max(1 + (depth - 1.5) * 0.15, 0);
        };
        for (var _i = 0, layers_1 = layers; _i < layers_1.length; _i++) {
            var layer = layers_1[_i];
            layer.animate({
                translate: {
                    x: 0,
                    y: y_offset(layer.overviewIndex),
                },
                scale: {
                    x: scale(layer.overviewIndex),
                    y: scale(layer.overviewIndex),
                },
                duration: duration,
                curve: enums_1.AnimationCurve.easeOut,
            });
        }
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