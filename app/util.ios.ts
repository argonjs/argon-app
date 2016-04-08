import {View} from "ui/core/view";

const util = {
  view: {
    bringToFront: (view: View) => {
        view.ios.superview.bringSubviewToFront(view.ios);
    },
  },
}

module.exports = util;
