import {PermissionRequest} from '@argonjs/argon';
import * as dialogs from 'ui/dialogs';
import * as URI from 'urijs';
import applicationSettings = require('application-settings');
import {ObservableArray, ChangedData} from 'data/observable-array';
import {Observable} from 'data/observable';
import application = require('application');

export enum PERMISSION_STATES {
    Prompt = 0, //show the user a prompt to decide whether to succeed 
    Granted = 1,    //succeed without prompting the user     
    Denied = 2,     //fail without prompting the user
    NotRequired = 3 //not being used by app
}

const permissionNames = {'ar.stage': 'LOCATION', 'ar.camera': 'CAMERA'};
const permissionDescription = {'ar.stage': 'You are about to let this app know where you are on the map!', 'ar.camera': 'You are about to let this app see through your camera!'};

class PermissionItem extends Observable {
    type:string;
    hostname:string;
    
    constructor(item:{
        type:string,
        hostname:string
    }) {
        super(item);
        return this;
    }
    
    toJSON() {
        return {
            type: this.type,
            hostname: this.hostname
        }
    }
}

class PermissionManager {
    private PERMISSION_KEY = 'permission_history';

    private static locationPermission: PERMISSION_STATES;  //for testing. save state per host name ex) "app.argonjs.io"" ->should be moved to local cache

    constructor() {
        PermissionManager.locationPermission = PERMISSION_STATES.Prompt; //for testing. temp starting permission

        this.permissionList.on('change', (data) => this.updateMap(data, this.permissionMap));

        if (applicationSettings.hasKey(this.PERMISSION_KEY)) {
            const savedPermissions:Array<PermissionItem> = JSON.parse(applicationSettings.getString(this.PERMISSION_KEY));
            savedPermissions.forEach((item)=>{
                if (!this.permissionMap.has(item.hostname))
                    this.permissionList.push(new PermissionItem(item));
            });
        }

        application.on(application.suspendEvent,this.savePermissionsOnApp);
        this.permissionList.on('change', this.savePermissionsOnApp);
    }

    public requestPermission(request: PermissionRequest) { //should somehow recieve host name, also        
        console.log("Permission requested {Source: " + request.uri + ", Type: " + permissionNames[request.type] + "}");

        if (request.uri === undefined) return Promise.resolve(false);

        const hostname = URI(request.uri).hostname();

        const loadPermission = (type:string, hostname:string) => { //should get from cache based on host name
            return PermissionManager.locationPermission;
        }

        const savePermission = (type:string, hostname:string, newState: PERMISSION_STATES) => {
            PermissionManager.locationPermission = newState;
        }
        var currentState: PERMISSION_STATES = loadPermission(request.type, hostname);    //load using hostname & permission type
        if (request.force)
            currentState = PERMISSION_STATES.Prompt;

        if (currentState === PERMISSION_STATES.Prompt) {
            dialogs.confirm({
                title: permissionNames[request.type] + " Access",
                message: "This app requires " + permissionNames[request.type] + " permission.\n" + permissionDescription[request.type],
                okButtonText: "Grant permission",
                cancelButtonText: "Deny access",
                neutralButtonText: "Not now"
            }).then(result => { //Need to deal with the case where permission is granted but argon-app permission is not
                if (result === undefined) {
                    //currentState = PermissionStates.Prompt;
                } else if (result) {
                    currentState = PERMISSION_STATES.Granted;
                } else {
                    currentState = PERMISSION_STATES.Denied;
                }
            }).then(()=>{
                console.log("Permission request for : " + request.type + " -> resulted in : " + PERMISSION_STATES[currentState])
                savePermission(request.type, hostname, currentState);  //save using hostname & permission type
        
                switch(currentState) {
                    case PERMISSION_STATES.Granted:
                        return Promise.resolve(true);
                    case PERMISSION_STATES.Denied:
                    case PERMISSION_STATES.Prompt:
                        return Promise.resolve(false);
                    case PERMISSION_STATES.NotRequired:
                        return Promise.resolve(false);
                }
            });
        } else {
            switch(currentState) {
                case PERMISSION_STATES.Granted:
                    return Promise.resolve(true);
                case PERMISSION_STATES.Denied:
                    return Promise.resolve(false);
                case PERMISSION_STATES.NotRequired:
                    return Promise.resolve(false);
            }
        }
        return Promise.resolve(false);
    }


    private permissionList = new ObservableArray<PermissionItem>();
    private permissionMap = new Map<string, PermissionItem>();

    updateMap(data:ChangedData<PermissionItem>, map:Map<string, PermissionItem>) {
        const list = <ObservableArray<PermissionItem>>data.object
        for (let i=0; i < data.addedCount; i++) {
            var item = list.getItem(data.index + i);
            map.set(item.hostname, item);
        }
        data.removed && data.removed.forEach((item)=>{
            map.delete(item.hostname);
        })
    }

    savePermissionsOnApp() {
        const permissionsToSave = this.permissionList.filter((item)=>true);
        applicationSettings.setString(this.PERMISSION_KEY, JSON.stringify(permissionsToSave));
    }

}

export const permissionManager = new PermissionManager;