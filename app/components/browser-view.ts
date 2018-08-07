import { View } from 'ui/core/view'
import { ScrollView } from 'ui/scroll-view'
import { Color } from 'color'
import { GridLayout } from 'ui/layouts/grid-layout'
import { ObservableArray, ChangeType, ChangedData } from 'data/observable-array'
import { AnimationCurve } from 'ui/enums'
import { PropertyChangeData, EventData } from 'data/observable'
import * as application from 'application'

import { appModel, LayerDetails } from '../app-model'
import { bind } from '../decorators'
import { bringToFront } from '../utils'

import {LayerView, TITLE_BAR_HEIGHT} from './layer-view'

import * as vuforia from 'nativescript-vuforia'

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

    videoView: View = vuforia.videoView;
    scrollView = new ScrollView()
    layerContainer = new GridLayout()
    layers = new Array<LayerView>()
    layerMap = new Map<LayerDetails, LayerView>()

    private _intervalId?: number

    constructor() {
        super()

        this.clipToBounds = false
        this.layerContainer.clipToBounds = false
        this.layerContainer.horizontalAlignment = 'stretch'
        this.layerContainer.verticalAlignment = 'top'
        if (this.layerContainer.ios) {
            this.layerContainer.ios.layer.masksToBounds = false;
        }

        this.scrollView.horizontalAlignment = 'stretch';
        this.scrollView.verticalAlignment = 'stretch';
        this.scrollView.content = this.layerContainer;
        if (this.scrollView.ios) {
            (this.scrollView.ios as UIScrollView).contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentBehavior.Never;
            this.scrollView.ios.layer.masksToBounds = false;
            this.scrollView.ios.scrollEnabled = false;
            this.layerContainer.height = 50000;
        }
        this.addChild(this.scrollView);
        // this.scrollView.on(ScrollView.scrollEvent, this._animate.bind(this));

        if (application.android) {
            var activity = application.android.foregroundActivity;
            activity.onBackPressed = () => {
                const focussedLayer = this.focussedLayer
                if (focussedLayer && focussedLayer.webView && focussedLayer.webView.android.canGoBack()) {
                    focussedLayer.webView.android.goBack();
                }
            }
        }

        application.on(application.orientationChangedEvent, () => {
            this.requestLayout();
            this.scrollView.scrollToVerticalOffset(0, false);
        })

        appModel.on('propertyChange', (evt: PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'layerPresentation':
                    if (appModel.layerPresentation === 'overview') this._onShowOverview()
                    else this._onHideOverview()
                    break;
                case 'layers':
                    if (evt.oldValue) (evt.oldValue as ObservableArray<LayerDetails>).off('change', this._onLayerDetailsArrayChange)
                    appModel.layers.on('change', this._onLayerDetailsArrayChange)
                    this.layers.slice().forEach(layer => this._onDeleteLayer(layer.details))
                    appModel.layers.forEach(layer => this._onAddLayer(layer))
                    break;
                case 'realityLayer':
                case 'focussedLayer': {
                    // const focussedLayer = this.focussedLayer
                    this._sortLayers()
                    // if (focussedLayer && focussedLayer !== this.realityLayer) {
                    //     bringToFront(focussedLayer);
                    // }
                    break;
                }
            }
        })

        appModel.layers.on('change', this._onLayerDetailsArrayChange)
        appModel.layers.forEach((layer) => this._onAddLayer(layer))
    }

    @bind
    private _onLayerDetailsArrayChange(evt: ChangedData<LayerDetails>) {
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
    }

    private _onAddLayer(details: LayerDetails) {
        const layer = new LayerView(details)
        this.layerContainer.addChild(layer)
        this.layerMap.set(details, layer)
        this.layers.push(layer)
        this._sortLayers()

        const setupLiveVideoView = () => {
            if (this.videoView.parent)
                (this.videoView.parent as GridLayout).removeChild(this.videoView)
            layer.contentView.addChild(this.videoView)
            // if (this.videoView.parent) this.videoView.parent._removeView(this.videoView)
            // const videoViewLayout = new AbsoluteLayout();
            // layer.contentView.addChild(videoViewLayout);
            // videoViewLayout.addChild(this.videoView);
        }

        if (details.src === 'reality:live') {
            setupLiveVideoView()
            layer.closeButton.visibility = 'collapse';
        }

        layer.on('propertyChange', (evt: PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'details.immersiveMode':
                    this._sortLayers()
                    break;
                case 'details.src':
                    if (details.src === 'reality:live') {
                        setupLiveVideoView()
                        layer.closeButton.visibility = 'collapse';
                    } else {
                        layer.closeButton.visibility = 'visible';
                    }
            }
        })

        layer.closeButton.on('tap', () => {
            let foundIndex = appModel.layers.indexOf(layer.details)
            if (foundIndex > -1) appModel.layers.splice(foundIndex, 1)
        })

        layer.touchOverlay.on('tap', () => {
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

    private _onDeleteLayer(details: LayerDetails) {
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

    private _onUpdateLayer(oldDetails: LayerDetails, details: LayerDetails) {
        const layer = this.layerMap.get(oldDetails)
        if (!layer) throw new Error('Attempted to update a layer that was never added')
        this.layerMap.delete(oldDetails)
        this.layerMap.set(details, layer)
        layer.details = details
    }

    private _layerTypeSortRank = {
        'reality': 0,
        'augmentation': 1,
        'none': 2
    }

    private _sortLayers() {
        this.layers.sort((a, b) => {
            const aTypeRank = this._layerTypeSortRank[a.details.immersiveMode]
            const bTypeRank = this._layerTypeSortRank[b.details.immersiveMode]
            let result = aTypeRank - bTypeRank

            if (result !== 0) return result

            if (a.details === appModel.realityLayer) return 1
            if (b.details === appModel.realityLayer) return -1

            if (a.details === appModel.focussedLayer) return 1
            if (b.details === appModel.focussedLayer) return -1

            return 0
        })

        this.layers.forEach((layer) => {
            bringToFront(layer)
            if (appModel.layerPresentation === 'stack') {
                this._showLayerInStack(layer)
            }
        })
    }

    // private _createRealityLayer() {
    //     let layer:Layer = this._createLayer();
    //     layer.titleBar.backgroundColor = new Color(0xFF222222);
    //     layer.titleLabel.color = new Color('white');
    //     layer.closeButton.visibility = 'collapse';

    //     if (this.videoView) {
    //         // this.videoView.horizontalAlignment = 'stretch';
    //         // this.videoView.verticalAlignment = 'stretch';
    //         // if (this.videoView.parent) this.videoView.parent._removeView(this.videoView);
    //         // layer.contentView.addChild(this.videoView);
    //         if (this.videoView.parent) this.videoView.parent._removeView(this.videoView)
    //         const videoViewLayout = new AbsoluteLayout();
    //         layer.contentView.addChild(videoViewLayout);
    //         videoViewLayout.addChild(this.videoView);
    //         // videoViewLayout.visibility = 'collapse';
    //     }

    //     // appViewModel.ready.then(()=>{
    //     //     const manager = appViewModel.argon;

    //     //     appViewModel.argon.provider.reality.installedEvent.addEventListener(({viewer})=>{
    //     //         if (viewer instanceof NativescriptHostedRealityViewer) {
    //     //             const webView = viewer.webView;
    //     //             webView.horizontalAlignment = 'stretch';
    //     //             webView.verticalAlignment = 'stretch';
    //     //             webView.visibility = 'collapse';
    //     //             layer.contentView.addChild(webView);
    //     //             this.realityWebviews.set(viewer.uri, webView);
    //     //             analytics.updateInstalledRealityCount(this.realityWebviews.size);
    //     //         }
    //     //     });

    //     //     appViewModel.argon.provider.reality.uninstalledEvent.addEventListener(({viewer})=>{
    //     //         if (viewer instanceof NativescriptHostedRealityViewer) {
    //     //             layer.contentView.removeChild(viewer.webView);
    //     //             this.realityWebviews.delete(viewer.uri);
    //     //         }
    //     //         manager.reality.request(Argon.RealityViewer.LIVE);
    //     //     });

    //     //     // TODO: add and use manager.provider.reality.presentingRealityViewerChangeEvent instead
    //     //     manager.reality.changeEvent.addEventListener(({current})=>{
    //     //         const viewer = manager.provider.reality.getViewerByURI(current!)!;
    //     //         const details = layer.details;
    //     //         const uri = viewer.uri;
    //     //         details.set('uri', uri);
    //     //         details.set('title', 'Reality: ' + (viewer.session && viewer.session.info.title) || getHost(uri));
    //     //         layer.webView = this.realityWebviews.get(uri);
    //     //         layer.details.set('log', layer.webView && layer.webView.log);
    //     //         analytics.updateCurrentRealityUri(uri);

    //     //         var sessionPromise = new Promise<Argon.SessionPort>((resolve, reject) => {
    //     //             if (viewer.session && !viewer.session.isClosed) {
    //     //                 resolve(viewer.session);
    //     //             } else {
    //     //                 let remove = viewer.connectEvent.addEventListener((session)=>{
    //     //                     resolve(session);
    //     //                     remove();
    //     //                 })
    //     //             }
    //     //         });

    //     //         sessionPromise.then((session:Argon.SessionPort)=>{
    //     //             if (current === manager.reality.current) {
    //     //                 if (session.info.title) details.set('title', 'Reality: ' + session.info.title);
    //     //                 layer.session = session;
    //     //             }
    //     //         });
    //     //     });
    //     // });

    //     this.realityLayer = layer;
    // }

    // addLayer() : Layer {
    //     const layer:Layer = this._createLayer();
    //     const webView = layer.webView;

    //     if (webView) {

    //         webView.opacity = 0;

    //         webView.on('urlChange', () => {
    //             webView.opacity = 1;
    //             layer.details.item = appModel.getOrCreateBookmarkItem(webView.url);
    //         })

    //         webView.on('titleChange', () => {
    //             const title = webView.title || getHost(webView.url) || '';
    //             const bookmarkItem = appModel.getOrCreateBookmarkItem(webView.url);
    //             bookmarkItem.title = title
    //         })

    //         // webView.on('isArgonPageChange', () => {
    //         //     const isArgonPage = webView.isArgonPage || !webView.isLoaded;
    //         //     if (isArgonPage || layer === this.focussedLayer || this._overviewEnabled) {
    //         //         layer.animate({
    //         //             opacity: 1,
    //         //             duration: OVERVIEW_ANIMATION_DURATION
    //         //         });
    //         //     } else {
    //         //         layer.opacity = 1;
    //         //     }
    //         //     analytics.updateArgonAppCount(this._countArgonApps());
    //         // })

    //         webView.on('progressChange', () => {
    //             layer.progressBar.value = webView.progress * 100;
    //         })

    //         webView.on(WebView.loadStartedEvent, (eventData: LoadEventData) => {
    //             layer.progressBar.value = 0;
    //             layer.progressBar.visibility = 'visible';
    //         });

    //         webView.on(WebView.loadFinishedEvent, (eventData: LoadEventData) => {
    //             this._checkWebViewVersion(webView);
    //             // if (!eventData.error && webView !== this.realityLayer.webView) {
    //             //     bookmarks.pushToHistory(eventData.url, webView.title);
    //             // }
    //             layer.progressBar.value = 100;

    //             // wait a moment before hiding the progress bar
    //             setTimeout(function() {
    //                 layer.progressBar.visibility = 'collapse';
    //             }, 30);

    //             // workaround to fix layout issues that appeared in ios 11 beta 
    //             webView.requestLayout();
    //         });

    //         // webView.on('sessionChange', ()=>{
    //         //     const session = webView.session;
    //         //     layer.session = session;

    //         //     if (!session) return;

    //         //     session.connectEvent.addEventListener(()=>{
    //         //         if (this.focussedLayer && webView === this.focussedLayer.webView) {
    //         //             appViewModel.argon.provider.focus.session = session;
    //         //             appViewModel.argon.provider.visibility.set(session, true);
    //         //         }
    //         //         if (layer === this.realityLayer) {
    //         //             if (session.info.role !== Argon.Role.REALITY_VIEW) {
    //         //                 session.close();
    //         //                 alert("Only a reality can be loaded in the reality layer");
    //         //             }
    //         //         } else {
    //         //             if (session.info.role == Argon.Role.REALITY_VIEW) {
    //         //                 session.close();
    //         //                 alert("A reality can only be loaded in the reality layer");
    //         //             }
    //         //         }
    //         //     })
    //         //     session.closeEvent.addEventListener(()=>{
    //         //         if (layer.session) appViewModel.argon.provider.reality.removeInstaller(layer.session);
    //         //         layer.session = undefined;
    //         //     })
    //         // });

    //         layer.details.log = webView.log

    //     }

    //     // if (this.isLoaded)
    //     //     this._setFocussedLayer(layer);

    //     if (this._overviewEnabled) this._showLayerInCarousel(layer);

    //     return layer;
    // }

    // private _createLayer() {
    //     const contentView = new GridLayout();
    //     contentView.horizontalAlignment = 'stretch';
    //     contentView.verticalAlignment = 'stretch';
    //     contentView.clipToBounds = false;

    //     const containerView = new GridLayout();
    //     containerView.horizontalAlignment = 'left';
    //     containerView.verticalAlignment = 'top';
    //     containerView.clipToBounds = false;

    //     // Cover the webview to detect gestures and disable interaction
    //     const touchOverlay = new gradient['Gradient']();
    //     (touchOverlay as View).on('loaded', ()=> {
    //         touchOverlay.updateDirection('to bottom');
    //         touchOverlay.updateColors([new Color(0x00000000), new Color(0x33000000)]);
    //     });
    //     touchOverlay.isUserInteractionEnabled = false;
    //     touchOverlay.opacity = 0;
    //     // touchOverlay.style.visibility = 'collapse';
    //     touchOverlay.horizontalAlignment = 'stretch';
    //     touchOverlay.verticalAlignment = 'stretch';
    //     touchOverlay.on(GestureTypes.tap, (event) => {
    //         this._setFocussedLayer(layer);
    //         appModel.layerPresentation = 'stack'
    //     });

    //     const titleBar = new GridLayout();
    //     titleBar.addRow(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
    //     titleBar.addColumn(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
    //     titleBar.addColumn(new ItemSpec(1, 'star'));
    //     titleBar.addColumn(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
    //     titleBar.verticalAlignment = 'top';
    //     titleBar.horizontalAlignment = 'stretch';
    //     titleBar.backgroundColor = new Color(200, 255, 255, 255);
    //     titleBar.visibility = 'collapse';
    //     titleBar.opacity = 1;

    //     const closeButton = new Button();
    //     closeButton.horizontalAlignment = 'stretch';
    //     closeButton.verticalAlignment = 'stretch';
    //     closeButton.text = 'close';
    //     closeButton.className = 'material-icon action-btn';
    //     closeButton.style.fontSize = application.android ? 16 : 22;
    //     closeButton.color = new Color('black');
    //     GridLayout.setRow(closeButton, 0);
    //     GridLayout.setColumn(closeButton, 0);

    //     closeButton.on('tap', ()=>{
    //         this.removeLayer(layer);
    //     });

    //     const titleLabel = new Label();
    //     titleLabel.horizontalAlignment = 'stretch';
    //     titleLabel.verticalAlignment = application.android ? 'middle' : 'stretch';
    //     titleLabel.textAlignment = 'center';
    //     titleLabel.color = new Color('black');
    //     titleLabel.fontSize = 14;
    //     GridLayout.setRow(titleLabel, 0);
    //     GridLayout.setColumn(titleLabel, 1);

    //     titleBar.addChild(closeButton);
    //     titleBar.addChild(titleLabel);

    //     containerView.addChild(contentView);
    //     containerView.addChild(touchOverlay);
    //     containerView.addChild(titleBar);
    //     this.layerContainer.addChild(containerView);

    //     let webView = undefined;
    //     // const webView = new ArgonWebView;
    //     // webView.horizontalAlignment = 'stretch';
    //     // webView.verticalAlignment = 'stretch';
    //     // contentView.addChild(webView);

    //     // application.on('iosPageViewDidTransitionToSize', () => {
    //     //     const wkWebView:WKWebView = webView.ios;
    //     //     // sometimes webview zoomScale is strange after screen rotation
    //     //     wkWebView.scrollView.setZoomScaleAnimated(1, true);
    //     // })


    //     var progress = new Progress();
    //     progress.className = 'progress';
    //     progress.verticalAlignment = 'top';
    //     progress.maxValue = 100;
    //     progress.height = 5;
    //     progress.visibility = 'collapse';
    //     contentView.addChild(progress);

    //     var layer = {
    //         containerView,
    //         webView,
    //         contentView,
    //         touchOverlay,
    //         titleBar,
    //         closeButton,
    //         titleLabel,
    //         visualIndex: this.layers.length,
    //         details: new LayerDetails(),
    //         progressBar: progress
    //     };

    //     this.layers.push(layer);

    //     layer.titleLabel.bind({
    //         sourceProperty: 'title',
    //         targetProperty: 'text'
    //     }, layer.details);

    //     return layer;
    // }

    // removeLayerAtIndex(index:number) {
    //     const layer = this.layers[index];
    //     if (typeof layer === 'undefined') 
    //         throw new Error('Expected layer at index ' + index);
    //     layer.webView && layer.webView.session && layer.webView.session.close();
    //     this.layers.splice(index, 1);
    //     this.layerContainer.removeChild(layer); // for now
    // }

    // removeLayer(layer:Layer) {
    //     const index = this.layers.indexOf(layer);
    //     this.removeLayerAtIndex(index);
    // }

    // onLoaded() {
    //     super.onLoaded();
    //     // if (this.android) {
    //     //     this.android.addOnLayoutChangeListener(new android.view.View.OnLayoutChangeListener({
    //     //         onLayoutChange(v: android.view.View, left: number, top: number, right: number, bottom: number, oldLeft: number, oldTop: number, oldRight: number, oldBottom: number): void {
    //     //             var eventData: observableModule.EventData = {
    //     //                 eventName: "customLayoutChange",
    //     //                 object: androidLayoutObservable
    //     //             }
    //     //             androidLayoutObservable.notify(eventData);
    //     //         }
    //     //     }));
    //     //     androidLayoutObservable.on("customLayoutChange", ()=>{
    //     //         this.androidOnLayout();
    //     //     })
    //     // }
    // }

    // onMeasure(widthMeasureSpec, heightMeasureSpec) {

    //     const width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
    //     const height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
    //     const dipWidth = utils.layout.toDeviceIndependentPixels(width);
    //     const dipHeight = utils.layout.toDeviceIndependentPixels(height);

    //     if (!this._overviewEnabled) {
    //         this.layerContainer.width = dipWidth;
    //         this.layerContainer.height = dipHeight;
    //     }



    //     this.layers.forEach((layer)=>{
    //         layer.width = dipWidth;
    //         layer.height = dipHeight;

    //         // workaround for layout issue that appeared in ios 11 beta
    //         if (layer.webView && layer.webView.ios) {
    //             const wkwebView:WKWebView = layer.webView.ios;
    //             wkwebView.setNeedsLayout();
    //         }
    //     });

    //     // super.onMeasure(widthMeasureSpec, heightMeasureSpec);
    // }

    // androidOnLayout() {
    //     const width = this.getActualSize().width;
    //     const height = this.getActualSize().height;

    //     if (!this._overviewEnabled) {
    //         this.layerContainer.width = width;
    //         this.layerContainer.height = height;
    //     }

    //     this.layers.forEach((layer)=>{
    //         layer.width = width;
    //         layer.height = height;
    //     });
    // }

    onMeasure(widthMeasureSpec: number, heightMeasureSpec: number) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
        // make sure that each layer does not inherit the size of the layer container (which expands for the overview mode),
        // and instead set the size of each layer to be the same as this browser view
        this.layerContainer.eachLayoutChild((child) => {
            const layer = child as LayerView
            View.measureChild(this, layer, widthMeasureSpec, heightMeasureSpec);
            // workaround for layout issue that appeared in ios 11 beta
            if (layer.webView && layer.webView.ios) {
                const wkwebView: WKWebView = layer.webView.ios;
                wkwebView.setNeedsLayout();
            }
        });
    }

    // onLayout(left: number, top: number, right: number, bottom: number) {
    //     super.onLayout(left, top, right, bottom);
    //     this.eachLayoutChild((child)=>{
    //         View.layoutChild(this, child, left, top, right, bottom);
    //     });
    // }

    private _calculateTargetTransform(index: number) {
        // const layerPosition = index * OVERVIEW_VERTICAL_PADDING - this.scrollView.verticalOffset;
        // const normalizedPosition = layerPosition / this.getActualSize().height;
        // const theta = Math.min(Math.max(normalizedPosition, 0), 0.85) * Math.PI;
        // const scaleFactor = 1 - (Math.cos(theta) / 2 + 0.5) * 0.25;
        return {
            translate: {
                x: 0,
                y: index * OVERVIEW_VERTICAL_PADDING + OVERVIEW_VERTICAL_PADDING / 4 + appModel.safeAreaInsets.top
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

        // const containerHeight = 
        //     height * OVERVIEW_SCALE_FACTOR + 
        //     OVERVIEW_VERTICAL_PADDING * this.layers.length - 
        //     OVERVIEW_VERTICAL_PADDING / 2
            
        // this.layerContainer.height = containerHeight

        let maxTranslateY = 0
        this.layers.forEach((layer, index) => {
            layer.visualIndex = this._lerp(layer.visualIndex, index, deltaT * 4)
            const transform = this._calculateTargetTransform(layer.visualIndex)
            layer.originY = 0
            layer.scaleX = transform.scale.x
            layer.scaleY = transform.scale.y
            layer.translateX = transform.translate.x
            layer.translateY = transform.translate.y
            maxTranslateY = Math.max(maxTranslateY, transform.translate.y)
        });
            
        this.layerContainer.height = 
            maxTranslateY + layerHeight * OVERVIEW_SCALE_FACTOR + OVERVIEW_VERTICAL_PADDING / 4 

    }

    private _lerp(a, b, t) {
        return a + (b - a) * t
    }

    private _showLayerInCarousel(layer: LayerView) {
        const idx = this.layers.indexOf(layer);

        layer.borderRadius = 10;
        if (layer.ios) {
            layer.ios.layer.masksToBounds = true;
        }


        if (layer.contentView.ios) {
            layer.contentView.ios.layer.masksToBounds = true;
        }
        // if (layer.ios) {
        //     layer.ios.layer.masksToBounds = true;
        // } else if (layer.android) {
        //     layer.android.setClipChildren(true);
        // }



        // layer.clipToBounds = true;

        // if (layer.contentView.ios) {
        //     layer.contentView.ios.layer.masksToBounds = true;
        // } else if (layer.contentView.android) {
        //     layer.contentView.android.setClipChildren(true);
        // }

        // if (layer.webView && layer.webView.ios) {
        //     layer.webView.ios.layer.masksToBounds = true;
        // } else if (layer.webView && layer.webView.android) {
        //     layer.webView.android.setClipChildren(true);
        // }

        // layer.touchOverlay.style.visibility = 'visible';
        layer.touchOverlay.isUserInteractionEnabled = true;
        layer.touchOverlay.animate({
            opacity: 1,
            duration: OVERVIEW_ANIMATION_DURATION
        })

        // if (layer.session) {
        //     appViewModel.argon.provider.visibility.set(layer.session, true);
        // }

        // For transparent webviews, add a little bit of opacity
        layer.isUserInteractionEnabled = true;
        layer.animate({
            opacity: 1,
            backgroundColor: TRANSLUCENT_BACKGROUND_COLOR,
            duration: OVERVIEW_ANIMATION_DURATION,
        });
        layer.contentView.animate({
            translate: { x: 0, y: TITLE_BAR_HEIGHT - 1 },
            duration: OVERVIEW_ANIMATION_DURATION
        })

        // Show titlebars
        layer.titleBar.visibility = 'visible';
        layer.titleBar.animate({
            translate: { x: 0, y: 0 },
            // opacity: 1,
            duration: OVERVIEW_ANIMATION_DURATION
        })

        // Update for the first time & animate.
        const { translate, scale } = this._calculateTargetTransform(idx);
        layer.animate({
            translate,
            scale,
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: OVERVIEW_ANIMATION_CURVE
        });
    }

    // private _layerBackgroundColor = new Color(0, 255, 255, 255);

    private _showLayerInStack(layer: LayerView) {
        const idx = this.layers.indexOf(layer);

        // layer.touchOverlay.style.visibility = 'collapse';
        layer.touchOverlay.animate({
            opacity: 0,
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(() => {
            layer.touchOverlay.isUserInteractionEnabled = false;
        });

        if (application.ios) {
            // todo: this is causing issues on android, investigate further
            layer.isUserInteractionEnabled = this.focussedLayer === layer;
        }

        let visible = false
        if (this.focussedLayer === layer) visible = true
        if (this.focussedLayer && this.focussedLayer.xrImmersiveMode !== 'none') {
            if (layer.xrImmersiveMode === 'augmentation') visible = true
            if (layer === this.realityLayer) visible = true
        }

        layer.animate({
            opacity: visible ? 1 : 0,
            backgroundColor: TRANSPARENT_BACKGROUND_COLOR,
            duration: OVERVIEW_ANIMATION_DURATION,
        });


        layer.contentView && layer.contentView.animate({
            translate: { x: 0, y: 0 },
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(() => {
            // layer.clipToBounds = false;
            if (layer.ios) layer.ios.layer.masksToBounds = false;
            // if (layer.ios) {
            //     layer.ios.layer.masksToBounds = false;
            // } else if (layer.android) {
            //     layer.android.setClipChildren(false);
            // }
            // if (layer.contentView.ios) {
            //     layer.contentView.ios.layer.masksToBounds = false;
            // } else if (layer.contentView.android) {
            //     layer.contentView.android.setClipChildren(false);
            // }
        });

        setTimeout(() => {
            layer.borderRadius = 0;
        }, OVERVIEW_ANIMATION_DURATION * 0.5)

        // Hide titlebars
        layer.titleBar.animate({
            translate: { x: 0, y: -TITLE_BAR_HEIGHT },
            // opacity: 0,
            duration: OVERVIEW_ANIMATION_DURATION
        }).then(() => {
            layer.titleBar.visibility = 'collapse';
        })

        // Update for the first time & animate.
        layer.visualIndex = idx;
        return layer.animate({
            translate: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            duration: OVERVIEW_ANIMATION_DURATION,
            curve: OVERVIEW_ANIMATION_CURVE
        })
    }

    private _onShowOverview() {

        this.layers.forEach((layer) => {
            this._showLayerInCarousel(layer);
        });

        this.scrollView.scrollToVerticalOffset(0, true);
        if (this.scrollView.ios) {
            // this.scrollView.ios.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentBehavior.Always;
            (this.scrollView.ios as UIScrollView).scrollEnabled = true;
        }

        // animate the views
        this._intervalId = setInterval(this._animate.bind(this), 20);
    }

    private _onHideOverview() {

        this.scrollView.scrollToVerticalOffset(0, true);
        if (this.scrollView.ios) {
            // this.scrollView.ios.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentBehavior.Never;
            (this.scrollView.ios as UIScrollView).scrollEnabled = false;
        }

        Promise.all(this.layers.map((layer) => {
            return this._showLayerInStack(layer)
        })).then(() => {
            this.scrollView.scrollToVerticalOffset(0, true);
            // this.layerContainer.width = 'auto';
            // this.layerContainer.height = 'auto';
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