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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24tYnJvd3Nlci12aWV3LmFuZHJvaWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcmdvbi1icm93c2VyLXZpZXcuYW5kcm9pZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBSUE7SUFDSSxxQkFBbUIsSUFBYyxFQUFTLE9BQXlCO1FBQWhELFNBQUksR0FBSixJQUFJLENBQVU7UUFBUyxZQUFPLEdBQVAsT0FBTyxDQUFrQjtJQUVuRSxDQUFDO0lBRUQsMEJBQUksR0FBSixVQUFLLEdBQVU7SUFFZixDQUFDO0lBRUQsNEJBQU0sR0FBTjtRQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELGlDQUFXLEdBQVg7UUFDSSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2IsQ0FBQztJQUVELDZDQUF1QixHQUF2QixjQUEyQixDQUFDO0lBQ2hDLGtCQUFDO0FBQUQsQ0FBQyxBQWxCRCxJQWtCQztBQWxCWSxtQkFBVyxjQWtCdkIsQ0FBQSJ9