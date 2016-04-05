"use strict";
var frames = require('ui/frame');
var history = require('./shared/history');
function onShownModally(args) {
    console.log("showing modally!");
}
exports.onShownModally = onShownModally;
function exitButtonClicked(args) {
    frames.topmost().navigate("main-page");
}
exports.exitButtonClicked = exitButtonClicked;
function historyViewLoaded(args) {
    var historyView = args.object;
    historyView.items = history.getList();
}
exports.historyViewLoaded = historyViewLoaded;
function historyClicked(args) {
    var historyView = args.object;
    var item = historyView.items[args.index];
    console.log("Tapped item #", item);
}
exports.historyClicked = historyClicked;
//# sourceMappingURL=history-view.js.map