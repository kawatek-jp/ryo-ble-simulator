'use strict';

const BaseSignal = require('./base');

/**
 * Contraction burst signal — periodic bursts of high amplitude with rest periods.
 * Simulates intentional muscle contractions.
 */
class BurstSignal extends BaseSignal {
  constructor(options = {}) {
    super(options);
    this.dutyCycle = options.dutyCycle ?? 0.3; // 30% on, 70% off
  }

  _generate() {
    const t = this.tick / 20; // 20 Hz
    const period = 1 / this.frequency;
    const phase = (t % period) / period;

    if (phase < this.dutyCycle) {
      // Active burst — ramp up and sustain
      const burstPhase = phase / this.dutyCycle;
      const envelope = burstPhase < 0.2
        ? burstPhase / 0.2 // ramp up
        : burstPhase > 0.8
          ? (1 - burstPhase) / 0.2 // ramp down
          : 1.0; // sustain
      const value = this.amplitude * envelope;
      return { flex: value, ext: value * 0.8 };
    }

    // Rest period
    return { flex: Math.random() * 30, ext: Math.random() * 30 };
  }
}

module.exports = BurstSignal;
