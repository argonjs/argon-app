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
function pageLoaded(args) { }
exports.pageLoaded = pageLoaded;
function navigatedTo(args) {
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
    AppViewModel_1.appViewModel.setReady();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQXVGO0FBRXZGLCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUNsRCxJQUFJLDBCQUFxRCxDQUFDO0FBRTFELDJCQUFZLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLFVBQUMsR0FBc0I7SUFDckQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLGdCQUFnQixDQUFDLDJCQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUMsRUFBRSxDQUFDLENBQUMsQ0FBQywyQkFBWSxDQUFDLFVBQVUsQ0FBQztZQUFDLDJCQUFZLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDL0QsQ0FBQztJQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsNEZBQTRGO1FBQzVGLDZDQUE2QztRQUM3QyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNaLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BELGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFDRCxjQUFjLEVBQUUsQ0FBQztRQUNqQixVQUFVLENBQUMsY0FBSyxjQUFjLEVBQUUsQ0FBQSxDQUFBLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN2QyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNaLDJCQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUIsZ0JBQVEsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ2hDLGdCQUFRLENBQUMsT0FBTyxDQUFDO2dCQUNiLEtBQUssRUFBRTtvQkFDSCxDQUFDLEVBQUUsQ0FBQztvQkFDSixDQUFDLEVBQUUsQ0FBQztpQkFDUDtnQkFDRCxRQUFRLEVBQUUsR0FBRztnQkFDYixPQUFPLEVBQUUsQ0FBQztnQkFDVixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxTQUFTO2FBQ2xDLENBQUMsQ0FBQztZQUNILHdCQUFnQixDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7WUFDeEMsd0JBQWdCLENBQUMsRUFBRSxDQUFDLHVCQUFZLENBQUMsS0FBSyxFQUFDO2dCQUNuQyx3QkFBZ0IsQ0FBQyxHQUFHLENBQUMsdUJBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDekMsd0JBQWdCLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztnQkFDekMsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLGdCQUFRLENBQUMsT0FBTyxDQUFDO2dCQUNiLEtBQUssRUFBRTtvQkFDSCxDQUFDLEVBQUUsQ0FBQztvQkFDSixDQUFDLEVBQUUsQ0FBQztpQkFDUDtnQkFDRCxRQUFRLEVBQUUsR0FBRztnQkFDYixPQUFPLEVBQUUsQ0FBQztnQkFDVixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxTQUFTO2FBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osZ0JBQVEsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1lBQ3JDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsd0JBQWdCLENBQUMsR0FBRyxDQUFDLHVCQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekMsd0JBQWdCLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QyxDQUFDO0lBQ0wsQ0FBQztJQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDWiwyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzdCLFNBQVMsQ0FBQyxPQUFPLENBQUM7Z0JBQ2QsU0FBUyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUM7Z0JBQ3hCLE9BQU8sRUFBRSxDQUFDO2dCQUNWLEtBQUssRUFBRSxzQkFBYyxDQUFDLFNBQVM7YUFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUN0QyxDQUFDLENBQUMsQ0FBQTtZQUNGLElBQU0sU0FBUyxHQUFHLGtCQUFVLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3RELFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ2pDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDM0IsU0FBUyxDQUFDLE9BQU8sQ0FBQztnQkFDZCxTQUFTLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7Z0JBQ3BCLE9BQU8sRUFBQyxDQUFDO2FBQ1osQ0FBQyxDQUFBO1FBQ04sQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osRUFBRSxDQUFDLENBQUMsQ0FBQywyQkFBWSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7Z0JBQUMsMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNqRSxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUNqQyxTQUFTLENBQUMsT0FBTyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBQztnQkFDckIsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUE7WUFDRixJQUFNLFdBQVMsR0FBRyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RCxXQUFTLENBQUMsT0FBTyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFDO2dCQUN2QixPQUFPLEVBQUMsQ0FBQzthQUNaLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osV0FBUyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUNqRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNaLDBCQUFrQixDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7WUFDMUMsMEJBQWtCLENBQUMsT0FBTyxDQUFDO2dCQUN2QixLQUFLLEVBQUU7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7aUJBQ047Z0JBQ0QsT0FBTyxFQUFDLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUE7WUFDRiwyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDcEMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osMEJBQWtCLENBQUMsT0FBTyxDQUFDO2dCQUN2QixLQUFLLEVBQUU7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7aUJBQ047Z0JBQ0QsT0FBTyxFQUFDLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNKLDBCQUFrQixDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQzNDLDBCQUFrQixDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7Z0JBQ2hDLDBCQUFrQixDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUE7WUFDRixhQUFhLEVBQUUsQ0FBQztZQUNoQiwyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDcEMsQ0FBQztJQUNMLENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1oscUJBQWEsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ3JDLHFCQUFhLENBQUMsT0FBTyxDQUFDO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7b0JBQ0gsQ0FBQyxFQUFDLENBQUM7aUJBQ047Z0JBQ0QsT0FBTyxFQUFDLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsS0FBSyxFQUFFLHNCQUFjLENBQUMsU0FBUzthQUNsQyxDQUFDLENBQUE7UUFDTixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixxQkFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDbEIsS0FBSyxFQUFFO29CQUNILENBQUMsRUFBQyxDQUFDO29CQUNILENBQUMsRUFBQyxDQUFDO2lCQUNOO2dCQUNELE9BQU8sRUFBQyxDQUFDO2dCQUNULFFBQVEsRUFBRSxHQUFHO2dCQUNiLEtBQUssRUFBRSxzQkFBYyxDQUFDLFNBQVM7YUFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixxQkFBYSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQ3RDLHFCQUFhLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztnQkFDM0IscUJBQWEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFBO1lBQ0YsYUFBYSxFQUFFLENBQUM7WUFDaEIsMkJBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3BDLENBQUM7SUFDTCxDQUFDO0lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQ2hELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1osSUFBTSxnQkFBYyxHQUFHLGtCQUFVLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDaEUsZ0JBQWMsQ0FBQyxPQUFPLENBQUM7Z0JBQ25CLE9BQU8sRUFBQyxDQUFDO2FBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixnQkFBYyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDM0MsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFNLFlBQVUsR0FBRyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4RCxZQUFVLENBQUMsT0FBTyxDQUFDO2dCQUNmLE9BQU8sRUFBQyxDQUFDO2FBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixZQUFVLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQTtZQUNGLElBQU0sWUFBWSxHQUFHLGtCQUFVLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzVELFlBQVksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ3BDLFlBQVksQ0FBQyxPQUFPLENBQUM7Z0JBQ2pCLE9BQU8sRUFBQyxDQUFDO2FBQ1osQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBTSxjQUFjLEdBQUcsa0JBQVUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNoRSxjQUFjLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUN0QyxjQUFjLENBQUMsT0FBTyxDQUFDO2dCQUNuQixPQUFPLEVBQUMsQ0FBQzthQUNaLENBQUMsQ0FBQTtZQUNGLElBQU0sVUFBVSxHQUFHLGtCQUFVLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hELFVBQVUsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ2xDLFVBQVUsQ0FBQyxPQUFPLENBQUM7Z0JBQ2YsT0FBTyxFQUFDLENBQUM7YUFDWixDQUFDLENBQUE7WUFDRixJQUFNLGNBQVksR0FBRyxrQkFBVSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1RCxjQUFZLENBQUMsT0FBTyxDQUFDO2dCQUNqQixPQUFPLEVBQUMsQ0FBQzthQUNaLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ0osY0FBWSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDekMsQ0FBQyxDQUFDLENBQUE7WUFFRixjQUFNLENBQUMsR0FBRyxDQUFDLHVCQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsQ0FBQztJQUNMLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLElBQU0sY0FBYyxHQUFHO0lBQ25CLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBSSxDQUFDO1FBQUMsTUFBTSxDQUFDO0lBQ2xCLElBQU0sV0FBVyxHQUFHLDJCQUFvQixFQUFFLENBQUM7SUFDM0MsRUFBRSxDQUFDLENBQUMsV0FBVyxLQUFLLEVBQUUsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLElBQUksMkJBQVksQ0FBQyxhQUFhLENBQUM7UUFDeEUsWUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7SUFDaEMsSUFBSTtRQUNBLFlBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO0FBQ3JDLENBQUMsQ0FBQTtBQUVELElBQU0sY0FBYyxHQUFHO0lBQ25CLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBSSxDQUFDO1FBQUMsTUFBTSxDQUFDO0lBQ2xCLElBQU0sV0FBVyxHQUFHLDJCQUFvQixFQUFFLENBQUM7SUFDM0MsRUFBRSxDQUFDLENBQUMsV0FBVyxLQUFLLEVBQUUsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLElBQUksMkJBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzFFLEVBQUUsQ0FBQyxDQUFDLFlBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2YsSUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoRSxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdEMsSUFBSSxTQUFTLEdBQVMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsK0JBQStCO2tCQUN4RCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxnQ0FBZ0M7a0JBQ25ELE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLHFDQUFxQztrQkFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsNEJBQTRCO2tCQUMvQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyx5QkFBeUI7a0JBQzVDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLDhCQUE4QixDQUFDO1lBQ2xFLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osRUFBRSxDQUFDLENBQUMsWUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hFLElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN0QyxJQUFJLFNBQVMsR0FBUyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxzQkFBc0IsQ0FBQztZQUNoRSxTQUFTLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0MsQ0FBQztJQUNMLENBQUM7QUFDTCxDQUFDLENBQUE7QUFFRCxvQkFBMkIsSUFBSSxJQUFHLENBQUM7QUFBbkMsZ0NBQW1DO0FBRW5DLHFCQUE0QixJQUFJO0lBRTVCLFlBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ25CLFlBQUksQ0FBQyxjQUFjLEdBQUcsMkJBQVksQ0FBQztJQUVuQyxtQ0FBbUM7SUFDbkMsSUFBTSxVQUFVLEdBQVksWUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMzRCxVQUFVLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFOUMsdUNBQXVDO0lBQ3ZDLElBQU0sY0FBYyxHQUFZLFlBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNuRSxjQUFjLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFbEQsMkVBQTJFO0lBQzNFLEVBQUUsQ0FBQyxDQUFDLFlBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ1gsVUFBVSxDQUFDO1lBQ1AsWUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3pCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNMLFdBQVcsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsd0NBQXdDLEVBQUU7WUFDOUUsWUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFO1FBQ2hELDhCQUF1QixFQUFFLENBQUM7UUFDMUIsVUFBVSxDQUFDO1lBQ1AsOEJBQXVCLEVBQUUsQ0FBQztZQUMxQixjQUFjLEVBQUUsQ0FBQztZQUNqQixjQUFjLEVBQUUsQ0FBQztRQUNyQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDWixDQUFDLENBQUMsQ0FBQztJQUVILDhCQUF1QixFQUFFLENBQUM7SUFFMUIsMkJBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRXBCLDJCQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsVUFBQyxLQUFLO1lBQ3pELDZDQUE2QztZQUM3QyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQyxDQUFDO1FBRUgsMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztJQUVILDJCQUFZLENBQUMsRUFBRSxDQUFDLDJCQUFZLENBQUMsWUFBWSxFQUFFLFVBQUMsSUFBcUI7UUFDN0QsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUVyQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRO1lBQ2QsQ0FBQyxtQkFBVyxDQUFDLGFBQWE7Z0JBQzFCLG1CQUFXLENBQUMsYUFBYSxLQUFLLG1CQUFXLENBQUMsWUFBWTtnQkFDdEQsQ0FBQyxtQkFBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFDLG1CQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQztRQUNYLENBQUM7UUFFRCxJQUFNLEtBQUssR0FBRyxtQkFBVyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3JDLG1CQUFXLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsbUJBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0QixJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBQ3RELFFBQVEsQ0FBQyxhQUFhLEdBQUc7WUFDckIsRUFBRSxDQUFDLENBQUMsbUJBQVcsQ0FBQyxhQUFhLElBQUksbUJBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUN4RCxFQUFFLENBQUMsQ0FBQyxtQkFBVyxDQUFDLGFBQWEsSUFBSSxtQkFBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLElBQUksbUJBQVcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzFILG1CQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZELENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQyxDQUFBO0lBQ0wsQ0FBQztBQUNMLENBQUM7QUF2RUQsa0NBdUVDO0FBRUQsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFO0lBQ3BDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLDJEQUEyRDtRQUMzRCxzQ0FBc0M7UUFDdEMsRUFBRSxDQUFDLENBQUMsMkJBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQzdCLGdDQUFnQztZQUNoQywyQkFBWSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0wsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsc0JBQTZCLElBQUk7SUFDN0IsY0FBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDcEIsRUFBRSxDQUFDLENBQUMsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDYixjQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQzNDLENBQUM7SUFDRCwyQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzVCLENBQUM7QUFORCxvQ0FNQztBQUVELHNCQUE2QixJQUFJO0lBQzdCLGtCQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUM3QixDQUFDO0FBRkQsb0NBRUM7QUFFRCx5QkFBZ0MsSUFBSTtJQUNoQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUV4QixTQUFTLENBQUMsRUFBRSxDQUFDLHNCQUFTLENBQUMsV0FBVyxFQUFFO1FBQ2hDLElBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFDL0IsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBRWpFLElBQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzFELEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUNELGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLDJCQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLDJCQUFZLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDN0IsMkJBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ2xDLDJCQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoQyxhQUFhLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLHNCQUFzQixHQUFHLElBQUksc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLDBCQUEwQixHQUFHLElBQUksMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0UsQ0FBQztBQUNMLENBQUM7QUExQkQsMENBMEJDO0FBRUQsMEJBQTBCLEdBQVU7SUFDaEMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDSiwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUMsQ0FBQztBQUNMLENBQUM7QUFFRDtJQUNJLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQzdCLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbkMsQ0FBQztBQUNMLENBQUM7QUFFRCwyQkFBa0MsSUFBSTtJQUNsQyxtQkFBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFFMUIsdUJBQXVCO0lBQ3ZCLElBQUksS0FBSyxHQUFzQixtQkFBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckUsS0FBSyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztJQUN0QyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO0lBQ3BDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxhQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdEQsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7SUFDL0IsS0FBSyxDQUFDLHdCQUF3QixHQUFHLEtBQUssQ0FBQztBQUMzQyxDQUFDO0FBVkQsOENBVUM7QUFHRCw2QkFBb0MsSUFBSTtJQUNwQyxxQkFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDNUIscUJBQWEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQzNCLHFCQUFhLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUMzQixxQkFBYSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUxELGtEQUtDO0FBRUQsOEJBQXFDLElBQUk7SUFDckMsMEJBQWtCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNqQywwQkFBa0IsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQ2hDLDBCQUFrQixDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7SUFDaEMsMEJBQWtCLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBTEQsb0RBS0M7QUFFRCw0QkFBbUMsSUFBSTtJQUNuQyx3QkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ25DLENBQUM7QUFGRCxnREFFQztBQUVELGtGQUFrRjtBQUNsRixvQkFBMkIsSUFBSTtJQUMzQixnQkFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDdkIsZ0JBQVEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLGdCQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztJQUNyQixnQkFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDcEIsZ0JBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLGdCQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBUEQsZ0NBT0M7QUFFRCx3QkFBK0IsSUFBSTtJQUMvQiwyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzdCLDJCQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUNwQyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxrQkFBeUIsSUFBSTtJQUN6QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsMkJBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO1FBQUMsMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNsRSwyQkFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDbEMsMkJBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ2hDLGFBQWEsRUFBRSxDQUFDO0FBQ3BCLENBQUM7QUFMRCw0QkFLQztBQUVELHNCQUE2QixJQUFJO0lBQzdCLG1CQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDdkIsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSEQsb0NBR0M7QUFFRCxrQkFBeUIsSUFBSTtJQUN6QixtQkFBVyxDQUFDLGFBQWE7UUFDckIsbUJBQVcsQ0FBQyxhQUFhLENBQUMsT0FBTztRQUNqQyxtQkFBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDbkQsQ0FBQztBQUpELDRCQUlDO0FBRUQsMEJBQWlDLElBQUk7SUFDakMsSUFBTSxHQUFHLEdBQUcsMkJBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO0lBQzFDLElBQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BELEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNoQixTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxZQUFZLENBQUM7WUFDbkQsR0FBRyxFQUFFLEdBQUc7WUFDUixLQUFLLEVBQUUsMkJBQVksQ0FBQyxZQUFZLENBQUMsS0FBSztTQUN6QyxDQUFDLENBQUMsQ0FBQztJQUNSLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0FBQ0wsQ0FBQztBQVpELDRDQVlDO0FBRUQsNkJBQW9DLElBQUk7SUFDcEMsMkJBQVksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0FBQ3pDLENBQUM7QUFGRCxrREFFQztBQUVELG9CQUEyQixJQUFJO0lBQzNCLDJCQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUIsMkJBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSkQsZ0NBSUM7QUFFRCxnQkFBdUIsSUFBSTtJQUN2QiwyQkFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQzlCLENBQUM7QUFGRCx3QkFFQztBQUVELHlCQUFnQyxJQUFJO0lBQ2hDLDJCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUNsQywyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDaEMsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSkQsMENBSUM7QUFFRCxvQkFBMkIsSUFBSTtJQUMzQiwwQ0FBMEM7SUFDMUMsMkJBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBSEQsZ0NBR0M7QUFFRCx3QkFBK0IsSUFBSTtJQUMvQiwyQkFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQzVCLDJCQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDNUIsQ0FBQztBQUhELHdDQUdDO0FBRUQsdUJBQThCLElBQUk7SUFDOUIsMkJBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMvQixDQUFDO0FBRkQsc0NBRUM7QUFFRDtJQUtJLGdDQUFtQixTQUFtQjtRQUF0QyxpQkEyQ0M7UUEzQ2tCLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFDbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFN0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsV0FBa0IsQ0FBQztRQUNuRCxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixHQUFHLFlBQWlDLENBQUM7UUFDNUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEdBQUcsZUFBd0IsQ0FBQztRQUMzRCxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsR0FBRyxVQUFrQixDQUFDO1FBQ3BELElBQUksQ0FBQyxXQUFXLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQXNCLEVBQUUsY0FBcUIsQ0FBQyxDQUFBO1FBRTVHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLGFBQXlCLENBQUM7UUFFeEQsSUFBTSxvQkFBb0IsR0FBRztZQUN6QiwyQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRSxFQUFFLENBQUMsQ0FBQyxtQkFBVyxDQUFDLGFBQWEsS0FBSyxtQkFBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQ3pELDJCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDdEMsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSiwyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNqQyxDQUFDO2dCQUNELDJCQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFFaEMsVUFBVSxDQUFDO29CQUNQLEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQy9CLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLDJCQUFZLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQzt3QkFDdEQsS0FBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUM1QixLQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxLQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUN4SixDQUFDO2dCQUNMLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFUCxjQUFNLENBQUMsRUFBRSxDQUFDLHVCQUFZLENBQUMsS0FBSyxFQUFDO29CQUN6QixhQUFhLEVBQUUsQ0FBQztvQkFDaEIsY0FBTSxDQUFDLEdBQUcsQ0FBQyx1QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMvQixFQUFFLENBQUMsQ0FBQyxDQUFDLDJCQUFZLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQzt3QkFBQywyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hFLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQywyQkFBWSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdkQsS0FBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQy9CLENBQUM7UUFDTCxDQUFDLENBQUE7UUFFRCxXQUFXLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLDBDQUEwQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDMUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyx3Q0FBd0MsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQzVHLENBQUM7SUFFTyxtREFBa0IsR0FBMUIsVUFBMkIsSUFBVztRQUNsQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ1AsSUFBSSxVQUFVLEdBQW9DLG1CQUFtQixDQUFDLEdBQUcsRUFBYyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQy9GLFVBQVUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1lBQ3pHLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2pILENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFDaEQsQ0FBQztJQUNMLENBQUM7SUFFTSx3Q0FBTyxHQUFkLFVBQWUsR0FBRztRQUNkLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7SUFDTCxDQUFDO0lBQ0wsNkJBQUM7QUFBRCxDQUFDLEFBakVELElBaUVDO0FBRUQ7SUFJSSxvQ0FBbUIsU0FBbUI7UUFBbkIsY0FBUyxHQUFULFNBQVMsQ0FBVTtRQUNsQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUM7UUFFcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDN0ssSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFN0IsSUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztZQUM3RCxhQUFhLFlBQUMsQ0FBb0IsRUFBRSxRQUFpQjtnQkFDakQsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDWCxFQUFFLENBQUMsQ0FBQyxtQkFBVyxDQUFDLGFBQWEsS0FBSyxtQkFBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7d0JBQ3pELDJCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDdEMsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSiwyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNqQyxDQUFDO29CQUNELDJCQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDcEMsQ0FBQztZQUNMLENBQUM7U0FDSixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLGlDQUFpQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRWhFLHVHQUF1RztRQUN2Ryx1RkFBdUY7UUFDdkYsNkZBQTZGO1FBQzdGLGtGQUFrRjtRQUNsRiwyREFBMkQ7UUFDM0QsSUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztZQUNwRSxpQkFBaUIsRUFBakIsVUFBa0IsT0FBZTtnQkFDN0IsU0FBUyxDQUFDLDRCQUE0QixDQUFDLHNCQUFTLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN4RSxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQ2pCLENBQUM7WUFDRCxpQkFBaUIsRUFBakIsVUFBa0IsS0FBYTtnQkFDM0IsU0FBUyxDQUFDLE1BQU0sQ0FBWTtvQkFDeEIsU0FBUyxFQUFFLHNCQUFTLENBQUMsV0FBVztvQkFDaEMsTUFBTSxFQUFFLElBQUk7aUJBQ2YsQ0FBQyxDQUFDO2dCQUNILE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDaEIsQ0FBQztTQUNKLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVNLDRDQUFPLEdBQWQsVUFBZSxHQUFHO1FBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDTCxpQ0FBQztBQUFELENBQUMsQUFuREQsSUFtREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnO1xuaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSAnYXBwbGljYXRpb24nO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0IHtTZWFyY2hCYXJ9IGZyb20gJ3VpL3NlYXJjaC1iYXInO1xuaW1wb3J0IHtQYWdlfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtWaWV3fSBmcm9tICd1aS9jb3JlL3ZpZXcnO1xuaW1wb3J0IHtIdG1sVmlld30gZnJvbSAndWkvaHRtbC12aWV3J1xuaW1wb3J0IHtDb2xvcn0gZnJvbSAnY29sb3InO1xuaW1wb3J0IHtQcm9wZXJ0eUNoYW5nZURhdGEsIEV2ZW50RGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7QW5pbWF0aW9uQ3VydmV9IGZyb20gJ3VpL2VudW1zJ1xuaW1wb3J0IHtHZXN0dXJlVHlwZXN9IGZyb20gJ3VpL2dlc3R1cmVzJ1xuXG5pbXBvcnQge0Jyb3dzZXJWaWV3fSBmcm9tICcuL2NvbXBvbmVudHMvYnJvd3Nlci12aWV3JztcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL2Jvb2ttYXJrcyc7XG5pbXBvcnQge2FwcFZpZXdNb2RlbCwgQXBwVmlld01vZGVsLCBMb2FkVXJsRXZlbnREYXRhfSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL0FwcFZpZXdNb2RlbCc7XG5pbXBvcnQge2dldFNjcmVlbk9yaWVudGF0aW9uLCB1cGRhdGVTY3JlZW5PcmllbnRhdGlvbn0gZnJvbSAnLi9jb21wb25lbnRzL2NvbW1vbi91dGlsJztcblxuLy8gaW1wb3J0IHtSZWFsaXR5Vmlld2VyfSBmcm9tICdAYXJnb25qcy9hcmdvbidcblxuLy9pbXBvcnQgKiBhcyBvcmllbnRhdGlvbk1vZHVsZSBmcm9tICduYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uJztcbnZhciBvcmllbnRhdGlvbk1vZHVsZSA9IHJlcXVpcmUoXCJuYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uXCIpO1xuXG5leHBvcnQgbGV0IHBhZ2U6UGFnZTtcbmV4cG9ydCBsZXQgbGF5b3V0OlZpZXc7XG5leHBvcnQgbGV0IHRvdWNoT3ZlcmxheVZpZXc6VmlldztcbmV4cG9ydCBsZXQgaGVhZGVyVmlldzpWaWV3O1xuZXhwb3J0IGxldCBtZW51VmlldzpWaWV3O1xuZXhwb3J0IGxldCBicm93c2VyVmlldzpCcm93c2VyVmlldztcbmV4cG9ydCBsZXQgYm9va21hcmtzVmlldzpWaWV3O1xuZXhwb3J0IGxldCByZWFsaXR5Q2hvb3NlclZpZXc6VmlldztcblxubGV0IHNlYXJjaEJhcjpTZWFyY2hCYXI7XG5sZXQgaW9zU2VhcmNoQmFyQ29udHJvbGxlcjpJT1NTZWFyY2hCYXJDb250cm9sbGVyO1xubGV0IGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyOkFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyO1xuXG5hcHBWaWV3TW9kZWwub24oJ3Byb3BlcnR5Q2hhbmdlJywgKGV2dDpQcm9wZXJ0eUNoYW5nZURhdGEpPT57XG4gICAgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdjdXJyZW50VXJpJykge1xuICAgICAgICBzZXRTZWFyY2hCYXJUZXh0KGFwcFZpZXdNb2RlbC5jdXJyZW50VXJpKTtcbiAgICAgICAgaWYgKCFhcHBWaWV3TW9kZWwuY3VycmVudFVyaSkgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ3ZpZXdlckVuYWJsZWQnKSB7XG4gICAgICAgIC8vIGNvbnN0IHZ1Zm9yaWFEZWxlZ2F0ZSA9IGFwcFZpZXdNb2RlbC5tYW5hZ2VyLmNvbnRhaW5lci5nZXQoQXJnb24uVnVmb3JpYVNlcnZpY2VEZWxlZ2F0ZSk7XG4gICAgICAgIC8vIHZ1Zm9yaWFEZWxlZ2F0ZS52aWV3ZXJFbmFibGVkID0gZXZ0LnZhbHVlO1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJsYW5kc2NhcGVcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJwb3J0cmFpdFwiKTtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImFsbFwiKTtcbiAgICAgICAgfVxuICAgICAgICBjaGVja0FjdGlvbkJhcigpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57Y2hlY2tBY3Rpb25CYXIoKX0sIDUwMCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdtZW51T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xuICAgICAgICAgICAgbWVudVZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDogMSxcbiAgICAgICAgICAgICAgICAgICAgeTogMSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1lbnVWaWV3LnZpc2liaWxpdHkgPSBcImNvbGxhcHNlXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdvdmVydmlld09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQm9va21hcmtzKCk7XG4gICAgICAgICAgICBzZWFyY2hCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDotMTAwLCB5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIHNlYXJjaEJhci52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBhZGRCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdhZGRCdXR0b24nKTtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgYWRkQnV0dG9uLm9wYWNpdHkgPSAwO1xuICAgICAgICAgICAgYWRkQnV0dG9uLnRyYW5zbGF0ZVggPSAtMTA7XG4gICAgICAgICAgICBhZGRCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgc2VhcmNoQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBhZGRCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdhZGRCdXR0b24nKTtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBhZGRCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdyZWFsaXR5Q2hvb3Nlck9wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjEsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVYID0gMC45O1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnYm9va21hcmtzT3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVYID0gMC45O1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVZID0gMC45O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9IFxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdjYW5jZWxCdXR0b25TaG93bicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdvdmVydmlld0J1dHRvbicpO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgbWVudUJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ21lbnVCdXR0b24nKTtcbiAgICAgICAgICAgIG1lbnVCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgbWVudUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdjYW5jZWxCdXR0b24nKTtcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ292ZXJ2aWV3QnV0dG9uJyk7XG4gICAgICAgICAgICBvdmVydmlld0J1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgbWVudUJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ21lbnVCdXR0b24nKTtcbiAgICAgICAgICAgIG1lbnVCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIG1lbnVCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgY2FuY2VsQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnY2FuY2VsQnV0dG9uJyk7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGF5b3V0Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICB9XG4gICAgfVxufSlcblxuY29uc3QgY2hlY2tBY3Rpb25CYXIgPSAoKSA9PiB7XG4gICAgaWYgKCFwYWdlKSByZXR1cm47XG4gICAgY29uc3Qgb3JpZW50YXRpb24gPSBnZXRTY3JlZW5PcmllbnRhdGlvbigpO1xuICAgIGlmIChvcmllbnRhdGlvbiA9PT0gOTAgfHwgb3JpZW50YXRpb24gPT09IC05MCB8fCBhcHBWaWV3TW9kZWwudmlld2VyRW5hYmxlZCkgXG4gICAgICAgIHBhZ2UuYWN0aW9uQmFySGlkZGVuID0gdHJ1ZTtcbiAgICBlbHNlIFxuICAgICAgICBwYWdlLmFjdGlvbkJhckhpZGRlbiA9IGZhbHNlO1xufVxuXG5jb25zdCB1cGRhdGVTeXN0ZW1VSSA9ICgpID0+IHtcbiAgICBpZiAoIXBhZ2UpIHJldHVybjtcbiAgICBjb25zdCBvcmllbnRhdGlvbiA9IGdldFNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgaWYgKG9yaWVudGF0aW9uID09PSA5MCB8fCBvcmllbnRhdGlvbiA9PT0gLTkwIHx8IGFwcFZpZXdNb2RlbC52aWV3ZXJFbmFibGVkKSB7XG4gICAgICAgIGlmIChwYWdlLmFuZHJvaWQpIHtcbiAgICAgICAgICAgIGxldCB3aW5kb3cgPSBhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eS5nZXRXaW5kb3coKTtcbiAgICAgICAgICAgIGxldCBkZWNvclZpZXcgPSB3aW5kb3cuZ2V0RGVjb3JWaWV3KCk7XG4gICAgICAgICAgICBsZXQgdWlPcHRpb25zID0gKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0lNTUVSU0lWRV9TVElDS1lcbiAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfTEFZT1VUX0ZVTExTQ1JFRU5cbiAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfTEFZT1VUX0hJREVfTkFWSUdBVElPTlxuICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfU1RBQkxFXG4gICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0ZVTExTQ1JFRU5cbiAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfSElERV9OQVZJR0FUSU9OO1xuICAgICAgICAgICAgZGVjb3JWaWV3LnNldFN5c3RlbVVpVmlzaWJpbGl0eSh1aU9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHBhZ2UuYW5kcm9pZCkge1xuICAgICAgICAgICAgbGV0IHdpbmRvdyA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LmdldFdpbmRvdygpO1xuICAgICAgICAgICAgbGV0IGRlY29yVmlldyA9IHdpbmRvdy5nZXREZWNvclZpZXcoKTtcbiAgICAgICAgICAgIGxldCB1aU9wdGlvbnMgPSAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfVklTSUJMRTtcbiAgICAgICAgICAgIGRlY29yVmlldy5zZXRTeXN0ZW1VaVZpc2liaWxpdHkodWlPcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhZ2VMb2FkZWQoYXJncykge31cblxuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRlZFRvKGFyZ3MpIHtcbiAgICBcbiAgICBwYWdlID0gYXJncy5vYmplY3Q7XG4gICAgcGFnZS5iaW5kaW5nQ29udGV4dCA9IGFwcFZpZXdNb2RlbDtcblxuICAgIC8vIFNldCB0aGUgaWNvbiBmb3IgdGhlIG1lbnUgYnV0dG9uXG4gICAgY29uc3QgbWVudUJ1dHRvbiA9IDxCdXR0b24+IHBhZ2UuZ2V0Vmlld0J5SWQoXCJtZW51QnV0dG9uXCIpO1xuICAgIG1lbnVCdXR0b24udGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhlNWQ0KTtcblxuICAgIC8vIFNldCB0aGUgaWNvbiBmb3IgdGhlIG92ZXJ2aWV3IGJ1dHRvblxuICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gPEJ1dHRvbj4gcGFnZS5nZXRWaWV3QnlJZChcIm92ZXJ2aWV3QnV0dG9uXCIpO1xuICAgIG92ZXJ2aWV3QnV0dG9uLnRleHQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4ZTUzYik7XG5cbiAgICAvLyB3b3JrYXJvdW5kIChzZWUgaHR0cHM6Ly9naXRodWIuY29tL05hdGl2ZVNjcmlwdC9OYXRpdmVTY3JpcHQvaXNzdWVzLzY1OSlcbiAgICBpZiAocGFnZS5pb3MpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgcGFnZS5yZXF1ZXN0TGF5b3V0KCk7XG4gICAgICAgIH0sIDApXG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSUFwcGxpY2F0aW9uRGlkQmVjb21lQWN0aXZlTm90aWZpY2F0aW9uLCAoKSA9PiB7XG4gICAgICAgICAgICBwYWdlLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsICgpPT57XG4gICAgICAgIHVwZGF0ZVNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHVwZGF0ZVNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgICAgICAgICBjaGVja0FjdGlvbkJhcigpO1xuICAgICAgICAgICAgdXBkYXRlU3lzdGVtVUkoKTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICB9KTtcblxuICAgIHVwZGF0ZVNjcmVlbk9yaWVudGF0aW9uKCk7XG5cbiAgICBhcHBWaWV3TW9kZWwucmVhZHkudGhlbigoKT0+e1xuICAgICAgICBcbiAgICAgICAgYXBwVmlld01vZGVsLmFyZ29uLnNlc3Npb24uZXJyb3JFdmVudC5hZGRFdmVudExpc3RlbmVyKChlcnJvcik9PntcbiAgICAgICAgICAgIC8vIGFsZXJ0KGVycm9yLm1lc3NhZ2UgKyAnXFxuJyArIGVycm9yLnN0YWNrKTtcbiAgICAgICAgICAgIGlmIChlcnJvci5zdGFjaykgY29uc29sZS5sb2coZXJyb3IubWVzc2FnZSArICdcXG4nICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICB9KTtcblxuICAgIGFwcFZpZXdNb2RlbC5vbihBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LCAoZGF0YTpMb2FkVXJsRXZlbnREYXRhKT0+e1xuICAgICAgICBjb25zdCB1cmwgPSBkYXRhLnVybDtcblxuICAgICAgICBpZiAoIWRhdGEubmV3TGF5ZXIgfHwgXG4gICAgICAgICAgICAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAmJlxuICAgICAgICAgICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAhPT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyICYmXG4gICAgICAgICAgICAhYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci5kZXRhaWxzLnVyaSkpIHtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LmxvYWRVcmwodXJsKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBicm93c2VyVmlldy5hZGRMYXllcigpO1xuICAgICAgICBicm93c2VyVmlldy5zZXRGb2N1c3NlZExheWVyKGxheWVyKTtcbiAgICAgICAgYnJvd3NlclZpZXcubG9hZFVybCh1cmwpO1xuICAgICAgICBjb25zb2xlLmxvZygnTG9hZGluZyB1cmw6ICcgKyB1cmwpO1xuICAgIH0pO1xuXG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgdmFyIGFjdGl2aXR5ID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHk7XG4gICAgICAgIGFjdGl2aXR5Lm9uQmFja1ByZXNzZWQgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAhPSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAmJiBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcgJiYgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3LmFuZHJvaWQuY2FuR29CYWNrKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3LmFuZHJvaWQuZ29CYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgLy8gb24gYW5kcm9pZCB0aGUgcGFnZSBpcyB1bmxvYWRlZC9yZWxvYWRlZCBhZnRlciBhIHN1c3BlbmRcbiAgICAgICAgLy8gb3BlbiBiYWNrIHRvIGJvb2ttYXJrcyBpZiBuZWNlc3NhcnlcbiAgICAgICAgaWYgKGFwcFZpZXdNb2RlbC5ib29rbWFya3NPcGVuKSB7XG4gICAgICAgICAgICAvLyBmb3JjZSBhIHByb3BlcnR5IGNoYW5nZSBldmVudFxuICAgICAgICAgICAgYXBwVmlld01vZGVsLm5vdGlmeVByb3BlcnR5Q2hhbmdlKCdib29rbWFya3NPcGVuJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxheW91dExvYWRlZChhcmdzKSB7XG4gICAgbGF5b3V0ID0gYXJncy5vYmplY3RcbiAgICBpZiAobGF5b3V0Lmlvcykge1xuICAgICAgICBsYXlvdXQuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgYXBwVmlld01vZGVsLnNldFJlYWR5KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoZWFkZXJMb2FkZWQoYXJncykge1xuICAgIGhlYWRlclZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEJhckxvYWRlZChhcmdzKSB7XG4gICAgc2VhcmNoQmFyID0gYXJncy5vYmplY3Q7XG5cbiAgICBzZWFyY2hCYXIub24oU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LCAoKSA9PiB7XG4gICAgICAgIGxldCB1cmxTdHJpbmcgPSBzZWFyY2hCYXIudGV4dDtcbiAgICAgICAgaWYgKHVybFN0cmluZy5pbmRleE9mKCcvLycpID09PSAtMSkgdXJsU3RyaW5nID0gJy8vJyArIHVybFN0cmluZztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IFVSSSh1cmxTdHJpbmcpO1xuICAgICAgICBpZiAodXJsLnByb3RvY29sKCkgIT09IFwiaHR0cFwiICYmIHVybC5wcm90b2NvbCgpICE9PSBcImh0dHBzXCIpIHtcbiAgICAgICAgICAgIHVybC5wcm90b2NvbChcImh0dHBcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2V0U2VhcmNoQmFyVGV4dCh1cmwudG9TdHJpbmcoKSk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5sb2FkVXJsKHVybC50b1N0cmluZygpKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgfSk7XG5cbiAgICBpZiAoYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIgPSBuZXcgSU9TU2VhcmNoQmFyQ29udHJvbGxlcihzZWFyY2hCYXIpO1xuICAgIH1cblxuICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG4gICAgICAgIGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyID0gbmV3IEFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyKHNlYXJjaEJhcik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWFyY2hCYXJUZXh0KHVybDpzdHJpbmcpIHtcbiAgICBpZiAoaW9zU2VhcmNoQmFyQ29udHJvbGxlcikge1xuICAgICAgICBpb3NTZWFyY2hCYXJDb250cm9sbGVyLnNldFRleHQodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhbmRyb2lkU2VhcmNoQmFyQ29udHJvbGxlci5zZXRUZXh0KHVybCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBibHVyU2VhcmNoQmFyKCkge1xuICAgIHNlYXJjaEJhci5kaXNtaXNzU29mdElucHV0KCk7XG4gICAgaWYgKHNlYXJjaEJhci5hbmRyb2lkKSB7XG4gICAgICAgIHNlYXJjaEJhci5hbmRyb2lkLmNsZWFyRm9jdXMoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicm93c2VyVmlld0xvYWRlZChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcgPSBhcmdzLm9iamVjdDtcblxuICAgIC8vIFNldHVwIHRoZSBkZWJ1ZyB2aWV3XG4gICAgbGV0IGRlYnVnOkh0bWxWaWV3ID0gPEh0bWxWaWV3PmJyb3dzZXJWaWV3LnBhZ2UuZ2V0Vmlld0J5SWQoXCJkZWJ1Z1wiKTtcbiAgICBkZWJ1Zy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigxNTAsIDI1NSwgMjU1LCAyNTUpO1xuICAgIGRlYnVnLnZpc2liaWxpdHkgPSBcImNvbGxhcHNlZFwiO1xuICAgIGRlYnVnLmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IGZhbHNlO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBib29rbWFya3NWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBib29rbWFya3NWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVggPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWxpdHlDaG9vc2VyTG9hZGVkKGFyZ3MpIHtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVYID0gMC45O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG91Y2hPdmVybGF5TG9hZGVkKGFyZ3MpIHtcbiAgICB0b3VjaE92ZXJsYXlWaWV3ID0gYXJncy5vYmplY3Q7XG59XG5cbi8vIGluaXRpYWxpemUgc29tZSBwcm9wZXJ0aWVzIG9mIHRoZSBtZW51IHNvIHRoYXQgYW5pbWF0aW9ucyB3aWxsIHJlbmRlciBjb3JyZWN0bHlcbmV4cG9ydCBmdW5jdGlvbiBtZW51TG9hZGVkKGFyZ3MpIHtcbiAgICBtZW51VmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIG1lbnVWaWV3Lm9yaWdpblggPSAxO1xuICAgIG1lbnVWaWV3Lm9yaWdpblkgPSAwO1xuICAgIG1lbnVWaWV3LnNjYWxlWCA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVZID0gMDtcbiAgICBtZW51Vmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2VhcmNoQmFyVGFwKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkNhbmNlbChhcmdzKSB7XG4gICAgaWYgKCEhYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5oaWRlQm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgYmx1clNlYXJjaEJhcigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25BZGRDaGFubmVsKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldy5hZGRMYXllcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25SZWxvYWQoYXJncykge1xuICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgJiYgXG4gICAgICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldyAmJiBcbiAgICAgICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25GYXZvcml0ZVRvZ2dsZShhcmdzKSB7XG4gICAgY29uc3QgdXJsID0gYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmk7XG4gICAgY29uc3QgYm9va21hcmtJdGVtID0gYm9va21hcmtzLmZhdm9yaXRlTWFwLmdldCh1cmwpO1xuICAgIGlmICghYm9va21hcmtJdGVtKSB7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3QucHVzaChuZXcgYm9va21hcmtzLkJvb2ttYXJrSXRlbSh7XG4gICAgICAgICAgICB1cmk6IHVybCxcbiAgICAgICAgICAgIHRpdGxlOiBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnRpdGxlXG4gICAgICAgIH0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaSA9IGJvb2ttYXJrcy5mYXZvcml0ZUxpc3QuaW5kZXhPZihib29rbWFya0l0ZW0pO1xuICAgICAgICBib29rbWFya3MuZmF2b3JpdGVMaXN0LnNwbGljZShpLDEpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uSW50ZXJhY3Rpb25Ub2dnbGUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVJbnRlcmFjdGlvbk1vZGUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uT3ZlcnZpZXcoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVPdmVydmlldygpO1xuICAgIGFwcFZpZXdNb2RlbC5zZXREZWJ1Z0VuYWJsZWQoZmFsc2UpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25NZW51KGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZWxlY3RSZWFsaXR5KGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd1JlYWxpdHlDaG9vc2VyKCk7XG4gICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2V0dGluZ3MoYXJncykge1xuICAgIC8vY29kZSB0byBvcGVuIHRoZSBzZXR0aW5ncyB2aWV3IGdvZXMgaGVyZVxuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25WaWV3ZXJUb2dnbGUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVWaWV3ZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uRGVidWdUb2dnbGUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVEZWJ1ZygpO1xufVxuXG5jbGFzcyBJT1NTZWFyY2hCYXJDb250cm9sbGVyIHtcblxuICAgIHByaXZhdGUgdWlTZWFyY2hCYXI6VUlTZWFyY2hCYXI7XG4gICAgcHJpdmF0ZSB0ZXh0RmllbGQ6VUlUZXh0RmllbGQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc2VhcmNoQmFyOlNlYXJjaEJhcikge1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyID0gc2VhcmNoQmFyLmlvcztcbiAgICAgICAgdGhpcy50ZXh0RmllbGQgPSB0aGlzLnVpU2VhcmNoQmFyLnZhbHVlRm9yS2V5KFwic2VhcmNoRmllbGRcIik7XG5cbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5rZXlib2FyZFR5cGUgPSBVSUtleWJvYXJkVHlwZS5VUkw7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuYXV0b2NhcGl0YWxpemF0aW9uVHlwZSA9IFVJVGV4dEF1dG9jYXBpdGFsaXphdGlvblR5cGUuTm9uZTtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5zZWFyY2hCYXJTdHlsZSA9IFVJU2VhcmNoQmFyU3R5bGUuTWluaW1hbDtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5yZXR1cm5LZXlUeXBlID0gVUlSZXR1cm5LZXlUeXBlLkdvO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnNldEltYWdlRm9yU2VhcmNoQmFySWNvblN0YXRlKFVJSW1hZ2UubmV3KCksIFVJU2VhcmNoQmFySWNvbi5TZWFyY2gsIFVJQ29udHJvbFN0YXRlLk5vcm1hbClcbiAgICAgICAgXG4gICAgICAgIHRoaXMudGV4dEZpZWxkLmxlZnRWaWV3TW9kZSA9IFVJVGV4dEZpZWxkVmlld01vZGUuTmV2ZXI7XG5cbiAgICAgICAgY29uc3QgdGV4dEZpZWxkRWRpdEhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbiAgICAgICAgICAgIGlmICh1dGlscy5pb3MuZ2V0dGVyKFVJUmVzcG9uZGVyLCB0aGlzLnVpU2VhcmNoQmFyLmlzRmlyc3RSZXNwb25kZXIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgPT09IGJyb3dzZXJWaWV3LnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd1JlYWxpdHlDaG9vc2VyKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVpU2VhcmNoQmFyLnRleHQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudWlTZWFyY2hCYXIudGV4dCA9IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRQbGFjZWhvbGRlclRleHQoXCJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5zZWxlY3RlZFRleHRSYW5nZSA9IHRoaXMudGV4dEZpZWxkLnRleHRSYW5nZUZyb21Qb3NpdGlvblRvUG9zaXRpb24odGhpcy50ZXh0RmllbGQuYmVnaW5uaW5nT2ZEb2N1bWVudCwgdGhpcy50ZXh0RmllbGQuZW5kT2ZEb2N1bWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCA1MDApXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGF5b3V0Lm9uKEdlc3R1cmVUeXBlcy50b3VjaCwoKT0+e1xuICAgICAgICAgICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICAgICAgICAgIGxheW91dC5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQbGFjZWhvbGRlclRleHQoYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpO1xuICAgICAgICAgICAgICAgIHRoaXMudWlTZWFyY2hCYXIudGV4dCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhcHBsaWNhdGlvbi5pb3MuYWRkTm90aWZpY2F0aW9uT2JzZXJ2ZXIoVUlUZXh0RmllbGRUZXh0RGlkQmVnaW5FZGl0aW5nTm90aWZpY2F0aW9uLCB0ZXh0RmllbGRFZGl0SGFuZGxlcik7XG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSVRleHRGaWVsZFRleHREaWRFbmRFZGl0aW5nTm90aWZpY2F0aW9uLCB0ZXh0RmllbGRFZGl0SGFuZGxlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXRQbGFjZWhvbGRlclRleHQodGV4dDpzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzOiBOU011dGFibGVEaWN0aW9uYXJ5PHN0cmluZyxhbnk+ID0gTlNNdXRhYmxlRGljdGlvbmFyeS5uZXc8c3RyaW5nLGFueT4oKS5pbml0KCk7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLnNldE9iamVjdEZvcktleSh1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsVUlDb2xvci5ibGFja0NvbG9yKSwgTlNGb3JlZ3JvdW5kQ29sb3JBdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLmF0dHJpYnV0ZWRQbGFjZWhvbGRlciA9IE5TQXR0cmlidXRlZFN0cmluZy5hbGxvYygpLmluaXRXaXRoU3RyaW5nQXR0cmlidXRlcyh0ZXh0LCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLnBsYWNlaG9sZGVyID0gc2VhcmNoQmFyLmhpbnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0VGV4dCh1cmwpIHtcbiAgICAgICAgaWYgKCF1dGlscy5pb3MuZ2V0dGVyKFVJUmVzcG9uZGVyLCB0aGlzLnVpU2VhcmNoQmFyLmlzRmlyc3RSZXNwb25kZXIpKSB7XG4gICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dCh1cmwpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBBbmRyb2lkU2VhcmNoQmFyQ29udHJvbGxlciB7XG5cbiAgICBwcml2YXRlIHNlYXJjaFZpZXc6YW5kcm9pZC53aWRnZXQuU2VhcmNoVmlldztcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBzZWFyY2hCYXI6U2VhcmNoQmFyKSB7XG4gICAgICAgIHRoaXMuc2VhcmNoVmlldyA9IHNlYXJjaEJhci5hbmRyb2lkO1xuXG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRJbnB1dFR5cGUoYW5kcm9pZC50ZXh0LklucHV0VHlwZS5UWVBFX0NMQVNTX1RFWFQgfCBhbmRyb2lkLnRleHQuSW5wdXRUeXBlLlRZUEVfVEVYVF9WQVJJQVRJT05fVVJJIHwgYW5kcm9pZC50ZXh0LklucHV0VHlwZS5UWVBFX1RFWFRfRkxBR19OT19TVUdHRVNUSU9OUyk7XG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRJbWVPcHRpb25zKGFuZHJvaWQudmlldy5pbnB1dG1ldGhvZC5FZGl0b3JJbmZvLklNRV9BQ1RJT05fR08pO1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuY2xlYXJGb2N1cygpO1xuXG4gICAgICAgIGNvbnN0IGZvY3VzSGFuZGxlciA9IG5ldyBhbmRyb2lkLnZpZXcuVmlldy5PbkZvY3VzQ2hhbmdlTGlzdGVuZXIoe1xuICAgICAgICAgICAgb25Gb2N1c0NoYW5nZSh2OiBhbmRyb2lkLnZpZXcuVmlldywgaGFzRm9jdXM6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoaGFzRm9jdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgPT09IGJyb3dzZXJWaWV3LnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LnNldE9uUXVlcnlUZXh0Rm9jdXNDaGFuZ2VMaXN0ZW5lcihmb2N1c0hhbmRsZXIpO1xuXG4gICAgICAgIC8vIHRoZSBuYXRpdmVzY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgT25RdWVyeVRleHRMaXN0ZW5lciBkb2VzIG5vdCBjb3JyZWN0bHkgaGFuZGxlIHRoZSBmb2xsb3dpbmcgY2FzZTpcbiAgICAgICAgLy8gMSkgYW4gZXh0ZXJuYWwgZXZlbnQgdXBkYXRlcyB0aGUgcXVlcnkgdGV4dCAoZS5nLiB0aGUgdXNlciBjbGlja2VkIGEgbGluayBvbiBhIHBhZ2UpXG4gICAgICAgIC8vIDIpIHRoZSB1c2VyIGF0dGVtcHRzIHRvIG5hdmlnYXRlIGJhY2sgdG8gdGhlIHByZXZpb3VzIHBhZ2UgYnkgdXBkYXRpbmcgdGhlIHNlYXJjaCBiYXIgdGV4dFxuICAgICAgICAvLyAzKSBuYXRpdmVzY3JpcHQgc2VlcyB0aGlzIGFzIHN1Ym1pdHRpbmcgdGhlIHNhbWUgcXVlcnkgYW5kIHRyZWF0cyBpdCBhcyBhIG5vLW9wXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9OYXRpdmVTY3JpcHQvTmF0aXZlU2NyaXB0L2lzc3Vlcy8zOTY1XG4gICAgICAgIGNvbnN0IHNlYXJjaEhhbmRsZXIgPSBuZXcgYW5kcm9pZC53aWRnZXQuU2VhcmNoVmlldy5PblF1ZXJ5VGV4dExpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uUXVlcnlUZXh0Q2hhbmdlKG5ld1RleHQ6IFN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgICAgIHNlYXJjaEJhci5fb25Qcm9wZXJ0eUNoYW5nZWRGcm9tTmF0aXZlKFNlYXJjaEJhci50ZXh0UHJvcGVydHksIG5ld1RleHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblF1ZXJ5VGV4dFN1Ym1pdChxdWVyeTogU3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoQmFyLm5vdGlmeSg8RXZlbnREYXRhPntcbiAgICAgICAgICAgICAgICAgICAgZXZlbnROYW1lOiBTZWFyY2hCYXIuc3VibWl0RXZlbnQsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogdGhpc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0T25RdWVyeVRleHRMaXN0ZW5lcihzZWFyY2hIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0VGV4dCh1cmwpIHtcbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LnNldFF1ZXJ5KHVybCwgZmFsc2UpO1xuICAgIH1cbn1cbiJdfQ==