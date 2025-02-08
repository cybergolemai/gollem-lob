type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

interface ErrorContext {
  user?: {
    id: string;
    email?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private initialized: boolean = false;
  private context: ErrorContext = {};

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  init() {
    if (this.initialized) return;

    // Setup global error handlers
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Setup performance monitoring
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 1000) { // 1 second threshold
              this.capturePerformanceIssue(entry);
            }
          });
        });
        observer.observe({ entryTypes: ['longtask', 'navigation', 'resource'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported', e);
      }
    }

    this.initialized = true;
  }

  setUser(user: { id: string; email?: string }) {
    this.context.user = user;
  }

  clearUser() {
    delete this.context.user;
  }

  setTags(tags: Record<string, string>) {
    this.context.tags = { ...this.context.tags, ...tags };
  }

  setExtra(extra: Record<string, any>) {
    this.context.extra = { ...this.context.extra, ...extra };
  }

  captureException(error: Error, context?: ErrorContext) {
    const errorData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...this.context,
        ...context,
      },
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', errorData);
      return;
    }

    // In production, send to error tracking service
    this.sendToErrorService(errorData);
  }

  captureMessage(message: string, severity: ErrorSeverity = 'info', context?: ErrorContext) {
    const messageData = {
      timestamp: new Date().toISOString(),
      message,
      severity,
      context: {
        ...this.context,
        ...context,
      },
      url: window.location.href,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${severity}] ${message}`, messageData);
      return;
    }

    this.sendToErrorService(messageData);
  }

  private handleWindowError = (event: ErrorEvent) => {
    this.captureException(event.error || new Error(event.message));
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.captureException(error, {
      tags: { handling: 'unhandled-rejection' }
    });
  };

  private capturePerformanceIssue(entry: PerformanceEntry) {
    this.captureMessage(
      `Performance issue detected: ${entry.entryType}`,
      'warning',
      {
        extra: {
          duration: entry.duration,
          entryType: entry.entryType,
          name: entry.name,
          startTime: entry.startTime,
        }
      }
    );
  }

  private async sendToErrorService(data: any) {
    try {
      const response = await fetch('/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Failed to send error to tracking service:', await response.text());
      }
    } catch (e) {
      console.error('Failed to send error to tracking service:', e);
    }
  }
}

export const errorTracker = ErrorTracker.getInstance();

// React Error Boundary HOC
export function withErrorTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return class WithErrorTracking extends React.Component<P> {
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      errorTracker.captureException(error, {
        tags: { component: componentName },
        extra: { componentStack: errorInfo.componentStack }
      });
    }

    render() {
      return <Component {...this.props} />;
    }
  };
}