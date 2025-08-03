import { appLog } from '../helper/helper';
import * as Sentry from '@sentry/react-native';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private hangingDetectionTimeout?: NodeJS.Timeout;
  private isMonitoringHangs = false;

  /**
   * Start tracking a performance metric
   */
  startTracking(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };
    
    this.metrics.set(name, metric);
    appLog(`[Performance] Started tracking: ${name}`);
  }

  /**
   * End tracking a performance metric
   */
  endTracking(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      appLog(`[Performance] Warning: No tracking found for: ${name}`);
      return null;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    appLog(`[Performance] Completed: ${name} in ${metric.duration}ms`);

    // Log to Sentry if duration is concerning
    if (metric.duration > 2000) { // More than 2 seconds
      Sentry.addBreadcrumb({
        message: `Slow operation: ${name}`,
        level: 'warning',
        data: {
          duration: metric.duration,
          ...metric.metadata,
        },
      });
    }

    this.metrics.delete(name);
    return metric.duration;
  }

  /**
   * Start monitoring for app hangs
   */
  startHangDetection(timeoutMs: number = 3000): void {
    if (this.isMonitoringHangs) {
      return;
    }

    this.isMonitoringHangs = true;
    appLog(`[Performance] Starting hang detection with ${timeoutMs}ms timeout`);

    const checkForHang = () => {
      const checkTime = Date.now();
      
      // Use requestAnimationFrame to check if the main thread is responsive
      requestAnimationFrame(() => {
        const responseTime = Date.now() - checkTime;
        
        if (responseTime > timeoutMs) {
          appLog(`[Performance] Hang detected: ${responseTime}ms delay`);
          Sentry.captureMessage(`App hang detected: ${responseTime}ms`, 'warning');
        }
        
        if (this.isMonitoringHangs) {
          this.hangingDetectionTimeout = setTimeout(checkForHang, 1000);
        }
      });
    };

    checkForHang();
  }

  /**
   * Stop monitoring for app hangs
   */
  stopHangDetection(): void {
    this.isMonitoringHangs = false;
    if (this.hangingDetectionTimeout) {
      clearTimeout(this.hangingDetectionTimeout);
      this.hangingDetectionTimeout = undefined;
    }
    appLog('[Performance] Stopped hang detection');
  }

  /**
   * Track Rive animation performance
   */
  trackRivePerformance(animationName: string, action: 'start' | 'end' | 'error', metadata?: Record<string, any>): void {
    const trackingName = `rive_${animationName}_${action}`;
    
    if (action === 'start') {
      this.startTracking(trackingName, metadata);
    } else if (action === 'end') {
      this.endTracking(trackingName);
    } else if (action === 'error') {
      const metric = this.metrics.get(`rive_${animationName}_start`);
      if (metric) {
        Sentry.captureMessage(`Rive animation error: ${animationName}`, 'error');
        this.metrics.delete(`rive_${animationName}_start`);
      }
    }
  }

  /**
   * Track modal/sheet performance
   */
  trackModalPerformance(modalName: string, action: 'show' | 'hide' | 'timeout', metadata?: Record<string, any>): void {
    const trackingName = `modal_${modalName}_${action}`;
    
    if (action === 'show') {
      this.startTracking(trackingName, metadata);
    } else if (action === 'hide') {
      this.endTracking(trackingName);
    } else if (action === 'timeout') {
      Sentry.captureMessage(`Modal timeout: ${modalName}`, 'warning');
      this.metrics.delete(`modal_${modalName}_show`);
    }
  }

  /**
   * Get current active metrics (for debugging)
   */
  getActiveMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear all metrics (cleanup)
   */
  clearAll(): void {
    this.metrics.clear();
    this.stopHangDetection();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions for common use cases
export const trackOperation = (name: string, metadata?: Record<string, any>) => {
  performanceMonitor.startTracking(name, metadata);
  return () => performanceMonitor.endTracking(name);
};

export const trackRive = (name: string, action: 'start' | 'end' | 'error', metadata?: Record<string, any>) => {
  performanceMonitor.trackRivePerformance(name, action, metadata);
};

export const trackModal = (name: string, action: 'show' | 'hide' | 'timeout', metadata?: Record<string, any>) => {
  performanceMonitor.trackModalPerformance(name, action, metadata);
};