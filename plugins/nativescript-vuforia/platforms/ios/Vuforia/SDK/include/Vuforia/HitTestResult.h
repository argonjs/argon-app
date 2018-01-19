/*===============================================================================
Copyright (c) 2017 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    HitTestResult.h

@brief
    Header file for HitTestResult class.
===============================================================================*/

#ifndef _VUFORIA_HITTESTRESULT_H_
#define _VUFORIA_HITTESTRESULT_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

/// HitTestResult represents the result of a hit test performed by SmartTerrain
class VUFORIA_API HitTestResult : private NonCopyable
{
public:
    /// The position and orientation of the hit test result in the world coordinate system, represented as a pose matrix in row-major order.
    virtual Matrix34F getPose() const = 0;
};

} // namespace Vuforia


#endif // _VUFORIA_HITTESTRESULT_H_
