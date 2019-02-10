/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014-2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ObjectTargetRaw.h

\brief
    Header file for ObjectTargetRaw class.
===============================================================================*/

#ifndef _VUFORIA_OBJECTTARGETRAW_H_
#define _VUFORIA_OBJECTTARGETRAW_H_

// Include files:
#include <Vuforia/Vectors.h>
#include <Vuforia/Matrices.h>
#include <Vuforia/Trackable.h>
#include <Vuforia/Image.h>

namespace Vuforia
{

// Forward declarations
class Box3D;

/// Private TrackableRaw for ObjectTarget
class VUFORIA_API ObjectTargetRaw: public Trackable
{
public:

    /// Information about a keyframe
    struct KeyFrameInfo {
        Matrix34F pose; /// pose of the keyframe
    };

    /// Information about a map point
    struct MapPointInfo {
        Vec3F position; /// position of the map point
        Vec3F normal;   /// normal of the map point
    };

    /// Returns the Trackable class' type
    static Type getClassType();

    /// Get time stamp of created TrackableRaw
    virtual double getTimeStamp() const = 0;

    /// Returns the trackable revision, which is increased on every trackable update
    virtual int getRevision() const = 0;

    /// Returns the Trackable Raw's name
    virtual const char* getName() const = 0;

    /// Set the Trackable Raw 's name
    virtual void setName(const char* name) = 0;

    /// Get Thumbnail image associated to this trackable raw
    virtual Image* getThumbnail() const = 0;

    // Set Thumbnail image associated to this trackable raw
    virtual bool setThumbnail(Image*) = 0;

    /// Returns the number of captured keyframes 
    virtual size_t getKeyframeCount() const = 0;

    /// Return a keyframe indexed by the parameter
    virtual const KeyFrameInfo& getKeyFrame(int idx) const = 0;

    /// Provides access to an array of map points
    virtual const KeyFrameInfo* getKeyFrames() const = 0;

    /// Returns the number of captured map points 
    virtual size_t getMapPointCount() const = 0;

    /// Return a map point indexed by the parameter
    virtual const MapPointInfo& getMapPoint(int idx) const = 0;

    /// Provides access to an array of map points
    virtual const MapPointInfo* getMapPoints() const = 0;

    /// Returns the trackable used for initialization.
    /**
     *  Returns null if no initialization target has been defined.
     */
    virtual Trackable* getInitializationTarget() const = 0;

    /// Returns the axis aligned bounding box of the Object Target
    virtual const Box3D& getBoundingBox() const = 0;
};

} // namespace Vuforia

#endif // _VUFORIA_OBJECTTARGETRAW_H_
