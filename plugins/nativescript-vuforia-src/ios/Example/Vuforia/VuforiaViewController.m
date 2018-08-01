//
//  VuforiaViewController.m
//  Vuforia
//
//  Created by Gheric Speiginer on 12/14/2015.
//  Copyright (c) 2015 Gheric Speiginer. All rights reserved.
//

#import "VuforiaViewController.h"

#import "VuforiaVideoViewController.h"
#import "VuforiaSession.h"
#import "VuforiaRenderer.h"
#import "VuforiaTracker.h"
#import "VuforiaDevice.h"
#import "VuforiaCameraDevice.h"

@implementation VuforiaViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    [VuforiaSession setLicenseKey:@"AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV"];
    
    VuforiaVideoViewController *videoViewController = [[VuforiaVideoViewController alloc]init];
    [self addChildViewController:videoViewController];
    [self.view addSubview:videoViewController.view];
    
    float contentScaleFactor = UIScreen.mainScreen.scale;
    [videoViewController.eaglView setContentScaleFactor:contentScaleFactor];
    
    float viewWidth = videoViewController.view.frame.size.width;
    float viewHeight = videoViewController.view.frame.size.height;
    
    VuforiaCameraDeviceMode cameraMode = VuforiaCameraDeviceModeDefault;
    
    [VuforiaSession initDone:^(VuforiaInitResult result) {
        if (result == VuforiaInitResultSUCCESS) {
            
            [VuforiaSession onSurfaceCreated];
            
            [VuforiaSession onSurfaceChangedWidth:viewWidth * contentScaleFactor height:viewHeight * contentScaleFactor];
            [VuforiaSession setRotation:VuforiaRotationIOS_90];
            
            VuforiaCameraDevice *camera = [VuforiaCameraDevice getInstance];
            
            if (![camera initCamera:VuforiaCameraDeviceDirectionDefault]) {
                NSLog(@"Unable to init camera");
            };
            
            if (![camera selectVideoMode:cameraMode]) {
                NSLog(@"Unable to select video mode");
            };
            
            VuforiaVideoMode videoMode = [camera getVideoMode:cameraMode];
            float videoWidthRotated = videoMode.height;
            float videoHeightRotated = videoMode.width;
            
            // aspect fill ratio
            float ratio = MAX(viewWidth / videoWidthRotated, viewHeight / videoHeightRotated);
            // aspect fit ratio
            // float ratio = MIN(viewWidth / videoWidthRotated, viewHeight / videoHeightRotated);
            
            VuforiaVideoBackgroundConfig videoConfig = {
                .enabled = YES,
                .positionX = 0,
                .positionY = 0,
                .sizeX = videoWidthRotated * ratio * contentScaleFactor,
                .sizeY = videoHeightRotated * ratio * contentScaleFactor
            };
            [VuforiaRenderer setVideoBackgroundConfig:videoConfig];
            
//            [[VuforiaDevice getInstance] setViewerActive:YES];
            
            if (![camera start]) {
                NSLog(@"Unable to start camera");
            };
        }
    }];
    
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
