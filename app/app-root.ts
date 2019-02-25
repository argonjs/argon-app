import * as application from 'application'
import * as utils from 'utils/utils'
// import * as frame from 'ui/frame'
import { SearchBar } from 'ui/search-bar'
// import { Button } from 'ui/button'
import { View } from 'ui/core/view'
import { GridLayout } from 'ui/layouts/grid-layout'
import { ScrollView } from 'ui/scroll-view'
import { HtmlView } from 'ui/html-view'
import { Label } from 'ui/label'
import { Color } from 'color'
import { PropertyChangeData } from 'data/observable'
import { AnimationCurve } from 'ui/enums'
import { GestureTypes, PanGestureEventData, GestureStateTypes } from 'ui/gestures'
import * as applicationSettings from 'application-settings'
import * as dialogs from 'ui/dialogs'
import { screen } from 'platform'

import * as vuforia from 'nativescript-vuforia'
import { BrowserView } from './components/browser-view'
import { screenOrientation, getInternalVuforiaKey, useTransformsWithoutChangingSafeArea } from './utils'
import { appModel, BookmarkItem } from './app-model'
import { blur } from './blur'
import config from './config'

import { XRDevice, XRVuforiaDevice } from './xr-device'

import {TapticEngine} from "nativescript-taptic-engine";
let tapticEngine = new TapticEngine();

//import * as orientationModule from 'nativescript-screen-orientation';
// var orientationModule = require("nativescript-screen-orientation");

export const model = appModel

export let xrDevice: XRDevice
export let rootView: GridLayout

export let mainView: View

export let browserView: BrowserView
export let bookmarksView: View
export let realityChooserView: View
export let debugView: View

export let topView: View
export let overlayView: View
export let overlayInnerView: View
export let overlayScrollView: ScrollView
export let overlayScrollSeparator: View;
export let searchBar: SearchBar
export let detailsView: View

export let menuView: View
export let permissionMenuView: View

// disable Nativescript's safe area support, since safe area
// isn't stable when translating/scaling UIView heirarchies
const ZERO_INSET = Object.seal({left:0,top:0,right:0,bottom:0})
View.prototype['applySafeAreaInsets'] = function() {}
View.prototype['getSafeAreaInsets'] = function() { return ZERO_INSET }

// const originalOnLoaded = View.prototype.onLoaded
// View.prototype.onLoaded = function() {
//     originalOnLoaded.call(this)
//     if (this.ios) {
//         const view = this.ios as UIView
//         view.safeAreaInsets
//     }
// }

const OVERLAY_ANIMATION_CURVE = AnimationCurve.cubicBezier(0.33,1,0.55,1) // AnimationCurve.cubicBezier(.33, 1.17, .55, .99)
const OVERLAY_ANIMATION_DURATION = 500

let didFirstLayout = false
let isAnimatingOverlay = false
let isPanningOverlay = false
let isEditingURL = false

export const updateUI = () => {
    if (!rootView) return

    updateScreenSize()
    updateSafeAreaInsets()

    const layerImmersiveMode = model.getLayerImmersiveMode()

    if (screenOrientation === 90 || screenOrientation === -90) {
        hideSystemUI()
    } else if (model.uiMode !== 'hidden' || 
                model.layerPresentation === 'overview' || 
                layerImmersiveMode === 'none') {
        showSystemUI()
    } else {
        hideSystemUI()
    }

    if (model.uiMode !== 'full') {
        setEditingSearchBarText(false)
    }

    if (isPanningOverlay || isAnimatingOverlay) return
    if (model.uiMode === 'full') transitionToFullUI()
    if (model.uiMode === 'expanded') transitionToExpandedUI()
    if (model.uiMode === 'hidden') transitionToHiddenUI()

    overlayView.requestLayout()
}

const getOverlayFullModeTop = () => {
    return model.safeAreaInsets.top + model.overlayTop
}

const getOverlayExpandedModeTop = () => {
    const urlBarContainerHeight = (searchBar.parent as View).getActualSize().height
    const detailsViewHeight = detailsView.getActualSize().height
    const rootViewHeight = rootView.getActualSize().height
    return rootViewHeight - urlBarContainerHeight - detailsViewHeight
}

const getOverlayHiddenModeTop = () => {
    return rootView.getActualSize().height - 25
}

const getScrollY = () => {
    if (overlayScrollView.ios) {
        return (overlayScrollView.ios as UIScrollView).contentOffset.y
    }
    if (overlayScrollView.android) {
        return (overlayScrollView.android as android.widget.ScrollView).getScrollY()
    }
    return 0
}

let didWebViewCheck = false
const MIN_ANDROID_WEBVIEW_VERSION = 56;
const IGNORE_WEBVIEW_UPGRADE_KEY = 'ignore_webview_upgrade';
const checkAndroidWebViewVersion = () => {
    if (didWebViewCheck) return
    didWebViewCheck = true

    if (applicationSettings.hasKey(IGNORE_WEBVIEW_UPGRADE_KEY)) {
        didWebViewCheck = true;
        return;
    }

    if (application.android) {
        const webView = new android.webkit.WebView(application.android.context)
        const settings = webView.getSettings();
        const userAgent = settings.getUserAgentString();
        const regex = /Chrome\/([0-9]+)/i;
        const match = regex.exec(userAgent);
        const version = (match != null && match.length > 1) ? Number(match[1]) : -1

        console.log("android webview version: " + version);
        if (version < MIN_ANDROID_WEBVIEW_VERSION) {
            dialogs.confirm({
                title: "Upgrade WebView",
                message: "Your Android System WebView is out of date. We suggest at least version " + MIN_ANDROID_WEBVIEW_VERSION + ", your device currently has version " + version + ". This may result in rendering issues. Please update via the Google Play Store.",
                okButtonText: "Upgrade",
                cancelButtonText: "Later",
                neutralButtonText: "Ignore"
            }).then(function (result) {
                if (result) {
                    console.log("upgrading webview");
                    const intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                    intent.setData(android.net.Uri.parse("market://details?id=com.google.android.webview"));
                    application.android.startActivity.startActivity(intent);
                } else if (result === undefined) {
                    console.log("upgrade never");
                    applicationSettings.setBoolean(IGNORE_WEBVIEW_UPGRADE_KEY, true);
                } else if (result === false) {
                    console.log("upgrade later");
                }
            });
        }
    }
}

application.on('iosRootViewDidTransitionToSize', () => setTimeout(() => {
    updateUI()
    for (const layer of browserView.layers) {
        if (layer.webView) {
            const wkWebView = layer.webView.ios as WKWebView
            wkWebView.scrollView.setZoomScaleAnimated(1, false)
        }
    }
}) )

application.on(application.resumeEvent, () => {
    if (model.uiMode === 'hidden' && model.layerPresentation !== 'overview') {
        menuView.translateY = 0
        menuView.opacity = 0
        model.uiMode = 'expanded'
    }
    setTimeout(()=>updateUI(),100)
})

application.on(application.uncaughtErrorEvent, (args) => {
    alert(args.error.message + '\n' + args.error.stack)
})

export function onRootViewLoaded(args) {

    checkAndroidWebViewVersion()

    appModel.uiMode = 'expanded'

    rootView = args.object
    rootView.bindingContext = model
    rootView.on('layoutChanged', () => {
        setTimeout(() => updateUI())
    })

    mainView = rootView.getViewById<View>('main')
    mainView.originY = 0
    useTransformsWithoutChangingSafeArea(mainView)

    browserView = rootView.getViewById<BrowserView>('browser')
    useTransformsWithoutChangingSafeArea(browserView)


    // bookmarksView = rootView.getViewById<View>('bookmarks')
    // realityChooserView = rootView.getViewById<View>('reality-chooser');
    debugView = rootView.getViewById<HtmlView>("debug");

    topView = rootView.getViewById('top')
    topView.originY = 0

    overlayView = rootView.getViewById<View>('overlay')
    overlayInnerView = rootView.getViewById<View>('overlay-inner')
    overlayScrollView = rootView.getViewById<ScrollView>('overlay-scroll')
    overlayScrollSeparator = rootView.getViewById<View>('overlay-scroll-separator')
    searchBar = rootView.getViewById<SearchBar>('search-bar')
    detailsView = rootView.getViewById<View>('details')

    menuView = rootView.getViewById<View>('menu');

    if (!xrDevice) {
        const vuforiaLicenseKey = getInternalVuforiaKey()
        if (!vuforiaLicenseKey) {
            console.warn("Missing Vuforia License Key!")
            setTimeout(()=>alert(config.MISSING_VUFORIA_KEY_MESSAGE),0)
        }
        xrDevice = vuforiaLicenseKey && vuforia.api ? 
            new XRVuforiaDevice(vuforiaLicenseKey) : 
            new XRDevice()
    }
    xrDevice.browserView = browserView

    // permissionMenuView = rootView.getViewById<View>('permissionMenu');

    // Set icon for location permission
    // const locationPermission = rootView.getViewById<Button> ("locationPermission");
    // locationPermission.text = String.fromCharCode(0xe0c8);
    // console.log(String.fromCharCode(0xe0c8));
    // Set icon for camera permission
    // const cameraPermission = rootView.getViewById<Button>("cameraPermission");
    // cameraPermission.text = String.fromCharCode(0xe3b0);

    if (rootView.ios) {

        const rootViewController = rootView.viewController as UIViewController // = RootViewController.new()
        rootViewController.wantsFullScreenLayout = true

        // update safeAreaInsets
        rootViewController.view.addObserverForKeyPathOptionsContext(new class SafeAreaObserver extends NSObject {
            observeValueForKeyPathOfObjectChangeContext(keyPath, object, change) {
                updateSafeAreaInsets()
                setTimeout(() => updateUI())
            }
        }, 'safeAreaInsets', NSKeyValueObservingOptions.Initial, <any>null)
        model.safeAreaInsets = rootViewController.view.safeAreaInsets

        // hack to allow fullscreen layout
        // see https://github.com/NativeScript/NativeScript/blob/2fc1d8a8d4cf64e98eb98296e21564ac9b508f95/tns-core-modules/ui/core/view/view.ios.ts#L636
        // rootViewController.addChildViewController(UIViewController.alloc().init());
    }

    if (application.ios) {
        // application.ios.window.layer.speed = 0.5
        // blur views on ios
        blur(topView, 3, 'dark')
        blur(menuView, 3, 'dark')
        blur(rootView.getViewById('overlay-inner'), 3, 'dark')
    } else {
        // TODO: set transparent background color
    }

    // setup the debug view
    debugView.horizontalAlignment = 'stretch';
    debugView.verticalAlignment = 'stretch';
    debugView.backgroundColor = new Color(150, 255, 255, 255);
    debugView.visibility = "collapse";
    debugView.isUserInteractionEnabled = false;

    if (searchBar.ios) {
        const iosSearchBar = (searchBar.ios as UISearchBar);
        const iosTextField: UITextField = iosSearchBar.valueForKey("searchField");
        iosSearchBar.autocapitalizationType = UITextAutocapitalizationType.None;
        iosSearchBar.searchBarStyle = UISearchBarStyle.Minimal;
        iosSearchBar.returnKeyType = UIReturnKeyType.Go;
        iosSearchBar.keyboardType = UIKeyboardType.WebSearch;
        iosTextField.clearButtonMode = UITextFieldViewMode.WhileEditing
        iosTextField.leftViewMode = UITextFieldViewMode.Never
    }

    // setup bottom-ui dragging

    if (overlayScrollView.ios) {
        (overlayScrollView.ios as UIScrollView).scrollEnabled = model.overlayScrollEnabled
        model.on('propertyChange', (evt: PropertyChangeData) => {
            if (evt.propertyName === 'overlayScrollEnabled') {
                (overlayScrollView.ios as UIScrollView).scrollEnabled = model.overlayScrollEnabled;
            }
        })
    }

    if (overlayScrollView.android) {
        (overlayScrollView.android as android.widget.ScrollView).setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function (view, motionEvent) {
                return model.overlayScrollEnabled;
            }
        }))
    }

    overlayScrollView.on('scroll', () => {
        const scrollY = getScrollY()
        overlayScrollSeparator.opacity = scrollY > 0 ? 1 : 0;
        searchBar.dismissSoftInput()
    })

    const DISPLAY_DENSITY = utils.layout.getDisplayDensity()
    let panEventCount = 0
    let startViewTranslateY = 0
    let startPanPositionY = 0
    let startedPanAboveScrollView = false
    let androidVelocityTracker: android.view.VelocityTracker;

    const handlePanGesture = (evt: PanGestureEventData) => {
        
        updateSafeAreaInsets()

        let scrollY = getScrollY()

        if (evt.state === GestureStateTypes.began) {
            startViewTranslateY = overlayView.translateY
            if (evt.ios) {
                startPanPositionY = (evt.ios as UIPanGestureRecognizer).locationInView(evt.view.ios).y
            }
            if (evt.android) {
                startPanPositionY = (evt.android.currentEvent as android.view.MotionEvent).getRawY() / DISPLAY_DENSITY
                androidVelocityTracker = android.view.VelocityTracker.obtain()
            }

            startedPanAboveScrollView = startPanPositionY < overlayScrollView.getLocationRelativeTo(overlayView).y
            panEventCount = 0
            overlayView.requestLayout()
        }

        panEventCount++

        if (startedPanAboveScrollView || scrollY === 0 && evt.deltaY > 0 && panEventCount < 10) {
            model.overlayScrollEnabled = false
        }
        // console.log("scrollY " + scrollY)
        // console.log("deltaY " + evt.deltaY)
        // console.log("isAnimating " + isAnimatingOverlay)
        // console.log("isScrollEnabled " + model.overlayScrollEnabled)

        if (model.overlayScrollEnabled || 
            isAnimatingOverlay || 
            model.layerPresentation === 'overview') 
            return;

        isPanningOverlay = true

        let velocityY = 0
        if (evt.ios) {
            velocityY = (evt.ios as UIPanGestureRecognizer).velocityInView(evt.view.ios).y
        }
        if (evt.android) {
            androidVelocityTracker.addMovement(evt.android.currentEvent)
            velocityY = androidVelocityTracker.getYVelocity()
        }

        let translateY = startViewTranslateY + evt.deltaY
        if (translateY < model.overlayTop) {
            translateY = model.overlayTop - Math.pow(Math.abs(translateY - model.overlayTop), 0.5)
            if (translateY < 0) translateY = 0
        }
        overlayView.translateY = translateY

        if (model.uiMode === 'hidden') {
            const hiddenTop = getOverlayHiddenModeTop()                
            const displacementY = overlayView.translateY - hiddenTop
            overlayInnerView.opacity = Math.max(Math.min(-displacementY / 40, 1), 0.1)
        }

        if (evt.state === GestureStateTypes.ended || evt.state === GestureStateTypes.cancelled) {
            isPanningOverlay = false
            const fullTop = getOverlayFullModeTop()
            const expandedTop = getOverlayExpandedModeTop()
            const hiddenTop = getOverlayHiddenModeTop()

            if (model.uiMode === 'full') {
                if (velocityY < 20 || overlayView.translateY < fullTop + 20) {
                    model.uiMode = 'full'
                } else {
                    model.uiMode = 'expanded'
                }
            } else if (model.uiMode === 'expanded') {
                const displacementY = overlayView.translateY - expandedTop
                if (Math.abs(displacementY) < 20 && Math.abs(velocityY) < 20) {
                    model.uiMode = 'expanded'
                } else if (displacementY < -20 || velocityY < -20) {
                    model.uiMode = 'full'
                } else if (displacementY > 20 || velocityY > 20) {
                    model.uiMode = 'hidden'
                  }
            } else { // hidden
                const displacementY = overlayView.translateY - hiddenTop 
                if (displacementY < -20 || velocityY < -20) {
                    model.uiMode = 'expanded' 
                } else {
                    model.uiMode = 'hidden'
                }
            }

            if (androidVelocityTracker) {
                androidVelocityTracker.recycle()
            }
            
            updateUI()
        }
    }

    overlayView.on(GestureTypes.pan, handlePanGesture)

    // if (rootView.ios) {
    //     class EdgePanGestureTarget extends NSObject {
    //         handleEdgePan() {
    //             // if (model.uiMode == 'hidden' && !isPanningOverlay) {
    //                 let state:GestureStateTypes = GestureStateTypes.began
    //                 switch (recognizer.state) {
    //                     case UIGestureRecognizerState.Began: 
    //                         state = GestureStateTypes.began; break;
    //                     case UIGestureRecognizerState.Ended: 
    //                         state = GestureStateTypes.ended; break;
    //                     case UIGestureRecognizerState.Changed: 
    //                         state = GestureStateTypes.changed; break;
    //                     case UIGestureRecognizerState.Failed: 
    //                     case UIGestureRecognizerState.Cancelled: 
    //                         state = GestureStateTypes.cancelled; break;
    //                     default: break;
    //                 }

    //                 handlePanGesture({
    //                     deltaX: recognizer.translationInView(iosRootView).x,
    //                     deltaY: recognizer.translationInView(iosRootView).y,
    //                     state, 
    //                     view: rootView,
    //                     ios: recognizer,
    //                     android: null,
    //                     type: GestureTypes.pan,
    //                     eventName: '' + GestureTypes.pan,
    //                     object: rootView
    //                 })
    //             // }
    //         }
    //         static ObjCExposedMethods = {
    //             'handleEdgePan': { returns: interop.types.void, params: [] }
    //         } 
    //     }

    //     const iosRootView = rootView.ios as UIView
    //     const target = rootView['_edgePanGestureTarget'] = EdgePanGestureTarget.alloc().init()
    //     const action = 'handleEdgePan'
    //     const recognizer = UIScreenEdgePanGestureRecognizer.alloc().initWithTargetAction(target, action)
    //     recognizer.edges = UIRectEdge.Bottom
    //     iosRootView.addGestureRecognizer(recognizer)
    // }

    if (!didFirstLayout) {
        overlayView.translateY = Math.max(screen.mainScreen.heightDIPs, screen.mainScreen.widthDIPs)
    }

    const onFirstLayout = ()=>{
        didFirstLayout = true
        rootView.off('layoutChanged', onFirstLayout)
        setTimeout(() => updateUI())
    }
    rootView.on('layoutChanged', onFirstLayout)
}

export function updateScreenSize() {
    if (model.screenSize.width !== screen.mainScreen.widthDIPs ||
        model.screenSize.height !== screen.mainScreen.heightDIPs) {
            model.screenSize = {
                width: screen.mainScreen.widthDIPs,
                height: screen.mainScreen.heightDIPs
            }
        }
}

export function updateSafeAreaInsets() {
    if (rootView.ios) {
        const safeAreaInsets = (rootView.viewController as UIViewController).view.safeAreaInsets
        if (!safeAreaInsets) return
        if (model.safeAreaInsets.top !== safeAreaInsets.top ||
            model.safeAreaInsets.bottom !== safeAreaInsets.bottom ||
            model.safeAreaInsets.left !== safeAreaInsets.left ||
            model.safeAreaInsets.right !== safeAreaInsets.right) {
            // console.log(JSON.stringify(safeAreaInsets))
            model.safeAreaInsets = safeAreaInsets
        }
    }
}

export function setEditingSearchBarText(value: boolean) {
    if (value && !isEditingURL) {

        model.uiMode = 'full'

        if (searchBar.ios) {
            const iosSearchBar = searchBar.ios as UISearchBar
            const iosTextField: UITextField = iosSearchBar.valueForKey("searchField");
            iosSearchBar.setShowsCancelButtonAnimated(true, true)
            iosTextField.becomeFirstResponder()
            iosTextField.selectedTextRange = iosTextField.textRangeFromPositionToPosition(iosTextField.beginningOfDocument, iosTextField.endOfDocument);
            setTimeout(() => {
                iosTextField.selectedTextRange = iosTextField.textRangeFromPositionToPosition(iosTextField.beginningOfDocument, iosTextField.endOfDocument);
            }, 500)
        }

        searchBar.unbind('text')
        searchBar.focus()

    } else if (!value && isEditingURL) {

        if (searchBar.ios) {
            const iosSearchBar = (searchBar.ios as UISearchBar);
            iosSearchBar.setShowsCancelButtonAnimated(false, true);
        }

        searchBar.bind({ targetProperty: "text", sourceProperty: "focussedLayer.content.uri" }, model)
        searchBar.dismissSoftInput();

    }

    isEditingURL = value;
};

export function showSystemUI() {
    if (application.ios) {
        (application.ios.nativeApp as UIApplication).setStatusBarHiddenWithAnimation(false, UIStatusBarAnimation.Slide);
    }

    if (application.android) {
        let window = application.android.foregroundActivity.getWindow();
        let decorView = window.getDecorView();
        let uiOptions = (<any>android.view.View).SYSTEM_UI_FLAG_VISIBLE;
        decorView.setSystemUiVisibility(uiOptions);
    }

    if (model.getLayerImmersiveMode() === 'none' && model.uiMode === 'full') {
        topView.animate({
            scale: { x:1, y: 0 },
            duration: 300,
            curve: AnimationCurve.easeInOut
        })
        // browserView.animate({
        //     translate:{x:0,y:-model.safeAreaInsets.top},
        //     curve: AnimationCurve.easeInOut,
        //     duration: OVERLAY_ANIMATION_DURATION / 2
        // })
    } else {
        topView.animate({
            scale: { x:1, y: 1 },
            duration: 300,
            curve: AnimationCurve.easeInOut
        })
        // browserView.animate({
        //     translate:{x:0,y:0},
        //     curve: AnimationCurve.easeInOut,
        //     duration: OVERLAY_ANIMATION_DURATION
        // })
    }
}

export function hideSystemUI() {

    if (application.ios) {
        (application.ios.nativeApp as UIApplication).setStatusBarHiddenWithAnimation(true, UIStatusBarAnimation.Slide);
    }

    if (application.android) {
        let window = application.android.foregroundActivity.getWindow();
        let decorView = window.getDecorView();
        let uiOptions = (<any>android.view.View).SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | (<any>android.view.View).SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | (<any>android.view.View).SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | (<any>android.view.View).SYSTEM_UI_FLAG_LAYOUT_STABLE
            | (<any>android.view.View).SYSTEM_UI_FLAG_FULLSCREEN
            | (<any>android.view.View).SYSTEM_UI_FLAG_HIDE_NAVIGATION;
        decorView.setSystemUiVisibility(uiOptions);
    }

    topView.animate({
        scale: { x:1, y: 0 },
        duration: 300,
        curve: AnimationCurve.easeInOut
    })

    // browserView.animate({
    //     translate:{x:0,y:0},
    //     curve: AnimationCurve.easeInOut,
    //     duration: OVERLAY_ANIMATION_DURATION / 2
    // })
}


function transitionToFullUI() {
    model.uiMode = 'full'
    
    isAnimatingOverlay = true
    overlayView.animate({
        translate: {
            x: 0,
            y: getOverlayFullModeTop()
        },
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    }).then(() => {
        model.overlayScrollEnabled = true
        isAnimatingOverlay = false
    }).catch(() => {
        model.overlayScrollEnabled = true
        isAnimatingOverlay = false
    })

    overlayInnerView.animate({
        opacity: 1,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    mainView.animate({
        scale: { x: 0.9, y: 0.9 },
        translate: { x:0, y: appModel.safeAreaInsets.top },
        opacity: 0.5,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    menuView.animate({
        opacity: 0,
        translate: {x:0, y: 0},
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })
}

function transitionToExpandedUI() {
    model.uiMode = 'expanded'

    setEditingSearchBarText(false)
    isAnimatingOverlay = true
    model.overlayScrollEnabled = false

    const overlayTop = getOverlayExpandedModeTop()

    overlayView.animate({
        translate: {
            x: 0,
            y: overlayTop
        },
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    }).then(() => {
        isAnimatingOverlay = false
    }).catch(() => {
        isAnimatingOverlay = false
    })

    overlayInnerView.animate({
        opacity: 1,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    mainView.animate({
        translate: { x:0, y: 0 },
        scale: { x: 1, y: 1 },
        opacity: 1,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    menuView.animate({
        opacity: 1,
        translate: {x:0, y: -(rootView.getActualSize().height - overlayTop )},
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })
}

function transitionToHiddenUI() {
    model.uiMode = 'hidden'

    setEditingSearchBarText(false)
    isAnimatingOverlay = true
    model.overlayScrollEnabled = false

    overlayView.animate({
        translate: {
            x: 0,
            y: rootView.getActualSize().height - 25
        },
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    }).then(() => {
        isAnimatingOverlay = false
    }).catch(() => {
        isAnimatingOverlay = false
    })

    overlayInnerView.animate({
        opacity: 0,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    mainView.animate({
        scale: { x: 1, y: 1 },
        opacity: 1,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    menuView.animate({
        opacity: 0,
        translate: {x:0, y: 0},
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })
}

export function onBookmarkItemTap(args) {
    const item = (args.object as View).bindingContext as BookmarkItem
    model.loadURI(item.uri)
}

// set bookmark labels to a max of 2 lines
const maxBookmarkItemLabelLines = 2
export function onBookmarkItemLabel(args) {
    const label = args.object
    if (label.android) {
        label.android.setMaxLines(maxBookmarkItemLabelLines);
        label.android.setEllipsize(android.text.TextUtils.TruncateAt.END);
    } else if (label.ios) {
        const iosLabel = label.ios as UILabel
        iosLabel.numberOfLines = maxBookmarkItemLabelLines;
        iosLabel.lineBreakMode = NSLineBreakMode.ByTruncatingTail;
    }
}

// fix multiline label size calcuation for ios
if (application.ios) {
    Label.prototype['_measureNativeView'] = function (width: number, widthMode: number, height: number, heightMode: number): { width: number, height: number } {
        const view = <UILabel>this.nativeViewProtected;

        const nativeSize = view.textRectForBoundsLimitedToNumberOfLines(
            CGRectMake(
                0,
                0,
                widthMode === 0 /* layout.UNSPECIFIED */ ? Number.POSITIVE_INFINITY : utils.layout.toDeviceIndependentPixels(width),
                heightMode === 0 /* layout.UNSPECIFIED */ ? Number.POSITIVE_INFINITY : utils.layout.toDeviceIndependentPixels(height)
            ), maxBookmarkItemLabelLines).size;

        nativeSize.width = utils.layout.round(utils.layout.toDevicePixels(nativeSize.width));
        nativeSize.height = utils.layout.round(utils.layout.toDevicePixels(nativeSize.height));
        return nativeSize;
    }
}

export function onSearchBarTap(args) {
    setEditingSearchBarText(true)
    updateUI()
}

export function onSearchBarSubmit(args) {
    model.loadURI(searchBar.text)
}

export function onSearchBarClear(args) {
    if (searchBar.ios) {
        const iosSearchBar = (searchBar.ios as UISearchBar);
        if (!iosSearchBar.isFirstResponder) {
            setEditingSearchBarText(false)
            updateUI()
        }
    }
}

if (application.ios) {
    const textFieldEditHandler = (notification: NSNotification) => {
        const iosSearchBar = (searchBar.ios as UISearchBar);
        const iosTextField: UITextField = iosSearchBar.valueForKey("searchField");
        if (notification.object !== iosTextField) return;
        setEditingSearchBarText(true)
        updateUI()
    }
    application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
    // application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);    
}

export function onAddChannel(args) {

}

export function onToggleFlash(args) {
    tapticEngine.selection()
    model.flashEnabled = !model.flashEnabled
}

export function onReload(args) {
    tapticEngine.selection()
    model.loadURI(model.getLayerURI())
}

export function onToggleFavorite(args) {
    tapticEngine.selection()
    model.onToggleFavorite(args)
}

export function onOverview(args) {
    tapticEngine.selection()
    model.layerPresentation = 'overview'
    model.uiMode = 'hidden'
    updateUI()
}

export function onToggleViewer(args) {
    tapticEngine.selection()
    model.immersiveStereoEnabled = !model.immersiveStereoEnabled
}

export function onToggleDebug(args) {
    tapticEngine.selection()
    model.debugEnabled = !model.debugEnabled
}