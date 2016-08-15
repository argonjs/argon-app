"use strict";
var web_view_1 = require('ui/web-view');
var Argon = require('argon');
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        _super.call(this);
        this.isArgonApp = false;
        this.log = [];
    }
    ArgonWebView.prototype._didCommitNavigation = function () {
        if (this.session)
            this.session.close();
        this.session = undefined;
        this._outputPort = undefined;
    };
    ArgonWebView.prototype._handleArgonMessage = function (message) {
        var _this = this;
        if (this.session && !this.session.isConnected)
            return;
        if (!this.session) {
            // note: this.src is what the webview was originally set to load, this.url is the actual current url. 
            var sessionUrl = this.url;
            console.log('Connecting to argon.js session at ' + sessionUrl);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var session = manager.session.addManagedSessionPort(sessionUrl);
            var port = messageChannel.port2;
            port.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "__ARGON_PORT__.postMessage(" + JSON.stringify(msg.data) + ")";
                _this.evaluateJavascript(injectedMessage);
            };
            var args = {
                eventName: ArgonWebView.sessionEvent,
                object: this,
                session: session
            };
            this.notify(args);
            this.session = session;
            this._outputPort = port;
            session.open(messageChannel.port1, manager.session.configuration);
        }
        // console.log(message);
        this._outputPort && this._outputPort.postMessage(JSON.parse(message));
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
    ArgonWebView.sessionEvent = 'session';
    ArgonWebView.logEvent = 'log';
    return ArgonWebView;
}(web_view_1.WebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view-common.js.map