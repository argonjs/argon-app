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
import {Observable, PropertyChangeData} from 'data/observable'

import * as Argon from 'argon';
import * as vuforia from 'nativescript-vuforia';

import {Util} from './util';
import {ArgonWebView} from 'argon-web-view';
import {BrowserView} from './browser-view';

import './argon-device-service';
import {NativeScriptVuforiaServiceDelegate} from './argon-vuforia-service';

import * as historyView from './history-view';
import * as history from './shared/history';

export let manager:Argon.ArgonSystem;
export let browserView:BrowserView;

let page:Page;
let menu:View;
let searchBar:SearchBar;

let iosSearchBarController:IOSSearchBarController;

const container = new Argon.DI.Container;
container.registerSingleton(Argon.VuforiaServiceDelegate, NativeScriptVuforiaServiceDelegate);

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

const vuforiaDelegate:NativeScriptVuforiaServiceDelegate = container.get(Argon.VuforiaServiceDelegate);

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
		setSearchBarText(url.toString())
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
        console.log("LOGS " + layer.webView.log);
        debug.html = layer.webView.log.join("\n");
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
