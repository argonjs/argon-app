import {GridLayout} from 'ui/layouts/grid-layout'
// import {layout} from 'utils/utils'
// import {screen} from 'platform/platform'

const ZERO_INSETS = {left:0,top:0,right:0,bottom:0}

export class FullscreenLayout extends GridLayout {

    applySafeAreaInsets() {
        return null
    }

    getSafeAreaInsets() {
        return ZERO_INSETS
    }

    onMeasure(widthSpec, heightSpec) {
        // widthSpec = layout.makeMeasureSpec(screen.mainScreen.widthPixels, layout.EXACTLY)
        // heightSpec = layout.makeMeasureSpec(screen.mainScreen.heightPixels, layout.EXACTLY)
        super.onMeasure(widthSpec, heightSpec)
    }

    onLayout(left, top, right, bottom) {
        // if (!this.parent && this.ios) {
        //     const nativeView = this.ios as UIView
        //     const insets = nativeView.safeAreaInsets
        //     top = top - insets.top
        //     left = left - insets.left
        // }
        // super.onLayout(0, 0, screen.mainScreen.widthPixels, screen.mainScreen.heightPixels)
        super.onLayout(left,top,right,bottom)
    }
}