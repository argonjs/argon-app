/*==============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    AnchorResult.h

\brief
    Header file for AnchorResult class. 
==============================================================================*/

#ifndef _VUFORIA_ANCHOR_RESULT_H_
#define _VUFORIA_ANCHOR_RESULT_H_

// Include files
#include <Vuforia/TrackableResult.h>
#include <Vuforia/Anchor.h>

namespace Vuforia
{

/// Tracking data resulting from tracking an Anchor.
class VUFORIA_API AnchorResult : public TrackableResult
{
public:

    /// Get the Type for class 'AnchorResult'
    static Type getClassType();

    /// Get the Anchor that participated in generating this result.
    virtual const Anchor& getTrackable() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_ANCHOR_RESULT_H_
