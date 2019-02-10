//
//  VuforiaRenderer.h
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import <Foundation/Foundation.h>
#import "VuforiaSession.h"

typedef NS_ENUM (NSInteger, VuforiaVideoBackgroundReflection) {
    VuforiaVideoBackgroundReflectionDefault,  ///< Allows the SDK to set the recommended reflection settings for the current camera
    VuforiaVideoBackgroundReflectionOn,       ///< Overrides the SDK recommendation to force a reflection
    VuforiaVideoBackgroundReflectionOff       ///< Overrides the SDK recommendation to disable reflection
};


/// Video background configuration
typedef struct _VuforiaVideoBackgroundConfig {
    /// Relative position of the video background in the render target in
    /// pixels.
    /**
     *  Describes the offset of the center of video background to the
     *  center of the screen (viewport) in pixels. A value of (0,0) centers the
     *  video background, whereas a value of (-10,15) moves the video background
     *  10 pixels to the left and 15 pixels upwards.
     */
    int positionX;
    int positionY;
    
    /// Width and height of the video background in pixels
    /**
     *  Using the device's screen size for this parameter scales the image to
     *  fullscreen. Notice that if the camera's aspect ratio is different than
     *  the screen's aspect ratio this will create a non-uniform stretched
     *  image.
     */
    int sizeX;
    int sizeY;
} VuforiaVideoBackgroundConfig;

typedef NS_OPTIONS (NSInteger, VuforiaFPSHint)
{
    //// No FPS hint defined
    VuforiaFPSHintNone = 0,
    
    /// The application does not draw the video background (in optical see-
    /// through AR or VR mode). Do not set this flag when in video see-
    /// through AR mode.
    VuforiaFPSHintNoVideoBackground = 1 << 0,
    
    /// The application requests conservative power consumption to reduce
    /// heat accumulation and increase battery life. On some devices this
    /// may be at the cost of reduced application performance and decreased
    /// quality of experience.
    VuforiaFPSHintPowerEfficiency = 1 << 1,
    
    /// The application uses content that requires a high rendering rate,
    /// E.g. using smooth character animation or updating a physics engine.
    VuforiaFPSHintFast = 1 << 2,
    
    /// Default flags used by Vuforia to determine FPS settings
    VuforiaFPSHintDefaultFlags = VuforiaFPSHintNone
};

@interface VuforiaRenderer : NSObject

/// Configures the layout of the video background (location/size on screen
+(void)setVideoBackgroundConfig:(VuforiaVideoBackgroundConfig)cfg;

/// Retrieves the current layout configuration of the video background
+(VuforiaVideoBackgroundConfig)getVideoBackgroundConfig;

/// Set a target rendering frame rate in frames per second
/**
 *  Request a rendering frame rate that the application should target in its
 *  render loop. It is not guaranteed that the application and the device
 *  are able to deliver this frame rate. Use a fixed application setting such
 *  as '30', or '60' or query Renderer::getDefaultFps() to get
 *  a recommended fps setting from Vuforia. Use TARGET_FPS_CONTINUOUS to set
 *  continuous rendering if supported by given platform. Returns true if the
 *  rate was set successfully, false otherwise.
 */
+(BOOL)setTargetFps:(int)fps;

/// Query recommended rendering frame rate based on application hints
/**
 *  The target rendering frame rate of an AR or VR application is an
 *  important trade-off between optimal experience and device power usage.
 *  The choice is influenced by multiple parameters including device type,
 *  the active Trackers, the camera and/or sensor frame rates. Furthermore
 *  there are application specific trade offs to consider. These hints can be
 *  passed to the function as parameters (see FPS_HINT_FLAGS). For example,
 *  an application with animated content may need consistent 60 fps rendering
 *  even on a device that can only deliver poses at 30 fps. getDefaultFps
 *  considers the device parameters as well as the application specific hints
 *  and returns a recommended frame rate. The returned value can then be set
 *  via setTargetFps. Note that getDefaultFps may return different values
 *  tuned to the active CameraDevice::Mode and active Trackers. Thus it is
 *  recommended to call this API after the application has completed the
 *  camera and tracker setup as well as when an application transitions
 *  between modes (For example when transitioning between AR to VR modes)
 */
+(int)getRecommendedFps:(VuforiaFPSHint)flags;

@end

#endif
