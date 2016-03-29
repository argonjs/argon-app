"use strict";
var common = require('./argon-web-view-common');
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(ArgonWebView.prototype, "progress", {
        get: function () {
            // TODO
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    ArgonWebView.prototype.evaluateJavascript = function () {
        // TODO
        return Promise.resolve();
    };
    ArgonWebView.prototype.bringToFront = function () {
        // TODO
    };
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view.android.js.map