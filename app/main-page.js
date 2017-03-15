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
var util_1 = require("./components/common/util"); // todo: add updateDisplayOrientation here
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
    AppViewModel_1.appViewModel.argon.session.errorEvent.addEventListener(function (error) {
        // alert(error.message + '\n' + error.stack);
        if (error.stack)
            console.log(error.message + '\n' + error.stack);
    });
    application.on(application.orientationChangedEvent, function (args) {
        setTimeout(function () {
            //updateDisplayOrientation(); todo: re-enable this
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
    //updateDisplayOrientation(); todo: re-enable this
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
    }
    return AndroidSearchBarController;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQThELENBQUMsMENBQTBDO0FBRXpHLCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUNsRCxJQUFJLDBCQUFxRCxDQUFDO0FBRTFELDJCQUFZLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLFVBQUMsR0FBc0I7SUFDckQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLGdCQUFnQixDQUFDLDJCQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsNEZBQTRGO1FBQzVGLDZDQUE2QztRQUM3QyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNaLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BELGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ELENBQUM7SUFFTCxDQUFDO0lBQ0QsSUFBSSxDQUFD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Q0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzdLLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRTdCLElBQU0sWUFBWSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUM7WUFDN0QsYUFBYSxZQUFDLENBQW9CLEVBQUUsUUFBaUI7Z0JBQ2pELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ1gsRUFBRSxDQUFDLENBQUMsbUJBQVcsQ0FBQyxhQUFhLEtBQUssbUJBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO3dCQUN6RCwyQkFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7b0JBQ3RDLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osMkJBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDakMsQ0FBQztvQkFDRCwyQkFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3BDLENBQUM7WUFDTCxDQUFDO1NBQ0osQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQ0FBaUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBQ0wsaUNBQUM7QUFBRCxDQUFDLEFBMUJELElBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgVVJJIGZyb20gJ3VyaWpzJztcbmltcG9ydCAqIGFzIGFwcGxpY2F0aW9uIGZyb20gJ2FwcGxpY2F0aW9uJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCB7U2VhcmNoQmFyfSBmcm9tICd1aS9zZWFyY2gtYmFyJztcbmltcG9ydCB7UGFnZX0gZnJvbSAndWkvcGFnZSc7XG5pbXBvcnQge0J1dHRvbn0gZnJvbSAndWkvYnV0dG9uJztcbmltcG9ydCB7Vmlld30gZnJvbSAndWkvY29yZS92aWV3JztcbmltcG9ydCB7SHRtbFZpZXd9IGZyb20gJ3VpL2h0bWwtdmlldydcbmltcG9ydCB7Q29sb3J9IGZyb20gJ2NvbG9yJztcbmltcG9ydCB7UHJvcGVydHlDaGFuZ2VEYXRhfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IHtBbmltYXRpb25DdXJ2ZX0gZnJvbSAndWkvZW51bXMnXG5pbXBvcnQge0dlc3R1cmVUeXBlc30gZnJvbSAndWkvZ2VzdHVyZXMnXG5cbmltcG9ydCB7QnJvd3NlclZpZXd9IGZyb20gJy4vY29tcG9uZW50cy9icm93c2VyLXZpZXcnO1xuaW1wb3J0ICogYXMgYm9va21hcmtzIGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vYm9va21hcmtzJztcbmltcG9ydCB7YXBwVmlld01vZGVsLCBBcHBWaWV3TW9kZWwsIExvYWRVcmxFdmVudERhdGF9IGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vQXBwVmlld01vZGVsJztcbmltcG9ydCB7Z2V0U2NyZWVuT3JpZW50YXRpb259IGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vdXRpbCc7IC8vIHRvZG86IGFkZCB1cGRhdGVEaXNwbGF5T3JpZW50YXRpb24gaGVyZVxuXG4vLyBpbXBvcnQge1JlYWxpdHlWaWV3ZXJ9IGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuXG4vL2ltcG9ydCAqIGFzIG9yaWVudGF0aW9uTW9kdWxlIGZyb20gJ25hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb24nO1xudmFyIG9yaWVudGF0aW9uTW9kdWxlID0gcmVxdWlyZShcIm5hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb25cIik7XG5cbmV4cG9ydCBsZXQgcGFnZTpQYWdlO1xuZXhwb3J0IGxldCBsYXlvdXQ6VmlldztcbmV4cG9ydCBsZXQgdG91Y2hPdmVybGF5VmlldzpWaWV3O1xuZXhwb3J0IGxldCBoZWFkZXJWaWV3OlZpZXc7XG5leHBvcnQgbGV0IG1lbnVWaWV3OlZpZXc7XG5leHBvcnQgbGV0IGJyb3dzZXJWaWV3OkJyb3dzZXJWaWV3O1xuZXhwb3J0IGxldCBib29rbWFya3NWaWV3OlZpZXc7XG5leHBvcnQgbGV0IHJlYWxpdHlDaG9vc2VyVmlldzpWaWV3O1xuXG5sZXQgc2VhcmNoQmFyOlNlYXJjaEJhcjtcbmxldCBpb3NTZWFyY2hCYXJDb250cm9sbGVyOklPU1NlYXJjaEJhckNvbnRyb2xsZXI7XG5sZXQgYW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXI6QW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXI7XG5cbmFwcFZpZXdNb2RlbC5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZ0OlByb3BlcnR5Q2hhbmdlRGF0YSk9PntcbiAgICBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2N1cnJlbnRVcmknKSB7XG4gICAgICAgIHNldFNlYXJjaEJhclRleHQoYXBwVmlld01vZGVsLmN1cnJlbnRVcmkpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAndmlld2VyRW5hYmxlZCcpIHtcbiAgICAgICAgLy8gY29uc3QgdnVmb3JpYURlbGVnYXRlID0gYXBwVmlld01vZGVsLm1hbmFnZXIuY29udGFpbmVyLmdldChBcmdvbi5WdWZvcmlhU2VydmljZURlbGVnYXRlKTtcbiAgICAgICAgLy8gdnVmb3JpYURlbGVnYXRlLnZpZXdlckVuYWJsZWQgPSBldnQudmFsdWU7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImxhbmRzY2FwZVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcInBvcnRyYWl0XCIpO1xuICAgICAgICAgICAgb3JpZW50YXRpb25Nb2R1bGUuc2V0Q3VycmVudE9yaWVudGF0aW9uKFwiYWxsXCIpO1xuICAgICAgICB9XG5cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ21lbnVPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgICAgICBtZW51Vmlldy52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAxLFxuICAgICAgICAgICAgICAgICAgICB5OiAxLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vbihHZXN0dXJlVHlwZXMudG91Y2gsKCk9PntcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lbnVWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VcIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ292ZXJ2aWV3T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYnJvd3NlclZpZXcuc2hvd092ZXJ2aWV3KCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUJvb2ttYXJrcygpO1xuICAgICAgICAgICAgc2VhcmNoQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6LTEwMCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBzZWFyY2hCYXIudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnYWRkQnV0dG9uJyk7XG4gICAgICAgICAgICBhZGRCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi50cmFuc2xhdGVYID0gLTEwO1xuICAgICAgICAgICAgYWRkQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgaWYgKCFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgc2VhcmNoQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBhZGRCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdhZGRCdXR0b24nKTtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBhZGRCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdyZWFsaXR5Q2hvb3Nlck9wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjEsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVYID0gMC45O1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnYm9va21hcmtzT3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVYID0gMC45O1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVZID0gMC45O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9IFxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdjYW5jZWxCdXR0b25TaG93bicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdvdmVydmlld0J1dHRvbicpO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgbWVudUJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ21lbnVCdXR0b24nKTtcbiAgICAgICAgICAgIG1lbnVCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgbWVudUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdjYW5jZWxCdXR0b24nKTtcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ292ZXJ2aWV3QnV0dG9uJyk7XG4gICAgICAgICAgICBvdmVydmlld0J1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgbWVudUJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ21lbnVCdXR0b24nKTtcbiAgICAgICAgICAgIG1lbnVCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIG1lbnVCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgY2FuY2VsQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnY2FuY2VsQnV0dG9uJyk7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGF5b3V0Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICB9XG4gICAgfVxufSlcblxuZXhwb3J0IGZ1bmN0aW9uIHBhZ2VMb2FkZWQoYXJncykge1xuXG4gICAgcGFnZSA9IGFyZ3Mub2JqZWN0O1xuICAgIHBhZ2UuYmluZGluZ0NvbnRleHQgPSBhcHBWaWV3TW9kZWw7XG4gICAgYXBwVmlld01vZGVsLnNldFJlYWR5KCk7XG5cbiAgICAvLyBTZXQgdGhlIGljb24gZm9yIHRoZSBtZW51IGJ1dHRvblxuICAgIGNvbnN0IG1lbnVCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwibWVudUJ1dHRvblwiKTtcbiAgICBtZW51QnV0dG9uLnRleHQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4ZTVkNCk7XG5cbiAgICAvLyBTZXQgdGhlIGljb24gZm9yIHRoZSBvdmVydmlldyBidXR0b25cbiAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IDxCdXR0b24+IHBhZ2UuZ2V0Vmlld0J5SWQoXCJvdmVydmlld0J1dHRvblwiKTtcbiAgICBvdmVydmlld0J1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1M2IpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmF2aWdhdGVkVG8oYXJncykge1xuICAgIFxuICAgIC8vIGZvY3VzIG9uIHRoZSB0b3Btb3N0IGxheWVyXG4gICAgYnJvd3NlclZpZXcuc2V0Rm9jdXNzZWRMYXllcihicm93c2VyVmlldy5sYXllcnNbYnJvd3NlclZpZXcubGF5ZXJzLmxlbmd0aC0xXSk7XG5cbiAgICAvLyB3b3JrYXJvdW5kIChzZWUgaHR0cHM6Ly9naXRodWIuY29tL05hdGl2ZVNjcmlwdC9OYXRpdmVTY3JpcHQvaXNzdWVzLzY1OSlcbiAgICBpZiAocGFnZS5pb3MpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgcGFnZS5yZXF1ZXN0TGF5b3V0KCk7XG4gICAgICAgIH0sIDApXG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSUFwcGxpY2F0aW9uRGlkQmVjb21lQWN0aXZlTm90aWZpY2F0aW9uLCAoKSA9PiB7XG4gICAgICAgICAgICBwYWdlLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgXG4gICAgYXBwVmlld01vZGVsLmFyZ29uLnNlc3Npb24uZXJyb3JFdmVudC5hZGRFdmVudExpc3RlbmVyKChlcnJvcik9PntcbiAgICAgICAgLy8gYWxlcnQoZXJyb3IubWVzc2FnZSArICdcXG4nICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICBpZiAoZXJyb3Iuc3RhY2spIGNvbnNvbGUubG9nKGVycm9yLm1lc3NhZ2UgKyAnXFxuJyArIGVycm9yLnN0YWNrKTtcbiAgICB9KVxuXG4gICAgYXBwbGljYXRpb24ub24oYXBwbGljYXRpb24ub3JpZW50YXRpb25DaGFuZ2VkRXZlbnQsIChhcmdzKT0+e1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAvL3VwZGF0ZURpc3BsYXlPcmllbnRhdGlvbigpOyB0b2RvOiByZS1lbmFibGUgdGhpc1xuICAgICAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBnZXRTY3JlZW5PcmllbnRhdGlvbigpO1xuICAgICAgICAgICAgaWYgKG9yaWVudGF0aW9uID09PSA5MCB8fCBvcmllbnRhdGlvbiA9PT0gLTkwIHx8IGFwcFZpZXdNb2RlbC52aWV3ZXJFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgcGFnZS5hY3Rpb25CYXJIaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChwYWdlLmFuZHJvaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHdpbmRvdyA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5LmdldFdpbmRvdygpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGVjb3JWaWV3ID0gd2luZG93LmdldERlY29yVmlldygpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdWlPcHRpb25zID0gKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0lNTUVSU0lWRV9TVElDS1lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfRlVMTFNDUkVFTlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0xBWU9VVF9ISURFX05BVklHQVRJT05cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19MQVlPVVRfU1RBQkxFXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAoPGFueT5hbmRyb2lkLnZpZXcuVmlldykuU1lTVEVNX1VJX0ZMQUdfRlVMTFNDUkVFTlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKDxhbnk+YW5kcm9pZC52aWV3LlZpZXcpLlNZU1RFTV9VSV9GTEFHX0hJREVfTkFWSUdBVElPTjtcbiAgICAgICAgICAgICAgICAgICAgZGVjb3JWaWV3LnNldFN5c3RlbVVpVmlzaWJpbGl0eSh1aU9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFnZS5hY3Rpb25CYXJIaWRkZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAocGFnZS5hbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB3aW5kb3cgPSBhcHBsaWNhdGlvbi5hbmRyb2lkLmZvcmVncm91bmRBY3Rpdml0eS5nZXRXaW5kb3coKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRlY29yVmlldyA9IHdpbmRvdy5nZXREZWNvclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHVpT3B0aW9ucyA9ICg8YW55PmFuZHJvaWQudmlldy5WaWV3KS5TWVNURU1fVUlfRkxBR19WSVNJQkxFO1xuICAgICAgICAgICAgICAgICAgICBkZWNvclZpZXcuc2V0U3lzdGVtVWlWaXNpYmlsaXR5KHVpT3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCA1MDApO1xuICAgIH0pO1xuXG4gICAgLy91cGRhdGVEaXNwbGF5T3JpZW50YXRpb24oKTsgdG9kbzogcmUtZW5hYmxlIHRoaXNcblxuICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG4gICAgICAgIHZhciBhY3Rpdml0eSA9IGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5O1xuICAgICAgICBhY3Rpdml0eS5vbkJhY2tQcmVzc2VkID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgIT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldyAmJiBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcuYW5kcm9pZC5jYW5Hb0JhY2soKSkge1xuICAgICAgICAgICAgICAgICAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcuYW5kcm9pZC5nb0JhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhcHBWaWV3TW9kZWwub24oQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCwgKGRhdGE6TG9hZFVybEV2ZW50RGF0YSk9PntcbiAgICAgICAgYnJvd3NlclZpZXcubG9hZFVybChkYXRhLnVybCk7XG4gICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICB9KVxufVxuXG5hcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5yZXN1bWVFdmVudCwgKCk9PiB7XG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgLy8gb24gYW5kcm9pZCB0aGUgcGFnZSBpcyB1bmxvYWRlZC9yZWxvYWRlZCBhZnRlciBhIHN1c3BlbmRcbiAgICAgICAgLy8gb3BlbiBiYWNrIHRvIGJvb2ttYXJrcyBpZiBuZWNlc3NhcnlcbiAgICAgICAgaWYgKGFwcFZpZXdNb2RlbC5ib29rbWFya3NPcGVuKSB7XG4gICAgICAgICAgICAvLyBmb3JjZSBhIHByb3BlcnR5IGNoYW5nZSBldmVudFxuICAgICAgICAgICAgYXBwVmlld01vZGVsLm5vdGlmeVByb3BlcnR5Q2hhbmdlKCdib29rbWFya3NPcGVuJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxheW91dExvYWRlZChhcmdzKSB7XG4gICAgbGF5b3V0ID0gYXJncy5vYmplY3RcbiAgICBpZiAobGF5b3V0Lmlvcykge1xuICAgICAgICBsYXlvdXQuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoZWFkZXJMb2FkZWQoYXJncykge1xuICAgIGhlYWRlclZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEJhckxvYWRlZChhcmdzKSB7XG4gICAgc2VhcmNoQmFyID0gYXJncy5vYmplY3Q7XG5cbiAgICBzZWFyY2hCYXIub24oU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LCAoKSA9PiB7XG4gICAgICAgIGxldCB1cmxTdHJpbmcgPSBzZWFyY2hCYXIudGV4dDtcbiAgICAgICAgaWYgKHVybFN0cmluZy5pbmRleE9mKCcvLycpID09PSAtMSkgdXJsU3RyaW5nID0gJy8vJyArIHVybFN0cmluZztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IFVSSSh1cmxTdHJpbmcpO1xuICAgICAgICBpZiAodXJsLnByb3RvY29sKCkgIT09IFwiaHR0cFwiICYmIHVybC5wcm90b2NvbCgpICE9PSBcImh0dHBzXCIpIHtcbiAgICAgICAgICAgIHVybC5wcm90b2NvbChcImh0dHBcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2V0U2VhcmNoQmFyVGV4dCh1cmwudG9TdHJpbmcoKSk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5sb2FkVXJsKHVybC50b1N0cmluZygpKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgfSk7XG5cbiAgICBpZiAoYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIgPSBuZXcgSU9TU2VhcmNoQmFyQ29udHJvbGxlcihzZWFyY2hCYXIpO1xuICAgIH1cblxuICAgIGlmIChhcHBsaWNhdGlvbi5hbmRyb2lkKSB7XG4gICAgICAgIGFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyID0gbmV3IEFuZHJvaWRTZWFyY2hCYXJDb250cm9sbGVyKHNlYXJjaEJhcik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWFyY2hCYXJUZXh0KHVybDpzdHJpbmcpIHtcbiAgICBpZiAoaW9zU2VhcmNoQmFyQ29udHJvbGxlcikge1xuICAgICAgICBpb3NTZWFyY2hCYXJDb250cm9sbGVyLnNldFRleHQodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWFyY2hCYXIudGV4dCA9IHVybDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJsdXJTZWFyY2hCYXIoKSB7XG4gICAgc2VhcmNoQmFyLmRpc21pc3NTb2Z0SW5wdXQoKTtcbiAgICBpZiAoc2VhcmNoQmFyLmFuZHJvaWQpIHtcbiAgICAgICAgc2VhcmNoQmFyLmFuZHJvaWQuY2xlYXJGb2N1cygpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJyb3dzZXJWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuXG4gICAgLy8gU2V0dXAgdGhlIGRlYnVnIHZpZXdcbiAgICBsZXQgZGVidWc6SHRtbFZpZXcgPSA8SHRtbFZpZXc+YnJvd3NlclZpZXcucGFnZS5nZXRWaWV3QnlJZChcImRlYnVnXCIpO1xuICAgIGRlYnVnLmhvcml6b250YWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcudmVydGljYWxBbGlnbm1lbnQgPSAnc3RyZXRjaCc7XG4gICAgZGVidWcuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDE1MCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgZGVidWcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VkXCI7XG4gICAgZGVidWcuaXNVc2VySW50ZXJhY3Rpb25FbmFibGVkID0gZmFsc2U7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2ttYXJrc1ZpZXdMb2FkZWQoYXJncykge1xuICAgIGJvb2ttYXJrc1ZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICBib29rbWFya3NWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhbGl0eUNob29zZXJMb2FkZWQoYXJncykge1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVggPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcub3BhY2l0eSA9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b3VjaE92ZXJsYXlMb2FkZWQoYXJncykge1xuICAgIHRvdWNoT3ZlcmxheVZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuLy8gaW5pdGlhbGl6ZSBzb21lIHByb3BlcnRpZXMgb2YgdGhlIG1lbnUgc28gdGhhdCBhbmltYXRpb25zIHdpbGwgcmVuZGVyIGNvcnJlY3RseVxuZXhwb3J0IGZ1bmN0aW9uIG1lbnVMb2FkZWQoYXJncykge1xuICAgIG1lbnVWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgbWVudVZpZXcub3JpZ2luWCA9IDE7XG4gICAgbWVudVZpZXcub3JpZ2luWSA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVYID0gMDtcbiAgICBtZW51Vmlldy5zY2FsZVkgPSAwO1xuICAgIG1lbnVWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZWFyY2hCYXJUYXAoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uQ2FuY2VsKGFyZ3MpIHtcbiAgICBpZiAoISFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZVJlYWxpdHlDaG9vc2VyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICBibHVyU2VhcmNoQmFyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkFkZENoYW5uZWwoYXJncykge1xuICAgIGJyb3dzZXJWaWV3LmFkZExheWVyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblJlbG9hZChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3ICYmIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldy5yZWxvYWQoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uRmF2b3JpdGVUb2dnbGUoYXJncykge1xuICAgIGNvbnN0IHVybCA9IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpO1xuICAgIGNvbnN0IGJvb2ttYXJrSXRlbSA9IGJvb2ttYXJrcy5mYXZvcml0ZU1hcC5nZXQodXJsKTtcbiAgICBpZiAoIWJvb2ttYXJrSXRlbSkge1xuICAgICAgICBib29rbWFya3MuZmF2b3JpdGVMaXN0LnB1c2gobmV3IGJvb2ttYXJrcy5Cb29rbWFya0l0ZW0oe1xuICAgICAgICAgICAgdXJpOiB1cmwsXG4gICAgICAgICAgICB0aXRsZTogYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy50aXRsZVxuICAgICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGkgPSBib29rbWFya3MuZmF2b3JpdGVMaXN0LmluZGV4T2YoYm9va21hcmtJdGVtKTtcbiAgICAgICAgYm9va21hcmtzLmZhdm9yaXRlTGlzdC5zcGxpY2UoaSwxKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkludGVyYWN0aW9uVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlSW50ZXJhY3Rpb25Nb2RlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk92ZXJ2aWV3KGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlT3ZlcnZpZXcoKTtcbiAgICBhcHBWaWV3TW9kZWwuc2V0RGVidWdFbmFibGVkKGZhbHNlKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uTWVudShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2VsZWN0UmVhbGl0eShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnNob3dSZWFsaXR5Q2hvb3NlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNldHRpbmdzKGFyZ3MpIHtcbiAgICAvL2NvZGUgdG8gb3BlbiB0aGUgc2V0dGluZ3MgdmlldyBnb2VzIGhlcmVcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uVmlld2VyVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlVmlld2VyKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkRlYnVnVG9nZ2xlKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlRGVidWcoKTtcbn1cblxuY2xhc3MgSU9TU2VhcmNoQmFyQ29udHJvbGxlciB7XG5cbiAgICBwcml2YXRlIHVpU2VhcmNoQmFyOlVJU2VhcmNoQmFyO1xuICAgIHByaXZhdGUgdGV4dEZpZWxkOlVJVGV4dEZpZWxkO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIHNlYXJjaEJhcjpTZWFyY2hCYXIpIHtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhciA9IHNlYXJjaEJhci5pb3M7XG4gICAgICAgIHRoaXMudGV4dEZpZWxkID0gdGhpcy51aVNlYXJjaEJhci52YWx1ZUZvcktleShcInNlYXJjaEZpZWxkXCIpO1xuXG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIua2V5Ym9hcmRUeXBlID0gVUlLZXlib2FyZFR5cGUuVVJMO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLmF1dG9jYXBpdGFsaXphdGlvblR5cGUgPSBVSVRleHRBdXRvY2FwaXRhbGl6YXRpb25UeXBlLk5vbmU7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuc2VhcmNoQmFyU3R5bGUgPSBVSVNlYXJjaEJhclN0eWxlLk1pbmltYWw7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIucmV0dXJuS2V5VHlwZSA9IFVJUmV0dXJuS2V5VHlwZS5HbztcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5zZXRJbWFnZUZvclNlYXJjaEJhckljb25TdGF0ZShVSUltYWdlLm5ldygpLCBVSVNlYXJjaEJhckljb24uU2VhcmNoLCBVSUNvbnRyb2xTdGF0ZS5Ob3JtYWwpXG4gICAgICAgIFxuICAgICAgICB0aGlzLnRleHRGaWVsZC5sZWZ0Vmlld01vZGUgPSBVSVRleHRGaWVsZFZpZXdNb2RlLk5ldmVyO1xuXG4gICAgICAgIGNvbnN0IHRleHRGaWVsZEVkaXRIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG4gICAgICAgICAgICBpZiAodXRpbHMuaW9zLmdldHRlcihVSVJlc3BvbmRlciwgdGhpcy51aVNlYXJjaEJhci5pc0ZpcnN0UmVzcG9uZGVyKSkge1xuICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51aVNlYXJjaEJhci50ZXh0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnRleHQgPSBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQuc2VsZWN0ZWRUZXh0UmFuZ2UgPSB0aGlzLnRleHRGaWVsZC50ZXh0UmFuZ2VGcm9tUG9zaXRpb25Ub1Bvc2l0aW9uKHRoaXMudGV4dEZpZWxkLmJlZ2lubmluZ09mRG9jdW1lbnQsIHRoaXMudGV4dEZpZWxkLmVuZE9mRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxheW91dC5vbihHZXN0dXJlVHlwZXMudG91Y2gsKCk9PntcbiAgICAgICAgICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgICAgICAgICBsYXlvdXQub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnRleHQgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZEJlZ2luRWRpdGluZ05vdGlmaWNhdGlvbiwgdGV4dEZpZWxkRWRpdEhhbmRsZXIpO1xuICAgICAgICBhcHBsaWNhdGlvbi5pb3MuYWRkTm90aWZpY2F0aW9uT2JzZXJ2ZXIoVUlUZXh0RmllbGRUZXh0RGlkRW5kRWRpdGluZ05vdGlmaWNhdGlvbiwgdGV4dEZpZWxkRWRpdEhhbmRsZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2V0UGxhY2Vob2xkZXJUZXh0KHRleHQ6c3RyaW5nKSB7XG4gICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlczogTlNNdXRhYmxlRGljdGlvbmFyeTxzdHJpbmcsYW55PiA9IE5TTXV0YWJsZURpY3Rpb25hcnkubmV3PHN0cmluZyxhbnk+KCkuaW5pdCgpO1xuICAgICAgICAgICAgYXR0cmlidXRlcy5zZXRPYmplY3RGb3JLZXkodXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLFVJQ29sb3IuYmxhY2tDb2xvciksIE5TRm9yZWdyb3VuZENvbG9yQXR0cmlidXRlTmFtZSk7XG4gICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5hdHRyaWJ1dGVkUGxhY2Vob2xkZXIgPSBOU0F0dHJpYnV0ZWRTdHJpbmcuYWxsb2MoKS5pbml0V2l0aFN0cmluZ0F0dHJpYnV0ZXModGV4dCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5wbGFjZWhvbGRlciA9IHNlYXJjaEJhci5oaW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNldFRleHQodXJsKSB7XG4gICAgICAgIGlmICghdXRpbHMuaW9zLmdldHRlcihVSVJlc3BvbmRlciwgdGhpcy51aVNlYXJjaEJhci5pc0ZpcnN0UmVzcG9uZGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXRQbGFjZWhvbGRlclRleHQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgQW5kcm9pZFNlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSBzZWFyY2hWaWV3OmFuZHJvaWQud2lkZ2V0LlNlYXJjaFZpZXc7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc2VhcmNoQmFyOlNlYXJjaEJhcikge1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcgPSBzZWFyY2hCYXIuYW5kcm9pZDtcblxuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW5wdXRUeXBlKGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9DTEFTU19URVhUIHwgYW5kcm9pZC50ZXh0LklucHV0VHlwZS5UWVBFX1RFWFRfVkFSSUFUSU9OX1VSSSB8IGFuZHJvaWQudGV4dC5JbnB1dFR5cGUuVFlQRV9URVhUX0ZMQUdfTk9fU1VHR0VTVElPTlMpO1xuICAgICAgICB0aGlzLnNlYXJjaFZpZXcuc2V0SW1lT3B0aW9ucyhhbmRyb2lkLnZpZXcuaW5wdXRtZXRob2QuRWRpdG9ySW5mby5JTUVfQUNUSU9OX0dPKTtcbiAgICAgICAgdGhpcy5zZWFyY2hWaWV3LmNsZWFyRm9jdXMoKTtcblxuICAgICAgICBjb25zdCBmb2N1c0hhbmRsZXIgPSBuZXcgYW5kcm9pZC52aWV3LlZpZXcuT25Gb2N1c0NoYW5nZUxpc3RlbmVyKHtcbiAgICAgICAgICAgIG9uRm9jdXNDaGFuZ2UodjogYW5kcm9pZC52aWV3LlZpZXcsIGhhc0ZvY3VzOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2VhcmNoVmlldy5zZXRPblF1ZXJ5VGV4dEZvY3VzQ2hhbmdlTGlzdGVuZXIoZm9jdXNIYW5kbGVyKTtcbiAgICB9XG59XG4iXX0=