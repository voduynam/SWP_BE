/**
 * PayOS Service Selector
 * Tự động chọn Real PayOS hoặc Mock PayOS
 */

const USE_MOCK = process.env.USE_MOCK_PAYOS === 'true';

let payosService;

if (USE_MOCK) {
  console.log('🎭 Using MOCK PayOS Service (Network unavailable)');
  payosService = require('./mockPayosService');
} else {
  console.log('🔵 Using Real PayOS Service');
  payosService = require('./payosService');
}

module.exports = payosService;
