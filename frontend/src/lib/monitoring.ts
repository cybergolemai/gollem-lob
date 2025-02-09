import { logger } from './logging';

interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

interface Timer {
  start: number;
  name: string;
  tags?: Record<string, string>;
}

interface PerformanceMetrics {
  fcp: number;  // First Contentful Paint
  lcp: number;  // Largest Contentful Paint
  fid: number;  // First Input Delay
  cls: number;  // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

class ApplicationMonitoring {
  private static instance: ApplicationMonitoring;
  private metrics: Metric[] = [];
  private timers: Map<string, Timer> = new Map();
  private readonly flushInterval = 10000; // 10 seconds
  private readonly maxMetrics = 1000;
  private readonly maxBatchSize = 100;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupPerformanceMonitoring();
      this.setupErrorMonitoring();
      this.setupNetworkMonitoring();
      this.setupResourceMonitoring();
      
      // Setup periodic flush
      setInterval(() => this.flush(), this.flushInterval);

      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  static getInstance(): ApplicationMonitoring {
    if (!ApplicationMonitoring.instance) {
      ApplicationMonitoring.instance = new ApplicationMonitoring();
    }
    return ApplicationMonitoring.instance;
  }

  // Record a simple metric
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: Date.now()
    });

    if (this.metrics.length >= this.maxMetrics) {
      this.flush();
    }
  }

  // Start a timer for measuring durations
  startTimer(name: string, tags?: Record<string, string>): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timers.set(id, {
      start: performance.now(),
      name,
      tags
    });
    return id;
  }

  // End a timer and record the duration
  endTimer(timerId: string) {
    const timer = this.timers.get(timerId);
    if (!timer) {
      logger.warn(`Timer ${timerId} not found`);
      return;
    }

    const duration = performance.now() - timer.start;
    this.recordMetric(`${timer.name}_duration`, duration, timer.tags);
    this.timers.delete(timerId);
  }

  // Record memory usage
  recordMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      this.recordMetric('memory_used', memory.usedJSHeapSize);
      this.recordMetric('memory_total', memory.totalJSHeapSize);
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit);
    }
  }

  // Setup performance monitoring
  private setupPerformanceMonitoring() {
    try {
      // Create a PerformanceObserver to monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              this.recordMetric('lcp', entry.startTime);
              break;
            case 'first-input':
              this.recordMetric('fid', entry.processingStart - entry.startTime);
              break;
            case 'layout-shift':
              this.recordMetric('cls', entry.value);
              break;
          }
        });
      });

      // Observe relevant entry types
      observer.observe({ 
        entryTypes: [
          'largest-contentful-paint',
          'first-input',
          'layout-shift',
          'resource',
          'navigation'
        ]
      });

      // Record Navigation Timing metrics
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.recordMetric('ttfb', navigation.responseStart - navigation.requestStart);
          this.recordMetric('dom_load', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
          this.recordMetric('page_load', navigation.loadEventEnd - navigation.loadEventStart);
        }
      });
    } catch (error) {
      logger.error('Failed to setup performance monitoring', { error });
    }
  }

  // Setup error monitoring
  private setupErrorMonitoring() {
    window.addEventListener('error', (event) => {
      this.recordMetric('js_error', 1, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno.toString()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordMetric('unhandled_promise_rejection', 1, {
        reason: event.reason?.toString()
      });
    });
  }

  // Setup network monitoring
  private setupNetworkMonitoring() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const timerId = this.startTimer('fetch_request');
      try {
        const response = await originalFetch(...args);
        this.recordMetric('fetch_status', response.status, {
          url: args[0].toString(),
          method: args[1]?.method || 'GET'
        });
        return response;
      } catch (error) {
        this.recordMetric('fetch_error', 1, {
          url: args[0].toString(),
          error: error.toString()
        });
        throw error;
      } finally {
        this.endTimer(timerId);
      }
    };
  }

  // Setup resource monitoring
  private setupResourceMonitoring() {
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          this.recordMetric('resource_load_time', resource.duration, {
            type: resource.initiatorType,
            name: resource.name
          });
        }
      });
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  // Flush metrics to backend
  private async flush() {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    // Split metrics into batches
    for (let i = 0; i < metricsToSend.length; i += this.maxBatchSize) {
      const batch = metricsToSend.slice(i, i + this.maxBatchSize);
      
      try {
        await fetch('/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metrics: batch }),
        });
      } catch (error) {
        logger.error('Failed to send metrics', { error });
        
        // Keep critical metrics for retry
        const criticalMetrics = batch.filter(metric => 
          metric.name.includes('error') || 
          metric.name.includes('failure')
        );
        this.metrics.unshift(...criticalMetrics);
      }
    }
  }
}

export const monitoring = ApplicationMonitoring.getInstance();

// React hook for component-level monitoring
export function useMonitoring(componentName: string) {
  return {
    recordMetric: (name: string, value: number, tags?: Record<string, string>) => {
      monitoring.recordMetric(name, value, { ...tags, component: componentName });
    },
    startTimer: (name: string, tags?: Record<string, string>) => {
      return monitoring.startTimer(name, { ...tags, component: componentName });
    },
    endTimer: (timerId: string) => {
      monitoring.endTimer(timerId);
    }
  };
}

// HOC for automatic component performance monitoring
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function WithPerformanceMonitoring(props: P) {
    const renderTimer = monitoring.startTimer(`${componentName}_render`);
    
    React.useEffect(() => {
      monitoring.endTimer(renderTimer);
      
      return () => {
        monitoring.recordMetric(`${componentName}_unmount`, 1);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
}