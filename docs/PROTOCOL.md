# BLE Protocol Reference

## GATT Service

**Service UUID:** `19B10000-E8F2-537E-4F6C-D104768A1214`  
**Device Name:** `kawable`

## Characteristics

| # | Name | UUID | Properties | Size |
|---|------|------|------------|------|
| 1 | EMG Stream | `19B10001-...` | Read, Notify | 8 bytes |
| 2 | Command | `19B10002-...` | Write | 1-3 bytes |
| 3 | Config | `19B10003-...` | Read, Write, Notify | 16 bytes |
| 4 | Device Info | `19B10004-...` | Read | 20 bytes |
| 5 | Clinical Metrics | `19B10005-...` | Read, Notify | 64 bytes |
| 6 | Session Control | `19B10006-...` | Read, Write, Notify | 1-15 bytes |

---

## 1. EMG Stream (0001)

**Notification rate:** 20 Hz (every 50 ms)

### Byte Layout (8 bytes)

| Offset | Type | Field | Description |
|--------|------|-------|-------------|
| 0-1 | uint16 LE | ext | Extension channel value (0-4095) |
| 2-3 | uint16 LE | flex | Flexion channel value (0-4095) |
| 4 | uint8 | mode | Current operating mode (0-99) |
| 5 | uint8 | flags | bit0: uart_ok, bit1: signal_valid |
| 6-7 | uint16 LE | packetCount | Rolling packet counter |

---

## 2. Command (0002)

**Write only.** Processes commands from the mobile app.

### Command Table

| Byte 0 | Command | Additional Bytes | Description |
|--------|---------|-----------------|-------------|
| 0x01 | OPEN | None | Open hand |
| 0x02 | CLOSE | None | Close hand |
| 0x03 | STOP | None | Stop movement |
| 0x04 | HOME | None | Return to home position |
| 0x05 | CHANGE_MODE | [1] mode (0-99) | Change operating mode |

### Behavior

- Empty writes (0 bytes) are rejected
- Input capped to first 16 bytes
- Unknown command IDs (outside 0x01-0x05) are rejected
- Duplicate commands are suppressed (except CHANGE_MODE)

---

## 3. Config (0003)

**Read/Write/Notify.** AI-assisted thresholds, gains, and preferences.

### Byte Layout (16 bytes)

| Offset | Type | Field | Range | Default |
|--------|------|-------|-------|---------|
| 0-1 | uint16 LE | flexThreshold | 0-4095 | 0 |
| 2-3 | uint16 LE | extThreshold | 0-4095 | 0 |
| 4-5 | uint16 LE | flexGain_x100 | 0-1000 | 100 |
| 6-7 | uint16 LE | extGain_x100 | 0-1000 | 100 |
| 8 | uint8 | preferredMode | 0-99 | 1 |
| 9 | uint8 | flags | bitmask | 0 |
| 10-11 | uint16 LE | smoothingAlpha_x1k | 0-1000 | 200 |
| 12-15 | — | reserved | — | 0 |

### Flags Byte

| Bit | Name | Description |
|-----|------|-------------|
| 0 | aiAssistEnabled | AI assistance active |
| 1 | adaptiveEnabled | Adaptive thresholds active |

### Behavior

- Writes must be exactly 16 bytes (shorter rejected)
- Values are clamped to valid ranges on write
- Notification sent to subscribers after successful write
- Gain values: 100 = 1.0x, 200 = 2.0x, 50 = 0.5x

---

## 4. Device Info (0004)

**Read only.** Static device information.

### Byte Layout (20 bytes)

| Offset | Type | Field | Value |
|--------|------|-------|-------|
| 0 | uint8 | FW_VERSION_MAJOR | 3 |
| 1 | uint8 | FW_VERSION_MINOR | 0 |
| 2 | uint8 | NUM_ELECTRODES | 2 |
| 3 | uint8 | HW_REVISION | 1 |
| 4-5 | uint16 LE | ADC_MAX | 4095 |
| 6-7 | uint16 LE | SIGNAL_MAX | 1200 |
| 8-9 | uint16 LE | ACTIVE_THRESHOLD | 150 |
| 10-11 | uint16 LE | SAMPLE_RATE | 100 |
| 12-19 | — | reserved | 0 |

---

## 5. Clinical Metrics (0005)

**Notification rate:** 1 Hz

### Byte Layout (64 bytes = 16 × float32 LE)

| Index | Offset | Metric | Unit |
|-------|--------|--------|------|
| 0 | 0-3 | Selectivity Index | 0-1 |
| 1 | 4-7 | Coactivation Ratio | % |
| 2 | 8-11 | Fatigue Trend | % |
| 3 | 12-15 | Control Efficiency | score/min |
| 4 | 16-19 | Reaction Time | ms |
| 5 | 20-23 | Progression Rate | % |
| 6 | 24-27 | Motor Unit Recruitment | % |
| 7 | 28-31 | Signal-to-Noise Ratio | dB |
| 8 | 32-35 | Symmetry Index | % |
| 9 | 36-39 | Flexion/Extension Ratio | ratio |
| 10 | 40-43 | Peak Flexion | ADC |
| 11 | 44-47 | Peak Extension | ADC |
| 12 | 48-51 | Mean Flexion | ADC×gain |
| 13 | 52-55 | Mean Extension | ADC×gain |
| 14 | 56-59 | Initial Control | ADC |
| 15 | 60-63 | Final Control | ADC |

### MTU Handling

If MTU < 67 bytes, metrics are split into 4 packets of 17 bytes each:
- Byte 0: sequence number (0-3)
- Bytes 1-16: 4 floats (16 bytes of metric data)

---

## 6. Session Control (0006)

### Write Actions

| Byte 0 | Action | Additional Bytes | Description |
|--------|--------|-----------------|-------------|
| 0x01 | RESET | None | Reset session data and metrics |
| 0x02 | REQUEST_REPORT | None | Calculate final metrics |
| 0x03 | GAME_WORM | None | Increment worms caught |
| 0x04 | GAME_ROCK | None | Increment rocks hit |
| 0x05 | GAME_REACTION | [1-4] float LE (ms) | Record reaction time |
| 0x06 | START_SESSION | None | Start new session |
| 0x07 | STOP_SESSION | None | End session |

### Session Status Notification (15 bytes)

| Offset | Type | Field |
|--------|------|-------|
| 0 | uint8 | eventId |
| 1-4 | uint32 LE | duration (ms) |
| 5-8 | uint32 LE | totalPackets |
| 9-10 | uint16 LE | wormsCaught |
| 11-12 | uint16 LE | rocksHit |
| 13-14 | uint16 LE | reactionEvents |

### Behavior

- Status notification sent after: RESET, REQUEST_REPORT, START_SESSION, STOP_SESSION
- Reaction time validated: 0-60000 ms (out of range rejected)
- Unknown action IDs (outside 0x01-0x07) rejected

---

## Sequence Diagrams

### Connect → Start Session → Stream → Stop

```
App                          Simulator
 |                               |
 |--- BLE Connect -------------->|
 |<-- Connection Event ----------|
 |                               |
 |--- Read Device Info (0004) -->|
 |<-- 20 bytes ------------------|
 |                               |
 |--- Read Config (0003) ------->|
 |<-- 16 bytes ------------------|
 |                               |
 |--- Subscribe EMG (0001) ----->|
 |<-- Notifications @ 20 Hz ----|
 |                               |
 |--- Subscribe Metrics (0005)->|
 |<-- Notifications @ 1 Hz -----|
 |                               |
 |--- Write Session: START ----->|
 |<-- Session Status (15 bytes) -|
 |                               |
 |   ... streaming data ...      |
 |                               |
 |--- Write Session: STOP ------>|
 |<-- Session Status (15 bytes) -|
 |                               |
 |--- Write Session: REPORT ---->|
 |<-- Final Metrics (64 bytes) --|
 |                               |
 |--- BLE Disconnect ----------->|
```

### Config Update Flow

```
App                          Simulator
 |                               |
 |--- Write Config (16 bytes) -->|
 |    (values clamped)           |
 |<-- Config Notification -------|
 |    (current config echoed)    |
 |                               |
 |   Gains/thresholds now        |
 |   affect EMG and metrics      |
```
