/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.
 
\file
    MetalRenderer.h

\brief
    Header file for Metal renderer classes.
===============================================================================*/

#ifndef _VUFORIA_METALRENDERER_H_
#define _VUFORIA_METALRENDERER_H_

// Include files
#include <Metal/Metal.h>
#include <Vuforia/Renderer.h>

namespace Vuforia
{

// Metal-specific classes

/// Metal-specific texture data.
/**
 *  MetalTextureData object passed to %Vuforia to set the Metal texture pointer
 *  to the video background texture created by the app.
 *
 *  Use with Renderer::setVideoBackgroundTexture() and in conjunction
 *  with Renderer::updateVideoBackgroundTexture().
 */
class VUFORIA_API MetalTextureData : public TextureData
{
public:
    /// Convenience constructor
    /**
     * \param videoBackgroundTexture The video background texture to use.
     */
    MetalTextureData(id<MTLTexture> videoBackgroundTexture = nil);
    ~MetalTextureData();

    virtual const void* buffer() const;

    id<MTLTexture> mVideoBackgroundTexture;
};


/// Metal-specific texture unit.
/**
 *  MetalTextureUnit object passed to %Vuforia to set the video background
 *  texture unit after updating the background image data. The fragment texture
 *  is set on the current render command encoder at the index specified by
 *  mTextureIndex.
 *
 *  Use with Renderer::updateVideoBackgroundTexture()
 */
class VUFORIA_API MetalTextureUnit : public TextureUnit
{
public:
    /// Convenience constructor
    /**
     * \param textureIndex The index of this texture unit.
     */
    MetalTextureUnit(int textureIndex = 0);
    ~MetalTextureUnit();

    virtual const void* buffer() const;

    int mTextureIndex;
};


/// Metal-specific render data.
/**
 *  MetalRenderData object passed to Vuforia when performing Metal rendering
 *  operations. Pass a pointer to the current drawable texture and a pointer
 *  to a valid render command encoder encapsulated in the mData struct.
 *
 *  Do not call endEncoding on the encoder before making all the Vuforia::Renderer
 *  calls you require.
 *
 *  After making all of your Vuforia::Renderer calls, you may call endEncoding on
 *  the encoder and pass a different encoder to Vuforia::Renderer::end, but the new
 *  encoder passed to Vuforia::Renderer::end must have access to the current frame
 *  buffer data in order for Vuforia to draw (blend) over it. This means it
 *  must be the same encoder that wrote the data, in which case its commands
 *  will be in the buffer before Vuforia adds it commands, or a new encoder
 *  that loads the data from the texture at the start of its render pass).
 * 
 *  Use with Renderer::begin() and Renderer::end()
 */
class VUFORIA_API MetalRenderData : public RenderData
{
public:
    MetalRenderData();
    ~MetalRenderData();

    virtual const void* buffer() const;

    struct {
        id<MTLTexture> drawableTexture;
        id<MTLRenderCommandEncoder> commandEncoder;
    } mData;
};

} // namespace Vuforia

#endif // _VUFORIA_METALRENDERER_H_
