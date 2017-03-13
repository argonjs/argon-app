"use strict";
var URI = require("urijs");
var Argon = require("@argonjs/argon");
var application = require("application");
var utils = require("utils/utils");
var search_bar_1 = require("ui/search-bar");
var color_1 = require("color");
var enums_1 = require("ui/enums");
var gestures_1 = require("ui/gestures");
var bookmarks = require("./components/common/bookmarks");
var AppViewModel_1 = require("./components/common/AppViewModel");
var argon_device_service_1 = require("./components/common/argon-device-service");
AppViewModel_1.manager.reality.registerLoader(new (function (_super) {
    __extends(HostedRealityLoader, _super);
    function HostedRealityLoader() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.type = 'hosted';
        return _this;
    }
    HostedRealityLoader.prototype.load = function (reality, callback) {
        var url = reality.uri;
        var webView = exports.browserView.realityLayer.webView;
        var sessionCallback = function (data) {
            webView.off('session', sessionCallback);
            callback(data.session);
        };
        webView.on('session', sessionCallback);
        if (webView.src === url)
            webView.reload();
        else
            webView.src = url;
    };
    return HostedRealityLoader;
}(Argon.RealityLoader)));
//import * as orientationModule from 'nativescript-screen-orientation';
var orientationModule = require("nativescript-screen-orientation");
var searchBar;
var iosSearchBarController;
var androidSearchBarController;
AppViewModel_1.appViewModel.on('propertyChange', function (evt) {
    if (evt.propertyName === 'currentUri') {
        setSearchBarText(AppViewModel_1.appViewModel.currentUri);
    }
    else if (evt.propertyName === 'viewerEnabled') {
        AppViewModel_1.vuforiaDelegate.viewerEnabled = evt.value;
        if (evt.value) {
            orientationModule.setCurrentOrientation("landscape");
        }
        else {
            orientationModule.setCurrentOrientation("portrait");
            orientationModule.setCurrentOrientation("all");
        }
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
            exports.touchOverlayView.visibility = 'visible';
            exports.touchOverlayView.on(gestures_1.GestureTypes.touch, function () {
                exports.touchOverlayView.off(gestures_1.GestureTypes.touch);
                exports.touchOverlayView.visibility = 'collapse';
                AppViewModel_1.appViewModel.hideMenu();
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
            exports.touchOverlayView.off(gestures_1.GestureTypes.touch);
            exports.touchOverlayView.visibility = 'collapse';
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
            if (!AppViewModel_1.appViewModel.layerDetails.uri)
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
    else if (evt.propertyName === 'realityChooserOpen') {
        if (evt.value) {
            exports.realityChooserView.visibility = 'visible';
            exports.realityChooserView.animate({
                scale: {
                    x: 1,
                    y: 1
                },
                opacity: 1,
                duration: 150,
                curve: enums_1.AnimationCurve.easeInOut
            });
            AppViewModel_1.appViewModel.showCancelButton();
        }
        else {
            exports.realityChooserView.animate({
                scale: {
                    x: 1,
                    y: 1
                },
                opacity: 0,
                duration: 150,
                curve: enums_1.AnimationCurve.easeInOut
            }).then(function () {
                exports.realityChooserView.visibility = 'collapse';
                exports.realityChooserView.scaleX = 0.9;
                exports.realityChooserView.scaleY = 0.9;
            });
            blurSearchBar();
            AppViewModel_1.appViewModel.hideCancelButton();
        }
    }
    else if (evt.propertyName === 'bookmarksOpen') {
        if (evt.value) {
            exports.bookmarksView.visibility = 'visible';
            exports.bookmarksView.animate({
                scale: {
                    x: 1,
                    y: 1
                },
                opacity: 1,
                duration: 150,
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
                duration: 150,
                curve: enums_1.AnimationCurve.easeInOut
            }).then(function () {
                exports.bookmarksView.visibility = 'collapse';
                exports.bookmarksView.scaleX = 0.9;
                exports.bookmarksView.scaleY = 0.9;
            });
            blurSearchBar();
            AppViewModel_1.appViewModel.hideCancelButton();
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
            exports.layout.off(gestures_1.GestureTypes.touch);
        }
    }
});
function pageLoaded(args) {
    exports.page = args.object;
    exports.page.bindingContext = AppViewModel_1.appViewModel;
    AppViewModel_1.appViewModel.setReady();
    // Set the icon for the menu button
    var menuButton = exports.page.getViewById("menuButton");
    menuButton.text = String.fromCharCode(0xe5d4);
    // Set the icon for the overview button
    var overviewButton = exports.page.getViewById("overviewButton");
    overviewButton.text = String.fromCharCode(0xe53b);
}
exports.pageLoaded = pageLoaded;
function navigatedTo(args) {
    // focus on the topmost layer
    exports.browserView.setFocussedLayer(exports.browserView.layers[exports.browserView.layers.length - 1]);
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
    AppViewModel_1.manager.session.errorEvent.addEventListener(function (error) {
        alert(error.message);
        if (error.stack)
            console.log(error.stack);
    });
    application.on(application.orientationChangedEvent, function (args) {
        setTimeout(function () {
            argon_device_service_1.updateDisplayOrientation();
            var orientation = argon_device_service_1.getDisplayOrientation();
            if (orientation == 90 || orientation == -90 || AppViewModel_1.appViewModel.viewerEnabled) {
                exports.page.actionBarHidden = true;
                if (exports.page.android) {
                    var window = application.android.foregroundActivity.getWindow();
                    var decorView = window.getDecorView();
                    var uiOptions = android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                        | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;
                    decorView.setSystemUiVisibility(uiOptions);
                }
            }
            else {
                exports.page.actionBarHidden = false;
                if (exports.page.android) {
                    var window = application.android.foregroundActivity.getWindow();
                    var decorView = window.getDecorView();
                    var uiOptions = android.view.View.SYSTEM_UI_FLAG_VISIBLE;
                    decorView.setSystemUiVisibility(uiOptions);
                }
            }
        }, 500);
    });
    argon_device_service_1.updateDisplayOrientation();
    if (application.android) {
        var activity = application.android.foregroundActivity;
        activity.onBackPressed = function () {
            if (exports.browserView.focussedLayer != exports.browserView.realityLayer) {
                if (exports.browserView.focussedLayer.webView.android.canGoBack()) {
                    exports.browserView.focussedLayer.webView.android.goBack();
                }
            }
        };
    }
    AppViewModel_1.appViewModel.on(AppViewModel_1.AppViewModel.loadUrlEvent, function (data) {
        exports.browserView.loadUrl(data.url);
        blurSearchBar();
    });
}
exports.navigatedTo = navigatedTo;
application.on(application.resumeEvent, function () {
    if (application.android) {
        // on android the page is unloaded/reloaded after a suspend
        // open back to bookmarks if necessary
        if (AppViewModel_1.appViewModel.bookmarksOpen) {
            // force a property change event
            AppViewModel_1.appViewModel.notifyPropertyChange('bookmarksOpen', true);
        }
    }
});
function layoutLoaded(args) {
    exports.layout = args.object;
    if (exports.layout.ios) {
        exports.layout.ios.layer.masksToBounds = false;
    }
}
exports.layoutLoaded = layoutLoaded;
function headerLoaded(args) {
    exports.headerView = args.object;
}
exports.headerLoaded = headerLoaded;
function searchBarLoaded(args) {
    searchBar = args.object;
    searchBar.on(search_bar_1.SearchBar.submitEvent, function () {
        var urlString = searchBar.text;
        if (urlString.indexOf('//') === -1)
            urlString = '//' + urlString;
        var url = URI(urlString);
        if (url.protocol() !== "http" && url.protocol() !== "https") {
            url.protocol("http");
        }
        setSearchBarText(url.toString());
        AppViewModel_1.appViewModel.loadUrl(url.toString());
        AppViewModel_1.appViewModel.hideBookmarks();
        AppViewModel_1.appViewModel.hideRealityChooser();
        AppViewModel_1.appViewModel.hideCancelButton();
        blurSearchBar();
    });
    if (application.ios) {
        iosSearchBarController = new IOSSearchBarController(searchBar);
    }
    if (application.android) {
        androidSearchBarController = new AndroidSearchBarController(searchBar);
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
    searchBar.dismissSoftInput();
    if (searchBar.android) {
        searchBar.android.clearFocus();
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
    debug.isUserInteractionEnabled = false;
}
exports.browserViewLoaded = browserViewLoaded;
function bookmarksViewLoaded(args) {
    exports.bookmarksView = args.object;
    exports.bookmarksView.scaleX = 0.9;
    exports.bookmarksView.scaleY = 0.9;
    exports.bookmarksView.opacity = 0;
}
exports.bookmarksViewLoaded = bookmarksViewLoaded;
function realityChooserLoaded(args) {
    exports.realityChooserView = args.object;
    exports.realityChooserView.scaleX = 0.9;
    exports.realityChooserView.scaleY = 0.9;
    exports.realityChooserView.opacity = 0;
}
exports.realityChooserLoaded = realityChooserLoaded;
function touchOverlayLoaded(args) {
    exports.touchOverlayView = args.object;
}
exports.touchOverlayLoaded = touchOverlayLoaded;
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
    if (!!AppViewModel_1.appViewModel.layerDetails.uri)
        AppViewModel_1.appViewModel.hideBookmarks();
    AppViewModel_1.appViewModel.hideRealityChooser();
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
    if (exports.browserView.focussedLayer === exports.browserView.realityLayer) {
        AppViewModel_1.manager.reality.setDesired(AppViewModel_1.manager.reality.getCurrent());
    }
    else {
        exports.browserView.focussedLayer.webView.reload();
    }
}
exports.onReload = onReload;
function onFavoriteToggle(args) {
    var url = AppViewModel_1.appViewModel.layerDetails.uri;
    var bookmarkItem = bookmarks.favoriteMap.get(url);
    if (!bookmarkItem) {
        bookmarks.favoriteList.push(new bookmarks.BookmarkItem({
            uri: url,
            title: exports.browserView.focussedLayer.webView.title
        }));
    }
    else {
        var i = bookmarks.favoriteList.indexOf(bookmarkItem);
        bookmarks.favoriteList.splice(i, 1);
    }
}
exports.onFavoriteToggle = onFavoriteToggle;
function onInteractionToggle(args) {
    AppViewModel_1.appViewModel.toggleInteractionMode();
}
exports.onInteractionToggle = onInteractionToggle;
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
function onSelectReality(args) {
    AppViewModel_1.appViewModel.showRealityChooser();
    AppViewModel_1.appViewModel.showCancelButton();
    AppViewModel_1.appViewModel.hideMenu();
}
exports.onSelectReality = onSelectReality;
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
        this.uiSearchBar.keyboardType = 3 /* URL */;
        this.uiSearchBar.autocapitalizationType = 0 /* None */;
        this.uiSearchBar.searchBarStyle = 2 /* Minimal */;
        this.uiSearchBar.returnKeyType = 1 /* Go */;
        this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), 0 /* Search */, 0 /* Normal */);
        this.textField.leftViewMode = 0 /* Never */;
        var textFieldEditHandler = function () {
            AppViewModel_1.appViewModel.hideMenu();
            if (utils.ios.getter(UIResponder, _this.uiSearchBar.isFirstResponder)) {
                if (exports.browserView.focussedLayer === exports.browserView.realityLayer) {
                    AppViewModel_1.appViewModel.showRealityChooser();
                }
                else {
                    AppViewModel_1.appViewModel.showBookmarks();
                }
                AppViewModel_1.appViewModel.showCancelButton();
                setTimeout(function () {
                    if (_this.uiSearchBar.text === "") {
                        _this.uiSearchBar.text = AppViewModel_1.appViewModel.layerDetails.uri;
                        _this.setPlaceholderText("");
                        _this.textField.selectedTextRange = _this.textField.textRangeFromPositionToPosition(_this.textField.beginningOfDocument, _this.textField.endOfDocument);
                    }
                }, 500);
                exports.layout.on(gestures_1.GestureTypes.touch, function () {
                    blurSearchBar();
                    exports.layout.off(gestures_1.GestureTypes.touch);
                    if (!exports.browserView.focussedLayer.webView.url)
                        AppViewModel_1.appViewModel.hideCancelButton();
                });
            }
            else {
                _this.setPlaceholderText(AppViewModel_1.appViewModel.layerDetails.uri);
                _this.uiSearchBar.text = "";
            }
        };
        application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
        application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);
    }
    IOSSearchBarController.prototype.setPlaceholderText = function (text) {
        if (text) {
            var attributes = NSMutableDictionary.new().init();
            attributes.setObjectForKey(utils.ios.getter(UIColor, UIColor.blackColor), NSForegroundColorAttributeName);
            this.textField.attributedPlaceholder = NSAttributedString.alloc().initWithStringAttributes(text, attributes);
        }
        else {
            this.textField.placeholder = searchBar.hint;
        }
    };
    IOSSearchBarController.prototype.setText = function (url) {
        if (!utils.ios.getter(UIResponder, this.uiSearchBar.isFirstResponder)) {
            this.setPlaceholderText(url);
        }
    };
    return IOSSearchBarController;
}());
var AndroidSearchBarController = (function () {
    function AndroidSearchBarController(searchBar) {
        this.searchBar = searchBar;
        this.searchView = searchBar.android;
        this.searchView.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        this.searchView.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_GO);
        this.searchView.clearFocus();
        var focusHandler = new android.view.View.OnFocusChangeListener({
            onFocusChange: function (v, hasFocus) {
                if (hasFocus) {
                    if (exports.browserView.focussedLayer === exports.browserView.realityLayer) {
                        AppViewModel_1.appViewModel.showRealityChooser();
                    }
                    else {
                        AppViewModel_1.appViewModel.showBookmarks();
                    }
                    AppViewModel_1.appViewModel.showCancelButton();
                }
            }
        });
        this.searchView.setOnQueryTextFocusChangeListener(focusHandler);
    }
    return AndroidSearchBarController;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwyQkFBNkI7QUFDN0Isc0NBQXdDO0FBQ3hDLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBTXhDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBSXhDLHlEQUEyRDtBQUMzRCxpRUFBd0g7QUFDeEgsaUZBQXlHO0FBRXpHLHNCQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztJQUFzQyx1Q0FBbUI7SUFBckQ7UUFBQSxxRUFhbEM7UUFaRyxVQUFJLEdBQUcsUUFBUSxDQUFDOztJQVlwQixDQUFDO0lBWEcsa0NBQUksR0FBSixVQUFLLE9BQTBCLEVBQUUsUUFBaUQ7UUFDOUUsSUFBTSxHQUFHLEdBQVUsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUMvQixJQUFNLE9BQU8sR0FBRyxtQkFBVyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUM7UUFDakQsSUFBSSxlQUFlLEdBQUcsVUFBQyxJQUFxQjtZQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUN4QyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQTtRQUNELE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDO1lBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFDLElBQUk7WUFBQyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUMzQixDQUFDO0lBQ0wsMEJBQUM7QUFBRCxDQUFDLEFBYmtDLENBQWtDLEtBQUssQ0FBQyxhQUFhLEVBYXZGLENBQUMsQ0FBQztBQUVILHVFQUF1RTtBQUN2RSxJQUFJLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBV25FLElBQUksU0FBbUIsQ0FBQztBQUN4QixJQUFJLHNCQUE2QyxDQUFDO0FBQ2xELElBQUksMEJBQXFELENBQUM7QUFFMUQsMkJBQVksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsVUFBQyxHQUFzQjtJQUNyRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDcEMsZ0JBQWdCLENBQUMsMkJBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQztRQUM1Qyw4QkFBZSxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1osaUJBQWlCLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osaUJBQWlCLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEQsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUVMLENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1osMkJBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM1QixnQkFBUSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7WUFDaEMsZ0JBQVEsQ0FBQyxPQUFPLENBQUM7Z0JBQ2IsS0FBSyxFQUFFO29CQUNILENBQUMsRUFBRSxDQUFDO29CQUNKLENBQUMsRUFBRSxDQUFDO2lCQUNQO2dCQUNELFFBQVEsRUFBRSxHQUFHO2dCQUNiLE9BQU8sRUFBRSxDQUFDO2dCQUNWLEtBQUssRUFBRSxzQkFBYyxDQUFDLFNBQVM7YUFDbEMsQ0FBQyxDQUFDO1lBQ0gsd0JBQWdCLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUN4Qyx3QkFBZ0IsQ0FBQyxFQUFFLENBQUMsdUJBQVksQ0FBQyxLQUFLLEVBQUM7Z0JBQ25DLHdCQUFnQixDQUFDLEdBQUcsQ0FBQyx1QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN6Qyx3QkFBZ0IsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO2dCQUN6QywyQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzVCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osZ0JBQVEsQ0FBQyxPQUFPLENBQUM7Z0JBQ2IsS0FBSyxFQUFFO29CQUNILENBQUMsRUFBRSxDQUFDO29CQUNKLENBQUMsRUFBRSxDQUFDO2lCQUNQO2dCQUNELFFBQVEsRUFBRSxHQUFHO2dCQUNiLE9BQU8sRUFBRSxDQUFDO2dCQUNWLEtBQUssRUFBRSxzQkFBYyxDQUFDLFNBQVM7YUFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixnQkFBUSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDckMsQ0FBQyxDQUFDLENBQUM7WUFDSCx3QkFBZ0IsQ0FBQyxHQUFHLENBQUMsdUJBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6Qyx3QkFBZ0IsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdDLENBQUM7SUFDTCxDQUFDO0lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssY0FBYyxDQUFDLENBQUMsQ0FBQztRQUMzQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNaLG1CQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDM0IsMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM3QixTQUFTLENBQUMsT0FBTyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFDO2dCQUN4QixPQUFPLEVBQUUsQ0FBQztnQkFDVixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxTQUFTO2FBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osU0FBUyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFNLFNBQVMsR0FBRyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RCxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUNqQyxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUN0QixTQUFTLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLFNBQVMsQ0FBQyxPQUFPLENBQUM7Z0JBQ2QsU0FBUyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO2dCQUNwQixPQUFPLEVBQUMsQ0FBQzthQUNaLENBQUMsQ0FBQTtRQUNOLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLG1CQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDM0IsRUFBRSxDQUFDLENBQUMsQ0FBQywyQkFBWSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7Z0JBQUMsMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNqRSxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUNqQyxTQUFTLENBQUMsT0FBTyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBQztnQkFDckIsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUE7WUFDRixJQUFNLFdBQVMsR0FBRyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RCxXQUFTLENBQUMsT0FBTyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFDO2dCQUN2QixPQUFPLEVBQUMsQ0FBQzthQUNaLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osV0FBUyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUNqRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNaLDBCQUFrQixDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7WUFDMUMsMEJBQWtCLENBQUMsT0FBTyxDQUFDO2dCQUN2QixLQUFLLEVBQUU7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7aUJBQ047Z0JBQ0QsT0FBTyxFQUFDLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUE7WUFDRiwyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDcEMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osMEJBQWtCLENBQUMsT0FBTyxDQUFDO2dCQUN2QixLQUFLLEVBQUU7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7aUJBQ047Z0JBQ0QsT0FBTyxFQUFDLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNKLDBCQUFrQixDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQzNDLDBCQUFrQixDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7Z0JBQ2hDLDBCQUFrQixDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUE7WUFDRixhQUFhLEVBQUUsQ0FBQztZQUNoQiwyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDcEMsQ0FBQztJQUNMLENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1oscUJBQWEsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ3JDLHFCQUFhLENBQUMsT0FBTyxDQUFDO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7aUJBQ047Z0JBQ0QsT0FBTyxFQUFDLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUE7UUFDTixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixxQkFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDbEIsS0FBSyxFQUFFO29CQUNILENBQUMsRUFBQyxDQUFDO29CQUNILENBQUMsRUFBQyxDQUFDO2lCQUNOO2dCQUNELE9BQU8sRUFBQyxDQUFDO2dCQUNULFFBQVEsRUFBRSxHQUFHO2dCQUNiLEtBQUssRUFBRSxzQkFBYyxDQUFDLFNBQVM7YUFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixxQkFBYSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQ3RDLHFCQUFhLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztnQkFDM0IscUJBQWEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFBO1lBQ0YsYUFBYSxFQUFFLENBQUM7WUFDaEIsMkJBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3BDLENBQUM7SUFDTCxDQUFDO0lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQ2hELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1osSUFBTSxnQkFBYyxHQUFHLGtCQUFVLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDaEUsZ0JBQWMsQ0FBQyxPQUFPLENBQUM7Z0JBQ25CLE9BQU8sRUFBQyxDQUFDO2FBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixnQkFBYyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDM0MsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFNLFlBQVUsR0FBRyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4RCxZQUFVLENBQUMsT0FBTyxDQUFDO2dCQUNmLE9BQU8sRUFBQyxDQUFDO2FBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixZQUFVLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQTtZQUNGLElBQU0sWUFBWSxHQUFHLGtCQUFVLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzVELFlBQVksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ3BDLFlBQVksQ0FBQyxPQUFPLENBQUM7Z0JBQ2pCLE9BQU8sRUFBQyxDQUFDO2FBQ1osQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBTSxjQUFjLEdBQUcsa0JBQVUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNoRSxjQUFjLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUN0QyxjQUFjLENBQUMsT0FBTyxDQUFDO2dCQUNuQixPQUFPLEVBQUMsQ0FBQzthQUNaLENBQUMsQ0FBQTtZQUNGLElBQU0sVUFBVSxHQUFHLGtCQUFVLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hELFVBQVUsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ2xDLFVBQVUsQ0FBQyxPQUFPLENBQUM7Z0JBQ2YsT0FBTyxFQUFDLENBQUM7YUFDWixDQUFDLENBQUE7WUFDRixJQUFNLGNBQVksR0FBRyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1RCxjQUFZLENBQUMsT0FBTyxDQUFDO2dCQUNqQixPQUFPLEVBQUMsQ0FBQzthQUNaLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osY0FBWSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDekMsQ0FBQyxDQUFDLENBQUE7WUFFRixjQUFNLENBQUMsR0FBRyxDQUFDLHVCQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsQ0FBQztJQUNMLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLG9CQUEyQixJQUFJO0lBRTNCLFlBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ25CLFlBQUksQ0FBQyxjQUFjLEdBQUcsMkJBQVksQ0FBQztJQUNuQywyQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRXhCLG1DQUFtQztJQUNuQyxJQUFNLFVBQVUsR0FBWSxZQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNELFVBQVUsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUU5Qyx1Q0FBdUM7SUFDdkMsSUFBTSxjQUFjLEdBQVksWUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ25FLGNBQWMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0RCxDQUFDO0FBYkQsZ0NBYUM7QUFFRCxxQkFBNEIsSUFBSTtJQUU1Qiw2QkFBNkI7SUFDN0IsbUJBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU5RSwyRUFBMkU7SUFDM0UsRUFBRSxDQUFDLENBQUMsWUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDWCxVQUFVLENBQUM7WUFDUCxZQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDekIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ0wsV0FBVyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyx3Q0FBd0MsRUFBRTtZQUM5RSxZQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDekIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUU3QixzQkFBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsVUFBQyxLQUFLO1FBQzlDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztZQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsVUFBQyxJQUFJO1FBQ3JELFVBQVUsQ0FBQztZQUNQLCtDQUF3QixFQUFFLENBQUM7WUFDM0IsSUFBTSxXQUFXLEdBQUcsNENBQXFCLEVBQUUsQ0FBQztZQUM1QyxFQUFFLENBQUMsQ0FBQyxXQUFXLElBQUksRUFBRSxJQUFJLFdBQVcsSUFBSSxDQUFDLEVBQUUsSUFBSSwyQkFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hFLFlBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO2dCQUM1QixFQUFFLENBQUMsQ0FBQyxZQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDZixJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNoRSxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3RDLElBQUksU0FBUyxHQUFTLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLCtCQUErQjswQkFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsZ0NBQWdDOzBCQUNuRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxxQ0FBcUM7MEJBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLDRCQUE0QjswQkFDL0MsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMseUJBQXlCOzBCQUM1QyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyw4QkFBOEIsQ0FBQztvQkFDbEUsU0FBUyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQyxDQUFDO1lBQ0wsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLFlBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO2dCQUM3QixFQUFFLENBQUMsQ0FBQyxZQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDZixJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNoRSxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3RDLElBQUksU0FBUyxHQUFTLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLHNCQUFzQixDQUFDO29CQUNoRSxTQUFTLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQy9DLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ1gsQ0FBQyxDQUFDLENBQUM7SUFFSCwrQ0FBd0IsRUFBRSxDQUFDO0lBRTNCLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7UUFDdEQsUUFBUSxDQUFDLGFBQWEsR0FBRztZQUNyQixFQUFFLENBQUMsQ0FBQyxtQkFBVyxDQUFDLGFBQWEsSUFBSSxtQkFBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELEVBQUUsQ0FBQyxDQUFDLG1CQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN4RCxtQkFBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN2RCxDQUFDO1lBQ0wsQ0FBQztRQUNMLENBQUMsQ0FBQTtJQUNMLENBQUM7SUFFRCwyQkFBWSxDQUFDLEVBQUUsQ0FBQywyQkFBWSxDQUFDLFlBQVksRUFBRSxVQUFDLElBQXFCO1FBQzdELG1CQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixhQUFhLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUM7QUFwRUQsa0NBb0VDO0FBRUQsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFO0lBQ3BDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLDJEQUEyRDtRQUMzRCxzQ0FBc0M7UUFDdEMsRUFBRSxDQUFDLENBQUMsMkJBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQzdCLGdDQUFnQztZQUNoQywyQkFBWSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0wsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsc0JBQTZCLElBQUk7SUFDN0IsY0FBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDcEIsRUFBRSxDQUFDLENBQUMsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDYixjQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQzNDLENBQUM7QUFDTCxDQUFDO0FBTEQsb0NBS0M7QUFFRCxzQkFBNkIsSUFBSTtJQUM3QixrQkFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDN0IsQ0FBQztBQUZELG9DQUVDO0FBRUQseUJBQWdDLElBQUk7SUFDaEMsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFFeEIsU0FBUyxDQUFDLEVBQUUsQ0FBQyxzQkFBUyxDQUFDLFdBQVcsRUFBRTtRQUNoQyxJQUFJLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFBQyxTQUFTLEdBQUcsSUFBSSxHQUFHLFNBQVMsQ0FBQztRQUVqRSxJQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxRCxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFDRCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNqQywyQkFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyQywyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzdCLDJCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNsQywyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDaEMsYUFBYSxFQUFFLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQixzQkFBc0IsR0FBRyxJQUFJLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0QiwwQkFBMEIsR0FBRyxJQUFJLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7QUFDTCxDQUFDO0FBMUJELDBDQTBCQztBQUVELDBCQUEwQixHQUFVO0lBQ2hDLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUN6QixzQkFBc0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osU0FBUyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7SUFDekIsQ0FBQztBQUNMLENBQUM7QUFFRDtJQUNJLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQzdCLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbkMsQ0FBQztBQUNMLENBQUM7QUFFRCwyQkFBa0MsSUFBSTtJQUNsQyxtQkFBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFFMUIsdUJBQXVCO0lBQ3ZCLElBQUksS0FBSyxHQUFzQixtQkFBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckUsS0FBSyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztJQUN0QyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO0lBQ3BDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxhQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdEQsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7SUFDL0IsS0FBSyxDQUFDLHdCQUF3QixHQUFHLEtBQUssQ0FBQztBQUMzQyxDQUFDO0FBVkQsOENBVUM7QUFHRCw2QkFBb0MsSUFBSTtJQUNwQyxxQkFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDNUIscUJBQWEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQzNCLHFCQUFhLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUMzQixxQkFBYSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUxELGtEQUtDO0FBRUQsOEJBQXFDLElBQUk7SUFDckMsMEJBQWtCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNqQywwQkFBa0IsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQ2hDLDBCQUFrQixDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7SUFDaEMsMEJBQWtCLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBTEQsb0RBS0M7QUFFRCw0QkFBbUMsSUFBSTtJQUNuQyx3QkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ25DLENBQUM7QUFGRCxnREFFQztBQUVELGtGQUFrRjtBQUNsRixvQkFBMkIsSUFBSTtJQUMzQixnQkFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDdkIsZ0JBQVEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLGdCQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztJQUNyQixnQkFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDcEIsZ0JBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLGdCQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBUEQsZ0NBT0M7QUFFRCx3QkFBK0IsSUFBSTtJQUMvQiwyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzdCLDJCQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUNwQyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxrQkFBeUIsSUFBSTtJQUN6QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsMkJBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO1FBQUMsMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNsRSwyQkFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDbEMsMkJBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ2hDLGFBQWEsRUFBRSxDQUFDO0FBQ3BCLENBQUM7QUFMRCw0QkFLQztBQUVELHNCQUE2QixJQUFJO0lBQzdCLG1CQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDdkIsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSEQsb0NBR0M7QUFFRCxrQkFBeUIsSUFBSTtJQUN6QixFQUFFLENBQUMsQ0FBQyxtQkFBVyxDQUFDLGFBQWEsS0FBSyxtQkFBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDekQsc0JBQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLHNCQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osbUJBQVcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQy9DLENBQUM7QUFDTCxDQUFDO0FBTkQsNEJBTUM7QUFFRCwwQkFBaUMsSUFBSTtJQUNqQyxJQUFNLEdBQUcsR0FBRywyQkFBWSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7SUFDMUMsSUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQztZQUNuRCxHQUFHLEVBQUUsR0FBRztZQUNSLEtBQUssRUFBRSxtQkFBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSztTQUNqRCxDQUFDLENBQUMsQ0FBQztJQUNSLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0FBQ0wsQ0FBQztBQVpELDRDQVlDO0FBRUQsNkJBQW9DLElBQUk7SUFDcEMsMkJBQVksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0FBQ3pDLENBQUM7QUFGRCxrREFFQztBQUVELG9CQUEyQixJQUFJO0lBQzNCLDJCQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUIsMkJBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSkQsZ0NBSUM7QUFFRCxnQkFBdUIsSUFBSTtJQUN2QiwyQkFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQzlCLENBQUM7QUFGRCx3QkFFQztBQUVELHlCQUFnQyxJQUFJO0lBQ2hDLDJCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUNsQywyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDaEMsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSkQsMENBSUM7QUFFRCxvQkFBMkIsSUFBSTtJQUMzQiwwQ0FBMEM7SUFDMUMsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSEQsZ0NBR0M7QUFFRCx3QkFBK0IsSUFBSTtJQUMvQiwyQkFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQzVCLDJCQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDNUIsQ0FBQztBQUhELHdDQUdDO0FBRUQsdUJBQThCLElBQUk7SUFDOUIsMkJBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMvQixDQUFDO0FBRkQsc0NBRUM7QUFFRDtJQUtJLGdDQUFtQixTQUFtQjtRQUF0QyxpQkEyQ0M7UUEzQ2tCLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFDbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFN0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsV0FBa0IsQ0FBQztRQUNuRCxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixHQUFHLFlBQWlDLENBQUM7UUFDNUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEdBQUcsZUFBd0IsQ0FBQztRQUMzRCxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsR0FBRyxVQUFrQixDQUFDO1FBQ3BELElBQUksQ0FBQyxXQUFXLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQXNCLEVBQUUsY0FBcUIsQ0FBQyxDQUFBO1FBRTVHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLGFBQXlCLENBQUM7UUFFeEQsSUFBTSxvQkFBb0IsR0FBRztZQUN6QiwyQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRSxFQUFFLENBQUMsQ0FBQyxtQkFBVyxDQUFDLGFBQWEsS0FBSyxtQkFBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQ3pELDJCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDdEMsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSiwyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNqQyxDQUFDO2dCQUNELDJCQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFFaEMsVUFBVSxDQUFDO29CQUNQLEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQy9CLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLDJCQUFZLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQzt3QkFDdEQsS0FBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUM1QixLQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxLQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUN4SixDQUFDO2dCQUNMLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFUCxjQUFNLENBQUMsRUFBRSxDQUFDLHVCQUFZLENBQUMsS0FBSyxFQUFDO29CQUN6QixhQUFhLEVBQUUsQ0FBQztvQkFDaEIsY0FBTSxDQUFDLEdBQUcsQ0FBQyx1QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMvQixFQUFFLENBQUMsQ0FBQyxDQUFDLG1CQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7d0JBQUMsMkJBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNoRixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixLQUFJLENBQUMsa0JBQWtCLENBQUMsMkJBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZELEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUMvQixDQUFDO1FBQ0wsQ0FBQyxDQUFBO1FBRUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQywwQ0FBMEMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQzFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsd0NBQXdDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUM1RyxDQUFDO0lBRU8sbURBQWtCLEdBQTFCLFVBQTJCLElBQVc7UUFDbEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNQLElBQUksVUFBVSxHQUFvQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMvRixVQUFVLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsOEJBQThCLENBQUMsQ0FBQztZQUN6RyxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ2hELENBQUM7SUFDTCxDQUFDO0lBRU0sd0NBQU8sR0FBZCxVQUFlLEdBQUc7UUFDZCxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxDQUFDO0lBQ0wsQ0FBQztJQUNMLDZCQUFDO0FBQUQsQ0FBQyxBQWpFRCxJQWlFQztBQUVEO0lBSUksb0NBQW1CLFNBQW1CO1FBQW5CLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFDbEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDO1FBRXBDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzdLLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRTdCLElBQU0sWUFBWSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUM7WUFDN0QsYUFBYSxZQUFDLENBQW9CLEVBQUUsUUFBaUI7Z0JBQ2pELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ1gsRUFBRSxDQUFDLENBQUMsbUJBQVcsQ0FBQyxhQUFhLEtBQUssbUJBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO3dCQUN6RCwyQkFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7b0JBQ3RDLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDakMsQ0FBQztvQkFDRCwyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3BDLENBQUM7WUFDTCxDQUFDO1NBQ0osQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQ0FBaUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBQ0wsaUNBQUM7QUFBRCxDQUFDLEFBMUJELElBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgVVJJIGZyb20gJ3VyaWpzJztcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJztcbmltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gJ2FwcGxpY2F0aW9uJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCB7U2VhcmNoQmFyfSBmcm9tICd1aS9zZWFyY2gtYmFyJztcbmltcG9ydCB7UGFnZX0gZnJvbSAndWkvcGFnZSc7XG5pbXBvcnQge0NyZWF0ZVZpZXdFdmVudERhdGF9IGZyb20gJ3VpL3BsYWNlaG9sZGVyJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtWaWV3LCBnZXRWaWV3QnlJZH0gZnJvbSAndWkvY29yZS92aWV3JztcbmltcG9ydCB7SHRtbFZpZXd9IGZyb20gJ3VpL2h0bWwtdmlldydcbmltcG9ydCB7Q29sb3J9IGZyb20gJ2NvbG9yJztcbmltcG9ydCB7UHJvcGVydHlDaGFuZ2VEYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IHtBbmltYXRpb25DdXJ2ZX0gZnJvbSAndWkvZW51bXMnXG5pbXBvcnQge0dlc3R1cmVUeXBlc30gZnJvbSAndWkvZ2VzdHVyZXMnXG5cbmltcG9ydCB7U2Vzc2lvbkV2ZW50RGF0YX0gZnJvbSAnYXJnb24td2ViLXZpZXcnO1xuaW1wb3J0IHtCcm93c2VyVmlld30gZnJvbSAnLi9jb21wb25lbnRzL2Jyb3dzZXItdmlldyc7XG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9jb21wb25lbnRzL2NvbW1vbi9ib29rbWFya3MnO1xuaW1wb3J0IHttYW5hZ2VyLCBhcHBWaWV3TW9kZWwsIEFwcFZpZXdNb2RlbCwgTG9hZFVybEV2ZW50RGF0YSwgdnVmb3JpYURlbGVnYXRlfSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL0FwcFZpZXdNb2RlbCc7XG5pbXBvcnQge3VwZGF0ZURpc3BsYXlPcmllbnRhdGlvbiwgZ2V0RGlzcGxheU9yaWVudGF0aW9ufSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL2FyZ29uLWRldmljZS1zZXJ2aWNlJztcblxubWFuYWdlci5yZWFsaXR5LnJlZ2lzdGVyTG9hZGVyKG5ldyBjbGFzcyBIb3N0ZWRSZWFsaXR5TG9hZGVyIGV4dGVuZHMgQXJnb24uUmVhbGl0eUxvYWRlciB7XG4gICAgdHlwZSA9ICdob3N0ZWQnO1xuICAgIGxvYWQocmVhbGl0eTogQXJnb24uUmVhbGl0eVZpZXcsIGNhbGxiYWNrOihyZWFsaXR5U2Vzc2lvbjpBcmdvbi5TZXNzaW9uUG9ydCk9PnZvaWQpOnZvaWQge1xuICAgICAgICBjb25zdCB1cmw6c3RyaW5nID0gcmVhbGl0eS51cmk7XG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIud2ViVmlldztcbiAgICAgICAgbGV0IHNlc3Npb25DYWxsYmFjayA9IChkYXRhOlNlc3Npb25FdmVudERhdGEpPT57XG4gICAgICAgICAgICB3ZWJWaWV3Lm9mZignc2Vzc2lvbicsIHNlc3Npb25DYWxsYmFjayk7XG4gICAgICAgICAgICBjYWxsYmFjayhkYXRhLnNlc3Npb24pO1xuICAgICAgICB9XG4gICAgICAgIHdlYlZpZXcub24oJ3Nlc3Npb24nLCBzZXNzaW9uQ2FsbGJhY2spO1xuICAgICAgICBpZiAod2ViVmlldy5zcmMgPT09IHVybCkgd2ViVmlldy5yZWxvYWQoKTtcbiAgICAgICAgZWxzZSB3ZWJWaWV3LnNyYyA9IHVybDtcbiAgICB9XG59KTtcblxuLy9pbXBvcnQgKiBhcyBvcmllbnRhdGlvbk1vZHVsZSBmcm9tICduYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uJztcbnZhciBvcmllbnRhdGlvbk1vZHVsZSA9IHJlcXVpcmUoXCJuYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uXCIpO1xuXG5leHBvcnQgbGV0IHBhZ2U6UGFnZTtcbmV4cG9ydCBsZXQgbGF5b3V0OlZpZXc7XG5leHBvcnQgbGV0IHRvdWNoT3ZlcmxheVZpZXc6VmlldztcbmV4cG9ydCBsZXQgaGVhZGVyVmlldzpWaWV3O1xuZXhwb3J0IGxldCBtZW51VmlldzpWaWV3O1xuZXhwb3J0IGxldCBicm93c2VyVmlldzpCcm93c2VyVmlldztcbmV4cG9ydCBsZXQgYm9va21hcmtzVmlldzpWaWV3O1xuZXhwb3J0IGxldCByZWFsaXR5Q2hvb3NlclZpZXc6VmlldztcblxubGV0IHNlYXJjaEJhcjpTZWFyY2hCYXI7XG5sZXQgaW9zU2VhcmNoQmFyQ29udHJvbGxlcjpJT1NTZWFyY2hCYXJDb250cm9sbGVyO1xubGV0IGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyOkFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyO1xuXG5hcHBWaWV3TW9kZWwub24oJ3Byb3BlcnR5Q2hhbmdlJywgKGV2dDpQcm9wZXJ0eUNoYW5nZURhdGEpPT57XG4gICAgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdjdXJyZW50VXJpJykge1xuICAgICAgICBzZXRTZWFyY2hCYXJUZXh0KGFwcFZpZXdNb2RlbC5jdXJyZW50VXJpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ3ZpZXdlckVuYWJsZWQnKSB7XG4gICAgICAgIHZ1Zm9yaWFEZWxlZ2F0ZS52aWV3ZXJFbmFibGVkID0gZXZ0LnZhbHVlO1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJsYW5kc2NhcGVcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJwb3J0cmFpdFwiKTtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImFsbFwiKTtcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdtZW51T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xuICAgICAgICAgICAgbWVudVZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDogMSxcbiAgICAgICAgICAgICAgICAgICAgeTogMSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1lbnVWaWV3LnZpc2liaWxpdHkgPSBcImNvbGxhcHNlXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdvdmVydmlld09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LnNob3dPdmVydmlldygpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMDAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgc2VhcmNoQmFyLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2FkZEJ1dHRvbicpO1xuICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBhZGRCdXR0b24ub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICBhZGRCdXR0b24udHJhbnNsYXRlWCA9IC0xMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicm93c2VyVmlldy5oaWRlT3ZlcnZpZXcoKTtcbiAgICAgICAgICAgIGlmICghYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICBzZWFyY2hCYXIudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnYWRkQnV0dG9uJyk7XG4gICAgICAgICAgICBhZGRCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDotMTAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAncmVhbGl0eUNob29zZXJPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVZID0gMC45O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2Jvb2ttYXJrc09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjAsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfSBcbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnY2FuY2VsQnV0dG9uU2hvd24nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnb3ZlcnZpZXdCdXR0b24nKTtcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG1lbnVCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgY2FuY2VsQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnY2FuY2VsQnV0dG9uJyk7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdvdmVydmlld0J1dHRvbicpO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2NhbmNlbEJ1dHRvbicpO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxheW91dC5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG5cbmV4cG9ydCBmdW5jdGlvbiBwYWdlTG9hZGVkKGFyZ3MpIHtcblxuICAgIHBhZ2UgPSBhcmdzLm9iamVjdDtcbiAgICBwYWdlLmJpbmRpbmdDb250ZXh0ID0gYXBwVmlld01vZGVsO1xuICAgIGFwcFZpZXdNb2RlbC5zZXRSZWFkeSgpO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgbWVudSBidXR0b25cbiAgICBjb25zdCBtZW51QnV0dG9uID0gPEJ1dHRvbj4gcGFnZS5nZXRWaWV3QnlJZChcIm1lbnVCdXR0b25cIik7XG4gICAgbWVudUJ1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1ZDQpO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgb3ZlcnZpZXcgYnV0dG9uXG4gICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwib3ZlcnZpZXdCdXR0b25cIik7XG4gICAgb3ZlcnZpZXdCdXR0b24udGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhlNTNiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRlZFRvKGFyZ3MpIHtcbiAgICBcbiAgICAvLyBmb2N1cyBvbiB0aGUgdG9wbW9zdCBsYXllclxuICAgIGJyb3dzZXJWaWV3LnNldEZvY3Vzc2VkTGF5ZXIoYnJvd3NlclZpZXcubGF5ZXJzW2Jyb3dzZXJWaWV3LmxheWVycy5sZW5ndGgtMV0pO1xuXG4gICAgLy8gd29ya2Fyb3VuZCAoc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9OYXRpdmVTY3JpcHQvTmF0aXZlU2NyaXB0L2lzc3Vlcy82NTkpXG4gICAgaWYgKHBhZ2UuaW9zKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHBhZ2UucmVxdWVzdExheW91dCgpO1xuICAgICAgICB9LCAwKVxuICAgICAgICBhcHBsaWNhdGlvbi5pb3MuYWRkTm90aWZpY2F0aW9uT2JzZXJ2ZXIoVUlBcHBsaWNhdGlvbkRpZEJlY29tZUFjdGl2ZU5vdGlmaWNhdGlvbiwgKCkgPT4ge1xuICAgICAgICAgICAgcGFnZS5yZXF1ZXN0TGF5b3V0KCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIFxuICAgIG1hbmFnZXIuc2Vzc2lvbi5lcnJvckV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKGVycm9yKT0+e1xuICAgICAgICBhbGVydChlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgaWYgKGVycm9yLnN0YWNrKSBjb25zb2xlLmxvZyhlcnJvci5zdGFjayk7XG4gICAgfSlcblxuICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoYXJncyk9PntcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgdXBkYXRlRGlzcGxheU9yaWVudGF0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IGdldERpc3BsYXlPcmllbnRhdGlvbigpO1xuICAgICAgICAgICAgaWYgKG9yaWVudGF0aW9uID09IDkwIHx8IG9yaWVudGF0aW9uID09IC05MCB8fCBhcHBWaWV3TW9kZWwudmlld2VyRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIHBhZ2UuYWN0aW9uQmFySGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAocGFnZS5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB3aW5kb3cgPSBhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eS5nZXRXaW5kb3coKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRlY29yVmlldyA9IHdpbmRvdy5nZXREZWNvclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHVpT3B0aW9ucyA9ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19JTU1FUlNJVkVfU1RJQ0tZXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfTEFZT1VUX0ZVTExTQ1JFRU5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfSElERV9OQVZJR0FUSU9OXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfTEFZT1VUX1NUQUJMRVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0ZVTExTQ1JFRU5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19ISURFX05BVklHQVRJT047XG4gICAgICAgICAgICAgICAgICAgIGRlY29yVmlldy5zZXRTeXN0ZW1VaVZpc2liaWxpdHkodWlPcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhZ2UuYWN0aW9uQmFySGlkZGVuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2UuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgd2luZG93ID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkuZ2V0V2luZG93KCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZWNvclZpZXcgPSB3aW5kb3cuZ2V0RGVjb3JWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB1aU9wdGlvbnMgPSAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfVklTSUJMRTtcbiAgICAgICAgICAgICAgICAgICAgZGVjb3JWaWV3LnNldFN5c3RlbVVpVmlzaWJpbGl0eSh1aU9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgNTAwKVxuICAgIH0pO1xuXG4gICAgdXBkYXRlRGlzcGxheU9yaWVudGF0aW9uKCk7XG5cbiAgICBpZiAoYXBwbGljYXRpb24uYW5kcm9pZCkge1xuICAgICAgICB2YXIgYWN0aXZpdHkgPSBhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eTtcbiAgICAgICAgYWN0aXZpdHkub25CYWNrUHJlc3NlZCA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyICE9IGJyb3dzZXJWaWV3LnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcuYW5kcm9pZC5jYW5Hb0JhY2soKSkge1xuICAgICAgICAgICAgICAgICAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcuYW5kcm9pZC5nb0JhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhcHBWaWV3TW9kZWwub24oQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCwgKGRhdGE6TG9hZFVybEV2ZW50RGF0YSk9PntcbiAgICAgICAgYnJvd3NlclZpZXcubG9hZFVybChkYXRhLnVybCk7XG4gICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICB9KVxufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgLy8gb24gYW5kcm9pZCB0aGUgcGFnZSBpcyB1bmxvYWRlZC9yZWxvYWRlZCBhZnRlciBhIHN1c3BlbmRcbiAgICAgICAgLy8gb3BlbiBiYWNrIHRvIGJvb2ttYXJrcyBpZiBuZWNlc3NhcnlcbiAgICAgICAgaWYgKGFwcFZpZXdNb2RlbC5ib29rbWFya3NPcGVuKSB7XG4gICAgICAgICAgICAvLyBmb3JjZSBhIHByb3BlcnR5IGNoYW5nZSBldmVudFxuICAgICAgICAgICAgYXBwVmlld01vZGVsLm5vdGlmeVByb3BlcnR5Q2hhbmdlKCdib29rbWFya3NPcGVuJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxheW91dExvYWRlZChhcmdzKSB7XG4gICAgbGF5b3V0ID0gYXJncy5vYmplY3RcbiAgICBpZiAobGF5b3V0Lmlvcykge1xuICAgICAgICBsYXlvdXQuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoZWFkZXJMb2FkZWQoYXJncykge1xuICAgIGhlYWRlclZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEJhckxvYWRlZChhcmdzKSB7XG4gICAgc2VhcmNoQmFyID0gYXJncy5vYmplY3Q7XG5cbiAgICBzZWFyY2hCYXIub24oU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LCAoKSA9PiB7XG4gICAgICAgIGxldCB1cmxTdHJpbmcgPSBzZWFyY2hCYXIudGV4dDtcbiAgICAgICAgaWYgKHVybFN0cmluZy5pbmRleE9mKCcvLycpID09PSAtMSkgdXJsU3RyaW5nID0gJy8vJyArIHVybFN0cmluZztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IFVSSSh1cmxTdHJpbmcpO1xuICAgICAgICBpZiAodXJsLnByb3RvY29sKCkgIT09IFwiaHR0cFwiICYmIHVybC5wcm90b2NvbCgpICE9PSBcImh0dHBzXCIpIHtcbiAgICAgICAgICAgIHVybC5wcm90b2NvbChcImh0dHBcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2V0U2VhcmNoQmFyVGV4dCh1cmwudG9TdHJpbmcoKSk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5sb2FkVXJsKHVybC50b1N0cmluZygpKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgfSk7XG5cbiAgICBpZiAoYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIgPSBuZXcgSU9TU2VhcmNoQmFyQ29udHJvbGxlcihzZWFyY2hCYXIpO1xuICAgIH1cblxuICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG4gICAgICAgIGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyID0gbmV3IEFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyKHNlYXJjaEJhcik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWFyY2hCYXJUZXh0KHVybDpzdHJpbmcpIHtcbiAgICBpZiAoaW9zU2VhcmNoQmFyQ29udHJvbGxlcikge1xuICAgICAgICBpb3NTZWFyY2hCYXJDb250cm9sbGVyLnNldFRleHQodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWFyY2hCYXIudGV4dCA9IHVybDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJsdXJTZWFyY2hCYXIoKSB7XG4gICAgc2VhcmNoQmFyLmRpc21pc3NTb2Z0SW5wdXQoKTtcbiAgICBpZiAoc2VhcmNoQmFyLmFuZHJvaWQpIHtcbiAgICAgICAgc2VhcmNoQmFyLmFuZHJvaWQuY2xlYXJGb2N1cygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJyb3dzZXJWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuXG4gICAgLy8gU2V0dXAgdGhlIGRlYnVnIHZpZXdcbiAgICBsZXQgZGVidWc6SHRtbFZpZXcgPSA8SHRtbFZpZXc+YnJvd3NlclZpZXcucGFnZS5nZXRWaWV3QnlJZChcImRlYnVnXCIpO1xuICAgIGRlYnVnLmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDE1MCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgZGVidWcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VkXCI7XG4gICAgZGVidWcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gZmFsc2U7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2ttYXJrc1ZpZXdMb2FkZWQoYXJncykge1xuICAgIGJvb2ttYXJrc1ZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhbGl0eUNob29zZXJMb2FkZWQoYXJncykge1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVggPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcub3BhY2l0eSA9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b3VjaE92ZXJsYXlMb2FkZWQoYXJncykge1xuICAgIHRvdWNoT3ZlcmxheVZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuLy8gaW5pdGlhbGl6ZSBzb21lIHByb3BlcnRpZXMgb2YgdGhlIG1lbnUgc28gdGhhdCBhbmltYXRpb25zIHdpbGwgcmVuZGVyIGNvcnJlY3RseVxuZXhwb3J0IGZ1bmN0aW9uIG1lbnVMb2FkZWQoYXJncykge1xuICAgIG1lbnVWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgbWVudVZpZXcub3JpZ2luWCA9IDE7XG4gICAgbWVudVZpZXcub3JpZ2luWSA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVYID0gMDtcbiAgICBtZW51Vmlldy5zY2FsZVkgPSAwO1xuICAgIG1lbnVWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZWFyY2hCYXJUYXAoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uQ2FuY2VsKGFyZ3MpIHtcbiAgICBpZiAoISFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZVJlYWxpdHlDaG9vc2VyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICBibHVyU2VhcmNoQmFyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkFkZENoYW5uZWwoYXJncykge1xuICAgIGJyb3dzZXJWaWV3LmFkZExheWVyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblJlbG9hZChhcmdzKSB7XG4gICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgPT09IGJyb3dzZXJWaWV3LnJlYWxpdHlMYXllcikge1xuICAgICAgICBtYW5hZ2VyLnJlYWxpdHkuc2V0RGVzaXJlZChtYW5hZ2VyLnJlYWxpdHkuZ2V0Q3VycmVudCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcucmVsb2FkKCk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb25GYXZvcml0ZVRvZ2dsZShhcmdzKSB7XG4gICAgY29uc3QgdXJsID0gYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmk7XG4gICAgY29uc3QgYm9va21hcmtJdGVtID0gYm9va21hcmtzLmZhdm9yaXRlTWFwLmdldCh1cmwpO1xuICAgIGlmICghYm9va21hcmtJdGVtKSB7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3QucHVzaChuZXcgYm9va21hcmtzLkJvb2ttYXJrSXRlbSh7XG4gICAgICAgICAgICB1cmk6IHVybCxcbiAgICAgICAgICAgIHRpdGxlOiBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcudGl0bGVcbiAgICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpID0gYm9va21hcmtzLmZhdm9yaXRlTGlzdC5pbmRleE9mKGJvb2ttYXJrSXRlbSk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Quc3BsaWNlKGksMSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb25JbnRlcmFjdGlvblRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZUludGVyYWN0aW9uTW9kZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25PdmVydmlldyhhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZU92ZXJ2aWV3KCk7XG4gICAgYXBwVmlld01vZGVsLnNldERlYnVnRW5hYmxlZChmYWxzZSk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk1lbnUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNlbGVjdFJlYWxpdHkoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZXR0aW5ncyhhcmdzKSB7XG4gICAgLy9jb2RlIHRvIG9wZW4gdGhlIHNldHRpbmdzIHZpZXcgZ29lcyBoZXJlXG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblZpZXdlclRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZVZpZXdlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25EZWJ1Z1RvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZURlYnVnKCk7XG59XG5cbmNsYXNzIElPU1NlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSB1aVNlYXJjaEJhcjpVSVNlYXJjaEJhcjtcbiAgICBwcml2YXRlIHRleHRGaWVsZDpVSVRleHRGaWVsZDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBzZWFyY2hCYXI6U2VhcmNoQmFyKSB7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIgPSBzZWFyY2hCYXIuaW9zO1xuICAgICAgICB0aGlzLnRleHRGaWVsZCA9IHRoaXMudWlTZWFyY2hCYXIudmFsdWVGb3JLZXkoXCJzZWFyY2hGaWVsZFwiKTtcblxuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLmtleWJvYXJkVHlwZSA9IFVJS2V5Ym9hcmRUeXBlLlVSTDtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5hdXRvY2FwaXRhbGl6YXRpb25UeXBlID0gVUlUZXh0QXV0b2NhcGl0YWxpemF0aW9uVHlwZS5Ob25lO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnNlYXJjaEJhclN0eWxlID0gVUlTZWFyY2hCYXJTdHlsZS5NaW5pbWFsO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnJldHVybktleVR5cGUgPSBVSVJldHVybktleVR5cGUuR287XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuc2V0SW1hZ2VGb3JTZWFyY2hCYXJJY29uU3RhdGUoVUlJbWFnZS5uZXcoKSwgVUlTZWFyY2hCYXJJY29uLlNlYXJjaCwgVUlDb250cm9sU3RhdGUuTm9ybWFsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy50ZXh0RmllbGQubGVmdFZpZXdNb2RlID0gVUlUZXh0RmllbGRWaWV3TW9kZS5OZXZlcjtcblxuICAgICAgICBjb25zdCB0ZXh0RmllbGRFZGl0SGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlvcy5nZXR0ZXIoVUlSZXNwb25kZXIsIHRoaXMudWlTZWFyY2hCYXIuaXNGaXJzdFJlc3BvbmRlcikpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciA9PT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudWlTZWFyY2hCYXIudGV4dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dChcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLnNlbGVjdGVkVGV4dFJhbmdlID0gdGhpcy50ZXh0RmllbGQudGV4dFJhbmdlRnJvbVBvc2l0aW9uVG9Qb3NpdGlvbih0aGlzLnRleHRGaWVsZC5iZWdpbm5pbmdPZkRvY3VtZW50LCB0aGlzLnRleHRGaWVsZC5lbmRPZkRvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwMClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsYXlvdXQub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgbGF5b3V0Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy51cmwpIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnRleHQgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZEJlZ2luRWRpdGluZ05vdGlmaWNhdGlvbiwgdGV4dEZpZWxkRWRpdEhhbmRsZXIpO1xuICAgICAgICBhcHBsaWNhdGlvbi5pb3MuYWRkTm90aWZpY2F0aW9uT2JzZXJ2ZXIoVUlUZXh0RmllbGRUZXh0RGlkRW5kRWRpdGluZ05vdGlmaWNhdGlvbiwgdGV4dEZpZWxkRWRpdEhhbmRsZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2V0UGxhY2Vob2xkZXJUZXh0KHRleHQ6c3RyaW5nKSB7XG4gICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlczogTlNNdXRhYmxlRGljdGlvbmFyeTxzdHJpbmcsYW55PiA9IE5TTXV0YWJsZURpY3Rpb25hcnkubmV3PHN0cmluZyxhbnk+KCkuaW5pdCgpO1xuICAgICAgICAgICAgYXR0cmlidXRlcy5zZXRPYmplY3RGb3JLZXkodXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLFVJQ29sb3IuYmxhY2tDb2xvciksIE5TRm9yZWdyb3VuZENvbG9yQXR0cmlidXRlTmFtZSk7XG4gICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5hdHRyaWJ1dGVkUGxhY2Vob2xkZXIgPSBOU0F0dHJpYnV0ZWRTdHJpbmcuYWxsb2MoKS5pbml0V2l0aFN0cmluZ0F0dHJpYnV0ZXModGV4dCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5wbGFjZWhvbGRlciA9IHNlYXJjaEJhci5oaW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNldFRleHQodXJsKSB7XG4gICAgICAgIGlmICghdXRpbHMuaW9zLmdldHRlcihVSVJlc3BvbmRlciwgdGhpcy51aVNlYXJjaEJhci5pc0ZpcnN0UmVzcG9uZGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXRQbGFjZWhvbGRlclRleHQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgQW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSBzZWFyY2hWaWV3OmFuZHJvaWQud2lkZ2V0LlNlYXJjaFZpZXc7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc2VhcmNoQmFyOlNlYXJjaEJhcikge1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcgPSBzZWFyY2hCYXIuYW5kcm9pZDtcblxuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW5wdXRUeXBlKGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9DTEFTU19URVhUIHwgYW5kcm9pZC50ZXh0LklucHV0VHlwZS5UWVBFX1RFWFRfVkFSSUFUSU9OX1VSSSB8IGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9URVhUX0ZMQUdfTk9fU1VHR0VTVElPTlMpO1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW1lT3B0aW9ucyhhbmRyb2lkLnZpZXcuaW5wdXRtZXRob2QuRWRpdG9ySW5mby5JTUVfQUNUSU9OX0dPKTtcbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LmNsZWFyRm9jdXMoKTtcblxuICAgICAgICBjb25zdCBmb2N1c0hhbmRsZXIgPSBuZXcgYW5kcm9pZC52aWV3LlZpZXcuT25Gb2N1c0NoYW5nZUxpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uRm9jdXNDaGFuZ2UodjogYW5kcm9pZC52aWV3LlZpZXcsIGhhc0ZvY3VzOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRPblF1ZXJ5VGV4dEZvY3VzQ2hhbmdlTGlzdGVuZXIoZm9jdXNIYW5kbGVyKTtcbiAgICB9XG59XG4iXX0=