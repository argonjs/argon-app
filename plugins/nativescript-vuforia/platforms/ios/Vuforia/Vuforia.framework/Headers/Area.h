/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2010-2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Area.h

\brief
    Header file for Area class.
===============================================================================*/

#ifndef _VUFORIA_AREA_H_
#define _VUFORIA_AREA_H_

// Include files
#include <Vuforia/Vuforia.h>

namespace Vuforia
{

/// Base class for any 2D shapes used in %Vuforia.
class VUFORIA_API Area
{
public:

    /// The types of area that a given instance of Area can represent.
    enum TYPE
    {
        RECTANGLE,      ///< A rectangle expressed in real (floating point) coordinates
        RECTANGLE_INT,  ///< A rectangle expressed in integer coordinates
        INVALID
    };

    /// Get the TYPE of area this instance represents.
    virtual TYPE getType() const = 0;

    virtual ~Area();

private:

    Area& operator=(const Area& other);
};

} // namespace Vuforia

#endif // _VUFORIA_AREA_H_
