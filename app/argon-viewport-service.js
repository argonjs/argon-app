"use strict";
var frames = require('ui/frame');
var Argon = require("argon");
Argon.ViewportService.prototype.getSuggested = function () {
    var frame = frames.topmost();
    return {
        x: 0,
        y: 0,
        width: frame.getMeasuredWidth(),
        height: frame.getMeasuredHeight()
    };
};
//# sourceMappingURL=argon-viewport-service.js.map