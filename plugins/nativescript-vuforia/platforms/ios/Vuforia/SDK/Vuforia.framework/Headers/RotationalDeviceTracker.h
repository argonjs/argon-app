/*==============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    RotationalDeviceTracker.h

\brief
    Header file for RotationalDeviceTracker class. 
==============================================================================*/

#ifndef _VUFORIA_ROTATIONAL_DEVICE_TRACKER_H_
#define _VUFORIA_ROTATIONAL_DEVICE_TRACKER_H_

// Include files
#include <Vuforia/DeviceTracker.h>

namespace Vuforia
{

// Forward declarations
class TransformModel;
class HandheldTransformModel;
class HeadTransformModel;


/// A type of DeviceTracker that tracks the world-relative rotation of a device.
/**
 * The RotationalDeviceTracker tracks a device in the world using device
 * sensors (gyroscope and accelerometer).
 *
 * While this Tracker is running, the device's position and rotation are made
 * available on the State class as a DeviceTrackableResult containing a 3DOF
 * pose in the world coordinate system.
 *
 * You may use setModelCorrection() with one of the TransformModel instances
 * returned from getDefaultHeadModel() and getDefaultHandheldModel() to use a
 * correction model to improve the returned pose based on the usage context
 * (e.g. on the head for doing head tracking, holding a device in your hands
 * for handheld tracking, etc.). See HeadTransformModel and
 * HandheldTransformModel for more details.
 *
 * When using a RotationalDeviceTracker in a VR application, you can call
 * setPosePrediction(true) to improve the quality of the returned pose.
 */
class VUFORIA_API RotationalDeviceTracker : public DeviceTracker
{
public:

    /// Get the Type for class 'RotationalDeviceTracker'.
    static Type getClassType();

    /// Reset the coordinate system to the current rotation.
    /**
     * Create a new world coordinate system with the device's current rotation
     * as the origin.
     *
     * This is useful if you want to reset the direction the device is pointing
     * without impacting the current pitch or roll angle (your horizon).
     *
     * \returns true if the tracker was successfully re-centered, otherwise false
     * (check application logs for failure details).
     */
    virtual bool recenter() = 0;

    /// Enable pose prediction to reduce latency.
    /**
     * You should always enable pose prediction for VR experiences.
     *
     * \returns true if pose prediction is requested and supported, otherwise false.
     */
    virtual bool setPosePrediction(bool enable) = 0;

    /// Get the current pose prediction mode.
    /**
     * By default prediction is off.
     */
    virtual bool getPosePrediction() const = 0;

    /// Enable usage of a transform correction model for the pose.
    /**
     * Specify a correction model for the pose passed to the State.
     *
     * Correction is based on a transformation model that makes assumptions
     * about the usage context to improve the pose matrix.
     *
     * For example, if you use a device tracker for head tracking (VR), you
     * can pass a HeadTransformModel here, and the pose will be adjusted
     * appropriately.
     *
     * The rotational device tracker support two transform models:
     * - HeadTransformModel: for head tracking (VR, rotational AR experience)
     * - HandheldTransformModel: for handheld tracking.
     *
     * By default no transform model is used.
     *
     * \param transformationmodel The transformation model to use, or NULL to
     * disable model correction.
     * \returns true on success, otherwise false (check application logs for
     * failure details).
     */
    virtual bool setModelCorrection(const TransformModel* transformationmodel) = 0;

    /// Get the current correction model.
    /**
     * \returns the transform model instance currently being used for
     * correction, or NULL if no transform model is in use.
     */
    virtual const TransformModel* getModelCorrection() const = 0;

    /// Get a head transform model with a default configuration.
    virtual const HeadTransformModel* getDefaultHeadModel() const = 0;

    /// Get a handheld transform model with a default configuration.
    virtual const HandheldTransformModel* getDefaultHandheldModel() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_DEVICE_FROM_INERTIAL_TRACKER_H_
