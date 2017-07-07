"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Argon = require("@argonjs/argon");
var common = require("./argon-web-view-common");
var trace = require("trace");
var utils = require("utils/utils");
var dialogs = require("ui/dialogs");
var observable_1 = require("data/observable");
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
                if (o instanceof Error)
                    return o.message + '\n' + o.stack;
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
        _this.nativeView = _this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
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
            //this.set("isArgonApp", true);
            observable_1.Observable.prototype.set.call(this, 'isArgonApp', true);
        }
        else if (this.isArgonApp && !flag) {
            this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.opaque = true;
            //this.set("isArgonApp", false);
            observable_1.Observable.prototype.set.call(this, 'isArgonApp', false);
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
        this._ios.navigationDelegate = undefined;
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
        var webview = owner.get().ios;
        webview.addObserverForKeyPathOptionsContext(delegate, "title", 0, null);
        webview.addObserverForKeyPathOptionsContext(delegate, "URL", 0, null);
        webview.addObserverForKeyPathOptionsContext(delegate, "estimatedProgress", 0, null);
        return delegate;
    };
    ArgonWebViewDelegate.prototype.dealloc = function () {
        var owner = this._owner.get();
        var webview = (owner && owner.ios);
        webview.removeObserverForKeyPath(this, "title");
        webview.removeObserverForKeyPath(this, "URL");
        webview.removeObserverForKeyPath(this, "estimatedProgress");
    };
    ArgonWebViewDelegate.prototype.observeValueForKeyPathOfObjectChangeContext = function (keyPath, object, change, context) {
        var owner = this._owner.get();
        if (!owner)
            return;
        var wkWebView = owner.ios;
        switch (keyPath) {
            case "title":
                //owner.set(keyPath, wkWebView.title); 
                observable_1.Observable.prototype.set.call(owner, keyPath, wkWebView.title);
                break;
            case "URL":
                this.updateURL();
                break;
            case "estimatedProgress":
                //owner.set('progress', wkWebView.estimatedProgress);
                observable_1.Observable.prototype.set.call(owner, 'progress', wkWebView.estimatedProgress);
                break;
        }
    };
    ArgonWebViewDelegate.prototype.updateURL = function () {
        var owner = this._owner.get();
        if (!owner)
            return;
        var wkWebView = owner.ios;
        //owner.set("url", wkWebView.URL && wkWebView.URL.absoluteString);
        observable_1.Observable.prototype.set.call(owner, 'url', wkWebView.URL && wkWebView.URL.absoluteString);
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
            var navType = 'other';
            switch (navigationType) {
                case 0 /* LinkActivated */:
                    navType = 'linkClicked';
                    break;
                case 1 /* FormSubmitted */:
                    navType = 'formSubmitted';
                    break;
                case 2 /* BackForward */:
                    navType = 'backForward';
                    break;
                case 3 /* Reload */:
                    navType = 'reload';
                    break;
                case 4 /* FormResubmitted */:
                    navType = 'formResubmitted';
                    break;
            }
            var owner = this._owner.get();
            if (owner)
                owner['_onLoadStarted'](navigationAction.request.URL.absoluteString, navType);
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
        else if (url && url.host &&
            error.code === NSURLErrorCannotFindHost ||
            error.code === NSURLErrorCannotConnectToHost) {
            dialogs.alert("Cannot connect to host. Please check the URL or the server connection.");
        }
        else if (url && url.host &&
            error.code === NSURLErrorTimedOut) {
            dialogs.alert("Host is not responding. Please check if the host suppots HTTPS.");
        }
    };
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
    return ArgonWebViewDelegate;
}(NSObject));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUVsRCw2QkFBK0I7QUFDL0IsbUNBQXFDO0FBQ3JDLG9DQUFzQztBQUN0Qyw4Q0FBMkM7QUFFM0MsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUMscUJBQXFCLENBQUMsR0FBRyxRQUFRLENBQUM7QUFFM0gsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBSXhDLGdDQUFnQztBQUNoQyxvQkFBb0I7QUFDcEIsd0NBQXdDO0FBRXhDLHdEQUF3RDtBQUN4RCwwREFBMEQ7QUFDMUQsbURBQW1EO0FBQ25ELDhCQUE4QjtBQUM5QixRQUFRO0FBRVIsdUVBQXVFO0FBQ3ZFLDBEQUEwRDtBQUMxRCxrREFBa0Q7QUFDbEQscUNBQXFDO0FBQ3JDLFFBQVE7QUFFUix3REFBd0Q7QUFDeEQsMkNBQTJDO0FBQzNDLFFBQVE7QUFDUixJQUFJO0FBRUosc0NBQXNDO0FBRXRDO0lBQWtDLGdDQUFtQjtJQU9qRDtRQUFBLFlBQ0ksaUJBQU8sU0FnRlY7UUE5RUcsSUFBTSxhQUFhLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFNUQsYUFBYSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQztRQUMvQyxhQUFhLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxDQUFDO1FBQ25ELGFBQWEsQ0FBQyxtQ0FBbUMsR0FBRyxJQUFJLENBQUM7UUFDekQsYUFBYSxDQUFDLHdDQUF3QyxlQUErQixDQUFDO1FBQ3RGLGFBQWEsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQ3hDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMs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RSxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUk7WUFDdEIsS0FBSyxDQUFDLElBQUksS0FBSyxrQkFFZixDQUFDLENBQUMsQ0FBQztZQUNDLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUVBQWlFLENBQUMsQ0FBQztRQUN6RixDQUFDO0lBQ0wsQ0FBQztJQUVELG9GQUFvRjtJQUN2Riw4TkFBOE47SUFDM04sd0ZBQXdGO0lBQ3hGLCtCQUErQjtJQUMvQiw0RkFBNEY7SUFDNUYsMkRBQTJEO0lBQzNELDREQUE0RDtJQUM1RCxvR0FBb0c7SUFDcEcsMkVBQTJFO0lBQzNFLDRHQUE0RztJQUM1RyxrQkFBa0I7SUFDbEIsUUFBUTtJQUVSLGlHQUFpRztJQUNqRyxJQUFJO0lBRVUsa0NBQWEsR0FBRyxDQUFDLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDakYsMkJBQUM7Q0FBQSxBQWpORCxDQUFtQyxRQUFRLEdBaU4xQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2FyZ29uLXdlYi12aWV3LWNvbW1vbic7XG5pbXBvcnQge05hdmlnYXRpb25UeXBlfSBmcm9tICd1aS93ZWItdmlldyc7XG5pbXBvcnQgKiBhcyB0cmFjZSBmcm9tICd0cmFjZSc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuXG5jb25zdCBBUkdPTl9VU0VSX0FHRU5UID0gVUlXZWJWaWV3LmFsbG9jKCkuaW5pdCgpLnN0cmluZ0J5RXZhbHVhdGluZ0phdmFTY3JpcHRGcm9tU3RyaW5nKCduYXZpZ2F0b3IudXNlckFnZW50JykgKyAnIEFyZ29uJztcblxuY29uc3QgcHJvY2Vzc1Bvb2wgPSBXS1Byb2Nlc3NQb29sLm5ldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG5kZWNsYXJlIGNvbnN0IHdpbmRvdzphbnksIHdlYmtpdDphbnksIGRvY3VtZW50OmFueTtcblxuLy8vIEluLW1lbW9yeSBjZXJ0aWZpY2F0ZSBzdG9yZS5cbi8vIGNsYXNzIENlcnRTdG9yZSB7XG4vLyAgICAgcHJpdmF0ZSBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8vICAgICBwdWJsaWMgYWRkQ2VydGlmaWNhdGUoY2VydDogYW55LCBvcmlnaW46c3RyaW5nKSB7XG4vLyAgICAgICAgIGxldCBkYXRhOiBOU0RhdGEgPSBTZWNDZXJ0aWZpY2F0ZUNvcHlEYXRhKGNlcnQpXG4vLyAgICAgICAgIGxldCBrZXkgPSB0aGlzLmtleUZvckRhdGEoZGF0YSwgb3JpZ2luKTtcbi8vICAgICAgICAgdGhpcy5rZXlzLmFkZChrZXkpO1xuLy8gICAgIH1cblxuLy8gICAgIHB1YmxpYyBjb250YWluc0NlcnRpZmljYXRlKGNlcnQ6IGFueSwgb3JpZ2luOnN0cmluZykgOiBib29sZWFuIHtcbi8vICAgICAgICAgbGV0IGRhdGE6IE5TRGF0YSA9IFNlY0NlcnRpZmljYXRlQ29weURhdGEoY2VydClcbi8vICAgICAgICAgbGV0IGtleSA9IHRoaXMua2V5Rm9yRGF0YShkYXRhLCBvcmlnaW4pXG4vLyAgICAgICAgIHJldHVybiB0aGlzLmtleXMuaGFzKGtleSk7XG4vLyAgICAgfVxuXG4vLyAgICAgcHJpdmF0ZSBrZXlGb3JEYXRhKGRhdGE6IE5TRGF0YSwgb3JpZ2luOnN0cmluZykge1xuLy8gICAgICAgICByZXR1cm4gYCR7b3JpZ2lufS8ke2RhdGEuaGFzaH1gO1xuLy8gICAgIH1cbi8vIH1cblxuLy8gY29uc3QgX2NlcnRTdG9yZSA9IG5ldyBDZXJ0U3RvcmUoKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcgIHtcblxuICAgIHByaXZhdGUgX2lvczpXS1dlYlZpZXdcbiAgICBwcml2YXRlIF9kZWxlZ2F0ZTpVSVdlYlZpZXdEZWxlZ2F0ZVxuICAgIFxuICAgIHByaXZhdGUgX2FyZ29uRGVsZWdhdGU6QXJnb25XZWJWaWV3RGVsZWdhdGU7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9uID0gV0tXZWJWaWV3Q29uZmlndXJhdGlvbi5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0lubGluZU1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0FpclBsYXlGb3JNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NQaWN0dXJlSW5QaWN0dXJlTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ubWVkaWFUeXBlc1JlcXVpcmluZ1VzZXJBY3Rpb25Gb3JQbGF5YmFjayA9IFdLQXVkaW92aXN1YWxNZWRpYVR5cGVzLk5vbmU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ucHJvY2Vzc1Bvb2wgPSBwcm9jZXNzUG9vbDtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkVXNlclNjcmlwdChXS1VzZXJTY3JpcHQuYWxsb2MoKS5pbml0V2l0aFNvdXJjZUluamVjdGlvblRpbWVGb3JNYWluRnJhbWVPbmx5KGAoJHtcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxMb2cgPSBjb25zb2xlLmxvZztcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonbG9nJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbExvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbFdhcm4gPSBjb25zb2xlLndhcm47XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOid3YXJuJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbFdhcm4uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonZXJyb3InLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsRXJyb3IuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5oYW5kbGVkIEVycm9yOiAnICsgZS5tZXNzYWdlICsgJyAoJyArIGUuc291cmNlICsgJzonICsgZS5saW5lbm8gKyAnKScpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2VuZEFyZ29uQ2hlY2soZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPWFyZ29uXScpICE9PSBudWxsIHx8IHR5cGVvZihBcmdvbikgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQucGVyc2lzdGVkKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Ugd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5hcmdvbmNoZWNrLnBvc3RNZXNzYWdlKFwidHJ1ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMuYXJnb25jaGVjay5wb3N0TWVzc2FnZShcImZhbHNlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIF9zZW5kQXJnb25DaGVjayk7XG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwYWdlc2hvd1wiLCBfc2VuZEFyZ29uQ2hlY2spO1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluc3BlY3QobywgZGVwdGgpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IG51bGwpIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIFwidW5kZWZpbmVkXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgRXJyb3IpIHJldHVybiBvLm1lc3NhZ2UgKyAnXFxuJyArIG8uc3RhY2s7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbyA9PT0gJ251bWJlcicgfHwgbyBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIChvKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG8gPT09ICdzdHJpbmcnIHx8IG8gaW5zdGFuY2VvZiBTdHJpbmcpIHJldHVybiA8c3RyaW5nPiBvO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvKSkgcmV0dXJuIFwiQXJyYXlbXCIrIG8ubGVuZ3RoICtcIl1cIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gby50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVwdGggPiAwID8gYCR7Y2xhc3NOYW1lKG8pfSB7JHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5tYXAoKGtleSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdcXG4gICAgJyArIGtleSArICc6ICcgKyBpbnNwZWN0KG8sIGRlcHRoLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oKSArIE9iamVjdC5nZXRQcm90b3R5cGVPZihvKSA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXFxuICAgIF9fcHJvdG9fXzogJyArIGNsYXNzTmFtZShPYmplY3QuZ2V0UHJvdG90eXBlT2YobykpIDogXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbn1gIDogY2xhc3NOYW1lKG8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnNwZWN0RWFjaChhcmdzOklBcmd1bWVudHMpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3NBcnJheSA9IFtdLnNsaWNlLmNhbGwoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzQXJyYXkubWFwKChhcmcpPT5pbnNwZWN0KGFyZywxKSkuam9pbignICcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjbGFzc05hbWUobykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmFtZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LC0xKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICdPYmplY3QnKSBuYW1lID0gby5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LnRvU3RyaW5nKClcbiAgICAgICAgfSgpKWAsIFdLVXNlclNjcmlwdEluamVjdGlvblRpbWUuQXREb2N1bWVudFN0YXJ0LCB0cnVlKSk7XG5cbiAgICAgICAgLy8gV2Ugd2FudCB0byByZXBsYWNlIHRoZSBVSVdlYlZpZXcgY3JlYXRlZCBieSBzdXBlcmNsYXNzIHdpdGggV0tXZWJWaWV3IGluc3RhbmNlXG4gICAgICAgIHRoaXMubmF0aXZlVmlldyA9IHRoaXMuX2lvcyA9IFdLV2ViVmlldy5hbGxvYygpLmluaXRXaXRoRnJhbWVDb25maWd1cmF0aW9uKENHUmVjdFplcm8sIGNvbmZpZ3VyYXRpb24pO1xuICAgICAgICBkZWxldGUgdGhpcy5fZGVsZWdhdGUgLy8gcmVtb3ZlIHJlZmVyZW5jZSB0byBVSVdlYlZpZXcgZGVsZWdhdGUgY3JlYXRlZCBieSBzdXBlciBjbGFzc1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IHRoaXMuX2FyZ29uRGVsZWdhdGUgPSBBcmdvbldlYlZpZXdEZWxlZ2F0ZS5pbml0V2l0aE93bmVyKG5ldyBXZWFrUmVmKHRoaXMpKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImFyZ29uXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwiYXJnb25jaGVja1wiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImxvZ1wiKTtcblxuXHQgICAgdGhpcy5faW9zLmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gdHJ1ZTtcblx0XHR0aGlzLl9pb3NbJ2N1c3RvbVVzZXJBZ2VudCddID0gQVJHT05fVVNFUl9BR0VOVDtcblxuICAgICAgICAvLyBzdHlsZSBhcHByb3ByaWF0ZWx5XG4gICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgcHVibGljIF9zZXRJc0FyZ29uQXBwKGZsYWc6Ym9vbGVhbikge1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvbkFwcCAmJiBmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3IuY2xlYXJDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IGZhbHNlOyAgICAgICAgXG4gICAgICAgICAgICAvL3RoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCB0cnVlKTtcbiAgICAgICAgICAgIE9ic2VydmFibGUucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsICdpc0FyZ29uQXBwJywgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0FyZ29uQXBwICYmICFmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3Iud2hpdGVDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLndoaXRlQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IHRydWU7ICAgICAgICBcbiAgICAgICAgICAgIC8vdGhpcy5zZXQoXCJpc0FyZ29uQXBwXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIE9ic2VydmFibGUucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsICdpc0FyZ29uQXBwJywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGV2YWx1YXRlSmF2YXNjcmlwdChzY3JpcHQ6c3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KT0+e1xuICAgICAgICAgICAgdGhpcy5faW9zLmV2YWx1YXRlSmF2YVNjcmlwdENvbXBsZXRpb25IYW5kbGVyKHNjcmlwdCwgKHJlc3VsdCwgZXJyb3IpPT57XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSByZWplY3QoZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgICAgIGVsc2UgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZXZhbHVhdGVKYXZhc2NyaXB0V2l0aG91dFByb21pc2Uoc2NyaXB0OnN0cmluZykgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faW9zLmV2YWx1YXRlSmF2YVNjcmlwdENvbXBsZXRpb25IYW5kbGVyKHNjcmlwdCwgPGFueT5udWxsKVxuICAgIH1cblxuICAgIHB1YmxpYyBicmluZ1RvRnJvbnQoKSB7XG4gICAgICAgIHRoaXMuX2lvcy5zdXBlcnZpZXcuYnJpbmdTdWJ2aWV3VG9Gcm9udCh0aGlzLl9pb3MpO1xuICAgIH1cblxuICAgIHB1YmxpYyBvbkxvYWRlZCgpIHtcbiAgICAgICAgc3VwZXIub25Mb2FkZWQoKTtcbiAgICAgICAgdGhpcy5faW9zLm5hdmlnYXRpb25EZWxlZ2F0ZSA9IHRoaXMuX2FyZ29uRGVsZWdhdGU7XG4gICAgfVxuXG4gICAgcHVibGljIG9uVW5sb2FkZWQoKSB7XG4gICAgICAgIHRoaXMuX2lvcy5uYXZpZ2F0aW9uRGVsZWdhdGUgPSA8YW55PnVuZGVmaW5lZDtcbiAgICAgICAgc3VwZXIub25VbmxvYWRlZCgpO1xuICAgIH1cblxuICAgIHJlbG9hZCgpIHtcbiAgICAgICAgdGhpcy5faW9zLnJlbG9hZEZyb21PcmlnaW4oKTtcbiAgICB9XG59XG5cbmNsYXNzIEFyZ29uV2ViVmlld0RlbGVnYXRlIGV4dGVuZHMgTlNPYmplY3QgaW1wbGVtZW50cyBXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyLCBXS05hdmlnYXRpb25EZWxlZ2F0ZSB7XG4gICAgXG4gICAgcHJpdmF0ZSBfb3duZXI6V2Vha1JlZjxBcmdvbldlYlZpZXc+O1xuICAgIFxuICAgIHB1YmxpYyBzdGF0aWMgaW5pdFdpdGhPd25lcihvd25lcjpXZWFrUmVmPEFyZ29uV2ViVmlldz4pIHtcbiAgICAgICAgY29uc3QgZGVsZWdhdGUgPSA8QXJnb25XZWJWaWV3RGVsZWdhdGU+QXJnb25XZWJWaWV3RGVsZWdhdGUubmV3KClcbiAgICAgICAgZGVsZWdhdGUuX293bmVyID0gb3duZXI7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWJ2aWV3ID0gPFdLV2ViVmlldz5vd25lci5nZXQoKS5pb3M7XG4gICAgICAgIHdlYnZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwidGl0bGVcIiwgMCwgPGFueT5udWxsKTtcbiAgICAgICAgd2Vidmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJVUkxcIiwgMCwgPGFueT5udWxsKTtcbiAgICAgICAgd2Vidmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiLCAwLCA8YW55Pm51bGwpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRlbGVnYXRlO1xuICAgIH1cblxuICAgIGRlYWxsb2MoKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGNvbnN0IHdlYnZpZXcgPSA8V0tXZWJWaWV3PiAob3duZXIgJiYgb3duZXIuaW9zKTtcbiAgICAgICAgd2Vidmlldy5yZW1vdmVPYnNlcnZlckZvcktleVBhdGgodGhpcywgXCJ0aXRsZVwiKTtcbiAgICAgICAgd2Vidmlldy5yZW1vdmVPYnNlcnZlckZvcktleVBhdGgodGhpcywgXCJVUkxcIik7XG4gICAgICAgIHdlYnZpZXcucmVtb3ZlT2JzZXJ2ZXJGb3JLZXlQYXRoKHRoaXMsIFwiZXN0aW1hdGVkUHJvZ3Jlc3NcIik7XG4gICAgfVxuXG4gICAgb2JzZXJ2ZVZhbHVlRm9yS2V5UGF0aE9mT2JqZWN0Q2hhbmdlQ29udGV4dChrZXlQYXRoOnN0cmluZywgb2JqZWN0OmFueSwgY2hhbmdlOmFueSwgY29udGV4dDphbnkpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuOyAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmlvcztcblxuICAgICAgICBzd2l0Y2ggKGtleVBhdGgpIHtcbiAgICAgICAgICAgIGNhc2UgXCJ0aXRsZVwiOiBcbiAgICAgICAgICAgICAgICAvL293bmVyLnNldChrZXlQYXRoLCB3a1dlYlZpZXcudGl0bGUpOyBcbiAgICAgICAgICAgICAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5zZXQuY2FsbChvd25lciwga2V5UGF0aCwgd2tXZWJWaWV3LnRpdGxlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJVUkxcIjogXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiOlxuICAgICAgICAgICAgICAgIC8vb3duZXIuc2V0KCdwcm9ncmVzcycsIHdrV2ViVmlldy5lc3RpbWF0ZWRQcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgT2JzZXJ2YWJsZS5wcm90b3R5cGUuc2V0LmNhbGwob3duZXIsICdwcm9ncmVzcycsIHdrV2ViVmlldy5lc3RpbWF0ZWRQcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHVwZGF0ZVVSTCgpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuOyAgICAgXG4gICAgICAgIGNvbnN0IHdrV2ViVmlldyA9IDxXS1dlYlZpZXc+b3duZXIuaW9zO1xuICAgICAgICAvL293bmVyLnNldChcInVybFwiLCB3a1dlYlZpZXcuVVJMICYmIHdrV2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpO1xuICAgICAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5zZXQuY2FsbChvd25lciwgJ3VybCcsIHdrV2ViVmlldy5VUkwgJiYgd2tXZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgfVxuICAgIFxuICAgIC8vIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXJcblxuICAgIHVzZXJDb250ZW50Q29udHJvbGxlckRpZFJlY2VpdmVTY3JpcHRNZXNzYWdlKHVzZXJDb250ZW50Q29udHJvbGxlcjpXS1VzZXJDb250ZW50Q29udHJvbGxlciwgbWVzc2FnZTpXS1NjcmlwdE1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBpZiAobWVzc2FnZS5uYW1lID09PSAnYXJnb24nKSB7XG4gICAgICAgICAgICBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgICAgICAvLyBhcmdvbiBwYWdlLCBwZXJoYXBzIGJlY2F1c2UgYXJnb24uanMgbG9hZGVkIGFzeW5jcm9ub3VzbHkgXG4gICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBwcm9ncmFtbWVyIGRpZG4ndCBzZXQgdXAgYW4gYXJnb24gbWV0YSB0YWdcbiAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG93bmVyLl9oYW5kbGVBcmdvbk1lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdsb2cnKSB7XG4gICAgICAgICAgICBvd25lci5faGFuZGxlTG9nTWVzc2FnZShtZXNzYWdlLmJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uY2hlY2snKSB7XG4gICAgICAgICAgICBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5ib2R5ID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcChmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFdLTmF2aWdhdGlvbkRlbGVnYXRlXG5cbiAgICBwcml2YXRlIF9wcm92aXNpb25hbFVSTCA6IHN0cmluZztcblxuICAgIHdlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uQWN0aW9uRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uQWN0aW9uOldLTmF2aWdhdGlvbkFjdGlvbiwgZGVjaXNpb25IYW5kbGVyOihwb2xpY3k6V0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBpZiAobmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZSAmJiBuYXZpZ2F0aW9uQWN0aW9uLnRhcmdldEZyYW1lLm1haW5GcmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbmF2aWdhdGlvblR5cGU6V0tOYXZpZ2F0aW9uVHlwZSA9IG5hdmlnYXRpb25BY3Rpb24ubmF2aWdhdGlvblR5cGU7XG4gICAgICAgICAgICB2YXIgbmF2VHlwZTpOYXZpZ2F0aW9uVHlwZSA9ICdvdGhlcic7XG4gICAgICAgICAgICBzd2l0Y2ggKG5hdmlnYXRpb25UeXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkxpbmtBY3RpdmF0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGUgPSAnbGlua0NsaWNrZWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVN1Ym1pdHRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdmb3JtU3VibWl0dGVkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkJhY2tGb3J3YXJkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlID0gJ2JhY2tGb3J3YXJkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLlJlbG9hZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdyZWxvYWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVJlc3VibWl0dGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlID0gJ2Zvcm1SZXN1Ym1pdHRlZCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRTdGFydGVkJ10obmF2aWdhdGlvbkFjdGlvbi5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZywgbmF2VHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFjZS53cml0ZShcIkFyZ29uV2ViVmlldy53ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvbkFjdGlvbkRlY2lzaW9uSGFuZGxlcihcIiArIG5hdmlnYXRpb25BY3Rpb24ucmVxdWVzdC5VUkwuYWJzb2x1dGVTdHJpbmcgKyBcIiwgXCIgKyBuYXZpZ2F0aW9uQWN0aW9uLm5hdmlnYXRpb25UeXBlICsgXCIpXCIsIHRyYWNlLmNhdGVnb3JpZXMuRGVidWcpO1xuICAgICAgICBkZWNpc2lvbkhhbmRsZXIoV0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5LkFsbG93KTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvblJlc3BvbnNlRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uUmVzcG9uc2U6V0tOYXZpZ2F0aW9uUmVzcG9uc2UsIGRlY2lzaW9uSGFuZGxlcjoocG9saWN5OldLTmF2aWdhdGlvblJlc3BvbnNlUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBkZWNpc2lvbkhhbmRsZXIoV0tOYXZpZ2F0aW9uUmVzcG9uc2VQb2xpY3kuQWxsb3cpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRTdGFydFByb3Zpc2lvbmFsTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICB0aGlzLl9wcm92aXNpb25hbFVSTCA9IHdlYlZpZXcuVVJMICYmIHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRDb21taXROYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgb3duZXIuX2RpZENvbW1pdE5hdmlnYXRpb24oKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbFByb3Zpc2lvbmFsTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh0aGlzLl9wcm92aXNpb25hbFVSTCwgXCJQcm92aXNpb25hbCBuYXZpZ2F0aW9uIGZhaWxlZFwiKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmluaXNoTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxOYXZpZ2F0aW9uV2l0aEVycm9yKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uLCBlcnJvcjpOU0Vycm9yKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMICYmIHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nLCBlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjaGVja0lmV2ViQ29udGVudFByb2Nlc3NIYXNDcmFzaGVkKHdlYlZpZXc6IFdLV2ViVmlldywgZXJyb3I6IE5TRXJyb3IpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChlcnJvci5jb2RlID09IFdLRXJyb3JDb2RlLldlYkNvbnRlbnRQcm9jZXNzVGVybWluYXRlZCAmJiBlcnJvci5kb21haW4gPT0gXCJXZWJLaXRFcnJvckRvbWFpblwiKSB7XG4gICAgICAgICAgICB3ZWJWaWV3LnJlbG9hZEZyb21PcmlnaW4oKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbFByb3Zpc2lvbmFsTmF2aWdhdGlvbldpdGhFcnJvcih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbiwgZXJyb3I6IE5TRXJyb3IpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwgJiYgd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcsIGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcblxuICAgICAgICBpZiAodGhpcy5jaGVja0lmV2ViQ29udGVudFByb2Nlc3NIYXNDcmFzaGVkKHdlYlZpZXcsIGVycm9yKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXJsID0gZXJyb3IudXNlckluZm8ub2JqZWN0Rm9yS2V5KE5TVVJMRXJyb3JGYWlsaW5nVVJMRXJyb3JLZXkpIGFzIE5TVVJMO1xuICAgICAgICBpZiAodXJsICYmIHVybC5ob3N0ICYmIFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlVW50cnVzdGVkIHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlSGFzQmFkRGF0ZSB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZUhhc1Vua25vd25Sb290IHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlTm90WWV0VmFsaWQpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBjZXJ0Q2hhaW4gPSBlcnJvci51c2VySW5mby5vYmplY3RGb3JLZXkoJ05TRXJyb3JQZWVyQ2VydGlmaWNhdGVDaGFpbktleScpO1xuICAgICAgICAgICAgICAgIC8vIGNvbnN0IGNlcnQgPSBjZXJ0Q2hhaW4gJiYgY2VydENoYWluWzBdO1xuICAgICAgICAgICAgICAgIC8vIGRpYWxvZ3MuY29uZmlybShgJHtlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbn0gV291bGQgeW91IGxpa2UgdG8gY29udGludWUgYW55d2F5P2ApLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBjb25zdCBvcmlnaW4gPSBgJHt1cmwuaG9zdH06JHt1cmwucG9ydHx8NDQzfWA7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBfY2VydFN0b3JlLmFkZENlcnRpZmljYXRlKGNlcnQsIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB3ZWJWaWV3LmxvYWRSZXF1ZXN0KG5ldyBOU1VSTFJlcXVlc3Qoe1VSTDp1cmx9KSk7XG4gICAgICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgICAgICAvLyB9KS5jYXRjaCgoKT0+e30pO1xuXG4gICAgICAgICAgICAgICAgZGlhbG9ncy5hbGVydChlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbiArIFwiIEEgYnVnIGluIEFyZ29uNCBwcmV2ZW50cyB1cyBmcm9tIGNvbnRpbnVpbmcuIFBsZWFzZSB1c2UgYSBzaXRlIHdpdGggYSB2YWxpZCBjZXJ0aWZpY2F0ZS4gIFdlIHdpbGwgZml4IHRoaXMgc29vbi5cIik7XG4gICAgICAgIH0gZWxzZSBpZiAodXJsICYmIHVybC5ob3N0ICYmXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yQ2Fubm90RmluZEhvc3QgfHxcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JDYW5ub3RDb25uZWN0VG9Ib3N0KSB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5hbGVydChcIkNhbm5vdCBjb25uZWN0IHRvIGhvc3QuIFBsZWFzZSBjaGVjayB0aGUgVVJMIG9yIHRoZSBzZXJ2ZXIgY29ubmVjdGlvbi5cIik7XG4gICAgICAgIH0gZWxzZSBpZiAodXJsICYmIHVybC5ob3N0ICYmXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yVGltZWRPdXRcbiAgICAgICAgICAgIC8vfHwgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvckNhbmNlbGxlZFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5hbGVydChcIkhvc3QgaXMgbm90IHJlc3BvbmRpbmcuIFBsZWFzZSBjaGVjayBpZiB0aGUgaG9zdCBzdXBwb3RzIEhUVFBTLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvbW1lbnQgb3V0IHVudGlsIGh0dHBzOi8vZ2l0aHViLmNvbS9OYXRpdmVTY3JpcHQvaW9zLXJ1bnRpbWUvaXNzdWVzLzc0MiBpcyBmaXhlZFxuXHQvLyB3ZWJWaWV3RGlkUmVjZWl2ZUF1dGhlbnRpY2F0aW9uQ2hhbGxlbmdlQ29tcGxldGlvbkhhbmRsZXIod2ViVmlldzogV0tXZWJWaWV3LCBjaGFsbGVuZ2U6IE5TVVJMQXV0aGVudGljYXRpb25DaGFsbGVuZ2UsIGNvbXBsZXRpb25IYW5kbGVyOiAocDE6IE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbiwgcDI/OiBOU1VSTENyZWRlbnRpYWwpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAvLyAgICAgLy8gSWYgdGhpcyBpcyBhIGNlcnRpZmljYXRlIGNoYWxsZW5nZSwgc2VlIGlmIHRoZSBjZXJ0aWZpY2F0ZSBoYXMgcHJldmlvdXNseSBiZWVuXG4gICAgLy8gICAgIC8vIGFjY2VwdGVkIGJ5IHRoZSB1c2VyLlxuICAgIC8vICAgICBjb25zdCBvcmlnaW4gPSBgJHtjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLmhvc3R9OiR7Y2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5wb3J0fWA7XG4gICAgLy8gICAgIGNvbnN0IHRydXN0ID0gY2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5zZXJ2ZXJUcnVzdDtcbiAgICAvLyAgICAgY29uc3QgY2VydCA9IFNlY1RydXN0R2V0Q2VydGlmaWNhdGVBdEluZGV4KHRydXN0LCAwKTtcbiAgICAvLyAgICAgaWYgKGNoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UuYXV0aGVudGljYXRpb25NZXRob2QgPT0gTlNVUkxBdXRoZW50aWNhdGlvbk1ldGhvZFNlcnZlclRydXN0ICYmXG4gICAgLy8gICAgICAgICB0cnVzdCAmJiBjZXJ0ICYmIF9jZXJ0U3RvcmUuY29udGFpbnNDZXJ0aWZpY2F0ZShjZXJ0LCBvcmlnaW4pKSB7XG4gICAgLy8gICAgICAgICBjb21wbGV0aW9uSGFuZGxlcihOU1VSTFNlc3Npb25BdXRoQ2hhbGxlbmdlRGlzcG9zaXRpb24uVXNlQ3JlZGVudGlhbCwgbmV3IE5TVVJMQ3JlZGVudGlhbCh0cnVzdCkpXG4gICAgLy8gICAgICAgICByZXR1cm47XG4gICAgLy8gICAgIH1cblxuICAgIC8vICAgICBjb21wbGV0aW9uSGFuZGxlcihOU1VSTFNlc3Npb25BdXRoQ2hhbGxlbmdlRGlzcG9zaXRpb24uUGVyZm9ybURlZmF1bHRIYW5kbGluZywgdW5kZWZpbmVkKTtcbiAgICAvLyB9XG5cbiAgICBwdWJsaWMgc3RhdGljIE9iakNQcm90b2NvbHMgPSBbV0tTY3JpcHRNZXNzYWdlSGFuZGxlciwgV0tOYXZpZ2F0aW9uRGVsZWdhdGVdO1xufSJdfQ==