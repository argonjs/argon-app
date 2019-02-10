/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ObjectTargetRawResult.h

\brief
    Header file for ObjectTargetRawResult class.
===============================================================================*/

#ifndef _VUFORIA_OBJECTTARGETRAWRESULT_H_
#define _VUFORIA_OBJECTTARGETRAWRESULT_H_

// Include files
#include <Vuforia/TrackableResult.h>
#include <Vuforia/ObjectTargetRaw.h>

namespace Vuforia
{

/// Private TrackableRawResult for Object Target
class VUFORIA_API ObjectTargetRawResult : public TrackableResult 
{
public:

    /// Returns the TrackableResult class' type
    static Type getClassType();

    /// Returns the corresponding Trackable that this result represents
    virtual const ObjectTargetRaw& getTrackable() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_OBJECTTARGETRAWRESULT_H_
