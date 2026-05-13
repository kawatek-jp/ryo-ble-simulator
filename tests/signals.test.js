import { describe, it, expect, beforeEach } from 'vitest';

// Use require for CommonJS modules
const SignalGeneratorManager = require('../src/signals');
const RestSignal = require('../src/signals/rest');
const SineSignal = require('../src/signals/sine');
const BurstSignal = require('../src/signals/burst');
const FatigueSignal = require('../src/signals/fatigue');
const AlternatingSignal = require('../src/signals/alternating');
const RandomWalkSignal = require('../src/signals/random-walk');

describe('Signal Generators', () => {
  describe('All patterns produce values in [0, 4095]', () => {
    const patterns = [
      ['RestSignal', RestSignal],
      ['SineSignal', SineSignal],
      ['BurstSignal', BurstSignal],
      ['FatigueSignal', FatigueSignal],
      ['AlternatingSignal', AlternatingSignal],
      ['RandomWalkSignal', RandomWalkSignal],
    ];

    patterns.forEach(([name, SignalClass]) => {
      it(`${name} stays within [0, 4095]`, () => {
        const gen = new SignalClass({ amplitude: 4095, noiseLevel: 200 });
        for (let i = 0; i < 500; i++) {
          const sample = gen.next();
          expect(sample.flex).toBeGreaterThanOrEqual(0);
          expect(sample.flex).toBeLessThanOrEqual(4095);
          expect(sample.ext).toBeGreaterThanOrEqual(0);
          expect(sample.ext).toBeLessThanOrEqual(4095);
        }
      });
    });
  });

  describe('SineSignal', () => {
    it('produces sinusoidal output with correct frequency', () => {
      const gen = new SineSignal({ amplitude: 1000, frequency: 1.0, noiseLevel: 0 });
      // At 20 Hz sample rate, one full cycle = 20 samples
      const samples = [];
      for (let i = 0; i < 20; i++) {
        samples.push(gen.next().flex);
      }
      // First sample should be near amplitude/2 (sin(0) = 0, mapped to midpoint)
      expect(samples[0]).toBeCloseTo(500, -1);
      // At quarter cycle (sample 5), should be near peak
      expect(samples[5]).toBeGreaterThan(800);
    });

    it('respects amplitude setting', () => {
      const gen = new SineSignal({ amplitude: 2000, frequency: 1.0, noiseLevel: 0 });
      let max = 0;
      for (let i = 0; i < 100; i++) {
        const s = gen.next();
        max = Math.max(max, s.flex);
      }
      expect(max).toBeLessThanOrEqual(2000);
      expect(max).toBeGreaterThan(1500);
    });
  });

  describe('BurstSignal', () => {
    it('has correct duty cycle behavior', () => {
      const gen = new BurstSignal({ amplitude: 1000, frequency: 1.0, noiseLevel: 0, dutyCycle: 0.5 });
      // Over one full cycle (20 samples at 20 Hz), roughly half should be high
      let highCount = 0;
      for (let i = 0; i < 20; i++) {
        const s = gen.next();
        if (s.flex > 100) highCount++;
      }
      // With 50% duty cycle, expect roughly 8-12 high samples (allowing for ramp)
      expect(highCount).toBeGreaterThan(5);
      expect(highCount).toBeLessThan(15);
    });
  });

  describe('FatigueSignal', () => {
    it('decays over time', () => {
      const gen = new FatigueSignal({ amplitude: 1000, frequency: 1.0, noiseLevel: 0, decayRate: 0.1 });
      // Get early samples
      const early = [];
      for (let i = 0; i < 10; i++) early.push(gen.next().flex);

      // Advance time by manipulating startTime
      gen.startTime = Date.now() - 30000; // pretend 30 seconds passed

      const late = [];
      for (let i = 0; i < 10; i++) late.push(gen.next().flex);

      const earlyMean = early.reduce((a, b) => a + b, 0) / early.length;
      const lateMean = late.reduce((a, b) => a + b, 0) / late.length;

      expect(lateMean).toBeLessThan(earlyMean);
    });
  });

  describe('Noise injection', () => {
    it('stays within configured bounds', () => {
      const gen = new SineSignal({ amplitude: 2000, noiseLevel: 100 });
      // Run many samples — noise should never push outside [0, 4095]
      for (let i = 0; i < 1000; i++) {
        const s = gen.next();
        expect(s.flex).toBeGreaterThanOrEqual(0);
        expect(s.flex).toBeLessThanOrEqual(4095);
      }
    });

    it('zero noise produces deterministic output', () => {
      const gen1 = new SineSignal({ amplitude: 1000, frequency: 1.0, noiseLevel: 0 });
      const gen2 = new SineSignal({ amplitude: 1000, frequency: 1.0, noiseLevel: 0 });
      for (let i = 0; i < 20; i++) {
        expect(gen1.next().flex).toBe(gen2.next().flex);
      }
    });
  });

  describe('SignalGeneratorManager', () => {
    let mgr;

    beforeEach(() => {
      mgr = new SignalGeneratorManager({ pattern: 'sine', amplitude: 800 });
    });

    it('lists all available patterns', () => {
      const patterns = SignalGeneratorManager.getPatterns();
      expect(patterns).toContain('rest');
      expect(patterns).toContain('sine');
      expect(patterns).toContain('burst');
      expect(patterns).toContain('fatigue');
      expect(patterns).toContain('alternating');
      expect(patterns).toContain('random');
    });

    it('switches patterns at runtime', () => {
      mgr.setPattern('rest');
      const restSample = mgr.next();
      expect(restSample.flex).toBeLessThan(300); // rest is low amplitude

      mgr.setPattern('sine');
      // Should not throw
      const sineSample = mgr.next();
      expect(sineSample.flex).toBeDefined();
    });

    it('throws on unknown pattern', () => {
      expect(() => mgr.setPattern('invalid')).toThrow('Unknown pattern');
    });

    it('clamps amplitude to valid range', () => {
      mgr.setAmplitude(5000);
      expect(mgr.amplitude).toBe(4095);
      mgr.setAmplitude(-10);
      expect(mgr.amplitude).toBe(0);
    });
  });
});
