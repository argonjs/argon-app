/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

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
#include <Vuforia/Type.h>
#include <Vuforia/System.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

/// A search result returned from a TargetFinder.
class VUFORIA_API TargetSearchResult : private NonCopyable
{
public:

    /// Get the Type for class 'TargetSearchResult'.
    static Type getClassType();

    /// Get the Type of this instance (typically a subclass of TargetSearchResult).
    virtual Type getType() const = 0;

    /// Check if this instance is of the given Type or any of its subclasses.
    virtual bool isOfType(Type type) const = 0;

    /// Get the name of the target.
    virtual const char* getTargetName() const = 0;

    /// Get the system-wide unique id of the target.
    virtual const char* getUniqueTargetId() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_TARGET_SEARCH_RESULT_H_
