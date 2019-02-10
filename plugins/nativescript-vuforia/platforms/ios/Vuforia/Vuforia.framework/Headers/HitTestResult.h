/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    HitTestResult.h

\brief
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

/// The result of a hit test performed by a SmartTerrain.
class VUFORIA_API HitTestResult : private NonCopyable
{
public:

    /// Get the position and orientation of the hit result, as a pose matrix.
    /**
     * \note The matrix is in row-major order. You may need to use
     * Tool::convertPose2GLMatrix() or similar if you are using OpenGL.
     */
    virtual Matrix34F getPose() const = 0;
    
    virtual ~HitTestResult() {}
};

} // namespace Vuforia

#endif // _VUFORIA_HITTESTRESULT_H_
