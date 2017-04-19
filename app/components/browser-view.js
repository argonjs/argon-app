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
        //layer.containerView.isUserInteractionEnabled = this.focussedLayer === layer;  // todo: investigate this
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBMkM7QUFDM0MsOERBQTBEO0FBQzFELG9DQUF1QztBQUN2QywwREFBNkQ7QUFDN0QsOENBQWdEO0FBQ2hELHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFFckMsc0RBQWdFO0FBQ2hFLHdFQUE4RTtBQUM5RSw4Q0FBK0M7QUFFL0Msc0NBQXVDO0FBR3ZDLElBQUksdUJBQXVCLEdBQUcsSUFBSSx1QkFBVSxFQUFFLENBQUM7QUFFL0MsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFDeEMsSUFBTSwyQkFBMkIsR0FBRyxFQUFFLENBQUM7QUFDdkMsSUFBTSwwQkFBMEIsR0FBRyx3QkFBd0IsQ0FBQztBQWU1RDtJQUFpQywrQkFBVTtJQWdCdkM7UUFBQSxZQUNJLGlCQUFPLFNBaUNWO1FBaERELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFFbEQsZUFBUyxHQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsZ0JBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDNUIsb0JBQWMsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDaEMsWUFBTSxHQUFXLEVBQUUsQ0FBQztRQUdaLHNCQUFnQixHQUFHLEtBQUssQ0FBQztRQUl6QixxQkFBZSxHQUFHLEtBQUssQ0FBQztRQXlZeEIsZUFBUyxHQUFHLElBQUksQ0FBQyxH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QUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLG1CQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3RDLENBQUM7WUFFRCxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztnQkFBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM3RSxDQUFDO0lBQ0wsQ0FBQztJQUVELHNCQUFJLHNDQUFhO2FBQWpCO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDL0IsQ0FBQzs7O09BQUE7SUFDTCxrQkFBQztBQUFELENBQUMsQUF4bkJELENBQWlDLHdCQUFVLEdBd25CMUM7QUF4bkJZLGtDQUFXO0FBMm5CeEIsaUJBQWlCLEdBQVc7SUFDeEIsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFDOUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVSSSBmcm9tICd1cmlqcyc7XG5pbXBvcnQge1ZpZXd9IGZyb20gJ3VpL2NvcmUvdmlldyc7XG5pbXBvcnQge1Njcm9sbFZpZXd9IGZyb20gJ3VpL3Njcm9sbC12aWV3J1xuaW1wb3J0IHtDb2xvcn0gZnJvbSAnY29sb3InO1xuaW1wb3J0IHtHcmlkTGF5b3V0LCBJdGVtU3BlY30gZnJvbSAndWkvbGF5b3V0cy9ncmlkLWxheW91dCc7XG5pbXBvcnQge0xhYmVsfSBmcm9tICd1aS9sYWJlbCc7XG5pbXBvcnQge0J1dHRvbn0gZnJvbSAndWkvYnV0dG9uJztcbmltcG9ydCB7QXJnb25XZWJWaWV3fSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5pbXBvcnQge1dlYlZpZXcsIExvYWRFdmVudERhdGF9IGZyb20gJ3VpL3dlYi12aWV3J1xuaW1wb3J0IHtcbiAgICBBbmltYXRpb25DdXJ2ZSwgXG4gICAgVmVydGljYWxBbGlnbm1lbnQsIFxuICAgIEhvcml6b250YWxBbGlnbm1lbnQsIFxuICAgIFRleHRBbGlnbm1lbnQsXG4gICAgVmlzaWJpbGl0eVxufSBmcm9tICd1aS9lbnVtcyc7XG5pbXBvcnQge1xuICBHZXN0dXJlVHlwZXNcbn0gZnJvbSAndWkvZ2VzdHVyZXMnO1xuaW1wb3J0IHticmluZ1RvRnJvbnR9IGZyb20gJy4vY29tbW9uL3V0aWwnO1xuaW1wb3J0IHtQcm9wZXJ0eUNoYW5nZURhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7QWJzb2x1dGVMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvYWJzb2x1dGUtbGF5b3V0JztcbmltcG9ydCBkaWFsb2dzID0gcmVxdWlyZShcInVpL2RpYWxvZ3NcIik7XG5pbXBvcnQgYXBwbGljYXRpb25TZXR0aW5ncyA9IHJlcXVpcmUoJ2FwcGxpY2F0aW9uLXNldHRpbmdzJyk7XG5pbXBvcnQgKiBhcyB2dWZvcmlhIGZyb20gJ25hdGl2ZXNjcmlwdC12dWZvcmlhJztcbmltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gJ2FwcGxpY2F0aW9uJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcblxuaW1wb3J0IHthcHBWaWV3TW9kZWwsIExheWVyRGV0YWlsc30gZnJvbSAnLi9jb21tb24vQXBwVmlld01vZGVsJ1xuaW1wb3J0IHtOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyfSBmcm9tICcuL2NvbW1vbi9hcmdvbi1yZWFsaXR5LXZpZXdlcnMnXG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9jb21tb24vYm9va21hcmtzJ1xuXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbidcblxuaW1wb3J0IG9ic2VydmFibGVNb2R1bGUgPSByZXF1aXJlKFwiZGF0YS9vYnNlcnZhYmxlXCIpO1xubGV0IGFuZHJvaWRMYXlvdXRPYnNlcnZhYmxlID0gbmV3IE9ic2VydmFibGUoKTtcblxuY29uc3QgVElUTEVfQkFSX0hFSUdIVCA9IDMwO1xuY29uc3QgT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyA9IDE1MDtcbmNvbnN0IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTiA9IDI1MDtcbmNvbnN0IE1JTl9BTkRST0lEX1dFQlZJRVdfVkVSU0lPTiA9IDU2O1xuY29uc3QgSUdOT1JFX1dFQlZJRVdfVVBHUkFERV9LRVkgPSAnaWdub3JlX3dlYnZpZXdfdXBncmFkZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXIge1xuICAgIHNlc3Npb24/OkFyZ29uLlNlc3Npb25Qb3J0LFxuICAgIGNvbnRhaW5lclZpZXc6R3JpZExheW91dCxcbiAgICBjb250ZW50VmlldzpHcmlkTGF5b3V0LFxuICAgIHdlYlZpZXc/OkFyZ29uV2ViVmlldyxcbiAgICB0b3VjaE92ZXJsYXk6R3JpZExheW91dCxcbiAgICB0aXRsZUJhcjpHcmlkTGF5b3V0LFxuICAgIGNsb3NlQnV0dG9uOkJ1dHRvbixcbiAgICB0aXRsZUxhYmVsOiBMYWJlbCxcbiAgICB2aXN1YWxJbmRleDogbnVtYmVyLFxuICAgIGRldGFpbHM6IExheWVyRGV0YWlsc1xufVxuXG5leHBvcnQgY2xhc3MgQnJvd3NlclZpZXcgZXh0ZW5kcyBHcmlkTGF5b3V0IHtcbiAgICByZWFsaXR5TGF5ZXI6TGF5ZXI7XG4gICAgcmVhbGl0eVdlYnZpZXdzID0gbmV3IE1hcDxzdHJpbmcsIEFyZ29uV2ViVmlldz4oKTtcbiAgICBcbiAgICB2aWRlb1ZpZXc6VmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgIHNjcm9sbFZpZXcgPSBuZXcgU2Nyb2xsVmlldztcbiAgICBsYXllckNvbnRhaW5lciA9IG5ldyBHcmlkTGF5b3V0O1xuICAgIGxheWVyczpMYXllcltdID0gW107XG4gICAgICAgIFxuICAgIHByaXZhdGUgX2ZvY3Vzc2VkTGF5ZXI/OkxheWVyO1xuICAgIHByaXZhdGUgX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgIFxuICAgIHByaXZhdGUgX2ludGVydmFsSWQ/Om51bWJlcjtcblxuICAgIHByaXZhdGUgX2NoZWNrZWRWZXJzaW9uID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJDb250YWluZXIuaW9zKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sYXllckNvbnRhaW5lci5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmNvbnRlbnQgPSB0aGlzLmxheWVyQ29udGFpbmVyO1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxWaWV3Lmlvcykge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zY3JvbGxWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnNjcm9sbFZpZXcpO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcihcIiM1NTVcIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcub24oU2Nyb2xsVmlldy5zY3JvbGxFdmVudCwgdGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVhbGl0eSBsYXllclxuICAgICAgICB0aGlzLl9jcmVhdGVSZWFsaXR5TGF5ZXIoKTtcblxuICAgICAgICAvLyBBZGQgYSBub3JtYWwgbGF5ZXIgdG8gYmUgdXNlZCB3aXRoIHRoZSB1cmwgYmFyLlxuICAgICAgICB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdExheW91dCgpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZVJlYWxpdHlMYXllcigpIHtcbiAgICAgICAgbGV0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDB4RkYyMjIyMjIpO1xuICAgICAgICBsYXllci50aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCd3aGl0ZScpO1xuICAgICAgICBsYXllci5jbG9zZUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcpIHtcbiAgICAgICAgICAgIC8vIHRoaXMudmlkZW9WaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICAvLyB0aGlzLnZpZGVvVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLnZpZGVvVmlldy5wYXJlbnQpIHRoaXMudmlkZW9WaWV3LnBhcmVudC5fcmVtb3ZlVmlldyh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICAvLyBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcucGFyZW50KSB0aGlzLnZpZGVvVmlldy5wYXJlbnQuX3JlbW92ZVZpZXcodGhpcy52aWRlb1ZpZXcpXG4gICAgICAgICAgICBjb25zdCB2aWRlb1ZpZXdMYXlvdXQgPSBuZXcgQWJzb2x1dGVMYXlvdXQoKTtcbiAgICAgICAgICAgIHZpZGVvVmlld0xheW91dC5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh2aWRlb1ZpZXdMYXlvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXBwVmlld01vZGVsLm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldnQ6UHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKGV2dC5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdvdmVydmlld09wZW4nOiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwcFZpZXdNb2RlbC5vdmVydmlld09wZW4pIHRoaXMuX3Nob3dPdmVydmlldygpXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgdGhpcy5faGlkZU92ZXJ2aWV3KClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFwcFZpZXdNb2RlbC5yZWFkeS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gYXBwVmlld01vZGVsLmFyZ29uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWJWaWV3ID0gdmlld2VyLndlYlZpZXc7XG4gICAgICAgICAgICAgICAgICAgIHdlYlZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQod2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLnNldCh2aWV3ZXIudXJpLCB3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLnJlYWxpdHkudW5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5yZW1vdmVDaGlsZCh2aWV3ZXIud2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLmRlbGV0ZSh2aWV3ZXIudXJpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWFuYWdlci5yZWFsaXR5LmNoYW5nZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ZXIgPSBtYW5hZ2VyLnByb3ZpZGVyLnJlYWxpdHkuZ2V0Vmlld2VyQnlVUkkoY3VycmVudCEpITtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXRhaWxzID0gbGF5ZXIuZGV0YWlscztcbiAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSB2aWV3ZXIudXJpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd1cmknLCB1cmkpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd0aXRsZScsICdSZWFsaXR5OiAnICsgZ2V0SG9zdCh1cmkpKTtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3ID0gdGhpcy5yZWFsaXR5V2Vidmlld3MuZ2V0KHVyaSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2Vzc2lvblByb21pc2UgPSBuZXcgUHJvbWlzZTxBcmdvbi5TZXNzaW9uUG9ydD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmlld2VyLnNlc3Npb24gJiYgIXZpZXdlci5zZXNzaW9uLmlzQ2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZpZXdlci5zZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZW1vdmUgPSB2aWV3ZXIuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHNlc3Npb24pPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHNlc3Npb25Qcm9taXNlLnRoZW4oKHNlc3Npb24pPT57XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50ID09PSBtYW5hZ2VyLnJlYWxpdHkuY3VycmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uaW5mby50aXRsZSkgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBzZXNzaW9uLmluZm8udGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIgPSBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRMYXllcigpIDogTGF5ZXIge1xuICAgICAgICBjb25zdCBsYXllcjpMYXllciA9IHRoaXMuX2NyZWF0ZUxheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gbGF5ZXIud2ViVmlldyA9IG5ldyBBcmdvbldlYlZpZXc7XG4gICAgICAgIHdlYlZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgd2ViVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQod2ViVmlldyk7XG5cbiAgICAgICAgd2ViVmlldy5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZlbnREYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkgPT4ge1xuICAgICAgICAgICAgc3dpdGNoKGV2ZW50RGF0YS5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndXJpJywgZXZlbnREYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGl0bGUnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IHdlYlZpZXcudGl0bGUgfHwgZ2V0SG9zdCh3ZWJWaWV3LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy51cGRhdGVUaXRsZSh3ZWJWaWV3LnVybCwgdGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndGl0bGUnLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2lzQXJnb25BcHAnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0FyZ29uQXBwID0gZXZlbnREYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcmdvbkFwcCB8fCBsYXllciA9PT0gdGhpcy5mb2N1c3NlZExheWVyIHx8IHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5vcGFjaXR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKFdlYlZpZXcubG9hZEZpbmlzaGVkRXZlbnQsIChldmVudERhdGE6IExvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrV2ViVmlld1ZlcnNpb24od2ViVmlldyk7XG4gICAgICAgICAgICBpZiAoIWV2ZW50RGF0YS5lcnJvciAmJiB3ZWJWaWV3ICE9PSB0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnB1c2hUb0hpc3RvcnkoZXZlbnREYXRhLnVybCwgd2ViVmlldy50aXRsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgd2ViVmlldy5vbignc2Vzc2lvbicsIChlKT0+e1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGUuc2Vzc2lvbjtcbiAgICAgICAgICAgIGxheWVyLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgc2Vzc2lvbi5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIgJiYgd2ViVmlldyA9PT0gdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLmZvY3VzLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGF5ZXIgPT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSAhPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiT25seSBhIHJlYWxpdHkgY2FuIGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSA9PSBBcmdvbi5Sb2xlLlJFQUxJVFlfVklFVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJBIHJlYWxpdHkgY2FuIG9ubHkgYmUgbG9hZGVkIGluIHRoZSByZWFsaXR5IGxheWVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHNlc3Npb24uY2xvc2VFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICAgICAgbGF5ZXIuc2Vzc2lvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCdsb2cnLCB3ZWJWaWV3LmxvZyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5pc0xvYWRlZClcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB0aGlzLl9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBsYXllcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jcmVhdGVMYXllcigpIHtcbiAgICAgICAgY29uc3QgY29udGVudFZpZXcgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICBjb250ZW50Vmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBjb250ZW50Vmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcblxuICAgICAgICBjb25zdCBjb250YWluZXJWaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgY29udGFpbmVyVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ2xlZnQnO1xuICAgICAgICBjb250YWluZXJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3RvcCc7XG5cbiAgICAgICAgLy8gQ292ZXIgdGhlIHdlYnZpZXcgdG8gZGV0ZWN0IGdlc3R1cmVzIGFuZCBkaXNhYmxlIGludGVyYWN0aW9uXG4gICAgICAgIGNvbnN0IHRvdWNoT3ZlcmxheSA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS5vbihHZXN0dXJlVHlwZXMudGFwLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGVCYXIgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0aXRsZUJhci5hZGRSb3cobmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ29sdW1uKG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoMSwgJ3N0YXInKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci52ZXJ0aWNhbEFsaWdubWVudCA9IFZlcnRpY2FsQWxpZ25tZW50LnRvcDtcbiAgICAgICAgdGl0bGVCYXIuaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDI0MCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgICAgIHRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LmNvbGxhcHNlO1xuICAgICAgICB0aXRsZUJhci5vcGFjaXR5ID0gMDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gbmV3IEJ1dHRvbigpO1xuICAgICAgICBjbG9zZUJ1dHRvbi5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi52ZXJ0aWNhbEFsaWdubWVudCA9IFZlcnRpY2FsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIGNsb3NlQnV0dG9uLnRleHQgPSAnY2xvc2UnO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jbGFzc05hbWUgPSAnbWF0ZXJpYWwtaWNvbic7XG4gICAgICAgIGNsb3NlQnV0dG9uLnN0eWxlLmZvbnRTaXplID0gYXBwbGljYXRpb24uYW5kcm9pZCA/IDE2IDogMjI7XG4gICAgICAgIGNsb3NlQnV0dG9uLmNvbG9yID0gbmV3IENvbG9yKCdibGFjaycpO1xuICAgICAgICBHcmlkTGF5b3V0LnNldFJvdyhjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKGNsb3NlQnV0dG9uLCAwKTtcbiAgICAgICAgXG4gICAgICAgIGNsb3NlQnV0dG9uLm9uKCd0YXAnLCAoKT0+e1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVMYXllcihsYXllcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGVMYWJlbCA9IG5ldyBMYWJlbCgpO1xuICAgICAgICB0aXRsZUxhYmVsLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlTGFiZWwudmVydGljYWxBbGlnbm1lbnQgPSBhcHBsaWNhdGlvbi5hbmRyb2lkID8gVmVydGljYWxBbGlnbm1lbnQuY2VudGVyIDogVmVydGljYWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVMYWJlbC50ZXh0QWxpZ25tZW50ID0gVGV4dEFsaWdubWVudC5jZW50ZXI7XG4gICAgICAgIHRpdGxlTGFiZWwuY29sb3IgPSBuZXcgQ29sb3IoJ2JsYWNrJyk7XG4gICAgICAgIHRpdGxlTGFiZWwuZm9udFNpemUgPSAxNDtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3codGl0bGVMYWJlbCwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKHRpdGxlTGFiZWwsIDEpO1xuICAgICAgICBcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQoY2xvc2VCdXR0b24pO1xuICAgICAgICB0aXRsZUJhci5hZGRDaGlsZCh0aXRsZUxhYmVsKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQoY29udGVudFZpZXcpO1xuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKHRvdWNoT3ZlcmxheSk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQodGl0bGVCYXIpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFkZENoaWxkKGNvbnRhaW5lclZpZXcpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGxheWVyID0ge1xuICAgICAgICAgICAgY29udGFpbmVyVmlldyxcbiAgICAgICAgICAgIHdlYlZpZXc6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGNvbnRlbnRWaWV3LFxuICAgICAgICAgICAgdG91Y2hPdmVybGF5LFxuICAgICAgICAgICAgdGl0bGVCYXIsXG4gICAgICAgICAgICBjbG9zZUJ1dHRvbixcbiAgICAgICAgICAgIHRpdGxlTGFiZWwsXG4gICAgICAgICAgICB2aXN1YWxJbmRleDogdGhpcy5sYXllcnMubGVuZ3RoLFxuICAgICAgICAgICAgZGV0YWlsczogbmV3IExheWVyRGV0YWlscygpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcblxuICAgICAgICBsYXllci50aXRsZUxhYmVsLmJpbmQoe1xuICAgICAgICAgICAgc291cmNlUHJvcGVydHk6ICd0aXRsZScsXG4gICAgICAgICAgICB0YXJnZXRQcm9wZXJ0eTogJ3RleHQnXG4gICAgICAgIH0sIGxheWVyLmRldGFpbHMpO1xuXG4gICAgICAgIHJldHVybiBsYXllcjtcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXJBdEluZGV4KGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllciA9IHRoaXMubGF5ZXJzW2luZGV4XTtcbiAgICAgICAgaWYgKHR5cGVvZiBsYXllciA9PT0gJ3VuZGVmaW5lZCcpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBsYXllciBhdCBpbmRleCAnICsgaW5kZXgpO1xuICAgICAgICBsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuc2Vzc2lvbiAmJiBsYXllci53ZWJWaWV3LnNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgdGhpcy5sYXllcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5yZW1vdmVDaGlsZChsYXllci5jb250YWluZXJWaWV3KTsgLy8gZm9yIG5vd1xuICAgIH1cbiAgICBcbiAgICByZW1vdmVMYXllcihsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICB0aGlzLnJlbW92ZUxheWVyQXRJbmRleChpbmRleCk7XG4gICAgfVxuICAgIFxuICAgIG9uTG9hZGVkKCkge1xuICAgICAgICBzdXBlci5vbkxvYWRlZCgpO1xuICAgICAgICBpZiAodGhpcy5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuYWRkT25MYXlvdXRDaGFuZ2VMaXN0ZW5lcihuZXcgYW5kcm9pZC52aWV3LlZpZXcuT25MYXlvdXRDaGFuZ2VMaXN0ZW5lcih7XG4gICAgICAgICAgICAgICAgb25MYXlvdXRDaGFuZ2UodjogYW5kcm9pZC52aWV3LlZpZXcsIGxlZnQ6IG51bWJlciwgdG9wOiBudW1iZXIsIHJpZ2h0OiBudW1iZXIsIGJvdHRvbTogbnVtYmVyLCBvbGRMZWZ0OiBudW1iZXIsIG9sZFRvcDogbnVtYmVyLCBvbGRSaWdodDogbnVtYmVyLCBvbGRCb3R0b206IG51bWJlcik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnREYXRhOiBvYnNlcnZhYmxlTW9kdWxlLkV2ZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogXCJjdXN0b21MYXlvdXRDaGFuZ2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogYW5kcm9pZExheW91dE9ic2VydmFibGVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZS5ub3RpZnkoZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZS5vbihcImN1c3RvbUxheW91dENoYW5nZVwiLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuYW5kcm9pZE9uTGF5b3V0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLy9VdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3KTtcbiAgICAgICAgLy9VdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci50b3VjaE92ZXJsYXkpO1xuICAgICAgICAvL1V0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLnRpdGxlQmFyKTtcbiAgICB9XG4gICAgXG4gICAgb25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZSh3aWR0aE1lYXN1cmVTcGVjKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZShoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKT0+e1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN1cGVyLm9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgfVxuXG4gICAgYW5kcm9pZE9uTGF5b3V0KCkge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmdldEFjdHVhbFNpemUoKS5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcik9PntcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jaGVja1dlYlZpZXdWZXJzaW9uKHdlYlZpZXc6QXJnb25XZWJWaWV3KSB7XG4gICAgICAgIGlmICh0aGlzLl9jaGVja2VkVmVyc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcHBsaWNhdGlvblNldHRpbmdzLmhhc0tleShJR05PUkVfV0VCVklFV19VUEdSQURFX0tFWSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrZWRWZXJzaW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAod2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gKDxhbnk+d2ViVmlldykuZ2V0V2ViVmlld1ZlcnNpb24oKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5kcm9pZCB3ZWJ2aWV3IHZlcnNpb246IFwiICsgdmVyc2lvbik7XG4gICAgICAgICAgICBpZiAodmVyc2lvbiA8IE1JTl9BTkRST0lEX1dFQlZJRVdfVkVSU0lPTikge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybSh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlVwZ3JhZGUgV2ViVmlld1wiLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIllvdXIgQW5kcm9pZCBTeXN0ZW0gV2ViVmlldyBpcyBvdXQgb2YgZGF0ZS4gV2Ugc3VnZ2VzdCBhdCBsZWFzdCB2ZXJzaW9uIFwiICsgTUlOX0FORFJPSURfV0VCVklFV19WRVJTSU9OICsgXCIsIHlvdXIgZGV2aWNlIGN1cnJlbnRseSBoYXMgdmVyc2lvbiBcIiArIHZlcnNpb24gKyBcIi4gVGhpcyBtYXkgcmVzdWx0IGluIHJlbmRlcmluZyBpc3N1ZXMuIFBsZWFzZSB1cGRhdGUgdmlhIHRoZSBHb29nbGUgUGxheSBTdG9yZS5cIixcbiAgICAgICAgICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBcIlVwZ3JhZGVcIixcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJMYXRlclwiLFxuICAgICAgICAgICAgICAgICAgICBuZXV0cmFsQnV0dG9uVGV4dDogXCJJZ25vcmVcIlxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZ3JhZGluZyB3ZWJ2aWV3XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW50ZW50ID0gbmV3IGFuZHJvaWQuY29udGVudC5JbnRlbnQoYW5kcm9pZC5jb250ZW50LkludGVudC5BQ1RJT05fVklFVyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlbnQuc2V0RGF0YShhbmRyb2lkLm5ldC5VcmkucGFyc2UoXCJtYXJrZXQ6Ly9kZXRhaWxzP2lkPWNvbS5nb29nbGUuYW5kcm9pZC53ZWJ2aWV3XCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmFuZHJvaWQuc3RhcnRBY3Rpdml0eS5zdGFydEFjdGl2aXR5KGludGVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBncmFkZSBuZXZlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uU2V0dGluZ3Muc2V0Qm9vbGVhbihJR05PUkVfV0VCVklFV19VUEdSQURFX0tFWSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGdyYWRlIGxhdGVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jaGVja2VkVmVyc2lvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllclBvc2l0aW9uID0gaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HIC0gdGhpcy5zY3JvbGxWaWV3LnZlcnRpY2FsT2Zmc2V0O1xuICAgICAgICBjb25zdCBub3JtYWxpemVkUG9zaXRpb24gPSBsYXllclBvc2l0aW9uIC8gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBjb25zdCB0aGV0YSA9IE1hdGgubWluKE1hdGgubWF4KG5vcm1hbGl6ZWRQb3NpdGlvbiwgMCksIDAuODUpICogTWF0aC5QSTtcbiAgICAgICAgY29uc3Qgc2NhbGVGYWN0b3IgPSAxIC0gKE1hdGguY29zKHRoZXRhKSAvIDIgKyAwLjUpICogMC4yNTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICB4OiBzY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICB5OiBzY2FsZUZhY3RvclxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sYXN0VGltZSA9IERhdGUubm93KCk7XG4gICAgcHJpdmF0ZSBfYW5pbWF0ZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgZGVsdGFUID0gTWF0aC5taW4obm93IC0gdGhpcy5fbGFzdFRpbWUsIDMwKSAvIDEwMDA7XG4gICAgICAgIHRoaXMuX2xhc3RUaW1lID0gbm93O1xuICAgICAgICBcbiAgICAgICAgLy9jb25zdCB3aWR0aCA9IHRoaXMuZ2V0TWVhc3VyZWRXaWR0aCgpO1xuICAgICAgICAvL2NvbnN0IGhlaWdodCA9IHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmdldEFjdHVhbFNpemUoKS53aWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29udGFpbmVySGVpZ2h0ID0gaGVpZ2h0ICsgT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyAqICh0aGlzLmxheWVycy5sZW5ndGgtMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBjb250YWluZXJIZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gdGhpcy5fbGVycChsYXllci52aXN1YWxJbmRleCwgaW5kZXgsIGRlbHRhVCo0KTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IHRoaXMuX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShsYXllci52aXN1YWxJbmRleCk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnNjYWxlWCA9IHRyYW5zZm9ybS5zY2FsZS54O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5zY2FsZVkgPSB0cmFuc2Zvcm0uc2NhbGUueTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcudHJhbnNsYXRlWCA9IHRyYW5zZm9ybS50cmFuc2xhdGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcudHJhbnNsYXRlWSA9IHRyYW5zZm9ybS50cmFuc2xhdGUueTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2xlcnAoYSxiLHQpIHtcbiAgICAgICAgcmV0dXJuIGEgKyAoYi1hKSp0XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG5cbiAgICAgICAgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuaW9zKSB7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250YWluZXJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGF5ZXIuY29udGVudFZpZXcuaW9zKSB7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxheWVyLndlYlZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICBsYXllci50b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcblxuICAgICAgICAvLyBGb3IgdHJhbnNwYXJlbnQgd2Vidmlld3MsIGFkZCBhIGxpdHRsZSBiaXQgb2Ygb3BhY2l0eVxuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBuZXcgQ29sb3IoMTI4LCAyNTUsIDI1NSwgMjU1KSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuICAgICAgICBsYXllci5jb250ZW50Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OlRJVExFX0JBUl9IRUlHSFR9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFNob3cgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LnZpc2libGU7XG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBVcGRhdGUgZm9yIHRoZSBmaXJzdCB0aW1lICYgYW5pbWF0ZS5cbiAgICAgICAgY29uc3Qge3RyYW5zbGF0ZSwgc2NhbGV9ID0gdGhpcy5fY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGlkeCk7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGUsXG4gICAgICAgICAgICBzY2FsZSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9sYXllckJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJblN0YWNrKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgbGF5ZXIudG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcblxuICAgICAgICAvL2xheWVyLmNvbnRhaW5lclZpZXcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gdGhpcy5mb2N1c3NlZExheWVyID09PSBsYXllcjsgIC8vIHRvZG86IGludmVzdGlnYXRlIHRoaXNcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IFxuICAgICAgICAgICAgICAgICh0aGlzLnJlYWxpdHlMYXllciA9PT0gbGF5ZXIgfHwgXG4gICAgICAgICAgICAgICAgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pc0FyZ29uQXBwKSB8fCBcbiAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIgPT09IGxheWVyKSA/IFxuICAgICAgICAgICAgICAgICAgICAxIDogMCxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogdGhpcy5fbGF5ZXJCYWNrZ3JvdW5kQ29sb3IsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5jb250ZW50VmlldyAmJiBsYXllci5jb250ZW50Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4oZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGVudFZpZXcuaW9zKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gaWR4O1xuICAgICAgICByZXR1cm4gbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBzY2FsZTogeyB4OiAxLCB5OiAxIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwcml2YXRlIF9zaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gYW5pbWF0ZSB0aGUgdmlld3NcbiAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuX2FuaW1hdGUuYmluZCh0aGlzKSwgMjApO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hpZGVPdmVydmlldygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgYW5pbWF0aW9ucyA9IHRoaXMubGF5ZXJzLm1hcCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaG93TGF5ZXJJblN0YWNrKGxheWVyKVxuICAgICAgICB9KTtcbiAgICAgICAgUHJvbWlzZS5hbGwoYW5pbWF0aW9ucykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIGFuaW1hdGluZyB0aGUgdmlld3NcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQpIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHVibGljIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICBpZiAoIXRoaXMuZm9jdXNzZWRMYXllcikgdGhpcy5zZXRGb2N1c3NlZExheWVyKHRoaXMubGF5ZXJzW3RoaXMubGF5ZXJzLmxlbmd0aC0xXSk7XG4gICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIgJiYgdGhpcy5mb2N1c3NlZExheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd1cmknLHVybCk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3RpdGxlJywgZ2V0SG9zdCh1cmwpKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgnaXNGYXZvcml0ZScsZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllciAmJiB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LmdldEN1cnJlbnRVcmwoKSA9PT0gdXJsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcucmVsb2FkKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPT09IHVybCkge1xuICAgICAgICAgICAgICAgICAgICAvLyB3ZWJWaWV3LnNyYyBkb2VzIG5vdCB1cGRhdGUgd2hlbiB0aGUgdXNlciBjbGlja3MgYSBsaW5rIG9uIGEgd2VicGFnZVxuICAgICAgICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgc3JjIHByb3BlcnR5IHRvIGZvcmNlIGEgcHJvcGVydHkgdXBkYXRlIChub3RlIHRoYXQgbm90aWZ5UHJvcGVydHlDaGFuZ2UgZG9lc24ndCB3b3JrIGhlcmUpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9IHVybDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPSB1cmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNldEZvY3Vzc2VkTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgIT09IGxheWVyKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2aW91c0ZvY3Vzc2VkTGF5ZXIgPSB0aGlzLl9mb2N1c3NlZExheWVyO1xuICAgICAgICAgICAgdGhpcy5fZm9jdXNzZWRMYXllciA9IGxheWVyO1xuICAgICAgICAgICAgdGhpcy5ub3RpZnlQcm9wZXJ0eUNoYW5nZSgnZm9jdXNzZWRMYXllcicsIGxheWVyKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2V0IGZvY3Vzc2VkIGxheWVyOiBcIiArIGxheWVyLmRldGFpbHMudXJpIHx8IFwiTmV3IENoYW5uZWxcIik7XG5cbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uID0gbGF5ZXIuc2Vzc2lvbjtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zZXRMYXllckRldGFpbHMobGF5ZXIuZGV0YWlscyk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG5cbiAgICAgICAgICAgIGlmIChsYXllciAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVycy5zcGxpY2UodGhpcy5sYXllcnMuaW5kZXhPZihsYXllciksIDEpO1xuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgICAgICAgICAgICAgIGJyaW5nVG9Gcm9udChsYXllci5jb250YWluZXJWaWV3KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHByZXZpb3VzRm9jdXNzZWRMYXllcikgdGhpcy5fc2hvd0xheWVySW5TdGFjayhwcmV2aW91c0ZvY3Vzc2VkTGF5ZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGZvY3Vzc2VkTGF5ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mb2N1c3NlZExheWVyO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRIb3N0KHVyaT86c3RyaW5nKSB7XG4gICAgcmV0dXJuIHVyaSA/IFVSSS5wYXJzZSh1cmkpLmhvc3RuYW1lIDogJyc7XG59Il19