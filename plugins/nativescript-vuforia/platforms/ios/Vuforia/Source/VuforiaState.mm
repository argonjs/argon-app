//
//  VuforiaState.m
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaState.h"
#import "VuforiaTrackable.h"
#import <Vuforia/Image.h>
#import <Vuforia/Frame.h>
#import <Vuforia/State.h>


@interface VuforiaImage ()
@property (nonatomic, assign) const Vuforia::Image *cpp;
@end

@implementation VuforiaImage

/// Returns the width of the image in pixels
/**
 *  getWidth() returns the number of pixels in the pixel buffer that make up
 *  the used image area. The pixel buffer can be wider than this. Use
 *  getBufferWidth() to find out the real width of the pixel buffer.
 */
-(int)getWidth {
    return self.cpp->getWidth();
}

/// Returns the height of the image in pixels
/**
 *  getHeight() returns the number of pixel rows in the pixel buffer that
 *  make up the used image area. The pixel buffer can have more rows than
 *  that. Use getBufferHeight() to find out the real number of rows that fit
 *  into the buffer.
 */
-(int)getHeight {
    return self.cpp->getHeight();
}

/// Returns the number bytes from one row of pixels to the next row
/**
 *  Per default the stride is number-of-pixels times bytes-per-pixel.
 *  However, in some cases there can be additional padding bytes at
 *  the end of a row (e.g. to support power-of-two textures).
 */
-(int)getStride {
    return self.cpp->getStride();
}

/// Returns the number of pixel columns that fit into the pixel buffer
/**
 *  Per default the number of columns that fit into the pixel buffer
 *  is identical to the width of the image.
 *  However, in some cases there can be additional padding columns at
 *  the right side of an image (e.g. to support power-of-two textures).
 */
-(int)getBufferWidth {
    return self.cpp->getBufferHeight();
}

/// Returns the number of rows that fit into the pixel buffer
/**
 *  Per default the number of rows that fit into the pixel buffer
 *  is identical to the height of the image.
 *  However, in some cases there can be additional padding rows at
 *  the bottom of an image (e.g. to support power-of-two textures).
 */
-(int)getBufferHeight {
    return self.cpp->getBufferHeight();
}

/// Returns the pixel format of the image
-(VuforiaPixelFormat)getFormat {
    return (VuforiaPixelFormat)self.cpp->getFormat();
}

/// Provides read-only access to pixel data
-(const void*)getPixels {
    return self.cpp->getPixels();
}

- (void)dealloc {
    self.cpp = nil;
}
@end



@interface VuforiaFrame ()
//@property (nonatomic, assign) Vuforia::Frame cpp;
@property (nonatomic, assign) Vuforia::State *cpp;
@end

@implementation VuforiaFrame

/// A time stamp that defines when the original camera image was shot
/**
 *  Value in seconds representing the offset to application startup time.
 *  Independent from image creation the time stamp always refers to the time
 *  the camera image was shot.
 */
-(double)getTimeStamp {
    return self.cpp->getFrame().getTimeStamp();
}

/// Index of the frame
-(int)getIndex {
    return self.cpp->getFrame().getIndex();
}

/// Number of images in the images-array
-(int)getNumImages {
    return self.cpp->getFrame().getNumImages();
}

/// Read-only access to an image
-(VuforiaImage*)getImage:(int)idx {
    const Vuforia::Image* i = self.cpp->getFrame().getImage(idx);
    if (i != nil) {
        VuforiaImage* image = [[VuforiaImage alloc] init];
        image.cpp = i;
        return image;
    }
    return nil;
}

- (void)dealloc {
    self.cpp = nil;
}
@end


@interface VuforiaState ()
@property (nonatomic, assign) const Vuforia::State *cpp;
@end

@implementation VuforiaState
- (id) initWithCpp:(const void*)cpp {
    self = [super init];
    if (self) {
        self.cpp = (const Vuforia::State*)cpp;
    }
    return self;
}

-(Vuforia::State*)state {
    return (Vuforia::State*)self.cpp;
}

- (VuforiaFrame*) getFrame {
    static VuforiaFrame *frame = [[VuforiaFrame alloc] init];
    frame.cpp = self.state;
    return frame;
}

- (int) getNumTrackables {
    return self.state->getNumTrackables();
}

- (int) getNumTrackableResults {
    return self.state->getNumTrackableResults();
}

- (VuforiaTrackable *)getTrackable:(int)idx {
    const Vuforia::Trackable* trackable = self.state->getTrackable(idx);
    return [VuforiaTrackable trackableFromCpp:(void*)trackable asConst:true];
}

- (VuforiaTrackableResult *)getTrackableResult:(int)idx {
    return [VuforiaTrackableResult trackableResultFromCpp:(void*)self.state->getTrackableResult(idx) asConst:YES];
}

- (void)dealloc {
    self.cpp = nil;
}
@end


#endif
