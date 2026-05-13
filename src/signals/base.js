'use strict';

const ADC_MAX = 4095;

/**
 * Base class for all signal generators.
 * Subclasses must implement _generate() returning { flex, ext }.
 */
class BaseSignal {
  constructor(options = {}) {
    this.amplitude = options.amplitude ?? 800;
    this.frequency = options.frequency ?? 1.0;
    this.noiseLevel = options.noiseLevel ?? 20;
    this.tick = 0;
    this.startTime = Date.now();
  }

  setAmplitude(value) {
    this.amplitude = value;
  }

  setFrequency(value) {
    this.frequency = value;
  }

  setNoiseLevel(value) {
    this.noiseLevel = value;
  }

  /**
   * Generate next sample pair with noise and clamping.
   * @returns {{ flex: number, ext: number }}
   */
  next() {
    const raw = this._generate();
    this.tick++;
    return {
      flex: this._clamp(raw.flex + this._noise()),
      ext: this._clamp(raw.ext + this._noise()),
    };
  }

  /** Subclasses implement this to produce raw signal values */
  _generate() {
    throw new Error('Subclass must implement _generate()');
  }

  /** Add random noise within configured level */
  _noise() {
    if (this.noiseLevel === 0) return 0;
    return Math.round((Math.random() - 0.5) * 2 * this.noiseLevel);
  }

  /** Clamp value to valid ADC range [0, 4095] */
  _clamp(value) {
    return Math.max(0, Math.min(ADC_MAX, Math.round(value)));
  }

  /** Get elapsed time in seconds since generator was created */
  _elapsed() {
    return (Date.now() - this.startTime) / 1000;
  }
}

module.exports = BaseSignal;
module.exports.ADC_MAX = ADC_MAX;
