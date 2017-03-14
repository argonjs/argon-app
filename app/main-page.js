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
    application.on(application.orientationChangedEvent, function () {
        setTimeout(function () {
            var orientation = util_1.getScreenOrientation();
            if (orientation === 90 || orientation === -90 || AppViewModel_1.appViewModel.viewerEnabled)
                exports.page.actionBarHidden = true;
            else
                exports.page.actionBarHidden = false;
        }, 500);
    });
}
exports.pageLoaded = pageLoaded;
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
    AppViewModel_1.appViewModel.on(AppViewModel_1.AppViewModel.loadUrlEvent, function (data) {
        exports.browserView.loadUrl(data.url);
    });
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
    // if (browserView.focussedLayer === browserView.realityLayer) {
    //     appViewModel.argon.reality.request(appViewModel.argon.reality.current || RealityViewer.LIVE);
    // } else {
    // }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQThEO0FBRTlELCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUVsRCwyQkFBWSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLEdBQXNCO0lBQ3JELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwQyxnQkFBZ0IsQ0FBQywyQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLDRGQUE0RjtRQUM1Riw2Q0FBNkM7UUFDN0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwRCxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuRCxDQUFDO0lBRUwsQ0FBQztJQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFL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QXVCLENBQUMsMENBQTBDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUMxRyxXQUFXLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLHdDQUF3QyxFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDNUcsQ0FBQztJQUVPLG1EQUFrQixHQUExQixVQUEyQixJQUFXO1FBQ2xDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDUCxJQUFJLFVBQVUsR0FBb0MsbUJBQW1CLENBQUMsR0FBRyxFQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDL0YsVUFBVSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLDhCQUE4QixDQUFDLENBQUM7WUFDekcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDakgsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztRQUNoRCxDQUFDO0lBQ0wsQ0FBQztJQUVNLHdDQUFPLEdBQWQsVUFBZSxHQUFHO1FBQ2QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakMsQ0FBQztJQUNMLENBQUM7SUFDTCw2QkFBQztBQUFELENBQUMsQUFqRUQsSUFpRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBVUkkgZnJvbSAndXJpanMnO1xuaW1wb3J0ICogYXMgYXBwbGljYXRpb24gZnJvbSAnYXBwbGljYXRpb24nO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAndXRpbHMvdXRpbHMnO1xuaW1wb3J0IHtTZWFyY2hCYXJ9IGZyb20gJ3VpL3NlYXJjaC1iYXInO1xuaW1wb3J0IHtQYWdlfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7QnV0dG9ufSBmcm9tICd1aS9idXR0b24nO1xuaW1wb3J0IHtWaWV3fSBmcm9tICd1aS9jb3JlL3ZpZXcnO1xuaW1wb3J0IHtIdG1sVmlld30gZnJvbSAndWkvaHRtbC12aWV3J1xuaW1wb3J0IHtDb2xvcn0gZnJvbSAnY29sb3InO1xuaW1wb3J0IHtQcm9wZXJ0eUNoYW5nZURhdGF9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0FuaW1hdGlvbkN1cnZlfSBmcm9tICd1aS9lbnVtcydcbmltcG9ydCB7R2VzdHVyZVR5cGVzfSBmcm9tICd1aS9nZXN0dXJlcydcblxuaW1wb3J0IHtCcm93c2VyVmlld30gZnJvbSAnLi9jb21wb25lbnRzL2Jyb3dzZXItdmlldyc7XG5pbXBvcnQgKiBhcyBib29rbWFya3MgZnJvbSAnLi9jb21wb25lbnRzL2NvbW1vbi9ib29rbWFya3MnO1xuaW1wb3J0IHthcHBWaWV3TW9kZWwsIEFwcFZpZXdNb2RlbCwgTG9hZFVybEV2ZW50RGF0YX0gZnJvbSAnLi9jb21wb25lbnRzL2NvbW1vbi9BcHBWaWV3TW9kZWwnO1xuaW1wb3J0IHtnZXRTY3JlZW5PcmllbnRhdGlvbn0gZnJvbSAnLi9jb21wb25lbnRzL2NvbW1vbi91dGlsJztcblxuLy8gaW1wb3J0IHtSZWFsaXR5Vmlld2VyfSBmcm9tICdAYXJnb25qcy9hcmdvbidcblxuLy9pbXBvcnQgKiBhcyBvcmllbnRhdGlvbk1vZHVsZSBmcm9tICduYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uJztcbnZhciBvcmllbnRhdGlvbk1vZHVsZSA9IHJlcXVpcmUoXCJuYXRpdmVzY3JpcHQtc2NyZWVuLW9yaWVudGF0aW9uXCIpO1xuXG5leHBvcnQgbGV0IHBhZ2U6UGFnZTtcbmV4cG9ydCBsZXQgbGF5b3V0OlZpZXc7XG5leHBvcnQgbGV0IHRvdWNoT3ZlcmxheVZpZXc6VmlldztcbmV4cG9ydCBsZXQgaGVhZGVyVmlldzpWaWV3O1xuZXhwb3J0IGxldCBtZW51VmlldzpWaWV3O1xuZXhwb3J0IGxldCBicm93c2VyVmlldzpCcm93c2VyVmlldztcbmV4cG9ydCBsZXQgYm9va21hcmtzVmlldzpWaWV3O1xuZXhwb3J0IGxldCByZWFsaXR5Q2hvb3NlclZpZXc6VmlldztcblxubGV0IHNlYXJjaEJhcjpTZWFyY2hCYXI7XG5sZXQgaW9zU2VhcmNoQmFyQ29udHJvbGxlcjpJT1NTZWFyY2hCYXJDb250cm9sbGVyO1xuXG5hcHBWaWV3TW9kZWwub24oJ3Byb3BlcnR5Q2hhbmdlJywgKGV2dDpQcm9wZXJ0eUNoYW5nZURhdGEpPT57XG4gICAgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdjdXJyZW50VXJpJykge1xuICAgICAgICBzZXRTZWFyY2hCYXJUZXh0KGFwcFZpZXdNb2RlbC5jdXJyZW50VXJpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ3ZpZXdlckVuYWJsZWQnKSB7XG4gICAgICAgIC8vIGNvbnN0IHZ1Zm9yaWFEZWxlZ2F0ZSA9IGFwcFZpZXdNb2RlbC5tYW5hZ2VyLmNvbnRhaW5lci5nZXQoQXJnb24uVnVmb3JpYVNlcnZpY2VEZWxlZ2F0ZSk7XG4gICAgICAgIC8vIHZ1Zm9yaWFEZWxlZ2F0ZS52aWV3ZXJFbmFibGVkID0gZXZ0LnZhbHVlO1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJsYW5kc2NhcGVcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1vZHVsZS5zZXRDdXJyZW50T3JpZW50YXRpb24oXCJwb3J0cmFpdFwiKTtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImFsbFwiKTtcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdtZW51T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xuICAgICAgICAgICAgbWVudVZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDogMSxcbiAgICAgICAgICAgICAgICAgICAgeTogMSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1lbnVWaWV3LnZpc2liaWxpdHkgPSBcImNvbGxhcHNlXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdvdmVydmlld09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LnNob3dPdmVydmlldygpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMDAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgc2VhcmNoQmFyLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2FkZEJ1dHRvbicpO1xuICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBhZGRCdXR0b24ub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICBhZGRCdXR0b24udHJhbnNsYXRlWCA9IC0xMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicm93c2VyVmlldy5oaWRlT3ZlcnZpZXcoKTtcbiAgICAgICAgICAgIGlmICghYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5zaG93Qm9va21hcmtzKCk7XG4gICAgICAgICAgICBzZWFyY2hCYXIudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnYWRkQnV0dG9uJyk7XG4gICAgICAgICAgICBhZGRCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDotMTAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAncmVhbGl0eUNob29zZXJPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVZID0gMC45O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2Jvb2ttYXJrc09wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjAsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfSBcbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnY2FuY2VsQnV0dG9uU2hvd24nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnb3ZlcnZpZXdCdXR0b24nKTtcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIG1lbnVCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgY2FuY2VsQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnY2FuY2VsQnV0dG9uJyk7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdvdmVydmlld0J1dHRvbicpO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IG1lbnVCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdtZW51QnV0dG9uJyk7XG4gICAgICAgICAgICBtZW51QnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBtZW51QnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2NhbmNlbEJ1dHRvbicpO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxheW91dC5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG5cbmV4cG9ydCBmdW5jdGlvbiBwYWdlTG9hZGVkKGFyZ3MpIHtcbiAgICBcbiAgICBwYWdlID0gYXJncy5vYmplY3Q7XG4gICAgcGFnZS5iaW5kaW5nQ29udGV4dCA9IGFwcFZpZXdNb2RlbDtcbiAgICBhcHBWaWV3TW9kZWwuc2V0UmVhZHkoKTtcblxuICAgIC8vIFNldCB0aGUgaWNvbiBmb3IgdGhlIG1lbnUgYnV0dG9uXG4gICAgY29uc3QgbWVudUJ1dHRvbiA9IDxCdXR0b24+IHBhZ2UuZ2V0Vmlld0J5SWQoXCJtZW51QnV0dG9uXCIpO1xuICAgIG1lbnVCdXR0b24udGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhlNWQ0KTtcblxuICAgIC8vIFNldCB0aGUgaWNvbiBmb3IgdGhlIG92ZXJ2aWV3IGJ1dHRvblxuICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gPEJ1dHRvbj4gcGFnZS5nZXRWaWV3QnlJZChcIm92ZXJ2aWV3QnV0dG9uXCIpO1xuICAgIG92ZXJ2aWV3QnV0dG9uLnRleHQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4ZTUzYik7XG4gICAgXG4gICAgLy8gZm9jdXMgb24gdGhlIHRvcG1vc3QgbGF5ZXJcbiAgICBicm93c2VyVmlldy5zZXRGb2N1c3NlZExheWVyKGJyb3dzZXJWaWV3LmxheWVyc1ticm93c2VyVmlldy5sYXllcnMubGVuZ3RoLTFdKTtcblxuICAgIC8vIHdvcmthcm91bmQgKHNlZSBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L05hdGl2ZVNjcmlwdC9pc3N1ZXMvNjU5KVxuICAgIGlmIChwYWdlLmlvcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICBwYWdlLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgfSwgMClcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJQXBwbGljYXRpb25EaWRCZWNvbWVBY3RpdmVOb3RpZmljYXRpb24sICgpID0+IHtcbiAgICAgICAgICAgIHBhZ2UucmVxdWVzdExheW91dCgpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICBcbiAgICBhcHBWaWV3TW9kZWwuYXJnb24uc2Vzc2lvbi5lcnJvckV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKGVycm9yKT0+e1xuICAgICAgICAvLyBhbGVydChlcnJvci5tZXNzYWdlICsgJ1xcbicgKyBlcnJvci5zdGFjayk7XG4gICAgICAgIGlmIChlcnJvci5zdGFjaykgY29uc29sZS5sb2coZXJyb3IubWVzc2FnZSArICdcXG4nICsgZXJyb3Iuc3RhY2spO1xuICAgIH0pXG5cbiAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBnZXRTY3JlZW5PcmllbnRhdGlvbigpO1xuICAgICAgICAgICAgaWYgKG9yaWVudGF0aW9uID09PSA5MCB8fCBvcmllbnRhdGlvbiA9PT0gLTkwIHx8IGFwcFZpZXdNb2RlbC52aWV3ZXJFbmFibGVkKSBcbiAgICAgICAgICAgICAgICBwYWdlLmFjdGlvbkJhckhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgIHBhZ2UuYWN0aW9uQmFySGlkZGVuID0gZmFsc2U7XG4gICAgICAgIH0sIDUwMCk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsYXlvdXRMb2FkZWQoYXJncykge1xuICAgIGxheW91dCA9IGFyZ3Mub2JqZWN0XG4gICAgaWYgKGxheW91dC5pb3MpIHtcbiAgICAgICAgbGF5b3V0Lmlvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGVhZGVyTG9hZGVkKGFyZ3MpIHtcbiAgICBoZWFkZXJWaWV3ID0gYXJncy5vYmplY3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZWFyY2hCYXJMb2FkZWQoYXJncykge1xuICAgIHNlYXJjaEJhciA9IGFyZ3Mub2JqZWN0O1xuXG4gICAgc2VhcmNoQmFyLm9uKFNlYXJjaEJhci5zdWJtaXRFdmVudCwgKCkgPT4ge1xuICAgICAgICBsZXQgdXJsU3RyaW5nID0gc2VhcmNoQmFyLnRleHQ7XG4gICAgICAgIGlmICh1cmxTdHJpbmcuaW5kZXhPZignLy8nKSA9PT0gLTEpIHVybFN0cmluZyA9ICcvLycgKyB1cmxTdHJpbmc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB1cmwgPSBVUkkodXJsU3RyaW5nKTtcbiAgICAgICAgaWYgKHVybC5wcm90b2NvbCgpICE9PSBcImh0dHBcIiAmJiB1cmwucHJvdG9jb2woKSAhPT0gXCJodHRwc1wiKSB7XG4gICAgICAgICAgICB1cmwucHJvdG9jb2woXCJodHRwXCIpO1xuICAgICAgICB9XG4gICAgICAgIHNldFNlYXJjaEJhclRleHQodXJsLnRvU3RyaW5nKCkpO1xuICAgICAgICBhcHBWaWV3TW9kZWwubG9hZFVybCh1cmwudG9TdHJpbmcoKSk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQm9va21hcmtzKCk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlUmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICB9KTtcblxuICAgIGlmIChhcHBsaWNhdGlvbi5pb3MpIHtcbiAgICAgICAgaW9zU2VhcmNoQmFyQ29udHJvbGxlciA9IG5ldyBJT1NTZWFyY2hCYXJDb250cm9sbGVyKHNlYXJjaEJhcik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWFyY2hCYXJUZXh0KHVybDpzdHJpbmcpIHtcbiAgICBpZiAoaW9zU2VhcmNoQmFyQ29udHJvbGxlcikge1xuICAgICAgICBpb3NTZWFyY2hCYXJDb250cm9sbGVyLnNldFRleHQodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzZWFyY2hCYXIudGV4dCA9IHVybDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJsdXJTZWFyY2hCYXIoKSB7XG4gICAgaWYgKHNlYXJjaEJhci5pb3MpIHtcbiAgICAgICAgKHNlYXJjaEJhci5pb3MgYXMgVUlTZWFyY2hCYXIpLnJlc2lnbkZpcnN0UmVzcG9uZGVyKCk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJvd3NlclZpZXdMb2FkZWQoYXJncykge1xuICAgIGJyb3dzZXJWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgXG4gICAgYXBwVmlld01vZGVsLm9uKEFwcFZpZXdNb2RlbC5sb2FkVXJsRXZlbnQsIChkYXRhOkxvYWRVcmxFdmVudERhdGEpPT57XG4gICAgICAgIGJyb3dzZXJWaWV3LmxvYWRVcmwoZGF0YS51cmwpO1xuICAgIH0pXG5cbiAgICAvLyBTZXR1cCB0aGUgZGVidWcgdmlld1xuICAgIGxldCBkZWJ1ZzpIdG1sVmlldyA9IDxIdG1sVmlldz5icm93c2VyVmlldy5wYWdlLmdldFZpZXdCeUlkKFwiZGVidWdcIik7XG4gICAgZGVidWcuaG9yaXpvbnRhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICBkZWJ1Zy52ZXJ0aWNhbEFsaWdubWVudCA9ICdzdHJldGNoJztcbiAgICBkZWJ1Zy5iYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoMTUwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICBkZWJ1Zy52aXNpYmlsaXR5ID0gXCJjb2xsYXBzZWRcIjtcbiAgICBkZWJ1Zy5pc1VzZXJJbnRlcmFjdGlvbkVuYWJsZWQgPSBmYWxzZTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYm9va21hcmtzVmlld0xvYWRlZChhcmdzKSB7XG4gICAgYm9va21hcmtzVmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVYID0gMC45O1xuICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVZID0gMC45O1xuICAgIGJvb2ttYXJrc1ZpZXcub3BhY2l0eSA9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFsaXR5Q2hvb3NlckxvYWRlZChhcmdzKSB7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWCA9IDAuOTtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVZID0gMC45O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvdWNoT3ZlcmxheUxvYWRlZChhcmdzKSB7XG4gICAgdG91Y2hPdmVybGF5VmlldyA9IGFyZ3Mub2JqZWN0O1xufVxuXG4vLyBpbml0aWFsaXplIHNvbWUgcHJvcGVydGllcyBvZiB0aGUgbWVudSBzbyB0aGF0IGFuaW1hdGlvbnMgd2lsbCByZW5kZXIgY29ycmVjdGx5XG5leHBvcnQgZnVuY3Rpb24gbWVudUxvYWRlZChhcmdzKSB7XG4gICAgbWVudVZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICBtZW51Vmlldy5vcmlnaW5YID0gMTtcbiAgICBtZW51Vmlldy5vcmlnaW5ZID0gMDtcbiAgICBtZW51Vmlldy5zY2FsZVggPSAwO1xuICAgIG1lbnVWaWV3LnNjYWxlWSA9IDA7XG4gICAgbWVudVZpZXcub3BhY2l0eSA9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNlYXJjaEJhclRhcChhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25DYW5jZWwoYXJncykge1xuICAgIGlmICghIWFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKSBhcHBWaWV3TW9kZWwuaGlkZUJvb2ttYXJrcygpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlUmVhbGl0eUNob29zZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgIGJsdXJTZWFyY2hCYXIoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uQWRkQ2hhbm5lbChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcuYWRkTGF5ZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uUmVsb2FkKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcgJiYgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpO1xuICAgIC8vIGlmIChicm93c2VyVmlldy5mb2N1c3NlZExheWVyID09PSBicm93c2VyVmlldy5yZWFsaXR5TGF5ZXIpIHtcbiAgICAvLyAgICAgYXBwVmlld01vZGVsLmFyZ29uLnJlYWxpdHkucmVxdWVzdChhcHBWaWV3TW9kZWwuYXJnb24ucmVhbGl0eS5jdXJyZW50IHx8IFJlYWxpdHlWaWV3ZXIuTElWRSk7XG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkZhdm9yaXRlVG9nZ2xlKGFyZ3MpIHtcbiAgICBjb25zdCB1cmwgPSBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaTtcbiAgICBjb25zdCBib29rbWFya0l0ZW0gPSBib29rbWFya3MuZmF2b3JpdGVNYXAuZ2V0KHVybCk7XG4gICAgaWYgKCFib29rbWFya0l0ZW0pIHtcbiAgICAgICAgYm9va21hcmtzLmZhdm9yaXRlTGlzdC5wdXNoKG5ldyBib29rbWFya3MuQm9va21hcmtJdGVtKHtcbiAgICAgICAgICAgIHVyaTogdXJsLFxuICAgICAgICAgICAgdGl0bGU6IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudGl0bGVcbiAgICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpID0gYm9va21hcmtzLmZhdm9yaXRlTGlzdC5pbmRleE9mKGJvb2ttYXJrSXRlbSk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Quc3BsaWNlKGksMSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb25JbnRlcmFjdGlvblRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZUludGVyYWN0aW9uTW9kZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25PdmVydmlldyhhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZU92ZXJ2aWV3KCk7XG4gICAgYXBwVmlld01vZGVsLnNldERlYnVnRW5hYmxlZChmYWxzZSk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk1lbnUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNlbGVjdFJlYWxpdHkoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZXR0aW5ncyhhcmdzKSB7XG4gICAgLy9jb2RlIHRvIG9wZW4gdGhlIHNldHRpbmdzIHZpZXcgZ29lcyBoZXJlXG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblZpZXdlclRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZVZpZXdlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25EZWJ1Z1RvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZURlYnVnKCk7XG59XG5cbmNsYXNzIElPU1NlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSB1aVNlYXJjaEJhcjpVSVNlYXJjaEJhcjtcbiAgICBwcml2YXRlIHRleHRGaWVsZDpVSVRleHRGaWVsZDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBzZWFyY2hCYXI6U2VhcmNoQmFyKSB7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIgPSBzZWFyY2hCYXIuaW9zO1xuICAgICAgICB0aGlzLnRleHRGaWVsZCA9IHRoaXMudWlTZWFyY2hCYXIudmFsdWVGb3JLZXkoXCJzZWFyY2hGaWVsZFwiKTtcblxuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLmtleWJvYXJkVHlwZSA9IFVJS2V5Ym9hcmRUeXBlLlVSTDtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5hdXRvY2FwaXRhbGl6YXRpb25UeXBlID0gVUlUZXh0QXV0b2NhcGl0YWxpemF0aW9uVHlwZS5Ob25lO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnNlYXJjaEJhclN0eWxlID0gVUlTZWFyY2hCYXJTdHlsZS5NaW5pbWFsO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnJldHVybktleVR5cGUgPSBVSVJldHVybktleVR5cGUuR287XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuc2V0SW1hZ2VGb3JTZWFyY2hCYXJJY29uU3RhdGUoVUlJbWFnZS5uZXcoKSwgVUlTZWFyY2hCYXJJY29uLlNlYXJjaCwgVUlDb250cm9sU3RhdGUuTm9ybWFsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy50ZXh0RmllbGQubGVmdFZpZXdNb2RlID0gVUlUZXh0RmllbGRWaWV3TW9kZS5OZXZlcjtcblxuICAgICAgICBjb25zdCB0ZXh0RmllbGRFZGl0SGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlvcy5nZXR0ZXIoVUlSZXNwb25kZXIsIHRoaXMudWlTZWFyY2hCYXIuaXNGaXJzdFJlc3BvbmRlcikpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciA9PT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudWlTZWFyY2hCYXIudGV4dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dChcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLnNlbGVjdGVkVGV4dFJhbmdlID0gdGhpcy50ZXh0RmllbGQudGV4dFJhbmdlRnJvbVBvc2l0aW9uVG9Qb3NpdGlvbih0aGlzLnRleHRGaWVsZC5iZWdpbm5pbmdPZkRvY3VtZW50LCB0aGlzLnRleHRGaWVsZC5lbmRPZkRvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwMClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsYXlvdXQub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgbGF5b3V0Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKSBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dChhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSk7XG4gICAgICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSVRleHRGaWVsZFRleHREaWRCZWdpbkVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZEVuZEVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldFBsYWNlaG9sZGVyVGV4dCh0ZXh0OnN0cmluZykge1xuICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXM6IE5TTXV0YWJsZURpY3Rpb25hcnk8c3RyaW5nLGFueT4gPSBOU011dGFibGVEaWN0aW9uYXJ5Lm5ldzxzdHJpbmcsYW55PigpLmluaXQoKTtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuc2V0T2JqZWN0Rm9yS2V5KHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvcixVSUNvbG9yLmJsYWNrQ29sb3IpLCBOU0ZvcmVncm91bmRDb2xvckF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQuYXR0cmlidXRlZFBsYWNlaG9sZGVyID0gTlNBdHRyaWJ1dGVkU3RyaW5nLmFsbG9jKCkuaW5pdFdpdGhTdHJpbmdBdHRyaWJ1dGVzKHRleHQsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQucGxhY2Vob2xkZXIgPSBzZWFyY2hCYXIuaGludDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzZXRUZXh0KHVybCkge1xuICAgICAgICBpZiAoIXV0aWxzLmlvcy5nZXR0ZXIoVUlSZXNwb25kZXIsIHRoaXMudWlTZWFyY2hCYXIuaXNGaXJzdFJlc3BvbmRlcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KHVybCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=