const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    route_id: {
        type: String,
        required: true,
        ref: 'DeliveryRoute'
    },
    sequence: {
        type: Number,
        required: true
    },
    store_org_unit_id: {
        type: String,
        required: true,
        ref: 'OrgUnit'
    },
    shipment_ids: [{
        type: String,
        ref: 'Shipment'
    }],
    estimated_arrival: {
        type: Date,
        required: true
    },
    estimated_departure: {
        type: Date,
        required: true
    },
    actual_arrival: {
        type: Date,
        default: null
    },
    actual_departure: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED'],
        default: 'PENDING'
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    _id: false,
    timestamps: false
});

module.exports = mongoose.model('RouteStop', routeStopSchema, 'route_stop');
