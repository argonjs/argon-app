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

application.start();
