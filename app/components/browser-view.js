"use strict";
var scroll_view_1 = require("ui/scroll-view");
var color_1 = require("color");
var absolute_layout_1 = require("ui/layouts/absolute-layout");
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
        _this.videoView = vuforia.videoView;
        _this.scrollView = new scroll_view_1.ScrollView;
        _this.layerContainer = new grid_layout_1.GridLayout;
        _this.layers = [];
        _this._overviewEnabled = false;
        _this._scrollOffset = 0;
        _this._panStartOffset = 0;
        _this._checkedVersion = false;
        _this._lastTime = Date.now();
        _this.realityLayer = _this.addLayer();
        if (vuforia.api) {
            _this.realityLayer.webView.style.visibility = 'collapsed';
        }
        _this.realityLayer.titleBar.backgroundColor = new color_1.Color(0xFF222222);
        _this.realityLayer.titleLabel.color = new color_1.Color('white');
        _this.realityLayer.closeButton.visibility = 'collapsed';
        if (_this.realityLayer.webView.ios) {
            // disable user navigation of the reality view
            _this.realityLayer.webView.ios.allowsBackForwardNavigationGestures = false;
        }
        if (_this.videoView) {
            _this.videoView.horizontalAlignment = 'stretch';
            _this.videoView.verticalAlignment = 'stretch';
            if (_this.videoView.parent)
                _this.videoView.parent._removeView(_this.videoView);
            var videoViewLayout = new absolute_layout_1.AbsoluteLayout();
            videoViewLayout.addChild(_this.videoView);
            _this.realityLayer.container.addChild(videoViewLayout);
        }
        // do this in onLoaded instead
        //Util.bringToFront(this.realityLayer.webView);
        //Util.bringToFront(this.realityLayer.touchOverlay);
        //Util.bringToFront(this.realityLayer.titleBar);
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
        // Make a new layer to be used with the url bar.
        _this.addLayer();
        application.on(application.orientationChangedEvent, function () {
            _this.requestLayout();
            _this.scrollView.scrollToVerticalOffset(0, false);
        });
        AppViewModel_1.manager.reality.changeEvent.addEventListener(function (_a) {
            var current = _a.current;
            // const realityListItem = bookmarks.realityMap.get(current.uri);
            var details = _this.realityLayer.details;
            details.set('title', 'Reality: ' + current.title);
            details.set('uri', current.uri);
            details.set('supportedInteractionModes', ['page', 'immersive']);
            if (current === bookmarks.LIVE_VIDEO_REALITY) {
                _this.realityLayer.webView.visibility = 'collapse';
            }
            else {
                _this.realityLayer.webView.visibility = 'visible';
            }
        });
        // enable pinch-zoom
        _this.layerContainer.on(gestures_1.GestureTypes.pinch, _this._handlePinch, _this);
        return _this;
    }
    BrowserView.prototype.addLayer = function () {
        var _this = this;
        var layer;
        var container = new grid_layout_1.GridLayout();
        container.horizontalAlignment = 'left';
        container.verticalAlignment = 'top';
        var webView = new argon_web_view_1.ArgonWebView;
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        webView.on('propertyChange', function (eventData) {
            switch (eventData.propertyName) {
                case 'url':
                    layer.details.set('uri', eventData.value);
                    break;
                case 'title':
                    var historyBookmarkItem = bookmarks.historyMap.get(webView.url);
                    if (historyBookmarkItem) {
                        historyBookmarkItem.set('title', eventData.value);
                    }
                    if (layer !== _this.realityLayer)
                        layer.details.set('title', eventData.value);
                    break;
                case 'isArgonApp':
                    var isArgonApp = eventData.value;
                    layer.details.set('supportedInteractionModes', isArgonApp ?
                        ['page', 'immersive'] :
                        ['page']);
                    if (isArgonApp || layer === _this.focussedLayer || _this._overviewEnabled) {
                        layer.container.animate({
                            opacity: 1,
                            duration: OVERVIEW_ANIMATION_DURATION
                        });
                    }
                    else {
                        layer.container.opacity = 1;
                    }
                    break;
                default: break;
            }
        });
        webView.on(web_view_1.WebView.loadFinishedEvent, function (eventData) {
            _this._checkWebViewVersion(webView);
            if (!eventData.error && webView !== _this.realityLayer.webView) {
                var historyBookmarkItem = bookmarks.historyMap.get(eventData.url);
                if (historyBookmarkItem) {
                    var i = bookmarks.historyList.indexOf(historyBookmarkItem);
                    bookmarks.historyList.splice(i, 1);
                    bookmarks.historyList.unshift(historyBookmarkItem);
                }
                else {
                    bookmarks.historyList.unshift(new bookmarks.BookmarkItem({
                        uri: eventData.url,
                        title: webView.title
                    }));
                }
            }
            if (_this.focussedLayer.webView === webView) {
                var session = webView.session;
                var gestureObservers = _this.layerContainer.getGestureObservers(gestures_1.GestureTypes.pinch);
                if (!session || (session && session.info['app.disablePinchZoom'])) {
                    _this.layerContainer.off(gestures_1.GestureTypes.pinch);
                }
                else if (!gestureObservers || (gestureObservers && gestureObservers.length === 0)) {
                    _this.layerContainer.on(gestures_1.GestureTypes.pinch, _this._handlePinch, _this);
                }
            }
        });
        webView.on('session', function (e) {
            var session = e.session;
            session.connectEvent.addEventListener(function () {
                if (webView === _this.focussedLayer.webView) {
                    AppViewModel_1.manager.focus.setSession(session);
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
        });
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
        container.addChild(webView);
        container.addChild(touchOverlay);
        container.addChild(titleBar);
        this.layerContainer.addChild(container);
        layer = {
            container: container,
            webView: webView,
            touchOverlay: touchOverlay,
            titleBar: titleBar,
            closeButton: closeButton,
            titleLabel: titleLabel,
            visualIndex: this.layers.length,
            details: new AppViewModel_1.LayerDetails(webView)
        };
        this.layers.push(layer);
        if (this.isLoaded)
            this.setFocussedLayer(layer);
        titleLabel.bind({
            sourceProperty: 'title',
            targetProperty: 'text'
        }, layer.details);
        if (this._overviewEnabled)
            this._showLayerInCarousel(layer);
        return layer;
    };
    BrowserView.prototype.removeLayerAtIndex = function (index) {
        var layer = this.layers[index];
        if (typeof layer === 'undefined')
            throw new Error('Expected layer at index ' + index);
        this.layers.splice(index, 1);
        this.layerContainer.removeChild(layer.container); // for now
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
        util_1.Util.bringToFront(this.realityLayer.webView);
        util_1.Util.bringToFront(this.realityLayer.touchOverlay);
        util_1.Util.bringToFront(this.realityLayer.titleBar);
    };
    BrowserView.prototype.onMeasure = function (widthMeasureSpec, heightMeasureSpec) {
        var width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
        var height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
        if (!this._overviewEnabled) {
            this.layerContainer.width = width;
            this.layerContainer.height = height;
        }
        this.layers.forEach(function (layer) {
            layer.container.width = width;
            layer.container.height = height;
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
            layer.container.width = width;
            layer.container.height = height;
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
            layer.container.scaleX = transform.scale.x;
            layer.container.scaleY = transform.scale.y;
            layer.container.translateX = transform.translate.x;
            layer.container.translateY = transform.translate.y;
        });
    };
    BrowserView.prototype._lerp = function (a, b, t) {
        return a + (b - a) * t;
    };
    BrowserView.prototype._showLayerInCarousel = function (layer) {
        var idx = this.layers.indexOf(layer);
        if (layer.webView.ios) {
            layer.webView.ios.layer.masksToBounds = true;
        }
        else if (layer.webView.android) {
            layer.webView.android.setClipChildren(true);
        }
        if (layer.container.ios) {
            layer.container.ios.layer.masksToBounds = true;
        }
        else if (layer.container.android) {
            layer.container.android.setClipChildren(true);
        }
        layer.touchOverlay.style.visibility = 'visible';
        // For transparent webviews, add a little bit of opacity
        layer.container.isUserInteractionEnabled = true;
        layer.container.animate({
            opacity: 1,
            backgroundColor: new color_1.Color(128, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.webView.animate({
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
        layer.container.animate({
            translate: translate,
            scale: scale,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: enums_1.AnimationCurve.easeInOut,
        });
    };
    BrowserView.prototype._showLayerInStack = function (layer) {
        var idx = this.layers.indexOf(layer);
        layer.touchOverlay.style.visibility = 'collapsed';
        // For transparent webviews, add a little bit of opacity
        layer.container.isUserInteractionEnabled = this.focussedLayer === layer;
        layer.container.animate({
            opacity: this.realityLayer === layer || layer.webView.isArgonApp || this.focussedLayer === layer ? 1 : 0,
            backgroundColor: new color_1.Color(0, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.webView.animate({
            translate: { x: 0, y: 0 },
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(function () {
            if (layer.webView.ios) {
                layer.webView.ios.layer.masksToBounds = false;
            }
            else if (layer.webView.android) {
                layer.webView.android.setClipChildren(true);
            }
            if (layer.container.ios) {
                layer.container.ios.layer.masksToBounds = false;
            }
            else if (layer.container.android) {
                layer.container.android.setClipChildren(true);
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
        return layer.container.animate({
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
        // disable pinch-zoom
        this.layerContainer.off(gestures_1.GestureTypes.pinch, this._handlePinch, this);
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
        // enable pinch-zoom
        this.layerContainer.on(gestures_1.GestureTypes.pinch, this._handlePinch, this);
    };
    BrowserView.prototype._handlePinch = function (event) {
        switch (event.state) {
            case gestures_1.GestureStateTypes.began:
                var state = AppViewModel_1.manager.context.serializedFrameState;
                if (state) {
                    this._pinchStartFov = state.view.subviews[0].frustum.fov;
                }
                else {
                    this._pinchStartFov = undefined;
                }
                if (this._pinchStartFov === undefined)
                    return;
                AppViewModel_1.manager.reality.zoom({
                    zoom: 1,
                    fov: this._pinchStartFov,
                    state: Argon.RealityZoomState.START
                });
                break;
            case gestures_1.GestureStateTypes.changed:
                if (this._pinchStartFov === undefined)
                    return;
                AppViewModel_1.manager.reality.zoom({
                    zoom: event.scale,
                    fov: this._pinchStartFov,
                    state: Argon.RealityZoomState.CHANGE
                });
                break;
            default:
                if (this._pinchStartFov === undefined)
                    return;
                AppViewModel_1.manager.reality.zoom({
                    zoom: event.scale,
                    fov: this._pinchStartFov,
                    state: Argon.RealityZoomState.END
                });
                break;
        }
    };
    BrowserView.prototype.loadUrl = function (url) {
        if (this.focussedLayer !== this.realityLayer) {
            this.focussedLayer.details.set('uri', url);
            this.focussedLayer.details.set('title', '');
            this.focussedLayer.details.set('isFavorite', false);
            this.focussedLayer.details.set('supportedInteractionModes', ['page', 'immersive']);
        }
        //if (this.focussedLayer.webView.src === url) this.focussedLayer.webView.reload(); // src isn't safe to use here, as it's the original url (not the current)
        if (this.focussedLayer.webView.getCurrentUrl() === url)
            this.focussedLayer.webView.reload();
        else
            this.focussedLayer.webView.src = url;
    };
    BrowserView.prototype.setFocussedLayer = function (layer) {
        if (this._focussedLayer !== layer) {
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            console.log("Set focussed layer: " + layer.details.uri || "New Channel");
            var session = layer.webView.session;
            AppViewModel_1.manager.focus.setSession(session);
            AppViewModel_1.appViewModel.setLayerDetails(this.focussedLayer.details);
            AppViewModel_1.appViewModel.hideOverview();
            if (layer !== this.realityLayer) {
                this.layers.splice(this.layers.indexOf(layer), 1);
                this.layers.push(layer);
                util_1.Util.bringToFront(layer.container);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSw4Q0FBeUM7QUFFekMsK0JBQTRCO0FBRTVCLDhEQUEwRDtBQUMxRCxzREFBNEQ7QUFFNUQsa0NBQStCO0FBQy9CLG9DQUFpQztBQUNqQyxpREFBNEM7QUFDNUMsd0NBQWtEO0FBQ2xELGtDQU9rQjtBQUNsQix3Q0FNcUI7QUFDckIsc0NBQW1DO0FBR25DLDhDQUEyQztBQUMzQyxvQ0FBdUM7QUFDdkMsMERBQTZEO0FBQzdELDhDQUFnRDtBQUdoRCx5Q0FBMkM7QUFDM0MsbUNBQXFDO0FBRXJDLHNEQUF5RTtBQUN6RSw4Q0FBK0M7QUFFL0Msc0NBQXVDO0FBR3ZDLElBQUksdUJBQXVCLEdBQUcsSUFBSSx1QkFBVSxFQUFFLENBQUM7QUFFL0MsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFDeEMsSUFBTSwyQkFBMkIsR0FBRyxFQUFFLENBQUM7QUFDdkMsSUFBTSwwQkFBMEIsR0FBRyx3QkFBd0IsQ0FBQztBQWE1RDtJQUFpQywrQkFBVTtJQWlCdkM7UUFBQSxZQUNJLGlCQUFPLFNBd0VWO1FBdkZELGVBQVMsR0FBUSxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQ25DLGdCQUFVLEdBQUcsSUFBSSx3QkFBVSxDQUFDO1FBQzVCLG9CQUFjLEdBQUcsSUFBSSx3QkFBVSxDQUFDO1FBQ2hDLFlBQU0sR0FBVyxFQUFFLENBQUM7UUFHWixzQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDekIsbUJBQWEsR0FBRyxDQUFDLENBQUM7UUFDbEIscUJBQWUsR0FBRyxDQUFDLENBQUM7UUFJcEIscUJBQWUsR0FBRyxLQUFLLENBQUM7UUE0V3hCLGVBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENB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WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUMvQixDQUFDOzs7T0FBQTtJQUNMLGtCQUFDO0FBQUQsQ0FBQyxBQW5tQkQsQ0FBaUMsd0JBQVUsR0FtbUIxQztBQW5tQlksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1ZpZXd9IGZyb20gJ3VpL2NvcmUvdmlldyc7XG5pbXBvcnQge1Njcm9sbFZpZXd9IGZyb20gJ3VpL3Njcm9sbC12aWV3J1xuaW1wb3J0IHtQYWdlfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7Q29sb3J9IGZyb20gJ2NvbG9yJztcbmltcG9ydCB7TGF5b3V0fSBmcm9tICd1aS9sYXlvdXRzL2xheW91dCc7XG5pbXBvcnQge0Fic29sdXRlTGF5b3V0fSBmcm9tICd1aS9sYXlvdXRzL2Fic29sdXRlLWxheW91dCc7XG5pbXBvcnQge0dyaWRMYXlvdXQsIEl0ZW1TcGVjfSBmcm9tICd1aS9sYXlvdXRzL2dyaWQtbGF5b3V0JztcbmltcG9ydCB7U3RhY2tMYXlvdXR9IGZyb20gJ3VpL2xheW91dHMvc3RhY2stbGF5b3V0JztcbmltcG9ydCB7TGFiZWx9IGZyb20gJ3VpL2xhYmVsJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtBcmdvbldlYlZpZXd9IGZyb20gJ2FyZ29uLXdlYi12aWV3JztcbmltcG9ydCB7V2ViVmlldywgTG9hZEV2ZW50RGF0YX0gZnJvbSAndWkvd2ViLXZpZXcnXG5pbXBvcnQge1xuICAgIEFuaW1hdGlvbkN1cnZlLCBcbiAgICBWZXJ0aWNhbEFsaWdubWVudCwgXG4gICAgSG9yaXpvbnRhbEFsaWdubWVudCwgXG4gICAgT3JpZW50YXRpb24sIFxuICAgIFRleHRBbGlnbm1lbnQsXG4gICAgVmlzaWJpbGl0eVxufSBmcm9tICd1aS9lbnVtcyc7XG5pbXBvcnQge1xuICBHZXN0dXJlVHlwZXMsXG4gIEdlc3R1cmVTdGF0ZVR5cGVzLFxuICBQYW5HZXN0dXJlRXZlbnREYXRhLFxuICBQaW5jaEdlc3R1cmVFdmVudERhdGEsXG4gIEdlc3R1cmVFdmVudERhdGEsXG59IGZyb20gJ3VpL2dlc3R1cmVzJztcbmltcG9ydCB7VXRpbH0gZnJvbSAnLi9jb21tb24vdXRpbCc7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJ1xuaW1wb3J0IHtQbGFjZWhvbGRlciwgQ3JlYXRlVmlld0V2ZW50RGF0YX0gZnJvbSAndWkvcGxhY2Vob2xkZXInXG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgZGlhbG9ncyA9IHJlcXVpcmUoXCJ1aS9kaWFsb2dzXCIpO1xuaW1wb3J0IGFwcGxpY2F0aW9uU2V0dGluZ3MgPSByZXF1aXJlKCdhcHBsaWNhdGlvbi1zZXR0aW5ncycpO1xuaW1wb3J0ICogYXMgdnVmb3JpYSBmcm9tICduYXRpdmVzY3JpcHQtdnVmb3JpYSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmaWxlLXN5c3RlbSc7XG5pbXBvcnQgKiBhcyBmcmFtZXMgZnJvbSAndWkvZnJhbWUnO1xuaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSAnYXBwbGljYXRpb24nO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQge21hbmFnZXIsIGFwcFZpZXdNb2RlbCwgTGF5ZXJEZXRhaWxzfSBmcm9tICcuL2NvbW1vbi9BcHBWaWV3TW9kZWwnXG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9jb21tb24vYm9va21hcmtzJ1xuXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbidcblxuaW1wb3J0IG9ic2VydmFibGVNb2R1bGUgPSByZXF1aXJlKFwiZGF0YS9vYnNlcnZhYmxlXCIpO1xubGV0IGFuZHJvaWRMYXlvdXRPYnNlcnZhYmxlID0gbmV3IE9ic2VydmFibGUoKTtcblxuY29uc3QgVElUTEVfQkFSX0hFSUdIVCA9IDMwO1xuY29uc3QgT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyA9IDE1MDtcbmNvbnN0IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTiA9IDI1MDtcbmNvbnN0IE1JTl9BTkRST0lEX1dFQlZJRVdfVkVSU0lPTiA9IDU2O1xuY29uc3QgSUdOT1JFX1dFQlZJRVdfVVBHUkFERV9LRVkgPSAnaWdub3JlX3dlYnZpZXdfdXBncmFkZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXIge1xuICAgIHdlYlZpZXc6QXJnb25XZWJWaWV3LFxuICAgIGNvbnRhaW5lcjpHcmlkTGF5b3V0LFxuICAgIHRvdWNoT3ZlcmxheTpHcmlkTGF5b3V0LFxuICAgIHRpdGxlQmFyOkdyaWRMYXlvdXQsXG4gICAgY2xvc2VCdXR0b246QnV0dG9uLFxuICAgIHRpdGxlTGFiZWw6IExhYmVsLFxuICAgIHZpc3VhbEluZGV4OiBudW1iZXIsXG4gICAgZGV0YWlsczogTGF5ZXJEZXRhaWxzXG59XG5cbmV4cG9ydCBjbGFzcyBCcm93c2VyVmlldyBleHRlbmRzIEdyaWRMYXlvdXQge1xuICAgIHJlYWxpdHlMYXllcjpMYXllcjtcbiAgICBcbiAgICB2aWRlb1ZpZXc6VmlldyA9IHZ1Zm9yaWEudmlkZW9WaWV3O1xuICAgIHNjcm9sbFZpZXcgPSBuZXcgU2Nyb2xsVmlldztcbiAgICBsYXllckNvbnRhaW5lciA9IG5ldyBHcmlkTGF5b3V0O1xuICAgIGxheWVyczpMYXllcltdID0gW107XG4gICAgICAgIFxuICAgIHByaXZhdGUgX2ZvY3Vzc2VkTGF5ZXI6TGF5ZXI7XG4gICAgcHJpdmF0ZSBfb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsT2Zmc2V0ID0gMDtcbiAgICBwcml2YXRlIF9wYW5TdGFydE9mZnNldCA9IDA7XG4gICAgXG4gICAgcHJpdmF0ZSBfaW50ZXJ2YWxJZD86bnVtYmVyO1xuXG4gICAgcHJpdmF0ZSBfY2hlY2tlZFZlcnNpb24gPSBmYWxzZTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnJlYWxpdHlMYXllciA9IHRoaXMuYWRkTGF5ZXIoKTtcbiAgICAgICAgaWYgKHZ1Zm9yaWEuYXBpKSB7XG4gICAgICAgICAgICB0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3LnN0eWxlLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlYWxpdHlMYXllci50aXRsZUJhci5iYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoMHhGRjIyMjIyMik7XG4gICAgICAgIHRoaXMucmVhbGl0eUxheWVyLnRpdGxlTGFiZWwuY29sb3IgPSBuZXcgQ29sb3IoJ3doaXRlJyk7XG4gICAgICAgIHRoaXMucmVhbGl0eUxheWVyLmNsb3NlQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSB1c2VyIG5hdmlnYXRpb24gb2YgdGhlIHJlYWxpdHkgdmlld1xuICAgICAgICAgICAgKHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcuaW9zIGFzIFdLV2ViVmlldykuYWxsb3dzQmFja0ZvcndhcmROYXZpZ2F0aW9uR2VzdHVyZXMgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMudmlkZW9WaWV3KSB7XG4gICAgICAgICAgICB0aGlzLnZpZGVvVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgdGhpcy52aWRlb1ZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb1ZpZXcucGFyZW50KSB0aGlzLnZpZGVvVmlldy5wYXJlbnQuX3JlbW92ZVZpZXcodGhpcy52aWRlb1ZpZXcpXG4gICAgICAgICAgICBjb25zdCB2aWRlb1ZpZXdMYXlvdXQgPSBuZXcgQWJzb2x1dGVMYXlvdXQoKTtcbiAgICAgICAgICAgIHZpZGVvVmlld0xheW91dC5hZGRDaGlsZCh0aGlzLnZpZGVvVmlldyk7XG4gICAgICAgICAgICB0aGlzLnJlYWxpdHlMYXllci5jb250YWluZXIuYWRkQ2hpbGQodmlkZW9WaWV3TGF5b3V0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRvIHRoaXMgaW4gb25Mb2FkZWQgaW5zdGVhZFxuICAgICAgICAvL1V0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcpO1xuICAgICAgICAvL1V0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLnRvdWNoT3ZlcmxheSk7XG4gICAgICAgIC8vVXRpbC5icmluZ1RvRnJvbnQodGhpcy5yZWFsaXR5TGF5ZXIudGl0bGVCYXIpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICBpZiAodGhpcy5sYXllckNvbnRhaW5lci5pb3MpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxheWVyQ29udGFpbmVyLmFuZHJvaWQpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4oZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0aGlzLnNjcm9sbFZpZXcuY29udGVudCA9IHRoaXMubGF5ZXJDb250YWluZXI7XG4gICAgICAgIGlmICh0aGlzLnNjcm9sbFZpZXcuaW9zKSB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnNjcm9sbFZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuc2Nyb2xsVmlldyk7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKFwiIzU1NVwiKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5vbihTY3JvbGxWaWV3LnNjcm9sbEV2ZW50LCB0aGlzLl9hbmltYXRlLmJpbmQodGhpcykpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBhIG5ldyBsYXllciB0byBiZSB1c2VkIHdpdGggdGhlIHVybCBiYXIuXG4gICAgICAgIHRoaXMuYWRkTGF5ZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKT0+e1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0TGF5b3V0KCk7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICBtYW5hZ2VyLnJlYWxpdHkuY2hhbmdlRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoe2N1cnJlbnR9KT0+e1xuICAgICAgICAgICAgLy8gY29uc3QgcmVhbGl0eUxpc3RJdGVtID0gYm9va21hcmtzLnJlYWxpdHlNYXAuZ2V0KGN1cnJlbnQudXJpKTtcbiAgICAgICAgICAgIGNvbnN0IGRldGFpbHMgPSB0aGlzLnJlYWxpdHlMYXllci5kZXRhaWxzO1xuICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3RpdGxlJywgJ1JlYWxpdHk6ICcgKyBjdXJyZW50LnRpdGxlKTtcbiAgICAgICAgICAgIGRldGFpbHMuc2V0KCd1cmknLCBjdXJyZW50LnVyaSk7XG4gICAgICAgICAgICBkZXRhaWxzLnNldCgnc3VwcG9ydGVkSW50ZXJhY3Rpb25Nb2RlcycsIFsncGFnZScsJ2ltbWVyc2l2ZSddKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50ID09PSBib29rbWFya3MuTElWRV9WSURFT19SRUFMSVRZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIGVuYWJsZSBwaW5jaC16b29tXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIub24oR2VzdHVyZVR5cGVzLnBpbmNoLCB0aGlzLl9oYW5kbGVQaW5jaCwgdGhpcyk7XG4gICAgfVxuXG4gICAgYWRkTGF5ZXIoKSB7XG4gICAgICAgIGxldCBsYXllcjpMYXllcjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIGNvbnRhaW5lci5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ2xlZnQnO1xuICAgICAgICBjb250YWluZXIudmVydGljYWxBbGlnbm1lbnQgPSAndG9wJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSBuZXcgQXJnb25XZWJWaWV3O1xuICAgICAgICB3ZWJWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHdlYlZpZXcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG5cbiAgICAgICAgd2ViVmlldy5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZlbnREYXRhOlByb3BlcnR5Q2hhbmdlRGF0YSkgPT4ge1xuICAgICAgICAgICAgc3dpdGNoKGV2ZW50RGF0YS5wcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndXJpJywgZXZlbnREYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGl0bGUnOlxuICAgICAgICAgICAgICAgICAgICB2YXIgaGlzdG9yeUJvb2ttYXJrSXRlbSA9IGJvb2ttYXJrcy5oaXN0b3J5TWFwLmdldCh3ZWJWaWV3LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoaXN0b3J5Qm9va21hcmtJdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoaXN0b3J5Qm9va21hcmtJdGVtLnNldCgndGl0bGUnLCBldmVudERhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXllciAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5kZXRhaWxzLnNldCgndGl0bGUnLCBldmVudERhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdpc0FyZ29uQXBwJzpcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNBcmdvbkFwcCA9IGV2ZW50RGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZGV0YWlscy5zZXQoJ3N1cHBvcnRlZEludGVyYWN0aW9uTW9kZXMnLCBpc0FyZ29uQXBwID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBbJ3BhZ2UnLCAnaW1tZXJzaXZlJ10gOlxuICAgICAgICAgICAgICAgICAgICAgICAgWydwYWdlJ11cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJnb25BcHAgfHwgbGF5ZXIgPT09IHRoaXMuZm9jdXNzZWRMYXllciB8fCB0aGlzLl9vdmVydmlld0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLm9wYWNpdHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGV2ZW50RGF0YTogTG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fY2hlY2tXZWJWaWV3VmVyc2lvbih3ZWJWaWV3KTtcbiAgICAgICAgICAgIGlmICghZXZlbnREYXRhLmVycm9yICYmIHdlYlZpZXcgIT09IHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoaXN0b3J5Qm9va21hcmtJdGVtID0gYm9va21hcmtzLmhpc3RvcnlNYXAuZ2V0KGV2ZW50RGF0YS51cmwpO1xuICAgICAgICAgICAgICAgIGlmIChoaXN0b3J5Qm9va21hcmtJdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBpID0gYm9va21hcmtzLmhpc3RvcnlMaXN0LmluZGV4T2YoaGlzdG9yeUJvb2ttYXJrSXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5oaXN0b3J5TGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5oaXN0b3J5TGlzdC51bnNoaWZ0KGhpc3RvcnlCb29rbWFya0l0ZW0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5oaXN0b3J5TGlzdC51bnNoaWZ0KG5ldyBib29rbWFya3MuQm9va21hcmtJdGVtKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVyaTogZXZlbnREYXRhLnVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiB3ZWJWaWV3LnRpdGxlXG4gICAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3ID09PSB3ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IHdlYlZpZXcuc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICBjb25zdCBnZXN0dXJlT2JzZXJ2ZXJzID0gdGhpcy5sYXllckNvbnRhaW5lci5nZXRHZXN0dXJlT2JzZXJ2ZXJzKEdlc3R1cmVUeXBlcy5waW5jaCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzZXNzaW9uIHx8IChzZXNzaW9uICYmIHNlc3Npb24uaW5mb1snYXBwLmRpc2FibGVQaW5jaFpvb20nXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5vZmYoR2VzdHVyZVR5cGVzLnBpbmNoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCAhZ2VzdHVyZU9ic2VydmVycyB8fCAoZ2VzdHVyZU9ic2VydmVycyAmJiBnZXN0dXJlT2JzZXJ2ZXJzLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5vbihHZXN0dXJlVHlwZXMucGluY2gsIHRoaXMuX2hhbmRsZVBpbmNoLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgd2ViVmlldy5vbignc2Vzc2lvbicsIChlKT0+e1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGUuc2Vzc2lvbjtcbiAgICAgICAgICAgIHNlc3Npb24uY29ubmVjdEV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKCk9PntcbiAgICAgICAgICAgICAgICBpZiAod2ViVmlldyA9PT0gdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFuYWdlci5mb2N1cy5zZXRTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGF5ZXIgPT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSAhPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiT25seSBhIHJlYWxpdHkgY2FuIGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmluZm8ucm9sZSA9PSBBcmdvbi5Sb2xlLlJFQUxJVFlfVklFVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJBIHJlYWxpdHkgY2FuIG9ubHkgYmUgbG9hZGVkIGluIHRoZSByZWFsaXR5IGxheWVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgIC8vIENvdmVyIHRoZSB3ZWJ2aWV3IHRvIGRldGVjdCBnZXN0dXJlcyBhbmQgZGlzYWJsZSBpbnRlcmFjdGlvblxuICAgICAgICBjb25zdCB0b3VjaE92ZXJsYXkgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICB0b3VjaE92ZXJsYXkuc3R5bGUudmlzaWJpbGl0eSA9ICdjb2xsYXBzZWQnO1xuICAgICAgICB0b3VjaE92ZXJsYXkuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdG91Y2hPdmVybGF5LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB0b3VjaE92ZXJsYXkub24oR2VzdHVyZVR5cGVzLnRhcCwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpdGxlQmFyID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkUm93KG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLmFkZENvbHVtbihuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKDEsICdzdGFyJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIudmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC50b3A7XG4gICAgICAgIHRpdGxlQmFyLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlQmFyLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigyNDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICB0aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgdGl0bGVCYXIub3BhY2l0eSA9IDA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjbG9zZUJ1dHRvbiA9IG5ldyBCdXR0b24oKTtcbiAgICAgICAgY2xvc2VCdXR0b24uaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgY2xvc2VCdXR0b24udmVydGljYWxBbGlnbm1lbnQgPSBWZXJ0aWNhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICBjbG9zZUJ1dHRvbi50ZXh0ID0gJ2Nsb3NlJztcbiAgICAgICAgY2xvc2VCdXR0b24uY2xhc3NOYW1lID0gJ21hdGVyaWFsLWljb24nO1xuICAgICAgICBjbG9zZUJ1dHRvbi5zdHlsZS5mb250U2l6ZSA9IGFwcGxpY2F0aW9uLmFuZHJvaWQgPyAxNiA6IDIyO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3coY2xvc2VCdXR0b24sIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbihjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIFxuICAgICAgICBjbG9zZUJ1dHRvbi5vbigndGFwJywgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlTGF5ZXIobGF5ZXIpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGVMYWJlbCA9IG5ldyBMYWJlbCgpO1xuICAgICAgICB0aXRsZUxhYmVsLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlTGFiZWwudmVydGljYWxBbGlnbm1lbnQgPSBhcHBsaWNhdGlvbi5hbmRyb2lkID8gVmVydGljYWxBbGlnbm1lbnQuY2VudGVyIDogVmVydGljYWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVMYWJlbC50ZXh0QWxpZ25tZW50ID0gVGV4dEFsaWdubWVudC5jZW50ZXI7XG4gICAgICAgIHRpdGxlTGFiZWwuY29sb3IgPSBuZXcgQ29sb3IoJ2JsYWNrJyk7XG4gICAgICAgIHRpdGxlTGFiZWwuZm9udFNpemUgPSAxNDtcbiAgICAgICAgR3JpZExheW91dC5zZXRSb3codGl0bGVMYWJlbCwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKHRpdGxlTGFiZWwsIDEpO1xuICAgICAgICBcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQoY2xvc2VCdXR0b24pO1xuICAgICAgICB0aXRsZUJhci5hZGRDaGlsZCh0aXRsZUxhYmVsKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZCh3ZWJWaWV3KTtcbiAgICAgICAgY29udGFpbmVyLmFkZENoaWxkKHRvdWNoT3ZlcmxheSk7XG4gICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZCh0aXRsZUJhcik7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuYWRkQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgXG4gICAgICAgIGxheWVyID0ge1xuICAgICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgICAgd2ViVmlldyxcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheSxcbiAgICAgICAgICAgIHRpdGxlQmFyLFxuICAgICAgICAgICAgY2xvc2VCdXR0b24sXG4gICAgICAgICAgICB0aXRsZUxhYmVsLFxuICAgICAgICAgICAgdmlzdWFsSW5kZXg6IHRoaXMubGF5ZXJzLmxlbmd0aCxcbiAgICAgICAgICAgIGRldGFpbHM6IG5ldyBMYXllckRldGFpbHMod2ViVmlldylcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5pc0xvYWRlZClcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG5cbiAgICAgICAgdGl0bGVMYWJlbC5iaW5kKHtcbiAgICAgICAgICAgIHNvdXJjZVByb3BlcnR5OiAndGl0bGUnLFxuICAgICAgICAgICAgdGFyZ2V0UHJvcGVydHk6ICd0ZXh0J1xuICAgICAgICB9LCBsYXllci5kZXRhaWxzKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGxheWVyO1xuICAgIH1cbiAgICBcbiAgICByZW1vdmVMYXllckF0SW5kZXgoaW5kZXg6bnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcnNbaW5kZXhdO1xuICAgICAgICBpZiAodHlwZW9mIGxheWVyID09PSAndW5kZWZpbmVkJykgXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIGxheWVyIGF0IGluZGV4ICcgKyBpbmRleCk7XG4gICAgICAgIHRoaXMubGF5ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIucmVtb3ZlQ2hpbGQobGF5ZXIuY29udGFpbmVyKTsgLy8gZm9yIG5vd1xuICAgIH1cbiAgICBcbiAgICByZW1vdmVMYXllcihsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICB0aGlzLnJlbW92ZUxheWVyQXRJbmRleChpbmRleCk7XG4gICAgfVxuICAgIFxuICAgIG9uTG9hZGVkKCkge1xuICAgICAgICBzdXBlci5vbkxvYWRlZCgpO1xuICAgICAgICBpZiAodGhpcy5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuYWRkT25MYXlvdXRDaGFuZ2VMaXN0ZW5lcihuZXcgYW5kcm9pZC52aWV3LlZpZXcuT25MYXlvdXRDaGFuZ2VMaXN0ZW5lcih7XG4gICAgICAgICAgICAgICAgb25MYXlvdXRDaGFuZ2UodjogYW5kcm9pZC52aWV3LlZpZXcsIGxlZnQ6IG51bWJlciwgdG9wOiBudW1iZXIsIHJpZ2h0OiBudW1iZXIsIGJvdHRvbTogbnVtYmVyLCBvbGRMZWZ0OiBudW1iZXIsIG9sZFRvcDogbnVtYmVyLCBvbGRSaWdodDogbnVtYmVyLCBvbGRCb3R0b206IG51bWJlcik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnREYXRhOiBvYnNlcnZhYmxlTW9kdWxlLkV2ZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogXCJjdXN0b21MYXlvdXRDaGFuZ2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogYW5kcm9pZExheW91dE9ic2VydmFibGVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZS5ub3RpZnkoZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZS5vbihcImN1c3RvbUxheW91dENoYW5nZVwiLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuYW5kcm9pZE9uTGF5b3V0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgVXRpbC5icmluZ1RvRnJvbnQodGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldyk7XG4gICAgICAgIFV0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLnRvdWNoT3ZlcmxheSk7XG4gICAgICAgIFV0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLnRpdGxlQmFyKTtcbiAgICB9XG4gICAgXG4gICAgb25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZSh3aWR0aE1lYXN1cmVTcGVjKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdXRpbHMubGF5b3V0LmdldE1lYXN1cmVTcGVjU2l6ZShoZWlnaHRNZWFzdXJlU3BlYyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKT0+e1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9KTtcblxuICAgICAgICBzdXBlci5vbk1lYXN1cmUod2lkdGhNZWFzdXJlU3BlYywgaGVpZ2h0TWVhc3VyZVNwZWMpO1xuICAgIH1cblxuICAgIGFuZHJvaWRPbkxheW91dCgpIHtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmdldEFjdHVhbFNpemUoKS53aWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0O1xuXG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpPT57XG4gICAgICAgICAgICBsYXllci5jb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NoZWNrV2ViVmlld1ZlcnNpb24od2ViVmlldzpBcmdvbldlYlZpZXcpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NoZWNrZWRWZXJzaW9uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFwcGxpY2F0aW9uU2V0dGluZ3MuaGFzS2V5KElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZKSkge1xuICAgICAgICAgICAgdGhpcy5fY2hlY2tlZFZlcnNpb24gPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3ZWJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSAoPGFueT53ZWJWaWV3KS5nZXRXZWJWaWV3VmVyc2lvbigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmRyb2lkIHdlYnZpZXcgdmVyc2lvbjogXCIgKyB2ZXJzaW9uKTtcbiAgICAgICAgICAgIGlmICh2ZXJzaW9uIDwgTUlOX0FORFJPSURfV0VCVklFV19WRVJTSU9OKSB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiVXBncmFkZSBXZWJWaWV3XCIsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiWW91ciBBbmRyb2lkIFN5c3RlbSBXZWJWaWV3IGlzIG91dCBvZiBkYXRlLiBXZSBzdWdnZXN0IGF0IGxlYXN0IHZlcnNpb24gXCIgKyBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04gKyBcIiwgeW91ciBkZXZpY2UgY3VycmVudGx5IGhhcyB2ZXJzaW9uIFwiICsgdmVyc2lvbiArIFwiLiBUaGlzIG1heSByZXN1bHQgaW4gcmVuZGVyaW5nIGlzc3Vlcy4gUGxlYXNlIHVwZGF0ZSB2aWEgdGhlIEdvb2dsZSBQbGF5IFN0b3JlLlwiLFxuICAgICAgICAgICAgICAgICAgICBva0J1dHRvblRleHQ6IFwiVXBncmFkZVwiLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkxhdGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIG5ldXRyYWxCdXR0b25UZXh0OiBcIklnbm9yZVwiXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBncmFkaW5nIHdlYnZpZXdcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXcgYW5kcm9pZC5jb250ZW50LkludGVudChhbmRyb2lkLmNvbnRlbnQuSW50ZW50LkFDVElPTl9WSUVXKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVudC5zZXREYXRhKGFuZHJvaWQubmV0LlVyaS5wYXJzZShcIm1hcmtldDovL2RldGFpbHM/aWQ9Y29tLmdvb2dsZS5hbmRyb2lkLndlYnZpZXdcIikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb24uYW5kcm9pZC5zdGFydEFjdGl2aXR5LnN0YXJ0QWN0aXZpdHkoaW50ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGdyYWRlIG5ldmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGljYXRpb25TZXR0aW5ncy5zZXRCb29sZWFuKElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZ3JhZGUgbGF0ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2NoZWNrZWRWZXJzaW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9jYWxjdWxhdGVUYXJnZXRUcmFuc2Zvcm0oaW5kZXg6bnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGxheWVyUG9zaXRpb24gPSBpbmRleCAqIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgLSB0aGlzLnNjcm9sbFZpZXcudmVydGljYWxPZmZzZXQ7XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQb3NpdGlvbiA9IGxheWVyUG9zaXRpb24gLyB0aGlzLmdldE1lYXN1cmVkSGVpZ2h0KCk7XG4gICAgICAgIGNvbnN0IHRoZXRhID0gTWF0aC5taW4oTWF0aC5tYXgobm9ybWFsaXplZFBvc2l0aW9uLCAwKSwgMC44NSkgKiBNYXRoLlBJO1xuICAgICAgICBjb25zdCBzY2FsZUZhY3RvciA9IDEgLSAoTWF0aC5jb3ModGhldGEpIC8gMiArIDAuNSkgKiAwLjI1O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7XG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiBpbmRleCAqIE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgIHg6IHNjYWxlRmFjdG9yLFxuICAgICAgICAgICAgICAgIHk6IHNjYWxlRmFjdG9yXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgX2xhc3RUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBwcml2YXRlIF9hbmltYXRlKCkge1xuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICBjb25zdCBkZWx0YVQgPSBNYXRoLm1pbihub3cgLSB0aGlzLl9sYXN0VGltZSwgMzApIC8gMTAwMDtcbiAgICAgICAgdGhpcy5fbGFzdFRpbWUgPSBub3c7XG4gICAgICAgIFxuICAgICAgICAvL2NvbnN0IHdpZHRoID0gdGhpcy5nZXRNZWFzdXJlZFdpZHRoKCk7XG4gICAgICAgIC8vY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmdldEFjdHVhbFNpemUoKS5oZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb250YWluZXJIZWlnaHQgPSBoZWlnaHQgKyBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HICogKHRoaXMubGF5ZXJzLmxlbmd0aC0xKTtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmhlaWdodCA9IGNvbnRhaW5lckhlaWdodDtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgbGF5ZXIudmlzdWFsSW5kZXggPSB0aGlzLl9sZXJwKGxheWVyLnZpc3VhbEluZGV4LCBpbmRleCwgZGVsdGFUKjQpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtID0gdGhpcy5fY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGxheWVyLnZpc3VhbEluZGV4KTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5zY2FsZVggPSB0cmFuc2Zvcm0uc2NhbGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5zY2FsZVkgPSB0cmFuc2Zvcm0uc2NhbGUueTtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci50cmFuc2xhdGVYID0gdHJhbnNmb3JtLnRyYW5zbGF0ZS54O1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLnRyYW5zbGF0ZVkgPSB0cmFuc2Zvcm0udHJhbnNsYXRlLnk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sZXJwKGEsYix0KSB7XG4gICAgICAgIHJldHVybiBhICsgKGItYSkqdFxuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxheWVyLndlYlZpZXcuaW9zKSB7XG4gICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci53ZWJWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxheWVyLndlYlZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyLmlvcykge1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250YWluZXIuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgbGF5ZXIudG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG5cbiAgICAgICAgLy8gRm9yIHRyYW5zcGFyZW50IHdlYnZpZXdzLCBhZGQgYSBsaXR0bGUgYml0IG9mIG9wYWNpdHlcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyLmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG5ldyBDb2xvcigxMjgsIDI1NSwgMjU1LCAyNTUpLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgfSk7XG4gICAgICAgIGxheWVyLndlYlZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTpUSVRMRV9CQVJfSEVJR0hUfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSlcbiAgICAgICAgLy8gU2hvdyB0aXRsZWJhcnNcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkudmlzaWJsZTtcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KVxuICAgICAgICAvLyBVcGRhdGUgZm9yIHRoZSBmaXJzdCB0aW1lICYgYW5pbWF0ZS5cbiAgICAgICAgY29uc3Qge3RyYW5zbGF0ZSwgc2NhbGV9ID0gdGhpcy5fY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGlkeCk7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZSxcbiAgICAgICAgICAgIHNjYWxlLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTixcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXQsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9zaG93TGF5ZXJJblN0YWNrKGxheWVyOkxheWVyKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgbGF5ZXIudG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcblxuICAgICAgICAvLyBGb3IgdHJhbnNwYXJlbnQgd2Vidmlld3MsIGFkZCBhIGxpdHRsZSBiaXQgb2Ygb3BhY2l0eVxuICAgICAgICBsYXllci5jb250YWluZXIuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gdGhpcy5mb2N1c3NlZExheWVyID09PSBsYXllcjtcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogdGhpcy5yZWFsaXR5TGF5ZXIgPT09IGxheWVyIHx8IGxheWVyLndlYlZpZXcuaXNBcmdvbkFwcCB8fCB0aGlzLmZvY3Vzc2VkTGF5ZXIgPT09IGxheWVyID8gMSA6IDAsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuICAgICAgICBsYXllci53ZWJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6MH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgIGlmIChsYXllci53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGF5ZXIud2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsYXllci5jb250YWluZXIuaW9zKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLmNvbnRhaW5lci5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gSGlkZSB0aXRsZWJhcnNcbiAgICAgICAgbGF5ZXIudGl0bGVCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICBsYXllci50aXRsZUJhci52aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5jb2xsYXBzZTtcbiAgICAgICAgfSlcbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gaWR4O1xuICAgICAgICByZXR1cm4gbGF5ZXIuY29udGFpbmVyLmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7IHg6IDAsIHk6IDAgfSxcbiAgICAgICAgICAgIHNjYWxlOiB7IHg6IDEsIHk6IDEgfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0LFxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHNob3dPdmVydmlldygpIHtcbiAgICAgICAgaWYgKHRoaXMuX292ZXJ2aWV3RW5hYmxlZCkgcmV0dXJuO1xuICAgICAgICB0aGlzLl9vdmVydmlld0VuYWJsZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcikgPT4ge1xuICAgICAgICAgICAgdGhpcy5fc2hvd0xheWVySW5DYXJvdXNlbChsYXllcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBhbmltYXRlIHRoZSB2aWV3c1xuICAgICAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpLCAyMCk7XG5cbiAgICAgICAgLy8gZGlzYWJsZSBwaW5jaC16b29tXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIub2ZmKEdlc3R1cmVUeXBlcy5waW5jaCwgdGhpcy5faGFuZGxlUGluY2gsIHRoaXMpO1xuICAgIH1cblxuICAgIGhpZGVPdmVydmlldygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgYW5pbWF0aW9ucyA9IHRoaXMubGF5ZXJzLm1hcCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaG93TGF5ZXJJblN0YWNrKGxheWVyKVxuICAgICAgICB9KTtcbiAgICAgICAgUHJvbWlzZS5hbGwoYW5pbWF0aW9ucykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCB0cnVlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFZpZXcuc2Nyb2xsVG9WZXJ0aWNhbE9mZnNldCgwLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIGFuaW1hdGluZyB0aGUgdmlld3NcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQpIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG4gICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgLy8gZW5hYmxlIHBpbmNoLXpvb21cbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5vbihHZXN0dXJlVHlwZXMucGluY2gsIHRoaXMuX2hhbmRsZVBpbmNoLCB0aGlzKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9waW5jaFN0YXJ0Rm92PzpudW1iZXI7XG4gICAgXG4gICAgcHJpdmF0ZSBfaGFuZGxlUGluY2goZXZlbnQ6IFBpbmNoR2VzdHVyZUV2ZW50RGF0YSkge1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIEdlc3R1cmVTdGF0ZVR5cGVzLmJlZ2FuOiBcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZSA9IG1hbmFnZXIuY29udGV4dC5zZXJpYWxpemVkRnJhbWVTdGF0ZVxuICAgICAgICAgICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9waW5jaFN0YXJ0Rm92ID0gc3RhdGUudmlldy5zdWJ2aWV3c1swXS5mcnVzdHVtLmZvdjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9waW5jaFN0YXJ0Rm92ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGluY2hTdGFydEZvdiA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgbWFuYWdlci5yZWFsaXR5Lnpvb20oe1xuICAgICAgICAgICAgICAgICAgICB6b29tOiAxLCBcbiAgICAgICAgICAgICAgICAgICAgZm92OiB0aGlzLl9waW5jaFN0YXJ0Rm92LFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogQXJnb24uUmVhbGl0eVpvb21TdGF0ZS5TVEFSVFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEdlc3R1cmVTdGF0ZVR5cGVzLmNoYW5nZWQ6IFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9waW5jaFN0YXJ0Rm92ID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLnJlYWxpdHkuem9vbSh7XG4gICAgICAgICAgICAgICAgICAgIHpvb206IGV2ZW50LnNjYWxlLCBcbiAgICAgICAgICAgICAgICAgICAgZm92OiB0aGlzLl9waW5jaFN0YXJ0Rm92LFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogQXJnb24uUmVhbGl0eVpvb21TdGF0ZS5DSEFOR0VcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGluY2hTdGFydEZvdiA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgbWFuYWdlci5yZWFsaXR5Lnpvb20oe1xuICAgICAgICAgICAgICAgICAgICB6b29tOiBldmVudC5zY2FsZSwgXG4gICAgICAgICAgICAgICAgICAgIGZvdjogdGhpcy5fcGluY2hTdGFydEZvdixcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEFyZ29uLlJlYWxpdHlab29tU3RhdGUuRU5EXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBicmVhazsgIFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGxvYWRVcmwodXJsOnN0cmluZykge1xuICAgICAgICBpZiAodGhpcy5mb2N1c3NlZExheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd1cmknLHVybCk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3RpdGxlJywnJyk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ2lzRmF2b3JpdGUnLGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgnc3VwcG9ydGVkSW50ZXJhY3Rpb25Nb2RlcycsWydwYWdlJywgJ2ltbWVyc2l2ZSddKTtcbiAgICAgICAgfVxuICAgICAgICAvL2lmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPT09IHVybCkgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcucmVsb2FkKCk7IC8vIHNyYyBpc24ndCBzYWZlIHRvIHVzZSBoZXJlLCBhcyBpdCdzIHRoZSBvcmlnaW5hbCB1cmwgKG5vdCB0aGUgY3VycmVudClcbiAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LmdldEN1cnJlbnRVcmwoKSA9PT0gdXJsKVxuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcucmVsb2FkKCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnNyYyA9IHVybDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0Rm9jdXNzZWRMYXllcihsYXllcjpMYXllcikge1xuICAgICAgICBpZiAodGhpcy5fZm9jdXNzZWRMYXllciAhPT0gbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgPSBsYXllcjtcbiAgICAgICAgICAgIHRoaXMubm90aWZ5UHJvcGVydHlDaGFuZ2UoJ2ZvY3Vzc2VkTGF5ZXInLCBsYXllcik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNldCBmb2N1c3NlZCBsYXllcjogXCIgKyBsYXllci5kZXRhaWxzLnVyaSB8fCBcIk5ldyBDaGFubmVsXCIpO1xuXG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gbGF5ZXIud2ViVmlldy5zZXNzaW9uO1xuICAgICAgICAgICAgbWFuYWdlci5mb2N1cy5zZXRTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLnNldExheWVyRGV0YWlscyh0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscyk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgICAgICBpZiAobGF5ZXIgIT09IHRoaXMucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXllcnMuc3BsaWNlKHRoaXMubGF5ZXJzLmluZGV4T2YobGF5ZXIpLCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcbiAgICAgICAgICAgICAgICBVdGlsLmJyaW5nVG9Gcm9udChsYXllci5jb250YWluZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGZvY3Vzc2VkTGF5ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mb2N1c3NlZExheWVyO1xuICAgIH1cbn1cbiJdfQ==