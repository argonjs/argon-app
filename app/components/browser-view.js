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
        if (this.focussedLayer !== this.realityLayer) {
            this.focussedLayer.details.set('uri', url);
            this.focussedLayer.details.set('title', getHost(url));
            this.focussedLayer.details.set('isFavorite', false);
        }
        if (this.focussedLayer.webView) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBMkM7QUFDM0MsOERBQTBEO0FBQzFELG9DQUF1QztBQUN2QywwREFBNkQ7QUFDN0QsOENBQWdEO0FBQ2hELHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFFckMsc0RBQWdFO0FBQ2hFLHdFQUE4RTtBQUM5RSw4Q0FBK0M7QUFFL0Msc0NBQXVDO0FBR3ZDLElBQUksdUJBQXVCLEdBQUcsSUFBSSx1QkFBVSxFQUFFLENBQUM7QUFFL0MsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFDeEMsSUFBTSwyQkFBMkIsR0FBRyxFQUFFLENBQUM7QUFDdkMsSUFBTSwwQkFBMEIsR0FBRyx3QkFBd0IsQ0FBQztBQWU1RDtJQUFpQywrQkFBVTtJQWdCdkM7UUFBQSxZQUNJLGlCQUFPLFNBaUNWO1FBaERELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFFbEQsZUFBUyxHQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsZ0JBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDNUIsb0JBQWMsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDaEMsWUFBTSxHQUFXLEVBQUUsQ0FBQztRQUdaLHNCQUFnQixHQUFHLEtBQUssQ0FBQztRQUl6QixxQkFBZSxHQUFHLEtBQUssQ0FBQztRQXlZeEIsZUFBUyxHQUFHLElBQUksQ0FBQyxH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QixtQkFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN0QyxDQUFDO1lBRUQsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDN0UsQ0FBQztJQUNMLENBQUM7SUFFRCxzQkFBSSxzQ0FBYTthQUFqQjtZQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQy9CLENBQUM7OztPQUFBO0lBQ0wsa0JBQUM7QUFBRCxDQUFDLEFBdm5CRCxDQUFpQyx3QkFBVSxHQXVuQjFDO0FBdm5CWSxrQ0FBVztBQTBuQnhCLGlCQUFpQixHQUFXO0lBQ3hCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQzlDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnO1xuaW1wb3J0IHtWaWV3fSBmcm9tICd1aS9jb3JlL3ZpZXcnO1xuaW1wb3J0IHtTY3JvbGxWaWV3fSBmcm9tICd1aS9zY3JvbGwtdmlldydcbmltcG9ydCB7Q29sb3J9IGZyb20gJ2NvbG9yJztcbmltcG9ydCB7R3JpZExheW91dCwgSXRlbVNwZWN9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHtMYWJlbH0gZnJvbSAndWkvbGFiZWwnO1xuaW1wb3J0IHtCdXR0b259IGZyb20gJ3VpL2J1dHRvbic7XG5pbXBvcnQge0FyZ29uV2ViVmlld30gZnJvbSAnYXJnb24td2ViLXZpZXcnO1xuaW1wb3J0IHtXZWJWaWV3LCBMb2FkRXZlbnREYXRhfSBmcm9tICd1aS93ZWItdmlldydcbmltcG9ydCB7XG4gICAgQW5pbWF0aW9uQ3VydmUsIFxuICAgIFZlcnRpY2FsQWxpZ25tZW50LCBcbiAgICBIb3Jpem9udGFsQWxpZ25tZW50LCBcbiAgICBUZXh0QWxpZ25tZW50LFxuICAgIFZpc2liaWxpdHlcbn0gZnJvbSAndWkvZW51bXMnO1xuaW1wb3J0IHtcbiAgR2VzdHVyZVR5cGVzXG59IGZyb20gJ3VpL2dlc3R1cmVzJztcbmltcG9ydCB7YnJpbmdUb0Zyb250fSBmcm9tICcuL2NvbW1vbi91dGlsJztcbmltcG9ydCB7UHJvcGVydHlDaGFuZ2VEYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnXG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0Fic29sdXRlTGF5b3V0fSBmcm9tICd1aS9sYXlvdXRzL2Fic29sdXRlLWxheW91dCc7XG5pbXBvcnQgZGlhbG9ncyA9IHJlcXVpcmUoXCJ1aS9kaWFsb2dzXCIpO1xuaW1wb3J0IGFwcGxpY2F0aW9uU2V0dGluZ3MgPSByZXF1aXJlKCdhcHBsaWNhdGlvbi1zZXR0aW5ncycpO1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCB7YXBwVmlld01vZGVsLCBMYXllckRldGFpbHN9IGZyb20gJy4vY29tbW9uL0FwcFZpZXdNb2RlbCdcbmltcG9ydCB7TmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcn0gZnJvbSAnLi9jb21tb24vYXJnb24tcmVhbGl0eS12aWV3ZXJzJ1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tbW9uL2Jvb2ttYXJrcydcblxuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5cbmltcG9ydCBvYnNlcnZhYmxlTW9kdWxlID0gcmVxdWlyZShcImRhdGEvb2JzZXJ2YWJsZVwiKTtcbmxldCBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZSA9IG5ldyBPYnNlcnZhYmxlKCk7XG5cbmNvbnN0IFRJVExFX0JBUl9IRUlHSFQgPSAzMDtcbmNvbnN0IE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgPSAxNTA7XG5jb25zdCBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04gPSAyNTA7XG5jb25zdCBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04gPSA1NjtcbmNvbnN0IElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZID0gJ2lnbm9yZV93ZWJ2aWV3X3VwZ3JhZGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyIHtcbiAgICBzZXNzaW9uPzpBcmdvbi5TZXNzaW9uUG9ydCxcbiAgICBjb250YWluZXJWaWV3OkdyaWRMYXlvdXQsXG4gICAgY29udGVudFZpZXc6R3JpZExheW91dCxcbiAgICB3ZWJWaWV3PzpBcmdvbldlYlZpZXcsXG4gICAgdG91Y2hPdmVybGF5OkdyaWRMYXlvdXQsXG4gICAgdGl0bGVCYXI6R3JpZExheW91dCxcbiAgICBjbG9zZUJ1dHRvbjpCdXR0b24sXG4gICAgdGl0bGVMYWJlbDogTGFiZWwsXG4gICAgdmlzdWFsSW5kZXg6IG51bWJlcixcbiAgICBkZXRhaWxzOiBMYXllckRldGFpbHNcbn1cblxuZXhwb3J0IGNsYXNzIEJyb3dzZXJWaWV3IGV4dGVuZHMgR3JpZExheW91dCB7XG4gICAgcmVhbGl0eUxheWVyOkxheWVyO1xuICAgIHJlYWxpdHlXZWJ2aWV3cyA9IG5ldyBNYXA8c3RyaW5nLCBBcmdvbldlYlZpZXc+KCk7XG4gICAgXG4gICAgdmlkZW9WaWV3OlZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcbiAgICBzY3JvbGxWaWV3ID0gbmV3IFNjcm9sbFZpZXc7XG4gICAgbGF5ZXJDb250YWluZXIgPSBuZXcgR3JpZExheW91dDtcbiAgICBsYXllcnM6TGF5ZXJbXSA9IFtdO1xuICAgICAgICBcbiAgICBwcml2YXRlIF9mb2N1c3NlZExheWVyOkxheWVyO1xuICAgIHByaXZhdGUgX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgIFxuICAgIHByaXZhdGUgX2ludGVydmFsSWQ/Om51bWJlcjtcblxuICAgIHByaXZhdGUgX2NoZWNrZWRWZXJzaW9uID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJDb250YWluZXIuaW9zKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sYXllckNvbnRhaW5lci5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmNvbnRlbnQgPSB0aGlzLmxheWVyQ29udGFpbmVyO1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxWaWV3Lmlvcykge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zY3JvbGxWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnNjcm9sbFZpZXcpO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcihcIiM1NTVcIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcub24oU2Nyb2xsVmlldy5zY3JvbGxFdmVudCwgdGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVhbGl0eSBsYXllclxuICAgICAgICB0aGlzLl9jcmVhdGVSZWFsaXR5TGF5ZXIoKTtcblxuICAgICAgICAvLyBBZGQgYSBub3JtYWwgbGF5ZXIgdG8gYmUgdXNlZCB3aXRoIHRoZSB1cmwgYmFyLlxuICAgICAgICB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdExheW91dCgpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZVJlYWxpdHlMYXllcigpIHtcbiAgICAgICAgbGV0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDB4RkYyMjIyMjIpO1xuICAgICAgICBsYXllci50aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCd3aGl0ZScpO1xuICAgICAgICBsYXllci5jbG9zZUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcpIHtcbiAgICAgICAgICAgIC8vIHRoaXMudmlkZW9WaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICAvLyB0aGlzLnZpZGVvVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLnZpZGVvVmlldy5wYXJlbnQpIHRoaXMudmlkZW9WaWV3LnBhcmVudC5fcmVtb3ZlVmlldyh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICAvLyBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcucGFyZW50KSB0aGlzLnZpZGVvVmlldy5wYXJlbnQuX3JlbW92ZVZpZXcodGhpcy52aWRlb1ZpZXcpXG4gICAgICAgICAgICBjb25zdCB2aWRlb1ZpZXdMYXlvdXQgPSBuZXcgQWJzb2x1dGVMYXlvdXQoKTtcbiAgICAgICAgICAgIHZpZGVvVmlld0xheW91dC5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh2aWRlb1ZpZXdMYXlvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXBwVmlld01vZGVsLm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldnQ6UHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKGV2dC5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdvdmVydmlld09wZW4nOiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwcFZpZXdNb2RlbC5vdmVydmlld09wZW4pIHRoaXMuX3Nob3dPdmVydmlldygpXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgdGhpcy5faGlkZU92ZXJ2aWV3KClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFwcFZpZXdNb2RlbC5yZWFkeS50aGVuKCgpPT57XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gYXBwVmlld01vZGVsLmFyZ29uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWJWaWV3ID0gdmlld2VyLndlYlZpZXc7XG4gICAgICAgICAgICAgICAgICAgIHdlYlZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQod2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLnNldCh2aWV3ZXIudXJpLCB3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnByb3ZpZGVyLnJlYWxpdHkudW5pbnN0YWxsZWRFdmVudC5hZGRFdmVudExpc3RlbmVyKCh7dmlld2VyfSk9PntcbiAgICAgICAgICAgICAgICBpZiAodmlld2VyIGluc3RhbmNlb2YgTmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcikge1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5yZW1vdmVDaGlsZCh2aWV3ZXIud2ViVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eVdlYnZpZXdzLmRlbGV0ZSh2aWV3ZXIudXJpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWFuYWdlci5yZWFsaXR5LmNoYW5nZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ZXIgPSBtYW5hZ2VyLnByb3ZpZGVyLnJlYWxpdHkuZ2V0Vmlld2VyQnlVUkkoY3VycmVudCEpITtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXRhaWxzID0gbGF5ZXIuZGV0YWlscztcbiAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSB2aWV3ZXIudXJpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd1cmknLCB1cmkpO1xuICAgICAgICAgICAgICAgIGRldGFpbHMuc2V0KCd0aXRsZScsICdSZWFsaXR5OiAnICsgZ2V0SG9zdCh1cmkpKTtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3ID0gdGhpcy5yZWFsaXR5V2Vidmlld3MuZ2V0KHVyaSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2Vzc2lvblByb21pc2UgPSBuZXcgUHJvbWlzZTxBcmdvbi5TZXNzaW9uUG9ydD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmlld2VyLnNlc3Npb24gJiYgIXZpZXdlci5zZXNzaW9uLmlzQ2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZpZXdlci5zZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZW1vdmUgPSB2aWV3ZXIuY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHNlc3Npb24pPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHNlc3Npb25Qcm9taXNlLnRoZW4oKHNlc3Npb24pPT57XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50ID09PSBtYW5hZ2VyLnJlYWxpdHkuY3VycmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uaW5mby50aXRsZSkgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBzZXNzaW9uLmluZm8udGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIgPSBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRMYXllcigpIDogTGF5ZXIge1xuICAgICAgICBjb25zdCBsYXllcjpMYXllciA9IHRoaXMuX2NyZWF0ZUxheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gbGF5ZXIud2ViVmlldyA9IG5ldyBBcmdvbldlYlZpZXc7XG4gICAgICAgIHdlYlZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgd2ViVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYWRkQ2hpbGQod2ViVmlldyk7XG5cbiAgICAgICAgd2ViVmlldy5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZlbnREYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkgPT4ge1xuICAgICAgICAgICAgc3dpdGNoKGV2ZW50RGF0YS5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndXJpJywgZXZlbnREYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGl0bGUnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IHdlYlZpZXcudGl0bGUgfHwgZ2V0SG9zdCh3ZWJWaWV3LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy51cGRhdGVUaXRsZSh3ZWJWaWV3LnVybCwgdGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndGl0bGUnLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2lzQXJnb25BcHAnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0FyZ29uQXBwID0gZXZlbnREYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcmdvbkFwcCB8fCBsYXllciA9PT0gdGhpcy5mb2N1c3NlZExheWVyIHx8IHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5vcGFjaXR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKFdlYlZpZXcubG9hZEZpbmlzaGVkRXZlbnQsIChldmVudERhdGE6IExvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrV2ViVmlld1ZlcnNpb24od2ViVmlldyk7XG4gICAgICAgICAgICBpZiAoIWV2ZW50RGF0YS5lcnJvciAmJiB3ZWJWaWV3ICE9PSB0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLnB1c2hUb0hpc3RvcnkoZXZlbnREYXRhLnVybCwgd2ViVmlldy50aXRsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgd2ViVmlldy5vbignc2Vzc2lvbicsIChlKT0+e1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGUuc2Vzc2lvbjtcbiAgICAgICAgICAgIGxheWVyLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgc2Vzc2lvbi5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgICAgIGlmICh3ZWJWaWV3ID09PSB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldykge1xuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIuZm9jdXMuc2Vzc2lvbiA9IHNlc3Npb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsYXllciA9PT0gdGhpcy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uaW5mby5yb2xlICE9PSBBcmdvbi5Sb2xlLlJFQUxJVFlfVklFVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJPbmx5IGEgcmVhbGl0eSBjYW4gYmUgbG9hZGVkIGluIHRoZSByZWFsaXR5IGxheWVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uaW5mby5yb2xlID09IEFyZ29uLlJvbGUuUkVBTElUWV9WSUVXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIkEgcmVhbGl0eSBjYW4gb25seSBiZSBsb2FkZWQgaW4gdGhlIHJlYWxpdHkgbGF5ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgc2Vzc2lvbi5jbG9zZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgICAgICBsYXllci5zZXNzaW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGF5ZXIuZGV0YWlscy5zZXQoJ2xvZycsIHdlYlZpZXcubG9nKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmlzTG9hZGVkKVxuICAgICAgICAgICAgdGhpcy5zZXRGb2N1c3NlZExheWVyKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGxheWVyO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZUxheWVyKCkge1xuICAgICAgICBjb25zdCBjb250ZW50VmlldyA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIGNvbnRlbnRWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIGNvbnRlbnRWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lclZpZXcgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICBjb250YWluZXJWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnbGVmdCc7XG4gICAgICAgIGNvbnRhaW5lclZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAndG9wJztcblxuICAgICAgICAvLyBDb3ZlciB0aGUgd2VidmlldyB0byBkZXRlY3QgZ2VzdHVyZXMgYW5kIGRpc2FibGUgaW50ZXJhY3Rpb25cbiAgICAgICAgY29uc3QgdG91Y2hPdmVybGF5ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgdG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcbiAgICAgICAgdG91Y2hPdmVybGF5Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdG91Y2hPdmVybGF5Lm9uKEdlc3R1cmVUeXBlcy50YXAsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXRGb2N1c3NlZExheWVyKGxheWVyKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlT3ZlcnZpZXcoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aXRsZUJhciA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIHRpdGxlQmFyLmFkZFJvdyhuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ29sdW1uKG5ldyBJdGVtU3BlYygxLCAnc3RhcicpKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ29sdW1uKG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLnZlcnRpY2FsQWxpZ25tZW50ID0gVmVydGljYWxBbGlnbm1lbnQudG9wO1xuICAgICAgICB0aXRsZUJhci5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUJhci5iYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoMjQwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICAgICAgdGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIHRpdGxlQmFyLm9wYWNpdHkgPSAwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2xvc2VCdXR0b24gPSBuZXcgQnV0dG9uKCk7XG4gICAgICAgIGNsb3NlQnV0dG9uLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIGNsb3NlQnV0dG9uLnZlcnRpY2FsQWxpZ25tZW50ID0gVmVydGljYWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgY2xvc2VCdXR0b24udGV4dCA9ICdjbG9zZSc7XG4gICAgICAgIGNsb3NlQnV0dG9uLmNsYXNzTmFtZSA9ICdtYXRlcmlhbC1pY29uJztcbiAgICAgICAgY2xvc2VCdXR0b24uc3R5bGUuZm9udFNpemUgPSBhcHBsaWNhdGlvbi5hbmRyb2lkID8gMTYgOiAyMjtcbiAgICAgICAgY2xvc2VCdXR0b24uY29sb3IgPSBuZXcgQ29sb3IoJ2JsYWNrJyk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Um93KGNsb3NlQnV0dG9uLCAwKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRDb2x1bW4oY2xvc2VCdXR0b24sIDApO1xuICAgICAgICBcbiAgICAgICAgY2xvc2VCdXR0b24ub24oJ3RhcCcsICgpPT57XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUxheWVyKGxheWVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aXRsZUxhYmVsID0gbmV3IExhYmVsKCk7XG4gICAgICAgIHRpdGxlTGFiZWwuaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVMYWJlbC52ZXJ0aWNhbEFsaWdubWVudCA9IGFwcGxpY2F0aW9uLmFuZHJvaWQgPyBWZXJ0aWNhbEFsaWdubWVudC5jZW50ZXIgOiBWZXJ0aWNhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUxhYmVsLnRleHRBbGlnbm1lbnQgPSBUZXh0QWxpZ25tZW50LmNlbnRlcjtcbiAgICAgICAgdGl0bGVMYWJlbC5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgdGl0bGVMYWJlbC5mb250U2l6ZSA9IDE0O1xuICAgICAgICBHcmlkTGF5b3V0LnNldFJvdyh0aXRsZUxhYmVsLCAwKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRDb2x1bW4odGl0bGVMYWJlbCwgMSk7XG4gICAgICAgIFxuICAgICAgICB0aXRsZUJhci5hZGRDaGlsZChjbG9zZUJ1dHRvbik7XG4gICAgICAgIHRpdGxlQmFyLmFkZENoaWxkKHRpdGxlTGFiZWwpO1xuICAgICAgICBcbiAgICAgICAgY29udGFpbmVyVmlldy5hZGRDaGlsZChjb250ZW50Vmlldyk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuYWRkQ2hpbGQodG91Y2hPdmVybGF5KTtcbiAgICAgICAgY29udGFpbmVyVmlldy5hZGRDaGlsZCh0aXRsZUJhcik7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuYWRkQ2hpbGQoY29udGFpbmVyVmlldyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgbGF5ZXIgPSB7XG4gICAgICAgICAgICBjb250YWluZXJWaWV3LFxuICAgICAgICAgICAgd2ViVmlldzogdW5kZWZpbmVkLFxuICAgICAgICAgICAgY29udGVudFZpZXcsXG4gICAgICAgICAgICB0b3VjaE92ZXJsYXksXG4gICAgICAgICAgICB0aXRsZUJhcixcbiAgICAgICAgICAgIGNsb3NlQnV0dG9uLFxuICAgICAgICAgICAgdGl0bGVMYWJlbCxcbiAgICAgICAgICAgIHZpc3VhbEluZGV4OiB0aGlzLmxheWVycy5sZW5ndGgsXG4gICAgICAgICAgICBkZXRhaWxzOiBuZXcgTGF5ZXJEZXRhaWxzKClcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXIpO1xuXG4gICAgICAgIGxheWVyLnRpdGxlTGFiZWwuYmluZCh7XG4gICAgICAgICAgICBzb3VyY2VQcm9wZXJ0eTogJ3RpdGxlJyxcbiAgICAgICAgICAgIHRhcmdldFByb3BlcnR5OiAndGV4dCdcbiAgICAgICAgfSwgbGF5ZXIuZGV0YWlscyk7XG5cbiAgICAgICAgcmV0dXJuIGxheWVyO1xuICAgIH1cbiAgICBcbiAgICByZW1vdmVMYXllckF0SW5kZXgoaW5kZXg6bnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcnNbaW5kZXhdO1xuICAgICAgICBpZiAodHlwZW9mIGxheWVyID09PSAndW5kZWZpbmVkJykgXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIGxheWVyIGF0IGluZGV4ICcgKyBpbmRleCk7XG4gICAgICAgIGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5zZXNzaW9uICYmIGxheWVyLndlYlZpZXcuc2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICB0aGlzLmxheWVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLnJlbW92ZUNoaWxkKGxheWVyLmNvbnRhaW5lclZpZXcpOyAvLyBmb3Igbm93XG4gICAgfVxuICAgIFxuICAgIHJlbW92ZUxheWVyKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG4gICAgICAgIHRoaXMucmVtb3ZlTGF5ZXJBdEluZGV4KGluZGV4KTtcbiAgICB9XG4gICAgXG4gICAgb25Mb2FkZWQoKSB7XG4gICAgICAgIHN1cGVyLm9uTG9hZGVkKCk7XG4gICAgICAgIGlmICh0aGlzLmFuZHJvaWQpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5hZGRPbkxheW91dENoYW5nZUxpc3RlbmVyKG5ldyBhbmRyb2lkLnZpZXcuVmlldy5PbkxheW91dENoYW5nZUxpc3RlbmVyKHtcbiAgICAgICAgICAgICAgICBvbkxheW91dENoYW5nZSh2OiBhbmRyb2lkLnZpZXcuVmlldywgbGVmdDogbnVtYmVyLCB0b3A6IG51bWJlciwgcmlnaHQ6IG51bWJlciwgYm90dG9tOiBudW1iZXIsIG9sZExlZnQ6IG51bWJlciwgb2xkVG9wOiBudW1iZXIsIG9sZFJpZ2h0OiBudW1iZXIsIG9sZEJvdHRvbTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBldmVudERhdGE6IG9ic2VydmFibGVNb2R1bGUuRXZlbnREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnROYW1lOiBcImN1c3RvbUxheW91dENoYW5nZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFuZHJvaWRMYXlvdXRPYnNlcnZhYmxlLm5vdGlmeShldmVudERhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIGFuZHJvaWRMYXlvdXRPYnNlcnZhYmxlLm9uKFwiY3VzdG9tTGF5b3V0Q2hhbmdlXCIsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5hbmRyb2lkT25MYXlvdXQoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICAvL1V0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcpO1xuICAgICAgICAvL1V0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLnRvdWNoT3ZlcmxheSk7XG4gICAgICAgIC8vVXRpbC5icmluZ1RvRnJvbnQodGhpcy5yZWFsaXR5TGF5ZXIudGl0bGVCYXIpO1xuICAgIH1cbiAgICBcbiAgICBvbk1lYXN1cmUod2lkdGhNZWFzdXJlU3BlYywgaGVpZ2h0TWVhc3VyZVNwZWMpIHtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB1dGlscy5sYXlvdXQuZ2V0TWVhc3VyZVNwZWNTaXplKHdpZHRoTWVhc3VyZVNwZWMpO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB1dGlscy5sYXlvdXQuZ2V0TWVhc3VyZVNwZWNTaXplKGhlaWdodE1lYXN1cmVTcGVjKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpPT57XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3VwZXIub25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKTtcbiAgICB9XG5cbiAgICBhbmRyb2lkT25MYXlvdXQoKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5nZXRBY3R1YWxTaXplKCkud2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodDtcblxuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKT0+e1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NoZWNrV2ViVmlld1ZlcnNpb24od2ViVmlldzpBcmdvbldlYlZpZXcpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NoZWNrZWRWZXJzaW9uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uU2V0dGluZ3MuaGFzS2V5KElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZKSkge1xuICAgICAgICAgICAgdGhpcy5fY2hlY2tlZFZlcnNpb24gPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3ZWJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSAoPGFueT53ZWJWaWV3KS5nZXRXZWJWaWV3VmVyc2lvbigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmRyb2lkIHdlYnZpZXcgdmVyc2lvbjogXCIgKyB2ZXJzaW9uKTtcbiAgICAgICAgICAgIGlmICh2ZXJzaW9uIDwgTUlOX0FORFJPSURfV0VCVklFV19WRVJTSU9OKSB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiVXBncmFkZSBXZWJWaWV3XCIsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiWW91ciBBbmRyb2lkIFN5c3RlbSBXZWJWaWV3IGlzIG91dCBvZiBkYXRlLiBXZSBzdWdnZXN0IGF0IGxlYXN0IHZlcnNpb24gXCIgKyBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04gKyBcIiwgeW91ciBkZXZpY2UgY3VycmVudGx5IGhhcyB2ZXJzaW9uIFwiICsgdmVyc2lvbiArIFwiLiBUaGlzIG1heSByZXN1bHQgaW4gcmVuZGVyaW5nIGlzc3Vlcy4gUGxlYXNlIHVwZGF0ZSB2aWEgdGhlIEdvb2dsZSBQbGF5IFN0b3JlLlwiLFxuICAgICAgICAgICAgICAgICAgICBva0J1dHRvblRleHQ6IFwiVXBncmFkZVwiLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkxhdGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIG5ldXRyYWxCdXR0b25UZXh0OiBcIklnbm9yZVwiXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBncmFkaW5nIHdlYnZpZXdcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXcgYW5kcm9pZC5jb250ZW50LkludGVudChhbmRyb2lkLmNvbnRlbnQuSW50ZW50LkFDVElPTl9WSUVXKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVudC5zZXREYXRhKGFuZHJvaWQubmV0LlVyaS5wYXJzZShcIm1hcmtldDovL2RldGFpbHM/aWQ9Y29tLmdvb2dsZS5hbmRyb2lkLndlYnZpZXdcIikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uYW5kcm9pZC5zdGFydEFjdGl2aXR5LnN0YXJ0QWN0aXZpdHkoaW50ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGdyYWRlIG5ldmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb25TZXR0aW5ncy5zZXRCb29sZWFuKElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZ3JhZGUgbGF0ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2NoZWNrZWRWZXJzaW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0oaW5kZXg6bnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxheWVyUG9zaXRpb24gPSBpbmRleCAqIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgLSB0aGlzLnNjcm9sbFZpZXcudmVydGljYWxPZmZzZXQ7XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQb3NpdGlvbiA9IGxheWVyUG9zaXRpb24gLyB0aGlzLmdldE1lYXN1cmVkSGVpZ2h0KCk7XG4gICAgICAgIGNvbnN0IHRoZXRhID0gTWF0aC5taW4oTWF0aC5tYXgobm9ybWFsaXplZFBvc2l0aW9uLCAwKSwgMC44NSkgKiBNYXRoLlBJO1xuICAgICAgICBjb25zdCBzY2FsZUZhY3RvciA9IDEgLSAoTWF0aC5jb3ModGhldGEpIC8gMiArIDAuNSkgKiAwLjI1O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7XG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiBpbmRleCAqIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgIHg6IHNjYWxlRmFjdG9yLFxuICAgICAgICAgICAgICAgIHk6IHNjYWxlRmFjdG9yXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2xhc3RUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBwcml2YXRlIF9hbmltYXRlKCkge1xuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICBjb25zdCBkZWx0YVQgPSBNYXRoLm1pbihub3cgLSB0aGlzLl9sYXN0VGltZSwgMzApIC8gMTAwMDtcbiAgICAgICAgdGhpcy5fbGFzdFRpbWUgPSBub3c7XG4gICAgICAgIFxuICAgICAgICAvL2NvbnN0IHdpZHRoID0gdGhpcy5nZXRNZWFzdXJlZFdpZHRoKCk7XG4gICAgICAgIC8vY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmdldEFjdHVhbFNpemUoKS5oZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb250YWluZXJIZWlnaHQgPSBoZWlnaHQgKyBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HICogKHRoaXMubGF5ZXJzLmxlbmd0aC0xKTtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhlaWdodCA9IGNvbnRhaW5lckhlaWdodDtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgbGF5ZXIudmlzdWFsSW5kZXggPSB0aGlzLl9sZXJwKGxheWVyLnZpc3VhbEluZGV4LCBpbmRleCwgZGVsdGFUKjQpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5fY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGxheWVyLnZpc3VhbEluZGV4KTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuc2NhbGVYID0gdHJhbnNmb3JtLnNjYWxlLng7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnNjYWxlWSA9IHRyYW5zZm9ybS5zY2FsZS55O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy50cmFuc2xhdGVYID0gdHJhbnNmb3JtLnRyYW5zbGF0ZS54O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy50cmFuc2xhdGVZID0gdHJhbnNmb3JtLnRyYW5zbGF0ZS55O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfbGVycChhLGIsdCkge1xuICAgICAgICByZXR1cm4gYSArIChiLWEpKnRcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfc2hvd0xheWVySW5DYXJvdXNlbChsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcblxuICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5pb3MpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsYXllci5jb250ZW50Vmlldy5pb3MpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250ZW50Vmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuaW9zKSB7XG4gICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci53ZWJWaWV3ICYmIGxheWVyLndlYlZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuXG4gICAgICAgIC8vIEZvciB0cmFuc3BhcmVudCB3ZWJ2aWV3cywgYWRkIGEgbGl0dGxlIGJpdCBvZiBvcGFjaXR5XG4gICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG5ldyBDb2xvcigxMjgsIDI1NSwgMjU1LCAyNTUpLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgfSk7XG4gICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6VElUTEVfQkFSX0hFSUdIVH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gU2hvdyB0aXRsZWJhcnNcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkudmlzaWJsZTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3IgdGhlIGZpcnN0IHRpbWUgJiBhbmltYXRlLlxuICAgICAgICBjb25zdCB7dHJhbnNsYXRlLCBzY2FsZX0gPSB0aGlzLl9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0oaWR4KTtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZSxcbiAgICAgICAgICAgIHNjYWxlLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXQsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2xheWVyQmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgIFxuICAgIHByaXZhdGUgX3Nob3dMYXllckluU3RhY2sobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG4gICAgICAgIFxuICAgICAgICBsYXllci50b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuXG4gICAgICAgIC8vbGF5ZXIuY29udGFpbmVyVmlldy5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSB0aGlzLmZvY3Vzc2VkTGF5ZXIgPT09IGxheWVyOyAgLy8gdG9kbzogaW52ZXN0aWdhdGUgdGhpc1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogXG4gICAgICAgICAgICAgICAgKHRoaXMucmVhbGl0eUxheWVyID09PSBsYXllciB8fCBcbiAgICAgICAgICAgICAgICAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlzQXJnb25BcHApIHx8IFxuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllciA9PT0gbGF5ZXIpID8gXG4gICAgICAgICAgICAgICAgICAgIDEgOiAwLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiB0aGlzLl9sYXllckJhY2tncm91bmRDb2xvcixcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxheWVyLmNvbnRlbnRWaWV3ICYmIGxheWVyLmNvbnRlbnRWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6MH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGlmIChsYXllci5jb250YWluZXJWaWV3Lmlvcykge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsYXllci5jb250ZW50Vmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250ZW50Vmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4oZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZSB0aXRsZWJhcnNcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICBsYXllci50aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBVcGRhdGUgZm9yIHRoZSBmaXJzdCB0aW1lICYgYW5pbWF0ZS5cbiAgICAgICAgbGF5ZXIudmlzdWFsSW5kZXggPSBpZHg7XG4gICAgICAgIHJldHVybiBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7IHg6IDAsIHk6IDAgfSxcbiAgICAgICAgICAgIHNjYWxlOiB7IHg6IDEsIHk6IDEgfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0LFxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX3Nob3dPdmVydmlldygpIHtcbiAgICAgICAgaWYgKHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkgcmV0dXJuO1xuICAgICAgICB0aGlzLl9vdmVydmlld0VuYWJsZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcikgPT4ge1xuICAgICAgICAgICAgdGhpcy5fc2hvd0xheWVySW5DYXJvdXNlbChsYXllcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBhbmltYXRlIHRoZSB2aWV3c1xuICAgICAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpLCAyMCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGlkZU92ZXJ2aWV3KCkge1xuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkgcmV0dXJuO1xuICAgICAgICB0aGlzLl9vdmVydmlld0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIHZhciBhbmltYXRpb25zID0gdGhpcy5sYXllcnMubWFwKChsYXllcikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Nob3dMYXllckluU3RhY2sobGF5ZXIpXG4gICAgICAgIH0pO1xuICAgICAgICBQcm9taXNlLmFsbChhbmltYXRpb25zKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sIDMwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN0b3AgYW5pbWF0aW5nIHRoZSB2aWV3c1xuICAgICAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCkgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcbiAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgbG9hZFVybCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIgIT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3VyaScsdXJsKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgndGl0bGUnLCBnZXRIb3N0KHVybCkpO1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCdpc0Zhdm9yaXRlJyxmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5nZXRDdXJyZW50VXJsKCkgPT09IHVybCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID09PSB1cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2ViVmlldy5zcmMgZG9lcyBub3QgdXBkYXRlIHdoZW4gdGhlIHVzZXIgY2xpY2tzIGEgbGluayBvbiBhIHdlYnBhZ2VcbiAgICAgICAgICAgICAgICAgICAgLy8gY2xlYXIgdGhlIHNyYyBwcm9wZXJ0eSB0byBmb3JjZSBhIHByb3BlcnR5IHVwZGF0ZSAobm90ZSB0aGF0IG5vdGlmeVByb3BlcnR5Q2hhbmdlIGRvZXNuJ3Qgd29yayBoZXJlKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPSB1cmw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID0gdXJsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzZXRGb2N1c3NlZExheWVyKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLl9mb2N1c3NlZExheWVyICE9PSBsYXllcikge1xuICAgICAgICAgICAgY29uc3QgcHJldmlvdXNGb2N1c3NlZExheWVyID0gdGhpcy5fZm9jdXNzZWRMYXllcjtcbiAgICAgICAgICAgIHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgPSBsYXllcjtcbiAgICAgICAgICAgIHRoaXMubm90aWZ5UHJvcGVydHlDaGFuZ2UoJ2ZvY3Vzc2VkTGF5ZXInLCBsYXllcik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNldCBmb2N1c3NlZCBsYXllcjogXCIgKyBsYXllci5kZXRhaWxzLnVyaSB8fCBcIk5ldyBDaGFubmVsXCIpO1xuXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIuZm9jdXMuc2Vzc2lvbiA9IGxheWVyLnNlc3Npb247XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2V0TGF5ZXJEZXRhaWxzKGxheWVyLmRldGFpbHMpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuXG4gICAgICAgICAgICBpZiAobGF5ZXIgIT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXllcnMuc3BsaWNlKHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpLCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcbiAgICAgICAgICAgICAgICBicmluZ1RvRnJvbnQobGF5ZXIuY29udGFpbmVyVmlldyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcmV2aW91c0ZvY3Vzc2VkTGF5ZXIpIHRoaXMuX3Nob3dMYXllckluU3RhY2socHJldmlvdXNGb2N1c3NlZExheWVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBmb2N1c3NlZExheWVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZm9jdXNzZWRMYXllcjtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0SG9zdCh1cmk/OnN0cmluZykge1xuICAgIHJldHVybiB1cmkgPyBVUkkucGFyc2UodXJpKS5ob3N0bmFtZSA6ICcnO1xufSJdfQ==