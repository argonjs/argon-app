
Build Instructions

0. Clone this repo to your computer, making sure you have the 
https://github.com/argonjs/argon repo adjacent to this repo 

    Suggested directory structure: 
    
        ├── argon-project
            ├── argon
            └── argon-app (this repo)
            
    *Note: Once the argon repo is open-sourced and available on `npm`, 
    this step will no longer be necessary.* 

1. Install nativescript tools via instructions at 
http://docs.nativescript.org/start/ns-setup-os-x (node.js and 
Cocoapods is required). 

2. Execute `tns install` in the `argon-app` directory

iOS

3. Execute `tns run ios`, or execute `tns prepare ios` and open argonapp.xcworkspace (located at /argon-app/platforms/ios) in XCode

    *Note: If you have trouble deploying on the device, 
    look for a build target with the digit 2 appended to the 
    end (e.g, `argonapp 2`) and try building that instead. This seems to 
    be the result of a bug in the nativescript-cli when generating 
    the xcode project.* 

4. Debug with javascript inspector using `tns debug ios`

Android

3. Execute `tns run android`

4. Debug with javascript inspector using `tns debug android`
