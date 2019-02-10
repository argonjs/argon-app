/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    CameraCalibration.h

\brief
    Header file for CameraCalibration class.
===============================================================================*/

#ifndef _VUFORIA_CAMERACALIBRATION_H_
#define _VUFORIA_CAMERACALIBRATION_H_

// Include files
#include <Vuforia/Vectors.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

/// Represents intrinsic parameters for a particular camera and lens configuration.
/**
 * Intrinsic parameters refers to the physical characteristics of the camera
 * such as focal length, principal point and distortion characteristics, based
 * on the pinhole camera model.
 */
class VUFORIA_API CameraCalibration : private NonCopyable
{
public:

    /// Get the resolution of the camera, in pixels.
    virtual Vec2F getSize() const = 0;

    /// Get the focal length in both the x and y directions.
    virtual Vec2F getFocalLength() const = 0;

    /// Get the principal point.
    virtual Vec2F getPrincipalPoint() const = 0;

    /// Get parameters representing the camera's radial distortion.
    virtual Vec4F getDistortionParameters() const = 0;

    /// Get the field of view in both the x and y directions.
    virtual Vec2F getFieldOfViewRads() const = 0;
};

} // namespace Vuforia

#endif // _VUFORIA_CAMERACALIBRATION_H_
