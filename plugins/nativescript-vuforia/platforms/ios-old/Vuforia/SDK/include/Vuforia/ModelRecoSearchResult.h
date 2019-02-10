/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ModelRecoSearchResult.h

\brief
    Header file for ModelRecoSearchResult class.
===============================================================================*/

#ifndef _VUFORIA_MODEL_RECO_SEARCH_RESULT_H_
#define _VUFORIA_MODEL_RECO_SEARCH_RESULT_H_

// Include files
#include <Vuforia/TargetSearchResult.h>

namespace Vuforia
{

/// A search result returned from a TargetFinder initialized as model recognition search
class VUFORIA_API ModelRecoSearchResult : public TargetSearchResult
{
public:

    /// Get the Type for class 'ModelRecoSearchResult'.
    static Type getClassType();

    /// Get the recognition confidence 
    /**
     * \returns A float in the range 0..1 that reflects the confidence of the
     * recognition system that the recognition is correct.
     */
    virtual float getConfidence() const = 0;

    /// Get the guide view name for this result
    /**
     * If you call TargetFinder::enableTracking() passing this ModelRecoSearchResult,
     * this is the name of the guide view that will be active on the ModelTarget.
     */
    virtual const char* getGuideViewName() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_MODEL_RECO_SEARCH_RESULT_H_
