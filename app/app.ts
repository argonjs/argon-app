import * as application from 'application'
import * as builder from 'ui/builder'
import * as view from 'ui/core/view'
import {PropertyChangeData} from 'data/observable'
// import {layout} from 'utils/utils'

import * as URI from 'urijs'

import {debug} from './environment'
import * as app from './app-root'
// import { PropertyChangeData } from 'ui/core/view';

if (debug) {
    global['app'] = app
}

global['__assign'] = global['__assign'] || Object.assign;

// Add performance.now() API 
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


function handleOpenURL(urlString: string) {
    if (!urlString) return;
    app.model.openURI(urlString);
}


if (application.ios) {
    UITextField.appearance().keyboardAppearance = UIKeyboardAppearance.Dark;
    class MyDelegate extends UIResponder implements UIApplicationDelegate {
        public static ObjCProtocols = [UIApplicationDelegate];
        applicationOpenURLOptions(application: UIApplication, url: NSURL, options: any): boolean {
            var urlValue = URI(url.absoluteString).query(true)['url'];
            handleOpenURL(urlValue);
            return true;
        }
    }
    application.ios.delegate = MyDelegate;
} else if (application.android) {
    application.on(application.launchEvent, function (args) {
        const intent = args.android as android.content.Intent
        const extras = intent.getExtras()
        if (extras) handleOpenURL(extras.getString('url'))
    });
}

export namespace AppRootView {
    export const create = () => {
        const rootView = builder.load(__dirname + '/app-root.xml', app)
        
        if (application.ios) {

            const UILayoutViewController = (<any>view.ios.UILayoutViewController) as typeof UIViewController
            const RootViewController = <typeof UIViewController>UIViewController['extend']({
                ...UILayoutViewController.prototype,
                owner: new WeakRef(rootView),
                preferredScreenEdgesDeferringSystemGestures() {
                    return  app.model.uiMode !== 'hidden' || 
                            app.model.layerPresentation !== 'stack' ? 
                                UIRectEdge.None : UIRectEdge.Bottom
                },
                viewWillTransitionToSizeWithTransitionCoordinator(this: UIViewController, size:CGSize, coordinator:UIViewControllerTransitionCoordinator) {
                    UIViewControllerTransitionCoordinator.prototype.animateAlongsideTransitionCompletion.call(coordinator, ()=> {
                        application.notify({eventName:'iosRootViewWillTransitionToSize'});
                    }, () => {
                        application.notify({eventName:'iosRootViewDidTransitionToSize'});
                    });
                    UILayoutViewController.prototype.viewWillTransitionToSizeWithTransitionCoordinator.call(this, size, coordinator);
                }
            }, {
                exposedMethods: {
                    preferredScreenEdgesDeferringSystemGestures: {returns: interop.types.uint32}
                }
            })
            
            const rootViewController = rootView.viewController = RootViewController.new()

            rootView.on('loaded', () => {
                const iosRootView = rootView.ios as UIView
                iosRootView.autoresizingMask = UIViewAutoresizing.FlexibleWidth | UIViewAutoresizing.FlexibleHeight
                rootViewController.view.addSubview(rootView.ios)

                app.model.on('propertyChange', (evt:PropertyChangeData) => {
                    switch (evt.propertyName) {
                        case 'uiMode':
                        case 'layerPresentation':
                            rootViewController.setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
                            break
                    }
                })
            })
        }
        return rootView
    }
}

var imageCache = require("nativescript-web-image-cache");
application.on('launch', ()=>{
    if (application.android) imageCache.initialize()
    if (application.ios) {
        (application.ios.nativeApp as UIApplication).idleTimerDisabled = true
    }
})

application.setCssFileName('./app.css');
application.run(application.android ? 'entry-page' : AppRootView);
// application.run(application.android ? 'entry-page' : 'app-root');
// application.run('app-root')
