import * as Argon from '@argonjs/argon';
import * as common from './argon-web-view-common';
import {WebView} from 'ui/web-view';
import * as trace from 'trace';

const ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon';

const processPool = WKProcessPool.new();
                        
declare const window:any, webkit:any, document:any;

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
        configuration.userContentController.addScriptMessageHandlerName(this._argonDelegate, "argoncheck");
        configuration.userContentController.addScriptMessageHandlerName(this._argonDelegate, "log");
        configuration.userContentController.addUserScript(WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(`(${
            function() {
                var _originalLog = console.log;
                console.log = function() {
                    webkit.messageHandlers.log.postMessage(JSON.stringify({type:'log',message:inspectEach(arguments)}));
                    _originalLog.apply(console, arguments);
                };
                var _originalWarn = console.warn;
                console.warn = function() {
                    webkit.messageHandlers.log.postMessage(JSON.stringify({type:'warn',message:inspectEach(arguments)}));
                    _originalWarn.apply(console, arguments);
                };
                var _originalError = console.error;
                console.error = function() {
                    webkit.messageHandlers.log.postMessage(JSON.stringify({type:'error',message:inspectEach(arguments)}));
                    _originalError.apply(console, arguments);
                };
                window.addEventListener('error', function(e) {
                    console.error('Unhandled Error: ' + e.message + ' (' + e.source + ':' + e.lineno + ')');
                }, false);
                function _sendArgonCheck(event) {
                    if (document.head.querySelector('meta[name=argon]') !== null || typeof(Argon) !== 'undefined') {
                        if (event.persisted) window.location.reload(false);
                        else webkit.messageHandlers.argoncheck.postMessage("true");
                    } else {
                        webkit.messageHandlers.argoncheck.postMessage("false");
                    }
                }
                document.addEventListener("DOMContentLoaded", _sendArgonCheck);
                window.addEventListener("pageshow", _sendArgonCheck);
                function inspect(o, depth) : string {
                    if (o === null) return "null";
                    if (o === undefined) return "undefined";
                    if (typeof o === 'number' || o instanceof Number) return (o).toString();
                    if (typeof o === 'string' || o instanceof String) return <string> o;
                    if (Array.isArray(o)) return "Array["+ o.length +"]";
                    if (o instanceof Date) return o.toString();
                    return depth > 0 ? `${className(o)} {${
                            Object.keys(o).map((key)=>{
                                return '\n    ' + key + ': ' + inspect(o, depth-1);
                            }).join() + Object.getPrototypeOf(o) ? 
                                '\n    __proto__: ' + className(Object.getPrototypeOf(o)) : ""
                        }\n}` : className(o);
                }
                function inspectEach(args:IArguments) : string {
                    var argsArray = [].slice.call(args);
                    return argsArray.map((arg)=>inspect(arg,1)).join(' ');
                }
                function className(o) {
                    let name = Object.prototype.toString.call(o).slice(8,-1);
                    if (name === 'Object') name = o.constructor.name;
                    return name;
                }
            }.toString()
        }())`, WKUserScriptInjectionTime.WKUserScriptInjectionTimeAtDocumentStart, true));

	    this._ios.allowsBackForwardNavigationGestures = true;
		this._ios['customUserAgent'] = ARGON_USER_AGENT;

        // style appropriately
        this._ios.scrollView.layer.masksToBounds = false;
        this._ios.layer.masksToBounds = false;
    }
    
    public _setIsArgonApp(flag:boolean) {
        if (!this.isArgonApp && flag) {
            this._ios.scrollView.backgroundColor = UIColor.clearColor();
            this._ios.backgroundColor = UIColor.clearColor();
            this._ios.opaque = false;        
            this.set("isArgonApp", true);
        } else if (this.isArgonApp && !flag) {
            this._ios.scrollView.backgroundColor = UIColor.whiteColor();
            this._ios.backgroundColor = UIColor.whiteColor();
            this._ios.opaque = true;        
            this.set("isArgonApp", false);
        }
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
            if (!owner.session) {
                // just in case we thought below that the page was not an
                // argon page, perhaps because argon.js loaded asyncronously 
                // and the programmer didn't set up an argon meta tag
                owner._setIsArgonApp(true);
            }
            owner._handleArgonMessage(message.body);
        } else if (message.name === 'log') {
            owner._handleLogMessage(message.body);
        } else if (message.name === 'argoncheck') {
            if (!owner.session) {
                if (message.body === "true") {
                    owner._setIsArgonApp(true);
                } else {
                    owner._setIsArgonApp(false);
                }
            }
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
        decisionHandler(WKNavigationResponsePolicy.WKNavigationResponsePolicyAllow);
    }

    webViewDidStartProvisionalNavigation(webView: WKWebView, navigation: WKNavigation) {
        this._provisionalURL = webView.URL.absoluteString;
        const owner = this._owner.get();
        if (!owner) return;
        owner.set('progress', webView.estimatedProgress);
    }

    webViewDidFailProvisionalNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (!owner) return;
        owner['_onLoadFinished'](this._provisionalURL, "Provisional navigation failed");
        owner['_suspendLoading'] = true;
        owner.url = webView.URL.absoluteString;
        owner['_suspendLoading'] = false;
        owner.set('title', webView.title);
        owner.set('progress', webView.estimatedProgress);
    }

    webViewDidCommitNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (!owner) return;
        owner._didCommitNavigation();
        owner['_suspendLoading'] = true;
        owner.url = webView.URL.absoluteString;
        owner['_suspendLoading'] = false;
        owner.set('title', webView.title);
        owner.set('progress', webView.estimatedProgress);
    }

    webViewDidFinishNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (owner) owner['_onLoadFinished'](webView.URL.absoluteString)
        owner.set('title', webView.title);
        owner.set('progress', webView.estimatedProgress);
    }

    webViewDidFailNavigationWithError(webView: WKWebView, navigation: WKNavigation, error:NSError) {
        const owner = this._owner.get();
        if (owner) owner['_onLoadFinished'](webView.URL.absoluteString, error.localizedDescription);
        owner.set('title', webView.title);
        owner.set('progress', webView.estimatedProgress);
    }

    public static ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
}