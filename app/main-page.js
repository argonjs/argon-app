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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxJQUFPLFdBQVcsV0FBVyxhQUFhLENBQUMsQ0FBQztBQUU1QyxJQUFPLEtBQUssV0FBVyxjQUFjLENBQUMsQ0FBQztBQUN2QyxJQUFPLE1BQU0sV0FBVyxVQUFVLENBQUMsQ0FBQztBQUNwQyxJQUFPLFNBQVMsV0FBVyxlQUFlLENBQUMsQ0FBQztBQUU1QyxJQUFPLEtBQUssV0FBVyxPQUFPLENBQUMsQ0FBQztBQUloQyxJQUFPLGdCQUFnQixXQUFXLG9CQUFvQixDQUFDLENBQUM7QUFFeEQsSUFBTyxLQUFLLFdBQVcsT0FBTyxDQUFDLENBQUM7QUFDaEMscUNBQXdDLHdCQUF3QixDQUFDLENBQUE7QUFDakUsc0NBQWlELHlCQUF5QixDQUFDLENBQUE7QUFJM0UsSUFBSSxTQUE2QixDQUFDO0FBQ2xDLElBQUksU0FBNkIsQ0FBQztBQUVsQyxJQUFJLHNCQUE2QyxDQUFDO0FBRWxELG9CQUEyQixJQUFJO0lBRTlCLElBQU0sU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQztJQUN0QyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxnREFBeUIsQ0FBQyxDQUFDO0lBQzVFLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsMERBQWtDLENBQUMsQ0FBQztJQUM5RixlQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFDLFdBQUEsU0FBUyxFQUFDLENBQUMsQ0FBQztJQUUvQixJQUFNLElBQUksR0FBYyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRW5ELFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQzNCLG1CQUFX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