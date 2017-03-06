"use strict";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnktcGFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVudHJ5LXBhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHNDQUF5QztBQUN6QyxzREFBeUQ7QUFFekQsb0JBQTJCLElBQUk7SUFDM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsRUFBRSxnRUFBZ0UsQ0FBQztTQUM5SCxJQUFJLENBQUM7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLHlDQUF5QyxFQUFFLEtBQUssQ0FBQzthQUNyRixJQUFJLENBQUM7WUFDRixRQUFRLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxVQUFTLENBQUM7WUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDO1NBQ0QsS0FBSyxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO1FBQ2hGLFFBQVEsRUFBRSxDQUFDO0lBQ2YsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBaEJELGdDQWdCQztBQUVEO0lBQ0ksSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BDLElBQUksZUFBZSxHQUFHO1FBQ2xCLFVBQVUsRUFBRSxXQUFXO1FBQ3ZCLGdCQUFnQixFQUFFLEtBQUs7S0FDMUIsQ0FBQztJQUNGLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDdEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcmFtZU1vZHVsZSA9IHJlcXVpcmUoXCJ1aS9mcmFtZVwiKTtcbmltcG9ydCBwZXJtaXNzaW9ucyA9IHJlcXVpcmUoJ25hdGl2ZXNjcmlwdC1wZXJtaXNzaW9ucycpO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFnZUxvYWRlZChhcmdzKSB7XG4gICAgcmV0dXJuIHBlcm1pc3Npb25zLnJlcXVlc3RQZXJtaXNzaW9uKFwiYW5kcm9pZC5wZXJtaXNzaW9uLkNBTUVSQVwiLCBcIllvdXIgY2FtZXJhIGlzIHVzZWQgdG8gcHJvdmlkZSBhbiBhdWdtZW50ZWQgcmVhbGl0eSBleHBlcmllbmNlXCIpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHBlcm1pc3Npb25zLnJlcXVlc3RQZXJtaXNzaW9uKFwiYW5kcm9pZC5wZXJtaXNzaW9uLkFDQ0VTU19GSU5FX0xPQ0FUSU9OXCIsIFwiVEJEXCIpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzdGFydEFwcCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciBvbiBzdGFydEFwcDogXCIgKyBlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLnN0YWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNhbWVyYSBwZXJtaXNzaW9uIHJlZnVzZWQsIFZ1Zm9yaWEgd2lsbCBub3QgaW5pdGlhbGl6ZSBjb3JyZWN0bHlcIik7XG4gICAgICAgICAgICBzdGFydEFwcCgpO1xuICAgICAgICB9KTtcbn1cblxuZnVuY3Rpb24gc3RhcnRBcHAoKSB7XG4gICAgdmFyIHRvcG1vc3QgPSBmcmFtZU1vZHVsZS50b3Btb3N0KCk7XG4gICAgdmFyIG5hdmlnYXRpb25FbnRyeSA9IHtcbiAgICAgICAgbW9kdWxlTmFtZTogXCJtYWluLXBhZ2VcIixcbiAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogZmFsc2VcbiAgICB9O1xuICAgIHRvcG1vc3QubmF2aWdhdGUobmF2aWdhdGlvbkVudHJ5KTtcbn1cbiJdfQ==