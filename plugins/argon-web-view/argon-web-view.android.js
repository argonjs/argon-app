"use strict";
var common = require('./argon-web-view-common');
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(ArgonWebView.prototype, "progress", {
        get: function () {
            return this.android.getProgress();
        },
        enumerable: true,
        configurable: true
    });
    ArgonWebView.prototype.evaluateJavascript = function (script) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.android.evaluateJavascript(script, function (value) {
                resolve(value);
            });
        });
    };
    ArgonWebView.prototype.bringToFront = function () {
        this.android.bringToFront();
    };
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view.android.js.map