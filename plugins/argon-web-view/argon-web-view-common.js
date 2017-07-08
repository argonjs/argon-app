"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web_view_1 = require("ui/web-view");
var Argon = require("@argonjs/argon");
var observable_array_1 = require("data/observable-array");
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this.isArgonApp = false;
        _this._log = new observable_array_1.ObservableArray();
        return _this;
    }
    Object.defineProperty(ArgonWebView.prototype, "url", {
        get: function () { return this._url; },
        set: function (url) { this._url = url; },
        enumerable: true,
        configurable: true
    });
    ;
    ;
    Object.defineProperty(ArgonWebView.prototype, "log", {
        get: function () { return this._log; },
        enumerable: true,
        configurable: true
    });
    ;
    ArgonWebView.prototype._didCommitNavigation = function () {
        if (this.session)
            this.session.close();
        this.log.length = 0;
        this.session = undefined;
        this._outputPort = undefined;
    };
    ArgonWebView.prototype._handleArgonMessage = function (message) {
        var _this = this;
        if (this.session && !this.session.isConnected)
            return;
        var sessionUrl = this.url;
        if (!this.session && sessionUrl) {
            console.log('Connecting to argon.js session at ' + sessionUrl);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var session = manager.session.addManagedSessionPort(sessionUrl);
            var port = messageChannel.port2;
            port.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "typeof __ARGON_PORT__ !== 'undefined' && __ARGON_PORT__.postMessage(" + msg.data + ")";
                _this.evaluateJavascriptWithoutPromise(injectedMessage);
            };
            var args = {
                eventName: ArgonWebView.sessionEvent,
                object: this,
                session: session
            };
            this.notify(args);
            this.session = session;
            this._outputPort = port;
            session.open(messageChannel.port1, manager.session.configuration);
        }
        // console.log(message);
        this._outputPort && this._outputPort.postMessage(JSON.parse(message));
    };
    ArgonWebView.prototype._handleLogMessage = function (message) {
        var log = JSON.parse(message);
        log.lines = log.message.split(/\r\n|\r|\n/);
        // console.log(this.url + ' (' + log.type + '): ' + log.lines.join('\n\t > ')); 
        this.log.push(log);
    };
    ArgonWebView.prototype.on = function (event, callback, thisArg) {
        return _super.prototype.on.call(this, event, callback, thisArg);
    };
    ArgonWebView.sessionEvent = 'session';
    ArgonWebView.logEvent = 'log';
    return ArgonWebView;
}(web_view_1.WebView));
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXctY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXctY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esd0NBQW1DO0FBQ25DLHNDQUF1QztBQUN2QywwREFBc0Q7QUFFdEQ7SUFBMkMsZ0NBQU87SUFvQjlDO1FBQUEsWUFDSSxpQkFBTyxTQUNWO1FBakJNLGdCQUFVLEdBQUcsS0FBSyxDQUFDO1FBU2xCLFVBQUksR0FBRyxJQUFJLGtDQUFlLEVBQWUsQ0FBQzs7SUFRbEQsQ0FBQztJQWRELHNCQUFJLDZCQUFHO2FBQVAsY0FBWSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFDLENBQUM7YUFDOUIsVUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUEsQ0FBQyxDQUFDOzs7T0FERjtJQUFBLENBQUM7SUFDQyxDQUFDO0lBTWpDLHNCQUFXLDZCQUFHO2FBQWQsY0FBa0IsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUEsQ0FBQSxDQUFDOzs7T0FBQTtJQUFBLENBQUM7SUFTN0IsMkNBQW9CLEdBQTNCO1FBQ0ksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDO0lBQ2pDLENBQUM7SUFFTSwwQ0FBbUIsR0FBMUIsVUFBMkIsT0FBYztRQUF6QyxpQkFpQ0M7UUEvQkcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBQUMsTUFBTSxDQUFDO1FBQ3RELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFFNUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFFOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsR0FBRyxVQUFVLENBQUMsQ0FBQztZQUMvRCxJQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVMsQ0FBQztZQUM1QyxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLENBQUM7WUFDekUsSUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVsRSxJQUFNLElBQUksR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBQyxHQUEwQjtnQkFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDO29CQUFDLE1BQU0sQ0FBQztnQkFDMUIsSUFBTSxlQUFlLEdBQUcsc0VBQXNFLEdBQUMsR0FBRyxDQUFDLElBQUksR0FBQyxHQUFHLENBQUM7Z0JBQzVHLEtBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUE7WUFFRCxJQUFNLElBQUksR0FBd0I7Z0JBQzlCLFNBQVMsRUFBRSxZQUFZLENBQUMsWUFBWTtnQkFDcEMsTUFBTSxFQUFFLElBQUk7Z0JBQ1osT0FBTyxFQUFFLE9BQU87YUFDbkIsQ0FBQTtZQUNELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFbEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFFeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckUsQ0FBQztRQUNELHdCQUF3QjtRQUN4QixJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRU0sd0NBQWlCLEdBQXhCLFVBQXlCLE9BQWM7UUFDbkMsSUFBTSxHQUFHLEdBQWUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzVDLGdGQUFnRjtRQUNoRixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBT00seUJBQUUsR0FBVCxVQUFVLEtBQWEsRUFBRSxRQUE2QixFQUFFLE9BQWE7UUFDakUsTUFBTSxDQUFDLGlCQUFNLEVBQUUsWUFBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUE5RWEseUJBQVksR0FBRyxTQUFTLENBQUM7SUFDekIscUJBQVEsR0FBRyxLQUFLLENBQUM7SUErRW5DLG1CQUFDO0NBQUEsQUFsRkQsQ0FBMkMsa0JBQU8sR0FrRmpEO0FBbEZxQixvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRlZiBmcm9tICcuJ1xuaW1wb3J0IHtXZWJWaWV3fSBmcm9tICd1aS93ZWItdmlldydcbmltcG9ydCAqIGFzIEFyZ29uIGZyb20gJ0BhcmdvbmpzL2FyZ29uJ1xuaW1wb3J0IHtPYnNlcnZhYmxlQXJyYXl9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZS1hcnJheSc7ICAgIFxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgV2ViVmlldyBpbXBsZW1lbnRzIGRlZi5BcmdvbldlYlZpZXcge1xuICAgIFxuICAgIHB1YmxpYyBzdGF0aWMgc2Vzc2lvbkV2ZW50ID0gJ3Nlc3Npb24nO1xuICAgIHB1YmxpYyBzdGF0aWMgbG9nRXZlbnQgPSAnbG9nJztcblxuICAgIHB1YmxpYyBpc0FyZ29uQXBwID0gZmFsc2U7XG5cbiAgICBwcml2YXRlIF91cmw6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgZ2V0IHVybCgpIHsgcmV0dXJuIHRoaXMuX3VybCB9O1xuICAgIHNldCB1cmwodXJsKSB7IHRoaXMuX3VybCA9IHVybCB9O1xuXG4gICAgcHVibGljIHRpdGxlIDogc3RyaW5nO1xuICAgIHB1YmxpYyBwcm9ncmVzcyA6IG51bWJlcjsgLy8gcmFuZ2UgaXMgMCB0byAxLjBcblxuICAgIHByaXZhdGUgX2xvZyA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8ZGVmLkxvZ0l0ZW0+KCk7XG4gICAgcHVibGljIGdldCBsb2coKSB7cmV0dXJuIHRoaXMuX2xvZ307XG5cbiAgICBwdWJsaWMgc2Vzc2lvbj86QXJnb24uU2Vzc2lvblBvcnQ7XG4gICAgcHJpdmF0ZSBfb3V0cHV0UG9ydD86QXJnb24uTWVzc2FnZVBvcnRMaWtlO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgcHVibGljIF9kaWRDb21taXROYXZpZ2F0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5zZXNzaW9uKSB0aGlzLnNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgdGhpcy5sb2cubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5zZXNzaW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9vdXRwdXRQb3J0ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHB1YmxpYyBfaGFuZGxlQXJnb25NZXNzYWdlKG1lc3NhZ2U6c3RyaW5nKSB7XG5cbiAgICAgICAgaWYgKHRoaXMuc2Vzc2lvbiAmJiAhdGhpcy5zZXNzaW9uLmlzQ29ubmVjdGVkKSByZXR1cm47XG4gICAgICAgIGNvbnN0IHNlc3Npb25VcmwgPSB0aGlzLnVybDtcblxuICAgICAgICBpZiAoIXRoaXMuc2Vzc2lvbiAmJiBzZXNzaW9uVXJsKSB7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQ29ubmVjdGluZyB0byBhcmdvbi5qcyBzZXNzaW9uIGF0ICcgKyBzZXNzaW9uVXJsKTtcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZXIgPSBBcmdvbi5BcmdvblN5c3RlbS5pbnN0YW5jZSE7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlQ2hhbm5lbCA9IG1hbmFnZXIuc2Vzc2lvbi5jcmVhdGVTeW5jaHJvbm91c01lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gbWFuYWdlci5zZXNzaW9uLmFkZE1hbmFnZWRTZXNzaW9uUG9ydChzZXNzaW9uVXJsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcG9ydCA9IG1lc3NhZ2VDaGFubmVsLnBvcnQyO1xuICAgICAgICAgICAgcG9ydC5vbm1lc3NhZ2UgPSAobXNnOkFyZ29uLk1lc3NhZ2VFdmVudExpa2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2Vzc2lvbikgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IGluamVjdGVkTWVzc2FnZSA9IFwidHlwZW9mIF9fQVJHT05fUE9SVF9fICE9PSAndW5kZWZpbmVkJyAmJiBfX0FSR09OX1BPUlRfXy5wb3N0TWVzc2FnZShcIittc2cuZGF0YStcIilcIjtcbiAgICAgICAgICAgICAgICB0aGlzLmV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKGluamVjdGVkTWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgYXJnczpkZWYuU2Vzc2lvbkV2ZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWU6IEFyZ29uV2ViVmlldy5zZXNzaW9uRXZlbnQsXG4gICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlc3Npb246IHNlc3Npb25cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubm90aWZ5KGFyZ3MpO1xuXG4gICAgICAgICAgICB0aGlzLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgdGhpcy5fb3V0cHV0UG9ydCA9IHBvcnQ7XG5cbiAgICAgICAgICAgIHNlc3Npb24ub3BlbihtZXNzYWdlQ2hhbm5lbC5wb3J0MSwgbWFuYWdlci5zZXNzaW9uLmNvbmZpZ3VyYXRpb24pXG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgICAgIHRoaXMuX291dHB1dFBvcnQgJiYgdGhpcy5fb3V0cHV0UG9ydC5wb3N0TWVzc2FnZShKU09OLnBhcnNlKG1lc3NhZ2UpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgX2hhbmRsZUxvZ01lc3NhZ2UobWVzc2FnZTpzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgbG9nOmRlZi5Mb2dJdGVtID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgbG9nLmxpbmVzID0gbG9nLm1lc3NhZ2Uuc3BsaXQoL1xcclxcbnxcXHJ8XFxuLyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMudXJsICsgJyAoJyArIGxvZy50eXBlICsgJyk6ICcgKyBsb2cubGluZXMuam9pbignXFxuXFx0ID4gJykpOyBcbiAgICAgICAgdGhpcy5sb2cucHVzaChsb2cpO1xuICAgIH1cblxuICAgIHB1YmxpYyBhYnN0cmFjdCBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OnN0cmluZykgOiBQcm9taXNlPGFueT47XG4gICAgcHVibGljIGFic3RyYWN0IGV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKHNjcmlwdDpzdHJpbmcpIDogdm9pZDtcblxuICAgIHB1YmxpYyBhYnN0cmFjdCBicmluZ1RvRnJvbnQoKTtcbiAgICBcbiAgICBwdWJsaWMgb24oZXZlbnQ6IHN0cmluZywgY2FsbGJhY2s6IChkYXRhOiBhbnkpID0+IHZvaWQsIHRoaXNBcmc/OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHN1cGVyLm9uKGV2ZW50LCBjYWxsYmFjaywgdGhpc0FyZyk7XG4gICAgfVxuXG59Il19