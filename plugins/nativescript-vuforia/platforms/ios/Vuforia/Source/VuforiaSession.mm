//
//  VuforiaSession.m
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaSession.h"
#import "VuforiaState.h"
#import "VuforiaDevice.h"
#import "VideoView/VuforiaVideoView.h"
#import <Vuforia/Vuforia.h>
#import <Vuforia/Vuforia_iOS.h>
#import <Vuforia/UpdateCallback.h>
#import <Vuforia/State.h>
#import <Vuforia/StateUpdater.h>
#import <Vuforia/RenderingPrimitives.h>
#import <Vuforia/TrackerManager.h>


#include <sys/types.h>
#include <sys/sysctl.h>

namespace  {
    // --- Data private to this unit ---
    
    void (^mUpdateCallback)(VuforiaState *) = nil;
    void (^mRenderCallback)(VuforiaState *) = nil;
    
    VuforiaVideoView *videoView = [[VuforiaVideoView alloc] init]; // hack: VuforiaVideoView is a singleton for now
    
    CADisplayLink* _displayLink;
    
    
    // class used to support the callback mechanism
    class VuforiaApplication_UpdateCallback : public Vuforia::UpdateCallback {
        virtual void Vuforia_onUpdate(Vuforia::State& state);
    } qcarUpdate;
    
    
    dispatch_queue_attr_t attr = dispatch_queue_attr_make_with_qos_class(DISPATCH_QUEUE_SERIAL, QOS_CLASS_USER_INTERACTIVE, DISPATCH_QUEUE_PRIORITY_HIGH);
    dispatch_queue_t frameRenderingQueue = dispatch_queue_create("nativescript_vuforia_render_queue", attr);
}

@implementation VuforiaSession : NSObject

/// Sets Vuforia initialization parameters
/**
 <b>iOS:</b> Called to set the Vuforia initialization parameters prior to calling Vuforia::init().
 Refer to the enumeration Vuforia::INIT_FLAGS and Vuforia::IOS_INIT_FLAGS for
 applicable flags.
 Returns an integer (0 on success).
 */
+ (int) setLicenseKey: (NSString *)licenseKey {
    return Vuforia::setInitParameters(Vuforia::GL_20, [licenseKey cStringUsingEncoding:[NSString defaultCStringEncoding]]);
}

static bool isInit = false;

/// Initializes Vuforia
/**
 <b>iOS:</b> Called to initialize Vuforia.  Initialization is asynchronous. The done callback
 returns 100 when initialization completes (negative number on error).
 */
+ (void) initDone: (void (^)(VuforiaInitResult))done {
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        
        NSInteger initResult = 0;
        do {
            initResult = Vuforia::init();
        } while (0 <= initResult && 100 > initResult);
        
        dispatch_async(dispatch_get_main_queue(), ^{
            done((VuforiaInitResult)initResult);
            isInit = initResult == 100;
        });
    });
    
    videoView.delegate = [VuforiaSession class];
    Vuforia::registerCallback(&qcarUpdate);
    
    // After Vuforia 7, Vuforia sometimes pauses processing frames
    // and rendering the camera when a UIScrollView is scrolling.
    // So we setup our own render loop instead.
    _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(_render)];
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes]; // make it work while scrolling
    [_displayLink setPreferredFramesPerSecond:roundf(targetFPS)];
}


/// Deinitializes Vuforia
+ (void) deinit {
    isInit = false;
    [VuforiaSession onPause];
    Vuforia::deinit();
    mUpdateCallback = nil;
    mRenderCallback = nil;
    [_displayLink invalidate];
    _displayLink = nil;
}

/// Registers an callback to be called when new tracking data is available
+ (void) registerUpdateCallback: (void (^)(VuforiaState *))callback {
    mUpdateCallback = callback;
}

/// Registers an callback to be called when new tracking data is available
+ (void) registerRenderCallback: (void (^)(VuforiaState *))callback {
    mRenderCallback = callback;
}

/// Sets a hint for the Vuforia SDK
/**
 *  Hints help the SDK to understand the developer's needs.
 *  However, depending on the device or SDK version the hints
 *  might not be taken into consideration.
 *  Returns false if the hint is unknown or deprecated.
 *  For a boolean value 1 means true and 0 means false.
 */
+ (BOOL) setHint: (VuforiaHint)hint value: (int)value {
    return Vuforia::setHint(hint, value);
}

/// Set rotation
+ (void) setRotation:(VuforiaRotation)rotation {
    Vuforia::setRotation(rotation);
}

/// Enables the delivery of certain pixel formats via the State object
/**
 *  Per default the state object will only contain images in formats
 *  that are required for internal processing, such as gray scale for
 *  tracking. setFrameFormat() can be used to enforce the creation of
 *  images with certain pixel formats. Notice that this might include
 *  additional overhead.
 */
+ (bool) setFrameFormat: (VuforiaPixelFormat)format enabled: (bool) enabled {
    return Vuforia::setFrameFormat((Vuforia::PIXEL_FORMAT)format, enabled);
}


/// Returns the number of bits used to store a single pixel of a given format
/**
 *  Returns 0 if the format is unknown.
 */
+ (int) getBitsPerPixel: (VuforiaPixelFormat)format {
    return Vuforia::getBitsPerPixel((Vuforia::PIXEL_FORMAT)format);
}


/// Indicates whether the rendering surface needs to support an alpha channel
/// for transparency
+ (bool) requiresAlpha {
    return Vuforia::requiresAlpha();
}


/// Returns the number of bytes for a buffer with a given size and format
/**
 *  Returns 0 if the format is unknown.
 */
+ (int) getBufferSize: (VuforiaVec2I)size format: (VuforiaPixelFormat)format {
    return Vuforia::getBufferSize(size.x, size.y, (Vuforia::PIXEL_FORMAT)format);
}


/// Executes AR-specific tasks upon the onResume activity event
+ (void) onResume {
    Vuforia::onResume();
    dispatch_async(frameRenderingQueue, ^{
        [[VuforiaDevice getInstance] invalidateRenderingPrimitives];
    });
}


/// Executes AR-specific tasks upon the onResume activity event
+ (void) onPause {
    Vuforia::onPause();
    dispatch_async(frameRenderingQueue, ^{
        [[VuforiaDevice getInstance] invalidateRenderingPrimitives];
    });
}


/// Executes AR-specific tasks upon the onSurfaceCreated render surface event
+ (void) onSurfaceCreated {
    Vuforia::onSurfaceCreated();
}


/// Executes AR-specific tasks upon the onSurfaceChanged render surface event
+ (void) onSurfaceChangedWidth:(int)w height:(int)h {
    Vuforia::onSurfaceChanged(w, h);
    dispatch_async(frameRenderingQueue, ^{
        [[VuforiaDevice getInstance] invalidateRenderingPrimitives];
    });
}


static float scaleFactorValue = 1;

+ (void) setScaleFactor:(float)f {
    scaleFactorValue = f;
}

+ (float) scaleFactor {
    return scaleFactorValue;
}

static float targetFPS = 60;

+ (void) setTargetFPS:(float)f {
    targetFPS = f;
    if (_displayLink != nil) {
        [_displayLink setPreferredFramesPerSecond:roundf(f)];
    }
}

+ (float) targetFPS {
    return targetFPS;
}

+ (void) _update:(const Vuforia::State &)state {
//    if (mUpdateCallback) mUpdateCallback([[VuforiaState alloc] initWithCpp:&state]);
}

//+ (void) _render:(const Vuforia::State &)state {
//
//    if (mRenderCallback) mRenderCallback([[VuforiaState alloc] initWithCpp:&state]);
//}

static bool isRendering = false;

+ (void) _render {
    
    if ([[UIApplication sharedApplication] applicationState] != UIApplicationStateActive) {
        return;
    }

    dispatch_async(frameRenderingQueue, ^{
        @autoreleasepool {
            
            if (isRendering) {
                return;
            }
            
            if (!isInit) {
                return;
            }
            
            isRendering = true;
            
            Vuforia::TrackerManager &trackerManager = Vuforia::TrackerManager::getInstance();
            Vuforia::StateUpdater &stateUpdater = trackerManager.getStateUpdater();
            Vuforia::State state = stateUpdater.updateState();
            VuforiaRenderingPrimitives *renderingPrimitives = [[VuforiaDevice getInstance] getRenderingPrimitives];
            
            [videoView renderFrame:state renderingPrimitives:(Vuforia::RenderingPrimitives*)renderingPrimitives.cpp];
        
            dispatch_async(dispatch_get_main_queue(), ^{
                isRendering = false;
                if (!isInit) return;
                if (mRenderCallback) mRenderCallback([[VuforiaState alloc] initWithCpp:&state]);
            });
            
        }
    });

    
    
//    Vuforia::StateUpdater &stateUpdater = Vuforia::TrackerManager::getInstance().getStateUpdater();
//    __block Vuforia::State state = stateUpdater.updateState();
//    if (mRenderCallback) mRenderCallback([[VuforiaState alloc] initWithCpp:&state]);
//
//    dispatch_async(frameRenderingQueue, ^{//
//        @autoreleasepool {
//            [videoView renderFrame:state];
//            isRendering = false;
//        }
//    });
    
    
    

//    Vuforia::StateUpdater &stateUpdater = Vuforia::TrackerManager::getInstance().getStateUpdater();
//    __block Vuforia::State state = stateUpdater.updateState();
//    if (mRenderCallback) mRenderCallback([[VuforiaState alloc] initWithCpp:&state]);
//    dispatch_async(frameRenderingQueue, ^{//
//            [videoView renderFrame:state];
//            isRendering = false;
//    });
}

@end

////////////////////////////////////////////////////////////////////////////////
// Callback function called by the tracker when each tracking cycle has finished
void VuforiaApplication_UpdateCallback::Vuforia_onUpdate(Vuforia::State& state)
{
    [VuforiaSession _update:state];
}




#endif
