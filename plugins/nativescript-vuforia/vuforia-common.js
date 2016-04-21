"use strict";
require('globals');
var APIBase = (function () {
    function APIBase() {
        this.callbacks = [];
    }
    APIBase.prototype._stateUpdateCallback = function (state) {
        var callbacks = this.callbacks;
        this.callbacks = [];
        callbacks.forEach(function (cb) {
            cb(state);
        });
    };
    APIBase.prototype.onNextStateUpdate = function (cb) {
        this.callbacks.push(cb);
    };
    return APIBase;
}());
exports.APIBase = APIBase;
//# sourceMappingURL=vuforia-common.js.map