"use strict";
var platform = require("platform");
var color_1 = require("color");
try {
    var ArgonPrivate = require('argon-private');
}
catch (e) { }
// const privateKeyPromise = new Promise<openpgp.key.Key>((resolve, reject) => {
//   if (!ArgonPrivate) reject(new Error("This build of Argon is incapable of decrypting messages."))
//     let privateKey = openpgp.key.readArmored(ArgonPrivate.getPrivateKey()).keys[0];
//     const passphrase = ArgonPrivate.getPrivateKeyPassphrase();
//     resolve(openpgp.decryptKey({
//       privateKey,
//       passphrase
//     }).then(({key}) => {
//       return key;
//     }).catch((err)=>{
//       alert(err.message);
//     }));
// })
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
//# sourceMappingURL=util.js.map