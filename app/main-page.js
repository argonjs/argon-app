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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQThEO0FBRTlELCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUVsRCwyQkFBWSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLEdBQXNCO0lBQ3JELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwQyxnQkFBZ0IsQ0FBQywyQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLDRGQUE0RjtRQUM1Riw2Q0FBNkM7UUFDN0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwRCxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuRCxDQUFDO0lBRUwsQ0FBQztJQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFL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QVcsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsd0NBQXdDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUM1RyxDQUFDO0lBRU8sbURBQWtCLEdBQTFCLFVBQTJCLElBQVc7UUFDbEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNQLElBQUksVUFBVSxHQUFvQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMvRixVQUFVLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsOEJBQThCLENBQUMsQ0FBQztZQUN6RyxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ2hELENBQUM7SUFDTCxDQUFDO0lBRU0sd0NBQU8sR0FBZCxVQUFlLEdBQUc7UUFDZCxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxDQUFDO0lBQ0wsQ0FBQztJQUNMLDZCQUFDO0FBQUQsQ0FBQyxBQWpFRCxJQWlFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVSSSBmcm9tICd1cmlqcyc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQge1NlYXJjaEJhcn0gZnJvbSAndWkvc2VhcmNoLWJhcic7XG5pbXBvcnQge1BhZ2V9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHtCdXR0b259IGZyb20gJ3VpL2J1dHRvbic7XG5pbXBvcnQge1ZpZXd9IGZyb20gJ3VpL2NvcmUvdmlldyc7XG5pbXBvcnQge0h0bWxWaWV3fSBmcm9tICd1aS9odG1sLXZpZXcnXG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7QW5pbWF0aW9uQ3VydmV9IGZyb20gJ3VpL2VudW1zJ1xuaW1wb3J0IHtHZXN0dXJlVHlwZXN9IGZyb20gJ3VpL2dlc3R1cmVzJ1xuXG5pbXBvcnQge0Jyb3dzZXJWaWV3fSBmcm9tICcuL2NvbXBvbmVudHMvYnJvd3Nlci12aWV3JztcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL2Jvb2ttYXJrcyc7XG5pbXBvcnQge2FwcFZpZXdNb2RlbCwgQXBwVmlld01vZGVsLCBMb2FkVXJsRXZlbnREYXRhfSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL0FwcFZpZXdNb2RlbCc7XG5pbXBvcnQge2dldFNjcmVlbk9yaWVudGF0aW9ufSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL3V0aWwnO1xuXG4vLyBpbXBvcnQge1JlYWxpdHlWaWV3ZXJ9IGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuXG4vL2ltcG9ydCAqIGFzIG9yaWVudGF0aW9uTW9kdWxlIGZyb20gJ25hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb24nO1xudmFyIG9yaWVudGF0aW9uTW9kdWxlID0gcmVxdWlyZShcIm5hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb25cIik7XG5cbmV4cG9ydCBsZXQgcGFnZTpQYWdlO1xuZXhwb3J0IGxldCBsYXlvdXQ6VmlldztcbmV4cG9ydCBsZXQgdG91Y2hPdmVybGF5VmlldzpWaWV3O1xuZXhwb3J0IGxldCBoZWFkZXJWaWV3OlZpZXc7XG5leHBvcnQgbGV0IG1lbnVWaWV3OlZpZXc7XG5leHBvcnQgbGV0IGJyb3dzZXJWaWV3OkJyb3dzZXJWaWV3O1xuZXhwb3J0IGxldCBib29rbWFya3NWaWV3OlZpZXc7XG5leHBvcnQgbGV0IHJlYWxpdHlDaG9vc2VyVmlldzpWaWV3O1xuXG5sZXQgc2VhcmNoQmFyOlNlYXJjaEJhcjtcbmxldCBpb3NTZWFyY2hCYXJDb250cm9sbGVyOklPU1NlYXJjaEJhckNvbnRyb2xsZXI7XG5cbmFwcFZpZXdNb2RlbC5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZ0OlByb3BlcnR5Q2hhbmdlRGF0YSk9PntcbiAgICBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2N1cnJlbnRVcmknKSB7XG4gICAgICAgIHNldFNlYXJjaEJhclRleHQoYXBwVmlld01vZGVsLmN1cnJlbnRVcmkpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAndmlld2VyRW5hYmxlZCcpIHtcbiAgICAgICAgLy8gY29uc3QgdnVmb3JpYURlbGVnYXRlID0gYXBwVmlld01vZGVsLm1hbmFnZXIuY29udGFpbmVyLmdldChBcmdvbi5WdWZvcmlhU2VydmljZURlbGVnYXRlKTtcbiAgICAgICAgLy8gdnVmb3JpYURlbGVnYXRlLnZpZXdlckVuYWJsZWQgPSBldnQudmFsdWU7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImxhbmRzY2FwZVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcInBvcnRyYWl0XCIpO1xuICAgICAgICAgICAgb3JpZW50YXRpb25Nb2R1bGUuc2V0Q3VycmVudE9yaWVudGF0aW9uKFwiYWxsXCIpO1xuICAgICAgICB9XG5cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ21lbnVPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgICAgICBtZW51Vmlldy52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAxLFxuICAgICAgICAgICAgICAgICAgICB5OiAxLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vbihHZXN0dXJlVHlwZXMudG91Y2gsKCk9PntcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lbnVWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VcIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ292ZXJ2aWV3T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYnJvd3NlclZpZXcuc2hvd092ZXJ2aWV3KCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUJvb2ttYXJrcygpO1xuICAgICAgICAgICAgc2VhcmNoQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6LTEwMCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBzZWFyY2hCYXIudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnYWRkQnV0dG9uJyk7XG4gICAgICAgICAgICBhZGRCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi50cmFuc2xhdGVYID0gLTEwO1xuICAgICAgICAgICAgYWRkQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCx5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LmhpZGVPdmVydmlldygpO1xuICAgICAgICAgICAgaWYgKCFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgc2VhcmNoQmFyLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6MCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBhZGRCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdhZGRCdXR0b24nKTtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMCwgeTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBhZGRCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdyZWFsaXR5Q2hvb3Nlck9wZW4nKSB7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjEsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVYID0gMC45O1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAnYm9va21hcmtzT3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eToxLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBib29rbWFya3NWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVYID0gMC45O1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcuc2NhbGVZID0gMC45O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9IFxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdjYW5jZWxCdXR0b25TaG93bicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdvdmVydmlld0J1dHRvbicpO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgbWVudUJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ21lbnVCdXR0b24nKTtcbiAgICAgICAgICAgIG1lbnVCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgbWVudUJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdjYW5jZWxCdXR0b24nKTtcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6MVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ292ZXJ2aWV3QnV0dG9uJyk7XG4gICAgICAgICAgICBvdmVydmlld0J1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgb3ZlcnZpZXdCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgbWVudUJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ21lbnVCdXR0b24nKTtcbiAgICAgICAgICAgIG1lbnVCdXR0b24udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIG1lbnVCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY29uc3QgY2FuY2VsQnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnY2FuY2VsQnV0dG9uJyk7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTowXG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGF5b3V0Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICB9XG4gICAgfVxufSlcblxuZXhwb3J0IGZ1bmN0aW9uIHBhZ2VMb2FkZWQoYXJncykge1xuICAgIFxuICAgIHBhZ2UgPSBhcmdzLm9iamVjdDtcbiAgICBwYWdlLmJpbmRpbmdDb250ZXh0ID0gYXBwVmlld01vZGVsO1xuICAgIGFwcFZpZXdNb2RlbC5zZXRSZWFkeSgpO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgbWVudSBidXR0b25cbiAgICBjb25zdCBtZW51QnV0dG9uID0gPEJ1dHRvbj4gcGFnZS5nZXRWaWV3QnlJZChcIm1lbnVCdXR0b25cIik7XG4gICAgbWVudUJ1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1ZDQpO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgb3ZlcnZpZXcgYnV0dG9uXG4gICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwib3ZlcnZpZXdCdXR0b25cIik7XG4gICAgb3ZlcnZpZXdCdXR0b24udGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhlNTNiKTtcbiAgICBcbiAgICAvLyBmb2N1cyBvbiB0aGUgdG9wbW9zdCBsYXllclxuICAgIGJyb3dzZXJWaWV3LnNldEZvY3Vzc2VkTGF5ZXIoYnJvd3NlclZpZXcubGF5ZXJzW2Jyb3dzZXJWaWV3LmxheWVycy5sZW5ndGgtMV0pO1xuXG4gICAgLy8gd29ya2Fyb3VuZCAoc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9OYXRpdmVTY3JpcHQvTmF0aXZlU2NyaXB0L2lzc3Vlcy82NTkpXG4gICAgaWYgKHBhZ2UuaW9zKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHBhZ2UucmVxdWVzdExheW91dCgpO1xuICAgICAgICB9LCAwKVxuICAgICAgICBhcHBsaWNhdGlvbi5pb3MuYWRkTm90aWZpY2F0aW9uT2JzZXJ2ZXIoVUlBcHBsaWNhdGlvbkRpZEJlY29tZUFjdGl2ZU5vdGlmaWNhdGlvbiwgKCkgPT4ge1xuICAgICAgICAgICAgcGFnZS5yZXF1ZXN0TGF5b3V0KCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIFxuICAgIGFwcFZpZXdNb2RlbC5hcmdvbi5zZXNzaW9uLmVycm9yRXZlbnQuYWRkRXZlbnRMaXN0ZW5lcigoZXJyb3IpPT57XG4gICAgICAgIC8vIGFsZXJ0KGVycm9yLm1lc3NhZ2UgKyAnXFxuJyArIGVycm9yLnN0YWNrKTtcbiAgICAgICAgaWYgKGVycm9yLnN0YWNrKSBjb25zb2xlLmxvZyhlcnJvci5tZXNzYWdlICsgJ1xcbicgKyBlcnJvci5zdGFjayk7XG4gICAgfSlcblxuICAgIGFwcGxpY2F0aW9uLm9uKGFwcGxpY2F0aW9uLm9yaWVudGF0aW9uQ2hhbmdlZEV2ZW50LCAoKT0+e1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IGdldFNjcmVlbk9yaWVudGF0aW9uKCk7XG4gICAgICAgICAgICBpZiAob3JpZW50YXRpb24gPT09IDkwIHx8IG9yaWVudGF0aW9uID09PSAtOTAgfHwgYXBwVmlld01vZGVsLnZpZXdlckVuYWJsZWQpIFxuICAgICAgICAgICAgICAgIHBhZ2UuYWN0aW9uQmFySGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgIGVsc2UgXG4gICAgICAgICAgICAgICAgcGFnZS5hY3Rpb25CYXJIaWRkZW4gPSBmYWxzZTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxheW91dExvYWRlZChhcmdzKSB7XG4gICAgbGF5b3V0ID0gYXJncy5vYmplY3RcbiAgICBpZiAobGF5b3V0Lmlvcykge1xuICAgICAgICBsYXlvdXQuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoZWFkZXJMb2FkZWQoYXJncykge1xuICAgIGhlYWRlclZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEJhckxvYWRlZChhcmdzKSB7XG4gICAgc2VhcmNoQmFyID0gYXJncy5vYmplY3Q7XG5cbiAgICBzZWFyY2hCYXIub24oU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LCAoKSA9PiB7XG4gICAgICAgIGxldCB1cmxTdHJpbmcgPSBzZWFyY2hCYXIudGV4dDtcbiAgICAgICAgaWYgKHVybFN0cmluZy5pbmRleE9mKCcvLycpID09PSAtMSkgdXJsU3RyaW5nID0gJy8vJyArIHVybFN0cmluZztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IFVSSSh1cmxTdHJpbmcpO1xuICAgICAgICBpZiAodXJsLnByb3RvY29sKCkgIT09IFwiaHR0cFwiICYmIHVybC5wcm90b2NvbCgpICE9PSBcImh0dHBzXCIpIHtcbiAgICAgICAgICAgIHVybC5wcm90b2NvbChcImh0dHBcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2V0U2VhcmNoQmFyVGV4dCh1cmwudG9TdHJpbmcoKSk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5sb2FkVXJsKHVybC50b1N0cmluZygpKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgIH0pO1xuXG4gICAgaWYgKGFwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICBpb3NTZWFyY2hCYXJDb250cm9sbGVyID0gbmV3IElPU1NlYXJjaEJhckNvbnRyb2xsZXIoc2VhcmNoQmFyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlYXJjaEJhclRleHQodXJsOnN0cmluZykge1xuICAgIGlmIChpb3NTZWFyY2hCYXJDb250cm9sbGVyKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIuc2V0VGV4dCh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlYXJjaEJhci50ZXh0ID0gdXJsO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYmx1clNlYXJjaEJhcigpIHtcbiAgICBpZiAoc2VhcmNoQmFyLmlvcykge1xuICAgICAgICAoc2VhcmNoQmFyLmlvcyBhcyBVSVNlYXJjaEJhcikucmVzaWduRmlyc3RSZXNwb25kZXIoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicm93c2VyVmlld0xvYWRlZChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICBcbiAgICBhcHBWaWV3TW9kZWwub24oQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCwgKGRhdGE6TG9hZFVybEV2ZW50RGF0YSk9PntcbiAgICAgICAgYnJvd3NlclZpZXcubG9hZFVybChkYXRhLnVybCk7XG4gICAgfSlcblxuICAgIC8vIFNldHVwIHRoZSBkZWJ1ZyB2aWV3XG4gICAgbGV0IGRlYnVnOkh0bWxWaWV3ID0gPEh0bWxWaWV3PmJyb3dzZXJWaWV3LnBhZ2UuZ2V0Vmlld0J5SWQoXCJkZWJ1Z1wiKTtcbiAgICBkZWJ1Zy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigxNTAsIDI1NSwgMjU1LCAyNTUpO1xuICAgIGRlYnVnLnZpc2liaWxpdHkgPSBcImNvbGxhcHNlZFwiO1xuICAgIGRlYnVnLmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IGZhbHNlO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBib29rbWFya3NWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBib29rbWFya3NWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVggPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWxpdHlDaG9vc2VyTG9hZGVkKGFyZ3MpIHtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVYID0gMC45O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG91Y2hPdmVybGF5TG9hZGVkKGFyZ3MpIHtcbiAgICB0b3VjaE92ZXJsYXlWaWV3ID0gYXJncy5vYmplY3Q7XG59XG5cbi8vIGluaXRpYWxpemUgc29tZSBwcm9wZXJ0aWVzIG9mIHRoZSBtZW51IHNvIHRoYXQgYW5pbWF0aW9ucyB3aWxsIHJlbmRlciBjb3JyZWN0bHlcbmV4cG9ydCBmdW5jdGlvbiBtZW51TG9hZGVkKGFyZ3MpIHtcbiAgICBtZW51VmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIG1lbnVWaWV3Lm9yaWdpblggPSAxO1xuICAgIG1lbnVWaWV3Lm9yaWdpblkgPSAwO1xuICAgIG1lbnVWaWV3LnNjYWxlWCA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVZID0gMDtcbiAgICBtZW51Vmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2VhcmNoQmFyVGFwKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkNhbmNlbChhcmdzKSB7XG4gICAgaWYgKCEhYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5oaWRlQm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgYmx1clNlYXJjaEJhcigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25BZGRDaGFubmVsKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldy5hZGRMYXllcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25SZWxvYWQoYXJncykge1xuICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldyAmJiBicm93c2VyVmlldy5mb2N1c3NlZExheWVyLndlYlZpZXcucmVsb2FkKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkZhdm9yaXRlVG9nZ2xlKGFyZ3MpIHtcbiAgICBjb25zdCB1cmwgPSBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaTtcbiAgICBjb25zdCBib29rbWFya0l0ZW0gPSBib29rbWFya3MuZmF2b3JpdGVNYXAuZ2V0KHVybCk7XG4gICAgaWYgKCFib29rbWFya0l0ZW0pIHtcbiAgICAgICAgYm9va21hcmtzLmZhdm9yaXRlTGlzdC5wdXNoKG5ldyBib29rbWFya3MuQm9va21hcmtJdGVtKHtcbiAgICAgICAgICAgIHVyaTogdXJsLFxuICAgICAgICAgICAgdGl0bGU6IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudGl0bGVcbiAgICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpID0gYm9va21hcmtzLmZhdm9yaXRlTGlzdC5pbmRleE9mKGJvb2ttYXJrSXRlbSk7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3Quc3BsaWNlKGksMSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb25JbnRlcmFjdGlvblRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZUludGVyYWN0aW9uTW9kZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25PdmVydmlldyhhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZU92ZXJ2aWV3KCk7XG4gICAgYXBwVmlld01vZGVsLnNldERlYnVnRW5hYmxlZChmYWxzZSk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbk1lbnUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblNlbGVjdFJlYWxpdHkoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZXR0aW5ncyhhcmdzKSB7XG4gICAgLy9jb2RlIHRvIG9wZW4gdGhlIHNldHRpbmdzIHZpZXcgZ29lcyBoZXJlXG4gICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvblZpZXdlclRvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZVZpZXdlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25EZWJ1Z1RvZ2dsZShhcmdzKSB7XG4gICAgYXBwVmlld01vZGVsLnRvZ2dsZURlYnVnKCk7XG59XG5cbmNsYXNzIElPU1NlYXJjaEJhckNvbnRyb2xsZXIge1xuXG4gICAgcHJpdmF0ZSB1aVNlYXJjaEJhcjpVSVNlYXJjaEJhcjtcbiAgICBwcml2YXRlIHRleHRGaWVsZDpVSVRleHRGaWVsZDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBzZWFyY2hCYXI6U2VhcmNoQmFyKSB7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIgPSBzZWFyY2hCYXIuaW9zO1xuICAgICAgICB0aGlzLnRleHRGaWVsZCA9IHRoaXMudWlTZWFyY2hCYXIudmFsdWVGb3JLZXkoXCJzZWFyY2hGaWVsZFwiKTtcblxuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLmtleWJvYXJkVHlwZSA9IFVJS2V5Ym9hcmRUeXBlLlVSTDtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5hdXRvY2FwaXRhbGl6YXRpb25UeXBlID0gVUlUZXh0QXV0b2NhcGl0YWxpemF0aW9uVHlwZS5Ob25lO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnNlYXJjaEJhclN0eWxlID0gVUlTZWFyY2hCYXJTdHlsZS5NaW5pbWFsO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnJldHVybktleVR5cGUgPSBVSVJldHVybktleVR5cGUuR287XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuc2V0SW1hZ2VGb3JTZWFyY2hCYXJJY29uU3RhdGUoVUlJbWFnZS5uZXcoKSwgVUlTZWFyY2hCYXJJY29uLlNlYXJjaCwgVUlDb250cm9sU3RhdGUuTm9ybWFsKVxuICAgICAgICBcbiAgICAgICAgdGhpcy50ZXh0RmllbGQubGVmdFZpZXdNb2RlID0gVUlUZXh0RmllbGRWaWV3TW9kZS5OZXZlcjtcblxuICAgICAgICBjb25zdCB0ZXh0RmllbGRFZGl0SGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlvcy5nZXR0ZXIoVUlSZXNwb25kZXIsIHRoaXMudWlTZWFyY2hCYXIuaXNGaXJzdFJlc3BvbmRlcikpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllciA9PT0gYnJvd3NlclZpZXcucmVhbGl0eUxheWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5zaG93UmVhbGl0eUNob29zZXIoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudWlTZWFyY2hCYXIudGV4dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dChcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLnNlbGVjdGVkVGV4dFJhbmdlID0gdGhpcy50ZXh0RmllbGQudGV4dFJhbmdlRnJvbVBvc2l0aW9uVG9Qb3NpdGlvbih0aGlzLnRleHRGaWVsZC5iZWdpbm5pbmdPZkRvY3VtZW50LCB0aGlzLnRleHRGaWVsZC5lbmRPZkRvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwMClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsYXlvdXQub24oR2VzdHVyZVR5cGVzLnRvdWNoLCgpPT57XG4gICAgICAgICAgICAgICAgICAgIGJsdXJTZWFyY2hCYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgbGF5b3V0Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKSBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dChhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSk7XG4gICAgICAgICAgICAgICAgdGhpcy51aVNlYXJjaEJhci50ZXh0ID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSVRleHRGaWVsZFRleHREaWRCZWdpbkVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJVGV4dEZpZWxkVGV4dERpZEVuZEVkaXRpbmdOb3RpZmljYXRpb24sIHRleHRGaWVsZEVkaXRIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldFBsYWNlaG9sZGVyVGV4dCh0ZXh0OnN0cmluZykge1xuICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXM6IE5TTXV0YWJsZURpY3Rpb25hcnk8c3RyaW5nLGFueT4gPSBOU011dGFibGVEaWN0aW9uYXJ5Lm5ldzxzdHJpbmcsYW55PigpLmluaXQoKTtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuc2V0T2JqZWN0Rm9yS2V5KHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvcixVSUNvbG9yLmJsYWNrQ29sb3IpLCBOU0ZvcmVncm91bmRDb2xvckF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQuYXR0cmlidXRlZFBsYWNlaG9sZGVyID0gTlNBdHRyaWJ1dGVkU3RyaW5nLmFsbG9jKCkuaW5pdFdpdGhTdHJpbmdBdHRyaWJ1dGVzKHRleHQsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50ZXh0RmllbGQucGxhY2Vob2xkZXIgPSBzZWFyY2hCYXIuaGludDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzZXRUZXh0KHVybCkge1xuICAgICAgICBpZiAoIXV0aWxzLmlvcy5nZXR0ZXIoVUlSZXNwb25kZXIsIHRoaXMudWlTZWFyY2hCYXIuaXNGaXJzdFJlc3BvbmRlcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXJUZXh0KHVybCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=