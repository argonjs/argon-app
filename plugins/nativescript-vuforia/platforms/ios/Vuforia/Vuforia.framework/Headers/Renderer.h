/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Renderer.h

\brief
    Header file for Renderer class.
===============================================================================*/

#ifndef _VUFORIA_RENDERER_H_
#define _VUFORIA_RENDERER_H_

// Include files
#include <Vuforia/Matrices.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/State.h>
#include <Vuforia/NonCopyable.h>
#include <Vuforia/Vuforia.h>

namespace Vuforia 
{

// Forward declarations
class State;
struct VideoBackgroundConfig;
struct VideoBackgroundTextureInfo;
class TextureData;
class TextureUnit;
class RenderData;


/// A helper class that provides common AR related rendering tasks.
/**
 * The Renderer class provides methods to fulfill typical AR related tasks
 * such as rendering the video background and 3D objects with up-to-date
 * pose data. It also exposes methods for configuring the rendering frame rate
 * in both AR and VR use cases.
 *
 * \note Some methods of the Renderer class may only be called from the render
 * thread.
 */
class VUFORIA_API Renderer : private NonCopyable
{
public:

    /// Flags for getRecommendedFps() to provide hints about the rendering context.
    enum FPSHINT_FLAGS
    {
        /// No FPS hint defined.
        FPSHINT_NONE = 0,

        /**
         * The application does not draw the video background (in optical see-
         * through AR or VR mode). Do not set this flag when in video see-
         * through AR mode.
         */
        FPSHINT_NO_VIDEOBACKGROUND = 1 << 0,

        /**
         * The application should be conservative in its power consumption, in
         * order to reduce heat accumulation and increase battery life.
         *
         * On some devices this may come at the cost of reduced application
         * performance and decreased quality of experience.
         */
        FPSHINT_POWER_EFFICIENCY = 1 << 1,

        /**
         * The application uses content that requires a high rendering rate,
         * e.g. smooth character animation or a physics engine that requires
         * frequent updates.
         */
        FPSHINT_FAST = 1 << 2,

        /// Default flags used by Vuforia to determine FPS settings
        FPSHINT_DEFAULT_FLAGS = FPSHINT_NONE
    };

    /// Target FPS value representing continuous rendering.
    static const int TARGET_FPS_CONTINUOUS;

    /// Returns the Renderer singleton instance.
    static Renderer& getInstance();

    /// Tell the Renderer that rendering of the current frame is about to begin using a specific State.
    /**
     * Use this method if you want to draw a specific camera frame, rather than
     * the latest available one.
     *
     * \param state the State that rendering will be based on.
     * \param renderData a pointer to 3D graphics rendering API-specific data,
     * which may not be required for the current API (such as OpenGL ES). The
     * renderData object must remain valid until all drawing commands are
     * completed.
     *
     * \note May only be called from the render thread.
     *
     * \note You may pass a different renderData object to end(); details are
     * platform specific
     */
    virtual void begin(State state, const RenderData* renderData = 0) = 0;

    /// Tell the Renderer that rendering is finished.
    /**
     * \note May only be called from the render thread.
     *
     * \param renderData A pointer to 3D graphics rendering API-specific data,
     * which may not be required for the current API (such as OpenGL ES). The
     * renderData object must remain valid until the call returns.
     */
    virtual void end(const RenderData* renderData = 0) = 0;

    /// Update the video background texture.
    /**
     * \param textureUnit A pointer to a 3D graphics rendering API specific
     *  identifier which binds the texture to the textureUnit value.
     *  Pass NULL if you do not wish %Vuforia to bind the texture
     *  to the textureUnit.
     *
     * This method may only be called on the render thread, between calls to
     * begin() and end().
     *
     * The textureUnit (if any) can be discarded after the call as
     * it is only used during the call.
     */
    virtual bool updateVideoBackgroundTexture(const TextureUnit* textureUnit = 0) = 0;

    /// Configure the layout of the video background (its location/size on screen).
    virtual void setVideoBackgroundConfig(const VideoBackgroundConfig& cfg) = 0;
    
    /// Get the current layout configuration of the video background.
    virtual const VideoBackgroundConfig& getVideoBackgroundConfig() const = 0;

    /// Get the texture info associated with the current video background.
    /**
     * The result is only valid after a call to updateVideoBackgroundTexture().
     */
    virtual const VideoBackgroundTextureInfo& 
                                      getVideoBackgroundTextureInfo() = 0;

    /// Tell %Vuforia which texture to use when updating the video background.
    /**
     * Use in conjunction with updateVideoBackgroundTexture().
     *
     * \note May only be called from the render thread.
     *
     * \param textureData A reference to 3D graphics rendering API specific texture
     *  data, such as GLTextureData. %Vuforia makes a copy of the textureData
     *  object, so you can release the data after the call has been made.
     */
    virtual bool setVideoBackgroundTexture(const TextureData& textureData) = 0;

    /// Set a target rendering frame rate.
    /**
     * Request a rendering frame rate that the application should target in its
     * render loop. Not all requested frame rates may be achievable on all
     * devices and/or usage contexts.
     *
     * The target frame rate may influence power consumption, heat buildup,
     * battery life and/or application performance. See getRecommendedFps() for
     * more details.
     *
     * You may use a fixed rate (such as 30 or 60). To get a recommended frame
     * rate, call getRecommendedFps() specifying your usage context via the
     * flags.
     *
     * \param fps The desired frame rate, in frames per second, or
     * TARGET_FPS_CONTINUOUS for continuous rendering (if supported).
     *
     * \returns true on success, otherwise false (check application logs for
     * details).
     */
    virtual bool setTargetFps(int fps) = 0;

    /// Get a recommended rendering frame rate based on application usage context.
    /**
     *  The target rendering frame rate of an AR or VR application is an
     *  important trade-off between optimal experience and device power usage.
     *  The choice is influenced by multiple parameters including device type,
     *  the active Trackers, the camera and/or sensor frame rates.
     *
     *  Furthermore there are application specific trade offs to consider, which
     *  you can pass to this method via FPSHINT_FLAGS. For example, an
     *  application with animated content may need consistent 60
     *  fps rendering, even on a device that can only deliver tracking results
     *  at 30 fps.
     *
     *  This method considers the capabilities of the current device along with
     *  any hint flags passed to it and returns a recommended frame rate, which
     *  should be passed to setTargetFps().
     *
     *  \note This method may return different values based on the CameraDevice's
     *  VideoMode and/or the set of currently active Trackers. It is
     *  therefore recommended that you call this method only after initializing
     *  the camera and starting all desired Trackers, and possibly again after
     *  transitioning between application modes (for example when swapping
     *  from AR to VR mode or back).
     *
     *  \param flags Flags which hint at your application's usage context.
     *  \returns A recommended target frames per second, which should be passed
     *  to setTargetFps().
     */
    virtual int getRecommendedFps(int flags = FPSHINT_DEFAULT_FLAGS) const = 0;
};

/// Base class used for passing texture data to %Vuforia.
/**
 *  Base class for the TextureData object passed to %Vuforia to set the video
 *  background texture created by the app.
 *
 *  Applications must use one of the rendering API specific sub-classes, not this
 *  base class.
 *
 *  \see GLRenderer.h
 *  \see MetalRenderer.h
 */
class VUFORIA_API TextureData
{
public:

    /// Get a pointer to the member data for the class.
    virtual const void* buffer() const = 0;

    /// Get the type of data in use (one of Vuforia::INIT_FLAGS).
    int type() const { return mType; }

protected:

    /// Construct with a specific type (one of Vuforia::INIT_FLAGS).
    TextureData(int type);
    ~TextureData();

private:

    /// The type of the class
    int mType;
};

/// Base class used for passing texture unit data to %Vuforia.
/**
 *  Base class for the TextureUnit object passed to %Vuforia to set the video
 *  background texture after updating the background image data.
 *
 *  Applications must use one of the rendering API specific sub-classes, not this
 *  base class.
 *
 *  \see GLRenderer.h
 *  \see MetalRenderer.h
 */
class VUFORIA_API TextureUnit
{
public:

    /// Get a pointer to the member data for the class.
    virtual const void* buffer() const = 0;

    /// Get the type of data in use (one of Vuforia::INIT_FLAGS).
    int type() const { return mType; }

protected:

    /// Construct with a specific type (one of Vuforia::INIT_FLAGS).
    TextureUnit(int type);
    ~TextureUnit();

private:

    /// The type of the class
    int mType;
};

/// Base class used when passing 3D graphics rendering API specific data to %Vuforia.
/**
 *  Base class for the RenderData object passed to %Vuforia when performing
 *  rendering operations.
 *
 *  Applications must use one of the rendering API-specific sub-classes, not this
 *  base class.
 *
 *  \see GLRenderer.h
 *  \see MetalRenderer.h
 */
class VUFORIA_API RenderData
{
public:

    /// Get a pointer to the member data for the class.
    virtual const void* buffer() const = 0;

    /// Get the type of data in use (one of Vuforia::INIT_FLAGS).
    int type() const { return mType; }

protected:

    /// Construct with a specific type (one of Vuforia::INIT_FLAGS).
    RenderData(int type);
    
    /// Destructor
    ~RenderData();

private:

    /// The type of the class
    int mType;
};

} // namespace Vuforia

#endif //_VUFORIA_RENDERER_H_
