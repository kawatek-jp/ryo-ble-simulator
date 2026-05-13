'use strict';

/**
 * Clinical Metrics Engine
 *
 * Calculates 16 clinical metrics at 1 Hz, matching the firmware algorithms.
 * Uses a circular buffer of 1000 samples for history.
 *
 * Metrics (16 floats = 64 bytes):
 * [0]  Selectivity Index (0-1)
 * [1]  Coactivation Ratio (0-100%)
 * [2]  Fatigue Trend (0-100%)
 * [3]  Control Efficiency
 * [4]  Reaction Time (ms)
 * [5]  Progression Rate (%)
 * [6]  Motor Unit Recruitment (%)
 * [7]  Signal-to-Noise Ratio (dB)
 * [8]  Symmetry Index (0-100%)
 * [9]  Flexion/Extension Ratio
 * [10] Peak Flexion
 * [11] Peak Extension
 * [12] Mean Flexion (with gain)
 * [13] Mean Extension (with gain)
 * [14] Initial Control
 * [15] Final Control
 */

const HISTORY_SIZE = 1000;
const INITIAL_SAMPLES = 50;
const FATIGUE_WINDOW = 100;

class ClinicalMetricsEngine {
  constructor() {
    this._flexHistory = [];
    this._extHistory = [];
    this._historyIndex = 0;
    this._totalSamples = 0;

    // Session game data
    this._wormsCaught = 0;
    this._rocksHit = 0;
    this._sessionStartTime = null;
    this._reactionTimes = [];

    // Config (gains and thresholds)
    this._flexGain = 1.0;
    this._extGain = 1.0;
    this._flexThreshold = 0;
    this._extThreshold = 0;

    // Peak tracking
    this._peakFlex = 0;
    this._peakExt = 0;
  }

  /** Update config values from simulator state */
  updateConfig(config) {
    this._flexGain = (config.flexGain_x100 || 100) / 100;
    this._extGain = (config.extGain_x100 || 100) / 100;
    this._flexThreshold = config.flexThreshold || 0;
    this._extThreshold = config.extThreshold || 0;
  }

  /** Update session data for metrics that depend on game events */
  updateSession(session) {
    this._wormsCaught = session.wormsCaught || 0;
    this._rocksHit = session.rocksHit || 0;
    this._sessionStartTime = session.startTime;
    this._reactionTimes = session.reactionTimes || [];
  }

  /** Add a new sample to the history buffer */
  addSample(flex, ext) {
    if (this._flexHistory.length < HISTORY_SIZE) {
      this._flexHistory.push(flex);
      this._extHistory.push(ext);
    } else {
      this._flexHistory[this._historyIndex] = flex;
      this._extHistory[this._historyIndex] = ext;
    }
    this._historyIndex = (this._historyIndex + 1) % HISTORY_SIZE;
    this._totalSamples++;

    // Track peaks
    if (flex > this._peakFlex) this._peakFlex = flex;
    if (ext > this._peakExt) this._peakExt = ext;
  }

  /** Calculate all 16 metrics and return as array of floats */
  calculate() {
    const metrics = new Array(16).fill(0);
    const count = Math.min(this._totalSamples, HISTORY_SIZE);

    if (count === 0) return metrics;

    const flexArr = this._getOrderedHistory(this._flexHistory, count);
    const extArr = this._getOrderedHistory(this._extHistory, count);

    metrics[0] = this._selectivityIndex(flexArr, extArr);
    metrics[1] = this._coactivationRatio(flexArr, extArr);
    metrics[2] = this._fatigueTrend(flexArr, extArr);
    metrics[3] = this._controlEfficiency();
    metrics[4] = this._reactionTime();
    metrics[5] = this._progressionRate(flexArr);
    metrics[6] = this._motorUnitRecruitment(flexArr, extArr);
    metrics[7] = this._signalToNoiseRatio(flexArr, extArr);
    metrics[8] = this._symmetryIndex(flexArr, extArr);
    metrics[9] = this._flexExtRatio(flexArr, extArr);
    metrics[10] = this._peakFlex;
    metrics[11] = this._peakExt;
    metrics[12] = this._meanWithGain(flexArr, this._flexGain);
    metrics[13] = this._meanWithGain(extArr, this._extGain);
    metrics[14] = this._initialControl(flexArr);
    metrics[15] = this._finalControl(flexArr);

    return metrics;
  }

  /** Reset all history and metrics */
  reset() {
    this._flexHistory = [];
    this._extHistory = [];
    this._historyIndex = 0;
    this._totalSamples = 0;
    this._peakFlex = 0;
    this._peakExt = 0;
    this._wormsCaught = 0;
    this._rocksHit = 0;
    this._sessionStartTime = null;
    this._reactionTimes = [];
  }

  // --- Private metric calculations ---

  /** Selectivity Index: ability to isolate one channel (0-1) */
  _selectivityIndex(flex, ext) {
    const meanFlex = this._mean(flex);
    const meanExt = this._mean(ext);
    const total = meanFlex + meanExt;
    if (total === 0) return 0;
    return Math.abs(meanFlex - meanExt) / total;
  }

  /** Coactivation Ratio: % of time both channels active simultaneously */
  _coactivationRatio(flex, ext) {
    let coactive = 0;
    const count = flex.length;
    for (let i = 0; i < count; i++) {
      if (flex[i] > this._flexThreshold && ext[i] > this._extThreshold) {
        coactive++;
      }
    }
    return count > 0 ? (coactive / count) * 100 : 0;
  }

  /** Fatigue Trend: % amplitude decrease (compare first 100 vs last 100 active samples) */
  _fatigueTrend(flex, ext) {
    const count = flex.length;
    if (count < FATIGUE_WINDOW * 2) return 0;

    const firstWindow = flex.slice(0, FATIGUE_WINDOW);
    const lastWindow = flex.slice(count - FATIGUE_WINDOW);

    const firstMean = this._mean(firstWindow);
    const lastMean = this._mean(lastWindow);

    if (firstMean === 0) return 0;
    const decrease = ((firstMean - lastMean) / firstMean) * 100;
    return Math.max(0, Math.min(100, decrease));
  }

  /** Control Efficiency: (worms - 2*rocks) / minutes */
  _controlEfficiency() {
    if (!this._sessionStartTime) return 0;
    const minutes = (Date.now() - this._sessionStartTime) / 60000;
    if (minutes < 0.01) return 0;
    return (this._wormsCaught - 2 * this._rocksHit) / minutes;
  }

  /** Reaction Time: average reaction time in ms */
  _reactionTime() {
    if (this._reactionTimes.length === 0) return 0;
    return this._mean(this._reactionTimes);
  }

  /** Progression Rate: % improvement initial vs final control */
  _progressionRate(flex) {
    const initial = this._initialControl(flex);
    const final = this._finalControl(flex);
    if (initial === 0) return 0;
    return ((final - initial) / initial) * 100;
  }

  /** Motor Unit Recruitment: % of ADC range used */
  _motorUnitRecruitment(flex, ext) {
    const maxVal = Math.max(...flex, ...ext);
    const minVal = Math.min(...flex, ...ext);
    return ((maxVal - minVal) / 4095) * 100;
  }

  /** Signal-to-Noise Ratio: 10*log10(signalPower + 1) */
  _signalToNoiseRatio(flex, ext) {
    const combined = flex.map((f, i) => (f + ext[i]) / 2);
    const mean = this._mean(combined);
    const signalPower = combined.reduce((sum, v) => sum + (v - mean) ** 2, 0) / combined.length;
    return 10 * Math.log10(signalPower + 1);
  }

  /** Symmetry Index: balance between channels (0-100%) */
  _symmetryIndex(flex, ext) {
    const meanFlex = this._mean(flex);
    const meanExt = this._mean(ext);
    const maxMean = Math.max(meanFlex, meanExt);
    if (maxMean === 0) return 100;
    const minMean = Math.min(meanFlex, meanExt);
    return (minMean / maxMean) * 100;
  }

  /** Flexion/Extension Ratio: meanFlex / meanExt */
  _flexExtRatio(flex, ext) {
    const meanFlex = this._mean(flex);
    const meanExt = this._mean(ext);
    if (meanExt === 0) return 0;
    return meanFlex / meanExt;
  }

  /** Mean with gain applied */
  _meanWithGain(arr, gain) {
    return this._mean(arr) * gain;
  }

  /** Initial Control: average amplitude of first 50 samples */
  _initialControl(arr) {
    if (arr.length < INITIAL_SAMPLES) return this._mean(arr);
    return this._mean(arr.slice(0, INITIAL_SAMPLES));
  }

  /** Final Control: average amplitude of last 50 samples */
  _finalControl(arr) {
    if (arr.length < INITIAL_SAMPLES) return this._mean(arr);
    return this._mean(arr.slice(arr.length - INITIAL_SAMPLES));
  }

  // --- Utility ---

  _mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
  }

  /** Get history in chronological order */
  _getOrderedHistory(buffer, count) {
    if (count <= buffer.length && this._totalSamples <= HISTORY_SIZE) {
      return buffer.slice(0, count);
    }
    // Circular buffer: reorder from oldest to newest
    const start = this._historyIndex;
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(buffer[(start + i) % HISTORY_SIZE]);
    }
    return result;
  }
}

module.exports = ClinicalMetricsEngine;
