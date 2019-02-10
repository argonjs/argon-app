/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Tracker.h

\brief
    Header file for Tracker class.
===============================================================================*/

#ifndef _VUFORIA_TRACKER_H_
#define _VUFORIA_TRACKER_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/Type.h>

namespace Vuforia
{

/// Base class for all Trackers.
/**
 * A tracker is a core computing unit in the %Vuforia API which tracks and reports
 * the poses of objects and devices in the user's environment.
 *
 * These objects may be represented by <span>Trackable</span>s which may in turn
 * use a DataSet containing data that %Vuforia uses to find and track them.
 *
 * Start a Tracker by calling start(). Once a Tracker has been started, it may
 * produce one or more <span>TrackableResult</span>s for an input camera frame.
 * These TrackableResults are accessible via the State for that frame.
 */
class VUFORIA_API Tracker : private NonCopyable
{
public:

    /// Get the Type for class 'Tracker'.
    static Type getClassType();

    /// Get the Type of this instance (may be a subclass of Tracker).
    virtual Type getType() const = 0;

    /// Get whether this Tracker instance's type equals or has been derived from the given type.
    virtual bool isOfType(Type type) const = 0;

    /// Start the Tracker.
    virtual bool start() = 0;

    /// Stop the Tracker.
    virtual void stop() = 0;

    virtual ~Tracker() {}
};

} // namespace Vuforia

#endif //_VUFORIA_TRACKER_H_
