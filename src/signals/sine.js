'use strict';

const BaseSignal = require('./base');

/**
 * Sine wave signal — smooth sinusoidal for both channels.
 * Good for testing real-time graph rendering.
 */
class SineSignal extends BaseSignal {
  _generate() {
    const t = this.tick / 20; // 20 Hz sample rate assumed
    const value = (Math.sin(2 * Math.PI * this.frequency * t) + 1) / 2 * this.amplitude;
    // Offset extension slightly for visual distinction
    const extValue = (Math.sin(2 * Math.PI * this.frequency * t + Math.PI / 4) + 1) / 2 * this.amplitude;
    return { flex: value, ext: extValue };
  }
}

module.exports = SineSignal;
