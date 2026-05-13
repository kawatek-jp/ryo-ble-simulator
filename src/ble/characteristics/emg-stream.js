'use strict';

const bleno = require('@abandonware/bleno');
const { CHAR_EMG_STREAM } = require('../constants');

/**
 * EMG Stream Characteristic (0001)
 * Properties: Read, Notify
 * Size: 8 bytes
 *
 * Byte layout:
 * [0-1] ext (uint16 LE)
 * [2-3] flex (uint16 LE)
 * [4]   mode (uint8)
 * [5]   flags (bit0: uart_ok, bit1: signal_valid)
 * [6-7] packetCount (uint16 LE)
 */
class EmgStreamCharacteristic extends bleno.Characteristic {
  constructor(simulatorState) {
    super({
      uuid: CHAR_EMG_STREAM,
      properties: ['read', 'notify'],
      descriptors: [
        new bleno.Descriptor({
          uuid: '2901',
          value: 'EMG Stream',
        }),
      ],
    });

    this._state = simulatorState;
    this._updateValueCallback = null;
    this._notifyInterval = null;
  }

  onReadRequest(offset, callback) {
    const buffer = this._packData();
    callback(this.RESULT_SUCCESS, buffer);
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    this._updateValueCallback = updateValueCallback;
    // Notify at 20 Hz (50ms interval)
    this._notifyInterval = setInterval(() => {
      if (this._updateValueCallback) {
        const buffer = this._packData();
        this._updateValueCallback(buffer);
      }
    }, 50);
    console.log('[EMG Stream] Client subscribed (20 Hz notifications)');
  }

  onUnsubscribe() {
    if (this._notifyInterval) {
      clearInterval(this._notifyInterval);
      this._notifyInterval = null;
    }
    this._updateValueCallback = null;
    console.log('[EMG Stream] Client unsubscribed');
  }

  _packData() {
    const sample = this._state.signalGenerator.next();
    this._state.packetCount++;

    const buffer = Buffer.alloc(8);
    buffer.writeUInt16LE(sample.ext, 0);
    buffer.writeUInt16LE(sample.flex, 2);
    buffer.writeUInt8(this._state.mode, 4);
    // flags: bit0 = uart_ok (always 1 in sim), bit1 = signal_valid (always 1)
    buffer.writeUInt8(0x03, 5);
    buffer.writeUInt16LE(this._state.packetCount & 0xFFFF, 6);

    // Store latest sample for metrics
    this._state.lastSample = sample;

    return buffer;
  }
}

module.exports = EmgStreamCharacteristic;
