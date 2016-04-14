package io.argonjs;

import android.webkit.JavascriptInterface;
import android.util.Log;

/**
 * Created by Michael Eden on 4/14/16.
 */
@SuppressWarnings({"unused", "synthetic-access"})
public abstract class AndroidWebInterface {

    public void test() {
        Log.i("[ARGON WEB INTERFACE]", "Called test function.");
    }

    @JavascriptInterface
    public void emit(String event, String json) {
        onArgonEvent(event, json);
    }

    public abstract void onArgonEvent(String event, String json);
}
