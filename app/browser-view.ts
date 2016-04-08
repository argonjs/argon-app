import {View} from 'ui/core/view';
import {Color} from 'color';
import {GridLayout} from 'ui/layouts/grid-layout';
import {ArgonWebView} from 'argon-web-view';
import {PropertyChangeData} from 'data/observable';
import {AnimationCurve} from 'ui/enums';
import {
  GestureTypes,
  TouchGestureEventData,
  GestureEventData,
} from 'ui/gestures';
import * as util from './util';
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

    private zHeap: Array<number>;

    constructor() {
        super();
        this.zHeap = [];
        this.inOverview = false;
        this.realityLayer = this.addLayer();
        this.realityLayer.isRealityLayer = true;
        this.backgroundColor = new Color("#555");

        this.overview = {
          active: false,
          cleanup: [],
        };

        this.realityLayer.url = "http://elixir-lang.org/";
        const layer1 = this.addLayer();
        layer1.url = "http://google.com";
        const layer2 = this.addLayer();
        layer2.url = "http://m.reddit.com";
        const layer3 = this.addLayer();
        layer3.url = "http://rust-lang.org";
    }

    addLayer() {
        // Put things in a grid layout to be able to decorate later.
        const container = new GridLayout();
        container.horizontalAlignment = 'stretch';
        container.verticalAlignment = 'stretch';

        // Make an argon-enabled webview
        const layer = new ArgonWebView;
        layer.on('propertyChange', (eventData:PropertyChangeData) => {
            if (eventData.propertyName === 'url' && layer === this.focussedLayer) {
                this._setURL(eventData.value);
            }
        });
        layer.on('sessionConnect', (eventData) => {
            const session = eventData.session;
            if (layer === this.focussedLayer) {
                Argon.ArgonSystem.instance.focus.setSession(session);
            }
        });
        layer.horizontalAlignment = 'stretch';
        layer.verticalAlignment = 'stretch';

        // Keep track of how z it is
        this.zHeap.push(this.zHeap.length);

        container.addChild(layer);
        this.addChild(container);
        this._setFocussedLayer(layer);
        return layer;
    }

    private focusAndSyncHeap(index: number) {
      const oldDepth = this.zHeap[index];
      for (let i = 0; i < this.zHeap.length; i += 1) {
        if (this.zHeap[i] > oldDepth) {
          this.zHeap[i] -= 1;
        }
      }
      this.zHeap[index] = this.zHeap.length - 1;
    }

    private getLayers(): Array<GridLayout> {
      const layers = [];
      for (let i = 0; i < this.getChildrenCount(); i += 1) {
        const view = this.getChildAt(i);
        if (view instanceof GridLayout) {
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

    private static initialDepth(index: number, max: number): number {
        return ((index + 1) / 2) - (max / 2) + 1;
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

      // Store depths
      const depths = [];

      // Get all layers
      const layers = this.getLayers();

      // Assign individual layers
      for (let i = 0; i < layers.length; i += 1) {
        depths.push(BrowserView.initialDepth(this.zHeap[i], layers.length));
      }

      // Update for the first time & animate.
      for (let i = 0; i < layers.length; i += 1) {
        layers[i].animate({
          translate: BrowserView.overviewOffset(depths[i]),
          scale: BrowserView.overviewScale(depths[i]),
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

      // Update and render
      let pastY = 0;
      const touchHandle = (args: TouchGestureEventData) => {
        // NOTE: relies on layer's internal structure.
        const nextY = args.getY() + args.view.parent.translateY;
        const deltaY = nextY - pastY;
        pastY = nextY;

        if (args.action === "down" || args.action === "up") {
          return;
        }

        // "Re-render" all layers
        for (let i = 0; i < layers.length; i += 1) {
          // Calculate new positions
          depths[i] += deltaY * 0.005;
          const layer = layers[i];
          const offset = BrowserView.overviewOffset(depths[i]);
          const scale = BrowserView.overviewScale(depths[i]);

          // Set those positions
          layer.scaleX = scale.x;
          layer.scaleY = scale.y;
          layer.translateX = offset.x;
          layer.translateY = offset.y;
        };
      };

      // Watch for panning, add gesture
      for (let i = 0; i < layers.length; i += 1) {
        const layer = layers[i];
        // Cover the webview to detect gestures and disable interaction
        const gestureCover = new GridLayout();
        gestureCover.horizontalAlignment = 'stretch';
        gestureCover.verticalAlignment = 'stretch';
        gestureCover.on(GestureTypes.touch, touchHandle);
        gestureCover.on(GestureTypes.tap, (event: GestureEventData) => {
          // Get the webview that was tapped
          // NOTE: relies on layer's internal structure.
          const container = <GridLayout> event.view.parent;
          const argonView = <ArgonWebView> container.getChildAt(0);
          this._setFocussedLayer(argonView);
          this.focusAndSyncHeap(i);
          util.view.bringToFront(container);
          this.hideOverview();
        });
        layer.addChild(gestureCover);

        // remove gesture cover and listeners
        this.overview.cleanup.push(() => {
          gestureCover.off(GestureTypes.touch);
          gestureCover.off(GestureTypes.tap);
          layer.removeChild(gestureCover);
        });
      }

      // Be able to drag on black
      this.on(GestureTypes.touch, touchHandle);
      this.overview.cleanup.push(() => {
        this.off(GestureTypes.pan);
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
