/*===============================================================================
Copyright (c) 2018 PTC Inc. All Rights Reserved.

Copyright (c) 2014 Qualcomm Connected Experiences, Inc. All Rights Reserved.

Vuforia is a trademark of PTC Inc., registered in the United States and other 
countries.

\file
    Recorder.h

\brief
    Header file for Recorder class.
===============================================================================*/

#ifndef _VUFORIA_RECORDER_H_
#define _VUFORIA_RECORDER_H_

// Include files
#include <Vuforia/NonCopyable.h>
#include <Vuforia/VideoMode.h>

namespace Vuforia
{

/// Records video and sensor data.
class VUFORIA_API Recorder : private NonCopyable
{
public:

    enum SensorsRecording
    {
        Camera = 0x01,
        Accelerometer = 0x02,
        Gyroscope = 0x04, 
        Magnetometer = 0x08,
        DeviceRotation = 0x10,
        DevicePose = 0x20
    };

    /// Returns the Recorder singleton instance.
    static Recorder& getInstance();

    /// Initialize the recorder.
    virtual bool init(const char* path = 0, int flags = (Vuforia::Recorder::Camera | Vuforia::Recorder::Accelerometer
                                                        | Vuforia::Recorder::Gyroscope | Vuforia::Recorder::Magnetometer
                                                        | Vuforia::Recorder::DeviceRotation | Vuforia::Recorder::DevicePose)) = 0;

    /// Deinitializes the recorder.
    /**
     *  Any resources created or used so far are released. Note that this
     *  function should not be called during the execution of the
     *  UpdateCallback and if so will return false.
     */
    virtual bool deinit() = 0;

    /// Starts the recorder.
    virtual bool start() = 0;

    /// Stops the recorder.
    virtual bool stop()  = 0;

    /// Get supported resolution(s)
    virtual int getSupportedResolutions(Vuforia::VideoMode* videoModes) = 0;

    // Gets the supported sensors, the return value is a bitfield as defined by SensorsRecording enum
    virtual int getSupportedSensors() const = 0;
};

} // namespace Vuforia

#endif // _VUFORIA_RECORDER_H_
