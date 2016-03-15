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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLElBQU8sbUJBQW1CLFdBQVcsc0JBQXNCLENBQUMsQ0FBQztBQUU3RCxJQUFJLE9BQU8sR0FBYSxXQUFXLEVBQUUsQ0FBQztBQUV0QztJQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUV4QyxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLElBQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsRUFBRSxDQUFDO0lBQ2QsQ0FBQztBQUNMLENBQUM7QUFFRDtJQUNJLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUZlLGVBQU8sVUFFdEIsQ0FBQTtBQUVELGlCQUF3QixHQUFXO0lBQy9CLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRTVFLElBQUksYUFBYSxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakUsYUFBYSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUN6RCxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRXhELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQzVFLENBQUM7QUFWZSxlQUFPLFVBVXRCLENBQUE7QUFFRDs7OztFQUlFIn0=