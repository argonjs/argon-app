import {View} from "ui/core/view";

const util = {
  view: {
    bringToFront: (view: View) => {
      view.android.bringToFront();
    },
  },
};

module.exports = util;
