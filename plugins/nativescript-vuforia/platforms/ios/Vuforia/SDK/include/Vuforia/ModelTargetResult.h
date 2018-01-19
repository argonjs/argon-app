/*===============================================================================
Copyright (c) 2017 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file 
    ModelTargetResult.h

@brief
    Header file for the ModelTargetResult class.  Exposes the result of 
    detecting and tracking a three dimensional rigid body.
===============================================================================*/

#ifndef _VUFORIA_MODELTARGETRESULT_H_
#define _VUFORIA_MODELTARGETRESULT_H_

// Include files
#include <Vuforia/ObjectTargetResult.h>
#include <Vuforia/ModelTarget.h>

namespace Vuforia
{

/// Result from detecting and tracking a rigid three dimensional body.
class VUFORIA_API ModelTargetResult : public ObjectTargetResult
{
public:

    /// Returns the TrackableResult class' type
    static Type getClassType();

    /// Returns the corresponding Trackable that this result represents
    virtual const ModelTarget& getTrackable() const = 0;

};

} // namespace Vuforia

#endif //_VUFORIA_MODELTARGETRESULT_H_

