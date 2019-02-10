/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    UpdateCallback.h

\brief
    Header file for UpdateCallback class.
===============================================================================*/

#ifndef _VUFORIA_UPDATECALLBACK_H_
#define _VUFORIA_UPDATECALLBACK_H_

// Include files
#include <Vuforia/System.h>

namespace Vuforia
{

// Forward declarations
class State;

/// Base class for objects passed to Vuforia::registerCallback().
class VUFORIA_API UpdateCallback
{
public:

    /// Called by %Vuforia on the tracker thread immediately after tracking finishes.
    /**
     * This method is called on the tracker thread. If you do a lot of work in
     * here you will prevent tracking from continuing, and may negatively impact
     * the overall frame rate of your application.
     */
    virtual void Vuforia_onUpdate(State& state) = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_UPDATECALLBACK_H_
