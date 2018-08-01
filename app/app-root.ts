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
import { screenOrientation, getInternalVuforiaKey } from './utils'
import { appModel, BookmarkItem } from './app-model'
import { blur } from './blur'
import config from './config'

import { XRDevice, XRVuforiaDevice } from './xr-device'

//import * as orientationModule from 'nativescript-screen-orientation';
// var orientationModule = require("nativescript-screen-orientation");

export { appModel as model }

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

const OVERLAY_ANIMATION_CURVE = AnimationCurve.cubicBezier(.33, 1.17, .55, .99)
const OVERLAY_ANIMATION_DURATION = 500

let didFirstLayout = false
let isAnimatingOverlay = false
let isPanningOverlay = false
let isEditingURL = false

export const updateUI = () => {
    if (!rootView) return
    if (!didFirstLayout) return

    // console.log('updatingUI')
    // console.log(JSON.stringify(appModel.safeAreaInsets))
    // console.log(JSON.stringify(rootView.getActualSize()))

    // fix layout when extended status bar shown on ios
    if (rootView.ios) {
        const statusBarHeight = (application.ios.nativeApp as UIApplication).statusBarFrame.size.height
        if (statusBarHeight === 40) {
            rootView.translateY = -20
        } else {
            rootView.translateY = 0
        }
    }

    if (rootView.getViewById<Label>('current-title').ios) {
        const uiLabel = rootView.getViewById<Label>('current-title').ios as UILabel
        uiLabel.sizeToFit()
    }

    const layerType = appModel.getLayerType()

    if (screenOrientation === 90 || screenOrientation === -90) {
        hideSystemUI()
    } else if (appModel.uiMode !== 'hidden' || 
                appModel.layerPresentation === 'overview' || 
                layerType === 'page') {
        showSystemUI()
    } else {
        hideSystemUI()
    }

    if (appModel.uiMode !== 'full') {
        setEditingSearchBarText(false)
    }

    if (isPanningOverlay || isAnimatingOverlay) return
    if (appModel.uiMode === 'full') transitionToFullUI()
    if (appModel.uiMode === 'expanded') transitionToExpandedUI()
    if (appModel.uiMode === 'hidden') transitionToHiddenUI()
}

const getOverlayFullModeTop = () => {
    return appModel.safeAreaInsets.top + appModel.overlayTop
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
    if (appModel.uiMode === 'hidden' && appModel.layerPresentation !== 'overview') {
        menuView.translateY = 0
        menuView.opacity = 0
        appModel.uiMode = 'expanded'
    }
    setTimeout(()=>updateUI(),100)
})

application.on(application.uncaughtErrorEvent, (args) => {
    alert(args.error.message + '\n' + args.error.stack)
})

export function onRootViewLoaded(args) {

    checkAndroidWebViewVersion()

    rootView = args.object
    rootView.bindingContext = appModel
    rootView.onLayout = function (...args) {
        GridLayout.prototype.onLayout.apply(this, args)
        setTimeout(() => updateUI())
    }

    mainView = rootView.getViewById<View>('main')
    mainView.originY = 0.35

    browserView = rootView.getViewById<BrowserView>('browser')

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

    // xrDevice = new XRDevice(browserView)

    if (!xrDevice) {
        const vuforiaLicenseKey = getInternalVuforiaKey()
        if (!vuforiaLicenseKey) {
            console.warn("Missing Vuforia License Key!")
            setTimeout(()=>alert(config.MISSING_VUFORIA_KEY_MESSAGE),0)
        }
        xrDevice = vuforiaLicenseKey && vuforia.api ? 
            new XRVuforiaDevice(browserView, vuforiaLicenseKey) : 
            new XRDevice(browserView)
    }

    // permissionMenuView = rootView.getViewById<View>('permissionMenu');

    // Set icon for location permission
    // const locationPermission = rootView.getViewById<Button> ("locationPermission");
    //locationPermission.text = String.fromCharCode(0xe0c8);
    // console.log(String.fromCharCode(0xe0c8));
    // Set icon for camera permission
    // const cameraPermission = rootView.getViewById<Button>("cameraPermission");
    // cameraPermission.text = String.fromCharCode(0xe3b0);

    if (rootView.ios) {

        const rootViewController = rootView.viewController// = RootViewController.new()
        rootViewController.wantsFullScreenLayout = true

        // update safeAreaInsets
        rootViewController.view.addObserverForKeyPathOptionsContext(new class SafeAreaObserver extends NSObject {
            observeValueForKeyPathOfObjectChangeContext(keyPath, object, change) {
                updateSafeAreaInsets()
            }
        }, 'safeAreaInsets', NSKeyValueObservingOptions.Initial, <any>null)
        appModel.safeAreaInsets = rootViewController.view.safeAreaInsets

        // hack to allow fullscreen layout
        // see https://github.com/NativeScript/NativeScript/blob/2fc1d8a8d4cf64e98eb98296e21564ac9b508f95/tns-core-modules/ui/core/view/view.ios.ts#L636
        rootViewController.addChildViewController(UIViewController.alloc().init());
    }

    if (application.ios) {
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
        (overlayScrollView.ios as UIScrollView).scrollEnabled = appModel.overlayScrollEnabled
        appModel.on('propertyChange', (evt: PropertyChangeData) => {
            if (evt.propertyName === 'overlayScrollEnabled') {
                (overlayScrollView.ios as UIScrollView).scrollEnabled = appModel.overlayScrollEnabled;
            }
        })
    }

    if (overlayScrollView.android) {
        (overlayScrollView.android as android.widget.ScrollView).setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function (view, motionEvent) {
                return appModel.overlayScrollEnabled;
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

    overlayView.on(GestureTypes.pan, (evt: PanGestureEventData) => {

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
        }

        panEventCount++

        if (startedPanAboveScrollView || scrollY === 0 && evt.deltaY > 0 && panEventCount < 10) {
            appModel.overlayScrollEnabled = false
        }
        // console.log("scrollY " + scrollY)
        // console.log("deltaY " + evt.deltaY)
        // console.log("isAnimating " + isAnimatingOverlay)
        // console.log("isScrollEnabled " + appModel.overlayScrollEnabled)

        if (appModel.overlayScrollEnabled || 
            isAnimatingOverlay || 
            appModel.layerPresentation === 'overview') 
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

        overlayView.translateY = startViewTranslateY + evt.deltaY
        if (overlayView.translateY < appModel.overlayTop) {
            overlayView.translateY = appModel.overlayTop - Math.pow(Math.abs(overlayView.translateY - appModel.overlayTop), 0.5)
            if (overlayView.translateY < 0) overlayView.translateY = 0
        }

        if (appModel.uiMode === 'hidden') {
            const hiddenTop = getOverlayHiddenModeTop()                
            const displacementY = overlayView.translateY - hiddenTop
            overlayInnerView.opacity = Math.max(Math.min(-displacementY / 40, 1), 0.1)
        }

        if (evt.state === GestureStateTypes.ended || evt.state === GestureStateTypes.cancelled) {
            isPanningOverlay = false
            const fullTop = getOverlayFullModeTop()
            const expandedTop = getOverlayExpandedModeTop()
            const hiddenTop = getOverlayHiddenModeTop()

            if (appModel.uiMode === 'full') {
                if (velocityY < 20 || overlayView.translateY < fullTop + 20) {
                    appModel.uiMode = 'full'
                } else {
                    appModel.uiMode = 'expanded'
                }
            } else if (appModel.uiMode === 'expanded') {
                const displacementY = overlayView.translateY - expandedTop
                if (Math.abs(displacementY) < 20 && Math.abs(velocityY) < 20) {
                    appModel.uiMode = 'expanded'
                } else if (displacementY < -20 || velocityY < -20) {
                    appModel.uiMode = 'full'
                } else if (displacementY > 20 || velocityY > 20) {
                    appModel.uiMode = 'hidden'
                  }
            } else { // hidden
                const displacementY = overlayView.translateY - hiddenTop 
                if (displacementY < -20 || velocityY < -20) {
                    appModel.uiMode = 'expanded' 
                } else {
                    appModel.uiMode = 'hidden'
                }
            }

            if (androidVelocityTracker) {
                androidVelocityTracker.recycle()
            }
            
            updateUI()
        }
    })

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

export function updateSafeAreaInsets() {
    if (rootView.ios) {
        const safeAreaInsets = (rootView.viewController as UIViewController).view.safeAreaInsets
        if (appModel.safeAreaInsets.top !== safeAreaInsets.top ||
            appModel.safeAreaInsets.bottom !== safeAreaInsets.bottom ||
            appModel.safeAreaInsets.left !== safeAreaInsets.left ||
            appModel.safeAreaInsets.right !== safeAreaInsets.right) {
            // console.log(JSON.stringify(safeAreaInsets))
            appModel.safeAreaInsets = safeAreaInsets
            updateUI()
        }
    }
}

export function setEditingSearchBarText(value: boolean) {
    if (value && !isEditingURL) {

        appModel.uiMode = 'full'

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

        searchBar.bind({ targetProperty: "text", sourceProperty: "focussedLayer.content.uri" }, appModel)
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

    if (appModel.getLayerType() === 'page' && appModel.uiMode === 'full') {
        topView.animate({
            scale: {x:1,y:0},
            curve: AnimationCurve.easeInOut,
            duration: OVERLAY_ANIMATION_DURATION / 2
        })
        browserView.animate({
            translate:{x:0,y:-appModel.safeAreaInsets.top},
            curve: AnimationCurve.easeInOut,
            duration: OVERLAY_ANIMATION_DURATION / 2
        })
    } else {
        topView.animate({
            scale: {x:1,y:1},
            curve: AnimationCurve.easeInOut,
            duration: OVERLAY_ANIMATION_DURATION / 2
        })
        browserView.animate({
            translate:{x:0,y:0},
            curve: AnimationCurve.easeInOut,
            duration: OVERLAY_ANIMATION_DURATION / 2
        })
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
        scale: {x:1,y:0},
        curve: AnimationCurve.easeInOut,
        duration: OVERLAY_ANIMATION_DURATION / 2
    })

    browserView.animate({
        translate:{x:0,y:0},
        curve: AnimationCurve.easeInOut,
        duration: OVERLAY_ANIMATION_DURATION / 2
    })
}


function transitionToFullUI() {
    appModel.uiMode = 'full'
    
    isAnimatingOverlay = true
    overlayView.animate({
        translate: {
            x: 0,
            y: getOverlayFullModeTop()
        },
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    }).then(() => {
        appModel.overlayScrollEnabled = true
        isAnimatingOverlay = false
    }).catch(() => {
        appModel.overlayScrollEnabled = true
        isAnimatingOverlay = false
    })

    overlayInnerView.animate({
        opacity: 1,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    mainView.animate({
        scale: { x: 0.9, y: 0.9 },
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
    appModel.uiMode = 'expanded'

    setEditingSearchBarText(false)
    isAnimatingOverlay = true
    appModel.overlayScrollEnabled = false

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
        scale: { x: 1, y: 1 },
        opacity: 1,
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })

    menuView.animate({
        opacity: 1,
        translate: {x:0, y: -(rootView.getActualSize().height - overlayTop)},
        duration: OVERLAY_ANIMATION_DURATION,
        curve: OVERLAY_ANIMATION_CURVE
    })
}

function transitionToHiddenUI() {
    appModel.uiMode = 'hidden'

    setEditingSearchBarText(false)
    isAnimatingOverlay = true
    appModel.overlayScrollEnabled = false

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
    appModel.loadURI(item.uri)
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
    appModel.loadURI(searchBar.text)
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

export function onReload(args) {
    appModel.loadURI(appModel.getLayerURI())
}

export function onOverview(args) {
    appModel.layerPresentation = 'overview'
    appModel.uiMode = 'hidden'
    updateUI()
}

export function onViewerToggle(args) {
    appModel.immersiveStereoEnabled = !appModel.immersiveStereoEnabled
}

export function onDebugToggle(args) {
    appModel.debugEnabled = !appModel.debugEnabled
}