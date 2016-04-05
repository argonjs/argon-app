"use strict";
var frames = require('ui/frame');
var history = require('./shared/history');
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
    var item = historyView.items[args.index];
    console.log("Tapped item #", item);
}
exports.historyClicked = historyClicked;
//# sourceMappingURL=history-view.js.map