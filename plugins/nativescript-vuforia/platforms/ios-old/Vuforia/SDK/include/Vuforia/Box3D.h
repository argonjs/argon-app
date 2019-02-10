/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Box3D.h

\brief
    Header file for Box3D class.
===============================================================================*/

#ifndef _VUFORIA_BOX3D_H_
#define _VUFORIA_BOX3D_H_

// Include files
#include <Vuforia/Vuforia.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

/// A 3D axis-aligned bounding box (AABB).
class VUFORIA_API Box3D
{
public:

    /// Constructor.
    Box3D();

    /// Copy constructor.
    Box3D(const Box3D& other);

    /// Define an axis-aligned box by specifying its minimum and maximum corners.
    /**
     * The minimum and maximum points refer to numerical minimum and maximum
     * (ie min.x < max.x, min.y < max.y, and min.z < max.z).
     *
     * \param nMinPos The minimum corner point.
     * \param nMaxPos The maximum corner point.
     */
    Box3D(const Vec3F& nMinPos, const Vec3F& nMaxPos);

    /// Get the position of the (numerical) minimum corner of the box.
    virtual const Vec3F& getMinimumPosition() const;

    /// Get the position of the (numerical) maximum corner of the box.
    virtual const Vec3F& getMaximumPosition() const;

    virtual ~Box3D();

protected:

    Vec3F minimumPosition;
    Vec3F maximumPosition;
};

} // namespace Vuforia

#endif // _VUFORIA_BOX3D_H_
