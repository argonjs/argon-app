import applicationSettings = require('application-settings');

let history: string[] = initHistory();

function initHistory(): string[] {
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
    let newHistoryLog = applicationSettings.getString("history", "");
    newHistoryLog += (history.length == 1) ? url : " " + url;
    applicationSettings.setString("history", newHistoryLog);
}

/*
export function removePage(index: number) {
    history.splice(index, 1);
}
*/