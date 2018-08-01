
# The ArgonXR Immersive Web Browser

This is the source code for the ArgonXR web browser, an open-standards AR-first browser for iOS and Android. It is available in [iTunes for iOS](https://itunes.apple.com/us/app/argon4/id1089308600?ls=1&mt=8) and [Google Play for Android](https://play.google.com/store/apps/details?id=edu.gatech.argon4)

*This software was created as part of a research project at the 
Augmented Environments Lab at Georgia Tech.  To support our research, 
we request that if you make use of this software, you let us know 
how you used it by sending mail to Blair MacIntyre (blair@cc.gatech.edu).*

To use ArgonXR, you create web pages using the WebXR Device API and host them on your website.

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

4. Debug with javascript inspector using `tns debug ios`

### Android

3. Execute `tns run android`

4. Debug with javascript inspector using `tns debug android`

### Setting up Vuforia

You'll need to build argon-app with your own Vuforia license key to enable the video background and target tracking.  

1) Get a Vuforia license key here: https://library.vuforia.com/articles/Training/Vuforia-License-Manager

2) Open `argon-app/app/config.ts` and set `DEBUG_VUFORIA_LICENSE_KEY` to your key string

### Limitations

You will not be able to decrypt ArgonXR Vuforia license key files created with our [Vuforia PGP Encryptor](https://docs.argonjs.io/start/vuforia-pgp-encryptor/), since we do not include the PGP key necessary for decrypting those files here.  When you build with your own Vuforia key, it is always used, and encypted PGP keys are ignored.
