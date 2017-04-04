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
        if (!this.session) {
            // note: this.src is what the webview was originally set to load, this.url is the actual current url. 
            var sessionUrl = this.url;
            console.log('Connecting to argon.js session at ' + sessionUrl);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var session = manager.session.addManagedSessionPort(sessionUrl);
            var port = messageChannel.port2;
            port.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "__ARGON_PORT__.postMessage(" + msg.data + ")";
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
    return ArgonWebView;
}(web_view_1.WebView));
ArgonWebView.sessionEvent = 'session';
ArgonWebView.logEvent = 'log';
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXctY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXctY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esd0NBQW1DO0FBQ25DLHNDQUF1QztBQUN2QywwREFBc0Q7QUFHdEQ7SUFBMkMsZ0NBQU87SUFnQjlDO1FBQUEsWUFDSSxpQkFBTyxTQUNWO1FBYk0sZ0JBQVUsR0FBRyxLQUFLLENBQUM7UUFLbEIsVUFBSSxHQUFHLElBQUksa0NBQWUsRUFBZSxDQUFDOztJQVFsRCxDQUFDO0lBUEQsc0JBQVcsNkJBQUc7YUFBZCxjQUFrQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFBLENBQUM7OztPQUFBO0lBQUEsQ0FBQztJQVM3QiwyQ0FBb0IsR0FBM0I7UUFDSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7UUFDekIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7SUFDakMsQ0FBQztJQUVNLDBDQUFtQixHQUExQixVQUEyQixPQUFjO1FBQXpDLGlCQWtDQztRQWhDRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFBQyxNQUFNLENBQUM7UUFFdEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQixzR0FBc0c7WUFDdEcsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUU1QixPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBQy9ELElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUyxDQUFDO1lBQzVDLElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsK0JBQStCLEVBQUUsQ0FBQztZQUN6RSxJQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWxFLElBQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUM7WUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFDLEdBQTBCO2dCQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxPQUFPLENBQUM7b0JBQUMsTUFBTSxDQUFDO2dCQUMxQixJQUFNLGVBQWUsR0FBRyw2QkFBNkIsR0FBQyxHQUFHLENBQUMsSUFBSSxHQUFDLEdBQUcsQ0FBQztnQkFDbkUsS0FBSSxDQUFDLGdDQUFnQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzNELENBQUMsQ0FBQTtZQUVELElBQU0sSUFBSSxHQUF3QjtnQkFDOUIsU0FBUyxFQUFFLFlBQVksQ0FBQyxZQUFZO2dCQUNwQyxNQUFNLEVBQUUsSUFBSTtnQkFDWixPQUFPLEVBQUUsT0FBTzthQUNuQixDQUFBO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVsQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztZQUV4QixPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyRSxDQUFDO1FBQ0Qsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFTSx3Q0FBaUIsR0FBeEIsVUFBeUIsT0FBYztRQUNuQyxJQUFNLEdBQUcsR0FBZSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDNUMsZ0ZBQWdGO1FBQ2hGLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFPTCxtQkFBQztBQUFELENBQUMsQUEzRUQsQ0FBMkMsa0JBQU87QUFFaEMseUJBQVksR0FBRyxTQUFTLENBQUM7QUFDekIscUJBQVEsR0FBRyxLQUFLLENBQUM7QUFIYixvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRlZiBmcm9tICdhcmdvbi13ZWItdmlldydcbmltcG9ydCB7V2ViVmlld30gZnJvbSAndWkvd2ViLXZpZXcnXG5pbXBvcnQgKiBhcyBBcmdvbiBmcm9tICdAYXJnb25qcy9hcmdvbidcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknO1xuXG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmdvbldlYlZpZXcgZXh0ZW5kcyBXZWJWaWV3IGltcGxlbWVudHMgZGVmLkFyZ29uV2ViVmlldyB7XG4gICAgXG4gICAgcHVibGljIHN0YXRpYyBzZXNzaW9uRXZlbnQgPSAnc2Vzc2lvbic7XG4gICAgcHVibGljIHN0YXRpYyBsb2dFdmVudCA9ICdsb2cnO1xuXG4gICAgcHVibGljIGlzQXJnb25BcHAgPSBmYWxzZTtcblxuICAgIHB1YmxpYyB0aXRsZSA6IHN0cmluZztcbiAgICBwdWJsaWMgcHJvZ3Jlc3MgOiBudW1iZXI7XG5cbiAgICBwcml2YXRlIF9sb2cgPSBuZXcgT2JzZXJ2YWJsZUFycmF5PGRlZi5Mb2dJdGVtPigpO1xuICAgIHB1YmxpYyBnZXQgbG9nKCkge3JldHVybiB0aGlzLl9sb2d9O1xuXG4gICAgcHVibGljIHNlc3Npb24/OkFyZ29uLlNlc3Npb25Qb3J0O1xuICAgIHByaXZhdGUgX291dHB1dFBvcnQ/OkFyZ29uLk1lc3NhZ2VQb3J0TGlrZTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIHB1YmxpYyBfZGlkQ29tbWl0TmF2aWdhdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuc2Vzc2lvbikgdGhpcy5zZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgIHRoaXMubG9nLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuc2Vzc2lvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fb3V0cHV0UG9ydCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgX2hhbmRsZUFyZ29uTWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuXG4gICAgICAgIGlmICh0aGlzLnNlc3Npb24gJiYgIXRoaXMuc2Vzc2lvbi5pc0Nvbm5lY3RlZCkgcmV0dXJuO1xuXG4gICAgICAgIGlmICghdGhpcy5zZXNzaW9uKSB7IFxuICAgICAgICAgICAgLy8gbm90ZTogdGhpcy5zcmMgaXMgd2hhdCB0aGUgd2VidmlldyB3YXMgb3JpZ2luYWxseSBzZXQgdG8gbG9hZCwgdGhpcy51cmwgaXMgdGhlIGFjdHVhbCBjdXJyZW50IHVybC4gXG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uVXJsID0gdGhpcy51cmw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb25uZWN0aW5nIHRvIGFyZ29uLmpzIHNlc3Npb24gYXQgJyArIHNlc3Npb25VcmwpO1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlciA9IEFyZ29uLkFyZ29uU3lzdGVtLmluc3RhbmNlITtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VDaGFubmVsID0gbWFuYWdlci5zZXNzaW9uLmNyZWF0ZVN5bmNocm9ub3VzTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBtYW5hZ2VyLnNlc3Npb24uYWRkTWFuYWdlZFNlc3Npb25Qb3J0KHNlc3Npb25VcmwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gbWVzc2FnZUNoYW5uZWwucG9ydDI7XG4gICAgICAgICAgICBwb3J0Lm9ubWVzc2FnZSA9IChtc2c6QXJnb24uTWVzc2FnZUV2ZW50TGlrZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5zZXNzaW9uKSByZXR1cm47XG4gICAgICAgICAgICAgICAgY29uc3QgaW5qZWN0ZWRNZXNzYWdlID0gXCJfX0FSR09OX1BPUlRfXy5wb3N0TWVzc2FnZShcIittc2cuZGF0YStcIilcIjtcbiAgICAgICAgICAgICAgICB0aGlzLmV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKGluamVjdGVkTWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgYXJnczpkZWYuU2Vzc2lvbkV2ZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWU6IEFyZ29uV2ViVmlldy5zZXNzaW9uRXZlbnQsXG4gICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgICAgIHNlc3Npb246IHNlc3Npb25cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubm90aWZ5KGFyZ3MpO1xuXG4gICAgICAgICAgICB0aGlzLnNlc3Npb24gPSBzZXNzaW9uO1xuICAgICAgICAgICAgdGhpcy5fb3V0cHV0UG9ydCA9IHBvcnQ7XG5cbiAgICAgICAgICAgIHNlc3Npb24ub3BlbihtZXNzYWdlQ2hhbm5lbC5wb3J0MSwgbWFuYWdlci5zZXNzaW9uLmNvbmZpZ3VyYXRpb24pXG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgICAgIHRoaXMuX291dHB1dFBvcnQgJiYgdGhpcy5fb3V0cHV0UG9ydC5wb3N0TWVzc2FnZShKU09OLnBhcnNlKG1lc3NhZ2UpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgX2hhbmRsZUxvZ01lc3NhZ2UobWVzc2FnZTpzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgbG9nOmRlZi5Mb2dJdGVtID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgbG9nLmxpbmVzID0gbG9nLm1lc3NhZ2Uuc3BsaXQoL1xcclxcbnxcXHJ8XFxuLyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMudXJsICsgJyAoJyArIGxvZy50eXBlICsgJyk6ICcgKyBsb2cubGluZXMuam9pbignXFxuXFx0ID4gJykpOyBcbiAgICAgICAgdGhpcy5sb2cucHVzaChsb2cpO1xuICAgIH1cblxuICAgIHB1YmxpYyBhYnN0cmFjdCBldmFsdWF0ZUphdmFzY3JpcHQoc2NyaXB0OnN0cmluZykgOiBQcm9taXNlPGFueT47XG4gICAgcHVibGljIGFic3RyYWN0IGV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKHNjcmlwdDpzdHJpbmcpIDogdm9pZDtcblxuICAgIHB1YmxpYyBhYnN0cmFjdCBicmluZ1RvRnJvbnQoKTtcblxufVxuIl19