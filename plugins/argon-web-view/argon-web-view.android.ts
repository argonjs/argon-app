import * as common from "./argon-web-view-common";
import * as page from "ui/page";
import * as Argon from "@argonjs/argon";
import {LoadEventData} from "ui/web-view";
import {View} from "ui/core/view";
import {Color} from "color";

const AndroidWebInterface = io.argonjs.AndroidWebInterface;

declare const window : any;

export class ArgonWebView extends common.ArgonWebView {

    private currentUrl: string = "";

    private static layersById: {
        [id: string]: ArgonWebView,
    } = {};

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
            ArgonWebView.layersById[this.id] = this;

            // Inject Javascript Interface
            this.android.addJavascriptInterface(new (AndroidWebInterface.extend({
                onArgonEvent: (id: string, event: string, data: string) => {
                    const self = ArgonWebView.layersById[id];
                    if (self) {
                        if (event === "argon") {
                            // just in case we thought below that the page was not an
                            // argon page, perhaps because argon.js loaded asyncronously 
                            // and the programmer didn't set up an argon meta tag
                            self._setIsArgonApp(true);
                            self._handleArgonMessage(data);
                        } else if (event === "log") {
                            self._handleLogMessage(data);
                        }
                    }
                },
            }))(new java.lang.String(this.id)), "__argon_android__");
        });

        this.on(ArgonWebView.loadStartedEvent, (args:LoadEventData) => {
            this._didCommitNavigation();
            this.currentUrl = args.url;
            this.set('title', this.android.getTitle());
            //this.set('progress', this.android.getProgress());

            // Hook into the logging
            const injectLoggers = () => {
                const logger = window.console.log;
                window.console.log = function () {
                    if (window["__argon_android__"]) {
                        window["__argon_android__"].emit("log", JSON.stringify({type:'log', args:[].slice.call(arguments)}));
                    }
                    logger.apply(window.console, arguments);
                };
                const warnLogger = window.console.warn;
                window.console.warn = function () {
                    if (window["__argon_android__"]) {
                        window["__argon_android__"].emit("log", JSON.stringify({type:'warn', args:[].slice.call(arguments)}));
                    }
                    warnLogger.apply(window.console, arguments);
                };
                const errorLogger = window.console.error;
                window.console.error = function () {
                    if (window["__argon_android__"]) {
                        window["__argon_android__"].emit("log", JSON.stringify({type:'error', args:[].slice.call(arguments)}));
                    }
                    errorLogger.apply(window.console, arguments);
                };
                window.addEventListener('error', function(e) {
                    console.error('Unhandled Error: ' + e.message + ' (' + e.source + ':' + e.lineno + ')');
                }, false);
            };
            this.evaluateJavascript("(" + injectLoggers.toString() + ")()");
        });

        this.on(ArgonWebView.loadFinishedEvent, (args:LoadEventData) => {
            this.set('title', this.android.getTitle());
            this.set('progress', this.android.getProgress());
        });
    }

    get progress() {
        return this.android.getProgress();
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
