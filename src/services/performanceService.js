const PerformanceViolation = require('../models/PerformanceViolation');
const WorkflowAssignment = require('../models/WorkflowAssignment');
const Notification = require('../models/Notification');

class PerformanceService {
  
  // ==========================================
  // 1. KITCHEN STAFF PERFORMANCE DETECTION
  // ==========================================
  
  /**
   * Detect production shortage when completing production order
   */
  static async detectProductionShortage(productionOrder, productionLines) {
    const violations = [];
    
    for (const line of productionLines) {
      if (line.actual_qty < line.planned_qty) {
        const shortageQty = line.planned_qty - line.actual_qty;
        const shortagePercentage = (shortageQty / line.planned_qty) * 100;
        
        // Only create violation if shortage > 5%
        if (shortagePercentage > 5) {
          const violationId = `perf_prod_shortage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const violation = await PerformanceViolation.create({
            _id: violationId,
            violation_type: 'PRODUCTION_SHORTAGE',
            user_id: productionOrder.created_by,
            user_role: 'CHEF',
            reference_type: 'PRODUCTION_ORDER',
            reference_id: productionOrder._id,
            title: `Sản xuất thiếu ${shortageQty} sản phẩm`,
            description: `Production Order ${productionOrder.prod_order_no}: Kế hoạch ${line.planned_qty}, thực tế ${line.actual_qty}, thiếu ${shortageQty} (${shortagePercentage.toFixed(1)}%)`,
            severity: shortagePercentage > 20 ? 'HIGH' : shortagePercentage > 10 ? 'MEDIUM' : 'LOW',
            violation_data: {
              planned_qty: line.planned_qty,
              actual_qty: line.actual_qty,
              shortage_qty: shortageQty,
              shortage_percentage: shortagePercentage,
              item_id: line.item_id
            }
          });
          
          violations.push(violation);
          
          // Notify manager
          await this.notifyManager(violation);
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Detect production quality issues (damaged products)
   */
  static async detectProductionQuality(productionOrder, wasteTransactions) {
    const violations = [];
    
    for (const waste of wasteTransactions) {
      if (waste.waste_category === 'PRODUCTION_WASTE' && waste.qty > 0) {
        const violationId = `perf_prod_quality_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const violation = await PerformanceViolation.create({
          _id: violationId,
          violation_type: 'PRODUCTION_QUALITY',
          user_id: productionOrder.created_by,
          user_role: 'CHEF',
          reference_type: 'PRODUCTION_ORDER',
          reference_id: productionOrder._id,
          title: `Sản phẩm bị hỏng trong sản xuất`,
          description: `Production Order ${productionOrder.prod_order_no}: ${waste.qty} sản phẩm bị hỏng (${waste.disposal_reason})`,
          severity: waste.qty > 10 ? 'HIGH' : waste.qty > 5 ? 'MEDIUM' : 'LOW',
          violation_data: {
            waste_qty: waste.qty,
            disposal_reason: waste.disposal_reason,
            item_id: waste.item_id
          }
        });
        
        violations.push(violation);
        await this.notifyManager(violation);
      }
    }
    
    return violations;
  }
  
  // ==========================================
  // 2. COORDINATOR PERFORMANCE DETECTION
  // ==========================================
  
  /**
   * Create assignment for coordinator when shipment is created
   */
  static async createCoordinatorAssignment(shipment) {
    const assignmentId = `assign_coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get the single coordinator
    const AppUser = require('../models/AppUser');
    const UserRole = require('../models/UserRole');
    
    const coordinatorRole = await UserRole.findOne({ role_id: 'role_supply_coordinator' });
    if (!coordinatorRole) {
      throw new Error('No coordinator found in system');
    }
    
    const coordinator = await AppUser.findById(coordinatorRole.user_id);
    if (!coordinator) {
      throw new Error('Coordinator user not found');
    }
    
    // Expected completion: 2 hours after shipment creation
    const expectedCompletion = new Date(shipment.created_at.getTime() + 2 * 60 * 60 * 1000);
    
    const assignment = await WorkflowAssignment.create({
      _id: assignmentId,
      task_type: 'SHIPMENT_COORDINATION',
      reference_type: 'SHIPMENT',
      reference_id: shipment._id,
      assigned_to: coordinator._id,
      assigned_role: 'SUPPLY_COORDINATOR',
      expected_start: shipment.created_at,
      expected_completion: expectedCompletion,
      assignment_notes: `Coordinate delivery for shipment ${shipment.shipment_no}`
    });
    
    return assignment;
  }
  
  /**
   * Detect coordinator handover delays
   */
  static async detectCoordinatorDelays() {
    const now = new Date();
    const violations = [];
    
    // Find overdue coordinator assignments
    const overdueAssignments = await WorkflowAssignment.find({
      task_type: 'SHIPMENT_COORDINATION',
      status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
      expected_completion: { $lt: now },
      is_overdue: false
    }).populate('assigned_to', 'username full_name');
    
    for (const assignment of overdueAssignments) {
      const delayMinutes = Math.floor((now - assignment.expected_completion) / (1000 * 60));
      
      // Only create violation if delay > 30 minutes
      if (delayMinutes > 30) {
        const violationId = `perf_coord_delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const violation = await PerformanceViolation.create({
          _id: violationId,
          violation_type: 'COORDINATOR_HANDOVER',
          user_id: assignment.assigned_to._id,
          user_role: 'SUPPLY_COORDINATOR',
          reference_type: 'SHIPMENT',
          reference_id: assignment.reference_id,
          title: `Chậm phối hợp giao hàng`,
          description: `Coordinator chậm ${delayMinutes} phút trong việc phối hợp shipment ${assignment.reference_id}`,
          severity: delayMinutes > 120 ? 'HIGH' : delayMinutes > 60 ? 'MEDIUM' : 'LOW',
          violation_data: {
            expected_completion: assignment.expected_completion,
            delay_minutes: delayMinutes,
            assignment_id: assignment._id
          }
        });
        
        // Mark assignment as overdue
        assignment.is_overdue = true;
        assignment.delay_minutes = delayMinutes;
        await assignment.save();
        
        violations.push(violation);
        await this.notifyManager(violation);
      }
    }
    
    return violations;
  }
  
  // ==========================================
  // 3. DRIVER PERFORMANCE DETECTION
  // ==========================================
  
  /**
   * Detect delivery delays
   */
  static async detectDeliveryDelays() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const violations = [];
    
    // Find shipments that should have been delivered but are still in transit
    const Shipment = require('../models/Shipment');
    const DelayedShipments = await Shipment.find({
      status: { $in: ['SHIPPED', 'IN_TRANSIT'] },
      ship_date: { $lt: oneHourAgo }, // Expected delivery was > 1 hour ago
      updated_at: { $lt: oneHourAgo }  // No recent updates
    });
    
    for (const shipment of DelayedShipments) {
      const delayMinutes = Math.floor((now - shipment.ship_date) / (1000 * 60)) - 60; // Subtract expected 1 hour delivery time
      
      if (delayMinutes > 0) {
        // Check if violation already exists
        const existingViolation = await PerformanceViolation.findOne({
          violation_type: 'DRIVER_DELAY',
          reference_id: shipment._id,
          status: { $in: ['OPEN', 'UNDER_REVIEW'] }
        });
        
        if (!existingViolation) {
          const violationId = `perf_driver_delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Try to identify the driver (simplified - could be enhanced)
          const driverId = shipment.created_by; // Placeholder - need better driver identification
          
          const violation = await PerformanceViolation.create({
            _id: violationId,
            violation_type: 'DRIVER_DELAY',
            user_id: driverId,
            user_role: 'DRIVER',
            reference_type: 'SHIPMENT',
            reference_id: shipment._id,
            title: `Giao hàng chậm trễ`,
            description: `Shipment ${shipment.shipment_no} chậm ${delayMinutes} phút so với dự kiến`,
            severity: delayMinutes > 120 ? 'HIGH' : delayMinutes > 60 ? 'MEDIUM' : 'LOW',
            violation_data: {
              expected_delivery_time: new Date(shipment.ship_date.getTime() + 60 * 60 * 1000),
              delay_minutes: delayMinutes,
              shipment_no: shipment.shipment_no
            }
          });
          
          violations.push(violation);
          await this.notifyManager(violation);
        }
      }
    }
    
    return violations;
  }

  /**
   * Detect COD collection errors
   */
  static async detectCODErrors(shipment, payment) {
    const violations = [];
    
    // Check for COD amount discrepancies
    if (shipment.cod_amount > 0 && payment) {
      const expectedAmount = shipment.cod_amount;
      const collectedAmount = payment.amount;
      const discrepancy = Math.abs(expectedAmount - collectedAmount);
      const discrepancyPercentage = (discrepancy / expectedAmount) * 100;
      
      // Create violation if discrepancy > 5% or > 50,000 VND
      if (discrepancyPercentage > 5 || discrepancy > 50000) {
        const violationId = `perf_cod_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const violation = await PerformanceViolation.create({
          _id: violationId,
          violation_type: 'DRIVER_COD_ERROR',
          user_id: shipment.cod_collected_by,
          user_role: 'DRIVER',
          reference_type: 'PAYMENT',
          reference_id: payment._id,
          title: `Sai sót thu tiền COD`,
          description: `COD cho shipment ${shipment.shipment_no}: Dự kiến ${expectedAmount.toLocaleString()} VND, thực thu ${collectedAmount.toLocaleString()} VND, chênh lệch ${discrepancy.toLocaleString()} VND (${discrepancyPercentage.toFixed(1)}%)`,
          severity: discrepancyPercentage > 20 ? 'HIGH' : discrepancyPercentage > 10 ? 'MEDIUM' : 'LOW',
          violation_data: {
            expected_amount: expectedAmount,
            collected_amount: collectedAmount,
            discrepancy: discrepancy,
            discrepancy_percentage: discrepancyPercentage,
            shipment_no: shipment.shipment_no
          }
        });
        
        violations.push(violation);
        await this.notifyManager(violation);
      }
    }
    
    return violations;
  }
  
  // ==========================================
  // 4. MANAGER NOTIFICATION SYSTEM
  // ==========================================
  
  /**
   * Notify manager about performance violation
   */
  static async notifyManager(violation) {
    const notificationId = `notif_perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await Notification.create({
      _id: notificationId,
      recipient_role: 'MANAGER',
      title: `⚠️ Performance Alert: ${violation.title}`,
      message: `${violation.description}. Severity: ${violation.severity}. Cần review và xác nhận.`,
      type: violation.severity === 'HIGH' || violation.severity === 'CRITICAL' ? 'URGENT' : 'INFO',
      ref_type: 'PERFORMANCE_VIOLATION',
      ref_id: violation._id
    });
    
    // Mark violation as manager notified
    violation.manager_notified = true;
    violation.manager_notified_at = new Date();
    await violation.save();
  }
  
  // ==========================================
  // 5. AUTOMATED DETECTION RUNNER
  // ==========================================
  
  /**
   * Run all automated performance checks
   */
  static async runPerformanceChecks() {
    try {
      console.log('🔍 Running performance checks...');
      
      const coordinatorViolations = await this.detectCoordinatorDelays();
      const deliveryViolations = await this.detectDeliveryDelays();
      
      const totalViolations = coordinatorViolations.length + deliveryViolations.length;
      
      console.log(`✅ Performance checks completed. Found ${totalViolations} new violations.`);
      
      return {
        coordinator_violations: coordinatorViolations.length,
        delivery_violations: deliveryViolations.length,
        total_violations: totalViolations
      };
    } catch (error) {
      console.error('❌ Error running performance checks:', error);
      throw error;
    }
  }
  
  /**
   * Mark coordinator handover as completed for given shipments
   */
  static async markCoordinatorHandoverForShipments(shipmentIds) {
    if (!shipmentIds || shipmentIds.length === 0) return { updated: 0, created_violations: 0 };
    const now = new Date();
    let updatedCount = 0;
    let createdViolations = 0;
    
    for (const shipmentId of shipmentIds) {
      const assignment = await WorkflowAssignment.findOne({
        task_type: 'SHIPMENT_COORDINATION',
        reference_type: 'SHIPMENT',
        reference_id: shipmentId,
        status: { $in: ['ASSIGNED', 'IN_PROGRESS'] }
      });
      
      if (!assignment) continue;
      
      if (!assignment.actual_start) {
        assignment.actual_start = now;
      }
      assignment.actual_completion = now;
      assignment.status = 'COMPLETED';
      
      if (assignment.expected_completion && assignment.actual_completion > assignment.expected_completion) {
        const delayMinutes = Math.floor((assignment.actual_completion - assignment.expected_completion) / (1000 * 60));
        assignment.is_overdue = true;
        assignment.delay_minutes = delayMinutes;
        
        const existingViolation = await PerformanceViolation.findOne({
          violation_type: 'COORDINATOR_HANDOVER',
          reference_type: 'SHIPMENT',
          reference_id: shipmentId,
          status: { $in: ['OPEN', 'UNDER_REVIEW'] }
        });
        
        if (!existingViolation) {
          const violationId = `perf_coord_delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const violation = await PerformanceViolation.create({
            _id: violationId,
            violation_type: 'COORDINATOR_HANDOVER',
            user_id: assignment.assigned_to,
            user_role: 'SUPPLY_COORDINATOR',
            reference_type: 'SHIPMENT',
            reference_id: shipmentId,
            title: 'Chậm bàn giao shipment cho tài xế',
            description: `Coordinator hoàn tất bàn giao trễ ${delayMinutes} phút so với SLA`,
            severity: delayMinutes > 120 ? 'HIGH' : delayMinutes > 60 ? 'MEDIUM' : 'LOW',
            violation_data: {
              expected_completion: assignment.expected_completion,
              actual_completion: assignment.actual_completion,
              delay_minutes: delayMinutes,
              assignment_id: assignment._id
            }
          });
          await this.notifyManager(violation);
          createdViolations++;
        }
      }
      
      await assignment.save();
      updatedCount++;
    }
    
    return { updated: updatedCount, created_violations: createdViolations };
  }
}

module.exports = PerformanceService;
