/*==============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    EyewearCalibrationProfileManager.h

\brief
    Header file for EyewearCalibrationProfileManager class.
==============================================================================*/

#ifndef _VUFORIA_EYEWEAR_CALIBRATION_PROFILE_MANAGER_H_
#define _VUFORIA_EYEWEAR_CALIBRATION_PROFILE_MANAGER_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/EyeID.h>

namespace Vuforia
{

/// Functionality to manage calibration profiles for see-through eyewear devices.
/**
 * AR calibration for see-through devices is specific to the user and device.
 * This class provides functionality to manage multiple user calibration profiles.
 *
 * Calibration profiles are identified by an integer ID. A default profile always
 * exists, and has the fixed profile ID 0. User-defined profiles have IDs in the
 * range 1..getMaxCount() inclusive.
 *
 * setActiveProfile() sets the currently active profile, which in turn affects
 * the values returned when calling various functions in RenderingPrimitives.
 */
class VUFORIA_API EyewearCalibrationProfileManager : private NonCopyable
{
public:

    /// Get the maximum number of user calibration profile slots available for use.
    /**
     *  At present the SDK supports a maximum of 10 user profiles. This may
     *  change in future SDK releases.
     */
    virtual size_t getMaxCount() const = 0;

    /// Get the number of user calibration profiles stored.
    /**
     *  Use this method when building a profile selection UI to get the number of
     *  profiles that the user can select from.
     *
     * \returns The number of profile slots in use.
     */
    virtual size_t getUsedCount() const = 0;

    /// Get whether the specified profile slot contains data.
    /**
     * \param profileID The ID of the profile in the range 1..getMaxCount().
     */
    virtual bool isProfileUsed(const int profileID) const = 0;

    /// Get the ID of the active user calibration profile.
    /**
     *  Returns a number between 0..getMaxCount(). (0 is the default built-in profile.)
     */
    virtual int getActiveProfile() const = 0;

    /// Set a calibration profile as active.
    /**
     *  \param profileID The ID of the profile, in the range 1..getMaxCount().
     *  \returns true if the active profile has been set successfully, false
     *  otherwise (e.g. if the specified profile is not valid).
     */
    virtual bool setActiveProfile(const int profileID) = 0;
    
    /// Get the Camera-to-Eye transformation matrix for the specified profile and eye.
    /**
     * \param profileID The profile ID to use, in the range 0..getMaxCount(). To
     * retrieve the default, pass 0.
     * \param eyeID The eye that you want the transformation matrix for. Valid
     * values are EYEID_MONOCULAR, EYEID_LEFT and EYEID_RIGHT.
     * \returns The camera-to-eye matrix for the requested profile and eye, or a
     * matrix containing all zeros if the requested profileID is not in use.
     */
    virtual Matrix34F getCameraToEyePose(
        const int profileID, const EYEID eyeID) const = 0;

    /// Get the eye projection matrix for the specified profile and eye.
    /**
     * \param profileID The profile ID to use, in the range 0..getMaxCount(). To
     * retrieve the default, pass 0.
     * \param eyeID The eye that you want the projection matrix for. Valid values
     * are EYEID_MONOCULAR, EYEID_LEFT and EYEID_RIGHT.
     * \returns The projection matrix for the requested profile and eye, or a
     * matrix containing all zeros if the requested profileID is not in use.
     */
    virtual Matrix34F getEyeProjection(
        const int profileID, const EYEID eyeID) const = 0;

    /// Set the Camera-to-Eye transformation matrix for the specified profile and eye.
    /**
     *  The units used to specify the offset part of the matrix should be the same
     *  as those used to define the calibration target size (usually meters).
     *
     * \param profileID The profile ID to write data to, in the range 0..getMaxCount().
     * \param eyeID The eye to set the transformation matrix for. Valid values are
     * EYEID_MONOCULAR, EYEID_LEFT and EYEID_RIGHT.
     * \param cameraToEyePose The Camera-to-Eye transformation matrix to be stored.
     * \returns true on success, otherwise false (check application logs for failure
     * details).
     */
    virtual bool setCameraToEyePose(
        const int profileID, const EYEID eyeID,
        const Matrix34F& cameraToEyePose) = 0;

    /// Set the eye projection matrix for the specified profile and eye.
    /**
     * The transformation measurement unit should be the same as the one used
     * to define the calibration target size (usually meters).
     *
     * \param profileID a number between 0 and getMaxCount().
     * \param eyeID the Eye to retrieve the projection matrix for, one of
     * EYEID_MONOCULAR, EYEID_LEFT or EYEID_RIGHT.
     * \param eyeProjection The eye projection matrix to store.
     * \returns true on success, false otherwise.
     */
    virtual bool setEyeProjection(
        const int profileID, const EYEID eyeID,
        const Matrix34F& eyeProjection) = 0;

    /// Get the display name associated with a profile.
    /**
     * \returns a unicode string, or an empty string if no display name has
     * been provided for the specified profile.
     */
    virtual const UInt16* getProfileName(const int profileID) const = 0;

    /// Set a display name associated with a profile.
    virtual bool setProfileName(const int profileID, const UInt16* name) = 0;

    /// Delete all stored data for the specified profile.
    /**
     * If the specified profile was the active profile then the default
     * profile becomes active.
     */
    virtual bool clearProfile(const int profileID) = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_EYEWEAR_CALIBRATION_PROFILE_MANAGER_H_
