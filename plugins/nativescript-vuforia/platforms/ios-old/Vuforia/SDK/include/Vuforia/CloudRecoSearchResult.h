/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    CloudRecoSearchResult.h

\brief
    Header file for CloudRecoSearchResult class.
===============================================================================*/

#ifndef _VUFORIA_CLOUD_RECO_SEARCH_RESULT_H_
#define _VUFORIA_CLOUD_RECO_SEARCH_RESULT_H_

// Include files
#include <Vuforia/TargetSearchResult.h>

namespace Vuforia
{

/// A search result returned from a TargetFinder initialized as cloud-based image recognition search
class VUFORIA_API CloudRecoSearchResult : public TargetSearchResult
{
public:

    /// Get the Type for class 'CloudRecoSearchResult'.
    static Type getClassType();

    /// Returns the width of the target (in 3D scene units). (DEPRECATED)
    /**
    * \deprecated This method has been deprecated. It will be removed in an
    * upcoming %Vuforia release.
    */
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

#endif //_VUFORIA_CLOUD_RECO_SEARCH_RESULT_H_
