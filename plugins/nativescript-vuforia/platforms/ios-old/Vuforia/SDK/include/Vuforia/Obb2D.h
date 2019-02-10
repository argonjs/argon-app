/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2013-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Obb2d.h

\brief
    Header file for Obb2d class.
===============================================================================*/

#ifndef _VUFORIA_OBB2D_H_
#define _VUFORIA_OBB2D_H_

#include <Vuforia/Vuforia.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

/// A 2D oriented bounding box.
class VUFORIA_API Obb2D
{
public:

    /// Constructor.
    Obb2D();

    /// Copy constructor.
    Obb2D(const Obb2D& other);

    /// Construct from center, half extents and rotation.
    /**
     * \param nCenter The center of the box.
     * \param nHalfExtents The half width and half height of the (unrotated) box
     * \param nRotation Counter-clock-wise rotation angle with respect to the X
     * axis, in radians.
     */
    Obb2D(const Vec2F& nCenter, const Vec2F& nHalfExtents,
        float nRotation);

    /// Get the center of the bounding box.
    virtual const Vec2F& getCenter() const;

    /// Get the half width and half height of the bounding box.
    virtual const Vec2F& getHalfExtents() const;

    /// Get the rotation angle of the box.
    /**
     * \returns the counter-clock-wise rotation angle of the bounding box, in radians
     */
    virtual float getRotation() const;

    virtual ~Obb2D();

protected:

    Vec2F center;
    Vec2F halfExtents;
    float rotation;
};

} // namespace Vuforia

#endif // _VUFORIA_OBB2D_H_
