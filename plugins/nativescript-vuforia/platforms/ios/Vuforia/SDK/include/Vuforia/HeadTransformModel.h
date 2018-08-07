/*==============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    HeadTransformModel.h

\brief
    Header file for HeadTransformModel class. 
==============================================================================*/

#ifndef _VUFORIA_HEAD_TRANSFORM_MODEL_H_
#define _VUFORIA_HEAD_TRANSFORM_MODEL_H_

// Include files
#include <Vuforia/TransformModel.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

/// A type of TransformModel specialized for head-mounted tracking.
/**
 * The HandheldTransformModel is a transform model that is mainly useful for
 * 3DOF tracking (ie rotation only) in a head-mounted device context.
 *
 * It corresponds to a tracking application where all possible device poses
 * are expected to occur on the surface of a sphere centered about the user's
 * neck. The sphere is defined by a call to setPivotPoint().
 */
class VUFORIA_API HeadTransformModel : public TransformModel
{
public:

    /// Get the Type for class 'HeadTransformModel'
    virtual TYPE getType() const;

    /// Constructor.
    HeadTransformModel();

    /// Copy constructor.
    HeadTransformModel(const HeadTransformModel& other);

    /// Constract a HeadTransformModel with the given pivot point.
    HeadTransformModel(const Vec3F& pivotPos);

    /// Set the pivot point.
    /**
     * \param pivot The pivot point, in meters, relative to the device (i.e. the
     * device is at (0,0,0) with no rotation).
     *
     * An underlying pivot model will be used to estimate the device's location
     * based on its orientation, as a point on a sphere implicitly defined by the
     * pivot point vector. This assumes that the device's orientation remains
     * fixed relative to the user's head.
     */
    virtual bool setPivotPoint(const Vec3F& pivot);

    /// Get the pivot point.
    /**
     * The default pivot point is based on average anthropomorphic measurements.
     */
     virtual const Vec3F& getPivotPoint() const;

    // Destructor.
    virtual ~HeadTransformModel();

protected:

    Vec3F pivotPosition;
};

} // namespace Vuforia

#endif //_VUFORIA_HEAD_TRANSFORM_MODEL_H_
