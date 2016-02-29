import application = require("application");
import frames = require('ui/frame');
import platform = require("platform");
import geolocation = require('nativescript-geolocation');
import vuforia = require('nativescript-vuforia')

import Argon = require("argon");

const JulianDate = Argon.Cesium.JulianDate;
const Cartesian3 = Argon.Cesium.Cartesian3;
const Quaternion = Argon.Cesium.Quaternion;
const CesiumMath = Argon.Cesium.CesiumMath;
const Transforms = Argon.Cesium.Transforms;
const Matrix4    = Argon.Cesium.Matrix4;
const Matrix3    = Argon.Cesium.Matrix3;

const z90 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);

export let iosSystemBootDate = Argon.Cesium.JulianDate.now();

if (vuforia.ios) {
    iosSystemBootDate = Argon.Cesium.JulianDate.fromDate(new Date(vuforia.ios.boottime().sec*1000));
} else { // less accurate way to determine bootdate
    const uptime = NSProcessInfo.processInfo().systemUptime;
    JulianDate.addSeconds(iosSystemBootDate, -uptime, iosSystemBootDate);   
}

export class NativeScriptDeviceService extends Argon.DeviceService {
	
	private scratchTime = new JulianDate(0,0);
    private scratchCartesian3 = new Cartesian3;
	private scratchQuaternion = new Quaternion;
	private scratchECEFQuaternion = new Quaternion;
	private scratchMatrix4 = new Matrix4;
	private scratchMatrix3 = new Matrix3;
    
    private iosLocationManager:CLLocationManager;
	private iosMotionManager:CMMotionManager;
	
	constructor() {
        super();
        
        application.on(application.orientationChangedEvent, () => {
            const frame = frames.topmost();
            Promise.resolve().then(()=>{
                this.viewSize = {
                    width: frame.getMeasuredWidth(),
                    height: frame.getMeasuredHeight()
                }  
            })
        })
        
		if (application.ios) {
            
            const locationAuthStatus = CLLocationManager.authorizationStatus();
            this.iosLocationManager = CLLocationManager.alloc().init();
                        
            switch (locationAuthStatus) {
                case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined: 
                    this.iosLocationManager.requestWhenInUseAuthorization();
                    break;
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways:
                case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse: break;
                default: // TODO: alert saying Argon needs location services, and instructing user to to enable them
            }

            this.iosLocationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation;
            this.iosLocationManager.distanceFilter = kCLDistanceFilterNone;
			this.iosLocationManager.startUpdatingLocation();
			
			this.iosMotionManager = CMMotionManager.alloc().init();
			this.iosMotionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
			let effectiveReferenceFrame:CMAttitudeReferenceFrame;
			if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
				effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
			} else {
				effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXArbitraryCorrectedZVertical;
			}
			this.iosMotionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
		}
	}
    
    private _iosInverseInterfaceRotation = new Quaternion;
    
    get iosInverseInterfaceRotation() {
        const controller = <UIViewController>application.ios.rootController;
        const interfaceOrientation = controller.interfaceOrientation;
        
        switch (interfaceOrientation) {
            case UIInterfaceOrientation.UIInterfaceOrientationUnknown : 
            case UIInterfaceOrientation.UIInterfaceOrientationPortrait : 
                Quaternion.IDENTITY.clone(this._iosInverseInterfaceRotation); 
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationPortraitUpsideDown : 
                Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI, this._iosInverseInterfaceRotation);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeLeft : 
                Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO, this._iosInverseInterfaceRotation);
                break;
            case UIInterfaceOrientation.UIInterfaceOrientationLandscapeRight : 
                Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -CesiumMath.PI_OVER_TWO, this._iosInverseInterfaceRotation);
                break;
        }
        
        return this._iosInverseInterfaceRotation;
    }
	
	public getDevicePose(time:Argon.Cesium.JulianDate) : Argon.EntityPose {
        
		if (application.ios) {
			
			const motion = this.iosMotionManager.deviceMotion;
			const location = this.iosLocationManager.location;
            
            let position:Argon.Cesium.Cartesian3; 
			
			if (location) {
				const lat = location.coordinate.latitude;
				const lon = location.coordinate.longitude;
				const height = location.altitude;
                
				const locationDate = <Date><any>location.timestamp; // {N} is auto-marshalling from NSDate to Date here
				const locationTime = Argon.Cesium.JulianDate.fromDate(locationDate, this.scratchTime);
				
				const sampledPosition = this.device.position as Argon.Cesium.SampledPositionProperty;
                position =  Argon.Cesium.Cartesian3.fromDegrees(lon, lat, height, undefined, this.scratchCartesian3);
				sampledPosition.addSample(locationTime, position);
			}
			
			if (motion && position) {
				const motionQuaternion = <Argon.Cesium.Quaternion>this.iosMotionManager.deviceMotion.attitude.quaternion;
				const motionTimestamp = this.iosMotionManager.deviceMotion.timestamp; // this timestamp is in seconds, not an NSDate object
				const motionTime = JulianDate.addSeconds(iosSystemBootDate, motionTimestamp, this.scratchTime);
				
                // Apple's orientation is reported in NWU, so convert to ENU
				const orientation = Quaternion.multiply(z90, motionQuaternion, this.scratchQuaternion);
                
				// Finally, convert from local ENU to ECEF (Earth-Centered-Earth-Fixed)
				const enu2ecef = Transforms.eastNorthUpToFixedFrame(position, undefined, this.scratchMatrix4);
				const enu2ecefRot = Matrix4.getRotation(enu2ecef, this.scratchMatrix3);
				const enu2ecefQuat = Quaternion.fromRotationMatrix(enu2ecefRot, this.scratchECEFQuaternion);
				Quaternion.multiply(enu2ecefQuat, orientation, orientation);
                
				const sampledOrientation = this.device.orientation as Argon.Cesium.SampledProperty;
				sampledOrientation.addSample(motionTime, orientation);
			}
		
		}
		
		return super.getDevicePose(time);
	}
    
    public getEyePose(time:Argon.Cesium.JulianDate) : Argon.EntityPose {
        const orientation = vuforia.getInterfaceOrientation();
        const orientationRad = Argon.Cesium.CesiumMath.toRadians(orientation);
        
        const orientationProperty = this.eye.orientation as Argon.Cesium.ConstantProperty;
        orientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, orientationRad));
        
        return super.getEyePose(time);
    }
	
	public getCameraState() : Argon.CameraState {
        const frame = frames.topmost();
        const width = frame.getMeasuredWidth();
        const height = frame.getMeasuredHeight();
        const videoBackgroundConfig = vuforia.getVideoBackgroundConfig();
		const cameraCalibration = vuforia.getCameraCalibration();
        
        // calculate the fov for the target region of the screen
        const widthRatio = (width / videoBackgroundConfig.sizeX);
        const heightRatio = (height / videoBackgroundConfig.sizeY);
        const renderfovX = 2 * Math.atan( Math.tan(cameraCalibration.fieldOfViewRadX * 0.5) * widthRatio );
        const renderfovY = 2 * Math.atan( Math.tan(cameraCalibration.fieldOfViewRadY * 0.5) * heightRatio );
        
        const dX = cameraCalibration.principalPointX - cameraCalibration.sizeX/2;
        const dY = cameraCalibration.principalPointY - cameraCalibration.sizeY/2;
        
		const cameraState:Argon.CameraState = {
			type: 'perspective',
            fovX: renderfovX,
            fovY: renderfovY,
            xOffset: videoBackgroundConfig.positionX + dX,
            yOffset: videoBackgroundConfig.positionY + dY
		}
        
        return cameraState;
	}
    
    public getViewSize() : {width:number, height:number} {
        const frame = frames.topmost();
        return {
            width: frame.getMeasuredWidth(),
            height: frame.getMeasuredHeight()
        }
    }
	
	public defaultReality = {type: 'vuforia'};
}