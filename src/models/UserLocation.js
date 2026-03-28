const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  accuracy: {
    type: Number,
    default: 0 // GPS accuracy in meters
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true // true for current location, false for historical
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

// Index for efficient queries
userLocationSchema.index({ user_id: 1, is_active: 1 });
userLocationSchema.index({ user_id: 1, timestamp: -1 });
userLocationSchema.index({ "coordinates.latitude": 1, "coordinates.longitude": 1 });

module.exports = mongoose.model('UserLocation', userLocationSchema, 'user_location');