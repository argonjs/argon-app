/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    SmartTerrain.h

\brief
    Header file for SmartTerrain class.
===============================================================================*/

#ifndef _VUFORIA_SMARTTERRAIN_H_
#define _VUFORIA_SMARTTERRAIN_H_

// Include files
#include <Vuforia/Tracker.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/List.h>

namespace Vuforia
{

// Forward declarations
class HitTestResult;
class State;

/// A type of Tracker that collects information about the user's environment at runtime.
/**
 * You can use the information collected to make hit tests into the user's environment.
 *
 * The functionality and operation of SmartTerrain is affected by the active Fusion
 * provider (see Vuforia::getActiveFusionProvider()).
 *
 *   - SmartTerrain cannot be used with FUSION_PROVIDER_VUFORIA_VISION_ONLY, and
 *     will therefore fail to start.
 *
 *   - When using FUSION_PROVIDER_VUFORIA_SENSOR_FUSION, calls to hitTest() will
 *     generate results immediately after the SmartTerrain tracker and the camera
 *     have been started. However, the returned results may not accurately reflect
 *     the position of the hit point(s) until the PositionalDeviceTracker has been
 *     allowed enough time to initialize after calling
 *     PositionalDeviceTracker::createAnchor(const char*, const HitTestResult&).
 *     This typically takes a few seconds, depending on how the user moves
 *     their device. During this time the positions of any created Anchors may
 *     fluctuate. See PositionalDeviceTracker for more details.
 *
 *   - When using FUSION_PROVIDER_PLATFORM_SENSOR_FUSION, no hit test results will
 *     be returned until the underlying platform systems have initialized. This
 *     typically takes a few seconds, depending on how the user moves their device.
 *
 * For cross-platform consistency, you should assume that
 *
 *   - calls to hitTest() might not yield any results for a few seconds, and
 *
 *   - the reported position of an Anchor created from early hit test results
 *     may fluctuate for a few seconds as %Vuforia learns more about the environment.
 */
class VUFORIA_API SmartTerrain : public Tracker
{
public:

    enum HITTEST_HINT
    {
        HITTEST_HINT_NONE,              ///< no hint
        HITTEST_HINT_HORIZONTAL_PLANE,  ///< hit test is performed on a horizontal plane
        HITTEST_HINT_VERTICAL_PLANE     ///< hit test is performed on a vertical plane (not supported yet)
    };

    /// Get the Type for class 'SmartTerrain'.
    static Type getClassType();

    /// Perform a hit test against detected planes in the user's environment. (DEPRECATED)
    /**
     * This function will perform a hit test between a ray and a plane in the
     * world as understood by the SmartTerrain. The ray is cast from the given
     * point on the device's screen (typically from a user tapping the screen).
     * An approximate deviceHeight above an assumed infinite ground plane may be
     * used to provide an estimated ground plane intersection when the available
     * data on the environment is limited. A single hit test may generate multiple
     * results if the ray intersects more than one detected plane.
     *
     * Specific behaviour of the hit test depends on the active Fusion provider
     * (see Vuforia::getActiveFusionProvider())).
     *
     * - When using FUSION_PROVIDER_VUFORIA_SENSOR_FUSION, \p deviceHeight specifies
     * the device's approximate height above an assumed infinite ground plane
     * on which the hit test result may lie; however it will be ignored if an
     * existing (finite, localized) plane from a previous hit test is found
     * along or near to the ray path.
     *
     * - When using FUSION_PROVIDER_PLATFORM_SENSOR_FUSION, \p deviceHeight is
     * ignored and %Vuforia will only return results when the hit test ray
     * intersects actual detected planes in the user's environment.
     *
     * After calling hitTest(), use getHitTestResultCount() and getHitTestResult()
     * to access the internal list of <span>HitTestResult</span>s. Any subsequent
     * calls to hitTest() will destroy and rebuild this list.
     *
     * \note A hit test is bound to a specific State. If you want the results
     * to correspond to the current video frame, be sure to use the same State
     * as you use for rendering the frame.
     *
     * \param state The state to use for doing the hit test.
     * \param point Point in the normalized coordinate space of the camera image
     * retrieved from the State (top left (0,0), bottom right (1,1)) to use as
     * the origin of the ray.
     * \param deviceHeight Height of the device center above ground plane in meters.
     * May be ignored.
     * \param hint A hint about the orientation of the plane in the scene. May be
     * ignored.
     *
     * \deprecated This method has been deprecated. It will be removed in an
     * upcoming %Vuforia release. Use the new hitTest() API returnig a List instead.
     */
    virtual void hitTest(State state, Vec2F point, float deviceHeight, HITTEST_HINT hint) = 0;

    /// Performs hit test.
    /**
     * This function will perform a hit test between a ray and a plane in the
     * world as understood by the SmartTerrain. The ray is cast from the given
     * point on the device's screen (typically from a user tapping the screen).
     * An approximate deviceHeight above an assumed infinite ground plane may be
     * used to provide an estimated ground plane intersection when the available
     * data on the environment is limited. A single hit test may generate multiple
     * results if the ray intersects more than one detected plane.
     *
     * Specific behaviour of the hit test depends on the active Fusion provider
     * (see Vuforia::getActiveFusionProvider())).
     *
     * - When using FUSION_PROVIDER_VUFORIA_SENSOR_FUSION, \p deviceHeight specifies
     * the device's approximate height above an assumed infinite ground plane
     * on which the hit test result may lie; however it will be ignored if an
     * existing (finite, localized) plane from a previous hit test is found
     * along or near to the ray path.
     *
     * - When using FUSION_PROVIDER_PLATFORM_SENSOR_FUSION, \p deviceHeight is
     * ignored and %Vuforia will only return results when the hit test ray
     * intersects actual detected planes in the user's environment.
     *
     * \note A hit test is bound to a specific State. If you want the results
     * to correspond to the current video frame, be sure to use the same State
     * as you use for rendering the frame.
     *
     * \param state The state to use for doing the hit test.
     * \param point Point in the normalized coordinate space of the camera image
     * retrieved from the State (top left (0,0), bottom right (1,1)) to use as
     * the origin of the ray.
     * \param deviceHeight Height of the device center above ground plane in meters.
     * May be ignored.
     * \param hint A hint about the orientation of the plane in the scene. May be
     * ignored.
     *
     * \returns A list of hit test results produced by the last hit test. Any subsequent
     * calls to hitTest() will invalidate the content of this list.
     */
    virtual List<const HitTestResult> hitTest(Vec2F point, HITTEST_HINT hint, State state, float deviceHeight) = 0;

    /// Get the number of HitTestResults generated by the last call to hitTest(). (DEPRECATED)
    /**
     * \note When using FUSION_PROVIDER_PLATFORM_SENSOR_FUSION (see
     * Vuforia::getActiveFusionProvider())), no hit test results will be returned
     * until the Fusion provider has finished initializing (this typically takes
     * a few seconds, depending on how the user moves their device).
     *
     * \deprecated This method has been deprecated. It will be removed in an
     * upcoming %Vuforia release. Use the new hitTest() API returnig a List instead.
     */
    virtual int getHitTestResultCount() const = 0;

    /// Get a single HitTestResult (as generated by the last call to hitTest()). (DEPRECATED)
    /**
     * \param idx Index of the result to get, in the range 0..getHitTestResultCount()-1
     *
     * \note The returned HitTestResult pointer will be invalidated with the next
     * call to hitTest() or when the SmartTerrain is deinitialized. Do not hold
     * on to this pointer!
     *
     * \deprecated This method has been deprecated. It will be removed in an
     * upcoming %Vuforia release. Use the new hitTest() API returnig a List instead.
     */
    virtual const HitTestResult* getHitTestResult(int idx) const = 0;
};

} // namespace Vuforia

#endif // _VUFORIA_SMARTTERRAIN_H_
