/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Obb2d.h

\brief
    Header file for Obb3d class.
===============================================================================*/

#ifndef _VUFORIA_OBB3D_H_
#define _VUFORIA_OBB3D_H_

// Include files
#include <Vuforia/Vuforia.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

/// A 3D oriented bounding box.
class VUFORIA_API Obb3D
{
public:

    /// Constructor.
    Obb3D();

    /// Copy constructor.
    Obb3D(const Obb3D& other);

    /// Construct from center, half extents and rotation.
    /**
     * \param nCenter The center of the box.
     * \param nHalfExtents The half width, half height and half-depth of the
     * (unrotated) box
     * \param nRotationZ Counter-clock-wise rotation angle around the Z axis, in
     * radians
     */
    Obb3D(const Vec3F& nCenter, const Vec3F& nHalfExtents,
        float nRotationZ);

    /// Get the center of the bounding box.
    virtual const Vec3F& getCenter() const;

    /// Get the half width, depth, and height of the bounding box.
    virtual const Vec3F& getHalfExtents() const;

    /// Get the rotation of the bounding box.
    /**
     * \return the counter-clock-wise rotation angle of the bounding box around
     * the Z axis, in radians.
     */
    virtual float getRotationZ() const;

    virtual ~Obb3D();

protected:

    Vec3F center;
    Vec3F halfExtents;
    float rotation;
};

} // namespace Vuforia

#endif // _VUFORIA_OBB3D_H_
