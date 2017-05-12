import {PermissionTypes, PermissionRequest} from '@argonjs/argon';
import * as dialogs from 'ui/dialogs';
import * as URI from 'urijs';
import applicationSettings = require('application-settings');
import {ObservableArray, ChangedData} from 'data/observable-array';
import {Observable} from 'data/observable';
// import application = require('application');
import {appViewModel} from './AppViewModel';

export enum PERMISSION_STATES {
    Prompt = 0, //show the user a prompt to decide whether to succeed 
    Granted = 1,    //succeed without prompting the user     
    Denied = 2,     //fail without prompting the user
    NotRequired = 3 //not being used by app
}

const permissionNames = {'ar.stage': 'LOCATION', 'ar.camera': 'CAMERA'};
const permissionDescription = {'ar.stage': 'You are about to grant this app your location!', 'ar.camera': 'You are about to let this app see through your camera!'};
const PERMISSION_KEY = 'permission_history';

class PermissionItem extends Observable {
    hostname:string;
    type:string;
    state:PERMISSION_STATES;
    
    constructor(item:{
        hostname:string,
        type:string,
        state:PERMISSION_STATES
    }) {
        super(item);
        return this;
    }
    
    toJSON() {
        return {
            hostname: this.hostname,
            type: this.type,            
            state: this.state        
        }
    }
}

class PermissionManager {
    static permissionList = new ObservableArray<PermissionItem>(); //local temp list of permissions
    static permissionMap = new Map<string, PermissionItem>(); //string: hostname+type / PermissionItem: item itself

    constructor() {
        PermissionManager.permissionList.on('change', (data) => this.updateMap(data, PermissionManager.permissionMap));   //update map when list has changed

        if (applicationSettings.hasKey(PERMISSION_KEY)) {
            const savedPermissions:Array<PermissionItem> = JSON.parse(applicationSettings.getString(PERMISSION_KEY));
            savedPermissions.forEach((item)=>{
                if (!PermissionManager.permissionMap.has(item.hostname + item.type))
                    PermissionManager.permissionList.push(new PermissionItem(item));
            });
            console.log("Number of Permission Items loaded: " + savedPermissions.length);
        }

        // application.on(application.suspendEvent,this.savePermissionsOnApp); //save permissions when app is suspended (do we need this?)
        PermissionManager.permissionList.on('change', this.savePermissionsOnApp);    //save permissions when permissions have changed
    }

    public handlePermissionRequest(request: PermissionRequest) {     
        console.log("Permission requested {Source: " + request.uri + ", Type: " + permissionNames[request.type] + "}");

        if (request.uri === undefined) return Promise.resolve(false);

        const hostname = URI(request.uri).hostname();

        const loadPermission = (type:string, hostname:string) => {
            const newPermissionItem = PermissionManager.permissionMap.get(hostname + type);
            if (newPermissionItem) {    //if permission record exists
                let i = PermissionManager.permissionList.indexOf(newPermissionItem)
                // console.log("getoldstate:"+PermissionManager.permissionList.getItem(i).state);
                return PermissionManager.permissionList.getItem(i).state;
            } else {
                // console.log("new state loaded with default")
                return PERMISSION_STATES.Prompt;    //Default to prompt if the permissions has not been asked before
            }
        }

        const savePermission = (type:string, hostname:string, newState: PERMISSION_STATES) => {
            const newPermissionItem = PermissionManager.permissionMap.get(hostname+type);
            if (newPermissionItem) {
                let i = PermissionManager.permissionList.indexOf(newPermissionItem);
                PermissionManager.permissionList.getItem(i).state = newState;
                // console.log("change old state to:" + PermissionManager.permissionList.getItem(i).state)
                // PermissionManager.permissionList.notifyPropertyChange('change', null);
            } else {
                PermissionManager.permissionList.push(new PermissionItem({
                    hostname: hostname,
                    type: type,
                    state: newState
                }))
                // console.log("new item saved, should trigger update map")
            }
        }

        let currentState: PERMISSION_STATES = loadPermission(request.type, hostname);    //load using hostname & permission type
        
        if (currentState === PERMISSION_STATES.Prompt) {
            dialogs.confirm({
                title: permissionNames[request.type] + " Access",
                message: "This app requires " + permissionNames[request.type] + " permission.\n" + permissionDescription[request.type],
                okButtonText: "Grant permission",
                cancelButtonText: "Deny access",
                neutralButtonText: "Not now"
            }).then(result => { //Need to deal with the case where permission is granted but argon-app permission is not
                if (result === undefined) {
                    currentState = PERMISSION_STATES.Prompt;                    
                } else if (result) {
                    currentState = PERMISSION_STATES.Granted;
                } else {
                    currentState = PERMISSION_STATES.Denied;
                }
            }).then(()=>{
                console.log("Permission request for : " + request.type + " -> resulted in : " + PERMISSION_STATES[currentState])
                savePermission(request.type, hostname, currentState);  //save using hostname & permission type
                appViewModel.setPermission({type: request.type, state: currentState});
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
            // console.log("Permission request for : " + request.type + " -> resulted in : " + PERMISSION_STATES[currentState] + " (no change)")
            appViewModel.setPermission({type: request.type, state: currentState});
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

    loadPermissions = (url: string) => {
        const hostname = URI(url).hostname();
        PermissionTypes.forEach((type) => {
            const newPermissionItem = PermissionManager.permissionMap.get(hostname + type);
            if (newPermissionItem) {    //if permission record exists
                let i = PermissionManager.permissionList.indexOf(newPermissionItem)
                appViewModel.setPermission({type: type, state: PermissionManager.permissionList.getItem(i).state});
            } else {
                appViewModel.setPermission({type: type, state: PERMISSION_STATES.NotRequired});
            }
        })
    }

    updateMap(data:ChangedData<PermissionItem>, map:Map<string, PermissionItem>) {
        const list = <ObservableArray<PermissionItem>>data.object
        for (let i=0; i < data.addedCount; i++) {
            var item = list.getItem(data.index + i);
            map.set(item.hostname + item.type, item);
        }
        data.removed && data.removed.forEach((item)=>{
            map.delete(item.hostname + item.type);
        })
    }

    savePermissionsOnApp() {    //save permissions to local storage
        const permissionsToSave = PermissionManager.permissionList.map((item)=>item);
        applicationSettings.setString(PERMISSION_KEY, JSON.stringify(permissionsToSave));
        // console.log(""+ permissionsToSave.length + "permission items saved to cache")
    }

}

export const permissionManager = new PermissionManager;