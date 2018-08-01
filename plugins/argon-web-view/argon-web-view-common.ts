import * as def from '.'
import {WebView} from 'ui/web-view'
import {ObservableArray} from 'data/observable-array';    
import {Property} from 'ui/core/properties'

export const PROTOCOL_VERSION_STRING = '2.0.0'
export const PROTOCOL_VERSION = PROTOCOL_VERSION_STRING.split('.').map(v => parseInt(v))

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


export abstract class ArgonWebView extends WebView implements def.ArgonWebView {
    
    public readonly url : string;
    public readonly title : string;
    public readonly progress : number; // range is 0 to 1.0
    public readonly isArgonPage:boolean;
    public readonly log = new ObservableArray<def.LogItem>();

    public messageHandlers:{[topic:string]:(message:{})=>PromiseLike<any>|void} = {}
    private _packet:Array<{}> = [];

    public _didCommitNavigation() {
        // if (this.session) this.session.close();

        // reset defaults to assume non-xr-enabled & non-immersive page
        this.log.length = 0;

        // sessionProperty.nativeValueChange(this, undefined);
        // this._outputPort = undefined;
    }

    // public _handleArgonMessage(message:string) {

    //     // if (this.session && !this.session.isConnected) return;
    //     const sessionUrl = this.url;

    //     if (!this.session && sessionUrl) { 
            
    //         console.log('Connecting to argon.js session at ' + sessionUrl);
    //         const manager = Argon.ArgonSystem.instance!;
    //         const messageChannel = manager.session.createSynchronousMessageChannel();
    //         const session = manager.session.addManagedSessionPort(sessionUrl);
            
    //         const port = messageChannel.port2;
    //         port.onmessage = (msg:Argon.MessageEventLike) => {
    //             if (!this.session) return;
    //             const injectedMessage = "typeof __ARGON_PORT__ !== 'undefined' && __ARGON_PORT__.postMessage("+msg.data+")";
    //             this.evaluateJavascriptWithoutPromise(injectedMessage);
    //         }

    //         sessionProperty.nativeValueChange(this, session);
    //         this._outputPort = port;

    //         session.open(messageChannel.port1, manager.session.configuration)
    //     }
    //     // console.log(message);
    //     this._outputPort && this._outputPort.postMessage(JSON.parse(message));
    // }

    public _handleArgonMessage(messageData:string) {

        const data = JSON.parse(messageData);
        
        const id = data[0];
        const topic = data[1];
        const message = data[2] || {};
        const expectsResponse = data[3];
        const handler = this.messageHandlers[topic];

        console.log('Received: \n' + console.log(message))

        if (handler && !expectsResponse) {
            handler(message)
        } else if (handler) {
            const response = new Promise((resolve) => resolve(handler(message)||undefined));
            Promise.resolve(response).then(response => {
                // if (this._isClosed) return;
                this.send(topic + ':resolve:' + id, response)
            }).catch(error => {
                // if (this._isClosed) return;
                let errorMessage
                if (typeof error === 'string') errorMessage = error;
                else if (typeof error.message === 'string') errorMessage = error.message;
                this.send(topic + ':reject:' + id, { reason: errorMessage })
            })
        } else {
            let errorMessage = 'Unable to handle message for topic ' + topic;
            console.log(errorMessage);
            if (expectsResponse) {
                this.send(topic + ':reject:' + id, { reason: errorMessage });
            }
        }
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

	public send(topic, message) {
		this._sendPacket(createGuid(), topic, message, false)
	}
    
    public request(topic, message) : Promise<{}> {
        const id = createGuid();
        const resolveTopic = topic + ':resolve:' + id;
        const rejectTopic = topic + ':reject:' + id;
        const result = new Promise((resolve, reject) => {
            this.messageHandlers[resolveTopic] = (message) => {
                delete this.messageHandlers[resolveTopic];
                delete this.messageHandlers[rejectTopic];
                resolve(message);
            }
            this.messageHandlers[rejectTopic] = (message:{reason:string}) => {
                delete this.messageHandlers[resolveTopic];
                delete this.messageHandlers[rejectTopic];
                console.warn("Request '" + topic + "' rejected with reason:\n" + message.reason);
                reject(new Error(message.reason));
            }
        })
		this._sendPacket(id, topic, message, true)
        return result;
    }

	private _sendPacket(id, topic, message, expectsResponse) {
        const packet = this._packet;
		packet[0] = id
		packet[1] = topic
		packet[2] = message
        packet[3] = expectsResponse
        const stringifiedPacket = JSON.stringify(packet)
        const injectedMessage = "typeof __ARGON_PORT__ !== 'undefined' && __ARGON_PORT__.postMessage("+stringifiedPacket+")";
        this.evaluateJavascriptWithoutPromise(injectedMessage);
	}

}

urlProperty.register(ArgonWebView);
titleProperty.register(ArgonWebView);
progressProperty.register(ArgonWebView);
// sessionProperty.register(ArgonWebView);
// isArgonPageProperty.register(ArgonWebView);
// xrEnabledProperty.register(ArgonWebView)
// xrImmersiveType.register(ArgonWebView)


const lut:Array<string> = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
function createGuid() {
  var d0 = Math.random()*0xffffffff|0;
  var d1 = Math.random()*0xffffffff|0;
  var d2 = Math.random()*0xffffffff|0;
  var d3 = Math.random()*0xffffffff|0;
  return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
    lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
    lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
    lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
}