"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./argon-web-view-common");
var trace = require("trace");
// import * as utils from 'utils/utils';
var dialogs = require("ui/dialogs");
var webxr_1 = require("./webxr");
var ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' ArgonXR/' + common.PROTOCOL_VERSION_STRING;
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
var ArgonWebView = /** @class */ (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this._argonPages = {};
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
                if (event.persisted) {
                    window.location.reload(false);
                    return;
                }
                if (document.head.querySelector('meta[name=argon]') !== null || typeof (window['Argon']) !== 'undefined') {
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
            window['ARGON_BROWSER'] = {
                xr: true,
                postMessage: function (message) {
                    webkit.messageHandlers.argon(message);
                },
                onmessage: null
            };
        }.toString() + "());\n        " + webxr_1.WEBXR_API + "\n        ", 0 /* AtDocumentStart */, true));
        // We want to replace the UIWebView created by superclass with WKWebView instance
        var webView = _this.nativeView = _this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
        delete _this._delegate; // remove reference to UIWebView delegate created by super class
        var delegate = _this._argonDelegate = ArgonWebViewDelegate.initWithOwner(new WeakRef(_this));
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argon");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argoncheck");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "log");
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true;
        webView.allowsBackForwardNavigationGestures = true;
        webView.customUserAgent = ARGON_USER_AGENT;
        webView.contentMode = 2 /* ScaleAspectFill */;
        // style appropriately
        webView.scrollView.layer.masksToBounds = false;
        webView.layer.masksToBounds = false;
        return _this;
    }
    ArgonWebView.prototype._setIsArgonPage = function (flag, url) {
        // if (flag) this._argonPages[url] = true;
        // if (!this.isArgonPage && flag) {
        //     this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
        //     this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
        //     this._ios.opaque = false;     
        //     common.isArgonPageProperty.nativeValueChange(this, true);   
        //     // this.set("isArgonPage", true);
        // } else if (this.isArgonPage && !flag) {
        //     this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
        //     this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
        //     this._ios.opaque = true;        
        //     // this.set("isArgonPage", false);
        //     common.isArgonPageProperty.nativeValueChange(this, false);
        // }
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
var ArgonWebViewDelegate = /** @class */ (function (_super) {
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
                common.titleProperty.nativeValueChange(owner, wkWebView.title);
                break;
            case "URL":
                common.urlProperty.nativeValueChange(owner, wkWebView.URL && wkWebView.URL.absoluteString);
                break;
            case "estimatedProgress":
                common.progressProperty.nativeValueChange(owner, wkWebView.estimatedProgress);
                break;
        }
    };
    // private updateURL() {
    //     const owner = this._owner.get();
    //     if (!owner) return;     
    //     const wkWebView = <WKWebView>owner.ios;
    //     owner.set("url", wkWebView.URL && wkWebView.URL.absoluteString);
    // }
    // WKScriptMessageHandler
    ArgonWebViewDelegate.prototype.userContentControllerDidReceiveScriptMessage = function (userContentController, message) {
        var owner = this._owner.get();
        if (!owner)
            return;
        // const url = message.frameInfo.request.URL.absoluteString;
        if (message.name === 'argon') {
            // if (!owner.session) {  
            //     // just in case we thought below that the page was not an
            //     // argon page, perhaps because argon.js loaded asyncronously 
            //     // and the programmer didn't set up an argon meta tag
            //     owner._setIsArgonPage(true, url);
            // }
            owner._handleArgonMessage(message.body);
        }
        else if (message.name === 'log') {
            owner._handleLogMessage(message.body);
        }
        else if (message.name === 'argoncheck') {
            // if (!owner.session) {
            //     if (message.body === "true") {
            //         owner._setIsArgonPage(true, url);
            //     } else {
            //         owner._setIsArgonPage(false, url);
            //     }
            // }
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
            if (owner) {
                var url = navigationAction.request.URL.absoluteString;
                if (!owner._argonPages[url])
                    owner._setIsArgonPage(false, url);
                owner['_onLoadStarted'](url, navType);
            }
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
        // this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFailProvisionalNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (!owner)
            return;
        owner['_onLoadFinished'](this._provisionalURL, "Provisional navigation failed");
        // this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFinishNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString);
        // this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFailNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString, error.localizedDescription);
        // this.updateURL();
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
        // this.updateURL();
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
            dialogs.alert(error.localizedDescription + " A bug in Argon prevents us from continuing. Please use a site with a valid certificate.  We will fix this soon.");
        }
        else if (url && url.host &&
            error.code === NSURLErrorCannotFindHost ||
            error.code === NSURLErrorCannotConnectToHost) {
            dialogs.alert(error.localizedDescription);
        }
        else if (url && url.host &&
            error.code === NSURLErrorTimedOut
        //|| error.code === NSURLErrorCancelled
        ) {
            dialogs.alert(error.localizedDescription);
        }
    };
    ArgonWebViewDelegate.prototype.webViewWebContentProcessDidTerminate = function (webView) {
        var owner = this._owner.get();
        if (owner)
            owner.reload();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLGdEQUFrRDtBQUVsRCw2QkFBK0I7QUFDL0Isd0NBQXdDO0FBQ3hDLG9DQUFzQztBQUN0QyxpQ0FBa0M7QUFFbEMsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUMscUJBQXFCLENBQUMsR0FBRyxXQUFXLEdBQUcsTUFBTSxDQUFDLHVCQUF1QixDQUFDO0FBRS9KLElBQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUl4QyxnQ0FBZ0M7QUFDaEMsb0JBQW9CO0FBQ3BCLHdDQUF3QztBQUV4Qyx3REFBd0Q7QUFDeEQsMERBQTBEO0FBQzFELG1EQUFtRDtBQUNuRCw4QkFBOEI7QUFDOUIsUUFBUTtBQUVSLHVFQUF1RTtBQUN2RSwwREFBMEQ7QUFDMUQsa0RBQWtEO0FBQ2xELHFDQUFxQztBQUNyQyxRQUFRO0FBRVIsd0RBQXdEO0FBQ3hELDJDQUEyQztBQUMzQyxRQUFRO0FBQ1IsSUFBSTtBQUVKLHNDQUFzQztBQUV0QztJQUFrQyxnQ0FBbUI7SUFPakQ7UUFBQSxZQUNJLGlCQUFPLFNBNEZWO1FBRU0saUJBQVcsR0FBRyxFQUFFLENBQUM7UUE1RnBCLElBQU0sYUFBYSxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTVELGFBQWEsQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUM7UUFDL0MsYUFBYSxDQUFDLDZCQUE2QixHQUFHLElBQUksQ0FBQztRQUNuRCxhQUFhLENBQUMsbUNBQW1DLEdBQUcsSUFBSSxDQUFDO1FBQ3pELGFBQWEsQ0FBQyx3Q0FBd0MsZUFBK0IsQ0FBQztRQUN0RixhQUFhLENBQUMsV0FBVyxHQUFHLFdB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NE4xQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2FyZ29uLXdlYi12aWV3LWNvbW1vbic7XG5pbXBvcnQge05hdmlnYXRpb25UeXBlfSBmcm9tICd1aS93ZWItdmlldyc7XG5pbXBvcnQgKiBhcyB0cmFjZSBmcm9tICd0cmFjZSc7XG4vLyBpbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0IHtXRUJYUl9BUEl9IGZyb20gJy4vd2VieHInO1xuXG5jb25zdCBBUkdPTl9VU0VSX0FHRU5UID0gVUlXZWJWaWV3LmFsbG9jKCkuaW5pdCgpLnN0cmluZ0J5RXZhbHVhdGluZ0phdmFTY3JpcHRGcm9tU3RyaW5nKCduYXZpZ2F0b3IudXNlckFnZW50JykgKyAnIEFyZ29uWFIvJyArIGNvbW1vbi5QUk9UT0NPTF9WRVJTSU9OX1NUUklORztcblxuY29uc3QgcHJvY2Vzc1Bvb2wgPSBXS1Byb2Nlc3NQb29sLm5ldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG5kZWNsYXJlIGNvbnN0IHdpbmRvdzphbnksIHdlYmtpdDphbnksIGRvY3VtZW50OmFueTtcblxuLy8vIEluLW1lbW9yeSBjZXJ0aWZpY2F0ZSBzdG9yZS5cbi8vIGNsYXNzIENlcnRTdG9yZSB7XG4vLyAgICAgcHJpdmF0ZSBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8vICAgICBwdWJsaWMgYWRkQ2VydGlmaWNhdGUoY2VydDogYW55LCBvcmlnaW46c3RyaW5nKSB7XG4vLyAgICAgICAgIGxldCBkYXRhOiBOU0RhdGEgPSBTZWNDZXJ0aWZpY2F0ZUNvcHlEYXRhKGNlcnQpXG4vLyAgICAgICAgIGxldCBrZXkgPSB0aGlzLmtleUZvckRhdGEoZGF0YSwgb3JpZ2luKTtcbi8vICAgICAgICAgdGhpcy5rZXlzLmFkZChrZXkpO1xuLy8gICAgIH1cblxuLy8gICAgIHB1YmxpYyBjb250YWluc0NlcnRpZmljYXRlKGNlcnQ6IGFueSwgb3JpZ2luOnN0cmluZykgOiBib29sZWFuIHtcbi8vICAgICAgICAgbGV0IGRhdGE6IE5TRGF0YSA9IFNlY0NlcnRpZmljYXRlQ29weURhdGEoY2VydClcbi8vICAgICAgICAgbGV0IGtleSA9IHRoaXMua2V5Rm9yRGF0YShkYXRhLCBvcmlnaW4pXG4vLyAgICAgICAgIHJldHVybiB0aGlzLmtleXMuaGFzKGtleSk7XG4vLyAgICAgfVxuXG4vLyAgICAgcHJpdmF0ZSBrZXlGb3JEYXRhKGRhdGE6IE5TRGF0YSwgb3JpZ2luOnN0cmluZykge1xuLy8gICAgICAgICByZXR1cm4gYCR7b3JpZ2lufS8ke2RhdGEuaGFzaH1gO1xuLy8gICAgIH1cbi8vIH1cblxuLy8gY29uc3QgX2NlcnRTdG9yZSA9IG5ldyBDZXJ0U3RvcmUoKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcgIHtcblxuICAgIHByaXZhdGUgX2lvczpXS1dlYlZpZXdcbiAgICBwcml2YXRlIF9kZWxlZ2F0ZTpVSVdlYlZpZXdEZWxlZ2F0ZVxuICAgIFxuICAgIHByaXZhdGUgX2FyZ29uRGVsZWdhdGU6QXJnb25XZWJWaWV3RGVsZWdhdGU7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbiA9IFdLV2ViVmlld0NvbmZpZ3VyYXRpb24uYWxsb2MoKS5pbml0KCk7XG4gICAgICAgIFxuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0lubGluZU1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0FpclBsYXlGb3JNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NQaWN0dXJlSW5QaWN0dXJlTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ubWVkaWFUeXBlc1JlcXVpcmluZ1VzZXJBY3Rpb25Gb3JQbGF5YmFjayA9IFdLQXVkaW92aXN1YWxNZWRpYVR5cGVzLk5vbmU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ucHJvY2Vzc1Bvb2wgPSBwcm9jZXNzUG9vbDtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkVXNlclNjcmlwdChXS1VzZXJTY3JpcHQuYWxsb2MoKS5pbml0V2l0aFNvdXJjZUluamVjdGlvblRpbWVGb3JNYWluRnJhbWVPbmx5KGAoJHtcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxMb2cgPSBjb25zb2xlLmxvZztcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonbG9nJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbExvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbFdhcm4gPSBjb25zb2xlLndhcm47XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOid3YXJuJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbFdhcm4uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonZXJyb3InLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsRXJyb3IuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5oYW5kbGVkIEVycm9yOiAnICsgZS5tZXNzYWdlICsgJyAoJyArIGUuc291cmNlICsgJzonICsgZS5saW5lbm8gKyAnKScpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2VuZEFyZ29uQ2hlY2soZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnBlcnNpc3RlZCkgeyB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKTsgcmV0dXJuIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPWFyZ29uXScpICE9PSBudWxsIHx8IHR5cGVvZih3aW5kb3dbJ0FyZ29uJ10pICE9PSAndW5kZWZpbmVkJykgeyAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMuYXJnb25jaGVjay5wb3N0TWVzc2FnZShcInRydWVcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmFyZ29uY2hlY2sucG9zdE1lc3NhZ2UoXCJmYWxzZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBfc2VuZEFyZ29uQ2hlY2spO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicGFnZXNob3dcIiwgX3NlbmRBcmdvbkNoZWNrKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnNwZWN0KG8sIGRlcHRoKSA6IHN0cmluZyB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvID09PSBudWxsKSByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvID09PSB1bmRlZmluZWQpIHJldHVybiBcInVuZGVmaW5lZFwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gby5tZXNzYWdlICsgJ1xcbicgKyBvLnN0YWNrO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG8gPT09ICdudW1iZXInIHx8IG8gaW5zdGFuY2VvZiBOdW1iZXIpIHJldHVybiAobykudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCBvIGluc3RhbmNlb2YgU3RyaW5nKSByZXR1cm4gPHN0cmluZz4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobykpIHJldHVybiBcIkFycmF5W1wiKyBvLmxlbmd0aCArXCJdXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIG8udG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlcHRoID4gMCA/IGAke2NsYXNzTmFtZShvKX0geyR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMobykubWFwKChrZXkpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnXFxuICAgICcgKyBrZXkgKyAnOiAnICsgaW5zcGVjdChvLCBkZXB0aC0xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCkgKyBPYmplY3QuZ2V0UHJvdG90eXBlT2YobykgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1xcbiAgICBfX3Byb3RvX186ICcgKyBjbGFzc05hbWUoT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pKSA6IFwiXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG59YCA6IGNsYXNzTmFtZShvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5zcGVjdEVhY2goYXJnczpJQXJndW1lbnRzKSA6IHN0cmluZyB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzQXJyYXkgPSBbXS5zbGljZS5jYWxsKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc0FycmF5Lm1hcCgoYXJnKT0+aW5zcGVjdChhcmcsMSkpLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2xhc3NOYW1lKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5hbWUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykuc2xpY2UoOCwtMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAnT2JqZWN0JykgbmFtZSA9IG8uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2luZG93WydBUkdPTl9CUk9XU0VSJ10gPSB7XG4gICAgICAgICAgICAgICAgICAgIHhyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBwb3N0TWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5hcmdvbihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25tZXNzYWdlOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS50b1N0cmluZygpXG4gICAgICAgIH0oKSk7XG4gICAgICAgICR7V0VCWFJfQVBJfVxuICAgICAgICBgLCBXS1VzZXJTY3JpcHRJbmplY3Rpb25UaW1lLkF0RG9jdW1lbnRTdGFydCwgdHJ1ZSkpO1xuXG4gICAgICAgIC8vIFdlIHdhbnQgdG8gcmVwbGFjZSB0aGUgVUlXZWJWaWV3IGNyZWF0ZWQgYnkgc3VwZXJjbGFzcyB3aXRoIFdLV2ViVmlldyBpbnN0YW5jZVxuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gdGhpcy5uYXRpdmVWaWV3ID0gdGhpcy5faW9zID0gV0tXZWJWaWV3LmFsbG9jKCkuaW5pdFdpdGhGcmFtZUNvbmZpZ3VyYXRpb24oQ0dSZWN0WmVybywgY29uZmlndXJhdGlvbik7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9kZWxlZ2F0ZSAvLyByZW1vdmUgcmVmZXJlbmNlIHRvIFVJV2ViVmlldyBkZWxlZ2F0ZSBjcmVhdGVkIGJ5IHN1cGVyIGNsYXNzXG4gICAgICAgIGNvbnN0IGRlbGVnYXRlID0gdGhpcy5fYXJnb25EZWxlZ2F0ZSA9IEFyZ29uV2ViVmlld0RlbGVnYXRlLmluaXRXaXRoT3duZXIobmV3IFdlYWtSZWYodGhpcykpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwiYXJnb25cIik7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFNjcmlwdE1lc3NhZ2VIYW5kbGVyTmFtZShkZWxlZ2F0ZSwgXCJhcmdvbmNoZWNrXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwibG9nXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnByZWZlcmVuY2VzLmphdmFTY3JpcHRDYW5PcGVuV2luZG93c0F1dG9tYXRpY2FsbHkgPSB0cnVlO1xuXG5cdCAgICB3ZWJWaWV3LmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gdHJ1ZTtcbiAgICAgICAgd2ViVmlldy5jdXN0b21Vc2VyQWdlbnQgPSBBUkdPTl9VU0VSX0FHRU5UO1xuICAgICAgICB3ZWJWaWV3LmNvbnRlbnRNb2RlID0gVUlWaWV3Q29udGVudE1vZGUuU2NhbGVBc3BlY3RGaWxsXG5cbiAgICAgICAgLy8gc3R5bGUgYXBwcm9wcmlhdGVseVxuICAgICAgICB3ZWJWaWV3LnNjcm9sbFZpZXcubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICB3ZWJWaWV3LmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgcHVibGljIF9hcmdvblBhZ2VzID0ge307XG4gICAgcHVibGljIF9zZXRJc0FyZ29uUGFnZShmbGFnOmJvb2xlYW4sIHVybDpzdHJpbmcpIHtcbiAgICAgICAgLy8gaWYgKGZsYWcpIHRoaXMuX2FyZ29uUGFnZXNbdXJsXSA9IHRydWU7XG4gICAgICAgIC8vIGlmICghdGhpcy5pc0FyZ29uUGFnZSAmJiBmbGFnKSB7XG4gICAgICAgIC8vICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3IuY2xlYXJDb2xvcik7XG4gICAgICAgIC8vICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAvLyAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IGZhbHNlOyAgICAgXG4gICAgICAgIC8vICAgICBjb21tb24uaXNBcmdvblBhZ2VQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB0cnVlKTsgICBcbiAgICAgICAgLy8gICAgIC8vIHRoaXMuc2V0KFwiaXNBcmdvblBhZ2VcIiwgdHJ1ZSk7XG4gICAgICAgIC8vIH0gZWxzZSBpZiAodGhpcy5pc0FyZ29uUGFnZSAmJiAhZmxhZykge1xuICAgICAgICAvLyAgICAgdGhpcy5faW9zLnNjcm9sbFZpZXcuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLndoaXRlQ29sb3IpO1xuICAgICAgICAvLyAgICAgdGhpcy5faW9zLmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci53aGl0ZUNvbG9yKTtcbiAgICAgICAgLy8gICAgIHRoaXMuX2lvcy5vcGFxdWUgPSB0cnVlOyAgICAgICAgXG4gICAgICAgIC8vICAgICAvLyB0aGlzLnNldChcImlzQXJnb25QYWdlXCIsIGZhbHNlKTtcbiAgICAgICAgLy8gICAgIGNvbW1vbi5pc0FyZ29uUGFnZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIGZhbHNlKTtcbiAgICAgICAgLy8gfVxuICAgIH1cblxuICAgIHB1YmxpYyBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OnN0cmluZykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCk9PntcbiAgICAgICAgICAgIHRoaXMuX2lvcy5ldmFsdWF0ZUphdmFTY3JpcHRDb21wbGV0aW9uSGFuZGxlcihzY3JpcHQsIChyZXN1bHQsIGVycm9yKT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikgcmVqZWN0KGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICBlbHNlIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKHNjcmlwdDpzdHJpbmcpIDogdm9pZCB7XG4gICAgICAgIHRoaXMuX2lvcy5ldmFsdWF0ZUphdmFTY3JpcHRDb21wbGV0aW9uSGFuZGxlcihzY3JpcHQsIDxhbnk+bnVsbClcbiAgICB9XG5cbiAgICBwdWJsaWMgYnJpbmdUb0Zyb250KCkge1xuICAgICAgICB0aGlzLl9pb3Muc3VwZXJ2aWV3LmJyaW5nU3Vidmlld1RvRnJvbnQodGhpcy5faW9zKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb25Mb2FkZWQoKSB7XG4gICAgICAgIHN1cGVyLm9uTG9hZGVkKCk7XG4gICAgICAgIHRoaXMuX2lvcy5uYXZpZ2F0aW9uRGVsZWdhdGUgPSB0aGlzLl9hcmdvbkRlbGVnYXRlO1xuICAgIH1cblxuICAgIHB1YmxpYyBvblVubG9hZGVkKCkge1xuICAgICAgICB0aGlzLl9pb3MubmF2aWdhdGlvbkRlbGVnYXRlID0gPGFueT51bmRlZmluZWQ7XG4gICAgICAgIHN1cGVyLm9uVW5sb2FkZWQoKTtcbiAgICB9XG5cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIHRoaXMuX2lvcy5yZWxvYWRGcm9tT3JpZ2luKCk7XG4gICAgfVxufVxuXG5jbGFzcyBBcmdvbldlYlZpZXdEZWxlZ2F0ZSBleHRlbmRzIE5TT2JqZWN0IGltcGxlbWVudHMgV0tTY3JpcHRNZXNzYWdlSGFuZGxlciwgV0tOYXZpZ2F0aW9uRGVsZWdhdGUge1xuICAgIFxuICAgIHByaXZhdGUgX293bmVyOldlYWtSZWY8QXJnb25XZWJWaWV3PjtcbiAgICBcbiAgICBwdWJsaWMgc3RhdGljIGluaXRXaXRoT3duZXIob3duZXI6V2Vha1JlZjxBcmdvbldlYlZpZXc+KSB7XG4gICAgICAgIGNvbnN0IGRlbGVnYXRlID0gPEFyZ29uV2ViVmlld0RlbGVnYXRlPkFyZ29uV2ViVmlld0RlbGVnYXRlLm5ldygpXG4gICAgICAgIGRlbGVnYXRlLl9vd25lciA9IG93bmVyO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2VidmlldyA9IDxXS1dlYlZpZXc+b3duZXIuZ2V0KCkuaW9zO1xuICAgICAgICB3ZWJ2aWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcInRpdGxlXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIHdlYnZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwiVVJMXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIHdlYnZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwiZXN0aW1hdGVkUHJvZ3Jlc3NcIiwgMCwgPGFueT5udWxsKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkZWxlZ2F0ZTtcbiAgICB9XG5cbiAgICBkZWFsbG9jKCkge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBjb25zdCB3ZWJ2aWV3ID0gPFdLV2ViVmlldz4gKG93bmVyICYmIG93bmVyLmlvcyk7XG4gICAgICAgIHdlYnZpZXcucmVtb3ZlT2JzZXJ2ZXJGb3JLZXlQYXRoKHRoaXMsIFwidGl0bGVcIik7XG4gICAgICAgIHdlYnZpZXcucmVtb3ZlT2JzZXJ2ZXJGb3JLZXlQYXRoKHRoaXMsIFwiVVJMXCIpO1xuICAgICAgICB3ZWJ2aWV3LnJlbW92ZU9ic2VydmVyRm9yS2V5UGF0aCh0aGlzLCBcImVzdGltYXRlZFByb2dyZXNzXCIpO1xuICAgIH1cblxuICAgIG9ic2VydmVWYWx1ZUZvcktleVBhdGhPZk9iamVjdENoYW5nZUNvbnRleHQoa2V5UGF0aDpzdHJpbmcsIG9iamVjdDphbnksIGNoYW5nZTphbnksIGNvbnRleHQ6YW55KSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjsgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2tXZWJWaWV3ID0gPFdLV2ViVmlldz5vd25lci5pb3M7XG5cbiAgICAgICAgc3dpdGNoIChrZXlQYXRoKSB7XG5cbiAgICAgICAgICAgIGNhc2UgXCJ0aXRsZVwiOiBcbiAgICAgICAgICAgIGNvbW1vbi50aXRsZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKG93bmVyLCB3a1dlYlZpZXcudGl0bGUpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJVUkxcIjogXG4gICAgICAgICAgICBjb21tb24udXJsUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2Uob3duZXIsIHdrV2ViVmlldy5VUkwgJiYgd2tXZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImVzdGltYXRlZFByb2dyZXNzXCI6XG4gICAgICAgICAgICBjb21tb24ucHJvZ3Jlc3NQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZShvd25lciwgd2tXZWJWaWV3LmVzdGltYXRlZFByb2dyZXNzKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gcHJpdmF0ZSB1cGRhdGVVUkwoKSB7XG4gICAgLy8gICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgLy8gICAgIGlmICghb3duZXIpIHJldHVybjsgICAgIFxuICAgIC8vICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmlvcztcbiAgICAvLyAgICAgb3duZXIuc2V0KFwidXJsXCIsIHdrV2ViVmlldy5VUkwgJiYgd2tXZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgLy8gfVxuICAgIFxuICAgIC8vIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXJcblxuICAgIHVzZXJDb250ZW50Q29udHJvbGxlckRpZFJlY2VpdmVTY3JpcHRNZXNzYWdlKHVzZXJDb250ZW50Q29udHJvbGxlcjpXS1VzZXJDb250ZW50Q29udHJvbGxlciwgbWVzc2FnZTpXS1NjcmlwdE1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICAvLyBjb25zdCB1cmwgPSBtZXNzYWdlLmZyYW1lSW5mby5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICAgICAgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uJykge1xuICAgICAgICAgICAgLy8gaWYgKCFvd25lci5zZXNzaW9uKSB7ICBcbiAgICAgICAgICAgIC8vICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgIC8vICAgICAvLyBhcmdvbiBwYWdlLCBwZXJoYXBzIGJlY2F1c2UgYXJnb24uanMgbG9hZGVkIGFzeW5jcm9ub3VzbHkgXG4gICAgICAgICAgICAvLyAgICAgLy8gYW5kIHRoZSBwcm9ncmFtbWVyIGRpZG4ndCBzZXQgdXAgYW4gYXJnb24gbWV0YSB0YWdcbiAgICAgICAgICAgIC8vICAgICBvd25lci5fc2V0SXNBcmdvblBhZ2UodHJ1ZSwgdXJsKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIG93bmVyLl9oYW5kbGVBcmdvbk1lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdsb2cnKSB7XG4gICAgICAgICAgICBvd25lci5faGFuZGxlTG9nTWVzc2FnZShtZXNzYWdlLmJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uY2hlY2snKSB7XG4gICAgICAgICAgICAvLyBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgIC8vICAgICBpZiAobWVzc2FnZS5ib2R5ID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgLy8gICAgICAgICBvd25lci5fc2V0SXNBcmdvblBhZ2UodHJ1ZSwgdXJsKTtcbiAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gICAgICAgICBvd25lci5fc2V0SXNBcmdvblBhZ2UoZmFsc2UsIHVybCk7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFdLTmF2aWdhdGlvbkRlbGVnYXRlXG5cbiAgICBwcml2YXRlIF9wcm92aXNpb25hbFVSTCA6IHN0cmluZztcblxuICAgIHdlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uQWN0aW9uRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uQWN0aW9uOldLTmF2aWdhdGlvbkFjdGlvbiwgZGVjaXNpb25IYW5kbGVyOihwb2xpY3k6V0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBpZiAobmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZSAmJiBuYXZpZ2F0aW9uQWN0aW9uLnRhcmdldEZyYW1lLm1haW5GcmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbmF2aWdhdGlvblR5cGU6V0tOYXZpZ2F0aW9uVHlwZSA9IG5hdmlnYXRpb25BY3Rpb24ubmF2aWdhdGlvblR5cGU7XG4gICAgICAgICAgICB2YXIgbmF2VHlwZTpOYXZpZ2F0aW9uVHlwZSA9ICdvdGhlcic7XG4gICAgICAgICAgICBzd2l0Y2ggKG5hdmlnYXRpb25UeXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkxpbmtBY3RpdmF0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGUgPSAnbGlua0NsaWNrZWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVN1Ym1pdHRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdmb3JtU3VibWl0dGVkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkJhY2tGb3J3YXJkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlID0gJ2JhY2tGb3J3YXJkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLlJlbG9hZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdyZWxvYWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVJlc3VibWl0dGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlID0gJ2Zvcm1SZXN1Ym1pdHRlZCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICAgICAgaWYgKG93bmVyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmF2aWdhdGlvbkFjdGlvbi5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICAgICAgICAgICAgICBpZiAoIW93bmVyLl9hcmdvblBhZ2VzW3VybF0pIG93bmVyLl9zZXRJc0FyZ29uUGFnZShmYWxzZSwgdXJsKTtcbiAgICAgICAgICAgICAgICBvd25lclsnX29uTG9hZFN0YXJ0ZWQnXSh1cmwsIG5hdlR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJhY2Uud3JpdGUoXCJBcmdvbldlYlZpZXcud2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25BY3Rpb25EZWNpc2lvbkhhbmRsZXIoXCIgKyBuYXZpZ2F0aW9uQWN0aW9uLnJlcXVlc3QuVVJMLmFic29sdXRlU3RyaW5nICsgXCIsIFwiICsgbmF2aWdhdGlvbkFjdGlvbi5uYXZpZ2F0aW9uVHlwZSArIFwiKVwiLCB0cmFjZS5jYXRlZ29yaWVzLkRlYnVnKTtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvbkFjdGlvblBvbGljeS5BbGxvdyk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25SZXNwb25zZURlY2lzaW9uSGFuZGxlcih3ZWJ2aWV3OldLV2ViVmlldywgbmF2aWdhdGlvblJlc3BvbnNlOldLTmF2aWdhdGlvblJlc3BvbnNlLCBkZWNpc2lvbkhhbmRsZXI6KHBvbGljeTpXS05hdmlnYXRpb25SZXNwb25zZVBvbGljeSk9PnZvaWQpIHtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvblJlc3BvbnNlUG9saWN5LkFsbG93KTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkU3RhcnRQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgdGhpcy5fcHJvdmlzaW9uYWxVUkwgPSB3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkQ29tbWl0TmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIG93bmVyLl9kaWRDb21taXROYXZpZ2F0aW9uKCk7XG4gICAgICAgIC8vIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10odGhpcy5fcHJvdmlzaW9uYWxVUkwsIFwiUHJvdmlzaW9uYWwgbmF2aWdhdGlvbiBmYWlsZWRcIik7XG4gICAgICAgIC8vIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZpbmlzaE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwgJiYgd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsTmF2aWdhdGlvbldpdGhFcnJvcih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbiwgZXJyb3I6TlNFcnJvcikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZywgZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3OiBXS1dlYlZpZXcsIGVycm9yOiBOU0Vycm9yKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoZXJyb3IuY29kZSA9PSBXS0Vycm9yQ29kZS5XZWJDb250ZW50UHJvY2Vzc1Rlcm1pbmF0ZWQgJiYgZXJyb3IuZG9tYWluID09IFwiV2ViS2l0RXJyb3JEb21haW5cIikge1xuICAgICAgICAgICAgd2ViVmlldy5yZWxvYWRGcm9tT3JpZ2luKClcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb25XaXRoRXJyb3Iod2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24sIGVycm9yOiBOU0Vycm9yKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMICYmIHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nLCBlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIC8vIHRoaXMudXBkYXRlVVJMKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3LCBlcnJvcikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVybCA9IGVycm9yLnVzZXJJbmZvLm9iamVjdEZvcktleShOU1VSTEVycm9yRmFpbGluZ1VSTEVycm9yS2V5KSBhcyBOU1VSTDtcbiAgICAgICAgaWYgKHVybCAmJiB1cmwuaG9zdCAmJiBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZVVudHJ1c3RlZCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZUhhc0JhZERhdGUgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVIYXNVbmtub3duUm9vdCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZU5vdFlldFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc3QgY2VydENoYWluID0gZXJyb3IudXNlckluZm8ub2JqZWN0Rm9yS2V5KCdOU0Vycm9yUGVlckNlcnRpZmljYXRlQ2hhaW5LZXknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBjZXJ0ID0gY2VydENoYWluICYmIGNlcnRDaGFpblswXTtcbiAgICAgICAgICAgICAgICAvLyBkaWFsb2dzLmNvbmZpcm0oYCR7ZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb259IFdvdWxkIHlvdSBsaWtlIHRvIGNvbnRpbnVlIGFueXdheT9gKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgY29uc3Qgb3JpZ2luID0gYCR7dXJsLmhvc3R9OiR7dXJsLnBvcnR8fDQ0M31gO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgX2NlcnRTdG9yZS5hZGRDZXJ0aWZpY2F0ZShjZXJ0LCBvcmlnaW4pO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgd2ViVmlldy5sb2FkUmVxdWVzdChuZXcgTlNVUkxSZXF1ZXN0KHtVUkw6dXJsfSkpO1xuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfSkuY2F0Y2goKCk9Pnt9KTtcblxuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24gKyBcIiBBIGJ1ZyBpbiBBcmdvbiBwcmV2ZW50cyB1cyBmcm9tIGNvbnRpbnVpbmcuIFBsZWFzZSB1c2UgYSBzaXRlIHdpdGggYSB2YWxpZCBjZXJ0aWZpY2F0ZS4gIFdlIHdpbGwgZml4IHRoaXMgc29vbi5cIik7XG4gICAgICAgIH0gZWxzZSBpZiAodXJsICYmIHVybC5ob3N0ICYmXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yQ2Fubm90RmluZEhvc3QgfHxcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JDYW5ub3RDb25uZWN0VG9Ib3N0KSB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5hbGVydChlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAodXJsICYmIHVybC5ob3N0ICYmXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yVGltZWRPdXRcbiAgICAgICAgICAgIC8vfHwgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvckNhbmNlbGxlZFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5hbGVydChlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB3ZWJWaWV3V2ViQ29udGVudFByb2Nlc3NEaWRUZXJtaW5hdGUod2ViVmlldzpXS1dlYlZpZXcpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lci5yZWxvYWQoKTtcbiAgICB9XG5cbiAgICAvLyBjb21tZW50IG91dCB1bnRpbCBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L2lvcy1ydW50aW1lL2lzc3Vlcy83NDIgaXMgZml4ZWRcblx0Ly8gd2ViVmlld0RpZFJlY2VpdmVBdXRoZW50aWNhdGlvbkNoYWxsZW5nZUNvbXBsZXRpb25IYW5kbGVyKHdlYlZpZXc6IFdLV2ViVmlldywgY2hhbGxlbmdlOiBOU1VSTEF1dGhlbnRpY2F0aW9uQ2hhbGxlbmdlLCBjb21wbGV0aW9uSGFuZGxlcjogKHAxOiBOU1VSTFNlc3Npb25BdXRoQ2hhbGxlbmdlRGlzcG9zaXRpb24sIHAyPzogTlNVUkxDcmVkZW50aWFsKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgLy8gICAgIC8vIElmIHRoaXMgaXMgYSBjZXJ0aWZpY2F0ZSBjaGFsbGVuZ2UsIHNlZSBpZiB0aGUgY2VydGlmaWNhdGUgaGFzIHByZXZpb3VzbHkgYmVlblxuICAgIC8vICAgICAvLyBhY2NlcHRlZCBieSB0aGUgdXNlci5cbiAgICAvLyAgICAgY29uc3Qgb3JpZ2luID0gYCR7Y2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5ob3N0fToke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UucG9ydH1gO1xuICAgIC8vICAgICBjb25zdCB0cnVzdCA9IGNoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2Uuc2VydmVyVHJ1c3Q7XG4gICAgLy8gICAgIGNvbnN0IGNlcnQgPSBTZWNUcnVzdEdldENlcnRpZmljYXRlQXRJbmRleCh0cnVzdCwgMCk7XG4gICAgLy8gICAgIGlmIChjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLmF1dGhlbnRpY2F0aW9uTWV0aG9kID09IE5TVVJMQXV0aGVudGljYXRpb25NZXRob2RTZXJ2ZXJUcnVzdCAmJlxuICAgIC8vICAgICAgICAgdHJ1c3QgJiYgY2VydCAmJiBfY2VydFN0b3JlLmNvbnRhaW5zQ2VydGlmaWNhdGUoY2VydCwgb3JpZ2luKSkge1xuICAgIC8vICAgICAgICAgY29tcGxldGlvbkhhbmRsZXIoTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLlVzZUNyZWRlbnRpYWwsIG5ldyBOU1VSTENyZWRlbnRpYWwodHJ1c3QpKVxuICAgIC8vICAgICAgICAgcmV0dXJuO1xuICAgIC8vICAgICB9XG5cbiAgICAvLyAgICAgY29tcGxldGlvbkhhbmRsZXIoTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLlBlcmZvcm1EZWZhdWx0SGFuZGxpbmcsIHVuZGVmaW5lZCk7XG4gICAgLy8gfVxuXG4gICAgcHVibGljIHN0YXRpYyBPYmpDUHJvdG9jb2xzID0gW1dLU2NyaXB0TWVzc2FnZUhhbmRsZXIsIFdLTmF2aWdhdGlvbkRlbGVnYXRlXTtcbn0iXX0=