# GATT Characteristics Reference

**Service UUID:** `19B10000-E8F2-537E-4F6C-D104768A1214`  
**Device Name:** `kawable`

---

## 1. EMG Stream (0001)

**UUID:** `19B10001-E8F2-537E-4F6C-D104768A1214`  
**Properties:** Read, Notify  
**Notification Rate:** 20 Hz (every 50 ms)  
**Size:** 8 bytes

### Purpose

The real-time muscle signal feed. EMG (electromyography) measures electrical activity produced by muscles. The RYO device has two electrodes on the forearm that pick up signals from:
- **Flexion** — closing/gripping muscles
- **Extension** — opening muscles

The app uses this stream to render live graphs, detect intentional muscle contractions, and drive the game/training interface.

### Byte Layout

| Offset | Type | Field | Description |
|--------|------|-------|-------------|
| 0-1 | uint16 LE | ext | Extension channel value (0-4095) |
| 2-3 | uint16 LE | flex | Flexion channel value (0-4095) |
| 4 | uint8 | mode | Current operating mode (0-99) |
| 5 | uint8 | flags | bit0: uart_ok, bit1: signal_valid |
| 6-7 | uint16 LE | packetCount | Rolling packet counter |

### Notes

- Values 0-4095 represent the full ADC range of the analog-to-digital converter
- The simulator generates synthetic patterns (sine, burst, fatigue, etc.) to test app behavior
- Packet count wraps at 65535

---

## 2. Command (0002)

**UUID:** `19B10002-E8F2-537E-4F6C-D104768A1214`  
**Properties:** Write  
**Size:** 1-3 bytes

### Purpose

How the app tells the hand what to do. The app writes a command byte (and optional parameters) to control the physical hand mechanism.

### Commands

| Byte 0 | Name | Additional Bytes | Description |
|--------|------|-----------------|-------------|
| 0x01 | OPEN | None | Open the hand |
| 0x02 | CLOSE | None | Close/grip the hand |
| 0x03 | STOP | None | Stop all movement |
| 0x04 | HOME | None | Return to neutral position |
| 0x05 | CHANGE_MODE | [1] mode (0-99) | Switch operating mode |

### Behavior

- Empty writes (0 bytes) are rejected
- Input is capped to first 16 bytes
- Unknown command IDs (outside 0x01-0x05) are rejected
- Duplicate commands are suppressed (same command twice in a row is ignored) — except CHANGE_MODE which always processes
- All received commands are logged to the simulator console

---

## 3. Config (0003)

**UUID:** `19B10003-E8F2-537E-4F6C-D104768A1214`  
**Properties:** Read, Write, Notify  
**Size:** 16 bytes

### Purpose

The app's way to tune the device. Contains AI-assisted thresholds, gain multipliers, and mode preferences. When the app writes new config, the device applies it immediately and notifies subscribers with the updated values.

### Byte Layout

| Offset | Type | Field | Range | Default | Description |
|--------|------|-------|-------|---------|-------------|
| 0-1 | uint16 LE | flexThreshold | 0-4095 | 0 | Flexion activation threshold |
| 2-3 | uint16 LE | extThreshold | 0-4095 | 0 | Extension activation threshold |
| 4-5 | uint16 LE | flexGain_x100 | 0-1000 | 100 | Flexion gain (100 = 1.0x) |
| 6-7 | uint16 LE | extGain_x100 | 0-1000 | 100 | Extension gain (100 = 1.0x) |
| 8 | uint8 | preferredMode | 0-99 | 1 | Preferred operating mode |
| 9 | uint8 | flags | bitmask | 0 | Feature flags |
| 10-11 | uint16 LE | smoothingAlpha_x1k | 0-1000 | 200 | Signal smoothing factor |
| 12-15 | — | reserved | — | 0 | Reserved for future use |

### Flags Byte (offset 9)

| Bit | Name | Description |
|-----|------|-------------|
| 0 | aiAssistEnabled | AI-assisted threshold adjustment active |
| 1 | adaptiveEnabled | Adaptive thresholds active |

### Behavior

- Writes must be exactly 16 bytes (shorter writes are rejected)
- Values are clamped to valid ranges (e.g., gain > 1000 becomes 1000)
- Notification is sent to subscribers after every successful write
- Gain values affect the EMG signal output and clinical metrics calculations
- Thresholds determine when a muscle is considered "active" for coactivation metrics

---

## 4. Device Info (0004)

**UUID:** `19B10004-E8F2-537E-4F6C-D104768A1214`  
**Properties:** Read  
**Size:** 20 bytes

### Purpose

Static device identification. The app reads this once on connection to know what hardware and firmware it's communicating with. These values never change during a session.

### Byte Layout

| Offset | Type | Field | Value | Description |
|--------|------|-------|-------|-------------|
| 0 | uint8 | FW_VERSION_MAJOR | 3 | Firmware major version |
| 1 | uint8 | FW_VERSION_MINOR | 0 | Firmware minor version |
| 2 | uint8 | NUM_ELECTRODES | 2 | Number of EMG electrodes |
| 3 | uint8 | HW_REVISION | 1 | Hardware revision |
| 4-5 | uint16 LE | ADC_MAX | 4095 | Maximum ADC value |
| 6-7 | uint16 LE | SIGNAL_MAX | 1200 | Maximum expected signal amplitude |
| 8-9 | uint16 LE | ACTIVE_THRESHOLD | 150 | Default activation threshold |
| 10-11 | uint16 LE | SAMPLE_RATE | 100 | Internal sample rate (Hz) |
| 12-19 | — | reserved | 0 | Reserved for future use |

---

## 5. Clinical Metrics (0005)

**UUID:** `19B10005-E8F2-537E-4F6C-D104768A1214`  
**Properties:** Read, Notify  
**Notification Rate:** 1 Hz (every second)  
**Size:** 64 bytes (16 × float32 LE)

### Purpose

Real-time clinical assessment of the user's muscle control. These 16 metrics are calculated from the EMG data stream and drive the clinical dashboard, progress tracking, and session reports in the app.

### Metrics

| Index | Offset | Metric | Unit | Description |
|-------|--------|--------|------|-------------|
| 0 | 0-3 | Selectivity Index | 0-1 | Ability to isolate one channel. 0 = both equal, 1 = perfect isolation |
| 1 | 4-7 | Coactivation Ratio | % | Percentage of time both channels are active simultaneously |
| 2 | 8-11 | Fatigue Trend | % | Amplitude decrease over the session (0 = no fatigue, 100 = complete fatigue) |
| 3 | 12-15 | Control Efficiency | score/min | Game performance: (worms - 2×rocks) / minutes |
| 4 | 16-19 | Reaction Time | ms | Average reaction time across all reaction events |
| 5 | 20-23 | Progression Rate | % | Improvement from initial to final control amplitude |
| 6 | 24-27 | Motor Unit Recruitment | % | Percentage of the full ADC range being used |
| 7 | 28-31 | Signal-to-Noise Ratio | dB | Signal quality: 10×log10(signalPower + 1) |
| 8 | 32-35 | Symmetry Index | % | Balance between channels (100% = perfectly balanced) |
| 9 | 36-39 | Flexion/Extension Ratio | ratio | Mean flexion divided by mean extension |
| 10 | 40-43 | Peak Flexion | ADC | Maximum flexion value recorded in session |
| 11 | 44-47 | Peak Extension | ADC | Maximum extension value recorded in session |
| 12 | 48-51 | Mean Flexion | ADC×gain | Average flexion with gain applied |
| 13 | 52-55 | Mean Extension | ADC×gain | Average extension with gain applied |
| 14 | 56-59 | Initial Control | ADC | Average amplitude of first 50 samples |
| 15 | 60-63 | Final Control | ADC | Average amplitude of last 50 samples |

### Notes

- All values are IEEE 754 single-precision floats in little-endian byte order
- Metrics update based on a circular buffer of the last 1000 samples
- Config changes (gains, thresholds) affect metric calculations immediately
- If MTU < 67 bytes, metrics are split into 4 packets of 17 bytes (1 sequence byte + 16 data bytes)

---

## 6. Session Control (0006)

**UUID:** `19B10006-E8F2-537E-4F6C-D104768A1214`  
**Properties:** Read, Write, Notify  
**Write Size:** 1-5 bytes  
**Notification Size:** 15 bytes

### Purpose

Manages the training session lifecycle. The app uses this to start/stop sessions, log game events (worms caught, rocks hit, reaction times), and request final reports. The device notifies back with session status after key actions.

### Write Actions

| Byte 0 | Name | Additional Bytes | Description |
|--------|------|-----------------|-------------|
| 0x01 | RESET | None | Reset all session data, counters, and metrics |
| 0x02 | REQUEST_REPORT | None | Calculate final metrics and send notification |
| 0x03 | GAME_WORM | None | Increment "worms caught" counter |
| 0x04 | GAME_ROCK | None | Increment "rocks hit" counter |
| 0x05 | GAME_REACTION | [1-4] float LE (ms) | Record a reaction time event (0-60000 ms) |
| 0x06 | START_SESSION | None | Start a new session (resets counters, starts timer) |
| 0x07 | STOP_SESSION | None | End the current session |

### Session Status Notification (15 bytes)

Sent after RESET, REQUEST_REPORT, START_SESSION, and STOP_SESSION:

| Offset | Type | Field | Description |
|--------|------|-------|-------------|
| 0 | uint8 | eventId | The action that triggered this notification |
| 1-4 | uint32 LE | duration | Session duration in milliseconds |
| 5-8 | uint32 LE | totalPackets | Total EMG packets sent during session |
| 9-10 | uint16 LE | wormsCaught | Number of worms caught in game |
| 11-12 | uint16 LE | rocksHit | Number of rocks hit in game |
| 13-14 | uint16 LE | reactionEvents | Number of reaction time events recorded |

### Behavior

- Unknown action IDs (outside 0x01-0x07) are rejected
- Reaction time values outside 0-60000 ms are rejected
- START_SESSION automatically resets all counters before starting
- STOP_SESSION and REQUEST_REPORT trigger clinical metrics calculation
