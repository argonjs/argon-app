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
        this.android.evaluateJavascript(script);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ29uLXdlYi12aWV3LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBa0Q7QUFFbEQscUNBQWtDO0FBQ2xDLDhCQUE4QjtBQUU5QixJQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7QUFFM0Q7SUFBa0MsZ0NBQW1CO0lBSWpEOzs7O01BSUU7SUFFRjtRQUFBLFlBQ0ksaUJBQU8sU0FxRVY7UUE5RU8sZ0JBQVUsR0FBVyxFQUFFLENBQUM7UUFXdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFRLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbkUsS0FBSSxDQUFDLEVBQUUsQ0FBQyxXQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3RCLG1CQUFtQjtZQUNuQixxREFBcUQ7WUFDckQsc0VBQXNFO1lBRXRFLElBQU0sUUFBUSxHQUFnQyxLQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pFLElBQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLENBQUM7WUFDbEQsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVwQyw0Q0FBNEM7WUFDNUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDWCxLQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxDQUFDO1lBQ0QsMENBQTBDO1lBRTFDLHdGQUF3RjtZQUN4RixJQUFJLFNBQVMsR0FBRyw4Q0FBOEMs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QUFDO0lBQzVDLENBQUM7SUFFRCxtQ0FBWSxHQUFaO1FBQ0ksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRU0sb0NBQWEsR0FBcEI7UUFDSSwwRUFBMEU7UUFDMUUsZ0RBQWdEO1FBQ2hELE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFFRCx3Q0FBaUIsR0FBakI7UUFDSSxJQUFNLFFBQVEsR0FBZ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6RSxJQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNoRCxJQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQztRQUNsQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNkLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUFuSUQsQ0FBa0MsTUFBTSxDQUFDLFlBQVksR0FtSXBEO0FBbklZLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29tbW9uIGZyb20gXCIuL2FyZ29uLXdlYi12aWV3LWNvbW1vblwiO1xuaW1wb3J0IHtMb2FkRXZlbnREYXRhfSBmcm9tIFwidWkvd2ViLXZpZXdcIjtcbmltcG9ydCB7Vmlld30gZnJvbSBcInVpL2NvcmUvdmlld1wiO1xuLy9pbXBvcnQge0NvbG9yfSBmcm9tIFwiY29sb3JcIjtcblxuY29uc3QgQW5kcm9pZFdlYkludGVyZmFjZSA9IGlvLmFyZ29uanMuQW5kcm9pZFdlYkludGVyZmFjZTtcblxuZXhwb3J0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIGNvbW1vbi5BcmdvbldlYlZpZXcge1xuXG4gICAgcHJpdmF0ZSBjdXJyZW50VXJsOiBzdHJpbmcgPSBcIlwiO1xuXG4gICAgLypcbiAgICBwcml2YXRlIHN0YXRpYyBsYXllcnNCeUlkOiB7XG4gICAgICAgIFtpZDogc3RyaW5nXTogQXJnb25XZWJWaWV3LFxuICAgIH0gPSB7fTtcbiAgICAqL1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgKDxhbnk+YW5kcm9pZC53ZWJraXQuV2ViVmlldykuc2V0V2ViQ29udGVudHNEZWJ1Z2dpbmdFbmFibGVkKHRydWUpO1xuXG4gICAgICAgIHRoaXMub24oVmlldy5sb2FkZWRFdmVudCwgKCkgPT4ge1xuICAgICAgICAgICAgLy8gTWFrZSB0cmFuc3BhcmVudFxuICAgICAgICAgICAgLy90aGlzLmJhY2tncm91bmRDb2xvciA9IG5ldyBDb2xvcigwLCAyNTUsIDI1NSwgMjU1KTtcbiAgICAgICAgICAgIC8vdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcblxuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSA8YW5kcm9pZC53ZWJraXQuV2ViU2V0dGluZ3M+IHRoaXMuYW5kcm9pZC5nZXRTZXR0aW5ncygpO1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gc2V0dGluZ3MuZ2V0VXNlckFnZW50U3RyaW5nKCk7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRVc2VyQWdlbnRTdHJpbmcodXNlckFnZW50ICsgXCIgQXJnb25cIik7XG4gICAgICAgICAgICBzZXR0aW5ncy5zZXRKYXZhU2NyaXB0RW5hYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnNldERvbVN0b3JhZ2VFbmFibGVkKHRydWUpO1xuXG4gICAgICAgICAgICAvLyBSZW1lbWJlciBhIHBhcnRpY3VsYXIgaWQgZm9yIGVhY2ggd2Vidmlld1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZCA9IERhdGUubm93KCkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vQXJnb25XZWJWaWV3LmxheWVyc0J5SWRbdGhpcy5pZF0gPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSB1bmlxdWUgY2xhc3MgbmFtZSBmb3IgJ2V4dGVuZCcgdG8gYmluZCB0aGUgb2JqZWN0IHRvIHRoaXMgcGFydGljdWxhciB3ZWJ2aWV3XG4gICAgICAgICAgICB2YXIgY2xhc3NuYW1lID0gXCJpb19hcmdvbmpzX0FuZHJvaWRXZWJJbnRlcmZhY2VfQXJnb25XZWJWaWV3X1wiICsgdGhpcy5pZDtcblxuICAgICAgICAgICAgLy8gSW5qZWN0IEphdmFzY3JpcHQgSW50ZXJmYWNlXG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuYWRkSmF2YXNjcmlwdEludGVyZmFjZShuZXcgKCg8YW55PkFuZHJvaWRXZWJJbnRlcmZhY2UpLmV4dGVuZChjbGFzc25hbWUsIHtcbiAgICAgICAgICAgICAgICBvbkFyZ29uRXZlbnQ6IChpZDogc3RyaW5nLCBldmVudDogc3RyaW5nLCBkYXRhOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zdCBzZWxmID0gQXJnb25XZWJWaWV3LmxheWVyc0J5SWRbaWRdO1xuICAgICAgICAgICAgICAgICAgICAvL2lmIChzZWxmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQgPT09IFwiYXJnb25cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGp1c3QgaW4gY2FzZSB3ZSB0aG91Z2h0IGJlbG93IHRoYXQgdGhlIHBhZ2Ugd2FzIG5vdCBhblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFyZ29uIHBhZ2UsIHBlcmhhcHMgYmVjYXVzZSBhcmdvbi5qcyBsb2FkZWQgYXN5bmNyb25vdXNseSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbmQgdGhlIHByb2dyYW1tZXIgZGlkbid0IHNldCB1cCBhbiBhcmdvbiBtZXRhIHRhZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldElzQXJnb25BcHAodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQXJnb25NZXNzYWdlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpKG5ldyBqYXZhLmxhbmcuU3RyaW5nKHRoaXMuaWQpKSwgXCJfX2FyZ29uX2FuZHJvaWRfX1wiKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgdW5pcXVlIGNsYXNzIG5hbWUgZm9yICdleHRlbmQnIHRvIGJpbmQgdGhlIG9iamVjdCB0byB0aGlzIHBhcnRpY3VsYXIgd2Vidmlld1xuICAgICAgICAgICAgY2xhc3NuYW1lID0gXCJhbmRyb2lkX3dlYmtpdF9XZWJDaHJvbWVDbGllbnRfQXJnb25XZWJWaWV3X1wiICsgdGhpcy5pZDtcblxuICAgICAgICAgICAgLy8gRXh0ZW5kIFdlYkNocm9tZUNsaWVudCB0byBjYXB0dXJlIGxvZyBvdXRwdXRcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRXZWJDaHJvbWVDbGllbnQobmV3ICgoPGFueT5hbmRyb2lkLndlYmtpdC5XZWJDaHJvbWVDbGllbnQpLmV4dGVuZChjbGFzc25hbWUsIHtcbiAgICAgICAgICAgICAgICBvbkNvbnNvbGVNZXNzYWdlOiAoY29uc29sZU1lc3NhZ2U6IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsZXZlbCA9ICdsb2cnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZU1lc3NhZ2UubWVzc2FnZUxldmVsKCkgPT0gYW5kcm9pZC53ZWJraXQuQ29uc29sZU1lc3NhZ2UuTWVzc2FnZUxldmVsLldBUk5JTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsID0gJ3dhcm4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGVNZXNzYWdlLm1lc3NhZ2VMZXZlbCgpID09IGFuZHJvaWQud2Via2l0LkNvbnNvbGVNZXNzYWdlLk1lc3NhZ2VMZXZlbC5FUlJPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWwgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoe3R5cGU6bGV2ZWwsIG1lc3NhZ2U6Y29uc29sZU1lc3NhZ2UubWVzc2FnZSgpfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZUxvZ01lc3NhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLm9uKEFyZ29uV2ViVmlldy5sb2FkU3RhcnRlZEV2ZW50LCAoYXJnczpMb2FkRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9kaWRDb21taXROYXZpZ2F0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRVcmwgPSBhcmdzLnVybDtcbiAgICAgICAgICAgIHRoaXMuc2V0KCd0aXRsZScsIHRoaXMuYW5kcm9pZC5nZXRUaXRsZSgpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5vbihBcmdvbldlYlZpZXcubG9hZEZpbmlzaGVkRXZlbnQsIChhcmdzOkxvYWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCd0aXRsZScsIHRoaXMuYW5kcm9pZC5nZXRUaXRsZSgpKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdwcm9ncmVzcycsIHRoaXMuYW5kcm9pZC5nZXRQcm9ncmVzcygpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0IHByb2dyZXNzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmRyb2lkLmdldFByb2dyZXNzKCk7XG4gICAgfVxuXG4gICAgX3NldElzQXJnb25BcHAoZmxhZzpib29sZWFuKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJfc2V0SXNBcmdvbkFwcDogXCIgKyBmbGFnKTtcbiAgICAgICAgaWYgKCF0aGlzLmlzQXJnb25BcHAgJiYgZmxhZykge1xuICAgICAgICAgICAgdGhpcy5hbmRyb2lkLnNldEJhY2tncm91bmRDb2xvcihhbmRyb2lkLmdyYXBoaWNzLkNvbG9yLlRSQU5TUEFSRU5UKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiaXNBcmdvbkFwcFwiLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzQXJnb25BcHAgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuYW5kcm9pZC5zZXRCYWNrZ3JvdW5kQ29sb3IoYW5kcm9pZC5ncmFwaGljcy5Db2xvci5XSElURSk7XG4gICAgICAgICAgICB0aGlzLnNldChcImlzQXJnb25BcHBcIiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmFuZHJvaWQuZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdCwgbmV3IGFuZHJvaWQud2Via2l0LlZhbHVlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIG9uUmVjZWl2ZVZhbHVlOiAodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5ldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0KTtcbiAgICB9XG5cbiAgICBicmluZ1RvRnJvbnQoKSB7XG4gICAgICAgIHRoaXMuYW5kcm9pZC5icmluZ1RvRnJvbnQoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q3VycmVudFVybCgpIDogc3RyaW5nIHtcbiAgICAgICAgLy8gb24gQW5kcm9pZCwgdGhlIHVybCBwcm9wZXJ0eSBpc24ndCB1cGRhdGVkIHVudGlsIGFmdGVyIHRoZSBwYWdlIGFwcGVhcnNcbiAgICAgICAgLy8gd2UgbmVlZCBpdCB1cGRhdGVkIGFzIHNvb24gYXMgdGhlIGxvYWQgc3RhcnRzXG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRVcmw7XG4gICAgfVxuXG4gICAgZ2V0V2ViVmlld1ZlcnNpb24oKSA6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gPGFuZHJvaWQud2Via2l0LldlYlNldHRpbmdzPiB0aGlzLmFuZHJvaWQuZ2V0U2V0dGluZ3MoKTtcbiAgICAgICAgY29uc3QgdXNlckFnZW50ID0gc2V0dGluZ3MuZ2V0VXNlckFnZW50U3RyaW5nKCk7XG4gICAgICAgIGNvbnN0IHJlZ2V4ID0gL0Nocm9tZVxcLyhbMC05XSspL2k7XG4gICAgICAgIHZhciBtYXRjaCA9IHJlZ2V4LmV4ZWModXNlckFnZW50KTtcbiAgICAgICAgaWYgKG1hdGNoICE9IG51bGwgJiYgbWF0Y2gubGVuZ3RoID4gMSl7XG4gICAgICAgICAgICByZXR1cm4gTnVtYmVyKG1hdGNoWzFdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxufVxuIl19