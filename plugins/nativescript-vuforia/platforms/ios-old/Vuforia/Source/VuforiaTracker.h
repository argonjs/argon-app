//
//  VuforiaTracker.h
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import <Foundation/Foundation.h>
#import "VuforiaSession.h"
#import "VuforiaTrackable.h"

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

@class VuforiaAnchor;

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



typedef NS_ENUM (NSInteger, VuforiaHitTestHint) {
    VuforiaHitTestHintNone = 0,   ///< no hint
    VuforiaHitTestHintHorizontalPlane = 1, ///< hit test is performed on a horizontal plane
    VuforiaHitTestHintVerticalPlane = 2, ///< hit test is performed on a vertical plane (not supported yet)
};

@class VuforiaState;

@interface VuforiaHitTestResult : NSObject
/// The position and orientation of the hit test result in the world coordinate system, represented as a pose matrix in col-major order.
-(const VuforiaMatrix34)getPose;
@end

// SmartTerrain class
@interface VuforiaSmartTerrain : VuforiaTracker
/// Returns the tracker class' type
+(int)getClassType;
+(BOOL)initTracker;
+(BOOL)deinitTracker;
+(VuforiaSmartTerrain*)getInstance;

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
-(void)hitTestWithState:(VuforiaState*)state point:(VuforiaVec2F)point deviceHeight:(float)deviceHeight hint:(VuforiaHitTestHint)hint;
    
/// Gets the number of HitTestResults resulting from the last hitTest() call
-(int)hitTestResultCount;
    
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
-(VuforiaHitTestResult*)getHitTestResultAtIndex:(int)idx;

@end


/// PositionalDeviceTracker class.
/**
 *  The PositionalDeviceTracker tracks a device in the world based
 *  on the environment. It doesn't require target to estimate
 *  the device's position. The position is returned as a 6DOF pose.
 */
@interface VuforiaPositionalDeviceTracker : VuforiaDeviceTracker
+(int)getClassType;
+(BOOL)initTracker;
+(BOOL)deinitTracker;
+(VuforiaPositionalDeviceTracker*)getInstance;

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
-(VuforiaAnchor*)createAnchorWithName:(NSString*)name pose:(const VuforiaMatrix34)pose;

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
-(VuforiaAnchor*)createAnchorWithName:(NSString*)name hitTestResult: (VuforiaHitTestResult*)hitTestResult;

/// Destroys the specified Anchor.
/**
 * Destroys the given Anchor by deleting it and cleans up all internal resources associated to it.
 * Accessing the pointer after this call results in undefined behavior.
 *
 * \param anchor The Anchor to destroy.
 *
 * \return True if destroyed successfully, false if the Anchor is invalid (e.g. null).
 */
-(bool)destroyAnchor:(VuforiaAnchor*)anchor;

/// Get the number of Anchors currently managed by the PositionalDeviceTracker.
/**
 * \return The number of Anchors.
 */
-(int)numAnchors;

/// Get the Anchor at the specified index.
/**
 * \param idx The index of the Anchor.
 *
 * \return The Anchor instance for the given index or nullptr if the index is invalid.
 */
-(VuforiaAnchor*)getAnchorAtIndex:(int)idx;
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
