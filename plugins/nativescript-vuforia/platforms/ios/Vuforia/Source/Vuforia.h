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

#import <UIKit/UIKit.h>

@class VuforiaVideoViewController;

#if !(TARGET_IPHONE_SIMULATOR)

typedef NS_ENUM (NSInteger, VuforiaCameraDeviceMode) {
    VuforiaCameraDeviceModeDefault = -1,                ///< Default camera mode
    VuforiaCameraDeviceModeOptimizeSpeed = -2,         ///< Fast camera mode
    VuforiaCameraDeviceModeOptimizeQuality = -3,       ///< High-quality camera mode
};

typedef NS_ENUM (NSInteger, VuforiaCameraDeviceFocusMode) {
    VuforiaCameraDeviceFocusModeNormal,           ///< Default focus mode
    VuforiaCameraDeviceFocusModeTriggerAuto,      ///< Triggers a single autofocus operation
    VuforiaCameraDeviceFocusModeContinuousAuto,   ///< Continuous autofocus mode
    VuforiaCameraDeviceFocusModeInfinity,         ///< Focus set to infinity
    VuforiaCameraDeviceFocusModeMacro             ///< Macro mode for close-up focus
};

typedef NS_ENUM(NSInteger, VuforiaCameraDeviceCamera) {
    VuforiaCameraDeviceCameraDefault,              ///< Default camera device.  Usually BACK
    VuforiaCameraDeviceCameraBack,                 ///< Rear facing camera
    VuforiaCameraDeviceCameraFront                 ///< Front facing camera
};

typedef NS_ENUM (NSInteger, VuforiaVideoBackgroundReflection) {
    VuforiaVideoBackgroundReflectionDefault,  ///< Allows the SDK to set the recommended reflection settings for the current camera
    VuforiaVideoBackgroundReflectionOn,       ///< Overrides the SDK recommendation to force a reflection
    VuforiaVideoBackgroundReflectionOff       ///< Overrides the SDK recommendation to disable reflection
};

/// Status of a TrackableResults
typedef NS_ENUM (NSInteger, VuforiaTrackableResultStatus) {
    VuforiaTrackableResultStatusUnknown,            ///< The state of the TrackableResult is unknown
    VuforiaTrackableResultStatusUndefined,          ///< The state of the TrackableResult is not defined
    ///< (this TrackableResult does not have a state)
    VuforiaTrackableResultStatusDetected,           ///< The TrackableResult was detected
    VuforiaTrackableResultStatusTracked,            ///< The TrackableResult was tracked
    VuforiaTrackableResultStatusExtendedTracked    ///< The Trackable Result was extended tracked
};

/// Video background configuration
typedef struct _VuforiaVideoBackgroundConfig
{
    /// Enables/disables rendering of the video background.
    bool enabled;
    
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
    
    /// Reflection parameter to control how the video background is rendered
    VuforiaVideoBackgroundReflection reflection;
} VuforiaVideoBackgroundConfig;

/// Video background configuration
typedef struct _VuforiaMatrix34
{
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

typedef struct _VuforiaCameraCalibration
{
    bool ok;
    float sizeX;
    float sizeY;
    float focalLengthX;
    float focalLengthY;
    float principalPointX;
    float principalPointY;
    float distortionParameterA;
    float distortionParameterB;
    float distortionParameterC;
    float distortionParameterD;
    float fieldOfViewRadX;
    float fieldOfViewRadY;
} VuforiaCameraCalibration;


typedef struct _VuforiaVideoMode
{
    int width;
    int height;
    float framerate;
} VuforiaVideoMode;


/// Video background configuration
typedef struct _VuforiaTimeVal
{
    long sec;
    long usec;
} VuforiaTimeVal;

/// Video background configuration
typedef struct _VuforiaObjectSize
{
    float x;
    float y;
    float z;
} VuforiaObjectSize;

@interface VuforiaObjectTarget : NSObject
-(VuforiaObjectSize) getSize;
@end

@interface VuforiaTrackable : NSObject
/// Returns the Trackable class' type
+(int) getClassType;
/// Returns the Trackable instance's type
-(int) getType;
/// Returns a unique id for all 3D trackable objects
-(int) getId;
/// Returns the Trackable's name
-(NSString*)getName;
/// Starts extended tracking for this Trackable. Returns true if successful
-(bool) startExtendedTracking;
/// Stops extended tracking for this Trackable. Returns true if successful
-(bool) stopExtendedTracking;
/// Returns true if extended tracking has been enabled, false otherwise.
-(bool) isExtendedTrackingStarted;
// Returns this trackable as an object target if the cast is possible
-(VuforiaObjectTarget*)asObjectTarget;
@end


@interface VuforiaTrackableResult : NSObject
/// Returns the TrackableResult class' type
+(int) getClassType;
/// Returns the TrackableResult instance's type
-(int) getType;
/// Returns the tracking status
-(VuforiaTrackableResultStatus) getStatus;
/// Returns the corresponding Trackable that this result represents
-(VuforiaTrackable*) getTrackable;
/// Returns the current pose matrix in row-major order
-(VuforiaMatrix34) getPose;
@end

@interface VuforiaFrame : NSObject
/// A time stamp that defines when the original camera image was shot
/**
 *  Value in seconds representing the offset to application startup time.
 *  Independent from image creation the time stamp always refers to the time
 *  the camera image was shot.
 */
- (double) getTimeStamp;
/// Index of the frame
- (int) getIndex;
@end

@interface VuforiaState : NSObject
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
@end

@interface VuforiaDataSet : NSObject

/// Checks if the dataset exists at the specified path and storage location
/**
 *  Returns true if both the dataset XML and DAT file exist at the
 *  given storage location. The relative path to the dataset XML must be
 *  passed to this function for all storage locations other than
 *  STORAGE_ABSOLUTE.
 */
+(bool) exists:(NSString*) path;

/// Loads the dataset at the specified path and storage location
/**
 *  Returns true if the dataset was loaded successfully. After loading,
 *  individual Trackables can be accessed using getNumTrackables() and
 *  getTrackable(). The relative path to the dataset XML must be passed to
 *  this function for all storage locations other than STORAGE_ABSOLUTE.
 *  Note that loading a dataset may take significant time and therefore
 *  it is recommended to load datasets in the background.
 */
-(bool) load:(NSString*)path;

/// Returns the overall number of 3D trackable objects in this data set.
-(int) getNumTrackables;

/// Returns a pointer to a trackable object.
/**
 *  Trackables that are part of other trackables (e.g. an ImageTarget that
 *  is part of a MultiTarget) is not delivered by this method.
 *  Such trackables can be accesses via the trackable they are part of.
 *  E.g. use MultiTarget::getPart() to access the respective ImageTargets.
 */
-(VuforiaTrackable*) getTrackable:(int)idx;

/// Creates a new Trackable from the given TrackableSource and registers
/// it with the dataset
/**
 *  Use DataSet::destroy() to destroy the returned Trackable
 *  if it is no longer required.
 *  This method must not be called while the dataset is active or it will
 *  return NULL.
 */
//-(VuforiaTrackable*) createTrackable:(const VuforiaTrackableSource*)source;

/// Creates a new MultiTarget and registers it with the dataset
/**
 *  Use DataSet::destroy() to destroy the returned MultiTarget
 *  if it is no longer required.
 *  This method must not be called while the dataset is active or it will
 *  return NULL.
 */
//-(VuforiaMultiTarget*) createMultiTarget:(NSString*)name;

/// Destroys a Trackable
/**
 *  This method must not be called while the dataset is active or it will
 *  return false.
 */
-(bool) destroy:(VuforiaTrackable*)trackable;

/// Checks if this DataSet's Trackable capacity is reached.
/**
 *  Returns true if the number of Trackables created in this DataSet
 *  has reached the maximum capacity, false otherwise.
 */
-(bool) hasReachedTrackableLimit;

/// Checks if this dataset is active
/**
 * Returns true if the dataset is active
 */
-(bool) isActive;
@end

typedef void (^StateUpdateCallback)(VuforiaState *);

@interface VuforiaApplicationSession : NSObject

// initialize the AR library
- (void) initAR:(NSString*)licenseKey done:(void (^)(NSError *error))done;
- (void) deinitAR;

- (BOOL) startCamera:(VuforiaCameraDeviceCamera)camera;
- (BOOL) stopCamera;
- (VuforiaCameraCalibration) getCameraCalibration;
- (VuforiaVideoMode) getVideoMode;

// ObjectTracker
- (BOOL) startObjectTracker;
- (void) stopObjectTracker;
- (BOOL) hintMaxSimultaneousImageTargets:(int)max;
- (void) downloadDataSetFromURL:(NSString*)xmlURLString done:(void (^)(NSString*, NSError*error))done;
- (VuforiaDataSet*) createDataSet;
- (BOOL) destroyDataSet:(VuforiaDataSet*)dataSet;
- (BOOL) activateDataSet:(VuforiaDataSet*)dataSet;
- (BOOL) deactivateDataSet:(VuforiaDataSet*)dataSet;

// util
- (BOOL) pauseAR:(NSError **)error;
- (BOOL) resumeAR:(NSError **)error;

- (CGRect) fixedWindowBounds;

- (VuforiaTimeVal) boottime;

@property (nonatomic) BOOL cameraIsStarted;
@property (nonatomic, strong) StateUpdateCallback stateUpdateCallback;

@property (nonatomic, assign) float contentScaleFactor;

@property (nonatomic, assign) VuforiaVideoBackgroundConfig videoBackgroundConfig;

@property (nonatomic, strong) VuforiaVideoViewController *videoViewController;

@end


#endif
