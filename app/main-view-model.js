"use strict";
var observable_1 = require('data/observable');
var ArgonViewModel = (function (_super) {
    __extends(ArgonViewModel, _super);
    function ArgonViewModel() {
        _super.apply(this, arguments);
        this.menuVisible = false;
        this.debugViewVisible = false;
    }
    ArgonViewModel.prototype.toggleDebugView = function () {
        this.set('debugViewVisible', !this.debugViewVisible);
    };
    return ArgonViewModel;
}(observable_1.Observable));
exports.ArgonViewModel = ArgonViewModel;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = new ArgonViewModel;
//# sourceMappingURL=main-view-model.js.map