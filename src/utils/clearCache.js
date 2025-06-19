// src/utils/clearCache.js
// This script will clear all local storage items related to search cache

console.log('Clearing search cache from local storage...');

try {
  // Remove all items with the 'conv_' prefix
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('conv_')) {
      localStorage.removeItem(key);
      console.log(`Removed cache entry: ${key}`);
    }
  });
  console.log('Search cache cleared successfully.');
} catch (error) {
  console.error('Error clearing search cache:', error);
}
