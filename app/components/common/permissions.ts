import * as dialogs from 'ui/dialogs';

export enum PERMISSION_STATES {
    Prompt = 0, //show the user a prompt to decide whether to succeed 
    Granted,    //succeed without prompting the user     
    Denied,     //fail without prompting the user
    NotRequired //not being used by app
}

class PermissionManager {

    private locationPermission: PERMISSION_STATES;  //for testing. save state per host name ex) "app.argonjs.io"" ->should be moved to local cache
    
    constructor() {
        this.locationPermission = PERMISSION_STATES.Prompt; //for testing. temp starting permission
    }

    requestPermission(request: {type:string, force?:boolean}) { //should somehow recieve host name, also
        console.log("Permission requested: By " + "someone" + ", type: " + request.type);

        var currentState: PERMISSION_STATES = this.loadPermission();    //load using hostname & permission type
        if (request.force) currentState = PERMISSION_STATES.Prompt;

        if (currentState === PERMISSION_STATES.Prompt) {
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

        
        console.log("Permission request for : " + request.type + " -> resulted in : " + PERMISSION_STATES[currentState])
        this.savePermission(currentState);  //save using hostname & permission type
        return currentState;        
    }

    savePermission(newState: PERMISSION_STATES) {
        this.locationPermission = newState;
    }

    loadPermission() { //should get from cache based on host name
        return this.locationPermission;
    }
}

export const permissionManager = new PermissionManager;