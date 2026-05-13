'use strict';

const BaseSignal = require('./base');

/**
 * Random walk signal — smoothly varying random signal.
 * Tests app responsiveness to unpredictable input.
 */
class RandomWalkSignal extends BaseSignal {
  constructor(options = {}) {
    super(options);
    this._flexValue = this.amplitude / 2;
    this._extValue = this.amplitude / 2;
    this._stepSize = options.stepSize ?? 40;
  }

  _generate() {
    // Random walk with mean reversion toward amplitude/2
    const target = this.amplitude / 2;
    const reversion = 0.02;

    this._flexValue += (Math.random() - 0.5) * 2 * this._stepSize;
    this._flexValue += (target - this._flexValue) * reversion;
    this._flexValue = Math.max(0, Math.min(this.amplitude, this._flexValue));

    this._extValue += (Math.random() - 0.5) * 2 * this._stepSize;
    this._extValue += (target - this._extValue) * reversion;
    this._extValue = Math.max(0, Math.min(this.amplitude, this._extValue));

    return { flex: this._flexValue, ext: this._extValue };
  }
}

module.exports = RandomWalkSignal;
