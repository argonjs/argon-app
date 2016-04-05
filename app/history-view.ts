import frames = require('ui/frame');
import history = require('./shared/history');

export function onShownModally(args) {
    console.log("showing modally!")
}

export function exitButtonClicked(args) {
    frames.topmost().navigate("main-page");
}

export function historyViewLoaded(args) {
    const historyView = args.object;
    historyView.items = history.getList();
}

export function historyClicked(args) {
    const historyView = args.object;
    const item = historyView.items[args.index];
    console.log("Tapped item #", item);
}