"use strict";
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var color_1 = require("color");
var AndroidWebInterface = io.argonjs.AndroidWebInterface;
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = this;
        _super.call(this);
        this.on(view_1.View.loadedEvent, function () {
            _this.backgroundColor = new color_1.Color(0, 255, 255, 255);
            _this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            var settings = _this.android.getSettings();
            var userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " Argon");
            settings.setJavaScriptEnabled(true);
            if (!_this.id) {
                _this.id = Date.now().toString();
            }
            ArgonWebView.layersById[_this.id] = _this;
            _this.android.addJavascriptInterface(new (AndroidWebInterface.extend({
                onArgonEvent: function (id, event, data) {
                    var self = ArgonWebView.layersById[id];
                    if (self) {
                        if (event === "message") {
                            self._handleArgonMessage(data);
                        }
                        else if (event === "log") {
                            self._handleLogMessage(data);
                        }
                    }
                },
            }))(new java.lang.String(_this.id)), "__argon_android__");
        });
        this.on(ArgonWebView.loadStartedEvent, function () {
            var injectLogger = function () {
                var logger = window.console.log;
                window.console.log = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    if (window["__argon_android__"]) {
                        window["__argon_android__"].emit("log", args.join(" "));
                    }
                    logger.apply(window.console, args);
                };
            };
            _this.evaluateJavascript("(" + injectLogger.toString() + ")()");
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
            _this.android.evaluateJavascript(script, new android.webkit.ValueCallback({
                onReceiveValue: function (value) {
                    resolve(value);
                },
            }));
        });
    };
    ArgonWebView.prototype.bringToFront = function () {
        this.android.bringToFront();
    };
    ArgonWebView.layersById = {};
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view.android.js.map