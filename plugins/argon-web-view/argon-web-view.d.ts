import {WebView} from 'ui/web-view'
import {EventData} from 'data/observable'
import {SessionPort} from '@argonjs/argon';
import {ObservableArray} from 'data/observable-array';
import {Property} from 'ui/core/properties'

export const urlProperty : Property<ArgonWebView, string>;

export const titleProperty : Property<ArgonWebView, string>

export const progressProperty : Property<ArgonWebView, number>;

export const sessionProperty : Property<ArgonWebView, Argon.SessionPort|undefined>;

export const isArgonPageProperty : Property<ArgonWebView, boolean>;

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
    readonly session?: SessionPort;
    readonly isArgonPage: boolean;

    readonly log: ObservableArray<LogItem>;

    public evaluateJavascriptWithoutPromise(source:string) : void;
}