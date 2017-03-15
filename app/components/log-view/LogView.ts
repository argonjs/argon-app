import {PropertyChangeData} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import {Label} from 'ui/label';
import {appViewModel} from '../common/AppViewModel';
import {LogItem} from 'argon-web-view';
import {Color} from 'color';
import * as enums from 'ui/enums';

let label:Label;
let shadow:Label;

export function onLayoutLoaded(args) {
    const layout = args.object;
    layout.backgroundColor = new Color('transparent');

    appViewModel['getRecentLogItems'] = function() {
        updateLogListener(appViewModel.layerDetails.log);
        return label.text;
    };
    
    appViewModel.on('propertyChange', (args:PropertyChangeData)=>{
        if (args.propertyName === 'debugEnabled') {
            updateLogListener(appViewModel.layerDetails.log);
        }
    })

    layout.bindingContext = appViewModel;
}

export function onLoaded(args) {
    label = args.object;
    label.verticalAlignment = enums.VerticalAlignment.bottom;
}

export function onShadowLoaded(args) {
    shadow = args.object;
    shadow.verticalAlignment = enums.VerticalAlignment.bottom;
    shadow.translateX = 0.5;
    shadow.translateY = 0.5;
}

let currentLog:ObservableArray<LogItem>|undefined;

function updateLogListener(log:ObservableArray<LogItem>) {
    if (log === currentLog && appViewModel.debugEnabled) return;
    if (currentLog) {
        currentLog.removeEventListener("change", updateLog);
        currentLog = undefined;
    }
    if (!log || !appViewModel.debugEnabled) return;
    log.addEventListener('change', updateLog);
    currentLog = log;
    updateLog();
}

function updateLog() {
    if (currentLog && currentLog.length > 0) {
        var lines:string[] = [];
        loop: for (var l = currentLog.length-1; l >= 0; l--) {
            var log = currentLog.getItem(l);
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

