/*===============================================================================
Based on com.vuforia.samples.ARVR.app.ARVR.ARVRRenderer

Copyright (c) 2016 PTC, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.
===============================================================================*/

package io.argonjs.vuforia;

import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.util.Log;

import com.vuforia.COORDINATE_SYSTEM_TYPE;
import com.vuforia.CameraDevice;
import com.vuforia.Device;
import com.vuforia.GLTextureUnit;
import com.vuforia.Mesh;
import com.vuforia.Renderer;
import com.vuforia.RenderingPrimitives;
import com.vuforia.State;
import com.vuforia.Tool;
import com.vuforia.TrackerManager;
import com.vuforia.VIEW;
import com.vuforia.Vec2F;
import com.vuforia.Vec4F;
import com.vuforia.Vec4I;
import com.vuforia.ViewList;
import com.vuforia.Vuforia;

import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

public class VuforiaRenderer implements GLSurfaceView.Renderer {

    private static final String LOGTAG = "VuforiaRenderer";

    private RenderingPrimitives renderingPrimitives;

    // Shader user to render the video background on AR mode
    private int vbShaderProgramID;
    private int vbTexSampler2DHandle;
    private int vbVertexHandle            = 0;
    private int vbTexCoordHandle          = 0;
    private int vbProjectionMatrixHandle;

    private Renderer mRenderer;

    public boolean mIsActive = false;


    // Constructor.
    public VuforiaRenderer() { }


    // Called to draw the current frame.
    @Override
    public void onDrawFrame(GL10 gl)
    {
        if (!mIsActive)
            return;

        // Call our function to render content
        renderFrame();
    }


    // Called when the surface is created or recreated.
    @Override
    public void onSurfaceCreated(GL10 gl, EGLConfig config)
    {
        Log.d(LOGTAG, "GLRenderer.onSurfaceCreated");

        initRendering();

        // Call Vuforia function to (re)initialize rendering after first use
        // or after OpenGL ES context was lost (e.g. after onPause/onResume):
        Vuforia.onSurfaceCreated();
    }


    // Called when the surface changed size.
    @Override
    public void onSurfaceChanged(GL10 gl, int width, int height)
    {
        Log.d(LOGTAG, "GLRenderer.onSurfaceChanged");

        // Call Vuforia function to handle render surface size changes:
        Vuforia.onSurfaceChanged(width, height);

        // Update the rendering primitives used to draw on the display according to the new surface size
        updateRenderingPrimitives();
    }


    public synchronized void updateRenderingPrimitives()
    {
        renderingPrimitives = Device.getInstance().getRenderingPrimitives();
    }


    // Function for initializing the renderer.
    private void initRendering()
    {
        mRenderer = Renderer.getInstance();

        GLES20.glClearColor(0.0f, 0.0f, 0.0f, Vuforia.requiresAlpha() ? 0.0f
                : 1.0f);

        vbShaderProgramID = createProgramFromShaderSrc(VB_VERTEX_SHADER, VB_FRAGMENT_SHADER);

        // Rendering configuration for video background
        if (vbShaderProgramID > 0)
        {
            // Activate shader:
            GLES20.glUseProgram(vbShaderProgramID);

            // Retrieve handler for texture sampler shader uniform variable:
            vbTexSampler2DHandle = GLES20.glGetUniformLocation(vbShaderProgramID, "texSampler2D");

            // Retrieve handler for projection matrix shader uniform variable:
            vbProjectionMatrixHandle = GLES20.glGetUniformLocation(vbShaderProgramID, "projectionMatrix");

            vbVertexHandle = GLES20.glGetAttribLocation(vbShaderProgramID, "vertexPosition");
            vbTexCoordHandle = GLES20.glGetAttribLocation(vbShaderProgramID, "vertexTexCoord");
            vbProjectionMatrixHandle = GLES20.glGetUniformLocation(vbShaderProgramID, "projectionMatrix");
            vbTexSampler2DHandle = GLES20.glGetUniformLocation(vbShaderProgramID, "texSampler2D");

            // Stop using the program
            GLES20.glUseProgram(0);
        }
    }

    // The render function.
    private synchronized void renderFrame()
    {
        State state = TrackerManager.getInstance().getStateUpdater().updateState();
        mRenderer.begin(state);

        ViewList viewList = renderingPrimitives.getRenderingViews();

        // Enable depth testing
        GLES20.glEnable(GLES20.GL_DEPTH_TEST);

        GLES20.glEnable(GLES20.GL_CULL_FACE);
        GLES20.glCullFace(GLES20.GL_BACK);

        GLES20.glClearColor(0, 0, 0, 1);
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT | GLES20.GL_DEPTH_BUFFER_BIT);

        // stereo rendering
        for (int v = 0; v < viewList.getNumViews(); v++)
        {
            int viewID = viewList.getView(v);

            // Any post processing is a special case that will be completed after
            // the main render loop
            if (viewID != VIEW.VIEW_POSTPROCESS)
            {
                // We're writing directly to the screen, so the viewport is relative to the screen
                Vec4I viewport = renderingPrimitives.getViewport(viewID);

                //set viewport for each view left/right
                GLES20.glViewport(viewport.getData()[0], viewport.getData()[1], viewport.getData()[2], viewport.getData()[3]);

                //set scissor
                GLES20.glScissor(viewport.getData()[0], viewport.getData()[1], viewport.getData()[2], viewport.getData()[3]);

                int vbVideoTextureUnit = 0;
                // Bind the video bg texture and get the Texture ID from Vuforia
                GLTextureUnit tex = new GLTextureUnit();
                tex.setTextureUnit(vbVideoTextureUnit);
                if (viewID != VIEW.VIEW_RIGHTEYE )
                {
                    if (!Renderer.getInstance().updateVideoBackgroundTexture(tex))
                    {
                        Log.e(LOGTAG, "Unable to bind video background texture");
                        return;
                    }
                }

                renderVideoBackground(viewID, viewport.getData(), vbVideoTextureUnit);

                // disable scissor test
                GLES20.glDisable(GLES20.GL_SCISSOR_TEST);
            }
        }

        GLES20.glDisable(GLES20.GL_DEPTH_TEST);
        GLES20.glDisable(GLES20.GL_CULL_FACE);

        mRenderer.end();
    }

    private void renderVideoBackground(int viewId, int[] viewport, int vbVideoTextureUnit)
    {
        float[] vbProjectionMatrix = Tool.convert2GLMatrix(
                renderingPrimitives.getVideoBackgroundProjectionMatrix(viewId, COORDINATE_SYSTEM_TYPE.COORDINATE_SYSTEM_CAMERA)).getData();

        // Apply the scene scale on video see-through eyewear, to scale the video background and augmentation
        // so that the display lines up with the real world
        // This should not be applied on optical see-through devices, as there is no video background,
        // and the calibration ensures that the augmentation matches the real world
        if (Device.getInstance().isViewerActive())
        {
            float sceneScaleFactor = getSceneScaleFactor(viewId);
            Matrix.scaleM(vbProjectionMatrix, 0, sceneScaleFactor, sceneScaleFactor, 1.0f);

            // Apply a scissor around the video background, so that the augmentation doesn't 'bleed' outside it
            int [] scissorRect = getScissorRect(vbProjectionMatrix, viewport);

            GLES20.glEnable(GLES20.GL_SCISSOR_TEST);
            GLES20.glScissor(scissorRect[0], scissorRect[1], scissorRect[2], scissorRect[3]);
        }
        else
        {
            Matrix.scaleM(vbProjectionMatrix, 0, VuforiaSession.scaleFactor(), VuforiaSession.scaleFactor(), 1.0f);
        }

        GLES20.glDisable(GLES20.GL_DEPTH_TEST);
        GLES20.glDisable(GLES20.GL_CULL_FACE);

        Mesh vbMesh = renderingPrimitives.getVideoBackgroundMesh(viewId);
        // Load the shader and upload the vertex/texcoord/index data
        GLES20.glUseProgram(vbShaderProgramID);
        GLES20.glVertexAttribPointer(vbVertexHandle, 3, GLES20.GL_FLOAT, false, 0, vbMesh.getPositions().asFloatBuffer());
        GLES20.glVertexAttribPointer(vbTexCoordHandle, 2, GLES20.GL_FLOAT, false, 0, vbMesh.getUVs().asFloatBuffer());

        GLES20.glUniform1i(vbTexSampler2DHandle, vbVideoTextureUnit);

        // Render the video background with the custom shader
        // First, we enable the vertex arrays
        GLES20.glEnableVertexAttribArray(vbVertexHandle);
        GLES20.glEnableVertexAttribArray(vbTexCoordHandle);

        // Pass the projection matrix to OpenGL
        GLES20.glUniformMatrix4fv(vbProjectionMatrixHandle, 1, false, vbProjectionMatrix, 0);

        // Then, we issue the render call
        GLES20.glDrawElements(GLES20.GL_TRIANGLES, vbMesh.getNumTriangles() * 3, GLES20.GL_UNSIGNED_SHORT,
                vbMesh.getTriangles().asShortBuffer());

        // Finally, we disable the vertex arrays
        GLES20.glDisableVertexAttribArray(vbVertexHandle);
        GLES20.glDisableVertexAttribArray(vbTexCoordHandle);

        checkGLError("Rendering of the video background failed");
    }

    float getSceneScaleFactor(int viewId)
    {
        // Get the y-dimension of the physical camera field of view
        Vec2F fovVector = CameraDevice.getInstance().getCameraCalibration().getFieldOfViewRads();
        float cameraFovYRads = fovVector.getData()[1];

        // Get the y-dimension of the virtual camera field of view
        Vec4F virtualFovVector = renderingPrimitives.getEffectiveFov(viewId); // {left, right, bottom, top}
        float virtualFovYRads = virtualFovVector.getData()[2] + virtualFovVector.getData()[3];


        // The scene-scale factor represents the proportion of the viewport that is filled by
        // the video background when projected onto the same plane.
        // In order to calculate this, let 'd' be the distance between the cameras and the plane.
        // The height of the projected image 'h' on this plane can then be calculated:
        //   tan(fov/2) = h/2d
        // which rearranges to:
        //   2d = h/tan(fov/2)
        // Since 'd' is the same for both cameras, we can combine the equations for the two cameras:
        //   hPhysical/tan(fovPhysical/2) = hVirtual/tan(fovVirtual/2)
        // Which rearranges to:
        //   hPhysical/hVirtual = tan(fovPhysical/2)/tan(fovVirtual/2)
        // ... which is the scene-scale factor
        return (float) (Math.tan(cameraFovYRads / 2) / Math.tan(virtualFovYRads / 2));
    }


    // Shaders

    public static final String VB_VERTEX_SHADER =
            "attribute vec4 vertexPosition;\n" +
                    "attribute vec2 vertexTexCoord;\n" +
                    "uniform mat4 projectionMatrix;\n" +

                    "varying vec2 texCoord;\n" +

                    "void main()\n" +
                    "{\n" +
                    "    gl_Position = projectionMatrix * vertexPosition;\n" +
                    "    texCoord = vertexTexCoord;\n" +
                    "}\n";

    public static final String VB_FRAGMENT_SHADER =
            "precision mediump float;\n" +
                    "varying vec2 texCoord;\n" +
                    "uniform sampler2D texSampler2D;\n" +
                    "void main ()\n" +
                    "{\n" +
                    "    gl_FragColor = texture2D(texSampler2D, texCoord);\n" +
                    "}\n";

    private static final boolean DEBUG_GL = true;

    static int initShader(int shaderType, String source)
    {
        int shader = GLES20.glCreateShader(shaderType);
        if (shader != 0)
        {
            GLES20.glShaderSource(shader, source);
            GLES20.glCompileShader(shader);

            int[] glStatusVar = { GLES20.GL_FALSE };
            GLES20.glGetShaderiv(shader, GLES20.GL_COMPILE_STATUS, glStatusVar,
                    0);
            if (glStatusVar[0] == GLES20.GL_FALSE)
            {
                Log.e(LOGTAG, "Could NOT compile shader " + shaderType + " : "
                        + GLES20.glGetShaderInfoLog(shader));
                GLES20.glDeleteShader(shader);
                shader = 0;
            }

        }

        return shader;
    }

    public static int createProgramFromShaderSrc(String vertexShaderSrc,
                                                 String fragmentShaderSrc)
    {
        int vertShader = initShader(GLES20.GL_VERTEX_SHADER, vertexShaderSrc);
        int fragShader = initShader(GLES20.GL_FRAGMENT_SHADER,
                fragmentShaderSrc);
        if (vertShader == 0 || fragShader == 0)
            return 0;

        int program = GLES20.glCreateProgram();
        if (program != 0)
        {
            GLES20.glAttachShader(program, vertShader);
            checkGLError("glAttchShader(vert)");

            GLES20.glAttachShader(program, fragShader);
            checkGLError("glAttchShader(frag)");

            GLES20.glLinkProgram(program);
            int[] glStatusVar = { GLES20.GL_FALSE };
            GLES20.glGetProgramiv(program, GLES20.GL_LINK_STATUS, glStatusVar,
                    0);
            if (glStatusVar[0] == GLES20.GL_FALSE)
            {
                Log.e( LOGTAG,
                        "Could NOT link program : " + GLES20.glGetProgramInfoLog(program));
                GLES20.glDeleteProgram(program);
                program = 0;
            }
        }

        return program;
    }

    public static void checkGLError(String op)
    {
        if(DEBUG_GL)
        {
            for (int error = GLES20.glGetError(); error != 0; error = GLES20.glGetError())
                Log.e( LOGTAG, "After operation " + op + " got glError 0x"
                        + Integer.toHexString(error));
        }
    }

    // Use the matrix to project the extents of the video background to the viewport
    // This will generate normalised coordinates (ie full viewport has -1,+1 range)
    // to create a rectangle that can be used to set a scissor on the video background
    public static int[] getScissorRect(float [] projectionMatrix, int [] viewport)
    {
        float[] vbMin = {-1.0f, -1.0f, 0.0f, 1.0f};
        float[] vbMax = {1.0f,  1.0f, 0.0f, 1.0f};

        float [] viewportCentreToVBMin = {0.0f, 0.0f, 0.0f, 0.0f};
        float [] viewportCentreToVBMax = {0.0f, 0.0f, 0.0f, 0.0f};

        Matrix.multiplyMV(viewportCentreToVBMin, 0, projectionMatrix, 0, vbMin, 0);
        Matrix.multiplyMV(viewportCentreToVBMax, 0, projectionMatrix, 0, vbMax, 0);

        // Convert the normalised coordinates to screen pixels
        float pixelsPerUnitX = viewport[2] / 2.0f; // as left and right are 2 units apart
        float pixelsPerUnitY = viewport[3] / 2.0f; // as top and bottom are 2 units apart
        float screenMinToViewportCentrePixelsX = viewport[0] + pixelsPerUnitX;
        float screenMinToViewportCentrePixelsY = viewport[1] + pixelsPerUnitY;

        float viewportCentreToVBMinPixelsX = viewportCentreToVBMin[0] * pixelsPerUnitX;
        float viewportCentreToVBMinPixelsY = viewportCentreToVBMin[1] * pixelsPerUnitY;
        float viewportCentreToVBMaxPixelsX = viewportCentreToVBMax[0] * pixelsPerUnitX;
        float viewportCentreToVBMaxPixelsY = viewportCentreToVBMax[1] * pixelsPerUnitY;

        // Calculate the extents of the video background on the screen
        int videoX = (int)(screenMinToViewportCentrePixelsX + viewportCentreToVBMinPixelsX);
        int videoY = (int)(screenMinToViewportCentrePixelsY + viewportCentreToVBMinPixelsY);
        int videoWidth = (int)(viewportCentreToVBMaxPixelsX - viewportCentreToVBMinPixelsX);
        int videoHeight = (int)(viewportCentreToVBMaxPixelsY - viewportCentreToVBMinPixelsY);

        int [] scissorRect = {videoX, videoY, videoWidth, videoHeight};

        return scissorRect;
    }
}
