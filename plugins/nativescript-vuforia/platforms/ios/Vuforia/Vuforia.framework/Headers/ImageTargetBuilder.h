/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    ImageTargetBuilder.h

\brief
    Header file for ImageTargetBuilder class.
===============================================================================*/

#ifndef _VUFORIA_IMAGE_TARGET_BUILDER_H_
#define _VUFORIA_IMAGE_TARGET_BUILDER_H_

// Include files
#include <Vuforia/System.h>

namespace Vuforia
{

// Forward declarations
class TrackableSource;

/// A helper class for creating ImageTarget instances from runtime data.
class VUFORIA_API ImageTargetBuilder
{
public:

   enum FRAME_QUALITY {
       FRAME_QUALITY_NONE = -1, ///< getFrameQualty was called oustside of scanning mode
       FRAME_QUALITY_LOW = 0,   ///< The frame does not have enought features for tracking
       FRAME_QUALITY_MEDIUM,    ///< The frame has sufficient features for tracking, but
                                ///< tracking may not be particularly good.
       FRAME_QUALITY_HIGH,      ///< The frame has an ideal number of features; tracking
                                ///< will likely be high quality.
   };

   /// Build an ImageTarget from the next available camera frame.
   /**
    * The target is built asynchronously. The result of the build process will
    * be made available via getTrackableSource().
    *
    * \note The ImageTargetBuilder must be in scan mode (startScan()) to build a
    * target successfully. Before calling build(), you should call startScan()
    * and report the values from getFrameQuality() to the user, to guide them in
    * selecting an appropriate target and camera position relative to the target.
    *
    * \returns true if the build was successfully started, or false if an
    * invalid name or sceneSizeWidth is provided.
    */
   virtual bool build(const char* name, float sceneSizeWidth) = 0;

   /// Start the scanning mode, allowing calls to getFrameQuality().
   /**
    * Starts the internal frame scanning process, allowing calls to getFrameQuality().
    *
    * \note Running the scanning mode may incur a performance penalty. You should
    * use startScan() and stopScan() in a fine-grained manner so that the scanning
    * is only run when it is needed.
    */
   virtual void startScan() = 0;

   /// Stop the scanning mode.
   /**
    * getFrameQuality() will return FRAME_QUALITY_NONE until startScan() is
    * called again.
    *
    * \note Running the scanning mode may incur a performance penalty. You should
    * use startScan() and stopScan() in a fine-grained manner so that the scanning
    * is only run when it is needed.
    */
   virtual void stopScan() = 0;

   /// Get the quality (i.e. suitability as an image target) of the current frame.
   /**
    * \returns The quality of the last available camera frame with respect to its
    * suitability as an image target, or FRAME_QUALITY_NONE if scanning mode is
    * not enabled (see startScan()).
    */
   virtual FRAME_QUALITY getFrameQuality() const = 0;

   /// Get a TrackableSource which can be used to add the built target to a DataSet.
   /**
    * This method should be called after calling build().
    *
    * It will return NULL until build() has completed its asynchronous work, at
    * which point the the returned TrackableSource should be passed to
    * DataSet::createTrackable().
    *
    * Repeated calls to getTrackableSource() will continue to return the same
    * TrackableSource until build() is called again.
    *
    * \returns A TrackableSource representing the frame captured by a previous
    * call to build(); or NULL if the last call to build() is still processing,
    * or if build() has not yet been called.
    */
   virtual TrackableSource* getTrackableSource() = 0;

protected:

   virtual ~ImageTargetBuilder() {}
};

} // namespace Vuforia

#endif //_VUFORIA_IMAGE_TARGET_BUILDER_H_
