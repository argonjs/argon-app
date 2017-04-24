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
    if (util_1.screenOrientation === 90 || util_1.screenOrientation === -90 || AppViewModel_1.appViewModel.viewerEnabled)
        exports.page.actionBarHidden = true;
    else
        exports.page.actionBarHidden = false;
};
function pageLoaded(args) {
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
}
exports.pageLoaded = pageLoaded;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTZCO0FBQzdCLHlDQUEyQztBQUMzQyxtQ0FBcUM7QUFDckMsNENBQXdDO0FBS3hDLCtCQUE0QjtBQUU1QixrQ0FBdUM7QUFDdkMsd0NBQXdDO0FBR3hDLHlEQUEyRDtBQUMzRCxpRUFBOEY7QUFDOUYsaURBQTJEO0FBRTNELCtDQUErQztBQUUvQyx1RUFBdUU7QUFDdkUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQVduRSxJQUFJLFNBQW1CLENBQUM7QUFDeEIsSUFBSSxzQkFBNkMsQ0FBQztBQUVsRCwyQkFBWSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLEdBQXNCO0lBQ3JELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwQyxnQkFBZ0IsQ0FBQywyQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQVksQ0FBQyxVQUFVLENBQUM7WUFBQywyQkFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQy9ELENBQUM7SUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVDLDRGQUE0RjtRQUM1Riw2Q0FBNkM7UUFDN0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwRCxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENB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QUFxQixHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ2hELENBQUM7SUFDTCxDQUFDO0lBRU0sd0NBQU8sR0FBZCxVQUFlLEdBQUc7UUFDZCxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxDQUFDO0lBQ0wsQ0FBQztJQUNMLDZCQUFDO0FBQUQsQ0FBQyxBQWpFRCxJQWlFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVSSSBmcm9tICd1cmlqcyc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICd1dGlscy91dGlscyc7XG5pbXBvcnQge1NlYXJjaEJhcn0gZnJvbSAndWkvc2VhcmNoLWJhcic7XG5pbXBvcnQge1BhZ2V9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHtCdXR0b259IGZyb20gJ3VpL2J1dHRvbic7XG5pbXBvcnQge1ZpZXd9IGZyb20gJ3VpL2NvcmUvdmlldyc7XG5pbXBvcnQge0h0bWxWaWV3fSBmcm9tICd1aS9odG1sLXZpZXcnXG5pbXBvcnQge0NvbG9yfSBmcm9tICdjb2xvcic7XG5pbXBvcnQge1Byb3BlcnR5Q2hhbmdlRGF0YX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7QW5pbWF0aW9uQ3VydmV9IGZyb20gJ3VpL2VudW1zJ1xuaW1wb3J0IHtHZXN0dXJlVHlwZXN9IGZyb20gJ3VpL2dlc3R1cmVzJ1xuXG5pbXBvcnQge0Jyb3dzZXJWaWV3fSBmcm9tICcuL2NvbXBvbmVudHMvYnJvd3Nlci12aWV3JztcbmltcG9ydCAqIGFzIGJvb2ttYXJrcyBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL2Jvb2ttYXJrcyc7XG5pbXBvcnQge2FwcFZpZXdNb2RlbCwgQXBwVmlld01vZGVsLCBMb2FkVXJsRXZlbnREYXRhfSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL0FwcFZpZXdNb2RlbCc7XG5pbXBvcnQge3NjcmVlbk9yaWVudGF0aW9ufSBmcm9tICcuL2NvbXBvbmVudHMvY29tbW9uL3V0aWwnO1xuXG4vLyBpbXBvcnQge1JlYWxpdHlWaWV3ZXJ9IGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuXG4vL2ltcG9ydCAqIGFzIG9yaWVudGF0aW9uTW9kdWxlIGZyb20gJ25hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb24nO1xudmFyIG9yaWVudGF0aW9uTW9kdWxlID0gcmVxdWlyZShcIm5hdGl2ZXNjcmlwdC1zY3JlZW4tb3JpZW50YXRpb25cIik7XG5cbmV4cG9ydCBsZXQgcGFnZTpQYWdlO1xuZXhwb3J0IGxldCBsYXlvdXQ6VmlldztcbmV4cG9ydCBsZXQgdG91Y2hPdmVybGF5VmlldzpWaWV3O1xuZXhwb3J0IGxldCBoZWFkZXJWaWV3OlZpZXc7XG5leHBvcnQgbGV0IG1lbnVWaWV3OlZpZXc7XG5leHBvcnQgbGV0IGJyb3dzZXJWaWV3OkJyb3dzZXJWaWV3O1xuZXhwb3J0IGxldCBib29rbWFya3NWaWV3OlZpZXc7XG5leHBvcnQgbGV0IHJlYWxpdHlDaG9vc2VyVmlldzpWaWV3O1xuXG5sZXQgc2VhcmNoQmFyOlNlYXJjaEJhcjtcbmxldCBpb3NTZWFyY2hCYXJDb250cm9sbGVyOklPU1NlYXJjaEJhckNvbnRyb2xsZXI7XG5cbmFwcFZpZXdNb2RlbC5vbigncHJvcGVydHlDaGFuZ2UnLCAoZXZ0OlByb3BlcnR5Q2hhbmdlRGF0YSk9PntcbiAgICBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2N1cnJlbnRVcmknKSB7XG4gICAgICAgIHNldFNlYXJjaEJhclRleHQoYXBwVmlld01vZGVsLmN1cnJlbnRVcmkpO1xuICAgICAgICBpZiAoIWFwcFZpZXdNb2RlbC5jdXJyZW50VXJpKSBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldnQucHJvcGVydHlOYW1lID09PSAndmlld2VyRW5hYmxlZCcpIHtcbiAgICAgICAgLy8gY29uc3QgdnVmb3JpYURlbGVnYXRlID0gYXBwVmlld01vZGVsLm1hbmFnZXIuY29udGFpbmVyLmdldChBcmdvbi5WdWZvcmlhU2VydmljZURlbGVnYXRlKTtcbiAgICAgICAgLy8gdnVmb3JpYURlbGVnYXRlLnZpZXdlckVuYWJsZWQgPSBldnQudmFsdWU7XG4gICAgICAgIGlmIChldnQudmFsdWUpIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcImxhbmRzY2FwZVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTW9kdWxlLnNldEN1cnJlbnRPcmllbnRhdGlvbihcInBvcnRyYWl0XCIpO1xuICAgICAgICAgICAgb3JpZW50YXRpb25Nb2R1bGUuc2V0Q3VycmVudE9yaWVudGF0aW9uKFwiYWxsXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNoZWNrQWN0aW9uQmFyKCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntjaGVja0FjdGlvbkJhcigpfSwgNTAwKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ21lbnVPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU92ZXJ2aWV3KCk7XG4gICAgICAgICAgICBtZW51Vmlldy52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XG4gICAgICAgICAgICBtZW51Vmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OiAxLFxuICAgICAgICAgICAgICAgICAgICB5OiAxLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vbihHZXN0dXJlVHlwZXMudG91Y2gsKCk9PntcbiAgICAgICAgICAgICAgICB0b3VjaE92ZXJsYXlWaWV3Lm9mZihHZXN0dXJlVHlwZXMudG91Y2gpO1xuICAgICAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVNZW51KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lbnVWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWVudVZpZXcudmlzaWJpbGl0eSA9IFwiY29sbGFwc2VcIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG91Y2hPdmVybGF5Vmlldy5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgIHRvdWNoT3ZlcmxheVZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ292ZXJ2aWV3T3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgICAgIHNlYXJjaEJhci5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4Oi0xMDAsIHk6MH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgc2VhcmNoQmFyLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2FkZEJ1dHRvbicpO1xuICAgICAgICAgICAgYWRkQnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBhZGRCdXR0b24ub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICBhZGRCdXR0b24udHJhbnNsYXRlWCA9IC0xMDtcbiAgICAgICAgICAgIGFkZEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OjAseTowfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIWFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpKSBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICAgICAgc2VhcmNoQmFyLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBzZWFyY2hCYXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDowLCB5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2FkZEJ1dHRvbicpO1xuICAgICAgICAgICAgYWRkQnV0dG9uLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6LTEwLCB5OjB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGFkZEJ1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ3JlYWxpdHlDaG9vc2VyT3BlbicpIHtcbiAgICAgICAgaWYgKGV2dC52YWx1ZSkge1xuICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICByZWFsaXR5Q2hvb3NlclZpZXcuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoxLFxuICAgICAgICAgICAgICAgICAgICB5OjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6MSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTUwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5lYXNlSW5PdXRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0NhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjAsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KS50aGVuKCgpPT57XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVggPSAwLjk7XG4gICAgICAgICAgICAgICAgcmVhbGl0eUNob29zZXJWaWV3LnNjYWxlWSA9IDAuOTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2dC5wcm9wZXJ0eU5hbWUgPT09ICdib29rbWFya3NPcGVuJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBib29rbWFya3NWaWV3LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIHg6MSxcbiAgICAgICAgICAgICAgICAgICAgeToxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjEsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDE1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuZWFzZUluT3V0XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm9va21hcmtzVmlldy5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICB4OjEsXG4gICAgICAgICAgICAgICAgICAgIHk6MVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BhY2l0eTowLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNTAsXG4gICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmVhc2VJbk91dFxuICAgICAgICAgICAgfSkudGhlbigoKT0+e1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrc1ZpZXcudmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy5zY2FsZVggPSAwLjk7XG4gICAgICAgICAgICAgICAgYm9va21hcmtzVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYmx1clNlYXJjaEJhcigpO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH0gXG4gICAgZWxzZSBpZiAoZXZ0LnByb3BlcnR5TmFtZSA9PT0gJ2NhbmNlbEJ1dHRvblNob3duJykge1xuICAgICAgICBpZiAoZXZ0LnZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBvdmVydmlld0J1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ292ZXJ2aWV3QnV0dG9uJyk7XG4gICAgICAgICAgICBvdmVydmlld0J1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBvdmVydmlld0J1dHRvbi52aXNpYmlsaXR5ID0gJ2NvbGxhcHNlJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBtZW51QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnbWVudUJ1dHRvbicpO1xuICAgICAgICAgICAgbWVudUJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBtZW51QnV0dG9uLnZpc2liaWxpdHkgPSAnY29sbGFwc2UnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGhlYWRlclZpZXcuZ2V0Vmlld0J5SWQoJ2NhbmNlbEJ1dHRvbicpO1xuICAgICAgICAgICAgY2FuY2VsQnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBjYW5jZWxCdXR0b24uYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eToxXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJ2aWV3QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnb3ZlcnZpZXdCdXR0b24nKTtcbiAgICAgICAgICAgIG92ZXJ2aWV3QnV0dG9uLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XG4gICAgICAgICAgICBvdmVydmlld0J1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBtZW51QnV0dG9uID0gaGVhZGVyVmlldy5nZXRWaWV3QnlJZCgnbWVudUJ1dHRvbicpO1xuICAgICAgICAgICAgbWVudUJ1dHRvbi52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgbWVudUJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBoZWFkZXJWaWV3LmdldFZpZXdCeUlkKCdjYW5jZWxCdXR0b24nKTtcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvbi5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OjBcbiAgICAgICAgICAgIH0pLnRoZW4oKCk9PntcbiAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b24udmlzaWJpbGl0eSA9ICdjb2xsYXBzZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBsYXlvdXQub2ZmKEdlc3R1cmVUeXBlcy50b3VjaCk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuXG5jb25zdCBjaGVja0FjdGlvbkJhciA9ICgpID0+IHtcbiAgICBpZiAoIXBhZ2UpIHJldHVybjtcbiAgICBpZiAoc2NyZWVuT3JpZW50YXRpb24gPT09IDkwIHx8IHNjcmVlbk9yaWVudGF0aW9uID09PSAtOTAgfHwgYXBwVmlld01vZGVsLnZpZXdlckVuYWJsZWQpIFxuICAgICAgICBwYWdlLmFjdGlvbkJhckhpZGRlbiA9IHRydWU7XG4gICAgZWxzZSBcbiAgICAgICAgcGFnZS5hY3Rpb25CYXJIaWRkZW4gPSBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhZ2VMb2FkZWQoYXJncykge1xuICAgIFxuICAgIHBhZ2UgPSBhcmdzLm9iamVjdDtcbiAgICBwYWdlLmJpbmRpbmdDb250ZXh0ID0gYXBwVmlld01vZGVsO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgbWVudSBidXR0b25cbiAgICBjb25zdCBtZW51QnV0dG9uID0gPEJ1dHRvbj4gcGFnZS5nZXRWaWV3QnlJZChcIm1lbnVCdXR0b25cIik7XG4gICAgbWVudUJ1dHRvbi50ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGU1ZDQpO1xuXG4gICAgLy8gU2V0IHRoZSBpY29uIGZvciB0aGUgb3ZlcnZpZXcgYnV0dG9uXG4gICAgY29uc3Qgb3ZlcnZpZXdCdXR0b24gPSA8QnV0dG9uPiBwYWdlLmdldFZpZXdCeUlkKFwib3ZlcnZpZXdCdXR0b25cIik7XG4gICAgb3ZlcnZpZXdCdXR0b24udGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhlNTNiKTtcblxuICAgIC8vIHdvcmthcm91bmQgKHNlZSBodHRwczovL2dpdGh1Yi5jb20vTmF0aXZlU2NyaXB0L05hdGl2ZVNjcmlwdC9pc3N1ZXMvNjU5KVxuICAgIGlmIChwYWdlLmlvcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICBwYWdlLnJlcXVlc3RMYXlvdXQoKTtcbiAgICAgICAgfSwgMClcbiAgICAgICAgYXBwbGljYXRpb24uaW9zLmFkZE5vdGlmaWNhdGlvbk9ic2VydmVyKFVJQXBwbGljYXRpb25EaWRCZWNvbWVBY3RpdmVOb3RpZmljYXRpb24sICgpID0+IHtcbiAgICAgICAgICAgIHBhZ2UucmVxdWVzdExheW91dCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhcHBsaWNhdGlvbi5vbihhcHBsaWNhdGlvbi5vcmllbnRhdGlvbkNoYW5nZWRFdmVudCwgKCk9PntcbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgY2hlY2tBY3Rpb25CYXIoKTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICB9KTtcblxuICAgIGFwcFZpZXdNb2RlbC5yZWFkeS50aGVuKCgpPT57XG4gICAgICAgIFxuICAgICAgICBhcHBWaWV3TW9kZWwuYXJnb24uc2Vzc2lvbi5lcnJvckV2ZW50LmFkZEV2ZW50TGlzdGVuZXIoKGVycm9yKT0+e1xuICAgICAgICAgICAgLy8gYWxlcnQoZXJyb3IubWVzc2FnZSArICdcXG4nICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICAgICAgaWYgKGVycm9yLnN0YWNrKSBjb25zb2xlLmxvZyhlcnJvci5tZXNzYWdlICsgJ1xcbicgKyBlcnJvci5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgICAgICBcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxheW91dExvYWRlZChhcmdzKSB7XG4gICAgbGF5b3V0ID0gYXJncy5vYmplY3RcbiAgICBpZiAobGF5b3V0Lmlvcykge1xuICAgICAgICBsYXlvdXQuaW9zLmxheWVyLm1hc2tzVG9Cb3VuZHMgPSBmYWxzZTtcbiAgICB9XG4gICAgYXBwVmlld01vZGVsLnNldFJlYWR5KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoZWFkZXJMb2FkZWQoYXJncykge1xuICAgIGhlYWRlclZpZXcgPSBhcmdzLm9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEJhckxvYWRlZChhcmdzKSB7XG4gICAgc2VhcmNoQmFyID0gYXJncy5vYmplY3Q7XG5cbiAgICBzZWFyY2hCYXIub24oU2VhcmNoQmFyLnN1Ym1pdEV2ZW50LCAoKSA9PiB7XG4gICAgICAgIGxldCB1cmxTdHJpbmcgPSBzZWFyY2hCYXIudGV4dDtcbiAgICAgICAgaWYgKHVybFN0cmluZy5pbmRleE9mKCcvLycpID09PSAtMSkgdXJsU3RyaW5nID0gJy8vJyArIHVybFN0cmluZztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IFVSSSh1cmxTdHJpbmcpO1xuICAgICAgICBpZiAodXJsLnByb3RvY29sKCkgIT09IFwiaHR0cFwiICYmIHVybC5wcm90b2NvbCgpICE9PSBcImh0dHBzXCIpIHtcbiAgICAgICAgICAgIHVybC5wcm90b2NvbChcImh0dHBcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2V0U2VhcmNoQmFyVGV4dCh1cmwudG9TdHJpbmcoKSk7XG4gICAgICAgIGFwcFZpZXdNb2RlbC5sb2FkVXJsKHVybC50b1N0cmluZygpKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVCb29rbWFya3MoKTtcbiAgICAgICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZUNhbmNlbEJ1dHRvbigpO1xuICAgIH0pO1xuXG4gICAgaWYgKGFwcGxpY2F0aW9uLmlvcykge1xuICAgICAgICBpb3NTZWFyY2hCYXJDb250cm9sbGVyID0gbmV3IElPU1NlYXJjaEJhckNvbnRyb2xsZXIoc2VhcmNoQmFyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlYXJjaEJhclRleHQodXJsOnN0cmluZykge1xuICAgIGlmIChpb3NTZWFyY2hCYXJDb250cm9sbGVyKSB7XG4gICAgICAgIGlvc1NlYXJjaEJhckNvbnRyb2xsZXIuc2V0VGV4dCh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlYXJjaEJhci50ZXh0ID0gdXJsO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYmx1clNlYXJjaEJhcigpIHtcbiAgICBpZiAoc2VhcmNoQmFyLmlvcykge1xuICAgICAgICAoc2VhcmNoQmFyLmlvcyBhcyBVSVNlYXJjaEJhcikucmVzaWduRmlyc3RSZXNwb25kZXIoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicm93c2VyVmlld0xvYWRlZChhcmdzKSB7XG4gICAgYnJvd3NlclZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICBcbiAgICBhcHBWaWV3TW9kZWwub24oQXBwVmlld01vZGVsLmxvYWRVcmxFdmVudCwgKGRhdGE6TG9hZFVybEV2ZW50RGF0YSk9PntcbiAgICAgICAgY29uc3QgdXJsID0gZGF0YS51cmw7XG5cbiAgICAgICAgaWYgKCFkYXRhLm5ld0xheWVyIHx8IFxuICAgICAgICAgICAgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgJiZcbiAgICAgICAgICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgIT09IGJyb3dzZXJWaWV3LnJlYWxpdHlMYXllciAmJlxuICAgICAgICAgICAgIWJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIuZGV0YWlscy51cmkpKSB7XG4gICAgICAgICAgICBicm93c2VyVmlldy5sb2FkVXJsKHVybCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxheWVyID0gYnJvd3NlclZpZXcuYWRkTGF5ZXIoKTtcbiAgICAgICAgYnJvd3NlclZpZXcuc2V0Rm9jdXNzZWRMYXllcihsYXllcik7XG4gICAgICAgIGJyb3dzZXJWaWV3LmxvYWRVcmwodXJsKTtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgdXJsOiAnICsgdXJsKTtcbiAgICB9KTtcblxuICAgIC8vIFNldHVwIHRoZSBkZWJ1ZyB2aWV3XG4gICAgbGV0IGRlYnVnOkh0bWxWaWV3ID0gPEh0bWxWaWV3PmJyb3dzZXJWaWV3LnBhZ2UuZ2V0Vmlld0J5SWQoXCJkZWJ1Z1wiKTtcbiAgICBkZWJ1Zy5ob3Jpem9udGFsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLnZlcnRpY2FsQWxpZ25tZW50ID0gJ3N0cmV0Y2gnO1xuICAgIGRlYnVnLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigxNTAsIDI1NSwgMjU1LCAyNTUpO1xuICAgIGRlYnVnLnZpc2liaWxpdHkgPSBcImNvbGxhcHNlZFwiO1xuICAgIGRlYnVnLmlzVXNlckludGVyYWN0aW9uRW5hYmxlZCA9IGZhbHNlO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBib29rbWFya3NWaWV3TG9hZGVkKGFyZ3MpIHtcbiAgICBib29rbWFya3NWaWV3ID0gYXJncy5vYmplY3Q7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVggPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgYm9va21hcmtzVmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWxpdHlDaG9vc2VyTG9hZGVkKGFyZ3MpIHtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcgPSBhcmdzLm9iamVjdDtcbiAgICByZWFsaXR5Q2hvb3NlclZpZXcuc2NhbGVYID0gMC45O1xuICAgIHJlYWxpdHlDaG9vc2VyVmlldy5zY2FsZVkgPSAwLjk7XG4gICAgcmVhbGl0eUNob29zZXJWaWV3Lm9wYWNpdHkgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG91Y2hPdmVybGF5TG9hZGVkKGFyZ3MpIHtcbiAgICB0b3VjaE92ZXJsYXlWaWV3ID0gYXJncy5vYmplY3Q7XG59XG5cbi8vIGluaXRpYWxpemUgc29tZSBwcm9wZXJ0aWVzIG9mIHRoZSBtZW51IHNvIHRoYXQgYW5pbWF0aW9ucyB3aWxsIHJlbmRlciBjb3JyZWN0bHlcbmV4cG9ydCBmdW5jdGlvbiBtZW51TG9hZGVkKGFyZ3MpIHtcbiAgICBtZW51VmlldyA9IGFyZ3Mub2JqZWN0O1xuICAgIG1lbnVWaWV3Lm9yaWdpblggPSAxO1xuICAgIG1lbnVWaWV3Lm9yaWdpblkgPSAwO1xuICAgIG1lbnVWaWV3LnNjYWxlWCA9IDA7XG4gICAgbWVudVZpZXcuc2NhbGVZID0gMDtcbiAgICBtZW51Vmlldy5vcGFjaXR5ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2VhcmNoQmFyVGFwKGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd0Jvb2ttYXJrcygpO1xuICAgIGFwcFZpZXdNb2RlbC5zaG93Q2FuY2VsQnV0dG9uKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvbkNhbmNlbChhcmdzKSB7XG4gICAgaWYgKCEhYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpIGFwcFZpZXdNb2RlbC5oaWRlQm9va21hcmtzKCk7XG4gICAgYXBwVmlld01vZGVsLmhpZGVSZWFsaXR5Q2hvb3NlcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlQ2FuY2VsQnV0dG9uKCk7XG4gICAgYmx1clNlYXJjaEJhcigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25BZGRDaGFubmVsKGFyZ3MpIHtcbiAgICBicm93c2VyVmlldy5hZGRMYXllcigpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25SZWxvYWQoYXJncykge1xuICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgJiYgXG4gICAgICAgIGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIud2ViVmlldyAmJiBcbiAgICAgICAgYnJvd3NlclZpZXcuZm9jdXNzZWRMYXllci53ZWJWaWV3LnJlbG9hZCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25GYXZvcml0ZVRvZ2dsZShhcmdzKSB7XG4gICAgY29uc3QgdXJsID0gYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmk7XG4gICAgY29uc3QgYm9va21hcmtJdGVtID0gYm9va21hcmtzLmZhdm9yaXRlTWFwLmdldCh1cmwpO1xuICAgIGlmICghYm9va21hcmtJdGVtKSB7XG4gICAgICAgIGJvb2ttYXJrcy5mYXZvcml0ZUxpc3QucHVzaChuZXcgYm9va21hcmtzLkJvb2ttYXJrSXRlbSh7XG4gICAgICAgICAgICB1cmk6IHVybCxcbiAgICAgICAgICAgIHRpdGxlOiBhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnRpdGxlXG4gICAgICAgIH0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaSA9IGJvb2ttYXJrcy5mYXZvcml0ZUxpc3QuaW5kZXhPZihib29rbWFya0l0ZW0pO1xuICAgICAgICBib29rbWFya3MuZmF2b3JpdGVMaXN0LnNwbGljZShpLDEpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uSW50ZXJhY3Rpb25Ub2dnbGUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVJbnRlcmFjdGlvbk1vZGUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uT3ZlcnZpZXcoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVPdmVydmlldygpO1xuICAgIGFwcFZpZXdNb2RlbC5zZXREZWJ1Z0VuYWJsZWQoZmFsc2UpO1xuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25NZW51KGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwudG9nZ2xlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25TZWxlY3RSZWFsaXR5KGFyZ3MpIHtcbiAgICBhcHBWaWV3TW9kZWwuc2hvd1JlYWxpdHlDaG9vc2VyKCk7XG4gICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uU2V0dGluZ3MoYXJncykge1xuICAgIC8vY29kZSB0byBvcGVuIHRoZSBzZXR0aW5ncyB2aWV3IGdvZXMgaGVyZVxuICAgIGFwcFZpZXdNb2RlbC5oaWRlTWVudSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25WaWV3ZXJUb2dnbGUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVWaWV3ZXIoKTtcbiAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9uRGVidWdUb2dnbGUoYXJncykge1xuICAgIGFwcFZpZXdNb2RlbC50b2dnbGVEZWJ1ZygpO1xufVxuXG5jbGFzcyBJT1NTZWFyY2hCYXJDb250cm9sbGVyIHtcblxuICAgIHByaXZhdGUgdWlTZWFyY2hCYXI6VUlTZWFyY2hCYXI7XG4gICAgcHJpdmF0ZSB0ZXh0RmllbGQ6VUlUZXh0RmllbGQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc2VhcmNoQmFyOlNlYXJjaEJhcikge1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyID0gc2VhcmNoQmFyLmlvcztcbiAgICAgICAgdGhpcy50ZXh0RmllbGQgPSB0aGlzLnVpU2VhcmNoQmFyLnZhbHVlRm9yS2V5KFwic2VhcmNoRmllbGRcIik7XG5cbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5rZXlib2FyZFR5cGUgPSBVSUtleWJvYXJkVHlwZS5VUkw7XG4gICAgICAgIHRoaXMudWlTZWFyY2hCYXIuYXV0b2NhcGl0YWxpemF0aW9uVHlwZSA9IFVJVGV4dEF1dG9jYXBpdGFsaXphdGlvblR5cGUuTm9uZTtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5zZWFyY2hCYXJTdHlsZSA9IFVJU2VhcmNoQmFyU3R5bGUuTWluaW1hbDtcbiAgICAgICAgdGhpcy51aVNlYXJjaEJhci5yZXR1cm5LZXlUeXBlID0gVUlSZXR1cm5LZXlUeXBlLkdvO1xuICAgICAgICB0aGlzLnVpU2VhcmNoQmFyLnNldEltYWdlRm9yU2VhcmNoQmFySWNvblN0YXRlKFVJSW1hZ2UubmV3KCksIFVJU2VhcmNoQmFySWNvbi5TZWFyY2gsIFVJQ29udHJvbFN0YXRlLk5vcm1hbClcbiAgICAgICAgXG4gICAgICAgIHRoaXMudGV4dEZpZWxkLmxlZnRWaWV3TW9kZSA9IFVJVGV4dEZpZWxkVmlld01vZGUuTmV2ZXI7XG5cbiAgICAgICAgY29uc3QgdGV4dEZpZWxkRWRpdEhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICBhcHBWaWV3TW9kZWwuaGlkZU1lbnUoKTtcbiAgICAgICAgICAgIGlmICh1dGlscy5pb3MuZ2V0dGVyKFVJUmVzcG9uZGVyLCB0aGlzLnVpU2VhcmNoQmFyLmlzRmlyc3RSZXNwb25kZXIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJyb3dzZXJWaWV3LmZvY3Vzc2VkTGF5ZXIgPT09IGJyb3dzZXJWaWV3LnJlYWxpdHlMYXllcikge1xuICAgICAgICAgICAgICAgICAgICBhcHBWaWV3TW9kZWwuc2hvd1JlYWxpdHlDaG9vc2VyKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dCb29rbWFya3MoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXBwVmlld01vZGVsLnNob3dDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVpU2VhcmNoQmFyLnRleHQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudWlTZWFyY2hCYXIudGV4dCA9IGFwcFZpZXdNb2RlbC5sYXllckRldGFpbHMudXJpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRQbGFjZWhvbGRlclRleHQoXCJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRleHRGaWVsZC5zZWxlY3RlZFRleHRSYW5nZSA9IHRoaXMudGV4dEZpZWxkLnRleHRSYW5nZUZyb21Qb3NpdGlvblRvUG9zaXRpb24odGhpcy50ZXh0RmllbGQuYmVnaW5uaW5nT2ZEb2N1bWVudCwgdGhpcy50ZXh0RmllbGQuZW5kT2ZEb2N1bWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCA1MDApXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGF5b3V0Lm9uKEdlc3R1cmVUeXBlcy50b3VjaCwoKT0+e1xuICAgICAgICAgICAgICAgICAgICBibHVyU2VhcmNoQmFyKCk7XG4gICAgICAgICAgICAgICAgICAgIGxheW91dC5vZmYoR2VzdHVyZVR5cGVzLnRvdWNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcHBWaWV3TW9kZWwubGF5ZXJEZXRhaWxzLnVyaSkgYXBwVmlld01vZGVsLmhpZGVDYW5jZWxCdXR0b24oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQbGFjZWhvbGRlclRleHQoYXBwVmlld01vZGVsLmxheWVyRGV0YWlscy51cmkpO1xuICAgICAgICAgICAgICAgIHRoaXMudWlTZWFyY2hCYXIudGV4dCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhcHBsaWNhdGlvbi5pb3MuYWRkTm90aWZpY2F0aW9uT2JzZXJ2ZXIoVUlUZXh0RmllbGRUZXh0RGlkQmVnaW5FZGl0aW5nTm90aWZpY2F0aW9uLCB0ZXh0RmllbGRFZGl0SGFuZGxlcik7XG4gICAgICAgIGFwcGxpY2F0aW9uLmlvcy5hZGROb3RpZmljYXRpb25PYnNlcnZlcihVSVRleHRGaWVsZFRleHREaWRFbmRFZGl0aW5nTm90aWZpY2F0aW9uLCB0ZXh0RmllbGRFZGl0SGFuZGxlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXRQbGFjZWhvbGRlclRleHQodGV4dDpzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzOiBOU011dGFibGVEaWN0aW9uYXJ5PHN0cmluZyxhbnk+ID0gTlNNdXRhYmxlRGljdGlvbmFyeS5uZXc8c3RyaW5nLGFueT4oKS5pbml0KCk7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLnNldE9iamVjdEZvcktleSh1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsVUlDb2xvci5ibGFja0NvbG9yKSwgTlNGb3JlZ3JvdW5kQ29sb3JBdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLmF0dHJpYnV0ZWRQbGFjZWhvbGRlciA9IE5TQXR0cmlidXRlZFN0cmluZy5hbGxvYygpLmluaXRXaXRoU3RyaW5nQXR0cmlidXRlcyh0ZXh0LCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGV4dEZpZWxkLnBsYWNlaG9sZGVyID0gc2VhcmNoQmFyLmhpbnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0VGV4dCh1cmwpIHtcbiAgICAgICAgaWYgKCF1dGlscy5pb3MuZ2V0dGVyKFVJUmVzcG9uZGVyLCB0aGlzLnVpU2VhcmNoQmFyLmlzRmlyc3RSZXNwb25kZXIpKSB7XG4gICAgICAgICAgICB0aGlzLnNldFBsYWNlaG9sZGVyVGV4dCh1cmwpO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19