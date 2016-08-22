"use strict";
var AppViewModel_1 = require('../common/AppViewModel');
var enums = require('ui/enums');
var label;
function onLoaded(args) {
    label = args.object;
    label.bindingContext = AppViewModel_1.appViewModel;
    label.verticalAlignment = enums.VerticalAlignment.bottom;
    AppViewModel_1.appViewModel['getRecentLogs'] = function () {
        var webView = AppViewModel_1.appViewModel.layerDetails.webView;
        addLogListener(webView);
        return label.text;
    };
}
exports.onLoaded = onLoaded;
var previousWebView;
function addLogListener(webView) {
    if (webView === previousWebView)
        return;
    if (previousWebView)
        previousWebView.logs.removeEventListener("change", logListener);
    if (!webView)
        return;
    webView.logs.addEventListener('change', logListener);
    previousWebView = webView;
}
function logListener(evt) {
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
    }
    else {
        label.text = "";
    }
}
//# sourceMappingURL=LogView.js.map