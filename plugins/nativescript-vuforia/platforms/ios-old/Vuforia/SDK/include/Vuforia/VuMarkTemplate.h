/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    VuMarkTemplate.h

\brief
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

/// A type of ObjectTarget representing a set of VuMarks.
/**
 * Individual VuMarks are represented by VuMarkTarget objects, which are
 * instantiated based on a VuMarkTemplate.
 */
class VUFORIA_API VuMarkTemplate : public ObjectTarget
{
public:

    /// Get the Type for class 'VuMarkTemplate'.
    static Type getClassType();

    /// Get the user data for this template from the underlying dataset.
    /**
     * The user data is always in text form.
     *
     * \returns The user data associated with this VuMarkTemplate, or null if no
     * such user data exists.
     */
    virtual const char* getVuMarkUserData() const = 0;

    /// Set whether tracking should use the template's background image or not.
    /**
     * A VuMark consists of a mandatory graphic representing a numeric code, and
     * an optional background image. Generally, the background image/design will
     * remain fixed for a set of VuMarks based off the same template, and %Vuforia
     * may use details in the background/design to aid with tracking the VuMark.
     *
     * However, it is possible to use a different background image for each
     * real-world VuMark instance, without having to use a different template.
     * In this case Vuforia will take a sample image from the camera when it
     * detects the VuMark, and will use that to aid tracking, in place of the
     * template background/design.
     *
     * \note By default, a VuMark is *not* tracked using its real-world appearance.
     *
     * \param enable If true, use the real-world appearance of the VuMark's
     * background (sampled from a camera frame) to aid with tracking. If false
     * (the default), assume the VuMark is printed using the same
     * background/design as in the template.
     */
    virtual void setTrackingFromRuntimeAppearance(bool enable) = 0;

    /// Get whether tracking a VuMark based on this template is aided by a
    /// camera-captured image or by the background/design in the template.
    /**
     * \returns true if the real-world appearance of the VuMark's background
     * (sampled from a camera frame) is being used to aid with tracking, or false
     * if %Vuforia assumes the VuMark is printed using the same background/design
     * as in the template.
     */
    virtual bool isTrackingFromRuntimeAppearanceEnabled() const = 0;

    /// Get the position of the origin of the VuMarkTemplate.
    /**
     * \returns The position of the origin of the VuMarkTemplate, expressed in
     * this ObjectTarget's local coordinate system and scaled based on the
     * VuMark's size.
     */
    virtual Vec2F getOrigin() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_VUMARKTEMPLATE_H_
