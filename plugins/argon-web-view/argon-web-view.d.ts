
declare module "argon-web-view" {

    import {WebView} from 'ui/web-view'
    import {EventData} from 'data/observable'
    import {SessionPort} from 'argon';

    export class ArgonWebView extends WebView {
        session: SessionPort;
        log: string[];
        isRealityLayer: boolean;

        /**
         * Raised when a sessionConnect event occurs.
         */
        on(event: "sessionConnect", callback: (args: SessionConnectEventData) => void, thisArg?: any);

        /**
         * Raised when a log event occurs.
         */
        on(event: "log", callback: (args: LogEventData) => void, thisArg?: any);

        on(event: string, callback: (args: EventData) => void, thisArg?: any);
    }

    export interface SessionConnectEventData extends EventData {
        session: SessionPort;
    }

    export interface LogEventData extends EventData {
        message: string;
    }
}
