/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    VuMarkTargetResult.h

\brief
    Header file for VuMarkTargetResult class.
===============================================================================*/
#ifndef _VUFORIA_VUMARKTARGETRESULT_H_
#define _VUFORIA_VUMARKTARGETRESULT_H_

// Include files
#include <Vuforia/ObjectTargetResult.h>
#include <Vuforia/VuMarkTarget.h>

namespace Vuforia
{

/// Tracking data resulting from tracking a VuMarkTarget.
/**
 * A single VuMarkTarget can appear in multiple physical locations simultaneously.
 * In this case each appearance is tracked separately, and each appearance
 * generates its own VuMarkTargetResult. See getId() for more details.
 */
class VUFORIA_API VuMarkTargetResult : public ObjectTargetResult
{
public:

    /// Get the Type for class 'VuMarkTargetResult'.
    static Type getClassType();

    /// Get the VuMarkTarget that participated in generating this result.
    virtual const VuMarkTarget& getTrackable() const = 0;

    /// Get a unique id for this particular instance of the VuMarkTarget.
    /**
     * The unique id is assigned when the VuMark is first detected, and is
     * consistent as long as the VuMark remains visible.
     *
     * When the same VuMarkTarget appears in multiple physical locations in the
     * camera frame, the separate generated VuMarkTargetResults can be
     * distinguished using the id returned from this function.
     *
     * \note This id has no relationship to the id returned by Trackable::getId().
     *
     * \returns A unique id for this particular VuMark result, which remains
     * consistent as long as the VuMark instance remains visible. (Not related
     * to Trackable::getId()).
     */
    virtual int getId() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_VUMARKTARGETRESULT_H_
