"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var frameModule = require("ui/frame");
var permissions = require("nativescript-permissions");
function pageLoaded(args) {
    return permissions.requestPermission("android.permission.CAMERA", "Your camera is used to provide an augmented reality experience")
        .then(function () {
        return permissions.requestPermission("android.permission.ACCESS_FINE_LOCATION", "TBD")
            .then(function () {
            startApp();
        })
            .catch(function (e) {
            console.log("Error on startApp: " + e);
            console.log(e.stack);
        });
    })
        .catch(function () {
        console.log("Camera permission refused, Vuforia will not initialize correctly");
        startApp();
    });
}
exports.pageLoaded = pageLoaded;
function startApp() {
    var topmost = frameModule.topmost();
    var navigationEntry = {
        moduleName: "main-page",
        backstackVisible: false
    };
    topmost.navigate(navigationEntry);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnktcGFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVudHJ5LXBhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBeUM7QUFDekMsc0RBQXlEO0FBRXpELG9CQUEyQixJQUFJO0lBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLEVBQUUsZ0VBQWdFLENBQUM7U0FDOUgsSUFBSSxDQUFDO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLENBQUM7YUFDckYsSUFBSSxDQUFDO1lBQ0YsUUFBUSxFQUFFLENBQUM7UUFDZixDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsVUFBUyxDQUFDO1lBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsa0VBQWtFLENBQUMsQ0FBQztRQUNoRixRQUFRLEVBQUUsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQWhCRCxnQ0FnQkM7QUFFRDtJQUNJLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQyxJQUFJLGVBQWUsR0FBRztRQUNsQixVQUFVLEVBQUUsV0FBVztRQUN2QixnQkFBZ0IsRUFBRSxLQUFLO0tBQzFCLENBQUM7SUFDRixPQUFPLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3RDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnJhbWVNb2R1bGUgPSByZXF1aXJlKFwidWkvZnJhbWVcIik7XG5pbXBvcnQgcGVybWlzc2lvbnMgPSByZXF1aXJlKCduYXRpdmVzY3JpcHQtcGVybWlzc2lvbnMnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhZ2VMb2FkZWQoYXJncykge1xuICAgIHJldHVybiBwZXJtaXNzaW9ucy5yZXF1ZXN0UGVybWlzc2lvbihcImFuZHJvaWQucGVybWlzc2lvbi5DQU1FUkFcIiwgXCJZb3VyIGNhbWVyYSBpcyB1c2VkIHRvIHByb3ZpZGUgYW4gYXVnbWVudGVkIHJlYWxpdHkgZXhwZXJpZW5jZVwiKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBwZXJtaXNzaW9ucy5yZXF1ZXN0UGVybWlzc2lvbihcImFuZHJvaWQucGVybWlzc2lvbi5BQ0NFU1NfRklORV9MT0NBVElPTlwiLCBcIlRCRFwiKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc3RhcnRBcHAoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3Igb24gc3RhcnRBcHA6IFwiICsgZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZS5zdGFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDYW1lcmEgcGVybWlzc2lvbiByZWZ1c2VkLCBWdWZvcmlhIHdpbGwgbm90IGluaXRpYWxpemUgY29ycmVjdGx5XCIpO1xuICAgICAgICAgICAgc3RhcnRBcHAoKTtcbiAgICAgICAgfSk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0QXBwKCkge1xuICAgIHZhciB0b3Btb3N0ID0gZnJhbWVNb2R1bGUudG9wbW9zdCgpO1xuICAgIHZhciBuYXZpZ2F0aW9uRW50cnkgPSB7XG4gICAgICAgIG1vZHVsZU5hbWU6IFwibWFpbi1wYWdlXCIsXG4gICAgICAgIGJhY2tzdGFja1Zpc2libGU6IGZhbHNlXG4gICAgfTtcbiAgICB0b3Btb3N0Lm5hdmlnYXRlKG5hdmlnYXRpb25FbnRyeSk7XG59XG4iXX0=