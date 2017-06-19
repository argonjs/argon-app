import * as URI from 'urijs';
import {View} from 'ui/core/view';
import {ScrollView} from 'ui/scroll-view'
import {Color} from 'color';
import {GridLayout, ItemSpec} from 'ui/layouts/grid-layout';
import {Label} from 'ui/label';
import {Button} from 'ui/button';
import {Progress} from 'ui/progress';
import {ArgonWebView} from 'argon-web-view';
import {WebView, LoadEventData} from 'ui/web-view'
import {
    AnimationCurve, 
    VerticalAlignment, 
    HorizontalAlignment, 
    TextAlignment,
    Visibility
} from 'ui/enums';
import {
  GestureTypes
} from 'ui/gestures';
import {bringToFront} from './common/util';
import {PropertyChangeData} from 'data/observable'
import {Observable} from 'data/observable';
import {AbsoluteLayout} from 'ui/layouts/absolute-layout';
import dialogs = require("ui/dialogs");
import applicationSettings = require('application-settings');
import * as vuforia from 'nativescript-vuforia';
import * as application from 'application';
import * as utils from 'utils/utils';
import * as analytics from "./common/analytics";
// import {permissionManager} from "./common/permissions"

import {appViewModel, LayerDetails} from './common/AppViewModel'
import {NativescriptHostedRealityViewer} from './common/argon-reality-viewers'
import * as bookmarks from './common/bookmarks'

import * as Argon from '@argonjs/argon'

import observableModule = require("data/observable");
let androidLayoutObservable = new Observable();

const TITLE_BAR_HEIGHT = 30;
const OVERVIEW_VERTICAL_PADDING = 150;
const OVERVIEW_ANIMATION_DURATION = 250;
const MIN_ANDROID_WEBVIEW_VERSION = 56;
const IGNORE_WEBVIEW_UPGRADE_KEY = 'ignore_webview_upgrade';

export interface Layer {
    session?:Argon.SessionPort,
    containerView:GridLayout,
    contentView:GridLayout,
    webView?:ArgonWebView,
    touchOverlay:GridLayout,
    titleBar:GridLayout,
    closeButton:Button,
    titleLabel: Label,
    visualIndex: number,
    details: LayerDetails,
    progressBar: Progress
}

export class BrowserView extends GridLayout {
    realityLayer:Layer;
    realityWebviews = new Map<string, ArgonWebView>();
    
    videoView:View = vuforia.videoView;
    scrollView = new ScrollView;
    layerContainer = new GridLayout;
    layers:Layer[] = [];
        
    private _focussedLayer?:Layer;
    private _overviewEnabled = false;
    
    private _intervalId?:number;

    private _checkedVersion = false;

    constructor() {
        super();
        
        this.layerContainer.horizontalAlignment = 'stretch';
        this.layerContainer.verticalAlignment = 'stretch';
        if (this.layerContainer.ios) {
            this.layerContainer.ios.layer.masksToBounds = false;
        } else if (this.layerContainer.android) {
            this.layerContainer.android.setClipChildren(false);
        }
        
        this.scrollView.horizontalAlignment = 'stretch';
        this.scrollView.verticalAlignment = 'stretch';
        this.scrollView.content = this.layerContainer;
        if (this.scrollView.ios) {
            this.scrollView.ios.layer.masksToBounds = false;
        } else if (this.scrollView.android) {
            this.scrollView.android.setClipChildren(false);
        }
        this.addChild(this.scrollView);
        this.backgroundColor = new Color("#555");
        
        this.scrollView.on(ScrollView.scrollEvent, this._animate.bind(this));
        
        // Create the reality layer
        this._createRealityLayer();

        // Add a normal layer to be used with the url bar.
        this.addLayer();
        
        application.on(application.orientationChangedEvent, ()=>{
            this.requestLayout();
            this.scrollView.scrollToVerticalOffset(0, false);
        })
    }

    private _createRealityLayer() {
        let layer:Layer = this._createLayer();
        layer.titleBar.backgroundColor = new Color(0xFF222222);
        layer.titleLabel.color = new Color('white');
        layer.closeButton.visibility = 'collapsed';
        
        if (this.videoView) {
            // this.videoView.horizontalAlignment = 'stretch';
            // this.videoView.verticalAlignment = 'stretch';
            // if (this.videoView.parent) this.videoView.parent._removeView(this.videoView);
            // layer.contentView.addChild(this.videoView);
            if (this.videoView.parent) this.videoView.parent._removeView(this.videoView)
            const videoViewLayout = new AbsoluteLayout();
            videoViewLayout.addChild(this.videoView);
            layer.contentView.addChild(videoViewLayout);
        }

        appViewModel.on('propertyChange', (evt:PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'overviewOpen': 
                    if (appViewModel.overviewOpen) this._showOverview()
                    else this._hideOverview()
                    break;
            }
        });

        appViewModel.ready.then(()=>{
            const manager = appViewModel.argon;
            
            appViewModel.argon.provider.reality.installedEvent.addEventListener(({viewer})=>{
                if (viewer instanceof NativescriptHostedRealityViewer) {
                    const webView = viewer.webView;
                    webView.horizontalAlignment = 'stretch';
                    webView.verticalAlignment = 'stretch';
                    webView.visibility = 'collapse';
                    layer.contentView.addChild(webView);
                    this.realityWebviews.set(viewer.uri, webView);
                    analytics.updateInstalledRealityCount(this.realityWebviews.size);
                }
            });

            appViewModel.argon.provider.reality.uninstalledEvent.addEventListener(({viewer})=>{
                if (viewer instanceof NativescriptHostedRealityViewer) {
                    layer.contentView.removeChild(viewer.webView);
                    this.realityWebviews.delete(viewer.uri);
                }
                manager.reality.request(Argon.RealityViewer.LIVE);
            });

            manager.reality.changeEvent.addEventListener(({current})=>{
                const viewer = manager.provider.reality.getViewerByURI(current!)!;
                const details = layer.details;
                const uri = viewer.uri;
                details.set('uri', uri);
                details.set('title', 'Reality: ' + (viewer.session && viewer.session.info.title) || getHost(uri));
                layer.webView = this.realityWebviews.get(uri);
                layer.details.set('log', layer.webView && layer.webView.log);
                analytics.updateCurrentRealityUri(uri);

                if (current === Argon.RealityViewer.LIVE) {
                    vuforia.configureVuforiaSurface();
                }

                var sessionPromise = new Promise<Argon.SessionPort>((resolve, reject) => {
                    if (viewer.session && !viewer.session.isClosed) {
                        resolve(viewer.session);
                    } else {
                        let remove = viewer.connectEvent.addEventListener((session)=>{
                            resolve(session);
                            remove();
                        })
                    }
                });

                sessionPromise.then((session:Argon.SessionPort)=>{
                    if (current === manager.reality.current) {
                        if (session.info.title) details.set('title', 'Reality: ' + session.info.title);
                        layer.session = session;
                    }
                });
            });
        });

        this.realityLayer = layer;
    }

    addLayer() : Layer {
        const layer:Layer = this._createLayer();
        
        const webView = layer.webView!;

        webView.on('propertyChange', (eventData:PropertyChangeData) => {
            switch(eventData.propertyName) {
                case 'url':
                    layer.details.set('uri', eventData.value);
                    break;
                case 'title':
                    const title = webView.title || getHost(webView.url);
                    bookmarks.updateTitle(webView.url, title);
                    layer.details.set('title', title);
                    break;
                case 'isArgonApp':
                    const isArgonApp = eventData.value;
                    if (isArgonApp || layer === this.focussedLayer || this._overviewEnabled) {
                        layer.containerView.animate({
                            opacity: 1,
                            duration: OVERVIEW_ANIMATION_DURATION
                        });
                    } else {
                        layer.containerView.opacity = 1;
                    }
                    analytics.updateArgonAppCount(this._countArgonApps());
                    break;
                case 'progress':
                    layer.progressBar.value = eventData.value * 100;
                    break;
                default: break;
            }
        });

        webView.on(WebView.loadStartedEvent, (eventData: LoadEventData) => {
            layer.progressBar.value = 0;
            layer.progressBar.visibility = Visibility.visible;
        });
        
        webView.on(WebView.loadFinishedEvent, (eventData: LoadEventData) => {
            this._checkWebViewVersion(webView);
            if (!eventData.error && webView !== this.realityLayer.webView) {
                bookmarks.pushToHistory(eventData.url, webView.title);
            }
            layer.progressBar.value = 100;
            // wait a moment before hiding the progress bar
            setTimeout(function() {
                layer.progressBar.visibility = Visibility.collapse;
            }, 30);
        });
        
        webView.on('session', (e)=>{
            const session = e.session;
            layer.session = session;
            appViewModel.set('currentPermissionSession', session);
            session.connectEvent.addEventListener(()=>{
                if (this.focussedLayer && webView === this.focussedLayer.webView) {
                    appViewModel.argon.provider.focus.session = session;
                    appViewModel.argon.provider.visibility.set(session, true);
                }
                if (layer === this.realityLayer) {
                    if (session.info.role !== Argon.Role.REALITY_VIEW) {
                        session.close();
                        alert("Only a reality can be loaded in the reality layer");
                    }
                } else {
                    if (session.info.role == Argon.Role.REALITY_VIEW) {
                        session.close();
                        alert("A reality can only be loaded in the reality layer");
                    }
                }
            })
            session.closeEvent.addEventListener(()=>{
                if (layer.session) appViewModel.argon.provider.reality.removeInstaller(layer.session);
                layer.session = undefined;
            })
        });

        layer.details.set('log', webView.log);
        
        if (this.isLoaded)
            this.setFocussedLayer(layer);
        
        if (this._overviewEnabled) this._showLayerInCarousel(layer);
        
        return layer;
    }

    private _createLayer() {
        const contentView = new GridLayout();
        contentView.horizontalAlignment = 'stretch';
        contentView.verticalAlignment = 'stretch';

        const containerView = new GridLayout();
        containerView.horizontalAlignment = 'left';
        containerView.verticalAlignment = 'top';

        // Cover the webview to detect gestures and disable interaction
        const touchOverlay = new GridLayout();
        touchOverlay.style.visibility = 'collapsed';
        touchOverlay.horizontalAlignment = 'stretch';
        touchOverlay.verticalAlignment = 'stretch';
        touchOverlay.on(GestureTypes.tap, (event) => {
            this.setFocussedLayer(layer);
            appViewModel.hideOverview();
        });
        
        const titleBar = new GridLayout();
        titleBar.addRow(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.addColumn(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.addColumn(new ItemSpec(1, 'star'));
        titleBar.addColumn(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.verticalAlignment = VerticalAlignment.top;
        titleBar.horizontalAlignment = HorizontalAlignment.stretch;
        titleBar.backgroundColor = new Color(240, 255, 255, 255);
        titleBar.visibility = Visibility.collapse;
        titleBar.opacity = 0;
        
        const closeButton = new Button();
        closeButton.horizontalAlignment = HorizontalAlignment.stretch;
        closeButton.verticalAlignment = VerticalAlignment.stretch;
        closeButton.text = 'close';
        closeButton.className = 'material-icon';
        closeButton.style.fontSize = application.android ? 16 : 22;
        closeButton.color = new Color('black');
        GridLayout.setRow(closeButton, 0);
        GridLayout.setColumn(closeButton, 0);
        
        closeButton.on('tap', ()=>{
            this.removeLayer(layer);
        });
        
        const titleLabel = new Label();
        titleLabel.horizontalAlignment = HorizontalAlignment.stretch;
        titleLabel.verticalAlignment = application.android ? VerticalAlignment.center : VerticalAlignment.stretch;
        titleLabel.textAlignment = TextAlignment.center;
        titleLabel.color = new Color('black');
        titleLabel.fontSize = 14;
        GridLayout.setRow(titleLabel, 0);
        GridLayout.setColumn(titleLabel, 1);
        
        titleBar.addChild(closeButton);
        titleBar.addChild(titleLabel);
        
        containerView.addChild(contentView);
        containerView.addChild(touchOverlay);
        containerView.addChild(titleBar);
        this.layerContainer.addChild(containerView);

        const webView = new ArgonWebView;
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        contentView.addChild(webView);

        var progress = new Progress();
        progress.verticalAlignment = VerticalAlignment.top;
        progress.maxValue = 100;
        progress.height = 5;
        progress.visibility = Visibility.collapse;
        contentView.addChild(progress);
        
        var layer = {
            containerView,
            webView,
            contentView,
            touchOverlay,
            titleBar,
            closeButton,
            titleLabel,
            visualIndex: this.layers.length,
            details: new LayerDetails(),
            progressBar: progress
        };
        
        this.layers.push(layer);

        layer.titleLabel.bind({
            sourceProperty: 'title',
            targetProperty: 'text'
        }, layer.details);

        return layer;
    }
    
    removeLayerAtIndex(index:number) {
        const layer = this.layers[index];
        if (typeof layer === 'undefined') 
            throw new Error('Expected layer at index ' + index);
        layer.webView && layer.webView.session && layer.webView.session.close();
        this.layers.splice(index, 1);
        this.layerContainer.removeChild(layer.containerView); // for now
    }
    
    removeLayer(layer:Layer) {
        const index = this.layers.indexOf(layer);
        this.removeLayerAtIndex(index);
    }
    
    onLoaded() {
        super.onLoaded();
        if (this.android) {
            this.android.addOnLayoutChangeListener(new android.view.View.OnLayoutChangeListener({
                onLayoutChange(v: android.view.View, left: number, top: number, right: number, bottom: number, oldLeft: number, oldTop: number, oldRight: number, oldBottom: number): void {
                    var eventData: observableModule.EventData = {
                        eventName: "customLayoutChange",
                        object: androidLayoutObservable
                    }
                    androidLayoutObservable.notify(eventData);
                }
            }));
            androidLayoutObservable.on("customLayoutChange", ()=>{
                this.androidOnLayout();
            })
        }
    }
    
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        const width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
        const height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
        
        if (!this._overviewEnabled) {
            this.layerContainer.width = width;
            this.layerContainer.height = height;
        }
        
        this.layers.forEach((layer)=>{
            layer.containerView.width = width;
            layer.containerView.height = height;
        });

        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
    }

    androidOnLayout() {
        const width = this.getActualSize().width;
        const height = this.getActualSize().height;

        if (!this._overviewEnabled) {
            this.layerContainer.width = width;
            this.layerContainer.height = height;
        }
        
        this.layers.forEach((layer)=>{
            layer.containerView.width = width;
            layer.containerView.height = height;
        });
    }

    private _checkWebViewVersion(webView:ArgonWebView) {
        if (this._checkedVersion) {
            return;
        }
        if (applicationSettings.hasKey(IGNORE_WEBVIEW_UPGRADE_KEY)) {
            this._checkedVersion = true;
            return;
        }
        if (webView.android) {
            const version = (<any>webView).getWebViewVersion();
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
                        const intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                        intent.setData(android.net.Uri.parse("market://details?id=com.google.android.webview"));
                        application.android.startActivity.startActivity(intent);
                    } else if (result === undefined) {
                        console.log("upgrade never");
                        applicationSettings.setBoolean(IGNORE_WEBVIEW_UPGRADE_KEY, true);
                    } else if (result === false) {
                        console.log("upgrade later");
                    }
                });
            }
            this._checkedVersion = true;
        }
    }
    
    private _calculateTargetTransform(index:number) {
        const layerPosition = index * OVERVIEW_VERTICAL_PADDING - this.scrollView.verticalOffset;
        const normalizedPosition = layerPosition / this.getMeasuredHeight();
        const theta = Math.min(Math.max(normalizedPosition, 0), 0.85) * Math.PI;
        const scaleFactor = 1 - (Math.cos(theta) / 2 + 0.5) * 0.25;
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
    }
    
    private _lastTime = Date.now();
    private _animate() {
        if (!this._overviewEnabled)
            return;
            
        const now = Date.now();
        const deltaT = Math.min(now - this._lastTime, 30) / 1000;
        this._lastTime = now;
        
        //const width = this.getMeasuredWidth();
        //const height = this.getMeasuredHeight();
        const width = this.getActualSize().width;
        const height = this.getActualSize().height;
        
        const containerHeight = height + OVERVIEW_VERTICAL_PADDING * (this.layers.length-1);
        this.layerContainer.width = width;
        this.layerContainer.height = containerHeight;
        
        this.layers.forEach((layer, index) => {
            layer.visualIndex = this._lerp(layer.visualIndex, index, deltaT*4);
            const transform = this._calculateTargetTransform(layer.visualIndex);
            layer.containerView.scaleX = transform.scale.x;
            layer.containerView.scaleY = transform.scale.y;
            layer.containerView.translateX = transform.translate.x;
            layer.containerView.translateY = transform.translate.y;
        });
    }
    
    private _lerp(a,b,t) {
        return a + (b-a)*t
    }
    
    private _showLayerInCarousel(layer:Layer) {
        const idx = this.layers.indexOf(layer);

        if (layer.containerView.ios) {
            layer.containerView.ios.layer.masksToBounds = true;
        } else if (layer.containerView.android) {
            layer.containerView.android.setClipChildren(true);
        }

        if (layer.contentView.ios) {
            layer.contentView.ios.layer.masksToBounds = true;
        } else if (layer.contentView.android) {
            layer.contentView.android.setClipChildren(true);
        }

        if (layer.webView && layer.webView.ios) {
            layer.webView.ios.layer.masksToBounds = true;
        } else if (layer.webView && layer.webView.android) {
            layer.webView.android.setClipChildren(true);
        }
            
        layer.touchOverlay.style.visibility = 'visible';

        if (layer.session) {
            appViewModel.argon.provider.visibility.set(layer.session, true);
        }

        // For transparent webviews, add a little bit of opacity
        layer.containerView.isUserInteractionEnabled = true;
        layer.containerView.animate({
            opacity: 1,
            backgroundColor: new Color(128, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.contentView.animate({
            translate: {x:0,y:TITLE_BAR_HEIGHT},
            duration: OVERVIEW_ANIMATION_DURATION
        })

        // Show titlebars
        layer.titleBar.visibility = Visibility.visible;
        layer.titleBar.animate({
            opacity: 1,
            duration: OVERVIEW_ANIMATION_DURATION
        })

        // Update for the first time & animate.
        const {translate, scale} = this._calculateTargetTransform(idx);
        layer.containerView.animate({
            translate,
            scale,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: AnimationCurve.easeInOut,
        });
    }

    private _layerBackgroundColor = new Color(0, 255, 255, 255);
    
    private _showLayerInStack(layer:Layer) {
        const idx = this.layers.indexOf(layer);
        
        layer.touchOverlay.style.visibility = 'collapsed';

        if (application.ios) {
            // todo: this is causing issues on android, investigate further
            layer.containerView.isUserInteractionEnabled = this.focussedLayer === layer;
        }

        const visible  = this.realityLayer === layer || 
            (layer.webView && layer.webView.isArgonApp) || 
            this.focussedLayer === layer;

        if (layer.session) {
            appViewModel.argon.provider.visibility.set(layer.session, visible);
        }

        layer.containerView.animate({
            opacity: visible ? 1 : 0,
            backgroundColor: this._layerBackgroundColor,
            duration: OVERVIEW_ANIMATION_DURATION,
        });

        layer.contentView && layer.contentView.animate({
            translate: {x:0,y:0},
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(()=>{
            if (layer.containerView.ios) {
                layer.containerView.ios.layer.masksToBounds = false;
            } else if (layer.containerView.android) {
                layer.containerView.android.setClipChildren(false);
            }

            if (layer.contentView.ios) {
                layer.contentView.ios.layer.masksToBounds = false;
            } else if (layer.contentView.android) {
                layer.contentView.android.setClipChildren(false);
            }

            if (layer.webView && layer.webView.ios) {
                layer.webView.ios.layer.masksToBounds = false;
            } else if (layer.webView && layer.webView.android) {
                layer.webView.android.setClipChildren(false);
            }
        });

        // Hide titlebars
        layer.titleBar.animate({
            opacity: 0,
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(()=>{
            layer.titleBar.visibility = Visibility.collapse;
        })

        // Update for the first time & animate.
        layer.visualIndex = idx;
        return layer.containerView.animate({
            translate: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: AnimationCurve.easeInOut,
        })
    }

    private _showOverview() {
        if (this._overviewEnabled) return;
        this._overviewEnabled = true;
        this.layers.forEach((layer) => {
            this._showLayerInCarousel(layer);
        });
        
        this.scrollView.scrollToVerticalOffset(0, true);
        
        // animate the views
        this._intervalId = setInterval(this._animate.bind(this), 20);
    }

    private _hideOverview() {
        if (!this._overviewEnabled) return;
        this._overviewEnabled = false;
        
        var animations = this.layers.map((layer) => {
            return this._showLayerInStack(layer)
        });
        Promise.all(animations).then(() => {
            this.scrollView.scrollToVerticalOffset(0, true);
            setTimeout(()=>{
                this.scrollView.scrollToVerticalOffset(0, false);
            }, 30);
        });
        
        this.scrollView.scrollToVerticalOffset(0, true);
        
        // stop animating the views
        if (this._intervalId) clearInterval(this._intervalId);
        this._intervalId = undefined;
    }

    private _countArgonApps() {
        var count = 0;
        this.layers.forEach((layer) => {
            if (layer.webView && layer.webView.isArgonApp) count++;
        });
        return count;
    }

    public loadUrl(url:string) {
        if (!this.focussedLayer) this.setFocussedLayer(this.layers[this.layers.length-1]);
        if (this.focussedLayer && this.focussedLayer !== this.realityLayer) {
            this.focussedLayer.details.set('uri',url);
            this.focussedLayer.details.set('title', getHost(url));
            this.focussedLayer.details.set('isFavorite',false);
        }

        if (this.focussedLayer && this.focussedLayer.webView) {
            if (this.focussedLayer.webView.getCurrentUrl() === url) {
                this.focussedLayer.webView.reload();
            } else {
                if (this.focussedLayer.webView.src === url) {
                    // webView.src does not update when the user clicks a link on a webpage
                    // clear the src property to force a property update (note that notifyPropertyChange doesn't work here)
                    this.focussedLayer.webView.src = "";
                    this.focussedLayer.webView.src = url;
                } else {
                    this.focussedLayer.webView.src = url;
                }
            }
        }
    }

    public setFocussedLayer(layer:Layer) {
        if (this._focussedLayer !== layer) {
            const previousFocussedLayer = this._focussedLayer;
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            console.log("Set focussed layer: " + layer.details.uri || "New Channel");

            appViewModel.argon.provider.focus.session = layer.session;
            if (layer.session) appViewModel.argon.provider.visibility.set(layer.session, true);
            
            appViewModel.setLayerDetails(layer.details);
            appViewModel.hideOverview();

            if (layer !== this.realityLayer) {
                this.layers.splice(this.layers.indexOf(layer), 1);
                this.layers.push(layer);
                bringToFront(layer.containerView);
            }

            if (previousFocussedLayer) this._showLayerInStack(previousFocussedLayer);
        }
        
        appViewModel.set('currentPermissionSession', layer.session);
    }

    get focussedLayer() {
        return this._focussedLayer;
    }
}


function getHost(uri?:string) {
    return uri ? URI.parse(uri).hostname : '';
}