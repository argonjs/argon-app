"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var URI = require("urijs");
var application = require("application");
var utils = require("utils/utils");
var search_bar_1 = require("ui/search-bar");
var color_1 = require("color");
var enums_1 = require("ui/enums");
var gestures_1 = require("ui/gestures");
var bookmarks = require("./components/common/bookmarks");
var AppViewModel_1 = require("./components/common/AppViewModel");
var util_1 = require("./components/common/util");
// import {RealityViewer} from '@argonjs/argon'
//import * as orientationModule from 'nativescript-screen-orientation';
var orientationModule = require("nativescript-screen-orientation");
var searchBar;
var iosSearchBarController;
var androidSearchBarController;
var isFirstLoad = true;
AppViewModel_1.appViewModel.on('propertyChange', function (evt) {
    if (evt.propertyName === 'currentUri') {
        setSearchBarText(AppViewModel_1.appViewModel.currentUri);
        if (!AppViewModel_1.appViewModel.currentUri)
            AppViewModel_1.appViewModel.showBookmarks();
    }
    else if (evt.propertyName === 'viewerEnabled') {
        // const vuforiaDelegate = appViewModel.manager.container.get(Argon.VuforiaServiceDelegate);
        // vuforiaDelegate.viewerEnabled = evt.value;
        if (evt.value) {
            orientationModule.setCurrentOrientation("landscape");
        }
        else {
            orientationModule.setCurrentOrientation("portrait");
            orientationModule.setCurrentOrientation("all");
        }
        checkActionBar();
        setTimeout(function () { checkActionBar(); }, 500);
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
var checkActionBar = function () {
    if (!exports.page)
        return;
    var orientation = util_1.getScreenOrientation();
    if (orientation === 90 || orientation === -90 || AppViewModel_1.appViewModel.viewerEnabled)
        exports.page.actionBarHidden = true;
    else
        exports.page.actionBarHidden = false;
};
var updateSystemUI = function () {
    if (!exports.page)
        return;
    var orientation = util_1.getScreenOrientation();
    if (orientation === 90 || orientation === -90 || AppViewModel_1.appViewModel.viewerEnabled) {
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
        if (exports.page.android) {
            var window = application.android.foregroundActivity.getWindow();
            var decorView = window.getDecorView();
            var uiOptions = android.view.View.SYSTEM_UI_FLAG_VISIBLE;
            decorView.setSystemUiVisibility(uiOptions);
        }
    }
};
function pageLoaded(args) {
    if (!isFirstLoad) {
        // on android pageLoaded is called each time the app is resumed
        return;
    }
    exports.page = args.object;
    exports.page.bindingContext = AppViewModel_1.appViewModel;
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
    application.on(application.orientationChangedEvent, function () {
        util_1.updateScreenOrientation();
        setTimeout(function () {
            util_1.updateScreenOrientation();
            checkActionBar();
            updateSystemUI();
        }, 500);
    });
    util_1.updateScreenOrientation();
    AppViewModel_1.appViewModel.ready.then(function () {
        AppViewModel_1.appViewModel.argon.session.errorEvent.addEventListener(function (error) {
            // alert(error.message + '\n' + error.stack);
            if (error.stack)
                console.log(error.message + '\n' + error.stack);
        });
        AppViewModel_1.appViewModel.showBookmarks();
    });
    if (application.android) {
        var activity = application.android.foregroundActivity;
        activity.onBackPressed = function () {
            if (exports.browserView.focussedLayer != exports.browserView.realityLayer) {
                if (exports.browserView.focussedLayer && exports.browserView.focussedLayer.webView && exports.browserView.focussedLayer.webView.android.canGoBack()) {
                    exports.browserView.focussedLayer.webView.android.goBack();
                }
            }
        };
    }
}
exports.pageLoaded = pageLoaded;
application.on(application.suspendEvent, function () {
    isFirstLoad = false;
});
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
    AppViewModel_1.appViewModel.setReady();
}
exports.layoutLoaded = layoutLoaded;
function headerLoaded(args) {
    exports.headerView = args.object;
}
exports.headerLoaded = headerLoaded;
function searchBarLoaded(args) {
    searchBar = args.object;
    if (isFirstLoad) {
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
    }
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
        androidSearchBarController.setText(url);
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
    if (isFirstLoad) {
        AppViewModel_1.appViewModel.on(AppViewModel_1.AppViewModel.loadUrlEvent, function (data) {
            var url = data.url;
            if (!data.newLayer ||
                (exports.browserView.focussedLayer &&
                    exports.browserView.focussedLayer !== exports.browserView.realityLayer &&
                    !exports.browserView.focussedLayer.details.uri)) {
                exports.browserView.loadUrl(url);
                return;
            }
            var layer = exports.browserView.addLayer();
            exports.browserView.setFocussedLayer(layer);
            exports.browserView.loadUrl(url);
            console.log('Loading url: ' + url);
        });
    }
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
    exports.browserView.focussedLayer &&
        exports.browserView.focussedLayer.webView &&
        exports.browserView.focussedLayer.webView.reload();
}
exports.onReload = onReload;
function onFavoriteToggle(args) {
    var url = AppViewModel_1.appViewModel.layerDetails.uri;
    var bookmarkItem = bookmarks.favoriteMap.get(url);
    if (!bookmarkItem) {
        bookmarks.favoriteList.push(new bookmarks.BookmarkItem({
            uri: url,
            title: AppViewModel_1.appViewModel.layerDetails.title
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
                    if (!AppViewModel_1.appViewModel.layerDetails.uri)
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
        // the nativescript implementation of OnQueryTextListener does not correctly handle the following case:
        // 1) an external event updates the query text (e.g. the user clicked a link on a page)
        // 2) the user attempts to navigate back to the previous page by updating the search bar text
        // 3) nativescript sees this as submitting the same query and treats it as a no-op
        // https://github.com/NativeScript/NativeScript/issues/3965
        var searchHandler = new android.widget.SearchView.OnQueryTextListener({
            onQueryTextChange: function (newText) {
                searchBar._onPropertyChangedFromNative(search_bar_1.SearchBar.textProperty, newText);
                return false;
            },
            onQueryTextSubmit: function (query) {
                searchBar.notify({
                    eventName: search_bar_1.SearchBar.submitEvent,
                    object: this
                });
                return true;
            }
        });
        this.searchView.setOnQueryTextListener(searchHandler);
    }
    AndroidSearchBarController.prototype.setText = function (url) {
        this.searchView.setQuery(url, false);
    };
    return AndroidSearchBarController;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQXVGO0FBRXZGLCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUNsRCxJQUFJLDBCQUFxRCxDQUFDO0FBRTFELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQztBQUV2QiwyQkFBWSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLEdBQXNCO0lBQ3JELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwQyxnQkFBZ0IsQ0FBQywyQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQVksQ0FBQyxVQUFVLENBQUM7WUFBQywyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQy9ELENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLDRGQUE0RjtRQUM1Riw2Q0FBNkM7UUFDN0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FB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LENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxVQUFVLENBQUMsaUNBQWlDLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFaEUsdUdBQXVHO1FBQ3ZHLHVGQUF1RjtRQUN2Riw2RkFBNkY7UUFDN0Ysa0ZBQWtGO1FBQ2xGLDJEQUEyRDtRQUMzRCxJQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ3BFLGlCQUFpQixFQUFqQixVQUFrQixPQUFlO2dCQUM3QixTQUFTLENBQUMsNEJBQTRCLENBQUMsc0JBQVMsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3hFLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDakIsQ0FBQztZQUNELGlCQUFpQixFQUFqQixVQUFrQixLQUFhO2dCQUMzQixTQUFTLENBQUMsTUFBTSxDQUFZO29CQUN4QixTQUFTLEVBQUUsc0JBQVMsQ0FBQyxXQUFXO29CQUNoQyxNQUFNLEVBQUUsSUFBSTtpQkFDZixDQUFDLENBQUM7Z0JBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNoQixDQUFDO1NBQ0osQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0sNENBQU8sR0FBZCxVQUFlLEdBQUc7UUFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNMLGlDQUFDO0FBQUQsQ0FBQyxBQW5ERCxJQW1EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVSSSBmcm9tICd1cmlqcyc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQge1NlYXJjaEJhcn0gZnJvbSAndWkvc2VhcmNoLWJhcic7XG5pbXBvcnQge1BhZ2V9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHtCdXR0b259IGZyb20gJ3VpL2J1dHRvbic7XG5pbXBvcnQge1ZpZXd9IGZyb20gJ3VpL2NvcmUvdmlldyc7XG5pbXBvcnQge0h0bWxWaWV3fSBmcm9tICd1aS9odG1sLXZpZXcnXG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YSwgRXZlbnREYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IHtBbmltYXRpb25DdXJ2ZX0gZnJvbSAndWkvZW51bXMnXG5pbXBvcnQge0dlc3R1cmVUeXBlc30gZnJvbSAndWkvZ2VzdHVyZXMnXG5cbmltcG9ydCB7QnJvd3NlclZpZXd9IGZyb20gJy4vY29tcG9uZW50cy9icm93c2VyLXZpZXcnO1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vYm9va21hcmtzJztcbmltcG9ydCB7YXBwVmlld01vZGVsLCBBcHBWaWV3TW9kZWwsIExvYWRVcmxFdmVudERhdGF9IGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vQXBwVmlld01vZGVsJztcbmltcG9ydCB7Z2V0U2NyZWVuT3JpZW50YXRpb24sIHVwZGF0ZVNjcmVlbk9yaWVudGF0aW9ufSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL3V0aWwnO1xuXG4vLyBpbXBvcnQge1JlYWxpdHlWaWV3ZXJ9IGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuXG4vL2ltcG9ydCAqIGFzIG9yaWVudGF0aW9uTW9kdWxlIGZyb20gJ25hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb24nO1xudmFyIG9yaWVudGF0aW9uTW9kdWxlID0gcmVxdWlyZShcIm5hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb25cIik7XG5cbmV4cG9ydCBsZXQgcGFnZTpQYWdlO1xuZXhwb3J0IGxldCBsYXlvdXQ6VmlldztcbmV4cG9ydCBsZXQgdG91Y2hPdmVybGF5VmlldzpWaWV3O1xuZXhwb3J0IGxldCBoZWFkZXJWaWV3OlZpZXc7XG5leHBvcnQgbGV0IG1lbnVWaWV3OlZpZXc7XG5leHBvcnQgbGV0IGJyb3dzZXJWaWV3OkJyb3dzZXJWaWV3O1xuZXhwb3J0IGxldCBib29rbWFya3NWaWV3OlZpZXc7XG5leHBvcnQgbGV0IHJlYWxpdHlDaG9vc2VyVmlldzpWaWV3O1xuXG5sZXQgc2VhcmNoQmFyOlNlYXJjaEJhcjtcbmxldCBpb3NTZWFyY2hCYXJDb250cm9sbGVyOklPU1NlYXJjaEJhckNvbnRyb2xsZXI7XG5sZXQgYW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXI6QW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXI7XG5cbnZhciBpc0ZpcnN0TG9hZCA9IHRydWU7XG5cbmFwcFZpZXdNb2RlbC5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZ0OlByb3BlcnR5Q2hhbmdlRGF0YSk9PntcbiAgICBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2N1cnJlbnRVcmknKSB7XG4gICAgICAgIHNldFNlYXJjaEJhclRleHQoYXBwVmlld01vZGVsLmN1cnJlbnRVcmkpO1xuICAgICAgICBpZiAoIWFwcFZpZXdNb2RlbC5jdXJyZW50VXJpKSBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAndmlld2VyRW5hYmxlZCcpIHtcbiAgICAgICAgLy8gY29uc3QgdnVmb3JpYURlbGVnYXRlID0gYXBwVmlld01vZGVsLm1hbmFnZXIuY29udGFpbmVyLmdldChBcmdvbi5WdWZvcmlhU2VydmljZURlbGVnYXRlKTtcbiAgICAgICAgLy8gdnVmb3JpYURlbGVnYXRlLnZpZXdlckVuYWJsZWQgPSBldnQudmFsdWU7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImxhbmRzY2FwZVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcInBvcnRyYWl0XCIpO1xuICAgICAgICAgICAgb3JpZW50YXRpb25Nb2R1bGUuc2V0Q3VycmVudE9yaWVudGF0aW9uKFwiYWxsXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNoZWNrQWN0aW9uQmFyKCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntjaGVja0FjdGlvbkJhcigpfSwgNTAwKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ21lbnVPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgICAgICBtZW51Vmlldy52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAxLFxuICAgICAgICAgICAgICAgICAgICB5OiAxLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vbihHZXN0dXJlVHlwZXMudG91Y2gsKCk9PntcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lbnVWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VcIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ292ZXJ2aWV3T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMDAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgc2VhcmNoQmFyLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2FkZEJ1dHRvbicpO1xuICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBhZGRCdXR0b24ub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICBhZGRCdXR0b24udHJhbnNsYXRlWCA9IC0xMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIWFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKSBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICAgICAgc2VhcmNoQmFyLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBzZWFyY2hCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLCB5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2FkZEJ1dHRvbicpO1xuICAgICAgICAgICAgYWRkQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6LTEwLCB5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGFkZEJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ3JlYWxpdHlDaG9vc2VyT3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjAsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVggPSAwLjk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdib29rbWFya3NPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjEsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy5zY2FsZVggPSAwLjk7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH0gXG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2NhbmNlbEJ1dHRvblNob3duJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ292ZXJ2aWV3QnV0dG9uJyk7XG4gICAgICAgICAgICBvdmVydmlld0J1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBvdmVydmlld0J1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBtZW51QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnbWVudUJ1dHRvbicpO1xuICAgICAgICAgICAgbWVudUJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBtZW51QnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2NhbmNlbEJ1dHRvbicpO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnb3ZlcnZpZXdCdXR0b24nKTtcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBvdmVydmlld0J1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBtZW51QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnbWVudUJ1dHRvbicpO1xuICAgICAgICAgICAgbWVudUJ1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgbWVudUJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdjYW5jZWxCdXR0b24nKTtcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBsYXlvdXQub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuXG5jb25zdCBjaGVja0FjdGlvbkJhciA9ICgpID0+IHtcbiAgICBpZiAoIXBhZ2UpIHJldHVybjtcbiAgICBjb25zdCBvcmllbnRhdGlvbiA9IGdldFNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgaWYgKG9yaWVudGF0aW9uID09PSA5MCB8fCBvcmllbnRhdGlvbiA9PT0gLTkwIHx8IGFwcFZpZXdNb2RlbC52aWV3ZXJFbmFibGVkKSBcbiAgICAgICAgcGFnZS5hY3Rpb25CYXJIaWRkZW4gPSB0cnVlO1xuICAgIGVsc2UgXG4gICAgICAgIHBhZ2UuYWN0aW9uQmFySGlkZGVuID0gZmFsc2U7XG59XG5cbmNvbnN0IHVwZGF0ZVN5c3RlbVVJID0gKCkgPT4ge1xuICAgIGlmICghcGFnZSkgcmV0dXJuO1xuICAgIGNvbnN0IG9yaWVudGF0aW9uID0gZ2V0U2NyZWVuT3JpZW50YXRpb24oKTtcbiAgICBpZiAob3JpZW50YXRpb24gPT09IDkwIHx8IG9yaWVudGF0aW9uID09PSAtOTAgfHwgYXBwVmlld01vZGVsLnZpZXdlckVuYWJsZWQpIHtcbiAgICAgICAgaWYgKHBhZ2UuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGV0IHdpbmRvdyA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LmdldFdpbmRvdygpO1xuICAgICAgICAgICAgbGV0IGRlY29yVmlldyA9IHdpbmRvdy5nZXREZWNvclZpZXcoKTtcbiAgICAgICAgICAgIGxldCB1aU9wdGlvbnMgPSAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfSU1NRVJTSVZFX1NUSUNLWVxuICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfRlVMTFNDUkVFTlxuICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfSElERV9OQVZJR0FUSU9OXG4gICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0xBWU9VVF9TVEFCTEVcbiAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfRlVMTFNDUkVFTlxuICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19ISURFX05BVklHQVRJT047XG4gICAgICAgICAgICBkZWNvclZpZXcuc2V0U3lzdGVtVWlWaXNpYmlsaXR5KHVpT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocGFnZS5hbmRyb2lkKSB7XG4gICAgICAgICAgICBsZXQgd2luZG93ID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkuZ2V0V2luZG93KCk7XG4gICAgICAgICAgICBsZXQgZGVjb3JWaWV3ID0gd2luZG93LmdldERlY29yVmlldygpO1xuICAgICAgICAgICAgbGV0IHVpT3B0aW9ucyA9ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19WSVNJQkxFO1xuICAgICAgICAgICAgZGVjb3JWaWV3LnNldFN5c3RlbVVpVmlzaWJpbGl0eSh1aU9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFnZUxvYWRlZChhcmdzKSB7XG4gICAgXG4gICAgaWYgKCFpc0ZpcnN0TG9hZCkge1xuICAgICAgICAvLyBvbiBhbmRyb2lkIHBhZ2VMb2FkZWQgaXMgY2FsbGVkIGVhY2ggdGltZSB0aGUgYXBwIGlzIHJlc3VtZWRcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBhZ2UgPSBhcmdzLm9iamVjdDtcbiAgICBwYWdlLmJpbmRpbmdDb250ZXh0ID0gYXBwVmlld01vZGVsO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgbWVudSBidXR0b25cbiAgICBjb25zdCBtZW51QnV0dG9uID0gPEJ1dHRvbj4gcGFnZS5nZXRWaWV3QnlJZChcIm1lbnVCdXR0b25cIik7XG4gICAgbWVudUJ1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1ZDQpO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgb3ZlcnZpZXcgYnV0dG9uXG4gICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwib3ZlcnZpZXdCdXR0b25cIik7XG4gICAgb3ZlcnZpZXdCdXR0b24udGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhlNTNiKTtcblxuICAgIC8vIHdvcmthcm91bmQgKHNlZSBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L05hdGl2ZVNjcmlwdC9pc3N1ZXMvNjU5KVxuICAgIGlmIChwYWdlLmlvcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICBwYWdlLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgfSwgMClcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJQXBwbGljYXRpb25EaWRCZWNvbWVBY3RpdmVOb3RpZmljYXRpb24sICgpID0+IHtcbiAgICAgICAgICAgIHBhZ2UucmVxdWVzdExheW91dCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgdXBkYXRlU2NyZWVuT3JpZW50YXRpb24oKTtcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgdXBkYXRlU2NyZWVuT3JpZW50YXRpb24oKTtcbiAgICAgICAgICAgIGNoZWNrQWN0aW9uQmFyKCk7XG4gICAgICAgICAgICB1cGRhdGVTeXN0ZW1VSSgpO1xuICAgICAgICB9LCA1MDApO1xuICAgIH0pO1xuXG4gICAgdXBkYXRlU2NyZWVuT3JpZW50YXRpb24oKTtcblxuICAgIGFwcFZpZXdNb2RlbC5yZWFkeS50aGVuKCgpPT57XG4gICAgICAgIFxuICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24uc2Vzc2lvbi5lcnJvckV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKGVycm9yKT0+e1xuICAgICAgICAgICAgLy8gYWxlcnQoZXJyb3IubWVzc2FnZSArICdcXG4nICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICAgICAgaWYgKGVycm9yLnN0YWNrKSBjb25zb2xlLmxvZyhlcnJvci5tZXNzYWdlICsgJ1xcbicgKyBlcnJvci5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIH0pO1xuXG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgdmFyIGFjdGl2aXR5ID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHk7XG4gICAgICAgIGFjdGl2aXR5Lm9uQmFja1ByZXNzZWQgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAhPSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAmJiBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcgJiYgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3LmFuZHJvaWQuY2FuR29CYWNrKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3LmFuZHJvaWQuZ29CYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5zdXNwZW5kRXZlbnQsICgpPT4ge1xuICAgIGlzRmlyc3RMb2FkID0gZmFsc2U7XG59KTtcblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ucmVzdW1lRXZlbnQsICgpPT4ge1xuICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG4gICAgICAgIC8vIG9uIGFuZHJvaWQgdGhlIHBhZ2UgaXMgdW5sb2FkZWQvcmVsb2FkZWQgYWZ0ZXIgYSBzdXNwZW5kXG4gICAgICAgIC8vIG9wZW4gYmFjayB0byBib29rbWFya3MgaWYgbmVjZXNzYXJ5XG4gICAgICAgIGlmIChhcHBWaWV3TW9kZWwuYm9va21hcmtzT3Blbikge1xuICAgICAgICAgICAgLy8gZm9yY2UgYSBwcm9wZXJ0eSBjaGFuZ2UgZXZlbnRcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5ub3RpZnlQcm9wZXJ0eUNoYW5nZSgnYm9va21hcmtzT3BlbicsIHRydWUpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBsYXlvdXRMb2FkZWQoYXJncykge1xuICAgIGxheW91dCA9IGFyZ3Mub2JqZWN0XG4gICAgaWYgKGxheW91dC5pb3MpIHtcbiAgICAgICAgbGF5b3V0Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgfVxuICAgIGFwcFZpZXdNb2RlbC5zZXRSZWFkeSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGVhZGVyTG9hZGVkKGFyZ3MpIHtcbiAgICBoZWFkZXJWaWV3ID0gYXJncy5vYmplY3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZWFyY2hCYXJMb2FkZWQoYXJncykge1xuICAgIHNlYXJjaEJhciA9IGFyZ3Mub2JqZWN0O1xuXG4gICAgaWYgKGlzRmlyc3RMb2FkKSB7XG4gICAgICAgIHNlYXJjaEJhci5vbihTZWFyY2hCYXIuc3VibWl0RXZlbnQsICgpID0+IHtcbiAgICAgICAgICAgIGxldCB1cmxTdHJpbmcgPSBzZWFyY2hCYXIudGV4dDtcbiAgICAgICAgICAgIGlmICh1cmxTdHJpbmcuaW5kZXhPZignLy8nKSA9PT0gLTEpIHVybFN0cmluZyA9ICcvLycgKyB1cmxTdHJpbmc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IFVSSSh1cmxTdHJpbmcpO1xuICAgICAgICAgICAgaWYgKHVybC5wcm90b2NvbCgpICE9PSBcImh0dHBcIiAmJiB1cmwucHJvdG9jb2woKSAhPT0gXCJodHRwc1wiKSB7XG4gICAgICAgICAgICAgICAgdXJsLnByb3RvY29sKFwiaHR0cFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFNlYXJjaEJhclRleHQodXJsLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmxvYWRVcmwodXJsLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlUmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChhcHBsaWNhdGlvbi5pb3MpIHtcbiAgICAgICAgaW9zU2VhcmNoQmFyQ29udHJvbGxlciA9IG5ldyBJT1NTZWFyY2hCYXJDb250cm9sbGVyKHNlYXJjaEJhcik7XG4gICAgfVxuXG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgYW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIgPSBuZXcgQW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIoc2VhcmNoQmFyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlYXJjaEJhclRleHQodXJsOnN0cmluZykge1xuICAgIGlmIChpb3NTZWFyY2hCYXJDb250cm9sbGVyKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIuc2V0VGV4dCh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyLnNldFRleHQodXJsKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJsdXJTZWFyY2hCYXIoKSB7XG4gICAgc2VhcmNoQmFyLmRpc21pc3NTb2Z0SW5wdXQoKTtcbiAgICBpZiAoc2VhcmNoQmFyLmFuZHJvaWQpIHtcbiAgICAgICAgc2VhcmNoQmFyLmFuZHJvaWQuY2xlYXJGb2N1cygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJyb3dzZXJWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuXG4gICAgaWYgKGlzRmlyc3RMb2FkKSB7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5vbihBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LCAoZGF0YTpMb2FkVXJsRXZlbnREYXRhKT0+e1xuICAgICAgICAgICAgY29uc3QgdXJsID0gZGF0YS51cmw7XG5cbiAgICAgICAgICAgIGlmICghZGF0YS5uZXdMYXllciB8fCBcbiAgICAgICAgICAgICAgICAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAmJlxuICAgICAgICAgICAgICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgIT09IGJyb3dzZXJWaWV3LnJlYWxpdHlMYXllciAmJlxuICAgICAgICAgICAgICAgICFicm93c2VyVmlldy5mb2N1c3NlZExheWVyLmRldGFpbHMudXJpKSkge1xuICAgICAgICAgICAgICAgIGJyb3dzZXJWaWV3LmxvYWRVcmwodXJsKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gYnJvd3NlclZpZXcuYWRkTGF5ZXIoKTtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LnNldEZvY3Vzc2VkTGF5ZXIobGF5ZXIpO1xuICAgICAgICAgICAgYnJvd3NlclZpZXcubG9hZFVybCh1cmwpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgdXJsOiAnICsgdXJsKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gU2V0dXAgdGhlIGRlYnVnIHZpZXdcbiAgICBsZXQgZGVidWc6SHRtbFZpZXcgPSA8SHRtbFZpZXc+YnJvd3NlclZpZXcucGFnZS5nZXRWaWV3QnlJZChcImRlYnVnXCIpO1xuICAgIGRlYnVnLmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDE1MCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgZGVidWcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VkXCI7XG4gICAgZGVidWcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gZmFsc2U7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2ttYXJrc1ZpZXdMb2FkZWQoYXJncykge1xuICAgIGJvb2ttYXJrc1ZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhbGl0eUNob29zZXJMb2FkZWQoYXJncykge1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVggPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcub3BhY2l0eSA9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b3VjaE92ZXJsYXlMb2FkZWQoYXJncykge1xuICAgIHRvdWNoT3ZlcmxheVZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuLy8gaW5pdGlhbGl6ZSBzb21lIHByb3BlcnRpZXMgb2YgdGhlIG1lbnUgc28gdGhhdCBhbmltYXRpb25zIHdpbGwgcmVuZGVyIGNvcnJlY3RseVxuZXhwb3J0IGZ1bmN0aW9uIG1lbnVMb2FkZWQoYXJncykge1xuICAgIG1lbnVWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgbWVudVZpZXcub3JpZ2luWCA9IDE7XG4gICAgbWVudVZpZXcub3JpZ2luWSA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVYID0gMDtcbiAgICBtZW51Vmlldy5zY2FsZVkgPSAwO1xuICAgIG1lbnVWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZWFyY2hCYXJUYXAoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uQ2FuY2VsKGFyZ3MpIHtcbiAgICBpZiAoISFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZVJlYWxpdHlDaG9vc2VyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICBibHVyU2VhcmNoQmFyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkFkZENoYW5uZWwoYXJncykge1xuICAgIGJyb3dzZXJWaWV3LmFkZExheWVyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblJlbG9hZChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAmJiBcbiAgICAgICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3ICYmIFxuICAgICAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcucmVsb2FkKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkZhdm9yaXRlVG9nZ2xlKGFyZ3MpIHtcbiAgICBjb25zdCB1cmwgPSBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaTtcbiAgICBjb25zdCBib29rbWFya0l0ZW0gPSBib29rbWFya3MuZmF2b3JpdGVNYXAuZ2V0KHVybCk7XG4gICAgaWYgKCFib29rbWFya0l0ZW0pIHtcbiAgICAgICAgYm9va21hcmtzLmZhdm9yaXRlTGlzdC5wdXNoKG5ldyBib29rbWFya3MuQm9va21hcmtJdGVtKHtcbiAgICAgICAgICAgIHVyaTogdXJsLFxuICAgICAgICAgICAgdGl0bGU6IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudGl0bGVcbiAgICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpID0gYm9va21hcmtzLmZhdm9yaXRlTGlzdC5pbmRleE9mKGJvb2ttYXJrSXRlbSk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Quc3BsaWNlKGksMSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb25JbnRlcmFjdGlvblRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZUludGVyYWN0aW9uTW9kZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25PdmVydmlldyhhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZU92ZXJ2aWV3KCk7XG4gICAgYXBwVmlld01vZGVsLnNldERlYnVnRW5hYmxlZChmYWxzZSk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk1lbnUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNlbGVjdFJlYWxpdHkoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZXR0aW5ncyhhcmdzKSB7XG4gICAgLy9jb2RlIHRvIG9wZW4gdGhlIHNldHRpbmdzIHZpZXcgZ29lcyBoZXJlXG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblZpZXdlclRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZVZpZXdlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25EZWJ1Z1RvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZURlYnVnKCk7XG59XG5cbmNsYXNzIElPU1NlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSB1aVNlYXJjaEJhcjpVSVNlYXJjaEJhcjtcbiAgICBwcml2YXRlIHRleHRGaWVsZDpVSVRleHRGaWVsZDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBzZWFyY2hCYXI6U2VhcmNoQmFyKSB7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIgPSBzZWFyY2hCYXIuaW9zO1xuICAgICAgICB0aGlzLnRleHRGaWVsZCA9IHRoaXMudWlTZWFyY2hCYXIudmFsdWVGb3JLZXkoXCJzZWFyY2hGaWVsZFwiKTtcblxuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLmtleWJvYXJkVHlwZSA9IFVJS2V5Ym9hcmRUeXBlLlVSTDtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5hdXRvY2FwaXRhbGl6YXRpb25UeXBlID0gVUlUZXh0QXV0b2NhcGl0YWxpemF0aW9uVHlwZS5Ob25lO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnNlYXJjaEJhclN0eWxlID0gVUlTZWFyY2hCYXJTdHlsZS5NaW5pbWFsO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnJldHVybktleVR5cGUgPSBVSVJldHVybktleVR5cGUuR287XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuc2V0SW1hZ2VGb3JTZWFyY2hCYXJJY29uU3RhdGUoVUlJbWFnZS5uZXcoKSwgVUlTZWFyY2hCYXJJY29uLlNlYXJjaCwgVUlDb250cm9sU3RhdGUuTm9ybWFsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy50ZXh0RmllbGQubGVmdFZpZXdNb2RlID0gVUlUZXh0RmllbGRWaWV3TW9kZS5OZXZlcjtcblxuICAgICAgICBjb25zdCB0ZXh0RmllbGRFZGl0SGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlvcy5nZXR0ZXIoVUlSZXNwb25kZXIsIHRoaXMudWlTZWFyY2hCYXIuaXNGaXJzdFJlc3BvbmRlcikpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciA9PT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudWlTZWFyY2hCYXIudGV4dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dChcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLnNlbGVjdGVkVGV4dFJhbmdlID0gdGhpcy50ZXh0RmllbGQudGV4dFJhbmdlRnJvbVBvc2l0aW9uVG9Qb3NpdGlvbih0aGlzLnRleHRGaWVsZC5iZWdpbm5pbmdPZkRvY3VtZW50LCB0aGlzLnRleHRGaWVsZC5lbmRPZkRvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwMClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsYXlvdXQub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgbGF5b3V0Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKSBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dChhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSk7XG4gICAgICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSVRleHRGaWVsZFRleHREaWRCZWdpbkVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZEVuZEVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldFBsYWNlaG9sZGVyVGV4dCh0ZXh0OnN0cmluZykge1xuICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXM6IE5TTXV0YWJsZURpY3Rpb25hcnk8c3RyaW5nLGFueT4gPSBOU011dGFibGVEaWN0aW9uYXJ5Lm5ldzxzdHJpbmcsYW55PigpLmluaXQoKTtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuc2V0T2JqZWN0Rm9yS2V5KHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvcixVSUNvbG9yLmJsYWNrQ29sb3IpLCBOU0ZvcmVncm91bmRDb2xvckF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQuYXR0cmlidXRlZFBsYWNlaG9sZGVyID0gTlNBdHRyaWJ1dGVkU3RyaW5nLmFsbG9jKCkuaW5pdFdpdGhTdHJpbmdBdHRyaWJ1dGVzKHRleHQsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQucGxhY2Vob2xkZXIgPSBzZWFyY2hCYXIuaGludDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzZXRUZXh0KHVybCkge1xuICAgICAgICBpZiAoIXV0aWxzLmlvcy5nZXR0ZXIoVUlSZXNwb25kZXIsIHRoaXMudWlTZWFyY2hCYXIuaXNGaXJzdFJlc3BvbmRlcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KHVybCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNsYXNzIEFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyIHtcblxuICAgIHByaXZhdGUgc2VhcmNoVmlldzphbmRyb2lkLndpZGdldC5TZWFyY2hWaWV3O1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIHNlYXJjaEJhcjpTZWFyY2hCYXIpIHtcbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3ID0gc2VhcmNoQmFyLmFuZHJvaWQ7XG5cbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LnNldElucHV0VHlwZShhbmRyb2lkLnRleHQuSW5wdXRUeXBlLlRZUEVfQ0xBU1NfVEVYVCB8IGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9URVhUX1ZBUklBVElPTl9VUkkgfCBhbmRyb2lkLnRleHQuSW5wdXRUeXBlLlRZUEVfVEVYVF9GTEFHX05PX1NVR0dFU1RJT05TKTtcbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LnNldEltZU9wdGlvbnMoYW5kcm9pZC52aWV3LmlucHV0bWV0aG9kLkVkaXRvckluZm8uSU1FX0FDVElPTl9HTyk7XG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5jbGVhckZvY3VzKCk7XG5cbiAgICAgICAgY29uc3QgZm9jdXNIYW5kbGVyID0gbmV3IGFuZHJvaWQudmlldy5WaWV3Lk9uRm9jdXNDaGFuZ2VMaXN0ZW5lcih7XG4gICAgICAgICAgICBvbkZvY3VzQ2hhbmdlKHY6IGFuZHJvaWQudmlldy5WaWV3LCBoYXNGb2N1czogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgIGlmIChoYXNGb2N1cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciA9PT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd1JlYWxpdHlDaG9vc2VyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0T25RdWVyeVRleHRGb2N1c0NoYW5nZUxpc3RlbmVyKGZvY3VzSGFuZGxlcik7XG5cbiAgICAgICAgLy8gdGhlIG5hdGl2ZXNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiBPblF1ZXJ5VGV4dExpc3RlbmVyIGRvZXMgbm90IGNvcnJlY3RseSBoYW5kbGUgdGhlIGZvbGxvd2luZyBjYXNlOlxuICAgICAgICAvLyAxKSBhbiBleHRlcm5hbCBldmVudCB1cGRhdGVzIHRoZSBxdWVyeSB0ZXh0IChlLmcuIHRoZSB1c2VyIGNsaWNrZWQgYSBsaW5rIG9uIGEgcGFnZSlcbiAgICAgICAgLy8gMikgdGhlIHVzZXIgYXR0ZW1wdHMgdG8gbmF2aWdhdGUgYmFjayB0byB0aGUgcHJldmlvdXMgcGFnZSBieSB1cGRhdGluZyB0aGUgc2VhcmNoIGJhciB0ZXh0XG4gICAgICAgIC8vIDMpIG5hdGl2ZXNjcmlwdCBzZWVzIHRoaXMgYXMgc3VibWl0dGluZyB0aGUgc2FtZSBxdWVyeSBhbmQgdHJlYXRzIGl0IGFzIGEgbm8tb3BcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL05hdGl2ZVNjcmlwdC9OYXRpdmVTY3JpcHQvaXNzdWVzLzM5NjVcbiAgICAgICAgY29uc3Qgc2VhcmNoSGFuZGxlciA9IG5ldyBhbmRyb2lkLndpZGdldC5TZWFyY2hWaWV3Lk9uUXVlcnlUZXh0TGlzdGVuZXIoe1xuICAgICAgICAgICAgb25RdWVyeVRleHRDaGFuZ2UobmV3VGV4dDogU3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoQmFyLl9vblByb3BlcnR5Q2hhbmdlZEZyb21OYXRpdmUoU2VhcmNoQmFyLnRleHRQcm9wZXJ0eSwgbmV3VGV4dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uUXVlcnlUZXh0U3VibWl0KHF1ZXJ5OiBTdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgICAgICAgICBzZWFyY2hCYXIubm90aWZ5KDxFdmVudERhdGE+e1xuICAgICAgICAgICAgICAgICAgICBldmVudE5hbWU6IFNlYXJjaEJhci5zdWJtaXRFdmVudCxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRPblF1ZXJ5VGV4dExpc3RlbmVyKHNlYXJjaEhhbmRsZXIpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXRUZXh0KHVybCkge1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0UXVlcnkodXJsLCBmYWxzZSk7XG4gICAgfVxufVxuIl19