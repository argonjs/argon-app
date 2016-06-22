import * as def from 'argon-web-view'
import {WebView} from 'ui/web-view'
import * as Argon from 'argon'

export abstract class ArgonWebView extends WebView implements def.ArgonWebView {
    
    public static sessionUrlMap = new WeakMap<Argon.SessionPort, string>();
    
    public static sessionEvent = 'session';
    public static logEvent = 'log';

    public title : string;

    public progress : number;

    public log:string[] = [];    

    public session:Argon.SessionPort;
    private _outputPort:Argon.MessagePortLike;

    constructor() {
        super();
    }

    public _didCommitNavigation() {
        if (this.session) this.session.close();
        this.session = null;
        this._outputPort = null;
    }

    public _handleArgonMessage(message:string) {

        if (this.session && !this.session.isConnected) return;

        if (!this.session) { 
            // note: this.src is what the webview was originally set to load, this.url is the actual current url. 
            const sessionUrl = this.url;
            
            console.log('Connecting to argon.js session at ' + sessionUrl);
            const manager = Argon.ArgonSystem.instance;
            const messageChannel = manager.session.createSynchronousMessageChannel();
            const session = manager.session.addManagedSessionPort();
            
            ArgonWebView.sessionUrlMap.set(session, sessionUrl);
            
            const port = messageChannel.port2;
            port.onmessage = (msg:Argon.MessageEventLike) => {
                if (!this.session) return;
                const injectedMessage = "__ARGON_PORT__.postMessage("+JSON.stringify(msg.data)+")";
                this.evaluateJavascript(injectedMessage);
            }

            session.connectEvent.addEventListener(()=>{            
                session.info.name = sessionUrl;
            });
                 
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
        this._outputPort.postMessage(JSON.parse(message));
    }

    public _handleLogMessage(message:string) {
        const logMessage = this.url + ': ' + message;
        console.log(logMessage); 
        this.log.push(logMessage);
        const args:def.LogEventData = {
            eventName: ArgonWebView.logEvent,
            object:this,
            message: logMessage
        }
        this.notify(args);
    }

    public abstract evaluateJavascript(script:string) : Promise<any>;

    public abstract bringToFront();

}
