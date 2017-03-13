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
var TITLE_BAR_HEIGHT = 40;
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
        closeButton.style.fontSize = this.android ? 16 : 22;
        closeButton.color = new color_1.Color('black');
        closeButton.backgroundColor = this.android ? new color_1.Color('white') : new color_1.Color('black');
        grid_layout_1.GridLayout.setRow(closeButton, 0);
        grid_layout_1.GridLayout.setColumn(closeButton, 0);
        closeButton.on('tap', function () {
            _this.removeLayer(layer);
        });
        var titleLabel = new label_1.Label();
        titleLabel.horizontalAlignment = enums_1.HorizontalAlignment.stretch;
        titleLabel.verticalAlignment = this.android ? enums_1.VerticalAlignment.center : enums_1.VerticalAlignment.stretch;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSw4Q0FBeUM7QUFFekMsK0JBQTRCO0FBRTVCLDhEQUEwRDtBQUMxRCxzREFBNEQ7QUFFNUQsa0NBQStCO0FBQy9CLG9DQUFpQztBQUNqQyxpREFBNEM7QUFDNUMsd0NBQWtEO0FBQ2xELGtDQU9rQjtBQUNsQix3Q0FNcUI7QUFDckIsc0NBQW1DO0FBR25DLDhDQUEyQztBQUMzQyxvQ0FBdUM7QUFDdkMsMERBQTZEO0FBQzdELDhDQUFnRDtBQUdoRCx5Q0FBMkM7QUFDM0MsbUNBQXFDO0FBRXJDLHNEQUF5RTtBQUN6RSw4Q0FBK0M7QUFFL0Msc0NBQXVDO0FBR3ZDLElBQUksdUJBQXVCLEdBQUcsSUFBSSx1QkFBVSxFQUFFLENBQUM7QUFFL0MsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7QUFDNUIsSUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUM7QUFDdEMsSUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7QUFDeEMsSUFBTSwyQkFBMkIsR0FBRyxFQUFFLENBQUM7QUFDdkMsSUFBTSwwQkFBMEIsR0FBRyx3QkFBd0IsQ0FBQztBQWE1RDtJQUFpQywrQkFBVTtJQWlCdkM7UUFBQSxZQUNJLGlCQUFPLFNBd0VWO1FBdkZELGVBQVMsR0FBUSxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQ25DLGdCQUFVLEdBQUcsSUFBSSx3QkFBVSxDQUFDO1FBQzVCLG9CQUFjLEdBQUcsSUFBSSx3QkFBVSxDQUFDO1FBQ2hDLFlBQU0sR0FBVyxFQUFFLENBQUM7UUFHWixzQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDekIsbUJBQWEsR0FBRyxDQUFDLENBQUM7UUFDbEIscUJBQWUsR0FBRyxDQUFDLENBQUM7UUFJcEIscUJBQWUsR0FBRyxLQUFLLENBQUM7UUE2V3hCLGVBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUF6VzNCLEtBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2QsS0FBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7UUFDN0QsQ0FBQztRQUNELEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxJQUFJLGFBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRSxLQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxhQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsS0FBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQztRQUV2RCxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLDhDQUE4QztZQUM3QyxLQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFpQixDQUFDLG1DQUFtQyxHQUFHLEtBQUssQ0FBQztRQUM3RixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDakIsS0FBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUM7WUFDL0MsS0FBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7WUFDN0MsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7Z0JBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUM1RSxJQUFNLGVBQWUsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztZQUM3QyxlQUFlLENBQUMsUUFBUSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN6QyxLQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVELDhCQUE4QjtRQUM5QiwrQ0FBK0M7UUFDL0Msb0RBQW9EO1FBQ3BELGdEQUFnRDtRQUVoRCxLQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztRQUNwRCxLQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztRQUNsRCxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsS0FBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDeEQsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDckMsS0FBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCxLQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztRQUNoRCxLQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztRQUM5QyxLQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxLQUFJLENBQUMsY0FBYyxDQUFDO1FBQzlDLEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN0QixLQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUNwRCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNqQyxLQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUNELEtBQUksQ0FBQyxRQUFRLENBQUMsS0FBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9CLEtBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxhQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekMsS0FBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsd0JBQVUsQ0FBQyxXQUFXLEVBQUUsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLENBQUMsQ0FBQztRQUVyRSxnREFBZ0Q7UUFDaEQsS0FBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRWhCLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFO1lBQ2hELEtBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNyQixLQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQTtRQUVGLHNCQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFDLEVBQVM7Z0JBQVIsb0JBQU87WUFDbEQsaUVBQWlFO1lBQ2pFLElBQU0sT0FBTyxHQUFHLEtBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxNQUFNLEVBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMvRCxFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztnQkFDM0MsS0FBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUN0RCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osS0FBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUNyRCxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUE7UUFFRixvQkFBb0I7UUFDcEIsS0FBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsdUJBQVksQ0FBQyxLQUFLLEVBQUUsS0FBSSxDQUFDLFlBQVksRUFBRSxLQUFJLENBQUMsQ0FBQzs7SUFDeEUsQ0FBQztJQUVELDhCQUFRLEdBQVI7UUFBQSxpQkFzS0M7UUFyS0csSUFBSSxLQUFXLENBQUM7UUFFaEIsSUFBTSxTQUFTLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDbkMsU0FBUyxDQUFDLG1CQUFtQixHQUFHLE1BQU0sQ0FBQztRQUN2QyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1FBRXBDLElBQU0sT0FBTyxHQUFHLElBQUksNkJBQVksQ0FBQztRQUNqQyxPQUFPLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFFdEMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLFNBQTRCO1lBQ3RELE1BQU0sQ0FBQSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixLQUFLLEtBQUs7b0JBQ04sS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDMUMsS0FBSyxDQUFDO2dCQUNWLEtBQUssT0FBTztvQkFDUixJQUFJLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEUsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO3dCQUN0QixtQkFBbUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDdEQsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSSxDQUFDLFlBQVksQ0FBQzt3QkFDNUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDaEQsS0FBSyxDQUFDO2dCQUNWLEtBQUssWUFBWTtvQkFDYixJQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO29CQUNuQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxVQUFVO3dCQUNyRCxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUM7d0JBQ3JCLENBQUMsTUFBTSxDQUFDLENBQ1gsQ0FBQztvQkFDRixFQUFFLENBQUMsQ0FBQyxVQUFVLElBQUksS0FBSyxLQUFLLEtBQUksQ0FBQyxhQUFhLElBQUksS0FBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQzt3QkFDdEUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7NEJBQ3BCLE9BQU8sRUFBRSxDQUFDOzRCQUNWLFFBQVEsRUFBRSwyQkFBMkI7eUJBQ3hDLENBQUMsQ0FBQztvQkFDUCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztvQkFDaEMsQ0FBQztvQkFDRCxLQUFLLENBQUM7Z0JBQ1YsU0FBUyxLQUFLLENBQUM7WUFDbkIsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxrQkFBTyxDQUFDLGlCQUFpQixFQUFFLFVBQUMsU0FBd0I7WUFDM0QsS0FBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25DLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxJQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEUsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO29CQUN0QixJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO29CQUMzRCxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3ZELENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDO3dCQUNyRCxHQUFHLEVBQUUsU0FBUyxDQUFDLEdBQUc7d0JBQ2xCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztxQkFDdkIsQ0FBQyxDQUFDLENBQUE7Z0JBQ1AsQ0FBQztZQUNMLENBQUM7WUFFRCxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO2dCQUNoQyxJQUFNLGdCQUFnQixHQUFHLEtBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsdUJBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDckYsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNoRSxLQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNoRCxDQUFDO2dCQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBRSxDQUFDLGdCQUFnQixJQUFJLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkYsS0FBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsdUJBQVksQ0FBQyxLQUFLLEVBQUUsS0FBSSxDQUFDLFlBQVksRUFBRSxLQUFJLENBQUMsQ0FBQztnQkFDeEUsQ0FBQztZQUNMLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQUMsQ0FBQztZQUNwQixJQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ2xDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ3pDLHNCQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdEMsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQzlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzt3QkFDaEQsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUNoQixLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQztvQkFDL0QsQ0FBQztnQkFDTCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzt3QkFDL0MsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUNoQixLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQztvQkFDL0QsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtRQUVGLCtEQUErRDtRQUMvRCxJQUFNLFlBQVksR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztRQUN0QyxZQUFZLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7UUFDNUMsWUFBWSxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztRQUM3QyxZQUFZLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1FBQzNDLFlBQVksQ0FBQyxFQUFFLENBQUMsdUJBQVksQ0FBQyxHQUFHLEVBQUUsVUFBQyxLQUFLO1lBQ3BDLEtBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3QiwyQkFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBTSxRQUFRLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDbEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLHNCQUFRLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN6RCxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksc0JBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzVELFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBUSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzVDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBUSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDNUQsUUFBUSxDQUFDLGlCQUFpQixHQUFHLHlCQUFpQixDQUFDLEdBQUcsQ0FBQztRQUNuRCxRQUFRLENBQUMsbUJBQW1CLEdBQUcsMkJBQW1CLENBQUMsT0FBTyxDQUFDO1FBQzNELFFBQVEsQ0FBQyxlQUFlLEdBQUcsSUFBSSxhQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsUUFBUSxDQUFDLFVBQVUsR0FBRyxrQkFBVSxDQUFDLFFBQVEsQ0FBQztRQUMxQyxRQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUVyQixJQUFNLFdBQVcsR0FBRyxJQUFJLGVBQU0sRUFBRSxDQUFDO1FBQ2pDLFdBQVcsQ0FBQyxtQkFBbUIsR0FBRywyQkFBbUIsQ0FBQyxPQUFPLENBQUM7UUFDOUQsV0FBVyxDQUFDLGlCQUFpQixHQUFHLHlCQUFpQixDQUFDLE9BQU8sQ0FBQztRQUMxRCxXQUFXLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztRQUMzQixXQUFXLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQztRQUN4QyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDcEQsV0FBVyxDQUFDLEtBQUssR0FBRyxJQUFJLGFBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QyxXQUFXLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxhQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxhQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckYsd0JBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLHdCQUFVLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyQyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRTtZQUNsQixLQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBTSxVQUFVLEdBQUcsSUFBSSxhQUFLLEVBQUUsQ0FBQztRQUMvQixVQUFVLENBQUMsbUJBQW1CLEdBQUcsMkJBQW1CLENBQUMsT0FBTyxDQUFDO1FBQzdELFVBQVUsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLHlCQUFpQixDQUFDLE1BQU0sR0FBRyx5QkFBaUIsQ0FBQyxPQUFPLENBQUM7UUFDbkcsVUFBVSxDQUFDLGFBQWEsR0FBRyxxQkFBYSxDQUFDLE1BQU0sQ0FBQztRQUNoRCxVQUFVLENBQUMsS0FBSyxHQUFHLElBQUksYUFBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLHdCQUFVLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQyx3QkFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQixRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTlCLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNqQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhDLEtBQUssR0FBRztZQUNKLFNBQVMsV0FBQTtZQUNULE9BQU8sU0FBQTtZQUNQLFlBQVksY0FBQTtZQUNaLFFBQVEsVUFBQTtZQUNSLFdBQVcsYUFBQTtZQUNYLFVBQVUsWUFBQTtZQUNWLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07WUFDL0IsT0FBTyxFQUFFLElBQUksMkJBQVksQ0FBQyxPQUFPLENBQUM7U0FDckMsQ0FBQztRQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDZCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFakMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNaLGNBQWMsRUFBRSxPQUFPO1lBQ3ZCLGNBQWMsRUFBRSxNQUFNO1NBQ3pCLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWxCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU1RCxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFRCx3Q0FBa0IsR0FBbEIsVUFBbUIsS0FBWTtRQUMzQixJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFLLFdBQVcsQ0FBQztZQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixHQUFHLEtBQUssQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVO0lBQ2hFLENBQUM7SUFFRCxpQ0FBVyxHQUFYLFVBQVksS0FBVztRQUNuQixJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELDhCQUFRLEdBQVI7UUFBQSxpQkFvQkM7UUFuQkcsaUJBQU0sUUFBUSxXQUFFLENBQUM7UUFDakIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hGLGNBQWMsRUFBZCxVQUFlLENBQW9CLEVBQUUsSUFBWSxFQUFFLEdBQVcsRUFBRSxLQUFhLEVBQUUsTUFBYyxFQUFFLE9BQWUsRUFBRSxNQUFjLEVBQUUsUUFBZ0IsRUFBRSxTQUFpQjtvQkFDL0osSUFBSSxTQUFTLEdBQStCO3dCQUN4QyxTQUFTLEVBQUUsb0JBQW9CO3dCQUMvQixNQUFNLEVBQUUsdUJBQXVCO3FCQUNsQyxDQUFBO29CQUNELHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDOUMsQ0FBQzthQUNKLENBQUMsQ0FBQyxDQUFDO1lBQ0osdUJBQXVCLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFO2dCQUM3QyxLQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO1FBRUQsV0FBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLFdBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNsRCxXQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELCtCQUFTLEdBQVQsVUFBVSxnQkFBZ0IsRUFBRSxpQkFBaUI7UUFDekMsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hFLElBQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVsRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLO1lBQ3RCLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUM5QixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxpQkFBTSxTQUFTLFlBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQscUNBQWUsR0FBZjtRQUNJLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDekMsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUUzQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLO1lBQ3RCLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUM5QixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sMENBQW9CLEdBQTVCLFVBQTZCLE9BQW9CO1FBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sQ0FBQztRQUNYLENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDNUIsTUFBTSxDQUFDO1FBQ1gsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLElBQU0sT0FBTyxHQUFTLE9BQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEdBQUcsT0FBTyxDQUFDLENBQUM7WUFDbkQsRUFBRSxDQUFDLENBQUMsT0FBTyxHQUFHLDJCQUEyQixDQUFDLENBQUMsQ0FBQztnQkFDeEMsT0FBTyxDQUFDLE9BQU8sQ0FBQztvQkFDWixLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixPQUFPLEVBQUUsMEVBQTBFLEdBQUcsMkJBQTJCLEdBQUcsc0NBQXNDLEdBQUcsT0FBTyxHQUFHLGlGQUFpRjtvQkFDeFAsWUFBWSxFQUFFLFNBQVM7b0JBQ3ZCLGdCQUFnQixFQUFFLE9BQU87b0JBQ3pCLGlCQUFpQixFQUFFLFFBQVE7aUJBQzlCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNO29CQUNwQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO3dCQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQzt3QkFDakMsSUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDOUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQyxDQUFDO3dCQUN4RixXQUFXLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzVELENBQUM7b0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO3dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO3dCQUM3QixtQkFBbUIsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3JFLENBQUM7b0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUNqQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLENBQUM7SUFDTCxDQUFDO0lBRU8sK0NBQXlCLEdBQWpDLFVBQWtDLEtBQVk7UUFDMUMsSUFBTSxhQUFhLEdBQUcsS0FBSyxHQUFHLHlCQUF5QixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO1FBQ3pGLElBQU0sa0JBQWtCLEdBQUcsYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3BFLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3hFLElBQU0sV0FBVyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUMzRCxNQUFNLENBQUM7WUFDSCxTQUFTLEVBQUU7Z0JBQ1AsQ0FBQyxFQUFFLENBQUM7Z0JBQ0osQ0FBQyxFQUFFLEtBQUssR0FBRyx5QkFBeUI7YUFDdkM7WUFDRCxLQUFLLEVBQUU7Z0JBQ0gsQ0FBQyxFQUFFLFdBQVc7Z0JBQ2QsQ0FBQyxFQUFFLFdBQVc7YUFDakI7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUdPLDhCQUFRLEdBQWhCO1FBQUEsaUJBeUJDO1FBeEJHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQ3ZCLE1BQU0sQ0FBQztRQUVYLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN6RCxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQztRQUVyQix3Q0FBd0M7UUFDeEMsMENBQTBDO1FBQzFDLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDekMsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUUzQyxJQUFNLGVBQWUsR0FBRyxNQUFNLEdBQUcseUJBQXlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDO1FBRTdDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFFLEtBQUs7WUFDN0IsS0FBSyxDQUFDLFdBQVcsR0FBRyxLQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSxJQUFNLFNBQVMsR0FBRyxLQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BFLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ25ELEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLDJCQUFLLEdBQWIsVUFBYyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUM7UUFDZixNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRU8sMENBQW9CLEdBQTVCLFVBQTZCLEtBQVc7UUFDcEMsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ2pELENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ25ELENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUVoRCx3REFBd0Q7UUFDeEQsS0FBSyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUM7UUFDaEQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7WUFDcEIsT0FBTyxFQUFFLENBQUM7WUFDVixlQUFlLEVBQUUsSUFBSSxhQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQzlDLFFBQVEsRUFBRSwyQkFBMkI7U0FDeEMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDbEIsU0FBUyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsZ0JBQWdCLEVBQUM7WUFDbkMsUUFBUSxFQUFFLDJCQUEyQjtTQUN4QyxDQUFDLENBQUE7UUFDRixpQkFBaUI7UUFDakIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsa0JBQVUsQ0FBQyxPQUFPLENBQUM7UUFDL0MsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDbkIsT0FBTyxFQUFFLENBQUM7WUFDVixRQUFRLEVBQUUsMkJBQTJCO1NBQ3hDLENBQUMsQ0FBQTtRQUNGLHVDQUF1QztRQUNqQyxJQUFBLHdDQUF3RCxFQUF2RCx3QkFBUyxFQUFFLGdCQUFLLENBQXdDO1FBQy9ELEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1lBQ3BCLFNBQVMsV0FBQTtZQUNULEtBQUssT0FBQTtZQUNMLFFBQVEsRUFBRSwyQkFBMkI7WUFDckMsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUztTQUNsQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sdUNBQWlCLEdBQXpCLFVBQTBCLEtBQVc7UUFDakMsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkMsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQztRQUVsRCx3REFBd0Q7UUFDeEQsS0FBSyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQztRQUN4RSxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztZQUNwQixPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksS0FBSyxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFDeEcsZUFBZSxFQUFFLElBQUksYUFBSyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUM1QyxRQUFRLEVBQUUsMkJBQTJCO1NBQ3hDLENBQUMsQ0FBQztRQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ2xCLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztZQUNwQixRQUFRLEVBQUUsMkJBQTJCO1NBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDSixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO1lBQ2xELENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUNELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDcEQsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsRCxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDSCxpQkFBaUI7UUFDakIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDbkIsT0FBTyxFQUFFLENBQUM7WUFDVixRQUFRLEVBQUUsMkJBQTJCO1NBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDSixLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxrQkFBVSxDQUFDLFFBQVEsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQTtRQUNGLHVDQUF1QztRQUN2QyxLQUFLLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztRQUN4QixNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7WUFDM0IsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3pCLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNyQixRQUFRLEVBQUUsMkJBQTJCO1lBQ3JDLEtBQUssRUFBRSxzQkFBYyxDQUFDLFNBQVM7U0FDbEMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELGtDQUFZLEdBQVo7UUFBQSxpQkFjQztRQWJHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUFDLE1BQU0sQ0FBQztRQUNsQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSztZQUN0QixLQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVoRCxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFN0QscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUFZLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELGtDQUFZLEdBQVo7UUFBQSxpQkFzQkM7UUFyQkcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7WUFBQyxNQUFNLENBQUM7UUFDbkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUU5QixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFDLEtBQUs7WUFDbkMsTUFBTSxDQUFDLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3pCLEtBQUksQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hELFVBQVUsQ0FBQztnQkFDUCxLQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhELDJCQUEyQjtRQUMzQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1lBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUU3QixvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsdUJBQVksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBSU8sa0NBQVksR0FBcEIsVUFBcUIsS0FBNEI7UUFDN0MsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDbEIsS0FBSyw0QkFBaUIsQ0FBQyxLQUFLO2dCQUN4QixJQUFNLEtBQUssR0FBRyxzQkFBTyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQTtnQkFDbEQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDUixJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQzdELENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7Z0JBQ3BDLENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUM7b0JBQUMsTUFBTSxDQUFDO2dCQUM5QyxzQkFBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ2pCLElBQUksRUFBRSxDQUFDO29CQUNQLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYztvQkFDeEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLO2lCQUN0QyxDQUFDLENBQUE7Z0JBQ0YsS0FBSyxDQUFDO1lBQ1YsS0FBSyw0QkFBaUIsQ0FBQyxPQUFPO2dCQUMxQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQztvQkFBQyxNQUFNLENBQUM7Z0JBQzlDLHNCQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDakIsSUFBSSxFQUFFLEtBQUssQ0FBQyxLQUFLO29CQUNqQixHQUFHLEVBQUUsSUFBSSxDQUFDLGNBQWM7b0JBQ3hCLEtBQUssRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBTTtpQkFDdkMsQ0FBQyxDQUFBO2dCQUNGLEtBQUssQ0FBQztZQUNWO2dCQUNJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDO29CQUFDLE1BQU0sQ0FBQztnQkFDOUMsc0JBQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNqQixJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUs7b0JBQ2pCLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYztvQkFDeEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHO2lCQUNwQyxDQUFDLENBQUE7Z0JBQ0YsS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNMLENBQUM7SUFFTSw2QkFBTyxHQUFkLFVBQWUsR0FBVTtRQUNyQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBQyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFDRCw0SkFBNEo7UUFDNUosRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssR0FBRyxDQUFDO1lBQ25ELElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hDLElBQUk7WUFDQSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQzdDLENBQUM7SUFFTSxzQ0FBZ0IsR0FBdkIsVUFBd0IsS0FBVztRQUMvQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDNUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxDQUFDO1lBRXpFLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3RDLHNCQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQywyQkFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pELDJCQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUIsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLFdBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUVELHNCQUFJLHNDQUFhO2FBQWpCO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDL0IsQ0FBQzs7O09BQUE7SUFDTCxrQkFBQztBQUFELENBQUMsQUFwbUJELENBQWlDLHdCQUFVLEdBb21CMUM7QUFwbUJZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtWaWV3fSBmcm9tICd1aS9jb3JlL3ZpZXcnO1xuaW1wb3J0IHtTY3JvbGxWaWV3fSBmcm9tICd1aS9zY3JvbGwtdmlldydcbmltcG9ydCB7UGFnZX0gZnJvbSAndWkvcGFnZSc7XG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge0xheW91dH0gZnJvbSAndWkvbGF5b3V0cy9sYXlvdXQnO1xuaW1wb3J0IHtBYnNvbHV0ZUxheW91dH0gZnJvbSAndWkvbGF5b3V0cy9hYnNvbHV0ZS1sYXlvdXQnO1xuaW1wb3J0IHtHcmlkTGF5b3V0LCBJdGVtU3BlY30gZnJvbSAndWkvbGF5b3V0cy9ncmlkLWxheW91dCc7XG5pbXBvcnQge1N0YWNrTGF5b3V0fSBmcm9tICd1aS9sYXlvdXRzL3N0YWNrLWxheW91dCc7XG5pbXBvcnQge0xhYmVsfSBmcm9tICd1aS9sYWJlbCc7XG5pbXBvcnQge0J1dHRvbn0gZnJvbSAndWkvYnV0dG9uJztcbmltcG9ydCB7QXJnb25XZWJWaWV3fSBmcm9tICdhcmdvbi13ZWItdmlldyc7XG5pbXBvcnQge1dlYlZpZXcsIExvYWRFdmVudERhdGF9IGZyb20gJ3VpL3dlYi12aWV3J1xuaW1wb3J0IHtcbiAgICBBbmltYXRpb25DdXJ2ZSwgXG4gICAgVmVydGljYWxBbGlnbm1lbnQsIFxuICAgIEhvcml6b250YWxBbGlnbm1lbnQsIFxuICAgIE9yaWVudGF0aW9uLCBcbiAgICBUZXh0QWxpZ25tZW50LFxuICAgIFZpc2liaWxpdHlcbn0gZnJvbSAndWkvZW51bXMnO1xuaW1wb3J0IHtcbiAgR2VzdHVyZVR5cGVzLFxuICBHZXN0dXJlU3RhdGVUeXBlcyxcbiAgUGFuR2VzdHVyZUV2ZW50RGF0YSxcbiAgUGluY2hHZXN0dXJlRXZlbnREYXRhLFxuICBHZXN0dXJlRXZlbnREYXRhLFxufSBmcm9tICd1aS9nZXN0dXJlcyc7XG5pbXBvcnQge1V0aWx9IGZyb20gJy4vY29tbW9uL3V0aWwnO1xuaW1wb3J0IHtQcm9wZXJ0eUNoYW5nZURhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSdcbmltcG9ydCB7UGxhY2Vob2xkZXIsIENyZWF0ZVZpZXdFdmVudERhdGF9IGZyb20gJ3VpL3BsYWNlaG9sZGVyJ1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IGRpYWxvZ3MgPSByZXF1aXJlKFwidWkvZGlhbG9nc1wiKTtcbmltcG9ydCBhcHBsaWNhdGlvblNldHRpbmdzID0gcmVxdWlyZSgnYXBwbGljYXRpb24tc2V0dGluZ3MnKTtcbmltcG9ydCAqIGFzIHZ1Zm9yaWEgZnJvbSAnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZmlsZS1zeXN0ZW0nO1xuaW1wb3J0ICogYXMgZnJhbWVzIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gJ2FwcGxpY2F0aW9uJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcblxuaW1wb3J0IHttYW5hZ2VyLCBhcHBWaWV3TW9kZWwsIExheWVyRGV0YWlsc30gZnJvbSAnLi9jb21tb24vQXBwVmlld01vZGVsJ1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tbW9uL2Jvb2ttYXJrcydcblxuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5cbmltcG9ydCBvYnNlcnZhYmxlTW9kdWxlID0gcmVxdWlyZShcImRhdGEvb2JzZXJ2YWJsZVwiKTtcbmxldCBhbmRyb2lkTGF5b3V0T2JzZXJ2YWJsZSA9IG5ldyBPYnNlcnZhYmxlKCk7XG5cbmNvbnN0IFRJVExFX0JBUl9IRUlHSFQgPSA0MDtcbmNvbnN0IE9WRVJWSUVXX1ZFUlRJQ0FMX1BBRERJTkcgPSAxNTA7XG5jb25zdCBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04gPSAyNTA7XG5jb25zdCBNSU5fQU5EUk9JRF9XRUJWSUVXX1ZFUlNJT04gPSA1NjtcbmNvbnN0IElHTk9SRV9XRUJWSUVXX1VQR1JBREVfS0VZID0gJ2lnbm9yZV93ZWJ2aWV3X3VwZ3JhZGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyIHtcbiAgICB3ZWJWaWV3OkFyZ29uV2ViVmlldyxcbiAgICBjb250YWluZXI6R3JpZExheW91dCxcbiAgICB0b3VjaE92ZXJsYXk6R3JpZExheW91dCxcbiAgICB0aXRsZUJhcjpHcmlkTGF5b3V0LFxuICAgIGNsb3NlQnV0dG9uOkJ1dHRvbixcbiAgICB0aXRsZUxhYmVsOiBMYWJlbCxcbiAgICB2aXN1YWxJbmRleDogbnVtYmVyLFxuICAgIGRldGFpbHM6IExheWVyRGV0YWlsc1xufVxuXG5leHBvcnQgY2xhc3MgQnJvd3NlclZpZXcgZXh0ZW5kcyBHcmlkTGF5b3V0IHtcbiAgICByZWFsaXR5TGF5ZXI6TGF5ZXI7XG4gICAgXG4gICAgdmlkZW9WaWV3OlZpZXcgPSB2dWZvcmlhLnZpZGVvVmlldztcbiAgICBzY3JvbGxWaWV3ID0gbmV3IFNjcm9sbFZpZXc7XG4gICAgbGF5ZXJDb250YWluZXIgPSBuZXcgR3JpZExheW91dDtcbiAgICBsYXllcnM6TGF5ZXJbXSA9IFtdO1xuICAgICAgICBcbiAgICBwcml2YXRlIF9mb2N1c3NlZExheWVyOkxheWVyO1xuICAgIHByaXZhdGUgX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgX3Njcm9sbE9mZnNldCA9IDA7XG4gICAgcHJpdmF0ZSBfcGFuU3RhcnRPZmZzZXQgPSAwO1xuICAgIFxuICAgIHByaXZhdGUgX2ludGVydmFsSWQ/Om51bWJlcjtcblxuICAgIHByaXZhdGUgX2NoZWNrZWRWZXJzaW9uID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIgPSB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIGlmICh2dWZvcmlhLmFwaSkge1xuICAgICAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldy5zdHlsZS52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIudGl0bGVCYXIuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDB4RkYyMjIyMjIpO1xuICAgICAgICB0aGlzLnJlYWxpdHlMYXllci50aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCd3aGl0ZScpO1xuICAgICAgICB0aGlzLnJlYWxpdHlMYXllci5jbG9zZUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5yZWFsaXR5TGF5ZXIud2ViVmlldy5pb3MpIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgdXNlciBuYXZpZ2F0aW9uIG9mIHRoZSByZWFsaXR5IHZpZXdcbiAgICAgICAgICAgICh0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3LmlvcyBhcyBXS1dlYlZpZXcpLmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnZpZGVvVmlldykge1xuICAgICAgICAgICAgdGhpcy52aWRlb1ZpZXcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgICAgIHRoaXMudmlkZW9WaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICAgICAgaWYgKHRoaXMudmlkZW9WaWV3LnBhcmVudCkgdGhpcy52aWRlb1ZpZXcucGFyZW50Ll9yZW1vdmVWaWV3KHRoaXMudmlkZW9WaWV3KVxuICAgICAgICAgICAgY29uc3QgdmlkZW9WaWV3TGF5b3V0ID0gbmV3IEFic29sdXRlTGF5b3V0KCk7XG4gICAgICAgICAgICB2aWRlb1ZpZXdMYXlvdXQuYWRkQ2hpbGQodGhpcy52aWRlb1ZpZXcpO1xuICAgICAgICAgICAgdGhpcy5yZWFsaXR5TGF5ZXIuY29udGFpbmVyLmFkZENoaWxkKHZpZGVvVmlld0xheW91dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkbyB0aGlzIGluIG9uTG9hZGVkIGluc3RlYWRcbiAgICAgICAgLy9VdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3KTtcbiAgICAgICAgLy9VdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci50b3VjaE92ZXJsYXkpO1xuICAgICAgICAvL1V0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLnRpdGxlQmFyKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJDb250YWluZXIuaW9zKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sYXllckNvbnRhaW5lci5hbmRyb2lkKSB7XG4gICAgICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdGhpcy5zY3JvbGxWaWV3LmNvbnRlbnQgPSB0aGlzLmxheWVyQ29udGFpbmVyO1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxWaWV3Lmlvcykge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zY3JvbGxWaWV3LmFuZHJvaWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsVmlldy5hbmRyb2lkLnNldENsaXBDaGlsZHJlbihmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnNjcm9sbFZpZXcpO1xuICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcihcIiM1NTVcIik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNjcm9sbFZpZXcub24oU2Nyb2xsVmlldy5zY3JvbGxFdmVudCwgdGhpcy5fYW5pbWF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1ha2UgYSBuZXcgbGF5ZXIgdG8gYmUgdXNlZCB3aXRoIHRoZSB1cmwgYmFyLlxuICAgICAgICB0aGlzLmFkZExheWVyKCk7XG4gICAgICAgIFxuICAgICAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdExheW91dCgpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgbWFuYWdlci5yZWFsaXR5LmNoYW5nZUV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKHtjdXJyZW50fSk9PntcbiAgICAgICAgICAgIC8vIGNvbnN0IHJlYWxpdHlMaXN0SXRlbSA9IGJvb2ttYXJrcy5yZWFsaXR5TWFwLmdldChjdXJyZW50LnVyaSk7XG4gICAgICAgICAgICBjb25zdCBkZXRhaWxzID0gdGhpcy5yZWFsaXR5TGF5ZXIuZGV0YWlscztcbiAgICAgICAgICAgIGRldGFpbHMuc2V0KCd0aXRsZScsICdSZWFsaXR5OiAnICsgY3VycmVudC50aXRsZSk7XG4gICAgICAgICAgICBkZXRhaWxzLnNldCgndXJpJywgY3VycmVudC51cmkpO1xuICAgICAgICAgICAgZGV0YWlscy5zZXQoJ3N1cHBvcnRlZEludGVyYWN0aW9uTW9kZXMnLCBbJ3BhZ2UnLCdpbW1lcnNpdmUnXSk7XG4gICAgICAgICAgICBpZiAoY3VycmVudCA9PT0gYm9va21hcmtzLkxJVkVfVklERU9fUkVBTElUWSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBlbmFibGUgcGluY2gtem9vbVxuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLm9uKEdlc3R1cmVUeXBlcy5waW5jaCwgdGhpcy5faGFuZGxlUGluY2gsIHRoaXMpO1xuICAgIH1cblxuICAgIGFkZExheWVyKCkge1xuICAgICAgICBsZXQgbGF5ZXI6TGF5ZXI7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb250YWluZXIgPSBuZXcgR3JpZExheW91dCgpO1xuICAgICAgICBjb250YWluZXIuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdsZWZ0JztcbiAgICAgICAgY29udGFpbmVyLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3RvcCc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gbmV3IEFyZ29uV2ViVmlldztcbiAgICAgICAgd2ViVmlldy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgICAgICB3ZWJWaWV3LnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuXG4gICAgICAgIHdlYlZpZXcub24oJ3Byb3BlcnR5Q2hhbmdlJywgKGV2ZW50RGF0YTpQcm9wZXJ0eUNoYW5nZURhdGEpID0+IHtcbiAgICAgICAgICAgIHN3aXRjaChldmVudERhdGEucHJvcGVydHlOYW1lKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAndXJsJzpcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZGV0YWlscy5zZXQoJ3VyaScsIGV2ZW50RGF0YS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3RpdGxlJzpcbiAgICAgICAgICAgICAgICAgICAgdmFyIGhpc3RvcnlCb29rbWFya0l0ZW0gPSBib29rbWFya3MuaGlzdG9yeU1hcC5nZXQod2ViVmlldy51cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGlzdG9yeUJvb2ttYXJrSXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGlzdG9yeUJvb2ttYXJrSXRlbS5zZXQoJ3RpdGxlJywgZXZlbnREYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobGF5ZXIgIT09IHRoaXMucmVhbGl0eUxheWVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuZGV0YWlscy5zZXQoJ3RpdGxlJywgZXZlbnREYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnaXNBcmdvbkFwcCc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQXJnb25BcHAgPSBldmVudERhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmRldGFpbHMuc2V0KCdzdXBwb3J0ZWRJbnRlcmFjdGlvbk1vZGVzJywgaXNBcmdvbkFwcCA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgWydwYWdlJywgJ2ltbWVyc2l2ZSddIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIFsncGFnZSddXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FyZ29uQXBwIHx8IGxheWVyID09PSB0aGlzLmZvY3Vzc2VkTGF5ZXIgfHwgdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllci5jb250YWluZXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5vcGFjaXR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB3ZWJWaWV3Lm9uKFdlYlZpZXcubG9hZEZpbmlzaGVkRXZlbnQsIChldmVudERhdGE6IExvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrV2ViVmlld1ZlcnNpb24od2ViVmlldyk7XG4gICAgICAgICAgICBpZiAoIWV2ZW50RGF0YS5lcnJvciAmJiB3ZWJWaWV3ICE9PSB0aGlzLnJlYWxpdHlMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGlzdG9yeUJvb2ttYXJrSXRlbSA9IGJvb2ttYXJrcy5oaXN0b3J5TWFwLmdldChldmVudERhdGEudXJsKTtcbiAgICAgICAgICAgICAgICBpZiAoaGlzdG9yeUJvb2ttYXJrSXRlbSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IGJvb2ttYXJrcy5oaXN0b3J5TGlzdC5pbmRleE9mKGhpc3RvcnlCb29rbWFya0l0ZW0pO1xuICAgICAgICAgICAgICAgICAgICBib29rbWFya3MuaGlzdG9yeUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICBib29rbWFya3MuaGlzdG9yeUxpc3QudW5zaGlmdChoaXN0b3J5Qm9va21hcmtJdGVtKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBib29rbWFya3MuaGlzdG9yeUxpc3QudW5zaGlmdChuZXcgYm9va21hcmtzLkJvb2ttYXJrSXRlbSh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmk6IGV2ZW50RGF0YS51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogd2ViVmlldy50aXRsZVxuICAgICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldyA9PT0gd2ViVmlldykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSB3ZWJWaWV3LnNlc3Npb247XG4gICAgICAgICAgICAgICAgY29uc3QgZ2VzdHVyZU9ic2VydmVycyA9IHRoaXMubGF5ZXJDb250YWluZXIuZ2V0R2VzdHVyZU9ic2VydmVycyhHZXN0dXJlVHlwZXMucGluY2gpO1xuICAgICAgICAgICAgICAgIGlmICghc2Vzc2lvbiB8fCAoc2Vzc2lvbiAmJiBzZXNzaW9uLmluZm9bJ2FwcC5kaXNhYmxlUGluY2hab29tJ10pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIub2ZmKEdlc3R1cmVUeXBlcy5waW5jaCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICggIWdlc3R1cmVPYnNlcnZlcnMgfHwgKGdlc3R1cmVPYnNlcnZlcnMgJiYgZ2VzdHVyZU9ic2VydmVycy5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIub24oR2VzdHVyZVR5cGVzLnBpbmNoLCB0aGlzLl9oYW5kbGVQaW5jaCwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHdlYlZpZXcub24oJ3Nlc3Npb24nLCAoZSk9PntcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBlLnNlc3Npb247XG4gICAgICAgICAgICBzZXNzaW9uLmNvbm5lY3RFdmVudC5hZGRFdmVudExpc3RlbmVyKCgpPT57XG4gICAgICAgICAgICAgICAgaWYgKHdlYlZpZXcgPT09IHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIuZm9jdXMuc2V0U2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyID09PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgIT09IEFyZ29uLlJvbGUuUkVBTElUWV9WSUVXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIk9ubHkgYSByZWFsaXR5IGNhbiBiZSBsb2FkZWQgaW4gdGhlIHJlYWxpdHkgbGF5ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5pbmZvLnJvbGUgPT0gQXJnb24uUm9sZS5SRUFMSVRZX1ZJRVcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiQSByZWFsaXR5IGNhbiBvbmx5IGJlIGxvYWRlZCBpbiB0aGUgcmVhbGl0eSBsYXllclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICAvLyBDb3ZlciB0aGUgd2VidmlldyB0byBkZXRlY3QgZ2VzdHVyZXMgYW5kIGRpc2FibGUgaW50ZXJhY3Rpb25cbiAgICAgICAgY29uc3QgdG91Y2hPdmVybGF5ID0gbmV3IEdyaWRMYXlvdXQoKTtcbiAgICAgICAgdG91Y2hPdmVybGF5LnN0eWxlLnZpc2liaWxpdHkgPSAnY29sbGFwc2VkJztcbiAgICAgICAgdG91Y2hPdmVybGF5Lmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgICAgIHRvdWNoT3ZlcmxheS52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICAgICAgdG91Y2hPdmVybGF5Lm9uKEdlc3R1cmVUeXBlcy50YXAsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXRGb2N1c3NlZExheWVyKGxheWVyKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlT3ZlcnZpZXcoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aXRsZUJhciA9IG5ldyBHcmlkTGF5b3V0KCk7XG4gICAgICAgIHRpdGxlQmFyLmFkZFJvdyhuZXcgSXRlbVNwZWMoVElUTEVfQkFSX0hFSUdIVCwgJ3BpeGVsJykpO1xuICAgICAgICB0aXRsZUJhci5hZGRDb2x1bW4obmV3IEl0ZW1TcGVjKFRJVExFX0JBUl9IRUlHSFQsICdwaXhlbCcpKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ29sdW1uKG5ldyBJdGVtU3BlYygxLCAnc3RhcicpKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ29sdW1uKG5ldyBJdGVtU3BlYyhUSVRMRV9CQVJfSEVJR0hULCAncGl4ZWwnKSk7XG4gICAgICAgIHRpdGxlQmFyLnZlcnRpY2FsQWxpZ25tZW50ID0gVmVydGljYWxBbGlnbm1lbnQudG9wO1xuICAgICAgICB0aXRsZUJhci5ob3Jpem9udGFsQWxpZ25tZW50ID0gSG9yaXpvbnRhbEFsaWdubWVudC5zdHJldGNoO1xuICAgICAgICB0aXRsZUJhci5iYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoMjQwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICAgICAgdGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIHRpdGxlQmFyLm9wYWNpdHkgPSAwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2xvc2VCdXR0b24gPSBuZXcgQnV0dG9uKCk7XG4gICAgICAgIGNsb3NlQnV0dG9uLmhvcml6b250YWxBbGlnbm1lbnQgPSBIb3Jpem9udGFsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIGNsb3NlQnV0dG9uLnZlcnRpY2FsQWxpZ25tZW50ID0gVmVydGljYWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgY2xvc2VCdXR0b24udGV4dCA9ICdjbG9zZSc7XG4gICAgICAgIGNsb3NlQnV0dG9uLmNsYXNzTmFtZSA9ICdtYXRlcmlhbC1pY29uJztcbiAgICAgICAgY2xvc2VCdXR0b24uc3R5bGUuZm9udFNpemUgPSB0aGlzLmFuZHJvaWQgPyAxNiA6IDIyO1xuICAgICAgICBjbG9zZUJ1dHRvbi5jb2xvciA9IG5ldyBDb2xvcignYmxhY2snKTtcbiAgICAgICAgY2xvc2VCdXR0b24uYmFja2dyb3VuZENvbG9yID0gdGhpcy5hbmRyb2lkID8gbmV3IENvbG9yKCd3aGl0ZScpIDogbmV3IENvbG9yKCdibGFjaycpO1xuICAgICAgICBHcmlkTGF5b3V0LnNldFJvdyhjbG9zZUJ1dHRvbiwgMCk7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Q29sdW1uKGNsb3NlQnV0dG9uLCAwKTtcbiAgICAgICAgXG4gICAgICAgIGNsb3NlQnV0dG9uLm9uKCd0YXAnLCAoKT0+e1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVMYXllcihsYXllcik7XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aXRsZUxhYmVsID0gbmV3IExhYmVsKCk7XG4gICAgICAgIHRpdGxlTGFiZWwuaG9yaXpvbnRhbEFsaWdubWVudCA9IEhvcml6b250YWxBbGlnbm1lbnQuc3RyZXRjaDtcbiAgICAgICAgdGl0bGVMYWJlbC52ZXJ0aWNhbEFsaWdubWVudCA9IHRoaXMuYW5kcm9pZCA/IFZlcnRpY2FsQWxpZ25tZW50LmNlbnRlciA6IFZlcnRpY2FsQWxpZ25tZW50LnN0cmV0Y2g7XG4gICAgICAgIHRpdGxlTGFiZWwudGV4dEFsaWdubWVudCA9IFRleHRBbGlnbm1lbnQuY2VudGVyO1xuICAgICAgICB0aXRsZUxhYmVsLmNvbG9yID0gbmV3IENvbG9yKCdibGFjaycpO1xuICAgICAgICB0aXRsZUxhYmVsLmZvbnRTaXplID0gMTQ7XG4gICAgICAgIEdyaWRMYXlvdXQuc2V0Um93KHRpdGxlTGFiZWwsIDApO1xuICAgICAgICBHcmlkTGF5b3V0LnNldENvbHVtbih0aXRsZUxhYmVsLCAxKTtcbiAgICAgICAgXG4gICAgICAgIHRpdGxlQmFyLmFkZENoaWxkKGNsb3NlQnV0dG9uKTtcbiAgICAgICAgdGl0bGVCYXIuYWRkQ2hpbGQodGl0bGVMYWJlbCk7XG4gICAgICAgIFxuICAgICAgICBjb250YWluZXIuYWRkQ2hpbGQod2ViVmlldyk7XG4gICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZCh0b3VjaE92ZXJsYXkpO1xuICAgICAgICBjb250YWluZXIuYWRkQ2hpbGQodGl0bGVCYXIpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLmFkZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIFxuICAgICAgICBsYXllciA9IHtcbiAgICAgICAgICAgIGNvbnRhaW5lcixcbiAgICAgICAgICAgIHdlYlZpZXcsXG4gICAgICAgICAgICB0b3VjaE92ZXJsYXksXG4gICAgICAgICAgICB0aXRsZUJhcixcbiAgICAgICAgICAgIGNsb3NlQnV0dG9uLFxuICAgICAgICAgICAgdGl0bGVMYWJlbCxcbiAgICAgICAgICAgIHZpc3VhbEluZGV4OiB0aGlzLmxheWVycy5sZW5ndGgsXG4gICAgICAgICAgICBkZXRhaWxzOiBuZXcgTGF5ZXJEZXRhaWxzKHdlYlZpZXcpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMubGF5ZXJzLnB1c2gobGF5ZXIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuaXNMb2FkZWQpXG4gICAgICAgICAgICB0aGlzLnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuXG4gICAgICAgIHRpdGxlTGFiZWwuYmluZCh7XG4gICAgICAgICAgICBzb3VyY2VQcm9wZXJ0eTogJ3RpdGxlJyxcbiAgICAgICAgICAgIHRhcmdldFByb3BlcnR5OiAndGV4dCdcbiAgICAgICAgfSwgbGF5ZXIuZGV0YWlscyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fb3ZlcnZpZXdFbmFibGVkKSB0aGlzLl9zaG93TGF5ZXJJbkNhcm91c2VsKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBsYXllcjtcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXJBdEluZGV4KGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllciA9IHRoaXMubGF5ZXJzW2luZGV4XTtcbiAgICAgICAgaWYgKHR5cGVvZiBsYXllciA9PT0gJ3VuZGVmaW5lZCcpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBsYXllciBhdCBpbmRleCAnICsgaW5kZXgpO1xuICAgICAgICB0aGlzLmxheWVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLnJlbW92ZUNoaWxkKGxheWVyLmNvbnRhaW5lcik7IC8vIGZvciBub3dcbiAgICB9XG4gICAgXG4gICAgcmVtb3ZlTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgdGhpcy5yZW1vdmVMYXllckF0SW5kZXgoaW5kZXgpO1xuICAgIH1cbiAgICBcbiAgICBvbkxvYWRlZCgpIHtcbiAgICAgICAgc3VwZXIub25Mb2FkZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuYW5kcm9pZCkge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLmFkZE9uTGF5b3V0Q2hhbmdlTGlzdGVuZXIobmV3IGFuZHJvaWQudmlldy5WaWV3Lk9uTGF5b3V0Q2hhbmdlTGlzdGVuZXIoe1xuICAgICAgICAgICAgICAgIG9uTGF5b3V0Q2hhbmdlKHY6IGFuZHJvaWQudmlldy5WaWV3LCBsZWZ0OiBudW1iZXIsIHRvcDogbnVtYmVyLCByaWdodDogbnVtYmVyLCBib3R0b206IG51bWJlciwgb2xkTGVmdDogbnVtYmVyLCBvbGRUb3A6IG51bWJlciwgb2xkUmlnaHQ6IG51bWJlciwgb2xkQm90dG9tOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50RGF0YTogb2JzZXJ2YWJsZU1vZHVsZS5FdmVudERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudE5hbWU6IFwiY3VzdG9tTGF5b3V0Q2hhbmdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGFuZHJvaWRMYXlvdXRPYnNlcnZhYmxlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYW5kcm9pZExheW91dE9ic2VydmFibGUubm90aWZ5KGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgYW5kcm9pZExheW91dE9ic2VydmFibGUub24oXCJjdXN0b21MYXlvdXRDaGFuZ2VcIiwgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLmFuZHJvaWRPbkxheW91dCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIFV0aWwuYnJpbmdUb0Zyb250KHRoaXMucmVhbGl0eUxheWVyLndlYlZpZXcpO1xuICAgICAgICBVdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci50b3VjaE92ZXJsYXkpO1xuICAgICAgICBVdGlsLmJyaW5nVG9Gcm9udCh0aGlzLnJlYWxpdHlMYXllci50aXRsZUJhcik7XG4gICAgfVxuICAgIFxuICAgIG9uTWVhc3VyZSh3aWR0aE1lYXN1cmVTcGVjLCBoZWlnaHRNZWFzdXJlU3BlYykge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUod2lkdGhNZWFzdXJlU3BlYyk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHV0aWxzLmxheW91dC5nZXRNZWFzdXJlU3BlY1NpemUoaGVpZ2h0TWVhc3VyZVNwZWMpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllcik9PntcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3VwZXIub25NZWFzdXJlKHdpZHRoTWVhc3VyZVNwZWMsIGhlaWdodE1lYXN1cmVTcGVjKTtcbiAgICB9XG5cbiAgICBhbmRyb2lkT25MYXlvdXQoKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5nZXRBY3R1YWxTaXplKCkud2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuZ2V0QWN0dWFsU2l6ZSgpLmhlaWdodDtcblxuICAgICAgICBpZiAoIXRoaXMuX292ZXJ2aWV3RW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKT0+e1xuICAgICAgICAgICAgbGF5ZXIuY29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXIuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jaGVja1dlYlZpZXdWZXJzaW9uKHdlYlZpZXc6QXJnb25XZWJWaWV3KSB7XG4gICAgICAgIGlmICh0aGlzLl9jaGVja2VkVmVyc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcHBsaWNhdGlvblNldHRpbmdzLmhhc0tleShJR05PUkVfV0VCVklFV19VUEdSQURFX0tFWSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrZWRWZXJzaW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAod2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gKDxhbnk+d2ViVmlldykuZ2V0V2ViVmlld1ZlcnNpb24oKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5kcm9pZCB3ZWJ2aWV3IHZlcnNpb246IFwiICsgdmVyc2lvbik7XG4gICAgICAgICAgICBpZiAodmVyc2lvbiA8IE1JTl9BTkRST0lEX1dFQlZJRVdfVkVSU0lPTikge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybSh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlVwZ3JhZGUgV2ViVmlld1wiLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIllvdXIgQW5kcm9pZCBTeXN0ZW0gV2ViVmlldyBpcyBvdXQgb2YgZGF0ZS4gV2Ugc3VnZ2VzdCBhdCBsZWFzdCB2ZXJzaW9uIFwiICsgTUlOX0FORFJPSURfV0VCVklFV19WRVJTSU9OICsgXCIsIHlvdXIgZGV2aWNlIGN1cnJlbnRseSBoYXMgdmVyc2lvbiBcIiArIHZlcnNpb24gKyBcIi4gVGhpcyBtYXkgcmVzdWx0IGluIHJlbmRlcmluZyBpc3N1ZXMuIFBsZWFzZSB1cGRhdGUgdmlhIHRoZSBHb29nbGUgUGxheSBTdG9yZS5cIixcbiAgICAgICAgICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBcIlVwZ3JhZGVcIixcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJMYXRlclwiLFxuICAgICAgICAgICAgICAgICAgICBuZXV0cmFsQnV0dG9uVGV4dDogXCJJZ25vcmVcIlxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZ3JhZGluZyB3ZWJ2aWV3XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW50ZW50ID0gbmV3IGFuZHJvaWQuY29udGVudC5JbnRlbnQoYW5kcm9pZC5jb250ZW50LkludGVudC5BQ1RJT05fVklFVyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlbnQuc2V0RGF0YShhbmRyb2lkLm5ldC5VcmkucGFyc2UoXCJtYXJrZXQ6Ly9kZXRhaWxzP2lkPWNvbS5nb29nbGUuYW5kcm9pZC53ZWJ2aWV3XCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLmFuZHJvaWQuc3RhcnRBY3Rpdml0eS5zdGFydEFjdGl2aXR5KGludGVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBncmFkZSBuZXZlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uU2V0dGluZ3Muc2V0Qm9vbGVhbihJR05PUkVfV0VCVklFV19VUEdSQURFX0tFWSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGdyYWRlIGxhdGVyXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jaGVja2VkVmVyc2lvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfY2FsY3VsYXRlVGFyZ2V0VHJhbnNmb3JtKGluZGV4Om51bWJlcikge1xuICAgICAgICBjb25zdCBsYXllclBvc2l0aW9uID0gaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HIC0gdGhpcy5zY3JvbGxWaWV3LnZlcnRpY2FsT2Zmc2V0O1xuICAgICAgICBjb25zdCBub3JtYWxpemVkUG9zaXRpb24gPSBsYXllclBvc2l0aW9uIC8gdGhpcy5nZXRNZWFzdXJlZEhlaWdodCgpO1xuICAgICAgICBjb25zdCB0aGV0YSA9IE1hdGgubWluKE1hdGgubWF4KG5vcm1hbGl6ZWRQb3NpdGlvbiwgMCksIDAuODUpICogTWF0aC5QSTtcbiAgICAgICAgY29uc3Qgc2NhbGVGYWN0b3IgPSAxIC0gKE1hdGguY29zKHRoZXRhKSAvIDIgKyAwLjUpICogMC4yNTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogaW5kZXggKiBPVkVSVklFV19WRVJUSUNBTF9QQURESU5HXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICB4OiBzY2FsZUZhY3RvcixcbiAgICAgICAgICAgICAgICB5OiBzY2FsZUZhY3RvclxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIF9sYXN0VGltZSA9IERhdGUubm93KCk7XG4gICAgcHJpdmF0ZSBfYW5pbWF0ZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vdmVydmlld0VuYWJsZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgZGVsdGFUID0gTWF0aC5taW4obm93IC0gdGhpcy5fbGFzdFRpbWUsIDMwKSAvIDEwMDA7XG4gICAgICAgIHRoaXMuX2xhc3RUaW1lID0gbm93O1xuICAgICAgICBcbiAgICAgICAgLy9jb25zdCB3aWR0aCA9IHRoaXMuZ2V0TWVhc3VyZWRXaWR0aCgpO1xuICAgICAgICAvL2NvbnN0IGhlaWdodCA9IHRoaXMuZ2V0TWVhc3VyZWRIZWlnaHQoKTtcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmdldEFjdHVhbFNpemUoKS53aWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5nZXRBY3R1YWxTaXplKCkuaGVpZ2h0O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29udGFpbmVySGVpZ2h0ID0gaGVpZ2h0ICsgT1ZFUlZJRVdfVkVSVElDQUxfUEFERElORyAqICh0aGlzLmxheWVycy5sZW5ndGgtMSk7XG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5sYXllckNvbnRhaW5lci5oZWlnaHQgPSBjb250YWluZXJIZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxheWVycy5mb3JFYWNoKChsYXllciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGxheWVyLnZpc3VhbEluZGV4ID0gdGhpcy5fbGVycChsYXllci52aXN1YWxJbmRleCwgaW5kZXgsIGRlbHRhVCo0KTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IHRoaXMuX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShsYXllci52aXN1YWxJbmRleCk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXIuc2NhbGVYID0gdHJhbnNmb3JtLnNjYWxlLng7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXIuc2NhbGVZID0gdHJhbnNmb3JtLnNjYWxlLnk7XG4gICAgICAgICAgICBsYXllci5jb250YWluZXIudHJhbnNsYXRlWCA9IHRyYW5zZm9ybS50cmFuc2xhdGUueDtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci50cmFuc2xhdGVZID0gdHJhbnNmb3JtLnRyYW5zbGF0ZS55O1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfbGVycChhLGIsdCkge1xuICAgICAgICByZXR1cm4gYSArIChiLWEpKnRcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfc2hvd0xheWVySW5DYXJvdXNlbChsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXllci53ZWJWaWV3Lmlvcykge1xuICAgICAgICAgICAgbGF5ZXIud2ViVmlldy5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobGF5ZXIud2ViVmlldy5hbmRyb2lkKSB7XG4gICAgICAgICAgICBsYXllci53ZWJWaWV3LmFuZHJvaWQuc2V0Q2xpcENoaWxkcmVuKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxheWVyLmNvbnRhaW5lci5pb3MpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAobGF5ZXIuY29udGFpbmVyLmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuXG4gICAgICAgIC8vIEZvciB0cmFuc3BhcmVudCB3ZWJ2aWV3cywgYWRkIGEgbGl0dGxlIGJpdCBvZiBvcGFjaXR5XG4gICAgICAgIGxheWVyLmNvbnRhaW5lci5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBsYXllci5jb250YWluZXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBuZXcgQ29sb3IoMTI4LCAyNTUsIDI1NSwgMjU1KSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgIH0pO1xuICAgICAgICBsYXllci53ZWJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6VElUTEVfQkFSX0hFSUdIVH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OXG4gICAgICAgIH0pXG4gICAgICAgIC8vIFNob3cgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLnZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LnZpc2libGU7XG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSlcbiAgICAgICAgLy8gVXBkYXRlIGZvciB0aGUgZmlyc3QgdGltZSAmIGFuaW1hdGUuXG4gICAgICAgIGNvbnN0IHt0cmFuc2xhdGUsIHNjYWxlfSA9IHRoaXMuX2NhbGN1bGF0ZVRhcmdldFRyYW5zZm9ybShpZHgpO1xuICAgICAgICBsYXllci5jb250YWluZXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICB0cmFuc2xhdGUsXG4gICAgICAgICAgICBzY2FsZSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT04sXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBfc2hvd0xheWVySW5TdGFjayhsYXllcjpMYXllcikge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKTtcbiAgICAgICAgXG4gICAgICAgIGxheWVyLnRvdWNoT3ZlcmxheS5zdHlsZS52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlZCc7XG5cbiAgICAgICAgLy8gRm9yIHRyYW5zcGFyZW50IHdlYnZpZXdzLCBhZGQgYSBsaXR0bGUgYml0IG9mIG9wYWNpdHlcbiAgICAgICAgbGF5ZXIuY29udGFpbmVyLmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IHRoaXMuZm9jdXNzZWRMYXllciA9PT0gbGF5ZXI7XG4gICAgICAgIGxheWVyLmNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IHRoaXMucmVhbGl0eUxheWVyID09PSBsYXllciB8fCBsYXllci53ZWJWaWV3LmlzQXJnb25BcHAgfHwgdGhpcy5mb2N1c3NlZExheWVyID09PSBsYXllciA/IDEgOiAwLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBuZXcgQ29sb3IoMCwgMjU1LCAyNTUsIDI1NSksXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICB9KTtcbiAgICAgICAgbGF5ZXIud2ViVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgZHVyYXRpb246IE9WRVJWSUVXX0FOSU1BVElPTl9EVVJBVElPTlxuICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICBpZiAobGF5ZXIud2ViVmlldy5pb3MpIHtcbiAgICAgICAgICAgICAgICBsYXllci53ZWJWaWV3Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxheWVyLndlYlZpZXcuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLndlYlZpZXcuYW5kcm9pZC5zZXRDbGlwQ2hpbGRyZW4odHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGF5ZXIuY29udGFpbmVyLmlvcykge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXllci5jb250YWluZXIuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgIGxheWVyLmNvbnRhaW5lci5hbmRyb2lkLnNldENsaXBDaGlsZHJlbih0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEhpZGUgdGl0bGViYXJzXG4gICAgICAgIGxheWVyLnRpdGxlQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBPVkVSVklFV19BTklNQVRJT05fRFVSQVRJT05cbiAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgbGF5ZXIudGl0bGVCYXIudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkuY29sbGFwc2U7XG4gICAgICAgIH0pXG4gICAgICAgIC8vIFVwZGF0ZSBmb3IgdGhlIGZpcnN0IHRpbWUgJiBhbmltYXRlLlxuICAgICAgICBsYXllci52aXN1YWxJbmRleCA9IGlkeDtcbiAgICAgICAgcmV0dXJuIGxheWVyLmNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIHRyYW5zbGF0ZTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBzY2FsZTogeyB4OiAxLCB5OiAxIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogT1ZFUlZJRVdfQU5JTUFUSU9OX0RVUkFUSU9OLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dCxcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzaG93T3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICh0aGlzLl9vdmVydmlld0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5fb3ZlcnZpZXdFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3dMYXllckluQ2Fyb3VzZWwobGF5ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gYW5pbWF0ZSB0aGUgdmlld3NcbiAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuX2FuaW1hdGUuYmluZCh0aGlzKSwgMjApO1xuXG4gICAgICAgIC8vIGRpc2FibGUgcGluY2gtem9vbVxuICAgICAgICB0aGlzLmxheWVyQ29udGFpbmVyLm9mZihHZXN0dXJlVHlwZXMucGluY2gsIHRoaXMuX2hhbmRsZVBpbmNoLCB0aGlzKTtcbiAgICB9XG5cbiAgICBoaWRlT3ZlcnZpZXcoKSB7XG4gICAgICAgIGlmICghdGhpcy5fb3ZlcnZpZXdFbmFibGVkKSByZXR1cm47XG4gICAgICAgIHRoaXMuX292ZXJ2aWV3RW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGFuaW1hdGlvbnMgPSB0aGlzLmxheWVycy5tYXAoKGxheWVyKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2hvd0xheWVySW5TdGFjayhsYXllcilcbiAgICAgICAgfSk7XG4gICAgICAgIFByb21pc2UuYWxsKGFuaW1hdGlvbnMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgdHJ1ZSk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxWaWV3LnNjcm9sbFRvVmVydGljYWxPZmZzZXQoMCwgZmFsc2UpO1xuICAgICAgICAgICAgfSwgMzApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2Nyb2xsVmlldy5zY3JvbGxUb1ZlcnRpY2FsT2Zmc2V0KDAsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3RvcCBhbmltYXRpbmcgdGhlIHZpZXdzXG4gICAgICAgIGlmICh0aGlzLl9pbnRlcnZhbElkKSBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbElkID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vIGVuYWJsZSBwaW5jaC16b29tXG4gICAgICAgIHRoaXMubGF5ZXJDb250YWluZXIub24oR2VzdHVyZVR5cGVzLnBpbmNoLCB0aGlzLl9oYW5kbGVQaW5jaCwgdGhpcyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfcGluY2hTdGFydEZvdj86bnVtYmVyO1xuICAgIFxuICAgIHByaXZhdGUgX2hhbmRsZVBpbmNoKGV2ZW50OiBQaW5jaEdlc3R1cmVFdmVudERhdGEpIHtcbiAgICAgICAgc3dpdGNoIChldmVudC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5iZWdhbjogXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBtYW5hZ2VyLmNvbnRleHQuc2VyaWFsaXplZEZyYW1lU3RhdGVcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGluY2hTdGFydEZvdiA9IHN0YXRlLnZpZXcuc3Vidmlld3NbMF0uZnJ1c3R1bS5mb3Y7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGluY2hTdGFydEZvdiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3BpbmNoU3RhcnRGb3YgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIucmVhbGl0eS56b29tKHtcbiAgICAgICAgICAgICAgICAgICAgem9vbTogMSwgXG4gICAgICAgICAgICAgICAgICAgIGZvdjogdGhpcy5fcGluY2hTdGFydEZvdixcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEFyZ29uLlJlYWxpdHlab29tU3RhdGUuU1RBUlRcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBHZXN0dXJlU3RhdGVUeXBlcy5jaGFuZ2VkOiBcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGluY2hTdGFydEZvdiA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgbWFuYWdlci5yZWFsaXR5Lnpvb20oe1xuICAgICAgICAgICAgICAgICAgICB6b29tOiBldmVudC5zY2FsZSwgXG4gICAgICAgICAgICAgICAgICAgIGZvdjogdGhpcy5fcGluY2hTdGFydEZvdixcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEFyZ29uLlJlYWxpdHlab29tU3RhdGUuQ0hBTkdFXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3BpbmNoU3RhcnRGb3YgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIucmVhbGl0eS56b29tKHtcbiAgICAgICAgICAgICAgICAgICAgem9vbTogZXZlbnQuc2NhbGUsIFxuICAgICAgICAgICAgICAgICAgICBmb3Y6IHRoaXMuX3BpbmNoU3RhcnRGb3YsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBBcmdvbi5SZWFsaXR5Wm9vbVN0YXRlLkVORFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgYnJlYWs7ICBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBsb2FkVXJsKHVybDpzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMuZm9jdXNzZWRMYXllciAhPT0gdGhpcy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci5kZXRhaWxzLnNldCgndXJpJyx1cmwpO1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCd0aXRsZScsJycpO1xuICAgICAgICAgICAgdGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMuc2V0KCdpc0Zhdm9yaXRlJyxmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy5zZXQoJ3N1cHBvcnRlZEludGVyYWN0aW9uTW9kZXMnLFsncGFnZScsICdpbW1lcnNpdmUnXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy9pZiAodGhpcy5mb2N1c3NlZExheWVyLndlYlZpZXcuc3JjID09PSB1cmwpIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpOyAvLyBzcmMgaXNuJ3Qgc2FmZSB0byB1c2UgaGVyZSwgYXMgaXQncyB0aGUgb3JpZ2luYWwgdXJsIChub3QgdGhlIGN1cnJlbnQpXG4gICAgICAgIGlmICh0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5nZXRDdXJyZW50VXJsKCkgPT09IHVybClcbiAgICAgICAgICAgIHRoaXMuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5zcmMgPSB1cmw7XG4gICAgfVxuXG4gICAgcHVibGljIHNldEZvY3Vzc2VkTGF5ZXIobGF5ZXI6TGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZvY3Vzc2VkTGF5ZXIgIT09IGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLl9mb2N1c3NlZExheWVyID0gbGF5ZXI7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeVByb3BlcnR5Q2hhbmdlKCdmb2N1c3NlZExheWVyJywgbGF5ZXIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTZXQgZm9jdXNzZWQgbGF5ZXI6IFwiICsgbGF5ZXIuZGV0YWlscy51cmkgfHwgXCJOZXcgQ2hhbm5lbFwiKTtcblxuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGxheWVyLndlYlZpZXcuc2Vzc2lvbjtcbiAgICAgICAgICAgIG1hbmFnZXIuZm9jdXMuc2V0U2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zZXRMYXllckRldGFpbHModGhpcy5mb2N1c3NlZExheWVyLmRldGFpbHMpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgaWYgKGxheWVyICE9PSB0aGlzLnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXJzLnNwbGljZSh0aGlzLmxheWVycy5pbmRleE9mKGxheWVyKSwgMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG4gICAgICAgICAgICAgICAgVXRpbC5icmluZ1RvRnJvbnQobGF5ZXIuY29udGFpbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBmb2N1c3NlZExheWVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZm9jdXNzZWRMYXllcjtcbiAgICB9XG59XG4iXX0=