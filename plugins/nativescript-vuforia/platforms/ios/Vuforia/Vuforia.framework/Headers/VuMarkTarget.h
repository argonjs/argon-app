/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    VuMarkTarget.h

\brief
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

/// A type of ObjectTarget that represents a VuMark.
/**
 * A VuMarkTarget must be used in combination with a VuMarkTemplate with a
 * specific instance ID.
 *
 * Note that some ObjectTarget functionality, such as setting the target size,
 * or enabling or disabling extended tracking, cannot be applied to a
 * VuMarkTarget instance. Instead, you need to make the required changes on the
 * associated VuMarkTemplate instance.
 */
class VUFORIA_API VuMarkTarget : public ObjectTarget
{
public:

    /// Get the Type for class 'VuMarkTarget'.
    static Type getClassType();

    /// Get the VuMarkTemplate that this instance was instantiated from.
    virtual const VuMarkTemplate& getTemplate() const = 0;

    /// Get the instance ID of this particular VuMark.
    virtual const InstanceId& getInstanceId() const = 0;

    /// Get a generated version of the VuMark.
    virtual const Image& getInstanceImage() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_VUMARKTARGET_H_
