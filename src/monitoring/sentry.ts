import * as Sentry from '@sentry/node';
import { NodePerformanceIntegral } from '@sentry/node';

// Server-side Sentry initialization
export const initSentry = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version || '1.0.0',
      
      // Performance settings
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Error settings
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      
      // Server-specific settings
      serverName: process.env.SERVER_NAME || '8x8-hub-server',
      
      // BeforeSend hook for filtering
      beforeSend(event) {
        // Filter out health check errors
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        return event;
      },
    });
    
    console.log('[Sentry] Server-side monitoring initialized');
  }
};

// Express error handler middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler();

// Request handler for tracing
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  // Include request data
  transaction: true,
  user: ['id', 'email', 'username'],
});

// Performance monitoring wrapper
export const createTransaction = async <T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  return Sentry.startActiveSpan({ name, op: operation }, async (span) => {
    try {
      const result = await fn();
      span?.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span?.setStatus({ code: 2, description: 'error' }); // Error
      throw error;
    } finally {
      span?.end();
    }
  });
};

// Set user context for server
export const setSentryUser = (user: { id?: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

// Clear user context
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

// Capture exception with additional context
export const captureError = (
  error: Error,
  context?: Record<string, unknown>
) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

// Track custom server event
export const trackServerEvent = (name: string, data?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    category: name,
    message: JSON.stringify(data),
    level: 'info',
  });
};

export default {
  initSentry,
  sentryErrorHandler,
  sentryRequestHandler,
  createTransaction,
  setSentryUser,
  clearSentryUser,
  captureError,
  trackServerEvent,
};
