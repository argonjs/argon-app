/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    DataSet.h

\brief
    Header file for DataSet class.
===============================================================================*/

#ifndef _VUFORIA_DATASET_H_
#define _VUFORIA_DATASET_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/System.h>
#include <Vuforia/Vuforia.h>
#include <Vuforia/List.h>

namespace Vuforia
{

// Forward declarations
class Trackable;
class MultiTarget;
class TrackableSource;


/// A container of data for one or more Trackable instances.
/**
 * A %DataSet stores data for one or more ObjectTarget-derived Trackables (for a
 * full list of applicable types, refer to the inheritance tree diagram
 * for ObjectTarget).
 *
 * Typically, you obtain an empty %DataSet instance from ObjectTracker::createDataSet().
 * Populate the returned %DataSet either using load() with data prepared offline
 * (pairs of .xml and .dat files), or using createTrackable() with data provided
 * at runtime (for example from a camera frame). Once populated, activate the
 * %DataSet using ObjectTracker::activateDataSet().
 *
 * \anchor DataSetActive
 * It is not possible to modify a %DataSet, nor any of the <span>Trackable</span>s
 * which rely on it, while the %DataSet is active.
 *
 * To modify an active %DataSet (e.g. via calls to load(), createTrackable(),
 * destroy()) or to make changes to a Trackable which uses it, you need to do
 * the following:
 * -# Call ObjectTracker::deactivateDataSet() to deactivate the %DataSet.
 * -# Make the desired changes to the %DataSet and/or any of its Trackables.
 * -# Call ObjectTracker::activateDataSet() to activate the %DataSet, which will
 * resume tracking with the new data.
 *
 * To destroy the %DataSet once it is no longer needed, call ObjectTracker::deactivateDataSet()
 * followed by ObjectTracker::destroyDataSet().
 */
class VUFORIA_API DataSet : private NonCopyable
{
public:

    /// Check if a given data set exists on storage media.
    /**
     * A data set on permanent storage media consists of an .xml file and
     * a .dat file, sharing the same file name, in the same folder. This function
     * checks for the existence of a data set that matches this pattern, given
     * an .xml file and a path type.
     *
     * \param path Path and filename of the .xml file. Path handling is controlled
     * by storageType.
     * \param storageType Controls how path to the .xml file should be handled.
     * \returns true if the specified .xml file and a matching .dat file both
     * exist, otherwise false.
     */
    static bool exists(const char* path, STORAGE_TYPE storageType);

    /// Load dataset data from storage media.
    /**
     * During a successful load, one or more Trackable objects will be created
     * from the loaded data. These Trackables can be accessed via getTrackables().
     *
     * Note that loading of data sets may take a significant amount of time, and
     * it is therefore recommended to do this on a background thread.
     *
     * This method cannot be used while the DataSet is active.
     *
     * load() can only be called once on a DataSet. Subsequent calls to load()
     * will remove any existing data and replace it with the newly-loaded data.
     *
     * \param path Path and filename of the .xml file. Path handling is
     * controlled by storageType.
     * \param storageType Controls how the path to the .xml file should be handled.
     * \returns true if the data was loaded successfully, otherwise false.
     */
    virtual bool load(const char* path, STORAGE_TYPE storageType) = 0;

    /// Get the total number of Trackable objects using this data set.
    /// (DEPRECATED)
    /**
     * Trackable instances that are themselves part of other Trackable instances
     * (e.g. an ImageTarget that is part of a MultiTarget) are not counted here.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming %Vuforia release. Use the getTrackables() API instead.
     */
    virtual int getNumTrackables() const = 0;

    /// Get one of the Trackable objects that uses this data set. (DEPRECATED)
    /**
     * Trackable instances that are themselves a part of other Trackable instances
     * (e.g. an ImageTarget that is part of a MultiTarget) are not returned here.
     * To access such instances, use MultiTarget::getPart() instead.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming %Vuforia release. Use the getTrackables() API instead.
     */
    virtual Trackable* getTrackable(int idx) = 0;

    /// Returns a list of trackable objects in this data set.
    /**
     * Trackables that are part of other trackables (e.g. an ImageTarget that
     * is part of a MultiTarget) are not delivered by this method.
     * Such trackables can be accesses via the trackable they are part of.
     * E.g. use MultiTarget::getParts() to access the respective ImageTargets.
     */
    virtual List<Trackable> getTrackables() = 0;

    /// Create a Trackable from the given TrackableSource and register it with this DataSet.
    /**
     * This method can be used to create a new Trackable based on source data
     * acquired at runtime, such as a camera frame (see ImageTargetBuilder
     * for more information.)
     *
     * The returned Trackable will also be included in future calls getTrackables()
     * (unless it is made part of MultiTarget), until either it is destroyed by
     * a call to Destroy(), or the DataSet itself is destroyed via
     * ObjectTracker::destroyDataSet().
     *
     * This method cannot be used while the DataSet is active.
     *
     * \param source The TrackableSource to use when creating the new Trackable.
     * \returns A new Trackable based on the given TrackableSource, or NULL if
     * this DataSet is currently active.
     */
    virtual Trackable* createTrackable(const TrackableSource* source) = 0;

    /// Create a new MultiTarget and register it with this DataSet.
    /**
     * The returned MultiTarget is owned by this DataSet. It will be included
     * in future calls to getNumTrackables() and getTrackable(), until either it
     * is destroyed by a call to Destroy(), or the DataSet itself is destroyed
     * via ObjectTracker::destroyDataSet().
     *
     * This method cannot be used while the DataSet is active.
     *
     * \param name A name for the new MultiTarget
     * \returns A new MultiTarget, or NULL if this DataSet is currently active.
     */
    virtual MultiTarget* createMultiTarget(const char* name) = 0;

    /// Destroy a Trackable.
    /**
     * This method cannot be used while the DataSet is active.
     *
     * \returns true on success, or false on failure (check application logs for
     * failure details).
     */
    virtual bool destroy(Trackable* trackable) = 0;

    /// Check if this DataSet's Trackable capacity is reached.
    /**
     * Each DataSet has a limited number for Trackable instances that it can hold.
     * Use this method to check if this DataSet's capacity has been reached.
     *
     * For example, if you are creating <span>ImageTarget</span>s based on camera
     * frames captured at runtime, you can check this method before calling
     * createTrackable(). If it returns true, you might want to destroy the oldest
     * ImageTarget first, or ask the user what to do.
     *
     * \returns true if the number of Trackables in this DataSet is at maximum
     * capacity, otherwise false.
     */
    virtual bool hasReachedTrackableLimit() = 0;

    /// Check if this dataset is active.
    /**
     * A DataSet is only usable by a Tracker when it is active, but an active
     * DataSet cannot be modified.
     *
     * To activate a DataSet, call ObjectTracker::activateDataSet().
     * To deactivate a DataSet, call ObjectTracker::deactivateDataSet().
     *
     * \returns true if this DataSet is currently active.
     */
    virtual bool isActive() const = 0;

    virtual ~DataSet()  {}
};

} // namespace Vuforia

#endif //_VUFORIA_DATASET_H_
