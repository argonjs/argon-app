"use strict";
var observable_1 = require("data/observable");
var bookmarks_1 = require("../common/bookmarks");
var AppViewModel_1 = require("../common/AppViewModel");
var RealityChooserViewModel = (function (_super) {
    __extends(RealityChooserViewModel, _super);
    function RealityChooserViewModel() {
        var _this = _super.apply(this, arguments) || this;
        _this.realityList = bookmarks_1.realityList;
        return _this;
    }
    return RealityChooserViewModel;
}(observable_1.Observable));
exports.RealityChooserViewModel = RealityChooserViewModel;
exports.viewModel = new RealityChooserViewModel();
var listView;
function onLoaded(args) {
    listView = args.object;
    listView.bindingContext = exports.viewModel;
}
exports.onLoaded = onLoaded;
function onTap(args) {
    var item = args.object.bindingContext;
    AppViewModel_1.appViewModel.argon.reality.request(item.uri);
    AppViewModel_1.appViewModel.hideRealityChooser();
}
exports.onTap = onTap;
