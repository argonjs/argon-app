import * as common from "./argon-web-view-common";
import * as page from "ui/page";
import * as Argon from "argon";
import {View} from "ui/core/view";
import {Color} from "color";

export class ArgonWebView extends common.ArgonWebView {

  constructor() {
      super();

      this.on(View.loadedEvent, () => {
        // Make transparent
        this.backgroundColor = new Color(0, 255, 255, 255);
        this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
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
