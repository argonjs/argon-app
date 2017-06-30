import application = require("application");

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
