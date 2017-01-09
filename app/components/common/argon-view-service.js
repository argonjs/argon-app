"use strict";
var Argon = require("@argonjs/argon");
var vuforia = require("nativescript-vuforia");
// TODO: move this logic into a separate interface rather than extending ViewService
Argon.DI.inject(Argon.ContainerElement, Argon.SessionService, Argon.ContextService, Argon.FocusService);
var NativescriptViewService = (function (_super) {
    __extends(NativescriptViewService, _super);
    function NativescriptViewService(container, sessionService, contextService, focusService) {
        return _super.call(this, container, sessionService, contextService, focusService) || this;
    }
    NativescriptViewService.prototype._requestEnterHMD = function (session) {
        this._ensurePersmission(session);
        var device = vuforia.api && vuforia.api.getDevice();
        if (device && device.setViewerActive(true)) {
            return Promise.resolve();
        }
        throw new Error("Unable to enter HMD mode");
    };
    NativescriptViewService.prototype._requestExitHmd = function (session) {
        this._ensurePersmission(session);
        var device = vuforia.api && vuforia.api.getDevice();
        if (device && device.setViewerActive(false)) {
            return Promise.resolve();
        }
        throw new Error("Unable to exit HMD mode");
    };
    NativescriptViewService.prototype._isHmdActive = function () {
        var device = vuforia.api && vuforia.api.getDevice();
        return device.isViewerActive();
    };
    NativescriptViewService.prototype._requestEnterFullscreen = function (session) {
        this._ensurePersmission(session);
        throw new Error("Unable to enter Fullscreen mode");
    };
    NativescriptViewService.prototype._requestExitFullscreen = function (session) {
        this._ensurePersmission(session);
        throw new Error("Unable to exit HMD mode");
    };
    NativescriptViewService.prototype._isFullscreen = function () {
        return false;
    };
    NativescriptViewService.prototype._requestEnterMaximized = function (session) {
        this._ensurePersmission(session);
        throw new Error("Unable to enter Maximized mode");
    };
    NativescriptViewService.prototype._requestExitMaximized = function (session) {
        this._ensurePersmission(session);
        throw new Error("Unable to exit HMD mode");
    };
    NativescriptViewService.prototype._isMaximized = function () {
        return true;
    };
    return NativescriptViewService;
}(Argon.ViewService));
exports.NativescriptViewService = NativescriptViewService;
//# sourceMappingURL=argon-view-service.js.map