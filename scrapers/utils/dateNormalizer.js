/**
 * Date Normalizer Utility
 * Cleans and normalizes date strings for consistent parsing
 */

function normalizeDateString(dateText) {
  if (!dateText || typeof dateText !== 'string') {
    return null;
  }

  // Step 1: Remove newlines and collapse whitespace
  let normalized = dateText
    .replace(/\n/g, ' ')                        // Remove newlines
    .replace(/\s+/g, ' ')                       // Collapse multiple spaces
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')      // Remove ordinals: "15th" -> "15"
    .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '') // Remove duplicate times
    .trim();

  // Step 2: Check if date already has year
  const hasYear = /\d{4}/.test(normalized);
  
  if (!hasYear) {
    // Step 3: Add current or next year
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11
    
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const dateLower = normalized.toLowerCase();
    
    // Find month in date string
    const monthIndex = months.findIndex(m => dateLower.includes(m));
    
    if (monthIndex !== -1) {
      // If event month has already passed this year, assume next year
      const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
      normalized = `${normalized}, ${year}`;
    } else {
      // If can't find month, just add current year
      normalized = `${normalized}, ${currentYear}`;
    }
  }

  return normalized;
}

module.exports = { normalizeDateString };
