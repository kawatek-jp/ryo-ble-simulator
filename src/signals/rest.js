'use strict';

const BaseSignal = require('./base');

/**
 * Rest signal — low amplitude random noise simulating no muscle activation.
 * Output range: 0-50 (before noise injection).
 */
class RestSignal extends BaseSignal {
  _generate() {
    const flex = Math.random() * 50;
    const ext = Math.random() * 50;
    return { flex, ext };
  }
}

module.exports = RestSignal;
