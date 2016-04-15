import * as common from "./argon-web-view-common";
import * as page from "ui/page";
import * as Argon from "argon";
import {View} from "ui/core/view";
import {Color} from "color";

const AndroidWebInterface = io.argonjs.AndroidWebInterface;

export class ArgonWebView extends common.ArgonWebView {

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

      // Inject Javascript Interface
      this.android.addJavascriptInterface(new (AndroidWebInterface.extend({
          onArgonEvent: (event: string, data: string) => {
              if (event === "message") {
                  this._handleArgonMessage(data);
              } else if (event === "log") {
                  this._handleLogMessage(data);
              }
          },
      }))(), "argon");
    });

    this.on(ArgonWebView.loadStartedEvent, () => {
      // Hook into the logging
      const injectLogger = () => {
          const logger = window.console.log;
          window.console.log = (...args) => {
              if (window.argon) {
                  window.argon.emit("log", args.join(" "));
              }
              logger.apply(window.console, args);
          };
      };
      this.evaluateJavascript("(" + injectLogger.toString() + ")()");
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
