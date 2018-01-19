/*==============================================================================
Copyright (c) 2016 PTC Inc. All Rights Reserved.


Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

@file 
    TransformModel.h

@brief
    Header file for TransformModel class. 
==============================================================================*/
#ifndef _VUFORIA_TRANSFORM_MODEL_H_
#define _VUFORIA_TRANSFORM_MODEL_H_

#include <Vuforia/NonCopyable.h>
#include <Vuforia/Type.h>
#include <Vuforia/System.h>

namespace Vuforia
{

/// TransformModel class.
/**
 *  The TransformModel is a generic transformation class that can be
 *  associated with a Tracker so that the reported tracked pose can
 *  be adjusted to simulate various application usage scenarios such 
 *  as running the app on a handheld device or in a head-worn viewer.
 */
class VUFORIA_API TransformModel
{
public:

    /// Supported type for Transform model
    enum TYPE {
        TRANSFORM_MODEL_HEAD,        ///< Head Transform Model
        TRANSFORM_MODEL_HANDHELD,    ///< Handheld Transform Model
    };

    /// Returns the TransformModel instance's type
    virtual TYPE getType() const = 0;

    /// Destructor
    virtual ~TransformModel();

private:
    /// Assignment operator
    TransformModel& operator=(const TransformModel& other);
};

} // namespace Vuforia

#endif //_VUFORIA_TRANSFORM_MODEL_H_
