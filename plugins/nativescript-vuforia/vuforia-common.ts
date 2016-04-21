require('globals')
import def = require('nativescript-vuforia')
import observable = require('data/observable');
import platform = require('platform');
import application = require('application');
import utils = require('utils/utils');

export abstract class APIBase implements def.API {
    abstract setLicenseKey(licenseKey:string) : boolean;
    abstract setHint(hint:def.Hint,value:number) : boolean;
    abstract init() : Promise<def.InitResult>;
    abstract deinit() : void;
    abstract getCameraDevice() : def.CameraDevice;
    abstract getDevice() : def.Device;
    abstract getRenderer() : def.Renderer;
    abstract initObjectTracker() : boolean;
    abstract getObjectTracker() : def.ObjectTracker;
    abstract deinitObjectTracker() : boolean;
	abstract getSystemBootTime() : number;
    
    private callbacks:Array<(state:def.State)=>void> = [];
    
    protected _stateUpdateCallback(state:def.State) {
        var callbacks = this.callbacks;
        this.callbacks = [];
        callbacks.forEach((cb)=>{
            cb(state);
        });
    }

    onNextStateUpdate(cb:(state:def.State)=>void) {
        this.callbacks.push(cb);
    }
}
