const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    recipient_role: {
        type: String,
        enum: ['ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR', 'CHEF', 'STORE_STAFF'],
        required: true
    },
    recipient_id: {
        type: String,
        ref: 'AppUser',
        default: null
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['INFO', 'URGENT', 'SUCCESS', 'ERROR'],
        default: 'INFO'
    },
    ref_type: {
        type: String,
        enum: ['ORDER', 'SHIPMENT', 'PRODUCTION', 'EXCEPTION', 'OTHER'],
        default: 'OTHER'
    },
    ref_id: {
        type: String,
        default: null
    },
    is_read: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false,
    timestamps: false
});

module.exports = mongoose.model('Notification', notificationSchema, 'notification');
