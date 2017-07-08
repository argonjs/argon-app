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
import {setActivityCallbacks, AndroidActivityCallbacks} from "ui/frame";
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
    @JavaProxy("edu.gatech.argon4.MainActivity")
    class Activity extends android.app.Activity {
        private _callbacks: AndroidActivityCallbacks;

        protected onCreate(savedInstanceState: android.os.Bundle): void {
            if (!this._callbacks) {
                setActivityCallbacks(this);
            }
            console.log("*** custom activity onCreate ***");
            this._callbacks.onCreate(this, savedInstanceState, super.onCreate);
        }

        protected onSaveInstanceState(outState: android.os.Bundle): void {
            this._callbacks.onSaveInstanceState(this, outState, super.onSaveInstanceState);
        }

        protected onStart(): void {
            console.log("*** custom activity onStart ***");
            this._callbacks.onStart(this, super.onStart);
        }

        protected onStop(): void {
            console.log("*** custom activity onStop ***");
            this._callbacks.onStop(this, super.onStop);
        }

        protected onDestroy(): void {
            this._callbacks.onDestroy(this, super.onDestroy);
        }

        public onBackPressed(): void {
            this._callbacks.onBackPressed(this, super.onBackPressed);
        }

        public onRequestPermissionsResult(requestCode: number, permissions: Array<String>, grantResults: Array<number>): void {
            console.log("*** custom activity onRequestPermissionsResult ***");
            this._callbacks.onRequestPermissionsResult(this, requestCode, permissions, grantResults, <any>undefined);
        }

        protected onActivityResult(requestCode: number, resultCode: number, data: android.content.Intent): void {
            console.log("*** custom activity onActivityResult ***");
            this._callbacks.onActivityResult(this, requestCode, resultCode, data, super.onActivityResult);
        }

        protected onPause(): void {
            super.onPause();
            console.log("*** onPause ***");
            // note that AndroidActivityCallbacks does not handle onPause!
            // but we need the nativescript application.suspendEvent to fire
            // TODO: figure out how to fix this
            // https://discourse.nativescript.org/t/androidactivitycallbacks-onpause-onresume/1811
        }

        protected onResume(): void {
            super.onResume();
            console.log("*** onResume ***");
            // note that AndroidActivityCallbacks does not handle onResume!
            // but we need the nativescript application.resumeEvent to fire
            // TODO: figure out how to fix this
            // https://discourse.nativescript.org/t/androidactivitycallbacks-onpause-onresume/1811
        }

        protected onNewIntent(intent: android.content.Intent): void {
            super.onNewIntent(intent);
            console.log("*** onNewIntent ***");
            var extras = intent.getExtras();
            if (extras) {
                appViewModel.launchedFromUrl = true;
                appViewModel.ready.then(()=>{
                    var url = extras.getString('url');
                    console.log("*** onNewIntent, url: " + url);
                    handleOpenURL(url);
                });
            }
        }
    }
    console.log("Activity: " + Activity);

    application.on(application.launchEvent, function (args) {
        console.log("*** application.launchEvent ***");
        var extras = args.android.getExtras();
        if (extras) {
            appViewModel.launchedFromUrl = true;
            appViewModel.ready.then(()=>{
                var url = extras.getString('url');
                console.log("*** launchEvent, url: " + url);
                handleOpenURL(url);
            });
        }
        analytics.initAnalytics();
    });
}

application.setCssFileName('./app.css');
application.start(application.android ? 'entry-page' : 'main-page');
