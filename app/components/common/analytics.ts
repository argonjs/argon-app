import * as googleAnalytics from "nativescript-google-analytics";
import * as application from 'application';
import {PropertyChangeData} from 'data/observable'
import {appViewModel} from './AppViewModel';

var isFirstLoad = true;
var pageLoadTimerId = -1;
var maxActiveApps = 0;
var maxInstalledRealities = 0;
var currentRealityUri = "";
var focusTimerActive = false;

const appFocusTimerID = "App Focus";

export function initAnalytics() {
    googleAnalytics.initalize({
        trackingId: "UA-63191442-3",
        dispatchInterval: 10,
        logging: <any>{
            native: false,
            console: false
        }
    });
}

export function updateArgonAppCount(count:number) {
    if (count > maxActiveApps) {
        maxActiveApps = count;
        if (count > 1) {
            logActiveAppCount(count);
        }
    }
}

export function updateInstalledRealityCount(count:number) {
    if (count > maxInstalledRealities) {
        maxInstalledRealities = count;
        if (count > 1) {
            logInstalledRealityCount(count);
        }
    }
}

export function updateCurrentRealityUri(uri:string) {
    currentRealityUri = uri;
}

export function realityManuallyChanged(uri:string) {
    if (uri != currentRealityUri) {
        logRealityManuallyChanged();
    }
}

appViewModel.ready.then(()=>{
    if (isFirstLoad) {
        logAppStart();

        appViewModel.argon.provider.focus.sessionFocusEvent.addEventListener(({current})=>{
            if (current && current.uri && current.uri != appViewModel.argon.session.configuration.uri) {
                logAppFocus(current.uri);
                current.closeEvent.addEventListener(() => { clearAppFocus(); });
            } else {
                clearAppFocus();
            }
        });
    }
});

appViewModel.on('propertyChange', (evt:PropertyChangeData)=>{
    if (evt.propertyName === 'currentUri') {
        // User needs to stay on a page for a few seconds for it to count as a page load
        // This way redirects and accidental clicks aren't logged
        clearTimeout(pageLoadTimerId);
        const uri = appViewModel.currentUri;
        if (uri) {
            pageLoadTimerId = <number><any>setTimeout(()=>{
                logPageLoad(uri);
            }, 3000);
        }
    }
});

application.on(application.resumeEvent, ()=> {
    if (!isFirstLoad) {
        logAppResume();
    }
});

application.on(application.suspendEvent, ()=> {
    isFirstLoad = false;
    clearAppFocus();
});


function logAppStart() {
    googleAnalytics.logEvent({
        category: "App Start",
        action: appViewModel.launchedFromUrl ? "URL Launch" : "User Launch",
        label: application.ios ? "iOS" : "Android",
        value: 1
    });
}

function logAppResume() {
    googleAnalytics.logEvent({
        category: "App Resume",
        action: appViewModel.launchedFromUrl ? "URL Launch" : "User Launch",
        label: application.ios ? "iOS" : "Android",
        value: 1
    });
}

function logPageLoad(url: string) {
    var type = "Page Loaded (other)";
    if (url.includes("argonjs.io")) {
        type = "Page Loaded (argonjs.io)";
    } else if (url.includes("google.com/search")) {
        type = "Google Search";
    }
    
    googleAnalytics.logEvent({
        category: "Page Load",
        action: type,
        label: application.ios ? "iOS" : "Android",
        value: 1
    });
}

function logAppFocus(url: string) {
    var type = "App Focus (other)";
    if (url.includes("argonjs.io")) {
        type = "App Focus (argonjs.io)";
    }

    if (focusTimerActive) googleAnalytics.stopTimer(appFocusTimerID);
    googleAnalytics.startTimer(appFocusTimerID, {
        category: "App Focus",
        name: type,
        label: (application.ios) ? "iOS" : "Android"
    });
    focusTimerActive = true;
}

function clearAppFocus() {
    if (focusTimerActive) googleAnalytics.stopTimer(appFocusTimerID);
    focusTimerActive = false;
}

function logActiveAppCount(count: number) {
    googleAnalytics.logEvent({
        category: "Multiple Apps",
        action: (count + " Apps Open"),
        label: application.ios ? "iOS" : "Android",
        value: count
    });
}

function logInstalledRealityCount(count: number) {
    googleAnalytics.logEvent({
        category: "Multiple Realities",
        action: (count + " Realities Installed"),
        label: application.ios ? "iOS" : "Android",
        value: count
    });
}

function logRealityManuallyChanged() {
    googleAnalytics.logEvent({
        category: "Reality Change",
        action: "Manual Reality Change",
        label: application.ios ? "iOS" : "Android",
        value: 1
    });
}