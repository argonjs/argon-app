"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var dialogs = require("ui/dialogs");
var observable_1 = require("data/observable");
//import {Color} from "color";
var AndroidWebInterface = io.argonjs.AndroidWebInterface;
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    /*
    private static layersById: {
        [id: string]: ArgonWebView,
    } = {};
    */
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        android.webkit.WebView.setWebContentsDebuggingEnabled(true);
        _this.on(view_1.View.loadedEvent, function () {
            // Make transparent
            //this.backgroundColor = new Color(0, 255, 255, 255);
            //this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            var settings = _this.android.getSettings();
            var userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " Argon");
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            // Remember a particular id for each webview
            if (!_this.id) {
                _this.id = Date.now().toString();
            }
            //ArgonWebView.layersById[this.id] = this;
            // Create a unique class name for 'extend' to bind the object to this particular webview
            var classname = "io_argonjs_AndroidWebInterface_ArgonWebView_" + _this.id;
            // Inject Javascript Interface
            _this.android.addJavascriptInterface(new (AndroidWebInterface.extend(classname, {
                onArgonEvent: function (id, event, data) {
                    //const self = ArgonWebView.layersById[id];
                    //if (self) {
                    if (event === "argon") {
                        // just in case we thought below that the page was not an
                        // argon page, perhaps because argon.js loaded asyncronously 
                        // and the programmer didn't set up an argon meta tag
                        _this._setIsArgonApp(true);
                        _this._handleArgonMessage(data);
                    }
                    //}
                },
            }))(new java.lang.String(_this.id)), "__argon_android__");
            // Create a unique class name for 'extend' to bind the object to this particular webview
            classname = "android_webkit_WebChromeClient_ArgonWebView_" + _this.id;
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
                    //this.set('progress', newProgress / 100.0);
                    observable_1.Observable.prototype.set.call(_this, 'progress', newProgress / 100.0);
                }
            })));
        });
        _this.on(ArgonWebView.loadStartedEvent, function (args) {
            _this._didCommitNavigation();
            //this.set('url', args.url)
            //this.set('title', this.android.getTitle());
            observable_1.Observable.prototype.set.call(_this, 'url', args.url);
            observable_1.Observable.prototype.set.call(_this, 'title', _this.android.getTitle());
        });
        _this.on(ArgonWebView.loadFinishedEvent, function (args) {
            _this.evaluateJavascript("(document.head.querySelector('meta[name=argon]') !== null || typeof(Argon) !== 'undefined')").then(function (result) {
                var boolResult = (result === "true");
                _this._setIsArgonApp(boolResult);
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
                //this.set('url', url);
                observable_1.Observable.prototype.set.call(_this, 'url', url);
            }
            //this.set('title', this.android.getTitle());
            observable_1.Observable.prototype.set.call(_this, 'title', _this.android.getTitle());
        });
        return _this;
    }
    ArgonWebView.prototype._setIsArgonApp = function (flag) {
        //console.log("_setIsArgonApp: " + flag);
        if (!this.isArgonApp && flag) {
            this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            //this.set("isArgonApp", true);
            observable_1.Observable.prototype.set.call(this, 'isArgonApp', true);
        }
        else if (this.isArgonApp && !flag) {
            this.android.setBackgroundColor(android.graphics.Color.WHITE);
            //this.set("isArgonApp", false);
            observable_1.Observable.prototype.set.call(this, 'isArgonApp', false);
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
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBa0Q7QUFFbEQscUNBQWtDO0FBQ2xDLG9DQUF1QztBQUN2Qyw4Q0FBMkM7QUFDM0MsOEJBQThCO0FBRTlCLElBQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztBQUUzRDtJQUFrQyxnQ0FBbUI7SUFFakQ7Ozs7TUFJRTtJQUVGO1FBQUEsWUFDSSxpQkFBTyxTQXlHVjtRQXZHUyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQVEsQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuRSxLQUFJLENBQUMsRUFBRSxDQUFDLFdBQUksQ0FBQyxXQUFXLEVBQUU7WUFDdEIsbUJBQW1CO1lBQ25CLHFEQUFxRDtZQUNyRCxzRUFBc0U7WUFFdEUsSUFBTSxRQUFRLEdBQWdDLEtBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekUsSUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDaEQsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQztZQUNsRCxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXBDLDRDQUE0QztZQUM1QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNYLEtBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLENBQUM7WUFDRCwwQ0FBMEM7WUFFMUMsd0ZBQXdGO1lBQ3hGLElBQUksU0FBUyxHQUFHLDhDQUE4QyxH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bUJBQUM7QUFBRCxDQUFDLEFBN0pELENBQWtDLE1BQU0sQ0FBQyxZQUFZLEdBNkpwRDtBQTdKWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvbW1vbiBmcm9tIFwiLi9hcmdvbi13ZWItdmlldy1jb21tb25cIjtcbmltcG9ydCB7TG9hZEV2ZW50RGF0YX0gZnJvbSBcInVpL3dlYi12aWV3XCI7XG5pbXBvcnQge1ZpZXd9IGZyb20gXCJ1aS9jb3JlL3ZpZXdcIjtcbmltcG9ydCBkaWFsb2dzID0gcmVxdWlyZShcInVpL2RpYWxvZ3NcIik7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG4vL2ltcG9ydCB7Q29sb3J9IGZyb20gXCJjb2xvclwiO1xuXG5jb25zdCBBbmRyb2lkV2ViSW50ZXJmYWNlID0gaW8uYXJnb25qcy5BbmRyb2lkV2ViSW50ZXJmYWNlO1xuXG5leHBvcnQgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgY29tbW9uLkFyZ29uV2ViVmlldyB7XG5cbiAgICAvKlxuICAgIHByaXZhdGUgc3RhdGljIGxheWVyc0J5SWQ6IHtcbiAgICAgICAgW2lkOiBzdHJpbmddOiBBcmdvbldlYlZpZXcsXG4gICAgfSA9IHt9O1xuICAgICovXG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJWaWV3KS5zZXRXZWJDb250ZW50c0RlYnVnZ2luZ0VuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5vbihWaWV3LmxvYWRlZEV2ZW50LCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBNYWtlIHRyYW5zcGFyZW50XG4gICAgICAgICAgICAvL3RoaXMuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICAgICAgLy90aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuVFJBTlNQQVJFTlQpO1xuXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IDxhbmRyb2lkLndlYmtpdC5XZWJTZXR0aW5ncz4gdGhpcy5hbmRyb2lkLmdldFNldHRpbmdzKCk7XG4gICAgICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBzZXR0aW5ncy5nZXRVc2VyQWdlbnRTdHJpbmcoKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldFVzZXJBZ2VudFN0cmluZyh1c2VyQWdlbnQgKyBcIiBBcmdvblwiKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldEphdmFTY3JpcHRFbmFibGVkKHRydWUpO1xuICAgICAgICAgICAgc2V0dGluZ3Muc2V0RG9tU3RvcmFnZUVuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIFJlbWVtYmVyIGEgcGFydGljdWxhciBpZCBmb3IgZWFjaCB3ZWJ2aWV3XG4gICAgICAgICAgICBpZiAoIXRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkID0gRGF0ZS5ub3coKS50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9BcmdvbldlYlZpZXcubGF5ZXJzQnlJZFt0aGlzLmlkXSA9IHRoaXM7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHVuaXF1ZSBjbGFzcyBuYW1lIGZvciAnZXh0ZW5kJyB0byBiaW5kIHRoZSBvYmplY3QgdG8gdGhpcyBwYXJ0aWN1bGFyIHdlYnZpZXdcbiAgICAgICAgICAgIHZhciBjbGFzc25hbWUgPSBcImlvX2FyZ29uanNfQW5kcm9pZFdlYkludGVyZmFjZV9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLmlkO1xuXG4gICAgICAgICAgICAvLyBJbmplY3QgSmF2YXNjcmlwdCBJbnRlcmZhY2VcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5hZGRKYXZhc2NyaXB0SW50ZXJmYWNlKG5ldyAoKDxhbnk+QW5kcm9pZFdlYkludGVyZmFjZSkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIG9uQXJnb25FdmVudDogKGlkOiBzdHJpbmcsIGV2ZW50OiBzdHJpbmcsIGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnN0IHNlbGYgPSBBcmdvbldlYlZpZXcubGF5ZXJzQnlJZFtpZF07XG4gICAgICAgICAgICAgICAgICAgIC8vaWYgKHNlbGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gXCJhcmdvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ganVzdCBpbiBjYXNlIHdlIHRob3VnaHQgYmVsb3cgdGhhdCB0aGUgcGFnZSB3YXMgbm90IGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVBcmdvbk1lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSkobmV3IGphdmEubGFuZy5TdHJpbmcodGhpcy5pZCkpLCBcIl9fYXJnb25fYW5kcm9pZF9fXCIpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSB1bmlxdWUgY2xhc3MgbmFtZSBmb3IgJ2V4dGVuZCcgdG8gYmluZCB0aGUgb2JqZWN0IHRvIHRoaXMgcGFydGljdWxhciB3ZWJ2aWV3XG4gICAgICAgICAgICBjbGFzc25hbWUgPSBcImFuZHJvaWRfd2Via2l0X1dlYkNocm9tZUNsaWVudF9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLmlkO1xuXG4gICAgICAgICAgICAvLyBFeHRlbmQgV2ViQ2hyb21lQ2xpZW50IHRvIGNhcHR1cmUgbG9nIG91dHB1dFxuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldFdlYkNocm9tZUNsaWVudChuZXcgKCg8YW55PmFuZHJvaWQud2Via2l0LldlYkNocm9tZUNsaWVudCkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIG9uQ29uc29sZU1lc3NhZ2U6IChjb25zb2xlTWVzc2FnZTogYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxldmVsID0gJ2xvZyc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25zb2xlTWVzc2FnZS5tZXNzYWdlTGV2ZWwoKSA9PSBhbmRyb2lkLndlYmtpdC5Db25zb2xlTWVzc2FnZS5NZXNzYWdlTGV2ZWwuV0FSTklORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWwgPSAnd2Fybic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uc29sZU1lc3NhZ2UubWVzc2FnZUxldmVsKCkgPT0gYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UuTWVzc2FnZUxldmVsLkVSUk9SKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbCA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnN0cmluZ2lmeSh7dHlwZTpsZXZlbCwgbWVzc2FnZTpjb25zb2xlTWVzc2FnZS5tZXNzYWdlKCl9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlTG9nTWVzc2FnZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25HZW9sb2NhdGlvblBlcm1pc3Npb25zU2hvd1Byb21wdDogKG9yaWdpbjogc3RyaW5nLCBjYWxsYmFjazogYW5kcm9pZC53ZWJraXQuR2VvbG9jYXRpb25QZXJtaXNzaW9ucy5JQ2FsbGJhY2spOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG9yaWdpbiArIFwiIHdhbnRzIHRvIHVzZSB5b3VyIGRldmljZSdzIGxvY2F0aW9uLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBcIk9LXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkRvbid0IEFsbG93XCJcbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5pbnZva2Uob3JpZ2luLCB0cnVlLCBmYWxzZSk7IC8vIGdyYW50IGdlb2xvY2F0aW9uIHBlcm1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suaW52b2tlKG9yaWdpbiwgZmFsc2UsIGZhbHNlKTsgLy8gZGVueSBnZW9sb2NhdGlvbiBwZXJtaXNzaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25Qcm9ncmVzc0NoYW5nZWQ6ICh2aWV3OiBhbmRyb2lkLndlYmtpdC5XZWJWaWV3LCBuZXdQcm9ncmVzczogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcy5zZXQoJ3Byb2dyZXNzJywgbmV3UHJvZ3Jlc3MgLyAxMDAuMCk7XG4gICAgICAgICAgICAgICAgICAgIE9ic2VydmFibGUucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsICdwcm9ncmVzcycsIG5ld1Byb2dyZXNzIC8gMTAwLjApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub24oQXJnb25XZWJWaWV3LmxvYWRTdGFydGVkRXZlbnQsIChhcmdzOkxvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2RpZENvbW1pdE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIC8vdGhpcy5zZXQoJ3VybCcsIGFyZ3MudXJsKVxuICAgICAgICAgICAgLy90aGlzLnNldCgndGl0bGUnLCB0aGlzLmFuZHJvaWQuZ2V0VGl0bGUoKSk7XG4gICAgICAgICAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCAndXJsJywgYXJncy51cmwpO1xuICAgICAgICAgICAgT2JzZXJ2YWJsZS5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgJ3RpdGxlJywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLm9uKEFyZ29uV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZUphdmFzY3JpcHQoXCIoZG9jdW1lbnQuaGVhZC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9YXJnb25dJykgIT09IG51bGwgfHwgdHlwZW9mKEFyZ29uKSAhPT0gJ3VuZGVmaW5lZCcpXCIsICkudGhlbigocmVzdWx0OnN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBib29sUmVzdWx0ID0gKHJlc3VsdCA9PT0gXCJ0cnVlXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldElzQXJnb25BcHAoYm9vbFJlc3VsdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IHdlYnZpZXcgPSAodGhpcy5hbmRyb2lkIGFzIGFuZHJvaWQud2Via2l0LldlYlZpZXcpO1xuICAgICAgICAgICAgY29uc3QgdXJsID0gd2Vidmlldy5nZXRVcmwoKTtcbiAgICAgICAgICAgIGlmICh1cmwgIT0gdGhpcy51cmwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGUgcGFnZSBkaWQgbm90IHN1Y2Nlc3NmdWxseSBsb2FkXG4gICAgICAgICAgICAgICAgaWYgKHVybC5zdGFydHNXaXRoKFwiaHR0cHNcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNlcnRpZmljYXRlIGlzIGxpa2VseSBpbnZhbGlkXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoXCJBcmdvbiBjYW5ub3QgY3VycmVudGx5IGxvYWQgaHR0cHMgcGFnZXMgd2l0aCBpbnZhbGlkIGNlcnRpZmljYXRlcy5cIikudGhlbigoKT0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmcgZm9yIG5vd1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy90aGlzLnNldCgndXJsJywgdXJsKTtcbiAgICAgICAgICAgICAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCAndXJsJywgdXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vdGhpcy5zZXQoJ3RpdGxlJywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICAgICAgT2JzZXJ2YWJsZS5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgJ3RpdGxlJywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfc2V0SXNBcmdvbkFwcChmbGFnOmJvb2xlYW4pIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIl9zZXRJc0FyZ29uQXBwOiBcIiArIGZsYWcpO1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvbkFwcCAmJiBmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuVFJBTlNQQVJFTlQpO1xuICAgICAgICAgICAgLy90aGlzLnNldChcImlzQXJnb25BcHBcIiwgdHJ1ZSk7XG4gICAgICAgICAgICBPYnNlcnZhYmxlLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCAnaXNBcmdvbkFwcCcsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNBcmdvbkFwcCAmJiAhZmxhZykge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLldISVRFKTtcbiAgICAgICAgICAgIC8vdGhpcy5zZXQoXCJpc0FyZ29uQXBwXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIE9ic2VydmFibGUucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsICdpc0FyZ29uQXBwJywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdCwgbmV3IGFuZHJvaWQud2Via2l0LlZhbHVlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIG9uUmVjZWl2ZVZhbHVlOiAodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0LCBudWxsKTtcbiAgICB9XG5cbiAgICBicmluZ1RvRnJvbnQoKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5icmluZ1RvRnJvbnQoKTtcbiAgICB9XG5cbiAgICBnZXRXZWJWaWV3VmVyc2lvbigpIDogbnVtYmVyIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSA8YW5kcm9pZC53ZWJraXQuV2ViU2V0dGluZ3M+IHRoaXMuYW5kcm9pZC5nZXRTZXR0aW5ncygpO1xuICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBzZXR0aW5ncy5nZXRVc2VyQWdlbnRTdHJpbmcoKTtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvQ2hyb21lXFwvKFswLTldKykvaTtcbiAgICAgICAgdmFyIG1hdGNoID0gcmVnZXguZXhlYyh1c2VyQWdlbnQpO1xuICAgICAgICBpZiAobWF0Y2ggIT0gbnVsbCAmJiBtYXRjaC5sZW5ndGggPiAxKXtcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIobWF0Y2hbMV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59XG4iXX0=