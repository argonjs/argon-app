
declare module "argon-web-view" {

    import {WebView} from 'ui/web-view'
    import {EventData} from 'data/observable'
    import {SessionPort} from 'argon';

    export class ArgonWebView extends WebView {
        static sessionUrlMap:WeakMap<SessionPort, string>;
        static sessionConnectEvent:string;
        static logEvent:string;
        
        session: SessionPort;
        log: string[];
        
        title: string;

        isArgonApp: Boolean;

        /**
         * Raised when a session event occurs.
         */
        on(event: "session", callback: (args: SessionEventData) => void, thisArg?: any);

        /**
         * Raised when a log event occurs.
         */
        on(event: "log", callback: (args: LogEventData) => void, thisArg?: any);

        on(event: string, callback: (args: EventData) => void, thisArg?: any);
    }

    export interface SessionEventData extends EventData {
        session: SessionPort;
    }

    export interface LogEventData extends EventData {
        message: string;
    }
}
