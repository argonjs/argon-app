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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBRTdCLDhDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsc0RBQTREO0FBQzVELGtDQUErQjtBQUMvQixvQ0FBaUM7QUFDakMsaURBQTRDO0FBQzVDLHdDQUFrRDtBQUNsRCxrQ0FNa0I7QUFDbEIsd0NBRXFCO0FBQ3JCLHNDQUEyQztBQUUzQyw4Q0FBMkM7QUFDM0MsOERBQTBEO0FBQzFELG9DQUF1QztBQUN2QywwREFBNkQ7QUFDN0QsOENBQWdEO0FBQ2hELHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFFckMsc0RBQWdFO0FBQ2hFLHdFQUE4RTtBQUM5RSw4Q0FBK0M7QUFFL0Msc0NBQXVDO0FBR3ZDLElBQUksdUJBQXVCLEdBQUcsSUFBSSx1QkFBVSxFQUFFLENBQUM7QUFFL0MsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFDeEMsSUFBTSwyQkFBMkIsR0FBRyxFQUFFLENBQUM7QUFDdkMsSUFBTSwwQkFBMEIsR0FBRyx3QkFBd0IsQ0FBQztBQWU1RDtJQUFpQywrQkFBVTtJQWdCdkM7UUFBQSxZQUNJLGlCQUFPLFNBaUNWO1FBaERELHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFFbEQsZUFBUyxHQUFRLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsZ0JBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDNUIsb0JBQWMsR0FBRyxJQUFJLHdCQUFVLENBQUM7UUFDaEMsWUFBTSxHQUFXLEVBQUUsQ0FBQztRQUdaLHNCQUFnQixHQUFHLEtBQUssQ0FBQztRQUl6QixxQkFBZSxHQUFHLEtBQUssQ0FBQztRQWdZeEIsZUFBUyxHQUFHLElBQUksQ0FBQyxH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O1xuaW1wb3J0IHtWaWV3fSBmcm9tICd1aS9jb3JlL3ZpZXcnO1xuaW1wb3J0IHtTY3JvbGxWaWV3fSBmcm9tICd1aS9zY3JvbGwtdmlldydcbmltcG9ydCB7Q29sb3J9IGZyb20gJ2NvbG9yJztcbmltcG9ydCB7R3JpZExheW91dCwgSXRlbVNwZWN9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHtMYWJlbH0gZnJvbSAndWkvbGFiZWwnO1xuaW1wb3J0IHtCdXR0b259IGZyb20gJ3VpL2J1dHRvbic7XG5pbXBvcnQge0FyZ29uV2ViVmlld30gZnJvbSAnYXJnb24td2ViLXZpZXcnO1xuaW1wb3J0IHtXZWJWaWV3LCBMb2FkRXZlbnREYXRhfSBmcm9tICd1aS93ZWItdmlldydcbmltcG9ydCB7XG4gICAgQW5pbWF0aW9uQ3VydmUsIFxuICAgIFZlcnRpY2FsQWxpZ25tZW50LCBcbiAgICBIb3Jpem9udGFsQWxpZ25tZW50LCBcbiAgICBUZXh0QWxpZ25tZW50LFxuICAgIFZpc2liaWxpdHlcbn0gZnJvbSAndWkvZW51bXMnO1xuaW1wb3J0IHtcbiAgR2VzdHVyZVR5cGVzXG59IGZyb20gJ3VpL2dlc3R1cmVzJztcbmltcG9ydCB7YnJpbmdUb0Zyb250fSBmcm9tICcuL2NvbW1vbi91dGlsJztcbmltcG9ydCB7UHJvcGVydHlDaGFuZ2VEYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnXG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0Fic29sdXRlTGF5b3V0fSBmcm9tICd1aS9sYXlvdXRzL2Fic29sdXRlLWxheW91dCc7XG5pbXBvcnQgZGlhbG9ncyA9IHJlcXVpcmUoXCJ1aS9kaWFsb2dzXCIpO1xuaW1wb3J0IGFwcGxpY2F0aW9uU2V0dGluZ3MgPSByZXF1aXJlKCdhcHBsaWNhdGlvbi1zZXR0aW5ncycpO1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5cbmltcG9ydCB7YXBwVmlld01vZGVsLCBMYXllckRldGFpbHN9IGZyb20gJy4vY29tbW9uL0FwcFZpZXdNb2RlbCdcbmltcG9ydCB7TmF0aXZlc2NyaXB0SG9zdGVkUmVhbGl0eVZpZXdlcn0gZnJvbSAnLi9jb21tb24vYXJnb24tcmVhbGl0eS12aWV3ZXJzJ1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tbW9uL2Jvb2ttYXJrcydcblxuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5cbmltcG9ydCBvYnNlcnZhYmxlTW9kdWxlID0gcmVxdWlyZShcImRhdGEvb2JzZXJ2YWJsZVwiKTtcbmxldCBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZSA9IG5ldyBPYnNlcnZhYmxlKCk7XG5cbmNvbnN0IFRJVExFX0JBUl9IRUlHSFQgPSAzMDtcbmNvbnN0IE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgPSAxNTA7XG5jb25zdCBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04gPSAyNTA7XG5jb25zdCBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04gPSA1NjtcbmNvbnN0IElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZID0gJ2lnbm9yZV93ZWJ2aWV3X3VwZ3JhZGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyIHtcbiAgICBzZXNzaW9uPzpBcmdvbi5TZXNzaW9uUG9ydCxcbiAgICBjb250YWluZXJWaWV3OkdyaWRMYXlvdXQsXG4gICAgY29udGVudFZpZXc6R3JpZExheW91dCxcbiAgICB3ZWJWaWV3PzpBcmdvbldlYlZpZXcsXG4gICAgdG91Y2hPdmVybGF5OkdyaWRMYXlvdXQsXG4gICAgdGl0bGVCYXI6R3JpZExheW91dCxcbiAgICBjbG9zZUJ1dHRvbjpCdXR0b24sXG4gICAgdGl0bGVMYWJlbDogTGFiZWwsXG4gICAgdmlzdWFsSW5kZXg6IG51bWJlcixcbiAgICBkZXRhaWxzOiBMYXllckRldGFpbHNcbn1cblxuZXhwb3J0IGNsYXNzIEJyb3dzZXJWaWV3IGV4dGVuZHMgR3JpZExheW91dCB7XG4gICAgcmVhbGl0eUxheWVyOkxheWVyO1xuICAgIHJlYWxpdHlXZWJ2aWV3cyA9IG5ldyBNYXA8c3RyaW5nLCBBcmdvbldlYlZpZXc+KCk7XG4gICAgXG4gICAgdmlkZW9WaWV3OlZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcbiAgICBzY3JvbGxWaWV3ID0gbmV3IFNjcm9sbFZpZXc7XG4gICAgbGF5ZXJDb250YWluZXIgPSBuZXcgR3JpZExheW91dDtcbiAgICBsYXllcnM6TGF5ZXJbXSA9IFtdO1xuICAgICAgICBcbiAgICBwcml2YXRlIF9mb2N1c3NlZExheWVyOkxheWVyO1xuICAgIHByaXZhdGUgX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgIFxuICAgIHByaXZhdGUgX2ludGVydmFsSWQ/Om51bWJlcjtcblxuICAgIHByaXZhdGUgX2NoZWNrZWRWZXJzaW9uID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJDb250YWluZXIuaW9zKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sYXllckNvbnRhaW5lci5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmNvbnRlbnQgPSB0aGlzLmxheWVyQ29udGFpbmVyO1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxWaWV3Lmlvcykge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zY3JvbGxWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnNjcm9sbFZpZXcpO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcihcIiM1NTVcIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcub24oU2Nyb2xsVmlldy5zY3JvbGxFdmVudCwgdGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVhbGl0eSBsYXllclxuICAgICAgICB0aGlzLl9jcmVhdGVSZWFsaXR5TGF5ZXIoKTtcblxuICAgICAgICAvLyBBZGQgYSBub3JtYWwgbGF5ZXIgdG8gYmUgdXNlZCB3aXRoIHRoZSB1cmwgYmFyLlxuICAgICAgICB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdExheW91dCgpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgX2NyZWF0ZVJlYWxpdHlMYXllcigpIHtcbiAgICAgICAgbGV0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDB4RkYyMjIyMjIpO1xuICAgICAgICBsYXllci50aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCd3aGl0ZScpO1xuICAgICAgICBsYXllci5jbG9zZUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcpIHtcbiAgICAgICAgICAgIC8vIHRoaXMudmlkZW9WaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICAvLyB0aGlzLnZpZGVvVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLnZpZGVvVmlldy5wYXJlbnQpIHRoaXMudmlkZW9WaWV3LnBhcmVudC5fcmVtb3ZlVmlldyh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICAvLyBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcucGFyZW50KSB0aGlzLnZpZGVvVmlldy5wYXJlbnQuX3JlbW92ZVZpZXcodGhpcy52aWRlb1ZpZXcpXG4gICAgICAgICAgICBjb25zdCB2aWRlb1ZpZXdMYXlvdXQgPSBuZXcgQWJzb2x1dGVMYXlvdXQoKTtcbiAgICAgICAgICAgIHZpZGVvVmlld0xheW91dC5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh2aWRlb1ZpZXdMYXlvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXBwVmlld01vZGVsLnJlYWR5LnRoZW4oKCk9PntcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZXIgPSBhcHBWaWV3TW9kZWwuYXJnb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5yZWFsaXR5Lmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdlYlZpZXcgPSB2aWV3ZXIud2ViVmlldztcbiAgICAgICAgICAgICAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3Muc2V0KHZpZXdlci51cmksIHdlYlZpZXcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIucmVhbGl0eS51bmluc3RhbGxlZEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHt2aWV3ZXJ9KT0+e1xuICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIgaW5zdGFuY2VvZiBOYXRpdmVzY3JpcHRIb3N0ZWRSZWFsaXR5Vmlld2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LnJlbW92ZUNoaWxkKHZpZXdlci53ZWJWaWV3KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5V2Vidmlld3MuZGVsZXRlKHZpZXdlci51cmkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtYW5hZ2VyLnJlYWxpdHkuY2hhbmdlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpZXdlciA9IG1hbmFnZXIucHJvdmlkZXIucmVhbGl0eS5nZXRWaWV3ZXJCeVVSSShjdXJyZW50ISkhO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSBsYXllci5kZXRhaWxzO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHZpZXdlci51cmk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3VyaScsIHVyaSk7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBnZXRIb3N0KHVyaSkpO1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcgPSB0aGlzLnJlYWxpdHlXZWJ2aWV3cy5nZXQodXJpKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEFyZ29uLlNlc3Npb25Qb3J0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3ZXIuc2Vzc2lvbiAmJiAhdmlld2VyLnNlc3Npb24uaXNDbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmlld2VyLnNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHZpZXdlci5jb25uZWN0RXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc2Vzc2lvblByb21pc2UudGhlbigoc2Vzc2lvbik9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPT09IG1hbmFnZXIucmVhbGl0eS5jdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnRpdGxlKSBkZXRhaWxzLnNldCgndGl0bGUnLCAnUmVhbGl0eTogJyArIHNlc3Npb24uaW5mby50aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnJlYWxpdHlMYXllciA9IGxheWVyO1xuICAgIH1cblxuICAgIGFkZExheWVyKCkgOiBMYXllciB7XG4gICAgICAgIGNvbnN0IGxheWVyOkxheWVyID0gdGhpcy5fY3JlYXRlTGF5ZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSBsYXllci53ZWJWaWV3ID0gbmV3IEFyZ29uV2ViVmlldztcbiAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBsYXllci5jb250ZW50Vmlldy5hZGRDaGlsZCh3ZWJWaWV3KTtcblxuICAgICAgICB3ZWJWaWV3Lm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldmVudERhdGE6UHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2goZXZlbnREYXRhLnByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd1cmknLCBldmVudERhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0aXRsZSc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gd2ViVmlldy50aXRsZSB8fCBnZXRIb3N0KHdlYlZpZXcudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgYm9va21hcmtzLnVwZGF0ZVRpdGxlKHdlYlZpZXcudXJsLCB0aXRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCd0aXRsZScsIHRpdGxlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnaXNBcmdvbkFwcCc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQXJnb25BcHAgPSBldmVudERhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FyZ29uQXBwIHx8IGxheWVyID09PSB0aGlzLmZvY3Vzc2VkTGF5ZXIgfHwgdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lm9wYWNpdHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGV2ZW50RGF0YTogTG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fY2hlY2tXZWJWaWV3VmVyc2lvbih3ZWJWaWV3KTtcbiAgICAgICAgICAgIGlmICghZXZlbnREYXRhLmVycm9yICYmIHdlYlZpZXcgIT09IHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICBib29rbWFya3MucHVzaFRvSGlzdG9yeShldmVudERhdGEudXJsLCB3ZWJWaWV3LnRpdGxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKCdzZXNzaW9uJywgKGUpPT57XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gZS5zZXNzaW9uO1xuICAgICAgICAgICAgbGF5ZXIuc2Vzc2lvbiA9IHNlc3Npb247XG4gICAgICAgICAgICBzZXNzaW9uLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICAgICAgaWYgKHdlYlZpZXcgPT09IHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5wcm92aWRlci5mb2N1cy5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyID09PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgIT09IEFyZ29uLlJvbGUuUkVBTElUWV9WSUVXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIk9ubHkgYSByZWFsaXR5IGNhbiBiZSBsb2FkZWQgaW4gdGhlIHJlYWxpdHkgbGF5ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiQSByZWFsaXR5IGNhbiBvbmx5IGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBzZXNzaW9uLmNsb3NlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoKT0+e1xuICAgICAgICAgICAgICAgIGxheWVyLnNlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5kZXRhaWxzLnNldCgnbG9nJywgd2ViVmlldy5sb2cpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuaXNMb2FkZWQpXG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkgdGhpcy5fc2hvd0xheWVySW5DYXJvdXNlbChsYXllcik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY3JlYXRlTGF5ZXIoKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRWaWV3ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgY29udGVudFZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgY29udGVudFZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG5cbiAgICAgICAgY29uc3QgY29udGFpbmVyVmlldyA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIGNvbnRhaW5lclZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdsZWZ0JztcbiAgICAgICAgY29udGFpbmVyVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICd0b3AnO1xuXG4gICAgICAgIC8vIENvdmVyIHRoZSB3ZWJ2aWV3IHRvIGRldGVjdCBnZXN0dXJlcyBhbmQgZGlzYWJsZSBpbnRlcmFjdGlvblxuICAgICAgICBjb25zdCB0b3VjaE92ZXJsYXkgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuICAgICAgICB0b3VjaE92ZXJsYXkuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdG91Y2hPdmVybGF5LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkub24oR2VzdHVyZVR5cGVzLnRhcCwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlQmFyID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkUm93KG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKDEsICdzdGFyJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIudmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC50b3A7XG4gICAgICAgIHRpdGxlQmFyLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlQmFyLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigyNDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICB0aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgdGl0bGVCYXIub3BhY2l0eSA9IDA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IG5ldyBCdXR0b24oKTtcbiAgICAgICAgY2xvc2VCdXR0b24uaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgY2xvc2VCdXR0b24udmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi50ZXh0ID0gJ2Nsb3NlJztcbiAgICAgICAgY2xvc2VCdXR0b24uY2xhc3NOYW1lID0gJ21hdGVyaWFsLWljb24nO1xuICAgICAgICBjbG9zZUJ1dHRvbi5zdHlsZS5mb250U2l6ZSA9IGFwcGxpY2F0aW9uLmFuZHJvaWQgPyAxNiA6IDIyO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3coY2xvc2VCdXR0b24sIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbihjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIFxuICAgICAgICBjbG9zZUJ1dHRvbi5vbigndGFwJywgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlTGF5ZXIobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlTGFiZWwgPSBuZXcgTGFiZWwoKTtcbiAgICAgICAgdGl0bGVMYWJlbC5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUxhYmVsLnZlcnRpY2FsQWxpZ25tZW50ID0gYXBwbGljYXRpb24uYW5kcm9pZCA/IFZlcnRpY2FsQWxpZ25tZW50LmNlbnRlciA6IFZlcnRpY2FsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlTGFiZWwudGV4dEFsaWdubWVudCA9IFRleHRBbGlnbm1lbnQuY2VudGVyO1xuICAgICAgICB0aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCdibGFjaycpO1xuICAgICAgICB0aXRsZUxhYmVsLmZvbnRTaXplID0gMTQ7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Um93KHRpdGxlTGFiZWwsIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbih0aXRsZUxhYmVsLCAxKTtcbiAgICAgICAgXG4gICAgICAgIHRpdGxlQmFyLmFkZENoaWxkKGNsb3NlQnV0dG9uKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQodGl0bGVMYWJlbCk7XG4gICAgICAgIFxuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKGNvbnRlbnRWaWV3KTtcbiAgICAgICAgY29udGFpbmVyVmlldy5hZGRDaGlsZCh0b3VjaE92ZXJsYXkpO1xuICAgICAgICBjb250YWluZXJWaWV3LmFkZENoaWxkKHRpdGxlQmFyKTtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5hZGRDaGlsZChjb250YWluZXJWaWV3KTtcbiAgICAgICAgXG4gICAgICAgIHZhciBsYXllciA9IHtcbiAgICAgICAgICAgIGNvbnRhaW5lclZpZXcsXG4gICAgICAgICAgICB3ZWJWaWV3OiB1bmRlZmluZWQsXG4gICAgICAgICAgICBjb250ZW50VmlldyxcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheSxcbiAgICAgICAgICAgIHRpdGxlQmFyLFxuICAgICAgICAgICAgY2xvc2VCdXR0b24sXG4gICAgICAgICAgICB0aXRsZUxhYmVsLFxuICAgICAgICAgICAgdmlzdWFsSW5kZXg6IHRoaXMubGF5ZXJzLmxlbmd0aCxcbiAgICAgICAgICAgIGRldGFpbHM6IG5ldyBMYXllckRldGFpbHMoKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG5cbiAgICAgICAgbGF5ZXIudGl0bGVMYWJlbC5iaW5kKHtcbiAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5OiAndGl0bGUnLFxuICAgICAgICAgICAgdGFyZ2V0UHJvcGVydHk6ICd0ZXh0J1xuICAgICAgICB9LCBsYXllci5kZXRhaWxzKTtcblxuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuICAgIFxuICAgIHJlbW92ZUxheWVyQXRJbmRleChpbmRleDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyc1tpbmRleF07XG4gICAgICAgIGlmICh0eXBlb2YgbGF5ZXIgPT09ICd1bmRlZmluZWQnKSBcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgbGF5ZXIgYXQgaW5kZXggJyArIGluZGV4KTtcbiAgICAgICAgbGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LnNlc3Npb24gJiYgbGF5ZXIud2ViVmlldy5zZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgIHRoaXMubGF5ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIucmVtb3ZlQ2hpbGQobGF5ZXIuY29udGFpbmVyVmlldyk7IC8vIGZvciBub3dcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgdGhpcy5yZW1vdmVMYXllckF0SW5kZXgoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBvbkxvYWRlZCgpIHtcbiAgICAgICAgc3VwZXIub25Mb2FkZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuYW5kcm9pZCkge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLmFkZE9uTGF5b3V0Q2hhbmdlTGlzdGVuZXIobmV3IGFuZHJvaWQudmlldy5WaWV3Lk9uTGF5b3V0Q2hhbmdlTGlzdGVuZXIoe1xuICAgICAgICAgICAgICAgIG9uTGF5b3V0Q2hhbmdlKHY6IGFuZHJvaWQudmlldy5WaWV3LCBsZWZ0OiBudW1iZXIsIHRvcDogbnVtYmVyLCByaWdodDogbnVtYmVyLCBib3R0b206IG51bWJlciwgb2xkTGVmdDogbnVtYmVyLCBvbGRUb3A6IG51bWJlciwgb2xkUmlnaHQ6IG51bWJlciwgb2xkQm90dG9tOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50RGF0YTogb2JzZXJ2YWJsZU1vZHVsZS5FdmVudERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudE5hbWU6IFwiY3VzdG9tTGF5b3V0Q2hhbmdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGFuZHJvaWRMYXlvdXRPYnNlcnZhYmxlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYW5kcm9pZExheW91dE9ic2VydmFibGUubm90aWZ5KGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgYW5kcm9pZExheW91dE9ic2VydmFibGUub24oXCJjdXN0b21MYXlvdXRDaGFuZ2VcIiwgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLmFuZHJvaWRPbkxheW91dCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vVXRpbC5icmluZ1RvRnJvbnQodGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldyk7XG4gICAgICAgIC8vVXRpbC5icmluZ1RvRnJvbnQodGhpcy5yZWFsaXR5TGF5ZXIudG91Y2hPdmVybGF5KTtcbiAgICAgICAgLy9VdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci50aXRsZUJhcik7XG4gICAgfVxuICAgIFxuICAgIG9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYykge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUod2lkdGhNZWFzdXJlU3BlYyk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUoaGVpZ2h0TWVhc3VyZVNwZWMpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcik9PntcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9KTtcblxuICAgICAgICBzdXBlci5vbk1lYXN1cmUod2lkdGhNZWFzdXJlU3BlYywgaGVpZ2h0TWVhc3VyZVNwZWMpO1xuICAgIH1cblxuICAgIGFuZHJvaWRPbkxheW91dCgpIHtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmdldEFjdHVhbFNpemUoKS53aWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0O1xuXG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpPT57XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY2hlY2tXZWJWaWV3VmVyc2lvbih3ZWJWaWV3OkFyZ29uV2ViVmlldykge1xuICAgICAgICBpZiAodGhpcy5fY2hlY2tlZFZlcnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXBwbGljYXRpb25TZXR0aW5ncy5oYXNLZXkoSUdOT1JFX1dFQlZJRVdfVVBHUkFERV9LRVkpKSB7XG4gICAgICAgICAgICB0aGlzLl9jaGVja2VkVmVyc2lvbiA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdlYlZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgY29uc3QgdmVyc2lvbiA9ICg8YW55PndlYlZpZXcpLmdldFdlYlZpZXdWZXJzaW9uKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuZHJvaWQgd2VidmlldyB2ZXJzaW9uOiBcIiArIHZlcnNpb24pO1xuICAgICAgICAgICAgaWYgKHZlcnNpb24gPCBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04pIHtcbiAgICAgICAgICAgICAgICBkaWFsb2dzLmNvbmZpcm0oe1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJVcGdyYWRlIFdlYlZpZXdcIixcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJZb3VyIEFuZHJvaWQgU3lzdGVtIFdlYlZpZXcgaXMgb3V0IG9mIGRhdGUuIFdlIHN1Z2dlc3QgYXQgbGVhc3QgdmVyc2lvbiBcIiArIE1JTl9BTkRST0lEX1dFQlZJRVdfVkVSU0lPTiArIFwiLCB5b3VyIGRldmljZSBjdXJyZW50bHkgaGFzIHZlcnNpb24gXCIgKyB2ZXJzaW9uICsgXCIuIFRoaXMgbWF5IHJlc3VsdCBpbiByZW5kZXJpbmcgaXNzdWVzLiBQbGVhc2UgdXBkYXRlIHZpYSB0aGUgR29vZ2xlIFBsYXkgU3RvcmUuXCIsXG4gICAgICAgICAgICAgICAgICAgIG9rQnV0dG9uVGV4dDogXCJVcGdyYWRlXCIsXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwiTGF0ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgbmV1dHJhbEJ1dHRvblRleHQ6IFwiSWdub3JlXCJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGdyYWRpbmcgd2Vidmlld1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGludGVudCA9IG5ldyBhbmRyb2lkLmNvbnRlbnQuSW50ZW50KGFuZHJvaWQuY29udGVudC5JbnRlbnQuQUNUSU9OX1ZJRVcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZW50LnNldERhdGEoYW5kcm9pZC5uZXQuVXJpLnBhcnNlKFwibWFya2V0Oi8vZGV0YWlscz9pZD1jb20uZ29vZ2xlLmFuZHJvaWQud2Vidmlld1wiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi5hbmRyb2lkLnN0YXJ0QWN0aXZpdHkuc3RhcnRBY3Rpdml0eShpbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZ3JhZGUgbmV2ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvblNldHRpbmdzLnNldEJvb2xlYW4oSUdOT1JFX1dFQlZJRVdfVVBHUkFERV9LRVksIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBncmFkZSBsYXRlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fY2hlY2tlZFZlcnNpb24gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShpbmRleDpudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbGF5ZXJQb3NpdGlvbiA9IGluZGV4ICogT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyAtIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbE9mZnNldDtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBvc2l0aW9uID0gbGF5ZXJQb3NpdGlvbiAvIHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgY29uc3QgdGhldGEgPSBNYXRoLm1pbihNYXRoLm1heChub3JtYWxpemVkUG9zaXRpb24sIDApLCAwLjg1KSAqIE1hdGguUEk7XG4gICAgICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gMSAtIChNYXRoLmNvcyh0aGV0YSkgLyAyICsgMC41KSAqIDAuMjU7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHtcbiAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgIHk6IGluZGV4ICogT1ZFUlZJRVdfVkVSVElDQUxfUEFERElOR1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgeDogc2NhbGVGYWN0b3IsXG4gICAgICAgICAgICAgICAgeTogc2NhbGVGYWN0b3JcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfbGFzdFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIHByaXZhdGUgX2FuaW1hdGUoKSB7XG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGRlbHRhVCA9IE1hdGgubWluKG5vdyAtIHRoaXMuX2xhc3RUaW1lLCAzMCkgLyAxMDAwO1xuICAgICAgICB0aGlzLl9sYXN0VGltZSA9IG5vdztcbiAgICAgICAgXG4gICAgICAgIC8vY29uc3Qgd2lkdGggPSB0aGlzLmdldE1lYXN1cmVkV2lkdGgoKTtcbiAgICAgICAgLy9jb25zdCBoZWlnaHQgPSB0aGlzLmdldE1lYXN1cmVkSGVpZ2h0KCk7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5nZXRBY3R1YWxTaXplKCkud2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lckhlaWdodCA9IGhlaWdodCArIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgKiAodGhpcy5sYXllcnMubGVuZ3RoLTEpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gY29udGFpbmVySGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBsYXllci52aXN1YWxJbmRleCA9IHRoaXMuX2xlcnAobGF5ZXIudmlzdWFsSW5kZXgsIGluZGV4LCBkZWx0YVQqNCk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSB0aGlzLl9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0obGF5ZXIudmlzdWFsSW5kZXgpO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5zY2FsZVggPSB0cmFuc2Zvcm0uc2NhbGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuc2NhbGVZID0gdHJhbnNmb3JtLnNjYWxlLnk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnRyYW5zbGF0ZVggPSB0cmFuc2Zvcm0udHJhbnNsYXRlLng7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LnRyYW5zbGF0ZVkgPSB0cmFuc2Zvcm0udHJhbnNsYXRlLnk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sZXJwKGEsYix0KSB7XG4gICAgICAgIHJldHVybiBhICsgKGItYSkqdFxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuXG4gICAgICAgIGlmIChsYXllci5jb250YWluZXJWaWV3Lmlvcykge1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxheWVyLmNvbnRlbnRWaWV3Lmlvcykge1xuICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRlbnRWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pb3MpIHtcbiAgICAgICAgICAgIGxheWVyLndlYlZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBsYXllci53ZWJWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgbGF5ZXIudG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG5cbiAgICAgICAgLy8gRm9yIHRyYW5zcGFyZW50IHdlYnZpZXdzLCBhZGQgYSBsaXR0bGUgYml0IG9mIG9wYWNpdHlcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyVmlldy5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbmV3IENvbG9yKDEyOCwgMjU1LCAyNTUsIDI1NSksXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICB9KTtcbiAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTpUSVRMRV9CQVJfSEVJR0hUfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBTaG93IHRpdGxlYmFyc1xuICAgICAgICBsYXllci50aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS52aXNpYmxlO1xuICAgICAgICBsYXllci50aXRsZUJhci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGNvbnN0IHt0cmFuc2xhdGUsIHNjYWxlfSA9IHRoaXMuX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShpZHgpO1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlLFxuICAgICAgICAgICAgc2NhbGUsXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX3Nob3dMYXllckluU3RhY2sobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5sYXllcnMuaW5kZXhPZihsYXllcik7XG4gICAgICAgIFxuICAgICAgICBsYXllci50b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuXG4gICAgICAgIC8vbGF5ZXIuY29udGFpbmVyVmlldy5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSB0aGlzLmZvY3Vzc2VkTGF5ZXIgPT09IGxheWVyOyAgLy8gdG9kbzogaW52ZXN0aWdhdGUgdGhpc1xuICAgICAgICBsYXllci5jb250YWluZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogXG4gICAgICAgICAgICAgICAgKHRoaXMucmVhbGl0eUxheWVyID09PSBsYXllciB8fCBcbiAgICAgICAgICAgICAgICAobGF5ZXIud2ViVmlldyAmJiBsYXllci53ZWJWaWV3LmlzQXJnb25BcHApIHx8IFxuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllciA9PT0gbGF5ZXIpID8gXG4gICAgICAgICAgICAgICAgICAgIDEgOiAwLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBuZXcgQ29sb3IoMCwgMjU1LCAyNTUsIDI1NSksXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICB9KTtcblxuICAgICAgICBsYXllci5jb250ZW50VmlldyAmJiBsYXllci5jb250ZW50Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyVmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lclZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4oZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGVudFZpZXcuaW9zKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGVudFZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGVudFZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRlbnRWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLndlYlZpZXcgJiYgbGF5ZXIud2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gaWR4O1xuICAgICAgICByZXR1cm4gbGF5ZXIuY29udGFpbmVyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBzY2FsZTogeyB4OiAxLCB5OiAxIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gYW5pbWF0ZSB0aGUgdmlld3NcbiAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuX2FuaW1hdGUuYmluZCh0aGlzKSwgMjApO1xuICAgIH1cblxuICAgIGhpZGVPdmVydmlldygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgYW5pbWF0aW9ucyA9IHRoaXMubGF5ZXJzLm1hcCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaG93TGF5ZXJJblN0YWNrKGxheWVyKVxuICAgICAgICB9KTtcbiAgICAgICAgUHJvbWlzZS5hbGwoYW5pbWF0aW9ucykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIGFuaW1hdGluZyB0aGUgdmlld3NcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQpIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHVibGljIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd1cmknLHVybCk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3RpdGxlJywgZ2V0SG9zdCh1cmwpKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgnaXNGYXZvcml0ZScsZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuZ2V0Q3VycmVudFVybCgpID09PSB1cmwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9PT0gdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdlYlZpZXcuc3JjIGRvZXMgbm90IHVwZGF0ZSB3aGVuIHRoZSB1c2VyIGNsaWNrcyBhIGxpbmsgb24gYSB3ZWJwYWdlXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHRoZSBzcmMgcHJvcGVydHkgdG8gZm9yY2UgYSBwcm9wZXJ0eSB1cGRhdGUgKG5vdGUgdGhhdCBub3RpZnlQcm9wZXJ0eUNoYW5nZSBkb2Vzbid0IHdvcmsgaGVyZSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID0gdXJsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9IHVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0Rm9jdXNzZWRMYXllcihsYXllcjpMYXllcikge1xuICAgICAgICBpZiAodGhpcy5fZm9jdXNzZWRMYXllciAhPT0gbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgPSBsYXllcjtcbiAgICAgICAgICAgIHRoaXMubm90aWZ5UHJvcGVydHlDaGFuZ2UoJ2ZvY3Vzc2VkTGF5ZXInLCBsYXllcik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNldCBmb2N1c3NlZCBsYXllcjogXCIgKyBsYXllci5kZXRhaWxzLnVyaSB8fCBcIk5ldyBDaGFubmVsXCIpO1xuXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24ucHJvdmlkZXIuZm9jdXMuc2Vzc2lvbiA9IGxheWVyLnNlc3Npb247XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2V0TGF5ZXJEZXRhaWxzKGxheWVyLmRldGFpbHMpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgaWYgKGxheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJzLnNwbGljZSh0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKSwgMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG4gICAgICAgICAgICAgICAgYnJpbmdUb0Zyb250KGxheWVyLmNvbnRhaW5lclZpZXcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGZvY3Vzc2VkTGF5ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mb2N1c3NlZExheWVyO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRIb3N0KHVyaT86c3RyaW5nKSB7XG4gICAgcmV0dXJuIHVyaSA/IFVSSS5wYXJzZSh1cmkpLmhvc3RuYW1lIDogJyc7XG59Il19