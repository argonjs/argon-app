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
            var sessionUrl = this.getCurrentUrl();
            console.log('Connecting to argon.js session at ' + sessionUrl);
            var manager = Argon.ArgonSystem.instance;
            var messageChannel = manager.session.createSynchronousMessageChannel();
            var session = manager.session.addManagedSessionPort(sessionUrl);
            var port = messageChannel.port2;
            port.onmessage = function (msg) {
                if (!_this.session)
                    return;
                var injectedMessage = "typeof __ARGON_PORT__ !== undefined && __ARGON_PORT__.postMessage(" + msg.data + ")";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXctY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXctY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esd0NBQW1DO0FBQ25DLHNDQUF1QztBQUN2QywwREFBc0Q7QUFHdEQ7SUFBMkMsZ0NBQU87SUFnQjlDO1FBQUEsWUFDSSxpQkFBTyxTQUNWO1FBYk0sZ0JBQVUsR0FBRyxLQUFLLENBQUM7UUFLbEIsVUFBSSxHQUFHLElBQUksa0NBQWUsRUFBZSxDQUFDOztJQVFsRCxDQUFDO0lBUEQsc0JBQVcsNkJBQUc7YUFBZCxjQUFrQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFBLENBQUM7OztPQUFBO0lBQUEsQ0FBQztJQVM3QiwyQ0FBb0IsR0FBM0I7UUFDSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7UUFDekIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7SUFDakMsQ0FBQztJQUVNLDBDQUFtQixHQUExQixVQUEyQixPQUFjO1FBQXpDLGlCQWlDQztRQS9CRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFBQyxNQUFNLENBQUM7UUFFdEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFFeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsR0FBRyxVQUFVLENBQUMsQ0FBQztZQUMvRCxJQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVMsQ0FBQztZQUM1QyxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLENBQUM7WUFDekUsSUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVsRSxJQUFNLElBQUksR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBQyxHQUEwQjtnQkFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDO29CQUFDLE1BQU0sQ0FBQztnQkFDMUIsSUFBTSxlQUFlLEdBQUcsb0VBQW9FLEdBQUMsR0FBRyxDQUFDLElBQUksR0FBQyxHQUFHLENBQUM7Z0JBQzFHLEtBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUE7WUFFRCxJQUFNLElBQUksR0FBd0I7Z0JBQzlCLFNBQVMsRUFBRSxZQUFZLENBQUMsWUFBWTtnQkFDcEMsTUFBTSxFQUFFLElBQUk7Z0JBQ1osT0FBTyxFQUFFLE9BQU87YUFDbkIsQ0FBQTtZQUNELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFbEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFFeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckUsQ0FBQztRQUNELHdCQUF3QjtRQUN4QixJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRU0sd0NBQWlCLEdBQXhCLFVBQXlCLE9BQWM7UUFDbkMsSUFBTSxHQUFHLEdBQWUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzVDLGdGQUFnRjtRQUNoRixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBU0wsbUJBQUM7QUFBRCxDQUFDLEFBNUVELENBQTJDLGtCQUFPO0FBRWhDLHlCQUFZLEdBQUcsU0FBUyxDQUFDO0FBQ3pCLHFCQUFRLEdBQUcsS0FBSyxDQUFDO0FBSGIsb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkZWYgZnJvbSAnYXJnb24td2ViLXZpZXcnXG5pbXBvcnQge1dlYlZpZXd9IGZyb20gJ3VpL3dlYi12aWV3J1xuaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nXG5pbXBvcnQge09ic2VydmFibGVBcnJheX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlLWFycmF5JztcblxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgV2ViVmlldyBpbXBsZW1lbnRzIGRlZi5BcmdvbldlYlZpZXcge1xuICAgIFxuICAgIHB1YmxpYyBzdGF0aWMgc2Vzc2lvbkV2ZW50ID0gJ3Nlc3Npb24nO1xuICAgIHB1YmxpYyBzdGF0aWMgbG9nRXZlbnQgPSAnbG9nJztcblxuICAgIHB1YmxpYyBpc0FyZ29uQXBwID0gZmFsc2U7XG5cbiAgICBwdWJsaWMgdGl0bGUgOiBzdHJpbmc7XG4gICAgcHVibGljIHByb2dyZXNzIDogbnVtYmVyO1xuXG4gICAgcHJpdmF0ZSBfbG9nID0gbmV3IE9ic2VydmFibGVBcnJheTxkZWYuTG9nSXRlbT4oKTtcbiAgICBwdWJsaWMgZ2V0IGxvZygpIHtyZXR1cm4gdGhpcy5fbG9nfTtcblxuICAgIHB1YmxpYyBzZXNzaW9uPzpBcmdvbi5TZXNzaW9uUG9ydDtcbiAgICBwcml2YXRlIF9vdXRwdXRQb3J0PzpBcmdvbi5NZXNzYWdlUG9ydExpa2U7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgX2RpZENvbW1pdE5hdmlnYXRpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnNlc3Npb24pIHRoaXMuc2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICB0aGlzLmxvZy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLnNlc3Npb24gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX291dHB1dFBvcnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHVibGljIF9oYW5kbGVBcmdvbk1lc3NhZ2UobWVzc2FnZTpzdHJpbmcpIHtcblxuICAgICAgICBpZiAodGhpcy5zZXNzaW9uICYmICF0aGlzLnNlc3Npb24uaXNDb25uZWN0ZWQpIHJldHVybjtcblxuICAgICAgICBpZiAoIXRoaXMuc2Vzc2lvbikgeyBcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25VcmwgPSB0aGlzLmdldEN1cnJlbnRVcmwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3RpbmcgdG8gYXJnb24uanMgc2Vzc2lvbiBhdCAnICsgc2Vzc2lvblVybCk7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gQXJnb24uQXJnb25TeXN0ZW0uaW5zdGFuY2UhO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZUNoYW5uZWwgPSBtYW5hZ2VyLnNlc3Npb24uY3JlYXRlU3luY2hyb25vdXNNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IG1hbmFnZXIuc2Vzc2lvbi5hZGRNYW5hZ2VkU2Vzc2lvblBvcnQoc2Vzc2lvblVybCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBtZXNzYWdlQ2hhbm5lbC5wb3J0MjtcbiAgICAgICAgICAgIHBvcnQub25tZXNzYWdlID0gKG1zZzpBcmdvbi5NZXNzYWdlRXZlbnRMaWtlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNlc3Npb24pIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmplY3RlZE1lc3NhZ2UgPSBcInR5cGVvZiBfX0FSR09OX1BPUlRfXyAhPT0gdW5kZWZpbmVkICYmIF9fQVJHT05fUE9SVF9fLnBvc3RNZXNzYWdlKFwiK21zZy5kYXRhK1wiKVwiO1xuICAgICAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVKYXZhc2NyaXB0V2l0aG91dFByb21pc2UoaW5qZWN0ZWRNZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBhcmdzOmRlZi5TZXNzaW9uRXZlbnREYXRhID0ge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogQXJnb25XZWJWaWV3LnNlc3Npb25FdmVudCxcbiAgICAgICAgICAgICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICAgICAgICAgICAgc2Vzc2lvbjogc2Vzc2lvblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5ub3RpZnkoYXJncyk7XG5cbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvbiA9IHNlc3Npb247XG4gICAgICAgICAgICB0aGlzLl9vdXRwdXRQb3J0ID0gcG9ydDtcblxuICAgICAgICAgICAgc2Vzc2lvbi5vcGVuKG1lc3NhZ2VDaGFubmVsLnBvcnQxLCBtYW5hZ2VyLnNlc3Npb24uY29uZmlndXJhdGlvbilcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAgICAgdGhpcy5fb3V0cHV0UG9ydCAmJiB0aGlzLl9vdXRwdXRQb3J0LnBvc3RNZXNzYWdlKEpTT04ucGFyc2UobWVzc2FnZSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBfaGFuZGxlTG9nTWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuICAgICAgICBjb25zdCBsb2c6ZGVmLkxvZ0l0ZW0gPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICBsb2cubGluZXMgPSBsb2cubWVzc2FnZS5zcGxpdCgvXFxyXFxufFxccnxcXG4vKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy51cmwgKyAnICgnICsgbG9nLnR5cGUgKyAnKTogJyArIGxvZy5saW5lcy5qb2luKCdcXG5cXHQgPiAnKSk7IFxuICAgICAgICB0aGlzLmxvZy5wdXNoKGxvZyk7XG4gICAgfVxuXG4gICAgcHVibGljIGFic3RyYWN0IGV2YWx1YXRlSmF2YXNjcmlwdChzY3JpcHQ6c3RyaW5nKSA6IFByb21pc2U8YW55PjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgZXZhbHVhdGVKYXZhc2NyaXB0V2l0aG91dFByb21pc2Uoc2NyaXB0OnN0cmluZykgOiB2b2lkO1xuXG4gICAgcHVibGljIGFic3RyYWN0IGJyaW5nVG9Gcm9udCgpO1xuXG4gICAgcHVibGljIGFic3RyYWN0IGdldEN1cnJlbnRVcmwoKSA6IHN0cmluZztcblxufVxuIl19