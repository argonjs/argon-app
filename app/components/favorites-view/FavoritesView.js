"use strict";
var observable_1 = require('data/observable');
var bookmarks_1 = require('../common/bookmarks');
var AppViewModel_1 = require('../common/AppViewModel');
var gestures_1 = require('ui/gestures');
var enums_1 = require('ui/enums');
var FavoritesViewModel = (function (_super) {
    __extends(FavoritesViewModel, _super);
    function FavoritesViewModel() {
        _super.apply(this, arguments);
        this.favoriteList = bookmarks_1.favoriteList;
    }
    return FavoritesViewModel;
}(observable_1.Observable));
exports.FavoritesViewModel = FavoritesViewModel;
exports.viewModel = new FavoritesViewModel();
var listView;
var editing = false;
function onLoaded(args) {
    listView = args.object;
    listView.bindingContext = exports.viewModel;
}
exports.onLoaded = onLoaded;
function onTap(args) {
    if (editing)
        return;
    closeAllCells();
    var item = args.object.bindingContext;
    AppViewModel_1.appViewModel.loadUrl(item.url);
}
exports.onTap = onTap;
function onDelete(args) {
    closeAllCells();
    var item = args.object.bindingContext;
    var i = bookmarks_1.favoriteList.indexOf(item);
    bookmarks_1.favoriteList.splice(i, 1);
}
exports.onDelete = onDelete;
var swipeLimit = -64;
var openCells = [];
function onItemLoaded(args) {
    var itemView = args.object;
    var contentView = itemView.getViewById('content');
    var deleteView = itemView.getViewById('delete');
    var cell = { contentView: contentView, deleteView: deleteView };
    var panStart = 0;
    contentView.on(gestures_1.GestureTypes.pan, function (data) {
        if (data.state === gestures_1.GestureStateTypes.began) {
            panStart = contentView.translateX;
            closeAllCells(cell);
            editing = true;
        }
        contentView.translateX = Math.min(Math.max(panStart + data.deltaX, -1000), 0);
        if (data.state === gestures_1.GestureStateTypes.ended) {
            editing = false;
            var open = contentView.translateX < swipeLimit * 0.75;
            toggleCellSwipeState(cell, open);
        }
        else {
            deleteView.visibility = 'visible';
        }
    });
}
exports.onItemLoaded = onItemLoaded;
function closeAllCells(exceptCell) {
    openCells.forEach(function (cell) {
        if (cell !== exceptCell)
            toggleCellSwipeState(cell, false);
    });
    openCells = exceptCell ? [exceptCell] : [];
}
function toggleCellSwipeState(cell, open) {
    var finalTranslateX = open ? swipeLimit : 0;
    cell.contentView.animate({
        translate: { x: finalTranslateX, y: 0 },
        curve: enums_1.AnimationCurve.easeInOut
    }).then(function () {
        cell.contentView.translateX = finalTranslateX;
        if (!open)
            cell.deleteView.visibility = 'collapse';
    });
    if (open) {
        openCells.push(cell);
    }
}
//# sourceMappingURL=FavoritesView.js.map