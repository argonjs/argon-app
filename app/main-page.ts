import * as URI from "urijs";

import * as application from 'application';
import * as frames from 'ui/frame';
import {SearchBar} from 'ui/search-bar';
import {Page} from 'ui/page';
import {CreateViewEventData} from 'ui/placeholder';
import {Button} from 'ui/button';
import {View, getViewById} from 'ui/core/view';
import {HtmlView} from 'ui/html-view'
import {Color} from 'color';
import {PropertyChangeData} from 'data/observable';
import * as fs from 'file-system';
import dialogs = require("ui/dialogs");
import applicationSettings = require("application-settings");
import {AnimationCurve} from 'ui/enums'
import {GestureTypes} from 'ui/gestures'

import * as Argon from 'argon';

import {Util} from './util';
import {ArgonWebView} from 'argon-web-view';
import {BrowserView} from './components/browser-view';
import {BookmarkItem, favoriteList, favoriteMap} from './components/common/bookmarks';
import {appViewModel, LoadUrlEventData} from './components/common/AppViewModel';

import {NativescriptDeviceService} from './argon-device-service';
import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service';

export let manager:Argon.ArgonSystem;

export let page:Page;
export let touchOverlayView:View;
export let headerView:View;
export let menuView:View;
export let browserView:BrowserView;
export let bookmarksView:View;

let searchBar:SearchBar;
let iosSearchBarController:IOSSearchBarController;

const pgpFolder = fs.knownFolders.currentApp().getFolder('pgp');

const publicKeyPromise = pgpFolder.contains('public.key') ? 
    pgpFolder.getFile('public.key').readText() : Promise.reject(null);
const privateKeyPromise = pgpFolder.contains('private.key') ? 
    pgpFolder.getFile('private.key').readText() : Promise.reject(null);

const container = new Argon.DI.Container;
container.registerSingleton(Argon.DeviceService, NativescriptDeviceService);
container.registerSingleton(Argon.VuforiaServiceDelegate, NativescriptVuforiaServiceDelegate);

manager = Argon.init({container, config: {
    role: Argon.Role.MANAGER,
    name: 'ArgonApp'
}});

manager.reality.setDefault({type:'vuforia'});

manager.vuforia.init({
    licenseKey: "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV"
}).catch((err)=>{
    console.log(err);
});

manager.focus.sessionFocusEvent.addEventListener(()=>{
    const focussedSession = manager.focus.getSession();    
    console.log("Argon focus changed: " + (focussedSession ? focussedSession.info.name : undefined));
})

const vuforiaDelegate:NativescriptVuforiaServiceDelegate = container.get(Argon.VuforiaServiceDelegate);

appViewModel.on('propertyChange', (evt:PropertyChangeData)=>{
    if (evt.propertyName === 'currentUrl') {
        setSearchBarText(evt.value);
    }
    else if (evt.propertyName === 'viewerEnabled') {
        vuforiaDelegate.setViewerEnabled(evt.value);
    }
    else if (evt.propertyName === 'menuOpen') {
        if (evt.value) {
            appViewModel.hideOverview();
            menuView.visibility = "visible";
            menuView.animate({
                scale: {
                    x: 1,
                    y: 1,
                },
                duration: 150,
                opacity: 1,
                curve: AnimationCurve.easeInOut
            });
        } else {
            menuView.animate({
                scale: {
                    x: 0,
                    y: 0,
                },
                duration: 150,
                opacity: 0,
                curve: AnimationCurve.easeInOut
            }).then(() => {
                menuView.visibility = "collapse";
            });
        }
    }
    else if (evt.propertyName === 'overviewOpen') {
        if (evt.value) {
            browserView.showOverview();
            appViewModel.hideBookmarks();
            searchBar.animate({
                translate: {x:-100, y:0},
                opacity: 0,
                curve: AnimationCurve.easeInOut
            }).then(()=>{
                searchBar.visibility = 'collapse';
            })
            const addButton = headerView.getViewById('addButton');
            addButton.visibility = 'visible';
            addButton.opacity = 0;
            addButton.translateX = -10;
            addButton.animate({
                translate: {x:0,y:0},
                opacity:1
            })
        } else {
            browserView.hideOverview();
            if (!browserView.url) appViewModel.showBookmarks();
            searchBar.visibility = 'visible';
            searchBar.animate({
                translate: {x:0, y:0},
                opacity: 1,
                curve: AnimationCurve.easeInOut
            })
            const addButton = headerView.getViewById('addButton');
            addButton.animate({
                translate: {x:-10, y:0},
                opacity:0
            }).then(()=>{
                addButton.visibility = 'collapse';
            })
        }
    }
    else if (evt.propertyName === 'bookmarksOpen') {
        if (evt.value) {
            bookmarksView.visibility = 'visible';
            bookmarksView.scaleX = 0.9;
            bookmarksView.scaleY = 0.9;
            bookmarksView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:1,
                curve: AnimationCurve.easeInOut
            })
        } else {
            bookmarksView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:0,
                curve: AnimationCurve.easeInOut
            }).then(()=>{
                bookmarksView.visibility = 'collapse';
                bookmarksView.scaleX = 0.9;
                bookmarksView.scaleY = 0.9;
            })
            blurSearchBar();
        }
    } 
    else if (evt.propertyName === 'cancelButtonShown') {
        if (evt.value) {
            const overviewButton = headerView.getViewById('overviewButton');
            overviewButton.animate({
                opacity:0
            }).then(()=>{
                overviewButton.visibility = 'collapse';
            })
            const menuButton = headerView.getViewById('menuButton');
            menuButton.animate({
                opacity:0
            }).then(()=>{
                menuButton.visibility = 'collapse';
            })
            const cancelButton = headerView.getViewById('cancelButton');
            cancelButton.visibility = 'visible';
            cancelButton.animate({
                opacity:1
            });
            bookmarksView.on(GestureTypes.touch,()=>{
                blurSearchBar();
                appViewModel.hideCancelButton();
            });
        } else {
            const overviewButton = headerView.getViewById('overviewButton');
            overviewButton.visibility = 'visible';
            overviewButton.animate({
                opacity:1
            })
            const menuButton = headerView.getViewById('menuButton');
            menuButton.visibility = 'visible';
            menuButton.animate({
                opacity:1
            })
            const cancelButton = headerView.getViewById('cancelButton');
            cancelButton.animate({
                opacity:0
            }).then(()=>{
                cancelButton.visibility = 'collapse';
            })
            bookmarksView.off(GestureTypes.touch);
        }
    }
})

// frames.Frame.prototype['_setNativeViewFrame'] = View.prototype['_setNativeViewFrame'];

export function pageLoaded(args) {
    
    page = args.object;
    page.bindingContext = appViewModel;
    
    appViewModel.on('loadUrl', (data:LoadUrlEventData)=>{
        browserView.loadUrl(data.url);
    })

    // Set the icon for the menu button
    const menuButton = <Button> page.getViewById("menuButton");
    menuButton.text = String.fromCharCode(0xe5d4);

    // Set the icon for the overview button
    const overviewButton = <Button> page.getViewById("overviewButton");
    overviewButton.text = String.fromCharCode(0xe53b);

    // workaround (see https://github.com/NativeScript/NativeScript/issues/659)
    if (page.ios) {
        setTimeout(()=>{
            page.requestLayout();
        }, 0)
        application.ios.addNotificationObserver(UIApplicationDidBecomeActiveNotification, () => {
            page.requestLayout();
        });
    }
    
    appViewModel.showBookmarks();
}

export function headerLoaded(args) {
    headerView = args.object;
}

export function searchBarLoaded(args) {
    searchBar = args.object;

    searchBar.on(SearchBar.submitEvent, () => {
        const url = URI(searchBar.text);
        if (url.protocol() !== "http" || url.protocol() !== "https") {
            url.protocol("http");
        }
        setSearchBarText(url.toString());
        appViewModel.loadUrl(url.toString());
    });

    if (application.ios) {
        iosSearchBarController = new IOSSearchBarController(searchBar);
    }
}

function setSearchBarText(url:string) {
    if (iosSearchBarController) {
        iosSearchBarController.setText(url);
    } else {
        searchBar.text = url;
    }
}

function blurSearchBar() {
    if (searchBar.ios) {
        (searchBar.ios as UISearchBar).resignFirstResponder();
    }
}

export function browserViewLoaded(args) {
    browserView = args.object;

    // Setup the debug view
    let debug:HtmlView = <HtmlView>browserView.page.getViewById("debug");
    debug.horizontalAlignment = 'stretch';
    debug.verticalAlignment = 'stretch';
    debug.backgroundColor = new Color(150, 255, 255, 255);
    debug.visibility = "collapsed";
    if (debug.ios) {
        (<UIView>debug.ios).userInteractionEnabled = false;
    }

    let layer = browserView.focussedLayer;

    const logChangeCallback = (args) => {
        // while (layer.webView.log.length > 10) layer.webView.log.shift()
        // debug.html = layer.webView.log.join("<br/>");
    };
    layer.webView.on("log", logChangeCallback)

    browserView.on("propertyChange", (evt: PropertyChangeData) => {
        if (evt.propertyName === 'url') {
            appViewModel.setCurrentUrl(evt.value);    
            setSearchBarText(evt.value)
        }
        else if (evt.propertyName === 'focussedLayer') {
            if (layer) {
                layer.webView.removeEventListener("log", logChangeCallback);
            }
            layer = browserView.focussedLayer;
            console.log("FOCUSSED LAYER: " + layer.webView.src);
            layer.webView.on("log", logChangeCallback)
            appViewModel.hideOverview();
        }
    });
}


export function bookmarksViewLoaded(args) {
    bookmarksView = args.object;
}

// initialize some properties of the menu so that animations will render correctly
export function menuLoaded(args) {
    menuView = args.object;
    menuView.originX = 1;
    menuView.originY = 0;
    menuView.scaleX = 0;
    menuView.scaleY = 0;
    menuView.opacity = 0;
}

export function onSearchBarTap(args) {
    appViewModel.showBookmarks();
    appViewModel.showCancelButton();
}

export function onCancel(args) {
    if (!!browserView.url) appViewModel.hideBookmarks();
    appViewModel.hideCancelButton();
    blurSearchBar();
}

export function onAddChannel(args) {
    browserView.addLayer();
    appViewModel.hideMenu();
}

export function onReload(args) {
    browserView.focussedLayer.webView.reload();
}

export function onFavoriteToggle(args) {
    const url = browserView.url;
    if (!favoriteMap.get(url)) {
        favoriteList.push(new BookmarkItem({
            url,
            title: browserView.focussedLayer.webView.title
        }));
    } else {
        favoriteMap.set(url, undefined);
    }
}

export function onOverview(args) {
    appViewModel.toggleOverview();
    appViewModel.setDebugEnabled(false);
    appViewModel.hideMenu();
}

export function onMenu(args) {
    appViewModel.toggleMenu();
}

export function onSettings(args) {
    //code to open the settings view goes here
    appViewModel.hideMenu();
}

export function onViewerToggle(args) {
    appViewModel.toggleViewer();
    appViewModel.hideMenu();
}

export function onDebugToggle(args) {
    appViewModel.toggleDebug();
}

class IOSSearchBarController {

    private uiSearchBar:UISearchBar;
    private textField:UITextField;

    constructor(public searchBar:SearchBar) {
        this.uiSearchBar = searchBar.ios;
        this.textField = this.uiSearchBar.valueForKey("searchField");

        this.uiSearchBar.keyboardType = UIKeyboardType.UIKeyboardTypeURL;
        this.uiSearchBar.autocapitalizationType = UITextAutocapitalizationType.UITextAutocapitalizationTypeNone;
        this.uiSearchBar.searchBarStyle = UISearchBarStyle.UISearchBarStyleMinimal;
        this.uiSearchBar.returnKeyType = UIReturnKeyType.UIReturnKeyGo;
        this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), UISearchBarIcon.UISearchBarIconSearch, UIControlState.UIControlStateNormal)
        
        this.textField.leftViewMode = UITextFieldViewMode.UITextFieldViewModeNever;

        const textFieldEditHandler = () => {
            appViewModel.hideMenu();
            if (this.uiSearchBar.isFirstResponder()) {
                
                appViewModel.showBookmarks();
                appViewModel.showCancelButton();
                
                setTimeout(()=>{
                    if (this.uiSearchBar.text === "") {
                        this.uiSearchBar.text = appViewModel.currentUrl;
                        this.setPlaceholderText(null);
                        this.textField.selectedTextRange = this.textField.textRangeFromPositionToPosition(this.textField.beginningOfDocument, this.textField.endOfDocument);
                    }
                }, 500)
            } else {
                this.setPlaceholderText(appViewModel.currentUrl);
                this.uiSearchBar.text = "";
                appViewModel.hideCancelButton();
            }
        }

        application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
        application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);
    }

    private setPlaceholderText(text:string) {
        if (text) {
            var attributes = NSMutableDictionary.alloc().init();
            attributes.setObjectForKey(UIColor.blackColor(), NSForegroundColorAttributeName);
            this.textField.attributedPlaceholder = NSAttributedString.alloc().initWithStringAttributes(text, attributes);
        } else {
            this.textField.placeholder = searchBar.hint;
        }
    }

    public setText(url) {
        if (!this.uiSearchBar.isFirstResponder()) {
            this.setPlaceholderText(url);
        }
    }
}