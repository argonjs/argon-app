/*===============================================================================
Copyright (c) 2015-2016,2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    MultiTargetResult.h

\brief
    Header file for MultiTargetResult class.
===============================================================================*/

#ifndef _VUFORIA_MULTITARGETRESULT_H_
#define _VUFORIA_MULTITARGETRESULT_H_

// Include files
#include <Vuforia/ObjectTargetResult.h>
#include <Vuforia/MultiTarget.h>

namespace Vuforia
{

/// Tracking data resulting from tracking a MultiTarget.
class VUFORIA_API MultiTargetResult : public ObjectTargetResult
{
public:

    /// Get the Type for class 'MultiTargetResult'.
    static Type getClassType();

    /// Get the MultiTarget that participated in generating this result.
    virtual const MultiTarget& getTrackable() const = 0;

    /// Get the number of the results that the Trackable parts that make up the MultiTarget generated.
    virtual int getNumPartResults() const = 0;

    /// Get a TrackableResult for a specific part of the MultiTarget.
    /**
     * \param idx The index of the part, in the range 0..getNumPartResults()-1
     * \return A TrackableResult for the requested part, or null if the part is
     * out of range.
     */
    virtual const TrackableResult* getPartResult(int idx) const = 0;
    
    /// Get a TrackableResult for a specific part of the MultiTarget.
    /**
     * \param name The name of the part.
     * \return A TrackableResult for the requested part, or null if the part does
     * not exist.
     */
    virtual const TrackableResult* getPartResult(const char* name) const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_MULTITARGETRESULT_H_
