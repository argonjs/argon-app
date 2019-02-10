/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    GuideView.h

\brief
    Header file for GuideView class.
===============================================================================*/

#ifndef _VUFORIA_GUIDEVIEW_H_
#define _VUFORIA_GUIDEVIEW_H_

// Include files
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

// Forward declarations
class CameraCalibration;
class Image;
struct Matrix34F;

/// A simplified visual representation of a ModelTarget to guide user initialization.
/**
 * A GuideView provides a simplified visual representation of a ModelTarget that
 * an application can present to its users, as a guide for how to position their
 * device in order to bootstrap the tracking process.
 *
 * A GuideView can be considered an entry point into the tracking process. When the
 * user moves their device so that the physical model to be tracked aligns closely
 * with the GuideView on their screen, tracking will begin.
 */
class VUFORIA_API GuideView : private NonCopyable
{
public:

    /// Get the intrinsic parameters of the camera associated with this GuideView.
    /**
    * The returned camera calibration represents the intrinsics parameters
    * of the camera associated to this guide view.
    *
    * \returns The camera intrinsics represented as a CameraCalibration
    * data structure.
    */
    virtual const CameraCalibration& getIntrinsics() const = 0;

    /// Get the pose of the ModelTarget object for this Guide View.
    /**
     * The returned pose represents the pose the ModelTarget object needs to
     * have, relative to the device's camera, in order to initiate tracking.
     *
     * The Guide View image that your app renders over the camera feed should
     * always represent the object at this pose. By default, the image returned
     * by getImage() matches this pose.
     *
     * \note The coordinate system of the GuideView pose differs from the
     * coordinate system used elsewhere in %Vuforia Engine: this pose is defined
     * in a right-handed coordinate system where the X axis points right, the
     * Y axis points down, the Z axis points forward, and the origin is at the
     * device's camera. However, this is subject to change in a future version of
     * %Vuforia Engine, and will likely be brought in line with the conventions
     * used elsewhere in the API.
     *
     * \returns The pose of the ModelTarget, defined in a right-handed coordinate
     * system where the X axis points right, the Y axis points down, the Z axis
     * points forward, and the origin is at the device's camera.
     */
    virtual const Matrix34F& getPose() const = 0;

    /// Set the pose of the ModelTarget object for this Guide View.
    /**
     * The pose you set represents the pose you want the ModelTarget object to
     * have, relative to the device's camera, in order to initiate tracking.
     *
     * If you change the pose from its initial value, the image returned by
     * getImage() will no longer be correct. You will need to render your own
     * image to use as an overlay in the camera feed.
     *
     * \note The coordinate system of the GuideView pose differs from the
     * coordinate system used elsewhere in %Vuforia Engine: this pose is defined
     * in a right-handed coordinate system where the X axis points right, the
     * Y axis points down, the Z axis points forward, and the origin is at the
     * device's camera. However, this is subject to change in a future version of
     * %Vuforia Engine, and will likely be brought inline with the conventions
     * used elsewhere in the API.
     *
     * \note Calling this function invalidates the image returned by getImage().
     * Subsequent calls to getImage() will therefore return null.
     *
     * \param pose The new pose, defined in a right-handed coordinate system
     * where the X axis points right, the Y axis points down, the Z axis points
     * forward, and the origin is at the device's camera.
     */
    virtual void setPose(const Matrix34F& pose) = 0;

    /// Get the Guide View image.
    /**
     * The image returned is a simplified representation of the ModelTarget
     * object at the pose returned by getPose() (as long as that pose has not
     * been modified by a call to setPose()).
     *
     * The image should be rendered as an overlay on the camera feed, where it
     * indicates to your users how they should position their device relative to
     * the object in order to initiate tracking.
     *
     * \note This function only returns the correct image, if the guide view is active.
     * For deactivated guide views, the image will be empty
     *
     * \returns an Image containing a simplified representation of the object at
     * the pose returned by getPose(), or null if setPose() has been called.
     */
    virtual const Image* getImage() const = 0;

    /// Get the name of this Guide View.
    /**
    * \returns The name of this guide view
    */
    virtual char const* getName() const = 0;

    virtual ~GuideView() {}
};

} // namespace Vuforia

#endif //_VUFORIA_GUIDEVIEW_H_
