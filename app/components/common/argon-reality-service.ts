import * as application from "application";
import * as vuforia from 'nativescript-vuforia';
import * as utils from 'utils/utils';
import * as enums from 'ui/enums';
import {getDisplayOrientation} from './argon-device-service'

import * as Argon from "@argonjs/argon";

const Matrix4 = Argon.Cesium.Matrix4;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;

const scratchQuaternion = new Argon.Cesium.Quaternion();
const scratchMatrix4 = new Argon.Cesium.Matrix4();
const scratchArray = [];
const scratchFrustum = new Argon.Cesium.PerspectiveFrustum();

const ONE = new Cartesian3(1,1,1);

@Argon.DI.inject(
    Argon.SessionService,
    Argon.FocusService)
export class NativescriptRealityService extends Argon.RealityService {
    constructor(
        sessionService: Argon.SessionService,
        focusService: Argon.FocusService) {
        super(sessionService, focusService);
    }

    onGenerateViewFromEyeParameters(eye: Argon.DeprecatedEyeParameters, time:Argon.Cesium.JulianDate) : Argon.ViewState|undefined {
        if (vuforia.api) {
            if (vuforia.api.getDevice().isViewerActive()) {
                eye.viewport = Argon.ArgonSystem.instance!.device.state.viewport;
                vuforia.api.setScaleFactor(vuforia.api.getViewerScaleFactor());
            } else {
                eye.viewport = eye.viewport || Argon.ArgonSystem.instance!.device.state.viewport;
                // convert our desired fov to the scale factor
                const desiredFov = eye.fov || Argon.ArgonSystem.instance!.device.state.subviews[0].frustum.fov;
                const defaultFov = Argon.ArgonSystem.instance!.device.state.defaultFov;
                const desiredHalfLength = Math.tan(0.5*desiredFov);
                const defaultHalfLength = Math.tan(0.5*defaultFov);
                const scaleFactor =  defaultHalfLength / desiredHalfLength;
                // make sure the video is scaled as appropriate
                vuforia.api.setScaleFactor(scaleFactor);
            }
            // update the videoView       
            Argon.ArgonSystem.instance!.device['configureVuforiaVideoBackground'](eye.viewport);
            // compute the vuforia-based view configuraiton
            return this.getVuforiaViewConfiguration(eye, time);
        }
        return super.onGenerateViewFromEyeParameters(eye, time);
    }

    getVuforiaViewConfiguration(eye: Argon.DeprecatedEyeParameters, time:Argon.Cesium.JulianDate) : Argon.ViewState {
        const device = vuforia.api.getDevice();
        const renderingPrimitives = device.getRenderingPrimitives();
        const renderingViews = renderingPrimitives.getRenderingViews();
        const numViews = renderingViews.getNumViews()

        const subviews = <Array<Argon.SerializedSubview>>[];
        const contentScaleFactor = (<UIView>vuforia.videoView.ios).contentScaleFactor;

        for (let i = 0; i < numViews; i++) {
            const view = renderingViews.getView(i);
            if (view === vuforia.View.PostProcess) continue;

            let type: Argon.SubviewType;
            switch (view) {
                case vuforia.View.LeftEye:
                    type = Argon.SubviewType.LEFTEYE; break;
                case vuforia.View.RightEye:
                    type = Argon.SubviewType.RIGHTEYE; break;
                case vuforia.View.Singular:
                    type = Argon.SubviewType.SINGULAR; break;
                default:
                    type = Argon.SubviewType.OTHER; break;
            }

            // Note: Vuforia uses a right-handed projection matrix with x to the right, y down, and z as the viewing direction.
            // So we are converting to a more standard convention of x to the right, y up, and -z as the viewing direction. 
            let projectionMatrix = <any>renderingPrimitives.getProjectionMatrix(view, vuforia.CoordinateSystemType.Camera);
            renderingPrimitives.getEyeDisplayAdjustmentMatrix

            // const eyeAdjustmentMatrix = renderingPrimitives.getEyeDisplayAdjustmentMatrix(view);
            // let projectionMatrix = Argon.Cesium.Matrix4.multiply(rawProjectionMatrix, eyeAdjustmentMatrix, []);
            // projectionMatrix = Argon.Cesium.Matrix4.fromRowMajorArray(projectionMatrix, projectionMatrix);

            // Undo the video rotation since we already encode the interface orientation in our view pose
            // Note: the "base" rotation vuforia's video (at least on iOS) is the landscape right orientation,
            // this is the orientation where the device is held in landscape with the home button on the right. 
            // This "base" video rotatation is -90 deg around +z from the portrait interface orientation
            // So, we want to undo this rotation which vuforia applies for us.  
            // TODO: calculate this matrix only when we have to (when the interface orientation changes)
            const inverseVideoRotationMatrix = Matrix4.fromTranslationQuaternionRotationScale(
                Cartesian3.ZERO,
                Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + getDisplayOrientation() * Math.PI / 180), scratchQuaternion),
                ONE,
                scratchMatrix4
            );
            Argon.Cesium.Matrix4.multiply(projectionMatrix, inverseVideoRotationMatrix, projectionMatrix);

            // convert from the vuforia projection matrix (+X -Y +X) to a more standard convention (+X +Y -Z)
            // by negating the appropriate rows. 
            // See https://developer.vuforia.com/library/articles/Solution/How-To-Use-the-Camera-Projection-Matrix

            // flip y axis so it is positive
            projectionMatrix[4] *= -1; // x
            projectionMatrix[5] *= -1; // y
            projectionMatrix[6] *= -1; // z
            projectionMatrix[7] *= -1; // w
            // flip z axis so it is negative
            projectionMatrix[8] *= -1;  // x
            projectionMatrix[9] *= -1;  // y
            projectionMatrix[10] *= -1; // z
            projectionMatrix[11] *= -1; // w

            var scaleFactor = vuforia.api.getScaleFactor();

            // scale x-axis
            projectionMatrix[0] *= scaleFactor; // x
            projectionMatrix[1] *= scaleFactor; // y
            projectionMatrix[2] *= scaleFactor; // z
            projectionMatrix[3] *= scaleFactor; // w
            // scale y-axis
            projectionMatrix[4] *= scaleFactor; // x
            projectionMatrix[5] *= scaleFactor; // y
            projectionMatrix[6] *= scaleFactor; // z
            projectionMatrix[7] *= scaleFactor; // w

            const vuforiaViewport = renderingPrimitives.getViewport(view);
            const viewport = {
                x: vuforiaViewport.x / contentScaleFactor,
                y: vuforiaViewport.y / contentScaleFactor,
                width: vuforiaViewport.z / contentScaleFactor,
                height: vuforiaViewport.w / contentScaleFactor
            };

            const frustum = Argon.decomposePerspectiveProjectionMatrix(projectionMatrix, scratchFrustum);

            subviews.push({
                type,
                frustum: {
                    fov: frustum.fov,
                    aspectRatio: frustum.aspectRatio,
                    xOffset: frustum.xOffset,
                    yOffset: frustum.yOffset
                },
                projectionMatrix: Matrix4.toArray(projectionMatrix, []),
                viewport
            });
        }

        // construct the final view parameters for this frame
        return {
            time,
            viewport: <Argon.Viewport>eye.viewport,
            pose: eye.pose,
            subviews,
            geolocationAccuracy: undefined,
            geolocationAltitudeAccuracy: undefined
        };
    }

}