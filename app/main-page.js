"use strict";
var URI = require("urijs");
var application = require('application');
var frames = require('ui/frame');
var search_bar_1 = require('ui/search-bar');
var color_1 = require('color');
var observable_1 = require('data/observable');
var fs = require('file-system');
var Argon = require('argon');
var dialogs = require("ui/dialogs");
var applicationSettings = require("application-settings");
var argon_device_service_1 = require('./argon-device-service');
var argon_vuforia_service_1 = require('./argon-vuforia-service');
var historyView = require('./history-view');
var history = require('./shared/history');
var page;
var menu;
var searchBar;
var iosSearchBarController;
var pgpFolder = fs.knownFolders.currentApp().getFolder('pgp');
var publicKeyPromise = pgpFolder.contains('public.key') ?
    pgpFolder.getFile('public.key').readText() : Promise.reject(null);
var privateKeyPromise = pgpFolder.contains('private.key') ?
    pgpFolder.getFile('private.key').readText() : Promise.reject(null);
var container = new Argon.DI.Container;
container.registerSingleton(Argon.DeviceService, argon_device_service_1.NativescriptDeviceService);
container.registerSingleton(Argon.VuforiaServiceDelegate, argon_vuforia_service_1.NativescriptVuforiaServiceDelegate);
exports.manager = Argon.init({ container: container, config: {
        role: Argon.Role.MANAGER,
        name: 'ArgonApp',
        managerPublicKey: publicKeyPromise,
        managerPrivateKey: privateKeyPromise
    } });
exports.manager.reality.setDefault({ type: 'vuforia' });
exports.manager.vuforia.init({
    licenseKey: "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV"
}).catch(function (err) {
    console.log(err);
});
exports.manager.focus.sessionFocusEvent.addEventListener(function () {
    var focussedSession = exports.manager.focus.getSession();
    console.log("Argon focus changed: " + (focussedSession ? focussedSession.info.name : undefined));
});
var vuforiaDelegate = container.get(Argon.VuforiaServiceDelegate);
var ViewModel = (function (_super) {
    __extends(ViewModel, _super);
    function ViewModel() {
        _super.apply(this, arguments);
        this.menuOpen = false;
        this.debugEnabled = false;
        this.viewerEnabled = false;
    }
    ViewModel.prototype.toggleMenu = function () {
        this.set('menuOpen', !this.menuOpen);
    };
    ViewModel.prototype.hideMenu = function () {
        this.set('menuOpen', false);
    };
    ViewModel.prototype.toggleDebug = function () {
        this.set('debugEnabled', !this.debugEnabled);
    };
    ViewModel.prototype.toggleViewer = function () {
        this.set('viewerEnabled', !this.viewerEnabled);
    };
    ViewModel.prototype.setDebugEnabled = function (enabled) {
        this.set('debugEnabled', enabled);
    };
    ViewModel.prototype.setViewerEnabled = function (enabled) {
        this.set('viewerEnabled', enabled);
    };
    return ViewModel;
}(observable_1.Observable));
var viewModel = new ViewModel;
viewModel.on('propertyChange', function (evt) {
    if (evt.propertyName === 'viewerEnabled') {
        vuforiaDelegate.setViewerEnabled(evt.value);
    }
    if (evt.propertyName === 'menuOpen') {
        if (evt.value) {
            exports.browserView.hideOverview();
            menu.visibility = "visible";
            menu.animate({
                scale: {
                    x: 1,
                    y: 1,
                },
                duration: 150,
                opacity: 1,
            });
        }
        else {
            menu.animate({
                scale: {
                    x: 0,
                    y: 0,
                },
                duration: 150,
                opacity: 0,
            }).then(function () {
                menu.visibility = "collapsed";
            });
        }
    }
});
function pageLoaded(args) {
    page = args.object;
    page.bindingContext = viewModel;
    page.backgroundColor = new color_1.Color("black");
    //This was added to fix the bug of bookmark back navigation is shown when going back
    var controller = frames.topmost().ios.controller;
    var navigationItem = controller.visibleViewController.navigationItem;
    navigationItem.setHidesBackButtonAnimated(true, false);
    page.backgroundColor = new color_1.Color("black");
    // Set the icon for the menu button
    var menuButton = page.getViewById("menuBtn");
    menuButton.text = String.fromCharCode(0xe5d4);
    // Set the icon for the overview button
    var overviewButton = page.getViewById("overviewBtn");
    overviewButton.text = String.fromCharCode(0xe53b);
    // workaround (see https://github.com/NativeScript/NativeScript/issues/659)
    if (page.ios) {
        setTimeout(function () {
            page.requestLayout();
        }, 0);
        application.ios.addNotificationObserver(UIApplicationDidBecomeActiveNotification, function () {
            page.requestLayout();
        });
    }
}
exports.pageLoaded = pageLoaded;
function searchBarLoaded(args) {
    searchBar = args.object;
    searchBar.on(search_bar_1.SearchBar.submitEvent, function () {
        var url = URI(searchBar.text);
        if (url.protocol() !== "http" || url.protocol() !== "https") {
            url.protocol("http");
        }
        console.log("Load url: " + url);
        setSearchBarText(url.toString());
        exports.browserView.focussedLayer.webView.src = url.toString();
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
function browserViewLoaded(args) {
    exports.browserView = args.object;
    exports.browserView.on('propertyChange', function (eventData) {
        if (eventData.propertyName === 'url') {
            setSearchBarText(eventData.value);
        }
    });
    exports.browserView.focussedLayer.webView.on("loadFinished", function (eventData) {
        if (!eventData.error) {
            history.addPage(eventData.url);
        }
    });
    // Setup the debug view
    var debug = exports.browserView.page.getViewById("debug");
    debug.horizontalAlignment = 'stretch';
    debug.verticalAlignment = 'stretch';
    debug.backgroundColor = new color_1.Color(150, 255, 255, 255);
    debug.visibility = "collapsed";
    if (debug.ios) {
        debug.ios.userInteractionEnabled = false;
    }
    var layer = exports.browserView.focussedLayer;
    var logChangeCallback = function (args) {
        // while (layer.webView.log.length > 10) layer.webView.log.shift()
        // debug.html = layer.webView.log.join("<br/>");
    };
    layer.webView.on("log", logChangeCallback);
    exports.browserView.on("propertyChange", function (evt) {
        if (evt.propertyName === "focussedLayer") {
            if (layer) {
                layer.webView.removeEventListener("log", logChangeCallback);
            }
            layer = exports.browserView.focussedLayer;
            console.log("FOCUSSED LAYER: " + layer.webView.src);
            layer.webView.on("log", logChangeCallback);
        }
    });
}
exports.browserViewLoaded = browserViewLoaded;
// initialize some properties of the menu so that animations will render correctly
function menuLoaded(args) {
    menu = args.object;
    menu.originX = 1;
    menu.originY = 0;
    menu.scaleX = 0;
    menu.scaleY = 0;
    menu.opacity = 0;
    menu.parent.requestLayout();
}
exports.menuLoaded = menuLoaded;
function onReload(args) {
    exports.browserView.focussedLayer.webView.reload();
}
exports.onReload = onReload;
function onOverview(args) {
    exports.browserView.toggleOverview();
    viewModel.setDebugEnabled(false);
    viewModel.hideMenu();
}
exports.onOverview = onOverview;
function onMenu(args) {
    viewModel.toggleMenu();
}
exports.onMenu = onMenu;
function onNewChannel(args) {
    exports.browserView.addLayer();
    viewModel.hideMenu();
}
exports.onNewChannel = onNewChannel;
function onBookmarks(args) {
    var url_string = exports.browserView.focussedLayer.webView.src;
    if (url_string != "") {
        if (!checkExistingUrl(url_string)) {
            dialogs.prompt("Input a name for your bookmark", "").then(function (r) {
                if (r.result !== false) {
                    var modified_url = url_string.replace(/([^:]\/)\/+/g, "");
                    modified_url = modified_url.replace("/", "");
                    modified_url = modified_url.replace("/", "");
                    modified_url = modified_url.replace("http:", "");
                    modified_url = modified_url.replace("https:", "");
                    applicationSettings.setString("bookmarkurl", modified_url);
                    applicationSettings.setString("bookmarkname", r.text);
                    frames.topmost().navigate("bookmark");
                }
            });
        }
        else {
            frames.topmost().navigate("bookmark");
        }
    }
    else {
        dialogs.alert("Url string for bookmark can't be empty").then(function () { });
    }
    viewModel.hideMenu();
}
exports.onBookmarks = onBookmarks;
function onHistory(args) {
    frames.topmost().currentPage.showModal("history-view", null, function () {
        var url = historyView.getTappedUrl();
        if (url) {
            exports.browserView.focussedLayer.webView.src = url;
        }
    }, true);
    viewModel.hideMenu();
}
exports.onHistory = onHistory;
function onSettings(args) {
    //code to open the settings view goes here
    viewModel.hideMenu();
}
exports.onSettings = onSettings;
function onViewerToggle(args) {
    viewModel.toggleViewer();
    viewModel.hideMenu();
}
exports.onViewerToggle = onViewerToggle;
function onDebugToggle(args) {
    viewModel.toggleDebug();
}
exports.onDebugToggle = onDebugToggle;
var IOSSearchBarController = (function () {
    function IOSSearchBarController(searchBar) {
        var _this = this;
        this.searchBar = searchBar;
        this.uiSearchBar = searchBar.ios;
        this.textField = this.uiSearchBar.valueForKey("searchField");
        this.uiSearchBar.showsCancelButton = false;
        this.uiSearchBar.keyboardType = UIKeyboardType.UIKeyboardTypeURL;
        this.uiSearchBar.autocapitalizationType = UITextAutocapitalizationType.UITextAutocapitalizationTypeNone;
        this.uiSearchBar.searchBarStyle = UISearchBarStyle.UISearchBarStyleMinimal;
        this.uiSearchBar.returnKeyType = UIReturnKeyType.UIReturnKeyGo;
        this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), UISearchBarIcon.UISearchBarIconSearch, UIControlState.UIControlStateNormal);
        this.textField.leftViewMode = UITextFieldViewMode.UITextFieldViewModeNever;
        var textFieldEditHandler = function () {
            viewModel.hideMenu();
            if (_this.uiSearchBar.isFirstResponder()) {
                _this.uiSearchBar.setShowsCancelButtonAnimated(true, true);
                var cancelButton = _this.uiSearchBar.valueForKey("cancelButton");
                cancelButton.setTitleColorForState(UIColor.darkGrayColor(), UIControlState.UIControlStateNormal);
                setTimeout(function () {
                    if (_this.uiSearchBar.text === "") {
                        _this.uiSearchBar.text = exports.browserView.url;
                        _this.setPlaceholderText(null);
                        _this.textField.selectedTextRange = _this.textField.textRangeFromPositionToPosition(_this.textField.beginningOfDocument, _this.textField.endOfDocument);
                    }
                }, 500);
            }
            else {
                _this.setPlaceholderText(_this.uiSearchBar.text);
                _this.uiSearchBar.text = "";
                Promise.resolve().then(function () {
                    _this.uiSearchBar.setShowsCancelButtonAnimated(false, true);
                });
            }
        };
        application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
        application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);
        //This part is for bookmark. It basically checks if the app just returning from bookmark. And load the url
        if (applicationSettings.getString("url") != "none" && applicationSettings.getString("url") != null) {
            var bookmark_url = applicationSettings.getString("url");
            var protocolRegex = /^[^:]+(?=:\/\/)/;
            if (!protocolRegex.test(bookmark_url)) {
                bookmark_url = "http://" + bookmark_url;
            }
            bookmark_url = bookmark_url.toLowerCase();
            exports.browserView.focussedLayer.webView.src = bookmark_url;
            applicationSettings.setString("url", "none");
        }
    }
    IOSSearchBarController.prototype.setPlaceholderText = function (text) {
        if (text) {
            var attributes = NSMutableDictionary.alloc().init();
            attributes.setObjectForKey(UIColor.blackColor(), NSForegroundColorAttributeName);
            this.textField.attributedPlaceholder = NSAttributedString.alloc().initWithStringAttributes(text, attributes);
        }
        else {
            this.textField.placeholder = searchBar.hint;
        }
    };
    IOSSearchBarController.prototype.setText = function (url) {
        if (!this.uiSearchBar.isFirstResponder()) {
            this.setPlaceholderText(url);
        }
    };
    return IOSSearchBarController;
}());
function onTap() {
    console.log('tapped');
}
exports.onTap = onTap;
//Helper function for bookmark. It checks if the url already existed in bookmark
function checkExistingUrl(url_string) {
    url_string = url_string.replace(/([^:]\/)\/+/g, "");
    url_string = url_string.replace("/", "");
    url_string = url_string.replace("/", "");
    url_string = url_string.replace("http:", "");
    url_string = url_string.replace("https:", "");
    var url = [];
    if (applicationSettings.getString("save_bookmark_url") != null) {
        url = JSON.parse(applicationSettings.getString("save_bookmark_url"));
    }
    for (var i = 0; i < url.length; i++) {
        if (url[i]["url"] == url_string) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=main-page.js.map