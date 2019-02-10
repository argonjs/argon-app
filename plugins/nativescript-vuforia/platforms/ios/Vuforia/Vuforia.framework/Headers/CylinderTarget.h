/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2013-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    CylinderTarget.h

\brief
    Header file for CylinderTarget class.
===============================================================================*/

#ifndef _VUFORIA_CYLINDERTARGET_H_
#define _VUFORIA_CYLINDERTARGET_H_

// Include files
#include <Vuforia/Trackable.h>
#include <Vuforia/ObjectTarget.h>

namespace Vuforia
{

/// A type of ObjectTarget that represents a cylindrical or conical object.
/**
 * CylinderTarget extends ObjectTarget by adding convenience methods that call
 * ObjectTarget::setSize() on your behalf with a size calculated by setting one
 * of the three defining geometric parameters of a cone or cylinder (i.e. the
 * side length, top diameter, or bottom diameter).
 *
 * Scaling is always applied uniformly, so setting one parameter implicitly sets
 * the other parameters to match.
 *
 * \note
 * It is not possible to modify a CylinderTarget while its DataSet is active.
 * See the DataSet class for more information.
 */
class VUFORIA_API CylinderTarget : public ObjectTarget
{
public:

    /// Get the Type for class "CylinderTarget"
    static Type getClassType();

    /// Get the side length/height of the cylinder or cone that comprises this target, in meters.
    virtual float getSideLength() const = 0;

    /// Apply a uniform scale to this target to set the side length/height of its cylinder/cone.
    /**
     * \note
     * The top and bottom diameter will also be scaled to maintain uniform scaling.
     *
     * \param sideLength The desired side length (if this target is a cylinder)
     * or height (if this target is a cone), in meters.
     * \returns true on success, otherwise false.
     */
    virtual bool setSideLength(float sideLength) = 0;

    /// Get the top diameter of the cylinder target, in meters.
    virtual float getTopDiameter() const = 0;

    /// Apply a uniform scale to this target to set the top diameter of its cylinder/cone.
    /**
     * If this target represents a cylinder, setTopDiameter() and setBottomDiameter()
     * will produce identical behaviour.
     *
     * If this target represents a cone with top diameter = 0, it is not possible
     * to apply a scale by changing the top diameter, so you should not call
     * this function.
     *
     * \note
     * The side length and bottom diameter will also be scaled to maintain
     * uniform scaling.
     *
     * \param topDiameter The desired top diameter of the cylinder or cone, in meters.
     * \returns true on success, otherwise false.
     */
    virtual bool setTopDiameter(float topDiameter) = 0;

    /// Get the bottom diameter of the cylinder or cone that comprisese this target, in meters.
    virtual float getBottomDiameter() const = 0;

    /// Apply a uniform scale to this target to set the bottom diameter of its cylinder/cone.
    /**
     * If this target represents a cylinder, setTopDiameter() and setBottomDiameter()
     * will produce identical behaviour.
     *
     * If this target represents a cone with bottom diameter = 0, it is not possible
     * to apply a scale by changing the bottom diameter, so you should not call
     * this function.
     *
     * \note
     * The side length and top diameter will be scaled to maintain uniform scaling.
     *
     * \param bottomDiameter The desired bottom diameter of the cylinder or cone, in meters.
     * \returns true on success, otherwise false.
     */
    virtual bool setBottomDiameter(float bottomDiameter) = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_CYLINDERTARGET_H_
