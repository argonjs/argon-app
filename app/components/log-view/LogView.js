"use strict";
var AppViewModel_1 = require('../common/AppViewModel');
var color_1 = require('color');
var enums = require('ui/enums');
var label;
var shadow;
function onLayoutLoaded(args) {
    args.object.backgroundColor = new color_1.Color('transparent');
}
exports.onLayoutLoaded = onLayoutLoaded;
function onLoaded(args) {
    label = args.object;
    label.bindingContext = AppViewModel_1.appViewModel;
    label.verticalAlignment = enums.VerticalAlignment.bottom;
    AppViewModel_1.appViewModel['getRecentLogs'] = function () {
        var webView = AppViewModel_1.appViewModel.layerDetails.webView;
        updateLogListener(webView);
        return label.text;
    };
    AppViewModel_1.appViewModel.on('propertyChange', function (args) {
        if (args.propertyName === 'debugEnabled') {
            updateLogListener(AppViewModel_1.appViewModel.layerDetails.webView);
        }
    });
}
exports.onLoaded = onLoaded;
function onShadowLoaded(args) {
    shadow = args.object;
    shadow.verticalAlignment = enums.VerticalAlignment.bottom;
    shadow.translateX = 0.5;
    shadow.translateY = 0.5;
}
exports.onShadowLoaded = onShadowLoaded;
var previousWebView;
function updateLogListener(webView) {
    if (webView === previousWebView && AppViewModel_1.appViewModel.debugEnabled)
        return;
    if (previousWebView) {
        previousWebView.logs.removeEventListener("change", updateLog);
        previousWebView = undefined;
    }
    if (!webView || !AppViewModel_1.appViewModel.debugEnabled)
        return;
    webView.logs.addEventListener('change', updateLog);
    previousWebView = webView;
    updateLog();
}
function updateLog() {
    var webView = AppViewModel_1.appViewModel.layerDetails.webView;
    if (webView && webView.logs.length > 0) {
        var lines = [];
        loop: for (var l = webView.logs.length - 1; l >= 0; l--) {
            var log = webView.logs.getItem(l);
            lines.unshift.apply(lines, log.lines);
            if (lines.length > 50)
                break loop;
        }
        label.text = lines.join('\n');
        shadow.text = label.text;
    }
    else {
        label.text = "";
        shadow.text = "";
    }
}
//# sourceMappingURL=LogView.js.map