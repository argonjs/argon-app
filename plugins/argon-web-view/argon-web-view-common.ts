import * as def from '.'
import {WebView} from 'ui/web-view'
import * as Argon from '@argonjs/argon'
import {ObservableArray} from 'data/observable-array';    
import {Property} from 'ui/core/properties'

export const urlProperty = new Property<ArgonWebView, string>({
    name: 'url',
    defaultValue: ''
})
urlProperty.set = (v) => { throw new Error('Use the src property to load another page'); };

export const titleProperty = new Property<ArgonWebView, string>({
    name: 'title',
    defaultValue: ''
})
titleProperty.set = undefined;

export const progressProperty = new Property<ArgonWebView, number>({
    name: 'progress',
    defaultValue: 0
})
progressProperty.set = undefined;

export const sessionProperty = new Property<ArgonWebView, Argon.SessionPort>({
    name: 'session',
    defaultValue: undefined,
})
sessionProperty.set = undefined;

export const isArgonPageProperty = new Property<ArgonWebView, boolean>({
    name: 'isArgonPage',
    defaultValue: false,
})
isArgonPageProperty.set = undefined;

export abstract class ArgonWebView extends WebView implements def.ArgonWebView {
    
    public readonly url : string;
    public readonly title : string;
    public readonly progress : number; // range is 0 to 1.0
    public readonly isArgonPage:boolean;
    public readonly log = new ObservableArray<def.LogItem>();
    public readonly session?:Argon.SessionPort;

    private _outputPort?:Argon.MessagePortLike;

    constructor() {
        super();
    }

    public _didCommitNavigation() {
        if (this.session) this.session.close();
        this.log.length = 0;
        
        sessionProperty.nativeValueChange(this, undefined);
        this._outputPort = undefined;
    }

    public _handleArgonMessage(message:string) {

        if (this.session && !this.session.isConnected) return;
        const sessionUrl = this.url;

        if (!this.session && sessionUrl) { 
            
            console.log('Connecting to argon.js session at ' + sessionUrl);
            const manager = Argon.ArgonSystem.instance!;
            const messageChannel = manager.session.createSynchronousMessageChannel();
            const session = manager.session.addManagedSessionPort(sessionUrl);
            
            const port = messageChannel.port2;
            port.onmessage = (msg:Argon.MessageEventLike) => {
                if (!this.session) return;
                const injectedMessage = "typeof __ARGON_PORT__ !== 'undefined' && __ARGON_PORT__.postMessage("+msg.data+")";
                this.evaluateJavascriptWithoutPromise(injectedMessage);
            }

            sessionProperty.nativeValueChange(this, session);
            this._outputPort = port;

            session.open(messageChannel.port1, manager.session.configuration)
        }
        // console.log(message);
        this._outputPort && this._outputPort.postMessage(JSON.parse(message));
    }

    public _handleWebXRMessage(message:string) {
        
    }

    public _handleLogMessage(message:string) {
        const log:def.LogItem = JSON.parse(message);
        log.lines = log.message.split(/\r\n|\r|\n/);
        // console.log(this.url + ' (' + log.type + '): ' + log.lines.join('\n\t > ')); 
        this.log.push(log);
    }

    public abstract evaluateJavascript(script:string) : Promise<any>;
    public abstract evaluateJavascriptWithoutPromise(script:string) : void;

    public abstract bringToFront();
    
    public on(event: string, callback: (data: any) => void, thisArg?: any) {
        return super.on(event, callback, thisArg);
    }

}

urlProperty.register(ArgonWebView);
titleProperty.register(ArgonWebView);
progressProperty.register(ArgonWebView);
sessionProperty.register(ArgonWebView);
isArgonPageProperty.register(ArgonWebView);