"use strict";
var applicationSettings = require('application-settings');
var history = loadHistory();
function loadHistory() {
    if (applicationSettings.hasKey("history")) {
        return JSON.parse(applicationSettings.getString("history"));
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
    applicationSettings.setString("history", JSON.stringify(history));
}
exports.addPage = addPage;
/*
export function removePage(index: number) {
    history.splice(index, 1);
}
*/ 
//# sourceMappingURL=history.js.map