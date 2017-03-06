package io.argonjs.example;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Point;
import android.os.Bundle;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Toast;

import com.vuforia.CameraDevice;
import com.vuforia.Device;
import com.vuforia.Renderer;
import com.vuforia.Vec2I;
import com.vuforia.VideoBackgroundConfig;
import com.vuforia.VideoMode;
import com.vuforia.Vuforia;

import io.argonjs.vuforia.VuforiaControl;
import io.argonjs.vuforia.VuforiaGLView;
import io.argonjs.vuforia.VuforiaRenderer;
import io.argonjs.vuforia.VuforiaSession;

public class ExampleActivity extends Activity implements VuforiaControl, ActivityCompat.OnRequestPermissionsResultCallback {

    private static final String LOGTAG = "MainActivity";

    // Put your Vuforia license key here
    private static final String LICENSE_KEY = "";

    private static final int PERMISSIONS_REQUEST_CAMERA = 1;

    private boolean mStarted = false;

    // Our OpenGL view:
    private VuforiaGLView mGlView;

    // Our renderer:
    private VuforiaRenderer mRenderer;

    // Set to true to test Viewer mode
    boolean mIsStereo = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        this.requestWindowFeature(Window.FEATURE_NO_TITLE);
        View decorView = getWindow().getDecorView();
        int uiOptions = View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN;
        decorView.setSystemUiVisibility(uiOptions);

        String version = Vuforia.getLibraryVersion();
        System.out.println("version: " + version);

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {

            initializeVuforia();

        } else {

            // Should we show an explanation?
            if (ActivityCompat.shouldShowRequestPermissionRationale(this,
                    Manifest.permission.CAMERA)) {

                Toast.makeText(this, "Your camera is used to provide an augmented reality experience", Toast.LENGTH_LONG).show();
            }

            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA},
                    PERMISSIONS_REQUEST_CAMERA);
        }
    }

    public void onRequestPermissionsResult(int requestCode,
                                           String permissions[], int[] grantResults) {

        switch (requestCode) {
            case PERMISSIONS_REQUEST_CAMERA: {
                // If request is cancelled, the result arrays are empty.
                if (grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED) {

                    System.out.println("camera permission granted");
                    initializeVuforia();

                } else {
                    System.out.println("camera permission denied");
                }
                return;
            }
        }
    }

    private void initializeVuforia() {
        VuforiaSession.setLicenseKey(this, LICENSE_KEY);
        VuforiaSession.init(this);
    }

    // Called when the system is about to start resuming a previous activity.
    @Override
    protected void onPause()
    {
        Log.d(LOGTAG, "onPause");
        super.onPause();

        if (mGlView != null)
        {
            mGlView.setVisibility(View.INVISIBLE);
            mGlView.onPause();
        }

        if (mStarted) {
            CameraDevice.getInstance().stop();
            CameraDevice.getInstance().deinit();
        }
        Vuforia.onPause();
    }

    // Called when the activity will start interacting with the user.
    @Override
    protected void onResume()
    {
        Log.d(LOGTAG, "onResume");
        super.onResume();

        Vuforia.onResume();
        if (mStarted) {
            VuforiaSession.startCamera(this);
        }

        // Resume the GL view:
        if (mGlView != null)
        {
            mGlView.setVisibility(View.VISIBLE);
            mGlView.onResume();
        }
    }

    @Override
    public void onInitARDone(int result)
    {
        if (result > 0)
        {
            initApplicationAR();

            mRenderer.mIsActive = true;

            // Now add the GL surface view. It is important
            // that the OpenGL ES surface view gets added
            // BEFORE the camera is started and video
            // background is configured.
            addContentView(mGlView, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT));

            VuforiaSession.startCamera(this);
            mStarted = true;
        }
    }

    // Initializes AR application components.
    private void initApplicationAR()
    {
        // Create OpenGL ES view:
        int depthSize = 16;
        int stencilSize = 0;
        boolean translucent = Vuforia.requiresAlpha();

        mGlView = new VuforiaGLView(this);
        mGlView.init(translucent, depthSize, stencilSize);

        Device device = Device.getInstance();
        device.setViewerActive(mIsStereo);

        mRenderer = new VuforiaRenderer();
        mGlView.setRenderer(mRenderer);

        VuforiaSession.setScaleFactor(1.0f);
    }
}
