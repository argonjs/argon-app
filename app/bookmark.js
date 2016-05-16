"use strict";
var view = require("ui/core/view");
var frames = require('ui/frame');
var applicationSettings = require("application-settings");
var arr = [];
var url = [];
if (applicationSettings.getString("save_bookmark_name") != null) {
    arr = JSON.parse(applicationSettings.getString("save_bookmark_name"));
}
if (applicationSettings.getString("save_bookmark_url") != null) {
    url = JSON.parse(applicationSettings.getString("save_bookmark_url"));
}
var listView1;
function pageLoaded(args) {
    "use strict";
    var controller = frames.topmost().ios.controller;
    // get the view controller navigation item
    var navigationItem = controller.visibleViewController.navigationItem;
    // hide back button
    navigationItem.setHidesBackButtonAnimated(true, false);
    var page = args.object;
    page.bindingContext = { myItems: arr };
    listView1 = view.getViewById(page, "listView1");
    var searchstring = applicationSettings.getString("bookmarkname");
    var bookmark_url = applicationSettings.getString("bookmarkurl");
    if (!checkExist(searchstring)) {
        arr.push({ name: searchstring });
        applicationSettings.setString("save_bookmark_name", JSON.stringify(arr));
    }
    if (!check_url_Exist(bookmark_url)) {
        url.push({ url: bookmark_url });
        applicationSettings.setString("save_bookmark_url", JSON.stringify(url));
    }
}
exports.pageLoaded = pageLoaded;
function back() {
    applicationSettings.setString("url", "none");
    frames.topmost().navigate("main-page");
}
exports.back = back;
function checkExist(url) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i]["name"] == url) {
            return true;
        }
    }
    return false;
}
function check_url_Exist(url_string) {
    for (var i = 0; i < url.length; i++) {
        if (url[i]["url"] == url_string) {
            return true;
        }
    }
    return false;
}
function listViewItemTap(args) {
    var sender = args.object;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].name == sender.id) {
            applicationSettings.setString("url", url[i].url);
            frames.topmost().navigate("main-page");
        }
    }
}
exports.listViewItemTap = listViewItemTap;
function deleteBookmark(args) {
    var sender = args.object;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].name == sender.id) {
            arr.splice(i, 1);
            url.splice(i, 1);
            applicationSettings.setString("save_bookmark_name", JSON.stringify(arr));
            applicationSettings.setString("save_bookmark_url", JSON.stringify(url));
        }
    }
    listView1.refresh();
}
exports.deleteBookmark = deleteBookmark;
//# sourceMappingURL=bookmark.js.map