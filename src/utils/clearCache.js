// src/utils/clearCache.js
// This script will clear all local storage items related to search cache
import { logger } from './logger';

logger.log('Clearing search cache from local storage...');

try {
  // Remove all items with the 'conv_' prefix
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('conv_')) {
      localStorage.removeItem(key);
      logger.log(`Removed cache entry: ${key}`);
    }
  });
  logger.log('Search cache cleared successfully.');
} catch (error) {
  logger.error('Error clearing search cache:', error);
}
