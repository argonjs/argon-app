/*===============================================================================
Copyright (c) 2016-2018 PTC Inc. All Rights Reserved.

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
 * an application can present to its users, as a guide for how to best position
 * their device to assist the tracker in bootstrapping the tracking process.
 *
 * A GuideView can be considered an entry point into the tracking process. When the
 * user moves their device so that the physical model to be tracked aligns closely
 * with the GuideView on their screen, the probability that tracking can start
 * successfully will be high.
 */
class VUFORIA_API GuideView : private NonCopyable
{
public:

    /// Get the intrinsic parameters of the camera associated with this GuideView.
    virtual const CameraCalibration& getIntrinsics() const = 0;

    /// Get the pose of the ModelTarget for this GuideView.
    /**
     * \returns The pose of the ModelTarget (defined in the camera's coordinate
     * system), corresponding to the image returned by getImage().
     */
    virtual const Matrix34F& getPose() const = 0;

    /// Set the pose of the ModelTarget for this GuideView.
    /**
     * \note Calling this function invalidates the image returned by getImage(),
     * (since the image will no longer represent the model target in the correct).
     * Subsequent calls to getImage() will therefore return null.
     *
     * \param pose The new pose.
     */
    virtual void setPose(const Matrix34F& pose) = 0;

    /// Get the guide image for the ModelTarget.
    /**
     * The image returned is a simplified representation of the ModelTarget at
     * the pose returned by getPose(), as long as that pose has not been modified
     * by a call to setPose().
     *
     * \returns a simplified representation of the ModelTarget at the pose returned
     * by getPose(), or null if setPose() has been called.
     */
    virtual const Image* getImage() const = 0;

    virtual ~GuideView() {}
};

} // namespace Vuforia

#endif //_VUFORIA_GUIDEVIEW_H_
