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

export function onLoaded(args) {
    label = args.object;
    label.bindingContext = appViewModel;
    label.verticalAlignment = enums.VerticalAlignment.bottom;

    appViewModel['getRecentLogs'] = function() {
        const webView = appViewModel.layerDetails.webView
        addLogListener(webView);
        return label.text;
    };
}

var previousWebView:ArgonWebView;

function addLogListener(webView:ArgonWebView|null) {
    if (webView === previousWebView) return;
    if (previousWebView) previousWebView.logs.removeEventListener("change", logListener);
    if (!webView) return;
    webView.logs.addEventListener('change', logListener);
    previousWebView = webView;
}

function logListener(evt:ChangedData<Log>) {
    const webView = appViewModel.layerDetails.webView;
    if (webView && webView.logs.length > 0) {
        var lines:string[] = [];
        loop: for (var l = webView.logs.length-1; l >= 0; l--) {
            var log = webView.logs.getItem(l);
            lines.unshift(...log.lines);
            if (lines.length > 50) break loop;
        }
        label.text = lines.join('\n');
    } else {
        label.text = "";
    }
}

