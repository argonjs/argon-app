import {Observable, PropertyChangeData} from 'data/observable';
import {View, ViewBase} from 'ui/core/view'
import {GridLayout} from 'ui/layouts/grid-layout'
import {Layout} from 'ui/layouts/layout'
import {filterControl} from '../common/bookmarks'
import {Color} from 'color/color'
// import {Placeholder} from 'ui/placeholder';


class BookmarksViewModel extends Observable {
    index = 0;
    setIndex(value:number) {
        this.set('index', value);
    }
    showFilteredResults = false;
}

let bookmarksView:GridLayout;
let tabsLayout:Layout;

const viewModel = new BookmarksViewModel;

export function onLoaded(args) {
    bookmarksView = args.object;
    bookmarksView.bindingContext = viewModel;

    if (bookmarksView.ios) {
        bookmarksView.backgroundColor = new Color(0, 0,0,0);

        class BlurView extends GridLayout {

            _blurView:UIView;
            _vibrancyView:UIVisualEffectView;

            constructor() {
                super();
                
                let blurEffect = UIBlurEffect.effectWithStyle(UIBlurEffectStyle.Prominent);
                let blurEffectView = UIVisualEffectView.alloc().initWithEffect(blurEffect);
        
                let vibrancyEffect = UIVibrancyEffect.effectForBlurEffect(blurEffect);
                let vibrancyEffectView = UIVisualEffectView.alloc().initWithEffect(vibrancyEffect);
                blurEffectView.contentView.addSubview(vibrancyEffectView);

                this.nativeViewProtected = blurEffectView;
                this._blurView = blurEffectView;
                this._vibrancyView = vibrancyEffectView;
            }

            public _addViewToNativeVisualTree(child: ViewBase, atIndex?: number): boolean {
                try {
                    this.nativeViewProtected = this._vibrancyView.contentView;
                    var result = super._addViewToNativeVisualTree(child, atIndex);
                } finally {
                    this.nativeViewProtected = this._blurView;
                }
                return result;
            }

            onLayout(left, top, right, bottom) {
                super.onLayout(left, top, right, bottom);
                this._vibrancyView.frame = this._blurView.bounds;
                this._vibrancyView.autoresizingMask = UIViewAutoresizing.FlexibleWidth & UIViewAutoresizing.FlexibleHeight;
            }
        }

        // var blurView = new Placeholder();
        // blurView.on('creatingView', (e)=>{
        //     e.view = blurEffectView;
        // });
        var blurView = new BlurView;
    
        // setTimeout(()=>{
            var child = bookmarksView.getChildAt(0);
            bookmarksView.removeChild(child);
            bookmarksView.addChild(blurView);
            // bookmarksView.addChild(child);
            
            var clear = new Color(0, 255,255,255);
            const makeClear = (child:View)=>{
                child.backgroundColor = clear;
                child.eachChild(makeClear);
                return true;
            };

            setTimeout(()=>{
                bookmarksView.eachChild(makeClear);}, 1000)
            
            blurView.addChild(child)
            
            // blurView.addChild(child);
        // },2000);
        
        // (bookmarksView.ios as UIView).insertSubviewAtIndex(blurEffectView, 0) //if you have more UIViews, use an ins
    }
}

export function onTabLayoutLoaded(args) {
    tabsLayout = args.object;
}

export function onTabSelect(args) {
    const tab:View = args.object;
    const index = tabsLayout.getChildIndex(tab);
    viewModel.setIndex(index);
}

filterControl.on('propertyChange', (evt:PropertyChangeData) => {
    viewModel.set('showFilteredResults', filterControl.showFilteredResults);
});