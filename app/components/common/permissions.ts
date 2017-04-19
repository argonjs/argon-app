import * as dialogs from 'ui/dialogs';

export enum PERMISSION_STATES {
    Prompt = 0, //show the user a prompt to decide whether to succeed 
    Granted,    //succeed without prompting the user     
    Denied,     //fail without prompting the user
    NotRequired //not being used by app
}

class PermissionManager {

    private locationPermission: PERMISSION_STATES;
    
    constructor() {
        this.locationPermission = PERMISSION_STATES.Prompt;
    }

    requestPermission(request: {type:string, force?:boolean}) {
        console.log("Permission requested: By " + "someone" + ", type: " + request.type);

        var currentState: PERMISSION_STATES = this.locationPermission;
        
        if (currentState === PERMISSION_STATES.Prompt || request.force) {
            dialogs.confirm({
                title: request.type + " Permission",
                message: "This app requires " + request.type + " permission.",
                okButtonText: "Grant permission",
                cancelButtonText: "Deny access",
                neutralButtonText: "Not now"
            }).then(result => {            
                if (result === undefined) {
                    //currentState = PermissionStates.Prompt;
                } else if (result) {
                    currentState = PERMISSION_STATES.Granted;
                } else {
                    currentState = PERMISSION_STATES.Denied;
                }
            });
        }

        this.locationPermission = currentState;
        console.log("Permission request for : " + request.type + " -> resulted in : " + PERMISSION_STATES[currentState])
        return currentState;        
    }
}

export const permissionManager = new PermissionManager;