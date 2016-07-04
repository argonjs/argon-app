import * as application from "application";
import * as frames from 'ui/frame';
import * as vuforia from 'nativescript-vuforia';
import * as utils from 'utils/utils';
import * as enums from 'ui/enums';
import * as dialogs from 'ui/dialogs';
import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service';
import {getDisplayOrientation} from './argon-device-service'

import Argon = require("argon");

const Matrix4 = Argon.Cesium.Matrix4;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;

const ONE = new Cartesian3(1,1,1);

@Argon.DI.inject(
    Argon.SessionService,
    Argon.FocusService,
    Argon.ContextService,
    Argon.VuforiaServiceDelegate)
export class NativescriptViewService extends Argon.ViewService {
    constructor(
        sessionService: Argon.SessionService,
        focusService: Argon.FocusService,
        contextService: Argon.ContextService,
        private vuforiaDelegate: NativescriptVuforiaServiceDelegate) {
        super(undefined, sessionService, focusService, contextService);
    }

    public scaleFactor = 1;

    private scratchQuaternion = new Argon.Cesium.Quaternion();
	private scratchMatrix4 = new Argon.Cesium.Matrix4();
    private scratchFrustum = new Argon.Cesium.PerspectiveFrustum();
    private scratchArray = [];

    getMaximumViewport() {
        const contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        }
    }

    generateViewFromEyeParameters(eye: Argon.SerializedEyeParameters) : Argon.SerializedViewParameters {
        if (vuforia.api && vuforia.api.getDevice().isViewerActive()) {
            vuforia.api.setScaleFactor(vuforia.api.getViewerScaleFactor());
            return this.getVuforiaViewConfiguration(eye.pose);
        } else if (vuforia.api && !eye.fov) {
            // make sure the video is scaled as appropriate
            vuforia.api.setScaleFactor(this.scaleFactor);
            return this.getVuforiaViewConfiguration(eye.pose);
        }

        const fov = eye.fov || Math.PI/3;
        const viewport = this.getMaximumViewport();

        this.scratchFrustum.fov = fov;
        this.scratchFrustum.aspectRatio = viewport.width / viewport.height;
        this.scratchFrustum.near = 0.001;

        // const projectionMatrix = this.scratchFrustum.infiniteProjectionMatrix;
        const projectionMatrix = this.scratchFrustum.projectionMatrix;

        var scaleFactor = this.scaleFactor;
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

        const view: Argon.SerializedViewParameters = {
            viewport,
            pose: eye.pose,
            subviews: [
                {
                    type: Argon.SubviewType.SINGULAR,
                    projectionMatrix: Matrix4.toArray(projectionMatrix, this.scratchArray)
                }
            ]
        }

        return view;
    }

    getVuforiaViewConfiguration(pose: Argon.SerializedEntityPose) {
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
                Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -(CesiumMath.PI_OVER_TWO + getDisplayOrientation() * Math.PI / 180), this.scratchQuaternion),
                ONE,
                this.scratchMatrix4
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

            const viewport = renderingPrimitives.getViewport(view);

            subviews.push({
                type,
                projectionMatrix: Matrix4.toArray(projectionMatrix, this.scratchArray),
                viewport: {
                    x: viewport.x / contentScaleFactor,
                    y: viewport.y / contentScaleFactor,
                    width: viewport.z / contentScaleFactor,
                    height: viewport.w / contentScaleFactor
                }
            });
        }

        // We expect the video view (managed by the browser view) to be the 
        // same size as the current page's content view.
        const contentView = frames.topmost().currentPage.content;

        // construct the final view parameters for this frame
        const view: Argon.SerializedViewParameters = {
            viewport: {
                x: 0,
                y: 0,
                width: contentView.getMeasuredWidth(),
                height: contentView.getMeasuredHeight()
            },
            pose,
            subviews
        }

        return view;
    }
}