//
//  VuforiaDevice.m
//  Pods
//
//  Created by Gheric Speiginer on 4/1/16.
//
//

#if !(TARGET_IPHONE_SIMULATOR)

#import "VuforiaDevice.h"
#import <Vuforia/ViewerParameters.h>
#import <Vuforia/ViewerParametersList.h>
#import <Vuforia/View.h>
#import <Vuforia/ViewList.h>
#import <Vuforia/Mesh.h>
#import <Vuforia/RenderingPrimitives.h>
#import <Vuforia/Device.h>
#import <Vuforia/Tool.h>

@interface VuforiaViewerParameters ()
@property (nonatomic, assign) const Vuforia::ViewerParameters *cpp;
@end

@implementation VuforiaViewerParameters

/// Returns the version of this ViewerParameters.
-(float)getVersion {
    return self.cpp->getVersion();
}

/// Returns the name of the viewer.
-(NSString*)getName {
    return @(self.cpp->getName());
}

/// Returns the manufacturer of the viewer.
-(NSString*)getManufacturer {
    return @(self.cpp->getManufacturer());
}

/// Returns the type of button in the viewer.
-(VuforiaViewerParamtersButtonType)getButtonType {
    return (VuforiaViewerParamtersButtonType)self.cpp->getButtonType();
}

/// Returns the distance between the phone screen and the viewer lens' in meters.
-(float)getScreenToLensDistance {
    return self.cpp->getScreenToLensDistance();
}

/// Returns the distance between the viewer lens' in meters.
-(float)getInterLensDistance {
    return self.cpp->getInterLensDistance();
}

/// Returns how the phone sits within the viewer.
-(VuforiaViewerParamtersTrayAlignment)getTrayAlignment {
    return (VuforiaViewerParamtersTrayAlignment)self.cpp->getTrayAlignment();
}

/// Returns the distance between the lens' and the tray position in meters.
-(float)getLensCentreToTrayDistance {
    return self.cpp->getLensCentreToTrayDistance();
}

/// Returns the number of distortion coefficients specified for the viewer lens'.
-(long)getNumDistortionCoefficients {
    return self.cpp->getNumDistortionCoefficients();
}

/// Returns the distortion coefficient at the specified index, 0 if index is out of range.
-(float)getDistortionCoefficient:(int)idx {
    return self.cpp->getDistortionCoefficient(idx);
}

/// Get field-of-view of the lens'.
/**
 * \return a Vector containing the half angles in order
 *         outer (ear), inner (nose), top, bottom
 */
-(VuforiaVec4F)getFieldOfView {
    Vuforia::Vec4F fov = self.cpp->getFieldOfView();
    return (VuforiaVec4F&)fov;
}

/// Returns true if the viewer contains a magnet, false otherwise.
-(bool)containsMagnet {
    return self.cpp->containsMagnet();
}

- (void)dealloc {
    delete self.cpp;
    self.cpp = nil;
}

@end


@interface VuforiaViewerParametersList ()
@property (nonatomic, assign) Vuforia::ViewerParametersList *cpp;
@end


@implementation VuforiaViewerParametersList : NSObject

/// Set a filter for a 3rd party VR SDK
/**
 * Allows the list to be filtered for a specific 3rd party SDK.
 * Known SDKs are "GEARVR" and "CARDBOARD".
 * To return to the default list of viewers set the filter to the empty string.
 */
-(void)setSDKFilter:(NSString*)filter {
    self.cpp->setSDKFilter([filter cStringUsingEncoding:[NSString defaultCStringEncoding]]);
}

/// Returns the number of items in the list.
-(size_t)size {
    return self.cpp->size();
}

/// Returns the item at the specified index. NULL if the index is out of range.
-(VuforiaViewerParameters*)get:(size_t)idx {
    const Vuforia::ViewerParameters *p = self.cpp->get(idx);
    if (p != NULL) {
        VuforiaViewerParameters *params = [[VuforiaViewerParameters alloc] init];
        params.cpp = p;
        return params;
    }
    return nil;
}

/// Returns ViewerParameters for the specified viewer name and manufacturer. NULL if no viewer was matched.
-(VuforiaViewerParameters*)getName:(NSString*)name manufacturer:(NSString*)manufacturer {
    const char* cName = [name cStringUsingEncoding:[NSString defaultCStringEncoding]];
    const char* cManufacturer = [manufacturer cStringUsingEncoding:[NSString defaultCStringEncoding]];
    const Vuforia::ViewerParameters *p = self.cpp->get(cName, cManufacturer);
    if (p != NULL) {
        VuforiaViewerParameters *params = [[VuforiaViewerParameters alloc] init];
        params.cpp = p;
        return params;
    }
    return nil;
}

- (void)dealloc {
    self.cpp = nil;
}

@end


@interface VuforiaViewList ()
@property (nonatomic, assign) const Vuforia::RenderingPrimitives *cpp;
@end

@implementation VuforiaViewList

/// Returns the number of views in this list.
-(size_t)getNumViews {
    return self.cpp->getRenderingViews().getNumViews();
}

/// Returns the VIEW at the specified index.
-(VuforiaView)getView:(size_t)idx {
    return (VuforiaView)self.cpp->getRenderingViews().getView((int)idx);
}

/// Returns true if this list contains the specified VIEW.
-(BOOL)contains:(VuforiaView)view {
    return self.cpp->getRenderingViews().contains((Vuforia::VIEW)view);
}

- (void)dealloc {
    self.cpp = nil;
}

@end

@interface VuforiaMesh ()
@property (nonatomic, assign) const Vuforia::Mesh *cpp;
@end

@implementation VuforiaMesh

/// Returns the number of vertices, i.e. positions and normals
-(int)getNumVertices {
    return self.cpp->getNumVertices();
}

/// Returns true if the mesh contains positions
-(BOOL)hasPositions {
    return self.cpp->hasPositions();
}

/// Provides access to the array of positions
-(const VuforiaVec3F*)getPositions {
    return (VuforiaVec3F*)self.cpp->getPositions();
}

/// Provides access to the array of positions
-(const float*)getPositionCoordinates {
    return self.cpp->getPositionCoordinates();
}

/// Returns true if the mesh contains surface normals
-(BOOL)hasNormals {
    return self.cpp->hasNormals();
}

-(const VuforiaVec3F*)getNormals {
    return (const VuforiaVec3F*)self.cpp->getNormals();
}

/// Provides access to the array of surface normals
-(const float*)getNormalCoordinates {
    return self.cpp->getNormalCoordinates();
}

/// Returns true if the mesh contains texture coordinates
-(BOOL)hasUVs {
    return self.cpp->hasUVs();
}

/// Provides access to the array of texture coordinates
-(const VuforiaVec2F*)getUVs {
    return (const VuforiaVec2F*)self.cpp->getUVs();
}

/// Provides access to the array of texture coordinates
-(const float*)getUVCoordinates {
    return self.cpp->getUVCoordinates();
}

/// Returns the number of triangles
-(int)getNumTriangles {
    return self.cpp->getNumTriangles();
}

/// Provides access to the array triangle indices
-(const unsigned short*)getTriangles {
    return self.cpp->getTriangles();
}

- (void)dealloc {
    self.cpp = nil;
}

@end



@interface VuforiaRenderingPrimitives ()
@property (nonatomic, assign) const Vuforia::RenderingPrimitives *cpp;
@end

@implementation VuforiaRenderingPrimitives

/// Returns the set of views available for rendering from these primitives
-(VuforiaViewList*)getRenderingViews {
    static VuforiaViewList *list = [[VuforiaViewList alloc] init];
    list.cpp = self.cpp;
    return list;
}

/// Returns a viewport for the given display in the format (x,y, width, height)
-(VuforiaVec4I)getViewport:(VuforiaView)viewID {
    Vuforia::Vec4I v = self.cpp->getViewport((Vuforia::VIEW)viewID);;
    return (VuforiaVec4I&)v;
}

/// Returns a viewport for the given display in the format (x, y, width, height) normalized between 0 and 1
-(VuforiaVec4F)getNormalizedViewport:(VuforiaView)viewID {
    Vuforia::Vec4F v = self.cpp->getNormalizedViewport((Vuforia::VIEW)viewID);
    return (VuforiaVec4F&)v;
}

/// Returns the projection matrix to use for the given view and the specified coordinate system
-(VuforiaMatrix44)getProjectionMatrix:(VuforiaView)viewID coordinateSystem:(VuforiaCoordinateSystemType)csType {
    Vuforia::Matrix34F m = self.cpp->getProjectionMatrix((Vuforia::VIEW)viewID,(Vuforia::COORDINATE_SYSTEM_TYPE)csType);
    Vuforia::Matrix44F m44 = Vuforia::Tool::convertPerspectiveProjection2GLMatrix(m, 0.01, 10000);
    return (VuforiaMatrix44&)m44;
}

/// Returns an adjustment matrix needed to correct for the different position of display relative to the eye
/**
 * The returned matrix is to be applied to the tracker pose matrix during rendering.
 * The adjustment matrix is in meters, if your scene is defined in another unit
 * you will need to adjust the matrix before use.
 */
-(VuforiaMatrix44)getEyeDisplayAdjustmentMatrix:(VuforiaView)viewID {
    Vuforia::Matrix44F m = Vuforia::Tool::convertPose2GLMatrix(self.cpp->getEyeDisplayAdjustmentMatrix((Vuforia::VIEW)viewID));
    return (VuforiaMatrix44&)m;
}

/// Returns the projection matrix to use when projecting the video background
-(VuforiaMatrix44)getVideoBackgroundProjectionMatrix:(VuforiaView)viewID coordinateSystem:(VuforiaCoordinateSystemType)csType {
    Vuforia::Matrix34F m = self.cpp->getVideoBackgroundProjectionMatrix((Vuforia::VIEW)viewID,(Vuforia::COORDINATE_SYSTEM_TYPE)csType);
    Vuforia::Matrix44F m44 = Vuforia::Tool::convertPerspectiveProjection2GLMatrix(m, 0.01, 10000000);
    return (VuforiaMatrix44&)m44;
}

/// Returns a simple mesh suitable for rendering a video background texture
-(VuforiaMesh*)getVideoBackgroundMesh:(VuforiaView)viewID {
    const Vuforia::Mesh& m = self.cpp->getVideoBackgroundMesh((Vuforia::VIEW)viewID);
    VuforiaMesh* mesh = [[VuforiaMesh alloc]init];
    mesh.cpp = &m;
    return mesh;
}

/// Returns the recommended size to use when creating a texture to apply to the distortion mesh
-(VuforiaVec2I)getDistortionTextureSize:(VuforiaView)viewID {
    Vuforia::Vec2I v = self.cpp->getDistortionTextureSize((Vuforia::VIEW)viewID);
    return (VuforiaVec2I&)v;
}

/// Returns a viewport for the given input to the distortion mesh in the format (x,y, width, height)
-(VuforiaVec4I)getDistortionTextureViewport:(VuforiaView)viewID {
    Vuforia::Vec4I v = self.cpp->getDistortionTextureViewport((Vuforia::VIEW)viewID);
    return (VuforiaVec4I&)v;
}

/// Returns a barrel distortion mesh for the given view
-(VuforiaMesh*)getDistortionTextureMesh:(VuforiaView)viewID {
    const Vuforia::Mesh& m = self.cpp->getDistortionTextureMesh((Vuforia::VIEW)viewID);
    VuforiaMesh* mesh = [[VuforiaMesh alloc]init];
    mesh.cpp = &m;
    return mesh;
}

- (void)dealloc {
    delete self.cpp;
    self.cpp = nil;
}

@end

@interface VuforiaDevice ()
@end

@implementation VuforiaDevice : NSObject

/// Get the singleton instance
+(VuforiaDevice*)getInstance {
    static VuforiaDevice * device = [[VuforiaDevice alloc] init];
    return device;
}

/// Returns the Device class' type
+(int)getClassType {
    return Vuforia::Device::getClassType().getData();
}

/// Returns the Device instance's type
-(int)getType {
    return Vuforia::Device::getInstance().getType().getData();
}

/// Set the rendering mode to either AR (MODE_AR) or VR (MODE_VR).
/**
 * Note: It is not possible to set the mode to AR until a CameraDevice has been initialised.
 */
-(BOOL)setMode:(VuforiaDeviceMode)m {
    return Vuforia::Device::getInstance().setMode((Vuforia::Device::MODE)m);
}

/// Get the current rendering mode.
-(VuforiaDeviceMode)getMode {
    return (VuforiaDeviceMode)Vuforia::Device::getInstance().getMode();
}

/// Set the currently selected viewer to active. Updates available RenderingPrimitives.
-(void)setViewerActive:(BOOL)active {
    Vuforia::Device::getInstance().setViewerActive(active);
}

/// Returns true if a viewer is active, false otherwise.
-(BOOL)isViewerActive {
    return Vuforia::Device::getInstance().isViewerActive();
}

/// Get the list of ViewerParameters known to the system.
-(VuforiaViewerParametersList*)getViewerList {
    Vuforia::ViewerParametersList *l = &Vuforia::Device::getInstance().getViewerList();
    VuforiaViewerParametersList *list = [[VuforiaViewerParametersList alloc] init];
    list.cpp = l;
    return list;
}

/// Select the viewer to use, either with ViewerParameters from the ViewerParametersList or CustomViewerParameters.
-(bool)selectViewer:(VuforiaViewerParameters*)vp {
    return Vuforia::Device::getInstance().selectViewer((Vuforia::ViewerParameters)*vp.cpp);
}

/// Returns the ViewerParameters for the currently selected viewer.
-(VuforiaViewerParameters*)getSelectedViewer {
    VuforiaViewerParameters *viewerParameters = [[VuforiaViewerParameters alloc] init];
    const Vuforia::ViewerParameters *vp = new Vuforia::ViewerParameters(Vuforia::Device::getInstance().getSelectedViewer());
    viewerParameters.cpp = vp;
    return viewerParameters;
}

/// Set a flag to indicate that the device configuration has changed, and thus RenderingPrimitives need to be regenerated
-(void)setConfigurationChanged {
    Vuforia::Device::getInstance().setConfigurationChanged();
}

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
-(VuforiaRenderingPrimitives*)getRenderingPrimitives {
    VuforiaRenderingPrimitives *renderingPrimitives = [[VuforiaRenderingPrimitives alloc] init];
    const Vuforia::RenderingPrimitives *rp = new Vuforia::RenderingPrimitives(Vuforia::Device::getInstance().getRenderingPrimitives());
    renderingPrimitives.cpp = rp;
    return renderingPrimitives;
}
@end

#endif