'use strict';

const RestSignal = require('./rest');
const SineSignal = require('./sine');
const BurstSignal = require('./burst');
const FatigueSignal = require('./fatigue');
const AlternatingSignal = require('./alternating');
const RandomWalkSignal = require('./random-walk');

const PATTERNS = {
  rest: RestSignal,
  sine: SineSignal,
  burst: BurstSignal,
  fatigue: FatigueSignal,
  alternating: AlternatingSignal,
  random: RandomWalkSignal,
};

/**
 * Signal generator manager.
 * Handles pattern switching and parameter configuration.
 */
class SignalGeneratorManager {
  constructor(options = {}) {
    this.amplitude = options.amplitude ?? 800;
    this.frequency = options.frequency ?? 1.0;
    this.noiseLevel = options.noiseLevel ?? 20;
    this.patternName = options.pattern ?? 'sine';

    this._generator = this._createGenerator(this.patternName);
  }

  /** Get the current pattern name */
  get pattern() {
    return this.patternName;
  }

  /** Switch to a different signal pattern */
  setPattern(name) {
    if (!PATTERNS[name]) {
      throw new Error(`Unknown pattern: ${name}. Available: ${Object.keys(PATTERNS).join(', ')}`);
    }
    this.patternName = name;
    this._generator = this._createGenerator(name);
  }

  /** Set signal amplitude (0-4095) */
  setAmplitude(value) {
    this.amplitude = Math.max(0, Math.min(4095, value));
    this._generator.setAmplitude(this.amplitude);
  }

  /** Set signal frequency in Hz */
  setFrequency(value) {
    this.frequency = Math.max(0.1, Math.min(10, value));
    this._generator.setFrequency(this.frequency);
  }

  /** Set noise level (0-200) */
  setNoiseLevel(value) {
    this.noiseLevel = Math.max(0, Math.min(200, value));
    this._generator.setNoiseLevel(this.noiseLevel);
  }

  /**
   * Generate the next sample pair.
   * @returns {{ flex: number, ext: number }} Values in [0, 4095]
   */
  next() {
    return this._generator.next();
  }

  /** Get list of available pattern names */
  static getPatterns() {
    return Object.keys(PATTERNS);
  }

  _createGenerator(name) {
    const GeneratorClass = PATTERNS[name];
    return new GeneratorClass({
      amplitude: this.amplitude,
      frequency: this.frequency,
      noiseLevel: this.noiseLevel,
    });
  }
}

module.exports = SignalGeneratorManager;
module.exports.PATTERNS = PATTERNS;
