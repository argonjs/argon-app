/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.
 
Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    CameraField.h

\brief
    Header file for CameraField class.
===============================================================================*/

#ifndef _VUFORIA_CAMERAFIELD_H_
#define _VUFORIA_CAMERAFIELD_H_

namespace Vuforia
{

/// Represents advanced properties of the camera.
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
 *
 *  In addition, camera drivers and firmware may not interpret the values set in
 *  a consistent way, or may ignore the set values completely. Therefore, you should
 *  only rely on CameraField when you have a specific use case and device in mind.
 *
 *  Finally, setting non-standard values may adversely affect Vuforia tracking
 *  performance as well as cause functional issues.
 *
 *  \note The CameraField methods may only be called after the CameraDevice has been
 *  initialized.
 *
 *  \note CameraField is currently only available on Android devices.
 */
class CameraField
{
public:

    /// Type for the data stored in a CameraField.
    /**
     * On some platforms, all CameraFields are TypeString.
     */
    enum DataType
    {
        TypeString,     ///< Null terminated array of characters (ASCII)
        TypeInt64,      ///< 64-bit signed integer
        TypeFloat,      ///< Single precision floating point
        TypeBool,       ///< Boolean
        TypeInt64Range, ///< Array of two 64-bit signed integer values.
        
        /// On some platforms the type may not be known at runtime. Setting
        /// or getting a parameter of TypeUnknown will fail.
        TypeUnknown
    };
    
    /// Default constructor.
    CameraField() : mType(TypeUnknown), mKey("") {};
    
    /// The data type of this field.
    DataType mType;
    
    /// The key to identify this field.
    /** \note The string is only valid until the next call to
     * CameraDevice::getCameraField(). If you need to hold on to it for any
     * reason, make a copy of it.
     */
    const char* mKey;
};
    
} // namespace Vuforia

#endif //_VUFORIA_CAMERAFIELD_H_
