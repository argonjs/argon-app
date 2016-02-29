// Copyright 2015 Georgia Tech Research Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// This software was created as part of a research project at the
// Augmented Environments Lab at Georgia Tech.  To support our research, we
// request that if you make use of this software, you let us know how
// you used it by sending mail to Blair MacIntyre (blair@cc.gatech.edu).

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaVideoViewController.h"

@implementation VuforiaVideoViewController

@synthesize vapp, eaglView;

- (id)initWithApplicationSession:(VuforiaApplicationSession*) applicationSession
{
    self = [super init];
    if (self) {
        vapp = applicationSession;
        // Video view is fixed to the screen size, and does not autorotate
        eaglView = [[VuforiaVideoView alloc] initWithFrame:CGRectZero appSession:vapp];
    }
    return self;
}


- (void)dealloc
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (UIInterfaceOrientation) orientation {
    return [[UIApplication sharedApplication] statusBarOrientation];
}

- (void)loadView
{
    [self setView: eaglView];
    eaglView.frame = [vapp fixedWindowBounds];
}

- (void) handleRotation {
    // The view should be fixed in portrait orientation
    eaglView.center = [eaglView.superview convertPoint:eaglView.window.center fromView:nil];
    
    UIInterfaceOrientation startOrientation = [self orientation];
    if (startOrientation == UIInterfaceOrientationPortrait)
    {
        eaglView.transform = CGAffineTransformMakeRotation(0);
    }
    else if (startOrientation == UIInterfaceOrientationPortraitUpsideDown)
    {
        eaglView.transform = CGAffineTransformMakeRotation(M_PI);
    }
    else if (startOrientation == UIInterfaceOrientationLandscapeLeft)
    {
        eaglView.transform = CGAffineTransformMakeRotation(M_PI_2);
    }
    else if (startOrientation == UIInterfaceOrientationLandscapeRight)
    {
        eaglView.transform = CGAffineTransformMakeRotation(-M_PI_2);
    }
}

- (void)viewDidLoad
{
    [super viewDidLoad];
}

- (void)viewWillDisappear:(BOOL)animated
{
    [vapp stopCamera];

    // Be a good OpenGL ES citizen: now that QCAR is paused and the render
    // thread is not executing, inform the root view controller that the
    // EAGLView should finish any OpenGL ES commands
    [eaglView finishOpenGLESCommands];
    
    [super viewWillDisappear:animated];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (void)viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];
    [self handleRotation];
}

- (void)viewWillTransitionToSize:(CGSize)size withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)coordinator
{
    [super viewWillTransitionToSize:size withTransitionCoordinator:coordinator];
    
    CGAffineTransform transform = [coordinator targetTransform];
    CGAffineTransform invertedRotation = CGAffineTransformInvert(transform);
    
    // offset rotation to ensure that animation is in the correct direction when rotation is 180°
    CGAffineTransform tinyRotation = CGAffineTransformMakeRotation(-0.0001);
    CGAffineTransform almostFinalRotation = CGAffineTransformConcat(transform, tinyRotation);
    CGAffineTransform almostFinalInvertedRotation = CGAffineTransformInvert(almostFinalRotation);
    
    CGAffineTransform almostFinalTransform = CGAffineTransformConcat(self.view.transform, almostFinalInvertedRotation);
    CGAffineTransform finalTransform = CGAffineTransformConcat(self.view.transform, invertedRotation);
    
    [coordinator animateAlongsideTransition:^(id<UIViewControllerTransitionCoordinatorContext> context)
    {
//        eaglView.center = eaglView.superview.center;
        eaglView.center = [eaglView.superview convertPoint:eaglView.window.center fromView:nil];
        eaglView.transform = almostFinalTransform;
    }
                                 completion:^(id<UIViewControllerTransitionCoordinatorContext> context)
    {
        eaglView.transform = finalTransform;
    }];
}

@end

#endif