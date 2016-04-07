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

    private static overviewOffset(depth: number): {x: number, y: number} {
      return {
        x: 0,
        y: depth > 0 ? depth * depth * 200 : 0,
      };
    };

    private static overviewScale(depth: number): {x: number, y: number} {
      const factor = Math.max(1 + (depth - 1.5) * 0.15, 0);
      return {
        x: factor,
        y: factor,
      };
    };

    toggleOverview() {
      if (this.overview.active) {
        this.hideOverview();
      } else {
        this.showOverview();
      }
    }

    showOverview() {
      // TODO: do not hardcode pixel values, use percents?
      // TODO: include the reality as a selectable view
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
      for (let layer of layers) {
        layer.animate({
          translate: BrowserView.overviewOffset(layer.overviewIndex),
          scale: BrowserView.overviewScale(layer.overviewIndex),
          duration: OVERVIEW_ANIMATION_DURATION,
          curve: AnimationCurve.easeOut,
        });
      }

      // Animation to hide the overview
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

      // Watch for panning, add gesture
      let pastY = 0;
      const gestureCover = new GridLayout();
      gestureCover.horizontalAlignment = 'stretch';
      gestureCover.verticalAlignment = 'stretch';
      this.addChild(gestureCover);

      // Update and render
      gestureCover.on(GestureTypes.pan, (args: PanGestureEventData) => {
        // Check if this is a new touch event
        if (args.deltaY === 0) {
          pastY = 0;
        }
        const deltaY = args.deltaY - pastY;
        pastY = args.deltaY;

        // "Re-render" all layers
        layers.forEach((layer) => {
          // Calculate new positions
          layer.overviewIndex += deltaY * 0.005;
          const offset = BrowserView.overviewOffset(layer.overviewIndex);
          const scale = BrowserView.overviewScale(layer.overviewIndex);

          // Set those positions
          layer.scaleX = scale.x;
          layer.scaleY = scale.y;
          layer.translateX = offset.x;
          layer.translateY = offset.y;
        });
      });

      // remove gesture cover and listeners
      this.overview.cleanup.push(() => {
        gestureCover.off(GestureTypes.pan);
        this.removeChild(gestureCover);
      });
    }

    hideOverview() {
      this.overview.cleanup.forEach((task) => {
        task();
      });
      this.overview.cleanup = [];
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
