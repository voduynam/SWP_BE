const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  shipment_no: {
    type: String,
    required: true,
    unique: true
  },
  order_id: {
    type: String,
    required: true,
    ref: 'InternalOrder'
  },
  from_location_id: {
    type: String,
    required: true,
    ref: 'Location'
  },
  to_location_id: {
    type: String,
    required: true,
    ref: 'Location'
  },
  ship_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PICKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'DRAFT'
  },
  delivery_photo_url: {
    type: String,
    default: null
  },
  delivery_photo_uploaded_at: {
    type: Date,
    default: null
  },
  created_by: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('Shipment', shipmentSchema, 'shipment');
