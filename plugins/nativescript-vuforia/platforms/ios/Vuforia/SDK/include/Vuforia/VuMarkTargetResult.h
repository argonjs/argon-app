/*===============================================================================
Copyright (c) 2016 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file 
    VuMarkTargetResult.h

@brief
    Header file for VuMarkTargetResult class.
===============================================================================*/
#ifndef _VUFORIA_VUMARKTARGETRESULT_H_
#define _VUFORIA_VUMARKTARGETRESULT_H_

// Include files
#include <Vuforia/ObjectTargetResult.h>
#include <Vuforia/VuMarkTarget.h>

namespace Vuforia
{

/// Result for a VuMarkTarget. 
/**
 *  The same VuMarkTarget can have multiple physical instances on screen
 *  simultaneously. In this case each appearance has its own VuMarkTargetResult,
 *  pointing to the same VuMarkTarget with the same instance ID.
 */
class VUFORIA_API VuMarkTargetResult : public ObjectTargetResult
{
public:

    /// Returns the TrackableResult class' type
    static Type getClassType();

    /// Returns the corresponding Trackable that this result represents
    virtual const VuMarkTarget& getTrackable() const = 0;

    /// Returns a unique id for a particular VuMark result, which is consistent
    /// frame-to-frame, while being tracked.  Note that this id is separate 
    /// from the trackable id.
    virtual int getId() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_VUMARKTARGETRESULT_H_
