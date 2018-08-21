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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVmb3JpYS1jb21tb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2dWZvcmlhLWNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUdsQixJQUFZLElBSVg7QUFKRCxXQUFZLElBQUk7SUFDWiw2RUFBK0IsQ0FBQTtJQUMvQiwrRUFBZ0MsQ0FBQTtJQUNoQywrRUFBZ0MsQ0FBQTtBQUNwQyxDQUFDLEVBSlcsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBSWY7QUFFRCxJQUFZLFVBWVg7QUFaRCxXQUFZLFVBQVU7SUFDbEIsbURBQWEsQ0FBQTtJQUNiLDhDQUFVLENBQUE7SUFDViw0RUFBeUIsQ0FBQTtJQUN6QixvRUFBcUIsQ0FBQTtJQUNyQixzRkFBOEIsQ0FBQTtJQUM5QixzRkFBOEIsQ0FBQTtJQUM5Qix3R0FBdUMsQ0FBQTtJQUN2Qyx3R0FBdUMsQ0FBQTtJQUN2Qyx3RkFBK0IsQ0FBQTtJQUMvQiwwR0FBd0MsQ0FBQTtJQUN4Qyw2RkFBa0MsQ0FBQTtBQUN0QyxDQUFDLEVBWlcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFZckI7QUFFRCxJQUFZLFdBSVg7QUFKRCxXQUFZLFdBQVc7SUFDbkIsMkNBQU8sQ0FBQTtJQUNQLDJEQUFlLENBQUE7SUFDZixxREFBWSxDQUFBO0FBQ2hCLENBQUMsRUFKVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQUl0QjtBQUVELElBQVksT0FNWDtBQU5ELFdBQVksT0FBTztJQUNmLHFDQUFRLENBQUE7SUFDUiwrREFBcUIsQ0FBQTtJQUNyQiwyREFBbUIsQ0FBQTtJQUNuQixxQ0FBUSxDQUFBO0lBQ1IscURBQWdCLENBQUE7QUFDcEIsQ0FBQyxFQU5XLE9BQU8sR0FBUCxlQUFPLEtBQVAsZUFBTyxRQU1sQjtBQUVELElBQVkseUJBSVg7QUFKRCxXQUFZLHlCQUF5QjtJQUNqQywrRUFBVyxDQUFBO0lBQ1gscUVBQU0sQ0FB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Q0FBQyxBQWhFRCxJQWdFQztBQWhFcUIsMEJBQU8iLCJzb3VyY2VzQ29udGVudCI6WyJyZXF1aXJlKCdnbG9iYWxzJylcbmltcG9ydCBkZWYgPSByZXF1aXJlKCduYXRpdmVzY3JpcHQtdnVmb3JpYScpO1xuXG5leHBvcnQgZW51bSBIaW50IHtcbiAgICBNYXhTaW11bHRhbmVvdXNJbWFnZVRhcmdldHMgPSAwLFxuICAgIE1heFNpbXVsdGFuZW91c09iamVjdFRhcmdldHMgPSAxLFxuICAgIERlbGF5ZWRMb2FkaW5nT2JqZWN0RGF0YXNldHMgPSAyXG59XG5cbmV4cG9ydCBlbnVtIEluaXRSZXN1bHQge1xuICAgIFNVQ0NFU1MgPSAxMDAsXG4gICAgRVJST1IgPSAtMSxcbiAgICBERVZJQ0VfTk9UX1NVUFBPUlRFRCA9IC0yLFxuICAgIE5PX0NBTUVSQV9BQ0NFU1MgPSAtMyxcbiAgICBMSUNFTlNFX0VSUk9SX01JU1NJTkdfS0VZID0gLTQsXG4gICAgTElDRU5TRV9FUlJPUl9JTlZBTElEX0tFWSA9IC01LFxuICAgIExJQ0VOU0VfRVJST1JfTk9fTkVUV09SS19QRVJNQU5FTlQgPSAtNixcbiAgICBMSUNFTlNFX0VSUk9SX05PX05FVFdPUktfVFJBTlNJRU5UID0gLTcsXG4gICAgTElDRU5TRV9FUlJPUl9DQU5DRUxFRF9LRVkgPSAtOCxcbiAgICBMSUNFTlNFX0VSUk9SX1BST0RVQ1RfVFlQRV9NSVNNQVRDSCA9IC05LFxuICAgIEVYVEVSTkFMX0RFVklDRV9OT1RfREVURUNURUQgPSAtMTBcbn1cblxuZXhwb3J0IGVudW0gU3RvcmFnZVR5cGUge1xuICAgIEFwcCA9IDAsXG4gICAgQXBwUmVzb3VyY2UgPSAxLFxuICAgIEFic29sdXRlID0gMlxufVxuXG5leHBvcnQgZW51bSBGUFNIaW50IHtcbiAgICBOb25lID0gMCxcbiAgICBOb1ZpZGVvQmFja2dyb3VuZCA9IDEsXG4gICAgUG93ZXJFZmZpY2llbmN5ID0gMixcbiAgICBGYXN0ID0gNCxcbiAgICBEZWZhdWx0RmxhZ3MgPSAwXG59XG4gICAgXG5leHBvcnQgZW51bSBWaWRlb0JhY2tncm91bmRSZWZsZWN0aW9uIHtcbiAgICBEZWZhdWx0ID0gMCxcbiAgICBPbiA9IDEsXG4gICAgT2ZmID0gMlxufVxuXG5leHBvcnQgZW51bSBEZXZpY2VNb2RlIHtcbiAgICBBUiA9IDAsXG4gICAgVlIgPSAxXG59XG5cbmV4cG9ydCBlbnVtIENvb3JkaW5hdGVTeXN0ZW1UeXBlIHtcbiAgICBVbmtub3duID0gMCxcbiAgICBDYW1lcmEgPSAxLFxuICAgIFdvcmxkID0gMlxufVxuXG5leHBvcnQgZW51bSBWaWV3IHtcbiAgICBTaW5ndWxhciA9IDAsXG4gICAgTGVmdEV5ZSA9IDEsXG4gICAgUmlnaHRFeWUgPSAyLFxuICAgIFBvc3RQcm9jZXNzID0gMyxcbiAgICBDb3VudCA9IDRcbn1cblxuZXhwb3J0IGVudW0gVmlld2VyUGFyYW10ZXJzQnV0dG9uVHlwZSB7XG4gICAgTm9uZSA9IDAsXG4gICAgTWFnbmV0ID0gMSxcbiAgICBGaW5nZXJUb3VjaCA9IDIsXG4gICAgQnV0dG9uVG91Y2ggPSAzXG59XG5cbmV4cG9ydCBlbnVtIFZpZXdlclBhcmFtdGVyc1RyYXlBbGlnbm1lbnQge1xuICAgIEJvdHRvbSA9IDAsXG4gICAgQ2VudHJlID0gMSxcbiAgICBUb3AgPSAyXG59XG5cbmV4cG9ydCBlbnVtIENhbWVyYURldmljZU1vZGUge1xuICAgIERlZmF1bHQgPSAtMSxcbiAgICBPcHRpbWl6ZVNwZWVkID0gLTIsXG4gICAgT3BpbWl6ZVF1YWxpdHkgPSAtM1xufVxuXG5leHBvcnQgZW51bSBDYW1lcmFEZXZpY2VGb2N1c01vZGUge1xuICAgIE5vcm1hbCA9IDAsXG4gICAgVHJpZ2dlckF1dG8gPSAxLFxuICAgIENvbnRpbnVvdXNBdXRvID0gMixcbiAgICBJbmZpbml0ZSA9IDMsXG4gICAgTWFjcm8gPSA0XG59XG5cbmV4cG9ydCBlbnVtIENhbWVyYURldmljZURpcmVjdGlvbiB7XG4gICAgRGVmYXVsdCA9IDAsXG4gICAgQmFjayA9IDEsXG4gICAgRnJvbnQgPSAyXG59XG5cbmV4cG9ydCBlbnVtIFBpeGVsRm9ybWF0IHtcbiAgICBVbmtub3duID0gMCxcbiAgICBSR0I1NjUgPSAxLFxuICAgIFJHQjg4OCA9IDIsXG4gICAgR1JBWVNDQUxFID0gNCxcbiAgICBZVVYgPSA4LFxuICAgIFJHQkE4ODg4ID0gMTYsXG4gICAgSU5ERVhFRCA9IDMyXG59XG5cbmV4cG9ydCBlbnVtIFRyYWNrYWJsZVJlc3VsdFN0YXR1cyB7XG4gICAgVW5rbm93biA9IDAsXG4gICAgVW5kZWZpbmVkID0gMSxcbiAgICBEZXRlY3RlZCA9IDIsXG4gICAgVHJhY2tlZCA9IDMsXG4gICAgRXh0ZW5kZWRUcmFja2VkID0gNFxufVxuXG5leHBvcnQgZW51bSBIaXRUZXN0SGludCB7XG4gICAgTm9uZSA9IDAsXG4gICAgSG9yaXpvbnRhbFBsYW5lID0gMSxcbiAgICBWZXJ0aWNhbFBsYW5lID0gMlxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQVBJQmFzZSBpbXBsZW1lbnRzIGRlZi5BUEkge1xuICAgIGFic3RyYWN0IHNldExpY2Vuc2VLZXkobGljZW5zZUtleTpzdHJpbmcpIDogYm9vbGVhbjtcbiAgICBhYnN0cmFjdCBzZXRIaW50KGhpbnQ6ZGVmLkhpbnQsdmFsdWU6bnVtYmVyKSA6IGJvb2xlYW47XG5cbiAgICBhYnN0cmFjdCBpbml0KCkgOiBQcm9taXNlPGRlZi5Jbml0UmVzdWx0PjtcbiAgICBhYnN0cmFjdCBkZWluaXQoKSA6IHZvaWQ7XG5cbiAgICBhYnN0cmFjdCBnZXRDYW1lcmFEZXZpY2UoKSA6IGRlZi5DYW1lcmFEZXZpY2U7XG4gICAgYWJzdHJhY3QgZ2V0RGV2aWNlKCkgOiBkZWYuRGV2aWNlO1xuICAgIGFic3RyYWN0IGdldFJlbmRlcmVyKCkgOiBkZWYuUmVuZGVyZXI7XG5cbiAgICBzbWFydFRlcnJhaW4/IDogZGVmLlNtYXJ0VGVycmFpbjtcbiAgICBhYnN0cmFjdCBpbml0U21hcnRUZXJyYWluKCkgOiBib29sZWFuO1xuICAgIGFic3RyYWN0IGRlaW5pdFNtYXJ0VGVycmFpbigpIDogYm9vbGVhbjtcblxuICAgIHBvc2l0aW9uYWxEZXZpY2VUcmFja2VyPyA6IGRlZi5Qb3NpdGlvbmFsRGV2aWNlVHJhY2tlcjtcbiAgICBhYnN0cmFjdCBpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW47XG4gICAgYWJzdHJhY3QgZGVpbml0UG9zaXRpb25hbERldmljZVRyYWNrZXIoKSA6IGJvb2xlYW47XG4gICAgXG4gICAgb2JqZWN0VHJhY2tlcj8gOiBkZWYuT2JqZWN0VHJhY2tlcjtcbiAgICBhYnN0cmFjdCBpbml0T2JqZWN0VHJhY2tlcigpIDogYm9vbGVhbjtcbiAgICBhYnN0cmFjdCBkZWluaXRPYmplY3RUcmFja2VyKCkgOiBib29sZWFuO1xuXG4gICAgYWJzdHJhY3Qgc2V0U2NhbGVGYWN0b3IoZjpudW1iZXIpO1xuICAgIGFic3RyYWN0IGdldFNjYWxlRmFjdG9yKCkgOiBudW1iZXI7IFxuICAgIGFic3RyYWN0IG9uU3VyZmFjZUNoYW5nZWQod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyKSA6IHZvaWQ7XG4gICAgXG4gICAgcHVibGljIHJlbmRlckNhbGxiYWNrPzooc3RhdGU6ZGVmLlN0YXRlKT0+dm9pZDtcbiAgICBwdWJsaWMgdXBkYXRlQ2FsbGJhY2s/OihzdGF0ZTpkZWYuU3RhdGUpPT52b2lkO1xuXG4gICAgZ2V0Vmlld2VyU2NhbGVGYWN0b3IoKSB7XG4gICAgICAgIC8vIHN0YXRpYyBjb25zdCBmbG9hdCBWSVJUVUFMX0ZPVl9ZX0RFR1MgPSA4NS4wZjtcblxuICAgICAgICAvLyBHZXQgdGhlIHktZGltZW5zaW9uIG9mIHRoZSBwaHlzaWNhbCBjYW1lcmEgZmllbGQgb2Ygdmlld1xuICAgICAgICBjb25zdCBjYW1lcmFDYWxpYnJhdGlvbiA9IHRoaXMuZ2V0Q2FtZXJhRGV2aWNlKCkuZ2V0Q2FtZXJhQ2FsaWJyYXRpb24oKTtcbiAgICAgICAgaWYgKCFjYW1lcmFDYWxpYnJhdGlvbikgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZ2V0IGNhbWVyYSBjYWxpYnJhdGlvbicpO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLmdldERldmljZSgpO1xuICAgICAgICBpZiAoIWRldmljZS5pc1ZpZXdlckFjdGl2ZSgpKSB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXdlciBpcyBub3QgYWN0aXZlJyk7XG5cbiAgICAgICAgY29uc3QgZm92ID0gY2FtZXJhQ2FsaWJyYXRpb24uZ2V0RmllbGRPZlZpZXdSYWRzKCk7XG4gICAgICAgIGNvbnN0IGNhbWVyYUZvdllSYWQgPSBmb3YueTtcbiAgICAgICAgY29uc3Qgdmlld2VyID0gZGV2aWNlLmdldFNlbGVjdGVkVmlld2VyKCk7XG4gICAgICAgIGlmICghdmlld2VyKSAgdGhyb3cgbmV3IEVycm9yKCdObyB2aWV3ZXIgaXMgc2VsZWN0ZWQnKTtcblxuICAgICAgICAvLyBHZXQgdGhlIHktZGltZW5zaW9uIG9mIHRoZSB2aXJ0dWFsIGNhbWVyYSBmaWVsZCBvZiB2aWV3XG4gICAgICAgIGNvbnN0IHZpZXdlckZPViA9IHZpZXdlci5nZXRGaWVsZE9mVmlldygpO1xuICAgICAgICBjb25zdCB2aWV3ZXJGT1Z5ID0gdmlld2VyRk9WLnkgKyB2aWV3ZXJGT1YuejtcbiAgICAgICAgY29uc3QgdmlydHVhbEZvdllSYWQgPSB2aWV3ZXJGT1Z5ICogTWF0aC5QSSAvIDE4MDtcbiAgICAgICAgLy8gICAgZmxvYXQgdmlydHVhbEZvdllSYWQgPSBWSVJUVUFMX0ZPVl9ZX0RFR1MgKiBNX1BJIC8gMTgwO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlIHZpZXdlci1zY2FsZSBmYWN0b3IgcmVwcmVzZW50cyB0aGUgcHJvcG9ydGlvbiBvZiB0aGUgdmlld3BvcnQgdGhhdCBpcyBmaWxsZWQgYnlcbiAgICAgICAgLy8gdGhlIHZpZGVvIGJhY2tncm91bmQgd2hlbiBwcm9qZWN0ZWQgb250byB0aGUgc2FtZSBwbGFuZS5cbiAgICAgICAgLy8gSW4gb3JkZXIgdG8gY2FsY3VsYXRlIHRoaXMsIGxldCAnZCcgYmUgdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIGNhbWVyYXMgYW5kIHRoZSBwbGFuZS5cbiAgICAgICAgLy8gVGhlIGhlaWdodCBvZiB0aGUgcHJvamVjdGVkIGltYWdlICdoJyBvbiB0aGlzIHBsYW5lIGNhbiB0aGVuIGJlIGNhbGN1bGF0ZWQ6XG4gICAgICAgIC8vICAgdGFuKGZvdi8yKSA9IGgvMmRcbiAgICAgICAgLy8gd2hpY2ggcmVhcnJhbmdlcyB0bzpcbiAgICAgICAgLy8gICAyZCA9IGgvdGFuKGZvdi8yKVxuICAgICAgICAvLyBTaW5jZSAnZCcgaXMgdGhlIHNhbWUgZm9yIGJvdGggY2FtZXJhcywgd2UgY2FuIGNvbWJpbmUgdGhlIGVxdWF0aW9ucyBmb3IgdGhlIHR3byBjYW1lcmFzOlxuICAgICAgICAvLyAgIGhQaHlzaWNhbC90YW4oZm92UGh5c2ljYWwvMikgPSBoVmlydHVhbC90YW4oZm92VmlydHVhbC8yKVxuICAgICAgICAvLyBXaGljaCByZWFycmFuZ2VzIHRvOlxuICAgICAgICAvLyAgIGhQaHlzaWNhbC9oVmlydHVhbCA9IHRhbihmb3ZQaHlzaWNhbC8yKS90YW4oZm92VmlydHVhbC8yKVxuICAgICAgICAvLyAuLi4gd2hpY2ggaXMgdGhlIHNjZW5lLXNjYWxlIGZhY3RvclxuICAgICAgICByZXR1cm4gTWF0aC50YW4oY2FtZXJhRm92WVJhZCAvIDIpIC8gTWF0aC50YW4odmlydHVhbEZvdllSYWQgLyAyKTtcbiAgICB9XG59XG4iXX0=