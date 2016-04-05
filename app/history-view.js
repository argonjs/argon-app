"use strict";
var frames = require('ui/frame');
var history = require('./shared/history');
var tapUrl;
function onShownModally(args) {
    tapUrl = undefined;
}
exports.onShownModally = onShownModally;
function exitButtonClicked(args) {
    frames.topmost().currentPage.modal.closeModal();
}
exports.exitButtonClicked = exitButtonClicked;
function historyViewLoaded(args) {
    var historyView = args.object;
    historyView.items = history.getList();
}
exports.historyViewLoaded = historyViewLoaded;
function historyClicked(args) {
    var historyView = args.object;
    tapUrl = historyView.items[args.index];
    frames.topmost().currentPage.modal.closeModal();
}
exports.historyClicked = historyClicked;
function getTappedUrl() {
    return tapUrl;
}
exports.getTappedUrl = getTappedUrl;
//# sourceMappingURL=history-view.js.map