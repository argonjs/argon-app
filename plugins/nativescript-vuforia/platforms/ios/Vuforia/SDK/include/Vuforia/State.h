/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    State.h

@brief
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

class Trackable;
class TrackableResult;
class StateData;
class DeviceTrackableResult;


/// AR State
/**
 *  A consistent view on the augmented reality state
 *  including a camera frame and all trackables.
 *  Similar to Frame, State is a light weight object that
 *  shares its data among multiple instances. Copies are
 *  therefore cheap and suggested over usage of references.
 *  Notice: Trackables queried by the state can not be
 *  compared by pointer to Trackables queried by the tracker
 *  (even though they might reference the same tracked object).
 *  Trackables queried by the state represent a temporary and
 *  consistent view on the Augmented Reality state and can
 *  therefore not be modified. objects must be queried from
 *  the Tracker in order to modify them.
 */
class VUFORIA_API State
{
public:
    /// Default constructor.
    State();

    /// Copy constructor.
    State(const State& other);

    /// Destructor
    ~State();

    /// Thread safe assignment operator
    State& operator=(const State& other);

    /// Returns the Frame object that is stored in the State
    Frame getFrame() const;
    
    /// Returns the current camera calibration that is stored in the State
    /// NULL will be returned if there is no camera calibration associated with
    /// the current State
    /**
     *  The returned object is only valid as long as the State
     *  object is valid. Do not keep a copy of the pointer!
     */
    const CameraCalibration* getCameraCalibration() const;

    /// Returns a pointer to an Illumination object which describes
    /// the current illumination for the current state. NULL will be
    /// returned if there is no illumination information available
    /**
     *  The returned object is only valid as long as the State
     *  object is valid. Do not keep a copy of the pointer!
     */
    const Illumination* getIllumination() const;

    /// Returns the number of Trackable objects currently known to the SDK
    int getNumTrackables() const;

    /// Provides access to a specific Trackable
    /**
     *  The returned object is only valid as long as the State
     *  object is valid. Do not keep a copy of the pointer!
     */
    const Trackable* getTrackable(int idx) const;

    /// Returns the number of Trackable objects currently being tracked
    int getNumTrackableResults() const;

    /// Provides access to a specific TrackableResult object.
    /**
     *  The returned object is only valid as long as the State
     *  object is valid. Do not keep a copy of the pointer!
     */
    const TrackableResult* getTrackableResult(int idx) const;

    /// Returns the trackable result for the device directly. Will return NULL
    /// if the device tracker is not running (i.e. has not been started).
    /**
     *  This convenience method provides faster access to the DeviceTrackableResult.
     *  The DeviceTrackableResult continues to be available in the list of TrackableResults.
     *  See State::getTrackable.
     *
     *  The returned object is only valid as long as the State
     *  object is valid. Do not keep a copy of the pointer!
     */
    const DeviceTrackableResult* getDeviceTrackableResult() const;

protected:
    StateData* mData;

};

} // namespace Vuforia

#endif //_VUFORIA_STATE_H_
