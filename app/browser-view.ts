import {View} from 'ui/core/view';
import {Color} from 'color';
import {GridLayout} from 'ui/layouts/grid-layout';
import {ArgonWebView} from 'argon-web-view';
import {AnimationCurve} from 'ui/enums';
import {
  GestureTypes,
  GestureStateTypes,
  PanGestureEventData,
  GestureEventData,
} from 'ui/gestures';
import {Util} from './util';
import {PropertyChangeData} from 'data/observable'
import {Placeholder, CreateViewEventData} from 'ui/placeholder'
import * as vuforia from 'nativescript-vuforia';
import * as Argon from 'argon';
import * as fs from 'file-system';

const OVERVIEW_ANIMATION_DURATION = 250;
const DEFAULT_REALITY_HTML = "~/default-reality.html";

export interface Layer {
    webView:ArgonWebView,
    container:GridLayout,
    gestureCover:GridLayout
}

export class BrowserView extends GridLayout {
    realityLayer:Layer;
    videoView:Placeholder;

    layerContainer = new GridLayout;
    layers:Layer[] = [];

    private _url:string;
    private _focussedLayer:Layer;
    private _overviewEnabled = false;
    private _scrollOffset = 0;
    private _panStartOffset = 0;

    constructor() {
        super();
        this.realityLayer = this.addLayer();
        this.realityLayer.webView.src = DEFAULT_REALITY_HTML;
        if (vuforia.ios) {
            this.realityLayer.webView.style.visibility = 'collapsed';
        }
        const videoView = new Placeholder();
        videoView.on(Placeholder.creatingViewEvent, (evt:CreateViewEventData) => {
            evt.view = vuforia.ios || vuforia.android || null;
        })
        videoView.horizontalAlignment = 'stretch';
        videoView.verticalAlignment = 'stretch';
        this.realityLayer.container.addChild(videoView);
        Util.bringToFront(this.realityLayer.webView);
        Util.bringToFront(this.realityLayer.gestureCover);

        this.layerContainer.horizontalAlignment = 'stretch';
        this.layerContainer.verticalAlignment = 'stretch';
        this.addChild(this.layerContainer);
        this.backgroundColor = new Color("#555");
        // Make a new layer to be used with the url bar.
        this._setFocussedLayer(this.addLayer());
    }

    addLayer() {
        let layer;
        // Put things in a grid layout to be able to decorate later.
        const container = new GridLayout();
        container.horizontalAlignment = 'stretch';
        container.verticalAlignment = 'stretch';
        // Not running argon, make white.
        container.backgroundColor = new Color(255, 255, 255, 255);
        // Make an argon-enabled webview
        const webView = new ArgonWebView;
        webView.on('propertyChange', (eventData:PropertyChangeData) => {
            if (eventData.propertyName === 'url' && webView === this.focussedLayer.webView) {
                this._setURL(eventData.value);
            }
        });
        let whiteningTimeout;
        webView.on('sessionConnect', (eventData) => {
            var session = eventData.session;
            if (webView === this.focussedLayer.webView) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }

            // Make transparent
            container.backgroundColor = new Color(0, 255, 255, 255);
            clearTimeout(whiteningTimeout);
        });
        webView.on(ArgonWebView.loadFinishedEvent, () => {
            whiteningTimeout = setTimeout(() => {
                // Not running argon, make white.
                container.backgroundColor = new Color(255, 255, 255, 255);
            }, 500);
        });
        webView.horizontalAlignment = 'stretch';
        webView.verticalAlignment = 'stretch';
        // Cover the webview to detect gestures and disable interaction
        const gestureCover = new GridLayout();
        gestureCover.style.visibility = 'collapsed';
        gestureCover.horizontalAlignment = 'stretch';
        gestureCover.verticalAlignment = 'stretch';
        gestureCover.on(GestureTypes.tap, (event) => {
            this._setFocussedLayer(layer);
            if (layer !== this.realityLayer) {
                this.layers.splice(this.layers.indexOf(layer), 1);
                this.layers.push(layer);
                Util.bringToFront(container);
            }
            this.hideOverview();
        });
        container.addChild(webView);
        container.addChild(gestureCover);
        this.layerContainer.addChild(container);

        layer = {
            container: container,
            webView: webView,
            gestureCover: gestureCover
        };
        this.layers.push(layer);
        this._setFocussedLayer(layer);
        return layer;
    }

    handlePan(evt:PanGestureEventData) {
        if (evt.state === GestureStateTypes.began) {
            this._panStartOffset = this._scrollOffset;
        }
        this._scrollOffset = this._panStartOffset + evt.deltaY;
        this.updateLayerTransforms();
    }

    calculateLayerTransform(index) {
        const layerPosition = index * 200 + this._scrollOffset;
        const normalizedPosition = layerPosition / this.getMeasuredHeight();
        const theta = Math.min(Math.max(normalizedPosition + 0.2, 0), 0.85) * Math.PI;
        const scaleFactor = 1 - (Math.cos(theta) / 2 + 0.5) * 0.2;
        return {
            translate: {
                x: 0,
                y: layerPosition
            },
            scale: {
                x: scaleFactor,
                y: scaleFactor
            }
        };
    }

    updateLayerTransforms() {
        if (!this._overviewEnabled)
            return;
        this.layers.forEach((layer, index) => {
            var transform = this.calculateLayerTransform(index);
            layer.container.scaleX = transform.scale.x;
            layer.container.scaleY = transform.scale.y;
            layer.container.translateX = transform.translate.x;
            layer.container.translateY = transform.translate.y;
        });
    };

    toggleOverview() {
      if (this._overviewEnabled) {
        this.hideOverview();
      } else {
        this.showOverview();
      }
    }

    showOverview() {
        this._overviewEnabled = true;
        this.layers.forEach((layer, index) => {
            if (layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = true;
            layer.gestureCover.style.visibility = 'visible';
            layer.gestureCover.on(GestureTypes.pan, this.handlePan.bind(this));
            // For transparent webviews, add a little bit of opacity
            if (layer.webView.session) {
                layer.container.animate({
                    backgroundColor: new Color(128, 255, 255, 255),
                    duration: OVERVIEW_ANIMATION_DURATION,
                });
            }
            // Update for the first time & animate.
            const {translate, scale} = this.calculateLayerTransform(index);
            layer.container.animate({
                translate,
                scale,
                duration: OVERVIEW_ANIMATION_DURATION,
                curve: AnimationCurve.easeOut,
            });
        });
        // Be able to drag on black
        this.layerContainer.on(GestureTypes.pan, this.handlePan.bind(this));
    }

    hideOverview() {
        this._overviewEnabled = false;
        var animations = this.layers.map((layer, index) => {
            if (layer.webView.ios)
                layer.webView.ios.layer.masksToBounds = false;
            layer.gestureCover.style.visibility = 'collapsed';
            layer.gestureCover.off(GestureTypes.pan);
            // For transparent webviews, add a little bit of opacity
            if (layer.webView.session) {
                layer.container.animate({
                    backgroundColor: new Color(0, 255, 255, 255),
                    duration: OVERVIEW_ANIMATION_DURATION,
                });
            }
            // Update for the first time & animate.
            return layer.container.animate({
                translate: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                duration: OVERVIEW_ANIMATION_DURATION,
                curve: AnimationCurve.easeOut,
            });
        });
        Promise.all(animations).then(() => {
            this._scrollOffset = 0;
        });
        // Be able to drag on black
        this.layerContainer.off(GestureTypes.pan);
    }

    private _setURL(url:string) {
        if (this._url !== url) {
            this._url = url;
            this.notifyPropertyChange('url', url);
        }
    }

    get url() : string {
        return this._url;
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
