'use strict';

const bleno = require('@abandonware/bleno');
const { CHAR_SESSION_CONTROL } = require('../constants');

/**
 * Session Control Characteristic (0006)
 * Properties: Read, Write, Notify
 * Size: 1-15 bytes
 *
 * Session Actions (write byte 0):
 * 0x01 RESET, 0x02 REQUEST_REPORT, 0x03 GAME_WORM,
 * 0x04 GAME_ROCK, 0x05 GAME_REACTION, 0x06 START_SESSION, 0x07 STOP_SESSION
 *
 * Session Status Notification (15 bytes):
 * [0]    eventId (uint8)
 * [1-4]  duration (uint32 LE, ms)
 * [5-8]  totalPackets (uint32 LE)
 * [9-10] wormsCaught (uint16 LE)
 * [11-12] rocksHit (uint16 LE)
 * [13-14] reactionEvents (uint16 LE)
 */

const SESSION_ACTIONS = {
  0x01: 'RESET',
  0x02: 'REQUEST_REPORT',
  0x03: 'GAME_WORM',
  0x04: 'GAME_ROCK',
  0x05: 'GAME_REACTION',
  0x06: 'START_SESSION',
  0x07: 'STOP_SESSION',
};

class SessionControlCharacteristic extends bleno.Characteristic {
  constructor(simulatorState) {
    super({
      uuid: CHAR_SESSION_CONTROL,
      properties: ['read', 'write', 'notify'],
      descriptors: [
        new bleno.Descriptor({
          uuid: '2901',
          value: 'Session Control',
        }),
      ],
    });

    this._state = simulatorState;
    this._updateValueCallback = null;
  }

  onReadRequest(offset, callback) {
    const buffer = this._packStatus(0x00);
    callback(this.RESULT_SUCCESS, buffer);
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    if (!data || data.length === 0) {
      console.log('[Session] Rejected: empty write');
      callback(this.RESULT_UNLIKELY_ERROR);
      return;
    }

    const actionId = data.readUInt8(0);

    if (actionId < 0x01 || actionId > 0x07) {
      console.log(`[Session] Rejected: unknown action 0x${actionId.toString(16).padStart(2, '0')}`);
      callback(this.RESULT_UNLIKELY_ERROR);
      return;
    }

    const actionName = SESSION_ACTIONS[actionId];
    const session = this._state.session;

    switch (actionId) {
      case 0x01: // RESET
        this._resetSession();
        console.log('[Session] RESET');
        this._notifyStatus(actionId);
        break;

      case 0x02: // REQUEST_REPORT
        console.log('[Session] REQUEST_REPORT');
        this._notifyStatus(actionId);
        break;

      case 0x03: // GAME_WORM
        session.wormsCaught++;
        console.log(`[Session] GAME_WORM (total: ${session.wormsCaught})`);
        break;

      case 0x04: // GAME_ROCK
        session.rocksHit++;
        console.log(`[Session] GAME_ROCK (total: ${session.rocksHit})`);
        break;

      case 0x05: // GAME_REACTION
        if (data.length >= 5) {
          const reactionTime = data.readFloatLE(1);
          if (reactionTime >= 0 && reactionTime <= 60000) {
            session.reactionTimes.push(reactionTime);
            session.reactionEvents++;
            console.log(`[Session] GAME_REACTION: ${reactionTime.toFixed(1)} ms`);
          } else {
            console.log(`[Session] GAME_REACTION rejected: ${reactionTime} ms out of range`);
          }
        }
        break;

      case 0x06: // START_SESSION
        this._resetSession();
        session.startTime = Date.now();
        session.active = true;
        console.log('[Session] START_SESSION');
        this._notifyStatus(actionId);
        break;

      case 0x07: // STOP_SESSION
        session.active = false;
        console.log('[Session] STOP_SESSION');
        this._notifyStatus(actionId);
        break;
    }

    callback(this.RESULT_SUCCESS);
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    this._updateValueCallback = updateValueCallback;
    console.log('[Session] Client subscribed');
  }

  onUnsubscribe() {
    this._updateValueCallback = null;
    console.log('[Session] Client unsubscribed');
  }

  _resetSession() {
    const session = this._state.session;
    session.startTime = null;
    session.active = false;
    session.wormsCaught = 0;
    session.rocksHit = 0;
    session.reactionEvents = 0;
    session.reactionTimes = [];
    this._state.packetCount = 0;
  }

  _notifyStatus(eventId) {
    if (this._updateValueCallback) {
      const buffer = this._packStatus(eventId);
      this._updateValueCallback(buffer);
    }
  }

  _packStatus(eventId) {
    const session = this._state.session;
    const buffer = Buffer.alloc(15);

    buffer.writeUInt8(eventId, 0);

    // Duration in ms
    const duration = session.startTime
      ? Date.now() - session.startTime
      : 0;
    buffer.writeUInt32LE(duration, 1);

    buffer.writeUInt32LE(this._state.packetCount, 5);
    buffer.writeUInt16LE(session.wormsCaught, 9);
    buffer.writeUInt16LE(session.rocksHit, 11);
    buffer.writeUInt16LE(session.reactionEvents, 13);

    return buffer;
  }
}

module.exports = SessionControlCharacteristic;
