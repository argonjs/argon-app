"use strict";
var web_view_1 = require('ui/web-view');
var Argon = require('argon');
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        _super.call(this);
        this.isArgonApp = true;
        this.log = [];
    }
    ArgonWebView.prototype._didCommitNavigation = function () {
        if (this.session)
            this.session.close();
        this.session = null;
        this._outputPort = null;
    };
    ArgonWebView.prototype._handleArgonMessage = function (message) {
        var _this = this;
        if (this.session && !this.session.isConnected)
            return;
        if (!this.session) {
            // note: this.src is what the webview was originally set to load, this.url is the actual current url. 
            var sessionUrl_1 = this.url;
            console.log('Connecting to argon.js session at ' + sessionUrl_1);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var session_1 = manager.session.addManagedSessionPort();
            ArgonWebView.sessionUrlMap.set(session_1, sessionUrl_1);
            var port = messageChannel.port2;
            port.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "__ARGON_PORT__.postMessage(" + JSON.stringify(msg.data) + ")";
                _this.evaluateJavascript(injectedMessage);
            };
            session_1.connectEvent.addEventListener(function () {
                session_1.info.name = sessionUrl_1;
            });
            var args = {
                eventName: ArgonWebView.sessionEvent,
                object: this,
                session: session_1
            };
            this.notify(args);
            this.session = session_1;
            this._outputPort = port;
            session_1.open(messageChannel.port1, manager.session.configuration);
        }
        // console.log(message);
        this._outputPort.postMessage(JSON.parse(message));
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
    ArgonWebView.sessionEvent = 'session';
    ArgonWebView.logEvent = 'log';
    return ArgonWebView;
}(web_view_1.WebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view-common.js.map