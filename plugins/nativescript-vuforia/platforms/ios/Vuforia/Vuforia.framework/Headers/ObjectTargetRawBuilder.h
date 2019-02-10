/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014-2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ObjectTargetRawBuilder.h

\brief
    Header file for ObjectTargetRawBuilder class.
===============================================================================*/

#ifndef _VUFORIA_OBJECTTARGETRAWBUILDER_H_
#define _VUFORIA_OBJECTTARGETRAWBUILDER_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/Tracker.h>
#include <Vuforia/Trackable.h>
#include <Vuforia/DataSet.h>
#include <Vuforia/Vectors.h>
#include <Vuforia/Box3D.h>

namespace Vuforia
{

class ObjectTargetRaw;
class Trackable;
class Rectangle;

/// A type of Tracker that scans and captures ObjectTargetRaw targets.
/**
 * A Builder class of a "raw" ObjectTarget (ObjectTargetRaw),
 * that supports the run-time capture of a Rigid Object.
 * The ObjectTargetRawBuilder creates a sequence which contains
 * an ObjectTargetRaw (currently only one). A sequence can be
 * created, closed, opened or saved. A sequence contains a
 * succession of clips, which can be started/stopped.
 */
class VUFORIA_API ObjectTargetRawBuilder: public Tracker
{
public:

    /// Meta information of a sequence
    typedef struct {

        // Bounding box information
        Box3D boundingBox;

        // Preview image information
        const unsigned char*  previewImageBuffer;
        unsigned int previewImageWidth;
        unsigned int previewImageHeight;
        PIXEL_FORMAT previewImagePixelFormat;

        // Application version information
        size_t applicationMajorVersion;
        size_t applicationMinorVersion;
        size_t applicationBugFixVersion;
    } SequenceMetaInfo;

    /// Returns the class type
    static Type getClassType();

    /// Create a new sequence
    virtual bool newSequence() = 0;

    /// Close a new sequence
    virtual bool closeSequence() = 0;

    /// Open an existing sequence
    virtual bool openSequence(const char* path, STORAGE_TYPE storageType) = 0;

    /// Save a sequence
    virtual bool saveSequence(const char* path, STORAGE_TYPE storageType, 
                              const SequenceMetaInfo* metainfo, 
                              bool filterKeyPointsOnInitializationTarget = true) const = 0;

    /// Load meta information from a sequence
    virtual bool loadMetaInfoSequence(const char* path, STORAGE_TYPE storageType, 
                                      SequenceMetaInfo* metainfo) = 0;

    /// Starts recording a clip in a sequence (create or update the ObjectTargetRaw)
    virtual bool startClip() = 0;

    /// Stop recording a clip in a sequence (stop updating the ObjectTargetRaw)
    virtual bool stopClip() = 0;

    /// Set the initialization target and build volume parameters
    /**
     * \param trackable A Trackable to use to initialize the spatial volume
     * where the object target data will be built.
     * \param offsetToBuildSpacePose A pose matrix that allows to define a
     * translational offset and rotation of the build volume with respect
     * to the initialization target.
     * \param buildVolume An axis-aligned box which defines the maximum area
     * where the 3D object will be captured.
     */
    virtual bool setInitializationTarget(const Trackable* trackable,
                                         const Matrix34F& offsetToBuildVolumePose, 
                                         const Box3D& buildVolume) = 0;

    /// Returns the trackable used for initialization.
    /**
     *  Returns null if no initialization target has been defined.
     */
    virtual const Trackable* getInitializationTarget() const = 0;

    /// Filter the keypoints from the initialization target
    virtual bool filterKeyPointsInitializationTarget() = 0;

    /// Enable/disable Tracking/Detection mode
    virtual bool activateTracking(bool trackinganddtection) = 0;

    /// Enable/disable the usage of an initialization target
    virtual bool enableUseInitializationTarget(bool useitarget) = 0;

    /// Enable/disable the dump of captured images
    virtual bool enableDumpCapture(bool dumpcapture) = 0;

    /// Set camera focus region
    virtual bool setCameraFocusRegion(const Rectangle& rect) = 0;

protected:

   virtual ~ObjectTargetRawBuilder()  {}
};

} // namespace Vuforia

#endif //_VUFORIA_OBJECTTARGETRAWBUILDER_H_
