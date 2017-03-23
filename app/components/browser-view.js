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
            backgroundColor: new color_1.Color(0, 255, 255, 255),
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
    BrowserView.prototype.showOverview = function () {
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
    BrowserView.prototype.hideOverview = function () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBZ0Q7QUFDaEQseUNBQTJDO0FBQzNDLG1DQUFxQztBQUVyQyxzREFBZ0U7QUFDaEUsd0VBQThFO0FBQzlFLDhDQUErQztBQUUvQyxzQ0FBdUM7QUFFdkMsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFleEM7SUFBaUMsK0JBQVU7SUFjdkM7UUFBQSxZQUNJLGlCQUFPLFNBNkJWO1FBMUNELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFFbEQsZUFBUyxHQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsZ0JBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDNUIsb0JBQWMsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDaEMsWUFBTSxHQUFXLEVBQUUsQ0FBQztRQUdaLHNCQUFnQixHQUFHLEtBQUssQ0FBQztRQW1UekIsZUFBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQTVTM0IsS0FBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUM7UUFDcEQsS0FBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFDbEQsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzFCLEtBQUksQ0FBQyxjQUFj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c291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgVVJJIGZyb20gJ3VyaWpzJztcbmltcG9ydCB7Vmlld30gZnJvbSAndWkvY29yZS92aWV3JztcbmltcG9ydCB7U2Nyb2xsVmlld30gZnJvbSAndWkvc2Nyb2xsLXZpZXcnXG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge0dyaWRMYXlvdXQsIEl0ZW1TcGVjfSBmcm9tICd1aS9sYXlvdXRzL2dyaWQtbGF5b3V0JztcbmltcG9ydCB7TGFiZWx9IGZyb20gJ3VpL2xhYmVsJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtBcmdvbldlYlZpZXd9IGZyb20gJ2FyZ29uLXdlYi12aWV3JztcbmltcG9ydCB7V2ViVmlldywgTG9hZEV2ZW50RGF0YX0gZnJvbSAndWkvd2ViLXZpZXcnXG5pbXBvcnQge1xuICAgIEFuaW1hdGlvbkN1cnZlLCBcbiAgICBWZXJ0aWNhbEFsaWdubWVudCwgXG4gICAgSG9yaXpvbnRhbEFsaWdubWVudCwgXG4gICAgVGV4dEFsaWdubWVudCxcbiAgICBWaXNpYmlsaXR5XG59IGZyb20gJ3VpL2VudW1zJztcbmltcG9ydCB7XG4gIEdlc3R1cmVUeXBlc1xufSBmcm9tICd1aS9nZXN0dXJlcyc7XG5pbXBvcnQge2JyaW5nVG9Gcm9udH0gZnJvbSAnLi9jb21tb24vdXRpbCc7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJ1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCB7YXBwVmlld01vZGVsLCBMYXllckRldGFpbHN9IGZyb20gJy4vY29tbW9uL0FwcFZpZXdNb2RlbCdcbmltcG9ydCB7TmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcn0gZnJvbSAnLi9jb21tb24vYXJnb24tcmVhbGl0eS12aWV3ZXJzJ1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tbW9uL2Jvb2ttYXJrcydcblxuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5cbmNvbnN0IFRJVExFX0JBUl9IRUlHSFQgPSAzMDtcbmNvbnN0IE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgPSAxNTA7XG5jb25zdCBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04gPSAyNTA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXIge1xuICAgIHNlc3Npb24/OkFyZ29uLlNlc3Npb25Qb3J0LFxuICAgIGNvbnRhaW5lclZpZXc6R3JpZExheW91dCxcbiAgICBjb250ZW50VmlldzpHcmlkTGF5b3V0LFxuICAgIHdlYlZpZXc/OkFyZ29uV2ViVmlldyxcbiAgICB0b3VjaE92ZXJsYXk6R3JpZExheW91dCxcbiAgICB0aXRsZUJhcjpHcmlkTGF5b3V0LFxuICAgIGNsb3NlQnV0dG9uOkJ1dHRvbixcbiAgICB0aXRsZUxhYmVsOiBMYWJlbCxcbiAgICB2aXN1YWxJbmRleDogbnVtYmVyLFxuICAgIGRldGFpbHM6IExheWVyRGV0YWlsc1xufVxuXG5leHBvcnQgY2xhc3MgQnJvd3NlclZpZXcgZXh0ZW5kcyBHcmlkTGF5b3V0IHtcbiAgICByZWFsaXR5TGF5ZXI6TGF5ZXI7XG4gICAgcmVhbGl0eVdlYnZpZXdzID0gbmV3IE1hcDxzdHJpbmcsIEFyZ29uV2ViVmlldz4oKTtcbiAgICBcbiAgICB2aWRlb1ZpZXc6VmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgIHNjcm9sbFZpZXcgPSBuZXcgU2Nyb2xsVmlldztcbiAgICBsYXllckNvbnRhaW5lciA9IG5ldyBHcmlkTGF5b3V0O1xuICAgIGxheWVyczpMYXllcltdID0gW107XG4gICAgICAgIFxuICAgIHByaXZhdGUgX2ZvY3Vzc2VkTGF5ZXI6TGF5ZXI7XG4gICAgcHJpdmF0ZSBfb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgXG4gICAgcHJpdmF0ZSBfaW50ZXJ2YWxJZD86bnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIGlmICh0aGlzLmxheWVyQ29udGFpbmVyLmlvcykge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0aGlzLnNjcm9sbFZpZXcuY29udGVudCA9IHRoaXMubGF5ZXJDb250YWluZXI7XG4gICAgICAgIGlmICh0aGlzLnNjcm9sbFZpZXcuaW9zKSB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuc2Nyb2xsVmlldyk7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKFwiIzU1NVwiKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5vbihTY3JvbGxWaWV3LnNjcm9sbEV2ZW50LCB0aGlzLl9hbmltYXRlLmJpbmQodGhpcykpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSByZWFsaXR5IGxheWVyXG4gICAgICAgIHRoaXMuX2NyZWF0ZVJlYWxpdHlMYXllcigpO1xuXG4gICAgICAgIC8vIEFkZCBhIG5vcm1hbCBsYXllciB0byBiZSB1c2VkIHdpdGggdGhlIHVybCBiYXIuXG4gICAgICAgIHRoaXMuYWRkTGF5ZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKT0+e1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0TGF5b3V0KCk7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY3JlYXRlUmVhbGl0eUxheWVyKCkge1xuICAgICAgICBsZXQgbGF5ZXI6TGF5ZXIgPSB0aGlzLl9jcmVhdGVMYXllcigpO1xuICAgICAgICBsYXllci50aXRsZUJhci5iYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoMHhGRjIyMjIyMik7XG4gICAgICAgIGxheWVyLnRpdGxlTGFiZWwuY29sb3IgPSBuZXcgQ29sb3IoJ3doaXRlJyk7XG4gICAgICAgIGxheWVyLmNsb3NlQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnZpZGVvVmlldykge1xuICAgICAgICAgICAgdGhpcy52aWRlb1ZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIHRoaXMudmlkZW9WaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgaWYgKHRoaXMudmlkZW9WaWV3LnBhcmVudCkgdGhpcy52aWRlb1ZpZXcucGFyZW50Ll9yZW1vdmVWaWV3KHRoaXMudmlkZW9WaWV3KTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFkZENoaWxkKHRoaXMudmlkZW9WaWV3KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFwcFZpZXdNb2RlbC5yZWFkeS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gYXBwVmlld01vZGVsLmFyZ29uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWJWaWV3ID0gdmlld2VyLndlYlZpZXc7XG4gICAgICAgICAgICAgICAgICAgIHdlYlZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQod2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLnNldCh2aWV3ZXIudXJpLCB3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLnJlYWxpdHkudW5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5yZW1vdmVDaGlsZCh2aWV3ZXIud2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLmRlbGV0ZSh2aWV3ZXIudXJpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWFuYWdlci5yZWFsaXR5LmNoYW5nZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ZXIgPSBtYW5hZ2VyLnByb3ZpZGVyLnJlYWxpdHkuZ2V0Vmlld2VyQnlVUkkoY3VycmVudCEpITtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXRhaWxzID0gbGF5ZXIuZGV0YWlscztcbiAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSB2aWV3ZXIudXJpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd1cmknLCB1cmkpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd0aXRsZScsICdSZWFsaXR5OiAnICsgZ2V0SG9zdCh1cmkpKTtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3ID0gdGhpcy5yZWFsaXR5V2Vidmlld3MuZ2V0KHVyaSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2Vzc2lvblByb21pc2UgPSBuZXcgUHJvbWlzZTxBcmdvbi5TZXNzaW9uUG9ydD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmlld2VyLnNlc3Npb24gJiYgIXZpZXdlci5zZXNzaW9uLmlzQ2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZpZXdlci5zZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZW1vdmUgPSB2aWV3ZXIuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHNlc3Npb24pPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHNlc3Npb25Qcm9taXNlLnRoZW4oKHNlc3Npb24pPT57XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50ID09PSBtYW5hZ2VyLnJlYWxpdHkuY3VycmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uaW5mby50aXRsZSkgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBzZXNzaW9uLmluZm8udGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIgPSBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRMYXllcigpIDogTGF5ZXIge1xuICAgICAgICBjb25zdCBsYXllcjpMYXllciA9IHRoaXMuX2NyZWF0ZUxheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gbGF5ZXIud2ViVmlldyA9IG5ldyBBcmdvbldlYlZpZXc7XG4gICAgICAgIHdlYlZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgd2ViVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQod2ViVmlldyk7XG5cbiAgICAgICAgd2ViVmlldy5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZlbnREYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkgPT4ge1xuICAgICAgICAgICAgc3dpdGNoKGV2ZW50RGF0YS5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndXJpJywgZXZlbnREYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGl0bGUnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IHdlYlZpZXcudGl0bGUgfHwgZ2V0SG9zdCh3ZWJWaWV3LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy51cGRhdGVUaXRsZSh3ZWJWaWV3LnVybCwgdGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndGl0bGUnLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2lzQXJnb25BcHAnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0FyZ29uQXBwID0gZXZlbnREYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcmdvbkFwcCB8fCBsYXllciA9PT0gdGhpcy5mb2N1c3NlZExheWVyIHx8IHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5vcGFjaXR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKFdlYlZpZXcubG9hZEZpbmlzaGVkRXZlbnQsIChldmVudERhdGE6IExvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIGlmICghZXZlbnREYXRhLmVycm9yICYmIHdlYlZpZXcgIT09IHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucHVzaFRvSGlzdG9yeShldmVudERhdGEudXJsLCB3ZWJWaWV3LnRpdGxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKCdzZXNzaW9uJywgKGUpPT57XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gZS5zZXNzaW9uO1xuICAgICAgICAgICAgbGF5ZXIuc2Vzc2lvbiA9IHNlc3Npb247XG4gICAgICAgICAgICBzZXNzaW9uLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICAgICAgaWYgKHdlYlZpZXcgPT09IHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyID09PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgIT09IEFyZ29uLlJvbGUuUkVBTElUWV9WSUVXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIk9ubHkgYSByZWFsaXR5IGNhbiBiZSBsb2FkZWQgaW4gdGhlIHJlYWxpdHkgbGF5ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiQSByZWFsaXR5IGNhbiBvbmx5IGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBzZXNzaW9uLmNsb3NlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgICAgIGxheWVyLnNlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5kZXRhaWxzLnNldCgnbG9nJywgd2ViVmlldy5sb2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuaXNMb2FkZWQpXG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkgdGhpcy5fc2hvd0xheWVySW5DYXJvdXNlbChsYXllcik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY3JlYXRlTGF5ZXIoKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgY29udGVudFZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgY29udGVudFZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG5cbiAgICAgICAgY29uc3QgY29udGFpbmVyVmlldyA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdsZWZ0JztcbiAgICAgICAgY29udGFpbmVyVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICd0b3AnO1xuXG4gICAgICAgIC8vIENvdmVyIHRoZSB3ZWJ2aWV3IHRvIGRldGVjdCBnZXN0dXJlcyBhbmQgZGlzYWJsZSBpbnRlcmFjdGlvblxuICAgICAgICBjb25zdCB0b3VjaE92ZXJsYXkgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuICAgICAgICB0b3VjaE92ZXJsYXkuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdG91Y2hPdmVybGF5LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkub24oR2VzdHVyZVR5cGVzLnRhcCwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlQmFyID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkUm93KG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKDEsICdzdGFyJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIudmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC50b3A7XG4gICAgICAgIHRpdGxlQmFyLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlQmFyLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigyNDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICB0aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgdGl0bGVCYXIub3BhY2l0eSA9IDA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IG5ldyBCdXR0b24oKTtcbiAgICAgICAgY2xvc2VCdXR0b24uaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgY2xvc2VCdXR0b24udmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi50ZXh0ID0gJ2Nsb3NlJztcbiAgICAgICAgY2xvc2VCdXR0b24uY2xhc3NOYW1lID0gJ21hdGVyaWFsLWljb24nO1xuICAgICAgICBjbG9zZUJ1dHRvbi5zdHlsZS5mb250U2l6ZSA9IDIyO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3coY2xvc2VCdXR0b24sIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbihjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIFxuICAgICAgICBjbG9zZUJ1dHRvbi5vbigndGFwJywgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlTGF5ZXIobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlTGFiZWwgPSBuZXcgTGFiZWwoKTtcbiAgICAgICAgdGl0bGVMYWJlbC5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUxhYmVsLnZlcnRpY2FsQWxpZ25tZW50ID0gVmVydGljYWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVMYWJlbC50ZXh0QWxpZ25tZW50ID0gVGV4dEFsaWdubWVudC5jZW50ZXI7XG4gICAgICAgIHRpdGxlTGFiZWwuY29sb3IgPSBuZXcgQ29sb3IoJ2JsYWNrJyk7XG4gICAgICAgIHRpdGxlTGFiZWwuZm9udFNpemUgPSAxNDtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3codGl0bGVMYWJlbCwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKHRpdGxlTGFiZWwsIDEpO1xuICAgICAgICBcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQoY2xvc2VCdXR0b24pO1xuICAgICAgICB0aXRsZUJhci5hZGRDaGlsZCh0aXRsZUxhYmVsKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQoY29udGVudFZpZXcpO1xuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKHRvdWNoT3ZlcmxheSk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQodGl0bGVCYXIpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFkZENoaWxkKGNvbnRhaW5lclZpZXcpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGxheWVyID0ge1xuICAgICAgICAgICAgY29udGFpbmVyVmlldyxcbiAgICAgICAgICAgIHdlYlZpZXc6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGNvbnRlbnRWaWV3LFxuICAgICAgICAgICAgdG91Y2hPdmVybGF5LFxuICAgICAgICAgICAgdGl0bGVCYXIsXG4gICAgICAgICAgICBjbG9zZUJ1dHRvbixcbiAgICAgICAgICAgIHRpdGxlTGFiZWwsXG4gICAgICAgICAgICB2aXN1YWxJbmRleDogdGhpcy5sYXllcnMubGVuZ3RoLFxuICAgICAgICAgICAgZGV0YWlsczogbmV3IExheWVyRGV0YWlscygpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcblxuICAgICAgICBsYXllci50aXRsZUxhYmVsLmJpbmQoe1xuICAgICAgICAgICAgc291cmNlUHJvcGVydHk6ICd0aXRsZScsXG4gICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eTogJ3RleHQnXG4gICAgICAgIH0sIGxheWVyLmRldGFpbHMpO1xuXG4gICAgICAgIHJldHVybiBsYXllcjtcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXJBdEluZGV4KGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllciA9IHRoaXMubGF5ZXJzW2luZGV4XTtcbiAgICAgICAgaWYgKHR5cGVvZiBsYXllciA9PT0gJ3VuZGVmaW5lZCcpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBsYXllciBhdCBpbmRleCAnICsgaW5kZXgpO1xuICAgICAgICB0aGlzLmxheWVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLnJlbW92ZUNoaWxkKGxheWVyLmNvbnRhaW5lclZpZXcpOyAvLyBmb3Igbm93XG4gICAgfVxuICAgIFxuICAgIHJlbW92ZUxheWVyKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG4gICAgICAgIHRoaXMucmVtb3ZlTGF5ZXJBdEluZGV4KGluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgb25Mb2FkZWQoKSB7XG4gICAgICAgIHN1cGVyLm9uTG9hZGVkKCk7XG4gICAgfVxuICAgIFxuICAgIG9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYykge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUod2lkdGhNZWFzdXJlU3BlYyk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUoaGVpZ2h0TWVhc3VyZVNwZWMpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcik9PntcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHN1cGVyLm9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShpbmRleDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbGF5ZXJQb3NpdGlvbiA9IGluZGV4ICogT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyAtIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbE9mZnNldDtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBvc2l0aW9uID0gbGF5ZXJQb3NpdGlvbiAvIHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgY29uc3QgdGhldGEgPSBNYXRoLm1pbihNYXRoLm1heChub3JtYWxpemVkUG9zaXRpb24sIDApLCAwLjg1KSAqIE1hdGguUEk7XG4gICAgICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gMSAtIChNYXRoLmNvcyh0aGV0YSkgLyAyICsgMC41KSAqIDAuMjU7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHtcbiAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgIHk6IGluZGV4ICogT1ZFUlZJRVdfVkVSVElDQUxfUEFERElOR1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgeDogc2NhbGVGYWN0b3IsXG4gICAgICAgICAgICAgICAgeTogc2NhbGVGYWN0b3JcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfbGFzdFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIHByaXZhdGUgX2FuaW1hdGUoKSB7XG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGRlbHRhVCA9IE1hdGgubWluKG5vdyAtIHRoaXMuX2xhc3RUaW1lLCAzMCkgLyAxMDAwO1xuICAgICAgICB0aGlzLl9sYXN0VGltZSA9IG5vdztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5nZXRNZWFzdXJlZFdpZHRoKCk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lckhlaWdodCA9IGhlaWdodCArIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgKiAodGhpcy5sYXllcnMubGVuZ3RoLTEpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gY29udGFpbmVySGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBsYXllci52aXN1YWxJbmRleCA9IHRoaXMuX2xlcnAobGF5ZXIudmlzdWFsSW5kZXgsIGluZGV4LCBkZWx0YVQqNCk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSB0aGlzLl9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0obGF5ZXIudmlzdWFsSW5kZXgpO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5zY2FsZVggPSB0cmFuc2Zvcm0uc2NhbGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuc2NhbGVZID0gdHJhbnNmb3JtLnNjYWxlLnk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnRyYW5zbGF0ZVggPSB0cmFuc2Zvcm0udHJhbnNsYXRlLng7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnRyYW5zbGF0ZVkgPSB0cmFuc2Zvcm0udHJhbnNsYXRlLnk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sZXJwKGEsYix0KSB7XG4gICAgICAgIHJldHVybiBhICsgKGItYSkqdFxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuXG4gICAgICAgIGlmIChsYXllci5jb250YWluZXJWaWV3LmlvcylcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuXG4gICAgICAgIGlmIChsYXllci5jb250ZW50Vmlldy5pb3MpXG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlvcylcbiAgICAgICAgICAgIGxheWVyLndlYlZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuXG4gICAgICAgIC8vIEZvciB0cmFuc3BhcmVudCB3ZWJ2aWV3cywgYWRkIGEgbGl0dGxlIGJpdCBvZiBvcGFjaXR5XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG5ldyBDb2xvcigxMjgsIDI1NSwgMjU1LCAyNTUpLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgfSk7XG4gICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6VElUTEVfQkFSX0hFSUdIVH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gU2hvdyB0aXRsZWJhcnNcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkudmlzaWJsZTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3IgdGhlIGZpcnN0IHRpbWUgJiBhbmltYXRlLlxuICAgICAgICBjb25zdCB7dHJhbnNsYXRlLCBzY2FsZX0gPSB0aGlzLl9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0oaWR4KTtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZSxcbiAgICAgICAgICAgIHNjYWxlLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXQsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJblN0YWNrKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgbGF5ZXIudG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcblxuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IHRoaXMuZm9jdXNzZWRMYXllciA9PT0gbGF5ZXI7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiBcbiAgICAgICAgICAgICAgICAodGhpcy5yZWFsaXR5TGF5ZXIgPT09IGxheWVyIHx8IFxuICAgICAgICAgICAgICAgIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuaXNBcmdvbkFwcCkgfHwgXG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyID09PSBsYXllcikgPyBcbiAgICAgICAgICAgICAgICAgICAgMSA6IDAsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxheWVyLmNvbnRlbnRWaWV3ICYmIGxheWVyLmNvbnRlbnRWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6MH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGlmIChsYXllci5jb250YWluZXJWaWV3LmlvcylcbiAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGVudFZpZXcuaW9zKVxuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlvcylcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gaWR4O1xuICAgICAgICByZXR1cm4gbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBzY2FsZTogeyB4OiAxLCB5OiAxIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gYW5pbWF0ZSB0aGUgdmlld3NcbiAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuX2FuaW1hdGUuYmluZCh0aGlzKSwgMjApO1xuICAgIH1cblxuICAgIGhpZGVPdmVydmlldygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgYW5pbWF0aW9ucyA9IHRoaXMubGF5ZXJzLm1hcCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaG93TGF5ZXJJblN0YWNrKGxheWVyKVxuICAgICAgICB9KTtcbiAgICAgICAgUHJvbWlzZS5hbGwoYW5pbWF0aW9ucykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIGFuaW1hdGluZyB0aGUgdmlld3NcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQpIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHVibGljIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd1cmknLHVybCk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3RpdGxlJywgZ2V0SG9zdCh1cmwpKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgnaXNGYXZvcml0ZScsZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9PT0gdXJsKSB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID0gdXJsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNldEZvY3Vzc2VkTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgIT09IGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLl9mb2N1c3NlZExheWVyID0gbGF5ZXI7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeVByb3BlcnR5Q2hhbmdlKCdmb2N1c3NlZExheWVyJywgbGF5ZXIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTZXQgZm9jdXNzZWQgbGF5ZXI6IFwiICsgbGF5ZXIuZGV0YWlscy51cmkgfHwgXCJOZXcgQ2hhbm5lbFwiKTtcblxuICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb24gPSBsYXllci5zZXNzaW9uO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLnNldExheWVyRGV0YWlscyhsYXllci5kZXRhaWxzKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlT3ZlcnZpZXcoKTtcbiAgICAgICAgICAgIGlmIChsYXllciAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVycy5zcGxpY2UodGhpcy5sYXllcnMuaW5kZXhPZihsYXllciksIDEpO1xuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgICAgICAgICAgICAgIGJyaW5nVG9Gcm9udChsYXllci5jb250YWluZXJWaWV3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBmb2N1c3NlZExheWVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZm9jdXNzZWRMYXllcjtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0SG9zdCh1cmk/OnN0cmluZykge1xuICAgIHJldHVybiB1cmkgPyBVUkkucGFyc2UodXJpKS5ob3N0bmFtZSA6ICcnO1xufSJdfQ==