//
//  VuforiaDevice.h
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import <Foundation/Foundation.h>
#import "VuforiaSession.h"
#import "VuforiaCameraDevice.h"


/// Possible viewer button types
typedef NS_ENUM (NSInteger, VuforiaViewerParamtersButtonType) {
    VuforiaViewerParamtersButtonTypeNone = 0,       ///< The viewer has no button.
    VuforiaViewerParamtersButtonTypeMagnet,         ///< The viewer has a magnet button.
    VuforiaViewerParamtersButtonTypeFingerTouch,   ///< The viewer allows the user to touch the screen.
    VuforiaViewerParamtersButtonTypeButtonTouch,   ///< The viewer has a button which touches the screen when pressed.
};

/// Possible viewer tray alignment values
typedef NS_ENUM (NSInteger, VuforiaViewerParamtersTrayAlignment) {
    VuforiaViewerParamtersTrayAlignmentBottom = 0,      ///< The bottom of the phone is aligned with the bottom of the viewer.
    VuforiaViewerParamtersTrayAlignmentCentre,          ///< The center of the phone screen is aligned with the center of the viewer lens.
    VuforiaViewerParamtersTrayAlignmentTop,             ///< The top of the phone is aligned with the top of the viewer.
};

@interface VuforiaViewerParameters : NSObject
/// Returns the version of this ViewerParameters.
-(float)getVersion;

/// Returns the name of the viewer.
-(NSString*)getName;

/// Returns the manufacturer of the viewer.
-(NSString*)getManufacturer;

/// Returns the type of button in the viewer.
-(VuforiaViewerParamtersButtonType)getButtonType;

/// Returns the distance between the phone screen and the viewer lens' in meters.
-(float)getScreenToLensDistance;

/// Returns the distance between the viewer lens' in meters.
-(float)getInterLensDistance;

/// Returns how the phone sits within the viewer.
-(VuforiaViewerParamtersTrayAlignment)getTrayAlignment;

/// Returns the distance between the lens' and the tray position in meters.
-(float)getLensCentreToTrayDistance;

/// Returns the number of distortion coefficients specified for the viewer lens'.
-(long)getNumDistortionCoefficients;

/// Returns the distortion coefficient at the specified index, 0 if index is out of range.
-(float)getDistortionCoefficient:(int)idx;

/// Get field-of-view of the lens'.
/**
 * \return a Vector containing the half angles in order
 *         outer (ear), inner (nose), top, bottom
 */
-(VuforiaVec4F)getFieldOfView;

/// Returns true if the viewer contains a magnet, false otherwise.
-(bool)containsMagnet;

@end

@interface VuforiaViewerParametersList : NSObject

/// Set a filter for a 3rd party VR SDK
/**
 * Allows the list to be filtered for a specific 3rd party SDK.
 * Known SDKs are "GEARVR" and "CARDBOARD".
 * To return to the default list of viewers set the filter to the empty string.
 */
-(void)setSDKFilter:(NSString*)filter;

/// Returns the number of items in the list.
-(size_t)size;

/// Returns the item at the specified index. NULL if the index is out of range.
-(VuforiaViewerParameters*)get:(size_t)idx;

/// Returns ViewerParameters for the specified viewer name and manufacturer. NULL if no viewer was matched.
-(VuforiaViewerParameters*)getName:(NSString*)name manufacturer:(NSString*)manufacturer;

@end


/// View types (used with RenderingPrimitives)
typedef NS_ENUM (NSInteger, VuforiaView)
{
    VuforiaViewSingular,      ///< Identifier for singular screen on a mobile phone or
    ///  tablet (HANDHELD device),
    ///  or the full display in a viewer
    
    VuforiaViewLeftEye,       ///< Identifier for the left display of an HMD, or the
    ///  left side of the screen when docked in a viewer
    
    VuforiaViewRightEye,      ///< Identifier for the right display of an HMD, or the
    ///  right side of the screen when docked in a viewer
    
    VuforiaViewPostProcess,   ///< Identifier for the post processing step of VR
    ///  rendering where the distorted scene is rendered to
    ///  the screen
    
    VuforiaViewCount          ///< Max possible number of views
};

@interface VuforiaViewList : NSObject

/// Returns the number of views in this list.
-(size_t)getNumViews;

/// Returns the VIEW at the specified index.
-(VuforiaView)getView:(size_t)idx;

/// Returns true if this list contains the specified VIEW.
-(BOOL)contains:(VuforiaView)view;

@end

@interface VuforiaMesh : NSObject
/// Returns the number of vertices, i.e. positions and normals
-(int)getNumVertices;

/// Returns true if the mesh contains positions
-(BOOL)hasPositions;

/// Provides access to the array of positions
-(const VuforiaVec3F*)getPositions;

/// Provides access to the array of positions
-(const float*)getPositionCoordinates;

/// Returns true if the mesh contains surface normals
-(BOOL)hasNormals;

-(const VuforiaVec3F*)getNormals;

/// Provides access to the array of surface normals
-(const float*)getNormalCoordinates;

/// Returns true if the mesh contains texture coordinates
-(BOOL)hasUVs;

/// Provides access to the array of texture coordinates
-(const VuforiaVec2F*)getUVs;

/// Provides access to the array of texture coordinates
-(const float*)getUVCoordinates;

/// Returns the number of triangles
-(int)getNumTriangles;

/// Provides access to the array triangle indices
-(const unsigned short*)getTriangles;

@end

@interface VuforiaRenderingPrimitives : NSObject

/// Returns the set of views available for rendering from these primitives
-(VuforiaViewList*)getRenderingViews;

/// Returns a viewport for the given display in the format (x,y, width, height)
-(VuforiaVec4I)getViewport:(VuforiaView)viewID;

/// Returns a viewport for the given display in the format (x, y, width, height) normalized between 0 and 1
-(VuforiaVec4F)getNormalizedViewport:(VuforiaView)viewID;

/// Returns the projection matrix to use for the given view
-(VuforiaMatrix34)getProjectionMatrix:(VuforiaView)viewID;

/// Returns the projection matrix to use for the given view
-(VuforiaMatrix34)getProjectionMatrix:(VuforiaView)viewID
                    cameraCalibration:(VuforiaCameraCalibration*)cameraCalibration
     adjustForViewportCentreToEyeAxis:(BOOL)adjust;

/// Returns an adjustment matrix needed to correct for the different position of display relative to the eye
/**
 * The returned matrix is to be applied to the tracker pose matrix during rendering.
 * The adjustment matrix is in meters, if your scene is defined in another unit
 * you will need to adjust the matrix before use.
 */
-(VuforiaMatrix34)getEyeDisplayAdjustmentMatrix:(VuforiaView)viewID;

/// Returns the projection matrix to use when projecting the video background
-(VuforiaMatrix34)getVideoBackgroundProjectionMatrix:(VuforiaView)viewID coordinateSystem:(VuforiaCoordinateSystemType)csType;

/// Returns a simple mesh suitable for rendering a video background texture
-(VuforiaMesh*)getVideoBackgroundMesh:(VuforiaView)viewID;

/// Returns the recommended size to use when creating a texture to apply to the distortion mesh
-(VuforiaVec2I)getDistortionTextureSize:(VuforiaView)viewID;

/// Returns a viewport for the given input to the distortion mesh in the format (x,y, width, height)
-(VuforiaVec4I)getDistortionTextureViewport:(VuforiaView)viewID;

/// Returns a barrel distortion mesh for the given view
-(VuforiaMesh*)getDistortionTextureMesh:(VuforiaView)viewID;

@end

typedef NS_ENUM (NSInteger, VuforiaDeviceMode) {
    VuforiaDeviceModeAR = 0,    ///< Augmented Reality (AR) mode
    VuforiaDeviceModeVR         ///< Virtual Reality (VR) mode
};

@interface VuforiaDevice : NSObject
/// Get the singleton instance
+(VuforiaDevice*)getInstance;

/// Returns the Device class' type
+(int)getClassType;

/// Returns the Device instance's type
-(int)getType;

/// Set the rendering mode to either AR (MODE_AR) or VR (MODE_VR).
/**
 * Note: It is not possible to set the mode to AR until a CameraDevice has been initialised.
 */
-(BOOL)setMode:(VuforiaDeviceMode)m;

/// Get the current rendering mode.
-(VuforiaDeviceMode)getMode;

/// Set the currently selected viewer to active. Updates available RenderingPrimitives.
-(void)setViewerActive:(BOOL)active;

/// Returns true if a viewer is active, false otherwise.
-(BOOL)isViewerActive;

/// Get the list of ViewerParameters known to the system.
-(VuforiaViewerParametersList*)getViewerList;

/// Select the viewer to use, either with ViewerParameters from the ViewerParametersList or CustomViewerParameters.
-(bool)selectViewer:(VuforiaViewerParameters*)vp;

/// Returns the ViewerParameters for the currently selected viewer.
-(VuforiaViewerParameters*)getSelectedViewer;

/// Set a flag to indicate that the device configuration has changed, and thus RenderingPrimitives need to be regenerated
-(void)setConfigurationChanged;

/// Returns a copy of the RenderingPrimitives for the current configuration
/**
 * Each RenderingPrimitives object is immutable, and is tailored to the environment it is created in.
 * External configuration changes will require a new RenderingPrimitives object to be retrieved.<br>
 * The relevant configuration changes are:
 * - display size and/or orientation
 * - mode (AR or VR)
 * - video mode
 * - inserting the device into a viewer (indicated by Device::setViewerActive())
 *
 * Platform-specific lifecycle transitions (eg Pause/Resume) can cause the configuration to change,
 * so it is advisable to re-retrieve the RenderingPrimitives after those transitions.<br>
 * Note that this method returns a copy, which has an associated cost; performant apps should
 * avoid calling this method if the configuration has not changed.<br>
 * Note: For AR MODE the RenderingPrimitives will not be valid until a CameraDevice has been initialised.
 */
-(VuforiaRenderingPrimitives*)getRenderingPrimitives;
@end

#endif
