    // Copyright 2015 Georgia Tech Research Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// This software was created as part of a research project at the
// Augmented Environments Lab at Georgia Tech.  To support our research, we
// request that if you make use of this software, you let us know how
// you used it by sending mail to Blair MacIntyre (blair@cc.gatech.edu).


#if !(TARGET_IPHONE_SIMULATOR)

#include <sys/types.h>
#include <sys/sysctl.h>

#import "Vuforia.h"
#import "VuforiaVideoViewController.h"
#import <QCAR/QCAR.h>
#import <QCAR/QCAR_iOS.h>
#import <QCAR/Tool.h>
#import <QCAR/Renderer.h>
#import <QCAR/CameraDevice.h>
#import <QCAR/Trackable.h>
#import <QCAR/TrackableResult.h>
#import <QCAR/TrackerManager.h>
#import <QCAR/ObjectTracker.h>
#import <QCAR/MarkerTracker.h>
#import <QCAR/SmartTerrainTracker.h>
#import <QCAR/TextTracker.h>
#import <QCAR/ReconstructionFromTarget.h>
#import <QCAR/ImageTarget.h>
#import <QCAR/DataSet.h>
#import <QCAR/TargetFinder.h>
#import <QCAR/TargetSearchResult.h>
#import <QCAR/VideoBackgroundConfig.h>
#import <QCAR/UpdateCallback.h>
#import <QCAR/Matrices.h>
#import <QCAR/State.h>

#import <UIKit/UIKit.h>


namespace {
    // --- Data private to this unit ---

    // instance of the session
    // used to support the QCAR callback
    // there should be only one instance of a session
    // at any given point of time
    VuforiaApplicationSession* instance = nil;

    // camera to use for the session
    QCAR::CameraDevice::CAMERA mCamera = QCAR::CameraDevice::CAMERA_DEFAULT;
    
    QCAR::CameraDevice::MODE mCameraMode = QCAR::CameraDevice::MODE_OPTIMIZE_SPEED;

    // class used to support the QCAR callback mechanism
    class VuforiaApplication_UpdateCallback : public QCAR::UpdateCallback {
        virtual void QCAR_onUpdate(QCAR::State& state);
    } qcarUpdate;

    // NSerror domain
    NSString * APPLICATION_ERROR_DOMAIN = @"Vuforia";
}

@interface VuforiaObjectTarget ()
@property (nonatomic, assign) QCAR::ObjectTarget *cpp;
@property (nonatomic, assign) bool isConst;
@end

@implementation VuforiaObjectTarget
- (id) initWithCpp:(QCAR::ObjectTarget*)cpp asConst:(bool)isConst{
    self = [super init];
    if (self) {
        self.cpp = cpp;
        self.isConst = isConst;
    }
    return self;
}

- (VuforiaObjectSize) getSize {
    QCAR::Vec3F size = self.cpp->getSize();
    bool isImageTarget = self.cpp->isOfType(QCAR::ImageTarget::getClassType());
    VuforiaObjectSize s = {s.x=size.data[0], s.y=size.data[1], s.z= isImageTarget ? 0 : size.data[2]};
    return s;
}

@end

union QCARTrackable {
    QCAR::Trackable *trackable;
    const QCAR::Trackable *constTrackable;
};

@interface VuforiaTrackable ()
@property (nonatomic, assign) union QCARTrackable cpp;
@property (nonatomic, assign) bool isConst;
@end

@implementation VuforiaTrackable
- (id) initWithCpp:(QCARTrackable)cpp asConst:(bool)isConst {
    self = [super init];
    if (self) {
        self.cpp = cpp;
        self.isConst = isConst;
    }
    return self;
}

/// Returns the Trackable class' type
+(int) getClassType {
    return QCAR::Trackable::getClassType().getData();
}

/// Returns the Trackable instance's type
-(int) getType {
    return self.cpp.trackable->getType().getData();
};

/// Returns a unique id for all 3D trackable objects
-(int) getId{
    return self.cpp.trackable->getId();
};

/// Returns the Trackable's name
-(NSString*) getName {
    return [NSString stringWithCString:self.cpp.trackable->getName() encoding:NSUTF8StringEncoding];
}

/// Starts extended tracking for this Trackable. Returns true if successful
-(bool) startExtendedTracking {
    if (self.isConst) return NO;
    else return self.cpp.trackable->startExtendedTracking();
}

-(bool) stopExtendedTracking {
    if (self.isConst) return NO;
    else return self.cpp.trackable->stopExtendedTracking();
}

/// Returns true if extended tracking has been enabled, false otherwise.
-(bool) isExtendedTrackingStarted {
    return self.cpp.trackable->isExtendedTrackingStarted();
};

-(QCAR::ObjectTarget*) getObjectTarget {
    if (self.cpp.trackable->isOfType(QCAR::ObjectTarget::getClassType())) {
        return reinterpret_cast<QCAR::ObjectTarget*>(self.cpp.trackable);
    } else {
        return nil;
    }
}

  
-(VuforiaObjectTarget*) asObjectTarget {
    QCAR::ObjectTarget *target = [self getObjectTarget];
    if (target != nil) {
        return [[VuforiaObjectTarget alloc] initWithCpp:target asConst:self.isConst];
    } else {
        return nil;
    }
};

- (void)dealloc {
    self.cpp = {NULL};
}
@end

@interface VuforiaTrackableResult ()
@property (nonatomic) const QCAR::TrackableResult *cpp;
@end

@implementation VuforiaTrackableResult
- (id) initWithCpp:(const QCAR::TrackableResult*)cpp {
    self = [super init];
    if (self) {
        self.cpp = cpp;
    }
    return self;
}

+(int)getClassType {
    return QCAR::TrackableResult::getClassType().getData();
}

-(int)getType {
    return self.cpp->getType().getData();
}

/// Returns the tracking status
-(VuforiaTrackableResultStatus) getStatus {
    return (VuforiaTrackableResultStatus) self.cpp->getStatus();
};

/// Returns the corresponding Trackable that this result represents
-(VuforiaTrackable*) getTrackable {
    const QCAR::Trackable& trackable = self.cpp->getTrackable();
    QCARTrackable trackableUnion = {.constTrackable = &trackable};
    return [[VuforiaTrackable alloc] initWithCpp:trackableUnion asConst:true];
};

/// Returns the current pose matrix in row-major order
-(VuforiaMatrix34) getPose {
    const QCAR::Matrix34F &p = self.cpp->getPose();
    VuforiaMatrix34 pose = {
        ._0 = p.data[0],
        ._1 = p.data[1],
        ._2 = p.data[2],
        ._3 = p.data[3],
        ._4 = p.data[4],
        ._5 = p.data[5],
        ._6 = p.data[6],
        ._7 = p.data[7],
        ._8 = p.data[8],
        ._9 = p.data[9],
        ._10 = p.data[10],
        ._11 = p.data[11]
    };
    return pose;
};


- (void)dealloc {
    self.cpp = nil;
}
@end


@interface VuforiaFrame ()
@property (nonatomic) QCAR::State *cpp;
@end

@implementation VuforiaFrame

- (id) initWithCpp:(QCAR::State*)cpp {
    self = [super init];
    if (self) {
        self.cpp = cpp;
    }
    return self;
}

- (double) getTimeStamp {
    return self.cpp->getFrame().getTimeStamp();
}

- (int) getIndex {
    return self.cpp->getFrame().getIndex();
}

- (void)dealloc {
    self.cpp = nil;
}

@end

@interface VuforiaState ()
@property (nonatomic) QCAR::State *cpp;
@end

@implementation VuforiaState
- (id) initWithCpp:(QCAR::State*)cpp {
    self = [super init];
    if (self) {
        self.cpp = cpp;
    }
    return self;
}

- (VuforiaFrame*) getFrame {
    return [[VuforiaFrame alloc] initWithCpp:self.cpp];
}

- (int) getNumTrackables {
    return self.cpp->getNumTrackables();
}

- (int) getNumTrackableResults {
    return self.cpp->getNumTrackableResults();
}

- (VuforiaTrackable *)getTrackable:(int)idx {
    union QCARTrackable trackable = {.constTrackable =  self.cpp->getTrackable(idx)};
    return [[VuforiaTrackable alloc] initWithCpp:trackable asConst:true];
}

- (VuforiaTrackableResult *)getTrackableResult:(int)idx {
    return [[VuforiaTrackableResult alloc] initWithCpp:self.cpp->getTrackableResult(idx)];
}

- (void)dealloc {
    self.cpp = nil;
}
@end


@interface VuforiaDataSet ()
@property (nonatomic) QCAR::DataSet *cpp;
@end

@implementation VuforiaDataSet
- (id) initWithCpp:(QCAR::DataSet*)dataSet {
    self = [super init];
    if (self) {
        self.cpp = dataSet;
    }
    return self;
}

/// Checks if the dataset exists at the specified path and storage location
+(bool) exists:(NSString*) path {
    return QCAR::DataSet::exists([path UTF8String], QCAR::STORAGE_ABSOLUTE);
}

/// Loads the dataset at the specified path and storage location
-(bool) load:(NSString*)path {
    return self.cpp->load([path UTF8String], QCAR::STORAGE_ABSOLUTE);
}

/// Returns the overall number of 3D trackable objects in this data set.
-(int) getNumTrackables {
    return self.cpp->getNumTrackables();
}

/// Returns a pointer to a trackable object.
-(VuforiaTrackable*) getTrackable:(int) idx {
    QCAR::Trackable *t = self.cpp->getTrackable(idx);
    if (t == NULL) return nil;
    QCARTrackable trackable = {.trackable= t};
    return [[VuforiaTrackable alloc] initWithCpp:trackable asConst:false];
}

/// Creates a new Trackable from the given TrackableSource and registers
/// it with the dataset
//-(VuforiaTrackable*) createTrackable:(VuforiaTrackableSource*) source {
//    
//}

/// Creates a new MultiTarget and registers it with the dataset
//virtual MultiTarget* createMultiTarget(const char* name) = 0;

/// Destroys a Trackable
-(bool) destroy:(VuforiaTrackable*) trackable {
    return self.cpp->destroy(trackable.cpp.trackable);
}

/// Checks if this DataSet's Trackable capacity is reached.
- (bool) hasReachedTrackableLimit {
    return self.cpp->hasReachedTrackableLimit();
};

/// Checks if this dataset is active
- (bool) isActive {
    return self.cpp->isActive();
};

- (void)dealloc {
    self.cpp = nil;
}
@end


typedef void (^LoadDataSetCompletionHandler)(NSString *, NSError *);

@interface VuforiaApplicationSession ()

@property (nonatomic, strong) NSUUID* sessionUUID;
@property (nonatomic) CGSize viewSize;
@property (nonatomic) BOOL mIsActivityInPortraitMode;
@property (nonatomic) BOOL cameraIsActive;

@end

// TODO: move slow QCAR functions outside of the main thread
// but have to be VERY careful to make sure no two QCAR functions can be
// called at the same time in two different threads (including NSURLSession threads
// used for downloading dataset files). Probably will need to use a lock, or just
// wrap all QCAR code in a serial dispatch queue

dispatch_queue_t qcarQueue = dispatch_queue_create( "Vuforia", DISPATCH_QUEUE_SERIAL );

@implementation VuforiaApplicationSession

- (id) init {
    self = [super init];
    if (self) {
        instance = self;
        
        self.cameraIsActive = NO;
        self.cameraIsStarted = NO;
        self.sessionUUID = nil;
        
        _contentScaleFactor = (mCameraMode == QCAR::CameraDevice::MODE_OPTIMIZE_SPEED) ? 1 :
            ([UIScreen mainScreen].scale >= 2.0 ? 2 : 1);
        
        self.videoViewController = [[VuforiaVideoViewController alloc] initWithApplicationSession:self];
    }
    return self;
}

// Initialize the Vuforia SDK
- (void) initAR:(NSString*)licenseKey done:(void (^)(NSError *error))done{
    
    [self deinitAR];
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    
        QCAR::setInitParameters(QCAR::GL_20,[licenseKey UTF8String]);

        // QCAR::init() will return positive numbers up to 100 as it progresses
        // towards success.  Negative numbers indicate error conditions
        NSInteger initSuccess = 0;
        do {
            initSuccess = QCAR::init();
        } while (0 <= initSuccess && 100 > initSuccess);

        if (100 == initSuccess) {
            [self initTrackers];
        
            QCAR::registerCallback(&qcarUpdate);
            
            QCAR::CameraDevice::getInstance().init(QCAR::CameraDevice::CAMERA_BACK);
            QCAR::VideoMode videoMode = QCAR::CameraDevice::getInstance().getVideoMode(mCameraMode);
            
            CGRect windowBounds = [self fixedWindowBounds];
            float viewWidth = windowBounds.size.width;
            float viewHeight = windowBounds.size.height;
            float videoFixedWidth = videoMode.mHeight;
            float videoFixedHeight = videoMode.mWidth;
            
            // Frames from the camera are always landscape, no matter what the
            // orientation of the device.  Tell QCAR to rotate the video background (and
            // the projection matrix it provides to us for rendering our augmentation)
            // by the proper angle in order to match the EAGLView orientation
            QCAR::onSurfaceCreated();
            QCAR::onSurfaceChanged(viewWidth * _contentScaleFactor, viewHeight * _contentScaleFactor);
            QCAR::setRotation(QCAR::ROTATE_IOS_90);
            
            // ASPECT FILL
            float ratio = MAX(viewWidth / videoFixedWidth, viewHeight / videoFixedHeight);
            // ASPECT FIT
            // float ratio = MIN(viewWidth / videoWidth, viewHeight / videoHeight);
            
            VuforiaVideoBackgroundConfig config;
            config.enabled = true;
            config.positionX = 0;
            config.positionY = 0;
            config.sizeX = (int) (ratio * videoFixedWidth);
            config.sizeY = (int) (ratio * videoFixedHeight);
            self.videoBackgroundConfig = config;

            self.sessionUUID = [NSUUID UUID];
            dispatch_async(dispatch_get_main_queue(), ^{
                done(nil);
            });
        }
        else {
            // Failed to initialise QCAR:
            if (QCAR::INIT_NO_CAMERA_ACCESS == initSuccess) {
                // On devices running iOS 8+, the user is required to explicitly grant
                // camera access to an App.
                // If camera access is denied, QCAR::init will return
                // QCAR::INIT_NO_CAMERA_ACCESS.
                // This case should be handled gracefully, e.g.
                // by warning and instructing the user on how
                // to restore the camera access for this app
                // via Device Settings > Privacy > Camera
                [self performSelectorOnMainThread:@selector(showCameraAccessWarning) withObject:nil waitUntilDone:YES];
            }
            else {
                NSError * error;
                switch(initSuccess) {
                    case QCAR::INIT_LICENSE_ERROR_NO_NETWORK_TRANSIENT:
                        error = [self NSErrorWithCode:NSLocalizedString(@"Unable to contact server. Please try again later.", nil) code:initSuccess];
                        break;

                    case QCAR::INIT_LICENSE_ERROR_NO_NETWORK_PERMANENT:
                        error = [self NSErrorWithCode:NSLocalizedString(@"No network available. Please make sure you are connected to the Internet.", nil) code:initSuccess];
                        break;

                    case QCAR::INIT_LICENSE_ERROR_INVALID_KEY:
                        error = [self NSErrorWithCode:NSLocalizedString(@"Invalid Key used. Please make sure you are using a valid Vuforia App Key.", nil) code:initSuccess];
                        break;

                    case QCAR::INIT_LICENSE_ERROR_CANCELED_KEY:
                        error = [self NSErrorWithCode:NSLocalizedString(@"This app license key has been canceled and may no longer be used. Please get a new license key.", nil) code:initSuccess];
                        break;

                    case QCAR::INIT_LICENSE_ERROR_MISSING_KEY:
                        error = [self NSErrorWithCode:NSLocalizedString(@"Vuforia App key is missing. Please get a valid key, by logging into your account at developer.vuforia.com and creating a new project.", nil) code:initSuccess];
                        break;

                    case QCAR::INIT_LICENSE_ERROR_PRODUCT_TYPE_MISMATCH:
                        error = [self NSErrorWithCode:NSLocalizedString(@"Vuforia App key is not valid for this product. Please get a valid key, by logging into your account at developer.vuforia.com and choosing the right product type during project creation.", nil) code:initSuccess];
                        break;

                    default:
                        error = [self NSErrorWithCode:NSLocalizedString(@"Initialization error", nil) code:initSuccess];
                        break;

                }
                // QCAR initialization error
                dispatch_async(dispatch_get_main_queue(), ^{
                    done(error);
                });
            }
        }
    });
}

// Deinitialize the Vuforia SDK
- (void)deinitAR {
    if (self.sessionUUID == nil) return;
    self.sessionUUID = nil;

    // Stop the camera
    if (self.cameraIsActive) {
        // Stop and deinit the camera
        QCAR::CameraDevice::getInstance().stop();
        QCAR::CameraDevice::getInstance().deinit();
        self.cameraIsActive = NO;
    }
    self.cameraIsStarted = NO;

    // stop the trackers
    [self stopTrackers];

    // unload the data associated to the trackers
//    [self unloadTrackerData];

    // deinit the trackers
    [self deinitTrackers];

    // Pause and deinitialise QCAR
//    QCAR::onPause();
    QCAR::deinit();
}

// Resume
- (BOOL) resumeAR:(NSError **)error {
    QCAR::onResume();
    // if the camera was previously started, but not currently active, then
    // we restart it
    if (self.cameraIsStarted && !self.cameraIsActive) {
        if (![self startCamera:(VuforiaCameraDeviceCamera)mCamera]) {
            return NO;
        }
        self.cameraIsActive = YES;
    }
    return YES;
}

// Pause
- (BOOL)pauseAR:(NSError **)error {
    if (self.cameraIsActive) {
        // Stop the camera
        [self stopCamera];
        self.cameraIsStarted = YES;
    }
    QCAR::onPause();
    return YES;
}

- (VuforiaTimeVal) boottime {
#define MIB_SIZE 2
    int mib[MIB_SIZE];
    size_t size;
    struct timeval  boottime;
    
    VuforiaTimeVal boot;
    
    mib[0] = CTL_KERN;
    mib[1] = KERN_BOOTTIME;
    size = sizeof(boottime);
    if (sysctl(mib, MIB_SIZE, &boottime, &size, NULL, 0) != -1)
    {
        // successful call
        boot.sec = boottime.tv_sec;
        boot.usec = boottime.tv_usec;
    }
    return boot;
}

- (void) QCAR_onUpdate:(QCAR::State *) state {
    if (self.stateUpdateCallback != nil) {
        self.stateUpdateCallback([[VuforiaState alloc] initWithCpp:state]);
    }
}

- (void) initTrackers {
    QCAR::TrackerManager& trackerManager = QCAR::TrackerManager::getInstance();
    trackerManager.initTracker(QCAR::ObjectTracker::getClassType());
    trackerManager.initTracker(QCAR::MarkerTracker::getClassType());
    trackerManager.initTracker(QCAR::SmartTerrainTracker::getClassType());
    trackerManager.initTracker(QCAR::TextTracker::getClassType());
}

- (void) stopTrackers {
    QCAR::TrackerManager& trackerManager = QCAR::TrackerManager::getInstance();
    trackerManager.getTracker(QCAR::ObjectTracker::getClassType())->stop();
    trackerManager.getTracker(QCAR::MarkerTracker::getClassType())->stop();
    trackerManager.getTracker(QCAR::SmartTerrainTracker::getClassType())->stop();
    trackerManager.getTracker(QCAR::TextTracker::getClassType())->stop();
}

- (void) deinitTrackers {
    QCAR::TrackerManager& trackerManager = QCAR::TrackerManager::getInstance();
    trackerManager.deinitTracker(QCAR::ObjectTracker::getClassType());
    trackerManager.deinitTracker(QCAR::MarkerTracker::getClassType());
    trackerManager.deinitTracker(QCAR::SmartTerrainTracker::getClassType());
    trackerManager.deinitTracker(QCAR::TextTracker::getClassType());
}

//-------------------//
// ObjectTracker     //
//------------------///


- (BOOL) startObjectTracker {
    QCAR::ObjectTracker* t = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    if (t==NULL) return false;
    return t->start();
}

- (void) stopObjectTracker {
    QCAR::ObjectTracker* t = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    if (t!=NULL) t->stop();
}

-(BOOL) hintMaxSimultaneousImageTargets:(int)maxTargets
{
    return QCAR::setHint(QCAR::HINT_MAX_SIMULTANEOUS_IMAGE_TARGETS, maxTargets);
}

-(void) downloadDataSetFromURL:(NSString*)xmlURLString done:(void (^)(NSString*, NSError*))done
{
    NSURL *xmlURL  = [NSURL URLWithString:xmlURLString];
    NSURL *datURL = [[xmlURL URLByDeletingPathExtension] URLByAppendingPathExtension:@"dat"];

    NSFileManager *fileManager = [NSFileManager defaultManager];
    
    NSNumber *directoryHash = @([[xmlURL URLByDeletingLastPathComponent] hash]);
    NSURL *directoryURL = [NSURL fileURLWithPath:NSTemporaryDirectory()];
    directoryURL = [directoryURL URLByAppendingPathComponent:[directoryHash stringValue]];
    [fileManager createDirectoryAtPath:[directoryURL path]
           withIntermediateDirectories:YES
                            attributes:nil
                                 error:nil];
    
    __block NSString *datLocation = nil;
    __block NSString *xmlLocation = nil;
    __block BOOL datDone = NO;
    __block BOOL xmlDone = NO;
    
    void (^checkComplete)(void) = ^{
        if (!datDone || !xmlDone) return;
        if (datLocation == nil || xmlLocation == nil)
            return done(nil, [self NSErrorWithCode:-1]);
        else return done(xmlLocation, nil);
    };

    [[[NSURLSession sharedSession] downloadTaskWithURL:datURL completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
        long statusCode = ((NSHTTPURLResponse*)response).statusCode;
        if (error == nil && statusCode == 200) {
            // rename the temp file to the original filename (to make vuforia happy)
            NSString *fileName = [[[datURL URLByDeletingPathExtension] URLByAppendingPathExtension:@"dat"] lastPathComponent];
            NSURL *newDatLocation = [directoryURL URLByAppendingPathComponent:fileName];
            [fileManager removeItemAtURL:newDatLocation error:nil];
            [fileManager moveItemAtURL:location toURL:newDatLocation error:&error];
            if (error == nil) {
                datLocation = [newDatLocation path];
            }
        }
        datDone = YES;
        checkComplete();
    }] resume];
    
    [[[NSURLSession sharedSession] downloadTaskWithURL:xmlURL completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
        long statusCode = ((NSHTTPURLResponse*)response).statusCode;
        if (error == nil && statusCode == 200) {
            // rename the temp file to the original filename (to make vuforia happy)
            NSString *fileName = [xmlURL lastPathComponent];
            NSURL *newXMLLocation = [directoryURL URLByAppendingPathComponent:fileName];
            [fileManager removeItemAtURL:newXMLLocation error:nil];
            [fileManager moveItemAtURL:location toURL:newXMLLocation error:&error];
            if (error == nil) {
                xmlLocation = [newXMLLocation path];
            }
        }
        xmlDone = YES;
        checkComplete();
    }] resume];
}

-(VuforiaDataSet*)createDataSet {
    QCAR::ObjectTracker* t = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    
    if (t == nil) {
        return nil;
    }
    
    QCAR::DataSet *dataSet = t->createDataSet();
    
    if (dataSet != NULL) {
        return [[VuforiaDataSet alloc] initWithCpp:dataSet];
    } else {
        return nil;
    }
}

-(VuforiaDataSet*)loadDataSet:(NSString*)path {
    QCAR::ObjectTracker* t = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    
    if (t == nil) {
        return nil;
    }
    
    // XXX: if the dataset url does not point to a valid xml (or dat) file,
    // attempting to load the dataset with QCAR will cause an EXC_BAD_ACCESS.
    // This WILL crash the app, and there doesn't seem to be much we can do about it.
    QCAR::DataSet *dataSet = t->createDataSet();
    const char* filePath = [path UTF8String];
    if (dataSet != NULL &&
        dataSet->exists(filePath, QCAR::STORAGE_ABSOLUTE) &&
        dataSet->load(filePath, QCAR::STORAGE_ABSOLUTE)) {
        return [[VuforiaDataSet alloc] initWithCpp:dataSet];
    } else {
        if (dataSet != NULL) {
            t->destroyDataSet(dataSet);
        }
        return nil;
    }

}

-(BOOL)destroyDataSet:(VuforiaDataSet*)dataSet
{
    QCAR::ObjectTracker* t = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));

    if (t == nil) {
        return NO;
    }
    
    return t->destroyDataSet(dataSet.cpp);
}

-(BOOL) activateDataSet:(VuforiaDataSet*)dataSet
{
    if (dataSet == nil) return NO;
    QCAR::ObjectTracker* t = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    if (t == NULL) return NO;
    return t->activateDataSet(dataSet.cpp);
}

-(BOOL) deactivateDataSet:(VuforiaDataSet*)dataSet
{
    if (dataSet == nil) return NO;
    QCAR::ObjectTracker* t = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    if (t == NULL) return NO;
    return t->deactivateDataSet(dataSet.cpp);
}


//-------------------//
// MarkerTracker     //
//------------------///

- (BOOL) startMarkerTracker {
    QCAR::MarkerTracker* t = reinterpret_cast<QCAR::MarkerTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::MarkerTracker::getClassType()));
    return t->start();
}

- (BOOL) startSmartTerrainTracker {
    QCAR::SmartTerrainTracker* t = reinterpret_cast<QCAR::SmartTerrainTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::SmartTerrainTracker::getClassType()));
//    QCAR::SmartTerrainBuilder& b = t->getSmartTerrainBuilder();
    return t->start();
}

- (BOOL) startTextTracker {
    QCAR::TextTracker* t = reinterpret_cast<QCAR::TextTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::TextTracker::getClassType()));
    return t->start();
}


- (void) stopMarkerTracker {
    QCAR::TrackerManager::getInstance().getTracker(QCAR::MarkerTracker::getClassType())->stop();
}

- (void) stopSmartTerrainTracker {
    QCAR::TrackerManager::getInstance().getTracker(QCAR::SmartTerrainTracker::getClassType())->stop();
}

- (void) stopTextTracker {
    QCAR::TrackerManager::getInstance().getTracker(QCAR::TextTracker::getClassType())->stop();
}


- (void)setVideoBackgroundConfig:(VuforiaVideoBackgroundConfig)config
{
    _videoBackgroundConfig = config;
    QCAR::VideoBackgroundConfig qcarConfig;
    qcarConfig.mEnabled = config.enabled;
    qcarConfig.mPosition.data[0] = config.positionX * _contentScaleFactor;
    qcarConfig.mPosition.data[1] = config.positionY * _contentScaleFactor;
    qcarConfig.mSize.data[0] = config.sizeX * _contentScaleFactor;
    qcarConfig.mSize.data[1] = config.sizeY * _contentScaleFactor;
    QCAR::Renderer::getInstance().setVideoBackgroundConfig(qcarConfig);
}

// Start QCAR camera
- (BOOL) startCamera:(VuforiaCameraDeviceCamera)camera {
    
    QCAR::CameraDevice::CAMERA qcarCamera = (QCAR::CameraDevice::CAMERA) camera;
    
    // initialize the camera
    if (! QCAR::CameraDevice::getInstance().init(qcarCamera)) {
        return NO;
    }
    // select the default video mode
    if(! QCAR::CameraDevice::getInstance().selectVideoMode(mCameraMode)) {
        return NO;
    }

    // start the camera
    if (!QCAR::CameraDevice::getInstance().start()) {
        return NO;
    }

    // we keep track of the current camera to restart this
    // camera when the application comes back to the foreground
    mCamera = qcarCamera;

    self.cameraIsActive = YES;
    self.cameraIsStarted = YES;

    return YES;
}

// Stop the camera
- (BOOL) stopCamera {
    if (self.cameraIsActive) {
        // Stop and deinit the camera
        QCAR::CameraDevice::getInstance().stop();
        QCAR::CameraDevice::getInstance().deinit();
        self.cameraIsActive = NO;
    } else {
        return NO;
    }
    self.cameraIsStarted = NO;

    return YES;
}

// Stop the camera
- (VuforiaCameraCalibration) getCameraCalibration {
    VuforiaCameraCalibration c = {.ok = false};

    if (self.cameraIsActive) {
        // Stop and deinit the camera
        const QCAR::CameraCalibration &cal = QCAR::CameraDevice::getInstance().getCameraCalibration();
            
        c.ok = true;
        c.sizeX = cal.getSize().data[0];
        c.sizeY = cal.getSize().data[1];
        c.focalLengthX = cal.getFocalLength().data[0];
        c.focalLengthY = cal.getFocalLength().data[1];
        c.principalPointX = cal.getPrincipalPoint().data[0];
        c.principalPointY = cal.getPrincipalPoint().data[1];
        c.distortionParameterA = cal.getDistortionParameters().data[0];
        c.distortionParameterB = cal.getDistortionParameters().data[1];
        c.distortionParameterC = cal.getDistortionParameters().data[2];
        c.distortionParameterD = cal.getDistortionParameters().data[3];
        c.fieldOfViewRadX = cal.getFieldOfViewRads().data[0];
        c.fieldOfViewRadY = cal.getFieldOfViewRads().data[1];
    }
    
    return c;
}

- (VuforiaVideoMode) getVideoMode {
    QCAR::VideoMode videoMode = QCAR::CameraDevice::getInstance().getVideoMode(mCameraMode);
    VuforiaVideoMode v = {.width=videoMode.mWidth, .height=videoMode.mHeight, .framerate=videoMode.mFramerate};
    return v;
}

//-------------------//
// Utility          //
//------------------///

//-(void)downloadFileAtURL:(NSURL *)dataURL completionHandler:(LoadDataSetCompletionHandler)completionHandler
//{
//    if (self.downloadQueue == nil)
//    {
//        self.downloadQueue = [[NSOperationQueue alloc] init];
//        [self.downloadQueue setMaxConcurrentOperationCount: 2];
//        [self.downloadQueue setName: @"DownloadQueue"];
//    }
//
//    NSURLRequest *request = [NSURLRequest requestWithURL: dataURL
//                                             cachePolicy: NSURLRequestUseProtocolCachePolicy
//                                         timeoutInterval: 15];
//
//
//    [NSURLConnection sendAsynchronousRequest: request
//                                       queue: self.downloadQueue
//                           completionHandler: ^(NSURLResponse *response, NSData *data, NSError *error) {
//       if (error != nil)
//       {
//           return completionHandler(nil, error);
//       }
//
//       NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse*) response;
//       NSInteger code = httpResponse.statusCode;
//
//       // check for HTTP success codes
//       if (code != 200 || code == 201) {
//           // make sure we don't return 404 pages (or anything else) as datasets... (this crashes Vuforia)
//           return completionHandler(nil, [NSError errorWithDomain:APPLICATION_ERROR_DOMAIN
//                                                             code:code
//                                                         userInfo:nil]);
//       }
//
//       NSError *writeError = nil;
//       NSString *tempFilePath = [NSTemporaryDirectory() stringByAppendingPathComponent:[[NSUUID UUID] UUIDString]];
//       [data writeToFile:tempFilePath options:NSDataWritingAtomic error:&writeError];
//
//       if (writeError != nil)
//       {
//           completionHandler(nil, writeError);
//       }
//       else
//       {
//           completionHandler(tempFilePath, nil);
//       }
//   }];
//}

-(QCAR::ImageTarget*) findTarget:(QCAR::DataSet*)dataSet name:(NSString*)name
{
    for(int i=0; i<dataSet->getNumTrackables(); i++)
    {
        NSString *otherName = [NSString stringWithUTF8String:dataSet->getTrackable(i)->getName()];
        if([otherName compare:name] == NSOrderedSame)
            return reinterpret_cast<QCAR::ImageTarget*>(dataSet->getTrackable(i));
    }
    return NULL;
}

- (void) allowDataSetModification: (QCAR::DataSet*) dataSet;
{
    QCAR::ObjectTracker* ot = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    // Deactivate the data set prior to reconfiguration:
    ot->deactivateDataSet(dataSet);
}


- (void) saveDataSetModifications: (QCAR::DataSet*) dataSet
{
    QCAR::ObjectTracker* it = reinterpret_cast<QCAR::ObjectTracker*>(QCAR::TrackerManager::getInstance().getTracker(QCAR::ObjectTracker::getClassType()));
    // Deactivate the data set prior to reconfiguration:
    it->activateDataSet(dataSet);
}

- (void) errorMessage:(NSString *) message {
    UIAlertView *alert = [[UIAlertView alloc] initWithTitle:APPLICATION_ERROR_DOMAIN
                                                    message:message
                                                   delegate:nil
                                          cancelButtonTitle:@"OK"
                                          otherButtonTitles:nil];
    [alert show];
}


// build a NSError
- (NSError *) NSErrorWithCode:(int) code {
    return [NSError errorWithDomain:APPLICATION_ERROR_DOMAIN code:code userInfo:nil];
}

- (NSError *) NSErrorWithCode:(NSString *) description code:(NSInteger)code {
    NSDictionary *userInfo = @{
                               NSLocalizedDescriptionKey: description
                               };
    return [NSError errorWithDomain:APPLICATION_ERROR_DOMAIN
                               code:code
                           userInfo:userInfo];
}

- (NSError *) NSErrorWithCode:(int) code error:(NSError **) error{
    if (error != NULL) {
        *error = [self NSErrorWithCode:code];
        return *error;
    }
    return nil;
}

- (CGRect) fixedWindowBounds {
    return [[[UIScreen mainScreen] fixedCoordinateSpace]
            convertRect: [[[UIApplication sharedApplication] keyWindow] bounds]
            fromCoordinateSpace: [[UIScreen mainScreen] coordinateSpace]];
}

// Prompts a dialog to warn the user that
// the camera access was not granted to this App and
// to provide instructions on how to restore it.
-(void) showCameraAccessWarning
{
    NSString *appName = [[[NSBundle mainBundle] infoDictionary] objectForKey:(NSString*)kCFBundleNameKey];
    NSString *message = [NSString stringWithFormat:@"User denied camera access to this App. To restore camera access, go to: \nSettings > Privacy > Camera > %@ and turn it ON.", appName];

    UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"iOS8 Camera Access Warning" message:message delegate:self cancelButtonTitle:@"Close" otherButtonTitles:nil, nil];

    [alert show];
}

// Quit App when user dismisses the camera access alert dialog
- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex
{
    if ([alertView.title isEqualToString:@"iOS8 Camera Access Warning"]) {
        [[NSNotificationCenter defaultCenter] postNotificationName:@"kDismissAppViewController" object:nil];
    }
}

////////////////////////////////////////////////////////////////////////////////
// Callback function called by the tracker when each tracking cycle has finished
void VuforiaApplication_UpdateCallback::QCAR_onUpdate(QCAR::State& state)
{
    if (instance != nil) {
        [instance QCAR_onUpdate:&state];
    }
}

@end

#endif