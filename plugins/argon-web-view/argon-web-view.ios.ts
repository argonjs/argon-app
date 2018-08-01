import * as common from './argon-web-view-common';
import {NavigationType} from 'ui/web-view';
import * as trace from 'trace';
// import * as utils from 'utils/utils';
import * as dialogs from 'ui/dialogs';
import {WEBXR_API} from './webxr';

const ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' ArgonXR/' + common.PROTOCOL_VERSION_STRING;

const processPool = WKProcessPool.new();
                        
declare const window:any, webkit:any, document:any;

/// In-memory certificate store.
// class CertStore {
//     private keys = new Set<string>();

//     public addCertificate(cert: any, origin:string) {
//         let data: NSData = SecCertificateCopyData(cert)
//         let key = this.keyForData(data, origin);
//         this.keys.add(key);
//     }

//     public containsCertificate(cert: any, origin:string) : boolean {
//         let data: NSData = SecCertificateCopyData(cert)
//         let key = this.keyForData(data, origin)
//         return this.keys.has(key);
//     }

//     private keyForData(data: NSData, origin:string) {
//         return `${origin}/${data.hash}`;
//     }
// }

// const _certStore = new CertStore();

export class ArgonWebView extends common.ArgonWebView  {

    private _ios:WKWebView
    private _delegate:UIWebViewDelegate
    
    private _argonDelegate:ArgonWebViewDelegate;

    constructor() {
        super()
        
        const configuration = WKWebViewConfiguration.alloc().init();
        
        configuration.allowsInlineMediaPlayback = true;
        configuration.allowsAirPlayForMediaPlayback = true;
        configuration.allowsPictureInPictureMediaPlayback = true;
        configuration.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypes.None;
        configuration.processPool = processPool;
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
                    if (event.persisted) { window.location.reload(false); return }
                    if (document.head.querySelector('meta[name=argon]') !== null || typeof(window['Argon']) !== 'undefined') {    
                        webkit.messageHandlers.argoncheck.postMessage("true");
                    } else {
                        webkit.messageHandlers.argoncheck.postMessage("false");
                    }
                }
                document.addEventListener("DOMContentLoaded", _sendArgonCheck);
                window.addEventListener("pageshow", _sendArgonCheck);
                function inspect(o, depth) : string {
                    if (o === null) return "null";
                    if (o === undefined) return "undefined";
                    if (o instanceof Error) return o.message + '\n' + o.stack;
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

                window['ARGON_BROWSER'] = {
                    xr: true,
                    postMessage(message:string) {
                        webkit.messageHandlers.argon(message);
                    },
                    onmessage: null
                }
            }.toString()
        }());
        ${WEBXR_API}
        `, WKUserScriptInjectionTime.AtDocumentStart, true));

        // We want to replace the UIWebView created by superclass with WKWebView instance
        const webView = this.nativeView = this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
        delete this._delegate // remove reference to UIWebView delegate created by super class
        const delegate = this._argonDelegate = ArgonWebViewDelegate.initWithOwner(new WeakRef(this));
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argon");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argoncheck");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "log");
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true;

	    webView.allowsBackForwardNavigationGestures = true;
        webView.customUserAgent = ARGON_USER_AGENT;
        webView.contentMode = UIViewContentMode.ScaleAspectFill

        // style appropriately
        webView.scrollView.layer.masksToBounds = false;
        webView.layer.masksToBounds = false;
    }
    
    public _argonPages = {};
    public _setIsArgonPage(flag:boolean, url:string) {
        // if (flag) this._argonPages[url] = true;
        // if (!this.isArgonPage && flag) {
        //     this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
        //     this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
        //     this._ios.opaque = false;     
        //     common.isArgonPageProperty.nativeValueChange(this, true);   
        //     // this.set("isArgonPage", true);
        // } else if (this.isArgonPage && !flag) {
        //     this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
        //     this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
        //     this._ios.opaque = true;        
        //     // this.set("isArgonPage", false);
        //     common.isArgonPageProperty.nativeValueChange(this, false);
        // }
    }

    public evaluateJavascript(script:string) {
        return new Promise((resolve, reject)=>{
            this._ios.evaluateJavaScriptCompletionHandler(script, (result, error)=>{
                if (error) reject(error.localizedDescription);
                else resolve(result);
            })
        })
    }

    public evaluateJavascriptWithoutPromise(script:string) : void {
        this._ios.evaluateJavaScriptCompletionHandler(script, <any>null)
    }

    public bringToFront() {
        this._ios.superview.bringSubviewToFront(this._ios);
    }

    public onLoaded() {
        super.onLoaded();
        this._ios.navigationDelegate = this._argonDelegate;
    }

    public onUnloaded() {
        this._ios.navigationDelegate = <any>undefined;
        super.onUnloaded();
    }

    reload() {
        this._ios.reloadFromOrigin();
    }
}

class ArgonWebViewDelegate extends NSObject implements WKScriptMessageHandler, WKNavigationDelegate {
    
    private _owner:WeakRef<ArgonWebView>;
    
    public static initWithOwner(owner:WeakRef<ArgonWebView>) {
        const delegate = <ArgonWebViewDelegate>ArgonWebViewDelegate.new()
        delegate._owner = owner;
        
        const webview = <WKWebView>owner.get().ios;
        webview.addObserverForKeyPathOptionsContext(delegate, "title", 0, <any>null);
        webview.addObserverForKeyPathOptionsContext(delegate, "URL", 0, <any>null);
        webview.addObserverForKeyPathOptionsContext(delegate, "estimatedProgress", 0, <any>null);
        
        return delegate;
    }

    dealloc() {
        const owner = this._owner.get();
        const webview = <WKWebView> (owner && owner.ios);
        webview.removeObserverForKeyPath(this, "title");
        webview.removeObserverForKeyPath(this, "URL");
        webview.removeObserverForKeyPath(this, "estimatedProgress");
    }

    observeValueForKeyPathOfObjectChangeContext(keyPath:string, object:any, change:any, context:any) {
        const owner = this._owner.get();
        if (!owner) return;        
        
        const wkWebView = <WKWebView>owner.ios;

        switch (keyPath) {

            case "title": 
            common.titleProperty.nativeValueChange(owner, wkWebView.title);
            break;

            case "URL": 
            common.urlProperty.nativeValueChange(owner, wkWebView.URL && wkWebView.URL.absoluteString);
            break;

            case "estimatedProgress":
            common.progressProperty.nativeValueChange(owner, wkWebView.estimatedProgress);
            break;
        }
    }

    // private updateURL() {
    //     const owner = this._owner.get();
    //     if (!owner) return;     
    //     const wkWebView = <WKWebView>owner.ios;
    //     owner.set("url", wkWebView.URL && wkWebView.URL.absoluteString);
    // }
    
    // WKScriptMessageHandler

    userContentControllerDidReceiveScriptMessage(userContentController:WKUserContentController, message:WKScriptMessage) {
        const owner = this._owner.get();
        if (!owner) return;
        // const url = message.frameInfo.request.URL.absoluteString;
        if (message.name === 'argon') {
            // if (!owner.session) {  
            //     // just in case we thought below that the page was not an
            //     // argon page, perhaps because argon.js loaded asyncronously 
            //     // and the programmer didn't set up an argon meta tag
            //     owner._setIsArgonPage(true, url);
            // }
            owner._handleArgonMessage(message.body);
        } else if (message.name === 'log') {
            owner._handleLogMessage(message.body);
        } else if (message.name === 'argoncheck') {
            // if (!owner.session) {
            //     if (message.body === "true") {
            //         owner._setIsArgonPage(true, url);
            //     } else {
            //         owner._setIsArgonPage(false, url);
            //     }
            // }
        }
    }
    
    // WKNavigationDelegate

    private _provisionalURL : string;

    webViewDecidePolicyForNavigationActionDecisionHandler(webview:WKWebView, navigationAction:WKNavigationAction, decisionHandler:(policy:WKNavigationActionPolicy)=>void) {
        if (navigationAction.targetFrame && navigationAction.targetFrame.mainFrame) {
            const navigationType:WKNavigationType = navigationAction.navigationType;
            var navType:NavigationType = 'other';
            switch (navigationType) {
                case WKNavigationType.LinkActivated:
                    navType = 'linkClicked';
                    break;
                case WKNavigationType.FormSubmitted:
                    navType = 'formSubmitted';
                    break;
                case WKNavigationType.BackForward:
                    navType = 'backForward';
                    break;
                case WKNavigationType.Reload:
                    navType = 'reload';
                    break;
                case WKNavigationType.FormResubmitted:
                    navType = 'formResubmitted';
                    break;
            }
            
            const owner = this._owner.get();
            if (owner) {
                const url = navigationAction.request.URL.absoluteString;
                if (!owner._argonPages[url]) owner._setIsArgonPage(false, url);
                owner['_onLoadStarted'](url, navType);
            }
        }

        trace.write("ArgonWebView.webViewDecidePolicyForNavigationActionDecisionHandler(" + navigationAction.request.URL.absoluteString + ", " + navigationAction.navigationType + ")", trace.categories.Debug);
        decisionHandler(WKNavigationActionPolicy.Allow);
    }

    webViewDecidePolicyForNavigationResponseDecisionHandler(webview:WKWebView, navigationResponse:WKNavigationResponse, decisionHandler:(policy:WKNavigationResponsePolicy)=>void) {
        decisionHandler(WKNavigationResponsePolicy.Allow);
    }

    webViewDidStartProvisionalNavigation(webView: WKWebView, navigation: WKNavigation) {
        this._provisionalURL = webView.URL && webView.URL.absoluteString;
    }

    webViewDidCommitNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (!owner) return;
        owner._didCommitNavigation();
        // this.updateURL();
    }

    webViewDidFailProvisionalNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (!owner) return;
        owner['_onLoadFinished'](this._provisionalURL, "Provisional navigation failed");
        // this.updateURL();
    }

    webViewDidFinishNavigation(webView: WKWebView, navigation: WKNavigation) {
        const owner = this._owner.get();
        if (owner) owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString);
        // this.updateURL();
    }

    webViewDidFailNavigationWithError(webView: WKWebView, navigation: WKNavigation, error:NSError) {
        const owner = this._owner.get();
        if (owner) owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString, error.localizedDescription);
        // this.updateURL();
    }

    private checkIfWebContentProcessHasCrashed(webView: WKWebView, error: NSError) : boolean {
        if (error.code == WKErrorCode.WebContentProcessTerminated && error.domain == "WebKitErrorDomain") {
            webView.reloadFromOrigin()
            return true
        }
        return false
    }

    webViewDidFailProvisionalNavigationWithError(webView: WKWebView, navigation: WKNavigation, error: NSError) {
        const owner = this._owner.get();
        if (owner) owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString, error.localizedDescription);
        // this.updateURL();

        if (this.checkIfWebContentProcessHasCrashed(webView, error)) {
            return;
        }

        const url = error.userInfo.objectForKey(NSURLErrorFailingURLErrorKey) as NSURL;
        if (url && url.host && 
            error.code === NSURLErrorServerCertificateUntrusted || 
            error.code === NSURLErrorServerCertificateHasBadDate || 
            error.code === NSURLErrorServerCertificateHasUnknownRoot || 
            error.code === NSURLErrorServerCertificateNotYetValid) {
                // const certChain = error.userInfo.objectForKey('NSErrorPeerCertificateChainKey');
                // const cert = certChain && certChain[0];
                // dialogs.confirm(`${error.localizedDescription} Would you like to continue anyway?`).then(function (result) {
                //     if (result) {
                //         const origin = `${url.host}:${url.port||443}`;
                //         _certStore.addCertificate(cert, origin);
                //         webView.loadRequest(new NSURLRequest({URL:url}));
                //     }
                // }).catch(()=>{});

                dialogs.alert(error.localizedDescription + " A bug in Argon prevents us from continuing. Please use a site with a valid certificate.  We will fix this soon.");
        } else if (url && url.host &&
            error.code === NSURLErrorCannotFindHost ||
            error.code === NSURLErrorCannotConnectToHost) {
                dialogs.alert(error.localizedDescription);
        } else if (url && url.host &&
            error.code === NSURLErrorTimedOut
            //|| error.code === NSURLErrorCancelled
            ) {
                dialogs.alert(error.localizedDescription);
        }
    }

    webViewWebContentProcessDidTerminate(webView:WKWebView) {
        const owner = this._owner.get();
        if (owner) owner.reload();
    }

    // comment out until https://github.com/NativeScript/ios-runtime/issues/742 is fixed
	// webViewDidReceiveAuthenticationChallengeCompletionHandler(webView: WKWebView, challenge: NSURLAuthenticationChallenge, completionHandler: (p1: NSURLSessionAuthChallengeDisposition, p2?: NSURLCredential) => void): void {
    //     // If this is a certificate challenge, see if the certificate has previously been
    //     // accepted by the user.
    //     const origin = `${challenge.protectionSpace.host}:${challenge.protectionSpace.port}`;
    //     const trust = challenge.protectionSpace.serverTrust;
    //     const cert = SecTrustGetCertificateAtIndex(trust, 0);
    //     if (challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust &&
    //         trust && cert && _certStore.containsCertificate(cert, origin)) {
    //         completionHandler(NSURLSessionAuthChallengeDisposition.UseCredential, new NSURLCredential(trust))
    //         return;
    //     }

    //     completionHandler(NSURLSessionAuthChallengeDisposition.PerformDefaultHandling, undefined);
    // }

    public static ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
}