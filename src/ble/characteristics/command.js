'use strict';

const bleno = require('@abandonware/bleno');
const { CHAR_COMMAND } = require('../constants');

/**
 * Command Characteristic (0002)
 * Properties: Write
 * Size: 1-3 bytes
 *
 * Commands:
 * 0x01 OPEN, 0x02 CLOSE, 0x03 STOP, 0x04 HOME, 0x05 CHANGE_MODE
 */

const COMMAND_NAMES = {
  0x01: 'OPEN',
  0x02: 'CLOSE',
  0x03: 'STOP',
  0x04: 'HOME',
  0x05: 'CHANGE_MODE',
};

class CommandCharacteristic extends bleno.Characteristic {
  constructor(simulatorState) {
    super({
      uuid: CHAR_COMMAND,
      properties: ['write'],
      descriptors: [
        new bleno.Descriptor({
          uuid: '2901',
          value: 'Command',
        }),
      ],
    });

    this._state = simulatorState;
    this._lastCommandId = null;
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    // Reject empty writes
    if (!data || data.length === 0) {
      console.log('[Command] Rejected: empty write');
      callback(this.RESULT_UNLIKELY_ERROR);
      return;
    }

    // Cap to first 16 bytes
    const buf = data.slice(0, 16);
    const commandId = buf.readUInt8(0);

    // Reject unknown command IDs
    if (commandId < 0x01 || commandId > 0x05) {
      console.log(`[Command] Rejected: unknown command ID 0x${commandId.toString(16).padStart(2, '0')}`);
      callback(this.RESULT_UNLIKELY_ERROR);
      return;
    }

    // Duplicate suppression (except CHANGE_MODE)
    if (commandId !== 0x05 && commandId === this._lastCommandId) {
      console.log(`[Command] Suppressed duplicate: ${COMMAND_NAMES[commandId]}`);
      callback(this.RESULT_SUCCESS);
      return;
    }

    this._lastCommandId = commandId;
    const name = COMMAND_NAMES[commandId];

    // Handle CHANGE_MODE with mode parameter
    if (commandId === 0x05) {
      const mode = buf.length > 1 ? buf.readUInt8(1) : 0;
      this._state.mode = Math.min(99, mode);
      console.log(`[Command] ${name} → mode=${this._state.mode}`);
    } else {
      console.log(`[Command] ${name}`);
    }

    callback(this.RESULT_SUCCESS);
  }
}

module.exports = CommandCharacteristic;
