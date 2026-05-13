'use strict';

const BaseSignal = require('./base');

/**
 * Fatigue decay signal — starts at high amplitude, gradually decreases over time.
 * Simulates muscle fatigue during a session.
 */
class FatigueSignal extends BaseSignal {
  constructor(options = {}) {
    super(options);
    this.decayRate = options.decayRate ?? 0.02; // amplitude loss per second
  }

  _generate() {
    const elapsed = this._elapsed();
    // Exponential decay: amplitude * e^(-decayRate * t)
    const decayFactor = Math.exp(-this.decayRate * elapsed);
    const currentAmplitude = this.amplitude * decayFactor;

    // Add some variation to make it look like real EMG
    const variation = Math.sin(2 * Math.PI * 2 * this.tick / 20) * 0.15 + 1;
    const flex = currentAmplitude * variation;
    const ext = currentAmplitude * (variation * 0.9);

    return { flex, ext };
  }
}

module.exports = FatigueSignal;
