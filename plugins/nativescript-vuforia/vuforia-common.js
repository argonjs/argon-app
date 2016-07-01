"use strict";
require('globals');
var APIBase = (function () {
    function APIBase() {
    }
    APIBase.prototype.setStateUpdateCallback = function (cb) {
        this.callback = cb;
    };
    return APIBase;
}());
exports.APIBase = APIBase;
//# sourceMappingURL=vuforia-common.js.map