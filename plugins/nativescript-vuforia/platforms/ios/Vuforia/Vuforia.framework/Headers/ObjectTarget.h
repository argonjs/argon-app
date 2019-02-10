/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ObjectTarget.h

\brief
    Header file for the ObjectTarget Trackable type.
===============================================================================*/

#ifndef _VUFORIA_OBJECTTARGET_H_
#define _VUFORIA_OBJECTTARGET_H_

// Include files
#include <Vuforia/Trackable.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

/// A type of Trackable that represents a real-world object.
class VUFORIA_API ObjectTarget : public Trackable
{
public:
    /// Get the Type for class "Trackable".
    static Type getClassType();

    /// Get the persistent system-wide unique id for this target.
    /**
     * A target's unique id, which may be generated offline, identifies an
     * ObjectTarget across multiple %Vuforia sessions. It is a property of
     * %Vuforia's model of the object being tracked, and typically resides on
     * permanent storage as part of loadable DataSet.
     *
     * \note
     * Be careful not to confuse getUniqueTargetId() (which is persistent
     * across %Vuforia sessions) with Trackable::getId() (which is generated at
     * runtime and not persistent).
     */
    virtual const char* getUniqueTargetId() const = 0;

    /// Get the size of this target.
    /**
     * \return The size of this target, in meters (width, height, depth).
     */
    virtual Vec3F getSize() const = 0;

    /// Apply a uniform scale to this target that makes it the given size.
    /**
     * The requested size must represent a uniform scaling of the original
     * target's size (within a small margin of error.)
     *
     * If you try to set a size that is not the result of a uniform scaling of
     * the model stored in the DataSet, this method will fail.
     *
     * Once the size is changed, the original size is lost. If you need to be
     * able to restore the original size, call getSize() first and store the
     * result.
     *
     * \note
     * The DataSet that this Target belongs must not be active when this
     * function is called.
     *
     * \note
     * Rescaling should only be used if you have different physical copies of the
     * object at different sizes (for example if you have an image printed at
     * both A4 and A0 sizes). Do not use this method if you want to virtually
     * re-scale the pose returned by the tracker - this should be handled by your
     * own application logic.
     *
     * \param size The desired size of the target, in meters (width, height,
     * depth).
     * \returns true if the size was set successfully, or false if the DataSet
     * is active or the requested size does not represent a uniform scaling of
     * the size of model stored in the DataSet.
     */
    virtual bool setSize(const Vec3F& size) = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_OBJECTTARGET_H_
