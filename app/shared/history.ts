import applicationSettings = require('application-settings');

let history: string[] = loadHistory();

function loadHistory(): string[] {
    if (applicationSettings.hasKey("history")) {
        return JSON.parse(applicationSettings.getString("history"));
    } else {
        return [];
    }
}

export function getList(): string[] {
    return history;
}

export function addPage(url: string) {
    history.push(url);
    applicationSettings.setString("history", JSON.stringify(history));
}

/*
export function removePage(index: number) {
    history.splice(index, 1);
}
*/