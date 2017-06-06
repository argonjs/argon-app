import * as dialogs from 'ui/dialogs';
import * as URI from 'urijs';
import applicationSettings = require('application-settings');
import {appViewModel} from './AppViewModel';
import {
    SessionPort,
    Permission,
    PermissionType,
    PermissionState
} from '@argonjs/argon'

const PERMISSION_KEY = 'permission_history';

export const PermissionNames = {
        'geolocation': 'Location',
        'camera': 'Camera',
        'world-structure': 'Structural mesh'
    };

export const PermissionDescriptions = {
        'geolocation': 'your location', 
        'camera': 'your camera',
        'world-structure': 'the structure of your surroundings'
    };

class PermissionManager {
    private permissionMap = {};         // Key: identifier(=hostname+port), Value: List of Permissions
    private lastUsedOptions = {};        // Key: identifier(=hostname+port), Value: List of last used Options
    constructor() {
        // Initially load permissions to map from local storage
        if (applicationSettings.hasKey(PERMISSION_KEY)) {
            this.permissionMap = JSON.parse(applicationSettings.getString(PERMISSION_KEY));
            // console.log("Permissions loaded from storage: " + applicationSettings.getString(PERMISSION_KEY));
        }
    }

    handlePermissionRequest(session: SessionPort, id: string, options: any) {
        // Always allow when the request is about Vuforia subscriptions & manager subscriptions
        if ((id !== 'ar.stage' && id !== 'camera' && id !=='world-structure') || session.uri === 'argon:manager')
            return Promise.resolve();

        id = id === 'ar.stage' ? 'geolocation' : id;
        let type: PermissionType = <PermissionType>id;
        
        console.log("Permission requested {Source: " + session.uri + ", Type: " + type + "}");

        if (session.uri === undefined)
            return Promise.reject(new Error("Invalid uri for permission request"));

        const hostname = URI(session.uri).hostname();
        const port = URI(session.uri).port();
        const identifier = hostname + port;
        const requestedPermission = new Permission(type, this.getPermissionFromMap(identifier, type));
        this.saveLastUsedOption(session.uri, requestedPermission.type, options);

        if (requestedPermission.state === PermissionState.PROMPT || requestedPermission.state === PermissionState.NOT_REQUIRED) {
            return dialogs.confirm({
                title: PermissionNames[requestedPermission.type] + " Request",
                message: "Will you allow " + hostname + ( port ? (":" + port):"") + " to access " + PermissionDescriptions[requestedPermission.type] + "?",
                cancelButtonText: "Not now",
                neutralButtonText: "Deny access",
                okButtonText: "Grant access"
            }).then(result => {
                let newState;
                if (result === undefined) { // neutral button (2nd button on iOS)
                    newState = PermissionState.DENIED;
                } else if (result) {        // ok button (3rd button on iOS)
                    newState = PermissionState.GRANTED;
                } else {                    // cancel button (1st button on iOS)
                    newState = PermissionState.PROMPT;
                }
                console.log("Permission request for : " + PermissionNames[requestedPermission.type] + " -> resulted in : " + PermissionState[newState])
                this.savePermissionOnMap(identifier, requestedPermission.type, newState);
                appViewModel.setPermission(new Permission(requestedPermission.type, newState));
                switch(newState) {
                    case PermissionState.GRANTED:
                        return Promise.resolve();
                    case PermissionState.DENIED:
                    case PermissionState.PROMPT:
                        return Promise.reject(new Error("Permission denied by user"));
                    default:
                        return Promise.reject(new Error("Permission not handled properly!"));
                }
            });
        } else {
            console.log("Permission request for : " + PermissionNames[requestedPermission.type] + " -> resulted in : " + PermissionState[requestedPermission.state] + " (no change)")
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

    getPermissionFromMap = (identifier: string, type: PermissionType) => {
        const newPermissionMapping = this.permissionMap[identifier];
        if (newPermissionMapping) {
            const newPermissionMap = newPermissionMapping[type];
            if (newPermissionMap) {
                return newPermissionMap.state;
            }
        }
        return PermissionState.PROMPT;    //Default to prompt if the permissions has not been asked before
    }

    savePermissionOnMap = (identifier:string, type: PermissionType, newState: PermissionState) => {
        let newPermissionMapping = this.permissionMap[identifier] || {};
        newPermissionMapping[type] = new Permission(type, newState);
        this.permissionMap[identifier] = newPermissionMapping;
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
        if (session && session.uri && session.uri != "") {
            const identifier = URI(session.uri).hostname() + URI(session.uri).port();;
            const state = this.getPermissionFromMap(identifier, type);
            return state;
        }
        return PermissionState.NOT_REQUIRED;
    }

    loadPermissionsToUI = (uri?: string) => {
        // clear permission icons
        for (let i in appViewModel.permissions) {
            appViewModel.setPermission(new Permission(<PermissionType>i, PermissionState.NOT_REQUIRED));
        }

        if (uri) {
            const identifier = URI(uri).hostname() + URI(uri).port();
            if (identifier) {
                // load permissions to UI from map
                for (let type in this.permissionMap[identifier]) {
                    appViewModel.setPermission(this.permissionMap[identifier][type]);
                }
            }
        }
    }

    saveLastUsedOption(uri: string, type: PermissionType, option: any) {
        const identifier = URI(uri).hostname() + URI(uri).port();
        let tempMap = this.lastUsedOptions[identifier] || {};
        tempMap[type] = option;
        this.lastUsedOptions[identifier] = tempMap;
    }

    getLastUsedOption(uri: string|undefined, type: PermissionType) {
        if (uri) {
            const identifier = URI(uri).hostname() + URI(uri).port();
            return this.lastUsedOptions[identifier][type];
        }
    }
}

export const permissionManager = new PermissionManager;