/*==============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
PositionalDeviceTracker.h

\brief
Header file for PositionalDeviceTracker class.
==============================================================================*/

#ifndef _VUFORIA_POSITIONAL_DEVICE_TRACKER_H_
#define _VUFORIA_POSITIONAL_DEVICE_TRACKER_H_

#include <Vuforia/DeviceTracker.h>
#include <Vuforia/List.h>

namespace Vuforia
{

// Forward declarations
class Anchor;
class HitTestResult;

/// A type of DeviceTracker that tracks the world-relative position and rotation of the device.
/**
 * The PositionalDeviceTracker tracks the device in the world based on the
 * environment.
 *
 * While this Tracker is running, the device's position and rotation are made
 * available on the State class as a DeviceTrackableResult containing a 6DOF
 * pose, specified in meters in the world coordinate system. The origin of the
 * world coordinate system corresponds to the position and orientation of the
 * device when tracking starts.
 *
 * \par Extended Tracking
 *
 * PositionalDeviceTracker also provides extended tracking functionality. As long
 * as the PositionalDeviceTracker is running, previously detected Trackables will
 * continue to report poses via the State class, even if they are no longer visible
 * in the device's camera.
 *
 * This assumes that the Trackable remains static relative to the user's environment.
 * If the Trackable is moved while it is out of view of the camera, its pose will
 * snap to its new location once it comes back into view of the camera and %Vuforia
 * re-detects it. For some Trackables, the detection distance may be closer than
 * the tracking distance. You may need to move the camera closer than expected
 * to the Trackable so that it updates its pose after it has moved.
 *
 * You can use TrackableResult::getStatus() to determine whether a Trackable is
 * being tracked directly or using extended tracking.
 *
 * \par Initialization
 *
 * The PositionalDeviceTracker may need some extra manual initialization steps
 * on some devices, depending on the active Fusion provider (as returned by
 * Vuforia::getActiveFusionProvider()).
 *
 * - For FUSION_PROVIDER_PLATFORM_SENSOR_FUSION (which is the default for iOS
 * devices that support ARKit, Android devices that support ARCore, and UWP
 * devices that support Windows Holographic), the PositionalDeviceTracker
 * will be initialized automatically.
 *
 * - For FUSION_PROVIDER_VUFORIA_SENSOR_FUSION, the PositionalDeviceTracker cannot
 * fully initialize on its own. You need to either a) detect and track an
 * ObjectTarget, or b) call createAnchor(const char*, const HitTestResult&) with
 * a hit test result obtained from SmartTerrain.
 *
 * - For FUSION_PROVIDER_VUFORIA_VISION_ONLY, you need to initialize the
 * PositionalDeviceTracker by detecting and tracking an ObjectTarget.
 */
class VUFORIA_API PositionalDeviceTracker : public DeviceTracker
{
public:

    /// Get the Type for class 'PositionalDeviceTracker'.
    static Type getClassType();

    /// Create a named Anchor with a particular world position and rotation.
    /**
     * This method creates an Anchor at an arbitrary position and orientation
     * in the world.
     *
     * Depending on the active Fusion provider (see
     * Vuforia::getActiveFusionProvider()), tracking of Anchors created with this
     * method may be poor under certain conditions. For this reason, it is
     * recommended that you only create Anchors using
     * createAnchor(const char*, const HitTestResult&), rather than using this
     * method. If you want to render something at an arbitrary position in the
     * world, for example floating in the air, create a hit-test-based Anchor and
     * then apply an offset transform in your application logic.
     *
     * For platform-independent behavior, you should always create the first
     * anchor from a HitTestResult.
     *
     * To destroy an Anchor, call destroyAnchor(). Do not delete the pointer
     * yourself. A call to stop() invalidates (destroys) all Anchors. Do not access
     * the returned pointer after calling stop().
     *
     * \note Creating anchors is not supported if the active Fusion provider is
     * FUSION_PROVIDER_VUFORIA_VISION_ONLY (see Vuforia::getActiveFusionProvider()).
     *
     * \note If the active Fusion provider is FUSION_PROVIDER_VUFORIA_SENSOR_FUSION,
     * extra steps are required to fully initialize the PositionalDeviceTracker
     * before using this method. See the <b>Initialization</b> section in the class
     * documentation above for more details.
     *
     * \note When using FUSION_PROVIDER_VUFORIA_SENSOR_FUSION, reported Anchor
     * poses may fluctuate at first, until %Vuforia has learned enough about
     * the environment to provide a stable pose estimate. This typically takes
     * a few seconds after creating the first Anchor from a HitTestResult, depending
     * on how the user moves their device.
     *
     * \note When using FUSION_PROVIDER_VUFORIA_SENSOR_FUSION, Anchors created with
     * this method are not guaranteed to receive any further position updates after
     * the device tracker recovers from a limited tracking state.
     *
     * \param name The name for the new anchor.
     * \param pose The pose (position and orientation) for the anchor.
     *
     * \returns The newly created anchor, or NULL on failure (check application
     * log for details).
     */
    virtual Anchor* createAnchor(const char* name, const Matrix34F& pose) = 0;

    /// Create a named Anchor using the result of a hit test from a SmartTerrain.
    /**
     * This method is the preferred way to attach augmentations to arbitrary points
     * in the user's environment. If you need the augmentation to appear somewhere
     * other than the surface of the plane detected by the hit test, apply an offset
     * transform in your application logic.
     *
     * To destroy an Anchor, call destroyAnchor(). Do not delete the pointer
     * yourself. A call to stop() invalidates (destroys) all Anchors. Do not access
     * the returned pointer after calling stop().
     *
     * \note When using FUSION_PROVIDER_VUFORIA_SENSOR_FUSION, reported Anchor
     * poses may fluctuate initially until %Vuforia has learned enough about
     * the environment to provide a stable pose estimate (typically until a
     * few seconds after creating the first Anchor from a HitTestResult, depending
     * on how the user moves their device).
     *
     * \param name The name for the new Anchor.
     * \param hitTestResult a HitTestResult as returned from SmartTerrain::hitTest().
     * The HitTestResult must not have been already used to create an Anchor.
     * \returns The newly created Anchor, or NULL on failure (check application
     * log for details).
     *
     */
    virtual Anchor* createAnchor(const char* name, const HitTestResult& hitTestResult) = 0;

    /// Destroy the given Anchor.
    /**
     * Deletes the given Anchor and cleans up all associated internal resources.
     *
     * Do not access the pointer after calling this method.
     *
     * \returns true if destroyed successfully, false if the Anchor is invalid
     * (e.g. null).
     */
    virtual bool destroyAnchor(Anchor* anchor) = 0;

    /// Get the number of Anchors currently managed by the PositionalDeviceTracker.
    /// (DEPRECATED)
    /**
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getAnchors() API instead.
     */
    virtual int getNumAnchors() const = 0;

    /// Get the Anchor at the specified index. (DEPRECATED)
    /**
     * \param idx The index, in the range 0..getNumAnchors() - 1.
     * \returns the requested Anchor instance, or NULL if the index is out of
     * bounds.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getAnchors() API instead.
     */
    virtual Anchor* getAnchor(int idx) = 0;

    /// Get the list of anchors.
    virtual List<Anchor> getAnchors() const = 0;

    /// Reset the tracker.
    /**
     * Calling this function invalidates (destroys) all Anchors. Do not hold on to
     * any existing Anchor pointers after calling this function.
     * 
     * \note On some platforms a new world origin will be defined at the device's
     * current position and orientation.
     *
     * \note On some platforms the underlying Vuforia Fusion provider may also
     * be reset.
     *
     * \returns true if the tracker was successfully reset, otherwise false (check
     * application logs for failure details).
     */
    virtual bool reset() = 0;

};

} // namespace Vuforia

#endif //_VUFORIA_POSITIONAL_DEVICE_TRACKER_H_
