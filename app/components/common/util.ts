import {View} from "ui/core/view";
import * as platform from "platform";
import {Color} from "color";

try {
  var ArgonPrivate = require('argon-private');
} catch (e) {}

export class Util {

  static canDecrypt() : boolean { 
    return !!ArgonPrivate;
  }

  static decrypt(encryptedData:string) : Promise<string> {
    if (!ArgonPrivate) return Promise.reject(new Error("This build of Argon is incapable of decrypting messages."))
    return Promise.resolve().then(()=>{
      return ArgonPrivate.decrypt(encryptedData)
    });
  }

  static getInternalVuforiaKey() : string|undefined {
    return ArgonPrivate && ArgonPrivate.getVuforiaLicenseKey();
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

declare const inet_ntoa:any;
declare const getifaddrs:any;
declare const sockaddr_in:any;
declare const freeifaddrs:any;

function ipToString(inAddr) {
    if (!inAddr) {
        throw new Error('in == NULL');
    }

    if (inAddr.s_addr === 0x00000000) {
        return '*';
    } else {
        return NSString.stringWithCStringEncoding(inet_ntoa(inAddr), 1).toString();
    }
}

export function getIPAddressOfInterface($interface) {
    var address = '-';
    if (!$interface) {
        return address;
    }

    var interfacesPtrPtr = new interop.Reference();

    if (getifaddrs(interfacesPtrPtr) === 0) {
        var interfacesPtr = interfacesPtrPtr[0];
        var temp_addrPtr = interfacesPtr;

        while (temp_addrPtr != null) {
            if (temp_addrPtr[0].ifa_addr[0].sa_family === 2) {
                var name = NSString.stringWithUTF8String(temp_addrPtr[0].ifa_name).toString().trim();
                if (name == $interface) {
                    var ifa_addrPtr = temp_addrPtr[0].ifa_addr;
                    var ifa_addrPtrAsSockAddtr_in = new interop.Reference(sockaddr_in, ifa_addrPtr);
                    address = ipToString(ifa_addrPtrAsSockAddtr_in[0].sin_addr);
                }
            }
            temp_addrPtr = temp_addrPtr[0].ifa_next;
        }

        freeifaddrs(interfacesPtr);
    }
    return address;
}