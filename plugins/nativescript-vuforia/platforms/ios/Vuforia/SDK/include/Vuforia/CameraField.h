/*===============================================================================
Copyright (c) 2016-2017 PTC Inc. All Rights Reserved.
 
Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file 
    CameraField.h

@brief
    Header file for CameraField class.
 ===============================================================================*/
#ifndef _VUFORIA_CAMERAFIELD_H_
#define _VUFORIA_CAMERAFIELD_H_


namespace Vuforia
{

/// Camera fields are advanced properties of the camera
/**
 *  Camera fields represent advanced camera properties and capture parameters such as
 *  exposure compensation, ISO and others. A field may be read only (e.g. maximum
 *  exposure compensation value) or read-write (e.g. exposure compensation value).
 *
 *  Camera fields are accessed as key-value pairs, where the value may be one of
 *  multiple basic types.
 *
 *  Camera fields are highly platform dependent and the keys to identify a given
 *  property and available values to set will vary across operating system,
 *  operating system version, camera API version and the device model itself.
 *  Furthermore the behavior of the camera driver wrt. these fields is highly
 *  fragmented. Thus CameraFields should only be used for specific use case and devices.
 *
 *  All of the Camera field APIs shall be called only after initializing the
 *  CameraDevice.
 *
 *  Camera Fields are currently only implemented for Android.
 *
 *  Finally, setting advanced camera parameters may adversely affect Vuforia
 *  tracking performance as well as cause functional issues.
 */
class CameraField
{
public:
    /// A camera field may be of the following types. On some platforms all
    /// fields are strings.
    enum DataType
    {
        TypeString,     ///< Null terminated array of characters (ASCII)
        TypeInt64,      ///< 64-bit signed integer
        TypeFloat,      ///< Single precision floating point
        TypeBool,       ///< Boolean
        TypeInt64Range, ///< Array of two 64-bit signed integer
        
        /// On some platforms the type may not be known at run-time. Setting
        /// or getting a parameter of unknown type will fail.
        TypeUnknown
    };
    
    /// Default constructor
    CameraField() : mType(TypeUnknown), mKey("") {};
    
    /// The data type of this field
    DataType mType;
    
    /// The key to identify this field.
    /// Note the string is only valid until the next call to getCameraField,
    /// take a copy of the string if you want to hold on to it.
    const char* mKey;
};
    
} // namespace Vuforia
#endif //_VUFORIA_CAMERAFIELD_H_