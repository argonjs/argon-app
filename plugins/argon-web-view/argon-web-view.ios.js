"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Argon = require("@argonjs/argon");
var common = require("./argon-web-view-common");
var trace = require("trace");
var utils = require("utils/utils");
var dialogs = require("ui/dialogs");
var ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon/' + Argon.version;
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
    ArgonWebView.prototype._setIsArgonPage = function (flag, url) {
        if (flag)
            this._argonPages[url] = true;
        if (!this.isArgonPage && flag) {
            this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
            this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
            this._ios.opaque = false;
            common.isArgonPageProperty.nativeValueChange(this, true);
            // this.set("isArgonPage", true);
        }
        else if (this.isArgonPage && !flag) {
            this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.opaque = true;
            // this.set("isArgonPage", false);
            common.isArgonPageProperty.nativeValueChange(this, false);
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
        var url = message.frameInfo.request.URL.absoluteString;
        if (message.name === 'argon') {
            if (!owner.session) {
                // just in case we thought below that the page was not an
                // argon page, perhaps because argon.js loaded asyncronously 
                // and the programmer didn't set up an argon meta tag
                owner._setIsArgonPage(true, url);
            }
            owner._handleArgonMessage(message.body);
        }
        else if (message.name === 'log') {
            owner._handleLogMessage(message.body);
        }
        else if (message.name === 'argoncheck') {
            if (!owner.session) {
                if (message.body === "true") {
                    owner._setIsArgonPage(true, url);
                }
                else {
                    owner._setIsArgonPage(false, url);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUVsRCw2QkFBK0I7QUFDL0IsbUNBQXFDO0FBQ3JDLG9DQUFzQztBQUV0QyxJQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxzQ0FBc0MsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO0FBRTVJLElBQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUl4QyxnQ0FBZ0M7QUFDaEMsb0JBQW9CO0FBQ3BCLHdDQUF3QztBQUV4Qyx3REFBd0Q7QUFDeEQsMERBQTBEO0FBQzFELG1EQUFtRDtBQUNuRCw4QkFBOEI7QUFDOUIsUUFBUTtBQUVSLHVFQUF1RTtBQUN2RSwwREFBMEQ7QUFDMUQsa0RBQWtEO0FBQ2xELHFDQUFxQztBQUNyQyxRQUFRO0FBRVIsd0RBQXdEO0FBQ3hELDJDQUEyQztBQUMzQyxRQUFRO0FBQ1IsSUFBSTtBQUVKLHNDQUFzQztBQUV0QztJQUFrQyxnQ0FBbUI7SUFPakQ7UUFBQSxZQUNJLGlCQUFPLFNBZ0ZWO1FBRU0saUJBQVcsR0FBRyxFQUFFLENBQUM7UUFoRnBCLElBQU0sYUFBYSxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTVELGFBQWEsQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUM7UUFDL0MsYUFBYSxDQUFDLDZCQUE2QixHQUFHLElBQUksQ0FBQztRQUNuRCxhQUFhLENBQUMsbUNBQW1DLEdBQUcsSUFBSSxDQUFDO1FBQ3pELGFBQWEsQ0FBQyx3Q0FBd0MsZUFBK0IsQ0FBQztRQUN0RixhQUFhLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUN4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QUFDLENBQUM7WUFDM0MsT0FBTyxDQUFDLEtBQUssQ0FBQyx3RUFBd0UsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJO1lBQ3RCLEtBQUssQ0FBQyxJQUFJLEtBQUssa0JBRWYsQ0FBQyxDQUFDLENBQUM7WUFDQyxPQUFPLENBQUMsS0FBSyxDQUFDLGlFQUFpRSxDQUFDLENBQUM7UUFDekYsQ0FBQztJQUNMLENBQUM7SUFFRCxvRkFBb0Y7SUFDdkYsOE5BQThOO0lBQzNOLHdGQUF3RjtJQUN4RiwrQkFBK0I7SUFDL0IsNEZBQTRGO0lBQzVGLDJEQUEyRDtJQUMzRCw0REFBNEQ7SUFDNUQsb0dBQW9HO0lBQ3BHLDJFQUEyRTtJQUMzRSw0R0FBNEc7SUFDNUcsa0JBQWtCO0lBQ2xCLFFBQVE7SUFFUixpR0FBaUc7SUFDakcsSUFBSTtJQUVVLGtDQUFhLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2pGLDJCQUFDO0NBQUEsQUF2TkQsQ0FBbUMsUUFBUSxHQXVOMUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9hcmdvbi13ZWItdmlldy1jb21tb24nO1xuaW1wb3J0IHtOYXZpZ2F0aW9uVHlwZX0gZnJvbSAndWkvd2ViLXZpZXcnO1xuaW1wb3J0ICogYXMgdHJhY2UgZnJvbSAndHJhY2UnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0ICogYXMgZGlhbG9ncyBmcm9tICd1aS9kaWFsb2dzJztcblxuY29uc3QgQVJHT05fVVNFUl9BR0VOVCA9IFVJV2ViVmlldy5hbGxvYygpLmluaXQoKS5zdHJpbmdCeUV2YWx1YXRpbmdKYXZhU2NyaXB0RnJvbVN0cmluZygnbmF2aWdhdG9yLnVzZXJBZ2VudCcpICsgJyBBcmdvbi8nICsgQXJnb24udmVyc2lvbjtcblxuY29uc3QgcHJvY2Vzc1Bvb2wgPSBXS1Byb2Nlc3NQb29sLm5ldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG5kZWNsYXJlIGNvbnN0IHdpbmRvdzphbnksIHdlYmtpdDphbnksIGRvY3VtZW50OmFueTtcblxuLy8vIEluLW1lbW9yeSBjZXJ0aWZpY2F0ZSBzdG9yZS5cbi8vIGNsYXNzIENlcnRTdG9yZSB7XG4vLyAgICAgcHJpdmF0ZSBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8vICAgICBwdWJsaWMgYWRkQ2VydGlmaWNhdGUoY2VydDogYW55LCBvcmlnaW46c3RyaW5nKSB7XG4vLyAgICAgICAgIGxldCBkYXRhOiBOU0RhdGEgPSBTZWNDZXJ0aWZpY2F0ZUNvcHlEYXRhKGNlcnQpXG4vLyAgICAgICAgIGxldCBrZXkgPSB0aGlzLmtleUZvckRhdGEoZGF0YSwgb3JpZ2luKTtcbi8vICAgICAgICAgdGhpcy5rZXlzLmFkZChrZXkpO1xuLy8gICAgIH1cblxuLy8gICAgIHB1YmxpYyBjb250YWluc0NlcnRpZmljYXRlKGNlcnQ6IGFueSwgb3JpZ2luOnN0cmluZykgOiBib29sZWFuIHtcbi8vICAgICAgICAgbGV0IGRhdGE6IE5TRGF0YSA9IFNlY0NlcnRpZmljYXRlQ29weURhdGEoY2VydClcbi8vICAgICAgICAgbGV0IGtleSA9IHRoaXMua2V5Rm9yRGF0YShkYXRhLCBvcmlnaW4pXG4vLyAgICAgICAgIHJldHVybiB0aGlzLmtleXMuaGFzKGtleSk7XG4vLyAgICAgfVxuXG4vLyAgICAgcHJpdmF0ZSBrZXlGb3JEYXRhKGRhdGE6IE5TRGF0YSwgb3JpZ2luOnN0cmluZykge1xuLy8gICAgICAgICByZXR1cm4gYCR7b3JpZ2lufS8ke2RhdGEuaGFzaH1gO1xuLy8gICAgIH1cbi8vIH1cblxuLy8gY29uc3QgX2NlcnRTdG9yZSA9IG5ldyBDZXJ0U3RvcmUoKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcgIHtcblxuICAgIHByaXZhdGUgX2lvczpXS1dlYlZpZXdcbiAgICBwcml2YXRlIF9kZWxlZ2F0ZTpVSVdlYlZpZXdEZWxlZ2F0ZVxuICAgIFxuICAgIHByaXZhdGUgX2FyZ29uRGVsZWdhdGU6QXJnb25XZWJWaWV3RGVsZWdhdGU7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9uID0gV0tXZWJWaWV3Q29uZmlndXJhdGlvbi5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0lubGluZU1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0FpclBsYXlGb3JNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NQaWN0dXJlSW5QaWN0dXJlTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ubWVkaWFUeXBlc1JlcXVpcmluZ1VzZXJBY3Rpb25Gb3JQbGF5YmFjayA9IFdLQXVkaW92aXN1YWxNZWRpYVR5cGVzLk5vbmU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ucHJvY2Vzc1Bvb2wgPSBwcm9jZXNzUG9vbDtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkVXNlclNjcmlwdChXS1VzZXJTY3JpcHQuYWxsb2MoKS5pbml0V2l0aFNvdXJjZUluamVjdGlvblRpbWVGb3JNYWluRnJhbWVPbmx5KGAoJHtcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxMb2cgPSBjb25zb2xlLmxvZztcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonbG9nJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbExvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbFdhcm4gPSBjb25zb2xlLndhcm47XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOid3YXJuJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbFdhcm4uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonZXJyb3InLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsRXJyb3IuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5oYW5kbGVkIEVycm9yOiAnICsgZS5tZXNzYWdlICsgJyAoJyArIGUuc291cmNlICsgJzonICsgZS5saW5lbm8gKyAnKScpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2VuZEFyZ29uQ2hlY2soZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPWFyZ29uXScpICE9PSBudWxsIHx8IHR5cGVvZihBcmdvbikgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQucGVyc2lzdGVkKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Ugd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5hcmdvbmNoZWNrLnBvc3RNZXNzYWdlKFwidHJ1ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMuYXJnb25jaGVjay5wb3N0TWVzc2FnZShcImZhbHNlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIF9zZW5kQXJnb25DaGVjayk7XG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwYWdlc2hvd1wiLCBfc2VuZEFyZ29uQ2hlY2spO1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluc3BlY3QobywgZGVwdGgpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IG51bGwpIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIFwidW5kZWZpbmVkXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgRXJyb3IpIHJldHVybiBvLm1lc3NhZ2UgKyAnXFxuJyArIG8uc3RhY2s7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbyA9PT0gJ251bWJlcicgfHwgbyBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIChvKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG8gPT09ICdzdHJpbmcnIHx8IG8gaW5zdGFuY2VvZiBTdHJpbmcpIHJldHVybiA8c3RyaW5nPiBvO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvKSkgcmV0dXJuIFwiQXJyYXlbXCIrIG8ubGVuZ3RoICtcIl1cIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gby50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVwdGggPiAwID8gYCR7Y2xhc3NOYW1lKG8pfSB7JHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5tYXAoKGtleSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdcXG4gICAgJyArIGtleSArICc6ICcgKyBpbnNwZWN0KG8sIGRlcHRoLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oKSArIE9iamVjdC5nZXRQcm90b3R5cGVPZihvKSA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXFxuICAgIF9fcHJvdG9fXzogJyArIGNsYXNzTmFtZShPYmplY3QuZ2V0UHJvdG90eXBlT2YobykpIDogXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbn1gIDogY2xhc3NOYW1lKG8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnNwZWN0RWFjaChhcmdzOklBcmd1bWVudHMpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3NBcnJheSA9IFtdLnNsaWNlLmNhbGwoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzQXJyYXkubWFwKChhcmcpPT5pbnNwZWN0KGFyZywxKSkuam9pbignICcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjbGFzc05hbWUobykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmFtZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LC0xKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICdPYmplY3QnKSBuYW1lID0gby5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LnRvU3RyaW5nKClcbiAgICAgICAgfSgpKWAsIFdLVXNlclNjcmlwdEluamVjdGlvblRpbWUuQXREb2N1bWVudFN0YXJ0LCB0cnVlKSk7XG5cbiAgICAgICAgLy8gV2Ugd2FudCB0byByZXBsYWNlIHRoZSBVSVdlYlZpZXcgY3JlYXRlZCBieSBzdXBlcmNsYXNzIHdpdGggV0tXZWJWaWV3IGluc3RhbmNlXG4gICAgICAgIHRoaXMubmF0aXZlVmlldyA9IHRoaXMuX2lvcyA9IFdLV2ViVmlldy5hbGxvYygpLmluaXRXaXRoRnJhbWVDb25maWd1cmF0aW9uKENHUmVjdFplcm8sIGNvbmZpZ3VyYXRpb24pO1xuICAgICAgICBkZWxldGUgdGhpcy5fZGVsZWdhdGUgLy8gcmVtb3ZlIHJlZmVyZW5jZSB0byBVSVdlYlZpZXcgZGVsZWdhdGUgY3JlYXRlZCBieSBzdXBlciBjbGFzc1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IHRoaXMuX2FyZ29uRGVsZWdhdGUgPSBBcmdvbldlYlZpZXdEZWxlZ2F0ZS5pbml0V2l0aE93bmVyKG5ldyBXZWFrUmVmKHRoaXMpKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImFyZ29uXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwiYXJnb25jaGVja1wiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImxvZ1wiKTtcblxuXHQgICAgdGhpcy5faW9zLmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gdHJ1ZTtcblx0XHR0aGlzLl9pb3NbJ2N1c3RvbVVzZXJBZ2VudCddID0gQVJHT05fVVNFUl9BR0VOVDtcblxuICAgICAgICAvLyBzdHlsZSBhcHByb3ByaWF0ZWx5XG4gICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgcHVibGljIF9hcmdvblBhZ2VzID0ge307XG4gICAgcHVibGljIF9zZXRJc0FyZ29uUGFnZShmbGFnOmJvb2xlYW4sIHVybDpzdHJpbmcpIHtcbiAgICAgICAgaWYgKGZsYWcpIHRoaXMuX2FyZ29uUGFnZXNbdXJsXSA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5pc0FyZ29uUGFnZSAmJiBmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3IuY2xlYXJDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IGZhbHNlOyAgICAgXG4gICAgICAgICAgICBjb21tb24uaXNBcmdvblBhZ2VQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB0cnVlKTsgICBcbiAgICAgICAgICAgIC8vIHRoaXMuc2V0KFwiaXNBcmdvblBhZ2VcIiwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0FyZ29uUGFnZSAmJiAhZmxhZykge1xuICAgICAgICAgICAgdGhpcy5faW9zLnNjcm9sbFZpZXcuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLndoaXRlQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci53aGl0ZUNvbG9yKTtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5vcGFxdWUgPSB0cnVlOyAgICAgICAgXG4gICAgICAgICAgICAvLyB0aGlzLnNldChcImlzQXJnb25QYWdlXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGNvbW1vbi5pc0FyZ29uUGFnZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OnN0cmluZykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCk9PntcbiAgICAgICAgICAgIHRoaXMuX2lvcy5ldmFsdWF0ZUphdmFTY3JpcHRDb21wbGV0aW9uSGFuZGxlcihzY3JpcHQsIChyZXN1bHQsIGVycm9yKT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikgcmVqZWN0KGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICBlbHNlIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKHNjcmlwdDpzdHJpbmcpIDogdm9pZCB7XG4gICAgICAgIHRoaXMuX2lvcy5ldmFsdWF0ZUphdmFTY3JpcHRDb21wbGV0aW9uSGFuZGxlcihzY3JpcHQsIDxhbnk+bnVsbClcbiAgICB9XG5cbiAgICBwdWJsaWMgYnJpbmdUb0Zyb250KCkge1xuICAgICAgICB0aGlzLl9pb3Muc3VwZXJ2aWV3LmJyaW5nU3Vidmlld1RvRnJvbnQodGhpcy5faW9zKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb25Mb2FkZWQoKSB7XG4gICAgICAgIHN1cGVyLm9uTG9hZGVkKCk7XG4gICAgICAgIHRoaXMuX2lvcy5uYXZpZ2F0aW9uRGVsZWdhdGUgPSB0aGlzLl9hcmdvbkRlbGVnYXRlO1xuICAgIH1cblxuICAgIHB1YmxpYyBvblVubG9hZGVkKCkge1xuICAgICAgICB0aGlzLl9pb3MubmF2aWdhdGlvbkRlbGVnYXRlID0gPGFueT51bmRlZmluZWQ7XG4gICAgICAgIHN1cGVyLm9uVW5sb2FkZWQoKTtcbiAgICB9XG5cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIHRoaXMuX2lvcy5yZWxvYWRGcm9tT3JpZ2luKCk7XG4gICAgfVxufVxuXG5jbGFzcyBBcmdvbldlYlZpZXdEZWxlZ2F0ZSBleHRlbmRzIE5TT2JqZWN0IGltcGxlbWVudHMgV0tTY3JpcHRNZXNzYWdlSGFuZGxlciwgV0tOYXZpZ2F0aW9uRGVsZWdhdGUge1xuICAgIFxuICAgIHByaXZhdGUgX293bmVyOldlYWtSZWY8QXJnb25XZWJWaWV3PjtcbiAgICBcbiAgICBwdWJsaWMgc3RhdGljIGluaXRXaXRoT3duZXIob3duZXI6V2Vha1JlZjxBcmdvbldlYlZpZXc+KSB7XG4gICAgICAgIGNvbnN0IGRlbGVnYXRlID0gPEFyZ29uV2ViVmlld0RlbGVnYXRlPkFyZ29uV2ViVmlld0RlbGVnYXRlLm5ldygpXG4gICAgICAgIGRlbGVnYXRlLl9vd25lciA9IG93bmVyO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2VidmlldyA9IDxXS1dlYlZpZXc+b3duZXIuZ2V0KCkuaW9zO1xuICAgICAgICB3ZWJ2aWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcInRpdGxlXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIHdlYnZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwiVVJMXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIHdlYnZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwiZXN0aW1hdGVkUHJvZ3Jlc3NcIiwgMCwgPGFueT5udWxsKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkZWxlZ2F0ZTtcbiAgICB9XG5cbiAgICBkZWFsbG9jKCkge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBjb25zdCB3ZWJ2aWV3ID0gPFdLV2ViVmlldz4gKG93bmVyICYmIG93bmVyLmlvcyk7XG4gICAgICAgIHdlYnZpZXcucmVtb3ZlT2JzZXJ2ZXJGb3JLZXlQYXRoKHRoaXMsIFwidGl0bGVcIik7XG4gICAgICAgIHdlYnZpZXcucmVtb3ZlT2JzZXJ2ZXJGb3JLZXlQYXRoKHRoaXMsIFwiVVJMXCIpO1xuICAgICAgICB3ZWJ2aWV3LnJlbW92ZU9ic2VydmVyRm9yS2V5UGF0aCh0aGlzLCBcImVzdGltYXRlZFByb2dyZXNzXCIpO1xuICAgIH1cblxuICAgIG9ic2VydmVWYWx1ZUZvcktleVBhdGhPZk9iamVjdENoYW5nZUNvbnRleHQoa2V5UGF0aDpzdHJpbmcsIG9iamVjdDphbnksIGNoYW5nZTphbnksIGNvbnRleHQ6YW55KSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjsgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2tXZWJWaWV3ID0gPFdLV2ViVmlldz5vd25lci5pb3M7XG5cbiAgICAgICAgc3dpdGNoIChrZXlQYXRoKSB7XG5cbiAgICAgICAgICAgIGNhc2UgXCJ0aXRsZVwiOiBcbiAgICAgICAgICAgIGNvbW1vbi50aXRsZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKG93bmVyLCB3a1dlYlZpZXcudGl0bGUpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJVUkxcIjogXG4gICAgICAgICAgICBjb21tb24udXJsUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2Uob3duZXIsIHdrV2ViVmlldy5VUkwgJiYgd2tXZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImVzdGltYXRlZFByb2dyZXNzXCI6XG4gICAgICAgICAgICBjb21tb24ucHJvZ3Jlc3NQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZShvd25lciwgd2tXZWJWaWV3LmVzdGltYXRlZFByb2dyZXNzKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gcHJpdmF0ZSB1cGRhdGVVUkwoKSB7XG4gICAgLy8gICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgLy8gICAgIGlmICghb3duZXIpIHJldHVybjsgICAgIFxuICAgIC8vICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmlvcztcbiAgICAvLyAgICAgb3duZXIuc2V0KFwidXJsXCIsIHdrV2ViVmlldy5VUkwgJiYgd2tXZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgLy8gfVxuICAgIFxuICAgIC8vIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXJcblxuICAgIHVzZXJDb250ZW50Q29udHJvbGxlckRpZFJlY2VpdmVTY3JpcHRNZXNzYWdlKHVzZXJDb250ZW50Q29udHJvbGxlcjpXS1VzZXJDb250ZW50Q29udHJvbGxlciwgbWVzc2FnZTpXS1NjcmlwdE1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBjb25zdCB1cmwgPSBtZXNzYWdlLmZyYW1lSW5mby5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICAgICAgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uJykge1xuICAgICAgICAgICAgaWYgKCFvd25lci5zZXNzaW9uKSB7ICBcbiAgICAgICAgICAgICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgICAgICAvLyBhcmdvbiBwYWdlLCBwZXJoYXBzIGJlY2F1c2UgYXJnb24uanMgbG9hZGVkIGFzeW5jcm9ub3VzbHkgXG4gICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBwcm9ncmFtbWVyIGRpZG4ndCBzZXQgdXAgYW4gYXJnb24gbWV0YSB0YWdcbiAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvblBhZ2UodHJ1ZSwgdXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG93bmVyLl9oYW5kbGVBcmdvbk1lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdsb2cnKSB7XG4gICAgICAgICAgICBvd25lci5faGFuZGxlTG9nTWVzc2FnZShtZXNzYWdlLmJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uY2hlY2snKSB7XG4gICAgICAgICAgICBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5ib2R5ID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvblBhZ2UodHJ1ZSwgdXJsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvblBhZ2UoZmFsc2UsIHVybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFdLTmF2aWdhdGlvbkRlbGVnYXRlXG5cbiAgICBwcml2YXRlIF9wcm92aXNpb25hbFVSTCA6IHN0cmluZztcblxuICAgIHdlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uQWN0aW9uRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uQWN0aW9uOldLTmF2aWdhdGlvbkFjdGlvbiwgZGVjaXNpb25IYW5kbGVyOihwb2xpY3k6V0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBpZiAobmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZSAmJiBuYXZpZ2F0aW9uQWN0aW9uLnRhcmdldEZyYW1lLm1haW5GcmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbmF2aWdhdGlvblR5cGU6V0tOYXZpZ2F0aW9uVHlwZSA9IG5hdmlnYXRpb25BY3Rpb24ubmF2aWdhdGlvblR5cGU7XG4gICAgICAgICAgICB2YXIgbmF2VHlwZTpOYXZpZ2F0aW9uVHlwZSA9ICdvdGhlcic7XG4gICAgICAgICAgICBzd2l0Y2ggKG5hdmlnYXRpb25UeXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkxpbmtBY3RpdmF0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGUgPSAnbGlua0NsaWNrZWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVN1Ym1pdHRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdmb3JtU3VibWl0dGVkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkJhY2tGb3J3YXJkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlID0gJ2JhY2tGb3J3YXJkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLlJlbG9hZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdyZWxvYWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVJlc3VibWl0dGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlID0gJ2Zvcm1SZXN1Ym1pdHRlZCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICAgICAgaWYgKG93bmVyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmF2aWdhdGlvbkFjdGlvbi5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICAgICAgICAgICAgICBpZiAoIW93bmVyLl9hcmdvblBhZ2VzW3VybF0pIG93bmVyLl9zZXRJc0FyZ29uUGFnZShmYWxzZSwgdXJsKTtcbiAgICAgICAgICAgICAgICBvd25lclsnX29uTG9hZFN0YXJ0ZWQnXSh1cmwsIG5hdlR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJhY2Uud3JpdGUoXCJBcmdvbldlYlZpZXcud2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25BY3Rpb25EZWNpc2lvbkhhbmRsZXIoXCIgKyBuYXZpZ2F0aW9uQWN0aW9uLnJlcXVlc3QuVVJMLmFic29sdXRlU3RyaW5nICsgXCIsIFwiICsgbmF2aWdhdGlvbkFjdGlvbi5uYXZpZ2F0aW9uVHlwZSArIFwiKVwiLCB0cmFjZS5jYXRlZ29yaWVzLkRlYnVnKTtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvbkFjdGlvblBvbGljeS5BbGxvdyk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25SZXNwb25zZURlY2lzaW9uSGFuZGxlcih3ZWJ2aWV3OldLV2ViVmlldywgbmF2aWdhdGlvblJlc3BvbnNlOldLTmF2aWdhdGlvblJlc3BvbnNlLCBkZWNpc2lvbkhhbmRsZXI6KHBvbGljeTpXS05hdmlnYXRpb25SZXNwb25zZVBvbGljeSk9PnZvaWQpIHtcbiAgICAgICAgZGVjaXNpb25IYW5kbGVyKFdLTmF2aWdhdGlvblJlc3BvbnNlUG9saWN5LkFsbG93KTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkU3RhcnRQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgdGhpcy5fcHJvdmlzaW9uYWxVUkwgPSB3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZztcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkQ29tbWl0TmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIG93bmVyLl9kaWRDb21taXROYXZpZ2F0aW9uKCk7XG4gICAgICAgIC8vIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10odGhpcy5fcHJvdmlzaW9uYWxVUkwsIFwiUHJvdmlzaW9uYWwgbmF2aWdhdGlvbiBmYWlsZWRcIik7XG4gICAgICAgIC8vIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZpbmlzaE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwgJiYgd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsTmF2aWdhdGlvbldpdGhFcnJvcih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbiwgZXJyb3I6TlNFcnJvcikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZywgZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3OiBXS1dlYlZpZXcsIGVycm9yOiBOU0Vycm9yKSA6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoZXJyb3IuY29kZSA9PSBXS0Vycm9yQ29kZS5XZWJDb250ZW50UHJvY2Vzc1Rlcm1pbmF0ZWQgJiYgZXJyb3IuZG9tYWluID09IFwiV2ViS2l0RXJyb3JEb21haW5cIikge1xuICAgICAgICAgICAgd2ViVmlldy5yZWxvYWRGcm9tT3JpZ2luKClcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxQcm92aXNpb25hbE5hdmlnYXRpb25XaXRoRXJyb3Iod2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24sIGVycm9yOiBOU0Vycm9yKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMICYmIHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nLCBlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIC8vIHRoaXMudXBkYXRlVVJMKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuY2hlY2tJZldlYkNvbnRlbnRQcm9jZXNzSGFzQ3Jhc2hlZCh3ZWJWaWV3LCBlcnJvcikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVybCA9IGVycm9yLnVzZXJJbmZvLm9iamVjdEZvcktleShOU1VSTEVycm9yRmFpbGluZ1VSTEVycm9yS2V5KSBhcyBOU1VSTDtcbiAgICAgICAgaWYgKHVybCAmJiB1cmwuaG9zdCAmJiBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZVVudHJ1c3RlZCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZUhhc0JhZERhdGUgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVIYXNVbmtub3duUm9vdCB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZU5vdFlldFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc3QgY2VydENoYWluID0gZXJyb3IudXNlckluZm8ub2JqZWN0Rm9yS2V5KCdOU0Vycm9yUGVlckNlcnRpZmljYXRlQ2hhaW5LZXknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBjZXJ0ID0gY2VydENoYWluICYmIGNlcnRDaGFpblswXTtcbiAgICAgICAgICAgICAgICAvLyBkaWFsb2dzLmNvbmZpcm0oYCR7ZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb259IFdvdWxkIHlvdSBsaWtlIHRvIGNvbnRpbnVlIGFueXdheT9gKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgY29uc3Qgb3JpZ2luID0gYCR7dXJsLmhvc3R9OiR7dXJsLnBvcnR8fDQ0M31gO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgX2NlcnRTdG9yZS5hZGRDZXJ0aWZpY2F0ZShjZXJ0LCBvcmlnaW4pO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgd2ViVmlldy5sb2FkUmVxdWVzdChuZXcgTlNVUkxSZXF1ZXN0KHtVUkw6dXJsfSkpO1xuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfSkuY2F0Y2goKCk9Pnt9KTtcblxuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24gKyBcIiBBIGJ1ZyBpbiBBcmdvbjQgcHJldmVudHMgdXMgZnJvbSBjb250aW51aW5nLiBQbGVhc2UgdXNlIGEgc2l0ZSB3aXRoIGEgdmFsaWQgY2VydGlmaWNhdGUuICBXZSB3aWxsIGZpeCB0aGlzIHNvb24uXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKHVybCAmJiB1cmwuaG9zdCAmJlxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvckNhbm5vdEZpbmRIb3N0IHx8XG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yQ2Fubm90Q29ubmVjdFRvSG9zdCkge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoXCJDYW5ub3QgY29ubmVjdCB0byBob3N0LiBQbGVhc2UgY2hlY2sgdGhlIFVSTCBvciB0aGUgc2VydmVyIGNvbm5lY3Rpb24uXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKHVybCAmJiB1cmwuaG9zdCAmJlxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclRpbWVkT3V0XG4gICAgICAgICAgICAvL3x8IGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JDYW5jZWxsZWRcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoXCJIb3N0IGlzIG5vdCByZXNwb25kaW5nLiBQbGVhc2UgY2hlY2sgaWYgdGhlIGhvc3Qgc3VwcG90cyBIVFRQUy5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjb21tZW50IG91dCB1bnRpbCBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L2lvcy1ydW50aW1lL2lzc3Vlcy83NDIgaXMgZml4ZWRcblx0Ly8gd2ViVmlld0RpZFJlY2VpdmVBdXRoZW50aWNhdGlvbkNoYWxsZW5nZUNvbXBsZXRpb25IYW5kbGVyKHdlYlZpZXc6IFdLV2ViVmlldywgY2hhbGxlbmdlOiBOU1VSTEF1dGhlbnRpY2F0aW9uQ2hhbGxlbmdlLCBjb21wbGV0aW9uSGFuZGxlcjogKHAxOiBOU1VSTFNlc3Npb25BdXRoQ2hhbGxlbmdlRGlzcG9zaXRpb24sIHAyPzogTlNVUkxDcmVkZW50aWFsKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgLy8gICAgIC8vIElmIHRoaXMgaXMgYSBjZXJ0aWZpY2F0ZSBjaGFsbGVuZ2UsIHNlZSBpZiB0aGUgY2VydGlmaWNhdGUgaGFzIHByZXZpb3VzbHkgYmVlblxuICAgIC8vICAgICAvLyBhY2NlcHRlZCBieSB0aGUgdXNlci5cbiAgICAvLyAgICAgY29uc3Qgb3JpZ2luID0gYCR7Y2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5ob3N0fToke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UucG9ydH1gO1xuICAgIC8vICAgICBjb25zdCB0cnVzdCA9IGNoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2Uuc2VydmVyVHJ1c3Q7XG4gICAgLy8gICAgIGNvbnN0IGNlcnQgPSBTZWNUcnVzdEdldENlcnRpZmljYXRlQXRJbmRleCh0cnVzdCwgMCk7XG4gICAgLy8gICAgIGlmIChjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLmF1dGhlbnRpY2F0aW9uTWV0aG9kID09IE5TVVJMQXV0aGVudGljYXRpb25NZXRob2RTZXJ2ZXJUcnVzdCAmJlxuICAgIC8vICAgICAgICAgdHJ1c3QgJiYgY2VydCAmJiBfY2VydFN0b3JlLmNvbnRhaW5zQ2VydGlmaWNhdGUoY2VydCwgb3JpZ2luKSkge1xuICAgIC8vICAgICAgICAgY29tcGxldGlvbkhhbmRsZXIoTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLlVzZUNyZWRlbnRpYWwsIG5ldyBOU1VSTENyZWRlbnRpYWwodHJ1c3QpKVxuICAgIC8vICAgICAgICAgcmV0dXJuO1xuICAgIC8vICAgICB9XG5cbiAgICAvLyAgICAgY29tcGxldGlvbkhhbmRsZXIoTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLlBlcmZvcm1EZWZhdWx0SGFuZGxpbmcsIHVuZGVmaW5lZCk7XG4gICAgLy8gfVxuXG4gICAgcHVibGljIHN0YXRpYyBPYmpDUHJvdG9jb2xzID0gW1dLU2NyaXB0TWVzc2FnZUhhbmRsZXIsIFdLTmF2aWdhdGlvbkRlbGVnYXRlXTtcbn0iXX0=