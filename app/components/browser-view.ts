import {View} from 'ui/core/view';
import {ScrollView} from 'ui/scroll-view'
import {Page} from 'ui/page';
import {Color} from 'color';
import {Layout} from 'ui/layouts/layout';
import {GridLayout, ItemSpec} from 'ui/layouts/grid-layout';
import {StackLayout} from 'ui/layouts/stack-layout';
import {Label} from 'ui/label';
import {Button} from 'ui/button';
import {ArgonWebView} from 'argon-web-view';
import {LoadEventData} from 'ui/web-view'
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
  GestureEventData,
} from 'ui/gestures';
import {Util} from '../util';
import {PropertyChangeData} from 'data/observable'
import {Placeholder, CreateViewEventData} from 'ui/placeholder'
import * as vuforia from 'nativescript-vuforia';
import * as Argon from 'argon';
import * as fs from 'file-system';
import * as frames from 'ui/frame';
import * as application from 'application';
import * as utils from 'utils/utils';

import {appViewModel} from './common/AppViewModel'
import {BookmarkItem, historyList, historyMap} from './common/bookmarks'

const TITLE_BAR_HEIGHT = 30;
const OVERVIEW_VERTICAL_PADDING = 150;

const OVERVIEW_ANIMATION_DURATION = 250;
const DEFAULT_REALITY_HTML = "~/default-reality.html";

export interface Layer {
    webView:ArgonWebView,
    container:GridLayout,
    touchOverlay:GridLayout,
    titleBar:GridLayout,
    closeButton:Button,
    label: Label,
    visualIndex: number
}

export class BrowserView extends GridLayout {
    realityLayer:Layer;
    
    videoView:View = vuforia.videoView;
    scrollView = new ScrollView;
    layerContainer = new GridLayout;
    layers:Layer[] = [];
        
    private _url:string;
    private _title:string;
    private _focussedLayer:Layer;
    private _overviewEnabled = false;
    private _scrollOffset = 0;
    private _panStartOffset = 0;
    
    private _intervalId:number;

    constructor() {
        super();
        this.realityLayer = this.addLayer();
        this.realityLayer.webView.src = DEFAULT_REALITY_HTML;
        if (vuforia.api) {
            this.realityLayer.webView.style.visibility = 'collapsed';
        }
        this.realityLayer.titleBar.backgroundColor = new Color(0xFF222222);
        this.realityLayer.label.color = new Color('white');
        this.realityLayer.closeButton.visibility = 'collapsed';
        
        this.videoView.horizontalAlignment = 'stretch';
        this.videoView.verticalAlignment = 'stretch';
        if (this.videoView.parent) this.videoView.parent._removeView(this.videoView)
        this.realityLayer.container.addChild(this.videoView);
        Util.bringToFront(this.realityLayer.webView);
        Util.bringToFront(this.realityLayer.touchOverlay);
        Util.bringToFront(this.realityLayer.titleBar);
        
        this.layerContainer.horizontalAlignment = 'stretch';
        this.layerContainer.verticalAlignment = 'stretch';
        
        this.scrollView.horizontalAlignment = 'stretch';
        this.scrollView.verticalAlignment = 'stretch';
        this.scrollView.content = this.layerContainer;
        this.addChild(this.scrollView);
        this.backgroundColor = new Color("#555");
        
        this.scrollView.on(ScrollView.scrollEvent, this._animate.bind(this));
        
        // Make a new layer to be used with the url bar.
        this._setFocussedLayer(this.addLayer());
        
        application.on(application.orientationChangedEvent, ()=>{
            this.requestLayout();
            this.scrollView.scrollToVerticalOffset(0, false);
        })
    }

    addLayer() {
        let layer:Layer;
        
        // Put things in a grid layout to be able to decorate later.
        const container = new GridLayout();
        container.horizontalAlignment = 'left';
        container.verticalAlignment = 'top';
        
        // Make an argon-enabled webview
        const webView = new ArgonWebView;
        webView.on('propertyChange', (eventData:PropertyChangeData) => {
            if  (webView !== this.focussedLayer.webView) return;
            
            if (eventData.propertyName === 'url') {
                this._setURL(eventData.value);
            }
            else if (eventData.propertyName === 'title') {
                this._title = eventData.value;
                this.notifyPropertyChange('title', this._title);
                var historyBookmarkItem = historyMap.get(webView.url);
                if (historyBookmarkItem) {
                    historyBookmarkItem.set('title', this._title);
                }
            }
        });
        webView.on('sessionConnect', (eventData) => {
            var session = eventData.session;
            if (webView === this.focussedLayer.webView) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }
        });
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        
        
        webView.on("loadFinished", (eventData: LoadEventData) => {
            if (!eventData.error) {
                const historyBookmarkItem = historyMap.get(eventData.url);
                if (historyBookmarkItem) {
                    historyMap.set(eventData.url, undefined);
                    historyList.unshift(historyBookmarkItem);
                } else {
                    historyList.unshift(new BookmarkItem({
                        url: eventData.url,
                        title: webView.title
                    }))
                }
            }
        });
        
        // Cover the webview to detect gestures and disable interaction
        const touchOverlay = new GridLayout();
        touchOverlay.style.visibility = 'collapsed';
        touchOverlay.horizontalAlignment = 'stretch';
        touchOverlay.verticalAlignment = 'stretch';
        touchOverlay.on(GestureTypes.tap, (event) => {
            this._setFocussedLayer(layer);
            if (layer !== this.realityLayer) {
                this.layers.splice(this.layers.indexOf(layer), 1);
                this.layers.push(layer);
                Util.bringToFront(container);
            }
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
        
        const label = new Label();
        label.horizontalAlignment = HorizontalAlignment.stretch;
        label.verticalAlignment = VerticalAlignment.stretch;
        label.textAlignment = TextAlignment.center;
        label.color = new Color('black');
        label.fontSize = 14;
        GridLayout.setRow(label, 0);
        GridLayout.setColumn(label, 1);
        
        titleBar.addChild(closeButton);
        titleBar.addChild(label);
        
        label.bind({
            sourceProperty: 'title',
            targetProperty: 'text'
        }, webView);
        
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
            label,
            visualIndex: this.layers.length
        };
        this.layers.push(layer);
        this._setFocussedLayer(layer);
        
        if (this._overviewEnabled) this._showLayer(layer);
        
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
            // layer.container.layout(0,0,width,height);
            // layer.webView.layout(0,0,width,height);
            // layer.touchOverlay.layout(0,0,width,height);
        });
        
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
    }
    
    onLayout(left, top, right, bottom) {
        super.onLayout(left, top, right, bottom);
        // if (this._overviewEnabled) return;
        
        // var width = this.getMeasuredWidth();
        // var height = this.getMeasuredHeight();
        
        // this.scrollView.layout(0, 0, width, height);
        // this.layerContainer.layout(0, 0, width, height);
        
        // this.layers.forEach((layer)=>{
        //     layer.container.layout(0,0,width,height);
        //     layer.webView.layout(0,0,width,height);
        //     layer.touchOverlay.layout(0,0,width,height);
        // })
        
        // this.videoView.layout(0, 0, width, height);
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

        // this.scrollView.measure(width,height);
        // this.scrollView.layout(0,0,width,height);
        
        this.layers.forEach((layer, index) => {
            layer.visualIndex = this._lerp(layer.visualIndex, index, deltaT*4);
            // layer.container.layout(0,0,width,height);
            // layer.webView.layout(0,0,width,height);
            // layer.touchOverlay.layout(0,0,width,height);
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
    
    private _showLayer(layer:Layer) {
        const idx = this.layers.indexOf(layer);
        
        if (layer.webView.ios)
            layer.webView.ios.layer.masksToBounds = true;
            
        layer.touchOverlay.style.visibility = 'visible';
        // For transparent webviews, add a little bit of opacity
        layer.container.animate({
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
            curve: AnimationCurve.easeOut,
        });
    }
    
    private _hideLayer(layer:Layer) {
        const idx = this.layers.indexOf(layer);
        
        if (layer.webView.ios)
            layer.webView.ios.layer.masksToBounds = false;
        layer.touchOverlay.style.visibility = 'collapsed';
        // For transparent webviews, add a little bit of opacity
        layer.container.animate({
            backgroundColor: new Color(0, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.webView.animate({
            translate: {x:0,y:0},
            duration: OVERVIEW_ANIMATION_DURATION
        })
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
            curve: AnimationCurve.easeOut,
        });
    }

    showOverview() {
        if (this._overviewEnabled) return;
        this._overviewEnabled = true;
        this.layers.forEach((layer) => {
            this._showLayer(layer)
        });
        
        this.scrollView.scrollToVerticalOffset(0, true);
        
        // animate the views
        this._intervalId = setInterval(this._animate.bind(this), 20);
    }

    hideOverview() {
        if (!this._overviewEnabled) return;
        this._overviewEnabled = false;
        
        var animations = this.layers.map((layer) => {
            return this._hideLayer(layer)
        });
        Promise.all(animations).then(() => {
            // this.requestLayout();
            this.scrollView.scrollToVerticalOffset(0, true);
            setTimeout(()=>{
                this.scrollView.scrollToVerticalOffset(0, false);
            }, 30);
        });
        
        this.scrollView.scrollToVerticalOffset(0, true);
        
        // stop animating the views
        clearInterval(this._intervalId);
        this._intervalId = null;
    }

    private _setURL(url:string) {
        if (this._url !== url) {
            this._url = url;
            this._title = '';
            this.notifyPropertyChange('url', url);
            this.notifyPropertyChange('title', this._title);
        }
    }

    get url() : string {
        return this._url;
    }
    
    get title() : string {
        return this._title;
    }
    
    public loadUrl(url:string) {
        this.focussedLayer.webView.src = url;
        this._setURL(url);
    }

    private _setFocussedLayer(layer:Layer) {
        if (this._focussedLayer !== layer) {
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            this._setURL(layer.webView.url);
            console.log("Set focussed layer: " + layer.webView.url);
            Argon.ArgonSystem.instance.focus.setSession(layer.webView.session);
        }
    }

    get focussedLayer() {
        return this._focussedLayer;
    }
}
