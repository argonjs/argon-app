import {View} from 'ui/core/view';
import {ScrollView} from 'ui/scroll-view'
import {Page} from 'ui/page';
import {Color} from 'color';
import {Layout} from 'ui/layouts/layout';
import {AbsoluteLayout} from 'ui/layouts/absolute-layout';
import {GridLayout, ItemSpec} from 'ui/layouts/grid-layout';
import {StackLayout} from 'ui/layouts/stack-layout';
import {Label} from 'ui/label';
import {Button} from 'ui/button';
import {ArgonWebView} from 'argon-web-view';
import {WebView, LoadEventData} from 'ui/web-view'
import {
    AnimationCurve, 
    VerticalAlignment, 
    HorizontalAlignment, 
    Orientation, 
    TextAlignment,
    Visibility
} from 'ui/enums';
import {
  GestureTypes,
  GestureStateTypes,
  PanGestureEventData,
  PinchGestureEventData,
  GestureEventData,
} from 'ui/gestures';
import {Util} from './common/util';
import {PropertyChangeData} from 'data/observable'
import {Placeholder, CreateViewEventData} from 'ui/placeholder'
import {Observable} from 'data/observable';
import * as vuforia from 'nativescript-vuforia';
import * as fs from 'file-system';
import * as frames from 'ui/frame';
import * as application from 'application';
import * as utils from 'utils/utils';

import {appViewModel, LayerDetails} from './common/AppViewModel'
import * as bookmarks from './common/bookmarks'

import * as Argon from '@argonjs/argon'

const TITLE_BAR_HEIGHT = 30;
const OVERVIEW_VERTICAL_PADDING = 150;
const OVERVIEW_ANIMATION_DURATION = 250;

export interface Layer {
    webView:ArgonWebView,
    container:GridLayout,
    touchOverlay:GridLayout,
    titleBar:GridLayout,
    closeButton:Button,
    titleLabel: Label,
    visualIndex: number,
    details: LayerDetails
}

export class BrowserView extends GridLayout {
    realityLayer:Layer;
    
    videoView:View = vuforia.videoView;
    scrollView = new ScrollView;
    layerContainer = new GridLayout;
    layers:Layer[] = [];
        
    private _focussedLayer:Layer;
    private _overviewEnabled = false;
    private _scrollOffset = 0;
    private _panStartOffset = 0;
    
    private _intervalId?:number;

    constructor() {
        super();
        this.realityLayer = this.addLayer();
        if (vuforia.api) {
            this.realityLayer.webView.style.visibility = 'collapsed';
        }
        this.realityLayer.titleBar.backgroundColor = new Color(0xFF222222);
        this.realityLayer.titleLabel.color = new Color('white');
        this.realityLayer.closeButton.visibility = 'collapsed';
        
        if (this.realityLayer.webView.ios) {
            // disable user navigation of the reality view
            (this.realityLayer.webView.ios as WKWebView).allowsBackForwardNavigationGestures = false;
        }
        
        this.videoView.horizontalAlignment = 'stretch';
        this.videoView.verticalAlignment = 'stretch';
        if (this.videoView.parent) this.videoView.parent._removeView(this.videoView)
        const videoViewLayout = new AbsoluteLayout();
        videoViewLayout.addChild(this.videoView);
        this.realityLayer.container.addChild(videoViewLayout);

        Util.bringToFront(this.realityLayer.webView);
        Util.bringToFront(this.realityLayer.touchOverlay);
        Util.bringToFront(this.realityLayer.titleBar);
        
        this.layerContainer.horizontalAlignment = 'stretch';
        this.layerContainer.verticalAlignment = 'stretch';
        if (this.layerContainer.ios) {
            this.layerContainer.ios.layer.masksToBounds = false;
        }
        
        this.scrollView.horizontalAlignment = 'stretch';
        this.scrollView.verticalAlignment = 'stretch';
        this.scrollView.content = this.layerContainer;
        if (this.scrollView.ios) {
            this.scrollView.ios.layer.masksToBounds = false;
        }
        this.addChild(this.scrollView);
        this.backgroundColor = new Color("#555");
        
        this.scrollView.on(ScrollView.scrollEvent, this._animate.bind(this));
        
        // Make a new layer to be used with the url bar.
        this.addLayer();
        
        application.on(application.orientationChangedEvent, ()=>{
            this.requestLayout();
            this.scrollView.scrollToVerticalOffset(0, false);
        })
        
        appViewModel.ready.then(()=>{
            appViewModel.manager.reality.changeEvent.addEventListener(({current})=>{
                // const realityListItem = bookmarks.realityMap.get(current.uri);
                const details = this.realityLayer.details;
                details.set('title', 'Reality: ' + current.title);
                details.set('uri', current.uri);
                details.set('supportedInteractionModes', ['page','immersive']);
                if (current === bookmarks.LIVE_VIDEO_REALITY) {
                    this.realityLayer.webView.visibility = 'collapse';
                } else {
                    this.realityLayer.webView.visibility = 'visible';
                }
            })
        })

        // enable pinch-zoom
        this.layerContainer.on(GestureTypes.pinch, this._handlePinch, this);
    }

    addLayer() {
        let layer:Layer;
        
        const container = new GridLayout();
        container.horizontalAlignment = 'left';
        container.verticalAlignment = 'top';
        
        const webView = new ArgonWebView;
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';

        webView.on('propertyChange', (eventData:PropertyChangeData) => {
            switch(eventData.propertyName) {
                case 'url':
                    layer.details.set('uri', eventData.value);
                    break;
                case 'title':
                    var historyBookmarkItem = bookmarks.historyMap.get(webView.url);
                    if (historyBookmarkItem) {
                        historyBookmarkItem.set('title', eventData.value);
                    }
                    if (layer !== this.realityLayer)
                        layer.details.set('title', eventData.value);
                    break;
                case 'isArgonApp':
                    const isArgonApp = eventData.value;
                    layer.details.set('supportedInteractionModes', isArgonApp ? 
                        ['page', 'immersive'] :
                        ['page']
                    );
                    if (isArgonApp || layer === this.focussedLayer || this._overviewEnabled) {
                        layer.container.animate({
                            opacity: 1,
                            duration: OVERVIEW_ANIMATION_DURATION
                        });
                    } else {
                        layer.container.opacity = 1;
                    }
                    break;
                default: break;
            }
        });
        
        webView.on(WebView.loadFinishedEvent, (eventData: LoadEventData) => {
            if (!eventData.error && webView !== this.realityLayer.webView) {
                const historyBookmarkItem = bookmarks.historyMap.get(eventData.url);
                if (historyBookmarkItem) {
                    let i = bookmarks.historyList.indexOf(historyBookmarkItem);
                    bookmarks.historyList.splice(i, 1);
                    bookmarks.historyList.unshift(historyBookmarkItem);
                } else {
                    bookmarks.historyList.unshift(new bookmarks.BookmarkItem({
                        uri: eventData.url,
                        title: webView.title
                    }))
                }
            }

            if (this.focussedLayer.webView === webView) {
                const session = webView.session;
                const gestureObservers = this.layerContainer.getGestureObservers(GestureTypes.pinch);
                if (!session || (session && session.info['app.disablePinchZoom'])) {
                    this.layerContainer.off(GestureTypes.pinch);
                } else if ( !gestureObservers || (gestureObservers && gestureObservers.length === 0)) {
                    this.layerContainer.on(GestureTypes.pinch, this._handlePinch, this);
                }
            }
        });
        
        webView.on('session', (e)=>{
            const session = e.session;
            session.connectEvent.addEventListener(()=>{
                if (webView === this.focussedLayer.webView) {
                    Argon.ArgonSystem.instance!.focus.setSession(session);
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
        })
        
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
        closeButton.style.fontSize = 22;
        closeButton.color = new Color('black');
        GridLayout.setRow(closeButton, 0);
        GridLayout.setColumn(closeButton, 0);
        
        closeButton.on('tap', ()=>{
            this.removeLayer(layer);
        })
        
        const titleLabel = new Label();
        titleLabel.horizontalAlignment = HorizontalAlignment.stretch;
        titleLabel.verticalAlignment = VerticalAlignment.stretch;
        titleLabel.textAlignment = TextAlignment.center;
        titleLabel.color = new Color('black');
        titleLabel.fontSize = 14;
        GridLayout.setRow(titleLabel, 0);
        GridLayout.setColumn(titleLabel, 1);
        
        titleBar.addChild(closeButton);
        titleBar.addChild(titleLabel);
        
        container.addChild(webView);
        container.addChild(touchOverlay);
        container.addChild(titleBar);
        this.layerContainer.addChild(container);
        
        layer = {
            container,
            webView,
            touchOverlay,
            titleBar,
            closeButton,
            titleLabel,
            visualIndex: this.layers.length,
            details: new LayerDetails(webView)
        };
        this.layers.push(layer);
        
        if (this.isLoaded)
            this.setFocussedLayer(layer);

        titleLabel.bind({
            sourceProperty: 'title',
            targetProperty: 'text'
        }, layer.details);
        
        if (this._overviewEnabled) this._showLayerInCarousel(layer);
        
        return layer;
    }
    
    removeLayerAtIndex(index:number) {
        const layer = this.layers[index];
        if (typeof layer === 'undefined') 
            throw new Error('Expected layer at index ' + index);
        this.layers.splice(index, 1);
        this.layerContainer.removeChild(layer.container); // for now
    }
    
    removeLayer(layer:Layer) {
        const index = this.layers.indexOf(layer);
        this.removeLayerAtIndex(index);
    }
    
    onLoaded() {
        super.onLoaded();
    }
    
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        const width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
        const height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
        
        if (!this._overviewEnabled) {
            this.layerContainer.width = width;
            this.layerContainer.height = height;
        }
        
        this.layers.forEach((layer)=>{
            layer.container.width = width;
            layer.container.height = height;
        });
        
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
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
        
        const width = this.getMeasuredWidth();
        const height = this.getMeasuredHeight();
        
        const containerHeight = height + OVERVIEW_VERTICAL_PADDING * (this.layers.length-1);
        this.layerContainer.width = width;
        this.layerContainer.height = containerHeight;
        
        this.layers.forEach((layer, index) => {
            layer.visualIndex = this._lerp(layer.visualIndex, index, deltaT*4);
            const transform = this._calculateTargetTransform(layer.visualIndex);
            layer.container.scaleX = transform.scale.x;
            layer.container.scaleY = transform.scale.y;
            layer.container.translateX = transform.translate.x;
            layer.container.translateY = transform.translate.y;
        });
    }
    
    private _lerp(a,b,t) {
        return a + (b-a)*t
    }
    
    private _showLayerInCarousel(layer:Layer) {
        const idx = this.layers.indexOf(layer);
        
        if (layer.webView.ios)
            layer.webView.ios.layer.masksToBounds = true;

        if (layer.container.ios)
            layer.container.ios.layer.masksToBounds = true;
            
        layer.touchOverlay.style.visibility = 'visible';

        // For transparent webviews, add a little bit of opacity
        layer.container.isUserInteractionEnabled = true;
        layer.container.animate({
            opacity: 1,
            backgroundColor: new Color(128, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.webView.animate({
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
        layer.container.animate({
            translate,
            scale,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: AnimationCurve.easeInOut,
        });
    }
    
    private _showLayerInStack(layer:Layer) {
        const idx = this.layers.indexOf(layer);
        
        layer.touchOverlay.style.visibility = 'collapsed';

        // For transparent webviews, add a little bit of opacity
        layer.container.isUserInteractionEnabled = this.focussedLayer === layer;
        layer.container.animate({
            opacity: this.realityLayer === layer || layer.webView.isArgonApp || this.focussedLayer === layer ? 1 : 0,
            backgroundColor: new Color(0, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.webView.animate({
            translate: {x:0,y:0},
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(()=>{
            if (layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = false;
            if (layer.container.ios)
                layer.container.ios.layer.masksToBounds = false;
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
        return layer.container.animate({
            translate: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: AnimationCurve.easeInOut,
        })
    }

    showOverview() {
        if (this._overviewEnabled) return;
        this._overviewEnabled = true;
        this.layers.forEach((layer) => {
            this._showLayerInCarousel(layer);
        });
        
        this.scrollView.scrollToVerticalOffset(0, true);
        
        // animate the views
        this._intervalId = setInterval(this._animate.bind(this), 20);

        // disable pinch-zoom
        this.layerContainer.off(GestureTypes.pinch, this._handlePinch, this);
    }

    hideOverview() {
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

        // enable pinch-zoom
        this.layerContainer.on(GestureTypes.pinch, this._handlePinch, this);
    }

    private _pinchStartFov?:number;
    
    private _handlePinch(event: PinchGestureEventData) {
        const manager = Argon.ArgonSystem.instance!;
        switch (event.state) {
            case GestureStateTypes.began: 
                const state = manager.context.serializedFrameState
                if (state) {
                    this._pinchStartFov = state.view.subviews[0].frustum.fov;
                } else {
                    this._pinchStartFov = undefined;
                }
                if (this._pinchStartFov === undefined) return;
                manager.device.zoom({
                    zoom: 1, 
                    fov: this._pinchStartFov,
                    state: Argon.ZoomState.START
                })
                break;
            case GestureStateTypes.changed: 
                if (this._pinchStartFov === undefined) return;
                manager.device.zoom({
                    zoom: event.scale, 
                    fov: this._pinchStartFov,
                    state: Argon.ZoomState.CHANGE
                })
                break;
            default:
                if (this._pinchStartFov === undefined) return;
                manager.device.zoom({
                    zoom: event.scale, 
                    fov: this._pinchStartFov,
                    state: Argon.ZoomState.END
                })
                break;  
        }
    }

    public loadUrl(url:string) {
        if (this.focussedLayer !== this.realityLayer) {
            this.focussedLayer.details.set('uri',url);
            this.focussedLayer.details.set('title','');
            this.focussedLayer.details.set('isFavorite',false);
            this.focussedLayer.details.set('supportedInteractionModes',['page', 'immersive']);
        }
        if (this.focussedLayer.webView.src === url) this.focussedLayer.webView.reload();
        else this.focussedLayer.webView.src = url;
    }

    public setFocussedLayer(layer:Layer) {
        if (this._focussedLayer !== layer) {
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            console.log("Set focussed layer: " + layer.details.uri || "New Channel");

            const session = layer.webView.session;
            Argon.ArgonSystem.instance!.focus.setSession(session);
            appViewModel.setLayerDetails(this.focussedLayer.details);
            appViewModel.hideOverview();
            if (layer !== this.realityLayer) {
                this.layers.splice(this.layers.indexOf(layer), 1);
                this.layers.push(layer);
                Util.bringToFront(layer.container);
            }
        }
    }

    get focussedLayer() {
        return this._focussedLayer;
    }
}
