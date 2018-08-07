/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    TargetFinder.h

\brief
    Header file for TargetFinder class.
===============================================================================*/

#ifndef _VUFORIA_TARGET_FINDER_H_
#define _VUFORIA_TARGET_FINDER_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/TargetSearchResult.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

// Forward declarations
class DataSet;
class ImageTarget;

/// A service that retrieves Targets using cloud-based recognition.
class VUFORIA_API TargetFinder : private NonCopyable
{
public:

    /// Status codes returned by init().
    enum
    {
        INIT_DEFAULT = 0,                        ///< Initialization has not started
        INIT_RUNNING = 1,                        ///< Initialization is running
        INIT_SUCCESS = 2,                        ///< Initialization completed successfully
        INIT_ERROR_NO_NETWORK_CONNECTION = -1,   ///< No network connection
        INIT_ERROR_SERVICE_NOT_AVAILABLE = -2    ///< Service is not available
    };

    /// Status codes returned from updateQueryResults() and updateSearchResults().
    enum
    {
        UPDATE_NO_MATCH = 0,                     ///< No matches since the last update
        UPDATE_NO_REQUEST = 1,                   ///< No recognition request since the last update
        UPDATE_RESULTS_AVAILABLE = 2,            ///< New search results have been found
        UPDATE_ERROR_AUTHORIZATION_FAILED = -1,  ///< Credentials are wrong or outdated
        UPDATE_ERROR_PROJECT_SUSPENDED = -2,     ///< The specified project was suspended.
        UPDATE_ERROR_NO_NETWORK_CONNECTION = -3, ///< Device has no network connection
        UPDATE_ERROR_SERVICE_NOT_AVAILABLE = -4, ///< Server not found, down or overloaded.
        UPDATE_ERROR_BAD_FRAME_QUALITY = -5,     ///< Low frame quality has been continuously observed
        UPDATE_ERROR_UPDATE_SDK = -6,            ///< SDK Version outdated.
        UPDATE_ERROR_TIMESTAMP_OUT_OF_RANGE = -7,///< Client/Server clocks too far away.
        UPDATE_ERROR_REQUEST_TIMEOUT = -8        ///< No response to network request after timeout.
    };

    /// Filter modes for updateQueryResults() and updateSearchResults().
    enum
    {
        FILTER_NONE = 0,              ///< No results are filtered, all successful queries are returned
        FILTER_CURRENTLY_TRACKED = 1  ///< Filter out targets that are currently being tracked (Most Common)
    };

    /// Start initialization of the cloud-based recognition system.
    /**
     * Initialization of the cloud-based recognition system requires a network
     * connection, and runs asynchronously.
     *
     * Use getInitState() to query the initialization progress and result.
     *
     * \param userAuth User name for logging in to the visual search server
     * \param secretAuth User secret for logging in to the visual search server
     */
    virtual bool startInit(const char* userAuth, const char* secretAuth) = 0;

     /// Get the current state of the initialization process.
    /**
     * \returns one of the INIT_* values from the enum above.
     */
    virtual int getInitState() const = 0;

    /// Block the current thread until initialization is completed.
    virtual void waitUntilInitFinished() = 0;

    /// Deinitialize the cloud-based recognition system.
    virtual bool deinit() = 0;

    /// Start cloud-based visual recognition.
    /**
     * Starts continuous recognition of Targets from the cloud.
     *
     * Use updateQueryResults() to retrieve search matches.
     */
    virtual bool startRecognition() = 0;

    /// Stop cloud-based visual recognition.
    virtual bool stop() = 0;

    /// Get whether the TargetFinder is currently awaiting the results of a query.
    virtual bool isRequesting() const = 0;

    /// Update visual search results.
    /**
     *  Clears and rebuilds the list of TargetSearchResults with results found
     *  since the last call to updateSearchResults(). Use getResultCount() and
     *  getResult() to retrieve the contents of the list.
     *
     *  Search results are owned by the TargetFinder. Each call to
     *  updateSearchResults() invalidates all previously obtained results.
     *
     *  %Vuforia can optionally exclude targets that are already enabled for
     *  tracking (see enableTracking()) from the returned list of results. This
     *  behaviour is controlled by the filter parameter.
     *
     *  If a target or its meta data has been modified on the server since it was
     *  last enabled for tracking, it will be included in the results even if
     *  FILTER_CURRENTLY_TRACKED is passed to this method.
     *
     *  \param filter FILTER_CURRENTLY_TRACKED to exclude from the list of results
     *  all targets that are already being tracked by %Vuforia, or FILTER_NONE
     *  to return all targets regardless of whether or not they are being tracked.
     *  \returns UPDATE_RESULTS_AVAILABLE if new search results have been found,
     *  or one of the other UPDATE_* enum values in any other case.
     */
    virtual int updateSearchResults(int filter = FILTER_CURRENTLY_TRACKED) = 0;

    /// Get the number of visual search results.
    virtual int getResultCount() const = 0;

    /// Get one of the search results.
    /**
     *  Search results are owned by the TargetFinder. Each call to
     *  updateSearchResults() destroys and rebuilds the internal list of
     *  TargetSearchResults.
     */
    virtual const TargetSearchResult* getResult(int idx) = 0;

    /// Enable a search result for tracking.
    /**
     *  Creates an ImageTarget for local detection and tracking of a detected target.
     *
     *  The pose of this target will be included in State::getTrackableResults().
     *
     *  \note For performance and/or memory management reasons, calling this
     *  function may result in the disabling and destruction of a previously
     *  created ImageTarget. For this reason you should only hold on to the
     *  returned ImageTarget pointer at most until the next call to
     *  enableTracking().
     *
     *  \param result The search result that you want to start tracking.
     *  \returns The newly created ImageTarget, or NULL if the target could not be
     *  enabled for tracking (check application logs for failure details).
     */
    virtual ImageTarget* enableTracking(const TargetSearchResult& result) = 0;

    /// Disable tracking on all previously-enabled search results.
    /**
     * Disable and destroy all of the ImageTargets created via enableTracking().
     */
    virtual void clearTrackables() = 0;

    /// Get the number of targets currently enabled for tracking.
    virtual int getNumImageTargets() const = 0;

    /// Get one of the targets currently enabled for tracking.
    virtual ImageTarget* getImageTarget(int idx) = 0;

};

} // namespace Vuforia

#endif //_VUFORIA_TARGET_FINDER_H_
