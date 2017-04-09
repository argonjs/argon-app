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
var nativescript_urlhandler_1 = require("nativescript-urlhandler");
var matchArgonScheme = /^(argon|argon4)/;
nativescript_urlhandler_1.handleOpenURL(function (appURL) {
    console.log('Received url request: ', appURL);
    var layer = exports.browserView.addLayer();
    exports.browserView.setFocussedLayer(layer);
    var webView = layer.webView;
    webView.src = appURL.path.replace(matchArgonScheme, 'https');
});
//import trace = require("trace");
//trace.setCategories(trace.categories.Debug);
//trace.enable();
// import {RealityViewer} from '@argonjs/argon'
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
        // const vuforiaDelegate = appViewModel.manager.container.get(Argon.VuforiaServiceDelegate);
        // vuforiaDelegate.viewerEnabled = evt.value;
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
    /*
    page = args.object;
    page.bindingContext = appViewModel;
    appViewModel.setReady();

    // Set the icon for the menu button
    const menuButton = <Button> page.getViewById("menuButton");
    menuButton.text = String.fromCharCode(0xe5d4);

    // Set the icon for the overview button
    const overviewButton = <Button> page.getViewById("overviewButton");
    overviewButton.text = String.fromCharCode(0xe53b);
    */
}
exports.pageLoaded = pageLoaded;
function navigatedTo(args) {
    exports.page = args.object;
    exports.page.bindingContext = AppViewModel_1.appViewModel;
    AppViewModel_1.appViewModel.setReady();
    // Set the icon for the menu button
    var menuButton = exports.page.getViewById("menuButton");
    menuButton.text = String.fromCharCode(0xe5d4);
    // Set the icon for the overview button
    var overviewButton = exports.page.getViewById("overviewButton");
    overviewButton.text = String.fromCharCode(0xe53b);
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
    AppViewModel_1.appViewModel.argon.session.errorEvent.addEventListener(function (error) {
        // alert(error.message + '\n' + error.stack);
        if (error.stack)
            console.log(error.message + '\n' + error.stack);
    });
    application.on(application.orientationChangedEvent, function (args) {
        util_1.updateScreenOrientation();
        setTimeout(function () {
            util_1.updateScreenOrientation();
            var orientation = util_1.getScreenOrientation();
            if (orientation === 90 || orientation === -90 || AppViewModel_1.appViewModel.viewerEnabled) {
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
    util_1.updateScreenOrientation();
    if (application.android) {
        var activity = application.android.foregroundActivity;
        activity.onBackPressed = function () {
            if (exports.browserView.focussedLayer != exports.browserView.realityLayer) {
                if (exports.browserView.focussedLayer.webView && exports.browserView.focussedLayer.webView.android.canGoBack()) {
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
    exports.browserView.focussedLayer.webView && exports.browserView.focussedLayer.webView.reload();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQXVGO0FBRXZGLG1FQUFnRTtBQUVoRSxJQUFNLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDO0FBRTNDLHVDQUFhLENBQUMsVUFBQyxNQUFjO0lBQ3pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDOUMsSUFBTSxLQUFLLEdBQUcsbUJBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyQyxtQkFBVyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFRLENBQUM7SUFDL0IsT0FBTyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQztBQUVILGtDQUFrQztBQUNsQyw4Q0FBOEM7QUFDOUMsaUJBQWlCO0FBRWpCLCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUNsRCxJQUFJLDBCQUFxRCxDQUFDO0FBRTFELDJCQUFZLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLFVBQUMsR0FBc0I7SUFDckQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLGdCQUFn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QUM7SUFDTCxpQ0FBQztBQUFELENBQUMsQUFuREQsSUFtREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnO1xuaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSAnYXBwbGljYXRpb24nO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0IHtTZWFyY2hCYXJ9IGZyb20gJ3VpL3NlYXJjaC1iYXInO1xuaW1wb3J0IHtQYWdlfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtWaWV3fSBmcm9tICd1aS9jb3JlL3ZpZXcnO1xuaW1wb3J0IHtIdG1sVmlld30gZnJvbSAndWkvaHRtbC12aWV3J1xuaW1wb3J0IHtDb2xvcn0gZnJvbSAnY29sb3InO1xuaW1wb3J0IHtQcm9wZXJ0eUNoYW5nZURhdGEsIEV2ZW50RGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7QW5pbWF0aW9uQ3VydmV9IGZyb20gJ3VpL2VudW1zJ1xuaW1wb3J0IHtHZXN0dXJlVHlwZXN9IGZyb20gJ3VpL2dlc3R1cmVzJ1xuXG5pbXBvcnQge0Jyb3dzZXJWaWV3fSBmcm9tICcuL2NvbXBvbmVudHMvYnJvd3Nlci12aWV3JztcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL2Jvb2ttYXJrcyc7XG5pbXBvcnQge2FwcFZpZXdNb2RlbCwgQXBwVmlld01vZGVsLCBMb2FkVXJsRXZlbnREYXRhfSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL0FwcFZpZXdNb2RlbCc7XG5pbXBvcnQge2dldFNjcmVlbk9yaWVudGF0aW9uLCB1cGRhdGVTY3JlZW5PcmllbnRhdGlvbn0gZnJvbSAnLi9jb21wb25lbnRzL2NvbW1vbi91dGlsJztcblxuaW1wb3J0IHsgaGFuZGxlT3BlblVSTCwgQXBwVVJMIH0gZnJvbSAnbmF0aXZlc2NyaXB0LXVybGhhbmRsZXInO1xuXG5jb25zdCBtYXRjaEFyZ29uU2NoZW1lID0gL14oYXJnb258YXJnb240KS87XG5cbmhhbmRsZU9wZW5VUkwoKGFwcFVSTDogQXBwVVJMKSA9PiB7XG4gICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIHVybCByZXF1ZXN0OiAnLCBhcHBVUkwpO1xuICAgIGNvbnN0IGxheWVyID0gYnJvd3NlclZpZXcuYWRkTGF5ZXIoKTtcbiAgICBicm93c2VyVmlldy5zZXRGb2N1c3NlZExheWVyKGxheWVyKTtcbiAgICBjb25zdCB3ZWJWaWV3ID0gbGF5ZXIud2ViVmlldyE7XG4gICAgd2ViVmlldy5zcmMgPSBhcHBVUkwucGF0aC5yZXBsYWNlKG1hdGNoQXJnb25TY2hlbWUsICdodHRwcycpO1xufSk7XG5cbi8vaW1wb3J0IHRyYWNlID0gcmVxdWlyZShcInRyYWNlXCIpO1xuLy90cmFjZS5zZXRDYXRlZ29yaWVzKHRyYWNlLmNhdGVnb3JpZXMuRGVidWcpO1xuLy90cmFjZS5lbmFibGUoKTtcblxuLy8gaW1wb3J0IHtSZWFsaXR5Vmlld2VyfSBmcm9tICdAYXJnb25qcy9hcmdvbidcblxuLy9pbXBvcnQgKiBhcyBvcmllbnRhdGlvbk1vZHVsZSBmcm9tICduYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uJztcbnZhciBvcmllbnRhdGlvbk1vZHVsZSA9IHJlcXVpcmUoXCJuYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uXCIpO1xuXG5leHBvcnQgbGV0IHBhZ2U6UGFnZTtcbmV4cG9ydCBsZXQgbGF5b3V0OlZpZXc7XG5leHBvcnQgbGV0IHRvdWNoT3ZlcmxheVZpZXc6VmlldztcbmV4cG9ydCBsZXQgaGVhZGVyVmlldzpWaWV3O1xuZXhwb3J0IGxldCBtZW51VmlldzpWaWV3O1xuZXhwb3J0IGxldCBicm93c2VyVmlldzpCcm93c2VyVmlldztcbmV4cG9ydCBsZXQgYm9va21hcmtzVmlldzpWaWV3O1xuZXhwb3J0IGxldCByZWFsaXR5Q2hvb3NlclZpZXc6VmlldztcblxubGV0IHNlYXJjaEJhcjpTZWFyY2hCYXI7XG5sZXQgaW9zU2VhcmNoQmFyQ29udHJvbGxlcjpJT1NTZWFyY2hCYXJDb250cm9sbGVyO1xubGV0IGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyOkFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyO1xuXG5hcHBWaWV3TW9kZWwub24oJ3Byb3BlcnR5Q2hhbmdlJywgKGV2dDpQcm9wZXJ0eUNoYW5nZURhdGEpPT57XG4gICAgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdjdXJyZW50VXJpJykge1xuICAgICAgICBzZXRTZWFyY2hCYXJUZXh0KGFwcFZpZXdNb2RlbC5jdXJyZW50VXJpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ3ZpZXdlckVuYWJsZWQnKSB7XG4gICAgICAgIC8vIGNvbnN0IHZ1Zm9yaWFEZWxlZ2F0ZSA9IGFwcFZpZXdNb2RlbC5tYW5hZ2VyLmNvbnRhaW5lci5nZXQoQXJnb24uVnVmb3JpYVNlcnZpY2VEZWxlZ2F0ZSk7XG4gICAgICAgIC8vIHZ1Zm9yaWFEZWxlZ2F0ZS52aWV3ZXJFbmFibGVkID0gZXZ0LnZhbHVlO1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJsYW5kc2NhcGVcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJwb3J0cmFpdFwiKTtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImFsbFwiKTtcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdtZW51T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xuICAgICAgICAgICAgbWVudVZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDogMSxcbiAgICAgICAgICAgICAgICAgICAgeTogMSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1lbnVWaWV3LnZpc2liaWxpdHkgPSBcImNvbGxhcHNlXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdvdmVydmlld09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LnNob3dPdmVydmlldygpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMDAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgc2VhcmNoQmFyLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2FkZEJ1dHRvbicpO1xuICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBhZGRCdXR0b24ub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICBhZGRCdXR0b24udHJhbnNsYXRlWCA9IC0xMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicm93c2VyVmlldy5oaWRlT3ZlcnZpZXcoKTtcbiAgICAgICAgICAgIGlmICghYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICBzZWFyY2hCYXIudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnYWRkQnV0dG9uJyk7XG4gICAgICAgICAgICBhZGRCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDotMTAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAncmVhbGl0eUNob29zZXJPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVZID0gMC45O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2Jvb2ttYXJrc09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjAsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfSBcbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnY2FuY2VsQnV0dG9uU2hvd24nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnb3ZlcnZpZXdCdXR0b24nKTtcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG1lbnVCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgY2FuY2VsQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnY2FuY2VsQnV0dG9uJyk7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdvdmVydmlld0J1dHRvbicpO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2NhbmNlbEJ1dHRvbicpO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxheW91dC5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG5cbmV4cG9ydCBmdW5jdGlvbiBwYWdlTG9hZGVkKGFyZ3MpIHtcblxuICAgIC8qXG4gICAgcGFnZSA9IGFyZ3Mub2JqZWN0O1xuICAgIHBhZ2UuYmluZGluZ0NvbnRleHQgPSBhcHBWaWV3TW9kZWw7XG4gICAgYXBwVmlld01vZGVsLnNldFJlYWR5KCk7XG5cbiAgICAvLyBTZXQgdGhlIGljb24gZm9yIHRoZSBtZW51IGJ1dHRvblxuICAgIGNvbnN0IG1lbnVCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwibWVudUJ1dHRvblwiKTtcbiAgICBtZW51QnV0dG9uLnRleHQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4ZTVkNCk7XG5cbiAgICAvLyBTZXQgdGhlIGljb24gZm9yIHRoZSBvdmVydmlldyBidXR0b25cbiAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IDxCdXR0b24+IHBhZ2UuZ2V0Vmlld0J5SWQoXCJvdmVydmlld0J1dHRvblwiKTtcbiAgICBvdmVydmlld0J1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1M2IpO1xuICAgICovXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBuYXZpZ2F0ZWRUbyhhcmdzKSB7XG4gICAgXG4gICAgcGFnZSA9IGFyZ3Mub2JqZWN0O1xuICAgIHBhZ2UuYmluZGluZ0NvbnRleHQgPSBhcHBWaWV3TW9kZWw7XG4gICAgYXBwVmlld01vZGVsLnNldFJlYWR5KCk7XG5cbiAgICAvLyBTZXQgdGhlIGljb24gZm9yIHRoZSBtZW51IGJ1dHRvblxuICAgIGNvbnN0IG1lbnVCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwibWVudUJ1dHRvblwiKTtcbiAgICBtZW51QnV0dG9uLnRleHQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4ZTVkNCk7XG5cbiAgICAvLyBTZXQgdGhlIGljb24gZm9yIHRoZSBvdmVydmlldyBidXR0b25cbiAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IDxCdXR0b24+IHBhZ2UuZ2V0Vmlld0J5SWQoXCJvdmVydmlld0J1dHRvblwiKTtcbiAgICBvdmVydmlld0J1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1M2IpO1xuXG4gICAgLy8gZm9jdXMgb24gdGhlIHRvcG1vc3QgbGF5ZXJcbiAgICBicm93c2VyVmlldy5zZXRGb2N1c3NlZExheWVyKGJyb3dzZXJWaWV3LmxheWVyc1ticm93c2VyVmlldy5sYXllcnMubGVuZ3RoLTFdKTtcblxuICAgIC8vIHdvcmthcm91bmQgKHNlZSBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L05hdGl2ZVNjcmlwdC9pc3N1ZXMvNjU5KVxuICAgIGlmIChwYWdlLmlvcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICBwYWdlLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgfSwgMClcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJQXBwbGljYXRpb25EaWRCZWNvbWVBY3RpdmVOb3RpZmljYXRpb24sICgpID0+IHtcbiAgICAgICAgICAgIHBhZ2UucmVxdWVzdExheW91dCgpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICBcbiAgICBhcHBWaWV3TW9kZWwuYXJnb24uc2Vzc2lvbi5lcnJvckV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKGVycm9yKT0+e1xuICAgICAgICAvLyBhbGVydChlcnJvci5tZXNzYWdlICsgJ1xcbicgKyBlcnJvci5zdGFjayk7XG4gICAgICAgIGlmIChlcnJvci5zdGFjaykgY29uc29sZS5sb2coZXJyb3IubWVzc2FnZSArICdcXG4nICsgZXJyb3Iuc3RhY2spO1xuICAgIH0pXG5cbiAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKGFyZ3MpPT57XG4gICAgICAgIHVwZGF0ZVNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHVwZGF0ZVNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IGdldFNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgICAgICAgICBpZiAob3JpZW50YXRpb24gPT09IDkwIHx8IG9yaWVudGF0aW9uID09PSAtOTAgfHwgYXBwVmlld01vZGVsLnZpZXdlckVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBwYWdlLmFjdGlvbkJhckhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2UuYW5kcm9pZCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgd2luZG93ID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHkuZ2V0V2luZG93KCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZWNvclZpZXcgPSB3aW5kb3cuZ2V0RGVjb3JWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB1aU9wdGlvbnMgPSAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfSU1NRVJTSVZFX1NUSUNLWVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0xBWU9VVF9GVUxMU0NSRUVOXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfTEFZT1VUX0hJREVfTkFWSUdBVElPTlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0xBWU9VVF9TVEFCTEVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19GVUxMU0NSRUVOXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfSElERV9OQVZJR0FUSU9OO1xuICAgICAgICAgICAgICAgICAgICBkZWNvclZpZXcuc2V0U3lzdGVtVWlWaXNpYmlsaXR5KHVpT3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYWdlLmFjdGlvbkJhckhpZGRlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChwYWdlLmFuZHJvaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHdpbmRvdyA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LmdldFdpbmRvdygpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGVjb3JWaWV3ID0gd2luZG93LmdldERlY29yVmlldygpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdWlPcHRpb25zID0gKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX1ZJU0lCTEU7XG4gICAgICAgICAgICAgICAgICAgIGRlY29yVmlldy5zZXRTeXN0ZW1VaVZpc2liaWxpdHkodWlPcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDUwMCk7XG4gICAgfSk7XG5cbiAgICB1cGRhdGVTY3JlZW5PcmllbnRhdGlvbigpO1xuXG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgdmFyIGFjdGl2aXR5ID0gYXBwbGljYXRpb24uYW5kcm9pZC5mb3JlZ3JvdW5kQWN0aXZpdHk7XG4gICAgICAgIGFjdGl2aXR5Lm9uQmFja1ByZXNzZWQgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciAhPSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3ICYmIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5hbmRyb2lkLmNhbkdvQmFjaygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5hbmRyb2lkLmdvQmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFwcFZpZXdNb2RlbC5vbihBcHBWaWV3TW9kZWwubG9hZFVybEV2ZW50LCAoZGF0YTpMb2FkVXJsRXZlbnREYXRhKT0+e1xuICAgICAgICBicm93c2VyVmlldy5sb2FkVXJsKGRhdGEudXJsKTtcbiAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgIH0pXG59XG5cbmFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLnJlc3VtZUV2ZW50LCAoKT0+IHtcbiAgICBpZiAoYXBwbGljYXRpb24uYW5kcm9pZCkge1xuICAgICAgICAvLyBvbiBhbmRyb2lkIHRoZSBwYWdlIGlzIHVubG9hZGVkL3JlbG9hZGVkIGFmdGVyIGEgc3VzcGVuZFxuICAgICAgICAvLyBvcGVuIGJhY2sgdG8gYm9va21hcmtzIGlmIG5lY2Vzc2FyeVxuICAgICAgICBpZiAoYXBwVmlld01vZGVsLmJvb2ttYXJrc09wZW4pIHtcbiAgICAgICAgICAgIC8vIGZvcmNlIGEgcHJvcGVydHkgY2hhbmdlIGV2ZW50XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwubm90aWZ5UHJvcGVydHlDaGFuZ2UoJ2Jvb2ttYXJrc09wZW4nLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gbGF5b3V0TG9hZGVkKGFyZ3MpIHtcbiAgICBsYXlvdXQgPSBhcmdzLm9iamVjdFxuICAgIGlmIChsYXlvdXQuaW9zKSB7XG4gICAgICAgIGxheW91dC5pb3MubGF5ZXIubWFza3NUb0JvdW5kcyA9IGZhbHNlO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhlYWRlckxvYWRlZChhcmdzKSB7XG4gICAgaGVhZGVyVmlldyA9IGFyZ3Mub2JqZWN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoQmFyTG9hZGVkKGFyZ3MpIHtcbiAgICBzZWFyY2hCYXIgPSBhcmdzLm9iamVjdDtcblxuICAgIHNlYXJjaEJhci5vbihTZWFyY2hCYXIuc3VibWl0RXZlbnQsICgpID0+IHtcbiAgICAgICAgbGV0IHVybFN0cmluZyA9IHNlYXJjaEJhci50ZXh0O1xuICAgICAgICBpZiAodXJsU3RyaW5nLmluZGV4T2YoJy8vJykgPT09IC0xKSB1cmxTdHJpbmcgPSAnLy8nICsgdXJsU3RyaW5nO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdXJsID0gVVJJKHVybFN0cmluZyk7XG4gICAgICAgIGlmICh1cmwucHJvdG9jb2woKSAhPT0gXCJodHRwXCIgJiYgdXJsLnByb3RvY29sKCkgIT09IFwiaHR0cHNcIikge1xuICAgICAgICAgICAgdXJsLnByb3RvY29sKFwiaHR0cFwiKTtcbiAgICAgICAgfVxuICAgICAgICBzZXRTZWFyY2hCYXJUZXh0KHVybC50b1N0cmluZygpKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmxvYWRVcmwodXJsLnRvU3RyaW5nKCkpO1xuICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUJvb2ttYXJrcygpO1xuICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZVJlYWxpdHlDaG9vc2VyKCk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICB9KTtcblxuICAgIGlmIChhcHBsaWNhdGlvbi5pb3MpIHtcbiAgICAgICAgaW9zU2VhcmNoQmFyQ29udHJvbGxlciA9IG5ldyBJT1NTZWFyY2hCYXJDb250cm9sbGVyKHNlYXJjaEJhcik7XG4gICAgfVxuXG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgYW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIgPSBuZXcgQW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIoc2VhcmNoQmFyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlYXJjaEJhclRleHQodXJsOnN0cmluZykge1xuICAgIGlmIChpb3NTZWFyY2hCYXJDb250cm9sbGVyKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIuc2V0VGV4dCh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyLnNldFRleHQodXJsKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJsdXJTZWFyY2hCYXIoKSB7XG4gICAgc2VhcmNoQmFyLmRpc21pc3NTb2Z0SW5wdXQoKTtcbiAgICBpZiAoc2VhcmNoQmFyLmFuZHJvaWQpIHtcbiAgICAgICAgc2VhcmNoQmFyLmFuZHJvaWQuY2xlYXJGb2N1cygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJyb3dzZXJWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuXG4gICAgLy8gU2V0dXAgdGhlIGRlYnVnIHZpZXdcbiAgICBsZXQgZGVidWc6SHRtbFZpZXcgPSA8SHRtbFZpZXc+YnJvd3NlclZpZXcucGFnZS5nZXRWaWV3QnlJZChcImRlYnVnXCIpO1xuICAgIGRlYnVnLmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDE1MCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgZGVidWcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VkXCI7XG4gICAgZGVidWcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gZmFsc2U7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2ttYXJrc1ZpZXdMb2FkZWQoYXJncykge1xuICAgIGJvb2ttYXJrc1ZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhbGl0eUNob29zZXJMb2FkZWQoYXJncykge1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVggPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcub3BhY2l0eSA9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b3VjaE92ZXJsYXlMb2FkZWQoYXJncykge1xuICAgIHRvdWNoT3ZlcmxheVZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuLy8gaW5pdGlhbGl6ZSBzb21lIHByb3BlcnRpZXMgb2YgdGhlIG1lbnUgc28gdGhhdCBhbmltYXRpb25zIHdpbGwgcmVuZGVyIGNvcnJlY3RseVxuZXhwb3J0IGZ1bmN0aW9uIG1lbnVMb2FkZWQoYXJncykge1xuICAgIG1lbnVWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgbWVudVZpZXcub3JpZ2luWCA9IDE7XG4gICAgbWVudVZpZXcub3JpZ2luWSA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVYID0gMDtcbiAgICBtZW51Vmlldy5zY2FsZVkgPSAwO1xuICAgIG1lbnVWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZWFyY2hCYXJUYXAoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uQ2FuY2VsKGFyZ3MpIHtcbiAgICBpZiAoISFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZVJlYWxpdHlDaG9vc2VyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICBibHVyU2VhcmNoQmFyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkFkZENoYW5uZWwoYXJncykge1xuICAgIGJyb3dzZXJWaWV3LmFkZExheWVyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblJlbG9hZChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3ICYmIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uRmF2b3JpdGVUb2dnbGUoYXJncykge1xuICAgIGNvbnN0IHVybCA9IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpO1xuICAgIGNvbnN0IGJvb2ttYXJrSXRlbSA9IGJvb2ttYXJrcy5mYXZvcml0ZU1hcC5nZXQodXJsKTtcbiAgICBpZiAoIWJvb2ttYXJrSXRlbSkge1xuICAgICAgICBib29rbWFya3MuZmF2b3JpdGVMaXN0LnB1c2gobmV3IGJvb2ttYXJrcy5Cb29rbWFya0l0ZW0oe1xuICAgICAgICAgICAgdXJpOiB1cmwsXG4gICAgICAgICAgICB0aXRsZTogYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy50aXRsZVxuICAgICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGkgPSBib29rbWFya3MuZmF2b3JpdGVMaXN0LmluZGV4T2YoYm9va21hcmtJdGVtKTtcbiAgICAgICAgYm9va21hcmtzLmZhdm9yaXRlTGlzdC5zcGxpY2UoaSwxKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkludGVyYWN0aW9uVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlSW50ZXJhY3Rpb25Nb2RlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk92ZXJ2aWV3KGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlT3ZlcnZpZXcoKTtcbiAgICBhcHBWaWV3TW9kZWwuc2V0RGVidWdFbmFibGVkKGZhbHNlKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uTWVudShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2VsZWN0UmVhbGl0eShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnNob3dSZWFsaXR5Q2hvb3NlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNldHRpbmdzKGFyZ3MpIHtcbiAgICAvL2NvZGUgdG8gb3BlbiB0aGUgc2V0dGluZ3MgdmlldyBnb2VzIGhlcmVcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uVmlld2VyVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlVmlld2VyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkRlYnVnVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlRGVidWcoKTtcbn1cblxuY2xhc3MgSU9TU2VhcmNoQmFyQ29udHJvbGxlciB7XG5cbiAgICBwcml2YXRlIHVpU2VhcmNoQmFyOlVJU2VhcmNoQmFyO1xuICAgIHByaXZhdGUgdGV4dEZpZWxkOlVJVGV4dEZpZWxkO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIHNlYXJjaEJhcjpTZWFyY2hCYXIpIHtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhciA9IHNlYXJjaEJhci5pb3M7XG4gICAgICAgIHRoaXMudGV4dEZpZWxkID0gdGhpcy51aVNlYXJjaEJhci52YWx1ZUZvcktleShcInNlYXJjaEZpZWxkXCIpO1xuXG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIua2V5Ym9hcmRUeXBlID0gVUlLZXlib2FyZFR5cGUuVVJMO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLmF1dG9jYXBpdGFsaXphdGlvblR5cGUgPSBVSVRleHRBdXRvY2FwaXRhbGl6YXRpb25UeXBlLk5vbmU7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuc2VhcmNoQmFyU3R5bGUgPSBVSVNlYXJjaEJhclN0eWxlLk1pbmltYWw7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIucmV0dXJuS2V5VHlwZSA9IFVJUmV0dXJuS2V5VHlwZS5HbztcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5zZXRJbWFnZUZvclNlYXJjaEJhckljb25TdGF0ZShVSUltYWdlLm5ldygpLCBVSVNlYXJjaEJhckljb24uU2VhcmNoLCBVSUNvbnRyb2xTdGF0ZS5Ob3JtYWwpXG4gICAgICAgIFxuICAgICAgICB0aGlzLnRleHRGaWVsZC5sZWZ0Vmlld01vZGUgPSBVSVRleHRGaWVsZFZpZXdNb2RlLk5ldmVyO1xuXG4gICAgICAgIGNvbnN0IHRleHRGaWVsZEVkaXRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG4gICAgICAgICAgICBpZiAodXRpbHMuaW9zLmdldHRlcihVSVJlc3BvbmRlciwgdGhpcy51aVNlYXJjaEJhci5pc0ZpcnN0UmVzcG9uZGVyKSkge1xuICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51aVNlYXJjaEJhci50ZXh0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnRleHQgPSBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQuc2VsZWN0ZWRUZXh0UmFuZ2UgPSB0aGlzLnRleHRGaWVsZC50ZXh0UmFuZ2VGcm9tUG9zaXRpb25Ub1Bvc2l0aW9uKHRoaXMudGV4dEZpZWxkLmJlZ2lubmluZ09mRG9jdW1lbnQsIHRoaXMudGV4dEZpZWxkLmVuZE9mRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxheW91dC5vbihHZXN0dXJlVHlwZXMudG91Y2gsKCk9PntcbiAgICAgICAgICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgICAgICAgICBsYXlvdXQub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnRleHQgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZEJlZ2luRWRpdGluZ05vdGlmaWNhdGlvbiwgdGV4dEZpZWxkRWRpdEhhbmRsZXIpO1xuICAgICAgICBhcHBsaWNhdGlvbi5pb3MuYWRkTm90aWZpY2F0aW9uT2JzZXJ2ZXIoVUlUZXh0RmllbGRUZXh0RGlkRW5kRWRpdGluZ05vdGlmaWNhdGlvbiwgdGV4dEZpZWxkRWRpdEhhbmRsZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2V0UGxhY2Vob2xkZXJUZXh0KHRleHQ6c3RyaW5nKSB7XG4gICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlczogTlNNdXRhYmxlRGljdGlvbmFyeTxzdHJpbmcsYW55PiA9IE5TTXV0YWJsZURpY3Rpb25hcnkubmV3PHN0cmluZyxhbnk+KCkuaW5pdCgpO1xuICAgICAgICAgICAgYXR0cmlidXRlcy5zZXRPYmplY3RGb3JLZXkodXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLFVJQ29sb3IuYmxhY2tDb2xvciksIE5TRm9yZWdyb3VuZENvbG9yQXR0cmlidXRlTmFtZSk7XG4gICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5hdHRyaWJ1dGVkUGxhY2Vob2xkZXIgPSBOU0F0dHJpYnV0ZWRTdHJpbmcuYWxsb2MoKS5pbml0V2l0aFN0cmluZ0F0dHJpYnV0ZXModGV4dCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5wbGFjZWhvbGRlciA9IHNlYXJjaEJhci5oaW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNldFRleHQodXJsKSB7XG4gICAgICAgIGlmICghdXRpbHMuaW9zLmdldHRlcihVSVJlc3BvbmRlciwgdGhpcy51aVNlYXJjaEJhci5pc0ZpcnN0UmVzcG9uZGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXRQbGFjZWhvbGRlclRleHQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgQW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSBzZWFyY2hWaWV3OmFuZHJvaWQud2lkZ2V0LlNlYXJjaFZpZXc7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc2VhcmNoQmFyOlNlYXJjaEJhcikge1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcgPSBzZWFyY2hCYXIuYW5kcm9pZDtcblxuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW5wdXRUeXBlKGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9DTEFTU19URVhUIHwgYW5kcm9pZC50ZXh0LklucHV0VHlwZS5UWVBFX1RFWFRfVkFSSUFUSU9OX1VSSSB8IGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9URVhUX0ZMQUdfTk9fU1VHR0VTVElPTlMpO1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW1lT3B0aW9ucyhhbmRyb2lkLnZpZXcuaW5wdXRtZXRob2QuRWRpdG9ySW5mby5JTUVfQUNUSU9OX0dPKTtcbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LmNsZWFyRm9jdXMoKTtcblxuICAgICAgICBjb25zdCBmb2N1c0hhbmRsZXIgPSBuZXcgYW5kcm9pZC52aWV3LlZpZXcuT25Gb2N1c0NoYW5nZUxpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uRm9jdXNDaGFuZ2UodjogYW5kcm9pZC52aWV3LlZpZXcsIGhhc0ZvY3VzOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRPblF1ZXJ5VGV4dEZvY3VzQ2hhbmdlTGlzdGVuZXIoZm9jdXNIYW5kbGVyKTtcblxuICAgICAgICAvLyB0aGUgbmF0aXZlc2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIE9uUXVlcnlUZXh0TGlzdGVuZXIgZG9lcyBub3QgY29ycmVjdGx5IGhhbmRsZSB0aGUgZm9sbG93aW5nIGNhc2U6XG4gICAgICAgIC8vIDEpIGFuIGV4dGVybmFsIGV2ZW50IHVwZGF0ZXMgdGhlIHF1ZXJ5IHRleHQgKGUuZy4gdGhlIHVzZXIgY2xpY2tlZCBhIGxpbmsgb24gYSBwYWdlKVxuICAgICAgICAvLyAyKSB0aGUgdXNlciBhdHRlbXB0cyB0byBuYXZpZ2F0ZSBiYWNrIHRvIHRoZSBwcmV2aW91cyBwYWdlIGJ5IHVwZGF0aW5nIHRoZSBzZWFyY2ggYmFyIHRleHRcbiAgICAgICAgLy8gMykgbmF0aXZlc2NyaXB0IHNlZXMgdGhpcyBhcyBzdWJtaXR0aW5nIHRoZSBzYW1lIHF1ZXJ5IGFuZCB0cmVhdHMgaXQgYXMgYSBuby1vcFxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L05hdGl2ZVNjcmlwdC9pc3N1ZXMvMzk2NVxuICAgICAgICBjb25zdCBzZWFyY2hIYW5kbGVyID0gbmV3IGFuZHJvaWQud2lkZ2V0LlNlYXJjaFZpZXcuT25RdWVyeVRleHRMaXN0ZW5lcih7XG4gICAgICAgICAgICBvblF1ZXJ5VGV4dENoYW5nZShuZXdUZXh0OiBTdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgICAgICAgICBzZWFyY2hCYXIuX29uUHJvcGVydHlDaGFuZ2VkRnJvbU5hdGl2ZShTZWFyY2hCYXIudGV4dFByb3BlcnR5LCBuZXdUZXh0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25RdWVyeVRleHRTdWJtaXQocXVlcnk6IFN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgICAgIHNlYXJjaEJhci5ub3RpZnkoPEV2ZW50RGF0YT57XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IHRoaXNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LnNldE9uUXVlcnlUZXh0TGlzdGVuZXIoc2VhcmNoSGFuZGxlcik7XG4gICAgfVxuXG4gICAgcHVibGljIHNldFRleHQodXJsKSB7XG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRRdWVyeSh1cmwsIGZhbHNlKTtcbiAgICB9XG59XG4iXX0=