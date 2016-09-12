import * as application from "application";
import * as vuforia from 'nativescript-vuforia';
import * as utils from 'utils/utils';
import * as enums from 'ui/enums';
import * as frames from 'ui/frame';
import * as platform from 'platform';
import {AbsoluteLayout} from 'ui/layouts/absolute-layout';
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

export const vuforiaCameraDeviceMode:vuforia.CameraDeviceMode = vuforia.CameraDeviceMode.OpimizeQuality;
if (vuforia.videoView.ios) {
    (<UIView>vuforia.videoView.ios).contentScaleFactor = 
        vuforiaCameraDeviceMode === <vuforia.CameraDeviceMode> vuforia.CameraDeviceMode.OptimizeSpeed ? 
        1 : platform.screen.mainScreen.scale;
}

@Argon.DI.inject(
    Argon.SessionService,
    Argon.FocusService)
export class NativescriptRealityService extends Argon.RealityService {
    constructor(
        sessionService: Argon.SessionService,
        focusService: Argon.FocusService) {
        super(sessionService, focusService);
    }

    getMaximumViewport() {
        const contentView = frames.topmost().currentPage.content;
        return {
            x: 0,
            y: 0,
            width: contentView.getMeasuredWidth(),
            height: contentView.getMeasuredHeight()
        }
    }

    onGenerateViewFromEyeParameters(eye: Argon.SerializedEyeParameters) : Argon.SerializedViewParameters {
        if (vuforia.api) {
            if (vuforia.api.getDevice().isViewerActive()) {
                eye.viewport = this.getMaximumViewport();
                vuforia.api.setScaleFactor(vuforia.api.getViewerScaleFactor());
            } else {
                eye.viewport = eye.viewport || this.getMaximumViewport();
                // convert our desired fov to the scale factor
                const desiredFov = eye.fov || this.getDesiredFov() || this.getDefaultFov();
                const defaultFov = this.getDefaultFov();
                const desiredHalfLength = Math.tan(0.5*desiredFov);
                const defaultHalfLength = Math.tan(0.5*defaultFov);
                const scaleFactor =  defaultHalfLength / desiredHalfLength;
                // make sure the video is scaled as appropriate
                vuforia.api.setScaleFactor(scaleFactor);
            }
            // update the videoView       
            this.configureVuforiaVideoBackground(eye.viewport);
            // compute the vuforia-based view configuraiton
            return this.getVuforiaViewConfiguration(eye);
        }
        return super.onGenerateViewFromEyeParameters(eye);
    }

    getVuforiaViewConfiguration(eye: Argon.SerializedEyeParameters) {
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
        const view: Argon.SerializedViewParameters = {
            viewport: <Argon.Viewport>eye.viewport,
            pose: eye.pose,
            subviews
        }

        return view;
    }

    previousViewport:Argon.Viewport;

    configureVuforiaVideoBackground(viewport?:Argon.Viewport, enabled=true) {

        if (viewport && this.previousViewport && 
            this.previousViewport.x == viewport.x &&
            this.previousViewport.y == viewport.y &&
            this.previousViewport.width == viewport.width &&
            this.previousViewport.height == viewport.height) return;

        if (viewport) 
            this.previousViewport = viewport;
        else 
            viewport = this.previousViewport;

        if (!viewport) return;

        const videoView = vuforia.videoView;
        AbsoluteLayout.setLeft(videoView, viewport.x);
        AbsoluteLayout.setTop(videoView, viewport.y);
        videoView.width = viewport.width;
        videoView.height = viewport.height;

        const viewWidth = viewport.width;
        const viewHeight = viewport.height;
        const contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : 1;
        
        const cameraDevice = vuforia.api.getCameraDevice();
        const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode);
        let videoWidth = videoMode.width;
        let videoHeight = videoMode.height;

        const cameraCalibration = cameraDevice.getCameraCalibration();
        const videoFovs = cameraCalibration.getFieldOfViewRads();
        let videoFovX = videoFovs.x;
        let videoFovY = videoFovs.y;
        
        const orientation = getDisplayOrientation();
        if (orientation === 0 || orientation === 180) {
            videoWidth = videoMode.height;
            videoHeight = videoMode.width;
            videoFovX = videoFovs.y;
            videoFovY = videoFovs.x;
        }
        
        const widthRatio = viewWidth / videoWidth;
        const heightRatio = viewHeight / videoHeight;
        // aspect fill
        const scale = Math.max(widthRatio, heightRatio);
        // aspect fit
        // const scale = Math.min(widthRatio, heightRatio);

        // Tell the reality service what our default fov should be based on 
        // the video background configuration we have chosen
        const aspectRatio = viewWidth / viewHeight;
        if (widthRatio > heightRatio) {
            const viewFovX = videoFovX;
            if (aspectRatio > 1) {
                this.setDefaultFov(viewFovX);
            } else {
                const viewFovY = 2 * Math.atan(Math.tan(0.5 * viewFovX) / aspectRatio);
                this.setDefaultFov(viewFovY);
            }
        } else {
            const viewFovY = videoFovY;
            if (aspectRatio > 1) {
                const viewFovX = 2 * Math.atan(Math.tan(0.5 * viewFovY) * aspectRatio);
                this.setDefaultFov(viewFovX);
            } else {
                this.setDefaultFov(viewFovY);
            }
        }
        
        const config = {
            enabled,
            positionX:0,
            positionY:0,
            sizeX: videoWidth * scale * contentScaleFactor,
            sizeY: videoHeight * scale * contentScaleFactor,
            reflection: vuforia.VideoBackgroundReflection.Default
        }
        
        console.log(`Vuforia configuring video background...
            contentScaleFactor: ${contentScaleFactor} orientation: ${orientation} 
            viewWidth: ${viewWidth} viewHeight: ${viewHeight} videoWidth: ${videoWidth} videoHeight: ${videoHeight} 
            config: ${JSON.stringify(config)}
        `);
        
        vuforia.api.getRenderer().setVideoBackgroundConfig(config);
        vuforia.api.onSurfaceChanged(
            viewWidth * contentScaleFactor, 
            viewHeight * contentScaleFactor
        );
    }
}