/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Trackable.h

\brief
    Header file for Trackable class.
===============================================================================*/

#ifndef _VUFORIA_TRACKABLE_H_
#define _VUFORIA_TRACKABLE_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/System.h>
#include <Vuforia/Type.h>

namespace Vuforia
{

/// Base class for all objects that can be tracked.
/**
 * Every Trackable has a name, an id and a type.
 *
 * Trackables report their tracking status and pose via TrackableResult instances,
 * which appear on the State for a given camera frame if the Trackable has been
 * detected or tracked (or extended tracked) in that frame.
 */
class VUFORIA_API Trackable : private NonCopyable
{
public:

    /// Get the Type of class 'Trackable'.
    static Type getClassType();

    /// Get the Type for this instance (typically a subclass of Trackable).
    virtual Type getType() const = 0;

    /// Check whether this instance is of the given Type or any of its subclasses.
    virtual bool isOfType(Type type) const = 0;

    /// Get a unique id for this Trackable.
    /**
     * The id is generated at runtime and is not persistent between %Vuforia sessions.
     *
     * \see ObjectTarget::getUniqueTargetId()
     */
    virtual int getId() const = 0;

    /// Get the name of this Trackable's name.
    virtual const char* getName() const = 0;

    /// Set user data for this Trackable.
    /**
     * You can set anything you like here. Retrieve it at any time using getUserData().
     *
     * \returns true if the user data was successfully set, otherwise false
     */
    virtual bool setUserData(void* userData) = 0;

    /// Get the user data that was previously set using setUserData().
    virtual void* getUserData() const = 0;

    virtual ~Trackable()  {}
};

} // namespace Vuforia

#endif //_VUFORIA_TRACKABLE_H_
