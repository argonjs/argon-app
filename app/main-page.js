"use strict";
var application = require('application');
var views = require('ui/core/view');
var frames = require('ui/frame');
var searchbar = require('ui/search-bar');
var color = require('color');
var argonBrowserView = require('argon-browser-view');
var Argon = require('argon');
var argon_device_service_1 = require('./argon-device-service');
var argon_vuforia_service_1 = require('./argon-vuforia-service');
var history = require('./shared/history');
var actionBar;
var searchBar;
var iosSearchBarController;
function pageLoaded(args) {
    var container = new Argon.Container;
    container.registerSingleton(Argon.DeviceService, argon_device_service_1.NativeScriptDeviceService);
    container.registerSingleton(Argon.VuforiaServiceDelegate, argon_vuforia_service_1.NativeScriptVuforiaServiceDelegate);
    exports.manager = Argon.init({ container: container });
    var page = args.object;
    page.backgroundColor = new color.Color("black");
    actionBar = page.actionBar;
    exports.browserView = new argonBrowserView.BrowserView(page, exports.manager);
    exports.browserView.onNavigationStateChange = function () {
        var url = exports.browserView.getURL();
        if (iosSearchBarController) {
            iosSearchBarController.setText(url);
        }
    };
}
exports.pageLoaded = pageLoaded;
function actionBarLoaded(args) {
    actionBar = args.object;
}
exports.actionBarLoaded = actionBarLoaded;
function searchBarLoaded(args) {
    searchBar = args.object;
    searchBar.on(searchbar.SearchBar.submitEvent, function () {
        var url = searchBar.text;
        var protocolRegex = /^[^:]+(?=:\/\/)/;
        if (!protocolRegex.test(url)) {
            url = "http://" + url;
        }
        url = url.toLowerCase();
        console.log("Load url: " + url);
        exports.browserView.load(url);
        history.addPage(url);
    });
    if (application.ios) {
        iosSearchBarController = new IOSSearchBarController(searchBar);
    }
}
exports.searchBarLoaded = searchBarLoaded;
var IOSSearchBarController = (function () {
    function IOSSearchBarController(searchBar) {
        var _this = this;
        this.searchBar = searchBar;
        this.uiSearchBar = searchBar.ios;
        this.textField = this.uiSearchBar.valueForKey("searchField");
        this.uiSearchBar.showsCancelButton = false;
        this.uiSearchBar.keyboardType = UIKeyboardType.UIKeyboardTypeURL;
        this.uiSearchBar.autocapitalizationType = UITextAutocapitalizationType.UITextAutocapitalizationTypeNone;
        this.uiSearchBar.searchBarStyle = UISearchBarStyle.UISearchBarStyleMinimal;
        this.uiSearchBar.returnKeyType = UIReturnKeyType.UIReturnKeyGo;
        this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), UISearchBarIcon.UISearchBarIconSearch, UIControlState.UIControlStateNormal);
        this.textField.leftViewMode = UITextFieldViewMode.UITextFieldViewModeNever;
        var notificationCenter = NSNotificationCenter.defaultCenter();
        var textFieldEditHandler = function () {
            if (_this.uiSearchBar.isFirstResponder()) {
                _this.uiSearchBar.setShowsCancelButtonAnimated(true, false);
                var items = actionBar.actionItems.getItems();
                for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                    var item = items_1[_i];
                    item.visibility = 'collapse';
                }
                setTimeout(function () {
                    _this.uiSearchBar.text = exports.browserView.getURL();
                    _this.setPlaceholderText(null);
                    _this.textField.selectedTextRange = _this.textField.textRangeFromPositionToPosition(_this.textField.beginningOfDocument, _this.textField.endOfDocument);
                }, 500);
            }
            else {
                _this.setPlaceholderText(_this.uiSearchBar.text);
                _this.uiSearchBar.text = "";
                Promise.resolve().then(function () {
                    _this.setPlaceholderText(exports.browserView.getURL());
                    _this.uiSearchBar.setShowsCancelButtonAnimated(false, false);
                    var items = actionBar.actionItems.getItems();
                    for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
                        var item = items_2[_i];
                        item.visibility = 'visible';
                    }
                });
            }
        };
        application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
        application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);
    }
    IOSSearchBarController.prototype.setPlaceholderText = function (text) {
        if (text) {
            var attributes = NSMutableDictionary.alloc().init();
            attributes.setObjectForKey(UIColor.blackColor(), NSForegroundColorAttributeName);
            this.textField.attributedPlaceholder = NSAttributedString.alloc().initWithStringAttributes(text, attributes);
        }
        else {
            this.textField.placeholder = searchBar.hint;
        }
    };
    IOSSearchBarController.prototype.setText = function (url) {
        if (!this.uiSearchBar.isFirstResponder()) {
            this.setPlaceholderText(url);
        }
    };
    return IOSSearchBarController;
}());
function menuButtonClicked(args) {
    var menu = views.getViewById(frames.topmost().currentPage, "menu");
    menu.visibility = (menu.visibility == "visible") ? "collapsed" : "visible";
    if (menu.ios) {
        var menuView = menu.ios;
        menuView.superview.bringSubviewToFront(menuView);
    }
}
exports.menuButtonClicked = menuButtonClicked;
function bookmarksClicked(args) {
    //code to open the bookmarks view goes here
}
exports.bookmarksClicked = bookmarksClicked;
function historyClicked(args) {
    frames.topmost().navigate("history-view");
}
exports.historyClicked = historyClicked;
function debugClicked(args) {
    //code to open the debug view goes here
}
exports.debugClicked = debugClicked;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxJQUFPLFdBQVcsV0FBVyxhQUFhLENBQUMsQ0FBQztBQUU1QyxJQUFPLEtBQUssV0FBVyxjQUFjLENBQUMsQ0FBQztBQUN2QyxJQUFPLE1BQU0sV0FBVyxVQUFVLENBQUMsQ0FBQztBQUNwQyxJQUFPLFNBQVMsV0FBVyxlQUFlLENBQUMsQ0FBQztBQUU1QyxJQUFPLEtBQUssV0FBVyxPQUFPLENBQUMsQ0FBQztBQUloQyxJQUFPLGdCQUFnQixXQUFXLG9CQUFvQixDQUFDLENBQUM7QUFFeEQsSUFBTyxLQUFLLFdBQVcsT0FBTyxDQUFDLENBQUM7QUFDaEMscUNBQXdDLHdCQUF3QixDQUFDLENBQUE7QUFDakUsc0NBQWlELHlCQUF5QixDQUFDLENBQUE7QUFFM0UsSUFBTyxPQUFPLFdBQVcsa0JBQWtCLENBQUMsQ0FBQztBQUk3QyxJQUFJLFNBQTZCLENBQUM7QUFDbEMsSUFBSSxTQUE2QixDQUFDO0FBRWxDLElBQUksc0JBQTZDLENBQUM7QUFFbEQsb0JBQTJCLElBQUk7SUFFOUIsSUFBTSxTQUFTLEdBQUcsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQ3RDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLGdEQUF5QixDQUFDLENBQUM7SUFDNUUsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSwwREFBa0MsQ0FBQyxDQUFDO0lBQzlGLGVBQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUMsV0FBQSxTQUFTLEVBQUMsQ0FBQyxDQUFDO0lBRS9CLElBQU0sSUFBSSxHQUFjLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFbkQsU0FB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