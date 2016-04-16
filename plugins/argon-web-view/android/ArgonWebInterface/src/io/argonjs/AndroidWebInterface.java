package io.argonjs;

import android.webkit.JavascriptInterface;

/**
 * Created by Michael Eden on 4/14/16.
 */
@SuppressWarnings({"unused", "synthetic-access"})
public abstract class AndroidWebInterface {
    @JavascriptInterface
    public void emit(String event, String json) {
        onArgonEvent(event, json);
    }

    public abstract void onArgonEvent(String event, String json);
}
