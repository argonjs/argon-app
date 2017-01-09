"use strict";
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var color_1 = require("color");
var AndroidWebInterface = io.argonjs.AndroidWebInterface;
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this.on(view_1.View.loadedEvent, function () {
            // Make transparent
            _this.backgroundColor = new color_1.Color(0, 255, 255, 255);
            _this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            var settings = _this.android.getSettings();
            var userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " Argon");
            settings.setJavaScriptEnabled(true);
            // Remember a particular id for each webview
            if (!_this.id) {
                _this.id = Date.now().toString();
            }
            ArgonWebView.layersById[_this.id] = _this;
            // Inject Javascript Interface
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
        _this.on(ArgonWebView.loadStartedEvent, function () {
            // Hook into the logging
            var injectLoggers = function () {
                var logger = window.console.log;
                window.console.log = function () {
                    if (window["__argon_android__"]) {
                        window["__argon_android__"].emit("log", JSON.stringify({ type: 'log', args: [].slice.call(arguments) }));
                    }
                    logger.apply(window.console, arguments);
                };
                var warnLogger = window.console.warn;
                window.console.warn = function () {
                    if (window["__argon_android__"]) {
                        window["__argon_android__"].emit("log", JSON.stringify({ type: 'warn', args: [].slice.call(arguments) }));
                    }
                    warnLogger.apply(window.console, arguments);
                };
                var errorLogger = window.console.error;
                window.console.error = function () {
                    if (window["__argon_android__"]) {
                        window["__argon_android__"].emit("log", JSON.stringify({ type: 'error', args: [].slice.call(arguments) }));
                    }
                    errorLogger.apply(window.console, arguments);
                };
                window.addEventListener('error', function (e) {
                    console.error('Unhandled Error: ' + e.message + ' (' + e.source + ':' + e.lineno + ')');
                }, false);
            };
            _this.evaluateJavascript("(" + injectLoggers.toString() + ")()");
        });
        return _this;
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
    return ArgonWebView;
}(common.ArgonWebView));
ArgonWebView.layersById = {};
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view.android.js.map