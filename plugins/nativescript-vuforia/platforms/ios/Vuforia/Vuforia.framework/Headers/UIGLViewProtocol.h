/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2012-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    UIGLViewProtocol.h
 
\brief
    <b>iOS:</b> Header file for the iOS-specific UIGLViewProtocol protocol.
===============================================================================*/

#ifndef _UIGLVIEWPROTOCOL_H_
#define _UIGLVIEWPROTOCOL_H_

/// Protocol that provides automatic render scheduling on iOS.
/**
 *  <b>iOS:</b> This protocol applies only to the iOS platform.
 *
 *  If your application's UIView-derived view class conforms to this protocol,
 *  %Vuforia will be able to call the -renderFrameVuforia selector whenever the
 *  current frame needs to be rendered. The frequency this happens is dependant
 *  upon the frame rate set via Renderer::setTargetFps() (see the Renderer
 *  class for more information).
 *
 *  There is no need to explicitly tell %Vuforia to use a given view instance, as
 *  %Vuforia will manually traverse the view hierarchy looking for an instance
 *  which responds to the -renderFrameVuforia selector.
 *
 *  If no such view is found, you are responsible for scheduling the rendering
 *  in your app yourself.
 *
 *  \note Do not have more than one view in your application's view hierarchy that
 *  responds to the -renderFrameVuforia selector. If you do, %Vuforia will use
 *  only one and ignore the other(s) (which one it will use is undefined).
 */
@protocol UIGLViewProtocol

/// <b>iOS:</b> Called by %Vuforia to render the current frame.
- (void)renderFrameVuforia;

@end

#endif // _UIGLVIEWPROTOCOL_H_
