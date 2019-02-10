//
//  VuforiaTrackable.h
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import <Foundation/Foundation.h>
#import "VuforiaSession.h"

@interface VuforiaTrackable : NSObject
@property (nonatomic, assign) void* cpp;
// Wrap the provided Trackable
+(VuforiaTrackable*)trackableFromCpp:(void *)cpp asConst:(BOOL)asConst;
/// Returns the Trackable class' type
+(int)getClassType;
// is the underlying cpp object const (immutable)
-(bool)isConst;
/// Returns the Trackable instance's type
-(int)getType;
/// Returns a unique id for all 3D trackable objects
-(int)getId;
/// Returns the Trackable's name
-(NSString*)getName;
/// Sets the given user data for this Trackable. Returns true if successful
-(BOOL)setUserData:(void*)userData;
/// Returns the pointer previously set by setUserData()
-(void*)getUserData;
/// Starts extended tracking for this Trackable. Returns true if successful
-(bool)startExtendedTracking;
/// Stops extended tracking for this Trackable. Returns true if successful
-(bool)stopExtendedTracking;
/// Returns true if extended tracking has been enabled, false otherwise.
-(bool)isExtendedTrackingStarted;
@end

@interface VuforiaDeviceTrackable : VuforiaTrackable
+(int)getClassType;
@end


/// A target representing a spatial anchor
/**
 *  An instance of the Anchor class represents a spatial anchor, which is a
 *  real-world pose that can be used for accurate positioning of objects in AR.
 *  Anchors can be created and destroyed via the DeviceTracker.
 */
@interface VuforiaAnchor : VuforiaTrackable
+(int)getClassType;
@end

@interface VuforiaObjectTarget : VuforiaTrackable
+(int)getClassType;
-(NSString*)getUniqueTargetId;
-(VuforiaVec3F)getSize;
@end

@interface VuforiaCylinderTarget : VuforiaObjectTarget
+(int)getClassType;
@end

@interface VuforiaImageTarget : VuforiaObjectTarget
+(int)getClassType;
@end

@interface VuforiaMultiTarget : VuforiaObjectTarget
+(int)getClassType;
@end

/// Status of a TrackableResults
typedef NS_ENUM (NSInteger, VuforiaTrackableResultStatus) {
//    NO_POSE,            ///< No pose was delivered for the trackable.
//    LIMITED,            ///< The trackable is being tracked in a limited form.
//    DETECTED,           ///< The trackable was detected.
//    TRACKED,            ///< The trackable is being tracked.
//    EXTENDED_TRACKED    ///< The trackable is being tracked using extended tracking.
    VuforiaTrackableResultStatusNoPose,
    VuforiaTrackableResultStatusLimited,
    VuforiaTrackableResultStatusDetected,
    VuforiaTrackableResultStatusTracked,
    VuforiaTrackableResultStatusExtendedTracked
};

@interface VuforiaTrackableResult : NSObject
// Wrap the provided Trackable
+(VuforiaTrackableResult*)trackableResultFromCpp:(void *)cpp asConst:(BOOL)asConst;
/// Returns the TrackableResult class' type
+(int)getClassType;
// is the underlying cpp object const (immutable)
-(bool)isConst;
/// Returns the TrackableResult instance's type
-(int)getType;
/// Returns the tracking status
-(VuforiaTrackableResultStatus)getStatus;
/// Returns the corresponding Trackable that this result represents
-(VuforiaTrackable*)getTrackable;
/// Returns the current pose matrix in col-major order
-(const VuforiaMatrix34)getPose;
/// A time stamp that defines when the trackable result was generated
-(double)getTimeStamp;
@end

@interface VuforiaDeviceTrackableResult : VuforiaTrackableResult
+(int)getClassType;
-(VuforiaDeviceTrackable*)getTrackable;
@end

@interface VuforiaAnchorResult : VuforiaTrackableResult
+(int)getClassType;
-(VuforiaAnchor*)getTrackable;
@end

@interface VuforiaObjectTargetResult : VuforiaTrackableResult
+(int)getClassType;
-(VuforiaObjectTarget*)getTrackable;
@end

@interface VuforiaCylinderTargetResult : VuforiaObjectTargetResult
+(int)getClassType;
-(VuforiaCylinderTarget*)getTrackable;
@end

@interface VuforiaImageTargetResult : VuforiaObjectTargetResult
+(int)getClassType;
-(VuforiaImageTarget*)getTrackable;
@end

@interface VuforiaMultiTargetResult : VuforiaObjectTargetResult
+(int)getClassType;
-(VuforiaMultiTarget*)getTrackable;
@end

#endif
