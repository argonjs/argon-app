/*==============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    HandheldTransformModel.h

\brief
    Header file for HandheldTransformModel class. 
==============================================================================*/

#ifndef _VUFORIA_HANDHELD_TRANSFORM_MODEL_H_
#define _VUFORIA_HANDHELD_TRANSFORM_MODEL_H_

// Include files
#include <Vuforia/Vectors.h>
#include <Vuforia/TransformModel.h>
#include <Vuforia/System.h>

namespace Vuforia
{

/// A type of TransformModel specialized for handheld tracking.
/**
 *  The HandheldTransformModel is a transform model that is mainly useful for
 *  3DOF tracking (ie rotation only) in a mobile device context.
 *
 *  This corresponds to a scenario where the user moves a hand-held device around
 *  their body without moving themselves in space, so that the possible positions
 *  of the device lie roughly on the surface of a sphere, with the user at the
 *  center.
 *
 *  The center of this sphere can be set at runtime. See setPivotPoint() for more
 *  details about the pivot point.
 */
class VUFORIA_API HandheldTransformModel : public TransformModel
{
public:

    /// Get the Type for class 'HandheldTransformModel'.
    virtual TYPE getType() const;

    /// Default constructor.
    HandheldTransformModel();

    /// Copy constructor.
    HandheldTransformModel(const HandheldTransformModel& other);

    /// Define a HandheldTransformModel with the given pivot point.
    HandheldTransformModel(const Vec3F& pivotPos);

    /// Set the pivot point.
    /**
     * An underlying pivot model will be used to estimate the device's location
     * based on its orientation, as a point on a sphere implicitly defined by
     * the pivot point vector. This assumes that the device's orientation remains
     * fixed relative to the user's arm.
     *
     * Therefore, an ideal pivot point for some applications might correspond to
     * the user's elbow, if it is expected that the user will stand still, holding
     * their upper arm steady and only rotating their elbow joint to move their
     * forearm holding the device.
     *
     * Another ideal pivot point for some other applications might correspond to the
     * user's chest or center of mass, if it is expected that they will keep their
     * arms rigid and rotate their whole body about their chest or center of mass.
     *
     * \param pivot The pivot point, in meters, relative to the device (i.e. the
     * device is at (0,0,0) with no rotation).
     */
    virtual bool setPivotPoint(const Vec3F& pivot);

    /// Get the pivot point.
    /**
     * The default pivot point is based on average anthropomorphic measurements. In
     * order to position the device with respect to the user's body using the default
     * pivot point, you should apply a translation to the device pose to move the
     * device along the Y axis to elbow height position (0.9m for a person who is
     * 1.8m tall).
     */
    virtual const Vec3F& getPivotPoint() const;
    
    // Destructor.
    virtual ~HandheldTransformModel();

protected:

    Vec3F pivotPosition;
};

} // namespace Vuforia

#endif //_VUFORIA_HANDHELD_TRANSFORM_MODEL_H_
