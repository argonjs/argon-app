/*==============================================================================
Copyright (c) 2015-2017 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file
PositionalDeviceTracker.h

@brief
Header file for PositionalDeviceTracker class.
==============================================================================*/
#ifndef _VUFORIA_POSITIONAL_DEVICE_TRACKER_H_
#define _VUFORIA_POSITIONAL_DEVICE_TRACKER_H_

#include <Vuforia/DeviceTracker.h>

namespace Vuforia
{

// Forward declarations
class Anchor;
class HitTestResult;

/// PositionalDeviceTracker class.
/**
 *  The PositionalDeviceTracker tracks a device in the world based 
 *  on the environment. It doesn't require target to estimate 
 *  the device's position. The position is returned as a 6DOF pose. 
 */
class VUFORIA_API PositionalDeviceTracker : public DeviceTracker
{
public:
    /// Returns the Tracker class' type
    static Type getClassType();

    /// Create a named Anchor at the given world pose.
    /**
     * \param name The unique name of the Anchor.
     * \param pose Matrix specifying the world pose of the Anchor.
     *
     * \return The created Anchor if successful or NULL on failure.
     *
     * NOTE: The returned Anchor will be managed internally by the PositionalDeviceTracker and should never
     *       be explicitly deleted but can be destroyed with a call to 'destroyAnchor'. A call to 'stop'
     *       will invalidate all Anchors. Accessing the pointer after these calls results in undefined 
     *       behavior.
     *       On non-ARKit devices an Anchor from hit test result is required first to initialize 
     *       DeviceTracker. For platform independent behavior we recommend to always start with an Anchor
     *       from hit test first.
     */
    virtual Anchor* createAnchor(const char* name, const Matrix34F& pose) = 0;

    /// Create a named Anchor using the result of a hit test from SmartTerrain.
    /**
     * \param name The unique name of the Anchor.
     * \param hitTestResult The hit test result from SmartTerrain.
     *
     * \return The created Anchor if successful or NULL on failure.
     *
     * NOTE: The returned Anchor will be managed internally by the PositionalDeviceTracker and should never
     *       be explicitly deleted but can be destroyed with a call to 'destroyAnchor'. A call to 'stop'
     *       will invalidate all Anchors. Accessing the pointer after these calls results in undefined
     *       behavior.
     */
    virtual Anchor* createAnchor(const char* name, const HitTestResult& hitTestResult) = 0;

    /// Destroys the specified Anchor.
    /**
     * Destroys the given Anchor by deleting it and cleans up all internal resources associated to it.
     * Accessing the pointer after this call results in undefined behavior.
     *
     * \param Anchor The Anchor to destroy.
     *
     * \return True if destroyed successfully, false if the Anchor is invalid (e.g. null).
     */
    virtual bool destroyAnchor(Anchor* anchor) = 0;

    /// Get the number of Anchors currently managed by the PositionalDeviceTracker.
    /**
     * \return The number of Anchors.
     */
    virtual int getNumAnchors() const = 0;

    /// Get the Anchor at the specified index.
    /**
     * \param idx The index of the Anchor.
     *
     * \return The Anchor instance for the given index or nullptr if the index is invalid.
     */
    virtual Anchor* getAnchor(int idx) = 0;
};


} // namespace Vuforia

#endif //_VUFORIA_POSITIONAL_DEVICE_TRACKER_H_
