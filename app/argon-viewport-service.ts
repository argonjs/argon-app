import frames = require('ui/frame');
import Argon = require("argon");

Argon.ViewportService.prototype.getSuggested = function() : Argon.Viewport {
    const frame = frames.topmost();
    return {
        x:0,
        y:0,
        width: frame.getMeasuredWidth(),
        height: frame.getMeasuredHeight()
    }
}
