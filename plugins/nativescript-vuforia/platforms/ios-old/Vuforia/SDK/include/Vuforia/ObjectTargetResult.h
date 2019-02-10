/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ObjectTarget.h

\brief
    Header file for the ObjectTargetResult class.  Exposes the result of 
    detecting and tracking a three dimensional rigid body.
===============================================================================*/

#ifndef _VUFORIA_OBJECTTARGETRESULT_H_
#define _VUFORIA_OBJECTTARGETRESULT_H_

// Include files
#include <Vuforia/TrackableResult.h>
#include <Vuforia/ObjectTarget.h>

namespace Vuforia
{

/// Tracking data resulting from tracking an ObjectTarget.
class VUFORIA_API ObjectTargetResult : public TrackableResult
{
public:

    /// Get the Type for class 'ObjectTargetResult'.
    static Type getClassType();

    /// Get the ObjectTarget that participated in generating this result.
    virtual const ObjectTarget& getTrackable() const = 0;

};

} // namespace Vuforia

#endif //_VUFORIA_OBJECTTARGETRESULT_H_
