/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
RenderingPrimitives.h

\brief
Header file for RenderingPrimitives class.
===============================================================================*/

#ifndef _VUFORIA_RENDERING_PRIMITIVES_H_
#define _VUFORIA_RENDERING_PRIMITIVES_H_

// Include files
#include <Vuforia/View.h>
#include <Vuforia/ViewList.h>
#include <Vuforia/Mesh.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/ViewerParameters.h>
#include <Vuforia/CameraCalibration.h>

namespace Vuforia
{

/// Provides low-level information and tools for rendering AR and VR content.
/**
 * %RenderingPrimitives provides a set of unified function calls that are
 * designed to work across all AR/VR display devices, including hand-held,
 * head-mounted (monocular/stereo) and wearable mobile devices.
 *
 * This means that you can write a single common rendering loop and have it work
 * across multiple output platforms, AR or VR, mono and stereo, with a minimum
 * of device-specific or context-specific code required.
 *
 * A valid %RenderingPrimitives instance can only be obtained from the Device
 * singleton instance after:
 * - the CameraDevice has been initialized, and
 * - %Vuforia has been informed of the rendering surface size via calls to
 * Vuforia::onSurfaceCreated() and Vuforia::onSurfaceChanged().
 *
 * The transformation measurement unit used is the same as the one used
 * to define the target size (usually meters).
 */
class VUFORIA_API RenderingPrimitives
{
public:

    virtual ~RenderingPrimitives();

    /// Copy constructor.
    RenderingPrimitives(const RenderingPrimitives& other);

    /// Get the set of <span>VIEW</span>s available for rendering from these primitives.
    /**
     * In the most common use case (handheld AR on a mobile device), the returned
     * ViewList will contain just a single entry, VIEW::VIEW_SINGULAR.
     *
     * In other use cases (such as stereo head-mounted AR or VR) the returned ViewList
     * may contain multiple entries: typically VIEW::VIEW_LEFTEYE, VIEW::VIEW_RIGHTEYE and
     * VIEW::VIEW_POSTPROCESS.
     *
     * For see-through AR, the list will typically contain VIEW::VIEW_LEFTEYE and
     * VIEW::VIEW_RIGHTEYE.
     */
    virtual ViewList& getRenderingViews() const;

    /// Get the viewport for a particular VIEW.
    /**
     * The returned vector describes the starting position, width, and height of
     * the area where content for the given viewID should be rendered, in screen
     * coordinates (i.e. pixels).
     *
     * \param viewID The VIEW you want a viewport for
     * \return The viewport for the given View in the format (x, y, width,
     * height) in screen coordinates (i.e. pixels).
     */
    virtual Vec4I getViewport(VIEW viewID) const;

    /// Get the normalized viewport for a particular VIEW.
    /**
     * The returned vector describes the starting position, width, and height of
     * the area where content for the given viewID should be rendered, in
     * normalized coordinates (i.e. all values are in the range 0..1).
     *
     * \param viewID The VIEW you want a viewport for.
     * \return The normalized viewport for the given View in the format (x, y,
     * width, height) where all values are in the range 0..1.
     */
    virtual Vec4F getNormalizedViewport(VIEW viewID) const;

    /// Get a projection matrix for rendering content for the specified VIEW.
    /**
     * \note The returned matrix is row-major. For OpenGL, you will need to
     * convert the matrix to column-major using one of the functions in Tool
     * (typically Tool::convertPerspectiveProjection2GLMatrix).
     *
     * \note In AR mode, the returned projection matrix will also include a
     * user interface orientation transform.
     *
     * \param viewID The VIEW you want a projection matrix for.
     * \param cameraCalibration Camera calibration details, or NULL. Typically,
     * you should pass in camera calibration returned from
     * State::getCameraCalibration(). If NULL, the camera calibration calculated
     * when this RenderingPrimitives instance was constructed will be used.
     * \param adjustForViewportCentreToEyeAxis If true, apply skew offsets (see
     * getViewportCentreToEyeAxis) for VIEW::VIEW_LEFTEYE and VIEW::VIEW_RIGHTEYE.
     * \returns A 3x4 row-major projection matrix (use conversion functions in
     * the Tool class, if necessary, to convert the matrix for use with OpenGL).
     *
     */
    virtual Matrix34F getProjectionMatrix(VIEW viewID,
                                          const CameraCalibration* cameraCalibration,
                                          bool adjustForViewportCentreToEyeAxis = true);

    /// Get the effective field of view for the specified VIEW.
    /**
     * The effective FOV is calculated based on the screen size and the viewer
     * hardware's maximum FOV, as configured via Device::selectViewer(). Note
     * that this will vary according to the host device and viewer.
     *
     * This function will only return meaningful data for VIEW::VIEW_LEFTEYE and
     * VIEW::VIEW_RIGHTEYE, and only when a viewer profile has been configured
     * via Device::selectViewer().
     *
     * \param viewID The VIEW you want the Field-of-View for. Only VIEW::VIEW_LEFTEYE
     * or VIEW::VIEW_RIGHTEYE will return meaningful results.
     * \returns Field-of-View half-angles {left, right, bottom, top}, in radians,
     * as measured from the eye axis.
     */
    virtual const Vec4F getEffectiveFov(VIEW viewID) const;

    /// Get any skew adjustments that need to be applied to the projection matrix before rendering.
    /**
     * The skew adjustment values should be used to modify the left/right eye
     * projection matrices to ensure that the eye axis is aligned with the
     * centre of the viewport.
     *
     * - For the video background projection matrix (returned from
     * getVideoBackgroundProjectionMatrix()), these values replace elements 3
     * and 7.
     * - For the scene projection matrix (returned from getProjectionMatrix())
     * these values replace elements 2 and 6.
     *
     * \note In AR mode, the returned projection matrix will also include a
     * user interface orientation transform.
     *
     * \note If you call getProjectionMatrix() or getVideoBackgroundProjectionMatrix()
     * with the adjustForViewportCentreToEyeAxis parameter set to true, it is
     * not necessary to call this function as the skew adjustments have already
     * been applied to the matrix.
     *
     * \param viewID The VIEW you want skew adjustments for (typically
     * VIEW::VIEW_LEFTEYE or VIEW::VIEW_RIGHTEYE).
     * \returns Skew adjustments (ie the offset of the eye axis relative to the
     * centre of the viewport), normalised to the extents of the viewport (i.e.
     * in the range -1..1).
     * */
    virtual const Vec2F getViewportCentreToEyeAxis(VIEW viewID) const;

    /// Get a matrix that can correct rendering to account for the offset of the eye from the central rendering position.
    /**
     * The returned matrix should be applied to the pose matrix of any tracked
     * object during rendering.
     *
     * The matrix is specified in meters. If your scene is defined in another
     * unit you will need to adjust the matrix (by scaling the offset parameters)
     * before applying it to your scene.
     *
     * Note that when working with OpenGL, this matrix will need be converted
     * to column-major format using Tool::convert2GLMatrix().
     *
     * \param viewID The VIEW you want an adjustment matrix for (typically
     * VIEW::VIEW_LEFTEYE or VIEW::VIEW_RIGHTEYE).
     * \returns The row-major eye/display adjustment matrix to use for the given
     * VIEW (use the conversion functions in the Tool class if required convert
     * to an OpenGL-compatible matrix).
      */
    virtual Matrix34F getEyeDisplayAdjustmentMatrix(VIEW viewID) const;

    /// Get the size of a texture that can be used to render the video background.
    /**
     * Note that the returned size may be larger than the video background itself
     * (for example when a power-of-two texture size is required for performance).
     *
     * \return The size that the video background texture needs to be.
     */
    virtual const Vec2I getVideoBackgroundTextureSize() const;

    /// Get a projection matrix to use when rendering the video frame as a background image for the augmentation.
    /**
     * Note that when working with OpenGL, this matrix will need be converted to
     * column-major format using Tool::convert2GLMatrix().
     *
     * \param viewID The VIEW you want a video background projection matrix for.
     * \param adjustForViewportCentreToEyeAxis If true, apply skew offsets
     * (\see getViewportCentreToEyeAxis).
     * \returns A 3x4 row-major projection matrix (use Tool::convert2GLMatrix()
     * to convert to column-major format for OpenGL).
     *
     */
    virtual Matrix34F getVideoBackgroundProjectionMatrix(VIEW viewID,
                                                         bool adjustForViewportCentreToEyeAxis = true) const;

    /// Get a simple mesh suitable for use when rendering the video frame as a background image.
    /**
     * The returned mesh has dimensions and texture coordinates that are
     * suitable for rendering a distortion-free camera frame in the requested
     * VIEW, compensating for any discrepancies between the camera and viewport
     * size and aspect ratio.
     *
     * The mesh should be rendered as a textured mesh, in combination with the
     * projection matrix returned by getVideoBackgroundProjectionMatrix(), using
     * the video frame image as a texture.
     *
     * \note If you intend to apply your own distortion to the video background,
     * you may need to construct a finer triangle mesh (based on this mesh), in
     * order to avoid rendering artefacts.
     *
     * \param viewID The VIEW you want the mesh for.
     * \returns A mesh to use when rendering the video frame as a background
     * image.
     */
    virtual const Mesh& getVideoBackgroundMesh(VIEW viewID) const;

    /// Get the size of a texture that can be used to render undistorted content for stereo applications.
    /**
     * This function returns the recommended size for the texture that should be
     * applied to the distortion mesh, in order to minimise visual artefacts
     * resulting from the barrel distortion process.
     *
     * \param viewID The VIEW to return the recommended texture size for
     * (typically VIEW::VIEW_POSTPROCESS).
     * \returns The recommended texture size for the distortion texture.
      */
    virtual const Vec2I getDistortionTextureSize(VIEW viewID) const;

    /// Get the viewport for the given VIEW to use when rendering the distortion mesh.
    /**
     * The returned vector describes the starting position, width, and height of
     * the area where content for the given viewID should be rendered, in
     * coordinates referencing into the distortion texture.
     *
     * \param viewID The VIEW you want a viewport for (typically
     * VIEW::VIEW_POSTPROCESS).
     * \return The viewport for the given VIEW in the format (x, y, width,
     * height) in distortion texture coordinates.
     */
    virtual Vec4I getDistortionTextureViewport(VIEW viewID) const;

    /// Get a distortion mesh for the given view.
    /**
     * When working with certain types of head-mounted display, visual content
     * will need to be distorted to account for the optics of the display.
     *
     * This function returns a barrel distortion mesh to perform this distortion.
     * It should be rendered as a textured mesh using the distortion texture.
     *
     * \param viewID The VIEW you want a distortion mesh for (typically
     * VIEW::VIEW_POSTPROCESS).
     * \returns A barrel distortion mesh that should be rendered as a textured
     * mesh using the distortion texture.
      */
    virtual const Mesh& getDistortionTextureMesh(VIEW viewID) const;

protected:

    RenderingPrimitives();
    class Impl;
    Impl* mImpl;
};

} // namespace Vuforia

#endif // _VUFORIA_RENDERING_PRIMITIVES_H_
