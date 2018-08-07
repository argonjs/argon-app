/*===============================================================================
Copyright (c) 2015-2016,2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    TargetSearchResult.h

\brief
    Header file for TargetSearchResult class.
===============================================================================*/

#ifndef _VUFORIA_TARGET_SEARCH_RESULT_H_
#define _VUFORIA_TARGET_SEARCH_RESULT_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

/// A search result returned from a TargetFinder.
class TargetSearchResult : private NonCopyable
{
public:

    /// Get the name of the target.
    virtual const char* getTargetName() const = 0;

    /// Get the system-wide unique id of the target.
    virtual const char* getUniqueTargetId() const = 0;

    /// Get the width of the target (in meters).
    virtual const float getTargetSize() const = 0;

    /// Get the meta data string associated with this target.
    /**
     * If tracking on this target is enabled via TargetFinder::enableTracking(),
     * this string will be available via ImageTarget::getMetaData() on the
     * associated ImageTarget.
     */
    virtual const char* getMetaData() const = 0;

    /// Get the tracking quality rating for this target.
    /**
     * \returns An integer in the range 0..5 that reflects the expected tracking
     * quality of this target. A low quality rating indicates that tracking may
     * by poor or unstable for this target.
     */
    virtual unsigned char getTrackingRating() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_TARGET_SEARCH_RESULT_H_
