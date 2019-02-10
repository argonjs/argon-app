/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
ModelTarget.h

\brief
Header file for the ModelTarget Trackable type.
===============================================================================*/

#ifndef _VUFORIA_MODELTARGET_H_
#define _VUFORIA_MODELTARGET_H_

// Include files
#include <Vuforia/ObjectTarget.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/Obb3D.h>
#include <Vuforia/List.h>

namespace Vuforia
{

// Forward declarations
class GuideView;

/// A type of ObjectTarget that recognizes and tracks objects by shape using existing 3D models.
/**
 * A Model Target tracks a real world object by its shape, based on a 3D model
 * of the object.
 *
 * In order to initialize tracking of a Model Target, the user is required to
 * position their device so that the object to be tracked appears in the camera
 * at a particular position and orientation. This initialization pose is called
 * a Guide View. To assist in this process, your application will typically
 * render an overlay in the camera image representing the position and
 * orientation of the object for the active Guide View. (Usually you will do
 * this by rendering the image returned by GuideView::getImage()).
 *
 * A Model Target dataset may contain multiple objects and/or multiple Guide
 * Views.
 * * If you have a Model Target dataset containing a single object with multiple
 * Guide Views, you can switch between the Guide Views using
 * setActiveGuideViewIndex().
 * * If you have a trained Model Target dataset with multiple objects and/or
 * multiple Guide Views, you can use a TargetFinder to switch between the
 * objects and, if you like, the Guide Views for each object.
 *
 * \note
 * It is not possible to modify a ModelTarget while its DataSet is active. See
 * the DataSet class for more information.
 */
class VUFORIA_API ModelTarget : public ObjectTarget
{
public:

    /// Return the Type for class "ModelTarget".
    static Type getClassType();

    /// Get the persistent system-wide unique id for this target.
    /**
     *  A target's unique id, which may be generated offline, identifies an
     *  ObjectTarget across multiple %Vuforia sessions. It is a property of
     *  %Vuforia's model of the object being tracked, and typically resides
     *  on permanent storage as part of loadable DataSet.
     *
     *  \note
     *  Be careful not to confuse getUniqueTargetId() (which is persistent
     *  across %Vuforia sessions) with Trackable::getId() (which is generated
     *  at runtime and not persistent).
     */
    virtual const char* getUniqueTargetId() const = 0;

    /// Get the size of this target.
    /**
     * \return The size of this target, in meters (width, height, depth).
     */
    virtual Vec3F getSize() const = 0;

    /// Apply a uniform scale to this target that makes it the given size.
    /**
     * The given size must represent a uniform scaling of the original target's
     * size.
     *
     * If you try to set a size that is not the result of a uniform scaling of
     * the model stored in the DataSet, this method will fail.
     *
     * \note
     * The DataSet that this Target belongs must not be active when this function
     * is called.
     *
     * \note
     * Rescaling the target should only be used if you have different physical
     * copies of the same object at different sizes (for example if you have a
     * toy version of a real physical object. Do not use this method if you want
     * to virtually re-scale the pose returned by the tracker - this should be
     * handled by your own application logic.
     *
     * \param size The desired size of the target, in meters (width, height, depth).
     * \returns true if the size was set successfully, or false if the DataSet
     * is active or the requested size does not represent a uniform scaling of
     * the size of model stored in the DataSet.
     */
    virtual bool setSize(const Vec3F& size) = 0;

    /// Get the bounding box of this target.
    /**
     * \note
     * A call to setSize() will change the bounding box. If you have cached the
     * result of getBoundingBox(), you will need to call it again to obtain an
     * updated bounding box after every call to setSize().
     *
     * \returns An axis-aligned box that completely encloses the 3D geometry
     * that this ModelTarget represents, including any scaling applied via
     * setSize().
     */
    virtual const Obb3D& getBoundingBox() const = 0;

    /// Get the number of <span>GuideView</span>s for this target. (DEPRECATED)
    /**
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getGuideViews() API instead.
     */
    virtual int getNumGuideViews() const = 0;

    /// Get one of this target's <span>GuideView</span>s. (DEPRECATED)
    /**
     * \param idx The GuideView to return, in the range 0..getNumGuideViews()-1
     * \returns The requested GuideView. This ImageTarget instance retains
     * ownership of the returned object.
     *
     * \deprecated This API has been deprecated. It will be removed in an
     * upcoming Vuforia release. Use the getGuideViews() API instead.
     */
    virtual GuideView* getGuideView(int idx) = 0;
    
    /// Returns a list of guide views (write access).
    /**
     * Return a list of the GuideViews defined for this Model Target.
     */
    virtual List<GuideView> getGuideViews() = 0;

    /// Returns a list of guide views (read-only access).
    /**
     * Return a list of the Guide Views defined for this Model Target.
     */
    virtual List<const GuideView> getGuideViews() const = 0;

    /// Set the index of the Guide View you want to be active.
    /**
     * \note It is possible to use this function even when the dataset is deactivated.
     *
     * \note The default active GuideView is the first one in the dataset, i.e.
     * the one with index 0.
     *
     * \note If you are using a TargetFinder to recognize different objects and/or
     * Guide Views, this method is called for you when you call
     * TargetFinder::enableTracking().
     *
     * \param idx The index of the GuideView to set as active, in the range
     * 0..(getGuideViews().size()-1) .
     * \returns true on success, false on failure (check application logs for
     * failure details).
     */
    virtual bool setActiveGuideViewIndex(int idx) = 0;

    /// Get the index of the currently active GuideView.
    /**
     * \note The default active GuideView is the first one in the dataset, i.e.
     * the one with index 0.
     *
     * \returns The index of the active GuideView in the range
     * 0..(getGuideViews().size()-1), or -1 in case of failure (check application
     * logs for failure details).
     */
    virtual int getActiveGuideViewIndex() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_MODELTARGET_H_
