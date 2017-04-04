"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Argon = require("@argonjs/argon");
var common = require("./argon-web-view-common");
var web_view_1 = require("ui/web-view");
var trace = require("trace");
var utils = require("utils/utils");
var dialogs = require("ui/dialogs");
var ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon';
var processPool = WKProcessPool.new();
/// In-memory certificate store.
// class CertStore {
//     private keys = new Set<string>();
//     public addCertificate(cert: any, origin:string) {
//         let data: NSData = SecCertificateCopyData(cert)
//         let key = this.keyForData(data, origin);
//         this.keys.add(key);
//     }
//     public containsCertificate(cert: any, origin:string) : boolean {
//         let data: NSData = SecCertificateCopyData(cert)
//         let key = this.keyForData(data, origin)
//         return this.keys.has(key);
//     }
//     private keyForData(data: NSData, origin:string) {
//         return `${origin}/${data.hash}`;
//     }
// }
// const _certStore = new CertStore();
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        var configuration = WKWebViewConfiguration.alloc().init();
        configuration.allowsInlineMediaPlayback = true;
        configuration.allowsAirPlayForMediaPlayback = true;
        configuration.allowsPictureInPictureMediaPlayback = true;
        configuration.mediaTypesRequiringUserActionForPlayback = 0 /* None */;
        configuration.processPool = processPool;
        configuration.userContentController.addUserScript(WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly("(" + function () {
            var _originalLog = console.log;
            console.log = function () {
                webkit.messageHandlers.log.postMessage(JSON.stringify({ type: 'log', message: inspectEach(arguments) }));
                _originalLog.apply(console, arguments);
            };
            var _originalWarn = console.warn;
            console.warn = function () {
                webkit.messageHandlers.log.postMessage(JSON.stringify({ type: 'warn', message: inspectEach(arguments) }));
                _originalWarn.apply(console, arguments);
            };
            var _originalError = console.error;
            console.error = function () {
                webkit.messageHandlers.log.postMessage(JSON.stringify({ type: 'error', message: inspectEach(arguments) }));
                _originalError.apply(console, arguments);
            };
            window.addEventListener('error', function (e) {
                console.error('Unhandled Error: ' + e.message + ' (' + e.source + ':' + e.lineno + ')');
            }, false);
            function _sendArgonCheck(event) {
                if (document.head.querySelector('meta[name=argon]') !== null || typeof (Argon) !== 'undefined') {
                    if (event.persisted)
                        window.location.reload(false);
                    else
                        webkit.messageHandlers.argoncheck.postMessage("true");
                }
                else {
                    webkit.messageHandlers.argoncheck.postMessage("false");
                }
            }
            document.addEventListener("DOMContentLoaded", _sendArgonCheck);
            window.addEventListener("pageshow", _sendArgonCheck);
            function inspect(o, depth) {
                if (o === null)
                    return "null";
                if (o === undefined)
                    return "undefined";
                if (typeof o === 'number' || o instanceof Number)
                    return (o).toString();
                if (typeof o === 'string' || o instanceof String)
                    return o;
                if (Array.isArray(o))
                    return "Array[" + o.length + "]";
                if (o instanceof Date)
                    return o.toString();
                return depth > 0 ? className(o) + " {" + (Object.keys(o).map(function (key) {
                    return '\n    ' + key + ': ' + inspect(o, depth - 1);
                }).join() + Object.getPrototypeOf(o) ?
                    '\n    __proto__: ' + className(Object.getPrototypeOf(o)) : "") + "\n}" : className(o);
            }
            function inspectEach(args) {
                var argsArray = [].slice.call(args);
                return argsArray.map(function (arg) { return inspect(arg, 1); }).join(' ');
            }
            function className(o) {
                var name = Object.prototype.toString.call(o).slice(8, -1);
                if (name === 'Object')
                    name = o.constructor.name;
                return name;
            }
        }.toString() + "())", 0 /* AtDocumentStart */, true));
        // We want to replace the UIWebView created by superclass with WKWebView instance
        _this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
        delete _this._delegate; // remove reference to UIWebView delegate created by super class
        var delegate = _this._argonDelegate = ArgonWebViewDelegate.initWithOwner(new WeakRef(_this));
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argon");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argoncheck");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "log");
        _this._ios.allowsBackForwardNavigationGestures = true;
        _this._ios['customUserAgent'] = ARGON_USER_AGENT;
        // style appropriately
        _this._ios.scrollView.layer.masksToBounds = false;
        _this._ios.layer.masksToBounds = false;
        return _this;
    }
    ArgonWebView.prototype._setIsArgonApp = function (flag) {
        if (!this.isArgonApp && flag) {
            this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
            this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
            this._ios.opaque = false;
            this.set("isArgonApp", true);
        }
        else if (this.isArgonApp && !flag) {
            this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.opaque = true;
            this.set("isArgonApp", false);
        }
    };
    ArgonWebView.prototype.evaluateJavascript = function (script) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._ios.evaluateJavaScriptCompletionHandler(script, function (result, error) {
                if (error)
                    reject(error.localizedDescription);
                else
                    resolve(result);
            });
        });
    };
    ArgonWebView.prototype.evaluateJavascriptWithoutPromise = function (script) {
        this._ios.evaluateJavaScriptCompletionHandler(script, null);
    };
    ArgonWebView.prototype.bringToFront = function () {
        this._ios.superview.bringSubviewToFront(this._ios);
    };
    ArgonWebView.prototype.onLoaded = function () {
        _super.prototype.onLoaded.call(this);
        this._ios.navigationDelegate = this._argonDelegate;
    };
    ArgonWebView.prototype.onUnloaded = function () {
        // NOTE: removed when moving to iOS10 -- will not let me assign null to the 
        // delegate.  Not sure if this will cause a problem.
        // this._ios.navigationDelegate = null;
        _super.prototype.onUnloaded.call(this);
    };
    ArgonWebView.prototype.reload = function () {
        this._ios.reloadFromOrigin();
    };
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
var ArgonWebViewDelegate = (function (_super) {
    __extends(ArgonWebViewDelegate, _super);
    function ArgonWebViewDelegate() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ArgonWebViewDelegate.initWithOwner = function (owner) {
        var delegate = ArgonWebViewDelegate.new();
        delegate._owner = owner;
        var wkWebView = owner.get().ios;
        wkWebView.addObserverForKeyPathOptionsContext(delegate, "title", 0, null);
        wkWebView.addObserverForKeyPathOptionsContext(delegate, "URL", 0, null);
        wkWebView.addObserverForKeyPathOptionsContext(delegate, "estimatedProgress", 0, null);
        return delegate;
    };
    ArgonWebViewDelegate.prototype.observeValueForKeyPathOfObjectChangeContext = function (keyPath, object, change, context) {
        var owner = this._owner.get();
        if (!owner)
            return;
        var wkWebView = owner.ios;
        switch (keyPath) {
            case "title":
                owner.set(keyPath, wkWebView.title);
                break;
            case "URL":
                this.updateURL();
                break;
            case "estimatedProgress":
                owner.set('progress', wkWebView.estimatedProgress);
                break;
        }
    };
    ArgonWebViewDelegate.prototype.updateURL = function () {
        var owner = this._owner.get();
        if (!owner)
            return;
        var wkWebView = owner.ios;
        owner['_suspendLoading'] = true;
        owner.set("url", wkWebView.URL && wkWebView.URL.absoluteString);
        owner['_suspendLoading'] = false;
    };
    // WKScriptMessageHandler
    ArgonWebViewDelegate.prototype.userContentControllerDidReceiveScriptMessage = function (userContentController, message) {
        var owner = this._owner.get();
        if (!owner)
            return;
        if (message.name === 'argon') {
            if (!owner.session) {
                // just in case we thought below that the page was not an
                // argon page, perhaps because argon.js loaded asyncronously 
                // and the programmer didn't set up an argon meta tag
                owner._setIsArgonApp(true);
            }
            owner._handleArgonMessage(message.body);
        }
        else if (message.name === 'log') {
            owner._handleLogMessage(message.body);
        }
        else if (message.name === 'argoncheck') {
            if (!owner.session) {
                if (message.body === "true") {
                    owner._setIsArgonApp(true);
                }
                else {
                    owner._setIsArgonApp(false);
                }
            }
        }
    };
    ArgonWebViewDelegate.prototype.webViewDecidePolicyForNavigationActionDecisionHandler = function (webview, navigationAction, decisionHandler) {
        if (navigationAction.targetFrame && navigationAction.targetFrame.mainFrame) {
            var navigationType = navigationAction.navigationType;
            var navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('other');
            switch (navigationType) {
                case 0 /* LinkActivated */:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('linkClicked');
                    break;
                case 1 /* FormSubmitted */:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('formSubmitted');
                    break;
                case 2 /* BackForward */:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('backForward');
                    break;
                case 3 /* Reload */:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('reload');
                    break;
                case 4 /* FormResubmitted */:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('formResubmitted');
                    break;
            }
            var owner = this._owner.get();
            if (owner)
                owner['_onLoadStarted'](navigationAction.request.URL.absoluteString, web_view_1.WebView.navigationTypes[navTypeIndex]);
        }
        trace.write("ArgonWebView.webViewDecidePolicyForNavigationActionDecisionHandler(" + navigationAction.request.URL.absoluteString + ", " + navigationAction.navigationType + ")", trace.categories.Debug);
        decisionHandler(1 /* Allow */);
    };
    ArgonWebViewDelegate.prototype.webViewDecidePolicyForNavigationResponseDecisionHandler = function (webview, navigationResponse, decisionHandler) {
        decisionHandler(1 /* Allow */);
    };
    ArgonWebViewDelegate.prototype.webViewDidStartProvisionalNavigation = function (webView, navigation) {
        this._provisionalURL = webView.URL && webView.URL.absoluteString;
    };
    ArgonWebViewDelegate.prototype.webViewDidCommitNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (!owner)
            return;
        owner._didCommitNavigation();
        this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFailProvisionalNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (!owner)
            return;
        owner['_onLoadFinished'](this._provisionalURL, "Provisional navigation failed");
        this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFinishNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString);
        this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFailNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString, error.localizedDescription);
        this.updateURL();
    };
    ArgonWebViewDelegate.prototype.checkIfWebContentProcessHasCrashed = function (webView, error) {
        if (error.code == 2 /* WebContentProcessTerminated */ && error.domain == "WebKitErrorDomain") {
            webView.reloadFromOrigin();
            return true;
        }
        return false;
    };
    ArgonWebViewDelegate.prototype.webViewDidFailProvisionalNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString, error.localizedDescription);
        this.updateURL();
        if (this.checkIfWebContentProcessHasCrashed(webView, error)) {
            return;
        }
        var url = error.userInfo.objectForKey(NSURLErrorFailingURLErrorKey);
        if (url && url.host &&
            error.code === NSURLErrorServerCertificateUntrusted ||
            error.code === NSURLErrorServerCertificateHasBadDate ||
            error.code === NSURLErrorServerCertificateHasUnknownRoot ||
            error.code === NSURLErrorServerCertificateNotYetValid) {
            // const certChain = error.userInfo.objectForKey('NSErrorPeerCertificateChainKey');
            // const cert = certChain && certChain[0];
            // dialogs.confirm(`${error.localizedDescription} Would you like to continue anyway?`).then(function (result) {
            //     if (result) {
            //         const origin = `${url.host}:${url.port||443}`;
            //         _certStore.addCertificate(cert, origin);
            //         webView.loadRequest(new NSURLRequest({URL:url}));
            //     }
            // }).catch(()=>{});
            dialogs.alert(error.localizedDescription + " A bug in Argon4 prevents us from continuing. Please use a site with a valid certificate.  We will fix this soon.");
        }
    };
    return ArgonWebViewDelegate;
}(NSObject));
// comment out until https://github.com/NativeScript/ios-runtime/issues/742 is fixed
// webViewDidReceiveAuthenticationChallengeCompletionHandler(webView: WKWebView, challenge: NSURLAuthenticationChallenge, completionHandler: (p1: NSURLSessionAuthChallengeDisposition, p2?: NSURLCredential) => void): void {
//     // If this is a certificate challenge, see if the certificate has previously been
//     // accepted by the user.
//     const origin = `${challenge.protectionSpace.host}:${challenge.protectionSpace.port}`;
//     const trust = challenge.protectionSpace.serverTrust;
//     const cert = SecTrustGetCertificateAtIndex(trust, 0);
//     if (challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust &&
//         trust && cert && _certStore.containsCertificate(cert, origin)) {
//         completionHandler(NSURLSessionAuthChallengeDisposition.UseCredential, new NSURLCredential(trust))
//         return;
//     }
//     completionHandler(NSURLSessionAuthChallengeDisposition.PerformDefaultHandling, undefined);
// }
ArgonWebViewDelegate.ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUNsRCx3Q0FBb0M7QUFDcEMsNkJBQStCO0FBQy9CLG1DQUFxQztBQUNyQyxvQ0FBc0M7QUFFdEMsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUMscUJBQXFCLENBQUMsR0FBRyxRQUFRLENBQUM7QUFFM0gsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBSXhDLGdDQUFnQztBQUNoQyxvQkFBb0I7QUFDcEIsd0NBQXdDO0FBRXhDLHdEQUF3RDtBQUN4RCwwREFBMEQ7QUFDMUQsbURBQW1EO0FBQ25ELDhCQUE4QjtBQUM5QixRQUFRO0FBRVIsdUVBQXVFO0FBQ3ZFLDBEQUEwRDtBQUMxRCxrREFBa0Q7QUFDbEQscUNBQXFDO0FBQ3JDLFFBQVE7QUFFUix3REFBd0Q7QUFDeEQsMkNBQTJDO0FBQzNDLFFBQVE7QUFDUixJQUFJO0FBRUosc0NBQXNDO0FBRXRDO0lBQWtDLGdDQUFtQjtJQU9qRDtRQUFBLFlBQ0ksaUJBQU8sU0ErRVY7UUE3RUcsSUFBTSxhQUFhLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFNUQsYUFBYSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQztRQUMvQyxhQUFhLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxDQUFDO1FBQ25ELGFBQWEsQ0FBQyxtQ0FBbUMsR0FBRyxJQUFJLENBQUM7UUFDekQsYUFBYSxDQUFDLHdDQUF3QyxHQUFHLFlBQTRCLENBQUM7UUFDdEYsYUFBYSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDeEMsYUFBYSxDQUFDLHFCQUFxQixDQUFDLGFBQWEs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LEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRCxNQUFNLENBQUM7UUFDWCxDQUFDO1FBRUQsSUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsNEJBQTRCLENBQVUsQ0FBQztRQUMvRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUk7WUFDZixLQUFLLENBQUMsSUFBSSxLQUFLLG9DQUFvQztZQUNuRCxLQUFLLENBQUMsSUFBSSxLQUFLLHFDQUFxQztZQUNwRCxLQUFLLENBQUMsSUFBSSxLQUFLLHlDQUF5QztZQUN4RCxLQUFLLENBQUMsSUFBSSxLQUFLLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztZQUNwRCxtRkFBbUY7WUFDbkYsMENBQTBDO1lBQzFDLCtHQUErRztZQUMvRyxvQkFBb0I7WUFDcEIseURBQXlEO1lBQ3pELG1EQUFtRDtZQUNuRCw0REFBNEQ7WUFDNUQsUUFBUTtZQUNSLG9CQUFvQjtZQUVwQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxtSEFBbUgsQ0FBQyxDQUFDO1FBQ3hLLENBQUM7SUFDTCxDQUFDO0lBbUJMLDJCQUFDO0FBQUQsQ0FBQyxBQS9MRCxDQUFtQyxRQUFRO0FBOEt2QyxvRkFBb0Y7QUFDdkYsOE5BQThOO0FBQzNOLHdGQUF3RjtBQUN4RiwrQkFBK0I7QUFDL0IsNEZBQTRGO0FBQzVGLDJEQUEyRDtBQUMzRCw0REFBNEQ7QUFDNUQsb0dBQW9HO0FBQ3BHLDJFQUEyRTtBQUMzRSw0R0FBNEc7QUFDNUcsa0JBQWtCO0FBQ2xCLFFBQVE7QUFFUixpR0FBaUc7QUFDakcsSUFBSTtBQUVVLGtDQUFhLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nO1xuaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vYXJnb24td2ViLXZpZXctY29tbW9uJztcbmltcG9ydCB7V2ViVmlld30gZnJvbSAndWkvd2ViLXZpZXcnO1xuaW1wb3J0ICogYXMgdHJhY2UgZnJvbSAndHJhY2UnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0ICogYXMgZGlhbG9ncyBmcm9tICd1aS9kaWFsb2dzJztcblxuY29uc3QgQVJHT05fVVNFUl9BR0VOVCA9IFVJV2ViVmlldy5hbGxvYygpLmluaXQoKS5zdHJpbmdCeUV2YWx1YXRpbmdKYXZhU2NyaXB0RnJvbVN0cmluZygnbmF2aWdhdG9yLnVzZXJBZ2VudCcpICsgJyBBcmdvbic7XG5cbmNvbnN0IHByb2Nlc3NQb29sID0gV0tQcm9jZXNzUG9vbC5uZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuZGVjbGFyZSBjb25zdCB3aW5kb3c6YW55LCB3ZWJraXQ6YW55LCBkb2N1bWVudDphbnk7XG5cbi8vLyBJbi1tZW1vcnkgY2VydGlmaWNhdGUgc3RvcmUuXG4vLyBjbGFzcyBDZXJ0U3RvcmUge1xuLy8gICAgIHByaXZhdGUga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vLyAgICAgcHVibGljIGFkZENlcnRpZmljYXRlKGNlcnQ6IGFueSwgb3JpZ2luOnN0cmluZykge1xuLy8gICAgICAgICBsZXQgZGF0YTogTlNEYXRhID0gU2VjQ2VydGlmaWNhdGVDb3B5RGF0YShjZXJ0KVxuLy8gICAgICAgICBsZXQga2V5ID0gdGhpcy5rZXlGb3JEYXRhKGRhdGEsIG9yaWdpbik7XG4vLyAgICAgICAgIHRoaXMua2V5cy5hZGQoa2V5KTtcbi8vICAgICB9XG5cbi8vICAgICBwdWJsaWMgY29udGFpbnNDZXJ0aWZpY2F0ZShjZXJ0OiBhbnksIG9yaWdpbjpzdHJpbmcpIDogYm9vbGVhbiB7XG4vLyAgICAgICAgIGxldCBkYXRhOiBOU0RhdGEgPSBTZWNDZXJ0aWZpY2F0ZUNvcHlEYXRhKGNlcnQpXG4vLyAgICAgICAgIGxldCBrZXkgPSB0aGlzLmtleUZvckRhdGEoZGF0YSwgb3JpZ2luKVxuLy8gICAgICAgICByZXR1cm4gdGhpcy5rZXlzLmhhcyhrZXkpO1xuLy8gICAgIH1cblxuLy8gICAgIHByaXZhdGUga2V5Rm9yRGF0YShkYXRhOiBOU0RhdGEsIG9yaWdpbjpzdHJpbmcpIHtcbi8vICAgICAgICAgcmV0dXJuIGAke29yaWdpbn0vJHtkYXRhLmhhc2h9YDtcbi8vICAgICB9XG4vLyB9XG5cbi8vIGNvbnN0IF9jZXJ0U3RvcmUgPSBuZXcgQ2VydFN0b3JlKCk7XG5cbmV4cG9ydCBjbGFzcyBBcmdvbldlYlZpZXcgZXh0ZW5kcyBjb21tb24uQXJnb25XZWJWaWV3ICB7XG5cbiAgICBwcml2YXRlIF9pb3M6V0tXZWJWaWV3XG4gICAgcHJpdmF0ZSBfZGVsZWdhdGU6VUlXZWJWaWV3RGVsZWdhdGVcbiAgICBcbiAgICBwcml2YXRlIF9hcmdvbkRlbGVnYXRlOkFyZ29uV2ViVmlld0RlbGVnYXRlO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbiA9IFdLV2ViVmlld0NvbmZpZ3VyYXRpb24uYWxsb2MoKS5pbml0KCk7XG5cbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NJbmxpbmVNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NBaXJQbGF5Rm9yTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24uYWxsb3dzUGljdHVyZUluUGljdHVyZU1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLm1lZGlhVHlwZXNSZXF1aXJpbmdVc2VyQWN0aW9uRm9yUGxheWJhY2sgPSBXS0F1ZGlvdmlzdWFsTWVkaWFUeXBlcy5Ob25lO1xuICAgICAgICBjb25maWd1cmF0aW9uLnByb2Nlc3NQb29sID0gcHJvY2Vzc1Bvb2w7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFVzZXJTY3JpcHQoV0tVc2VyU2NyaXB0LmFsbG9jKCkuaW5pdFdpdGhTb3VyY2VJbmplY3Rpb25UaW1lRm9yTWFpbkZyYW1lT25seShgKCR7XG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgX29yaWdpbmFsTG9nID0gY29uc29sZS5sb2c7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5sb2cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe3R5cGU6J2xvZycsbWVzc2FnZTppbnNwZWN0RWFjaChhcmd1bWVudHMpfSkpO1xuICAgICAgICAgICAgICAgICAgICBfb3JpZ2luYWxMb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxXYXJuID0gY29uc29sZS53YXJuO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTond2FybicsbWVzc2FnZTppbnNwZWN0RWFjaChhcmd1bWVudHMpfSkpO1xuICAgICAgICAgICAgICAgICAgICBfb3JpZ2luYWxXYXJuLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB2YXIgX29yaWdpbmFsRXJyb3IgPSBjb25zb2xlLmVycm9yO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5sb2cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe3R5cGU6J2Vycm9yJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbEVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuaGFuZGxlZCBFcnJvcjogJyArIGUubWVzc2FnZSArICcgKCcgKyBlLnNvdXJjZSArICc6JyArIGUubGluZW5vICsgJyknKTtcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX3NlbmRBcmdvbkNoZWNrKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5oZWFkLnF1ZXJ5U2VsZWN0b3IoJ21ldGFbbmFtZT1hcmdvbl0nKSAhPT0gbnVsbCB8fCB0eXBlb2YoQXJnb24pICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnBlcnNpc3RlZCkgd2luZG93LmxvY2F0aW9uLnJlbG9hZChmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMuYXJnb25jaGVjay5wb3N0TWVzc2FnZShcInRydWVcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmFyZ29uY2hlY2sucG9zdE1lc3NhZ2UoXCJmYWxzZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBfc2VuZEFyZ29uQ2hlY2spO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicGFnZXNob3dcIiwgX3NlbmRBcmdvbkNoZWNrKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnNwZWN0KG8sIGRlcHRoKSA6IHN0cmluZyB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvID09PSBudWxsKSByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvID09PSB1bmRlZmluZWQpIHJldHVybiBcInVuZGVmaW5lZFwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG8gPT09ICdudW1iZXInIHx8IG8gaW5zdGFuY2VvZiBOdW1iZXIpIHJldHVybiAobykudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCBvIGluc3RhbmNlb2YgU3RyaW5nKSByZXR1cm4gPHN0cmluZz4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobykpIHJldHVybiBcIkFycmF5W1wiKyBvLmxlbmd0aCArXCJdXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIG8udG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlcHRoID4gMCA/IGAke2NsYXNzTmFtZShvKX0geyR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMobykubWFwKChrZXkpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnXFxuICAgICcgKyBrZXkgKyAnOiAnICsgaW5zcGVjdChvLCBkZXB0aC0xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCkgKyBPYmplY3QuZ2V0UHJvdG90eXBlT2YobykgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1xcbiAgICBfX3Byb3RvX186ICcgKyBjbGFzc05hbWUoT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pKSA6IFwiXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG59YCA6IGNsYXNzTmFtZShvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5zcGVjdEVhY2goYXJnczpJQXJndW1lbnRzKSA6IHN0cmluZyB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzQXJyYXkgPSBbXS5zbGljZS5jYWxsKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc0FycmF5Lm1hcCgoYXJnKT0+aW5zcGVjdChhcmcsMSkpLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2xhc3NOYW1lKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5hbWUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykuc2xpY2UoOCwtMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAnT2JqZWN0JykgbmFtZSA9IG8uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS50b1N0cmluZygpXG4gICAgICAgIH0oKSlgLCBXS1VzZXJTY3JpcHRJbmplY3Rpb25UaW1lLkF0RG9jdW1lbnRTdGFydCwgdHJ1ZSkpO1xuXG4gICAgICAgIC8vIFdlIHdhbnQgdG8gcmVwbGFjZSB0aGUgVUlXZWJWaWV3IGNyZWF0ZWQgYnkgc3VwZXJjbGFzcyB3aXRoIFdLV2ViVmlldyBpbnN0YW5jZVxuICAgICAgICB0aGlzLl9pb3MgPSBXS1dlYlZpZXcuYWxsb2MoKS5pbml0V2l0aEZyYW1lQ29uZmlndXJhdGlvbihDR1JlY3RaZXJvLCBjb25maWd1cmF0aW9uKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2RlbGVnYXRlIC8vIHJlbW92ZSByZWZlcmVuY2UgdG8gVUlXZWJWaWV3IGRlbGVnYXRlIGNyZWF0ZWQgYnkgc3VwZXIgY2xhc3NcbiAgICAgICAgY29uc3QgZGVsZWdhdGUgPSB0aGlzLl9hcmdvbkRlbGVnYXRlID0gQXJnb25XZWJWaWV3RGVsZWdhdGUuaW5pdFdpdGhPd25lcihuZXcgV2Vha1JlZih0aGlzKSk7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFNjcmlwdE1lc3NhZ2VIYW5kbGVyTmFtZShkZWxlZ2F0ZSwgXCJhcmdvblwiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImFyZ29uY2hlY2tcIik7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFNjcmlwdE1lc3NhZ2VIYW5kbGVyTmFtZShkZWxlZ2F0ZSwgXCJsb2dcIik7XG5cblx0ICAgIHRoaXMuX2lvcy5hbGxvd3NCYWNrRm9yd2FyZE5hdmlnYXRpb25HZXN0dXJlcyA9IHRydWU7XG5cdFx0dGhpcy5faW9zWydjdXN0b21Vc2VyQWdlbnQnXSA9IEFSR09OX1VTRVJfQUdFTlQ7XG5cbiAgICAgICAgLy8gc3R5bGUgYXBwcm9wcmlhdGVseVxuICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIHB1YmxpYyBfc2V0SXNBcmdvbkFwcChmbGFnOmJvb2xlYW4pIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzQXJnb25BcHAgJiYgZmxhZykge1xuICAgICAgICAgICAgdGhpcy5faW9zLnNjcm9sbFZpZXcuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci5jbGVhckNvbG9yKTtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5vcGFxdWUgPSBmYWxzZTsgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zZXQoXCJpc0FyZ29uQXBwXCIsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNBcmdvbkFwcCAmJiAhZmxhZykge1xuICAgICAgICAgICAgdGhpcy5faW9zLnNjcm9sbFZpZXcuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLndoaXRlQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci53aGl0ZUNvbG9yKTtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5vcGFxdWUgPSB0cnVlOyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldChcImlzQXJnb25BcHBcIiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGV2YWx1YXRlSmF2YXNjcmlwdChzY3JpcHQ6c3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KT0+e1xuICAgICAgICAgICAgdGhpcy5faW9zLmV2YWx1YXRlSmF2YVNjcmlwdENvbXBsZXRpb25IYW5kbGVyKHNjcmlwdCwgKHJlc3VsdCwgZXJyb3IpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSByZWplY3QoZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgICAgIGVsc2UgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZXZhbHVhdGVKYXZhc2NyaXB0V2l0aG91dFByb21pc2Uoc2NyaXB0OnN0cmluZykgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faW9zLmV2YWx1YXRlSmF2YVNjcmlwdENvbXBsZXRpb25IYW5kbGVyKHNjcmlwdCwgPGFueT5udWxsKVxuICAgIH1cblxuICAgIHB1YmxpYyBicmluZ1RvRnJvbnQoKSB7XG4gICAgICAgIHRoaXMuX2lvcy5zdXBlcnZpZXcuYnJpbmdTdWJ2aWV3VG9Gcm9udCh0aGlzLl9pb3MpO1xuICAgIH1cblxuICAgIHB1YmxpYyBvbkxvYWRlZCgpIHtcbiAgICAgICAgc3VwZXIub25Mb2FkZWQoKTtcbiAgICAgICAgdGhpcy5faW9zLm5hdmlnYXRpb25EZWxlZ2F0ZSA9IHRoaXMuX2FyZ29uRGVsZWdhdGU7XG4gICAgfVxuXG4gICAgcHVibGljIG9uVW5sb2FkZWQoKSB7XG4gICAgICAgIC8vIE5PVEU6IHJlbW92ZWQgd2hlbiBtb3ZpbmcgdG8gaU9TMTAgLS0gd2lsbCBub3QgbGV0IG1lIGFzc2lnbiBudWxsIHRvIHRoZSBcbiAgICAgICAgLy8gZGVsZWdhdGUuICBOb3Qgc3VyZSBpZiB0aGlzIHdpbGwgY2F1c2UgYSBwcm9ibGVtLlxuICAgICAgICAvLyB0aGlzLl9pb3MubmF2aWdhdGlvbkRlbGVnYXRlID0gbnVsbDtcbiAgICAgICAgc3VwZXIub25VbmxvYWRlZCgpO1xuICAgIH1cblxuICAgIHJlbG9hZCgpIHtcbiAgICAgICAgdGhpcy5faW9zLnJlbG9hZEZyb21PcmlnaW4oKTtcbiAgICB9XG59XG5cbmNsYXNzIEFyZ29uV2ViVmlld0RlbGVnYXRlIGV4dGVuZHMgTlNPYmplY3QgaW1wbGVtZW50cyBXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyLCBXS05hdmlnYXRpb25EZWxlZ2F0ZSB7XG4gICAgXG4gICAgcHJpdmF0ZSBfb3duZXI6V2Vha1JlZjxBcmdvbldlYlZpZXc+O1xuICAgIFxuICAgIHB1YmxpYyBzdGF0aWMgaW5pdFdpdGhPd25lcihvd25lcjpXZWFrUmVmPEFyZ29uV2ViVmlldz4pIHtcbiAgICAgICAgY29uc3QgZGVsZWdhdGUgPSA8QXJnb25XZWJWaWV3RGVsZWdhdGU+QXJnb25XZWJWaWV3RGVsZWdhdGUubmV3KClcbiAgICAgICAgZGVsZWdhdGUuX293bmVyID0gb3duZXI7XG5cbiAgICAgICAgY29uc3Qgd2tXZWJWaWV3ID0gPFdLV2ViVmlldz5vd25lci5nZXQoKS5pb3M7XG4gICAgICAgIHdrV2ViVmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJ0aXRsZVwiLCAwLCA8YW55Pm51bGwpO1xuICAgICAgICB3a1dlYlZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwiVVJMXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIHdrV2ViVmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiLCAwLCA8YW55Pm51bGwpO1xuXG4gICAgICAgIHJldHVybiBkZWxlZ2F0ZTtcbiAgICB9XG5cbiAgICBvYnNlcnZlVmFsdWVGb3JLZXlQYXRoT2ZPYmplY3RDaGFuZ2VDb250ZXh0KGtleVBhdGg6c3RyaW5nLCBvYmplY3Q6YW55LCBjaGFuZ2U6YW55LCBjb250ZXh0OmFueSkge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47ICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdrV2ViVmlldyA9IDxXS1dlYlZpZXc+b3duZXIuaW9zO1xuXG4gICAgICAgIHN3aXRjaCAoa2V5UGF0aCkge1xuICAgICAgICAgICAgY2FzZSBcInRpdGxlXCI6IFxuICAgICAgICAgICAgICAgIG93bmVyLnNldChrZXlQYXRoLCB3a1dlYlZpZXcudGl0bGUpOyBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJVUkxcIjogXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiOlxuICAgICAgICAgICAgICAgIG93bmVyLnNldCgncHJvZ3Jlc3MnLCB3a1dlYlZpZXcuZXN0aW1hdGVkUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cGRhdGVVUkwoKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjsgICAgIFxuICAgICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmlvcztcbiAgICAgICAgb3duZXJbJ19zdXNwZW5kTG9hZGluZyddID0gdHJ1ZTsgXG4gICAgICAgIG93bmVyLnNldChcInVybFwiLCB3a1dlYlZpZXcuVVJMICYmIHdrV2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpOyBcbiAgICAgICAgb3duZXJbJ19zdXNwZW5kTG9hZGluZyddID0gZmFsc2U7IFxuICAgIH1cbiAgICBcbiAgICAvLyBXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyXG5cbiAgICB1c2VyQ29udGVudENvbnRyb2xsZXJEaWRSZWNlaXZlU2NyaXB0TWVzc2FnZSh1c2VyQ29udGVudENvbnRyb2xsZXI6V0tVc2VyQ29udGVudENvbnRyb2xsZXIsIG1lc3NhZ2U6V0tTY3JpcHRNZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uJykge1xuICAgICAgICAgICAgaWYgKCFvd25lci5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8ganVzdCBpbiBjYXNlIHdlIHRob3VnaHQgYmVsb3cgdGhhdCB0aGUgcGFnZSB3YXMgbm90IGFuXG4gICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25BcHAodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvd25lci5faGFuZGxlQXJnb25NZXNzYWdlKG1lc3NhZ2UuYm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5uYW1lID09PSAnbG9nJykge1xuICAgICAgICAgICAgb3duZXIuX2hhbmRsZUxvZ01lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdhcmdvbmNoZWNrJykge1xuICAgICAgICAgICAgaWYgKCFvd25lci5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuYm9keSA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25BcHAodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25BcHAoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBXS05hdmlnYXRpb25EZWxlZ2F0ZVxuXG4gICAgcHJpdmF0ZSBfcHJvdmlzaW9uYWxVUkwgOiBzdHJpbmc7XG5cbiAgICB3ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvbkFjdGlvbkRlY2lzaW9uSGFuZGxlcih3ZWJ2aWV3OldLV2ViVmlldywgbmF2aWdhdGlvbkFjdGlvbjpXS05hdmlnYXRpb25BY3Rpb24sIGRlY2lzaW9uSGFuZGxlcjoocG9saWN5OldLTmF2aWdhdGlvbkFjdGlvblBvbGljeSk9PnZvaWQpIHtcbiAgICAgICAgaWYgKG5hdmlnYXRpb25BY3Rpb24udGFyZ2V0RnJhbWUgJiYgbmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZS5tYWluRnJhbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hdmlnYXRpb25UeXBlOldLTmF2aWdhdGlvblR5cGUgPSBuYXZpZ2F0aW9uQWN0aW9uLm5hdmlnYXRpb25UeXBlO1xuICAgICAgICAgICAgdmFyIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ290aGVyJyk7XG4gICAgICAgICAgICBzd2l0Y2ggKG5hdmlnYXRpb25UeXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkxpbmtBY3RpdmF0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ2xpbmtDbGlja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5Gb3JtU3VibWl0dGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdmb3JtU3VibWl0dGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5CYWNrRm9yd2FyZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignYmFja0ZvcndhcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLlJlbG9hZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZigncmVsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5Gb3JtUmVzdWJtaXR0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ2Zvcm1SZXN1Ym1pdHRlZCcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkU3RhcnRlZCddKG5hdmlnYXRpb25BY3Rpb24ucmVxdWVzdC5VUkwuYWJzb2x1dGVTdHJpbmcsIFdlYlZpZXcubmF2aWdhdGlvblR5cGVzW25hdlR5cGVJbmRleF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhY2Uud3JpdGUoXCJBcmdvbldlYlZpZXcud2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25BY3Rpb25EZWNpc2lvbkhhbmRsZXIoXCIgKyBuYXZpZ2F0aW9uQWN0aW9uLnJlcXVlc3QuVVJMLmFic29sdXRlU3RyaW5nICsgXCIsIFwiICsgbmF2aWdhdGlvbkFjdGlvbi5uYXZpZ2F0aW9uVHlwZSArIFwiKVwiLCB0cmFjZS5jYXRlZ29yaWVzLkRlYnVnKTtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvbkFjdGlvblBvbGljeS5BbGxvdyk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25SZXNwb25zZURlY2lzaW9uSGFuZGxlcih3ZWJ2aWV3OldLV2ViVmlldywgbmF2aWdhdGlvblJlc3BvbnNlOldLTmF2aWdhdGlvblJlc3BvbnNlLCBkZWNpc2lvbkhhbmRsZXI6KHBvbGljeTpXS05hdmlnYXRpb25SZXNwb25zZVBvbGljeSk9PnZvaWQpIHtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvblJlc3BvbnNlUG9saWN5LkFsbG93KTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkU3RhcnRQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgdGhpcy5fcHJvdmlzaW9uYWxVUkwgPSB3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkQ29tbWl0TmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIG93bmVyLl9kaWRDb21taXROYXZpZ2F0aW9uKCk7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10odGhpcy5fcHJvdmlzaW9uYWxVUkwsIFwiUHJvdmlzaW9uYWwgbmF2aWdhdGlvbiBmYWlsZWRcIik7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZpbmlzaE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwgJiYgd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpO1xuICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsTmF2aWdhdGlvbldpdGhFcnJvcih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbiwgZXJyb3I6TlNFcnJvcikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZywgZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3OiBXS1dlYlZpZXcsIGVycm9yOiBOU0Vycm9yKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoZXJyb3IuY29kZSA9PSBXS0Vycm9yQ29kZS5XZWJDb250ZW50UHJvY2Vzc1Rlcm1pbmF0ZWQgJiYgZXJyb3IuZG9tYWluID09IFwiV2ViS2l0RXJyb3JEb21haW5cIikge1xuICAgICAgICAgICAgd2ViVmlldy5yZWxvYWRGcm9tT3JpZ2luKClcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb25XaXRoRXJyb3Iod2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24sIGVycm9yOiBOU0Vycm9yKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMICYmIHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nLCBlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3LCBlcnJvcikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVybCA9IGVycm9yLnVzZXJJbmZvLm9iamVjdEZvcktleShOU1VSTEVycm9yRmFpbGluZ1VSTEVycm9yS2V5KSBhcyBOU1VSTDtcbiAgICAgICAgaWYgKHVybCAmJiB1cmwuaG9zdCAmJiBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZVVudHJ1c3RlZCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZUhhc0JhZERhdGUgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVIYXNVbmtub3duUm9vdCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZU5vdFlldFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc3QgY2VydENoYWluID0gZXJyb3IudXNlckluZm8ub2JqZWN0Rm9yS2V5KCdOU0Vycm9yUGVlckNlcnRpZmljYXRlQ2hhaW5LZXknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBjZXJ0ID0gY2VydENoYWluICYmIGNlcnRDaGFpblswXTtcbiAgICAgICAgICAgICAgICAvLyBkaWFsb2dzLmNvbmZpcm0oYCR7ZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb259IFdvdWxkIHlvdSBsaWtlIHRvIGNvbnRpbnVlIGFueXdheT9gKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgY29uc3Qgb3JpZ2luID0gYCR7dXJsLmhvc3R9OiR7dXJsLnBvcnR8fDQ0M31gO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgX2NlcnRTdG9yZS5hZGRDZXJ0aWZpY2F0ZShjZXJ0LCBvcmlnaW4pO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgd2ViVmlldy5sb2FkUmVxdWVzdChuZXcgTlNVUkxSZXF1ZXN0KHtVUkw6dXJsfSkpO1xuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfSkuY2F0Y2goKCk9Pnt9KTtcblxuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24gKyBcIiBBIGJ1ZyBpbiBBcmdvbjQgcHJldmVudHMgdXMgZnJvbSBjb250aW51aW5nLiBQbGVhc2UgdXNlIGEgc2l0ZSB3aXRoIGEgdmFsaWQgY2VydGlmaWNhdGUuICBXZSB3aWxsIGZpeCB0aGlzIHNvb24uXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29tbWVudCBvdXQgdW50aWwgaHR0cHM6Ly9naXRodWIuY29tL05hdGl2ZVNjcmlwdC9pb3MtcnVudGltZS9pc3N1ZXMvNzQyIGlzIGZpeGVkXG5cdC8vIHdlYlZpZXdEaWRSZWNlaXZlQXV0aGVudGljYXRpb25DaGFsbGVuZ2VDb21wbGV0aW9uSGFuZGxlcih3ZWJWaWV3OiBXS1dlYlZpZXcsIGNoYWxsZW5nZTogTlNVUkxBdXRoZW50aWNhdGlvbkNoYWxsZW5nZSwgY29tcGxldGlvbkhhbmRsZXI6IChwMTogTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLCBwMj86IE5TVVJMQ3JlZGVudGlhbCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIC8vICAgICAvLyBJZiB0aGlzIGlzIGEgY2VydGlmaWNhdGUgY2hhbGxlbmdlLCBzZWUgaWYgdGhlIGNlcnRpZmljYXRlIGhhcyBwcmV2aW91c2x5IGJlZW5cbiAgICAvLyAgICAgLy8gYWNjZXB0ZWQgYnkgdGhlIHVzZXIuXG4gICAgLy8gICAgIGNvbnN0IG9yaWdpbiA9IGAke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UuaG9zdH06JHtjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnBvcnR9YDtcbiAgICAvLyAgICAgY29uc3QgdHJ1c3QgPSBjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnNlcnZlclRydXN0O1xuICAgIC8vICAgICBjb25zdCBjZXJ0ID0gU2VjVHJ1c3RHZXRDZXJ0aWZpY2F0ZUF0SW5kZXgodHJ1c3QsIDApO1xuICAgIC8vICAgICBpZiAoY2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5hdXRoZW50aWNhdGlvbk1ldGhvZCA9PSBOU1VSTEF1dGhlbnRpY2F0aW9uTWV0aG9kU2VydmVyVHJ1c3QgJiZcbiAgICAvLyAgICAgICAgIHRydXN0ICYmIGNlcnQgJiYgX2NlcnRTdG9yZS5jb250YWluc0NlcnRpZmljYXRlKGNlcnQsIG9yaWdpbikpIHtcbiAgICAvLyAgICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5Vc2VDcmVkZW50aWFsLCBuZXcgTlNVUkxDcmVkZW50aWFsKHRydXN0KSlcbiAgICAvLyAgICAgICAgIHJldHVybjtcbiAgICAvLyAgICAgfVxuXG4gICAgLy8gICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5QZXJmb3JtRGVmYXVsdEhhbmRsaW5nLCB1bmRlZmluZWQpO1xuICAgIC8vIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgT2JqQ1Byb3RvY29scyA9IFtXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyLCBXS05hdmlnYXRpb25EZWxlZ2F0ZV07XG59Il19