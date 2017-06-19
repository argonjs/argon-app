
declare module "argon-web-view" {

    import {WebView} from 'ui/web-view'
    import {EventData} from 'data/observable'
    import {SessionPort} from '@argonjs/argon';
    import {ObservableArray} from 'data/observable-array';

    export interface LogItem {
        type: 'log'|'warn'|'error',
        message: string,
        lines: string[]
    }

    export class ArgonWebView extends WebView {
        static sessionConnectEvent:string;
        static logEvent:string;
        
        session?: SessionPort;
        log: ObservableArray<LogItem>;
        
        title?: string;
        progress: number;

        isArgonApp: boolean;

        public evaluateJavascriptWithoutPromise(source:string) : void;

        /**
         * Raised when a session event occurs.
         */
        on(event: "session", callback: (args: SessionEventData) => void, thisArg?: any);

        on(event: string, callback: (args: EventData) => void, thisArg?: any);

        /**
         * Safe way to query the current url on both platforms.
         */
        getCurrentUrl();
    }

    export interface SessionEventData extends EventData {
        session: SessionPort;
    }

    export interface LogEventData extends EventData {
        log: LogItem;
    }
}
