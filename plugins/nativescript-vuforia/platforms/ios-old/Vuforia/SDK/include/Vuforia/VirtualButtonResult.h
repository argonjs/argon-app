/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    VirtualButtonResult.h

\brief
    Header file for VirtualButtonResult class.
===============================================================================*/

#ifndef _VUFORIA_VIRTUALBUTTONRESULT_H_
#define _VUFORIA_VIRTUALBUTTONRESULT_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/System.h>
#include <Vuforia/VirtualButton.h>

namespace Vuforia
{

/// Tracking data resulting from a VirtualButton.
class VUFORIA_API VirtualButtonResult : private NonCopyable
{
public:

    /// Get the VirtualButton that participated in generating this result.
    virtual const VirtualButton& getVirtualButton() const = 0;

    /// Get if the VirtualButton is currently pressed.
    virtual bool isPressed() const = 0;

protected:

    virtual ~VirtualButtonResult()  {}
};

} // namespace Vuforia

#endif //_VUFORIA_VIRTUALBUTTONRESULT_H_
