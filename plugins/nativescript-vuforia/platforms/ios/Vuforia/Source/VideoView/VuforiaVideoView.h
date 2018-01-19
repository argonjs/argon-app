// Copyright 2015 Georgia Tech Research Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// This software was created as part of a research project at the
// Augmented Environments Lab at Georgia Tech.  To support our research, we
// request that if you make use of this software, you let us know how
// you used it by sending mail to Blair MacIntyre (blair@cc.gatech.edu).


#if !(TARGET_IPHONE_SIMULATOR)

#import <UIKit/UIKit.h>

#import "VuforiaGLResourceHandler.h"

@interface VuforiaVideoView : UIView <VuforiaGLResourceHandler> {
@private
    // OpenGL ES context
    EAGLContext *context;
    
    // Video background shader
    GLuint vbShaderProgramID;
    GLint vbVertexHandle;
    GLint vbTexCoordHandle;
    GLint vbTexSampler2DHandle;
    GLint vbProjectionMatrixHandle;

    // The OpenGL ES names for the framebuffer and renderbuffers used to render
    // to this view
    GLuint defaultFramebuffer;
    GLuint colorRenderbuffer;
    GLuint depthRenderbuffer;
    
}

- (void) renderFrame;

@end

#endif