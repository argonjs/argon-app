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
#import <Vuforia/TrackerManager.h>
#import <Vuforia/TransformModel.h>
#import <Vuforia/HandheldTransformModel.h>
#import <Vuforia/HeadTransformModel.h>
#import <Vuforia/DataSet.h>
#import <Vuforia/Tracker.h>
#import <Vuforia/DeviceTracker.h>
#import <Vuforia/RotationalDeviceTracker.h>
#import <Vuforia/ObjectTracker.h>
#import <Vuforia/MarkerTracker.h>
#import <Vuforia/SmartTerrainTracker.h>
#import <Vuforia/TextTracker.h>

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