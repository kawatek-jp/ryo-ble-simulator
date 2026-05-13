'use strict';

const bleno = require('@abandonware/bleno');
const {
  CHAR_DEVICE_INFO,
  FW_VERSION_MAJOR,
  FW_VERSION_MINOR,
  NUM_ELECTRODES,
  HW_REVISION,
  ADC_MAX,
  SIGNAL_MAX,
  ACTIVE_THRESHOLD,
  SAMPLE_RATE,
} = require('../constants');

/**
 * Device Info Characteristic (0004)
 * Properties: Read
 * Size: 20 bytes (static)
 *
 * Byte layout:
 * [0]     FW_VERSION_MAJOR = 3
 * [1]     FW_VERSION_MINOR = 0
 * [2]     NUM_ELECTRODES = 2
 * [3]     HW_REVISION = 1
 * [4-5]   ADC_MAX = 4095 (uint16 LE)
 * [6-7]   SIGNAL_MAX = 1200 (uint16 LE)
 * [8-9]   ACTIVE_THRESHOLD = 150 (uint16 LE)
 * [10-11] SAMPLE_RATE = 100 (uint16 LE)
 * [12-19] reserved (zeros)
 */
class DeviceInfoCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: CHAR_DEVICE_INFO,
      properties: ['read'],
      descriptors: [
        new bleno.Descriptor({
          uuid: '2901',
          value: 'Device Info',
        }),
      ],
    });

    // Pre-build the static buffer
    this._buffer = Buffer.alloc(20);
    this._buffer.writeUInt8(FW_VERSION_MAJOR, 0);
    this._buffer.writeUInt8(FW_VERSION_MINOR, 1);
    this._buffer.writeUInt8(NUM_ELECTRODES, 2);
    this._buffer.writeUInt8(HW_REVISION, 3);
    this._buffer.writeUInt16LE(ADC_MAX, 4);
    this._buffer.writeUInt16LE(SIGNAL_MAX, 6);
    this._buffer.writeUInt16LE(ACTIVE_THRESHOLD, 8);
    this._buffer.writeUInt16LE(SAMPLE_RATE, 10);
    // bytes 12-19 are zeros (already allocated as zeros)
  }

  onReadRequest(offset, callback) {
    callback(this.RESULT_SUCCESS, this._buffer);
  }
}

module.exports = DeviceInfoCharacteristic;
