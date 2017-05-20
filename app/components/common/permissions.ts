import * as dialogs from 'ui/dialogs';
import * as URI from 'urijs';
import applicationSettings = require('application-settings');
import {appViewModel} from './AppViewModel';
import {
    SessionPort,
    Permission,
    PermissionType,
    PermissionState,
    PermissionNames
} from '@argonjs/argon'

const PERMISSION_KEY = 'permission_history';

class PermissionManager {
    private permissionMap = {};         // Key: hostname, Value: List of Permissions

    constructor() {
        // Initially load permissions to map from local storage
        if (applicationSettings.hasKey(PERMISSION_KEY)) {
            this.permissionMap = JSON.parse(applicationSettings.getString(PERMISSION_KEY));
            // console.log("Permissions loaded from storage: " + applicationSettings.getString(PERMISSION_KEY));
        }
    }

    handlePermissionRequest(session: SessionPort, id: string) {
        // Vuforia subscriptions & manager subscriptions
        if (PermissionNames[id] === undefined || session.uri === 'argon:manager')
            return Promise.resolve();

        console.log("Permission requested {Source: " + session.uri + ", Type: " + id + "}");

        if (session.uri === undefined)
            return Promise.reject(new Error("Invalid uri for permission request"));

        return this.getPermissionFromUser(URI(session.uri).hostname(), <PermissionType>id);
    }

    handlePermissionRequestByURI(uri: string, id: PermissionType) {
        this.getPermissionFromUser(URI(uri).hostname(), id);
    }

    private getPermissionFromUser(hostname: string, id: PermissionType) {
        const requestedPermission = new Permission(<PermissionType>id, this.getPermissionFromMap(hostname, <PermissionType>id));

        if (requestedPermission.state === PermissionState.PROMPT || requestedPermission.state === PermissionState.NOT_REQUIRED) {
            dialogs.confirm({
                title: requestedPermission.name + " Access",
                message: "This app requires " + requestedPermission.name + " access.\n" + requestedPermission.description,
                okButtonText: "Grant permission",
                cancelButtonText: "Deny access",
                neutralButtonText: "Not now"
            }).then(result => {
                let newState;
                if (result === undefined) {
                    newState = PermissionState.PROMPT;
                } else if (result) {
                    newState = PermissionState.GRANTED;
                } else {
                    newState = PermissionState.DENIED;
                }
                console.log("Permission request for : " + requestedPermission.name + " -> resulted in : " + PermissionState[newState])
                this.savePermissionOnMap(hostname, requestedPermission.type, newState);
                appViewModel.setPermission(new Permission(requestedPermission.type, newState));
                switch(newState) {
                    case PermissionState.GRANTED:
                        appViewModel.set('needReloadForPermissionChange', true);
                        return Promise.resolve();
                    case PermissionState.DENIED:
                    case PermissionState.PROMPT:
                        return Promise.reject(new Error("Permission denied by user"));
                    default:
                        return Promise.reject(new Error("Permission not handled properly!"));
                }
            });
        } else {
            console.log("Permission request for : " + requestedPermission.name + " -> resulted in : " + PermissionState[requestedPermission.state] + " (no change)")
            appViewModel.setPermission(requestedPermission);
            switch(requestedPermission.state) {
                case PermissionState.GRANTED:
                    return Promise.resolve();
                case PermissionState.DENIED:
                    return Promise.reject(new Error("Permission has not been granted"));
            }
        }
        return Promise.reject(new Error("Permission not handled properly!"));
    }

    getPermissionFromMap = (hostname: string, type: PermissionType) => {
        const newPermissionMapping = this.permissionMap[hostname];
        if (newPermissionMapping) {
            const newPermissionMap = newPermissionMapping[type];
            if (newPermissionMap) {
                return newPermissionMap.state;
            }
        }
        return PermissionState.PROMPT;    //Default to prompt if the permissions has not been asked before
    }

    savePermissionOnMap = (hostname:string, type: PermissionType, newState: PermissionState) => {
        let newPermissionMapping = this.permissionMap[hostname] || {};
        newPermissionMapping[type] = new Permission(type, newState);
        this.permissionMap[hostname] = newPermissionMapping;
        this.savePermissionsOnApp();
    }

    // public handlePermissionRevoke(session: SessionPort, id: string) {
    //     console.log("Handle permission revoke");
        
    //     if (request.uri === undefined) return Promise.reject(new Error("Illegal URI when requesting permission revoke."));

    //     const hostname = URI(request.uri).hostname();

    //     // const newPermissionItem = PermissionManager.permissionMap.get(hostname + request.type);
    //     // if (newPermissionItem === undefined) return Promise.reject(new Error("Requested revoke on not given permission! "));
    //     // let i = PermissionManager.permissionList.indexOf(<PermissionItem>newPermissionItem)
    //     // let currentState = PermissionManager.permissionList.getItem(i).state;

    //     const savePermission = (type:string, hostname:string, newState: PermissionState) => {
    //         const newPermissionItem = PermissionManager.permissionMap.get(hostname+type);
    //         if (newPermissionItem) {
    //             let i = PermissionManager.permissionList.indexOf(newPermissionItem);
    //             PermissionManager.permissionList.getItem(i).state = newState;
    //         } else {
    //             PermissionManager.permissionList.push(new PermissionItem({
    //                 hostname: hostname,
    //                 type: type,
    //                 state: newState
    //             }))
    //         }
    //     }

    //     savePermission(request.type, hostname, PermissionState.Denied);  // save using hostname & permission type
    //     appViewModel.setPermission({type: request.type, state: PermissionState.Denied});
    //     return Promise.resolve();
    // }

    private savePermissionsOnApp() {    //save permissions to local storage
        applicationSettings.setString(PERMISSION_KEY, JSON.stringify(this.permissionMap));
    }

    getPermissionStateBySession(session: SessionPort, type: PermissionType) {
        const hostname = URI(session.uri).hostname();
        const state = this.getPermissionFromMap(hostname, type);
        return state;
    }

    loadPermissionsToUI = (uri: string) => {
        // clear permission icons
        for (let i in appViewModel.permissions) {
            appViewModel.setPermission(new Permission(<PermissionType>i, PermissionState.NOT_REQUIRED));
        }

        if (uri != "") {
            const hostname = URI(uri).hostname() + URI(uri).port();
            if (hostname) {
                // load permissions to UI from map
                for (let type in this.permissionMap[hostname]) {
                    appViewModel.setPermission(this.permissionMap[hostname][type]);
                }
            }
        }
    }

}

export const permissionManager = new PermissionManager;