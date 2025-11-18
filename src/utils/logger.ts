/**
 * Custom logger utility that only logs in development mode
 * Prevents sensitive data from being exposed in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, but sanitize them in production
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, log only non-sensitive error info
      console.error('An error occurred. Check server logs for details.');
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// For complete security, remove all console statements in production builds
export const removeConsolesInProduction = () => {
  if (!isDevelopment) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    // Keep console.error for critical issues
  }
};
