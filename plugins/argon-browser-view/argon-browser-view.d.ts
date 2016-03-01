
declare module "argon-browser-view" {
    
    import page = require('ui/page')
    import Argon = require('argon');
    
    export class BrowserView {
        constructor(page:page.Page, manager:Argon.ArgonSystem);
        load(url:string);
        getURL() : string;        
        getProgress() : number;
        onNavigationStateChange() : void;
        log : string;
    }
}