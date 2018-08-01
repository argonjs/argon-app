//
//  VuforiaTracker.m
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaTracker.h"
#import "VuforiaDataSet.h"
#import "VuforiaState.h"
#import <Vuforia/TrackerManager.h>
#import <Vuforia/TransformModel.h>
#import <Vuforia/HandheldTransformModel.h>
#import <Vuforia/HeadTransformModel.h>
#import <Vuforia/DataSet.h>
#import <Vuforia/Tracker.h>
#import <Vuforia/DeviceTracker.h>
#import <Vuforia/PositionalDeviceTracker.h>
#import <Vuforia/RotationalDeviceTracker.h>
#import <Vuforia/ObjectTracker.h>
#import <Vuforia/SmartTerrain.h>
#import <Vuforia/HitTestResult.h>
#import <Vuforia/State.h>
#import <Vuforia/Tool.h>

@interface VuforiaTransformModel ()
@property (nonatomic, assign) const void* cpp;
@end

@implementation VuforiaTransformModel

@end

@implementation VuforiaHandheldTransformModel

@end

@implementation VuforiaHeadTransformModel

@end

@interface VuforiaTracker ()
@property (nonatomic, assign) Vuforia::Tracker* cpp;
@end

@implementation VuforiaTracker

+(Vuforia::TrackerManager&)manager {
    return Vuforia::TrackerManager::getInstance();
}

-(BOOL)start {
    return self.cpp->start();
}

-(void)stop {
    self.cpp->stop();
}

- (void)dealloc {
    self.cpp = nil;
}

@end


@implementation VuforiaDeviceTracker

static VuforiaDeviceTracker *deviceTracker = nil;

+(BOOL)initTracker {
    Vuforia::Tracker* t = VuforiaTracker.manager.initTracker(Vuforia::DeviceTracker::getClassType());
    if (t != nil) {
        deviceTracker = [[VuforiaDeviceTracker alloc] init];
        deviceTracker.cpp = t;
        return YES;
    }
    return NO;
}

+(BOOL)deinitTracker {
    if (VuforiaTracker.manager.deinitTracker(Vuforia::DeviceTracker::getClassType())) {
        deviceTracker = nil;
        return YES;
    }
    return NO;
}

+(VuforiaDeviceTracker*)getInstance {
    return deviceTracker;
}

-(Vuforia::DeviceTracker*)tracker {
    return (Vuforia::DeviceTracker*)self.cpp;
}

@end




@implementation VuforiaRotationalDeviceTracker

static VuforiaRotationalDeviceTracker *rotationalDeviceTracker = nil;

+(BOOL)initTracker {
    Vuforia::Tracker* t = VuforiaTracker.manager.initTracker(Vuforia::RotationalDeviceTracker::getClassType());
    if (t != nil) {
        rotationalDeviceTracker = [[VuforiaRotationalDeviceTracker alloc] init];
        rotationalDeviceTracker.cpp = t;
        return YES;
    }
    return NO;
}

+(BOOL)deinitTracker {
    if (VuforiaTracker.manager.deinitTracker(Vuforia::RotationalDeviceTracker::getClassType())) {
        rotationalDeviceTracker = nil;
        return YES;
    }
    return NO;
}

+(VuforiaRotationalDeviceTracker*)getInstance {
    return rotationalDeviceTracker;
}

-(Vuforia::RotationalDeviceTracker*)tracker {
    return (Vuforia::RotationalDeviceTracker*)self.cpp;
}


/// Reset the current pose.
/**
 *  Reset the current pose heading in the world coordinate system.
 *  Useful if you want to reset the direction the device is pointing too
 *  without impacting the current pitch or roll angle (your horizon).
 */
-(BOOL)recenter {
    return self.tracker->recenter();
}


///  Enable pose prediction to reduce latency.
/**
 *  Recommended to use this mode for VR experience.
 *  Return true if pose prediction is supported
 */
-(BOOL)setPosePrediction:(BOOL)enable {
    return self.tracker->setPosePrediction(enable);
}


// Get the current pose prediction mode
/**
 *  by default prediction is off.
 */
-(BOOL)getPosePrediction {
    return self.tracker->getPosePrediction();
}


/// Enable usage of a model correction for the pose
/**
 *  Specify a correction mode of the returned pose.
 *  Correction mode are based on transformation model, defining the context
 *  usage of the tracker.
 *  For example, if you device tracker for doing head tracking (VR), you
 *  can set a HeadTransformModel to the tracker and pose will be adjusted
 *  consequently. The rotational device tracker support two transform models:
 *  - HeadTransformModel: for head tracking (VR, rotational AR experience)
 *  - HandheldTransformModel: for handheld tracking.
 *  by default no transform model is used.
 *  Passing NULL as argument disable the usage of the model correction.
 */
-(BOOL)setModelCorrection:(VuforiaTransformModel*)transformationmodel {
    return self.tracker->setModelCorrection((const Vuforia::TransformModel*)transformationmodel.cpp);
}


/// Get the current correction model
/**
 *  return the currently set transform model used for correction.
 *  by default no transform model are used, will return to null.
 */
-(VuforiaTransformModel*)getModelCorrection {
    VuforiaTransformModel *model = [[VuforiaTransformModel alloc] init];
    model.cpp = self.tracker->getModelCorrection();
    return model;
}


/// Return the default head transform model
/**
 *  utility method to get the recommended Head model.
 *  Unit is in meter.
 */
-(VuforiaHeadTransformModel*)getDefaultHeadModel {
    VuforiaHeadTransformModel *model = [[VuforiaHeadTransformModel alloc] init];
    model.cpp = self.tracker->getDefaultHeadModel();
    return model;
}


/// Returns the default handheld transform model
/**
 *  utility method to get the recommended handheld model.
 *  Unit is in meter.
 */
-(VuforiaHandheldTransformModel*)getDefaultHandheldModel {
    VuforiaHandheldTransformModel *model = [[VuforiaHandheldTransformModel alloc] init];
    model.cpp = self.tracker->getDefaultHandheldModel();
    return model;
}

@end



@interface VuforiaHitTestResult ()
@property (nonatomic, assign) const Vuforia::HitTestResult *cpp;
@end
@implementation VuforiaHitTestResult
/// The position and orientation of the hit test result in the world coordinate system, represented as a pose matrix in col-major order.
-(const VuforiaMatrix34)getPose {
//    Vuforia::Matrix44F m = Vuforia::Tool::convertPose2GLMatrix(self.cpp->getPose());
    Vuforia::Matrix34F m = self.cpp->getPose();
    return (VuforiaMatrix34&)m;
}
@end

@implementation VuforiaSmartTerrain

static VuforiaSmartTerrain *smartTerrain = nil;

+(BOOL)initTracker {
    Vuforia::Tracker* t = VuforiaTracker.manager.initTracker(Vuforia::SmartTerrain::getClassType());
    if (t != nil) {
        smartTerrain = [[VuforiaSmartTerrain alloc] init];
        smartTerrain.cpp = t;
        return YES;
    }
    return NO;
}

+(BOOL)deinitTracker {
    if (VuforiaTracker.manager.deinitTracker(Vuforia::SmartTerrain::getClassType())) {
        smartTerrain = nil;
        return YES;
    }
    return NO;
}

+(VuforiaSmartTerrain*)getInstance {
    return smartTerrain;
}

-(Vuforia::SmartTerrain*)tracker {
    return (Vuforia::SmartTerrain*)self.cpp;
}

/// Returns the tracker class' type
+(int)getClassType {
    return (int)Vuforia::SmartTerrain::getClassType().getData();
}

/// Performs hit test
/**
 *  This function will perform a hit test with a plane based on provided input parameters.
 *  A ray is defined by a (touch) point on screen and an expected approximate
 *  deviceHeight above the ground plane. This ray is used to intersect plane(s) to
 *  generate hit test result(s). Vuforia always returns at least one successful hit on
 *  an assumed plane, defined by the developer provided deviceHeight above ground.
 *
 *  Recommended usage is to perform hitTest, get the number of hitTestResults generated
 *  using getHitTestResultCount() and then access a specific result using getHitTestResult().
 *  Hit test results are owned by SmartTerrain. Each call to hitTest() destroys and
 *  rebuilds the internal list of HitTestResults.
 *  Note that a hit test is bound to a specific State. If you want to have a preview
 *  of your HitTestResult you should use the same State that the one you use for rendering
 *  the current frame.
 *
 * \param state The state to use for doing the hit test.
 * \param point Point in normalized image coordinate space (top left (0,0), bottom right (1,1)).
 * \param deviceHeight Height of the device center above ground plane in meters.
 * \param hint Give the implementation a hint about the orientation of the plane in the scene.
 */
-(void)hitTestWithState:(VuforiaState*)state point:(VuforiaVec2F)point deviceHeight:(float)deviceHeight hint:(VuforiaHitTestHint)hint {
    Vuforia::State *stateCpp = (Vuforia::State *)state.cpp;
    self.tracker->hitTest(*stateCpp, (Vuforia::Vec2F&)point, deviceHeight, (Vuforia::SmartTerrain::HITTEST_HINT&)hint);
    
}

/// Gets the number of HitTestResults resulting from the last hitTest() call
-(int)hitTestResultCount {
    return self.tracker->getHitTestResultCount();
}

/// Returns a pointer to a HitTestResult instance.
/**
 * \param idx The index of the result. Must be equal or larger than 0 and less than the number of results returned by getHitTestResult().
 *
 * \return The HitTestResult instance for the given index.
 *
 * NOTE: The returned HitTestResult pointer will be invalidated with the next call to 'hitTest'
 *       or with a call to deinitailze the SmartTerrain instance. Accessing the pointer after
 *       these calls results in undefined behavior.
 */
-(VuforiaHitTestResult*)getHitTestResultAtIndex:(int)idx{
    const Vuforia::HitTestResult* r = self.tracker->getHitTestResult(idx);
    VuforiaHitTestResult* result = [[VuforiaHitTestResult alloc] init];
    result.cpp = r;
    return result;
}

@end

@implementation VuforiaPositionalDeviceTracker : VuforiaDeviceTracker

static VuforiaPositionalDeviceTracker *tracker = nil;

+(int)getClassType {
    return Vuforia::PositionalDeviceTracker::getClassType().getData();
}
+(BOOL)initTracker {
    Vuforia::Tracker* t = VuforiaTracker.manager.initTracker(Vuforia::PositionalDeviceTracker::getClassType());
    if (t != nil) {
        tracker = [[VuforiaPositionalDeviceTracker alloc] init];
        tracker.cpp = t;
        return YES;
    }
    return NO;
}
+(BOOL)deinitTracker {
    if (VuforiaTracker.manager.deinitTracker(Vuforia::PositionalDeviceTracker::getClassType())) {
        tracker = nil;
        return YES;
    }
    return NO;
}
+(VuforiaPositionalDeviceTracker*)getInstance {
    return tracker;
}

-(Vuforia::PositionalDeviceTracker*)cppTracker {
    return (Vuforia::PositionalDeviceTracker*)tracker.cpp;
}

/// Create a named Anchor at the given world pose.
/**
 * \param name The unique name of the Anchor.
 * \param pose Matrix specifying the world pose of the Anchor.
 *
 * \return The created Anchor if successful or NULL on failure.
 *
 * NOTE: The returned Anchor will be managed internally by the PositionalDeviceTracker and should never
 *       be explicitly deleted but can be destroyed with a call to 'destroyAnchor'. A call to 'stop'
 *       will invalidate all Anchors. Accessing the pointer after these calls results in undefined
 *       behavior.
 *       On non-ARKit devices an Anchor from hit test result is required first to initialize
 *       DeviceTracker. For platform independent behavior we recommend to always start with an Anchor
 *       from hit test first.
 */
-(VuforiaAnchor*)createAnchorWithName:(NSString*)name
                                 pose:(const VuforiaMatrix34)pose {
    Vuforia::Anchor* a = self.cppTracker->createAnchor(
                                  [name cStringUsingEncoding:[NSString defaultCStringEncoding]],
                                  (const Vuforia::Matrix34F&)pose);
    if (!a) return nil;
    return (VuforiaAnchor*)[VuforiaTrackable trackableFromCpp:(void*)a asConst:NO];
}

/// Create a named Anchor using the result of a hit test from SmartTerrain.
/**
 * \param name The unique name of the Anchor.
 * \param hitTestResult The hit test result from SmartTerrain.
 *
 * \return The created Anchor if successful or NULL on failure.
 *
 * NOTE: The returned Anchor will be managed internally by the PositionalDeviceTracker and should never
 *       be explicitly deleted but can be destroyed with a call to 'destroyAnchor'. A call to 'stop'
 *       will invalidate all Anchors. Accessing the pointer after these calls results in undefined
 *       behavior.
 */
-(VuforiaAnchor*)createAnchorWithName:(NSString*)name
                        hitTestResult: (VuforiaHitTestResult*)hitTestResult {
    Vuforia::Anchor* a = self.cppTracker->createAnchor(
                           [name cStringUsingEncoding:[NSString defaultCStringEncoding]],
                           (const Vuforia::HitTestResult&)*hitTestResult.cpp);
    if (!a) return nil;
    return (VuforiaAnchor*)[VuforiaTrackable trackableFromCpp:(void*)a asConst:NO];
}

/// Destroys the specified Anchor.
/**
 * Destroys the given Anchor by deleting it and cleans up all internal resources associated to it.
 * Accessing the pointer after this call results in undefined behavior.
 *
 * \param anchor The Anchor to destroy.
 *
 * \return True if destroyed successfully, false if the Anchor is invalid (e.g. null).
 */
-(BOOL)destroyAnchor:(VuforiaAnchor*)anchor {
    return self.cppTracker->destroyAnchor((Vuforia::Anchor*)anchor.cpp);
}

/// Get the number of Anchors currently managed by the PositionalDeviceTracker.
/**
 * \return The number of Anchors.
 */
-(int)numAnchors {
    return self.cppTracker->getNumAnchors();
}

/// Get the Anchor at the specified index.
/**
 * \param idx The index of the Anchor.
 *
 * \return The Anchor instance for the given index or nullptr if the index is invalid.
 */
-(VuforiaAnchor*)getAnchorAtIndex:(int)idx {
    Vuforia::Anchor* a = self.cppTracker->getAnchor(idx);
    if (a) {
        return (VuforiaAnchor*)[VuforiaTrackable trackableFromCpp:(void*)a asConst:NO];
    }
    return NULL;
}
@end

@implementation VuforiaObjectTracker

static VuforiaObjectTracker *objectTracker = nil;

+(BOOL)initTracker {
    Vuforia::Tracker* t = VuforiaTracker.manager.initTracker(Vuforia::ObjectTracker::getClassType());
    if (t != nil) {
        objectTracker = [[VuforiaObjectTracker alloc] init];
        objectTracker.cpp = t;
        return YES;
    }
    return NO;
}

+(BOOL)deinitTracker {
    if (VuforiaTracker.manager.deinitTracker(Vuforia::ObjectTracker::getClassType())) {
        objectTracker = nil;
        return YES;
    }
    return NO;
}

+(VuforiaObjectTracker*)getInstance {
    return objectTracker;
}

-(Vuforia::ObjectTracker*)tracker {
    return (Vuforia::ObjectTracker*)self.cpp;
}

/// Factory function for creating an empty dataset.
/**
 *  Returns the new instance on success, NULL otherwise. Use
 *  DataSet::destroyDataSet() to destroy a DataSet that is no longer needed.
 */
-(VuforiaDataSet*)createDataSet {
    Vuforia::DataSet *d = self.tracker->createDataSet();
    if (d != NULL) {
        return [[VuforiaDataSet alloc] initWithCpp:d];
    }
    return nil;
}

/// Destroys the given dataset and releases allocated resources.
/// Returns false if the given dataset is currently active.
-(BOOL)destroyDataSet:(VuforiaDataSet*)dataset {
    return self.tracker->destroyDataSet((Vuforia::DataSet*)dataset.cpp);
}

/// Activates the given dataset.
/**
 *  This function will return true if the DataSet was successfully
 *  activated and false otherwise.
 *  The recommended way to activate datasets is during the execution of the
 *  UpdateCallback, which guarantees that the ObjectTracker is not working
 *  concurrently.
 */
-(BOOL)activateDataSet:(VuforiaDataSet*)dataset {
    return self.tracker->activateDataSet((Vuforia::DataSet*)dataset.cpp);
}

/// Deactivates the given dataset.
/**
 *  This function will return true if the DataSet was successfully
 *  deactivated and false otherwise (E.g. because this dataset is not
 *  currently active).
 *  The recommended way to deactivate datasets is during the execution of
 *  the UpdateCallback, which guarantees that the ObjectTracker is not
 *  working concurrently.
 */
-(BOOL)deactivateDataSet:(VuforiaDataSet*)dataset {
    return self.tracker->deactivateDataSet((Vuforia::DataSet*)dataset.cpp);
}

/// Returns the idx-th active dataset. Returns NULL if no DataSet has
/// been activated or if idx is out of range.
-(VuforiaDataSet*)getActiveDataSet:(const int)idx {
    Vuforia::DataSet *d = self.tracker->getActiveDataSet(idx);
    if (d != nil) {
        VuforiaDataSet *dataSet = [[VuforiaDataSet alloc] init];
        dataSet.cpp = d;
        return dataSet;
    }
    return nil;
}

/// Returns the number of currently activated dataset.
-(int)getActiveDataSetCount {
    return self.tracker->getActiveDataSetCount();
}

/// Returns instance of ImageTargetBuilder to be used for generated
/// target image from current scene.
-(VuforiaImageTargetBuilder*)getImageTargetBuilder {
    return nil; // TODO
}

/// Returns instance of TargetFinder to be used for retrieving
/// targets by cloud-based recognition.
-(VuforiaTargetFinder*)getTargetFinder {
    return nil; // TODO
}

///  Persist/Reset Extended Tracking
/**
 *  In persistent Extended Tracking mode, the environment map will only
 *  ever be reset when the developer calls resetExtendedTracking().
 *  This function will return true if persistent Extended Tracking
 *  was set successfully (or was already set to the specified value)
 *  and false otherwise.
 */
-(BOOL)persistExtendedTracking:(BOOL)on {
    return self.tracker->persistExtendedTracking(on);
}

/// Resets environment map for Extended Tracking
/**
 *  Environment map can only be reset by the developer if persistent
 *  extended tracking is enabled.
 *  This function will return true if environment map was reset
 *  successfully and false otherwise.
 */
-(BOOL)resetExtendedTracking{
    return self.tracker->resetExtendedTracking();
}

@end

#endif
