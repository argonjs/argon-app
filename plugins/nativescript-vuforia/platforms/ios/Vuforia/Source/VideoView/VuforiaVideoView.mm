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

#import <QuartzCore/QuartzCore.h>
#import <OpenGLES/ES2/gl.h>
#import <OpenGLES/ES2/glext.h>
#import <sys/time.h>

#import <Vuforia/UIGLViewProtocol.h>

#import <Vuforia/Vuforia.h>
#import <Vuforia/State.h>
#import <Vuforia/CameraDevice.h>
#import <Vuforia/Device.h>
#import <Vuforia/Tool.h>
#import <Vuforia/Renderer.h>
#import <Vuforia/GLRenderer.h>
#import <Vuforia/Mesh.h>
#import <Vuforia/View.h>

#import "VuforiaSession.h"
#import "VuforiaCameraDevice.h"
#import "VuforiaVideoView.h"

//******************************************************************************
// *** OpenGL ES thread safety ***
//
// OpenGL ES on iOS is not thread safe.  We ensure thread safety by following
// this procedure:
// 1) Create the OpenGL ES context on the main thread.
// 2) Start the QCAR camera, which causes Vuforia to locate our EAGLView and start
//    the render thread.
// 3) QCAR calls our renderFrameVuforia method periodically on the render thread.
//    The first time this happens, the defaultFramebuffer does not exist, so it
//    is created with a call to createFramebuffer.  createFramebuffer is called
//    on the main thread in order to safely allocate the OpenGL ES storage,
//    which is shared with the drawable layer.  The render (background) thread
//    is blocked during the call to createFramebuffer, thus ensuring no
//    concurrent use of the OpenGL ES context.
//
//******************************************************************************

namespace{
    
    const float PROJECTION_NEAR_PLANE = .01f;
    const float PROJECTION_FAR_PLANE = 3000.0f;
    
    // Apply a scaling transformation
    void
    scalePoseMatrix(float x, float y, float z, float* matrix)
    {
        if (matrix) {
            // matrix * scale_matrix
            matrix[0]  *= x;
            matrix[1]  *= x;
            matrix[2]  *= x;
            matrix[3]  *= x;
            
            matrix[4]  *= y;
            matrix[5]  *= y;
            matrix[6]  *= y;
            matrix[7]  *= y;
            
            matrix[8]  *= z;
            matrix[9]  *= z;
            matrix[10] *= z;
            matrix[11] *= z;
        }
    }
    
    void
    multiplyMatrix(float *matrixA, float *matrixB, float *matrixC)
    {
        int i, j, k;
        float aTmp[16];
        
        for (i = 0; i < 4; i++) {
            for (j = 0; j < 4; j++) {
                aTmp[j * 4 + i] = 0.0;
                
                for (k = 0; k < 4; k++) {
                    aTmp[j * 4 + i] += matrixA[k * 4 + i] * matrixB[j * 4 + k];
                }
            }
        }
        
        for (i = 0; i < 16; i++) {
            matrixC[i] = aTmp[i];
        }
    }
    
    VuforiaVideoView *videoView;

}

@interface VuforiaVideoView () <UIGLViewProtocol>

// Lock to prevent concurrent access of the framebuffer on the main and
// render threads (layoutSubViews and renderFrameVuforia methods)
@property (nonatomic, strong) NSLock *framebufferLock;

@property (nonatomic, readwrite) BOOL mDoLayoutSubviews;

- (void)createFramebuffer;
- (void)deleteFramebuffer;
- (void)setFramebuffer;
- (BOOL)presentFramebuffer;

@end

@implementation VuforiaVideoView

// You must implement this method, which ensures the view's underlying layer is
// of type CAEAGLLayer
+ (Class)layerClass
{
    return [CAEAGLLayer class];
}


//------------------------------------------------------------------------------
#pragma mark - Lifecycle

- (id)initWithFrame:(CGRect)frame
{
    if (videoView) return videoView;
    
    self = [super initWithFrame:frame];

    if (self) {

        self.framebufferLock = [[NSLock alloc] init];

        // Create the OpenGL ES context
        context = [[EAGLContext alloc] initWithAPI:kEAGLRenderingAPIOpenGLES2];

        // The EAGLContext must be set for each thread that wishes to use it.
        // Set it the first time this method is called (on the main thread)
        if (context != [EAGLContext currentContext]) {
            [EAGLContext setCurrentContext:context];
        }
        
        [self initShaders];
    }
    
    videoView = self;

    return self;
}


- (void)dealloc
{
    [self deleteFramebuffer];

    // Tear down context
    if ([EAGLContext currentContext] == context) {
        [EAGLContext setCurrentContext:nil];
    }
}

- (void)finishOpenGLESCommands
{
    // Called in response to applicationWillResignActive.  The render loop has
    // been stopped, so we now make sure all OpenGL ES commands complete before
    // we (potentially) go into the background
    if (context) {
        [self.framebufferLock lock];
        [EAGLContext setCurrentContext:context];
        glFinish();
        [self.framebufferLock unlock];
    }
}


- (void)freeOpenGLESResources
{
    // Called in response to applicationDidEnterBackground.  Free easily
    // recreated OpenGL ES resources
    [self deleteFramebuffer];
    glFinish();
}

- (void)layoutSubviews
{
    self.mDoLayoutSubviews = YES;
}

- (void)doLayoutSubviews
{
    // The framebuffer will be re-created at the beginning of the next setFramebuffer method call.
    [self deleteFramebuffer];
}


- (void) setOrientationTransform:(CGAffineTransform)transform withLayerPosition:(CGPoint)pos {
    self.layer.position = pos;
    self.transform = transform;
}



//------------------------------------------------------------------------------
#pragma mark - UIGLViewProtocol methods

// Draw the current frame using OpenGL
//
// This method is called by Vuforia when it wishes to render the current frame to
// the screen.
//
// *** Vuforia will call this method periodically on a background thread ***
//- (void)renderFrameVuforia
//{
//    [self renderFrame];
//}

-(void) renderFrame {
    
    if (![[VuforiaCameraDevice getInstance] isStarted]) return;
    
    // test if the layout has changed
    if (self.mDoLayoutSubviews) {
        [self doLayoutSubviews];
        self.mDoLayoutSubviews = NO;
    }
    
    Vuforia::Renderer& mRenderer = Vuforia::Renderer::getInstance();
    
    // [framebufferLock lock];
    [self setFramebuffer];
    
    mRenderer.begin();
    
    // Clear colour and depth buffers
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    
    glDisable(GL_BLEND);
    glDisable(GL_DEPTH_TEST);
    
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);
    glCullFace(GL_BACK);
    
    Vuforia::RenderingPrimitives renderingPrimitives = Vuforia::Device::getInstance().getRenderingPrimitives();
    Vuforia::ViewList& viewList = renderingPrimitives.getRenderingViews();
    
    // Iterate over the ViewList
    for (int viewIdx = 0; viewIdx < viewList.getNumViews(); viewIdx++) {
        Vuforia::VIEW vw = viewList.getView(viewIdx);
        
        // Any post processing is a special case that will be completed after
        // the main render loop - so does not imply any rendering here
        if (vw == Vuforia::VIEW_POSTPROCESS)
        {
            continue;
        }
        
        // Set up the viewport
        Vuforia::Vec4I viewport = renderingPrimitives.getViewport(vw);
        glViewport(viewport.data[0], viewport.data[1], viewport.data[2], viewport.data[3]);
        
        //set scissor
        glScissor(viewport.data[0], viewport.data[1], viewport.data[2], viewport.data[3]);
        
        Vuforia::Matrix44F projectionMatrix;
        
        Vuforia::Matrix34F projMatrix = renderingPrimitives.getProjectionMatrix(vw, NULL, NULL);
        
        Vuforia::Matrix44F rawProjectionMatrixGL = Vuforia::Tool::convertPerspectiveProjection2GLMatrix(
                                                                                                        projMatrix,
                                                                                                        PROJECTION_NEAR_PLANE,
                                                                                                        PROJECTION_FAR_PLANE);
        
        // Apply the appropriate eye adjustment to the raw projection matrix, and assign to the global variable
        Vuforia::Matrix44F eyeAdjustmentGL = Vuforia::Tool::convert2GLMatrix(renderingPrimitives.getEyeDisplayAdjustmentMatrix(vw));
        
        multiplyMatrix(&rawProjectionMatrixGL.data[0], &eyeAdjustmentGL.data[0], &projectionMatrix.data[0]);
        
        // Use texture unit 0 for the video background - this will hold the camera frame and we want to reuse for all views
        // So need to use a different texture unit for the augmentation
        int vbVideoTextureUnit = 0;
        
        // Bind the video bg texture and get the Texture ID from Vuforia
        Vuforia::GLTextureUnit tex;
        tex.mTextureUnit = vbVideoTextureUnit;
        
        if (vw != Vuforia::VIEW_RIGHTEYE )
        {
            if (! Vuforia::Renderer::getInstance().updateVideoBackgroundTexture(&tex))
            {
                NSLog(@"Unable to bind video background texture!!");
                return;
            }
        }
        [self renderVideoBackgroundWithViewId:vw textureUnit:vbVideoTextureUnit viewPort:viewport];
        
        glDisable(GL_SCISSOR_TEST);
        
    }
    
    mRenderer.end();
    
    [self presentFramebuffer];
    //[framebufferLock unlock];
}

- (void) renderVideoBackgroundWithViewId:(Vuforia::VIEW) viewId textureUnit:(int) vbVideoTextureUnit viewPort:(Vuforia::Vec4I) viewport
{
    const Vuforia::RenderingPrimitives renderingPrimitives = Vuforia::Device::getInstance().getRenderingPrimitives();
    
    Vuforia::Matrix44F vbProjectionMatrix = Vuforia::Tool::convert2GLMatrix(
                                                                            renderingPrimitives.getVideoBackgroundProjectionMatrix(viewId, Vuforia::COORDINATE_SYSTEM_CAMERA));
    
    // Scale the video background as necessary
    float scaleFactor = [VuforiaSession scaleFactor];
    scalePoseMatrix(scaleFactor, scaleFactor, 1.0f, vbProjectionMatrix.data);
    
    // Apply a scissor around the video background, so that the augmentation doesn't 'bleed' outside it
    // int videoWidth = viewport.data[2] * scaleFactor;
    // int videoHeight = viewport.data[3] * scaleFactor;
    // int videoX = (viewport.data[2] - videoWidth) / 2 + viewport.data[0];
    // int videoY = (viewport.data[3] - videoHeight) / 2 + viewport.data[1];
    
    // glEnable(GL_SCISSOR_TEST);
    // glScissor(videoX, videoY, videoWidth, videoHeight);
    // glDisable(GL_SCISSOR_TEST);
    
    glDisable(GL_DEPTH_TEST);
    glDisable(GL_CULL_FACE);
    
    const Vuforia::Mesh& vbMesh = renderingPrimitives.getVideoBackgroundMesh(viewId);
    // Load the shader and upload the vertex/texcoord/index data
    glUseProgram(vbShaderProgramID);
    glVertexAttribPointer(vbVertexHandle, 3, GL_FLOAT, false, 0, vbMesh.getPositionCoordinates());
    glVertexAttribPointer(vbTexCoordHandle, 2, GL_FLOAT, false, 0, vbMesh.getUVCoordinates());
    
    glUniform1i(vbTexSampler2DHandle, vbVideoTextureUnit);
    
    // Render the video background with the custom shader
    // First, we enable the vertex arrays
    glEnableVertexAttribArray(vbVertexHandle);
    glEnableVertexAttribArray(vbTexCoordHandle);
    
    // Pass the projection matrix to OpenGL
    glUniformMatrix4fv(vbProjectionMatrixHandle, 1, GL_FALSE, vbProjectionMatrix.data);
    
    // Then, we issue the render call
    glDrawElements(GL_TRIANGLES, vbMesh.getNumTriangles() * 3, GL_UNSIGNED_SHORT,
                   vbMesh.getTriangles());
    
    // Finally, we disable the vertex arrays
    glDisableVertexAttribArray(vbVertexHandle);
    glDisableVertexAttribArray(vbTexCoordHandle);
}

//------------------------------------------------------------------------------
#pragma mark - OpenGL ES management

- (void)initShaders
{
    // Video background rendering
    vbShaderProgramID = [VuforiaVideoView createProgramWithVertexShaderFileName:@"Background.vertsh"
                                                                     fragmentShaderFileName:@"Background.fragsh"];
    
    if (0 < vbShaderProgramID) {
        vbVertexHandle = glGetAttribLocation(vbShaderProgramID, "vertexPosition");
        vbTexCoordHandle = glGetAttribLocation(vbShaderProgramID, "vertexTexCoord");
        vbProjectionMatrixHandle = glGetUniformLocation(vbShaderProgramID, "projectionMatrix");
        vbTexSampler2DHandle = glGetUniformLocation(vbShaderProgramID, "texSampler2D");
    }
    else {
        NSLog(@"Could not initialise video background shader");
    }
}

- (void)createFramebuffer
{
    if (context) {
        // Create default framebuffer object
        glGenFramebuffers(1, &defaultFramebuffer);
        glBindFramebuffer(GL_FRAMEBUFFER, defaultFramebuffer);

        // Create colour renderbuffer and allocate backing store
        glGenRenderbuffers(1, &colorRenderbuffer);
        glBindRenderbuffer(GL_RENDERBUFFER, colorRenderbuffer);

        // Allocate the renderbuffer's storage (shared with the drawable object)
        [context renderbufferStorage:GL_RENDERBUFFER fromDrawable:(CAEAGLLayer*)self.layer];
        GLint framebufferWidth;
        GLint framebufferHeight;
        glGetRenderbufferParameteriv(GL_RENDERBUFFER, GL_RENDERBUFFER_WIDTH, &framebufferWidth);
        glGetRenderbufferParameteriv(GL_RENDERBUFFER, GL_RENDERBUFFER_HEIGHT, &framebufferHeight);

        // Create the depth render buffer and allocate storage
        glGenRenderbuffers(1, &depthRenderbuffer);
        glBindRenderbuffer(GL_RENDERBUFFER, depthRenderbuffer);
        glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT16, framebufferWidth, framebufferHeight);

        // Attach colour and depth render buffers to the frame buffer
        glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, colorRenderbuffer);
        glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, depthRenderbuffer);

        // Leave the colour render buffer bound so future rendering operations will act on it
        glBindRenderbuffer(GL_RENDERBUFFER, colorRenderbuffer);
    }
}


- (void)deleteFramebuffer
{
    if (context) {
        [EAGLContext setCurrentContext:context];

        if (defaultFramebuffer) {
            glDeleteFramebuffers(1, &defaultFramebuffer);
            defaultFramebuffer = 0;
        }

        if (colorRenderbuffer) {
            glDeleteRenderbuffers(1, &colorRenderbuffer);
            colorRenderbuffer = 0;
        }

        if (depthRenderbuffer) {
            glDeleteRenderbuffers(1, &depthRenderbuffer);
            depthRenderbuffer = 0;
        }
    }
}


- (void)setFramebuffer
{
    // The EAGLContext must be set for each thread that wishes to use it.  Set
    // it the first time this method is called (on the render thread)
    if (context != [EAGLContext currentContext]) {
        [EAGLContext setCurrentContext:context];
    }

    if (!defaultFramebuffer) {
        // Perform on the main thread to ensure safe memory allocation for the
        // shared buffer.  Block until the operation is complete to prevent
        // simultaneous access to the OpenGL context
        [self performSelectorOnMainThread:@selector(createFramebuffer) withObject:self waitUntilDone:YES];
    }

    glBindFramebuffer(GL_FRAMEBUFFER, defaultFramebuffer);
}


- (BOOL)presentFramebuffer
{
    // setFramebuffer must have been called before presentFramebuffer, therefore
    // we know the context is valid and has been set for this (render) thread

    // Bind the colour render buffer and present it
    glBindRenderbuffer(GL_RENDERBUFFER, colorRenderbuffer);

    return [context presentRenderbuffer:GL_RENDERBUFFER];
}


+ (GLuint)compileShader:(NSString*)shaderFileName withDefs:(NSString *) defs withType:(GLenum)shaderType {
    NSString* shaderName = [[shaderFileName lastPathComponent] stringByDeletingPathExtension];
    NSString* shaderFileType = [shaderFileName pathExtension];
    
    NSLog(@"debug: shaderName=(%@), shaderFileTYpe=(%@)", shaderName, shaderFileType);
    
    // 1
    NSString* shaderPath = [[NSBundle bundleForClass:[VuforiaVideoView class]] pathForResource:shaderName ofType:shaderFileType];
    NSLog(@"debug: shaderPath=(%@)", shaderPath);
    NSError* error;
    NSString* shaderString = [NSString stringWithContentsOfFile:shaderPath encoding:NSUTF8StringEncoding error:&error];
    if (!shaderString) {
        NSLog(@"Error loading shader (%@): %@", shaderFileName, error.localizedDescription);
        return 0;
    }
    
    // 2
    GLuint shaderHandle = glCreateShader(shaderType);
    NSLog(@"debug: shaderHandle=(%d)", shaderHandle);
    
    // 3
    const char * shaderStringUTF8 = [shaderString UTF8String];
    GLint shaderStringLength = (GLint)[shaderString length];
    
    if (defs == nil) {
        glShaderSource(shaderHandle, 1, &shaderStringUTF8, &shaderStringLength);
    } else {
        const char* finalShader[2] = {[defs UTF8String],shaderStringUTF8};
        GLint finalShaderSizes[2] = {(GLint)[defs length], shaderStringLength};
        glShaderSource(shaderHandle, 2, finalShader, finalShaderSizes);
    }
    
    // 4
    glCompileShader(shaderHandle);
    
    // 5
    GLint compileSuccess;
    glGetShaderiv(shaderHandle, GL_COMPILE_STATUS, &compileSuccess);
    if (compileSuccess == GL_FALSE) {
        GLchar messages[256];
        glGetShaderInfoLog(shaderHandle, sizeof(messages), 0, &messages[0]);
        NSString *messageString = [NSString stringWithUTF8String:messages];
        NSLog(@"Error compiling shader (%@): %@", shaderFileName, messageString);
        return 0;
    }
    
    return shaderHandle;
    
}

+ (int)createProgramWithVertexShaderFileName:(NSString*) vertexShaderFileName
                      fragmentShaderFileName:(NSString *) fragmentShaderFileName {
    return [VuforiaVideoView createProgramWithVertexShaderFileName:vertexShaderFileName
                                                          withVertexShaderDefs:nil
                                                        fragmentShaderFileName:fragmentShaderFileName
                                                        withFragmentShaderDefs:nil];
}

+ (int)createProgramWithVertexShaderFileName:(NSString*) vertexShaderFileName
                        withVertexShaderDefs:(NSString *) vertexShaderDefs
                      fragmentShaderFileName:(NSString *) fragmentShaderFileName
                      withFragmentShaderDefs:(NSString *) fragmentShaderDefs {
    GLuint vertexShader = [self compileShader:vertexShaderFileName withDefs:vertexShaderDefs withType:GL_VERTEX_SHADER];
    GLuint fragmentShader = [self compileShader:fragmentShaderFileName withDefs:fragmentShaderDefs withType:GL_FRAGMENT_SHADER];
    
    if ((vertexShader == 0) || (fragmentShader == 0)) {
        NSLog(@"Error: error compiling shaders vertexShader:%d fragmentShader=%d", vertexShader, fragmentShader);
        return 0;
    }
    
    GLuint programHandle = glCreateProgram();
    
    if (programHandle == 0) {
        NSLog(@"Error: can't create programe");
        return 0;
    }
    glAttachShader(programHandle, vertexShader);
    glAttachShader(programHandle, fragmentShader);
    glLinkProgram(programHandle);
    
    GLint linkSuccess;
    glGetProgramiv(programHandle, GL_LINK_STATUS, &linkSuccess);
    if (linkSuccess == GL_FALSE) {
        GLchar messages[256];
        glGetProgramInfoLog(programHandle, sizeof(messages), 0, &messages[0]);
        NSString *messageString = [NSString stringWithUTF8String:messages];
        NSLog(@"Error linkink shaders (%@) and (%@): %@", vertexShaderFileName, fragmentShaderFileName, messageString);
        return 0;
    }
    return programHandle;
}

@end


#endif
