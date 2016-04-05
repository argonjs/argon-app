"use strict";
var applicationSettings = require('application-settings');
var history = initHistory();
function initHistory() {
    console.log("Loading previous history");
    if (applicationSettings.hasKey("history")) {
        var historyLog = applicationSettings.getString("history");
        return historyLog.split(" ");
    }
    else {
        return [];
    }
}
function getList() {
    return history;
}
exports.getList = getList;
function addPage(url) {
    history.push(url);
    console.log("Old History: " + applicationSettings.getString("history", ""));
    var newHistoryLog = applicationSettings.getString("history", "");
    newHistoryLog += (history.length == 1) ? url : " " + url;
    applicationSettings.setString("history", newHistoryLog);
    console.log("New history: " + applicationSettings.getString("history"));
}
exports.addPage = addPage;
/*
export function removePage(index: number) {
    history.splice(index, 1);
}
*/ 
//# sourceMappingURL=history.js.map