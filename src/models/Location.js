const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  org_unit_id: {
    type: String,
    required: true,
    ref: 'OrgUnit'
  },
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('Location', locationSchema, 'location');
