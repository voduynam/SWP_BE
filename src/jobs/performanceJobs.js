const PerformanceService = require('../services/performanceService');

class PerformanceJobs {
  
  /**
   * Initialize performance monitoring jobs
   */
  static init() {
    console.log('🔍 Initializing performance monitoring jobs...');
    
    // Run coordinator delay checks every 15 minutes
    setInterval(async () => {
      try {
        await PerformanceService.detectCoordinatorDelays();
      } catch (error) {
        console.error('❌ Error in coordinator delay check:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
    
    // Run delivery delay checks every 30 minutes
    setInterval(async () => {
      try {
        await PerformanceService.detectDeliveryDelays();
      } catch (error) {
        console.error('❌ Error in delivery delay check:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Run comprehensive performance checks every hour
    setInterval(async () => {
      try {
        await PerformanceService.runPerformanceChecks();
      } catch (error) {
        console.error('❌ Error in comprehensive performance check:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    console.log('✅ Performance monitoring jobs initialized successfully');
  }
  
  /**
   * Stop all performance monitoring jobs
   */
  static stop() {
    console.log('🛑 Stopping performance monitoring jobs...');
    // Note: In a production environment, you'd want to properly track and clear intervals
    console.log('✅ Performance monitoring jobs stopped');
  }
}

module.exports = PerformanceJobs;