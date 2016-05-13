"use strict";
var fs = require('file-system');
var openpgpPath = 'lib/openpgp.js';
var openpgpFile = fs.knownFolders.currentApp().getFile(openpgpPath);
var openpgpScript = openpgpFile.readTextSync();
global.window = global; // begin hack: ensure openpgp does not think we are running in nodejs (we arent)
// eval(openpgpScript);
// delete global.window;
// global.openpgp = module.exports;
// module.exports = exports;
global.openpgp = require('./lib/openpgp.js');
delete global.window; // end hack
var application = require("application");
application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();
//# sourceMappingURL=app.js.map