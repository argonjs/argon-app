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
// initialize some properties of the menu so that animations will render correctly
function menuLoaded(args) {
    var menu = args.object;
    menu.originY = 0;
    menu.scaleY = 0;
}
exports.menuLoaded = menuLoaded;
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
    if (menu.visibility == "visible") {
        menu.animate({
            scale: { x: 1, y: 0 },
            duration: 200
        }).then(function () { menu.visibility = "collapsed"; });
    }
    else {
        //make sure the menu view is rendered above any other views
        var parent_1 = menu.parent;
        parent_1._removeView(menu);
        parent_1._addView(menu, 0);
        menu.visibility = "visible";
        menu.animate({
            scale: { x: 1, y: 1 },
            duration: 200
        });
    }
}
exports.menuButtonClicked = menuButtonClicked;
function newChannelClicked(args) {
    //code to open a new channel goes here
}
exports.newChannelClicked = newChannelClicked;
function bookmarksClicked(args) {
    //code to open the bookmarks view goes here
}
exports.bookmarksClicked = bookmarksClicked;
function historyClicked(args) {
    //code to open the history view goes here
}
exports.historyClicked = historyClicked;
function debugClicked(args) {
    //code to open the debug view goes here
}
exports.debugClicked = debugClicked;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxJQUFPLFdBQVcsV0FBVyxhQUFhLENBQUMsQ0FBQztBQUU1QyxJQUFPLEtBQUssV0FBVyxjQUFjLENBQUMsQ0FBQztBQUN2QyxJQUFPLE1BQU0sV0FBVyxVQUFVLENBQUMsQ0FBQztBQUNwQyxJQUFPLFNBQVMsV0FBVyxlQUFlLENBQUMsQ0FBQztBQUU1QyxJQUFPLEtBQUssV0FBVyxPQUFPLENBQUMsQ0FBQztBQUloQyxJQUFPLGdCQUFnQixXQUFXLG9CQUFvQixDQUFDLENBQUM7QUFFeEQsSUFBTyxLQUFLLFdBQVcsT0FBTyxDQUFDLENBQUM7QUFDaEMscUNBQXdDLHdCQUF3QixDQUFDLENBQUE7QUFDakUsc0NBQWlELHlCQUF5QixDQUFDLENBQUE7QUFJM0UsSUFBSSxTQUE2QixDQUFDO0FBQ2xDLElBQUksU0FBNkIsQ0FBQztBQUVsQyxJQUFJLHNCQUE2QyxDQUFDO0FBRWxELG9CQUEyQixJQUFJO0lBRTlCLElBQU0sU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQztJQUN0QyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxnREFBeUIsQ0FBQyxDQUFDO0lBQzVFLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsMERBQWtDLENBQUMsQ0FBQztJQUM5RixlQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFDLFdBQUEsU0FBUyxFQUFDLENBQUMsQ0FBQztJQUUvQixJQUFNLElBQUksR0FBYyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRW5ELFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQzNCLG1CQUFX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