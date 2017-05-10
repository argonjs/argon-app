"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var dialogs = require("ui/dialogs");
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
        _this.currentUrl = "";
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
                }
            })));
        });
        _this.on(ArgonWebView.loadStartedEvent, function (args) {
            _this._didCommitNavigation();
            _this.currentUrl = args.url;
            _this.set('title', _this.android.getTitle());
        });
        _this.on(ArgonWebView.loadFinishedEvent, function (args) {
            _this.evaluateJavascript("(document.head.querySelector('meta[name=argon]') !== null || typeof(Argon) !== 'undefined')").then(function (result) {
                var boolResult = (result === "true");
                _this._setIsArgonApp(boolResult);
            });
            if (_this.android.getUrl() != _this.currentUrl) {
                // the page did not successfully load
                if (_this.currentUrl.startsWith("https")) {
                    // the certificate is likely invalid
                    dialogs.alert("Argon cannot currently load https pages with invalid certificates.").then(function () {
                        // do nothing for now
                    });
                }
                _this.currentUrl = _this.android.getUrl();
            }
            _this.set('title', _this.android.getTitle());
            _this.set('progress', _this.android.getProgress());
        });
        return _this;
    }
    Object.defineProperty(ArgonWebView.prototype, "progress", {
        get: function () {
            return this.android.getProgress();
        },
        enumerable: true,
        configurable: true
    });
    ArgonWebView.prototype._setIsArgonApp = function (flag) {
        //console.log("_setIsArgonApp: " + flag);
        if (!this.isArgonApp && flag) {
            this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            this.set("isArgonApp", true);
        }
        else if (this.isArgonApp && !flag) {
            this.android.setBackgroundColor(android.graphics.Color.WHITE);
            this.set("isArgonApp", false);
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
    ArgonWebView.prototype.getCurrentUrl = function () {
        // on Android, the url property isn't updated until after the page appears
        // we need it updated as soon as the load starts
        return this.currentUrl;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBa0Q7QUFFbEQscUNBQWtDO0FBQ2xDLG9DQUF1QztBQUN2Qyw4QkFBOEI7QUFFOUIsSUFBTSxtQkFBbUIsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO0FBRTNEO0lBQWtDLGdDQUFtQjtJQUlqRDs7OztNQUlFO0lBRUY7UUFBQSxZQUNJLGlCQUFPLFNBZ0dWO1FBekdPLGdCQUFVLEdBQVcsRUFBRSxDQUFDO1FBV3RCLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBUSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRW5FLEtBQUksQ0FBQyxFQUFFLENBQUMsV0FBSSxDQUFDLFdBQVcsRUFBRTtZQUN0QixtQkFBbUI7WUFDbkIscURBQXFEO1lBQ3JELHNFQUFzRTtZQUV0RSxJQUFNLFFBQVEsR0FBZ0MsS0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN6RSxJQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUNoRCxRQUFRLENBQUMsa0JBQWtCLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFcEMsNENBQTRDO1lBQzVDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsS0FBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEMsQ0FBQztZQUNELDBDQUEwQztZQUUxQyx3RkFBd0Y7WUFDeEYsSUFBSSxTQUFT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QUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCx1REFBZ0MsR0FBaEMsVUFBaUMsTUFBYTtRQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsbUNBQVksR0FBWjtRQUNJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVNLG9DQUFhLEdBQXBCO1FBQ0ksMEVBQTBFO1FBQzFFLGdEQUFnRDtRQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUMzQixDQUFDO0lBRUQsd0NBQWlCLEdBQWpCO1FBQ0ksSUFBTSxRQUFRLEdBQWdDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDekUsSUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDaEQsSUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUM7UUFDbEMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsQyxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQztZQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDO0lBQ0wsbUJBQUM7QUFBRCxDQUFDLEFBOUpELENBQWtDLE1BQU0sQ0FBQyxZQUFZLEdBOEpwRDtBQTlKWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvbW1vbiBmcm9tIFwiLi9hcmdvbi13ZWItdmlldy1jb21tb25cIjtcbmltcG9ydCB7TG9hZEV2ZW50RGF0YX0gZnJvbSBcInVpL3dlYi12aWV3XCI7XG5pbXBvcnQge1ZpZXd9IGZyb20gXCJ1aS9jb3JlL3ZpZXdcIjtcbmltcG9ydCBkaWFsb2dzID0gcmVxdWlyZShcInVpL2RpYWxvZ3NcIik7XG4vL2ltcG9ydCB7Q29sb3J9IGZyb20gXCJjb2xvclwiO1xuXG5jb25zdCBBbmRyb2lkV2ViSW50ZXJmYWNlID0gaW8uYXJnb25qcy5BbmRyb2lkV2ViSW50ZXJmYWNlO1xuXG5leHBvcnQgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgY29tbW9uLkFyZ29uV2ViVmlldyB7XG5cbiAgICBwcml2YXRlIGN1cnJlbnRVcmw6IHN0cmluZyA9IFwiXCI7XG5cbiAgICAvKlxuICAgIHByaXZhdGUgc3RhdGljIGxheWVyc0J5SWQ6IHtcbiAgICAgICAgW2lkOiBzdHJpbmddOiBBcmdvbldlYlZpZXcsXG4gICAgfSA9IHt9O1xuICAgICovXG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJWaWV3KS5zZXRXZWJDb250ZW50c0RlYnVnZ2luZ0VuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5vbihWaWV3LmxvYWRlZEV2ZW50LCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBNYWtlIHRyYW5zcGFyZW50XG4gICAgICAgICAgICAvL3RoaXMuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICAgICAgLy90aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuVFJBTlNQQVJFTlQpO1xuXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IDxhbmRyb2lkLndlYmtpdC5XZWJTZXR0aW5ncz4gdGhpcy5hbmRyb2lkLmdldFNldHRpbmdzKCk7XG4gICAgICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBzZXR0aW5ncy5nZXRVc2VyQWdlbnRTdHJpbmcoKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldFVzZXJBZ2VudFN0cmluZyh1c2VyQWdlbnQgKyBcIiBBcmdvblwiKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldEphdmFTY3JpcHRFbmFibGVkKHRydWUpO1xuICAgICAgICAgICAgc2V0dGluZ3Muc2V0RG9tU3RvcmFnZUVuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIFJlbWVtYmVyIGEgcGFydGljdWxhciBpZCBmb3IgZWFjaCB3ZWJ2aWV3XG4gICAgICAgICAgICBpZiAoIXRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkID0gRGF0ZS5ub3coKS50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9BcmdvbldlYlZpZXcubGF5ZXJzQnlJZFt0aGlzLmlkXSA9IHRoaXM7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHVuaXF1ZSBjbGFzcyBuYW1lIGZvciAnZXh0ZW5kJyB0byBiaW5kIHRoZSBvYmplY3QgdG8gdGhpcyBwYXJ0aWN1bGFyIHdlYnZpZXdcbiAgICAgICAgICAgIHZhciBjbGFzc25hbWUgPSBcImlvX2FyZ29uanNfQW5kcm9pZFdlYkludGVyZmFjZV9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLmlkO1xuXG4gICAgICAgICAgICAvLyBJbmplY3QgSmF2YXNjcmlwdCBJbnRlcmZhY2VcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5hZGRKYXZhc2NyaXB0SW50ZXJmYWNlKG5ldyAoKDxhbnk+QW5kcm9pZFdlYkludGVyZmFjZSkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIG9uQXJnb25FdmVudDogKGlkOiBzdHJpbmcsIGV2ZW50OiBzdHJpbmcsIGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnN0IHNlbGYgPSBBcmdvbldlYlZpZXcubGF5ZXJzQnlJZFtpZF07XG4gICAgICAgICAgICAgICAgICAgIC8vaWYgKHNlbGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gXCJhcmdvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ganVzdCBpbiBjYXNlIHdlIHRob3VnaHQgYmVsb3cgdGhhdCB0aGUgcGFnZSB3YXMgbm90IGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVBcmdvbk1lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSkobmV3IGphdmEubGFuZy5TdHJpbmcodGhpcy5pZCkpLCBcIl9fYXJnb25fYW5kcm9pZF9fXCIpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSB1bmlxdWUgY2xhc3MgbmFtZSBmb3IgJ2V4dGVuZCcgdG8gYmluZCB0aGUgb2JqZWN0IHRvIHRoaXMgcGFydGljdWxhciB3ZWJ2aWV3XG4gICAgICAgICAgICBjbGFzc25hbWUgPSBcImFuZHJvaWRfd2Via2l0X1dlYkNocm9tZUNsaWVudF9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLmlkO1xuXG4gICAgICAgICAgICAvLyBFeHRlbmQgV2ViQ2hyb21lQ2xpZW50IHRvIGNhcHR1cmUgbG9nIG91dHB1dFxuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldFdlYkNocm9tZUNsaWVudChuZXcgKCg8YW55PmFuZHJvaWQud2Via2l0LldlYkNocm9tZUNsaWVudCkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIG9uQ29uc29sZU1lc3NhZ2U6IChjb25zb2xlTWVzc2FnZTogYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxldmVsID0gJ2xvZyc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25zb2xlTWVzc2FnZS5tZXNzYWdlTGV2ZWwoKSA9PSBhbmRyb2lkLndlYmtpdC5Db25zb2xlTWVzc2FnZS5NZXNzYWdlTGV2ZWwuV0FSTklORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWwgPSAnd2Fybic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uc29sZU1lc3NhZ2UubWVzc2FnZUxldmVsKCkgPT0gYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UuTWVzc2FnZUxldmVsLkVSUk9SKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbCA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnN0cmluZ2lmeSh7dHlwZTpsZXZlbCwgbWVzc2FnZTpjb25zb2xlTWVzc2FnZS5tZXNzYWdlKCl9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlTG9nTWVzc2FnZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25HZW9sb2NhdGlvblBlcm1pc3Npb25zU2hvd1Byb21wdDogKG9yaWdpbjogc3RyaW5nLCBjYWxsYmFjazogYW5kcm9pZC53ZWJraXQuR2VvbG9jYXRpb25QZXJtaXNzaW9ucy5JQ2FsbGJhY2spOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG9yaWdpbiArIFwiIHdhbnRzIHRvIHVzZSB5b3VyIGRldmljZSdzIGxvY2F0aW9uLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBcIk9LXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkRvbid0IEFsbG93XCJcbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5pbnZva2Uob3JpZ2luLCB0cnVlLCBmYWxzZSk7IC8vIGdyYW50IGdlb2xvY2F0aW9uIHBlcm1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suaW52b2tlKG9yaWdpbiwgZmFsc2UsIGZhbHNlKTsgLy8gZGVueSBnZW9sb2NhdGlvbiBwZXJtaXNzaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub24oQXJnb25XZWJWaWV3LmxvYWRTdGFydGVkRXZlbnQsIChhcmdzOkxvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2RpZENvbW1pdE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFVybCA9IGFyZ3MudXJsO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RpdGxlJywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLm9uKEFyZ29uV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZUphdmFzY3JpcHQoXCIoZG9jdW1lbnQuaGVhZC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9YXJnb25dJykgIT09IG51bGwgfHwgdHlwZW9mKEFyZ29uKSAhPT0gJ3VuZGVmaW5lZCcpXCIsICkudGhlbigocmVzdWx0OnN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBib29sUmVzdWx0ID0gKHJlc3VsdCA9PT0gXCJ0cnVlXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldElzQXJnb25BcHAoYm9vbFJlc3VsdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICh0aGlzLmFuZHJvaWQuZ2V0VXJsKCkgIT0gdGhpcy5jdXJyZW50VXJsKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhlIHBhZ2UgZGlkIG5vdCBzdWNjZXNzZnVsbHkgbG9hZFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRVcmwuc3RhcnRzV2l0aChcImh0dHBzXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjZXJ0aWZpY2F0ZSBpcyBsaWtlbHkgaW52YWxpZFxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFsZXJ0KFwiQXJnb24gY2Fubm90IGN1cnJlbnRseSBsb2FkIGh0dHBzIHBhZ2VzIHdpdGggaW52YWxpZCBjZXJ0aWZpY2F0ZXMuXCIpLnRoZW4oKCk9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nIGZvciBub3dcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFVybCA9IHRoaXMuYW5kcm9pZC5nZXRVcmwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0KCd0aXRsZScsIHRoaXMuYW5kcm9pZC5nZXRUaXRsZSgpKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdwcm9ncmVzcycsIHRoaXMuYW5kcm9pZC5nZXRQcm9ncmVzcygpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0IHByb2dyZXNzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFByb2dyZXNzKCk7XG4gICAgfVxuXG4gICAgX3NldElzQXJnb25BcHAoZmxhZzpib29sZWFuKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJfc2V0SXNBcmdvbkFwcDogXCIgKyBmbGFnKTtcbiAgICAgICAgaWYgKCF0aGlzLmlzQXJnb25BcHAgJiYgZmxhZykge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzQXJnb25BcHAgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5XSElURSk7XG4gICAgICAgICAgICB0aGlzLnNldChcImlzQXJnb25BcHBcIiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdCwgbmV3IGFuZHJvaWQud2Via2l0LlZhbHVlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIG9uUmVjZWl2ZVZhbHVlOiAodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0LCBudWxsKTtcbiAgICB9XG5cbiAgICBicmluZ1RvRnJvbnQoKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5icmluZ1RvRnJvbnQoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q3VycmVudFVybCgpIDogc3RyaW5nIHtcbiAgICAgICAgLy8gb24gQW5kcm9pZCwgdGhlIHVybCBwcm9wZXJ0eSBpc24ndCB1cGRhdGVkIHVudGlsIGFmdGVyIHRoZSBwYWdlIGFwcGVhcnNcbiAgICAgICAgLy8gd2UgbmVlZCBpdCB1cGRhdGVkIGFzIHNvb24gYXMgdGhlIGxvYWQgc3RhcnRzXG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRVcmw7XG4gICAgfVxuXG4gICAgZ2V0V2ViVmlld1ZlcnNpb24oKSA6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gPGFuZHJvaWQud2Via2l0LldlYlNldHRpbmdzPiB0aGlzLmFuZHJvaWQuZ2V0U2V0dGluZ3MoKTtcbiAgICAgICAgY29uc3QgdXNlckFnZW50ID0gc2V0dGluZ3MuZ2V0VXNlckFnZW50U3RyaW5nKCk7XG4gICAgICAgIGNvbnN0IHJlZ2V4ID0gL0Nocm9tZVxcLyhbMC05XSspL2k7XG4gICAgICAgIHZhciBtYXRjaCA9IHJlZ2V4LmV4ZWModXNlckFnZW50KTtcbiAgICAgICAgaWYgKG1hdGNoICE9IG51bGwgJiYgbWF0Y2gubGVuZ3RoID4gMSl7XG4gICAgICAgICAgICByZXR1cm4gTnVtYmVyKG1hdGNoWzFdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxufVxuIl19