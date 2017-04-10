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
                if (_this.focussedLayer && webView === _this.focussedLayer.webView) {
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
        if (!this.focussedLayer)
            this.setFocussedLayer(this.layers[this.layers.length - 1]);
        if (this.focussedLayer && this.focussedLayer !== this.realityLayer) {
            this.focussedLayer.details.set('uri', url);
            this.focussedLayer.details.set('title', getHost(url));
            this.focussedLayer.details.set('isFavorite', false);
        }
        if (this.focussedLayer && this.focussedLayer.webView) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBZ0Q7QUFDaEQseUNBQTJDO0FBQzNDLG1DQUFxQztBQUVyQyxzREFBZ0U7QUFDaEUsd0VBQThFO0FBQzlFLDhDQUErQztBQUUvQyxzQ0FBdUM7QUFFdkMsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFleEM7SUFBaUMsK0JBQVU7SUFjdkM7UUFBQSxZQUNJLGlCQUFPLFNBNkJWO1FBMUNELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFFbEQsZUFBUyxHQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsZ0JBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDNUIsb0JBQWMsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDaEMsWUFBTSxHQUFXLEVBQUUsQ0FBQztRQUdaLHNCQUFnQixHQUFHLEtBQUssQ0FBQztRQTRUekIsZUFBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQXlFdkIsMkJBQXFCLEdBQUcsSUFBSSxhQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUE5WHhELEtBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQ3BELEtBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1FB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LENBQUM7WUFDNUMsMkJBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUU1QixFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDeEIsbUJBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDdEMsQ0FBQztZQUVELEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO2dCQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdFLENBQUM7SUFDTCxDQUFDO0lBRUQsc0JBQUksc0NBQWE7YUFBakI7WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUMvQixDQUFDOzs7T0FBQTtJQUNMLGtCQUFDO0FBQUQsQ0FBQyxBQXRnQkQsQ0FBaUMsd0JBQVUsR0FzZ0IxQztBQXRnQlksa0NBQVc7QUF5Z0J4QixpQkFBaUIsR0FBVztJQUN4QixNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztBQUM5QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgVVJJIGZyb20gJ3VyaWpzJztcbmltcG9ydCB7Vmlld30gZnJvbSAndWkvY29yZS92aWV3JztcbmltcG9ydCB7U2Nyb2xsVmlld30gZnJvbSAndWkvc2Nyb2xsLXZpZXcnXG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge0dyaWRMYXlvdXQsIEl0ZW1TcGVjfSBmcm9tICd1aS9sYXlvdXRzL2dyaWQtbGF5b3V0JztcbmltcG9ydCB7TGFiZWx9IGZyb20gJ3VpL2xhYmVsJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtBcmdvbldlYlZpZXd9IGZyb20gJ2FyZ29uLXdlYi12aWV3JztcbmltcG9ydCB7V2ViVmlldywgTG9hZEV2ZW50RGF0YX0gZnJvbSAndWkvd2ViLXZpZXcnXG5pbXBvcnQge1xuICAgIEFuaW1hdGlvbkN1cnZlLCBcbiAgICBWZXJ0aWNhbEFsaWdubWVudCwgXG4gICAgSG9yaXpvbnRhbEFsaWdubWVudCwgXG4gICAgVGV4dEFsaWdubWVudCxcbiAgICBWaXNpYmlsaXR5XG59IGZyb20gJ3VpL2VudW1zJztcbmltcG9ydCB7XG4gIEdlc3R1cmVUeXBlc1xufSBmcm9tICd1aS9nZXN0dXJlcyc7XG5pbXBvcnQge2JyaW5nVG9Gcm9udH0gZnJvbSAnLi9jb21tb24vdXRpbCc7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJ1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCB7YXBwVmlld01vZGVsLCBMYXllckRldGFpbHN9IGZyb20gJy4vY29tbW9uL0FwcFZpZXdNb2RlbCdcbmltcG9ydCB7TmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcn0gZnJvbSAnLi9jb21tb24vYXJnb24tcmVhbGl0eS12aWV3ZXJzJ1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tbW9uL2Jvb2ttYXJrcydcblxuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5cbmNvbnN0IFRJVExFX0JBUl9IRUlHSFQgPSAzMDtcbmNvbnN0IE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgPSAxNTA7XG5jb25zdCBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04gPSAyNTA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXIge1xuICAgIHNlc3Npb24/OkFyZ29uLlNlc3Npb25Qb3J0LFxuICAgIGNvbnRhaW5lclZpZXc6R3JpZExheW91dCxcbiAgICBjb250ZW50VmlldzpHcmlkTGF5b3V0LFxuICAgIHdlYlZpZXc/OkFyZ29uV2ViVmlldyxcbiAgICB0b3VjaE92ZXJsYXk6R3JpZExheW91dCxcbiAgICB0aXRsZUJhcjpHcmlkTGF5b3V0LFxuICAgIGNsb3NlQnV0dG9uOkJ1dHRvbixcbiAgICB0aXRsZUxhYmVsOiBMYWJlbCxcbiAgICB2aXN1YWxJbmRleDogbnVtYmVyLFxuICAgIGRldGFpbHM6IExheWVyRGV0YWlsc1xufVxuXG5leHBvcnQgY2xhc3MgQnJvd3NlclZpZXcgZXh0ZW5kcyBHcmlkTGF5b3V0IHtcbiAgICByZWFsaXR5TGF5ZXI6TGF5ZXI7XG4gICAgcmVhbGl0eVdlYnZpZXdzID0gbmV3IE1hcDxzdHJpbmcsIEFyZ29uV2ViVmlldz4oKTtcbiAgICBcbiAgICB2aWRlb1ZpZXc6VmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgIHNjcm9sbFZpZXcgPSBuZXcgU2Nyb2xsVmlldztcbiAgICBsYXllckNvbnRhaW5lciA9IG5ldyBHcmlkTGF5b3V0O1xuICAgIGxheWVyczpMYXllcltdID0gW107XG4gICAgICAgIFxuICAgIHByaXZhdGUgX2ZvY3Vzc2VkTGF5ZXI/OkxheWVyO1xuICAgIHByaXZhdGUgX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgIFxuICAgIHByaXZhdGUgX2ludGVydmFsSWQ/Om51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBpZiAodGhpcy5sYXllckNvbnRhaW5lci5pb3MpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmNvbnRlbnQgPSB0aGlzLmxheWVyQ29udGFpbmVyO1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxWaWV3Lmlvcykge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnNjcm9sbFZpZXcpO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcihcIiM1NTVcIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcub24oU2Nyb2xsVmlldy5zY3JvbGxFdmVudCwgdGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVhbGl0eSBsYXllclxuICAgICAgICB0aGlzLl9jcmVhdGVSZWFsaXR5TGF5ZXIoKTtcblxuICAgICAgICAvLyBBZGQgYSBub3JtYWwgbGF5ZXIgdG8gYmUgdXNlZCB3aXRoIHRoZSB1cmwgYmFyLlxuICAgICAgICB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdExheW91dCgpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZVJlYWxpdHlMYXllcigpIHtcbiAgICAgICAgbGV0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDB4RkYyMjIyMjIpO1xuICAgICAgICBsYXllci50aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCd3aGl0ZScpO1xuICAgICAgICBsYXllci5jbG9zZUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcpIHtcbiAgICAgICAgICAgIHRoaXMudmlkZW9WaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICB0aGlzLnZpZGVvVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZGVvVmlldy5wYXJlbnQpIHRoaXMudmlkZW9WaWV3LnBhcmVudC5fcmVtb3ZlVmlldyh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICBhcHBWaWV3TW9kZWwub24oJ3Byb3BlcnR5Q2hhbmdlJywgKGV2dDpQcm9wZXJ0eUNoYW5nZURhdGEpID0+IHtcbiAgICAgICAgICAgIHN3aXRjaCAoZXZ0LnByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ292ZXJ2aWV3T3Blbic6IFxuICAgICAgICAgICAgICAgICAgICBpZiAoYXBwVmlld01vZGVsLm92ZXJ2aWV3T3BlbikgdGhpcy5fc2hvd092ZXJ2aWV3KClcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0aGlzLl9oaWRlT3ZlcnZpZXcoKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXBwVmlld01vZGVsLnJlYWR5LnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZXIgPSBhcHBWaWV3TW9kZWwuYXJnb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5yZWFsaXR5Lmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdlYlZpZXcgPSB2aWV3ZXIud2ViVmlldztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3Muc2V0KHZpZXdlci51cmksIHdlYlZpZXcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS51bmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LnJlbW92ZUNoaWxkKHZpZXdlci53ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3MuZGVsZXRlKHZpZXdlci51cmkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtYW5hZ2VyLnJlYWxpdHkuY2hhbmdlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpZXdlciA9IG1hbmFnZXIucHJvdmlkZXIucmVhbGl0eS5nZXRWaWV3ZXJCeVVSSShjdXJyZW50ISkhO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBsYXllci5kZXRhaWxzO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHZpZXdlci51cmk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3VyaScsIHVyaSk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBnZXRIb3N0KHVyaSkpO1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcgPSB0aGlzLnJlYWxpdHlXZWJ2aWV3cy5nZXQodXJpKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEFyZ29uLlNlc3Npb25Qb3J0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIuc2Vzc2lvbiAmJiAhdmlld2VyLnNlc3Npb24uaXNDbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmlld2VyLnNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHZpZXdlci5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc2Vzc2lvblByb21pc2UudGhlbigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPT09IG1hbmFnZXIucmVhbGl0eS5jdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnRpdGxlKSBkZXRhaWxzLnNldCgndGl0bGUnLCAnUmVhbGl0eTogJyArIHNlc3Npb24uaW5mby50aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnJlYWxpdHlMYXllciA9IGxheWVyO1xuICAgIH1cblxuICAgIGFkZExheWVyKCkgOiBMYXllciB7XG4gICAgICAgIGNvbnN0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSBsYXllci53ZWJWaWV3ID0gbmV3IEFyZ29uV2ViVmlldztcbiAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcblxuICAgICAgICB3ZWJWaWV3Lm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldmVudERhdGE6UHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2goZXZlbnREYXRhLnByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd1cmknLCBldmVudERhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0aXRsZSc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gd2ViVmlldy50aXRsZSB8fCBnZXRIb3N0KHdlYlZpZXcudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgYm9va21hcmtzLnVwZGF0ZVRpdGxlKHdlYlZpZXcudXJsLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd0aXRsZScsIHRpdGxlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnaXNBcmdvbkFwcCc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQXJnb25BcHAgPSBldmVudERhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FyZ29uQXBwIHx8IGxheWVyID09PSB0aGlzLmZvY3Vzc2VkTGF5ZXIgfHwgdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lm9wYWNpdHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGV2ZW50RGF0YTogTG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKCFldmVudERhdGEuZXJyb3IgJiYgd2ViVmlldyAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldykge1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5wdXNoVG9IaXN0b3J5KGV2ZW50RGF0YS51cmwsIHdlYlZpZXcudGl0bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oJ3Nlc3Npb24nLCAoZSk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBlLnNlc3Npb247XG4gICAgICAgICAgICBsYXllci5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgIHNlc3Npb24uY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICYmIHdlYlZpZXcgPT09IHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyID09PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgIT09IEFyZ29uLlJvbGUuUkVBTElUWV9WSUVXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIk9ubHkgYSByZWFsaXR5IGNhbiBiZSBsb2FkZWQgaW4gdGhlIHJlYWxpdHkgbGF5ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiQSByZWFsaXR5IGNhbiBvbmx5IGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBzZXNzaW9uLmNsb3NlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgICAgIGxheWVyLnNlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5kZXRhaWxzLnNldCgnbG9nJywgd2ViVmlldy5sb2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuaXNMb2FkZWQpXG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkgdGhpcy5fc2hvd0xheWVySW5DYXJvdXNlbChsYXllcik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY3JlYXRlTGF5ZXIoKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgY29udGVudFZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgY29udGVudFZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG5cbiAgICAgICAgY29uc3QgY29udGFpbmVyVmlldyA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdsZWZ0JztcbiAgICAgICAgY29udGFpbmVyVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICd0b3AnO1xuXG4gICAgICAgIC8vIENvdmVyIHRoZSB3ZWJ2aWV3IHRvIGRldGVjdCBnZXN0dXJlcyBhbmQgZGlzYWJsZSBpbnRlcmFjdGlvblxuICAgICAgICBjb25zdCB0b3VjaE92ZXJsYXkgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuICAgICAgICB0b3VjaE92ZXJsYXkuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdG91Y2hPdmVybGF5LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkub24oR2VzdHVyZVR5cGVzLnRhcCwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlQmFyID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkUm93KG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKDEsICdzdGFyJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIudmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC50b3A7XG4gICAgICAgIHRpdGxlQmFyLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlQmFyLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigyNDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICB0aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgdGl0bGVCYXIub3BhY2l0eSA9IDA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IG5ldyBCdXR0b24oKTtcbiAgICAgICAgY2xvc2VCdXR0b24uaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgY2xvc2VCdXR0b24udmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi50ZXh0ID0gJ2Nsb3NlJztcbiAgICAgICAgY2xvc2VCdXR0b24uY2xhc3NOYW1lID0gJ21hdGVyaWFsLWljb24nO1xuICAgICAgICBjbG9zZUJ1dHRvbi5zdHlsZS5mb250U2l6ZSA9IDIyO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3coY2xvc2VCdXR0b24sIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbihjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIFxuICAgICAgICBjbG9zZUJ1dHRvbi5vbigndGFwJywgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlTGF5ZXIobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlTGFiZWwgPSBuZXcgTGFiZWwoKTtcbiAgICAgICAgdGl0bGVMYWJlbC5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUxhYmVsLnZlcnRpY2FsQWxpZ25tZW50ID0gVmVydGljYWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVMYWJlbC50ZXh0QWxpZ25tZW50ID0gVGV4dEFsaWdubWVudC5jZW50ZXI7XG4gICAgICAgIHRpdGxlTGFiZWwuY29sb3IgPSBuZXcgQ29sb3IoJ2JsYWNrJyk7XG4gICAgICAgIHRpdGxlTGFiZWwuZm9udFNpemUgPSAxNDtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3codGl0bGVMYWJlbCwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKHRpdGxlTGFiZWwsIDEpO1xuICAgICAgICBcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQoY2xvc2VCdXR0b24pO1xuICAgICAgICB0aXRsZUJhci5hZGRDaGlsZCh0aXRsZUxhYmVsKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQoY29udGVudFZpZXcpO1xuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKHRvdWNoT3ZlcmxheSk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQodGl0bGVCYXIpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFkZENoaWxkKGNvbnRhaW5lclZpZXcpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGxheWVyID0ge1xuICAgICAgICAgICAgY29udGFpbmVyVmlldyxcbiAgICAgICAgICAgIHdlYlZpZXc6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGNvbnRlbnRWaWV3LFxuICAgICAgICAgICAgdG91Y2hPdmVybGF5LFxuICAgICAgICAgICAgdGl0bGVCYXIsXG4gICAgICAgICAgICBjbG9zZUJ1dHRvbixcbiAgICAgICAgICAgIHRpdGxlTGFiZWwsXG4gICAgICAgICAgICB2aXN1YWxJbmRleDogdGhpcy5sYXllcnMubGVuZ3RoLFxuICAgICAgICAgICAgZGV0YWlsczogbmV3IExheWVyRGV0YWlscygpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcblxuICAgICAgICBsYXllci50aXRsZUxhYmVsLmJpbmQoe1xuICAgICAgICAgICAgc291cmNlUHJvcGVydHk6ICd0aXRsZScsXG4gICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eTogJ3RleHQnXG4gICAgICAgIH0sIGxheWVyLmRldGFpbHMpO1xuXG4gICAgICAgIHJldHVybiBsYXllcjtcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXJBdEluZGV4KGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllciA9IHRoaXMubGF5ZXJzW2luZGV4XTtcbiAgICAgICAgaWYgKHR5cGVvZiBsYXllciA9PT0gJ3VuZGVmaW5lZCcpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBsYXllciBhdCBpbmRleCAnICsgaW5kZXgpO1xuICAgICAgICB0aGlzLmxheWVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLnJlbW92ZUNoaWxkKGxheWVyLmNvbnRhaW5lclZpZXcpOyAvLyBmb3Igbm93XG4gICAgfVxuICAgIFxuICAgIHJlbW92ZUxheWVyKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG4gICAgICAgIHRoaXMucmVtb3ZlTGF5ZXJBdEluZGV4KGluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgb25Mb2FkZWQoKSB7XG4gICAgICAgIHN1cGVyLm9uTG9hZGVkKCk7XG4gICAgfVxuICAgIFxuICAgIG9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYykge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUod2lkdGhNZWFzdXJlU3BlYyk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUoaGVpZ2h0TWVhc3VyZVNwZWMpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcik9PntcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHN1cGVyLm9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShpbmRleDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbGF5ZXJQb3NpdGlvbiA9IGluZGV4ICogT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyAtIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbE9mZnNldDtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBvc2l0aW9uID0gbGF5ZXJQb3NpdGlvbiAvIHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgY29uc3QgdGhldGEgPSBNYXRoLm1pbihNYXRoLm1heChub3JtYWxpemVkUG9zaXRpb24sIDApLCAwLjg1KSAqIE1hdGguUEk7XG4gICAgICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gMSAtIChNYXRoLmNvcyh0aGV0YSkgLyAyICsgMC41KSAqIDAuMjU7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHtcbiAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgIHk6IGluZGV4ICogT1ZFUlZJRVdfVkVSVElDQUxfUEFERElOR1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgeDogc2NhbGVGYWN0b3IsXG4gICAgICAgICAgICAgICAgeTogc2NhbGVGYWN0b3JcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfbGFzdFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIHByaXZhdGUgX2FuaW1hdGUoKSB7XG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGRlbHRhVCA9IE1hdGgubWluKG5vdyAtIHRoaXMuX2xhc3RUaW1lLCAzMCkgLyAxMDAwO1xuICAgICAgICB0aGlzLl9sYXN0VGltZSA9IG5vdztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5nZXRNZWFzdXJlZFdpZHRoKCk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lckhlaWdodCA9IGhlaWdodCArIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgKiAodGhpcy5sYXllcnMubGVuZ3RoLTEpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gY29udGFpbmVySGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBsYXllci52aXN1YWxJbmRleCA9IHRoaXMuX2xlcnAobGF5ZXIudmlzdWFsSW5kZXgsIGluZGV4LCBkZWx0YVQqNCk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSB0aGlzLl9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0obGF5ZXIudmlzdWFsSW5kZXgpO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5zY2FsZVggPSB0cmFuc2Zvcm0uc2NhbGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuc2NhbGVZID0gdHJhbnNmb3JtLnNjYWxlLnk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnRyYW5zbGF0ZVggPSB0cmFuc2Zvcm0udHJhbnNsYXRlLng7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnRyYW5zbGF0ZVkgPSB0cmFuc2Zvcm0udHJhbnNsYXRlLnk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sZXJwKGEsYix0KSB7XG4gICAgICAgIHJldHVybiBhICsgKGItYSkqdFxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuXG4gICAgICAgIGlmIChsYXllci5jb250YWluZXJWaWV3LmlvcylcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuXG4gICAgICAgIGlmIChsYXllci5jb250ZW50Vmlldy5pb3MpXG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlvcylcbiAgICAgICAgICAgIGxheWVyLndlYlZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuXG4gICAgICAgIC8vIEZvciB0cmFuc3BhcmVudCB3ZWJ2aWV3cywgYWRkIGEgbGl0dGxlIGJpdCBvZiBvcGFjaXR5XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG5ldyBDb2xvcigxMjgsIDI1NSwgMjU1LCAyNTUpLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgfSk7XG4gICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6VElUTEVfQkFSX0hFSUdIVH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gU2hvdyB0aXRsZWJhcnNcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkudmlzaWJsZTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3IgdGhlIGZpcnN0IHRpbWUgJiBhbmltYXRlLlxuICAgICAgICBjb25zdCB7dHJhbnNsYXRlLCBzY2FsZX0gPSB0aGlzLl9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0oaWR4KTtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZSxcbiAgICAgICAgICAgIHNjYWxlLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXQsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2xheWVyQmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgIFxuICAgIHByaXZhdGUgX3Nob3dMYXllckluU3RhY2sobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG4gICAgICAgIFxuICAgICAgICBsYXllci50b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuXG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gdGhpcy5mb2N1c3NlZExheWVyID09PSBsYXllcjtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IFxuICAgICAgICAgICAgICAgICh0aGlzLnJlYWxpdHlMYXllciA9PT0gbGF5ZXIgfHwgXG4gICAgICAgICAgICAgICAgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pc0FyZ29uQXBwKSB8fCBcbiAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIgPT09IGxheWVyKSA/IFxuICAgICAgICAgICAgICAgICAgICAxIDogMCxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogdGhpcy5fbGF5ZXJCYWNrZ3JvdW5kQ29sb3IsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5jb250ZW50VmlldyAmJiBsYXllci5jb250ZW50Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5pb3MpXG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGxheWVyLmNvbnRlbnRWaWV3LmlvcylcbiAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pb3MpXG4gICAgICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIHRpdGxlYmFyc1xuICAgICAgICBsYXllci50aXRsZUJhci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGxheWVyLnRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LmNvbGxhcHNlO1xuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3IgdGhlIGZpcnN0IHRpbWUgJiBhbmltYXRlLlxuICAgICAgICBsYXllci52aXN1YWxJbmRleCA9IGlkeDtcbiAgICAgICAgcmV0dXJuIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHsgeDogMCwgeTogMCB9LFxuICAgICAgICAgICAgc2NhbGU6IHsgeDogMSwgeTogMSB9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXQsXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2hvd092ZXJ2aWV3KCkge1xuICAgICAgICBpZiAodGhpcy5fb3ZlcnZpZXdFbmFibGVkKSByZXR1cm47XG4gICAgICAgIHRoaXMuX292ZXJ2aWV3RW5hYmxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGFuaW1hdGUgdGhlIHZpZXdzXG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl9hbmltYXRlLmJpbmQodGhpcyksIDIwKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oaWRlT3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSByZXR1cm47XG4gICAgICAgIHRoaXMuX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGFuaW1hdGlvbnMgPSB0aGlzLmxheWVycy5tYXAoKGxheWVyKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2hvd0xheWVySW5TdGFjayhsYXllcilcbiAgICAgICAgfSk7XG4gICAgICAgIFByb21pc2UuYWxsKGFuaW1hdGlvbnMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICAgICAgfSwgMzApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3RvcCBhbmltYXRpbmcgdGhlIHZpZXdzXG4gICAgICAgIGlmICh0aGlzLl9pbnRlcnZhbElkKSBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbElkID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHB1YmxpYyBsb2FkVXJsKHVybDpzdHJpbmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLmZvY3Vzc2VkTGF5ZXIpIHRoaXMuc2V0Rm9jdXNzZWRMYXllcih0aGlzLmxheWVyc1t0aGlzLmxheWVycy5sZW5ndGgtMV0pO1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICYmIHRoaXMuZm9jdXNzZWRMYXllciAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgndXJpJyx1cmwpO1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd0aXRsZScsIGdldEhvc3QodXJsKSk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ2lzRmF2b3JpdGUnLGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICYmIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID09PSB1cmwpIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPSB1cmw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0Rm9jdXNzZWRMYXllcihsYXllcjpMYXllcikge1xuICAgICAgICBpZiAodGhpcy5fZm9jdXNzZWRMYXllciAhPT0gbGF5ZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzRm9jdXNzZWRMYXllciA9IHRoaXMuX2ZvY3Vzc2VkTGF5ZXI7XG4gICAgICAgICAgICB0aGlzLl9mb2N1c3NlZExheWVyID0gbGF5ZXI7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeVByb3BlcnR5Q2hhbmdlKCdmb2N1c3NlZExheWVyJywgbGF5ZXIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTZXQgZm9jdXNzZWQgbGF5ZXI6IFwiICsgbGF5ZXIuZGV0YWlscy51cmkgfHwgXCJOZXcgQ2hhbm5lbFwiKTtcblxuICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb24gPSBsYXllci5zZXNzaW9uO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLnNldExheWVyRGV0YWlscyhsYXllci5kZXRhaWxzKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlT3ZlcnZpZXcoKTtcblxuICAgICAgICAgICAgaWYgKGxheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJzLnNwbGljZSh0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKSwgMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG4gICAgICAgICAgICAgICAgYnJpbmdUb0Zyb250KGxheWVyLmNvbnRhaW5lclZpZXcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJldmlvdXNGb2N1c3NlZExheWVyKSB0aGlzLl9zaG93TGF5ZXJJblN0YWNrKHByZXZpb3VzRm9jdXNzZWRMYXllcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgZm9jdXNzZWRMYXllcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZvY3Vzc2VkTGF5ZXI7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGdldEhvc3QodXJpPzpzdHJpbmcpIHtcbiAgICByZXR1cm4gdXJpID8gVVJJLnBhcnNlKHVyaSkuaG9zdG5hbWUgOiAnJztcbn0iXX0=