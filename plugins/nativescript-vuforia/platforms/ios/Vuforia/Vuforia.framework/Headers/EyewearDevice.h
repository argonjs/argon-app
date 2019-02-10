/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Confidential and Proprietary - Protected under copyright and other laws.
Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
EyewearDevice.h

\brief
Header file for EyewearDevice class.
==============================================================================*/

#ifndef _VUFORIA_EYEWEAR_DEVICE_H_
#define _VUFORIA_EYEWEAR_DEVICE_H_

// Include files
#include <Vuforia/Device.h>
#include <Vuforia/EyewearCalibrationProfileManager.h>
#include <Vuforia/EyewearUserCalibrator.h>

namespace Vuforia
{

/// A type of Device which is used when %Vuforia runs on dedicated eyewear.
class VUFORIA_API EyewearDevice : public Device
{
public:

    /// Device orientation
    enum ORIENTATION
    {
        ORIENTATION_UNDEFINED = 0,  ///< The device's orientation is undefined.
        ORIENTATION_PORTRAIT,       ///< The device orientation is portrait
        ORIENTATION_LANDSCAPE_LEFT, ///< The device orientation is landscape,
                                    ///< rotated left from portrait
        ORIENTATION_LANDSCAPE_RIGHT ///< The device orientation is landscape,
                                    ///< rotated right from portrait
    };

    /// Get the Type for class 'EyewearDevice'.
    static Type getClassType();

    /// Get whether this eyewear device has a see-through display.
    virtual bool isSeeThru() const = 0;

    /// Get whether this eyewear device has a display for each eye (i.e. stereo).
    virtual bool isDualDisplay() const = 0;

    /// Set whether the display surface is extended over both eyes, or duplicated.
    /**
     * For eyewear with a display for each eye (i.e. isDualDisplay() returns true),
     * %Vuforia can either extend the output display to cover each eye (and
     * therefore provide stereo output), or duplicate displayed content in each
     * eye (providing mono output).
     *
     * \param enable true to extend the display surface across both eyes and enable
     * 3D (stereo) mode, false to duplicate content for each eye and use 2D
     * (mono) mode
     * \returns true if successful, or false if the device doesn't support
     * the request.
     */
    virtual bool setDisplayExtended(bool enable) = 0;

    /// Get whether the display surface is extended over both eyes.
    /** See setDisplayExtended(). */
    virtual bool isDisplayExtended() const = 0;

    /// Returns true if the Eyewear device dual display mode is only for OpenGL content.
    /**
     *  Some Eyewear devices don't support stereo for 2D (typically Android widget)
     *  content. On these devices 2D content is rendered to each eye automatically
     *  without the need for the app to create a split screen view. On such devices
     *  this method will return true.
     */
    virtual bool isDisplayExtendedGLOnly() const = 0;

    /// Get the screen orientation that should be used when rendering for this device.
    virtual ORIENTATION getScreenOrientation() const = 0;

    /// Turn predictive tracking on or off.
    /**
     *  Predictive tracking uses device sensors to predict user motion and reduce
     *  perceived latency.
     *
     *  By default, predictive tracking is enabled on devices that support it.
     *
     *  \param enable true to use predictive tracking via device sensors, or false
     *  to disable predictive tracking.
     *  \returns true if successful, or false if predicted tracking was requested
     *  and the device does not support it.
     */
    virtual bool setPredictiveTracking(bool enable) = 0;

    /// Get whether predictive tracking is enabled.
    virtual bool isPredictiveTrackingEnabled() const = 0;

    /// Get the calibration profile manager.
    /**
     * \note This calibration is only relevant for see-through eyewear devices.
     */
    virtual EyewearCalibrationProfileManager& getCalibrationProfileManager() = 0;

    /// Get the calibrator used for creating custom user calibration experiences.
    /**
     * \note This calibration is only relevant for see-through eyewear devices.
     */
    virtual EyewearUserCalibrator& getUserCalibrator() = 0;
};

} // namespace Vuforia

#endif // _VUFORIA_EYEWEAR_DEVICE_H_
