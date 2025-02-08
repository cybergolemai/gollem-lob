type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

interface LogOptions {
  context?: Record<string, any>;
  error?: Error;
  tags?: string[];
}

class Logger {
  private static instance: Logger;
  private logBuffer: LogEntry[] = [];
  private readonly bufferSize = 100;
  private readonly flushInterval = 5000; // 5 seconds
  private minLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

  private constructor() {
    if (typeof window !== 'undefined') {
      // Setup periodic flush
      setInterval(() => this.flush(), this.flushInterval);

      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  debug(message: string, options: LogOptions = {}) {
    this.log('debug', message, options);
  }

  info(message: string, options: LogOptions = {}) {
    this.log('info', message, options);
  }

  warn(message: string, options: LogOptions = {}) {
    this.log('warn', message, options);
  }

  error(message: string, options: LogOptions = {}) {
    this.log('error', message, options);
  }

  private log(level: LogLevel, message: string, { context, error, tags }: LogOptions = {}) {
    // Check minimum log level
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        tags
      }
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // Add to buffer
    this.logBuffer.push(entry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }),
      });
    } catch (error) {
      // In case of failure, log to console and add critical logs back to buffer
      console.error('Failed to send logs:', error);
      const criticalLogs = logs.filter(log => 
        log.level === 'error' || log.level === 'warn'
      );
      this.logBuffer.unshift(...criticalLogs);
    }
  }

  private logToConsole(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${entry.level.toUpperCase()}:`;

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, entry.context);
        break;
      case 'info':
        console.info(prefix, entry.message, entry.context);
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.context);
        break;
      case 'error':
        console.error(prefix, entry.message, entry.context);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }
}

export const logger = Logger.getInstance();

// React hook for component-level logging
export function useLogger(component: string) {
  return {
    debug: (message: string, options: Omit<LogOptions, 'context'> = {}) => {
      logger.debug(message, { ...options, context: { component } });
    },
    info: (message: string, options: Omit<LogOptions, 'context'> = {}) => {
      logger.info(message, { ...options, context: { component } });
    },
    warn: (message: string, options: Omit<LogOptions, 'context'> = {}) => {
      logger.warn(message, { ...options, context: { component } });
    },
    error: (message: string, options: Omit<LogOptions, 'context'> = {}) => {
      logger.error(message, { ...options, context: { component } });
    }
  };
}