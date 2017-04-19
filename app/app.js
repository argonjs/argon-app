"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var application = require("application");
if (application.android) {
    application.mainModule = "entry-page";
}
else {
    application.mainModule = "main-page";
}
application.cssFile = "./app.css";
/***
 * Creates a performance.now() function
 */
if (!global.performance) {
    global.performance = {};
}
if (!global.performance.now) {
    if (application.android) {
        global.performance.now = function () {
            return java.lang.System.nanoTime() / 1000000;
        };
    }
    else if (application.ios) {
        global.performance.now = function () {
            return CACurrentMediaTime() * 1000;
        };
    }
}
/* temporarily disable this on Android, causing a crash

import { appViewModel } from './components/common/AppViewModel';
import { handleOpenURL, AppURL } from '@speigg/nativescript-urlhandler';

handleOpenURL((appURL: AppURL) => {
    appViewModel.ready.then(()=>{
        console.log('Received url request: ' + appURL);
        const urlValue = appURL.params.get('url');
        if (urlValue) {
            appViewModel.openUrl(decodeURIComponent(urlValue));
        } else {
            const url = 'https://' + appURL.path;
            appViewModel.openUrl(url);
        }
    });
});
*/
application.start();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQTRDO0FBQzVDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFdBQVcsQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFBO0FBQ3pDLENBQUM7QUFBQyxJQUFJLENBQUMsQ0FBQztJQUNKLFdBQVcsQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFBO0FBQ3hDLENBQUM7QUFDRCxXQUFXLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQztBQUVsQzs7R0FFRztBQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDdEIsTUFBTSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFDNUIsQ0FBQztBQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzFCLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHO1lBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDakQsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRztZQUNyQixNQUFNLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDdkMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztBQUNMLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFpQkU7QUFFRixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBwbGljYXRpb24gPSByZXF1aXJlKFwiYXBwbGljYXRpb25cIik7XG5pZiAoYXBwbGljYXRpb24uYW5kcm9pZCkge1xuICAgIGFwcGxpY2F0aW9uLm1haW5Nb2R1bGUgPSBcImVudHJ5LXBhZ2VcIlxufSBlbHNlIHtcbiAgICBhcHBsaWNhdGlvbi5tYWluTW9kdWxlID0gXCJtYWluLXBhZ2VcIlxufVxuYXBwbGljYXRpb24uY3NzRmlsZSA9IFwiLi9hcHAuY3NzXCI7XG5cbi8qKipcbiAqIENyZWF0ZXMgYSBwZXJmb3JtYW5jZS5ub3coKSBmdW5jdGlvblxuICovXG5pZiAoIWdsb2JhbC5wZXJmb3JtYW5jZSkge1xuICAgIGdsb2JhbC5wZXJmb3JtYW5jZSA9IHt9O1xufVxuaWYgKCFnbG9iYWwucGVyZm9ybWFuY2Uubm93KSB7XG4gICAgaWYgKGFwcGxpY2F0aW9uLmFuZHJvaWQpIHtcbiAgICAgICAgZ2xvYmFsLnBlcmZvcm1hbmNlLm5vdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBqYXZhLmxhbmcuU3lzdGVtLm5hbm9UaW1lKCkgLyAxMDAwMDAwO1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYXBwbGljYXRpb24uaW9zKSB7XG4gICAgICAgIGdsb2JhbC5wZXJmb3JtYW5jZS5ub3cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBDQUN1cnJlbnRNZWRpYVRpbWUoKSAqIDEwMDA7XG4gICAgICAgIH07XG4gICAgfVxufVxuXG4vKiB0ZW1wb3JhcmlseSBkaXNhYmxlIHRoaXMgb24gQW5kcm9pZCwgY2F1c2luZyBhIGNyYXNoXG5cbmltcG9ydCB7IGFwcFZpZXdNb2RlbCB9IGZyb20gJy4vY29tcG9uZW50cy9jb21tb24vQXBwVmlld01vZGVsJztcbmltcG9ydCB7IGhhbmRsZU9wZW5VUkwsIEFwcFVSTCB9IGZyb20gJ0BzcGVpZ2cvbmF0aXZlc2NyaXB0LXVybGhhbmRsZXInO1xuXG5oYW5kbGVPcGVuVVJMKChhcHBVUkw6IEFwcFVSTCkgPT4ge1xuICAgIGFwcFZpZXdNb2RlbC5yZWFkeS50aGVuKCgpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCB1cmwgcmVxdWVzdDogJyArIGFwcFVSTCk7XG4gICAgICAgIGNvbnN0IHVybFZhbHVlID0gYXBwVVJMLnBhcmFtcy5nZXQoJ3VybCcpO1xuICAgICAgICBpZiAodXJsVmFsdWUpIHtcbiAgICAgICAgICAgIGFwcFZpZXdNb2RlbC5vcGVuVXJsKGRlY29kZVVSSUNvbXBvbmVudCh1cmxWYWx1ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdXJsID0gJ2h0dHBzOi8vJyArIGFwcFVSTC5wYXRoO1xuICAgICAgICAgICAgYXBwVmlld01vZGVsLm9wZW5VcmwodXJsKTtcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4qL1xuXG5hcHBsaWNhdGlvbi5zdGFydCgpO1xuIl19