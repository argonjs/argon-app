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
import {ArgonWebView, SessionEventData} from 'argon-web-view';
import {BrowserView} from './components/browser-view';
import * as bookmarks from './components/common/bookmarks';
import {appViewModel, LoadUrlEventData} from './components/common/AppViewModel';

import {NativescriptDeviceService} from './argon-device-service';
import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service';
import {NativescriptViewService} from './argon-view-service';

export let manager:Argon.ArgonSystem;

export let page:Page;
export let layout:View;
export let touchOverlayView:View;
export let headerView:View;
export let menuView:View;
export let browserView:BrowserView;
export let bookmarksView:View;
export let realityChooserView:View;

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
container.registerSingleton(Argon.ViewService, NativescriptViewService);

manager = Argon.init({container, config: {
    role: Argon.Role.MANAGER,
    name: 'ArgonApp'
}});

const vuforiaDelegate:NativescriptVuforiaServiceDelegate = container.get(Argon.VuforiaServiceDelegate);

manager.reality.setDefault(bookmarks.LIVE_VIDEO_REALITY);

manager.vuforia.init({
    licenseKey: "AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV"
}).catch((err)=>{
    console.log(err);
});

manager.reality.registerLoader(new class HostedRealityLoader extends Argon.RealityLoader {
    type = 'hosted';
    load(reality: Argon.RealityView, callback:(realitySession:Argon.SessionPort)=>void):void {
        var url:string = reality['url'];
        var sessionCallback = (data:SessionEventData)=>{
            browserView.realityLayer.webView.off('session', sessionCallback);
            callback(data.session);
        }
        browserView.realityLayer.webView.on('session', sessionCallback);
        browserView.realityLayer.webView.src = '';
        browserView.realityLayer.webView.src = url;
    }
});

manager.reality.sessionDesiredRealityChangeEvent.addEventListener(({previous, current, session})=>{
    if (session === manager.session.manager) return;
    
    if (previous) {
        const previousRealityItem = bookmarks.realityMap.get(previous);
        if (!previousRealityItem.builtin) {
            var i = bookmarks.realityList.indexOf(previousRealityItem);
            bookmarks.realityList.splice(i, 1);
        }
    } 
    if (current) {        
        const currentRealityItem = bookmarks.realityMap.get(current)
        if (!currentRealityItem) bookmarks.realityList.push(new bookmarks.RealityBookmarkItem(current));
    }
    session.closeEvent.addEventListener(()=>{
       const sessionDesiredReality = manager.reality.desiredRealityMap.get(session);
       const sessionDesiredRealityItem = bookmarks.realityMap.get(sessionDesiredReality);
       if (sessionDesiredRealityItem && !sessionDesiredRealityItem.builtin) {
            var i = bookmarks.realityList.indexOf(sessionDesiredRealityItem);
            bookmarks.realityList.splice(i, 1);
       }
    });
})

manager.focus.sessionFocusEvent.addEventListener(()=>{
    const focussedSession = manager.focus.getSession();    
    console.log("Argon focus changed: " + (focussedSession ? focussedSession.info.name : undefined));
})

appViewModel.on('propertyChange', (evt:PropertyChangeData)=>{
    if (evt.propertyName === 'currentUrl') {
        setSearchBarText(appViewModel.currentUrl);
    }
    else if (evt.propertyName === 'viewerEnabled') {
        vuforiaDelegate.viewerEnabled = evt.value;
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
            touchOverlayView.visibility = 'visible';
            touchOverlayView.on(GestureTypes.touch,()=>{
                touchOverlayView.off(GestureTypes.touch);
                touchOverlayView.visibility = 'collapse';
                appViewModel.hideMenu();
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
            touchOverlayView.off(GestureTypes.touch);
            touchOverlayView.visibility = 'collapse';
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
            if (!appViewModel.layerDetails.url) appViewModel.showBookmarks();
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
    else if (evt.propertyName === 'realityChooserOpen') {
        if (evt.value) {
            realityChooserView.visibility = 'visible';
            realityChooserView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:1,
                duration: 150,
                curve: AnimationCurve.easeInOut
            })
            appViewModel.showCancelButton();
        } else {
            realityChooserView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:0,
                duration: 150,
                curve: AnimationCurve.easeInOut
            }).then(()=>{
                realityChooserView.visibility = 'collapse';
                realityChooserView.scaleX = 0.9;
                realityChooserView.scaleY = 0.9;
            })
            blurSearchBar();
            appViewModel.hideCancelButton();
        }
    }
    else if (evt.propertyName === 'bookmarksOpen') {
        if (evt.value) {
            bookmarksView.visibility = 'visible';
            bookmarksView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:1,
                duration: 150,
                curve: AnimationCurve.easeInOut
            })
        } else {
            bookmarksView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:0,
                duration: 150,
                curve: AnimationCurve.easeInOut
            }).then(()=>{
                bookmarksView.visibility = 'collapse';
                bookmarksView.scaleX = 0.9;
                bookmarksView.scaleY = 0.9;
            })
            blurSearchBar();
            appViewModel.hideCancelButton();
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
            
            layout.off(GestureTypes.touch);
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
    
    // focus on the topmost layer
    browserView.setFocussedLayer(browserView.layers[browserView.layers.length-1]);

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
    
    manager.session.errorEvent.addEventListener((error)=>{
        alert(error.message);
        if (error.stack) console.log(error.stack);
    })
}

export function layoutLoaded(args) {
    layout = args.object
    if (layout.ios) {
        layout.ios.layer.masksToBounds = false;
    }
}

export function headerLoaded(args) {
    headerView = args.object;
}

export function searchBarLoaded(args) {
    searchBar = args.object;

    searchBar.on(SearchBar.submitEvent, () => {
        let urlString = searchBar.text;
        if (urlString.indexOf('//') === -1) urlString = '//' + urlString;
        
        const url = URI(urlString);
        if (url.protocol() !== "http" || url.protocol() !== "https") {
            url.protocol("http");
        }
        setSearchBarText(url.toString());
        appViewModel.loadUrl(url.toString());
        appViewModel.hideBookmarks();
        appViewModel.hideRealityChooser();
        appViewModel.hideCancelButton();
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
    debug.isUserInteractionEnabled = false;
}


export function bookmarksViewLoaded(args) {
    bookmarksView = args.object;
    bookmarksView.scaleX = 0.9;
    bookmarksView.scaleY = 0.9;
    bookmarksView.opacity = 0;
}

export function realityChooserLoaded(args) {
    realityChooserView = args.object;
    realityChooserView.scaleX = 0.9;
    realityChooserView.scaleY = 0.9;
    realityChooserView.opacity = 0;
}

export function touchOverlayLoaded(args) {
    touchOverlayView = args.object;
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
    if (!!appViewModel.layerDetails.url) appViewModel.hideBookmarks();
    appViewModel.hideRealityChooser();
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
    const url = appViewModel.layerDetails.url;
    const bookmarkItem = bookmarks.favoriteMap.get(url);
    if (!bookmarkItem) {
        bookmarks.favoriteList.push(new bookmarks.BookmarkItem({
            url,
            name: browserView.focussedLayer.webView.title
        }));
    } else {
        var i = bookmarks.favoriteList.indexOf(bookmarkItem);
        bookmarks.favoriteList.splice(i,1);
    }
}

export function onInteractionToggle(args) {
    appViewModel.toggleInteractionMode();
}

export function onOverview(args) {
    appViewModel.toggleOverview();
    appViewModel.setDebugEnabled(false);
    appViewModel.hideMenu();
}

export function onMenu(args) {
    appViewModel.toggleMenu();
}

export function onSelectReality(args) {
    appViewModel.showRealityChooser();
    appViewModel.showCancelButton();
    appViewModel.hideMenu();
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
                
                if (browserView.focussedLayer === browserView.realityLayer) {
                    appViewModel.showRealityChooser();
                } else {
                    appViewModel.showBookmarks();
                }
                appViewModel.showCancelButton();
                
                setTimeout(()=>{
                    if (this.uiSearchBar.text === "") {
                        this.uiSearchBar.text = appViewModel.layerDetails.url;
                        this.setPlaceholderText(null);
                        this.textField.selectedTextRange = this.textField.textRangeFromPositionToPosition(this.textField.beginningOfDocument, this.textField.endOfDocument);
                    }
                }, 500)
                
                layout.on(GestureTypes.touch,()=>{
                    blurSearchBar();
                    layout.off(GestureTypes.touch);
                    if (!browserView.focussedLayer.webView.url) appViewModel.hideCancelButton();
                });
            } else {
                this.setPlaceholderText(appViewModel.layerDetails.url);
                this.uiSearchBar.text = "";
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