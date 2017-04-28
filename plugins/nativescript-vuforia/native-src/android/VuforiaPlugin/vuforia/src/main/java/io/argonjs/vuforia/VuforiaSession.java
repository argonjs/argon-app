/*===============================================================================
Based on com.vuforia.samples.SampleApplication.SampleApplicationSession

Copyright (c) 2015-2016 PTC Inc. All Rights Reserved.


Copyright (c) 2012-2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.
===============================================================================*/

package io.argonjs.vuforia;

import android.app.Activity;
import android.graphics.Point;
import android.os.AsyncTask;
import android.util.Log;

import com.vuforia.CameraDevice;
import com.vuforia.Renderer;
import com.vuforia.Vec2I;
import com.vuforia.VideoBackgroundConfig;
import com.vuforia.VideoMode;
import com.vuforia.Vuforia;

public class VuforiaSession {

    private static final String LOGTAG = "VuforiaSession";

    private static float scaleFactorValue = 1;

    // An object used for synchronizing Vuforia initialization, dataset loading
    // and the Android onDestroy() life cycle event. If the application is
    // destroyed while a data set is still being loaded, then we wait for the
    // loading operation to finish before shutting down Vuforia:
    private static Object mShutdownLock = new Object();

    public static void setLicenseKey(Activity activity, String licenseKey) {
        Vuforia.setInitParameters(activity, Vuforia.GL_20, licenseKey);
    }

    public static void init(VuforiaControl vuforiaControl) {

        try
        {
            InitVuforiaTask initVuforiaTask = new InitVuforiaTask();
            initVuforiaTask.execute(vuforiaControl);
        } catch (Exception e)
        {
            String logMessage = "Initializing Vuforia SDK failed";
            Log.e(LOGTAG, logMessage);
        }
    }

    public static void setScaleFactor(float f) {
        scaleFactorValue = f;
    }

    public static float scaleFactor() {
        return scaleFactorValue;
    }

    // An async task to initialize Vuforia asynchronously.
    private static class InitVuforiaTask extends AsyncTask<VuforiaControl, Integer, Integer>
    {
        // Initialize with invalid value:
        private int mProgressValue = -1;

        private VuforiaControl vuforiaControl;

        protected Integer doInBackground(VuforiaControl... params)
        {
            vuforiaControl = params[0];

            // Prevent the onDestroy() method to overlap with initialization:
            synchronized (mShutdownLock)
            {
                do
                {
                    // Vuforia.init() blocks until an initialization step is
                    // complete, then it proceeds to the next step and reports
                    // progress in percents (0 ... 100%).
                    // If Vuforia.init() returns -1, it indicates an error.
                    // Initialization is done when progress has reached 100%.
                    mProgressValue = Vuforia.init();

                    // Publish the progress value:
                    publishProgress(mProgressValue);

                    // We check whether the task has been canceled in the
                    // meantime (by calling AsyncTask.cancel(true)).
                    // and bail out if it has, thus stopping this thread.
                    // This is necessary as the AsyncTask will run to completion
                    // regardless of the status of the component that
                    // started is.
                } while (!isCancelled() && mProgressValue >= 0
                        && mProgressValue < 100);

                return mProgressValue;
            }
        }

        protected void onPostExecute(Integer result) {
            // Done initializing Vuforia, proceed to next application
            // initialization status:

            if (result > 0) {
                Log.d(LOGTAG, "InitVuforiaTask.onPostExecute: Vuforia "
                        + "initialization successful");
            } else {
                // Log error:
                Log.e(LOGTAG, "InitVuforiaTask.onPostExecute: " + mProgressValue
                        + " Exiting.");
            }

            vuforiaControl.onInitARDone(result);
        }
    }

    public static void startCamera(Activity activity) {

        String error;

        if (!CameraDevice.getInstance().init(CameraDevice.CAMERA_DIRECTION.CAMERA_DIRECTION_DEFAULT))
        {
            error = "Unable to open camera device";
            Log.e(LOGTAG, error);
        }

        if (!CameraDevice.getInstance().selectVideoMode(
                CameraDevice.MODE.MODE_DEFAULT))
        {
            error = "Unable to set video mode";
            Log.e(LOGTAG, error);
        }

        // Configure the rendering of the video background
        configureVideoBackground(activity);

        if (!CameraDevice.getInstance().start())
        {
            error = "Unable to start camera device";
            Log.e(LOGTAG, error);
        }
    }

    // Configures the video mode and sets offsets for the camera's image
    private static void configureVideoBackground(Activity activity)
    {
        boolean isPortrait = false;

        Point size = new Point();
        activity.getWindowManager().getDefaultDisplay().getRealSize(size);
        int screenWidth = size.x;
        int screenHeight = size.y;

        CameraDevice cameraDevice = CameraDevice.getInstance();
        VideoMode vm = cameraDevice.getVideoMode(CameraDevice.MODE.MODE_DEFAULT);

        VideoBackgroundConfig config = new VideoBackgroundConfig();
        config.setEnabled(true);
        config.setPosition(new Vec2I(0, 0));

        int xSize, ySize;
        if (isPortrait)
        {
            xSize = (int) (vm.getHeight() * (screenHeight / (float) vm
                    .getWidth()));
            ySize = screenHeight;

            if (xSize < screenWidth)
            {
                xSize = screenWidth;
                ySize = (int) (screenWidth * (vm.getWidth() / (float) vm
                        .getHeight()));
            }
        } else
        {
            xSize = screenWidth;
            ySize = (int) (vm.getHeight() * (screenWidth / (float) vm
                    .getWidth()));

            if (ySize < screenHeight)
            {
                xSize = (int) (screenHeight * (vm.getWidth() / (float) vm
                        .getHeight()));
                ySize = screenHeight;
            }
        }

        config.setSize(new Vec2I(xSize, ySize));

        Log.i(LOGTAG, "Configure Video Background : Video (" + vm.getWidth()
                + " , " + vm.getHeight() + "), Screen (" + screenWidth + " , "
                + screenHeight + "), mSize (" + xSize + " , " + ySize + ")");

        Renderer.getInstance().setVideoBackgroundConfig(config);
    }
}
