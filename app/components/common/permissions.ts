import {PermissionRequest} from '@argonjs/argon';
import * as dialogs from 'ui/dialogs';
import * as URI from 'urijs';


export enum PERMISSION_STATES {
    Prompt = 0, //show the user a prompt to decide whether to succeed 
    Granted = 1,    //succeed without prompting the user     
    Denied = 2,     //fail without prompting the user
    NotRequired = 3 //not being used by app
}

const permissionNames = {'ar.stage': 'LOCATION', 'ar.camera': 'CAMERA'};
const permissionDescription = {'ar.stage': 'You are about to let this app know where you are on the map!', 'ar.camera': 'You are about to let this app see through your camera!'};


class PermissionManager {

    private static locationPermission: PERMISSION_STATES;  //for testing. save state per host name ex) "app.argonjs.io"" ->should be moved to local cache

    constructor() {
        PermissionManager.locationPermission = PERMISSION_STATES.Prompt; //for testing. temp starting permission

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


}

export const permissionManager = new PermissionManager;