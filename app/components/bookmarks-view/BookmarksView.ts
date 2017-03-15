import {Observable} from 'data/observable';
import {View} from 'ui/core/view'
import {Layout} from 'ui/layouts/layout'

class BookmarksViewModel extends Observable {
    index = 0;
    setIndex(value:number) {
        this.set('index', value);
    }
}

let bookmarksView:View;
let contentLayout:Layout;
let tabsLayout:Layout;

const viewModel = new BookmarksViewModel;

export function onLoaded(args) {
    bookmarksView = args.object;
    bookmarksView.bindingContext = viewModel;
}

export function onContentLayoutLoaded(args) {
    contentLayout = args.object;
}

export function onTabLayoutLoaded(args) {
    tabsLayout = args.object;
}

export function onTabSelect(args) {
    const tab:View = args.object;
    const index = tabsLayout.getChildIndex(tab);
    viewModel.setIndex(index);
}