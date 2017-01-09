import * as Argon from '@argonjs/argon';
import * as vuforia from 'nativescript-vuforia';
import * as enums from 'ui/enums';
import {AbsoluteLayout} from 'ui/layouts/absolute-layout';
import {ArgonWebView, SessionEventData} from 'argon-web-view';
import {vuforiaCameraDeviceMode} from './argon-device-service';
import {NativescriptVuforiaServiceDelegate} from './argon-vuforia-service';
import {getDisplayOrientation} from './util';

import {
  GestureTypes,
  GestureStateTypes,
  PinchGestureEventData
} from 'ui/gestures';


interface DOMTouch {
    readonly clientX: number;
    readonly clientY: number;
    readonly identifier: number;
    readonly pageX: number;
    readonly pageY: number;
    readonly screenX: number;
    readonly screenY: number;
}

interface DOMTouchEvent {
    type:string,
    touches:Array<DOMTouch>, 
    changedTouches:Array<DOMTouch>
}

@Argon.DI.inject(
    Argon.SessionService, 
    Argon.ViewService, 
    Argon.DeviceService,
    Argon.VuforiaServiceDelegate
)
export class NativescriptLiveRealityViewer extends Argon.LiveRealityViewer {

    public videoView = vuforia.videoView;

    constructor(
        sessionService: Argon.SessionService,
        viewService: Argon.ViewService,
        private _deviceService: Argon.DeviceService,
        private _vuforiaDelegate: NativescriptVuforiaServiceDelegate,
        uri:string) {
            super(sessionService, viewService, _deviceService, uri);

            this.presentChangeEvent.addEventListener(()=>{
                this.videoView.visibility = this.isPresenting ? enums.Visibility.visible : enums.Visibility.collapse;
            });
    }

    private _zoomFactor = 1;
    private _pinchStartZoomFactor?:number;
    
    private _handlePinchGestureEventData(data: PinchGestureEventData) {
        switch (data.state) {
            case GestureStateTypes.began: 
                this._pinchStartZoomFactor = this._zoomFactor;
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;
            case GestureStateTypes.changed: 
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;
            case GestureStateTypes.ended:
            case GestureStateTypes.cancelled:
            default:
                this._zoomFactor = this._pinchStartZoomFactor * data.scale;
                break;  
        }
    }

    private _startPinchDistance?:number;
    private _currentPinchDistance?:number;
    private _scratchTouchPos1 = new Argon.Cesium.Cartesian2;
    private _scratchTouchPos2 = new Argon.Cesium.Cartesian2;

    private _handleForwardedDOMTouchEventData(uievent: DOMTouchEvent) {
        if (uievent.touches.length == 2) {
            this._scratchTouchPos1.x = uievent.touches[0].clientX;
            this._scratchTouchPos1.y = uievent.touches[0].clientY;
            this._scratchTouchPos2.x = uievent.touches[1].clientX;
            this._scratchTouchPos2.y = uievent.touches[1].clientY;
            const dist = Argon.Cesium.Cartesian2.distanceSquared(this._scratchTouchPos1, this._scratchTouchPos2);

            if (this._startPinchDistance === undefined) {
                this._startPinchDistance = dist;
                this._handlePinchGestureEventData(<PinchGestureEventData>{
                    state: GestureStateTypes.began,
                    scale: 1
                });
            } else {
                this._currentPinchDistance = dist;
                this._handlePinchGestureEventData(<PinchGestureEventData>{
                    state: GestureStateTypes.changed,
                    scale: this._startPinchDistance / this._currentPinchDistance
                });
            }
        } else {
            if (this._startPinchDistance !== undefined) {
                this._handlePinchGestureEventData(<PinchGestureEventData>{
                    state: GestureStateTypes.ended,
                    scale: this._startPinchDistance / this._currentPinchDistance
                });
                this._startPinchDistance = undefined;
                this._currentPinchDistance = undefined;
            }
        }
    }

    private _scratchFrustum = new Argon.Cesium.PerspectiveFrustum;
    private _effectiveZoomFactor:number;

    setupInternalSession(session:Argon.SessionPort) {
        super.setupInternalSession(session);

        vuforia.videoView.on(GestureTypes.pinch, this._handlePinchGestureEventData, this);

        session.on['ar.view.uievent'] = (uievent:DOMTouchEvent) => { 
            this._handleForwardedDOMTouchEventData(uievent);
        };

        const subviews:Argon.SerializedSubviewList = [];

        const remove = this._vuforiaDelegate.stateUpdateEvent.addEventListener((time)=>{
            if (this.isPresenting) {
                const device = this._deviceService;
                device.update();

                Argon.SerializedSubviewList.clone(device.subviews, subviews);
                if (!subviews.length) return;

                if (!device.strictSubviews) {
                    this._effectiveZoomFactor = Math.abs(this._zoomFactor - 1) < 0.05 ? 1 : this._zoomFactor;
                    for (const s of subviews) {
                        const frustum = Argon.decomposePerspectiveProjectionMatrix(s.projectionMatrix, this._scratchFrustum);
                        frustum.fov = 2 * Math.atan(Math.tan(frustum.fov * 0.5) / this._effectiveZoomFactor);
                        Argon.Cesium.Matrix4.clone(frustum.projectionMatrix, s.projectionMatrix);
                    }
                } else {
                    this._effectiveZoomFactor = 1;
                }

                // apply the projection scale
                vuforia.api.setScaleFactor(this._effectiveZoomFactor);

                // configure video
                this.configureVuforiaVideoBackground(device.viewport);

                const viewState:Argon.ViewState = {
                    time,
                    subviews,
                    pose: Argon.getSerializedEntityPose(this._deviceService.eye, time),
                    viewport: device.viewport,
                    compassAccuracy: device.compassAccuracy,
                    verticalAccuracy: device.verticalAccuracy,
                    horizontalAccuracy: device.horizontalAccuracy
                }
                session.send('ar.reality.viewState', viewState);
            }
        });

        session.closeEvent.addEventListener(()=>remove());
    }

    private _lastViewportState?:Argon.Viewport;
    private _lastEnabledState = false;

    private configureVuforiaVideoBackground(viewport:Argon.Viewport) {

        const enabled = this.isPresenting;

        if (viewport && this._lastViewportState && 
            this._lastViewportState.x == viewport.x &&
            this._lastViewportState.y == viewport.y &&
            this._lastViewportState.width == viewport.width &&
            this._lastViewportState.height == viewport.height &&
            this._lastEnabledState == enabled) return; // already configured

        this._lastViewportState = Argon.Viewport.clone(viewport, this._lastViewportState);
        this._lastEnabledState = enabled;

        const viewWidth = viewport.width;
        const viewHeight = viewport.height;

        const videoView = vuforia.videoView;
        AbsoluteLayout.setLeft(videoView, viewport.x);
        AbsoluteLayout.setTop(videoView, viewport.y);
        videoView.width = viewWidth;
        videoView.height = viewHeight;
        
        const cameraDevice = vuforia.api.getCameraDevice();
        const videoMode = cameraDevice.getVideoMode(vuforiaCameraDeviceMode);
        let videoWidth = videoMode.width;
        let videoHeight = videoMode.height;
        
        const orientation = getDisplayOrientation();
        if (orientation === 0 || orientation === 180) {
            videoWidth = videoMode.height;
            videoHeight = videoMode.width;
        }
        
        const widthRatio = viewWidth / videoWidth;
        const heightRatio = viewHeight / videoHeight;
        // aspect fill
        const scale = Math.max(widthRatio, heightRatio);
        // aspect fit
        // const scale = Math.min(widthRatio, heightRatio);

        const contentScaleFactor = videoView.ios ? videoView.ios.contentScaleFactor : 1;
        
        // apply the video config
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



Argon.DI.inject(Argon.SessionService, Argon.ViewService, )
export class NativescriptHostedRealityViewer extends Argon.HostedRealityViewer {

    public webView = new ArgonWebView;

    constructor(sessionService, viewService, public uri:string) {
        super(sessionService, viewService, uri);
             
        if (this.webView.ios) {
            // disable user navigation of the reality view
            (this.webView.ios as WKWebView).allowsBackForwardNavigationGestures = false;
        }

        this.webView.on('session', (data:SessionEventData)=>{
            const session = data.session;
            session.connectEvent.addEventListener(() => {
                this.connectEvent.raiseEvent(session);
            });
        });

        this.presentChangeEvent.addEventListener(()=>{
            this.webView.visibility = this.isPresenting ? enums.Visibility.visible : enums.Visibility.collapse;
        });
    }
    
    load():void {
        const url:string = this.uri;
        const webView = this.webView;
        if (webView.src === url) webView.reload();
        else webView.src = url;
    }

    destroy() {
        this.webView.session && this.webView.session.close();
    }
};