'use strict';

const bleno = require('@abandonware/bleno');
const { SERVICE_UUID } = require('./constants');

const EmgStreamCharacteristic = require('./characteristics/emg-stream');
const CommandCharacteristic = require('./characteristics/command');
const ConfigCharacteristic = require('./characteristics/config');
const DeviceInfoCharacteristic = require('./characteristics/device-info');
const ClinicalMetricsCharacteristic = require('./characteristics/clinical-metrics');
const SessionControlCharacteristic = require('./characteristics/session-control');

/**
 * Creates the RYO GATT primary service with all 6 characteristics.
 */
function createRyoService(simulatorState) {
  const emgStream = new EmgStreamCharacteristic(simulatorState);
  const command = new CommandCharacteristic(simulatorState);
  const config = new ConfigCharacteristic(simulatorState);
  const deviceInfo = new DeviceInfoCharacteristic();
  const clinicalMetrics = new ClinicalMetricsCharacteristic(simulatorState);
  const sessionControl = new SessionControlCharacteristic(simulatorState);

  const service = new bleno.PrimaryService({
    uuid: SERVICE_UUID,
    characteristics: [
      emgStream,
      command,
      config,
      deviceInfo,
      clinicalMetrics,
      sessionControl,
    ],
  });

  return {
    service,
    characteristics: {
      emgStream,
      command,
      config,
      deviceInfo,
      clinicalMetrics,
      sessionControl,
    },
  };
}

module.exports = { createRyoService };
