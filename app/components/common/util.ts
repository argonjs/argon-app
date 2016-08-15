import {View} from "ui/core/view";
import * as platform from "platform";
import {Color} from "color";
import * as file from 'file-system'

require( 'nativescript-webworkers' );
openpgp.initWorker({path: '~/lib/openpgp.worker.js'});

const privateFolder = file.knownFolders.currentApp().getFolder('private');
const privatePGPKeyFileName = 'argonjs-priv.asc';
const configFileName = "config.json";

const privateKeyPromise = new Promise<openpgp.key.Key>((resolve, reject) => {
  if (!privateFolder.contains(privatePGPKeyFileName)) reject(new Error("This build of Argon is incapable of decrypting messages."))
  const privateKeyFile = privateFolder.getFile(privatePGPKeyFileName);
  resolve(privateKeyFile.readText().then((privateKeyArmored)=>{
    let privateKey = openpgp.key.readArmored(privateKeyArmored).keys[0];
    const passphrase = Util.getConfigToken('argonjs.pgpKeyPassword')!;
    return openpgp.decryptKey({
      privateKey,
      passphrase
    }).then(({key}) => {
      return key;
    });
  }))
})

export class Util {

  static getConfigToken(key:string) : string|undefined {
    const containsPrivateKey = privateFolder.contains(configFileName);
    if (!containsPrivateKey) 
      return undefined;
    const keysFile = privateFolder.getFile(configFileName);
    const keys = JSON.parse(keysFile.readTextSync());
    return keys && keys[key];
  }

  static canDecrypt() : boolean { 
    return privateFolder.contains(privatePGPKeyFileName);
  }

  static decrypt<T>(encryptedData:string) : Promise<T> {
    return privateKeyPromise.then((key)=>{
      return openpgp.decrypt({
        message: openpgp.message.readArmored(encryptedData),
        privateKey: key
      });
    }).then((plaintext)=>{
      const jsonString = plaintext['data'];
      const json = JSON.parse(jsonString);
      alert(jsonString);
      return json;
    });
  }

  static getInternalVuforiaKey() : string|undefined {
    return Util.getConfigToken('vuforia.key');
  }

  static bringToFront(view: View) {
    if (view.android) {
      view.android.bringToFront();
    } else if (view.ios) {
      view.ios.superview.bringSubviewToFront(view.ios);
    }
  }

  static linearGradient(view:View, colors:(Color|string)[]) {
    var _colors:any[] = [];
    var nativeView = view['_nativeView'];

    if (!nativeView) {
      return;
    }

    colors.forEach(function (c, idx) {
      if (!(c instanceof Color)) {
        colors[idx] = new Color(c);
      }
    });

    if (platform.device.os === platform.platformNames.android) {
      var backgroundDrawable = nativeView.getBackground(),
        LINEAR_GRADIENT = 0;

      colors.forEach(function (c:Color) {
        _colors.push(c.android);
      });

      if (!(backgroundDrawable instanceof android.graphics.drawable.GradientDrawable)) {
        backgroundDrawable = new android.graphics.drawable.GradientDrawable();
        backgroundDrawable.setColors(_colors);
        backgroundDrawable.setGradientType(LINEAR_GRADIENT);
        nativeView.setBackgroundDrawable(backgroundDrawable);
      }
    } else if (platform.device.os === platform.platformNames.ios) {
      var iosView:UIView = view.ios;
      var colorsArray = NSMutableArray.alloc().initWithCapacity(2);
      colors.forEach(function (c:Color) {
        colorsArray.addObject(interop.types.id(c.ios.CGColor));
      });
      var gradientLayer = CAGradientLayer.layer();
      gradientLayer.colors = colorsArray;
      gradientLayer.frame = iosView.bounds;
      iosView.layer.insertSublayerAtIndex(gradientLayer, 0);
    }
  }
}
