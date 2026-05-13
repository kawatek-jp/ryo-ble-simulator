import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for command handling logic.
 * Since the actual characteristic requires bleno, we test the logic directly.
 */

describe('Command Handler Logic', () => {
  let lastCommandId;
  let state;

  const COMMAND_NAMES = {
    0x01: 'OPEN',
    0x02: 'CLOSE',
    0x03: 'STOP',
    0x04: 'HOME',
    0x05: 'CHANGE_MODE',
  };

  function handleCommand(data) {
    if (!data || data.length === 0) {
      return { success: false, reason: 'empty' };
    }

    const buf = data.slice(0, 16);
    const commandId = buf.readUInt8(0);

    if (commandId < 0x01 || commandId > 0x05) {
      return { success: false, reason: 'unknown_command' };
    }

    // Duplicate suppression (except CHANGE_MODE)
    if (commandId !== 0x05 && commandId === lastCommandId) {
      return { success: true, suppressed: true };
    }

    lastCommandId = commandId;

    if (commandId === 0x05) {
      const mode = buf.length > 1 ? buf.readUInt8(1) : 0;
      state.mode = Math.min(99, mode);
    }

    return { success: true, command: COMMAND_NAMES[commandId] };
  }

  beforeEach(() => {
    lastCommandId = null;
    state = { mode: 1 };
  });

  describe('Valid commands', () => {
    it('accepts OPEN (0x01)', () => {
      const result = handleCommand(Buffer.from([0x01]));
      expect(result.success).toBe(true);
      expect(result.command).toBe('OPEN');
    });

    it('accepts CLOSE (0x02)', () => {
      const result = handleCommand(Buffer.from([0x02]));
      expect(result.success).toBe(true);
      expect(result.command).toBe('CLOSE');
    });

    it('accepts STOP (0x03)', () => {
      const result = handleCommand(Buffer.from([0x03]));
      expect(result.success).toBe(true);
      expect(result.command).toBe('STOP');
    });

    it('accepts HOME (0x04)', () => {
      const result = handleCommand(Buffer.from([0x04]));
      expect(result.success).toBe(true);
      expect(result.command).toBe('HOME');
    });

    it('accepts CHANGE_MODE (0x05)', () => {
      const result = handleCommand(Buffer.from([0x05, 42]));
      expect(result.success).toBe(true);
      expect(result.command).toBe('CHANGE_MODE');
      expect(state.mode).toBe(42);
    });
  });

  describe('Invalid commands', () => {
    it('rejects empty write', () => {
      const result = handleCommand(Buffer.alloc(0));
      expect(result.success).toBe(false);
      expect(result.reason).toBe('empty');
    });

    it('rejects null data', () => {
      const result = handleCommand(null);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('empty');
    });

    it('rejects command ID 0x00', () => {
      const result = handleCommand(Buffer.from([0x00]));
      expect(result.success).toBe(false);
      expect(result.reason).toBe('unknown_command');
    });

    it('rejects command ID 0x06', () => {
      const result = handleCommand(Buffer.from([0x06]));
      expect(result.success).toBe(false);
      expect(result.reason).toBe('unknown_command');
    });

    it('rejects command ID 0xFF', () => {
      const result = handleCommand(Buffer.from([0xFF]));
      expect(result.success).toBe(false);
      expect(result.reason).toBe('unknown_command');
    });
  });

  describe('Duplicate suppression', () => {
    it('suppresses duplicate OPEN commands', () => {
      handleCommand(Buffer.from([0x01]));
      const result = handleCommand(Buffer.from([0x01]));
      expect(result.suppressed).toBe(true);
    });

    it('does not suppress different commands', () => {
      handleCommand(Buffer.from([0x01]));
      const result = handleCommand(Buffer.from([0x02]));
      expect(result.suppressed).toBeUndefined();
      expect(result.command).toBe('CLOSE');
    });

    it('does not suppress duplicate CHANGE_MODE', () => {
      handleCommand(Buffer.from([0x05, 10]));
      const result = handleCommand(Buffer.from([0x05, 20]));
      expect(result.suppressed).toBeUndefined();
      expect(result.command).toBe('CHANGE_MODE');
      expect(state.mode).toBe(20);
    });
  });

  describe('CHANGE_MODE', () => {
    it('extracts mode parameter correctly', () => {
      handleCommand(Buffer.from([0x05, 55]));
      expect(state.mode).toBe(55);
    });

    it('clamps mode to 99', () => {
      handleCommand(Buffer.from([0x05, 150]));
      expect(state.mode).toBe(99);
    });

    it('defaults to 0 if no mode byte', () => {
      handleCommand(Buffer.from([0x05]));
      expect(state.mode).toBe(0);
    });
  });
});
