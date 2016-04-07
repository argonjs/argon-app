import * as URI from "urijs";

import * as application from 'application';
import * as pages from 'ui/page';
import * as views from 'ui/core/view';
import * as frames from 'ui/frame';
import * as searchbar from 'ui/search-bar';
import * as actionbar from 'ui/action-bar';
import {CreateViewEventData} from 'ui/placeholder';
import * as color from 'color';
import * as platform from 'platform';
import {Button} from "ui/button";
import {View} from "ui/core/view";

import * as vuforia from 'nativescript-vuforia';


import * as util from './util';
import dialogs = require("ui/dialogs");
import applicationSettings = require("application-settings");
import {BrowserView} from './browser-view'
import {PropertyChangeData} from 'data/observable'

import * as Argon from 'argon';
import './argon-camera-service';
import './argon-device-service';
import './argon-viewport-service';
import {NativeScriptVuforiaServiceDelegate} from './argon-vuforia-service';

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
	var controller = frames.topmost().ios.controller;
  var navigationItem = controller.visibleViewController.navigationItem;
	navigationItem.setHidesBackButtonAnimated(true, false);

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
			if(applicationSettings.getString("url") != "none" && applicationSettings.getString("url") != null) {
					let bookmark_url = applicationSettings.getString("url");
					const protocolRegex = /^[^:]+(?=:\/\/)/;
					if (!protocolRegex.test(bookmark_url)) {
						bookmark_url = "http://" + bookmark_url;
					}
					bookmark_url = bookmark_url.toLowerCase();
					browserView.focussedLayer.src = bookmark_url;
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
		var url_string = browserView.focussedLayer.src;
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
				dialogs.alert("Url string for bookmark can't be empty").then(function() {
        });
  }
}

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
    //code to open the history view goes here
}

export function settingsClicked(args) {
    //code to open the settings view goes here
}

export function layerButtonClicked(args) {
	browserView.toggleOverview();
}
