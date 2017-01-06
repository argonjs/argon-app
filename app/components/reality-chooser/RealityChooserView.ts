import {Observable} from 'data/observable';
import {View} from 'ui/core/view';
import {ListView} from 'ui/list-view';
import {realityList, BookmarkItem} from '../common/bookmarks'
import {appViewModel} from '../common/AppViewModel'

export class RealityChooserViewModel extends Observable {
    realityList = realityList;
}
export const viewModel = new RealityChooserViewModel();

let listView:ListView;

export function onLoaded(args) {
    listView = args.object;
    listView.bindingContext = viewModel;
}

export function onTap(args) {
    var item:BookmarkItem = (args.object as View).bindingContext;
    appViewModel.manager.reality.request({uri: item.uri});
    appViewModel.hideRealityChooser();
}