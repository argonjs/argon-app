import {Observable} from 'data/observable'
import {View} from "ui/core/view";
import * as platform from "platform";
import {Color} from "color";
import * as application from "application";
import * as utils from 'utils/utils';
import config from './config'

try {
  var ArgonPrivate = require('argon-private');
} catch (e) {}


if (application.ios) {
  application.ios.addNotificationObserver(UIApplicationDidChangeStatusBarOrientationNotification, ()=>{
    updateScreenOrientation();
    application.notify({eventName:'argonScreenOrientationChange', orientation:screenOrientation})
  })
} else {
  application.on(application.orientationChangedEvent, ()=>{
    updateScreenOrientation();
    application.notify({eventName:'argonScreenOrientationChange', orientation:screenOrientation})
  });
}

let iosSharedApplication:UIApplication;

function getNativeScreenOrientation() {
    if (application.ios) {
        iosSharedApplication = iosSharedApplication || utils.ios.getter(UIApplication, UIApplication.sharedApplication);
        const orientation = iosSharedApplication.statusBarOrientation;
        switch (orientation) {
            case UIInterfaceOrientation.Unknown:
            case UIInterfaceOrientation.Portrait: return 0;
            case UIInterfaceOrientation.PortraitUpsideDown: return 180;
            case UIInterfaceOrientation.LandscapeLeft: return 90;
            case UIInterfaceOrientation.LandscapeRight: return -90;
        }
    }
    if (application.android) {
        const context:android.content.Context = utils.ad.getApplicationContext();
        const display:android.view.Display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        const rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return -90;
            case android.view.Surface.ROTATION_270: return 90;
        }
    } 
    return 0;
}

export let screenOrientation:number = 0;

function updateScreenOrientation() {
  screenOrientation = getNativeScreenOrientation();
}

export const canDecrypt = !!ArgonPrivate;

export function decrypt(encryptedData:string) : Promise<string> {
  if (!ArgonPrivate) return Promise.reject(new Error("This build of Argon is incapable of decrypting messages."))
  return Promise.resolve().then(()=>{
    return ArgonPrivate.decrypt(encryptedData)
  }).catch((e)=>{
    throw new Error('Decyrption Error: ' + e.message)
  });
}

export function getInternalVuforiaKey() : string|undefined {
  return ArgonPrivate && ArgonPrivate.getVuforiaLicenseKey() || config.DEBUG_VUFORIA_LICENSE_KEY;
}

export function bringToFront(view: View) {
  if (view.android) {
    view.android.bringToFront();
  } else if (view.ios) {
    view.ios.superview.bringSubviewToFront(view.ios);
  }
}

export function linearGradient(view:View, colors:(Color|string)[]) {
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


/**
* TODO.
*/
export class CommandQueue extends Observable {
  private _queue: Array<{ command: Function, execute: Function, reject: (reason: any) => void }> = [];
  private _currentCommand: Function | undefined;
  private _currentCommandPending: Promise<any> | undefined;
  private _paused = true;

  /**
   * Push a command to the command queue.
   * @param command Any command ready to be pushed into the command queue.
   */
  public push<TResult>(command: () => Promise<TResult>|TResult, execute?: boolean): Promise<TResult> {
      const result = new Promise<TResult>((resolve, reject) => {
          this._queue.push({
              command,
              reject,
              execute: () => {
                  // console.log('CommandQueue: Executing command ' + command.toString());
                  const result = Promise.resolve().then(command);
                  // result.then(() => { console.log('CommandQueue: DONE ' + command.toString()) });
                  resolve(result);
                  return result;
              }
          });
      });
      if (execute || !this._paused) this.execute();
      return result;
  }

  /**
   * Execute the command queue
   */
  public execute() {
      this._paused = false;
      Promise.resolve().then(() => {
          if (this._queue.length > 0 && !this._currentCommandPending) {
              this._executeNextCommand();
          }
      });
  }

  /**
   * Puase the command queue (currently executing commands will still complete)
   */
  public pause() {
      this._paused = true;
  }

  /**
   * Clear commandQueue.
   */
  public clear() {
      this._queue.forEach((item) => {
          item.reject("Unable to execute.")
      })
      this._queue = [];
  }

  private _executeNextCommand() {
      this._currentCommand = undefined;
      this._currentCommandPending = undefined;
      if (this._paused) return;
      const item = this._queue.shift();
      if (!item) return;
      this._currentCommand = item.command;
      this._currentCommandPending = item.execute()
          .then(this._executeNextCommand.bind(this))
          .catch((e) => {
              this.notify(<any>{eventName:"error",error:e})
              this._executeNextCommand();
          });
  }

  public currentCommand() {
      return this._currentCommand
  }
}


var lut:string[] = [];
for (var i = 0; i < 256; i++) {
    lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
}
export function createGuid() {
    var d0 = Math.random() * 0xffffffff | 0;
    var d1 = Math.random() * 0xffffffff | 0;
    var d2 = Math.random() * 0xffffffff | 0;
    var d3 = Math.random() * 0xffffffff | 0;
    return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
        lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
        lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
        lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
}
