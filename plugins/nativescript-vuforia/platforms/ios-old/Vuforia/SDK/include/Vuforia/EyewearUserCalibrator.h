/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    EyewearUserCalibrator.h

\brief
    Header file for EyewearUserCalibrator class.
===============================================================================*/

#ifndef _VUFORIA_EYEWEARUSERCALIBRATOR_H_
#define _VUFORIA_EYEWEARUSERCALIBRATOR_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/Vuforia.h>
#include <Vuforia/EyeID.h>
#include <Vuforia/EyewearCalibrationReading.h>

namespace Vuforia
{

/// A class for creating custom user calibration procedures for see-through eyewear.
/**
 * Users of optical see-through eyewear devices need to perform a calibration
 * to determine how to project an augmentation such that it will appear
 * registered with the real world. Such calibration is user- and
 * device-specific.
 *
 * %Vuforia provides a default calibration, but for the best possible AR experience,
 * it is recommended that the user calibrate %Vuforia for their own eyes and device.
 *
 * If the eyewear device supports stereo output, the calibration needs to be
 * carried out on each eye.
 *
 * The units of measurement throughout calibration is meters.
 * The calibration image target used should have its size specified in meters
 * when initializing this object. The size passed to init() must match both the size
 * specified in the dataset for the target and the printed size of the target.
 */
class VUFORIA_API EyewearUserCalibrator : private NonCopyable
{
public:

    /**
     * A measure of the consistency of the data supplied by the user to the calibrator.
     */
    enum CONSISTENCY
    {
        /**
         *  There is no consistency data available, for example if only
         *  calibration data for one eye has been supplied or the calibrator
         *  has not been initialized
         */
        NONE = 0,

        /**
         *  The consistency is bad and the calibration is unlikely to result in
         *  a good user experience : the user should perform the calibration again
         */
        BAD = 1,

        /**
         *  The calibration is likely usable but the user should review the result
         *   and we suggest that they should perform the calibration again.
         */
        OK = 2,

        /**
         *  The calibration data is consistent and although this is no guarantee
         *  of a good calibration it is a strong indicator
         */
        GOOD = 3,

        CONSISTENCY_LEN = 4
    };

    /// Initialize the eyewear calibrator.
    /**
     *  This method must be called before any other members of this class.
     *
     *  \param surfaceWidth  The width (in pixels) of the rendering surface that the calibration is running in.
     *  \param surfaceHeight  The height (in pixels) of the rendering surface that the calibration is running in.
     *  \param targetWidth  The width (in meters) of the image target being used.
     *  \param targetHeight  The height (in meters) of the image target being used.
     *  
     *  \returns true if initialization is successful, false otherwise (check
     *  application logs for failure details).
     *
     */
    virtual bool init(size_t surfaceWidth, size_t surfaceHeight,
                      float targetWidth,  float targetHeight) = 0;

    /// Get a hint as to the minimum size to render a calibration shape.
    /**
     * The smaller a calibration shape is drawn, the further the user needs to
     * stand away from a target during calibration. The minimum size
     * is device specific and this method provides a hint as to the minimum practical scale.
     *
     * \returns the minimum scale to use for the calibration shape, in the range 0.0 - 1.0
     */
    virtual float getMinScaleHint() const = 0; 

    /// Get a hint as to the maximum size to render a calibration shape.
    /**
     * The larger a calibration shape is drawn, the closer the shape will be
     * to the sides of the display. Some eyewear devices have distortion
     * towards the edges of the display.
     *
     * The maximum size is device specific and this method provides a hint as to the maximum
     * practical scale.
     *
     * \returns the maximum scale to use for the calibration shape, in the range 0.0 - 1.0
     */
    virtual float getMaxScaleHint() const = 0;

    /// Get the aspect ratio that should be used to draw a calibration shape.
    /**
     * Some eyewear devices introduce rendering distortion, for example horizontal or vertical
     * stretching. The value returned by this method should be used to draw calibration shapes
     * that closely match the aspect ratio of the real-world calibration target.
     *
     * \param surfaceWidth The width (in pixels) of the rendering surface.
     * \param surfaceHeight The height (in pixels) of the rendering surface.
     * \returns the corrected aspect ratio for calibration shapes.
     */
    virtual float getDrawingAspectRatio(size_t surfaceWidth, size_t surfaceHeight) const = 0;

    /// Check whether this device stretches the display to create a stereoscopic effect.
    /**
     * When a device enters 3D it may join the displays together to create one
     * big display. On some devices, the reported resolution is unchanged - and the display is
     * effectively stretched.
     * This flag allows the app to identify this situation in order to compensate when rendering.
     *
     * \returns true if the display is stretched, otherwise false.
     */
    virtual bool isStereoStretched() const = 0;

    /// Calculate an eyewear calibration for a single eye.
    /**
     *  Calculates and returns a calibration for a single eye from a set of readings.
     *
     *  This takes an input array of EyewearCalibrationReading objects, which represent the user's
     *  perception of a Vuforia target from particular locations.
     *
     *  It passes back the calculated 'cameraToEyePose' and 'eyeProjection' matrices.
     *  These matrices are suitable for use in Eyewear Calibration Profiles.
     *
     *  init() must have been called before using this function.
     *
     *  \note On stereo devices, it is recommended to use getProjectionMatrices() instead, which
     *  calibrates both eyes simultaneously and returns a measure of consistency.
     *  
     *  \param readings  An array of calibration readings
     *  \param numReadings  The number of calibration readings
     *  \param cameraToEyePose  Calculated cameraToEyePose matrix
     *  \param eyeProjection  Calculated eyeProjection matrix
     *  
     *  \returns true if the call is successful, otherwise false.
     */
    virtual bool getProjectionMatrix(EyewearCalibrationReading readings[],
        int numReadings, Matrix34F& cameraToEyePose, Matrix34F& eyeProjection) = 0;

    /// Calculate an eyewear calibration for both eyes.
    /**
     *  Calculates and returns a calibration for both eyes from a set of readings.
     *
     *  This takes an input array of EyewearCalibrationReading objects for each eye, which represent
     *  the user's perception of a Vuforia target from particular locations.
     *
     *  It passes back the calculated 'cameraToEyePose' and 'eyeProjection' matrices for each eye.
     *  These matrices are suitable for use in Eyewear Calibration Profiles.
     *
     *  The return value represents the consistency of the calibration between the two eyes.
     *  A more consistent calibration is likely to result in augmentations that converge
     *  and sit correctly on the desired real-world location.
     *  This will result in a more comfortable experience for the user.
     *
     *  init() must have been called before using this function.
     *  
     *  \param leftReadings  An array of calibration readings for the left eye
     *  \param numLeftReadings The number of calibration readings for the left eye
     *  \param rightReadings  An array of calibration readings for the right eye
     *  \param numRightReadings The number of calibration readings for the right eye
     *  \param leftCameraToEyePose  Calculated cameraToEyePose matrix for the left eye
     *  \param leftEyeProjection  Calculated eyeProjection matrix for the left eye
     *  \param rightCameraToEyePose  Calculated cameraToEyePose matrix for the right eye
     *  \param rightEyeProjection  Calculated eyeProjection matrix for the right eye
     *
     *  \returns  A CONSISTENCY value
     */
    virtual CONSISTENCY getProjectionMatrices(EyewearCalibrationReading leftReadings[],
                                              int numLeftReadings,
                                              EyewearCalibrationReading rightReadings[],
                                              int numRightReadings,
                                              Matrix34F& leftCameraToEyePose, Matrix34F& leftEyeProjection,
                                              Matrix34F& rightCameraToEyePose, Matrix34F& rightEyeProjection) = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_EYEWEARUSERCALIBRATOR_H_
