"use strict";
var platform = require("platform");
var color_1 = require("color");
var file = require('file-system');
require('nativescript-webworkers');
openpgp.initWorker({ path: '~/lib/openpgp.worker.js' });
var privateFolder = file.knownFolders.currentApp().getFolder('private');
var privatePGPKeyFileName = 'argonjs-priv.asc';
var configFileName = "config.json";
var privateKeyPromise = new Promise(function (resolve, reject) {
    if (!privateFolder.contains(privatePGPKeyFileName))
        reject(new Error("This build of Argon is incapable of decrypting messages."));
    var privateKeyFile = privateFolder.getFile(privatePGPKeyFileName);
    resolve(privateKeyFile.readText().then(function (privateKeyArmored) {
        var privateKey = openpgp.key.readArmored(privateKeyArmored).keys[0];
        var passphrase = Util.getConfigToken('argonjs.pgpKeyPassword');
        return openpgp.decryptKey({
            privateKey: privateKey,
            passphrase: passphrase
        }).then(function (_a) {
            var key = _a.key;
            return key;
        });
    }));
});
var Util = (function () {
    function Util() {
    }
    Util.getConfigToken = function (key) {
        var containsPrivateKey = privateFolder.contains(configFileName);
        if (!containsPrivateKey)
            return undefined;
        var keysFile = privateFolder.getFile(configFileName);
        var keys = JSON.parse(keysFile.readTextSync());
        return keys && keys[key];
    };
    Util.canDecrypt = function () {
        return privateFolder.contains(privatePGPKeyFileName);
    };
    Util.decrypt = function (encryptedData) {
        return privateKeyPromise.then(function (key) {
            return openpgp.decrypt({
                message: openpgp.message.readArmored(encryptedData),
                privateKey: key
            });
        }).then(function (plaintext) {
            var jsonString = plaintext['data'];
            var json = JSON.parse(jsonString);
            alert(jsonString);
            return json;
        });
    };
    Util.getInternalVuforiaKey = function () {
        return Util.getConfigToken('vuforia.key');
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