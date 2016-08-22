import {Observable, PropertyChangeData} from 'data/observable';
import {ObservableArray, ChangedData} from 'data/observable-array';
import {View} from 'ui/core/view';
import {Label} from 'ui/label';
import {appViewModel} from '../common/AppViewModel';
import {ArgonWebView, Log} from 'argon-web-view';
import {Color} from 'color';
import * as utils from 'utils/utils';
import * as enums from 'ui/enums';

let label:Label;
let shadow:Label;

export function onLayoutLoaded(args) {
    args.object.backgroundColor = new Color('transparent');
}

export function onLoaded(args) {
    label = args.object;
    label.bindingContext = appViewModel;
    label.verticalAlignment = enums.VerticalAlignment.bottom;

    appViewModel['getRecentLogs'] = function() {
        const webView = appViewModel.layerDetails.webView
        updateLogListener(webView);
        return label.text;
    };
    
    appViewModel.on('propertyChange', (args:PropertyChangeData)=>{
        if (args.propertyName === 'debugEnabled') {
            updateLogListener(appViewModel.layerDetails.webView);
        }
    })
}

export function onShadowLoaded(args) {
    shadow = args.object;
    shadow.verticalAlignment = enums.VerticalAlignment.bottom;
    shadow.translateX = 0.5;
    shadow.translateY = 0.5;
}

let previousWebView:ArgonWebView|undefined;

function updateLogListener(webView:ArgonWebView|null) {
    if (webView === previousWebView && appViewModel.debugEnabled) return;
    if (previousWebView) {
        previousWebView.logs.removeEventListener("change", updateLog);
        previousWebView = undefined;
    }
    if (!webView || !appViewModel.debugEnabled) return;
    webView.logs.addEventListener('change', updateLog);
    previousWebView = webView;
    updateLog();
}

function updateLog() {
    const webView = appViewModel.layerDetails.webView;
    if (webView && webView.logs.length > 0) {
        var lines:string[] = [];
        loop: for (var l = webView.logs.length-1; l >= 0; l--) {
            var log = webView.logs.getItem(l);
            lines.unshift(...log.lines);
            if (lines.length > 50) break loop;
        }
        label.text = lines.join('\n');
        shadow.text = label.text;
    } else {
        label.text = "";
        shadow.text = "";
    }
}

