/*===============================================================================
Copyright (c) 2015-2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Frame.h

\brief
    Header file for Frame class.
===============================================================================*/

#ifndef _VUFORIA_FRAME_H_
#define _VUFORIA_FRAME_H_

// Include files
#include <Vuforia/Vuforia.h>

namespace Vuforia
{

// Forward declarations
class Image;
class FrameData;


/// A collection of different representations of a single image captured from a camera.
/**
 * A Frame object can include an arbitrary number of image representations in
 * different formats or resolutions together with a time stamp and frame index.
 *
 * If any of the configured Trackers require particular frame formats internally,
 * these will be included in getNumImages()/getImage(). It is not possible to
 * predict in advance exactly which frame formats will be used, however, so if
 * you require a specific image representation you should request it using
 * Vufora::setFrameFormat().
 *
 * Frame implements the RAII pattern: A newly created frame holds
 * new image data whereas copies share this data. The image data held by
 * Frame exists as long as one or more Frame objects referencing this image
 * data exist.
 */
class VUFORIA_API Frame
{
public:

    /// Creates a new frame.
    Frame();

    /// Creates new references to an existing frame's data.
    Frame(const Frame& other);

    /// Destructor.
    ~Frame();

    /// Thread safe assignment operator.
    Frame& operator=(const Frame& other);

    /// Get the time stamp (in seconds) of this frame.
    /**
     * The time stamp of a frame is the time when the image was captured,
     * independent of when the image buffer itself was created.
     *
     * The time stamp is measured in seconds, and represents the time elapsed since
     * some reference time. The reference time is platform and device specific,
     * but is usually either the time when the application was launched or the
     * time the device started up.
     */
    double getTimeStamp() const;

    /// Get the index of this frame.
    int getIndex() const;

    /// Get the number of images referenced by this frame.
    unsigned int getNumImages() const;

    /// Get one of the images referenced by this frame.
    const Image* getImage(int idx) const;

protected:

    FrameData* mData;
};

} // namespace Vuforia

#endif // _VUFORIA_FRAME_H_
