import * as URI from "urijs";

import * as application from 'application';
import * as frames from 'ui/frame';
import {SearchBar} from 'ui/search-bar';
import {Page} from 'ui/page';
import {CreateViewEventData} from 'ui/placeholder';
import {LoadEventData} from 'ui/web-view';
import {Button} from 'ui/button';
import {View, getViewById} from 'ui/core/view';
import {HtmlView} from 'ui/html-view'
import {Color} from 'color';
import {Observable, PropertyChangeData} from 'data/observable';
import * as fs from 'file-system';

import * as Argon from 'argon';

import dialogs = require("ui/dialogs");
import applicationSettings = require("application-settings");
import {Util} from './util';
import {ArgonWebView} from 'argon-web-view';
import {BrowserView} from './browser-view';

import {NativescriptDeviceService} from './argon-device-service';
import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service';

import * as historyView from './history-view';
import * as history from './shared/history';

export let manager:Argon.ArgonSystem;
export let browserView:BrowserView;

let page:Page;
let menu:View;
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
	name: 'ArgonApp',
	managerPublicKey: publicKeyPromise,
	managerPrivateKey: privateKeyPromise
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

class ViewModel extends Observable {
	menuOpen = false;
	debugEnabled = false;
	viewerEnabled = false;
	toggleMenu() {
		this.set('menuOpen', !this.menuOpen);
	}
	hideMenu() {
		this.set('menuOpen', false);
	}
	toggleDebug() {
		this.set('debugEnabled', !this.debugEnabled);
	}
	toggleViewer() {
		this.set('viewerEnabled', !this.viewerEnabled);
	}
	setDebugEnabled(enabled:boolean) {
		this.set('debugEnabled', enabled);
	}
	setViewerEnabled(enabled:boolean) {
		this.set('viewerEnabled', enabled);
	}
}

const viewModel = new ViewModel;

viewModel.on('propertyChange', (evt:PropertyChangeData)=>{
	if (evt.propertyName === 'viewerEnabled') {
		vuforiaDelegate.setViewerEnabled(evt.value);
	}
	if (evt.propertyName === 'menuOpen') {
		if (evt.value) {
			browserView.hideOverview();
			menu.visibility = "visible";
			menu.animate({
				scale: {
					x: 1,
					y: 1,
				},
				duration: 150,
				opacity: 1,
			});
			Util.bringToFront(menu);
		} else {
			menu.animate({
				scale: {
					x: 0,
					y: 0,
				},
				duration: 150,
				opacity: 0,
			}).then(() => {
				menu.visibility = "collapsed";
			});
		}
	}
})

export function pageLoaded(args) {
	
	page = args.object;
	
	page.bindingContext = viewModel;
	
	page.backgroundColor = new Color("black");
	
	//This was added to fix the bug of bookmark back navigation is shown when going back
	var controller = frames.topmost().ios.controller;
  	var navigationItem = controller.visibleViewController.navigationItem;
	navigationItem.setHidesBackButtonAnimated(true, false);
	page.backgroundColor = new Color("black");

	// Set the icon for the menu button
	const menuButton = <Button> page.getViewById("menuBtn");
	menuButton.text = String.fromCharCode(0xe5d4);

	// Set the icon for the overview button
	const overviewButton = <Button> page.getViewById("overviewBtn");
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
}

export function searchBarLoaded(args) {
	searchBar = args.object;

	searchBar.on(SearchBar.submitEvent, () => {
		const url = URI(searchBar.text);
		if (url.protocol() !== "http" || url.protocol() !== "https") {
			url.protocol("http");
		}
		console.log("Load url: " + url);
		setSearchBarText(url.toString());
		browserView.focussedLayer.webView.src = url.toString();
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

export function browserViewLoaded(args) {
	browserView = args.object;
	browserView.on('propertyChange', (eventData:PropertyChangeData) => {
		if (eventData.propertyName === 'url') {
			setSearchBarText(eventData.value)
		}
	});

    browserView.focussedLayer.webView.on("loadFinished", (eventData: LoadEventData) => {
        if (!eventData.error) {
            history.addPage(eventData.url);
        }
    });

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
        if (evt.propertyName === "focussedLayer") {
            if (layer) {
                layer.webView.removeEventListener("log", logChangeCallback);
            }
            layer = browserView.focussedLayer;
            console.log("FOCUSSED LAYER: " + layer.webView.src);
            layer.webView.on("log", logChangeCallback)
        }
    });
}

// initialize some properties of the menu so that animations will render correctly
export function menuLoaded(args) {
	menu = args.object;
	menu.originX = 1;
	menu.originY = 0;
	menu.scaleX = 0;
	menu.scaleY = 0;
	menu.opacity = 0;
}

export function onReload(args) {
	browserView.focussedLayer.webView.reload();
}

export function onOverview(args) {
	browserView.toggleOverview();
	viewModel.setDebugEnabled(false);
	viewModel.hideMenu();
}

export function onMenu(args) {
	viewModel.toggleMenu();
}

export function onNewChannel(args) {
	browserView.addLayer();
	viewModel.hideMenu();
}

export function onBookmarks(args) {
    //code to open the bookmarks view goes here
	viewModel.hideMenu();
}

export function onHistory(args) {
    frames.topmost().currentPage.showModal("history-view", null, () => {
        const url = historyView.getTappedUrl();
        if (url) {
            browserView.focussedLayer.webView.src = url;
        }
    }, true);
	viewModel.hideMenu();
}

export function onSettings(args) {
    //code to open the settings view goes here
	viewModel.hideMenu();
}

export function onViewerToggle(args) {
	viewModel.toggleViewer();
	viewModel.hideMenu();
}

export function onDebugToggle(args) {
	viewModel.toggleDebug();
}

class IOSSearchBarController {

	private uiSearchBar:UISearchBar;
	private textField:UITextField;

	constructor(public searchBar:SearchBar) {
		this.uiSearchBar = searchBar.ios;
		this.textField = this.uiSearchBar.valueForKey("searchField");

		this.uiSearchBar.showsCancelButton = false;
		this.uiSearchBar.keyboardType = UIKeyboardType.UIKeyboardTypeURL;
		this.uiSearchBar.autocapitalizationType = UITextAutocapitalizationType.UITextAutocapitalizationTypeNone;
		this.uiSearchBar.searchBarStyle = UISearchBarStyle.UISearchBarStyleMinimal;
		this.uiSearchBar.returnKeyType = UIReturnKeyType.UIReturnKeyGo;
		this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), UISearchBarIcon.UISearchBarIconSearch, UIControlState.UIControlStateNormal)

		this.textField.leftViewMode = UITextFieldViewMode.UITextFieldViewModeNever;

		const textFieldEditHandler = () => {
			viewModel.hideMenu();
			if (this.uiSearchBar.isFirstResponder()) {
				this.uiSearchBar.setShowsCancelButtonAnimated(true, true);
				const cancelButton:UIButton = this.uiSearchBar.valueForKey("cancelButton");
				cancelButton.setTitleColorForState(UIColor.darkGrayColor(), UIControlState.UIControlStateNormal);
				
				setTimeout(()=>{
					if (this.uiSearchBar.text === "") {
						this.uiSearchBar.text = browserView.url;
						this.setPlaceholderText(null);
						this.textField.selectedTextRange = this.textField.textRangeFromPositionToPosition(this.textField.beginningOfDocument, this.textField.endOfDocument);
					}
				}, 500)
			} else {
				this.setPlaceholderText(this.uiSearchBar.text);
				this.uiSearchBar.text = "";
				Promise.resolve().then(()=>{
					this.uiSearchBar.setShowsCancelButtonAnimated(false, true);
				});
			}
		}


    	application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
    	application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);

			//This part is for bookmark. It basically checks if the app just returning from bookmark. And load the url
			if(applicationSettings.getString("url") != "none" && applicationSettings.getString("url") != null) {
				let bookmark_url = applicationSettings.getString("url");
				const protocolRegex = /^[^:]+(?=:\/\/)/;
				if (!protocolRegex.test(bookmark_url)) {
					bookmark_url = "http://" + bookmark_url;
				}
				bookmark_url = bookmark_url.toLowerCase();
				browserView.focussedLayer.webView.src = bookmark_url;
				applicationSettings.setString("url", "none");
			}
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

export function menuButtonClicked(args) {
	let menu = getViewById(frames.topmost().currentPage, "menu");
	if (menu.visibility == "visible") {
		hideMenu(menu);
	} else {
		showMenu(menu);
	}
}

function hideMenu(menu: View) {
	menu.animate({
		scale: {
			x: 0,
			y: 0,
		},
		duration: 150,
		opacity: 0,
	}).then(() => {
		menu.visibility = "collapsed";
	});
}

function showMenu(menu: View) {
	browserView.hideOverview();
	menu.visibility = "visible";
	menu.animate({
		scale: {
			x: 1,
			y: 1,
		},
		duration: 150,
		opacity: 1,
	});
	Util.bringToFront(menu);
}

export function onTap() {
	console.log('tapped')
}

export function newChannelClicked(args) {
	browserView.addLayer();
	hideMenu(args.object.page.getViewById("menu"));
}

export function bookmarksClicked(args) {
    //code to open the bookmarks view goes here
		var url_string = browserView.focussedLayer.webView.src;
		if(url_string != "") {
			if(!checkExistingUrl(url_string)) {
				dialogs.prompt("Input a name for your bookmark", "").then(function (r) {
					if(r.result !== false) {
						var modified_url = url_string.replace(/([^:]\/)\/+/g, "");
						modified_url = modified_url.replace("/", "");
						modified_url = modified_url.replace("/","");
						modified_url = modified_url.replace("http:","");
						modified_url = modified_url.replace("https:","");
						applicationSettings.setString("bookmarkurl", modified_url);
						applicationSettings.setString("bookmarkname", r.text);
						frames.topmost().navigate("bookmark");
					}
				});
			} else {
				frames.topmost().navigate("bookmark");
			}
		} else {
			dialogs.alert("Url string for bookmark can't be empty").then(function() {});
		}
}

//Helper function for bookmark. It checks if the url already existed in bookmark
function checkExistingUrl(url_string) {
	url_string = url_string.replace(/([^:]\/)\/+/g,"");
	url_string = url_string.replace("/","");
	url_string = url_string.replace("/","");
	url_string = url_string.replace("http:","");
	url_string = url_string.replace("https:","");
	var url = [];
	if(applicationSettings.getString("save_bookmark_url") != null) {
		url = JSON.parse(applicationSettings.getString("save_bookmark_url"));
	}
	for(var i = 0 ; i < url.length; i++) {
		if(url[i]["url"] == url_string) {
			return true;
		}
	}
	return false;
}

export function historyClicked(args) {
    frames.topmost().currentPage.showModal("history-view", null, () => {
        const url = historyView.getTappedUrl();
        if (url) {
            browserView.focussedLayer.webView.src = url;
        }
    }, true);
}

export function settingsClicked(args) {
    //code to open the settings view goes here
}


export function layerButtonClicked(args) {
	browserView.toggleOverview();
	args.object.page.getViewById("debug").visibility = "collapsed";
}

export function debugClicked(args) {
	const debugView = args.object.page.getViewById("debug");
	if (debugView.visibility == "visible") {
		debugView.visibility = "collapsed";
	} else {
		debugView.visibility = "visible";
		Util.bringToFront(debugView);
	}
	hideMenu(args.object.page.getViewById("menu"));
}
