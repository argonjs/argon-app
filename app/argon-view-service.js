"use strict";
var frames = require('ui/frame');
var argon_vuforia_service_1 = require('./argon-vuforia-service');
var Argon = require("argon");
var NativescriptViewService = (function (_super) {
    __extends(NativescriptViewService, _super);
    function NativescriptViewService(sessionService, focusService, contextService, vuforiaDelegate) {
        _super.call(this, sessionService, focusService, contextService);
        this.vuforiaDelegate = vuforiaDelegate;
    }
    NativescriptViewService.prototype.getMaximumViewport = function () {
        var contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        };
    };
    NativescriptViewService.prototype.generateViewFromFrameState = function (state) {
        return this.vuforiaDelegate.getViewConfiguration(state.eye.pose);
    };
    NativescriptViewService = __decorate([
        Argon.DI.inject(Argon.SessionService, Argon.FocusService, Argon.ContextService, argon_vuforia_service_1.NativescriptVuforiaServiceDelegate)
    ], NativescriptViewService);
    return NativescriptViewService;
}(Argon.ViewService));
exports.NativescriptViewService = NativescriptViewService;
//# sourceMappingURL=argon-view-service.js.map