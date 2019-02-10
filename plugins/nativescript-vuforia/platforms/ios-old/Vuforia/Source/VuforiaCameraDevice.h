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

typedef NS_ENUM (NSInteger, VuforiaCameraDeviceMode) {
    VuforiaCameraDeviceModeDefault = -1,                ///< Default camera mode
    VuforiaCameraDeviceModeOptimizeSpeed = -2,         ///< Fast camera mode
    VuforiaCameraDeviceModeOpimizeQuality = -3,       ///< High-quality camera mode
};

typedef NS_ENUM (NSInteger, VuforiaCameraDeviceFocusMode) {
    VuforiaCameraDeviceFocusModeNormal,           ///< Default focus mode
    VuforiaCameraDeviceFocusModeTriggerAuto,      ///< Triggers a single autofocus operation
    VuforiaCameraDeviceFocusModeContinuousAuto,   ///< Continuous autofocus mode
    VuforiaCameraDeviceFocusModeInfinite,         ///< Focus set to infinity
    VuforiaCameraDeviceFocusModeMacro             ///< Macro mode for close-up focus
};

typedef NS_ENUM (NSInteger, VuforiaCameraDeviceDirection) {
    VuforiaCameraDeviceDirectionDefault,   /// Default camera direction (device-specific, usually maps to back camera)
    VuforiaCameraDeviceDirectionBack,      /// The camera is facing in the opposite direction as the screen
    VuforiaCameraDeviceDirectionFront,     /// The camera is facing in the same direction as the screen
};

typedef struct _VuforiaVideoMode {
    int width;
    int height;
    float framerate;
} VuforiaVideoMode;

@interface VuforiaCameraCalibration : NSObject

@property (nonatomic, assign) const void *cpp;

/// Returns the resolution of the camera as 2D vector.
-(VuforiaVec2F)getSize;

/// Returns the focal length in x- and y-direction as 2D vector.
-(VuforiaVec2F)getFocalLength;

/// Returns the principal point as 2D vector.
-(VuforiaVec2F)getPrincipalPoint;

/// Returns the radial distortion as 4D vector.
-(VuforiaVec4F)getDistortionParameters;

/// Returns the field of view in x- and y-direction as 2D vector.
-(VuforiaVec2F)getFieldOfViewRads;

@end

@interface VuforiaCameraDevice : NSObject

/// Returns the CameraDevice singleton instance.
+(VuforiaCameraDevice*)getInstance;

-(BOOL)isStarted;

/// Initializes the camera.
-(BOOL)initCamera:(VuforiaCameraDeviceDirection)camera;

/// Deinitializes the camera.
/**
 *  Any resources created or used so far are released. Note that this
 *  function should not be called during the execution of the
 *  UpdateCallback and if so will return false.
 */
-(BOOL)deinitCamera;

/// Starts the camera. Frames are being delivered.
/**
 *  Depending on the type of the camera it may be necessary to perform
 *  configuration tasks before it can be started.
 */
-(BOOL)start;

/// Stops the camera if video feed is not required (e.g. in non-AR mode
/// of an application).
-(BOOL)stop;

/// Returns the number of available video modes.
/**
 *  This is device specific and can differ between mobile devices or operating
 *  system versions.
 */
-(int)getNumVideoModes;

/// Returns the video mode currently selected.
/**
 *  If no video mode is set then Vuforia chooses a video mode.
 */
-(VuforiaVideoMode)getVideoMode:(int)nIndex;

/// Returns the camera direction.
-(VuforiaCameraDeviceDirection)getCameraDirection;

/// Chooses a video mode out of the list of modes
/*
 *  This function can be only called after the camera device has been
 *  initialized but not started yet. Once you have started the camera and
 *  you need the select another video mode, you need to stop(), deinit(),
 *  then init() the camera before calling selectVideoMode() again.
 */
-(BOOL)selectVideoMode:(int)index;

/// Provides read-only access to camera calibration data.
-(VuforiaCameraCalibration*)getCameraCalibration;

/// Enable/disable torch mode if the device supports it.
/**
 *  Returns true if the requested operation was successful, False
 *  otherwise.
 */
-(BOOL)setFlashTorchMode:(bool)on;

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
-(BOOL)setFocusMode:(VuforiaCameraDeviceFocusMode)focusMode;

@end

#endif
