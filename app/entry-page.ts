import permissions = require('nativescript-permissions');
import * as application from 'application'
import {AppRootView} from './app'

export function pageLoaded(args) {
    return permissions.requestPermission("android.permission.CAMERA", "Your camera is used to provide an augmented reality experience")
        .then(function() {
            return permissions.requestPermission("android.permission.ACCESS_FINE_LOCATION", "TBD")
            .then(function() {
                startApp();
            })
            .catch(function(e) {
                console.log("Error on startApp: " + e);
                console.log(e.stack);
            });
        })
        .catch(function() {
            console.log("Camera permission refused, Vuforia will not initialize correctly");
            startApp();
        });
}

function startApp() {
    application._resetRootView(AppRootView)
    // application._resetRootView('app-root')
}
