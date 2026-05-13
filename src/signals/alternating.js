'use strict';

const BaseSignal = require('./base');

/**
 * Alternating channels signal — flexion and extension alternate activation.
 * Tests selectivity index and coactivation metrics.
 */
class AlternatingSignal extends BaseSignal {
  _generate() {
    const t = this.tick / 20; // 20 Hz
    const period = 1 / this.frequency;
    const phase = (t % period) / period;

    // First half: flex active, ext at rest
    // Second half: ext active, flex at rest
    if (phase < 0.5) {
      const subPhase = phase / 0.5;
      const envelope = Math.sin(Math.PI * subPhase);
      return {
        flex: this.amplitude * envelope,
        ext: Math.random() * 30,
      };
    } else {
      const subPhase = (phase - 0.5) / 0.5;
      const envelope = Math.sin(Math.PI * subPhase);
      return {
        flex: Math.random() * 30,
        ext: this.amplitude * envelope,
      };
    }
  }
}

module.exports = AlternatingSignal;
