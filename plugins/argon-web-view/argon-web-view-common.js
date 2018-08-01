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
        console.log('Received: \n' + console.log(message));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXctY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXctY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLHdDQUFtQztBQUNuQywwREFBc0Q7QUFDdEQsaURBQTJDO0FBRTlCLFFBQUEsdUJBQXVCLEdBQUcsT0FBTyxDQUFBO0FBQ2pDLFFBQUEsZ0JBQWdCLEdBQUcsK0JBQXVCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBWCxDQUFXLENBQUMsQ0FBQTtBQUUzRSxRQUFBLFdBQVcsR0FBRyxJQUFJLHFCQUFRLENBQXVCO0lBQzFELElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWSxFQUFFLEVBQUU7Q0FDbkIsQ0FBQyxDQUFBO0FBQ0YsbUJBQVcsQ0FBQyxHQUFHLEdBQUcsVUFBQyxDQUFDLElBQU8sTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTlFLFFBQUEsYUFBYSxHQUFHLElBQUkscUJBQVEsQ0FBdUI7SUFDNUQsSUFBSSxFQUFFLE9BQU87SUFDYixZQUFZLEVBQUUsRUFBRTtDQUNuQixDQUFDLENBQUE7QUFDRixxQkFBYSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7QUFFakIsUUFBQSxnQkFBZ0IsR0FBRyxJQUFJLHFCQUFRLENBQXVCO0lBQy9ELElBQUksRUFBRSxVQUFVO0lBQ2hCLFlBQVksRUFBRSxDQUFDO0NBQ2xCLENBQUMsQ0FBQTtBQUNGLHdCQUFnQixDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7QUFHakM7SUFBMkMsZ0NBQU87SUFBbEQ7UUFBQSxxRUF3SUM7UUFsSW1CLFNBQUcsR0FBRyxJQUFJLGtDQUFlLEVBQWUsQ0FBQztRQUVsRCxxQkFBZSxHQUF3RCxFQUFFLENBQUE7UUFDeEUs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QUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsSUFBRSxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxHQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUUsRUFBRSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLEVBQUUsR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHO1FBQzNFLEdBQUcsQ0FBQyxFQUFFLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxHQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFDLEdBQUcsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLEVBQUUsR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLEVBQUUsR0FBQyxJQUFJLENBQUM7UUFDdkUsR0FBRyxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLEVBQUUsR0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxJQUFFLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZGVmIGZyb20gJy4nXG5pbXBvcnQge1dlYlZpZXd9IGZyb20gJ3VpL3dlYi12aWV3J1xuaW1wb3J0IHtPYnNlcnZhYmxlQXJyYXl9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZS1hcnJheSc7ICAgIFxuaW1wb3J0IHtQcm9wZXJ0eX0gZnJvbSAndWkvY29yZS9wcm9wZXJ0aWVzJ1xuXG5leHBvcnQgY29uc3QgUFJPVE9DT0xfVkVSU0lPTl9TVFJJTkcgPSAnMi4wLjAnXG5leHBvcnQgY29uc3QgUFJPVE9DT0xfVkVSU0lPTiA9IFBST1RPQ09MX1ZFUlNJT05fU1RSSU5HLnNwbGl0KCcuJykubWFwKHYgPT4gcGFyc2VJbnQodikpXG5cbmV4cG9ydCBjb25zdCB1cmxQcm9wZXJ0eSA9IG5ldyBQcm9wZXJ0eTxBcmdvbldlYlZpZXcsIHN0cmluZz4oe1xuICAgIG5hbWU6ICd1cmwnLFxuICAgIGRlZmF1bHRWYWx1ZTogJydcbn0pXG51cmxQcm9wZXJ0eS5zZXQgPSAodikgPT4geyB0aHJvdyBuZXcgRXJyb3IoJ1VzZSB0aGUgc3JjIHByb3BlcnR5IHRvIGxvYWQgYW5vdGhlciBwYWdlJyk7IH07XG5cbmV4cG9ydCBjb25zdCB0aXRsZVByb3BlcnR5ID0gbmV3IFByb3BlcnR5PEFyZ29uV2ViVmlldywgc3RyaW5nPih7XG4gICAgbmFtZTogJ3RpdGxlJyxcbiAgICBkZWZhdWx0VmFsdWU6ICcnXG59KVxudGl0bGVQcm9wZXJ0eS5zZXQgPSB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBwcm9ncmVzc1Byb3BlcnR5ID0gbmV3IFByb3BlcnR5PEFyZ29uV2ViVmlldywgbnVtYmVyPih7XG4gICAgbmFtZTogJ3Byb2dyZXNzJyxcbiAgICBkZWZhdWx0VmFsdWU6IDBcbn0pXG5wcm9ncmVzc1Byb3BlcnR5LnNldCA9IHVuZGVmaW5lZDtcblxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJnb25XZWJWaWV3IGV4dGVuZHMgV2ViVmlldyBpbXBsZW1lbnRzIGRlZi5BcmdvbldlYlZpZXcge1xuICAgIFxuICAgIHB1YmxpYyByZWFkb25seSB1cmwgOiBzdHJpbmc7XG4gICAgcHVibGljIHJlYWRvbmx5IHRpdGxlIDogc3RyaW5nO1xuICAgIHB1YmxpYyByZWFkb25seSBwcm9ncmVzcyA6IG51bWJlcjsgLy8gcmFuZ2UgaXMgMCB0byAxLjBcbiAgICBwdWJsaWMgcmVhZG9ubHkgaXNBcmdvblBhZ2U6Ym9vbGVhbjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbG9nID0gbmV3IE9ic2VydmFibGVBcnJheTxkZWYuTG9nSXRlbT4oKTtcblxuICAgIHB1YmxpYyBtZXNzYWdlSGFuZGxlcnM6e1t0b3BpYzpzdHJpbmddOihtZXNzYWdlOnt9KT0+UHJvbWlzZUxpa2U8YW55Pnx2b2lkfSA9IHt9XG4gICAgcHJpdmF0ZSBfcGFja2V0OkFycmF5PHt9PiA9IFtdO1xuXG4gICAgcHVibGljIF9kaWRDb21taXROYXZpZ2F0aW9uKCkge1xuICAgICAgICAvLyBpZiAodGhpcy5zZXNzaW9uKSB0aGlzLnNlc3Npb24uY2xvc2UoKTtcblxuICAgICAgICAvLyByZXNldCBkZWZhdWx0cyB0byBhc3N1bWUgbm9uLXhyLWVuYWJsZWQgJiBub24taW1tZXJzaXZlIHBhZ2VcbiAgICAgICAgdGhpcy5sb2cubGVuZ3RoID0gMDtcblxuICAgICAgICAvLyBzZXNzaW9uUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgdW5kZWZpbmVkKTtcbiAgICAgICAgLy8gdGhpcy5fb3V0cHV0UG9ydCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBwdWJsaWMgX2hhbmRsZUFyZ29uTWVzc2FnZShtZXNzYWdlOnN0cmluZykge1xuXG4gICAgLy8gICAgIC8vIGlmICh0aGlzLnNlc3Npb24gJiYgIXRoaXMuc2Vzc2lvbi5pc0Nvbm5lY3RlZCkgcmV0dXJuO1xuICAgIC8vICAgICBjb25zdCBzZXNzaW9uVXJsID0gdGhpcy51cmw7XG5cbiAgICAvLyAgICAgaWYgKCF0aGlzLnNlc3Npb24gJiYgc2Vzc2lvblVybCkgeyBcbiAgICAgICAgICAgIFxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3RpbmcgdG8gYXJnb24uanMgc2Vzc2lvbiBhdCAnICsgc2Vzc2lvblVybCk7XG4gICAgLy8gICAgICAgICBjb25zdCBtYW5hZ2VyID0gQXJnb24uQXJnb25TeXN0ZW0uaW5zdGFuY2UhO1xuICAgIC8vICAgICAgICAgY29uc3QgbWVzc2FnZUNoYW5uZWwgPSBtYW5hZ2VyLnNlc3Npb24uY3JlYXRlU3luY2hyb25vdXNNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIC8vICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IG1hbmFnZXIuc2Vzc2lvbi5hZGRNYW5hZ2VkU2Vzc2lvblBvcnQoc2Vzc2lvblVybCk7XG4gICAgICAgICAgICBcbiAgICAvLyAgICAgICAgIGNvbnN0IHBvcnQgPSBtZXNzYWdlQ2hhbm5lbC5wb3J0MjtcbiAgICAvLyAgICAgICAgIHBvcnQub25tZXNzYWdlID0gKG1zZzpBcmdvbi5NZXNzYWdlRXZlbnRMaWtlKSA9PiB7XG4gICAgLy8gICAgICAgICAgICAgaWYgKCF0aGlzLnNlc3Npb24pIHJldHVybjtcbiAgICAvLyAgICAgICAgICAgICBjb25zdCBpbmplY3RlZE1lc3NhZ2UgPSBcInR5cGVvZiBfX0FSR09OX1BPUlRfXyAhPT0gJ3VuZGVmaW5lZCcgJiYgX19BUkdPTl9QT1JUX18ucG9zdE1lc3NhZ2UoXCIrbXNnLmRhdGErXCIpXCI7XG4gICAgLy8gICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShpbmplY3RlZE1lc3NhZ2UpO1xuICAgIC8vICAgICAgICAgfVxuXG4gICAgLy8gICAgICAgICBzZXNzaW9uUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgc2Vzc2lvbik7XG4gICAgLy8gICAgICAgICB0aGlzLl9vdXRwdXRQb3J0ID0gcG9ydDtcblxuICAgIC8vICAgICAgICAgc2Vzc2lvbi5vcGVuKG1lc3NhZ2VDaGFubmVsLnBvcnQxLCBtYW5hZ2VyLnNlc3Npb24uY29uZmlndXJhdGlvbilcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICAvLyBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAvLyAgICAgdGhpcy5fb3V0cHV0UG9ydCAmJiB0aGlzLl9vdXRwdXRQb3J0LnBvc3RNZXNzYWdlKEpTT04ucGFyc2UobWVzc2FnZSkpO1xuICAgIC8vIH1cblxuICAgIHB1YmxpYyBfaGFuZGxlQXJnb25NZXNzYWdlKG1lc3NhZ2VEYXRhOnN0cmluZykge1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2VEYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGlkID0gZGF0YVswXTtcbiAgICAgICAgY29uc3QgdG9waWMgPSBkYXRhWzFdO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZGF0YVsyXSB8fCB7fTtcbiAgICAgICAgY29uc3QgZXhwZWN0c1Jlc3BvbnNlID0gZGF0YVszXTtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMubWVzc2FnZUhhbmRsZXJzW3RvcGljXTtcblxuICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQ6IFxcbicgKyBjb25zb2xlLmxvZyhtZXNzYWdlKSlcblxuICAgICAgICBpZiAoaGFuZGxlciAmJiAhZXhwZWN0c1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICBoYW5kbGVyKG1lc3NhZ2UpXG4gICAgICAgIH0gZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gcmVzb2x2ZShoYW5kbGVyKG1lc3NhZ2UpfHx1bmRlZmluZWQpKTtcbiAgICAgICAgICAgIFByb21pc2UucmVzb2x2ZShyZXNwb25zZSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuX2lzQ2xvc2VkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKHRvcGljICsgJzpyZXNvbHZlOicgKyBpZCwgcmVzcG9uc2UpXG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuX2lzQ2xvc2VkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnKSBlcnJvck1lc3NhZ2UgPSBlcnJvcjtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgZXJyb3IubWVzc2FnZSA9PT0gJ3N0cmluZycpIGVycm9yTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKHRvcGljICsgJzpyZWplY3Q6JyArIGlkLCB7IHJlYXNvbjogZXJyb3JNZXNzYWdlIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9ICdVbmFibGUgdG8gaGFuZGxlIG1lc3NhZ2UgZm9yIHRvcGljICcgKyB0b3BpYztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoZXhwZWN0c1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKHRvcGljICsgJzpyZWplY3Q6JyArIGlkLCB7IHJlYXNvbjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIF9oYW5kbGVMb2dNZXNzYWdlKG1lc3NhZ2U6c3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGxvZzpkZWYuTG9nSXRlbSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGxvZy5saW5lcyA9IGxvZy5tZXNzYWdlLnNwbGl0KC9cXHJcXG58XFxyfFxcbi8pO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnVybCArICcgKCcgKyBsb2cudHlwZSArICcpOiAnICsgbG9nLmxpbmVzLmpvaW4oJ1xcblxcdCA+ICcpKTsgXG4gICAgICAgIHRoaXMubG9nLnB1c2gobG9nKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDpzdHJpbmcpIDogUHJvbWlzZTxhbnk+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSA6IHZvaWQ7XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgYnJpbmdUb0Zyb250KCk7XG4gICAgXG4gICAgcHVibGljIG9uKGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrOiAoZGF0YTogYW55KSA9PiB2b2lkLCB0aGlzQXJnPzogYW55KSB7XG4gICAgICAgIHJldHVybiBzdXBlci5vbihldmVudCwgY2FsbGJhY2ssIHRoaXNBcmcpO1xuICAgIH1cblxuXHRwdWJsaWMgc2VuZCh0b3BpYywgbWVzc2FnZSkge1xuXHRcdHRoaXMuX3NlbmRQYWNrZXQoY3JlYXRlR3VpZCgpLCB0b3BpYywgbWVzc2FnZSwgZmFsc2UpXG5cdH1cbiAgICBcbiAgICBwdWJsaWMgcmVxdWVzdCh0b3BpYywgbWVzc2FnZSkgOiBQcm9taXNlPHt9PiB7XG4gICAgICAgIGNvbnN0IGlkID0gY3JlYXRlR3VpZCgpO1xuICAgICAgICBjb25zdCByZXNvbHZlVG9waWMgPSB0b3BpYyArICc6cmVzb2x2ZTonICsgaWQ7XG4gICAgICAgIGNvbnN0IHJlamVjdFRvcGljID0gdG9waWMgKyAnOnJlamVjdDonICsgaWQ7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZUhhbmRsZXJzW3Jlc29sdmVUb3BpY10gPSAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZXNvbHZlVG9waWNdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZWplY3RUb3BpY107XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubWVzc2FnZUhhbmRsZXJzW3JlamVjdFRvcGljXSA9IChtZXNzYWdlOntyZWFzb246c3RyaW5nfSkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZXNvbHZlVG9waWNdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tyZWplY3RUb3BpY107XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiUmVxdWVzdCAnXCIgKyB0b3BpYyArIFwiJyByZWplY3RlZCB3aXRoIHJlYXNvbjpcXG5cIiArIG1lc3NhZ2UucmVhc29uKTtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKG1lc3NhZ2UucmVhc29uKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cdFx0dGhpcy5fc2VuZFBhY2tldChpZCwgdG9waWMsIG1lc3NhZ2UsIHRydWUpXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG5cdHByaXZhdGUgX3NlbmRQYWNrZXQoaWQsIHRvcGljLCBtZXNzYWdlLCBleHBlY3RzUmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgcGFja2V0ID0gdGhpcy5fcGFja2V0O1xuXHRcdHBhY2tldFswXSA9IGlkXG5cdFx0cGFja2V0WzFdID0gdG9waWNcblx0XHRwYWNrZXRbMl0gPSBtZXNzYWdlXG4gICAgICAgIHBhY2tldFszXSA9IGV4cGVjdHNSZXNwb25zZVxuICAgICAgICBjb25zdCBzdHJpbmdpZmllZFBhY2tldCA9IEpTT04uc3RyaW5naWZ5KHBhY2tldClcbiAgICAgICAgY29uc3QgaW5qZWN0ZWRNZXNzYWdlID0gXCJ0eXBlb2YgX19BUkdPTl9QT1JUX18gIT09ICd1bmRlZmluZWQnICYmIF9fQVJHT05fUE9SVF9fLnBvc3RNZXNzYWdlKFwiK3N0cmluZ2lmaWVkUGFja2V0K1wiKVwiO1xuICAgICAgICB0aGlzLmV2YWx1YXRlSmF2YXNjcmlwdFdpdGhvdXRQcm9taXNlKGluamVjdGVkTWVzc2FnZSk7XG5cdH1cblxufVxuXG51cmxQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpO1xudGl0bGVQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpO1xucHJvZ3Jlc3NQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpO1xuLy8gc2Vzc2lvblByb3BlcnR5LnJlZ2lzdGVyKEFyZ29uV2ViVmlldyk7XG4vLyBpc0FyZ29uUGFnZVByb3BlcnR5LnJlZ2lzdGVyKEFyZ29uV2ViVmlldyk7XG4vLyB4ckVuYWJsZWRQcm9wZXJ0eS5yZWdpc3RlcihBcmdvbldlYlZpZXcpXG4vLyB4ckltbWVyc2l2ZVR5cGUucmVnaXN0ZXIoQXJnb25XZWJWaWV3KVxuXG5cbmNvbnN0IGx1dDpBcnJheTxzdHJpbmc+ID0gW107IGZvciAodmFyIGk9MDsgaTwyNTY7IGkrKykgeyBsdXRbaV0gPSAoaTwxNj8nMCc6JycpKyhpKS50b1N0cmluZygxNik7IH1cbmZ1bmN0aW9uIGNyZWF0ZUd1aWQoKSB7XG4gIHZhciBkMCA9IE1hdGgucmFuZG9tKCkqMHhmZmZmZmZmZnwwO1xuICB2YXIgZDEgPSBNYXRoLnJhbmRvbSgpKjB4ZmZmZmZmZmZ8MDtcbiAgdmFyIGQyID0gTWF0aC5yYW5kb20oKSoweGZmZmZmZmZmfDA7XG4gIHZhciBkMyA9IE1hdGgucmFuZG9tKCkqMHhmZmZmZmZmZnwwO1xuICByZXR1cm4gbHV0W2QwJjB4ZmZdK2x1dFtkMD4+OCYweGZmXStsdXRbZDA+PjE2JjB4ZmZdK2x1dFtkMD4+MjQmMHhmZl0rJy0nK1xuICAgIGx1dFtkMSYweGZmXStsdXRbZDE+PjgmMHhmZl0rJy0nK2x1dFtkMT4+MTYmMHgwZnwweDQwXStsdXRbZDE+PjI0JjB4ZmZdKyctJytcbiAgICBsdXRbZDImMHgzZnwweDgwXStsdXRbZDI+PjgmMHhmZl0rJy0nK2x1dFtkMj4+MTYmMHhmZl0rbHV0W2QyPj4yNCYweGZmXStcbiAgICBsdXRbZDMmMHhmZl0rbHV0W2QzPj44JjB4ZmZdK2x1dFtkMz4+MTYmMHhmZl0rbHV0W2QzPj4yNCYweGZmXTtcbn0iXX0=