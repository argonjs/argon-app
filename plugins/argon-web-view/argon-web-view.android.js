"use strict";
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var color_1 = require("color");
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = this;
        _super.call(this);
        this.on(view_1.View.loadedEvent, function () {
            // Make transparent
            _this.backgroundColor = new color_1.Color(0, 255, 255, 255);
            _this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        });
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