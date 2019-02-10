/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    GLRenderer.h

\brief
    Header file for GL renderer classes.
===============================================================================*/

#ifndef _VUFORIA_GLRENDERER_H_
#define _VUFORIA_GLRENDERER_H_

// Include files
#include <Vuforia/Renderer.h>

namespace Vuforia 
{
// OpenGL-specific classes

/// OpenGL-specific texture data.
/**
 * GLTextureData object is passed to %Vuforia to set the GL texture ID of the video
 * background texture created by the app.
 *
 * Use with Renderer::setVideoBackgroundTexture() and in conjunction
 * with Renderer::updateVideoBackgroundTexture().
 */
class VUFORIA_API GLTextureData : public TextureData
{
public:

    /// Convenience constructor.
    /**
     * \param videoBackgroundTextureID The video background texture to use.
     */
    GLTextureData(int videoBackgroundTextureID = 0);
    ~GLTextureData();

    virtual const void* buffer() const;

    int mVideoBackgroundTextureID;
};


/// OpenGL-specific texture unit data.
/**
 * GLTextureUnit object passed to %Vuforia which binds the texture to the
 * mTextureUnit value.
 *
 * Use with Renderer::updateVideoBackgroundTexture().
 */
class VUFORIA_API GLTextureUnit : public TextureUnit
{
public:

    /// Convenience constructor.
    /**
     * \param unit The texture index of this texture unit.
     */
    GLTextureUnit(int unit = 0);
    ~GLTextureUnit();

    virtual const void* buffer() const;

    int mTextureUnit;
};

} // namespace Vuforia

#endif //_VUFORIA_GLRENDERER_H_
