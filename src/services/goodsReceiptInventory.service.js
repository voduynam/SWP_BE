const ShipmentLine = require('../models/ShipmentLine');
const ShipmentLineLot = require('../models/ShipmentLineLot');
const GoodsReceiptLine = require('../models/GoodsReceiptLine');
const InventoryBalance = require('../models/InventoryBalance');
const InventoryTransaction = require('../models/InventoryTransaction');

/**
 * Cập nhật tồn kho cửa hàng (location = shipment.to_location_id) khi phiếu nhận đã có dòng chi tiết.
 * Dùng chung cho:
 * - PUT /goods-receipts/:id/confirm (phiếu DRAFT → xác nhận)
 * - PUT /shipments/:id/confirm-receipt (tạo GR trạng thái RECEIVED trực tiếp)
 */
async function applyInventoryForGoodsReceipt(receiptId, shipment, userId) {
  const toLocationId = shipment.to_location_id?._id
    ? shipment.to_location_id._id.toString()
    : String(shipment.to_location_id);

  const receiptLines = await GoodsReceiptLine.find({ receipt_id: receiptId })
    .populate({ path: 'item_id', select: 'base_uom_id name sku' })
    .populate('shipment_line_id');

  for (const line of receiptLines) {
    const qty = Number(line.qty_received);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const slRef = line.shipment_line_id?._id || line.shipment_line_id;
    const shipmentLineLot = await ShipmentLineLot.findOne({
      shipment_line_id: slRef,
    });

    const itemId = line.item_id?._id || line.item_id;
    const lotId = shipmentLineLot ? shipmentLineLot.lot_id : null;

    let uomId = line.item_id?.base_uom_id;
    if (!uomId) {
      const sl = await ShipmentLine.findById(slRef).select('uom_id').lean();
      uomId = sl?.uom_id;
    }
    if (!uomId) {
      console.error(
        '[applyInventoryForGoodsReceipt] Thiếu UOM cho dòng phiếu nhận',
        line._id,
        'item',
        itemId
      );
      continue;
    }

    const balanceFilter = {
      location_id: toLocationId,
      item_id: itemId,
      lot_id: lotId,
    };

    let balance = await InventoryBalance.findOne(balanceFilter);
    if (!balance) {
      balance = await InventoryBalance.create({
        location_id: toLocationId,
        item_id: itemId,
        lot_id: lotId,
        qty_on_hand: 0,
        qty_reserved: 0,
      });
    }

    balance.qty_on_hand += qty;
    balance.updated_at = new Date();
    await balance.save();

    await InventoryTransaction.create({
      txn_time: new Date(),
      location_id: toLocationId,
      item_id: itemId,
      lot_id: lotId,
      qty,
      uom_id: uomId,
      txn_type: 'TRANSFER_IN',
      ref_type: 'GOODS_RECEIPT',
      ref_id: receiptId,
      created_by: userId,
    });
  }
}

module.exports = { applyInventoryForGoodsReceipt };
