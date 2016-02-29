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
        this.webview.navigationDelegate = this;
        this.webview.allowsBackForwardNavigationGestures = true;
        this.webview['customUserAgent'] = userAgent;
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
        }
        this.sessionPort.postMessage(JSON.parse(message.body));
        console.log(message.body);
    };
    ChannelViewController.ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
    return ChannelViewController;
}(UIViewController));
exports.ChannelViewController = ChannelViewController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tYnJvd3Nlci12aWV3Lmlvcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLWJyb3dzZXItdmlldy5pb3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBR0EsSUFBTyxPQUFPLFdBQVcsVUFBVSxDQUFDLENBQUE7QUFFcEMsSUFBTyxPQUFPLFdBQVcsc0JBQXNCLENBQUMsQ0FBQTtBQUVoRDtJQUlJLHFCQUFtQixJQUFjLEVBQVMsT0FBeUI7UUFBaEQsU0FBSSxHQUFKLElBQUksQ0FBVTtRQUFTLFlBQU8sR0FBUCxPQUFPLENBQWtCO1FBWW5FLGFBQVEsR0FBMkIsRUFBRSxDQUFDO1FBWGxDLElBQU0sa0JBQWtCLEdBQW9CLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQzFELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2QsSUFBSSxDQUFDLDRCQUE0QixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUM7WUFDcEUsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDN0Usa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0Usa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFJRCwrQ0FBeUIsR0FBekI7UUFDSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDNUQsQ0FBQztJQUNMLENBQUM7SUFFRCwwQkFBSSxHQUFKLFVBQUssR0FBVTtRQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCw0QkFBTSxHQUFOO1FBQ0ksSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3pDLElBQU0sU0FBUyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUNsRCxNQUFNLENBQUMsU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFFRCw4QkFBUSxHQUFSO1FBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUMxQyxDQUFDO0lBRUQsaUNBQVcsR0FBWDtRQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztJQUN0RCxDQUFDO0lBRUQsZ0NBQVUsR0FBVjtRQUNJLElBQU0sa0JBQWtCLEdBQW9CLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQzFELElBQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hFLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELGtCQUFrQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCw2Q0FBdUIsR0FBdkIsY0FBMkIsQ0FBQzs7SUFDaEMsa0JBQUM7QUFBRCxDQUFDLEFBbkRELElBbURDO0FBbkRZLG1CQUFXLGNBbUR2QixDQUFBO0FBRUQsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLHNDQUFzQyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsUUFBUSxDQUFDO0FBRWxIO0lBQTJDLHlDQUFnQjtJQUEzRDtRQUEyQyw4QkFBZ0I7UUFzRGhELFlBQU8sR0FBaUIsU0FBUyxDQUFDO1FBQ2pDLGdCQUFXLEdBQXlCLFNBQVMsQ0FBQztJQTZDMUQsQ0FBQztJQTlGTyx5Q0FBbUIsR0FBMUIsVUFBMkIsT0FBbUI7UUFDN0MsSUFBTSxTQUFTLEdBQTJCLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2hFLFNBQVMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxTQUFTLENBQUM7SUFDeEIsQ0FBQztJQUlTLG9DQUFJLEdBQVgsVUFBWSxHQUFVO1FBQ2xCLElBQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUosMkNBQVcsR0FBWDtRQUNDLGdCQUFLLENBQUMsV0FBVyxXQUFFLENBQUM7UUFFZCxJQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ2pFLElBQU0sYUFBYSxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xFLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLDBCQUEwQixDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsR0FBRyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMxRixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsR0FBRyxJQUFJLENBQUM7UUFDM0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUV0QyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUNwRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDckUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3BELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDLGdDQUFnQyxHQUFHLGtCQUFrQixDQUFDLCtCQUErQixDQUFDO1FBRXpJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQscURBQXFCLEdBQXJCO1FBQ0MsSUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDdEgsSUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLG1CQUFtQixDQUFDO1FBQ3pFLElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUMsZUFBZSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQUEsQ0FBQztRQUN4RixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUE7SUFDL0MsQ0FBQztJQUVFLDZDQUFhLEdBQWI7UUFDSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxpQ0FBaUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoRyxDQUFDO0lBS0QsMERBQTBCLEdBQTFCLFVBQTJCLE9BQWtCLEVBQUUsVUFBd0I7UUFDbkUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVELHFGQUFxRCxHQUFyRCxVQUFzRCxPQUFpQixFQUFFLGdCQUFtQyxFQUFFLGVBQXVEO1FBQ2pLLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN6RSxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDM0MsQ0FBQztRQUNELGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCx1RkFBdUQsR0FBdkQsVUFBd0QsT0FBaUIsRUFBRSxrQkFBdUMsRUFBRSxlQUF5RDtRQUN6SyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUMzQyxDQUFDO1FBQ0QsZUFBZSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVELDRFQUE0QyxHQUE1QyxVQUE2QyxxQkFBNkMsRUFBRSxPQUF1QjtRQUFuSCxpQkFnQkM7UUFmRyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkYsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDekQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsV0FBVyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUM7WUFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsVUFBQyxHQUEwQjtnQkFDcEQsSUFBTSxlQUFlLEdBQUcsNkJBQTZCLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDO2dCQUNuRixLQUFJLENBQUMsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNqRixDQUFDLENBQUE7WUFDRCxFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pCLENBQUM7UUFDTCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRWEsbUNBQWEsR0FBRyxDQUFDLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFFakYsNEJBQUM7QUFBRCxDQUFDLEFBcEdELENBQTJDLGdCQUFnQixHQW9HMUQ7QUFwR1ksNkJBQXFCLHdCQW9HakMsQ0FBQSJ9