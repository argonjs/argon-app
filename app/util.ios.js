"use strict";
var util = {
    view: {
        bringToFront: function (view) {
            view._ios.superview.bringSubviewToFront(view._ios);
        },
    },
};
module.exports = util;
//# sourceMappingURL=util.ios.js.map