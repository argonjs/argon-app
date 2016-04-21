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

@interface VuforiaMarker : VuforiaTrackable
+(int)getClassType;
@end

@interface VuforiaWord : VuforiaTrackable
+(int)getClassType;
@end

@interface VuforiaObjectTarget : VuforiaTrackable
+(int)getClassType;
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
    VuforiaTrackableResultStatusUnknown,            ///< The state of the TrackableResult is unknown
    VuforiaTrackableResultStatusUndefined,          ///< The state of the TrackableResult is not defined
    ///< (this TrackableResult does not have a state)
    VuforiaTrackableResultStatusDetected,           ///< The TrackableResult was detected
    VuforiaTrackableResultStatusTracked,            ///< The TrackableResult was tracked
    VuforiaTrackableResultStatusExtendedTracked    ///< The Trackable Result was extended tracked
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
/// Returns the current pose matrix in row-major order
-(const VuforiaMatrix34)getPose;
/// A time stamp that defines when the trackable result was generated
-(double)getTimeStamp;
@end

@interface VuforiaMarkerResult : VuforiaTrackableResult
+(int)getClassType;
-(VuforiaMarker*)getTrackable;
@end

@interface VuforiaWordResult : VuforiaTrackableResult
+(int)getClassType;
-(VuforiaWord*)getTrackable;
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
