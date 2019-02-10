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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQWtEO0FBRWxELHFDQUFrQztBQUNsQyxvQ0FBdUM7QUFDdkMsaUNBQWtDO0FBQ2xDLDhCQUE4QjtBQUU5QixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUV2QjtJQUFnQyxxQ0FBNEI7SUFDeEQsMkJBQW1CLFFBQTBDO1FBQTdELFlBQ0ksaUJBQU8sU0FFVjtRQUhrQixjQUFRLEdBQVIsUUFBUSxDQUFrQztRQUV6RCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUNELHdDQUFZLEdBQVosVUFBYSxLQUFZLEVBQUUsSUFBVztRQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBQ0wsd0JBQUM7QUFBRCxDQUFDLEFBUkQsQ0FBZ0MsRUFBRSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsR0FRM0Q7QUFFRCw2REFBNkQ7QUFDN0QsSUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUV2RSxpREFBaUQ7QUFDakQsdURBQXVEO0FBQ3ZELGtEQUFrRDtBQUNsRCxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRTlEO0lBQWtDLGdDQUFtQjtJQUtqRDtRQUFBLFlBQ0ksaUJBQU8sU0FxR1Y7UUF4R08saUJBQVcsR0FBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBSzdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBUSxDQUFD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Q0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzQjtRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDO0lBMU5jLG1CQUFNLEdBQVUsQ0FBQyxDQUFDO0lBMk5yQyxtQkFBQztDQUFBLEFBN05ELENBQWtDLE1BQU0sQ0FBQyxZQUFZLEdBNk5wRDtBQTdOWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvbW1vbiBmcm9tIFwiLi9hcmdvbi13ZWItdmlldy1jb21tb25cIjtcbmltcG9ydCB7TG9hZEV2ZW50RGF0YX0gZnJvbSBcInVpL3dlYi12aWV3XCI7XG5pbXBvcnQge1ZpZXd9IGZyb20gXCJ1aS9jb3JlL3ZpZXdcIjtcbmltcG9ydCBkaWFsb2dzID0gcmVxdWlyZShcInVpL2RpYWxvZ3NcIik7XG5pbXBvcnQge1dFQlhSX0FQSX0gZnJvbSAnLi93ZWJ4cic7XG4vL2ltcG9ydCB7Q29sb3J9IGZyb20gXCJjb2xvclwiO1xuXG5jb25zb2xlLmxvZyhpby5hcmdvbmpzKVxuXG5jbGFzcyBBcmdvbldlYkludGVyZmFjZSBleHRlbmRzIGlvLmFyZ29uanMuQXJnb25XZWJJbnRlcmZhY2Uge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjYWxsYmFjazooZXZlbnQ6c3RyaW5nLCBkYXRhOnN0cmluZyk9PnZvaWQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgcmV0dXJuIGdsb2JhbC5fX25hdGl2ZSh0aGlzKTtcbiAgICB9XG4gICAgb25BcmdvbkV2ZW50KGV2ZW50OnN0cmluZywgZGF0YTpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayhldmVudCwgZGF0YSk7XG4gICAgfVxufVxuXG4vLyB3ZWJraXQgY29va2llIG1hbmFnZXIgaGFuZGxlcyBjb29rZWlzIGZvciBhbmRyb2lkIHdlYnZpZXdzXG5jb25zdCB3ZWJraXRDb29raWVNYW5hZ2VyID0gYW5kcm9pZC53ZWJraXQuQ29va2llTWFuYWdlci5nZXRJbnN0YW5jZSgpO1xuXG4vLyBzZXQgYSBkZWZhdWx0IGNvb2tpZSBoYW5kbGVyIGZvciBodHRwIHJlcXVlc3RzXG4vLyAobmF0aXZlc2NyaXB0IGN1cnJlbnRseSBzZXRzIGEgZGVmYXVsdCBDb29raWVIYW5kbGVyXG4vLyBhZnRlciBhIHJlcXVlc3QgaXMgbWFkZSwgYnV0IHRoaXMgbWlnaHQgY2hhbmdlKVxuamF2YS5uZXQuQ29va2llSGFuZGxlci5zZXREZWZhdWx0KG5ldyBqYXZhLm5ldC5Db29raWVNYW5hZ2VyKTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcge1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgX2NvdW50Om51bWJlciA9IDE7XG4gICAgcHJpdmF0ZSBfaW5zdGFuY2VJZDpzdHJpbmcgPSArK0FyZ29uV2ViVmlldy5fY291bnQgKyBcIlwiO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICA7KDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViVmlldykuc2V0V2ViQ29udGVudHNEZWJ1Z2dpbmdFbmFibGVkKHRydWUpO1xuXG4gICAgICAgIHRoaXMub24oVmlldy5sb2FkZWRFdmVudCwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gTWFrZSB0cmFuc3BhcmVudFxuICAgICAgICAgICAgLy90aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICAgICAgICAgIC8vdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcblxuICAgICAgICAgICAgY29uc3Qgd2ViVmlldyA9IDxhbmRyb2lkLndlYmtpdC5XZWJWaWV3PnRoaXMuYW5kcm9pZDtcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gd2ViVmlldy5nZXRTZXR0aW5ncygpO1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gc2V0dGluZ3MuZ2V0VXNlckFnZW50U3RyaW5nKCk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRVc2VyQWdlbnRTdHJpbmcodXNlckFnZW50ICsgXCIgQXJnb25YUi9cIiArIGNvbW1vbi5QUk9UT0NPTF9WRVJTSU9OX1NUUklORyk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRKYXZhU2NyaXB0RW5hYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldERvbVN0b3JhZ2VFbmFibGVkKHRydWUpO1xuXG4gICAgICAgICAgICB3ZWJWaWV3LmFkZEphdmFzY3JpcHRJbnRlcmZhY2UobmV3IEFyZ29uV2ViSW50ZXJmYWNlKChldmVudCwgZGF0YSk9PntcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQgPT09IFwiYXJnb25cIikge1xuICAgICAgICAgICAgICAgICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgICAgICAvLyBhbmQgdGhlIHByb2dyYW1tZXIgZGlkbid0IHNldCB1cCBhbiBhcmdvbiBtZXRhIHRhZ1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLl9zZXRJc0FyZ29uUGFnZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQXJnb25NZXNzYWdlKGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLCBcIl9fYXJnb25fYW5kcm9pZF9fXCIpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSB1bmlxdWUgY2xhc3MgbmFtZSBmb3IgJ2V4dGVuZCcgdG8gYmluZCB0aGUgb2JqZWN0IHRvIHRoaXMgcGFydGljdWxhciB3ZWJ2aWV3XG4gICAgICAgICAgICB2YXIgY2xhc3NuYW1lID0gXCJhbmRyb2lkX3dlYmtpdF9XZWJDaHJvbWVDbGllbnRfQXJnb25XZWJWaWV3X1wiICsgdGhpcy5faW5zdGFuY2VJZDtcblxuICAgICAgICAgICAgLy8gRXh0ZW5kIFdlYkNocm9tZUNsaWVudCB0byBjYXB0dXJlIGxvZyBvdXRwdXRcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRXZWJDaHJvbWVDbGllbnQobmV3ICgoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJDaHJvbWVDbGllbnQpLmV4dGVuZChjbGFzc25hbWUsIHtcbiAgICAgICAgICAgICAgICBvbkNvbnNvbGVNZXNzYWdlOiAoY29uc29sZU1lc3NhZ2U6IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsZXZlbCA9ICdsb2cnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZU1lc3NhZ2UubWVzc2FnZUxldmVsKCkgPT0gYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UuTWVzc2FnZUxldmVsLldBUk5JTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsID0gJ3dhcm4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGVNZXNzYWdlLm1lc3NhZ2VMZXZlbCgpID09IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlLk1lc3NhZ2VMZXZlbC5FUlJPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWwgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoe3R5cGU6bGV2ZWwsIG1lc3NhZ2U6Y29uc29sZU1lc3NhZ2UubWVzc2FnZSgpfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUxvZ01lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uR2VvbG9jYXRpb25QZXJtaXNzaW9uc1Nob3dQcm9tcHQ6IChvcmlnaW46IHN0cmluZywgY2FsbGJhY2s6IGFuZHJvaWQud2Via2l0Lkdlb2xvY2F0aW9uUGVybWlzc2lvbnMuQ2FsbGJhY2spOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG9yaWdpbiArIFwiIHdhbnRzIHRvIHVzZSB5b3VyIGRldmljZSdzIGxvY2F0aW9uLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBcIk9LXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkRvbid0IEFsbG93XCJcbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5pbnZva2Uob3JpZ2luLCB0cnVlLCBmYWxzZSk7IC8vIGdyYW50IGdlb2xvY2F0aW9uIHBlcm1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suaW52b2tlKG9yaWdpbiwgZmFsc2UsIGZhbHNlKTsgLy8gZGVueSBnZW9sb2NhdGlvbiBwZXJtaXNzaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25Qcm9ncmVzc0NoYW5nZWQ6ICh2aWV3OiBhbmRyb2lkLndlYmtpdC5XZWJWaWV3LCBuZXdQcm9ncmVzczogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1vbi5wcm9ncmVzc1Byb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIG5ld1Byb2dyZXNzIC8gMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSkpO1xuXG4gICAgICAgICAgICBjbGFzc25hbWUgPSBcImFuZHJvaWRfd2Via2l0X1dlYlZpZXdDbGllbnRfQXJnb25XZWJWaWV3X1wiICsgdGhpcy5faW5zdGFuY2VJZDtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRXZWJWaWV3Q2xpZW50KG5ldyAoKDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViVmlld0NsaWVudCkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIHNob3VsZE92ZXJyaWRlVXJsTG9hZGluZzogKHdlYlZpZXc6YW5kcm9pZC53ZWJraXQuV2ViVmlldywgdXJsT3JSZXNwb25zZTpzdHJpbmd8YW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHR5cGVvZiB1cmxPclJlc3BvbnNlID09PSAnc3RyaW5nJyA/IHVybE9yUmVzcG9uc2UgOiB1cmxPclJlc3BvbnNlLmdldFVybCgpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2FkaW5nIHVybFwiICsgdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9hZFVybFdpdGhJbmplY3RlZFNjcmlwdCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLm9uKEFyZ29uV2ViVmlldy5sb2FkU3RhcnRlZEV2ZW50LCAoYXJnczpMb2FkRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9kaWRDb21taXROYXZpZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb21tb24udGl0bGVQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCBhcmdzLnVybCk7XG4gICAgICAgICAgICBjb21tb24udGl0bGVQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB0aGlzLmFuZHJvaWQuZ2V0VGl0bGUoKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub24oQXJnb25XZWJWaWV3LmxvYWRGaW5pc2hlZEV2ZW50LCAoYXJnczpMb2FkRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlSmF2YXNjcmlwdChcIihkb2N1bWVudC5oZWFkLnF1ZXJ5U2VsZWN0b3IoJ21ldGFbbmFtZT1hcmdvbl0nKSAhPT0gbnVsbCB8fCB0eXBlb2YoQXJnb24pICE9PSAndW5kZWZpbmVkJylcIiwgKS50aGVuKChyZXN1bHQ6c3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIGJvb2xSZXN1bHQgPSAocmVzdWx0ID09PSBcInRydWVcIik7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0SXNBcmdvblBhZ2UoYm9vbFJlc3VsdCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3Qgd2VidmlldyA9ICh0aGlzLmFuZHJvaWQgYXMgYW5kcm9pZC53ZWJraXQuV2ViVmlldyk7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSB3ZWJ2aWV3LmdldFVybCgpO1xuICAgICAgICAgICAgY29tbW9uLnVybFByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIHVybCk7XG4gICAgICAgICAgICBjb21tb24udGl0bGVQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB3ZWJ2aWV3LmdldFRpdGxlKCkpO1xuXG4gICAgICAgICAgICBpZiAoYXJncy5lcnJvcikge1xuICAgICAgICAgICAgICAgIC8vIHRoZSBwYWdlIGRpZCBub3Qgc3VjY2Vzc2Z1bGx5IGxvYWRcbiAgICAgICAgICAgICAgICAvLyBpZiAodXJsLnN0YXJ0c1dpdGgoXCJodHRwc1wiKSkge1xuICAgICAgICAgICAgICAgIC8vICAgICAvLyB0aGUgY2VydGlmaWNhdGUgaXMgbGlrZWx5IGludmFsaWRcbiAgICAgICAgICAgICAgICAvLyAgICAgZGlhbG9ncy5hbGVydChcIkFyZ29uIGNhbm5vdCBjdXJyZW50bHkgbG9hZCBodHRwcyBwYWdlcyB3aXRoIGludmFsaWQgY2VydGlmaWNhdGVzLlwiKS50aGVuKCgpPT4ge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgLy8gZG8gbm90aGluZyBmb3Igbm93XG4gICAgICAgICAgICAgICAgLy8gICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoYXJncy5lcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2xvYWRpbmdQcm9taXNlPzpQcm9taXNlPHZvaWQ+O1xuXG4gICAgcHJpdmF0ZSBfbG9hZFVybFdpdGhJbmplY3RlZFNjcmlwdCh1cmw6c3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHdlYlZpZXcgPSA8YW5kcm9pZC53ZWJraXQuV2ViVmlldz50aGlzLmFuZHJvaWQ7XG4gICAgICAgIGNvbnN0IGNvb2tpZU1hbmFnZXIgPSA8amF2YS5uZXQuQ29va2llTWFuYWdlcj5qYXZhLm5ldC5Db29raWVIYW5kbGVyLmdldERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgY29va2llU3RvcmUgPSBjb29raWVNYW5hZ2VyLmdldENvb2tpZVN0b3JlKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ3VybCcgKyB1cmwpO1xuXG4gICAgICAgIGNvbnN0IGNvb2tpZUxpc3QgPSB3ZWJraXRDb29raWVNYW5hZ2VyLmdldENvb2tpZSh1cmwpO1xuXG4gICAgICAgIGNvbnN0IHVyaSA9IG5ldyBqYXZhLm5ldC5VUkkodXJsKTtcblxuICAgICAgICBpZiAoY29va2llTGlzdCkge1xuICAgICAgICAgICAgY29uc3QgY29va2llQXJyYXkgPSBjb29raWVMaXN0LnNwbGl0KCc7Jyk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBjb29raWVBcnJheSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvb2tpZUtleVZhbHVlID0gY29va2llLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgICAgICAgY29va2llU3RvcmUuYWRkKHVyaSwgbmV3IGphdmEubmV0Lkh0dHBDb29raWUoY29va2llS2V5VmFsdWVbMF0sIGNvb2tpZUtleVZhbHVlWzFdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjb29raWVzID0gY29va2llU3RvcmUuZ2V0KHVyaSk7XG4gICAgICAgICAgICBjb25zdCBudW1Db29raWVzID0gY29va2llcy5zaXplKCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpPTA7IGkgPCBudW1Db29raWVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29raWUgPSBjb29raWVzLmdldChpKTtcbiAgICAgICAgICAgICAgICBjb29raWVTdG9yZS5yZW1vdmUodXJpLCBjb29raWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsb2FkaW5nID0gdGhpcy5fbG9hZGluZ1Byb21pc2UgPSBmZXRjaCh1cmwsIHttZXRob2Q6ICdnZXQnfSkudGhlbigoZGF0YSk9PntcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnRleHQoKSBcbiAgICAgICAgfSkudGhlbigodGV4dCk9PntcbiAgICAgICAgICAgIGlmIChsb2FkaW5nID09PSB0aGlzLl9sb2FkaW5nUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnN0ICQgPSBjaGVlcmlvLmxvYWQodGV4dCk7XG4gICAgICAgICAgICAgICAgLy8gJCgnKicpLmZpcnN0KCkuYmVmb3JlKGA8c2NyaXB0Pigke2Z1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vICAgICB3aW5kb3dbJ0FSR09OX0JST1dTRVInXSA9IHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHBvc3RNZXNzYWdlKG1lc3NhZ2U6c3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgd2luZG93WydfX2FyZ29uX2FuZHJvaWRfXyddLmVtaXQoJ2FyZ29uJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgb25tZXNzYWdlOiBudWxsXG4gICAgICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgICAgICAvLyB9LnRvU3RyaW5nKCl9KCkpO1xuICAgICAgICAgICAgICAgIC8vIEFSR09OX0JST1dTRVIudmVyc2lvbiA9ICR7QXJnb24udmVyc2lvbn07XG4gICAgICAgICAgICAgICAgLy8gKCR7V0VCWFJfQVBJfSgpKTs8L3NjcmlwdD5gKTtcbiAgICAgICAgICAgICAgICAvLyB3ZWJWaWV3LmxvYWREYXRhV2l0aEJhc2VVUkwoXG4gICAgICAgICAgICAgICAgLy8gICAgIHVybCxcbiAgICAgICAgICAgICAgICAvLyAgICAgJC5odG1sKCksXG4gICAgICAgICAgICAgICAgLy8gICAgICd0ZXh0L2h0bWwnLFxuICAgICAgICAgICAgICAgIC8vICAgICAndXRmOCcsXG4gICAgICAgICAgICAgICAgLy8gICAgIHVybFxuICAgICAgICAgICAgICAgIC8vICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgaW5qZWN0ZWRTY3JpcHQgPSBgPHNjcmlwdD4oJHtmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93WydBUkdPTl9CUk9XU0VSJ10gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4cjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlKG1lc3NhZ2U6c3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93WydfX2FyZ29uX2FuZHJvaWRfXyddLmVtaXQoJ2FyZ29uJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb25tZXNzYWdlOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LnRvU3RyaW5nKCl9KCkpO1xuICAgICAgICAgICAgICAgICgke1dFQlhSX0FQSX0oKSk7PC9zY3JpcHQ+YDtcblxuICAgICAgICAgICAgICAgIHdlYlZpZXcubG9hZERhdGFXaXRoQmFzZVVSTChcbiAgICAgICAgICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgICAgICAgICBpbmplY3RlZFNjcmlwdCArIHRleHQsXG4gICAgICAgICAgICAgICAgICAgICd0ZXh0L2h0bWwnLFxuICAgICAgICAgICAgICAgICAgICAndXRmOCcsXG4gICAgICAgICAgICAgICAgICAgIHVybFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIF9zZXRJc0FyZ29uUGFnZShmbGFnOmJvb2xlYW4pIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIl9zZXRJc0FyZ29uQXBwOiBcIiArIGZsYWcpO1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvblBhZ2UgJiYgZmxhZykge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcbiAgICAgICAgICAgIC8vIGNvbW1vbi5pc0FyZ29uUGFnZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNBcmdvblBhZ2UgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5XSElURSk7XG4gICAgICAgICAgICAvLyBjb21tb24uaXNBcmdvblBhZ2VQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0LCBuZXcgYW5kcm9pZC53ZWJraXQuVmFsdWVDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgb25SZWNlaXZlVmFsdWU6ICh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKHNjcmlwdDpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLmV2YWx1YXRlSmF2YXNjcmlwdChzY3JpcHQsIG51bGwpO1xuICAgIH1cblxuICAgIGJyaW5nVG9Gcm9udCgpIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLmJyaW5nVG9Gcm9udCgpO1xuICAgIH1cblxuICAgIGdldFdlYlZpZXdWZXJzaW9uKCkgOiBudW1iZXIge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IDxhbmRyb2lkLndlYmtpdC5XZWJTZXR0aW5ncz4gdGhpcy5hbmRyb2lkLmdldFNldHRpbmdzKCk7XG4gICAgICAgIGNvbnN0IHVzZXJBZ2VudCA9IHNldHRpbmdzLmdldFVzZXJBZ2VudFN0cmluZygpO1xuICAgICAgICBjb25zdCByZWdleCA9IC9DaHJvbWVcXC8oWzAtOV0rKS9pO1xuICAgICAgICB2YXIgbWF0Y2ggPSByZWdleC5leGVjKHVzZXJBZ2VudCk7XG4gICAgICAgIGlmIChtYXRjaCAhPSBudWxsICYmIG1hdGNoLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihtYXRjaFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn1cbiJdfQ==