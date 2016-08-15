"use strict";
var observable_1 = require('data/observable');
var bookmarks_1 = require('../common/bookmarks');
var AppViewModel_1 = require('../common/AppViewModel');
var RealityChooserViewModel = (function (_super) {
    __extends(RealityChooserViewModel, _super);
    function RealityChooserViewModel() {
        _super.apply(this, arguments);
        this.realityList = bookmarks_1.realityList;
    }
    return RealityChooserViewModel;
}(observable_1.Observable));
exports.RealityChooserViewModel = RealityChooserViewModel;
exports.viewModel = new RealityChooserViewModel();
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
    var item = args.object.bindingContext;
    AppViewModel_1.manager.reality.setDesired(item.reality);
    AppViewModel_1.appViewModel.hideRealityChooser();
}
exports.onTap = onTap;
//# sourceMappingURL=RealityChooserView.js.map