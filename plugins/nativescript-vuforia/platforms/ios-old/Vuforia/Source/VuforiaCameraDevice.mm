//
//  VuforiaRenderer.m
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaCameraDevice.h"
#import <Vuforia/CameraCalibration.h>
#import <Vuforia/CameraDevice.h>


@implementation VuforiaCameraCalibration : NSObject

-(const Vuforia::CameraCalibration*)calibration {
    return (const Vuforia::CameraCalibration*)self.cpp;
}

/// Returns the resolution of the camera as 2D vector.
-(VuforiaVec2F)getSize {
    Vuforia::Vec2F v = self.calibration->getSize();
    return (VuforiaVec2F&)v;
}

/// Returns the focal length in x- and y-direction as 2D vector.
-(VuforiaVec2F)getFocalLength {
    Vuforia::Vec2F v = self.calibration->getFocalLength();
    return (VuforiaVec2F&)v;
}

/// Returns the principal point as 2D vector.
-(VuforiaVec2F)getPrincipalPoint {
    Vuforia::Vec2F v = self.calibration->getPrincipalPoint();
    return (VuforiaVec2F&)v;
}

/// Returns the radial distortion as 4D vector.
-(VuforiaVec4F)getDistortionParameters {
    Vuforia::Vec4F v = self.calibration->getDistortionParameters();
    return (VuforiaVec4F&)v;
}

/// Returns the field of view in x- and y-direction as 2D vector.
-(VuforiaVec2F)getFieldOfViewRads {
    Vuforia::Vec2F v = self.calibration->getFieldOfViewRads();
    return (VuforiaVec2F&)v;
}

- (void)dealloc {
    self.cpp = nil;
}

@end

@interface VuforiaCameraDevice ()
@property (nonatomic, assign) Vuforia::CameraDevice *cpp;
@property (nonatomic, assign) BOOL started;
@end

@implementation VuforiaCameraDevice : NSObject

static VuforiaCameraDevice *cameraDevice = nil;

/// Returns the CameraDevice singleton instance.
+(VuforiaCameraDevice*)getInstance {
    if (cameraDevice == nil) {
        cameraDevice = [[VuforiaCameraDevice alloc] init];
        cameraDevice.cpp = &Vuforia::CameraDevice::getInstance();
    }
    return cameraDevice;
}

/// Initializes the camera.
-(BOOL)initCamera:(VuforiaCameraDeviceDirection)camera {
    return self.cpp->init((Vuforia::CameraDevice::CAMERA_DIRECTION)camera);
}

/// Deinitializes the camera.
/**
 *  Any resources created or used so far are released. Note that this
 *  function should not be called during the execution of the
 *  UpdateCallback and if so will return false.
 */
-(BOOL)deinitCamera {
    return self.cpp->deinit();
}

-(BOOL)isStarted {
    return self.started;
}

/// Starts the camera. Frames are being delivered.
/**
 *  Depending on the type of the camera it may be necessary to perform
 *  configuration tasks before it can be started.
 */
-(BOOL)start {
    BOOL result = self.cpp->start();
    if (result) self.started = true;
    return result;
}

/// Stops the camera if video feed is not required (e.g. in non-AR mode
/// of an application).
-(BOOL)stop {
    BOOL result = self.cpp->stop();
    if (result) self.started = false;
    return result;
}

/// Returns the number of available video modes.
/**
 *  This is device specific and can differ between mobile devices or operating
 *  system versions.
 */
-(int)getNumVideoModes {
    return self.cpp->getNumVideoModes();
}

/// Returns the video mode currently selected.
/**
 *  If no video mode is set then Vuforia chooses a video mode.
 */
-(VuforiaVideoMode)getVideoMode:(int)nIndex {
    Vuforia::VideoMode m = self.cpp->getVideoMode(nIndex);
    return (VuforiaVideoMode&)m;
}

/// Returns the camera direction.
-(VuforiaCameraDeviceDirection)getCameraDirection {
    return (VuforiaCameraDeviceDirection)self.cpp->getCameraDirection();
}

/// Chooses a video mode out of the list of modes
/*
 *  This function can be only called after the camera device has been
 *  initialized but not started yet. Once you have started the camera and
 *  you need the select another video mode, you need to stop(), deinit(),
 *  then init() the camera before calling selectVideoMode() again.
 */
-(BOOL)selectVideoMode:(int)index {
    return self.cpp->selectVideoMode(index);
}

/// Provides read-only access to camera calibration data.
-(VuforiaCameraCalibration*)getCameraCalibration {
    VuforiaCameraCalibration *calibration = [[VuforiaCameraCalibration alloc] init];
    calibration.cpp = &self.cpp->getCameraCalibration();
    return calibration;
}

/// Enable/disable torch mode if the device supports it.
/**
 *  Returns true if the requested operation was successful, False
 *  otherwise.
 */
-(BOOL)setFlashTorchMode:(bool)on {
    return self.cpp->setFlashTorchMode(on);
}

/// Set the requested focus mode if the device supports it.
/**
 *  The allowed values are FOCUS_MODE_NORMAL, FOCUS_MODE_TRIGGERAUTO,
 *  FOCUS_MODE_CONTINUOUSAUTO, FOCUS_MODE_INFINITY, FOCUS_MODE_MACRO,
 *  though not all modes are supported on all devices. Returns true if
 *  the requested operation was successful, False otherwise.
 *  Also note that triggering a single autofocus event using
 *  FOCUS_MODE_TRIGGERAUTO may stop continuous autofocus if that focus
 *  mode was set earlier.
 */
-(BOOL)setFocusMode:(VuforiaCameraDeviceFocusMode)focusMode {
    return self.cpp->setFocusMode(focusMode);
}


- (void)dealloc {
    self.cpp = nil;
}

@end

#endif
