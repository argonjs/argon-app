
### Build Instructions

0. Clone this repo to your computer, e.g. to an `argon-app` directory

1. Install nativescript tools via instructions at 
http://docs.nativescript.org/start/ns-setup-os-x (Mac, supports iOS and Android)
or
http://docs.nativescript.org/start/ns-setup-win (Windows, supports Android only)

   *Note that node.js is required, and Cocoapods is required for iOS development.*

2. Execute `tns install` in the `argon-app` directory

### iOS

3. Execute `tns run ios`, or execute `tns prepare ios` and open argonapp.xcworkspace (located at /argon-app/platforms/ios) in XCode

    *Note: If you have trouble deploying on the device, 
    look for a build target with the digit 2 appended to the 
    end (e.g, `argonapp 2`) and try building that instead. This seems to 
    be the result of a bug in the nativescript-cli when generating 
    the xcode project.* 

4. Debug with javascript inspector using `tns debug ios`

### Android

3. Execute `tns run android`

4. Debug with javascript inspector using `tns debug android`

### Setting up Vuforia

You'll need to build argon-app with your own Vuforia license key to enable the video background and target tracking.

1) Get a Vuforia license key here: https://library.vuforia.com/articles/Training/Vuforia-License-Manager

2) Open `argon-app/app/config.ts` and set `DEBUG_DEVELOPMENT_LICENSE_KEY` to your key string
