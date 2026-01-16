/**
 * Error Tracking Service
 * 
 * Ready for Sentry integration. Currently logs to console in development
 * and provides structured error data for future integration.
 * 
 * To enable Sentry:
 * 1. npm install @sentry/react
 * 2. Add VITE_SENTRY_DSN to .env
 * 3. Uncomment Sentry initialization below
 */

const isDev = import.meta.env.DEV;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Uncomment to enable Sentry:
// import * as Sentry from '@sentry/react';
// if (SENTRY_DSN && !isDev) {
//   Sentry.init({
//     dsn: SENTRY_DSN,
//     environment: import.meta.env.MODE,
//     tracesSampleRate: 0.1,
//     beforeSend(event) {
//       // Sanitize sensitive data before sending
//       if (event.user) {
//         delete event.user.ip_address;
//       }
//       return event;
//     },
//   });
// }

/**
 * Track an error with context
 * @param {string} category - Error category (e.g., 'transaction', 'wallet', 'network')
 * @param {string} action - What was being done (e.g., 'mine', 'claim', 'connect')
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context (sanitized)
 */
export function trackError(category, action, error, context = {}) {
  const errorData = {
    category,
    action,
    message: error?.message || String(error),
    code: error?.code,
    timestamp: new Date().toISOString(),
    // Only include safe context fields
    context: sanitizeContext(context),
  };

  // Log in development
  if (isDev) {
    console.error('[ErrorTracking]', errorData);
  }

  // Send to Sentry if configured
  // if (SENTRY_DSN && !isDev) {
  //   Sentry.captureException(error, {
  //     tags: { category, action },
  //     extra: errorData.context,
  //   });
  // }

  // Store locally for debugging (last 10 errors)
  try {
    const errors = JSON.parse(sessionStorage.getItem('nara_errors') || '[]');
    errors.unshift(errorData);
    sessionStorage.setItem('nara_errors', JSON.stringify(errors.slice(0, 10)));
  } catch (e) {
    // Ignore storage errors
  }

  return errorData;
}

/**
 * Track a transaction result
 * @param {string} action - Transaction type (e.g., 'mine', 'claim', 'finalize')
 * @param {boolean} success - Whether it succeeded
 * @param {Object} metadata - Transaction metadata (sanitized)
 */
export function trackTransaction(action, success, metadata = {}) {
  const txData = {
    action,
    success,
    timestamp: new Date().toISOString(),
    // Only include safe metadata
    metadata: sanitizeContext(metadata),
  };

  // Log in development
  if (isDev) {
    console.log('[TxTracking]', txData);
  }

  // Track with Sentry if configured
  // if (SENTRY_DSN && !isDev) {
  //   Sentry.addBreadcrumb({
  //     category: 'transaction',
  //     message: `${action}: ${success ? 'success' : 'failed'}`,
  //     level: success ? 'info' : 'error',
  //     data: txData.metadata,
  //   });
  // }

  return txData;
}

/**
 * Sanitize context to remove sensitive data
 * @param {Object} context 
 * @returns {Object} Sanitized context
 */
function sanitizeContext(context) {
  const safe = {};
  const sensitiveKeys = ['privateKey', 'mnemonic', 'seed', 'password', 'secret'];
  
  for (const [key, value] of Object.entries(context)) {
    // Skip sensitive keys
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      continue;
    }
    
    // Truncate addresses to first/last 6 chars
    if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
      safe[key] = `${value.slice(0, 6)}...${value.slice(-4)}`;
    } else if (typeof value === 'bigint') {
      safe[key] = value.toString();
    } else {
      safe[key] = value;
    }
  }
  
  return safe;
}

/**
 * Get recent errors for debugging
 * @returns {Array} Recent errors
 */
export function getRecentErrors() {
  try {
    return JSON.parse(sessionStorage.getItem('nara_errors') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear error history
 */
export function clearErrors() {
  sessionStorage.removeItem('nara_errors');
}

export default {
  trackError,
  trackTransaction,
  getRecentErrors,
  clearErrors,
};
