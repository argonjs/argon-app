import {Observable} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import {View} from 'ui/core/view';
import {ListView,ItemEventData} from 'ui/list-view';
import {RealityBookmarkItem, realityList} from '../common/bookmarks'
import {appViewModel} from '../common/AppViewModel'

import {
  GestureTypes,
  GestureStateTypes,
  PanGestureEventData,
  GestureEventData,
} from 'ui/gestures';

import {AnimationCurve} from 'ui/enums'

import * as Argon from 'argon'

export class RealityChooserViewModel extends Observable {
    realityList = realityList;
}
export const viewModel = new RealityChooserViewModel();

let listView:ListView;
let editing = false;

export function onLoaded(args) {
    listView = args.object;
    listView.bindingContext = viewModel;
}

export function onTap(args) {
    if (editing) return
    var item:RealityBookmarkItem = (args.object as View).bindingContext;
    Argon.ArgonSystem.instance.reality.setDesired(item.reality)
    appViewModel.hideRealityChooser();
}