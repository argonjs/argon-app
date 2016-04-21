//
//  VuforiaSession.h
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import <Foundation/Foundation.h>

typedef struct _VuforiaVec2F {
    float x;
    float y;
} VuforiaVec2F;

typedef struct _VuforiaVec2I {
    int x;
    int y;
} VuforiaVec2I;

typedef struct _VuforiaVec3F {
    float x;
    float y;
    float z;
} VuforiaVec3F;

typedef struct _VuforiaVec4F {
    float x;
    float y;
    float z;
    float w;
} VuforiaVec4F;

typedef struct _VuforiaVec4I {
    int x;
    int y;
    int z;
    int w;
} VuforiaVec4I;

typedef struct _VuforiaMatrix34 {
    float _0;
    float _1;
    float _2;
    float _3;
    float _4;
    float _5;
    float _6;
    float _7;
    float _8;
    float _9;
    float _10;
    float _11;
} VuforiaMatrix34;

/// Return codes for init() function
typedef NS_ENUM (NSInteger, VuforiaInitResult) {
    VuforiaInitResultSUCCESS = 100,                                  ///< Initialization Success
    VuforiaInitResultERROR = -1,                                ///< Error during initialization
    VuforiaInitResultDEVICE_NOT_SUPPORTED = -2,                 ///< The device is not supported
    VuforiaInitResultNO_CAMERA_ACCESS = -3,                     ///< Cannot access the camera
    VuforiaInitResultLICENSE_ERROR_MISSING_KEY = -4,            ///< License key is missing
    VuforiaInitResultLICENSE_ERROR_INVALID_KEY = -5,            ///< Invalid license key passed to SDK
    VuforiaInitResultLICENSE_ERROR_NO_NETWORK_PERMANENT = -6,   ///< Unable to verify license key due to network (Permanent error)
    VuforiaInitResultLICENSE_ERROR_NO_NETWORK_TRANSIENT = -7,   ///< Unable to verify license key due to network (Transient error)
    VuforiaInitResultLICENSE_ERROR_CANCELED_KEY = -8,           ///< Provided key is no longer valid
    VuforiaInitResultLICENSE_ERROR_PRODUCT_TYPE_MISMATCH = -9,  ///< Provided key is not valid for this product
    VuforiaInitResultEXTERNAL_DEVICE_NOT_DETECTED = -10         ///< Dependent external device not detected/plugged in
};


/// Pixel encoding types
typedef NS_ENUM (NSInteger, VuforiaPixelFormat) {
    VuforiaPixelFormatUnknown = 0,         ///< Unknown format - default pixel type for
    ///< undefined images
    VuforiaPixelFormatRGB565 = 1,                 ///< A color pixel stored in 2 bytes using 5
    ///< bits for red, 6 bits for green and 5 bits
    ///< for blue
    VuforiaPixelFormatRGB888 = 2,                 ///< A color pixel stored in 3 bytes using
    ///< 8 bits each
    VuforiaPixelFormatGRAYSCALE = 4,              ///< A grayscale pixel stored in one byte
    VuforiaPixelFormatYUV = 8,                    ///< A color pixel stored in 12 or more bits
    ///< using Y, U and V planes
    VuforiaPixelFormatRGBA8888 = 16,              ///< A color pixel stored in 32 bits using 8 bits
    ///< each and an alpha channel.
    VuforiaPixelFormatINDEXED = 32,               ///< One byte per pixel where the value maps to
    ///< a domain-specific range.
};

/// Use when calling setHint()
typedef NS_ENUM (NSInteger, VuforiaHint) {
    /// How many image targets to detect and track at the same time
    /**
     *  This hint tells the tracker how many image shall be processed
     *  at most at the same time. E.g. if an app will never require
     *  tracking more than two targets, this value should be set to 2.
     *  Default is: 1.
     */
    VuforiaHintMaxSimultaneousImageTargets = 0,
    
    /// How many object targets to detect and track at the same time
    /**
     *  This hint tells the tracker how many 3D objects shall be processed
     *  at most at the same time. E.g. if an app will never require
     *  tracking more than 1 target, this value should be set to 1.
     *  Default is: 1.
     */
    VuforiaHintMaxSimultaneousObjectTargets = 1,
    
    /// Force delayed loading for object target Dataset
    /**
     *  This hint tells the tracker to enable/disable delayed loading
     *  of object target datasets upon first detection.
     *  Loading time of large object dataset will be reduced
     *  but the initial detection time of targets will increase.
     *  Please note that the hint should be set before loading
     *  any object target dataset to be effective.
     *  To enable delayed loading set the hint value to 1.
     *  To disable delayed loading set the hint value to 0.
     *  Default is: 0.
     */
    VuforiaHintDelayedLoadingObjectDatasets = 2,
};


/// Types of storage locations for datasets
typedef NS_ENUM (NSInteger, VuforiaStorageType) {
    VuforiaStorageTypeApp,            ///< Storage private to the application
    VuforiaStorageTypeAppResource,    ///< Storage for assets bundled with the
    ///< application
    VuforiaStorageTypeAbsolute        ///< Helper type for specifying an absolute path
};

/// Types of coordinate system that can be used for poses.
typedef NS_ENUM (NSInteger, VuforiaCoordinateSystemType) {
    VuforiaCoordinateSystemTypeUnknown = 0, ///< Unknown coordinate system
    VuforiaCoordinateSystemTypeCamera = 1,  ///< Pose will be relative to the camera frame of reference
    VuforiaCoordinateSystemTypeWorld = 2,   ///< Pose will be relative to the world frame of reference
};


typedef NS_ENUM (NSInteger, VuforiaRotation) {
    VuforiaRotationIOS_90  = 128,  ///< <b>iOS:</b> Rotates rendering 90 degrees
    VuforiaRotationIOS_180 = 256,  ///< <b>iOS:</b> Rotates rendering 180 degrees
    VuforiaRotationIOS_270 = 512,  ///< <b>iOS:</b> Rotates rendering 270 degrees
    VuforiaRotationIOS_0   = 1024  ///< <b>iOS:</b> Rotates rendering 0 degrees
};


@class VuforiaState;

@interface VuforiaSession : NSObject


/// Sets Vuforia initialization parameters
/**
 <b>iOS:</b> Called to set the Vuforia initialization parameters prior to calling Vuforia::init().
 Refer to the enumeration Vuforia::INIT_FLAGS and Vuforia::IOS_INIT_FLAGS for
 applicable flags.
 Returns an integer (0 on success).
 */
+ (int) setLicenseKey:(NSString *)licenseKey;

/// Initializes Vuforia
/**
 <b>iOS:</b> Called to initialize Vuforia.  Initialization is asynchronous. The done callback
 returns 100 when initialization completes (negative number on error).
 */
+ (void) initDone: (void (^)(VuforiaInitResult))done;


/// Deinitializes Vuforia
+ (void) deinit;

/// Registers an callback to be called when new tracking data is available
+ (void) registerCallback: (void (^)(VuforiaState *))callback;

/// Sets a hint for the Vuforia SDK
/**
 *  Hints help the SDK to understand the developer's needs.
 *  However, depending on the device or SDK version the hints
 *  might not be taken into consideration.
 *  Returns false if the hint is unknown or deprecated.
 *  For a boolean value 1 means true and 0 means false.
 */
+ (BOOL) setHint: (VuforiaHint)hint value: (int)value;

+ (void) setRotation:(VuforiaRotation)rotation;

/// Enables the delivery of certain pixel formats via the State object
/**
 *  Per default the state object will only contain images in formats
 *  that are required for internal processing, such as gray scale for
 *  tracking. setFrameFormat() can be used to enforce the creation of
 *  images with certain pixel formats. Notice that this might include
 *  additional overhead.
 */
+ (bool) setFrameFormat: (VuforiaPixelFormat)format enabled: (bool) enabled;


/// Returns the number of bits used to store a single pixel of a given format
/**
 *  Returns 0 if the format is unknown.
 */
+ (int) getBitsPerPixel: (VuforiaPixelFormat)format;


/// Indicates whether the rendering surface needs to support an alpha channel
/// for transparency
+ (bool) requiresAlpha;


/// Returns the number of bytes for a buffer with a given size and format
/**
 *  Returns 0 if the format is unknown.
 */
+ (int) getBufferSize:(VuforiaVec2I)size format: (VuforiaPixelFormat)format;


/// Executes AR-specific tasks upon the onResume activity event
+ (void) onResume;


/// Executes AR-specific tasks upon the onResume activity event
+ (void) onPause;


/// Executes AR-specific tasks upon the onSurfaceCreated render surface event
+ (void) onSurfaceCreated;


/// Executes AR-specific tasks upon the onSurfaceChanged render surface event
+ (void) onSurfaceChanged:(VuforiaVec2I)size;


// The system boottime in seconds
+ (long) systemBoottime;

@end

#endif
