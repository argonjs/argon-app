import frames = require('ui/frame');

export function exitButtonClicked(args) {
    frames.topmost().navigate("main-page");
}

export function historyViewLoaded(args) {
    const historyView = args.object;
    historyView.items = ["www.google.com", "www.gatech.edu", "www.github.com"];
}

export function historyClicked(args) {
    const historyView = args.object;
    const item = historyView.items[args.index];
    console.log("Tapped item #", item);
}