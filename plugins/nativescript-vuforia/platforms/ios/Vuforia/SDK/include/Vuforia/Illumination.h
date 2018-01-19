/*===============================================================================
Copyright (c) 2017 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

@file 
    Illumination.h

@brief
    Header file for the Illumination class.
===============================================================================*/

#ifndef _VUFORIA_ILLUMINATION_H_
#define _VUFORIA_ILLUMINATION_H_

#include <Vuforia/System.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

    
    
/// Vuforia abstract representation of the illumination for the current frame
/**
 * Objects of this class contain information about the illumination in the current
 * frame. An instance of this class should be obtained from the State and the
 * values used to render augmentations using illumination consistent with the scene.
 */
class VUFORIA_API Illumination : private NonCopyable
{
public:
    /// Returned when the ambient intensity is not available,
    /// see getAmbientIntensity()
    static const float AMBIENT_INTENSITY_UNAVAILABLE;
    
    /// Returned when the ambient color temperature is not available
    /// see getAmbientColorTemperature()
    static const float AMBIENT_COLOR_TEMPERATURE_UNAVAILABLE;
    
    /// The current ambient intensity for the scene measured in Lumens. The value
    /// may not be available on all platforms. When the value is unavailable
    /// AMBIENT_INTENSITY_UNAVAILABLE will be returned.
    virtual float getAmbientIntensity() const = 0;

    /// The current color temperature for the scene measured in Kelvin. The value
    /// may not be available on all platforms. When the value is unavailable
    /// AMBIENT_COLOR_TEMPERATURE_UNAVAILABLE will be returned.
    virtual float getAmbientColorTemperature() const = 0;
    
    virtual ~Illumination() {}
};

} // namespace Vuforia


#endif // _VUFORIA_ILLUMINATION_H_
