/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />
/// <reference path="./node_modules/tns-platform-declarations/android.d.ts" />

declare module 'polyfill-crypto.getrandomvalues';

// declare module 'metascraper';
declare module 'domino'
declare module 'page-metadata-parser'

declare function alert(message?: any): void;

type HTMLElement = never;
type HTMLDivElement = never;

interface Thenable<R> {
    then<U>(onFulfilled?: (value: R) => U | Thenable<U>,  onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
}

namespace openpgp {
    interface DecryptOptions {
        message: openpgp.message.Message,
        privateKey: openpgp.key.Key,
    }
    interface DecryptKeyOptions {
        passphrase: string,
        privateKey: openpgp.key.Key,
    }
    function decrypt(o:DecryptOptions) : Promise<string>;
    function decryptKey(o:DecryptKeyOptions) : Promise<{key: openpgp.key.Key}>;
    function initWorker(options:any);
}