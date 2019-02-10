/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
StateUpdater.h

\brief
Header file for StateUpdater class.
===============================================================================*/

#ifndef _VUFORIA_STATE_UPDATER_H_
#define _VUFORIA_STATE_UPDATER_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/NonCopyable.h>
#include <Vuforia/State.h>

namespace Vuforia
{

    /// Provides State instances on-demand.
    /**
     * Use the StateUpdater instance provided at TrackerManager::getStateUpdater()
     * to request the latest available data for all configured trackers, decoupled
     * from the update rate of the camera. (For comparison, the UpdateCallback
     * mechanism is synchronous with the update rate of the camera.)
     *
     * Typically, if you call updateState() multiple times during a single camera
     * frame, the TrackableResult instances available on the returned State objects
     * will not change.
     *
     * However, some Tracker types implement predictive tracking and/or use data
     * that does not come from the camera (such as a DeviceTracker that tracks a
     * VR headset's position and orientation at high frequency). If you have
     * configured any such trackers, the State instances provided by updateState()
     * may include updated TrackableResult instances reflecting updated predictions
     * or non-camera tracking data that are newer than the camera frame.
     *
     */

class StateUpdater : private NonCopyable
{
public:

    /// Get a State instance that reflects the newest available tracking data.
    /**
     * The returned State includes results from all configured Tracker instances.
     *
     * It may contain TrackableResults that are newer than the latest camera frame for
     * - trackers that do not rely on camera frames (typically DeviceTracker
     * instances such as VR headset pose trackers), or
     * - trackers that use predictive models.
     *
     * This can be useful when the required update rate is higher than the camera
     * frame acquisition rate, such as VR applications or AR on see-through eyewear
     * devices, where visuals must be tightly synchronized to the user's movement,
     * rather than to a rendered video background.
     *
     * \returns A State instance that reflects the newest available tracking data.
     */
    virtual State updateState() = 0;

    /// Get the State as it was the last time updateState() was called.
    /**
     * When updateState() is called, the State instance is cached. getLatestState()
     * provides access to this cached State. If updateState() has not yet been
     * called, this method will return an empty State.
     *
     * Note that updateState() is called internally when you call
     * Renderer::begin(const RenderData*), which may cause getLatestState() to
     * unexpectedly return different results. To prevent this from happening,
     * obtain a State yourself and call Renderer::begin(State, const RenderData*)
     * instead.
     *
     * \returns A State instance that references that same tracking results as
     * the last State instance returned by updateState().
     */
    virtual State getLatestState() const = 0;

    /// Get the current time stamp.
    /**
     * \returns The current time stamp, in the units and frame of reference for
     * the returned time stamp are the same as for the TrackableResult and Frame
     * instances that can be obtained from a State instance.
     */
    virtual double getCurrentTimeStamp() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_STATE_UPDATER_H_
