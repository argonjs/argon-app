"use strict";
var frames = require('ui/frame');
function exitButtonClicked(args) {
    frames.topmost().navigate("main-page");
}
exports.exitButtonClicked = exitButtonClicked;
function historyViewLoaded(args) {
    var historyView = args.object;
    historyView.items = ["www.google.com", "www.gatech.edu", "www.github.com"];
}
exports.historyViewLoaded = historyViewLoaded;
function historyClicked(args) {
    var historyView = args.object;
    var item = historyView.items[args.index];
    console.log("Tapped item #", item);
}
exports.historyClicked = historyClicked;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGlzdG9yeS12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFPLE1BQU0sV0FBVyxVQUFVLENBQUMsQ0FBQztBQUVwQywyQkFBa0MsSUFBSTtJQUNsQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFGZSx5QkFBaUIsb0JBRWhDLENBQUE7QUFFRCwyQkFBa0MsSUFBSTtJQUNsQyxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ2hDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFIZSx5QkFBaUIsb0JBR2hDLENBQUE7QUFFRCx3QkFBK0IsSUFBSTtJQUMvQixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ2hDLElBQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFKZSxzQkFBYyxpQkFJN0IsQ0FBQSJ9