import {View} from 'ui/core/view';
import {GridLayout} from 'ui/layouts/grid-layout'
import {ArgonWebView} from 'argon-web-view';
import {PropertyChangeData} from 'data/observable'
import * as vuforia from 'nativescript-vuforia';
import * as Argon from 'argon';


export class BrowserView extends GridLayout {
    realityLayer:ArgonWebView;

    private videoViewController:VuforiaVideoViewController;
    private _url:string;
    private _focussedLayer:ArgonWebView;

    constructor() {
        super();
        this.realityLayer = this.addLayer();
        this.realityLayer.isRealityLayer = true;
        this.addLayer();
    }

    addLayer() {
        const layer = new ArgonWebView;
        layer.on('propertyChange', (eventData:PropertyChangeData)=>{
            if (eventData.propertyName === 'url' && layer === this.focussedLayer) {
                this._setURL(eventData.value);
            }
        });
        layer.on('sessionConnect', (eventData)=>{
            const session = eventData.session;
            if (layer === this.focussedLayer) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }
        })
        layer.horizontalAlignment = 'stretch';
        layer.verticalAlignment = 'stretch';

        this.addChild(layer);
        this._setFocussedLayer(layer);
        return layer;
    }

    private getLayers(): Array<ArgonWebView> {
      const layers = [];
      for (let i = 0; i < this.getChildrenCount(); i += 1) {
        const view = this.getChildAt(i);
        if (view instanceof ArgonWebView && !view.isRealityLayer) {
          layers.push(view);
        }
      }
      return layers;
    }

    showOverview() {
      // TODO
    }

    onLoaded() {
        super.onLoaded();
        if (vuforia.ios) {
            const pageUIViewController:UIViewController = this.page.ios;
            const realityLayerUIView:UIView = this.realityLayer.ios;
            this.videoViewController = vuforia.ios.videoViewController;
            pageUIViewController.addChildViewController(this.videoViewController);
            realityLayerUIView.addSubview(this.videoViewController.view);
            realityLayerUIView.sendSubviewToBack(this.videoViewController.view);
        }
    }

    onLayout(left:number, top:number, right:number, bottom:number) {
        super.onLayout(left, top, right, bottom);
        // this.videoViewController.view.setNeedsLayout();
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

    private _setFocussedLayer(layer:ArgonWebView) {
        if (this._focussedLayer !== layer) {
            this._focussedLayer = layer;
            this.notifyPropertyChange('focussedLayer', layer);
            this._setURL(layer.url);
            Argon.ArgonSystem.instance.focus.setSession(layer.session);
        }
    }

    get focussedLayer() {
        return this._focussedLayer;
    }
}
