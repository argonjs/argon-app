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
import {Util} from './util';
import * as vuforia from 'nativescript-vuforia';
import * as Argon from 'argon';
import * as fs from 'file-system';

const OVERVIEW_ANIMATION_DURATION = 250;
const DEFAULT_REALITY_HTML = "default-reality.html";
const APP_FOLDER = fs.knownFolders.currentApp().path;
const DEFAULT_REALITY_PATH = fs.path.join(APP_FOLDER, DEFAULT_REALITY_HTML);

export class BrowserView extends GridLayout {
    realityLayer:ArgonWebView;

    private videoViewController:VuforiaVideoViewController;
    private _url:string;
    private _focussedLayer:ArgonWebView;
    private inOverview: boolean;

    private overview: {
      active: boolean,
      animating: boolean,
      cleanup: Array<() => void>,
    };

    private zHeap: Array<number>;

    constructor() {
        super();
        const realityHtml = fs.File.fromPath(DEFAULT_REALITY_PATH);
        this.zHeap = [];
        this.realityLayer = this.addLayer();
        this.realityLayer.isRealityLayer = true;
        this.realityLayer.src = realityHtml.readTextSync();
        this.backgroundColor = new Color("#555");

        this.overview = {
          active: false,
          animating: false,
          cleanup: [],
        };

        // Make a new layer to be used with the url bar.
        this._setFocussedLayer(this.addLayer());
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
      const factor = 1 + (depth - 1.5) * 0.15;
      return {
        x: factor,
        y: factor,
      };
    };

    private static depths(index: number, max: number): {
      min: number,
      current: number,
      max: number,
    } {
        const initial = (index + 1) / 2 - (max / 2) + 1;
        return {
          min: -2 + initial,
          current: initial,
          max: initial + max / 2,
        };
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
      // Do not start if we're already doing this.
      if (this.overview.animating || this.overview.active) {
        return;
      }
      // Mark us as doing work.
      this.overview.animating = true;
      setTimeout(() => {
        this.overview.animating = false;
      }, OVERVIEW_ANIMATION_DURATION);

      // Mark as active
      this.overview.active = true;
      this.overview.cleanup.push(() => {
        this.overview.active = false;
      });

      // Store depths
      const depths: Array<{
        min: number,
        current: number,
        max: number,
      }> = [];

      // Get all layers
      const layers = this.getLayers();

      // For transparent webviews, add a little bit of opacity
      layers.forEach((layer) => {
        layer.animate({
          backgroundColor: new Color(128, 255, 255, 255),
          duration: OVERVIEW_ANIMATION_DURATION,
        });
      });
      this.overview.cleanup.push(() => {
        layers.forEach((layer) => {
          layer.animate({
            backgroundColor: new Color(0, 255, 255, 255),
            duration: OVERVIEW_ANIMATION_DURATION,
          });
        });
      });

      // Assign individual layers
      for (let i = 0; i < layers.length; i += 1) {
        depths.push(BrowserView.depths(this.zHeap[i], layers.length));
      }

      // Update for the first time & animate.
      for (let i = 0; i < layers.length; i += 1) {
        layers[i].animate({
          translate: BrowserView.overviewOffset(depths[i].current),
          scale: BrowserView.overviewScale(depths[i].current),
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
      const touchHandle = (y: number, action: string, view: View) => {
        // NOTE: relies on layer's internal structure.
        const nextY = y + view.parent.translateY;
        const deltaY = nextY - pastY;
        pastY = nextY;

        if (action === "up" || action === "down") {
          return;
        }

        // "Re-render" all layers
        for (let i = 0; i < layers.length; i += 1) {
          // Calculate new positions
          const depth = depths[i];
          depth.current += deltaY * 0.005;
          if (depth.current > depth.max) {
            depth.current = depth.max;
          } else if (depth.current < depth.min) {
            depth.current = depth.min;
          }

          const layer = layers[i];
          const offset = BrowserView.overviewOffset(depth.current);
          const scale = BrowserView.overviewScale(depth.current);

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
        gestureCover.on(GestureTypes.touch, (event: TouchGestureEventData) => {
          touchHandle(event.getY(), event.action, event.view);
        });
        gestureCover.on(GestureTypes.tap, (event: GestureEventData) => {
          // Get the webview that was tapped
          // NOTE: relies on layer's internal structure.
          const container = <GridLayout> event.view.parent;
          const argonView = <ArgonWebView> container.getChildAt(0);
          this._setFocussedLayer(argonView);
          this.focusAndSyncHeap(i);
          Util.bringToFront(container);
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
      this.on(GestureTypes.touch, (event: TouchGestureEventData) => {
        touchHandle(event.getY(), event.action, event.view);
      });
      this.overview.cleanup.push(() => {
        this.off(GestureTypes.pan);
      });
    }

    hideOverview() {
      // Do not start if we're already doing this.
      if (this.overview.animating || !this.overview.active) {
        return;
      }
      // Mark us as doing work.
      this.overview.animating = true;
      setTimeout(() => {
        this.overview.animating = false;
      }, OVERVIEW_ANIMATION_DURATION);

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
