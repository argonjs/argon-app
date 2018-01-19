declare module io {
    export module argonjs {
        export abstract class ArgonWebInterface extends java.lang.Object {
            // Listen for webview events
            abstract onArgonEvent(event: string, data: string);
        }
    }
}
