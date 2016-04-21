package io.argonjs;

import android.webkit.JavascriptInterface;

/**
 * Created by Michael Eden on 4/14/16.
 */
@SuppressWarnings({"unused", "synthetic-access"})
public abstract class AndroidWebInterface {
    private String id;

    public AndroidWebInterface(String id) {
        this.id = id;
    }

    @JavascriptInterface
    public void emit(String event, String json) {
        onArgonEvent(id, event, json);
    }

    public abstract void onArgonEvent(String id, String event, String json);
}
