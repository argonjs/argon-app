declare module io {
    export module argonjs {
        export class AndroidWebInterface {
            // Constructor stores an ID
            constructor(id: java.lang.String);

            // Listen for webview events
            onArgonEvent(id: string, event: string, data: string);

            // Make a custom type using this java class
            static extend(implementation: {
                onArgonEvent: (id: string, event: string, data: string) => void,
            }): typeof AndroidWebInterface;
        }
    }
}
