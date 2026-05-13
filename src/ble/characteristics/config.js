'use strict';

const bleno = require('@abandonware/bleno');
const { CHAR_CONFIG } = require('../constants');

/**
 * Config Characteristic (0003)
 * Properties: Read, Write, Notify
 * Size: 16 bytes
 *
 * Byte layout:
 * [0-1]   flexThreshold (uint16 LE) — 0-4095
 * [2-3]   extThreshold (uint16 LE) — 0-4095
 * [4-5]   flexGain_x100 (uint16 LE) — 0-1000
 * [6-7]   extGain_x100 (uint16 LE) — 0-1000
 * [8]     preferredMode (uint8) — 0-99
 * [9]     flags (uint8) — bit0: aiAssistEnabled, bit1: adaptiveEnabled
 * [10-11] smoothingAlpha_x1k (uint16 LE) — 0-1000
 * [12-15] reserved (zeros)
 */
class ConfigCharacteristic extends bleno.Characteristic {
  constructor(simulatorState) {
    super({
      uuid: CHAR_CONFIG,
      properties: ['read', 'write', 'notify'],
      descriptors: [
        new bleno.Descriptor({
          uuid: '2901',
          value: 'Config',
        }),
      ],
    });

    this._state = simulatorState;
    this._updateValueCallback = null;
  }

  onReadRequest(offset, callback) {
    const buffer = this._packConfig();
    callback(this.RESULT_SUCCESS, buffer);
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    // Reject empty writes
    if (!data || data.length === 0) {
      console.log('[Config] Rejected: empty write');
      callback(this.RESULT_UNLIKELY_ERROR);
      return;
    }

    // Reject writes shorter than 16 bytes
    if (data.length < 16) {
      console.log(`[Config] Rejected: too short (${data.length} bytes, need 16)`);
      callback(this.RESULT_UNLIKELY_ERROR);
      return;
    }

    const oldConfig = { ...this._state.config };

    // Decode and validate (clamp to valid ranges)
    const config = this._state.config;
    config.flexThreshold = Math.min(4095, data.readUInt16LE(0));
    config.extThreshold = Math.min(4095, data.readUInt16LE(2));
    config.flexGain_x100 = Math.min(1000, data.readUInt16LE(4));
    config.extGain_x100 = Math.min(1000, data.readUInt16LE(6));
    config.preferredMode = Math.min(99, data.readUInt8(8));
    config.flags = data.readUInt8(9);
    config.smoothingAlpha_x1k = Math.min(1000, data.readUInt16LE(10));

    console.log('[Config] Updated:', JSON.stringify(config));

    // Notify subscribers
    if (this._updateValueCallback) {
      const buffer = this._packConfig();
      this._updateValueCallback(buffer);
    }

    callback(this.RESULT_SUCCESS);
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    this._updateValueCallback = updateValueCallback;
    console.log('[Config] Client subscribed');
  }

  onUnsubscribe() {
    this._updateValueCallback = null;
    console.log('[Config] Client unsubscribed');
  }

  _packConfig() {
    const config = this._state.config;
    const buffer = Buffer.alloc(16);
    buffer.writeUInt16LE(config.flexThreshold, 0);
    buffer.writeUInt16LE(config.extThreshold, 2);
    buffer.writeUInt16LE(config.flexGain_x100, 4);
    buffer.writeUInt16LE(config.extGain_x100, 6);
    buffer.writeUInt8(config.preferredMode, 8);
    buffer.writeUInt8(config.flags, 9);
    buffer.writeUInt16LE(config.smoothingAlpha_x1k, 10);
    // bytes 12-15 reserved (zeros)
    return buffer;
  }
}

module.exports = ConfigCharacteristic;
