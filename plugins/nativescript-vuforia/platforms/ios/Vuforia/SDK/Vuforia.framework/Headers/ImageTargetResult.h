/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ImageTargetResult.h

\brief
    Header file for ImageTargetResult class.
===============================================================================*/

#ifndef _VUFORIA_IMAGETARGETRESULT_H_
#define _VUFORIA_IMAGETARGETRESULT_H_

// Include files
#include <Vuforia/ObjectTargetResult.h>
#include <Vuforia/ImageTarget.h>

namespace Vuforia
{

// Forward declarations
class VirtualButtonResult;

/// Tracking data resulting from tracking an ImageTarget.
class VUFORIA_API ImageTargetResult : public ObjectTargetResult
{
public:

    /// Get the Type for class 'ImageTargetResult'.
    static Type getClassType();

    /// Get the ImageTarget that participated in generating this result.
    virtual const ImageTarget& getTrackable() const = 0;

    /// Get the number of <span>VirtualButton</span>s that the ImageTarget defines.
    virtual int getNumVirtualButtons() const = 0;

    /// Get result data for a VirtualButton.
    /**
     * \param idx The index of the VirtualButton to get result data for, in the
     * range 0..getNumVirtualButtons()-1
     * \return The requested result, or null if idx is out of bounds or if there
     * was no result for this button.
     */
    virtual const VirtualButtonResult* getVirtualButtonResult(int idx) const = 0;

    /// Get result data for a VirtualButton.
    /**
     * \param name The name of the VirtualButton to get result data for.
     * \return The requested result, or null if no such VirtualButton generated
     * a result.
     */
    virtual const VirtualButtonResult* getVirtualButtonResult(const char* name) const = 0;

};

} // namespace Vuforia

#endif //_VUFORIA_IMAGETARGETRESULT_H_
