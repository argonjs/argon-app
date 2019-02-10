/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Image.h

\brief
    Header file for Image class.
===============================================================================*/

#ifndef _VUFORIA_IMAGE_H_
#define _VUFORIA_IMAGE_H_

// Include files
#include <Vuforia/Vuforia.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

/// Represents an image, typically as returned by the CameraDevice.
/**
 * The image's pixel buffer may have a different size than expected based on the
 * return values from getWidth() and getHeight(). This typically happens when
 * case when an image is used for rendering as a texture without non-power-of-two
 * support.
 *
 * If you need the actual size of the image's pixel buffer, call getBufferWidth()
 * and getBufferHeight().
 */
class VUFORIA_API Image : private NonCopyable
{
public:

    /// Get the width of the image in pixels.
    /**
     *  \returns the number of pixels in the pixel buffer that make up
     *  the used image area.
     *
     *  \note The pixel buffer can be wider than this. Use getBufferWidth() to
     *  get the actual width of the pixel buffer.
     */
    virtual int getWidth() const = 0;

    /// Get the height of the image in pixels.
    /**
     *  \returns the number of pixel rows in the pixel buffer that
     *  make up the used image area.
     *
     *  \note The pixel buffer can have more rows than this. Use getBufferHeight()
     *  to get the actual number of rows in the pixel buffer.
     */
    virtual int getHeight() const = 0;

    /// Get the number of bytes between the start of a pixel row and the start of the next.
    /**
     * Typically, the stride is (numberOfPixels * bytesPerPixel).
     *
     * However, in some cases there may be additional padding at the end of a
     * row (for example to pad the image data to a power-of-two size).
     */
    virtual int getStride() const = 0;

    /// Get the width (number of columns) of the underlying pixel buffer.
    /**
     * Typically, this is the same as getWidth().
     *
     * However, in some cases there may be additional padding at the end of a
     * row (for example to pad the image data to a power-of-two size).
     */
    virtual int getBufferWidth() const = 0;

    /// Get the height (number of rows) of the underlying pixel buffer.
    /**
     * Typically, this is the same as getHeight().
     *
     * However, in some cases there may be additional padding rows at the bottom
     * of an image (for example to pad the image data to a power-of-two size).
     */
    virtual int getBufferHeight() const = 0;

    /// Get the pixel format of the image.
    virtual PIXEL_FORMAT getFormat() const = 0;

    /// Get a pointer to the start of the underlying pixel buffer.
    /**
     * The returned buffer is (getBufferHeight() * getStride()) bytes in size.
     */
    virtual const void* getPixels() const = 0;

protected:

    virtual ~Image() {}
};

} // namespace Vuforia

#endif //_VUFORIA_IMAGE_H_
