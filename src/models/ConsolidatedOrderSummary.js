const mongoose = require('mongoose');

const consolidatedOrderSummarySchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    consolidation_date: {
        type: Date,
        required: true
    },
    delivery_date: {
        type: Date,
        required: true
    },
    item_id: {
        type: String,
        required: true,
        ref: 'Item'
    },
    total_qty_ordered: {
        type: Number,
        required: true
    },
    uom_id: {
        type: String,
        required: true,
        ref: 'UOM'
    },
    stores: [{
        store_id: {
            type: String,
            ref: 'OrgUnit'
        },
        qty: Number,
        order_id: {
            type: String,
            ref: 'InternalOrder'
        }
    }],
    production_status: {
        type: String,
        enum: ['SUFFICIENT', 'NEED_PRODUCTION', 'PARTIAL'],
        default: 'SUFFICIENT'
    },
    available_inventory: {
        type: Number,
        default: 0
    },
    need_to_produce: {
        type: Number,
        default: 0
    },
    created_by: {
        type: String,
        required: true,
        ref: 'AppUser'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false,
    timestamps: false
});

module.exports = mongoose.model('ConsolidatedOrderSummary', consolidatedOrderSummarySchema, 'consolidated_order_summary');
