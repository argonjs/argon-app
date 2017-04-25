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
        this._ios.navigationDelegate = undefined;
        _super.prototype.onUnloaded.call(this);
    };
    ArgonWebView.prototype.getCurrentUrl = function () {
        // note: this.src is what the webview was originally set to load, this.url is the actual current url. 
        return this.url;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUNsRCx3Q0FBb0M7QUFDcEMsNkJBQStCO0FBQy9CLG1DQUFxQztBQUNyQyxvQ0FBc0M7QUFFdEMsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUMscUJBQXFCLENBQUMsR0FBRyxRQUFRLENBQUM7QUFFM0gsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBSXhDLGdDQUFnQztBQUNoQyxvQkFBb0I7QUFDcEIsd0NBQXdDO0FBRXhDLHdEQUF3RDtBQUN4RCwwREFBMEQ7QUFDMUQsbURBQW1EO0FBQ25ELDhCQUE4QjtBQUM5QixRQUFRO0FBRVIsdUVBQXVFO0FBQ3ZFLDBEQUEwRDtBQUMxRCxrREFBa0Q7QUFDbEQscUNBQXFDO0FBQ3JDLFFBQVE7QUFFUix3REFBd0Q7QUFDeEQsMkNBQTJDO0FBQzNDLFFBQVE7QUFDUixJQUFJO0FBRUosc0NBQXNDO0FBRXRDO0lBQWtDLGdDQUFtQjtJQU9qRDtRQUFBLFlBQ0ksaUJBQU8sU0ErRVY7UUE3RUcsSUFBTSxhQUFhLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFNUQsYUFBYSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQztRQUMvQyxhQUFhLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxDQUFDO1FBQ25ELGFBQWEsQ0FBQyxtQ0FBbUMsR0FBRyxJQUFJLENBQUM7UUFDekQsYUFBYSxDQUFDLHdDQUF3QyxHQUFHLFlBQTRCLENBQUM7UUFDdEYsYUFBYSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDeEMsYUFBYSxDQUFDLHFCQUFxQixDQUFDLGFBQWEs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SUFtQkwsMkJBQUM7QUFBRCxDQUFDLEFBdk1ELENBQW1DLFFBQVE7QUFzTHZDLG9GQUFvRjtBQUN2Riw4TkFBOE47QUFDM04sd0ZBQXdGO0FBQ3hGLCtCQUErQjtBQUMvQiw0RkFBNEY7QUFDNUYsMkRBQTJEO0FBQzNELDREQUE0RDtBQUM1RCxvR0FBb0c7QUFDcEcsMkVBQTJFO0FBQzNFLDRHQUE0RztBQUM1RyxrQkFBa0I7QUFDbEIsUUFBUTtBQUVSLGlHQUFpRztBQUNqRyxJQUFJO0FBRVUsa0NBQWEsR0FBRyxDQUFDLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9hcmdvbi13ZWItdmlldy1jb21tb24nO1xuaW1wb3J0IHtXZWJWaWV3fSBmcm9tICd1aS93ZWItdmlldyc7XG5pbXBvcnQgKiBhcyB0cmFjZSBmcm9tICd0cmFjZSc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuXG5jb25zdCBBUkdPTl9VU0VSX0FHRU5UID0gVUlXZWJWaWV3LmFsbG9jKCkuaW5pdCgpLnN0cmluZ0J5RXZhbHVhdGluZ0phdmFTY3JpcHRGcm9tU3RyaW5nKCduYXZpZ2F0b3IudXNlckFnZW50JykgKyAnIEFyZ29uJztcblxuY29uc3QgcHJvY2Vzc1Bvb2wgPSBXS1Byb2Nlc3NQb29sLm5ldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG5kZWNsYXJlIGNvbnN0IHdpbmRvdzphbnksIHdlYmtpdDphbnksIGRvY3VtZW50OmFueTtcblxuLy8vIEluLW1lbW9yeSBjZXJ0aWZpY2F0ZSBzdG9yZS5cbi8vIGNsYXNzIENlcnRTdG9yZSB7XG4vLyAgICAgcHJpdmF0ZSBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8vICAgICBwdWJsaWMgYWRkQ2VydGlmaWNhdGUoY2VydDogYW55LCBvcmlnaW46c3RyaW5nKSB7XG4vLyAgICAgICAgIGxldCBkYXRhOiBOU0RhdGEgPSBTZWNDZXJ0aWZpY2F0ZUNvcHlEYXRhKGNlcnQpXG4vLyAgICAgICAgIGxldCBrZXkgPSB0aGlzLmtleUZvckRhdGEoZGF0YSwgb3JpZ2luKTtcbi8vICAgICAgICAgdGhpcy5rZXlzLmFkZChrZXkpO1xuLy8gICAgIH1cblxuLy8gICAgIHB1YmxpYyBjb250YWluc0NlcnRpZmljYXRlKGNlcnQ6IGFueSwgb3JpZ2luOnN0cmluZykgOiBib29sZWFuIHtcbi8vICAgICAgICAgbGV0IGRhdGE6IE5TRGF0YSA9IFNlY0NlcnRpZmljYXRlQ29weURhdGEoY2VydClcbi8vICAgICAgICAgbGV0IGtleSA9IHRoaXMua2V5Rm9yRGF0YShkYXRhLCBvcmlnaW4pXG4vLyAgICAgICAgIHJldHVybiB0aGlzLmtleXMuaGFzKGtleSk7XG4vLyAgICAgfVxuXG4vLyAgICAgcHJpdmF0ZSBrZXlGb3JEYXRhKGRhdGE6IE5TRGF0YSwgb3JpZ2luOnN0cmluZykge1xuLy8gICAgICAgICByZXR1cm4gYCR7b3JpZ2lufS8ke2RhdGEuaGFzaH1gO1xuLy8gICAgIH1cbi8vIH1cblxuLy8gY29uc3QgX2NlcnRTdG9yZSA9IG5ldyBDZXJ0U3RvcmUoKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcgIHtcblxuICAgIHByaXZhdGUgX2lvczpXS1dlYlZpZXdcbiAgICBwcml2YXRlIF9kZWxlZ2F0ZTpVSVdlYlZpZXdEZWxlZ2F0ZVxuICAgIFxuICAgIHByaXZhdGUgX2FyZ29uRGVsZWdhdGU6QXJnb25XZWJWaWV3RGVsZWdhdGU7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9uID0gV0tXZWJWaWV3Q29uZmlndXJhdGlvbi5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0lubGluZU1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0FpclBsYXlGb3JNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NQaWN0dXJlSW5QaWN0dXJlTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ubWVkaWFUeXBlc1JlcXVpcmluZ1VzZXJBY3Rpb25Gb3JQbGF5YmFjayA9IFdLQXVkaW92aXN1YWxNZWRpYVR5cGVzLk5vbmU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ucHJvY2Vzc1Bvb2wgPSBwcm9jZXNzUG9vbDtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkVXNlclNjcmlwdChXS1VzZXJTY3JpcHQuYWxsb2MoKS5pbml0V2l0aFNvdXJjZUluamVjdGlvblRpbWVGb3JNYWluRnJhbWVPbmx5KGAoJHtcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxMb2cgPSBjb25zb2xlLmxvZztcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonbG9nJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbExvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbFdhcm4gPSBjb25zb2xlLndhcm47XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOid3YXJuJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbFdhcm4uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonZXJyb3InLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsRXJyb3IuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5oYW5kbGVkIEVycm9yOiAnICsgZS5tZXNzYWdlICsgJyAoJyArIGUuc291cmNlICsgJzonICsgZS5saW5lbm8gKyAnKScpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2VuZEFyZ29uQ2hlY2soZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPWFyZ29uXScpICE9PSBudWxsIHx8IHR5cGVvZihBcmdvbikgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQucGVyc2lzdGVkKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Ugd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5hcmdvbmNoZWNrLnBvc3RNZXNzYWdlKFwidHJ1ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMuYXJnb25jaGVjay5wb3N0TWVzc2FnZShcImZhbHNlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIF9zZW5kQXJnb25DaGVjayk7XG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwYWdlc2hvd1wiLCBfc2VuZEFyZ29uQ2hlY2spO1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluc3BlY3QobywgZGVwdGgpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IG51bGwpIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIFwidW5kZWZpbmVkXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbyA9PT0gJ251bWJlcicgfHwgbyBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIChvKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG8gPT09ICdzdHJpbmcnIHx8IG8gaW5zdGFuY2VvZiBTdHJpbmcpIHJldHVybiA8c3RyaW5nPiBvO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvKSkgcmV0dXJuIFwiQXJyYXlbXCIrIG8ubGVuZ3RoICtcIl1cIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gby50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVwdGggPiAwID8gYCR7Y2xhc3NOYW1lKG8pfSB7JHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5tYXAoKGtleSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdcXG4gICAgJyArIGtleSArICc6ICcgKyBpbnNwZWN0KG8sIGRlcHRoLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oKSArIE9iamVjdC5nZXRQcm90b3R5cGVPZihvKSA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXFxuICAgIF9fcHJvdG9fXzogJyArIGNsYXNzTmFtZShPYmplY3QuZ2V0UHJvdG90eXBlT2YobykpIDogXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbn1gIDogY2xhc3NOYW1lKG8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnNwZWN0RWFjaChhcmdzOklBcmd1bWVudHMpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3NBcnJheSA9IFtdLnNsaWNlLmNhbGwoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzQXJyYXkubWFwKChhcmcpPT5pbnNwZWN0KGFyZywxKSkuam9pbignICcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjbGFzc05hbWUobykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmFtZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LC0xKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICdPYmplY3QnKSBuYW1lID0gby5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LnRvU3RyaW5nKClcbiAgICAgICAgfSgpKWAsIFdLVXNlclNjcmlwdEluamVjdGlvblRpbWUuQXREb2N1bWVudFN0YXJ0LCB0cnVlKSk7XG5cbiAgICAgICAgLy8gV2Ugd2FudCB0byByZXBsYWNlIHRoZSBVSVdlYlZpZXcgY3JlYXRlZCBieSBzdXBlcmNsYXNzIHdpdGggV0tXZWJWaWV3IGluc3RhbmNlXG4gICAgICAgIHRoaXMuX2lvcyA9IFdLV2ViVmlldy5hbGxvYygpLmluaXRXaXRoRnJhbWVDb25maWd1cmF0aW9uKENHUmVjdFplcm8sIGNvbmZpZ3VyYXRpb24pO1xuICAgICAgICBkZWxldGUgdGhpcy5fZGVsZWdhdGUgLy8gcmVtb3ZlIHJlZmVyZW5jZSB0byBVSVdlYlZpZXcgZGVsZWdhdGUgY3JlYXRlZCBieSBzdXBlciBjbGFzc1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IHRoaXMuX2FyZ29uRGVsZWdhdGUgPSBBcmdvbldlYlZpZXdEZWxlZ2F0ZS5pbml0V2l0aE93bmVyKG5ldyBXZWFrUmVmKHRoaXMpKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImFyZ29uXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwiYXJnb25jaGVja1wiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImxvZ1wiKTtcblxuXHQgICAgdGhpcy5faW9zLmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gdHJ1ZTtcblx0XHR0aGlzLl9pb3NbJ2N1c3RvbVVzZXJBZ2VudCddID0gQVJHT05fVVNFUl9BR0VOVDtcblxuICAgICAgICAvLyBzdHlsZSBhcHByb3ByaWF0ZWx5XG4gICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgcHVibGljIF9zZXRJc0FyZ29uQXBwKGZsYWc6Ym9vbGVhbikge1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvbkFwcCAmJiBmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3IuY2xlYXJDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IGZhbHNlOyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldChcImlzQXJnb25BcHBcIiwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0FyZ29uQXBwICYmICFmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3Iud2hpdGVDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLndoaXRlQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IHRydWU7ICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpPT57XG4gICAgICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCAocmVzdWx0LCBlcnJvcik9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHJlamVjdChlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSA6IHZvaWQge1xuICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCA8YW55Pm51bGwpXG4gICAgfVxuXG4gICAgcHVibGljIGJyaW5nVG9Gcm9udCgpIHtcbiAgICAgICAgdGhpcy5faW9zLnN1cGVydmlldy5icmluZ1N1YnZpZXdUb0Zyb250KHRoaXMuX2lvcyk7XG4gICAgfVxuXG4gICAgcHVibGljIG9uTG9hZGVkKCkge1xuICAgICAgICBzdXBlci5vbkxvYWRlZCgpO1xuICAgICAgICB0aGlzLl9pb3MubmF2aWdhdGlvbkRlbGVnYXRlID0gdGhpcy5fYXJnb25EZWxlZ2F0ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb25VbmxvYWRlZCgpIHtcbiAgICAgICAgdGhpcy5faW9zLm5hdmlnYXRpb25EZWxlZ2F0ZSA9IDxhbnk+dW5kZWZpbmVkO1xuICAgICAgICBzdXBlci5vblVubG9hZGVkKCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldEN1cnJlbnRVcmwoKSA6IHN0cmluZyB7XG4gICAgICAgIC8vIG5vdGU6IHRoaXMuc3JjIGlzIHdoYXQgdGhlIHdlYnZpZXcgd2FzIG9yaWdpbmFsbHkgc2V0IHRvIGxvYWQsIHRoaXMudXJsIGlzIHRoZSBhY3R1YWwgY3VycmVudCB1cmwuIFxuICAgICAgICByZXR1cm4gdGhpcy51cmw7XG4gICAgfVxuXG4gICAgcmVsb2FkKCkge1xuICAgICAgICB0aGlzLl9pb3MucmVsb2FkRnJvbU9yaWdpbigpO1xuICAgIH1cbn1cblxuY2xhc3MgQXJnb25XZWJWaWV3RGVsZWdhdGUgZXh0ZW5kcyBOU09iamVjdCBpbXBsZW1lbnRzIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXIsIFdLTmF2aWdhdGlvbkRlbGVnYXRlIHtcbiAgICBcbiAgICBwcml2YXRlIF9vd25lcjpXZWFrUmVmPEFyZ29uV2ViVmlldz47XG4gICAgXG4gICAgcHVibGljIHN0YXRpYyBpbml0V2l0aE93bmVyKG93bmVyOldlYWtSZWY8QXJnb25XZWJWaWV3Pikge1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IDxBcmdvbldlYlZpZXdEZWxlZ2F0ZT5BcmdvbldlYlZpZXdEZWxlZ2F0ZS5uZXcoKVxuICAgICAgICBkZWxlZ2F0ZS5fb3duZXIgPSBvd25lcjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlYnZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmdldCgpLmlvcztcbiAgICAgICAgd2Vidmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJ0aXRsZVwiLCAwLCA8YW55Pm51bGwpO1xuICAgICAgICB3ZWJ2aWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcIlVSTFwiLCAwLCA8YW55Pm51bGwpO1xuICAgICAgICB3ZWJ2aWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcImVzdGltYXRlZFByb2dyZXNzXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgfVxuXG4gICAgZGVhbGxvYygpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgY29uc3Qgd2VidmlldyA9IDxXS1dlYlZpZXc+IChvd25lciAmJiBvd25lci5pb3MpO1xuICAgICAgICB3ZWJ2aWV3LnJlbW92ZU9ic2VydmVyRm9yS2V5UGF0aCh0aGlzLCBcInRpdGxlXCIpO1xuICAgICAgICB3ZWJ2aWV3LnJlbW92ZU9ic2VydmVyRm9yS2V5UGF0aCh0aGlzLCBcIlVSTFwiKTtcbiAgICAgICAgd2Vidmlldy5yZW1vdmVPYnNlcnZlckZvcktleVBhdGgodGhpcywgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiKTtcbiAgICB9XG5cbiAgICBvYnNlcnZlVmFsdWVGb3JLZXlQYXRoT2ZPYmplY3RDaGFuZ2VDb250ZXh0KGtleVBhdGg6c3RyaW5nLCBvYmplY3Q6YW55LCBjaGFuZ2U6YW55LCBjb250ZXh0OmFueSkge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47ICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdrV2ViVmlldyA9IDxXS1dlYlZpZXc+b3duZXIuaW9zO1xuXG4gICAgICAgIHN3aXRjaCAoa2V5UGF0aCkge1xuICAgICAgICAgICAgY2FzZSBcInRpdGxlXCI6IFxuICAgICAgICAgICAgICAgIG93bmVyLnNldChrZXlQYXRoLCB3a1dlYlZpZXcudGl0bGUpOyBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJVUkxcIjogXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiOlxuICAgICAgICAgICAgICAgIG93bmVyLnNldCgncHJvZ3Jlc3MnLCB3a1dlYlZpZXcuZXN0aW1hdGVkUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cGRhdGVVUkwoKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjsgICAgIFxuICAgICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmlvcztcbiAgICAgICAgb3duZXJbJ19zdXNwZW5kTG9hZGluZyddID0gdHJ1ZTsgXG4gICAgICAgIG93bmVyLnNldChcInVybFwiLCB3a1dlYlZpZXcuVVJMICYmIHdrV2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpOyBcbiAgICAgICAgb3duZXJbJ19zdXNwZW5kTG9hZGluZyddID0gZmFsc2U7IFxuICAgIH1cbiAgICBcbiAgICAvLyBXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyXG5cbiAgICB1c2VyQ29udGVudENvbnRyb2xsZXJEaWRSZWNlaXZlU2NyaXB0TWVzc2FnZSh1c2VyQ29udGVudENvbnRyb2xsZXI6V0tVc2VyQ29udGVudENvbnRyb2xsZXIsIG1lc3NhZ2U6V0tTY3JpcHRNZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uJykge1xuICAgICAgICAgICAgaWYgKCFvd25lci5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8ganVzdCBpbiBjYXNlIHdlIHRob3VnaHQgYmVsb3cgdGhhdCB0aGUgcGFnZSB3YXMgbm90IGFuXG4gICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25BcHAodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvd25lci5faGFuZGxlQXJnb25NZXNzYWdlKG1lc3NhZ2UuYm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5uYW1lID09PSAnbG9nJykge1xuICAgICAgICAgICAgb3duZXIuX2hhbmRsZUxvZ01lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdhcmdvbmNoZWNrJykge1xuICAgICAgICAgICAgaWYgKCFvd25lci5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuYm9keSA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25BcHAodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25BcHAoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBXS05hdmlnYXRpb25EZWxlZ2F0ZVxuXG4gICAgcHJpdmF0ZSBfcHJvdmlzaW9uYWxVUkwgOiBzdHJpbmc7XG5cbiAgICB3ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvbkFjdGlvbkRlY2lzaW9uSGFuZGxlcih3ZWJ2aWV3OldLV2ViVmlldywgbmF2aWdhdGlvbkFjdGlvbjpXS05hdmlnYXRpb25BY3Rpb24sIGRlY2lzaW9uSGFuZGxlcjoocG9saWN5OldLTmF2aWdhdGlvbkFjdGlvblBvbGljeSk9PnZvaWQpIHtcbiAgICAgICAgaWYgKG5hdmlnYXRpb25BY3Rpb24udGFyZ2V0RnJhbWUgJiYgbmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZS5tYWluRnJhbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hdmlnYXRpb25UeXBlOldLTmF2aWdhdGlvblR5cGUgPSBuYXZpZ2F0aW9uQWN0aW9uLm5hdmlnYXRpb25UeXBlO1xuICAgICAgICAgICAgdmFyIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ290aGVyJyk7XG4gICAgICAgICAgICBzd2l0Y2ggKG5hdmlnYXRpb25UeXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkxpbmtBY3RpdmF0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ2xpbmtDbGlja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5Gb3JtU3VibWl0dGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdmb3JtU3VibWl0dGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5CYWNrRm9yd2FyZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignYmFja0ZvcndhcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLlJlbG9hZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZigncmVsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5Gb3JtUmVzdWJtaXR0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ2Zvcm1SZXN1Ym1pdHRlZCcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkU3RhcnRlZCddKG5hdmlnYXRpb25BY3Rpb24ucmVxdWVzdC5VUkwuYWJzb2x1dGVTdHJpbmcsIFdlYlZpZXcubmF2aWdhdGlvblR5cGVzW25hdlR5cGVJbmRleF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhY2Uud3JpdGUoXCJBcmdvbldlYlZpZXcud2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25BY3Rpb25EZWNpc2lvbkhhbmRsZXIoXCIgKyBuYXZpZ2F0aW9uQWN0aW9uLnJlcXVlc3QuVVJMLmFic29sdXRlU3RyaW5nICsgXCIsIFwiICsgbmF2aWdhdGlvbkFjdGlvbi5uYXZpZ2F0aW9uVHlwZSArIFwiKVwiLCB0cmFjZS5jYXRlZ29yaWVzLkRlYnVnKTtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvbkFjdGlvblBvbGljeS5BbGxvdyk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25SZXNwb25zZURlY2lzaW9uSGFuZGxlcih3ZWJ2aWV3OldLV2ViVmlldywgbmF2aWdhdGlvblJlc3BvbnNlOldLTmF2aWdhdGlvblJlc3BvbnNlLCBkZWNpc2lvbkhhbmRsZXI6KHBvbGljeTpXS05hdmlnYXRpb25SZXNwb25zZVBvbGljeSk9PnZvaWQpIHtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvblJlc3BvbnNlUG9saWN5LkFsbG93KTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkU3RhcnRQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgdGhpcy5fcHJvdmlzaW9uYWxVUkwgPSB3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkQ29tbWl0TmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIG93bmVyLl9kaWRDb21taXROYXZpZ2F0aW9uKCk7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10odGhpcy5fcHJvdmlzaW9uYWxVUkwsIFwiUHJvdmlzaW9uYWwgbmF2aWdhdGlvbiBmYWlsZWRcIik7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZpbmlzaE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwgJiYgd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpO1xuICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsTmF2aWdhdGlvbldpdGhFcnJvcih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbiwgZXJyb3I6TlNFcnJvcikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZywgZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3OiBXS1dlYlZpZXcsIGVycm9yOiBOU0Vycm9yKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoZXJyb3IuY29kZSA9PSBXS0Vycm9yQ29kZS5XZWJDb250ZW50UHJvY2Vzc1Rlcm1pbmF0ZWQgJiYgZXJyb3IuZG9tYWluID09IFwiV2ViS2l0RXJyb3JEb21haW5cIikge1xuICAgICAgICAgICAgd2ViVmlldy5yZWxvYWRGcm9tT3JpZ2luKClcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb25XaXRoRXJyb3Iod2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24sIGVycm9yOiBOU0Vycm9yKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMICYmIHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nLCBlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3LCBlcnJvcikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVybCA9IGVycm9yLnVzZXJJbmZvLm9iamVjdEZvcktleShOU1VSTEVycm9yRmFpbGluZ1VSTEVycm9yS2V5KSBhcyBOU1VSTDtcbiAgICAgICAgaWYgKHVybCAmJiB1cmwuaG9zdCAmJiBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZVVudHJ1c3RlZCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZUhhc0JhZERhdGUgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVIYXNVbmtub3duUm9vdCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZU5vdFlldFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc3QgY2VydENoYWluID0gZXJyb3IudXNlckluZm8ub2JqZWN0Rm9yS2V5KCdOU0Vycm9yUGVlckNlcnRpZmljYXRlQ2hhaW5LZXknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBjZXJ0ID0gY2VydENoYWluICYmIGNlcnRDaGFpblswXTtcbiAgICAgICAgICAgICAgICAvLyBkaWFsb2dzLmNvbmZpcm0oYCR7ZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb259IFdvdWxkIHlvdSBsaWtlIHRvIGNvbnRpbnVlIGFueXdheT9gKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgY29uc3Qgb3JpZ2luID0gYCR7dXJsLmhvc3R9OiR7dXJsLnBvcnR8fDQ0M31gO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgX2NlcnRTdG9yZS5hZGRDZXJ0aWZpY2F0ZShjZXJ0LCBvcmlnaW4pO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgd2ViVmlldy5sb2FkUmVxdWVzdChuZXcgTlNVUkxSZXF1ZXN0KHtVUkw6dXJsfSkpO1xuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfSkuY2F0Y2goKCk9Pnt9KTtcblxuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24gKyBcIiBBIGJ1ZyBpbiBBcmdvbjQgcHJldmVudHMgdXMgZnJvbSBjb250aW51aW5nLiBQbGVhc2UgdXNlIGEgc2l0ZSB3aXRoIGEgdmFsaWQgY2VydGlmaWNhdGUuICBXZSB3aWxsIGZpeCB0aGlzIHNvb24uXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29tbWVudCBvdXQgdW50aWwgaHR0cHM6Ly9naXRodWIuY29tL05hdGl2ZVNjcmlwdC9pb3MtcnVudGltZS9pc3N1ZXMvNzQyIGlzIGZpeGVkXG5cdC8vIHdlYlZpZXdEaWRSZWNlaXZlQXV0aGVudGljYXRpb25DaGFsbGVuZ2VDb21wbGV0aW9uSGFuZGxlcih3ZWJWaWV3OiBXS1dlYlZpZXcsIGNoYWxsZW5nZTogTlNVUkxBdXRoZW50aWNhdGlvbkNoYWxsZW5nZSwgY29tcGxldGlvbkhhbmRsZXI6IChwMTogTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLCBwMj86IE5TVVJMQ3JlZGVudGlhbCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIC8vICAgICAvLyBJZiB0aGlzIGlzIGEgY2VydGlmaWNhdGUgY2hhbGxlbmdlLCBzZWUgaWYgdGhlIGNlcnRpZmljYXRlIGhhcyBwcmV2aW91c2x5IGJlZW5cbiAgICAvLyAgICAgLy8gYWNjZXB0ZWQgYnkgdGhlIHVzZXIuXG4gICAgLy8gICAgIGNvbnN0IG9yaWdpbiA9IGAke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UuaG9zdH06JHtjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnBvcnR9YDtcbiAgICAvLyAgICAgY29uc3QgdHJ1c3QgPSBjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnNlcnZlclRydXN0O1xuICAgIC8vICAgICBjb25zdCBjZXJ0ID0gU2VjVHJ1c3RHZXRDZXJ0aWZpY2F0ZUF0SW5kZXgodHJ1c3QsIDApO1xuICAgIC8vICAgICBpZiAoY2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5hdXRoZW50aWNhdGlvbk1ldGhvZCA9PSBOU1VSTEF1dGhlbnRpY2F0aW9uTWV0aG9kU2VydmVyVHJ1c3QgJiZcbiAgICAvLyAgICAgICAgIHRydXN0ICYmIGNlcnQgJiYgX2NlcnRTdG9yZS5jb250YWluc0NlcnRpZmljYXRlKGNlcnQsIG9yaWdpbikpIHtcbiAgICAvLyAgICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5Vc2VDcmVkZW50aWFsLCBuZXcgTlNVUkxDcmVkZW50aWFsKHRydXN0KSlcbiAgICAvLyAgICAgICAgIHJldHVybjtcbiAgICAvLyAgICAgfVxuXG4gICAgLy8gICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5QZXJmb3JtRGVmYXVsdEhhbmRsaW5nLCB1bmRlZmluZWQpO1xuICAgIC8vIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgT2JqQ1Byb3RvY29scyA9IFtXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyLCBXS05hdmlnYXRpb25EZWxlZ2F0ZV07XG59Il19