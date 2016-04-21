import * as frames from 'ui/frame';
import * as history from './shared/history';

let tapUrl: string;

export function onShownModally(args) {
    tapUrl = undefined;
}

export function exitButtonClicked(args) {
    frames.topmost().currentPage.modal.closeModal();
}

export function historyViewLoaded(args) {
    const historyView = args.object;
    historyView.items = history.getList();
}

export function historyClicked(args) {
    const historyView = args.object;
    tapUrl = historyView.items[args.index];
    frames.topmost().currentPage.modal.closeModal();
}

export function getTappedUrl(): string {
    return tapUrl;
}