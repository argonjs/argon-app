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
    CameraDeviceMode[CameraDeviceMode["OptimizeQuality"] = -3] = "OptimizeQuality";
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
    TrackableResultStatus[TrackableResultStatus["NoPose"] = 0] = "NoPose";
    TrackableResultStatus[TrackableResultStatus["Unknown"] = 0] = "Unknown";
    TrackableResultStatus[TrackableResultStatus["Limited"] = 1] = "Limited";
    TrackableResultStatus[TrackableResultStatus["Undefined"] = 1] = "Undefined";
    TrackableResultStatus[TrackableResultStatus["Detected"] = 2] = "Detected";
    TrackableResultStatus[TrackableResultStatus["Tracked"] = 3] = "Tracked";
    TrackableResultStatus[TrackableResultStatus["ExtendedTracked"] = 4] = "ExtendedTracked";
})(TrackableResultStatus = exports.TrackableResultStatus || (exports.TrackableResultStatus = {}));
var HitTestHint;
(function (HitTestHint) {
    HitTestHint[HitTestHint["None"] = 0] = "None";
    HitTestHint[HitTestHint["HorizontalPlane"] = 1] = "HorizontalPlane";
    HitTestHint[HitTestHint["VerticalPlane"] = 2] = "VerticalPlane";
})(HitTestHint = exports.HitTestHint || (exports.HitTestHint = {}));
var APIBase = /** @class */ (function () {
    function APIBase() {
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS1jb21tb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLWNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUdsQixJQUFZLElBSVg7QUFKRCxXQUFZLElBQUk7SUFDWiw2RUFBK0IsQ0FBQTtJQUMvQiwrRUFBZ0MsQ0FBQTtJQUNoQywrRUFBZ0MsQ0FBQTtBQUNwQyxDQUFDLEVBSlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBSWY7QUFFRCxJQUFZLFVBWVg7QUFaRCxXQUFZLFVBQVU7SUFDbEIsbURBQWEsQ0FBQTtJQUNiLDhDQUFVLENBQUE7SUFDViw0RUFBeUIsQ0FBQTtJQUN6QixvRUFBcUIsQ0FBQTtJQUNyQixzRkFBOEIsQ0FBQTtJQUM5QixzRkFBOEIsQ0FBQTtJQUM5Qix3R0FBdUMsQ0FBQTtJQUN2Qyx3R0FBdUMsQ0FBQTtJQUN2Qyx3RkFBK0IsQ0FBQTtJQUMvQiwwR0FBd0MsQ0FBQTtJQUN4Qyw2RkFBa0MsQ0FBQTtBQUN0QyxDQUFDLEVBWlcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFZckI7QUFFRCxJQUFZLFdBSVg7QUFKRCxXQUFZLFdBQVc7SUFDbkIsMkNBQU8sQ0FBQTtJQUNQLDJEQUFlLENBQUE7SUFDZixxREFBWSxDQUFBO0FBQ2hCLENBQUMsRUFKVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQUl0QjtBQUVELElBQVksT0FNWDtBQU5ELFdBQVksT0FBTztJQUNmLHFDQUFRLENBQUE7SUFDUiwrREFBcUIsQ0FBQTtJQUNyQiwyREFBbUIsQ0FBQTtJQUNuQixxQ0FBUSxDQUFBO0lBQ1IscURBQWdCLENBQUE7QUFDcEIsQ0FBQyxFQU5XLE9BQU8sR0FBUCxlQUFPLEtBQVAsZUFBTyxRQU1sQjtBQUVELElBQVkseUJBSVg7QUFKRCxXQUFZLHlCQUF5QjtJQUNqQywrRUFBVyxDQUFBO0lBQ1gscUVBQU0sQ0FB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QUMsQ0FBQztJQUN0RSxDQUFDO0lBQ0wsY0FBQztBQUFELENBQUMsQUFuRUQsSUFtRUM7QUFuRXFCLDBCQUFPIiwic291cmNlc0NvbnRlbnQiOlsicmVxdWlyZSgnZ2xvYmFscycpXG5pbXBvcnQgZGVmID0gcmVxdWlyZSgnbmF0aXZlc2NyaXB0LXZ1Zm9yaWEnKTtcblxuZXhwb3J0IGVudW0gSGludCB7XG4gICAgTWF4U2ltdWx0YW5lb3VzSW1hZ2VUYXJnZXRzID0gMCxcbiAgICBNYXhTaW11bHRhbmVvdXNPYmplY3RUYXJnZXRzID0gMSxcbiAgICBEZWxheWVkTG9hZGluZ09iamVjdERhdGFzZXRzID0gMlxufVxuXG5leHBvcnQgZW51bSBJbml0UmVzdWx0IHtcbiAgICBTVUNDRVNTID0gMTAwLFxuICAgIEVSUk9SID0gLTEsXG4gICAgREVWSUNFX05PVF9TVVBQT1JURUQgPSAtMixcbiAgICBOT19DQU1FUkFfQUNDRVNTID0gLTMsXG4gICAgTElDRU5TRV9FUlJPUl9NSVNTSU5HX0tFWSA9IC00LFxuICAgIExJQ0VOU0VfRVJST1JfSU5WQUxJRF9LRVkgPSAtNSxcbiAgICBMSUNFTlNFX0VSUk9SX05PX05FVFdPUktfUEVSTUFORU5UID0gLTYsXG4gICAgTElDRU5TRV9FUlJPUl9OT19ORVRXT1JLX1RSQU5TSUVOVCA9IC03LFxuICAgIExJQ0VOU0VfRVJST1JfQ0FOQ0VMRURfS0VZID0gLTgsXG4gICAgTElDRU5TRV9FUlJPUl9QUk9EVUNUX1RZUEVfTUlTTUFUQ0ggPSAtOSxcbiAgICBFWFRFUk5BTF9ERVZJQ0VfTk9UX0RFVEVDVEVEID0gLTEwXG59XG5cbmV4cG9ydCBlbnVtIFN0b3JhZ2VUeXBlIHtcbiAgICBBcHAgPSAwLFxuICAgIEFwcFJlc291cmNlID0gMSxcbiAgICBBYnNvbHV0ZSA9IDJcbn1cblxuZXhwb3J0IGVudW0gRlBTSGludCB7XG4gICAgTm9uZSA9IDAsXG4gICAgTm9WaWRlb0JhY2tncm91bmQgPSAxLFxuICAgIFBvd2VyRWZmaWNpZW5jeSA9IDIsXG4gICAgRmFzdCA9IDQsXG4gICAgRGVmYXVsdEZsYWdzID0gMFxufVxuICAgIFxuZXhwb3J0IGVudW0gVmlkZW9CYWNrZ3JvdW5kUmVmbGVjdGlvbiB7XG4gICAgRGVmYXVsdCA9IDAsXG4gICAgT24gPSAxLFxuICAgIE9mZiA9IDJcbn1cblxuZXhwb3J0IGVudW0gRGV2aWNlTW9kZSB7XG4gICAgQVIgPSAwLFxuICAgIFZSID0gMVxufVxuXG5leHBvcnQgZW51bSBDb29yZGluYXRlU3lzdGVtVHlwZSB7XG4gICAgVW5rbm93biA9IDAsXG4gICAgQ2FtZXJhID0gMSxcbiAgICBXb3JsZCA9IDJcbn1cblxuZXhwb3J0IGVudW0gVmlldyB7XG4gICAgU2luZ3VsYXIgPSAwLFxuICAgIExlZnRFeWUgPSAxLFxuICAgIFJpZ2h0RXllID0gMixcbiAgICBQb3N0UHJvY2VzcyA9IDMsXG4gICAgQ291bnQgPSA0XG59XG5cbmV4cG9ydCBlbnVtIFZpZXdlclBhcmFtdGVyc0J1dHRvblR5cGUge1xuICAgIE5vbmUgPSAwLFxuICAgIE1hZ25ldCA9IDEsXG4gICAgRmluZ2VyVG91Y2ggPSAyLFxuICAgIEJ1dHRvblRvdWNoID0gM1xufVxuXG5leHBvcnQgZW51bSBWaWV3ZXJQYXJhbXRlcnNUcmF5QWxpZ25tZW50IHtcbiAgICBCb3R0b20gPSAwLFxuICAgIENlbnRyZSA9IDEsXG4gICAgVG9wID0gMlxufVxuXG5leHBvcnQgZW51bSBDYW1lcmFEZXZpY2VNb2RlIHtcbiAgICBEZWZhdWx0ID0gLTEsXG4gICAgT3B0aW1pemVTcGVlZCA9IC0yLFxuICAgIE9wdGltaXplUXVhbGl0eSA9IC0zXG59XG5cbmV4cG9ydCBlbnVtIENhbWVyYURldmljZUZvY3VzTW9kZSB7XG4gICAgTm9ybWFsID0gMCxcbiAgICBUcmlnZ2VyQXV0byA9IDEsXG4gICAgQ29udGludW91c0F1dG8gPSAyLFxuICAgIEluZmluaXRlID0gMyxcbiAgICBNYWNybyA9IDRcbn1cblxuZXhwb3J0IGVudW0gQ2FtZXJhRGV2aWNlRGlyZWN0aW9uIHtcbiAgICBEZWZhdWx0ID0gMCxcbiAgICBCYWNrID0gMSxcbiAgICBGcm9udCA9IDJcbn1cblxuZXhwb3J0IGVudW0gUGl4ZWxGb3JtYXQge1xuICAgIFVua25vd24gPSAwLFxuICAgIFJHQjU2NSA9IDEsXG4gICAgUkdCODg4ID0gMixcbiAgICBHUkFZU0NBTEUgPSA0LFxuICAgIFlVViA9IDgsXG4gICAgUkdCQTg4ODggPSAxNixcbiAgICBJTkRFWEVEID0gMzJcbn1cblxuZXhwb3J0IGVudW0gVHJhY2thYmxlUmVzdWx0U3RhdHVzIHtcbiAgICBOb1Bvc2UgPSAwLCBVbmtub3duID0gMCxcbiAgICBMaW1pdGVkID0gMSwgVW5kZWZpbmVkID0gMSxcbiAgICBEZXRlY3RlZCA9IDIsXG4gICAgVHJhY2tlZCA9IDMsXG4gICAgRXh0ZW5kZWRUcmFja2VkID0gNFxufVxuXG5leHBvcnQgZW51bSBIaXRUZXN0SGludCB7XG4gICAgTm9uZSA9IDAsXG4gICAgSG9yaXpvbnRhbFBsYW5lID0gMSxcbiAgICBWZXJ0aWNhbFBsYW5lID0gMlxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQVBJQmFzZSBpbXBsZW1lbnRzIGRlZi5BUEkge1xuICAgIGFic3RyYWN0IHNldExpY2Vuc2VLZXkobGljZW5zZUtleTpzdHJpbmcpIDogYm9vbGVhbjtcbiAgICBhYnN0cmFjdCBzZXRIaW50KGhpbnQ6ZGVmLkhpbnQsdmFsdWU6bnVtYmVyKSA6IGJvb2xlYW47XG5cbiAgICBhYnN0cmFjdCBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PjtcbiAgICBhYnN0cmFjdCBkZWluaXQoKSA6IHZvaWQ7XG5cbiAgICBhYnN0cmFjdCBnZXRDYW1lcmFEZXZpY2UoKSA6IGRlZi5DYW1lcmFEZXZpY2U7XG4gICAgYWJzdHJhY3QgZ2V0RGV2aWNlKCkgOiBkZWYuRGV2aWNlO1xuICAgIGFic3RyYWN0IGdldFJlbmRlcmVyKCkgOiBkZWYuUmVuZGVyZXI7XG5cbiAgICBzbWFydFRlcnJhaW4/IDogZGVmLlNtYXJ0VGVycmFpbjtcbiAgICBhYnN0cmFjdCBpbml0U21hcnRUZXJyYWluKCkgOiBib29sZWFuO1xuICAgIGFic3RyYWN0IGRlaW5pdFNtYXJ0VGVycmFpbigpIDogYm9vbGVhbjtcblxuICAgIHBvc2l0aW9uYWxEZXZpY2VUcmFja2VyPyA6IGRlZi5Qb3NpdGlvbmFsRGV2aWNlVHJhY2tlcjtcbiAgICBhYnN0cmFjdCBpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW47XG4gICAgYWJzdHJhY3QgZGVpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW47XG4gICAgXG4gICAgb2JqZWN0VHJhY2tlcj8gOiBkZWYuT2JqZWN0VHJhY2tlcjtcbiAgICBhYnN0cmFjdCBpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbjtcbiAgICBhYnN0cmFjdCBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuO1xuXG4gICAgYWJzdHJhY3Qgc2V0U2NhbGVGYWN0b3IoZjpudW1iZXIpO1xuICAgIGFic3RyYWN0IGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXI7IFxuICAgIGFic3RyYWN0IG9uU3VyZmFjZUNoYW5nZWQod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyKSA6IHZvaWQ7XG5cbiAgICBhYnN0cmFjdCBzZXRUYXJnZXRGUFMoZjpudW1iZXIpO1xuICAgIGFic3RyYWN0IGdldFRhcmdldEZQUygpIDogbnVtYmVyO1xuICAgIFxuICAgIHB1YmxpYyByZW5kZXJDYWxsYmFjaz86KHN0YXRlOmRlZi5TdGF0ZSk9PnZvaWQ7XG4gICAgcHVibGljIHVwZGF0ZUNhbGxiYWNrPzooc3RhdGU6ZGVmLlN0YXRlKT0+dm9pZDtcblxuICAgIGdldFZpZXdlclNjYWxlRmFjdG9yKCkge1xuICAgICAgICAvLyBzdGF0aWMgY29uc3QgZmxvYXQgVklSVFVBTF9GT1ZfWV9ERUdTID0gODUuMGY7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB5LWRpbWVuc2lvbiBvZiB0aGUgcGh5c2ljYWwgY2FtZXJhIGZpZWxkIG9mIHZpZXdcbiAgICAgICAgY29uc3QgY2FtZXJhQ2FsaWJyYXRpb24gPSB0aGlzLmdldENhbWVyYURldmljZSgpLmdldENhbWVyYUNhbGlicmF0aW9uKCk7XG4gICAgICAgIGlmICghY2FtZXJhQ2FsaWJyYXRpb24pIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGdldCBjYW1lcmEgY2FsaWJyYXRpb24nKTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5nZXREZXZpY2UoKTtcbiAgICAgICAgaWYgKCFkZXZpY2UuaXNWaWV3ZXJBY3RpdmUoKSkgdGhyb3cgbmV3IEVycm9yKCdWaWV3ZXIgaXMgbm90IGFjdGl2ZScpO1xuXG4gICAgICAgIGNvbnN0IGZvdiA9IGNhbWVyYUNhbGlicmF0aW9uLmdldEZpZWxkT2ZWaWV3UmFkcygpO1xuICAgICAgICBjb25zdCBjYW1lcmFGb3ZZUmFkID0gZm92Lnk7XG4gICAgICAgIGNvbnN0IHZpZXdlciA9IGRldmljZS5nZXRTZWxlY3RlZFZpZXdlcigpO1xuICAgICAgICBpZiAoIXZpZXdlcikgIHRocm93IG5ldyBFcnJvcignTm8gdmlld2VyIGlzIHNlbGVjdGVkJyk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB5LWRpbWVuc2lvbiBvZiB0aGUgdmlydHVhbCBjYW1lcmEgZmllbGQgb2Ygdmlld1xuICAgICAgICBjb25zdCB2aWV3ZXJGT1YgPSB2aWV3ZXIuZ2V0RmllbGRPZlZpZXcoKTtcbiAgICAgICAgY29uc3Qgdmlld2VyRk9WeSA9IHZpZXdlckZPVi55ICsgdmlld2VyRk9WLno7XG4gICAgICAgIGNvbnN0IHZpcnR1YWxGb3ZZUmFkID0gdmlld2VyRk9WeSAqIE1hdGguUEkgLyAxODA7XG4gICAgICAgIC8vICAgIGZsb2F0IHZpcnR1YWxGb3ZZUmFkID0gVklSVFVBTF9GT1ZfWV9ERUdTICogTV9QSSAvIDE4MDtcbiAgICAgICAgXG4gICAgICAgIC8vIFRoZSB2aWV3ZXItc2NhbGUgZmFjdG9yIHJlcHJlc2VudHMgdGhlIHByb3BvcnRpb24gb2YgdGhlIHZpZXdwb3J0IHRoYXQgaXMgZmlsbGVkIGJ5XG4gICAgICAgIC8vIHRoZSB2aWRlbyBiYWNrZ3JvdW5kIHdoZW4gcHJvamVjdGVkIG9udG8gdGhlIHNhbWUgcGxhbmUuXG4gICAgICAgIC8vIEluIG9yZGVyIHRvIGNhbGN1bGF0ZSB0aGlzLCBsZXQgJ2QnIGJlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBjYW1lcmFzIGFuZCB0aGUgcGxhbmUuXG4gICAgICAgIC8vIFRoZSBoZWlnaHQgb2YgdGhlIHByb2plY3RlZCBpbWFnZSAnaCcgb24gdGhpcyBwbGFuZSBjYW4gdGhlbiBiZSBjYWxjdWxhdGVkOlxuICAgICAgICAvLyAgIHRhbihmb3YvMikgPSBoLzJkXG4gICAgICAgIC8vIHdoaWNoIHJlYXJyYW5nZXMgdG86XG4gICAgICAgIC8vICAgMmQgPSBoL3Rhbihmb3YvMilcbiAgICAgICAgLy8gU2luY2UgJ2QnIGlzIHRoZSBzYW1lIGZvciBib3RoIGNhbWVyYXMsIHdlIGNhbiBjb21iaW5lIHRoZSBlcXVhdGlvbnMgZm9yIHRoZSB0d28gY2FtZXJhczpcbiAgICAgICAgLy8gICBoUGh5c2ljYWwvdGFuKGZvdlBoeXNpY2FsLzIpID0gaFZpcnR1YWwvdGFuKGZvdlZpcnR1YWwvMilcbiAgICAgICAgLy8gV2hpY2ggcmVhcnJhbmdlcyB0bzpcbiAgICAgICAgLy8gICBoUGh5c2ljYWwvaFZpcnR1YWwgPSB0YW4oZm92UGh5c2ljYWwvMikvdGFuKGZvdlZpcnR1YWwvMilcbiAgICAgICAgLy8gLi4uIHdoaWNoIGlzIHRoZSBzY2VuZS1zY2FsZSBmYWN0b3JcbiAgICAgICAgcmV0dXJuIE1hdGgudGFuKGNhbWVyYUZvdllSYWQgLyAyKSAvIE1hdGgudGFuKHZpcnR1YWxGb3ZZUmFkIC8gMik7XG4gICAgfVxufVxuIl19