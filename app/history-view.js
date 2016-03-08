"use strict";
var frames = require('ui/frame');
var history = require('./shared/history');
function exitButtonClicked(args) {
    frames.topmost().navigate("main-page");
}
exports.exitButtonClicked = exitButtonClicked;
function historyViewLoaded(args) {
    var historyView = args.object;
    historyView.items = history.getList();
}
exports.historyViewLoaded = historyViewLoaded;
function historyClicked(args) {
    var historyView = args.object;
    var item = historyView.items[args.index];
    console.log("Tapped item #", item);
}
exports.historyClicked = historyClicked;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGlzdG9yeS12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFPLE1BQU0sV0FBVyxVQUFVLENBQUMsQ0FBQztBQUNwQyxJQUFPLE9BQU8sV0FBVyxrQkFBa0IsQ0FBQyxDQUFDO0FBRTdDLDJCQUFrQyxJQUFJO0lBQ2xDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUZlLHlCQUFpQixvQkFFaEMsQ0FBQTtBQUVELDJCQUFrQyxJQUFJO0lBQ2xDLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDaEMsV0FBVyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDMUMsQ0FBQztBQUhlLHlCQUFpQixvQkFHaEMsQ0FBQTtBQUVELHdCQUErQixJQUFJO0lBQy9CLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDaEMsSUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDdkMsQ0FBQztBQUplLHNCQUFjLGlCQUk3QixDQUFBIn0=