"use strict";
var web_view_1 = require("ui/web-view");
var Argon = require("@argonjs/argon");
var observable_array_1 = require("data/observable-array");
var ArgonWebView = (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this.isArgonApp = false;
        _this._logs = new observable_array_1.ObservableArray();
        return _this;
    }
    Object.defineProperty(ArgonWebView.prototype, "logs", {
        get: function () { return this._logs; },
        enumerable: true,
        configurable: true
    });
    ;
    ArgonWebView.prototype._didCommitNavigation = function () {
        if (this.session)
            this.session.close();
        this.logs.length = 0;
        this.session = undefined;
        this._outputPort = undefined;
    };
    ArgonWebView.prototype._handleArgonMessage = function (message) {
        var _this = this;
        if (this.session && !this.session.isConnected)
            return;
        if (!this.session) {
            var sessionUrl = this.getCurrentUrl();
            console.log('Connecting to argon.js session at ' + sessionUrl);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var session = manager.session.addManagedSessionPort(sessionUrl);
            var port = messageChannel.port2;
            port.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "__ARGON_PORT__.postMessage(" + JSON.stringify(msg.data) + ")";
                _this.evaluateJavascript(injectedMessage);
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
        console.log("*** _handleLogMessage: " + message);
        if (!message)
            return;
        var log = JSON.parse(message);
        if (!log.message)
            return;
        log.lines = log.message.split(/\r\n|\r|\n/);
        console.log(this.getCurrentUrl() + ' (' + log.type + '): ' + log.lines.join('\n\t > '));
        this.logs.push(log);
        var args = {
            eventName: ArgonWebView.logEvent,
            object: this,
            log: log
        };
        this.notify(args);
    };
    return ArgonWebView;
}(web_view_1.WebView));
ArgonWebView.sessionEvent = 'session';
ArgonWebView.logEvent = 'log';
exports.ArgonWebView = ArgonWebView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXctY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXctY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSx3Q0FBbUM7QUFDbkMsc0NBQXVDO0FBQ3ZDLDBEQUFzRDtBQUd0RDtJQUEyQyxnQ0FBTztJQWdCOUM7UUFBQSxZQUNJLGlCQUFPLFNBQ1Y7UUFiTSxnQkFBVSxHQUFHLEtBQUssQ0FBQztRQUtsQixXQUFLLEdBQUcsSUFBSSxrQ0FBZSxFQUFXLENBQUM7O0lBUS9DLENBQUM7SUFQRCxzQkFBVyw4QkFBSTthQUFmLGNBQW1CLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFBLENBQUEsQ0FBQzs7O09BQUE7SUFBQSxDQUFDO0lBUy9CLDJDQUFvQixHQUEzQjtRQUNJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN6QixJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztJQUNqQyxDQUFDO0lBRU0sMENBQW1CLEdBQTFCLFVBQTJCLE9BQWM7UUFBekMsaUJBaUNDO1FBL0JHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUFDLE1BQU0sQ0FBQztRQUV0RCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUV4QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBQy9ELElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUyxDQUFDO1lBQzVDLElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsK0JBQStCLEVBQUUsQ0FBQztZQUN6RSxJQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWxFLElBQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUM7WUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFDLEdBQTBCO2dCQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxPQUFPLENBQUM7b0JBQUMsTUFBTSxDQUFDO2dCQUMxQixJQUFNLGVBQWUsR0FBRyw2QkFBNkIsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUM7Z0JBQ25GLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUM3QyxDQUFDLENBQUE7WUFFRCxJQUFNLElBQUksR0FBd0I7Z0JBQzlCLFNBQVMsRUFBRSxZQUFZLENBQUMsWUFBWTtnQkFDcEMsTUFBTSxFQUFFLElBQUk7Z0JBQ1osT0FBTyxFQUFFLE9BQU87YUFDbkIsQ0FBQTtZQUNELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFbEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFFeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckUsQ0FBQztRQUNELHdCQUF3QjtRQUN4QixJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRU0sd0NBQWlCLEdBQXhCLFVBQXlCLE9BQWM7UUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUVqRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNULE1BQU0sQ0FBQztRQUNYLElBQU0sR0FBRyxHQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO1lBQ2IsTUFBTSxDQUFDO1FBQ1gsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixJQUFNLElBQUksR0FBb0I7WUFDMUIsU0FBUyxFQUFFLFlBQVksQ0FBQyxRQUFRO1lBQ2hDLE1BQU0sRUFBQyxJQUFJO1lBQ1gsR0FBRyxFQUFFLEdBQUc7U0FDWCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBUUwsbUJBQUM7QUFBRCxDQUFDLEFBdkZELENBQTJDLGtCQUFPO0FBRWhDLHlCQUFZLEdBQUcsU0FBUyxDQUFDO0FBQ3pCLHFCQUFRLEdBQUcsS0FBSyxDQUFDO0FBSGIsb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkZWYgZnJvbSAnYXJnb24td2ViLXZpZXcnXG5pbXBvcnQge1dlYlZpZXd9IGZyb20gJ3VpL3dlYi12aWV3J1xuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5pbXBvcnQge09ic2VydmFibGVBcnJheX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlLWFycmF5JztcblxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgV2ViVmlldyBpbXBsZW1lbnRzIGRlZi5BcmdvbldlYlZpZXcge1xuICAgIFxuICAgIHB1YmxpYyBzdGF0aWMgc2Vzc2lvbkV2ZW50ID0gJ3Nlc3Npb24nO1xuICAgIHB1YmxpYyBzdGF0aWMgbG9nRXZlbnQgPSAnbG9nJztcblxuICAgIHB1YmxpYyBpc0FyZ29uQXBwID0gZmFsc2U7XG5cbiAgICBwdWJsaWMgdGl0bGUgOiBzdHJpbmc7XG4gICAgcHVibGljIHByb2dyZXNzIDogbnVtYmVyO1xuXG4gICAgcHJpdmF0ZSBfbG9ncyA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8ZGVmLkxvZz4oKTtcbiAgICBwdWJsaWMgZ2V0IGxvZ3MoKSB7cmV0dXJuIHRoaXMuX2xvZ3N9O1xuXG4gICAgcHVibGljIHNlc3Npb24/OkFyZ29uLlNlc3Npb25Qb3J0O1xuICAgIHByaXZhdGUgX291dHB1dFBvcnQ/OkFyZ29uLk1lc3NhZ2VQb3J0TGlrZTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIHB1YmxpYyBfZGlkQ29tbWl0TmF2aWdhdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuc2Vzc2lvbikgdGhpcy5zZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgIHRoaXMubG9ncy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLnNlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX291dHB1dFBvcnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHVibGljIF9oYW5kbGVBcmdvbk1lc3NhZ2UobWVzc2FnZTpzdHJpbmcpIHtcblxuICAgICAgICBpZiAodGhpcy5zZXNzaW9uICYmICF0aGlzLnNlc3Npb24uaXNDb25uZWN0ZWQpIHJldHVybjtcblxuICAgICAgICBpZiAoIXRoaXMuc2Vzc2lvbikgeyBcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25VcmwgPSB0aGlzLmdldEN1cnJlbnRVcmwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3RpbmcgdG8gYXJnb24uanMgc2Vzc2lvbiBhdCAnICsgc2Vzc2lvblVybCk7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gQXJnb24uQXJnb25TeXN0ZW0uaW5zdGFuY2UhO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZUNoYW5uZWwgPSBtYW5hZ2VyLnNlc3Npb24uY3JlYXRlU3luY2hyb25vdXNNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IG1hbmFnZXIuc2Vzc2lvbi5hZGRNYW5hZ2VkU2Vzc2lvblBvcnQoc2Vzc2lvblVybCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBtZXNzYWdlQ2hhbm5lbC5wb3J0MjtcbiAgICAgICAgICAgIHBvcnQub25tZXNzYWdlID0gKG1zZzpBcmdvbi5NZXNzYWdlRXZlbnRMaWtlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNlc3Npb24pIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmplY3RlZE1lc3NhZ2UgPSBcIl9fQVJHT05fUE9SVF9fLnBvc3RNZXNzYWdlKFwiK0pTT04uc3RyaW5naWZ5KG1zZy5kYXRhKStcIilcIjtcbiAgICAgICAgICAgICAgICB0aGlzLmV2YWx1YXRlSmF2YXNjcmlwdChpbmplY3RlZE1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGFyZ3M6ZGVmLlNlc3Npb25FdmVudERhdGEgPSB7XG4gICAgICAgICAgICAgICAgZXZlbnROYW1lOiBBcmdvbldlYlZpZXcuc2Vzc2lvbkV2ZW50LFxuICAgICAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgICAgICBzZXNzaW9uOiBzZXNzaW9uXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm5vdGlmeShhcmdzKTtcblxuICAgICAgICAgICAgdGhpcy5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgICAgIHRoaXMuX291dHB1dFBvcnQgPSBwb3J0O1xuXG4gICAgICAgICAgICBzZXNzaW9uLm9wZW4obWVzc2FnZUNoYW5uZWwucG9ydDEsIG1hbmFnZXIuc2Vzc2lvbi5jb25maWd1cmF0aW9uKVxuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLl9vdXRwdXRQb3J0ICYmIHRoaXMuX291dHB1dFBvcnQucG9zdE1lc3NhZ2UoSlNPTi5wYXJzZShtZXNzYWdlKSk7XG4gICAgfVxuXG4gICAgcHVibGljIF9oYW5kbGVMb2dNZXNzYWdlKG1lc3NhZ2U6c3RyaW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiKioqIF9oYW5kbGVMb2dNZXNzYWdlOiBcIiArIG1lc3NhZ2UpO1xuXG4gICAgICAgIGlmICghbWVzc2FnZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgbG9nOmRlZi5Mb2cgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICBpZiAoIWxvZy5tZXNzYWdlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBsb2cubGluZXMgPSBsb2cubWVzc2FnZS5zcGxpdCgvXFxyXFxufFxccnxcXG4vKTtcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5nZXRDdXJyZW50VXJsKCkgKyAnICgnICsgbG9nLnR5cGUgKyAnKTogJyArIGxvZy5saW5lcy5qb2luKCdcXG5cXHQgPiAnKSk7IFxuICAgICAgICB0aGlzLmxvZ3MucHVzaChsb2cpO1xuICAgICAgICBjb25zdCBhcmdzOmRlZi5Mb2dFdmVudERhdGEgPSB7XG4gICAgICAgICAgICBldmVudE5hbWU6IEFyZ29uV2ViVmlldy5sb2dFdmVudCxcbiAgICAgICAgICAgIG9iamVjdDp0aGlzLFxuICAgICAgICAgICAgbG9nOiBsb2dcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5vdGlmeShhcmdzKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDpzdHJpbmcpIDogUHJvbWlzZTxhbnk+O1xuXG4gICAgcHVibGljIGFic3RyYWN0IGJyaW5nVG9Gcm9udCgpO1xuXG4gICAgcHVibGljIGFic3RyYWN0IGdldEN1cnJlbnRVcmwoKSA6IHN0cmluZztcblxufVxuIl19