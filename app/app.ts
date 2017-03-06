import application = require("application");
if (application.android) {
    application.mainModule = "entry-page"
} else {
    application.mainModule = "main-page"
}
application.cssFile = "./app.css";
application.start();
