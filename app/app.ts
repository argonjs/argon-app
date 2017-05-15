import application = require("application");
if (application.android) {
    application.mainModule = "entry-page"
} else {
    application.mainModule = "main-page"
}
application.cssFile = "./app.css";

/***
 * Creates a performance.now() function
 */
if (!global.performance) {
    global.performance = {};
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
import { handleOpenURL, AppURL } from '@speigg/nativescript-urlhandler';
handleOpenURL((appURL: AppURL) => {
    if (!appURL) return;
    appViewModel.launchedFromUrl = true;
    appViewModel.ready.then(()=>{
        console.log('Received url request: ' + appURL);
        const urlValue = appURL.params.get('url');
        if (urlValue) {
            appViewModel.openUrl(decodeURIComponent(urlValue));
        } else {
            const url = 'https://' + appURL.path;
            appViewModel.openUrl(url);
        }
    });
});

// Google Analytics
import * as analytics from "./components/common/analytics";
if (application.ios) {
    class MyDelegate extends UIResponder implements UIApplicationDelegate {
        public static ObjCProtocols = [UIApplicationDelegate];
        applicationDidFinishLaunchingWithOptions(application: UIApplication, launchOptions: any): boolean {
            analytics.initAnalytics();
            return true;
        }
    }
    application.ios.delegate = MyDelegate;
} else {
    application.on(application.launchEvent, function (args) {
        analytics.initAnalytics();
    });
}

application.start();
