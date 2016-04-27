"use strict";
var URI = require("urijs");
var application = require('application');
var frames = require('ui/frame');
var search_bar_1 = require('ui/search-bar');
var color_1 = require('color');
var observable_1 = require('data/observable');
var Argon = require('argon');
var util_1 = require('./util');
require('./argon-device-service');
var argon_vuforia_service_1 = require('./argon-vuforia-service');
var historyView = require('./history-view');
var history = require('./shared/history');
var page;
var menu;
var searchBar;
var iosSearchBarController;
var container = new Argon.DI.Container;
container.registerSingleton(Argon.VuforiaServiceDelegate, argon_vuforia_service_1.NativeScriptVuforiaServiceDelegate);
exports.manager = Argon.init({ container: container, config: {
        role: Argon.Role.MANAGER,
        name: 'ArgonApp'
    } });
exports.manager.reality.setDefault({ type: 'vuforia' });
exports.manager.vuforia.init({
    licenseKey: "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV"
}).catch(function (err) {
    console.log(err);
});
exports.manager.focus.sessionFocusEvent.addEventListener(function () {
    var focussedSession = exports.manager.focus.getSession();
    console.log("Argon focus changed: " + (focussedSession ? focussedSession.info.name : undefined));
});
var vuforiaDelegate = container.get(Argon.VuforiaServiceDelegate);
var ViewModel = (function (_super) {
    __extends(ViewModel, _super);
    function ViewModel() {
        _super.apply(this, arguments);
        this.menuOpen = false;
        this.debugEnabled = false;
        this.viewerEnabled = false;
    }
    ViewModel.prototype.toggleMenu = function () {
        this.set('menuOpen', !this.menuOpen);
    };
    ViewModel.prototype.hideMenu = function () {
        this.set('menuOpen', false);
    };
    ViewModel.prototype.toggleDebug = function () {
        this.set('debugEnabled', !this.debugEnabled);
    };
    ViewModel.prototype.toggleViewer = function () {
        this.set('viewerEnabled', !this.viewerEnabled);
    };
    ViewModel.prototype.setDebugEnabled = function (enabled) {
        this.set('debugEnabled', enabled);
    };
    ViewModel.prototype.setViewerEnabled = function (enabled) {
        this.set('viewerEnabled', enabled);
    };
    return ViewModel;
}(observable_1.Observable));
var viewModel = new ViewModel;
viewModel.on('propertyChange', function (evt) {
    if (evt.propertyName === 'viewerEnabled') {
        vuforiaDelegate.setViewerEnabled(evt.value);
    }
    if (evt.propertyName === 'menuOpen') {
        if (evt.value) {
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
        else {
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
    }
});
function pageLoaded(args) {
    page = args.object;
    page.bindingContext = viewModel;
    page.backgroundColor = new color_1.Color("black");
    // Set the icon for the menu button
    var menuButton = page.getViewById("menuBtn");
    menuButton.text = String.fromCharCode(0xe5d4);
    // Set the icon for the overview button
    var overviewButton = page.getViewById("overviewBtn");
    overviewButton.text = String.fromCharCode(0xe53b);
    // workaround (see https://github.com/NativeScript/NativeScript/issues/659)
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
function searchBarLoaded(args) {
    searchBar = args.object;
    searchBar.on(search_bar_1.SearchBar.submitEvent, function () {
        var url = URI(searchBar.text);
        if (url.protocol() !== "http" || url.protocol() !== "https") {
            url.protocol("http");
        }
        console.log("Load url: " + url);
        setSearchBarText(url.toString());
        exports.browserView.focussedLayer.webView.src = url.toString();
    });
    if (application.ios) {
        iosSearchBarController = new IOSSearchBarController(searchBar);
    }
}
exports.searchBarLoaded = searchBarLoaded;
function setSearchBarText(url) {
    if (iosSearchBarController) {
        iosSearchBarController.setText(url);
    }
    else {
        searchBar.text = url;
    }
}
function browserViewLoaded(args) {
    exports.browserView = args.object;
    exports.browserView.on('propertyChange', function (eventData) {
        if (eventData.propertyName === 'url') {
            setSearchBarText(eventData.value);
        }
    });
    exports.browserView.focussedLayer.webView.on("loadFinished", function (eventData) {
        if (!eventData.error) {
            history.addPage(eventData.url);
        }
    });
    // Setup the debug view
    var debug = exports.browserView.page.getViewById("debug");
    debug.horizontalAlignment = 'stretch';
    debug.verticalAlignment = 'stretch';
    debug.backgroundColor = new color_1.Color(150, 255, 255, 255);
    debug.visibility = "collapsed";
    if (debug.ios) {
        debug.ios.userInteractionEnabled = false;
    }
    var layer = exports.browserView.focussedLayer;
    var logChangeCallback = function (args) {
        while (layer.webView.log.length > 10)
            layer.webView.log.shift();
        debug.html = layer.webView.log.join("<br/>");
    };
    layer.webView.on("log", logChangeCallback);
    exports.browserView.on("propertyChange", function (evt) {
        if (evt.propertyName === "focussedLayer") {
            if (layer) {
                layer.webView.removeEventListener("log", logChangeCallback);
            }
            layer = exports.browserView.focussedLayer;
            console.log("FOCUSSED LAYER: " + layer.webView.src);
            layer.webView.on("log", logChangeCallback);
        }
    });
}
exports.browserViewLoaded = browserViewLoaded;
// initialize some properties of the menu so that animations will render correctly
function menuLoaded(args) {
    menu = args.object;
    menu.originX = 1;
    menu.originY = 0;
    menu.scaleX = 0;
    menu.scaleY = 0;
    menu.opacity = 0;
}
exports.menuLoaded = menuLoaded;
function onOverview(args) {
    exports.browserView.toggleOverview();
    viewModel.setDebugEnabled(false);
    viewModel.hideMenu();
}
exports.onOverview = onOverview;
function onMenu(args) {
    viewModel.toggleMenu();
}
exports.onMenu = onMenu;
function onNewChannel(args) {
    exports.browserView.addLayer();
    viewModel.hideMenu();
}
exports.onNewChannel = onNewChannel;
function onBookmarks(args) {
    //code to open the bookmarks view goes here
    viewModel.hideMenu();
}
exports.onBookmarks = onBookmarks;
function onHistory(args) {
    frames.topmost().currentPage.showModal("history-view", null, function () {
        var url = historyView.getTappedUrl();
        if (url) {
            exports.browserView.focussedLayer.webView.src = url;
        }
    }, true);
    viewModel.hideMenu();
}
exports.onHistory = onHistory;
function onSettings(args) {
    //code to open the settings view goes here
    viewModel.hideMenu();
}
exports.onSettings = onSettings;
function onViewerToggle(args) {
    viewModel.toggleViewer();
    viewModel.hideMenu();
}
exports.onViewerToggle = onViewerToggle;
function onDebugToggle(args) {
    viewModel.toggleDebug();
}
exports.onDebugToggle = onDebugToggle;
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
            viewModel.hideMenu();
            if (_this.uiSearchBar.isFirstResponder()) {
                _this.uiSearchBar.setShowsCancelButtonAnimated(true, true);
                var cancelButton = _this.uiSearchBar.valueForKey("cancelButton");
                cancelButton.setTitleColorForState(UIColor.darkGrayColor(), UIControlState.UIControlStateNormal);
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
                    _this.uiSearchBar.setShowsCancelButtonAnimated(false, true);
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
//# sourceMappingURL=main-page.js.map