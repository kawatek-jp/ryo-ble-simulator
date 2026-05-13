'use strict';

/**
 * RYO BLE Simulator — Entry Point
 *
 * Launches the BLE peripheral simulator that emulates the kawable GATT service.
 */

console.log('RYO BLE Simulator v0.1.0');
console.log('Starting...');

// Placeholder — BLE service, signal generators, and CLI will be wired here.
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
