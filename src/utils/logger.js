const isDev = import.meta.env.DEV;

/**
 * Application logger utility.
 * No-ops in production used to strip console usage.
 */
export const logger = {
  /**
   * @param {...any} args
   */
  debug: (...args) => {
    if (isDev) console.log("[DEBUG]", ...args);
  },

  /**
   * @param {...any} args
   */
  info: (...args) => {
    if (isDev) console.log("[INFO]", ...args);
  },

  /**
   * @param {...any} args
   */
  warn: (...args) => {
    console.warn("[WARN]", ...args);
  },

  /**
   * @param {string} message 
   * @param {Error|null} error 
   */
  error: (message, error = null) => {
    if (isDev) {
      console.error("[ERROR]", message, error);
    } else {
      console.error("[ERROR]", message);
    }
  },

  /**
   * @param {string} action 
   * @param {any} data 
   */
  tx: (action, data) => {
    if (isDev) console.log(`[TX:${action}]`, data);
  },
};

export default logger;
