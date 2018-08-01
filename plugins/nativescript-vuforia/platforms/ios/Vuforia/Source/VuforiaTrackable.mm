//
//  Vuforia.m
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaTrackable.h"
#import <Vuforia/Trackable.h>
#import <Vuforia/TrackableResult.h>
#import <Vuforia/DeviceTrackable.h>
#import <Vuforia/DeviceTrackableResult.h>
#import <Vuforia/Anchor.h>
#import <Vuforia/AnchorResult.h>
#import <Vuforia/ObjectTarget.h>
#import <Vuforia/ObjectTargetResult.h>
#import <Vuforia/ImageTarget.h>
#import <Vuforia/ImageTargetResult.h>
#import <Vuforia/CylinderTarget.h>
#import <Vuforia/CylinderTargetResult.h>
#import <Vuforia/MultiTarget.h>
#import <Vuforia/MultiTargetResult.h>
#import <Vuforia/Tool.h>

@interface VuforiaTrackable ()
@property (nonatomic, assign) BOOL isConst;
@end

@implementation VuforiaTrackable

/// Returns the Trackable class' type
+(int) getClassType {
    return Vuforia::Trackable::getClassType().getData();
}

+(VuforiaTrackable*)trackableFromCpp:(void*)trackable asConst:(BOOL)asConst {
    Vuforia::Trackable *cpp = (Vuforia::Trackable*)trackable;
    VuforiaTrackable *wrapped;
    if (cpp->isOfType(Vuforia::Anchor::getClassType())){
        wrapped = [[VuforiaAnchor alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::DeviceTrackable::getClassType())){
        wrapped = [[VuforiaDeviceTrackable alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::ImageTarget::getClassType())){
        wrapped = [[VuforiaImageTarget alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::CylinderTarget::getClassType())){
        wrapped = [[VuforiaCylinderTarget alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::MultiTarget::getClassType())){
        wrapped = [[VuforiaMultiTarget alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::ObjectTarget::getClassType())) {
        wrapped = [[VuforiaObjectTarget alloc] initWithCpp:cpp asConst:asConst];
    } else {
        wrapped = [[VuforiaTrackable alloc] initWithCpp:cpp asConst:asConst];
    }
    return wrapped;
}

- (id)initWithCpp:(Vuforia::Trackable*)cpp asConst:(BOOL)asConst {
    self = [super init];
    if (self) {
        self.cpp = cpp;
        self.isConst = asConst;
    }
    return self;
}

-(Vuforia::Trackable*)trackable {
    return (Vuforia::Trackable*)self.cpp;
}

/// Returns the Trackable instance's type
-(int) getType {
    return self.trackable->getType().getData();
};

/// Returns a unique id for all 3D trackable objects
-(int) getId {
    return self.trackable->getId();
};

/// Returns the Trackable's name
-(NSString*) getName {
    return @(self.trackable->getName());
}

/// Sets the given user data for this Trackable. Returns true if successful
-(BOOL) setUserData:(void*) userData {
    if (self.isConst) return NO;
    else return self.trackable->setUserData(userData);
}

/// Returns the pointer previously set by setUserData()
-(void*) getUserData {
    return self.trackable->getUserData();
}

/// Starts extended tracking for this Trackable. Returns true if successful
-(bool) startExtendedTracking {
    if (self.isConst) return NO;
    else return self.trackable->startExtendedTracking();
}

-(bool) stopExtendedTracking {
    if (self.isConst) return NO;
    else return self.trackable->stopExtendedTracking();
}

/// Returns true if extended tracking has been enabled, false otherwise.
-(bool) isExtendedTrackingStarted {
    return self.trackable->isExtendedTrackingStarted();
};

-(Vuforia::ObjectTarget*) getObjectTarget {
    if (self.trackable->isOfType(Vuforia::ObjectTarget::getClassType())) {
        return reinterpret_cast<Vuforia::ObjectTarget*>(self.cpp);
    } else {
        return nil;
    }
}

- (void)dealloc {
    self.cpp = nil;
}
@end

@implementation VuforiaDeviceTrackable
+(int) getClassType {
    return Vuforia::DeviceTrackable::getClassType().getData();
}
@end

@implementation VuforiaAnchor
+(int) getClassType {
    return Vuforia::Anchor::getClassType().getData();
}
@end

@implementation VuforiaObjectTarget

+(int) getClassType {
    return Vuforia::ObjectTarget::getClassType().getData();
}

- (Vuforia::ObjectTarget*)objectTarget {
    return (Vuforia::ObjectTarget*)self.cpp;
}

- (NSString*)getUniqueTargetId {
    return @(self.objectTarget->getUniqueTargetId());
}

- (VuforiaVec3F)getSize {
    Vuforia::Vec3F size = self.objectTarget->getSize();
    return (VuforiaVec3F&)size;
}

@end

@implementation VuforiaCylinderTarget

+(int) getClassType {
    return Vuforia::CylinderTarget::getClassType().getData();
}

- (Vuforia::CylinderTarget*)cylinderTarget {
    return (Vuforia::CylinderTarget*)self.cpp;
}

@end


@implementation VuforiaImageTarget

+(int) getClassType {
    return Vuforia::ImageTarget::getClassType().getData();
}

- (Vuforia::ImageTarget*)imageTarget {
    return (Vuforia::ImageTarget*)self.cpp;
}

- (VuforiaVec3F)getSize {
    Vuforia::Vec3F size = self.imageTarget->getSize();
    return (VuforiaVec3F&)size;
}

@end

@implementation VuforiaMultiTarget

+(int) getClassType {
    return Vuforia::MultiTarget::getClassType().getData();
}

- (Vuforia::MultiTarget*)multiTarget {
    return (Vuforia::MultiTarget*)self.cpp;
}

@end


@interface VuforiaTrackableResult ()
@property (nonatomic, assign) const Vuforia::TrackableResult *cpp;
@property (nonatomic) BOOL isConst;
@end

@implementation VuforiaTrackableResult

+(VuforiaTrackableResult*)trackableResultFromCpp:(void*)result asConst:(BOOL)asConst {
    Vuforia::TrackableResult *cpp = (Vuforia::TrackableResult*)result;
    VuforiaTrackableResult *wrapped;
    if (cpp->isOfType(Vuforia::AnchorResult::getClassType())) {
        wrapped = [[VuforiaAnchorResult alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::DeviceTrackableResult::getClassType())) {
        wrapped = [[VuforiaDeviceTrackableResult alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::ObjectTargetResult::getClassType())) {
        wrapped = [[VuforiaObjectTargetResult alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::ImageTargetResult::getClassType())){
        wrapped = [[VuforiaImageTargetResult alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::CylinderTargetResult::getClassType())){
        wrapped = [[VuforiaCylinderTargetResult alloc] initWithCpp:cpp asConst:asConst];
    } else if (cpp->isOfType(Vuforia::MultiTargetResult::getClassType())){
        wrapped = [[VuforiaMultiTargetResult alloc] initWithCpp:cpp asConst:asConst];
    } else {
        wrapped = [[VuforiaTrackableResult alloc] initWithCpp:cpp asConst:asConst];
    }
    return wrapped;
}

+(int)getClassType {
    return Vuforia::TrackableResult::getClassType().getData();
}

- (id)initWithCpp:(const Vuforia::TrackableResult*)cpp asConst:(BOOL)asConst {
    self = [super init];
    if (self) {
        self.cpp = cpp;
        self.isConst = asConst;
    }
    return self;
}

-(int)getType {
    return self.cpp->getType().getData();
}

/// Returns the tracking status
-(VuforiaTrackableResultStatus) getStatus {
    return (VuforiaTrackableResultStatus) self.cpp->getStatus();
};

/// Returns the corresponding Trackable that this result represents
-(VuforiaTrackable*) getTrackable {
    const Vuforia::Trackable& trackable = self.cpp->getTrackable();
    return [VuforiaTrackable trackableFromCpp:(void*)&trackable asConst:true];
};

/// Returns the current pose matrix in row-major order
-(VuforiaMatrix34) getPose {
//    Vuforia::Matrix44F m = Vuforia::Tool::convertPose2GLMatrix(self.cpp->getPose());
    return (VuforiaMatrix34&)self.cpp->getPose();
};

-(double)getTimeStamp {
    return self.cpp->getTimeStamp();
}


- (void)dealloc {
    self.cpp = nil;
}
@end


@implementation VuforiaDeviceTrackableResult

+(int) getClassType {
    return Vuforia::DeviceTrackableResult::getClassType().getData();
}

- (Vuforia::DeviceTrackableResult*)result {
    return (Vuforia::DeviceTrackableResult*)self.cpp;
}

- (VuforiaAnchorResult*)getTrackable {
    return (VuforiaAnchorResult*) [VuforiaTrackable trackableFromCpp:(void*)&self.cpp->getTrackable() asConst:true];
}

@end

@implementation VuforiaAnchorResult

+(int) getClassType {
    return Vuforia::AnchorResult::getClassType().getData();
}

- (Vuforia::AnchorResult*)result {
    return (Vuforia::AnchorResult*)self.cpp;
}

- (VuforiaAnchorResult*)getTrackable {
    return (VuforiaAnchorResult*) [VuforiaTrackable trackableFromCpp:(void*)&self.cpp->getTrackable() asConst:true];
}

@end

@implementation VuforiaObjectTargetResult

+(int) getClassType {
    return Vuforia::ObjectTargetResult::getClassType().getData();
}

- (Vuforia::ObjectTargetResult*)result {
    return (Vuforia::ObjectTargetResult*)self.cpp;
}

- (VuforiaObjectTarget*)getTrackable {
    return (VuforiaObjectTarget*) [VuforiaTrackable trackableFromCpp:(void*)&self.cpp->getTrackable() asConst:true];
}

@end

@implementation VuforiaCylinderTargetResult

+(int) getClassType {
    return Vuforia::CylinderTargetResult::getClassType().getData();
}

- (Vuforia::CylinderTargetResult*)result {
    return (Vuforia::CylinderTargetResult*)self.cpp;
}

- (VuforiaCylinderTarget*)getTrackable {
    return (VuforiaCylinderTarget*) [VuforiaTrackable trackableFromCpp:(void*)&self.cpp->getTrackable() asConst:true];
}

@end


@implementation VuforiaImageTargetResult

+(int) getClassType {
    return Vuforia::ImageTargetResult::getClassType().getData();
}

- (Vuforia::ImageTargetResult*)result {
    return (Vuforia::ImageTargetResult*)self.cpp;
}

- (VuforiaImageTarget*)getTrackable {
    return (VuforiaImageTarget*) [VuforiaTrackable trackableFromCpp:(void*)&self.cpp->getTrackable() asConst:true];
}

@end

@implementation VuforiaMultiTargetResult

+(int) getClassType {
    return Vuforia::MultiTargetResult::getClassType().getData();
}

- (Vuforia::MultiTargetResult*)result {
    return (Vuforia::MultiTargetResult*)self.cpp;
}

- (VuforiaMultiTarget*)getTrackable {
    return (VuforiaMultiTarget*) [VuforiaTrackable trackableFromCpp:(void*)&self.cpp->getTrackable() asConst:true];
}

@end

#endif
