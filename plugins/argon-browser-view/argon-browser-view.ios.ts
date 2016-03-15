import def = require('argon-browser-view')
import page = require('ui/page')
import frames = require('ui/frame')
import uiUtils = require('ui/utils')
import Argon = require('argon')
import vuforia = require('nativescript-vuforia')

export class BrowserView implements def.BrowserView {
    
    public log:string = "";
    
    public vuforiaRealityViewController;
    
    constructor(public page:page.Page, public manager:Argon.ArgonSystem) {
        const pageViewController:UIViewController = this.page.ios;
        if (vuforia.ios) {
            this.vuforiaRealityViewController = vuforia.ios.videoViewController;
            pageViewController.addChildViewController(this.vuforiaRealityViewController);
            pageViewController.view.addSubview(this.vuforiaRealityViewController.view);
            pageViewController.view.sendSubviewToBack(this.vuforiaRealityViewController.view);
        }
        
        this.addChannel();
    }
    
    channels:ChannelViewController[] = [];
    
    _channelDidLayoutSubviews() {
        if (this.vuforiaRealityViewController) {
            this.vuforiaRealityViewController.view.setNeedsLayout();
        }
    }
    
    load(url:string) {
        this.channels[0].load(url);
    }
    
    getURL() {
        const url = this.channels[0].webview.URL;
        const urlString = url ? url.absoluteString : null;
        return urlString;
    }
    
    getTitle() {
        return this.channels[0].webview.title;
    }
    
    getProgress() {
        return this.channels[0].webview.estimatedProgress;
    }
    
    addChannel() {
        const pageViewController:UIViewController = this.page.ios;
        const childVC = ChannelViewController.initWithBrowserView(this);
        pageViewController.addChildViewController(childVC);
        pageViewController.view.addSubview(childVC.view);
        this.channels.push(childVC);
    }
    
    onNavigationStateChange() {};
}

let userAgent = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon';

export class ChannelViewController extends UIViewController implements WKScriptMessageHandler, WKNavigationDelegate {

	public webview:WKWebView;
    
    public browser:BrowserView;

	static initWithBrowserView(browser:BrowserView) {
		const channelVC = <ChannelViewController> ChannelViewController.new();
        channelVC.browser = browser;
        return channelVC;
	}
    
    private currentNavigation:WKNavigation;
    
    public load(url:string) {
        const request = NSURLRequest.requestWithURL(NSURL.URLWithString(url));
        this.currentNavigation = this.webview.loadRequest(request);
    }

	viewDidLoad() {
		super.viewDidLoad();
        
        const frame = UIApplication.sharedApplication().keyWindow.bounds;
        const configuration = WKWebViewConfiguration.alloc().init();
		this.webview = WKWebView.alloc().initWithFrameConfiguration(frame, configuration);
        this.webview.configuration.userContentController = WKUserContentController.alloc().init();
        this.webview.configuration.userContentController.addScriptMessageHandlerName(this, "argon");
        this.webview.configuration.userContentController.addScriptMessageHandlerName(this, "log");
        this.webview.navigationDelegate = this;
	    this.webview.allowsBackForwardNavigationGestures = true;
		this.webview['customUserAgent'] = userAgent;
        
        this.webview.configuration.userContentController.addUserScript(WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(`
            console.log = function(message) {
                webkit.messageHandlers.log.postMessage(message);
            }
        `, WKUserScriptInjectionTime.WKUserScriptInjectionTimeAtDocumentStart, true));

        this.webview.scrollView.layer.masksToBounds = false;
        this.webview.layer.masksToBounds = false;
        this.webview.scrollView.backgroundColor = UIColor.clearColor();
		this.webview.backgroundColor = UIColor.clearColor();
		this.webview.opaque = false;
		this.webview.autoresizingMask = UIViewAutoresizing.UIViewAutoresizingFlexibleHeight | UIViewAutoresizing.UIViewAutoresizingFlexibleWidth;

		this.view.addSubview(this.webview);
	}

	viewDidLayoutSubviews() {
		const navigationBarHeight = this.navigationController ? this.navigationController.navigationBar.frame.size.height : 0;
		const topLayoutHeight = uiUtils.ios.getStatusBarHeight() + navigationBarHeight;
        const globalFrame = CGRectMake(0,topLayoutHeight,this.view.window.frame.size.width,this.view.window.frame.size.height-topLayoutHeight);
        this.view.frame = this.view.window.convertRectToView(globalFrame, this.view.superview);;
        this.webview.frame = this.view.bounds;
        this.browser._channelDidLayoutSubviews()
	}

    viewDidUnload() {
        this.webview.configuration.userContentController.removeScriptMessageHandlerForName("argon");
    }

    public session:Argon.SessionPort = undefined;
    private sessionPort:Argon.MessagePortLike = undefined;

    webViewDidCommitNavigation(webView: WKWebView, navigation: WKNavigation) {
        if (this.session) {
            this.session.close();
            this.session = undefined;
            this.sessionPort = undefined;
        }
        this.browser.onNavigationStateChange();
    }
    
    webViewDecidePolicyForNavigationActionDecisionHandler(webview:WKWebView, navigationAction:WKNavigationAction, decisionHandler:(policy:WKNavigationActionPolicy)=>void) {
        if (navigationAction.targetFrame && navigationAction.targetFrame.mainFrame) {
            this.browser.onNavigationStateChange();
        }
        decisionHandler(WKNavigationActionPolicy.WKNavigationActionPolicyAllow);
    }
    
    webViewDecidePolicyForNavigationResponseDecisionHandler(webview:WKWebView, navigationResponse:WKNavigationResponse, decisionHandler:(policy:WKNavigationResponsePolicy)=>void) {
        if (navigationResponse.forMainFrame) {
            this.browser.onNavigationStateChange();
        }
        decisionHandler(WKNavigationResponsePolicy.WKNavigationResponsePolicyAllow);
    }

    userContentControllerDidReceiveScriptMessage(userContentController:WKUserContentController, message:WKScriptMessage) {
        if (message.name === 'argon') {
            if (typeof this.session == 'undefined') {
                console.log('Connecting to argon.js application at ' + this.webview.URL.absoluteURL);
                const messageChannel = this.browser.manager.session.createMessageChannel();
                this.session = this.browser.manager.session.addManagedSessionPort();
                this.session.open(messageChannel.port1, this.browser.manager.session.configuration);
                this.sessionPort = messageChannel.port2;
                this.sessionPort.onmessage = (msg:Argon.MessageEventLike) => {
                    const injectedMessage = "__ARGON_PORT__.postMessage("+JSON.stringify(msg.data)+")";
                    this.webview.evaluateJavaScriptCompletionHandler(injectedMessage, undefined);
                }
                if (this === this.browser.channels[0]) {
                    this.browser.manager.focus.setSession(this.session);
                }
            }
            console.log(message.body);
            this.sessionPort.postMessage(JSON.parse(message.body));
        } else if (message.name === 'log') {
            console.log('LOG: ' + message.body); 
            this.browser.log += message.body + '\n';
        }
    }

    public static ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];

}
