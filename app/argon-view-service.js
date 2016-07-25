"use strict";
var frames = require('ui/frame');
var Argon = require("argon");
var NativescriptViewService = (function (_super) {
    __extends(NativescriptViewService, _super);
    function NativescriptViewService(sessionService, focusService, contextService) {
        _super.call(this, undefined, sessionService, focusService, contextService);
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
    NativescriptViewService = __decorate([
        Argon.DI.inject(Argon.SessionService, Argon.FocusService, Argon.ContextService)
    ], NativescriptViewService);
    return NativescriptViewService;
}(Argon.ViewService));
exports.NativescriptViewService = NativescriptViewService;
//# sourceMappingURL=argon-view-service.js.map