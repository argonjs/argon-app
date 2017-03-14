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
        // We want to replace the UIWebView created by superclass with WKWebView instance
        _this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
        delete _this._delegate; // remove reference to UIWebView delegate created by super class
        _this._argonDelegate = ArgonWebViewDelegate.initWithOwner(new WeakRef(_this));
        _this._ios.UIDelegate;
        configuration.allowsInlineMediaPlayback = true;
        configuration.allowsAirPlayForMediaPlayback = true;
        configuration.allowsPictureInPictureMediaPlayback = true;
        configuration.mediaTypesRequiringUserActionForPlayback = 0 /* None */;
        configuration.processPool = processPool;
        configuration.userContentController.addScriptMessageHandlerName(_this._argonDelegate, "argon");
        configuration.userContentController.addScriptMessageHandlerName(_this._argonDelegate, "argoncheck");
        configuration.userContentController.addScriptMessageHandlerName(_this._argonDelegate, "log");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUNsRCx3Q0FBb0M7QUFDcEMsNkJBQStCO0FBQy9CLG1DQUFxQztBQUNyQyxvQ0FBc0M7QUFFdEMsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUMscUJBQXFCLENBQUMsR0FBRyxRQUFRLENBQUM7QUFFM0gsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBSXhDLGdDQUFnQztBQUNoQztJQUFBO1FBQ1ksU0FBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFpQnJDLENBQUM7SUFmVSxrQ0FBYyxHQUFyQixVQUFzQixJQUFTLEVBQUUsTUFBYTtRQUMxQyxJQUFJLElBQUksR0FBVyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRU0sdUNBQW1CLEdBQTFCLFVBQTJCLElBQVMsRUFBRSxNQUFhO1FBQy9DLElBQUksSUFBSSxHQUFXLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9DLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU8sOEJBQVUsR0FBbEIsVUFBbUIsSUFBWSxFQUFFLE1BQWE7UUFDMUMs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QTJELEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUdMLDJCQUFDO0FBQUQsQ0FBQyxBQTdMRCxDQUFtQyxRQUFRO0FBNEx6QixrQ0FBYSxHQUFHLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2FyZ29uLXdlYi12aWV3LWNvbW1vbic7XG5pbXBvcnQge1dlYlZpZXd9IGZyb20gJ3VpL3dlYi12aWV3JztcbmltcG9ydCAqIGFzIHRyYWNlIGZyb20gJ3RyYWNlJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5cbmNvbnN0IEFSR09OX1VTRVJfQUdFTlQgPSBVSVdlYlZpZXcuYWxsb2MoKS5pbml0KCkuc3RyaW5nQnlFdmFsdWF0aW5nSmF2YVNjcmlwdEZyb21TdHJpbmcoJ25hdmlnYXRvci51c2VyQWdlbnQnKSArICcgQXJnb24nO1xuXG5jb25zdCBwcm9jZXNzUG9vbCA9IFdLUHJvY2Vzc1Bvb2wubmV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbmRlY2xhcmUgY29uc3Qgd2luZG93OmFueSwgd2Via2l0OmFueSwgZG9jdW1lbnQ6YW55O1xuXG4vLy8gSW4tbWVtb3J5IGNlcnRpZmljYXRlIHN0b3JlLlxuY2xhc3MgQ2VydFN0b3JlIHtcbiAgICBwcml2YXRlIGtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIHB1YmxpYyBhZGRDZXJ0aWZpY2F0ZShjZXJ0OiBhbnksIG9yaWdpbjpzdHJpbmcpIHtcbiAgICAgICAgbGV0IGRhdGE6IE5TRGF0YSA9IFNlY0NlcnRpZmljYXRlQ29weURhdGEoY2VydClcbiAgICAgICAgbGV0IGtleSA9IHRoaXMua2V5Rm9yRGF0YShkYXRhLCBvcmlnaW4pO1xuICAgICAgICB0aGlzLmtleXMuYWRkKGtleSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbnRhaW5zQ2VydGlmaWNhdGUoY2VydDogYW55LCBvcmlnaW46c3RyaW5nKSA6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgZGF0YTogTlNEYXRhID0gU2VjQ2VydGlmaWNhdGVDb3B5RGF0YShjZXJ0KVxuICAgICAgICBsZXQga2V5ID0gdGhpcy5rZXlGb3JEYXRhKGRhdGEsIG9yaWdpbilcbiAgICAgICAgcmV0dXJuIHRoaXMua2V5cy5oYXMoa2V5KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGtleUZvckRhdGEoZGF0YTogTlNEYXRhLCBvcmlnaW46c3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBgJHtvcmlnaW59LyR7ZGF0YS5oYXNofWA7XG4gICAgfVxufVxuXG5jb25zdCBfY2VydFN0b3JlID0gbmV3IENlcnRTdG9yZSgpO1xuXG5leHBvcnQgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgY29tbW9uLkFyZ29uV2ViVmlldyAge1xuXG4gICAgcHJpdmF0ZSBfaW9zOldLV2ViVmlld1xuICAgIHByaXZhdGUgX2RlbGVnYXRlOlVJV2ViVmlld0RlbGVnYXRlXG4gICAgXG4gICAgcHJpdmF0ZSBfYXJnb25EZWxlZ2F0ZTpBcmdvbldlYlZpZXdEZWxlZ2F0ZTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb24gPSBXS1dlYlZpZXdDb25maWd1cmF0aW9uLmFsbG9jKCkuaW5pdCgpO1xuXG4gICAgICAgIC8vIFdlIHdhbnQgdG8gcmVwbGFjZSB0aGUgVUlXZWJWaWV3IGNyZWF0ZWQgYnkgc3VwZXJjbGFzcyB3aXRoIFdLV2ViVmlldyBpbnN0YW5jZVxuICAgICAgICB0aGlzLl9pb3MgPSBXS1dlYlZpZXcuYWxsb2MoKS5pbml0V2l0aEZyYW1lQ29uZmlndXJhdGlvbihDR1JlY3RaZXJvLCBjb25maWd1cmF0aW9uKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2RlbGVnYXRlIC8vIHJlbW92ZSByZWZlcmVuY2UgdG8gVUlXZWJWaWV3IGRlbGVnYXRlIGNyZWF0ZWQgYnkgc3VwZXIgY2xhc3NcbiAgICAgICAgdGhpcy5fYXJnb25EZWxlZ2F0ZSA9IEFyZ29uV2ViVmlld0RlbGVnYXRlLmluaXRXaXRoT3duZXIobmV3IFdlYWtSZWYodGhpcykpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5faW9zLlVJRGVsZWdhdGVcbiAgICAgICAgXG4gICAgICAgIGNvbmZpZ3VyYXRpb24uYWxsb3dzSW5saW5lTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24uYWxsb3dzQWlyUGxheUZvck1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLmFsbG93c1BpY3R1cmVJblBpY3R1cmVNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5tZWRpYVR5cGVzUmVxdWlyaW5nVXNlckFjdGlvbkZvclBsYXliYWNrID0gV0tBdWRpb3Zpc3VhbE1lZGlhVHlwZXMuTm9uZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5wcm9jZXNzUG9vbCA9IHByb2Nlc3NQb29sO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRTY3JpcHRNZXNzYWdlSGFuZGxlck5hbWUodGhpcy5fYXJnb25EZWxlZ2F0ZSwgXCJhcmdvblwiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKHRoaXMuX2FyZ29uRGVsZWdhdGUsIFwiYXJnb25jaGVja1wiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKHRoaXMuX2FyZ29uRGVsZWdhdGUsIFwibG9nXCIpO1xuICAgICAgICBjb25maWd1cmF0aW9uLnVzZXJDb250ZW50Q29udHJvbGxlci5hZGRVc2VyU2NyaXB0KFdLVXNlclNjcmlwdC5hbGxvYygpLmluaXRXaXRoU291cmNlSW5qZWN0aW9uVGltZUZvck1haW5GcmFtZU9ubHkoYCgke1xuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbExvZyA9IGNvbnNvbGUubG9nO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOidsb2cnLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsTG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB2YXIgX29yaWdpbmFsV2FybiA9IGNvbnNvbGUud2FybjtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5sb2cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe3R5cGU6J3dhcm4nLG1lc3NhZ2U6aW5zcGVjdEVhY2goYXJndW1lbnRzKX0pKTtcbiAgICAgICAgICAgICAgICAgICAgX29yaWdpbmFsV2Fybi5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIF9vcmlnaW5hbEVycm9yID0gY29uc29sZS5lcnJvcjtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMubG9nLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHt0eXBlOidlcnJvcicsbWVzc2FnZTppbnNwZWN0RWFjaChhcmd1bWVudHMpfSkpO1xuICAgICAgICAgICAgICAgICAgICBfb3JpZ2luYWxFcnJvci5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmhhbmRsZWQgRXJyb3I6ICcgKyBlLm1lc3NhZ2UgKyAnICgnICsgZS5zb3VyY2UgKyAnOicgKyBlLmxpbmVubyArICcpJyk7XG4gICAgICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9zZW5kQXJnb25DaGVjayhldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQuaGVhZC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9YXJnb25dJykgIT09IG51bGwgfHwgdHlwZW9mKEFyZ29uKSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5wZXJzaXN0ZWQpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmFyZ29uY2hlY2sucG9zdE1lc3NhZ2UoXCJ0cnVlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5hcmdvbmNoZWNrLnBvc3RNZXNzYWdlKFwiZmFsc2VcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgX3NlbmRBcmdvbkNoZWNrKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBhZ2VzaG93XCIsIF9zZW5kQXJnb25DaGVjayk7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5zcGVjdChvLCBkZXB0aCkgOiBzdHJpbmcge1xuICAgICAgICAgICAgICAgICAgICBpZiAobyA9PT0gbnVsbCkgcmV0dXJuIFwibnVsbFwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAobyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gXCJ1bmRlZmluZWRcIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvID09PSAnbnVtYmVyJyB8fCBvIGluc3RhbmNlb2YgTnVtYmVyKSByZXR1cm4gKG8pLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbyA9PT0gJ3N0cmluZycgfHwgbyBpbnN0YW5jZW9mIFN0cmluZykgcmV0dXJuIDxzdHJpbmc+IG87XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG8pKSByZXR1cm4gXCJBcnJheVtcIisgby5sZW5ndGggK1wiXVwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIERhdGUpIHJldHVybiBvLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZXB0aCA+IDAgPyBgJHtjbGFzc05hbWUobyl9IHske1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKG8pLm1hcCgoa2V5KT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ1xcbiAgICAnICsga2V5ICsgJzogJyArIGluc3BlY3QobywgZGVwdGgtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuam9pbigpICsgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pID8gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdcXG4gICAgX19wcm90b19fOiAnICsgY2xhc3NOYW1lKE9iamVjdC5nZXRQcm90b3R5cGVPZihvKSkgOiBcIlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxufWAgOiBjbGFzc05hbWUobyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluc3BlY3RFYWNoKGFyZ3M6SUFyZ3VtZW50cykgOiBzdHJpbmcge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnc0FycmF5ID0gW10uc2xpY2UuY2FsbChhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NBcnJheS5tYXAoKGFyZyk9Pmluc3BlY3QoYXJnLDEpKS5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNsYXNzTmFtZShvKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBuYW1lID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsLTEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ09iamVjdCcpIG5hbWUgPSBvLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0udG9TdHJpbmcoKVxuICAgICAgICB9KCkpYCwgV0tVc2VyU2NyaXB0SW5qZWN0aW9uVGltZS5BdERvY3VtZW50U3RhcnQsIHRydWUpKTtcblxuXHQgICAgdGhpcy5faW9zLmFsbG93c0JhY2tGb3J3YXJkTmF2aWdhdGlvbkdlc3R1cmVzID0gdHJ1ZTtcblx0XHR0aGlzLl9pb3NbJ2N1c3RvbVVzZXJBZ2VudCddID0gQVJHT05fVVNFUl9BR0VOVDtcblxuICAgICAgICAvLyBzdHlsZSBhcHByb3ByaWF0ZWx5XG4gICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgcHVibGljIF9zZXRJc0FyZ29uQXBwKGZsYWc6Ym9vbGVhbikge1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvbkFwcCAmJiBmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3IuY2xlYXJDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IGZhbHNlOyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldChcImlzQXJnb25BcHBcIiwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0FyZ29uQXBwICYmICFmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3Iud2hpdGVDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3MuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLndoaXRlQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLm9wYXF1ZSA9IHRydWU7ICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpPT57XG4gICAgICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCAocmVzdWx0LCBlcnJvcik9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHJlamVjdChlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSA6IHZvaWQge1xuICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCA8YW55Pm51bGwpXG4gICAgfVxuXG4gICAgcHVibGljIGJyaW5nVG9Gcm9udCgpIHtcbiAgICAgICAgdGhpcy5faW9zLnN1cGVydmlldy5icmluZ1N1YnZpZXdUb0Zyb250KHRoaXMuX2lvcyk7XG4gICAgfVxuXG4gICAgcHVibGljIG9uTG9hZGVkKCkge1xuICAgICAgICBzdXBlci5vbkxvYWRlZCgpO1xuICAgICAgICB0aGlzLl9pb3MubmF2aWdhdGlvbkRlbGVnYXRlID0gdGhpcy5fYXJnb25EZWxlZ2F0ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb25VbmxvYWRlZCgpIHtcbiAgICAgICAgLy8gTk9URTogcmVtb3ZlZCB3aGVuIG1vdmluZyB0byBpT1MxMCAtLSB3aWxsIG5vdCBsZXQgbWUgYXNzaWduIG51bGwgdG8gdGhlIFxuICAgICAgICAvLyBkZWxlZ2F0ZS4gIE5vdCBzdXJlIGlmIHRoaXMgd2lsbCBjYXVzZSBhIHByb2JsZW0uXG4gICAgICAgIC8vIHRoaXMuX2lvcy5uYXZpZ2F0aW9uRGVsZWdhdGUgPSBudWxsO1xuICAgICAgICBzdXBlci5vblVubG9hZGVkKCk7XG4gICAgfVxuXG4gICAgcmVsb2FkKCkge1xuICAgICAgICB0aGlzLl9pb3MucmVsb2FkRnJvbU9yaWdpbigpO1xuICAgIH1cbn1cblxuY2xhc3MgQXJnb25XZWJWaWV3RGVsZWdhdGUgZXh0ZW5kcyBOU09iamVjdCBpbXBsZW1lbnRzIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXIsIFdLTmF2aWdhdGlvbkRlbGVnYXRlIHtcbiAgICBcbiAgICBwcml2YXRlIF9vd25lcjpXZWFrUmVmPEFyZ29uV2ViVmlldz47XG4gICAgXG4gICAgcHVibGljIHN0YXRpYyBpbml0V2l0aE93bmVyKG93bmVyOldlYWtSZWY8QXJnb25XZWJWaWV3Pikge1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IDxBcmdvbldlYlZpZXdEZWxlZ2F0ZT5BcmdvbldlYlZpZXdEZWxlZ2F0ZS5uZXcoKVxuICAgICAgICBkZWxlZ2F0ZS5fb3duZXIgPSBvd25lcjtcblxuICAgICAgICBjb25zdCB3a1dlYlZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmdldCgpLmlvcztcbiAgICAgICAgd2tXZWJWaWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcInRpdGxlXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIHdrV2ViVmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJVUkxcIiwgMCwgPGFueT5udWxsKTtcbiAgICAgICAgd2tXZWJWaWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcImVzdGltYXRlZFByb2dyZXNzXCIsIDAsIDxhbnk+bnVsbCk7XG5cbiAgICAgICAgcmV0dXJuIGRlbGVnYXRlO1xuICAgIH1cblxuICAgIG9ic2VydmVWYWx1ZUZvcktleVBhdGhPZk9iamVjdENoYW5nZUNvbnRleHQoa2V5UGF0aDpzdHJpbmcsIG9iamVjdDphbnksIGNoYW5nZTphbnksIGNvbnRleHQ6YW55KSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjsgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2tXZWJWaWV3ID0gPFdLV2ViVmlldz5vd25lci5pb3M7XG5cbiAgICAgICAgc3dpdGNoIChrZXlQYXRoKSB7XG4gICAgICAgICAgICBjYXNlIFwidGl0bGVcIjogXG4gICAgICAgICAgICAgICAgb3duZXIuc2V0KGtleVBhdGgsIHdrV2ViVmlldy50aXRsZSk7IFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlVSTFwiOiBcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImVzdGltYXRlZFByb2dyZXNzXCI6XG4gICAgICAgICAgICAgICAgb3duZXIuc2V0KCdwcm9ncmVzcycsIHdrV2ViVmlldy5lc3RpbWF0ZWRQcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHVwZGF0ZVVSTCgpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuOyAgICAgXG4gICAgICAgIGNvbnN0IHdrV2ViVmlldyA9IDxXS1dlYlZpZXc+b3duZXIuaW9zO1xuICAgICAgICBvd25lclsnX3N1c3BlbmRMb2FkaW5nJ10gPSB0cnVlOyBcbiAgICAgICAgb3duZXIuc2V0KFwidXJsXCIsIHdrV2ViVmlldy5VUkwgJiYgd2tXZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7IFxuICAgICAgICBvd25lclsnX3N1c3BlbmRMb2FkaW5nJ10gPSBmYWxzZTsgXG4gICAgfVxuICAgIFxuICAgIC8vIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXJcblxuICAgIHVzZXJDb250ZW50Q29udHJvbGxlckRpZFJlY2VpdmVTY3JpcHRNZXNzYWdlKHVzZXJDb250ZW50Q29udHJvbGxlcjpXS1VzZXJDb250ZW50Q29udHJvbGxlciwgbWVzc2FnZTpXS1NjcmlwdE1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBpZiAobWVzc2FnZS5uYW1lID09PSAnYXJnb24nKSB7XG4gICAgICAgICAgICBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgICAgICAvLyBhcmdvbiBwYWdlLCBwZXJoYXBzIGJlY2F1c2UgYXJnb24uanMgbG9hZGVkIGFzeW5jcm9ub3VzbHkgXG4gICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBwcm9ncmFtbWVyIGRpZG4ndCBzZXQgdXAgYW4gYXJnb24gbWV0YSB0YWdcbiAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG93bmVyLl9oYW5kbGVBcmdvbk1lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdsb2cnKSB7XG4gICAgICAgICAgICBvd25lci5faGFuZGxlTG9nTWVzc2FnZShtZXNzYWdlLmJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UubmFtZSA9PT0gJ2FyZ29uY2hlY2snKSB7XG4gICAgICAgICAgICBpZiAoIW93bmVyLnNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5ib2R5ID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvd25lci5fc2V0SXNBcmdvbkFwcChmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFdLTmF2aWdhdGlvbkRlbGVnYXRlXG5cbiAgICBwcml2YXRlIF9wcm92aXNpb25hbFVSTCA6IHN0cmluZztcblxuICAgIHdlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uQWN0aW9uRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uQWN0aW9uOldLTmF2aWdhdGlvbkFjdGlvbiwgZGVjaXNpb25IYW5kbGVyOihwb2xpY3k6V0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBpZiAobmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZSAmJiBuYXZpZ2F0aW9uQWN0aW9uLnRhcmdldEZyYW1lLm1haW5GcmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbmF2aWdhdGlvblR5cGU6V0tOYXZpZ2F0aW9uVHlwZSA9IG5hdmlnYXRpb25BY3Rpb24ubmF2aWdhdGlvblR5cGU7XG4gICAgICAgICAgICB2YXIgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignb3RoZXInKTtcbiAgICAgICAgICAgIHN3aXRjaCAobmF2aWdhdGlvblR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuTGlua0FjdGl2YXRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignbGlua0NsaWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkZvcm1TdWJtaXR0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGVJbmRleCA9IFdlYlZpZXcubmF2aWdhdGlvblR5cGVzLmluZGV4T2YoJ2Zvcm1TdWJtaXR0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkJhY2tGb3J3YXJkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdiYWNrRm9yd2FyZCcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFdLTmF2aWdhdGlvblR5cGUuUmVsb2FkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlSW5kZXggPSBXZWJWaWV3Lm5hdmlnYXRpb25UeXBlcy5pbmRleE9mKCdyZWxvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkZvcm1SZXN1Ym1pdHRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZUluZGV4ID0gV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXMuaW5kZXhPZignZm9ybVJlc3VibWl0dGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRTdGFydGVkJ10obmF2aWdhdGlvbkFjdGlvbi5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZywgV2ViVmlldy5uYXZpZ2F0aW9uVHlwZXNbbmF2VHlwZUluZGV4XSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFjZS53cml0ZShcIkFyZ29uV2ViVmlldy53ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvbkFjdGlvbkRlY2lzaW9uSGFuZGxlcihcIiArIG5hdmlnYXRpb25BY3Rpb24ucmVxdWVzdC5VUkwuYWJzb2x1dGVTdHJpbmcgKyBcIiwgXCIgKyBuYXZpZ2F0aW9uQWN0aW9uLm5hdmlnYXRpb25UeXBlICsgXCIpXCIsIHRyYWNlLmNhdGVnb3JpZXMuRGVidWcpO1xuICAgICAgICBkZWNpc2lvbkhhbmRsZXIoV0tOYXZpZ2F0aW9uQWN0aW9uUG9saWN5LkFsbG93KTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvblJlc3BvbnNlRGVjaXNpb25IYW5kbGVyKHdlYnZpZXc6V0tXZWJWaWV3LCBuYXZpZ2F0aW9uUmVzcG9uc2U6V0tOYXZpZ2F0aW9uUmVzcG9uc2UsIGRlY2lzaW9uSGFuZGxlcjoocG9saWN5OldLTmF2aWdhdGlvblJlc3BvbnNlUG9saWN5KT0+dm9pZCkge1xuICAgICAgICBkZWNpc2lvbkhhbmRsZXIoV0tOYXZpZ2F0aW9uUmVzcG9uc2VQb2xpY3kuQWxsb3cpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRTdGFydFByb3Zpc2lvbmFsTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICB0aGlzLl9wcm92aXNpb25hbFVSTCA9IHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRDb21taXROYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgb3duZXIuX2RpZENvbW1pdE5hdmlnYXRpb24oKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbFByb3Zpc2lvbmFsTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47XG4gICAgICAgIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh0aGlzLl9wcm92aXNpb25hbFVSTCwgXCJQcm92aXNpb25hbCBuYXZpZ2F0aW9uIGZhaWxlZFwiKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmluaXNoTmF2aWdhdGlvbih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZyk7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZEZhaWxOYXZpZ2F0aW9uV2l0aEVycm9yKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uLCBlcnJvcjpOU0Vycm9yKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nLCBlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgIHRoaXMudXBkYXRlVVJMKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjaGVja0lmV2ViQ29udGVudFByb2Nlc3NIYXNDcmFzaGVkKHdlYlZpZXc6IFdLV2ViVmlldywgZXJyb3I6IE5TRXJyb3IpIDogYm9vbGVhbiB7XG4gICAgICAgIGlmIChlcnJvci5jb2RlID09IFdLRXJyb3JDb2RlLldlYkNvbnRlbnRQcm9jZXNzVGVybWluYXRlZCAmJiBlcnJvci5kb21haW4gPT0gXCJXZWJLaXRFcnJvckRvbWFpblwiKSB7XG4gICAgICAgICAgICB3ZWJWaWV3LnJlbG9hZEZyb21PcmlnaW4oKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbFByb3Zpc2lvbmFsTmF2aWdhdGlvbldpdGhFcnJvcih3ZWJWaWV3OiBXS1dlYlZpZXcsIG5hdmlnYXRpb246IFdLTmF2aWdhdGlvbiwgZXJyb3I6IE5TRXJyb3IpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcsIGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgdGhpcy51cGRhdGVVUkwoKTtcblxuICAgICAgICBpZiAodGhpcy5jaGVja0lmV2ViQ29udGVudFByb2Nlc3NIYXNDcmFzaGVkKHdlYlZpZXcsIGVycm9yKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXJsID0gZXJyb3IudXNlckluZm8ub2JqZWN0Rm9yS2V5KE5TVVJMRXJyb3JGYWlsaW5nVVJMRXJyb3JLZXkpIGFzIE5TVVJMO1xuICAgICAgICBpZiAodXJsICYmIHVybC5ob3N0ICYmIFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlVW50cnVzdGVkIHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlSGFzQmFkRGF0ZSB8fCBcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JTZXJ2ZXJDZXJ0aWZpY2F0ZUhhc1Vua25vd25Sb290IHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlTm90WWV0VmFsaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjZXJ0Q2hhaW4gPSBlcnJvci51c2VySW5mby5vYmplY3RGb3JLZXkoJ05TRXJyb3JQZWVyQ2VydGlmaWNhdGVDaGFpbktleScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlcnQgPSBjZXJ0Q2hhaW4gJiYgY2VydENoYWluWzBdO1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybShgJHtlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbn0gV291bGQgeW91IGxpa2UgdG8gY29udGludWUgYW55d2F5P2ApLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW4gPSBgJHt1cmwuaG9zdH06JHt1cmwucG9ydHx8NDQzfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICBfY2VydFN0b3JlLmFkZENlcnRpZmljYXRlKGNlcnQsIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB3ZWJWaWV3LmxvYWRSZXF1ZXN0KG5ldyBOU1VSTFJlcXVlc3Qoe1VSTDp1cmx9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKT0+e30pO1xuICAgICAgICB9XG4gICAgfVxuXG5cblx0d2ViVmlld0RpZFJlY2VpdmVBdXRoZW50aWNhdGlvbkNoYWxsZW5nZUNvbXBsZXRpb25IYW5kbGVyPyh3ZWJWaWV3OiBXS1dlYlZpZXcsIGNoYWxsZW5nZTogTlNVUkxBdXRoZW50aWNhdGlvbkNoYWxsZW5nZSwgY29tcGxldGlvbkhhbmRsZXI6IChwMTogTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLCBwMj86IE5TVVJMQ3JlZGVudGlhbCkgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgY2VydGlmaWNhdGUgY2hhbGxlbmdlLCBzZWUgaWYgdGhlIGNlcnRpZmljYXRlIGhhcyBwcmV2aW91c2x5IGJlZW5cbiAgICAgICAgLy8gYWNjZXB0ZWQgYnkgdGhlIHVzZXIuXG4gICAgICAgIGNvbnN0IG9yaWdpbiA9IGAke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UuaG9zdH06JHtjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnBvcnR9YDtcbiAgICAgICAgY29uc3QgdHJ1c3QgPSBjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnNlcnZlclRydXN0O1xuICAgICAgICBjb25zdCBjZXJ0ID0gU2VjVHJ1c3RHZXRDZXJ0aWZpY2F0ZUF0SW5kZXgodHJ1c3QsIDApO1xuICAgICAgICBpZiAoY2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5hdXRoZW50aWNhdGlvbk1ldGhvZCA9PSBOU1VSTEF1dGhlbnRpY2F0aW9uTWV0aG9kU2VydmVyVHJ1c3QgJiZcbiAgICAgICAgICAgIHRydXN0ICYmIGNlcnQgJiYgX2NlcnRTdG9yZS5jb250YWluc0NlcnRpZmljYXRlKGNlcnQsIG9yaWdpbikpIHtcbiAgICAgICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5Vc2VDcmVkZW50aWFsLCBuZXcgTlNVUkxDcmVkZW50aWFsKHRydXN0KSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5QZXJmb3JtRGVmYXVsdEhhbmRsaW5nLCB1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgT2JqQ1Byb3RvY29scyA9IFtXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyLCBXS05hdmlnYXRpb25EZWxlZ2F0ZV07XG59Il19