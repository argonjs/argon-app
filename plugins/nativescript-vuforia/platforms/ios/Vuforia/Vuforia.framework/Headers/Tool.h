/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Tool.h

\brief
    Header file for global Tool functions.
===============================================================================*/

#ifndef _VUFORIA_TOOL_H_
#define _VUFORIA_TOOL_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

// Forward declarations
class CameraCalibration;

/// Various geometry and linear algebra utility functions.
namespace Tool
{
    /// Convert a 3x4 %Vuforia pose matrix to an 4x4 column-major OpenGL model-view matrix.
    /**
     *  %Vuforia uses 3x4 row-major matrices for pose data. This function
     *  takes such a pose matrix (rotation, translation) and returns an
     *  OpenGL-compatible model-view matrix.
     */
    VUFORIA_API Matrix44F convertPose2GLMatrix(const Matrix34F& pose);

    /// Convert a 3x4 %Vuforia matrix to an 4x4 column-major OpenGL matrix.
    /**
     *  %Vuforia uses 3x4 row-major matrices. This function takes such a matrix
     *  (which may or may not represent a transformation/pose) and returns an
     *  OpenGL-compatible matrix.
     */
    VUFORIA_API Matrix44F convert2GLMatrix(const Matrix34F& matrix34F);

    /// Convert a 3x4 %Vuforia perspective projection matrix to a 4x4 column-major OpenGL matrix.
    /**
     *  %Vuforia uses 3x4 row-major matrices for perspective projection data.
     *  This function takes such a perspective projection matrix and returns an
     *  OpenGL-compatible perspective projection matrix using the given near
     *  and far planes.
     */
    VUFORIA_API Matrix44F convertPerspectiveProjection2GLMatrix(const Matrix34F& projection, float nearPlane, float farPlane);

    /// Get an OpenGL-compatible projection matrix (DEPRECATED).
    /**
     *  \deprecated This function has been deprecated. It will be removed in an
     *  upcoming %Vuforia release. To get a projection matrix for rendering your scene,
     *  please use RenderingPrimitives::getProjectionMatrix(), and convert it to an
     *  OpenGL-compatible matrix with Tool::convertPerspectiveProjection2GLMatrix.
     */
    VUFORIA_API Matrix44F getProjectionGL(const CameraCalibration& calib,
                                       float nearPlane, float farPlane);

    /// Project a 3D scene point onto a camera image.
    /**
     *  This function takes a 3D point in scene coordinates and transforms it
     *  using the given pose matrix, then projects it onto the camera image and
     *  returns the result in pixel coordinates.
     *
     *  \param calib The camera calibration, used to compensate for visual distortion
     *  \param pose The pose matrix to use to transform the point.
     *  \param point A point in the same space as the pose matrix that you want
     *  to transform to camera coordinates.
     *
     *  \returns A point in the camera image, in device coordinates (pixels).
     *
     *  \note Because the camera resolution and screen resolution can be different,
     *  camera coordinates are usually not the same as screen coordinates. If you
     *  need screen coordinates, apply another transformation using the same
     *  VideoBackgroundConfig data as you used for Renderer::setVideoBackgroundConfig()
     *  to convert camera pixel coordinates to screen pixel coordinates.
     */
    VUFORIA_API Vec2F projectPoint(const CameraCalibration& calib,
                                const Matrix34F& pose, const Vec3F& point);

    /// Project a camera coordinate onto a plane with given pose.
    /**
     * \param calib The camera calibration, used to compensate for visual distortion
     * \param pose A pose matrix describing the origin and orientation of the
     * plane (the plane itself occupies on the X-Y axes with normal in the Z axis
     * direction)
     * \param screenPoint The point to project, in camera coordinates (not the
     * same as screen coordinates - see projectPoint())
     * \returns An point in the coordinates of the plane (i.e. an offset from the
     * origin in the X-Y plane) that corresponds to the input screenPoint.
     */
    VUFORIA_API Vec2F projectPointToPlaneXY(const CameraCalibration& calib,
                                         const Matrix34F& pose, 
                                         const Vec2F& screenPoint);

    /// Multiply two %Vuforia pose matrices together and return the result.
    /**
     *  In order to apply a transformation A on top of a transformation B,
     *  perform: multiply(B,A).
     */
    VUFORIA_API Matrix34F multiply(const Matrix34F& matLeft,
                                const Matrix34F& matRight);

    /// Multiply two Vuforia-style 4x4-matrices (row-major order) and return the result.
    VUFORIA_API Matrix44F multiply(const Matrix44F& matLeft,
                                const Matrix44F& matRight);

    /// Multiply a vector and a %Vuforia-style 4x4-matrix (row-major order) and return the result.
    VUFORIA_API Vec4F multiply(const Vec4F& vec,
                            const Matrix44F& mat);

    /// Multiply a %Vuforia-style 4x4-matrix (row-major order) and a vector and return the result.
    VUFORIA_API Vec4F multiply(const Matrix44F& mat,
                            const Vec4F& vec);

    /// Multiply two OpenGL-style matrices (col-major order) and return the result.
    VUFORIA_API Matrix44F multiplyGL(const Matrix44F& matLeft,
                                  const Matrix44F& matRight);

    /// Set the translation part of a %Vuforia-style 3x4 pose matrix.
    VUFORIA_API void setTranslation(Matrix34F& pose,
                                 const Vec3F& translation);

    /// Set the rotation part of a %Vuforia-style 3x4 pose matrix.
    /**
     * \param pose The pose matrix on which the rotation should be set.
     * \param axis The 3D axis around which the pose should rotate
     * \param angle The angle to rotate around the axis, in degrees.
     */
    VUFORIA_API void setRotation(Matrix34F& pose,
                              const Vec3F& axis, float angle);

    /// Set the rotation part of a %Vuforia-style 3x4 pose matrix.
    /**
     * \param pose The pose matrix on which the rotation should be set.
     * \param quaternion A 4D vector describing the rotation to set as a quaternion
     * (x, y, z, w)
     */
    VUFORIA_API void setRotationFromQuaternion(Matrix34F& pose, const Vec4F& quaternion);
} // namespace Tool

} // namespace Vuforia

#endif //_VUFORIA_TOOL_H_
