/*==============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    DeviceTracker.h

\brief
    Header file for DeviceTracker class. 
==============================================================================*/

#ifndef _VUFORIA_DEVICE_TRACKER_H_
#define _VUFORIA_DEVICE_TRACKER_H_

// Include files
#include <Vuforia/Tracker.h>
#include <Vuforia/Matrices.h>

namespace Vuforia
{

/// Tracks the device that %Vuforia is running on in the user's environment.
/**
 *  A DeviceTracker can be used to track the user's viewpoint (i.e. the position
 *  and orientation of the mobile or head-mounted device they are using to view
 *  the augmented world).
 *
 *  A DeviceTracker makes its results available via <span>DeviceTrackableResult</span>s,
 *  returned to the user via the State. The pose returned by DeviceTrackableResult::getPose()
 *  represents a transformation between a device frame of reference and the world
 *  frame of reference. For mobile devices, the device frame of reference is the
 *  same as the camera frame of reference. For eyewear devices, the device frame
 *  of reference varies by device.
 *
 *  The origin of the world is the starting position of the device.
 *
 *  To simplify native development with a DeviceTracker, %Vuforia supports an offset
 *  transformation that can be internally applied to the returned pose. See
 *  setWorldToDeviceBaseTransform() for details.
 *
 */
class VUFORIA_API DeviceTracker : public Tracker
{
public:

    /// Get the Type for class 'DeviceTracker'.
    static Type getClassType();

    /// Set the offset transform between World and Device (Base) frame of reference.
    /**
     *  Set an offset transformation between the World Coordinate System and the
     *  Device (Base) Coordinate System. By default this transformation is identity.
     *  Offset transform will be composed with the current pose of the device tracker
     *  This offset can be used for advanced scenarios.
     *
     *  The offset transform can be used to manage nested transformations -
     *  for example, a spaceship moving in the world frame of reference, and the
     *  user's (device tracked) head defined in the spaceship frame of reference).
     *
     *  \note This is currently only supported for the RotationalDeviceTracker,
     *  and will return 'false' for the PositionalDeviceTracker.
     *
     *  \param baseTransform The offset transform to set.
     *  \returns true on success, otherwise false
     *
     */
    virtual bool setWorldToDeviceBaseTransform(const Matrix34F& baseTransform) = 0;

    /// Get the offset transform between World and Device (Base) frame of reference.
    /**
     *  \returns The offset transformation matrix, or identity in case of an error.
     */
    virtual Matrix34F getWorldToDeviceBaseTransform() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_DEVICE_TRACKER_H_
