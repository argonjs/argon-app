import {View} from "ui/core/view";

const util = {
  view: {
    bringToFront: (view: View) => {
        view._ios.superview.bringSubviewToFront(view._ios);
    },
  },
}

module.exports = util;
