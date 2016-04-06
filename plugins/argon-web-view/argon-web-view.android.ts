import * as common from './argon-web-view-common';
import page = require('ui/page')
import Argon = require('argon')

export class ArgonWebView extends common.ArgonWebView {
  get progress() {
      return this.android.getProgress();
  }

  evaluateJavascript(script: string) {
    return new Promise((resolve, reject) => {
      this.android.evaluateJavascript(script, (value) => {
        resolve(value);
      });
    });
  }

  bringToFront() {
    this.android.bringToFront();
  }
}
