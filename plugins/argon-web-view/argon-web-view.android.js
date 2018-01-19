"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var dialogs = require("ui/dialogs");
var Argon = require("@argonjs/argon");
var webxr_1 = require("./webxr");
//import {Color} from "color";
console.log(io.argonjs);
var ArgonWebInterface = /** @class */ (function (_super) {
    __extends(ArgonWebInterface, _super);
    function ArgonWebInterface(callback) {
        var _this = _super.call(this) || this;
        _this.callback = callback;
        return global.__native(_this);
    }
    ArgonWebInterface.prototype.onArgonEvent = function (event, data) {
        this.callback(event, data);
    };
    return ArgonWebInterface;
}(io.argonjs.ArgonWebInterface));
// webkit cookie manager handles cookeis for android webviews
var webkitCookieManager = android.webkit.CookieManager.getInstance();
// set a default cookie handler for http requests
// (nativescript currently sets a default CookieHandler
// after a request is made, but this might change)
java.net.CookieHandler.setDefault(new java.net.CookieManager);
var ArgonWebView = /** @class */ (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this._instanceId = ++ArgonWebView._count + "";
        android.webkit.WebView.setWebContentsDebuggingEnabled(true);
        _this.on(view_1.View.loadedEvent, function () {
            // Make transparent
            //this.backgroundColor = new Color(0, 255, 255, 255);
            //this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            var webView = _this.android;
            var settings = webView.getSettings();
            var userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " Argon/" + Argon.version);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            webView.addJavascriptInterface(new ArgonWebInterface(function (event, data) {
                if (event === "argon") {
                    // just in case we thought below that the page was not an
                    // argon page, perhaps because argon.js loaded asyncronously 
                    // and the programmer didn't set up an argon meta tag
                    _this._setIsArgonPage(true);
                    _this._handleArgonMessage(data);
                }
                else if (event === "webxr") {
                    _this._handleWebXRMessage(data);
                }
            }), "__argon_android__");
            // Create a unique class name for 'extend' to bind the object to this particular webview
            var classname = "android_webkit_WebChromeClient_ArgonWebView_" + _this._instanceId;
            // Extend WebChromeClient to capture log output
            _this.android.setWebChromeClient(new (android.webkit.WebChromeClient.extend(classname, {
                onConsoleMessage: function (consoleMessage) {
                    var level = 'log';
                    if (consoleMessage.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.WARNING) {
                        level = 'warn';
                    }
                    else if (consoleMessage.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR) {
                        level = 'error';
                    }
                    var data = JSON.stringify({ type: level, message: consoleMessage.message() });
                    _this._handleLogMessage(data);
                    return false;
                },
                onGeolocationPermissionsShowPrompt: function (origin, callback) {
                    dialogs.confirm({
                        message: origin + " wants to use your device's location.",
                        okButtonText: "OK",
                        cancelButtonText: "Don't Allow"
                    }).then(function (result) {
                        if (result) {
                            callback.invoke(origin, true, false); // grant geolocation permission
                        }
                        else {
                            callback.invoke(origin, false, false); // deny geolocation permission
                        }
                    });
                },
                onProgressChanged: function (view, newProgress) {
                    common.progressProperty.nativeValueChange(_this, newProgress / 100);
                }
            })));
            classname = "android_webkit_WebViewClient_ArgonWebView_" + _this._instanceId;
            _this.android.setWebViewClient(new (android.webkit.WebViewClient.extend(classname, {
                shouldOverrideUrlLoading: function (webView, urlOrResponse) {
                    var url = typeof urlOrResponse === 'string' ? urlOrResponse : urlOrResponse.getUrl().toString();
                    console.log("Loading url" + url);
                    _this._loadUrlWithInjectedScript(url);
                    return true;
                }
            })));
        });
        _this.on(ArgonWebView.loadStartedEvent, function (args) {
            _this._didCommitNavigation();
            common.titleProperty.nativeValueChange(_this, args.url);
            common.titleProperty.nativeValueChange(_this, _this.android.getTitle());
        });
        _this.on(ArgonWebView.loadFinishedEvent, function (args) {
            _this.evaluateJavascript("(document.head.querySelector('meta[name=argon]') !== null || typeof(Argon) !== 'undefined')").then(function (result) {
                var boolResult = (result === "true");
                _this._setIsArgonPage(boolResult);
            });
            var webview = _this.android;
            var url = webview.getUrl();
            if (url != _this.url) {
                // the page did not successfully load
                if (url.startsWith("https")) {
                    // the certificate is likely invalid
                    dialogs.alert("Argon cannot currently load https pages with invalid certificates.").then(function () {
                        // do nothing for now
                    });
                }
            }
            common.titleProperty.nativeValueChange(_this, url);
            common.titleProperty.nativeValueChange(_this, _this.android.getTitle());
        });
        return _this;
    }
    ArgonWebView.prototype._loadUrlWithInjectedScript = function (url) {
        var _this = this;
        var webView = this.android;
        var cookieManager = java.net.CookieHandler.getDefault();
        var cookieStore = cookieManager.getCookieStore();
        console.log('url' + url);
        var cookieList = webkitCookieManager.getCookie(url);
        var uri = new java.net.URI(url);
        if (cookieList) {
            var cookieArray = cookieList.split(';');
            for (var _i = 0, cookieArray_1 = cookieArray; _i < cookieArray_1.length; _i++) {
                var cookie = cookieArray_1[_i];
                var cookieKeyValue = cookie.split('=');
                cookieStore.add(uri, new java.net.HttpCookie(cookieKeyValue[0], cookieKeyValue[1]));
            }
        }
        else {
            var cookies = cookieStore.get(uri);
            var numCookies = cookies.size();
            for (var i = 0; i < numCookies; i++) {
                var cookie = cookies.get(i);
                cookieStore.remove(uri, cookie);
            }
        }
        var loading = this._loadingPromise = fetch(url, { method: 'get' }).then(function (data) {
            return data.text();
        }).then(function (text) {
            if (loading === _this._loadingPromise) {
                // const $ = cheerio.load(text);
                // $('*').first().before(`<script>(${function() {
                //     window['ARGON_BROWSER'] = {
                //         postMessage(message:string) {
                //             window['__argon_android__'].emit('webxr', message);
                //         },
                //         onmessage: null
                //     }
                // }.toString()}());
                // ARGON_BROWSER.version = ${Argon.version};
                // (${WEBXR_API}());</script>`);
                // webView.loadDataWithBaseURL(
                //     url,
                //     $.html(),
                //     'text/html',
                //     'utf8',
                //     url
                // );
                var injectedScript = "<script>(" + function () {
                    window['ARGON_BROWSER'] = {
                        postMessage: function (message) {
                            window['__argon_android__'].emit('webxr', message);
                        },
                        onmessage: null
                    };
                }.toString() + "());\n                ARGON_BROWSER.version = " + Argon.version + ";\n                (" + webxr_1.WEBXR_API + "());</script>";
                webView.loadDataWithBaseURL(url, injectedScript + text, 'text/html', 'utf8', url);
            }
        });
    };
    ArgonWebView.prototype._setIsArgonPage = function (flag) {
        //console.log("_setIsArgonApp: " + flag);
        if (!this.isArgonPage && flag) {
            this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            common.isArgonPageProperty.nativeValueChange(this, true);
        }
        else if (this.isArgonPage && !flag) {
            this.android.setBackgroundColor(android.graphics.Color.WHITE);
            common.isArgonPageProperty.nativeValueChange(this, false);
        }
    };
    ArgonWebView.prototype.evaluateJavascript = function (script) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.android.evaluateJavascript(script, new android.webkit.ValueCallback({
                onReceiveValue: function (value) {
                    resolve(value);
                },
            }));
        });
    };
    ArgonWebView.prototype.evaluateJavascriptWithoutPromise = function (script) {
        this.android.evaluateJavascript(script, null);
    };
    ArgonWebView.prototype.bringToFront = function () {
        this.android.bringToFront();
    };
    ArgonWebView.prototype.getWebViewVersion = function () {
        var settings = this.android.getSettings();
        var userAgent = settings.getUserAgentString();
        var regex = /Chrome\/([0-9]+)/i;
        var match = regex.exec(userAgent);
        if (match != null && match.length > 1) {
            return Number(match[1]);
        }
        return -1;
    };
    ArgonWebView._count = 1;
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBa0Q7QUFFbEQscUNBQWtDO0FBQ2xDLG9DQUF1QztBQUN2QyxzQ0FBd0M7QUFDeEMsaUNBQWtDO0FBQ2xDLDhCQUE4QjtBQUU5QixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUV2QjtJQUFnQyxxQ0FBNEI7SUFDeEQsMkJBQW1CLFFBQTBDO1FBQTdELFlBQ0ksaUJBQU8sU0FFVjtRQUhrQixjQUFRLEdBQVIsUUFBUSxDQUFrQztRQUV6RCxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQ0Qsd0NBQVksR0FBWixVQUFhLEtBQVksRUFBRSxJQUFXO1FBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFDTCx3QkFBQztBQUFELENBQUMsQUFSRCxDQUFnQyxFQUFFLENBQUMsT0FBTyxDQUFDLGlCQUFpQixHQVEzRDtBQUVELDZEQUE2RDtBQUM3RCxJQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBRXZFLGlEQUFpRDtBQUNqRCx1REFBdUQ7QUFDdkQsa0RBQWtEO0FBQ2xELElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFOUQ7SUFBa0MsZ0NBQW1CO0lBS2pEO1FBQUEsWUFDSSxpQkFBTyxTQXFHVjtRQXhHTyxpQkFBVyxHQUFVLEVBQUUsWUFBWSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFLOUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxP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ZWItdmlldy1jb21tb25cIjtcbmltcG9ydCB7TG9hZEV2ZW50RGF0YX0gZnJvbSBcInVpL3dlYi12aWV3XCI7XG5pbXBvcnQge1ZpZXd9IGZyb20gXCJ1aS9jb3JlL3ZpZXdcIjtcbmltcG9ydCBkaWFsb2dzID0gcmVxdWlyZShcInVpL2RpYWxvZ3NcIik7XG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbic7XG5pbXBvcnQge1dFQlhSX0FQSX0gZnJvbSAnLi93ZWJ4cic7XG4vL2ltcG9ydCB7Q29sb3J9IGZyb20gXCJjb2xvclwiO1xuXG5jb25zb2xlLmxvZyhpby5hcmdvbmpzKVxuXG5jbGFzcyBBcmdvbldlYkludGVyZmFjZSBleHRlbmRzIGlvLmFyZ29uanMuQXJnb25XZWJJbnRlcmZhY2Uge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjYWxsYmFjazooZXZlbnQ6c3RyaW5nLCBkYXRhOnN0cmluZyk9PnZvaWQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgcmV0dXJuIGdsb2JhbC5fX25hdGl2ZSh0aGlzKTtcbiAgICB9XG4gICAgb25BcmdvbkV2ZW50KGV2ZW50OnN0cmluZywgZGF0YTpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayhldmVudCwgZGF0YSk7XG4gICAgfVxufVxuXG4vLyB3ZWJraXQgY29va2llIG1hbmFnZXIgaGFuZGxlcyBjb29rZWlzIGZvciBhbmRyb2lkIHdlYnZpZXdzXG5jb25zdCB3ZWJraXRDb29raWVNYW5hZ2VyID0gYW5kcm9pZC53ZWJraXQuQ29va2llTWFuYWdlci5nZXRJbnN0YW5jZSgpO1xuXG4vLyBzZXQgYSBkZWZhdWx0IGNvb2tpZSBoYW5kbGVyIGZvciBodHRwIHJlcXVlc3RzXG4vLyAobmF0aXZlc2NyaXB0IGN1cnJlbnRseSBzZXRzIGEgZGVmYXVsdCBDb29raWVIYW5kbGVyXG4vLyBhZnRlciBhIHJlcXVlc3QgaXMgbWFkZSwgYnV0IHRoaXMgbWlnaHQgY2hhbmdlKVxuamF2YS5uZXQuQ29va2llSGFuZGxlci5zZXREZWZhdWx0KG5ldyBqYXZhLm5ldC5Db29raWVNYW5hZ2VyKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcge1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgX2NvdW50Om51bWJlciA9IDE7XG4gICAgcHJpdmF0ZSBfaW5zdGFuY2VJZDpzdHJpbmcgPSArK0FyZ29uV2ViVmlldy5fY291bnQgKyBcIlwiO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgKDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViVmlldykuc2V0V2ViQ29udGVudHNEZWJ1Z2dpbmdFbmFibGVkKHRydWUpO1xuXG4gICAgICAgIHRoaXMub24oVmlldy5sb2FkZWRFdmVudCwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gTWFrZSB0cmFuc3BhcmVudFxuICAgICAgICAgICAgLy90aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICAgICAgICAgIC8vdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcblxuICAgICAgICAgICAgY29uc3Qgd2ViVmlldyA9IDxhbmRyb2lkLndlYmtpdC5XZWJWaWV3PnRoaXMuYW5kcm9pZDtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gd2ViVmlldy5nZXRTZXR0aW5ncygpO1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gc2V0dGluZ3MuZ2V0VXNlckFnZW50U3RyaW5nKCk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRVc2VyQWdlbnRTdHJpbmcodXNlckFnZW50ICsgXCIgQXJnb24vXCIgKyBBcmdvbi52ZXJzaW9uKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldEphdmFTY3JpcHRFbmFibGVkKHRydWUpO1xuICAgICAgICAgICAgc2V0dGluZ3Muc2V0RG9tU3RvcmFnZUVuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgICAgIHdlYlZpZXcuYWRkSmF2YXNjcmlwdEludGVyZmFjZShuZXcgQXJnb25XZWJJbnRlcmZhY2UoKGV2ZW50LCBkYXRhKT0+e1xuICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gXCJhcmdvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGp1c3QgaW4gY2FzZSB3ZSB0aG91Z2h0IGJlbG93IHRoYXQgdGhlIHBhZ2Ugd2FzIG5vdCBhblxuICAgICAgICAgICAgICAgICAgICAvLyBhcmdvbiBwYWdlLCBwZXJoYXBzIGJlY2F1c2UgYXJnb24uanMgbG9hZGVkIGFzeW5jcm9ub3VzbHkgXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldElzQXJnb25QYWdlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVBcmdvbk1lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudCA9PT0gXCJ3ZWJ4clwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVdlYlhSTWVzc2FnZShkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSwgXCJfX2FyZ29uX2FuZHJvaWRfX1wiKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgdW5pcXVlIGNsYXNzIG5hbWUgZm9yICdleHRlbmQnIHRvIGJpbmQgdGhlIG9iamVjdCB0byB0aGlzIHBhcnRpY3VsYXIgd2Vidmlld1xuICAgICAgICAgICAgdmFyIGNsYXNzbmFtZSA9IFwiYW5kcm9pZF93ZWJraXRfV2ViQ2hyb21lQ2xpZW50X0FyZ29uV2ViVmlld19cIiArIHRoaXMuX2luc3RhbmNlSWQ7XG5cbiAgICAgICAgICAgIC8vIEV4dGVuZCBXZWJDaHJvbWVDbGllbnQgdG8gY2FwdHVyZSBsb2cgb3V0cHV0XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0V2ViQ2hyb21lQ2xpZW50KG5ldyAoKDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViQ2hyb21lQ2xpZW50KS5leHRlbmQoY2xhc3NuYW1lLCB7XG4gICAgICAgICAgICAgICAgb25Db25zb2xlTWVzc2FnZTogKGNvbnNvbGVNZXNzYWdlOiBhbmRyb2lkLndlYmtpdC5Db25zb2xlTWVzc2FnZSk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGV2ZWwgPSAnbG9nJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGVNZXNzYWdlLm1lc3NhZ2VMZXZlbCgpID09IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlLk1lc3NhZ2VMZXZlbC5XQVJOSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbCA9ICd3YXJuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlTWVzc2FnZS5tZXNzYWdlTGV2ZWwoKSA9PSBhbmRyb2lkLndlYmtpdC5Db25zb2xlTWVzc2FnZS5NZXNzYWdlTGV2ZWwuRVJST1IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IEpTT04uc3RyaW5naWZ5KHt0eXBlOmxldmVsLCBtZXNzYWdlOmNvbnNvbGVNZXNzYWdlLm1lc3NhZ2UoKX0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVMb2dNZXNzYWdlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkdlb2xvY2F0aW9uUGVybWlzc2lvbnNTaG93UHJvbXB0OiAob3JpZ2luOiBzdHJpbmcsIGNhbGxiYWNrOiBhbmRyb2lkLndlYmtpdC5HZW9sb2NhdGlvblBlcm1pc3Npb25zLklDYWxsYmFjayk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmNvbmZpcm0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogb3JpZ2luICsgXCIgd2FudHMgdG8gdXNlIHlvdXIgZGV2aWNlJ3MgbG9jYXRpb24uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBva0J1dHRvblRleHQ6IFwiT0tcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwiRG9uJ3QgQWxsb3dcIlxuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmludm9rZShvcmlnaW4sIHRydWUsIGZhbHNlKTsgLy8gZ3JhbnQgZ2VvbG9jYXRpb24gcGVybWlzc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5pbnZva2Uob3JpZ2luLCBmYWxzZSwgZmFsc2UpOyAvLyBkZW55IGdlb2xvY2F0aW9uIHBlcm1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzQ2hhbmdlZDogKHZpZXc6IGFuZHJvaWQud2Via2l0LldlYlZpZXcsIG5ld1Byb2dyZXNzOiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29tbW9uLnByb2dyZXNzUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgbmV3UHJvZ3Jlc3MgLyAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKSk7XG5cbiAgICAgICAgICAgIGNsYXNzbmFtZSA9IFwiYW5kcm9pZF93ZWJraXRfV2ViVmlld0NsaWVudF9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLl9pbnN0YW5jZUlkO1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldFdlYlZpZXdDbGllbnQobmV3ICgoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJWaWV3Q2xpZW50KS5leHRlbmQoY2xhc3NuYW1lLCB7XG4gICAgICAgICAgICAgICAgc2hvdWxkT3ZlcnJpZGVVcmxMb2FkaW5nOiAod2ViVmlldzphbmRyb2lkLndlYmtpdC5XZWJWaWV3LCB1cmxPclJlc3BvbnNlOnN0cmluZ3xhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gdHlwZW9mIHVybE9yUmVzcG9uc2UgPT09ICdzdHJpbmcnID8gdXJsT3JSZXNwb25zZSA6IHVybE9yUmVzcG9uc2UuZ2V0VXJsKCkudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRpbmcgdXJsXCIgKyB1cmwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb2FkVXJsV2l0aEluamVjdGVkU2NyaXB0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub24oQXJnb25XZWJWaWV3LmxvYWRTdGFydGVkRXZlbnQsIChhcmdzOkxvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2RpZENvbW1pdE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIGNvbW1vbi50aXRsZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIGFyZ3MudXJsKTtcbiAgICAgICAgICAgIGNvbW1vbi50aXRsZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIHRoaXMuYW5kcm9pZC5nZXRUaXRsZSgpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5vbihBcmdvbldlYlZpZXcubG9hZEZpbmlzaGVkRXZlbnQsIChhcmdzOkxvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVKYXZhc2NyaXB0KFwiKGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPWFyZ29uXScpICE9PSBudWxsIHx8IHR5cGVvZihBcmdvbikgIT09ICd1bmRlZmluZWQnKVwiLCApLnRoZW4oKHJlc3VsdDpzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgYm9vbFJlc3VsdCA9IChyZXN1bHQgPT09IFwidHJ1ZVwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRJc0FyZ29uUGFnZShib29sUmVzdWx0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3Qgd2VidmlldyA9ICh0aGlzLmFuZHJvaWQgYXMgYW5kcm9pZC53ZWJraXQuV2ViVmlldyk7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSB3ZWJ2aWV3LmdldFVybCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodXJsICE9IHRoaXMudXJsKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhlIHBhZ2UgZGlkIG5vdCBzdWNjZXNzZnVsbHkgbG9hZFxuICAgICAgICAgICAgICAgIGlmICh1cmwuc3RhcnRzV2l0aChcImh0dHBzXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjZXJ0aWZpY2F0ZSBpcyBsaWtlbHkgaW52YWxpZFxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFsZXJ0KFwiQXJnb24gY2Fubm90IGN1cnJlbnRseSBsb2FkIGh0dHBzIHBhZ2VzIHdpdGggaW52YWxpZCBjZXJ0aWZpY2F0ZXMuXCIpLnRoZW4oKCk9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nIGZvciBub3dcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb21tb24udGl0bGVQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB1cmwpO1xuICAgICAgICAgICAgY29tbW9uLnRpdGxlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9sb2FkaW5nUHJvbWlzZT86UHJvbWlzZTx2b2lkPjtcblxuICAgIHByaXZhdGUgX2xvYWRVcmxXaXRoSW5qZWN0ZWRTY3JpcHQodXJsOnN0cmluZykge1xuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gPGFuZHJvaWQud2Via2l0LldlYlZpZXc+dGhpcy5hbmRyb2lkO1xuICAgICAgICBjb25zdCBjb29raWVNYW5hZ2VyID0gPGphdmEubmV0LkNvb2tpZU1hbmFnZXI+amF2YS5uZXQuQ29va2llSGFuZGxlci5nZXREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGNvb2tpZVN0b3JlID0gY29va2llTWFuYWdlci5nZXRDb29raWVTdG9yZSgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCd1cmwnICsgdXJsKTtcblxuICAgICAgICBjb25zdCBjb29raWVMaXN0ID0gd2Via2l0Q29va2llTWFuYWdlci5nZXRDb29raWUodXJsKTtcblxuICAgICAgICBjb25zdCB1cmkgPSBuZXcgamF2YS5uZXQuVVJJKHVybCk7XG5cbiAgICAgICAgaWYgKGNvb2tpZUxpc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvb2tpZUFycmF5ID0gY29va2llTGlzdC5zcGxpdCgnOycpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjb29raWUgb2YgY29va2llQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29raWVLZXlWYWx1ZSA9IGNvb2tpZS5zcGxpdCgnPScpO1xuICAgICAgICAgICAgICAgIGNvb2tpZVN0b3JlLmFkZCh1cmksIG5ldyBqYXZhLm5ldC5IdHRwQ29va2llKGNvb2tpZUtleVZhbHVlWzBdLCBjb29raWVLZXlWYWx1ZVsxXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY29va2llcyA9IGNvb2tpZVN0b3JlLmdldCh1cmkpO1xuICAgICAgICAgICAgY29uc3QgbnVtQ29va2llcyA9IGNvb2tpZXMuc2l6ZSgpO1xuICAgICAgICAgICAgZm9yIChsZXQgaT0wOyBpIDwgbnVtQ29va2llczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29va2llID0gY29va2llcy5nZXQoaSk7XG4gICAgICAgICAgICAgICAgY29va2llU3RvcmUucmVtb3ZlKHVyaSwgY29va2llKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbG9hZGluZyA9IHRoaXMuX2xvYWRpbmdQcm9taXNlID0gZmV0Y2godXJsLCB7bWV0aG9kOiAnZ2V0J30pLnRoZW4oKGRhdGEpPT57XG4gICAgICAgICAgICByZXR1cm4gZGF0YS50ZXh0KCkgXG4gICAgICAgIH0pLnRoZW4oKHRleHQpPT57XG4gICAgICAgICAgICBpZiAobG9hZGluZyA9PT0gdGhpcy5fbG9hZGluZ1Byb21pc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCAkID0gY2hlZXJpby5sb2FkKHRleHQpO1xuICAgICAgICAgICAgICAgIC8vICQoJyonKS5maXJzdCgpLmJlZm9yZShgPHNjcmlwdD4oJHtmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgd2luZG93WydBUkdPTl9CUk9XU0VSJ10gPSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBwb3N0TWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIHdpbmRvd1snX19hcmdvbl9hbmRyb2lkX18nXS5lbWl0KCd3ZWJ4cicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG9ubWVzc2FnZTogbnVsbFxuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfS50b1N0cmluZygpfSgpKTtcbiAgICAgICAgICAgICAgICAvLyBBUkdPTl9CUk9XU0VSLnZlcnNpb24gPSAke0FyZ29uLnZlcnNpb259O1xuICAgICAgICAgICAgICAgIC8vICgke1dFQlhSX0FQSX0oKSk7PC9zY3JpcHQ+YCk7XG4gICAgICAgICAgICAgICAgLy8gd2ViVmlldy5sb2FkRGF0YVdpdGhCYXNlVVJMKFxuICAgICAgICAgICAgICAgIC8vICAgICB1cmwsXG4gICAgICAgICAgICAgICAgLy8gICAgICQuaHRtbCgpLFxuICAgICAgICAgICAgICAgIC8vICAgICAndGV4dC9odG1sJyxcbiAgICAgICAgICAgICAgICAvLyAgICAgJ3V0ZjgnLFxuICAgICAgICAgICAgICAgIC8vICAgICB1cmxcbiAgICAgICAgICAgICAgICAvLyApO1xuXG4gICAgICAgICAgICAgICAgdmFyIGluamVjdGVkU2NyaXB0ID0gYDxzY3JpcHQ+KCR7ZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvd1snQVJHT05fQlJPV1NFUiddID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zdE1lc3NhZ2UobWVzc2FnZTpzdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dbJ19fYXJnb25fYW5kcm9pZF9fJ10uZW1pdCgnd2VieHInLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvbm1lc3NhZ2U6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0udG9TdHJpbmcoKX0oKSk7XG4gICAgICAgICAgICAgICAgQVJHT05fQlJPV1NFUi52ZXJzaW9uID0gJHtBcmdvbi52ZXJzaW9ufTtcbiAgICAgICAgICAgICAgICAoJHtXRUJYUl9BUEl9KCkpOzwvc2NyaXB0PmA7XG5cbiAgICAgICAgICAgICAgICB3ZWJWaWV3LmxvYWREYXRhV2l0aEJhc2VVUkwoXG4gICAgICAgICAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgICAgICAgICAgaW5qZWN0ZWRTY3JpcHQgKyB0ZXh0LFxuICAgICAgICAgICAgICAgICAgICAndGV4dC9odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgJ3V0ZjgnLFxuICAgICAgICAgICAgICAgICAgICB1cmxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfc2V0SXNBcmdvblBhZ2UoZmxhZzpib29sZWFuKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJfc2V0SXNBcmdvbkFwcDogXCIgKyBmbGFnKTtcbiAgICAgICAgaWYgKCF0aGlzLmlzQXJnb25QYWdlICYmIGZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5UUkFOU1BBUkVOVCk7XG4gICAgICAgICAgICBjb21tb24uaXNBcmdvblBhZ2VQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzQXJnb25QYWdlICYmICFmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuV0hJVEUpO1xuICAgICAgICAgICAgY29tbW9uLmlzQXJnb25QYWdlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdCwgbmV3IGFuZHJvaWQud2Via2l0LlZhbHVlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIG9uUmVjZWl2ZVZhbHVlOiAodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0LCBudWxsKTtcbiAgICB9XG5cbiAgICBicmluZ1RvRnJvbnQoKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5icmluZ1RvRnJvbnQoKTtcbiAgICB9XG5cbiAgICBnZXRXZWJWaWV3VmVyc2lvbigpIDogbnVtYmVyIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSA8YW5kcm9pZC53ZWJraXQuV2ViU2V0dGluZ3M+IHRoaXMuYW5kcm9pZC5nZXRTZXR0aW5ncygpO1xuICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBzZXR0aW5ncy5nZXRVc2VyQWdlbnRTdHJpbmcoKTtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvQ2hyb21lXFwvKFswLTldKykvaTtcbiAgICAgICAgdmFyIG1hdGNoID0gcmVnZXguZXhlYyh1c2VyQWdlbnQpO1xuICAgICAgICBpZiAobWF0Y2ggIT0gbnVsbCAmJiBtYXRjaC5sZW5ndGggPiAxKXtcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIobWF0Y2hbMV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59XG4iXX0=