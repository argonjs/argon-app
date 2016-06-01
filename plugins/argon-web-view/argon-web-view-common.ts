import * as def from 'argon-web-view'
import {WebView} from 'ui/web-view'
import * as Argon from 'argon'

export abstract class ArgonWebView extends WebView implements def.ArgonWebView {
    
    public static sessionUrlMap = new WeakMap<Argon.SessionPort, string>();
    
    public static sessionConnectEvent = 'sessionConnect';
    public static logEvent = 'log';

    public abstract get title() : string;

    public abstract get progress() : number;

    public session:Argon.SessionPort;
    private _sessionMessagePort:Argon.MessagePortLike;

    public log:string[] = [];
        
    constructor() {
        super();
        this.on(WebView.loadFinishedEvent, ()=>{
            this.notifyPropertyChange('title', this.title);
        })
    }

    public _handleArgonMessage(message:string) {
        if (typeof this._sessionMessagePort == 'undefined') { 
            // note: this.src is what the webview was originally set to load, this.url is the actual current url. 
            const sessionUrl = this.url;
            
            console.log('Connecting to argon.js session at ' + sessionUrl);
            const manager = Argon.ArgonSystem.instance;
            const messageChannel = manager.session.createSynchronousMessageChannel();
            const session = manager.session.addManagedSessionPort();
            ArgonWebView.sessionUrlMap.set(session, sessionUrl);
            
            this._sessionMessagePort = messageChannel.port2;
            this._sessionMessagePort.onmessage = (msg:Argon.MessageEventLike) => {
                if (!this.session) return;
                const injectedMessage = "__ARGON_PORT__.postMessage("+JSON.stringify(msg.data)+")";
                this.evaluateJavascript(injectedMessage);
            }

            session.connectEvent.addEventListener(()=>{
                session.info.name = sessionUrl;
                this.session = session;
                const args:def.SessionConnectEventData = {
                    eventName: ArgonWebView.sessionConnectEvent,
                    object: this,
                    session: session
                }
                this.notify(args);
            });

            session.closeEvent.addEventListener(()=>{
                if (this.session === session) {
                    this._sessionMessagePort = undefined;
                    this.session = null;
                }
            })

            session.open(messageChannel.port1, manager.session.configuration)
        }
        console.log(message);
        this._sessionMessagePort.postMessage(JSON.parse(message));
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
