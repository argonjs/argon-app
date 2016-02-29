declare module "nativescript-vuforia" {
    
    import observable = require('data/observable');
    
    // events
        
    export const events:observable.Observable;

    export const initErrorEvent:string;
    export const loadDataSetErrorEvent:string;
    export const unloadDataSetErrorEvent:string;
    export const activateDataSetErrorEvent:string;
    export const deactivateDataSetErrorEvent:string;

    export const stateUpdateEvent:string;
    export const dataSetLoadEvent:string;
    
    export interface EventData extends observable.EventData {
        message:string,
        code?:number
    }
    
    export interface DataSetLoadEventData extends observable.EventData {
        url:string,
        trackables: {
            [name:string]:{
                id:string,
                name:string,
                size:number[]
            }
        }
    }
    
    export interface StateUpdateEventData extends observable.EventData {
        state:any
    }
    
    // native objects
    
    export const ios:VuforiaApplicationSession;
    export const android:any;
    
    // api
    
    export function isSupported() : boolean;
    export function init(licenseKey:string) : void|PromiseLike<void>;
    export function deinit() : void|PromiseLike<void>;
    export function startCamera() : void|PromiseLike<void>;
    export function stopCamera() : void|PromiseLike<void>;
    export function startObjectTracker() : void|PromiseLike<void>;
    export function stopObjectTracker() : void|PromiseLike<void>;
    export function hintMaxSimultaneousImageTargets(max:number) : void|PromiseLike<void>
    export function setVideoBackgroundConfig(videoConfig:VideoBackgroundConfig) : void|PromiseLike<void>;
    export function setViewSize(viewSize:ViewSize) : void|PromiseLike<void>;
    export function loadDataSet(url:string) : void|PromiseLike<void>;
    export function unloadDataSet(url:string) : void|PromiseLike<void>;
    export function activateDataSet(url:string) : void|PromiseLike<void>;
    export function deactivateDataSet(url:string) : void|PromiseLike<void>;
    
    // getters
    
    export function getVideoMode() : VideoMode;
    
    export function getCameraCalibration() : CameraCalibration;
    
    export function getVideoBackgroundConfig() : VideoBackgroundConfig;
    
    export function getViewSize() : ViewSize;
    
    // util
    
    export function getInterfaceOrientation() : number;
    
    // interfaces
    
    export interface VideoMode {
        width: number;
        height: number;
        framerate: number;
    }
    
    export interface VideoBackgroundConfig {
        enabled:boolean;
        positionX:number;
        positionY:number;
        sizeX:number;
        sizeY:number;
    }
    
    export interface ViewSize {
        width:number,
        height:number
    }
    
    export interface CameraCalibration {
        sizeX:number;
        sizeY:number;
        focalLengthX:number;
        focalLengthY:number;
        principalPointX:number;
        principalPointY:number;
        distortionParameterA?:number;
        distortionParameterB?:number;
        distortionParameterC?:number;
        distortionParameterD?:number;
        fieldOfViewRadX:number;
        fieldOfViewRadY:number;
    }
    
}