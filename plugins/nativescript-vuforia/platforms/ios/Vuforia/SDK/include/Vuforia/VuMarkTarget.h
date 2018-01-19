/*===============================================================================
Copyright (c) 2016 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    VuMarkTarget.h

@brief
    Header file for VuMarkTarget class.
===============================================================================*/
#ifndef _VUFORIA_VUMARKTARGET_H_
#define _VUFORIA_VUMARKTARGET_H_

// Include files
#include <Vuforia/Trackable.h>
#include <Vuforia/ObjectTarget.h>
#include <Vuforia/VuMarkTemplate.h>
#include <Vuforia/InstanceId.h>
#include <Vuforia/Image.h>

namespace Vuforia
{

/// A target for tracking VuMark instances.
/**
 * A VuMarkTarget is an instance of a VuMarkTemplate with a specific instance ID,
 * which can be tracked. The actual visual appearance of the instance can also
 * be retrieved.
 *
 * Note that some ObjectTarget functionalities such as setting the target size or
 * starting / stopping extended tracking cannot be used with individual 
 * VuMarkTargets. You need to access these functionalities via the respective
 * VuMarkTemplate to change these properties for the entire set. 
 */
class VUFORIA_API VuMarkTarget : public ObjectTarget
{
public:

    /// Returns the Trackable class' type
    static Type getClassType();

    /// Returns the VuMark template this VuMark instance was instantiated from
    virtual const VuMarkTemplate& getTemplate() const = 0;

    /// Returns the instance ID of this particular VuMark instance
    virtual const InstanceId& getInstanceId() const = 0;

    /// Returns a generated image of the VuMark being tracked
    virtual const Image& getInstanceImage() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_VUMARKTARGET_H_
