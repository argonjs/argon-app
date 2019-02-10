/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Anchor.h

\brief
    Header file for Anchor class.
===============================================================================*/

#ifndef _VUFORIA_ANCHOR_H_
#define _VUFORIA_ANCHOR_H_

// Include files
#include <Vuforia/Trackable.h>

namespace Vuforia
{

/// A type of Trackable that represents a spatial anchor point.
/**
 * An Anchor represents a fixed position and orientation (pose) relative to the
 * real world. It can be used to accurately position objects in augmented reality.
 *
 * The lifecycle of an Anchor is managed by the PositionalDeviceTracker. See
 * PositionalDeviceTracker::createAnchor() and PositionalDeviceTracker::destroyAnchor()
 * for more information.
 */
class VUFORIA_API Anchor : public Trackable
{
public:

    /// Get the Type for class 'Anchor'
    static Type getClassType();
};

} // namespace Vuforia

#endif // _VUFORIA_ANCHOR_H_
