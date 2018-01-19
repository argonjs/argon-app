import * as application from 'application';
import {Observable, PropertyChangeData} from 'data/observable';
import {View} from 'ui/core/view';
import {ListView} from 'ui/list-view';
import {BookmarkItem, favoriteList, filterControl, filteredFavoriteList} from '../common/bookmarks'
import {appViewModel} from '../common/AppViewModel'

import {
  GestureTypes,
  GestureStateTypes,
  PanGestureEventData,
} from 'ui/gestures';

import {AnimationCurve} from 'ui/enums'

export class FavoritesViewModel extends Observable {
    favoriteList = favoriteList;
    filteredFavoriteList = filteredFavoriteList;
    showFilteredResults = false;
}
export const viewModel = new FavoritesViewModel();

let listView:ListView;
let editing = false;

export function onLoaded(args) {
    listView = args.object;
    listView.bindingContext = viewModel;
}

export function onTap(args) {
    clearTimeout(tapTimerId);
    if (editing) return
    closeAllCells();
    var item:BookmarkItem = (args.object as View).bindingContext;
    appViewModel.loadUrl(item.uri);
}

export function onDelete(args) {
    closeAllCells();
    var item:BookmarkItem = (args.object as View).bindingContext;
    var i = favoriteList.indexOf(item);
    favoriteList.splice(i, 1);
}

const swipeLimit = -64;

interface CellViews {
    contentView:View, 
    deleteView:View
}

let openCells:Array<CellViews> = []

const tapTimeout = 300;
var tapTimerId = -1;

export function onItemLoaded(args) {
    var itemView:View = args.object;
    var contentView = itemView.getViewById<View>('content');
    var deleteView = itemView.getViewById<View>('delete');
    var cell = {contentView, deleteView};
    
    var panStart=0;
    contentView.on(GestureTypes.pan, (data:PanGestureEventData)=>{
        
        if (data.state === GestureStateTypes.began) {
            if (application.android) {
                closeAllCells(cell);
                editing = false;
                tapTimerId = <number><any>setTimeout(()=>{
                    panStart = contentView.translateX + data.deltaX;
                    editing = true;
                }, tapTimeout);
            } else {
                panStart = contentView.translateX;
                closeAllCells(cell);
                editing = true;
            }
        } else {
            // wait for tap timeout before handling this gesture (only on android)
            if (!editing) return;
        }
        
        contentView.translateX = Math.min(Math.max(panStart + data.deltaX, -1000), 0);
        
        if (data.state === GestureStateTypes.ended) {
            clearTimeout(tapTimerId);
            editing = false;
            var open = contentView.translateX < swipeLimit*0.75;
            toggleCellSwipeState(cell, open);
        } else {
            deleteView.visibility = 'visible';
        }
        
    })
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

filterControl.on('propertyChange', (evt:PropertyChangeData) => {
    viewModel.set('showFilteredResults', filterControl.showFilteredResults);
});