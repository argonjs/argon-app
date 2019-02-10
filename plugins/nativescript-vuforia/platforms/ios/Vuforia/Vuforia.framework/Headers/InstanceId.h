/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other
countries.

\file
    InstanceId.h

\brief
    Header file for InstanceId class.
===============================================================================*/

#ifndef _VUFORIA_INSTANCEID_H_
#define _VUFORIA_INSTANCEID_H_

// Include files
#include <Vuforia/System.h>
#include <Vuforia/Type.h>

namespace Vuforia
{

/// The ID of a particular VuMark instance.
class VUFORIA_API InstanceId
{
public:

    /// The type of data encoded in this ID.
    enum ID_DATA_TYPE
    {
        /// Generic byte data, stored in little-endian order in the buffer.
        /// For example, and ID of 0x123456 would appear as { 0x56, 0x34, 0x12 }
        BYTES = 0,

        /// Printable string data in ASCII.
        STRING = 1,

        /// Numeric data, not larger than a 64 bit unsigned long long.
        NUMERIC = 2
    };

    /// Get a char buffer filled with getLength() bytes representing the InstanceId.
    virtual const char* getBuffer() const = 0;

    /// Get the length of the id's data, in bytes.
    /* 
     *  If the instance ID data type is
     *   - BYTES: the number of bytes in the ID.
     *   - STRING: the maximum number of characters that could be returned, not
     *             counting the ending null. If copying the string data into
     *             your own buffer, allocate this length + 1.
     *   - NUMERIC: the number of bytes needed to store the ID's numeric value
     *              (e.g. 8 bytes for 64 bits).
     */
    virtual size_t getLength() const = 0;

    /// Convenience method to get IDs of type NUMERIC
    /**
     * \returns The ID if its type is NUMERIC, otherwise 0.
     */
    virtual unsigned long long getNumericValue() const = 0;

    /// Get the type of data this instance ID stores.
    virtual ID_DATA_TYPE getDataType() const = 0;
};

} // namespace Vuforia

#endif //_VUFORIA_INSTANCEID_H_
