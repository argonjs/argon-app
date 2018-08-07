import {WebView} from 'ui/web-view'
import {Observable, EventData} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import {Property} from 'ui/core/properties'

export const urlProperty : Property<ArgonWebView, string>;

export const titleProperty : Property<ArgonWebView, string>

export const progressProperty : Property<ArgonWebView, number>;

export const xrEnabledProperty : Property<ArgonWebView, boolean>;
export const xrImmersiveTypeProperty : Property<ArgonWebView, XRImmersiveType>;

export interface LogItem {
    type: 'log'|'warn'|'error',
    message: string,
    lines: string[]
}

export class ArgonWebView extends WebView {
    readonly static logEvent:string;
    
    readonly url: string;
    readonly title: string;
    readonly progress: number;
    readonly log: ObservableArray<LogItem>;

    readonly messageHandlers:{[topic:string]:(message:{})=>PromiseLike<any>|void};

    public evaluateJavascriptWithoutPromise(source:string) : void;

	public send(topic:string, message:{}) : void;
    
    public request(topic:string, message:{}) : Promise<{}>;
}