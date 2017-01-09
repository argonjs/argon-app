"use strict";
var application = require("application");
/***
 * Creates a performance.now() function
 */
if (!global.performance) {
    global.performance = {};
}
if (!global.performance.now) {
    if (global.android) {
        global.performance.now = function () {
            return java.lang.System.nanoTime() / 1000000;
        };
    }
    else if (global.ios) {
        global.performance.now = function () {
            return NSProcessInfo.processInfo.systemUptime * 1000;
        };
    }
}
application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();
//# sourceMappingURL=app.js.map