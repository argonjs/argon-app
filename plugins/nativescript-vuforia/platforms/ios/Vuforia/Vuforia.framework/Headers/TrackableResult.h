/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    TrackableResult.h

\brief
    Header file for TrackableResult class.
===============================================================================*/

#ifndef _VUFORIA_TRACKABLERESULT_H_
#define _VUFORIA_TRACKABLERESULT_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/System.h>
#include <Vuforia/Trackable.h>
#include <Vuforia/Vuforia.h>

namespace Vuforia
{
    
/// Base class for data about actively tracked objects.
/**
 * A TrackableResult represents the state of a particular Trackable at a particular
 * moment in time.
 *
 * The state information includes:
 *
 * - A 6DOF pose
 * - A status (i.e. whether and/or how the Trackable is currently being tracked)
 * - The corresponding Trackable and its Type
 *
 * TrackableResult instances are typically retrieved from (and fully owned by)
 * a State.
 */
class VUFORIA_API TrackableResult : private NonCopyable
{
public:

    /// Get the Type for class 'TrackableResult'.
    static Type getClassType();

    /// Get the Type of this instance (typically a subclass of TrackableResult).
    virtual Type getType() const = 0;

    /// Check if this instance is of the given Type or any of its subclasses.
    virtual bool isOfType(Type type) const = 0;

    /// Get the time stamp for this result.
    /**
     * Get the time stamp representing the time that this result was observed,
     * in seconds since application startup time. Typically this is the same as
     * the timestamp of the Frame where this TrackableResult was observed, unless
     * the Trackable uses a predictive model or non-camera-based tracking.
     *
     * The time stamp can be used to compare different TrackableResult instances
     * for the same Trackable over time.
     *
     * \returns Time stamp for this result, in seconds since the application
     *    startup time.
     **/
    virtual double getTimeStamp() const = 0;


    /// The tracking status of the trackable.
    /** \public */
    enum STATUS
    {
        NO_POSE,            ///< No pose was delivered for the trackable.
        LIMITED,            ///< The trackable is being tracked in a limited form.
        DETECTED,           ///< The trackable was detected.
        TRACKED,            ///< The trackable is being tracked.
        EXTENDED_TRACKED    ///< The trackable is being tracked using extended tracking.
    };

    /// Information on the tracking status.
    /** \public */
    enum STATUS_INFO
    {
        NORMAL,                          ///< Status is normal, ie not \ref NO_POSE or \ref LIMITED.
        UNKNOWN,                         ///< Unknown reason for the tracking status.
        INITIALIZING,                    ///< The tracking system is currently initializing.
        RELOCALIZING,                    ///< The tracking system is currently relocalizing.
        EXCESSIVE_MOTION,                ///< The device is moving too fast.
        INSUFFICIENT_FEATURES            ///< There are insufficient features available in the scene.
    };

    /// Get the tracking status of the Trackable.
    /**
     * You can use the returned STATUS to help determine the quality and characteristics of the tracking process that was when creating this TrackableResult.
     */
    virtual STATUS getStatus() const = 0;

    /// Get further information about the tracking status of the Trackable.
    virtual STATUS_INFO getStatusInfo() const = 0;

    /// Get the Trackable that participated in generating this result.
    virtual const Trackable& getTrackable() const = 0;

    /// Get the pose of the associated Trackable.
    /**
     * Get the pose of the Trackable at the moment in time when this
     * TrackableResult was observed (or predicted).
     *
     * The pose represents a transform from a target coordinate system (i.e.
     * the coordinate system of the Trackable) to the world coordinate system.
     *
     * In other words, if this TrackableResult comes from an ObjectTracker and
     * you render 3D geometry using
     *
     * - the pose matrix as the geometry's model-view matrix, and
     * - a projection matrix obtained from a RenderingPrimitives instance
     *
     * then
     *
     * - (0,0,0) in your 3D geometry's local coordinate space will correspond to
     *   (0,0,0) in the Trackable's coordinate space, and
     * - your 3D geometry will rotate in the view to match the rotation of the
     *   Trackable.
     *
     * The result of this is that your application's view will contain geometry
     * that appears to be at the same place in the view as the Trackable. (Note
     * that depending on the type of Tracker there may be some drift under certain
     * conditions.)
     *
     * \note When the Trackable's STATUS (as returned by getStatus()) is NO_POSE,
     * this method will return the identity matrix.
     *
     * \returns A 3x4 row-major matrix representing the observed pose of the
     * Trackable, or the identity matrix if the Trackable's STATUS is NO_POSE.
     * (When using OpenGL, use Tool::convertPose2GLMatrix to convert to an
     * OpenGL-compatible matrix).
     */
    virtual const Matrix34F& getPose() const = 0;

    virtual ~TrackableResult() {}
};

} // namespace Vuforia

#endif //_VUFORIA_TRACKABLERESULT_H_
