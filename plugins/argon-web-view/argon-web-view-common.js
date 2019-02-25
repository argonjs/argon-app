"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var web_view_1 = require("ui/web-view");
var observable_array_1 = require("data/observable-array");
var properties_1 = require("ui/core/properties");
exports.PROTOCOL_VERSION_STRING = '2.0.0';
exports.PROTOCOL_VERSION = exports.PROTOCOL_VERSION_STRING.split('.').map(function (v) { return parseInt(v); });
exports.urlProperty = new properties_1.Property({
    name: 'url',
    defaultValue: ''
});
exports.urlProperty.set = function (v) { throw new Error('Use the src property to load another page'); };
exports.titleProperty = new properties_1.Property({
    name: 'title',
    defaultValue: ''
});
exports.titleProperty.set = undefined;
exports.progressProperty = new properties_1.Property({
    name: 'progress',
    defaultValue: 0
});
exports.progressProperty.set = undefined;
var ArgonWebView = /** @class */ (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.log = new observable_array_1.ObservableArray();
        _this.messageHandlers = {};
        _this._packet = [];
        return _this;
    }
    ArgonWebView.prototype._didCommitNavigation = function () {
        // if (this.session) this.session.close();
        // reset defaults to assume non-xr-enabled & non-immersive page
        this.log.length = 0;
        // sessionProperty.nativeValueChange(this, undefined);
        // this._outputPort = undefined;
    };
    ArgonWebView.prototype._loadData = function (src) {
        if (src === '' || src === 'about:blank') {
            return this['_loadUrl'](src);
        }
        return _super.prototype['_loadData'].call(this, src);
    };
    // public _handleArgonMessage(message:string) {
    //     // if (this.session && !this.session.isConnected) return;
    //     const sessionUrl = this.url;
    //     if (!this.session && sessionUrl) { 
    //         console.log('Connecting to argon.js session at ' + sessionUrl);
    //         const manager = Argon.ArgonSystem.instance!;
    //         const messageChannel = manager.session.createSynchronousMessageChannel();
    //         const session = manager.session.addManagedSessionPort(sessionUrl);
    //         const port = messageChannel.port2;
    //         port.onmessage = (msg:Argon.MessageEventLike) => {
    //             if (!this.session) return;
    //             const injectedMessage = "typeof __ARGON_PORT__ !== 'undefined' && __ARGON_PORT__.postMessage("+msg.data+")";
    //             this.evaluateJavascriptWithoutPromise(injectedMessage);
    //         }
    //         sessionProperty.nativeValueChange(this, session);
    //         this._outputPort = port;
    //         session.open(messageChannel.port1, manager.session.configuration)
    //     }
    //     // console.log(message);
    //     this._outputPort && this._outputPort.postMessage(JSON.parse(message));
    // }
    ArgonWebView.prototype._handleArgonMessage = function (messageData) {
        var _this = this;
        var data = JSON.parse(messageData);
        var id = data[0];
        var topic = data[1];
        var message = data[2] || {};
        var expectsResponse = data[3];
        var handler = this.messageHandlers[topic];
        // console.log('Received: \n' + console.log(message))
        if (handler && !expectsResponse) {
            handler(message);
        }
        else if (handler) {
            var response = new Promise(function (resolve) { return resolve(handler(message) || undefined); });
            Promise.resolve(response).then(function (response) {
                // if (this._isClosed) return;
                _this.send(topic + ':resolve:' + id, response);
            }).catch(function (error) {
                // if (this._isClosed) return;
                var errorMessage;
                if (typeof error === 'string')
                    errorMessage = error;
                else if (typeof error.message === 'string')
                    errorMessage = error.message;
                _this.send(topic + ':reject:' + id, { reason: errorMessage });
            });
        }
        else {
            var errorMessage = 'Unable to handle message for topic ' + topic;
            console.log(errorMessage);
            if (expectsResponse) {
                this.send(topic + ':reject:' + id, { reason: errorMessage });
            }
        }
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
    ArgonWebView.prototype.send = function (topic, message) {
        this._sendPacket(createGuid(), topic, message, false);
    };
    ArgonWebView.prototype.request = function (topic, message) {
        var _this = this;
        var id = createGuid();
        var resolveTopic = topic + ':resolve:' + id;
        var rejectTopic = topic + ':reject:' + id;
        var result = new Promise(function (resolve, reject) {
            _this.messageHandlers[resolveTopic] = function (message) {
                delete _this.messageHandlers[resolveTopic];
                delete _this.messageHandlers[rejectTopic];
                resolve(message);
            };
            _this.messageHandlers[rejectTopic] = function (message) {
                delete _this.messageHandlers[resolveTopic];
                delete _this.messageHandlers[rejectTopic];
                console.warn("Request '" + topic + "' rejected with reason:\n" + message.reason);
                reject(new Error(message.reason));
            };
        });
        this._sendPacket(id, topic, message, true);
        return result;
    };
    ArgonWebView.prototype._sendPacket = function (id, topic, message, expectsResponse) {
        var packet = this._packet;
        packet[0] = id;
        packet[1] = topic;
        packet[2] = message;
        packet[3] = expectsResponse;
        var stringifiedPacket = JSON.stringify(packet);
        var injectedMessage = "typeof __ARGON_PORT__ !== 'undefined' && __ARGON_PORT__.postMessage(" + stringifiedPacket + ")";
        this.evaluateJavascriptWithoutPromise(injectedMessage);
    };
    return ArgonWebView;
}(web_view_1.WebView));
exports.ArgonWebView = ArgonWebView;
exports.urlProperty.register(ArgonWebView);
exports.titleProperty.register(ArgonWebView);
exports.progressProperty.register(ArgonWebView);
// sessionProperty.register(ArgonWebView);
// isArgonPageProperty.register(ArgonWebView);
// xrEnabledProperty.register(ArgonWebView)
// xrImmersiveType.register(ArgonWebView)
var lut = [];
for (var i = 0; i < 256; i++) {
    lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
}
function createGuid() {
    var d0 = Math.random() * 0xffffffff | 0;
    var d1 = Math.random() * 0xffffffff | 0;
    var d2 = Math.random() * 0xffffffff | 0;
    var d3 = Math.random() * 0xffffffff | 0;
    return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
        lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
        lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
        lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXctY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXctY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLHdDQUFtQztBQUNuQywwREFBc0Q7QUFDdEQsaURBQTJDO0FBRTlCLFFBQUEsdUJBQXVCLEdBQUcsT0FBTyxDQUFBO0FBQ2pDLFFBQUEsZ0JBQWdCLEdBQUcsK0JBQXVCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBWCxDQUFXLENBQUMsQ0FBQTtBQUUzRSxRQUFBLFdBQVcsR0FBRyxJQUFJLHFCQUFRLENBQXVCO0lBQzFELElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWSxFQUFFLEVBQUU7Q0FDbkIsQ0FBQyxDQUFBO0FBQ0YsbUJBQVcsQ0FBQyxHQUFHLEdBQUcsVUFBQyxDQUFDLElBQU8sTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTlFLFFBQUEsYUFBYSxHQUFHLElBQUkscUJBQVEsQ0FBdUI7SUFDNUQsSUFBSSxFQUFFLE9BQU87SUFDYixZQUFZLEVBQUUsRUFBRTtDQUNuQixDQUFDLENBQUE7QUFDRixxQkFBYSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7QUFFakIsUUFBQSxnQkFBZ0IsR0FBRyxJQUFJLHFCQUFRLENBQXVCO0lBQy9ELElBQUksRUFBRSxVQUFVO0lBQ2hCLFlBQVksRUFBRSxDQUFDO0NBQ2xCLENBQUMsQ0FBQTtBQUNGLHdCQUFnQixDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7QUFHakM7SUFBMkMsZ0NBQU87SUFBbEQ7UUFBQSxxRUErSUM7UUF6SW1CLFNBQUcsR0FBRyxJQUFJLGtDQUFlLEVBQWUsQ0FBQztRQUVsRCxxQkFBZSxHQUF3RCxFQUFFLENBQUE7UUFDeEUs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QUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxFQUFFLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxFQUFFLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRztRQUN2RSxHQUFHLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxHQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFDLEdBQUcsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLEVBQUUsR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxFQUFFLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRztRQUMzRSxHQUFHLENBQUMsRUFBRSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxFQUFFLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxFQUFFLEdBQUMsSUFBSSxDQUFDO1FBQ3ZFLEdBQUcsQ0FBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxFQUFFLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUM7QUFDbkUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGRlZiBmcm9tICcuJ1xuaW1wb3J0IHtXZWJWaWV3fSBmcm9tICd1aS93ZWItdmlldydcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknOyAgICBcbmltcG9ydCB7UHJvcGVydHl9IGZyb20gJ3VpL2NvcmUvcHJvcGVydGllcydcblxuZXhwb3J0IGNvbnN0IFBST1RPQ09MX1ZFUlNJT05fU1RSSU5HID0gJzIuMC4wJ1xuZXhwb3J0IGNvbnN0IFBST1RPQ09MX1ZFUlNJT04gPSBQUk9UT0NPTF9WRVJTSU9OX1NUUklORy5zcGxpdCgnLicpLm1hcCh2ID0+IHBhcnNlSW50KHYpKVxuXG5leHBvcnQgY29uc3QgdXJsUHJvcGVydHkgPSBuZXcgUHJvcGVydHk8QXJnb25XZWJWaWV3LCBzdHJpbmc+KHtcbiAgICBuYW1lOiAndXJsJyxcbiAgICBkZWZhdWx0VmFsdWU6ICcnXG59KVxudXJsUHJvcGVydHkuc2V0ID0gKHYpID0+IHsgdGhyb3cgbmV3IEVycm9yKCdVc2UgdGhlIHNyYyBwcm9wZXJ0eSB0byBsb2FkIGFub3RoZXIgcGFnZScpOyB9O1xuXG5leHBvcnQgY29uc3QgdGl0bGVQcm9wZXJ0eSA9IG5ldyBQcm9wZXJ0eTxBcmdvbldlYlZpZXcsIHN0cmluZz4oe1xuICAgIG5hbWU6ICd0aXRsZScsXG4gICAgZGVmYXVsdFZhbHVlOiAnJ1xufSlcbnRpdGxlUHJvcGVydHkuc2V0ID0gdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3QgcHJvZ3Jlc3NQcm9wZXJ0eSA9IG5ldyBQcm9wZXJ0eTxBcmdvbldlYlZpZXcsIG51bWJlcj4oe1xuICAgIG5hbWU6ICdwcm9ncmVzcycsXG4gICAgZGVmYXVsdFZhbHVlOiAwXG59KVxucHJvZ3Jlc3NQcm9wZXJ0eS5zZXQgPSB1bmRlZmluZWQ7XG5cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyZ29uV2ViVmlldyBleHRlbmRzIFdlYlZpZXcgaW1wbGVtZW50cyBkZWYuQXJnb25XZWJWaWV3IHtcbiAgICBcbiAgICBwdWJsaWMgcmVhZG9ubHkgdXJsIDogc3RyaW5nO1xuICAgIHB1YmxpYyByZWFkb25seSB0aXRsZSA6IHN0cmluZztcbiAgICBwdWJsaWMgcmVhZG9ubHkgcHJvZ3Jlc3MgOiBudW1iZXI7IC8vIHJhbmdlIGlzIDAgdG8gMS4wXG4gICAgcHVibGljIHJlYWRvbmx5IGlzQXJnb25QYWdlOmJvb2xlYW47XG4gICAgcHVibGljIHJlYWRvbmx5IGxvZyA9IG5ldyBPYnNlcnZhYmxlQXJyYXk8ZGVmLkxvZ0l0ZW0+KCk7XG5cbiAgICBwdWJsaWMgbWVzc2FnZUhhbmRsZXJzOntbdG9waWM6c3RyaW5nXToobWVzc2FnZTp7fSk9PlByb21pc2VMaWtlPGFueT58dm9pZH0gPSB7fVxuICAgIHByaXZhdGUgX3BhY2tldDpBcnJheTx7fT4gPSBbXTtcblxuICAgIHB1YmxpYyBfZGlkQ29tbWl0TmF2aWdhdGlvbigpIHtcbiAgICAgICAgLy8gaWYgKHRoaXMuc2Vzc2lvbikgdGhpcy5zZXNzaW9uLmNsb3NlKCk7XG5cbiAgICAgICAgLy8gcmVzZXQgZGVmYXVsdHMgdG8gYXNzdW1lIG5vbi14ci1lbmFibGVkICYgbm9uLWltbWVyc2l2ZSBwYWdlXG4gICAgICAgIHRoaXMubG9nLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgLy8gc2Vzc2lvblByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKHRoaXMsIHVuZGVmaW5lZCk7XG4gICAgICAgIC8vIHRoaXMuX291dHB1dFBvcnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgX2xvYWREYXRhKHNyYykge1xuICAgICAgICBpZiAoc3JjID09PSAnJyB8fCBzcmMgPT09ICdhYm91dDpibGFuaycpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydfbG9hZFVybCddKHNyYylcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXJbJ19sb2FkRGF0YSddKHNyYylcbiAgICB9XG5cbiAgICAvLyBwdWJsaWMgX2hhbmRsZUFyZ29uTWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuXG4gICAgLy8gICAgIC8vIGlmICh0aGlzLnNlc3Npb24gJiYgIXRoaXMuc2Vzc2lvbi5pc0Nvbm5lY3RlZCkgcmV0dXJuO1xuICAgIC8vICAgICBjb25zdCBzZXNzaW9uVXJsID0gdGhpcy51cmw7XG5cbiAgICAvLyAgICAgaWYgKCF0aGlzLnNlc3Npb24gJiYgc2Vzc2lvblVybCkgeyBcbiAgICAgICAgICAgIFxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3RpbmcgdG8gYXJnb24uanMgc2Vzc2lvbiBhdCAnICsgc2Vzc2lvblVybCk7XG4gICAgLy8gICAgICAgICBjb25zdCBtYW5hZ2VyID0gQXJnb24uQXJnb25TeXN0ZW0uaW5zdGFuY2UhO1xuICAgIC8vICAgICAgICAgY29uc3QgbWVzc2FnZUNoYW5uZWwgPSBtYW5hZ2VyLnNlc3Npb24uY3JlYXRlU3luY2hyb25vdXNNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIC8vICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IG1hbmFnZXIuc2Vzc2lvbi5hZGRNYW5hZ2VkU2Vzc2lvblBvcnQoc2Vzc2lvblVybCk7XG4gICAgICAgICAgICBcbiAgICAvLyAgICAgICAgIGNvbnN0IHBvcnQgPSBtZXNzYWdlQ2hhbm5lbC5wb3J0MjtcbiAgICAvLyAgICAgICAgIHBvcnQub25tZXNzYWdlID0gKG1zZzpBcmdvbi5NZXNzYWdlRXZlbnRMaWtlKSA9PiB7XG4gICAgLy8gICAgICAgICAgICAgaWYgKCF0aGlzLnNlc3Npb24pIHJldHVybjtcbiAgICAvLyAgICAgICAgICAgICBjb25zdCBpbmplY3RlZE1lc3NhZ2UgPSBcInR5cGVvZiBfX0FSR09OX1BPUlRfXyAhPT0gJ3VuZGVmaW5lZCcgJiYgX19BUkdPTl9QT1JUX18ucG9zdE1lc3NhZ2UoXCIrbXNnLmRhdGErXCIpXCI7XG4gICAgLy8gICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShpbmplY3RlZE1lc3NhZ2UpO1xuICAgIC8vICAgICAgICAgfVxuXG4gICAgLy8gICAgICAgICBzZXNzaW9uUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgc2Vzc2lvbik7XG4gICAgLy8gICAgICAgICB0aGlzLl9vdXRwdXRQb3J0ID0gcG9ydDtcblxuICAgIC8vICAgICAgICAgc2Vzc2lvbi5vcGVuKG1lc3NhZ2VDaGFubmVsLnBvcnQxLCBtYW5hZ2VyLnNlc3Npb24uY29uZmlndXJhdGlvbilcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICAvLyBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAvLyAgICAgdGhpcy5fb3V0cHV0UG9ydCAmJiB0aGlzLl9vdXRwdXRQb3J0LnBvc3RNZXNzYWdlKEpTT04ucGFyc2UobWVzc2FnZSkpO1xuICAgIC8vIH1cblxuICAgIHB1YmxpYyBfaGFuZGxlQXJnb25NZXNzYWdlKG1lc3NhZ2VEYXRhOnN0cmluZykge1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2VEYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGlkID0gZGF0YVswXTtcbiAgICAgICAgY29uc3QgdG9waWMgPSBkYXRhWzFdO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZGF0YVsyXSB8fCB7fTtcbiAgICAgICAgY29uc3QgZXhwZWN0c1Jlc3BvbnNlID0gZGF0YVszXTtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMubWVzc2FnZUhhbmRsZXJzW3RvcGljXTtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZygnUmVjZWl2ZWQ6IFxcbicgKyBjb25zb2xlLmxvZyhtZXNzYWdlKSlcblxuICAgICAgICBpZiAoaGFuZGxlciAmJiAhZXhwZWN0c1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICBoYW5kbGVyKG1lc3NhZ2UpXG4gICAgICAgIH0gZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gcmVzb2x2ZShoYW5kbGVyKG1lc3NhZ2UpfHx1bmRlZmluZWQpKTtcbiAgICAgICAgICAgIFByb21pc2UucmVzb2x2ZShyZXNwb25zZSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuX2lzQ2xvc2VkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKHRvcGljICsgJzpyZXNvbHZlOicgKyBpZCwgcmVzcG9uc2UpXG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuX2lzQ2xvc2VkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnKSBlcnJvck1lc3NhZ2UgPSBlcnJvcjtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgZXJyb3IubWVzc2FnZSA9PT0gJ3N0cmluZycpIGVycm9yTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKHRvcGljICsgJzpyZWplY3Q6JyArIGlkLCB7IHJlYXNvbjogZXJyb3JNZXNzYWdlIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9ICdVbmFibGUgdG8gaGFuZGxlIG1lc3NhZ2UgZm9yIHRvcGljICcgKyB0b3BpYztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoZXhwZWN0c1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKHRvcGljICsgJzpyZWplY3Q6JyArIGlkLCB7IHJlYXNvbjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIF9oYW5kbGVMb2dNZXNzYWdlKG1lc3NhZ2U6c3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGxvZzpkZWYuTG9nSXRlbSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGxvZy5saW5lcyA9IGxvZy5tZXNzYWdlLnNwbGl0KC9cXHJcXG58XFxyfFxcbi8pO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnVybCArICcgKCcgKyBsb2cudHlwZSArICcpOiAnICsgbG9nLmxpbmVzLmpvaW4oJ1xcblxcdCA+ICcpKTsgXG4gICAgICAgIHRoaXMubG9nLnB1c2gobG9nKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDpzdHJpbmcpIDogUHJvbWlzZTxhbnk+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSA6IHZvaWQ7XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgYnJpbmdUb0Zyb250KCk7XG4gICAgXG4gICAgcHVibGljIG9uKGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrOiAoZGF0YTogYW55KSA9PiB2b2lkLCB0aGlzQXJnPzogYW55KSB7XG4gICAgICAgIHJldHVybiBzdXBlci5vbihldmVudCwgY2FsbGJhY2ssIHRoaXNBcmcpO1xuICAgIH1cblxuXHRwdWJsaWMgc2VuZCh0b3BpYywgbWVzc2FnZSkge1xuXHRcdHRoaXMuX3NlbmRQYWNrZXQoY3JlYXRlR3VpZCgpLCB0b3BpYywgbWVzc2FnZSwgZmFsc2UpXG5cdH1cbiAgICBcbiAgICBwdWJsaWMgcmVxdWVzdCh0b3BpYywgbWVzc2FnZSkgOiBQcm9taXNlPHt9PiB7XG4gICAgICAgIGNvbnN0IGlkID0gY3JlYXRlR3VpZCgpO1xuICAgICAgICBjb25zdCByZXNvbHZlVG9waWMgPSB0b3BpYyArICc6cmVzb2x2ZTonICsgaWQ7XG4gICAgICAgIGNvbnN0IHJlamVjdFRvcGljID0gdG9waWMgKyAnOnJlamVjdDonICsgaWQ7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZUhhbmRsZXJzW3Jlc29sdmVUb3BpY10gPSAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZXNvbHZlVG9waWNdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZWplY3RUb3BpY107XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubWVzc2FnZUhhbmRsZXJzW3JlamVjdFRvcGljXSA9IChtZXNzYWdlOntyZWFzb246c3RyaW5nfSkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZXNvbHZlVG9waWNdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZWplY3RUb3BpY107XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiUmVxdWVzdCAnXCIgKyB0b3BpYyArIFwiJyByZWplY3RlZCB3aXRoIHJlYXNvbjpcXG5cIiArIG1lc3NhZ2UucmVhc29uKTtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKG1lc3NhZ2UucmVhc29uKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cdFx0dGhpcy5fc2VuZFBhY2tldChpZCwgdG9waWMsIG1lc3NhZ2UsIHRydWUpXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG5cdHByaXZhdGUgX3NlbmRQYWNrZXQoaWQsIHRvcGljLCBtZXNzYWdlLCBleHBlY3RzUmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgcGFja2V0ID0gdGhpcy5fcGFja2V0O1xuXHRcdHBhY2tldFswXSA9IGlkXG5cdFx0cGFja2V0WzFdID0gdG9waWNcblx0XHRwYWNrZXRbMl0gPSBtZXNzYWdlXG4gICAgICAgIHBhY2tldFszXSA9IGV4cGVjdHNSZXNwb25zZVxuICAgICAgICBjb25zdCBzdHJpbmdpZmllZFBhY2tldCA9IEpTT04uc3RyaW5naWZ5KHBhY2tldClcbiAgICAgICAgY29uc3QgaW5qZWN0ZWRNZXNzYWdlID0gXCJ0eXBlb2YgX19BUkdPTl9QT1JUX18gIT09ICd1bmRlZmluZWQnICYmIF9fQVJHT05fUE9SVF9fLnBvc3RNZXNzYWdlKFwiK3N0cmluZ2lmaWVkUGFja2V0K1wiKVwiO1xuICAgICAgICB0aGlzLmV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKGluamVjdGVkTWVzc2FnZSk7XG5cdH1cblxufVxuXG51cmxQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpO1xudGl0bGVQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpO1xucHJvZ3Jlc3NQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpO1xuLy8gc2Vzc2lvblByb3BlcnR5LnJlZ2lzdGVyKEFyZ29uV2ViVmlldyk7XG4vLyBpc0FyZ29uUGFnZVByb3BlcnR5LnJlZ2lzdGVyKEFyZ29uV2ViVmlldyk7XG4vLyB4ckVuYWJsZWRQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpXG4vLyB4ckltbWVyc2l2ZVR5cGUucmVnaXN0ZXIoQXJnb25XZWJWaWV3KVxuXG5cbmNvbnN0IGx1dDpBcnJheTxzdHJpbmc+ID0gW107IGZvciAodmFyIGk9MDsgaTwyNTY7IGkrKykgeyBsdXRbaV0gPSAoaTwxNj8nMCc6JycpKyhpKS50b1N0cmluZygxNik7IH1cbmZ1bmN0aW9uIGNyZWF0ZUd1aWQoKSB7XG4gIHZhciBkMCA9IE1hdGgucmFuZG9tKCkqMHhmZmZmZmZmZnwwO1xuICB2YXIgZDEgPSBNYXRoLnJhbmRvbSgpKjB4ZmZmZmZmZmZ8MDtcbiAgdmFyIGQyID0gTWF0aC5yYW5kb20oKSoweGZmZmZmZmZmfDA7XG4gIHZhciBkMyA9IE1hdGgucmFuZG9tKCkqMHhmZmZmZmZmZnwwO1xuICByZXR1cm4gbHV0W2QwJjB4ZmZdK2x1dFtkMD4+OCYweGZmXStsdXRbZDA+PjE2JjB4ZmZdK2x1dFtkMD4+MjQmMHhmZl0rJy0nK1xuICAgIGx1dFtkMSYweGZmXStsdXRbZDE+PjgmMHhmZl0rJy0nK2x1dFtkMT4+MTYmMHgwZnwweDQwXStsdXRbZDE+PjI0JjB4ZmZdKyctJytcbiAgICBsdXRbZDImMHgzZnwweDgwXStsdXRbZDI+PjgmMHhmZl0rJy0nK2x1dFtkMj4+MTYmMHhmZl0rbHV0W2QyPj4yNCYweGZmXStcbiAgICBsdXRbZDMmMHhmZl0rbHV0W2QzPj44JjB4ZmZdK2x1dFtkMz4+MTYmMHhmZl0rbHV0W2QzPj4yNCYweGZmXTtcbn0iXX0=