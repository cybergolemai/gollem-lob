import { useEffect } from 'react';
import { useRouter } from 'next/router';

type EventType = 
  | 'page_view'
  | 'credit_purchase'
  | 'inference_request'
  | 'provider_selection'
  | 'auth_success'
  | 'auth_error'
  | 'error'
  | 'conversion';

interface AnalyticsEvent {
  type: EventType;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
}

interface UserTraits {
  email?: string;
  name?: string;
  organization?: string;
  plan?: string;
  creditBalance?: number;
}

class Analytics {
  private static instance: Analytics;
  private initialized: boolean = false;
  private userId: string | null = null;
  private traits: UserTraits = {};
  private queue: AnalyticsEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private batchSize: number = 10;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  init() {
    if (this.initialized) return;

    // Start processing queue
    setInterval(() => this.processQueue(), this.flushInterval);

    // Setup performance monitoring
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.setupPerformanceMonitoring();
    }

    this.initialized = true;
  }

  identify(userId: string, traits?: UserTraits) {
    this.userId = userId;
    if (traits) {
      this.traits = { ...this.traits, ...traits };
    }

    // Send identify call
    this.sendToAnalyticsService('identify', {
      userId,
      traits: this.traits,
      timestamp: Date.now()
    });
  }

  track(event: EventType, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      type: event,
      properties,
      timestamp: Date.now(),
      userId: this.userId || undefined
    };

    this.queue.push(analyticsEvent);

    // Process immediately if queue is full
    if (this.queue.length >= this.batchSize) {
      this.processQueue();
    }
  }

  page(name: string, properties?: Record<string, any>) {
    this.track('page_view', {
      page: name,
      path: window.location.pathname,
      referrer: document.referrer,
      ...properties
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    await this.sendToAnalyticsService('batch', { events: batch });
  }

  private setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Filter and track relevant metrics
        if (entry.entryType === 'largest-contentful-paint') {
          this.track('performance', {
            metric: 'LCP',
            value: entry.startTime,
            rating: entry.startTime < 2500 ? 'good' : 'poor'
          });
        }
        // Add other Core Web Vitals as needed
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

    // Monitor navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.track('performance', {
            metric: 'page_load',
            domComplete: navigation.domComplete,
            loadEventEnd: navigation.loadEventEnd,
            domInteractive: navigation.domInteractive,
            type: navigation.type
          });
        }
      }, 0);
    });
  }

  private async sendToAnalyticsService(type: string, data: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics:', type, data);
      return;
    }

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        console.error('Failed to send analytics:', await response.text());
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }
}

export const analytics = Analytics.getInstance();

// React hook for page view tracking
export function usePageTracking() {
  const router = useRouter();

  useEffect(() => {
    // Track initial page view
    analytics.page(router.pathname);

    // Track subsequent route changes
    const handleRouteChange = (url: string) => {
      analytics.page(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);
}

// Helper functions for common events
export const trackEvent = {
  creditPurchase: (amount: number, credits: number) => {
    analytics.track('credit_purchase', { amount, credits });
  },
  
  inferenceRequest: (model: string, provider: string, tokens: number) => {
    analytics.track('inference_request', { model, provider, tokens });
  },
  
  providerSelection: (providerId: string, model: string) => {
    analytics.track('provider_selection', { providerId, model });
  },
  
  error: (error: Error, context?: Record<string, any>) => {
    analytics.track('error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    });
  },
  
  conversion: (type: string, value?: number) => {
    analytics.track('conversion', { type, value });
  }
};