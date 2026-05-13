'use strict';

const { program } = require('commander');
const readline = require('readline');
const SignalGeneratorManager = require('../signals');

// ANSI color helpers
const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

/**
 * Parse CLI arguments and return options.
 */
function parseArgs(argv) {
  program
    .name('ryo-sim')
    .description('RYO BLE Simulator — emulates the kawable GATT service')
    .version('0.1.0')
    .option('--pattern <type>', 'Initial signal pattern', 'sine')
    .option('--amplitude <n>', 'Signal amplitude (0-4095)', (v) => parseInt(v, 10), 800)
    .option('--frequency <n>', 'Signal frequency for sine/burst', (v) => parseFloat(v), 1.0)
    .option('--noise <n>', 'Noise level (0-200)', (v) => parseInt(v, 10), 20)
    .option('--verbose', 'Show all BLE events', false);

  program.parse(argv);
  return program.opts();
}

/**
 * Start the interactive command loop.
 */
function startInteractiveMode(simulatorState) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '',
  });

  // Only enable interactive mode if stdin is a TTY
  if (!process.stdin.isTTY) return null;

  console.log(colors.dim('─── Interactive Commands ───'));
  console.log(colors.dim('p <pattern>  Switch signal pattern'));
  console.log(colors.dim('a <value>    Set amplitude'));
  console.log(colors.dim('f <value>    Set frequency'));
  console.log(colors.dim('n <value>    Set noise level'));
  console.log(colors.dim('s            Show status'));
  console.log(colors.dim('m            Show metrics'));
  console.log(colors.dim('q            Quit'));
  console.log(colors.dim('───────────────────────────'));

  rl.on('line', (line) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];

    switch (cmd) {
      case 'p': {
        const patterns = SignalGeneratorManager.getPatterns();
        if (!arg || !patterns.includes(arg)) {
          console.log(`Available patterns: ${patterns.join(', ')}`);
          break;
        }
        simulatorState.signalGenerator.setPattern(arg);
        console.log(colors.cyan(`Pattern → ${arg}`));
        break;
      }

      case 'a': {
        const val = parseInt(arg);
        if (isNaN(val) || val < 0 || val > 4095) {
          console.log('Amplitude must be 0-4095');
          break;
        }
        simulatorState.signalGenerator.setAmplitude(val);
        console.log(colors.cyan(`Amplitude → ${val}`));
        break;
      }

      case 'f': {
        const val = parseFloat(arg);
        if (isNaN(val) || val < 0.1 || val > 10) {
          console.log('Frequency must be 0.1-10 Hz');
          break;
        }
        simulatorState.signalGenerator.setFrequency(val);
        console.log(colors.cyan(`Frequency → ${val} Hz`));
        break;
      }

      case 'n': {
        const val = parseInt(arg);
        if (isNaN(val) || val < 0 || val > 200) {
          console.log('Noise must be 0-200');
          break;
        }
        simulatorState.signalGenerator.setNoiseLevel(val);
        console.log(colors.cyan(`Noise → ${val}`));
        break;
      }

      case 's': {
        const connected = simulatorState.connected
          ? colors.green('CONNECTED')
          : colors.red('DISCONNECTED');
        console.log(`Connection: ${connected}`);
        console.log(`Pattern: ${simulatorState.signalGenerator.pattern}`);
        console.log(`Mode: ${simulatorState.mode}`);
        console.log(`MTU: ${simulatorState.mtu}`);
        console.log(`Packets: ${simulatorState.packetCount}`);
        console.log(`Session: ${simulatorState.session.active ? 'ACTIVE' : 'INACTIVE'}`);
        if (simulatorState.session.active) {
          const dur = Date.now() - simulatorState.session.startTime;
          console.log(`  Duration: ${(dur / 1000).toFixed(1)}s`);
          console.log(`  Worms: ${simulatorState.session.wormsCaught}`);
          console.log(`  Rocks: ${simulatorState.session.rocksHit}`);
        }
        break;
      }

      case 'm': {
        const m = simulatorState.metrics;
        console.log(colors.yellow('── Clinical Metrics ──'));
        console.log(`  Selectivity:    ${m[0].toFixed(3)}`);
        console.log(`  Coactivation:   ${m[1].toFixed(1)}%`);
        console.log(`  Fatigue:        ${m[2].toFixed(1)}%`);
        console.log(`  Ctrl Efficiency:${m[3].toFixed(2)}`);
        console.log(`  Reaction Time:  ${m[4].toFixed(0)} ms`);
        console.log(`  Progression:    ${m[5].toFixed(1)}%`);
        console.log(`  Recruitment:    ${m[6].toFixed(1)}%`);
        console.log(`  SNR:            ${m[7].toFixed(1)} dB`);
        console.log(`  Symmetry:       ${m[8].toFixed(1)}%`);
        console.log(`  Flex/Ext Ratio: ${m[9].toFixed(2)}`);
        console.log(`  Peak Flex:      ${m[10].toFixed(0)}`);
        console.log(`  Peak Ext:       ${m[11].toFixed(0)}`);
        console.log(`  Mean Flex:      ${m[12].toFixed(1)}`);
        console.log(`  Mean Ext:       ${m[13].toFixed(1)}`);
        console.log(`  Initial Ctrl:   ${m[14].toFixed(1)}`);
        console.log(`  Final Ctrl:     ${m[15].toFixed(1)}`);
        break;
      }

      case 'q':
        console.log('Quitting...');
        process.emit('SIGINT');
        break;

      default:
        if (cmd) {
          console.log(colors.dim(`Unknown command: ${cmd}. Type 's' for status.`));
        }
    }
  });

  return rl;
}

module.exports = { parseArgs, startInteractiveMode, colors };
