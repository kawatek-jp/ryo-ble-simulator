# macOS Setup Guide

## Prerequisites

- **Node.js 18+** — Install via [nvm](https://github.com/nvm-sh/nvm) or [Homebrew](https://brew.sh): `brew install node`
- **Xcode Command Line Tools** — `xcode-select --install`

## Bluetooth Permissions

The simulator uses your Mac's built-in Bluetooth hardware to act as a BLE peripheral.

1. Open **System Preferences → Privacy & Security → Bluetooth**
2. Ensure your terminal app (Terminal, iTerm2, VS Code) has Bluetooth access
3. If running from VS Code's integrated terminal, VS Code itself needs Bluetooth permission

## Installation

```bash
git clone https://github.com/kawatek-jp/ryo-ble-simulator.git
cd ryo-ble-simulator
npm install
```

## Running

```bash
# Default (sine wave pattern)
npm start

# With options
node src/index.js --pattern burst --amplitude 1200

# Verbose mode (all BLE events)
npm run dev
```

## Known Issues

### macOS Sonoma / Sequoia

- **BLE peripheral mode may require a restart** after granting Bluetooth permissions for the first time.
- **"Bluetooth not available" error:** Try toggling Bluetooth off/on in System Settings, or restart the Bluetooth daemon:
  ```bash
  sudo pkill bluetoothd
  ```
- **Multiple peripherals:** macOS limits the number of simultaneous BLE peripheral advertisements. Stop other BLE apps before running the simulator.

### Apple Silicon (M1/M2/M3)

- bleno works natively on Apple Silicon via the `xpc-connection` binding.
- No Rosetta required.

## Troubleshooting

| Symptom | Solution |
|---------|----------|
| "Bluetooth not available" | Check System Preferences → Bluetooth is ON |
| "No compatible adapter" | Ensure no other app is using BLE peripheral mode |
| Permission denied | Add terminal app to Privacy → Bluetooth |
| Crashes on start | Run `xcode-select --install` to ensure build tools are present |
| npm install fails | Ensure you have Python 3 and make available for native modules |
