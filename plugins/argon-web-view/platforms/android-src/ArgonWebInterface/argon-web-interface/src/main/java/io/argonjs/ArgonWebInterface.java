package io.argonjs;

import android.webkit.JavascriptInterface;

@SuppressWarnings({"unused"})
public abstract class ArgonWebInterface {

    public ArgonWebInterface() {}

    @JavascriptInterface
    public void emit(String event, String json) {
        onArgonEvent(event, json);
    }

    public abstract void onArgonEvent(String event, String json);
}
