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
  cod_amount: {
    type: Number,
    default: 0
  },
  cod_collected_amount: {
    type: Number,
    default: 0
  },
  cod_collected_at: {
    type: Date,
    default: null
  },
  cod_collected_by: {
    type: String,
    ref: 'AppUser',
    default: null
  },
  cod_collection_notes: {
    type: String,
    default: ''
  },
  // COD evidence photos
  cod_evidence_photos: [{
    url: String,
    filename: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  cod_status: {
    type: String,
    enum: ['PENDING', 'COLLECTED', 'CONFIRMED', 'DISPUTED'],
    default: 'PENDING'
  },
  cod_confirmed_by: {
    type: String,
    ref: 'AppUser',
    default: null
  },
  cod_confirmed_at: {
    type: Date,
    default: null
  },
  cod_manager_notes: {
    type: String,
    default: ''
  },
  // Staff receipt confirmation fields
  received_by_staff: {
    type: String,
    ref: 'AppUser',
    default: null
  },
  received_at: {
    type: Date,
    default: null
  },
  receipt_notes: {
    type: String,
    default: ''
  },
  receipt_status: {
    type: String,
    enum: ['PENDING_RECEIPT', 'RECEIVED_OK', 'RECEIVED_WITH_ISSUES', 'NOT_RECEIVED'],
    default: 'PENDING_RECEIPT'
  },
  delivery_discrepancy: {
    type: String,
    default: ''
  },
  // Evidence photos/videos for receipt issues
  receipt_evidence_photos: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    filename: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  // Notification tracking
  staff_notified_at: {
    type: Date,
    default: null
  },
  staff_reminder_sent_at: {
    type: Date,
    default: null
  },
  manager_escalated_at: {
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
