/*===============================================================================
Copyright (c) 2016,2018 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
ViewerParametersList.h

\brief
Header file for ViewerParametersList class.
===============================================================================*/

#ifndef _VUFORIA_VIEWER_PARAMETERS_LIST_H_
#define _VUFORIA_VIEWER_PARAMETERS_LIST_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/NonCopyable.h>
#include <Vuforia/ViewerParameters.h>

namespace Vuforia
{

/// A list of ViewerParameter instances, for use with Device::selectViewer().
/**
 * The list implements STL-like iterator semantics.
 */
class VUFORIA_API ViewerParametersList : private NonCopyable
{
public:

    /// Get the list of all supported %Vuforia Viewers.
    /**
     * You probably want to use Device::getViewerList() instead.
     *
     * This function is intended only for use by implementers of authoring tools
     * (e.g. Unity) where it is necessary to retrieve a full list of supported
     * vieweres, not limited to whichever viewer(s) are currently detected.
     */
    static ViewerParametersList& getListForAuthoringTools();

    /// Set a filter for a particular 3rd party VR SDK.
    /**
     * Allows the list to be filtered for a specific 3rd party SDK.
     *
     * \param filter "GEARVR" to list only GearVR viewers; "CARDBOARD" to list
     * only Cardboard viewers; or "" (empty string) to list all viewers.
     */
    virtual void setSDKFilter(const char* filter) = 0;

    /// Get the number of items in the list.
    /**
     * May be filtered; see setSDKFilter().
     */
    virtual size_t size() const = 0;

    /// Get the item at the specified index.
    /**
     * \param idx The index to get, in the range 0..size()-1.
     * \returns The requested item, or NULL if the index is out of bounds.
     */
    virtual const ViewerParameters* get(size_t idx) const = 0;

    /// Get ViewerParameters for the specified viewer name and manufacturer.
    /**
     * \returns the requested ViewerParameters, or NULL if no such viewer parameters
     * were found.
     */
    virtual const ViewerParameters* get(const char* name,
                                        const char* manufacturer) const = 0;

    /// Get a pointer to the first item in the list (STL-like iteration).
    virtual const ViewerParameters* begin() const = 0;

    /// Get a pointer to just beyond the last item in the list (STL-like iteration).
    virtual const ViewerParameters* end() const = 0;
};

} // namespace Vuforia

#endif // _VUFORIA_VIEWER_PARAMETERS_LIST_H_
