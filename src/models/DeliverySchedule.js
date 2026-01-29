const mongoose = require('mongoose');

const deliveryScheduleSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    schedule_no: {
        type: String,
        required: true,
        unique: true
    },
    week_start: {
        type: Date,
        required: true
    },
    week_end: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['DRAFT', 'ACTIVE', 'COMPLETED'],
        default: 'DRAFT'
    },
    schedules: [{
        day_of_week: {
            type: String,
            enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
        },
        date: Date,
        routes: [{
            type: String,
            ref: 'DeliveryRoute'
        }],
        total_shipments: {
            type: Number,
            default: 0
        },
        total_stores: {
            type: Number,
            default: 0
        }
    }],
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

module.exports = mongoose.model('DeliverySchedule', deliveryScheduleSchema, 'delivery_schedule');
