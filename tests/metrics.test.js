import { describe, it, expect, beforeEach } from 'vitest';

const ClinicalMetricsEngine = require('../src/metrics');

describe('Clinical Metrics Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new ClinicalMetricsEngine();
  });

  describe('Selectivity Index', () => {
    it('is 0 when channels are equal', () => {
      for (let i = 0; i < 100; i++) {
        engine.addSample(500, 500);
      }
      const metrics = engine.calculate();
      expect(metrics[0]).toBeCloseTo(0, 1);
    });

    it('is close to 1 when one channel is zero', () => {
      for (let i = 0; i < 100; i++) {
        engine.addSample(1000, 0);
      }
      const metrics = engine.calculate();
      expect(metrics[0]).toBeCloseTo(1, 1);
    });

    it('is between 0 and 1 for mixed signals', () => {
      for (let i = 0; i < 100; i++) {
        engine.addSample(800, 400);
      }
      const metrics = engine.calculate();
      expect(metrics[0]).toBeGreaterThan(0);
      expect(metrics[0]).toBeLessThan(1);
    });
  });

  describe('Coactivation Ratio', () => {
    it('is 100% when both channels always active', () => {
      engine._flexThreshold = 100;
      engine._extThreshold = 100;
      for (let i = 0; i < 100; i++) {
        engine.addSample(500, 500);
      }
      const metrics = engine.calculate();
      expect(metrics[1]).toBeCloseTo(100, 0);
    });

    it('is 0% when channels never overlap', () => {
      engine._flexThreshold = 100;
      engine._extThreshold = 100;
      for (let i = 0; i < 50; i++) {
        engine.addSample(500, 0); // only flex active
      }
      for (let i = 0; i < 50; i++) {
        engine.addSample(0, 500); // only ext active
      }
      const metrics = engine.calculate();
      expect(metrics[1]).toBeCloseTo(0, 0);
    });
  });

  describe('Fatigue Trend', () => {
    it('detects amplitude decrease', () => {
      // First 100 samples high, last 100 samples low
      for (let i = 0; i < 100; i++) {
        engine.addSample(1000, 1000);
      }
      for (let i = 0; i < 100; i++) {
        engine.addSample(500, 500);
      }
      const metrics = engine.calculate();
      expect(metrics[2]).toBeGreaterThan(40); // ~50% decrease
      expect(metrics[2]).toBeLessThan(60);
    });

    it('is 0 when amplitude is constant', () => {
      for (let i = 0; i < 200; i++) {
        engine.addSample(800, 800);
      }
      const metrics = engine.calculate();
      expect(metrics[2]).toBeCloseTo(0, 0);
    });
  });

  describe('Symmetry Index', () => {
    it('is 100% when channels are equal', () => {
      for (let i = 0; i < 100; i++) {
        engine.addSample(500, 500);
      }
      const metrics = engine.calculate();
      expect(metrics[8]).toBeCloseTo(100, 0);
    });

    it('is less than 100% when channels differ', () => {
      for (let i = 0; i < 100; i++) {
        engine.addSample(1000, 500);
      }
      const metrics = engine.calculate();
      expect(metrics[8]).toBeCloseTo(50, 0);
    });
  });

  describe('Peak values', () => {
    it('tracks peak flexion and extension', () => {
      engine.addSample(100, 200);
      engine.addSample(500, 300);
      engine.addSample(250, 800);
      const metrics = engine.calculate();
      expect(metrics[10]).toBe(500); // peak flex
      expect(metrics[11]).toBe(800); // peak ext
    });
  });

  describe('Mean with gain', () => {
    it('applies gain correctly', () => {
      engine._flexGain = 2.0;
      engine._extGain = 0.5;
      for (let i = 0; i < 100; i++) {
        engine.addSample(400, 400);
      }
      const metrics = engine.calculate();
      expect(metrics[12]).toBeCloseTo(800, 0); // mean flex * 2.0
      expect(metrics[13]).toBeCloseTo(200, 0); // mean ext * 0.5
    });
  });

  describe('Initial and Final Control', () => {
    it('calculates from first and last 50 samples', () => {
      // First 50 samples at 200
      for (let i = 0; i < 50; i++) {
        engine.addSample(200, 200);
      }
      // Middle samples
      for (let i = 0; i < 100; i++) {
        engine.addSample(500, 500);
      }
      // Last 50 samples at 800
      for (let i = 0; i < 50; i++) {
        engine.addSample(800, 800);
      }
      const metrics = engine.calculate();
      expect(metrics[14]).toBeCloseTo(200, 0); // initial
      expect(metrics[15]).toBeCloseTo(800, 0); // final
    });
  });

  describe('Reset', () => {
    it('clears all history and peaks', () => {
      engine.addSample(1000, 1000);
      engine.reset();
      const metrics = engine.calculate();
      expect(metrics[10]).toBe(0); // peak flex reset
      expect(metrics[11]).toBe(0); // peak ext reset
    });
  });

  describe('All metrics are finite', () => {
    it('produces finite values for normal input', () => {
      for (let i = 0; i < 200; i++) {
        engine.addSample(
          Math.random() * 2000,
          Math.random() * 2000
        );
      }
      const metrics = engine.calculate();
      metrics.forEach((m, i) => {
        expect(isFinite(m)).toBe(true);
      });
    });

    it('produces finite values for zero input', () => {
      for (let i = 0; i < 100; i++) {
        engine.addSample(0, 0);
      }
      const metrics = engine.calculate();
      metrics.forEach((m) => {
        expect(isFinite(m)).toBe(true);
      });
    });
  });
});
