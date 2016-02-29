//
//  VuforiaViewController.m
//  Vuforia
//
//  Created by Gheric Speiginer on 12/14/2015.
//  Copyright (c) 2015 Gheric Speiginer. All rights reserved.
//

#import "VuforiaViewController.h"

#import "VuforiaVideoViewController.h"
#import "Vuforia.h"

@interface VuforiaViewController ()

@end

@implementation VuforiaViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    VuforiaApplicationSession *session = [[VuforiaApplicationSession alloc] init];
    
    [self addChildViewController:session.videoViewController];
    [self.view addSubview:session.videoViewController.view];
    
    [session initAR:@"AXRIsu7/////AAAAAaYn+sFgpkAomH+Z+tK/Wsc8D+x60P90Nz8Oh0J8onzjVUIP5RbYjdDfyatmpnNgib3xGo1v8iWhkU1swiCaOM9V2jmpC4RZommwQzlgFbBRfZjV8DY3ggx9qAq8mijhN7nMzFDMgUhOlRWeN04VOcJGVUxnKn+R+oot1XTF5OlJZk3oXK2UfGkZo5DzSYafIVA0QS3Qgcx6j2qYAa/SZcPqiReiDM9FpaiObwxV3/xYJhXPUGVxI4wMcDI0XBWtiPR2yO9jAnv+x8+p88xqlMH8GHDSUecG97NbcTlPB0RayGGg1F6Y7v0/nQyk1OIp7J8VQ2YrTK25kKHST0Ny2s3M234SgvNCvnUHfAKFQ5KV" done:^(NSError *error) {
        [session startCamera:VuforiaCameraDeviceCameraDefault];
    }];
    
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
