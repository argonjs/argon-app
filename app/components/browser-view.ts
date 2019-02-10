// import { PercentLength } from 'ui/core/view'
import { ScrollView } from 'ui/scroll-view'
import { Color } from 'color'
import { GridLayout } from 'ui/layouts/grid-layout'
import { ObservableArray, ChangeType, ChangedData } from 'data/observable-array'
import { AnimationCurve } from 'ui/enums'
import { PropertyChangeData, EventData } from 'data/observable'
import * as application from 'application'
// import { GestureTypes, PanGestureEventData, GestureStateTypes } from 'ui/gestures'
// import { layout } from 'utils/utils'
// import { screen } from 'platform/platform'

import { appModel, XRLayerDetails } from '../app-model'
import { bind } from '../decorators'
import { bringToFront } from '../utils'

// import {FullscreenLayout} from './fullscreen-layout'
import {LayerView, TITLE_BAR_HEIGHT} from './layer-view'

export {LayerView}

const OVERVIEW_SCALE_FACTOR = 0.85
const OVERVIEW_VERTICAL_PADDING = 150
const OVERVIEW_ANIMATION_DURATION = 300
const OVERVIEW_ANIMATION_CURVE = AnimationCurve.ease

const TRANSLUCENT_BACKGROUND_COLOR = new Color(128, 255, 255, 255)
const TRANSPARENT_BACKGROUND_COLOR = new Color(0, 255, 255, 255)

export interface BrowserView extends GridLayout {    
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);
    on(event: "layerAdded", callback: (args: EventData&{layer:LayerView}) => void, thisArg?: any);
    on(event: "layerDeleted", callback: (args: EventData&{layer:LayerView}) => void, thisArg?: any);
}

export class BrowserView extends GridLayout {

    scrollView = new ScrollView()
    layerContainer = new GridLayout()
    layers = new Array<LayerView>()
    layerMap = new Map<XRLayerDetails, LayerView>()

    private _intervalId?: number

    constructor() {
        super()
        
        // this.scrollView.visibility = 'collapse'
        this.scrollView.content = this.layerContainer;
        this.scrollView.on('loaded', () => {
            this.scrollView.scrollToVerticalOffset(appModel.safeAreaInsets.top, false)
            if (this.scrollView.ios) {
                this.scrollView.ios.scrollEnabled = false;
            }
        })
        this.addChild(this.scrollView);
        // this.scrollView.on(ScrollView.scrollEvent, this._animate.bind(this));

        // this.addChild(this.layerContainer)
        // this.layerContainer.on(GestureTypes.pan, (event:PanGestureEventData) => {
        //     const state = (event.state as GestureStateTypes)
        //     state;
        // })

        if (application.android) {
            var activity = application.android.foregroundActivity;
            activity.onBackPressed = () => {
                const focussedLayer = this.focussedLayer
                if (focussedLayer && focussedLayer.webView && focussedLayer.webView.android.canGoBack()) {
                    focussedLayer.webView.android.goBack();
                }
            }
        }

        appModel.on('propertyChange', (evt: PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'layerPresentation':
                    this._sortLayers()
                    if (appModel.layerPresentation === 'overview') this._onShowOverview()
                    else this._onHideOverview()
                    break;
                case 'layers':
                    if (evt.oldValue) (evt.oldValue as ObservableArray<XRLayerDetails>).off('change', this._onLayerDetailsArrayChange)
                    appModel.layers.on('change', this._onLayerDetailsArrayChange)
                    this.layers.slice().forEach(layer => this._onDeleteLayer(layer.details))
                    appModel.layers.forEach(layer => this._onAddLayer(layer))
                    break;
                case 'realityLayer':
                case 'focussedLayer':
                case 'screenSize': 
                    this._sortLayers()
                    break;
            }
        })

        appModel.layers.on('change', this._onLayerDetailsArrayChange)
        appModel.layers.forEach((layer) => this._onAddLayer(layer))
        this.on('loaded', () => {
            this._sortLayers()
        })
    }

    @bind
    private _onLayerDetailsArrayChange(evt: ChangedData<XRLayerDetails>) {
        switch (evt.action) {
            case ChangeType.Add:
                for (let i = evt.index; i < evt.index + evt.addedCount; i++) {
                    this._onAddLayer(appModel.layers.getItem(i))
                }
                break;

            case ChangeType.Delete:
                for (let i = 0; i < evt.removed.length; i++) {
                    this._onDeleteLayer(evt.removed[i])
                }
                break;

            case ChangeType.Splice:
                for (let i = 0; i < evt.removed.length; i++) {
                    this._onDeleteLayer(evt.removed[i])
                }
                for (let i = evt.index; i < evt.index + evt.addedCount; i++) {
                    this._onAddLayer(appModel.layers.getItem(i))
                }
                break;

            case ChangeType.Update:
                this._onUpdateLayer(evt.removed[0], appModel.layers.getItem(evt.index))
                break;
        }
        
        this._sortLayers()
    }

    private _onAddLayer(details: XRLayerDetails) {
        const layer = new LayerView(details)
        this.layerContainer.addChild(layer)
        this.layerMap.set(details, layer)
        this.layers.push(layer)
        // layer.originY = 0
        layer.verticalAlignment = 'top'

        layer.on('propertyChange', (evt: PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'details.xrImmersiveMode':
                    if (layer === this.focussedLayer && layer.details.xrImmersiveMode === 'reality')  {
                        appModel.realityLayer = layer.details
                    }
                    this._sortLayers()
                    break;
            }
        })

        layer.closeButton.on('tap', () => {
            let foundIndex = appModel.layers.indexOf(layer.details)
            if (foundIndex > -1) appModel.layers.splice(foundIndex, 1)
            if (appModel.layers.length === 0) appModel.layerPresentation = 'stack'
        })

        layer.touchOverlay.on('tap', () => {
            if (layer.details.xrImmersiveMode === 'reality') 
                appModel.realityLayer = layer.details
            appModel.focussedLayer = layer.details
            appModel.layerPresentation = 'stack'
        })

        if (appModel.layerPresentation === 'overview') this._showLayerInCarousel(layer);

        this.notify({
            eventName:'layerAdded',
            object:this,
            layer
        })
    }

    private _onDeleteLayer(details: XRLayerDetails) {
        const layer = this.layerMap.get(details)
        if (!layer) throw new Error('Attempted to delete a layer that was never added')
        this.layerContainer.removeChild(layer)
        this.layerMap.delete(details)
        const idx = this.layers.indexOf(layer)
        this.layers.splice(idx, 1)
        
        this.notify({
            eventName:'layerDeleted',
            object:this,
            layer
        })
    }

    private _onUpdateLayer(oldDetails: XRLayerDetails, details: XRLayerDetails) {
        const layer = this.layerMap.get(oldDetails)
        if (!layer) throw new Error('Attempted to update a layer that was never added')
        this.layerMap.delete(oldDetails)
        this.layerMap.set(details, layer)
        layer.details = details
    }

    private _layerTypeSortRank = {
        'reality': 0,
        'augmentation': 1,
        'none': 1
    }

    private _sortLayers() {
        this.layers.sort((a, b) => {
            const aTypeRank = this._layerTypeSortRank[a.details.xrImmersiveMode]
            const bTypeRank = this._layerTypeSortRank[b.details.xrImmersiveMode]
            let result = aTypeRank - bTypeRank

            if (result !== 0) return result

            if (a.details === appModel.realityLayer) return 1
            if (b.details === appModel.realityLayer) return -1

            if (a.details === appModel.focussedLayer) return 1
            if (b.details === appModel.focussedLayer) return -1

            return 0
        })

        // this.layerContainer.minWidth = appModel.screenSize.width
        this.layerContainer.width = {value:1, unit:'%'}
        if (appModel.layerPresentation === 'stack') {
            // this.layerContainer.minHeight = appModel.screenSize.height
            // this.layerContainer.height = {value:1, unit:'%'}
            this.scrollView.scrollToVerticalOffset(0, true)
        }
        
        this.layers.forEach((layer) => {
            bringToFront(layer)
            if (appModel.layerPresentation === 'stack') {
                this._showLayerInStack(layer)
            }
            layer.requestLayout()
        })

        console.log('SORTED LAYERS')
    }

    // onLayout(left: number, top: number, right: number, bottom: number) {
    //     super.onLayout(left, top, right, bottom)
    //     const screenWidth = screen.mainScreen.widthPixels
    //     const screenHeight = screen.mainScreen.heightPixels
    //     const safeArea = this.getSafeAreaInsets()
    //     this.scrollView.layout(-safeArea.left, -safeArea.top, screenWidth, screenHeight)
    //     this.layerContainer.layout(-safeArea.left, -safeArea.top, screenWidth, screenHeight)
    //     this.layers.forEach((layer) => {
    //         View.layoutChild(this.layerContainer, layer, -safeArea.left, -safeArea.top, screenWidth, screenHeight)
    //     })
    // }

    private _calculateTargetTransform(index: number) {
        // const layerPosition = index * OVERVIEW_VERTICAL_PADDING - this.scrollView.verticalOffset;
        // const normalizedPosition = layerPosition / this.getActualSize().height;
        // const theta = Math.min(Math.max(normalizedPosition, 0), 0.85) * Math.PI;
        // const scaleFactor = 1 - (Math.cos(theta) / 2 + 0.5) * 0.25;
        return {
            translate: {
                x: 0,
                y: index * OVERVIEW_VERTICAL_PADDING + appModel.safeAreaInsets.top - OVERVIEW_VERTICAL_PADDING / 4
            },
            scale: {
                x: OVERVIEW_SCALE_FACTOR,
                y: OVERVIEW_SCALE_FACTOR
            }
        }
    }

    private _lastTime = Date.now()
    private _animate() {
        if (appModel.layerPresentation === 'stack')
            return

        const now = Date.now()
        const deltaT = Math.min(now - this._lastTime, 30) / 1000
        this._lastTime = now

        const layerHeight = this.getActualSize().height

        let maxTranslateY = 0
        this.layers.forEach((layer, index) => {
            layer.visualIndex = this._lerp(layer.visualIndex, index, deltaT * 4)
            const transform = this._calculateTargetTransform(layer.visualIndex)
            layer.scaleX = transform.scale.x
            layer.scaleY = transform.scale.y
            layer.translateX = transform.translate.x
            layer.translateY = transform.translate.y
            maxTranslateY = Math.max(maxTranslateY, transform.translate.y)
        });
            
        // this.layerContainer.minWidth = appModel.screenSize.width
        this.layerContainer.width = {value:1, unit:'%'}
        this.layerContainer.height = 
            maxTranslateY + layerHeight * OVERVIEW_SCALE_FACTOR + OVERVIEW_VERTICAL_PADDING

    }

    private _lerp(a, b, t) {
        return a + (b - a) * t
    }

    private _showLayerInCarousel(layer: LayerView) {
        layer.borderRadius = 10
        layer.touchOverlay.isUserInteractionEnabled = true
        layer.touchOverlay.opacity = 1
        
        layer.contentView.animate({
            translate: {x:0,y:TITLE_BAR_HEIGHT},
            duration: OVERVIEW_ANIMATION_DURATION
        })
        layer.titleBar.opacity = 1
        layer.titleBar.animate({
            translate: {x:0,y:0},
            duration: OVERVIEW_ANIMATION_DURATION
        })

        const idx = this.layers.indexOf(layer);
        const { translate, scale } = this._calculateTargetTransform(idx);
        layer.animate({
            opacity: 1,
            backgroundColor: TRANSLUCENT_BACKGROUND_COLOR,
            translate,
            scale,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: OVERVIEW_ANIMATION_CURVE
        });
    }

    private _showLayerInStack(layer: LayerView) {

        let hasFocus = this.focussedLayer === layer
        let visible = hasFocus
        if (this.focussedLayer && this.focussedLayer.details.xrImmersiveMode !== 'none') {
            if (layer.details.xrImmersiveMode === 'augmentation') visible = true
            if (layer === this.realityLayer) visible = true
        }

        setTimeout(() => {
            layer.borderRadius = 0;
        }, OVERVIEW_ANIMATION_DURATION * 0.5)
        layer.touchOverlay.isUserInteractionEnabled = !hasFocus;
        layer.touchOverlay.opacity = hasFocus ? 0 : 1;

        layer.contentView.animate({
            translate: {x:0,y:0},
            duration: OVERVIEW_ANIMATION_DURATION
        })
        layer.titleBar.animate({
            translate: {x:0,y:-TITLE_BAR_HEIGHT},
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(()=>{
            layer.titleBar.animate({
                opacity: 0,
                duration: OVERVIEW_ANIMATION_DURATION/2
            })
        })
        
        layer.visualIndex = this.layers.indexOf(layer);
        return layer.animate({
            opacity: visible ? 1 : 0,
            translate: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            backgroundColor: TRANSPARENT_BACKGROUND_COLOR,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: OVERVIEW_ANIMATION_CURVE
        })
    }

    private _onShowOverview() {

        this.layers.forEach((layer) => {
            this._showLayerInCarousel(layer);
        });

        // this.scrollView.scrollToVerticalOffset(0, true);
        if (this.scrollView.ios) {
            (this.scrollView.ios as UIScrollView).scrollEnabled = true;
        }

        // animate the views
        this._intervalId = setInterval(this._animate.bind(this), 20);
    }

    private _onHideOverview() {

        this.scrollView.scrollToVerticalOffset(0, true);
        if (this.scrollView.ios) {
            (this.scrollView.ios as UIScrollView).scrollEnabled = false;
        }

        Promise.all(this.layers.map((layer) => {
            return this._showLayerInStack(layer)
        })).then(() => {
            this.scrollView.scrollToVerticalOffset(0, true);
            setTimeout(() => this.scrollView.scrollToVerticalOffset(0, false), 1000)
        });

        // stop animating the views
        if (this._intervalId) clearInterval(this._intervalId);
        this._intervalId = undefined;
    }

    // private _countArgonApps() {
    //     var count = 0;
    //     this.layers.forEach((layer) => {
    //         if (layer.webView && layer.webView.isArgonPage) count++;
    //     });
    //     return count;
    // }


    // public loadUrl(url:string) {
    //     if (!this.focussedLayer) this._setFocussedLayer(this.layers[this.layers.length-1]);
    //     if (this.focussedLayer && this.focussedLayer !== this.realityLayer) {
    //         this.focussedLayer.details.set('uri',url);
    //         this.focussedLayer.details.set('title', getHost(url));
    //         this.focussedLayer.details.set('isFavorite',false);
    //     }

    //     if (this.focussedLayer && this.focussedLayer.webView) {

    //         const webView = this.focussedLayer.webView;

    //         if (webView.url === url) {
    //             webView.reload();
    //         } else {
    //             if (webView.src === url) {
    //                 // The webview was probably navigated since the the last time the src property was set. 
    //                 // Since the src does not update when the page navigates (as expected), we should
    //                 // have to wrap the value in order to force the property to notice a change.
    //                 webView.src = <any>new WrappedValue(url);
    //             } else {
    //                 webView.src = url;
    //             }
    //         }
    //     }
    // }

    // private _setFocussedLayer(layer:Layer) {
    //     if (this._focussedLayer !== layer) {
    //         const previousFocussedLayer = this._focussedLayer;
    //         this._focussedLayer = layer;
    //         this.notifyPropertyChange('focussedLayer', layer);
    //         console.log("Set focussed layer: " + layer.details.uri || "New Channel");

    //         appViewModel.argon.provider.focus.session = layer.session;
    //         if (layer.session) appViewModel.argon.provider.visibility.set(layer.session, true);

    //         appViewModel.setLayerDetails(layer.details);

    //         if (layer !== this.realityLayer) {
    //             this.layers.splice(this.layers.indexOf(layer), 1);
    //             this.layers.push(layer);
    //             bringToFront(layer);
    //         }

    //         if (previousFocussedLayer) this._showLayerInStack(previousFocussedLayer);
    //         this._showLayerInStack(layer);
    //     }

    //     appViewModel.set('currentPermissionSession', layer.session);
    // }

    get realityLayer() {
        return this.layerMap.get(appModel.realityLayer!)
    }

    get focussedLayer() {
        return this.layerMap.get(appModel.focussedLayer!)
    }
}


// function getHost(uri?:string) {
//     return uri ? URI.parse(uri).hostname : undefined;
// }