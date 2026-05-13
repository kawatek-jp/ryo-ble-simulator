'use strict';

/**
 * RYO BLE Simulator — Entry Point
 *
 * Launches the BLE peripheral simulator that emulates the kawable GATT service.
 */

const SignalGeneratorManager = require('./signals');
const { BlePeripheral } = require('./ble');

// Simulator shared state
const simulatorState = {
  // Signal generator
  signalGenerator: new SignalGeneratorManager({ pattern: 'sine', amplitude: 800 }),

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
};

console.log('RYO BLE Simulator v0.1.0');
console.log('Starting BLE peripheral...');

const peripheral = new BlePeripheral(simulatorState);
peripheral.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  peripheral.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  peripheral.stop();
  process.exit(0);
});
