let history: string[] = [];

export function addPage(url: string) {
    history.push(url);
}

export function removePage(index: number) {
    history.splice(index, 1);
}

export function getList(): Array<string> {
    return history;
}