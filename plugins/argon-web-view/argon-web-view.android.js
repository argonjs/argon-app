"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./argon-web-view-common");
var view_1 = require("ui/core/view");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBa0Q7QUFFbEQscUNBQWtDO0FBQ2xDLDhCQUE4QjtBQUU5QixJQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7QUFFM0Q7SUFBa0MsZ0NBQW1CO0lBSWpEOzs7O01BSUU7SUFFRjtRQUFBLFlBQ0ksaUJBQU8sU0FxRVY7UUE5RU8sZ0JBQVUsR0FBVyxFQUFFLENBQUM7UUFXdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFRLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbkUsS0FBSSxDQUFDLEVBQUUsQ0FBQyxXQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3RCLG1CQUFtQjtZQUNuQixxREFBcUQ7WUFDckQsc0VBQXNFO1lBRXRFLElBQU0sUUFBUSxHQUFnQyxLQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pFLElBQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLENBQUM7WUFDbEQsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVwQyw0Q0FBNEM7WUFDNUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDWCxLQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxDQUFDO1lBQ0QsMENBQTBDO1lBRTFDLHdGQUF3RjtZQUN4RixJQUFJLFNBQVMsR0FBRyw4Q0FBOEMsR0FBRyxLQUFJLENBQUMsRUFBRSxDQUFDO1lBRXpFLDhCQUE4QjtZQUM5QixLQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBTyxtQkFBb0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO2dCQUNsRixZQUFZLEVBQUUsVUFBQyxFQUFVLEVBQUUsS0FBYSxFQUFFLElBQVk7b0JBQ2xELDJDQUEyQztvQkFDM0MsYUFBYTtvQkFDVCxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDcEIseURBQXlEO3dCQUN6RCw2REFBNkQ7d0JBQzdELHFEQUFxRDt3QkFDckQsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDMUIsS0FBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNuQyxDQUFDO29CQUNMLEdBQUc7Z0JBQ1AsQ0FBQzthQUNKLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUV6RCx3RkFBd0Y7WUFDeEYsU0FBUyxHQUFHLDhDQUE4QyxHQUFHLEtBQUksQ0FBQyxFQUFFLENBQUM7WUFFckUsK0NBQStDO1lBQy9DLEtBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZ0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO2dCQUN6RixnQkFBZ0IsRUFBRSxVQUFDLGNBQTZDO29CQUM1RCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7b0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDdEYsS0FBSyxHQUFHLE1BQU0sQ0FBQztvQkFDbkIsQ0FBQztvQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUMzRixLQUFLLEdBQUcsT0FBTyxDQUFDO29CQUNwQixDQUFDO29CQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxJQUFJLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBQyxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUMsQ0FBQyxDQUFDO29CQUMxRSxLQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzdCLE1BQU0sQ0FBQyxLQUFLLENBQUM7Z0JBQ2pCLENBQUM7YUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1QsQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxVQUFDLElBQWtCO1lBQ3RELEtBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVCLEtBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUMzQixLQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxVQUFDLElBQWtCO1lBQ3ZELEtBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMzQyxLQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7O0lBQ1AsQ0FBQztJQUVELHNCQUFJLGtDQUFRO2FBQVo7WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN0QyxDQUFDOzs7T0FBQTtJQUVELHFDQUFjLEdBQWQsVUFBZSxJQUFZO1FBQ3ZCLHlDQUF5QztRQUN6QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsQyxDQUFDO0lBQ0wsQ0FBQztJQUVELHlDQUFrQixHQUFsQixVQUFtQixNQUFjO1FBQWpDLGlCQVFDO1FBUEcsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDL0IsS0FBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztnQkFDckUsY0FBYyxFQUFFLFVBQUMsS0FBVTtvQkFDdkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQixDQUFDO2FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDUixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCx1REFBZ0MsR0FBaEMsVUFBaUMsTUFBYTtRQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsbUNBQVksR0FBWjtRQUNJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVNLG9DQUFhLEdBQXBCO1FBQ0ksMEVBQTBFO1FBQzFFLGdEQUFnRDtRQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUMzQixDQUFDO0lBRUQsd0NBQWlCLEdBQWpCO1FBQ0ksSUFBTSxRQUFRLEdBQWdDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDekUsSUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDaEQsSUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUM7UUFDbEMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsQyxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQztZQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDO0lBQ0wsbUJBQUM7QUFBRCxDQUFDLEFBbklELENBQWtDLE1BQU0sQ0FBQyxZQUFZLEdBbUlwRDtBQW5JWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvbW1vbiBmcm9tIFwiLi9hcmdvbi13ZWItdmlldy1jb21tb25cIjtcbmltcG9ydCB7TG9hZEV2ZW50RGF0YX0gZnJvbSBcInVpL3dlYi12aWV3XCI7XG5pbXBvcnQge1ZpZXd9IGZyb20gXCJ1aS9jb3JlL3ZpZXdcIjtcbi8vaW1wb3J0IHtDb2xvcn0gZnJvbSBcImNvbG9yXCI7XG5cbmNvbnN0IEFuZHJvaWRXZWJJbnRlcmZhY2UgPSBpby5hcmdvbmpzLkFuZHJvaWRXZWJJbnRlcmZhY2U7XG5cbmV4cG9ydCBjbGFzcyBBcmdvbldlYlZpZXcgZXh0ZW5kcyBjb21tb24uQXJnb25XZWJWaWV3IHtcblxuICAgIHByaXZhdGUgY3VycmVudFVybDogc3RyaW5nID0gXCJcIjtcblxuICAgIC8qXG4gICAgcHJpdmF0ZSBzdGF0aWMgbGF5ZXJzQnlJZDoge1xuICAgICAgICBbaWQ6IHN0cmluZ106IEFyZ29uV2ViVmlldyxcbiAgICB9ID0ge307XG4gICAgKi9cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgICg8YW55PmFuZHJvaWQud2Via2l0LldlYlZpZXcpLnNldFdlYkNvbnRlbnRzRGVidWdnaW5nRW5hYmxlZCh0cnVlKTtcblxuICAgICAgICB0aGlzLm9uKFZpZXcubG9hZGVkRXZlbnQsICgpID0+IHtcbiAgICAgICAgICAgIC8vIE1ha2UgdHJhbnNwYXJlbnRcbiAgICAgICAgICAgIC8vdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBuZXcgQ29sb3IoMCwgMjU1LCAyNTUsIDI1NSk7XG4gICAgICAgICAgICAvL3RoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5UUkFOU1BBUkVOVCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gPGFuZHJvaWQud2Via2l0LldlYlNldHRpbmdzPiB0aGlzLmFuZHJvaWQuZ2V0U2V0dGluZ3MoKTtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJBZ2VudCA9IHNldHRpbmdzLmdldFVzZXJBZ2VudFN0cmluZygpO1xuICAgICAgICAgICAgc2V0dGluZ3Muc2V0VXNlckFnZW50U3RyaW5nKHVzZXJBZ2VudCArIFwiIEFyZ29uXCIpO1xuICAgICAgICAgICAgc2V0dGluZ3Muc2V0SmF2YVNjcmlwdEVuYWJsZWQodHJ1ZSk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXREb21TdG9yYWdlRW5hYmxlZCh0cnVlKTtcblxuICAgICAgICAgICAgLy8gUmVtZW1iZXIgYSBwYXJ0aWN1bGFyIGlkIGZvciBlYWNoIHdlYnZpZXdcbiAgICAgICAgICAgIGlmICghdGhpcy5pZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaWQgPSBEYXRlLm5vdygpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL0FyZ29uV2ViVmlldy5sYXllcnNCeUlkW3RoaXMuaWRdID0gdGhpcztcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgdW5pcXVlIGNsYXNzIG5hbWUgZm9yICdleHRlbmQnIHRvIGJpbmQgdGhlIG9iamVjdCB0byB0aGlzIHBhcnRpY3VsYXIgd2Vidmlld1xuICAgICAgICAgICAgdmFyIGNsYXNzbmFtZSA9IFwiaW9fYXJnb25qc19BbmRyb2lkV2ViSW50ZXJmYWNlX0FyZ29uV2ViVmlld19cIiArIHRoaXMuaWQ7XG5cbiAgICAgICAgICAgIC8vIEluamVjdCBKYXZhc2NyaXB0IEludGVyZmFjZVxuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLmFkZEphdmFzY3JpcHRJbnRlcmZhY2UobmV3ICgoPGFueT5BbmRyb2lkV2ViSW50ZXJmYWNlKS5leHRlbmQoY2xhc3NuYW1lLCB7XG4gICAgICAgICAgICAgICAgb25BcmdvbkV2ZW50OiAoaWQ6IHN0cmluZywgZXZlbnQ6IHN0cmluZywgZGF0YTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc3Qgc2VsZiA9IEFyZ29uV2ViVmlldy5sYXllcnNCeUlkW2lkXTtcbiAgICAgICAgICAgICAgICAgICAgLy9pZiAoc2VsZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50ID09PSBcImFyZ29uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBqdXN0IGluIGNhc2Ugd2UgdGhvdWdodCBiZWxvdyB0aGF0IHRoZSBwYWdlIHdhcyBub3QgYW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhcmdvbiBwYWdlLCBwZXJoYXBzIGJlY2F1c2UgYXJnb24uanMgbG9hZGVkIGFzeW5jcm9ub3VzbHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBwcm9ncmFtbWVyIGRpZG4ndCBzZXQgdXAgYW4gYXJnb24gbWV0YSB0YWdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRJc0FyZ29uQXBwKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUFyZ29uTWVzc2FnZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy99XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pKShuZXcgamF2YS5sYW5nLlN0cmluZyh0aGlzLmlkKSksIFwiX19hcmdvbl9hbmRyb2lkX19cIik7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHVuaXF1ZSBjbGFzcyBuYW1lIGZvciAnZXh0ZW5kJyB0byBiaW5kIHRoZSBvYmplY3QgdG8gdGhpcyBwYXJ0aWN1bGFyIHdlYnZpZXdcbiAgICAgICAgICAgIGNsYXNzbmFtZSA9IFwiYW5kcm9pZF93ZWJraXRfV2ViQ2hyb21lQ2xpZW50X0FyZ29uV2ViVmlld19cIiArIHRoaXMuaWQ7XG5cbiAgICAgICAgICAgIC8vIEV4dGVuZCBXZWJDaHJvbWVDbGllbnQgdG8gY2FwdHVyZSBsb2cgb3V0cHV0XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0V2ViQ2hyb21lQ2xpZW50KG5ldyAoKDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViQ2hyb21lQ2xpZW50KS5leHRlbmQoY2xhc3NuYW1lLCB7XG4gICAgICAgICAgICAgICAgb25Db25zb2xlTWVzc2FnZTogKGNvbnNvbGVNZXNzYWdlOiBhbmRyb2lkLndlYmtpdC5Db25zb2xlTWVzc2FnZSk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGV2ZWwgPSAnbG9nJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGVNZXNzYWdlLm1lc3NhZ2VMZXZlbCgpID09IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlLk1lc3NhZ2VMZXZlbC5XQVJOSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbCA9ICd3YXJuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlTWVzc2FnZS5tZXNzYWdlTGV2ZWwoKSA9PSBhbmRyb2lkLndlYmtpdC5Db25zb2xlTWVzc2FnZS5NZXNzYWdlTGV2ZWwuRVJST1IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IEpTT04uc3RyaW5naWZ5KHt0eXBlOmxldmVsLCBtZXNzYWdlOmNvbnNvbGVNZXNzYWdlLm1lc3NhZ2UoKX0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVMb2dNZXNzYWdlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5vbihBcmdvbldlYlZpZXcubG9hZFN0YXJ0ZWRFdmVudCwgKGFyZ3M6TG9hZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fZGlkQ29tbWl0TmF2aWdhdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsID0gYXJncy51cmw7XG4gICAgICAgICAgICB0aGlzLnNldCgndGl0bGUnLCB0aGlzLmFuZHJvaWQuZ2V0VGl0bGUoKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub24oQXJnb25XZWJWaWV3LmxvYWRGaW5pc2hlZEV2ZW50LCAoYXJnczpMb2FkRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldCgndGl0bGUnLCB0aGlzLmFuZHJvaWQuZ2V0VGl0bGUoKSk7XG4gICAgICAgICAgICB0aGlzLnNldCgncHJvZ3Jlc3MnLCB0aGlzLmFuZHJvaWQuZ2V0UHJvZ3Jlc3MoKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldCBwcm9ncmVzcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYW5kcm9pZC5nZXRQcm9ncmVzcygpO1xuICAgIH1cblxuICAgIF9zZXRJc0FyZ29uQXBwKGZsYWc6Ym9vbGVhbikge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiX3NldElzQXJnb25BcHA6IFwiICsgZmxhZyk7XG4gICAgICAgIGlmICghdGhpcy5pc0FyZ29uQXBwICYmIGZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5UUkFOU1BBUkVOVCk7XG4gICAgICAgICAgICB0aGlzLnNldChcImlzQXJnb25BcHBcIiwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0FyZ29uQXBwICYmICFmbGFnKSB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuc2V0QmFja2dyb3VuZENvbG9yKGFuZHJvaWQuZ3JhcGhpY3MuQ29sb3IuV0hJVEUpO1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJpc0FyZ29uQXBwXCIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV2YWx1YXRlSmF2YXNjcmlwdChzY3JpcHQ6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLmV2YWx1YXRlSmF2YXNjcmlwdChzY3JpcHQsIG5ldyBhbmRyb2lkLndlYmtpdC5WYWx1ZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICBvblJlY2VpdmVWYWx1ZTogKHZhbHVlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZXZhbHVhdGVKYXZhc2NyaXB0V2l0aG91dFByb21pc2Uoc2NyaXB0OnN0cmluZykge1xuICAgICAgICB0aGlzLmFuZHJvaWQuZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdCwgbnVsbCk7XG4gICAgfVxuXG4gICAgYnJpbmdUb0Zyb250KCkge1xuICAgICAgICB0aGlzLmFuZHJvaWQuYnJpbmdUb0Zyb250KCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldEN1cnJlbnRVcmwoKSA6IHN0cmluZyB7XG4gICAgICAgIC8vIG9uIEFuZHJvaWQsIHRoZSB1cmwgcHJvcGVydHkgaXNuJ3QgdXBkYXRlZCB1bnRpbCBhZnRlciB0aGUgcGFnZSBhcHBlYXJzXG4gICAgICAgIC8vIHdlIG5lZWQgaXQgdXBkYXRlZCBhcyBzb29uIGFzIHRoZSBsb2FkIHN0YXJ0c1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50VXJsO1xuICAgIH1cblxuICAgIGdldFdlYlZpZXdWZXJzaW9uKCkgOiBudW1iZXIge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IDxhbmRyb2lkLndlYmtpdC5XZWJTZXR0aW5ncz4gdGhpcy5hbmRyb2lkLmdldFNldHRpbmdzKCk7XG4gICAgICAgIGNvbnN0IHVzZXJBZ2VudCA9IHNldHRpbmdzLmdldFVzZXJBZ2VudFN0cmluZygpO1xuICAgICAgICBjb25zdCByZWdleCA9IC9DaHJvbWVcXC8oWzAtOV0rKS9pO1xuICAgICAgICB2YXIgbWF0Y2ggPSByZWdleC5leGVjKHVzZXJBZ2VudCk7XG4gICAgICAgIGlmIChtYXRjaCAhPSBudWxsICYmIG1hdGNoLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihtYXRjaFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn1cbiJdfQ==