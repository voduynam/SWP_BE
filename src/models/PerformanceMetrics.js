const mongoose = require('mongoose');

const performanceMetricsSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    metric_date: {
        type: Date,
        required: true
    },
    metric_type: {
        type: String,
        enum: ['DELIVERY_PERFORMANCE', 'ORDER_FULFILLMENT', 'EXCEPTION_HANDLING'],
        required: true
    },
    metrics: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false,
    timestamps: false
});

module.exports = mongoose.model('PerformanceMetrics', performanceMetricsSchema, 'performance_metrics');
