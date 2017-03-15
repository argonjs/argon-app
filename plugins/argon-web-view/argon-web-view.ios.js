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
var CertStore = (function () {
    function CertStore() {
        this.keys = new Set();
    }
    CertStore.prototype.addCertificate = function (cert, origin) {
        var data = SecCertificateCopyData(cert);
        var key = this.keyForData(data, origin);
        this.keys.add(key);
    };
    CertStore.prototype.containsCertificate = function (cert, origin) {
        var data = SecCertificateCopyData(cert);
        var key = this.keyForData(data, origin);
        return this.keys.has(key);
    };
    CertStore.prototype.keyForData = function (data, origin) {
        return origin + "/" + data.hash;
    };
    return CertStore;
}());
var _certStore = new CertStore();
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
        this._provisionalURL = webView.URL.absoluteString;
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
            owner['_onLoadFinished'](webView.URL.absoluteString);
        this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFailNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL.absoluteString, error.localizedDescription);
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
            owner['_onLoadFinished'](webView.URL.absoluteString, error.localizedDescription);
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
            var certChain = error.userInfo.objectForKey('NSErrorPeerCertificateChainKey');
            var cert_1 = certChain && certChain[0];
            dialogs.confirm(error.localizedDescription + " Would you like to continue anyway?").then(function (result) {
                if (result) {
                    var origin = url.host + ":" + (url.port || 443);
                    _certStore.addCertificate(cert_1, origin);
                    webView.loadRequest(new NSURLRequest({ URL: url }));
                }
            }).catch(function () { });
        }
    };
    ArgonWebViewDelegate.prototype.webViewDidReceiveAuthenticationChallengeCompletionHandler = function (webView, challenge, completionHandler) {
        // If this is a certificate challenge, see if the certificate has previously been
        // accepted by the user.
        var origin = challenge.protectionSpace.host + ":" + challenge.protectionSpace.port;
        var trust = challenge.protectionSpace.serverTrust;
        var cert = SecTrustGetCertificateAtIndex(trust, 0);
        if (challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust &&
            trust && cert && _certStore.containsCertificate(cert, origin)) {
            completionHandler(0 /* UseCredential */, new NSURLCredential(trust));
            return;
        }
        completionHandler(1 /* PerformDefaultHandling */, undefined);
    };
    return ArgonWebViewDelegate;
}(NSObject));
ArgonWebViewDelegate.ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUNsRCx3Q0FBb0M7QUFDcEMsNkJBQStCO0FBQy9CLG1DQUFxQztBQUNyQyxvQ0FBc0M7QUFFdEMsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUMscUJBQXFCLENBQUMsR0FBRyxRQUFRLENBQUM7QUFFM0gsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBSXhDLGdDQUFnQztBQUNoQztJQUFBO1FBQ1ksU0FBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFpQnJDLENBQUM7SUFmVSxrQ0FBYyxHQUFyQixVQUFzQixJQUFTLEVBQUUsTUFBYTtRQUMxQyxJQUFJLElBQUksR0FBVyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRU0sdUNBQW1CLEdBQTFCLFVBQTJCLElBQVMsRUFBRSxNQUFhO1FBQy9DLElBQUksSUFBSSxHQUFXLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9DLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU8sOEJBQVUsR0FBbEIsVUFBbUIsSUFBWSxFQUFFLE1BQWE7UUFDMUMs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Q0FBQztRQUVELGlCQUFpQixDQUFDLDhCQUEyRCxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFHTCwyQkFBQztBQUFELENBQUMsQUE3TEQsQ0FBbUMsUUFBUTtBQTRMekIsa0NBQWEsR0FBRyxDQUFDLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9hcmdvbi13ZWItdmlldy1jb21tb24nO1xuaW1wb3J0IHtXZWJWaWV3fSBmcm9tICd1aS93ZWItdmlldyc7XG5pbXBvcnQgKiBhcyB0cmFjZSBmcm9tICd0cmFjZSc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuXG5jb25zdCBBUkdPTl9VU0VSX0FHRU5UID0gVUlXZWJWaWV3LmFsbG9jKCkuaW5pdCgpLnN0cmluZ0J5RXZhbHVhdGluZ0phdmFTY3JpcHRGcm9tU3RyaW5nKCduYXZpZ2F0b3IudXNlckFnZW50JykgKyAnIEFyZ29uJztcblxuY29uc3QgcHJvY2Vzc1Bvb2wgPSBXS1Byb2Nlc3NQb29sLm5ldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG5kZWNsYXJlIGNvbnN0IHdpbmRvdzphbnksIHdlYmtpdDphbnksIGRvY3VtZW50OmFueTtcblxuLy8vIEluLW1lbW9yeSBjZXJ0aWZpY2F0ZSBzdG9yZS5cbmNsYXNzIENlcnRTdG9yZSB7XG4gICAgcHJpdmF0ZSBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBwdWJsaWMgYWRkQ2VydGlmaWNhdGUoY2VydDogYW55LCBvcmlnaW46c3RyaW5nKSB7XG4gICAgICAgIGxldCBkYXRhOiBOU0RhdGEgPSBTZWNDZXJ0aWZpY2F0ZUNvcHlEYXRhKGNlcnQpXG4gICAgICAgIGxldCBrZXkgPSB0aGlzLmtleUZvckRhdGEoZGF0YSwgb3JpZ2luKTtcbiAgICAgICAgdGhpcy5rZXlzLmFkZChrZXkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb250YWluc0NlcnRpZmljYXRlKGNlcnQ6IGFueSwgb3JpZ2luOnN0cmluZykgOiBib29sZWFuIHtcbiAgICAgICAgbGV0IGRhdGE6IE5TRGF0YSA9IFNlY0NlcnRpZmljYXRlQ29weURhdGEoY2VydClcbiAgICAgICAgbGV0IGtleSA9IHRoaXMua2V5Rm9yRGF0YShkYXRhLCBvcmlnaW4pXG4gICAgICAgIHJldHVybiB0aGlzLmtleXMuaGFzKGtleSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBrZXlGb3JEYXRhKGRhdGE6IE5TRGF0YSwgb3JpZ2luOnN0cmluZykge1xuICAgICAgICByZXR1cm4gYCR7b3JpZ2lufS8ke2RhdGEuaGFzaH1gO1xuICAgIH1cbn1cblxuY29uc3QgX2NlcnRTdG9yZSA9IG5ldyBDZXJ0U3RvcmUoKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcgIHtcblxuICAgIHByaXZhdGUgX2lvczpXS1dlYlZpZXdcbiAgICBwcml2YXRlIF9kZWxlZ2F0ZTpVSVdlYlZpZXdEZWxlZ2F0ZVxuICAgIFxuICAgIHByaXZhdGUgX2FyZ29uRGVsZWdhdGU6QXJnb25XZWJWaWV3RGVsZWdhdGU7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9uID0gV0tXZWJWaWV3Q29uZmlndXJhdGlvbi5hbGxvYygpLmluaXQoKTtcblxuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0lubGluZU1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c0FpclBsYXlGb3JNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NQaWN0dXJlSW5QaWN0dXJlTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ubWVkaWFUeXBlc1JlcXVpcmluZ1VzZXJBY3Rpb25Gb3JQbGF5YmFjayA9IFdLQXVkaW92aXN1YWxNZWRpYVR5cGVzLk5vbmU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24ucHJvY2Vzc1Bvb2wgPSBwcm9jZXNzUG9vbDtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkVXNlclNjcmlwdChXS1VzZXJTY3JpcHQuYWxsb2MoKS5pbml0V2l0aFNvdXJjZUluamVjdGlvblRpbWVGb3JNYWluRnJhbWVPbmx5KGAoJHtcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxMb2cgPSBjb25zb2xlLmxvZztcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonbG9nJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbExvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbFdhcm4gPSBjb25zb2xlLndhcm47XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOid3YXJuJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbFdhcm4uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTonZXJyb3InLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsRXJyb3IuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5oYW5kbGVkIEVycm9yOiAnICsgZS5tZXNzYWdlICsgJyAoJyArIGUuc291cmNlICsgJzonICsgZS5saW5lbm8gKyAnKScpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfc2VuZEFyZ29uQ2hlY2soZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPWFyZ29uXScpICE9PSBudWxsIHx8IHR5cGVvZihBcmdvbikgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQucGVyc2lzdGVkKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Ugd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5hcmdvbmNoZWNrLnBvc3RNZXNzYWdlKFwidHJ1ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMuYXJnb25jaGVjay5wb3N0TWVzc2FnZShcImZhbHNlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIF9zZW5kQXJnb25DaGVjayk7XG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwYWdlc2hvd1wiLCBfc2VuZEFyZ29uQ2hlY2spO1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluc3BlY3QobywgZGVwdGgpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IG51bGwpIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIFwidW5kZWZpbmVkXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbyA9PT0gJ251bWJlcicgfHwgbyBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIChvKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG8gPT09ICdzdHJpbmcnIHx8IG8gaW5zdGFuY2VvZiBTdHJpbmcpIHJldHVybiA8c3RyaW5nPiBvO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvKSkgcmV0dXJuIFwiQXJyYXlbXCIrIG8ubGVuZ3RoICtcIl1cIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8gaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gby50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVwdGggPiAwID8gYCR7Y2xhc3NOYW1lKG8pfSB7JHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5tYXAoKGtleSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdcXG4gICAgJyArIGtleSArICc6ICcgKyBpbnNwZWN0KG8sIGRlcHRoLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oKSArIE9iamVjdC5nZXRQcm90b3R5cGVPZihvKSA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXFxuICAgIF9fcHJvdG9fXzogJyArIGNsYXNzTmFtZShPYmplY3QuZ2V0UHJvdG90eXBlT2YobykpIDogXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbn1gIDogY2xhc3NOYW1lKG8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnNwZWN0RWFjaChhcmdzOklBcmd1bWVudHMpIDogc3RyaW5nIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3NBcnJheSA9IFtdLnNsaWNlLmNhbGwoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzQXJyYXkubWFwKChhcmcpPT5pbnNwZWN0KGFyZywxKSkuam9pbignICcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjbGFzc05hbWUobykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmFtZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LC0xKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICdPYmplY3QnKSBuYW1lID0gby5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LnRvU3RyaW5nKClcbiAgICAgICAgfSgpKWAsIFdLVXNlclNjcmlwdEluamVjdGlvblRpbWUuQXREb2N1bWVudFN0YXJ0LCB0cnVlKSk7XG5cbiAgICAgICAgLy8gV2Ugd2FudCB0byByZXBsYWNlIHRoZSBVSVdlYlZpZXcgY3JlYXRlZCBieSBzdXBlcmNsYXNzIHdpdGggV0tXZWJWaWV3IGluc3RhbmNlXG4gICAgICAgIHRoaXMuX2lvcyA9IFdLV2ViVmlldy5hbGxvYygpLmluaXRXaXRoRnJhbWVDb25maWd1cmF0aW9uKENHUmVjdFplcm8sIGNvbmZpZ3VyYXRpb24pO1xuICAgICAgICBkZWxldGUgdGhpcy5fZGVsZWdhdGUgLy8gcmVtb3ZlIHJlZmVyZW5jZSB0byBVSVdlYlZpZXcgZGVsZWdhdGUgY3JlYXRlZCBieSBzdXBlciBjbGFzc1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IHRoaXMuX2FyZ29uRGVsZWdhdGUgPSBBcmdvbldlYlZpZXdEZWxlZ2F0ZS5pbml0V2l0aE93bmVyKG5ldyBXZWFrUmVmKHRoaXMpKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImFyZ29uXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwiYXJnb25jaGVja1wiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImxvZ1wiKTtcblxuXHQgICAgdGhpcy5faW9zLmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gdHJ1ZTtcblx0XHR0aGlzLl9pb3NbJ2N1c3RvbVVzZXJBZ2VudCddID0gQVJHT05fVVNFUl9BR0VOVDtcblxuICAgICAgICAvLyBzdHlsZSBhcHByb3ByaWF0ZWx5XG4gICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgcHVibGljIF9zZXRJc0FyZ29uQXBwKGZsYWc6Ym9vbGVhbikge1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvbkFwcCAmJiBmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3IuY2xlYXJDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IGZhbHNlOyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldChcImlzQXJnb25BcHBcIiwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0FyZ29uQXBwICYmICFmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3Iud2hpdGVDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLndoaXRlQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IHRydWU7ICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpPT57XG4gICAgICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCAocmVzdWx0LCBlcnJvcik9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHJlamVjdChlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSA6IHZvaWQge1xuICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCA8YW55Pm51bGwpXG4gICAgfVxuXG4gICAgcHVibGljIGJyaW5nVG9Gcm9udCgpIHtcbiAgICAgICAgdGhpcy5faW9zLnN1cGVydmlldy5icmluZ1N1YnZpZXdUb0Zyb250KHRoaXMuX2lvcyk7XG4gICAgfVxuXG4gICAgcHVibGljIG9uTG9hZGVkKCkge1xuICAgICAgICBzdXBlci5vbkxvYWRlZCgpO1xuICAgICAgICB0aGlzLl9pb3MubmF2aWdhdGlvbkRlbGVnYXRlID0gdGhpcy5fYXJnb25EZWxlZ2F0ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb25VbmxvYWRlZCgpIHtcbiAgICAgICAgLy8gTk9URTogcmVtb3ZlZCB3aGVuIG1vdmluZyB0byBpT1MxMCAtLSB3aWxsIG5vdCBsZXQgbWUgYXNzaWduIG51bGwgdG8gdGhlIFxuICAgICAgICAvLyBkZWxlZ2F0ZS4gIE5vdCBzdXJlIGlmIHRoaXMgd2lsbCBjYXVzZSBhIHByb2JsZW0uXG4gICAgICAgIC8vIHRoaXMuX2lvcy5uYXZpZ2F0aW9uRGVsZWdhdGUgPSBudWxsO1xuICAgICAgICBzdXBlci5vblVubG9hZGVkKCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldEN1cnJlbnRVcmwoKSA6IHN0cmluZyB7XG4gICAgICAgIC8vIG5vdGU6IHRoaXMuc3JjIGlzIHdoYXQgdGhlIHdlYnZpZXcgd2FzIG9yaWdpbmFsbHkgc2V0IHRvIGxvYWQsIHRoaXMudXJsIGlzIHRoZSBhY3R1YWwgY3VycmVudCB1cmwuIFxuICAgICAgICByZXR1cm4gdGhpcy51cmw7XG4gICAgfVxuXG4gICAgcmVsb2FkKCkge1xuICAgICAgICB0aGlzLl9pb3MucmVsb2FkRnJvbU9yaWdpbigpO1xuICAgIH1cbn1cblxuY2xhc3MgQXJnb25XZWJWaWV3RGVsZWdhdGUgZXh0ZW5kcyBOU09iamVjdCBpbXBsZW1lbnRzIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXIsIFdLTmF2aWdhdGlvbkRlbGVnYXRlIHtcbiAgICBcbiAgICBwcml2YXRlIF9vd25lcjpXZWFrUmVmPEFyZ29uV2ViVmlldz47XG4gICAgXG4gICAgcHVibGljIHN0YXRpYyBpbml0V2l0aE93bmVyKG93bmVyOldlYWtSZWY8QXJnb25XZWJWaWV3Pikge1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IDxBcmdvbldlYlZpZXdEZWxlZ2F0ZT5BcmdvbldlYlZpZXdEZWxlZ2F0ZS5uZXcoKVxuICAgICAgICBkZWxlZ2F0ZS5fb3duZXIgPSBvd25lcjtcblxuICAgICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmdldCgpLmlvcztcbiAgICAgICAgd2tXZWJWaWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcInRpdGxlXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIHdrV2ViVmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJVUkxcIiwgMCwgPGFueT5udWxsKTtcbiAgICAgICAgd2tXZWJWaWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcImVzdGltYXRlZFByb2dyZXNzXCIsIDAsIDxhbnk+bnVsbCk7XG5cbiAgICAgICAgcmV0dXJuIGRlbGVnYXRlO1xuICAgIH1cblxuICAgIG9ic2VydmVWYWx1ZUZvcktleVBhdGhPZk9iamVjdENoYW5nZUNvbnRleHQoa2V5UGF0aDpzdHJpbmcsIG9iamVjdDphbnksIGNoYW5nZTphbnksIGNvbnRleHQ6YW55KSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjsgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2tXZWJWaWV3ID0gPFdLV2ViVmlldz5vd25lci5pb3M7XG5cbiAgICAgICAgc3dpdGNoIChrZXlQYXRoKSB7XG4gICAgICAgICAgICBjYXNlIFwidGl0bGVcIjogXG4gICAgICAgICAgICAgICAgb3duZXIuc2V0KGtleVBhdGgsIHdrV2ViVmlldy50aXRsZSk7IFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlVSTFwiOiBcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImVzdGltYXRlZFByb2dyZXNzXCI6XG4gICAgICAgICAgICAgICAgb3duZXIuc2V0KCdwcm9ncmVzcycsIHdrV2ViVmlldy5lc3RpbWF0ZWRQcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHVwZGF0ZVVSTCgpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuOyAgICAgXG4gICAgICAgIGNvbnN0IHdrV2ViVmlldyA9IDxXS1dlYlZpZXc+b3duZXIuaW9zO1xuICAgICAgICBvd25lclsnX3N1c3BlbmRMb2FkaW5nJ10gPSB0cnVlOyBcbiAgICAgICAgb3duZXIuc2V0KFwidXJsXCIsIHdrV2ViVmlldy5VUkwgJiYgd2tXZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7IFxuICAgICAgICBvd25lclsnX3N1c3BlbmRMb2FkaW5nJ10gPSBmYWxzZTsgXG4gICAgfVxuICAgIFxuICAgIC8vIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXJcblxuICAgIHVzZXJDb250ZW50Q29udHJvbGxlckRpZFJlY2VpdmVTY3JpcHRNZXNzYWdlKHVzZXJDb250ZW50Q29udHJvbGxlcjpXS1VzZXJDb250ZW50Q29udHJvbGxlciwgbWVzc2FnZTpXS1NjcmlwdE1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBpZiAobWVzc2FnZS5uYW1lID09PSAnYXJnb24nKSB7XG4gICAgICAgICAgICBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgICAgICAvLyBhcmdvbiBwYWdlLCBwZXJoYXBzIGJlY2F1c2UgYXJnb24uanMgbG9hZGVkIGFzeW5jcm9ub3VzbHkgXG4gICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBwcm9ncmFtbWVyIGRpZG4ndCBzZXQgdXAgYW4gYXJnb24gbWV0YSB0YWdcbiAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG93bmVyLl9oYW5kbGVBcmdvbk1lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdsb2cnKSB7XG4gICAgICAgICAgICBvd25lci5faGFuZGxlTG9nTWVzc2FnZShtZXNzYWdlLmJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uY2hlY2snKSB7XG4gICAgICAgICAgICBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5ib2R5ID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcChmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFdLTmF2aWdhdGlvbkRlbGVnYXRlXG5cbiAgICBwcml2YXRlIF9wcm92aXNpb25hbFVSTCA6IHN0cmluZztcblxuICAgIHdlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uQWN0aW9uRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uQWN0aW9uOldLTmF2aWdhdGlvbkFjdGlvbiwgZGVjaXNpb25IYW5kbGVyOihwb2xpY3k6V0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBpZiAobmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZSAmJiBuYXZpZ2F0aW9uQWN0aW9uLnRhcmdldEZyYW1lLm1haW5GcmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbmF2aWdhdGlvblR5cGU6V0tOYXZpZ2F0aW9uVHlwZSA9IG5hdmlnYXRpb25BY3Rpb24ubmF2aWdhdGlvblR5cGU7XG4gICAgICAgICAgICB2YXIgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignb3RoZXInKTtcbiAgICAgICAgICAgIHN3aXRjaCAobmF2aWdhdGlvblR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuTGlua0FjdGl2YXRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignbGlua0NsaWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkZvcm1TdWJtaXR0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ2Zvcm1TdWJtaXR0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkJhY2tGb3J3YXJkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdiYWNrRm9yd2FyZCcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuUmVsb2FkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdyZWxvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkZvcm1SZXN1Ym1pdHRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignZm9ybVJlc3VibWl0dGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRTdGFydGVkJ10obmF2aWdhdGlvbkFjdGlvbi5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZywgV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXNbbmF2VHlwZUluZGV4XSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFjZS53cml0ZShcIkFyZ29uV2ViVmlldy53ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvbkFjdGlvbkRlY2lzaW9uSGFuZGxlcihcIiArIG5hdmlnYXRpb25BY3Rpb24ucmVxdWVzdC5VUkwuYWJzb2x1dGVTdHJpbmcgKyBcIiwgXCIgKyBuYXZpZ2F0aW9uQWN0aW9uLm5hdmlnYXRpb25UeXBlICsgXCIpXCIsIHRyYWNlLmNhdGVnb3JpZXMuRGVidWcpO1xuICAgICAgICBkZWNpc2lvbkhhbmRsZXIoV0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5LkFsbG93KTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvblJlc3BvbnNlRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uUmVzcG9uc2U6V0tOYXZpZ2F0aW9uUmVzcG9uc2UsIGRlY2lzaW9uSGFuZGxlcjoocG9saWN5OldLTmF2aWdhdGlvblJlc3BvbnNlUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBkZWNpc2lvbkhhbmRsZXIoV0tOYXZpZ2F0aW9uUmVzcG9uc2VQb2xpY3kuQWxsb3cpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRTdGFydFByb3Zpc2lvbmFsTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICB0aGlzLl9wcm92aXNpb25hbFVSTCA9IHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRDb21taXROYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgb3duZXIuX2RpZENvbW1pdE5hdmlnYXRpb24oKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbFByb3Zpc2lvbmFsTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh0aGlzLl9wcm92aXNpb25hbFVSTCwgXCJQcm92aXNpb25hbCBuYXZpZ2F0aW9uIGZhaWxlZFwiKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmluaXNoTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxOYXZpZ2F0aW9uV2l0aEVycm9yKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uLCBlcnJvcjpOU0Vycm9yKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nLCBlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjaGVja0lmV2ViQ29udGVudFByb2Nlc3NIYXNDcmFzaGVkKHdlYlZpZXc6IFdLV2ViVmlldywgZXJyb3I6IE5TRXJyb3IpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChlcnJvci5jb2RlID09IFdLRXJyb3JDb2RlLldlYkNvbnRlbnRQcm9jZXNzVGVybWluYXRlZCAmJiBlcnJvci5kb21haW4gPT0gXCJXZWJLaXRFcnJvckRvbWFpblwiKSB7XG4gICAgICAgICAgICB3ZWJWaWV3LnJlbG9hZEZyb21PcmlnaW4oKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbFByb3Zpc2lvbmFsTmF2aWdhdGlvbldpdGhFcnJvcih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbiwgZXJyb3I6IE5TRXJyb3IpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcsIGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcblxuICAgICAgICBpZiAodGhpcy5jaGVja0lmV2ViQ29udGVudFByb2Nlc3NIYXNDcmFzaGVkKHdlYlZpZXcsIGVycm9yKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXJsID0gZXJyb3IudXNlckluZm8ub2JqZWN0Rm9yS2V5KE5TVVJMRXJyb3JGYWlsaW5nVVJMRXJyb3JLZXkpIGFzIE5TVVJMO1xuICAgICAgICBpZiAodXJsICYmIHVybC5ob3N0ICYmIFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlVW50cnVzdGVkIHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlSGFzQmFkRGF0ZSB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZUhhc1Vua25vd25Sb290IHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlTm90WWV0VmFsaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjZXJ0Q2hhaW4gPSBlcnJvci51c2VySW5mby5vYmplY3RGb3JLZXkoJ05TRXJyb3JQZWVyQ2VydGlmaWNhdGVDaGFpbktleScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlcnQgPSBjZXJ0Q2hhaW4gJiYgY2VydENoYWluWzBdO1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybShgJHtlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbn0gV291bGQgeW91IGxpa2UgdG8gY29udGludWUgYW55d2F5P2ApLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW4gPSBgJHt1cmwuaG9zdH06JHt1cmwucG9ydHx8NDQzfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICBfY2VydFN0b3JlLmFkZENlcnRpZmljYXRlKGNlcnQsIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LmxvYWRSZXF1ZXN0KG5ldyBOU1VSTFJlcXVlc3Qoe1VSTDp1cmx9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKT0+e30pO1xuICAgICAgICB9XG4gICAgfVxuXG5cblx0d2ViVmlld0RpZFJlY2VpdmVBdXRoZW50aWNhdGlvbkNoYWxsZW5nZUNvbXBsZXRpb25IYW5kbGVyPyh3ZWJWaWV3OiBXS1dlYlZpZXcsIGNoYWxsZW5nZTogTlNVUkxBdXRoZW50aWNhdGlvbkNoYWxsZW5nZSwgY29tcGxldGlvbkhhbmRsZXI6IChwMTogTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLCBwMj86IE5TVVJMQ3JlZGVudGlhbCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgY2VydGlmaWNhdGUgY2hhbGxlbmdlLCBzZWUgaWYgdGhlIGNlcnRpZmljYXRlIGhhcyBwcmV2aW91c2x5IGJlZW5cbiAgICAgICAgLy8gYWNjZXB0ZWQgYnkgdGhlIHVzZXIuXG4gICAgICAgIGNvbnN0IG9yaWdpbiA9IGAke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UuaG9zdH06JHtjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnBvcnR9YDtcbiAgICAgICAgY29uc3QgdHJ1c3QgPSBjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnNlcnZlclRydXN0O1xuICAgICAgICBjb25zdCBjZXJ0ID0gU2VjVHJ1c3RHZXRDZXJ0aWZpY2F0ZUF0SW5kZXgodHJ1c3QsIDApO1xuICAgICAgICBpZiAoY2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5hdXRoZW50aWNhdGlvbk1ldGhvZCA9PSBOU1VSTEF1dGhlbnRpY2F0aW9uTWV0aG9kU2VydmVyVHJ1c3QgJiZcbiAgICAgICAgICAgIHRydXN0ICYmIGNlcnQgJiYgX2NlcnRTdG9yZS5jb250YWluc0NlcnRpZmljYXRlKGNlcnQsIG9yaWdpbikpIHtcbiAgICAgICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5Vc2VDcmVkZW50aWFsLCBuZXcgTlNVUkxDcmVkZW50aWFsKHRydXN0KSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5QZXJmb3JtRGVmYXVsdEhhbmRsaW5nLCB1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgT2JqQ1Byb3RvY29scyA9IFtXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyLCBXS05hdmlnYXRpb25EZWxlZ2F0ZV07XG59Il19