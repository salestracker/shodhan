const isDevelopment = (import.meta.env.DEV === 1);

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) console.error(...args);
  }
};
