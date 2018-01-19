/*===============================================================================
Copyright (c) 2016 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    VuMarkTemplate.h

@brief
    Header file for VuMarkTemplate class.
===============================================================================*/
#ifndef _VUFORIA_VUMARKTEMPLATE_H_
#define _VUFORIA_VUMARKTEMPLATE_H_

// Include files
#include <Vuforia/Trackable.h>
#include <Vuforia/ObjectTarget.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

/// A VuMark template representing a set of 3D trackable VuMarkTargets objects.
/**
 * A VuMarkTarget represents the actual VuMark instance, instantiated based
 * on the VuMark template.
 */
class VUFORIA_API VuMarkTemplate : public ObjectTarget
{
public:

    /// Returns the Trackable class' type
    static Type getClassType();

    /// Returns the user data from the dataset
    /** 
     *  Gets the user data associated with this VuMarkTemplate provided in the 
     *  dataset. This data is always in text form. If no data is associated
     *  with the VuMarkTemplate, a null pointer is returned.
     */
    virtual const char* getVuMarkUserData() const = 0;

    /// Sets whether the VuMark has a changing background per instance, signaling
    /// to SDK how to track it. 
    /** 
     *  Calling setTrackingFromRuntimeAppearance(true) indicates that the SDK 
     *  should track this type of VuMark based on what is seen by the camera and 
     *  not assume the template background image is useful for tracking because 
     *  the background can change per instance. 
     *  Calling setTrackingFromRuntimeAppearance(false) indicates that the SDK
     *  should track this type of VuMark based on VuMark Template used to create 
     *  the dataset. This is the default behavior.
     */
    virtual void setTrackingFromRuntimeAppearance(bool enable) = 0;

    /// Returns true if the template is tracked from its runtime appearance
    virtual bool isTrackingFromRuntimeAppearanceEnabled() const = 0;

    /// Returns the origin of the VuMarkTemplate scaled based on the VuMark's
    /// size.
    virtual Vec2F getOrigin() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_VUMARKTEMPLATE_H_
