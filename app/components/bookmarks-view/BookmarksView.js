"use strict";
var observable_1 = require('data/observable');
var BookmarksViewModel = (function (_super) {
    __extends(BookmarksViewModel, _super);
    function BookmarksViewModel() {
        _super.apply(this, arguments);
        this.index = 0;
    }
    BookmarksViewModel.prototype.setIndex = function (value) {
        this.set('index', value);
    };
    return BookmarksViewModel;
}(observable_1.Observable));
var bookmarksView;
var contentLayout;
var tabsLayout;
var viewModel = new BookmarksViewModel;
function onLoaded(args) {
    bookmarksView = args.object;
    bookmarksView.bindingContext = viewModel;
}
exports.onLoaded = onLoaded;
function onContentLayoutLoaded(args) {
    contentLayout = args.object;
}
exports.onContentLayoutLoaded = onContentLayoutLoaded;
function onTabLayoutLoaded(args) {
    tabsLayout = args.object;
}
exports.onTabLayoutLoaded = onTabLayoutLoaded;
function onTabSelect(args) {
    var tab = args.object;
    var index = tabsLayout.getChildIndex(tab);
    viewModel.setIndex(index);
}
exports.onTabSelect = onTabSelect;
//# sourceMappingURL=BookmarksView.js.map