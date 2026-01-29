const mongoose = require('mongoose');

const exceptionLogSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    exception_type: {
        type: String,
        enum: ['OUT_OF_STOCK', 'LATE_DELIVERY', 'WRONG_ITEM', 'QUALITY_ISSUE', 'CANCELLED'],
        required: true
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        required: true
    },
    order_id: {
        type: String,
        ref: 'InternalOrder',
        default: null
    },
    item_id: {
        type: String,
        ref: 'Item',
        default: null
    },
    store_org_unit_id: {
        type: String,
        required: true,
        ref: 'OrgUnit'
    },
    description: {
        type: String,
        required: true
    },
    reported_by: {
        type: String,
        required: true,
        ref: 'AppUser'
    },
    reported_at: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        default: 'OPEN'
    },
    resolution: {
        type: String,
        default: null
    },
    resolved_by: {
        type: String,
        ref: 'AppUser',
        default: null
    },
    resolved_at: {
        type: Date,
        default: null
    }
}, {
    _id: false,
    timestamps: false
});

module.exports = mongoose.model('ExceptionLog', exceptionLogSchema, 'exception_log');
