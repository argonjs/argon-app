import application = require("application");
import frames = require('ui/frame');
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
} else if (application.ios) { // less accurate way to determine bootdate
    const uptime = NSProcessInfo.processInfo().systemUptime;
    JulianDate.addSeconds(iosSystemBootDate, -uptime, iosSystemBootDate);   
}

const scratchTime = new JulianDate(0,0);
const scratchCartesian3 = new Cartesian3;
const scratchQuaternion = new Quaternion;
const scratchECEFQuaternion = new Quaternion;
const scratchMatrix4 = new Matrix4;
const scratchMatrix3 = new Matrix3;

// if we don't export these (or keep a reference to them somewhere),
// then ios will derefence them and cause a huge memory leak
let iosLocationManager:CLLocationManager;
let iosMotionManager:CMMotionManager;

function getIosLocationManager() {
    if (iosLocationManager) return iosLocationManager;
    
    console.log("Create ios location manager.")
    
    const locationAuthStatus = CLLocationManager.authorizationStatus();
    iosLocationManager = CLLocationManager.alloc().init();
                
    switch (locationAuthStatus) {
        case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined: 
            iosLocationManager.requestWhenInUseAuthorization();
            break;
        case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways:
        case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse: break;
        default: // TODO: alert saying Argon needs location services, and instructing user to to enable them
    }

    iosLocationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation;
    iosLocationManager.distanceFilter = kCLDistanceFilterNone;
    iosLocationManager.startUpdatingLocation();
}

function getIosMotionManager() { 
    if (iosMotionManager) return iosMotionManager;
    
    console.log("Create ios motion manager.")
      
    iosMotionManager = CMMotionManager.alloc().init();
    iosMotionManager.deviceMotionUpdateInterval = 1.0 / 120.0;
    let effectiveReferenceFrame:CMAttitudeReferenceFrame;
    if (CMMotionManager.availableAttitudeReferenceFrames() & CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical) {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXTrueNorthZVertical;
    } else {
        effectiveReferenceFrame = CMAttitudeReferenceFrame.CMAttitudeReferenceFrameXArbitraryCorrectedZVertical;
    }
    iosMotionManager.startDeviceMotionUpdatesUsingReferenceFrame(effectiveReferenceFrame);
}

const _getPose = Argon.DeviceService.prototype.getPose;
Argon.DeviceService.prototype.getPose = function() {
    const self = <Argon.DeviceService>this;
    if (application.ios) {
        
        const motionManager = getIosMotionManager();
        const locationManager = getIosLocationManager();
			
        const motion = motionManager.deviceMotion;
        const location = locationManager.location;
        
        let position:Argon.Cesium.Cartesian3; 
        
        if (location) {
            const lat = location.coordinate.latitude;
            const lon = location.coordinate.longitude;
            const height = location.altitude;
            
            const locationDate = <Date><any>location.timestamp; // {N} is auto-marshalling from NSDate to Date here
            const locationTime = Argon.Cesium.JulianDate.fromDate(locationDate, scratchTime);
            
            const sampledPosition = self.entity.position as Argon.Cesium.SampledPositionProperty;
            position =  Argon.Cesium.Cartesian3.fromDegrees(lon, lat, height, undefined, scratchCartesian3);
            sampledPosition.addSample(locationTime, position);
        }
        
        if (motion && position) {
            const motionQuaternion = <Argon.Cesium.Quaternion>motionManager.deviceMotion.attitude.quaternion;
            const motionTimestamp = motionManager.deviceMotion.timestamp; // this timestamp is in seconds, not an NSDate object
            const motionTime = JulianDate.addSeconds(iosSystemBootDate, motionTimestamp, scratchTime);
            
            // Apple's orientation is reported in NWU, so convert to ENU
            const orientation = Quaternion.multiply(z90, motionQuaternion, scratchQuaternion);
            
            // Finally, convert from local ENU to ECEF (Earth-Centered-Earth-Fixed)
            const enu2ecef = Transforms.eastNorthUpToFixedFrame(position, undefined, scratchMatrix4);
            const enu2ecefRot = Matrix4.getRotation(enu2ecef, scratchMatrix3);
            const enu2ecefQuat = Quaternion.fromRotationMatrix(enu2ecefRot, scratchECEFQuaternion);
            Quaternion.multiply(enu2ecefQuat, orientation, orientation);
            
            const sampledOrientation = self.entity.orientation as Argon.Cesium.SampledProperty;
            sampledOrientation.addSample(motionTime, orientation);
        }
    
    }
    
    return _getPose.call(this, time);
}


const _getEyePose = Argon.DeviceService.prototype.getEyePose;
Argon.DeviceService.prototype.getEyePose = function() {
    const self = <Argon.DeviceService>this;
    if (vuforia.isSupported()) {   
        const orientation = vuforia.getInterfaceOrientation();
        const orientationRad = Argon.Cesium.CesiumMath.toRadians(orientation);
        
        const orientationProperty = self.eyeEntity.orientation as Argon.Cesium.ConstantProperty;
        orientationProperty.setValue(Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, orientationRad));
    }
    return _getEyePose.call(this, time);
}