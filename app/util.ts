import {View} from "ui/core/view";
import * as platform from "platform";
import * as coreView from "ui/core/view";
import {Color} from "color";

export class Util {
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
        orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM,
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
