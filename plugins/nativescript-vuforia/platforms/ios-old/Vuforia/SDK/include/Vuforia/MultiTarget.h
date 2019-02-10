/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    MultiTarget.h

\brief
    Header file for MultiTarget class.
===============================================================================*/

#ifndef _VUFORIA_MULTITARGET_H_
#define _VUFORIA_MULTITARGET_H_

// Include files
#include <Vuforia/Trackable.h>
#include <Vuforia/ObjectTarget.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/List.h>

namespace Vuforia
{

// Forward declarations
struct Matrix34F;

/// A type of ObjectTarget that represents an object constructed from multiple component Trackables.
/**
 * A MultiTarget is useful when you want to construct a Trackable using multiple
 * component Trackables arranged in a fixed spatial relationship to each other.
 *
 * To build a MultiTarget, you typically initialize and load a DataSet containing
 * the Trackables you want to combine (usually ImageTargets), then call
 * DataSet::createMultiTarget() to get a new MultiTarget object. Loop through
 * the Trackables using DataSet::getTrackable() and add them to the new MultiTarget
 * using addPart(), calling setPartOffset() to define the offset (position and
 * rotation) for each added Trackable.
 *
 * For example, suppose you want to be able to recognise and track a cereal box.
 * You also want to be able to initialize the tracking from both sides of the
 * box - it shouldn't matter if the front or the back of the box is facing the
 * user, your application should be able to recognise and track both sides.
 *
 * You would need to start by building two ImageTargets, one to track the front
 * side of the box, and another to track the back side. Normally, you would need
 * to track both of the ImageTargets separately in your application. But if you
 * build a MultiTarget and use addPart() and setPartOffset() to define a spatial
 * relationship between the two targets that matches the spatial relationship of
 * the front and back sides of your real-world cereal box, %Vuforia takes care
 * of tracking both of the ImageTargets as one, and returns
 * <span>TrackableResult</span>s as though you had just a single Trackable.
 *
 * \note
 * It is not possible to modify a MultiTarget while its DataSet is active.
 * See the DataSet class for more information.
 *
 */
class VUFORIA_API MultiTarget : public ObjectTarget
{
public:

    /// Get the Type for class "MultiTarget".
    static Type getClassType();

    /// Get the number of <span>Trackable</span>s that make up this MultiTarget. (DEPRECATED)
    /**
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getParts() API instead.
     */
    virtual int getNumParts() const = 0;

    /// Get a Trackable part by index. (DEPRECATED)
    /**
     * \param idx The index of the part to get, in the range 0..getNumParts()-1.
     * \returns The requested part, or NULL if the requested index is out of range.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getParts() API instead.
     */
    virtual Trackable* getPart(int idx) = 0;

    /// Get a Trackable part by index. (DEPRECATED)
    /**
     * \param idx The index of the part to get, in the range 0..getNumParts()-1.
     * \returns The requested part, or NULL if the requested index is out of range.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getParts() API instead.
     */
    virtual const Trackable* getPart(int idx) const = 0;

    /// Returns the list of Trackables that form the MultiTarget.
    virtual List<Trackable> getParts() = 0;

    /// Provides read-only access to the list of Trackables that form the MultiTarget.
    virtual List<const Trackable> getParts() const = 0;

    /// Get a Trackable part by name.
    /**
     * \param name The name of the part to get.
     * \returns The requested part, or NULL of none of the parts of this
     * MultiTarget have the given name.
     */
    virtual Trackable* getPart(const char* name) = 0;

    /// Get a Trackable part by name.
    /**
     * \param name The name of the part to get.
     * \returns The requested part, or NULL of none of the parts of this
     * MultiTarget have the given name.
     */
    virtual const Trackable* getPart(const char* name) const = 0;

    /// Add a Trackable part to this MultiTarget.
    /**
     * The newly-added part defaults to having zero offset (no translation, no
     * rotation). Use the returned index with setPartOffset() to set an offset
     * transform for the new part.
     *
     * This method will fail if the given Trackable has already been added to
     * this MultiTarget, or if the DataSet that owns this MultiTarget is
     * currently active.
     *
     * \param trackable The part to add. It must exist on the DataSet that owns
     * this MultiTarget.
     * \returns The index of the newly added part, or -1 on failure.
     */
    virtual int addPart(Trackable* trackable) = 0;

    /// Remove a Trackable part from this MultiTarget.
    /**
     * \param idx The index of the part to remove, in the range
     * 0..getNumParts()-1.
     * \returns true on success, or false if the requested index is out of range
     * or if the DataSet that owns this MultiTarget is currently active.
     */
    virtual bool removePart(int idx) = 0;

    /// Set the offset transform of a part, relative to the MultiTarget's origin.
    /**
     * If a part has zero offset (i.e. no rotation and no translation,
     * represented by an identity rotation matrix with (0,0,0) translation), the
     * pose of the part will be identical to the pose of the MultiTarget.
     *
     * By default, parts newly-added via addPart() have zero offset.
     *
     * If multiple parts share the same offset, the parts will be co-located.
     *
     * \param idx The index of the part, in the range 0..getNumParts()-1.
     * \param offset The pose of the part, relative to the MultiTarget's origin.
     * \returns true on success, or false if the index is invalid or if the
     * DataSet that owns this MultiTarget is currently active.
     */
    virtual bool setPartOffset(int idx, const Matrix34F& offset) = 0;

    /// Get the offset transform of a part, relative to the MultiTarget's origin.
    /**
     * \param idx The index of the part, in the range 0..getNumParts()-1.
     * \param offset Will be populated with the pose of the part (relative to
     * the MultiTarget's origin) when this method returns.
     * \returns true on success, or false if the requested index is out of range.
     */
    virtual bool getPartOffset(int idx, Matrix34F& offset) const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_MULTITARGET_H_
