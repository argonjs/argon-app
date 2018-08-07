/*===============================================================================
Copyright (c) 2015-2016,2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    EyewearCalibrationReading.h

\brief
    Header file for EyewearCalibrationReading struct.
===============================================================================*/

#ifndef _VUFORIA_EYEWEARCALIBRATIONREADING_H_
#define _VUFORIA_EYEWEARCALIBRATIONREADING_H_

// Include files
#include <Vuforia/Matrices.h>

namespace Vuforia
{

/// Structure for an eyewear calibration reading to be used with EyewearUserCalibration.
struct EyewearCalibrationReading
{
    /// Type of calibration shape used during the calibration process
    enum AlignmentType
    {

        RECTANGLE = 0,      ///< The calibration shape is a rectangle
        HORIZONTAL_LINE,    ///< The calibration shape is a horizontal line
        VERTICAL_LINE       ///< The calibration shape is a vertical line
    };

    /// Pose matrix from a TrackableResult
    Matrix34F mPose;

    /**
     * A value in the range 0..1 that specifies the amount of rendering surface
     * height that the calibration shape uses
     */
    float mScale;

    /**
     * A value in the range -1..1 that specifies the horizontal center of the
     * calibration shape on the rendering surface
     */
    float mCenterX;

    /**
     * A value in the range -1..1 that specifies the vertical center of the
     * calibration shape on the rendering surface
     */
    float mCenterY;

    /// The type of calibration shape that was used when creating this reading
    AlignmentType mType;
};

} // namespace Vuforia

#endif //_VUFORIA_EYEWEARCALIBRATIONREADING_H_
