"use strict";
var uiUtils = require('ui/utils');
var vuforia = require('nativescript-vuforia');
var BrowserView = (function () {
    function BrowserView(page, manager) {
        this.page = page;
        this.manager = manager;
        this.log = "";
        this.channels = [];
        var pageViewController = this.page.ios;
        if (vuforia.ios) {
            this.vuforiaRealityViewController = vuforia.ios.videoViewController;
            pageViewController.addChildViewController(this.vuforiaRealityViewController);
            pageViewController.view.addSubview(this.vuforiaRealityViewController.view);
            pageViewController.view.sendSubviewToBack(this.vuforiaRealityViewController.view);
        }
        this.addChannel();
    }
    BrowserView.prototype._channelDidLayoutSubviews = function () {
        if (this.vuforiaRealityViewController) {
            this.vuforiaRealityViewController.view.setNeedsLayout();
        }
    };
    BrowserView.prototype.load = function (url) {
        this.channels[0].load(url);
    };
    BrowserView.prototype.getURL = function () {
        var url = this.channels[0].webview.URL;
        var urlString = url ? url.absoluteString : null;
        return urlString;
    };
    BrowserView.prototype.getTitle = function () {
        return this.channels[0].webview.title;
    };
    BrowserView.prototype.getProgress = function () {
        return this.channels[0].webview.estimatedProgress;
    };
    BrowserView.prototype.addChannel = function () {
        var pageViewController = this.page.ios;
        var childVC = ChannelViewController.initWithBrowserView(this);
        pageViewController.addChildViewController(childVC);
        pageViewController.view.addSubview(childVC.view);
        this.channels.push(childVC);
    };
    BrowserView.prototype.onNavigationStateChange = function () { };
    ;
    return BrowserView;
}());
exports.BrowserView = BrowserView;
var userAgent = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon';
var ChannelViewController = (function (_super) {
    __extends(ChannelViewController, _super);
    function ChannelViewController() {
        _super.apply(this, arguments);
        this.session = undefined;
        this.sessionPort = undefined;
    }
    ChannelViewController.initWithBrowserView = function (browser) {
        var channelVC = ChannelViewController.new();
        channelVC.browser = browser;
        return channelVC;
    };
    ChannelViewController.prototype.load = function (url) {
        var request = NSURLRequest.requestWithURL(NSURL.URLWithString(url));
        this.currentNavigation = this.webview.loadRequest(request);
    };
    ChannelViewController.prototype.viewDidLoad = function () {
        _super.prototype.viewDidLoad.call(this);
        var frame = UIApplication.sharedApplication().keyWindow.bounds;
        var configuration = WKWebViewConfiguration.alloc().init();
        this.webview = WKWebView.alloc().initWithFrameConfiguration(frame, configuration);
        this.webview.configuration.userContentController = WKUserContentController.alloc().init();
        this.webview.configuration.userContentController.addScriptMessageHandlerName(this, "argon");
        this.webview.configuration.userContentController.addScriptMessageHandlerName(this, "log");
        this.webview.navigationDelegate = this;
        this.webview.allowsBackForwardNavigationGestures = true;
        this.webview['customUserAgent'] = userAgent;
        this.webview.configuration.userContentController.addUserScript(WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly("\n            console.log = function(message) {\n                webkit.messageHandlers.log.postMessage(message);\n            }\n        ", WKUserScriptInjectionTime.WKUserScriptInjectionTimeAtDocumentStart, true));
        this.webview.scrollView.layer.masksToBounds = false;
        this.webview.layer.masksToBounds = false;
        this.webview.scrollView.backgroundColor = UIColor.clearColor();
        this.webview.backgroundColor = UIColor.clearColor();
        this.webview.opaque = false;
        this.webview.autoresizingMask = UIViewAutoresizing.UIViewAutoresizingFlexibleHeight | UIViewAutoresizing.UIViewAutoresizingFlexibleWidth;
        this.view.addSubview(this.webview);
    };
    ChannelViewController.prototype.viewDidLayoutSubviews = function () {
        var navigationBarHeight = this.navigationController ? this.navigationController.navigationBar.frame.size.height : 0;
        var topLayoutHeight = uiUtils.ios.getStatusBarHeight() + navigationBarHeight;
        var globalFrame = CGRectMake(0, topLayoutHeight, this.view.window.frame.size.width, this.view.window.frame.size.height - topLayoutHeight);
        this.view.frame = this.view.window.convertRectToView(globalFrame, this.view.superview);
        ;
        this.webview.frame = this.view.bounds;
        this.browser._channelDidLayoutSubviews();
    };
    ChannelViewController.prototype.viewDidUnload = function () {
        this.webview.configuration.userContentController.removeScriptMessageHandlerForName("argon");
    };
    ChannelViewController.prototype.webViewDidCommitNavigation = function (webView, navigation) {
        if (this.session) {
            this.session.close();
            this.session = undefined;
            this.sessionPort = undefined;
        }
        this.browser.onNavigationStateChange();
    };
    ChannelViewController.prototype.webViewDecidePolicyForNavigationActionDecisionHandler = function (webview, navigationAction, decisionHandler) {
        if (navigationAction.targetFrame && navigationAction.targetFrame.mainFrame) {
            this.browser.onNavigationStateChange();
        }
        decisionHandler(WKNavigationActionPolicy.WKNavigationActionPolicyAllow);
    };
    ChannelViewController.prototype.webViewDecidePolicyForNavigationResponseDecisionHandler = function (webview, navigationResponse, decisionHandler) {
        if (navigationResponse.forMainFrame) {
            this.browser.onNavigationStateChange();
        }
        decisionHandler(WKNavigationResponsePolicy.WKNavigationResponsePolicyAllow);
    };
    ChannelViewController.prototype.userContentControllerDidReceiveScriptMessage = function (userContentController, message) {
        var _this = this;
        if (message.name === 'argon') {
            if (typeof this.session == 'undefined') {
                console.log('Connecting to argon.js application at ' + this.webview.URL.absoluteURL);
                var messageChannel = this.browser.manager.session.createMessageChannel();
                this.session = this.browser.manager.session.addManagedSessionPort();
                this.session.open(messageChannel.port1, this.browser.manager.session.configuration);
                this.sessionPort = messageChannel.port2;
                this.sessionPort.onmessage = function (msg) {
                    var injectedMessage = "__ARGON_PORT__.postMessage(" + JSON.stringify(msg.data) + ")";
                    _this.webview.evaluateJavaScriptCompletionHandler(injectedMessage, undefined);
                };
                if (this === this.browser.channels[0]) {
                    this.browser.manager.focus.setSession(this.session);
                }
            }
            console.log(message.body);
            this.sessionPort.postMessage(JSON.parse(message.body));
        }
        else if (message.name === 'log') {
            console.log('LOG: ' + message.body);
            this.browser.log += message.body + '\n';
        }
    };
    ChannelViewController.ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
    return ChannelViewController;
}(UIViewController));
exports.ChannelViewController = ChannelViewController;
//# sourceMappingURL=argon-browser-view.ios.js.map