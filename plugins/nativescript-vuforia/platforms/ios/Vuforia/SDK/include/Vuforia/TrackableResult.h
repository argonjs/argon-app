/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    TrackableResult.h

@brief
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
    
/// Base class for all result objects.
/**
 *  A TrackableResult is an object that represents the state of a Trackable
 *  which was found in a given frame. Every TrackableResult has a corresponding
 *  Trackable, a type, a 6DOF pose and a status (e.g. tracked).
 */
class VUFORIA_API TrackableResult : private NonCopyable
{
public:

    /// Returns the TrackableResult class' type
    static Type getClassType();

    /// Returns the TrackableResult instance's type
    virtual Type getType() const = 0;

    /// Checks whether the TrackableResult instance's type equals or has been
    /// derived from a give type
    virtual bool isOfType(Type type) const = 0;

    /// A time stamp that defines when the trackable result was generated
    /**
     *  Value in seconds representing the offset to application startup time.
     *  The timestamp can be used to compare trackable results.
     *
     *  Returns 0.0 when the STATUS is set to NO_POSE.
     */
    virtual double getTimeStamp() const = 0;


    /// The tracking status of the trackable.
    enum STATUS
    {
        NO_POSE,            ///< No pose was delivered for the trackable.
        LIMITED,            ///< The trackable is being tracked in a limited form.
        DETECTED,           ///< The trackable was detected.
        TRACKED,            ///< The trackable is being tracked.
        EXTENDED_TRACKED    ///< The trackable is being tracked using extended tracking.
    };

    /// Information on the tracking status.
    enum STATUS_INFO
    {
        NORMAL,                          ///< Status is normal, i.e. not STATUS::NO_POSE or STATUS::LIMITED.
        UNKNOWN,                         ///< Unknown reason for the tracking status.
        INITIALIZING,                    ///< The tracking system is currently initializing.
        EXCESSIVE_MOTION,                ///< The device is moving too fast.
        INSUFFICIENT_FEATURES            ///< There are insufficient features available in the scene.
    };

    /// Returns the tracking status.
    virtual STATUS getStatus() const = 0;

    /// Returns information on the tracking status.
    virtual STATUS_INFO getStatusInfo() const = 0;

    /// Returns the corresponding Trackable that this result represents
    virtual const Trackable& getTrackable() const = 0;

    /// Returns the current pose matrix in row-major order
    /**
     *  A pose is defined in a base coordinate system and defines a transformation
     *  from a target coordinate system to a base coordinate system.
     *
     *  Returns the identity matrix when the STATUS is set to NO_POSE.
     */
    virtual const Matrix34F& getPose() const = 0;

    /// Returns the base coordinate system defined for the pose
    /**
     *  Returns COORDINATE_SYSTEM_UNKNOWN when the STATUS is set to NO_POSE.
     */
    virtual COORDINATE_SYSTEM_TYPE getCoordinateSystem() const = 0;

    virtual ~TrackableResult()  {}
};

} // namespace Vuforia

#endif //_VUFORIA_TRACKABLERESULT_H_
