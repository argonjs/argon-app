"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var dialogs = require("ui/dialogs");
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
            settings.setUserAgentString(userAgent + " ArgonXR/" + common.PROTOCOL_VERSION_STRING);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            webView.addJavascriptInterface(new ArgonWebInterface(function (event, data) {
                if (event === "argon") {
                    // just in case we thought below that the page was not an
                    // argon page, perhaps because argon.js loaded asyncronously 
                    // and the programmer didn't set up an argon meta tag
                    // this._setIsArgonPage(true);
                    _this._handleArgonMessage(data);
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
            common.urlProperty.nativeValueChange(_this, url);
            common.titleProperty.nativeValueChange(_this, webview.getTitle());
            if (args.error) {
                // the page did not successfully load
                // if (url.startsWith("https")) {
                //     // the certificate is likely invalid
                //     dialogs.alert("Argon cannot currently load https pages with invalid certificates.").then(()=> {
                //         // do nothing for now
                //     });
                // }
                dialogs.alert(args.error);
            }
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
                //             window['__argon_android__'].emit('argon', message);
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
                        xr: true,
                        postMessage: function (message) {
                            window['__argon_android__'].emit('argon', message);
                        },
                        onmessage: null
                    };
                }.toString() + "());\n                (" + webxr_1.WEBXR_API + "());</script>";
                webView.loadDataWithBaseURL(url, injectedScript + text, 'text/html', 'utf8', url);
            }
        });
    };
    ArgonWebView.prototype._setIsArgonPage = function (flag) {
        //console.log("_setIsArgonApp: " + flag);
        if (!this.isArgonPage && flag) {
            this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            // common.isArgonPageProperty.nativeValueChange(this, true);
        }
        else if (this.isArgonPage && !flag) {
            this.android.setBackgroundColor(android.graphics.Color.WHITE);
            // common.isArgonPageProperty.nativeValueChange(this, false);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQWtEO0FBRWxELHFDQUFrQztBQUNsQyxvQ0FBdUM7QUFDdkMsaUNBQWtDO0FBQ2xDLDhCQUE4QjtBQUU5QixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUV2QjtJQUFnQyxxQ0FBNEI7SUFDeEQsMkJBQW1CLFFBQTBDO1FBQTdELFlBQ0ksaUJBQU8sU0FFVjtRQUhrQixjQUFRLEdBQVIsUUFBUSxDQUFrQztRQUV6RCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUNELHdDQUFZLEdBQVosVUFBYSxLQUFZLEVBQUUsSUFBVztRQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBQ0wsd0JBQUM7QUFBRCxDQUFDLEFBUkQsQ0FBZ0MsRUFBRSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsR0FRM0Q7QUFFRCw2REFBNkQ7QUFDN0QsSUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUV2RSxpREFBaUQ7QUFDakQsdURBQXVEO0FBQ3ZELGtEQUFrRDtBQUNsRCxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRTlEO0lBQWtDLGdDQUFtQjtJQUtqRDtRQUFBLFlBQ0ksaUJBQU8sU0FxR1Y7UUF4R08saUJBQVcsR0FBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBSzdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBUSxDQUFD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Q0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzQjtRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDO0lBMU5jLG1CQUFNLEdBQVUsQ0FBQyxDQUFDO0lBMk5yQyxtQkFBQztDQUFBLEFBN05ELENBQWtDLE1BQU0sQ0FBQyxZQUFZLEdBNk5wRDtBQTdOWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvbW1vbiBmcm9tIFwiLi9hcmdvbi13ZWItdmlldy1jb21tb25cIjtcbmltcG9ydCB7TG9hZEV2ZW50RGF0YX0gZnJvbSBcInVpL3dlYi12aWV3XCI7XG5pbXBvcnQge1ZpZXd9IGZyb20gXCJ1aS9jb3JlL3ZpZXdcIjtcbmltcG9ydCBkaWFsb2dzID0gcmVxdWlyZShcInVpL2RpYWxvZ3NcIik7XG5pbXBvcnQge1dFQlhSX0FQSX0gZnJvbSAnLi93ZWJ4cic7XG4vL2ltcG9ydCB7Q29sb3J9IGZyb20gXCJjb2xvclwiO1xuXG5jb25zb2xlLmxvZyhpby5hcmdvbmpzKVxuXG5jbGFzcyBBcmdvbldlYkludGVyZmFjZSBleHRlbmRzIGlvLmFyZ29uanMuQXJnb25XZWJJbnRlcmZhY2Uge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjYWxsYmFjazooZXZlbnQ6c3RyaW5nLCBkYXRhOnN0cmluZyk9PnZvaWQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgcmV0dXJuIGdsb2JhbC5fX25hdGl2ZSh0aGlzKTtcbiAgICB9XG4gICAgb25BcmdvbkV2ZW50KGV2ZW50OnN0cmluZywgZGF0YTpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayhldmVudCwgZGF0YSk7XG4gICAgfVxufVxuXG4vLyB3ZWJraXQgY29va2llIG1hbmFnZXIgaGFuZGxlcyBjb29rZWlzIGZvciBhbmRyb2lkIHdlYnZpZXdzXG5jb25zdCB3ZWJraXRDb29raWVNYW5hZ2VyID0gYW5kcm9pZC53ZWJraXQuQ29va2llTWFuYWdlci5nZXRJbnN0YW5jZSgpO1xuXG4vLyBzZXQgYSBkZWZhdWx0IGNvb2tpZSBoYW5kbGVyIGZvciBodHRwIHJlcXVlc3RzXG4vLyAobmF0aXZlc2NyaXB0IGN1cnJlbnRseSBzZXRzIGEgZGVmYXVsdCBDb29raWVIYW5kbGVyXG4vLyBhZnRlciBhIHJlcXVlc3QgaXMgbWFkZSwgYnV0IHRoaXMgbWlnaHQgY2hhbmdlKVxuamF2YS5uZXQuQ29va2llSGFuZGxlci5zZXREZWZhdWx0KG5ldyBqYXZhLm5ldC5Db29raWVNYW5hZ2VyKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcge1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgX2NvdW50Om51bWJlciA9IDE7XG4gICAgcHJpdmF0ZSBfaW5zdGFuY2VJZDpzdHJpbmcgPSArK0FyZ29uV2ViVmlldy5fY291bnQgKyBcIlwiO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICA7KDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViVmlldykuc2V0V2ViQ29udGVudHNEZWJ1Z2dpbmdFbmFibGVkKHRydWUpO1xuXG4gICAgICAgIHRoaXMub24oVmlldy5sb2FkZWRFdmVudCwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gTWFrZSB0cmFuc3BhcmVudFxuICAgICAgICAgICAgLy90aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICAgICAgICAgIC8vdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcblxuICAgICAgICAgICAgY29uc3Qgd2ViVmlldyA9IDxhbmRyb2lkLndlYmtpdC5XZWJWaWV3PnRoaXMuYW5kcm9pZDtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gd2ViVmlldy5nZXRTZXR0aW5ncygpO1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gc2V0dGluZ3MuZ2V0VXNlckFnZW50U3RyaW5nKCk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRVc2VyQWdlbnRTdHJpbmcodXNlckFnZW50ICsgXCIgQXJnb25YUi9cIiArIGNvbW1vbi5QUk9UT0NPTF9WRVJTSU9OX1NUUklORyk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRKYXZhU2NyaXB0RW5hYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldERvbVN0b3JhZ2VFbmFibGVkKHRydWUpO1xuXG4gICAgICAgICAgICB3ZWJWaWV3LmFkZEphdmFzY3JpcHRJbnRlcmZhY2UobmV3IEFyZ29uV2ViSW50ZXJmYWNlKChldmVudCwgZGF0YSk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQgPT09IFwiYXJnb25cIikge1xuICAgICAgICAgICAgICAgICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgICAgICAvLyBhbmQgdGhlIHByb2dyYW1tZXIgZGlkbid0IHNldCB1cCBhbiBhcmdvbiBtZXRhIHRhZ1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLl9zZXRJc0FyZ29uUGFnZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQXJnb25NZXNzYWdlKGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLCBcIl9fYXJnb25fYW5kcm9pZF9fXCIpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSB1bmlxdWUgY2xhc3MgbmFtZSBmb3IgJ2V4dGVuZCcgdG8gYmluZCB0aGUgb2JqZWN0IHRvIHRoaXMgcGFydGljdWxhciB3ZWJ2aWV3XG4gICAgICAgICAgICB2YXIgY2xhc3NuYW1lID0gXCJhbmRyb2lkX3dlYmtpdF9XZWJDaHJvbWVDbGllbnRfQXJnb25XZWJWaWV3X1wiICsgdGhpcy5faW5zdGFuY2VJZDtcblxuICAgICAgICAgICAgLy8gRXh0ZW5kIFdlYkNocm9tZUNsaWVudCB0byBjYXB0dXJlIGxvZyBvdXRwdXRcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRXZWJDaHJvbWVDbGllbnQobmV3ICgoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJDaHJvbWVDbGllbnQpLmV4dGVuZChjbGFzc25hbWUsIHtcbiAgICAgICAgICAgICAgICBvbkNvbnNvbGVNZXNzYWdlOiAoY29uc29sZU1lc3NhZ2U6IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsZXZlbCA9ICdsb2cnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZU1lc3NhZ2UubWVzc2FnZUxldmVsKCkgPT0gYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UuTWVzc2FnZUxldmVsLldBUk5JTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsID0gJ3dhcm4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGVNZXNzYWdlLm1lc3NhZ2VMZXZlbCgpID09IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlLk1lc3NhZ2VMZXZlbC5FUlJPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWwgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoe3R5cGU6bGV2ZWwsIG1lc3NhZ2U6Y29uc29sZU1lc3NhZ2UubWVzc2FnZSgpfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUxvZ01lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uR2VvbG9jYXRpb25QZXJtaXNzaW9uc1Nob3dQcm9tcHQ6IChvcmlnaW46IHN0cmluZywgY2FsbGJhY2s6IGFuZHJvaWQud2Via2l0Lkdlb2xvY2F0aW9uUGVybWlzc2lvbnMuSUNhbGxiYWNrKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBvcmlnaW4gKyBcIiB3YW50cyB0byB1c2UgeW91ciBkZXZpY2UncyBsb2NhdGlvbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9rQnV0dG9uVGV4dDogXCJPS1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJEb24ndCBBbGxvd1wiXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suaW52b2tlKG9yaWdpbiwgdHJ1ZSwgZmFsc2UpOyAvLyBncmFudCBnZW9sb2NhdGlvbiBwZXJtaXNzaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmludm9rZShvcmlnaW4sIGZhbHNlLCBmYWxzZSk7IC8vIGRlbnkgZ2VvbG9jYXRpb24gcGVybWlzc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3NDaGFuZ2VkOiAodmlldzogYW5kcm9pZC53ZWJraXQuV2ViVmlldywgbmV3UHJvZ3Jlc3M6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb21tb24ucHJvZ3Jlc3NQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCBuZXdQcm9ncmVzcyAvIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpKTtcblxuICAgICAgICAgICAgY2xhc3NuYW1lID0gXCJhbmRyb2lkX3dlYmtpdF9XZWJWaWV3Q2xpZW50X0FyZ29uV2ViVmlld19cIiArIHRoaXMuX2luc3RhbmNlSWQ7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0V2ViVmlld0NsaWVudChuZXcgKCg8YW55PmFuZHJvaWQud2Via2l0LldlYlZpZXdDbGllbnQpLmV4dGVuZChjbGFzc25hbWUsIHtcbiAgICAgICAgICAgICAgICBzaG91bGRPdmVycmlkZVVybExvYWRpbmc6ICh3ZWJWaWV3OmFuZHJvaWQud2Via2l0LldlYlZpZXcsIHVybE9yUmVzcG9uc2U6c3RyaW5nfGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSB0eXBlb2YgdXJsT3JSZXNwb25zZSA9PT0gJ3N0cmluZycgPyB1cmxPclJlc3BvbnNlIDogdXJsT3JSZXNwb25zZS5nZXRVcmwoKS50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyB1cmxcIiArIHVybCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvYWRVcmxXaXRoSW5qZWN0ZWRTY3JpcHQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5vbihBcmdvbldlYlZpZXcubG9hZFN0YXJ0ZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fZGlkQ29tbWl0TmF2aWdhdGlvbigpO1xuICAgICAgICAgICAgY29tbW9uLnRpdGxlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgYXJncy51cmwpO1xuICAgICAgICAgICAgY29tbW9uLnRpdGxlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLm9uKEFyZ29uV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZUphdmFzY3JpcHQoXCIoZG9jdW1lbnQuaGVhZC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9YXJnb25dJykgIT09IG51bGwgfHwgdHlwZW9mKEFyZ29uKSAhPT0gJ3VuZGVmaW5lZCcpXCIsICkudGhlbigocmVzdWx0OnN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBib29sUmVzdWx0ID0gKHJlc3VsdCA9PT0gXCJ0cnVlXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldElzQXJnb25QYWdlKGJvb2xSZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHdlYnZpZXcgPSAodGhpcy5hbmRyb2lkIGFzIGFuZHJvaWQud2Via2l0LldlYlZpZXcpO1xuICAgICAgICAgICAgY29uc3QgdXJsID0gd2Vidmlldy5nZXRVcmwoKTtcbiAgICAgICAgICAgIGNvbW1vbi51cmxQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB1cmwpO1xuICAgICAgICAgICAgY29tbW9uLnRpdGxlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgd2Vidmlldy5nZXRUaXRsZSgpKTtcblxuICAgICAgICAgICAgaWYgKGFyZ3MuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGUgcGFnZSBkaWQgbm90IHN1Y2Nlc3NmdWxseSBsb2FkXG4gICAgICAgICAgICAgICAgLy8gaWYgKHVybC5zdGFydHNXaXRoKFwiaHR0cHNcIikpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gdGhlIGNlcnRpZmljYXRlIGlzIGxpa2VseSBpbnZhbGlkXG4gICAgICAgICAgICAgICAgLy8gICAgIGRpYWxvZ3MuYWxlcnQoXCJBcmdvbiBjYW5ub3QgY3VycmVudGx5IGxvYWQgaHR0cHMgcGFnZXMgd2l0aCBpbnZhbGlkIGNlcnRpZmljYXRlcy5cIikudGhlbigoKT0+IHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIC8vIGRvIG5vdGhpbmcgZm9yIG5vd1xuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyB9XG5cbiAgICAgICAgICAgICAgICBkaWFsb2dzLmFsZXJ0KGFyZ3MuZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9sb2FkaW5nUHJvbWlzZT86UHJvbWlzZTx2b2lkPjtcblxuICAgIHByaXZhdGUgX2xvYWRVcmxXaXRoSW5qZWN0ZWRTY3JpcHQodXJsOnN0cmluZykge1xuICAgICAgICBjb25zdCB3ZWJWaWV3ID0gPGFuZHJvaWQud2Via2l0LldlYlZpZXc+dGhpcy5hbmRyb2lkO1xuICAgICAgICBjb25zdCBjb29raWVNYW5hZ2VyID0gPGphdmEubmV0LkNvb2tpZU1hbmFnZXI+amF2YS5uZXQuQ29va2llSGFuZGxlci5nZXREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGNvb2tpZVN0b3JlID0gY29va2llTWFuYWdlci5nZXRDb29raWVTdG9yZSgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCd1cmwnICsgdXJsKTtcblxuICAgICAgICBjb25zdCBjb29raWVMaXN0ID0gd2Via2l0Q29va2llTWFuYWdlci5nZXRDb29raWUodXJsKTtcblxuICAgICAgICBjb25zdCB1cmkgPSBuZXcgamF2YS5uZXQuVVJJKHVybCk7XG5cbiAgICAgICAgaWYgKGNvb2tpZUxpc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvb2tpZUFycmF5ID0gY29va2llTGlzdC5zcGxpdCgnOycpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjb29raWUgb2YgY29va2llQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29raWVLZXlWYWx1ZSA9IGNvb2tpZS5zcGxpdCgnPScpO1xuICAgICAgICAgICAgICAgIGNvb2tpZVN0b3JlLmFkZCh1cmksIG5ldyBqYXZhLm5ldC5IdHRwQ29va2llKGNvb2tpZUtleVZhbHVlWzBdLCBjb29raWVLZXlWYWx1ZVsxXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY29va2llcyA9IGNvb2tpZVN0b3JlLmdldCh1cmkpO1xuICAgICAgICAgICAgY29uc3QgbnVtQ29va2llcyA9IGNvb2tpZXMuc2l6ZSgpO1xuICAgICAgICAgICAgZm9yIChsZXQgaT0wOyBpIDwgbnVtQ29va2llczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29va2llID0gY29va2llcy5nZXQoaSk7XG4gICAgICAgICAgICAgICAgY29va2llU3RvcmUucmVtb3ZlKHVyaSwgY29va2llKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbG9hZGluZyA9IHRoaXMuX2xvYWRpbmdQcm9taXNlID0gZmV0Y2godXJsLCB7bWV0aG9kOiAnZ2V0J30pLnRoZW4oKGRhdGEpPT57XG4gICAgICAgICAgICByZXR1cm4gZGF0YS50ZXh0KCkgXG4gICAgICAgIH0pLnRoZW4oKHRleHQpPT57XG4gICAgICAgICAgICBpZiAobG9hZGluZyA9PT0gdGhpcy5fbG9hZGluZ1Byb21pc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCAkID0gY2hlZXJpby5sb2FkKHRleHQpO1xuICAgICAgICAgICAgICAgIC8vICQoJyonKS5maXJzdCgpLmJlZm9yZShgPHNjcmlwdD4oJHtmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgd2luZG93WydBUkdPTl9CUk9XU0VSJ10gPSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBwb3N0TWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIHdpbmRvd1snX19hcmdvbl9hbmRyb2lkX18nXS5lbWl0KCdhcmdvbicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG9ubWVzc2FnZTogbnVsbFxuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfS50b1N0cmluZygpfSgpKTtcbiAgICAgICAgICAgICAgICAvLyBBUkdPTl9CUk9XU0VSLnZlcnNpb24gPSAke0FyZ29uLnZlcnNpb259O1xuICAgICAgICAgICAgICAgIC8vICgke1dFQlhSX0FQSX0oKSk7PC9zY3JpcHQ+YCk7XG4gICAgICAgICAgICAgICAgLy8gd2ViVmlldy5sb2FkRGF0YVdpdGhCYXNlVVJMKFxuICAgICAgICAgICAgICAgIC8vICAgICB1cmwsXG4gICAgICAgICAgICAgICAgLy8gICAgICQuaHRtbCgpLFxuICAgICAgICAgICAgICAgIC8vICAgICAndGV4dC9odG1sJyxcbiAgICAgICAgICAgICAgICAvLyAgICAgJ3V0ZjgnLFxuICAgICAgICAgICAgICAgIC8vICAgICB1cmxcbiAgICAgICAgICAgICAgICAvLyApO1xuXG4gICAgICAgICAgICAgICAgdmFyIGluamVjdGVkU2NyaXB0ID0gYDxzY3JpcHQ+KCR7ZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvd1snQVJHT05fQlJPV1NFUiddID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeHI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3N0TWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvd1snX19hcmdvbl9hbmRyb2lkX18nXS5lbWl0KCdhcmdvbicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ubWVzc2FnZTogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfS50b1N0cmluZygpfSgpKTtcbiAgICAgICAgICAgICAgICAoJHtXRUJYUl9BUEl9KCkpOzwvc2NyaXB0PmA7XG5cbiAgICAgICAgICAgICAgICB3ZWJWaWV3LmxvYWREYXRhV2l0aEJhc2VVUkwoXG4gICAgICAgICAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgICAgICAgICAgaW5qZWN0ZWRTY3JpcHQgKyB0ZXh0LFxuICAgICAgICAgICAgICAgICAgICAndGV4dC9odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgJ3V0ZjgnLFxuICAgICAgICAgICAgICAgICAgICB1cmxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfc2V0SXNBcmdvblBhZ2UoZmxhZzpib29sZWFuKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJfc2V0SXNBcmdvbkFwcDogXCIgKyBmbGFnKTtcbiAgICAgICAgaWYgKCF0aGlzLmlzQXJnb25QYWdlICYmIGZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5UUkFOU1BBUkVOVCk7XG4gICAgICAgICAgICAvLyBjb21tb24uaXNBcmdvblBhZ2VQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzQXJnb25QYWdlICYmICFmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuV0hJVEUpO1xuICAgICAgICAgICAgLy8gY29tbW9uLmlzQXJnb25QYWdlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdCwgbmV3IGFuZHJvaWQud2Via2l0LlZhbHVlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIG9uUmVjZWl2ZVZhbHVlOiAodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0LCBudWxsKTtcbiAgICB9XG5cbiAgICBicmluZ1RvRnJvbnQoKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5icmluZ1RvRnJvbnQoKTtcbiAgICB9XG5cbiAgICBnZXRXZWJWaWV3VmVyc2lvbigpIDogbnVtYmVyIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSA8YW5kcm9pZC53ZWJraXQuV2ViU2V0dGluZ3M+IHRoaXMuYW5kcm9pZC5nZXRTZXR0aW5ncygpO1xuICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBzZXR0aW5ncy5nZXRVc2VyQWdlbnRTdHJpbmcoKTtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvQ2hyb21lXFwvKFswLTldKykvaTtcbiAgICAgICAgdmFyIG1hdGNoID0gcmVnZXguZXhlYyh1c2VyQWdlbnQpO1xuICAgICAgICBpZiAobWF0Y2ggIT0gbnVsbCAmJiBtYXRjaC5sZW5ndGggPiAxKXtcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIobWF0Y2hbMV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59XG4iXX0=