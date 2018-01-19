import * as application from 'application';
import * as page from 'ui/page';
import * as frame from 'ui/frame';
import * as color from 'color/color';
// import {layout} from 'utils/utils';
// import {View} from 'ui/core/view';

global['__assign'] = global['__assign'] || Object.assign;

if (frame.isIOS) {
    const UIViewControllerImpl = new page.Page().ios.constructor as typeof UIViewController;
    const MyCustumUIViewController = UIViewController['extend']({
        ...UIViewControllerImpl.prototype,
        // add instance method / property overrides here ...
        preferredScreenEdgesDeferringSystemGestures() {
            return UIRectEdge.All;
        },
        viewWillTransitionToSizeWithTransitionCoordinator(this: UIViewController, size:CGSize, coordinator:UIViewControllerTransitionCoordinator) {
            UIViewControllerTransitionCoordinator.prototype.animateAlongsideTransitionCompletion.call(coordinator, ()=> {
                console.log('viewWillTransition');
                application.notify({eventName:'iosPageViewWillTransitionToSize'});
            }, () => {
                console.log('viewDidTransition');
                application.notify({eventName:'iosPageViewDidTransitionToSize'});
            });
            UIViewControllerImpl.prototype.viewWillTransitionToSizeWithTransitionCoordinator.call(this, size, coordinator);
        },
        viewWillLayoutSubviews() {
            console.log('viewWillLayout');
            UIViewControllerImpl.prototype.viewWillLayoutSubviews.call(this);
            application.notify({eventName:'iosPageViewWillLayoutSubviews'});
        },
        viewDidLayoutSubviews() {
            console.log('viewDidLayout');            
            UIViewControllerImpl.prototype.viewDidLayoutSubviews.call(this);
            application.notify({eventName:'iosPageViewDidLayoutSubviews'});
        }
    });

    // const UINavigationControllerImpl = new frame.Frame().ios.controller.constructor as typeof UINavigationController;
    // UINavigationControllerImpl.prototype['_owner'] = new WeakRef({});
    // const MyCustumUINavigationController = UINavigationController['extend']({
    //     ...UINavigationControllerImpl.prototype,
    //     // add instance method / property overrides here ...
    //     prefersStatusBarHidden() {
    //         console.log('Prefers Hidden');
    //         return true;
    //     }
    // });
    // console.log(MyCustumUINavigationController);

    // const navigate = frame.Frame.prototype.navigate;
    // frame.Frame.prototype.navigate = function(this:frame.Frame, pageModuleName) {
    //     console.trace();
    //     // change to custom uinavigationcontroller
    //     const navController = MyCustumUINavigationController.new();
    //     navController['_owner'] = new WeakRef(this);
    //     Object.defineProperty(navController, 'owner', {get:function(){return this._owner.get()}});
    //     this['viewController'] = this.ios['_controller'] = navController;
    //     this.nativeViewProtected = navController.view;
    //     navigate.call(this, pageModuleName)
    // }

    // workaround for https://github.com/NativeScript/NativeScript/issues/3264
    const performNavigation = frame.Frame.prototype['performNavigation'];
    frame.Frame.prototype['performNavigation'] = function(this:frame.Frame, navigationContext:{entry:frame.BackstackEntry}) {
        // change to custom uiviewcontroller
        const page = navigationContext.entry.resolvedPage;
        const controller = (<typeof UIViewController>MyCustumUIViewController).new();
        controller['_owner'] = new WeakRef(page);
        controller.view.backgroundColor = new color.Color("white").ios;
        page['_ios'] = controller;
        page.setNativeView(controller.view);
        // page.backgroundColor = new color.Color('red');
        // delete page.constructor.prototype.onLayout; // full-screen page
        // delete page.constructor.prototype.onMeasure; // full-screen page
        performNavigation.call(this, navigationContext);
    }

    // frame.Frame.prototype.onMeasure = function(this:frame.Frame, widthMeasureSpec, heightMeasureSpec) {
    //     const width = layout.getMeasureSpecSize(widthMeasureSpec);
    //     const widthMode = layout.getMeasureSpecMode(widthMeasureSpec);

    //     const height = layout.getMeasureSpecSize(heightMeasureSpec);
    //     const heightMode = layout.getMeasureSpecMode(heightMeasureSpec);

    //     const widthAndState = View.resolveSizeAndState(width, width, widthMode, 0);
    //     const heightAndState = View.resolveSizeAndState(height, height, heightMode, 0);

    //     this.setMeasuredDimension(widthAndState, heightAndState);
    // }

    // frame.Frame.prototype['layoutPage'] = function(this:frame.Frame, left, top, right, bottom) {
    //     View.layoutChild(this, this.currentPage, left, top, right, bottom);
    // };

    // frame.topmost().

}


/***
 * Creates a performance.now() function
 */
//Augment the NodeJS global type with our own extensions
declare global {
    namespace NodeJS {
        interface Global {
            performance: {now:()=>number};
        }
    }
}

if (!global.performance) {
    global.performance = <any>{};
}
if (!global.performance.now) {
    if (application.android) {
        global.performance.now = function () {
            return java.lang.System.nanoTime() / 1000000;
        };
    } else if (application.ios) {
        global.performance.now = function() {
            return CACurrentMediaTime() * 1000;
        };
    }
}

import { appViewModel } from './components/common/AppViewModel';
import * as URI from 'urijs';
function handleOpenURL(urlString: string) {
    if (!urlString) return;
    const url = URI(urlString);
    if (url.protocol() !== "http" && url.protocol() !== "https") {
        url.protocol("https");
    }
    var urlValue = url.toString();
    console.log('Received url request: ' + urlValue);
    appViewModel.launchedFromUrl = true;
    if (appViewModel.currentUri === '') {
        appViewModel.loadUrl(urlValue);
    } else {
        appViewModel.openUrl(urlValue);
    };
}

import * as analytics from "./components/common/analytics";
if (application.ios) {
    // UITextField.appearance().keyboardAppearance = UIKeyboardAppearance.Dark;
    
    class MyDelegate extends UIResponder implements UIApplicationDelegate {
        public static ObjCProtocols = [UIApplicationDelegate];
        applicationDidFinishLaunchingWithOptions(application: UIApplication, launchOptions: any): boolean {
            analytics.initAnalytics();
            return true;
        }
        applicationOpenURLOptions(application: UIApplication, url: NSURL, options: any): boolean {
            appViewModel.launchedFromUrl = true;
            appViewModel.ready.then(()=>{
                var urlValue = URI(url.absoluteString).query(true)['url'];
                handleOpenURL(urlValue);
            });
            return true;
        }
    }
    application.ios.delegate = MyDelegate;
} else {
    application.on(application.launchEvent, function (args) {
        var extras = args.android.getExtras();
        if (extras) {
            // TODO: enable url-launch from background state
            appViewModel.launchedFromUrl = true;
            appViewModel.ready.then(()=>{
                var url = extras.getString('url');
                handleOpenURL(url);
            });
        }
        analytics.initAnalytics();
    });
}

application.setCssFileName('./app.css');
application.start(application.android ? 'entry-page' : 'main-page');
