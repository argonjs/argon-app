
import * as Argon from "@argonjs/argon";
import * as vuforia from 'nativescript-vuforia';

// TODO: move this logic into a separate interface rather than extending ViewService
Argon.DI.inject(Argon.ContainerElement, Argon.SessionService, Argon.ContextService, Argon.FocusService)
export class NativescriptViewService extends Argon.ViewService {
    constructor(
        container, 
        sessionService:Argon.SessionService, 
        contextService:Argon.ContextService, 
        focusService:Argon.FocusService) {
        super(container, sessionService, contextService, focusService);
    }
    
    _requestEnterHMD(session:Argon.SessionPort) {
        this._ensurePersmission(session);
        const device = vuforia.api && vuforia.api.getDevice();
        if (device && device.setViewerActive(true)) {
            return Promise.resolve();
        }
        throw new Error("Unable to enter HMD mode");
    }

    _requestExitHmd(session:Argon.SessionPort) {
        this._ensurePersmission(session);
        const device = vuforia.api && vuforia.api.getDevice();
        if (device && device.setViewerActive(false)) {
            return Promise.resolve();
        }        
        throw new Error("Unable to exit HMD mode");
    }

    public _isHmdActive() {
        const device = vuforia.api && vuforia.api.getDevice();
        return device.isViewerActive();
    }

    
    _requestEnterFullscreen(session:Argon.SessionPort) {
        this._ensurePersmission(session);
        throw new Error("Unable to enter Fullscreen mode");
    }

    _requestExitFullscreen(session:Argon.SessionPort) {
        this._ensurePersmission(session);
        throw new Error("Unable to exit HMD mode");
    }

    _isFullscreen() {
        return false;
    }
    
    _requestEnterMaximized(session:Argon.SessionPort) {
        this._ensurePersmission(session);
        throw new Error("Unable to enter Maximized mode");
    }

    _requestExitMaximized(session:Argon.SessionPort) {
        this._ensurePersmission(session);
        throw new Error("Unable to exit HMD mode");
    }

    _isMaximized() {
        return true;
    }

}