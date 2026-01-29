const mongoose = require('mongoose');

const deliveryRouteSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    route_no: {
        type: String,
        required: true,
        unique: true
    },
    route_name: {
        type: String,
        required: true
    },
    driver_name: {
        type: String,
        required: true
    },
    driver_phone: {
        type: String,
        required: true
    },
    vehicle_no: {
        type: String,
        required: true
    },
    vehicle_type: {
        type: String,
        enum: ['TRUCK_1TON', 'TRUCK_500KG', 'VAN', 'MOTORCYCLE'],
        required: true
    },
    planned_date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'PLANNED'
    },
    total_distance_km: {
        type: Number,
        default: 0
    },
    estimated_duration_mins: {
        type: Number,
        default: 0
    },
    actual_start_time: {
        type: Date,
        default: null
    },
    actual_end_time: {
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

module.exports = mongoose.model('DeliveryRoute', deliveryRouteSchema, 'delivery_route');
