"use strict";
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
var AndroidWebInterface = io.argonjs.AndroidWebInterface;
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
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
                }
            })));
        });
        _this.on(ArgonWebView.loadStartedEvent, function (args) {
            _this._didCommitNavigation();
            _this.currentUrl = args.url;
            _this.set('title', _this.android.getTitle());
        });
        _this.on(ArgonWebView.loadFinishedEvent, function (args) {
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
ArgonWebView.layersById = {};
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGdEQUFrRDtBQUlsRCxxQ0FBa0M7QUFHbEMsSUFBTSxtQkFBbUIsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO0FBSTNEO0lBQWtDLGdDQUFtQjtJQVFqRDtRQUFBLFlBQ0ksaUJBQU8sU0FxRVY7UUE1RU8sZ0JBQVUsR0FBVyxFQUFFLENBQUM7UUFTdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFRLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbkUsS0FBSSxDQUFDLEVBQUUsQ0FBQyxXQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3RCLG1CQUFtQjtZQUNuQixxREFBcUQ7WUFDckQsc0VBQXNFO1lBRXRFLElBQU0sUUFBUSxHQUFnQyxLQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pFLElBQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLENBQUM7WUFDbEQsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVwQyw0Q0FBNEM7WUFDNUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDWCxLQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxDQUFDO1lBQ0QsMENBQTBDO1lBRTFDLHdGQUF3RjtZQUN4RixJQUFJLFNBQVMsR0FBRyw4Q0FBOEMsR0FBRyxLQUFJLENBQUMsRUFBRSxDQUFDO1lB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QWdEO1FBQ2hELE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFFRCx3Q0FBaUIsR0FBakI7UUFDSSxJQUFNLFFBQVEsR0FBZ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6RSxJQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNoRCxJQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQztRQUNsQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNkLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUE3SEQsQ0FBa0MsTUFBTSxDQUFDLFlBQVk7QUFJbEMsdUJBQVUsR0FFckIsRUFBRSxDQUFDO0FBTkUsb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb21tb24gZnJvbSBcIi4vYXJnb24td2ViLXZpZXctY29tbW9uXCI7XG5pbXBvcnQgKiBhcyBwYWdlIGZyb20gXCJ1aS9wYWdlXCI7XG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tIFwiQGFyZ29uanMvYXJnb25cIjtcbmltcG9ydCB7TG9hZEV2ZW50RGF0YX0gZnJvbSBcInVpL3dlYi12aWV3XCI7XG5pbXBvcnQge1ZpZXd9IGZyb20gXCJ1aS9jb3JlL3ZpZXdcIjtcbmltcG9ydCB7Q29sb3J9IGZyb20gXCJjb2xvclwiO1xuXG5jb25zdCBBbmRyb2lkV2ViSW50ZXJmYWNlID0gaW8uYXJnb25qcy5BbmRyb2lkV2ViSW50ZXJmYWNlO1xuXG5kZWNsYXJlIGNvbnN0IHdpbmRvdyA6IGFueTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcge1xuXG4gICAgcHJpdmF0ZSBjdXJyZW50VXJsOiBzdHJpbmcgPSBcIlwiO1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgbGF5ZXJzQnlJZDoge1xuICAgICAgICBbaWQ6IHN0cmluZ106IEFyZ29uV2ViVmlldyxcbiAgICB9ID0ge307XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJWaWV3KS5zZXRXZWJDb250ZW50c0RlYnVnZ2luZ0VuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5vbihWaWV3LmxvYWRlZEV2ZW50LCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBNYWtlIHRyYW5zcGFyZW50XG4gICAgICAgICAgICAvL3RoaXMuYmFja2dyb3VuZENvbG9yID0gbmV3IENvbG9yKDAsIDI1NSwgMjU1LCAyNTUpO1xuICAgICAgICAgICAgLy90aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuVFJBTlNQQVJFTlQpO1xuXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IDxhbmRyb2lkLndlYmtpdC5XZWJTZXR0aW5ncz4gdGhpcy5hbmRyb2lkLmdldFNldHRpbmdzKCk7XG4gICAgICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBzZXR0aW5ncy5nZXRVc2VyQWdlbnRTdHJpbmcoKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldFVzZXJBZ2VudFN0cmluZyh1c2VyQWdlbnQgKyBcIiBBcmdvblwiKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldEphdmFTY3JpcHRFbmFibGVkKHRydWUpO1xuICAgICAgICAgICAgc2V0dGluZ3Muc2V0RG9tU3RvcmFnZUVuYWJsZWQodHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIFJlbWVtYmVyIGEgcGFydGljdWxhciBpZCBmb3IgZWFjaCB3ZWJ2aWV3XG4gICAgICAgICAgICBpZiAoIXRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkID0gRGF0ZS5ub3coKS50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9BcmdvbldlYlZpZXcubGF5ZXJzQnlJZFt0aGlzLmlkXSA9IHRoaXM7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHVuaXF1ZSBjbGFzcyBuYW1lIGZvciAnZXh0ZW5kJyB0byBiaW5kIHRoZSBvYmplY3QgdG8gdGhpcyBwYXJ0aWN1bGFyIHdlYnZpZXdcbiAgICAgICAgICAgIHZhciBjbGFzc25hbWUgPSBcImlvX2FyZ29uanNfQW5kcm9pZFdlYkludGVyZmFjZV9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLmlkO1xuXG4gICAgICAgICAgICAvLyBJbmplY3QgSmF2YXNjcmlwdCBJbnRlcmZhY2VcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5hZGRKYXZhc2NyaXB0SW50ZXJmYWNlKG5ldyAoKDxhbnk+QW5kcm9pZFdlYkludGVyZmFjZSkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIG9uQXJnb25FdmVudDogKGlkOiBzdHJpbmcsIGV2ZW50OiBzdHJpbmcsIGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnN0IHNlbGYgPSBBcmdvbldlYlZpZXcubGF5ZXJzQnlJZFtpZF07XG4gICAgICAgICAgICAgICAgICAgIC8vaWYgKHNlbGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gXCJhcmdvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ganVzdCBpbiBjYXNlIHdlIHRob3VnaHQgYmVsb3cgdGhhdCB0aGUgcGFnZSB3YXMgbm90IGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0SXNBcmdvbkFwcCh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVBcmdvbk1lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSkobmV3IGphdmEubGFuZy5TdHJpbmcodGhpcy5pZCkpLCBcIl9fYXJnb25fYW5kcm9pZF9fXCIpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSB1bmlxdWUgY2xhc3MgbmFtZSBmb3IgJ2V4dGVuZCcgdG8gYmluZCB0aGUgb2JqZWN0IHRvIHRoaXMgcGFydGljdWxhciB3ZWJ2aWV3XG4gICAgICAgICAgICBjbGFzc25hbWUgPSBcImFuZHJvaWRfd2Via2l0X1dlYkNocm9tZUNsaWVudF9BcmdvbldlYlZpZXdfXCIgKyB0aGlzLmlkO1xuXG4gICAgICAgICAgICAvLyBFeHRlbmQgV2ViQ2hyb21lQ2xpZW50IHRvIGNhcHR1cmUgbG9nIG91dHB1dFxuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldFdlYkNocm9tZUNsaWVudChuZXcgKCg8YW55PmFuZHJvaWQud2Via2l0LldlYkNocm9tZUNsaWVudCkuZXh0ZW5kKGNsYXNzbmFtZSwge1xuICAgICAgICAgICAgICAgIG9uQ29uc29sZU1lc3NhZ2U6IChjb25zb2xlTWVzc2FnZTogYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxldmVsID0gJ2xvZyc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25zb2xlTWVzc2FnZS5tZXNzYWdlTGV2ZWwoKSA9PSBhbmRyb2lkLndlYmtpdC5Db25zb2xlTWVzc2FnZS5NZXNzYWdlTGV2ZWwuV0FSTklORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWwgPSAnd2Fybic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uc29sZU1lc3NhZ2UubWVzc2FnZUxldmVsKCkgPT0gYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UuTWVzc2FnZUxldmVsLkVSUk9SKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbCA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnN0cmluZ2lmeSh7dHlwZTpsZXZlbCwgbWVzc2FnZTpjb25zb2xlTWVzc2FnZS5tZXNzYWdlKCl9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlTG9nTWVzc2FnZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub24oQXJnb25XZWJWaWV3LmxvYWRTdGFydGVkRXZlbnQsIChhcmdzOkxvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2RpZENvbW1pdE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFVybCA9IGFyZ3MudXJsO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RpdGxlJywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLm9uKEFyZ29uV2ViVmlldy5sb2FkRmluaXNoZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RpdGxlJywgdGhpcy5hbmRyb2lkLmdldFRpdGxlKCkpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3Byb2dyZXNzJywgdGhpcy5hbmRyb2lkLmdldFByb2dyZXNzKCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXQgcHJvZ3Jlc3MoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFuZHJvaWQuZ2V0UHJvZ3Jlc3MoKTtcbiAgICB9XG5cbiAgICBfc2V0SXNBcmdvbkFwcChmbGFnOmJvb2xlYW4pIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIl9zZXRJc0FyZ29uQXBwOiBcIiArIGZsYWcpO1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvbkFwcCAmJiBmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuVFJBTlNQQVJFTlQpO1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJpc0FyZ29uQXBwXCIsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNBcmdvbkFwcCAmJiAhZmxhZykge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLldISVRFKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0LCBuZXcgYW5kcm9pZC53ZWJraXQuVmFsdWVDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgb25SZWNlaXZlVmFsdWU6ICh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGJyaW5nVG9Gcm9udCgpIHtcbiAgICAgICAgdGhpcy5hbmRyb2lkLmJyaW5nVG9Gcm9udCgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDdXJyZW50VXJsKCkgOiBzdHJpbmcge1xuICAgICAgICAvLyBvbiBBbmRyb2lkLCB0aGUgdXJsIHByb3BlcnR5IGlzbid0IHVwZGF0ZWQgdW50aWwgYWZ0ZXIgdGhlIHBhZ2UgYXBwZWFyc1xuICAgICAgICAvLyB3ZSBuZWVkIGl0IHVwZGF0ZWQgYXMgc29vbiBhcyB0aGUgbG9hZCBzdGFydHNcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFVybDtcbiAgICB9XG5cbiAgICBnZXRXZWJWaWV3VmVyc2lvbigpIDogbnVtYmVyIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSA8YW5kcm9pZC53ZWJraXQuV2ViU2V0dGluZ3M+IHRoaXMuYW5kcm9pZC5nZXRTZXR0aW5ncygpO1xuICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBzZXR0aW5ncy5nZXRVc2VyQWdlbnRTdHJpbmcoKTtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvQ2hyb21lXFwvKFswLTldKykvaTtcbiAgICAgICAgdmFyIG1hdGNoID0gcmVnZXguZXhlYyh1c2VyQWdlbnQpO1xuICAgICAgICBpZiAobWF0Y2ggIT0gbnVsbCAmJiBtYXRjaC5sZW5ndGggPiAxKXtcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIobWF0Y2hbMV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59XG4iXX0=