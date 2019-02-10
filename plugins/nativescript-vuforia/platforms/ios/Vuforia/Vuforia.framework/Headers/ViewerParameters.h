/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2015 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    ViewerParameters.h

\brief
    Header file for ViewerParameters class.
===============================================================================*/

#ifndef _VUFORIA_VIEWER_PARAMETERS_H_
#define _VUFORIA_VIEWER_PARAMETERS_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/Vuforia.h>
#include <Vuforia/Vectors.h>

namespace Vuforia
{

/// Container class for parameters needed to define a viewer.
class VUFORIA_API ViewerParameters
{
public:

    /// Possible viewer button types.
    enum BUTTON_TYPE
    {
        BUTTON_TYPE_NONE = 0,       ///< The viewer has no button.
        BUTTON_TYPE_MAGNET,         ///< The viewer has a magnet button.
        BUTTON_TYPE_FINGER_TOUCH,   ///< The viewer allows the user to touch the screen.
        BUTTON_TYPE_BUTTON_TOUCH,   ///< The viewer has a button which touches the screen when pressed.
    };

    /// Possible viewer tray alignment values.
    enum TRAY_ALIGNMENT
    {
        TRAY_ALIGN_BOTTOM = 0,      ///< The bottom of the phone is aligned with the bottom of the viewer.
        TRAY_ALIGN_CENTRE,          ///< The center of the phone screen is aligned with the center of the viewer lens.
        TRAY_ALIGN_TOP,             ///< The top of the phone is aligned with the top of the viewer.
    };

    virtual ~ViewerParameters();

    /// Copy constructor.
    ViewerParameters(const ViewerParameters &);

    /// Assignment operator.
    ViewerParameters& operator= (const ViewerParameters &);

    /// Get the version of this ViewerParameters.
    virtual float getVersion() const;

    /// Get the name of the viewer.
    virtual const char* getName() const;

    /// Get the manufacturer of the viewer.
    virtual const char* getManufacturer() const;

    /// Get the type of button in the viewer.
    virtual BUTTON_TYPE getButtonType() const;

    /// Get the distance between the phone screen and the viewer lens' in meters.
    virtual float getScreenToLensDistance() const;

    /// Get the distance between the viewer lens' in meters.
    virtual float getInterLensDistance() const;

    /// Get how the phone sits within the viewer.
    virtual TRAY_ALIGNMENT getTrayAlignment() const;

    /// Get the distance between the lens' and the tray position in meters.
    virtual float getLensCentreToTrayDistance() const;

    /// Get the number of distortion coefficients specified for the viewer lens.
    virtual size_t getNumDistortionCoefficients() const;

    /// Get the distortion coefficient at the specified index, 0 if index is out of range.
    virtual float getDistortionCoefficient(int idx) const;

    /// Get the field-of-view of the lens.
    /**
     * \returns a 4D vector containing the field of view of the viewer, expressed
     * as half angles, in degrees, in order (outer (ear), inner (nose), top, bottom)
     */
    virtual Vec4F getFieldOfView() const;

    /// Get whether the view contains a magnet.
    virtual bool containsMagnet() const;

protected:

    /// Use CustomViewerParameters to construct your own ViewerParameters if necessary.
    ViewerParameters();

    class Data;
    Data* mData;
};

} // namespace Vuforia

#endif // _VUFORIA_VIEWER_PARAMETERS_H_
