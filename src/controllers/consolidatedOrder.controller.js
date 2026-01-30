const asyncHandler = require('../utils/asyncHandler');
const ConsolidatedOrderSummary = require('../models/ConsolidatedOrderSummary');
const InternalOrder = require('../models/InternalOrder');
const InternalOrderLine = require('../models/InternalOrderLine');
const InventoryBalance = require('../models/InventoryBalance');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get consolidated orders
// @route   GET /api/consolidated-orders
// @access  Private (Supply Coordinator, Manager, Admin)
exports.getConsolidatedOrders = asyncHandler(async (req, res) => {
    const { delivery_date, item_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (delivery_date) filter.delivery_date = new Date(delivery_date);
    if (item_id) filter.item_id = item_id;

    const consolidatedOrders = await ConsolidatedOrderSummary.find(filter)
        .populate('item_id', 'sku name item_type')
        .populate('uom_id', 'code name')
        .populate('stores.store_id', 'name code')
        .populate('stores.order_id', 'order_no status')
        .populate('created_by', 'username full_name')
        .skip(skip)
        .limit(limit)
        .sort({ delivery_date: -1 });

    const total = await ConsolidatedOrderSummary.countDocuments(filter);

    return res.status(200).json(
        ApiResponse.paginate(consolidatedOrders, page, limit, total)
    );
});

// @desc    Generate consolidated order summary
// @route   POST /api/consolidated-orders/generate
// @access  Private (Supply Coordinator, Manager, Admin)
exports.generateConsolidatedSummary = asyncHandler(async (req, res) => {
    const { delivery_date } = req.body;

    if (!delivery_date) {
        return res.status(400).json(
            ApiResponse.error('Delivery date is required', 400)
        );
    }

    const targetDate = new Date(delivery_date);

    // Find all SUBMITTED or APPROVED orders for the delivery date
    const orders = await InternalOrder.find({
        status: { $in: ['SUBMITTED', 'APPROVED'] },
        order_date: { $lte: targetDate }
    });

    if (orders.length === 0) {
        return res.status(200).json(
            ApiResponse.success([], 'No orders found for consolidation')
        );
    }

    // Get all order lines
    const orderIds = orders.map(o => o._id);
    const orderLines = await InternalOrderLine.find({
        order_id: { $in: orderIds }
    }).populate('item_id').populate('uom_id').populate('order_id');

    // Group by item_id
    const itemGroups = {};
    orderLines.forEach(line => {
        const itemId = line.item_id._id;
        if (!itemGroups[itemId]) {
            itemGroups[itemId] = {
                item_id: line.item_id,
                uom_id: line.uom_id,
                total_qty: 0,
                stores: []
            };
        }
        itemGroups[itemId].total_qty += line.qty_ordered;
        itemGroups[itemId].stores.push({
            store_id: line.order_id.store_org_unit_id,
            qty: line.qty_ordered,
            order_id: line.order_id._id
        });
    });

    // Create consolidated summaries
    const summaries = [];
    for (const itemId in itemGroups) {
        const group = itemGroups[itemId];

        // Check inventory availability
        const inventoryBalances = await InventoryBalance.find({
            item_id: itemId
        });

        const availableQty = inventoryBalances.reduce((sum, bal) => {
            return sum + (bal.qty_on_hand - bal.qty_reserved);
        }, 0);

        const needToProduce = Math.max(0, group.total_qty - availableQty);
        const productionStatus = needToProduce === 0 ? 'SUFFICIENT' :
            needToProduce < group.total_qty ? 'PARTIAL' :
                'NEED_PRODUCTION';

        const summary = await ConsolidatedOrderSummary.create({
            _id: `cons_${Date.now()}_${itemId}`,
            consolidation_date: new Date(),
            delivery_date: targetDate,
            item_id: itemId,
            total_qty_ordered: group.total_qty,
            uom_id: group.uom_id._id,
            stores: group.stores,
            production_status: productionStatus,
            available_inventory: availableQty,
            need_to_produce: needToProduce,
            created_by: req.user.id
        });

        summaries.push(summary);
    }

    // Populate and return
    const populatedSummaries = await ConsolidatedOrderSummary.find({
        _id: { $in: summaries.map(s => s._id) }
    })
        .populate('item_id', 'sku name item_type')
        .populate('uom_id', 'code name')
        .populate('stores.store_id', 'name code')
        .populate('stores.order_id', 'order_no status');

    return res.status(201).json(
        ApiResponse.success(populatedSummaries, 'Consolidated summary generated successfully', 201)
    );
});

// @desc    Get consolidated orders by date
// @route   GET /api/consolidated-orders/:date
// @access  Private (Supply Coordinator, Manager, Admin)
exports.getConsolidatedByDate = asyncHandler(async (req, res) => {
    const targetDate = new Date(req.params.date);

    const consolidatedOrders = await ConsolidatedOrderSummary.find({
        delivery_date: targetDate
    })
        .populate('item_id', 'sku name item_type')
        .populate('uom_id', 'code name')
        .populate('stores.store_id', 'name code')
        .populate('stores.order_id', 'order_no status')
        .populate('created_by', 'username full_name')
        .sort({ item_id: 1 });

    return res.status(200).json(
        ApiResponse.success(consolidatedOrders)
    );
});
