import * as common from "./argon-web-view-common";
import {View} from "ui/core/view";
import {Color} from "color";

const AndroidWebInterface = io.argonjs.AndroidWebInterface;

declare const window : any;

export class ArgonWebView extends common.ArgonWebView {

    private static layersById: {
        [id: string]: ArgonWebView,
    } = {};

    constructor() {
        super();

        this.on(View.loadedEvent, () => {
            // Make transparent
            this.backgroundColor = new Color(0, 255, 255, 255);
            this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);

            const settings = <android.webkit.WebSettings> this.android.getSettings();
            const userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " Argon");
            settings.setJavaScriptEnabled(true);

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
                        if (event === "message") {
                            self._handleArgonMessage(data);
                        } else if (event === "log") {
                            self._handleLogMessage(data);
                        }
                    }
                },
            }))(new java.lang.String(this.id)), "__argon_android__");
        });

        this.on(ArgonWebView.loadStartedEvent, () => {
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
    }

    get progress() {
        return this.android.getProgress();
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
}
