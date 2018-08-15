import {ObservableArray} from 'data/observable-array';
import {Label} from 'ui/label';
import {Color} from 'color';
import {Layout} from 'ui/layouts/layout'

import {LogItem} from 'argon-web-view';

let label:Label;
let shadow:Label;

export function onLayoutLoaded(args) {
    const layout:Layout = args.object;
    layout.backgroundColor = new Color('transparent');
    layout.bindingContext = {getLogText}
}

export function onLoaded(args) {
    label = args.object;
    label.verticalAlignment = 'bottom';
}

export function onShadowLoaded(args) {
    shadow = args.object;
    shadow.verticalAlignment = 'bottom';
    shadow.translateX = 0.5;
    shadow.translateY = 0.5;
}

export function getLogText(log:ObservableArray<LogItem>) {
    if (log && log.length > 0) {
        var lines:string[] = [];
        loop: for (var l = log.length-1; l >= 0; l--) {
            var logItem = log.getItem(l);
            lines.unshift(...logItem.lines);
            if (lines.length > 50) break loop;
        }
        label.text = lines.join('\n') + '\n';
        shadow.text = label.text;
    } else {
        label.text = "";
        shadow.text = "";
    }
}

// let currentLayer:LayerDetails:undefined;
// let currentLog:ObservableArray<LogItem>|undefined;

// function updateLayerObservation(layer:LayerDetails) {
//     if (currentLayer === layer && appModel.debugEnabled) return
//     if (currentLayer) {
//         currentLayer.removeEventListener('propertyChange', onLayerPropertyChange)
//     }
//     if (!layer || !appModel.debugEnabled) return;
//     layer.addEventListener('propertyChange', onLayerPropertyChange)
//     currentLayer = layer
//     updateLog();
// }

// function onLayerPropertyChange(evt:PropertyChangeData) {
    
// }

// function updateLogObservation(log) {
//     if (currentLog) {
//         currentLog.removeEventListener("change", updateLog);
//         currentLog = undefined;
//     }
// }

// function updateLog() {
//     if (currentLog && currentLog.length > 0) {
//         var lines:string[] = [];
//         loop: for (var l = currentLog.length-1; l >= 0; l--) {
//             var log = currentLog.getItem(l);
//             lines.unshift(...log.lines);
//             if (lines.length > 50) break loop;
//         }
//         label.text = lines.join('\n') + '\n';
//         shadow.text = label.text;
//     } else {
//         label.text = "";
//         shadow.text = "";
//     }
// }

