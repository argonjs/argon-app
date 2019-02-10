import * as common from "./argon-web-view-common";
import {LoadEventData} from "ui/web-view";
import {View} from "ui/core/view";
import dialogs = require("ui/dialogs");
import {WEBXR_API} from './webxr';
//import {Color} from "color";

console.log(io.argonjs)

class ArgonWebInterface extends io.argonjs.ArgonWebInterface {
    constructor(public callback:(event:string, data:string)=>void) {
        super();
        return global.__native(this);
    }
    onArgonEvent(event:string, data:string) {
        this.callback(event, data);
    }
}

// webkit cookie manager handles cookeis for android webviews
const webkitCookieManager = android.webkit.CookieManager.getInstance();

// set a default cookie handler for http requests
// (nativescript currently sets a default CookieHandler
// after a request is made, but this might change)
java.net.CookieHandler.setDefault(new java.net.CookieManager);

export class ArgonWebView extends common.ArgonWebView {

    private static _count:number = 1;
    private _instanceId:string = ++ArgonWebView._count + "";

    constructor() {
        super()

        ;(<any>android.webkit.WebView).setWebContentsDebuggingEnabled(true);

        this.on(View.loadedEvent, () => {
            // Make transparent
            //this.backgroundColor = new Color(0, 255, 255, 255);
            //this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);

            const webView = <android.webkit.WebView>this.android;
            const settings = webView.getSettings();
            const userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " ArgonXR/" + common.PROTOCOL_VERSION_STRING);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);

            webView.addJavascriptInterface(new ArgonWebInterface((event, data)=>{
                if (event === "argon") {
                    // just in case we thought below that the page was not an
                    // argon page, perhaps because argon.js loaded asyncronously 
                    // and the programmer didn't set up an argon meta tag
                    // this._setIsArgonPage(true);
                    this._handleArgonMessage(data);
                }
            }), "__argon_android__");

            // Create a unique class name for 'extend' to bind the object to this particular webview
            var classname = "android_webkit_WebChromeClient_ArgonWebView_" + this._instanceId;

            // Extend WebChromeClient to capture log output
            this.android.setWebChromeClient(new ((<any>android.webkit.WebChromeClient).extend(classname, {
                onConsoleMessage: (consoleMessage: android.webkit.ConsoleMessage): boolean => {
                    var level = 'log';
                    if (consoleMessage.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.WARNING) {
                        level = 'warn';
                    } else if (consoleMessage.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR) {
                        level = 'error';
                    }
                    let data = JSON.stringify({type:level, message:consoleMessage.message()});
                    this._handleLogMessage(data);
                    return false;
                },
                onGeolocationPermissionsShowPrompt: (origin: string, callback: android.webkit.GeolocationPermissions.Callback): void => {
                    dialogs.confirm({
                        message: origin + " wants to use your device's location.",
                        okButtonText: "OK",
                        cancelButtonText: "Don't Allow"
                    }).then(function(result) {
                        if (result) {
                            callback.invoke(origin, true, false); // grant geolocation permission
                        } else {
                            callback.invoke(origin, false, false); // deny geolocation permission
                        }
                    });
                },
                onProgressChanged: (view: android.webkit.WebView, newProgress: number): void => {
                    common.progressProperty.nativeValueChange(this, newProgress / 100);
                }
            })));

            classname = "android_webkit_WebViewClient_ArgonWebView_" + this._instanceId;
            this.android.setWebViewClient(new ((<any>android.webkit.WebViewClient).extend(classname, {
                shouldOverrideUrlLoading: (webView:android.webkit.WebView, urlOrResponse:string|any) => {
                    const url = typeof urlOrResponse === 'string' ? urlOrResponse : urlOrResponse.getUrl().toString();

                    console.log("Loading url" + url);
                    this._loadUrlWithInjectedScript(url);
                    return true;
                }
            })));
        });

        this.on(ArgonWebView.loadStartedEvent, (args:LoadEventData) => {
            this._didCommitNavigation();
            common.titleProperty.nativeValueChange(this, args.url);
            common.titleProperty.nativeValueChange(this, this.android.getTitle());
        });

        this.on(ArgonWebView.loadFinishedEvent, (args:LoadEventData) => {
            this.evaluateJavascript("(document.head.querySelector('meta[name=argon]') !== null || typeof(Argon) !== 'undefined')", ).then((result:string) => {
                var boolResult = (result === "true");
                this._setIsArgonPage(boolResult);
            });

            const webview = (this.android as android.webkit.WebView);
            const url = webview.getUrl();
            common.urlProperty.nativeValueChange(this, url);
            common.titleProperty.nativeValueChange(this, webview.getTitle());

            if (args.error) {
                // the page did not successfully load
                // if (url.startsWith("https")) {
                //     // the certificate is likely invalid
                //     dialogs.alert("Argon cannot currently load https pages with invalid certificates.").then(()=> {
                //         // do nothing for now
                //     });
                // }

                dialogs.alert(args.error);
            }
        });
    }

    private _loadingPromise?:Promise<void>;

    private _loadUrlWithInjectedScript(url:string) {
        const webView = <android.webkit.WebView>this.android;
        const cookieManager = <java.net.CookieManager>java.net.CookieHandler.getDefault();
        const cookieStore = cookieManager.getCookieStore();

        console.log('url' + url);

        const cookieList = webkitCookieManager.getCookie(url);

        const uri = new java.net.URI(url);

        if (cookieList) {
            const cookieArray = cookieList.split(';');
            for (const cookie of cookieArray) {
                const cookieKeyValue = cookie.split('=');
                cookieStore.add(uri, new java.net.HttpCookie(cookieKeyValue[0], cookieKeyValue[1]));
            }
        } else {
            const cookies = cookieStore.get(uri);
            const numCookies = cookies.size();
            for (let i=0; i < numCookies; i++) {
                const cookie = cookies.get(i);
                cookieStore.remove(uri, cookie);
            }
        }
        
        const loading = this._loadingPromise = fetch(url, {method: 'get'}).then((data)=>{
            return data.text() 
        }).then((text)=>{
            if (loading === this._loadingPromise) {
                // const $ = cheerio.load(text);
                // $('*').first().before(`<script>(${function() {
                //     window['ARGON_BROWSER'] = {
                //         postMessage(message:string) {
                //             window['__argon_android__'].emit('argon', message);
                //         },
                //         onmessage: null
                //     }
                // }.toString()}());
                // ARGON_BROWSER.version = ${Argon.version};
                // (${WEBXR_API}());</script>`);
                // webView.loadDataWithBaseURL(
                //     url,
                //     $.html(),
                //     'text/html',
                //     'utf8',
                //     url
                // );

                var injectedScript = `<script>(${function() {
                    window['ARGON_BROWSER'] = {
                        xr: true,
                        postMessage(message:string) {
                            window['__argon_android__'].emit('argon', message);
                        },
                        onmessage: null
                    }
                }.toString()}());
                (${WEBXR_API}());</script>`;

                webView.loadDataWithBaseURL(
                    url,
                    injectedScript + text,
                    'text/html',
                    'utf8',
                    url
                );
            }
        });
    }

    _setIsArgonPage(flag:boolean) {
        //console.log("_setIsArgonApp: " + flag);
        if (!this.isArgonPage && flag) {
            this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            // common.isArgonPageProperty.nativeValueChange(this, true);
        } else if (this.isArgonPage && !flag) {
            this.android.setBackgroundColor(android.graphics.Color.WHITE);
            // common.isArgonPageProperty.nativeValueChange(this, false);
        }
    }

    evaluateJavascript(script: string) {
        return new Promise((resolve, reject) => {
            this.android.evaluateJavascript(script, new android.webkit.ValueCallback({
                onReceiveValue: (value: any) => {
                    resolve(value);
                },
            }));
        });
    }

    evaluateJavascriptWithoutPromise(script:string) {
        this.android.evaluateJavascript(script, null);
    }

    bringToFront() {
        this.android.bringToFront();
    }

    getWebViewVersion() : number {
        const settings = <android.webkit.WebSettings> this.android.getSettings();
        const userAgent = settings.getUserAgentString();
        const regex = /Chrome\/([0-9]+)/i;
        var match = regex.exec(userAgent);
        if (match != null && match.length > 1){
            return Number(match[1]);
        }
        return -1;
    }
}
