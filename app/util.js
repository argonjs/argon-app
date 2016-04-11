"use strict";
var Util = (function () {
    function Util() {
    }
    Util.bringToFront = function (view) {
        if (view.android) {
            view.android.bringToFront();
        }
        else if (view.ios) {
            view.ios.superview.bringSubviewToFront(view.ios);
        }
    };
    return Util;
}());
exports.Util = Util;
//# sourceMappingURL=util.js.map