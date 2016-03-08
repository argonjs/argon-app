"use strict";
var history = [];
function addPage(url) {
    history.push(url);
}
exports.addPage = addPage;
function removePage(index) {
    history.splice(index, 1);
}
exports.removePage = removePage;
function getList() {
    return history;
}
exports.getList = getList;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLElBQUksT0FBTyxHQUFhLEVBQUUsQ0FBQztBQUUzQixpQkFBd0IsR0FBVztJQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RCLENBQUM7QUFGZSxlQUFPLFVBRXRCLENBQUE7QUFFRCxvQkFBMkIsS0FBYTtJQUNwQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBRmUsa0JBQVUsYUFFekIsQ0FBQTtBQUVEO0lBQ0ksTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNuQixDQUFDO0FBRmUsZUFBTyxVQUV0QixDQUFBIn0=