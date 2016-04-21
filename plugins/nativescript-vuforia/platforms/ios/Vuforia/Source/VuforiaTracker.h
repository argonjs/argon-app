//
//  VuforiaTracker.h
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import <Foundation/Foundation.h>

@interface VuforiaTransformModel : NSObject

@end


@interface VuforiaHandheldTransformModel : VuforiaTransformModel

@end


@interface VuforiaHeadTransformModel : VuforiaTransformModel

@end


@interface VuforiaTracker : NSObject
-(BOOL) start;
-(void) stop;
@end

@interface VuforiaDeviceTracker : VuforiaTracker
+(BOOL)initTracker;
+(BOOL)deinitTracker;
+(VuforiaDeviceTracker*)getInstance;
@end


@interface VuforiaRotationalDeviceTracker : VuforiaDeviceTracker
+(BOOL)initTracker;
+(BOOL)deinitTracker;
+(VuforiaRotationalDeviceTracker*)getInstance;

/// Reset the current pose.
/**
 *  Reset the current pose heading in the world coordinate system.
 *  Useful if you want to reset the direction the device is pointing too
 *  without impacting the current pitch or roll angle (your horizon).
 */
-(BOOL)recenter;


///  Enable pose prediction to reduce latency.
/**
 *  Recommended to use this mode for VR experience.
 *  Return true if pose prediction is supported
 */
-(BOOL)setPosePrediction:(BOOL)enable;


// Get the current pose prediction mode
/**
 *  by default prediction is off.
 */
-(BOOL)getPosePrediction;


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
-(BOOL)setModelCorrection:(VuforiaTransformModel*)transformationmodel;


/// Get the current correction model
/**
 *  return the currently set transform model used for correction.
 *  by default no transform model are used, will return to null.
 */
-(VuforiaTransformModel*)getModelCorrection;


/// Return the default head transform model
/**
 *  utility method to get the recommended Head model.
 *  Unit is in meter.
 */
-(VuforiaHeadTransformModel*)getDefaultHeadModel;


/// Returns the default handheld transform model
/**
 *  utility method to get the recommended handheld model.
 *  Unit is in meter.
 */
-(VuforiaHandheldTransformModel*)getDefaultHandheldModel;
@end

@class VuforiaDataSet;
@class VuforiaImageTargetBuilder;
@class VuforiaTargetFinder;

@interface VuforiaObjectTracker : VuforiaTracker
+(BOOL)initTracker;
+(BOOL)deinitTracker;
+(VuforiaObjectTracker*)getInstance;

/// Factory function for creating an empty dataset.
/**
 *  Returns the new instance on success, NULL otherwise. Use
 *  DataSet::destroyDataSet() to destroy a DataSet that is no longer needed.
 */
-(VuforiaDataSet*)createDataSet;

/// Destroys the given dataset and releases allocated resources.
/// Returns false if the given dataset is currently active.
-(BOOL)destroyDataSet:(VuforiaDataSet*) dataset;

/// Activates the given dataset.
/**
 *  This function will return true if the DataSet was successfully
 *  activated and false otherwise.
 *  The recommended way to activate datasets is during the execution of the
 *  UpdateCallback, which guarantees that the ObjectTracker is not working
 *  concurrently.
 */
-(BOOL)activateDataSet:(VuforiaDataSet*)dataset;

/// Deactivates the given dataset.
/**
 *  This function will return true if the DataSet was successfully
 *  deactivated and false otherwise (E.g. because this dataset is not
 *  currently active).
 *  The recommended way to deactivate datasets is during the execution of
 *  the UpdateCallback, which guarantees that the ObjectTracker is not
 *  working concurrently.
 */
-(BOOL)deactivateDataSet:(VuforiaDataSet*)dataset;

/// Returns the idx-th active dataset. Returns NULL if no DataSet has
/// been activated or if idx is out of range.
-(VuforiaDataSet*)getActiveDataSet:(const int) idx;

/// Returns the number of currently activated dataset.
-(int)getActiveDataSetCount;

/// Returns instance of ImageTargetBuilder to be used for generated
/// target image from current scene.
-(VuforiaImageTargetBuilder*)getImageTargetBuilder;

/// Returns instance of TargetFinder to be used for retrieving
/// targets by cloud-based recognition.
-(VuforiaTargetFinder*)getTargetFinder;

///  Persist/Reset Extended Tracking
/**
 *  In persistent Extended Tracking mode, the environment map will only
 *  ever be reset when the developer calls resetExtendedTracking().
 *  This function will return true if persistent Extended Tracking
 *  was set successfully (or was already set to the specified value)
 *  and false otherwise.
 */
-(BOOL)persistExtendedTracking:(BOOL)on;

/// Resets environment map for Extended Tracking
/**
 *  Environment map can only be reset by the developer if persistent
 *  extended tracking is enabled.
 *  This function will return true if environment map was reset
 *  successfully and false otherwise.
 */
-(BOOL)resetExtendedTracking;

@end


#endif
