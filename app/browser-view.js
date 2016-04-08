"use strict";
var color_1 = require('color');
var grid_layout_1 = require('ui/layouts/grid-layout');
var argon_web_view_1 = require('argon-web-view');
var enums_1 = require('ui/enums');
var gestures_1 = require('ui/gestures');
var util_1 = require('./util');
var vuforia = require('nativescript-vuforia');
var Argon = require('argon');
var fs = require('file-system');
var OVERVIEW_ANIMATION_DURATION = 250;
var DEFAULT_REALITY_HTML = "default-reality.html";
var APP_FOLDER = fs.knownFolders.currentApp().path;
var DEFAULT_REALITY_PATH = fs.path.join(APP_FOLDER, DEFAULT_REALITY_HTML);
var BrowserView = (function (_super) {
    __extends(BrowserView, _super);
    function BrowserView() {
        _super.call(this);
        var realityHtml = fs.File.fromPath(DEFAULT_REALITY_PATH);
        this.zHeap = [];
        this.realityLayer = this.addLayer();
        this.realityLayer.isRealityLayer = true;
        this.realityLayer.src = realityHtml.readTextSync();
        this.backgroundColor = new color_1.Color("#555");
        this.overview = {
            active: false,
            animating: false,
            cleanup: [],
        };
        // Make a new layer to be used with the url bar.
        this._setFocussedLayer(this.addLayer());
    }
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        // Put things in a grid layout to be able to decorate later.
        var container = new grid_layout_1.GridLayout();
        container.horizontalAlignment = 'stretch';
        container.verticalAlignment = 'stretch';
        // Make an argon-enabled webview
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
        // Keep track of how z it is
        this.zHeap.push(this.zHeap.length);
        container.addChild(layer);
        this.addChild(container);
        this._setFocussedLayer(layer);
        return layer;
    };
    BrowserView.prototype.focusAndSyncHeap = function (index) {
        var oldDepth = this.zHeap[index];
        for (var i = 0; i < this.zHeap.length; i += 1) {
            if (this.zHeap[i] > oldDepth) {
                this.zHeap[i] -= 1;
            }
        }
        this.zHeap[index] = this.zHeap.length - 1;
    };
    BrowserView.prototype.getLayers = function () {
        var layers = [];
        for (var i = 0; i < this.getChildrenCount(); i += 1) {
            var view = this.getChildAt(i);
            if (view instanceof grid_layout_1.GridLayout) {
                layers.push(view);
            }
        }
        return layers;
    };
    BrowserView.overviewOffset = function (depth) {
        return {
            x: 0,
            y: depth > 0 ? depth * depth * 200 : 0,
        };
    };
    ;
    BrowserView.overviewScale = function (depth) {
        var factor = 1 + (depth - 1.5) * 0.15;
        return {
            x: factor,
            y: factor,
        };
    };
    ;
    BrowserView.depths = function (index, max) {
        var initial = (index + 1) / 2 - (max / 2) + 1;
        return {
            min: -2 + initial,
            current: initial,
            max: initial + max / 2,
        };
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
        // TODO: do not hardcode pixel values, use percents?
        // Do not start if we're already doing this.
        if (this.overview.animating || this.overview.active) {
            return;
        }
        // Mark us as doing work.
        this.overview.animating = true;
        setTimeout(function () {
            _this.overview.animating = false;
        }, OVERVIEW_ANIMATION_DURATION);
        // Mark as active
        this.overview.active = true;
        this.overview.cleanup.push(function () {
            _this.overview.active = false;
        });
        // Store depths
        var depths = [];
        // Get all layers
        var layers = this.getLayers();
        // For transparent webviews, add a little bit of opacity
        layers.forEach(function (layer) {
            layer.animate({
                backgroundColor: new color_1.Color(128, 255, 255, 255),
                duration: OVERVIEW_ANIMATION_DURATION,
            });
        });
        this.overview.cleanup.push(function () {
            layers.forEach(function (layer) {
                layer.animate({
                    backgroundColor: new color_1.Color(0, 255, 255, 255),
                    duration: OVERVIEW_ANIMATION_DURATION,
                });
            });
        });
        // Assign individual layers
        for (var i = 0; i < layers.length; i += 1) {
            depths.push(BrowserView.depths(this.zHeap[i], layers.length));
        }
        // Update for the first time & animate.
        for (var i = 0; i < layers.length; i += 1) {
            layers[i].animate({
                translate: BrowserView.overviewOffset(depths[i].current),
                scale: BrowserView.overviewScale(depths[i].current),
                duration: OVERVIEW_ANIMATION_DURATION,
                curve: enums_1.AnimationCurve.easeOut,
            });
        }
        // Animation to hide the overview
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
        // Update and render
        var pastY = 0;
        var touchHandle = function (y, action, view) {
            // NOTE: relies on layer's internal structure.
            var nextY = y + view.parent.translateY;
            var deltaY = nextY - pastY;
            pastY = nextY;
            if (action === "up" || action === "down") {
                return;
            }
            // "Re-render" all layers
            for (var i = 0; i < layers.length; i += 1) {
                // Calculate new positions
                var depth = depths[i];
                depth.current += deltaY * 0.005;
                if (depth.current > depth.max) {
                    depth.current = depth.max;
                }
                else if (depth.current < depth.min) {
                    depth.current = depth.min;
                }
                var layer = layers[i];
                var offset = BrowserView.overviewOffset(depth.current);
                var scale = BrowserView.overviewScale(depth.current);
                // Set those positions
                layer.scaleX = scale.x;
                layer.scaleY = scale.y;
                layer.translateX = offset.x;
                layer.translateY = offset.y;
            }
            ;
        };
        // Watch for panning, add gesture
        var _loop_1 = function(i) {
            var layer = layers[i];
            // Cover the webview to detect gestures and disable interaction
            var gestureCover = new grid_layout_1.GridLayout();
            gestureCover.horizontalAlignment = 'stretch';
            gestureCover.verticalAlignment = 'stretch';
            gestureCover.on(gestures_1.GestureTypes.touch, function (event) {
                touchHandle(event.getY(), event.action, event.view);
            });
            gestureCover.on(gestures_1.GestureTypes.tap, function (event) {
                // Get the webview that was tapped
                // NOTE: relies on layer's internal structure.
                var container = event.view.parent;
                var argonView = container.getChildAt(0);
                _this._setFocussedLayer(argonView);
                _this.focusAndSyncHeap(i);
                util_1.Util.bringToFront(container);
                _this.hideOverview();
            });
            layer.addChild(gestureCover);
            // remove gesture cover and listeners
            this_1.overview.cleanup.push(function () {
                gestureCover.off(gestures_1.GestureTypes.touch);
                gestureCover.off(gestures_1.GestureTypes.tap);
                layer.removeChild(gestureCover);
            });
        };
        var this_1 = this;
        for (var i = 0; i < layers.length; i += 1) {
            _loop_1(i);
        }
        // Be able to drag on black
        this.on(gestures_1.GestureTypes.touch, function (event) {
            touchHandle(event.getY(), event.action, event.view);
        });
        this.overview.cleanup.push(function () {
            _this.off(gestures_1.GestureTypes.pan);
        });
    };
    BrowserView.prototype.hideOverview = function () {
        var _this = this;
        // Do not start if we're already doing this.
        if (this.overview.animating || !this.overview.active) {
            return;
        }
        // Mark us as doing work.
        this.overview.animating = true;
        setTimeout(function () {
            _this.overview.animating = false;
        }, OVERVIEW_ANIMATION_DURATION);
        this.overview.cleanup.forEach(function (task) {
            task();
        });
        this.overview.cleanup = [];
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