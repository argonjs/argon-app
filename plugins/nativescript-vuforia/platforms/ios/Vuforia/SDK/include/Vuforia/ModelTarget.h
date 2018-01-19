/*===============================================================================
Copyright (c) 2017 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file
ModelTarget.h

@brief
Header file for the ModelTarget Trackable type.
===============================================================================*/
#ifndef _VUFORIA_MODELTARGET_H_
#define _VUFORIA_MODELTARGET_H_

// Include files
#include <Vuforia/ObjectTarget.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/Obb3D.h>

namespace Vuforia
{
    class GuideView;

    /// A target for tracking rigid three-dimensional bodies.
    class VUFORIA_API ModelTarget : public ObjectTarget
    {
    public:

        /// Returns the Trackable class' type
        static Type getClassType();

        /// Returns the system-wide unique id of the target.
        /**
        *  The target id uniquely identifies an ObjectTarget across multiple
        *  Vuforia sessions. The system wide unique id may be generated off-line.
        *  This is opposed to the function getId() which is a dynamically
        *  generated id and which uniquely identifies a Trackable within one run
        *  of Vuforia only.
        */
        virtual const char* getUniqueTargetId() const = 0;

        /// Returns the size (width, height, depth) of the target (in 3D scene units).
        virtual Vec3F getSize() const = 0;

        /// Set the size (width, height, depth) of the target (in 3D scene units).
        /**
        *  The dataset this target belongs to should not be active when calling
        *  this function, otherwise it will fail.
        *  We expect the scale factor to be uniform, and if the given size
        *  corresponds to non-uniform scaling based on the original size,
        *  we return false.
        *  Returns true if the size was set successfully, false otherwise.
        */
        virtual bool setSize(const Vec3F& size) = 0;

        /// Gets the bounding box of the target (in 3D scene units)
        /**
         * If the bounding box has been queried and setSize is called, getBoundingBox()
         * needs to be called again to have the correct size.
         */
        virtual const Obb3D& getBoundingBox() const = 0;

        /// Returns the number of guide views
        /**
        * guide views are the entry points that the application can use to snap to the trackables
        */
        virtual int getNumGuideViews() const = 0;

        /// Returns a pointer to a GuideView object
        /**
        * The pointer to the guide view is not owned by the caller of this function.
        * The application can use the information stored in GuideView to provide visual
        * feedback to use user about how to position the camera in order to snap to a
        * specific object
        */
        virtual GuideView * getGuideView(int idx) = 0;
    };

} // namespace Vuforia

#endif //_VUFORIA_MODELTARGET_H_


