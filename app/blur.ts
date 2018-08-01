import {View} from 'ui/core/view'

export const effectViewMap = new Map<View, UIVisualEffectView>()

declare type BlurEffectStyle = 'dark'|'extraDark'|'light'|'extraLight'|'regular'|'prominent';

export function blur(nsView:View, radius:number, styleName?:BlurEffectStyle, duration?:number) {
    return new Promise((resolve, reject) => {
        let iosView = nsView.ios;
        if (iosView && iosView.addSubview) {
            let style:UIBlurEffectStyle;
            if (!styleName || styleName == "dark") {
                style = UIBlurEffectStyle.Dark;
            } else if (styleName == "extraDark") {
                style = UIBlurEffectStyle.ExtraDark;
            } else if (styleName == "light") {
                style = UIBlurEffectStyle.Light;
            } else if (styleName == "extraLight") {
                style = UIBlurEffectStyle.ExtraLight;
            } else if (styleName == "regular") {
                style = UIBlurEffectStyle.Regular;
            } else if (styleName == "prominent") {
                style = UIBlurEffectStyle.Prominent;
            } else {
                // its dark if they pass a non supported style.
                style = UIBlurEffectStyle.Dark;
            }

            if (!duration) duration = 0.3;
            if (!effectViewMap.get(nsView)) {
                let iosView = nsView.ios as UIView;
                let effectView = UIVisualEffectView.alloc().init();
                effectView.frame = CGRectMake(
                    0,
                    0,
                    iosView.bounds.size.width,
                    iosView.bounds.size.height
                );
                effectView.autoresizingMask =
                    UIViewAutoresizing.FlexibleWidth |
                    UIViewAutoresizing.FlexibleHeight;
                effectViewMap.set(nsView, effectView);
                iosView.addSubview(effectView);
                iosView.sendSubviewToBack(effectView);
                UIView.animateWithDurationAnimationsCompletion(
                    duration,
                    () => {
                        effectView.effect = UIBlurEffect.effectWithStyle(
                            style
                        );
                    },
                    () => {
                        resolve();
                    }
                );
            }
        } else {
            reject("Sorry, this view cannot be made blurry.");
        }
    });
}

export function unblur(nsView:View, duration?:number) {
    return new Promise((resolve, reject) => {
        if (!duration) duration = 0.3;
        const effectView = effectViewMap.get(nsView);
        if (effectView) {
            effectViewMap.delete(nsView)
            UIView.animateWithDurationAnimationsCompletion(
                duration,
                () => {
                    delete effectView.effect;
                },
                () => {
                    effectView.removeFromSuperview();
                    resolve();
                }
            );
        } else {
            reject("It's not blurry!");
        }
    });
}