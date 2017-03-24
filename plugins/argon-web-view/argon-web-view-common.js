"use strict";
var web_view_1 = require("ui/web-view");
var Argon = require("@argonjs/argon");
var observable_array_1 = require("data/observable-array");
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this.isArgonApp = false;
        _this._log = new observable_array_1.ObservableArray();
        return _this;
    }
    Object.defineProperty(ArgonWebView.prototype, "log", {
        get: function () { return this._log; },
        enumerable: true,
        configurable: true
    });
    ;
    ArgonWebView.prototype._didCommitNavigation = function () {
        if (this.session)
            this.session.close();
        this.log.length = 0;
        this.session = undefined;
        this._outputPort = undefined;
    };
    ArgonWebView.prototype._handleArgonMessage = function (message) {
        var _this = this;
        if (this.session && !this.session.isConnected)
            return;
        if (!this.session) {
            var sessionUrl = this.getCurrentUrl();
            console.log('Connecting to argon.js session at ' + sessionUrl);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var session = manager.session.addManagedSessionPort(sessionUrl);
            var port = messageChannel.port2;
            port.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "__ARGON_PORT__.postMessage(" + msg.data + ")";
                _this.evaluateJavascriptWithoutPromise(injectedMessage);
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
        var log = JSON.parse(message);
        log.lines = log.message.split(/\r\n|\r|\n/);
        // console.log(this.url + ' (' + log.type + '): ' + log.lines.join('\n\t > ')); 
        this.log.push(log);
    };
    return ArgonWebView;
}(web_view_1.WebView));
ArgonWebView.sessionEvent = 'session';
ArgonWebView.logEvent = 'log';
exports.ArgonWebView = ArgonWebView;
