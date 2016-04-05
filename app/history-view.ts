import * as frames from 'ui/frame';
import * as history from './shared/history';

export function exitButtonClicked(args) {
    frames.topmost().currentPage.modal.closeModal();
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