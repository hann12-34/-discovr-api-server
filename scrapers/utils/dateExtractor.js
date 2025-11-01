/**
 * Date Extraction Utility
 * Extracts dates from HTML elements, URLs, and text
 */

const cheerio = require('cheerio');

/**
 * Extract date from an element (text, attributes, etc.)
 * @param {cheerio.Cheerio} $element - The cheerio element
 * @param {string} url - The URL of the event (optional)
 * @returns {string|null} - Date in YYYY-MM-DD format or null
 */
function extractDate($element, url = '') {
  // Try to extract from URL first (most reliable)
  const urlDate = extractDateFromURL(url);
  if (urlDate) return urlDate;
  
  // Try to extract from element text
  const text = $element.text();
  const dateFromText = extractDateFromText(text);
  if (dateFromText) return dateFromText;
  
  // Try to extract from nearby elements
  const dateFromSiblings = extractDateFromSiblings($element);
  if (dateFromSiblings) return dateFromSiblings;
  
  return null;
}

/**
 * Extract date from URL patterns
 * Examples: /event/2025-10-04, /events/oct-4-2025, etc.
 */
function extractDateFromURL(url) {
  if (!url) return null;
  
  // Pattern: YYYY-MM-DD
  const isoMatch = url.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  // Pattern: YYYY/MM/DD
  const slashMatch = url.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  }
  
  return null;
}

/**
 * Extract date from text content
 * Examples: "Oct 4, 2025", "October 4", "10/4/2025", etc.
 */
function extractDateFromText(text) {
  if (!text) return null;
  
  const currentYear = new Date().getFullYear();
  const months = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };
  
  // Pattern: "Oct 4" or "Oct 4, 2025" or "October 4, 2025"
  const monthDayMatch = text.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[a-z]*[\s,]+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,]+(\d{4}))?/i);
  if (monthDayMatch) {
    const month = months[monthDayMatch[1].toLowerCase().substring(0, 3)];
    const day = monthDayMatch[2].padStart(2, '0');
    const year = monthDayMatch[3] || currentYear;
    return `${year}-${month}-${day}`;
  }
  
  // Pattern: "10/4/2025" or "10-4-2025"
  const numericMatch = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (numericMatch) {
    const month = numericMatch[1].padStart(2, '0');
    const day = numericMatch[2].padStart(2, '0');
    const year = numericMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Pattern: "2025-10-04" (already in correct format)
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  return null;
}

/**
 * Extract date from sibling or nearby elements
 */
function extractDateFromSiblings($element) {
  // Look for date-related classes/attributes nearby
  const $parent = $element.parent();
  
  // Try to find date in sibling elements
  const dateSelectors = [
    '.date', '.event-date', '[class*="date"]',
    'time', '[datetime]',
    '.day', '.month', '.year'
  ];
  
  for (const selector of dateSelectors) {
    const $dateElement = $parent.find(selector).first();
    if ($dateElement.length) {
      const datetime = $dateElement.attr('datetime');
      if (datetime) {
        const extracted = extractDateFromText(datetime);
        if (extracted) return extracted;
      }
      
      const text = $dateElement.text();
      const extracted = extractDateFromText(text);
      if (extracted) return extracted;
    }
  }
  
  return null;
}

/**
 * Batch extract dates from multiple events
 * @param {Array} events - Array of event objects with $element and url
 * @returns {Array} - Events with dates extracted
 */
function batchExtractDates(events) {
  return events.map(event => {
    if (!event.date) {
      event.date = extractDate(event.$element || null, event.url || '');
    }
    return event;
  });
}

module.exports = {
  extractDate,
  extractDateFromURL,
  extractDateFromText,
  extractDateFromSiblings,
  batchExtractDates
};
