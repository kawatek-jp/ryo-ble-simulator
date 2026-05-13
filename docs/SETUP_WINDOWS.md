# Windows Setup Guide

## Prerequisites

- **Node.js 18+** — Download from [nodejs.org](https://nodejs.org/) or use [nvm-windows](https://github.com/coreybutler/nvm-windows)
- **BLE 4.0+ USB adapter** — Must support peripheral (advertiser) mode
- **Windows Build Tools** — `npm install -g windows-build-tools` (for native module compilation)

## BLE Adapter Setup

The simulator requires a BLE adapter with WinUSB driver (not the default Windows Bluetooth driver).

### Step 1: Identify Your BLE Adapter

1. Open **Device Manager**
2. Look under **Bluetooth** for your BLE adapter
3. Note the device name (e.g., "CSR8510 A10", "Intel Wireless Bluetooth")

### Step 2: Install WinUSB Driver via Zadig

1. Download [Zadig](https://zadig.akeo.ie/) (free, no install needed)
2. Run Zadig as Administrator
3. Go to **Options → List All Devices**
4. Select your BLE adapter from the dropdown
5. Set the target driver to **WinUSB**
6. Click **Replace Driver**

> ⚠️ **Warning:** This replaces the default Bluetooth driver. Your adapter will no longer work with Windows Bluetooth settings. To revert, use Device Manager → Update Driver → Search automatically.

### Step 3: Verify

After installing WinUSB, the adapter should appear under **Universal Serial Bus devices** in Device Manager (not under Bluetooth).

## Installation

```bash
git clone https://github.com/kawatek-jp/ryo-ble-simulator.git
cd ryo-ble-simulator
npm install
```

## Running

```bash
# Default
npm start

# With options
node src/index.js --pattern burst --amplitude 1200
```

## Troubleshooting

| Symptom | Solution |
|---------|----------|
| "No compatible USB adapter" | Ensure WinUSB driver is installed via Zadig |
| npm install fails with node-gyp | Install windows-build-tools: `npm install -g windows-build-tools` |
| Adapter not found after Zadig | Unplug and replug the USB adapter |
| "LIBUSB_ERROR_ACCESS" | Run terminal as Administrator |
| Multiple adapters detected | Disable built-in Bluetooth in Device Manager, use only USB adapter |
| Driver conflicts | Uninstall conflicting Bluetooth software (e.g., Broadcom stack) |

## Reverting the WinUSB Driver

To restore normal Bluetooth functionality:

1. Open **Device Manager**
2. Find your adapter under **Universal Serial Bus devices**
3. Right-click → **Update driver**
4. Select **Search automatically for drivers**
5. Windows will reinstall the default Bluetooth driver
