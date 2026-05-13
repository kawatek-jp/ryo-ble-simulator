# ryo-ble-simulator

Cross-platform BLE peripheral simulator for the RYO hand system. Emulates the kawable GATT service for mobile app testing on macOS and Windows without hardware.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the simulator
npm start

# 3. Run in verbose mode (shows all BLE events)
npm run dev
```

## Prerequisites

- Node.js 18+
- **macOS:** Xcode Command Line Tools, Bluetooth permissions
- **Windows:** BLE 4.0+ USB adapter with WinUSB driver (install via [Zadig](https://zadig.akeo.ie/))

## Project Structure

```
src/
  ble/          # GATT service and characteristics
  signals/      # EMG signal generators
  metrics/      # Clinical metrics engine
  session/      # Session state management
  cli/          # CLI interface
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Launch the simulator |
| `npm run dev` | Launch with verbose logging |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Platform Notes

- **macOS:** bleno uses the built-in Bluetooth hardware. You may need to grant Bluetooth permissions in System Preferences → Privacy & Security → Bluetooth.
- **Windows:** Requires a BLE 4.0+ USB adapter. Install the WinUSB driver using Zadig (select your BLE adapter, replace driver with WinUSB).

## Documentation

- [macOS Setup Guide](docs/SETUP_MACOS.md)
- [Windows Setup Guide](docs/SETUP_WINDOWS.md)
- [BLE Protocol Reference](docs/PROTOCOL.md)
