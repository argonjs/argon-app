/*===============================================================================
Copyright (c) 2016-2017 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    GuideView.h

@brief
    Header file for GuideView class.
===============================================================================*/
#ifndef _VUFORIA_GUIDEVIEW_H_
#define _VUFORIA_GUIDEVIEW_H_

// Include files
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

// Forward declarations:
class CameraCalibration;
class Image;
struct Matrix34F;

/// A guide view used to initialize snapping of ModelTargets
/**
 * The Guide View provides visual guide information that
 * that can be used to bootstrap a ModelTarget.
 */
class VUFORIA_API GuideView : private NonCopyable
{
public:
    /// Returns the intrinsics parameters of the camera associated to this view
    virtual const CameraCalibration& getIntrinsics() const = 0;

    /// Returns the extrinsics parameters of the camera associated to this view. 
    // Please note that the pose is defined in the Camera Coordinate System, and not the opposite.
    virtual const Matrix34F& getPose() const = 0;

    /// Alters the pose of the given guide view. This consequently will set the returned guide image to null,
    /// since it will not be re-rendered
    virtual void setPose(const Matrix34F& pose) = 0;

    /// Returns the image associated to this view
    virtual const Image* getImage() const = 0;

    virtual ~GuideView() {}
};

} // namespace Vuforia

#endif //_VUFORIA_GUIDEVIEW_H_
