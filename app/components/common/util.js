"use strict";
var platform = require("platform");
var color_1 = require("color");
var application = require("application");
var utils = require("utils/utils");
try {
    var ArgonPrivate = require('argon-private');
}
catch (e) { }
function getDisplayOrientation() {
    if (application.ios) {
        var orientation = utils.ios.getter(UIApplication, UIApplication.sharedApplication).statusBarOrientation;
        switch (orientation) {
            case 0 /* Unknown */:
            case 1 /* Portrait */: return 0;
            case 2 /* PortraitUpsideDown */: return 180;
            case 4 /* LandscapeLeft */: return 90;
            case 3 /* LandscapeRight */: return -90;
        }
    }
    if (application.android) {
        var context = utils.ad.getApplicationContext();
        var display = context.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay();
        var rotation = display.getRotation();
        switch (rotation) {
            case android.view.Surface.ROTATION_0: return 0;
            case android.view.Surface.ROTATION_180: return 180;
            case android.view.Surface.ROTATION_90: return 90;
            case android.view.Surface.ROTATION_270: return -90;
        }
    }
    return 0;
}
exports.getDisplayOrientation = getDisplayOrientation;
function canDecrypt() {
    return !!ArgonPrivate;
}
exports.canDecrypt = canDecrypt;
function decrypt(encryptedData) {
    if (!ArgonPrivate)
        return Promise.reject(new Error("This build of Argon is incapable of decrypting messages."));
    return Promise.resolve().then(function () {
        return ArgonPrivate.decrypt(encryptedData);
    });
}
exports.decrypt = decrypt;
function getInternalVuforiaKey() {
    return ArgonPrivate && ArgonPrivate.getVuforiaLicenseKey();
}
exports.getInternalVuforiaKey = getInternalVuforiaKey;
function bringToFront(view) {
    if (view.android) {
        view.android.bringToFront();
    }
    else if (view.ios) {
        view.ios.superview.bringSubviewToFront(view.ios);
    }
}
exports.bringToFront = bringToFront;
function linearGradient(view, colors) {
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
}
exports.linearGradient = linearGradient;
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
exports.getIPAddressOfInterface = getIPAddressOfInterface;
//# sourceMappingURL=util.js.map