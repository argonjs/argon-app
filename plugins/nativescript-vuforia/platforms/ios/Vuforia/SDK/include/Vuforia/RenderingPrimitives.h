/*===============================================================================
Copyright (c) 2015-2017 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file
RenderingPrimitives.h

@brief
Header file for RenderingPrimitives class.
===============================================================================*/
#ifndef _VUFORIA_RENDERING_PRIMITIVES_H_
#define _VUFORIA_RENDERING_PRIMITIVES_H_

#include <Vuforia/View.h>
#include <Vuforia/ViewList.h>
#include <Vuforia/Mesh.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/ViewerParameters.h>
#include <Vuforia/CameraCalibration.h>

namespace Vuforia
{

/// RenderingPrimitives class
/**
 * This class provides rendering primitives to assist in developing AR/VR
 * experiences across a broad range of handheld, headmounted and wearable
 * mobile devices.  The APIs enable a common rendering loop to be created
 * for apps targeting AR or VR on both mono and stereoscopic displays.
 *
 * The transformation measurement unit used is the same as the one used
 * to define the target size (usually meters).
 */
class VUFORIA_API RenderingPrimitives
{
public:
    virtual ~RenderingPrimitives();

    /// Copy constructor
    RenderingPrimitives(const RenderingPrimitives& other);

    /// Returns the set of views available for rendering from these primitives
    virtual ViewList& getRenderingViews() const;

    /// Returns a viewport for the given display in the format (x,y, width, height)
    virtual Vec4I getViewport(VIEW viewID) const;

    /// Returns a viewport for the given display in the format (x, y, width, height) normalized between 0 and 1
    virtual Vec4F getNormalizedViewport(VIEW viewID) const;

    /// Returns the projection matrix to use for the given view and the specified coordinate system
    /*
     * The caller should pass in the camera calibration using Vuforia::State::getCameraCalibration().
     * If the cameraCalibration is NULL then the camera calibration calculated when the rendering primitives
     * were constructed will be used.
     */
    virtual Matrix34F getProjectionMatrix(VIEW viewID,
                                          COORDINATE_SYSTEM_TYPE csType,
                                          const CameraCalibration* cameraCalibration,
                                          bool adjustForViewportCentreToEyeAxis = true);

    /// Returns the Field-of-View of the viewports managed by this RenderingPrimitives object
    /* The effective FOV is computed based on screen size and viewer maximum FOV,
     * so will vary according to the host device and viewer.
     * This is only meaningful for the LEFT and RIGHT views, and only when used with a ViewerProfile
     * The components of the returned vector representFOV half-angles measured from the eye axis in the order:
     * {left, right, bottom, top}
     * These values are measured in radians
     */
    virtual const Vec4F getEffectiveFov(VIEW viewID) const;
    
    /// Returns the skew adjustments for a viewer that need to be applied to the projection matrix
    /// for a given co-ordinate system
    /*
     * Returns the offset of the eye axis relative to the centre of the viewport
     * This is normalised to the extents of the viewport, ie -1 to +1
     *
     * The values returned are used to modify the left/right eye projection matrices to ensure
     * the eye axis is in the centre of the viewport. For the videoBackgroundProjectionMatrix these 
     * values replace elements 3 and 7. For the camera projection matrices you replace
     * elements 2 and 6 of the matrix with these values.
     */
    virtual const Vec2F getViewportCentreToEyeAxis(VIEW viewID, COORDINATE_SYSTEM_TYPE csType) const;

    /// Returns an adjustment matrix needed to correct for the different position of display relative to the eye
    /**
     * The returned matrix is to be applied to the tracker pose matrix during rendering.
     * The adjustment matrix is in meters, if your scene is defined in another unit 
     * you will need to adjust the matrix before use.
     */
    virtual Matrix34F getEyeDisplayAdjustmentMatrix(VIEW viewID) const;

    /// Returns the video background texture size that has been used to calculate the mesh
    virtual const Vec2I getVideoBackgroundTextureSize() const;

    /// Returns the projection matrix to use when projecting the video background
    virtual Matrix34F getVideoBackgroundProjectionMatrix(
        VIEW viewID, COORDINATE_SYSTEM_TYPE csType, bool adjustForViewportCentreToEyeAxis = true) const;

    /// Returns a simple mesh suitable for rendering a video background texture
    virtual const Mesh& getVideoBackgroundMesh(VIEW viewID) const;

    /// Returns the recommended size to use when creating a texture to apply to the distortion mesh
    virtual const Vec2I getDistortionTextureSize(VIEW viewID) const;

    /// Returns a viewport for the given input to the distortion mesh in the format (x,y, width, height)
    virtual Vec4I getDistortionTextureViewport(VIEW viewID) const;

    /// Returns a barrel distortion mesh for the given view
    virtual const Mesh& getDistortionTextureMesh(VIEW viewID) const;
protected:
    RenderingPrimitives();
    class Impl;
    Impl* mImpl;
};


} // namespace Vuforia

#endif // _VUFORIA_RENDERING_PRIMITIVES_H_
