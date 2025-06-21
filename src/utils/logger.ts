const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) console.error(...args);
  },
  // Add the debug method for detailed development-only logging.
  debug: (...args: unknown[]) => {
    if (isDevelopment) console.debug(...args);
  }
};
