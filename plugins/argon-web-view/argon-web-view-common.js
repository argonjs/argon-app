"use strict";
var web_view_1 = require('ui/web-view');
var Argon = require('argon');
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = this;
        _super.call(this);
        this.log = [];
        this.on(web_view_1.WebView.loadFinishedEvent, function () {
            _this.notifyPropertyChange('title', _this.title);
        });
    }
    Object.defineProperty(ArgonWebView.prototype, "title", {
        get: function () { },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ArgonWebView.prototype, "progress", {
        get: function () { },
        enumerable: true,
        configurable: true
    });
    ArgonWebView.prototype._handleArgonMessage = function (message) {
        var _this = this;
        if (typeof this._sessionMessagePort == 'undefined') {
            // note: this.src is what the webview was originally set to load, this.url is the actual current url. 
            var sessionUrl_1 = this.url;
            console.log('Connecting to argon.js application at ' + sessionUrl_1);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var remoteSession_1 = manager.session.addManagedSessionPort();
            ArgonWebView.sessionUrlMap.set(remoteSession_1, sessionUrl_1);
            this._sessionMessagePort = messageChannel.port2;
            this._sessionMessagePort.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "__ARGON_PORT__.postMessage(" + JSON.stringify(msg.data) + ")";
                _this.evaluateJavascript(injectedMessage);
            };
            remoteSession_1.connectEvent.addEventListener(function () {
                remoteSession_1.info.name = sessionUrl_1;
                _this.session = remoteSession_1;
                var args = {
                    eventName: ArgonWebView.sessionConnectEvent,
                    object: _this,
                    session: remoteSession_1
                };
                _this.notify(args);
            });
            remoteSession_1.closeEvent.addEventListener(function () {
                if (_this.session === remoteSession_1) {
                    _this._sessionMessagePort = undefined;
                    _this.session = null;
                }
            });
            remoteSession_1.open(messageChannel.port1, manager.session.configuration);
        }
        console.log(message);
        this._sessionMessagePort.postMessage(JSON.parse(message));
    };
    ArgonWebView.prototype._handleLogMessage = function (message) {
        var logMessage = this.url + ': ' + message;
        console.log(logMessage);
        this.log.push(logMessage);
        var args = {
            eventName: ArgonWebView.logEvent,
            object: this,
            message: logMessage
        };
        this.notify(args);
    };
    ArgonWebView.sessionUrlMap = new WeakMap();
    ArgonWebView.sessionConnectEvent = 'sessionConnect';
    ArgonWebView.logEvent = 'log';
    return ArgonWebView;
}(web_view_1.WebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view-common.js.map