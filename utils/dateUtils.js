/**
 * Date utility functions for scraper diagnostics
 */

/**
 * Get a formatted date string suitable for filenames
 * @param {Date} date - Date object (defaults to current time)
 * @returns {String} Formatted date string (YYYY-MM-DD-HHmmss)
 */
function getFormattedDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Format a date as a friendly string (Month Day, Year)
 * @param {Date|String} date - Date object or ISO string
 * @returns {String} Formatted date string
 */
function formatFriendlyDate(date) {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate relative time (e.g. "2 hours ago")
 * @param {Date|String} date - Date object or ISO string
 * @returns {String} Relative time string
 */
function getRelativeTimeString(date) {
  if (!date) return 'Never';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return 'Just now';
  } else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  } else if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffSec / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

module.exports = {
  getFormattedDate,
  formatFriendlyDate,
  getRelativeTimeString
};
