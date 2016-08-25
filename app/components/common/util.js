"use strict";
var platform = require("platform");
var color_1 = require("color");
try {
    var ArgonPrivate = require('argon-private');
}
catch (e) { }
var Util = (function () {
    function Util() {
    }
    Util.canDecrypt = function () {
        return !!ArgonPrivate;
    };
    Util.decrypt = function (encryptedData) {
        if (!ArgonPrivate)
            return Promise.reject(new Error("This build of Argon is incapable of decrypting messages."));
        return Promise.resolve().then(function () {
            return ArgonPrivate.decrypt(encryptedData);
        });
    };
    Util.getInternalVuforiaKey = function () {
        return ArgonPrivate && ArgonPrivate.getVuforiaLicenseKey();
    };
    Util.bringToFront = function (view) {
        if (view.android) {
            view.android.bringToFront();
        }
        else if (view.ios) {
            view.ios.superview.bringSubviewToFront(view.ios);
        }
    };
    Util.linearGradient = function (view, colors) {
        var _colors = [];
        var nativeView = view['_nativeView'];
        if (!nativeView) {
            return;
        }
        colors.forEach(function (c, idx) {
            if (!(c instanceof color_1.Color)) {
                colors[idx] = new color_1.Color(c);
            }
        });
        if (platform.device.os === platform.platformNames.android) {
            var backgroundDrawable = nativeView.getBackground(), LINEAR_GRADIENT = 0;
            colors.forEach(function (c) {
                _colors.push(c.android);
            });
            if (!(backgroundDrawable instanceof android.graphics.drawable.GradientDrawable)) {
                backgroundDrawable = new android.graphics.drawable.GradientDrawable();
                backgroundDrawable.setColors(_colors);
                backgroundDrawable.setGradientType(LINEAR_GRADIENT);
                nativeView.setBackgroundDrawable(backgroundDrawable);
            }
        }
        else if (platform.device.os === platform.platformNames.ios) {
            var iosView = view.ios;
            var colorsArray = NSMutableArray.alloc().initWithCapacity(2);
            colors.forEach(function (c) {
                colorsArray.addObject(interop.types.id(c.ios.CGColor));
            });
            var gradientLayer = CAGradientLayer.layer();
            gradientLayer.colors = colorsArray;
            gradientLayer.frame = iosView.bounds;
            iosView.layer.insertSublayerAtIndex(gradientLayer, 0);
        }
    };
    return Util;
}());
exports.Util = Util;
function ipToString(inAddr) {
    if (!inAddr) {
        throw new Error('in == NULL');
    }
    if (inAddr.s_addr === 0x00000000) {
        return '*';
    }
    else {
        return NSString.stringWithCStringEncoding(inet_ntoa(inAddr), 1).toString();
    }
}
function getIPAddressOfInterface($interface) {
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
                if (NSString.stringWithUTF8String(temp_addrPtr[0].ifa_name).toString() == $interface) {
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
exports.getIPAddressOfInterface = getIPAddressOfInterface;
//# sourceMappingURL=util.js.map