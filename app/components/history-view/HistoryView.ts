import * as application from 'application';
import {Observable} from 'data/observable';
import {View} from 'ui/core/view';
import {ListView} from 'ui/list-view';
import {BookmarkItem, historyList} from '../common/bookmarks'
import {appViewModel} from '../common/AppViewModel'

import {
  GestureTypes,
  GestureStateTypes,
  PanGestureEventData,
} from 'ui/gestures';

import {AnimationCurve} from 'ui/enums'

export class HistoryViewModel extends Observable {
    historyList = historyList;
}
export const viewModel = new HistoryViewModel();

let listView:ListView;
let editing = false;

export function onLoaded(args) {
    listView = args.object;
    listView.bindingContext = viewModel;
}

export function onTap(args) {
    if (editing) return
    closeAllCells();
    var item:BookmarkItem = (args.object as View).bindingContext;
    appViewModel.loadUrl(item.uri);
}

export function onDelete(args) {
    closeAllCells();
    var item:BookmarkItem = (args.object as View).bindingContext;
    var i = historyList.indexOf(item);
    historyList.splice(i, 1);
}

const swipeLimit = -64;

interface CellViews {
    contentView:View, 
    deleteView:View
}

let openCells:Array<CellViews> = []

export function onItemLoaded(args) {
    var itemView:View = args.object;
    var contentView = itemView.getViewById('content');
    var deleteView = itemView.getViewById('delete');
    var cell = {contentView, deleteView};
    
    var panStart=0;
    // todo: fix for Android
    if (application.ios) {
        contentView.on(GestureTypes.pan, (data:PanGestureEventData)=>{
            
            if (data.state === GestureStateTypes.began) {
                panStart = contentView.translateX;
                closeAllCells(cell);
                editing = true;
            }
            
            contentView.translateX = Math.min(Math.max(panStart + data.deltaX, -1000), 0);
            
            if (data.state === GestureStateTypes.ended) {
                editing = false;
                var open = contentView.translateX < swipeLimit*0.75;
                toggleCellSwipeState(cell, open);
            } else {
                deleteView.visibility = 'visible';
            }
            
        })
    }
}

function closeAllCells(exceptCell?:CellViews) {
    openCells.forEach((cell)=>{
        if (cell !== exceptCell) toggleCellSwipeState(cell, false);
    })
    openCells = exceptCell ? [exceptCell] : [];
}

function toggleCellSwipeState(cell:CellViews, open:boolean) {
    const finalTranslateX = open ? swipeLimit : 0
    cell.contentView.animate({
        translate:{x:finalTranslateX, y:0},
        curve: AnimationCurve.easeInOut
    }).then(()=>{
        cell.contentView.translateX = finalTranslateX;
        if (!open) cell.deleteView.visibility = 'collapse';
    });
    if (open) {
        openCells.push(cell);
    }
}