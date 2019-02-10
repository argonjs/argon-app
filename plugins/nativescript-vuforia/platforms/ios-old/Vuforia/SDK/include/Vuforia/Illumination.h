/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Illumination.h

\brief
    Header file for the Illumination class.
===============================================================================*/

#ifndef _VUFORIA_ILLUMINATION_H_
#define _VUFORIA_ILLUMINATION_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/NonCopyable.h>

namespace Vuforia
{

/// Abstract representation of the illumination for a particular frame.
/**
 * Objects of this class contain information about the illumination in a particular
 * camera frame.
 *
 * An instance of this class can be obtained from the State. Use its returned
 * values to render augmentation using illumination consistent with the real
 * world scene.
 */
class VUFORIA_API Illumination : private NonCopyable
{
public:

    /// Returned by getAmbientIntensity() when data is not available.
    static const float AMBIENT_INTENSITY_UNAVAILABLE;

    /// Returned by getAmbientColorTemperature() when data is not available.
    static const float AMBIENT_COLOR_TEMPERATURE_UNAVAILABLE;

    /// Get the scene's ambient intensity.
    /**
     * \returns The current ambient intensity of the scene, in Lumens, or
     * AMBIENT_INTENSITY_UNAVAILABLE if the value is not available on the current
     * platform.
     */
    virtual float getAmbientIntensity() const = 0;

    /// Get the scene's ambient color temperature.
    /**
     * \returns The current color temperature of the scene, in Kelvin, or
     * AMBIENT_COLOR_TEMPERATURE_UNAVAILABLE if the value is not available on
     * the current platform.
     */
    virtual float getAmbientColorTemperature() const = 0;

    virtual ~Illumination() {}
};

} // namespace Vuforia

#endif // _VUFORIA_ILLUMINATION_H_
