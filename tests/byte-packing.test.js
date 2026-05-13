import { describe, it, expect } from 'vitest';

const {
  FW_VERSION_MAJOR,
  FW_VERSION_MINOR,
  NUM_ELECTRODES,
  HW_REVISION,
  ADC_MAX,
  SIGNAL_MAX,
  ACTIVE_THRESHOLD,
  SAMPLE_RATE,
} = require('../src/ble/constants');

describe('Byte Packing', () => {
  describe('EMG Stream (8 bytes)', () => {
    it('packs correctly with known values', () => {
      const buffer = Buffer.alloc(8);
      const ext = 1500;
      const flex = 2000;
      const mode = 3;
      const flags = 0x03;
      const packetCount = 42;

      buffer.writeUInt16LE(ext, 0);
      buffer.writeUInt16LE(flex, 2);
      buffer.writeUInt8(mode, 4);
      buffer.writeUInt8(flags, 5);
      buffer.writeUInt16LE(packetCount, 6);

      // Verify unpacking
      expect(buffer.readUInt16LE(0)).toBe(1500);
      expect(buffer.readUInt16LE(2)).toBe(2000);
      expect(buffer.readUInt8(4)).toBe(3);
      expect(buffer.readUInt8(5)).toBe(0x03);
      expect(buffer.readUInt16LE(6)).toBe(42);
      expect(buffer.length).toBe(8);
    });
  });

  describe('Config (16 bytes)', () => {
    it('packs and unpacks correctly (round-trip)', () => {
      const config = {
        flexThreshold: 500,
        extThreshold: 600,
        flexGain_x100: 150,
        extGain_x100: 200,
        preferredMode: 5,
        flags: 0x03,
        smoothingAlpha_x1k: 300,
      };

      // Pack
      const buffer = Buffer.alloc(16);
      buffer.writeUInt16LE(config.flexThreshold, 0);
      buffer.writeUInt16LE(config.extThreshold, 2);
      buffer.writeUInt16LE(config.flexGain_x100, 4);
      buffer.writeUInt16LE(config.extGain_x100, 6);
      buffer.writeUInt8(config.preferredMode, 8);
      buffer.writeUInt8(config.flags, 9);
      buffer.writeUInt16LE(config.smoothingAlpha_x1k, 10);

      // Unpack and verify
      expect(buffer.readUInt16LE(0)).toBe(500);
      expect(buffer.readUInt16LE(2)).toBe(600);
      expect(buffer.readUInt16LE(4)).toBe(150);
      expect(buffer.readUInt16LE(6)).toBe(200);
      expect(buffer.readUInt8(8)).toBe(5);
      expect(buffer.readUInt8(9)).toBe(0x03);
      expect(buffer.readUInt16LE(10)).toBe(300);
      // Reserved bytes should be zero
      expect(buffer.readUInt32LE(12)).toBe(0);
      expect(buffer.length).toBe(16);
    });
  });

  describe('Device Info (20 bytes)', () => {
    it('has correct static values', () => {
      const buffer = Buffer.alloc(20);
      buffer.writeUInt8(FW_VERSION_MAJOR, 0);
      buffer.writeUInt8(FW_VERSION_MINOR, 1);
      buffer.writeUInt8(NUM_ELECTRODES, 2);
      buffer.writeUInt8(HW_REVISION, 3);
      buffer.writeUInt16LE(ADC_MAX, 4);
      buffer.writeUInt16LE(SIGNAL_MAX, 6);
      buffer.writeUInt16LE(ACTIVE_THRESHOLD, 8);
      buffer.writeUInt16LE(SAMPLE_RATE, 10);

      expect(buffer.readUInt8(0)).toBe(3);   // FW major
      expect(buffer.readUInt8(1)).toBe(0);   // FW minor
      expect(buffer.readUInt8(2)).toBe(2);   // electrodes
      expect(buffer.readUInt8(3)).toBe(1);   // HW revision
      expect(buffer.readUInt16LE(4)).toBe(4095);  // ADC_MAX
      expect(buffer.readUInt16LE(6)).toBe(1200);  // SIGNAL_MAX
      expect(buffer.readUInt16LE(8)).toBe(150);   // ACTIVE_THRESHOLD
      expect(buffer.readUInt16LE(10)).toBe(100);  // SAMPLE_RATE
      // Reserved bytes
      for (let i = 12; i < 20; i++) {
        expect(buffer.readUInt8(i)).toBe(0);
      }
      expect(buffer.length).toBe(20);
    });
  });

  describe('Clinical Metrics (64 bytes)', () => {
    it('packs 16 floats to 64 bytes correctly', () => {
      const metrics = [
        0.75,    // selectivity
        45.5,    // coactivation
        12.3,    // fatigue
        3.14,    // control efficiency
        250.0,   // reaction time
        15.7,    // progression
        68.2,    // recruitment
        22.5,    // SNR
        85.0,    // symmetry
        1.5,     // flex/ext ratio
        1200.0,  // peak flex
        900.0,   // peak ext
        600.0,   // mean flex
        450.0,   // mean ext
        400.0,   // initial control
        700.0,   // final control
      ];

      const buffer = Buffer.alloc(64);
      for (let i = 0; i < 16; i++) {
        buffer.writeFloatLE(metrics[i], i * 4);
      }

      expect(buffer.length).toBe(64);

      // Verify round-trip
      for (let i = 0; i < 16; i++) {
        expect(buffer.readFloatLE(i * 4)).toBeCloseTo(metrics[i], 1);
      }
    });
  });

  describe('Session Status (15 bytes)', () => {
    it('packs to 15 bytes correctly', () => {
      const buffer = Buffer.alloc(15);
      const eventId = 0x06; // START_SESSION
      const duration = 120000; // 2 minutes
      const totalPackets = 2400;
      const wormsCaught = 15;
      const rocksHit = 3;
      const reactionEvents = 8;

      buffer.writeUInt8(eventId, 0);
      buffer.writeUInt32LE(duration, 1);
      buffer.writeUInt32LE(totalPackets, 5);
      buffer.writeUInt16LE(wormsCaught, 9);
      buffer.writeUInt16LE(rocksHit, 11);
      buffer.writeUInt16LE(reactionEvents, 13);

      expect(buffer.length).toBe(15);
      expect(buffer.readUInt8(0)).toBe(0x06);
      expect(buffer.readUInt32LE(1)).toBe(120000);
      expect(buffer.readUInt32LE(5)).toBe(2400);
      expect(buffer.readUInt16LE(9)).toBe(15);
      expect(buffer.readUInt16LE(11)).toBe(3);
      expect(buffer.readUInt16LE(13)).toBe(8);
    });
  });
});
