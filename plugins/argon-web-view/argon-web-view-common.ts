import * as def from 'argon-web-view'
import {WebView} from 'ui/web-view'
import * as Argon from '@argonjs/argon'
import {ObservableArray} from 'data/observable-array';


export abstract class ArgonWebView extends WebView implements def.ArgonWebView {
    
    public static sessionEvent = 'session';
    public static logEvent = 'log';

    public isArgonApp = false;

    public title : string;
    public progress : number;

    private _logs = new ObservableArray<def.Log>();
    public get logs() {return this._logs};

    public session?:Argon.SessionPort;
    private _outputPort?:Argon.MessagePortLike;

    constructor() {
        super();
    }

    public _didCommitNavigation() {
        if (this.session) this.session.close();
        this.logs.length = 0;
        this.session = undefined;
        this._outputPort = undefined;
    }

    public _handleArgonMessage(message:string) {

        if (this.session && !this.session.isConnected) return;

        if (!this.session) { 
            const sessionUrl = this.getCurrentUrl();
            
            console.log('Connecting to argon.js session at ' + sessionUrl);
            const manager = Argon.ArgonSystem.instance!;
            const messageChannel = manager.session.createSynchronousMessageChannel();
            const session = manager.session.addManagedSessionPort(sessionUrl);
            
            const port = messageChannel.port2;
            port.onmessage = (msg:Argon.MessageEventLike) => {
                if (!this.session) return;
                const injectedMessage = "__ARGON_PORT__.postMessage("+JSON.stringify(msg.data)+")";
                this.evaluateJavascript(injectedMessage);
            }
                 
            const args:def.SessionEventData = {
                eventName: ArgonWebView.sessionEvent,
                object: this,
                session: session
            }
            this.notify(args);

            this.session = session;
            this._outputPort = port;

            session.open(messageChannel.port1, manager.session.configuration)
        }
        // console.log(message);
        this._outputPort && this._outputPort.postMessage(JSON.parse(message));
    }

    public _handleLogMessage(message:string) {
        console.log("*** _handleLogMessage: " + message);

        if (!message)
            return;
        const log:def.Log = JSON.parse(message);
        if (!log.message)
            return;
        log.lines = log.message.split(/\r\n|\r|\n/);
        console.log(this.getCurrentUrl() + ' (' + log.type + '): ' + log.lines.join('\n\t > ')); 
        this.logs.push(log);
        const args:def.LogEventData = {
            eventName: ArgonWebView.logEvent,
            object:this,
            log: log
        }
        this.notify(args);
    }

    public abstract evaluateJavascript(script:string) : Promise<any>;

    public abstract bringToFront();

    public abstract getCurrentUrl() : string;

}
