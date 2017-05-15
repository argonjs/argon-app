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
                urlString = "https://www.google.com/search?q=" + encodeURI(urlString);
            }
            if (urlString.indexOf('//') === -1)
                urlString = '//' + urlString;
            var url = URI(urlString);
            if (url.protocol() !== "http" && url.protocol() !== "https") {
                url.protocol("https");
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
        this.uiSearchBar.keyboardType = 10 /* WebSearch */;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQTJEO0FBRTNELCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUNsRCxJQUFJLDBCQUFxRCxDQUFDO0FBRTFELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQztBQUV2QiwyQkFBWSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLEdBQXNCO0lBQ3JELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwQyxnQkFBZ0IsQ0FBQywyQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQVksQ0FBQyxVQUFVLENBQUM7WUFBQywyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQy9ELENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLDRGQUE0RjtRQUM1Riw2Q0FBNkM7UUFDN0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FB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