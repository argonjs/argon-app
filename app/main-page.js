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
        updateSystemUI();
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
    if (util_1.screenOrientation === 90 || util_1.screenOrientation === -90 || AppViewModel_1.appViewModel.viewerEnabled)
        exports.page.actionBarHidden = true;
    else
        exports.page.actionBarHidden = false;
};
var updateSystemUI = function () {
    if (!exports.page)
        return;
    if (util_1.screenOrientation === 90 || util_1.screenOrientation === -90 || AppViewModel_1.appViewModel.viewerEnabled) {
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
        setTimeout(function () {
            checkActionBar();
            updateSystemUI();
        }, 500);
    });
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
            if (urlString.includes(" ") || !urlString.includes(".")) {
                // queries with spaces or single words without dots go to google search
                urlString = "http://www.google.com/search?q=" + encodeURI(urlString);
            }
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
    //bookmarks.filterControl.set('showFilteredResults', false);
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
    setSearchBarText(AppViewModel_1.appViewModel.currentUri);
    bookmarks.filterControl.set('showFilteredResults', false);
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
                //this.setPlaceholderText(appViewModel.layerDetails.uri);
                //this.uiSearchBar.text = "";
            }
        };
        var textFieldChangeHandler = function () {
            bookmarks.filterBookmarks(_this.uiSearchBar.text.toString());
            bookmarks.filterControl.set('showFilteredResults', _this.uiSearchBar.text.length > 0);
        };
        application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
        application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);
        application.ios.addNotificationObserver(UITextFieldTextDidChangeNotification, textFieldChangeHandler);
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
            this.uiSearchBar.text = "";
        }
        else {
            this.uiSearchBar.text = url;
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
                        bookmarks.filterControl.set('showFilteredResults', false);
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
                bookmarks.filterBookmarks(newText.toString());
                bookmarks.filterControl.set('showFilteredResults', newText.length > 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQTJEO0FBRTNELCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUNsRCxJQUFJLDBCQUFxRCxDQUFDO0FBRTFELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQztBQUV2QiwyQkFBWSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLEdBQXNCO0lBQ3JELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwQyxnQkFBZ0IsQ0FBQywyQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQVksQ0FBQyxVQUFVLENBQUM7WUFBQywyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQy9ELENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLDRGQUE0RjtRQUM1Riw2Q0FBNkM7UUFDN0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FB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LEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDakIsQ0FBQztZQUNELGlCQUFpQixFQUFqQixVQUFrQixLQUFhO2dCQUMzQixTQUFTLENBQUMsTUFBTSxDQUFZO29CQUN4QixTQUFTLEVBQUUsc0JBQVMsQ0FBQyxXQUFXO29CQUNoQyxNQUFNLEVBQUUsSUFBSTtpQkFDZixDQUFDLENBQUM7Z0JBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNoQixDQUFDO1NBQ0osQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0sNENBQU8sR0FBZCxVQUFlLEdBQUc7UUFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNMLGlDQUFDO0FBQUQsQ0FBQyxBQXRERCxJQXNEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVSSSBmcm9tICd1cmlqcyc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQge1NlYXJjaEJhcn0gZnJvbSAndWkvc2VhcmNoLWJhcic7XG5pbXBvcnQge1BhZ2V9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHtCdXR0b259IGZyb20gJ3VpL2J1dHRvbic7XG5pbXBvcnQge1ZpZXd9IGZyb20gJ3VpL2NvcmUvdmlldyc7XG5pbXBvcnQge0h0bWxWaWV3fSBmcm9tICd1aS9odG1sLXZpZXcnXG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YSwgRXZlbnREYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IHtBbmltYXRpb25DdXJ2ZX0gZnJvbSAndWkvZW51bXMnXG5pbXBvcnQge0dlc3R1cmVUeXBlc30gZnJvbSAndWkvZ2VzdHVyZXMnXG5cbmltcG9ydCB7QnJvd3NlclZpZXd9IGZyb20gJy4vY29tcG9uZW50cy9icm93c2VyLXZpZXcnO1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vYm9va21hcmtzJztcbmltcG9ydCB7YXBwVmlld01vZGVsLCBBcHBWaWV3TW9kZWwsIExvYWRVcmxFdmVudERhdGF9IGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vQXBwVmlld01vZGVsJztcbmltcG9ydCB7c2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vdXRpbCc7XG5cbi8vIGltcG9ydCB7UmVhbGl0eVZpZXdlcn0gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5cbi8vaW1wb3J0ICogYXMgb3JpZW50YXRpb25Nb2R1bGUgZnJvbSAnbmF0aXZlc2NyaXB0LXNjcmVlbi1vcmllbnRhdGlvbic7XG52YXIgb3JpZW50YXRpb25Nb2R1bGUgPSByZXF1aXJlKFwibmF0aXZlc2NyaXB0LXNjcmVlbi1vcmllbnRhdGlvblwiKTtcblxuZXhwb3J0IGxldCBwYWdlOlBhZ2U7XG5leHBvcnQgbGV0IGxheW91dDpWaWV3O1xuZXhwb3J0IGxldCB0b3VjaE92ZXJsYXlWaWV3OlZpZXc7XG5leHBvcnQgbGV0IGhlYWRlclZpZXc6VmlldztcbmV4cG9ydCBsZXQgbWVudVZpZXc6VmlldztcbmV4cG9ydCBsZXQgYnJvd3NlclZpZXc6QnJvd3NlclZpZXc7XG5leHBvcnQgbGV0IGJvb2ttYXJrc1ZpZXc6VmlldztcbmV4cG9ydCBsZXQgcmVhbGl0eUNob29zZXJWaWV3OlZpZXc7XG5cbmxldCBzZWFyY2hCYXI6U2VhcmNoQmFyO1xubGV0IGlvc1NlYXJjaEJhckNvbnRyb2xsZXI6SU9TU2VhcmNoQmFyQ29udHJvbGxlcjtcbmxldCBhbmRyb2lkU2VhcmNoQmFyQ29udHJvbGxlcjpBbmRyb2lkU2VhcmNoQmFyQ29udHJvbGxlcjtcblxudmFyIGlzRmlyc3RMb2FkID0gdHJ1ZTtcblxuYXBwVmlld01vZGVsLm9uKCdwcm9wZXJ0eUNoYW5nZScsIChldnQ6UHJvcGVydHlDaGFuZ2VEYXRhKT0+e1xuICAgIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnY3VycmVudFVyaScpIHtcbiAgICAgICAgc2V0U2VhcmNoQmFyVGV4dChhcHBWaWV3TW9kZWwuY3VycmVudFVyaSk7XG4gICAgICAgIGlmICghYXBwVmlld01vZGVsLmN1cnJlbnRVcmkpIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICd2aWV3ZXJFbmFibGVkJykge1xuICAgICAgICAvLyBjb25zdCB2dWZvcmlhRGVsZWdhdGUgPSBhcHBWaWV3TW9kZWwubWFuYWdlci5jb250YWluZXIuZ2V0KEFyZ29uLlZ1Zm9yaWFTZXJ2aWNlRGVsZWdhdGUpO1xuICAgICAgICAvLyB2dWZvcmlhRGVsZWdhdGUudmlld2VyRW5hYmxlZCA9IGV2dC52YWx1ZTtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgb3JpZW50YXRpb25Nb2R1bGUuc2V0Q3VycmVudE9yaWVudGF0aW9uKFwibGFuZHNjYXBlXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3JpZW50YXRpb25Nb2R1bGUuc2V0Q3VycmVudE9yaWVudGF0aW9uKFwicG9ydHJhaXRcIik7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJhbGxcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2hlY2tBY3Rpb25CYXIoKTtcbiAgICAgICAgdXBkYXRlU3lzdGVtVUkoKTtcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e2NoZWNrQWN0aW9uQmFyKCl9LCA1MDApO1xuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnbWVudU9wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlT3ZlcnZpZXcoKTtcbiAgICAgICAgICAgIG1lbnVWaWV3LnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcbiAgICAgICAgICAgIG1lbnVWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6IDEsXG4gICAgICAgICAgICAgICAgICAgIHk6IDEsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3Lm9uKEdlc3R1cmVUeXBlcy50b3VjaCwoKT0+e1xuICAgICAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVudVZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICBtZW51Vmlldy52aXNpYmlsaXR5ID0gXCJjb2xsYXBzZVwiO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnb3ZlcnZpZXdPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUJvb2ttYXJrcygpO1xuICAgICAgICAgICAgc2VhcmNoQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6LTEwMCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBzZWFyY2hCYXIudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnYWRkQnV0dG9uJyk7XG4gICAgICAgICAgICBhZGRCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi50cmFuc2xhdGVYID0gLTEwO1xuICAgICAgICAgICAgYWRkQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICBzZWFyY2hCYXIudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnYWRkQnV0dG9uJyk7XG4gICAgICAgICAgICBhZGRCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDotMTAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAncmVhbGl0eUNob29zZXJPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVZID0gMC45O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2Jvb2ttYXJrc09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjAsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfSBcbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnY2FuY2VsQnV0dG9uU2hvd24nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnb3ZlcnZpZXdCdXR0b24nKTtcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG1lbnVCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgY2FuY2VsQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnY2FuY2VsQnV0dG9uJyk7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdvdmVydmlld0J1dHRvbicpO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2NhbmNlbEJ1dHRvbicpO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxheW91dC5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG5cbmNvbnN0IGNoZWNrQWN0aW9uQmFyID0gKCkgPT4ge1xuICAgIGlmICghcGFnZSkgcmV0dXJuO1xuICAgIGlmIChzY3JlZW5PcmllbnRhdGlvbiA9PT0gOTAgfHwgc2NyZWVuT3JpZW50YXRpb24gPT09IC05MCB8fCBhcHBWaWV3TW9kZWwudmlld2VyRW5hYmxlZCkgXG4gICAgICAgIHBhZ2UuYWN0aW9uQmFySGlkZGVuID0gdHJ1ZTtcbiAgICBlbHNlIFxuICAgICAgICBwYWdlLmFjdGlvbkJhckhpZGRlbiA9IGZhbHNlO1xufVxuXG5jb25zdCB1cGRhdGVTeXN0ZW1VSSA9ICgpID0+IHtcbiAgICBpZiAoIXBhZ2UpIHJldHVybjtcbiAgICBpZiAoc2NyZWVuT3JpZW50YXRpb24gPT09IDkwIHx8IHNjcmVlbk9yaWVudGF0aW9uID09PSAtOTAgfHwgYXBwVmlld01vZGVsLnZpZXdlckVuYWJsZWQpIHtcbiAgICAgICAgaWYgKHBhZ2UuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGV0IHdpbmRvdyA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LmdldFdpbmRvdygpO1xuICAgICAgICAgICAgbGV0IGRlY29yVmlldyA9IHdpbmRvdy5nZXREZWNvclZpZXcoKTtcbiAgICAgICAgICAgIGxldCB1aU9wdGlvbnMgPSAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfSU1NRVJTSVZFX1NUSUNLWVxuICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfRlVMTFNDUkVFTlxuICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfSElERV9OQVZJR0FUSU9OXG4gICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0xBWU9VVF9TVEFCTEVcbiAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfRlVMTFNDUkVFTlxuICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19ISURFX05BVklHQVRJT047XG4gICAgICAgICAgICBkZWNvclZpZXcuc2V0U3lzdGVtVWlWaXNpYmlsaXR5KHVpT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocGFnZS5hbmRyb2lkKSB7XG4gICAgICAgICAgICBsZXQgd2luZG93ID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkuZ2V0V2luZG93KCk7XG4gICAgICAgICAgICBsZXQgZGVjb3JWaWV3ID0gd2luZG93LmdldERlY29yVmlldygpO1xuICAgICAgICAgICAgbGV0IHVpT3B0aW9ucyA9ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19WSVNJQkxFO1xuICAgICAgICAgICAgZGVjb3JWaWV3LnNldFN5c3RlbVVpVmlzaWJpbGl0eSh1aU9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFnZUxvYWRlZChhcmdzKSB7XG4gICAgXG4gICAgaWYgKCFpc0ZpcnN0TG9hZCkge1xuICAgICAgICAvLyBvbiBhbmRyb2lkIHBhZ2VMb2FkZWQgaXMgY2FsbGVkIGVhY2ggdGltZSB0aGUgYXBwIGlzIHJlc3VtZWRcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBhZ2UgPSBhcmdzLm9iamVjdDtcbiAgICBwYWdlLmJpbmRpbmdDb250ZXh0ID0gYXBwVmlld01vZGVsO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgbWVudSBidXR0b25cbiAgICBjb25zdCBtZW51QnV0dG9uID0gPEJ1dHRvbj4gcGFnZS5nZXRWaWV3QnlJZChcIm1lbnVCdXR0b25cIik7XG4gICAgbWVudUJ1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1ZDQpO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgb3ZlcnZpZXcgYnV0dG9uXG4gICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwib3ZlcnZpZXdCdXR0b25cIik7XG4gICAgb3ZlcnZpZXdCdXR0b24udGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhlNTNiKTtcblxuICAgIC8vIHdvcmthcm91bmQgKHNlZSBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L05hdGl2ZVNjcmlwdC9pc3N1ZXMvNjU5KVxuICAgIGlmIChwYWdlLmlvcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICBwYWdlLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgfSwgMClcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJQXBwbGljYXRpb25EaWRCZWNvbWVBY3RpdmVOb3RpZmljYXRpb24sICgpID0+IHtcbiAgICAgICAgICAgIHBhZ2UucmVxdWVzdExheW91dCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgY2hlY2tBY3Rpb25CYXIoKTtcbiAgICAgICAgICAgIHVwZGF0ZVN5c3RlbVVJKCk7XG4gICAgICAgIH0sIDUwMCk7XG4gICAgfSk7XG5cbiAgICBhcHBWaWV3TW9kZWwucmVhZHkudGhlbigoKT0+e1xuICAgICAgICBcbiAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnNlc3Npb24uZXJyb3JFdmVudC5hZGRFdmVudExpc3RlbmVyKChlcnJvcik9PntcbiAgICAgICAgICAgIC8vIGFsZXJ0KGVycm9yLm1lc3NhZ2UgKyAnXFxuJyArIGVycm9yLnN0YWNrKTtcbiAgICAgICAgICAgIGlmIChlcnJvci5zdGFjaykgY29uc29sZS5sb2coZXJyb3IubWVzc2FnZSArICdcXG4nICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICB9KTtcblxuICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG4gICAgICAgIHZhciBhY3Rpdml0eSA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5O1xuICAgICAgICBhY3Rpdml0eS5vbkJhY2tQcmVzc2VkID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgIT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgJiYgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3ICYmIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5hbmRyb2lkLmNhbkdvQmFjaygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5hbmRyb2lkLmdvQmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24uc3VzcGVuZEV2ZW50LCAoKT0+IHtcbiAgICBpc0ZpcnN0TG9hZCA9IGZhbHNlO1xufSk7XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnJlc3VtZUV2ZW50LCAoKT0+IHtcbiAgICBpZiAoYXBwbGljYXRpb24uYW5kcm9pZCkge1xuICAgICAgICAvLyBvbiBhbmRyb2lkIHRoZSBwYWdlIGlzIHVubG9hZGVkL3JlbG9hZGVkIGFmdGVyIGEgc3VzcGVuZFxuICAgICAgICAvLyBvcGVuIGJhY2sgdG8gYm9va21hcmtzIGlmIG5lY2Vzc2FyeVxuICAgICAgICBpZiAoYXBwVmlld01vZGVsLmJvb2ttYXJrc09wZW4pIHtcbiAgICAgICAgICAgIC8vIGZvcmNlIGEgcHJvcGVydHkgY2hhbmdlIGV2ZW50XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwubm90aWZ5UHJvcGVydHlDaGFuZ2UoJ2Jvb2ttYXJrc09wZW4nLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gbGF5b3V0TG9hZGVkKGFyZ3MpIHtcbiAgICBsYXlvdXQgPSBhcmdzLm9iamVjdFxuICAgIGlmIChsYXlvdXQuaW9zKSB7XG4gICAgICAgIGxheW91dC5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgIH1cbiAgICBhcHBWaWV3TW9kZWwuc2V0UmVhZHkoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhlYWRlckxvYWRlZChhcmdzKSB7XG4gICAgaGVhZGVyVmlldyA9IGFyZ3Mub2JqZWN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoQmFyTG9hZGVkKGFyZ3MpIHtcbiAgICBzZWFyY2hCYXIgPSBhcmdzLm9iamVjdDtcblxuICAgIGlmIChpc0ZpcnN0TG9hZCkge1xuICAgICAgICBzZWFyY2hCYXIub24oU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LCAoKSA9PiB7XG4gICAgICAgICAgICBsZXQgdXJsU3RyaW5nID0gc2VhcmNoQmFyLnRleHQ7XG5cbiAgICAgICAgICAgIGlmICh1cmxTdHJpbmcuaW5jbHVkZXMoXCIgXCIpIHx8ICF1cmxTdHJpbmcuaW5jbHVkZXMoXCIuXCIpKSB7XG4gICAgICAgICAgICAgICAgLy8gcXVlcmllcyB3aXRoIHNwYWNlcyBvciBzaW5nbGUgd29yZHMgd2l0aG91dCBkb3RzIGdvIHRvIGdvb2dsZSBzZWFyY2hcbiAgICAgICAgICAgICAgICB1cmxTdHJpbmcgPSBcImh0dHA6Ly93d3cuZ29vZ2xlLmNvbS9zZWFyY2g/cT1cIiArIGVuY29kZVVSSSh1cmxTdHJpbmcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodXJsU3RyaW5nLmluZGV4T2YoJy8vJykgPT09IC0xKSB1cmxTdHJpbmcgPSAnLy8nICsgdXJsU3RyaW5nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB1cmwgPSBVUkkodXJsU3RyaW5nKTtcbiAgICAgICAgICAgIGlmICh1cmwucHJvdG9jb2woKSAhPT0gXCJodHRwXCIgJiYgdXJsLnByb3RvY29sKCkgIT09IFwiaHR0cHNcIikge1xuICAgICAgICAgICAgICAgIHVybC5wcm90b2NvbChcImh0dHBcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRTZWFyY2hCYXJUZXh0KHVybC50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5sb2FkVXJsKHVybC50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQm9va21hcmtzKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZVJlYWxpdHlDaG9vc2VyKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIgPSBuZXcgSU9TU2VhcmNoQmFyQ29udHJvbGxlcihzZWFyY2hCYXIpO1xuICAgIH1cblxuICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG4gICAgICAgIGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyID0gbmV3IEFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyKHNlYXJjaEJhcik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWFyY2hCYXJUZXh0KHVybDpzdHJpbmcpIHtcbiAgICBpZiAoaW9zU2VhcmNoQmFyQ29udHJvbGxlcikge1xuICAgICAgICBpb3NTZWFyY2hCYXJDb250cm9sbGVyLnNldFRleHQodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhbmRyb2lkU2VhcmNoQmFyQ29udHJvbGxlci5zZXRUZXh0KHVybCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBibHVyU2VhcmNoQmFyKCkge1xuICAgIHNlYXJjaEJhci5kaXNtaXNzU29mdElucHV0KCk7XG4gICAgaWYgKHNlYXJjaEJhci5hbmRyb2lkKSB7XG4gICAgICAgIHNlYXJjaEJhci5hbmRyb2lkLmNsZWFyRm9jdXMoKTtcbiAgICB9XG4gICAgLy9ib29rbWFya3MuZmlsdGVyQ29udHJvbC5zZXQoJ3Nob3dGaWx0ZXJlZFJlc3VsdHMnLCBmYWxzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicm93c2VyVmlld0xvYWRlZChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcgPSBhcmdzLm9iamVjdDtcblxuICAgIGlmIChpc0ZpcnN0TG9hZCkge1xuICAgICAgICBhcHBWaWV3TW9kZWwub24oQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCwgKGRhdGE6TG9hZFVybEV2ZW50RGF0YSk9PntcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IGRhdGEudXJsO1xuXG4gICAgICAgICAgICBpZiAoIWRhdGEubmV3TGF5ZXIgfHwgXG4gICAgICAgICAgICAgICAgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgJiZcbiAgICAgICAgICAgICAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyICE9PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIgJiZcbiAgICAgICAgICAgICAgICAhYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci5kZXRhaWxzLnVyaSkpIHtcbiAgICAgICAgICAgICAgICBicm93c2VyVmlldy5sb2FkVXJsKHVybCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBsYXllciA9IGJyb3dzZXJWaWV3LmFkZExheWVyKCk7XG4gICAgICAgICAgICBicm93c2VyVmlldy5zZXRGb2N1c3NlZExheWVyKGxheWVyKTtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LmxvYWRVcmwodXJsKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2FkaW5nIHVybDogJyArIHVybCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFNldHVwIHRoZSBkZWJ1ZyB2aWV3XG4gICAgbGV0IGRlYnVnOkh0bWxWaWV3ID0gPEh0bWxWaWV3PmJyb3dzZXJWaWV3LnBhZ2UuZ2V0Vmlld0J5SWQoXCJkZWJ1Z1wiKTtcbiAgICBkZWJ1Zy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigxNTAsIDI1NSwgMjU1LCAyNTUpO1xuICAgIGRlYnVnLnZpc2liaWxpdHkgPSBcImNvbGxhcHNlZFwiO1xuICAgIGRlYnVnLmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IGZhbHNlO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBib29rbWFya3NWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBib29rbWFya3NWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVggPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWxpdHlDaG9vc2VyTG9hZGVkKGFyZ3MpIHtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVYID0gMC45O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG91Y2hPdmVybGF5TG9hZGVkKGFyZ3MpIHtcbiAgICB0b3VjaE92ZXJsYXlWaWV3ID0gYXJncy5vYmplY3Q7XG59XG5cbi8vIGluaXRpYWxpemUgc29tZSBwcm9wZXJ0aWVzIG9mIHRoZSBtZW51IHNvIHRoYXQgYW5pbWF0aW9ucyB3aWxsIHJlbmRlciBjb3JyZWN0bHlcbmV4cG9ydCBmdW5jdGlvbiBtZW51TG9hZGVkKGFyZ3MpIHtcbiAgICBtZW51VmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIG1lbnVWaWV3Lm9yaWdpblggPSAxO1xuICAgIG1lbnVWaWV3Lm9yaWdpblkgPSAwO1xuICAgIG1lbnVWaWV3LnNjYWxlWCA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVZID0gMDtcbiAgICBtZW51Vmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2VhcmNoQmFyVGFwKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkNhbmNlbChhcmdzKSB7XG4gICAgaWYgKCEhYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5oaWRlQm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgYmx1clNlYXJjaEJhcigpO1xuICAgIHNldFNlYXJjaEJhclRleHQoYXBwVmlld01vZGVsLmN1cnJlbnRVcmkpO1xuICAgIGJvb2ttYXJrcy5maWx0ZXJDb250cm9sLnNldCgnc2hvd0ZpbHRlcmVkUmVzdWx0cycsIGZhbHNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uQWRkQ2hhbm5lbChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcuYWRkTGF5ZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uUmVsb2FkKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyICYmIFxuICAgICAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcgJiYgXG4gICAgICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uRmF2b3JpdGVUb2dnbGUoYXJncykge1xuICAgIGNvbnN0IHVybCA9IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpO1xuICAgIGNvbnN0IGJvb2ttYXJrSXRlbSA9IGJvb2ttYXJrcy5mYXZvcml0ZU1hcC5nZXQodXJsKTtcbiAgICBpZiAoIWJvb2ttYXJrSXRlbSkge1xuICAgICAgICBib29rbWFya3MuZmF2b3JpdGVMaXN0LnB1c2gobmV3IGJvb2ttYXJrcy5Cb29rbWFya0l0ZW0oe1xuICAgICAgICAgICAgdXJpOiB1cmwsXG4gICAgICAgICAgICB0aXRsZTogYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy50aXRsZVxuICAgICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGkgPSBib29rbWFya3MuZmF2b3JpdGVMaXN0LmluZGV4T2YoYm9va21hcmtJdGVtKTtcbiAgICAgICAgYm9va21hcmtzLmZhdm9yaXRlTGlzdC5zcGxpY2UoaSwxKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkludGVyYWN0aW9uVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlSW50ZXJhY3Rpb25Nb2RlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk92ZXJ2aWV3KGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlT3ZlcnZpZXcoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uTWVudShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2VsZWN0UmVhbGl0eShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnNob3dSZWFsaXR5Q2hvb3NlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNldHRpbmdzKGFyZ3MpIHtcbiAgICAvL2NvZGUgdG8gb3BlbiB0aGUgc2V0dGluZ3MgdmlldyBnb2VzIGhlcmVcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uVmlld2VyVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlVmlld2VyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkRlYnVnVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlRGVidWcoKTtcbn1cblxuY2xhc3MgSU9TU2VhcmNoQmFyQ29udHJvbGxlciB7XG5cbiAgICBwcml2YXRlIHVpU2VhcmNoQmFyOlVJU2VhcmNoQmFyO1xuICAgIHByaXZhdGUgdGV4dEZpZWxkOlVJVGV4dEZpZWxkO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIHNlYXJjaEJhcjpTZWFyY2hCYXIpIHtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhciA9IHNlYXJjaEJhci5pb3M7XG4gICAgICAgIHRoaXMudGV4dEZpZWxkID0gdGhpcy51aVNlYXJjaEJhci52YWx1ZUZvcktleShcInNlYXJjaEZpZWxkXCIpO1xuXG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIua2V5Ym9hcmRUeXBlID0gVUlLZXlib2FyZFR5cGUuVVJMO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLmF1dG9jYXBpdGFsaXphdGlvblR5cGUgPSBVSVRleHRBdXRvY2FwaXRhbGl6YXRpb25UeXBlLk5vbmU7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuc2VhcmNoQmFyU3R5bGUgPSBVSVNlYXJjaEJhclN0eWxlLk1pbmltYWw7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIucmV0dXJuS2V5VHlwZSA9IFVJUmV0dXJuS2V5VHlwZS5HbztcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5zZXRJbWFnZUZvclNlYXJjaEJhckljb25TdGF0ZShVSUltYWdlLm5ldygpLCBVSVNlYXJjaEJhckljb24uU2VhcmNoLCBVSUNvbnRyb2xTdGF0ZS5Ob3JtYWwpXG4gICAgICAgIFxuICAgICAgICB0aGlzLnRleHRGaWVsZC5sZWZ0Vmlld01vZGUgPSBVSVRleHRGaWVsZFZpZXdNb2RlLk5ldmVyO1xuXG4gICAgICAgIGNvbnN0IHRleHRGaWVsZEVkaXRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG4gICAgICAgICAgICBpZiAodXRpbHMuaW9zLmdldHRlcihVSVJlc3BvbmRlciwgdGhpcy51aVNlYXJjaEJhci5pc0ZpcnN0UmVzcG9uZGVyKSkge1xuICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51aVNlYXJjaEJhci50ZXh0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnRleHQgPSBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQuc2VsZWN0ZWRUZXh0UmFuZ2UgPSB0aGlzLnRleHRGaWVsZC50ZXh0UmFuZ2VGcm9tUG9zaXRpb25Ub1Bvc2l0aW9uKHRoaXMudGV4dEZpZWxkLmJlZ2lubmluZ09mRG9jdW1lbnQsIHRoaXMudGV4dEZpZWxkLmVuZE9mRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxheW91dC5vbihHZXN0dXJlVHlwZXMudG91Y2gsKCk9PntcbiAgICAgICAgICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgICAgICAgICBsYXlvdXQub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vdGhpcy5zZXRQbGFjZWhvbGRlclRleHQoYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpO1xuICAgICAgICAgICAgICAgIC8vdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRleHRGaWVsZENoYW5nZUhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICBib29rbWFya3MuZmlsdGVyQm9va21hcmtzKHRoaXMudWlTZWFyY2hCYXIudGV4dC50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGJvb2ttYXJrcy5maWx0ZXJDb250cm9sLnNldCgnc2hvd0ZpbHRlcmVkUmVzdWx0cycsIHRoaXMudWlTZWFyY2hCYXIudGV4dC5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSVRleHRGaWVsZFRleHREaWRCZWdpbkVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZEVuZEVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZENoYW5nZU5vdGlmaWNhdGlvbiwgdGV4dEZpZWxkQ2hhbmdlSGFuZGxlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXRQbGFjZWhvbGRlclRleHQodGV4dDpzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzOiBOU011dGFibGVEaWN0aW9uYXJ5PHN0cmluZyxhbnk+ID0gTlNNdXRhYmxlRGljdGlvbmFyeS5uZXc8c3RyaW5nLGFueT4oKS5pbml0KCk7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLnNldE9iamVjdEZvcktleSh1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsVUlDb2xvci5ibGFja0NvbG9yKSwgTlNGb3JlZ3JvdW5kQ29sb3JBdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLmF0dHJpYnV0ZWRQbGFjZWhvbGRlciA9IE5TQXR0cmlidXRlZFN0cmluZy5hbGxvYygpLmluaXRXaXRoU3RyaW5nQXR0cmlidXRlcyh0ZXh0LCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLnBsYWNlaG9sZGVyID0gc2VhcmNoQmFyLmhpbnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0VGV4dCh1cmwpIHtcbiAgICAgICAgaWYgKCF1dGlscy5pb3MuZ2V0dGVyKFVJUmVzcG9uZGVyLCB0aGlzLnVpU2VhcmNoQmFyLmlzRmlyc3RSZXNwb25kZXIpKSB7XG4gICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dCh1cmwpO1xuICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gXCJcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudWlTZWFyY2hCYXIudGV4dCA9IHVybDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgQW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSBzZWFyY2hWaWV3OmFuZHJvaWQud2lkZ2V0LlNlYXJjaFZpZXc7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc2VhcmNoQmFyOlNlYXJjaEJhcikge1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcgPSBzZWFyY2hCYXIuYW5kcm9pZDtcblxuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW5wdXRUeXBlKGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9DTEFTU19URVhUIHwgYW5kcm9pZC50ZXh0LklucHV0VHlwZS5UWVBFX1RFWFRfVkFSSUFUSU9OX1VSSSB8IGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9URVhUX0ZMQUdfTk9fU1VHR0VTVElPTlMpO1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW1lT3B0aW9ucyhhbmRyb2lkLnZpZXcuaW5wdXRtZXRob2QuRWRpdG9ySW5mby5JTUVfQUNUSU9OX0dPKTtcbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LmNsZWFyRm9jdXMoKTtcblxuICAgICAgICBjb25zdCBmb2N1c0hhbmRsZXIgPSBuZXcgYW5kcm9pZC52aWV3LlZpZXcuT25Gb2N1c0NoYW5nZUxpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uRm9jdXNDaGFuZ2UodjogYW5kcm9pZC52aWV3LlZpZXcsIGhhc0ZvY3VzOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvb2ttYXJrcy5maWx0ZXJDb250cm9sLnNldCgnc2hvd0ZpbHRlcmVkUmVzdWx0cycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRPblF1ZXJ5VGV4dEZvY3VzQ2hhbmdlTGlzdGVuZXIoZm9jdXNIYW5kbGVyKTtcblxuICAgICAgICAvLyB0aGUgbmF0aXZlc2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIE9uUXVlcnlUZXh0TGlzdGVuZXIgZG9lcyBub3QgY29ycmVjdGx5IGhhbmRsZSB0aGUgZm9sbG93aW5nIGNhc2U6XG4gICAgICAgIC8vIDEpIGFuIGV4dGVybmFsIGV2ZW50IHVwZGF0ZXMgdGhlIHF1ZXJ5IHRleHQgKGUuZy4gdGhlIHVzZXIgY2xpY2tlZCBhIGxpbmsgb24gYSBwYWdlKVxuICAgICAgICAvLyAyKSB0aGUgdXNlciBhdHRlbXB0cyB0byBuYXZpZ2F0ZSBiYWNrIHRvIHRoZSBwcmV2aW91cyBwYWdlIGJ5IHVwZGF0aW5nIHRoZSBzZWFyY2ggYmFyIHRleHRcbiAgICAgICAgLy8gMykgbmF0aXZlc2NyaXB0IHNlZXMgdGhpcyBhcyBzdWJtaXR0aW5nIHRoZSBzYW1lIHF1ZXJ5IGFuZCB0cmVhdHMgaXQgYXMgYSBuby1vcFxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L05hdGl2ZVNjcmlwdC9pc3N1ZXMvMzk2NVxuICAgICAgICBjb25zdCBzZWFyY2hIYW5kbGVyID0gbmV3IGFuZHJvaWQud2lkZ2V0LlNlYXJjaFZpZXcuT25RdWVyeVRleHRMaXN0ZW5lcih7XG4gICAgICAgICAgICBvblF1ZXJ5VGV4dENoYW5nZShuZXdUZXh0OiBTdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgICAgICAgICBzZWFyY2hCYXIuX29uUHJvcGVydHlDaGFuZ2VkRnJvbU5hdGl2ZShTZWFyY2hCYXIudGV4dFByb3BlcnR5LCBuZXdUZXh0KTtcbiAgICAgICAgICAgICAgICBib29rbWFya3MuZmlsdGVyQm9va21hcmtzKG5ld1RleHQudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzLmZpbHRlckNvbnRyb2wuc2V0KCdzaG93RmlsdGVyZWRSZXN1bHRzJywgbmV3VGV4dC5sZW5ndGggPiAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25RdWVyeVRleHRTdWJtaXQocXVlcnk6IFN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgICAgIHNlYXJjaEJhci5ub3RpZnkoPEV2ZW50RGF0YT57XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IHRoaXNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LnNldE9uUXVlcnlUZXh0TGlzdGVuZXIoc2VhcmNoSGFuZGxlcik7XG4gICAgfVxuXG4gICAgcHVibGljIHNldFRleHQodXJsKSB7XG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRRdWVyeSh1cmwsIGZhbHNlKTtcbiAgICB9XG59XG4iXX0=