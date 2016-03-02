"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
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
                var messageChannel = this.browser.manager.reality.messageChannelFactory.create();
                this.session = this.browser.manager.context.addSession();
                this.session.open(messageChannel.port1, this.browser.manager.configuration);
                this.sessionPort = messageChannel.port2;
                this.sessionPort.onmessage = function (msg) {
                    var injectedMessage = "__ARGON_PORT__.postMessage(" + JSON.stringify(msg.data) + ")";
                    _this.webview.evaluateJavaScriptCompletionHandler(injectedMessage, undefined);
                };
                if (this === this.browser.channels[0]) {
                    this.session.focus();
                }
                this.webview.evaluateJavaScriptCompletionHandler("\n                ", undefined);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tYnJvd3Nlci12aWV3Lmlvcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLWJyb3dzZXItdmlldy5pb3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBR0EsSUFBTyxPQUFPLFdBQVcsVUFBVSxDQUFDLENBQUE7QUFFcEMsSUFBTyxPQUFPLFdBQVcsc0JBQXNCLENBQUMsQ0FBQTtBQUVoRDtJQU1JLHFCQUFtQixJQUFjLEVBQVMsT0FBeUI7UUFBaEQsU0FBSSxHQUFKLElBQUksQ0FBVTtRQUFTLFlBQU8sR0FBUCxPQUFPLENBQWtCO1FBSjVELFFBQUcsR0FBVSxFQUFFLENBQUM7UUFnQnZCLGFBQVEsR0FBMkIsRUFBRSxDQUFDO1FBWGxDLElBQU0sa0JBQWtCLEdBQW9CLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQzFELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2QsSUFBSSxDQUFDLDRCQUE0QixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUM7WUFDcEUsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDN0Usa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0Usa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFJRCwrQ0FBeUIsR0FBekI7UUFDSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDNUQs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