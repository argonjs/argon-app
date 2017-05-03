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
var absolute_layout_1 = require("ui/layouts/absolute-layout");
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
        _this._layerBackgroundColor = new color_1.Color(0, 255, 255, 255);
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
            // this.videoView.horizontalAlignment = 'stretch';
            // this.videoView.verticalAlignment = 'stretch';
            // if (this.videoView.parent) this.videoView.parent._removeView(this.videoView);
            // layer.contentView.addChild(this.videoView);
            if (this.videoView.parent)
                this.videoView.parent._removeView(this.videoView);
            var videoViewLayout = new absolute_layout_1.AbsoluteLayout();
            videoViewLayout.addChild(this.videoView);
            layer.contentView.addChild(videoViewLayout);
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
                details.set('title', 'Reality: ' + (viewer.session && viewer.session.info.title) || getHost(uri));
                layer.webView = _this.realityWebviews.get(uri);
                if (current === Argon.RealityViewer.LIVE) {
                    vuforia.configureVuforiaSurface();
                }
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
                        layer.session = session;
                    }
                });
            });
        });
        this.realityLayer = layer;
    };
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        var layer = this._createLayer();
        var webView = layer.webView;
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
        var webView = new argon_web_view_1.ArgonWebView;
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        contentView.addChild(webView);
        var layer = {
            containerView: containerView,
            webView: webView,
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
        layer.webView && layer.webView.session && layer.webView.session.close();
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
        if (layer.session) {
            AppViewModel_1.appViewModel.argon.provider.visibility.set(layer.session, true);
        }
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
        if (application.ios) {
            // todo: this is causing issues on android, investigate further
            layer.containerView.isUserInteractionEnabled = this.focussedLayer === layer;
        }
        var visible = this.realityLayer === layer ||
            (layer.webView && layer.webView.isArgonApp) ||
            this.focussedLayer === layer;
        if (layer.session) {
            AppViewModel_1.appViewModel.argon.provider.visibility.set(layer.session, visible);
        }
        layer.containerView.animate({
            opacity: visible ? 1 : 0,
            backgroundColor: this._layerBackgroundColor,
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
            if (this.focussedLayer.webView.getCurrentUrl() === url) {
                this.focussedLayer.webView.reload();
            }
            else {
                if (this.focussedLayer.webView.src === url) {
                    // webView.src does not update when the user clicks a link on a webpage
                    // clear the src property to force a property update (note that notifyPropertyChange doesn't work here)
                    this.focussedLayer.webView.src = "";
                    this.focussedLayer.webView.src = url;
                }
                else {
                    this.focussedLayer.webView.src = url;
                }
            }
        }
    };
    BrowserView.prototype.setFocussedLayer = function (layer) {
        if (this._focussedLayer !== layer) {
            var previousFocussedLayer = this._focussedLayer;
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            console.log("Set focussed layer: " + layer.details.uri || "New Channel");
            AppViewModel_1.appViewModel.argon.provider.focus.session = layer.session;
            if (layer.session)
                AppViewModel_1.appViewModel.argon.provider.visibility.set(layer.session, true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBMkM7QUFDM0MsOERBQTBEO0FBQzFELG9DQUF1QztBQUN2QywwREFBNkQ7QUFDN0QsOENBQWdEO0FBQ2hELHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFFckMsc0RBQWdFO0FBQ2hFLHdFQUE4RTtBQUM5RSw4Q0FBK0M7QUFFL0Msc0NBQXVDO0FBR3ZDLElBQUksdUJBQXVCLEdBQUcsSUFBSSx1QkFBVSxFQUFFLENBQUM7QUFFL0MsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFDeEMsSUFBTSwyQkFBMkIsR0FBRyxFQUFFLENBQUM7QUFDdkMsSUFBTSwwQkFBMEIsR0FBRyx3QkFBd0IsQ0FBQztBQWU1RDtJQUFpQywrQkFBVTtJQWdCdkM7UUFBQSxZQUNJLGlCQUFPLFNBaUNWO1FBaERELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFFbEQsZUFBUyxHQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsZ0JBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDNUIsb0JBQWMsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDaEMsWUFBTSxHQUFXLEVBQUUsQ0FBQztRQUdaLHNCQUFnQixHQUFHLEtBQUssQ0FBQztRQUl6QixxQkFBZSxHQUFHLEtBQUssQ0FBQztRQTRZeEIsZUFBUyxHQUFHLElBQUksQ0FBQyxH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LEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4QixtQkFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN0QyxDQUFDO1lBRUQsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDN0UsQ0FBQztJQUNMLENBQUM7SUFFRCxzQkFBSSxzQ0FBYTthQUFqQjtZQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQy9CLENBQUM7OztPQUFBO0lBQ0wsa0JBQUM7QUFBRCxDQUFDLEFBem9CRCxDQUFpQyx3QkFBVSxHQXlvQjFDO0FBem9CWSxrQ0FBVztBQTRvQnhCLGlCQUFpQixHQUFXO0lBQ3hCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQzlDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnO1xuaW1wb3J0IHtWaWV3fSBmcm9tICd1aS9jb3JlL3ZpZXcnO1xuaW1wb3J0IHtTY3JvbGxWaWV3fSBmcm9tICd1aS9zY3JvbGwtdmlldydcbmltcG9ydCB7Q29sb3J9IGZyb20gJ2NvbG9yJztcbmltcG9ydCB7R3JpZExheW91dCwgSXRlbVNwZWN9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHtMYWJlbH0gZnJvbSAndWkvbGFiZWwnO1xuaW1wb3J0IHtCdXR0b259IGZyb20gJ3VpL2J1dHRvbic7XG5pbXBvcnQge0FyZ29uV2ViVmlld30gZnJvbSAnYXJnb24td2ViLXZpZXcnO1xuaW1wb3J0IHtXZWJWaWV3LCBMb2FkRXZlbnREYXRhfSBmcm9tICd1aS93ZWItdmlldydcbmltcG9ydCB7XG4gICAgQW5pbWF0aW9uQ3VydmUsIFxuICAgIFZlcnRpY2FsQWxpZ25tZW50LCBcbiAgICBIb3Jpem9udGFsQWxpZ25tZW50LCBcbiAgICBUZXh0QWxpZ25tZW50LFxuICAgIFZpc2liaWxpdHlcbn0gZnJvbSAndWkvZW51bXMnO1xuaW1wb3J0IHtcbiAgR2VzdHVyZVR5cGVzXG59IGZyb20gJ3VpL2dlc3R1cmVzJztcbmltcG9ydCB7YnJpbmdUb0Zyb250fSBmcm9tICcuL2NvbW1vbi91dGlsJztcbmltcG9ydCB7UHJvcGVydHlDaGFuZ2VEYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnXG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0Fic29sdXRlTGF5b3V0fSBmcm9tICd1aS9sYXlvdXRzL2Fic29sdXRlLWxheW91dCc7XG5pbXBvcnQgZGlhbG9ncyA9IHJlcXVpcmUoXCJ1aS9kaWFsb2dzXCIpO1xuaW1wb3J0IGFwcGxpY2F0aW9uU2V0dGluZ3MgPSByZXF1aXJlKCdhcHBsaWNhdGlvbi1zZXR0aW5ncycpO1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCB7YXBwVmlld01vZGVsLCBMYXllckRldGFpbHN9IGZyb20gJy4vY29tbW9uL0FwcFZpZXdNb2RlbCdcbmltcG9ydCB7TmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcn0gZnJvbSAnLi9jb21tb24vYXJnb24tcmVhbGl0eS12aWV3ZXJzJ1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tbW9uL2Jvb2ttYXJrcydcblxuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5cbmltcG9ydCBvYnNlcnZhYmxlTW9kdWxlID0gcmVxdWlyZShcImRhdGEvb2JzZXJ2YWJsZVwiKTtcbmxldCBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZSA9IG5ldyBPYnNlcnZhYmxlKCk7XG5cbmNvbnN0IFRJVExFX0JBUl9IRUlHSFQgPSAzMDtcbmNvbnN0IE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgPSAxNTA7XG5jb25zdCBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04gPSAyNTA7XG5jb25zdCBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04gPSA1NjtcbmNvbnN0IElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZID0gJ2lnbm9yZV93ZWJ2aWV3X3VwZ3JhZGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyIHtcbiAgICBzZXNzaW9uPzpBcmdvbi5TZXNzaW9uUG9ydCxcbiAgICBjb250YWluZXJWaWV3OkdyaWRMYXlvdXQsXG4gICAgY29udGVudFZpZXc6R3JpZExheW91dCxcbiAgICB3ZWJWaWV3OkFyZ29uV2ViVmlldyxcbiAgICB0b3VjaE92ZXJsYXk6R3JpZExheW91dCxcbiAgICB0aXRsZUJhcjpHcmlkTGF5b3V0LFxuICAgIGNsb3NlQnV0dG9uOkJ1dHRvbixcbiAgICB0aXRsZUxhYmVsOiBMYWJlbCxcbiAgICB2aXN1YWxJbmRleDogbnVtYmVyLFxuICAgIGRldGFpbHM6IExheWVyRGV0YWlsc1xufVxuXG5leHBvcnQgY2xhc3MgQnJvd3NlclZpZXcgZXh0ZW5kcyBHcmlkTGF5b3V0IHtcbiAgICByZWFsaXR5TGF5ZXI6TGF5ZXI7XG4gICAgcmVhbGl0eVdlYnZpZXdzID0gbmV3IE1hcDxzdHJpbmcsIEFyZ29uV2ViVmlldz4oKTtcbiAgICBcbiAgICB2aWRlb1ZpZXc6VmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgIHNjcm9sbFZpZXcgPSBuZXcgU2Nyb2xsVmlldztcbiAgICBsYXllckNvbnRhaW5lciA9IG5ldyBHcmlkTGF5b3V0O1xuICAgIGxheWVyczpMYXllcltdID0gW107XG4gICAgICAgIFxuICAgIHByaXZhdGUgX2ZvY3Vzc2VkTGF5ZXI/OkxheWVyO1xuICAgIHByaXZhdGUgX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgIFxuICAgIHByaXZhdGUgX2ludGVydmFsSWQ/Om51bWJlcjtcblxuICAgIHByaXZhdGUgX2NoZWNrZWRWZXJzaW9uID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJDb250YWluZXIuaW9zKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sYXllckNvbnRhaW5lci5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmNvbnRlbnQgPSB0aGlzLmxheWVyQ29udGFpbmVyO1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxWaWV3Lmlvcykge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zY3JvbGxWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnNjcm9sbFZpZXcpO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcihcIiM1NTVcIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcub24oU2Nyb2xsVmlldy5zY3JvbGxFdmVudCwgdGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVhbGl0eSBsYXllclxuICAgICAgICB0aGlzLl9jcmVhdGVSZWFsaXR5TGF5ZXIoKTtcblxuICAgICAgICAvLyBBZGQgYSBub3JtYWwgbGF5ZXIgdG8gYmUgdXNlZCB3aXRoIHRoZSB1cmwgYmFyLlxuICAgICAgICB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdExheW91dCgpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZVJlYWxpdHlMYXllcigpIHtcbiAgICAgICAgbGV0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDB4RkYyMjIyMjIpO1xuICAgICAgICBsYXllci50aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCd3aGl0ZScpO1xuICAgICAgICBsYXllci5jbG9zZUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcpIHtcbiAgICAgICAgICAgIC8vIHRoaXMudmlkZW9WaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICAvLyB0aGlzLnZpZGVvVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLnZpZGVvVmlldy5wYXJlbnQpIHRoaXMudmlkZW9WaWV3LnBhcmVudC5fcmVtb3ZlVmlldyh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICAvLyBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcucGFyZW50KSB0aGlzLnZpZGVvVmlldy5wYXJlbnQuX3JlbW92ZVZpZXcodGhpcy52aWRlb1ZpZXcpXG4gICAgICAgICAgICBjb25zdCB2aWRlb1ZpZXdMYXlvdXQgPSBuZXcgQWJzb2x1dGVMYXlvdXQoKTtcbiAgICAgICAgICAgIHZpZGVvVmlld0xheW91dC5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh2aWRlb1ZpZXdMYXlvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXBwVmlld01vZGVsLm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldnQ6UHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKGV2dC5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdvdmVydmlld09wZW4nOiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwcFZpZXdNb2RlbC5vdmVydmlld09wZW4pIHRoaXMuX3Nob3dPdmVydmlldygpXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgdGhpcy5faGlkZU92ZXJ2aWV3KClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFwcFZpZXdNb2RlbC5yZWFkeS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gYXBwVmlld01vZGVsLmFyZ29uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWJWaWV3ID0gdmlld2VyLndlYlZpZXc7XG4gICAgICAgICAgICAgICAgICAgIHdlYlZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQod2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLnNldCh2aWV3ZXIudXJpLCB3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLnJlYWxpdHkudW5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5yZW1vdmVDaGlsZCh2aWV3ZXIud2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLmRlbGV0ZSh2aWV3ZXIudXJpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWFuYWdlci5yZWFsaXR5LmNoYW5nZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ZXIgPSBtYW5hZ2VyLnByb3ZpZGVyLnJlYWxpdHkuZ2V0Vmlld2VyQnlVUkkoY3VycmVudCEpITtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXRhaWxzID0gbGF5ZXIuZGV0YWlscztcbiAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSB2aWV3ZXIudXJpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd1cmknLCB1cmkpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd0aXRsZScsICdSZWFsaXR5OiAnICsgKHZpZXdlci5zZXNzaW9uICYmIHZpZXdlci5zZXNzaW9uLmluZm8udGl0bGUpIHx8IGdldEhvc3QodXJpKSk7XG4gICAgICAgICAgICAgICAgbGF5ZXIud2ViVmlldyA9IHRoaXMucmVhbGl0eVdlYnZpZXdzLmdldCh1cmkpITtcblxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50ID09PSBBcmdvbi5SZWFsaXR5Vmlld2VyLkxJVkUpIHtcbiAgICAgICAgICAgICAgICAgICAgdnVmb3JpYS5jb25maWd1cmVWdWZvcmlhU3VyZmFjZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEFyZ29uLlNlc3Npb25Qb3J0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIuc2Vzc2lvbiAmJiAhdmlld2VyLnNlc3Npb24uaXNDbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmlld2VyLnNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHZpZXdlci5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc2Vzc2lvblByb21pc2UudGhlbigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPT09IG1hbmFnZXIucmVhbGl0eS5jdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnRpdGxlKSBkZXRhaWxzLnNldCgndGl0bGUnLCAnUmVhbGl0eTogJyArIHNlc3Npb24uaW5mby50aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucmVhbGl0eUxheWVyID0gbGF5ZXI7XG4gICAgfVxuXG4gICAgYWRkTGF5ZXIoKSA6IExheWVyIHtcbiAgICAgICAgY29uc3QgbGF5ZXI6TGF5ZXIgPSB0aGlzLl9jcmVhdGVMYXllcigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2ViVmlldyA9IGxheWVyLndlYlZpZXc7XG5cbiAgICAgICAgd2ViVmlldy5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZlbnREYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkgPT4ge1xuICAgICAgICAgICAgc3dpdGNoKGV2ZW50RGF0YS5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndXJpJywgZXZlbnREYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGl0bGUnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IHdlYlZpZXcudGl0bGUgfHwgZ2V0SG9zdCh3ZWJWaWV3LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy51cGRhdGVUaXRsZSh3ZWJWaWV3LnVybCwgdGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndGl0bGUnLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2lzQXJnb25BcHAnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0FyZ29uQXBwID0gZXZlbnREYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcmdvbkFwcCB8fCBsYXllciA9PT0gdGhpcy5mb2N1c3NlZExheWVyIHx8IHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5vcGFjaXR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKFdlYlZpZXcubG9hZEZpbmlzaGVkRXZlbnQsIChldmVudERhdGE6IExvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrV2ViVmlld1ZlcnNpb24od2ViVmlldyk7XG4gICAgICAgICAgICBpZiAoIWV2ZW50RGF0YS5lcnJvciAmJiB3ZWJWaWV3ICE9PSB0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnB1c2hUb0hpc3RvcnkoZXZlbnREYXRhLnVybCwgd2ViVmlldy50aXRsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgd2ViVmlldy5vbignc2Vzc2lvbicsIChlKT0+e1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGUuc2Vzc2lvbjtcbiAgICAgICAgICAgIGxheWVyLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgc2Vzc2lvbi5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIgJiYgd2ViVmlldyA9PT0gdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGF5ZXIgPT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSAhPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiT25seSBhIHJlYWxpdHkgY2FuIGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSA9PSBBcmdvbi5Sb2xlLlJFQUxJVFlfVklFVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJBIHJlYWxpdHkgY2FuIG9ubHkgYmUgbG9hZGVkIGluIHRoZSByZWFsaXR5IGxheWVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICAgICAgbGF5ZXIuc2Vzc2lvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCdsb2cnLCB3ZWJWaWV3LmxvZyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5pc0xvYWRlZClcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB0aGlzLl9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBsYXllcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jcmVhdGVMYXllcigpIHtcbiAgICAgICAgY29uc3QgY29udGVudFZpZXcgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICBjb250ZW50Vmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBjb250ZW50Vmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcblxuICAgICAgICBjb25zdCBjb250YWluZXJWaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgY29udGFpbmVyVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ2xlZnQnO1xuICAgICAgICBjb250YWluZXJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3RvcCc7XG5cbiAgICAgICAgLy8gQ292ZXIgdGhlIHdlYnZpZXcgdG8gZGV0ZWN0IGdlc3R1cmVzIGFuZCBkaXNhYmxlIGludGVyYWN0aW9uXG4gICAgICAgIGNvbnN0IHRvdWNoT3ZlcmxheSA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5vbihHZXN0dXJlVHlwZXMudGFwLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGVCYXIgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0aXRsZUJhci5hZGRSb3cobmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ29sdW1uKG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoMSwgJ3N0YXInKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci52ZXJ0aWNhbEFsaWdubWVudCA9IFZlcnRpY2FsQWxpZ25tZW50LnRvcDtcbiAgICAgICAgdGl0bGVCYXIuaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDI0MCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgICAgIHRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LmNvbGxhcHNlO1xuICAgICAgICB0aXRsZUJhci5vcGFjaXR5ID0gMDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gbmV3IEJ1dHRvbigpO1xuICAgICAgICBjbG9zZUJ1dHRvbi5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi52ZXJ0aWNhbEFsaWdubWVudCA9IFZlcnRpY2FsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIGNsb3NlQnV0dG9uLnRleHQgPSAnY2xvc2UnO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jbGFzc05hbWUgPSAnbWF0ZXJpYWwtaWNvbic7XG4gICAgICAgIGNsb3NlQnV0dG9uLnN0eWxlLmZvbnRTaXplID0gYXBwbGljYXRpb24uYW5kcm9pZCA/IDE2IDogMjI7XG4gICAgICAgIGNsb3NlQnV0dG9uLmNvbG9yID0gbmV3IENvbG9yKCdibGFjaycpO1xuICAgICAgICBHcmlkTGF5b3V0LnNldFJvdyhjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKGNsb3NlQnV0dG9uLCAwKTtcbiAgICAgICAgXG4gICAgICAgIGNsb3NlQnV0dG9uLm9uKCd0YXAnLCAoKT0+e1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVMYXllcihsYXllcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGVMYWJlbCA9IG5ldyBMYWJlbCgpO1xuICAgICAgICB0aXRsZUxhYmVsLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlTGFiZWwudmVydGljYWxBbGlnbm1lbnQgPSBhcHBsaWNhdGlvbi5hbmRyb2lkID8gVmVydGljYWxBbGlnbm1lbnQuY2VudGVyIDogVmVydGljYWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVMYWJlbC50ZXh0QWxpZ25tZW50ID0gVGV4dEFsaWdubWVudC5jZW50ZXI7XG4gICAgICAgIHRpdGxlTGFiZWwuY29sb3IgPSBuZXcgQ29sb3IoJ2JsYWNrJyk7XG4gICAgICAgIHRpdGxlTGFiZWwuZm9udFNpemUgPSAxNDtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3codGl0bGVMYWJlbCwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKHRpdGxlTGFiZWwsIDEpO1xuICAgICAgICBcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQoY2xvc2VCdXR0b24pO1xuICAgICAgICB0aXRsZUJhci5hZGRDaGlsZCh0aXRsZUxhYmVsKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQoY29udGVudFZpZXcpO1xuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKHRvdWNoT3ZlcmxheSk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQodGl0bGVCYXIpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFkZENoaWxkKGNvbnRhaW5lclZpZXcpO1xuXG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSBuZXcgQXJnb25XZWJWaWV3O1xuICAgICAgICB3ZWJWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHdlYlZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIGNvbnRlbnRWaWV3LmFkZENoaWxkKHdlYlZpZXcpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGxheWVyID0ge1xuICAgICAgICAgICAgY29udGFpbmVyVmlldyxcbiAgICAgICAgICAgIHdlYlZpZXcsXG4gICAgICAgICAgICBjb250ZW50VmlldyxcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheSxcbiAgICAgICAgICAgIHRpdGxlQmFyLFxuICAgICAgICAgICAgY2xvc2VCdXR0b24sXG4gICAgICAgICAgICB0aXRsZUxhYmVsLFxuICAgICAgICAgICAgdmlzdWFsSW5kZXg6IHRoaXMubGF5ZXJzLmxlbmd0aCxcbiAgICAgICAgICAgIGRldGFpbHM6IG5ldyBMYXllckRldGFpbHMoKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG5cbiAgICAgICAgbGF5ZXIudGl0bGVMYWJlbC5iaW5kKHtcbiAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5OiAndGl0bGUnLFxuICAgICAgICAgICAgdGFyZ2V0UHJvcGVydHk6ICd0ZXh0J1xuICAgICAgICB9LCBsYXllci5kZXRhaWxzKTtcblxuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuICAgIFxuICAgIHJlbW92ZUxheWVyQXRJbmRleChpbmRleDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyc1tpbmRleF07XG4gICAgICAgIGlmICh0eXBlb2YgbGF5ZXIgPT09ICd1bmRlZmluZWQnKSBcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgbGF5ZXIgYXQgaW5kZXggJyArIGluZGV4KTtcbiAgICAgICAgbGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LnNlc3Npb24gJiYgbGF5ZXIud2ViVmlldy5zZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgIHRoaXMubGF5ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIucmVtb3ZlQ2hpbGQobGF5ZXIuY29udGFpbmVyVmlldyk7IC8vIGZvciBub3dcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgdGhpcy5yZW1vdmVMYXllckF0SW5kZXgoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBvbkxvYWRlZCgpIHtcbiAgICAgICAgc3VwZXIub25Mb2FkZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuYW5kcm9pZCkge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLmFkZE9uTGF5b3V0Q2hhbmdlTGlzdGVuZXIobmV3IGFuZHJvaWQudmlldy5WaWV3Lk9uTGF5b3V0Q2hhbmdlTGlzdGVuZXIoe1xuICAgICAgICAgICAgICAgIG9uTGF5b3V0Q2hhbmdlKHY6IGFuZHJvaWQudmlldy5WaWV3LCBsZWZ0OiBudW1iZXIsIHRvcDogbnVtYmVyLCByaWdodDogbnVtYmVyLCBib3R0b206IG51bWJlciwgb2xkTGVmdDogbnVtYmVyLCBvbGRUb3A6IG51bWJlciwgb2xkUmlnaHQ6IG51bWJlciwgb2xkQm90dG9tOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50RGF0YTogb2JzZXJ2YWJsZU1vZHVsZS5FdmVudERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudE5hbWU6IFwiY3VzdG9tTGF5b3V0Q2hhbmdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGFuZHJvaWRMYXlvdXRPYnNlcnZhYmxlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYW5kcm9pZExheW91dE9ic2VydmFibGUubm90aWZ5KGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgYW5kcm9pZExheW91dE9ic2VydmFibGUub24oXCJjdXN0b21MYXlvdXRDaGFuZ2VcIiwgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLmFuZHJvaWRPbkxheW91dCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBvbk1lYXN1cmUod2lkdGhNZWFzdXJlU3BlYywgaGVpZ2h0TWVhc3VyZVNwZWMpIHtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB1dGlscy5sYXlvdXQuZ2V0TWVhc3VyZVNwZWNTaXplKHdpZHRoTWVhc3VyZVNwZWMpO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB1dGlscy5sYXlvdXQuZ2V0TWVhc3VyZVNwZWNTaXplKGhlaWdodE1lYXN1cmVTcGVjKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpPT57XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3VwZXIub25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKTtcbiAgICB9XG5cbiAgICBhbmRyb2lkT25MYXlvdXQoKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5nZXRBY3R1YWxTaXplKCkud2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodDtcblxuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKT0+e1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NoZWNrV2ViVmlld1ZlcnNpb24od2ViVmlldzpBcmdvbldlYlZpZXcpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NoZWNrZWRWZXJzaW9uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uU2V0dGluZ3MuaGFzS2V5KElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZKSkge1xuICAgICAgICAgICAgdGhpcy5fY2hlY2tlZFZlcnNpb24gPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3ZWJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSAoPGFueT53ZWJWaWV3KS5nZXRXZWJWaWV3VmVyc2lvbigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmRyb2lkIHdlYnZpZXcgdmVyc2lvbjogXCIgKyB2ZXJzaW9uKTtcbiAgICAgICAgICAgIGlmICh2ZXJzaW9uIDwgTUlOX0FORFJPSURfV0VCVklFV19WRVJTSU9OKSB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiVXBncmFkZSBXZWJWaWV3XCIsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiWW91ciBBbmRyb2lkIFN5c3RlbSBXZWJWaWV3IGlzIG91dCBvZiBkYXRlLiBXZSBzdWdnZXN0IGF0IGxlYXN0IHZlcnNpb24gXCIgKyBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04gKyBcIiwgeW91ciBkZXZpY2UgY3VycmVudGx5IGhhcyB2ZXJzaW9uIFwiICsgdmVyc2lvbiArIFwiLiBUaGlzIG1heSByZXN1bHQgaW4gcmVuZGVyaW5nIGlzc3Vlcy4gUGxlYXNlIHVwZGF0ZSB2aWEgdGhlIEdvb2dsZSBQbGF5IFN0b3JlLlwiLFxuICAgICAgICAgICAgICAgICAgICBva0J1dHRvblRleHQ6IFwiVXBncmFkZVwiLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkxhdGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIG5ldXRyYWxCdXR0b25UZXh0OiBcIklnbm9yZVwiXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBncmFkaW5nIHdlYnZpZXdcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXcgYW5kcm9pZC5jb250ZW50LkludGVudChhbmRyb2lkLmNvbnRlbnQuSW50ZW50LkFDVElPTl9WSUVXKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVudC5zZXREYXRhKGFuZHJvaWQubmV0LlVyaS5wYXJzZShcIm1hcmtldDovL2RldGFpbHM/aWQ9Y29tLmdvb2dsZS5hbmRyb2lkLndlYnZpZXdcIikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uYW5kcm9pZC5zdGFydEFjdGl2aXR5LnN0YXJ0QWN0aXZpdHkoaW50ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGdyYWRlIG5ldmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb25TZXR0aW5ncy5zZXRCb29sZWFuKElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZ3JhZGUgbGF0ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2NoZWNrZWRWZXJzaW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0oaW5kZXg6bnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxheWVyUG9zaXRpb24gPSBpbmRleCAqIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgLSB0aGlzLnNjcm9sbFZpZXcudmVydGljYWxPZmZzZXQ7XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQb3NpdGlvbiA9IGxheWVyUG9zaXRpb24gLyB0aGlzLmdldE1lYXN1cmVkSGVpZ2h0KCk7XG4gICAgICAgIGNvbnN0IHRoZXRhID0gTWF0aC5taW4oTWF0aC5tYXgobm9ybWFsaXplZFBvc2l0aW9uLCAwKSwgMC44NSkgKiBNYXRoLlBJO1xuICAgICAgICBjb25zdCBzY2FsZUZhY3RvciA9IDEgLSAoTWF0aC5jb3ModGhldGEpIC8gMiArIDAuNSkgKiAwLjI1O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7XG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiBpbmRleCAqIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgIHg6IHNjYWxlRmFjdG9yLFxuICAgICAgICAgICAgICAgIHk6IHNjYWxlRmFjdG9yXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2xhc3RUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBwcml2YXRlIF9hbmltYXRlKCkge1xuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICBjb25zdCBkZWx0YVQgPSBNYXRoLm1pbihub3cgLSB0aGlzLl9sYXN0VGltZSwgMzApIC8gMTAwMDtcbiAgICAgICAgdGhpcy5fbGFzdFRpbWUgPSBub3c7XG4gICAgICAgIFxuICAgICAgICAvL2NvbnN0IHdpZHRoID0gdGhpcy5nZXRNZWFzdXJlZFdpZHRoKCk7XG4gICAgICAgIC8vY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmdldEFjdHVhbFNpemUoKS5oZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb250YWluZXJIZWlnaHQgPSBoZWlnaHQgKyBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HICogKHRoaXMubGF5ZXJzLmxlbmd0aC0xKTtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhlaWdodCA9IGNvbnRhaW5lckhlaWdodDtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgbGF5ZXIudmlzdWFsSW5kZXggPSB0aGlzLl9sZXJwKGxheWVyLnZpc3VhbEluZGV4LCBpbmRleCwgZGVsdGFUKjQpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5fY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGxheWVyLnZpc3VhbEluZGV4KTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuc2NhbGVYID0gdHJhbnNmb3JtLnNjYWxlLng7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnNjYWxlWSA9IHRyYW5zZm9ybS5zY2FsZS55O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy50cmFuc2xhdGVYID0gdHJhbnNmb3JtLnRyYW5zbGF0ZS54O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy50cmFuc2xhdGVZID0gdHJhbnNmb3JtLnRyYW5zbGF0ZS55O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfbGVycChhLGIsdCkge1xuICAgICAgICByZXR1cm4gYSArIChiLWEpKnRcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfc2hvd0xheWVySW5DYXJvdXNlbChsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcblxuICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5pb3MpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsYXllci5jb250ZW50Vmlldy5pb3MpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250ZW50Vmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuaW9zKSB7XG4gICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuXG4gICAgICAgIGlmIChsYXllci5zZXNzaW9uKSB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIudmlzaWJpbGl0eS5zZXQobGF5ZXIuc2Vzc2lvbiwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgdHJhbnNwYXJlbnQgd2Vidmlld3MsIGFkZCBhIGxpdHRsZSBiaXQgb2Ygb3BhY2l0eVxuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBuZXcgQ29sb3IoMTI4LCAyNTUsIDI1NSwgMjU1KSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuICAgICAgICBsYXllci5jb250ZW50Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OlRJVExFX0JBUl9IRUlHSFR9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFNob3cgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LnZpc2libGU7XG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBVcGRhdGUgZm9yIHRoZSBmaXJzdCB0aW1lICYgYW5pbWF0ZS5cbiAgICAgICAgY29uc3Qge3RyYW5zbGF0ZSwgc2NhbGV9ID0gdGhpcy5fY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGlkeCk7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGUsXG4gICAgICAgICAgICBzY2FsZSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9sYXllckJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJblN0YWNrKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgbGF5ZXIudG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcblxuICAgICAgICBpZiAoYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgICAgICAvLyB0b2RvOiB0aGlzIGlzIGNhdXNpbmcgaXNzdWVzIG9uIGFuZHJvaWQsIGludmVzdGlnYXRlIGZ1cnRoZXJcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gdGhpcy5mb2N1c3NlZExheWVyID09PSBsYXllcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZpc2libGUgID0gdGhpcy5yZWFsaXR5TGF5ZXIgPT09IGxheWVyIHx8IFxuICAgICAgICAgICAgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pc0FyZ29uQXBwKSB8fCBcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllciA9PT0gbGF5ZXI7XG5cbiAgICAgICAgaWYgKGxheWVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci52aXNpYmlsaXR5LnNldChsYXllci5zZXNzaW9uLCB2aXNpYmxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiB2aXNpYmxlID8gMSA6IDAsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IHRoaXMuX2xheWVyQmFja2dyb3VuZENvbG9yLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGF5ZXIuY29udGVudFZpZXcgJiYgbGF5ZXIuY29udGVudFZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTowfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuaW9zKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250YWluZXJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxheWVyLmNvbnRlbnRWaWV3Lmlvcykge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRlbnRWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuaW9zKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4oZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIHRpdGxlYmFyc1xuICAgICAgICBsYXllci50aXRsZUJhci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGxheWVyLnRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LmNvbGxhcHNlO1xuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3IgdGhlIGZpcnN0IHRpbWUgJiBhbmltYXRlLlxuICAgICAgICBsYXllci52aXN1YWxJbmRleCA9IGlkeDtcbiAgICAgICAgcmV0dXJuIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHsgeDogMCwgeTogMCB9LFxuICAgICAgICAgICAgc2NhbGU6IHsgeDogMSwgeTogMSB9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXQsXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2hvd092ZXJ2aWV3KCkge1xuICAgICAgICBpZiAodGhpcy5fb3ZlcnZpZXdFbmFibGVkKSByZXR1cm47XG4gICAgICAgIHRoaXMuX292ZXJ2aWV3RW5hYmxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGFuaW1hdGUgdGhlIHZpZXdzXG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl9hbmltYXRlLmJpbmQodGhpcyksIDIwKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oaWRlT3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSByZXR1cm47XG4gICAgICAgIHRoaXMuX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGFuaW1hdGlvbnMgPSB0aGlzLmxheWVycy5tYXAoKGxheWVyKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2hvd0xheWVySW5TdGFjayhsYXllcilcbiAgICAgICAgfSk7XG4gICAgICAgIFByb21pc2UuYWxsKGFuaW1hdGlvbnMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICAgICAgfSwgMzApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3RvcCBhbmltYXRpbmcgdGhlIHZpZXdzXG4gICAgICAgIGlmICh0aGlzLl9pbnRlcnZhbElkKSBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbElkID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHB1YmxpYyBsb2FkVXJsKHVybDpzdHJpbmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLmZvY3Vzc2VkTGF5ZXIpIHRoaXMuc2V0Rm9jdXNzZWRMYXllcih0aGlzLmxheWVyc1t0aGlzLmxheWVycy5sZW5ndGgtMV0pO1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICYmIHRoaXMuZm9jdXNzZWRMYXllciAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgndXJpJyx1cmwpO1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd0aXRsZScsIGdldEhvc3QodXJsKSk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ2lzRmF2b3JpdGUnLGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIgJiYgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5nZXRDdXJyZW50VXJsKCkgPT09IHVybCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID09PSB1cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2ViVmlldy5zcmMgZG9lcyBub3QgdXBkYXRlIHdoZW4gdGhlIHVzZXIgY2xpY2tzIGEgbGluayBvbiBhIHdlYnBhZ2VcbiAgICAgICAgICAgICAgICAgICAgLy8gY2xlYXIgdGhlIHNyYyBwcm9wZXJ0eSB0byBmb3JjZSBhIHByb3BlcnR5IHVwZGF0ZSAobm90ZSB0aGF0IG5vdGlmeVByb3BlcnR5Q2hhbmdlIGRvZXNuJ3Qgd29yayBoZXJlKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPSB1cmw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID0gdXJsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzZXRGb2N1c3NlZExheWVyKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLl9mb2N1c3NlZExheWVyICE9PSBsYXllcikge1xuICAgICAgICAgICAgY29uc3QgcHJldmlvdXNGb2N1c3NlZExheWVyID0gdGhpcy5fZm9jdXNzZWRMYXllcjtcbiAgICAgICAgICAgIHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgPSBsYXllcjtcbiAgICAgICAgICAgIHRoaXMubm90aWZ5UHJvcGVydHlDaGFuZ2UoJ2ZvY3Vzc2VkTGF5ZXInLCBsYXllcik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNldCBmb2N1c3NlZCBsYXllcjogXCIgKyBsYXllci5kZXRhaWxzLnVyaSB8fCBcIk5ldyBDaGFubmVsXCIpO1xuXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIuZm9jdXMuc2Vzc2lvbiA9IGxheWVyLnNlc3Npb247XG4gICAgICAgICAgICBpZiAobGF5ZXIuc2Vzc2lvbikgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLnZpc2liaWxpdHkuc2V0KGxheWVyLnNlc3Npb24sIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2V0TGF5ZXJEZXRhaWxzKGxheWVyLmRldGFpbHMpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuXG4gICAgICAgICAgICBpZiAobGF5ZXIgIT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXllcnMuc3BsaWNlKHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpLCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcbiAgICAgICAgICAgICAgICBicmluZ1RvRnJvbnQobGF5ZXIuY29udGFpbmVyVmlldyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcmV2aW91c0ZvY3Vzc2VkTGF5ZXIpIHRoaXMuX3Nob3dMYXllckluU3RhY2socHJldmlvdXNGb2N1c3NlZExheWVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBmb2N1c3NlZExheWVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZm9jdXNzZWRMYXllcjtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0SG9zdCh1cmk/OnN0cmluZykge1xuICAgIHJldHVybiB1cmkgPyBVUkkucGFyc2UodXJpKS5ob3N0bmFtZSA6ICcnO1xufSJdfQ==