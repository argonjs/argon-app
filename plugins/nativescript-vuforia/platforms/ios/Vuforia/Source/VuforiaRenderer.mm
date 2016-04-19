//
//  VuforiaRenderer.m
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaRenderer.h"
#import <Vuforia/VideoBackgroundConfig.h>
#import <Vuforia/Renderer.h>

@implementation VuforiaRenderer

/// Configures the layout of the video background (location/size on screen
+(void)setVideoBackgroundConfig:(VuforiaVideoBackgroundConfig)cfg {
    Vuforia::VideoBackgroundConfig c;
    c.mEnabled = cfg.enabled;
    c.mPosition.data[0] = cfg.positionX;
    c.mPosition.data[1] = cfg.positionY;
    c.mSize.data[0] = cfg.sizeX;
    c.mSize.data[1] = cfg.sizeY;
    Vuforia::Renderer::getInstance().setVideoBackgroundConfig(c);
}

/// Retrieves the current layout configuration of the video background
+(VuforiaVideoBackgroundConfig)getVideoBackgroundConfig {
    Vuforia::VideoBackgroundConfig c = Vuforia::Renderer::getInstance().getVideoBackgroundConfig();
    VuforiaVideoBackgroundConfig cfg = {
        .enabled = c.mEnabled,
        .positionX = c.mPosition.data[0],
        .positionY = c.mPosition.data[1],
        .sizeX = c.mSize.data[0],
        .sizeY = c.mSize.data[1]
    };
    return cfg;
}

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
+(BOOL)setTargetFps:(int)fps {
    return Vuforia::Renderer::getInstance().setTargetFps(fps);
}

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
+(int)getRecommendedFps:(VuforiaFPSHint)flags {
    return Vuforia::Renderer::getInstance().getRecommendedFps((int)flags);
}

@end

#endif