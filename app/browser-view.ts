import {View} from 'ui/core/view';
import {Color} from "color";
import {GridLayout} from 'ui/layouts/grid-layout';
import {ArgonWebView} from 'argon-web-view';
import {PropertyChangeData} from 'data/observable';
import {AnimationCurve} from "ui/enums";
import {
  GestureTypes,
  PanGestureEventData,
  GestureEventData,
  TouchGestureEventData,
} from "ui/gestures";
import * as vuforia from 'nativescript-vuforia';
import * as Argon from 'argon';

const OVERVIEW_ANIMATION_DURATION = 250;

export class BrowserView extends GridLayout {
    realityLayer:ArgonWebView;

    private videoViewController:VuforiaVideoViewController;
    private _url:string;
    private _focussedLayer:ArgonWebView;
    private inOverview: boolean;

    private overview: {
      active: boolean,
      cleanup: Array<() => void>,
    };

    constructor() {
        super();
        this.inOverview = false;
        this.realityLayer = this.addLayer();
        this.realityLayer.isRealityLayer = true;
        this.realityLayer.url = "http://elixir-lang.org/";
        this.backgroundColor = new Color("#000");

        this.overview = {
          active: false,
          cleanup: [],
        };


        const layer1 = this.addLayer();
        layer1.url = "http://google.com";
        const layer2 = this.addLayer();
        layer2.url = "http://m.reddit.com";
        const layer3 = this.addLayer();
        layer3.url = "http://rust-lang.org";
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

    toggleOverview() {
      if (this.overview.active) {
        this.hideOverview();
      } else {
        this.showOverview();
      }
    }

    showOverview() {
      // TODO: do not hardcode pixel values, use percents?
      // Mark as active
      this.overview.active = true;
      this.overview.cleanup.push(() => {
        this.overview.active = false;
      });

      // Hide reality (its too white!)
      this.realityLayer.visibility = "collapsed";
      this.overview.cleanup.push(() => {
        setTimeout(() => {
          this.realityLayer.visibility = "visible";
        }, OVERVIEW_ANIMATION_DURATION);
      });

      // Get all layers
      const layers = this.getLayers();

      // Assign individual layers
      for (let i = 0; i < layers.length; i += 1) {
        layers[i].overviewIndex = ((i + 1) / 2) - (layers.length / 2) + 1;
      }

      // Update for the first time & animate.
      BrowserView.updateOverview(layers, OVERVIEW_ANIMATION_DURATION);
      this.overview.cleanup.push(() => {
        layers.forEach((layer) => {
          layer.animate({
            translate: {
              x: 0,
              y: 0,
            },
            scale: {
              x: 1,
              y: 1,
            },
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: AnimationCurve.easeOut,
          });
        });
      });

      // Watch for panning
      let pastY = 0;
      const gestureCover = new GridLayout();
      gestureCover.horizontalAlignment = 'stretch';
      gestureCover.verticalAlignment = 'stretch';
      this.addChild(gestureCover);
      gestureCover.on(GestureTypes.pan, (args: PanGestureEventData) => {
        if (args.deltaY === 0) {
          pastY = 0;
        }
        const deltaY = args.deltaY - pastY;
        pastY = args.deltaY;
        layers.forEach((layer) => {
          layer.overviewIndex += deltaY * 0.005;
        });
        BrowserView.updateOverview(layers, 0);
      });
      // Ability to select view
      gestureCover.on(GestureTypes.touch, (args: TouchGestureEventData) => {
        // TODO
      });
      gestureCover.on(GestureTypes.tap, (args: GestureEventData) => {
        // TODO
      });
      this.overview.cleanup.push(() => {
        gestureCover.off(GestureTypes.pan);
        gestureCover.off(GestureTypes.tap);
        gestureCover.off(GestureTypes.touch);
        this.removeChild(gestureCover);
      });
    }

    hideOverview() {
      this.overview.cleanup.forEach((task) => {
        task();
      });
      this.overview.cleanup = [];
    }

    static updateOverview(layers: Array<ArgonWebView>, duration: number) {
      const y_offset = (depth: number) => {
        return depth > 0 ? depth * depth * 200 : 0;
      };
      const scale = (depth: number) => {
        return Math.max(1 + (depth - 1.5) * 0.15, 0);
      };
      for (let layer of layers) {
        layer.animate({
          translate: {
            x: 0,
            y: y_offset(layer.overviewIndex),
          },
          scale: {
            x: scale(layer.overviewIndex),
            y: scale(layer.overviewIndex),
          },
          duration: duration,
          curve: AnimationCurve.easeOut,
        });
      }
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
