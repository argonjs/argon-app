/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    CameraDevice.h

\brief
    Header file for CameraDevice class.
===============================================================================*/

#ifndef _VUFORIA_CAMERADEVICE_H_
#define _VUFORIA_CAMERADEVICE_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/NonCopyable.h>
#include <Vuforia/VideoMode.h>
#include <Vuforia/CameraCalibration.h>
#include <Vuforia/CameraField.h>

namespace Vuforia
{
/// Provides access to the device's built-in camera.
/**
 * The CameraDevice is a singleton, accessible via CameraDevice::getInstance()
 * after Vuforia::init() has succeeded.
 *
 * It provides control over the camera lifecycle (init(), deinit(), start(), and
 * stop()), frame size and FPS (selectVideoMode()), torch (if available)
 * (setFlashTorchMode()), and autofocus (setFocusMode()).
 *
 * It also provides access to advanced camera properties such as ISO and exposure
 * compensation (setField()). See CameraField for more details.
 *
 * \par CameraDevice and your app's lifecycle
 * The CameraDevice needs special handling if you respond to suspend and resume
 * events, such as when your app is sent to the background on a mobile device.
 * See Vuforia::init() for more details.
 */
class VUFORIA_API CameraDevice : private NonCopyable
{
public:

    enum MODE
    {
        MODE_DEFAULT = -1,                ///< Default camera mode
        MODE_OPTIMIZE_SPEED = -2,         ///< Fast camera mode
        MODE_OPTIMIZE_QUALITY = -3,       ///< High-quality camera mode
    };

    enum FOCUS_MODE 
    {
        FOCUS_MODE_NORMAL,           ///< Default focus mode
        FOCUS_MODE_TRIGGERAUTO,      ///< Triggers a single autofocus operation
        FOCUS_MODE_CONTINUOUSAUTO,   ///< Continuous autofocus mode
        FOCUS_MODE_INFINITY,         ///< Focus set to infinity
        FOCUS_MODE_MACRO             ///< Macro mode for close-up focus
    };

    enum CAMERA_DIRECTION
    { 
        CAMERA_DIRECTION_DEFAULT,   ///< Default camera direction (device-specific,
                                    ///  usually maps to back camera) (DEPRECATED)
        CAMERA_DIRECTION_BACK,      ///< The camera is facing in the opposite direction as the screen (DEPRECATED)
        CAMERA_DIRECTION_FRONT,     ///< The camera is facing in the same direction as the screen. (DEPRECATED)
                                    ///< Notes: This enum is deprecated.
                                    ///< Front camera support will be removed in a future Vuforia release.
                                    ///< The front camera is not compatible with DeviceTracker
                                    ///< nor with SmartTerrain.
    };

    /// Get the CameraDevice singleton instance.
    /**
     * The singleton instance is available immediately after Vuforia::init() has
     * succeeded.
     *
     * It is no longer available after calling Vuforia::deinit().
     */
    static CameraDevice& getInstance();
    
    /// Initialize the camera.
    /**
     * \note
     * This method must be handled carefully as part of your application's lifecyle.
     * See the "Lifecycle of a Vuforia app" section on the main %Vuforia
     * reference page for more information.
     * \ref Lifecycle "Lifecycle of a Vuforia app"
     *
     * \return true if the camera was initialized, or false on failure (check
     * application logs for details).
     */
    virtual bool init() = 0;
    
    /// Initialize the camera with a specific direction. (DEPRECATED)
    /**
     * \note
     * This method must be handled carefully as part of your application's lifecyle.
     * See the "Lifecycle of a Vuforia app" section on the main %Vuforia
     * reference page for more information.
     * \ref Lifecycle "Lifecycle of a Vuforia app"
     *
     * \param camera The camera to initialize. If your device has only one camera,
     * pass CAMERA_DIRECTION_DEFAULT.
     * \return true if the camera was initialized, or false on failure (check
     * application logs for details).
     *
     * \deprecated This method has been deprecated. It will be removed in an
     * upcoming %Vuforia release. Use CameraDevice::init() instead.
     */
    virtual bool init(CAMERA_DIRECTION camera) = 0;

    /// Deinitialize the camera.
    /**
     *  Release any resources created or used by the camera.
     *
     *  \note
     *  This method should not be called during the execution of the
     *  UpdateCallback
     *
     *  \note
     *  This method must be handled carefully as part of your application's
     *  lifecyle. See the "Lifecycle of a Vuforia app" section on the main %Vuforia
     *  reference page for more information.
     *  \ref Lifecycle "Lifecycle of a Vuforia app"
     *
     *  \returns true on success, otherwise false (such as if this method is
     *  called during execution of the UpdateCallback; check application logs
     *  for details).
     */
    virtual bool deinit() = 0;

    /// Start the camera.
    /**
     * This method starts the process of delivering frames from the camera to
     * Vuforia. The CameraDevice must have been initialized first via a call to init().
     *
     * Depending on the type of the camera it may be necessary to perform certain
     * configuration tasks after calling init() before it can be started (such as
     * selectVideoMode() and/or specific calls to setField()).
     *
     * \note
     * This method must be handled carefully as part of your application's lifecyle.
     * Specifically, it is recommended that you start the camera *after*
     * starting any required trackers. See the "Lifecycle of a Vuforia app" section
     * on the main %Vuforia reference page for more information.
     * \ref Lifecycle "Lifecycle of a Vuforia app"
     *
     * \returns true if the camera was started, otherwise false (check application
     * logs for failure messages).
     */
    virtual bool start() = 0;

    /// Stop the camera.
    /**
     * Stop the delivery of frames from the camera to Vuforia.
     *
     * Since the camera can consume a lot of power, you may want to use this
     * method to suspend Vuforia when it is not actively required, such as when
     * the user is doing non-AR/VR tasks in your app.
     *
     * \note
     * This method must be handled carefully as part of your application's lifecyle.
     * Specifically, it is recommended that you stop the camera *before* stopping
     * any running trackers. See the "Lifecycle of a Vuforia app" section on the
     * main %Vuforia reference page for more information.
     * \ref Lifecycle "Lifecycle of a Vuforia app"
     *
     * \returns true if the camera was stopped, otherwise false (check application
     * logs for failure messages).
     *
     */
    virtual bool stop() = 0;

    /// Get the number of available VideoModes.
    /**
     *  This is device specific and can differ between mobile devices or operating
     *  system versions.
     */
    virtual int getNumVideoModes() const = 0;

    /// Get a specific VideoMode.
    /**
     * \param nIndex The VideoMode to get, in the range 0..getNumVideoModes()-1
     * \returns The requested VideoMode.
     */
    virtual VideoMode getVideoMode(int nIndex) const = 0;

    /// Get this camera's direction (i.e. front-facing or back-facing).
    virtual CAMERA_DIRECTION getCameraDirection() const = 0;

    /// Tell the CameraDevice to use a particular VideoMode.
    /**
     * \note This method can only be called when the camera is initialized but
     * not started.
     *
     * If this method is not called, %Vuforia will select a default video mode.
     *
     * To switch video modes after the camera has been started, call stop(),
     * then deinit(), then init(), then selectVideoMode() with the new mode,
     * then start().
     *
     * \note
     * Calling this method changes the RenderingPrimitives returned by
     * Device::getRenderingPrimitives(). If you have a cached copy of the
     * RenderingPrimitives, you will need to call Device::getRenderingPrimitives()
     * again to get an updated copy.
     *
     * \param index The VideoMode to set, in the range 0..getNumVideoModes()-1.
     * \returns true if the video mode was selected, otherwise false.
     */
    virtual bool selectVideoMode(int index) = 0;

    /// Get camera calibration data (DEPRECATED).
    /**
     *  \deprecated This method has been deprecated. It will be removed in an
     *  upcoming %Vuforia release. Use State::getCameraCalibration() instead.
     */
    virtual const CameraCalibration& getCameraCalibration() const = 0;

    /// Enable/disable torch mode if the device supports it.
    /**
     *  \returns true if torch mode was turned on or off as requested, otherwise false.
     */
    virtual bool setFlashTorchMode(bool on) = 0;

    /// Set a particular focus mode, or trigger a single autofocus event.
    /**
     * \note
     * Not all focus modes are supported on all devices.
     *
     * You can trigger a single autofocus event using FOCUS_MODE_TRIGGERAUTO.
     * Note that doing so may interrupt FOCUS_MODE_CONTINUOUSAUTO if that mode
     * is currently set.
     *
     * \param focusMode The focus mode to set. See FOCUS_MODE for a list of
     * possible values.
     * \returns true if the focus mode was set as requested, otherwise false.
     */
    virtual bool setFocusMode(int focusMode) = 0;

    /// Get the number of <span>CameraField</span>s.
    /**
     * \note
     * This may not be the complete set of camera fields available on this device.
     *
     * \note
     *  Some keys may not be supported on every device.
     */
    virtual int getNumFields() const = 0;

    /// Get a particular CameraField.
    /**
     * \param index The index of the field to get, in the range 0..getNumFields()-1.
     * \param field On return, will be populated with the requested field data.
     * \return true if the requested CameraField could be got, otherwise false.
     */
    virtual bool getCameraField(int index, CameraField& field) const = 0;

    /// Read a camera field value.
    /**
     * \param key Key for the value to read. Must match one of CameraField::mKey
     * as returned from getCameraField().
     * \param value On return, will be populated with the value of the
     * requested key.
     * \return true on success, false on failure or if the requested key could
     * not be found.
     */
    virtual bool getFieldString(const char* key, char* value, size_t maxlength) const = 0;
    virtual bool getFieldInt64(const char* key, Vuforia::Int64& value) const = 0;
    virtual bool getFieldFloat(const char* key, float& value) const = 0;
    virtual bool getFieldBool(const char* key, bool& value) const = 0;
    virtual bool getFieldInt64Range(const char* key, Vuforia::Int64* intRange) const = 0;

    /// Write a camera field value.
    /**
     * \param key Key for the value to write. Must match one of CameraField::mKey
     * as returned from getCameraField().
     * \param value The value to write.
     * \return true on success, false on failure or if the requested key could
     * not be found.
     */
    virtual bool setField(const char* key, const char* value) = 0;
    virtual bool setField(const char* key, Vuforia::Int64 value) = 0;
    virtual bool setField(const char* key, float value) = 0; 
    virtual bool setField(const char* key, bool value) = 0; 
    virtual bool setField(const char* key, Vuforia::Int64 intRange[2]) = 0;

};

} // namespace Vuforia

#endif // _VUFORIA_CAMERADEVICE_H_
