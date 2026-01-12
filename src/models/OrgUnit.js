const mongoose = require('mongoose');

const orgUnitSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['KITCHEN', 'STORE']
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  address: {
    type: String
  },
  district: {
    type: String
  },
  city: {
    type: String
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

module.exports = mongoose.model('OrgUnit', orgUnitSchema, 'org_unit');
