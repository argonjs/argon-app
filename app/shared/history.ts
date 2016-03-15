import applicationSettings = require('application-settings');

let history: string[] = initHistory();

function initHistory(): string[] {
    console.log("Loading previous history");
    
    if (applicationSettings.hasKey("history")) {
        const historyLog = applicationSettings.getString("history");
        return historyLog.split(" ");
    } else {
        return [];
    }
}

export function getList(): string[] {
    return history;
}

export function addPage(url: string) {
    history.push(url);
    
    console.log("Old History: " + applicationSettings.getString("history", ""));
    
    let newHistoryLog = applicationSettings.getString("history", "");
    newHistoryLog += (history.length == 1) ? url : " " + url;
    applicationSettings.setString("history", newHistoryLog);
    
    console.log("New history: " + applicationSettings.getString("history"));
}

/*
export function removePage(index: number) {
    history.splice(index, 1);
}
*/