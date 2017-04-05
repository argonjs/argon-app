"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var URI = require("urijs");
var scroll_view_1 = require("ui/scroll-view");
var color_1 = require("color");
var grid_layout_1 = require("ui/layouts/grid-layout");
var label_1 = require("ui/label");
var button_1 = require("ui/button");
var argon_web_view_1 = require("argon-web-view");
var web_view_1 = require("ui/web-view");
var enums_1 = require("ui/enums");
var gestures_1 = require("ui/gestures");
var util_1 = require("./common/util");
var vuforia = require("nativescript-vuforia");
var application = require("application");
var utils = require("utils/utils");
var AppViewModel_1 = require("./common/AppViewModel");
var argon_reality_viewers_1 = require("./common/argon-reality-viewers");
var bookmarks = require("./common/bookmarks");
var Argon = require("@argonjs/argon");
var TITLE_BAR_HEIGHT = 30;
var OVERVIEW_VERTICAL_PADDING = 150;
var OVERVIEW_ANIMATION_DURATION = 250;
var BrowserView = (function (_super) {
    __extends(BrowserView, _super);
    function BrowserView() {
        var _this = _super.call(this) || this;
        _this.realityWebviews = new Map();
        _this.videoView = vuforia.videoView;
        _this.scrollView = new scroll_view_1.ScrollView;
        _this.layerContainer = new grid_layout_1.GridLayout;
        _this.layers = [];
        _this._overviewEnabled = false;
        _this._lastTime = Date.now();
        _this._layerBackgroundColor = new color_1.Color(0, 255, 255, 255);
        _this.layerContainer.horizontalAlignment = 'stretch';
        _this.layerContainer.verticalAlignment = 'stretch';
        if (_this.layerContainer.ios) {
            _this.layerContainer.ios.layer.masksToBounds = false;
        }
        _this.scrollView.horizontalAlignment = 'stretch';
        _this.scrollView.verticalAlignment = 'stretch';
        _this.scrollView.content = _this.layerContainer;
        if (_this.scrollView.ios) {
            _this.scrollView.ios.layer.masksToBounds = false;
        }
        _this.addChild(_this.scrollView);
        _this.backgroundColor = new color_1.Color("#555");
        _this.scrollView.on(scroll_view_1.ScrollView.scrollEvent, _this._animate.bind(_this));
        // Create the reality layer
        _this._createRealityLayer();
        // Add a normal layer to be used with the url bar.
        _this.addLayer();
        application.on(application.orientationChangedEvent, function () {
            _this.requestLayout();
            _this.scrollView.scrollToVerticalOffset(0, false);
        });
        return _this;
    }
    BrowserView.prototype._createRealityLayer = function () {
        var _this = this;
        var layer = this._createLayer();
        layer.titleBar.backgroundColor = new color_1.Color(0xFF222222);
        layer.titleLabel.color = new color_1.Color('white');
        layer.closeButton.visibility = 'collapsed';
        if (this.videoView) {
            this.videoView.horizontalAlignment = 'stretch';
            this.videoView.verticalAlignment = 'stretch';
            if (this.videoView.parent)
                this.videoView.parent._removeView(this.videoView);
            layer.contentView.addChild(this.videoView);
        }
        AppViewModel_1.appViewModel.on('propertyChange', function (evt) {
            switch (evt.propertyName) {
                case 'overviewOpen':
                    if (AppViewModel_1.appViewModel.overviewOpen)
                        _this._showOverview();
                    else
                        _this._hideOverview();
                    break;
            }
        });
        AppViewModel_1.appViewModel.ready.then(function () {
            var manager = AppViewModel_1.appViewModel.argon;
            AppViewModel_1.appViewModel.argon.provider.reality.installedEvent.addEventListener(function (_a) {
                var viewer = _a.viewer;
                if (viewer instanceof argon_reality_viewers_1.NativescriptHostedRealityViewer) {
                    var webView = viewer.webView;
                    webView.horizontalAlignment = 'stretch';
                    webView.verticalAlignment = 'stretch';
                    webView.visibility = 'collapse';
                    layer.contentView.addChild(webView);
                    _this.realityWebviews.set(viewer.uri, webView);
                }
            });
            AppViewModel_1.appViewModel.argon.provider.reality.uninstalledEvent.addEventListener(function (_a) {
                var viewer = _a.viewer;
                if (viewer instanceof argon_reality_viewers_1.NativescriptHostedRealityViewer) {
                    layer.contentView.removeChild(viewer.webView);
                    _this.realityWebviews.delete(viewer.uri);
                }
            });
            manager.reality.changeEvent.addEventListener(function (_a) {
                var current = _a.current;
                var viewer = manager.provider.reality.getViewerByURI(current);
                var details = layer.details;
                var uri = viewer.uri;
                details.set('uri', uri);
                details.set('title', 'Reality: ' + getHost(uri));
                layer.webView = _this.realityWebviews.get(uri);
                var sessionPromise = new Promise(function (resolve, reject) {
                    if (viewer.session && !viewer.session.isClosed) {
                        resolve(viewer.session);
                    }
                    else {
                        var remove_1 = viewer.connectEvent.addEventListener(function (session) {
                            resolve(session);
                            remove_1();
                        });
                    }
                });
                sessionPromise.then(function (session) {
                    if (current === manager.reality.current) {
                        if (session.info.title)
                            details.set('title', 'Reality: ' + session.info.title);
                    }
                });
            });
        });
        this.realityLayer = layer;
    };
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        var layer = this._createLayer();
        var webView = layer.webView = new argon_web_view_1.ArgonWebView;
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        layer.contentView.addChild(webView);
        webView.on('propertyChange', function (eventData) {
            switch (eventData.propertyName) {
                case 'url':
                    layer.details.set('uri', eventData.value);
                    break;
                case 'title':
                    var title = webView.title || getHost(webView.url);
                    bookmarks.updateTitle(webView.url, title);
                    layer.details.set('title', title);
                    break;
                case 'isArgonApp':
                    var isArgonApp = eventData.value;
                    if (isArgonApp || layer === _this.focussedLayer || _this._overviewEnabled) {
                        layer.containerView.animate({
                            opacity: 1,
                            duration: OVERVIEW_ANIMATION_DURATION
                        });
                    }
                    else {
                        layer.containerView.opacity = 1;
                    }
                    break;
                default: break;
            }
        });
        webView.on(web_view_1.WebView.loadFinishedEvent, function (eventData) {
            if (!eventData.error && webView !== _this.realityLayer.webView) {
                bookmarks.pushToHistory(eventData.url, webView.title);
            }
        });
        webView.on('session', function (e) {
            var session = e.session;
            layer.session = session;
            session.connectEvent.addEventListener(function () {
                if (webView === _this.focussedLayer.webView) {
                    AppViewModel_1.appViewModel.argon.provider.focus.session = session;
                }
                if (layer === _this.realityLayer) {
                    if (session.info.role !== Argon.Role.REALITY_VIEW) {
                        session.close();
                        alert("Only a reality can be loaded in the reality layer");
                    }
                }
                else {
                    if (session.info.role == Argon.Role.REALITY_VIEW) {
                        session.close();
                        alert("A reality can only be loaded in the reality layer");
                    }
                }
            });
            session.closeEvent.addEventListener(function () {
                layer.session = undefined;
            });
        });
        layer.details.set('log', webView.log);
        if (this.isLoaded)
            this.setFocussedLayer(layer);
        if (this._overviewEnabled)
            this._showLayerInCarousel(layer);
        return layer;
    };
    BrowserView.prototype._createLayer = function () {
        var _this = this;
        var contentView = new grid_layout_1.GridLayout();
        contentView.horizontalAlignment = 'stretch';
        contentView.verticalAlignment = 'stretch';
        var containerView = new grid_layout_1.GridLayout();
        containerView.horizontalAlignment = 'left';
        containerView.verticalAlignment = 'top';
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
        var titleLabel = new label_1.Label();
        titleLabel.horizontalAlignment = enums_1.HorizontalAlignment.stretch;
        titleLabel.verticalAlignment = enums_1.VerticalAlignment.stretch;
        titleLabel.textAlignment = enums_1.TextAlignment.center;
        titleLabel.color = new color_1.Color('black');
        titleLabel.fontSize = 14;
        grid_layout_1.GridLayout.setRow(titleLabel, 0);
        grid_layout_1.GridLayout.setColumn(titleLabel, 1);
        titleBar.addChild(closeButton);
        titleBar.addChild(titleLabel);
        containerView.addChild(contentView);
        containerView.addChild(touchOverlay);
        containerView.addChild(titleBar);
        this.layerContainer.addChild(containerView);
        var layer = {
            containerView: containerView,
            webView: undefined,
            contentView: contentView,
            touchOverlay: touchOverlay,
            titleBar: titleBar,
            closeButton: closeButton,
            titleLabel: titleLabel,
            visualIndex: this.layers.length,
            details: new AppViewModel_1.LayerDetails()
        };
        this.layers.push(layer);
        layer.titleLabel.bind({
            sourceProperty: 'title',
            targetProperty: 'text'
        }, layer.details);
        return layer;
    };
    BrowserView.prototype.removeLayerAtIndex = function (index) {
        var layer = this.layers[index];
        if (typeof layer === 'undefined')
            throw new Error('Expected layer at index ' + index);
        this.layers.splice(index, 1);
        this.layerContainer.removeChild(layer.containerView); // for now
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
            layer.containerView.width = width;
            layer.containerView.height = height;
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
            layer.containerView.scaleX = transform.scale.x;
            layer.containerView.scaleY = transform.scale.y;
            layer.containerView.translateX = transform.translate.x;
            layer.containerView.translateY = transform.translate.y;
        });
    };
    BrowserView.prototype._lerp = function (a, b, t) {
        return a + (b - a) * t;
    };
    BrowserView.prototype._showLayerInCarousel = function (layer) {
        var idx = this.layers.indexOf(layer);
        if (layer.containerView.ios)
            layer.containerView.ios.layer.masksToBounds = true;
        if (layer.contentView.ios)
            layer.contentView.ios.layer.masksToBounds = true;
        if (layer.webView && layer.webView.ios)
            layer.webView.ios.layer.masksToBounds = true;
        layer.touchOverlay.style.visibility = 'visible';
        // For transparent webviews, add a little bit of opacity
        layer.containerView.isUserInteractionEnabled = true;
        layer.containerView.animate({
            opacity: 1,
            backgroundColor: new color_1.Color(128, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.contentView.animate({
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
        layer.containerView.animate({
            translate: translate,
            scale: scale,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: enums_1.AnimationCurve.easeInOut,
        });
    };
    BrowserView.prototype._showLayerInStack = function (layer) {
        var idx = this.layers.indexOf(layer);
        layer.touchOverlay.style.visibility = 'collapsed';
        layer.containerView.isUserInteractionEnabled = this.focussedLayer === layer;
        layer.containerView.animate({
            opacity: (this.realityLayer === layer ||
                (layer.webView && layer.webView.isArgonApp) ||
                this.focussedLayer === layer) ?
                1 : 0,
            backgroundColor: this._layerBackgroundColor,
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.contentView && layer.contentView.animate({
            translate: { x: 0, y: 0 },
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(function () {
            if (layer.containerView.ios)
                layer.containerView.ios.layer.masksToBounds = false;
            if (layer.contentView.ios)
                layer.contentView.ios.layer.masksToBounds = false;
            if (layer.webView && layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = false;
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
        return layer.containerView.animate({
            translate: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: enums_1.AnimationCurve.easeInOut,
        });
    };
    BrowserView.prototype._showOverview = function () {
        var _this = this;
        if (this._overviewEnabled)
            return;
        this._overviewEnabled = true;
        this.layers.forEach(function (layer) {
            _this._showLayerInCarousel(layer);
        });
        this.scrollView.scrollToVerticalOffset(0, true);
        // animate the views
        this._intervalId = setInterval(this._animate.bind(this), 20);
    };
    BrowserView.prototype._hideOverview = function () {
        var _this = this;
        if (!this._overviewEnabled)
            return;
        this._overviewEnabled = false;
        var animations = this.layers.map(function (layer) {
            return _this._showLayerInStack(layer);
        });
        Promise.all(animations).then(function () {
            _this.scrollView.scrollToVerticalOffset(0, true);
            setTimeout(function () {
                _this.scrollView.scrollToVerticalOffset(0, false);
            }, 30);
        });
        this.scrollView.scrollToVerticalOffset(0, true);
        // stop animating the views
        if (this._intervalId)
            clearInterval(this._intervalId);
        this._intervalId = undefined;
    };
    BrowserView.prototype.loadUrl = function (url) {
        if (this.focussedLayer !== this.realityLayer) {
            this.focussedLayer.details.set('uri', url);
            this.focussedLayer.details.set('title', getHost(url));
            this.focussedLayer.details.set('isFavorite', false);
        }
        if (this.focussedLayer.webView) {
            if (this.focussedLayer.webView.src === url)
                this.focussedLayer.webView.reload();
            else
                this.focussedLayer.webView.src = url;
        }
    };
    BrowserView.prototype.setFocussedLayer = function (layer) {
        if (this._focussedLayer !== layer) {
            var previousFocussedLayer = this._focussedLayer;
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            console.log("Set focussed layer: " + layer.details.uri || "New Channel");
            AppViewModel_1.appViewModel.argon.provider.focus.session = layer.session;
            AppViewModel_1.appViewModel.setLayerDetails(layer.details);
            AppViewModel_1.appViewModel.hideOverview();
            if (layer !== this.realityLayer) {
                this.layers.splice(this.layers.indexOf(layer), 1);
                this.layers.push(layer);
                util_1.bringToFront(layer.containerView);
            }
            if (previousFocussedLayer)
                this._showLayerInStack(previousFocussedLayer);
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
function getHost(uri) {
    return uri ? URI.parse(uri).hostname : '';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBZ0Q7QUFDaEQseUNBQTJDO0FBQzNDLG1DQUFxQztBQUVyQyxzREFBZ0U7QUFDaEUsd0VBQThFO0FBQzlFLDhDQUErQztBQUUvQyxzQ0FBdUM7QUFFdkMsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFleEM7SUFBaUMsK0JBQVU7SUFjdkM7UUFBQSxZQUNJLGlCQUFPLFNBNkJWO1FBMUNELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFFbEQsZUFBUyxHQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsZ0JBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDNUIsb0JBQWMsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDaEMsWUFBTSxHQUFXLEVBQUUsQ0FBQztRQUdaLHNCQUFnQixHQUFHLEtBQUssQ0FBQztRQTRUekIsZUFBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQXlFdkIsMkJBQXFCLEdBQUcsSUFBSSxhQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUE5WHhELEtBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQ3BELEtBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1FBQ2xELEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMxQixLQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUN4RCxDQUFDO1FBRUQsS0FBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUM7UUFDaEQsS0FBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFDOUMsS0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsS0FBSSxDQUFDLGNBQWMsQ0FBQztRQUM5QyxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEIsS0FBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDcEQsQ0FBQztRQUNELEtBQUksQ0FBQyxRQUFRLENBQUMsS0FBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9CLEtBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxhQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekMsS0FBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsd0JBQVUsQ0FBQyxXQUFXLEVBQUUsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLENBQUMsQ0FBQztRQUVyRSwyQkFBMkI7UUFDM0IsS0FBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFFM0Isa0RBQWtEO1FBQ2xELEtBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVoQixXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRTtZQUNoRCxLQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDckIsS0FBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUE7O0lBQ04sQ0FBQztJQUVPLHlDQUFtQixHQUEzQjtRQUFBLGlCQXVFQztRQXRFRyxJQUFJLEtBQUssR0FBUyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsSUFBSSxhQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxhQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDO1FBRTNDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1lBQy9DLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1lBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO2dCQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0UsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCwyQkFBWSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLEdBQXNCO1lBQ3JELE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixLQUFLLGNBQWM7b0JBQ2YsRUFBRSxDQUFDLENBQUMsMkJBQVksQ0FBQyxZQUFZLENBQUM7d0JBQUMsS0FBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO29CQUNuRCxJQUFJO3dCQUFDLEtBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtvQkFDekIsS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsMkJBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ3BCLElBQU0sT0FBTyxHQUFHLDJCQUFZLENBQUMsS0FBSyxDQUFDO1lBRW5DLDJCQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFVBQUMsRUFBUTtvQkFBUCxrQkFBTTtnQkFDeEUsRUFBRSxDQUFDLENBQUMsTUFBTSxZQUFZLHVEQUErQixDQUFDLENBQUMsQ0FBQztvQkFDcEQsSUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztvQkFDL0IsT0FBTyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztvQkFDeEMsT0FBTyxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztvQkFDdEMsT0FBTyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7b0JBQ2hDLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNwQyxLQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCwyQkFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLFVBQUMsRUFBUTtvQkFBUCxrQkFBTTtnQkFDMUUsRUFBRSxDQUFDLENBQUMsTUFBTSxZQUFZLHVEQUErQixDQUFDLENBQUMsQ0FBQztvQkFDcEQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUM5QyxLQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFVBQUMsRUFBUztvQkFBUixvQkFBTztnQkFDbEQsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQVEsQ0FBRSxDQUFDO2dCQUNsRSxJQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO2dCQUM5QixJQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUU5QyxJQUFJLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBb0IsVUFBQyxPQUFPLEVBQUUsTUFBTTtvQkFDaEUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDN0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDNUIsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixJQUFJLFFBQU0sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFVBQUMsT0FBTzs0QkFDdEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUNqQixRQUFNLEVBQUUsQ0FBQzt3QkFDYixDQUFDLENBQUMsQ0FBQTtvQkFDTixDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUVILGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBQyxPQUFPO29CQUN4QixFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUN0QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzs0QkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxXQUFXLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDbkYsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztJQUM5QixDQUFDO0lBRUQsOEJBQVEsR0FBUjtRQUFBLGlCQXVFQztRQXRFRyxJQUFNLEtBQUssR0FBUyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFeEMsSUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLDZCQUFZLENBQUM7UUFDakQsT0FBTyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztRQUN4QyxPQUFPLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1FBQ3RDLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXBDLE9BQU8sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsVUFBQyxTQUE0QjtZQUN0RCxNQUFNLENBQUEsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDNUIsS0FBSyxLQUFLO29CQUNOLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQzFDLEtBQUssQ0FBQztnQkFDVixLQUFLLE9BQU87b0JBQ1IsSUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNwRCxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQzFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDbEMsS0FBSyxDQUFDO2dCQUNWLEtBQUssWUFBWTtvQkFDYixJQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO29CQUNuQyxFQUFFLENBQUMsQ0FBQyxVQUFVLElBQUksS0FBSyxLQUFLLEtBQUksQ0FBQyxhQUFhLElBQUksS0FBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQzt3QkFDdEUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7NEJBQ3hCLE9BQU8sRUFBRSxDQUFDOzRCQUNWLFFBQVEsRUFBRSwyQkFBMkI7eUJBQ3hDLENBQUMsQ0FBQztvQkFDUCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztvQkFDcEMsQ0FBQztvQkFDRCxLQUFLLENBQUM7Z0JBQ1YsU0FBUyxLQUFLLENBQUM7WUFDbkIsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxrQkFBTyxDQUFDLGlCQUFpQixFQUFFLFVBQUMsU0FBd0I7WUFDM0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQzVELFNBQVMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUQsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBQyxDQUFDO1lBQ3BCLElBQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDMUIsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDeEIsT0FBTyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDbEMsRUFBRSxDQUFDLENBQUMsT0FBTyxLQUFLLEtBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDekMsMkJBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO2dCQUN4RCxDQUFDO2dCQUNELEVBQUUsQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztvQkFDOUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO3dCQUNoRCxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ2hCLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO29CQUMvRCxDQUFDO2dCQUNMLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO3dCQUMvQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ2hCLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO29CQUMvRCxDQUFDO2dCQUNMLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQTtZQUNGLE9BQU8sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ2hDLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO1lBQzlCLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXRDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDZCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFakMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVELE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVPLGtDQUFZLEdBQXBCO1FBQUEsaUJBaUZDO1FBaEZHLElBQU0sV0FBVyxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO1FBQ3JDLFdBQVcsQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUM7UUFDNUMsV0FBVyxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztRQUUxQyxJQUFNLGFBQWEsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztRQUN2QyxhQUFhLENBQUMsbUJBQW1CLEdBQUcsTUFBTSxDQUFDO1FBQzNDLGFBQWEsQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFFeEMsK0RBQStEO1FBQy9ELElBQU0sWUFBWSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO1FBQ3RDLFlBQVksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQztRQUM1QyxZQUFZLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQzdDLFlBQVksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFDM0MsWUFBWSxDQUFDLEVBQUUsQ0FBQyx1QkFBWSxDQUFDLEdBQUcsRUFBRSxVQUFDLEtBQUs7WUFDcEMsS0FBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdCLDJCQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFNLFFBQVEsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztRQUNsQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksc0JBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3pELFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBUSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDNUQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHNCQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDNUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHNCQUFRLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM1RCxRQUFRLENBQUMsaUJBQWlCLEdBQUcseUJBQWlCLENBQUMsR0FBRyxDQUFDO1FBQ25ELFFBQVEsQ0FBQyxtQkFBbUIsR0FBRywyQkFBbUIsQ0FBQyxPQUFPLENBQUM7UUFDM0QsUUFBUSxDQUFDLGVBQWUsR0FBRyxJQUFJLGFBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6RCxRQUFRLENBQUMsVUFBVSxHQUFHLGtCQUFVLENBQUMsUUFBUSxDQUFDO1FBQzFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBRXJCLElBQU0sV0FBVyxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7UUFDakMsV0FBVyxDQUFDLG1CQUFtQixHQUFHLDJCQUFtQixDQUFDLE9BQU8sQ0FBQztRQUM5RCxXQUFXLENBQUMsaUJBQWlCLEdBQUcseUJBQWlCLENBQUMsT0FBTyxDQUFDO1FBQzFELFdBQVcsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1FBQzNCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDO1FBQ3hDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNoQyxXQUFXLENBQUMsS0FBSyxHQUFHLElBQUksYUFBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZDLHdCQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyx3QkFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFckMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUU7WUFDbEIsS0FBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQztRQUVILElBQU0sVUFBVSxHQUFHLElBQUksYUFBSyxFQUFFLENBQUM7UUFDL0IsVUFBVSxDQUFDLG1CQUFtQixHQUFHLDJCQUFtQixDQUFDLE9BQU8sQ0FBQztRQUM3RCxVQUFVLENBQUMsaUJBQWlCLEdBQUcseUJBQWlCLENBQUMsT0FBTyxDQUFDO1FBQ3pELFVBQVUsQ0FBQyxhQUFhLEdBQUcscUJBQWEsQ0FBQyxNQUFNLENBQUM7UUFDaEQsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLGFBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0QyxVQUFVLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUN6Qix3QkFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsd0JBQVUsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0IsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU5QixhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3BDLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDckMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUU1QyxJQUFJLEtBQUssR0FBRztZQUNSLGFBQWEsZUFBQTtZQUNiLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLFdBQVcsYUFBQTtZQUNYLFlBQVksY0FBQTtZQUNaLFFBQVEsVUFBQTtZQUNSLFdBQVcsYUFBQTtZQUNYLFVBQVUsWUFBQTtZQUNWLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07WUFDL0IsT0FBTyxFQUFFLElBQUksMkJBQVksRUFBRTtTQUM5QixDQUFDO1FBRUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFeEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDbEIsY0FBYyxFQUFFLE9BQU87WUFDdkIsY0FBYyxFQUFFLE1BQU07U0FDekIsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEIsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBRUQsd0NBQWtCLEdBQWxCLFVBQW1CLEtBQVk7UUFDM0IsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssS0FBSyxXQUFXLENBQUM7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVTtJQUNwRSxDQUFDO0lBRUQsaUNBQVcsR0FBWCxVQUFZLEtBQVc7UUFDbkIsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCw4QkFBUSxHQUFSO1FBQ0ksaUJBQU0sUUFBUSxXQUFFLENBQUM7SUFDckIsQ0FBQztJQUVELCtCQUFTLEdBQVQsVUFBVSxnQkFBZ0IsRUFBRSxpQkFBaUI7UUFDekMsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hFLElBQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVsRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLO1lBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNsQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxpQkFBTSxTQUFTLFlBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRU8sK0NBQXlCLEdBQWpDLFVBQWtDLEtBQVk7UUFDMUMsSUFBTSxhQUFhLEdBQUcsS0FBSyxHQUFHLHlCQUF5QixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO1FBQ3pGLElBQU0sa0JBQWtCLEdBQUcsYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3BFLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3hFLElBQU0sV0FBVyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUMzRCxNQUFNLENBQUM7WUFDSCxTQUFTLEVBQUU7Z0JBQ1AsQ0FBQyxFQUFFLENBQUM7Z0JBQ0osQ0FBQyxFQUFFLEtBQUssR0FBRyx5QkFBeUI7YUFDdkM7WUFDRCxLQUFLLEVBQUU7Z0JBQ0gsQ0FBQyxFQUFFLFdBQVc7Z0JBQ2QsQ0FBQyxFQUFFLFdBQVc7YUFDakI7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUdPLDhCQUFRLEdBQWhCO1FBQUEsaUJBdUJDO1FBdEJHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQ3ZCLE1BQU0sQ0FBQztRQUVYLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN6RCxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQztRQUVyQixJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV4QyxJQUFNLGVBQWUsR0FBRyxNQUFNLEdBQUcseUJBQXlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDO1FBRTdDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFFLEtBQUs7WUFDN0IsS0FBSyxDQUFDLFdBQVcsR0FBRyxLQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSxJQUFNLFNBQVMsR0FBRyxLQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BFLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQy9DLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQy9DLEtBQUssQ0FBQyxhQUFhLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELEtBQUssQ0FBQyxhQUFhLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLDJCQUFLLEdBQWIsVUFBYyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUM7UUFDZixNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRU8sMENBQW9CLEdBQTVCLFVBQTZCLEtBQVc7UUFDcEMsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUM7WUFDeEIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFFdkQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7WUFDdEIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFFckQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNuQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUVqRCxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBRWhELHdEQUF3RDtRQUN4RCxLQUFLLENBQUMsYUFBYSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQztRQUNwRCxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUN4QixPQUFPLEVBQUUsQ0FBQztZQUNWLGVBQWUsRUFBRSxJQUFJLGFBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDOUMsUUFBUSxFQUFFLDJCQUEyQjtTQUN4QyxDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQztZQUN0QixTQUFTLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxnQkFBZ0IsRUFBQztZQUNuQyxRQUFRLEVBQUUsMkJBQTJCO1NBQ3hDLENBQUMsQ0FBQTtRQUVGLGlCQUFpQjtRQUNqQixLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxrQkFBVSxDQUFDLE9BQU8sQ0FBQztRQUMvQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUNuQixPQUFPLEVBQUUsQ0FBQztZQUNWLFFBQVEsRUFBRSwyQkFBMkI7U0FDeEMsQ0FBQyxDQUFBO1FBRUYsdUNBQXVDO1FBQ2pDLElBQUEsd0NBQXdELEVBQXZELHdCQUFTLEVBQUUsZ0JBQUssQ0FBd0M7UUFDL0QsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7WUFDeEIsU0FBUyxXQUFBO1lBQ1QsS0FBSyxPQUFBO1lBQ0wsUUFBUSxFQUFFLDJCQUEyQjtZQUNyQyxLQUFLLEVBQUUsc0JBQWMsQ0FBQyxTQUFTO1NBQ2xDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFJTyx1Q0FBaUIsR0FBekIsVUFBMEIsS0FBVztRQUNqQyxJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2QyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDO1FBRWxELEtBQUssQ0FBQyxhQUFhLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsS0FBSyxLQUFLLENBQUM7UUFDNUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7WUFDeEIsT0FBTyxFQUNILENBQUMsSUFBSSxDQUFDLFlBQVksS0FBSyxLQUFLO2dCQUM1QixDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDO2dCQUN6QixDQUFDLEdBQUcsQ0FBQztZQUNiLGVBQWUsRUFBRSxJQUFJLENBQUMscUJBQXFCO1lBQzNDLFFBQVEsRUFBRSwyQkFBMkI7U0FDeEMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQztZQUMzQyxTQUFTLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7WUFDcEIsUUFBUSxFQUFFLDJCQUEyQjtTQUN4QyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ0osRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUM7Z0JBQ3hCLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO1lBQ3hELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO2dCQUN0QixLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztZQUN0RCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNuQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztRQUVILGlCQUFpQjtRQUNqQixLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUNuQixPQUFPLEVBQUUsQ0FBQztZQUNWLFFBQVEsRUFBRSwyQkFBMkI7U0FDeEMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNKLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLGtCQUFVLENBQUMsUUFBUSxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFBO1FBRUYsdUNBQXVDO1FBQ3ZDLEtBQUssQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUMvQixTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDekIsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3JCLFFBQVEsRUFBRSwyQkFBMkI7WUFDckMsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUztTQUNsQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU8sbUNBQWEsR0FBckI7UUFBQSxpQkFXQztRQVZHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUFDLE1BQU0sQ0FBQztRQUNsQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSztZQUN0QixLQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVoRCxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVPLG1DQUFhLEdBQXJCO1FBQUEsaUJBbUJDO1FBbEJHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQUMsTUFBTSxDQUFDO1FBQ25DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFFOUIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBQyxLQUFLO1lBQ25DLE1BQU0sQ0FBQyxLQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN6QixLQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoRCxVQUFVLENBQUM7Z0JBQ1AsS0FBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckQsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVoRCwyQkFBMkI7UUFDM0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7SUFDakMsQ0FBQztJQUVNLDZCQUFPLEdBQWQsVUFBZSxHQUFVO1FBQ3JCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxHQUFHLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUM3QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDO2dCQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hGLElBQUk7Z0JBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUM5QyxDQUFDO0lBQ0wsQ0FBQztJQUVNLHNDQUFnQixHQUF2QixVQUF3QixLQUFXO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNoQyxJQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7WUFDbEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDNUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxDQUFDO1lBRXpFLDJCQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDMUQsMkJBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLDJCQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7WUFFNUIsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLG1CQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3RDLENBQUM7WUFFRCxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztnQkFBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM3RSxDQUFDO0lBQ0wsQ0FBQztJQUVELHNCQUFJLHNDQUFhO2FBQWpCO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDL0IsQ0FBQzs7O09BQUE7SUFDTCxrQkFBQztBQUFELENBQUMsQUFyZ0JELENBQWlDLHdCQUFVLEdBcWdCMUM7QUFyZ0JZLGtDQUFXO0FBd2dCeEIsaUJBQWlCLEdBQVc7SUFDeEIsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFDOUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVSSSBmcm9tICd1cmlqcyc7XG5pbXBvcnQge1ZpZXd9IGZyb20gJ3VpL2NvcmUvdmlldyc7XG5pbXBvcnQge1Njcm9sbFZpZXd9IGZyb20gJ3VpL3Njcm9sbC12aWV3J1xuaW1wb3J0IHtDb2xvcn0gZnJvbSAnY29sb3InO1xuaW1wb3J0IHtHcmlkTGF5b3V0LCBJdGVtU3BlY30gZnJvbSAndWkvbGF5b3V0cy9ncmlkLWxheW91dCc7XG5pbXBvcnQge0xhYmVsfSBmcm9tICd1aS9sYWJlbCc7XG5pbXBvcnQge0J1dHRvbn0gZnJvbSAndWkvYnV0dG9uJztcbmltcG9ydCB7QXJnb25XZWJWaWV3fSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5pbXBvcnQge1dlYlZpZXcsIExvYWRFdmVudERhdGF9IGZyb20gJ3VpL3dlYi12aWV3J1xuaW1wb3J0IHtcbiAgICBBbmltYXRpb25DdXJ2ZSwgXG4gICAgVmVydGljYWxBbGlnbm1lbnQsIFxuICAgIEhvcml6b250YWxBbGlnbm1lbnQsIFxuICAgIFRleHRBbGlnbm1lbnQsXG4gICAgVmlzaWJpbGl0eVxufSBmcm9tICd1aS9lbnVtcyc7XG5pbXBvcnQge1xuICBHZXN0dXJlVHlwZXNcbn0gZnJvbSAndWkvZ2VzdHVyZXMnO1xuaW1wb3J0IHticmluZ1RvRnJvbnR9IGZyb20gJy4vY29tbW9uL3V0aWwnO1xuaW1wb3J0IHtQcm9wZXJ0eUNoYW5nZURhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSAnYXBwbGljYXRpb24nO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQge2FwcFZpZXdNb2RlbCwgTGF5ZXJEZXRhaWxzfSBmcm9tICcuL2NvbW1vbi9BcHBWaWV3TW9kZWwnXG5pbXBvcnQge05hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXJ9IGZyb20gJy4vY29tbW9uL2FyZ29uLXJlYWxpdHktdmlld2VycydcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2NvbW1vbi9ib29rbWFya3MnXG5cbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuXG5jb25zdCBUSVRMRV9CQVJfSEVJR0hUID0gMzA7XG5jb25zdCBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HID0gMTUwO1xuY29uc3QgT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OID0gMjUwO1xuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyIHtcbiAgICBzZXNzaW9uPzpBcmdvbi5TZXNzaW9uUG9ydCxcbiAgICBjb250YWluZXJWaWV3OkdyaWRMYXlvdXQsXG4gICAgY29udGVudFZpZXc6R3JpZExheW91dCxcbiAgICB3ZWJWaWV3PzpBcmdvbldlYlZpZXcsXG4gICAgdG91Y2hPdmVybGF5OkdyaWRMYXlvdXQsXG4gICAgdGl0bGVCYXI6R3JpZExheW91dCxcbiAgICBjbG9zZUJ1dHRvbjpCdXR0b24sXG4gICAgdGl0bGVMYWJlbDogTGFiZWwsXG4gICAgdmlzdWFsSW5kZXg6IG51bWJlcixcbiAgICBkZXRhaWxzOiBMYXllckRldGFpbHNcbn1cblxuZXhwb3J0IGNsYXNzIEJyb3dzZXJWaWV3IGV4dGVuZHMgR3JpZExheW91dCB7XG4gICAgcmVhbGl0eUxheWVyOkxheWVyO1xuICAgIHJlYWxpdHlXZWJ2aWV3cyA9IG5ldyBNYXA8c3RyaW5nLCBBcmdvbldlYlZpZXc+KCk7XG4gICAgXG4gICAgdmlkZW9WaWV3OlZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcbiAgICBzY3JvbGxWaWV3ID0gbmV3IFNjcm9sbFZpZXc7XG4gICAgbGF5ZXJDb250YWluZXIgPSBuZXcgR3JpZExheW91dDtcbiAgICBsYXllcnM6TGF5ZXJbXSA9IFtdO1xuICAgICAgICBcbiAgICBwcml2YXRlIF9mb2N1c3NlZExheWVyOkxheWVyO1xuICAgIHByaXZhdGUgX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgIFxuICAgIHByaXZhdGUgX2ludGVydmFsSWQ/Om51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBpZiAodGhpcy5sYXllckNvbnRhaW5lci5pb3MpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmNvbnRlbnQgPSB0aGlzLmxheWVyQ29udGFpbmVyO1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxWaWV3Lmlvcykge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnNjcm9sbFZpZXcpO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcihcIiM1NTVcIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcub24oU2Nyb2xsVmlldy5zY3JvbGxFdmVudCwgdGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVhbGl0eSBsYXllclxuICAgICAgICB0aGlzLl9jcmVhdGVSZWFsaXR5TGF5ZXIoKTtcblxuICAgICAgICAvLyBBZGQgYSBub3JtYWwgbGF5ZXIgdG8gYmUgdXNlZCB3aXRoIHRoZSB1cmwgYmFyLlxuICAgICAgICB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdExheW91dCgpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZVJlYWxpdHlMYXllcigpIHtcbiAgICAgICAgbGV0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDB4RkYyMjIyMjIpO1xuICAgICAgICBsYXllci50aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCd3aGl0ZScpO1xuICAgICAgICBsYXllci5jbG9zZUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcpIHtcbiAgICAgICAgICAgIHRoaXMudmlkZW9WaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICB0aGlzLnZpZGVvVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZGVvVmlldy5wYXJlbnQpIHRoaXMudmlkZW9WaWV3LnBhcmVudC5fcmVtb3ZlVmlldyh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICBhcHBWaWV3TW9kZWwub24oJ3Byb3BlcnR5Q2hhbmdlJywgKGV2dDpQcm9wZXJ0eUNoYW5nZURhdGEpID0+IHtcbiAgICAgICAgICAgIHN3aXRjaCAoZXZ0LnByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ292ZXJ2aWV3T3Blbic6IFxuICAgICAgICAgICAgICAgICAgICBpZiAoYXBwVmlld01vZGVsLm92ZXJ2aWV3T3BlbikgdGhpcy5fc2hvd092ZXJ2aWV3KClcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0aGlzLl9oaWRlT3ZlcnZpZXcoKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXBwVmlld01vZGVsLnJlYWR5LnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZXIgPSBhcHBWaWV3TW9kZWwuYXJnb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5yZWFsaXR5Lmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdlYlZpZXcgPSB2aWV3ZXIud2ViVmlldztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3Muc2V0KHZpZXdlci51cmksIHdlYlZpZXcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS51bmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LnJlbW92ZUNoaWxkKHZpZXdlci53ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3MuZGVsZXRlKHZpZXdlci51cmkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtYW5hZ2VyLnJlYWxpdHkuY2hhbmdlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpZXdlciA9IG1hbmFnZXIucHJvdmlkZXIucmVhbGl0eS5nZXRWaWV3ZXJCeVVSSShjdXJyZW50ISkhO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBsYXllci5kZXRhaWxzO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHZpZXdlci51cmk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3VyaScsIHVyaSk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBnZXRIb3N0KHVyaSkpO1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcgPSB0aGlzLnJlYWxpdHlXZWJ2aWV3cy5nZXQodXJpKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEFyZ29uLlNlc3Npb25Qb3J0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIuc2Vzc2lvbiAmJiAhdmlld2VyLnNlc3Npb24uaXNDbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmlld2VyLnNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHZpZXdlci5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc2Vzc2lvblByb21pc2UudGhlbigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPT09IG1hbmFnZXIucmVhbGl0eS5jdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnRpdGxlKSBkZXRhaWxzLnNldCgndGl0bGUnLCAnUmVhbGl0eTogJyArIHNlc3Npb24uaW5mby50aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnJlYWxpdHlMYXllciA9IGxheWVyO1xuICAgIH1cblxuICAgIGFkZExheWVyKCkgOiBMYXllciB7XG4gICAgICAgIGNvbnN0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSBsYXllci53ZWJWaWV3ID0gbmV3IEFyZ29uV2ViVmlldztcbiAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcblxuICAgICAgICB3ZWJWaWV3Lm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldmVudERhdGE6UHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2goZXZlbnREYXRhLnByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd1cmknLCBldmVudERhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0aXRsZSc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gd2ViVmlldy50aXRsZSB8fCBnZXRIb3N0KHdlYlZpZXcudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgYm9va21hcmtzLnVwZGF0ZVRpdGxlKHdlYlZpZXcudXJsLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd0aXRsZScsIHRpdGxlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnaXNBcmdvbkFwcCc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQXJnb25BcHAgPSBldmVudERhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FyZ29uQXBwIHx8IGxheWVyID09PSB0aGlzLmZvY3Vzc2VkTGF5ZXIgfHwgdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lm9wYWNpdHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGV2ZW50RGF0YTogTG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKCFldmVudERhdGEuZXJyb3IgJiYgd2ViVmlldyAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldykge1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5wdXNoVG9IaXN0b3J5KGV2ZW50RGF0YS51cmwsIHdlYlZpZXcudGl0bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oJ3Nlc3Npb24nLCAoZSk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBlLnNlc3Npb247XG4gICAgICAgICAgICBsYXllci5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgIHNlc3Npb24uY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgICAgICBpZiAod2ViVmlldyA9PT0gdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGF5ZXIgPT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSAhPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiT25seSBhIHJlYWxpdHkgY2FuIGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSA9PSBBcmdvbi5Sb2xlLlJFQUxJVFlfVklFVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJBIHJlYWxpdHkgY2FuIG9ubHkgYmUgbG9hZGVkIGluIHRoZSByZWFsaXR5IGxheWVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICAgICAgbGF5ZXIuc2Vzc2lvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCdsb2cnLCB3ZWJWaWV3LmxvZyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5pc0xvYWRlZClcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB0aGlzLl9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBsYXllcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jcmVhdGVMYXllcigpIHtcbiAgICAgICAgY29uc3QgY29udGVudFZpZXcgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICBjb250ZW50Vmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBjb250ZW50Vmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcblxuICAgICAgICBjb25zdCBjb250YWluZXJWaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgY29udGFpbmVyVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ2xlZnQnO1xuICAgICAgICBjb250YWluZXJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3RvcCc7XG5cbiAgICAgICAgLy8gQ292ZXIgdGhlIHdlYnZpZXcgdG8gZGV0ZWN0IGdlc3R1cmVzIGFuZCBkaXNhYmxlIGludGVyYWN0aW9uXG4gICAgICAgIGNvbnN0IHRvdWNoT3ZlcmxheSA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5vbihHZXN0dXJlVHlwZXMudGFwLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGVCYXIgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0aXRsZUJhci5hZGRSb3cobmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ29sdW1uKG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoMSwgJ3N0YXInKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci52ZXJ0aWNhbEFsaWdubWVudCA9IFZlcnRpY2FsQWxpZ25tZW50LnRvcDtcbiAgICAgICAgdGl0bGVCYXIuaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDI0MCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgICAgIHRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LmNvbGxhcHNlO1xuICAgICAgICB0aXRsZUJhci5vcGFjaXR5ID0gMDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gbmV3IEJ1dHRvbigpO1xuICAgICAgICBjbG9zZUJ1dHRvbi5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi52ZXJ0aWNhbEFsaWdubWVudCA9IFZlcnRpY2FsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIGNsb3NlQnV0dG9uLnRleHQgPSAnY2xvc2UnO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jbGFzc05hbWUgPSAnbWF0ZXJpYWwtaWNvbic7XG4gICAgICAgIGNsb3NlQnV0dG9uLnN0eWxlLmZvbnRTaXplID0gMjI7XG4gICAgICAgIGNsb3NlQnV0dG9uLmNvbG9yID0gbmV3IENvbG9yKCdibGFjaycpO1xuICAgICAgICBHcmlkTGF5b3V0LnNldFJvdyhjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKGNsb3NlQnV0dG9uLCAwKTtcbiAgICAgICAgXG4gICAgICAgIGNsb3NlQnV0dG9uLm9uKCd0YXAnLCAoKT0+e1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVMYXllcihsYXllcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGVMYWJlbCA9IG5ldyBMYWJlbCgpO1xuICAgICAgICB0aXRsZUxhYmVsLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlTGFiZWwudmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUxhYmVsLnRleHRBbGlnbm1lbnQgPSBUZXh0QWxpZ25tZW50LmNlbnRlcjtcbiAgICAgICAgdGl0bGVMYWJlbC5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgdGl0bGVMYWJlbC5mb250U2l6ZSA9IDE0O1xuICAgICAgICBHcmlkTGF5b3V0LnNldFJvdyh0aXRsZUxhYmVsLCAwKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRDb2x1bW4odGl0bGVMYWJlbCwgMSk7XG4gICAgICAgIFxuICAgICAgICB0aXRsZUJhci5hZGRDaGlsZChjbG9zZUJ1dHRvbik7XG4gICAgICAgIHRpdGxlQmFyLmFkZENoaWxkKHRpdGxlTGFiZWwpO1xuICAgICAgICBcbiAgICAgICAgY29udGFpbmVyVmlldy5hZGRDaGlsZChjb250ZW50Vmlldyk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQodG91Y2hPdmVybGF5KTtcbiAgICAgICAgY29udGFpbmVyVmlldy5hZGRDaGlsZCh0aXRsZUJhcik7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuYWRkQ2hpbGQoY29udGFpbmVyVmlldyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgbGF5ZXIgPSB7XG4gICAgICAgICAgICBjb250YWluZXJWaWV3LFxuICAgICAgICAgICAgd2ViVmlldzogdW5kZWZpbmVkLFxuICAgICAgICAgICAgY29udGVudFZpZXcsXG4gICAgICAgICAgICB0b3VjaE92ZXJsYXksXG4gICAgICAgICAgICB0aXRsZUJhcixcbiAgICAgICAgICAgIGNsb3NlQnV0dG9uLFxuICAgICAgICAgICAgdGl0bGVMYWJlbCxcbiAgICAgICAgICAgIHZpc3VhbEluZGV4OiB0aGlzLmxheWVycy5sZW5ndGgsXG4gICAgICAgICAgICBkZXRhaWxzOiBuZXcgTGF5ZXJEZXRhaWxzKClcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXIpO1xuXG4gICAgICAgIGxheWVyLnRpdGxlTGFiZWwuYmluZCh7XG4gICAgICAgICAgICBzb3VyY2VQcm9wZXJ0eTogJ3RpdGxlJyxcbiAgICAgICAgICAgIHRhcmdldFByb3BlcnR5OiAndGV4dCdcbiAgICAgICAgfSwgbGF5ZXIuZGV0YWlscyk7XG5cbiAgICAgICAgcmV0dXJuIGxheWVyO1xuICAgIH1cbiAgICBcbiAgICByZW1vdmVMYXllckF0SW5kZXgoaW5kZXg6bnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcnNbaW5kZXhdO1xuICAgICAgICBpZiAodHlwZW9mIGxheWVyID09PSAndW5kZWZpbmVkJykgXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIGxheWVyIGF0IGluZGV4ICcgKyBpbmRleCk7XG4gICAgICAgIHRoaXMubGF5ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIucmVtb3ZlQ2hpbGQobGF5ZXIuY29udGFpbmVyVmlldyk7IC8vIGZvciBub3dcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgdGhpcy5yZW1vdmVMYXllckF0SW5kZXgoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBvbkxvYWRlZCgpIHtcbiAgICAgICAgc3VwZXIub25Mb2FkZWQoKTtcbiAgICB9XG4gICAgXG4gICAgb25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZSh3aWR0aE1lYXN1cmVTcGVjKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZShoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKT0+e1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgc3VwZXIub25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllclBvc2l0aW9uID0gaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HIC0gdGhpcy5zY3JvbGxWaWV3LnZlcnRpY2FsT2Zmc2V0O1xuICAgICAgICBjb25zdCBub3JtYWxpemVkUG9zaXRpb24gPSBsYXllclBvc2l0aW9uIC8gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBjb25zdCB0aGV0YSA9IE1hdGgubWluKE1hdGgubWF4KG5vcm1hbGl6ZWRQb3NpdGlvbiwgMCksIDAuODUpICogTWF0aC5QSTtcbiAgICAgICAgY29uc3Qgc2NhbGVGYWN0b3IgPSAxIC0gKE1hdGguY29zKHRoZXRhKSAvIDIgKyAwLjUpICogMC4yNTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICB4OiBzY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICB5OiBzY2FsZUZhY3RvclxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sYXN0VGltZSA9IERhdGUubm93KCk7XG4gICAgcHJpdmF0ZSBfYW5pbWF0ZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgZGVsdGFUID0gTWF0aC5taW4obm93IC0gdGhpcy5fbGFzdFRpbWUsIDMwKSAvIDEwMDA7XG4gICAgICAgIHRoaXMuX2xhc3RUaW1lID0gbm93O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmdldE1lYXN1cmVkV2lkdGgoKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29udGFpbmVySGVpZ2h0ID0gaGVpZ2h0ICsgT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyAqICh0aGlzLmxheWVycy5sZW5ndGgtMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBjb250YWluZXJIZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gdGhpcy5fbGVycChsYXllci52aXN1YWxJbmRleCwgaW5kZXgsIGRlbHRhVCo0KTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IHRoaXMuX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShsYXllci52aXN1YWxJbmRleCk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnNjYWxlWCA9IHRyYW5zZm9ybS5zY2FsZS54O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5zY2FsZVkgPSB0cmFuc2Zvcm0uc2NhbGUueTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcudHJhbnNsYXRlWCA9IHRyYW5zZm9ybS50cmFuc2xhdGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcudHJhbnNsYXRlWSA9IHRyYW5zZm9ybS50cmFuc2xhdGUueTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2xlcnAoYSxiLHQpIHtcbiAgICAgICAgcmV0dXJuIGEgKyAoYi1hKSp0XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG5cbiAgICAgICAgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuaW9zKVxuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG5cbiAgICAgICAgaWYgKGxheWVyLmNvbnRlbnRWaWV3LmlvcylcbiAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuaW9zKVxuICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgbGF5ZXIudG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG5cbiAgICAgICAgLy8gRm9yIHRyYW5zcGFyZW50IHdlYnZpZXdzLCBhZGQgYSBsaXR0bGUgYml0IG9mIG9wYWNpdHlcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbmV3IENvbG9yKDEyOCwgMjU1LCAyNTUsIDI1NSksXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICB9KTtcbiAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTpUSVRMRV9CQVJfSEVJR0hUfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBTaG93IHRpdGxlYmFyc1xuICAgICAgICBsYXllci50aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS52aXNpYmxlO1xuICAgICAgICBsYXllci50aXRsZUJhci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGNvbnN0IHt0cmFuc2xhdGUsIHNjYWxlfSA9IHRoaXMuX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShpZHgpO1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlLFxuICAgICAgICAgICAgc2NhbGUsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbGF5ZXJCYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoMCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgXG4gICAgcHJpdmF0ZSBfc2hvd0xheWVySW5TdGFjayhsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG5cbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSB0aGlzLmZvY3Vzc2VkTGF5ZXIgPT09IGxheWVyO1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogXG4gICAgICAgICAgICAgICAgKHRoaXMucmVhbGl0eUxheWVyID09PSBsYXllciB8fCBcbiAgICAgICAgICAgICAgICAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlzQXJnb25BcHApIHx8IFxuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllciA9PT0gbGF5ZXIpID8gXG4gICAgICAgICAgICAgICAgICAgIDEgOiAwLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiB0aGlzLl9sYXllckJhY2tncm91bmRDb2xvcixcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxheWVyLmNvbnRlbnRWaWV3ICYmIGxheWVyLmNvbnRlbnRWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6MH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGlmIChsYXllci5jb250YWluZXJWaWV3LmlvcylcbiAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGVudFZpZXcuaW9zKVxuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlvcylcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gaWR4O1xuICAgICAgICByZXR1cm4gbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBzY2FsZTogeyB4OiAxLCB5OiAxIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwcml2YXRlIF9zaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gYW5pbWF0ZSB0aGUgdmlld3NcbiAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuX2FuaW1hdGUuYmluZCh0aGlzKSwgMjApO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hpZGVPdmVydmlldygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgYW5pbWF0aW9ucyA9IHRoaXMubGF5ZXJzLm1hcCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaG93TGF5ZXJJblN0YWNrKGxheWVyKVxuICAgICAgICB9KTtcbiAgICAgICAgUHJvbWlzZS5hbGwoYW5pbWF0aW9ucykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIGFuaW1hdGluZyB0aGUgdmlld3NcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQpIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHVibGljIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd1cmknLHVybCk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3RpdGxlJywgZ2V0SG9zdCh1cmwpKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgnaXNGYXZvcml0ZScsZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9PT0gdXJsKSB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID0gdXJsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNldEZvY3Vzc2VkTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgIT09IGxheWVyKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2aW91c0ZvY3Vzc2VkTGF5ZXIgPSB0aGlzLl9mb2N1c3NlZExheWVyO1xuICAgICAgICAgICAgdGhpcy5fZm9jdXNzZWRMYXllciA9IGxheWVyO1xuICAgICAgICAgICAgdGhpcy5ub3RpZnlQcm9wZXJ0eUNoYW5nZSgnZm9jdXNzZWRMYXllcicsIGxheWVyKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2V0IGZvY3Vzc2VkIGxheWVyOiBcIiArIGxheWVyLmRldGFpbHMudXJpIHx8IFwiTmV3IENoYW5uZWxcIik7XG5cbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uID0gbGF5ZXIuc2Vzc2lvbjtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zZXRMYXllckRldGFpbHMobGF5ZXIuZGV0YWlscyk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG5cbiAgICAgICAgICAgIGlmIChsYXllciAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVycy5zcGxpY2UodGhpcy5sYXllcnMuaW5kZXhPZihsYXllciksIDEpO1xuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgICAgICAgICAgICAgIGJyaW5nVG9Gcm9udChsYXllci5jb250YWluZXJWaWV3KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHByZXZpb3VzRm9jdXNzZWRMYXllcikgdGhpcy5fc2hvd0xheWVySW5TdGFjayhwcmV2aW91c0ZvY3Vzc2VkTGF5ZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGZvY3Vzc2VkTGF5ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mb2N1c3NlZExheWVyO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRIb3N0KHVyaT86c3RyaW5nKSB7XG4gICAgcmV0dXJuIHVyaSA/IFVSSS5wYXJzZSh1cmkpLmhvc3RuYW1lIDogJyc7XG59Il19