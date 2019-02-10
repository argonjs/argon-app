/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    VideoBackgroundConfig.h

\brief
    Header file for VideoBackgroundConfig struct.
===============================================================================*/

#ifndef _VUFORIA_VIDEOBACKGROUNDTEXTUREINFO_H_
#define _VUFORIA_VIDEOBACKGROUNDTEXTUREINFO_H_

// Include files
#include <Vuforia/Vectors.h>
#include <Vuforia/Vuforia.h>

namespace Vuforia
{


/// Defines texture information for rendering the video background.
struct VideoBackgroundTextureInfo
{
    /// Width and height of the video background texture in pixels.
    /**
     *  Describes the size of the texture in the graphics unit.
     *  Depending on the particular hardware, the values may be the next
     *  power of two greater than the image size.
     */
    Vec2I mTextureSize;

    /// Width and height of the video background image in pixels.
    /**
     *  Describe the size of the image inside the texture. This corresponds
     *  to the size of the image delivered by the camera, and (depending on graphics
     *  hardware) may not be the same as mTextureSize.
     */
    Vec2I mImageSize;

    /// Format of the video background image.
    /**
     *  Describe the pixel format of the camera image.
     */
    PIXEL_FORMAT mPixelFormat;
};

} // namespace Vuforia

#endif //_VUFORIA_VIDEOBACKGROUNDTEXTUREINFO_H_
