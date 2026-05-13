'use strict';

/**
 * RYO BLE Simulator — Entry Point
 *
 * Launches the BLE peripheral simulator that emulates the kawable GATT service.
 */

const SignalGeneratorManager = require('./signals');
const { BlePeripheral } = require('./ble');
const ClinicalMetricsEngine = require('./metrics');
const { parseArgs, startInteractiveMode, colors } = require('./cli');

// Parse CLI arguments
const opts = parseArgs(process.argv);

// Simulator shared state
const simulatorState = {
  // Signal generator
  signalGenerator: new SignalGeneratorManager({
    pattern: opts.pattern,
    amplitude: opts.amplitude,
    frequency: opts.frequency,
    noiseLevel: opts.noise,
  }),

  // BLE state
  connected: false,
  mtu: 23,
  mode: 1,
  packetCount: 0,
  lastSample: { flex: 0, ext: 0 },

  // Config (defaults matching firmware)
  config: {
    flexThreshold: 0,
    extThreshold: 0,
    flexGain_x100: 100,
    extGain_x100: 100,
    preferredMode: 1,
    flags: 0,
    smoothingAlpha_x1k: 200,
  },

  // Session state
  session: {
    startTime: null,
    active: false,
    wormsCaught: 0,
    rocksHit: 0,
    reactionEvents: 0,
    reactionTimes: [],
  },

  // Metrics (16 floats)
  metrics: new Array(16).fill(0),

  // Metrics engine instance
  metricsEngine: null,
};

console.log(colors.cyan('RYO BLE Simulator v0.1.0'));
console.log(`Pattern: ${opts.pattern} | Amplitude: ${opts.amplitude} | Frequency: ${opts.frequency} Hz | Noise: ${opts.noise}`);
console.log('Starting BLE peripheral...');

// Initialize metrics engine
const metricsEngine = new ClinicalMetricsEngine();
simulatorState.metricsEngine = metricsEngine;

// Feed samples to metrics engine and update metrics at 1 Hz
setInterval(() => {
  const sample = simulatorState.lastSample;
  if (sample) {
    metricsEngine.addSample(sample.flex, sample.ext);
  }
  metricsEngine.updateConfig(simulatorState.config);
  metricsEngine.updateSession(simulatorState.session);
  simulatorState.metrics = metricsEngine.calculate();
}, 1000);

// Start BLE peripheral
const peripheral = new BlePeripheral(simulatorState);
peripheral.start();

// Start interactive CLI
const rl = startInteractiveMode(simulatorState);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  peripheral.stop();
  if (rl) rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  peripheral.stop();
  if (rl) rl.close();
  process.exit(0);
});
