/*==============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
Device.h

\brief
Header file for Device class.
==============================================================================*/

#ifndef _VUFORIA_DEVICE_H_
#define _VUFORIA_DEVICE_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/Type.h>
#include <Vuforia/ViewerParameters.h>
#include <Vuforia/ViewerParametersList.h>
#include <Vuforia/RenderingPrimitives.h>

namespace Vuforia
{

/// Singleton representation of the device %Vuforia is currently running on.
/**
 * %Vuforia supports many different hardware configurations, from mobile apps
 * running on standard mobile or handheld hardware, VR enclosures for mobile
 * phones, and dedicated VR and AR eyewear devices.
 *
 * This class a provides management and configuration functions for the specific
 * configuration (viewer) that %Vuforia is currently running on.
 *
 * Changes made here primarily affect how the RenderingPrimitives are created
 * and structured.
 */
class VUFORIA_API Device : private NonCopyable
{
public:

    enum MODE
    {
        MODE_AR = 0,    ///< Augmented Reality (AR) mode. Implies a video see-through
                        ///< mode (video background from a live camera feed), or
                        ///< an optical see-through mode (using see-through eyewear).
        MODE_VR         ///< Virtual Reality (VR) mode. Implies a purely "virtual"
                        ///< experience, i.e. an experience without any visual
                        ///< representation of the user's physical environment.
    };

    /// Get the singleton instance.
    /**
     * This function can be used immediately after Vuforia::init() has succeeded.
     * See the "Lifecycle of a Vuforia app" section on the main %Vuforia
     * reference page for more information.
     * \ref Lifecycle "Lifecycle of a Vuforia app"
     */
    static Device& getInstance();

    /// Get the Type for class "Device".
    static Type getClassType();

    /// Get the Type of this instance (may be a subclass of Device).
    virtual Type getType() const = 0;

    /// Get whether this Device instance's type equals or has been derived from the given type.
    virtual bool isOfType(Type type) const = 0;

    /// Set the rendering mode.
    /**
     * \note
     * It is not possible to set the mode to AR until a CameraDevice has been
     * initialised.
     *
     * \note
     * Calling this method changes the RenderingPrimitives. If you have cached the
     * result of a previous call to getRenderingPrimitives(), you will need to retrieve
     * new RenderingPrimitives by calling getRenderingPrimitives() again.
     *
     * \returns true if the mode was set, otherwise false (check application logs
     * for failure details).
     */
    virtual bool setMode(MODE m) = 0;

    /// Get the current rendering mode.
    virtual MODE getMode() const = 0;

    /// Activate or deactivate the selected viewer.
    /**
     * The viewer to activate must first be selected with selectViewer().
     *
     * \note
     * Calling this method changes the RenderingPrimitives. If you have cached the
     * result of a previous call to getRenderingPrimitives(), you will need to retrieve
     * new RenderingPrimitives by calling getRenderingPrimitives() again.
     */
    virtual void setViewerActive(bool active) = 0;

    /// Returns true if a viewer is active, false otherwise.
    virtual bool isViewerActive() const = 0;

    /// Get the list of ViewerParameters known to the system.
    virtual ViewerParametersList& getViewerList() = 0;

    /// Select the viewer to use.
    /**
     * \param vp ViewerParameters for the viewer, either one taken from
     *          getViewerList() or using CustomViewerParamaters .
     * \returns true on success, otherwise false (check application logs for
     *          failure details).
     */
    virtual bool selectViewer(const ViewerParameters& vp) = 0;

    /// Get the ViewerParameters for the currently selected viewer.
    virtual ViewerParameters getSelectedViewer() const = 0;

    /// Tell %Vuforia that the configuration has changed, so new RenderingPrimitives need to be generated.
    virtual void setConfigurationChanged() = 0;

    /// Get a copy of the RenderingPrimitives for the current configuration.
    /**
     * The RenderingPrimitives returned from this function are immutable, and
     * tailored to the current device environment.
     *
     * RenderingPrimitives can be retrieved at the earliest after the first call
     * to Vuforia::onSurfaceChanged().
     *
     * New RenderingPrimitives will be created whenever the device environment
     * changes in one of the following ways:
     *    - display size and/or orientation (i.e., when Vuforia::onSurfaceChanged()
     *    is called)
     *    - AR or VR mode (i.e., when setMode() is called)
     *    - video mode (i.e., when CameraDevice::selectVideoMode() is called)
     *    - video background configuration (i.e., when Renderer::setVideoBackgroundConfig()
     *    is called)
     *    - for certain viewer types, when the device is inserting into the viewer
     *    (i.e., when setViewerActive() is called)
     *
     * If you have cached a copy of the RenderingPrimitives and you make any of
     * the above changes, you will need use this method to get an updated copy
     * of the RenderingPrimitives that reflects the new device environment.
     *
     * \note
     * Platform-specific lifecycle transitions (e.g. Pause/Resume) may also cause
     * the configuration to change, so it is advisable to retrieve new
     * RenderingPrimitives after those transitions.
     *
     * \note
     * If AR mode has been requested via setMode(), RenderingPrimitives will not
     * be valid until a CameraDevice has been initialised.
     *
     * \note
     * This method returns a copy, which has an associated cost. Performant apps
     * should avoid calling this method if the configuration has not changed.
     */
    virtual const RenderingPrimitives getRenderingPrimitives() = 0;

};

} // namespace Vuforia

#endif // _VUFORIA_DEVICE_H_
