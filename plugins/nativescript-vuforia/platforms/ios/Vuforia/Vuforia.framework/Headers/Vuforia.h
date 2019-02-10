/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Vuforia.h

\brief
    Header file for global Vuforia methods.
===============================================================================*/

#ifndef _VUFORIA_VUFORIA_H_
#define _VUFORIA_VUFORIA_H_

// Include files
#include <Vuforia/System.h>

namespace Vuforia
{

// Forward declarations
class UpdateCallback;
class VideoSource;

/// Initialization flags.
/**
 *  Use when calling init()
 */
enum INIT_FLAGS {
    GL_20 = 1,          ///< Enables OpenGL ES 2.x rendering (not available on UWP platforms)
    METAL = 2,          ///< Enables Metal rendering (available only on Apple platforms)
    DX_11 = 4,          ///< Enables DirectX 11 rendering (available only on UWP platforms)
    GL_30 = 8,          ///< Enables OpenGL ES 3.x rendering (not available on UWP platforms)
};

/// Return codes for init() function.
enum INIT_ERRORCODE {
    INIT_ERROR = -1,                                ///< Error during initialization
    INIT_DEVICE_NOT_SUPPORTED = -2,                 ///< The device is not supported
    INIT_NO_CAMERA_ACCESS = -3,                     ///< Cannot access the camera
    INIT_LICENSE_ERROR_MISSING_KEY = -4,            ///< License key is missing
    INIT_LICENSE_ERROR_INVALID_KEY = -5,            ///< Invalid license key passed to SDK
    INIT_LICENSE_ERROR_NO_NETWORK_PERMANENT = -6,   ///< Unable to verify license key due to network (Permanent error)
    INIT_LICENSE_ERROR_NO_NETWORK_TRANSIENT = -7,   ///< Unable to verify license key due to network (Transient error)
    INIT_LICENSE_ERROR_CANCELED_KEY = -8,           ///< Provided key is no longer valid
    INIT_LICENSE_ERROR_PRODUCT_TYPE_MISMATCH = -9,  ///< Provided key is not valid for this product
    INIT_EXTERNAL_DEVICE_NOT_DETECTED = -10,        ///< Dependent external device not detected/plugged in
    INIT_VUFORIA_DRIVER_FAILED = -11                ///< Vuforia Driver library failed to open
};

/// Pixel encoding types.
enum PIXEL_FORMAT {
    UNKNOWN_FORMAT = 0,         ///< Unknown format - default pixel type for
                                ///< undefined images
    RGB565 = 1,                 ///< A color pixel stored in 2 bytes using 5
                                ///< bits for red, 6 bits for green and 5 bits
                                ///< for blue
    RGB888 = 2,                 ///< A color pixel stored in 3 bytes using
                                ///< 8 bits each
    GRAYSCALE = 4,              ///< A grayscale pixel stored in one byte
    YUV = 8,                    ///< A color pixel stored in 12 or more bits
                                ///< using Y, U and V planes
    RGBA8888 = 16,              ///< A color pixel stored in 32 bits using 8 bits
                                ///< each and an alpha channel.
    INDEXED = 32,               ///< One byte per pixel where the value maps to
                                ///< a domain-specific range.
};

/// Use when calling setHint().
enum HINT {
    /// How many image targets to detect and track at the same time.
    /**
     *  This hint tells the tracker how many image shall be processed
     *  at most at the same time. E.g. if an app will never require
     *  tracking more than two targets, this value should be set to 2.
     *  Default is: 1.
     */
    HINT_MAX_SIMULTANEOUS_IMAGE_TARGETS = 0,

    /// How many object targets to detect and track at the same time.
    /**
     *  This hint tells the tracker how many 3D objects shall be processed
     *  at most at the same time. E.g. if an app will never require
     *  tracking more than 1 target, this value should be set to 1.
     *  Default is: 1.
     */
    HINT_MAX_SIMULTANEOUS_OBJECT_TARGETS = 1,

    /// Force delayed loading for object target DataSet.
    /**
     *  This hint tells the tracker to enable delayed loading
     *  of object target datasets upon first detection.
     *  Loading time of large object dataset will be reduced 
     *  but the initial detection time of targets will increase.
     *  Please note that the hint should be set before loading 
     *  any object target dataset to be effective.
     *  To enable delayed loading set the hint value to 1.
     *  To disable delayed loading set the hint value to 0.
     *  Default is: 0.
     */
    HINT_DELAYED_LOADING_OBJECT_DATASETS = 2,

    /// Asynchronously fetch the latest device calibration profile.
    /**
    *  This hint enables asynchronous fetching of the latest device
    *  calibration profile from the cloud, which does not block
    *  Vuforia's initialization until the calibration profile is
    *  successfully acquired. Skipping the blocking attempt to get
    *  the latest profile can cause the SDK to run in a non-optimized
    *  mode on the first run.
    *  By default, acquiring of the latest device calibration
    *  profile may block Vuforia's initialization for up to a
    *  maximum timeout of 10 seconds or until a new profile is
    *  successfully acquired from the cloud.
    *  Please note that the hint should be set before Vuforia's
    *  initialization to be effective.
    *  To enable asynchronous fetching set the hint value to 1.
    *  To disable asynchronous fetching set the hint value to 0.
    *  Default is: 0.
    */
    HINT_ASYNC_FETCH_OF_LATEST_CALIBRATION = 3,
};

/// Controls how paths should be handled when loading DataSet files.
enum STORAGE_TYPE {
    STORAGE_APP,            ///< Indicates a relative path to an app-local storage location.
    STORAGE_APPRESOURCE,    ///< Indicates a relative path to a resource bundled with the application.
    STORAGE_ABSOLUTE        ///< Indicates an absolute path.
};

/// The kinds of Fusion provider available for %Vuforia to use.
/**
 * See setAllowedFusionProviders() for more information about %Vuforia Fusion.
 */
enum FUSION_PROVIDER_TYPE {
    /// An invalid call has been made.
    /**
     * This value is returned when making a call to any of the FusionProvider
     * functions at an invalid time. It should not be used as part of setting
     * the allowed Fusion provider.
     */
    FUSION_PROVIDER_INVALID_OPERATION = -1,
    
    /// Use vision-based Fusion only.
    /**
     * Please note that not all %Vuforia features are supported when using this
     * provider. See setAllowedFusionProviders() for more information.
     */
    FUSION_PROVIDER_VUFORIA_VISION_ONLY = 1,
  
    /// Use %Vuforia-provided technology for Fusion.
    /**
     * %Vuforia will make use of camera and IMU information to try to create a
     * tracking experience that, when compared to FUSION_PROVIDER_VUFORIA_VISION_ONLY,
     * is more robust to erratic motions and sparse or featureless environments.
     */
    FUSION_PROVIDER_VUFORIA_SENSOR_FUSION = 2,
    
    /// Use platform-provided technology for Fusion.
    /**
     * %Vuforia will make use of tracking services offered by the underlying
     * platform, such as ARKit on iOS, ARCore on Android, or Windows Holographic
     * on UWP.
     */
    FUSION_PROVIDER_PLATFORM_SENSOR_FUSION = 4,
    
    /// Automatically select the best provider.
    /**
     * This is the default, and directs %Vuforia to select the best technology
     * available on the current device for %Vuforia Fusion.
     */
    FUSION_PROVIDER_ALL = (FUSION_PROVIDER_VUFORIA_VISION_ONLY |
                           FUSION_PROVIDER_VUFORIA_SENSOR_FUSION |
                           FUSION_PROVIDER_PLATFORM_SENSOR_FUSION),
    
    /// Optimize Fusion for use with Image Targets and VuMarks (DEPRECATED)
    /**
     * \deprecated This mode is for applications using ImageTargets, CylinderTargets,
     * MultiTargets, ObjectTargets, VuMarks and UserDefinedTargets without
     * requiring usage of ModelTargets or SmartTerrain.
     * This value is deprecated and will default to selecting the best technology
     * available on the device
     */
    FUSION_OPTIMIZE_IMAGE_TARGETS_AND_VUMARKS = FUSION_PROVIDER_ALL,
    
    /// Optimize Fusion for use with Model Targets and SmartTerrain (DEPRECATED)
    /**
     * \deprecated This mode is for applications that want to make use of Model Targets or
     * Smart Terrain.
     * This value is deprecated and will default to selecting the best technology
     * available on the device
     */
    FUSION_OPTIMIZE_MODEL_TARGETS_AND_SMART_TERRAIN = FUSION_PROVIDER_ALL,
     
};

/// Initialize %Vuforia.
/**
 * \see The reference documentation homepage has more general information about
 * %Vuforia's app lifecycle. \ref Lifecycle "Lifecycle of a Vuforia app"
 *
 * This function makes all the other systems in %Vuforia available for use. It
 * should always be the second function that you call (setInitParameters()
 * being the first).
 *
 * This function should be called in a loop, ideally on a background thread,
 * until it returns either an integer >= 100 or an error code (<0). The
 * background thread is critical on platforms that require user approval to
 * access camera hardware (such as iOS or Android), as the approval process
 * typically requires that the main/UI thread is not blocked.
 *
 * \code
 * runOnBackgroundThread({
 *     Vuforia::setInitParameters(...);
 *     int initResult = 0;
 *     while (initResult >= 0 && initResult < 100) {
 *         initResult = Vuforia::init();
 *     }
 *     if (initResult < 0) {
 *         ... handle error
 *     } else {
 *         ... continue initialization
 *         ...
 *     }
 * })
 * \endcode
 *
 * \returns A number representing either a progress toward completion (0..100)
 * or an error code (<0, see #::INIT_ERRORCODE).
 *
 */
int VUFORIA_API init();

/// Checks whether Vuforia has been already successfully initialized.
bool VUFORIA_API isInitialized();

/// Deinitialize %Vuforia.
/**
 * See init() for an overview of the full app lifecycle.
 */
void VUFORIA_API deinit();
    
/// Specify which providers %Vuforia Fusion is allowed to select from.
/**
 * %Vuforia Fusion is a feature, introduced with %Vuforia 7, that is designed
 * to provide the best possible AR experience on a wide range of devices. Fusion
 * solves the problem of fragmentation in AR-enabling technologies, including
 * cameras, sensors, chipsets, and software frameworks such as ARKit, ARCore and
 * Windows Holographic. It fuses the capabilities of the underlying device with
 * %Vuforia features, allowing developers to rely on a single %Vuforia API for
 * an optimal AR experience across multiple devices and platforms.
 *
 * This method provides advanced developers with a way to control which
 * technologies Fusion will use.
 *
 * Before you pass anything other than FUSION_PROVIDER_ALL, you should have a
 * solid understanding of
 *   - the functionality offered by the underlying platforms,
 *   - the technology involved in enabling AR, and
 *   - the robustness of the various options.
 *
 * If you restrict Fusion to FUSION_PROVIDER_VUFORIA_VISION_ONLY, Ground Plane will cease
 * to work and ModelTargets will operate in a less robust manner.
 *
 * Not all Fusion providers are available on all platforms. If none of the
 * allowed Fusion providers are available, FUSION_PROVIDER_VUFORIA_VISION_ONLY will be
 * used as a fallback (even if it is not passed to setAllowedFusionProviders()).
 * Use getActiveFusionProvider() (after Vuforia::init() has succeeded) to find
 * out which Fusion provider is actually in use.
 *
 * \note This function must be called before Vuforia::init() if the provider to
 * be changed is FUSION_PROVIDER_PLATFORM_SENSOR_FUSION. FUSION_PROVIDER_VUFORIA_SENSOR_FUSION
 * can be modified after initialization when no trackers have been initialized with
 * TrackerManager::initTracker()
 *
 * \param providerTypes A single value created by OR'ing together the desired
 * FUSION_PROVIDER_TYPE values. Do not pass FUSION_PROVIDER_INVALID_OPERATION.
 * \returns the value passed to providerTypes on success, or
 * FUSION_PROVIDER_INVALID_OPERATION on failure or if Vuforia::init() has already
 * been called.
 */
FUSION_PROVIDER_TYPE VUFORIA_API setAllowedFusionProviders(FUSION_PROVIDER_TYPE providerTypes);
    
/// Get the Fusion provider that %Vuforia has selected to use.
/**
 * The active Fusion provider will not change after %Vuforia has been initialized.
 *
 * To selectively enable or disable particular Fusion provider types before
 * initialization, see setAllowedFusionProviders().
 *
 * \note This function may only be called after Vuforia::init() has successfully
 * completed.
 *
 * \returns The currently used Fusion provider (one of FUSION_PROVIDER_TYPE), or
 * FUSION_PROVIDER_INVALID_OPERATION if Vuforia::init() has not yet been called.
 */
FUSION_PROVIDER_TYPE VUFORIA_API getActiveFusionProvider();

/// Set a configuration hint for the %Vuforia SDK.
/**
 *  Hints help the SDK to understand the developer's needs.
 *
 *  Depending on the device or SDK version, certain hints might be ignored.
 *
 *  \param hint The hint to set (see HINT for possible values).
 *  \param value The value for the hint. For boolean values, pass 1 for true and
 *  0 for false.a
 *  \returns true if the hint was set successfully, or false if the hint is
 *  unknown or deprecated.
 */
bool VUFORIA_API setHint(unsigned int hint, int value);

/// Registers an UpdateCallback instance to be notified when %Vuforia is updated.
/**
 * The passed-in object's Vuforia_onUpdate() function will be called with a new
 * State instance as soon as Vuforia finishes processing a new camera frame.
 *
 * You should only use this callback for time-critical operations on the frame,
 * or to perform operations which need to be synchronized to the camera thread
 * (e.g. activating and deactivating DataSet instances on an ObjectTracker).
 *
 * You should avoid doing any processor intensive work here. The callback is
 * called on the camera thread, which means that %Vuforia's tracking
 * pipeline will be blocked from further execution until the callback returns.
 *
 * For normal use cases, you should use the pull interface to access State
 * instances as part of your rendering loop. See State and StateUpdater for more
 * information.
 *
 * Only one callback object can be registered. Calling registerCallback() a
 * second time replaces the existing callback object.
 *
 * \param object The object that should receive update callbacks.
 */
void VUFORIA_API registerCallback(UpdateCallback* object);


/// Enable or disable specific pixel formats for the Frame returned by State::getFrame().
/**
 * Images in the enabled pixel formats will be available in the list of images
 * returned by Frame::getImages().
 *
 * By default, the Frame returned by State::getFrame() contains images in
 * whichever pixel formats are required for internal processing. For example,
 * image tracking requires a grayscale image, so if you are doing image tracking
 * the Frame returned by getFrame() will typically include a grayscale image.
 *
 * If you need a specific format for the frame data (if you are doing your own
 * processing on the image), you can use setFrameFormat() to request this format.
 *
 * \note Requesting a specific pixel format may induce additional processing
 * overhead in some cases.
 *
 * \param format The pixel format that you want for frames returned by
 * State::getFrame().
 * \param enabled true to enable the format, false to disable it.
 * \returns true if the pixel format was enabled, false otherwise (check
 * application logs for failure details).
 */
bool VUFORIA_API setFrameFormat(PIXEL_FORMAT format, bool enabled);

/// Get the number of bits required to store a single pixel in the given format.
/**
 * \param format The format to query.
 * \returns The bits per pixel for the given format, or 0 if the format is unknown.
 */
int VUFORIA_API getBitsPerPixel(PIXEL_FORMAT format);

/// Get whether the rendering surface should be configured with an alpha channel.
bool VUFORIA_API requiresAlpha();

/// Get the number of bytes required for a particular image buffer.
/**
 * \param width The width of the image, in pixels.
 * \param height The height of the image, in pixels.
 * \param format The pixel format that will be used to store the image.
 * \returns The number of bytes required for the specified image buffer, or 0 if
 * the format is unknown.
 */
int VUFORIA_API getBufferSize(int width, int height, PIXEL_FORMAT format);

/// Execute %Vuforia-specific lifecycle management tasks when the app is resumed.
/**
 * \note
 * Only has effect if %Vuforia is initialized. See init() for a discussion of
 * the full %Vuforia lifecycle.
 *
 * Call when
 *     - an application has been started or just come back from the background
 *     - an application is already active and %Vuforia has just been initialized
 *     with init()
 *
 * Executes the following internal tasks:
 *     - enables rendering
 *     - applies device-specific internal AR settings (e.g. camera resolution,
 *     sensor rate)
 *     - restarts all motion sensors used by %Vuforia if previously running
 *     - resumes a previously active EyewearDevice (e.g. activates last display
 *     mode, starts
 *       pose prediction)
 */
void VUFORIA_API onResume();

/// Execute %Vuforia-specific lifecycle management tasks when the app is paused.
/**
 * \note
 * Only has effect if %Vuforia is initialized. See init() for a discussion of
 * the full %Vuforia lifecycle.
 *
 * Call when
 *     - an application is about to become inactive (e.g. going to background)
 *     - an application is still active (won't go to background or be stopped)
 *     and %Vuforia
 *       is about to be deinitialized with deinit()
 *
 * Executes the following internal tasks:
 *     - disables rendering
 *     - stops all currently running motion sensors used by %Vuforia
 *     - pauses an active EyewearDevice (e.g. switches display mode to mono,
 *     pauses pose prediction)
 */
void VUFORIA_API onPause();

/// Inform %Vuforia that the rendering surface has been created.
/**
 * \note
 * Only has effect if %Vuforia is initialized. See init() for a discussion of
 * the full %Vuforia lifecycle.
 *
 * \note
 * This function must be called on the rendering thread, with any platform- or
 * device-specific rendering context activated.
 *
 * \note
 * Calling this function changes the RenderingPrimitives returned by
 * Device::getRenderingPrimitives(). If you have a cached copy of the
 * RenderingPrimitives, you will need to call Device::getRenderingPrimitives()
 * again to get an updated copy.
 *
 * You should call this function when the rendering surface/context first becomes
 * available.
 *
 * Executes the following internal tasks:
 *     - creates some %Vuforia-internal rendering resources
 *     - applies target rendering frame rate (i.e. the frame rate set by
 *     Renderer::setTargetFps() or a default frame rate if Renderer::setTargetFps()
 *     has not been called)
 */
void VUFORIA_API onSurfaceCreated();

/// Inform %Vuforia about the size of the rendering surface, or that its size has changed.
/**
 * You should call this function once after the rendering surface/context has
 * been created for the first time, and again whenever the render surface changes
 * size (e.g. due to you app changing orientation, or a window resize event).
 *
 * \note
 * This function must be called on the rendering thread, with any platform- or
 * device-specific rendering context activated. It only has effect if %Vuforia
 * is initialized.
 *
 * Executes the following internal tasks:
 *     - releases any previously created %Vuforia-internal rendering resources.
 *     - triggers a configuration change in the %Vuforia Device that (among other
 *     things) enables getRenderingPrimitives() to return valid data for the
 *     current rendering surface.
 *
 * \note
 * RenderingPrimitives instances obtained via Device::getRenderingPrimitives()
 * will not contain valid data for the current rendering surface unless
 * onSurfaceChanged() has been called first.
 *
 */
void VUFORIA_API onSurfaceChanged(int width, int height);

/// Get the version of the %Vuforia SDK as a C-style string.
VUFORIA_API const char* getLibraryVersion();

/// Set parameters to enable or disable the use of a Vuforia Driver library
/**
 * Sets up the name of the library that %Vuforia loads dynamically and uses
 * as an external source of camera or other input data.
 * The library must support the %Vuforia Driver API and it must be placed
 * inside the app package to be loaded properly.
 * The exact path depends on the platform:
 * - Android: [apk-root-dir]/lib/[architecture]/library.so
 * - UWP: [appx-root-dir]/library.dll
 *
 * This function MUST be called before Vuforia::init() to have any effect. Once the
 * library name has been set and Vuforia::init() is called, %Vuforia will try to
 * initialize and use the functionality provided by the Driver.
 *
 * To disable the Vuforia Driver functionality the following must be done:
 * - Call Vuforia::deinit()
 * - Call Vuforia::setDriverLibrary() with nullptr or empty string
 * as the libraryName.
 * - Call Vuforia::init()
 *
 * \note This functionality is currently only supported on Android and UWP platforms.
 *
 * \param libraryName Full file name of the Vuforia Driver library. This must be a null 
 * terminated string with a maximum length of 255 characters. Setting
 * it to nullptr or empty string, will disable the use of the Vuforia Driver
 * functionalty during subsequent calls to Vuforia::init().
 * \param userData Arbitrary user defined data to be passed into the library,
 * when it gets loaded. %Vuforia only forwards the data and doesn't process it
 * in any way.
 * \returns true if %Vuforia was in uninitialized state and the parameter was therefore
 * set successfully.
 */
bool VUFORIA_API setDriverLibrary(const char* libraryName, void* userData);

} // namespace Vuforia

#endif //_VUFORIA_VUFORIA_H_
