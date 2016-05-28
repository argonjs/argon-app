"use strict";
var URI = require("urijs");
var application = require('application');
var search_bar_1 = require('ui/search-bar');
var color_1 = require('color');
var fs = require('file-system');
var enums_1 = require('ui/enums');
var gestures_1 = require('ui/gestures');
var Argon = require('argon');
var bookmarks_1 = require('./components/common/bookmarks');
var AppViewModel_1 = require('./components/common/AppViewModel');
var argon_device_service_1 = require('./argon-device-service');
var argon_vuforia_service_1 = require('./argon-vuforia-service');
var searchBar;
var iosSearchBarController;
var pgpFolder = fs.knownFolders.currentApp().getFolder('pgp');
var publicKeyPromise = pgpFolder.contains('public.key') ?
    pgpFolder.getFile('public.key').readText() : Promise.reject(null);
var privateKeyPromise = pgpFolder.contains('private.key') ?
    pgpFolder.getFile('private.key').readText() : Promise.reject(null);
var container = new Argon.DI.Container;
container.registerSingleton(Argon.DeviceService, argon_device_service_1.NativescriptDeviceService);
container.registerSingleton(Argon.VuforiaServiceDelegate, argon_vuforia_service_1.NativescriptVuforiaServiceDelegate);
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
AppViewModel_1.appViewModel.on('propertyChange', function (evt) {
    if (evt.propertyName === 'currentUrl') {
        setSearchBarText(evt.value);
    }
    else if (evt.propertyName === 'viewerEnabled') {
        vuforiaDelegate.setViewerEnabled(evt.value);
    }
    else if (evt.propertyName === 'menuOpen') {
        if (evt.value) {
            AppViewModel_1.appViewModel.hideOverview();
            exports.menuView.visibility = "visible";
            exports.menuView.animate({
                scale: {
                    x: 1,
                    y: 1,
                },
                duration: 150,
                opacity: 1,
                curve: enums_1.AnimationCurve.easeInOut
            });
        }
        else {
            exports.menuView.animate({
                scale: {
                    x: 0,
                    y: 0,
                },
                duration: 150,
                opacity: 0,
                curve: enums_1.AnimationCurve.easeInOut
            }).then(function () {
                exports.menuView.visibility = "collapse";
            });
        }
    }
    else if (evt.propertyName === 'overviewOpen') {
        if (evt.value) {
            exports.browserView.showOverview();
            AppViewModel_1.appViewModel.hideBookmarks();
            searchBar.animate({
                translate: { x: -100, y: 0 },
                opacity: 0,
                curve: enums_1.AnimationCurve.easeInOut
            }).then(function () {
                searchBar.visibility = 'collapse';
            });
            var addButton = exports.headerView.getViewById('addButton');
            addButton.visibility = 'visible';
            addButton.opacity = 0;
            addButton.translateX = -10;
            addButton.animate({
                translate: { x: 0, y: 0 },
                opacity: 1
            });
        }
        else {
            exports.browserView.hideOverview();
            if (!exports.browserView.url)
                AppViewModel_1.appViewModel.showBookmarks();
            searchBar.visibility = 'visible';
            searchBar.animate({
                translate: { x: 0, y: 0 },
                opacity: 1,
                curve: enums_1.AnimationCurve.easeInOut
            });
            var addButton_1 = exports.headerView.getViewById('addButton');
            addButton_1.animate({
                translate: { x: -10, y: 0 },
                opacity: 0
            }).then(function () {
                addButton_1.visibility = 'collapse';
            });
        }
    }
    else if (evt.propertyName === 'bookmarksOpen') {
        if (evt.value) {
            exports.bookmarksView.visibility = 'visible';
            exports.bookmarksView.scaleX = 0.9;
            exports.bookmarksView.scaleY = 0.9;
            exports.bookmarksView.animate({
                scale: {
                    x: 1,
                    y: 1
                },
                opacity: 1,
                curve: enums_1.AnimationCurve.easeInOut
            });
        }
        else {
            exports.bookmarksView.animate({
                scale: {
                    x: 1,
                    y: 1
                },
                opacity: 0,
                curve: enums_1.AnimationCurve.easeInOut
            }).then(function () {
                exports.bookmarksView.visibility = 'collapse';
                exports.bookmarksView.scaleX = 0.9;
                exports.bookmarksView.scaleY = 0.9;
            });
            blurSearchBar();
        }
    }
    else if (evt.propertyName === 'cancelButtonShown') {
        if (evt.value) {
            var overviewButton_1 = exports.headerView.getViewById('overviewButton');
            overviewButton_1.animate({
                opacity: 0
            }).then(function () {
                overviewButton_1.visibility = 'collapse';
            });
            var menuButton_1 = exports.headerView.getViewById('menuButton');
            menuButton_1.animate({
                opacity: 0
            }).then(function () {
                menuButton_1.visibility = 'collapse';
            });
            var cancelButton = exports.headerView.getViewById('cancelButton');
            cancelButton.visibility = 'visible';
            cancelButton.animate({
                opacity: 1
            });
            exports.bookmarksView.on(gestures_1.GestureTypes.touch, function () {
                blurSearchBar();
                AppViewModel_1.appViewModel.hideCancelButton();
            });
        }
        else {
            var overviewButton = exports.headerView.getViewById('overviewButton');
            overviewButton.visibility = 'visible';
            overviewButton.animate({
                opacity: 1
            });
            var menuButton = exports.headerView.getViewById('menuButton');
            menuButton.visibility = 'visible';
            menuButton.animate({
                opacity: 1
            });
            var cancelButton_1 = exports.headerView.getViewById('cancelButton');
            cancelButton_1.animate({
                opacity: 0
            }).then(function () {
                cancelButton_1.visibility = 'collapse';
            });
            exports.bookmarksView.off(gestures_1.GestureTypes.touch);
        }
    }
});
// frames.Frame.prototype['_setNativeViewFrame'] = View.prototype['_setNativeViewFrame'];
function pageLoaded(args) {
    exports.page = args.object;
    exports.page.bindingContext = AppViewModel_1.appViewModel;
    AppViewModel_1.appViewModel.on('loadUrl', function (data) {
        exports.browserView.loadUrl(data.url);
    });
    // Set the icon for the menu button
    var menuButton = exports.page.getViewById("menuButton");
    menuButton.text = String.fromCharCode(0xe5d4);
    // Set the icon for the overview button
    var overviewButton = exports.page.getViewById("overviewButton");
    overviewButton.text = String.fromCharCode(0xe53b);
    // workaround (see https://github.com/NativeScript/NativeScript/issues/659)
    if (exports.page.ios) {
        setTimeout(function () {
            exports.page.requestLayout();
        }, 0);
        application.ios.addNotificationObserver(UIApplicationDidBecomeActiveNotification, function () {
            exports.page.requestLayout();
        });
    }
    AppViewModel_1.appViewModel.showBookmarks();
}
exports.pageLoaded = pageLoaded;
function headerLoaded(args) {
    exports.headerView = args.object;
}
exports.headerLoaded = headerLoaded;
function searchBarLoaded(args) {
    searchBar = args.object;
    searchBar.on(search_bar_1.SearchBar.submitEvent, function () {
        var url = URI(searchBar.text);
        if (url.protocol() !== "http" || url.protocol() !== "https") {
            url.protocol("http");
        }
        setSearchBarText(url.toString());
        AppViewModel_1.appViewModel.loadUrl(url.toString());
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
function blurSearchBar() {
    if (searchBar.ios) {
        searchBar.ios.resignFirstResponder();
    }
}
function browserViewLoaded(args) {
    exports.browserView = args.object;
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
        // while (layer.webView.log.length > 10) layer.webView.log.shift()
        // debug.html = layer.webView.log.join("<br/>");
    };
    layer.webView.on("log", logChangeCallback);
    exports.browserView.on("propertyChange", function (evt) {
        if (evt.propertyName === 'url') {
            AppViewModel_1.appViewModel.setCurrentUrl(evt.value);
            setSearchBarText(evt.value);
        }
        else if (evt.propertyName === 'focussedLayer') {
            if (layer) {
                layer.webView.removeEventListener("log", logChangeCallback);
            }
            layer = exports.browserView.focussedLayer;
            console.log("FOCUSSED LAYER: " + layer.webView.src);
            layer.webView.on("log", logChangeCallback);
            AppViewModel_1.appViewModel.hideOverview();
        }
    });
}
exports.browserViewLoaded = browserViewLoaded;
function bookmarksViewLoaded(args) {
    exports.bookmarksView = args.object;
}
exports.bookmarksViewLoaded = bookmarksViewLoaded;
// initialize some properties of the menu so that animations will render correctly
function menuLoaded(args) {
    exports.menuView = args.object;
    exports.menuView.originX = 1;
    exports.menuView.originY = 0;
    exports.menuView.scaleX = 0;
    exports.menuView.scaleY = 0;
    exports.menuView.opacity = 0;
}
exports.menuLoaded = menuLoaded;
function onSearchBarTap(args) {
    AppViewModel_1.appViewModel.showBookmarks();
    AppViewModel_1.appViewModel.showCancelButton();
}
exports.onSearchBarTap = onSearchBarTap;
function onCancel(args) {
    if (!!exports.browserView.url)
        AppViewModel_1.appViewModel.hideBookmarks();
    AppViewModel_1.appViewModel.hideCancelButton();
    blurSearchBar();
}
exports.onCancel = onCancel;
function onAddChannel(args) {
    exports.browserView.addLayer();
    AppViewModel_1.appViewModel.hideMenu();
}
exports.onAddChannel = onAddChannel;
function onReload(args) {
    exports.browserView.focussedLayer.webView.reload();
}
exports.onReload = onReload;
function onFavoriteToggle(args) {
    var url = exports.browserView.url;
    if (!bookmarks_1.favoriteMap.get(url)) {
        bookmarks_1.favoriteList.push(new bookmarks_1.BookmarkItem({
            url: url,
            title: exports.browserView.focussedLayer.webView.title
        }));
    }
    else {
        bookmarks_1.favoriteMap.set(url, undefined);
    }
}
exports.onFavoriteToggle = onFavoriteToggle;
function onOverview(args) {
    AppViewModel_1.appViewModel.toggleOverview();
    AppViewModel_1.appViewModel.setDebugEnabled(false);
    AppViewModel_1.appViewModel.hideMenu();
}
exports.onOverview = onOverview;
function onMenu(args) {
    AppViewModel_1.appViewModel.toggleMenu();
}
exports.onMenu = onMenu;
function onSettings(args) {
    //code to open the settings view goes here
    AppViewModel_1.appViewModel.hideMenu();
}
exports.onSettings = onSettings;
function onViewerToggle(args) {
    AppViewModel_1.appViewModel.toggleViewer();
    AppViewModel_1.appViewModel.hideMenu();
}
exports.onViewerToggle = onViewerToggle;
function onDebugToggle(args) {
    AppViewModel_1.appViewModel.toggleDebug();
}
exports.onDebugToggle = onDebugToggle;
var IOSSearchBarController = (function () {
    function IOSSearchBarController(searchBar) {
        var _this = this;
        this.searchBar = searchBar;
        this.uiSearchBar = searchBar.ios;
        this.textField = this.uiSearchBar.valueForKey("searchField");
        this.uiSearchBar.keyboardType = UIKeyboardType.UIKeyboardTypeURL;
        this.uiSearchBar.autocapitalizationType = UITextAutocapitalizationType.UITextAutocapitalizationTypeNone;
        this.uiSearchBar.searchBarStyle = UISearchBarStyle.UISearchBarStyleMinimal;
        this.uiSearchBar.returnKeyType = UIReturnKeyType.UIReturnKeyGo;
        this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), UISearchBarIcon.UISearchBarIconSearch, UIControlState.UIControlStateNormal);
        this.textField.leftViewMode = UITextFieldViewMode.UITextFieldViewModeNever;
        var textFieldEditHandler = function () {
            AppViewModel_1.appViewModel.hideMenu();
            if (_this.uiSearchBar.isFirstResponder()) {
                AppViewModel_1.appViewModel.showBookmarks();
                AppViewModel_1.appViewModel.showCancelButton();
                setTimeout(function () {
                    if (_this.uiSearchBar.text === "") {
                        _this.uiSearchBar.text = AppViewModel_1.appViewModel.currentUrl;
                        _this.setPlaceholderText(null);
                        _this.textField.selectedTextRange = _this.textField.textRangeFromPositionToPosition(_this.textField.beginningOfDocument, _this.textField.endOfDocument);
                    }
                }, 500);
            }
            else {
                _this.setPlaceholderText(AppViewModel_1.appViewModel.currentUrl);
                _this.uiSearchBar.text = "";
                AppViewModel_1.appViewModel.hideCancelButton();
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