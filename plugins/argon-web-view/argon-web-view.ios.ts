import * as Argon from 'argon';
import {SessionConnectEventData} from 'argon-web-view';
import * as common from './argon-web-view-common';
import {View} from 'ui/core/view';
import {WebView} from 'ui/web-view';
import {Page} from 'ui/page';
import {Frame} from 'ui/frame';
import * as uiUtils from 'ui/utils';
import * as trace from 'trace';

const ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon';

const processPool = WKProcessPool.new();

export class ArgonWebView extends common.ArgonWebView  {

    private _ios:WKWebView
    private _delegate:UIWebViewDelegate
    
    private _argonDelegate:ArgonWebViewDelegate;

    constructor() {
        super();

        const configuration = WKWebViewConfiguration.alloc().init();

        // We want to replace the UIWebView created by superclass with WKWebView instance
        this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
        delete this._delegate // remove reference to UIWebView delegate created by super class
        this._argonDelegate = ArgonWebViewDelegate.initWithOwner(new WeakRef(this));
        
        configuration.processPool = processPool;
        configuration.userContentController.addScriptMessageHandlerName(this._argonDelegate, "argon");
        configuration.userContentController.addScriptMessageHandlerName(this._argonDelegate, "log");
        configuration.userContentController.addUserScript(WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(`
            var _originalLog = console.log;
            console.log = function(message) {
                webkit.messageHandlers.log.postMessage(message);
                _originalLog.apply(console, arguments);
            }
        `, WKUserScriptInjectionTime.WKUserScriptInjectionTimeAtDocumentStart, true));

	    this._ios.allowsBackForwardNavigationGestures = true;
		this._ios['customUserAgent'] = ARGON_USER_AGENT;

        // style appropriately
        this._ios.scrollView.layer.masksToBounds = false;
        this._ios.layer.masksToBounds = false;
        this._ios.scrollView.backgroundColor = UIColor.clearColor();
		this._ios.backgroundColor = UIColor.clearColor();
		this._ios.opaque = false;
    }
    
    get title() {
        return this._ios.title;
    }

    get progress() {
        return this._ios.estimatedProgress;
    }

    public evaluateJavascript(script:string) {
        return new Promise((resolve, reject)=>{
            this._ios.evaluateJavaScriptCompletionHandler(script, (result, error)=>{
                if (error) reject(error.localizedDescription);
                else resolve(result);
            })
        })
    }

    public bringToFront() {
        this._ios.superview.bringSubviewToFront(this._ios);
    }

    public onLoaded() {
        super.onLoaded();
        this._ios.navigationDelegate = this._argonDelegate;
    }

    public onUnloaded() {
        this._ios.navigationDelegate = null;
        super.onUnloaded();
    }
}

class ArgonWebViewDelegate extends NSObject implements WKScriptMessageHandler, WKNavigationDelegate {
    
    private _owner:WeakRef<ArgonWebView>;
    
    public static initWithOwner(owner:WeakRef<ArgonWebView>) {
        const delegate = <ArgonWebViewDelegate>ArgonWebViewDelegate.new()
        delegate._owner = owner;
        return delegate;
    }
    
    // WKScriptMessageHandler

    userContentControllerDidReceiveScriptMessage(userContentController:WKUserContentController, message:WKScriptMessage) {
        const owner = this._owner.get();
        if (!owner) return;
        if (message.name === 'argon') {
            owner._handleArgonMessage(message.body);
        } else if (message.name === 'log') {
            owner._handleLogMessage(message.body);
        }
    }
    
    // WKNavigationDelegate

    private _provisionalURL : string;

    webViewDecidePolicyForNavigationActionDecisionHandler(webview:WKWebView, navigationAction:WKNavigationAction, decisionHandler:(policy:WKNavigationActionPolicy)=>void) {
        if (navigationAction.targetFrame && navigationAction.targetFrame.mainFrame) {
            const navigationType:WKNavigationType = navigationAction.navigationType;
            var navTypeIndex = WebView.navigationTypes.indexOf('other');
            switch (navigationType) {
                case WKNavigationType.WKNavigationTypeLinkActivated:
                    navTypeIndex = WebView.navigationTypes.indexOf('linkClicked');
                    break;
                case WKNavigationType.WKNavigationTypeFormSubmitted:
                    navTypeIndex = WebView.navigationTypes.indexOf('formSubmitted');
                    break;
                case WKNavigationType.WKNavigationTypeBackForward:
                    navTypeIndex = WebView.navigationTypes.indexOf('backForward');
                    break;
                case WKNavigationType.WKNavigationTypeReload:
                    navTypeIndex = WebView.navigationTypes.indexOf('reload');
                    break;
                case WKNavigationType.WKNavigationTypeFormResubmitted:
                    navTypeIndex = WebView.navigationTypes.indexOf('formResubmitted');
                    break;
            }
            const owner = this._owner.get();
            if (owner) owner['_onLoadStarted'](navigationAction.request.URL.absoluteString, WebView.navigationTypes[navTypeIndex]);
        }

        trace.write("ArgonWebView.webViewDecidePolicyForNavigationActionDecisionHandler(" + navigationAction.request.URL.absoluteString + ", " + navigationAction.navigationType + ")", trace.categories.Debug);
        decisionHandler(WKNavigationActionPolicy.WKNavigationActionPolicyAllow);
    }

    webViewDecidePolicyForNavigationResponseDecisionHandler(webview:WKWebView, navigationResponse:WKNavigationResponse, decisionHandler:(policy:WKNavigationResponsePolicy)=>void) {
        if (navigationResponse.forMainFrame) {
            // const owner = this._owner.get();
            // if (owner) {
                // owner['_suspendLoading'] = true;
                // this.url = navigationResponse.response.URL.absoluteString;
                // owner['_suspendLoading'] = false;
            // }
        }
        decisionHandler(WKNavigationResponsePolicy.WKNavigationResponsePolicyAllow);
    }

    webViewDidStartProvisionalNavigation(webView: WKWebView, navigation: WKNavigation) {
        this._provisionalURL = webView.URL.absoluteString;
    }

    webViewDidFailProvisionalNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (!owner) return;
        owner['_onLoadFinished'](this._provisionalURL);
        // owner['_suspendLoading'] = true;
        // this.url = this._ios.URL.absoluteString;
        // owner['_suspendLoading'] = false;
    }

    webViewDidCommitNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (!owner) return;
        owner.log = [];
        if (owner.session) {
            owner.session.close();
        }
    }

    webViewDidFinishNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (owner) owner['_onLoadFinished'](webView.URL.absoluteString)
    }

    webViewDidFailNavigationWithError(webView: WKWebView, navigation: WKNavigation, error:NSError) {
        const owner = this._owner.get();
        if (owner) owner['_onLoadFinished'](webView.URL.absoluteString, error.localizedDescription);
    }

    public static ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
}