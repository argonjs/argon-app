/**********************************************************************************
 * (c) 2016, Master Technology 
 * (modified by Gheric Speiginer)
 * 
 * Licensed under the MIT license or contact me for a Support or Commercial License
 *
 * I do contract work in most languages, so let me solve your problems!
 *
 * Any questions please feel free to email me or put a issue up on the github repo
 * Version 0.0.1                                      Nathan@master-technology.com
 *********************************************************************************/
"use strict";

var application = require('application');
var fs = require('file-system');
var types = require('utils/types');

/* jshint node: true, browser: true, unused: false, undef: true */
/* global android, com, java, javax, unescape, exports, global, NSObject, NSString, NSLocale, WKScriptMessageHandler, WKNavigationDelegate */

function replacer(k,v) {
    if (v==null) return undefined;
    if (!v) return v;
    if (v.buffer instanceof ArrayBuffer && v.byteLength !== undefined) { // isTypedArray
        return {__ta: {type:v.constructor.name, data:Array.prototype.slice.call(v)}};
    }
    if (this[k] instanceof Date) {
        return {__d: this[k].toISOString()}
    }
    if (typeof v === 'string') {
        return escape(v);
    }
    return v;
}

var self = global;

function reviver(k,v) {
    if (!v) return v;
    if (v.__ta) {
        return new self[v.__ta.type](v.__ta.data);
    }
    if (v.__d) {
        return new Date(v.__d);
    }
    if (typeof v === 'string') {
        return unescape(v);
    }
    return v;
}


var _WKScriptMessageHandler = NSObject.extend({
    _worker: null,
    userContentControllerDidReceiveScriptMessage: function(userContentController, message) {
        this._worker._clientMessage(message.body);
    },
},{name: 'WKScriptMHandler', protocols: [WKScriptMessageHandler,WKNavigationDelegate]});

function WebWorker(js) {
    this._running = true;
    this._initialized = false;
    this._messages = [];
    this._config = new WKWebViewConfiguration();
    this._controller = new WKUserContentController();

    js = types.isString(js) ? js.trim() : "";

    if (js.indexOf("~/") === 0) {
        js = fs.path.join(fs.knownFolders.currentApp().path, js.replace("~/", ""));
    }

    if (!fs.File.exists(js)) {
        throw new Error("WebWorkers: can not find JavaScript file: " + js);
    }

    var script = "if (typeof console === 'undefined') { console = {}; } console.log = function() { postMessage({'_BRM': 'log', 'data': Array.prototype.slice.call(arguments) }); }; " +
        "window._WW_replacer = " + replacer.toString() + ";" +
        "window._WW_reviver = " + reviver.toString() + ";" +
        "window.postMessage = function(data) { try { window.webkit.messageHandlers.channel.postMessage(JSON.stringify(data, _WW_replacer)); } catch (e) { console.error(e); } }; " +
        "window._WW_receiveMessage = function(d) { try { window.onmessage({data:JSON.parse(d, _WW_reviver)}); } catch (e) { e = {message:e.message, lineno:e.lineno, filename:e.filename}; console.log(e); postMessage({_BRM: 'error', error: e}); } }; " +
        "window.onerror = function(e) { e = {message:e.message, lineno:e.lineno, filename:e.filename}; console.log(e); postMessage({_BRM: 'error', error: e}); }; " +
        "window.close = function() { postMessage({_BRM: 'close'}); }; " +
        "window._WK_intervalid = setInterval(function(){ if (window.onmessage) { postMessage({_BRM: 'ready'}); clearInterval(_WK_intervalid); } }, 100)";

    var s = WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(script, WKUserScriptInjectionTimeAtDocumentStart, false);
    this._scriptHandler = _WKScriptMessageHandler.alloc().init();
    this._scriptHandler._worker = this;

    this._controller.addScriptMessageHandlerName(this._scriptHandler, "channel");
    this._controller.addUserScript(s);

    this._config.userContentController = this._controller;

    this.ios = WKWebView.alloc().initWithFrameConfiguration(CGRectMake(0,0,0,0), this._config);
    this.ios.customUserAgent = "NativeScript-WebWorker";
    this.ios.navigationDelegate = this._scriptHandler;
    this.ios.userInteractionEnabled = false;

    var load = function() {
        var baseURL = NSURL.fileURLWithPath(NSString.stringWithString(js).stringByDeletingLastPathComponent);
        var file = fs.File.fromPath(js);
        var content = file.readTextSync();
        this.ios.loadHTMLStringBaseURL("<html><head><script>"+content+"</script></head></html>", baseURL);
    }.bind(this);
 
    if (UIApplication.sharedApplication().keyWindow) {
        UIApplication.sharedApplication().keyWindow.addSubview(this.ios);
        load();
    } else {
        application.ios.addNotificationObserver(UIApplicationDidBecomeActiveNotification, function (notification) {
            UIApplication.sharedApplication().keyWindow.addSubview(this.ios);
            load();
        }.bind(this));
    }
    
}

WebWorker.prototype._clientMessage = function(m) {
    var data = JSON.parse(m, reviver);
    //noinspection JSUnresolvedVariable
    if (data._BRM) {
        switch (data._BRM) {
            case 'ready':
                this._ready(); break;
            case 'close':
                this.terminate(); break;
            case 'error':
                this.onerror(data.error); break;
            case 'log':
                console.log.apply(console,data.data);	break;
            default:
                console.log("Unknown _BRM", data._BRM)
        }

        return;
    }
    this.onmessage({data:data});
};

WebWorker.prototype._ready = function() {
    this._initialized = true;
    if (this._messages.length) {
        while (this._messages.length) {
            var m = this._messages.pop();
            this.postMessage(m);
        }
    }
};

WebWorker.prototype.postMessage = function(data) {
    if (!this._running) { return; }
    if (!this._initialized) {
        this._messages.push(data);
    } else {
        var self = this;
        const json = JSON.stringify(data, replacer)
        this.ios.evaluateJavaScriptCompletionHandler("_WW_receiveMessage('" + json + "'); ", function(c,err) { if (err) self.onerror(err); });
    }
};

WebWorker.prototype.terminate = function() {
    this._running = false;
    //noinspection JSUnresolvedFunction
    if (this.ios) this.ios.removeFromSuperview();
    this.ios = null;
    this._config = null;
    this._controller = null;
};

WebWorker.prototype.onerror = function(e) {
    console.log("NativeScript-WebWorker error:", e);
    // Do Nothing.
};

WebWorker.prototype.onmessage = function() {
    console.log("NativeScript-WebWorker message");
    // Do Nothing.
};

if (!global.Worker) {
    global.Worker = WebWorker;
}

module.exports = WebWorker;