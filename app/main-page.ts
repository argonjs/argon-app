
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

import * as vuforia from 'nativescript-vuforia';

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
		let url = searchBar.text; 
		const protocolRegex = /^[^:]+(?=:\/\/)/;
		if (!protocolRegex.test(url)) {
			url = "http://" + url;
		}
		url = url.toLowerCase();
		console.log("Load url: " + url);
		browserView.focussedLayer.src = url;
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
        console.log("finished loading webpage");
        console.log(eventData.error);
        console.log(eventData.navigationType);
        
        if (!eventData.error) {
            console.log("adding URL to history: ", eventData.url);
            history.addPage(eventData.url);
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
        menu.animate({
            scale: { x: 0, y: 0 },
            duration: 150,
			opacity: 0
        }).then(() => { menu.visibility = "collapsed"; });
    } else {
        //make sure the menu view is rendered above any other views
        // const parent = menu.parent;
        // parent._removeView(menu);
        // parent._addView(menu, 0);
        
        menu.visibility = "visible";
        menu.animate({
            scale: { x: 1, y: 1 },
            duration: 150,
			opacity: 1
        });
    }
}

export function onTap() {
	console.log('tapped')
}

export function newChannelClicked(args) {
    //code to open a new channel goes here
}

export function bookmarksClicked(args) {
    //code to open the bookmarks view goes here
}

export function historyClicked(args) {
    frames.topmost().currentPage.showModal("history-view", null, () => {
        const url = historyView.getTappedUrl();
        if (url) {
            console.log("load from history: ", url);
            browserView.focussedLayer.src = url;
        }
    }, true);
}

export function settingsClicked(args) {
    //code to open the settings view goes here
}