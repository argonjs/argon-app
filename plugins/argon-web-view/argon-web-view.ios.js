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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUNsRCx3Q0FBb0M7QUFDcEMsNkJBQStCO0FBQy9CLG1DQUFxQztBQUNyQyxvQ0FBc0M7QUFFdEMsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUMscUJBQXFCLENBQUMsR0FBRyxRQUFRLENBQUM7QUFFM0gsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBSXhDLGdDQUFnQztBQUNoQztJQUFBO1FBQ1ksU0FBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFpQnJDLENBQUM7SUFmVSxrQ0FBYyxHQUFyQixVQUFzQixJQUFTLEVBQUUsTUFBYTtRQUMxQyxJQUFJLElBQUksR0FBVyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRU0sdUNBQW1CLEdBQTFCLFVBQTJCLElBQVMsRUFBRSxNQUFhO1FBQy9DLElBQUksSUFBSSxHQUFXLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9DLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU8sOEJBQVUsR0FBbEIsVUFBbUIsSUFBWSxFQUFFLE1BQWE7UUFDMUMs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Q0FBQyxBQTdMRCxDQUFtQyxRQUFRO0FBNEx6QixrQ0FBYSxHQUFHLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2FyZ29uLXdlYi12aWV3LWNvbW1vbic7XG5pbXBvcnQge1dlYlZpZXd9IGZyb20gJ3VpL3dlYi12aWV3JztcbmltcG9ydCAqIGFzIHRyYWNlIGZyb20gJ3RyYWNlJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5cbmNvbnN0IEFSR09OX1VTRVJfQUdFTlQgPSBVSVdlYlZpZXcuYWxsb2MoKS5pbml0KCkuc3RyaW5nQnlFdmFsdWF0aW5nSmF2YVNjcmlwdEZyb21TdHJpbmcoJ25hdmlnYXRvci51c2VyQWdlbnQnKSArICcgQXJnb24nO1xuXG5jb25zdCBwcm9jZXNzUG9vbCA9IFdLUHJvY2Vzc1Bvb2wubmV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbmRlY2xhcmUgY29uc3Qgd2luZG93OmFueSwgd2Via2l0OmFueSwgZG9jdW1lbnQ6YW55O1xuXG4vLy8gSW4tbWVtb3J5IGNlcnRpZmljYXRlIHN0b3JlLlxuY2xhc3MgQ2VydFN0b3JlIHtcbiAgICBwcml2YXRlIGtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIHB1YmxpYyBhZGRDZXJ0aWZpY2F0ZShjZXJ0OiBhbnksIG9yaWdpbjpzdHJpbmcpIHtcbiAgICAgICAgbGV0IGRhdGE6IE5TRGF0YSA9IFNlY0NlcnRpZmljYXRlQ29weURhdGEoY2VydClcbiAgICAgICAgbGV0IGtleSA9IHRoaXMua2V5Rm9yRGF0YShkYXRhLCBvcmlnaW4pO1xuICAgICAgICB0aGlzLmtleXMuYWRkKGtleSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbnRhaW5zQ2VydGlmaWNhdGUoY2VydDogYW55LCBvcmlnaW46c3RyaW5nKSA6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgZGF0YTogTlNEYXRhID0gU2VjQ2VydGlmaWNhdGVDb3B5RGF0YShjZXJ0KVxuICAgICAgICBsZXQga2V5ID0gdGhpcy5rZXlGb3JEYXRhKGRhdGEsIG9yaWdpbilcbiAgICAgICAgcmV0dXJuIHRoaXMua2V5cy5oYXMoa2V5KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGtleUZvckRhdGEoZGF0YTogTlNEYXRhLCBvcmlnaW46c3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBgJHtvcmlnaW59LyR7ZGF0YS5oYXNofWA7XG4gICAgfVxufVxuXG5jb25zdCBfY2VydFN0b3JlID0gbmV3IENlcnRTdG9yZSgpO1xuXG5leHBvcnQgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgY29tbW9uLkFyZ29uV2ViVmlldyAge1xuXG4gICAgcHJpdmF0ZSBfaW9zOldLV2ViVmlld1xuICAgIHByaXZhdGUgX2RlbGVnYXRlOlVJV2ViVmlld0RlbGVnYXRlXG4gICAgXG4gICAgcHJpdmF0ZSBfYXJnb25EZWxlZ2F0ZTpBcmdvbldlYlZpZXdEZWxlZ2F0ZTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb24gPSBXS1dlYlZpZXdDb25maWd1cmF0aW9uLmFsbG9jKCkuaW5pdCgpO1xuXG4gICAgICAgIGNvbmZpZ3VyYXRpb24uYWxsb3dzSW5saW5lTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24uYWxsb3dzQWlyUGxheUZvck1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c1BpY3R1cmVJblBpY3R1cmVNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5tZWRpYVR5cGVzUmVxdWlyaW5nVXNlckFjdGlvbkZvclBsYXliYWNrID0gV0tBdWRpb3Zpc3VhbE1lZGlhVHlwZXMuTm9uZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5wcm9jZXNzUG9vbCA9IHByb2Nlc3NQb29sO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRVc2VyU2NyaXB0KFdLVXNlclNjcmlwdC5hbGxvYygpLmluaXRXaXRoU291cmNlSW5qZWN0aW9uVGltZUZvck1haW5GcmFtZU9ubHkoYCgke1xuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbExvZyA9IGNvbnNvbGUubG9nO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOidsb2cnLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsTG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB2YXIgX29yaWdpbmFsV2FybiA9IGNvbnNvbGUud2FybjtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5sb2cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe3R5cGU6J3dhcm4nLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsV2Fybi5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbEVycm9yID0gY29uc29sZS5lcnJvcjtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOidlcnJvcicsbWVzc2FnZTppbnNwZWN0RWFjaChhcmd1bWVudHMpfSkpO1xuICAgICAgICAgICAgICAgICAgICBfb3JpZ2luYWxFcnJvci5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmhhbmRsZWQgRXJyb3I6ICcgKyBlLm1lc3NhZ2UgKyAnICgnICsgZS5zb3VyY2UgKyAnOicgKyBlLmxpbmVubyArICcpJyk7XG4gICAgICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9zZW5kQXJnb25DaGVjayhldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQuaGVhZC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9YXJnb25dJykgIT09IG51bGwgfHwgdHlwZW9mKEFyZ29uKSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5wZXJzaXN0ZWQpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmFyZ29uY2hlY2sucG9zdE1lc3NhZ2UoXCJ0cnVlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5hcmdvbmNoZWNrLnBvc3RNZXNzYWdlKFwiZmFsc2VcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgX3NlbmRBcmdvbkNoZWNrKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBhZ2VzaG93XCIsIF9zZW5kQXJnb25DaGVjayk7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5zcGVjdChvLCBkZXB0aCkgOiBzdHJpbmcge1xuICAgICAgICAgICAgICAgICAgICBpZiAobyA9PT0gbnVsbCkgcmV0dXJuIFwibnVsbFwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAobyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gXCJ1bmRlZmluZWRcIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvID09PSAnbnVtYmVyJyB8fCBvIGluc3RhbmNlb2YgTnVtYmVyKSByZXR1cm4gKG8pLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbyA9PT0gJ3N0cmluZycgfHwgbyBpbnN0YW5jZW9mIFN0cmluZykgcmV0dXJuIDxzdHJpbmc+IG87XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG8pKSByZXR1cm4gXCJBcnJheVtcIisgby5sZW5ndGggK1wiXVwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIERhdGUpIHJldHVybiBvLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZXB0aCA+IDAgPyBgJHtjbGFzc05hbWUobyl9IHske1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKG8pLm1hcCgoa2V5KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ1xcbiAgICAnICsga2V5ICsgJzogJyArIGluc3BlY3QobywgZGVwdGgtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuam9pbigpICsgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pID8gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdcXG4gICAgX19wcm90b19fOiAnICsgY2xhc3NOYW1lKE9iamVjdC5nZXRQcm90b3R5cGVPZihvKSkgOiBcIlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxufWAgOiBjbGFzc05hbWUobyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluc3BlY3RFYWNoKGFyZ3M6SUFyZ3VtZW50cykgOiBzdHJpbmcge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnc0FycmF5ID0gW10uc2xpY2UuY2FsbChhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NBcnJheS5tYXAoKGFyZyk9Pmluc3BlY3QoYXJnLDEpKS5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNsYXNzTmFtZShvKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBuYW1lID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsLTEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ09iamVjdCcpIG5hbWUgPSBvLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0udG9TdHJpbmcoKVxuICAgICAgICB9KCkpYCwgV0tVc2VyU2NyaXB0SW5qZWN0aW9uVGltZS5BdERvY3VtZW50U3RhcnQsIHRydWUpKTtcblxuICAgICAgICAvLyBXZSB3YW50IHRvIHJlcGxhY2UgdGhlIFVJV2ViVmlldyBjcmVhdGVkIGJ5IHN1cGVyY2xhc3Mgd2l0aCBXS1dlYlZpZXcgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5faW9zID0gV0tXZWJWaWV3LmFsbG9jKCkuaW5pdFdpdGhGcmFtZUNvbmZpZ3VyYXRpb24oQ0dSZWN0WmVybywgY29uZmlndXJhdGlvbik7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9kZWxlZ2F0ZSAvLyByZW1vdmUgcmVmZXJlbmNlIHRvIFVJV2ViVmlldyBkZWxlZ2F0ZSBjcmVhdGVkIGJ5IHN1cGVyIGNsYXNzXG4gICAgICAgIGNvbnN0IGRlbGVnYXRlID0gdGhpcy5fYXJnb25EZWxlZ2F0ZSA9IEFyZ29uV2ViVmlld0RlbGVnYXRlLmluaXRXaXRoT3duZXIobmV3IFdlYWtSZWYodGhpcykpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwiYXJnb25cIik7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFNjcmlwdE1lc3NhZ2VIYW5kbGVyTmFtZShkZWxlZ2F0ZSwgXCJhcmdvbmNoZWNrXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUoZGVsZWdhdGUsIFwibG9nXCIpO1xuXG5cdCAgICB0aGlzLl9pb3MuYWxsb3dzQmFja0ZvcndhcmROYXZpZ2F0aW9uR2VzdHVyZXMgPSB0cnVlO1xuXHRcdHRoaXMuX2lvc1snY3VzdG9tVXNlckFnZW50J10gPSBBUkdPTl9VU0VSX0FHRU5UO1xuXG4gICAgICAgIC8vIHN0eWxlIGFwcHJvcHJpYXRlbHlcbiAgICAgICAgdGhpcy5faW9zLnNjcm9sbFZpZXcubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBwdWJsaWMgX3NldElzQXJnb25BcHAoZmxhZzpib29sZWFuKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0FyZ29uQXBwICYmIGZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci5jbGVhckNvbG9yKTtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3IuY2xlYXJDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3Mub3BhcXVlID0gZmFsc2U7ICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzQXJnb25BcHAgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci53aGl0ZUNvbG9yKTtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3Iud2hpdGVDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3Mub3BhcXVlID0gdHJ1ZTsgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zZXQoXCJpc0FyZ29uQXBwXCIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OnN0cmluZykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCk9PntcbiAgICAgICAgICAgIHRoaXMuX2lvcy5ldmFsdWF0ZUphdmFTY3JpcHRDb21wbGV0aW9uSGFuZGxlcihzY3JpcHQsIChyZXN1bHQsIGVycm9yKT0+e1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikgcmVqZWN0KGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICBlbHNlIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKHNjcmlwdDpzdHJpbmcpIDogdm9pZCB7XG4gICAgICAgIHRoaXMuX2lvcy5ldmFsdWF0ZUphdmFTY3JpcHRDb21wbGV0aW9uSGFuZGxlcihzY3JpcHQsIDxhbnk+bnVsbClcbiAgICB9XG5cbiAgICBwdWJsaWMgYnJpbmdUb0Zyb250KCkge1xuICAgICAgICB0aGlzLl9pb3Muc3VwZXJ2aWV3LmJyaW5nU3Vidmlld1RvRnJvbnQodGhpcy5faW9zKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb25Mb2FkZWQoKSB7XG4gICAgICAgIHN1cGVyLm9uTG9hZGVkKCk7XG4gICAgICAgIHRoaXMuX2lvcy5uYXZpZ2F0aW9uRGVsZWdhdGUgPSB0aGlzLl9hcmdvbkRlbGVnYXRlO1xuICAgIH1cblxuICAgIHB1YmxpYyBvblVubG9hZGVkKCkge1xuICAgICAgICAvLyBOT1RFOiByZW1vdmVkIHdoZW4gbW92aW5nIHRvIGlPUzEwIC0tIHdpbGwgbm90IGxldCBtZSBhc3NpZ24gbnVsbCB0byB0aGUgXG4gICAgICAgIC8vIGRlbGVnYXRlLiAgTm90IHN1cmUgaWYgdGhpcyB3aWxsIGNhdXNlIGEgcHJvYmxlbS5cbiAgICAgICAgLy8gdGhpcy5faW9zLm5hdmlnYXRpb25EZWxlZ2F0ZSA9IG51bGw7XG4gICAgICAgIHN1cGVyLm9uVW5sb2FkZWQoKTtcbiAgICB9XG5cbiAgICByZWxvYWQoKSB7XG4gICAgICAgIHRoaXMuX2lvcy5yZWxvYWRGcm9tT3JpZ2luKCk7XG4gICAgfVxufVxuXG5jbGFzcyBBcmdvbldlYlZpZXdEZWxlZ2F0ZSBleHRlbmRzIE5TT2JqZWN0IGltcGxlbWVudHMgV0tTY3JpcHRNZXNzYWdlSGFuZGxlciwgV0tOYXZpZ2F0aW9uRGVsZWdhdGUge1xuICAgIFxuICAgIHByaXZhdGUgX293bmVyOldlYWtSZWY8QXJnb25XZWJWaWV3PjtcbiAgICBcbiAgICBwdWJsaWMgc3RhdGljIGluaXRXaXRoT3duZXIob3duZXI6V2Vha1JlZjxBcmdvbldlYlZpZXc+KSB7XG4gICAgICAgIGNvbnN0IGRlbGVnYXRlID0gPEFyZ29uV2ViVmlld0RlbGVnYXRlPkFyZ29uV2ViVmlld0RlbGVnYXRlLm5ldygpXG4gICAgICAgIGRlbGVnYXRlLl9vd25lciA9IG93bmVyO1xuXG4gICAgICAgIGNvbnN0IHdrV2ViVmlldyA9IDxXS1dlYlZpZXc+b3duZXIuZ2V0KCkuaW9zO1xuICAgICAgICB3a1dlYlZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwidGl0bGVcIiwgMCwgPGFueT5udWxsKTtcbiAgICAgICAgd2tXZWJWaWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcIlVSTFwiLCAwLCA8YW55Pm51bGwpO1xuICAgICAgICB3a1dlYlZpZXcuYWRkT2JzZXJ2ZXJGb3JLZXlQYXRoT3B0aW9uc0NvbnRleHQoZGVsZWdhdGUsIFwiZXN0aW1hdGVkUHJvZ3Jlc3NcIiwgMCwgPGFueT5udWxsKTtcblxuICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgfVxuXG4gICAgb2JzZXJ2ZVZhbHVlRm9yS2V5UGF0aE9mT2JqZWN0Q2hhbmdlQ29udGV4dChrZXlQYXRoOnN0cmluZywgb2JqZWN0OmFueSwgY2hhbmdlOmFueSwgY29udGV4dDphbnkpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuOyAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmlvcztcblxuICAgICAgICBzd2l0Y2ggKGtleVBhdGgpIHtcbiAgICAgICAgICAgIGNhc2UgXCJ0aXRsZVwiOiBcbiAgICAgICAgICAgICAgICBvd25lci5zZXQoa2V5UGF0aCwgd2tXZWJWaWV3LnRpdGxlKTsgXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiVVJMXCI6IFxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZXN0aW1hdGVkUHJvZ3Jlc3NcIjpcbiAgICAgICAgICAgICAgICBvd25lci5zZXQoJ3Byb2dyZXNzJywgd2tXZWJWaWV3LmVzdGltYXRlZFByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdXBkYXRlVVJMKCkge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47ICAgICBcbiAgICAgICAgY29uc3Qgd2tXZWJWaWV3ID0gPFdLV2ViVmlldz5vd25lci5pb3M7XG4gICAgICAgIG93bmVyWydfc3VzcGVuZExvYWRpbmcnXSA9IHRydWU7IFxuICAgICAgICBvd25lci5zZXQoXCJ1cmxcIiwgd2tXZWJWaWV3LlVSTCAmJiB3a1dlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nKTsgXG4gICAgICAgIG93bmVyWydfc3VzcGVuZExvYWRpbmcnXSA9IGZhbHNlOyBcbiAgICB9XG4gICAgXG4gICAgLy8gV0tTY3JpcHRNZXNzYWdlSGFuZGxlclxuXG4gICAgdXNlckNvbnRlbnRDb250cm9sbGVyRGlkUmVjZWl2ZVNjcmlwdE1lc3NhZ2UodXNlckNvbnRlbnRDb250cm9sbGVyOldLVXNlckNvbnRlbnRDb250cm9sbGVyLCBtZXNzYWdlOldLU2NyaXB0TWVzc2FnZSkge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIGlmIChtZXNzYWdlLm5hbWUgPT09ICdhcmdvbicpIHtcbiAgICAgICAgICAgIGlmICghb3duZXIuc2Vzc2lvbikge1xuICAgICAgICAgICAgICAgIC8vIGp1c3QgaW4gY2FzZSB3ZSB0aG91Z2h0IGJlbG93IHRoYXQgdGhlIHBhZ2Ugd2FzIG5vdCBhblxuICAgICAgICAgICAgICAgIC8vIGFyZ29uIHBhZ2UsIHBlcmhhcHMgYmVjYXVzZSBhcmdvbi5qcyBsb2FkZWQgYXN5bmNyb25vdXNseSBcbiAgICAgICAgICAgICAgICAvLyBhbmQgdGhlIHByb2dyYW1tZXIgZGlkbid0IHNldCB1cCBhbiBhcmdvbiBtZXRhIHRhZ1xuICAgICAgICAgICAgICAgIG93bmVyLl9zZXRJc0FyZ29uQXBwKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3duZXIuX2hhbmRsZUFyZ29uTWVzc2FnZShtZXNzYWdlLmJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2xvZycpIHtcbiAgICAgICAgICAgIG93bmVyLl9oYW5kbGVMb2dNZXNzYWdlKG1lc3NhZ2UuYm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5uYW1lID09PSAnYXJnb25jaGVjaycpIHtcbiAgICAgICAgICAgIGlmICghb3duZXIuc2Vzc2lvbikge1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmJvZHkgPT09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG93bmVyLl9zZXRJc0FyZ29uQXBwKHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG93bmVyLl9zZXRJc0FyZ29uQXBwKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gV0tOYXZpZ2F0aW9uRGVsZWdhdGVcblxuICAgIHByaXZhdGUgX3Byb3Zpc2lvbmFsVVJMIDogc3RyaW5nO1xuXG4gICAgd2ViVmlld0RlY2lkZVBvbGljeUZvck5hdmlnYXRpb25BY3Rpb25EZWNpc2lvbkhhbmRsZXIod2VidmlldzpXS1dlYlZpZXcsIG5hdmlnYXRpb25BY3Rpb246V0tOYXZpZ2F0aW9uQWN0aW9uLCBkZWNpc2lvbkhhbmRsZXI6KHBvbGljeTpXS05hdmlnYXRpb25BY3Rpb25Qb2xpY3kpPT52b2lkKSB7XG4gICAgICAgIGlmIChuYXZpZ2F0aW9uQWN0aW9uLnRhcmdldEZyYW1lICYmIG5hdmlnYXRpb25BY3Rpb24udGFyZ2V0RnJhbWUubWFpbkZyYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBuYXZpZ2F0aW9uVHlwZTpXS05hdmlnYXRpb25UeXBlID0gbmF2aWdhdGlvbkFjdGlvbi5uYXZpZ2F0aW9uVHlwZTtcbiAgICAgICAgICAgIHZhciBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdvdGhlcicpO1xuICAgICAgICAgICAgc3dpdGNoIChuYXZpZ2F0aW9uVHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5MaW5rQWN0aXZhdGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdsaW5rQ2xpY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVN1Ym1pdHRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignZm9ybVN1Ym1pdHRlZCcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuQmFja0ZvcndhcmQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ2JhY2tGb3J3YXJkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5SZWxvYWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ3JlbG9hZCcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuRm9ybVJlc3VibWl0dGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdmb3JtUmVzdWJtaXR0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZFN0YXJ0ZWQnXShuYXZpZ2F0aW9uQWN0aW9uLnJlcXVlc3QuVVJMLmFic29sdXRlU3RyaW5nLCBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlc1tuYXZUeXBlSW5kZXhdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyYWNlLndyaXRlKFwiQXJnb25XZWJWaWV3LndlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uQWN0aW9uRGVjaXNpb25IYW5kbGVyKFwiICsgbmF2aWdhdGlvbkFjdGlvbi5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZyArIFwiLCBcIiArIG5hdmlnYXRpb25BY3Rpb24ubmF2aWdhdGlvblR5cGUgKyBcIilcIiwgdHJhY2UuY2F0ZWdvcmllcy5EZWJ1Zyk7XG4gICAgICAgIGRlY2lzaW9uSGFuZGxlcihXS05hdmlnYXRpb25BY3Rpb25Qb2xpY3kuQWxsb3cpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uUmVzcG9uc2VEZWNpc2lvbkhhbmRsZXIod2VidmlldzpXS1dlYlZpZXcsIG5hdmlnYXRpb25SZXNwb25zZTpXS05hdmlnYXRpb25SZXNwb25zZSwgZGVjaXNpb25IYW5kbGVyOihwb2xpY3k6V0tOYXZpZ2F0aW9uUmVzcG9uc2VQb2xpY3kpPT52b2lkKSB7XG4gICAgICAgIGRlY2lzaW9uSGFuZGxlcihXS05hdmlnYXRpb25SZXNwb25zZVBvbGljeS5BbGxvdyk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZFN0YXJ0UHJvdmlzaW9uYWxOYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIHRoaXMuX3Byb3Zpc2lvbmFsVVJMID0gd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmc7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZENvbW1pdE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBvd25lci5fZGlkQ29tbWl0TmF2aWdhdGlvbigpO1xuICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsUHJvdmlzaW9uYWxOYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHRoaXMuX3Byb3Zpc2lvbmFsVVJMLCBcIlByb3Zpc2lvbmFsIG5hdmlnYXRpb24gZmFpbGVkXCIpO1xuICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGaW5pc2hOYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbE5hdmlnYXRpb25XaXRoRXJyb3Iod2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24sIGVycm9yOk5TRXJyb3IpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcsIGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNoZWNrSWZXZWJDb250ZW50UHJvY2Vzc0hhc0NyYXNoZWQod2ViVmlldzogV0tXZWJWaWV3LCBlcnJvcjogTlNFcnJvcikgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGVycm9yLmNvZGUgPT0gV0tFcnJvckNvZGUuV2ViQ29udGVudFByb2Nlc3NUZXJtaW5hdGVkICYmIGVycm9yLmRvbWFpbiA9PSBcIldlYktpdEVycm9yRG9tYWluXCIpIHtcbiAgICAgICAgICAgIHdlYlZpZXcucmVsb2FkRnJvbU9yaWdpbigpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsUHJvdmlzaW9uYWxOYXZpZ2F0aW9uV2l0aEVycm9yKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uLCBlcnJvcjogTlNFcnJvcikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZywgZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmNoZWNrSWZXZWJDb250ZW50UHJvY2Vzc0hhc0NyYXNoZWQod2ViVmlldywgZXJyb3IpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1cmwgPSBlcnJvci51c2VySW5mby5vYmplY3RGb3JLZXkoTlNVUkxFcnJvckZhaWxpbmdVUkxFcnJvcktleSkgYXMgTlNVUkw7XG4gICAgICAgIGlmICh1cmwgJiYgdXJsLmhvc3QgJiYgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVVbnRydXN0ZWQgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVIYXNCYWREYXRlIHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlSGFzVW5rbm93blJvb3QgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVOb3RZZXRWYWxpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlcnRDaGFpbiA9IGVycm9yLnVzZXJJbmZvLm9iamVjdEZvcktleSgnTlNFcnJvclBlZXJDZXJ0aWZpY2F0ZUNoYWluS2V5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2VydCA9IGNlcnRDaGFpbiAmJiBjZXJ0Q2hhaW5bMF07XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKGAke2Vycm9yLmxvY2FsaXplZERlc2NyaXB0aW9ufSBXb3VsZCB5b3UgbGlrZSB0byBjb250aW51ZSBhbnl3YXk/YCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbiA9IGAke3VybC5ob3N0fToke3VybC5wb3J0fHw0NDN9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jZXJ0U3RvcmUuYWRkQ2VydGlmaWNhdGUoY2VydCwgb3JpZ2luKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlYlZpZXcubG9hZFJlcXVlc3QobmV3IE5TVVJMUmVxdWVzdCh7VVJMOnVybH0pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpPT57fSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXHR3ZWJWaWV3RGlkUmVjZWl2ZUF1dGhlbnRpY2F0aW9uQ2hhbGxlbmdlQ29tcGxldGlvbkhhbmRsZXI/KHdlYlZpZXc6IFdLV2ViVmlldywgY2hhbGxlbmdlOiBOU1VSTEF1dGhlbnRpY2F0aW9uQ2hhbGxlbmdlLCBjb21wbGV0aW9uSGFuZGxlcjogKHAxOiBOU1VSTFNlc3Npb25BdXRoQ2hhbGxlbmdlRGlzcG9zaXRpb24sIHAyPzogTlNVUkxDcmVkZW50aWFsKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBjZXJ0aWZpY2F0ZSBjaGFsbGVuZ2UsIHNlZSBpZiB0aGUgY2VydGlmaWNhdGUgaGFzIHByZXZpb3VzbHkgYmVlblxuICAgICAgICAvLyBhY2NlcHRlZCBieSB0aGUgdXNlci5cbiAgICAgICAgY29uc3Qgb3JpZ2luID0gYCR7Y2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5ob3N0fToke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UucG9ydH1gO1xuICAgICAgICBjb25zdCB0cnVzdCA9IGNoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2Uuc2VydmVyVHJ1c3Q7XG4gICAgICAgIGNvbnN0IGNlcnQgPSBTZWNUcnVzdEdldENlcnRpZmljYXRlQXRJbmRleCh0cnVzdCwgMCk7XG4gICAgICAgIGlmIChjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLmF1dGhlbnRpY2F0aW9uTWV0aG9kID09IE5TVVJMQXV0aGVudGljYXRpb25NZXRob2RTZXJ2ZXJUcnVzdCAmJlxuICAgICAgICAgICAgdHJ1c3QgJiYgY2VydCAmJiBfY2VydFN0b3JlLmNvbnRhaW5zQ2VydGlmaWNhdGUoY2VydCwgb3JpZ2luKSkge1xuICAgICAgICAgICAgY29tcGxldGlvbkhhbmRsZXIoTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLlVzZUNyZWRlbnRpYWwsIG5ldyBOU1VSTENyZWRlbnRpYWwodHJ1c3QpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29tcGxldGlvbkhhbmRsZXIoTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLlBlcmZvcm1EZWZhdWx0SGFuZGxpbmcsIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyBPYmpDUHJvdG9jb2xzID0gW1dLU2NyaXB0TWVzc2FnZUhhbmRsZXIsIFdLTmF2aWdhdGlvbkRlbGVnYXRlXTtcbn0iXX0=