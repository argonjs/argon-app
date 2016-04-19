"use strict";
var URI = require("urijs");
var application = require('application');
var views = require('ui/core/view');
var frames = require('ui/frame');
var searchbar = require('ui/search-bar');
var color = require('color');
var color_1 = require("color");
var util_1 = require('./util');
var Argon = require('argon');
require('./argon-camera-service');
require('./argon-device-service');
require('./argon-viewport-service');
var argon_vuforia_service_1 = require('./argon-vuforia-service');
var historyView = require('./history-view');
var history = require('./shared/history');
var actionBar;
var searchBar;
var iosSearchBarController;
var container = new Argon.Container;
container.registerSingleton(Argon.VuforiaServiceDelegate, argon_vuforia_service_1.NativeScriptVuforiaServiceDelegate);
exports.manager = Argon.init({ container: container, config: {
        role: Argon.Role.MANAGER,
        defaultReality: { type: 'vuforia' }
    } });
function pageLoaded(args) {
    var page = args.object;
    page.backgroundColor = new color.Color("black");
    actionBar = page.actionBar;
    var menuButton = page.getViewById("menuBtn");
    menuButton.text = String.fromCharCode(0xe5d2);
    var layerButton = page.getViewById("layerBtn");
    layerButton.text = String.fromCharCode(0xe53b);
    if (page.ios) {
        setTimeout(function () {
            page.requestLayout();
        }, 0);
        application.ios.addNotificationObserver(UIApplicationDidBecomeActiveNotification, function () {
            page.requestLayout();
        });
    }
}
exports.pageLoaded = pageLoaded;
function actionBarLoaded(args) {
    actionBar = args.object;
}
exports.actionBarLoaded = actionBarLoaded;
function searchBarLoaded(args) {
    searchBar = args.object;
    searchBar.on(searchbar.SearchBar.submitEvent, function () {
        var url = URI(searchBar.text);
        if (url.protocol() !== "http" || url.protocol() !== "https") {
            url.protocol("http");
        }
        console.log("Load url: " + url);
        exports.browserView.focussedLayer.src = url.toString();
    });
    if (application.ios) {
        iosSearchBarController = new IOSSearchBarController(searchBar);
    }
}
exports.searchBarLoaded = searchBarLoaded;
function browserViewLoaded(args) {
    exports.browserView = args.object;
    exports.browserView.on('propertyChange', function (eventData) {
        if (eventData.propertyName === 'url') {
            var url = eventData.value;
            if (iosSearchBarController) {
                iosSearchBarController.setText(url);
            }
            else {
                searchBar.text = url;
            }
        }
    });
    exports.browserView.focussedLayer.on("loadFinished", function (eventData) {
        if (!eventData.error) {
            history.addPage(eventData.url);
        }
    });
    var debug = args.object.page.getViewById("debug");
    debug.horizontalAlignment = 'stretch';
    debug.verticalAlignment = 'stretch';
    debug.backgroundColor = new color_1.Color(150, 255, 255, 255);
    debug.visibility = "collapsed";
    if (debug.ios) {
        debug.ios["setUserInteractionEnabled"](false);
    }
    var layer = exports.browserView.focussedLayer;
    console.log("FOCUSSED LAYER: " + layer.src);
    var logChangeCallback = function (args) {
        console.log("LOGS " + layer.log);
        debug.html = layer.log.join("\n");
    };
    layer.on("log", logChangeCallback);
    exports.browserView.on("propertyChange", function (evt) {
        if (evt.propertyName === "focussedLayer") {
            console.log("CHANGE FOCUS");
            if (layer) {
                layer.removeEventListener("log", logChangeCallback);
            }
            layer = exports.browserView.focussedLayer;
            console.log("FOCUSSED LAYER: " + layer.src);
            layer.on("log", logChangeCallback);
        }
    });
}
exports.browserViewLoaded = browserViewLoaded;
function menuLoaded(args) {
    var menu = args.object;
    menu.originX = 1;
    menu.originY = 0;
    menu.scaleX = 0;
    menu.scaleY = 0;
    menu.opacity = 0;
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
        var textFieldEditHandler = function () {
            if (_this.uiSearchBar.isFirstResponder()) {
                _this.uiSearchBar.setShowsCancelButtonAnimated(true, true);
                var cancelButton = _this.uiSearchBar.valueForKey("cancelButton");
                cancelButton.setTitleColorForState(UIColor.darkGrayColor(), UIControlState.UIControlStateNormal);
                var items = actionBar.actionItems.getItems();
                for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                    var item = items_1[_i];
                    item.visibility = 'collapse';
                }
                setTimeout(function () {
                    if (_this.uiSearchBar.text === "") {
                        _this.uiSearchBar.text = exports.browserView.url;
                        _this.setPlaceholderText(null);
                        _this.textField.selectedTextRange = _this.textField.textRangeFromPositionToPosition(_this.textField.beginningOfDocument, _this.textField.endOfDocument);
                    }
                }, 500);
            }
            else {
                _this.setPlaceholderText(_this.uiSearchBar.text);
                _this.uiSearchBar.text = "";
                Promise.resolve().then(function () {
                    _this.setPlaceholderText(exports.browserView.url);
                    _this.uiSearchBar.setShowsCancelButtonAnimated(false, true);
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
        hideMenu(menu);
    }
    else {
        showMenu(menu);
    }
}
exports.menuButtonClicked = menuButtonClicked;
function hideMenu(menu) {
    menu.animate({
        scale: {
            x: 0,
            y: 0,
        },
        duration: 150,
        opacity: 0,
    }).then(function () {
        menu.visibility = "collapsed";
    });
}
function showMenu(menu) {
    exports.browserView.hideOverview();
    menu.visibility = "visible";
    menu.animate({
        scale: {
            x: 1,
            y: 1,
        },
        duration: 150,
        opacity: 1,
    });
    util_1.Util.bringToFront(menu);
}
function onTap() {
    console.log('tapped');
}
exports.onTap = onTap;
function newChannelClicked(args) {
    exports.browserView.addLayer();
    hideMenu(args.object.page.getViewById("menu"));
}
exports.newChannelClicked = newChannelClicked;
function bookmarksClicked(args) {
}
exports.bookmarksClicked = bookmarksClicked;
function historyClicked(args) {
    frames.topmost().currentPage.showModal("history-view", null, function () {
        var url = historyView.getTappedUrl();
        if (url) {
            exports.browserView.focussedLayer.src = url;
        }
    }, true);
}
exports.historyClicked = historyClicked;
function settingsClicked(args) {
}
exports.settingsClicked = settingsClicked;
function layerButtonClicked(args) {
    exports.browserView.toggleOverview();
    args.object.page.getViewById("debug").visibility = "collapsed";
}
exports.layerButtonClicked = layerButtonClicked;
function debugClicked(args) {
    var debugView = args.object.page.getViewById("debug");
    if (debugView.visibility == "visible") {
        debugView.visibility = "collapsed";
    }
    else {
        debugView.visibility = "visible";
        util_1.Util.bringToFront(debugView);
    }
    hideMenu(args.object.page.getViewById("menu"));
}
exports.debugClicked = debugClicked;
//# sourceMappingURL=main-page.js.map