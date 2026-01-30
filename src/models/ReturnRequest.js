// ============================================================================
// RETURN REQUEST MODEL - CURRENTLY DISABLED
// ============================================================================
// This model defines the return request schema
// Currently commented out as it's not needed for the current project phase
// ============================================================================

const mongoose = require('mongoose');

// Empty schema when disabled
const returnRequestSchema = new mongoose.Schema({
  // Schema is disabled
}, {
  collection: 'return_request_disabled'
});

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);