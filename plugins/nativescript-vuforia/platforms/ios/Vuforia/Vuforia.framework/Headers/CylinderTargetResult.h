/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2013-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    CylinderTargetResult.h

\brief
    Header file for CylinderTargetResult class.
===============================================================================*/

#ifndef _VUFORIA_CYLINDERTARGETRESULT_H_
#define _VUFORIA_CYLINDERTARGETRESULT_H_

// Include files
#include <Vuforia/ObjectTargetResult.h>
#include <Vuforia/CylinderTarget.h>

namespace Vuforia
{

/// Tracking data resulting from tracking a CylinderTarget
class VUFORIA_API CylinderTargetResult : public ObjectTargetResult
{
public:

    /// Get the Type for class 'CylinderTargetResult'
    static Type getClassType();

    /// Get the CylinderTarget that participated in generating this result.
    virtual const CylinderTarget& getTrackable() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_CYLINDERTARGETRESULT_H_
