/*===============================================================================
Copyright (c) 2017 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    Anchor.h

@brief
    Header file for Anchor class.
===============================================================================*/

#ifndef _VUFORIA_ANCHOR_H_
#define _VUFORIA_ANCHOR_H_

// Include files
#include <Vuforia/Trackable.h>

namespace Vuforia
{

/// A target representing a spatial anchor
/**
 *  An instance of the Anchor class represents a spatial anchor, which is a
 *  real-world pose that can be used for accurate positioning of objects in AR.
 *  Anchors can be created and destroyed via the DeviceTracker.
 */
class VUFORIA_API Anchor : public Trackable
{
public:

    /// Returns the Trackable class' type
    static Type getClassType();
};

} // namespace Vuforia


#endif // _VUFORIA_ANCHOR_H_
