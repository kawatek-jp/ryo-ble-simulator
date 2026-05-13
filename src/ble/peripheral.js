'use strict';

const bleno = require('@abandonware/bleno');
const { SERVICE_UUID, DEVICE_NAME } = require('./constants');
const { createRyoService } = require('./service');

/**
 * BLE Peripheral manager.
 * Handles advertising, connection events, and service registration.
 */
class BlePeripheral {
  constructor(simulatorState) {
    this._state = simulatorState;
    this._service = null;
    this._characteristics = null;
    this._isAdvertising = false;

    this._setupEventHandlers();
  }

  /** Start the BLE peripheral */
  start() {
    console.log(`[BLE] Initializing peripheral as "${DEVICE_NAME}"...`);
    // bleno will emit 'stateChange' when ready
  }

  /** Stop advertising and clean up */
  stop() {
    if (this._isAdvertising) {
      bleno.stopAdvertising();
      this._isAdvertising = false;
    }
    console.log('[BLE] Peripheral stopped');
  }

  _setupEventHandlers() {
    bleno.on('stateChange', (state) => {
      console.log(`[BLE] Adapter state: ${state}`);
      if (state === 'poweredOn') {
        this._startAdvertising();
      } else {
        if (this._isAdvertising) {
          bleno.stopAdvertising();
          this._isAdvertising = false;
        }
      }
    });

    bleno.on('advertisingStart', (error) => {
      if (error) {
        console.error('[BLE] Advertising start error:', error);
        return;
      }
      this._isAdvertising = true;
      console.log('[BLE] Advertising started');

      // Set up the GATT service
      const { service, characteristics } = createRyoService(this._state);
      this._service = service;
      this._characteristics = characteristics;

      bleno.setServices([service], (err) => {
        if (err) {
          console.error('[BLE] Set services error:', err);
        } else {
          console.log('[BLE] GATT service registered');
        }
      });
    });

    bleno.on('accept', (clientAddress) => {
      this._state.connected = true;
      console.log(`[BLE] Client connected: ${clientAddress}`);
    });

    bleno.on('disconnect', (clientAddress) => {
      this._state.connected = false;
      console.log(`[BLE] Client disconnected: ${clientAddress}`);
      // Re-advertise after disconnect
      this._startAdvertising();
    });

    bleno.on('mtuChange', (mtu) => {
      this._state.mtu = mtu;
      console.log(`[BLE] MTU changed: ${mtu}`);
    });
  }

  _startAdvertising() {
    console.log('[BLE] Starting advertising...');
    bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID], (error) => {
      if (error) {
        console.error('[BLE] Start advertising error:', error);
      }
    });
  }
}

module.exports = BlePeripheral;
