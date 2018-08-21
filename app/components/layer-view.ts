
import { View } from 'ui/core/view'
import { Color } from 'color'
import { GridLayout, ItemSpec } from 'ui/layouts/grid-layout';
import { Label } from 'ui/label';
import { Button } from 'ui/button';
import { Progress } from 'ui/progress';
import { ArgonWebView } from 'argon-web-view';
import { PropertyChangeData, WrappedValue, EventData } from 'data/observable';
import * as gradient from 'nativescript-gradient'
import { appModel, LayerDetails, BookmarkItem } from '../app-model'
import { observable } from '../decorators'
import * as application from 'application'
import * as fileSystem from 'file-system'

export const TITLE_BAR_HEIGHT = 30;

export interface XRHitTestData extends EventData {
    options: {
        x:number
        y:number
    },
    result?:Promise<XRHitResult>
}

export interface XRCreateHitAnchorData extends EventData {
    options: {
        id:string
    },
    result?:Promise<void>
}

export interface XRCreateMidAirAnchorData extends EventData {
    options: {
        transform:Array<number>
    },
    result?:Promise<{id:string}>
}

export interface XRHitResult {
    id: string
    transform: Array<number>
}

export type XRImmersiveMode =  'reality' | 'augmentation' | 'none'

export interface LayerView {
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);
    on(event: "xrHitTest", callback: (data: XRHitTestData) => void, thisArg?: any);
    on(event: "xrCreateHitAnchor", callback: (data: XRCreateHitAnchorData) => void, thisArg?: any);
    on(event: "xrCreateMidAirAnchor", callback: (data: XRCreateMidAirAnchorData) => void, thisArg?: any);
}

const WEBXR_FILE = fileSystem.knownFolders.currentApp().getFile('js/webxr-polyfill.js')
let WEBXR_SOURCE = WEBXR_FILE.readTextSync()
let WEBXR_LAST_MODIFIED = WEBXR_FILE.lastModified

export class LayerView extends GridLayout {

    @observable()
    xrEnabled = false

    @observable()
    xrImmersiveMode:XRImmersiveMode = 'augmentation'

    @observable()
    private needsTransparentBackground = false
    // private backgroundFadeTimerId?:number
    
    webView: ArgonWebView
    contentView: GridLayout
    touchOverlay: GridLayout
    titleBar: GridLayout
    closeButton: Button
    titleLabel: Label
    progressBar: Progress

    visualIndex = 0

    @observable({type:LayerDetails})
    details: LayerDetails

    constructor(details: LayerDetails) {
        super()

        this.horizontalAlignment = 'left';
        this.verticalAlignment = 'top';
        this.clipToBounds = false;

        const webView = new ArgonWebView() 
        webView.visibility = 'collapse'
        webView.horizontalAlignment = 'stretch'
        webView.verticalAlignment = 'stretch'

        if (WEBXR_FILE.lastModified.getTime() > WEBXR_LAST_MODIFIED.getTime()) {
            WEBXR_LAST_MODIFIED = WEBXR_FILE.lastModified
            WEBXR_SOURCE = WEBXR_FILE.readTextSync()
        }

        if (webView.ios) {
            const wkWebView = webView.ios as WKWebView
            const userScript = WKUserScript.alloc()
                .initWithSourceInjectionTimeForMainFrameOnly(WEBXR_SOURCE, WKUserScriptInjectionTime.AtDocumentStart, true)
            wkWebView.configuration.userContentController.addUserScript(userScript)
        } else if (webView.android) {
            // TODO: inject WebXR
        }

        webView.on('urlChange', () => {
            const uri = webView!.url || ''
            this.details.content = new BookmarkItem({uri})
        })

        webView.on('loadStarted', () => {
            this.xrEnabled = false
            this.xrImmersiveMode = 'none'
        })

        webView.messageHandlers['xr.start'] = () => {
            this.xrEnabled = true
        }

        webView.messageHandlers['xr.stop'] = () => {
            this.xrEnabled = true
        }
        
        webView.messageHandlers['xr.setImmersiveMode'] = (options:{mode:XRImmersiveMode}) => {
            this.xrImmersiveMode = options.mode
        }

        webView.messageHandlers['xr.hitTest'] = (options:{x:number,y:number}) => {
            const evt:XRHitTestData = {
                eventName:'xrHitTest', 
                object:this,
                options,
                result:undefined
            }
            this.notify(evt)
            if (evt.result) return Promise.resolve(evt.result)
            else return Promise.reject()
        }

        webView.messageHandlers['xr.createHitAnchor'] = (options:{id:string}) => {
            const evt:XRCreateHitAnchorData = {
                eventName:'xrCreateHitAnchor', 
                object:this,
                options,
                result:undefined
            }
            this.notify(evt)
            if (evt.result) return Promise.resolve(evt.result)
            else return Promise.reject()
        }

        webView.messageHandlers['xr.createMidAirAnchor'] = (options:{transform:Array<number>}) => {
            const evt:XRCreateMidAirAnchorData = {
                eventName:'xrCreateMidAirAnchor', 
                object:this,
                options,
                result:undefined
            }
            this.notify(evt)
            if (evt.result) return Promise.resolve(evt.result)
            else return Promise.reject()
        }

        const contentView = new GridLayout();
        contentView.horizontalAlignment = 'stretch';
        contentView.verticalAlignment = 'stretch';
        contentView.clipToBounds = false;

        // Cover the webview to detect gestures and disable interaction
        const touchOverlay = new gradient['Gradient']();
        (touchOverlay as View).on('loaded', () => {
            touchOverlay.updateDirection('to bottom');
            touchOverlay.updateColors([new Color(0x00000000), new Color(0x33000000)]);
        });
        touchOverlay.isUserInteractionEnabled = false;
        touchOverlay.opacity = 0;
        // touchOverlay.style.visibility = 'collapse';
        touchOverlay.horizontalAlignment = 'stretch';
        touchOverlay.verticalAlignment = 'stretch';

        const titleBar = new GridLayout();
        titleBar.addRow(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.addColumn(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.addColumn(new ItemSpec(1, 'star'));
        titleBar.addColumn(new ItemSpec(TITLE_BAR_HEIGHT, 'pixel'));
        titleBar.verticalAlignment = 'top';
        titleBar.horizontalAlignment = 'stretch';
        titleBar.backgroundColor = new Color(200, 255, 255, 255);
        titleBar.visibility = 'collapse';
        titleBar.opacity = 1;

        const closeButton = new Button();
        closeButton.horizontalAlignment = 'stretch';
        closeButton.verticalAlignment = 'stretch';
        closeButton.text = 'close';
        closeButton.className = 'material-icon action-btn';
        closeButton.style.fontSize = application.android ? 16 : 22;
        closeButton.color = new Color('black');
        GridLayout.setRow(closeButton, 0);
        GridLayout.setColumn(closeButton, 0);

        const titleLabel = new Label();
        titleLabel.horizontalAlignment = 'stretch';
        titleLabel.verticalAlignment = application.android ? 'middle' : 'stretch';
        titleLabel.textAlignment = 'center';
        titleLabel.color = new Color('black');
        titleLabel.fontSize = 14;
        GridLayout.setRow(titleLabel, 0);
        GridLayout.setColumn(titleLabel, 1);

        titleBar.addChild(closeButton);
        titleBar.addChild(titleLabel);;

        var progressBar = new Progress();
        progressBar.className = 'progress';
        progressBar.verticalAlignment = 'top';
        progressBar.maxValue = 100;
        progressBar.height = 5;
        progressBar.visibility = 'collapse';

        this.addChild(contentView);
        this.addChild(touchOverlay);
        this.addChild(titleBar);
        contentView.addChild(progressBar);
        contentView.addChild(webView);
        
        Object.assign(this, {
            webView,
            contentView,
            touchOverlay,
            titleBar,
            closeButton,
            titleLabel,
            progressBar
        })

        appModel.on('propertyChange', (evt: PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'safeAreaInsets': 
                case 'uiMode': 
                    this._updateUI() 
                    break
            }
        });

        this.on('propertyChange', (evt: PropertyChangeData) => {
            switch (evt.propertyName) {
                case 'details.content.title':
                case 'details.immersiveMode':
                    this._updateUI()
                    break
                case 'details.src': {
                    const src = this.details.src
                    // if not using reality: protocol, needs a web view
                    const needsWebView = src && !src.startsWith('reality')

                    if (needsWebView) {

                        webView.visibility = 'visible'

                        // if (webView.url === src) {
                        //     webView.reload();
                        // } else {
                            webView.src = <any>new WrappedValue(src);
                        // }

                    } else {
                        webView.visibility = 'collapse'
                    }

                    break
                }
                case 'xrEnabled':
                case 'xrImmersiveMode': {
                    this.needsTransparentBackground = 
                        this.xrEnabled && this.xrImmersiveMode !== 'none'
                    this.details.immersiveMode = this.xrImmersiveMode
                    break
                }
                case 'needsTransparentBackground': {
                    // if (this.backgroundFadeTimerId !== undefined) {
                    //     clearTimeout(this.backgroundFadeTimerId)
                    // }
                    // this.backgroundFadeTimerId = setTimeout(()=>{
                        const transparent = this.needsTransparentBackground
                        if (this.webView.ios) {
                            const wkWebView = this.webView.ios as WKWebView
                            const transparentColor = UIColor.colorWithCIColor(CIColor.clearColor)
                            const whiteColor = UIColor.colorWithCIColor(CIColor.whiteColor)
                            const color = transparent ? transparentColor : whiteColor;
                            wkWebView.opaque = !transparent
                            wkWebView.scrollView.opaque = !transparent
                            wkWebView.scrollView.backgroundColor = color
                            wkWebView.backgroundColor = color  
                        }
                        if (this.webView.android) {
                            const androidWebView = this.webView.android as android.webkit.WebView
                            const color = transparent ? android.graphics.Color.TRANSPARENT : android.graphics.Color.WHITE
                            androidWebView['setBackgroundColor'](color)
                        }
                        // this.backgroundFadeTimerId = undefined
                    // }, 200)
                }
            }
        })

        if (!details.src && details.content && details.content.uri) {
            details.src = details.content.uri
        }
        this.details = details
    }

    private _updateUI() {
        const title = this.details.content ? this.details.content.title : ''

        if (this.details.immersiveMode === 'reality') {
            this.titleBar.backgroundColor = new Color(0xFF222222);
            this.titleLabel.color = new Color('white');        
            this.titleLabel.text = title ? 'Reality: ' + title : 'Reality'
        } else {
            this.titleBar.backgroundColor = new Color('white');
            this.titleLabel.color = new Color('black');
            this.titleLabel.text = title
        }

        if (this.details.immersiveMode === 'none') {
            this.marginTop = appModel.safeAreaInsets.top
        } else {
            this.marginTop = 0
        }
    }
}