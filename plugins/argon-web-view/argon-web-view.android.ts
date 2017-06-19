import * as common from "./argon-web-view-common";
import {LoadEventData} from "ui/web-view";
import {View} from "ui/core/view";
import dialogs = require("ui/dialogs");
//import {Color} from "color";

const AndroidWebInterface = io.argonjs.AndroidWebInterface;

export class ArgonWebView extends common.ArgonWebView {

    private currentUrl: string = "";

    /*
    private static layersById: {
        [id: string]: ArgonWebView,
    } = {};
    */

    constructor() {
        super();

        (<any>android.webkit.WebView).setWebContentsDebuggingEnabled(true);

        this.on(View.loadedEvent, () => {
            // Make transparent
            //this.backgroundColor = new Color(0, 255, 255, 255);
            //this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);

            const settings = <android.webkit.WebSettings> this.android.getSettings();
            const userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " Argon");
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);

            // Remember a particular id for each webview
            if (!this.id) {
                this.id = Date.now().toString();
            }
            //ArgonWebView.layersById[this.id] = this;

            // Create a unique class name for 'extend' to bind the object to this particular webview
            var classname = "io_argonjs_AndroidWebInterface_ArgonWebView_" + this.id;

            // Inject Javascript Interface
            this.android.addJavascriptInterface(new ((<any>AndroidWebInterface).extend(classname, {
                onArgonEvent: (id: string, event: string, data: string) => {
                    //const self = ArgonWebView.layersById[id];
                    //if (self) {
                        if (event === "argon") {
                            // just in case we thought below that the page was not an
                            // argon page, perhaps because argon.js loaded asyncronously 
                            // and the programmer didn't set up an argon meta tag
                            this._setIsArgonApp(true);
                            this._handleArgonMessage(data);
                        }
                    //}
                },
            }))(new java.lang.String(this.id)), "__argon_android__");

            // Create a unique class name for 'extend' to bind the object to this particular webview
            classname = "android_webkit_WebChromeClient_ArgonWebView_" + this.id;

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
                onGeolocationPermissionsShowPrompt: (origin: string, callback: android.webkit.GeolocationPermissions.ICallback): void => {
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
                    this.set('progress', newProgress / 100.0);
                }
            })));
        });

        this.on(ArgonWebView.loadStartedEvent, (args:LoadEventData) => {
            this._didCommitNavigation();
            this.currentUrl = args.url;
            this.set('title', this.android.getTitle());
        });

        this.on(ArgonWebView.loadFinishedEvent, (args:LoadEventData) => {
            this.evaluateJavascript("(document.head.querySelector('meta[name=argon]') !== null || typeof(Argon) !== 'undefined')", ).then((result:string) => {
                var boolResult = (result === "true");
                this._setIsArgonApp(boolResult);
            });
            if (this.android.getUrl() != this.currentUrl) {
                // the page did not successfully load
                if (this.currentUrl.startsWith("https")) {
                    // the certificate is likely invalid
                    dialogs.alert("Argon cannot currently load https pages with invalid certificates.").then(()=> {
                        // do nothing for now
                    });
                }
                this.currentUrl = this.android.getUrl();
            }
            this.set('title', this.android.getTitle());
        });
    }

    _setIsArgonApp(flag:boolean) {
        //console.log("_setIsArgonApp: " + flag);
        if (!this.isArgonApp && flag) {
            this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            this.set("isArgonApp", true);
        } else if (this.isArgonApp && !flag) {
            this.android.setBackgroundColor(android.graphics.Color.WHITE);
            this.set("isArgonApp", false);
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

    public getCurrentUrl() : string {
        // on Android, the url property isn't updated until after the page appears
        // we need it updated as soon as the load starts
        return this.currentUrl;
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
