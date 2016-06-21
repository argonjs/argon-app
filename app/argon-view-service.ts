import * as application from "application";
import * as frames from 'ui/frame';
import * as vuforia from 'nativescript-vuforia';
import * as utils from 'utils/utils';
import * as enums from 'ui/enums';
import * as dialogs from 'ui/dialogs';
import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service';

import Argon = require("argon");

@Argon.DI.inject(
    Argon.SessionService, 
    Argon.FocusService, 
    Argon.ContextService,
    NativescriptVuforiaServiceDelegate)
export class NativescriptViewService extends Argon.ViewService {
    constructor(
    sessionService : Argon.SessionService, 
    focusService : Argon.FocusService,
    contextService : Argon.ContextService,
    private vuforiaDelegate : NativescriptVuforiaServiceDelegate) {
        super(sessionService, focusService, contextService);
    }

    getMaximumViewport() {
        const contentView = frames.topmost().currentPage.content;
        return {
            x:0,
            y:0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        }
    }
    
    generateViewFromFrameState(state:Argon.SerializedFrameState) {
        return this.vuforiaDelegate.getViewConfiguration(state.eye.pose);
    }
}