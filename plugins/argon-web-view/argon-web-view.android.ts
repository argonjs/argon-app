import * as common from './argon-web-view-common';
import page = require('ui/page')
import Argon = require('argon')

export class ArgonWebView extends common.ArgonWebView {
    get progress() {
        // TODO
        return 0;
    }
    
    evaluateJavascript() {
        // TODO
        return Promise.resolve();
    }
    
    bringToFront() {
        // TODO
    }
}