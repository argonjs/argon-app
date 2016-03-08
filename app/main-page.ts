
import application = require('application');
import pages = require('ui/page');
import views = require('ui/core/view');
import frames = require('ui/frame');
import searchbar = require('ui/search-bar');
import actionbar = require('ui/action-bar');
import color = require('color');
import platform = require('platform');

import vuforia = require('nativescript-vuforia');
import argonBrowserView = require('argon-browser-view');

import Argon = require('argon');
import {NativeScriptDeviceService} from './argon-device-service';
import {NativeScriptVuforiaServiceDelegate} from './argon-vuforia-service';

import history = require('./shared/history');

export let manager:Argon.ArgonSystem;
export let browserView:argonBrowserView.BrowserView;
let actionBar:actionbar.ActionBar;
let searchBar:searchbar.SearchBar;

let iosSearchBarController:IOSSearchBarController;

export function pageLoaded(args) {
	
	const container = new Argon.Container;
	container.registerSingleton(Argon.DeviceService, NativeScriptDeviceService);
	container.registerSingleton(Argon.VuforiaServiceDelegate, NativeScriptVuforiaServiceDelegate);
	manager = Argon.init({container});

    const page:pages.Page = args.object;
    page.backgroundColor = new color.Color("black");
	
	actionBar = page.actionBar;
	browserView = new argonBrowserView.BrowserView(page, manager);
	
	browserView.onNavigationStateChange = () => {
		const url = browserView.getURL();
		if (iosSearchBarController) {
			iosSearchBarController.setText(url);
		}
	}
}

export function actionBarLoaded(args) {
	actionBar = args.object
}

export function searchBarLoaded(args) {
	searchBar = args.object;
	
	searchBar.on(searchbar.SearchBar.submitEvent, () => {
		let url = searchBar.text; 
		const protocolRegex = /^[^:]+(?=:\/\/)/;
		if (!protocolRegex.test(url)) {
			url = "http://" + url;
		}
		url = url.toLowerCase();
		console.log("Load url: " + url);
		browserView.load(url);
        history.addPage(url);
	});

    if (application.ios) {
		iosSearchBarController = new IOSSearchBarController(searchBar);
	}
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
		
    	const notificationCenter = NSNotificationCenter.defaultCenter();

    	const textFieldEditHandler = () => {
    		if (this.uiSearchBar.isFirstResponder()) {
				this.uiSearchBar.setShowsCancelButtonAnimated(true, false);
				const items = actionBar.actionItems.getItems();
				for (const item of items) {
					item.visibility = 'collapse'
				}
				setTimeout(()=>{
					this.uiSearchBar.text = browserView.getURL();
					this.setPlaceholderText(null);
					this.textField.selectedTextRange = this.textField.textRangeFromPositionToPosition(this.textField.beginningOfDocument, this.textField.endOfDocument);
				}, 500)
			} else {
				this.setPlaceholderText(this.uiSearchBar.text);
				this.uiSearchBar.text = "";
				Promise.resolve().then(()=>{
					this.setPlaceholderText(browserView.getURL());
					this.uiSearchBar.setShowsCancelButtonAnimated(false, false);
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
    menu.visibility = (menu.visibility == "visible") ? "collapsed" : "visible";
	if (menu.ios) {
		const menuView:UIView = menu.ios;
		menuView.superview.bringSubviewToFront(menuView);
	}
}

export function bookmarksClicked(args) {
    //code to open the bookmarks view goes here
}

export function historyClicked(args) {
    frames.topmost().navigate("history-view");
}

export function debugClicked(args) {
    //code to open the debug view goes here
}