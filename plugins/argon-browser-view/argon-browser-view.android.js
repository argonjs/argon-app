"use strict";
var BrowserView = (function () {
    function BrowserView(page, manager) {
        this.page = page;
        this.manager = manager;
    }
    BrowserView.prototype.load = function (url) {
    };
    BrowserView.prototype.getURL = function () {
        return null;
    };
    BrowserView.prototype.getProgress = function () {
        return 0;
    };
    BrowserView.prototype.onNavigationStateChange = function () { };
    return BrowserView;
}());
exports.BrowserView = BrowserView;
//# sourceMappingURL=argon-browser-view.android.js.map