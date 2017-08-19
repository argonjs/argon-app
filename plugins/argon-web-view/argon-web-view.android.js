"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var dialogs = require("ui/dialogs");
var Argon = require("@argonjs/argon");
//import {Color} from "color";
var AndroidWebInterface = io.argonjs.AndroidWebInterface;
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this._instanceId = ++ArgonWebView._count + "";
        android.webkit.WebView.setWebContentsDebuggingEnabled(true);
        _this.on(view_1.View.loadedEvent, function () {
            // Make transparent
            //this.backgroundColor = new Color(0, 255, 255, 255);
            //this.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            var settings = _this.android.getSettings();
            var userAgent = settings.getUserAgentString();
            settings.setUserAgentString(userAgent + " Argon/" + Argon.version);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            // Create a unique class name for 'extend' to bind the object to this particular webview
            var classname = "io_argonjs_AndroidWebInterface_ArgonWebView_" + _this._instanceId;
            // Inject Javascript Interface
            _this.android.addJavascriptInterface(new (AndroidWebInterface.extend(classname, {
                onArgonEvent: function (id, event, data) {
                    //const self = ArgonWebView.layersById[id];
                    //if (self) {
                    if (event === "argon") {
                        // just in case we thought below that the page was not an
                        // argon page, perhaps because argon.js loaded asyncronously 
                        // and the programmer didn't set up an argon meta tag
                        _this._setIsArgonPage(true);
                        _this._handleArgonMessage(data);
                    }
                    //}
                },
            }))(new java.lang.String(_this._instanceId)), "__argon_android__");
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
                    common.progressProperty.nativeValueChange(_this, newProgress / 100);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBa0Q7QUFFbEQscUNBQWtDO0FBQ2xDLG9DQUF1QztBQUN2QyxzQ0FBdUM7QUFDdkMsOEJBQThCO0FBRTlCLElBQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztBQUUzRDtJQUFrQyxnQ0FBbUI7SUFLakQ7UUFBQSxZQUNJLGlCQUFPLFNBZ0dWO1FBbkdPLGlCQUFXLEdBQVUsRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUs5QyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQVEsQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuRSxLQUFJLENBQUMsRUFBRSxDQUFDLFdBQUksQ0FBQyxXQUFXLEVBQUU7WUFDdEIsbUJBQW1CO1lBQ25CLHFEQUFxRDtZQUNyRCxzRUFBc0U7WUFFdEUsSUFBTSxRQUFRLEdBQWdDLEtBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekUsSUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDaEQsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxTQUFTLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25FLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFcEMsd0ZBQXdGO1lBQ3hGLElBQUksU0FBUyxHQUFHLDhDQUE4QyxHQUFHLEtBQUksQ0FBQyxXQUFXLENBQUM7WUFFbEYsOEJBQThCO1lBQzlCLEtBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFPLG1CQUFvQixDQUFDLE1B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UCxDQUFDO0lBRUQsdURBQWdDLEdBQWhDLFVBQWlDLE1BQWE7UUFDMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELG1DQUFZLEdBQVo7UUFDSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFRCx3Q0FBaUIsR0FBakI7UUFDSSxJQUFNLFFBQVEsR0FBZ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6RSxJQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNoRCxJQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQztRQUNsQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNkLENBQUM7SUE1SWMsbUJBQU0sR0FBVSxDQUFDLENBQUM7SUE2SXJDLG1CQUFDO0NBQUEsQUEvSUQsQ0FBa0MsTUFBTSxDQUFDLFlBQVksR0ErSXBEO0FBL0lZLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29tbW9uIGZyb20gXCIuL2FyZ29uLXdlYi12aWV3LWNvbW1vblwiO1xuaW1wb3J0IHtMb2FkRXZlbnREYXRhfSBmcm9tIFwidWkvd2ViLXZpZXdcIjtcbmltcG9ydCB7Vmlld30gZnJvbSBcInVpL2NvcmUvdmlld1wiO1xuaW1wb3J0IGRpYWxvZ3MgPSByZXF1aXJlKFwidWkvZGlhbG9nc1wiKTtcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuLy9pbXBvcnQge0NvbG9yfSBmcm9tIFwiY29sb3JcIjtcblxuY29uc3QgQW5kcm9pZFdlYkludGVyZmFjZSA9IGlvLmFyZ29uanMuQW5kcm9pZFdlYkludGVyZmFjZTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcge1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgX2NvdW50Om51bWJlciA9IDE7XG4gICAgcHJpdmF0ZSBfaW5zdGFuY2VJZDpzdHJpbmcgPSArK0FyZ29uV2ViVmlldy5fY291bnQgKyBcIlwiO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgKDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViVmlldykuc2V0V2ViQ29udGVudHNEZWJ1Z2dpbmdFbmFibGVkKHRydWUpO1xuXG4gICAgICAgIHRoaXMub24oVmlldy5sb2FkZWRFdmVudCwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gTWFrZSB0cmFuc3BhcmVudFxuICAgICAgICAgICAgLy90aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICAgICAgICAgIC8vdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcblxuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSA8YW5kcm9pZC53ZWJraXQuV2ViU2V0dGluZ3M+IHRoaXMuYW5kcm9pZC5nZXRTZXR0aW5ncygpO1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gc2V0dGluZ3MuZ2V0VXNlckFnZW50U3RyaW5nKCk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRVc2VyQWdlbnRTdHJpbmcodXNlckFnZW50ICsgXCIgQXJnb24vXCIgKyBBcmdvbi52ZXJzaW9uKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldEphdmFTY3JpcHRFbmFibGVkKHRydWUpO1xuICAgICAgICAgICAgc2V0dGluZ3Muc2V0RG9tU3RvcmFnZUVuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHVuaXF1ZSBjbGFzcyBuYW1lIGZvciAnZXh0ZW5kJyB0byBiaW5kIHRoZSBvYmplY3QgdG8gdGhpcyBwYXJ0aWN1bGFyIHdlYnZpZXdcbiAgICAgICAgICAgIHZhciBjbGFzc25hbWUgPSBcImlvX2FyZ29uanNfQW5kcm9pZFdlYkludGVyZmFjZV9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLl9pbnN0YW5jZUlkO1xuXG4gICAgICAgICAgICAvLyBJbmplY3QgSmF2YXNjcmlwdCBJbnRlcmZhY2VcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5hZGRKYXZhc2NyaXB0SW50ZXJmYWNlKG5ldyAoKDxhbnk+QW5kcm9pZFdlYkludGVyZmFjZSkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIG9uQXJnb25FdmVudDogKGlkOiBzdHJpbmcsIGV2ZW50OiBzdHJpbmcsIGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnN0IHNlbGYgPSBBcmdvbldlYlZpZXcubGF5ZXJzQnlJZFtpZF07XG4gICAgICAgICAgICAgICAgICAgIC8vaWYgKHNlbGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gXCJhcmdvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ganVzdCBpbiBjYXNlIHdlIHRob3VnaHQgYmVsb3cgdGhhdCB0aGUgcGFnZSB3YXMgbm90IGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0SXNBcmdvblBhZ2UodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQXJnb25NZXNzYWdlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpKG5ldyBqYXZhLmxhbmcuU3RyaW5nKHRoaXMuX2luc3RhbmNlSWQpKSwgXCJfX2FyZ29uX2FuZHJvaWRfX1wiKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgdW5pcXVlIGNsYXNzIG5hbWUgZm9yICdleHRlbmQnIHRvIGJpbmQgdGhlIG9iamVjdCB0byB0aGlzIHBhcnRpY3VsYXIgd2Vidmlld1xuICAgICAgICAgICAgY2xhc3NuYW1lID0gXCJhbmRyb2lkX3dlYmtpdF9XZWJDaHJvbWVDbGllbnRfQXJnb25XZWJWaWV3X1wiICsgdGhpcy5pZDtcblxuICAgICAgICAgICAgLy8gRXh0ZW5kIFdlYkNocm9tZUNsaWVudCB0byBjYXB0dXJlIGxvZyBvdXRwdXRcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRXZWJDaHJvbWVDbGllbnQobmV3ICgoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJDaHJvbWVDbGllbnQpLmV4dGVuZChjbGFzc25hbWUsIHtcbiAgICAgICAgICAgICAgICBvbkNvbnNvbGVNZXNzYWdlOiAoY29uc29sZU1lc3NhZ2U6IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsZXZlbCA9ICdsb2cnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZU1lc3NhZ2UubWVzc2FnZUxldmVsKCkgPT0gYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UuTWVzc2FnZUxldmVsLldBUk5JTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsID0gJ3dhcm4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGVNZXNzYWdlLm1lc3NhZ2VMZXZlbCgpID09IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlLk1lc3NhZ2VMZXZlbC5FUlJPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWwgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoe3R5cGU6bGV2ZWwsIG1lc3NhZ2U6Y29uc29sZU1lc3NhZ2UubWVzc2FnZSgpfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUxvZ01lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uR2VvbG9jYXRpb25QZXJtaXNzaW9uc1Nob3dQcm9tcHQ6IChvcmlnaW46IHN0cmluZywgY2FsbGJhY2s6IGFuZHJvaWQud2Via2l0Lkdlb2xvY2F0aW9uUGVybWlzc2lvbnMuSUNhbGxiYWNrKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBvcmlnaW4gKyBcIiB3YW50cyB0byB1c2UgeW91ciBkZXZpY2UncyBsb2NhdGlvbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9rQnV0dG9uVGV4dDogXCJPS1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJEb24ndCBBbGxvd1wiXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suaW52b2tlKG9yaWdpbiwgdHJ1ZSwgZmFsc2UpOyAvLyBncmFudCBnZW9sb2NhdGlvbiBwZXJtaXNzaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmludm9rZShvcmlnaW4sIGZhbHNlLCBmYWxzZSk7IC8vIGRlbnkgZ2VvbG9jYXRpb24gcGVybWlzc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3NDaGFuZ2VkOiAodmlldzogYW5kcm9pZC53ZWJraXQuV2ViVmlldywgbmV3UHJvZ3Jlc3M6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb21tb24ucHJvZ3Jlc3NQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCBuZXdQcm9ncmVzcyAvIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5vbihBcmdvbldlYlZpZXcubG9hZFN0YXJ0ZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fZGlkQ29tbWl0TmF2aWdhdGlvbigpO1xuICAgICAgICAgICAgY29tbW9uLnRpdGxlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgYXJncy51cmwpO1xuICAgICAgICAgICAgY29tbW9uLnRpdGxlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLm9uKEFyZ29uV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZUphdmFzY3JpcHQoXCIoZG9jdW1lbnQuaGVhZC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9YXJnb25dJykgIT09IG51bGwgfHwgdHlwZW9mKEFyZ29uKSAhPT0gJ3VuZGVmaW5lZCcpXCIsICkudGhlbigocmVzdWx0OnN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBib29sUmVzdWx0ID0gKHJlc3VsdCA9PT0gXCJ0cnVlXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldElzQXJnb25QYWdlKGJvb2xSZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCB3ZWJ2aWV3ID0gKHRoaXMuYW5kcm9pZCBhcyBhbmRyb2lkLndlYmtpdC5XZWJWaWV3KTtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHdlYnZpZXcuZ2V0VXJsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh1cmwgIT0gdGhpcy51cmwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGUgcGFnZSBkaWQgbm90IHN1Y2Nlc3NmdWxseSBsb2FkXG4gICAgICAgICAgICAgICAgaWYgKHVybC5zdGFydHNXaXRoKFwiaHR0cHNcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNlcnRpZmljYXRlIGlzIGxpa2VseSBpbnZhbGlkXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoXCJBcmdvbiBjYW5ub3QgY3VycmVudGx5IGxvYWQgaHR0cHMgcGFnZXMgd2l0aCBpbnZhbGlkIGNlcnRpZmljYXRlcy5cIikudGhlbigoKT0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmcgZm9yIG5vd1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbW1vbi50aXRsZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIHVybCk7XG4gICAgICAgICAgICBjb21tb24udGl0bGVQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCB0aGlzLmFuZHJvaWQuZ2V0VGl0bGUoKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIF9zZXRJc0FyZ29uUGFnZShmbGFnOmJvb2xlYW4pIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIl9zZXRJc0FyZ29uQXBwOiBcIiArIGZsYWcpO1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvblBhZ2UgJiYgZmxhZykge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcbiAgICAgICAgICAgIGNvbW1vbi5pc0FyZ29uUGFnZVByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNBcmdvblBhZ2UgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5XSElURSk7XG4gICAgICAgICAgICBjb21tb24uaXNBcmdvblBhZ2VQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0LCBuZXcgYW5kcm9pZC53ZWJraXQuVmFsdWVDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgb25SZWNlaXZlVmFsdWU6ICh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKHNjcmlwdDpzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLmV2YWx1YXRlSmF2YXNjcmlwdChzY3JpcHQsIG51bGwpO1xuICAgIH1cblxuICAgIGJyaW5nVG9Gcm9udCgpIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLmJyaW5nVG9Gcm9udCgpO1xuICAgIH1cblxuICAgIGdldFdlYlZpZXdWZXJzaW9uKCkgOiBudW1iZXIge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IDxhbmRyb2lkLndlYmtpdC5XZWJTZXR0aW5ncz4gdGhpcy5hbmRyb2lkLmdldFNldHRpbmdzKCk7XG4gICAgICAgIGNvbnN0IHVzZXJBZ2VudCA9IHNldHRpbmdzLmdldFVzZXJBZ2VudFN0cmluZygpO1xuICAgICAgICBjb25zdCByZWdleCA9IC9DaHJvbWVcXC8oWzAtOV0rKS9pO1xuICAgICAgICB2YXIgbWF0Y2ggPSByZWdleC5leGVjKHVzZXJBZ2VudCk7XG4gICAgICAgIGlmIChtYXRjaCAhPSBudWxsICYmIG1hdGNoLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihtYXRjaFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn1cbiJdfQ==