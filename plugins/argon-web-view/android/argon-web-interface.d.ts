declare module io {
    export module argonjs {
        export class AndroidWebInterface {
            // Listen for webview events
            onArgonEvent(event: string, data: string);

            // Make a custom type using this java class
            static extend(implementation: {
                onArgonEvent: (event: string, data: string) => void,
            }): typeof AndroidWebInterface;
        }
    }
}
