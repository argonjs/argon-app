"use strict";
var common = require('./argon-web-view-common');
var web_view_1 = require('ui/web-view');
var trace = require('trace');
var ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon';
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        _super.call(this);
        var configuration = WKWebViewConfiguration.alloc().init();
        // We want to replace the UIWebView created by superclass with WKWebView instance
        this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
        delete this._delegate; // remove reference to UIWebView delegate created by super class
        configuration.userContentController = WKUserContentController.alloc().init();
        configuration.userContentController.addScriptMessageHandlerName(this, "argon");
        configuration.userContentController.addScriptMessageHandlerName(this, "log");
        configuration.userContentController.addUserScript(WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly("\n            console.log = function(message) {\n                webkit.messageHandlers.log.postMessage(message);\n            }\n        ", WKUserScriptInjectionTime.WKUserScriptInjectionTimeAtDocumentStart, true));
        this._ios.navigationDelegate = this;
        this._ios.allowsBackForwardNavigationGestures = true;
        this._ios['customUserAgent'] = ARGON_USER_AGENT;
        // style appropriately
        this._ios.scrollView.layer.masksToBounds = false;
        this._ios.layer.masksToBounds = false;
        this._ios.scrollView.backgroundColor = UIColor.clearColor();
        this._ios.backgroundColor = UIColor.clearColor();
        this._ios.opaque = false;
    }
    Object.defineProperty(ArgonWebView.prototype, "progress", {
        get: function () {
            return this._ios.estimatedProgress;
        },
        enumerable: true,
        configurable: true
    });
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
    ArgonWebView.prototype.bringToFront = function () {
        this._ios.superview.bringSubviewToFront(this._ios);
    };
    ArgonWebView.prototype.onLoaded = function () {
        _super.prototype.onLoaded.call(this);
        this._ios.navigationDelegate = this;
    };
    ArgonWebView.prototype.onUnloaded = function () {
        this._ios.navigationDelegate = null;
        _super.prototype.onUnloaded.call(this);
    };
    ArgonWebView.prototype.webViewDecidePolicyForNavigationActionDecisionHandler = function (webview, navigationAction, decisionHandler) {
        if (navigationAction.targetFrame && navigationAction.targetFrame.mainFrame) {
            var navigationType = navigationAction.navigationType;
            var navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('other');
            switch (navigationType) {
                case WKNavigationType.WKNavigationTypeLinkActivated:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('linkClicked');
                    break;
                case WKNavigationType.WKNavigationTypeFormSubmitted:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('formSubmitted');
                    break;
                case WKNavigationType.WKNavigationTypeBackForward:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('backForward');
                    break;
                case WKNavigationType.WKNavigationTypeReload:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('reload');
                    break;
                case WKNavigationType.WKNavigationTypeFormResubmitted:
                    navTypeIndex = web_view_1.WebView.navigationTypes.indexOf('formResubmitted');
                    break;
            }
            this['_onLoadStarted'](navigationAction.request.URL.absoluteString, web_view_1.WebView.navigationTypes[navTypeIndex]);
        }
        trace.write("ArgonWebView.webViewDecidePolicyForNavigationActionDecisionHandler(" + navigationAction.request.URL.absoluteString + ", " + navigationAction.navigationType + ")", trace.categories.Debug);
        decisionHandler(WKNavigationActionPolicy.WKNavigationActionPolicyAllow);
    };
    ArgonWebView.prototype.webViewDecidePolicyForNavigationResponseDecisionHandler = function (webview, navigationResponse, decisionHandler) {
        if (navigationResponse.forMainFrame) {
            this['_suspendLoading'] = true;
            // this.url = navigationResponse.response.URL.absoluteString;
            this['_suspendLoading'] = kCFNumberFormatterAlwaysShowDecimalSeparator;
        }
        decisionHandler(WKNavigationResponsePolicy.WKNavigationResponsePolicyAllow);
    };
    ArgonWebView.prototype.webViewDidStartProvisionalNavigation = function (webView, navigation) {
        this._provisionalURL = this._ios.URL.absoluteString;
    };
    ArgonWebView.prototype.webViewDidFailProvisionalNavigation = function (webView, navigation) {
        this['_onLoadFinished'](this._provisionalURL);
        this['_suspendLoading'] = true;
        // this.url = this._ios.URL.absoluteString;
        this['_suspendLoading'] = kCFNumberFormatterAlwaysShowDecimalSeparator;
    };
    ArgonWebView.prototype.webViewDidCommitNavigation = function (webView, navigation) {
        this.log = [];
        this.session.close();
    };
    ArgonWebView.prototype.webViewDidFinishNavigation = function (webView, navigation) {
        this['_onLoadFinished'](this._ios.URL.absoluteString);
    };
    ArgonWebView.prototype.webViewDidFailNavigationWithError = function (webView, navigation, error) {
        this['_onLoadFinished'](this._ios.URL.absoluteString, error.localizedDescription);
    };
    // WKScriptMessageHandler
    ArgonWebView.prototype.userContentControllerDidReceiveScriptMessage = function (userContentController, message) {
        if (message.name === 'argon') {
            this._handleArgonMessage(message.body);
        }
        else if (message.name === 'log') {
            this._handleLogMessage(message.body);
        }
    };
    ArgonWebView.ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=argon-web-view.ios.js.map