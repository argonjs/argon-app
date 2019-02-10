/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    TrackerManager.h

\brief
    Header file for TrackerManager class.
===============================================================================*/

#ifndef _VUFORIA_TRACKER_MANAGER_H_
#define _VUFORIA_TRACKER_MANAGER_H_

// Include files
#include <Vuforia/Tracker.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

// Forward declarations:
class StateUpdater;

/// Singleton for initializing, accessing, and deinitializing Tracker objects.
/**
 * The TrackerManager singleton is available via TrackerManager::getInstance()
 * immediately after calling Vuforia::init(). Use it to configure any trackers
 * required by your app.
 *
 * \note
 * If your app implements suspend/resume (for example on mobile devices), you
 * need to handle Tracker instances carefully as part of this process. See the
 * "Lifecycle of a Vuforia app" section on the main %Vuforia reference page
 * for more information. \ref Lifecycle "Lifecycle of a Vuforia app"
 *
 * See the inheritance tree diagram in the Tracker base class for a list of
 * available tracker
 * types.
 */
class VUFORIA_API TrackerManager : private NonCopyable
{
public:
    /// Get the TrackerManager singleton instance.
    /**
     * The TrackerManager instance is available immediately after Vuforia::init()
     * has succeeded.
     *
     * It is no longer available after calling Vuforia::deinit().
     */
    static TrackerManager& getInstance();

    /// Initialize and return the given Tracker, if it is not already initialized.
    /**
     *
     * \note
     * This method can only be called while the CameraDevice is uninitialized.
     * If your app implements suspend/resume (for example on mobile devices),
     * you need to handle trackers carefully as part of this process. See
     * Vuforia::init() for more details.
     *
     * This method will return NULL if
     *     - the requested Tracker type is not supported on the current device,
     *     system, or platform, or
     *     - the requested Tracker type has already been initialized, or
     *     - the camera is currently initialized.
     *
     * \note
     * Only one instance of each Type of Tracker can be initialized.
     *
     * \param type Which Tracker to initialize. See the inheritance tree diagram
     * on the Tracker base class for a list of available Tracker types.
     * \returns The initialized Tracker, or NULL if either: the requested Tracker
     * is already initialized; the requested Tracker is not supported on the
     * current device, system, or platform; or the CameraDevice is currently
     * initialized.
     *
     */
    virtual Tracker* initTracker(Type type) = 0;

    /// Get the given Tracker.
    /**
     * \param type Which Tracker to return. See the inheritance tree diagram on
     * the Tracker base class for a list of available Tracker types.
     * \returns The requester Tracker instance, or NULL if no instance of this
     * type has been initialized.
     */
    virtual Tracker* getTracker(Type type) = 0;

    /// Deinitialize (destroy) the given Tracker.
    /**
     * Also frees any resources used by the Tracker.
     *
     * This method can only be called while the CameraDevice is uninitialized.
     *
     * \param type Which Tracker to deinitialize.
     * \returns true on success, or false if no such Tracker is initialized, or
     * if the CameraDevice is currently initialized or started.
     */
    virtual bool deinitTracker(Type type) = 0;

    /// Get the StateUpdater instance that provides State objects for the configured trackers.
    virtual StateUpdater& getStateUpdater() = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_TRACKER_MANAGER_H_
