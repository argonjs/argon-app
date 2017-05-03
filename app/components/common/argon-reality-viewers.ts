import * as Argon from '@argonjs/argon';
import * as vuforia from 'nativescript-vuforia';
import * as enums from 'ui/enums';

import {ArgonWebView, SessionEventData} from 'argon-web-view';
import {NativescriptVuforiaServiceProvider} from './argon-vuforia-provider';

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

@Argon.DI.autoinject
export class NativescriptLiveRealityViewer extends Argon.LiveRealityViewer {

    public videoView = vuforia.videoView;

    constructor(
        sessionService: Argon.SessionService,
        viewService: Argon.ViewService,
        private _contextService: Argon.ContextService,
        private _deviceService: Argon.DeviceService,
        private _vuforiaServiceProvider: Argon.VuforiaServiceProvider,
        uri:string) {
            super(sessionService, viewService, _deviceService, uri);
    }

    private _zoomFactor = 1;
    private _pinchStartZoomFactor:number;
    
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
        if (!uievent.touches) return;

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
                    scale: this._currentPinchDistance / this._startPinchDistance
                });
            }
        } else {
            if (this._startPinchDistance !== undefined && this._currentPinchDistance !== undefined) {
                this._handlePinchGestureEventData(<PinchGestureEventData>{
                    state: GestureStateTypes.ended,
                    scale: this._currentPinchDistance / this._startPinchDistance
                });
                this._startPinchDistance = undefined;
                this._currentPinchDistance = undefined;
            }
        }
    }

    // private _scratchFrustum = new Argon.Cesium.PerspectiveFrustum;
    private _effectiveZoomFactor:number;
    setupInternalSession(session:Argon.SessionPort) {
        super.setupInternalSession(session);

        console.log("Setting up Vuforia viewer session");

        vuforia.videoView.parent.on(GestureTypes.pinch, this._handlePinchGestureEventData, this);

        session.on['ar.view.uievent'] = (uievent:DOMTouchEvent) => { 
            this._handleForwardedDOMTouchEventData(uievent);
        };

        const subviews:Argon.SerializedSubviewList = [];

        const frameStateOptions = {
            overrideUser: true
        }

        const remove = this._deviceService.frameStateEvent.addEventListener((frameState)=>{
            if (!session.isConnected) return;

            const deviceService = this._deviceService;
            if (deviceService.geolocationDesired) {
                deviceService.subscribeGeolocation(deviceService.geolocationOptions, session);
            } else {
                deviceService.unsubscribeGeolocation(session);
            }

            Argon.SerializedSubviewList.clone(frameState.subviews, subviews);

            if (!deviceService.strict) {
                this._effectiveZoomFactor = Math.abs(this._zoomFactor - 1) < 0.05 ? 1 : this._zoomFactor;
                for (const s of subviews) {
                    // const frustum = Argon.decomposePerspectiveProjectionMatrix(s.projectionMatrix, this._scratchFrustum);
                    // frustum.fov = 2 * Math.atan(Math.tan(frustum.fov * 0.5) / this._effectiveZoomFactor);
                    // Argon.Cesium.Matrix4.clone(frustum.projectionMatrix, s.projectionMatrix);
                    s.projectionMatrix[0] *= this._effectiveZoomFactor;
                    s.projectionMatrix[1] *= this._effectiveZoomFactor;
                    s.projectionMatrix[2] *= this._effectiveZoomFactor;
                    s.projectionMatrix[3] *= this._effectiveZoomFactor;
                    s.projectionMatrix[4] *= this._effectiveZoomFactor;
                    s.projectionMatrix[5] *= this._effectiveZoomFactor;
                    s.projectionMatrix[6] *= this._effectiveZoomFactor;
                    s.projectionMatrix[7] *= this._effectiveZoomFactor;
                }
            } else {
                this._effectiveZoomFactor = 1;
            }

            // apply the projection scale
            vuforia.api && vuforia.api.setScaleFactor(this._effectiveZoomFactor);

            // configure video
            const viewport = frameState.viewport;
            vuforia.api && (this._vuforiaServiceProvider as NativescriptVuforiaServiceProvider)
                .configureVuforiaVideoBackground(viewport, this.isPresenting);
            
            if (!this.isPresenting) return;

            try {
                const contextUser = this._contextService.user;
                const deviceUser = this._deviceService.user;
                (contextUser.position as Argon.Cesium.ConstantPositionProperty).setValue(Argon.Cesium.Cartesian3.ZERO, deviceUser);
                (contextUser.orientation as Argon.Cesium.ConstantProperty).setValue(Argon.Cesium.Quaternion.IDENTITY);

                const contextFrameState = this._deviceService.createContextFrameState(
                    frameState.time,
                    frameState.viewport,
                    subviews,
                    frameStateOptions
                );
                session.send('ar.reality.frameState', contextFrameState);
            } catch(e) {
                console.error(e);
            }
        });

        session.closeEvent.addEventListener(()=>{
            remove();
        })
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