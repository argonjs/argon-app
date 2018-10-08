//
//  VuforiaState.h
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import <Foundation/Foundation.h>
#import "VuforiaSession.h"

@interface VuforiaImage : NSObject
/// Returns the width of the image in pixels
/**
 *  getWidth() returns the number of pixels in the pixel buffer that make up
 *  the used image area. The pixel buffer can be wider than this. Use
 *  getBufferWidth() to find out the real width of the pixel buffer.
 */
-(int)getWidth;

/// Returns the height of the image in pixels
/**
 *  getHeight() returns the number of pixel rows in the pixel buffer that
 *  make up the used image area. The pixel buffer can have more rows than
 *  that. Use getBufferHeight() to find out the real number of rows that fit
 *  into the buffer.
 */
-(int)getHeight;

/// Returns the number bytes from one row of pixels to the next row
/**
 *  Per default the stride is number-of-pixels times bytes-per-pixel.
 *  However, in some cases there can be additional padding bytes at
 *  the end of a row (e.g. to support power-of-two textures).
 */
-(int)getStride;

/// Returns the number of pixel columns that fit into the pixel buffer
/**
 *  Per default the number of columns that fit into the pixel buffer
 *  is identical to the width of the image.
 *  However, in some cases there can be additional padding columns at
 *  the right side of an image (e.g. to support power-of-two textures).
 */
-(int)getBufferWidth;

/// Returns the number of rows that fit into the pixel buffer
/**
 *  Per default the number of rows that fit into the pixel buffer
 *  is identical to the height of the image.
 *  However, in some cases there can be additional padding rows at
 *  the bottom of an image (e.g. to support power-of-two textures).
 */
-(int)getBufferHeight;

/// Returns the pixel format of the image
-(VuforiaPixelFormat)getFormat;

/// Provides read-only access to pixel data
-(const void*)getPixels;
@end

@interface VuforiaFrame : NSObject
/// A time stamp that defines when the original camera image was shot
/**
 *  Value in seconds representing the offset to application startup time.
 *  Independent from image creation the time stamp always refers to the time
 *  the camera image was shot.
 */
-(double)getTimeStamp;

/// Index of the frame
-(int)getIndex;

/// Number of images in the images-array
-(int)getNumImages;

/// Read-only access to an image
-(VuforiaImage*)getImage:(int)idx;
@end

@class VuforiaTrackable;
@class VuforiaTrackableResult;
@class VuforiaDeviceTrackableResult;
@class VuforiaCameraCalibration;


@interface VuforiaIllumination : NSObject

@property (nonatomic, assign) const void *cpp;

/// Returned by getAmbientIntensity() when data is not available.
+(float)AMBIENT_INTENSITY_UNAVAILABLE;

/// Returned by getAmbientColorTemperature() when data is not available.
+(float)AMBIENT_COLOR_TEMPERATURE_UNAVAILABLE;

/// Get the scene's ambient intensity.
/**
 * \returns The current ambient intensity of the scene, in Lumens, or
 * AMBIENT_INTENSITY_UNAVAILABLE if the value is not available on the current
 * platform.
 */
-(float)getAmbientIntensity;

/// Get the scene's ambient color temperature.
/**
 * \returns The current color temperature of the scene, in Kelvin, or
 * AMBIENT_COLOR_TEMPERATURE_UNAVAILABLE if the value is not available on
 * the current platform.
 */
-(float)getAmbientColorTemperature;

@end

@interface VuforiaState : NSObject
- (id) initWithCpp:(const void*)cpp;
- (const void*) cpp;
/// Returns the Frame object that is stored in the State
- (VuforiaFrame*) getFrame;
/// Returns the number of Trackable objects currently known to the SDK
- (int) getNumTrackables;
/// Provides access to a specific Trackable
- (VuforiaTrackable*) getTrackable:(int)idx;
/// Returns the number of Trackable objects currently being tracked
- (int) getNumTrackableResults;
/// Provides access to a specific TrackableResult object.
- (VuforiaTrackableResult*) getTrackableResult:(int)idx;


/// Get the camera calibration for this State, if available.
/**
 * \returns Camara calibration information for this State, or NULL if no
 * camera calibration was available when this State was captured.
 *
 * The returned object is only valid as long as the State
 * object is valid. Do not keep a copy of the pointer!
 */
- (VuforiaCameraCalibration*) getCameraCalibration;

/// Get illumination information for this State (if available).
/**
 * \returns An Illumination instance containing illumination information for
 * this State, or NULL if no illumination information is available.
 *
 * The returned object is only valid as long as the State
 * object is valid. Do not keep a copy of the pointer!
 */
-(VuforiaIllumination*)getIllumination;

/// Get the DeviceTrackableResult, if it exists.
/**
 * This is a convenience method that provides easy access to the
 * DeviceTrackableResult, if a DeviceTracker has been started.
 *
 * \note The DeviceTrackableResult is also available via getTrackableResult().
 *
 * \note The returned object is only valid as long as the State
 * object is valid. Do not keep a copy of the pointer!
 *
 * \returns the DeviceTrackableResult, or NULL if no DeviceTracker
 * is running.
 */
-(VuforiaDeviceTrackableResult*)getDeviceTrackableResult;
@end

#endif
