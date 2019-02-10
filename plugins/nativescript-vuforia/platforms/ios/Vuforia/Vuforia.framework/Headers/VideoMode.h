/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    VideoMode.h

\brief
    Header file for VideoMode struct.
===============================================================================*/

#ifndef _VUFORIA_VIDEOMODE_H_
#define _VUFORIA_VIDEOMODE_H_

namespace Vuforia
{

/// A particular video configuration for the device's camera.
struct VideoMode
{
    VideoMode() : mWidth(0), mHeight(0), mFramerate(0.f) {}

    int mWidth;       ///< Video frame width, in pixels
    int mHeight;      ///< Video frame height, in pixels
    float mFramerate; ///< Video frame rate
};

} // namespace Vuforia

#endif // _VUFORIA_VIDEOMODE_H_
