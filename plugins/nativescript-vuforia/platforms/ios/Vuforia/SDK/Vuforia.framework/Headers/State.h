/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    State.h

\brief
    Header file for State class.
===============================================================================*/

#ifndef _VUFORIA_STATE_H_
#define _VUFORIA_STATE_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/Frame.h>
#include <Vuforia/CameraCalibration.h>
#include <Vuforia/Illumination.h>

namespace Vuforia
{

// Forward declarations
class Trackable;
class TrackableResult;
class StateData;
class DeviceTrackableResult;

/// A persistent handle to the state of the whole augmented reality system at a given point in time.
/**
 * A State can include:
 *
 * - Information about any objects or frames of reference that Vuforia is
 *   currently tracking (getTrackable() and getTrackableResult()).
 *
 * - The video frame for the state's point in time and camera calibration details
 *   (getFrame() and getCameraCalibration()).
 *
 * - Information about current illumination conditions (getIllumination()).
 *
 * There are two different ways to obtain a State, depending on if you want to
 * access data via a Pull or Push model:
 *
 * -# Via an instance of StateUpdater (Pull model)
 * -# Via the UpdateCallback mechanism, Vuforia::registerCallback() (Push model)
 *
 * Both push and pull models can be used simultaneously, if you like. For example,
 * you would typically want to use the Pull interface as part of your render loop,
 * but you may want to simultaneously use the Push interface for other parts of
 * the system, such as if you need access to state information as early as
 * possible in order to do any other custom computer vision in addition to %Vuforia.
 *
 * Note, however, that in an application where the camera, renderer, and main
 * loop are all running on separate threads, care must be taken to ensure that a
 * consistent State object is used across the whole application.
 *
 * The data associated with a given State instance remains valid as long as the
 * State instance is retained, acting like a smart pointer to the underlying data.
 * %Vuforia will continue to run in the background but the retained State instance
 * will not be updated, and will therefore become increasingly out of date over time.
 *
 * Note that the timestamp of the Frame returned by getFrame() may not match the
 * timestamp on the various returned TrackableResults. See StateUpdater for more
 * details.
 */
class VUFORIA_API State
{
public:

    /// Default constructor.
    State();

    /// Copy constructor.
    /**
     * A State is a lightweight object which keeps internal smart pointers to its data.
     *
     * Copying is therefore cheap, and recommended over using references.
     */
    State(const State& other);

    /// Destructor.
    ~State();

    /// Thread safe assignment operator.
    /**
     * A State is a lightweight object which keeps internal smart pointers to its data.
     *
     * Copying is therefore cheap, and recommended over using references.
     */
    State& operator=(const State& other);

    /// Get the Frame associated with this State.
    /**
     * \returns A Frame object representing the camera frame that any camera-based
     * Trackable instances used to generate the TrackableResults accessible via
     * getTrackableResult().
     *
     * Note that for non-camera-based TrackableResult instances, the timestamp
     * of this Frame may not match the timestamp of the TrackableResult. See
     * StateUpdater for more details.
     */
    Frame getFrame() const;
    
	/// Get the camera calibration for this State, if available.
    /**
     * \returns Camara calibration information for this State, or NULL if no
     * camera calibration was available when this State was captured.
     *
     * The returned object is only valid as long as the State
     * object is valid. Do not keep a copy of the pointer!
     */
    const CameraCalibration* getCameraCalibration() const;

    /// Get illumination information for this State (if available).
    /**
     * \returns An Illumination instance containing illumination information for
     * this State, or NULL if no illumination information is available.
     *
     * The returned object is only valid as long as the State
     * object is valid. Do not keep a copy of the pointer!
     */
    const Illumination* getIllumination() const;
    
    /// Get the DeviceTrackableResult, if it exists.
    /**
     * This is a convenience method that provides easy access to the
     * DeviceTrackableResult, if a DeviceTracker has been started.
     *
     * \note The DeviceTrackableResult is also available via getTrackableResult().
     *
     * \note The returned object is only valid as long as the State
     * object is valid. Do not keep a copy of the pointer!
     *
     * \returns the DeviceTrackableResult, or NULL if no DeviceTracker
     * is running.
     */
    const DeviceTrackableResult* getDeviceTrackableResult() const;

    /// Get the number of TrackableResult objects for this State.
    int getNumTrackableResults() const;

    /// Get a single TrackableResult object.
    /**
     * \param idx The index of the TrackableResult, in the range 0..getNumTrackableResults()-1
     * \returns A pointer to the requested TrackableResult, specific to this
     * State instance.
     *
     * A TrackableResult returned from this function represents information about
     * a Trackable object that is being actively tracked in this State.
     *
     * The TrackableResult should be considered specific to this State, i.e., it
     * represents a snapshot of the tracked object at the point in time associated
     * with this State.
     *
     * The returned object is only valid as long as the State object is valid.
     * Do not keep a copy of the pointer!
     */
    const TrackableResult* getTrackableResult(int idx) const;
    
    /// Get the number of Trackable objects that were involved in generating TrackableResult objects for this State.
    int getNumTrackables() const;

    /// Get an immutable Trackable specific to this State.
    /**
     * \param idx The index of the Trackable, in the range 0..getNumTrackables()-1
     * \returns An immutable, non-comparable pointer to the requested Trackable.
     *
     * Each of the Trackable instances that this function returns was involved
     * in generating one or more of the TrackableResults available via
     * getTrackableResult().
     *
     * This Trackable allows historic access to the state of the Trackable at
     * the time when this State was assembled (including access to any DataSet
     * instances that may since have been destroyed). It does not reflect any
     * changes that were made to the Trackable after this State was assembled.
     * It is therefore incompatible with the Trackable returned when querying
     * the Tracker instance (they are not pointer-comparable), even if they
     * refer to the same potentially trackable object.
     *
     * Note that a Trackable provides only high-level information for reference
     * about a potentially trackable object, whether or not is currently being
     * tracked. To query details such as its position or orientation in the
     * world, use getTrackableResult() instead.
     *
     * To make changes to the Trackable, query the appropriate Tracker for the
     * canonical Trackable instance, and make your changes there instead. Note
     * however that any changes made there will not be reflected on the
     * Trackable returned here.
     *
     * The returned object is only valid as long as the State object is valid.
     * Do not keep a copy of the pointer!
     */
    const Trackable* getTrackable(int idx) const;

protected:

    StateData* mData;

};

} // namespace Vuforia

#endif //_VUFORIA_STATE_H_
