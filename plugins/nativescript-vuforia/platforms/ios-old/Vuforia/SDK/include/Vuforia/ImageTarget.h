/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ImageTarget.h

\brief
    Header file for ImageTarget class.
===============================================================================*/

#ifndef _VUFORIA_IMAGETARGET_H_
#define _VUFORIA_IMAGETARGET_H_

// Include files
#include <Vuforia/Trackable.h>
#include <Vuforia/ObjectTarget.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/List.h>

namespace Vuforia
{

// Forward declarations
class Area;
class VirtualButton;

/// A type of ObjectTarget that represents a 2D image or a planar object.
/**
 * \note
 * It is not possible to modify an ImageTarget while its DataSet is active. See
 * the DataSet class for more information.
 */
class VUFORIA_API ImageTarget : public ObjectTarget
{
public:

    /// Get the Type for class "ImageTarget".
    static Type getClassType();

    /// Get the number of VirtualButton objects associated with this ImageTarget. (DEPRECATED)
    /**
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getVirtualButtons() API instead.
     */
    virtual int getNumVirtualButtons() const = 0;

    /// Get (by index) one of the VirtualButton objects associated with this ImageTarget. (DEPRECATED)
    /**
     * \param idx The index of the VirtualButton to get, in the range
     * 0..getNumVirtualButtons()-1.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getVirtualButtons() API instead.
     */
    virtual VirtualButton* getVirtualButton(int idx) = 0;

    /// Get (by index) one of the VirtualButton objects associated with this ImageTarget. (DEPRECATED)
    /**
     * \param idx The index of the VirtualButton to get, in the range
     * 0..getNumVirtualButtons()-1.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getVirtualButtons() API instead.
     */
    virtual const VirtualButton* getVirtualButton(int idx) const = 0;

    /// Provides write access to the list of virtual buttons defined for
    /// this ImageTarget.
    virtual List<VirtualButton> getVirtualButtons() = 0;

    /// Provides read-only access to the list of virtual buttons defined
    /// for this ImageTarget.
    virtual List<const VirtualButton> getVirtualButtons() const = 0;

    /// Get (by name) one of the VirtualButton objects associated with this ImageTarget.
    /**
     * \param name The name of the VirtualButton to get.
     * \returns The requested VirtualButton, or NULL if this ImageTarget does
     * not define a button with the requested name.
     */
    virtual VirtualButton* getVirtualButton(const char* name) = 0;

    /// Get (by name) one of the VirtualButton objects associated with this ImageTarget.
    /**
     * \param name The name of the VirtualButton to get.
     * \returns The requested VirtualButton, or NULL if this ImageTarget does
     * not define a button with the requested name.
     */
    virtual const VirtualButton* getVirtualButton(const char* name) const = 0;

    /// Create a new virtual button and add it to this ImageTarget.
    /**
     * \param name The name for the new VirtualButton.
     * \param area An Area instance (e.g. a Rectangle) describing the extents
     * of the button, in this target's local coordinate system.
     * \returns The new VirtualButton, or NULL if the DataSet for this ImageTarget
     * is currently active.
     */
    virtual VirtualButton* createVirtualButton(const char* name, const Area& area) = 0;

    /// Destroy one of this ImageTarget's virtual buttons.
    /**
     * \param button The virtual button to destroy.
     * \returns true on success, or false on failure or if the DataSet for this
     * ImageTarget is currently active.
     */
    virtual bool destroyVirtualButton(VirtualButton* button) = 0;

    /// Get the meta data string for this ImageTarget.
    /**
     * A meta data string can be assigned to Cloud Recognition targets as part
     * of the web interface or API. This method retrieves this string.
     *
     * \returns The meta data string associated with this ImageTarget (as set via
     * the Cloud Recognition API).
     */
    virtual const char* getMetaData() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_IMAGETARGET_H_
