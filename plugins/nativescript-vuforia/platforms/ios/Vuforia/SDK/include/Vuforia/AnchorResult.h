/*==============================================================================
Copyright (c) 2017 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file 
    AnchorResult.h

@brief
    Header file for AnchorResult class. 
==============================================================================*/

#ifndef _VUFORIA_ANCHOR_RESULT_H_
#define _VUFORIA_ANCHOR_RESULT_H_

// Include files
#include <Vuforia/TrackableResult.h>
#include <Vuforia/Anchor.h>

namespace Vuforia
{

/// AnchorResult class.
/**
 *  The AnchorResult defines trackable results returned
 *  by a DeviceTracker, representing a spatial anchor
 */
class VUFORIA_API AnchorResult : public TrackableResult
{
public:

    /// Returns the TrackableResult class' type
    static Type getClassType();

    /// Returns the corresponding Trackable that this result represents
    virtual const Anchor& getTrackable() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_ANCHOR_RESULT_H_
