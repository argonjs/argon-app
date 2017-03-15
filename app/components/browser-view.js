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
var observable_1 = require("data/observable");
var dialogs = require("ui/dialogs");
var applicationSettings = require("application-settings");
var vuforia = require("nativescript-vuforia");
var application = require("application");
var utils = require("utils/utils");
var AppViewModel_1 = require("./common/AppViewModel");
var argon_reality_viewers_1 = require("./common/argon-reality-viewers");
var bookmarks = require("./common/bookmarks");
var Argon = require("@argonjs/argon");
var androidLayoutObservable = new observable_1.Observable();
var TITLE_BAR_HEIGHT = 30;
var OVERVIEW_VERTICAL_PADDING = 150;
var OVERVIEW_ANIMATION_DURATION = 250;
var MIN_ANDROID_WEBVIEW_VERSION = 56;
var IGNORE_WEBVIEW_UPGRADE_KEY = 'ignore_webview_upgrade';
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
        _this._checkedVersion = false;
        _this._lastTime = Date.now();
        _this.layerContainer.horizontalAlignment = 'stretch';
        _this.layerContainer.verticalAlignment = 'stretch';
        if (_this.layerContainer.ios) {
            _this.layerContainer.ios.layer.masksToBounds = false;
        }
        else if (_this.layerContainer.android) {
            _this.layerContainer.android.setClipChildren(false);
        }
        _this.scrollView.horizontalAlignment = 'stretch';
        _this.scrollView.verticalAlignment = 'stretch';
        _this.scrollView.content = _this.layerContainer;
        if (_this.scrollView.ios) {
            _this.scrollView.ios.layer.masksToBounds = false;
        }
        else if (_this.scrollView.android) {
            _this.scrollView.android.setClipChildren(false);
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
            _this._checkWebViewVersion(webView);
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
        closeButton.style.fontSize = application.android ? 16 : 22;
        closeButton.color = new color_1.Color('black');
        grid_layout_1.GridLayout.setRow(closeButton, 0);
        grid_layout_1.GridLayout.setColumn(closeButton, 0);
        closeButton.on('tap', function () {
            _this.removeLayer(layer);
        });
        var titleLabel = new label_1.Label();
        titleLabel.horizontalAlignment = enums_1.HorizontalAlignment.stretch;
        titleLabel.verticalAlignment = application.android ? enums_1.VerticalAlignment.center : enums_1.VerticalAlignment.stretch;
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
        var _this = this;
        _super.prototype.onLoaded.call(this);
        if (this.android) {
            this.android.addOnLayoutChangeListener(new android.view.View.OnLayoutChangeListener({
                onLayoutChange: function (v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) {
                    var eventData = {
                        eventName: "customLayoutChange",
                        object: androidLayoutObservable
                    };
                    androidLayoutObservable.notify(eventData);
                }
            }));
            androidLayoutObservable.on("customLayoutChange", function () {
                _this.androidOnLayout();
            });
        }
        //Util.bringToFront(this.realityLayer.webView);
        //Util.bringToFront(this.realityLayer.touchOverlay);
        //Util.bringToFront(this.realityLayer.titleBar);
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
    BrowserView.prototype.androidOnLayout = function () {
        var width = this.getActualSize().width;
        var height = this.getActualSize().height;
        if (!this._overviewEnabled) {
            this.layerContainer.width = width;
            this.layerContainer.height = height;
        }
        this.layers.forEach(function (layer) {
            layer.containerView.width = width;
            layer.containerView.height = height;
        });
    };
    BrowserView.prototype._checkWebViewVersion = function (webView) {
        if (this._checkedVersion) {
            return;
        }
        if (applicationSettings.hasKey(IGNORE_WEBVIEW_UPGRADE_KEY)) {
            this._checkedVersion = true;
            return;
        }
        if (webView.android) {
            var version = webView.getWebViewVersion();
            console.log("android webview version: " + version);
            if (version < MIN_ANDROID_WEBVIEW_VERSION) {
                dialogs.confirm({
                    title: "Upgrade WebView",
                    message: "Your Android System WebView is out of date. We suggest at least version " + MIN_ANDROID_WEBVIEW_VERSION + ", your device currently has version " + version + ". This may result in rendering issues. Please update via the Google Play Store.",
                    okButtonText: "Upgrade",
                    cancelButtonText: "Later",
                    neutralButtonText: "Ignore"
                }).then(function (result) {
                    if (result) {
                        console.log("upgrading webview");
                        var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                        intent.setData(android.net.Uri.parse("market://details?id=com.google.android.webview"));
                        application.android.startActivity.startActivity(intent);
                    }
                    else if (result === undefined) {
                        console.log("upgrade never");
                        applicationSettings.setBoolean(IGNORE_WEBVIEW_UPGRADE_KEY, true);
                    }
                    else if (result === false) {
                        console.log("upgrade later");
                    }
                });
            }
            this._checkedVersion = true;
        }
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
        //const width = this.getMeasuredWidth();
        //const height = this.getMeasuredHeight();
        var width = this.getActualSize().width;
        var height = this.getActualSize().height;
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
        if (layer.containerView.ios) {
            layer.containerView.ios.layer.masksToBounds = true;
        }
        else if (layer.containerView.android) {
            layer.containerView.android.setClipChildren(true);
        }
        if (layer.contentView.ios) {
            layer.contentView.ios.layer.masksToBounds = true;
        }
        else if (layer.contentView.android) {
            layer.contentView.android.setClipChildren(true);
        }
        if (layer.webView && layer.webView.ios) {
            layer.webView.ios.layer.masksToBounds = true;
        }
        else if (layer.webView && layer.webView.android) {
            layer.webView.android.setClipChildren(true);
        }
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
            if (layer.containerView.ios) {
                layer.containerView.ios.layer.masksToBounds = false;
            }
            else if (layer.containerView.android) {
                layer.containerView.android.setClipChildren(false);
            }
            if (layer.contentView.ios) {
                layer.contentView.ios.layer.masksToBounds = false;
            }
            else if (layer.contentView.android) {
                layer.contentView.android.setClipChildren(false);
            }
            if (layer.webView && layer.webView.ios) {
                layer.webView.ios.layer.masksToBounds = false;
            }
            else if (layer.webView && layer.webView.android) {
                layer.webView.android.setClipChildren(false);
            }
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
        /*
        //if (this.focussedLayer.webView.src === url) this.focussedLayer.webView.reload(); // src isn't safe to use here, as it's the original url (not the current)
        if (this.focussedLayer.webView.getCurrentUrl() === url)
            this.focussedLayer.webView.reload();
        else
            this.focussedLayer.webView.src = url;
        */
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
    return URI.parse(uri).hostname;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBMkM7QUFDM0Msb0NBQXVDO0FBQ3ZDLDBEQUE2RDtBQUM3RCw4Q0FBZ0Q7QUFDaEQseUNBQTJDO0FBQzNDLG1DQUFxQztBQUVyQyxzREFBZ0U7QUFDaEUsd0VBQThFO0FBQzlFLDhDQUErQztBQUUvQyxzQ0FBdUM7QUFHdkMsSUFBSSx1QkFBdUIsR0FBRyxJQUFJLHVCQUFVLEVBQUUsQ0FBQztBQUUvQyxJQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztBQUM1QixJQUFNLHlCQUF5QixHQUFHLEdBQUcsQ0FBQztBQUN0QyxJQUFNLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztBQUN4QyxJQUFNLDJCQUEyQixHQUFHLEVBQUUsQ0FBQztBQUN2QyxJQUFNLDBCQUEwQixHQUFHLHdCQUF3QixDQUFDO0FBZTVEO0lBQWlDLCtCQUFVO0lBZ0J2QztRQUFBLFlBQ0ksaUJBQU8sU0FpQ1Y7UUFoREQscUJBQWUsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQUVsRCxlQUFTLEdBQVEsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUNuQyxnQkFBVSxHQUFHLElBQUksd0JBQVUsQ0FBQztRQUM1QixvQkFBYyxHQUFHLElBQUksd0JBQVUsQ0FBQztRQUNoQyxZQUFNLEdBQVcsRUFBRSxDQUFDO1FBR1osc0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBSXpCLHFCQUFlLEdBQUcsS0FBSyxDQUFDO1FBMlh4QixlQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFD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LE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4QixtQkFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFFRCxzQkFBSSxzQ0FBYTthQUFqQjtZQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQy9CLENBQUM7OztPQUFBO0lBQ0wsa0JBQUM7QUFBRCxDQUFDLEFBL2xCRCxDQUFpQyx3QkFBVSxHQStsQjFDO0FBL2xCWSxrQ0FBVztBQWttQnhCLGlCQUFpQixHQUFVO0lBQ3ZCLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgVVJJIGZyb20gJ3VyaWpzJztcbmltcG9ydCB7Vmlld30gZnJvbSAndWkvY29yZS92aWV3JztcbmltcG9ydCB7U2Nyb2xsVmlld30gZnJvbSAndWkvc2Nyb2xsLXZpZXcnXG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge0dyaWRMYXlvdXQsIEl0ZW1TcGVjfSBmcm9tICd1aS9sYXlvdXRzL2dyaWQtbGF5b3V0JztcbmltcG9ydCB7TGFiZWx9IGZyb20gJ3VpL2xhYmVsJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtBcmdvbldlYlZpZXd9IGZyb20gJ2FyZ29uLXdlYi12aWV3JztcbmltcG9ydCB7V2ViVmlldywgTG9hZEV2ZW50RGF0YX0gZnJvbSAndWkvd2ViLXZpZXcnXG5pbXBvcnQge1xuICAgIEFuaW1hdGlvbkN1cnZlLCBcbiAgICBWZXJ0aWNhbEFsaWdubWVudCwgXG4gICAgSG9yaXpvbnRhbEFsaWdubWVudCwgXG4gICAgVGV4dEFsaWdubWVudCxcbiAgICBWaXNpYmlsaXR5XG59IGZyb20gJ3VpL2VudW1zJztcbmltcG9ydCB7XG4gIEdlc3R1cmVUeXBlc1xufSBmcm9tICd1aS9nZXN0dXJlcyc7XG5pbXBvcnQge2JyaW5nVG9Gcm9udH0gZnJvbSAnLi9jb21tb24vdXRpbCc7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJ1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IGRpYWxvZ3MgPSByZXF1aXJlKFwidWkvZGlhbG9nc1wiKTtcbmltcG9ydCBhcHBsaWNhdGlvblNldHRpbmdzID0gcmVxdWlyZSgnYXBwbGljYXRpb24tc2V0dGluZ3MnKTtcbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSAnYXBwbGljYXRpb24nO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQge2FwcFZpZXdNb2RlbCwgTGF5ZXJEZXRhaWxzfSBmcm9tICcuL2NvbW1vbi9BcHBWaWV3TW9kZWwnXG5pbXBvcnQge05hdGl2ZXNjcmlwdEhvc3RlZFJlYWxpdHlWaWV3ZXJ9IGZyb20gJy4vY29tbW9uL2FyZ29uLXJlYWxpdHktdmlld2VycydcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2NvbW1vbi9ib29rbWFya3MnXG5cbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuXG5pbXBvcnQgb2JzZXJ2YWJsZU1vZHVsZSA9IHJlcXVpcmUoXCJkYXRhL29ic2VydmFibGVcIik7XG5sZXQgYW5kcm9pZExheW91dE9ic2VydmFibGUgPSBuZXcgT2JzZXJ2YWJsZSgpO1xuXG5jb25zdCBUSVRMRV9CQVJfSEVJR0hUID0gMzA7XG5jb25zdCBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HID0gMTUwO1xuY29uc3QgT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OID0gMjUwO1xuY29uc3QgTUlOX0FORFJPSURfV0VCVklFV19WRVJTSU9OID0gNTY7XG5jb25zdCBJR05PUkVfV0VCVklFV19VUEdSQURFX0tFWSA9ICdpZ25vcmVfd2Vidmlld191cGdyYWRlJztcblxuZXhwb3J0IGludGVyZmFjZSBMYXllciB7XG4gICAgc2Vzc2lvbj86QXJnb24uU2Vzc2lvblBvcnQsXG4gICAgY29udGFpbmVyVmlldzpHcmlkTGF5b3V0LFxuICAgIGNvbnRlbnRWaWV3OkdyaWRMYXlvdXQsXG4gICAgd2ViVmlldz86QXJnb25XZWJWaWV3LFxuICAgIHRvdWNoT3ZlcmxheTpHcmlkTGF5b3V0LFxuICAgIHRpdGxlQmFyOkdyaWRMYXlvdXQsXG4gICAgY2xvc2VCdXR0b246QnV0dG9uLFxuICAgIHRpdGxlTGFiZWw6IExhYmVsLFxuICAgIHZpc3VhbEluZGV4OiBudW1iZXIsXG4gICAgZGV0YWlsczogTGF5ZXJEZXRhaWxzXG59XG5cbmV4cG9ydCBjbGFzcyBCcm93c2VyVmlldyBleHRlbmRzIEdyaWRMYXlvdXQge1xuICAgIHJlYWxpdHlMYXllcjpMYXllcjtcbiAgICByZWFsaXR5V2Vidmlld3MgPSBuZXcgTWFwPHN0cmluZywgQXJnb25XZWJWaWV3PigpO1xuICAgIFxuICAgIHZpZGVvVmlldzpWaWV3ID0gdnVmb3JpYS52aWRlb1ZpZXc7XG4gICAgc2Nyb2xsVmlldyA9IG5ldyBTY3JvbGxWaWV3O1xuICAgIGxheWVyQ29udGFpbmVyID0gbmV3IEdyaWRMYXlvdXQ7XG4gICAgbGF5ZXJzOkxheWVyW10gPSBbXTtcbiAgICAgICAgXG4gICAgcHJpdmF0ZSBfZm9jdXNzZWRMYXllcjpMYXllcjtcbiAgICBwcml2YXRlIF9vdmVydmlld0VuYWJsZWQgPSBmYWxzZTtcbiAgICBcbiAgICBwcml2YXRlIF9pbnRlcnZhbElkPzpudW1iZXI7XG5cbiAgICBwcml2YXRlIF9jaGVja2VkVmVyc2lvbiA9IGZhbHNlO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIGlmICh0aGlzLmxheWVyQ29udGFpbmVyLmlvcykge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubGF5ZXJDb250YWluZXIuYW5kcm9pZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0aGlzLnNjcm9sbFZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5jb250ZW50ID0gdGhpcy5sYXllckNvbnRhaW5lcjtcbiAgICAgICAgaWYgKHRoaXMuc2Nyb2xsVmlldy5pb3MpIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc2Nyb2xsVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4oZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5zY3JvbGxWaWV3KTtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoXCIjNTU1XCIpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lm9uKFNjcm9sbFZpZXcuc2Nyb2xsRXZlbnQsIHRoaXMuX2FuaW1hdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgdGhlIHJlYWxpdHkgbGF5ZXJcbiAgICAgICAgdGhpcy5fY3JlYXRlUmVhbGl0eUxheWVyKCk7XG5cbiAgICAgICAgLy8gQWRkIGEgbm9ybWFsIGxheWVyIHRvIGJlIHVzZWQgd2l0aCB0aGUgdXJsIGJhci5cbiAgICAgICAgdGhpcy5hZGRMYXllcigpO1xuICAgICAgICBcbiAgICAgICAgYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpPT57XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIGZhbHNlKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jcmVhdGVSZWFsaXR5TGF5ZXIoKSB7XG4gICAgICAgIGxldCBsYXllcjpMYXllciA9IHRoaXMuX2NyZWF0ZUxheWVyKCk7XG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigweEZGMjIyMjIyKTtcbiAgICAgICAgbGF5ZXIudGl0bGVMYWJlbC5jb2xvciA9IG5ldyBDb2xvcignd2hpdGUnKTtcbiAgICAgICAgbGF5ZXIuY2xvc2VCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMudmlkZW9WaWV3KSB7XG4gICAgICAgICAgICB0aGlzLnZpZGVvVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgdGhpcy52aWRlb1ZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcucGFyZW50KSB0aGlzLnZpZGVvVmlldy5wYXJlbnQuX3JlbW92ZVZpZXcodGhpcy52aWRlb1ZpZXcpO1xuICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQodGhpcy52aWRlb1ZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXBwVmlld01vZGVsLnJlYWR5LnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZXIgPSBhcHBWaWV3TW9kZWwuYXJnb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5yZWFsaXR5Lmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdlYlZpZXcgPSB2aWV3ZXIud2ViVmlldztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3Muc2V0KHZpZXdlci51cmksIHdlYlZpZXcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS51bmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LnJlbW92ZUNoaWxkKHZpZXdlci53ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3MuZGVsZXRlKHZpZXdlci51cmkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtYW5hZ2VyLnJlYWxpdHkuY2hhbmdlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpZXdlciA9IG1hbmFnZXIucHJvdmlkZXIucmVhbGl0eS5nZXRWaWV3ZXJCeVVSSShjdXJyZW50ISkhO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBsYXllci5kZXRhaWxzO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHZpZXdlci51cmk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3VyaScsIHVyaSk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBnZXRIb3N0KHVyaSkpO1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcgPSB0aGlzLnJlYWxpdHlXZWJ2aWV3cy5nZXQodXJpKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEFyZ29uLlNlc3Npb25Qb3J0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIuc2Vzc2lvbiAmJiAhdmlld2VyLnNlc3Npb24uaXNDbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmlld2VyLnNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHZpZXdlci5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc2Vzc2lvblByb21pc2UudGhlbigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPT09IG1hbmFnZXIucmVhbGl0eS5jdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnRpdGxlKSBkZXRhaWxzLnNldCgndGl0bGUnLCAnUmVhbGl0eTogJyArIHNlc3Npb24uaW5mby50aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnJlYWxpdHlMYXllciA9IGxheWVyO1xuICAgIH1cblxuICAgIGFkZExheWVyKCkgOiBMYXllciB7XG4gICAgICAgIGNvbnN0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSBsYXllci53ZWJWaWV3ID0gbmV3IEFyZ29uV2ViVmlldztcbiAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcblxuICAgICAgICB3ZWJWaWV3Lm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldmVudERhdGE6UHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2goZXZlbnREYXRhLnByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd1cmknLCBldmVudERhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0aXRsZSc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gd2ViVmlldy50aXRsZSB8fCBnZXRIb3N0KHdlYlZpZXcudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgYm9va21hcmtzLnVwZGF0ZVRpdGxlKHdlYlZpZXcudXJsLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd0aXRsZScsIHRpdGxlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnaXNBcmdvbkFwcCc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQXJnb25BcHAgPSBldmVudERhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FyZ29uQXBwIHx8IGxheWVyID09PSB0aGlzLmZvY3Vzc2VkTGF5ZXIgfHwgdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lm9wYWNpdHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGV2ZW50RGF0YTogTG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fY2hlY2tXZWJWaWV3VmVyc2lvbih3ZWJWaWV3KTtcbiAgICAgICAgICAgIGlmICghZXZlbnREYXRhLmVycm9yICYmIHdlYlZpZXcgIT09IHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucHVzaFRvSGlzdG9yeShldmVudERhdGEudXJsLCB3ZWJWaWV3LnRpdGxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKCdzZXNzaW9uJywgKGUpPT57XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gZS5zZXNzaW9uO1xuICAgICAgICAgICAgbGF5ZXIuc2Vzc2lvbiA9IHNlc3Npb247XG4gICAgICAgICAgICBzZXNzaW9uLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICAgICAgaWYgKHdlYlZpZXcgPT09IHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyID09PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgIT09IEFyZ29uLlJvbGUuUkVBTElUWV9WSUVXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIk9ubHkgYSByZWFsaXR5IGNhbiBiZSBsb2FkZWQgaW4gdGhlIHJlYWxpdHkgbGF5ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiQSByZWFsaXR5IGNhbiBvbmx5IGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBzZXNzaW9uLmNsb3NlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgICAgIGxheWVyLnNlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5kZXRhaWxzLnNldCgnbG9nJywgd2ViVmlldy5sb2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuaXNMb2FkZWQpXG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkgdGhpcy5fc2hvd0xheWVySW5DYXJvdXNlbChsYXllcik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY3JlYXRlTGF5ZXIoKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgY29udGVudFZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgY29udGVudFZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG5cbiAgICAgICAgY29uc3QgY29udGFpbmVyVmlldyA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdsZWZ0JztcbiAgICAgICAgY29udGFpbmVyVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICd0b3AnO1xuXG4gICAgICAgIC8vIENvdmVyIHRoZSB3ZWJ2aWV3IHRvIGRldGVjdCBnZXN0dXJlcyBhbmQgZGlzYWJsZSBpbnRlcmFjdGlvblxuICAgICAgICBjb25zdCB0b3VjaE92ZXJsYXkgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuICAgICAgICB0b3VjaE92ZXJsYXkuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdG91Y2hPdmVybGF5LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkub24oR2VzdHVyZVR5cGVzLnRhcCwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlQmFyID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkUm93KG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKDEsICdzdGFyJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIudmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC50b3A7XG4gICAgICAgIHRpdGxlQmFyLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlQmFyLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigyNDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICB0aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgdGl0bGVCYXIub3BhY2l0eSA9IDA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IG5ldyBCdXR0b24oKTtcbiAgICAgICAgY2xvc2VCdXR0b24uaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgY2xvc2VCdXR0b24udmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi50ZXh0ID0gJ2Nsb3NlJztcbiAgICAgICAgY2xvc2VCdXR0b24uY2xhc3NOYW1lID0gJ21hdGVyaWFsLWljb24nO1xuICAgICAgICBjbG9zZUJ1dHRvbi5zdHlsZS5mb250U2l6ZSA9IGFwcGxpY2F0aW9uLmFuZHJvaWQgPyAxNiA6IDIyO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3coY2xvc2VCdXR0b24sIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbihjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIFxuICAgICAgICBjbG9zZUJ1dHRvbi5vbigndGFwJywgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlTGF5ZXIobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlTGFiZWwgPSBuZXcgTGFiZWwoKTtcbiAgICAgICAgdGl0bGVMYWJlbC5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUxhYmVsLnZlcnRpY2FsQWxpZ25tZW50ID0gYXBwbGljYXRpb24uYW5kcm9pZCA/IFZlcnRpY2FsQWxpZ25tZW50LmNlbnRlciA6IFZlcnRpY2FsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlTGFiZWwudGV4dEFsaWdubWVudCA9IFRleHRBbGlnbm1lbnQuY2VudGVyO1xuICAgICAgICB0aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCdibGFjaycpO1xuICAgICAgICB0aXRsZUxhYmVsLmZvbnRTaXplID0gMTQ7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Um93KHRpdGxlTGFiZWwsIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbih0aXRsZUxhYmVsLCAxKTtcbiAgICAgICAgXG4gICAgICAgIHRpdGxlQmFyLmFkZENoaWxkKGNsb3NlQnV0dG9uKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQodGl0bGVMYWJlbCk7XG4gICAgICAgIFxuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKGNvbnRlbnRWaWV3KTtcbiAgICAgICAgY29udGFpbmVyVmlldy5hZGRDaGlsZCh0b3VjaE92ZXJsYXkpO1xuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKHRpdGxlQmFyKTtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5hZGRDaGlsZChjb250YWluZXJWaWV3KTtcbiAgICAgICAgXG4gICAgICAgIHZhciBsYXllciA9IHtcbiAgICAgICAgICAgIGNvbnRhaW5lclZpZXcsXG4gICAgICAgICAgICB3ZWJWaWV3OiB1bmRlZmluZWQsXG4gICAgICAgICAgICBjb250ZW50VmlldyxcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheSxcbiAgICAgICAgICAgIHRpdGxlQmFyLFxuICAgICAgICAgICAgY2xvc2VCdXR0b24sXG4gICAgICAgICAgICB0aXRsZUxhYmVsLFxuICAgICAgICAgICAgdmlzdWFsSW5kZXg6IHRoaXMubGF5ZXJzLmxlbmd0aCxcbiAgICAgICAgICAgIGRldGFpbHM6IG5ldyBMYXllckRldGFpbHMoKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG5cbiAgICAgICAgbGF5ZXIudGl0bGVMYWJlbC5iaW5kKHtcbiAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5OiAndGl0bGUnLFxuICAgICAgICAgICAgdGFyZ2V0UHJvcGVydHk6ICd0ZXh0J1xuICAgICAgICB9LCBsYXllci5kZXRhaWxzKTtcblxuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuICAgIFxuICAgIHJlbW92ZUxheWVyQXRJbmRleChpbmRleDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyc1tpbmRleF07XG4gICAgICAgIGlmICh0eXBlb2YgbGF5ZXIgPT09ICd1bmRlZmluZWQnKSBcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgbGF5ZXIgYXQgaW5kZXggJyArIGluZGV4KTtcbiAgICAgICAgdGhpcy5sYXllcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5yZW1vdmVDaGlsZChsYXllci5jb250YWluZXJWaWV3KTsgLy8gZm9yIG5vd1xuICAgIH1cbiAgICBcbiAgICByZW1vdmVMYXllcihsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICB0aGlzLnJlbW92ZUxheWVyQXRJbmRleChpbmRleCk7XG4gICAgfVxuICAgIFxuICAgIG9uTG9hZGVkKCkge1xuICAgICAgICBzdXBlci5vbkxvYWRlZCgpO1xuICAgICAgICBpZiAodGhpcy5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuYWRkT25MYXlvdXRDaGFuZ2VMaXN0ZW5lcihuZXcgYW5kcm9pZC52aWV3LlZpZXcuT25MYXlvdXRDaGFuZ2VMaXN0ZW5lcih7XG4gICAgICAgICAgICAgICAgb25MYXlvdXRDaGFuZ2UodjogYW5kcm9pZC52aWV3LlZpZXcsIGxlZnQ6IG51bWJlciwgdG9wOiBudW1iZXIsIHJpZ2h0OiBudW1iZXIsIGJvdHRvbTogbnVtYmVyLCBvbGRMZWZ0OiBudW1iZXIsIG9sZFRvcDogbnVtYmVyLCBvbGRSaWdodDogbnVtYmVyLCBvbGRCb3R0b206IG51bWJlcik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnREYXRhOiBvYnNlcnZhYmxlTW9kdWxlLkV2ZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogXCJjdXN0b21MYXlvdXRDaGFuZ2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogYW5kcm9pZExheW91dE9ic2VydmFibGVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZS5ub3RpZnkoZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZS5vbihcImN1c3RvbUxheW91dENoYW5nZVwiLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuYW5kcm9pZE9uTGF5b3V0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLy9VdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3KTtcbiAgICAgICAgLy9VdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci50b3VjaE92ZXJsYXkpO1xuICAgICAgICAvL1V0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLnRpdGxlQmFyKTtcbiAgICB9XG4gICAgXG4gICAgb25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZSh3aWR0aE1lYXN1cmVTcGVjKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZShoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKT0+e1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN1cGVyLm9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgfVxuXG4gICAgYW5kcm9pZE9uTGF5b3V0KCkge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmdldEFjdHVhbFNpemUoKS5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcik9PntcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jaGVja1dlYlZpZXdWZXJzaW9uKHdlYlZpZXc6QXJnb25XZWJWaWV3KSB7XG4gICAgICAgIGlmICh0aGlzLl9jaGVja2VkVmVyc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcHBsaWNhdGlvblNldHRpbmdzLmhhc0tleShJR05PUkVfV0VCVklFV19VUEdSQURFX0tFWSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrZWRWZXJzaW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAod2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gKDxhbnk+d2ViVmlldykuZ2V0V2ViVmlld1ZlcnNpb24oKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5kcm9pZCB3ZWJ2aWV3IHZlcnNpb246IFwiICsgdmVyc2lvbik7XG4gICAgICAgICAgICBpZiAodmVyc2lvbiA8IE1JTl9BTkRST0lEX1dFQlZJRVdfVkVSU0lPTikge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybSh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlVwZ3JhZGUgV2ViVmlld1wiLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIllvdXIgQW5kcm9pZCBTeXN0ZW0gV2ViVmlldyBpcyBvdXQgb2YgZGF0ZS4gV2Ugc3VnZ2VzdCBhdCBsZWFzdCB2ZXJzaW9uIFwiICsgTUlOX0FORFJPSURfV0VCVklFV19WRVJTSU9OICsgXCIsIHlvdXIgZGV2aWNlIGN1cnJlbnRseSBoYXMgdmVyc2lvbiBcIiArIHZlcnNpb24gKyBcIi4gVGhpcyBtYXkgcmVzdWx0IGluIHJlbmRlcmluZyBpc3N1ZXMuIFBsZWFzZSB1cGRhdGUgdmlhIHRoZSBHb29nbGUgUGxheSBTdG9yZS5cIixcbiAgICAgICAgICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBcIlVwZ3JhZGVcIixcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJMYXRlclwiLFxuICAgICAgICAgICAgICAgICAgICBuZXV0cmFsQnV0dG9uVGV4dDogXCJJZ25vcmVcIlxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZ3JhZGluZyB3ZWJ2aWV3XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW50ZW50ID0gbmV3IGFuZHJvaWQuY29udGVudC5JbnRlbnQoYW5kcm9pZC5jb250ZW50LkludGVudC5BQ1RJT05fVklFVyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlbnQuc2V0RGF0YShhbmRyb2lkLm5ldC5VcmkucGFyc2UoXCJtYXJrZXQ6Ly9kZXRhaWxzP2lkPWNvbS5nb29nbGUuYW5kcm9pZC53ZWJ2aWV3XCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmFuZHJvaWQuc3RhcnRBY3Rpdml0eS5zdGFydEFjdGl2aXR5KGludGVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBncmFkZSBuZXZlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uU2V0dGluZ3Muc2V0Qm9vbGVhbihJR05PUkVfV0VCVklFV19VUEdSQURFX0tFWSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGdyYWRlIGxhdGVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jaGVja2VkVmVyc2lvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllclBvc2l0aW9uID0gaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HIC0gdGhpcy5zY3JvbGxWaWV3LnZlcnRpY2FsT2Zmc2V0O1xuICAgICAgICBjb25zdCBub3JtYWxpemVkUG9zaXRpb24gPSBsYXllclBvc2l0aW9uIC8gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBjb25zdCB0aGV0YSA9IE1hdGgubWluKE1hdGgubWF4KG5vcm1hbGl6ZWRQb3NpdGlvbiwgMCksIDAuODUpICogTWF0aC5QSTtcbiAgICAgICAgY29uc3Qgc2NhbGVGYWN0b3IgPSAxIC0gKE1hdGguY29zKHRoZXRhKSAvIDIgKyAwLjUpICogMC4yNTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICB4OiBzY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICB5OiBzY2FsZUZhY3RvclxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sYXN0VGltZSA9IERhdGUubm93KCk7XG4gICAgcHJpdmF0ZSBfYW5pbWF0ZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgZGVsdGFUID0gTWF0aC5taW4obm93IC0gdGhpcy5fbGFzdFRpbWUsIDMwKSAvIDEwMDA7XG4gICAgICAgIHRoaXMuX2xhc3RUaW1lID0gbm93O1xuICAgICAgICBcbiAgICAgICAgLy9jb25zdCB3aWR0aCA9IHRoaXMuZ2V0TWVhc3VyZWRXaWR0aCgpO1xuICAgICAgICAvL2NvbnN0IGhlaWdodCA9IHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmdldEFjdHVhbFNpemUoKS53aWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29udGFpbmVySGVpZ2h0ID0gaGVpZ2h0ICsgT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyAqICh0aGlzLmxheWVycy5sZW5ndGgtMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBjb250YWluZXJIZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gdGhpcy5fbGVycChsYXllci52aXN1YWxJbmRleCwgaW5kZXgsIGRlbHRhVCo0KTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IHRoaXMuX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShsYXllci52aXN1YWxJbmRleCk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnNjYWxlWCA9IHRyYW5zZm9ybS5zY2FsZS54O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5zY2FsZVkgPSB0cmFuc2Zvcm0uc2NhbGUueTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcudHJhbnNsYXRlWCA9IHRyYW5zZm9ybS50cmFuc2xhdGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcudHJhbnNsYXRlWSA9IHRyYW5zZm9ybS50cmFuc2xhdGUueTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2xlcnAoYSxiLHQpIHtcbiAgICAgICAgcmV0dXJuIGEgKyAoYi1hKSp0XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG5cbiAgICAgICAgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuaW9zKSB7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250YWluZXJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGF5ZXIuY29udGVudFZpZXcuaW9zKSB7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxheWVyLndlYlZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICBsYXllci50b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcblxuICAgICAgICAvLyBGb3IgdHJhbnNwYXJlbnQgd2Vidmlld3MsIGFkZCBhIGxpdHRsZSBiaXQgb2Ygb3BhY2l0eVxuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBuZXcgQ29sb3IoMTI4LCAyNTUsIDI1NSwgMjU1KSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuICAgICAgICBsYXllci5jb250ZW50Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OlRJVExFX0JBUl9IRUlHSFR9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFNob3cgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LnZpc2libGU7XG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBVcGRhdGUgZm9yIHRoZSBmaXJzdCB0aW1lICYgYW5pbWF0ZS5cbiAgICAgICAgY29uc3Qge3RyYW5zbGF0ZSwgc2NhbGV9ID0gdGhpcy5fY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGlkeCk7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGUsXG4gICAgICAgICAgICBzY2FsZSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfc2hvd0xheWVySW5TdGFjayhsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG5cbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSB0aGlzLmZvY3Vzc2VkTGF5ZXIgPT09IGxheWVyO1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogXG4gICAgICAgICAgICAgICAgKHRoaXMucmVhbGl0eUxheWVyID09PSBsYXllciB8fCBcbiAgICAgICAgICAgICAgICAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlzQXJnb25BcHApIHx8IFxuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllciA9PT0gbGF5ZXIpID8gXG4gICAgICAgICAgICAgICAgICAgIDEgOiAwLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBuZXcgQ29sb3IoMCwgMjU1LCAyNTUsIDI1NSksXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5jb250ZW50VmlldyAmJiBsYXllci5jb250ZW50Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4oZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGVudFZpZXcuaW9zKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gaWR4O1xuICAgICAgICByZXR1cm4gbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBzY2FsZTogeyB4OiAxLCB5OiAxIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gYW5pbWF0ZSB0aGUgdmlld3NcbiAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuX2FuaW1hdGUuYmluZCh0aGlzKSwgMjApO1xuICAgIH1cblxuICAgIGhpZGVPdmVydmlldygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgYW5pbWF0aW9ucyA9IHRoaXMubGF5ZXJzLm1hcCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaG93TGF5ZXJJblN0YWNrKGxheWVyKVxuICAgICAgICB9KTtcbiAgICAgICAgUHJvbWlzZS5hbGwoYW5pbWF0aW9ucykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIGFuaW1hdGluZyB0aGUgdmlld3NcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQpIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHVibGljIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd1cmknLHVybCk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3RpdGxlJywgZ2V0SG9zdCh1cmwpKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgnaXNGYXZvcml0ZScsZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIC8qXG4gICAgICAgIC8vaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9PT0gdXJsKSB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTsgLy8gc3JjIGlzbid0IHNhZmUgdG8gdXNlIGhlcmUsIGFzIGl0J3MgdGhlIG9yaWdpbmFsIHVybCAobm90IHRoZSBjdXJyZW50KVxuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuZ2V0Q3VycmVudFVybCgpID09PSB1cmwpXG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID0gdXJsO1xuICAgICAgICAqL1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPT09IHVybCkgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcucmVsb2FkKCk7XG4gICAgICAgICAgICBlbHNlIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9IHVybDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzZXRGb2N1c3NlZExheWVyKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLl9mb2N1c3NlZExheWVyICE9PSBsYXllcikge1xuICAgICAgICAgICAgdGhpcy5fZm9jdXNzZWRMYXllciA9IGxheWVyO1xuICAgICAgICAgICAgdGhpcy5ub3RpZnlQcm9wZXJ0eUNoYW5nZSgnZm9jdXNzZWRMYXllcicsIGxheWVyKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2V0IGZvY3Vzc2VkIGxheWVyOiBcIiArIGxheWVyLmRldGFpbHMudXJpIHx8IFwiTmV3IENoYW5uZWxcIik7XG5cbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uID0gbGF5ZXIuc2Vzc2lvbjtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zZXRMYXllckRldGFpbHMobGF5ZXIuZGV0YWlscyk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgICAgICBpZiAobGF5ZXIgIT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXllcnMuc3BsaWNlKHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpLCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcbiAgICAgICAgICAgICAgICBicmluZ1RvRnJvbnQobGF5ZXIuY29udGFpbmVyVmlldyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgZm9jdXNzZWRMYXllcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZvY3Vzc2VkTGF5ZXI7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGdldEhvc3QodXJpOnN0cmluZykge1xuICAgIHJldHVybiBVUkkucGFyc2UodXJpKS5ob3N0bmFtZTtcbn0iXX0=