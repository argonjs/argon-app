import def = require('argon-browser-view')
import page = require('ui/page')
import Argon = require('argon')

export class BrowserView implements def.BrowserView {
    constructor(public page:page.Page, public manager:Argon.ArgonSystem) {
        
    }
    
    load(url:string) {
        
    }
    
    getURL() {
        return null;
    }
    
    getProgress() {
        return 0;
    }
    
    onNavigationStateChange() {}
}