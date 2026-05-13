'use strict';

const bleno = require('@abandonware/bleno');
const { CHAR_CLINICAL_METRICS } = require('../constants');

/**
 * Clinical Metrics Characteristic (0005)
 * Properties: Read, Notify
 * Size: 64 bytes (16 floats, little-endian IEEE 754)
 *
 * Notifies at 1 Hz when connected.
 * Actual metrics calculation will be implemented in the metrics engine.
 * This characteristic provides the BLE transport layer.
 */
class ClinicalMetricsCharacteristic extends bleno.Characteristic {
  constructor(simulatorState) {
    super({
      uuid: CHAR_CLINICAL_METRICS,
      properties: ['read', 'notify'],
      descriptors: [
        new bleno.Descriptor({
          uuid: '2901',
          value: 'Clinical Metrics',
        }),
      ],
    });

    this._state = simulatorState;
    this._updateValueCallback = null;
    this._notifyInterval = null;
  }

  onReadRequest(offset, callback) {
    const buffer = this._packMetrics();
    callback(this.RESULT_SUCCESS, buffer);
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    this._updateValueCallback = updateValueCallback;
    // Notify at 1 Hz
    this._notifyInterval = setInterval(() => {
      if (this._updateValueCallback) {
        const buffer = this._packMetrics();
        this._updateValueCallback(buffer);
      }
    }, 1000);
    console.log('[Clinical Metrics] Client subscribed (1 Hz notifications)');
  }

  onUnsubscribe() {
    if (this._notifyInterval) {
      clearInterval(this._notifyInterval);
      this._notifyInterval = null;
    }
    this._updateValueCallback = null;
    console.log('[Clinical Metrics] Client unsubscribed');
  }

  _packMetrics() {
    // Pack 16 floats into 64 bytes (little-endian)
    const buffer = Buffer.alloc(64);
    const metrics = this._state.metrics || new Array(16).fill(0);
    for (let i = 0; i < 16; i++) {
      buffer.writeFloatLE(metrics[i] || 0, i * 4);
    }
    return buffer;
  }
}

module.exports = ClinicalMetricsCharacteristic;
