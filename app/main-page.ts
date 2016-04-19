import * as URI from "urijs";

import * as application from 'application';
import * as pages from 'ui/page';
import * as views from 'ui/core/view';
import * as frames from 'ui/frame';
import * as searchbar from 'ui/search-bar';
import * as actionbar from 'ui/action-bar';
import {CreateViewEventData} from 'ui/placeholder';
import {LoadEventData} from 'ui/web-view';
import * as color from 'color';
import * as platform from 'platform';
import {Button} from "ui/button";
import {View} from "ui/core/view";
import {Color} from "color";

import * as vuforia from 'nativescript-vuforia';

import {Util} from './util';
import {ArgonWebView} from 'argon-web-view'
import {BrowserView} from './browser-view'
import {PropertyChangeData} from 'data/observable'

import * as Argon from 'argon';
import './argon-camera-service';
import './argon-device-service';
import './argon-viewport-service';
import {NativeScriptVuforiaServiceDelegate} from './argon-vuforia-service';

import * as historyView from './history-view';
import * as history from './shared/history';

export let manager:Argon.ArgonSystem;
export let browserView:BrowserView;
let actionBar:actionbar.ActionBar;
let searchBar:searchbar.SearchBar;

let iosSearchBarController:IOSSearchBarController;

const container = new Argon.Container;
container.registerSingleton(Argon.VuforiaServiceDelegate, NativeScriptVuforiaServiceDelegate);
manager = Argon.init({container, config: {
	role: Argon.Role.MANAGER,
	defaultReality: {type: 'vuforia'}
}});

export function pageLoaded(args) {

	const page:pages.Page = args.object;
	page.backgroundColor = new color.Color("black");

	actionBar = page.actionBar;

	// Set the icon for the menu button
	const menuButton = <Button> page.getViewById("menuBtn");
	menuButton.text = String.fromCharCode(0xe5d2);

	// Set the icon for the layers button
	const layerButton = <Button> page.getViewById("layerBtn");
	layerButton.text = String.fromCharCode(0xe53b);

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

export function actionBarLoaded(args) {
	actionBar = args.object
}

export function searchBarLoaded(args) {
	searchBar = args.object;

	searchBar.on(searchbar.SearchBar.submitEvent, () => {
		const url = URI(searchBar.text);
		if (url.protocol() !== "http" || url.protocol() !== "https") {
			url.protocol("http");
		}
		console.log("Load url: " + url);
		browserView.focussedLayer.src = url.toString();
	});

	if (application.ios) {
		iosSearchBarController = new IOSSearchBarController(searchBar);
	}
}

export function browserViewLoaded(args) {
	browserView = args.object;
	browserView.on('propertyChange', (eventData:PropertyChangeData) => {
		if (eventData.propertyName === 'url') {
			const url = eventData.value;
			if (iosSearchBarController) {
				iosSearchBarController.setText(url);
			} else {
				searchBar.text = url;
			}
		}
	});

    browserView.focussedLayer.on("loadFinished", (eventData: LoadEventData) => {
        if (!eventData.error) {
            history.addPage(eventData.url);
        }
    });

    // Setup the debug view
    let debug = args.object.page.getViewById("debug");
    debug.horizontalAlignment = 'stretch';
    debug.verticalAlignment = 'stretch';
    debug.backgroundColor = new Color(150, 255, 255, 255);
    debug.visibility = "collapsed";
    if (debug.ios) {
        (<UIView>debug.ios)["setUserInteractionEnabled"](false);
    }

    let layer = browserView.focussedLayer;
    console.log("FOCUSSED LAYER: " + layer.src);

    const logChangeCallback = (args) => {
        console.log("LOGS " + layer.log);
        debug.html = layer.log.join("\n");
    };
    layer.on("log", logChangeCallback)

    browserView.on("propertyChange", (evt: PropertyChangeData) => {
        if (evt.propertyName === "focussedLayer") {
            console.log("CHANGE FOCUS");
            if (layer) {
                layer.removeEventListener("log", logChangeCallback);
            }
            layer = browserView.focussedLayer;
            console.log("FOCUSSED LAYER: " + layer.src);
            layer.on("log", logChangeCallback)
        }
    });
}

// initialize some properties of the menu so that animations will render correctly
export function menuLoaded(args) {
	let menu:views.View = args.object;
	menu.originX = 1;
	menu.originY = 0;
	menu.scaleX = 0;
	menu.scaleY = 0;
	menu.opacity = 0;
}

class IOSSearchBarController {

	private uiSearchBar:UISearchBar;
	private textField:UITextField;

	constructor(public searchBar:searchbar.SearchBar) {
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
			if (this.uiSearchBar.isFirstResponder()) {
				this.uiSearchBar.setShowsCancelButtonAnimated(true, true);
				const cancelButton:UIButton = this.uiSearchBar.valueForKey("cancelButton");
				cancelButton.setTitleColorForState(UIColor.darkGrayColor(), UIControlState.UIControlStateNormal);

				const items = actionBar.actionItems.getItems();
				for (const item of items) {
					item.visibility = 'collapse'
				}
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
					this.setPlaceholderText(browserView.url);
					this.uiSearchBar.setShowsCancelButtonAnimated(false, true);
					const items = actionBar.actionItems.getItems();
					for (const item of items) {
						item.visibility = 'visible'
					}
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

export function menuButtonClicked(args) {
	let menu = views.getViewById(frames.topmost().currentPage, "menu");
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
}

export function historyClicked(args) {
    frames.topmost().currentPage.showModal("history-view", null, () => {
        const url = historyView.getTappedUrl();
        if (url) {
            browserView.focussedLayer.src = url;
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
