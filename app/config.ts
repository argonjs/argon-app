import {debug} from './environment'

export default {
    "DEBUG": debug,
    "DEBUG_VUFORIA_LICENSE_KEY": "", // your vuforia license key goes here for development!
    "DEBUG_DISABLE_ORIGIN_CHECK": true,
    "ENABLE_PERMISSION_CHECK": true,    //Enable permission checks,
    "MISSING_VUFORIA_KEY_MESSAGE": "\nCongrats,\nYou have successfully built the Argon Browser! \n\nUnfortunately, it looks like you are missing a Vuforia License Key. Please supply your own key in \"app/config.ts\", and try building again!\n\n:D"
}