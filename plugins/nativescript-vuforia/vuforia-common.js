"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('globals');
var Hint;
(function (Hint) {
    Hint[Hint["MaxSimultaneousImageTargets"] = 0] = "MaxSimultaneousImageTargets";
    Hint[Hint["MaxSimultaneousObjectTargets"] = 1] = "MaxSimultaneousObjectTargets";
    Hint[Hint["DelayedLoadingObjectDatasets"] = 2] = "DelayedLoadingObjectDatasets";
})(Hint = exports.Hint || (exports.Hint = {}));
var InitResult;
(function (InitResult) {
    InitResult[InitResult["SUCCESS"] = 100] = "SUCCESS";
    InitResult[InitResult["ERROR"] = -1] = "ERROR";
    InitResult[InitResult["DEVICE_NOT_SUPPORTED"] = -2] = "DEVICE_NOT_SUPPORTED";
    InitResult[InitResult["NO_CAMERA_ACCESS"] = -3] = "NO_CAMERA_ACCESS";
    InitResult[InitResult["LICENSE_ERROR_MISSING_KEY"] = -4] = "LICENSE_ERROR_MISSING_KEY";
    InitResult[InitResult["LICENSE_ERROR_INVALID_KEY"] = -5] = "LICENSE_ERROR_INVALID_KEY";
    InitResult[InitResult["LICENSE_ERROR_NO_NETWORK_PERMANENT"] = -6] = "LICENSE_ERROR_NO_NETWORK_PERMANENT";
    InitResult[InitResult["LICENSE_ERROR_NO_NETWORK_TRANSIENT"] = -7] = "LICENSE_ERROR_NO_NETWORK_TRANSIENT";
    InitResult[InitResult["LICENSE_ERROR_CANCELED_KEY"] = -8] = "LICENSE_ERROR_CANCELED_KEY";
    InitResult[InitResult["LICENSE_ERROR_PRODUCT_TYPE_MISMATCH"] = -9] = "LICENSE_ERROR_PRODUCT_TYPE_MISMATCH";
    InitResult[InitResult["EXTERNAL_DEVICE_NOT_DETECTED"] = -10] = "EXTERNAL_DEVICE_NOT_DETECTED";
})(InitResult = exports.InitResult || (exports.InitResult = {}));
var StorageType;
(function (StorageType) {
    StorageType[StorageType["App"] = 0] = "App";
    StorageType[StorageType["AppResource"] = 1] = "AppResource";
    StorageType[StorageType["Absolute"] = 2] = "Absolute";
})(StorageType = exports.StorageType || (exports.StorageType = {}));
var FPSHint;
(function (FPSHint) {
    FPSHint[FPSHint["None"] = 0] = "None";
    FPSHint[FPSHint["NoVideoBackground"] = 1] = "NoVideoBackground";
    FPSHint[FPSHint["PowerEfficiency"] = 2] = "PowerEfficiency";
    FPSHint[FPSHint["Fast"] = 4] = "Fast";
    FPSHint[FPSHint["DefaultFlags"] = 0] = "DefaultFlags";
})(FPSHint = exports.FPSHint || (exports.FPSHint = {}));
var VideoBackgroundReflection;
(function (VideoBackgroundReflection) {
    VideoBackgroundReflection[VideoBackgroundReflection["Default"] = 0] = "Default";
    VideoBackgroundReflection[VideoBackgroundReflection["On"] = 1] = "On";
    VideoBackgroundReflection[VideoBackgroundReflection["Off"] = 2] = "Off";
})(VideoBackgroundReflection = exports.VideoBackgroundReflection || (exports.VideoBackgroundReflection = {}));
var DeviceMode;
(function (DeviceMode) {
    DeviceMode[DeviceMode["AR"] = 0] = "AR";
    DeviceMode[DeviceMode["VR"] = 1] = "VR";
})(DeviceMode = exports.DeviceMode || (exports.DeviceMode = {}));
var CoordinateSystemType;
(function (CoordinateSystemType) {
    CoordinateSystemType[CoordinateSystemType["Unknown"] = 0] = "Unknown";
    CoordinateSystemType[CoordinateSystemType["Camera"] = 1] = "Camera";
    CoordinateSystemType[CoordinateSystemType["World"] = 2] = "World";
})(CoordinateSystemType = exports.CoordinateSystemType || (exports.CoordinateSystemType = {}));
var View;
(function (View) {
    View[View["Singular"] = 0] = "Singular";
    View[View["LeftEye"] = 1] = "LeftEye";
    View[View["RightEye"] = 2] = "RightEye";
    View[View["PostProcess"] = 3] = "PostProcess";
    View[View["Count"] = 4] = "Count";
})(View = exports.View || (exports.View = {}));
var ViewerParamtersButtonType;
(function (ViewerParamtersButtonType) {
    ViewerParamtersButtonType[ViewerParamtersButtonType["None"] = 0] = "None";
    ViewerParamtersButtonType[ViewerParamtersButtonType["Magnet"] = 1] = "Magnet";
    ViewerParamtersButtonType[ViewerParamtersButtonType["FingerTouch"] = 2] = "FingerTouch";
    ViewerParamtersButtonType[ViewerParamtersButtonType["ButtonTouch"] = 3] = "ButtonTouch";
})(ViewerParamtersButtonType = exports.ViewerParamtersButtonType || (exports.ViewerParamtersButtonType = {}));
var ViewerParamtersTrayAlignment;
(function (ViewerParamtersTrayAlignment) {
    ViewerParamtersTrayAlignment[ViewerParamtersTrayAlignment["Bottom"] = 0] = "Bottom";
    ViewerParamtersTrayAlignment[ViewerParamtersTrayAlignment["Centre"] = 1] = "Centre";
    ViewerParamtersTrayAlignment[ViewerParamtersTrayAlignment["Top"] = 2] = "Top";
})(ViewerParamtersTrayAlignment = exports.ViewerParamtersTrayAlignment || (exports.ViewerParamtersTrayAlignment = {}));
var CameraDeviceMode;
(function (CameraDeviceMode) {
    CameraDeviceMode[CameraDeviceMode["Default"] = -1] = "Default";
    CameraDeviceMode[CameraDeviceMode["OptimizeSpeed"] = -2] = "OptimizeSpeed";
    CameraDeviceMode[CameraDeviceMode["OpimizeQuality"] = -3] = "OpimizeQuality";
})(CameraDeviceMode = exports.CameraDeviceMode || (exports.CameraDeviceMode = {}));
var CameraDeviceFocusMode;
(function (CameraDeviceFocusMode) {
    CameraDeviceFocusMode[CameraDeviceFocusMode["Normal"] = 0] = "Normal";
    CameraDeviceFocusMode[CameraDeviceFocusMode["TriggerAuto"] = 1] = "TriggerAuto";
    CameraDeviceFocusMode[CameraDeviceFocusMode["ContinuousAuto"] = 2] = "ContinuousAuto";
    CameraDeviceFocusMode[CameraDeviceFocusMode["Infinite"] = 3] = "Infinite";
    CameraDeviceFocusMode[CameraDeviceFocusMode["Macro"] = 4] = "Macro";
})(CameraDeviceFocusMode = exports.CameraDeviceFocusMode || (exports.CameraDeviceFocusMode = {}));
var CameraDeviceDirection;
(function (CameraDeviceDirection) {
    CameraDeviceDirection[CameraDeviceDirection["Default"] = 0] = "Default";
    CameraDeviceDirection[CameraDeviceDirection["Back"] = 1] = "Back";
    CameraDeviceDirection[CameraDeviceDirection["Front"] = 2] = "Front";
})(CameraDeviceDirection = exports.CameraDeviceDirection || (exports.CameraDeviceDirection = {}));
var PixelFormat;
(function (PixelFormat) {
    PixelFormat[PixelFormat["Unknown"] = 0] = "Unknown";
    PixelFormat[PixelFormat["RGB565"] = 1] = "RGB565";
    PixelFormat[PixelFormat["RGB888"] = 2] = "RGB888";
    PixelFormat[PixelFormat["GRAYSCALE"] = 4] = "GRAYSCALE";
    PixelFormat[PixelFormat["YUV"] = 8] = "YUV";
    PixelFormat[PixelFormat["RGBA8888"] = 16] = "RGBA8888";
    PixelFormat[PixelFormat["INDEXED"] = 32] = "INDEXED";
})(PixelFormat = exports.PixelFormat || (exports.PixelFormat = {}));
var TrackableResultStatus;
(function (TrackableResultStatus) {
    TrackableResultStatus[TrackableResultStatus["Unknown"] = 0] = "Unknown";
    TrackableResultStatus[TrackableResultStatus["Undefined"] = 1] = "Undefined";
    TrackableResultStatus[TrackableResultStatus["Detected"] = 2] = "Detected";
    TrackableResultStatus[TrackableResultStatus["Tracked"] = 3] = "Tracked";
    TrackableResultStatus[TrackableResultStatus["ExtendedTracked"] = 4] = "ExtendedTracked";
})(TrackableResultStatus = exports.TrackableResultStatus || (exports.TrackableResultStatus = {}));
var APIBase = (function () {
    function APIBase() {
    }
    APIBase.prototype.setStateUpdateCallback = function (cb) {
        this.callback = cb;
    };
    APIBase.prototype.getViewerScaleFactor = function () {
        // static const float VIRTUAL_FOV_Y_DEGS = 85.0f;
        // Get the y-dimension of the physical camera field of view
        var cameraCalibration = this.getCameraDevice().getCameraCalibration();
        if (!cameraCalibration)
            throw new Error('Unable to get camera calibration');
        var device = this.getDevice();
        if (!device.isViewerActive())
            throw new Error('Viewer is not active');
        var fov = cameraCalibration.getFieldOfViewRads();
        var cameraFovYRad = fov.y;
        var viewer = device.getSelectedViewer();
        if (!viewer)
            throw new Error('No viewer is selected');
        // Get the y-dimension of the virtual camera field of view
        var viewerFOV = viewer.getFieldOfView();
        var viewerFOVy = viewerFOV.y + viewerFOV.z;
        var virtualFovYRad = viewerFOVy * Math.PI / 180;
        //    float virtualFovYRad = VIRTUAL_FOV_Y_DEGS * M_PI / 180;
        // The viewer-scale factor represents the proportion of the viewport that is filled by
        // the video background when projected onto the same plane.
        // In order to calculate this, let 'd' be the distance between the cameras and the plane.
        // The height of the projected image 'h' on this plane can then be calculated:
        //   tan(fov/2) = h/2d
        // which rearranges to:
        //   2d = h/tan(fov/2)
        // Since 'd' is the same for both cameras, we can combine the equations for the two cameras:
        //   hPhysical/tan(fovPhysical/2) = hVirtual/tan(fovVirtual/2)
        // Which rearranges to:
        //   hPhysical/hVirtual = tan(fovPhysical/2)/tan(fovVirtual/2)
        // ... which is the scene-scale factor
        return Math.tan(cameraFovYRad / 2) / Math.tan(virtualFovYRad / 2);
    };
    return APIBase;
}());
exports.APIBase = APIBase;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS1jb21tb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLWNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUdsQixJQUFZLElBSVg7QUFKRCxXQUFZLElBQUk7SUFDWiw2RUFBK0IsQ0FBQTtJQUMvQiwrRUFBZ0MsQ0FBQTtJQUNoQywrRUFBZ0MsQ0FBQTtBQUNwQyxDQUFDLEVBSlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBSWY7QUFFRCxJQUFZLFVBWVg7QUFaRCxXQUFZLFVBQVU7SUFDbEIsbURBQWEsQ0FBQTtJQUNiLDhDQUFVLENBQUE7SUFDViw0RUFBeUIsQ0FBQTtJQUN6QixvRUFBcUIsQ0FBQTtJQUNyQixzRkFBOEIsQ0FBQTtJQUM5QixzRkFBOEIsQ0FBQTtJQUM5Qix3R0FBdUMsQ0FBQTtJQUN2Qyx3R0FBdUMsQ0FBQTtJQUN2Qyx3RkFBK0IsQ0FBQTtJQUMvQiwwR0FBd0MsQ0FBQTtJQUN4Qyw2RkFBa0MsQ0FBQTtBQUN0QyxDQUFDLEVBWlcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFZckI7QUFFRCxJQUFZLFdBSVg7QUFKRCxXQUFZLFdBQVc7SUFDbkIsMkNBQU8sQ0FBQTtJQUNQLDJEQUFlLENBQUE7SUFDZixxREFBWSxDQUFBO0FBQ2hCLENBQUMsRUFKVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQUl0QjtBQUVELElBQVksT0FNWDtBQU5ELFdBQVksT0FBTztJQUNmLHFDQUFRLENBQUE7SUFDUiwrREFBcUIsQ0FBQTtJQUNyQiwyREFBbUIsQ0FBQTtJQUNuQixxQ0FBUSxDQUFBO0lBQ1IscURBQWdCLENBQUE7QUFDcEIsQ0FBQyxFQU5XLE9BQU8sR0FBUCxlQUFPLEtBQVAsZUFBTyxRQU1sQjtBQUVELElBQVkseUJBSVg7QUFKRCxXQUFZLHlCQUF5QjtJQUNqQywrRUFBVyxDQUFBO0lBQ1gscUVBQU0sQ0FB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LEFBdkRELElBdURDO0FBdkRxQiwwQkFBTyIsInNvdXJjZXNDb250ZW50IjpbInJlcXVpcmUoJ2dsb2JhbHMnKVxuaW1wb3J0IGRlZiA9IHJlcXVpcmUoJ25hdGl2ZXNjcmlwdC12dWZvcmlhJyk7XG5cbmV4cG9ydCBlbnVtIEhpbnQge1xuICAgIE1heFNpbXVsdGFuZW91c0ltYWdlVGFyZ2V0cyA9IDAsXG4gICAgTWF4U2ltdWx0YW5lb3VzT2JqZWN0VGFyZ2V0cyA9IDEsXG4gICAgRGVsYXllZExvYWRpbmdPYmplY3REYXRhc2V0cyA9IDJcbn1cblxuZXhwb3J0IGVudW0gSW5pdFJlc3VsdCB7XG4gICAgU1VDQ0VTUyA9IDEwMCxcbiAgICBFUlJPUiA9IC0xLFxuICAgIERFVklDRV9OT1RfU1VQUE9SVEVEID0gLTIsXG4gICAgTk9fQ0FNRVJBX0FDQ0VTUyA9IC0zLFxuICAgIExJQ0VOU0VfRVJST1JfTUlTU0lOR19LRVkgPSAtNCxcbiAgICBMSUNFTlNFX0VSUk9SX0lOVkFMSURfS0VZID0gLTUsXG4gICAgTElDRU5TRV9FUlJPUl9OT19ORVRXT1JLX1BFUk1BTkVOVCA9IC02LFxuICAgIExJQ0VOU0VfRVJST1JfTk9fTkVUV09SS19UUkFOU0lFTlQgPSAtNyxcbiAgICBMSUNFTlNFX0VSUk9SX0NBTkNFTEVEX0tFWSA9IC04LFxuICAgIExJQ0VOU0VfRVJST1JfUFJPRFVDVF9UWVBFX01JU01BVENIID0gLTksXG4gICAgRVhURVJOQUxfREVWSUNFX05PVF9ERVRFQ1RFRCA9IC0xMFxufVxuXG5leHBvcnQgZW51bSBTdG9yYWdlVHlwZSB7XG4gICAgQXBwID0gMCxcbiAgICBBcHBSZXNvdXJjZSA9IDEsXG4gICAgQWJzb2x1dGUgPSAyXG59XG5cbmV4cG9ydCBlbnVtIEZQU0hpbnQge1xuICAgIE5vbmUgPSAwLFxuICAgIE5vVmlkZW9CYWNrZ3JvdW5kID0gMSxcbiAgICBQb3dlckVmZmljaWVuY3kgPSAyLFxuICAgIEZhc3QgPSA0LFxuICAgIERlZmF1bHRGbGFncyA9IDBcbn1cbiAgICBcbmV4cG9ydCBlbnVtIFZpZGVvQmFja2dyb3VuZFJlZmxlY3Rpb24ge1xuICAgIERlZmF1bHQgPSAwLFxuICAgIE9uID0gMSxcbiAgICBPZmYgPSAyXG59XG5cbmV4cG9ydCBlbnVtIERldmljZU1vZGUge1xuICAgIEFSID0gMCxcbiAgICBWUiA9IDFcbn1cblxuZXhwb3J0IGVudW0gQ29vcmRpbmF0ZVN5c3RlbVR5cGUge1xuICAgIFVua25vd24gPSAwLFxuICAgIENhbWVyYSA9IDEsXG4gICAgV29ybGQgPSAyXG59XG5cbmV4cG9ydCBlbnVtIFZpZXcge1xuICAgIFNpbmd1bGFyID0gMCxcbiAgICBMZWZ0RXllID0gMSxcbiAgICBSaWdodEV5ZSA9IDIsXG4gICAgUG9zdFByb2Nlc3MgPSAzLFxuICAgIENvdW50ID0gNFxufVxuXG5leHBvcnQgZW51bSBWaWV3ZXJQYXJhbXRlcnNCdXR0b25UeXBlIHtcbiAgICBOb25lID0gMCxcbiAgICBNYWduZXQgPSAxLFxuICAgIEZpbmdlclRvdWNoID0gMixcbiAgICBCdXR0b25Ub3VjaCA9IDNcbn1cblxuZXhwb3J0IGVudW0gVmlld2VyUGFyYW10ZXJzVHJheUFsaWdubWVudCB7XG4gICAgQm90dG9tID0gMCxcbiAgICBDZW50cmUgPSAxLFxuICAgIFRvcCA9IDJcbn1cblxuZXhwb3J0IGVudW0gQ2FtZXJhRGV2aWNlTW9kZSB7XG4gICAgRGVmYXVsdCA9IC0xLFxuICAgIE9wdGltaXplU3BlZWQgPSAtMixcbiAgICBPcGltaXplUXVhbGl0eSA9IC0zXG59XG5cbmV4cG9ydCBlbnVtIENhbWVyYURldmljZUZvY3VzTW9kZSB7XG4gICAgTm9ybWFsID0gMCxcbiAgICBUcmlnZ2VyQXV0byA9IDEsXG4gICAgQ29udGludW91c0F1dG8gPSAyLFxuICAgIEluZmluaXRlID0gMyxcbiAgICBNYWNybyA9IDRcbn1cblxuZXhwb3J0IGVudW0gQ2FtZXJhRGV2aWNlRGlyZWN0aW9uIHtcbiAgICBEZWZhdWx0ID0gMCxcbiAgICBCYWNrID0gMSxcbiAgICBGcm9udCA9IDJcbn1cblxuZXhwb3J0IGVudW0gUGl4ZWxGb3JtYXQge1xuICAgIFVua25vd24gPSAwLFxuICAgIFJHQjU2NSA9IDEsXG4gICAgUkdCODg4ID0gMixcbiAgICBHUkFZU0NBTEUgPSA0LFxuICAgIFlVViA9IDgsXG4gICAgUkdCQTg4ODggPSAxNixcbiAgICBJTkRFWEVEID0gMzJcbn1cblxuZXhwb3J0IGVudW0gVHJhY2thYmxlUmVzdWx0U3RhdHVzIHtcbiAgICBVbmtub3duID0gMCxcbiAgICBVbmRlZmluZWQgPSAxLFxuICAgIERldGVjdGVkID0gMixcbiAgICBUcmFja2VkID0gMyxcbiAgICBFeHRlbmRlZFRyYWNrZWQgPSA0XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBUElCYXNlIGltcGxlbWVudHMgZGVmLkFQSSB7XG4gICAgYWJzdHJhY3Qgc2V0TGljZW5zZUtleShsaWNlbnNlS2V5OnN0cmluZykgOiBib29sZWFuO1xuICAgIGFic3RyYWN0IHNldEhpbnQoaGludDpkZWYuSGludCx2YWx1ZTpudW1iZXIpIDogYm9vbGVhbjtcbiAgICBhYnN0cmFjdCBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PjtcbiAgICBhYnN0cmFjdCBkZWluaXQoKSA6IHZvaWQ7XG4gICAgYWJzdHJhY3QgZ2V0Q2FtZXJhRGV2aWNlKCkgOiBkZWYuQ2FtZXJhRGV2aWNlO1xuICAgIGFic3RyYWN0IGdldERldmljZSgpIDogZGVmLkRldmljZTtcbiAgICBhYnN0cmFjdCBnZXRSZW5kZXJlcigpIDogZGVmLlJlbmRlcmVyO1xuICAgIGFic3RyYWN0IGluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuO1xuICAgIGFic3RyYWN0IGdldE9iamVjdFRyYWNrZXIoKSA6IGRlZi5PYmplY3RUcmFja2VyfHVuZGVmaW5lZDtcbiAgICBhYnN0cmFjdCBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuO1xuICAgIGFic3RyYWN0IHNldFNjYWxlRmFjdG9yKGY6bnVtYmVyKTtcbiAgICBhYnN0cmFjdCBnZXRTY2FsZUZhY3RvcigpIDogbnVtYmVyOyBcbiAgICBhYnN0cmFjdCBvblN1cmZhY2VDaGFuZ2VkKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikgOiB2b2lkO1xuICAgIFxuICAgIHByb3RlY3RlZCBjYWxsYmFjazooc3RhdGU6ZGVmLlN0YXRlKT0+dm9pZDtcblxuICAgIHNldFN0YXRlVXBkYXRlQ2FsbGJhY2soY2I6KHN0YXRlOmRlZi5TdGF0ZSk9PnZvaWQpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNiO1xuICAgIH1cblxuICAgIGdldFZpZXdlclNjYWxlRmFjdG9yKCkge1xuICAgICAgICAvLyBzdGF0aWMgY29uc3QgZmxvYXQgVklSVFVBTF9GT1ZfWV9ERUdTID0gODUuMGY7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB5LWRpbWVuc2lvbiBvZiB0aGUgcGh5c2ljYWwgY2FtZXJhIGZpZWxkIG9mIHZpZXdcbiAgICAgICAgY29uc3QgY2FtZXJhQ2FsaWJyYXRpb24gPSB0aGlzLmdldENhbWVyYURldmljZSgpLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgICAgIGlmICghY2FtZXJhQ2FsaWJyYXRpb24pIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGdldCBjYW1lcmEgY2FsaWJyYXRpb24nKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5nZXREZXZpY2UoKTtcbiAgICAgICAgaWYgKCFkZXZpY2UuaXNWaWV3ZXJBY3RpdmUoKSkgdGhyb3cgbmV3IEVycm9yKCdWaWV3ZXIgaXMgbm90IGFjdGl2ZScpO1xuXG4gICAgICAgIGNvbnN0IGZvdiA9IGNhbWVyYUNhbGlicmF0aW9uLmdldEZpZWxkT2ZWaWV3UmFkcygpO1xuICAgICAgICBjb25zdCBjYW1lcmFGb3ZZUmFkID0gZm92Lnk7XG4gICAgICAgIGNvbnN0IHZpZXdlciA9IGRldmljZS5nZXRTZWxlY3RlZFZpZXdlcigpO1xuICAgICAgICBpZiAoIXZpZXdlcikgIHRocm93IG5ldyBFcnJvcignTm8gdmlld2VyIGlzIHNlbGVjdGVkJyk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB5LWRpbWVuc2lvbiBvZiB0aGUgdmlydHVhbCBjYW1lcmEgZmllbGQgb2Ygdmlld1xuICAgICAgICBjb25zdCB2aWV3ZXJGT1YgPSB2aWV3ZXIuZ2V0RmllbGRPZlZpZXcoKTtcbiAgICAgICAgY29uc3Qgdmlld2VyRk9WeSA9IHZpZXdlckZPVi55ICsgdmlld2VyRk9WLno7XG4gICAgICAgIGNvbnN0IHZpcnR1YWxGb3ZZUmFkID0gdmlld2VyRk9WeSAqIE1hdGguUEkgLyAxODA7XG4gICAgICAgIC8vICAgIGZsb2F0IHZpcnR1YWxGb3ZZUmFkID0gVklSVFVBTF9GT1ZfWV9ERUdTICogTV9QSSAvIDE4MDtcbiAgICAgICAgXG4gICAgICAgIC8vIFRoZSB2aWV3ZXItc2NhbGUgZmFjdG9yIHJlcHJlc2VudHMgdGhlIHByb3BvcnRpb24gb2YgdGhlIHZpZXdwb3J0IHRoYXQgaXMgZmlsbGVkIGJ5XG4gICAgICAgIC8vIHRoZSB2aWRlbyBiYWNrZ3JvdW5kIHdoZW4gcHJvamVjdGVkIG9udG8gdGhlIHNhbWUgcGxhbmUuXG4gICAgICAgIC8vIEluIG9yZGVyIHRvIGNhbGN1bGF0ZSB0aGlzLCBsZXQgJ2QnIGJlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBjYW1lcmFzIGFuZCB0aGUgcGxhbmUuXG4gICAgICAgIC8vIFRoZSBoZWlnaHQgb2YgdGhlIHByb2plY3RlZCBpbWFnZSAnaCcgb24gdGhpcyBwbGFuZSBjYW4gdGhlbiBiZSBjYWxjdWxhdGVkOlxuICAgICAgICAvLyAgIHRhbihmb3YvMikgPSBoLzJkXG4gICAgICAgIC8vIHdoaWNoIHJlYXJyYW5nZXMgdG86XG4gICAgICAgIC8vICAgMmQgPSBoL3Rhbihmb3YvMilcbiAgICAgICAgLy8gU2luY2UgJ2QnIGlzIHRoZSBzYW1lIGZvciBib3RoIGNhbWVyYXMsIHdlIGNhbiBjb21iaW5lIHRoZSBlcXVhdGlvbnMgZm9yIHRoZSB0d28gY2FtZXJhczpcbiAgICAgICAgLy8gICBoUGh5c2ljYWwvdGFuKGZvdlBoeXNpY2FsLzIpID0gaFZpcnR1YWwvdGFuKGZvdlZpcnR1YWwvMilcbiAgICAgICAgLy8gV2hpY2ggcmVhcnJhbmdlcyB0bzpcbiAgICAgICAgLy8gICBoUGh5c2ljYWwvaFZpcnR1YWwgPSB0YW4oZm92UGh5c2ljYWwvMikvdGFuKGZvdlZpcnR1YWwvMilcbiAgICAgICAgLy8gLi4uIHdoaWNoIGlzIHRoZSBzY2VuZS1zY2FsZSBmYWN0b3JcbiAgICAgICAgcmV0dXJuIE1hdGgudGFuKGNhbWVyYUZvdllSYWQgLyAyKSAvIE1hdGgudGFuKHZpcnR1YWxGb3ZZUmFkIC8gMik7XG4gICAgfVxufVxuIl19